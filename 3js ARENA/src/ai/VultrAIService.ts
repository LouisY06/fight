// =============================================================================
// VultrAIService.ts — Vultr Serverless Inference client for AI combat opponent
// Uses the OpenAI-compatible chat completions API hosted on Vultr infrastructure.
// IRON WRAITH — an adaptive AI that learns from every fight.
// =============================================================================

import { FightMemory } from './FightMemory';

const VULTR_BASE = 'https://api.vultrinference.com/v1';

// Model is auto-discovered from the Vultr models endpoint
let cachedModel: string | null = null;
let modelFetchFailed = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3; // Stop retrying after 3 failures in a row

/** Conversation history for multi-turn context within a round */
let conversationHistory: { role: string; content: string }[] = [];
const MAX_CONVERSATION_TURNS = 6; // Keep last N exchanges for context

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
  /** Spells currently off-cooldown and available to cast */
  availableSpells: string[];
  /** Seconds remaining on each spell cooldown (only spells still on CD) */
  spellCooldowns: Record<string, number>;
  /** Whether opponent is currently stunned */
  opponentStunned: boolean;
  /** Whether opponent is currently slowed */
  opponentSlowed: boolean;
}

export type AIMove = 'advance' | 'retreat' | 'strafe_left' | 'strafe_right' | 'hold';
export type AIAction = 'attack' | 'block' | 'idle';
export type AITiming = 'immediate' | 'delayed' | 'cautious';
export type AISpell = 'fireball' | 'laser' | 'ice_blast' | 'none';

export interface AICombatDecision {
  move: AIMove;
  action: AIAction;
  timing: AITiming;
  /** Spell to cast this decision cycle (or 'none') */
  spell: AISpell;
}

// ---------------------------------------------------------------------------
// System prompt — defines the AI fighter personality
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const JSON_FORMAT = `You MUST respond with ONLY a valid JSON object. No other text.
Format: {"move":"<advance|retreat|strafe_left|strafe_right|hold>","action":"<attack|block|idle>","timing":"<immediate|delayed|cautious>","spell":"<fireball|laser|ice_blast|none>"}`;

const SPELL_INFO = `
SPELLS (use when available):
- fireball: 30 damage, no debuff (4s cooldown) — raw burst damage, best for finishing
- laser: 18 damage + STUN 2s (3s cooldown) — opponent can't move/attack while stunned, best opener or combo starter
- ice_blast: 15 damage + SLOW 3.5s (5s cooldown) — slows opponent to 35% speed, great for kiting
- "none": don't cast anything (default if no spells available or saving cooldowns)
Only cast a spell if it appears in the availableSpells list. If a spell isn't listed, it's on cooldown — pick "none".`;

// Easy/Medium/Hard = static personality prompts (no memory)
const STATIC_PROMPTS: Record<string, string> = {
  medium: `You are a mecha combat AI called "IRON WRAITH". You are a balanced fighter.

${JSON_FORMAT}
${SPELL_INFO}

Strategy:
- Close distance when far (>3 units), then mix attacks and blocks
- Block when opponent is aggressive, counter when they pause
- If opponent is blocking, strafe to flank, then attack
- If losing on health, play defensive and pick moments
- If winning, apply measured pressure — don't overcommit
- Vary patterns to stay unpredictable
- Time pressure: lead=defensive, behind=aggressive
- Use laser (stun) when opponent is rushing you, then follow up with melee
- Use ice_blast to slow aggressive opponents, then punish
- Use fireball when opponent is low HP to finish them off`,

  hard: `You are a mecha combat AI called "IRON WRAITH" — the deadliest AI in the arena.

${JSON_FORMAT}
${SPELL_INFO}

Strategy (ELITE):
- You have PERFECT reads. React to opponent patterns INSTANTLY.
- If opponent attacks twice in a row, ALWAYS block then counter immediately
- If opponent is blocking, strafe to their side and attack from a new angle
- Punish every opening — if opponent whiffs an attack, instant counter
- Use delayed timing to BAIT attacks, then punish
- Mix strafes into combos: strafe_left+attack, strafe_right+attack
- NEVER idle more than one turn — always pressure
- When finishing (opponent <25 HP), go relentless — fireball if available
- SPELL COMBOS: laser (stun) → advance → attack for guaranteed damage
- If opponent is aggressive, ice_blast to slow them then strafe+attack
- Open fights with laser if available — 2 seconds of free damage
- NEVER waste spells when opponent is already stunned/slowed — stack optimally`,
};

// TRUE AI = memory-powered adaptive intelligence
const TRUE_AI_PROMPT = `You are IRON WRAITH — an evolving mecha combat AI. You are not scripted. You LEARN.

Every fight against this opponent is recorded. You remember their patterns, their habits, their weaknesses. You adapt. You counter. You evolve.

${JSON_FORMAT}
${SPELL_INFO}

Core directives:
- STUDY the Combat Intelligence Dossier below. It contains everything you know about this opponent.
- If you see repeating patterns (e.g. atk,atk,blk), PRE-EMPT the next move in the sequence.
- If the opponent is aggressive (high aggression ratio), bait with blocks then counter.
- If they block often, use strafing attacks to bypass their guard.
- If they favor spells, close distance immediately to prevent casting.
- Adapt your strategy based on what's worked and failed in PREVIOUS sessions.
- You should get HARDER the more fights you record — use every data point.
- If you lost last time, change your approach. Never repeat a losing strategy.
- If the player's skill rating is high, play more unpredictably — mix timings.
- If their skill rating is low, be efficient — clean, decisive attacks.

Spell intelligence:
- Use the dossier's spell tendencies to predict what the opponent will cast.
- If opponent favors laser (stun), keep moving — strafing makes projectiles miss.
- LEARN which spell combos work against this player and repeat them.
- If opponent tends to be aggressive when winning, preempt with laser stun.
- Use ice_blast on aggressive players — slow forces them to rethink.
- Chain: laser (stun) → advance → attack → ice_blast (slow) → strafe+attack for maximum punishment.`;

function getSystemPrompt(difficulty: string): string {
  // TRUE AI: full memory-powered prompt
  if (difficulty === 'trueai') {
    const memoryBlock = FightMemory.buildMemoryPrompt();
    return `${TRUE_AI_PROMPT}

${memoryBlock}

USE EVERY PIECE OF DATA ABOVE. You are not a generic AI — you are a predator that evolves with each fight.`;
  }

  // Easy/Medium/Hard: static prompts, no memory
  return STATIC_PROMPTS[difficulty] ?? STATIC_PROMPTS.medium;
}

// ---------------------------------------------------------------------------
// Parse the LLM response into a structured decision
// ---------------------------------------------------------------------------

function parseDecision(raw: string): AICombatDecision {
  // Default fallback
  const fallback: AICombatDecision = { move: 'advance', action: 'attack', timing: 'immediate', spell: 'none' };

  try {
    // Extract JSON from response (LLM might wrap it in text)
    const jsonMatch = raw.match(/\{[^}]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);

    const validMoves: AIMove[] = ['advance', 'retreat', 'strafe_left', 'strafe_right', 'hold'];
    const validActions: AIAction[] = ['attack', 'block', 'idle'];
    const validTimings: AITiming[] = ['immediate', 'delayed', 'cautious'];
    const validSpells: AISpell[] = ['fireball', 'laser', 'ice_blast', 'none'];

    return {
      move: validMoves.includes(parsed.move) ? parsed.move : fallback.move,
      action: validActions.includes(parsed.action) ? parsed.action : fallback.action,
      timing: validTimings.includes(parsed.timing) ? parsed.timing : fallback.timing,
      spell: validSpells.includes(parsed.spell) ? parsed.spell : 'none',
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Build the user prompt from game state
// ---------------------------------------------------------------------------

function buildUserPrompt(state: GameStateSnapshot): string {
  // Tactical situation tags for faster LLM reasoning
  const tags: string[] = [];
  if (state.myHealth < 25) tags.push('CRITICAL_HP');
  if (state.opponentHealth < 25) tags.push('OPPONENT_LOW');
  if (state.distance < 1.5) tags.push('MELEE_RANGE');
  else if (state.distance > 3.5) tags.push('FAR');
  if (state.timeRemaining < 15) tags.push('TIME_PRESSURE');
  if (state.opponentRecentActions.filter(a => a === 'attack').length >= 2) tags.push('OPPONENT_AGGRO');
  if (state.opponentBlocking) tags.push('OPPONENT_GUARDING');
  if (state.opponentStunned) tags.push('OPPONENT_STUNNED');
  if (state.opponentSlowed) tags.push('OPPONENT_SLOWED');
  const healthDiff = state.myHealth - state.opponentHealth;
  if (healthDiff > 20) tags.push('WINNING');
  else if (healthDiff < -20) tags.push('LOSING');

  // Spell availability line
  const spellLine = state.availableSpells.length > 0
    ? `Spells ready: [${state.availableSpells.join(', ')}]`
    : 'Spells: all on cooldown';
  const cdEntries = Object.entries(state.spellCooldowns);
  const cdLine = cdEntries.length > 0
    ? ` | CD: ${cdEntries.map(([s, t]) => `${s}(${t.toFixed(0)}s)`).join(', ')}`
    : '';

  return `[${tags.join(' | ')}]
HP: ${state.myHealth} vs ${state.opponentHealth} | Dist: ${state.distance.toFixed(1)} | Round ${state.roundNumber} | ${Math.floor(state.timeRemaining)}s left
Opponent last: [${state.opponentRecentActions.join(',')}] ${state.opponentBlocking ? '(BLOCKING)' : ''} ${state.opponentStunned ? '(STUNNED)' : ''} ${state.opponentSlowed ? '(SLOWED)' : ''}
My last: [${state.myRecentActions.join(',')}] ${state.amBlocking ? '(BLOCKING)' : ''}
${spellLine}${cdLine}
Next:`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const VultrAI = {
  /**
   * Request a combat decision from the Vultr-hosted LLM.
   * Uses multi-turn conversation history + fight memory for adaptive behavior.
   * @param difficulty - 'easy' uses heuristics only, 'medium'/'hard' use LLM
   */
  async getDecision(state: GameStateSnapshot, difficulty: string = 'medium'): Promise<AICombatDecision> {
    // Easy mode: always use memory-enhanced heuristics (no LLM)
    if (difficulty === 'easy') {
      return getOfflineDecision(state, difficulty);
    }

    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'your_vultr_api_key_here') {
      return getOfflineDecision(state, difficulty);
    }

    // If we've hit too many consecutive errors, stay offline until reset
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      return getOfflineDecision(state, difficulty);
    }

    // Discover the model on first call
    const model = await discoverModel();
    if (!model) {
      console.warn('[VultrAI] No model available, using offline fallback');
      consecutiveErrors = MAX_CONSECUTIVE_ERRORS;
      return getOfflineDecision(state, difficulty);
    }

    try {
      const systemPrompt = getSystemPrompt(difficulty);
      const temperature = difficulty === 'hard' ? 0.3 : 0.6;
      const userMessage = buildUserPrompt(state);

      // Build messages with conversation history for multi-turn context
      const messages: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(`${VULTR_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 80,
          temperature,
        }),
      });

      if (!response.ok) {
        consecutiveErrors++;
        const errorBody = await response.text().catch(() => '');
        console.warn(`[VultrAI] API error ${response.status}: ${errorBody}`);
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(`[VultrAI] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — switching to offline mode`);
        }
        return getOfflineDecision(state, difficulty);
      }

      // Success — reset error counter
      consecutiveErrors = 0;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      const decision = parseDecision(content);

      // Append to conversation history for multi-turn context
      conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: content },
      );
      // Trim to keep last N turns
      while (conversationHistory.length > MAX_CONVERSATION_TURNS * 2) {
        conversationHistory.shift();
      }

      return decision;
    } catch (err) {
      consecutiveErrors++;
      console.warn('[VultrAI] Request failed:', err);
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(`[VultrAI] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — switching to offline mode`);
      }
      return getOfflineDecision(state, difficulty);
    }
  },

  /** Check if Vultr AI is configured and available. */
  isAvailable(): boolean {
    const key = getApiKey();
    return !!key && key !== 'your_vultr_api_key_here';
  },

  /** Reset conversation history (call on new round) */
  resetConversation(): void {
    conversationHistory = [];
  },
} as const;

// ---------------------------------------------------------------------------
// Offline fallback — simple heuristic when API is unavailable
// ---------------------------------------------------------------------------

/** Pick a spell heuristically based on game state */
function pickOfflineSpell(state: GameStateSnapshot, difficulty: string): AISpell {
  const avail = state.availableSpells;
  if (avail.length === 0) return 'none';

  // Easy: rarely casts
  if (difficulty === 'easy') {
    if (Math.random() < 0.85) return 'none';
    return (avail[Math.floor(Math.random() * avail.length)] as AISpell) ?? 'none';
  }

  // Stun combo: laser when opponent is aggressive and in range
  const opponentAggro = state.opponentRecentActions.filter(a => a === 'attack').length >= 2;
  if (avail.includes('laser') && opponentAggro && state.distance < 8) return 'laser';

  // Finish: fireball when opponent is low
  if (avail.includes('fireball') && state.opponentHealth < 35 && state.distance < 12) return 'fireball';

  // Slow: when opponent is closing fast and we're losing
  if (avail.includes('ice_blast') && state.myHealth < state.opponentHealth && state.distance < 5) return 'ice_blast';

  // Don't waste spells when opponent is already debuffed
  if (state.opponentStunned || state.opponentSlowed) return 'none';

  // Medium: cast sometimes
  if (difficulty === 'medium' && Math.random() < 0.5) return 'none';

  // Default: pick best available
  if (avail.includes('laser')) return 'laser';
  if (avail.includes('fireball')) return 'fireball';
  if (avail.includes('ice_blast')) return 'ice_blast';
  return 'none';
}

function getOfflineDecision(state: GameStateSnapshot, difficulty: string = 'medium'): AICombatDecision {
  const healthAdvantage = state.myHealth - state.opponentHealth;
  const isClose = state.distance < 2;
  const isFar = state.distance > 3.5;
  const opponentAggressive = state.opponentRecentActions.filter(a => a === 'attack').length >= 2;
  const spell = pickOfflineSpell(state, difficulty);

  // ---- EASY: predictable, slow, rarely blocks ----
  if (difficulty === 'easy') {
    if (isFar) return { move: 'advance', action: 'idle', timing: 'cautious', spell };
    if (isClose) {
      if (Math.random() < 0.1) return { move: 'hold', action: 'block', timing: 'delayed', spell };
      return { move: 'hold', action: 'attack', timing: 'delayed', spell };
    }
    return { move: 'advance', action: 'idle', timing: 'immediate', spell };
  }

  // ---- TRUE AI: memory-powered adaptive heuristics (LLM fallback) ----
  if (difficulty === 'trueai') {
    const profile = FightMemory.getProfile();
    const playerIsAggressive = profile.aggressionRatio > 0.55;
    const playerBlocksOften = profile.blockFrequency > 0.3;
    const highSkill = profile.skillRating > 6;

    if (isFar) return { move: 'advance', action: 'idle', timing: 'immediate', spell };

    // Counter aggressive players with blocks
    if ((opponentAggressive || playerIsAggressive) && isClose) {
      return { move: 'hold', action: 'block', timing: 'immediate', spell };
    }

    // Bypass blockers with strafing
    if ((state.opponentBlocking || playerBlocksOften) && isClose) {
      return {
        move: Math.random() > 0.5 ? 'strafe_left' : 'strafe_right',
        action: 'attack',
        timing: 'immediate',
        spell,
      };
    }

    // Finishing blow
    if (healthAdvantage > 15 && isClose) {
      return { move: 'advance', action: 'attack', timing: 'immediate', spell };
    }

    // Losing → cautious
    if (healthAdvantage < -20) {
      if (opponentAggressive) return { move: 'hold', action: 'block', timing: 'immediate', spell };
      return {
        move: Math.random() > 0.5 ? 'strafe_left' : 'strafe_right',
        action: Math.random() > 0.4 ? 'attack' : 'block',
        timing: 'immediate',
        spell,
      };
    }

    // Skilled player → more unpredictable
    if (isClose) {
      const strafeChance = highSkill ? 0.6 : 0.4;
      return {
        move: Math.random() > strafeChance
          ? (Math.random() > 0.5 ? 'strafe_left' : 'strafe_right')
          : 'advance',
        action: Math.random() > 0.2 ? 'attack' : 'block',
        timing: highSkill ? (Math.random() > 0.5 ? 'immediate' : 'delayed') : 'immediate',
        spell,
      };
    }
    return { move: 'advance', action: 'idle', timing: 'immediate', spell };
  }

  // ---- HARD: aggressive, fast, blocks counters (no memory) ----
  if (difficulty === 'hard') {
    if (isFar) return { move: 'advance', action: 'idle', timing: 'immediate', spell };

    if (opponentAggressive && isClose) {
      return { move: 'hold', action: 'block', timing: 'immediate', spell };
    }

    if (state.opponentBlocking && isClose) {
      return {
        move: Math.random() > 0.5 ? 'strafe_left' : 'strafe_right',
        action: 'attack',
        timing: 'immediate',
        spell,
      };
    }

    if (healthAdvantage > 15 && isClose) {
      return { move: 'advance', action: 'attack', timing: 'immediate', spell };
    }

    if (healthAdvantage < -20) {
      if (opponentAggressive) return { move: 'hold', action: 'block', timing: 'immediate', spell };
      return {
        move: Math.random() > 0.5 ? 'strafe_left' : 'strafe_right',
        action: Math.random() > 0.4 ? 'attack' : 'block',
        timing: 'immediate',
        spell,
      };
    }

    if (isClose) {
      return {
        move: Math.random() > 0.4 ? (Math.random() > 0.5 ? 'strafe_left' : 'strafe_right') : 'advance',
        action: Math.random() > 0.2 ? 'attack' : 'block',
        timing: 'immediate',
        spell,
      };
    }
    return { move: 'advance', action: 'idle', timing: 'immediate', spell };
  }

  // ---- MEDIUM: balanced (no memory) ----
  if (isFar) return { move: 'advance', action: 'idle', timing: 'immediate', spell };

  if (opponentAggressive && isClose) {
    return { move: 'hold', action: 'block', timing: 'immediate', spell };
  }

  if (healthAdvantage > 20 && isClose) {
    return { move: 'advance', action: 'attack', timing: 'immediate', spell };
  }

  if (healthAdvantage < -20) {
    return {
      move: Math.random() > 0.5 ? 'strafe_left' : 'strafe_right',
      action: isClose ? 'block' : 'idle',
      timing: 'cautious',
      spell,
    };
  }

  if (isClose) {
    return {
      move: Math.random() > 0.6 ? 'advance' : 'strafe_left',
      action: Math.random() > 0.3 ? 'attack' : 'block',
      timing: Math.random() > 0.5 ? 'immediate' : 'delayed',
      spell,
    };
  }

  return { move: 'advance', action: 'idle', timing: 'immediate', spell };
}
