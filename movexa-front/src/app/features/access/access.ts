import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export type ResultFilter = 'all' | 'ok' | 'ko';

export interface AccessLog {
  time: string;
  name: string;
  plan: string;
  method: 'QR' | 'Manuel';
  result: string;
  allowed: boolean;
}

/** Résultat d'un scan affiché dans le panneau de gauche */
export interface ScanResult {
  allowed: boolean;
  title: string;
  text: string;
}

interface DemoPerson extends ScanResult {
  name: string;
  plan: string;
  result: string;
}

// ---- Données mockées (à remplacer par le flux du lecteur QR) ----
const DEMO: DemoPerson[] = [
  { name: 'Awa Diallo', plan: 'Trimestriel', allowed: true, result: 'Autorisé', title: 'Accès autorisé', text: 'Awa Diallo, abonnement valable jusqu’au 14/11/2026.' },
  { name: 'Inès Benali', plan: 'Mensuel Illimité', allowed: true, result: 'Autorisé, expire bientôt', title: 'Accès autorisé', text: 'Inès Benali, son abonnement expire dans 2 jours.' },
  { name: 'Camille Roux', plan: 'Mensuel Illimité', allowed: false, result: 'Refusé, impayé', title: 'Accès refusé', text: 'Camille Roux, 30 000 FCFA impayés depuis 6 jours.' },
  { name: 'Yacine Haddad', plan: 'Mensuel Essentiel', allowed: false, result: 'Refusé, expiré', title: 'Accès refusé', text: 'Yacine Haddad, abonnement expiré le 07/11/2026.' },
];

const LOGS: AccessLog[] = [
  { time: '18:09', name: 'Thomas Lefèvre', plan: 'Annuel', method: 'QR', result: 'Autorisé', allowed: true },
  { time: '18:07', name: 'Sarah Nguyen', plan: 'Mensuel Illimité', method: 'QR', result: 'Autorisé', allowed: true },
  { time: '18:04', name: 'Yacine Haddad', plan: 'Mensuel Essentiel', method: 'QR', result: 'Refusé, expiré', allowed: false },
  { time: '18:01', name: 'Léa Moreau', plan: 'Séance à la carte', method: 'Manuel', result: 'Autorisé', allowed: true },
  { time: '17:56', name: 'Julien Petit', plan: 'Mensuel Essentiel', method: 'QR', result: 'Autorisé, expire bientôt', allowed: true },
  { time: '17:53', name: 'Mamadou Sow', plan: 'Mensuel Illimité', method: 'QR', result: 'Autorisé', allowed: true },
  { time: '17:49', name: 'Koffi Mensah', plan: 'Mensuel Illimité', method: 'QR', result: 'Autorisé, expire bientôt', allowed: true },
];

/** Compteurs du jour avant les passages simulés */
const BASE_PRESENT = 47;
const BASE_ENTRIES = 186;
const BASE_REFUSED = 3;

@Component({
  selector: 'app-access',
  imports: [FormsModule, RouterLink],
  templateUrl: './access.html',
  styleUrl: './access.css',
})
export class Access {
  readonly demo = DEMO;

  readonly query = signal('');
  readonly filter = signal<ResultFilter>('all');
  readonly lastScan = signal<ScanResult | null>(null);
  private readonly added = signal<AccessLog[]>([]);

  private readonly allLogs = computed(() => [...this.added(), ...LOGS]);

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.allLogs().filter(
      r => (!q || r.name.toLowerCase().includes(q)) && (f === 'all' || (f === 'ok') === r.allowed),
    );
  });

  private readonly addedAllowed = computed(() => this.added().filter(r => r.allowed).length);
  readonly present = computed(() => BASE_PRESENT + this.addedAllowed());
  readonly entries = computed(() => BASE_ENTRIES + this.addedAllowed());
  readonly refused = computed(() => BASE_REFUSED + this.added().length - this.addedAllowed());
  readonly totalPassages = computed(() => LOGS.length + 182 + this.added().length);

  /** Simule la lecture d'un QR code (en attendant le vrai lecteur) */
  simulate(p: DemoPerson): void {
    const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    this.lastScan.set(p);
    this.added.update(list => [{ time, name: p.name, plan: p.plan, method: 'QR', result: p.result, allowed: p.allowed }, ...list]);
  }

  resetFilters(): void {
    this.query.set('');
    this.filter.set('all');
  }

  tone(r: AccessLog): string {
    if (!r.allowed) return 'danger';
    return r.result === 'Autorisé' ? 'success' : 'warning';
  }
}
