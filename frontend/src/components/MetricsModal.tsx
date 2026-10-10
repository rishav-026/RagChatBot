import React, { useEffect, useState } from 'react';
import { X, BarChart3, Clock, Cpu, DollarSign, Layers, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const MetricsModal: React.FC<MetricsModalProps> = ({ isOpen, onClose, theme = 'light' }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isDark = theme === 'dark';

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000/api/v1';
      const res = await axios.get(`${API_BASE}/metrics`);
      setMetrics(res.data);
    } catch (e) {
      console.error('Failed to fetch observability metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all ${
        isDark ? 'bg-slate-950/80' : 'bg-slate-900/40'
      }`}
    >
      <div
        className={`border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isDark
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Production Observability & Metrics</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Real-time latency, token consumption & LLM fallback rates
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMetrics}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
              }`}
              title="Refresh stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {loading && !metrics ? (
            <div className="text-center py-12 text-slate-500 text-sm font-medium">
              Fetching system observability metrics...
            </div>
          ) : metrics ? (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`p-3.5 border rounded-2xl ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>Questions</span>
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.total_questions || 0}</div>
                </div>

                <div
                  className={`p-3.5 border rounded-2xl ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>Avg Latency</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.avg_latency_ms || 0} ms</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">P95: {metrics.p95_latency_ms || 0} ms</div>
                </div>

                <div
                  className={`p-3.5 border rounded-2xl ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>Total Tokens</span>
                    <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold">{(metrics.total_tokens || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Avg: {metrics.avg_tokens || 0} / req</div>
                </div>

                <div
                  className={`p-3.5 border rounded-2xl ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
                    <span>Est. Cost</span>
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold">${(metrics.total_cost_usd || 0).toFixed(4)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Gemini + Groq rates</div>
                </div>
              </div>

              {/* Reliability & Guardrail Metrics */}
              <div
                className={`p-4 border rounded-2xl space-y-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  System Reliability & Guardrails
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="text-slate-500 font-medium">Groq Fallbacks</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{metrics.fallback_count || 0}</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="text-slate-500 font-medium">Guardrail Refusals</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{metrics.guardrail_block_count || 0}</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="text-slate-500 font-medium">Retrieval Accuracy</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.retrieval_success_rate || 100}%</span>
                  </div>
                </div>
              </div>

              {/* Provider Breakdown */}
              {metrics.provider_breakdown && Object.keys(metrics.provider_breakdown).length > 0 && (
                <div
                  className={`p-4 border rounded-2xl space-y-2.5 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    LLM Provider Call Distribution
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.provider_breakdown).map(([provider, count]: any) => (
                      <div key={provider} className="flex items-center justify-between text-xs">
                        <span className="font-mono font-medium">{provider}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg font-bold border ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-slate-200'
                              : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                          }`}
                        >
                          {count} calls
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">No usage metrics recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
