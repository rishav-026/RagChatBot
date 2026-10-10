import React from 'react';
import { Terminal, BarChart3, Sun, Moon } from 'lucide-react';

interface TopNavProps {
  activeTab: 'workspace' | 'knowledge' | 'evaluation' | 'observability';
  setActiveTab: (tab: 'workspace' | 'knowledge' | 'evaluation' | 'observability') => void;
  debugMode: boolean;
  onToggleDebug: () => void;
  onOpenMetrics: () => void;
  onOpenEvaluation: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  documentCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  debugMode,
  onToggleDebug,
  onOpenMetrics,
  onOpenEvaluation,
  theme,
  onToggleTheme,
  documentCount,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`border-b relative shrink-0 z-30 transition-colors ${
        isDark
          ? 'bg-[#101316] border-[#20252A] text-[#E6E8EA]'
          : 'bg-[#FFFFFF] border-[#E9ECEF] text-[#212529]'
      }`}
    >
      <div className="max-w-[1700px] mx-auto px-4 h-11 flex items-center justify-between font-mono text-xs">
        {/* Left Branding & Status */}
        <div className="flex items-center space-x-3 select-none">
          <div
            className="flex items-baseline space-x-1.5 cursor-pointer"
            onClick={() => setActiveTab('workspace')}
          >
            <span className="text-[17px] font-extrabold tracking-wider text-emerald-500">
              RAGWORKS
            </span>
            <span className="text-[11px] font-mono text-[#7F8990]">
              v3.2
            </span>
          </div>

          <span className="text-[#20252A]">│</span>

          {/* Status Indicator */}
          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-emerald" />
            <span className="font-semibold text-emerald-500 tracking-wide text-[10px] uppercase">
              ONLINE
            </span>
            <span className="text-[10px] text-[#7F8990]">
              ({documentCount} doc{documentCount === 1 ? '' : 's'})
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (13px, active: 600-700, inactive: 400-500) */}
        <nav className="hidden md:flex items-center space-x-5 font-mono text-[13px]">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`transition-colors ${
              activeTab === 'workspace'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500 pb-0.5'
                : 'text-[#7F8990] font-medium hover:text-[#E6E8EA]'
            }`}
          >
            Workspace
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`transition-colors ${
              activeTab === 'knowledge'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500 pb-0.5'
                : 'text-[#7F8990] font-medium hover:text-[#E6E8EA]'
            }`}
          >
            Knowledge
          </button>

          <button
            onClick={() => {
              setActiveTab('evaluation');
              onOpenEvaluation();
            }}
            className={`transition-colors ${
              activeTab === 'evaluation'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500 pb-0.5'
                : 'text-[#7F8990] font-medium hover:text-[#E6E8EA]'
            }`}
          >
            Evaluation
          </button>

          <button
            onClick={() => {
              setActiveTab('observability');
              onOpenMetrics();
            }}
            className={`transition-colors ${
              activeTab === 'observability'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500 pb-0.5'
                : 'text-[#7F8990] font-medium hover:text-[#E6E8EA]'
            }`}
          >
            Observability
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="text-[#7F8990] hover:text-amber-400 transition-colors"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Metrics button */}
          <button
            onClick={onOpenMetrics}
            className="flex items-center space-x-1 text-[#7F8990] hover:text-emerald-400 transition-colors text-[11px]"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Metrics</span>
          </button>

          {/* Debug Mode Toggle */}
          <button
            onClick={onToggleDebug}
            className={`flex items-center space-x-1 transition-colors text-[11px] ${
              debugMode ? 'text-emerald-400 font-bold' : 'text-[#7F8990] hover:text-[#E6E8EA]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Debug</span>
          </button>
        </div>
      </div>
    </header>
  );
};
