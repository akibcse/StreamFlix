import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, switchMap, combineLatest, map } from 'rxjs';
import { MovieService } from '../../services/movie.service';
import { MediaItem, Genre, MediaType } from '../../models/media.model';

@Component({
  selector: 'app-media-browse',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="browse-page">
      <div class="browse-container">
        <header class="browse-header">
          <div>
            <h1 class="browse-title">{{ mediaType() === 'tv' ? 'Explore TV Series' : 'Explore Movies' }}</h1>
            <p class="browse-subtitle">Browse, filter, and stream thousands of titles</p>
          </div>

          <!-- Filters Bar -->
          <div class="filters-bar">
            <!-- Genre Filter -->
            <select
              [ngModel]="selectedGenre()"
              (ngModelChange)="onGenreChange($event)"
              class="filter-select"
            >
              <option [ngValue]="null">All Genres</option>
              <option *ngFor="let g of genres$ | async" [ngValue]="g.id">
                {{ g.name }}
              </option>
            </select>

            <!-- Sort Filter -->
            <select
              [ngModel]="selectedSort()"
              (ngModelChange)="onSortChange($event)"
              class="filter-select"
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Release Date (Newest)</option>
            </select>

            <!-- Year Filter -->
            <select
              [ngModel]="selectedYear()"
              (ngModelChange)="onYearChange($event)"
              class="filter-select"
            >
              <option [ngValue]="null">All Years</option>
              <option *ngFor="let y of years" [ngValue]="y">{{ y }}</option>
            </select>
          </div>
        </header>

        <!-- Media Grid -->
        <main class="grid-section" *ngIf="mediaItems$ | async as items; else loadingTpl">
          <div class="media-grid" *ngIf="items.length > 0; else emptyTpl">
            <article
              *ngFor="let item of items"
              class="browse-card"
              (click)="navigateToMedia(item)"
            >
              <div class="card-poster">
                <img [src]="getPosterUrl(item.poster_path)" [alt]="item.title || item.name" loading="lazy" />
                <span class="badge-rating">⭐ {{ item.vote_average | number:'1.1-1' }}</span>
                <div class="play-overlay">
                  <span class="play-btn">▶</span>
                </div>
              </div>
              <div class="card-meta">
                <h3 class="card-title">{{ item.title || item.name }}</h3>
                <span class="card-year">{{ getYear(item.release_date || item.first_air_date) }}</span>
              </div>
            </article>
          </div>

          <!-- Pagination -->
          <div class="pagination-bar" *ngIf="items.length > 0">
            <button
              class="page-btn"
              (click)="changePage(currentPage() - 1)"
              [disabled]="currentPage() <= 1"
            >
              ← Previous
            </button>
            <span class="page-indicator">Page {{ currentPage() }}</span>
            <button
              class="page-btn"
              (click)="changePage(currentPage() + 1)"
            >
              Next →
            </button>
          </div>
        </main>

        <ng-template #emptyTpl>
          <div class="empty-state">
            <p>No titles found matching your filter criteria.</p>
            <button class="btn-reset" (click)="resetFilters()">Reset Filters</button>
          </div>
        </ng-template>

        <ng-template #loadingTpl>
          <div class="loading-box">
            <div class="spinner"></div>
            <p>Loading titles...</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #0b0e14;
      color: #f1f5f9;
      min-height: calc(100vh - 75px);
      padding: 2.5rem 1.5rem 5rem;
    }
    .browse-container { max-width: 1400px; margin: 0 auto; }
    .browse-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .browse-title { font-size: 2.25rem; font-weight: 800; color: #ffffff; margin: 0 0 0.4rem; letter-spacing: -0.02em; }
    .browse-subtitle { color: #94a3b8; margin: 0; font-size: 0.95rem; }
    .filters-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .filter-select {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
    }
    .filter-select:focus { border-color: #6366f1; }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.5rem;
    }
    .browse-card {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.25s ease, border-color 0.25s ease;
    }
    .browse-card:hover {
      transform: translateY(-6px);
      border-color: rgba(99, 102, 241, 0.4);
    }
    .card-poster { position: relative; width: 100%; aspect-ratio: 2 / 3; background: #1a1f2c; overflow: hidden; }
    .card-poster img { width: 100%; height: 100%; object-fit: cover; }
    .badge-rating {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(11, 14, 20, 0.85);
      border: 1px solid rgba(251, 191, 36, 0.3);
      color: #fbbf24;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .play-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .browse-card:hover .play-overlay { opacity: 1; }
    .play-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #6366f1;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.6);
    }
    .card-meta { padding: 0.85rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .card-title { font-size: 0.92rem; font-weight: 600; color: #ffffff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-year { font-size: 0.8rem; color: #94a3b8; }
    .pagination-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
      margin-top: 3rem;
    }
    .page-btn {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) { background: #6366f1; border-color: #6366f1; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-indicator { color: #94a3b8; font-size: 0.95rem; font-weight: 600; }
    .empty-state { text-align: center; padding: 5rem 1rem; color: #94a3b8; }
    .btn-reset {
      margin-top: 1rem;
      background: #6366f1;
      color: #ffffff;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
    }
    .loading-box { text-align: center; padding: 5rem 1rem; color: #94a3b8; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaBrowseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movieService = inject(MovieService);

  readonly mediaType = signal<MediaType>('movie');
  readonly selectedGenre = signal<number | null>(null);
  readonly selectedSort = signal<string>('popularity.desc');
  readonly selectedYear = signal<number | null>(null);
  readonly currentPage = signal<number>(1);

  readonly years: number[] = Array.from({ length: 35 }, (_, i) => 2026 - i);

  genres$!: Observable<Genre[]>;
  mediaItems$!: Observable<MediaItem[]>;

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const type = segments[0]?.path === 'tv' ? 'tv' : 'movie';
      this.mediaType.set(type);
      this.genres$ = this.movieService.getGenres(type);
    });

    this.route.queryParams.subscribe(params => {
      if (params['genre']) {
        this.selectedGenre.set(Number(params['genre']));
      }
    });

    this.mediaItems$ = combineLatest([
      this.route.url,
      this.route.queryParams
    ]).pipe(
      switchMap(() =>
        this.movieService.discover(
          this.mediaType(),
          this.selectedGenre() || undefined,
          this.selectedSort(),
          this.selectedYear() || undefined,
          this.currentPage()
        )
      ),
      map(res => res.results)
    );
  }

  onGenreChange(id: number | null): void {
    this.selectedGenre.set(id);
    this.currentPage.set(1);
    this.refresh();
  }

  onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.currentPage.set(1);
    this.refresh();
  }

  onYearChange(year: number | null): void {
    this.selectedYear.set(year);
    this.currentPage.set(1);
    this.refresh();
  }

  changePage(page: number): void {
    this.currentPage.set(page);
    this.refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetFilters(): void {
    this.selectedGenre.set(null);
    this.selectedSort.set('popularity.desc');
    this.selectedYear.set(null);
    this.currentPage.set(1);
    this.refresh();
  }

  private refresh(): void {
    this.mediaItems$ = this.movieService.discover(
      this.mediaType(),
      this.selectedGenre() || undefined,
      this.selectedSort(),
      this.selectedYear() || undefined,
      this.currentPage()
    ).pipe(map(res => res.results));
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  getYear(dateStr?: string): string {
    return dateStr ? new Date(dateStr).getFullYear().toString() : '';
  }

  navigateToMedia(item: MediaItem): void {
    this.router.navigate([`/${this.mediaType()}`, item.id]);
  }
}
