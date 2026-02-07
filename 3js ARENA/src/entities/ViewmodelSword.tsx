// =============================================================================
// ViewmodelSword.tsx — First-person sword that follows the camera
// Left-click to swing. Slash sweeps through the crosshair (screen center).
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';

// Sword resting position: lower-right of screen, blade angled up-left
const IDLE_OFFSET = new THREE.Vector3(0.55, -0.5, -0.5);
const SWORD_SCALE = 0.65;
const SWING_DURATION = 0.25; // seconds — snappy

// Callback so other systems (combat) can know when a swing happens
type SwingCallback = () => void;
const swingListeners = new Set<SwingCallback>();

export function onSwordSwing(cb: SwingCallback): () => void {
  swingListeners.add(cb);
  return () => swingListeners.delete(cb);
}

export function ViewmodelSword() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);

  const swingTime = useRef(-1);
  const [, setIsSwinging] = useState(false);
  const swingNotified = useRef(false);

  // Left-click to swing while pointer is locked
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement) {
        if (swingTime.current < 0) {
          swingTime.current = 0;
          setIsSwinging(true);
          swingNotified.current = false;
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

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
    groupRef.current.visible = true;

    // Advance swing timer
    if (swingTime.current >= 0) {
      swingTime.current += delta;

      // Fire hit callback at the midpoint of the swing (when blade is at center)
      if (!swingNotified.current && swingTime.current >= SWING_DURATION * 0.35) {
        swingNotified.current = true;
        for (const cb of swingListeners) cb();
      }

      if (swingTime.current >= SWING_DURATION) {
        swingTime.current = -1;
        setIsSwinging(false);
      }
    }

    // ---- Position & rotation ----
    const offset = IDLE_OFFSET.clone();

    // Idle: blade tilted diagonally, tip pointing upper-left
    let rotX = 0;     // pitch
    let rotY = 0.3;   // yaw — blade angled slightly left
    let rotZ = 0.4;   // roll — tilted so blade goes upper-left

    if (swingTime.current >= 0) {
      const t = swingTime.current / SWING_DURATION; // 0 → 1

      // Eased swing curve (fast start, decelerate)
      const ease = 1 - Math.pow(1 - t, 3);

      // Slash: starts from idle (right side), sweeps through center, exits lower-left
      // At t≈0.35 the blade crosses the screen center (crosshair)
      offset.x += -ease * 0.7;           // sweep from right → past center → left
      offset.y += -ease * 0.15 + Math.sin(t * Math.PI) * 0.15; // arc up through center then down
      offset.z += -Math.sin(t * Math.PI) * 0.2; // lunge forward, peaking at mid-swing

      rotX += ease * 0.3;               // tilt blade forward
      rotY += -ease * 1.8;              // big yaw sweep to the left
      rotZ += ease * 1.0;               // roll the blade through the arc
    } else {
      // Idle bob
      const time = Date.now() * 0.001;
      offset.x += Math.sin(time * 1.5) * 0.003;
      offset.y += Math.sin(time * 2.0) * 0.005;
    }

    // Transform to world space
    const worldOffset = offset.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(worldOffset);

    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotX, rotY, rotZ)
    );
    groupRef.current.quaternion.copy(camera.quaternion).multiply(localQuat);
  });

  return (
    <group ref={groupRef} scale={SWORD_SCALE}>
      {/* Handle */}
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.18, 8]} />
        <meshStandardMaterial color="#5C3317" roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Guard */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.14, 0.02, 0.04]} />
        <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Blade */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.03, 0.6, 0.01]} />
        <meshStandardMaterial
          color="#dddddd"
          roughness={0.1}
          metalness={0.95}
        />
      </mesh>

      {/* Blade tip */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <coneGeometry args={[0.015, 0.08, 4]} />
        <meshStandardMaterial color="#dddddd" roughness={0.1} metalness={0.95} />
      </mesh>
    </group>
  );
}
