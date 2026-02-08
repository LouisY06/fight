// =============================================================================
// GameConfig.ts — Constants for the entire game
// =============================================================================

export const GAME_CONFIG = {
  maxHealth: 100,
  roundTime: 90, // seconds per round
  roundsToWin: 3, // first to 3 wins
  damage: {
    swordSlash: 15,
    swordStab: 20,
    gunShot: 25,
    knifeSlash: 12,
    knifeStab: 18,
  },
  blockDamageReduction: 0.8, // blocking reduces damage by 80%
  arenaRadius: 12, // playable area radius in world units
  playerSpawnDistance: 8, // players spawn 8 units apart
  /** Spawn positions for player and enemy (arena scenery only; game spawns entities here). */
  get spawnP1(): [number, number, number] {
    return [0, 0, -this.playerSpawnDistance / 2];
  },
  get spawnP2(): [number, number, number] {
    return [0, 0, this.playerSpawnDistance / 2];
  },
  attackCooldownMs: 500, // ms between hits from same attack (raised from 200)
  swordClashRadius: 0.25, // max distance between sword segments to register a clash
  stunDurationMs: 1000, // ms both players are stunned after sword clash
  countdownDuration: 3, // seconds for pre-round countdown
  roundEndDelay: 3000, // ms to show round result before next round
  /** Glambot intro: orbit around mech + visor power-on (seconds). */
  introDuration: 3,
} as const;

export type WeaponType = 'sword' | 'gun' | 'knife';
export type AttackType = 'slash' | 'stab' | 'shoot' | 'block' | 'parry' | 'idle';

// ---------------------------------------------------------------------------
// AI Difficulty Presets
// ---------------------------------------------------------------------------

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIDifficultyConfig {
  label: string;
  moveSpeed: number;
  attackRange: number;
  attackCooldown: number;
  swingDuration: number;
  /** How often to poll LLM (ms). Lower = smarter/faster reactions */
  decisionIntervalMs: number;
  /** Whether to use LLM inference (true) or heuristic-only (false) */
  useLLM: boolean;
  /** Damage multiplier for the bot */
  damageMultiplier: number;
  /** Player health multiplier (easy = more HP, hard = less) */
  playerHealthMultiplier: number;
  /** Block chance (0-1) for offline heuristics */
  blockChance: number;
  /** Description for UI */
  description: string;
}

export const AI_DIFFICULTY: Record<AIDifficulty, AIDifficultyConfig> = {
  easy: {
    label: 'EASY',
    moveSpeed: 1.5,
    attackRange: 1.8,
    attackCooldown: 2.0,
    swingDuration: 0.5,
    decisionIntervalMs: 2500,
    useLLM: false,
    damageMultiplier: 0.6,
    playerHealthMultiplier: 1.5, // 150 HP
    blockChance: 0.1,
    description: 'Slow reflexes, predictable patterns',
  },
  medium: {
    label: 'MEDIUM',
    moveSpeed: 2.5,
    attackRange: 2.2,
    attackCooldown: 1.2,
    swingDuration: 0.4,
    decisionIntervalMs: 1500,
    useLLM: true,
    damageMultiplier: 0.85,
    playerHealthMultiplier: 1.2, // 120 HP
    blockChance: 0.3,
    description: 'Balanced fighter, uses LLM tactics',
  },
  hard: {
    label: 'HARD',
    moveSpeed: 3.5,
    attackRange: 2.5,
    attackCooldown: 0.7,
    swingDuration: 0.3,
    decisionIntervalMs: 800,
    useLLM: true,
    damageMultiplier: 1.0,
    playerHealthMultiplier: 1.0, // 100 HP (standard)
    blockChance: 0.5,
    description: 'Fast, aggressive, reads your patterns',
  },
} as const;
