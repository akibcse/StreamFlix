import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { AnalyticsService } from '../../../../services/analytics.service';
import { VisitorLogService } from '../../../../services/visitor-log.service';
import { AdminLog } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-wrap">
      <!-- WELCOME BANNER -->
      <div class="welcome-banner">
        <div>
          <h1>Welcome back, Admin 👋</h1>
          <p>Here is what's happening on StreamFlix today.</p>
        </div>
        <div class="quick-buttons">
          <a routerLink="/admin/movies" class="btn-quick primary">
            <span>🎬</span> Import Movies
          </a>
          <a routerLink="/admin/notifications" class="btn-quick secondary">
            <span>📢</span> Send Notification
          </a>
        </div>
      </div>

      <!-- METRICS TILES -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon users-icon">👥</div>
          <div class="metric-data">
            <span class="metric-value">{{ totalUsers }}</span>
            <span class="metric-label">Total Users</span>
          </div>
          <div class="metric-trend up">+ Active</div>
        </div>

        <div class="metric-card">
          <div class="metric-icon visitors-icon">👁️</div>
          <div class="metric-data">
            <span class="metric-value">{{ totalVisitors }}</span>
            <span class="metric-label">Visitor Sessions</span>
          </div>
          <div class="metric-trend up">Live logged</div>
        </div>

        <div class="metric-card">
          <div class="metric-icon movies-icon">🎬</div>
          <div class="metric-data">
            <span class="metric-value">{{ totalOverrides }}</span>
            <span class="metric-label">Catalog Overrides</span>
          </div>
          <div class="metric-trend">Custom CMS</div>
        </div>

        <div class="metric-card">
          <div class="metric-icon servers-icon">🖥️</div>
          <div class="metric-data">
            <span class="metric-value">{{ activeServers }}</span>
            <span class="metric-label">Active Stream Servers</span>
          </div>
          <div class="metric-trend up">100% Online</div>
        </div>
      </div>

      <!-- TWO COLUMN SECTION -->
      <div class="dashboard-columns">
        <!-- RECENT AUDIT LOGS -->
        <div class="dash-card">
          <div class="card-header">
            <h3>Recent System Logs</h3>
            <a routerLink="/admin/logs" class="link-more">View All →</a>
          </div>

          <div class="logs-list" *ngIf="recentLogs.length > 0; else noLogs">
            <div *ngFor="let log of recentLogs" class="log-item">
              <div class="log-badge">{{ log.action }}</div>
              <div class="log-meta">
                <span class="log-target">{{ log.target }}</span>
                <span class="log-detail" *ngIf="log.details">{{ log.details }}</span>
                <span class="log-time">{{ log.timestamp | date:'short' }}</span>
              </div>
            </div>
          </div>
          <ng-template #noLogs>
            <div class="empty-box">No recent admin logs found.</div>
          </ng-template>
        </div>

        <!-- QUICK SYSTEM STATUS & ACTIONS -->
        <div class="dash-card">
          <div class="card-header">
            <h3>Platform Modules</h3>
          </div>

          <div class="modules-grid">
            <a routerLink="/admin/movies" class="module-link">
              <span class="mod-icon">🎬</span>
              <div>
                <strong>Movie Manager</strong>
                <p>Import & curate titles</p>
              </div>
            </a>

            <a routerLink="/admin/tv" class="module-link">
              <span class="mod-icon">📺</span>
              <div>
                <strong>TV Series</strong>
                <p>Seasons & episodes</p>
              </div>
            </a>

            <a routerLink="/admin/servers" class="module-link">
              <span class="mod-icon">🖥️</span>
              <div>
                <strong>Stream Providers</strong>
                <p>Embed servers & priority</p>
              </div>
            </a>

            <a routerLink="/admin/users" class="module-link">
              <span class="mod-icon">👥</span>
              <div>
                <strong>User Accounts</strong>
                <p>Roles & access control</p>
              </div>
            </a>

            <a routerLink="/admin/reviews" class="module-link">
              <span class="mod-icon">💬</span>
              <div>
                <strong>Reviews & Moderation</strong>
                <p>Community feedback</p>
              </div>
            </a>

            <a routerLink="/admin/seo" class="module-link">
              <span class="mod-icon">🔍</span>
              <div>
                <strong>SEO & Tags</strong>
                <p>Meta & schema config</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrap {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .welcome-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(17, 24, 39, 0.9) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 2rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .welcome-banner h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.35rem;
    }
    .welcome-banner p {
      color: #94a3b8;
      margin: 0;
      font-size: 0.95rem;
    }
    .quick-buttons {
      display: flex;
      gap: 0.75rem;
    }
    .btn-quick {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-quick.primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
    }
    .btn-quick.secondary {
      background: rgba(255, 255, 255, 0.08);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .metric-card {
      background: rgba(17, 24, 39, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      position: relative;
    }
    .metric-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .users-icon { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .visitors-icon { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .movies-icon { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .servers-icon { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .metric-data {
      display: flex;
      flex-direction: column;
    }
    .metric-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.2;
    }
    .metric-label {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .metric-trend {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }
    .metric-trend.up {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
    }
    .dashboard-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .dashboard-columns { grid-template-columns: 1fr; }
    }
    .dash-card {
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 0.75rem;
    }
    .card-header h3 {
      font-size: 1.15rem;
      color: #ffffff;
      margin: 0;
    }
    .link-more {
      color: #a855f7;
      text-decoration: none;
      font-size: 0.85rem;
    }
    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .log-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.75rem 1rem;
      border-radius: 10px;
    }
    .log-badge {
      font-size: 0.75rem;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
    }
    .log-meta {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .log-target { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; }
    .log-detail { font-size: 0.75rem; color: #94a3b8; }
    .log-time { font-size: 0.7rem; color: #64748b; }
    .modules-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }
    .module-link {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0.85rem;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
    }
    .module-link:hover {
      background: rgba(255, 255, 255, 0.06);
      transform: translateY(-2px);
    }
    .mod-icon { font-size: 1.5rem; }
    .module-link strong { display: block; font-size: 0.9rem; color: #ffffff; }
    .module-link p { margin: 0; font-size: 0.75rem; color: #94a3b8; }
    .empty-box {
      text-align: center;
      color: #64748b;
      padding: 2rem;
      font-size: 0.9rem;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly adminMedia = inject(AdminMediaService);
  private readonly visitorLogs = inject(VisitorLogService);

  totalUsers = 0;
  totalVisitors = 0;
  totalOverrides = 0;
  activeServers = 0;
  recentLogs: AdminLog[] = [];

  ngOnInit(): void {
    this.auth.getAllUsers().subscribe(users => (this.totalUsers = users.length));
    this.visitorLogs.getLogs().subscribe(logs => (this.totalVisitors = logs.length));

    this.adminMedia.getAllOverrides().then(list => (this.totalOverrides = list.length));
    this.adminMedia.getServers().then(servers => (this.activeServers = servers.filter(s => s.active).length));
    this.adminMedia.getLogs(5).then(logs => (this.recentLogs = logs));
  }
}
