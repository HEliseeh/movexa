import {
  Component,
  HostListener,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';

/** Définition d'une action passée au FAB */
export interface FabAction {
  /** Identifiant unique utilisé pour distinguer l'action dans le handler parent */
  id: string;
  /** Libellé affiché dans la liste */
  label: string;
  /**
   * SVG inline réduit à la balise <path> (viewBox 0 0 24 24 supposé).
   * Si absent, une puce simple est affichée.
   */
  iconPath?: string;
  /** Désactive l'entrée sans la masquer */
  disabled?: boolean;
}

@Component({
  selector: 'app-fab',
  imports: [],
  templateUrl: './fab.html',
  styleUrl: './fab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fab {
  /** Actions injectées par le composant parent */
  actions = input<FabAction[]>([]);

  /** Émis quand l'utilisateur clique sur une action */
  actionTriggered = output<FabAction>();

  /** État ouvert / fermé du menu */
  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** Ferme sur Escape */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  /** Ferme en cliquant en dehors */
  @HostListener('document:pointerdown', ['$event'])
  onOutsideClick(event: PointerEvent): void {
    const clickedInside = (event.target as Element).closest('app-fab');
    if (!clickedInside) this.close();
  }

  handleAction(action: FabAction, event: MouseEvent): void {
    event.stopPropagation();
    if (action.disabled) return;
    this.actionTriggered.emit(action);
    this.close();
  }
}
