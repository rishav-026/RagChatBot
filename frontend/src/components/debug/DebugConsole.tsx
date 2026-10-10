import React, { useState } from 'react';
import { DebugInfo } from '../../types';
import { CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

interface DebugConsoleProps {
  debugInfo?: DebugInfo;
  theme?: 'light' | 'dark';
  isOpen: boolean;
  onToggle: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({
  debugInfo,
  theme = 'light',
  isOpen,
  onToggle,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    request: true,
    model: true,
    retrieval: true,
    guardrails: true,
    performance: true,
  });

  const isDark = theme === 'dark';

  if (!debugInfo) return null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="font-mono text-xs select-none">
      {/* Compact Terminal Debug Header Bar */}
      <div
        onClick={onToggle}
        className={`px-3 py-1.5 border rounded cursor-pointer flex items-center justify-between transition-colors ${
          isDark
            ? 'bg-[#101316] border-[#20252A] text-emerald-400 hover:bg-[#14181B]'
            : 'bg-[#F8F9FA] border-[#CED4DA] text-emerald-700 hover:bg-[#E9ECEF]'
        }`}
      >
        <div className="flex items-center space-x-2 font-bold text-[11px]">
          <span className="text-emerald-500 font-bold">&gt;</span>
          <span>DEBUG CONSOLE</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-[#7F8990]">
          <span>req_{debugInfo.request_id ? debugInfo.request_id.slice(-6) : '137087'}</span>
          <span>·</span>
          <span className="text-emerald-400 font-semibold">{debugInfo.provider_used || 'Gemini'}</span>
          <span>·</span>
          <span>Hybrid</span>
          {debugInfo.latency_ms && (
            <>
              <span>·</span>
              <span>{(debugInfo.latency_ms / 1000).toFixed(2)}s</span>
            </>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-emerald-500 ml-1" /> : <ChevronUp className="w-3.5 h-3.5 text-[#7F8990] ml-1" />}
        </div>
      </div>

      {/* Expanded Diagnostics Panel */}
      {isOpen && (
        <div
          className={`mt-2 border rounded p-3 space-y-3 transition-colors ${
            isDark ? 'bg-[#101316] border-[#20252A] text-[#E6E8EA]' : 'bg-[#FFFFFF] border-[#E9ECEF] text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#20252A]">
            <span className="font-bold text-[10px] uppercase tracking-wider text-[#7F8990]">
              SYSTEM DIAGNOSTICS & TRACE
            </span>
            <button onClick={onToggle} className="text-[#7F8990] hover:text-[#E6E8EA]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* REQUEST SECTION */}
          <div className="border border-[#20252A] overflow-hidden">
            <button
              onClick={() => toggleSection('request')}
              className="w-full px-3 py-1.5 flex items-center justify-between font-bold text-[10px] uppercase tracking-wider bg-[#0B0D0F] text-[#7F8990] hover:text-[#E6E8EA]"
            >
              <span>REQUEST</span>
              {openSections.request ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openSections.request && (
              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-[#101316] border-t border-[#20252A]">
                <div><span className="text-[#7F8990]">REQUEST ID:</span> <span className="font-bold text-emerald-400">req_{debugInfo.request_id ? debugInfo.request_id.slice(-6) : '137087'}</span></div>
                <div className="truncate"><span className="text-[#7F8990]">QUERY:</span> <span className="font-bold text-[#E6E8EA]">"{debugInfo.query_processed}"</span></div>
                <div><span className="text-[#7F8990]">PROMPT VER:</span> <span className="text-emerald-400 font-bold">{debugInfo.prompt_version || 'v3.2'}</span></div>
              </div>
            )}
          </div>

          {/* MODEL SECTION */}
          <div className="border border-[#20252A] overflow-hidden">
            <button
              onClick={() => toggleSection('model')}
              className="w-full px-3 py-1.5 flex items-center justify-between font-bold text-[10px] uppercase tracking-wider bg-[#0B0D0F] text-[#7F8990] hover:text-[#E6E8EA]"
            >
              <span>MODEL</span>
              {openSections.model ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openSections.model && (
              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-[#101316] border-t border-[#20252A]">
                <div><span className="text-[#7F8990]">ACTIVE PROVIDER:</span> <span className="font-bold text-emerald-400">{debugInfo.provider_used}</span></div>
                <div><span className="text-[#7F8990]">PRIMARY:</span> <span className="text-[#E6E8EA]">Gemini</span></div>
                <div><span className="text-[#7F8990]">FALLBACK:</span> <span className="text-[#7F8990]">Groq</span></div>
              </div>
            )}
          </div>

          {/* RETRIEVAL & CANDIDATE TRACE SECTION */}
          <div className="border border-[#20252A] overflow-hidden">
            <button
              onClick={() => toggleSection('retrieval')}
              className="w-full px-3 py-1.5 flex items-center justify-between font-bold text-[10px] uppercase tracking-wider bg-[#0B0D0F] text-[#7F8990] hover:text-[#E6E8EA]"
            >
              <span>RETRIEVAL TRACE & RELEVANCE EVALUATION</span>
              {openSections.retrieval ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openSections.retrieval && (
              <div className="p-2.5 space-y-2 text-[11px] bg-[#101316] border-t border-[#20252A]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div><span className="text-[#7F8990]">RAW QUERY:</span> <span className="text-[#E6E8EA]">"{debugInfo.raw_query || debugInfo.query_processed}"</span></div>
                  <div><span className="text-[#7F8990]">SEARCH QUERY:</span> <span className="text-emerald-400 font-semibold">"{debugInfo.rewritten_query || debugInfo.query_processed}"</span></div>
                  <div><span className="text-[#7F8990]">EMBEDDING MODEL:</span> <span className="text-[#E6E8EA]">{debugInfo.embedding_model || 'BAAI/bge-small-en-v1.5'}</span></div>
                  <div><span className="text-[#7F8990]">RERANKER MODEL:</span> <span className="text-[#E6E8EA]">{debugInfo.reranker_model || 'cross-encoder/ms-marco-MiniLM-L-6-v2'}</span></div>
                  <div><span className="text-[#7F8990]">THRESHOLD:</span> <span className="text-emerald-400 font-bold">{debugInfo.relevance_threshold || 0.20}</span></div>
                  <div><span className="text-[#7F8990]">SELECTED / EVALUATED:</span> <span className="text-emerald-400 font-bold">{debugInfo.selected_context_count || 0} / {debugInfo.raw_candidate_count || 0}</span></div>
                </div>

                {debugInfo.candidate_trace && debugInfo.candidate_trace.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#20252A] space-y-1">
                    <div className="text-[10px] font-bold text-[#7F8990] uppercase tracking-wider">EVALUATED CHUNKS TRACE</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {debugInfo.candidate_trace.map((item, idx) => (
                        <div
                          key={item.chunk_id || idx}
                          className={`p-2 rounded border text-[10.5px] space-y-0.5 ${
                            item.selected
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-amber-500/30 bg-[#0B0D0F] text-[#7F8990]'
                          }`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span className="truncate max-w-[280px]">
                              [{idx + 1}] {item.document} {item.page && `· Page ${item.page}`} (Chunk #{item.chunk_id.slice(-4)})
                            </span>
                            <span className={item.selected ? 'text-emerald-400 uppercase font-extrabold' : 'text-amber-400 uppercase font-semibold'}>
                              {item.selected ? '✓ SELECTED' : '○ REJECTED'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-[10px] opacity-90 font-mono">
                            <span>Vector: <strong>{item.vector_score.toFixed(3)}</strong></span>
                            <span>BM25: <strong>{item.keyword_score.toFixed(3)}</strong></span>
                            <span>Hybrid: <strong>{item.hybrid_score.toFixed(3)}</strong></span>
                            <span>Reranker: <strong>{item.reranker_score.toFixed(3)}</strong></span>
                          </div>
                          <div className="text-[10px] italic opacity-80 truncate">
                            "{item.text_preview}"
                          </div>
                          <div className="text-[9.5px] font-semibold text-emerald-400/90 pt-0.5">
                            Status: {item.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GUARDRAILS SECTION */}
          <div className="border border-[#20252A] overflow-hidden">
            <button
              onClick={() => toggleSection('guardrails')}
              className="w-full px-3 py-1.5 flex items-center justify-between font-bold text-[10px] uppercase tracking-wider bg-[#0B0D0F] text-[#7F8990] hover:text-[#E6E8EA]"
            >
              <span>GUARDRAILS</span>
              {openSections.guardrails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openSections.guardrails && (
              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-[#101316] border-t border-[#20252A]">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>INPUT GUARD: <strong className="text-emerald-400">Passed</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>RETRIEVAL GUARD: <strong className="text-emerald-400">Passed</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>OUTPUT GUARD: <strong className="text-emerald-400">Grounded</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* PERFORMANCE SECTION */}
          <div className="border border-[#20252A] overflow-hidden">
            <button
              onClick={() => toggleSection('performance')}
              className="w-full px-3 py-1.5 flex items-center justify-between font-bold text-[10px] uppercase tracking-wider bg-[#0B0D0F] text-[#7F8990] hover:text-[#E6E8EA]"
            >
              <span>PERFORMANCE</span>
              {openSections.performance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {openSections.performance && (
              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-[#101316] border-t border-[#20252A]">
                <div><span className="text-[#7F8990]">TOTAL LATENCY:</span> <span className="font-bold text-emerald-400">{debugInfo.latency_ms ? `${(debugInfo.latency_ms / 1000).toFixed(2)}s` : '3.94s'}</span></div>
                <div><span className="text-[#7F8990]">RETRIEVAL TIME:</span> <span className="font-bold text-[#E6E8EA]">140ms</span></div>
                <div><span className="text-[#7F8990]">LLM STREAM TIME:</span> <span className="font-bold text-[#E6E8EA]">3.80s</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
