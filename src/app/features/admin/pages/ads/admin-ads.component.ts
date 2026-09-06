import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsService } from '../../../../services/settings.service';
import { AdConfig } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-ads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Advertisement Management</h1>
          <p>Control banner placements, script tags, popunder toggles, and affiliate sponsorship slots across player and site pages.</p>
        </div>
        <div class="header-actions">
          <button class="btn-save-all" (click)="saveAll()" [disabled]="saving">
            {{ saving ? 'Saving All...' : '💾 Save All Ad Units' }}
          </button>
          <button class="btn-primary" (click)="addNewAd()">
            <span>➕</span> Add Ad Unit
          </button>
        </div>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <div class="ads-grid">
        <div *ngFor="let ad of ads" class="ad-card" [class.inactive]="!ad.active">
          <div class="ad-header">
            <div class="ad-title-row">
              <input type="text" [(ngModel)]="ad.name" class="ad-name-input" placeholder="Ad Unit Name" />
              <button
                class="btn-toggle"
                [class.active]="ad.active"
                (click)="toggleActive(ad)"
              >
                {{ ad.active ? 'ACTIVE' : 'OFF' }}
              </button>
            </div>
            <div class="actions">
              <button class="btn-save" (click)="saveAd(ad)">Save</button>
              <button class="btn-delete" (click)="deleteAd(ad.id)">Delete</button>
            </div>
          </div>

          <div class="ad-body">
            <div class="form-row">
              <label>Placement Position</label>
              <select [(ngModel)]="ad.position" class="form-control">
                <option value="player_top">Player Top Banner (728x90) — Above Video Player</option>
                <option value="player_bottom">Player Bottom Banner (728x90) — Below Video Player</option>
                <option value="home_interstitial">Home Interstitial — Between Media Rows</option>
                <option value="sidebar">Sidebar Rectangle (300x250)</option>
                <option value="popunder">Popunder Script</option>
              </select>
            </div>

            <div class="form-row">
              <label>Ad HTML / Embed Code / Script</label>
              <textarea
                [(ngModel)]="ad.htmlCode"
                rows="3"
                class="form-control code-area"
                placeholder="<a href='https://...' target='_blank'><img src='https://...' /></a> or <script>...</script>"
              ></textarea>
            </div>

            <div class="preview-box" *ngIf="ad.htmlCode && ad.active">
              <span class="preview-label">Live Preview:</span>
              <div class="preview-content" [innerHTML]="ad.htmlCode"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="ads.length === 0">
        <p>No advertising units configured. Click "Add Ad Unit" above to create your first ad slot.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0; font-size: 0.9rem; }
    .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .btn-save-all {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-save-all:hover { opacity: 0.92; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .ads-grid { display: flex; flex-direction: column; gap: 1.25rem; }
    .ad-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
      transition: all 0.2s;
    }
    .ad-card.inactive { opacity: 0.55; }
    .ad-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
    .ad-title-row { display: flex; align-items: center; gap: 0.75rem; }
    .ad-name-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 1.05rem;
      font-weight: 700;
      outline: none;
    }
    .btn-toggle {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 3px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .btn-toggle.active { background: rgba(34, 197, 94, 0.2); border-color: #22c55e; color: #4ade80; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-save { background: #6366f1; border: none; color: white; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .btn-delete { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .ad-body { display: flex; flex-direction: column; gap: 0.85rem; }
    .form-row { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-row label { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      outline: none;
    }
    .code-area { font-family: monospace; font-size: 0.8rem; }
    .preview-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .preview-label { font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .preview-content { display: flex; justify-content: center; }
    .preview-content ::ng-deep img { max-width: 100%; height: auto; border-radius: 6px; }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; }
    .alert-error { background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 0.75rem; border-radius: 8px; }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `]
})
export class AdminAdsComponent implements OnInit, OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  ads: AdConfig[] = [];
  saving = false;
  successMsg = '';
  errorMsg = '';

  ngOnInit(): void {
    // Subscribe to the live ads stream - syncs from Firebase RTDB
    this.sub = this.settings.ads$.subscribe(list => {
      if (!this.saving) {
        this.ads = list.map(a => ({ ...a })); // shallow copy to allow form edits
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async addNewAd(): Promise<void> {
    const newId = `ad_${Date.now()}`;
    const newAd: AdConfig = {
      id: newId,
      name: `Banner Slot ${this.ads.length + 1}`,
      position: 'player_bottom',
      htmlCode: '<a href="https://example.com" target="_blank"><img src="https://via.placeholder.com/728x90/1e293b/a5b4fc?text=StreamFlix+Sponsor" alt="Ad" /></a>',
      active: true
    };
    this.ads.push(newAd);
    try {
      await this.settings.saveAd(newAd);
      this.successMsg = `New ad slot "${newAd.name}" created and saved.`;
      setTimeout(() => (this.successMsg = ''), 3500);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to save new ad slot.';
      setTimeout(() => (this.errorMsg = ''), 4000);
    }
  }

  async toggleActive(ad: AdConfig): Promise<void> {
    ad.active = !ad.active;
    try {
      await this.settings.toggleAd(ad.id, ad.active);
      this.successMsg = `Ad "${ad.name}" set to ${ad.active ? 'ACTIVE' : 'OFF'}.`;
      setTimeout(() => (this.successMsg = ''), 2500);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to update ad state.';
      setTimeout(() => (this.errorMsg = ''), 3500);
    }
  }

  async saveAd(ad: AdConfig): Promise<void> {
    this.errorMsg = '';
    try {
      await this.settings.saveAd(ad);
      this.successMsg = `Ad "${ad.name}" saved successfully in real time.`;
      setTimeout(() => (this.successMsg = ''), 3000);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to save ad.';
      setTimeout(() => (this.errorMsg = ''), 3500);
    }
  }

  async saveAll(): Promise<void> {
    this.saving = true;
    this.errorMsg = '';
    this.cdr.detectChanges();
    try {
      await this.settings.saveAllAds(this.ads);
      this.ngZone.run(() => {
        this.successMsg = 'All advertisement units saved and synchronized in real time!';
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3500);
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        this.errorMsg = e?.message || 'Failed to save advertisements.';
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 4000);
      });
    }
  }

  async deleteAd(id: string): Promise<void> {
    if (!confirm('Remove this advertisement unit?')) return;
    try {
      await this.settings.deleteAd(id);
      this.ads = this.ads.filter(a => a.id !== id);
      this.successMsg = 'Ad unit removed.';
      setTimeout(() => (this.successMsg = ''), 3000);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to delete ad.';
      setTimeout(() => (this.errorMsg = ''), 3500);
    }
  }
}
