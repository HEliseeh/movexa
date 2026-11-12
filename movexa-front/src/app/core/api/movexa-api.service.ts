import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CashClosure,
  CashDay,
  CheckIn,
  CheckInRequest,
  Dashboard,
  GatewayUser,
  GymSettings,
  ImportResult,
  ImportRow,
  MemberLite,
  Payment,
  PaymentRequest,
  Plan,
  PlanPayload,
  Prospect,
  ProspectEvent,
  ProspectPayload,
  ReceptionToday,
  Receipt,
  Reminder,
  ReminderChannel,
  ReminderQueueItem,
  ReminderRule,
  ReminderStats,
  SourceStats,
} from './api.models';

/**
 * Accès HTTP aux modules du MVP (formules, encaissements, pointage, relances, prospects,
 * tableau de bord, caisse, paramètres). Les membres ont leur propre service (MembersService).
 * Tout passe par le gateway : /services/movexa-back1/api/...
 *
 * Un seul service pour tous ces petits appels : chaque méthode est une ligne, les séparer en
 * huit fichiers n'apporterait rien pour l'instant.
 */
@Injectable({ providedIn: 'root' })
export class MovexaApi {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.servicesUrl}/movexa-back1/api`;

  /** Paramètres mis en cache le temps de la session (rechargés après modification). */
  private settings$?: Observable<GymSettings>;

  // ---- Formules ----
  plans(all = false): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.api}/plans`, { params: { all } });
  }
  createPlan(p: PlanPayload): Observable<Plan> {
    return this.http.post<Plan>(`${this.api}/plans`, p);
  }
  updatePlan(id: number, p: PlanPayload): Observable<Plan> {
    return this.http.put<Plan>(`${this.api}/plans/${id}`, p);
  }

  // ---- Membres (recherche et cache) ----
  searchMembers(q: string, limit = 8): Observable<MemberLite[]> {
    return this.http.get<MemberLite[]>(`${this.api}/members/search`, { params: { q, limit } });
  }
  membersLite(): Observable<MemberLite[]> {
    return this.http.get<MemberLite[]>(`${this.api}/members/lite`);
  }
  importMembers(rows: ImportRow[], updateExisting: boolean, dryRun: boolean): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.api}/members/import`, { rows, updateExisting, dryRun });
  }

  // ---- Encaissements ----
  payments(date?: string): Observable<Payment[]> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<Payment[]>(`${this.api}/payments`, { params });
  }
  paymentLinks(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.api}/payments/links`);
  }
  pay(req: PaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/payments`, req);
  }
  cancelPayment(id: number, reason: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/payments/${id}/cancel`, { reason });
  }
  confirmPayment(id: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.api}/payments/${id}/confirm`, {});
  }
  receipt(id: number): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.api}/payments/${id}/receipt`);
  }
  cashDay(date?: string): Observable<CashDay> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<CashDay>(`${this.api}/cash`, { params });
  }
  closeCash(body: { date: string; countedCash: number; countedMtn: number; countedMoov: number; reason: string | null }): Observable<CashClosure> {
    return this.http.post<CashClosure>(`${this.api}/cash/closures`, body);
  }

  // ---- Pointage ----
  checkIn(req: CheckInRequest): Observable<CheckIn> {
    return this.http.post<CheckIn>(`${this.api}/check-ins`, req);
  }
  checkInsToday(): Observable<CheckIn[]> {
    return this.http.get<CheckIn[]>(`${this.api}/check-ins/today`);
  }

  // ---- Relances membres ----
  reminderQueue(): Observable<ReminderQueueItem[]> {
    return this.http.get<ReminderQueueItem[]>(`${this.api}/reminders/queue`);
  }
  reminderSent(body: { memberId: number; rule: ReminderRule; channel: ReminderChannel; targetEndDate: string | null; message: string }): Observable<Reminder> {
    return this.http.post<Reminder>(`${this.api}/reminders`, body);
  }
  reminderHistory(days = 30): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(`${this.api}/reminders/history`, { params: { days } });
  }
  reminderStats(): Observable<ReminderStats> {
    return this.http.get<ReminderStats>(`${this.api}/reminders/stats`);
  }

  // ---- Prospects ----
  prospects(scope: 'TODAY' | 'OPEN' | 'CLOSED'): Observable<Prospect[]> {
    return this.http.get<Prospect[]>(`${this.api}/prospects`, { params: { scope } });
  }
  searchProspects(q: string): Observable<Prospect[]> {
    return this.http.get<Prospect[]>(`${this.api}/prospects/search`, { params: { q } });
  }
  prospect(id: number): Observable<Prospect> {
    return this.http.get<Prospect>(`${this.api}/prospects/${id}`);
  }
  prospectEvents(id: number): Observable<ProspectEvent[]> {
    return this.http.get<ProspectEvent[]>(`${this.api}/prospects/${id}/events`);
  }
  prospectStats(): Observable<SourceStats[]> {
    return this.http.get<SourceStats[]>(`${this.api}/prospects/stats`);
  }
  createProspect(p: ProspectPayload): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.api}/prospects`, p);
  }
  updateProspect(id: number, p: ProspectPayload): Observable<Prospect> {
    return this.http.put<Prospect>(`${this.api}/prospects/${id}`, p);
  }
  prospectInteraction(id: number, type: 'REPLY' | 'VISIT' | 'TRIAL'): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.api}/prospects/${id}/interactions`, { type });
  }
  prospectFollowUp(id: number, channel: ReminderChannel): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.api}/prospects/${id}/follow-ups`, { channel });
  }
  prospectLost(id: number): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.api}/prospects/${id}/lost`, {});
  }
  runProspectDecay(): Observable<unknown> {
    return this.http.post(`${this.api}/prospects/decay`, {});
  }

  // ---- Tableau de bord, accueil, paramètres ----
  dashboard(period: 'DAY' | 'WEEK' | 'MONTH'): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.api}/dashboard`, { params: { period } });
  }
  receptionToday(): Observable<ReceptionToday> {
    return this.http.get<ReceptionToday>(`${this.api}/reception/today`);
  }
  settings(): Observable<GymSettings> {
    this.settings$ ??= this.http.get<GymSettings>(`${this.api}/settings`).pipe(shareReplay(1));
    return this.settings$;
  }
  saveSettings(s: GymSettings): Observable<GymSettings> {
    this.settings$ = undefined;
    return this.http.put<GymSettings>(`${this.api}/settings`, s);
  }

  // ---- Comptes utilisateurs (gateway, réservé au gérant) ----
  users(): Observable<GatewayUser[]> {
    return this.http.get<GatewayUser[]>(`${environment.apiUrl}/admin/users`, { params: { size: 100 } });
  }
}
