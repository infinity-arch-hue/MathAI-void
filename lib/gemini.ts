import { GoogleGenAI } from '@google/genai';

// Ranked model candidates according to official Gemini guidelines.
// If the primary model hits a rate-limit or quota (429 RESOURCE_EXHAUSTED),
// the helper falls through to subsequent candidate models before delegating
// to the high-precision algorithmic math reasoning engine.
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

export interface GeminiCallParams {
  prompt?: string;
  contents?: any;
  responseMimeType?: string;
  timeoutMs?: number;
}

export interface GeminiCallResult {
  text: string;
  model: string;
}

export async function callGeminiSafely(
  params: GeminiCallParams
): Promise<GeminiCallResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  const timeoutMs = params.timeoutMs || 8000;
  const contentPayload = params.contents || params.prompt || '';

  for (const model of CANDIDATE_MODELS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms)`)), timeoutMs)
      );

      const aiPromise = ai.models.generateContent({
        model,
        contents: contentPayload,
        config: params.responseMimeType
          ? { responseMimeType: params.responseMimeType }
          : undefined,
      });

      const response: any = await Promise.race([aiPromise, timeoutPromise]);
      const text = response?.text;
      if (typeof text === 'string' && text.trim().length > 0) {
        return { text, model };
      }
    } catch (err: any) {
      const errStr = String(err?.message || err || '');
      const isQuotaOrRateLimit =
        err?.status === 'RESOURCE_EXHAUSTED' ||
        err?.code === 429 ||
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('limit:');

      if (isQuotaOrRateLimit) {
        // Model quota reached, try the next candidate model seamlessly
        continue;
      }

      const isTimeout = errStr.includes('Timeout') || errStr.includes('timeout');
      if (isTimeout) {
        // On network timeout, avoid wasting more time and let algorithmic solver respond immediately
        break;
      }
    }
  }

  return null;
}
