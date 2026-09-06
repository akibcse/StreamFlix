import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../../../services/movie.service';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { Genre } from '../../../../models/media.model';

export interface AdminGenreItem {
  id: number | string;
  name: string;
  isCustom?: boolean;
  type?: 'movie' | 'tv';
}

@Component({
  selector: 'app-admin-genres',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Genres & Category Taxonomy</h1>
          <p>Browse and manage the film and television genre classification system, or define custom categories.</p>
        </div>
        <div class="header-actions">
          <div class="type-toggle">
            <button [class.active]="selectedType === 'movie'" (click)="setType('movie')">Movie Genres</button>
            <button [class.active]="selectedType === 'tv'" (click)="setType('tv')">TV Genres</button>
          </div>
          <button class="btn-primary" (click)="showAddModal = true">
            <span>➕</span> Add Custom Genre
          </button>
        </div>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>

      <div class="toolbar">
        <input
          type="text"
          placeholder="Filter genre by name or ID..."
          [(ngModel)]="searchFilter"
          class="form-control"
        />
        <span class="count-badge">{{ filteredGenres.length }} Genres Active</span>
      </div>

      <div class="genres-grid">
        <div *ngFor="let g of filteredGenres" class="genre-tile" [class.custom-genre]="g.isCustom">
          <div class="genre-top">
            <div class="tag-row">
              <span class="genre-id">#{{ g.id }}</span>
              <span *ngIf="g.isCustom" class="badge-custom">Custom</span>
            </div>
            <div class="actions-right">
              <button *ngIf="g.isCustom" class="btn-del-genre" (click)="deleteCustomGenre(g.id)" title="Delete Custom Genre">
                🗑️
              </button>
              <a [routerLink]="['/genre', selectedType, g.id, g.name]" target="_blank" class="link-external" title="Open public view">
                ↗
              </a>
            </div>
          </div>
          <h3 class="genre-title">{{ g.name }}</h3>
          <div class="genre-bottom">
            <span class="type-tag">{{ selectedType | uppercase }}</span>
            <a [routerLink]="['/genre', selectedType, g.id, g.name]" class="btn-view">Browse Titles</a>
          </div>
        </div>
      </div>

      <!-- ADD CUSTOM GENRE MODAL -->
      <div class="modal-backdrop" *ngIf="showAddModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Add Custom Genre</h3>
            <button class="btn-close" (click)="showAddModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Genre Name</label>
              <input type="text" [(ngModel)]="newGenreName" class="form-control" placeholder="e.g. Anime Classics, Cyberpunk, K-Drama" />
            </div>
            <div class="form-group">
              <label>Target Media Type</label>
              <select [(ngModel)]="newGenreType" class="form-control">
                <option value="movie">Movies</option>
                <option value="tv">TV Series</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showAddModal = false">Cancel</button>
            <button class="btn-primary" [disabled]="!newGenreName.trim()" (click)="addCustomGenre()">Save Genre</button>
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
    .header-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .type-toggle {
      display: flex;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 3px;
    }
    .type-toggle button {
      background: none;
      border: none;
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .type-toggle button.active {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      padding: 0.6rem 1.15rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
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
    .genres-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .genre-tile {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 130px;
      transition: transform 0.2s;
    }
    .genre-tile:hover {
      transform: translateY(-3px);
      border-color: rgba(99, 102, 241, 0.4);
    }
    .genre-tile.custom-genre {
      border-color: rgba(168, 85, 247, 0.4);
      background: rgba(24, 15, 40, 0.6);
    }
    .genre-top { display: flex; justify-content: space-between; align-items: center; }
    .tag-row { display: flex; align-items: center; gap: 0.5rem; }
    .genre-id { font-size: 0.75rem; color: #64748b; font-family: monospace; }
    .badge-custom { background: rgba(168, 85, 247, 0.2); color: #c084fc; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .actions-right { display: flex; align-items: center; gap: 0.4rem; }
    .btn-del-genre { background: none; border: none; cursor: pointer; font-size: 0.85rem; }
    .link-external { color: #94a3b8; text-decoration: none; font-size: 1.1rem; }
    .link-external:hover { color: white; }
    .genre-title { font-size: 1.15rem; color: white; margin: 0.5rem 0; font-weight: 700; }
    .genre-bottom { display: flex; justify-content: space-between; align-items: center; }
    .type-tag { font-size: 0.7rem; color: #a855f7; font-weight: 700; }
    .btn-view {
      font-size: 0.8rem;
      color: #60a5fa;
      text-decoration: none;
    }
    .btn-view:hover { text-decoration: underline; }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      backdrop-filter: blur(4px);
    }
    .modal-card {
      background: #111827; border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px; width: 100%; max-width: 440px; padding: 1.5rem;
      display: flex; flex-direction: column; gap: 1rem;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { margin: 0; color: white; font-size: 1.2rem; }
    .btn-close { background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; }
    .modal-body .form-control { max-width: 100%; width: 100%; box-sizing: border-box; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);
      color: white; padding: 0.55rem 1.1rem; border-radius: 8px; cursor: pointer;
    }
  `]
})
export class AdminGenresComponent implements OnInit {
  private readonly movieService = inject(MovieService);
  private readonly adminMedia = inject(AdminMediaService);

  selectedType: 'movie' | 'tv' = 'movie';
  genres: AdminGenreItem[] = [];
  searchFilter = '';
  showAddModal = false;
  newGenreName = '';
  newGenreType: 'movie' | 'tv' = 'movie';
  successMsg = '';

  get filteredGenres(): AdminGenreItem[] {
    if (!this.searchFilter.trim()) return this.genres;
    const q = this.searchFilter.toLowerCase();
    return this.genres.filter(g => g.name.toLowerCase().includes(q) || g.id.toString().includes(q));
  }

  ngOnInit(): void {
    this.loadGenres();
  }

  setType(type: 'movie' | 'tv'): void {
    this.selectedType = type;
    this.newGenreType = type;
    this.loadGenres();
  }

  async loadGenres(): Promise<void> {
    const [tmdbList, customList] = await Promise.all([
      new Promise<Genre[]>((resolve) => {
        this.movieService.getGenres(this.selectedType).subscribe({
          next: list => resolve(list),
          error: () => resolve([])
        });
      }),
      this.adminMedia.getCustomGenres()
    ]);

    const matchingCustom = customList
      .filter((c: any) => !c.type || c.type === this.selectedType)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        isCustom: true,
        type: c.type || this.selectedType
      }));

    this.genres = [...matchingCustom, ...tmdbList];
  }

  async addCustomGenre(): Promise<void> {
    if (!this.newGenreName.trim()) return;
    const customId = `cg_${Date.now()}`;
    await this.adminMedia.saveCustomGenre({
      id: customId,
      name: this.newGenreName.trim(),
      type: this.newGenreType
    });
    this.newGenreName = '';
    this.showAddModal = false;
    this.successMsg = 'Custom genre created successfully!';
    await this.loadGenres();
    setTimeout(() => (this.successMsg = ''), 3000);
  }

  async deleteCustomGenre(id: string | number): Promise<void> {
    if (!confirm('Remove this custom genre?')) return;
    await this.adminMedia.deleteCustomGenre(id.toString());
    this.genres = this.genres.filter(g => g.id !== id);
    this.successMsg = 'Custom genre deleted.';
    setTimeout(() => (this.successMsg = ''), 3000);
  }
}
