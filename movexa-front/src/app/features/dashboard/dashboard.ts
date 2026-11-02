import { Component, computed, inject } from '@angular/core';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { Fab, FabAction } from '@shared/fab/fab';

/** KPI affiché dans les cartes du haut */
export interface KpiCard {
  label: string;
  value: string;
  sub: string;
  subPositive?: boolean; // true = vert, false = rouge, undefined = neutre
}

/** Une entrée de la liste « derniers accès » */
export interface AccessEntry {
  name: string;
  plan: string;
  time: string;
  valid: boolean;
}

/** Un adhérent à renouveler */
export interface RenewalEntry {
  initials: string;
  name: string;
  expiresOn: string;
}

/** Un point du graphe de fréquentation (barres) */
export interface FreqPoint {
  day: string;
  value: number; // 0-100 (pourcentage de la hauteur max)
  isToday: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [Fab],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private store = inject(CurrentUserStore);

  readonly user = this.store.user;

  readonly gymName = computed(() => 'NOM DE LA SALLE');

  readonly today = computed(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  });

  // ---- Actions du FAB spécifiques à cet écran ----
  readonly fabActions: FabAction[] = [
    {
      id: 'add-member',
      label: 'Ajouter un adhérent',
      iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
    },
    {
      id: 'add-plan',
      label: 'Créer un forfait',
      iconPath: 'M2 10h20M6 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
    },
    {
      id: 'add-course',
      label: 'Planifier un cours',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
    },
    {
      id: 'export',
      label: 'Exporter les données',
      iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    },
  ];

  onFabAction(action: FabAction): void {
    console.log('Action déclenchée :', action.id);
    // À brancher sur les services quand les features seront prêtes
  }

  // ---- Données mockées (à remplacer par de vrais appels API) ----

  readonly kpis: KpiCard[] = [
    {
      label: 'ADHÉRENTS ACTIFS',
      value: '142',
      sub: '+8 ce mois',
      subPositive: true,
    },
    {
      label: "ENTRÉES AUJOURD'HUI",
      value: '37',
      sub: 'Pic prévu à 18:30',
    },
    {
      label: 'À RENOUVELER (7 JOURS)',
      value: '12',
      sub: '3 relances envoyées',
    },
    {
      label: 'REVENUS DU MOIS',
      value: '2 450 €',
      sub: '+12 % vs mois dernier',
      subPositive: true,
    },
  ];

  readonly freqData: FreqPoint[] = [
    { day: 'Lun', value: 55, isToday: false },
    { day: 'Mar', value: 80, isToday: false },
    { day: 'Mer', value: 70, isToday: false },
    { day: 'Jeu', value: 90, isToday: true },
    { day: 'Ven', value: 65, isToday: false },
    { day: 'Sam', value: 40, isToday: false },
    { day: 'Dim', value: 25, isToday: false },
  ];

  readonly renewals: RenewalEntry[] = [
    { initials: 'AB', name: 'Adrien Blanc',    expiresOn: '17 oct. 2026' },
    { initials: 'MC', name: 'Marie Coulibaly', expiresOn: '18 oct. 2026' },
    { initials: 'JD', name: 'Julien Dupont',   expiresOn: '19 oct. 2026' },
    { initials: 'SF', name: 'Sofia Ferreira',  expiresOn: '21 oct. 2026' },
  ];

  readonly recentAccess: AccessEntry[] = [
    { name: 'Thomas Martin',   plan: 'Mensuel',   time: '09:14', valid: true  },
    { name: 'Aïssatou Diallo', plan: 'Trimestriel', time: '09:02', valid: true  },
    { name: 'Kevin Renaud',    plan: 'Mensuel',   time: '08:55', valid: false },
    { name: 'Camille Aubert',  plan: 'Annuel',    time: '08:41', valid: true  },
    { name: 'Moussa Touré',    plan: 'Mensuel',   time: '08:30', valid: true  },
  ];
}
