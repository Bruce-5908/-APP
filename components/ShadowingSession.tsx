import React, { useState, useEffect, useRef } from 'react';
import { ShadowingSentence, UserPerformance, AppState } from '../types';
import { generateSpeech, evaluatePronunciation } from '../services/geminiService';
import { blobToBase64, playAudioBuffer } from '../utils/audioUtils';
import AudioVisualizer from './AudioVisualizer';

interface ShadowingSessionProps {
  sentences: ShadowingSentence[];
  onComplete: (results: UserPerformance[]) => void;
  setAppState: (state: AppState) => void;
}

const ShadowingSession: React.FC<ShadowingSessionProps> = ({ sentences, onComplete, setAppState }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Audio Playback State
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  // State for the current step's result
  const [currentResult, setCurrentResult] = useState<UserPerformance | null>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  // UI Refs for scrolling
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentSentence = sentences[currentIndex];
  
  // Keep track of all results
  const resultsRef = useRef<UserPerformance[]>([]);

  useEffect(() => {
    // Init Audio Context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      audioContextRef.current?.close();
      cancelAnimationFrame(animationFrameRef.current);
      if (audioSourceRef.current) audioSourceRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-scroll to active sentence (Lyrics style)
  useEffect(() => {
    if (sentenceRefs.current[currentIndex]) {
        sentenceRefs.current[currentIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
    // Reset playback progress on sentence change
    setPlaybackProgress(0);
    if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e){}
    }
  }, [currentIndex]);

  // Update Playback Progress Bar
  const updateProgress = () => {
    if (!audioContextRef.current || !isAgentSpeaking) return;
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const progress = Math.min((elapsed / durationRef.current) * 100, 100);
    setPlaybackProgress(progress);
    
    if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  // Handler: Play Agent Audio
  const playAgentAudio = async () => {
    if (!audioContextRef.current) return;
    
    // Stop previous if any
    if (isAgentSpeaking && audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e){}
    }

    setIsAgentSpeaking(true);
    setCurrentResult(null); 
    setPlaybackProgress(0);

    try {
      const audioBuffer = await generateSpeech(currentSentence.text, audioContextRef.current);
      
      durationRef.current = audioBuffer.duration;
      startTimeRef.current = audioContextRef.current.currentTime;
      
      const source = playAudioBuffer(audioContextRef.current, audioBuffer);
      audioSourceRef.current = source;
      
      // Start progress loop
      animationFrameRef.current = requestAnimationFrame(updateProgress);

      source.onended = () => {
        setIsAgentSpeaking(false);
        setPlaybackProgress(100);
        cancelAnimationFrame(animationFrameRef.current);
      };
    } catch (error) {
      console.error("TTS Error", error);
      setIsAgentSpeaking(false);
    }
  };

  // Handler: Start Recording
  const startRecording = async () => {
    try {
      // Ensure existing audio stops
      if (audioSourceRef.current) { 
        try { audioSourceRef.current.stop(); } catch(e){}
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); 
        await handleEvaluation(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleEvaluation = async (blob: Blob) => {
    setIsEvaluating(true);
    try {
      const base64 = await blobToBase64(blob);
      const evalResult = await evaluatePronunciation(currentSentence.text, base64);
      
      const perf: UserPerformance = {
        sentenceId: currentSentence.id,
        userAudioBlob: blob,
        evaluation: evalResult
      };

      setCurrentResult(perf);
      resultsRef.current[currentIndex] = perf;

    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentResult(null);
    } else {
      const finalResults = resultsRef.current.filter(r => r !== undefined);
      onComplete(finalResults);
      setAppState(AppState.RESULTS);
    }
  };
  
  const handleJumpTo = (index: number) => {
      if (isRecording || isEvaluating) return;
      setCurrentIndex(index);
      setCurrentResult(resultsRef.current[index] || null); 
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in">
      
      {/* LEFT COLUMN: Active Player Card */}
      <div className="lg:w-7/12 flex flex-col h-full">
        <div className="flex-1 glass-panel rounded-3xl p-6 md:p-12 shadow-2xl relative flex flex-col justify-between items-center border border-white/5 bg-gradient-to-b from-slate-800/80 to-slate-900/80">
            
            {/* Top Info */}
            <div className="w-full flex justify-between items-center">
                <span className="text-slate-500 font-mono text-sm tracking-widest">
                    TRACK {currentIndex + 1} / {sentences.length}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                    ${currentSentence.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    currentSentence.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                    'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {currentSentence.difficulty}
                </span>
            </div>

            {/* Main Text Content */}
            <div className="text-center space-y-6 w-full max-w-2xl">
                <p className="text-2xl md:text-4xl font-semibold leading-relaxed text-white drop-shadow-md">
                    {currentSentence.text}
                </p>
                <div className="w-16 h-1 bg-slate-700 mx-auto rounded-full"></div>
                <p className="text-lg md:text-xl text-slate-400 font-light italic">
                    {currentSentence.translation}
                </p>
            </div>

            {/* Audio Scrubber (Progress Bar) */}
            <div className="w-full max-w-lg mt-4">
                <div className="w-full bg-slate-700/50 rounded-full h-1.5 cursor-default overflow-hidden">
                    <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${playbackProgress}%` }}
                    ></div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center space-y-6 w-full mt-4">
                
                <div className="flex items-center gap-8">
                    {/* Play Button */}
                    <button 
                    onClick={playAgentAudio}
                    disabled={isAgentSpeaking || isRecording}
                    className={`p-6 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95
                        ${isAgentSpeaking 
                            ? 'bg-blue-600 shadow-[0_0_25px_rgba(37,99,235,0.6)] ring-4 ring-blue-500/20' 
                            : 'bg-slate-700 hover:bg-slate-600 shadow-xl'}
                    `}
                    title="Listen to AI"
                    >
                    {isAgentSpeaking ? (
                        <div className="flex space-x-1 h-8 items-center justify-center w-8">
                             <div className="w-1.5 bg-white h-full animate-[bounce_1s_infinite]"></div>
                             <div className="w-1.5 bg-white h-3/4 animate-[bounce_1s_infinite_0.2s]"></div>
                             <div className="w-1.5 bg-white h-full animate-[bounce_1s_infinite_0.4s]"></div>
                        </div>
                    ) : (
                        <svg className="w-8 h-8 text-blue-200 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                    )}
                    </button>

                    {/* Mic Button */}
                    {!isRecording ? (
                        <button 
                        onClick={startRecording}
                        disabled={isAgentSpeaking || isEvaluating}
                        className="group flex items-center justify-center p-7 rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
                        title="Start Recording"
                        >
                        <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        </button>
                    ) : (
                        <button 
                        onClick={stopRecording}
                        className="p-7 rounded-full bg-white text-red-600 shadow-xl transition-all hover:scale-105 animate-pulse ring-4 ring-red-500/30"
                        title="Stop Recording"
                        >
                        <div className="w-9 h-9 flex items-center justify-center">
                            <div className="w-4 h-4 bg-current rounded-sm"></div>
                        </div>
                        </button>
                    )}
                </div>

                {/* Visualizer & Feedback Area */}
                <div className="h-24 w-full flex flex-col items-center justify-center relative">
                    {isRecording && streamRef.current && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AudioVisualizer isRecording={isRecording} stream={streamRef.current} color="#f472b6" />
                        </div>
                    )}
                    
                    {isEvaluating && (
                        <div className="flex items-center space-x-2 text-blue-300 animate-pulse bg-slate-800/80 px-4 py-2 rounded-lg">
                            <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-medium">Analyzing Pronunciation...</span>
                        </div>
                    )}

                    {currentResult && currentResult.evaluation && (
                        <div className="w-full max-w-md bg-slate-800/90 backdrop-blur rounded-xl p-4 border border-slate-700 animate-fade-in-up">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-400 text-xs uppercase font-bold">Score</span>
                                <span className={`text-2xl font-black ${
                                    currentResult.evaluation.score >= 80 ? 'text-green-400' : 
                                    currentResult.evaluation.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {currentResult.evaluation.score}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 rounded-full mb-3 overflow-hidden">
                                <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                    currentResult.evaluation.score >= 80 ? 'bg-green-500' : 
                                    currentResult.evaluation.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${currentResult.evaluation.score}%` }}
                                ></div>
                            </div>
                            <p className="text-slate-200 text-sm mb-1 font-medium">{currentResult.evaluation.feedback}</p>
                            {currentResult.evaluation.pronunciationTips && (
                                <p className="text-blue-300 text-xs mt-2 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                                    💡 Tip: {currentResult.evaluation.pronunciationTips}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Next Button */}
            <div className="w-full flex justify-center mt-2">
                 <button 
                    onClick={handleNext}
                    disabled={isRecording || isEvaluating}
                    className="group flex items-center space-x-2 px-8 py-3 rounded-xl bg-slate-700 hover:bg-blue-600 text-white font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                    <span>{currentIndex === sentences.length - 1 ? 'Finish Session' : 'Next Sentence'}</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Script / Lyrics Playlist */}
      <div className="lg:w-5/12 flex flex-col h-full bg-slate-900/60 rounded-3xl border border-slate-700/50 backdrop-blur-md overflow-hidden shadow-xl">
         <div className="p-5 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 flex items-center justify-between">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                 Playlist
             </h3>
             <span className="text-xs text-slate-500">{sentences.length} sentences</span>
         </div>
         
         <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar scroll-smooth">
             {sentences.map((sentence, idx) => {
                 const isActive = idx === currentIndex;
                 const hasResult = resultsRef.current[idx];
                 const score = hasResult?.evaluation?.score;

                 return (
                 <div
                    key={sentence.id}
                    ref={el => sentenceRefs.current[idx] = el}
                    onClick={() => handleJumpTo(idx)}
                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border
                        ${isActive 
                            ? 'bg-blue-600/20 border-blue-500/50 shadow-lg scale-[1.02] z-10' 
                            : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'
                        }
                    `}
                 >
                    {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                        <div className={`mt-0.5 w-6 text-xs font-mono font-bold ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>
                            {(idx + 1).toString().padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                             <p className={`text-sm font-medium leading-relaxed transition-colors ${
                                 isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                             }`}>
                                 {sentence.text}
                             </p>
                        </div>
                        {/* Status Icon */}
                        <div className="flex flex-col items-center justify-center min-w-[24px]">
                            {hasResult ? (
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                                    score! >= 80 ? 'bg-green-500/20 text-green-400' : 
                                    score! >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                    {score}
                                </div>
                            ) : isActive ? (
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            ) : null}
                        </div>
                    </div>
                 </div>
             )})}
         </div>
      </div>

    </div>
  );
};

export default ShadowingSession;