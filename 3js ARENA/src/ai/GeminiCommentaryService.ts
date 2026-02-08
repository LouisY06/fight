// =============================================================================
// GeminiCommentaryService.ts — Gemini-powered dynamic fight commentary
// Generates context-aware commentary lines that feed into ElevenLabs TTS.
// Uses Gemini 2.0 Flash for real-time speed during gameplay.
// =============================================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash';

function getApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY ?? '';
}

// ---------------------------------------------------------------------------
// Cooldown — prevent spamming Gemini during fast gameplay
// ---------------------------------------------------------------------------

let lastRequestTime = 0;
const MIN_COOLDOWN_MS = 3000; // At least 3s between Gemini calls
let pendingRequest = false;

// ---------------------------------------------------------------------------
// Commentary event types
// ---------------------------------------------------------------------------

export type CommentaryEvent =
  | 'round_start'
  | 'first_blood'
  | 'combo'
  | 'low_health_opponent'
  | 'low_health_player'
  | 'comeback'
  | 'time_warning'
  | 'round_ko'
  | 'round_draw'
  | 'match_win'
  | 'match_lose';

export interface CommentaryContext {
  event: CommentaryEvent;
  playerHealth: number;
  opponentHealth: number;
  round: number;
  totalRounds: number;
  timeRemaining: number;
  comboCount?: number;
  playerScore?: number;
  opponentScore?: number;
}

// ---------------------------------------------------------------------------
// System prompt — defines the commentator personality
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an elite mecha fighting game announcer. You provide short, punchy, dramatic commentary for a 1v1 arena mecha combat game called "SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM".

Rules:
- Respond with ONLY the commentary line, nothing else
- Keep it under 12 words maximum
- Be dramatic, hype, and exciting
- Use fighting game announcer energy
- Reference mechas, steel, circuits, arena when fitting
- Never use quotes around your response
- Vary your style — don't repeat the same patterns`;

// ---------------------------------------------------------------------------
// Build the prompt for each event
// ---------------------------------------------------------------------------

function buildPrompt(ctx: CommentaryContext): string {
  const healthInfo = `Player HP: ${ctx.playerHealth}/100, Opponent HP: ${ctx.opponentHealth}/100`;
  const roundInfo = `Round ${ctx.round}/${ctx.totalRounds}, ${Math.floor(ctx.timeRemaining)}s left`;
  const scoreInfo = ctx.playerScore !== undefined
    ? `Score: Player ${ctx.playerScore} - Opponent ${ctx.opponentScore}`
    : '';

  const eventDescriptions: Record<CommentaryEvent, string> = {
    round_start: `New round just started. ${roundInfo}. ${scoreInfo}. Generate an exciting round-start hype line.`,
    first_blood: `First hit of the round just landed! ${healthInfo}. Generate a "first blood" reaction.`,
    combo: `Player just landed a ${ctx.comboCount}-hit combo! ${healthInfo}. Generate an excited combo reaction.`,
    low_health_opponent: `Opponent is critically low at ${ctx.opponentHealth} HP! Player has ${ctx.playerHealth} HP. Generate a "finish them" moment line.`,
    low_health_player: `Player is critically low at ${ctx.playerHealth} HP! Generate a tense danger line.`,
    comeback: `Player was low but is fighting back! ${healthInfo}. Generate a comeback hype line.`,
    time_warning: `Only ${Math.floor(ctx.timeRemaining)} seconds remain! ${healthInfo}. Generate an urgent time-running-out line.`,
    round_ko: `Knockout! Round over. ${healthInfo}. Generate a KO reaction.`,
    round_draw: `Time ran out — it's a draw! Generate a draw reaction.`,
    match_win: `Player wins the match! Generate a victory celebration line.`,
    match_lose: `Player lost the match. Generate a "better luck next time" line.`,
  };

  return `${eventDescriptions[ctx.event]}\n\nContext: ${healthInfo}. ${roundInfo}. ${scoreInfo}`;
}

// ---------------------------------------------------------------------------
// Call Gemini API
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;

  try {
    const response = await fetch(
      `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 30,
            temperature: 1.0,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[GeminiCommentary] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      console.warn('[GeminiCommentary] Empty response from Gemini');
      return null;
    }

    // Clean up: remove quotes, asterisks, extra whitespace
    const cleaned = text
      .replace(/^["'*]+|["'*]+$/g, '')
      .replace(/\*+/g, '')
      .trim();

    console.log(`[GeminiCommentary] Generated: "${cleaned}"`);
    return cleaned;
  } catch (err) {
    console.warn('[GeminiCommentary] Request failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const GeminiCommentary = {
  /**
   * Generate a dynamic commentary line for a game event.
   * Returns the text (to be fed into ElevenLabs), or null if unavailable/cooldown.
   */
  async generateLine(ctx: CommentaryContext): Promise<string | null> {
    const now = Date.now();

    // Enforce cooldown
    if (now - lastRequestTime < MIN_COOLDOWN_MS) {
      console.log('[GeminiCommentary] Cooldown active, skipping');
      return null;
    }

    // Prevent concurrent requests
    if (pendingRequest) return null;

    pendingRequest = true;
    lastRequestTime = now;

    try {
      const prompt = buildPrompt(ctx);
      return await callGemini(prompt);
    } finally {
      pendingRequest = false;
    }
  },

  /**
   * Check if Gemini commentary is configured.
   */
  isAvailable(): boolean {
    const key = getApiKey();
    return !!key && key !== 'your_gemini_api_key_here';
  },
} as const;
