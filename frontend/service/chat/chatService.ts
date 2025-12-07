import axiosInstance from '../../utils/axiosInstance';
import {
  ChatRequest,
  StartChatRequest,
  StartChatResponse,
  SendMessageRequest,
  SendMessageResponse,
  ChatHistoryRequest,
  ChatHistoryResponse,
  SubmitChatRequest,
  SubmitChatResponse,
} from '../../types/types';

// Generic chat API function
export async function chatApi(payload: ChatRequest): Promise<any> {
  const response = await axiosInstance.post("chat/", payload);
  return response.data;
}

// Start new chat session
export async function startChat(payload: StartChatRequest): Promise<StartChatResponse> {
  const response = await axiosInstance.post("chat/", {
    action: "start",
    ...payload
  });
  return response.data;
}

// Send message in chat session
export async function sendMessage(payload: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await axiosInstance.post("chat/", {
    action: "message",
    ...payload
  });
  return response.data;
}

// Get chat history
export async function getChatHistory(payload: ChatHistoryRequest): Promise<ChatHistoryResponse> {
  const response = await axiosInstance.post("chat/", {
    action: "history",
    ...payload
  });
  return response.data;
}

// Submit and close chat session (returns email preview)
export async function submitChat(payload: SubmitChatRequest): Promise<SubmitChatResponse> {
  const response = await axiosInstance.post("chat/", {
    action: "submit",
    ...payload
  });
  return response.data;
}

// Confirm and finalize email template submission
export async function confirmSubmit(payload: { session_id: number; subject: string; body: string }): Promise<any> {
  const response = await axiosInstance.post("chat/", {
    action: "confirm",
    ...payload
  });
  return response.data;
}

// Get all chat sessions for a user
export async function getAllSessions(email: string): Promise<any[]> {
  const response = await axiosInstance.post("chat/", {
    action: "list",
    email: email
  });
  return response.data.sessions || [];
}

// Vendor and template related functions

export interface ChatVendor {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string;
}

export interface ChatVendorsResponse {
  vendors: ChatVendor[];
  total: number;
}

export interface EmailTemplate {
  id: number;
  subject: string;
  template_body: string;
  session_id: number;
  generated_at: string;
}

export interface UserTemplatesResponse {
  templates: EmailTemplate[];
  total: number;
}

// Get all vendors for chat/email sending
export async function getChatVendors(): Promise<ChatVendorsResponse> {
  const response = await axiosInstance.get("chat/vendors/");
  return response.data;
}

// Get user templates
export async function getUserTemplates(email: string): Promise<UserTemplatesResponse> {
  const response = await axiosInstance.get(`chat/user-templates/?email=${encodeURIComponent(email)}`);
  return response.data;
}

// Send template email to vendor
export async function sendTemplateEmail(data: {
  vendor_id: number;
  template_id: number;
  user_email: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await axiosInstance.post("chat/send-email/", data);
  return response.data;
}
