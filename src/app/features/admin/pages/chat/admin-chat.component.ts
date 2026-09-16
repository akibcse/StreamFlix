import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../../services/chat.service';
import { ChatSession, ChatMessage, ChatSessionMeta } from '../../../../models/chat.model';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>💬 Live Chat</h1>
          <p>Manage real-time conversations with users and guests.</p>
        </div>
        <div class="header-actions">
          <!-- Admin Online Toggle -->
          <div class="online-toggle" (click)="toggleAdminOnline()" [class.is-online]="adminOnline()">
            <span class="toggle-dot"></span>
            <span class="toggle-label">{{ adminOnline() ? 'You are Online' : 'Go Online' }}</span>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ openSessions().length }}</span>
          <span class="stat-lbl">Open Chats</span>
        </div>
        <div class="stat-card accent-red">
          <span class="stat-num">{{ totalUnread() }}</span>
          <span class="stat-lbl">Unread Messages</span>
        </div>
        <div class="stat-card accent-teal">
          <span class="stat-num">{{ closedSessions().length }}</span>
          <span class="stat-lbl">Closed Chats</span>
        </div>
        <div class="stat-card accent-amber">
          <span class="stat-num">{{ allSessions().length }}</span>
          <span class="stat-lbl">Total Sessions</span>
        </div>
      </div>

      <!-- Main Chat Layout -->
      <div class="chat-layout">
        <!-- Session List Sidebar -->
        <div class="session-list">
          <div class="sl-header">
            <h3>Conversations</h3>
            <div class="sl-tabs">
              <button
                class="sl-tab"
                [class.active]="activeTab() === 'open'"
                (click)="activeTab.set('open')"
              >Open ({{ openSessions().length }})</button>
              <button
                class="sl-tab"
                [class.active]="activeTab() === 'closed'"
                (click)="activeTab.set('closed')"
              >Closed ({{ closedSessions().length }})</button>
            </div>
          </div>

          <div class="sl-body">
            <div
              *ngFor="let s of filteredSessions()"
              class="session-item"
              [class.selected]="selectedSessionId() === s.id"
              [class.has-unread]="s.meta.unreadByAdmin > 0"
              (click)="selectSession(s)"
            >
              <div class="si-avatar" [class.guest]="s.meta.type === 'guest'">
                {{ getInitial(s.meta.displayName) }}
              </div>
              <div class="si-info">
                <div class="si-row1">
                  <span class="si-name">{{ s.meta.displayName }}</span>
                  <span class="si-time">{{ formatRelTime(s.meta.lastMessageAt) }}</span>
                </div>
                <div class="si-row2">
                  <span class="si-type" [class.guest-badge]="s.meta.type === 'guest'">
                    {{ s.meta.type === 'guest' ? '👤 Guest' : '🔐 User' }}
                  </span>
                  <span class="si-unread" *ngIf="s.meta.unreadByAdmin > 0">
                    {{ s.meta.unreadByAdmin }}
                  </span>
                </div>
              </div>
            </div>

            <div class="sl-empty" *ngIf="filteredSessions().length === 0">
              <span>{{ activeTab() === 'open' ? '🎉 No open chats right now!' : '📭 No closed chats.' }}</span>
            </div>
          </div>
        </div>

        <!-- Chat Thread Panel -->
        <div class="chat-thread" [class.has-session]="selectedSessionId()">
          <!-- No selection -->
          <div class="ct-empty" *ngIf="!selectedSessionId()">
            <div class="ct-empty-icon">💬</div>
            <p>Select a conversation to view messages</p>
          </div>

          <ng-container *ngIf="selectedSessionId() && selectedMeta()">
            <!-- Thread Header -->
            <div class="ct-header">
              <div class="ct-user-info">
                <div class="ct-avatar" [class.guest]="selectedMeta()!.type === 'guest'">
                  {{ getInitial(selectedMeta()!.displayName) }}
                </div>
                <div class="ct-meta">
                  <span class="ct-name">{{ selectedMeta()!.displayName }}</span>
                  <span class="ct-email">{{ selectedMeta()!.email }}</span>
                  <span class="ct-phone" *ngIf="selectedMeta()!.phone">📱 {{ selectedMeta()!.phone }}</span>
                </div>
              </div>
              <div class="ct-header-actions">
                <span class="ct-badge" [class.open-badge]="selectedMeta()!.status === 'open'" [class.closed-badge]="selectedMeta()!.status === 'closed'">
                  {{ selectedMeta()!.status === 'open' ? '🟢 Open' : '🔴 Closed' }}
                </span>
                <button
                  class="btn-close-session"
                  *ngIf="selectedMeta()!.status === 'open'"
                  (click)="closeSession()"
                  title="Close this chat session"
                >
                  ✕ Close Chat
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div class="ct-messages" id="admin-chat-messages">
              <div class="ct-msgs-inner">
                <div
                  *ngFor="let msg of currentMessages()"
                  class="msg-row"
                  [class.user-row]="msg.sender === 'user'"
                  [class.admin-row]="msg.sender === 'admin'"
                >
                  <div class="msg-bubble" [class.user-bbl]="msg.sender === 'user'" [class.admin-bbl]="msg.sender === 'admin'">
                    <span class="msg-sender-tag" *ngIf="msg.sender === 'admin'">You</span>
                    {{ msg.text }}
                    <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                </div>

                <div class="ct-empty-msgs" *ngIf="currentMessages().length === 0">
                  <span>No messages yet. Be the first to say hello! 👋</span>
                </div>
              </div>
            </div>

            <!-- Input Bar -->
            <div class="ct-input-bar" *ngIf="selectedMeta()!.status === 'open'">
              <textarea
                id="admin-chat-input"
                class="ct-textarea"
                [(ngModel)]="replyText"
                placeholder="Type a reply…"
                rows="1"
                (keydown.enter)="onEnterKey($event)"
                [disabled]="sending"
              ></textarea>
              <button
                class="ct-send"
                (click)="sendReply()"
                [disabled]="!replyText.trim() || sending"
                aria-label="Send reply"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            <div class="ct-closed-notice" *ngIf="selectedMeta()!.status === 'closed'">
              <span>This chat has been closed.</span>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 1.5rem; max-width: 1400px; }
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;
    }
    h1 { font-size: 1.5rem; font-weight: 800; color: #f0f6fc; margin: 0 0 0.25rem; }
    p { color: #64748b; margin: 0; font-size: 0.88rem; }
    .header-actions { display: flex; align-items: center; gap: 0.75rem; }

    /* Online Toggle */
    .online-toggle {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 100px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.83rem;
      font-weight: 600;
      color: #64748b;
    }
    .online-toggle:hover { border-color: rgba(74,222,128,0.4); }
    .online-toggle.is-online { background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.4); color: #4ade80; }
    .toggle-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #64748b; transition: background 0.2s;
    }
    .online-toggle.is-online .toggle-dot { background: #4ade80; animation: blink 1.5s ease-in-out infinite; }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem; margin-bottom: 1.5rem; }
    .stat-card {
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 1rem 1.2rem;
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .stat-card.accent-red { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.04); }
    .stat-card.accent-teal { border-color: rgba(20,184,166,0.2); background: rgba(20,184,166,0.04); }
    .stat-card.accent-amber { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.04); }
    .stat-num { font-size: 1.8rem; font-weight: 800; color: #f0f6fc; line-height: 1; }
    .stat-lbl { font-size: 0.78rem; color: #64748b; font-weight: 600; }
    @media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }

    /* Main Layout */
    .chat-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1rem;
      height: calc(100vh - 300px);
      min-height: 480px;
    }
    @media (max-width: 900px) { .chat-layout { grid-template-columns: 1fr; } }

    /* Session List */
    .session-list {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .sl-header { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
    .sl-header h3 { font-size: 0.9rem; font-weight: 700; color: #f0f6fc; margin: 0 0 0.75rem; }
    .sl-tabs { display: flex; gap: 0.4rem; }
    .sl-tab {
      flex: 1;
      padding: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sl-tab.active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
    .sl-body { flex: 1; overflow-y: auto; }

    .session-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.15s;
    }
    .session-item:hover { background: rgba(255,255,255,0.04); }
    .session-item.selected { background: rgba(99,102,241,0.12); }
    .session-item.has-unread { border-left: 3px solid #6366f1; }

    .si-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(99,102,241,0.2);
      border: 2px solid rgba(99,102,241,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.95rem; font-weight: 700; color: #a5b4fc;
      flex-shrink: 0;
    }
    .si-avatar.guest { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #fbbf24; }

    .si-info { flex: 1; min-width: 0; }
    .si-row1, .si-row2 { display: flex; justify-content: space-between; align-items: center; }
    .si-name { font-size: 0.84rem; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .si-time { font-size: 0.7rem; color: #4b5563; flex-shrink: 0; }
    .si-type { font-size: 0.69rem; color: #4b5563; }
    .si-type.guest-badge { color: #f59e0b; }
    .si-unread {
      background: #6366f1; color: white;
      font-size: 0.65rem; font-weight: 700;
      width: 18px; height: 18px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .sl-empty { padding: 2rem; text-align: center; color: #4b5563; font-size: 0.83rem; }

    /* Chat Thread */
    .chat-thread {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .ct-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 0.75rem;
      color: #4b5563; font-size: 0.88rem;
    }
    .ct-empty-icon { font-size: 3rem; }

    /* Thread Header */
    .ct-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0; gap: 0.75rem; flex-wrap: wrap;
    }
    .ct-user-info { display: flex; align-items: center; gap: 0.75rem; }
    .ct-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(99,102,241,0.2); border: 2px solid rgba(99,102,241,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700; color: #a5b4fc; flex-shrink: 0;
    }
    .ct-avatar.guest { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #fbbf24; }
    .ct-meta { display: flex; flex-direction: column; gap: 2px; }
    .ct-name { font-size: 0.9rem; font-weight: 700; color: #f0f6fc; }
    .ct-email { font-size: 0.75rem; color: #64748b; }
    .ct-phone { font-size: 0.75rem; color: #64748b; }
    .ct-header-actions { display: flex; align-items: center; gap: 0.75rem; }
    .ct-badge { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 100px; }
    .open-badge { background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
    .closed-badge { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
    .btn-close-session {
      padding: 0.4rem 0.9rem;
      font-size: 0.78rem; font-weight: 600;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      color: #f87171; border-radius: 8px; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-close-session:hover { background: rgba(239,68,68,0.2); }

    /* Messages */
    .ct-messages { flex: 1; overflow-y: auto; padding: 1.25rem; scrollbar-width: thin; }
    .ct-msgs-inner { display: flex; flex-direction: column; gap: 0.65rem; }
    .msg-row { display: flex; }
    .user-row { justify-content: flex-start; }
    .admin-row { justify-content: flex-end; }
    .msg-bubble {
      max-width: 75%; padding: 0.65rem 0.9rem;
      border-radius: 16px; font-size: 0.86rem; line-height: 1.5;
      word-break: break-word; position: relative; display: flex; flex-direction: column; gap: 2px;
    }
    .user-bbl {
      background: rgba(255,255,255,0.07);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.08);
      border-bottom-left-radius: 4px;
    }
    .admin-bbl {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .msg-sender-tag { font-size: 0.68rem; font-weight: 700; opacity: 0.75; text-align: right; }
    .msg-time { font-size: 0.65rem; opacity: 0.55; text-align: right; }
    .ct-empty-msgs { text-align: center; color: #4b5563; font-size: 0.83rem; padding: 2rem; }

    /* Input */
    .ct-input-bar {
      display: flex; align-items: flex-end; gap: 0.6rem;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.02);
      flex-shrink: 0;
    }
    .ct-textarea {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: #f0f6fc;
      font-size: 0.88rem; font-family: inherit;
      padding: 0.65rem 0.9rem;
      resize: none; outline: none; line-height: 1.5;
      max-height: 100px; overflow-y: auto;
      transition: border-color 0.2s;
    }
    .ct-textarea:focus { border-color: rgba(99,102,241,0.5); }
    .ct-textarea::placeholder { color: #4b5563; }
    .ct-send {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity 0.2s, transform 0.15s;
    }
    .ct-send:hover:not(:disabled) { opacity: 0.9; transform: scale(1.08); }
    .ct-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .ct-closed-notice {
      padding: 1rem; text-align: center;
      border-top: 1px solid rgba(255,255,255,0.07);
      color: #4b5563; font-size: 0.83rem;
    }
  `]
})
export class AdminChatComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly allSessions = signal<ChatSession[]>([]);
  readonly selectedSessionId = signal<string | null>(null);
  readonly selectedMeta = signal<ChatSessionMeta | null>(null);
  readonly currentMessages = signal<ChatMessage[]>([]);
  readonly adminOnline = signal<boolean>(false);
  readonly activeTab = signal<'open' | 'closed'>('open');

  readonly openSessions = computed(() => this.allSessions().filter(s => s.meta.status === 'open'));
  readonly closedSessions = computed(() => this.allSessions().filter(s => s.meta.status === 'closed'));
  readonly filteredSessions = computed(() =>
    this.activeTab() === 'open' ? this.openSessions() : this.closedSessions()
  );
  readonly totalUnread = computed(() =>
    this.openSessions().reduce((sum, s) => sum + (s.meta.unreadByAdmin ?? 0), 0)
  );

  replyText = '';
  sending = false;

  private subs: Subscription[] = [];
  private msgSub?: Subscription;
  private metaSub?: Subscription;

  ngOnInit(): void {
    // Load all sessions
    this.subs.push(
      this.chatService.getAllSessions$().subscribe(sessions => {
        this.allSessions.set(sessions);
        // Re-sync selected meta
        if (this.selectedSessionId()) {
          const found = sessions.find(s => s.id === this.selectedSessionId());
          if (found) this.selectedMeta.set(found.meta);
        }
      })
    );
    // Watch admin online status
    this.subs.push(
      this.chatService.getAdminOnline$().subscribe(v => this.adminOnline.set(v))
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.msgSub?.unsubscribe();
    this.metaSub?.unsubscribe();
  }

  selectSession(session: ChatSession): void {
    this.selectedSessionId.set(session.id);
    this.selectedMeta.set(session.meta);
    this.currentMessages.set([]);
    this.replyText = '';

    // Unsubscribe previous
    this.msgSub?.unsubscribe();
    this.metaSub?.unsubscribe();

    let prevUserMsgCount = 0;
    // Watch messages for this session
    this.msgSub = this.chatService.getMessages$(session.id).subscribe(msgs => {
      const userMsgs = msgs.filter(m => m.sender === 'user');
      // Fire browser notification for admin when user sends a new message
      if (userMsgs.length > prevUserMsgCount && prevUserMsgCount > 0) {
        const latest = userMsgs[userMsgs.length - 1];
        this.chatService.fireBrowserNotification(
          `💬 ${session.meta.displayName}`,
          latest.text,
          '/admin/chat'
        );
      }
      prevUserMsgCount = userMsgs.length;
      this.currentMessages.set(msgs);
      setTimeout(() => this.scrollToBottom(), 50);
    });

    // Watch meta
    this.metaSub = this.chatService.getSessionMeta$(session.id).subscribe(meta => {
      if (meta) this.selectedMeta.set(meta);
    });

    // Mark as read by admin
    this.chatService.markReadByAdmin(session.id);
  }

  async sendReply(): Promise<void> {
    const text = this.replyText.trim();
    const sessionId = this.selectedSessionId();
    const meta = this.selectedMeta();
    if (!text || !sessionId || !meta || this.sending) return;
    this.replyText = '';
    this.sending = true;
    try {
      // sendAdminReply triggers Firebase notification + browser push for the user
      await this.chatService.sendAdminReply(sessionId, text, meta);
      setTimeout(() => this.scrollToBottom(), 100);
    } finally {
      this.sending = false;
    }
  }

  async closeSession(): Promise<void> {
    const sessionId = this.selectedSessionId();
    if (!sessionId) return;
    await this.chatService.closeSession(sessionId);
  }

  async toggleAdminOnline(): Promise<void> {
    const next = !this.adminOnline();
    this.adminOnline.set(next);
    await this.chatService.setAdminOnline(next);
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) { ke.preventDefault(); this.sendReply(); }
  }

  getInitial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatRelTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  }

  private scrollToBottom(): void {
    const el = document.getElementById('admin-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }
}
