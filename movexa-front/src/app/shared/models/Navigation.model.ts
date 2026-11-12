export interface MenuStep {
  id: string;
  label: string;
  /** Tracé SVG (attribut d="", viewBox 0 0 24 24, icône au trait) */
  iconPath: string;
  route: string[];
  /** Sous-entrées optionnelles */
  children?: MenuStep[];
  /** Fonctionnalité annoncée mais non ouverte */
  disabled?: boolean;
  /** Trace un séparateur au-dessus de l'entrée (début de groupe) */
  groupStart?: boolean;
  /** Rôles qui voient l'entrée (aucun = tout le monde) */
  roles?: string[];
}

export const MANAGER = 'ROLE_ADMIN';

// ---------------------------------------------------------------
// Items de navigation de l'application Movexa (ordre de la maquette)
// Le réceptionniste ne voit ni le tableau de bord ni les paramètres.
// ---------------------------------------------------------------
export const MENU_ITEMS: MenuStep[] = [
  {
    id:       'dashboard',
    label:    'Tableau de bord',
    iconPath: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
    route:    ['/dashboard'],
    roles:    [MANAGER],
  },
  {
    id:       'reception',
    label:    'Accueil',
    iconPath: 'M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6',
    route:    ['/reception'],
  },
  {
    id:         'access',
    label:      'Pointage',
    iconPath:   'M3 8V4a1 1 0 0 1 1-1h4M16 3h4a1 1 0 0 1 1 1v4M21 16v4a1 1 0 0 1-1 1h-4M8 21H4a1 1 0 0 1-1-1v-4M8 8h3v3H8zM14 8h2v2h-2zM8 14h2v2H8zM13 13h3v3h-3z',
    route:      ['/access'],
    groupStart: true,
  },
  {
    id:       'payments',
    label:    'Encaissements',
    iconPath: 'M2 7h20v12H2zM2 11h20M6 15h4M16 3l-4 4-4-4',
    route:    ['/payments'],
  },
  {
    id:         'members',
    label:      'Membres',
    iconPath:   'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    route:      ['/members'],
    groupStart: true,
  },
  {
    id:       'prospects',
    label:    'Prospects',
    iconPath: 'M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
    route:    ['/prospects'],
  },
  {
    id:       'subscriptions',
    label:    'Abonnements',
    iconPath: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 14h3v3H8z',
    route:    ['/subscriptions'],
  },
  {
    id:       'reminders',
    label:    'Relances',
    iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    route:    ['/reminders'],
  },
  {
    id:         'settings',
    label:      'Paramètres',
    iconPath:   'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    route:      ['/settings'],
    groupStart: true,
    roles:      [MANAGER],
  },
];
