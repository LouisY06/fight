// =============================================================================
// ViewmodelGun.tsx — First-person gun that follows the camera
// Click to shoot: spawns a visible bullet projectile with recoil animation.
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { useWeaponStore } from '../game/WeaponState';
import { cvBridge } from '../cv/cvBridge';
import { useScreenShakeStore } from '../game/useScreenShake';
import { spawnBullet } from '../combat/BulletManager';

// Gun resting position: lower-right, close to center
const IDLE_OFFSET = new THREE.Vector3(0.28, -0.3, -0.4);
const GUN_SCALE = 0.85;
const FIRE_COOLDOWN = 0.5; // seconds between shots
const RECOIL_DURATION = 0.2; // seconds

// Pre-allocated temp objects (avoid per-frame GC pressure)
const _dir = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _worldOffset = new THREE.Vector3();
const _localQuat = new THREE.Quaternion();
const _localEuler = new THREE.Euler();
const _muzzleDir = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();

export function ViewmodelGun() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const muzzleFlashRef = useRef<THREE.Mesh>(null!);
  const phase = useGameStore((s) => s.phase);
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);

  // Fire state
  const fireTime = useRef(-1);
  const lastFireTime = useRef(0);
  const [, setForceRender] = useState(0);

  // Left-click to fire while pointer is locked
  useEffect(() => {
    if (activeWeapon !== 'gun') return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement) {
        const now = performance.now() / 1000;
        if (now - lastFireTime.current >= FIRE_COOLDOWN) {
          const gamePhase = useGameStore.getState().phase;
          if (gamePhase !== 'playing') return;

          fireTime.current = 0;
          lastFireTime.current = now;
          setForceRender((n) => n + 1);

          // Spawn visible bullet from gun muzzle
          camera.getWorldDirection(_muzzleDir);
          _muzzlePos.copy(camera.position).addScaledVector(_muzzleDir, 0.5);
          spawnBullet(_muzzlePos.clone(), _muzzleDir.clone());

          // Screen shake on fire
          useScreenShakeStore.getState().trigger(0.15, 80);
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [activeWeapon]);

  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (activeWeapon !== 'gun') {
      groupRef.current.visible = false;
      return;
    }

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay) {
      groupRef.current.visible = false;
      return;
    }

    // In CV mode, MechaArms renders the gun
    if (cvEnabled && cvInputRef.current.isTracking) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Advance recoil timer
    if (fireTime.current >= 0) {
      fireTime.current += delta;
      if (fireTime.current >= RECOIL_DURATION) {
        fireTime.current = -1;
      }
    }

    _offset.copy(IDLE_OFFSET);
    let rotX = 0;
    let rotY = 0.2;
    let rotZ = 0;

    if (fireTime.current >= 0) {
      // Recoil animation
      const t = fireTime.current / RECOIL_DURATION;
      const recoil = Math.sin(t * Math.PI) * 0.8;
      _offset.z += recoil * 0.08;
      _offset.y += recoil * 0.04;
      rotX -= recoil * 0.15;
    } else {
      // Idle bob
      const time = Date.now() * 0.001;
      _offset.x += Math.sin(time * 1.5) * 0.003;
      _offset.y += Math.sin(time * 2.0) * 0.005;
    }

    _worldOffset.copy(_offset).applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(_worldOffset);

    _localEuler.set(rotX, rotY, rotZ);
    _localQuat.setFromEuler(_localEuler);
    groupRef.current.quaternion.copy(camera.quaternion).multiply(_localQuat);

    // Muzzle flash
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible =
        fireTime.current >= 0 && fireTime.current < 0.06;
    }
  });

  return (
    <group ref={groupRef} scale={GUN_SCALE}>
      {/* Gun body — boxy sci-fi pistol */}
      <group>
        {/* Main receiver */}
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.08, 0.28]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Barrel (rotated so cylinder points forward along -Z) */}
        <mesh position={[0, 0.01, -0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.025, 0.2, 12]} />
          <meshStandardMaterial color="#1a1a1e" roughness={0.15} metalness={0.95} />
        </mesh>

        {/* Barrel shroud */}
        <mesh position={[0, 0.01, -0.18]} castShadow>
          <boxGeometry args={[0.055, 0.055, 0.14]} />
          <meshStandardMaterial color="#3d3d48" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Top rail */}
        <mesh position={[0, 0.05, -0.04]} castShadow>
          <boxGeometry args={[0.035, 0.015, 0.2]} />
          <meshStandardMaterial color="#4a4e55" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Grip */}
        <mesh position={[0, -0.08, 0.04]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.06]} />
          <meshStandardMaterial color="#5C3317" roughness={0.85} metalness={0.15} />
        </mesh>

        {/* Trigger guard */}
        <mesh position={[0, -0.04, -0.01]} castShadow>
          <boxGeometry args={[0.04, 0.015, 0.08]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Emissive accent strip (side) */}
        <mesh position={[0.032, 0, -0.04]}>
          <boxGeometry args={[0.003, 0.03, 0.15]} />
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff4400"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[-0.032, 0, -0.04]}>
          <boxGeometry args={[0.003, 0.03, 0.15]} />
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff4400"
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* Muzzle flash */}
        <mesh
          ref={muzzleFlashRef}
          position={[0, 0.01, -0.35]}
          visible={false}
        >
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color="#ffaa00"
            emissive="#ffaa00"
            emissiveIntensity={5}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
    </group>
  );
}
