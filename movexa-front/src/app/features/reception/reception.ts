import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { MemberLite, Payment, Prospect, ReceptionToday } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { ToastService } from '@core/notifications/toast.service';
import { initials, longToday, SOURCE_LABELS, STATE_TONES, stateText, whatsappLink } from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';
import { MemberForm } from '@shared/member-form/member-form';

/**
 * Accueil du réceptionniste : tout ce qu'on fait au comptoir en quelques secondes.
 * Une recherche unique (membres et prospects), quatre raccourcis, et deux listes à traiter.
 */
@Component({
  selector: 'app-reception',
  imports: [FormsModule, RouterLink, PayDialog, MemberForm],
  templateUrl: './reception.html',
  styleUrl: './reception.css',
})
export class Reception implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(CurrentUserStore);

  readonly today = longToday();
  readonly tones = STATE_TONES;
  readonly stateText = stateText;
  readonly initials = initials;
  readonly sourceLabels = SOURCE_LABELS;

  readonly query = signal('');
  readonly memberResults = signal<MemberLite[]>([]);
  readonly prospectResults = signal<Prospect[]>([]);
  readonly data = signal<ReceptionToday | null>(null);
  readonly paying = signal<MemberLite | null | undefined>(undefined);
  readonly creating = signal(false);
  readonly sent = signal<Set<number>>(new Set());
  private gymName = 'la salle';

  readonly firstName = computed(() => this.store.user()?.firstName || this.store.user()?.login || '');
  readonly hasQuery = computed(() => this.query().trim().length >= 2);

  constructor() {
    // Recherche instantanée dans les membres ET les prospects
    toObservable(this.query)
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap(q => {
          const text = q.trim();
          return text.length >= 2 ? combineLatest([this.api.searchMembers(text, 5), this.api.searchProspects(text)]) : of([[], []] as [MemberLite[], Prospect[]]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(([members, prospects]) => {
        this.memberResults.set(members);
        this.prospectResults.set(prospects.slice(0, 3));
      });
  }

  ngOnInit(): void {
    this.load();
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => (this.gymName = s.name ?? 'la salle'));
  }

  load(): void {
    this.api.receptionToday().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(d => this.data.set(d));
  }

  checkIn(m: MemberLite): void {
    this.router.navigate(['/access'], { queryParams: { member: m.id } });
  }

  convert(p: Prospect): void {
    this.router.navigate(['/prospects'], { queryParams: { convert: p.id } });
  }

  /** Relance WhatsApp d'un prospect : message pré-rempli puis relance enregistrée (J+1, J+3, J+7) */
  followUp(p: Prospect): void {
    const first = p.name?.split(' ')[0] ?? '';
    const text = `Bonjour ${first}, merci pour votre intérêt pour ${this.gymName}. Nous serions ravis de vous accueillir pour une séance d’essai. Quel jour vous arrange ?`;
    window.open(whatsappLink(p.phone, text), '_blank', 'noopener');
    this.api
      .prospectFollowUp(p.id, 'WHATSAPP')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sent.update(s => new Set(s).add(p.id)));
  }

  onPaid(p: Payment): void {
    this.paying.set(undefined);
    this.toast.success(p.status === 'PENDING' ? `Lien de paiement envoyé à ${p.memberName}.` : `${p.memberName} : ${p.planName} encaissé.`);
    this.load();
  }

  onCreated(): void {
    this.creating.set(false);
    this.toast.success('Membre inscrit.');
    this.load();
  }
}
