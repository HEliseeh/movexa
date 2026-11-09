import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type SettingsTab = 'gym' | 'team' | 'payments' | 'reminders';

export interface GymField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'number';
  placeholder: string;
}

export interface TeamMember {
  name: string;
  role: string;
  specialty: string;
  followed: string;
  active: boolean;
}

export interface PaymentMethod {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
}

export interface ReminderRule {
  id: string;
  label: string;
  trigger: string;
  email: boolean;
  sms: boolean;
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  readonly tabs: { id: SettingsTab; label: string }[] = [
    { id: 'gym', label: 'Ma salle' },
    { id: 'team', label: 'Personnel et coachs' },
    { id: 'payments', label: 'Paiements et reçus' },
    { id: 'reminders', label: 'Relances' },
  ];
  readonly tab = signal<SettingsTab>('gym');

  // ---- Ma salle ----
  readonly gymFields: GymField[] = [
    { id: 'gym-name', label: 'Nom de la salle', type: 'text', placeholder: 'Nom de la salle' },
    { id: 'gym-phone', label: 'Téléphone', type: 'tel', placeholder: 'Téléphone' },
    { id: 'gym-email', label: 'E-mail de contact', type: 'email', placeholder: 'E-mail' },
    { id: 'gym-address', label: 'Adresse', type: 'text', placeholder: 'Adresse' },
    { id: 'gym-capacity', label: 'Capacité maximale', type: 'number', placeholder: '120' },
    { id: 'gym-hours', label: 'Horaires d’ouverture', type: 'text', placeholder: '06 h 00 à 22 h 00' },
  ];
  readonly gym: Record<string, string> = {};
  readonly savedMessage = signal('');

  // ---- Personnel ----
  readonly team: TeamMember[] = [
    { name: 'Nadia Koné', role: 'Gérante', specialty: 'Administration', followed: 'Sans objet', active: true },
    { name: 'Rose Adjovi', role: 'Réception', specialty: 'Accueil', followed: 'Sans objet', active: true },
    { name: 'Malik T.', role: 'Coach', specialty: 'Musculation', followed: '64', active: true },
    { name: 'Fatou B.', role: 'Coach', specialty: 'Remise en forme', followed: '58', active: true },
    { name: 'Hugo L.', role: 'Coach', specialty: 'Cardio, perte de poids', followed: '47', active: true },
    { name: 'Sena Dossou', role: 'Réception', specialty: 'Accueil', followed: 'Sans objet', active: false },
  ];

  // ---- Paiements ----
  readonly paymentMethods = signal<PaymentMethod[]>([
    { id: 'cash', label: 'Espèces', detail: 'Encaissement au comptoir, reçu généré à la validation.', enabled: true },
    { id: 'momo', label: 'Mobile Money', detail: 'Paiement depuis le téléphone de l’adhérent.', enabled: true },
    { id: 'card', label: 'Carte bancaire', detail: 'Paiement au comptoir ou en ligne.', enabled: true },
  ]);
  receiptNotes = '';

  // ---- Relances ----
  readonly rules = signal<ReminderRule[]>([
    { id: 'd7', label: 'Rappel de fin d’abonnement', trigger: '7 jours avant', email: true, sms: false },
    { id: 'd1', label: 'Rappel de la veille', trigger: '1 jour avant', email: true, sms: true },
    { id: 'unpaid', label: 'Relance d’impayé', trigger: '3 jours après', email: true, sms: true },
    { id: 'absent', label: 'Adhérent absent', trigger: '14 jours sans visite', email: true, sms: false },
  ]);

  selectTab(id: SettingsTab): void {
    this.tab.set(id);
    this.savedMessage.set('');
  }

  togglePayment(id: string): void {
    this.paymentMethods.update(list => list.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }

  toggleRule(id: string, channel: 'email' | 'sms'): void {
    this.rules.update(list => list.map(r => (r.id === id ? { ...r, [channel]: !r[channel] } : r)));
  }

  save(): void {
    // TODO: appel API PATCH /api/gym/settings
    this.savedMessage.set('Modifications enregistrées.');
  }
}
