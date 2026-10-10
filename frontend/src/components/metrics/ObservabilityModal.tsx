import React, { useEffect, useState } from 'react';
import { X, BarChart3, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { ObservabilityMetrics, SystemReadiness } from '../../types';

interface ObservabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  readiness?: SystemReadiness | null;
}

export const ObservabilityModal: React.FC<ObservabilityModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
  readiness,
}) => {
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const isDark = theme === 'dark';

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
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

  const hasData = metrics && metrics.total_questions > 0;

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
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span>SYSTEM MONITOR & OBSERVABILITY</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={fetchMetrics} className="p-1 text-slate-400 hover:text-white">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {/* Infrastructure Readiness Status */}
          <div className="p-3 border border-[#252A2E] bg-[#0B0D0F] rounded space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              INFRASTRUCTURE SYSTEM HEALTH
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <div className="text-slate-500 text-[10px]">Database:</div>
                <div className="font-bold text-emerald-500">{readiness?.database || 'ok'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Redis Cache:</div>
                <div className="font-bold text-emerald-500">{readiness?.redis_cache || 'ok'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Embedding Model:</div>
                <div className="font-bold text-slate-200 truncate">{readiness?.embedding_model || 'bge-small-en-v1.5'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Reranker Model:</div>
                <div className="font-bold text-slate-200 truncate">{readiness?.reranker_model || 'ms-marco-MiniLM'}</div>
              </div>
            </div>
          </div>

          {!hasData ? (
            <div className="p-6 text-center border border-dashed border-[#252A2E] bg-[#0B0D0F] rounded text-slate-400">
              <div className="font-bold text-xs text-slate-300 uppercase">NO METRICS LOGGED YET</div>
              <p className="text-[11px] font-sans mt-1 text-slate-500">
                Submit queries in the main terminal to populate request metrics, latency statistics, and token costs.
              </p>
            </div>
          ) : (
            <>
              {/* System Metrics Output Table */}
              <div className="p-3 border border-[#252A2E] bg-[#0B0D0F] rounded space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  SYSTEM METRICS
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500">REQUESTS:</span>
                    <div className="text-base font-bold text-slate-200">{metrics.total_questions}</div>
                  </div>

                  <div>
                    <span className="text-slate-500">AVG LATENCY:</span>
                    <div className="text-base font-bold text-emerald-400">{(metrics.avg_latency_ms).toFixed(0)}ms</div>
                  </div>

                  <div>
                    <span className="text-slate-500">P95 LATENCY:</span>
                    <div className="text-base font-bold text-emerald-400">{(metrics.p95_latency_ms).toFixed(0)}ms</div>
                  </div>

                  <div>
                    <span className="text-slate-500">TOTAL TOKENS:</span>
                    <div className="text-base font-bold text-slate-200">{metrics.total_tokens.toLocaleString()}</div>
                  </div>

                  <div>
                    <span className="text-slate-500">FALLBACKS:</span>
                    <div className="text-base font-bold text-amber-400">{metrics.fallback_count}</div>
                  </div>

                  <div>
                    <span className="text-slate-500">GUARDRAIL REFUSALS:</span>
                    <div className="text-base font-bold text-indigo-400">{metrics.guardrail_block_count}</div>
                  </div>

                  <div>
                    <span className="text-slate-500">RETRIEVAL SUCCESS:</span>
                    <div className="text-base font-bold text-emerald-400">{metrics.retrieval_success_rate}%</div>
                  </div>

                  <div>
                    <span className="text-slate-500">EST COST:</span>
                    <div className="text-base font-bold text-slate-200">${metrics.total_cost_usd.toFixed(4)}</div>
                  </div>
                </div>
              </div>

              {/* Model Usage Distribution Bar */}
              {metrics.provider_breakdown && Object.keys(metrics.provider_breakdown).length > 0 && (
                <div className="p-3 border border-[#252A2E] bg-[#0B0D0F] rounded space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    MODEL USAGE DISTRIBUTION
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {Object.entries(metrics.provider_breakdown).map(([provider, count]: any) => {
                      const total = metrics.total_questions || 1;
                      const pct = Math.round((count / total) * 100);
                      const barLen = Math.max(1, Math.round((pct / 100) * 20));
                      const barStr = '█'.repeat(barLen) + '░'.repeat(20 - barLen);

                      return (
                        <div key={provider} className="flex items-center justify-between text-slate-300">
                          <span className="w-24 truncate">{provider}</span>
                          <span className="text-emerald-500 tracking-tighter text-[11px] font-mono">{barStr}</span>
                          <span className="font-bold text-slate-200">{count} reqs ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
