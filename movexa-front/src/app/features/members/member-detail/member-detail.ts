import { Component, computed, DestroyRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MemberLite, Payment } from '@core/api/api.models';
import { MemberDto, MemberOverview, MembersService } from '@core/api/members.service';
import { MovexaApi } from '@core/api/movexa-api.service';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { ToastService } from '@core/notifications/toast.service';
import { CancelPayment } from '@shared/cancel-payment/cancel-payment';
import {
  addDays,
  dayHour,
  fcfa,
  frDate,
  initials,
  isoDate,
  METHOD_LABELS,
  RULE_LABELS,
  STATE_TONES,
  stateText,
  whatsappLink,
} from '@shared/format';
import { PayDialog } from '@shared/pay-dialog/pay-dialog';
import { QrCode } from '@shared/qr-code/qr-code';
import { MemberForm } from '@shared/member-form/member-form';

type Tab = 'pay' | 'visits' | 'reminders';

/**
 * Fiche membre : en un coup d'œil le statut, la date de fin, les paiements, les visites
 * et les rappels envoyés. Point de départ du renouvellement et de l'envoi du QR code.
 */
@Component({
  selector: 'app-member-detail',
  imports: [RouterLink, PayDialog, QrCode, MemberForm, CancelPayment],
  templateUrl: './member-detail.html',
  styleUrl: './member-detail.css',
})
export class MemberDetail implements OnInit {
  private readonly members = inject(MembersService);
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CurrentUserStore);

  /** Paramètre de route :id (withComponentInputBinding n'est pas activé : lu à la main) */
  readonly id = input<string>();

  readonly data = signal<MemberOverview | null>(null);
  readonly error = signal<string | null>(null);
  readonly tab = signal<Tab>('pay');
  readonly paying = signal(false);
  readonly editing = signal(false);
  readonly cancelling = signal<Payment | null>(null);
  readonly gymName = signal('la salle');

  readonly fcfa = fcfa;
  readonly frDate = frDate;
  readonly dayHour = dayHour;
  readonly methodLabels = METHOD_LABELS;
  readonly ruleLabels = RULE_LABELS;
  readonly tones = STATE_TONES;
  readonly initials = initials;

  private readonly qr = viewChild(QrCode);

  readonly member = computed(() => this.data()?.member ?? null);
  readonly lite = computed<MemberLite | null>(() => {
    const m = this.member();
    return m
      ? { id: m.id, memberNumber: m.memberNumber, firstName: m.firstName, lastName: m.lastName, phone: m.phone, planName: m.plan, endDate: m.expiryDate, state: m.state, daysLeft: m.daysLeft, qrToken: m.qrToken }
      : null;
  });
  readonly statusText = computed(() => {
    const m = this.member();
    return m ? stateText(m.state, m.expiryDate, m.daysLeft) : '';
  });

  /** Période en cours : progression entre le début et la fin */
  readonly period = computed(() => {
    const d = this.data();
    const current = d?.subscriptions.find(s => !s.cancelled && s.endDate === d.member.expiryDate);
    if (!current) return null;
    const total = Math.max(1, (Date.parse(current.endDate) - Date.parse(current.startDate)) / 86_400_000);
    const left = d!.member.daysLeft ?? 0;
    const pct = Math.min(100, Math.max(0, Math.round(((total - left) / total) * 100)));
    const remaining = left < 0 ? `Expiré depuis ${-left} jour${left < -1 ? 's' : ''}` : left === 0 ? 'Dernier jour' : `${left} jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`;
    return { ...current, pct, remaining };
  });

  /** Les 30 derniers jours, du plus ancien au plus récent : venu ou absent */
  readonly visitGrid = computed(() => {
    const days = new Set(this.data()?.visitDays ?? []);
    const today = isoDate(new Date());
    return Array.from({ length: 30 }, (_, i) => {
      const day = addDays(today, i - 29);
      return { day, came: days.has(day), label: `${frDate(day)} : ${days.has(day) ? 'venu' : 'absent'}` };
    });
  });

  ngOnInit(): void {
    this.load();
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.gymName.set(s.name ?? 'la salle'));
  }

  load(): void {
    const id = Number(this.id());
    this.members
      .overview(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: d => this.data.set(d),
        error: () => this.error.set('Membre introuvable ou serveur indisponible.'),
      });
  }

  paymentDetail(p: Payment): string {
    const parts = [dayHour(p.createdAt), METHOD_LABELS[p.method].toLowerCase()];
    if (p.createdBy) parts.push(`saisi par ${p.createdBy}`);
    if (p.reference) parts.push(`réf. ${p.reference}`);
    if (p.status === 'CANCELLED') parts.push(`annulé par ${p.cancelledBy} : ${p.cancelReason}`);
    return parts.join(' · ');
  }

  /** Rappel WhatsApp manuel depuis la fiche */
  reminderLink(m: MemberDto): string {
    const when = m.state === 'EXPIRED' ? `a pris fin le ${frDate(m.expiryDate)}` : `se termine le ${frDate(m.expiryDate)}`;
    return whatsappLink(m.phone, `Bonjour ${m.firstName}, votre abonnement ${m.plan ?? ''} à ${this.gymName()} ${when}. Pensez à le renouveler à l’accueil ou par MoMo. À bientôt !`);
  }

  /** Envoi du QR code : le texte part par WhatsApp, l'image est enregistrée pour la joindre */
  qrLink(m: MemberDto): string {
    return whatsappLink(m.phone, `Bonjour ${m.firstName}, voici votre carte de membre ${this.gymName()} (N° ${m.memberNumber}). Présentez ce QR code à l’accueil à chaque visite.`);
  }

  downloadQr(m: MemberDto): void {
    const png = this.qr()?.toPng();
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `qr-${m.memberNumber}.png`;
    a.click();
  }

  onPaid(p: Payment): void {
    this.paying.set(false);
    this.toast.success(p.status === 'PENDING' ? 'Lien de paiement créé.' : `${p.planName} encaissé, reçu ${p.receiptNumber}.`);
    this.tab.set('pay');
    this.load();
  }

  onCancelled(p: Payment): void {
    this.cancelling.set(null);
    this.toast.success(`Paiement annulé : ${p.cancelReason}`);
    this.load();
  }

  onSaved(): void {
    this.editing.set(false);
    this.toast.success('Modifications enregistrées.');
    this.load();
  }
}
