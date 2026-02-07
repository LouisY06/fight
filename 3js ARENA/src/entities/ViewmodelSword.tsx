// =============================================================================
// ViewmodelSword.tsx — First-person sword that follows the camera
// Keyboard mode: click to swing (canned animation).
// CV mode: sword tracks wrist position in real-time, damage on velocity swing.
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { useCVContext } from '../cv/CVProvider';
import { fireSwing } from '../combat/SwingEvent';
import { updateSwordTransform, setKeyboardSwingActive } from '../combat/SwordState';

// Sword resting position: lower-right of screen, blade angled up-left
const IDLE_OFFSET = new THREE.Vector3(0.55, -0.5, -0.5);
const SWORD_SCALE = 0.65;
const SWING_DURATION = 0.25; // seconds — snappy (keyboard mode only)

export function ViewmodelSword() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const { cvEnabled, cvInputRef } = useCVContext();

  // Keyboard mode swing state
  const swingTime = useRef(-1);
  const [, setIsSwinging] = useState(false);
  const swingNotified = useRef(false);

  // Left-click to swing while pointer is locked (keyboard mode only)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement && !cvEnabled) {
        if (swingTime.current < 0) {
          swingTime.current = 0;
          swingNotified.current = false;
          setIsSwinging(true);
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [cvEnabled]);

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

    // ---- CV mode: MechaArms handles the sword visual ----
    if (cvEnabled && cvInputRef.current.isTracking) {
      groupRef.current.visible = false;
      return; // MechaArms renders the sword in CV mode
    }

    // ---- Keyboard mode: canned swing animation ----

    // Advance swing timer
    if (swingTime.current >= 0) {
      swingTime.current += delta;
      setKeyboardSwingActive(true);

      // Fire hit callback at the midpoint of the swing (for sound/effects)
      if (!swingNotified.current && swingTime.current >= SWING_DURATION * 0.35) {
        swingNotified.current = true;
        fireSwing();
      }

      if (swingTime.current >= SWING_DURATION) {
        swingTime.current = -1;
        setKeyboardSwingActive(false);
        setIsSwinging(false);
      }
    }

    const offset = IDLE_OFFSET.clone();
    let rotX = 0;
    let rotY = 0.3;
    let rotZ = 0.4;

    if (swingTime.current >= 0) {
      const t = swingTime.current / SWING_DURATION;
      const ease = 1 - Math.pow(1 - t, 3);

      offset.x += -ease * 0.7;
      offset.y += -ease * 0.15 + Math.sin(t * Math.PI) * 0.15;
      offset.z += -Math.sin(t * Math.PI) * 0.2;

      rotX += ease * 0.3;
      rotY += -ease * 1.8;
      rotZ += ease * 1.0;
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

    // Publish world-space sword line for collision detection
    updateSwordTransform(groupRef.current);
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
        <meshStandardMaterial color="#dddddd" roughness={0.1} metalness={0.95} />
      </mesh>

      {/* Blade tip */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <coneGeometry args={[0.015, 0.08, 4]} />
        <meshStandardMaterial color="#dddddd" roughness={0.1} metalness={0.95} />
      </mesh>
    </group>
  );
}
