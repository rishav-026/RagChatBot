import React, { useState } from 'react';
import { DocumentItem, SystemReadiness } from '../../types';
import { FileText, Plus, Search, Trash2, RotateCcw, MoreVertical, X, Info } from 'lucide-react';
import { api } from '../../services/api';
import axios from 'axios';

interface KnowledgeSidebarProps {
  documents: DocumentItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenUpload: () => void;
  selectedDocId?: string;
  onSelectDoc?: (doc: DocumentItem | null) => void;
  readiness?: SystemReadiness | null;
  theme?: 'light' | 'dark';
}

export const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  documents,
  onRefresh,
  onOpenUpload,
  selectedDocId,
  onSelectDoc,
  readiness,
  theme = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);

  const isDark = theme === 'dark';

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalChunks = documents.reduce((acc, doc) => acc + (doc.chunk_count || 0), 0);
  const completedDocs = documents.filter((d) => !d.status || d.status.toUpperCase() === 'COMPLETED').length;
  const indexedPct = documents.length > 0 ? Math.round((completedDocs / documents.length) * 100) : 100;

  const handleDelete = async (e: React.MouseEvent, id: string, filename: string) => {
    e.stopPropagation();
    setActiveMenuDocId(null);
    if (confirm(`Delete document '${filename}' and invalidate associated RAG index entries?`)) {
      try {
        await api.deleteDocument(id);
        if (inspectDoc?.id === id) setInspectDoc(null);
        onRefresh();
      } catch (err) {
        alert('Failed to delete document.');
      }
    }
  };

  const handleReprocess = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuDocId(null);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000/api/v1';
      await axios.post(`${API_BASE}/documents/${id}/reprocess`);
      onRefresh();
    } catch (err) {
      alert('Failed to trigger reprocessing.');
    }
  };

  return (
    <aside
      className={`h-full flex flex-col border-r transition-colors text-xs font-mono select-none relative ${
        isDark ? 'bg-[#0B0D0F] border-[#20252A] text-[#E6E8EA]' : 'bg-[#FFFFFF] border-[#E9ECEF] text-[#212529]'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-[#20252A] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-wider font-bold text-[#7F8990]">
            KNOWLEDGE BASE
          </h2>
          <span className="text-[11px] text-[#7F8990] font-mono">
            {documents.length} DOCS
          </span>
        </div>

        {/* Add document button */}
        <button
          onClick={onOpenUpload}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded font-mono font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ ADD DOCUMENT</span>
        </button>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#7F8990]" />
          <input
            type="text"
            placeholder="⌕ Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1 rounded text-xs font-mono transition-colors focus:outline-none ${
              isDark
                ? 'bg-[#101316] border border-[#20252A] text-[#E6E8EA] placeholder-[#7F8990] focus:border-emerald-500'
                : 'bg-[#F8F9FA] border border-[#CED4DA] text-slate-900 placeholder-slate-400 focus:border-emerald-600'
            }`}
          />
        </div>
      </div>

      {/* FILES Label */}
      <div className="px-3 py-1.5 text-[11px] font-bold text-[#7F8990] uppercase tracking-wider bg-[#101316]/60 border-b border-[#20252A]">
        FILES
      </div>

      {/* VS Code Style File Explorer Rows (Flat, thin dividers, NO rounded cards) */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#20252A]/40">
        {documents.length === 0 ? (
          <div className="p-6 text-center space-y-3 font-mono">
            <div className="font-bold text-xs text-[#7F8990] uppercase tracking-wider">
              KNOWLEDGE BASE EMPTY
            </div>
            <p className="text-[11px] font-sans text-[#7F8990] leading-relaxed">
              No documents ingested yet. Upload files to populate vector database and BM25 index.
            </p>
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ADD DOCUMENT</span>
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-4 text-center text-[#7F8990] text-[11px]">
            No matching files for "{searchQuery}".
          </div>
        ) : (
          filteredDocs.map((doc, idx) => {
            const isSelected = selectedDocId === doc.id || inspectDoc?.id === doc.id;
            const ext = doc.filename.split('.').pop()?.toUpperCase() || 'FILE';
            const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

            return (
              <div
                key={doc.id}
                onClick={() => {
                  setInspectDoc(isSelected ? null : doc);
                  if (onSelectDoc) onSelectDoc(isSelected ? null : doc);
                }}
                className={`px-3 py-2 transition-colors cursor-pointer relative group ${
                  isSelected
                    ? isDark
                      ? 'bg-[#101316] text-white'
                      : 'bg-[#E9ECEF] text-slate-900'
                    : isDark
                    ? 'hover:bg-[#101316] text-[#E6E8EA]'
                    : 'hover:bg-[#F8F9FA] text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 pr-1">
                    <span className="text-[11px] text-[#7F8990] shrink-0 font-mono">
                      {numStr}
                    </span>
                    <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold truncate text-[13px] text-[#E6E8EA]" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>

                  {/* Context Menu Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id);
                      }}
                      className="p-1 rounded text-[#7F8990] hover:text-[#E6E8EA] transition-colors opacity-0 group-hover:opacity-100"
                      title="Document context menu"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuDocId === doc.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute right-0 top-6 z-30 w-32 border rounded shadow-md font-mono text-[11px] py-1 ${
                          isDark ? 'bg-[#101316] border-[#20252A] text-[#E6E8EA]' : 'bg-white border-[#CED4DA] text-slate-800'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setActiveMenuDocId(null);
                            setInspectDoc(doc);
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-[#20252A]"
                        >
                          <Info className="w-3 h-3 text-emerald-500" />
                          <span>View details</span>
                        </button>
                        <button
                          onClick={(e) => handleReprocess(e, doc.id)}
                          className="w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-[#20252A]"
                        >
                          <RotateCcw className="w-3 h-3 text-indigo-400" />
                          <span>Reprocess</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, doc.id, doc.filename)}
                          className="w-full text-left px-3 py-1.5 flex items-center space-x-2 text-red-400 hover:bg-[#2A1515]"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pl-6 text-[11px] text-[#7F8990] flex items-center space-x-1.5 mt-0.5">
                  <span>{ext}</span>
                  <span>·</span>
                  <span>{doc.chunk_count} chunks</span>
                  <span>·</span>
                  <span className="text-emerald-500 font-semibold">● Indexed</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Document Details Drawer */}
      {inspectDoc && (
        <div className="p-3 border-t border-[#20252A] bg-[#0B0D0F] font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between font-bold text-[#7F8990] uppercase tracking-wider text-[10px]">
            <span>DOCUMENT DETAILS</span>
            <button onClick={() => setInspectDoc(null)} className="text-[#7F8990] hover:text-[#E6E8EA]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 text-[10px]">
            <div className="font-bold text-xs truncate text-emerald-400">{inspectDoc.filename}</div>
            <div className="flex justify-between text-[#7F8990]">
              <span>TYPE:</span>
              <span className="font-bold text-[#E6E8EA]">{inspectDoc.filename.split('.').pop()?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-[#7F8990]">
              <span>CHUNKS:</span>
              <span className="font-bold text-emerald-400">{inspectDoc.chunk_count}</span>
            </div>
            <div className="flex justify-between text-[#7F8990]">
              <span>STATUS:</span>
              <span className="font-bold text-emerald-400">INDEXED</span>
            </div>
            <div className="flex justify-between text-[#7F8990]">
              <span>INDEXED:</span>
              <span className="font-bold text-[#E6E8EA]">{new Date(inspectDoc.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-[#7F8990]">
              <span>EMBEDDING:</span>
              <span className="font-bold text-[#E6E8EA] truncate max-w-[120px]">{readiness?.embedding_model || 'BAAI/bge-small-en-v1.5'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Index Health Footer */}
      <div className="p-3 border-t border-[#20252A] bg-[#0B0D0F] font-mono text-[10px] flex items-center justify-between text-[#7F8990]">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-bold text-[#E6E8EA]">INDEX HEALTHY</span>
        </span>
        <span>{totalChunks.toLocaleString()} chunks · {indexedPct}%</span>
      </div>
    </aside>
  );
};
