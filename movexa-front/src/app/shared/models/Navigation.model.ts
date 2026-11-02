export interface MenuStep {
  id: string;
  label: string;
  /** Nom d'icône Material Symbols (ligature) */
  icon: string;
  route: string[];
  /** Sous-entrées optionnelles */
  children?: MenuStep[];
  /** Fonctionnalité annoncée mais non ouverte */
  disabled?: boolean;
}

// ---------------------------------------------------------------
// Items de navigation de l'application Movexa
// ---------------------------------------------------------------
export const MENU_ITEMS: MenuStep[] = [
  {
    id:    'dashboard',
    label: 'Tableau de bord',
    icon:  'dashboard',
    route: ['/dashboard'],
  },
  {
    id:    'members',
    label: 'Adhérents',
    icon:  'group',
    route: ['/members'],
  },
  {
    id:    'subscriptions',
    label: 'Abonnements',
    icon:  'credit_card',
    route: ['/subscriptions'],
  },
  {
    id:    'planning',
    label: 'Cours & planning',
    icon:  'calendar_month',
    route: ['/planning'],
  },
  {
    id:    'access',
    label: "Contrôle d'accès",
    icon:  'lock',
    route: ['/access'],
  },
  {
    id:    'settings',
    label: 'Paramètres',
    icon:  'settings',
    route: ['/settings'],
  },
];
