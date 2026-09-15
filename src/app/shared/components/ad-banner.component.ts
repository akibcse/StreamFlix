import {
  Component, Input, OnInit, OnDestroy, OnChanges,
  inject, ElementRef, ViewChildren, QueryList,
  AfterViewInit, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { AdConfig } from '../../models/media.model';
import { Subscription } from 'rxjs';

/**
 * AdBannerComponent
 *
 * Renders all active ads for a given placement position.
 * Injects <script> tags properly using DOM APIs so they actually execute.
 *
 * Usage:
 *   <app-ad-banner position="player_bottom"></app-ad-banner>
 *   <app-ad-banner position="sidebar"></app-ad-banner>
 */
@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ad-banner-wrap" *ngIf="activeAds.length > 0">
      <span class="ad-label">AD</span>
      <div
        *ngFor="let ad of activeAds; let i = index"
        class="ad-slot"
        [attr.data-ad-id]="ad.id"
        #adSlot
      ></div>
    </div>
  `,
  styles: [`
    .ad-banner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      margin: 0.75rem 0;
      overflow: hidden;
      position: relative;
    }
    .ad-label {
      font-size: 0.6rem;
      letter-spacing: 0.08em;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      align-self: flex-end;
      padding: 0 2px;
    }
    .ad-slot {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      overflow: hidden;
    }
    .ad-slot ::ng-deep iframe { border: none; max-width: 100%; }
    .ad-slot ::ng-deep img { max-width: 100%; height: auto; }
  `]
})
export class AdBannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() position = 'player_bottom';
  @ViewChildren('adSlot') adSlots!: QueryList<ElementRef<HTMLDivElement>>;

  private readonly settingsService = inject(SettingsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private rendered = false;

  activeAds: AdConfig[] = [];

  ngOnInit(): void {
    this.sub = this.settingsService.getAdsByPosition(this.position).subscribe(ads => {
      this.activeAds = ads;
      this.rendered = false;
      this.cdr.markForCheck();
      // Re-inject scripts after view updates
      setTimeout(() => this.injectScripts(), 50);
    });
  }

  ngAfterViewInit(): void {
    this.injectScripts();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private injectScripts(): void {
    if (!this.adSlots) return;
    const slots = this.adSlots.toArray();
    this.activeAds.forEach((ad, i) => {
      const container = slots[i]?.nativeElement;
      if (!container || container.hasChildNodes()) return;
      this.injectAdCode(container, ad.htmlCode);
    });
  }

  private injectAdCode(container: HTMLElement, htmlCode: string): void {
    // Parse the htmlCode to extract scripts and non-script HTML
    const template = document.createElement('template');
    template.innerHTML = htmlCode.trim();

    const nodes = Array.from(template.content.childNodes);
    for (const node of nodes) {
      if (node.nodeName === 'SCRIPT') {
        const orig = node as HTMLScriptElement;
        const script = document.createElement('script');
        // Copy all attributes
        Array.from(orig.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.text = orig.text || orig.innerHTML;
        container.appendChild(script);
      } else {
        container.appendChild(document.importNode(node, true));
      }
    }
  }
}
