import { Injectable, inject, signal } from '@angular/core';
import { DatabaseReference, getDatabase, ref, set, get, push, onValue, off, remove } from 'firebase/database';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import {
  DailyStats,
  MediaAnalytics,
  SearchAnalytics,
  MediaType
} from '../models/media.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);
  private db = getDatabase(this.firebase.app);

  // ─── Track Events ────────────────────────────────────────────────

  async trackPageView(page: string): Promise<void> {
    try {
      const today = this.getToday();
      const dayRef = ref(this.db, `analytics/daily/${today}`);
      const snap = await get(dayRef);
      const existing: DailyStats = snap.exists() ? snap.val() : this.emptyDayStats(today);
      existing.pageViews = (existing.pageViews || 0) + 1;
      existing.visitors = (existing.visitors || 0) + 1;
      await set(dayRef, existing);
    } catch { /* silent */ }
  }

  async trackWatchEvent(mediaId: number, mediaType: MediaType, title: string): Promise<void> {
    try {
      const today = this.getToday();

      // Daily stats
      const dayRef = ref(this.db, `analytics/daily/${today}`);
      const snap = await get(dayRef);
      const day: DailyStats = snap.exists() ? snap.val() : this.emptyDayStats(today);
      day.watchEvents = (day.watchEvents || 0) + 1;
      await set(dayRef, day);

      // Per-media views
      const mediaRef = ref(this.db, `analytics/media/${mediaType}_${mediaId}`);
      const mSnap = await get(mediaRef);
      const mediaData: MediaAnalytics = mSnap.exists()
        ? mSnap.val()
        : { mediaId, mediaType, title, views: 0, watchTime: 0, lastViewed: Date.now() };
      mediaData.views = (mediaData.views || 0) + 1;
      mediaData.lastViewed = Date.now();
      await set(mediaRef, mediaData);
    } catch { /* silent */ }
  }

  async trackSearch(query: string): Promise<void> {
    if (!query.trim() || query.length < 2) return;
    try {
      const today = this.getToday();
      // Daily search count
      const dayRef = ref(this.db, `analytics/daily/${today}`);
      const snap = await get(dayRef);
      const day: DailyStats = snap.exists() ? snap.val() : this.emptyDayStats(today);
      day.searches = (day.searches || 0) + 1;
      await set(dayRef, day);

      // Search term tracking
      const key = query.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
      const searchRef = ref(this.db, `analytics/searches/${key}`);
      const sSnap = await get(searchRef);
      const existing: SearchAnalytics = sSnap.exists()
        ? sSnap.val()
        : { query: query.toLowerCase(), count: 0, lastSearched: Date.now() };
      existing.count = (existing.count || 0) + 1;
      existing.lastSearched = Date.now();
      await set(searchRef, existing);
    } catch { /* silent */ }
  }

  async trackRegistration(): Promise<void> {
    try {
      const today = this.getToday();
      const dayRef = ref(this.db, `analytics/daily/${today}`);
      const snap = await get(dayRef);
      const day: DailyStats = snap.exists() ? snap.val() : this.emptyDayStats(today);
      day.registrations = (day.registrations || 0) + 1;
      await set(dayRef, day);
    } catch { /* silent */ }
  }

  // ─── Read Analytics (Admin) ──────────────────────────────────────

  async getDailyStats(days = 30): Promise<DailyStats[]> {
    try {
      const snap = await get(ref(this.db, 'analytics/daily'));
      if (!snap.exists()) return [];
      const data = snap.val() as Record<string, DailyStats>;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return Object.values(data)
        .filter(d => new Date(d.date) >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch { return []; }
  }

  async getTopMedia(limit = 10): Promise<MediaAnalytics[]> {
    try {
      const snap = await get(ref(this.db, 'analytics/media'));
      if (!snap.exists()) return [];
      const data = snap.val() as Record<string, MediaAnalytics>;
      return Object.values(data)
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    } catch { return []; }
  }

  async getTrendingSearches(limit = 20): Promise<SearchAnalytics[]> {
    try {
      const snap = await get(ref(this.db, 'analytics/searches'));
      if (!snap.exists()) return [];
      const data = snap.val() as Record<string, SearchAnalytics>;
      return Object.values(data)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch { return []; }
  }

  async getPopularContent(limit = 10): Promise<{ title: string; type: string; count: number }[]> {
    const top = await this.getTopMedia(limit);
    return top.map(m => ({ title: m.title, type: m.mediaType, count: m.views }));
  }

  async getRecentSearches(limit = 10): Promise<{ query: string; timestamp: number }[]> {
    const s = await this.getTrendingSearches(limit);
    return s.map(x => ({ query: x.query, timestamp: x.lastSearched }));
  }

  async getTodayStats(): Promise<DailyStats> {
    try {
      const snap = await get(ref(this.db, `analytics/daily/${this.getToday()}`));
      return snap.exists() ? snap.val() : this.emptyDayStats(this.getToday());
    } catch { return this.emptyDayStats(this.getToday()); }
  }

  async getTotalStats(): Promise<{ totalViews: number; totalSearches: number; totalUsers: number }> {
    try {
      const [mediaSnap, usersSnap] = await Promise.all([
        get(ref(this.db, 'analytics/media')),
        get(ref(this.db, 'users'))
      ]);

      let totalViews = 0;
      if (mediaSnap.exists()) {
        Object.values(mediaSnap.val() as Record<string, MediaAnalytics>).forEach(m => {
          totalViews += m.views || 0;
        });
      }

      const totalUsers = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
      return { totalViews, totalSearches: 0, totalUsers };
    } catch { return { totalViews: 0, totalSearches: 0, totalUsers: 0 }; }
  }

  private getToday(): string {
    return new Date().toISOString().substring(0, 10);
  }

  private emptyDayStats(date: string): DailyStats {
    return { date, visitors: 0, pageViews: 0, watchEvents: 0, searches: 0, registrations: 0 };
  }
}
