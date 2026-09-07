import { Injectable, inject } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, set, get, update, remove, onValue, off } from 'firebase/database';
import { BehaviorSubject, Observable, map, distinctUntilChanged } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebase = inject(FirebaseService);

  private readonly currentUserSubject = new BehaviorSubject<AppUser | null>(null);
  public readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  public readonly loading$ = this.loadingSubject.asObservable();

  public readonly isAuthenticated$: Observable<boolean> = this.currentUser$.pipe(
    map(user => !!user)
  );

  public readonly isAdmin$: Observable<boolean> = this.currentUser$.pipe(
    map(user => {
      if (!user) return false;
      const emailLower = user.email?.toLowerCase() || '';
      const isConfiguredAdmin = environment.adminEmails?.map(e => e.toLowerCase()).includes(emailLower);
      return user.role === 'admin' || !!isConfiguredAdmin;
    }),
    distinctUntilChanged()
  );

  constructor() {
    this.initAuthState();
  }

  get currentUser(): AppUser | null {
    return this.currentUserSubject.value;
  }

  private initAuthState(): void {
    onAuthStateChanged(this.firebase.auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        this.currentUserSubject.next(null);
        this.loadingSubject.next(false);
        return;
      }

      try {
        const userRef = ref(this.firebase.db, `users/${fbUser.uid}`);
        const snapshot = await get(userRef);

        let appUser: AppUser;
        const now = Date.now();
        const emailLower = fbUser.email?.toLowerCase() || '';
        const isAdminConfigured = environment.adminEmails?.map(e => e.toLowerCase()).includes(emailLower);

        const telemetry = this.getClientTelemetry();

        if (snapshot.exists()) {
          const data = snapshot.val();
          const role: 'admin' | 'user' = (isAdminConfigured || data.role === 'admin') ? 'admin' : 'user';
          
          appUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || data.displayName || 'User',
            photoURL: fbUser.photoURL || null,
            role,
            createdAt: data.createdAt || now,
            lastLoginAt: now,
            ...telemetry
          };

          await update(userRef, {
            lastLoginAt: now,
            role: appUser.role,
            displayName: appUser.displayName,
            email: appUser.email,
            ...telemetry
          });
        } else {
          appUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || 'User',
            photoURL: fbUser.photoURL || null,
            role: isAdminConfigured ? 'admin' : 'user',
            createdAt: now,
            lastLoginAt: now,
            ...telemetry
          };

          await set(userRef, appUser);
        }

        this.currentUserSubject.next(appUser);
      } catch (err) {
        console.error('Error syncing user profile with database:', err);
        const emailLower = fbUser.email?.toLowerCase() || '';
        const isAdminConfigured = environment.adminEmails?.map(e => e.toLowerCase()).includes(emailLower);
        const role: 'admin' | 'user' = isAdminConfigured ? 'admin' : 'user';

        this.currentUserSubject.next({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'User',
          photoURL: fbUser.photoURL,
          role,
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        });
      } finally {
        this.loadingSubject.next(false);
      }
    });
  }

  private getClientTelemetry(): Partial<AppUser> {
    let geo: any = null;
    try {
      const stored = sessionStorage.getItem('streamflix_cached_geo_v2');
      if (stored) geo = JSON.parse(stored);
    } catch { /* ignore */ }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    const dev = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
    const os = /Win/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'Linux';
    const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Browser';
    const screen = typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : undefined;

    const res: Partial<AppUser> = {
      lastDevice: dev,
      lastOs: os,
      lastBrowser: browser,
      lastScreen: screen
    };

    if (geo?.ip && geo.ip !== 'Detecting...') res.lastIp = geo.ip;
    if (geo?.isp || geo?.org) res.lastIsp = geo.isp || geo.org;
    if (geo?.org) res.lastOrg = geo.org;
    if (geo?.asn) res.lastAsn = geo.asn;
    if (geo?.city) res.lastCity = geo.city;
    if (geo?.region) res.lastRegion = geo.region;
    if (geo?.country) res.lastCountry = geo.country;
    if (geo?.countryCode) res.lastCountryCode = geo.countryCode;
    if (geo?.postal) res.lastPostal = geo.postal;
    if (geo?.latitude) res.lastLat = geo.latitude;
    if (geo?.longitude) res.lastLon = geo.longitude;
    if (geo?.timezone) res.lastTimezone = geo.timezone;
    if (geo?.flag) res.lastFlag = geo.flag;

    return res;
  }

  async register(email: string, password: string, displayName: string): Promise<AppUser> {
    const cred = await createUserWithEmailAndPassword(this.firebase.auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    const now = Date.now();
    const isAdminConfigured = environment.adminEmails?.includes(email.toLowerCase());
    const role: 'admin' | 'user' = isAdminConfigured ? 'admin' : 'user';
    const telemetry = this.getClientTelemetry();

    const user: AppUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || cred.user.email?.split('@')[0] || 'User',
      photoURL: null,
      role,
      createdAt: now,
      lastLoginAt: now,
      ...telemetry
    };

    await set(ref(this.firebase.db, `users/${user.uid}`), user);
    this.currentUserSubject.next(user);
    return user;
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.firebase.auth, email, password);
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.firebase.auth, provider);
  }

  async logout(): Promise<void> {
    await signOut(this.firebase.auth);
    this.currentUserSubject.next(null);
  }

  getAllUsers(): Observable<AppUser[]> {
    return new Observable<AppUser[]>(observer => {
      const usersRef = ref(this.firebase.db, 'users');
      const listener = onValue(
        usersRef,
        snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const users: AppUser[] = Object.values(data);
            users.sort((a, b) => b.createdAt - a.createdAt);
            observer.next(users);
          } else {
            observer.next([]);
          }
        },
        error => observer.error(error)
      );

      return () => off(usersRef, 'value', listener);
    });
  }

  async updateUserRole(uid: string, role: 'admin' | 'user'): Promise<void> {
    const userRef = ref(this.firebase.db, `users/${uid}`);
    await update(userRef, { role });

    if (this.currentUserSubject.value?.uid === uid) {
      this.currentUserSubject.next({
        ...this.currentUserSubject.value,
        role
      });
    }
  }

  async updateUserData(uid: string, data: Partial<AppUser>): Promise<void> {
    const userRef = ref(this.firebase.db, `users/${uid}`);
    await update(userRef, data);

    if (this.currentUserSubject.value?.uid === uid) {
      this.currentUserSubject.next({
        ...this.currentUserSubject.value,
        ...data
      });
    }
  }

  async deleteUser(uid: string): Promise<void> {
    const userRef = ref(this.firebase.db, `users/${uid}`);
    await remove(userRef);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebase.auth, email);
  }

  async updateProfileData(displayName: string, photoURL?: string): Promise<void> {
    const user = this.firebase.auth.currentUser;
    if (!user) throw new Error('Not logged in');
    await updateProfile(user, { displayName, photoURL });
    const userRef = ref(this.firebase.db, `users/${user.uid}`);
    await update(userRef, { displayName, photoURL: photoURL || null });
    if (this.currentUserSubject.value) {
      this.currentUserSubject.next({
        ...this.currentUserSubject.value,
        displayName,
        photoURL: photoURL || null
      });
    }
  }

  async changePassword(newPassword: string): Promise<void> {
    const user = this.firebase.auth.currentUser;
    if (!user) throw new Error('Not logged in');
    await updatePassword(user, newPassword);
  }
}
