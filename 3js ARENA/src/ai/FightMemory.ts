// =============================================================================
// FightMemory.ts — Persistent fight memory for IRON WRAITH AI
//
// Tracks the player's tendencies, patterns, and habits across rounds and
// sessions. Persists to localStorage so the AI "remembers" the player and
// adapts over time. Fed into the Vultr LLM prompt for smarter decisions.
// =============================================================================

const STORAGE_KEY = 'iron_wraith_memory';
const MAX_FIGHT_LOG_ENTRIES = 50;    // Rolling window of recent events
const MAX_SESSION_HISTORY = 20;      // Max past sessions to remember

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single in-fight event captured in real-time */
export interface FightEvent {
  /** Timestamp (ms since round start) */
  t: number;
  /** Who did it */
  actor: 'player' | 'bot';
  /** What happened */
  type: 'attack' | 'block' | 'hit_landed' | 'hit_taken' | 'dodge' | 'spell' | 'combo';
  /** Optional detail (spell name, combo count, etc.) */
  detail?: string;
}

/** Pattern analysis derived from fight events */
export interface PlayerProfile {
  /** How often player attacks vs blocks vs idles (0-1 each) */
  aggressionRatio: number;
  blockFrequency: number;
  /** Does player favor close or ranged combat? */
  preferredRange: 'close' | 'mid' | 'far';
  /** Common attack sequences (e.g. "attack,attack,block") */
  topPatterns: string[];
  /** How player reacts when low health */
  lowHealthBehavior: 'aggressive' | 'defensive' | 'erratic';
  /** How player reacts when winning */
  winningBehavior: 'aggressive' | 'passive' | 'mixed';
  /** Average reaction time to bot attacks (ms) */
  avgReactionMs: number;
  /** Does player use spells? Which ones? */
  spellUsage: Record<string, number>;
  /** Player's overall skill estimate (0-10) */
  skillRating: number;
  /** Total fights tracked */
  totalFights: number;
  /** Player win rate */
  winRate: number;
}

/** A summary of one past session */
interface SessionSummary {
  date: string;
  rounds: number;
  playerWon: boolean;
  difficulty: string;
  playerSkillRating: number;
  topPlayerPattern: string;
  /** Key lessons the AI "learned" */
  adaptations: string[];
}

/** Full persistent memory structure */
interface MemoryStore {
  profile: PlayerProfile;
  sessions: SessionSummary[];
  /** Running counters for the current session */
  currentSession: {
    playerAttacks: number;
    playerBlocks: number;
    playerHitsLanded: number;
    playerHitsTaken: number;
    botAttacks: number;
    botBlocks: number;
    botHitsLanded: number;
    botHitsTaken: number;
    playerSpells: Record<string, number>;
    roundsPlayed: number;
    playerRoundsWon: number;
    botRoundsWon: number;
    /** Sequence of recent player actions for pattern detection */
    playerActionSequence: string[];
  };
}

// ---------------------------------------------------------------------------
// Default / empty state
// ---------------------------------------------------------------------------

function createDefaultProfile(): PlayerProfile {
  return {
    aggressionRatio: 0.5,
    blockFrequency: 0.2,
    preferredRange: 'mid',
    topPatterns: [],
    lowHealthBehavior: 'erratic',
    winningBehavior: 'mixed',
    avgReactionMs: 500,
    spellUsage: {},
    skillRating: 5,
    totalFights: 0,
    winRate: 0.5,
  };
}

function createDefaultSession(): MemoryStore['currentSession'] {
  return {
    playerAttacks: 0,
    playerBlocks: 0,
    playerHitsLanded: 0,
    playerHitsTaken: 0,
    botAttacks: 0,
    botBlocks: 0,
    botHitsLanded: 0,
    botHitsTaken: 0,
    playerSpells: {},
    roundsPlayed: 0,
    playerRoundsWon: 0,
    botRoundsWon: 0,
    playerActionSequence: [],
  };
}

function createDefaultStore(): MemoryStore {
  return {
    profile: createDefaultProfile(),
    sessions: [],
    currentSession: createDefaultSession(),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadStore(): MemoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MemoryStore>;
      return {
        profile: { ...createDefaultProfile(), ...(parsed.profile ?? {}) },
        sessions: parsed.sessions ?? [],
        currentSession: { ...createDefaultSession(), ...(parsed.currentSession ?? {}) },
      };
    }
  } catch (e) {
    console.warn('[FightMemory] Failed to load from localStorage:', e);
  }
  return createDefaultStore();
}

function saveStore(store: MemoryStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[FightMemory] Failed to save to localStorage:', e);
  }
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/** Find the most common 2-3 action sequences from an action list */
function detectPatterns(actions: string[], windowSize: number = 3): string[] {
  if (actions.length < windowSize) return [];

  const freq: Record<string, number> = {};
  for (let i = 0; i <= actions.length - windowSize; i++) {
    const pattern = actions.slice(i, i + windowSize).join(',');
    freq[pattern] = (freq[pattern] ?? 0) + 1;
  }

  // Sort by frequency descending, return top 3
  return Object.entries(freq)
    .filter(([, count]) => count >= 2) // Only patterns that repeat
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern);
}

// ---------------------------------------------------------------------------
// Public API — singleton
// ---------------------------------------------------------------------------

let store = loadStore();

/** Rolling fight log for current round (not persisted, just for real-time analysis) */
let roundLog: FightEvent[] = [];
let lastBotAttackTime = 0;

/** Auto-save every 30s so training data isn't lost on crash/quit */
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let lastEventCount = 0;

function startAutoSave(): void {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(() => {
    const currentCount = roundLog.length;
    // Only save if there's new data since last auto-save
    if (currentCount !== lastEventCount) {
      saveStore(store);
      lastEventCount = currentCount;
    }
  }, 30_000);
}

function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Start auto-save immediately
startAutoSave();

export const FightMemory = {
  /** Record a fight event in real-time */
  recordEvent(event: FightEvent): void {
    roundLog.push(event);
    if (roundLog.length > MAX_FIGHT_LOG_ENTRIES) roundLog.shift();

    const session = store.currentSession;

    // Update running counters
    if (event.actor === 'player') {
      switch (event.type) {
        case 'attack':
          session.playerAttacks++;
          session.playerActionSequence.push('atk');
          if (session.playerActionSequence.length > 30) session.playerActionSequence.shift();
          break;
        case 'block':
          session.playerBlocks++;
          session.playerActionSequence.push('blk');
          if (session.playerActionSequence.length > 30) session.playerActionSequence.shift();
          break;
        case 'hit_landed':
          session.playerHitsLanded++;
          break;
        case 'hit_taken':
          session.playerHitsTaken++;
          break;
        case 'spell':
          if (event.detail) {
            session.playerSpells[event.detail] = (session.playerSpells[event.detail] ?? 0) + 1;
          }
          session.playerActionSequence.push(`spell:${event.detail ?? '?'}`);
          if (session.playerActionSequence.length > 30) session.playerActionSequence.shift();
          break;
        case 'dodge':
          session.playerActionSequence.push('dodge');
          if (session.playerActionSequence.length > 30) session.playerActionSequence.shift();
          break;
      }
    } else {
      // Bot events
      switch (event.type) {
        case 'attack':
          session.botAttacks++;
          lastBotAttackTime = event.t;
          break;
        case 'block':
          session.botBlocks++;
          break;
        case 'hit_landed':
          session.botHitsLanded++;
          break;
        case 'hit_taken':
          session.botHitsTaken++;
          // Track player reaction time (time between bot attack and player blocking/attacking)
          break;
      }
    }
  },

  /** Called when a round ends */
  recordRoundEnd(playerWon: boolean): void {
    store.currentSession.roundsPlayed++;
    if (playerWon) {
      store.currentSession.playerRoundsWon++;
    } else {
      store.currentSession.botRoundsWon++;
    }
    roundLog = [];
    saveStore(store);
  },

  /** Called when the entire match/game ends */
  recordMatchEnd(playerWon: boolean, difficulty: string): void {
    const session = store.currentSession;
    const profile = store.profile;

    // Update profile from session data
    const totalActions = session.playerAttacks + session.playerBlocks + 1;
    const sessionAggression = session.playerAttacks / totalActions;
    const sessionBlockFreq = session.playerBlocks / totalActions;

    // Exponential moving average with existing profile
    const alpha = profile.totalFights === 0 ? 1.0 : 0.3; // Weight new data
    profile.aggressionRatio = profile.aggressionRatio * (1 - alpha) + sessionAggression * alpha;
    profile.blockFrequency = profile.blockFrequency * (1 - alpha) + sessionBlockFreq * alpha;

    // Detect patterns
    const patterns2 = detectPatterns(session.playerActionSequence, 2);
    const patterns3 = detectPatterns(session.playerActionSequence, 3);
    profile.topPatterns = [...new Set([...patterns3, ...patterns2])].slice(0, 5);

    // Spell usage
    for (const [spell, count] of Object.entries(session.playerSpells)) {
      profile.spellUsage[spell] = (profile.spellUsage[spell] ?? 0) + count;
    }

    // Skill rating estimate (0-10)
    const hitAccuracy = session.playerHitsLanded / Math.max(session.playerAttacks, 1);
    const survivalRate = 1 - (session.playerHitsTaken / Math.max(session.botAttacks, 1));
    const rawSkill = (hitAccuracy * 4 + survivalRate * 3 + (playerWon ? 3 : 0));
    profile.skillRating = profile.skillRating * (1 - alpha) + rawSkill * alpha;
    profile.skillRating = Math.max(0, Math.min(10, profile.skillRating));

    // Win rate
    profile.totalFights++;
    const prevWins = profile.winRate * (profile.totalFights - 1);
    profile.winRate = (prevWins + (playerWon ? 1 : 0)) / profile.totalFights;

    // Determine behavioral tendencies
    if (profile.aggressionRatio > 0.6) {
      profile.lowHealthBehavior = sessionAggression > 0.5 ? 'aggressive' : 'erratic';
      profile.winningBehavior = 'aggressive';
    } else if (profile.blockFrequency > 0.35) {
      profile.lowHealthBehavior = 'defensive';
      profile.winningBehavior = 'passive';
    } else {
      profile.lowHealthBehavior = 'erratic';
      profile.winningBehavior = 'mixed';
    }

    // Generate adaptations (lessons learned)
    const adaptations: string[] = [];
    if (sessionAggression > 0.65) adaptations.push('Player is hyper-aggressive — bait attacks then counter');
    if (sessionBlockFreq > 0.35) adaptations.push('Player blocks often — use strafing attacks to bypass guard');
    if (session.playerHitsLanded > session.botHitsLanded) adaptations.push('Player out-damaged me — need more defensive play');
    if (Object.keys(session.playerSpells).length > 0) {
      const topSpell = Object.entries(session.playerSpells).sort((a, b) => b[1] - a[1])[0];
      adaptations.push(`Player favors ${topSpell[0]} spell — anticipate ranged attacks`);
    }
    if (patterns3.length > 0) adaptations.push(`Detected repeating pattern: ${patterns3[0]} — exploit this`);
    if (playerWon) adaptations.push('I lost — increase aggression and reduce predictability');

    // Save session summary
    store.sessions.push({
      date: new Date().toISOString(),
      rounds: session.roundsPlayed,
      playerWon,
      difficulty,
      playerSkillRating: Math.round(profile.skillRating * 10) / 10,
      topPlayerPattern: profile.topPatterns[0] ?? 'none',
      adaptations,
    });

    // Trim old sessions
    if (store.sessions.length > MAX_SESSION_HISTORY) {
      store.sessions = store.sessions.slice(-MAX_SESSION_HISTORY);
    }

    // Reset current session
    store.currentSession = createDefaultSession();
    saveStore(store);

    console.log('[FightMemory] Match recorded. Player profile:', profile);
    console.log('[FightMemory] Adaptations:', adaptations);
  },

  /** Get the current player profile for prompt injection */
  getProfile(): PlayerProfile {
    return store.profile;
  },

  /** Get recent session summaries for prompt context */
  getRecentSessions(count: number = 3): SessionSummary[] {
    return store.sessions.slice(-count);
  },

  /** Get real-time round events for tactical analysis */
  getRoundLog(): FightEvent[] {
    return roundLog;
  },

  /** Build a text summary for LLM prompt injection */
  buildMemoryPrompt(): string {
    const profile = store.profile;
    const sessions = store.sessions.slice(-3);

    if (profile.totalFights === 0) {
      return 'No prior data on this opponent. Observe and adapt.';
    }

    const lines: string[] = [];

    lines.push(`=== COMBAT INTELLIGENCE DOSSIER ===`);
    lines.push(`Fights analyzed: ${profile.totalFights} | Player win rate: ${(profile.winRate * 100).toFixed(0)}%`);
    lines.push(`Player skill rating: ${profile.skillRating.toFixed(1)}/10`);
    lines.push(`Aggression level: ${(profile.aggressionRatio * 100).toFixed(0)}% | Block frequency: ${(profile.blockFrequency * 100).toFixed(0)}%`);
    lines.push(`Preferred range: ${profile.preferredRange}`);
    lines.push(`When low health: ${profile.lowHealthBehavior} | When winning: ${profile.winningBehavior}`);

    if (profile.topPatterns.length > 0) {
      lines.push(`Known patterns: ${profile.topPatterns.join(' | ')}`);
    }

    if (Object.keys(profile.spellUsage).length > 0) {
      const spells = Object.entries(profile.spellUsage)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `${name}(${count}x)`)
        .join(', ');
      lines.push(`Spell tendencies: ${spells}`);
    }

    if (sessions.length > 0) {
      lines.push(`\n--- RECENT FIGHT HISTORY ---`);
      for (const s of sessions) {
        lines.push(`${s.date.slice(0, 10)}: ${s.playerWon ? 'LOST' : 'WON'} (${s.difficulty}) — ${s.adaptations.join('; ')}`);
      }
    }

    // Current session real-time data
    const cs = store.currentSession;
    if (cs.roundsPlayed > 0 || cs.playerAttacks > 0) {
      lines.push(`\n--- THIS FIGHT (LIVE) ---`);
      lines.push(`Rounds: ${cs.roundsPlayed} (Player ${cs.playerRoundsWon} - ${cs.botRoundsWon} Me)`);
      lines.push(`Player attacks: ${cs.playerAttacks} | blocks: ${cs.playerBlocks} | hits landed: ${cs.playerHitsLanded}`);
      lines.push(`My attacks: ${cs.botAttacks} | blocks: ${cs.botBlocks} | hits landed: ${cs.botHitsLanded}`);

      // Live pattern detection
      const livePatterns = detectPatterns(cs.playerActionSequence, 3);
      if (livePatterns.length > 0) {
        lines.push(`Live patterns detected: ${livePatterns.join(' | ')}`);
      }
    }

    return lines.join('\n');
  },

  /** Reset all memory (for debugging / new player) */
  reset(): void {
    stopAutoSave();
    store = createDefaultStore();
    roundLog = [];
    lastBotAttackTime = 0;
    lastEventCount = 0;
    saveStore(store);
    startAutoSave();
    console.log('[FightMemory] Memory wiped.');
  },
} as const;
