import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, switchMap, of, catchError, startWith, Observable, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MovieService } from '../../services/movie.service';
import { UserActivityService } from '../../services/user-activity.service';
import { AuthService } from '../../services/auth.service';
import {
  MediaDetails,
  MediaType,
  SeasonDetails,
  Episode,
  VideoTrailer,
  UserReview
} from '../../models/media.model';

import { AdBannerComponent } from '../../shared/components/ad-banner.component';

export interface StreamServer {
  id: string;
  name: string;
}

@Component({
  selector: 'app-movie-player',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AdBannerComponent],
  templateUrl: './movie-player.component.html',
  styleUrls: ['./movie-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoviePlayerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movieService = inject(MovieService);
  private readonly activityService = inject(UserActivityService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly servers: StreamServer[] = [
    { id: 'vidsrc-me', name: 'VidSrc Prime (Server 1)' },
    { id: 'vidsrc-cc', name: 'VidSrc CC (Server 2)' },
    { id: 'multiembed', name: 'MultiEmbed (Server 3)' },
    { id: 'autoembed', name: 'AutoEmbed (Server 4)' }
  ];

  readonly selectedServer = signal<string>('vidsrc-me');
  readonly selectedSeason = signal<number>(1);
  readonly selectedEpisode = signal<number>(1);
  readonly showTrailerModal = signal<boolean>(false);
  readonly showReportModal = signal<boolean>(false);
  readonly reportReason = signal<string>('Video buffering or not playing');
  readonly copyNotice = signal<string | null>(null);

  // Review Form
  readonly newReviewRating = signal<number>(10);
  readonly newReviewText = signal<string>('');
  readonly isSubmittingReview = signal<boolean>(false);

  // Current Media Type
  readonly mediaType$ = this.route.url.pipe(
    map(segments => (segments[0]?.path === 'tv' ? 'tv' : 'movie') as MediaType)
  );

  // Load Main Media Details
  readonly mediaDetails$ = combineLatest([
    this.route.paramMap.pipe(map(params => params.get('id'))),
    this.mediaType$
  ]).pipe(
    takeUntilDestroyed(),
    switchMap(([id, type]) => {
      if (!id) return of(null);
      return (type === 'tv'
        ? this.movieService.getTvDetails(id)
        : this.movieService.getMovieDetails(id)
      ).pipe(
        catchError(() => of(null))
      );
    })
  );

  // Load Season Details for TV Shows
  private readonly seasonTrigger$ = new BehaviorSubject<number>(1);
  readonly currentSeasonDetails$: Observable<SeasonDetails | null> = combineLatest([
    this.route.paramMap.pipe(map(params => params.get('id'))),
    this.mediaType$,
    this.seasonTrigger$
  ]).pipe(
    switchMap(([id, type, seasonNum]) => {
      if (!id || type !== 'tv') return of(null);
      return this.movieService.getSeasonDetails(id, seasonNum).pipe(
        catchError(() => of(null))
      );
    })
  );

  // Reviews Observable
  readonly reviews$: Observable<UserReview[]> = this.route.paramMap.pipe(
    map(params => Number(params.get('id'))),
    filter(id => !!id),
    switchMap(id => this.activityService.getReviews(id))
  );

  readonly watchlist$ = this.activityService.watchlist$;
  readonly favorites$ = this.activityService.favorites$;

  // Embed URL Generator
  getEmbedUrl(media: MediaDetails): SafeResourceUrl {
    const serverId = this.selectedServer();
    const isTv = !!media.seasons || !media.title;
    const s = this.selectedSeason();
    const e = this.selectedEpisode();
    const imdbId = media.external_ids?.imdb_id;

    let raw = '';
    if (isTv) {
      switch (serverId) {
        case 'vidsrc-cc':
          raw = `https://vidsrc.cc/v2/embed/tv/${media.id}/${s}/${e}`;
          break;
        case 'multiembed':
          raw = `https://multiembed.mov/?video_id=${media.id}&tmdb=1&s=${s}&e=${e}`;
          break;
        case 'autoembed':
          raw = `https://player.autoembed.cc/embed/tv/${media.id}/${s}/${e}`;
          break;
        case 'vidsrc-me':
        default:
          raw = imdbId
            ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${s}&episode=${e}`
            : `https://vidsrc.me/embed/tv?tmdb=${media.id}&season=${s}&episode=${e}`;
          break;
      }
    } else {
      switch (serverId) {
        case 'vidsrc-cc':
          raw = `https://vidsrc.cc/v2/embed/movie/${media.id}`;
          break;
        case 'multiembed':
          raw = `https://multiembed.mov/?video_id=${media.id}&tmdb=1`;
          break;
        case 'autoembed':
          raw = `https://player.autoembed.cc/embed/movie/${media.id}`;
          break;
        case 'vidsrc-me':
        default:
          raw = imdbId
            ? `https://vidsrc.me/embed/movie?imdb=${imdbId}`
            : `https://vidsrc.me/embed/movie?tmdb=${media.id}`;
          break;
      }
    }

    // Auto-record watch history
    this.activityService.recordWatch({
      id: media.id,
      mediaType: isTv ? 'tv' : 'movie',
      title: media.title || media.name || 'Untitled',
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      vote_average: media.vote_average,
      release_date: media.release_date || media.first_air_date || '',
      addedAt: Date.now(),
      season: isTv ? s : undefined,
      episode: isTv ? e : undefined,
      watchedAt: Date.now()
    });

    return this.sanitizer.bypassSecurityTrustResourceUrl(raw);
  }

  // Trailer URL
  getTrailerUrl(media: MediaDetails): SafeResourceUrl | null {
    const videos = media.videos?.results || [];
    const trailer =
      videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
      videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
      videos.find(v => v.site === 'YouTube');

    if (!trailer) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${trailer.key}?autoplay=1`
    );
  }

  selectServer(id: string): void {
    this.selectedServer.set(id);
  }

  selectSeason(seasonNumber: number): void {
    this.selectedSeason.set(seasonNumber);
    this.selectedEpisode.set(1);
    this.seasonTrigger$.next(seasonNumber);
  }

  selectEpisode(episodeNumber: number): void {
    this.selectedEpisode.set(episodeNumber);
  }

  nextEpisode(episodesCount: number): void {
    if (this.selectedEpisode() < episodesCount) {
      this.selectedEpisode.update(e => e + 1);
    }
  }

  prevEpisode(): void {
    if (this.selectedEpisode() > 1) {
      this.selectedEpisode.update(e => e - 1);
    }
  }

  // Watchlist & Favorites
  isWatchlisted(mediaId: number): boolean {
    return this.activityService.isInWatchlist(mediaId);
  }

  isFavorite(mediaId: number): boolean {
    return this.activityService.isInFavorites(mediaId);
  }

  toggleWatchlist(media: MediaDetails): void {
    const isTv = !!media.seasons || !media.title;
    this.activityService.toggleWatchlist({
      id: media.id,
      mediaType: isTv ? 'tv' : 'movie',
      title: media.title || media.name || 'Untitled',
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      vote_average: media.vote_average,
      release_date: media.release_date || media.first_air_date || '',
      addedAt: Date.now()
    });
  }

  toggleFavorite(media: MediaDetails): void {
    const isTv = !!media.seasons || !media.title;
    this.activityService.toggleFavorite({
      id: media.id,
      mediaType: isTv ? 'tv' : 'movie',
      title: media.title || media.name || 'Untitled',
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      vote_average: media.vote_average,
      release_date: media.release_date || media.first_air_date || '',
      addedAt: Date.now()
    });
  }

  // Share Link
  copyShareLink(): void {
    navigator.clipboard.writeText(window.location.href);
    this.copyNotice.set('Link copied to clipboard!');
    setTimeout(() => this.copyNotice.set(null), 3000);
  }

  // Submit Review
  async submitReview(media: MediaDetails): Promise<void> {
    const text = this.newReviewText().trim();
    if (!text) return;

    this.isSubmittingReview.set(true);
    const isTv = !!media.seasons || !media.title;

    try {
      await this.activityService.addReview(
        media.id,
        isTv ? 'tv' : 'movie',
        this.newReviewRating(),
        text
      );
      this.newReviewText.set('');
      this.copyNotice.set('Thank you! Review published.');
      setTimeout(() => this.copyNotice.set(null), 3000);
    } catch (err: any) {
      alert(`Failed to post review: ${err?.message}`);
    } finally {
      this.isSubmittingReview.set(false);
    }
  }

  // Report Broken Stream
  async submitBrokenReport(media: MediaDetails): Promise<void> {
    const isTv = !!media.seasons || !media.title;
    await this.activityService.reportBrokenVideo(
      media.id,
      media.title || media.name || 'Untitled',
      this.selectedServer(),
      this.reportReason(),
      isTv ? this.selectedSeason() : undefined,
      isTv ? this.selectedEpisode() : undefined
    );

    this.showReportModal.set(false);
    this.copyNotice.set('Report submitted. Our team will review the stream!');
    setTimeout(() => this.copyNotice.set(null), 3500);
  }

  getImageUrl(path: string | null, size: 'w300' | 'w500' | 'w780' = 'w500'): string {
    return this.movieService.getImageUrl(path, size);
  }

  getBackdropUrl(path: string | null): string {
    return this.movieService.getBackdropUrl(path, 'w1280');
  }

  // Click-shield: ad scripts hijack the first pointer event on the iframe.
  // The transparent overlay div receives that click instead, preventing the redirect.
  // After the first tap we fade and remove the shield so native player controls work.
  onPlayerShieldClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const shield = event.currentTarget as HTMLElement;
    shield.style.opacity = '0';
    shield.style.pointerEvents = 'none';
    // Fully remove from flow after fade completes
    setTimeout(() => { shield.style.display = 'none'; }, 450);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
