import { Component, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CurrentUserStore } from '@core/auth/current-user.store';

@Component({
  selector: 'app-topbar',
  imports: [MatToolbar, MatIcon, MatButtonModule, MatTooltip],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private auth   = inject(AuthService);
  private store  = inject(CurrentUserStore);
  private router = inject(Router);

  /** Émis quand l'utilisateur clique sur le bouton hamburger */
  menuToggle = output<void>();

  readonly user = this.store.user;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const first = u.firstName?.charAt(0) ?? '';
    const last  = u.lastName?.charAt(0)  ?? '';
    return (first + last).toUpperCase() || u.login.slice(0, 2).toUpperCase();
  }

  get displayName(): string {
    const u = this.user();
    if (!u) return '';
    return u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.login;
  }

  logout(): void {
    this.auth.logout();
    this.store.clear();
    this.router.navigate(['/login']);
  }
}
