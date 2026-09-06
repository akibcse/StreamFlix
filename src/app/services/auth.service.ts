import { Injectable, inject } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, set, get, update, onValue, off } from 'firebase/database';
import { BehaviorSubject, Observable, map } from 'rxjs';
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
    map(user => user?.role === 'admin')
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
        const isAdminConfigured = fbUser.email && environment.adminEmails?.includes(fbUser.email.toLowerCase());

        if (snapshot.exists()) {
          const data = snapshot.val();
          const role = (isAdminConfigured || data.role === 'admin') ? 'admin' : (data.role || 'user');
          
          appUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || data.displayName || 'User',
            photoURL: fbUser.photoURL || null,
            role,
            createdAt: data.createdAt || now,
            lastLoginAt: now
          };

          await update(userRef, {
            lastLoginAt: now,
            role: appUser.role,
            displayName: appUser.displayName,
            email: appUser.email
          });
        } else {
          // Check if this is the first registered user to grant admin automatically
          const allUsersSnap = await get(ref(this.firebase.db, 'users'));
          const isFirstUser = !allUsersSnap.exists() || Object.keys(allUsersSnap.val() || {}).length === 0;

          appUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || 'User',
            photoURL: fbUser.photoURL || null,
            role: (isFirstUser || isAdminConfigured) ? 'admin' : 'user',
            createdAt: now,
            lastLoginAt: now
          };

          await set(userRef, appUser);
        }

        this.currentUserSubject.next(appUser);
      } catch (err) {
        console.error('Error syncing user profile with database:', err);
        // Fallback user object in case database read fails
        this.currentUserSubject.next({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'User',
          photoURL: fbUser.photoURL,
          role: environment.adminEmails?.includes(fbUser.email?.toLowerCase() || '') ? 'admin' : 'user',
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        });
      } finally {
        this.loadingSubject.next(false);
      }
    });
  }

  async register(email: string, password: string, displayName: string): Promise<AppUser> {
    const cred = await createUserWithEmailAndPassword(this.firebase.auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    const now = Date.now();
    const isAdminConfigured = environment.adminEmails?.includes(email.toLowerCase());

    const allUsersSnap = await get(ref(this.firebase.db, 'users'));
    const isFirstUser = !allUsersSnap.exists() || Object.keys(allUsersSnap.val() || {}).length === 0;
    const role: 'admin' | 'user' = (isFirstUser || isAdminConfigured) ? 'admin' : 'user';

    const user: AppUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || cred.user.email?.split('@')[0] || 'User',
      photoURL: null,
      role,
      createdAt: now,
      lastLoginAt: now
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
}
