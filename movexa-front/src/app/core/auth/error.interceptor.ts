import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CurrentUserStore } from './current-user.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const store = inject(CurrentUserStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isLoginCall = req.url.endsWith('/authenticate');

      // 401 sur le login = mauvais identifiants : le composant gère le message.
      // 401 ailleurs = token expiré ou invalide : on déconnecte.
      if (err.status === 401 && !isLoginCall) {
        auth.logout();
        store.clear();
        router.navigate(['/login']);
      }
      if (err.status === 403) {
        router.navigate(['/forbidden']);
      }
      return throwError(() => err);
    })
  );
};