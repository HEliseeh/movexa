import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTable } from '@shared/data-table/data-table';
import { ColumnDef } from '@shared/data-table/data-table.models';
import { Fab, FabAction } from '@shared/fab/fab';

export type MemberStatus = 'Actif' | 'À renouveler' | 'Expiré';
export type FilterTab    = 'Tous' | 'Actifs' | 'À renouveler' | 'Expirés';

export interface Member {
  id: number;
  initials: string;
  name: string;
  email: string;
  plan: string;
  expiration: string;
  status: MemberStatus;
}

const ALL_MEMBERS: Member[] = [
  { id: 1,  initials: 'TM', name: 'Thomas Martin',    email: 'thomas.martin@mail.com',   plan: 'Mensuel',     expiration: '31 oct. 2026', status: 'Actif' },
  { id: 2,  initials: 'AD', name: 'Aïssatou Diallo',  email: 'aissatou.diallo@mail.com', plan: 'Trimestriel', expiration: '15 déc. 2026', status: 'Actif' },
  { id: 3,  initials: 'AB', name: 'Adrien Blanc',      email: 'adrien.blanc@mail.com',    plan: 'Mensuel',     expiration: '17 oct. 2026', status: 'À renouveler' },
  { id: 4,  initials: 'KR', name: 'Kevin Renaud',      email: 'kevin.renaud@mail.com',    plan: 'Mensuel',     expiration: '10 oct. 2026', status: 'Expiré' },
  { id: 5,  initials: 'CA', name: 'Camille Aubert',    email: 'camille.aubert@mail.com',  plan: 'Annuel',      expiration: '01 jan. 2027', status: 'Actif' },
  { id: 6,  initials: 'MT', name: 'Moussa Touré',      email: 'moussa.toure@mail.com',    plan: 'Mensuel',     expiration: '28 oct. 2026', status: 'Actif' },
  { id: 7,  initials: 'SF', name: 'Sofia Ferreira',    email: 'sofia.ferreira@mail.com',  plan: 'Trimestriel', expiration: '21 oct. 2026', status: 'À renouveler' },
  { id: 8,  initials: 'JD', name: 'Julien Dupont',     email: 'julien.dupont@mail.com',   plan: 'Mensuel',     expiration: '19 oct. 2026', status: 'À renouveler' },
  { id: 9,  initials: 'MC', name: 'Marie Coulibaly',   email: 'marie.coulibaly@mail.com', plan: 'Annuel',      expiration: '18 oct. 2026', status: 'À renouveler' },
  { id: 10, initials: 'PL', name: 'Pierre Lefebvre',   email: 'pierre.lefebvre@mail.com', plan: 'Mensuel',     expiration: '05 oct. 2026', status: 'Expiré' },
  { id: 11, initials: 'EN', name: 'Emma Nguyen',       email: 'emma.nguyen@mail.com',     plan: 'Trimestriel', expiration: '20 nov. 2026', status: 'Actif' },
  { id: 12, initials: 'RB', name: 'Rachid Bouazza',    email: 'rachid.bouazza@mail.com',  plan: 'Mensuel',     expiration: '30 oct. 2026', status: 'Actif' },
];

// ---- Icônes badge (SVG path d="") ----
const BADGE_ICONS: Record<MemberStatus, string> = {
  'Actif':         'M20 6 9 17 4 12',
  'À renouveler':  'M12 9v4M12 16h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z',
  'Expiré':        'M18 6 6 18M6 6l12 12',
};

const BADGE_CLASSES: Record<MemberStatus, string> = {
  'Actif':         'badge-actif',
  'À renouveler':  'badge-a-renouveler',
  'Expiré':        'badge-expire',
};

@Component({
  selector: 'app-members',
  imports: [FormsModule, DataTable, Fab],
  templateUrl: './members.html',
  styleUrl:    './members.css',
})
export class Members {
  readonly tabs: FilterTab[] = ['Tous', 'Actifs', 'À renouveler', 'Expirés'];

  search    = signal('');
  activeTab = signal<FilterTab>('Tous');

  // ---- Définition des colonnes passée au DataTable ----
  readonly columns: ColumnDef<Member>[] = [
    {
      key:      'name',
      label:    'Adhérent',
      type:     'avatar-text',
      sortable: true,
      width:    '260px',
      value:       row => row.name,
      sortValue:   row => row.name,
      avatarFn:    row => row.initials,
      subValueFn:  row => row.email,
    },
    {
      key:      'plan',
      label:    'Forfait',
      type:     'text',
      sortable: true,
      muted:    true,
      value:    row => row.plan,
    },
    {
      key:      'expiration',
      label:    'Expiration',
      type:     'date',
      sortable: true,
      muted:    true,
      value:    row => row.expiration,
    },
    {
      key:          'status',
      label:        'Statut',
      type:         'badge',
      sortable:     true,
      width:        '160px',
      value:        row => row.status,
      badgeClassFn: row => BADGE_CLASSES[row.status],
      badgeIconFn:  row => BADGE_ICONS[row.status],
    },
  ];

  // ---- Données filtrées transmises au DataTable ----
  readonly filteredRows = computed<Member[]>(() => {
    const q   = this.search().toLowerCase().trim();
    const tab = this.activeTab();

    return ALL_MEMBERS.filter(m => {
      const matchTab =
        tab === 'Tous' ||
        (tab === 'Actifs'       && m.status === 'Actif') ||
        (tab === 'À renouveler' && m.status === 'À renouveler') ||
        (tab === 'Expirés'      && m.status === 'Expiré');

      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.plan.toLowerCase().includes(q);

      return matchTab && matchSearch;
    });
  });

  readonly total = computed(() => ALL_MEMBERS.length);

  // ---- FAB actions ----
  readonly fabActions: FabAction[] = [
    {
      id:       'add-member',
      label:    'Ajouter un adhérent',
      iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
    },
    {
      id:       'export',
      label:    'Exporter la liste',
      iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    },
    {
      id:       'import',
      label:    'Importer des adhérents',
      iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    },
  ];

  // ---- Handlers ----
  setTab(tab: FilterTab): void {
    this.activeTab.set(tab);
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  onRowClick(member: Member): void {
    console.log('Voir fiche :', member.name);
    // TODO: router.navigate(['/members', member.id])
  }

  onFabAction(action: FabAction): void {
    console.log('FAB action :', action.id);
    // TODO: ouvrir le formulaire selon action.id
  }
}
