import React from 'react';
import { Sparkles, Cpu, Layers, Terminal, BarChart3, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  debugMode: boolean;
  onToggleDebug: () => void;
  onOpenMetrics: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  debugMode,
  onToggleDebug,
  onOpenMetrics,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 border-b backdrop-blur-md ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white/85 border-slate-200/90 text-slate-900 shadow-sm shadow-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-500 rounded-xl shadow-md shadow-indigo-500/20 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                Enterprise RAG Copilot
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                Grounded Knowledge Base
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Hybrid Vector Search + Reranking + Observability
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Architecture Badges */}
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Hybrid Search</span>
            </div>
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              <span>Gemini / Groq</span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Metrics Button */}
          <button
            onClick={onOpenMetrics}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
            title="Open Observability & Usage Metrics"
          >
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Metrics</span>
          </button>

          {/* Debug Toggle Switch */}
          <button
            onClick={onToggleDebug}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              debugMode
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                : isDark
                ? 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                : 'bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Debug {debugMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
