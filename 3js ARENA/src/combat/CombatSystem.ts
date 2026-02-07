// =============================================================================
// CombatSystem.ts — Hit detection using Rapier collision events
// =============================================================================

import { useCallback, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { calculateDamage } from './DamageCalculator';

export interface HitEvent {
  attacker: 'player1' | 'player2';
  target: 'player1' | 'player2';
  attackKey: string;
  position: [number, number, number];
  damage: number;
  isCritical: boolean;
  isBlocked: boolean;
}

/**
 * Hook that provides a collision handler for Rapier.
 * Register hit effects (sparks, damage numbers) via the onHit callback.
 */
export function useCombatSystem(onHit?: (event: HitEvent) => void) {
  const dealDamage = useGameStore((s) => s.dealDamage);
  const player1 = useGameStore((s) => s.player1);
  const player2 = useGameStore((s) => s.player2);
  const phase = useGameStore((s) => s.phase);

  const lastHitTime = useRef<Record<string, number>>({
    player1: 0,
    player2: 0,
  });

  /**
   * Called when a weapon collider intersects a player body collider.
   * Typically wired into Rapier's onCollisionEnter.
   */
  const handleWeaponHit = useCallback(
    (
      attackerWeaponData: { type: string; owner: string },
      targetBodyData: { type: string; owner: string },
      contactPosition: [number, number, number]
    ) => {
      if (phase !== 'playing') return;

      // Validate collision — weapon must hit opponent, not self
      if (
        attackerWeaponData.type !== 'weapon' ||
        targetBodyData.type !== 'playerBody'
      ) {
        return;
      }
      if (attackerWeaponData.owner === targetBodyData.owner) return;

      const attacker = attackerWeaponData.owner as 'player1' | 'player2';
      const target = targetBodyData.owner as 'player1' | 'player2';

      // Cooldown check — prevent multi-hit from single swing
      const now = Date.now();
      if (now - lastHitTime.current[target] < GAME_CONFIG.attackCooldownMs) {
        return;
      }
      lastHitTime.current[target] = now;

      // Calculate damage
      const targetState = target === 'player1' ? player1 : player2;
      const result = calculateDamage('swordSlash', targetState.isBlocking);

      // Apply damage
      dealDamage(target, result.finalDamage);

      // Notify for effects (sparks, damage numbers, sound)
      onHit?.({
        attacker,
        target,
        attackKey: result.attackType,
        position: contactPosition,
        damage: result.finalDamage,
        isCritical: result.isCritical,
        isBlocked: result.isBlocked,
      });
    },
    [phase, player1, player2, dealDamage, onHit]
  );

  return { handleWeaponHit };
}
