import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ref, push, onValue, off, remove } from 'firebase/database';
import { Observable, filter, catchError, of } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { VisitorLog, VisitorStats } from '../models/visitor-log.model';

interface GeoData {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VisitorLogService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);

  private cachedGeo: GeoData | null = null;
  private isTrackingStarted = false;

  constructor() {}

  startTracking(): void {
    if (this.isTrackingStarted) return;
    this.isTrackingStarted = true;

    // Prefetch client IP / geo info
    this.fetchGeoInfo();

    // Listen to route changes
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(event => {
        this.recordVisit(event.urlAfterRedirects || event.url);
      });
  }

  private fetchGeoInfo(): void {
    this.http
      .get<GeoData>('https://ipapi.co/json/')
      .pipe(
        catchError(() => {
          // Fallback to simple ipify if ipapi rate-limited
          return this.http.get<{ ip: string }>('https://api.ipify.org?format=json').pipe(
            catchError(() => of({ ip: 'Unknown IP' }))
          );
        })
      )
      .subscribe(data => {
        this.cachedGeo = data;
      });
  }

  private async recordVisit(path: string): Promise<void> {
    try {
      const user = this.auth.currentUser;
      const geo = this.cachedGeo;
      const userAgent = navigator.userAgent;
      const { browser, os, device } = this.parseUserAgent(userAgent);

      const log: VisitorLog = {
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString(),
        path: path || '/',
        ip: geo?.ip || 'Detecting...',
        city: geo?.city || '',
        region: geo?.region || '',
        country: geo?.country_name || 'Global',
        browser,
        os,
        device,
        userId: user?.uid || null,
        userEmail: user?.email || 'Anonymous Visitor'
      };

      const logsRef = ref(this.firebase.db, 'visitor_logs');
      await push(logsRef, log);
    } catch (err) {
      console.warn('Visitor tracking skipped or failed:', err);
    }
  }

  getRecentLogs(): Observable<VisitorLog[]> {
    return new Observable<VisitorLog[]>(observer => {
      const logsRef = ref(this.firebase.db, 'visitor_logs');
      const listener = onValue(
        logsRef,
        snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const logs: VisitorLog[] = Object.entries(data).map(([id, val]) => ({
              ...(val as VisitorLog),
              id
            }));
            logs.sort((a, b) => b.timestamp - a.timestamp);
            observer.next(logs);
          } else {
            observer.next([]);
          }
        },
        error => observer.error(error)
      );

      return () => off(logsRef, 'value', listener);
    });
  }

  getVisitorStats(): Observable<VisitorStats> {
    return new Observable<VisitorStats>(observer => {
      const logsRef = ref(this.firebase.db, 'visitor_logs');
      const listener = onValue(
        logsRef,
        snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const logs: VisitorLog[] = Object.entries(data).map(([id, val]) => ({
              ...(val as VisitorLog),
              id
            }));
            logs.sort((a, b) => b.timestamp - a.timestamp);

            const totalVisits = logs.length;
            const uniqueIps = new Set(logs.map(l => l.ip).filter(ip => ip && ip !== 'Detecting...'));
            const uniqueVisitors = uniqueIps.size || totalVisits;

            // Compute top pages
            const pageCounts: Record<string, number> = {};
            for (const log of logs) {
              const p = log.path.split('?')[0];
              pageCounts[p] = (pageCounts[p] || 0) + 1;
            }

            const topPages = Object.entries(pageCounts)
              .map(([path, count]) => ({ path, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);

            observer.next({
              totalVisits,
              uniqueVisitors,
              topPages,
              recentLogs: logs.slice(0, 100)
            });
          } else {
            observer.next({
              totalVisits: 0,
              uniqueVisitors: 0,
              topPages: [],
              recentLogs: []
            });
          }
        },
        error => observer.error(error)
      );

      return () => off(logsRef, 'value', listener);
    });
  }

  async clearLogs(): Promise<void> {
    const logsRef = ref(this.firebase.db, 'visitor_logs');
    await remove(logsRef);
  }

  private parseUserAgent(ua: string): { browser: string; os: string; device: string } {
    let browser = 'Other';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';

    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let device = 'Desktop';
    if (/Mobi|Android|iPhone/i.test(ua)) {
      device = 'Mobile';
    } else if (/iPad|Tablet/i.test(ua)) {
      device = 'Tablet';
    }

    return { browser, os, device };
  }
}
