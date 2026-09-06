import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../services/notification.service';
import { AppNotification, NotificationType } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Broadcast In-App Notifications</h1>
          <p>Send instant announcements, movie release alerts, or promotional messages to all users.</p>
        </div>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>

      <div class="notif-grid">
        <!-- COMPOSE CARD -->
        <div class="compose-card">
          <h3>Compose Notification</h3>
          <form (ngSubmit)="sendNotification()">
            <div class="form-group">
              <label>Notification Type</label>
              <select [(ngModel)]="newNotif.type" name="type" class="form-control">
                <option value="release">🎬 New Release Announcement</option>
                <option value="system">⚙️ System / Platform Update</option>
                <option value="promo">🎁 Promotion / Feature Highlight</option>
              </select>
            </div>

            <div class="form-group">
              <label>Title</label>
              <input
                type="text"
                [(ngModel)]="newNotif.title"
                name="title"
                required
                class="form-control"
                placeholder="e.g. Dune: Part Two is now streaming!"
              />
            </div>

            <div class="form-group">
              <label>Message</label>
              <textarea
                [(ngModel)]="newNotif.message"
                name="message"
                required
                rows="3"
                class="form-control"
                placeholder="Write your message to all users..."
              ></textarea>
            </div>

            <div class="form-group">
              <label>Link (optional)</label>
              <input
                type="text"
                [(ngModel)]="newNotif.link"
                name="link"
                class="form-control"
                placeholder="/movie/693134 or /movies"
              />
            </div>

            <button
              type="submit"
              class="btn-send"
              [disabled]="sending || !newNotif.title.trim() || !newNotif.message.trim()"
            >
              {{ sending ? 'Sending Broadcast...' : '🚀 Send Broadcast Notification' }}
            </button>
          </form>
        </div>

        <!-- SENT NOTIFICATIONS LIST -->
        <div class="history-card">
          <h3>Broadcast History ({{ sentList.length }})</h3>
          <div class="sent-list" *ngIf="sentList.length > 0; else emptyList">
            <div *ngFor="let n of sentList" class="sent-item">
              <div class="sent-header">
                <strong>{{ n.title }}</strong>
                <span class="sent-time">{{ n.createdAt | date:'short' }}</span>
              </div>
              <p class="sent-msg">{{ n.message }}</p>
              <div class="sent-footer">
                <span class="type-pill">{{ n.type }}</span>
                <span class="link-tag" *ngIf="n.link">{{ n.link }}</span>
                <button class="btn-del" (click)="deleteNotification(n.id)">Delete</button>
              </div>
            </div>
          </div>
          <ng-template #emptyList>
            <div class="empty-state">No broadcast notifications sent yet.</div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0.25rem 0 0; font-size: 0.9rem; }
    .notif-grid { display: grid; grid-template-columns: 420px 1fr; gap: 1.5rem; }
    @media (max-width: 900px) { .notif-grid { grid-template-columns: 1fr; } }
    .compose-card, .history-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.5rem;
    }
    .compose-card h3, .history-card h3 {
      font-size: 1.15rem;
      color: white;
      margin: 0 0 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 0.75rem;
    }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      outline: none;
    }
    .btn-send {
      width: 100%;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border: none;
      color: white;
      padding: 0.75rem;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
    .sent-list { display: flex; flex-direction: column; gap: 1rem; }
    .sent-item {
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      padding: 1rem;
    }
    .sent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; }
    .sent-header strong { color: white; font-size: 0.95rem; }
    .sent-time { font-size: 0.75rem; color: #64748b; }
    .sent-msg { color: #cbd5e1; font-size: 0.85rem; margin: 0 0 0.65rem; }
    .sent-footer { display: flex; align-items: center; gap: 0.5rem; }
    .type-pill { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }
    .link-tag { font-size: 0.75rem; color: #94a3b8; font-family: monospace; }
    .btn-del {
      margin-left: auto;
      background: none;
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `]
})
export class AdminNotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);

  sending = false;
  successMsg = '';
  sentList: AppNotification[] = [];

  newNotif = {
    title: '',
    message: '',
    type: 'release' as NotificationType,
    link: ''
  };

  ngOnInit(): void {
    this.loadSent();
  }

  async loadSent(): Promise<void> {
    this.sentList = await this.notificationService.getAllNotifications();
  }

  async sendNotification(): Promise<void> {
    if (!this.newNotif.title.trim() || !this.newNotif.message.trim()) return;
    this.sending = true;
    try {
      await this.notificationService.sendBroadcastNotification({
        title: this.newNotif.title.trim(),
        message: this.newNotif.message.trim(),
        type: this.newNotif.type,
        link: this.newNotif.link.trim() || undefined,
        read: false
      });
      this.newNotif = { title: '', message: '', type: 'release', link: '' };
      this.successMsg = 'Broadcast notification sent to all users!';
      await this.loadSent();
      setTimeout(() => (this.successMsg = ''), 3500);
    } finally {
      this.sending = false;
    }
  }

  async deleteNotification(id?: string): Promise<void> {
    if (!id) return;
    await this.notificationService.deleteNotification(id);
    this.sentList = this.sentList.filter(n => n.id !== id);
  }
}
