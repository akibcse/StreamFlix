import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { VisitorLogService } from './services/visitor-log.service';
import { UserActivityService } from './services/user-activity.service';
import { AppUser } from './models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <header class="app-nav">
      <div class="nav-container">
        <div class="nav-left">
          <a routerLink="/" class="brand-logo">
            <span class="brand-gradient">Stream</span>Flix
          </a>

          <nav class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">
              Home
            </a>
            <a routerLink="/movies" routerLinkActive="active" class="nav-link">
              Movies
            </a>
            <a routerLink="/tv" routerLinkActive="active" class="nav-link">
              TV Series
            </a>
            <a routerLink="/search" routerLinkActive="active" class="nav-link">
              🔍 Search
            </a>
            <a routerLink="/my-list" routerLinkActive="active" class="nav-link">
              📑 My List
            </a>
            <a routerLink="/admin" routerLinkActive="active" class="nav-link admin-nav-link">
              🛡️ Admin
            </a>
          </nav>
        </div>

        <div class="nav-right">
          <ng-container *ngIf="currentUser$ | async as user; else guestTpl">
            <div class="user-profile-menu">
              <span *ngIf="user.role === 'admin'" class="admin-chip">Admin</span>
              <div class="user-avatar">
                {{ getUserInitial(user) }}
              </div>
              <span class="user-name">{{ getUserName(user) }}</span>
              <button (click)="logout()" class="btn-logout" title="Sign Out">
                Sign Out
              </button>
            </div>
          </ng-container>

          <ng-template #guestTpl>
            <div class="guest-actions">
              <a routerLink="/login" class="btn-signin">Sign In</a>
              <a routerLink="/register" class="btn-signup">Sign Up</a>
            </div>
          </ng-template>
        </div>
      </div>
    </header>

    <main class="page-body">
      <router-outlet></router-outlet>
    </main>

    <!-- MOBILE BOTTOM NAVIGATION BAR -->
    <nav class="mobile-bottom-nav">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="mobile-tab">
        <span class="tab-icon">🏠</span>
        <span class="tab-text">Home</span>
      </a>
      <a routerLink="/movies" routerLinkActive="active" class="mobile-tab">
        <span class="tab-icon">🎬</span>
        <span class="tab-text">Movies</span>
      </a>
      <a routerLink="/tv" routerLinkActive="active" class="mobile-tab">
        <span class="tab-icon">📺</span>
        <span class="tab-text">Series</span>
      </a>
      <a routerLink="/search" routerLinkActive="active" class="mobile-tab">
        <span class="tab-icon">🔍</span>
        <span class="tab-text">Search</span>
      </a>
      <a routerLink="/my-list" routerLinkActive="active" class="mobile-tab">
        <span class="tab-icon">📑</span>
        <span class="tab-text">My List</span>
      </a>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #0b0e14;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .app-nav {
      background: rgba(11, 14, 20, 0.92);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .nav-container {
      max-width: 1500px;
      margin: 0 auto;
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .brand-logo {
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      text-decoration: none;
      letter-spacing: -0.02em;
    }

    .brand-gradient {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .nav-link {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.92rem;
      font-weight: 500;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .nav-link:hover, .nav-link.active {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }

    .admin-nav-link {
      color: #fbbf24;
    }

    .admin-nav-link:hover, .admin-nav-link.active {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }

    .nav-right {
      display: flex;
      align-items: center;
    }

    .guest-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-signin {
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      padding: 0.45rem 1rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .btn-signin:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }

    .btn-signup {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0.45rem 1.1rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .btn-signup:hover {
      opacity: 0.95;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
    }

    .user-profile-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .admin-chip {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
    }

    .user-name {
      color: #f1f5f9;
      font-size: 0.9rem;
      font-weight: 500;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-logout {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    .page-body {
      min-height: calc(100vh - 75px);
    }

    /* Mobile Bottom Nav */
    .mobile-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(11, 14, 20, 0.96);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 1000;
      padding: 0.5rem 0.25rem max(0.5rem, env(safe-area-inset-bottom));
      justify-content: space-around;
      align-items: center;
    }

    .mobile-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.72rem;
      font-weight: 500;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      transition: color 0.2s;
    }

    .mobile-tab .tab-icon {
      font-size: 1.25rem;
    }

    .mobile-tab.active {
      color: #818cf8;
    }

    @media (max-width: 768px) {
      .nav-links { display: none; }
      .mobile-bottom-nav { display: flex; }
      .page-body { padding-bottom: 60px; }
      .user-name { display: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly visitorService = inject(VisitorLogService);
  private readonly router = inject(Router);

  readonly currentUser$ = this.auth.currentUser$;
  readonly isAdmin$ = this.auth.isAdmin$;

  ngOnInit(): void {
    this.visitorService.startTracking();
  }

  getUserName(user: AppUser): string {
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'User';
  }

  getUserInitial(user: AppUser): string {
    const name = user.displayName || user.email || 'U';
    return name.charAt(0).toUpperCase();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
