// Gmail API Types
export interface GmailConnectRequest {
  email: string;
}

export interface GmailConnectResponse {
  connected: boolean;
  email?: string;
  auth_url?: string;
  message: string;
}

export interface GmailCallbackResponse {
  success: boolean;
  email: string;
  access_token?: string;
}

export interface SendEmailRequest {
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  attachments?: File[];
}

export interface SendEmailResponse {
  thread_id: string;
  message_id: string;
  status?: string;
}

export interface ReadThreadQuery {
  email: string;
  thread_id: string;
}

export interface EmailMessage {
  message_id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  timestamp: string;
  subject?: string;
  body?: string;
  from?: string;
  to?: string;
  cc?: string[];
  bcc?: string[];
}

export interface ReadThreadResponse {
  messages: EmailMessage[];
}

export interface SyncSingleThreadRequest {
  email: string;
  thread_id: string;
}

export interface SyncSingleThreadResponse {
  thread_id: string;
  new_messages_added: number;
  status: string;
}

// Common API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: any;
}

// Gmail Account Types
export interface GmailAccount {
  id: string;
  email: string;
  is_connected: boolean;
  last_sync?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailThread {
  id: string;
  thread_id: string;
  gmail_account: string;
  recipient_email: string | null;
  created_at: string;
  updated_at: string;
  messages?: EmailMessage[];
}

// Chat API Types
export interface ChatRequest {
  action: 'start' | 'message' | 'history' | 'submit';
  email?: string;
  session_id?: number;
  message?: string;
}

export interface StartChatRequest {
  email: string;
}

export interface StartChatResponse {
  session_id: number;
  title: string;
  message: string;
}

export interface SendMessageRequest {
  session_id: number;
  message: string;
}

export interface SendMessageResponse {
  assistant_reply: string;
  draft_json: any;
  missing_fields: string[];
  provider: string;
}

export interface ChatHistoryRequest {
  session_id: number;
}

export interface ChatMessage {
  id?: string | number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: number;
  title: string;
  messages: ChatMessage[];
  draft_json: any;
  is_closed: boolean;
  is_submitted: boolean;
  created_at: string;
}

export interface SubmitChatRequest {
  session_id: number;
}

export interface SubmitChatResponse {
  status: string;
  message: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface ChatWebSocketMessage {
  message: any;
}

// Vendor API Types
export interface VendorCreateRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
}

export interface VendorUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
}

export interface Vendor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}