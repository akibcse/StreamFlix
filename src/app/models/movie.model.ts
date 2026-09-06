export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
}

export interface MovieGenre {
  id: number;
  name: string;
}

export interface ExternalIds {
  imdb_id: string | null;
  wikidata_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
}

export interface MovieDetails extends Movie {
  runtime: number;
  genres: MovieGenre[];
  tagline: string;
  external_ids: ExternalIds;
}

export interface TrendingMoviesResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}
