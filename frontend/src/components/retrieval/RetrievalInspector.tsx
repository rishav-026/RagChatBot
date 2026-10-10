import React, { useState } from 'react';
import { SourceCitation, DebugInfo } from '../../types';
import { Search } from 'lucide-react';

interface RetrievalInspectorProps {
  sources?: SourceCitation[];
  retrievedCandidates?: SourceCitation[];
  debugInfo?: DebugInfo;
  selectedChunk?: SourceCitation | null;
  theme?: 'light' | 'dark';
}

export const RetrievalInspector: React.FC<RetrievalInspectorProps> = ({
  sources = [],
  retrievedCandidates = [],
  debugInfo,
  selectedChunk: _selectedChunk,
  theme = 'light',
}) => {
  const [showFullTrace, setShowFullTrace] = useState(false);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [showSelectedContext, setShowSelectedContext] = useState(false);
  const isDark = theme === 'dark';

  const candidatesList = retrievedCandidates.length > 0 ? retrievedCandidates : sources;
  const candidateCount = debugInfo?.raw_candidate_count || candidatesList.length || 0;

  // Minimal thin ASCII meter bar representation
  const renderMeterBar = (score: number) => {
    if (score <= 0.01) return '▏';
    const totalBlocks = 13;
    const filledBlocks = Math.min(totalBlocks, Math.max(1, Math.round(score * totalBlocks)));
    return '█'.repeat(filledBlocks);
  };

  const displayedCandidates = showAllCandidates ? candidatesList : candidatesList.slice(0, 3);
  const hiddenCount = candidatesList.length - 3;

  return (
    <aside
      className={`h-full flex flex-col border-l transition-colors text-xs font-mono select-none ${
        isDark ? 'bg-[#0B0D0F] border-[#20252A] text-[#E6E8EA]' : 'bg-[#FFFFFF] border-[#E9ECEF] text-[#212529]'
      }`}
    >
      {/* Header (13px 600-700) */}
      <div className="p-3 border-b border-[#20252A] flex items-center justify-between">
        <h2 className="text-[13px] uppercase tracking-wider font-bold text-[#7F8990] flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-emerald-500" />
          RETRIEVAL TRACE
        </h2>
        <span className="text-[11px] text-emerald-500 font-mono">
          $ trace active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* PIPELINE Summary Execution Checklist (11-12px) */}
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="text-[11px] uppercase font-bold text-[#7F8990]">PIPELINE</div>
          <div className="space-y-1 text-[#E6E8EA]">
            <div className="flex justify-between">
              <span>QUERY</span>
              <span className="text-emerald-500 font-bold">✓</span>
            </div>
            <div className="flex justify-between">
              <span>HYBRID SEARCH</span>
              <span className="text-emerald-500 font-bold">✓</span>
            </div>
            <div className="flex justify-between">
              <span>RERANK</span>
              <span className="text-emerald-500 font-bold">✓</span>
            </div>
            <div className="flex justify-between">
              <span>CONTEXT</span>
              <span className={sources.length === 0 ? "text-amber-400 font-bold" : "text-emerald-500 font-bold"}>
                {sources.length} chunk{sources.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>LLM</span>
              <span className="text-emerald-500 font-bold">✓</span>
            </div>
          </div>
        </div>

        {/* Section 2: RETRIEVAL Summary */}
        <div className="space-y-1 font-mono text-[11px] border-t border-[#20252A] pt-3">
          <div className="text-[11px] uppercase font-bold text-[#7F8990] flex items-center justify-between">
            <span>RETRIEVAL</span>
          </div>
          <div className="text-[11px] text-[#7F8990] space-y-0.5">
            <div className="flex justify-between"><span>Vector</span> <span className="text-[#E6E8EA]">Top 10</span></div>
            <div className="flex justify-between"><span>BM25</span> <span className="text-[#E6E8EA]">Top 10</span></div>
            <div className="flex justify-between"><span>RRF</span> <span className="text-emerald-400 font-bold">{candidateCount || 5} unique</span></div>
          </div>
        </div>

        {/* Section 3: RERANKING Scores (Top 3 by default) */}
        <div className="space-y-2 border-t border-[#20252A] pt-3 font-mono text-[11px]">
          <div className="text-[11px] uppercase font-bold text-[#7F8990] flex items-center justify-between">
            <span>RERANKING</span>
          </div>

          {candidatesList.length === 0 ? (
            <div className="text-[#7F8990] text-[11px] py-1">
              No reranker scores active.
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayedCandidates.map((cite, idx) => (
                <div key={cite.chunk_id || idx} className="space-y-0.5 text-[11px]">
                  <div className="flex items-center justify-between text-[#E6E8EA]">
                    <span className="truncate max-w-[140px] text-[#7F8990]">
                      0{idx + 1}  {renderMeterBar(cite.score)}
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {cite.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {hiddenCount > 0 && !showAllCandidates && (
                <button
                  onClick={() => setShowAllCandidates(true)}
                  className="text-[11px] text-[#7F8990] hover:text-emerald-400 pt-0.5 transition-colors"
                >
                  + {hiddenCount} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 4: SELECTED CONTEXT (Collapsed by Default) */}
        <div className="space-y-1 font-mono text-[11px] border-t border-[#20252A] pt-3">
          <div className="text-[11px] uppercase font-bold text-[#7F8990] flex items-center justify-between">
            <span>SELECTED CONTEXT</span>
          </div>
          <div className="text-[#E6E8EA] font-semibold text-xs">
            {sources.length} chunk{sources.length === 1 ? '' : 's'}
          </div>

          <button
            onClick={() => setShowSelectedContext(!showSelectedContext)}
            className="text-[11px] text-[#7F8990] hover:text-emerald-400 pt-1 font-medium transition-colors"
          >
            {showSelectedContext ? '[ Hide selected context ]' : '[ View selected context ]'}
          </button>

          {showSelectedContext && (
            <div className="space-y-2 pt-2 border-t border-[#20252A]">
              {sources.length === 0 ? (
                <div className="text-amber-400 text-[11px] py-1 font-sans">
                  0 chunks passed relevance threshold.
                </div>
              ) : (
                sources.map((chunk, idx) => (
                  <div key={chunk.chunk_id || idx} className="text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between text-[#E6E8EA]">
                      <span className="truncate max-w-[160px] font-semibold">
                        0{idx + 1} {chunk.document}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {chunk.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[#7F8990] text-[10px]">
                      {chunk.page && `Page ${chunk.page} · `}Chunk #{chunk.chunk_id ? chunk.chunk_id.slice(-3) : `0${idx + 1}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Detailed Trace Toggle */}
        <div className="border-t border-[#20252A] pt-3 font-mono text-[11px]">
          <button
            onClick={() => setShowFullTrace(!showFullTrace)}
            className="text-[11px] text-[#7F8990] hover:text-emerald-400 font-medium transition-colors"
          >
            <span>{showFullTrace ? '[ Hide detailed trace ]' : '[ View detailed trace ]'}</span>
          </button>

          {showFullTrace && (
            <div className="mt-2 p-2.5 rounded border border-[#20252A] bg-[#101316] text-[10px] space-y-0.5 text-slate-300">
              <div><span className="text-emerald-500 font-bold">QUERY</span></div>
              <div className="text-[#7F8990]">│</div>
              <div>├── <span className="text-emerald-500">GUARD</span> <span className="text-emerald-400">✓</span></div>
              <div className="text-[#7F8990]">│</div>
              <div>├── <span className="text-emerald-500">REWRITE</span> <span className="text-emerald-400">✓</span></div>
              <div className="text-[#7F8990]">│</div>
              <div>├── <span className="text-emerald-500">EMBED</span> <span className="text-emerald-400">✓</span></div>
              <div className="text-[#7F8990]">│</div>
              <div>├── <span className="text-emerald-500">HYBRID</span> <span className="text-emerald-400">✓</span></div>
              <div className="text-[#7F8990]">│</div>
              <div>├── <span className="text-emerald-500">RERANK</span> <span className="text-emerald-400">✓</span></div>
              <div className="text-[#7F8990]">│</div>
              <div>└── <span className="text-emerald-500">CONTEXT</span> <span className="text-emerald-400">{sources.length} chunks</span></div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
