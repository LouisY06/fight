// =============================================================================
// ViewmodelGun.tsx — First-person gun that follows the camera
// Click to shoot: hitscan raycast with recoil animation.
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { useWeaponStore } from '../game/WeaponState';
import { cvBridge } from '../cv/cvBridge';
import { GAME_CONFIG } from '../game/GameConfig';
import { fireHitEvent } from '../combat/HitEvent';
import { useScreenShakeStore } from '../game/useScreenShake';
import { gameSocket } from '../networking/socket';

// Gun resting position: lower-right, close to center
const IDLE_OFFSET = new THREE.Vector3(0.28, -0.3, -0.4);
const GUN_SCALE = 0.85;
const FIRE_COOLDOWN = 0.5; // seconds between shots
const RECOIL_DURATION = 0.2; // seconds
const GUN_RANGE = 50; // max raycast distance

// Opponent body approximated for hit detection
const OPPONENT_RADIUS = 0.45;

// Temp vectors
const _raycaster = new THREE.Raycaster();
const _oppPos = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function ViewmodelGun() {
  const { camera, scene } = useThree();
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
          fireTime.current = 0;
          lastFireTime.current = now;
          setForceRender((n) => n + 1);
          fireGunshot();
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [activeWeapon]);

  /** Hitscan raycast from camera center forward. */
  function fireGunshot() {
    const gamePhase = useGameStore.getState().phase;
    if (gamePhase !== 'playing') return;

    // Raycast from camera forward
    _raycaster.set(camera.position, camera.getWorldDirection(_dir));
    _raycaster.far = GUN_RANGE;

    // Check against all opponents
    let hitOpponent = false;
    scene.traverse((obj) => {
      if (hitOpponent) return;
      if (!obj.userData?.isOpponent) return;

      obj.getWorldPosition(_oppPos);
      if (camera.position.distanceTo(_oppPos) > GUN_RANGE) return;

      // Simple sphere test against opponent capsule center
      const capsuleCenter = _oppPos.clone();
      capsuleCenter.y += 1.1; // capsule midpoint

      // Project capsule center onto ray to find closest approach
      const rayOrigin = camera.position.clone();
      const rayDir = camera.getWorldDirection(_dir).normalize();
      const toTarget = capsuleCenter.clone().sub(rayOrigin);
      const projection = toTarget.dot(rayDir);

      if (projection < 0) return; // behind camera

      const closestPoint = rayOrigin.clone().add(rayDir.clone().multiplyScalar(projection));
      const dist = closestPoint.distanceTo(capsuleCenter);

      if (dist <= OPPONENT_RADIUS + 0.15) {
        hitOpponent = true;
        _hitPoint.copy(closestPoint);

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

    // Screen shake on fire regardless of hit
    useScreenShakeStore.getState().trigger(0.15, 80);
  }

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

    const offset = IDLE_OFFSET.clone();
    let rotX = 0;
    let rotY = 0.2;
    let rotZ = 0;

    if (fireTime.current >= 0) {
      // Recoil animation
      const t = fireTime.current / RECOIL_DURATION;
      const recoil = Math.sin(t * Math.PI) * 0.8;
      offset.z += recoil * 0.08;
      offset.y += recoil * 0.04;
      rotX -= recoil * 0.15;
    } else {
      // Idle bob
      const time = Date.now() * 0.001;
      offset.x += Math.sin(time * 1.5) * 0.003;
      offset.y += Math.sin(time * 2.0) * 0.005;
    }

    const worldOffset = offset.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(worldOffset);

    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotX, rotY, rotZ)
    );
    groupRef.current.quaternion.copy(camera.quaternion).multiply(localQuat);

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
