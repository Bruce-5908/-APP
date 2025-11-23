import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ShadowingSentence, EvaluationResult } from '../types';
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';

// Initialize Gemini Client
// WARNING: process.env.API_KEY is handled by the runtime environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses uploaded file/text content into shadowing sentences.
 */
export const parseContentToShadowingScript = async (
  textContent: string,
  fileData?: { data: string; mimeType: string }
): Promise<{ title: string; sentences: ShadowingSentence[] }> => {
  
  const prompt = `
    You are an expert English teacher. 
    Analyze the provided content. 
    Create a structured shadowing lesson plan.
    Break the content down into a list of sentences suitable for shadowing practice.
    If the text is very long, select the most important 10-15 sentences that summarize the content well.
    Provide a title for the session.
    Provide a Chinese translation for each sentence to help understanding.
    Rate difficulty as 'easy', 'medium', or 'hard'.
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType
      }
    });
  } else {
    parts.push({ text: `Content to analyze: \n${textContent}` });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          sentences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                text: { type: Type.STRING },
                translation: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
              },
              required: ['id', 'text', 'translation', 'difficulty']
            }
          }
        },
        required: ['title', 'sentences']
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate content");
  }

  return JSON.parse(response.text);
};

/**
 * Generates Speech for a given text (TTS).
 * Returns an AudioBuffer ready to play.
 */
export const generateSpeech = async (text: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is usually good for clear en-US
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data returned");
  }

  return await decodeAudioData(
    decodeBase64(base64Audio),
    audioContext,
    24000,
    1
  );
};

/**
 * Evaluates the user's audio against the target text.
 */
export const evaluatePronunciation = async (
  targetText: string,
  userAudioBase64: string
): Promise<EvaluationResult> => {
  
  const prompt = `
    Compare the user's audio recording with the target text: "${targetText}".
    
    1. Assess the pronunciation accuracy (0-100).
    2. Provide a short, constructive feedback message (max 2 sentences).
    3. Provide specific pronunciation tips (e.g., "Watch the 'th' sound").
    
    Return strict JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", // Using flash as it supports audio input
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "audio/wav", // Assuming recorder sends wav/webm, Gemini handles standard audio types
            data: userAudioBase64
          }
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          feedback: { type: Type.STRING },
          pronunciationTips: { type: Type.STRING }
        },
        required: ['score', 'feedback', 'pronunciationTips']
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to evaluate audio");
  }

  return JSON.parse(response.text);
};

/**
 * Final detailed review of the session.
 */
export const generateSessionReview = async (history: {text: string, score: number}[]) => {
     const prompt = `
    The user has just completed a shadowing session. Here is their performance history:
    ${JSON.stringify(history)}
    
    Provide a comprehensive summary:
    1. Overall Score (average).
    2. Strengths.
    3. Areas for improvement.
    4. A motivational closing.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                overallScore: { type: Type.INTEGER },
                strengths: { type: Type.STRING },
                improvements: { type: Type.STRING },
                motivationalMessage: { type: Type.STRING }
            }
        }
    }
  });

   if (!response.text) throw new Error("Failed to generate review");
   return JSON.parse(response.text);
}