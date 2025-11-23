import React, { useState, useCallback, useEffect } from 'react';
import { AppState } from '../types';
import { parseContentToShadowingScript } from '../services/geminiService';

interface UploadZoneProps {
  onContentReady: (data: any) => void;
  setAppState: (state: AppState) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onContentReady, setAppState }) => {
  const [textInput, setTextInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fake progress bar animation
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // Stall at 90% until done
          return prev + Math.random() * 5;
        });
      }, 300);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleProcess = async (text: string, fileData?: { data: string; mimeType: string }) => {
    setIsLoading(true);
    setError(null);
    setAppState(AppState.PROCESSING);
    
    try {
      const result = await parseContentToShadowingScript(text, fileData);
      setProgress(100);
      setTimeout(() => {
        onContentReady(result);
        setAppState(AppState.SHADOWING);
      }, 500); // Small delay to show 100%
    } catch (err) {
      console.error(err);
      setError("Failed to process content. The AI might be busy, or the file content is too complex. Please try again or use plain text.");
      setIsLoading(false);
      setAppState(AppState.UPLOAD);
    }
  };

  const handleCancel = () => {
    setIsLoading(false);
    setAppState(AppState.UPLOAD);
    setError(null);
    setProgress(0);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    handleProcess(textInput);
  };

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
       reader.onload = () => {
         const base64 = (reader.result as string).split(',')[1];
         handleProcess("Extract sentences from this file.", { data: base64, mimeType: file.type });
       };
       reader.readAsDataURL(file);
    } else {
       reader.onload = (e) => {
         const text = e.target?.result as string;
         handleProcess(text);
       };
       reader.readAsText(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading View
  if (isLoading) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 animate-fade-in flex flex-col items-center justify-center min-h-[500px] glass-panel rounded-2xl">
        <div className="w-20 h-20 mb-8 relative">
           <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-2">Generating Script...</h2>
        <p className="text-slate-400 text-sm mb-8 text-center max-w-xs">
          AI is analyzing your content and breaking it down into practice sentences.
        </p>

        {/* Enhanced Progress Bar */}
        <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
                <span>Processing</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-teal-500 to-blue-600 background-animate transition-all duration-300 ease-out"
                    style={{ width: `${progress}%`, backgroundSize: '200% 100%' }}
                ></div>
            </div>
        </div>

        <button 
          onClick={handleCancel}
          className="mt-12 px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-600 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Cancel & Return</span>
        </button>
      </div>
    );
  }

  // Upload View
  return (
    <div className="w-full max-w-2xl mx-auto p-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
        Start Your Training
      </h2>

      <div className="space-y-6">
        {/* File Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer group relative overflow-hidden
            ${isDragOver 
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
              : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
        >
          <input 
            type="file" 
            className="hidden" 
            id="fileInput" 
            accept=".txt,.md,.pdf,image/*"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
          <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center relative z-10">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 transition-colors shadow-lg">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>
            <span className="text-lg font-medium text-slate-200 group-hover:text-white transition-colors">
              Click to Upload or Drag File
            </span>
            <span className="text-sm text-slate-500 mt-2">
              Supports .pdf, .txt, .md, .png, .jpg
            </span>
          </label>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 font-medium">OR PASTE TEXT</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        {/* Text Input */}
        <div className="flex flex-col space-y-4">
            <textarea
              className="w-full h-32 bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
              placeholder="Paste English text, article, or subtitle script here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-900/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Analyze & Start Shadowing
            </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start space-x-3 animate-fade-in">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadZone;