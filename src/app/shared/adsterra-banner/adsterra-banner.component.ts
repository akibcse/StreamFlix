import {
  Component, Input, OnInit, OnDestroy,
  ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdsterraBannerKey =
  | 'native'        // 4:1 Native Banner
  | 'banner_468x60'
  | 'banner_160x300'
  | 'banner_320x50'
  | 'banner_728x90'
  | 'banner_160x600'
  | 'banner_300x250';

interface BannerDef {
  key: string;
  width: number;
  height: number;
  invokeUrl: string;
}

const ADSTERRA_BANNERS: Record<AdsterraBannerKey, BannerDef> = {
  native: {
    key: 'c9d044db823126693c8fc419ad62d580',
    width: 0,
    height: 0,
    invokeUrl: 'https://pl31354136.profitableratecpmnetwork.com/c9d044db823126693c8fc419ad62d580/invoke.js'
  },
  banner_468x60: {
    key: '616c66c90058e85aa946878fbbeab3fd',
    width: 468,
    height: 60,
    invokeUrl: 'https://www.highrevenueformat.com/616c66c90058e85aa946878fbbeab3fd/invoke.js'
  },
  banner_160x300: {
    key: '625f45dd465c24aa016b68d078dbb011',
    width: 160,
    height: 300,
    invokeUrl: 'https://www.highrevenueformat.com/625f45dd465c24aa016b68d078dbb011/invoke.js'
  },
  banner_320x50: {
    key: '30bff335532e94b027fb7c4db7b07d43',
    width: 320,
    height: 50,
    invokeUrl: 'https://www.highrevenueformat.com/30bff335532e94b027fb7c4db7b07d43/invoke.js'
  },
  banner_728x90: {
    key: 'ac21367c1f7b9127d8c07d21c9b04b89',
    width: 728,
    height: 90,
    invokeUrl: 'https://www.highrevenueformat.com/ac21367c1f7b9127d8c07d21c9b04b89/invoke.js'
  },
  banner_160x600: {
    key: '57e6a7dd6c805629441e9a3b0512e645',
    width: 160,
    height: 600,
    invokeUrl: 'https://www.highrevenueformat.com/57e6a7dd6c805629441e9a3b0512e645/invoke.js'
  },
  banner_300x250: {
    key: '2426537576803ba068d26c2c79fd4ecf',
    width: 300,
    height: 250,
    invokeUrl: 'https://www.highrevenueformat.com/2426537576803ba068d26c2c79fd4ecf/invoke.js'
  }
};

/**
 * AdsterraBannerComponent
 *
 * Usage:
 *   <app-adsterra-banner type="banner_728x90"></app-adsterra-banner>
 *   <app-adsterra-banner type="native"></app-adsterra-banner>
 *   <app-adsterra-banner type="banner_300x250"></app-adsterra-banner>
 */
@Component({
  selector: 'app-adsterra-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #adContainer class="adsterra-slot"></div>`,
  styles: [`
    .adsterra-slot {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
  `]
})
export class AdsterraBannerComponent implements AfterViewInit, OnDestroy {
  @Input() type: AdsterraBannerKey = 'banner_728x90';
  @ViewChild('adContainer', { static: true }) container!: ElementRef<HTMLDivElement>;

  private scriptEl?: HTMLScriptElement;
  private configScriptEl?: HTMLScriptElement;

  ngAfterViewInit(): void {
    this.inject();
  }

  ngOnDestroy(): void {
    this.configScriptEl?.remove();
    this.scriptEl?.remove();
  }

  private inject(): void {
    const def = ADSTERRA_BANNERS[this.type];
    if (!def) return;

    const container = this.container.nativeElement;

    if (this.type === 'native') {
      // Native Banner uses async invoke.js + a div container
      const div = document.createElement('div');
      div.id = `container-${def.key}`;
      container.appendChild(div);

      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = def.invokeUrl;
      container.appendChild(script);
      this.scriptEl = script;
    } else {
      // Standard banner: set atOptions then invoke
      const configScript = document.createElement('script');
      configScript.type = 'text/javascript';
      configScript.text = `
        atOptions = {
          'key': '${def.key}',
          'format': 'iframe',
          'height': ${def.height},
          'width': ${def.width},
          'params': {}
        };
      `;
      container.appendChild(configScript);
      this.configScriptEl = configScript;

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = def.invokeUrl;
      container.appendChild(invokeScript);
      this.scriptEl = invokeScript;
    }
  }
}
