import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Reminder, ReminderChannel, ReminderQueueItem, ReminderStats } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { ToastService } from '@core/notifications/toast.service';
import { dayHour, fcfa, frDate, RULE_LABELS, smsLink, whatsappLink } from '@shared/format';

/**
 * Relances des membres (module 5) : ce qui fait gagner de l'argent.
 * Le serveur prépare la liste du jour (J-7, J-1, après expiration) et les messages ;
 * l'accueil les envoie depuis le téléphone de la salle (lien WhatsApp ou SMS pré-rempli).
 */
@Component({
  selector: 'app-reminders',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './reminders.html',
  styleUrl: './reminders.css',
})
export class Reminders implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ruleLabels = RULE_LABELS;
  readonly fcfa = fcfa;
  readonly frDate = frDate;
  readonly dayHour = dayHour;

  readonly tab = signal<'queue' | 'history'>('queue');
  readonly queue = signal<ReminderQueueItem[]>([]);
  readonly history = signal<Reminder[]>([]);
  readonly stats = signal<ReminderStats | null>(null);
  readonly selectedId = signal<number | null>(null);
  /** Message éventuellement retouché avant l'envoi */
  readonly message = signal('');

  readonly selected = computed(() => this.queue().find(q => q.memberId === this.selectedId()) ?? null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.reminderQueue().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      this.queue.set(q);
      if (!q.some(i => i.memberId === this.selectedId())) this.select(q[0] ?? null);
    });
    this.api.reminderHistory(30).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(h => this.history.set(h));
    this.api.reminderStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.stats.set(s));
  }

  select(item: ReminderQueueItem | null): void {
    this.selectedId.set(item?.memberId ?? null);
    this.message.set(item?.message ?? '');
  }

  /** Ouvre le message pré-rempli, puis enregistre la relance comme envoyée */
  send(item: ReminderQueueItem, channel: ReminderChannel): void {
    const text = item.memberId === this.selectedId() ? this.message() : item.message;
    window.open(channel === 'WHATSAPP' ? whatsappLink(item.phone, text) : smsLink(item.phone, text), '_blank', 'noopener');
    this.api
      .reminderSent({ memberId: item.memberId, rule: item.rule, channel, targetEndDate: item.targetEndDate, message: text })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success(`Relance de ${item.memberName} enregistrée.`);
        const rest = this.queue().filter(q => q.memberId !== item.memberId);
        this.queue.set(rest);
        this.select(rest[0] ?? null);
        this.api.reminderStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.stats.set(s));
        this.api.reminderHistory(30).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(h => this.history.set(h));
      });
  }

  outcomeTone(r: Reminder): string {
    return r.outcome === 'RENEWED' ? 'success' : r.outcome === 'WAITING' ? 'warning' : 'danger';
  }
}
