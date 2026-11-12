import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckIn, Payment, PaymentMethod, Reminder, Subscription, SubscriptionState } from './api.models';

/** Statuts tels que stockés côté backend (enum MemberStatus) */
export type MemberStatusApi = 'ACTIVE' | 'UNPAID' | 'EXPIRED' | 'FROZEN';
export type Gender = 'MALE' | 'FEMALE';

/** Ce que renvoie l'API (MemberDTO côté Java). Les dates sont au format AAAA-MM-JJ. */
export interface MemberDto {
  id: number;
  memberNumber: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  age: number | null;
  gender: Gender | null;
  notes: string | null;
  status: MemberStatusApi;
  /** Formule en cours */
  plan: string | null;
  coach: string | null;
  program: string | null;
  subscriptionStartDate: string;
  autoRenew: boolean;
  joinDate: string;
  /** Dernier jour valable de la période en cours */
  expiryDate: string | null;
  lastVisitDate: string | null;
  visitsLast30Days: number;
  /** Calculé par le serveur à partir de la date de fin */
  state: SubscriptionState;
  daysLeft: number | null;
  qrToken: string;
  /** Paiement créé à l'inscription (reçu ou lien) */
  payment: Payment | null;
}

/** Ce que le front envoie en création / modification. */
export interface MemberPayload {
  id?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  /** Création uniquement : formule et paiement en une seule fois */
  planId?: number | null;
  paymentMethod?: PaymentMethod | null;
  planStartDate?: string | null;
  /** Création à partir d'un prospect */
  prospectId?: number | null;
}

export interface MemberPage {
  members: MemberDto[];
  /** Nombre total en base (en-tête X-Total-Count), pas seulement la page chargée */
  total: number;
}

/** Contenu complet de la fiche membre */
export interface MemberOverview {
  member: MemberDto;
  subscriptions: Subscription[];
  payments: Payment[];
  visitDays: string[];
  reminders: Reminder[];
}

export type { CheckIn };

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.servicesUrl}/movexa-back1/api/members`;

  list(page = 0, size = 500): Observable<MemberPage> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    // observe: 'response' donne accès aux en-têtes, pour lire X-Total-Count
    return this.http.get<MemberDto[]>(this.url, { params, observe: 'response' }).pipe(
      map(res => ({
        members: res.body ?? [],
        total: Number(res.headers.get('X-Total-Count') ?? res.body?.length ?? 0),
      })),
    );
  }

  get(id: number): Observable<MemberDto> {
    return this.http.get<MemberDto>(`${this.url}/${id}`);
  }

  overview(id: number): Observable<MemberOverview> {
    return this.http.get<MemberOverview>(`${this.url}/${id}/overview`);
  }

  create(payload: MemberPayload): Observable<MemberDto> {
    return this.http.post<MemberDto>(this.url, payload);
  }

  update(id: number, payload: MemberPayload): Observable<MemberDto> {
    return this.http.put<MemberDto>(`${this.url}/${id}`, { ...payload, id });
  }

  /** Archive le membre (l'historique est conservé côté serveur) */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
