import React from 'react';
import { DocumentItem } from '../types';
import { FileCode, Trash2, Layers, Calendar, RefreshCw, RotateCcw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import axios from 'axios';

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading: boolean;
  onRefresh: () => void;
  theme?: 'light' | 'dark';
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  onRefresh,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const handleDelete = async (id: string, filename: string) => {
    if (confirm(`Are you sure you want to delete '${filename}' and invalidate associated caches?`)) {
      try {
        await api.deleteDocument(id);
        onRefresh();
      } catch (err) {
        alert('Failed to delete document.');
      }
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000/api/v1';
      await axios.post(`${API_BASE}/documents/${id}/reprocess`);
      onRefresh();
    } catch (err) {
      alert('Failed to trigger document reprocessing.');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'COMPLETED').toUpperCase();
    if (s === 'COMPLETED') {
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border flex items-center gap-1 ${
            isDark
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          Indexed
        </span>
      );
    }
    if (s === 'PROCESSING' || s === 'QUEUED') {
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border flex items-center gap-1 ${
            isDark
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          <Clock className="w-3 h-3 animate-spin" />
          {s}
        </span>
      );
    }
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border flex items-center gap-1 ${
          isDark
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}
      >
        <AlertTriangle className="w-3 h-3" />
        Failed
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 shadow-md'
          : 'bg-white border-slate-200/80 shadow-sm shadow-slate-200/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Layers className="w-4 h-4" />
          </div>
          Knowledge Base ({documents.length})
        </h2>
        <button
          onClick={onRefresh}
          className={`p-1.5 rounded-lg border transition-all ${
            isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
          }`}
          title="Refresh document list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {documents.length === 0 ? (
        <div
          className={`text-center py-8 text-xs border border-dashed rounded-xl ${
            isDark
              ? 'border-slate-800 text-slate-500'
              : 'border-slate-200 text-slate-500 bg-slate-50/50'
          }`}
        >
          No documents uploaded yet. Upload a PDF, TXT, or DOCX above to enable RAG answers.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`p-3.5 border rounded-xl flex items-center justify-between transition-all group ${
                isDark
                  ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-50/70 border-slate-200/70 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    isDark ? 'bg-slate-800 text-indigo-400' : 'bg-white border border-slate-200 text-indigo-600 shadow-2xs'
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                    title={doc.filename}
                  >
                    {doc.filename}
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] mt-1">
                    {getStatusBadge(doc.status || 'COMPLETED')}
                    <span className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Layers className="w-3 h-3 text-slate-400" />
                      {doc.chunk_count} chunks
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleReprocess(doc.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title="Reprocess document"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
