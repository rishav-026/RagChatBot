import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, SourceCitation, DebugInfo, SystemReadiness } from '../../types';
import { api } from '../../services/api';
import { ArrowUp, Loader2, Bookmark, ShieldAlert, FileText, Info, X, AlertTriangle } from 'lucide-react';

interface ConversationWorkspaceProps {
  debugMode: boolean;
  onSourcesUpdate?: (sources: SourceCitation[]) => void;
  onRetrievedCandidatesUpdate?: (candidates: SourceCitation[]) => void;
  onDebugInfoUpdate?: (info: DebugInfo | undefined) => void;
  onSelectChunkForInspector?: (citation: SourceCitation) => void;
  readiness?: SystemReadiness | null;
  documentCount?: number;
  totalChunks?: number;
  theme?: 'light' | 'dark';
}

export const ConversationWorkspace: React.FC<ConversationWorkspaceProps> = ({
  debugMode,
  onSourcesUpdate,
  onRetrievedCandidatesUpdate,
  onDebugInfoUpdate,
  onSelectChunkForInspector,
  readiness,
  documentCount: _documentCount = 0,
  totalChunks: _totalChunks = 0,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'RAGWORKS Knowledge Workbench v3.2 initialized. Ready for technical queries grounded in your ingested documents.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Active side drawer citation
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);

  // Expanded trace state (msgId -> boolean)
  const [openExecutionTrace, setOpenExecutionTrace] = useState<Record<string, boolean>>({});

  // Expanded sources state (msgId -> boolean)
  const [showAllSources, setShowAllSources] = useState<Record<string, boolean>>({});

  // Expanded historical query state (msgId -> boolean)
  const [expandedHistoryMsgId, setExpandedHistoryMsgId] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleExecutionTrace = (msgId: string) => {
    setOpenExecutionTrace((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleShowAllSources = (msgId: string) => {
    setShowAllSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleHistoryMsg = (msgId: string) => {
    setExpandedHistoryMsgId((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

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
    let currentProvider = readiness?.primary_llm || 'Gemini';

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
        onSources: (sources, retrievedCandidates) => {
          currentSources = sources;
          if (onSourcesUpdate) onSourcesUpdate(sources);
          if (onRetrievedCandidatesUpdate && retrievedCandidates) onRetrievedCandidatesUpdate(retrievedCandidates);
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
                    text: `Security Alert / Guardrail Block: ${errMessage}`,
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

  const isFallbackUsed = (provider?: string) => {
    if (!provider) return false;
    return provider.toLowerCase().includes('groq') || provider.toLowerCase().includes('qwen');
  };

  // Find index of last assistant message to determine which messages to collapse
  const lastAssistantIdx = messages.map(m => m.sender).lastIndexOf('assistant');

  return (
    <div
      className={`h-full flex flex-col transition-colors relative select-none ${
        isDark ? 'bg-[#0B0D0F] text-[#E7ECEF]' : 'bg-[#FFFFFF] text-[#212529]'
      }`}
    >
      {/* Top Session Metadata Bar — ONE Compact Line (12-13px bold header, 11-12px metadata) */}
      <div
        className={`px-4 py-2 border-b font-mono text-[11px] flex items-center justify-between gap-2 ${
          isDark ? 'border-[#20252A] bg-[#101316] text-[#7F8990]' : 'border-[#E9ECEF] bg-[#F8F9FA] text-slate-600'
        }`}
      >
        <div className="flex items-center space-x-2 truncate">
          <span className="font-bold text-[13px] text-emerald-500 uppercase tracking-wider">RAG SESSION</span>
          <span>·</span>
          <span>Knowledge: <strong className="text-[#E6E8EA]">All Documents</strong></span>
          <span>·</span>
          <span className="text-emerald-500 font-semibold">Grounded</span>
          <span>·</span>
          <span>Hybrid</span>
          <span>·</span>
          <span className="text-emerald-500">Reranker On</span>
          <span>·</span>
          <strong className="text-[#E6E8EA] font-semibold">{readiness?.primary_llm || 'Gemini'}</strong>
        </div>
      </div>

      {/* Messages Thread Container (Generous Whitespace, Constrained Answer Width max-w-[780px]) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="max-w-[780px] w-full mx-auto space-y-8">
          {messages.map((msg, idx) => {
            const isHistorical = idx < lastAssistantIdx - 1;
            const isCollapsedHistory = isHistorical && !expandedHistoryMsgId[msg.id];

            if (isCollapsedHistory && msg.sender === 'user') {
              return (
                <div
                  key={msg.id}
                  onClick={() => toggleHistoryMsg(msg.id)}
                  className="font-mono text-xs text-[#7F8990] hover:text-[#E6E8EA] cursor-pointer flex items-center space-x-2 py-1 transition-colors border-b border-[#20252A]/40"
                >
                  <span className="text-emerald-500 font-bold">&gt;</span>
                  <span className="truncate">{msg.text}</span>
                  <span className="text-[11px] text-emerald-500/80 font-semibold">✓ Grounded</span>
                </div>
              );
            }

            if (isCollapsedHistory && msg.sender === 'assistant') {
              return null; // Grouped with previous query row
            }

            return (
              <div key={msg.id} className="space-y-4">
                {msg.sender === 'user' ? (
                  /* Query Display: QUERY label (11px muted), Query text (16px font-600) */
                  <div className="font-mono text-xs space-y-1">
                    <div className="text-[11px] uppercase font-bold text-[#7F8990] tracking-wider mb-0.5">QUERY</div>
                    <div className="flex items-start space-x-2 text-[#E6E8EA] font-semibold text-[16px]">
                      <span className="text-emerald-500 font-bold">&gt;</span>
                      <span>{msg.text}</span>
                    </div>
                  </div>
                ) : (
                  /* Researched Answer Flat Section (Constrained max-w-[780px], font-size 16.5px, line-height 1.65) */
                  <div className="space-y-4 font-sans">
                    {/* Clean Answer Header Bar (Header 13px bold, Metadata 11-12px muted) */}
                    <div className="flex items-center justify-between border-b pb-2 border-[#20252A] font-mono text-[11px]">
                      <span className="font-bold tracking-wider uppercase text-emerald-500 flex items-center gap-1.5 text-[13px]">
                        {msg.error ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {msg.error ? 'SYSTEM GUARDRAIL BLOCK' : 'RESEARCHED ANSWER'}
                      </span>

                      {msg.provider_used && (
                        <div className="flex items-center space-x-2 text-[11px]">
                          {isFallbackUsed(msg.provider_used) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                              Fallback Active
                            </span>
                          )}
                          <span className="text-[#7F8990] font-mono">
                            {msg.provider_used} {msg.latency_ms && `· ${(msg.latency_ms / 1000).toFixed(2)}s`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* NO RELEVANT CONTEXT State */}
                    {msg.text.includes("couldn't find enough information") || msg.text.includes("NO RELEVANT CONTEXT") ? (
                      <div className="p-4 rounded border border-amber-500/40 bg-[#14181B] text-amber-300 font-mono text-xs space-y-2">
                        <div className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          NO RELEVANT CONTEXT FOUND
                        </div>
                        <p className="font-sans text-sm text-[#E6E8EA] leading-relaxed">
                          No sufficiently relevant information was found in the indexed knowledge base to answer this question.
                        </p>
                        <div className="text-[11px] text-amber-400/80 pt-1 flex items-center space-x-4 border-t border-amber-500/20">
                          <span>Retrieved candidates: <strong>{msg.debug_info?.raw_candidate_count || 5}</strong></span>
                          <span>Selected context: <strong>0 chunks</strong></span>
                          <span>Grounded sources: <strong>0</strong></span>
                        </div>
                      </div>
                    ) : (
                      /* Main Legible Answer Body (16px, 1.6 line-height, Inter font-sans with ReactMarkdown) */
                      <div className="text-[16px] leading-[1.6] text-[#E6E8EA] font-sans">
                        <ReactMarkdown
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-[18px] font-bold text-[#E6E8EA] mt-4 mb-2" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-[17px] font-bold text-[#E6E8EA] mt-4 mb-2" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-[16px] font-bold text-[#E6E8EA] mt-3 mb-1.5" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-[1.6]" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1.5 my-2 text-[#E6E8EA]" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1.5 my-2 text-[#E6E8EA]" {...props} />,
                            li: ({ node, ...props }) => <li className="leading-[1.6]" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                            em: ({ node, ...props }) => <em className="italic text-[#E6E8EA]" {...props} />,
                            code: ({ node, inline, className, children, ...props }: any) => {
                              if (inline) {
                                return (
                                  <code className="font-mono bg-[#101316] border border-[#20252A] px-1.5 py-0.5 rounded text-[13px] text-emerald-400 font-semibold" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <pre className="font-mono bg-[#0B0D0F] border border-[#20252A] p-3 rounded text-[13px] text-emerald-300 overflow-x-auto my-3 leading-relaxed">
                                  <code {...props}>{children}</code>
                                </pre>
                              );
                            },
                            pre: ({ node, ...props }) => <div className="my-2">{props.children}</div>,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                        {msg.isStreaming && !msg.text && (
                          <span className="inline-flex items-center gap-1.5 font-mono text-emerald-500 text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ● Generating answer...
                          </span>
                        )}
                      </div>
                    )}

                    {/* Sources List (Filename 13px 600, Metadata 11-12px muted, Score 11-12px 600) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#20252A] font-mono text-xs space-y-2">
                        <div className="font-bold text-[#7F8990] uppercase tracking-wider text-[13px] flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                            <span>SOURCES · {msg.sources.length}</span>
                          </span>
                        </div>

                        <div className="space-y-1 divide-y divide-[#20252A]">
                          {(showAllSources[msg.id] ? msg.sources : msg.sources.slice(0, 3)).map((src, srcIdx) => (
                            <div
                              key={src.chunk_id || srcIdx}
                              onClick={() => {
                                setActiveCitation(src);
                                if (onSelectChunkForInspector) onSelectChunkForInspector(src);
                              }}
                              className="pt-2 first:pt-0 flex items-center justify-between text-xs cursor-pointer hover:text-emerald-400 transition-colors group"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span className="text-emerald-500 font-bold text-[11px]">0{srcIdx + 1}</span>
                                <FileText className="w-3.5 h-3.5 text-[#7F8990] group-hover:text-emerald-500 shrink-0" />
                                <span className="truncate font-semibold text-[13px] text-[#E6E8EA] group-hover:text-emerald-400">{src.document}</span>
                                {src.page && <span className="text-[#7F8990] text-[11px]">· Page {src.page}</span>}
                                <span className="text-[#7F8990] text-[11px]">· Chunk #{src.chunk_id ? src.chunk_id.slice(-3) : `0${srcIdx + 1}`}</span>
                              </div>

                              <span className="text-emerald-500 font-semibold font-mono text-[12px] shrink-0 ml-2">
                                {src.score.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {msg.sources.length > 3 && (
                          <button
                            onClick={() => toggleShowAllSources(msg.id)}
                            className="text-[11px] text-[#7F8990] hover:text-emerald-400 transition-colors font-mono pt-1"
                          >
                            {showAllSources[msg.id] ? '[ Show less ]' : `+ ${msg.sources.length - 3} more sources`}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Single Compact Summary Line Replacing Huge Inline Log Block */}
                    {!msg.isStreaming && !msg.error && (
                      <div className="pt-2 font-mono text-xs flex items-center justify-between text-[#7F8990] border-t border-[#20252A]/40">
                        <div className="flex items-center space-x-2 text-[11px]">
                          {msg.sources && msg.sources.length > 0 ? (
                            <span className="text-emerald-500 font-bold">✓ Grounded</span>
                          ) : (
                            <span className="text-amber-400 font-bold">○ Not grounded</span>
                          )}
                          <span>·</span>
                          <span>Hybrid Retrieval</span>
                          <span>·</span>
                          <span>{msg.sources?.length || 0} source{msg.sources?.length === 1 ? '' : 's'}</span>
                          {msg.latency_ms && (
                            <>
                              <span>·</span>
                              <span>{(msg.latency_ms / 1000).toFixed(2)}s</span>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => toggleExecutionTrace(msg.id)}
                          className="text-[11px] text-[#7F8990] hover:text-emerald-400 font-medium flex items-center space-x-1 transition-colors"
                        >
                          <Info className="w-3 h-3 text-emerald-500" />
                          <span>{openExecutionTrace[msg.id] ? '[ Hide trace ]' : '[ View trace ]'}</span>
                        </button>
                      </div>
                    )}

                    {/* Expandable Trace Details Drawer when [ View trace ] is clicked */}
                    {openExecutionTrace[msg.id] && (
                      <div className="p-3 rounded border border-[#20252A] bg-[#0B0D0F] font-mono text-[10px] space-y-2 text-[#E6E8EA]">
                        <div className="font-bold text-[#7F8990] border-b border-[#20252A] pb-1 uppercase tracking-wider">
                          EXECUTION TRACE
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                          <div>GUARD <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>REWRITE <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>EMBED <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>VECTOR <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>BM25 <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>RRF <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>RERANK <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>FILTER <span className="text-emerald-500 font-bold">✓</span></div>
                          <div>CONTEXT <span className="text-emerald-500 font-bold">{msg.sources?.length || 0} chunk{(msg.sources?.length || 0) === 1 ? '' : 's'}</span></div>
                          <div>LLM <span className="text-emerald-500 font-bold">✓</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Source Citation Side Drawer */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-2xs font-mono">
          <div className="w-full max-w-md h-full border-l border-[#20252A] bg-[#101316] text-[#E6E8EA] p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#20252A] pb-3 text-xs font-bold">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-emerald-500" />
                <span>SOURCE PREVIEW</span>
              </div>
              <button onClick={() => setActiveCitation(null)} className="p-1 text-[#7F8990] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 border border-[#20252A] bg-[#0B0D0F] rounded">
                <div className="text-[10px] text-[#7F8990] uppercase font-bold">DOCUMENT</div>
                <div className="font-bold text-emerald-400 mt-0.5">{activeCitation.document}</div>
                {activeCitation.page && <div className="text-[10px] text-[#7F8990] mt-1">PAGE {activeCitation.page}</div>}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2.5 border border-[#20252A] bg-[#0B0D0F] rounded">
                  <div className="text-[#7F8990]">RERANKER SCORE</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{activeCitation.score.toFixed(3)}</div>
                </div>
                <div className="p-2.5 border border-[#20252A] bg-[#0B0D0F] rounded">
                  <div className="text-[#7F8990]">CHUNK ID</div>
                  <div className="text-xs font-bold truncate mt-0.5">{activeCitation.chunk_id || 'N/A'}</div>
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <div className="font-mono text-[10px] text-[#7F8990] uppercase font-bold">ACTUAL CHUNK TEXT</div>
                <div className="p-3 border border-[#20252A] bg-[#0B0D0F] rounded text-xs leading-relaxed text-[#E6E8EA] italic">
                  "{activeCitation.snippet || 'No snippet preview provided.'}"
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Input Bar Footer (rag> 14px bold emerald, input 13px) */}
      <div
        className={`p-3.5 border-t transition-colors ${
          isDark ? 'border-[#20252A] bg-[#101316]' : 'border-[#E9ECEF] bg-[#F8F9FA]'
        }`}
      >
        <div className="max-w-[780px] w-full mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-3 font-mono text-emerald-500 font-bold text-[14px] flex items-center space-x-1 select-none pointer-events-none">
              <span>rag&gt;</span>
              {isFocused && <span className="w-1.5 h-4 bg-emerald-500 inline-block animate-term-blink ml-0.5" />}
            </div>

            <input
              type="text"
              value={input}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your knowledge base... (e.g. 'What is RCA?')"
              disabled={isLoading}
              className={`w-full rounded border pl-16 pr-10 py-2.5 text-[13px] font-mono transition-colors focus:outline-none ${
                isDark
                  ? 'bg-[#0B0D0F] border-[#20252A] text-[#E6E8EA] placeholder-[#7F8990] focus:border-emerald-500'
                  : 'bg-white border-[#CED4DA] text-slate-900 placeholder-slate-400 focus:border-emerald-600'
              } disabled:opacity-50`}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#20252A] text-white transition-colors disabled:text-[#7F8990]"
            >
              <ArrowUp className="w-3.5 h-3.5 font-bold" />
            </button>
          </form>

          {isLoading && (
            <div className="mt-2 flex items-center space-x-1 font-mono text-[11px] text-emerald-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-emerald" />
              <span>● Executing query...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
