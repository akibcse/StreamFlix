import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserActivityService } from '../../services/user-activity.service';
import { MovieService } from '../../services/movie.service';
import { WatchlistItem, WatchHistoryItem } from '../../models/media.model';

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="list-page">
      <div class="list-container">
        <header class="list-header">
          <div>
            <h1 class="list-title">My Library</h1>
            <p class="list-subtitle">Manage your saved titles, favorites, and streaming history</p>
          </div>

          <div class="tab-buttons">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'watchlist'"
              (click)="setTab('watchlist')"
            >
              📑 Watchlist ({{ (watchlist$ | async)?.length || 0 }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'favorites'"
              (click)="setTab('favorites')"
            >
              ❤️ Favorites ({{ (favorites$ | async)?.length || 0 }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'history'"
              (click)="setTab('history')"
            >
              ⏱️ Continue Watching ({{ (history$ | async)?.length || 0 }})
            </button>
          </div>
        </header>

        <!-- WATCHLIST TAB -->
        <main *ngIf="activeTab() === 'watchlist'">
          <div class="media-grid" *ngIf="(watchlist$ | async) as items">
            <article *ngFor="let item of items" class="list-card">
              <div class="card-thumb" (click)="navigateToMedia(item.mediaType, item.id)">
                <img [src]="getPosterUrl(item.poster_path)" [alt]="item.title" loading="lazy" />
                <span class="rating-badge">⭐ {{ item.vote_average | number:'1.1-1' }}</span>
                <div class="hover-play"><span>▶</span></div>
              </div>
              <div class="card-details">
                <h3 class="card-title">{{ item.title }}</h3>
                <div class="card-footer">
                  <span class="card-type">{{ item.mediaType === 'tv' ? 'TV Series' : 'Movie' }}</span>
                  <button class="btn-remove" (click)="removeWatchlist(item)" title="Remove from watchlist">
                    ✕ Remove
                  </button>
                </div>
              </div>
            </article>

            <div class="empty-state" *ngIf="items.length === 0">
              <span class="empty-icon">📑</span>
              <h3>Your watchlist is empty</h3>
              <p>Add movies and series to your watchlist to track what you want to watch next.</p>
              <a routerLink="/" class="btn-explore">Explore Titles</a>
            </div>
          </div>
        </main>

        <!-- FAVORITES TAB -->
        <main *ngIf="activeTab() === 'favorites'">
          <div class="media-grid" *ngIf="(favorites$ | async) as items">
            <article *ngFor="let item of items" class="list-card">
              <div class="card-thumb" (click)="navigateToMedia(item.mediaType, item.id)">
                <img [src]="getPosterUrl(item.poster_path)" [alt]="item.title" loading="lazy" />
                <span class="rating-badge">⭐ {{ item.vote_average | number:'1.1-1' }}</span>
                <div class="hover-play"><span>▶</span></div>
              </div>
              <div class="card-details">
                <h3 class="card-title">{{ item.title }}</h3>
                <div class="card-footer">
                  <span class="card-type">{{ item.mediaType === 'tv' ? 'TV Series' : 'Movie' }}</span>
                  <button class="btn-remove" (click)="removeFavorite(item)" title="Remove from favorites">
                    ✕ Remove
                  </button>
                </div>
              </div>
            </article>

            <div class="empty-state" *ngIf="items.length === 0">
              <span class="empty-icon">❤️</span>
              <h3>No favorites saved yet</h3>
              <p>Bookmark your all-time favorite cinema and TV series here.</p>
              <a routerLink="/" class="btn-explore">Browse Cinema</a>
            </div>
          </div>
        </main>

        <!-- CONTINUE WATCHING / HISTORY TAB -->
        <main *ngIf="activeTab() === 'history'">
          <div class="media-grid" *ngIf="(history$ | async) as items">
            <article *ngFor="let item of items" class="list-card history-card">
              <div class="card-thumb" (click)="navigateToMedia(item.mediaType, item.id)">
                <img [src]="getPosterUrl(item.poster_path)" [alt]="item.title" loading="lazy" />
                <span class="resume-badge" *ngIf="item.episode">
                  S{{ item.season }} • E{{ item.episode }}
                </span>
                <div class="hover-play"><span>▶ Resume</span></div>
              </div>
              <div class="card-details">
                <h3 class="card-title">{{ item.title }}</h3>
                <div class="card-footer">
                  <span class="time-text">{{ item.watchedAt | date:'mediumDate' }}</span>
                  <button class="btn-play-resume" (click)="navigateToMedia(item.mediaType, item.id)">
                    Play
                  </button>
                </div>
              </div>
            </article>

            <div class="empty-state" *ngIf="items.length === 0">
              <span class="empty-icon">⏱️</span>
              <h3>No watch history found</h3>
              <p>Start playing any movie or episode, and you can resume right where you left off.</p>
              <a routerLink="/" class="btn-explore">Start Watching</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #0b0e14;
      color: #f1f5f9;
      min-height: calc(100vh - 75px);
      padding: 2.5rem 1.5rem 5rem;
    }
    .list-container { max-width: 1400px; margin: 0 auto; }
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
      gap: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
    }
    .list-title { font-size: 2.25rem; font-weight: 800; color: #ffffff; margin: 0 0 0.35rem; }
    .list-subtitle { color: #94a3b8; font-size: 0.95rem; margin: 0; }
    .tab-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .tab-btn {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
    .tab-btn.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.5rem;
    }
    .list-card {
      background: #151a24;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, border-color 0.25s ease;
    }
    .list-card:hover {
      transform: translateY(-6px);
      border-color: rgba(99, 102, 241, 0.4);
    }
    .card-thumb {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 3;
      background: #1a1f2c;
      overflow: hidden;
      cursor: pointer;
    }
    .card-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .rating-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(11, 14, 20, 0.85);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .resume-badge {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(99, 102, 241, 0.9);
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .hover-play {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .list-card:hover .hover-play { opacity: 1; }
    .hover-play span {
      background: #6366f1;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.88rem;
    }
    .card-details { padding: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; justify-content: space-between; }
    .card-title { font-size: 0.92rem; font-weight: 600; color: #ffffff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .card-type { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; }
    .time-text { font-size: 0.75rem; color: #94a3b8; }
    .btn-remove {
      background: transparent;
      border: none;
      color: #ef4444;
      font-size: 0.78rem;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
    }
    .btn-remove:hover { text-decoration: underline; }
    .btn-play-resume {
      background: #6366f1;
      color: #fff;
      border: none;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 6rem 1rem;
      color: #94a3b8;
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; display: block; }
    .btn-explore {
      display: inline-block;
      margin-top: 1.5rem;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 0.75rem 1.75rem;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-explore:hover { opacity: 0.95; transform: translateY(-2px); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyListComponent {
  private readonly activityService = inject(UserActivityService);
  private readonly movieService = inject(MovieService);
  private readonly router = inject(Router);

  readonly activeTab = signal<'watchlist' | 'favorites' | 'history'>('watchlist');

  readonly watchlist$ = this.activityService.watchlist$;
  readonly favorites$ = this.activityService.favorites$;
  readonly history$ = this.activityService.history$;

  setTab(tab: 'watchlist' | 'favorites' | 'history'): void {
    this.activeTab.set(tab);
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  removeWatchlist(item: WatchlistItem): void {
    this.activityService.toggleWatchlist(item);
  }

  removeFavorite(item: WatchlistItem): void {
    this.activityService.toggleFavorite(item);
  }

  navigateToMedia(type?: string, id?: number): void {
    if (!id) return;
    this.router.navigate([`/${type || 'movie'}`, id]);
  }
}
