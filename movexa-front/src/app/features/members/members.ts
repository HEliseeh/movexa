import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MemberLite, Payment, Plan, SubscriptionState } from '@core/api/api.models';
import { MemberDto, MembersService } from '@core/api/members.service';
import { MovexaApi } from '@core/api/movexa-api.service';
import { ToastService } from '@core/notifications/toast.service';
import { Fab, FabAction } from '@shared/fab/fab';
import { fcfa, frDate, initials, STATE_LABELS, STATE_TONES, todayIso } from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';
import { QrCode } from '@shared/qr-code/qr-code';
import { MemberForm } from '@shared/member-form/member-form';

type SortKey = 'name' | 'end';

/**
 * Liste des membres (module 1) : recherche instantanée par nom ou téléphone, filtres par statut et
 * formule, tri, export. Toute la liste est chargée puis filtrée dans le navigateur : instantané
 * pour quelques centaines de membres (au-delà, filtrer côté serveur).
 */
@Component({
  selector: 'app-members',
  imports: [FormsModule, RouterLink, Fab, MemberForm, PayDialog, QrCode],
  templateUrl: './members.html',
  styleUrl: './members.css',
})
export class Members implements OnInit {
  private readonly membersService = inject(MembersService);
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly states = Object.keys(STATE_LABELS) as SubscriptionState[];
  readonly stateLabels = STATE_LABELS;
  readonly tones = STATE_TONES;
  readonly frDate = frDate;
  readonly fcfa = fcfa;
  readonly initials = initials;

  // ---- Filtres et tri ----
  readonly query = signal('');
  readonly stateFilter = signal<SubscriptionState | ''>('');
  readonly planFilter = signal('');
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

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const state = this.stateFilter();
    const plan = this.planFilter();
    const key = this.sortKey();
    const dir = this.sortDir();
    const list = this.loaded().filter(
      m =>
        (!q ||
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          `${m.lastName} ${m.firstName}`.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          (digits.length >= 2 && (m.phone ?? '').replace(/\D/g, '').includes(digits))) &&
        (!state || m.state === state) &&
        (!plan || m.plan === plan),
    );
    if (!key) return list;
    const value = (m: MemberDto) => (key === 'name' ? `${m.lastName} ${m.firstName}` : (m.expiryDate ?? '9999'));
    return [...list].sort((a, b) => value(a).localeCompare(value(b), 'fr') * dir);
  });

  readonly fabActions: FabAction[] = [
    { id: 'add', label: 'Nouveau membre', iconPath: 'M12 5v14M5 12h14' },
    { id: 'import', label: 'Importer une liste', iconPath: 'M12 21V9M7 14l5-5 5 5M4 3h16' },
    { id: 'remind', label: 'Relancer les expirés', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
    { id: 'export', label: 'Exporter les données', iconPath: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
  ];

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
    this.stateFilter.set('');
    this.planFilter.set('');
    this.sortKey.set(null);
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

  onFabAction(action: FabAction): void {
    if (action.id === 'add') this.editing.set(null);
    if (action.id === 'import') this.router.navigate(['/members/import']);
    if (action.id === 'remind') this.router.navigate(['/reminders']);
    if (action.id === 'export') this.exportCsv();
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
    this.total.update(n => Math.max(0, n - 1));
    this.editing.set(undefined);
    this.toast.success(`${member.firstName} ${member.lastName} a été archivé(e).`);
  }

  /** Export CSV (séparateur « ; » et BOM UTF-8 : s'ouvre correctement dans Excel en français) */
  exportCsv(): void {
    const header = ['Numéro', 'Prénom', 'Nom', 'Téléphone', 'E-mail', 'Statut', 'Formule', 'Fin', 'Inscrit le', 'Dernière visite'];
    const lines = this.rows().map(m =>
      [m.memberNumber, m.firstName, m.lastName, m.phone ?? '', m.email ?? '', STATE_LABELS[m.state], m.plan ?? '', frDate(m.expiryDate), frDate(m.joinDate), frDate(m.lastVisitDate)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    );
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `membres-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
