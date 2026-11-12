import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { GymSettings, MemberLite, Payment, PaymentMethod, Plan } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import {
  addDays,
  apiError,
  fcfa,
  frDate,
  METHOD_LABELS,
  smsLink,
  STATE_TONES,
  stateText,
  todayIso,
  whatsappLink,
} from '@shared/format';

/**
 * Pop-up « Encaisser / Renouveler » (taille M), utilisée partout où l'on encaisse :
 * fiche membre, pointage (écran rouge ou orange), encaissements, accueil, abonnements.
 * Sans membre fourni, elle commence par une recherche.
 *
 * Règle de prolongation (affichée avant de valider) : à partir de la fin actuelle si
 * l'abonnement est encore actif, sinon à partir d'aujourd'hui.
 */
@Component({
  selector: 'app-pay-dialog',
  imports: [FormsModule, RouterLink],
  templateUrl: './pay-dialog.html',
  styleUrl: './pay-dialog.css',
})
export class PayDialog implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly destroyRef = inject(DestroyRef);

  /** Membre à encaisser ; null = choisir dans la pop-up */
  readonly member = input<MemberLite | null>(null);
  readonly title = input('Encaisser');

  /** Paiement enregistré (émis à la fermeture après succès) */
  readonly paid = output<Payment>();
  readonly closed = output<void>();

  readonly plans = signal<Plan[]>([]);
  readonly settings = signal<GymSettings | null>(null);

  readonly selected = signal<MemberLite | null>(null);
  readonly query = signal('');
  readonly results = signal<MemberLite[]>([]);

  readonly planId = signal<number | null>(null);
  readonly method = signal<PaymentMethod>('CASH');
  readonly amount = signal<number | null>(null);
  readonly reference = signal('');

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<Payment | null>(null);

  readonly fcfa = fcfa;
  readonly frDate = frDate;
  readonly methodLabels = METHOD_LABELS;
  readonly tones = STATE_TONES;
  readonly stateText = stateText;

  readonly plan = computed(() => this.plans().find(p => p.id === this.planId()) ?? null);

  /** Moyens proposés selon les paramètres de la salle (le lien exige un compte marchand) */
  readonly methods = computed(() => {
    const s = this.settings();
    const all: { id: PaymentMethod; enabled: boolean }[] = [
      { id: 'CASH', enabled: s?.cashEnabled ?? true },
      { id: 'MTN_MOMO', enabled: s?.mtnEnabled ?? true },
      { id: 'MOOV_MONEY', enabled: s?.moovEnabled ?? true },
      { id: 'PAYMENT_LINK', enabled: !!s?.paymentLinkBaseUrl },
    ];
    return all.map(m => ({ ...m, label: METHOD_LABELS[m.id] }));
  });

  /** Explication de la nouvelle période, avant validation */
  readonly periodText = computed(() => {
    const plan = this.plan();
    const m = this.selected();
    if (!plan || !m) return '';
    const today = todayIso();
    const stillActive = !!m.endDate && m.endDate >= today;
    const start = stillActive ? m.endDate! : today;
    if (plan.durationDays === 0) return 'Accès pour aujourd’hui seulement.';
    const end = addDays(start, plan.durationDays);
    return stillActive
      ? `Nouvelle fin : ${frDate(end)}. Prolongé depuis la fin actuelle (${frDate(m.endDate)}), car l’abonnement est encore actif.`
      : `Nouvelle fin : ${frDate(end)}. Démarre aujourd’hui, car l’abonnement est expiré ou inexistant.`;
  });

  readonly submitLabel = computed(() => {
    if (this.saving()) return 'Enregistrement…';
    const a = this.amount() ?? this.plan()?.price ?? 0;
    return this.method() === 'PAYMENT_LINK' ? `Envoyer le lien de ${fcfa(a)}` : `Encaisser ${fcfa(a)}`;
  });

  constructor() {
    // Recherche de membre (quand la pop-up est ouverte sans membre)
    toObservable(this.query)
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(q => (q.trim().length >= 2 ? this.api.searchMembers(q.trim(), 6) : of([]))),
        takeUntilDestroyed(),
      )
      .subscribe(list => this.results.set(list));
  }

  ngOnInit(): void {
    this.selected.set(this.member());
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => {
      this.settings.set(s);
      const first = this.methods().find(m => m.enabled);
      if (first) this.method.set(first.id);
    });
    this.api.plans().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(plans => {
      this.plans.set(plans);
      // Par défaut : la formule actuelle du membre, sinon le mensuel, sinon la première
      const current = plans.find(p => p.name === this.selected()?.planName);
      const monthly = plans.find(p => p.durationDays === 30);
      this.pickPlan((current ?? monthly ?? plans[0])?.id ?? null);
    });
  }

  pickMember(m: MemberLite): void {
    this.selected.set(m);
    this.query.set('');
    const current = this.plans().find(p => p.name === m.planName);
    if (current) this.pickPlan(current.id);
  }

  pickPlan(id: number | null): void {
    this.planId.set(id);
    this.amount.set(this.plans().find(p => p.id === id)?.price ?? null);
  }

  submit(): void {
    const m = this.selected();
    const plan = this.plan();
    if (!m || !plan) {
      this.error.set(!m ? 'Choisissez un membre.' : 'Choisissez une formule.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .pay({ memberId: m.id, planId: plan.id, method: this.method(), amount: this.amount(), reference: this.reference().trim() || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => {
          this.saving.set(false);
          this.result.set(p);
        },
        error: err => {
          this.saving.set(false);
          this.error.set(apiError(err, 'Le paiement n’a pas pu être enregistré.'));
        },
      });
  }

  /** Message WhatsApp : reçu, ou lien de paiement */
  whatsapp(p: Payment): string {
    return whatsappLink(p.memberPhone, this.shareText(p));
  }

  sms(p: Payment): string {
    return smsLink(p.memberPhone, this.shareText(p));
  }

  private shareText(p: Payment): string {
    const gym = this.settings()?.name ?? 'la salle';
    if (p.status === 'PENDING') {
      return `Bonjour ${p.memberName.split(' ')[0]}, voici votre lien pour payer votre abonnement ${p.planName} à ${gym} (${fcfa(p.amount)}) :\n${p.paymentUrl ?? ''}`;
    }
    return (
      `Reçu ${p.receiptNumber} · ${gym}\n` +
      `${p.memberName} · ${p.planName}\n` +
      `${fcfa(p.amount)} payé (${METHOD_LABELS[p.method]})\n` +
      `Valable du ${frDate(p.validFrom)} au ${frDate(p.validTo)}.\nMerci !`
    );
  }

  close(): void {
    const p = this.result();
    if (p) this.paid.emit(p);
    else this.closed.emit();
  }
}
