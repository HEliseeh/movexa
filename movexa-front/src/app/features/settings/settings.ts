import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

export type TeamRole = 'Admin' | 'Coach' | 'Accueil';

export interface TeamMember {
  id: number;
  initials: string;
  name: string;
  role: TeamRole;
}

export interface NotifChannel {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface PaymentMethod {
  id: string;
  label: string;
  enabled: boolean;
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule, NgClass],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  // ---- Profil salle ----
  gymName    = signal('Movexa Gym');
  subdomain  = signal('movexa-gym');
  address    = signal('12 rue des Sportifs, Abidjan');
  phone      = signal('+225 07 00 00 00');

  // ---- Notifications ----
  notifChannels = signal<NotifChannel[]>([
    { id: 'whatsapp', label: 'WhatsApp',           description: 'Rappels de cours et d\'expiration.',     enabled: true  },
    { id: 'sms',      label: 'SMS',                description: 'Utilisé si WhatsApp n\'est pas disponible.', enabled: true  },
    { id: 'email',    label: 'E-mail',             description: 'Reçus de paiement et informations générales.', enabled: false },
    { id: 'push',     label: 'Notifications push', description: 'Dans l\'application mobile.',            enabled: true  },
  ]);

  reminderDays = signal(7);

  // ---- Équipe ----
  team = signal<TeamMember[]>([
    { id: 1, initials: 'AL', name: 'Amadou Ly',      role: 'Admin'   },
    { id: 2, initials: 'SK', name: 'Sarah Konaté',   role: 'Coach'   },
    { id: 3, initials: 'OT', name: 'Omar Traoré',    role: 'Coach'   },
    { id: 4, initials: 'FD', name: 'Fatou Diallo',   role: 'Accueil' },
  ]);

  // ---- Moyens de paiement ----
  paymentMethods = signal<PaymentMethod[]>([
    { id: 'orange-money', label: 'Orange Money',    enabled: true  },
    { id: 'card',         label: 'Carte bancaire',  enabled: true  },
    { id: 'cash',         label: 'Espèces à l\'accueil', enabled: true },
  ]);

  toggleNotif(id: string): void {
    this.notifChannels.update(list =>
      list.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
    );
  }

  togglePayment(id: string): void {
    this.paymentMethods.update(list =>
      list.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  }

  roleClass(role: TeamRole): string {
    const map: Record<TeamRole, string> = {
      Admin:   'role-admin',
      Coach:   'role-coach',
      Accueil: 'role-accueil',
    };
    return map[role];
  }

  save(): void {
    // TODO: appel API PATCH /api/gym/settings
    console.log('Enregistrement paramètres...');
  }

  cancel(): void {
    // TODO: reset form
  }
}
