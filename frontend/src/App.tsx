import React, { useState, useEffect, useCallback } from 'react';
import { TopNav } from './components/layout/TopNav';
import { KnowledgeSidebar } from './components/knowledge/KnowledgeSidebar';
import { DocumentUploadModal } from './components/knowledge/DocumentUploadModal';
import { ConversationWorkspace } from './components/chat/ConversationWorkspace';
import { RetrievalInspector } from './components/retrieval/RetrievalInspector';
import { DebugConsole } from './components/debug/DebugConsole';
import { ObservabilityModal } from './components/metrics/ObservabilityModal';
import { EvaluationView } from './components/evaluation/EvaluationView';
import { DocumentItem, SourceCitation, DebugInfo, SystemReadiness } from './types';
import { api } from './services/api';
import { useTheme } from './hooks/useTheme';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'workspace' | 'knowledge' | 'evaluation' | 'observability'>('workspace');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [readiness, setReadiness] = useState<SystemReadiness | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [debugMode, setDebugMode] = useState<boolean>(true);
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState<boolean>(false);

  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [retrievedCandidates, setRetrievedCandidates] = useState<SourceCitation[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | undefined>(undefined);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<SourceCitation | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const fetchReadiness = useCallback(async () => {
    try {
      const r = await api.getReadiness();
      setReadiness(r);
    } catch (err) {
      console.error('Readiness check failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchReadiness();
  }, [fetchDocuments, fetchReadiness]);

  // Handle active tab changes
  useEffect(() => {
    if (activeTab === 'evaluation') {
      setIsEvaluationModalOpen(true);
    } else if (activeTab === 'observability') {
      setIsMetricsModalOpen(true);
    }
  }, [activeTab]);

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  return (
    <div
      className={`h-screen flex flex-col font-mono overflow-hidden transition-colors ${
        isDark ? 'bg-[#0B0D0F] text-[#E7ECEF]' : 'bg-[#F8F9FA] text-[#212529]'
      }`}
    >
      {/* Top IDE/Terminal Navigation Bar */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        debugMode={debugMode}
        onToggleDebug={() => setDebugMode(!debugMode)}
        onOpenMetrics={() => setIsMetricsModalOpen(true)}
        onOpenEvaluation={() => setIsEvaluationModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        documentCount={documents.length}
      />

      {/* Main 3-Zone Knowledge Workbench (Left: 22%, Center: 56%, Right: 22%) */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[22%_56%_22%] h-[calc(100vh-2.75rem)] overflow-hidden items-stretch border-b border-[#20252A]">
        {/* LEFT ZONE: Knowledge Base Terminal (22%) */}
        <div className="h-full overflow-hidden">
          <KnowledgeSidebar
            documents={documents}
            isLoading={isLoadingDocs}
            onRefresh={fetchDocuments}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            selectedDocId={selectedDoc?.id}
            onSelectDoc={(doc) => setSelectedDoc(doc)}
            readiness={readiness}
            theme={theme}
          />
        </div>

        {/* CENTER ZONE: Main RAG Terminal & Conversation (56%) */}
        <div className="flex flex-col h-full overflow-hidden border-r border-[#20252A]">
          <ConversationWorkspace
            debugMode={debugMode}
            onSourcesUpdate={(newSources) => setSources(newSources)}
            onRetrievedCandidatesUpdate={(candidates) => setRetrievedCandidates(candidates)}
            onDebugInfoUpdate={(newDebug) => setDebugInfo(newDebug)}
            onSelectChunkForInspector={(chunk) => setSelectedChunk(chunk)}
            readiness={readiness}
            documentCount={documents.length}
            totalChunks={totalChunks}
            theme={theme}
          />

          {/* Bottom Developer Debug Console Drawer */}
          {debugMode && debugInfo && (
            <div className="p-2 border-t border-[#20252A] bg-[#101316]">
              <DebugConsole
                debugInfo={debugInfo}
                theme={theme}
                isOpen={isDebugConsoleOpen}
                onToggle={() => setIsDebugConsoleOpen(!isDebugConsoleOpen)}
              />
            </div>
          )}
        </div>

        {/* RIGHT ZONE: Retrieval Terminal Inspector (22%) */}
        <div className="h-full overflow-hidden">
          <RetrievalInspector
            sources={sources}
            retrievedCandidates={retrievedCandidates}
            debugInfo={debugInfo}
            selectedChunk={selectedChunk}
            theme={theme}
          />
        </div>
      </main>

      {/* Document Ingestion Pipeline Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchDocuments}
        theme={theme}
      />

      {/* Observability Performance Modal */}
      <ObservabilityModal
        isOpen={isMetricsModalOpen}
        onClose={() => {
          setIsMetricsModalOpen(false);
          if (activeTab === 'observability') setActiveTab('workspace');
        }}
        theme={theme}
        readiness={readiness}
      />

      {/* Evaluation Suite View Modal */}
      <EvaluationView
        isOpen={isEvaluationModalOpen}
        onClose={() => {
          setIsEvaluationModalOpen(false);
          if (activeTab === 'evaluation') setActiveTab('workspace');
        }}
        theme={theme}
      />
    </div>
  );
};

export default App;
