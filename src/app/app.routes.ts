import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
    title: 'StreamFlix - Trending Movies'
  },
  {
    path: 'movie/:id',
    loadComponent: () =>
      import('./features/movie-player/movie-player.component').then(
        m => m.MoviePlayerComponent
      ),
    title: 'StreamFlix - Watch Movie'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
