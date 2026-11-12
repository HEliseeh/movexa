import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Dashboard as DashboardData, DueMember, PaymentMethod } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { Fab, FabAction } from '@shared/fab/fab';
import { apiError, fcfa, frDate, longToday, METHOD_LABELS, shortDate, whatsappLink } from '@shared/format';

type Period = 'DAY' | 'WEEK' | 'MONTH';

const PERIODS: { id: Period; label: string; text: string }[] = [
  { id: 'DAY', label: 'Aujourd’hui', text: 'aujourd’hui' },
  { id: 'WEEK', label: 'Cette semaine', text: 'cette semaine' },
  { id: 'MONTH', label: 'Ce mois-ci', text: 'ce mois-ci' },
];

/** Couleurs des moyens de paiement sur fond sombre (barre empilée et légende) */
const METHOD_COLORS: Record<PaymentMethod, string> = {
  CASH: '#ffffff',
  MTN_MOMO: '#c8a47e',
  MOOV_MONEY: '#8e9bb8',
  PAYMENT_LINK: '#4a5470',
};

/** Hauteur du graphe de fréquentation, en pixels */
const CHART_HEIGHT = 160;

/**
 * Tableau de bord du gérant (module 5) : ce qui a été encaissé, qui est à jour, qui doit
 * renouveler, et la fréquentation. Réservé au gérant (contrôlé aussi par le backend).
 */
@Component({
  selector: 'app-dashboard',
  imports: [Fab, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = longToday();
  readonly periods = PERIODS;
  readonly fcfa = fcfa;
  readonly frDate = frDate;

  readonly period = signal<Period>('MONTH');
  readonly data = signal<DashboardData | null>(null);
  readonly error = signal<string | null>(null);
  readonly hovered = signal<number | null>(null);
  readonly sent = signal<Set<number>>(new Set());
  private gymName = 'la salle';

  readonly periodText = computed(() => PERIODS.find(p => p.id === this.period())!.text);

  readonly methods = computed(() => {
    const d = this.data();
    if (!d) return [];
    return (Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => {
      const value = d.paidByMethod[m] ?? 0;
      return { label: METHOD_LABELS[m], value, color: METHOD_COLORS[m], pct: d.totalPaid ? (value / d.totalPaid) * 100 : 0 };
    });
  });

  readonly kpis = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Membres actifs', value: String(d.activeMembers), sub: 'à jour aujourd’hui' },
      { label: 'Nouveaux inscrits', value: String(d.newMembers), sub: this.periodText() },
      { label: 'Expirés', value: String(d.expiredMembers), sub: 'non renouvelés à ce jour' },
      { label: 'Renouvelés après relance', value: `${d.renewedAfterReminderWeek} / ${d.remindersSentWeek}`, sub: 'relances des 7 derniers jours' },
    ];
  });

  /** Échelle du graphe : arrondie à la dizaine supérieure */
  private readonly chartMax = computed(() => {
    const max = Math.max(10, ...(this.data()?.attendance.map(a => a.count) ?? [0]));
    return Math.ceil(max / 10) * 10;
  });

  readonly gridLines = computed(() => {
    const max = this.chartMax();
    return [0, max / 2, max].map(v => ({ value: v, px: (v / max) * CHART_HEIGHT }));
  });

  readonly days = computed(() => {
    const list = this.data()?.attendance ?? [];
    const max = this.chartMax();
    return list.map((a, i) => {
      const date = new Date(a.day + 'T12:00:00');
      const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      return {
        label,
        tick: i % 2 === 1 ? label : '',
        px: (a.count / max) * CHART_HEIGHT,
        current: i === list.length - 1,
        count: a.count,
        aria: `${label} : ${a.count} entrées`,
      };
    });
  });

  readonly readout = computed(() => {
    const days = this.days();
    if (!days.length) return '';
    const i = this.hovered() ?? days.length - 1;
    const d = days[i];
    return `${d.label} : ${d.count} entrées${d.current ? ', journée en cours' : ''}`;
  });

  readonly fabActions: FabAction[] = [
    { id: 'member', label: 'Nouveau membre', iconPath: 'M12 5v14M5 12h14' },
    { id: 'pay', label: 'Encaisser', iconPath: 'M2 7h20v12H2zM2 11h20M6 15h4' },
    { id: 'checkin', label: 'Pointer une entrée', iconPath: 'M3 8V4h5M16 3h5v5M21 16v5h-5M8 21H3v-5' },
    { id: 'reminders', label: 'Faire les relances', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
  ];

  ngOnInit(): void {
    this.load();
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => (this.gymName = s.name ?? 'la salle'));
  }

  setPeriod(p: Period): void {
    this.period.set(p);
    this.load();
  }

  load(): void {
    this.api
      .dashboard(this.period())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: d => {
          this.data.set(d);
          this.error.set(null);
        },
        error: err => this.error.set(apiError(err, 'Impossible de charger le tableau de bord.')),
      });
  }

  dueDetail(d: DueMember, expired: boolean): string {
    const m = d.member;
    const plan = m.planName ?? 'Sans formule';
    if (!expired) {
      const when = m.daysLeft === 0 ? 'expire aujourd’hui' : m.daysLeft === 1 ? `expire demain, ${shortDate(m.endDate)}` : `expire le ${shortDate(m.endDate)}`;
      return `${plan} · ${when}`;
    }
    const n = d.reminderCount;
    return `${plan} · expiré le ${shortDate(m.endDate)} · ${n === 0 ? 'aucune relance' : `relancé ${n} fois`}`;
  }

  /** Relance WhatsApp immédiate depuis la liste « À renouveler », enregistrée côté serveur */
  remind(d: DueMember): void {
    const m = d.member;
    const when = m.daysLeft === 0 ? 'aujourd’hui' : m.daysLeft === 1 ? 'demain' : `le ${shortDate(m.endDate)}`;
    const message = `Bonjour ${m.firstName}, votre abonnement ${m.planName ?? ''} à ${this.gymName} se termine ${when}. Renouvelez à l’accueil ou par MoMo. À bientôt !`;
    window.open(whatsappLink(m.phone, message), '_blank', 'noopener');
    this.api
      .reminderSent({ memberId: m.id, rule: (m.daysLeft ?? 9) <= 1 ? 'BEFORE_1' : 'BEFORE_7', channel: 'WHATSAPP', targetEndDate: m.endDate, message })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sent.update(s => new Set(s).add(m.id)));
  }

  onFabAction(action: FabAction): void {
    const routes: Record<string, [string, object?]> = {
      member: ['/members', { new: 1 }],
      pay: ['/payments', { pay: 1 }],
      checkin: ['/access'],
      reminders: ['/reminders'],
    };
    const [path, queryParams] = routes[action.id];
    this.router.navigate([path], { queryParams });
  }
}
