import { Component, computed, DestroyRef, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { CheckIn, CheckInMethod, CheckInResult, MemberLite, Payment, SubscriptionState } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { OfflineService } from '@core/offline/offline.service';
import { ToastService } from '@core/notifications/toast.service';
import { apiError, clientId, frDate, hour, STATE_TONES, todayIso } from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';
import { FilterOption, matchesAny, MultiFilter } from '@shared/column-filter/column-filter';

/** Une ligne du journal du jour (venue du serveur ou en attente de synchronisation) */
interface JournalRow {
  key: string;
  time: string;
  name: string;
  method: CheckInMethod;
  result: CheckInResult;
  pending: boolean;
}

/** Ce qu'affiche le grand bloc de réponse */
interface Answer {
  result: CheckInResult;
  member: MemberLite;
  text: string;
  pending: boolean;
}

const RESULT_LABELS: Record<CheckInResult, string> = {
  ALLOWED: 'Autorisé',
  ALLOWED_EXPIRING: 'Autorisé, expire bientôt',
  REFUSED: 'Refusé',
};

/**
 * Pointage à l'entrée (module 4) : scanner le QR code avec la caméra du téléphone, ou chercher
 * par nom ou téléphone. Réponse immédiate vert / orange / rouge, et encaissement direct.
 * Fonctionne hors ligne grâce à la copie locale des membres (OfflineService).
 */
@Component({
  selector: 'app-access',
  imports: [FormsModule, RouterLink, PayDialog, MultiFilter],
  templateUrl: './access.html',
  styleUrl: './access.css',
})
export class Access implements OnInit, OnDestroy {
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly offline = inject(OfflineService);

  readonly tones = STATE_TONES;
  readonly resultLabels = RESULT_LABELS;
  readonly frDate = frDate;

  readonly mode = signal<'scan' | 'search'>('scan');
  readonly query = signal('');
  readonly matches = signal<MemberLite[]>([]);
  readonly scanInput = signal('');
  readonly answer = signal<Answer | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly journal = signal<JournalRow[]>([]);
  readonly paying = signal<MemberLite | null>(null);
  readonly waitingLink = signal<Payment | null>(null);

  // ---- Caméra ----
  readonly cameraOn = signal(false);
  readonly cameraError = signal<string | null>(null);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastToken = '';
  private lastTokenAt = 0;
  private threshold = 7;

  readonly rows = computed<JournalRow[]>(() => {
    const pending = this.offline.pending().map(p => ({
      key: p.clientId,
      time: hour(p.checkedAt),
      name: p.memberName,
      method: p.method,
      result: 'ALLOWED' as CheckInResult,
      pending: true,
    }));
    return [...pending.reverse(), ...this.journal()];
  });

  // ---- Filtres du journal (une colonne = un filtre) ----
  readonly timeFilter = signal('');
  readonly nameFilter = signal('');
  readonly methodFilter = signal<string[]>([]);
  readonly resultFilter = signal<string[]>([]);
  readonly syncFilter = signal<string[]>([]);
  readonly methodOptions: FilterOption[] = [
    { value: 'QR', label: 'QR' },
    { value: 'SEARCH', label: 'Recherche' },
  ];
  readonly resultOptions: FilterOption[] = (Object.keys(RESULT_LABELS) as CheckInResult[]).map(r => ({ value: r, label: RESULT_LABELS[r] }));
  readonly syncOptions: FilterOption[] = [
    { value: 'pending', label: 'En attente' },
    { value: 'synced', label: 'Synchronisé' },
  ];

  readonly filteredRows = computed(() => {
    const time = this.timeFilter().trim().replace('h', ':');
    const name = this.nameFilter().trim().toLowerCase();
    const methods = this.methodFilter();
    const results = this.resultFilter();
    const syncs = this.syncFilter();
    return this.rows().filter(
      r =>
        (!time || r.time.startsWith(time)) &&
        (!name || r.name.toLowerCase().includes(name)) &&
        matchesAny(methods, r.method) &&
        matchesAny(results, r.result) &&
        matchesAny(syncs, r.pending ? 'pending' : 'synced'),
    );
  });

  readonly journalFiltered = computed(
    () => !!this.timeFilter().trim() || !!this.nameFilter().trim() || [this.methodFilter(), this.resultFilter(), this.syncFilter()].some(f => f.length > 0),
  );

  resetJournalFilters(): void {
    this.timeFilter.set('');
    this.nameFilter.set('');
    this.methodFilter.set([]);
    this.resultFilter.set([]);
    this.syncFilter.set([]);
  }

  readonly entries = computed(() => this.rows().filter(r => r.result !== 'REFUSED').length);
  readonly refused = computed(() => this.rows().filter(r => r.result === 'REFUSED').length);

  constructor() {
    // Recherche : sur le serveur en ligne, dans la copie locale hors ligne
    toObservable(this.query)
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap(q => {
          const text = q.trim();
          if (text.length < 2) return of([] as MemberLite[]);
          return this.offline.online() ? this.api.searchMembers(text, 6) : of(this.searchCache(text));
        }),
        takeUntilDestroyed(),
      )
      .subscribe(list => this.matches.set(list));
  }

  ngOnInit(): void {
    if (this.offline.online()) {
      this.offline.refreshCache();
      void this.offline.sync();
    }
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => (this.threshold = s.expiringSoonDays));
    this.loadJournal();
    // Arrivée depuis l'accueil (« Pointer ») : /access?member=12
    const memberId = Number(this.route.snapshot.queryParamMap.get('member'));
    if (memberId) {
      this.mode.set('search');
      this.checkIn({ memberId }, 'SEARCH');
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  loadJournal(): void {
    this.api
      .checkInsToday()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => this.journal.set(list.map(c => this.toRow(c))),
        error: () => {
          /* hors ligne : on garde le journal affiché */
        },
      });
  }

  setMode(mode: 'scan' | 'search'): void {
    this.mode.set(mode);
    if (mode === 'search') this.stopCamera();
  }

  pick(m: MemberLite): void {
    this.query.set('');
    this.matches.set([]);
    this.checkIn({ memberId: m.id }, 'SEARCH', m);
  }

  /** Code saisi au clavier ou par une douchette USB / Bluetooth (qui « tape » le contenu du QR) */
  submitCode(): void {
    const token = this.scanInput().trim();
    if (!token) return;
    this.scanInput.set('');
    this.checkIn({ qrToken: token }, 'QR');
  }

  /**
   * Pointe un membre. En ligne : le serveur décide et enregistre.
   * Hors ligne : décision locale avec la copie des membres, et mise en file d'attente.
   */
  checkIn(target: { memberId?: number; qrToken?: string }, method: CheckInMethod, known?: MemberLite): void {
    this.error.set(null);
    this.waitingLink.set(null);
    if (!this.offline.online()) {
      this.checkInOffline(target, method, known);
      return;
    }
    this.busy.set(true);
    this.api
      .checkIn({ ...target, method, clientId: clientId() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => {
          this.busy.set(false);
          this.answer.set({ result: c.result, member: this.liteFrom(c), text: this.answerText(c.result, c.memberName, c.endDate), pending: false });
          this.journal.update(list => [this.toRow(c), ...list]);
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          if (err.status === 0) {
            this.offline.online.set(false);
            this.checkInOffline(target, method, known);
          } else {
            this.answer.set(null);
            this.error.set(apiError(err, 'Pointage impossible.'));
          }
        },
      });
  }

  /** Encaisser depuis l'écran orange ou rouge */
  openPay(): void {
    const a = this.answer();
    if (a) this.paying.set(a.member);
  }

  /** Après paiement : l'écran passe au vert et l'entrée est enregistrée */
  onPaid(p: Payment): void {
    this.paying.set(null);
    if (p.status === 'PENDING') {
      this.waitingLink.set(p);
      return;
    }
    this.toast.success(`Paiement enregistré, reçu ${p.receiptNumber}.`);
    this.checkIn({ memberId: p.memberId }, 'SEARCH');
  }

  // ---- Caméra (jsQR chargé à la demande pour ne pas alourdir le reste de l'application) ----

  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Ce navigateur ne donne pas accès à la caméra (il faut une adresse en https ou localhost).');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.cameraOn.set(true);
      // Le <video> n'existe qu'une fois cameraOn passé à vrai
      setTimeout(() => {
        const video = this.video()?.nativeElement;
        if (!video || !this.stream) return;
        video.srcObject = this.stream;
        void video.play();
      });
      const { default: jsQR } = await import('jsqr');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      this.timer = setInterval(() => {
        const video = this.video()?.nativeElement;
        if (!video || !ctx || video.readyState < 2) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) this.onScanned(code.data);
      }, 250);
    } catch {
      this.cameraError.set('Caméra refusée ou indisponible. Autorisez la caméra, ou utilisez la recherche par nom.');
      this.stopCamera();
    }
  }

  stopCamera(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraOn.set(false);
  }

  private onScanned(token: string): void {
    // Le même QR reste devant la caméra : on ne le pointe qu'une fois toutes les 5 secondes
    const now = Date.now();
    if (token === this.lastToken && now - this.lastTokenAt < 5000) return;
    this.lastToken = token;
    this.lastTokenAt = now;
    navigator.vibrate?.(80);
    this.checkIn({ qrToken: token }, 'QR');
  }

  // ---- Hors ligne ----

  private checkInOffline(target: { memberId?: number; qrToken?: string }, method: CheckInMethod, known?: MemberLite): void {
    const m = known ?? (target.qrToken ? this.offline.findCachedByQr(target.qrToken) : this.offline.cachedMembers().find(x => x.id === target.memberId));
    if (!m) {
      this.error.set('Hors ligne : membre absent de la copie locale. Cherchez-le par son nom, ou attendez le retour du réseau.');
      return;
    }
    const state = this.stateOf(m.endDate);
    const result: CheckInResult = state === 'ACTIVE' ? 'ALLOWED' : state === 'EXPIRING_SOON' ? 'ALLOWED_EXPIRING' : 'REFUSED';
    const name = `${m.firstName} ${m.lastName}`;
    if (result !== 'REFUSED') {
      this.offline.enqueue({ clientId: clientId(), memberId: m.id, method, checkedAt: new Date().toISOString(), memberName: name });
    }
    this.answer.set({ result, member: { ...m, state }, text: this.answerText(result, name, m.endDate), pending: result !== 'REFUSED' });
  }

  private stateOf(endDate: string | null): SubscriptionState {
    if (!endDate) return 'NONE';
    const today = todayIso();
    if (endDate < today) return 'EXPIRED';
    const days = (Date.parse(endDate) - Date.parse(today)) / 86_400_000;
    return days <= this.threshold ? 'EXPIRING_SOON' : 'ACTIVE';
  }

  private searchCache(text: string): MemberLite[] {
    const q = text.toLowerCase();
    const digits = q.replace(/\D/g, '');
    return this.offline
      .cachedMembers()
      .filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || (digits.length >= 2 && (m.phone ?? '').replace(/\D/g, '').includes(digits)))
      .slice(0, 6);
  }

  private answerText(result: CheckInResult, name: string, endDate: string | null): string {
    switch (result) {
      case 'ALLOWED':
        return `${name}, valide jusqu’au ${frDate(endDate)}. Entrée enregistrée à ${hour(new Date().toISOString())}.`;
      case 'ALLOWED_EXPIRING':
        return `${name}, fin le ${frDate(endDate)}. Entrée enregistrée. Proposez le renouvellement.`;
      default:
        return endDate ? `${name}, abonnement expiré le ${frDate(endDate)}.` : `${name} n’a pas d’abonnement en cours.`;
    }
  }

  private liteFrom(c: CheckIn): MemberLite {
    const [firstName, ...rest] = c.memberName.split(' ');
    return {
      id: c.memberId,
      memberNumber: c.memberNumber,
      firstName,
      lastName: rest.join(' '),
      phone: c.memberPhone,
      planName: c.planName,
      endDate: c.endDate,
      state: c.state,
      daysLeft: c.daysLeft,
      qrToken: '',
    };
  }

  private toRow(c: CheckIn): JournalRow {
    return { key: String(c.id), time: hour(c.checkedAt), name: c.memberName, method: c.method, result: c.result, pending: false };
  }
}
