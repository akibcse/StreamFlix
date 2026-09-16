import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * AdTriggerService — single source of truth for triggering the 30-second ad modal.
 *
 * Any component (movie cards, hero buttons, etc.) can call triggerAd() to
 * request the visitor ad modal to open. The VisitorAdModalComponent subscribes
 * to this service and decides whether to actually show the ad (based on cooldown,
 * admin settings, etc.).
 */
@Injectable({ providedIn: 'root' })
export class AdTriggerService {
  /** Emits a void signal each time an ad should be triggered (movie click, etc.) */
  private readonly triggerSubject = new Subject<void>();

  /** Observable that components subscribe to for ad trigger events */
  readonly adTrigger$ = this.triggerSubject.asObservable();

  /**
   * Call this when a user clicks on any movie/TV card or play button.
   * The modal component will decide whether to show based on cooldown state.
   */
  triggerAd(): void {
    this.triggerSubject.next();
  }
}
