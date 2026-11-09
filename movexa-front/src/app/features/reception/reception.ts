import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type StatusTone = 'success' | 'warning' | 'danger';
type PaymentMode = 'cash' | 'momo' | 'card';

interface MemberHit {
  id: string;
  name: string;
  status: string;
  plan: string;
  tone: StatusTone;
}

interface Product {
  id: string;
  label: string;
  price: number;
}

interface Collection {
  time: string;
  name: string;
  mode: string;
  price: number;
}

const MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Espèces',
  momo: 'MoMo',
  card: 'Carte',
};

/** Format « 30 000 FCFA » */
export function formatFcfa(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

// ---- Données mockées (à remplacer par de vrais appels API) ----
const MEMBERS: MemberHit[] = [
  { id: 'A-0231', name: 'Inès Benali', status: 'Expire bientôt', plan: 'Mensuel Illimité', tone: 'warning' },
  { id: 'A-0187', name: 'Camille Roux', status: 'Impayé', plan: 'Mensuel Illimité', tone: 'danger' },
  { id: 'A-0312', name: 'Awa Diallo', status: 'Actif', plan: 'Trimestriel', tone: 'success' },
  { id: 'A-0098', name: 'Koffi Mensah', status: 'Expire bientôt', plan: 'Mensuel Illimité', tone: 'warning' },
  { id: 'A-0276', name: 'Thomas Lefèvre', status: 'Actif', plan: 'Annuel', tone: 'success' },
];

const PRODUCTS: Product[] = [
  { id: 'essentiel', label: 'Mensuel Essentiel', price: 20000 },
  { id: 'illimite', label: 'Mensuel Illimité', price: 30000 },
  { id: 'trimestre', label: 'Trimestriel', price: 75000 },
  { id: 'seance', label: 'Séance à la carte', price: 3000 },
];

const TODAY: Collection[] = [
  { time: '17:52', name: 'Thomas Lefèvre', mode: 'Carte', price: 20000 },
  { time: '17:31', name: 'Sarah Nguyen', mode: 'MoMo', price: 30000 },
  { time: '16:48', name: 'Léa Moreau', mode: 'Espèces', price: 3000 },
  { time: '15:20', name: 'Awa Diallo', mode: 'MoMo', price: 75000 },
  { time: '13:05', name: 'Julien Petit', mode: 'Carte', price: 20000 },
  { time: '10:42', name: 'Mamadou Sow', mode: 'Espèces', price: 30000 },
];

/**
 * Accueil : encaissement au comptoir et reçus du jour.
 */
@Component({
  selector: 'app-reception',
  imports: [FormsModule, RouterLink],
  templateUrl: './reception.html',
  styleUrl: './reception.css',
})
export class Reception {
  readonly fcfa = formatFcfa;
  readonly products = PRODUCTS;
  readonly modes = (Object.keys(MODE_LABELS) as PaymentMode[]).map(id => ({ id, label: MODE_LABELS[id] }));

  readonly query = signal('');
  readonly selectedId = signal<string>(MEMBERS[0].id);
  readonly productId = signal('illimite');
  readonly mode = signal<PaymentMode>('momo');
  readonly momoNumber = signal('');
  readonly confirmation = signal('');

  private readonly added = signal<Collection[]>([]);
  private receiptNo = 482;

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    return MEMBERS.filter(m => !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)).slice(0, 3);
  });

  readonly product = computed(() => PRODUCTS.find(p => p.id === this.productId()) ?? PRODUCTS[0]);

  readonly collections = computed(() => [...this.added(), ...TODAY]);
  readonly total = computed(() => this.collections().reduce((t, c) => t + c.price, 0));

  collect(): void {
    const member = MEMBERS.find(m => m.id === this.selectedId());
    if (!member) return;
    const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    this.receiptNo += 1;
    this.added.update(list => [{ time, name: member.name, mode: MODE_LABELS[this.mode()], price: this.product().price }, ...list]);
    this.confirmation.set(`Paiement enregistré pour ${member.name}. Reçu REC-${new Date().getFullYear()}-${String(this.receiptNo).padStart(5, '0')}.`);
    // TODO: appel API d'encaissement + génération du reçu PDF
  }
}
