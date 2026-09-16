export type ChatSender = 'user' | 'admin';
export type ChatStatus = 'open' | 'closed';
export type ChatUserType = 'user' | 'guest';

export interface ChatMessage {
  id?: string;
  text: string;
  sender: ChatSender;
  timestamp: number;
}

export interface ChatSessionMeta {
  type: ChatUserType;
  uid?: string;          // logged-in users only
  displayName: string;
  email: string;
  phone?: string;        // guest users only
  status: ChatStatus;
  createdAt: number;
  lastMessageAt: number;
  unreadByAdmin: number;
  unreadByUser: number;
  adminOnline?: boolean;
}

export interface ChatSession {
  id: string;
  meta: ChatSessionMeta;
  messages?: Record<string, ChatMessage>;
}
