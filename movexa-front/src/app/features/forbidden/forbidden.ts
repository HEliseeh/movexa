import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Page affichée quand une action est réservée à un autre rôle (réponse 403). */
@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div class="page">
      <section class="card forbidden">
        <h1 class="page-title">Accès réservé</h1>
        <p>Cette page ou cette action est réservée au gérant de la salle.</p>
        <a routerLink="/reception" class="btn btn-primary">Revenir à l’accueil</a>
      </section>
    </div>
  `,
  styles: `
    .forbidden { max-width: 520px; display: flex; flex-direction: column; gap: var(--space-3); align-items: flex-start; }
    p { margin: 0; color: var(--color-text-muted); }
  `,
})
export class Forbidden {}
