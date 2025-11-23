export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  SHADOWING = 'SHADOWING',
  RESULTS = 'RESULTS',
}

export interface ShadowingSentence {
  id: number;
  text: string;
  translation: string; // Chinese translation for context
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface EvaluationResult {
  score: number; // 0-100
  feedback: string;
  pronunciationTips: string;
}

export interface UserPerformance {
  sentenceId: number;
  userAudioBlob: Blob | null;
  evaluation: EvaluationResult | null;
}

export interface ProcessedContent {
  title: string;
  sentences: ShadowingSentence[];
}