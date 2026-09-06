import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MovieService } from '../../services/movie.service';
import { MovieDetails } from '../../models/movie.model';

interface MoviePlayerState {
  loading: boolean;
  error: string | null;
  movie: MovieDetails | null;
  embedUrl: SafeResourceUrl | null;
}

@Component({
  selector: 'app-movie-player',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './movie-player.component.html',
  styleUrls: ['./movie-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoviePlayerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movieService = inject(MovieService);
  private readonly sanitizer = inject(DomSanitizer);

  state$!: Observable<MoviePlayerState>;

  ngOnInit(): void {
    this.state$ = this.route.paramMap.pipe(
      takeUntilDestroyed(),
      map((params: any) => params.get('id') as string | null),
      switchMap((id: string | null) => {
        if (!id) {
          return of({
            loading: false,
            error: 'Invalid movie ID.',
            movie: null,
            embedUrl: null
          });
        }

        return this.movieService.getMovieDetails(id).pipe(
          map((movie: MovieDetails) => {
            const imdbId = movie.external_ids?.imdb_id;
            const rawUrl = imdbId
              ? `https://vidsrc.me/embed/movie?imdb=${imdbId}`
              : `https://vidsrc.me/embed/movie?tmdb=${movie.id}`;
            const embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);

            return {
              loading: false,
              error: null,
              movie,
              embedUrl
            };
          }),
          catchError((err: { message?: string }) =>
            of({
              loading: false,
              error: err?.message || 'Failed to load movie stream.',
              movie: null,
              embedUrl: null
            })
          )
        );
      })
    );
  }

  getBackdropUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'original');
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
