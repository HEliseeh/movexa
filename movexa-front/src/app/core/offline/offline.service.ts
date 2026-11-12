import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CheckInMethod, MemberLite } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';

/** Pointage fait sans réseau, en attente d'envoi */
export interface PendingCheckIn {
  clientId: string;
  memberId?: number;
  qrToken?: string;
  method: CheckInMethod;
  checkedAt: string;
  /** Pour l'affichage dans le journal en attendant la synchronisation */
  memberName: string;
}

const QUEUE_KEY = 'movexa_checkin_queue';
const CACHE_KEY = 'movexa_members_cache';

/**
 * Mode hors ligne de l'accueil (scénario E du MVP) :
 * - une copie légère des membres est gardée dans le navigateur pour répondre vert / orange / rouge
 *   sans réseau ;
 * - les pointages faits hors ligne sont mis en file d'attente puis envoyés au retour du réseau.
 *   Chaque pointage a un identifiant unique (clientId) : le serveur ignore un doublon.
 *
 * localStorage est simple et suffisant pour quelques centaines de membres ; au-delà, IndexedDB.
 * Les paiements, eux, demandent le réseau dans cette version.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly api = inject(MovexaApi);

  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly pending = signal<PendingCheckIn[]>(this.read<PendingCheckIn[]>(QUEUE_KEY) ?? []);
  readonly syncing = signal(false);
  /** Nombre de pointages envoyés lors de la dernière synchronisation (pour le message) */
  readonly lastSynced = signal(0);

  private members: MemberLite[] = this.read<{ members: MemberLite[] }>(CACHE_KEY)?.members ?? [];

  constructor() {
    const onOnline = () => {
      this.online.set(true);
      void this.sync();
    };
    const onOffline = () => this.online.set(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }

  /** Recharge la copie locale des membres (à appeler à l'ouverture du pointage, si en ligne). */
  refreshCache(): void {
    this.api.membersLite().subscribe({
      next: members => {
        this.members = members;
        this.write(CACHE_KEY, { members, savedAt: new Date().toISOString() });
      },
      error: () => {
        /* garde l'ancienne copie */
      },
    });
  }

  cachedMembers(): MemberLite[] {
    return this.members;
  }

  findCachedByQr(token: string): MemberLite | undefined {
    return this.members.find(m => m.qrToken === token);
  }

  enqueue(item: PendingCheckIn): void {
    this.pending.update(list => [...list, item]);
    this.write(QUEUE_KEY, this.pending());
  }

  /** Envoie les pointages en attente, un par un, et s'arrête à la première coupure réseau. */
  async sync(): Promise<void> {
    if (this.syncing() || this.pending().length === 0) return;
    this.syncing.set(true);
    let sent = 0;
    try {
      for (const item of [...this.pending()]) {
        try {
          await firstValueFrom(
            this.api.checkIn({ memberId: item.memberId, qrToken: item.qrToken, method: item.method, clientId: item.clientId, checkedAt: item.checkedAt }),
          );
          sent++;
        } catch (err) {
          // Réseau toujours absent : on réessaiera plus tard. Erreur métier (membre inconnu…) : on abandonne la ligne.
          if (err instanceof HttpErrorResponse && (err.status === 0 || err.status >= 500)) break;
        }
        this.pending.update(list => list.filter(p => p.clientId !== item.clientId));
        this.write(QUEUE_KEY, this.pending());
      }
    } finally {
      this.syncing.set(false);
      this.lastSynced.set(sent);
    }
  }

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage plein ou bloqué : le pointage reste en mémoire */
    }
  }
}
