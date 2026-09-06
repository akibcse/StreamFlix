import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MovieDetails, TrendingMoviesResponse } from '../models/movie.model';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.tmdbBaseUrl;
  private readonly apiKey = environment.tmdbApiKey;
  private readonly imageBaseUrl = environment.tmdbImageBaseUrl;

  getTrendingMovies(): Observable<TrendingMoviesResponse> {
    const params = new HttpParams().set('api_key', this.apiKey);
    return this.http.get<TrendingMoviesResponse>(`${this.baseUrl}/trending/movie/week`, { params });
  }

  getMovieDetails(id: number | string): Observable<MovieDetails> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('append_to_response', 'external_ids');
    return this.http.get<MovieDetails>(`${this.baseUrl}/movie/${id}`, { params });
  }

  getImageUrl(path: string | null, size: 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string {
    return path ? `${this.imageBaseUrl}/${size}${path}` : 'https://placehold.co/500x750/1a1a24/ffffff?text=No+Poster';
  }
}
