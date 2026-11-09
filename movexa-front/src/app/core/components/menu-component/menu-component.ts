import { Component, inject, input, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuStep } from '@shared/models/Navigation.model';

// ---------------------------------------------------------------
// MenuComponent — entrée de nav récursive (item + sous-menus)
// Utilisé dans le menu latéral du ConnectedLayout.
// ---------------------------------------------------------------
@Component({
  selector: 'app-menu-component',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, MenuComponent],
  templateUrl: './menu-component.html',
  styleUrl:    './menu-component.scss',
  host: {
    '[class.group-start]': 'item().groupStart && depth() === 0',
  },
})
export class MenuComponent implements OnInit {
  private router = inject(Router);

  item  = input.required<MenuStep>();
  /** Profondeur dans l'arbre (0 = racine) */
  depth = input(0);

  /** Sous-menu ouvert / fermé */
  showChildren = signal(false);

  ngOnInit(): void {
    // Auto-ouvre si une route enfant est active au rechargement
    if (this.hasChildren) {
      const active = this.allChildRoutes(this.item()).some(r => this.router.url.startsWith(r));
      if (active) this.showChildren.set(true);
    }
  }

  get hasChildren(): boolean {
    return !!this.item().children?.length;
  }

  toggleChildren(): void {
    if (!this.item().disabled) this.showChildren.update(v => !v);
  }

  private allChildRoutes(step: MenuStep): string[] {
    if (!step.children?.length) return [step.route[0]];
    return step.children.flatMap(c => this.allChildRoutes(c));
  }
}
