import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Coach, CoachPayload } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { ToastService } from '@core/notifications/toast.service';
import { FilterOption, matchesAny, MultiFilter } from '@shared/column-filter/column-filter';
import { ConfirmDialog } from '@shared/confirm-dialog/confirm-dialog';
import { apiError, initials, whatsappLink } from '@shared/format';

/** Fiche en cours d'édition (pop-up) */
interface CoachDraft extends CoachPayload {
  id?: number;
  memberCount: number;
}

const EMPTY_DRAFT: CoachDraft = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
  active: true,
  disciplines: [],
  memberCount: 0,
};

/**
 * Équipe des coachs : qui ils sont, ce qu'ils enseignent, combien de membres ils suivent.
 * Tout le monde consulte ; seul le gérant crée, modifie ou supprime (règle appliquée par le serveur).
 */
@Component({
  selector: 'app-coaches',
  imports: [FormsModule, MultiFilter, ConfirmDialog],
  templateUrl: './coaches.html',
  styleUrl: './coaches.css',
})
export class Coaches implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CurrentUserStore);

  readonly initials = initials;
  readonly whatsappLink = whatsappLink;

  readonly coaches = signal<Coach[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Disciplines connues (suggestions du formulaire) */
  readonly knownDisciplines = signal<string[]>([]);

  // ---- Filtres ----
  readonly query = signal('');
  readonly phoneQuery = signal('');
  readonly disciplineFilter = signal<string[]>([]);
  readonly statusFilter = signal<string[]>(['active']);
  readonly statusOptions: FilterOption[] = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
  ];

  readonly disciplineOptions = computed<FilterOption[]>(() => {
    const all = new Set<string>();
    this.coaches().forEach(c => c.disciplines.forEach(d => all.add(d)));
    return [...all].sort((a, b) => a.localeCompare(b, 'fr')).map(d => ({ value: d, label: d }));
  });

  /** Disciplines et nombre de coachs actifs qui les enseignent (bandeau du haut) */
  readonly disciplineSummary = computed(() => {
    const counts = new Map<string, number>();
    this.coaches()
      .filter(c => c.active)
      .forEach(c => c.disciplines.forEach(d => counts.set(d, (counts.get(d) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  });

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const phone = this.phoneQuery().replace(/\D/g, '');
    const disciplines = this.disciplineFilter();
    const statuses = this.statusFilter();
    return this.coaches().filter(
      c =>
        (!q || this.fullName(c).toLowerCase().includes(q)) &&
        (!phone || (c.phone ?? '').replace(/\D/g, '').includes(phone)) &&
        (disciplines.length === 0 || c.disciplines.some(d => disciplines.includes(d))) &&
        matchesAny(statuses, c.active ? 'active' : 'inactive'),
    );
  });

  readonly hasFilters = computed(
    () => !!this.query().trim() || !!this.phoneQuery().trim() || this.disciplineFilter().length > 0 || this.statusFilter().join() !== 'active',
  );

  // ---- Pop-up ----
  readonly draft = signal<CoachDraft | null>(null);
  readonly disciplineInput = signal('');
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly confirmDelete = signal(false);
  readonly deleting = signal(false);

  /** Suggestions pas encore ajoutées à la fiche */
  readonly suggestions = computed(() => {
    const taken = new Set((this.draft()?.disciplines ?? []).map(d => d.toLowerCase()));
    return this.knownDisciplines().filter(d => !taken.has(d.toLowerCase()));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .coaches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.coaches.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Impossible de charger les coachs. Vérifiez que le backend est démarré.');
          this.loading.set(false);
        },
      });
    this.api.coachDisciplines().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: d => this.knownDisciplines.set(d), error: () => {} });
  }

  fullName(c: { firstName: string; lastName: string | null }): string {
    return `${c.firstName} ${c.lastName ?? ''}`.trim();
  }

  resetFilters(): void {
    this.query.set('');
    this.phoneQuery.set('');
    this.disciplineFilter.set([]);
    this.statusFilter.set(['active']);
  }

  filterOn(discipline: string): void {
    this.disciplineFilter.set([discipline]);
  }

  // ---- Création / modification ----

  edit(c?: Coach): void {
    if (!this.store.isManager()) return;
    this.formError.set(null);
    this.disciplineInput.set('');
    this.confirmDelete.set(false);
    this.draft.set(
      c
        ? {
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
            notes: c.notes ?? '',
            active: c.active,
            disciplines: [...c.disciplines],
            memberCount: c.memberCount ?? 0,
          }
        : { ...EMPTY_DRAFT, disciplines: [] },
    );
  }

  close(): void {
    if (!this.saving()) this.draft.set(null);
  }

  patch(p: Partial<CoachDraft>): void {
    this.draft.update(d => (d ? { ...d, ...p } : d));
  }

  /** Ajoute la ou les disciplines saisies (séparées par des virgules) */
  addDiscipline(value = this.disciplineInput()): void {
    const parts = value
      .split(',')
      .map(v => v.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (!parts.length) return;
    this.draft.update(d => {
      if (!d) return d;
      const list = [...d.disciplines];
      for (const p of parts) {
        if (!list.some(x => x.toLowerCase() === p.toLowerCase())) list.push(p.charAt(0).toUpperCase() + p.slice(1));
      }
      return { ...d, disciplines: list.slice(0, 15) };
    });
    this.disciplineInput.set('');
  }

  removeDiscipline(d: string): void {
    this.draft.update(x => (x ? { ...x, disciplines: x.disciplines.filter(v => v !== d) } : x));
  }

  onDisciplineKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.addDiscipline();
    } else if (e.key === 'Backspace' && !this.disciplineInput()) {
      const list = this.draft()?.disciplines ?? [];
      if (list.length) this.removeDiscipline(list[list.length - 1]);
    }
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    if (this.disciplineInput().trim()) this.addDiscipline();
    const current = this.draft()!;
    if (!current.firstName.trim()) {
      this.formError.set('Le prénom du coach est obligatoire.');
      return;
    }
    const email = (current.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.formError.set('Adresse e-mail invalide.');
      return;
    }
    const payload: CoachPayload = {
      firstName: current.firstName.trim(),
      lastName: current.lastName?.trim() || null,
      phone: current.phone?.trim() || null,
      email: email || null,
      notes: current.notes?.trim() || null,
      active: current.active,
      disciplines: current.disciplines,
    };
    this.saving.set(true);
    this.formError.set(null);
    const req = current.id ? this.api.updateCoach(current.id, payload) : this.api.createCoach(payload);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: saved => {
        this.saving.set(false);
        this.draft.set(null);
        this.toast.success(current.id ? `Fiche de ${this.fullName(saved)} enregistrée.` : `${this.fullName(saved)} a rejoint l’équipe.`);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(apiError(err, 'Enregistrement impossible.'));
      },
    });
  }

  // ---- Suppression ----

  deleteMessage(): string {
    const d = this.draft();
    const n = d?.memberCount ?? 0;
    const who = d ? this.fullName({ firstName: d.firstName, lastName: d.lastName }) : '';
    return (
      `La fiche de ${who} sera supprimée définitivement.` +
      (n ? ` Les ${n} membre(s) qu’il ou elle suit n’auront plus de coach (ils ne sont pas supprimés).` : '') +
      ' Pour garder l’historique, vous pouvez plutôt le marquer « inactif ».'
    );
  }

  remove(): void {
    const d = this.draft();
    if (!d?.id) return;
    this.deleting.set(true);
    this.api
      .deleteCoach(d.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.confirmDelete.set(false);
          this.draft.set(null);
          this.toast.success('Coach supprimé.');
          this.load();
        },
        error: err => {
          this.deleting.set(false);
          this.confirmDelete.set(false);
          this.formError.set(apiError(err, 'Suppression impossible.'));
        },
      });
  }
}
