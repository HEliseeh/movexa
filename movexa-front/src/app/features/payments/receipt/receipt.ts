import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Receipt } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { dayHour, fcfa, frDate, METHOD_LABELS, whatsappLink } from '@shared/format';

/**
 * Reçu de paiement (maquette « Reçu envoyé au membre ») : imprimable, et partageable par WhatsApp.
 * Dans le MVP le membre ne se connecte pas : le reçu lui est envoyé en texte (ou en capture).
 */
@Component({
  selector: 'app-receipt',
  imports: [RouterLink],
  templateUrl: './receipt.html',
  styleUrl: './receipt.css',
})
export class ReceiptPage implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route :id */
  readonly id = input<string>();

  readonly receipt = signal<Receipt | null>(null);
  readonly error = signal<string | null>(null);
  readonly fcfa = fcfa;
  readonly frDate = frDate;
  readonly dayHour = dayHour;
  readonly methodLabels = METHOD_LABELS;

  ngOnInit(): void {
    this.api
      .receipt(Number(this.id()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: r => this.receipt.set(r), error: () => this.error.set('Reçu introuvable.') });
  }

  print(): void {
    window.print();
  }

  whatsapp(r: Receipt): string {
    const text =
      `Reçu ${r.number} · ${r.gymName ?? ''}\n` +
      `${r.memberName} (N° ${r.memberNumber})\n` +
      `${r.planName} : ${fcfa(r.amount)} payé (${METHOD_LABELS[r.method]}) le ${dayHour(r.paidAt)}\n` +
      `Valable du ${frDate(r.validFrom)} au ${frDate(r.validTo)}.\n${r.footer ?? 'Merci !'}`;
    return whatsappLink(r.memberPhone, text);
  }
}
