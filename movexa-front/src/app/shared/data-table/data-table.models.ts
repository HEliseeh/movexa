/**
 * Définition d'une colonne du DataTable générique Movexa.
 *
 * T = type de la ligne de données (ex. Member, Payment, …).
 * Utiliser `any` comme Row dans le composant Angular pour contourner
 * la limitation des templates génériques. Le typage fort reste côté parent.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRow = any;

/** Variante d'affichage de la cellule */
export type ColumnType =
  | 'text'          // texte simple
  | 'avatar-text'   // avatar initiales + ligne principale + sous-ligne
  | 'badge'         // badge coloré
  | 'date'          // texte tabular-nums
  | 'actions';      // réservé (non rendu, filtré automatiquement)

/** Direction de tri */
export type SortDir = 'asc' | 'desc' | null;

export interface ColumnDef<T = AnyRow> {
  /** Identifiant unique de la colonne */
  key: string;

  /** Label affiché dans l'en-tête */
  label: string;

  /** Type de rendu de la cellule */
  type: ColumnType;

  /** La colonne est-elle triable ? (défaut : false) */
  sortable?: boolean;

  /** Largeur CSS fixe, ex. '120px', '10%' */
  width?: string;

  /** Texte atténué (color-text-muted) pour les colonnes secondaires */
  muted?: boolean;

  // ---- Accesseurs ----

  /** Valeur principale affichée */
  value: (row: T) => string | number | null | undefined;

  /** Valeur utilisée pour le tri si différente de value */
  sortValue?: (row: T) => string | number | null | undefined;

  // ---- Options spécifiques aux types ----

  /** avatar-text : initiales (2 lettres) */
  avatarFn?: (row: T) => string;

  /** avatar-text : sous-ligne (email, rôle…) */
  subValueFn?: (row: T) => string;

  /** badge : classe CSS BEM à appliquer, ex. 'badge-actif' */
  badgeClassFn?: (row: T) => string;

  /** badge : SVG path d="" de l'icône (optionnel) */
  badgeIconFn?: (row: T) => string | undefined;
}

/** Config de pagination */
export interface PaginationConfig {
  pageSize: number;
}
