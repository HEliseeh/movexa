import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

/**
 * Pop-up de confirmation (taille S, 440 px) pour les actions irréversibles.
 * Le parent l'affiche avec un @if et réagit à (confirmed) / (cancelled).
 *
 * <app-confirm-dialog title="Supprimer X ?" message="…" confirmLabel="Supprimer définitivement"
 *                     [busy]="deleting()" (confirmed)="…" (cancelled)="…" />
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Confirmer');
  readonly cancelLabel = input('Annuler');
  /** Rouge pour une action destructive (par défaut) */
  readonly danger = input(true);
  /** Désactive les boutons pendant l'appel serveur */
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');

  constructor() {
    // Focus sur « Annuler » : le choix le moins risqué si l'utilisateur appuie sur Entrée par réflexe
    afterNextRender(() => this.cancelBtn()?.nativeElement.focus());
  }

  onEscape(): void {
    if (!this.busy()) this.cancelled.emit();
  }
}
