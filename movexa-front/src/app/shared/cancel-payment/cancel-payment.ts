import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Payment } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { apiError, dayHour, fcfa, METHOD_LABELS } from '@shared/format';

/**
 * Annulation d'un paiement (taille S) : le motif est obligatoire, rien n'est supprimé.
 * Réservée au gérant (le backend le vérifie ; le bouton n'est affiché qu'au gérant).
 */
@Component({
  selector: 'app-cancel-payment',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (keydown.escape)="cancelled.emit()">
      <div class="modal modal--s" role="alertdialog" aria-modal="true" aria-labelledby="cp-title">
        <header class="modal-head">
          <div class="modal-head-text">
            <h2 id="cp-title" class="modal-title">Annuler ce paiement ?</h2>
            <p class="modal-subtitle">{{ summary() }}</p>
          </div>
        </header>
        <div class="modal-body">
          @if (error(); as e) {
            <div class="alert alert--error" role="alert">{{ e }}</div>
          }
          <div class="field">
            <label for="cp-reason">Motif de l’annulation</label>
            <textarea id="cp-reason" class="textarea-box" rows="2" maxlength="300" placeholder="Ex. doublon de saisie, erreur de montant…"
                      [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
            <span class="help">Le paiement reste visible, barré, avec ce motif. Si un abonnement avait été prolongé, la prolongation est retirée.</span>
          </div>
        </div>
        <footer class="modal-foot">
          <button type="button" class="btn btn-outline" [disabled]="busy()" (click)="cancelled.emit()">Garder le paiement</button>
          <button type="button" class="btn btn-danger" [disabled]="busy() || !reason().trim()" (click)="confirm()">
            {{ busy() ? 'Annulation…' : 'Annuler le paiement' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: `
    .btn-danger { background: var(--color-danger-strong); color: #fff; }
    .btn-danger:disabled { background: #d9a9a5; }
  `,
})
export class CancelPayment {
  private readonly api = inject(MovexaApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly payment = input.required<Payment>();
  readonly done = output<Payment>();
  readonly cancelled = output<void>();

  readonly reason = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  summary(): string {
    const p = this.payment();
    return `${p.memberName}, ${fcfa(p.amount)} en ${METHOD_LABELS[p.method].toLowerCase()} le ${dayHour(p.createdAt)}.`;
  }

  confirm(): void {
    this.busy.set(true);
    this.api
      .cancelPayment(this.payment().id, this.reason().trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => this.done.emit(p),
        error: err => {
          this.busy.set(false);
          this.error.set(apiError(err, 'L’annulation a échoué.'));
        },
      });
  }
}
