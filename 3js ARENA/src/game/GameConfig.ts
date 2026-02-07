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
  arenaRadius: 6, // playable area radius in world units
  playerSpawnDistance: 4, // players spawn 4 units apart
  /** Spawn positions for player and enemy (arena scenery only; game spawns entities here). */
  get spawnP1(): [number, number, number] {
    return [0, 0, -this.playerSpawnDistance / 2];
  },
  get spawnP2(): [number, number, number] {
    return [0, 0, this.playerSpawnDistance / 2];
  },
  attackCooldownMs: 500, // ms between hits from same attack (raised from 200)
  countdownDuration: 3, // seconds for pre-round countdown
  roundEndDelay: 3000, // ms to show round result before next round
  /** Glambot intro: orbit around mech + visor power-on (seconds). */
  introDuration: 3,
} as const;

export type WeaponType = 'sword' | 'gun' | 'knife';
export type AttackType = 'slash' | 'stab' | 'shoot' | 'block' | 'parry' | 'idle';
