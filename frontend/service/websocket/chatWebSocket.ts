import { WebSocketMessage, ChatWebSocketMessage } from '../../types/types';

export class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: number;
  private baseUrl: string;
  
  constructor(sessionId: number) {
    this.sessionId = sessionId;
    this.baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.baseUrl}/ws/chat/${this.sessionId}/`);
        
        this.ws.onopen = () => {
          resolve();
        };
        
        this.ws.onerror = (error) => {
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(callback: (message: ChatWebSocketMessage) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Factory function to create WebSocket service
export function createChatWebSocket(sessionId: number): ChatWebSocketService {
  return new ChatWebSocketService(sessionId);
}
