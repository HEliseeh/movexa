import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Plan, Prospect, ProspectEvent, ProspectSource, ReminderChannel, SourceStats } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { ToastService } from '@core/notifications/toast.service';
import { apiError, frDate, PROSPECT_STATUS_LABELS, smsLink, SOURCE_LABELS, whatsappLink } from '@shared/format';
import { MemberForm, MemberPrefill } from '@shared/member-form/member-form';

type Scope = 'TODAY' | 'OPEN' | 'CLOSED';
type Template = 'J1' | 'J3' | 'J7';

/**
 * Prospects (module 6) : personnes intéressées, pas encore membres.
 * La liste « À relancer aujourd'hui » est triée par chance d'adhésion décroissante, pour traiter
 * d'abord les contacts les plus prometteurs.
 */
@Component({
  selector: 'app-prospects',
  imports: [FormsModule, RouterLink, MemberForm],
  templateUrl: './prospects.html',
  styleUrl: './prospects.css',
})
export class Prospects implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sources = Object.keys(SOURCE_LABELS) as ProspectSource[];
  readonly sourceLabels = SOURCE_LABELS;
  readonly statusLabels = PROSPECT_STATUS_LABELS;
  readonly frDate = frDate;

  readonly scope = signal<Scope>('OPEN');
  readonly list = signal<Prospect[]>([]);
  readonly allOpen = signal<Prospect[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly events = signal<ProspectEvent[]>([]);
  readonly stats = signal<SourceStats[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly template = signal<Template>('J1');
  readonly converting = signal<MemberPrefill | null>(null);
  private gymName = 'la salle';

  // ---- Ajout rapide ----
  readonly newPhone = signal('');
  readonly newSource = signal<ProspectSource>('WALK_IN');
  readonly newName = signal('');
  readonly newPlan = signal('');
  readonly adding = signal(false);
  readonly addMessage = signal<{ text: string; ok: boolean; existingId?: number } | null>(null);
  private readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');

  readonly selected = computed(() => this.list().find(p => p.id === this.selectedId()) ?? this.allOpen().find(p => p.id === this.selectedId()) ?? null);
  readonly lastChance = computed(() => this.allOpen().filter(p => p.lastChance));

  readonly templateText = computed(() => {
    const p = this.selected();
    const first = p?.name?.split(' ')[0] ?? '';
    const prices = this.plans()
      .filter(pl => pl.durationDays === 30 || pl.durationDays === 90)
      .map(pl => `${pl.name} : ${pl.price.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`)
      .join('. ');
    switch (this.template()) {
      case 'J1':
        return `Bonjour ${first}, merci pour votre visite à ${this.gymName}.\n${prices ? prices + '.\n' : ''}On vous attend !`;
      case 'J3':
        return `Bonjour ${first}, venez tester une séance d’essai cette semaine à ${this.gymName}.\nRépondez simplement avec le jour qui vous arrange.`;
      default:
        return `Bonjour ${first}, dernière invitation de notre part.\nL’inscription à ${this.gymName} se fait en 2 minutes à l’accueil.`;
    }
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('phone')) this.newPhone.set(q.get('phone')!);
    if (q.get('new') || q.get('phone')) setTimeout(() => this.phoneInput()?.nativeElement.focus());
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => (this.gymName = s.name ?? 'la salle'));
    this.api.plans().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => this.plans.set(p));
    this.load();
    const convertId = Number(q.get('convert'));
    if (convertId) this.api.prospect(convertId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => this.convert(p));
  }

  load(): void {
    this.api.prospects(this.scope()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => {
      this.list.set(list);
      if (!list.some(p => p.id === this.selectedId())) this.select(list[0]?.id ?? null);
    });
    this.api.prospects('OPEN').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => this.allOpen.set(list));
    if (this.scope() === 'CLOSED') this.api.prospectStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.stats.set(s));
  }

  setScope(scope: Scope): void {
    this.scope.set(scope);
    this.load();
  }

  select(id: number | null): void {
    this.selectedId.set(id);
    this.events.set([]);
    if (id) this.api.prospectEvents(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(e => this.events.set(e));
    const p = this.list().find(x => x.id === id);
    this.template.set(!p || p.followUpStep === 0 ? 'J1' : p.followUpStep === 1 ? 'J3' : 'J7');
  }

  add(): void {
    const digits = this.newPhone().replace(/\D/g, '');
    if (digits.length < 8) {
      this.addMessage.set({ text: 'Indiquez un numéro de téléphone complet.', ok: false });
      return;
    }
    this.adding.set(true);
    this.api
      .createProspect({ phone: this.newPhone().trim(), source: this.newSource(), name: this.newName().trim() || null, interestedPlan: this.newPlan() || null, notes: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => {
          this.adding.set(false);
          this.addMessage.set({ text: `Prospect ajouté avec une chance initiale de ${p.score} %. Relance J+1 prévue demain.`, ok: true });
          this.newPhone.set('');
          this.newName.set('');
          this.scope.set('OPEN');
          this.load();
          this.select(p.id);
        },
        error: err => {
          this.adding.set(false);
          this.addMessage.set({ text: apiError(err, 'Ajout impossible.'), ok: false });
        },
      });
  }

  interaction(type: 'REPLY' | 'VISIT' | 'TRIAL'): void {
    const p = this.selected();
    if (!p) return;
    this.api.prospectInteraction(p.id, type).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(updated => this.afterUpdate(updated));
  }

  /** Ouvre WhatsApp ou SMS avec le modèle choisi, puis enregistre la relance */
  send(channel: ReminderChannel): void {
    const p = this.selected();
    if (!p) return;
    const url = channel === 'WHATSAPP' ? whatsappLink(p.phone, this.templateText()) : smsLink(p.phone, this.templateText());
    window.open(url, '_blank', 'noopener');
    this.api.prospectFollowUp(p.id, channel).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(updated => {
      this.toast.success(`Relance ${this.template().replace('J', 'J+')} enregistrée.`);
      this.afterUpdate(updated);
    });
  }

  lose(): void {
    const p = this.selected();
    if (!p) return;
    this.api.prospectLost(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(updated => {
      this.toast.success(`${updated.name ?? 'Prospect'} marqué perdu.`);
      this.load();
    });
  }

  /** Conversion en un clic : la fiche membre reprend le nom et le téléphone */
  convert(p: Prospect): void {
    const [firstName, ...rest] = (p.name ?? '').split(' ');
    this.converting.set({ firstName, lastName: rest.join(' '), phone: p.phone, prospectId: p.id, planName: p.interestedPlan });
  }

  onConverted(): void {
    this.converting.set(null);
    this.toast.success('Prospect converti en membre.');
    this.router.navigate([], { queryParams: {} });
    this.load();
  }

  /** Remplace le prospect modifié dans les listes et recharge son historique */
  private afterUpdate(p: Prospect): void {
    this.list.update(list => list.map(x => (x.id === p.id ? p : x)));
    this.allOpen.update(list => list.map(x => (x.id === p.id ? p : x)));
    this.api.prospectEvents(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(e => this.events.set(e));
  }

  scoreTone(p: Prospect): string {
    return p.lastChance ? 'low' : p.score >= 60 ? 'high' : 'mid';
  }

  nextText(p: Prospect): string {
    if (p.status === 'CONVERTED') return `Converti le ${frDate(p.closedAt)}`;
    if (p.status === 'LOST') return `Perdu le ${frDate(p.closedAt)}`;
    if (p.lastChance) return 'Dernière chance';
    if (!p.nextFollowUp) return 'Relances terminées';
    return p.dueToday ? `Relance ${['J+1', 'J+3', 'J+7'][Math.min(p.followUpStep, 2)]} aujourd’hui` : `Relance le ${frDate(p.nextFollowUp).slice(0, 5)}`;
  }
}
