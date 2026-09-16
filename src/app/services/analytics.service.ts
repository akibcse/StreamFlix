import { Injectable, inject, signal } from '@angular/core';
import { DatabaseReference, getDatabase, ref, set, get, push, onValue, off, remove } from 'firebase/database';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { VisitorLogService } from './visitor-log.service';
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
  private readonly visitorLog = inject(VisitorLogService);
  private db = getDatabase(this.firebase.app);

  private sanitizeKey(key: string): string {
    if (!key) return 'unknown';
    return key.replace(/[\.\#\$\/\[\]\:\s]/g, '_');
  }

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

  async trackWatchEvent(
    mediaId: number,
    mediaType: MediaType,
    title: string,
    extra?: Record<string, any>
  ): Promise<void> {
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

      const watchItem = {
        id: mediaId,
        mediaId,
        mediaType,
        title: title || 'Untitled',
        timestamp: Date.now(),
        watchedAt: Date.now(),
        ...(extra || {})
      };

      // 1. Per-user watch history (for signed-in users)
      const { firstValueFrom } = await import('rxjs');
      const user = await firstValueFrom(this.auth.currentUser$);
      if (user?.uid) {
        await set(ref(this.db, `user_activity/${user.uid}/history/${mediaId}`), watchItem);
      }

      // 2. Per-IP watch history (for Visitor Dossier)
      const geo = await this.visitorLog.getGeoInfo().catch(() => null);
      const ip = geo?.ip || this.visitorLog.getCurrentIp();
      if (ip && ip !== 'Detecting...' && ip !== 'Unknown IP') {
        const ipKey = this.sanitizeKey(ip);
        await set(ref(this.db, `visitor_activity/${ipKey}/history/${mediaId}`), watchItem);
      }

      // 3. Per-visitorId watch history
      const vid = this.visitorLog.getVisitorId();
      if (vid) {
        const vidKey = this.sanitizeKey(vid);
        await set(ref(this.db, `visitor_activity/${vidKey}/history/${mediaId}`), watchItem);
      }
    } catch { /* silent */ }
  }

  async trackSearch(query: string): Promise<void> {
    const clean = query.trim();
    if (!clean || clean.length < 2) return;
    try {
      const today = this.getToday();
      // Daily search count
      const dayRef = ref(this.db, `analytics/daily/${today}`);
      const snap = await get(dayRef);
      const day: DailyStats = snap.exists() ? snap.val() : this.emptyDayStats(today);
      day.searches = (day.searches || 0) + 1;
      await set(dayRef, day);

      // Search term tracking
      const key = clean.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
      const searchRef = ref(this.db, `analytics/searches/${key}`);
      const sSnap = await get(searchRef);
      const existing: SearchAnalytics = sSnap.exists()
        ? sSnap.val()
        : { query: clean.toLowerCase(), count: 0, lastSearched: Date.now() };
      existing.count = (existing.count || 0) + 1;
      existing.lastSearched = Date.now();
      await set(searchRef, existing);

      const searchItem = {
        query: clean,
        timestamp: Date.now()
      };

      // 1. Per-user search history (for Visitor Dossier)
      const { firstValueFrom } = await import('rxjs');
      const user = await firstValueFrom(this.auth.currentUser$);
      if (user?.uid) {
        await push(ref(this.db, `user_activity/${user.uid}/searches`), searchItem);
      }

      // 2. Per-IP search history (for Visitor Dossier)
      const geo = await this.visitorLog.getGeoInfo().catch(() => null);
      const ip = geo?.ip || this.visitorLog.getCurrentIp();
      if (ip && ip !== 'Detecting...' && ip !== 'Unknown IP') {
        const ipKey = this.sanitizeKey(ip);
        await push(ref(this.db, `visitor_activity/${ipKey}/searches`), searchItem);
      }

      // 3. Per-visitorId search history
      const vid = this.visitorLog.getVisitorId();
      if (vid) {
        const vidKey = this.sanitizeKey(vid);
        await push(ref(this.db, `visitor_activity/${vidKey}/searches`), searchItem);
      }
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
    // First try dedicated analytics/media collection
    const top = await this.getTopMedia(limit);
    if (top.length > 0) {
      return top.map(m => ({ title: m.title, type: m.mediaType, count: m.views }));
    }
    // Fallback: aggregate from user_activity history across all users
    try {
      const snap = await get(ref(this.db, 'user_activity'));
      if (!snap.exists()) return [];
      const counts = new Map<string, { title: string; type: string; count: number }>();
      const usersData = snap.val() as Record<string, any>;
      for (const userData of Object.values(usersData)) {
        const hist = userData?.history || {};
        for (const item of Object.values(hist) as any[]) {
          const key = `${item.mediaType || 'movie'}_${item.id}`;
          const title = item.title || item.name || 'Untitled';
          const type = item.mediaType || (item.name && !item.title ? 'tv' : 'movie');
          const existing = counts.get(key);
          if (existing) {
            existing.count++;
          } else {
            counts.set(key, { title, type, count: 1 });
          }
        }
      }
      return [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch { return []; }
  }

  /** Fetch a specific user's watch history (admin use) */
  async getUserWatchHistory(uid: string): Promise<{ id?: number; mediaId?: number; mediaType?: string; title?: string; name?: string; timestamp?: number; watchedAt?: number }[]> {
    try {
      const snap = await get(ref(this.db, `user_activity/${uid}/history`));
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<string, any>)
        .sort((a, b) => (b.timestamp || b.watchedAt || 0) - (a.timestamp || a.watchedAt || 0));
    } catch { return []; }
  }

  /** Fetch a specific user's search history (admin use) */
  async getUserSearchHistory(uid: string): Promise<{ query: string; timestamp: number }[]> {
    try {
      const snap = await get(ref(this.db, `user_activity/${uid}/searches`));
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<string, any>)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch { return []; }
  }

  async getRecentSearches(limit = 10): Promise<{ query: string; timestamp: number }[]> {
    // First try dedicated analytics/searches collection
    const searches = await this.getTrendingSearches(limit);
    if (searches.length > 0) {
      return searches
        .sort((a, b) => b.lastSearched - a.lastSearched)
        .slice(0, limit)
        .map(x => ({ query: x.query, timestamp: x.lastSearched }));
    }
    return [];
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
