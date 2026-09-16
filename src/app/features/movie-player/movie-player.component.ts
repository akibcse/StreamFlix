import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
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

import { AnalyticsService } from '../../services/analytics.service';

export interface StreamServer {
  id: string;
  name: string;
}

@Component({
  selector: 'app-movie-player',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './movie-player.component.html',
  styleUrls: ['./movie-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoviePlayerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movieService = inject(MovieService);
  private readonly activityService = inject(UserActivityService);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const s = Number(params.get('season'));
      const e = Number(params.get('episode'));
      if (s && s > 0) {
        this.selectedSeason.set(s);
        this.seasonTrigger$.next(s);
      }
      if (e && e > 0) {
        this.selectedEpisode.set(e);
      }
      this.cdr.markForCheck();
    });
    this.activityService.watchlist$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cdr.markForCheck();
    });
    this.activityService.favorites$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

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

  ngOnInit(): void {
    this.scrollToPlayer(false);
  }

  private scrollToPlayer(smooth = false): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: smooth ? 'smooth' : 'instant'
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }

  private currentRawUrl = '';
  private currentSafeUrl: SafeResourceUrl | null = null;
  private lastRecordedKey = '';

  // Embed URL Generator with stable caching and autoplay support
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
          raw = `https://vidsrc.cc/v2/embed/tv/${media.id}/${s}/${e}?autoplay=1&autoPlay=true`;
          break;
        case 'multiembed':
          raw = `https://multiembed.mov/?video_id=${media.id}&tmdb=1&s=${s}&e=${e}&autoplay=1&autoPlay=true`;
          break;
        case 'autoembed':
          raw = `https://player.autoembed.cc/embed/tv/${media.id}/${s}/${e}?autoplay=1&autoPlay=true`;
          break;
        case 'vidsrc-me':
        default:
          raw = imdbId
            ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${s}&episode=${e}&autoplay=1&autoPlay=true`
            : `https://vidsrc.me/embed/tv?tmdb=${media.id}&season=${s}&episode=${e}&autoplay=1&autoPlay=true`;
          break;
      }
    } else {
      switch (serverId) {
        case 'vidsrc-cc':
          raw = `https://vidsrc.cc/v2/embed/movie/${media.id}?autoplay=1&autoPlay=true`;
          break;
        case 'multiembed':
          raw = `https://multiembed.mov/?video_id=${media.id}&tmdb=1&autoplay=1&autoPlay=true`;
          break;
        case 'autoembed':
          raw = `https://player.autoembed.cc/embed/movie/${media.id}?autoplay=1&autoPlay=true`;
          break;
        case 'vidsrc-me':
        default:
          raw = imdbId
            ? `https://vidsrc.me/embed/movie?imdb=${imdbId}&autoplay=1&autoPlay=true`
            : `https://vidsrc.me/embed/movie?tmdb=${media.id}&autoplay=1&autoPlay=true`;
          break;
      }
    }

    if (raw === this.currentRawUrl && this.currentSafeUrl) {
      return this.currentSafeUrl;
    }

    this.currentRawUrl = raw;
    this.currentSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(raw);

    // Auto-record watch history only when media/season/episode actually changes
    const recordKey = `${media.id}_${s}_${e}`;
    if (this.lastRecordedKey !== recordKey) {
      this.lastRecordedKey = recordKey;
      const mediaTitle = media.title || media.name || 'Untitled';
      const type: MediaType = isTv ? 'tv' : 'movie';

      this.activityService.recordWatch({
        id: media.id,
        mediaType: type,
        title: mediaTitle,
        poster_path: media.poster_path,
        backdrop_path: media.backdrop_path,
        vote_average: media.vote_average,
        release_date: media.release_date || media.first_air_date || '',
        addedAt: Date.now(),
        season: isTv ? s : undefined,
        episode: isTv ? e : undefined,
        watchedAt: Date.now()
      });

      // Track watch event for Top Watched Content analytics + visitor dossier
      this.analytics.trackWatchEvent(media.id, type, mediaTitle, {
        poster_path: media.poster_path || null,
        vote_average: media.vote_average || 0,
        release_date: media.release_date || media.first_air_date || '',
        season: isTv ? s : undefined,
        episode: isTv ? e : undefined
      }).catch(() => {});
    }

    return this.currentSafeUrl;
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
    this.scrollToPlayer(true);
  }

  selectSeason(seasonNumber: number): void {
    this.selectedSeason.set(seasonNumber);
    this.selectedEpisode.set(1);
    this.seasonTrigger$.next(seasonNumber);
    this.scrollToPlayer(true);
  }

  selectEpisode(episodeNumber: number): void {
    this.selectedEpisode.set(episodeNumber);
    this.scrollToPlayer(true);
  }

  nextEpisode(episodesCount: number): void {
    if (this.selectedEpisode() < episodesCount) {
      this.selectedEpisode.update(e => e + 1);
      this.scrollToPlayer(true);
    }
  }

  prevEpisode(): void {
    if (this.selectedEpisode() > 1) {
      this.selectedEpisode.update(e => e - 1);
      this.scrollToPlayer(true);
    }
  }

  // Watchlist & Favorites
  isWatchlisted(mediaId: number): boolean {
    return this.activityService.isInWatchlist(mediaId);
  }

  isFavorite(mediaId: number): boolean {
    return this.activityService.isInFavorites(mediaId);
  }

  async toggleWatchlist(media: MediaDetails): Promise<void> {
    const isTv = !!media.seasons || !media.title;
    const added = await this.activityService.toggleWatchlist({
      id: media.id,
      mediaType: isTv ? 'tv' : 'movie',
      media_type: isTv ? 'tv' : 'movie',
      title: media.title || media.name || 'Untitled',
      name: media.name || media.title || 'Untitled',
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      vote_average: media.vote_average,
      release_date: media.release_date || media.first_air_date || '',
      addedAt: Date.now()
    });
    this.copyNotice.set(added ? '✓ Added to Watchlist!' : 'Removed from Watchlist');
    setTimeout(() => {
      this.copyNotice.set(null);
      this.cdr.markForCheck();
    }, 3000);
    this.cdr.markForCheck();
  }

  async toggleFavorite(media: MediaDetails): Promise<void> {
    const isTv = !!media.seasons || !media.title;
    const added = await this.activityService.toggleFavorite({
      id: media.id,
      mediaType: isTv ? 'tv' : 'movie',
      media_type: isTv ? 'tv' : 'movie',
      title: media.title || media.name || 'Untitled',
      name: media.name || media.title || 'Untitled',
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      vote_average: media.vote_average,
      release_date: media.release_date || media.first_air_date || '',
      addedAt: Date.now()
    });
    this.copyNotice.set(added ? '❤️ Added to Favorites!' : 'Removed from Favorites');
    setTimeout(() => {
      this.copyNotice.set(null);
      this.cdr.markForCheck();
    }, 3000);
    this.cdr.markForCheck();
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

  goBack(): void {
    this.router.navigate(['/']);
  }
}
