import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { roleGuard } from '@core/auth/role.guard';

/** Gérant de la salle. Le réceptionniste n'a pas accès aux chiffres ni aux paramètres. */
const MANAGER_ONLY = { roles: ['ROLE_ADMIN'], fallback: '/reception' };

export const routes: Routes = [
  // ---- Page publique ----
  {
    path: 'login',
    loadComponent: () => import('@features/auth/login/login').then(m => m.Login),
  },

  // ---- Zone authentifiée (layout avec menu) ----
  {
    path: '',
    loadComponent: () => import('./layouts/connected/connected-layout').then(m => m.ConnectedLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: MANAGER_ONLY,
        loadComponent: () => import('@features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'reception',
        loadComponent: () => import('@features/reception/reception').then(m => m.Reception),
      },
      {
        path: 'access',
        loadComponent: () => import('@features/access/access').then(m => m.Access),
      },
      {
        path: 'payments',
        loadComponent: () => import('@features/payments/payments').then(m => m.Payments),
      },
      {
        path: 'members',
        loadComponent: () => import('@features/members/members').then(m => m.Members),
      },
      {
        path: 'members/import',
        loadComponent: () => import('@features/members/member-import/member-import').then(m => m.MemberImport),
      },
      {
        path: 'members/:id',
        loadComponent: () => import('@features/members/member-detail/member-detail').then(m => m.MemberDetail),
      },
      {
        path: 'prospects',
        loadComponent: () => import('@features/prospects/prospects').then(m => m.Prospects),
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('@features/subscriptions/subscriptions').then(m => m.Subscriptions),
      },
      {
        path: 'reminders',
        loadComponent: () => import('@features/reminders/reminders').then(m => m.Reminders),
      },
      {
        path: 'receipts/:id',
        loadComponent: () => import('@features/payments/receipt/receipt').then(m => m.ReceiptPage),
      },
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: MANAGER_ONLY,
        loadComponent: () => import('@features/settings/settings').then(m => m.Settings),
      },
      {
        path: 'forbidden',
        loadComponent: () => import('@features/forbidden/forbidden').then(m => m.Forbidden),
      },

      // Le gérant arrive sur le tableau de bord, le réceptionniste est renvoyé vers l'accueil
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ---- Fallback global ----
  { path: '**', redirectTo: 'login' },
];
