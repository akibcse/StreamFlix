import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private readonly app: FirebaseApp;
  public readonly auth: Auth;
  public readonly db: Database;

  constructor() {
    this.app = getApps().length > 0 ? getApps()[0] : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getDatabase(this.app);
  }
}
