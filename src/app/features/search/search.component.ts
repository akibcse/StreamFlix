import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, switchMap, of, map, Observable } from 'rxjs';
import { MovieService } from '../../services/movie.service';
import { MediaItem } from '../../models/media.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="search-page">
      <div class="search-container">
        <header class="search-header">
          <h1 class="search-title">Search Movies & TV Shows</h1>
          <div class="search-box-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="main-search-input"
              placeholder="Search by title, character, actor or keyword..."
              [ngModel]="query()"
              (ngModelChange)="onQueryChange($event)"
              autofocus
            />
            <button
              type="button"
              class="clear-btn"
              *ngIf="query()"
              (click)="onQueryChange('')"
            >
              ✕
            </button>
          </div>

          <!-- Filter Pills -->
          <div class="filter-pills">
            <button
              type="button"
              class="pill-btn"
              [class.active]="filterType() === 'all'"
              (click)="setFilter('all')"
            >
              All Results
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="filterType() === 'movie'"
              (click)="setFilter('movie')"
            >
              🎬 Movies
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="filterType() === 'tv'"
              (click)="setFilter('tv')"
            >
              📺 TV Series
            </button>
          </div>

          <!-- Quick Trending Searches -->
          <div class="trending-keywords" *ngIf="!query()">
            <span class="keyword-label">Popular Searches:</span>
            <div class="keyword-chips">
              <button
                *ngFor="let kw of trendingKeywords"
                type="button"
                class="kw-chip"
                (click)="onQueryChange(kw)"
              >
                {{ kw }}
              </button>
            </div>
          </div>
        </header>

        <!-- Search Results Grid -->
        <main class="results-section">
          <ng-container *ngIf="filteredResults$ | async as results">
            <div class="results-header" *ngIf="query()">
              <span class="results-count">Found {{ results.length }} results for "{{ query() }}"</span>
            </div>

            <div class="media-grid" *ngIf="results.length > 0">
              <article
                *ngFor="let item of results"
                class="search-card"
                (click)="navigateToMedia(item)"
              >
                <div class="poster-box">
                  <img
                    [src]="getPosterUrl(item.poster_path)"
                    [alt]="item.title || item.name"
                    loading="lazy"
                  />
                  <span class="rating-tag">⭐ {{ item.vote_average | number:'1.1-1' }}</span>
                  <div class="hover-play">
                    <span>▶</span>
                  </div>
                </div>
                <div class="item-meta">
                  <h3 class="item-title">{{ item.title || item.name }}</h3>
                  <div class="item-sub">
                    <span>{{ getYear(item.release_date || item.first_air_date) }}</span>
                    <span class="type-tag" [class.tv]="item.media_type === 'tv'">
                      {{ item.media_type === 'tv' ? 'Series' : 'Movie' }}
                    </span>
                  </div>
                </div>
              </article>
            </div>

            <div class="empty-state" *ngIf="query() && results.length === 0">
              <span class="empty-icon">🎬</span>
              <h3>No results found for "{{ query() }}"</h3>
              <p>Check the spelling or try searching for another title.</p>
            </div>
          </ng-container>
        </main>
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
    .search-container { max-width: 1200px; margin: 0 auto; }
    .search-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 3rem;
      text-align: center;
    }
    .search-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .search-box-wrapper {
      position: relative;
      width: 100%;
      max-width: 700px;
    }
    .search-icon {
      position: absolute;
      left: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.2rem;
      color: #64748b;
    }
    .main-search-input {
      width: 100%;
      background: #151a24;
      border: 2px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      padding: 1rem 3.5rem;
      font-size: 1.1rem;
      color: #ffffff;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .main-search-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25);
    }
    .clear-btn {
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
    }
    .filter-pills {
      display: flex;
      gap: 0.75rem;
    }
    .pill-btn {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.5rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
    .pill-btn.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
      font-weight: 600;
    }
    .trending-keywords {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .keyword-label {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }
    .keyword-chips {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .kw-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .kw-chip:hover {
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      border-color: rgba(99, 102, 241, 0.3);
    }
    .results-header {
      margin-bottom: 1.5rem;
      color: #94a3b8;
      font-size: 0.95rem;
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.5rem;
    }
    .search-card {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.25s ease, border-color 0.25s ease;
    }
    .search-card:hover {
      transform: translateY(-6px);
      border-color: rgba(99, 102, 241, 0.4);
    }
    .poster-box {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 3;
      background: #1a1f2c;
      overflow: hidden;
    }
    .poster-box img { width: 100%; height: 100%; object-fit: cover; }
    .rating-tag {
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
    .hover-play {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .search-card:hover .hover-play { opacity: 1; }
    .hover-play span {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #6366f1;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .item-meta {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .item-title {
      font-size: 0.92rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .type-tag {
      background: rgba(255, 255, 255, 0.06);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.72rem;
      text-transform: uppercase;
    }
    .type-tag.tv {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }
    .empty-state {
      text-align: center;
      padding: 5rem 1rem;
      color: #94a3b8;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
  private readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly query = signal<string>('');
  readonly filterType = signal<'all' | 'movie' | 'tv'>('all');

  readonly trendingKeywords = [
    'Avatar',
    'Deadpool',
    'Stranger Things',
    'Oppenheimer',
    'Spider-Man',
    'The Last of Us',
    'Batman',
    'Game of Thrones'
  ];

  private readonly querySubject = new BehaviorSubject<string>('');

  readonly searchResults$: Observable<MediaItem[]> = this.querySubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => {
      const clean = q.trim();
      if (!clean) return of([]);
      return this.movieService.searchMulti(clean).pipe(map(res => res.results));
    })
  );

  readonly filteredResults$: Observable<MediaItem[]> = combineLatest([
    this.searchResults$,
    of(null) // trigger helper
  ]).pipe(
    map(([results]) => {
      const type = this.filterType();
      if (type === 'all') return results;
      return results.filter((item: MediaItem) => item.media_type === type);
    })
  );

  onQueryChange(val: string): void {
    this.query.set(val);
    this.querySubject.next(val);
  }

  setFilter(type: 'all' | 'movie' | 'tv'): void {
    this.filterType.set(type);
    this.querySubject.next(this.query()); // re-trigger filter
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  getYear(dateStr?: string): string {
    return dateStr ? new Date(dateStr).getFullYear().toString() : '';
  }

  navigateToMedia(item: MediaItem): void {
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    this.router.navigate([`/${type}`, item.id]);
  }
}
