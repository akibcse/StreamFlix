import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { MovieService } from '../../../../services/movie.service';
import { MediaOverride } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-tv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>TV Series Management</h1>
          <p>Import TV series from TMDB, manage seasons, set episode stream servers, and feature shows.</p>
        </div>
        <button class="btn-primary" (click)="showImportModal = true">
          <span>📥</span> Import TV Series from TMDB
        </button>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <!-- TOOLBAR -->
      <div class="toolbar">
        <input
          type="text"
          placeholder="Filter TV shows..."
          [(ngModel)]="searchFilter"
          class="form-control filter-input"
        />
        <div class="toolbar-info">
          Total TV Overrides: <strong>{{ filteredList.length }}</strong>
        </div>
      </div>

      <!-- TABLE -->
      <div class="table-card">
        <table class="data-table" *ngIf="filteredList.length > 0; else emptyTpl">
          <thead>
            <tr>
              <th>TMDB ID</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Custom Embed</th>
              <th>Added Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredList">
              <td><span class="id-badge">#{{ item.id }}</span></td>
              <td>
                <button class="btn-toggle" [class.active]="item.published" (click)="togglePublished(item)">
                  {{ item.published ? 'Published' : 'Draft' }}
                </button>
              </td>
              <td>
                <button class="btn-toggle star" [class.active]="item.featured" (click)="toggleFeatured(item)">
                  {{ item.featured ? '⭐ Featured' : 'Normal' }}
                </button>
              </td>
              <td>
                <span class="url-badge" *ngIf="item.customEmbedUrl">Custom</span>
                <span class="muted" *ngIf="!item.customEmbedUrl">Auto-Server</span>
              </td>
              <td>{{ item.addedAt | date:'mediumDate' }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon edit" (click)="editItem(item)">✏️</button>
                  <button class="btn-icon delete" (click)="deleteItem(item.id)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #emptyTpl>
          <div class="empty-state">
            <p>No TV series overrides yet. Import a series to begin.</p>
          </div>
        </ng-template>
      </div>

      <!-- IMPORT MODAL -->
      <div class="modal-backdrop" *ngIf="showImportModal" (click)="showImportModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Import TV Series from TMDB</h3>
            <button class="btn-close" (click)="showImportModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Search TV Show Title</label>
              <div class="search-box">
                <input
                  type="text"
                  [(ngModel)]="tmdbQuery"
                  (keyup.enter)="searchTmdb()"
                  placeholder="e.g. Breaking Bad, Stranger Things..."
                  class="form-control"
                />
                <button class="btn-primary" (click)="searchTmdb()" [disabled]="searching">
                  {{ searching ? 'Searching...' : 'Search' }}
                </button>
              </div>
            </div>

            <div class="tmdb-results" *ngIf="searchResults.length > 0">
              <div *ngFor="let s of searchResults" class="result-row">
                <img [src]="getPosterUrl(s.poster_path)" class="result-poster" />
                <div class="result-info">
                  <strong>{{ s.name }} ({{ s.first_air_date?.substring(0,4) }})</strong>
                  <p>TMDB ID: {{ s.id }} | ⭐ {{ s.vote_average }}</p>
                </div>
                <button class="btn-import" (click)="importSeries(s.id)" [disabled]="importingId === s.id">
                  {{ importingId === s.id ? 'Importing...' : 'Import' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- EDIT MODAL -->
      <div class="modal-backdrop" *ngIf="selectedEdit" (click)="selectedEdit = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit TV Override (#{{ selectedEdit.id }})</h3>
            <button class="btn-close" (click)="selectedEdit = null">✕</button>
          </div>
          <div class="modal-body" *ngIf="selectedEdit">
            <div class="form-group">
              <label>Custom Stream Embed URL</label>
              <input type="text" [(ngModel)]="selectedEdit.customEmbedUrl" class="form-control" />
            </div>
            <div class="form-group">
              <label>SEO Title Override</label>
              <input type="text" [(ngModel)]="selectedEdit.seoTitle" class="form-control" />
            </div>
            <button class="btn-primary" (click)="saveEdit()">Save Changes</button>
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
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .filter-input { max-width: 320px; }
    .toolbar-info { color: #94a3b8; font-size: 0.9rem; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      outline: none;
      width: 100%;
    }
    .table-card { background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    .data-table th { padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #e2e8f0; }
    .id-badge { background: rgba(255, 255, 255, 0.06); padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: 700; }
    .btn-toggle { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; padding: 3px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    .btn-toggle.active { background: rgba(34, 197, 94, 0.2); border-color: #22c55e; color: #4ade80; }
    .btn-toggle.star.active { background: rgba(234, 179, 8, 0.2); border-color: #eab308; color: #facc15; }
    .url-badge { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }
    .muted { color: #64748b; }
    .row-actions { display: flex; gap: 0.5rem; }
    .btn-icon { background: none; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; cursor: pointer; padding: 4px 8px; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .modal-card { background: #111827; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; width: 100%; max-width: 600px; max-height: 85vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .modal-header h3 { margin: 0; color: white; }
    .btn-close { background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .search-box { display: flex; gap: 0.5rem; }
    .tmdb-results { display: flex; flex-direction: column; gap: 0.75rem; max-height: 350px; overflow-y: auto; }
    .result-row { display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.03); padding: 0.6rem; border-radius: 8px; }
    .result-poster { width: 40px; height: 60px; object-fit: cover; border-radius: 4px; }
    .result-info { flex: 1; font-size: 0.85rem; }
    .result-info strong { color: white; }
    .result-info p { margin: 0; color: #94a3b8; font-size: 0.75rem; }
    .btn-import { background: #6366f1; border: none; color: white; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; }
    .alert-error { background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 0.75rem; border-radius: 8px; }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `]
})
export class AdminTvComponent implements OnInit {
  private readonly adminMedia = inject(AdminMediaService);
  private readonly movieService = inject(MovieService);

  list: MediaOverride[] = [];
  searchFilter = '';
  showImportModal = false;
  selectedEdit: MediaOverride | null = null;
  tmdbQuery = '';
  searchResults: any[] = [];
  searching = false;
  importingId: number | null = null;
  successMsg = '';
  errorMsg = '';

  get filteredList(): MediaOverride[] {
    if (!this.searchFilter.trim()) return this.list;
    const q = this.searchFilter.toLowerCase();
    return this.list.filter(item => item.id.includes(q) || item.slug?.toLowerCase().includes(q));
  }

  ngOnInit(): void {
    this.loadTv();
  }

  async loadTv(): Promise<void> {
    this.list = await this.adminMedia.getAllOverrides('tv');
  }

  async togglePublished(item: MediaOverride): Promise<void> {
    const next = !item.published;
    await this.adminMedia.togglePublished(item.id, 'tv', next);
    item.published = next;
  }

  async toggleFeatured(item: MediaOverride): Promise<void> {
    const next = !item.featured;
    await this.adminMedia.toggleFeatured(item.id, 'tv', next);
    item.featured = next;
  }

  async deleteItem(id: string): Promise<void> {
    if (!confirm(`Remove TV series #${id}?`)) return;
    await this.adminMedia.deleteOverride(id, 'tv');
    this.list = this.list.filter(i => i.id !== id);
  }

  editItem(item: MediaOverride): void {
    this.selectedEdit = { ...item };
  }

  async saveEdit(): Promise<void> {
    if (!this.selectedEdit) return;
    await this.adminMedia.saveOverride(this.selectedEdit);
    await this.loadTv();
    this.selectedEdit = null;
    this.successMsg = 'TV series updated.';
    setTimeout(() => (this.successMsg = ''), 3000);
  }

  searchTmdb(): void {
    if (!this.tmdbQuery.trim()) return;
    this.searching = true;
    this.movieService.searchMulti(this.tmdbQuery.trim()).subscribe({
      next: res => {
        this.searchResults = (res.results || []).filter((r: any) => r.media_type === 'tv');
        this.searching = false;
      },
      error: () => (this.searching = false)
    });
  }

  async importSeries(id: number): Promise<void> {
    this.importingId = id;
    try {
      await this.adminMedia.importFromTmdb(id, 'tv');
      await this.loadTv();
      this.showImportModal = false;
      this.successMsg = `TV series #${id} imported.`;
      setTimeout(() => (this.successMsg = ''), 3000);
    } catch (err: any) {
      this.errorMsg = err.message || 'Import failed.';
    } finally {
      this.importingId = null;
    }
  }

  getPosterUrl(path?: string): string {
    return this.movieService.getImageUrl(path || null, 'w185');
  }
}
