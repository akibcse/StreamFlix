import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="admin-auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="shield-badge">🛡️</div>
          <h1 class="auth-title">Admin Control Portal</h1>
          <p class="auth-subtitle">Restricted system for StreamFlix administrators</p>
        </div>

        <div class="alert alert-danger" *ngIf="errorMessage()">
          {{ errorMessage() }}
        </div>

        <div class="alert alert-success" *ngIf="successMessage()">
          {{ successMessage() }}
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="email">Administrator Email</label>
            <input
              id="email"
              type="email"
              class="form-input"
              formControlName="email"
              placeholder="admin@streamflix.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              type="password"
              class="form-input"
              formControlName="password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Authenticating...' : 'Sign In as Admin' }}
          </button>
        </form>

        <div class="divider">
          <span>Or Quick Admin Unlock</span>
        </div>

        <!-- Admin Passcode Unlock Box -->
        <div class="passcode-box">
          <label class="form-label">Admin Secret Passcode</label>
          <div class="passcode-row">
            <input
              type="password"
              class="form-input"
              [(ngModel)]="passcode"
              placeholder="Enter master passcode"
            />
            <button
              type="button"
              class="btn-unlock"
              (click)="unlockAdmin()"
              [disabled]="loading() || !passcode().trim()"
            >
              Unlock
            </button>
          </div>
          <span class="passcode-hint">Default Master Key: <code>streamflix-admin-2026</code></span>
        </div>

        <div class="auth-footer">
          <a routerLink="/" class="back-link">← Return to StreamFlix</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: calc(100vh - 75px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background-color: #0b0e14;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 2.25rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.15);
    }
    .shield-badge {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-title { font-size: 1.75rem; font-weight: 800; color: #ffffff; margin: 0 0 0.5rem; }
    .auth-subtitle { color: #94a3b8; font-size: 0.9rem; margin: 0; }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .alert-danger { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
    .alert-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.45rem; }
    .form-label { font-size: 0.85rem; font-weight: 500; color: #cbd5e1; }
    .form-input {
      background: rgba(11, 14, 20, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #ffffff;
      font-size: 0.95rem;
      outline: none;
    }
    .form-input:focus { border-color: #6366f1; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.85rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .divider {
      display: flex;
      align-items: center;
      margin: 1.75rem 0 1.25rem;
      color: #64748b;
      font-size: 0.8rem;
      text-transform: uppercase;
    }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .divider span { padding: 0 0.75rem; }
    .passcode-box {
      background: rgba(11, 14, 20, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .passcode-row { display: flex; gap: 0.5rem; }
    .passcode-row input { flex: 1; }
    .btn-unlock {
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .passcode-hint { font-size: 0.75rem; color: #64748b; }
    .passcode-hint code { color: #a5b4fc; }
    .auth-footer { text-align: center; margin-top: 1.75rem; }
    .back-link { color: #94a3b8; text-decoration: none; font-size: 0.88rem; }
    .back-link:hover { color: #ffffff; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly passcode = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.auth.login(email!, password!);
      const user = this.auth.currentUser;
      if (user?.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.errorMessage.set('Account authenticated, but you lack admin privileges. Use the passcode below to claim admin access.');
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Login failed.');
    } finally {
      this.loading.set(false);
    }
  }

  async unlockAdmin(): Promise<void> {
    if (this.passcode().trim() !== 'streamflix-admin-2026') {
      this.errorMessage.set('Invalid admin secret passcode.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const user = this.auth.currentUser;
    if (user) {
      await this.auth.updateUserRole(user.uid, 'admin');
      this.successMessage.set('Administrator access granted! Redirecting...');
      setTimeout(() => this.router.navigate(['/admin']), 1200);
    } else {
      this.errorMessage.set('Please sign in or enter your credentials above first to grant admin status to your account.');
    }
    this.loading.set(false);
  }
}
