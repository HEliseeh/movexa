import { Component } from '@angular/core';

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface Plan {
  id: number;
  name: string;
  price: string;
  period: string;
  subscriberCount: number;
  features: PlanFeature[];
}

export type PaymentStatus = 'Payé' | 'En attente' | 'Échoué';
export type PaymentMethod = 'Orange Money' | 'Carte bancaire' | 'Espèces (accueil)' | 'Wave';

export interface Payment {
  id: number;
  initials: string;
  memberName: string;
  plan: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
}

@Component({
  selector: 'app-subscriptions',
  imports: [],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.css',
})
export class Subscriptions {
  readonly gymName = 'NOM DE LA SALLE'; // remplacer par tenant réel

  readonly plans: Plan[] = [
    {
      id: 1,
      name: 'Mensuel',
      price: '25 000',
      period: 'mois',
      subscriberCount: 78,
      features: [
        { label: 'Accès 6h – 22h',         included: true  },
        { label: 'Cours collectifs inclus', included: false },
        { label: 'Suivi personnalisé',       included: false },
      ],
    },
    {
      id: 2,
      name: 'Trimestriel',
      price: '65 000',
      period: 'trimestre',
      subscriberCount: 43,
      features: [
        { label: 'Accès 6h – 22h',         included: true  },
        { label: 'Cours collectifs inclus', included: true  },
        { label: 'Suivi personnalisé',       included: false },
      ],
    },
    {
      id: 3,
      name: 'Annuel',
      price: '220 000',
      period: 'an',
      subscriberCount: 21,
      features: [
        { label: 'Accès 6h – 22h',         included: true  },
        { label: 'Cours collectifs inclus', included: true  },
        { label: 'Suivi personnalisé',       included: true  },
      ],
    },
  ];

  readonly payments: Payment[] = [
    { id: 1, initials: 'TM', memberName: 'Thomas Martin',   plan: 'Mensuel',     amount: '25 000 FCFA', method: 'Orange Money',     status: 'Payé',       date: '15 oct. 2026' },
    { id: 2, initials: 'CA', memberName: 'Camille Aubert',  plan: 'Annuel',      amount: '220 000 FCFA', method: 'Carte bancaire',  status: 'Payé',       date: '14 oct. 2026' },
    { id: 3, initials: 'MC', memberName: 'Marie Coulibaly', plan: 'Trimestriel', amount: '65 000 FCFA',  method: 'Orange Money',    status: 'En attente', date: '14 oct. 2026' },
    { id: 4, initials: 'AD', memberName: 'Aïssatou Diallo', plan: 'Mensuel',     amount: '25 000 FCFA',  method: 'Espèces (accueil)', status: 'Payé',     date: '13 oct. 2026' },
    { id: 5, initials: 'MT', memberName: 'Moussa Touré',    plan: 'Mensuel',     amount: '25 000 FCFA',  method: 'Wave',            status: 'Payé',       date: '12 oct. 2026' },
  ];
}
