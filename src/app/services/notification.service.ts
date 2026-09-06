import { Injectable, inject, signal } from '@angular/core';
import { getDatabase, ref, get, set, push, update, query, orderByChild, limitToLast } from 'firebase/database';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { AppNotification, NotificationType } from '../models/media.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);
  private db = getDatabase(this.firebase.app);

  readonly unreadCount = signal<number>(0);
  readonly notifications = signal<AppNotification[]>([]);

  async loadUserNotifications(): Promise<void> {
    const user = await firstValueFrom(this.auth.currentUser$);
    if (!user) return;

    try {
      const [broadcastSnap, userSnap] = await Promise.all([
        get(ref(this.db, 'notifications/broadcast')),
        get(ref(this.db, `notifications/users/${user.uid}`))
      ]);

      const all: AppNotification[] = [];
      if (broadcastSnap.exists()) {
        Object.entries(broadcastSnap.val() as Record<string, AppNotification>).forEach(([id, n]) => {
          all.push({ ...n, id });
        });
      }
      if (userSnap.exists()) {
        Object.entries(userSnap.val() as Record<string, AppNotification>).forEach(([id, n]) => {
          all.push({ ...n, id });
        });
      }

      all.sort((a, b) => b.createdAt - a.createdAt);
      this.notifications.set(all);
      this.unreadCount.set(all.filter(n => !n.read).length);
    } catch { /* silent */ }
  }

  async markAsRead(notificationId: string, userId: string, isBroadcast: boolean): Promise<void> {
    const path = isBroadcast
      ? `notifications/broadcast/${notificationId}`
      : `notifications/users/${userId}/${notificationId}`;
    await update(ref(this.db, path), { read: true });
    this.notifications.update(ns => ns.map(n => n.id === notificationId ? { ...n, read: true } : n));
    this.unreadCount.update(c => Math.max(0, c - 1));
  }

  async markAllRead(userId: string): Promise<void> {
    const ns = this.notifications();
    for (const n of ns.filter(n => !n.read)) {
      if (n.id) await this.markAsRead(n.id, userId, !n.userId);
    }
  }

  // ─── Admin: Send Notifications ──────────────────────────────────

  async sendBroadcastNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<void> {
    const full: AppNotification = { ...notification, createdAt: Date.now() };
    await push(ref(this.db, 'notifications/broadcast'), full);
  }

  async sendUserNotification(userId: string, notification: Omit<AppNotification, 'id' | 'createdAt' | 'userId'>): Promise<void> {
    const full: AppNotification = { ...notification, userId, createdAt: Date.now() };
    await push(ref(this.db, `notifications/users/${userId}`), full);
  }

  async getAllNotifications(): Promise<AppNotification[]> {
    const snap = await get(ref(this.db, 'notifications/broadcast'));
    if (!snap.exists()) return [];
    return Object.entries(snap.val() as Record<string, AppNotification>)
      .map(([id, n]) => ({ ...n, id }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteNotification(id: string): Promise<void> {
    await import('firebase/database').then(({ remove }) =>
      remove(ref(this.db, `notifications/broadcast/${id}`))
    );
  }
}
