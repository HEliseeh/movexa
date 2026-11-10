import { Component, inject } from '@angular/core';
import { ToastService } from '@core/notifications/toast.service';

/** Affiche les notifications du ToastService. À placer une seule fois (layout connecté). */
@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (t of toasts.messages(); track t.id) {
        <div class="toast" [class.toast--error]="t.tone === 'error'">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="toast-icon">
            <path [attr.d]="t.tone === 'error' ? 'M12 8v5M12 16.5v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18' : 'M20 6L9 17l-5-5'" />
          </svg>
          <span class="toast-text">{{ t.text }}</span>
          <button type="button" class="toast-close" aria-label="Fermer la notification" (click)="toasts.dismiss(t.id)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      position: fixed;
      top: calc(var(--header-height) + var(--space-4));
      right: var(--space-6);
      z-index: var(--z-toast);
      max-width: calc(100% - 2 * var(--space-4));
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      padding: var(--space-3) var(--space-2) var(--space-3) 18px;
      border-radius: 6px;
      background: var(--color-dark-panel);
      color: var(--color-on-dark);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--font-size-base);
      line-height: 22px;
      box-shadow: 0 8px 24px rgb(22 26 41 / 0.35);
    }
    .toast-icon { flex: 0 0 auto; color: var(--color-primary); }
    .toast--error .toast-icon { color: #f0a39c; }
    .toast-text { flex: 1 1 auto; }
    .toast-close {
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--color-on-dark-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .toast-close:hover { color: var(--color-on-dark); }
    @media (max-width: 600px) {
      .toast-stack { right: var(--space-4); }
    }
  `,
})
export class Toast {
  protected readonly toasts = inject(ToastService);
}
