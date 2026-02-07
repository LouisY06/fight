// =============================================================================
// VultrAIService.ts — Vultr Serverless Inference client for AI combat opponent
// Uses the OpenAI-compatible chat completions API hosted on Vultr infrastructure.
// =============================================================================

const VULTR_BASE = 'https://api.vultrinference.com/v1';

// Model is auto-discovered from the Vultr models endpoint
let cachedModel: string | null = null;
let modelFetchFailed = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3; // Stop retrying after 3 failures in a row

function getApiKey(): string {
  return import.meta.env.VITE_VULTR_API_KEY ?? '';
}

/** Fetch available models from Vultr and pick the best chat model */
async function discoverModel(): Promise<string | null> {
  if (cachedModel) return cachedModel;
  if (modelFetchFailed) return null;

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_vultr_api_key_here') return null;

  try {
    const res = await fetch(`${VULTR_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.warn(`[VultrAI] Failed to fetch models: ${res.status}`);
      modelFetchFailed = true;
      return null;
    }
    const data = await res.json();
    // Response format: { object: "list", data: [{ id, created, object, owned_by, features }] }
    const models: { id: string; features?: string[] }[] = data.data ?? [];

    if (models.length === 0) {
      console.warn('[VultrAI] No models available on this subscription');
      modelFetchFailed = true;
      return null;
    }

    // Prefer a model that supports "chat" feature, otherwise use the first one
    const chatModel = models.find(m => m.features?.includes('chat'));
    cachedModel = chatModel?.id ?? models[0].id;
    console.log(`[VultrAI] Discovered ${models.length} models. Using: ${cachedModel}`);
    console.log(`[VultrAI] All models: ${models.map(m => `${m.id} (${m.features?.join(', ') ?? 'no features'})`).join(', ')}`);
    return cachedModel;
  } catch (err) {
    console.warn('[VultrAI] Model discovery failed:', err);
    modelFetchFailed = true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameStateSnapshot {
  myHealth: number;
  opponentHealth: number;
  distance: number;
  roundNumber: number;
  timeRemaining: number;
  opponentRecentActions: string[];
  myRecentActions: string[];
  amBlocking: boolean;
  opponentBlocking: boolean;
}

export type AIMove = 'advance' | 'retreat' | 'strafe_left' | 'strafe_right' | 'hold';
export type AIAction = 'attack' | 'block' | 'idle';
export type AITiming = 'immediate' | 'delayed' | 'cautious';

export interface AICombatDecision {
  move: AIMove;
  action: AIAction;
  timing: AITiming;
}

// ---------------------------------------------------------------------------
// System prompt — defines the AI fighter personality
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the AI brain of a mecha fighting game opponent. You are an aggressive but smart fighter called "IRON WRAITH".

Given the current game state, you must decide your next combat action. You MUST respond with ONLY a valid JSON object, no other text.

Response format:
{"move": "<advance|retreat|strafe_left|strafe_right|hold>", "action": "<attack|block|idle>", "timing": "<immediate|delayed|cautious>"}

Strategy rules:
- If opponent health is low, be aggressive (advance + attack)
- If your health is low, be defensive (retreat + block, then counter-attack)
- If distance is large (>3), advance to close the gap
- If distance is small (<1.5), attack or block
- If opponent recently attacked 2+ times, block then counter
- If opponent is blocking, hold and wait for opening
- Vary your moves to be unpredictable
- If time is running out and you're ahead on health, play defensive
- If time is running out and you're behind, be aggressive`;

// ---------------------------------------------------------------------------
// Parse the LLM response into a structured decision
// ---------------------------------------------------------------------------

function parseDecision(raw: string): AICombatDecision {
  // Default fallback
  const fallback: AICombatDecision = { move: 'advance', action: 'attack', timing: 'immediate' };

  try {
    // Extract JSON from response (LLM might wrap it in text)
    const jsonMatch = raw.match(/\{[^}]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);

    const validMoves: AIMove[] = ['advance', 'retreat', 'strafe_left', 'strafe_right', 'hold'];
    const validActions: AIAction[] = ['attack', 'block', 'idle'];
    const validTimings: AITiming[] = ['immediate', 'delayed', 'cautious'];

    return {
      move: validMoves.includes(parsed.move) ? parsed.move : fallback.move,
      action: validActions.includes(parsed.action) ? parsed.action : fallback.action,
      timing: validTimings.includes(parsed.timing) ? parsed.timing : fallback.timing,
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Build the user prompt from game state
// ---------------------------------------------------------------------------

function buildUserPrompt(state: GameStateSnapshot): string {
  return `Game state:
- My health: ${state.myHealth}/100
- Opponent health: ${state.opponentHealth}/100
- Distance: ${state.distance.toFixed(1)} units
- Round: ${state.roundNumber}
- Time remaining: ${Math.floor(state.timeRemaining)}s
- Opponent recent actions: [${state.opponentRecentActions.join(', ')}]
- My recent actions: [${state.myRecentActions.join(', ')}]
- Opponent blocking: ${state.opponentBlocking}
- I am blocking: ${state.amBlocking}

Decide my next action:`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const VultrAI = {
  /**
   * Request a combat decision from the Vultr-hosted LLM.
   * Returns a structured decision, or a fallback if the API fails.
   */
  async getDecision(state: GameStateSnapshot): Promise<AICombatDecision> {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'your_vultr_api_key_here') {
      return getOfflineDecision(state);
    }

    // If we've hit too many consecutive errors, stay offline until reset
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      return getOfflineDecision(state);
    }

    // Discover the model on first call
    const model = await discoverModel();
    if (!model) {
      console.warn('[VultrAI] No model available, using offline fallback');
      consecutiveErrors = MAX_CONSECUTIVE_ERRORS; // Don't keep retrying
      return getOfflineDecision(state);
    }

    try {
      const response = await fetch(`${VULTR_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(state) },
          ],
          max_tokens: 80,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        consecutiveErrors++;
        const errorBody = await response.text().catch(() => '');
        console.warn(`[VultrAI] API error ${response.status}: ${errorBody}`);
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(`[VultrAI] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — switching to offline mode`);
        }
        return getOfflineDecision(state);
      }

      // Success — reset error counter
      consecutiveErrors = 0;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      return parseDecision(content);
    } catch (err) {
      consecutiveErrors++;
      console.warn('[VultrAI] Request failed:', err);
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(`[VultrAI] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — switching to offline mode`);
      }
      return getOfflineDecision(state);
    }
  },

  /**
   * Check if Vultr AI is configured and available.
   */
  isAvailable(): boolean {
    const key = getApiKey();
    return !!key && key !== 'your_vultr_api_key_here';
  },
} as const;

// ---------------------------------------------------------------------------
// Offline fallback — simple heuristic when API is unavailable
// ---------------------------------------------------------------------------

function getOfflineDecision(state: GameStateSnapshot): AICombatDecision {
  const healthAdvantage = state.myHealth - state.opponentHealth;
  const isClose = state.distance < 2;
  const isFar = state.distance > 3.5;
  const opponentAggressive = state.opponentRecentActions.filter(a => a === 'attack').length >= 2;

  // Far away — close distance
  if (isFar) {
    return { move: 'advance', action: 'idle', timing: 'immediate' };
  }

  // Opponent is aggressive — block then counter
  if (opponentAggressive && isClose) {
    return { move: 'hold', action: 'block', timing: 'immediate' };
  }

  // We're winning and close — stay aggressive
  if (healthAdvantage > 20 && isClose) {
    return { move: 'advance', action: 'attack', timing: 'immediate' };
  }

  // We're losing — be cautious
  if (healthAdvantage < -20) {
    return {
      move: Math.random() > 0.5 ? 'strafe_left' : 'strafe_right',
      action: isClose ? 'block' : 'idle',
      timing: 'cautious',
    };
  }

  // Default: advance and attack
  if (isClose) {
    return {
      move: Math.random() > 0.6 ? 'advance' : 'strafe_left',
      action: Math.random() > 0.3 ? 'attack' : 'block',
      timing: Math.random() > 0.5 ? 'immediate' : 'delayed',
    };
  }

  return { move: 'advance', action: 'idle', timing: 'immediate' };
}
