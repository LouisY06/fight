// =============================================================================
// GameConfig.ts — Constants for the entire game
// =============================================================================

export const GAME_CONFIG = {
  maxHealth: 100,
  roundTime: 90, // seconds per round
  roundsToWin: 2, // best of 3
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
  attackCooldownMs: 200, // ms between hits from same attack
  countdownDuration: 3, // seconds for pre-round countdown
  roundEndDelay: 3000, // ms to show round result before next round
} as const;

export type WeaponType = 'sword' | 'gun' | 'knife';
export type AttackType = 'slash' | 'stab' | 'shoot' | 'block' | 'parry' | 'idle';
