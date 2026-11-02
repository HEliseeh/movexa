import {
  Component,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { MenuStep } from '@shared/models/Navigation.model';

// ---------------------------------------------------------------
// MenuComponent — entrée de nav récursive (item + sous-menus)
// Utilisé dans le MatSidenav du ConnectedLayout.
// ---------------------------------------------------------------
@Component({
  selector: 'app-menu-component',
  imports: [MatListItem, MatIcon, MatTooltip, MenuComponent],
  templateUrl: './menu-component.html',
  styleUrl:    './menu-component.scss',
})
export class MenuComponent implements OnInit {
  @Input() item!: MenuStep;
  /** Profondeur dans l'arbre (0 = racine) */
  @Input() depth = 0;
  /** Sidebar expansée ou réduite (passé par le parent) */
  @Input() expanded = true;

  /** Sous-menu ouvert / fermé */
  showChildren = signal(false);

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Auto-ouvre si une route enfant est active au rechargement
    if (this.hasChildren) {
      const active = this.allChildRoutes(this.item).some(r =>
        this.router.url.startsWith(r)
      );
      if (active) this.showChildren.set(true);
    }
  }

  get hasChildren(): boolean {
    return !!this.item.children?.length;
  }

  get isActive(): boolean {
    if (this.hasChildren) return false;
    return this.router.url.startsWith(this.item.route[0]);
  }

  toggle(event: Event): void {
    event.stopPropagation();
    if (this.item.disabled) return;

    if (this.hasChildren) {
      this.showChildren.update(v => !v);
    } else {
      this.router.navigate(this.item.route);
    }
  }

  private allChildRoutes(step: MenuStep): string[] {
    if (!step.children?.length) return [step.route[0]];
    return step.children.flatMap(c => this.allChildRoutes(c));
  }
}
