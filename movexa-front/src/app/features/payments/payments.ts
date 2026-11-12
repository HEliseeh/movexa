import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CashDay, Payment } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { ToastService } from '@core/notifications/toast.service';
import { CancelPayment } from '@shared/cancel-payment/cancel-payment';
import { apiError, dayHour, fcfa, frDate, hour, METHOD_LABELS, todayIso, whatsappLink } from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';

type Tab = 'pays' | 'links' | 'close';

/**
 * Encaissements (module 3) : paiements du jour, liens de paiement en ligne, clôture de caisse.
 * Toute erreur se corrige par une annulation tracée (motif obligatoire, gérant uniquement).
 */
@Component({
  selector: 'app-payments',
  imports: [FormsModule, RouterLink, PayDialog, CancelPayment],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class Payments implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CurrentUserStore);

  readonly fcfa = fcfa;
  readonly hour = hour;
  readonly dayHour = dayHour;
  readonly frDate = frDate;
  readonly methodLabels = METHOD_LABELS;
  readonly today = todayIso();

  readonly tab = signal<Tab>('pays');
  readonly date = signal(todayIso());
  readonly payments = signal<Payment[]>([]);
  readonly links = signal<Payment[]>([]);
  readonly cash = signal<CashDay | null>(null);
  readonly loading = signal(true);

  readonly paying = signal(false);
  readonly cancelling = signal<Payment | null>(null);

  // ---- Clôture : montants comptés ----
  readonly countedCash = signal<number | null>(null);
  readonly countedMtn = signal<number | null>(null);
  readonly countedMoov = signal<number | null>(null);
  readonly reason = signal('');
  readonly closing = signal(false);
  readonly closeError = signal<string | null>(null);

  readonly dayTotal = computed(() => this.payments().filter(p => p.status === 'PAID').reduce((t, p) => t + p.amount, 0));

  readonly closeRows = computed(() => {
    const c = this.cash();
    if (!c) return [];
    const row = (label: string, hint: string, expected: number, counted: number | null) => ({
      label,
      hint,
      expected,
      gap: counted === null ? null : counted - expected,
    });
    return [
      row('Espèces', 'Comptez les billets et pièces', c.expectedCash, this.countedCash()),
      row('MTN MoMo', 'Relevé du téléphone de la salle', c.expectedMtn, this.countedMtn()),
      row('Moov Money', 'Relevé du téléphone de la salle', c.expectedMoov, this.countedMoov()),
    ];
  });

  readonly totalGap = computed(() => this.closeRows().reduce((t, r) => t + (r.gap ?? 0), 0));
  readonly allCounted = computed(() => this.countedCash() !== null && this.countedMtn() !== null && this.countedMoov() !== null);
  readonly hasGap = computed(() => this.closeRows().some(r => r.gap !== null && r.gap !== 0));

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (tab) this.tab.set(tab);
    if (this.route.snapshot.queryParamMap.get('pay')) this.paying.set(true);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.payments(this.date()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        this.payments.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.paymentLinks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => this.links.set(list));
    this.api.cashDay(this.date()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(c => this.cash.set(c));
  }

  changeDate(value: string): void {
    this.date.set(value || this.today);
    this.load();
  }

  onPaid(p: Payment): void {
    this.paying.set(false);
    this.toast.success(p.status === 'PENDING' ? `Lien de paiement créé pour ${p.memberName}.` : `${fcfa(p.amount)} encaissés, reçu ${p.receiptNumber}.`);
    this.load();
  }

  onCancelled(p: Payment): void {
    this.cancelling.set(null);
    this.toast.success(`Paiement de ${p.memberName} annulé.`);
    this.load();
  }

  resendLink(p: Payment): string {
    return whatsappLink(p.memberPhone, `Bonjour ${p.memberName.split(' ')[0]}, voici le lien pour payer votre abonnement ${p.planName} (${fcfa(p.amount)}) :\n${p.paymentUrl ?? ''}`);
  }

  confirmLink(p: Payment): void {
    this.api.confirmPayment(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Paiement confirmé, abonnement prolongé.');
        this.load();
      },
      error: err => this.toast.error(apiError(err)),
    });
  }

  linkStatus(p: Payment): string {
    if (p.status === 'PAID') return 'Payé, confirmé';
    if (p.status === 'CANCELLED') return 'Annulé';
    return 'En attente';
  }

  closeCash(): void {
    const c = this.cash();
    if (!c || !this.allCounted()) return;
    this.closing.set(true);
    this.closeError.set(null);
    this.api
      .closeCash({ date: c.date, countedCash: this.countedCash()!, countedMtn: this.countedMtn()!, countedMoov: this.countedMoov()!, reason: this.reason().trim() || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closing.set(false);
          this.toast.success('Caisse clôturée.');
          this.load();
        },
        error: err => {
          this.closing.set(false);
          this.closeError.set(apiError(err, 'La clôture a échoué.'));
        },
      });
  }
}
