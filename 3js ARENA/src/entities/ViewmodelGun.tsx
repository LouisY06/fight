// =============================================================================
// ViewmodelGun.tsx — First-person heavy blaster that follows the camera
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

// Gun resting position: lower-right, pushed out for bigger weapon
const IDLE_OFFSET = new THREE.Vector3(0.32, -0.34, -0.48);
const GUN_SCALE = 0.90;
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

// Shared materials (matching MechaGeometry palette)
const matDark = { color: '#2a2d33', roughness: 0.2, metalness: 0.9 };
const matBlue = { color: '#4a4e55', roughness: 0.22, metalness: 0.75 };
const matPanel = { color: '#1e2024', roughness: 0.18, metalness: 0.8 };
const matChrome = { color: '#8a8d94', roughness: 0.08, metalness: 0.92 };
const matHandle = { color: '#1a1a1a', roughness: 0.6, metalness: 0.4 };
const matGlow = { color: '#ff4400', emissive: '#ff4400', emissiveIntensity: 1.0 };

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
      // Recoil animation — heavier kick for bigger gun
      const t = fireTime.current / RECOIL_DURATION;
      const recoil = Math.sin(t * Math.PI) * 0.8;
      _offset.z += recoil * 0.10;
      _offset.y += recoil * 0.05;
      rotX -= recoil * 0.18;
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
      <group>
        {/* ---- Main receiver body ---- */}
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.18, 0.60]} />
          <meshStandardMaterial {...matDark} />
        </mesh>

        {/* Receiver top bevel */}
        <mesh position={[0, 0.10, 0]} castShadow>
          <boxGeometry args={[0.14, 0.04, 0.55]} />
          <meshStandardMaterial {...matBlue} />
        </mesh>

        {/* Receiver bottom plate */}
        <mesh position={[0, -0.10, 0]} castShadow>
          <boxGeometry args={[0.14, 0.03, 0.45]} />
          <meshStandardMaterial {...matPanel} />
        </mesh>

        {/* ---- Twin barrels ---- */}
        {[-0.03, 0.03].map((side, i) => (
          <group key={`barrel-${i}`}>
            <mesh position={[side, 0.02, -0.48]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.035, 0.50, 10]} />
              <meshStandardMaterial {...matChrome} />
            </mesh>
            <mesh position={[side, 0.02, -0.74]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.06, 8]} />
              <meshStandardMaterial {...matPanel} />
            </mesh>
          </group>
        ))}

        {/* ---- Barrel shroud ---- */}
        <mesh position={[0, 0.02, -0.38]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.38]} />
          <meshStandardMaterial {...matBlue} />
        </mesh>

        {/* Shroud vents */}
        {[0, 1, 2, 3].map((i) => (
          <group key={`vent-${i}`}>
            <mesh position={[0.072, 0.02, -0.26 - i * 0.07]}>
              <boxGeometry args={[0.008, 0.04, 0.035]} />
              <meshStandardMaterial {...matPanel} />
            </mesh>
            <mesh position={[-0.072, 0.02, -0.26 - i * 0.07]}>
              <boxGeometry args={[0.008, 0.04, 0.035]} />
              <meshStandardMaterial {...matPanel} />
            </mesh>
          </group>
        ))}

        {/* Shroud inset */}
        <mesh position={[0, 0.02, -0.38]}>
          <boxGeometry args={[0.10, 0.08, 0.34]} />
          <meshStandardMaterial {...matPanel} />
        </mesh>

        {/* ---- Muzzle brake ---- */}
        <mesh position={[0, 0.02, -0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.055, 0.012, 6, 8]} />
          <meshStandardMaterial {...matChrome} />
        </mesh>

        {/* Muzzle glow core */}
        <mesh position={[0, 0.02, -0.72]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial {...matGlow} />
        </mesh>

        {/* ---- Top rail (picatinny) ---- */}
        <mesh position={[0, 0.13, -0.02]} castShadow>
          <boxGeometry args={[0.08, 0.025, 0.55]} />
          <meshStandardMaterial {...matChrome} />
        </mesh>

        {/* Rail notches */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <mesh key={`notch-${i}`} position={[0, 0.145, 0.20 - i * 0.065]}>
            <boxGeometry args={[0.082, 0.008, 0.012]} />
            <meshStandardMaterial {...matPanel} />
          </mesh>
        ))}

        {/* ---- Holographic sight ---- */}
        <mesh position={[0, 0.16, 0.06]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.06]} />
          <meshStandardMaterial {...matDark} />
        </mesh>
        <mesh position={[0, 0.20, 0.03]}>
          <boxGeometry args={[0.05, 0.06, 0.005]} />
          <meshStandardMaterial {...matChrome} />
        </mesh>
        <mesh position={[0, 0.20, 0.028]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.008, 0.014, 6]} />
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff4400"
            emissiveIntensity={2.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* ---- Grip ---- */}
        <mesh position={[0, -0.20, 0.12]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.09, 0.26, 0.10]} />
          <meshStandardMaterial {...matHandle} />
        </mesh>

        {/* Grip armor plate */}
        <mesh position={[0, -0.10, 0.11]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.095, 0.06, 0.105]} />
          <meshStandardMaterial {...matDark} />
        </mesh>

        {/* Grip chrome wraps */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={`gwrap-${i}`} position={[0, -0.12 - i * 0.05, 0.115 + i * 0.008]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.095, 0.014, 0.105]} />
            <meshStandardMaterial {...matChrome} />
          </mesh>
        ))}

        {/* ---- Trigger guard ---- */}
        <mesh position={[0, -0.06, 0.06]} castShadow>
          <boxGeometry args={[0.08, 0.025, 0.14]} />
          <meshStandardMaterial {...matDark} />
        </mesh>

        {/* ---- Side energy channels ---- */}
        {[-1, 1].map((side) => (
          <group key={`side-${side}`}>
            {/* Energy strip */}
            <mesh position={[side * 0.082, 0, -0.10]}>
              <boxGeometry args={[0.006, 0.06, 0.40]} />
              <meshStandardMaterial {...matGlow} />
            </mesh>

            {/* Energy nodes */}
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={`node-${side}-${i}`} position={[side * 0.084, 0, 0.08 - i * 0.10]}>
                <sphereGeometry args={[0.010, 6, 4]} />
                <meshStandardMaterial {...matGlow} />
              </mesh>
            ))}

            {/* Side armor panel */}
            <mesh position={[side * 0.09, 0, -0.06]} castShadow>
              <boxGeometry args={[0.02, 0.12, 0.30]} />
              <meshStandardMaterial {...matBlue} />
            </mesh>
          </group>
        ))}

        {/* ---- Foregrip ---- */}
        <mesh position={[0, -0.12, -0.18]} castShadow>
          <boxGeometry args={[0.06, 0.10, 0.06]} />
          <meshStandardMaterial {...matHandle} />
        </mesh>
        <mesh position={[0, -0.08, -0.18]} castShadow>
          <boxGeometry args={[0.08, 0.03, 0.08]} />
          <meshStandardMaterial {...matDark} />
        </mesh>

        {/* ---- Stock ---- */}
        <mesh position={[0, -0.02, 0.32]} castShadow>
          <boxGeometry args={[0.10, 0.10, 0.18]} />
          <meshStandardMaterial {...matDark} />
        </mesh>
        <mesh position={[0, -0.02, 0.41]}>
          <boxGeometry args={[0.12, 0.12, 0.03]} />
          <meshStandardMaterial {...matPanel} />
        </mesh>
        {/* Stock energy accent */}
        <mesh position={[0, -0.02, 0.32]}>
          <boxGeometry args={[0.006, 0.08, 0.14]} />
          <meshStandardMaterial {...matGlow} />
        </mesh>

        {/* ---- Magazine / power cell ---- */}
        <mesh position={[0, -0.16, 0.05]} castShadow>
          <boxGeometry args={[0.08, 0.14, 0.07]} />
          <meshStandardMaterial {...matPanel} />
        </mesh>
        <mesh position={[0, -0.16, 0.085]}>
          <boxGeometry args={[0.04, 0.10, 0.005]} />
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff4400"
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* ---- Muzzle flash ---- */}
        <mesh
          ref={muzzleFlashRef}
          position={[0, 0.02, -0.78]}
          visible={false}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
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
