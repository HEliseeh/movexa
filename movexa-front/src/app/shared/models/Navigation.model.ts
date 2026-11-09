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
}

// ---------------------------------------------------------------
// Items de navigation de l'application Movexa
// ---------------------------------------------------------------
export const MENU_ITEMS: MenuStep[] = [
  {
    id:       'dashboard',
    label:    'Tableau de bord',
    iconPath: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
    route:    ['/dashboard'],
  },
  {
    id:         'reception',
    label:      'Accueil',
    iconPath:   'M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6',
    route:      ['/reception'],
    groupStart: true,
  },
  {
    id:       'access',
    label:    "Contrôle d'accès",
    iconPath: 'M3 8V4a1 1 0 0 1 1-1h4M16 3h4a1 1 0 0 1 1 1v4M21 16v4a1 1 0 0 1-1 1h-4M8 21H4a1 1 0 0 1-1-1v-4M8 8h3v3H8zM14 8h2v2h-2zM8 14h2v2H8zM13 13h3v3h-3z',
    route:    ['/access'],
  },
  {
    id:         'members',
    label:      'Adhérents',
    iconPath:   'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    route:      ['/members'],
    groupStart: true,
  },
  {
    id:       'subscriptions',
    label:    'Abonnements',
    iconPath: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M2 10h20M6 15h4',
    route:    ['/subscriptions'],
  },
  {
    id:       'planning',
    label:    'Cours et planning',
    iconPath: 'M8 3v4M16 3v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2',
    route:    ['/planning'],
  },
  {
    id:         'settings',
    label:      'Paramètres',
    iconPath:   'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    route:      ['/settings'],
    groupStart: true,
  },
];
