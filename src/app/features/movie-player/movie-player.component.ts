import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BehaviorSubject, Observable, combineLatest, catchError, map, of, startWith, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MovieService } from '../../services/movie.service';
import { MovieDetails } from '../../models/movie.model';

export interface StreamServer {
  id: string;
  name: string;
}

interface MoviePlayerState {
  loading: boolean;
  error: string | null;
  movie: MovieDetails | null;
  embedUrl: SafeResourceUrl | null;
  selectedServer: string;
}

@Component({
  selector: 'app-movie-player',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './movie-player.component.html',
  styleUrls: ['./movie-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoviePlayerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movieService = inject(MovieService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly servers: StreamServer[] = [
    { id: 'vidsrc-me', name: 'VidSrc (Server 1)' },
    { id: 'vidsrc-cc', name: 'VidSrc CC (Server 2)' },
    { id: 'multiembed', name: 'MultiEmbed (Server 3)' },
    { id: 'autoembed', name: 'AutoEmbed (Server 4)' }
  ];

  private readonly selectedServerSubject = new BehaviorSubject<string>('vidsrc-me');
  private readonly retrySubject = new BehaviorSubject<void>(undefined);

  readonly selectedServer$ = this.selectedServerSubject.asObservable();

  readonly state$: Observable<MoviePlayerState> = combineLatest([
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    this.retrySubject
  ]).pipe(
    takeUntilDestroyed(),
    switchMap(([id]) => {
      if (!id) {
        return of({
          loading: false,
          error: 'Invalid movie ID.',
          movie: null,
          embedUrl: null,
          selectedServer: this.selectedServerSubject.value
        });
      }

      return this.movieService.getMovieDetails(id).pipe(
        switchMap((movie: MovieDetails) =>
          this.selectedServer$.pipe(
            map(serverId => ({
              loading: false,
              error: null,
              movie,
              embedUrl: this.getEmbedUrl(movie, serverId),
              selectedServer: serverId
            }))
          )
        ),
        startWith({
          loading: true,
          error: null,
          movie: null,
          embedUrl: null,
          selectedServer: this.selectedServerSubject.value
        }),
        catchError((err: { message?: string }) =>
          of({
            loading: false,
            error: err?.message || 'Failed to load movie stream.',
            movie: null,
            embedUrl: null,
            selectedServer: this.selectedServerSubject.value
          })
        )
      );
    })
  );

  selectServer(serverId: string): void {
    this.selectedServerSubject.next(serverId);
  }

  retry(): void {
    this.retrySubject.next();
  }

  private getEmbedUrl(movie: MovieDetails, serverId: string): SafeResourceUrl {
    const imdbId = movie.external_ids?.imdb_id;
    let rawUrl = '';

    switch (serverId) {
      case 'vidsrc-cc':
        rawUrl = `https://vidsrc.cc/v2/embed/movie/${movie.id}`;
        break;
      case 'multiembed':
        rawUrl = `https://multiembed.mov/?video_id=${movie.id}&tmdb=1`;
        break;
      case 'autoembed':
        rawUrl = `https://player.autoembed.cc/embed/movie/${movie.id}`;
        break;
      case 'vidsrc-me':
      default:
        rawUrl = imdbId
          ? `https://vidsrc.me/embed/movie?imdb=${imdbId}`
          : `https://vidsrc.me/embed/movie?tmdb=${movie.id}`;
        break;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
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
