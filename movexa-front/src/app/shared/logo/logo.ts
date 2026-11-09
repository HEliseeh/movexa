import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Logo MOVEXA (monogramme + mot-symbole) en SVG.
 * Prévu pour fond sombre : lettres blanches, accents sable.
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  /** Largeur en px ; la hauteur suit le ratio du logo */
  width = input(168);

  readonly height = computed(() => Math.round((this.width() * 139) / 820));
}
