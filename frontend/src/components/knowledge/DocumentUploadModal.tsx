import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, AlertCircle, FileText } from 'lucide-react';
import { api } from '../../services/api';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  theme?: 'light' | 'dark';
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  theme = 'light',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndProcess(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      validateAndProcess(dropped);
    }
  };

  const validateAndProcess = async (selectedFile: File) => {
    setError(null);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'txt', 'docx'].includes(ext)) {
      setError('Unsupported format. Please upload PDF, TXT, or DOCX files.');
      return;
    }
    setFile(selectedFile);
  };

  const startUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setStage('uploading');

    try {
      setTimeout(() => setStage('extracting'), 500);
      setTimeout(() => setStage('chunking'), 1000);
      setTimeout(() => setStage('embedding'), 1500);
      setTimeout(() => setStage('indexing'), 2100);

      await api.uploadDocument(file);

      setStage('completed');
      setTimeout(() => {
        onUploadSuccess();
        onClose();
        resetState();
      }, 1000);
    } catch (err: any) {
      setStage('error');
      setError(err.response?.data?.detail || err.message || 'Ingestion pipeline failed.');
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setIsUploading(false);
    setStage('idle');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs font-mono text-xs">
      <div
        className={`w-full max-w-md border rounded transition-colors ${
          isDark ? 'bg-[#101316] border-[#252A2E] text-[#E7ECEF]' : 'bg-[#FFFFFF] border-[#E9ECEF] text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#252A2E] flex items-center justify-between font-bold">
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>KNOWLEDGE INGESTION PIPELINE</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#252A2E] hover:border-emerald-500 rounded p-6 text-center cursor-pointer transition-colors bg-[#0B0D0F]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.txt,.docx"
                className="hidden"
              />
              <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="font-bold text-slate-200">Drop document here or click to browse</p>
              <p className="text-[10px] text-slate-500 mt-1">Supported formats: PDF, DOCX, TXT (Max 15MB)</p>
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              <div className="p-2.5 border border-[#252A2E] bg-[#0B0D0F] rounded flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate font-bold text-slate-200">{file.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-2">{(file.size / 1024).toFixed(0)} KB</span>
              </div>

              {/* Ingestion Pipeline Stages Log */}
              <div className="space-y-1.5 p-3 rounded bg-[#0B0D0F] border border-[#252A2E] text-[11px]">
                <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-2">
                  $ ingest {file.name}
                </div>

                <div className="flex items-center justify-between">
                  <span>[01] UPLOAD</span>
                  {stage === 'uploading' ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  ) : ['extracting', 'chunking', 'embedding', 'indexing', 'completed'].includes(stage) ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : (
                    <span className="text-slate-600">○</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>[02] EXTRACT TEXT</span>
                  {stage === 'extracting' ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  ) : ['chunking', 'embedding', 'indexing', 'completed'].includes(stage) ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : (
                    <span className="text-slate-600">○</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>[03] CHUNK (500 chars)</span>
                  {stage === 'chunking' ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  ) : ['embedding', 'indexing', 'completed'].includes(stage) ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : (
                    <span className="text-slate-600">○</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>[04] DENSE EMBEDDING</span>
                  {stage === 'embedding' ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  ) : ['indexing', 'completed'].includes(stage) ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : (
                    <span className="text-slate-600">○</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>[05] INDEX VECTOR & BM25</span>
                  {stage === 'indexing' ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  ) : stage === 'completed' ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : (
                    <span className="text-slate-600">○</span>
                  )}
                </div>

                {stage === 'completed' && (
                  <div className="pt-2 text-emerald-500 font-bold border-t border-[#252A2E] mt-2">
                    DONE — Document chunks indexed successfully.
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-400 rounded flex items-center gap-2 font-mono text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-4 py-3 border-t border-[#252A2E] flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            disabled={isUploading}
            className="px-3 py-1 rounded border border-[#252A2E] text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          {file && stage === 'idle' && (
            <button
              onClick={startUpload}
              className="px-4 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              Start Pipeline
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
