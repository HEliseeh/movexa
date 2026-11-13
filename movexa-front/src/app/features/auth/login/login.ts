import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { switchMap } from 'rxjs';
import { CurrentUserStore } from '@core/auth/current-user.store';
import { Logo } from '@shared/logo/logo';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Logo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private store = inject(CurrentUserStore);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
  
    this.loading.set(true);
    this.errorMessage.set(null);
  
    this.auth
      .login(this.form.getRawValue())
      .pipe(switchMap(() => this.store.load(true)))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/reception']);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.auth.logout();
          this.store.clear();
          this.errorMessage.set(
            err.status === 401
              ? 'Identifiant ou mot de passe incorrect.'
              : 'Connexion impossible. Réessayez plus tard.'
          );
        },
      });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}
