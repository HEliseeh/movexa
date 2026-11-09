import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { Logo } from '@shared/logo/logo';

/** Libellés affichés sous le nom de l'utilisateur, par ordre de priorité */
const ROLE_LABELS: [string, string][] = [
  ['ROLE_ADMIN', 'Administrateur'],
  ['ROLE_MANAGER', 'Gérant'],
  ['ROLE_COACH', 'Coach'],
  ['ROLE_RECEPTION', 'Réception'],
  ['ROLE_USER', 'Utilisateur'],
];

@Component({
  selector: 'app-topbar',
  imports: [Logo],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private auth   = inject(AuthService);
  private store  = inject(CurrentUserStore);
  private router = inject(Router);

  /** Menu latéral ouvert (affichage mobile uniquement) */
  menuOpen = input(false);

  /** Émis quand l'utilisateur clique sur le bouton menu (mobile) */
  menuToggle = output<void>();

  readonly version = 'MVP 0.1';

  readonly user = this.store.user;

  readonly displayName = computed(() => {
    const u = this.user();
    if (!u) return '';
    return u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.login;
  });

  readonly roleLabel = computed(() => {
    const roles = this.store.roles();
    return ROLE_LABELS.find(([role]) => roles.includes(role))?.[1] ?? '';
  });

  logout(): void {
    this.auth.logout();
    this.store.clear();
    this.router.navigate(['/login']);
  }
}
