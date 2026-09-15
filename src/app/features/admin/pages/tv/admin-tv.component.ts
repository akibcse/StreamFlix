import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { MovieService } from '../../../../services/movie.service';
import {
  MediaOverride,
  AutoImportCategory,
  AutoImportOptions,
  AutoImportProgress,
  AutoSyncConfig
} from '../../../../models/media.model';

@Component({
  selector: 'app-admin-tv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <!-- HEADER -->
      <div class="page-header">
        <div class="header-titles">
          <h1>TV Series Management & Overrides</h1>
          <p>All TV series are automatically fetched live from the TMDB API. Manage streaming servers, custom embed links, featured status, and series overrides.</p>
        </div>
        <div class="header-actions">
          <button class="btn-icon-action" (click)="loadTv()" [disabled]="loading" title="Refresh Catalog">
            <span [class.spinning]="loading">🔄</span>
          </button>
        </div>
      </div>

      <!-- STATUS ALERTS -->
      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <!-- TOOLBAR -->
      <div class="toolbar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by ID, show title, year or slug..."
            [(ngModel)]="searchFilter"
            class="form-control filter-input"
          />
          <button *ngIf="searchFilter" class="clear-btn" (click)="searchFilter = ''">✕</button>
        </div>

        <div class="toolbar-stats">
          <span class="stat-pill">Total: <strong>{{ list.length }}</strong></span>
          <span class="stat-pill published">Published: <strong>{{ publishedCount }}</strong></span>
          <span class="stat-pill featured">Featured: <strong>{{ featuredCount }}</strong></span>
        </div>
      </div>

      <!-- TABLE CARD -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading TV series catalog...</p>
        </div>

        <table class="data-table" *ngIf="!loading && filteredList.length > 0; else emptyTpl">
          <thead>
            <tr>
              <th style="width: 60px;">Poster</th>
              <th>Series Details</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Trending</th>
              <th>Rating</th>
              <th>Stream Server</th>
              <th>Added</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredList" [class.draft-row]="!item.published">
              <!-- POSTER -->
              <td>
                <div class="poster-thumb">
                  <img
                    *ngIf="item.poster_path || item.customPoster; else noPoster"
                    [src]="getPosterUrl(item.customPoster || item.poster_path)"
                    [alt]="item.title || item.id"
                    loading="lazy"
                  />
                  <ng-template #noPoster>
                    <div class="poster-placeholder">📺</div>
                  </ng-template>
                </div>
              </td>

              <!-- DETAILS -->
              <td>
                <div class="movie-info-cell">
                  <span class="movie-title" [title]="item.title || item.seoTitle || item.id">
                    {{ item.title || item.seoTitle || ('Series #' + item.id) }}
                  </span>
                  <div class="movie-meta">
                    <span class="id-badge">#{{ item.id }}</span>
                    <span class="year-tag" *ngIf="item.release_date">
                      {{ item.release_date.substring(0, 4) }}
                    </span>
                    <span class="slug-tag" *ngIf="item.slug">/{{ item.slug }}</span>
                  </div>
                </div>
              </td>

              <!-- STATUS TOGGLE -->
              <td>
                <button
                  class="btn-toggle"
                  [class.active]="item.published"
                  (click)="togglePublished(item)"
                  [title]="item.published ? 'Click to unpublish' : 'Click to publish'"
                >
                  <span class="dot"></span>
                  {{ item.published ? 'Published' : 'Draft' }}
                </button>
              </td>

              <!-- FEATURED TOGGLE -->
              <td>
                <button
                  class="btn-toggle star"
                  [class.active]="item.featured"
                  (click)="toggleFeatured(item)"
                  title="Toggle homepage featured status"
                >
                  {{ item.featured ? '⭐ Featured' : 'Normal' }}
                </button>
              </td>

              <!-- TRENDING TOGGLE -->
              <td>
                <button
                  class="btn-toggle fire"
                  [class.active]="item.trending"
                  (click)="toggleTrending(item)"
                  title="Toggle trending ribbon"
                >
                  {{ item.trending ? '🔥 Trending' : 'Normal' }}
                </button>
              </td>

              <!-- RATING -->
              <td>
                <span class="rating-badge" *ngIf="item.vote_average">
                  ⭐ {{ item.vote_average | number:'1.1-1' }}
                </span>
                <span class="muted" *ngIf="!item.vote_average">—</span>
              </td>

              <!-- STREAM EMBED -->
              <td>
                <span class="url-badge" *ngIf="item.customEmbedUrl" [title]="item.customEmbedUrl">
                  Custom Link
                </span>
                <span class="auto-badge" *ngIf="!item.customEmbedUrl">
                  Auto Server
                </span>
              </td>

              <!-- ADDED DATE -->
              <td class="date-cell">
                {{ item.addedAt ? (item.addedAt | date:'mediumDate') : '—' }}
              </td>

              <!-- ACTIONS -->
              <td>
                <div class="row-actions">
                  <a
                    [href]="'/tv/' + item.id"
                    target="_blank"
                    class="btn-icon view"
                    title="Preview series on site"
                  >
                    👁️
                  </a>
                  <button class="btn-icon edit" (click)="editItem(item)" title="Edit Override">
                    ✏️
                  </button>
                  <button class="btn-icon delete" (click)="deleteItem(item.id)" title="Delete Override">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- EMPTY STATE -->
        <ng-template #emptyTpl>
          <div class="empty-state" *ngIf="!loading">
            <div class="empty-icon">📺</div>
            <h3>No TV Series Overrides Saved</h3>
            <p *ngIf="searchFilter">No series match your filter "<strong>{{ searchFilter }}</strong>".</p>
            <p *ngIf="!searchFilter">The website automatically streams all TV series live directly from the TMDB API. If you need to set a custom embed link or highlight a series, it will appear here.</p>
          </div>
        </ng-template>
      </div>

      <!-- ========================================== -->
      <!-- EDIT OVERRIDE MODAL                        -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="selectedEdit" (click)="selectedEdit = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit TV Override (#{{ selectedEdit.id }})</h3>
            <button class="btn-close" (click)="selectedEdit = null">✕</button>
          </div>
          <div class="modal-body" *ngIf="selectedEdit">
            <div class="form-group">
              <label class="form-label">Custom Stream Embed URL</label>
              <input type="text" [(ngModel)]="selectedEdit.customEmbedUrl" class="form-control" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label class="form-label">SEO Title Override</label>
              <input type="text" [(ngModel)]="selectedEdit.seoTitle" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">SEO Description</label>
              <textarea [(ngModel)]="selectedEdit.seoDescription" rows="3" class="form-control"></textarea>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="selectedEdit = null">Cancel</button>
              <button class="btn-primary" (click)="saveEdit()">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }

    /* HEADER */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
    }
    .header-titles h1 { font-size: 1.75rem; color: #ffffff; margin: 0 0 0.35rem; font-weight: 700; letter-spacing: -0.02em; }
    .header-titles p { color: #94a3b8; margin: 0; font-size: 0.9rem; max-width: 600px; line-height: 1.4; }
    .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

    /* BUTTONS */
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #e2e8f0;
      padding: 0.7rem 1.15rem;
      border-radius: 10px;
      font-weight: 500;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-icon-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
      border-radius: 10px;
      padding: 0.7rem 0.85rem;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.15s ease;
    }
    .btn-icon-action:hover { background: rgba(255, 255, 255, 0.12); color: white; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }

    /* TOOLBAR */
    .toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .search-input-wrap { position: relative; flex: 1; max-width: 420px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.85rem; }
    .filter-input { padding-left: 2.25rem !important; padding-right: 2rem !important; }
    .clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748b; cursor: pointer; }
    .toolbar-stats { display: flex; gap: 0.6rem; }
    .stat-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .stat-pill strong { color: white; margin-left: 2px; }
    .stat-pill.published strong { color: #4ade80; }
    .stat-pill.featured strong { color: #facc15; }

    /* TABLE */
    .table-card {
      background: rgba(17, 24, 39, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      overflow-x: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    .data-table th {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
      vertical-align: middle;
    }
    .data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
    .draft-row { opacity: 0.7; }

    /* POSTER */
    .poster-thumb {
      width: 44px;
      height: 64px;
      border-radius: 6px;
      overflow: hidden;
      background: #1f2937;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .poster-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .poster-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }

    /* SERIES DETAILS */
    .movie-info-cell { display: flex; flex-direction: column; gap: 0.25rem; max-width: 260px; }
    .movie-title { font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .movie-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; }
    .id-badge { background: rgba(255, 255, 255, 0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 700; color: #94a3b8; }
    .year-tag { color: #64748b; }
    .slug-tag { color: #06b6d4; font-family: monospace; font-size: 0.7rem; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* TOGGLES */
    .btn-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 4px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .btn-toggle .dot { width: 6px; height: 6px; border-radius: 50%; background: #64748b; }
    .btn-toggle.active { background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.35); color: #4ade80; }
    .btn-toggle.active .dot { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
    .btn-toggle.star.active { background: rgba(234, 179, 8, 0.15); border-color: rgba(234, 179, 8, 0.35); color: #facc15; }
    .btn-toggle.fire.active { background: rgba(249, 115, 22, 0.15); border-color: rgba(249, 115, 22, 0.35); color: #fb923c; }

    /* BADGES */
    .rating-badge { background: rgba(234, 179, 8, 0.12); color: #facc15; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
    .url-badge { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
    .auto-badge { background: rgba(255, 255, 255, 0.05); color: #64748b; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; }
    .date-cell { color: #64748b; font-size: 0.8rem; white-space: nowrap; }

    /* ROW ACTIONS */
    .row-actions { display: flex; gap: 0.4rem; justify-content: flex-end; }
    .btn-icon {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      cursor: pointer;
      padding: 6px 9px;
      font-size: 0.85rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      transition: all 0.15s ease;
    }
    .btn-icon:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-1px); }
    .btn-icon.delete:hover { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }

    /* EMPTY / LOADING */
    .loading-state { text-align: center; padding: 4rem 1rem; color: #94a3b8; }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #06b6d4;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 0.8s linear infinite;
    }
    .empty-state { text-align: center; padding: 4rem 1.5rem; color: #64748b; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { color: white; margin: 0 0 0.5rem; font-size: 1.25rem; }
    .empty-state p { max-width: 480px; margin: 0 auto 1.75rem; font-size: 0.9rem; line-height: 1.5; color: #94a3b8; }

    /* FORMS */
    .form-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 0.7rem 0.9rem;
      color: white;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .form-control:focus { border-color: #06b6d4; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2); }
    .form-group { display: flex; flex-direction: column; gap: 0.45rem; }
    .form-label { font-size: 0.82rem; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.04em; }

    /* MODAL BASE */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-card {
      background: #111827;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .modal-header h3 { margin: 0; color: white; font-size: 1.25rem; font-weight: 700; }
    .btn-close { background: none; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
    .btn-close:hover { color: white; background: rgba(255,255,255,0.05); }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.35rem; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .alert-success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem; }
    .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spinning { animation: spin 0.8s linear infinite; display: inline-block; }
  `]
})
export class AdminTvComponent implements OnInit, OnDestroy {
  private readonly adminMedia = inject(AdminMediaService);
  private readonly movieService = inject(MovieService);
  private readonly cdr = inject(ChangeDetectorRef);

  list: MediaOverride[] = [];
  searchFilter = '';
  loading = false;
  successMsg = '';
  errorMsg = '';
  selectedEdit: MediaOverride | null = null;

  get filteredList(): MediaOverride[] {
    if (!this.searchFilter.trim()) return this.list;
    const q = this.searchFilter.toLowerCase().trim();
    return this.list.filter(item => {
      const idMatch = item.id?.toString().includes(q);
      const titleMatch = item.title?.toLowerCase().includes(q);
      const seoMatch = item.seoTitle?.toLowerCase().includes(q);
      const slugMatch = item.slug?.toLowerCase().includes(q);
      const yearMatch = item.release_date?.includes(q);
      return idMatch || titleMatch || seoMatch || slugMatch || yearMatch;
    });
  }

  get publishedCount(): number {
    return this.list.filter(s => s.published !== false).length;
  }

  get featuredCount(): number {
    return this.list.filter(s => s.featured).length;
  }

  ngOnInit(): void {
    this.loadTv();
  }

  ngOnDestroy(): void {}

  async loadTv(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      this.list = await this.adminMedia.getAllOverrides('tv');
    } catch (err: any) {
      this.errorMsg = 'Failed to load TV series: ' + (err.message || 'Error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Toggles ─────────────────────────────────────────────────────

  async togglePublished(item: MediaOverride): Promise<void> {
    const next = !(item.published ?? true);
    await this.adminMedia.togglePublished(item.id, 'tv', next);
    item.published = next;
    this.showSuccess(`Series #${item.id} is now ${next ? 'Published' : 'Draft'}.`);
  }

  async toggleFeatured(item: MediaOverride): Promise<void> {
    const next = !item.featured;
    await this.adminMedia.toggleFeatured(item.id, 'tv', next);
    item.featured = next;
    this.showSuccess(`Series #${item.id} ${next ? 'marked as Featured ⭐' : 'removed from Featured'}.`);
  }

  async toggleTrending(item: MediaOverride): Promise<void> {
    const next = !item.trending;
    item.trending = next;
    await this.adminMedia.saveOverride(item);
    this.showSuccess(`Series #${item.id} ${next ? 'marked as Trending 🔥' : 'removed from Trending'}.`);
  }

  editItem(item: MediaOverride): void {
    this.selectedEdit = { ...item };
  }

  async saveEdit(): Promise<void> {
    if (!this.selectedEdit) return;
    await this.adminMedia.saveOverride(this.selectedEdit);
    await this.loadTv();
    this.selectedEdit = null;
    this.showSuccess('TV series override updated.');
  }

  async deleteItem(id: string): Promise<void> {
    if (!confirm(`Are you sure you want to remove series #${id}?`)) return;
    await this.adminMedia.deleteOverride(id, 'tv');
    this.list = this.list.filter(i => i.id !== id);
    this.showSuccess(`Series #${id} deleted.`);
  }

  getPosterUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return this.movieService.getImageUrl(path, 'w185');
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => (this.successMsg = ''), 4000);
  }
}
