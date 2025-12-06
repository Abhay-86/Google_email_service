import axiosInstance from '../../utils/axiosInstance';
import {
  GmailConnectRequest,
  GmailConnectResponse,
  GmailCallbackResponse,
  SendEmailRequest,
  SendEmailResponse,
  ReadThreadQuery,
  ReadThreadResponse,
  SyncSingleThreadRequest,
  SyncSingleThreadResponse,
} from '../../types/types';

// Connect Gmail account
export async function connectGmail(payload: GmailConnectRequest): Promise<GmailConnectResponse> {
  const response = await axiosInstance.post("gmail/connect/", payload);
  return response.data;
}

// Handle Gmail OAuth callback
export async function handleGmailCallback(code: string, state: string): Promise<GmailCallbackResponse> {
  const response = await axiosInstance.get(`gmail/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  return response.data;
}

// Send email via Gmail
export async function sendEmail(payload: SendEmailRequest): Promise<SendEmailResponse> {
  const formData = new FormData();
  formData.append('from_email', payload.from_email);
  formData.append('to_email', payload.to_email);
  formData.append('subject', payload.subject);
  formData.append('body', payload.body);

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }

  const response = await axiosInstance.post("gmail/send/", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// Read Gmail thread
export async function readThread(query: ReadThreadQuery): Promise<ReadThreadResponse> {
  const params = new URLSearchParams({
    email: query.email,
    thread_id: query.thread_id,
  });
  const response = await axiosInstance.get(`gmail/thread/?${params.toString()}`);
  return response.data;
}

// Sync single Gmail thread
export async function syncSingleThread(payload: SyncSingleThreadRequest): Promise<SyncSingleThreadResponse> {
  const response = await axiosInstance.post("gmail/sync-thread/", payload);
  return response.data;
}