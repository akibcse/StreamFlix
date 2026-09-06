import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsService } from '../../../../services/settings.service';

@Component({
  selector: 'app-admin-seo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>SEO & Search Engine Optimization</h1>
          <p>Configure global metadata, Open Graph cards, search crawler indexability, and rich JSON-LD snippets.</p>
        </div>
        <button class="btn-primary" (click)="saveSeo()" [disabled]="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <div class="form-grid">
        <div class="form-card">
          <h3>Global Meta Tags</h3>

          <div class="form-group">
            <label>Default Page Title</label>
            <input type="text" [(ngModel)]="seo.defaultTitle" class="form-control" />
            <span class="hint">Shown when no custom page title is active</span>
          </div>

          <div class="form-group">
            <label>Default Meta Description</label>
            <textarea [(ngModel)]="seo.defaultDescription" rows="3" class="form-control"></textarea>
            <span class="hint">Recommended under 160 characters</span>
          </div>

          <div class="form-group">
            <label>Global Meta Keywords</label>
            <input type="text" [(ngModel)]="seo.keywords" class="form-control" placeholder="movies, watch online, hd streaming, tv series" />
          </div>
        </div>

        <div class="form-card">
          <h3>Social Sharing & Rich Cards</h3>

          <div class="form-group">
            <label>Open Graph Default Image URL</label>
            <input type="text" [(ngModel)]="seo.ogImage" class="form-control" placeholder="https://..." />
          </div>

          <div class="form-group">
            <label>Twitter / X Creator Handle</label>
            <input type="text" [(ngModel)]="seo.twitterHandle" class="form-control" placeholder="@streamflix" />
          </div>

          <div class="form-group">
            <label>Canonical Site Domain</label>
            <input type="text" [(ngModel)]="seo.siteUrl" class="form-control" placeholder="https://streamflix.vercel.app" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0; font-size: 0.9rem; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 800px) { .form-grid { grid-template-columns: 1fr; } }
    .form-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-card h3 { font-size: 1.15rem; color: white; margin: 0; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      outline: none;
    }
    .hint { font-size: 0.75rem; color: #64748b; }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(34,197,94,0.25); font-weight: 500; }
    .alert-error { background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(239,68,68,0.25); font-weight: 500; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class AdminSeoComponent implements OnInit, OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  saving = false;
  successMsg = '';
  errorMsg = '';

  seo = {
    defaultTitle: 'StreamFlix — Watch Movies & TV Series Online Free in Full HD',
    defaultDescription: 'Stream thousands of movies and TV shows for free in HD quality. No sign-up required, multiple fast servers, and subtitle support.',
    keywords: 'movies, stream, free movies, watch online, tv series, cinema, streaming hd',
    ogImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=630&fit=crop',
    twitterHandle: '@streamflix',
    siteUrl: 'https://streamflix.vercel.app'
  };

  ngOnInit(): void {
    this.sub = this.settings.settings$.subscribe(s => {
      if (!this.saving) {
        if (s.seo) this.seo = { ...this.seo, ...s.seo };
        if (s.globalSeoTitle) this.seo.defaultTitle = s.globalSeoTitle;
        if (s.globalSeoDescription) this.seo.defaultDescription = s.globalSeoDescription;
        if (s.globalOgImage) this.seo.ogImage = s.globalOgImage;
        if (s.siteUrl) this.seo.siteUrl = s.siteUrl;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async saveSeo(): Promise<void> {
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';
    this.cdr.detectChanges();
    try {
      await this.settings.saveSettings({
        seo: this.seo,
        globalSeoTitle: this.seo.defaultTitle,
        globalSeoDescription: this.seo.defaultDescription,
        globalOgImage: this.seo.ogImage,
        siteUrl: this.seo.siteUrl
      });
      this.ngZone.run(() => {
        this.successMsg = '✅ SEO configuration saved and applied globally in real time!';
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 4000);
      });
    } catch (err: any) {
      console.error('SEO save error:', err);
      this.ngZone.run(() => {
        this.errorMsg = '⚠️ ' + (err?.message || 'Failed to save SEO configuration. Check browser console.');
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 5000);
      });
    }
  }
}
