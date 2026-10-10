import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface DocumentUploadProps {
  onUploadSuccess: () => void;
  theme?: 'light' | 'dark';
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess, theme = 'light' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadSelectedFile(file);
  };

  const uploadSelectedFile = async (file: File) => {
    setError(null);
    setSuccessMessage(null);

    // Frontend extension validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'txt', 'docx'].includes(ext)) {
      setError('Unsupported file format. Please upload PDF, TXT, or DOCX files.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadDocument(file);
      setSuccessMessage(result.message);
      onUploadSuccess();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to upload document.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadSelectedFile(file);
    }
  };

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 shadow-md'
          : 'bg-white border-slate-200/80 shadow-sm shadow-slate-200/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <FileText className="w-4 h-4" />
          </div>
          Document Ingestion
        </h2>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
          PDF, TXT, DOCX
        </span>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isUploading
            ? isDark
              ? 'border-indigo-500/50 bg-indigo-500/10'
              : 'border-indigo-500/60 bg-indigo-50/50'
            : isDark
            ? 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60'
            : 'border-slate-200 hover:border-indigo-500/60 hover:bg-indigo-50/30'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.docx"
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-2.5 py-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Extracting text & generating vector embeddings...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 py-1">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Click to upload <span className={`font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>or drag & drop</span>
              </p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Up to 15MB per file (Automatic chunking & BM25 indexing)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
    </div>
  );
};
