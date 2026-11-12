import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ImportResult, ImportRow } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { apiError, frDate } from '@shared/format';

/** Champ MOVEXA associé à une colonne du fichier */
type Field = 'fullName' | 'firstName' | 'lastName' | 'phone' | 'planName' | 'endDate' | 'ignore';

interface ColumnMap {
  index: number;
  header: string;
  example: string;
  field: Field;
}

const FIELD_LABELS: Record<Field, string> = {
  fullName: 'Nom et prénom (une colonne)',
  firstName: 'Prénom',
  lastName: 'Nom',
  phone: 'Téléphone',
  planName: 'Formule',
  endDate: 'Date de fin',
  ignore: 'Ignorer cette colonne',
};

/**
 * Import d'une liste existante (module 1) en 4 étapes : fichier → colonnes → vérification → import.
 * Le fichier est lu dans le navigateur (CSV) ; le serveur vérifie les doublons puis importe.
 * Excel : « Fichier > Enregistrer sous > CSV » (la lecture directe des .xlsx demanderait une
 * bibliothèque de plus, à ajouter si les salles le demandent).
 */
@Component({
  selector: 'app-member-import',
  imports: [FormsModule, RouterLink],
  templateUrl: './member-import.html',
  styleUrl: './member-import.css',
})
export class MemberImport {
  private readonly api = inject(MovexaApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps = ['Fichier', 'Colonnes', 'Vérification', 'Import'];
  readonly fieldLabels = FIELD_LABELS;
  readonly fields = Object.keys(FIELD_LABELS) as Field[];
  readonly frDate = frDate;

  readonly step = signal(1);
  readonly fileName = signal('');
  readonly rows = signal<string[][]>([]);
  readonly columns = signal<ColumnMap[]>([]);
  readonly updateExisting = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly check = signal<ImportResult | null>(null);
  readonly result = signal<ImportResult | null>(null);

  readonly dataRows = computed(() => this.rows().slice(1).filter(r => r.some(c => c.trim())));

  readonly mappingError = computed(() => {
    const used = this.columns().map(c => c.field);
    if (!used.includes('phone')) return 'Indiquez la colonne du téléphone.';
    if (!used.includes('fullName') && !used.includes('lastName')) return 'Indiquez la colonne du nom.';
    return null;
  });

  readonly toImport = computed(() => {
    const c = this.check();
    if (!c) return 0;
    return c.ready + (this.updateExisting() ? c.lines.filter(l => l.status === 'DUPLICATE' && l.message.startsWith('Doublon : déjà')).length : 0);
  });

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set(null);
    if (/\.xlsx?$/i.test(file.name)) {
      this.error.set('Fichier Excel : ouvrez-le puis « Enregistrer sous » au format CSV, et choisissez ce fichier CSV.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''));
      if (rows.length < 2) {
        this.error.set('Le fichier semble vide : il faut une ligne d’en-tête puis au moins une ligne de membre.');
        return;
      }
      this.fileName.set(file.name);
      this.rows.set(rows);
      this.columns.set(rows[0].map((header, index) => ({ index, header: header || `Colonne ${index + 1}`, example: rows[1][index] ?? '', field: guessField(header) })));
      this.step.set(2);
    };
    reader.readAsText(file, 'utf-8');
  }

  setField(index: number, field: Field): void {
    this.columns.update(cols => cols.map(c => (c.index === index ? { ...c, field } : c)));
  }

  /** Étape 2 → 3 : vérification par le serveur, sans rien enregistrer */
  verify(): void {
    if (this.mappingError()) return;
    this.send(true);
  }

  /** Étape 3 → 4 : import réel */
  doImport(): void {
    this.send(false);
  }

  restart(): void {
    this.step.set(1);
    this.rows.set([]);
    this.check.set(null);
    this.result.set(null);
    this.fileName.set('');
  }

  statusLabel(status: string): string {
    return (
      { READY: 'Prête', DUPLICATE: 'Doublon', MISSING_PHONE: 'Téléphone manquant', INVALID: 'À corriger', IMPORTED: 'Importée', UPDATED: 'Mise à jour', SKIPPED: 'Ignorée' } as Record<string, string>
    )[status] ?? status;
  }

  tone(status: string): string {
    return status === 'READY' || status === 'IMPORTED' || status === 'UPDATED' ? 'success' : status === 'DUPLICATE' || status === 'SKIPPED' ? 'warning' : 'danger';
  }

  private send(dryRun: boolean): void {
    this.busy.set(true);
    this.error.set(null);
    this.api
      .importMembers(this.buildRows(), this.updateExisting(), dryRun)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.busy.set(false);
          if (dryRun) {
            this.check.set(res);
            this.step.set(3);
          } else {
            this.result.set(res);
            this.step.set(4);
          }
        },
        error: err => {
          this.busy.set(false);
          this.error.set(apiError(err, 'Le serveur n’a pas pu traiter le fichier.'));
        },
      });
  }

  private buildRows(): ImportRow[] {
    const cols = this.columns();
    const value = (row: string[], field: Field) => {
      const col = cols.find(c => c.field === field);
      return col ? (row[col.index] ?? '').trim() || null : null;
    };
    return this.dataRows().map((row, i) => ({
      line: i + 2,
      fullName: value(row, 'fullName'),
      firstName: value(row, 'firstName'),
      lastName: value(row, 'lastName'),
      phone: value(row, 'phone'),
      planName: value(row, 'planName'),
      endDate: parseDate(value(row, 'endDate')),
    }));
  }
}

/** Devine le champ d'une colonne d'après son titre */
function guessField(header: string): Field {
  const h = header
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (/(tel|phone|numero|portable|mobile|whatsapp)/.test(h)) return 'phone';
  if (/(nom.*prenom|prenom.*nom|nom complet|membre|adherent|client)/.test(h)) return 'fullName';
  if (/prenom/.test(h)) return 'firstName';
  if (/^nom|name/.test(h)) return 'lastName';
  if (/(formule|abonnement|forfait|offre)/.test(h)) return 'planName';
  if (/(expir|fin|echeance|jusqu)/.test(h)) return 'endDate';
  return 'ignore';
}

/** JJ/MM/AAAA, JJ-MM-AAAA ou AAAA-MM-JJ → AAAA-MM-JJ ; sinon null */
function parseDate(value: string | null): string | null {
  if (!value) return null;
  let m = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Lecture CSV simple : séparateur « ; » ou « , » (détecté sur la première ligne), guillemets
 * doubles pour les valeurs contenant un séparateur. Suffisant pour un export Excel ou Google Sheets.
 */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
