/**
 * Types renvoyés par l'API du service movexa-back1 (records Java côté serveur).
 * Les dates « jour » sont au format AAAA-MM-JJ, les instants au format ISO 8601 (UTC).
 */

export type PaymentMethod = 'CASH' | 'MTN_MOMO' | 'MOOV_MONEY' | 'PAYMENT_LINK';
export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type SubscriptionState = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NONE';
export type CheckInMethod = 'QR' | 'SEARCH';
export type CheckInResult = 'ALLOWED' | 'ALLOWED_EXPIRING' | 'REFUSED';
export type ReminderChannel = 'SMS' | 'WHATSAPP';
export type ReminderRule = 'BEFORE_7' | 'BEFORE_1' | 'AFTER_1' | 'AFTER_7';
export type ProspectSource = 'WALK_IN' | 'REFERRAL' | 'WORD_OF_MOUTH' | 'SOCIAL' | 'FLYER' | 'OTHER';
export type ProspectStatus = 'NEW' | 'CONTACTED' | 'TRIAL' | 'CONVERTED' | 'LOST';

export interface Plan {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
  memberCount: number | null;
}

export type PlanPayload = Omit<Plan, 'id' | 'memberCount'> & { id?: number };

/** Coach de la salle et ses disciplines */
export interface Coach {
  id: number;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  disciplines: string[];
  /** Membres suivis (lecture seule) */
  memberCount: number | null;
  createdAt: string | null;
}

export type CoachPayload = Omit<Coach, 'id' | 'memberCount' | 'createdAt'>;

/** Membre en version légère (recherche, accueil, pointage, cache hors ligne) */
export interface MemberLite {
  id: number;
  memberNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  planName: string | null;
  endDate: string | null;
  state: SubscriptionState;
  daysLeft: number | null;
  qrToken: string;
}

export interface Payment {
  id: number;
  memberId: number;
  memberName: string;
  memberNumber: string;
  memberPhone: string | null;
  planId: number | null;
  planName: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string | null;
  reference: string | null;
  paymentUrl: string | null;
  createdAt: string;
  createdBy: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface PaymentRequest {
  memberId: number;
  planId: number;
  method: PaymentMethod;
  amount?: number | null;
  startDate?: string | null;
  reference?: string | null;
}

export interface Receipt {
  paymentId: number;
  number: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  amount: number;
  method: PaymentMethod;
  memberName: string;
  memberNumber: string;
  memberPhone: string | null;
  planName: string | null;
  validFrom: string | null;
  validTo: string | null;
  agent: string | null;
  gymName: string | null;
  gymAddress: string | null;
  gymPhone: string | null;
  footer: string | null;
  cancelReason: string | null;
}

export interface CheckIn {
  id: number;
  memberId: number;
  memberName: string;
  memberNumber: string;
  memberPhone: string | null;
  method: CheckInMethod;
  result: CheckInResult;
  checkedAt: string;
  agent: string | null;
  state: SubscriptionState;
  planName: string | null;
  endDate: string | null;
  daysLeft: number | null;
}

export interface CheckInRequest {
  memberId?: number;
  qrToken?: string;
  method: CheckInMethod;
  clientId?: string;
  checkedAt?: string;
}

export interface Subscription {
  id: number;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  cancelled: boolean;
  createdAt: string;
}

export interface ReminderQueueItem {
  memberId: number;
  memberName: string;
  phone: string | null;
  rule: ReminderRule;
  channel: ReminderChannel;
  targetEndDate: string;
  planName: string | null;
  amount: number | null;
  expired: boolean;
  message: string;
}

export interface Reminder {
  id: number;
  memberId: number;
  memberName: string;
  rule: ReminderRule;
  channel: ReminderChannel;
  targetEndDate: string | null;
  sentAt: string;
  sentBy: string | null;
  outcome: 'RENEWED' | 'WAITING' | 'NO_RESPONSE';
  outcomeText: string;
}

export interface ReminderStats {
  sent: number;
  sms: number;
  whatsapp: number;
  renewed: number;
  recoveredAmount: number;
  toSendToday: number;
}

export interface Prospect {
  id: number;
  name: string | null;
  phone: string;
  source: ProspectSource;
  status: ProspectStatus;
  firstContactDate: string;
  interestedPlan: string | null;
  notes: string | null;
  score: number;
  lastInteractionAt: string;
  nextFollowUp: string | null;
  followUpStep: number;
  convertedMemberId: number | null;
  closedAt: string | null;
  dueToday: boolean;
  lastChance: boolean;
}

export interface ProspectPayload {
  name: string | null;
  phone: string;
  source: ProspectSource;
  interestedPlan: string | null;
  notes: string | null;
}

export interface ProspectEvent {
  id: number;
  label: string;
  delta: number | null;
  createdAt: string;
  createdBy: string | null;
}

export interface SourceStats {
  source: ProspectSource;
  converted: number;
  lost: number;
  expired: number;
  averageDaysToDecision: number | null;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface DueMember {
  member: MemberLite;
  reminderCount: number;
}

export interface Dashboard {
  period: 'DAY' | 'WEEK' | 'MONTH';
  from: string;
  totalPaid: number;
  paidByMethod: Record<PaymentMethod, number>;
  paymentsCount: number;
  cancelledCount: number;
  activeMembers: number;
  newMembers: number;
  expiredMembers: number;
  remindersSentWeek: number;
  renewedAfterReminderWeek: number;
  attendance: DayCount[];
  expiringCount: number;
  expiring: DueMember[];
  expiredCount: number;
  expired: DueMember[];
}

export interface ReceptionToday {
  entriesToday: number;
  refusedToday: number;
  paymentsToday: number;
  visitedToRenew: MemberLite[];
  prospectsToFollow: Prospect[];
}

export interface CashClosure {
  id: number;
  closingDate: string;
  expectedCash: number;
  countedCash: number;
  expectedMtn: number;
  countedMtn: number;
  expectedMoov: number;
  countedMoov: number;
  expectedLink: number;
  reason: string | null;
  closedBy: string | null;
  closedAt: string;
}

export interface CashDay {
  date: string;
  expectedCash: number;
  expectedMtn: number;
  expectedMoov: number;
  expectedLink: number;
  paymentsCount: number;
  closure: CashClosure | null;
}

export interface GymSettings {
  id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  momoNumber: string | null;
  moovNumber: string | null;
  receiptFooter: string | null;
  expiringSoonDays: number;
  cashEnabled: boolean;
  mtnEnabled: boolean;
  moovEnabled: boolean;
  aggregator: string | null;
  paymentLinkBaseUrl: string | null;
  reminderBefore7Sms: boolean;
  reminderBefore7Whatsapp: boolean;
  reminderBefore1Sms: boolean;
  reminderBefore1Whatsapp: boolean;
  reminderAfter1Sms: boolean;
  reminderAfter1Whatsapp: boolean;
  reminderAfter7Sms: boolean;
  reminderAfter7Whatsapp: boolean;
  scoreWalkIn: number;
  scoreReferral: number;
  scoreWordOfMouth: number;
  scoreSocial: number;
  scoreFlyer: number;
  scoreOther: number;
  pointsReply: number;
  pointsVisit: number;
  pointsTrial: number;
  graceDays: number;
  decayPerDay: number;
  alertThreshold: number;
}

export interface ImportRow {
  line: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phone?: string | null;
  planName?: string | null;
  endDate?: string | null;
}

export interface ImportLine {
  line: number;
  name: string;
  phone: string;
  planName: string | null;
  endDate: string | null;
  status: 'READY' | 'DUPLICATE' | 'MISSING_PHONE' | 'INVALID' | 'IMPORTED' | 'UPDATED' | 'SKIPPED';
  message: string;
}

export interface ImportResult {
  ready: number;
  duplicates: number;
  invalid: number;
  imported: number;
  updated: number;
  lines: ImportLine[];
}

/** Compte utilisateur du gateway (GET /api/admin/users) */
export interface GatewayUser {
  id: number;
  login: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  activated: boolean;
  authorities: string[];
}
