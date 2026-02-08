// =============================================================================
// AttackTypes.ts — Enum/config for attack types
// =============================================================================

export type AttackType = 'slash' | 'stab' | 'block' | 'parry' | 'idle';

export interface AttackConfig {
  type: AttackType;
  damage: number;
  cooldownMs: number;
  canBlock: boolean;
  isRanged: boolean;
  description: string;
}

export const ATTACK_CONFIGS: Record<string, AttackConfig> = {
  swordSlash: {
    type: 'slash',
    damage: 15,
    cooldownMs: 200,
    canBlock: true,
    isRanged: false,
    description: 'Lateral sword swing',
  },
  swordStab: {
    type: 'stab',
    damage: 20,
    cooldownMs: 300,
    canBlock: true,
    isRanged: false,
    description: 'Forward sword thrust',
  },
  knifeSlash: {
    type: 'slash',
    damage: 12,
    cooldownMs: 150,
    canBlock: true,
    isRanged: false,
    description: 'Quick knife slash',
  },
  knifeStab: {
    type: 'stab',
    damage: 18,
    cooldownMs: 200,
    canBlock: true,
    isRanged: false,
    description: 'Fast knife thrust',
  },
  block: {
    type: 'block',
    damage: 0,
    cooldownMs: 0,
    canBlock: false,
    isRanged: false,
    description: 'Defensive block — reduces incoming damage by 80%',
  },
  parry: {
    type: 'parry',
    damage: 0,
    cooldownMs: 400,
    canBlock: false,
    isRanged: false,
    description: 'Timed parry — reflects damage if hit during window',
  },
};
