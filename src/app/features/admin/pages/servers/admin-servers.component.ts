import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { StreamServerConfig } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-servers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Streaming Video Servers</h1>
          <p>Configure embed stream providers, fallback priorities, and URL templates for movies and TV shows.</p>
        </div>
        <button class="btn-primary" (click)="addNewServer()">
          <span>➕</span> Add Video Server
        </button>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>

      <div class="servers-list">
        <div *ngFor="let s of servers; let idx = index" class="server-card" [class.inactive]="!s.active">
          <div class="server-header">
            <div class="server-title-row">
              <span class="priority-badge">#{{ idx + 1 }}</span>
              <input type="text" [(ngModel)]="s.name" class="server-name-input" placeholder="Server Name" />
              <button
                class="btn-toggle-active"
                [class.active]="s.active"
                (click)="s.active = !s.active"
              >
                {{ s.active ? 'Active' : 'Disabled' }}
              </button>
            </div>
            <div class="server-actions">
              <button class="btn-save" (click)="saveServer(s)">Save</button>
              <button class="btn-delete" (click)="deleteServer(s.id)">Delete</button>
            </div>
          </div>

          <div class="server-body">
            <div class="form-row">
              <label>Movie Embed Template URL</label>
              <input
                type="text"
                [(ngModel)]="s.urlTemplate"
                class="form-control"
                placeholder="https://vidsrc.me/embed/movie?tmdb={id}"
              />
              <span class="hint">Available Tokens: <code>{{ '{id}' }}</code> (TMDB ID), <code>{{ '{imdbId}' }}</code></span>
            </div>

            <div class="form-row">
              <label>TV Series Embed Template URL</label>
              <input
                type="text"
                [(ngModel)]="s.tvUrlTemplate"
                class="form-control"
                placeholder="https://vidsrc.me/embed/tv?tmdb={id}&season={s}&episode={e}"
              />
              <span class="hint">Available Tokens: <code>{{ '{id}' }}</code>, <code>{{ '{s}' }}</code> (Season), <code>{{ '{e}' }}</code> (Episode)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0; font-size: 0.9rem; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .servers-list { display: flex; flex-direction: column; gap: 1rem; }
    .server-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.5rem;
      transition: all 0.2s;
    }
    .server-card.inactive { opacity: 0.55; }
    .server-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
    .server-title-row { display: flex; align-items: center; gap: 0.75rem; }
    .priority-badge { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; }
    .server-name-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      outline: none;
    }
    .btn-toggle-active {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 3px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .btn-toggle-active.active { background: rgba(34, 197, 94, 0.2); border-color: #22c55e; color: #4ade80; }
    .server-actions { display: flex; gap: 0.5rem; }
    .btn-save { background: #6366f1; border: none; color: white; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .btn-delete { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .server-body { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-row label { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      font-family: monospace;
      font-size: 0.85rem;
      outline: none;
    }
    .hint { font-size: 0.75rem; color: #64748b; }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; }
  `]
})
export class AdminServersComponent implements OnInit {
  private readonly adminMedia = inject(AdminMediaService);
  private readonly cdr = inject(ChangeDetectorRef);

  servers: StreamServerConfig[] = [];
  successMsg = '';

  ngOnInit(): void {
    this.loadServers();
  }

  async loadServers(): Promise<void> {
    this.servers = await this.adminMedia.getServers();
    this.cdr.detectChanges();
  }

  addNewServer(): void {
    const newId = `server-${Date.now()}`;
    const newS: StreamServerConfig = {
      id: newId,
      name: `Server ${this.servers.length + 1}`,
      urlTemplate: 'https://vidsrc.to/embed/movie/{id}',
      tvUrlTemplate: 'https://vidsrc.to/embed/tv/{id}/{s}/{e}',
      active: true,
      priority: this.servers.length + 1
    };
    this.servers.push(newS);
  }

  async saveServer(s: StreamServerConfig): Promise<void> {
    await this.adminMedia.saveServer(s);
    this.successMsg = `Server "${s.name}" saved successfully.`;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMsg = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  async deleteServer(id: string): Promise<void> {
    if (!confirm('Remove this video server?')) return;
    await this.adminMedia.deleteServer(id);
    this.servers = this.servers.filter(s => s.id !== id);
    this.cdr.detectChanges();
  }
}
