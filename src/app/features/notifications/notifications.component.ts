import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { AppNotification } from '../../models/media.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notifications-container">
      <div class="header-row">
        <div>
          <h1>🔔 Notifications</h1>
          <p class="subtitle">Stay tuned with the latest movie updates, features, and announcements.</p>
        </div>
        <button
          *ngIf="unreadCount > 0"
          (click)="markAllAsRead()"
          class="btn-mark-all"
        >
          Mark all as read
        </button>
      </div>

      <!-- LIST -->
      <div class="notifications-list" *ngIf="notifications.length > 0">
        <div
          *ngFor="let n of notifications"
          class="notification-item"
          [class.unread]="!n.read"
          (click)="onNotificationClick(n)"
        >
          <div class="icon-bubble" [ngClass]="n.type">
            {{ getIcon(n.type) }}
          </div>
          <div class="notification-body">
            <div class="body-top">
              <span class="notification-title">{{ n.title }}</span>
              <span class="notification-time">{{ n.createdAt | date:'short' }}</span>
            </div>
            <p class="notification-msg">{{ n.message }}</p>
            <a *ngIf="n.link" [routerLink]="n.link" class="notification-link" (click)="$event.stopPropagation()">
              View Details →
            </a>
          </div>
          <div class="unread-dot" *ngIf="!n.read"></div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div class="empty-state" *ngIf="notifications.length === 0">
        <div class="empty-icon">🔕</div>
        <h3>No notifications yet</h3>
        <p>You're all caught up! New releases and announcements will appear here.</p>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      max-width: 860px;
      margin: 2rem auto 5rem;
      padding: 0 1.5rem;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-row h1 {
      font-size: 1.85rem;
      color: #ffffff;
      margin: 0 0 0.25rem;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
    }
    .btn-mark-all {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-mark-all:hover {
      background: #6366f1;
      color: white;
    }
    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 1.25rem;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }
    .notification-item:hover {
      background: rgba(17, 24, 39, 0.9);
      border-color: rgba(255, 255, 255, 0.12);
    }
    .notification-item.unread {
      background: rgba(30, 27, 75, 0.4);
      border-color: rgba(99, 102, 241, 0.3);
    }
    .icon-bubble {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .icon-bubble.release { background: rgba(168, 85, 247, 0.2); }
    .icon-bubble.system { background: rgba(59, 130, 246, 0.2); }
    .icon-bubble.promo { background: rgba(234, 179, 8, 0.2); }
    .notification-body {
      flex: 1;
    }
    .body-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .notification-title {
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
    }
    .notification-time {
      font-size: 0.75rem;
      color: #64748b;
    }
    .notification-msg {
      color: #cbd5e1;
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0 0 0.5rem;
    }
    .notification-link {
      color: #a855f7;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .notification-link:hover { text-decoration: underline; }
    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366f1;
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #94a3b8;
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
  `]
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);

  get notifications(): AppNotification[] {
    return this.notificationService.notifications();
  }

  get unreadCount(): number {
    return this.notificationService.unreadCount();
  }

  ngOnInit(): void {
    this.notificationService.loadUserNotifications();
  }

  getIcon(type: string): string {
    switch (type) {
      case 'release': return '🎬';
      case 'system': return '⚙️';
      case 'promo': return '🎁';
      default: return '📢';
    }
  }

  async onNotificationClick(n: AppNotification): Promise<void> {
    if (!n.read && n.id) {
      const user = this.auth.currentUser;
      if (user) {
        await this.notificationService.markAsRead(n.id, user.uid, !n.userId);
      }
    }
  }

  async markAllAsRead(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await this.notificationService.markAllRead(user.uid);
    }
  }
}
