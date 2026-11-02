import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { CurrentUserStore } from './current-user.store';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const store = inject(CurrentUserStore);
  const router = inject(Router);
  const toLogin = router.createUrlTree(['/login']);

  if (!auth.isLoggedIn()) return toLogin;

  return store.load().pipe(
    map(() => true),
    catchError(() => of(toLogin))
  );
};