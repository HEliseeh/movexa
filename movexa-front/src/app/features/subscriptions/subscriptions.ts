import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MemberLite, Payment, Plan } from '@core/api/api.models';
import { MemberDto, MembersService } from '@core/api/members.service';
import { MovexaApi } from '@core/api/movexa-api.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { ToastService } from '@core/notifications/toast.service';
import { apiError, fcfa, frDate, STATE_LABELS, STATE_TONES, whatsappLink } from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';

type Tab = 'week' | 'expired' | 'all' | 'plans';

/** Formule en cours d'édition (pop-up) */
interface PlanDraft {
  id?: number;
  name: string;
  price: number | null;
  durationDays: number | null;
  active: boolean;
}

/**
 * Abonnements et échéances (module 2) : qui doit renouveler, qui a expiré, et le catalogue des
 * formules (prix en FCFA). Seul le gérant crée ou modifie une formule.
 */
@Component({
  selector: 'app-subscriptions',
  imports: [FormsModule, RouterLink, PayDialog],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.css',
})
export class Subscriptions implements OnInit {
  private readonly members = inject(MembersService);
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CurrentUserStore);

  readonly fcfa = fcfa;
  readonly frDate = frDate;
  readonly stateLabels = STATE_LABELS;
  readonly tones = STATE_TONES;

  readonly tab = signal<Tab>('week');
  readonly query = signal('');
  readonly all = signal<MemberDto[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly threshold = signal(7);
  readonly paying = signal<MemberLite | null>(null);
  readonly draft = signal<PlanDraft | null>(null);
  readonly savingPlan = signal(false);
  readonly planError = signal<string | null>(null);
  private gymName = 'la salle';

  private readonly prices = computed(() => new Map(this.plans().map(p => [p.name, p.price])));

  readonly expiring = computed(() => this.all().filter(m => m.state === 'EXPIRING_SOON').sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? '')));
  readonly expired = computed(() => this.all().filter(m => m.state === 'EXPIRED').sort((a, b) => (b.expiryDate ?? '').localeCompare(a.expiryDate ?? '')));

  readonly rows = computed(() => {
    const base = this.tab() === 'week' ? this.expiring() : this.tab() === 'expired' ? this.expired() : this.all();
    const q = this.query().trim().toLowerCase();
    return q ? base.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)) : base;
  });

  readonly toCollect = computed(() => this.rows().filter(m => m.state !== 'ACTIVE').reduce((t, m) => t + (this.priceOf(m) ?? 0), 0));

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (tab) this.tab.set(tab);
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => {
      this.threshold.set(s.expiringSoonDays);
      this.gymName = s.name ?? 'la salle';
    });
    this.load();
  }

  load(): void {
    this.members.list(0, 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ members }) => this.all.set(members));
    this.api.plans(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => this.plans.set(p));
  }

  priceOf(m: MemberDto): number | null {
    return m.plan ? (this.prices().get(m.plan) ?? null) : null;
  }

  when(m: MemberDto): string {
    const d = m.daysLeft;
    if (d === null) return '';
    if (m.state === 'EXPIRED') return `depuis ${-d} jour${d < -1 ? 's' : ''}`;
    if (m.state === 'EXPIRING_SOON') return d === 0 ? 'aujourd’hui' : d === 1 ? 'demain' : `dans ${d} jours`;
    return '';
  }

  durationText(days: number): string {
    if (days === 0) return 'Accès pour la journée';
    if (days % 30 === 0 && days >= 30 && days < 365) return `${days} jours (${days / 30} mois)`;
    return `${days} jours`;
  }

  renew(m: MemberDto): void {
    this.paying.set({ id: m.id, memberNumber: m.memberNumber, firstName: m.firstName, lastName: m.lastName, phone: m.phone, planName: m.plan, endDate: m.expiryDate, state: m.state, daysLeft: m.daysLeft, qrToken: m.qrToken });
  }

  reminder(m: MemberDto): string {
    const verb = m.state === 'EXPIRED' ? `a pris fin le ${frDate(m.expiryDate)}` : `se termine le ${frDate(m.expiryDate)}`;
    const price = this.priceOf(m);
    return whatsappLink(m.phone, `Bonjour ${m.firstName}, votre abonnement ${m.plan ?? ''} à ${this.gymName} ${verb}.${price ? ` Renouvellement : ${fcfa(price)}.` : ''} À bientôt !`);
  }

  onPaid(p: Payment): void {
    this.paying.set(null);
    this.toast.success(p.status === 'PENDING' ? 'Lien de paiement créé.' : `${p.memberName} : abonnement prolongé jusqu’au ${frDate(p.validTo)}.`);
    this.load();
  }

  // ---- Formules (gérant) ----

  editPlan(p?: Plan): void {
    this.planError.set(null);
    this.draft.set(p ? { id: p.id, name: p.name, price: p.price, durationDays: p.durationDays, active: p.active } : { name: '', price: null, durationDays: 30, active: true });
  }

  updateDraft(patch: Partial<PlanDraft>): void {
    this.draft.update(d => (d ? { ...d, ...patch } : d));
  }

  savePlan(): void {
    const d = this.draft();
    if (!d) return;
    if (!d.name.trim() || d.price === null || d.price < 0 || d.durationDays === null || d.durationDays < 0) {
      this.planError.set('Indiquez un nom, un prix et une durée (0 jour = séance unique).');
      return;
    }
    const payload = { name: d.name.trim(), price: d.price, durationDays: d.durationDays, active: d.active };
    this.savingPlan.set(true);
    const req = d.id ? this.api.updatePlan(d.id, payload) : this.api.createPlan(payload);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingPlan.set(false);
        this.draft.set(null);
        this.toast.success('Formule enregistrée.');
        this.load();
      },
      error: err => {
        this.savingPlan.set(false);
        this.planError.set(apiError(err, 'Enregistrement impossible.'));
      },
    });
  }
}
