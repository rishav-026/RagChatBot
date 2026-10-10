import React, { useState } from 'react';
import { SourceCitation } from '../types';
import { FileText, ChevronDown, ChevronUp, Bookmark, Cpu, Hash, AlignLeft } from 'lucide-react';

interface CitationCardProps {
  citations: SourceCitation[];
  theme?: 'light' | 'dark';
}

export const CitationCard: React.FC<CitationCardProps> = ({ citations, theme = 'light' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === 'dark';

  if (!citations || citations.length === 0) return null;

  return (
    <div
      className={`mt-3 rounded-xl border text-xs overflow-hidden transition-all ${
        isDark
          ? 'border-slate-800 bg-slate-900/80'
          : 'border-slate-200/90 bg-white shadow-2xs'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2 flex items-center justify-between font-semibold transition-colors ${
          isDark
            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
          <span>Verified Citations ({citations.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div
          className={`p-3 space-y-2.5 border-t ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/40'
          }`}
        >
          {citations.map((cite, idx) => (
            <div
              key={cite.chunk_id || idx}
              className={`p-3 rounded-xl border space-y-2 ${
                isDark
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className={`truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {cite.document}
                  </span>
                  {cite.page && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      Page {cite.page}
                    </span>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ml-2 ${
                    isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {(cite.score * 100).toFixed(1)}% Reranked
                </span>
              </div>

              {/* Score Breakdown Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {cite.vector_score !== undefined && (
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                      isDark
                        ? 'bg-slate-950 text-blue-300 border-blue-500/20'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    <Cpu className="w-2.5 h-2.5 text-blue-500" />
                    Vec: {(cite.vector_score * 100).toFixed(1)}%
                  </span>
                )}
                {cite.keyword_score !== undefined && (
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                      isDark
                        ? 'bg-slate-950 text-indigo-300 border-indigo-500/20'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5 text-indigo-500" />
                    BM25: {(cite.keyword_score * 100).toFixed(1)}%
                  </span>
                )}
                {cite.reranker_score !== undefined && (
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                      isDark
                        ? 'bg-slate-950 text-emerald-300 border-emerald-500/20'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <AlignLeft className="w-2.5 h-2.5 text-emerald-500" />
                    CrossEnc: {(cite.reranker_score * 100).toFixed(1)}%
                  </span>
                )}
              </div>

              {cite.snippet && (
                <p
                  className={`text-[11px] italic p-2 rounded-lg border leading-relaxed line-clamp-3 ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200/60 text-slate-600'
                  }`}
                >
                  "{cite.snippet}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
