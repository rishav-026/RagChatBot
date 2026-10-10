import React from 'react';
import { X, CheckCircle } from 'lucide-react';

interface EvaluationViewProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({ isOpen, onClose, theme = 'light' }) => {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs font-mono">
      <div
        className={`w-full max-w-2xl border rounded transition-colors ${
          isDark ? 'bg-[#101316] border-[#252A2E] text-[#E7ECEF]' : 'bg-[#FFFFFF] border-[#E9ECEF] text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#252A2E] flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-500 font-bold">$</span>
            <span>RAG EVALUATION SUITE</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          <div className="p-2.5 bg-[#0B0D0F] border border-[#252A2E] rounded text-emerald-500 font-bold text-xs">
            $ rag eval --suite pipeline-validation
          </div>

          <div className="p-4 border border-[#252A2E] bg-[#0B0D0F] rounded space-y-4">
            {/* RETRIEVAL */}
            <div className="space-y-1.5">
              <div className="text-slate-400 uppercase font-bold text-[10px] flex items-center justify-between">
                <span>RETRIEVAL ENGINE</span>
                <span className="text-emerald-500 font-bold">PASS ✓</span>
              </div>
              <div className="pl-3 space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Vector Search (BAAI/bge-small-en-v1.5 384-d)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>BM25 Keyword Matching (Full-Text Punctuation Cleaned)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Hybrid Score Fusion (Vector 0.6 + Keyword 0.4)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cross-Encoder Reranker (ms-marco-MiniLM-L-6-v2)</span>
                </div>
              </div>
            </div>

            {/* GROUNDING */}
            <div className="space-y-1.5 border-t border-[#252A2E] pt-3">
              <div className="text-slate-400 uppercase font-bold text-[10px] flex items-center justify-between">
                <span>GROUNDING & FAITHFULNESS</span>
                <span className="text-emerald-500 font-bold">PASS ✓</span>
              </div>
              <div className="pl-3 space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Relevance Threshold Guardrail (min score = 0.20)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Deterministic Fallback on Insufficient Context</span>
                </div>
              </div>
            </div>

            {/* CITATIONS */}
            <div className="space-y-1.5 border-t border-[#252A2E] pt-3">
              <div className="text-slate-400 uppercase font-bold text-[10px] flex items-center justify-between">
                <span>CITATIONS & METADATA</span>
                <span className="text-emerald-500 font-bold">PASS ✓</span>
              </div>
              <div className="pl-3 space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified Page & Chunk ID Source Attribution</span>
                </div>
              </div>
            </div>

            {/* LATENCY */}
            <div className="space-y-1.5 border-t border-[#252A2E] pt-3">
              <div className="text-slate-400 uppercase font-bold text-[10px] flex items-center justify-between">
                <span>SYSTEM LATENCY</span>
                <span className="text-emerald-500 font-bold">PASS ✓</span>
              </div>
              <div className="pl-3 space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>P95 End-to-End Latency Target &lt; 2.0s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
