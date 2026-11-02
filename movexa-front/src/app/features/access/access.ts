import { Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';

export type AccessResult = 'Validé' | 'Refusé - expiré' | 'Refusé - déjà entré' | 'Refusé - invité';
export type ReaderStatus = 'En ligne' | 'Hors ligne';

export interface AccessLog {
  id: number;
  time: string;
  name: string;
  reader: string;
  result: AccessResult;
}

export interface AccessRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface Reader {
  id: number;
  name: string;
  status: ReaderStatus;
}

@Component({
  selector: 'app-access',
  imports: [NgClass],
  templateUrl: './access.html',
  styleUrl: './access.css',
})
export class Access {
  readonly gymName = 'NOM DE LA SALLE';

  // ---- KPIs ----
  readonly validatedToday = 37;
  readonly refusedToday   = 4;
  readonly readersOnline  = 2;
  readonly readersTotal   = 3;

  // ---- Journal ----
  readonly logs: AccessLog[] = [
    { id: 1, time: '09:14', name: 'Thomas Martin',    reader: 'Entrée principale', result: 'Validé' },
    { id: 2, time: '09:11', name: 'Camille Aubert',   reader: 'Entrée principale', result: 'Validé' },
    { id: 3, time: '09:08', name: 'Kevin Renaud',     reader: 'Entrée principale', result: 'Refusé - expiré' },
    { id: 4, time: '09:02', name: 'Aïssatou Diallo',  reader: 'Entrée parking',    result: 'Validé' },
    { id: 5, time: '08:55', name: 'Moussa Touré',     reader: 'Entrée principale', result: 'Refusé - déjà entré' },
  ];

  // ---- Règles ----
  rules = signal<AccessRule[]>([
    { id: 'antipassback',       label: 'Anti-passback',                 description: 'Bloque deux entrées sans sortie.',             enabled: true  },
    { id: 'block-expired',      label: 'Refuser les abonnements expirés', description: 'Le lecteur affiche le motif du refus.',       enabled: true  },
    { id: 'guest-access',       label: 'Accès invités',                 description: 'Autorise les codes à usage unique.',            enabled: false },
    { id: 'qr-validity',        label: 'Validité du QR code',           description: 'Renouvelle toutes les 5 minutes.',              enabled: true  },
  ]);

  // ---- Lecteurs ----
  readonly readers: Reader[] = [
    { id: 1, name: 'Entrée principale', status: 'En ligne'   },
    { id: 2, name: 'Entrée parking',    status: 'En ligne'   },
    { id: 3, name: 'Salle annexe',      status: 'Hors ligne' },
  ];

  toggleRule(id: string): void {
    this.rules.update(list =>
      list.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
  }

  resultClass(result: AccessResult): string {
    if (result === 'Validé') return 'result-valid';
    return 'result-refused';
  }

  readerClass(status: ReaderStatus): string {
    return status === 'En ligne' ? 'reader-online' : 'reader-offline';
  }
}
