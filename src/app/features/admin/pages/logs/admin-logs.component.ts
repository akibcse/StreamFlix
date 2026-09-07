import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { AdminLog } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>System Activity & Audit Logs</h1>
          <p>Chronological audit log tracking administrative modifications, imports, and security events.</p>
        </div>
        <button class="btn-export" (click)="exportLogs()">
          <span>💾</span> Export JSON
        </button>
      </div>

      <div class="toolbar">
        <input
          type="text"
          placeholder="Filter by action, user, or target..."
          [(ngModel)]="searchFilter"
          class="form-control"
        />
        <span class="count-badge">{{ filteredLogs.length }} Entries Logged</span>
      </div>

      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Target</th>
              <th>Administrator</th>
              <th>IP & Location</th>
              <th>Device</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of filteredLogs">
              <td class="time-cell">{{ log.timestamp | date:'short' }}</td>
              <td>
                <span class="action-tag">{{ log.action }}</span>
              </td>
              <td><strong>{{ log.target }}</strong></td>
              <td class="admin-cell">{{ log.adminEmail }}</td>
              <td>
                <div class="ip-loc-cell" *ngIf="log.ip || log.location; else noAuditIp">
                  <span class="log-ip" *ngIf="log.ip">{{ log.ip }}</span>
                  <span class="log-loc" *ngIf="log.location">📍 {{ log.location }}</span>
                  <span class="log-isp" *ngIf="log.isp">⚡ {{ log.isp }}</span>
                </div>
                <ng-template #noAuditIp><span class="dash">—</span></ng-template>
              </td>
              <td>
                <span class="log-device" *ngIf="log.device; else noAuditDev">💻 {{ log.device }}</span>
                <ng-template #noAuditDev><span class="dash">—</span></ng-template>
              </td>
              <td class="details-cell">{{ log.details || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="filteredLogs.length === 0">
          <p>No audit logs matching criteria.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0; font-size: 0.9rem; }
    .btn-export {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      outline: none;
      max-width: 320px;
    }
    .count-badge { color: #94a3b8; font-size: 0.85rem; }
    .table-card { background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    .data-table th { padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #e2e8f0; }
    .time-cell { font-size: 0.8rem; color: #94a3b8; white-space: nowrap; }
    .action-tag { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 2px 7px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; }
    .admin-cell { color: #cbd5e1; font-size: 0.85rem; }
    .ip-loc-cell { display: flex; flex-direction: column; gap: 2px; }
    .log-ip { font-family: monospace; font-size: 0.8rem; color: #ffffff; }
    .log-loc { font-size: 0.76rem; color: #94a3b8; }
    .log-isp { font-size: 0.72rem; color: #38bdf8; }
    .log-device { font-size: 0.78rem; color: #cbd5e1; }
    .dash { color: #64748b; }
    .details-cell { font-size: 0.8rem; color: #94a3b8; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `]
})
export class AdminLogsComponent implements OnInit {
  private readonly adminMedia = inject(AdminMediaService);

  logs: AdminLog[] = [];
  searchFilter = '';

  get filteredLogs(): AdminLog[] {
    if (!this.searchFilter.trim()) return this.logs;
    const q = this.searchFilter.toLowerCase();
    return this.logs.filter(
      l =>
        (l.action || '').toLowerCase().includes(q) ||
        (l.target || '').toLowerCase().includes(q) ||
        (l.adminEmail || '').toLowerCase().includes(q) ||
        (l.ip || '').toLowerCase().includes(q) ||
        (l.location || '').toLowerCase().includes(q) ||
        (l.isp || '').toLowerCase().includes(q) ||
        (l.device || '').toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    this.adminMedia.getLogs(100).then(list => (this.logs = list));
  }

  exportLogs(): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.logs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `streamflix-audit-logs-${Date.now()}.json`);
    dlAnchor.click();
  }
}
