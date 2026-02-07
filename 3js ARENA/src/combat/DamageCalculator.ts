// =============================================================================
// DamageCalculator.ts — Damage computation per weapon type, crits, blocking
// =============================================================================

import { GAME_CONFIG } from '../game/GameConfig';
import { ATTACK_CONFIGS } from './AttackTypes';

export interface DamageResult {
  finalDamage: number;
  isCritical: boolean;
  isBlocked: boolean;
  attackType: string;
}

const CRITICAL_HIT_CHANCE = 0.15; // 15% chance
const CRITICAL_HIT_MULTIPLIER = 1.5;

/**
 * Calculate damage from an attack.
 *
 * @param attackKey — key into ATTACK_CONFIGS (e.g. 'swordSlash')
 * @param isTargetBlocking — whether the target is currently blocking
 * @param velocityMagnitude — weapon speed (higher = more damage, 0-1 normalized)
 */
export function calculateDamage(
  attackKey: string,
  isTargetBlocking: boolean,
  velocityMagnitude: number = 1
): DamageResult {
  const config = ATTACK_CONFIGS[attackKey];
  if (!config) {
    return { finalDamage: 0, isCritical: false, isBlocked: false, attackType: 'unknown' };
  }

  let damage = config.damage;

  // Scale by weapon velocity (minimum 50% damage even at low speed)
  const velocityScale = Math.max(0.5, Math.min(1.5, velocityMagnitude));
  damage *= velocityScale;

  // Critical hit
  const isCritical = Math.random() < CRITICAL_HIT_CHANCE;
  if (isCritical) {
    damage *= CRITICAL_HIT_MULTIPLIER;
  }

  // Blocking
  const isBlocked = isTargetBlocking && !config.isRanged;
  if (isBlocked) {
    damage *= 1 - GAME_CONFIG.blockDamageReduction;
  }

  return {
    finalDamage: Math.round(damage),
    isCritical,
    isBlocked,
    attackType: attackKey,
  };
}
