// =============================================================================
// ViewmodelGun.tsx — First-person mecha gun that follows the camera
// Keyboard mode: click to fire energy bolt.
// CV mode: MechaArms handles the gun visual (this component hides).
// Matches the mech aesthetic with glowing barrel and angular design.
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { useWeaponStore } from '../game/WeaponState';
import { useGunStore, GUN_CONFIG, fireGunEvent } from '../combat/GunState';
import { cvBridge } from '../cv/cvBridge';
import { isPlayerStunned } from '../combat/ClashEvent';

// Gun resting position: lower-right of screen, barrel forward
const IDLE_OFFSET = new THREE.Vector3(0.45, -0.38, -0.55);
const GUN_SCALE = 0.55;
const RECOIL_DURATION = GUN_CONFIG.recoilDuration;

// Pre-allocated temp objects
const _offset = new THREE.Vector3();
const _worldOffset = new THREE.Vector3();
const _localQuat = new THREE.Quaternion();
const _localEuler = new THREE.Euler();
const _forward = new THREE.Vector3();

export function ViewmodelGun() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const muzzleRef = useRef<THREE.Mesh>(null!);
  const phase = useGameStore((s) => s.phase);
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);
  const fireProjectile = useGunStore((s) => s.fireProjectile);
  const muzzleFlash = useGunStore((s) => s.muzzleFlashActive);
  const cvEnabled = cvBridge.cvEnabled;

  // Recoil state
  const recoilTime = useRef(-1);

  // Left-click to fire while pointer is locked (keyboard mode only, gun active)
  useEffect(() => {
    if (activeWeapon !== 'gun') return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement && !cvEnabled && !isPlayerStunned()) {
        const store = useGameStore.getState();
        if (store.phase !== 'playing') return;

        const playerSlot = (store.playerSlot ?? 'player1') as 'player1' | 'player2';

        // Get camera forward
        _forward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
        const origin = camera.position.clone().add(_forward.clone().multiplyScalar(0.5));

        const projectile = fireProjectile(playerSlot, origin, _forward.clone());
        if (projectile) {
          fireGunEvent(projectile);
          recoilTime.current = 0;
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [cvEnabled, activeWeapon, camera, fireProjectile]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Hide when sword is active
    if (activeWeapon !== 'gun') {
      groupRef.current.visible = false;
      if (recoilTime.current >= 0) recoilTime.current = -1;
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
    groupRef.current.visible = true;

    // CV mode: MechaArms handles the gun visual
    if (cvEnabled && cvBridge.cvInputRef.current.isTracking) {
      groupRef.current.visible = false;
      return;
    }

    // Advance recoil timer
    if (recoilTime.current >= 0) {
      recoilTime.current += delta;
      if (recoilTime.current >= RECOIL_DURATION) {
        recoilTime.current = -1;
      }
    }

    _offset.copy(IDLE_OFFSET);
    let rotX = -0.05;
    let rotY = 0.15;
    let rotZ = 0;

    // Stun vibration
    if (isPlayerStunned()) {
      const now = Date.now();
      _offset.x += Math.sin(now * 0.05) * 0.015;
      _offset.y += Math.cos(now * 0.07) * 0.01;
      rotZ += Math.sin(now * 0.04) * 0.05;
    }

    // Recoil animation
    if (recoilTime.current >= 0) {
      const t = recoilTime.current / RECOIL_DURATION;
      const kickback = Math.sin(t * Math.PI) * 0.8;
      _offset.z += kickback * 0.08;
      _offset.y += kickback * 0.02;
      rotX += -kickback * 0.12;
    } else {
      // Idle bob
      const time = Date.now() * 0.001;
      _offset.x += Math.sin(time * 1.2) * 0.002;
      _offset.y += Math.sin(time * 1.8) * 0.003;
    }

    _worldOffset.copy(_offset).applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(_worldOffset);

    _localEuler.set(rotX, rotY, rotZ);
    _localQuat.setFromEuler(_localEuler);
    groupRef.current.quaternion.copy(camera.quaternion).multiply(_localQuat);

    // Muzzle flash glow
    if (muzzleRef.current) {
      muzzleRef.current.visible = muzzleFlash;
    }
  });

  return (
    <group ref={groupRef} scale={GUN_SCALE}>
      {/* ---- Mecha Gun Body ---- */}

      {/* Main barrel housing */}
      <mesh position={[0, 0, -0.2]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.45]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.25}
          metalness={0.9}
        />
      </mesh>

      {/* Barrel core (inner) */}
      <mesh position={[0, 0, -0.45]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.2, 8]} />
        <meshStandardMaterial
          color="#111111"
          roughness={0.1}
          metalness={0.95}
          emissive="#00ccff"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Upper rail */}
      <mesh position={[0, 0.04, -0.12]} castShadow>
        <boxGeometry args={[0.04, 0.015, 0.32]} />
        <meshStandardMaterial color="#333333" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* Side panels (angular mech aesthetic) */}
      <mesh position={[0.04, -0.005, -0.15]} castShadow>
        <boxGeometry args={[0.015, 0.05, 0.25]} />
        <meshStandardMaterial color="#383838" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[-0.04, -0.005, -0.15]} castShadow>
        <boxGeometry args={[0.015, 0.05, 0.25]} />
        <meshStandardMaterial color="#383838" roughness={0.35} metalness={0.8} />
      </mesh>

      {/* Grip */}
      <mesh position={[0, -0.06, 0]} castShadow rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Energy conduit (glowing line along barrel) */}
      <mesh position={[0, -0.03, -0.2]}>
        <boxGeometry args={[0.065, 0.005, 0.4]} />
        <meshStandardMaterial
          color="#004466"
          emissive="#00ccff"
          emissiveIntensity={1.2}
          roughness={0}
          metalness={1}
        />
      </mesh>

      {/* Barrel tip ring */}
      <mesh position={[0, 0, -0.44]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.028, 0.005, 6, 8]} />
        <meshStandardMaterial
          color="#005577"
          emissive="#00ccff"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* ---- Muzzle flash ---- */}
      <mesh ref={muzzleRef} position={[0, 0, -0.56]} visible={false}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color="#88eeff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
