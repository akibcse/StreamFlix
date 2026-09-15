import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnDestroy,
  OnInit,
  AfterViewChecked,
  signal,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  forkJoin,
  map,
  Observable,
  of,
  catchError,
  Subject,
  timer,
  switchMap,
  takeUntil,
  shareReplay
} from 'rxjs';
import { MovieService } from '../../services/movie.service';
import { MediaItem, Genre } from '../../models/media.model';
import { AdBannerComponent } from '../../shared/components/ad-banner.component';

interface HomeCatalog {
  featured: MediaItem | null;
  trendingMovies: MediaItem[];
  trendingTv: MediaItem[];
  topRatedMovies: MediaItem[];
  popularMovies: MediaItem[];
  nowPlayingMovies: MediaItem[];
  upcomingMovies: MediaItem[];
}

/** Refresh interval: 30 minutes */
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, AdBannerComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly movieService = inject(MovieService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();
  private readonly refresh$ = new Subject<void>();

  readonly selectedGenre = signal<number | null>(null);
  readonly genreMovies = signal<MediaItem[]>([]);
  readonly isGenreLoading = signal<boolean>(false);
  readonly showGenreAll = signal<boolean>(false);

  // All movies state (when "All" is selected)
  readonly allMovies = signal<MediaItem[]>([]);
  readonly isAllMoviesLoading = signal<boolean>(false);
  readonly showAllMoviesExpanded = signal<boolean>(false);
  private allMoviesPage = 1;
  private allMoviesTotalPages = 500; // TMDB max
  private isAllMoviesLoadingMore = false;

  // Genre pagination state for infinite scroll
  private genrePage = 1;
  private genreTotalPages = 500;
  private isGenreLoadingMore = false;

  // Hero Slider State
  readonly currentSlide = signal<number>(0);
  readonly heroSlides = signal<MediaItem[]>([]);
  readonly isAutoSlidePaused = signal<boolean>(false);
  private autoSlideTimer: any = null;

  // Infinite scroll observers
  private genreObserver: IntersectionObserver | null = null;
  private allMoviesObserver: IntersectionObserver | null = null;
  private genreSentinelConnected = false;
  private allMoviesSentinelConnected = false;

  @ViewChild('genreScrollSentinel') genreScrollSentinel?: ElementRef<HTMLElement>;
  @ViewChild('allMoviesScrollSentinel') allMoviesScrollSentinel?: ElementRef<HTMLElement>;

  readonly popularGenres: Genre[] = [
    { id: 28, name: 'Action' },
    { id: 35, name: 'Comedy' },
    { id: 878, name: 'Sci-Fi' },
    { id: 27, name: 'Horror' },
    { id: 16, name: 'Animation' },
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
    { id: 14, name: 'Fantasy' },
    { id: 80, name: 'Crime' },
    { id: 10749, name: 'Romance' },
    { id: 9648, name: 'Mystery' },
    { id: 12, name: 'Adventure' }
  ];

  catalog$: Observable<HomeCatalog> = this.buildCatalog$();

  ngOnInit(): void {
    // Auto-refresh catalog every REFRESH_INTERVAL_MS
    timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshCatalog());

    // Manual refresh trigger
    this.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshCatalog());

    // Load all movies initially (when "All" is the default)
    this.loadAllMoviesPage(1, true);
  }

  ngAfterViewChecked(): void {
    // Connect genre sentinel if available and not yet connected
    if (this.genreScrollSentinel?.nativeElement && !this.genreSentinelConnected) {
      this.setupGenreObserver();
      this.genreSentinelConnected = true;
    }
    if (!this.genreScrollSentinel?.nativeElement) {
      this.genreSentinelConnected = false;
    }

    // Connect all movies sentinel if available and not yet connected
    if (this.allMoviesScrollSentinel?.nativeElement && !this.allMoviesSentinelConnected) {
      this.setupAllMoviesObserver();
      this.allMoviesSentinelConnected = true;
    }
    if (!this.allMoviesScrollSentinel?.nativeElement) {
      this.allMoviesSentinelConnected = false;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    this.destroy$.next();
    this.destroy$.complete();
    this.refresh$.complete();
    this.genreObserver?.disconnect();
    this.allMoviesObserver?.disconnect();
  }

  /** Setup IntersectionObserver for genre filtered movies */
  private setupGenreObserver(): void {
    this.genreObserver?.disconnect();
    this.genreObserver = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreGenreMovies();
        }
      },
      { rootMargin: '400px' }
    );
    if (this.genreScrollSentinel?.nativeElement) {
      this.genreObserver.observe(this.genreScrollSentinel.nativeElement);
    }
  }

  /** Setup IntersectionObserver for all movies */
  private setupAllMoviesObserver(): void {
    this.allMoviesObserver?.disconnect();
    this.allMoviesObserver = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreAllMovies();
        }
      },
      { rootMargin: '400px' }
    );
    if (this.allMoviesScrollSentinel?.nativeElement) {
      this.allMoviesObserver.observe(this.allMoviesScrollSentinel.nativeElement);
    }
  }

  /** Load more genre movies (next page) */
  private loadMoreGenreMovies(): void {
    if (!this.showGenreAll() || this.isGenreLoadingMore || this.genrePage >= this.genreTotalPages || !this.selectedGenre()) return;
    this.isGenreLoadingMore = true;
    this.isGenreLoading.set(true);
    this.cdr.markForCheck();

    const nextPage = this.genrePage + 1;
    this.movieService.discover('movie', {
      genreId: this.selectedGenre()!,
      sortBy: 'popularity.desc',
      page: nextPage
    }).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ results: [] as MediaItem[], total_pages: this.genreTotalPages, page: nextPage, total_results: 0 }))
    ).subscribe(res => {
      const newMovies = res.results || [];
      if (newMovies.length > 0) {
        this.genreMovies.update(prev => [...prev, ...newMovies]);
        this.genrePage = nextPage;
        this.genreTotalPages = res.total_pages || this.genreTotalPages;
      }
      this.isGenreLoadingMore = false;
      this.isGenreLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  /** Load more all movies (next page) */
  private loadMoreAllMovies(): void {
    if (!this.showAllMoviesExpanded() || this.isAllMoviesLoadingMore || this.allMoviesPage >= this.allMoviesTotalPages || this.selectedGenre() !== null) return;
    this.isAllMoviesLoadingMore = true;
    this.isAllMoviesLoading.set(true);
    this.cdr.markForCheck();

    const nextPage = this.allMoviesPage + 1;
    this.movieService.discover('movie', {
      sortBy: 'popularity.desc',
      page: nextPage
    }).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ results: [] as MediaItem[], total_pages: this.allMoviesTotalPages, page: nextPage, total_results: 0 }))
    ).subscribe(res => {
      const newMovies = res.results || [];
      if (newMovies.length > 0) {
        this.allMovies.update(prev => [...prev, ...newMovies]);
        this.allMoviesPage = nextPage;
        this.allMoviesTotalPages = res.total_pages || this.allMoviesTotalPages;
      }
      this.isAllMoviesLoadingMore = false;
      this.isAllMoviesLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  /** Load all movies page (used on init and on "All" selection) */
  private loadAllMoviesPage(page: number, reset: boolean): void {
    this.isAllMoviesLoading.set(true);
    this.cdr.markForCheck();

    this.movieService.discover('movie', {
      sortBy: 'popularity.desc',
      page
    }).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ results: [] as MediaItem[], total_pages: 1, page: 1, total_results: 0 }))
    ).subscribe(res => {
      if (reset) {
        this.allMovies.set(res.results || []);
      } else {
        this.allMovies.update(prev => [...prev, ...(res.results || [])]);
      }
      this.allMoviesPage = page;
      this.allMoviesTotalPages = res.total_pages || 1;
      this.isAllMoviesLoading.set(false);
      this.isAllMoviesLoadingMore = false;
      this.cdr.markForCheck();
    });
  }

  /** Expand the selected genre section and enable infinite scroll */
  expandGenreAll(): void {
    if (this.showGenreAll()) return;
    this.showGenreAll.set(true);
    this.cdr.markForCheck();
    this.loadMoreGenreMovies();
  }

  /** Expand the all-movies section and enable infinite scroll */
  expandAllMovies(): void {
    if (this.showAllMoviesExpanded()) return;
    this.showAllMoviesExpanded.set(true);
    this.cdr.markForCheck();
    this.loadMoreAllMovies();
  }

  /** Auto-sliding Hero Slider methods */
  startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      if (!this.isAutoSlidePaused() && this.heroSlides().length > 1) {
        const total = this.heroSlides().length;
        this.currentSlide.update(curr => (curr + 1) % total);
        this.cdr.markForCheck();
      }
    }, 5500);
  }

  stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  nextSlide(): void {
    const total = this.heroSlides().length;
    if (total <= 1) return;
    this.currentSlide.update(curr => (curr + 1) % total);
    this.startAutoSlide();
    this.cdr.markForCheck();
  }

  prevSlide(): void {
    const total = this.heroSlides().length;
    if (total <= 1) return;
    this.currentSlide.update(curr => (curr - 1 + total) % total);
    this.startAutoSlide();
    this.cdr.markForCheck();
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    this.startAutoSlide();
    this.cdr.markForCheck();
  }

  pauseAutoSlide(): void {
    this.isAutoSlidePaused.set(true);
  }

  resumeAutoSlide(): void {
    this.isAutoSlidePaused.set(false);
  }

  /** Rebuild the catalog$ observable so the async pipe re-subscribes */
  private refreshCatalog(): void {
    this.catalog$ = this.buildCatalog$();
    this.cdr.markForCheck();
  }

  private buildCatalog$(): Observable<HomeCatalog> {
    return forkJoin({
      trendingMovies: this.movieService.getTrendingMovies('day').pipe(catchError(() => of({ results: [] }))),
      trendingTv:     this.movieService.getTrendingTv('day').pipe(catchError(() => of({ results: [] }))),
      topRatedMovies: this.movieService.getTopRatedMovies().pipe(catchError(() => of({ results: [] }))),
      popularMovies:  this.movieService.getPopularMovies().pipe(catchError(() => of({ results: [] }))),
      nowPlayingMovies: this.movieService.getNowPlayingMovies().pipe(catchError(() => of({ results: [] }))),
      upcomingMovies: this.movieService.getUpcomingMovies().pipe(catchError(() => of({ results: [] })))
    }).pipe(
      map(data => {
        const trending = data.trendingMovies.results || [];
        const featured = trending.length > 0 ? trending[0] : null;
        if (trending.length > 0) {
          this.heroSlides.set(trending.slice(0, 6));
          this.startAutoSlide();
        }
        return {
          featured,
          trendingMovies: trending,
          trendingTv:      data.trendingTv.results || [],
          topRatedMovies:  data.topRatedMovies.results || [],
          popularMovies:   data.popularMovies.results || [],
          nowPlayingMovies: data.nowPlayingMovies.results || [],
          upcomingMovies:  data.upcomingMovies.results || []
        };
      }),
      shareReplay(1)
    );
  }

  /** Trigger an immediate manual refresh */
  triggerRefresh(): void {
    this.refresh$.next();
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  getBackdropUrl(path: string | null): string {
    return this.movieService.getBackdropUrl(path, 'w1280');
  }

  getReleaseYear(dateStr?: string): string {
    return dateStr ? new Date(dateStr).getFullYear().toString() : '';
  }

  /** Filter by genre inline on home page */
  filterByGenre(genreId: number | null): void {
    if (genreId === null) {
      // "All" selected — clear genre filter, show all movies
      this.selectedGenre.set(null);
      this.genreMovies.set([]);
      this.genrePage = 1;
      this.isGenreLoadingMore = false;
      this.showGenreAll.set(false);
      this.showAllMoviesExpanded.set(false);

      // Load all movies if not already loaded
      if (this.allMovies().length === 0 || this.allMoviesPage !== 1) {
        this.loadAllMoviesPage(1, true);
      }
      this.cdr.markForCheck();
      return;
    }

    // If clicking the same genre, deselect
    if (this.selectedGenre() === genreId) {
      this.selectedGenre.set(null);
      this.genreMovies.set([]);
      this.genrePage = 1;
      this.isGenreLoadingMore = false;
      this.showGenreAll.set(false);
      this.showAllMoviesExpanded.set(false);
      if (this.allMovies().length === 0 || this.allMoviesPage !== 1) {
        this.loadAllMoviesPage(1, true);
      }
      this.cdr.markForCheck();
      return;
    }

    this.selectedGenre.set(genreId);
    this.isGenreLoading.set(true);
    this.genreMovies.set([]);
    this.genrePage = 1;
    this.genreTotalPages = 500;
    this.isGenreLoadingMore = false;
    this.showGenreAll.set(false);
    this.showAllMoviesExpanded.set(false);
    this.cdr.markForCheck();

    this.movieService.discover('movie', {
      genreId,
      sortBy: 'popularity.desc',
      page: 1
    }).pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ results: [] as MediaItem[], total_pages: 1, page: 1, total_results: 0 }))
    ).subscribe(res => {
      this.genreMovies.set(res.results || []);
      this.genreTotalPages = res.total_pages || 1;
      this.genrePage = 1;
      this.isGenreLoading.set(false);
      this.cdr.markForCheck();

      // Smooth scroll gently to genre section
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById('genreResultsSection');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 80);
      }
    });
  }

  getSelectedGenreName(): string {
    const id = this.selectedGenre();
    if (!id) return '';
    const found = this.popularGenres.find(g => g.id === id);
    return found ? found.name : 'Genre';
  }

  scrollRow(rowElement: HTMLElement, direction: 'left' | 'right'): void {
    const scrollAmount = direction === 'left' ? -600 : 600;
    rowElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  /** Navigate directly to the player (play button / card click) */
  navigateToWatch(item: MediaItem): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    this.router.navigate([`/${type}`, item.id, 'watch']);
  }

  /** Navigate to media detail page (info button) */
  navigateToMedia(item: MediaItem): void {
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    this.router.navigate([`/${type}`, item.id]);
  }
}
