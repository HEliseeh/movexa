import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MemberLite, Payment, Plan, SubscriptionState } from '@core/api/api.models';
import { MemberDto, MembersService } from '@core/api/members.service';
import { MovexaApi } from '@core/api/movexa-api.service';
import { ToastService } from '@core/notifications/toast.service';
import { DateFilter, DateRange, EMPTY_RANGE, FilterOption, inRange, isRangeActive, matchesAny, MultiFilter } from '@shared/column-filter/column-filter';
import { fcfa, frDate, initials, STATE_LABELS, STATE_TONES, todayIso } from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';
import { QrCode } from '@shared/qr-code/qr-code';
import { MemberForm } from '@shared/member-form/member-form';

type SortKey = 'name' | 'end';

/**
 * Liste des membres (module 1) : un filtre sur chaque colonne (texte, choix multiple ou plage de
 * dates), tri, export. L'en-tête et ses filtres restent visibles pendant le défilement. Toute la liste est chargée puis filtrée dans le navigateur : instantané
 * pour quelques centaines de membres (au-delà, filtrer côté serveur).
 */
@Component({
  selector: 'app-members',
  imports: [FormsModule, RouterLink, MemberForm, PayDialog, QrCode, MultiFilter, DateFilter],
  templateUrl: './members.html',
  styleUrl: './members.css',
})
export class Members implements OnInit {
  private readonly membersService = inject(MembersService);
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly states = Object.keys(STATE_LABELS) as SubscriptionState[];
  readonly stateLabels = STATE_LABELS;
  readonly tones = STATE_TONES;
  readonly frDate = frDate;
  readonly fcfa = fcfa;
  readonly initials = initials;

  // ---- Filtres et tri ----
  readonly query = signal('');
  readonly phoneQuery = signal('');
  readonly stateFilter = signal<string[]>([]);
  readonly planFilter = signal<string[]>([]);
  readonly endRange = signal<DateRange>(EMPTY_RANGE);
  readonly joinRange = signal<DateRange>(EMPTY_RANGE);
  readonly visitRange = signal<DateRange>(EMPTY_RANGE);
  readonly sortKey = signal<SortKey | null>(null);
  readonly sortDir = signal<1 | -1>(1);
  readonly openId = signal<number | null>(null);

  // ---- Données ----
  private readonly loaded = signal<MemberDto[]>([]);
  readonly total = signal(0);
  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  // ---- Pop-up ----
  /** undefined = fermé, null = création, MemberDto = modification */
  readonly editing = signal<MemberDto | null | undefined>(undefined);
  readonly paying = signal<MemberLite | null>(null);

  readonly stateOptions: FilterOption[] = this.states.map(s => ({ value: s, label: STATE_LABELS[s] }));
  readonly planOptions = computed<FilterOption[]>(() => [
    ...this.plans().map(p => ({ value: p.name, label: p.name })),
    { value: '', label: 'Aucune formule' },
  ]);

  readonly hasFilters = computed(
    () =>
      !!this.query().trim() ||
      !!this.phoneQuery().trim() ||
      this.stateFilter().length > 0 ||
      this.planFilter().length > 0 ||
      [this.endRange(), this.joinRange(), this.visitRange()].some(isRangeActive),
  );

  // ---- Sélection (cases à cocher) ----
  readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  readonly selectedMembers = computed(() => this.loaded().filter(m => this.selectedIds().has(m.id)));
  /** Cochés et relançables / cochés mais écartés (avec la raison) */
  readonly remindable = computed(() => this.selectedMembers().filter(m => !reminderBlock(m)));
  readonly notRemindable = computed(() =>
    this.selectedMembers()
      .filter(m => reminderBlock(m))
      .map(m => ({ name: `${m.firstName} ${m.lastName}`, reason: reminderBlock(m)! })),
  );
  readonly notRemindableText = computed(() =>
    this.notRemindable()
      .slice(0, 3)
      .map(x => `${x.name} (${x.reason})`)
      .join(', ') + (this.notRemindable().length > 3 ? `, et ${this.notRemindable().length - 3} autre(s)` : ''),
  );
  readonly allVisibleSelected = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every(m => this.selectedIds().has(m.id));
  });
  readonly someVisibleSelected = computed(() => !this.allVisibleSelected() && this.rows().some(m => this.selectedIds().has(m.id)));

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const phone = this.phoneQuery().replace(/\D/g, '');
    const states = this.stateFilter();
    const plans = this.planFilter();
    const [end, join, visit] = [this.endRange(), this.joinRange(), this.visitRange()];
    const key = this.sortKey();
    const dir = this.sortDir();
    const list = this.loaded().filter(
      m =>
        (!q ||
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          `${m.lastName} ${m.firstName}`.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          (digits.length >= 2 && (m.phone ?? '').replace(/\D/g, '').includes(digits))) &&
        (!phone || (m.phone ?? '').replace(/\D/g, '').includes(phone)) &&
        matchesAny(states, m.state) &&
        matchesAny(plans, m.plan) &&
        inRange(end, m.expiryDate) &&
        inRange(join, m.joinDate) &&
        inRange(visit, m.lastVisitDate),
    );
    if (!key) return list;
    const value = (m: MemberDto) => (key === 'name' ? `${m.lastName} ${m.firstName}` : (m.expiryDate ?? '9999'));
    return [...list].sort((a, b) => value(a).localeCompare(value(b), 'fr') * dir);
  });

  ngOnInit(): void {
    this.load();
    this.api.plans(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => this.plans.set(p));
    // /members?new=1 ouvre directement l'inscription (depuis l'accueil ou le tableau de bord)
    if (this.route.snapshot.queryParamMap.get('new')) this.editing.set(null);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.membersService
      .list(0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ members, total }) => {
          this.loaded.set(members);
          this.total.set(total);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Impossible de charger les membres. Vérifiez que le backend est démarré.');
          this.loading.set(false);
        },
      });
  }

  lastVisit(m: MemberDto): string {
    if (!m.lastVisitDate) return 'Aucune';
    return m.lastVisitDate === todayIso() ? 'Aujourd’hui' : frDate(m.lastVisitDate);
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) this.sortDir.update(d => (d === 1 ? -1 : 1));
    else {
      this.sortKey.set(key);
      this.sortDir.set(1);
    }
  }

  sortIcon(key: SortKey): string {
    return this.sortKey() !== key ? '↕' : this.sortDir() === 1 ? '↑' : '↓';
  }

  resetFilters(): void {
    this.query.set('');
    this.phoneQuery.set('');
    this.stateFilter.set([]);
    this.planFilter.set([]);
    this.endRange.set(EMPTY_RANGE);
    this.joinRange.set(EMPTY_RANGE);
    this.visitRange.set(EMPTY_RANGE);
    this.sortKey.set(null);
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: number): void {
    this.selectedIds.update(cur => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Case de l'en-tête : coche ou décoche toutes les lignes affichées (selon les filtres) */
  toggleSelectVisible(): void {
    const ids = this.rows().map(m => m.id);
    const all = this.allVisibleSelected();
    this.selectedIds.update(cur => {
      const next = new Set(cur);
      ids.forEach(id => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  /** Ouvre l'écran Relances avec les messages des membres cochés relançables */
  remindSelected(): void {
    const ids = this.remindable().map(m => m.id);
    if (ids.length) this.router.navigate(['/reminders'], { queryParams: { members: ids.join(',') } });
  }

  toggleRow(id: number): void {
    this.openId.update(cur => (cur === id ? null : id));
  }

  renew(m: MemberDto): void {
    this.paying.set({
      id: m.id,
      memberNumber: m.memberNumber,
      firstName: m.firstName,
      lastName: m.lastName,
      phone: m.phone,
      planName: m.plan,
      endDate: m.expiryDate,
      state: m.state,
      daysLeft: m.daysLeft,
      qrToken: m.qrToken,
    });
  }

  onPaid(p: Payment): void {
    this.paying.set(null);
    this.toast.success(p.status === 'PENDING' ? `Lien de paiement créé pour ${p.memberName}.` : `${p.memberName} : ${p.planName} encaissé.`);
    this.load();
  }

  onSaved({ member, created }: { member: MemberDto; created: boolean }): void {
    const name = `${member.firstName} ${member.lastName}`;
    this.editing.set(undefined);
    if (created) {
      this.resetFilters();
      this.toast.success(`${name} est inscrit(e).`);
      this.load();
    } else {
      this.loaded.update(list => list.map(m => (m.id === member.id ? member : m)));
      this.toast.success(`Modifications enregistrées pour ${name}.`);
    }
    this.openId.set(member.id);
  }

  onDeleted(member: MemberDto): void {
    this.loaded.update(list => list.filter(m => m.id !== member.id));
    this.selectedIds.update(cur => {
      const next = new Set(cur);
      next.delete(member.id);
      return next;
    });
    this.total.update(n => Math.max(0, n - 1));
    this.editing.set(undefined);
    this.toast.success(`${member.firstName} ${member.lastName} a été archivé(e).`);
  }

  /** Export CSV (séparateur « ; » et BOM UTF-8 : s'ouvre correctement dans Excel en français) */
  exportCsv(list: MemberDto[] = this.rows(), suffix = ''): void {
    const header = ['Numéro', 'Prénom', 'Nom', 'Téléphone', 'E-mail', 'Statut', 'Formule', 'Fin', 'Inscrit le', 'Dernière visite'];
    const lines = list.map(m =>
      [m.memberNumber, m.firstName, m.lastName, m.phone ?? '', m.email ?? '', STATE_LABELS[m.state], m.plan ?? '', frDate(m.expiryDate), frDate(m.joinDate), frDate(m.lastVisitDate)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    );
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `membres${suffix}-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

/**
 * Pourquoi un membre ne peut pas être relancé (null = relançable).
 * Même règle que le serveur (ReminderService.isRemindable).
 */
export function reminderBlock(m: MemberDto): string | null {
  if ((m.phone ?? '').replace(/\D/g, '').length < 8) return 'pas de téléphone';
  if (m.state === 'NONE' || !m.expiryDate) return 'sans abonnement';
  if (m.state === 'ACTIVE') return 'abonnement encore actif';
  return null;
}
