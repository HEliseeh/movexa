import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Reminder, ReminderChannel, ReminderQueueItem, ReminderStats } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { ToastService } from '@core/notifications/toast.service';
import { apiError, dayHour, fcfa, frDate, RULE_LABELS, smsLink, whatsappLink } from '@shared/format';

/**
 * Relances des membres (module 5) : ce qui fait gagner de l'argent.
 * Le serveur prépare la liste du jour (J-7, J-1, après expiration) et les messages ;
 * l'accueil les envoie depuis le téléphone de la salle (lien WhatsApp ou SMS pré-rempli).
 * Depuis la liste des membres, on peut aussi relancer une sélection : /reminders?members=1,2,3
 * ouvre l'onglet « Sélection » avec un message prêt par membre.
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly ruleLabels = RULE_LABELS;
  readonly fcfa = fcfa;
  readonly frDate = frDate;
  readonly dayHour = dayHour;

  readonly tab = signal<'selection' | 'queue' | 'history'>('queue');
  readonly queue = signal<ReminderQueueItem[]>([]);
  /** Relances demandées depuis la liste des membres (cases cochées) ; null = pas de sélection */
  readonly selection = signal<ReminderQueueItem[] | null>(null);
  /** Nombre de membres cochés au départ (pour « 2 sur 3 envoyées ») */
  readonly selectionTotal = signal(0);
  /** Liste affichée dans la colonne de gauche selon l'onglet */
  readonly current = computed(() => (this.tab() === 'selection' ? (this.selection() ?? []) : this.queue()));
  readonly history = signal<Reminder[]>([]);
  readonly stats = signal<ReminderStats | null>(null);
  readonly selectedId = signal<number | null>(null);
  /** Message éventuellement retouché avant l'envoi */
  readonly message = signal('');

  readonly selected = computed(() => this.current().find(q => q.memberId === this.selectedId()) ?? null);

  ngOnInit(): void {
    const ids = (this.route.snapshot.queryParamMap.get('members') ?? '')
      .split(',')
      .map(Number)
      .filter(n => n > 0);
    if (ids.length) this.loadSelection(ids);
    this.load(!ids.length);
  }

  private loadSelection(ids: number[]): void {
    this.tab.set('selection');
    this.api.reminderCompose(ids).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => {
        this.selection.set(items);
        this.selectionTotal.set(items.length);
        this.select(items[0] ?? null);
      },
      error: err => {
        this.toast.error(apiError(err, 'Impossible de préparer les relances.'));
        this.selection.set([]);
      },
    });
  }

  setTab(tab: 'selection' | 'queue' | 'history'): void {
    this.tab.set(tab);
    this.select(this.current()[0] ?? null);
  }

  /** Abandonne la sélection venue de la liste des membres */
  closeSelection(): void {
    this.selection.set(null);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.setTab('queue');
  }

  load(selectFirst = true): void {
    this.api.reminderQueue().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      this.queue.set(q);
      if (selectFirst && this.tab() === 'queue' && !q.some(i => i.memberId === this.selectedId())) this.select(q[0] ?? null);
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
        // Le membre sort des deux listes (une relance faite compte aussi pour la liste du jour)
        this.queue.update(list => list.filter(q => q.memberId !== item.memberId));
        this.selection.update(list => (list ? list.filter(q => q.memberId !== item.memberId) : list));
        this.select(this.current()[0] ?? null);
        this.api.reminderStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.stats.set(s));
        this.api.reminderHistory(30).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(h => this.history.set(h));
      });
  }

  outcomeTone(r: Reminder): string {
    return r.outcome === 'RENEWED' ? 'success' : r.outcome === 'WAITING' ? 'warning' : 'danger';
  }
}
