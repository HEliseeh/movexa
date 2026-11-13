import { Component, computed, Directive, ElementRef, inject, input, model, OnDestroy, signal } from '@angular/core';

/** Une valeur proposée dans un filtre à choix multiple */
export interface FilterOption {
  value: string;
  label: string;
}

/** Plage de dates AAAA-MM-JJ ; une borne vide = pas de limite */
export interface DateRange {
  from: string;
  to: string;
}

export const EMPTY_RANGE: DateRange = { from: '', to: '' };

/** Vrai si aucune valeur n'est cochée (filtre inactif) ou si la valeur fait partie des cochées */
export function matchesAny(selected: string[], value: string | null | undefined): boolean {
  return selected.length === 0 || selected.includes(value ?? '');
}

/** Vrai si la plage est vide, ou si la date (AAAA-MM-JJ…) est dedans, bornes comprises */
export function inRange(range: DateRange, date: string | null | undefined): boolean {
  if (!range.from && !range.to) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  return (!range.from || d >= range.from) && (!range.to || d <= range.to);
}

export function isRangeActive(range: DateRange): boolean {
  return !!(range.from || range.to);
}

/**
 * Base commune : un bouton d'en-tête de colonne qui ouvre un petit panneau.
 * Le panneau est en position fixe (calculée depuis le bouton) pour ne pas être coupé par les
 * tableaux à défilement horizontal ; il se ferme au clic extérieur, sur Échap ou au défilement.
 */
@Directive()
abstract class FilterPopover implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly open = signal(false);
  readonly pos = signal({ top: 0, left: 0 });

  private readonly onOutside = (e: Event) => {
    if (!this.host.nativeElement.contains(e.target as Node)) this.close();
  };
  private readonly onScroll = (e: Event) => {
    if (!this.host.nativeElement.contains(e.target as Node)) this.close();
  };
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  toggle(button: HTMLElement): void {
    if (this.open()) {
      this.close();
      return;
    }
    const r = button.getBoundingClientRect();
    const width = 260;
    this.pos.set({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) });
    this.open.set(true);
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('scroll', this.onScroll, true);
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.closeFn);
  }

  private readonly closeFn = () => this.close();

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('scroll', this.onScroll, true);
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.closeFn);
  }

  ngOnDestroy(): void {
    this.close();
  }
}

/**
 * Filtre à choix multiple d'une colonne : `<app-multi-filter label="Statut" [options]="…" [(selected)]="…" />`.
 * Rien de coché = pas de filtre.
 */
@Component({
  selector: 'app-multi-filter',
  template: `
    <button #btn type="button" class="cf-btn" [class.cf-btn--active]="selected().length > 0" [attr.aria-expanded]="open()" (click)="toggle(btn)">
      <span class="cf-btn-label">{{ summary() }}</span><span class="cf-caret" aria-hidden="true">▾</span>
    </button>
    @if (open()) {
      <div class="cf-panel" role="dialog" [attr.aria-label]="'Filtrer : ' + label()" [style.top.px]="pos().top" [style.left.px]="pos().left">
        @for (o of options(); track o.value) {
          <label class="cf-option">
            <input type="checkbox" [checked]="selected().includes(o.value)" (change)="flip(o.value)" />
            <span>{{ o.label }}</span>
          </label>
        }
        <div class="cf-actions">
          <button type="button" class="link-btn" (click)="all()">Tout cocher</button>
          <button type="button" class="link-btn" (click)="selected.set([])">Effacer</button>
        </div>
      </div>
    }
  `,
  styleUrl: './column-filter.css',
})
export class MultiFilter extends FilterPopover {
  readonly label = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  readonly selected = model<string[]>([]);

  readonly summary = computed(() => {
    const sel = this.selected();
    if (sel.length === 0) return this.label();
    if (sel.length === 1) return this.options().find(o => o.value === sel[0])?.label ?? this.label();
    return `${this.label()} (${sel.length})`;
  });

  flip(value: string): void {
    this.selected.update(sel => (sel.includes(value) ? sel.filter(v => v !== value) : [...sel, value]));
  }

  all(): void {
    this.selected.set(this.options().map(o => o.value));
  }
}

/**
 * Filtre par plage de dates d'une colonne : `<app-date-filter label="Fin" [(range)]="…" />`.
 * Raccourcis courants + saisie libre « du / au ».
 */
@Component({
  selector: 'app-date-filter',
  template: `
    <button #btn type="button" class="cf-btn" [class.cf-btn--active]="active()" [attr.aria-expanded]="open()" (click)="toggle(btn)">
      <span class="cf-btn-label">{{ summary() }}</span><span class="cf-caret" aria-hidden="true">▾</span>
    </button>
    @if (open()) {
      <div class="cf-panel" role="dialog" [attr.aria-label]="'Filtrer : ' + label()" [style.top.px]="pos().top" [style.left.px]="pos().left">
        <div class="cf-presets">
          @for (p of presets(); track p.label) {
            <button type="button" class="cf-preset" (click)="range.set(p.range)">{{ p.label }}</button>
          }
        </div>
        <label class="cf-date">Du <input type="date" class="input-line" [value]="range().from" (change)="setFrom($any($event.target).value)" /></label>
        <label class="cf-date">Au <input type="date" class="input-line" [value]="range().to" (change)="setTo($any($event.target).value)" /></label>
        <div class="cf-actions">
          <button type="button" class="link-btn" (click)="range.set(empty)">Effacer</button>
          <button type="button" class="link-btn" (click)="close()">Fermer</button>
        </div>
      </div>
    }
  `,
  styleUrl: './column-filter.css',
})
export class DateFilter extends FilterPopover {
  readonly label = input.required<string>();
  /** 'past' : raccourcis tournés vers le passé (visites, inscriptions) ; 'future' : vers l'avenir (échéances) */
  readonly direction = input<'past' | 'future'>('past');
  readonly range = model<DateRange>(EMPTY_RANGE);
  readonly empty = EMPTY_RANGE;

  readonly active = computed(() => isRangeActive(this.range()));

  readonly summary = computed(() => {
    const { from, to } = this.range();
    const fr = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
    if (from && to) return from === to ? `${this.label()} : ${fr(from)}` : `${this.label()} : ${fr(from)} → ${fr(to)}`;
    if (from) return `${this.label()} ≥ ${fr(from)}`;
    if (to) return `${this.label()} ≤ ${fr(to)}`;
    return this.label();
  });

  readonly presets = computed<{ label: string; range: DateRange }[]>(() => {
    const today = iso(new Date());
    const shift = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return iso(d);
    };
    return this.direction() === 'future'
      ? [
          { label: 'Déjà passée', range: { from: '', to: shift(-1) } },
          { label: 'Aujourd’hui', range: { from: today, to: today } },
          { label: '7 prochains jours', range: { from: today, to: shift(7) } },
          { label: '30 prochains jours', range: { from: today, to: shift(30) } },
        ]
      : [
          { label: 'Aujourd’hui', range: { from: today, to: today } },
          { label: '7 derniers jours', range: { from: shift(-6), to: today } },
          { label: '30 derniers jours', range: { from: shift(-29), to: today } },
          { label: 'Plus de 30 jours', range: { from: '', to: shift(-30) } },
        ];
  });

  setFrom(v: string): void {
    this.range.update(r => ({ ...r, from: v }));
  }

  setTo(v: string): void {
    this.range.update(r => ({ ...r, to: v }));
  }
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
