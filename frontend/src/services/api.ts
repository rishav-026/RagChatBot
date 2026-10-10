import axios from 'axios';
import { DocumentItem, DocumentUploadResponse, ChatResponse, SourceCitation, SystemReadiness, ObservabilityMetrics } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface StreamCallbacks {
  onStart?: (data: { conversation_id: string }) => void;
  onSources?: (sources: SourceCitation[], retrievedCandidates?: SourceCitation[]) => void;
  onToken?: (token: string, provider?: string) => void;
  onCompletion?: (data: { answer: string; conversation_id: string; provider_used: string; latency_ms: number; debug_info?: any }) => void;
  onError?: (error: string) => void;
}

export const api = {
  async getReadiness(): Promise<SystemReadiness> {
    const response = await apiClient.get<SystemReadiness>('/ready');
    return response.data;
  },

  async getMetrics(): Promise<ObservabilityMetrics> {
    const response = await apiClient.get<ObservabilityMetrics>('/metrics');
    return response.data;
  },

  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<DocumentUploadResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async listDocuments(): Promise<DocumentItem[]> {
    const response = await apiClient.get<{ documents: DocumentItem[] }>('/documents');
    return response.data.documents;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  async sendChatMessage(message: string, conversationId?: string, debug: boolean = false): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/chat', {
      message,
      conversation_id: conversationId,
      debug,
    });
    return response.data;
  },

  async sendChatMessageStream(
    message: string,
    conversationId: string | undefined,
    debug: boolean,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          debug,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errJson.detail || 'Streaming request failed.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported by browser.');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing fragment

        for (const block of lines) {
          if (!block.trim()) continue;
          
          let eventType = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          }

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === 'start' && callbacks.onStart) {
              callbacks.onStart(parsed);
            } else if (eventType === 'sources' && callbacks.onSources) {
              callbacks.onSources(parsed.sources || [], parsed.retrieved_candidates || []);
            } else if (eventType === 'token' && callbacks.onToken) {
              callbacks.onToken(parsed.token || '', parsed.provider);
            } else if (eventType === 'completion' && callbacks.onCompletion) {
              callbacks.onCompletion(parsed);
            } else if (eventType === 'error' && callbacks.onError) {
              callbacks.onError(parsed.error || 'Unknown error occurred.');
            }
          } catch (e) {
            console.error('Failed to parse SSE JSON block:', dataStr, e);
          }
        }
      }
    } catch (err: any) {
      if (callbacks.onError) {
        callbacks.onError(err.message || 'Stream processing error.');
      }
    }
  },
};
