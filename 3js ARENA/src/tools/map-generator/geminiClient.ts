// =============================================================================
// geminiClient.ts — Gemini API wrapper for arena image generation
// =============================================================================

import { GoogleGenAI } from '@google/genai';
import { buildArenaPrompt } from './promptTemplates';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    if (!GEMINI_API_KEY) {
      throw new Error(
        'VITE_GEMINI_API_KEY not set. Add it to .env file.'
      );
    }
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return ai;
}

/**
 * Mode 1: Text prompt → arena equirectangular panorama image.
 * Returns a data URL (base64-encoded image).
 */
export async function generateArenaFromPrompt(
  prompt: string
): Promise<string> {
  const client = getAI();
  const fullPrompt = buildArenaPrompt(prompt);

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: fullPrompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  // Extract base64 image data from response
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates in Gemini response');
  }

  for (const part of candidates[0].content?.parts ?? []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image generated in Gemini response');
}

/**
 * Mode 2: Reference image + prompt → arena equirectangular panorama image.
 * Returns a data URL (base64-encoded image).
 */
export async function generateArenaFromImage(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const client = getAI();
  const fullPrompt = buildArenaPrompt(prompt);

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: fullPrompt },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates in Gemini response');
  }

  for (const part of candidates[0].content?.parts ?? []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image generated in Gemini response');
}
