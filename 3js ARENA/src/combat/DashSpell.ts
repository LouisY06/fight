// =============================================================================
// DashSpell.ts — Charge-and-dash ability for CV mode
//
// Left arm raised + fist closed → charges over time.
// When fully charged, opening the fist triggers a forward dash that damages
// opponents on contact. Module-level state (no React).
// =============================================================================

import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { fireHitEvent } from './HitEvent';
import { useScreenShakeStore } from '../game/useScreenShake';
import { gameSocket } from '../networking/socket';

type DashState = 'idle' | 'charging' | 'dashing' | 'cooldown';

// ---- State ----
let state: DashState = 'idle';
let charge = 0;           // 0–1
let dashTimer = 0;         // elapsed time in current dash
let cooldownTimer = 0;     // elapsed time in cooldown
let dashDir = new THREE.Vector3();  // locked forward direction during dash
let hasHitThisDash = false;

// Opponent capsule constants (same as MeleeCombat)
const OPPONENT_RADIUS = 0.45;
const OPPONENT_CAPSULE_BOT = 0.2;
const OPPONENT_CAPSULE_TOP = 2.1;

// Temp vectors
const _oppPos = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();

// ---- Getters ----
export function getDashState(): DashState { return state; }
export function getDashCharge(): number { return charge; }
export function getDashCooldownRemaining(): number {
  if (state !== 'cooldown') return 0;
  return Math.max(0, GAME_CONFIG.dashSpell.cooldown - cooldownTimer);
}

export function getDashVelocity(): THREE.Vector3 | null {
  if (state !== 'dashing') return null;
  return dashDir;
}

// ---- Update (called from MechaArms each frame) ----
export function updateDashSpell(
  delta: number,
  leftArmRaised: boolean,
  leftFistClosed: boolean,
  camera: THREE.Camera,
  scene: THREE.Scene,
): void {
  const cfg = GAME_CONFIG.dashSpell;
  const gamePhase = useGameStore.getState().phase;
  if (gamePhase !== 'playing') {
    // Reset on non-playing phases
    state = 'idle';
    charge = 0;
    return;
  }

  switch (state) {
    case 'idle':
      if (leftArmRaised) {
        state = 'charging';
        charge = 0;
      }
      break;

    case 'charging':
      // Arm dropped → cancel
      if (!leftArmRaised) {
        state = 'idle';
        charge = 0;
        break;
      }
      charge = Math.min(1, charge + delta / cfg.chargeDuration);
      // Auto-dash when fully charged
      if (charge >= 1) {
        triggerDash(camera);
      }
      break;

    case 'dashing':
      dashTimer += delta;
      checkDashHit(camera, scene);
      if (dashTimer >= cfg.dashDuration) {
        state = 'cooldown';
        cooldownTimer = 0;
      }
      break;

    case 'cooldown':
      cooldownTimer += delta;
      if (cooldownTimer >= cfg.cooldown) {
        state = 'idle';
        cooldownTimer = 0;
      }
      break;
  }

}

function triggerDash(camera: THREE.Camera) {
  state = 'dashing';
  dashTimer = 0;
  hasHitThisDash = false;

  // Lock dash direction to camera forward
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0; // keep dash horizontal
  dir.normalize();
  dashDir = dir.multiplyScalar(GAME_CONFIG.dashSpell.dashSpeed);

  // Screen shake on dash start
  useScreenShakeStore.getState().trigger(0.5, 250);
}

function checkDashHit(camera: THREE.Camera, scene: THREE.Scene) {
  if (hasHitThisDash) return;

  scene.traverse((obj) => {
    if (hasHitThisDash) return;
    if (!obj.userData?.isOpponent) return;

    obj.getWorldPosition(_oppPos);

    // Simple sphere check: camera position vs opponent center
    const capsuleCenter = _oppPos.clone();
    capsuleCenter.y = _oppPos.y + (OPPONENT_CAPSULE_BOT + OPPONENT_CAPSULE_TOP) / 2;

    const dist = camera.position.distanceTo(capsuleCenter);
    if (dist < OPPONENT_RADIUS + 0.8) {
      hasHitThisDash = true;
      _hitPoint.copy(capsuleCenter);

      const { playerSlot, isMultiplayer, dealDamage } = useGameStore.getState();
      const opponentSlot: 'player1' | 'player2' =
        playerSlot === 'player2' ? 'player1' : 'player2';
      const amount = GAME_CONFIG.dashSpell.dashDamage;

      dealDamage(opponentSlot, amount);
      fireHitEvent({ point: _hitPoint.clone(), amount, isBlocked: false });
      useScreenShakeStore.getState().trigger(0.6, 300);

      if (isMultiplayer) {
        gameSocket.send({
          type: 'damage_event',
          target: opponentSlot,
          amount,
        });
      }
    }
  });
}
