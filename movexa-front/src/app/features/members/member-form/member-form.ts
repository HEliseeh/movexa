import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ConfirmDialog } from '@shared/confirm-dialog/confirm-dialog';
import { startWith } from 'rxjs';
import { COACHES, formatIsoDate, PLANS, todayIso } from '../members.constants';
import { MemberDto, MemberPayload, MembersService } from '../members.service';

// ---- Validateurs (mêmes règles que le backend, qui reste la référence) ----

/** Refuse un champ composé uniquement d'espaces */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && !control.value.trim() ? { required: true } : null;
}

/** Téléphone : chiffres, espaces, points, tirets, + au début ; au moins 8 chiffres */
function phone(control: AbstractControl<string>): ValidationErrors | null {
  const v = control.value?.trim();
  if (!v) return null;
  if (!/^\+?[0-9][0-9 .-]{6,18}[0-9]$/.test(v)) return { phone: true };
  return v.replace(/\D/g, '').length < 8 ? { phone: true } : null;
}

function email(control: AbstractControl<string>): ValidationErrors | null {
  const v = control.value?.trim();
  return v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? { email: true } : null;
}

function notFuture(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value > todayIso() ? { future: true } : null;
}

/** Message affiché sous chaque champ, par code d'erreur */
const MESSAGES: Record<string, Record<string, string>> = {
  firstName: { required: 'Indiquez le prénom.', maxlength: '100 caractères maximum.' },
  lastName: { required: 'Indiquez le nom.', maxlength: '100 caractères maximum.' },
  phone: { required: 'Indiquez un numéro de téléphone.', phone: 'Ce numéro semble incomplet ou invalide.' },
  email: { email: 'Cette adresse e-mail n’est pas valide.', taken: 'Cette adresse e-mail est déjà utilisée par un autre adhérent.' },
  birthDate: { future: 'La date de naissance ne peut pas être dans le futur.' },
  plan: { required: 'Choisissez une formule.' },
  subscriptionStartDate: { required: 'Indiquez la date de début.' },
  notes: { maxlength: '300 caractères maximum.' },
};

const PLAN_MONTHS: Record<string, number> = { 'Mensuel Essentiel': 1, 'Mensuel Illimité': 1, Trimestriel: 3, Annuel: 12 };

/**
 * Pop-up « Ajouter / Modifier un adhérent » (taille L, 760 px).
 * - member = null  → création
 * - member = dto   → modification (avec suppression possible)
 * Le composant appelle lui-même l'API et prévient le parent du résultat.
 */
@Component({
  selector: 'app-member-form',
  imports: [ReactiveFormsModule, ConfirmDialog],
  templateUrl: './member-form.html',
  styleUrl: './member-form.css',
})
export class MemberForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MembersService);
  private readonly destroyRef = inject(DestroyRef);

  /** null = création, sinon le membre à modifier */
  readonly member = input<MemberDto | null>(null);

  readonly saved = output<{ member: MemberDto; created: boolean }>();
  readonly deleted = output<MemberDto>();
  readonly closed = output<void>();

  readonly plans = PLANS;
  readonly coaches = COACHES;
  readonly today = todayIso();

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    phone: ['', [Validators.required, phone]],
    email: ['', [email, Validators.maxLength(254)]],
    birthDate: ['', [notFuture]],
    plan: ['', [Validators.required]],
    subscriptionStartDate: [todayIso(), [Validators.required]],
    coach: [''],
    autoRenew: [true],
    notes: ['', [Validators.maxLength(300)]],
  });

  /** Valeur du formulaire en signal, pour les calculs d'affichage (initiales, compteur…) */
  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), {
    initialValue: this.form.value,
  });

  /** Les erreurs ne s'affichent qu'après un premier essai d'enregistrement (maquette) */
  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);

  readonly isEdit = computed(() => this.member() !== null);

  readonly initials = computed(() => {
    const v = this.value();
    return ((v.firstName?.trim()[0] ?? '') + (v.lastName?.trim()[0] ?? '')).toUpperCase();
  });

  readonly fullName = computed(() => {
    const v = this.value();
    return `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim();
  });

  readonly notesCount = computed(() => `${this.value().notes?.length ?? 0} / 300`);

  readonly autoRenewText = computed(() =>
    this.value().autoRenew
      ? 'Un rappel est envoyé la veille du prélèvement.'
      : 'Un rappel est envoyé 7 jours avant l’échéance.',
  );

  /** Aperçu de l'échéance (le serveur fait le calcul officiel) */
  readonly expiryPreview = computed(() => {
    const { plan, subscriptionStartDate } = this.value();
    const months = plan ? PLAN_MONTHS[plan] : undefined;
    if (!months || !subscriptionStartDate) return null;
    const [y, m, d] = subscriptionStartDate.split('-').map(Number);
    const end = new Date(y, m - 1 + months, d);
    return `Échéance prévue le ${end.toLocaleDateString('fr-FR')}.`;
  });

  readonly subtitle = computed(() => {
    const m = this.member();
    if (!m) return 'Les champs marqués * sont obligatoires.';
    return `N° ${m.memberNumber} · inscrit(e) le ${formatIsoDate(m.joinDate)} · les champs marqués * sont obligatoires`;
  });

  private readonly firstInput = viewChild<ElementRef<HTMLInputElement>>('firstInput');

  constructor() {
    afterNextRender(() => this.firstInput()?.nativeElement.focus());
  }

  ngOnInit(): void {
    const m = this.member();
    if (m) {
      this.form.setValue({
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone ?? '',
        email: m.email ?? '',
        birthDate: m.birthDate ?? '',
        plan: m.plan ?? '',
        subscriptionStartDate: m.subscriptionStartDate,
        coach: m.coach ?? '',
        autoRenew: m.autoRenew,
        notes: m.notes ?? '',
      });
    }
  }

  // ---- Affichage des erreurs ----
  // Des méthodes (et non des computed) : une erreur posée par le serveur (setErrors)
  // ne modifie pas la valeur du formulaire, un computed ne se recalculerait donc pas.

  /** Message d'erreur du champ, ou null (rien avant le premier essai d'enregistrement) */
  error(name: string): string | null {
    const control = this.form.get(name);
    if (!this.submitted() || !control?.errors) return null;
    const code = Object.keys(control.errors)[0];
    return control.errors[code]?.message ?? MESSAGES[name]?.[code] ?? 'Valeur invalide.';
  }

  /** Texte du bandeau d'erreurs (null = pas de bandeau) */
  errorSummary(): string | null {
    const n = this.submitted() ? Object.values(this.form.controls).filter(c => c.invalid).length : 0;
    if (n > 0) return n === 1 ? '1 champ à corriger avant d’enregistrer.' : `${n} champs à corriger avant d’enregistrer.`;
    return this.serverError();
  }

  // ---- Actions ----

  toggleAutoRenew(): void {
    const c = this.form.controls.autoRenew;
    c.setValue(!c.value);
  }

  close(): void {
    if (!this.saving() && !this.deleting()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) return;

    this.saving.set(true);
    const m = this.member();
    const request = m ? this.api.update(m.id, this.toPayload(m)) : this.api.create(this.toPayload(null));

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: saved => {
        this.saving.set(false);
        this.saved.emit({ member: saved, created: !m });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.applyServerErrors(err);
      },
    });
  }

  askDelete(): void {
    this.confirmingDelete.set(true);
  }

  confirmDelete(): void {
    const m = this.member();
    if (!m) return;
    this.deleting.set(true);
    this.api
      .delete(m.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.confirmingDelete.set(false);
          this.deleted.emit(m);
        },
        error: () => {
          this.deleting.set(false);
          this.confirmingDelete.set(false);
          this.serverError.set('La suppression a échoué. Réessayez dans un instant.');
        },
      });
  }

  // ---- Conversion formulaire → API ----

  private toPayload(existing: MemberDto | null): MemberPayload {
    const v = this.form.getRawValue();
    const orNull = (s: string) => (s.trim() ? s.trim() : null);
    return {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      phone: v.phone.trim(),
      email: orNull(v.email),
      birthDate: v.birthDate || null,
      plan: v.plan,
      subscriptionStartDate: v.subscriptionStartDate,
      coach: orNull(v.coach),
      autoRenew: v.autoRenew,
      notes: orNull(v.notes),
      // Champs absents du formulaire : on renvoie leur valeur actuelle pour ne pas les effacer
      gender: existing?.gender ?? null,
      program: existing?.program ?? null,
      status: existing?.status,
    };
  }

  /** Traduit la réponse d'erreur du backend en erreurs sur les champs ou en bandeau */
  private applyServerErrors(err: HttpErrorResponse): void {
    const body = err.error ?? {};
    if (err.status === 400 && body.message === 'error.emailexists') {
      this.form.controls.email.setErrors({ taken: true });
      return;
    }
    if (err.status === 400 && Array.isArray(body.fieldErrors) && body.fieldErrors.length) {
      for (const fe of body.fieldErrors as { field: string; message: string }[]) {
        const control = this.form.get(fe.field);
        if (control) control.setErrors({ server: { message: fe.message } });
      }
      return;
    }
    this.serverError.set(
      err.status === 0
        ? 'Le serveur ne répond pas. Vérifiez votre connexion et réessayez.'
        : 'L’enregistrement a échoué. Réessayez dans un instant.',
    );
  }
}
