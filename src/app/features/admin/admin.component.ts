import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';
import { ref, onValue, off, remove } from 'firebase/database';
import { VisitorLogService } from '../../services/visitor-log.service';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { VisitorLog, VisitorStats } from '../../models/visitor-log.model';
import { AppUser } from '../../models/user.model';

export interface BrokenReport {
  id?: string;
  mediaId: number;
  title: string;
  server: string;
  reason: string;
  season?: number;
  episode?: number;
  reportedBy: string;
  timestamp: number;
  dateStr: string;
}

export interface StreamingServerConfig {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'maintenance';
  priority: number;
  enabled: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {
  private readonly visitorService = inject(VisitorLogService);
  private readonly authService = inject(AuthService);
  private readonly firebase = inject(FirebaseService);

  readonly activeTab = signal<'logs' | 'users' | 'servers' | 'reports' | 'system'>('logs');
  readonly searchQuery = signal('');
  readonly isClearing = signal(false);
  readonly actionMessage = signal<string | null>(null);

  // Streaming Servers Config (State)
  readonly servers = signal<StreamingServerConfig[]>([
    { id: 'vidsrc-me', name: 'VidSrc Prime (Default)', status: 'online', priority: 1, enabled: true },
    { id: 'vidsrc-cc', name: 'VidSrc CC (V2 Mirror)', status: 'online', priority: 2, enabled: true },
    { id: 'multiembed', name: 'MultiEmbed VIP', status: 'online', priority: 3, enabled: true },
    { id: 'autoembed', name: 'AutoEmbed Fast', status: 'online', priority: 4, enabled: true }
  ]);

  readonly stats$: Observable<VisitorStats> = this.visitorService.getVisitorStats();
  readonly allUsers$: Observable<AppUser[]> = this.authService.getAllUsers();
  readonly currentUser$: Observable<AppUser | null> = this.authService.currentUser$;

  readonly adminCount$: Observable<number> = this.allUsers$.pipe(
    map(users => users.filter(u => u.role === 'admin').length)
  );

  readonly filteredLogs$: Observable<VisitorLog[]> = combineLatest([
    this.visitorService.getRecentLogs(),
    this.allUsers$
  ]).pipe(
    map(([logs]) => {
      const q = this.searchQuery().toLowerCase().trim();
      if (!q) return logs;
      return logs.filter(
        l =>
          l.ip?.toLowerCase().includes(q) ||
          l.path?.toLowerCase().includes(q) ||
          l.country?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.browser?.toLowerCase().includes(q) ||
          l.os?.toLowerCase().includes(q) ||
          l.userEmail?.toLowerCase().includes(q)
      );
    })
  );

  readonly brokenReports$: Observable<BrokenReport[]> = new Observable<BrokenReport[]>(observer => {
    const reportsRef = ref(this.firebase.db, 'broken_stream_reports');
    const listener = onValue(
      reportsRef,
      snap => {
        if (snap.exists()) {
          const data = snap.val();
          const list: BrokenReport[] = Object.entries(data).map(([id, val]) => ({
            ...(val as BrokenReport),
            id
          }));
          list.sort((a, b) => b.timestamp - a.timestamp);
          observer.next(list);
        } else {
          observer.next([]);
        }
      },
      err => observer.error(err)
    );

    return () => off(reportsRef, 'value', listener);
  });

  setTab(tab: 'logs' | 'users' | 'servers' | 'reports' | 'system'): void {
    this.activeTab.set(tab);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  async toggleRole(user: AppUser): Promise<void> {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role for ${user.email} to ${newRole.toUpperCase()}?`)) return;

    try {
      await this.authService.updateUserRole(user.uid, newRole);
      this.showTemporaryNotice(`Updated ${user.email} role to ${newRole}`);
    } catch (err: any) {
      alert(`Failed to update role: ${err?.message}`);
    }
  }

  toggleServer(serverId: string): void {
    this.servers.update(list =>
      list.map(s => (s.id === serverId ? { ...s, enabled: !s.enabled } : s))
    );
    this.showTemporaryNotice('Streaming server status updated.');
  }

  async deleteReport(reportId?: string): Promise<void> {
    if (!reportId) return;
    await remove(ref(this.firebase.db, `broken_stream_reports/${reportId}`));
    this.showTemporaryNotice('Broken video report marked as resolved.');
  }

  async clearAllLogs(): Promise<void> {
    if (!confirm('Are you sure you want to clear all visitor tracking records?')) return;

    this.isClearing.set(true);
    try {
      await this.visitorService.clearLogs();
      this.showTemporaryNotice('All visitor logs cleared.');
    } catch (err: any) {
      alert(`Failed to clear logs: ${err?.message}`);
    } finally {
      this.isClearing.set(false);
    }
  }

  private showTemporaryNotice(msg: string): void {
    this.actionMessage.set(msg);
    setTimeout(() => this.actionMessage.set(null), 3500);
  }

  formatDate(ts: number | undefined): string {
    return ts ? new Date(ts).toLocaleString() : 'N/A';
  }
}
