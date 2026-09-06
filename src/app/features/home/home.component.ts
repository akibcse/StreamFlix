import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { MovieService } from '../../services/movie.service';
import { Movie } from '../../models/movie.model';

interface HomeState {
  loading: boolean;
  error: string | null;
  movies: Movie[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  state$!: Observable<HomeState>;

  ngOnInit(): void {
    this.state$ = this.movieService.getTrendingMovies().pipe(
      map((response: { results: Movie[] }) => ({
        loading: false,
        error: null,
        movies: response.results
      })),
      startWith({
        loading: true,
        error: null,
        movies: []
      }),
      catchError((error: { message?: string }) =>
        of({
          loading: false,
          error: error?.message || 'Failed to load trending movies. Please try again.',
          movies: []
        })
      )
    );
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  getReleaseYear(dateStr: string): string {
    return dateStr ? new Date(dateStr).getFullYear().toString() : 'N/A';
  }

  navigateToMovie(id: number): void {
    this.router.navigate(['/movie', id]);
  }
}
