import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
  selector: 'app-admin-movies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <!-- PAGE HEADER -->
      <div class="page-header">
        <div class="header-titles">
          <h1>Movie Management</h1>
          <p>Import movies automatically from TMDB API or search individually. Manage streaming servers, custom embeds, and featured status.</p>
        </div>
        <div class="header-actions">
          <button class="btn-auto-import" (click)="openAutoImportModal()">
            <span class="icon">⚡</span>
            <span>Auto-Import from API</span>
          </button>
          <button class="btn-secondary" (click)="showImportModal = true">
            <span>📥</span>
            <span>Search & Import</span>
          </button>
          <button class="btn-icon-action" (click)="openAutoSyncModal()" title="Auto-Sync Settings">
            <span>⚙️</span>
          </button>
          <button class="btn-icon-action" (click)="loadMovies()" [disabled]="loading" title="Refresh Catalog">
            <span [class.spinning]="loading">🔄</span>
          </button>
        </div>
      </div>

      <!-- STATUS MESSAGES -->
      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <!-- AUTO-SYNC BANNER (if enabled) -->
      <div *ngIf="autoSyncConfig?.enabled" class="sync-banner">
        <div class="sync-banner-info">
          <span class="pulse-dot"></span>
          <span>Automatic API Sync is <strong>Active</strong> ({{ autoSyncConfig.category | uppercase }} • {{ autoSyncConfig.limit }} items)</span>
          <span class="sync-meta" *ngIf="autoSyncConfig.lastSyncTimestamp">
            • Last synced: {{ autoSyncConfig.lastSyncTimestamp | date:'short' }} ({{ autoSyncConfig.lastSyncCount || 0 }} added)
          </span>
        </div>
        <button class="btn-sync-quick" (click)="triggerQuickSync()" [disabled]="isImporting">
          {{ isImporting ? 'Syncing...' : 'Sync Now ⚡' }}
        </button>
      </div>

      <!-- TOOLBAR / FILTER -->
      <div class="toolbar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by ID, title, year or slug..."
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

      <!-- MOVIES CATALOG TABLE -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading movie library...</p>
        </div>

        <table class="data-table" *ngIf="!loading && filteredList.length > 0; else emptyTpl">
          <thead>
            <tr>
              <th style="width: 60px;">Poster</th>
              <th>Movie Details</th>
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
                    <div class="poster-placeholder">🎬</div>
                  </ng-template>
                </div>
              </td>

              <!-- TITLE & DETAILS -->
              <td>
                <div class="movie-info-cell">
                  <span class="movie-title" [title]="item.title || item.seoTitle || item.id">
                    {{ item.title || item.seoTitle || ('Movie #' + item.id) }}
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

              <!-- PUBLISHED TOGGLE -->
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
                  title="Toggle homepage hero feature"
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
                    [href]="'/movie/' + item.id"
                    target="_blank"
                    class="btn-icon view"
                    title="Preview movie page"
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
            <div class="empty-icon">🎬</div>
            <h3>No Movie Overrides Found</h3>
            <p *ngIf="searchFilter">No movies match your filter "<strong>{{ searchFilter }}</strong>".</p>
            <p *ngIf="!searchFilter">Your library is currently empty. Populate your catalog in seconds with our automated TMDB API importer!</p>
            <div class="empty-actions">
              <button class="btn-auto-import" (click)="openAutoImportModal()">
                <span>⚡</span> Auto-Import Trending Movies Now
              </button>
              <button class="btn-secondary" (click)="showImportModal = true">
                <span>📥</span> Search Single TMDB Movie
              </button>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- ========================================== -->
      <!-- AUTO-IMPORT MODAL (MAIN NEW FEATURE)      -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showAutoImportModal" (click)="handleAutoImportBackdrop()">
        <div class="modal-card auto-import-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="badge-accent">API Importer</span>
              <h3>Automatic Movie Importer</h3>
            </div>
            <button class="btn-close" (click)="closeAutoImportModal()" [disabled]="isImporting && !autoProgress?.status">✕</button>
          </div>

          <div class="modal-body">
            <!-- 1. CONFIGURATION VIEW (WHEN NOT RUNNING) -->
            <div *ngIf="!isImporting && autoProgress?.status !== 'completed'" class="auto-config-view">
              <p class="section-desc">
                Select a TMDB category and quantity. StreamFlix will automatically fetch metadata, posters, ratings, and configure playback overrides in bulk.
              </p>

              <!-- CATEGORY SELECTOR -->
              <div class="form-group">
                <label class="form-label">Select TMDB API Source</label>
                <div class="category-grid">
                  <div
                    *ngFor="let cat of categories"
                    class="category-card"
                    [class.selected]="autoImportCategory === cat.id"
                    (click)="autoImportCategory = cat.id"
                  >
                    <span class="cat-icon">{{ cat.icon }}</span>
                    <div class="cat-text">
                      <strong>{{ cat.name }}</strong>
                      <small>{{ cat.desc }}</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- QUANTITY SELECTOR -->
              <div class="form-group">
                <label class="form-label">How Many Movies to Import?</label>
                <div class="limit-selector">
                  <button
                    *ngFor="let l of [20, 40, 60, 100]"
                    class="btn-limit"
                    [class.active]="autoImportLimit === l"
                    (click)="autoImportLimit = l"
                  >
                    {{ l }} Movies
                  </button>
                  <div class="custom-limit-wrap">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      [(ngModel)]="autoImportLimit"
                      class="form-control custom-limit-input"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              </div>

              <!-- SMART OPTIONS -->
              <div class="form-group">
                <label class="form-label">Import Options</label>
                <div class="options-list">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="autoImportSkipExisting" />
                    <div class="checkbox-text">
                      <strong>Skip Existing Movies (Recommended)</strong>
                      <small>Avoid duplicates and preserve your existing custom settings</small>
                    </div>
                  </label>

                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="autoImportAutoPublish" />
                    <div class="checkbox-text">
                      <strong>Publish Immediately</strong>
                      <small>Make imported movies live in the site catalog right away</small>
                    </div>
                  </label>

                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="autoImportMarkFeatured" />
                    <div class="checkbox-text">
                      <strong>Mark as Featured ⭐</strong>
                      <small>Promote imported titles to the homepage featured carousel</small>
                    </div>
                  </label>

                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="autoImportMarkTrending" />
                    <div class="checkbox-text">
                      <strong>Mark as Trending 🔥</strong>
                      <small>Tag imported titles with the trending flame badge</small>
                    </div>
                  </label>
                </div>
              </div>

              <!-- START BUTTON -->
              <div class="modal-footer">
                <button class="btn-secondary" (click)="closeAutoImportModal()">Cancel</button>
                <button class="btn-auto-import-start" (click)="startAutoImport()">
                  <span>⚡</span> Start Importing {{ autoImportLimit }} Movies
                </button>
              </div>
            </div>

            <!-- 2. LIVE PROGRESS VIEW (WHEN RUNNING OR FINISHED) -->
            <div *ngIf="isImporting || autoProgress?.status === 'completed'" class="progress-view">
              <!-- PROGRESS BAR & PERCENTAGE -->
              <div class="progress-header">
                <div class="progress-title-status">
                  <span class="status-indicator" [class.running]="isImporting" [class.done]="autoProgress?.status === 'completed'"></span>
                  <h4>{{ autoProgress?.message || 'Processing import...' }}</h4>
                </div>
                <div class="progress-percent-badge">
                  {{ getProgressPercentage() }}%
                </div>
              </div>

              <div class="progress-track">
                <div
                  class="progress-fill"
                  [style.width.%]="getProgressPercentage()"
                  [class.indeterminate]="isImporting && autoProgress?.current === 0"
                ></div>
              </div>

              <!-- SPOTLIGHT CARD (ACTIVE ITEM) -->
              <div class="active-item-card" *ngIf="autoProgress?.title">
                <div class="active-poster">
                  <img
                    *ngIf="autoProgress?.posterPath"
                    [src]="getPosterUrl(autoProgress?.posterPath)"
                    alt="Current"
                  />
                  <div *ngIf="!autoProgress?.posterPath" class="poster-dummy">🎬</div>
                </div>
                <div class="active-details">
                  <span class="active-label">Currently Processing</span>
                  <strong class="active-title">{{ autoProgress?.title }}</strong>
                  <span class="active-counter">
                    Item {{ autoProgress?.current }} of {{ autoProgress?.total }}
                  </span>
                </div>
              </div>

              <!-- LIVE STATS COUNTER -->
              <div class="live-stats-row">
                <div class="live-stat-card success">
                  <span class="stat-num">{{ autoProgress?.successCount || 0 }}</span>
                  <span class="stat-name">✓ Imported</span>
                </div>
                <div class="live-stat-card skipped">
                  <span class="stat-num">{{ autoProgress?.skippedCount || 0 }}</span>
                  <span class="stat-name">↷ Skipped (Existing)</span>
                </div>
                <div class="live-stat-card error">
                  <span class="stat-num">{{ autoProgress?.failedCount || 0 }}</span>
                  <span class="stat-name">⚠️ Failed</span>
                </div>
              </div>

              <!-- LIVE LOG STREAM -->
              <div class="log-stream-wrap">
                <div class="log-stream-header">
                  <span>Recent Activity</span>
                  <small>{{ autoProgress?.logs?.length || 0 }} events</small>
                </div>
                <div class="log-stream-body">
                  <div
                    *ngFor="let log of autoProgress?.logs"
                    class="log-row"
                    [class.log-success]="log.status === 'success'"
                    [class.log-skipped]="log.status === 'skipped'"
                    [class.log-error]="log.status === 'error'"
                  >
                    <span class="log-time">{{ log.time }}</span>
                    <span class="log-tag">
                      {{ log.status === 'success' ? '✓ IMPORTED' : (log.status === 'skipped' ? '↷ SKIPPED' : '⚠️ FAILED') }}
                    </span>
                    <span class="log-title">{{ log.title }}</span>
                  </div>
                  <div *ngIf="!autoProgress?.logs?.length" class="log-empty">
                    Waiting for activity...
                  </div>
                </div>
              </div>

              <!-- CONTROLS -->
              <div class="progress-actions">
                <button
                  *ngIf="isImporting"
                  class="btn-cancel"
                  (click)="cancelAutoImport()"
                >
                  ⏹ Stop Import
                </button>
                <button
                  *ngIf="!isImporting && autoProgress?.status === 'completed'"
                  class="btn-primary btn-done"
                  (click)="closeAutoImportModal()"
                >
                  ✓ Done & View Movies
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- AUTO-SYNC CONFIG MODAL                    -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showAutoSyncModal" (click)="showAutoSyncModal = false">
        <div class="modal-card sync-config-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>⚙️ Auto-Sync Configuration</h3>
            <button class="btn-close" (click)="showAutoSyncModal = false">✕</button>
          </div>
          <div class="modal-body" *ngIf="autoSyncConfig">
            <p class="section-desc">
              Configure background synchronization so your catalog automatically stays populated with the newest TMDB movies.
            </p>

            <div class="form-group">
              <label class="checkbox-label sync-toggle-label">
                <input type="checkbox" [(ngModel)]="autoSyncConfig.enabled" />
                <div class="checkbox-text">
                  <strong>Enable Automated Background Sync</strong>
                  <small>Checks and imports the freshest movies when admins access the dashboard</small>
                </div>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">Sync Category</label>
              <select [(ngModel)]="autoSyncConfig.category" class="form-control">
                <option value="trending">🔥 Trending (This Week)</option>
                <option value="popular">🌟 Popular Blockbusters</option>
                <option value="now_playing">🎬 Now Playing in Theaters</option>
                <option value="top_rated">⭐ Top Rated</option>
                <option value="upcoming">📅 Upcoming Releases</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Sync Batch Size</label>
              <select [(ngModel)]="autoSyncConfig.limit" class="form-control">
                <option [ngValue]="20">20 Movies per sync</option>
                <option [ngValue]="40">40 Movies per sync</option>
                <option [ngValue]="60">60 Movies per sync</option>
              </select>
            </div>

            <div class="sync-status-box" *ngIf="autoSyncConfig.lastSyncTimestamp">
              <span>Last Synchronized: <strong>{{ autoSyncConfig.lastSyncTimestamp | date:'medium' }}</strong></span>
              <span>Movies Added: <strong>{{ autoSyncConfig.lastSyncCount || 0 }}</strong></span>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="showAutoSyncModal = false">Cancel</button>
              <button class="btn-primary" (click)="saveAutoSyncConfig()">Save Configuration</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- SINGLE SEARCH IMPORT MODAL                 -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showImportModal" (click)="showImportModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Search & Import Single Movie</h3>
            <button class="btn-close" (click)="showImportModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Search TMDB by Movie Title</label>
              <div class="search-box">
                <input
                  type="text"
                  [(ngModel)]="tmdbQuery"
                  (keyup.enter)="searchTmdb()"
                  placeholder="e.g. Inception, Avatar, Interstellar..."
                  class="form-control"
                />
                <button class="btn-primary btn-search" (click)="searchTmdb()" [disabled]="searching">
                  {{ searching ? 'Searching...' : 'Search' }}
                </button>
              </div>
            </div>

            <div class="tmdb-results" *ngIf="searchResults.length > 0">
              <div *ngFor="let m of searchResults" class="result-row">
                <img [src]="getPosterUrl(m.poster_path)" class="result-poster" [alt]="m.title" />
                <div class="result-info">
                  <strong>{{ m.title }} ({{ m.release_date?.substring(0,4) || 'N/A' }})</strong>
                  <p>TMDB ID: #{{ m.id }} | ⭐ {{ m.vote_average || 'N/A' }}</p>
                </div>
                <button
                  class="btn-import"
                  (click)="importMovie(m.id)"
                  [disabled]="importingId === m.id"
                >
                  {{ importingId === m.id ? 'Importing...' : 'Import' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- EDIT OVERRIDE MODAL                        -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="selectedEdit" (click)="selectedEdit = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Movie Override (#{{ selectedEdit.id }})</h3>
            <button class="btn-close" (click)="selectedEdit = null">✕</button>
          </div>
          <div class="modal-body" *ngIf="selectedEdit">
            <div class="form-group">
              <label class="form-label">Custom Stream Embed URL (optional override)</label>
              <input
                type="text"
                [(ngModel)]="selectedEdit.customEmbedUrl"
                placeholder="https://..."
                class="form-control"
              />
              <small class="form-hint">Leave empty to use automatic stream servers configured in Stream Servers settings.</small>
            </div>
            <div class="form-group">
              <label class="form-label">SEO Title Override</label>
              <input
                type="text"
                [(ngModel)]="selectedEdit.seoTitle"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label class="form-label">SEO Description</label>
              <textarea
                [(ngModel)]="selectedEdit.seoDescription"
                rows="3"
                class="form-control"
              ></textarea>
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

    /* ACTION BUTTONS */
    .btn-auto-import {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
      background-size: 200% 200%;
      animation: gradientShift 6s ease infinite;
      color: white;
      border: none;
      padding: 0.7rem 1.35rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
      transition: all 0.2s ease;
    }
    .btn-auto-import:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
    }
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
    .btn-icon-action:hover {
      background: rgba(255, 255, 255, 0.12);
      color: white;
    }
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
    .btn-primary:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    /* SYNC BANNER */
    .sync-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      font-size: 0.85rem;
      color: #c7d2fe;
    }
    .sync-banner-info { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse 1.8s infinite;
    }
    .sync-meta { color: #94a3b8; font-size: 0.8rem; }
    .btn-sync-quick {
      background: rgba(99, 102, 241, 0.3);
      border: 1px solid rgba(99, 102, 241, 0.5);
      color: white;
      border-radius: 8px;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    /* TOOLBAR */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .search-input-wrap {
      position: relative;
      flex: 1;
      max-width: 420px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 0.85rem;
    }
    .filter-input {
      padding-left: 2.25rem !important;
      padding-right: 2rem !important;
    }
    .clear-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.8rem;
    }
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
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }
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
    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }
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
    .poster-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .poster-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: #475569;
    }

    /* MOVIE DETAILS CELL */
    .movie-info-cell { display: flex; flex-direction: column; gap: 0.25rem; max-width: 260px; }
    .movie-title {
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .movie-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; }
    .id-badge {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 700;
      color: #94a3b8;
    }
    .year-tag { color: #64748b; }
    .slug-tag { color: #6366f1; font-family: monospace; font-size: 0.7rem; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
    .btn-toggle .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #64748b;
    }
    .btn-toggle.active {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.35);
      color: #4ade80;
    }
    .btn-toggle.active .dot { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
    .btn-toggle.star.active {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.35);
      color: #facc15;
    }
    .btn-toggle.fire.active {
      background: rgba(249, 115, 22, 0.15);
      border-color: rgba(249, 115, 22, 0.35);
      color: #fb923c;
    }

    /* BADGES */
    .rating-badge {
      background: rgba(234, 179, 8, 0.12);
      color: #facc15;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .url-badge {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .auto-badge {
      background: rgba(255, 255, 255, 0.05);
      color: #64748b;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
    }
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
    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }
    .btn-icon.delete:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.4);
    }

    /* EMPTY / LOADING STATE */
    .loading-state { text-align: center; padding: 4rem 1rem; color: #94a3b8; }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #6366f1;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 0.8s linear infinite;
    }
    .empty-state { text-align: center; padding: 4rem 1.5rem; color: #64748b; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { color: white; margin: 0 0 0.5rem; font-size: 1.25rem; }
    .empty-state p { max-width: 480px; margin: 0 auto 1.75rem; font-size: 0.9rem; line-height: 1.5; color: #94a3b8; }
    .empty-actions { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }

    /* FORM CONTROLS */
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
    .form-control:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    .form-group { display: flex; flex-direction: column; gap: 0.45rem; }
    .form-label { font-size: 0.82rem; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.04em; }
    .form-hint { font-size: 0.75rem; color: #64748b; }

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
    .auto-import-card { max-width: 680px; }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .modal-title-wrap { display: flex; flex-direction: column; gap: 0.2rem; }
    .badge-accent {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a855f7;
      font-weight: 700;
    }
    .modal-header h3 { margin: 0; color: white; font-size: 1.25rem; font-weight: 700; }
    .btn-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .btn-close:hover { color: white; background: rgba(255,255,255,0.05); }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.35rem; }
    .section-desc { margin: 0; color: #94a3b8; font-size: 0.88rem; line-height: 1.5; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* AUTO-IMPORT CATEGORIES */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.65rem;
    }
    .category-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.75rem 0.9rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .category-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .category-card.selected {
      background: rgba(139, 92, 246, 0.18);
      border-color: #a855f7;
      box-shadow: 0 0 14px rgba(168, 85, 247, 0.25);
    }
    .cat-icon { font-size: 1.3rem; }
    .cat-text { display: flex; flex-direction: column; }
    .cat-text strong { color: white; font-size: 0.85rem; }
    .cat-text small { color: #94a3b8; font-size: 0.72rem; }

    /* LIMIT SELECTOR */
    .limit-selector { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-limit {
      flex: 1;
      min-width: 80px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      padding: 0.65rem 0.85rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-limit:hover { background: rgba(255, 255, 255, 0.08); }
    .btn-limit.active {
      background: #6366f1;
      border-color: #818cf8;
      color: white;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
    }
    .custom-limit-wrap { width: 100px; }
    .custom-limit-input { text-align: center; }

    /* OPTIONS CHECKBOXES */
    .options-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 0.65rem 0.85rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .checkbox-label:hover { background: rgba(255, 255, 255, 0.04); }
    .checkbox-label input[type="checkbox"] {
      margin-top: 3px;
      accent-color: #8b5cf6;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .checkbox-text { display: flex; flex-direction: column; }
    .checkbox-text strong { color: #f1f5f9; font-size: 0.85rem; }
    .checkbox-text small { color: #94a3b8; font-size: 0.75rem; }

    .btn-auto-import-start {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
      transition: all 0.2s ease;
    }
    .btn-auto-import-start:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
    }

    /* PROGRESS VIEW */
    .progress-view { display: flex; flex-direction: column; gap: 1.25rem; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; }
    .progress-title-status { display: flex; align-items: center; gap: 0.6rem; }
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #64748b;
    }
    .status-indicator.running {
      background: #3b82f6;
      box-shadow: 0 0 10px #3b82f6;
      animation: pulse 1.5s infinite;
    }
    .status-indicator.done {
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
    }
    .progress-title-status h4 { margin: 0; color: white; font-size: 1rem; font-weight: 600; }
    .progress-percent-badge {
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      color: #c084fc;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
    }
    .progress-track {
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6);
      border-radius: 6px;
      transition: width 0.25s ease;
    }
    .progress-fill.indeterminate {
      animation: indeterminate 1.5s infinite linear;
      width: 35% !important;
    }

    /* ACTIVE SPOTLIGHT ITEM */
    .active-item-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.75rem 1rem;
    }
    .active-poster {
      width: 42px;
      height: 60px;
      border-radius: 6px;
      overflow: hidden;
      background: #1f2937;
      flex-shrink: 0;
    }
    .active-poster img { width: 100%; height: 100%; object-fit: cover; }
    .poster-dummy { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .active-details { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
    .active-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #818cf8; font-weight: 600; }
    .active-title { color: white; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .active-counter { font-size: 0.78rem; color: #94a3b8; }

    /* LIVE STATS ROW */
    .live-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .live-stat-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 0.75rem 0.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .live-stat-card.success .stat-num { color: #4ade80; }
    .live-stat-card.skipped .stat-num { color: #facc15; }
    .live-stat-card.error .stat-num { color: #f87171; }
    .stat-num { font-size: 1.35rem; font-weight: 800; }
    .stat-name { font-size: 0.72rem; color: #94a3b8; }

    /* LOG STREAM */
    .log-stream-wrap {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      overflow: hidden;
    }
    .log-stream-header {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .log-stream-body {
      max-height: 180px;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .log-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .log-time { color: #64748b; font-family: monospace; font-size: 0.7rem; }
    .log-tag {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: monospace;
    }
    .log-row.log-success .log-tag { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .log-row.log-skipped .log-tag { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    .log-row.log-error .log-tag { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .log-title { color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .log-empty { color: #64748b; text-align: center; padding: 1rem; font-size: 0.8rem; }

    /* PROGRESS ACTIONS */
    .progress-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-cancel:hover { background: rgba(239, 68, 68, 0.3); }
    .btn-done {
      background: linear-gradient(135deg, #22c55e, #16a34a) !important;
      padding: 0.75rem 1.75rem !important;
      font-size: 0.95rem !important;
    }

    /* SEARCH MODAL RESULTS */
    .search-box { display: flex; gap: 0.5rem; }
    .btn-search { white-space: nowrap; }
    .tmdb-results { display: flex; flex-direction: column; gap: 0.75rem; max-height: 350px; overflow-y: auto; }
    .result-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255,255,255,0.03);
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
    }
    .result-poster { width: 44px; height: 64px; object-fit: cover; border-radius: 6px; }
    .result-info { flex: 1; font-size: 0.85rem; }
    .result-info strong { color: white; display: block; margin-bottom: 2px; }
    .result-info p { margin: 0; color: #94a3b8; font-size: 0.75rem; }
    .btn-import {
      background: #6366f1;
      border: none;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
    }

    /* SYNC STATUS BOX */
    .sync-status-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .sync-status-box strong { color: white; }

    /* ALERTS */
    .alert-success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem; }
    .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem; }

    /* ANIMATIONS */
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.15); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }
    .spinning { animation: spin 0.8s linear infinite; display: inline-block; }
  `]
})
export class AdminMoviesComponent implements OnInit, OnDestroy {
  private readonly adminMedia = inject(AdminMediaService);
  private readonly movieService = inject(MovieService);

  list: MediaOverride[] = [];
  searchFilter = '';
  loading = false;
  successMsg = '';
  errorMsg = '';

  // Single Search Modal
  showImportModal = false;
  selectedEdit: MediaOverride | null = null;
  tmdbQuery = '';
  searchResults: any[] = [];
  searching = false;
  importingId: number | null = null;

  // Auto-Import Feature
  showAutoImportModal = false;
  isImporting = false;
  autoImportCategory: AutoImportCategory = 'trending';
  autoImportLimit = 20;
  autoImportSkipExisting = true;
  autoImportAutoPublish = true;
  autoImportMarkFeatured = false;
  autoImportMarkTrending = false;
  autoProgress: AutoImportProgress | null = null;
  private cancellationToken: { isCancelled: boolean } | null = null;

  // Auto-Sync Feature
  showAutoSyncModal = false;
  autoSyncConfig: AutoSyncConfig = {
    enabled: false,
    category: 'trending',
    limit: 20
  };

  readonly categories: { id: AutoImportCategory; name: string; desc: string; icon: string }[] = [
    { id: 'trending', name: 'Trending', desc: 'Viral hits this week', icon: '🔥' },
    { id: 'popular', name: 'Popular', desc: 'Current box office & streaming', icon: '🌟' },
    { id: 'now_playing', name: 'Now Playing', desc: 'In movie theaters now', icon: '🎬' },
    { id: 'top_rated', name: 'Top Rated', desc: 'All-time cinematic classics', icon: '⭐' },
    { id: 'upcoming', name: 'Upcoming', desc: 'Anticipated future releases', icon: '📅' },
    { id: 'all', name: 'Balanced Mix', desc: 'Top picks from every category', icon: '🌐' }
  ];

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
    return this.list.filter(m => m.published !== false).length;
  }

  get featuredCount(): number {
    return this.list.filter(m => m.featured).length;
  }

  ngOnInit(): void {
    this.loadMovies();
    this.loadAutoSyncConfig();
  }

  ngOnDestroy(): void {
    if (this.cancellationToken) {
      this.cancellationToken.isCancelled = true;
    }
  }

  async loadMovies(): Promise<void> {
    this.loading = true;
    try {
      this.list = await this.adminMedia.getAllOverrides('movie');
    } catch (err: any) {
      this.errorMsg = 'Failed to load movies: ' + (err.message || 'Unknown error');
    } finally {
      this.loading = false;
    }
  }

  async loadAutoSyncConfig(): Promise<void> {
    try {
      this.autoSyncConfig = await this.adminMedia.getAutoSyncConfig();
      // If auto-sync is enabled and more than 24 hours have passed, run background sync check
      if (this.autoSyncConfig.enabled) {
        const lastSync = this.autoSyncConfig.lastSyncTimestamp || 0;
        const oneDay = 24 * 60 * 60 * 1000;
        if (Date.now() - lastSync > oneDay) {
          this.triggerQuickSync();
        }
      }
    } catch { /* ok */ }
  }

  // ─── Auto-Import Engine ──────────────────────────────────────────

  openAutoImportModal(): void {
    this.showAutoImportModal = true;
    if (!this.isImporting) {
      this.autoProgress = null;
    }
  }

  closeAutoImportModal(): void {
    if (this.isImporting) {
      if (!confirm('Import is currently running. Are you sure you want to stop?')) {
        return;
      }
      this.cancelAutoImport();
    }
    this.showAutoImportModal = false;
    this.loadMovies();
  }

  handleAutoImportBackdrop(): void {
    if (!this.isImporting) {
      this.closeAutoImportModal();
    }
  }

  async startAutoImport(): Promise<void> {
    const limit = Math.max(1, Math.min(200, Number(this.autoImportLimit) || 20));
    this.isImporting = true;
    this.cancellationToken = { isCancelled: false };

    const options: AutoImportOptions = {
      category: this.autoImportCategory,
      limit,
      skipExisting: this.autoImportSkipExisting,
      autoPublish: this.autoImportAutoPublish,
      markFeatured: this.autoImportMarkFeatured,
      markTrending: this.autoImportMarkTrending
    };

    try {
      const finalProgress = await this.adminMedia.autoImportMovies(
        options,
        progress => {
          this.autoProgress = progress;
        },
        this.cancellationToken
      );

      this.autoProgress = finalProgress;
      await this.loadMovies();
      this.showSuccess(`Auto-import finished! ${finalProgress.successCount} new movies added to catalog.`);
    } catch (err: any) {
      this.errorMsg = 'Auto-import failed: ' + (err.message || 'Error');
    } finally {
      this.isImporting = false;
      this.cancellationToken = null;
    }
  }

  cancelAutoImport(): void {
    if (this.cancellationToken) {
      this.cancellationToken.isCancelled = true;
      if (this.autoProgress) {
        this.autoProgress.message = 'Stopping import...';
      }
    }
  }

  getProgressPercentage(): number {
    if (!this.autoProgress || !this.autoProgress.total) return 0;
    return Math.min(100, Math.round((this.autoProgress.current / this.autoProgress.total) * 100));
  }

  // ─── Auto-Sync Settings ──────────────────────────────────────────

  openAutoSyncModal(): void {
    this.showAutoSyncModal = true;
  }

  async saveAutoSyncConfig(): Promise<void> {
    await this.adminMedia.saveAutoSyncConfig(this.autoSyncConfig);
    this.showAutoSyncModal = false;
    this.showSuccess('Auto-sync configuration saved!');
  }

  async triggerQuickSync(): Promise<void> {
    if (this.isImporting) return;
    this.isImporting = true;
    try {
      const options: AutoImportOptions = {
        category: this.autoSyncConfig.category || 'trending',
        limit: this.autoSyncConfig.limit || 20,
        skipExisting: true,
        autoPublish: true
      };
      const result = await this.adminMedia.autoImportMovies(options);
      await this.loadMovies();
      await this.loadAutoSyncConfig();
      if (result.successCount > 0) {
        this.showSuccess(`Auto-Sync finished: ${result.successCount} new movies added.`);
      }
    } catch (err: any) {
      console.error('Quick sync error:', err);
    } finally {
      this.isImporting = false;
    }
  }

  // ─── Status Toggles ──────────────────────────────────────────────

  async togglePublished(item: MediaOverride): Promise<void> {
    const next = !(item.published ?? true);
    await this.adminMedia.togglePublished(item.id, 'movie', next);
    item.published = next;
    this.showSuccess(`Movie #${item.id} is now ${next ? 'Published' : 'Draft'}.`);
  }

  async toggleFeatured(item: MediaOverride): Promise<void> {
    const next = !item.featured;
    await this.adminMedia.toggleFeatured(item.id, 'movie', next);
    item.featured = next;
    this.showSuccess(`Movie #${item.id} ${next ? 'marked as Featured ⭐' : 'removed from Featured'}.`);
  }

  async toggleTrending(item: MediaOverride): Promise<void> {
    const next = !item.trending;
    item.trending = next;
    await this.adminMedia.saveOverride(item);
    this.showSuccess(`Movie #${item.id} ${next ? 'marked as Trending 🔥' : 'removed from Trending'}.`);
  }

  // ─── Single TMDB Search & Import ─────────────────────────────────

  searchTmdb(): void {
    if (!this.tmdbQuery.trim()) return;
    this.searching = true;
    this.movieService.searchMulti(this.tmdbQuery.trim()).subscribe({
      next: res => {
        this.searchResults = (res.results || []).filter((r: any) => r.media_type === 'movie' || !r.media_type);
        this.searching = false;
      },
      error: () => (this.searching = false)
    });
  }

  async importMovie(id: number): Promise<void> {
    this.importingId = id;
    try {
      await this.adminMedia.importFromTmdb(id, 'movie');
      await this.loadMovies();
      this.showSuccess(`Imported TMDB #${id} successfully!`);
      this.showImportModal = false;
      this.tmdbQuery = '';
      this.searchResults = [];
    } catch (err: any) {
      this.errorMsg = err.message || 'Failed to import.';
      setTimeout(() => (this.errorMsg = ''), 4000);
    } finally {
      this.importingId = null;
    }
  }

  // ─── CRUD & Edit ─────────────────────────────────────────────────

  editItem(item: MediaOverride): void {
    this.selectedEdit = { ...item };
  }

  async saveEdit(): Promise<void> {
    if (!this.selectedEdit) return;
    await this.adminMedia.saveOverride(this.selectedEdit);
    await this.loadMovies();
    this.selectedEdit = null;
    this.showSuccess('Movie override updated successfully.');
  }

  async deleteItem(id: string): Promise<void> {
    if (!confirm(`Are you sure you want to remove movie #${id} from the override catalog?`)) return;
    await this.adminMedia.deleteOverride(id, 'movie');
    this.list = this.list.filter(i => i.id !== id);
    this.showSuccess(`Movie #${id} deleted.`);
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
