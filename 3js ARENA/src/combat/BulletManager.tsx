// =============================================================================
// BulletManager.tsx — Visible bullet projectiles for the gun weapon
// Manages spawning, movement, capsule collision, damage, and rendering.
// Positions are updated imperatively in useFrame (no React re-render lag).
// =============================================================================

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { fireHitEvent } from './HitEvent';
import { useScreenShakeStore } from '../game/useScreenShake';
import { gameSocket } from '../networking/socket';

const BULLET_SPEED = 40; // units per second
const MAX_LIFETIME = 2; // seconds
const MAX_BULLETS = 10;

// Opponent capsule (same as MeleeCombat)
const OPPONENT_RADIUS = 0.45;
const OPPONENT_CAPSULE_BOT = 0.2;
const OPPONENT_CAPSULE_TOP = 2.1;

// Temp vectors
const _oppPos = new THREE.Vector3();
const _capsuleBot = new THREE.Vector3();
const _capsuleTop = new THREE.Vector3();
const _closestOnRay = new THREE.Vector3();
const _closestOnCapsule = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _prevPos = new THREE.Vector3();

interface Bullet {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  age: number;
}

let nextBulletId = 0;

// Module-level bullet spawn function — set by the component
let _spawnFn: ((origin: THREE.Vector3, direction: THREE.Vector3) => void) | null = null;

/** Call from ViewmodelGun to spawn a bullet. */
export function spawnBullet(origin: THREE.Vector3, direction: THREE.Vector3) {
  if (_spawnFn) _spawnFn(origin, direction);
}

// ---------------------------------------------------------------------------
// Closest distance between two line segments (from MeleeCombat)
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

export function BulletManager() {
  const { scene } = useThree();
  // Bullet data lives in a ref — mutated imperatively, no re-render per frame
  const bulletsRef = useRef<Bullet[]>([]);
  // Map from bullet ID → Three.js group for imperative position updates
  const groupRefs = useRef<Map<number, THREE.Group>>(new Map());
  // Version counter — triggers re-render ONLY when bullets are added/removed
  const [, setVersion] = useState(0);

  const spawn = useCallback((origin: THREE.Vector3, direction: THREE.Vector3) => {
    const bullet: Bullet = {
      id: nextBulletId++,
      position: origin.clone(),
      direction: direction.clone().normalize(),
      age: 0,
    };
    const bullets = bulletsRef.current;
    bullets.push(bullet);
    // Cap at MAX_BULLETS — remove oldest
    if (bullets.length > MAX_BULLETS) {
      const removed = bullets.shift()!;
      groupRefs.current.delete(removed.id);
    }
    setVersion((v) => v + 1); // re-render to add the new mesh
  }, []);

  // Register spawn function for external callers
  _spawnFn = spawn;

  useFrame((_, delta) => {
    const phase = useGameStore.getState().phase;
    if (phase !== 'playing') {
      if (bulletsRef.current.length > 0) {
        bulletsRef.current = [];
        groupRefs.current.clear();
        setVersion((v) => v + 1);
      }
      return;
    }

    const toRemove = new Set<number>();

    for (const bullet of bulletsRef.current) {
      _prevPos.copy(bullet.position);

      // Advance
      bullet.position.addScaledVector(bullet.direction, BULLET_SPEED * delta);
      bullet.age += delta;

      // Update mesh position imperatively — no React re-render needed
      const group = groupRefs.current.get(bullet.id);
      if (group) group.position.copy(bullet.position);

      // Expire
      if (bullet.age > MAX_LIFETIME) {
        toRemove.add(bullet.id);
        continue;
      }

      // Collision check against opponents
      let hit = false;
      scene.traverse((obj) => {
        if (hit) return;
        if (!obj.userData?.isOpponent) return;

        obj.getWorldPosition(_oppPos);

        _capsuleBot.set(_oppPos.x, _oppPos.y + OPPONENT_CAPSULE_BOT, _oppPos.z);
        _capsuleTop.set(_oppPos.x, _oppPos.y + OPPONENT_CAPSULE_TOP, _oppPos.z);

        const dist = closestDistSegmentSegment(
          _prevPos, bullet.position,
          _capsuleBot, _capsuleTop,
          _closestOnRay, _closestOnCapsule
        );

        if (dist <= OPPONENT_RADIUS) {
          hit = true;
          toRemove.add(bullet.id);

          _hitPoint.addVectors(_closestOnRay, _closestOnCapsule).multiplyScalar(0.5);

          const { playerSlot, isMultiplayer, dealDamage } = useGameStore.getState();
          const opponentSlot: 'player1' | 'player2' =
            playerSlot === 'player2' ? 'player1' : 'player2';
          const amount = GAME_CONFIG.damage.gunShot;

          dealDamage(opponentSlot, amount);
          fireHitEvent({ point: _hitPoint.clone(), amount, isBlocked: false });
          useScreenShakeStore.getState().trigger(0.3, 150);

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

    // Remove expired/hit bullets — only re-render when count changes
    if (toRemove.size > 0) {
      for (const id of toRemove) groupRefs.current.delete(id);
      bulletsRef.current = bulletsRef.current.filter((b) => !toRemove.has(b.id));
      setVersion((v) => v + 1);
    }
  });

  return (
    <>
      {bulletsRef.current.map((b) => (
        <group
          key={b.id}
          ref={(node) => {
            if (node) {
              groupRefs.current.set(b.id, node);
              node.position.copy(b.position);
            }
          }}
        >
          <mesh>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshStandardMaterial
              color="#ff4400"
              emissive="#ff4400"
              emissiveIntensity={2}
            />
          </mesh>
          {/* Removed per-bullet pointLight — dynamic lights are expensive */}
        </group>
      ))}
    </>
  );
}
