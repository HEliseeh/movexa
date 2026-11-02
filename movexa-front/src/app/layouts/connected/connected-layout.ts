import { Component, inject, OnInit, signal } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatNavList } from '@angular/material/list';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { MenuComponent } from '@core/components/menu-component/menu-component';
import { Topbar } from '@core/components/topbar/topbar';
import { MENU_ITEMS, MenuStep } from '@shared/models/Navigation.model';

@Component({
  selector: 'app-connected-layout',
  imports: [
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    MatNavList,
    MenuComponent,
    Topbar,
  ],
  templateUrl: './connected-layout.html',
  styleUrl:    './connected-layout.scss',
})
export class ConnectedLayout implements OnInit {
  private auth  = inject(AuthService);
  private store = inject(CurrentUserStore);

  /** true = sidebar expansée (250 px), false = réduite (64 px) */
  isExpanded = signal(true);

  /** Items de navigation déclarés dans Navigation.model.ts */
  readonly menuItems: MenuStep[] = MENU_ITEMS;

  /** Hauteur de la topbar — sert à décaler le sidenav */
  readonly TOPBAR_HEIGHT = 56;

  ngOnInit(): void {
    this.isExpanded.set(window.matchMedia('(min-width: 1200px)').matches);
  }

  toggle(): void {
    this.isExpanded.update(v => !v);
  }
}
