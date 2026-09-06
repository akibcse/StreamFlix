import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MediaItem,
  MediaDetails,
  SeasonDetails,
  PaginatedResponse,
  Genre,
  MediaType
} from '../models/media.model';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.tmdbBaseUrl;
  private readonly apiKey = environment.tmdbApiKey;
  private readonly imageBaseUrl = environment.tmdbImageBaseUrl;

  private getParams(extraParams: Record<string, string | number | boolean> = {}): HttpParams {
    let params = new HttpParams().set('api_key', this.apiKey);
    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    }
    return params;
  }

  // --- MOVIES ---

  getTrendingMovies(): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/trending/movie/week`, {
        params: this.getParams()
      })
      .pipe(map(res => this.attachMediaType(res, 'movie')));
  }

  getPopularMovies(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/movie/popular`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'movie')));
  }

  getTopRatedMovies(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/movie/top_rated`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'movie')));
  }

  getUpcomingMovies(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/movie/upcoming`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'movie')));
  }

  getNowPlayingMovies(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/movie/now_playing`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'movie')));
  }

  getMovieDetails(id: number | string): Observable<MediaDetails> {
    const params = this.getParams({
      append_to_response: 'credits,videos,recommendations,similar,external_ids'
    });
    return this.http.get<MediaDetails>(`${this.baseUrl}/movie/${id}`, { params });
  }

  // --- TV SERIES ---

  getTrendingTv(): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/trending/tv/week`, {
        params: this.getParams()
      })
      .pipe(map(res => this.attachMediaType(res, 'tv')));
  }

  getPopularTv(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/tv/popular`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'tv')));
  }

  getTopRatedTv(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/tv/top_rated`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'tv')));
  }

  getOnAirTv(page = 1): Observable<PaginatedResponse<MediaItem>> {
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/tv/on_the_air`, {
        params: this.getParams({ page })
      })
      .pipe(map(res => this.attachMediaType(res, 'tv')));
  }

  getTvDetails(id: number | string): Observable<MediaDetails> {
    const params = this.getParams({
      append_to_response: 'credits,videos,recommendations,similar,external_ids'
    });
    return this.http.get<MediaDetails>(`${this.baseUrl}/tv/${id}`, { params });
  }

  getSeasonDetails(tvId: number | string, seasonNumber: number): Observable<SeasonDetails> {
    const params = this.getParams();
    return this.http.get<SeasonDetails>(`${this.baseUrl}/tv/${tvId}/season/${seasonNumber}`, {
      params
    });
  }

  // --- SEARCH & DISCOVERY ---

  searchMulti(query: string, page = 1): Observable<PaginatedResponse<MediaItem>> {
    const params = this.getParams({ query, page, include_adult: false });
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/search/multi`, { params })
      .pipe(
        map(res => ({
          ...res,
          results: res.results.filter(
            item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
          )
        }))
      );
  }

  discover(
    type: MediaType = 'movie',
    genreId?: number,
    sortBy = 'popularity.desc',
    year?: number,
    page = 1
  ): Observable<PaginatedResponse<MediaItem>> {
    const extra: Record<string, string | number> = {
      page,
      sort_by: sortBy,
      include_adult: 'false'
    };

    if (genreId) {
      extra['with_genres'] = genreId;
    }
    if (year) {
      if (type === 'movie') {
        extra['primary_release_year'] = year;
      } else {
        extra['first_air_date_year'] = year;
      }
    }

    const params = this.getParams(extra);
    return this.http
      .get<PaginatedResponse<MediaItem>>(`${this.baseUrl}/discover/${type}`, { params })
      .pipe(map(res => this.attachMediaType(res, type)));
  }

  getGenres(type: MediaType = 'movie'): Observable<Genre[]> {
    return this.http
      .get<{ genres: Genre[] }>(`${this.baseUrl}/genre/${type}/list`, {
        params: this.getParams()
      })
      .pipe(map(res => res.genres));
  }

  // --- UTILS ---

  getImageUrl(
    path: string | null,
    size: 'w300' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'
  ): string {
    return path
      ? `${this.imageBaseUrl}/${size}${path}`
      : 'https://placehold.co/500x750/151a24/ffffff?text=No+Poster';
  }

  getBackdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'original'): string {
    return path
      ? `${this.imageBaseUrl}/${size}${path}`
      : 'https://placehold.co/1280x720/151a24/ffffff?text=StreamFlix';
  }

  private attachMediaType(
    res: PaginatedResponse<MediaItem>,
    type: MediaType
  ): PaginatedResponse<MediaItem> {
    return {
      ...res,
      results: (res.results || []).map(item => ({
        ...item,
        media_type: item.media_type || type
      }))
    };
  }
}
