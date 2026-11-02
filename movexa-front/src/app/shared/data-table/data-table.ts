import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { ColumnDef, PaginationConfig, SortDir } from './data-table.models';

const DEFAULT_PAGE_SIZE = 10;

/**
 * DataTable générique Movexa.
 *
 * Angular strict templates ne supporte pas les composants vraiment génériques
 * (pas de <app-data-table<Member> …> possible dans les templates HTML).
 * On utilise donc `unknown` pour le type de ligne, et les parents castent
 * leurs outputs via `$any()` ou via des wrappers typés.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

@Component({
  selector: 'app-data-table',
  imports: [NgClass],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable {
  // ---- Inputs ----

  /** Définition des colonnes */
  columns = input<ColumnDef<Row>[]>([]);

  /** Données à afficher (filtrées/recherchées côté parent) */
  rows = input<Row[]>([]);

  /** Config pagination */
  paginationConfig = input<PaginationConfig>({ pageSize: DEFAULT_PAGE_SIZE });

  /** Message affiché quand rows est vide */
  emptyMessage = input('Aucune donnée à afficher.');

  /** Affiche la colonne chevron */
  showRowAction = input(true);

  // ---- Outputs ----

  /** Clic sur une ligne */
  rowClick = output<Row>();

  /** Clic sur le bouton chevron */
  rowActionClick = output<Row>();

  // ---- État interne ----

  readonly sortKey = signal<string | null>(null);
  readonly sortDir = signal<SortDir>(null);
  readonly page    = signal(1);

  // ---- Computed ----

  private get pageSize(): number {
    return this.paginationConfig().pageSize ?? DEFAULT_PAGE_SIZE;
  }

  readonly sorted = computed(() => {
    const key  = this.sortKey();
    const dir  = this.sortDir();
    const data = [...this.rows()];

    if (!key || !dir) return data;

    const col = this.columns().find(c => c.key === key);
    if (!col) return data;

    return data.sort((a: Row, b: Row) => {
      const fn = col.sortValue ?? col.value;
      const va = fn(a) ?? '';
      const vb = fn(b) ?? '';
      const cmp = String(va).localeCompare(String(vb), 'fr', { numeric: true });
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  readonly total     = computed(() => this.sorted().length);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly pageStart = computed(() => Math.min((this.page() - 1) * this.pageSize + 1, this.total()));
  readonly pageEnd   = computed(() => Math.min(this.page() * this.pageSize, this.total()));

  readonly visibleRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.sorted().slice(start, start + this.pageSize);
  });

  readonly dataCols = computed(() =>
    this.columns().filter(c => c.type !== 'actions')
  );

  // ---- Tri ----

  toggleSort(key: string): void {
    if (this.sortKey() !== key) {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    } else if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else {
      this.sortKey.set(null);
      this.sortDir.set(null);
    }
    this.page.set(1);
  }

  getSortDir(key: string): SortDir {
    return this.sortKey() === key ? this.sortDir() : null;
  }

  // ---- Pagination ----

  prevPage(): void {
    if (this.page() > 1) this.page.update(p => p - 1);
  }

  nextPage(): void {
    if (this.page() < this.pageCount()) this.page.update(p => p + 1);
  }

  // ---- Événements ----

  onRowClick(row: Row): void {
    this.rowClick.emit(row);
  }

  onRowAction(row: Row, event: MouseEvent): void {
    event.stopPropagation();
    this.rowActionClick.emit(row);
  }

  // ---- Helper template ----

  cellValue(col: ColumnDef<Row>, row: Row): string {
    return String(col.value(row) ?? '');
  }
}
