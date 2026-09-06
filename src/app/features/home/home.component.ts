import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, map, Observable, of, catchError } from 'rxjs';
import { MovieService } from '../../services/movie.service';
import { MediaItem, Genre } from '../../models/media.model';

interface HomeCatalog {
  featured: MediaItem | null;
  trendingMovies: MediaItem[];
  trendingTv: MediaItem[];
  topRatedMovies: MediaItem[];
  popularMovies: MediaItem[];
  nowPlayingMovies: MediaItem[];
  upcomingMovies: MediaItem[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly selectedGenre = signal<number | null>(null);

  readonly popularGenres: Genre[] = [
    { id: 28, name: 'Action' },
    { id: 35, name: 'Comedy' },
    { id: 878, name: 'Sci-Fi' },
    { id: 27, name: 'Horror' },
    { id: 16, name: 'Animation' },
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
    { id: 14, name: 'Fantasy' },
    { id: 80, name: 'Crime' }
  ];

  readonly catalog$: Observable<HomeCatalog> = forkJoin({
    trendingMovies: this.movieService.getTrendingMovies().pipe(catchError(() => of({ results: [] }))),
    trendingTv: this.movieService.getTrendingTv().pipe(catchError(() => of({ results: [] }))),
    topRatedMovies: this.movieService.getTopRatedMovies().pipe(catchError(() => of({ results: [] }))),
    popularMovies: this.movieService.getPopularMovies().pipe(catchError(() => of({ results: [] }))),
    nowPlayingMovies: this.movieService.getNowPlayingMovies().pipe(catchError(() => of({ results: [] }))),
    upcomingMovies: this.movieService.getUpcomingMovies().pipe(catchError(() => of({ results: [] })))
  }).pipe(
    map(data => {
      const trending = data.trendingMovies.results || [];
      const featured = trending.length > 0 ? trending[0] : null;

      return {
        featured,
        trendingMovies: trending,
        trendingTv: data.trendingTv.results || [],
        topRatedMovies: data.topRatedMovies.results || [],
        popularMovies: data.popularMovies.results || [],
        nowPlayingMovies: data.nowPlayingMovies.results || [],
        upcomingMovies: data.upcomingMovies.results || []
      };
    })
  );

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  getBackdropUrl(path: string | null): string {
    return this.movieService.getBackdropUrl(path, 'w1280');
  }

  getReleaseYear(dateStr?: string): string {
    return dateStr ? new Date(dateStr).getFullYear().toString() : '';
  }

  filterByGenre(genreId: number | null): void {
    if (genreId === null) {
      this.selectedGenre.set(null);
    } else {
      this.router.navigate(['/movies'], { queryParams: { genre: genreId } });
    }
  }

  scrollRow(rowElement: HTMLElement, direction: 'left' | 'right'): void {
    const scrollAmount = direction === 'left' ? -600 : 600;
    rowElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  navigateToMedia(item: MediaItem): void {
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    this.router.navigate([`/${type}`, item.id]);
  }
}
