import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

export const routes: Routes = [
  // ---- Page publique ----
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/login/login').then(m => m.Login),
  },

  // ---- Zone authentifiée (layout avec sidebar) ----
  {
    path: '',
    loadComponent: () =>
      import('./layouts/connected/connected-layout').then(m => m.ConnectedLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('@features/members/members').then(m => m.Members),
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('@features/subscriptions/subscriptions').then(m => m.Subscriptions),
      },
      {
        path: 'planning',
        loadComponent: () =>
          import('@features/planning/planning').then(m => m.Planning),
      },
      {
        path: 'access',
        loadComponent: () =>
          import('@features/access/access').then(m => m.Access),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('@features/settings/settings').then(m => m.Settings),
      },

      // Redirection par défaut de la zone connectée
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ---- Fallback global ----
  { path: '**', redirectTo: 'login' },
];
