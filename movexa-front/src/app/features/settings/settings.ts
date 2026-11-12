import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { GatewayUser, GymSettings } from '@core/api/api.models';
import { MovexaApi } from '@core/api/movexa-api.service';
import { ToastService } from '@core/notifications/toast.service';
import { apiError } from '@shared/format';

type Tab = 'gym' | 'users' | 'pay' | 'reminders' | 'prospects';
type BoolKey = { [K in keyof GymSettings]: GymSettings[K] extends boolean ? K : never }[keyof GymSettings];
type NumKey = { [K in keyof GymSettings]: GymSettings[K] extends number ? K : never }[keyof GymSettings];

/**
 * Paramètres de la salle (gérant uniquement). Un seul objet côté serveur, édité par onglets ;
 * « Enregistrer » envoie l'ensemble.
 */
@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  private readonly api = inject(MovexaApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs: [Tab, string][] = [
    ['gym', 'Ma salle'],
    ['users', 'Utilisateurs et rôles'],
    ['pay', 'Paiements et reçus'],
    ['reminders', 'Relances'],
    ['prospects', 'Prospects'],
  ];

  readonly gymFields: { key: keyof GymSettings; label: string; type: string; placeholder: string }[] = [
    { key: 'name', label: 'Nom de la salle', type: 'text', placeholder: 'Ex. Fitness Club Cotonou' },
    { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: 'Ex. 97 00 11 22' },
    { key: 'momoNumber', label: 'Numéro MTN MoMo de la salle', type: 'tel', placeholder: 'Indiqué dans les rappels' },
    { key: 'moovNumber', label: 'Numéro Moov Money de la salle', type: 'tel', placeholder: '' },
    { key: 'address', label: 'Adresse', type: 'text', placeholder: 'Quartier, ville' },
    { key: 'openingHours', label: 'Horaires d’ouverture', type: 'text', placeholder: '06 h 00 à 22 h 00' },
    { key: 'receiptFooter', label: 'Mention en bas des reçus', type: 'text', placeholder: 'Merci de votre confiance.' },
  ];

  readonly methodToggles: { key: BoolKey; label: string; detail: string }[] = [
    { key: 'cashEnabled', label: 'Espèces', detail: 'Toujours disponible, même hors connexion.' },
    { key: 'mtnEnabled', label: 'MTN MoMo', detail: 'Reçu directement sur le numéro de la salle.' },
    { key: 'moovEnabled', label: 'Moov Money', detail: 'Reçu directement sur le numéro de la salle.' },
  ];

  readonly reminderRules: { label: string; when: string; sms: BoolKey; wa: BoolKey }[] = [
    { label: 'Rappel avant la fin', when: '7 jours avant', sms: 'reminderBefore7Sms', wa: 'reminderBefore7Whatsapp' },
    { label: 'Rappel la veille', when: '1 jour avant', sms: 'reminderBefore1Sms', wa: 'reminderBefore1Whatsapp' },
    { label: 'Après expiration', when: '1 jour après', sms: 'reminderAfter1Sms', wa: 'reminderAfter1Whatsapp' },
    { label: 'Dernier rappel', when: '7 jours après', sms: 'reminderAfter7Sms', wa: 'reminderAfter7Whatsapp' },
  ];

  readonly sourceScores: { key: NumKey; label: string }[] = [
    { key: 'scoreReferral', label: 'Parrainage' },
    { key: 'scoreWalkIn', label: 'Passage à l’accueil' },
    { key: 'scoreWordOfMouth', label: 'Bouche-à-oreille' },
    { key: 'scoreSocial', label: 'Réseaux sociaux' },
    { key: 'scoreFlyer', label: 'Flyer' },
    { key: 'scoreOther', label: 'Autre' },
  ];

  readonly prospectRules: { key: NumKey; label: string; unit: string }[] = [
    { key: 'pointsReply', label: 'Le prospect répond à un message', unit: 'points' },
    { key: 'pointsVisit', label: 'Il demande un tarif ou visite la salle', unit: 'points' },
    { key: 'pointsTrial', label: 'Il fait une séance d’essai', unit: 'points' },
    { key: 'graceDays', label: 'Délai de grâce sans interaction', unit: 'jours' },
    { key: 'decayPerDay', label: 'Baisse quotidienne après ce délai', unit: 'points' },
    { key: 'alertThreshold', label: 'Alerte « dernière chance » sous', unit: '%' },
  ];

  readonly permissions: [string, string][] = [
    ['Créer ou modifier les formules', 'Non'],
    ['Inscrire un membre', 'Oui'],
    ['Enregistrer un paiement', 'Oui'],
    ['Annuler ou corriger un paiement', 'Demande au gérant'],
    ['Pointer une entrée', 'Oui'],
    ['Voir le tableau de bord financier', 'Non'],
    ['Créer des comptes utilisateurs', 'Non'],
  ];

  readonly tab = signal<Tab>('gym');
  readonly settings = signal<GymSettings | null>(null);
  readonly users = signal<GatewayUser[]>([]);
  readonly usersError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saved = signal('');

  ngOnInit(): void {
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.settings.set({ ...s }));
    this.api.users().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: u => this.users.set(u),
      error: () => this.usersError.set('Liste des comptes indisponible (réservée à l’administrateur du gateway).'),
    });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.saved.set('');
  }

  value(key: keyof GymSettings): string | number | boolean | null {
    return this.settings()?.[key] ?? null;
  }

  set(key: keyof GymSettings, value: unknown): void {
    this.settings.update(s => (s ? { ...s, [key]: value } : s));
    this.saved.set('');
  }

  toggle(key: BoolKey): void {
    this.set(key, !this.value(key));
  }

  roleLabel(u: GatewayUser): string {
    if (u.authorities.includes('ROLE_ADMIN')) return 'Gérant';
    if (u.authorities.includes('ROLE_RECEPTION')) return 'Réceptionniste';
    return u.authorities.join(', ');
  }

  save(): void {
    const s = this.settings();
    if (!s) return;
    this.saving.set(true);
    this.api.saveSettings(s).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.saving.set(false);
        this.settings.set({ ...updated });
        this.saved.set('Modifications enregistrées.');
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(apiError(err, 'Enregistrement impossible.'));
      },
    });
  }

  runDecay(): void {
    this.api.runProspectDecay().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.toast.success('Nettoyage des prospects effectué.'),
      error: err => this.toast.error(apiError(err)),
    });
  }
}
