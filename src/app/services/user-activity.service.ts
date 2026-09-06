import { Injectable, inject } from '@angular/core';
import { ref, set, remove, get, onValue, off, push } from 'firebase/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { WatchlistItem, WatchHistoryItem, UserReview, MediaType } from '../models/media.model';

@Injectable({
  providedIn: 'root'
})
export class UserActivityService {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);

  private readonly watchlistSubject = new BehaviorSubject<WatchlistItem[]>([]);
  readonly watchlist$ = this.watchlistSubject.asObservable();

  private readonly favoritesSubject = new BehaviorSubject<WatchlistItem[]>([]);
  readonly favorites$ = this.favoritesSubject.asObservable();

  private readonly historySubject = new BehaviorSubject<WatchHistoryItem[]>([]);
  readonly history$ = this.historySubject.asObservable();

  constructor() {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserLists(user.uid);
      } else {
        this.loadFromLocalStorage();
      }
    });
  }

  private loadUserLists(uid: string): void {
    // Watchlist
    const wlRef = ref(this.firebase.db, `user_activity/${uid}/watchlist`);
    onValue(wlRef, snap => {
      const data = snap.val() || {};
      const list: WatchlistItem[] = Object.values(data);
      list.sort((a, b) => b.addedAt - a.addedAt);
      this.watchlistSubject.next(list);
    });

    // Favorites
    const favRef = ref(this.firebase.db, `user_activity/${uid}/favorites`);
    onValue(favRef, snap => {
      const data = snap.val() || {};
      const list: WatchlistItem[] = Object.values(data);
      list.sort((a, b) => b.addedAt - a.addedAt);
      this.favoritesSubject.next(list);
    });

    // Watch History
    const histRef = ref(this.firebase.db, `user_activity/${uid}/history`);
    onValue(histRef, snap => {
      const data = snap.val() || {};
      const list: WatchHistoryItem[] = Object.values(data);
      list.sort((a, b) => b.watchedAt - a.watchedAt);
      this.historySubject.next(list);
    });
  }

  private loadFromLocalStorage(): void {
    try {
      const wl = JSON.parse(localStorage.getItem('streamflix_watchlist') || '[]');
      this.watchlistSubject.next(wl);
      const fav = JSON.parse(localStorage.getItem('streamflix_favorites') || '[]');
      this.favoritesSubject.next(fav);
      const hist = JSON.parse(localStorage.getItem('streamflix_history') || '[]');
      this.historySubject.next(hist);
    } catch {
      // ignore
    }
  }

  // --- WATCHLIST ---

  isInWatchlist(id: number): boolean {
    return this.watchlistSubject.value.some(item => item.id === id);
  }

  async toggleWatchlist(item: WatchlistItem): Promise<boolean> {
    const user = this.auth.currentUser;
    const exists = this.isInWatchlist(item.id);

    if (exists) {
      if (user) {
        await remove(ref(this.firebase.db, `user_activity/${user.uid}/watchlist/${item.id}`));
      } else {
        const next = this.watchlistSubject.value.filter(i => i.id !== item.id);
        this.watchlistSubject.next(next);
        localStorage.setItem('streamflix_watchlist', JSON.stringify(next));
      }
      return false;
    } else {
      const newItem = { ...item, addedAt: Date.now() };
      if (user) {
        await set(ref(this.firebase.db, `user_activity/${user.uid}/watchlist/${item.id}`), newItem);
      } else {
        const next = [newItem, ...this.watchlistSubject.value];
        this.watchlistSubject.next(next);
        localStorage.setItem('streamflix_watchlist', JSON.stringify(next));
      }
      return true;
    }
  }

  // --- FAVORITES ---

  isInFavorites(id: number): boolean {
    return this.favoritesSubject.value.some(item => item.id === id);
  }

  async toggleFavorite(item: WatchlistItem): Promise<boolean> {
    const user = this.auth.currentUser;
    const exists = this.isInFavorites(item.id);

    if (exists) {
      if (user) {
        await remove(ref(this.firebase.db, `user_activity/${user.uid}/favorites/${item.id}`));
      } else {
        const next = this.favoritesSubject.value.filter(i => i.id !== item.id);
        this.favoritesSubject.next(next);
        localStorage.setItem('streamflix_favorites', JSON.stringify(next));
      }
      return false;
    } else {
      const newItem = { ...item, addedAt: Date.now() };
      if (user) {
        await set(ref(this.firebase.db, `user_activity/${user.uid}/favorites/${item.id}`), newItem);
      } else {
        const next = [newItem, ...this.favoritesSubject.value];
        this.favoritesSubject.next(next);
        localStorage.setItem('streamflix_favorites', JSON.stringify(next));
      }
      return true;
    }
  }

  // --- WATCH HISTORY / CONTINUE WATCHING ---

  async recordWatch(item: WatchHistoryItem): Promise<void> {
    const user = this.auth.currentUser;
    const histItem: WatchHistoryItem = {
      ...item,
      watchedAt: Date.now()
    };

    if (user) {
      await set(ref(this.firebase.db, `user_activity/${user.uid}/history/${item.id}`), histItem);
    } else {
      const current = this.historySubject.value.filter(i => i.id !== item.id);
      const next = [histItem, ...current].slice(0, 30);
      this.historySubject.next(next);
      localStorage.setItem('streamflix_history', JSON.stringify(next));
    }
  }

  // --- REVIEWS & RATINGS ---

  getReviews(mediaId: number): Observable<UserReview[]> {
    return new Observable<UserReview[]>(observer => {
      const reviewsRef = ref(this.firebase.db, `media_reviews/${mediaId}`);
      const listener = onValue(
        reviewsRef,
        snap => {
          if (snap.exists()) {
            const data = snap.val();
            const list: UserReview[] = Object.entries(data).map(([id, val]) => ({
              ...(val as UserReview),
              id
            }));
            list.sort((a, b) => b.createdAt - a.createdAt);
            observer.next(list);
          } else {
            observer.next([]);
          }
        },
        err => observer.error(err)
      );

      return () => off(reviewsRef, 'value', listener);
    });
  }

  async addReview(
    mediaId: number,
    mediaType: MediaType,
    rating: number,
    content: string
  ): Promise<void> {
    const user = this.auth.currentUser;
    const review: UserReview = {
      mediaId,
      mediaType,
      userId: user?.uid || 'guest',
      userName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous Viewer',
      userEmail: user?.email || 'anonymous',
      rating,
      content,
      createdAt: Date.now()
    };

    const reviewsRef = ref(this.firebase.db, `media_reviews/${mediaId}`);
    await push(reviewsRef, review);
  }

  // --- REPORT BROKEN VIDEO ---

  async reportBrokenVideo(
    mediaId: number,
    title: string,
    server: string,
    reason: string,
    season?: number,
    episode?: number
  ): Promise<void> {
    const reportsRef = ref(this.firebase.db, 'broken_stream_reports');
    await push(reportsRef, {
      mediaId,
      title,
      server,
      reason,
      season: season || null,
      episode: episode || null,
      reportedBy: this.auth.currentUser?.email || 'Anonymous',
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString()
    });
  }
}
