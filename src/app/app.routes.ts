import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ── Public ──────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    title: 'StreamFlix — Watch Movies & TV Series Free'
  },
  {
    path: 'movies',
    loadComponent: () => import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix — Browse Movies'
  },
  {
    path: 'tv',
    loadComponent: () => import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix — Browse TV Series'
  },
  {
    path: 'trending',
    loadComponent: () => import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix — Trending'
  },
  {
    path: 'popular',
    loadComponent: () => import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix — Popular'
  },
  {
    path: 'top-rated',
    loadComponent: () => import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix — Top Rated'
  },
  {
    path: 'upcoming',
    loadComponent: () => import('./features/browse/media-browse.component').then(m => m.MediaBrowseComponent),
    title: 'StreamFlix — Upcoming Movies'
  },

  // ── Genre / Person ───────────────────────────────────────────────
  {
    path: 'genre/:type/:id/:name',
    loadComponent: () => import('./features/genre/genre-detail.component').then(m => m.GenreDetailComponent),
  },
  {
    path: 'person/:id',
    loadComponent: () => import('./features/person/person-detail.component').then(m => m.PersonDetailComponent),
  },

  // ── Movie / TV Detail & Player ───────────────────────────────────
  {
    path: 'movie/:id',
    loadComponent: () => import('./features/media-detail/media-detail.component').then(m => m.MediaDetailComponent),
  },
  {
    path: 'tv/:id',
    loadComponent: () => import('./features/media-detail/media-detail.component').then(m => m.MediaDetailComponent),
  },
  {
    path: 'movie/:id/watch',
    loadComponent: () => import('./features/movie-player/movie-player.component').then(m => m.MoviePlayerComponent),
    title: 'StreamFlix — Watch Movie'
  },
  {
    path: 'tv/:id/watch',
    loadComponent: () => import('./features/movie-player/movie-player.component').then(m => m.MoviePlayerComponent),
    title: 'StreamFlix — Watch TV Series'
  },

  // ── Search ───────────────────────────────────────────────────────
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent),
    title: 'StreamFlix — Search'
  },

  // ── User (protected) ─────────────────────────────────────────────
  {
    path: 'my-list',
    loadComponent: () => import('./features/my-list/my-list.component').then(m => m.MyListComponent),
    canActivate: [authGuard],
    title: 'StreamFlix — My Library'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
    title: 'StreamFlix — My Profile'
  },
  {
    path: 'notifications',
    loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
    canActivate: [authGuard],
    title: 'StreamFlix — Notifications'
  },

  // ── Auth ─────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    title: 'StreamFlix — Sign In'
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
    title: 'StreamFlix — Create Account'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'StreamFlix — Reset Password'
  },

  // ── Admin ────────────────────────────────────────────────────────
  {
    path: 'admin/login',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        title: 'Admin — Dashboard'
      },
      {
        path: 'movies',
        loadComponent: () => import('./features/admin/pages/movies/admin-movies.component').then(m => m.AdminMoviesComponent),
        title: 'Admin — Movies'
      },
      {
        path: 'tv',
        loadComponent: () => import('./features/admin/pages/tv/admin-tv.component').then(m => m.AdminTvComponent),
        title: 'Admin — TV Series'
      },
      {
        path: 'genres',
        loadComponent: () => import('./features/admin/pages/genres/admin-genres.component').then(m => m.AdminGenresComponent),
        title: 'Admin — Genres'
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/pages/users/admin-users.component').then(m => m.AdminUsersComponent),
        title: 'Admin — Users'
      },
      {
        path: 'servers',
        loadComponent: () => import('./features/admin/pages/servers/admin-servers.component').then(m => m.AdminServersComponent),
        title: 'Admin — Streaming Servers'
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/admin/pages/reviews/admin-reviews.component').then(m => m.AdminReviewsComponent),
        title: 'Admin — Reviews'
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/pages/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
        title: 'Admin — Analytics'
      },
      {
        path: 'seo',
        loadComponent: () => import('./features/admin/pages/seo/admin-seo.component').then(m => m.AdminSeoComponent),
        title: 'Admin — SEO'
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/admin/pages/settings/admin-settings.component').then(m => m.AdminSettingsComponent),
        title: 'Admin — Settings'
      },
      {
        path: 'ads',
        loadComponent: () => import('./features/admin/pages/ads/admin-ads.component').then(m => m.AdminAdsComponent),
        title: 'Admin — Advertisements'
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/admin/pages/roles/admin-roles.component').then(m => m.AdminRolesComponent),
        title: 'Admin — Roles & Permissions'
      },
      {
        path: 'logs',
        loadComponent: () => import('./features/admin/pages/logs/admin-logs.component').then(m => m.AdminLogsComponent),
        title: 'Admin — System Logs'
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/admin/pages/notifications/admin-notifications.component').then(m => m.AdminNotificationsComponent),
        title: 'Admin — Notifications'
      },
      {
        path: 'visitors',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        title: 'Admin — Visitor Logs'
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/admin/pages/chat/admin-chat.component').then(m => m.AdminChatComponent),
        title: 'Admin — Live Chat'
      }
    ]
  },

  // ── Fallback ─────────────────────────────────────────────────────
  {
    path: 'not-found',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'StreamFlix — Page Not Found'
  },
  { path: '**', redirectTo: 'not-found' }
];
