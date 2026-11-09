import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Fab, FabAction } from '@shared/fab/fab';

export type MemberStatus = 'Actif' | 'Expire bientôt' | 'Impayé' | 'Expiré' | 'Gelé';
export type SortKey = 'name' | 'expiry';

export interface Member {
  id: string;
  name: string;
  status: MemberStatus;
  plan: string;
  coach: string;
  /** Échéance au format ISO (AAAA-MM-JJ) pour le tri */
  expiry: string;
  lastVisit: string;
  program: string;
  visits30d: number;
  phone: string;
  email: string;
}

const STATUS_TONES: Record<MemberStatus, string> = {
  'Actif': 'success',
  'Expire bientôt': 'warning',
  'Impayé': 'danger',
  'Expiré': 'danger',
  'Gelé': 'neutral',
};

export const STATUSES = Object.keys(STATUS_TONES) as MemberStatus[];
export const PLANS = ['Mensuel Essentiel', 'Mensuel Illimité', 'Trimestriel', 'Annuel'];
export const COACHES = ['Malik T.', 'Fatou B.', 'Hugo L.'];

/** Nombre total d'adhérents côté serveur (la liste n'en charge qu'une partie) */
const TOTAL_ON_SERVER = 412;

// ---- Données mockées (à remplacer par de vrais appels API) ----
const ALL_MEMBERS: Member[] = (
  [
    ['A-0231', 'Inès Benali', 'Expire bientôt', 'Mensuel Illimité', 'Malik T.', '2026-11-11', 'Aujourd’hui', 'Remise en forme, 12 semaines', 14],
    ['A-0187', 'Camille Roux', 'Impayé', 'Mensuel Illimité', 'Fatou B.', '2026-11-03', '05/11/2026', 'Prise de muscle, niveau 2', 9],
    ['A-0312', 'Awa Diallo', 'Actif', 'Trimestriel', 'Hugo L.', '2026-11-14', 'Aujourd’hui', 'Perte de poids, 8 semaines', 17],
    ['A-0098', 'Koffi Mensah', 'Expire bientôt', 'Mensuel Illimité', 'Malik T.', '2026-11-15', 'Aujourd’hui', 'Prise de muscle, niveau 3', 19],
    ['A-0276', 'Thomas Lefèvre', 'Actif', 'Annuel', 'Fatou B.', '2027-06-30', 'Aujourd’hui', 'Cardio et endurance', 12],
    ['A-0144', 'Yacine Haddad', 'Expiré', 'Mensuel Essentiel', 'Hugo L.', '2026-11-07', 'Aujourd’hui', 'Aucun programme', 6],
    ['A-0259', 'Léa Moreau', 'Gelé', 'Trimestriel', 'Fatou B.', '2027-01-20', '12/10/2026', 'Remise en forme, 12 semaines', 0],
    ['A-0203', 'Mamadou Sow', 'Actif', 'Mensuel Illimité', 'Malik T.', '2026-11-28', '19/10/2026', 'Prise de muscle, niveau 1', 2],
    ['A-0325', 'Sarah Nguyen', 'Actif', 'Mensuel Illimité', 'Hugo L.', '2026-12-02', 'Aujourd’hui', 'Cardio et endurance', 15],
    ['A-0118', 'Julien Petit', 'Expire bientôt', 'Mensuel Essentiel', 'Fatou B.', '2026-11-12', 'Aujourd’hui', 'Perte de poids, 8 semaines', 11],
  ] as const
).map(([id, name, status, plan, coach, expiry, lastVisit, program, visits30d]) => ({
  id, name, status, plan, coach, expiry, lastVisit, program, visits30d,
  phone: 'Non renseigné',
  email: 'Non renseigné',
}));

@Component({
  selector: 'app-members',
  imports: [FormsModule, RouterLink, Fab],
  templateUrl: './members.html',
  styleUrl:    './members.css',
})
export class Members {
  readonly statuses = STATUSES;
  readonly plans = PLANS;
  readonly coaches = COACHES;

  // ---- Filtres et tri ----
  readonly query = signal('');
  readonly statusFilter = signal('');
  readonly planFilter = signal('');
  readonly sortKey = signal<SortKey | null>(null);
  readonly sortDir = signal<1 | -1>(1);

  /** Fiche dépliée (id de l'adhérent) */
  readonly openId = signal<string | null>(ALL_MEMBERS[0].id);

  // ---- Ajout ----
  readonly adding = signal(false);
  readonly draft = { name: '', phone: '', email: '', plan: 'Mensuel Illimité', coach: COACHES[0] };
  private readonly added = signal<Member[]>([]);

  private readonly all = computed(() => [...this.added(), ...ALL_MEMBERS]);

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    const plan = this.planFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    const list = this.all().filter(
      m =>
        (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) &&
        (!status || m.status === status) &&
        (!plan || m.plan === plan),
    );
    if (!key) return list;
    return [...list].sort((a, b) => a[key].localeCompare(b[key], 'fr') * dir);
  });

  readonly totalCount = computed(() => TOTAL_ON_SERVER + this.added().length);

  // ---- FAB actions ----
  readonly fabActions: FabAction[] = [
    { id: 'add-member', label: 'Ajouter un adhérent', iconPath: 'M12 5v14M5 12h14' },
    { id: 'send-qr', label: 'Envoyer les QR codes', iconPath: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z' },
    { id: 'remind', label: 'Relancer la sélection', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
    { id: 'import', label: 'Importer un listing', iconPath: 'M12 21V9M7 14l5-5 5 5M4 3h16' },
  ];

  // ---- Handlers ----
  tone(status: MemberStatus): string {
    return STATUS_TONES[status];
  }

  formatDate(iso: string): string {
    return iso.split('-').reverse().join('/');
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update(d => (d === 1 ? -1 : 1));
    } else {
      this.sortKey.set(key);
      this.sortDir.set(1);
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 1 ? '↑' : '↓';
  }

  resetFilters(): void {
    this.query.set('');
    this.statusFilter.set('');
    this.planFilter.set('');
    this.sortKey.set(null);
    this.sortDir.set(1);
  }

  toggleRow(id: string): void {
    this.openId.update(cur => (cur === id ? null : id));
  }

  onFabAction(action: FabAction): void {
    if (action.id === 'add-member') {
      this.adding.set(true);
      return;
    }
    console.log('FAB action :', action.id);
    // TODO: brancher les autres actions sur les services
  }

  cancelAdd(): void {
    this.adding.set(false);
    this.draft.name = '';
    this.draft.phone = '';
    this.draft.email = '';
  }

  saveAdd(): void {
    const name = this.draft.name.trim();
    if (!name) return;
    const id = 'A-0' + (TOTAL_ON_SERVER + 1 + this.added().length);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    this.added.update(list => [
      {
        id,
        name,
        status: 'Actif',
        plan: this.draft.plan,
        coach: this.draft.coach,
        expiry: expiry.toISOString().slice(0, 10),
        lastVisit: 'Aucune',
        program: 'À attribuer',
        visits30d: 0,
        phone: this.draft.phone.trim() || 'Non renseigné',
        email: this.draft.email.trim() || 'Non renseigné',
      },
      ...list,
    ]);
    this.openId.set(id);
    this.cancelAdd();
    // TODO: POST /api/members
  }
}
