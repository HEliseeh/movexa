import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error';
}

const DURATION_MS = 4000;

/**
 * Notifications « toast » de l'application (en haut à droite).
 * Un service transversal : n'importe quelle feature peut l'injecter et appeler success() / error().
 * L'affichage est fait par le composant <app-toast>, placé une seule fois dans le layout connecté.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  success(text: string): void {
    this.push(text, 'success');
  }

  error(text: string): void {
    this.push(text, 'error');
  }

  dismiss(id: number): void {
    this.messages.update(list => list.filter(m => m.id !== id));
  }

  private push(text: string, tone: ToastMessage['tone']): void {
    const id = this.nextId++;
    this.messages.update(list => [...list, { id, text, tone }]);
    setTimeout(() => this.dismiss(id), DURATION_MS);
  }
}
