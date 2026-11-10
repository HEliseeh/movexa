import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  // Le token part vers le gateway (/api) et vers les microservices qu'il route (/services)
  const isBackendCall =
    req.url.startsWith(environment.apiUrl) || req.url.startsWith(environment.servicesUrl);

  return token && isBackendCall
    ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    : next(req);
};
