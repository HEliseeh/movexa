import { HttpErrorResponse } from '@angular/common/http';
import {
  PaymentMethod,
  ProspectSource,
  ProspectStatus,
  ReminderRule,
  SubscriptionState,
} from '@core/api/api.models';

/**
 * Formatage et libellés partagés par tous les écrans (FCFA, dates, statuts, liens WhatsApp).
 * Des fonctions pures : faciles à tester et utilisables dans n'importe quel composant.
 */

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/** 15000 → « 15 000 FCFA » */
export function fcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const sign = n < 0 ? '−' : '';
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

/** Date du jour au format AAAA-MM-JJ (heure locale du navigateur) */
export function todayIso(): string {
  return isoDate(new Date());
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** AAAA-MM-JJ → JJ/MM/AAAA */
export function frDate(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

/** AAAA-MM-JJ → JJ/MM */
export function shortDate(iso: string | null | undefined): string {
  return iso ? frDate(iso).slice(0, 5) : '—';
}

/** Instant ISO → « 18:12 » */
export function hour(instant: string | null | undefined): string {
  return instant ? new Date(instant).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
}

/** Instant ISO → « 12/11 18:12 » */
export function dayHour(instant: string | null | undefined): string {
  if (!instant) return '';
  const d = new Date(instant);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hour(instant)}`;
}

/** « Jeudi 12 novembre 2026 » */
export function longToday(): string {
  const text = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ajoute des jours à une date AAAA-MM-JJ */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function initials(first: string | null | undefined, last?: string | null): string {
  const text = `${first ?? ''} ${last ?? ''}`.trim();
  return text.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

// ---- Libellés ----

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  MTN_MOMO: 'MTN MoMo',
  MOOV_MONEY: 'Moov Money',
  PAYMENT_LINK: 'Lien de paiement',
};

export const STATE_LABELS: Record<SubscriptionState, string> = {
  ACTIVE: 'Actif',
  EXPIRING_SOON: 'Expire bientôt',
  EXPIRED: 'Expiré',
  NONE: 'Sans abonnement',
};

export const STATE_TONES: Record<SubscriptionState, Tone> = {
  ACTIVE: 'success',
  EXPIRING_SOON: 'warning',
  EXPIRED: 'danger',
  NONE: 'neutral',
};

export const SOURCE_LABELS: Record<ProspectSource, string> = {
  WALK_IN: 'Passage à l’accueil',
  REFERRAL: 'Parrainage',
  WORD_OF_MOUTH: 'Bouche-à-oreille',
  SOCIAL: 'Réseaux sociaux',
  FLYER: 'Flyer',
  OTHER: 'Autre',
};

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  TRIAL: 'Séance d’essai',
  CONVERTED: 'Converti',
  LOST: 'Perdu',
};

export const RULE_LABELS: Record<ReminderRule, string> = {
  BEFORE_7: 'Rappel J-7',
  BEFORE_1: 'Rappel J-1',
  AFTER_1: 'Après expiration J+1',
  AFTER_7: 'Dernier rappel J+7',
};

/** « Actif jusqu'au 30/06/2027 », « Expire demain, 13/11 », « Expiré le 07/11 »… */
export function stateText(state: SubscriptionState, endDate: string | null, daysLeft: number | null): string {
  switch (state) {
    case 'ACTIVE':
      return `Actif jusqu’au ${frDate(endDate)}`;
    case 'EXPIRING_SOON':
      return daysLeft === 0
        ? `Expire aujourd’hui`
        : daysLeft === 1
          ? `Expire demain, ${shortDate(endDate)}`
          : `Expire le ${shortDate(endDate)}`;
    case 'EXPIRED':
      return `Expiré le ${frDate(endDate)}`;
    default:
      return 'Sans abonnement';
  }
}

// ---- Liens WhatsApp / SMS pré-remplis (pas d'API payante dans le MVP) ----

/**
 * Numéro au format international sans « + » pour wa.me.
 * Un numéro local béninois (8 ou 10 chiffres) reçoit l'indicatif 229.
 */
export function internationalDigits(phone: string | null | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('229') || d.length > 10) return d;
  return d ? '229' + d : '';
}

export function whatsappLink(phone: string | null | undefined, text: string): string {
  return `https://wa.me/${internationalDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function smsLink(phone: string | null | undefined, text: string): string {
  return `sms:+${internationalDigits(phone)}?body=${encodeURIComponent(text)}`;
}

// ---- Erreurs de l'API ----

/**
 * Message lisible pour une erreur HTTP : les erreurs métier du backend (400, 404) portent
 * leur texte dans « title » ou « detail » (format ProblemDetail de Spring / JHipster).
 */
export function apiError(err: unknown, fallback = 'Une erreur est survenue. Réessayez.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'Pas de connexion au serveur. Vérifiez le réseau.';
  if (err.status === 403) return 'Action réservée au gérant.';
  const body = (err.error ?? {}) as { title?: string; detail?: string; fieldErrors?: { message?: string }[] };
  if (Array.isArray(body.fieldErrors) && body.fieldErrors.length) {
    return body.fieldErrors.map(f => f.message).filter(Boolean).join(' ') || fallback;
  }
  const text = body.detail || body.title;
  // Les titres génériques de Spring (« Bad Request ») ne disent rien à l'utilisateur
  return text && !/^(Bad Request|Not Found|Internal Server Error|Method argument not valid)$/i.test(text) ? text : fallback;
}

/** Identifiant unique côté navigateur (pointages hors ligne) */
export function clientId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
