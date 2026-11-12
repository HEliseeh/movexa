import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from './auth.models';

@Injectable({ providedIn: 'root' })
export class CurrentUserStore {
  private http = inject(HttpClient);

  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly roles = computed(() => this._user()?.authorities ?? []);
  /** Gérant de la salle (ROLE_ADMIN) : formules, annulations, chiffres, paramètres */
  readonly isManager = computed(() => this.roles().includes('ROLE_ADMIN'));

  hasAnyRole(required: string[]): boolean {
    return required.some(r => this.roles().includes(r));
  }

  /** Charge le profil une seule fois (sauf si force = true). */
  load(force = false): Observable<User | null> {
    if (this._user() && !force) return of(this._user());
    return this.http
      .get<User>(`${environment.apiUrl}/account`)
      .pipe(tap(u => this._user.set(u)));
  }

  clear(): void {
    this._user.set(null);
  }
}