import React, { useState } from 'react';
import { DebugInfo } from '../types';
import { Terminal, Shield, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface DebugPanelProps {
  debugInfo: DebugInfo;
  theme?: 'light' | 'dark';
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, theme = 'light' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === 'dark';

  if (!debugInfo) return null;

  return (
    <div
      className={`mt-3 rounded-xl border text-xs overflow-hidden font-mono transition-all ${
        isDark
          ? 'border-indigo-900/40 bg-slate-950/80'
          : 'border-indigo-200/80 bg-slate-50/90 shadow-2xs'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold transition-colors ${
          isDark
            ? 'bg-indigo-950/30 hover:bg-indigo-950/50 text-indigo-300'
            : 'bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-700'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-500" />
          <span>Dev Debug Diagnostics ({debugInfo.provider_used})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 space-y-2.5 border-t border-indigo-200/50 dark:border-indigo-900/30 text-[11px]">
          {/* Query & Prompt metadata */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg border ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div>
              <span className="text-slate-400">Query Processed:</span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{debugInfo.query_processed}</span>
            </div>
            <div>
              <span className="text-slate-400">LLM Provider:</span>{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{debugInfo.provider_used}</span>
            </div>
            <div>
              <span className="text-slate-400">Prompt Version:</span>{' '}
              <span className="text-blue-600 dark:text-blue-400">{debugInfo.prompt_version}</span>
            </div>
            <div>
              <span className="text-slate-400">Candidate Chunks:</span>{' '}
              <span className="text-emerald-600 dark:text-emerald-400">{debugInfo.raw_candidate_count} evaluated</span>
            </div>
          </div>

          {/* Guardrails Status Grid */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-500" />
              Pipeline Guardrails
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Input Guardrail */}
              <div
                className={`p-2 rounded-lg border flex items-start space-x-2 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {debugInfo.input_guardrail?.allowed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Input Guard</div>
                  <div className="text-[10px] text-slate-500">
                    Category: {debugInfo.input_guardrail?.category}
                  </div>
                </div>
              </div>

              {/* Retrieval Guardrail */}
              <div
                className={`p-2 rounded-lg border flex items-start space-x-2 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {debugInfo.retrieval_guardrail?.allowed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Retrieval Guard</div>
                  <div className="text-[10px] text-slate-500">
                    Top Score: {(debugInfo.retrieval_guardrail?.top_score || 0).toFixed(3)}
                  </div>
                </div>
              </div>

              {/* Output Guardrail */}
              <div
                className={`p-2 rounded-lg border flex items-start space-x-2 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {debugInfo.output_guardrail?.allowed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Output Guard</div>
                  <div className="text-[10px] text-slate-500">
                    Grounded: {debugInfo.output_guardrail?.is_grounded ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
