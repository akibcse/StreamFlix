import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-layout">
      <!-- MOBILE OVERLAY BACKDROP -->
      <div class="sidebar-overlay" [class.visible]="sidebarOpen" (click)="sidebarOpen = false"></div>

      <!-- SIDEBAR -->
      <aside class="admin-sidebar" [class.open]="sidebarOpen">

        <!-- Brand Header -->
        <div class="sidebar-brand">
          <div class="brand-inner">
            <div class="brand-icon">
              <span class="brand-icon-text">⚡</span>
            </div>
            <div class="brand-text">
              <div class="brand-title">
                <span class="brand-gradient">{{ brandFirst }}</span>{{ brandRest }}
              </div>
              <div class="brand-subtitle">Admin Panel</div>
            </div>
          </div>
          <button class="btn-close-sidebar" (click)="sidebarOpen = false" aria-label="Close sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-group-label">Overview</div>
            <a routerLink="/admin/dashboard" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">📊</span>
              <span class="nav-label">Dashboard</span>
            </a>
            <a routerLink="/admin/analytics" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">📈</span>
              <span class="nav-label">Analytics & Traffic</span>
            </a>
            <a routerLink="/admin/visitors" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">👁️</span>
              <span class="nav-label">Visitor Logs</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-group-label">Content CMS</div>
            <a routerLink="/admin/movies" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">🎬</span>
              <span class="nav-label">Movies & Import</span>
            </a>
            <a routerLink="/admin/tv" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">📺</span>
              <span class="nav-label">TV Series</span>
            </a>
            <a routerLink="/admin/genres" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">🏷️</span>
              <span class="nav-label">Genres & Tags</span>
            </a>
            <a routerLink="/admin/servers" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">🖥️</span>
              <span class="nav-label">Streaming Servers</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-group-label">Community</div>
            <a routerLink="/admin/users" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">👥</span>
              <span class="nav-label">Users & Accounts</span>
            </a>
            <a routerLink="/admin/reviews" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">💬</span>
              <span class="nav-label">Reviews Moderation</span>
            </a>
            <a routerLink="/admin/roles" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">🛡️</span>
              <span class="nav-label">Roles & Permissions</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-group-label">Configuration</div>
            <a routerLink="/admin/settings" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">⚙️</span>
              <span class="nav-label">Site Settings</span>
            </a>
            <a routerLink="/admin/seo" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">🔍</span>
              <span class="nav-label">SEO & Metadata</span>
            </a>
            <a routerLink="/admin/ads" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">📢</span>
              <span class="nav-label">Advertisements</span>
            </a>
            <a routerLink="/admin/notifications" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">🔔</span>
              <span class="nav-label">Push Notifications</span>
            </a>
            <a routerLink="/admin/logs" routerLinkActive="active" (click)="sidebarOpen = false" class="nav-item">
              <span class="nav-icon">📜</span>
              <span class="nav-label">System Logs</span>
            </a>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <a routerLink="/" class="btn-view-site" (click)="sidebarOpen = false">
            <span>🌐</span>
            <span>View Public Site</span>
          </a>
        </div>
      </aside>

      <!-- MAIN WRAPPER -->
      <div class="admin-main">
        <!-- TOPBAR -->
        <header class="admin-topbar">
          <div class="topbar-left">
            <button class="btn-toggle-sidebar" (click)="sidebarOpen = !sidebarOpen" aria-label="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div class="topbar-title">
              <span class="topbar-site-name">{{ siteName }}</span>
              <span class="topbar-sep">›</span>
              <span class="topbar-section">Control Center</span>
            </div>
          </div>

          <div class="topbar-right">
            <div class="admin-user-pill" *ngIf="user$ | async as user">
              <span class="status-dot"></span>
              <span class="user-email-text">{{ user.email }}</span>
            </div>
            <button (click)="logout()" class="btn-admin-logout" title="Sign Out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span class="logout-text">Sign Out</span>
            </button>
          </div>
        </header>

        <!-- CONTENT AREA -->
        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #070a10;
      color: #f0f6fc;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* ─── OVERLAY BACKDROP ─────────────────────────── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 199;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    @media (max-width: 960px) {
      .sidebar-overlay { display: block; pointer-events: none; }
      .sidebar-overlay.visible { opacity: 1; pointer-events: all; }
    }

    /* ─── SIDEBAR ──────────────────────────────────── */
    .admin-sidebar {
      width: 265px;
      background: linear-gradient(180deg, #0d1117 0%, #0a0e16 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 200;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .admin-sidebar::-webkit-scrollbar { width: 4px; }
    .admin-sidebar::-webkit-scrollbar-track { background: transparent; }
    .admin-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

    @media (max-width: 960px) {
      .admin-sidebar {
        position: fixed;
        left: 0; top: 0; bottom: 0;
        transform: translateX(-100%);
        box-shadow: none;
      }
      .admin-sidebar.open {
        transform: translateX(0);
        box-shadow: 20px 0 60px rgba(0, 0, 0, 0.7);
      }
    }

    /* ─── BRAND ────────────────────────────────────── */
    .sidebar-brand {
      padding: 1.35rem 1.25rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(255,255,255,0.01);
      flex-shrink: 0;
    }

    .brand-inner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .brand-icon-text { font-size: 1rem; filter: brightness(10); }

    .brand-text { display: flex; flex-direction: column; gap: 0.05rem; }

    .brand-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: white;
      letter-spacing: -0.01em;
      line-height: 1;
    }

    .brand-gradient {
      background: linear-gradient(135deg, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 0.65rem;
      font-weight: 600;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .btn-close-sidebar {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 30px; height: 30px;
      border-radius: 8px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-close-sidebar:hover { background: rgba(255,255,255,0.12); color: white; }
    @media (max-width: 960px) { .btn-close-sidebar { display: flex; } }

    /* ─── NAV ──────────────────────────────────────── */
    .sidebar-nav {
      padding: 0.75rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0;
      flex: 1;
    }

    .nav-section { margin-bottom: 0.5rem; }

    .nav-group-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0.9rem 0.625rem 0.4rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
      color: #64748b;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.18s ease;
      position: relative;
      margin-bottom: 1px;
    }

    .nav-item:hover { background: rgba(255, 255, 255, 0.05); color: #e2e8f0; }

    .nav-item.active {
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.08) 100%);
      color: #ffffff;
      font-weight: 600;
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0; top: 20%; bottom: 20%;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: linear-gradient(180deg, #6366f1, #a855f7);
    }

    .nav-icon { font-size: 1rem; line-height: 1; width: 20px; text-align: center; flex-shrink: 0; }
    .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ─── SIDEBAR FOOTER ────────────────────────────── */
    .sidebar-footer {
      padding: 0.875rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      flex-shrink: 0;
    }

    .btn-view-site {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.7rem;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 10px;
      color: #818cf8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-view-site:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }

    /* ─── TOPBAR ───────────────────────────────────── */
    .admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    .admin-topbar {
      height: 62px;
      background: rgba(13, 17, 23, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 50;
      gap: 1rem;
    }

    @media (max-width: 960px) { .admin-topbar { padding: 0 1rem; } }

    .topbar-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }

    .btn-toggle-sidebar {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 38px; height: 38px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-toggle-sidebar:hover { background: rgba(255,255,255,0.1); color: white; }
    @media (min-width: 961px) { .btn-toggle-sidebar { display: none; } }

    .topbar-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      min-width: 0;
      overflow: hidden;
    }

    .topbar-site-name { color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topbar-sep { color: #334155; flex-shrink: 0; }
    .topbar-section { color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    @media (max-width: 480px) { .topbar-section, .topbar-sep { display: none; } }

    .topbar-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

    .admin-user-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.35rem 0.85rem 0.35rem 0.6rem;
      border-radius: 20px;
      font-size: 0.78rem;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.07);
      max-width: 200px;
      overflow: hidden;
    }

    @media (max-width: 600px) { .admin-user-pill { display: none; } }

    .status-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
      flex-shrink: 0;
    }

    .user-email-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .btn-admin-logout {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 0.4rem 0.9rem;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-admin-logout:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); }

    @media (max-width: 480px) {
      .logout-text { display: none; }
      .btn-admin-logout { padding: 0.4rem; width: 36px; height: 36px; justify-content: center; }
    }

    /* ─── CONTENT ──────────────────────────────────── */
    .admin-content {
      padding: 1.75rem 2rem;
      flex: 1;
      max-width: 1500px;
      width: 100%;
      margin: 0 auto;
    }

    @media (max-width: 768px) { .admin-content { padding: 1.25rem; } }
    @media (max-width: 480px) { .admin-content { padding: 1rem 0.875rem; } }
  `]
})
export class AdminShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);
  private sub?: Subscription;

  sidebarOpen = false;
  user$ = this.auth.currentUser$;
  siteName = 'StreamFlix';
  brandFirst = 'Stream';
  brandRest = 'Flix';

  ngOnInit(): void {
    this.sub = this.settingsService.settings$.subscribe(s => {
      const name = s.siteName || 'StreamFlix';
      this.siteName = name;
      // Split: if starts with 'Stream', always highlight 'Stream'
      if (name.toLowerCase().startsWith('stream')) {
        this.brandFirst = 'Stream';
        this.brandRest = name.slice(6); // everything after 'Stream'
      } else {
        const half = Math.ceil(name.length / 2);
        this.brandFirst = name.slice(0, half);
        this.brandRest = name.slice(half);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
