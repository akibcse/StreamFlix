import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="glitch-code">404</div>
        <h1 class="title">Lost in Cyberspace?</h1>
        <p class="subtitle">
          The movie or page you are looking for has been moved, deleted, or never existed in this dimension.
        </p>
        <div class="actions">
          <a routerLink="/" class="btn-primary">
            <span>🏠</span> Return Home
          </a>
          <a routerLink="/search" class="btn-secondary">
            <span>🔍</span> Search Movies
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      background: radial-gradient(circle at 50% 40%, rgba(99, 102, 241, 0.12) 0%, transparent 60%);
    }
    .not-found-content {
      max-width: 520px;
    }
    .glitch-code {
      font-size: clamp(5rem, 15vw, 9rem);
      font-weight: 900;
      letter-spacing: -0.05em;
      line-height: 1;
      background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
      animation: pulse 3s ease-in-out infinite;
    }
    .title {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    .subtitle {
      font-size: 1.05rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.6rem;
      border-radius: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      transform: translateY(-2px);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(0.98); }
    }
  `]
})
export class NotFoundComponent {}
