import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getDatabase, ref, get, remove } from 'firebase/database';
import { FirebaseService } from '../../../../services/firebase.service';
import { AdminMediaService } from '../../../../services/admin-media.service';
import { UserReview } from '../../../../models/media.model';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>User Reviews & Moderation</h1>
          <p>Review community ratings and comments across all media items, and moderate content.</p>
        </div>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>

      <div class="toolbar">
        <input
          type="text"
          placeholder="Filter reviews by comment or author..."
          [(ngModel)]="searchFilter"
          class="form-control"
        />
        <span class="count-badge">{{ filteredReviews.length }} Reviews Logged</span>
      </div>

      <div class="reviews-grid">
        <div *ngFor="let r of filteredReviews" class="review-card">
          <div class="card-header">
            <div class="user-meta">
              <span class="author-name">{{ r.userName }}</span>
              <span class="author-email">{{ r.userEmail }}</span>
            </div>
            <div class="rating-pill">⭐ {{ r.rating }}/10</div>
          </div>

          <p class="review-body">{{ r.content }}</p>

          <div class="card-footer">
            <span class="media-tag">{{ r.mediaType | uppercase }} #{{ r.mediaId }}</span>
            <span class="date-str">{{ r.createdAt | date:'mediumDate' }}</span>
            <button class="btn-delete" (click)="deleteReview(r)">Delete</button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredReviews.length === 0">
        <p>No user reviews to moderate at this time.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0.25rem 0 0; font-size: 0.9rem; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: white;
      outline: none;
      max-width: 320px;
    }
    .count-badge { color: #94a3b8; font-size: 0.85rem; }
    .reviews-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
    .review-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .user-meta { display: flex; flex-direction: column; }
    .author-name { font-weight: 700; color: white; font-size: 0.95rem; }
    .author-email { font-size: 0.75rem; color: #94a3b8; }
    .rating-pill { background: rgba(234, 179, 8, 0.15); color: #fbbf24; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; }
    .review-body { color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin: 0; flex: 1; }
    .card-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 0.75rem; font-size: 0.75rem; color: #64748b; }
    .media-tag { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; }
    .btn-delete { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 3px 8px; border-radius: 6px; cursor: pointer; }
    .alert-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 0.75rem; border-radius: 8px; }
    .empty-state { text-align: center; padding: 4rem; color: #64748b; }
  `]
})
export class AdminReviewsComponent implements OnInit {
  private readonly firebase = inject(FirebaseService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly adminMedia = inject(AdminMediaService);

  reviews: (UserReview & { id: string })[] = [];
  searchFilter = '';
  successMsg = '';

  get filteredReviews(): (UserReview & { id: string })[] {
    if (!this.searchFilter.trim()) return this.reviews;
    const q = this.searchFilter.toLowerCase();
    return this.reviews.filter(r => r.content.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q));
  }

  ngOnInit(): void {
    this.loadReviews();
  }

  async loadReviews(): Promise<void> {
    const snap = await get(ref(this.firebase.db, 'media_reviews'));
    if (!snap.exists()) return;
    const all: (UserReview & { id: string })[] = [];
    Object.entries(snap.val() as Record<string, Record<string, UserReview>>).forEach(([mediaId, revMap]) => {
      Object.entries(revMap).forEach(([id, r]) => {
        all.push({ ...r, id, mediaId: Number(mediaId) });
      });
    });
    all.sort((a, b) => b.createdAt - a.createdAt);
    this.reviews = all;
    this.cdr.detectChanges();
  }

  async deleteReview(r: UserReview & { id: string }): Promise<void> {
    if (!confirm('Permanently remove this review?')) return;
    await remove(ref(this.firebase.db, `media_reviews/${r.mediaId}/${r.id}`));
    this.reviews = this.reviews.filter(item => item.id !== r.id);
    await this.adminMedia.logAction('delete_review', `${r.mediaType}:${r.mediaId}`, `By: ${r.userEmail || r.userName}`);
    this.successMsg = 'Review deleted successfully.';
    this.cdr.detectChanges();
    setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
  }
}
