import React, { useState } from 'react';
import { AppState, ProcessedContent, UserPerformance } from './types';
import UploadZone from './components/UploadZone';
import ShadowingSession from './components/ShadowingSession';
import ResultsView from './components/ResultsView';
import InstallPrompt from './components/InstallPrompt';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [content, setContent] = useState<ProcessedContent | null>(null);
  const [performanceData, setPerformanceData] = useState<UserPerformance[]>([]);

  const handleContentReady = (data: ProcessedContent) => {
    setContent(data);
    // Ensure we start fresh
    setPerformanceData([]); 
  };

  const handleSessionComplete = (results: UserPerformance[]) => {
    setPerformanceData(results);
  };

  const handleRestart = () => {
    setAppState(AppState.UPLOAD);
    setContent(null);
    setPerformanceData([]);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-slate-200">
      
      {/* Header */}
      <header className="w-full p-6 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-lg flex items-center justify-center">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             </svg>
           </div>
           <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">
             EchoFlow
           </h1>
        </div>
        
        {appState !== AppState.UPLOAD && (
           <button onClick={handleRestart} className="text-sm text-slate-400 hover:text-white transition-colors">
             Exit Session
           </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
        
        {appState === AppState.UPLOAD && (
          <UploadZone 
            onContentReady={handleContentReady} 
            setAppState={setAppState} 
          />
        )}

        {appState === AppState.PROCESSING && (
           // State handled inside UploadZone via isLoading prop, but keeping clean logic here just in case
           <div className="hidden">Processing...</div> 
        )}

        {appState === AppState.SHADOWING && content && (
          <div className="animate-fade-in">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{content.title}</h2>
                <p className="text-slate-400 text-sm">Listen to the AI agent, then repeat the sentence.</p>
             </div>
             <ShadowingSession 
               sentences={content.sentences} 
               onComplete={handleSessionComplete}
               setAppState={setAppState}
             />
          </div>
        )}

        {appState === AppState.RESULTS && content && (
          <ResultsView 
            performanceData={performanceData}
            sentences={content.sentences}
            onRestart={handleRestart}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full p-4 text-center text-xs text-slate-600 pointer-events-none">
        Powered by Gemini 2.5 • React • Tailwind
      </footer>

      {/* PWA Install Button */}
      <InstallPrompt />
    </div>
  );
};

export default App;