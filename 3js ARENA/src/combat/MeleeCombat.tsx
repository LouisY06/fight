// =============================================================================
// MeleeCombat.tsx — Per-frame sword collision detection against opponents
// Every frame, checks if the sword blade (hilt→tip line segment) intersects
// the opponent's body capsule. A hit registers when:
//   - The sword is inside the hitbox, AND
//   - The sword is moving fast enough (CV) or a keyboard swing is active, AND
//   - The hit cooldown has elapsed.
// =============================================================================

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { cvBridge } from '../cv/cvBridge';
import { swordHilt, swordTip, swordSpeed, keyboardSwingActive } from './SwordState';
import { botSwordHilt, botSwordTip, botSwordActive } from './OpponentSwordState';
import { fireHitEvent } from './HitEvent';
import { playSwordHit } from '../audio/SoundManager';
import { gameSocket } from '../networking/socket';
import { useScreenShakeStore } from '../game/useScreenShake';

// Opponent body approximated as a vertical capsule
const OPPONENT_RADIUS = 0.45;       // capsule radius (generous for good feel)
const OPPONENT_CAPSULE_BOT = 0.2;   // bottom of capsule axis (y offset from group)
const OPPONENT_CAPSULE_TOP = 2.1;   // top of capsule axis

// Player body (camera) capsule for bot hits
const PLAYER_CAPSULE_BOT = 0.5;
const PLAYER_CAPSULE_TOP = 2.0;

// Sword must be moving at least this fast to deal damage (world units/sec)
// This prevents "resting sword on opponent" from dealing damage
const MIN_SWING_SPEED = 1.5;

// Max distance from camera to opponent for hit to count
const MAX_OPPONENT_DIST = 4.0;

// Temp vectors
const _capsuleBot = new THREE.Vector3();
const _capsuleTop = new THREE.Vector3();
const _closestOnSword = new THREE.Vector3();
const _closestOnCapsule = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _oppPos = new THREE.Vector3();
const _playerCapsuleBot = new THREE.Vector3();
const _playerCapsuleTop = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Closest distance between two line segments
// ---------------------------------------------------------------------------

function closestDistSegmentSegment(
  p1: THREE.Vector3, q1: THREE.Vector3,
  p2: THREE.Vector3, q2: THREE.Vector3,
  outA: THREE.Vector3,
  outB: THREE.Vector3
): number {
  const d1x = q1.x - p1.x, d1y = q1.y - p1.y, d1z = q1.z - p1.z;
  const d2x = q2.x - p2.x, d2y = q2.y - p2.y, d2z = q2.z - p2.z;
  const rx = p1.x - p2.x, ry = p1.y - p2.y, rz = p1.z - p2.z;

  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;

  let s: number, t: number;

  if (a <= 1e-6 && e <= 1e-6) {
    s = t = 0;
  } else if (a <= 1e-6) {
    s = 0;
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-6) {
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const denom = a * e - b * b;
      s = denom !== 0 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }

  outA.set(p1.x + d1x * s, p1.y + d1y * s, p1.z + d1z * s);
  outB.set(p2.x + d2x * t, p2.y + d2y * t, p2.z + d2z * t);
  return outA.distanceTo(outB);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeleeCombat() {
  const { camera, scene } = useThree();
  const cvEnabled = cvBridge.cvEnabled;
  const lastHitTime = useRef(0);

  useFrame(() => {
    const phase = useGameStore.getState().phase;
    if (phase !== 'playing') return;

    const now = Date.now();

    // Player sword vs opponents — only active when swinging, not when running into them
    // Keyboard mode: require click (keyboardSwingActive)
    // CV mode: sword speed from arm swing (swordSpeed)
    const isActive =
      keyboardSwingActive || (cvEnabled && swordSpeed > MIN_SWING_SPEED);
    if (isActive && now - lastHitTime.current >= GAME_CONFIG.attackCooldownMs) {
      // Check against all opponents
    scene.traverse((obj) => {
      if (!obj.userData?.isOpponent) return;
      if (lastHitTime.current === now) return; // already hit this frame

      obj.getWorldPosition(_oppPos);

      // Quick distance cull
      if (camera.position.distanceTo(_oppPos) > MAX_OPPONENT_DIST) return;

      // Opponent capsule axis
      _capsuleBot.set(_oppPos.x, _oppPos.y + OPPONENT_CAPSULE_BOT, _oppPos.z);
      _capsuleTop.set(_oppPos.x, _oppPos.y + OPPONENT_CAPSULE_TOP, _oppPos.z);

      // Closest distance: sword segment ↔ opponent capsule axis
      const dist = closestDistSegmentSegment(
        swordHilt, swordTip,
        _capsuleBot, _capsuleTop,
        _closestOnSword, _closestOnCapsule
      );

      if (dist <= OPPONENT_RADIUS) {
        // HIT!
        lastHitTime.current = now;

        _hitPoint.addVectors(_closestOnSword, _closestOnCapsule).multiplyScalar(0.5);

        const { playerSlot, isMultiplayer, dealDamage, player1, player2 } = useGameStore.getState();
        const opponentSlot: 'player1' | 'player2' =
          playerSlot === 'player2' ? 'player1' : 'player2';
        const amount = GAME_CONFIG.damage.swordSlash;
        const opponent = opponentSlot === 'player1' ? player1 : player2;
        const isBlocked = opponent.isBlocking;
        const effectiveAmount = isBlocked
          ? amount * (1 - GAME_CONFIG.blockDamageReduction)
          : amount;

        dealDamage(opponentSlot, amount);
        fireHitEvent({ point: _hitPoint.clone(), amount: effectiveAmount, isBlocked });
        useScreenShakeStore.getState().trigger(0.25, 120); // attack landed feedback

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

    // Bot sword vs player (practice mode only)
    const { isMultiplayer } = useGameStore.getState();
    if (!isMultiplayer && botSwordActive && now - lastHitTime.current >= GAME_CONFIG.attackCooldownMs) {
      const playerPos = camera.position;
      _playerCapsuleBot.set(playerPos.x, playerPos.y + PLAYER_CAPSULE_BOT, playerPos.z);
      _playerCapsuleTop.set(playerPos.x, playerPos.y + PLAYER_CAPSULE_TOP, playerPos.z);

      const dist = closestDistSegmentSegment(
        botSwordHilt,
        botSwordTip,
        _playerCapsuleBot,
        _playerCapsuleTop,
        _closestOnSword,
        _closestOnCapsule
      );

      if (dist <= OPPONENT_RADIUS) {
        lastHitTime.current = now;
        _hitPoint.addVectors(_closestOnSword, _closestOnCapsule).multiplyScalar(0.5);

        const { player1, dealDamage } = useGameStore.getState();
        const isBlocked = player1.isBlocking;
        const amount = GAME_CONFIG.damage.swordSlash;
        const effectiveAmount = isBlocked
          ? amount * (1 - GAME_CONFIG.blockDamageReduction)
          : amount;
        dealDamage('player1', amount);
        fireHitEvent({ point: _hitPoint.clone(), amount: effectiveAmount, isBlocked });
        useScreenShakeStore.getState().trigger(0.5, 200);
      }
    }
  });

  return null;
}
