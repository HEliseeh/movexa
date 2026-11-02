import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { CurrentUserStore } from './current-user.store';

export const roleGuard: CanActivateFn = route => {
  const store = inject(CurrentUserStore);
  const required = (route.data['roles'] as string[] | undefined) ?? [];

  return required.length === 0 || store.hasAnyRole(required)
    ? true
    : inject(Router).createUrlTree(['/forbidden']);
};