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

// Submit and close chat session
export async function submitChat(payload: SubmitChatRequest): Promise<SubmitChatResponse> {
  const response = await axiosInstance.post("chat/", {
    action: "submit",
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
