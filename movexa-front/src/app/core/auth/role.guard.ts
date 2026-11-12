import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { CurrentUserStore } from './current-user.store';

/**
 * Vérifie les rôles déclarés dans la route : data: { roles: ['ROLE_ADMIN'], fallback: '/reception' }.
 * Sans le rôle : redirection vers « fallback » si elle est donnée, sinon vers /forbidden.
 * Rappel : ce n'est que du confort d'affichage, le vrai contrôle est fait par le backend.
 */
export const roleGuard: CanActivateFn = route => {
  const store = inject(CurrentUserStore);
  const required = (route.data['roles'] as string[] | undefined) ?? [];
  const fallback = (route.data['fallback'] as string | undefined) ?? '/forbidden';

  return required.length === 0 || store.hasAnyRole(required)
    ? true
    : inject(Router).createUrlTree([fallback]);
};
