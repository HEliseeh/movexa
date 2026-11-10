import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '@core/notifications/toast.service';
import { Fab, FabAction } from '@shared/fab/fab';
import { MemberForm } from './member-form/member-form';
import { COACHES, formatIsoDate, PLANS, todayIso } from './members.constants';
import { MemberDto, MembersService, MemberStatusApi } from './members.service';

export type MemberStatus = 'Actif' | 'Expire bientôt' | 'Impayé' | 'Expiré' | 'Gelé';
export type SortKey = 'name' | 'expiry';

/** Une ligne du tableau, prête à afficher */
export interface Member {
  /** Identifiant technique (base de données) */
  id: number;
  /** Numéro affiché, ex. A-0042 */
  number: string;
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

/** Nombre de jours avant l'échéance à partir duquel un adhérent actif « expire bientôt » */
const EXPIRING_SOON_DAYS = 7;

const API_STATUS_LABELS: Record<MemberStatusApi, MemberStatus> = {
  ACTIVE: 'Actif',
  UNPAID: 'Impayé',
  EXPIRED: 'Expiré',
  FROZEN: 'Gelé',
};

function daysUntil(iso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(todayIso())) / 86_400_000);
}

/** Convertit la réponse de l'API en ligne affichable */
function toMember(dto: MemberDto): Member {
  let status = API_STATUS_LABELS[dto.status];
  if (dto.status === 'ACTIVE' && dto.expiryDate && daysUntil(dto.expiryDate) <= EXPIRING_SOON_DAYS) {
    status = 'Expire bientôt';
  }
  const lastVisit = !dto.lastVisitDate
    ? 'Aucune'
    : dto.lastVisitDate === todayIso()
      ? 'Aujourd’hui'
      : formatIsoDate(dto.lastVisitDate);

  return {
    id: dto.id,
    number: dto.memberNumber,
    name: `${dto.firstName} ${dto.lastName}`,
    status,
    plan: dto.plan ?? '—',
    coach: dto.coach ?? '—',
    expiry: dto.expiryDate ?? '',
    lastVisit,
    program: dto.program ?? 'Aucun programme',
    visits30d: dto.visitsLast30Days,
    phone: dto.phone ?? 'Non renseigné',
    email: dto.email ?? 'Non renseigné',
  };
}

@Component({
  selector: 'app-members',
  imports: [FormsModule, RouterLink, Fab, MemberForm],
  templateUrl: './members.html',
  styleUrl: './members.css',
})
export class Members implements OnInit {
  private readonly membersService = inject(MembersService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

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
  readonly openId = signal<number | null>(null);

  // ---- Données serveur ----
  /** Les DTO bruts sont conservés : le formulaire de modification en a besoin */
  private readonly loaded = signal<MemberDto[]>([]);
  private readonly totalOnServer = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  // ---- Pop-up formulaire ----
  /** undefined = fermé, null = création, MemberDto = modification */
  readonly editing = signal<MemberDto | null | undefined>(undefined);
  readonly formOpen = computed(() => this.editing() !== undefined);

  private readonly all = computed(() => this.loaded().map(toMember));

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    const plan = this.planFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    const list = this.all().filter(
      m =>
        (!q || m.name.toLowerCase().includes(q) || m.number.toLowerCase().includes(q)) &&
        (!status || m.status === status) &&
        (!plan || m.plan === plan),
    );
    if (!key) return list;
    return [...list].sort((a, b) => a[key].localeCompare(b[key], 'fr') * dir);
  });

  readonly totalCount = computed(() => this.totalOnServer());

  // ---- FAB actions ----
  readonly fabActions: FabAction[] = [
    { id: 'add-member', label: 'Ajouter un adhérent', iconPath: 'M12 5v14M5 12h14' },
    { id: 'send-qr', label: 'Envoyer les QR codes', iconPath: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z' },
    { id: 'remind', label: 'Relancer la sélection', iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
    { id: 'import', label: 'Importer un listing', iconPath: 'M12 21V9M7 14l5-5 5 5M4 3h16' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    // Pour l'instant on charge tout d'un coup et on filtre côté navigateur.
    // Avec des milliers de membres, il faudra paginer et filtrer côté serveur.
    this.membersService
      .list(0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ members, total }) => {
          this.loaded.set(members);
          this.totalOnServer.set(total);
          this.openId.set(members[0]?.id ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Impossible de charger les adhérents. Vérifiez que le backend est démarré.');
          this.loading.set(false);
        },
      });
  }

  // ---- Handlers liste ----
  tone(status: MemberStatus): string {
    return STATUS_TONES[status];
  }

  formatDate(iso: string): string {
    return formatIsoDate(iso);
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

  toggleRow(id: number): void {
    this.openId.update(cur => (cur === id ? null : id));
  }

  onFabAction(action: FabAction): void {
    if (action.id === 'add-member') {
      this.openCreate();
      return;
    }
    console.log('FAB action :', action.id);
    // TODO: brancher les autres actions sur les services
  }

  // ---- CRUD ----
  openCreate(): void {
    this.editing.set(null);
  }

  openEdit(id: number): void {
    const dto = this.loaded().find(m => m.id === id);
    if (dto) this.editing.set(dto);
  }

  closeForm(): void {
    this.editing.set(undefined);
  }

  /** Le formulaire a enregistré : on met la liste à jour sans tout recharger */
  onSaved({ member, created }: { member: MemberDto; created: boolean }): void {
    const name = `${member.firstName} ${member.lastName}`;
    if (created) {
      this.loaded.update(list => [member, ...list]);
      this.totalOnServer.update(n => n + 1);
      this.resetFilters(); // pour que le nouvel adhérent soit visible en haut de liste
      this.toast.success(`${name} a été ajouté(e) aux adhérents.`);
    } else {
      this.loaded.update(list => list.map(m => (m.id === member.id ? member : m)));
      this.toast.success(`Modifications enregistrées pour ${name}.`);
    }
    this.openId.set(member.id);
    this.closeForm();
  }

  onDeleted(member: MemberDto): void {
    this.loaded.update(list => list.filter(m => m.id !== member.id));
    this.totalOnServer.update(n => Math.max(0, n - 1));
    if (this.openId() === member.id) this.openId.set(null);
    this.toast.success(`${member.firstName} ${member.lastName} a été supprimé(e).`);
    this.closeForm();
  }
}
