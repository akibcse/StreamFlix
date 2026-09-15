import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsService } from '../../../../services/settings.service';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { AdConfig } from '../../../../models/media.model';

const ADSTERRA_PRESETS: Omit<AdConfig, 'id'>[] = [
  {
    name: '🌐 Popunder (Global)',
    position: 'popunder',
    htmlCode: `<script src="https://pl31354133.profitableratecpmnetwork.com/ed/0b/6d/ed0b6d9c588e0d9fcfe92f1faa38f366.js"></script>`,
    active: true,
    notes: 'Loaded in <head>. 1 per page for best results.'
  },
  {
    name: '📊 Social Bar (Global)',
    position: 'social_bar',
    htmlCode: `<script src="https://pl31354134.profitableratecpmnetwork.com/d7/4a/ca/d74acab2cd5e977ced2ced9b22f7fc56.js"></script>`,
    active: true,
    notes: 'Loaded above </body>. Floating social bar on all pages.'
  },
  {
    name: '🔗 Smartlink',
    position: 'smartlink',
    htmlCode: `<a href="https://www.profitableratecpmnetwork.com/wi20vj0k7n?key=08224ba61f33a164c53d1f93fc13d95b" target="_blank" rel="noopener">Sponsored</a>`,
    active: true,
    notes: 'Standard hyperlink. Use anywhere on the page.'
  },
  {
    name: '🖼️ Native Banner (4:1)',
    position: 'home_interstitial',
    htmlCode: `<script async="async" data-cfasync="false" src="https://pl31354136.profitableratecpmnetwork.com/c9d044db823126693c8fc419ad62d580/invoke.js"></script>\n<div id="container-c9d044db823126693c8fc419ad62d580"></div>`,
    active: true,
    notes: 'Native Banner — can be placed anywhere in the page body.'
  },
  {
    name: '📐 Banner 468x60',
    position: 'player_top',
    htmlCode: `<script>\n  atOptions = {\n    'key' : '616c66c90058e85aa946878fbbeab3fd',\n    'format' : 'iframe',\n    'height' : 60,\n    'width' : 468,\n    'params' : {}\n  };\n</script>\n<script src="https://www.highrevenueformat.com/616c66c90058e85aa946878fbbeab3fd/invoke.js"></script>`,
    active: true,
    notes: 'Place anywhere in the page body.'
  },
  {
    name: '📐 Banner 160x300',
    position: 'sidebar',
    htmlCode: `<script>\n  atOptions = {\n    'key' : '625f45dd465c24aa016b68d078dbb011',\n    'format' : 'iframe',\n    'height' : 300,\n    'width' : 160,\n    'params' : {}\n  };\n</script>\n<script src="https://www.highrevenueformat.com/625f45dd465c24aa016b68d078dbb011/invoke.js"></script>`,
    active: true,
    notes: 'Sidebar / vertical rectangle slot.'
  },
  {
    name: '📐 Banner 320x50 (Mobile)',
    position: 'player_bottom',
    htmlCode: `<script>\n  atOptions = {\n    'key' : '30bff335532e94b027fb7c4db7b07d43',\n    'format' : 'iframe',\n    'height' : 50,\n    'width' : 320,\n    'params' : {}\n  };\n</script>\n<script src="https://www.highrevenueformat.com/30bff335532e94b027fb7c4db7b07d43/invoke.js"></script>`,
    active: true,
    notes: 'Mobile leaderboard — best below video player on mobile.'
  },
  {
    name: '📐 Banner 728x90 (Leaderboard)',
    position: 'player_bottom',
    htmlCode: `<script>\n  atOptions = {\n    'key' : 'ac21367c1f7b9127d8c07d21c9b04b89',\n    'format' : 'iframe',\n    'height' : 90,\n    'width' : 728,\n    'params' : {}\n  };\n</script>\n<script src="https://www.highrevenueformat.com/ac21367c1f7b9127d8c07d21c9b04b89/invoke.js"></script>`,
    active: true,
    notes: 'Leaderboard — ideal above/below video player on desktop.'
  },
  {
    name: '📐 Banner 160x600 (Wide Skyscraper)',
    position: 'sidebar',
    htmlCode: `<script>\n  atOptions = {\n    'key' : '57e6a7dd6c805629441e9a3b0512e645',\n    'format' : 'iframe',\n    'height' : 600,\n    'width' : 160,\n    'params' : {}\n  };\n</script>\n<script src="https://www.highrevenueformat.com/57e6a7dd6c805629441e9a3b0512e645/invoke.js"></script>`,
    active: true,
    notes: 'Wide skyscraper — best for sidebar placement.'
  },
  {
    name: '📐 Banner 300x250 (Medium Rectangle)',
    position: 'sidebar',
    htmlCode: `<script>\n  atOptions = {\n    'key' : '2426537576803ba068d26c2c79fd4ecf',\n    'format' : 'iframe',\n    'height' : 250,\n    'width' : 300,\n    'params' : {}\n  };\n</script>\n<script src="https://www.highrevenueformat.com/2426537576803ba068d26c2c79fd4ecf/invoke.js"></script>`,
    active: true,
    notes: 'Medium rectangle — the most versatile banner size.'
  }
];

const POSITION_LABELS: Record<string, string> = {
  player_top: 'Player Top Banner',
  player_bottom: 'Player Bottom Banner',
  home_interstitial: 'Home / Body Interstitial',
  sidebar: 'Sidebar',
  popunder: 'Popunder Script (Head)',
  social_bar: 'Social Bar (Body End)',
  smartlink: 'Smartlink',
};

@Component({
  selector: 'app-admin-ads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>📣 Advertisement Management</h1>
          <p>Manage all Adsterra ad units for StreamFlix. Popunder & Social Bar are globally injected in HTML. Configure, toggle, and preview all banner placements.</p>
        </div>
        <div class="header-actions">
          <button class="btn-preload" (click)="preloadAdsterra()" [disabled]="saving">
            ⚡ Load All Adsterra Units
          </button>
          <button class="btn-save-all" (click)="saveAll()" [disabled]="saving">
            {{ saving ? 'Saving...' : '💾 Save All' }}
          </button>
          <button class="btn-primary" (click)="addNewAd()">
            ➕ Custom Ad Unit
          </button>
        </div>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <!-- GLOBAL INJECTION NOTICE -->
      <div class="global-notice">
        <div class="notice-icon">🌍</div>
        <div class="notice-body">
          <strong>Global Scripts (Always Active)</strong>
          <p>The <strong>Popunder</strong> script is injected in <code>&lt;head&gt;</code> and the <strong>Social Bar</strong> is injected before <code>&lt;/body&gt;</code> directly in <code>index.html</code> — they fire on every page load automatically.</p>
        </div>
        <div class="notice-chips">
          <span class="chip chip-green">✅ Popunder Active</span>
          <span class="chip chip-cyan">✅ Social Bar Active</span>
        </div>
      </div>

      <!-- SMARTLINK CARD -->
      <div class="smartlink-card">
        <div class="sl-icon">🔗</div>
        <div class="sl-body">
          <strong>Adsterra Smartlink</strong>
          <p>Use this URL anywhere as a hyperlink — in buttons, text, or as a redirect target:</p>
          <code class="sl-url">https://www.profitableratecpmnetwork.com/wi20vj0k7n?key=08224ba61f33a164c53d1f93fc13d95b</code>
        </div>
        <button class="btn-copy-sl" (click)="copySmartlink()">📋 Copy</button>
      </div>

      <!-- AD UNITS GRID -->
      <div class="ads-grid">
        <div *ngFor="let ad of ads; let i = index" class="ad-card" [class.inactive]="!ad.active">
          <div class="ad-header">
            <div class="ad-title-row">
              <input type="text" [(ngModel)]="ad.name" class="ad-name-input" placeholder="Ad Unit Name" />
              <span class="pos-badge" [class]="'pos-' + ad.position">{{ getPositionLabel(ad.position) }}</span>
              <button
                class="btn-toggle"
                [class.active]="ad.active"
                (click)="toggleActive(ad)"
              >
                {{ ad.active ? '🟢 LIVE' : '⚫ OFF' }}
              </button>
            </div>
            <div class="actions">
              <button class="btn-save" (click)="saveAd(ad)">💾 Save</button>
              <button class="btn-delete" (click)="deleteAd(ad.id)">🗑️</button>
            </div>
          </div>

          <div class="ad-body">
            <!-- Notes badge -->
            <div class="ad-notes" *ngIf="ad.notes">
              <span class="notes-icon">💡</span> {{ ad.notes }}
            </div>

            <div class="form-row">
              <label>Placement Position</label>
              <select [(ngModel)]="ad.position" class="form-control">
                <option value="player_top">Player Top Banner — Above Video Player</option>
                <option value="player_bottom">Player Bottom Banner — Below Video Player</option>
                <option value="home_interstitial">Home / Interstitial — Between Media Rows</option>
                <option value="sidebar">Sidebar Rectangle</option>
                <option value="popunder">Popunder Script (Head)</option>
                <option value="social_bar">Social Bar (Body End)</option>
                <option value="smartlink">Smartlink Hyperlink</option>
              </select>
            </div>

            <div class="form-row">
              <label>Ad HTML / Embed Code</label>
              <textarea
                [(ngModel)]="ad.htmlCode"
                rows="4"
                class="form-control code-area"
                placeholder="Paste ad tag HTML here..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="ads.length === 0">
        <span style="font-size:2rem">📣</span>
        <p>No advertisement units configured.<br>Click <strong>⚡ Load All Adsterra Units</strong> to auto-populate all 10 ad slots.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0.25rem 0 0; font-size: 0.9rem; max-width: 600px; }
    .header-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }

    .btn-preload {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: white; border: none;
      padding: 0.65rem 1.1rem; border-radius: 10px; font-weight: 700; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-preload:hover:not(:disabled) { opacity: 0.9; }
    .btn-preload:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save-all {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white; border: none;
      padding: 0.65rem 1.1rem; border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .btn-save-all:hover:not(:disabled) { opacity: 0.9; }
    .btn-save-all:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white; border: none;
      padding: 0.65rem 1.1rem; border-radius: 10px; font-weight: 600; cursor: pointer;
    }

    /* Global Notice */
    .global-notice {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16,185,129,0.25);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      flex-wrap: wrap;
    }
    .notice-icon { font-size: 1.6rem; }
    .notice-body { flex: 1; }
    .notice-body strong { color: #34d399; font-size: 1rem; }
    .notice-body p { color: #94a3b8; font-size: 0.85rem; margin: 0.25rem 0 0; }
    .notice-body code { background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 4px; font-size: 0.8rem; color: #a5b4fc; }
    .notice-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; align-self: center; }
    .chip {
      padding: 4px 12px; border-radius: 9999px;
      font-size: 0.78rem; font-weight: 700;
    }
    .chip-green { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .chip-cyan  { background: rgba(6,182,212,0.15);  color: #22d3ee; border: 1px solid rgba(6,182,212,0.3); }

    /* Smartlink Card */
    .smartlink-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(17,24,39,0.65);
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      flex-wrap: wrap;
    }
    .sl-icon { font-size: 1.5rem; }
    .sl-body { flex: 1; }
    .sl-body strong { color: #a5b4fc; }
    .sl-body p { color: #94a3b8; font-size: 0.84rem; margin: 0.2rem 0; }
    .sl-url {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.78rem;
      color: #38bdf8;
      word-break: break-all;
      background: rgba(0,0,0,0.3);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .btn-copy-sl {
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.3);
      color: #a5b4fc;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-copy-sl:hover { background: rgba(99,102,241,0.25); }

    /* Ads grid */
    .ads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); gap: 1.25rem; }
    @media (max-width: 640px) { .ads-grid { grid-template-columns: 1fr; } }
    .ad-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
      transition: all 0.2s;
    }
    .ad-card.inactive { opacity: 0.5; }
    .ad-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
    .ad-title-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .ad-name-input {
      background: transparent; border: none;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      color: white; font-size: 1rem; font-weight: 700; outline: none;
    }
    .pos-badge {
      padding: 2px 8px; border-radius: 9999px;
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);
    }
    .pos-popunder, .pos-social_bar { background: rgba(16,185,129,0.15); color: #34d399; border-color: rgba(16,185,129,0.3); }
    .pos-smartlink { background: rgba(59,130,246,0.15); color: #93c5fd; border-color: rgba(59,130,246,0.3); }
    .pos-sidebar { background: rgba(245,158,11,0.15); color: #fcd34d; border-color: rgba(245,158,11,0.3); }

    .btn-toggle {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8; padding: 3px 10px; border-radius: 6px; cursor: pointer; font-size: 0.78rem;
    }
    .btn-toggle.active { background: rgba(34,197,94,0.15); border-color: #22c55e; color: #4ade80; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-save { background: #6366f1; border: none; color: white; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
    .btn-delete { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; }

    .ad-body { display: flex; flex-direction: column; gap: 0.85rem; }
    .ad-notes { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 6px 10px; font-size: 0.8rem; color: #fcd34d; display: flex; gap: 0.5rem; }
    .notes-icon { flex-shrink: 0; }
    .form-row { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-row label { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; }
    .form-control {
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 0.65rem 0.85rem; color: white; outline: none; width: 100%; box-sizing: border-box;
    }
    .code-area { font-family: monospace; font-size: 0.78rem; resize: vertical; }

    .alert-success { background: rgba(34,197,94,0.15); color: #4ade80; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(34,197,94,0.25); }
    .alert-error { background: rgba(239,68,68,0.15); color: #f87171; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(239,68,68,0.25); }
    .empty-state { text-align: center; padding: 3rem 2rem; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    .empty-state p { color: #94a3b8; }
  `]
})
export class AdminAdsComponent implements OnInit, OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly adminMedia = inject(AdminMediaService);
  private sub?: Subscription;

  ads: AdConfig[] = [];
  saving = false;
  successMsg = '';
  errorMsg = '';

  ngOnInit(): void {
    this.sub = this.settings.ads$.subscribe(list => {
      if (!this.saving) {
        this.ads = list.map(a => ({ ...a }));
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getPositionLabel(pos: string): string {
    return POSITION_LABELS[pos] || pos;
  }

  copySmartlink(): void {
    const url = 'https://www.profitableratecpmnetwork.com/wi20vj0k7n?key=08224ba61f33a164c53d1f93fc13d95b';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.successMsg = '📋 Smartlink URL copied to clipboard!';
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 2500);
      });
    }
  }

  async preloadAdsterra(): Promise<void> {
    if (!confirm('This will add all 10 official Adsterra ad units from your account. Continue?')) return;
    this.saving = true;
    this.cdr.detectChanges();
    try {
      for (const preset of ADSTERRA_PRESETS) {
        const id = `adsterra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ad: AdConfig = { id, ...preset };
        await this.settings.saveAd(ad);
        // Small delay to avoid rate limiting Firebase writes
        await new Promise(r => setTimeout(r, 80));
      }
      await this.adminMedia.logAction('save_ad', 'Adsterra', 'Preloaded 10 Adsterra ad units');
      this.ngZone.run(() => {
        this.successMsg = '✅ All 10 Adsterra ad units loaded and saved!';
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 4000);
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        this.errorMsg = e?.message || 'Failed to preload Adsterra units.';
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 4000);
      });
    }
  }

  async addNewAd(): Promise<void> {
    const newId = `ad_${Date.now()}`;
    const newAd: AdConfig = {
      id: newId,
      name: `Custom Ad Unit ${this.ads.length + 1}`,
      position: 'player_bottom',
      htmlCode: '',
      active: true
    };
    this.ads.push(newAd);
    try {
      await this.settings.saveAd(newAd);
      this.successMsg = `New ad slot created.`;
      setTimeout(() => (this.successMsg = ''), 3000);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to create ad slot.';
      setTimeout(() => (this.errorMsg = ''), 4000);
    }
  }

  async toggleActive(ad: AdConfig): Promise<void> {
    ad.active = !ad.active;
    try {
      await this.settings.toggleAd(ad.id, ad.active);
      this.successMsg = `"${ad.name}" set to ${ad.active ? 'LIVE' : 'OFF'}.`;
      this.cdr.detectChanges();
      setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 2500);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to update ad state.';
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3500);
    }
  }

  async saveAd(ad: AdConfig): Promise<void> {
    this.errorMsg = '';
    try {
      await this.settings.saveAd(ad);
      await this.adminMedia.logAction('save_ad', ad.position, ad.name);
      this.successMsg = `"${ad.name}" saved.`;
      this.cdr.detectChanges();
      setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to save ad.';
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3500);
    }
  }

  async saveAll(): Promise<void> {
    this.saving = true;
    this.errorMsg = '';
    this.cdr.detectChanges();
    try {
      await this.settings.saveAllAds(this.ads);
      await this.adminMedia.logAction('save_ad', 'bulk', `Saved ${this.ads.length} ad units`);
      this.ngZone.run(() => {
        this.successMsg = 'All ad units saved and synced!';
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
      await this.adminMedia.logAction('delete_ad', id);
      this.ads = this.ads.filter(a => a.id !== id);
      this.successMsg = 'Ad unit removed.';
      this.cdr.detectChanges();
      setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to delete ad.';
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3500);
    }
  }
}
