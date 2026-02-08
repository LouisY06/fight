// =============================================================================
// GameConfig.ts — Constants for the entire game
// =============================================================================

export const GAME_CONFIG = {
  maxHealth: 100,
  roundTime: 90, // seconds per round
  roundsToWin: 2, // first to 2 wins
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
