import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  plan: string | null;
  coach: string | null;
  program: string | null;
  subscriptionStartDate: string;
  autoRenew: boolean;
  joinDate: string;
  /** Calculée par le serveur : date de début + durée de la formule */
  expiryDate: string | null;
  lastVisitDate: string | null;
  visitsLast30Days: number;
}

/**
 * Ce que le front envoie en création / modification.
 * Les champs calculés par le serveur (numéro, échéance, âge, présences…) n'y figurent pas.
 */
export interface MemberPayload {
  id?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  gender: Gender | null;
  notes: string | null;
  status?: MemberStatusApi;
  plan: string;
  coach: string | null;
  program: string | null;
  subscriptionStartDate: string;
  autoRenew: boolean;
}

export interface MemberPage {
  members: MemberDto[];
  /** Nombre total en base (en-tête X-Total-Count), pas seulement la page chargée */
  total: number;
}

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.servicesUrl}/movexa-back1/api/members`;

  list(page = 0, size = 100, status?: MemberStatusApi): Observable<MemberPage> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,asc');
    if (status) params = params.set('status', status);

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

  create(payload: MemberPayload): Observable<MemberDto> {
    return this.http.post<MemberDto>(this.url, payload);
  }

  update(id: number, payload: MemberPayload): Observable<MemberDto> {
    return this.http.put<MemberDto>(`${this.url}/${id}`, { ...payload, id });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
