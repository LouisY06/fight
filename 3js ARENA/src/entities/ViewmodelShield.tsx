// =============================================================================
// ViewmodelShield.tsx — First-person shield that follows the camera
// Shield blocks incoming damage when right-click is held. Visual: raised when
// blocking, lowered when idle. Blocking state synced to GameState.
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { cvBridge } from '../cv/cvBridge';

// Shield resting position: lower-right (same side as the mecha arm)
const IDLE_OFFSET = new THREE.Vector3(0.4, -0.5, -0.55);
// Shield raised position: centered, high — covers more of the player view
const BLOCK_OFFSET = new THREE.Vector3(0.05, -0.15, -0.45);
const SHIELD_SCALE = 0.85;

export function ViewmodelShield() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const setPlayerBlocking = useGameStore((s) => s.setPlayerBlocking);
  const playerSlot = useGameStore((s) => s.playerSlot);

  const [isBlocking, setIsBlocking] = useState(false);
  const blockLerp = useRef(0);

  // Block on right-click while pointer is locked
  // NOTE: Shield is currently unused (sword is the only weapon).
  // Keeping this for potential future use.
  useEffect(() => {

    const onMouseDown = (e: MouseEvent) => {
      // Both left (0) and right (2) clicks activate block for shield
      if ((e.button === 0 || e.button === 2) && document.pointerLockElement) {
        setIsBlocking(true);
        const slot = playerSlot ?? 'player1';
        setPlayerBlocking(slot, true);
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        setIsBlocking(false);
        const slot = playerSlot ?? 'player1';
        setPlayerBlocking(slot, false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      // Ensure blocking is cleared when switching weapons
      const slot = playerSlot ?? 'player1';
      setPlayerBlocking(slot, false);
    };
  }, [playerSlot, setPlayerBlocking]);

  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay) {
      groupRef.current.visible = false;
      return;
    }

    // In CV mode, MechaArms renders the shield
    if (cvEnabled && cvInputRef.current.isTracking) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Smooth blocking transition
    const targetLerp = isBlocking ? 1 : 0;
    blockLerp.current += (targetLerp - blockLerp.current) * Math.min(1, delta * 12);

    // Interpolate between idle and block positions
    const offset = IDLE_OFFSET.clone().lerp(BLOCK_OFFSET, blockLerp.current);

    // Idle bob when not blocking
    if (!isBlocking) {
      const time = Date.now() * 0.001;
      offset.x += Math.sin(time * 1.2) * 0.004;
      offset.y += Math.sin(time * 1.8) * 0.006;
    }

    const worldOffset = offset.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(worldOffset);

    // Shield faces forward, slightly angled
    const rotX = blockLerp.current * 0.15;
    const rotY = 0.1 - blockLerp.current * 0.1;
    const rotZ = -0.1;
    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotX, rotY, rotZ)
    );
    groupRef.current.quaternion.copy(camera.quaternion).multiply(localQuat);
  });

  return (
    <group ref={groupRef} scale={SHIELD_SCALE}>
      {/* Shield body — layered metal plates */}
      <group>
        {/* Main shield face */}
        <mesh castShadow>
          <boxGeometry args={[0.70, 0.85, 0.04]} />
          <meshStandardMaterial
            color="#2a2d33"
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>

        {/* Center boss (raised dome) */}
        <mesh position={[0, 0, 0.03]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.04, 16]} />
          <meshStandardMaterial
            color="#4a4e55"
            roughness={0.15}
            metalness={0.95}
          />
        </mesh>

        {/* Top reinforcement strip */}
        <mesh position={[0, 0.34, 0.02]} castShadow>
          <boxGeometry args={[0.62, 0.04, 0.02]} />
          <meshStandardMaterial
            color="#4a4e55"
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {/* Bottom reinforcement strip */}
        <mesh position={[0, -0.34, 0.02]} castShadow>
          <boxGeometry args={[0.62, 0.04, 0.02]} />
          <meshStandardMaterial
            color="#4a4e55"
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {/* Emissive edge trim */}
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[0.72, 0.87, 0.005]} />
          <meshStandardMaterial
            color="#00aaff"
            emissive="#00aaff"
            emissiveIntensity={isBlocking ? 1.5 : 0.3}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Side rivets */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sy) => (
            <mesh
              key={`${sx}_${sy}`}
              position={[sx * 0.28, sy * 0.34, 0.025]}
              castShadow
            >
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#666" metalness={0.9} roughness={0.1} />
            </mesh>
          ))
        )}

        {/* Handle (back side) */}
        <mesh position={[0, 0, -0.04]} castShadow>
          <boxGeometry args={[0.06, 0.2, 0.03]} />
          <meshStandardMaterial color="#5C3317" roughness={0.85} metalness={0.15} />
        </mesh>
      </group>
    </group>
  );
}
