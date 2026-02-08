// =============================================================================
// SpellEffects.tsx — Visual effects for spells (Fireball, Laser, Ice Blast)
// Renders active spells from SpellSystem store, handles movement + hit detection.
//
// PERF: No pointLights (expensive). Uses emissive materials only for glow.
//       Hit detection uses cached opponent ref instead of scene.traverse().
// =============================================================================

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useSpellStore,
  SPELL_CONFIGS,
  fireSpellHit,
  applyDebuff,
  isForceFieldActive,
  getForceFieldRemaining,
  type ActiveSpell,
} from './SpellSystem';
import { useGameStore } from '../game/GameState';
import { useScreenShakeStore } from '../game/useScreenShake';
import { fireHitEvent } from './HitEvent';
import { gameSocket } from '../networking/socket';

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _oppPos = new THREE.Vector3();

// Opponent group is at feet (y≈0). Offset to body center for hit checks.
const OPPONENT_CENTER_Y = 1.0;
const SPELL_HIT_RADIUS = 1.8; // generous — spells should feel satisfying to land

// ---------------------------------------------------------------------------
// Cache the opponent object so we don't scene.traverse() every frame
// ---------------------------------------------------------------------------

let cachedOpponent: THREE.Object3D | null = null;
let lastOpponentSearch = 0;

function findOpponent(scene: THREE.Scene): THREE.Object3D | null {
  const now = Date.now();
  // Only search every 500ms (opponents don't appear/disappear often)
  if (cachedOpponent && now - lastOpponentSearch < 500) return cachedOpponent;
  lastOpponentSearch = now;
  cachedOpponent = null;
  scene.traverse((obj) => {
    if (!cachedOpponent && obj.userData?.isOpponent) cachedOpponent = obj;
  });
  return cachedOpponent;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SpellEffects() {
  const spells = useSpellStore((s) => s.activeSpells);
  return (
    <>
      {spells.map((spell) => (
        <SpellProjectile key={spell.id} spell={spell} />
      ))}
      <ForceFieldVFX />
    </>
  );
}

function SpellProjectile({ spell }: { spell: ActiveSpell }) {
  const ref = useRef<THREE.Group>(null!);
  const { camera, scene } = useThree();
  const config = SPELL_CONFIGS[spell.type];
  const removeSpell = useSpellStore((s) => s.removeSpell);
  const hasHit = useRef(false);
  const laserHitChecked = useRef(false); // laser only checks hit once

  useFrame((_, delta) => {
    if (!ref.current || hasHit.current) return;

    const now = Date.now();

    // --- LASER: instant beam, check hit once, fade out ---
    if (spell.type === 'laser') {
      if (now - spell.spawnTime > 500) {
        removeSpell(spell.id);
        return;
      }
      const alpha = 1 - (now - spell.spawnTime) / 500;
      ref.current.scale.setScalar(alpha);
      if (!laserHitChecked.current) {
        laserHitChecked.current = true;
        checkBeamHit(spell);
      }
      return;
    }

    // --- PROJECTILE: move forward, check hit ---
    _dir.set(...spell.direction).normalize();
    const travel = config.speed * delta;
    ref.current.position.x += _dir.x * travel;
    ref.current.position.y += _dir.y * travel;
    ref.current.position.z += _dir.z * travel;

    ref.current.rotation.x += delta * 5;
    ref.current.rotation.z += delta * 3;

    // Range check
    _pos.set(...spell.origin);
    if (ref.current.position.distanceTo(_pos) > config.range) {
      removeSpell(spell.id);
      return;
    }

    // Hit detection (cheap — no scene.traverse)
    const playerSlot = useGameStore.getState().playerSlot ?? 'player1';
    const isMySpell = spell.caster === playerSlot;

    if (isMySpell) {
      const opp = findOpponent(scene);
      if (opp) {
        opp.getWorldPosition(_oppPos);
        // Offset to body center (group pos is at feet)
        _oppPos.y += OPPONENT_CENTER_Y;
        if (ref.current.position.distanceTo(_oppPos) < SPELL_HIT_RADIUS) {
          handleSpellHit(spell);
          hasHit.current = true;
        }
      }
    } else {
      if (ref.current.position.distanceTo(camera.position) < SPELL_HIT_RADIUS) {
        handleSpellHitOnPlayer(spell);
        hasHit.current = true;
      }
    }
  });

  function checkBeamHit(sp: ActiveSpell) {
    const playerSlot = useGameStore.getState().playerSlot ?? 'player1';
    const isMySpell = sp.caster === playerSlot;
    const beamOrigin = new THREE.Vector3(...sp.origin);
    const beamDir = new THREE.Vector3(...sp.direction).normalize();

    if (isMySpell) {
      const opp = findOpponent(scene);
      if (opp) {
        opp.getWorldPosition(_oppPos);
        _oppPos.y += OPPONENT_CENTER_Y; // offset to body center
        const toOpp = _oppPos.clone().sub(beamOrigin);
        const proj = toOpp.dot(beamDir);
        if (proj >= 0 && proj <= config.range) {
          const closest = beamOrigin.clone().add(beamDir.clone().multiplyScalar(proj));
          if (closest.distanceTo(_oppPos) < SPELL_HIT_RADIUS * 1.5) {
            handleSpellHit(sp);
            hasHit.current = true;
          }
        }
      }
    } else {
      const toPlayer = camera.position.clone().sub(beamOrigin);
      const proj = toPlayer.dot(beamDir);
      if (proj >= 0 && proj <= config.range) {
        const closest = beamOrigin.clone().add(beamDir.clone().multiplyScalar(proj));
        if (closest.distanceTo(camera.position) < SPELL_HIT_RADIUS * 1.5) {
          handleSpellHitOnPlayer(sp);
          hasHit.current = true;
        }
      }
    }
  }

  function handleSpellHit(sp: ActiveSpell) {
    const { dealDamage, playerSlot, isMultiplayer } = useGameStore.getState();
    const opponentSlot: 'player1' | 'player2' =
      (playerSlot ?? 'player1') === 'player1' ? 'player2' : 'player1';

    // Forcefield blocks all spell damage
    if (isForceFieldActive(opponentSlot)) {
      fireHitEvent({ point: ref.current?.position.clone() ?? new THREE.Vector3(), amount: 0, isBlocked: true });
      removeSpell(sp.id);
      return;
    }

    const config = SPELL_CONFIGS[sp.type];
    const dmg = config.damage;
    dealDamage(opponentSlot, dmg);
    // Apply debuff (stun/slow) to opponent
    applyDebuff(opponentSlot, config.debuff, config.debuffDurationMs);
    fireHitEvent({ point: ref.current?.position.clone() ?? new THREE.Vector3(), amount: dmg, isBlocked: false });
    fireSpellHit(sp);
    useScreenShakeStore.getState().trigger(0.5, 200);
    removeSpell(sp.id);

    if (isMultiplayer) {
      const newHealth = useGameStore.getState()[opponentSlot].health;
      gameSocket.send({ type: 'damage_event', target: opponentSlot, amount: dmg, newHealth });
    }
  }

  function handleSpellHitOnPlayer(sp: ActiveSpell) {
    const { dealDamage, playerSlot } = useGameStore.getState();
    const mySlot = (playerSlot ?? 'player1') as 'player1' | 'player2';

    // Forcefield blocks all spell damage
    if (isForceFieldActive(mySlot)) {
      fireHitEvent({ point: ref.current?.position.clone() ?? new THREE.Vector3(), amount: 0, isBlocked: true });
      removeSpell(sp.id);
      return;
    }

    const config = SPELL_CONFIGS[sp.type];
    const dmg = config.damage;
    dealDamage(mySlot, dmg);
    // Apply debuff to self (when hit by opponent's spell)
    applyDebuff(mySlot, config.debuff, config.debuffDurationMs);
    fireHitEvent({ point: ref.current?.position.clone() ?? new THREE.Vector3(), amount: dmg, isBlocked: false });
    fireSpellHit(sp);
    useScreenShakeStore.getState().trigger(0.6, 250);
    removeSpell(sp.id);
  }

  return (
    <group ref={ref} position={spell.origin}>
      {spell.type === 'fireball' && <FireballVFX />}
      {spell.type === 'laser' && <LaserBeamVFX spell={spell} />}
      {spell.type === 'ice_blast' && <IceBlastVFX />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Fireball VFX — emissive spheres only, no pointLight
// ---------------------------------------------------------------------------

function FireballVFX() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 8;
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15;
      meshRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      const glow = 1 + Math.sin(Date.now() * 0.015) * 0.2;
      glowRef.current.scale.setScalar(glow * 1.8);
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff6600" emissiveIntensity={4} roughness={0.2} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#ff8800" emissive="#ffaa00" emissiveIntensity={2} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------
// Laser Beam VFX — thin cylinder, no pointLight
// ---------------------------------------------------------------------------

function LaserBeamVFX({ spell }: { spell: ActiveSpell }) {
  const beamLength = SPELL_CONFIGS.laser.range;
  const dir = useMemo(() => new THREE.Vector3(...spell.direction).normalize(), [spell.direction]);
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  const coreRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (coreRef.current) {
      const flicker = 0.8 + Math.random() * 0.4;
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 5 * flicker;
    }
  });

  return (
    <group quaternion={quaternion}>
      <mesh ref={coreRef} position={[0, beamLength / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, beamLength, 6]} />
        <meshStandardMaterial color="#00ccff" emissive="#44eeff" emissiveIntensity={5} roughness={0} />
      </mesh>
      <mesh position={[0, beamLength / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, beamLength, 6]} />
        <meshStandardMaterial color="#0088cc" emissive="#00aaff" emissiveIntensity={2} transparent opacity={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Ice Blast VFX — icosahedron + shards, no pointLight
// ---------------------------------------------------------------------------

function IceBlastVFX() {
  const groupRef = useRef<THREE.Group>(null!);
  const shards = useMemo(() => {
    const out: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    for (let i = 0; i < 5; i++) {
      out.push({
        pos: [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: 0.08 + Math.random() * 0.1,
      });
    }
    return out;
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 6;
      groupRef.current.rotation.x += delta * 2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial color="#88ccff" emissive="#aaddff" emissiveIntensity={3} roughness={0.1} metalness={0.3} />
      </mesh>
      {shards.map((shard, i) => (
        <mesh key={i} position={shard.pos} rotation={shard.rot}>
          <coneGeometry args={[shard.scale * 0.5, shard.scale * 2, 4]} />
          <meshStandardMaterial color="#bbddff" emissive="#88ccff" emissiveIntensity={2} transparent opacity={0.6} roughness={0.05} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Force Field VFX — translucent dome around the player when active
// ---------------------------------------------------------------------------

function ForceFieldVFX() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(() => {
    if (!groupRef.current) return;
    const playerSlot = (useGameStore.getState().playerSlot ?? 'player1') as 'player1' | 'player2';
    const active = isForceFieldActive(playerSlot);

    groupRef.current.visible = active;
    if (!active) return;

    // Follow camera (player) position
    groupRef.current.position.set(camera.position.x, camera.position.y - 0.3, camera.position.z);

    // Pulse the opacity
    if (matRef.current) {
      const remaining = getForceFieldRemaining(playerSlot);
      const fade = remaining < 1 ? remaining : 1; // fade out in last second
      const pulse = 0.12 + Math.sin(Date.now() * 0.006) * 0.04;
      matRef.current.opacity = pulse * fade;
      matRef.current.emissiveIntensity = 1.5 * fade;
    }

    // Slow rotation for visual interest
    groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <sphereGeometry args={[1.6, 16, 12]} />
        <meshStandardMaterial
          ref={matRef}
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1.5}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner glow layer */}
      <mesh>
        <sphereGeometry args={[1.55, 12, 10]} />
        <meshStandardMaterial
          color="#44ffdd"
          emissive="#44ffdd"
          emissiveIntensity={0.8}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
