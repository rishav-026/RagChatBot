import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SourceCitation, DebugInfo } from '../types';
import { api } from '../services/api';
import { CitationCard } from './CitationCard';
import { DebugPanel } from './DebugPanel';
import { Send, Bot, User, Loader2, Clock, RotateCcw, Cpu, ShieldAlert, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  debugMode: boolean;
  onSourcesUpdate?: (sources: SourceCitation[]) => void;
  onDebugInfoUpdate?: (info: DebugInfo | undefined) => void;
  theme?: 'light' | 'dark';
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  debugMode,
  onSourcesUpdate,
  onDebugInfoUpdate,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your Enterprise RAG Copilot. Ask any question grounded in your ingested documents.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    let currentAnswer = '';
    let currentSources: SourceCitation[] = [];
    let currentProvider = 'Gemini 3.5 Flash';

    await api.sendChatMessageStream(
      query,
      conversationId,
      debugMode,
      {
        onStart: (data) => {
          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }
        },
        onSources: (sources) => {
          currentSources = sources;
          if (onSourcesUpdate) onSourcesUpdate(sources);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, sources: currentSources } : msg
            )
          );
        },
        onToken: (token, provider) => {
          currentAnswer += token;
          if (provider) currentProvider = provider;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    text: currentAnswer,
                    provider_used: currentProvider,
                  }
                : msg
            )
          );
        },
        onCompletion: (completionData) => {
          if (onDebugInfoUpdate && completionData.debug_info) {
            onDebugInfoUpdate(completionData.debug_info);
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    text: completionData.answer || currentAnswer,
                    provider_used: completionData.provider_used || currentProvider,
                    latency_ms: completionData.latency_ms,
                    debug_info: completionData.debug_info,
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsLoading(false);
        },
        onError: (errMessage) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    text: `Security Alert / Error: ${errMessage}`,
                    error: true,
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsLoading(false);
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleRetry = (lastUserQuery: string) => {
    handleSend(lastUserQuery);
  };

  const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user')?.text;

  return (
    <div
      className={`border rounded-2xl flex flex-col h-full min-h-[500px] max-h-[560px] transition-all duration-200 overflow-hidden ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 shadow-md'
          : 'bg-white border-slate-200/80 shadow-sm shadow-slate-200/50'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark
            ? 'bg-slate-900 border-slate-800'
            : 'bg-slate-50/70 border-slate-200/80'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Grounded AI Assistant
            </h3>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Strict Vector Grounding & Anti-Hallucination Guardrails
            </p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : msg.error
                  ? isDark
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-red-100 text-red-600 border border-red-200'
                  : isDark
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}
            >
              {msg.sender === 'user' ? (
                <User className="w-4 h-4" />
              ) : msg.error ? (
                <ShieldAlert className="w-4 h-4 text-red-500" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs shadow-sm shadow-indigo-500/20 font-medium'
                  : msg.error
                  ? isDark
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-xs'
                    : 'bg-red-50 border border-red-200 text-red-800 rounded-tl-xs'
                  : isDark
                  ? 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-xs'
                  : 'bg-slate-100/80 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
              }`}
            >
              <div className="whitespace-pre-wrap font-normal">
                {msg.text}
                {msg.isStreaming && !msg.text && (
                  <span className={`inline-flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    Searching knowledge base & generating response...
                  </span>
                )}
              </div>

              {/* Citations in message feed if any */}
              {msg.sources && msg.sources.length > 0 && (
                <CitationCard citations={msg.sources} theme={theme} />
              )}

              {/* Debug Panel if debugMode enabled */}
              {debugMode && msg.debug_info && (
                <DebugPanel debugInfo={msg.debug_info} theme={theme} />
              )}

              {/* Footer metadata */}
              {msg.sender === 'assistant' && (msg.provider_used || msg.latency_ms) && (
                <div
                  className={`mt-2.5 flex items-center justify-between text-[10px] pt-1.5 border-t ${
                    isDark
                      ? 'border-slate-700/40 text-slate-400'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {msg.provider_used && (
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1 border ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-indigo-300'
                          : 'bg-white border-slate-200 text-indigo-700 shadow-2xs'
                      }`}
                    >
                      <Cpu className="w-3 h-3 text-indigo-500" />
                      {msg.provider_used}
                    </span>
                  )}
                  {msg.latency_ms && (
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {msg.latency_ms.toFixed(0)}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input container */}
      <div
        className={`p-3.5 border-t transition-all ${
          isDark
            ? 'border-slate-800 bg-slate-900/90'
            : 'border-slate-200/80 bg-slate-50/50'
        }`}
      >
        {messages.some((m) => m.error) && lastUserMessage && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs mb-2">
            <span className="text-red-500 text-[11px] font-medium">Network or Guardrail alert.</span>
            <button
              onClick={() => handleRetry(lastUserMessage)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 hover:bg-red-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Retry Query
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className={`w-full rounded-xl pl-4 pr-12 py-3 text-xs font-normal transition-all focus:outline-none ${
              isDark
                ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
                : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
            } disabled:opacity-50`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-lg transition-all shadow-xs disabled:text-slate-400 disabled:shadow-none"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
