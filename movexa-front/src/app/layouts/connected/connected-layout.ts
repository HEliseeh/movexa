import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { MenuComponent } from '@core/components/menu-component/menu-component';
import { Topbar } from '@core/components/topbar/topbar';
import { MENU_ITEMS } from '@shared/models/Navigation.model';
import { Toast } from '@shared/toast/toast';

@Component({
  selector: 'app-connected-layout',
  imports: [RouterOutlet, MenuComponent, Topbar, Toast],
  templateUrl: './connected-layout.html',
  styleUrl:    './connected-layout.scss',
})
export class ConnectedLayout {
  private readonly store = inject(CurrentUserStore);

  /** Menu latéral ouvert sur petit écran (sur grand écran il est toujours visible) */
  readonly menuOpen = signal(false);

  /** Entrées visibles pour le rôle de l'utilisateur (le réceptionniste n'a ni chiffres ni paramètres) */
  readonly menuItems = computed(() => MENU_ITEMS.filter(item => !item.roles || this.store.hasAnyRole(item.roles)));

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
