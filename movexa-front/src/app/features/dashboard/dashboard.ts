import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Fab, FabAction } from '@shared/fab/fab';

/** KPI affiché dans les cartes du haut */
export interface KpiCard {
  label: string;
  value: string;
  sub: string;
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Un adhérent à relancer */
export interface Reminder {
  id: number;
  name: string;
  reason: string;
  tone: StatusTone;
}

/** Un abonnement qui arrive à échéance */
export interface Expiration {
  name: string;
  plan: string;
  date: string;
  status: string;
  tone: StatusTone;
  amount: string;
}

/** Une barre du graphe : nombre d'entrées sur une heure */
interface HourPoint {
  hour: number;
  value: number;
}

type HourKind = 'past' | 'current' | 'average';

/** Échelle du graphe : 60 entrées = 200 px */
const CHART_MAX = 60;
const CHART_HEIGHT = 200;

@Component({
  selector: 'app-dashboard',
  imports: [Fab, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly today = (() => {
    const text = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
  })();

  // ---- Données mockées (à remplacer par de vrais appels API) ----

  readonly kpis: KpiCard[] = [
    { label: 'Adhérents actifs', value: '412', sub: '18 nouveaux ce mois-ci' },
    { label: "Présences aujourd'hui", value: '186', sub: '47 dans la salle maintenant' },
    { label: 'Encaissé ce mois-ci', value: '3 480 000 FCFA', sub: 'Prévision du mois : 8 650 000 FCFA' },
    { label: 'Impayés', value: '340 000 FCFA', sub: '12 adhérents concernés' },
  ];

  /** Heure courante (les heures suivantes affichent la moyenne) */
  readonly currentHour = 18;

  private readonly hours: HourPoint[] = [
    [6, 14], [7, 28], [8, 36], [9, 31], [10, 22], [11, 18], [12, 33], [13, 29], [14, 15],
    [15, 17], [16, 24], [17, 41], [18, 52], [19, 48], [20, 39], [21, 24], [22, 9],
  ].map(([hour, value]) => ({ hour, value }));

  readonly gridLines = [0, 20, 40, 60].map(value => ({ value, px: this.scale(value) }));

  readonly bars = this.hours.map(p => {
    const kind = this.kindOf(p.hour);
    return {
      ...p,
      kind,
      px: this.scale(p.value),
      tick: p.hour % 2 === 0 ? `${p.hour} h` : '',
      aria: `${p.hour} h : ${p.value} ${kind === 'average' ? 'entrées en moyenne' : 'entrées'}`,
    };
  });

  /** Heure survolée dans le graphe (null = heure courante) */
  readonly hoveredHour = signal<number | null>(null);

  readonly chartReadout = computed(() => {
    const hour = this.hoveredHour() ?? this.currentHour;
    const point = this.hours.find(p => p.hour === hour) ?? this.hours[0];
    const kind = this.kindOf(point.hour);
    const suffix =
      kind === 'past' ? 'entrées' : kind === 'current' ? 'entrées, heure en cours' : 'entrées en moyenne';
    return `${point.hour} h : ${point.value} ${suffix}`;
  });

  readonly reminders: Reminder[] = [
    { id: 1, name: 'Camille Roux', reason: 'Impayé : 30 000 FCFA depuis 6 jours', tone: 'danger' },
    { id: 2, name: 'Yacine Haddad', reason: 'Abonnement expiré le 7 nov.', tone: 'danger' },
    { id: 3, name: 'Inès Benali', reason: 'Expire dans 2 jours', tone: 'warning' },
    { id: 4, name: 'Mamadou Sow', reason: 'Absent depuis 21 jours', tone: 'warning' },
  ];

  /** Relances déjà envoyées (par id) */
  readonly sent = signal<ReadonlySet<number>>(new Set());

  readonly expirations: Expiration[] = [
    { name: 'Inès Benali', plan: 'Mensuel Illimité', date: '11/11/2026', status: 'Expire bientôt', tone: 'warning', amount: '30 000 FCFA' },
    { name: 'Julien Petit', plan: 'Mensuel Essentiel', date: '12/11/2026', status: 'Expire bientôt', tone: 'warning', amount: '20 000 FCFA' },
    { name: 'Awa Diallo', plan: 'Trimestriel', date: '14/11/2026', status: 'Renouvellement auto', tone: 'success', amount: '75 000 FCFA' },
    { name: 'Koffi Mensah', plan: 'Mensuel Illimité', date: '15/11/2026', status: 'Expire bientôt', tone: 'warning', amount: '30 000 FCFA' },
  ];

  // ---- Actions du FAB spécifiques à cet écran ----
  readonly fabActions: FabAction[] = [
    { id: 'add-member', label: 'Ajouter un adhérent', iconPath: 'M12 5v14M5 12h14' },
    { id: 'add-payment', label: 'Enregistrer un paiement', iconPath: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M2 10h20' },
    { id: 'send-reminders', label: 'Envoyer les relances', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
    { id: 'export', label: 'Exporter les données', iconPath: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
  ];

  sendReminder(id: number): void {
    this.sent.update(s => new Set(s).add(id));
    // TODO: appel API de relance
  }

  onFabAction(action: FabAction): void {
    console.log('Action déclenchée :', action.id);
    // À brancher sur les services quand les features seront prêtes
  }

  private scale(value: number): number {
    return Math.round((value / CHART_MAX) * CHART_HEIGHT);
  }

  private kindOf(hour: number): HourKind {
    if (hour < this.currentHour) return 'past';
    return hour === this.currentHour ? 'current' : 'average';
  }
}
