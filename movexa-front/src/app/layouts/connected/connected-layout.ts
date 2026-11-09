import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MenuComponent } from '@core/components/menu-component/menu-component';
import { Topbar } from '@core/components/topbar/topbar';
import { MENU_ITEMS, MenuStep } from '@shared/models/Navigation.model';

@Component({
  selector: 'app-connected-layout',
  imports: [RouterOutlet, MenuComponent, Topbar],
  templateUrl: './connected-layout.html',
  styleUrl:    './connected-layout.scss',
})
export class ConnectedLayout {
  /** Menu latéral ouvert sur petit écran (sur grand écran il est toujours visible) */
  readonly menuOpen = signal(false);

  /** Items de navigation déclarés dans Navigation.model.ts */
  readonly menuItems: MenuStep[] = MENU_ITEMS;

  constructor() {
    // Referme le menu mobile après chaque navigation
    inject(Router)
      .events.pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }
}
