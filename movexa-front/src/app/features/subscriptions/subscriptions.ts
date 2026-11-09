import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Fab, FabAction } from '@shared/fab/fab';

export type SubscriptionTab = 'current' | 'plans' | 'payments';
export type SubscriptionStatus = 'Actif' | 'Expire bientôt' | 'Impayé' | 'Expiré';
export type PaymentStatus = 'Payé' | 'En attente' | 'Échoué';

export interface Subscription {
  member: string;
  plan: string;
  start: string;
  end: string;
  renewal: 'Manuelle' | 'Automatique';
  status: SubscriptionStatus;
  price: number;
}

export interface Plan {
  name: string;
  price: string;
  period: string;
  detail: string;
  usage: string;
}

export interface Payment {
  receipt: string;
  date: string;
  member: string;
  item: string;
  method: string;
  status: PaymentStatus;
  price: number;
}

const TONES: Record<SubscriptionStatus | PaymentStatus, string> = {
  'Actif': 'success',
  'Expire bientôt': 'warning',
  'Impayé': 'danger',
  'Expiré': 'danger',
  'Payé': 'success',
  'En attente': 'warning',
  'Échoué': 'danger',
};

function formatFcfa(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

// ---- Données mockées (à remplacer par de vrais appels API) ----
const SUBSCRIPTIONS: Subscription[] = [
  { member: 'Inès Benali', plan: 'Mensuel Illimité', start: '11/10/2026', end: '11/11/2026', renewal: 'Manuelle', status: 'Expire bientôt', price: 30000 },
  { member: 'Camille Roux', plan: 'Mensuel Illimité', start: '03/10/2026', end: '03/11/2026', renewal: 'Manuelle', status: 'Impayé', price: 30000 },
  { member: 'Awa Diallo', plan: 'Trimestriel', start: '14/08/2026', end: '14/11/2026', renewal: 'Automatique', status: 'Actif', price: 75000 },
  { member: 'Koffi Mensah', plan: 'Mensuel Illimité', start: '15/10/2026', end: '15/11/2026', renewal: 'Manuelle', status: 'Expire bientôt', price: 30000 },
  { member: 'Thomas Lefèvre', plan: 'Annuel', start: '30/06/2026', end: '30/06/2027', renewal: 'Automatique', status: 'Actif', price: 270000 },
  { member: 'Yacine Haddad', plan: 'Mensuel Essentiel', start: '07/10/2026', end: '07/11/2026', renewal: 'Manuelle', status: 'Expiré', price: 20000 },
  { member: 'Sarah Nguyen', plan: 'Mensuel Illimité', start: '02/11/2026', end: '02/12/2026', renewal: 'Automatique', status: 'Actif', price: 30000 },
  { member: 'Julien Petit', plan: 'Mensuel Essentiel', start: '12/10/2026', end: '12/11/2026', renewal: 'Manuelle', status: 'Expire bientôt', price: 20000 },
];

const PLANS: Plan[] = [
  { name: 'Mensuel Essentiel', price: '20 000 FCFA', period: 'par mois', detail: 'Accès à la salle aux heures creuses.', usage: '96 adhérents' },
  { name: 'Mensuel Illimité', price: '30 000 FCFA', period: 'par mois', detail: 'Accès illimité à la salle et aux cours.', usage: '184 adhérents' },
  { name: 'Trimestriel', price: '75 000 FCFA', period: 'par trimestre', detail: 'Accès illimité pendant 3 mois.', usage: '87 adhérents' },
  { name: 'Annuel', price: '270 000 FCFA', period: 'par an', detail: 'Accès illimité pendant 12 mois.', usage: '45 adhérents' },
  { name: 'Séance à la carte', price: '3 000 FCFA', period: 'la séance', detail: 'Accès unique, sans engagement.', usage: '31 ventes ce mois-ci' },
];

const PAYMENTS: Payment[] = [
  { receipt: 'REC-2026-00482', date: '09/11/2026', member: 'Thomas Lefèvre', item: 'Mensualité', method: 'Carte', status: 'Payé', price: 20000 },
  { receipt: 'REC-2026-00481', date: '09/11/2026', member: 'Sarah Nguyen', item: 'Mensuel Illimité', method: 'MoMo', status: 'Payé', price: 30000 },
  { receipt: 'REC-2026-00480', date: '09/11/2026', member: 'Léa Moreau', item: 'Séance à la carte', method: 'Espèces', status: 'Payé', price: 3000 },
  { receipt: 'REC-2026-00479', date: '09/11/2026', member: 'Awa Diallo', item: 'Trimestriel', method: 'MoMo', status: 'En attente', price: 75000 },
  { receipt: 'REC-2026-00478', date: '08/11/2026', member: 'Julien Petit', item: 'Mensuel Essentiel', method: 'Carte', status: 'Payé', price: 20000 },
  { receipt: 'REC-2026-00477', date: '08/11/2026', member: 'Mamadou Sow', item: 'Mensuel Illimité', method: 'Espèces', status: 'Payé', price: 30000 },
  { receipt: 'REC-2026-00476', date: '06/11/2026', member: 'Camille Roux', item: 'Mensuel Illimité', method: 'MoMo', status: 'Échoué', price: 30000 },
  { receipt: 'REC-2026-00475', date: '05/11/2026', member: 'Koffi Mensah', item: 'Mensuel Illimité', method: 'MoMo', status: 'Payé', price: 30000 },
];

@Component({
  selector: 'app-subscriptions',
  imports: [FormsModule, Fab],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.css',
})
export class Subscriptions {
  readonly fcfa = formatFcfa;

  readonly tabs: { id: SubscriptionTab; label: string }[] = [
    { id: 'current', label: 'Abonnements en cours' },
    { id: 'plans', label: 'Formules' },
    { id: 'payments', label: 'Paiements et reçus' },
  ];
  readonly tab = signal<SubscriptionTab>('current');

  readonly statuses: SubscriptionStatus[] = ['Actif', 'Expire bientôt', 'Impayé', 'Expiré'];
  readonly plans = PLANS;
  readonly payments = PAYMENTS;

  // ---- Abonnements en cours ----
  readonly query = signal('');
  readonly statusFilter = signal('');
  readonly sent = signal<ReadonlySet<string>>(new Set());

  readonly subscriptions = computed(() => {
    const q = this.query().trim().toLowerCase();
    const s = this.statusFilter();
    return SUBSCRIPTIONS.filter(a => (!q || a.member.toLowerCase().includes(q)) && (!s || a.status === s));
  });

  readonly subscriptionsTotal = computed(() => this.subscriptions().reduce((t, a) => t + a.price, 0));
  readonly paymentsTotal = PAYMENTS.reduce((t, p) => t + p.price, 0);

  readonly fabActions: FabAction[] = [
    { id: 'add-plan', label: 'Créer une formule', iconPath: 'M12 5v14M5 12h14' },
    { id: 'add-payment', label: 'Ajouter un règlement', iconPath: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M2 10h20' },
    { id: 'remind', label: 'Relancer les échéances', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
    { id: 'download', label: 'Télécharger les reçus', iconPath: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
  ];

  tone(status: SubscriptionStatus | PaymentStatus): string {
    return TONES[status];
  }

  resetFilters(): void {
    this.query.set('');
    this.statusFilter.set('');
  }

  remind(member: string): void {
    this.sent.update(s => new Set(s).add(member));
    // TODO: appel API de relance
  }

  onFabAction(action: FabAction): void {
    console.log('FAB action :', action.id);
  }
}
