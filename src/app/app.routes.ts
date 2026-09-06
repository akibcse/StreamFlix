import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
    title: 'StreamFlix - Watch Movies & TV Series'
  },
  {
    path: 'movies',
    loadComponent: () =>
      import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix - Explore Movies'
  },
  {
    path: 'tv',
    loadComponent: () =>
      import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix - Explore TV Series'
  },
  {
    path: 'movie/:id',
    loadComponent: () =>
      import('./features/movie-player/movie-player.component').then(
        m => m.MoviePlayerComponent
      ),
    title: 'StreamFlix - Stream Movie'
  },
  {
    path: 'tv/:id',
    loadComponent: () =>
      import('./features/movie-player/movie-player.component').then(
        m => m.MoviePlayerComponent
      ),
    title: 'StreamFlix - Stream TV Series'
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then(m => m.SearchComponent),
    title: 'StreamFlix - Search Cinema & Series'
  },
  {
    path: 'my-list',
    loadComponent: () =>
      import('./features/my-list/my-list.component').then(m => m.MyListComponent),
    title: 'StreamFlix - My Library'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
    title: 'StreamFlix - Sign In'
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then(m => m.RegisterComponent),
    title: 'StreamFlix - Create Account'
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login.component').then(m => m.AdminLoginComponent),
    title: 'StreamFlix - Admin Portal Sign In'
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
    title: 'StreamFlix - Admin Dashboard'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
