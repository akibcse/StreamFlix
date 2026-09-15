import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, signal, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, catchError, of } from 'rxjs';
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
        <main class="grid-section">
          <div class="media-grid" *ngIf="allItems().length > 0">
            <article
              *ngFor="let item of allItems()"
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

          <!-- Initial Loading -->
          <div class="loading-box" *ngIf="isInitialLoading() && allItems().length === 0">
            <div class="spinner"></div>
            <p>Loading titles...</p>
          </div>

          <!-- Loading More -->
          <div class="loading-more" *ngIf="isLoadingMore() && allItems().length > 0">
            <div class="spinner"></div>
            <p>Loading more titles...</p>
          </div>

          <!-- Infinite Scroll Sentinel -->
          <div class="scroll-sentinel" #browseScrollSentinel></div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="!isInitialLoading() && allItems().length === 0">
            <p>No titles found matching your filter criteria.</p>
            <button class="btn-reset" (click)="resetFilters()">Reset Filters</button>
          </div>
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
    .loading-box, .loading-more { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    .scroll-sentinel { height: 1px; width: 100%; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaBrowseComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movieService = inject(MovieService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly mediaType = signal<MediaType>('movie');
  readonly selectedGenre = signal<number | null>(null);
  readonly selectedSort = signal<string>('popularity.desc');
  readonly selectedYear = signal<number | null>(null);

  readonly allItems = signal<MediaItem[]>([]);
  readonly isInitialLoading = signal<boolean>(false);
  readonly isLoadingMore = signal<boolean>(false);

  private currentPage = 1;
  private totalPages = 500;
  private isLoadingMoreFlag = false;

  private scrollObserver: IntersectionObserver | null = null;
  private sentinelConnected = false;

  @ViewChild('browseScrollSentinel') browseScrollSentinel?: ElementRef<HTMLElement>;

  readonly years: number[] = Array.from({ length: 35 }, (_, i) => 2026 - i);

  genres$!: Observable<Genre[]>;

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
      this.fetchInitial();
    });
  }

  ngAfterViewChecked(): void {
    if (this.browseScrollSentinel?.nativeElement && !this.sentinelConnected) {
      this.setupObserver();
      this.sentinelConnected = true;
    }
    if (!this.browseScrollSentinel?.nativeElement) {
      this.sentinelConnected = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.scrollObserver?.disconnect();
  }

  private setupObserver(): void {
    this.scrollObserver?.disconnect();
    this.scrollObserver = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreItems();
        }
      },
      { rootMargin: '400px' }
    );
    if (this.browseScrollSentinel?.nativeElement) {
      this.scrollObserver.observe(this.browseScrollSentinel.nativeElement);
    }
  }

  private fetchInitial(): void {
    this.currentPage = 1;
    this.allItems.set([]);
    this.isInitialLoading.set(true);
    this.isLoadingMoreFlag = false;
    this.cdr.markForCheck();

    this.movieService.discover(this.mediaType(), {
      genreId: this.selectedGenre() || undefined,
      sortBy: this.selectedSort(),
      year: this.selectedYear() || undefined,
      page: 1
    }).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ results: [] as MediaItem[], total_pages: 1, page: 1, total_results: 0 }))
    ).subscribe(res => {
      this.allItems.set(res.results || []);
      this.totalPages = res.total_pages || 1;
      this.currentPage = 1;
      this.isInitialLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  private loadMoreItems(): void {
    if (this.isLoadingMoreFlag || this.currentPage >= this.totalPages) return;
    this.isLoadingMoreFlag = true;
    this.isLoadingMore.set(true);
    this.cdr.markForCheck();

    const nextPage = this.currentPage + 1;
    this.movieService.discover(this.mediaType(), {
      genreId: this.selectedGenre() || undefined,
      sortBy: this.selectedSort(),
      year: this.selectedYear() || undefined,
      page: nextPage
    }).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ results: [] as MediaItem[], total_pages: this.totalPages, page: nextPage, total_results: 0 }))
    ).subscribe(res => {
      const newItems = res.results || [];
      if (newItems.length > 0) {
        this.allItems.update(prev => [...prev, ...newItems]);
        this.currentPage = nextPage;
        this.totalPages = res.total_pages || this.totalPages;
      }
      this.isLoadingMoreFlag = false;
      this.isLoadingMore.set(false);
      this.cdr.markForCheck();
    });
  }

  onGenreChange(id: number | null): void {
    this.selectedGenre.set(id);
    this.fetchInitial();
  }

  onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.fetchInitial();
  }

  onYearChange(year: number | null): void {
    this.selectedYear.set(year);
    this.fetchInitial();
  }

  resetFilters(): void {
    this.selectedGenre.set(null);
    this.selectedSort.set('popularity.desc');
    this.selectedYear.set(null);
    this.fetchInitial();
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
