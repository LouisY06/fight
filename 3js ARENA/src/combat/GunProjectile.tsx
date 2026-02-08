// =============================================================================
// GunProjectile.tsx — Renders active gun projectiles and handles hit detection
// Energy bolts travel forward, check collision with opponent, deal damage.
// =============================================================================

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGunStore, GUN_CONFIG } from './GunState';
import type { GunProjectile as GunProjectileType } from './GunState';
import { useGameStore } from '../game/GameState';
import { useScreenShakeStore } from '../game/useScreenShake';
import { fireHitEvent } from './HitEvent';
import { isForceFieldActive } from './SpellSystem';
import { gameSocket } from '../networking/socket';

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _oppPos = new THREE.Vector3();

const OPPONENT_CENTER_Y = 1.0;
const PROJECTILE_HIT_RADIUS = 1.2;

// ---------------------------------------------------------------------------
// Cache opponent ref (same pattern as SpellEffects)
// ---------------------------------------------------------------------------

let cachedOpponent: THREE.Object3D | null = null;
let lastOpponentSearch = 0;

function findOpponent(scene: THREE.Scene): THREE.Object3D | null {
  const now = Date.now();
  if (cachedOpponent && now - lastOpponentSearch < 500) return cachedOpponent;
  lastOpponentSearch = now;
  cachedOpponent = null;
  scene.traverse((obj) => {
    if (!cachedOpponent && obj.userData?.isOpponent) cachedOpponent = obj;
  });
  return cachedOpponent;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function GunProjectiles() {
  const projectiles = useGunStore((s) => s.activeProjectiles);
  return (
    <>
      {projectiles.map((p) => (
        <GunBolt key={p.id} projectile={p} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Individual bolt
// ---------------------------------------------------------------------------

function GunBolt({ projectile }: { projectile: GunProjectileType }) {
  const ref = useRef<THREE.Group>(null!);
  const { camera, scene } = useThree();
  const removeProjectile = useGunStore((s) => s.removeProjectile);
  const hasHit = useRef(false);

  useFrame((_, delta) => {
    if (!ref.current || hasHit.current) return;

    // Move forward
    _dir.set(...projectile.direction).normalize();
    const travel = GUN_CONFIG.projectileSpeed * delta;
    ref.current.position.x += _dir.x * travel;
    ref.current.position.y += _dir.y * travel;
    ref.current.position.z += _dir.z * travel;

    // Range check
    _pos.set(...projectile.origin);
    if (ref.current.position.distanceTo(_pos) > GUN_CONFIG.range) {
      removeProjectile(projectile.id);
      return;
    }

    // Hit detection
    const playerSlot = useGameStore.getState().playerSlot ?? 'player1';
    const isMyProjectile = projectile.caster === playerSlot;

    if (isMyProjectile) {
      // Check against opponent
      const opp = findOpponent(scene);
      if (opp) {
        opp.getWorldPosition(_oppPos);
        _oppPos.y += OPPONENT_CENTER_Y;
        if (ref.current.position.distanceTo(_oppPos) < PROJECTILE_HIT_RADIUS) {
          handleHitOpponent(projectile);
          hasHit.current = true;
        }
      }
    } else {
      // Check against player (camera)
      if (ref.current.position.distanceTo(camera.position) < PROJECTILE_HIT_RADIUS) {
        handleHitPlayer(projectile);
        hasHit.current = true;
      }
    }
  });

  function handleHitOpponent(p: GunProjectileType) {
    const { dealDamage, playerSlot, isMultiplayer } = useGameStore.getState();
    const opponentSlot: 'player1' | 'player2' =
      (playerSlot ?? 'player1') === 'player1' ? 'player2' : 'player1';

    // Forcefield blocks projectiles
    if (isForceFieldActive(opponentSlot)) {
      fireHitEvent({
        point: ref.current?.position.clone() ?? new THREE.Vector3(),
        amount: 0,
        isBlocked: true,
      });
      removeProjectile(p.id);
      return;
    }

    dealDamage(opponentSlot, GUN_CONFIG.damage);
    fireHitEvent({
      point: ref.current?.position.clone() ?? new THREE.Vector3(),
      amount: GUN_CONFIG.damage,
      isBlocked: false,
    });
    useScreenShakeStore.getState().trigger(0.3, 120);
    removeProjectile(p.id);

    if (isMultiplayer) {
      const newHealth = useGameStore.getState()[opponentSlot].health;
      gameSocket.send({
        type: 'damage_event',
        target: opponentSlot,
        amount: GUN_CONFIG.damage,
        newHealth,
      });
    }
  }

  function handleHitPlayer(p: GunProjectileType) {
    const { dealDamage, playerSlot } = useGameStore.getState();
    const mySlot = (playerSlot ?? 'player1') as 'player1' | 'player2';

    if (isForceFieldActive(mySlot)) {
      fireHitEvent({
        point: ref.current?.position.clone() ?? new THREE.Vector3(),
        amount: 0,
        isBlocked: true,
      });
      removeProjectile(p.id);
      return;
    }

    dealDamage(mySlot, GUN_CONFIG.damage);
    fireHitEvent({
      point: ref.current?.position.clone() ?? new THREE.Vector3(),
      amount: GUN_CONFIG.damage,
      isBlocked: false,
    });
    useScreenShakeStore.getState().trigger(0.4, 180);
    removeProjectile(p.id);
  }

  return (
    <group ref={ref} position={projectile.origin}>
      {/* Core bolt */}
      <mesh>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial
          color={GUN_CONFIG.color}
          emissive={GUN_CONFIG.emissive}
          emissiveIntensity={5}
          roughness={0}
        />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshStandardMaterial
          color={GUN_CONFIG.color}
          emissive={GUN_CONFIG.emissive}
          emissiveIntensity={2}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      {/* Trail elongation */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.06, 0.3, 6]} />
        <meshStandardMaterial
          color="#006688"
          emissive={GUN_CONFIG.emissive}
          emissiveIntensity={3}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
