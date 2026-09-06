import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="icon-wrap">🔑</div>
          <h2>Reset Password</h2>
          <p>Enter your email address and we'll send you instructions to reset your password.</p>
        </div>

        <div *ngIf="successMessage" class="alert-success">
          <span>✓</span> {{ successMessage }}
        </div>

        <div *ngIf="errorMessage" class="alert-error">
          <span>⚠️</span> {{ errorMessage }}
        </div>

        <form (ngSubmit)="onSubmit()" #forgotForm="ngForm" class="auth-form" *ngIf="!successMessage">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              placeholder="you@example.com"
              class="form-control"
              [disabled]="loading"
            />
          </div>

          <button type="submit" class="btn-submit" [disabled]="forgotForm.invalid || loading">
            <span *ngIf="!loading">Send Reset Link</span>
            <span *ngIf="loading" class="spinner-text">Sending...</span>
          </button>
        </form>

        <div class="auth-footer">
          Remember your password?
          <a routerLink="/login" class="link">Sign In</a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./auth.css'],
  styles: [`
    .icon-wrap {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      display: inline-block;
    }
    .alert-success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      padding: 1rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.95rem;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 0.85rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.9rem;
    }
  `]
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);

  email = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  async onSubmit(): Promise<void> {
    if (!this.email) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.authService.resetPassword(this.email.trim());
      this.successMessage = 'A password reset link has been sent to your email. Please check your inbox.';
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        this.errorMessage = 'No user found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        this.errorMessage = 'Invalid email address format.';
      } else {
        this.errorMessage = err.message || 'Failed to send reset email. Please try again.';
      }
    } finally {
      this.loading = false;
    }
  }
}
