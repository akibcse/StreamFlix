import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SettingsService } from '../../services/settings.service';
import { AdConfig } from '../../models/media.model';

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ad-banner-container" *ngIf="activeAds.length > 0" [attr.data-position]="position">
      <div class="ad-label">
        <span>SPONSORED</span>
      </div>
      <div class="ad-slots">
        <div *ngFor="let ad of activeAds" class="ad-slot" [innerHTML]="sanitizeHtml(ad.htmlCode)"></div>
      </div>
    </div>
  `,
  styles: [`
    .ad-banner-container {
      margin: 1.25rem 0;
      padding: 0.75rem;
      background: rgba(15, 23, 42, 0.45);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 80px;
      overflow: hidden;
      position: relative;
    }
    .ad-label {
      align-self: flex-end;
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }
    .ad-slots {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
    .ad-slot {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .ad-slot ::ng-deep img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .ad-slot ::ng-deep iframe {
      max-width: 100%;
      border: none;
      border-radius: 8px;
    }
  `]
})
export class AdBannerComponent implements OnInit {
  @Input() position = 'player_bottom';

  private readonly settingsService = inject(SettingsService);
  private readonly sanitizer = inject(DomSanitizer);

  activeAds: AdConfig[] = [];

  ngOnInit(): void {
    this.settingsService.getAdsByPosition(this.position).subscribe(ads => {
      this.activeAds = ads;
    });
  }

  sanitizeHtml(code: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(code);
  }
}
