import React, { useEffect, useState } from 'react';
import { UserPerformance, AppState, ShadowingSentence } from '../types';
import { generateSessionReview } from '../services/geminiService';

interface ResultsViewProps {
  performanceData: UserPerformance[];
  sentences: ShadowingSentence[];
  onRestart: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ performanceData, sentences, onRestart }) => {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReview = async () => {
      // Prepare history summary for AI
      const history = performanceData.map(p => {
        const sentence = sentences.find(s => s.id === p.sentenceId);
        return {
          text: sentence?.text || "Unknown",
          score: p.evaluation?.score || 0
        };
      });

      try {
        const result = await generateSessionReview(history);
        setReview(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const averageScore = Math.round(
    performanceData.reduce((acc, curr) => acc + (curr.evaluation?.score || 0), 0) / performanceData.length
  );

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in pb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
          Session Complete!
        </h2>
        <p className="text-slate-400">Here is your comprehensive performance report.</p>
      </div>

      {loading ? (
        <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center space-y-4">
             <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-300 animate-pulse">Generating personalized advice...</p>
        </div>
      ) : review ? (
        <div className="space-y-6">
          
          {/* Main Score Card */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between border-l-4 border-green-500">
             <div className="mb-6 md:mb-0">
                <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Overall Average Score</p>
                <div className="text-5xl font-bold text-white">{averageScore}<span className="text-2xl text-slate-500">/100</span></div>
             </div>
             <div className="max-w-md text-right md:text-left">
               <p className="text-xl italic text-green-200">"{review.motivationalMessage}"</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
               <h3 className="flex items-center text-lg font-semibold text-green-400 mb-4">
                 <span className="mr-2 text-xl">💪</span> Strengths
               </h3>
               <p className="text-slate-300 leading-relaxed">
                 {review.strengths}
               </p>
            </div>
            
            {/* Improvements */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
               <h3 className="flex items-center text-lg font-semibold text-yellow-400 mb-4">
                 <span className="mr-2 text-xl">🚀</span> Areas to Focus
               </h3>
               <p className="text-slate-300 leading-relaxed">
                 {review.improvements}
               </p>
            </div>
          </div>

          {/* Detailed List */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Sentence Breakdown</h3>
            <div className="space-y-3">
               {performanceData.map((data, idx) => {
                 const sent = sentences.find(s => s.id === data.sentenceId);
                 const score = data.evaluation?.score || 0;
                 return (
                   <div key={idx} className="bg-slate-800/30 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <p className="text-slate-200">{sent?.text}</p>
                        <p className="text-xs text-slate-500 mt-1">Tips: {data.evaluation?.pronunciationTips}</p>
                      </div>
                      <div className={`font-bold text-lg ${score > 80 ? 'text-green-400' : score > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {score}
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>

        </div>
      ) : (
         <div className="text-center text-red-400">Failed to load review.</div>
      )}

      <div className="mt-12 text-center">
         <button 
           onClick={onRestart}
           className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold shadow-lg shadow-blue-900/40 transition-all transform hover:scale-105"
         >
           Start New Session
         </button>
      </div>
    </div>
  );
};

export default ResultsView;