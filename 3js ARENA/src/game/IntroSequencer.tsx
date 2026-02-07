// =============================================================================
// IntroSequencer.tsx — Glambot-style intro: orbit around procedural MechaEntity
// Direct camera orbit (no CameraControls) so handoff to FirstPersonCamera is reliable.
// =============================================================================

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';
import { MechaEntity } from '../entities/MechaEntity';
import { useMechaCustomizationStore } from './MechaCustomizationStore';

const INTRO_TARGET = new THREE.Vector3(0, 1, 0);
const ORBIT_RADIUS = 5;
const ORBIT_HEIGHT = 3;
const SPAWN_Z = -GAME_CONFIG.playerSpawnDistance / 2;
const EYE_HEIGHT = 1.7;

export function IntroSequencer() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const startRound = useGameStore((s) => s.startRound);
  const { accentColor, segmentScales } = useMechaCustomizationStore();
  const introTime = useRef(0);
  const azimuth = useRef(0);
  const countdownSnapDone = useRef(false);

  useEffect(() => {
    if (phase !== 'intro') return;
    introTime.current = 0;
    countdownSnapDone.current = false;
    azimuth.current = 0;
    // Initial orbit position
    camera.position.set(ORBIT_RADIUS, ORBIT_HEIGHT, 0);
    camera.lookAt(INTRO_TARGET);
    camera.updateMatrixWorld();
  }, [phase, camera]);

  useFrame((state, delta) => {
    if (phase === 'intro') {
      const duration = GAME_CONFIG.introDuration;
      introTime.current = Math.min(1, introTime.current + delta / duration);
      azimuth.current += delta * 1.2;
      const x = Math.cos(azimuth.current) * ORBIT_RADIUS;
      const z = Math.sin(azimuth.current) * ORBIT_RADIUS;
      camera.position.set(x, ORBIT_HEIGHT, z);
      camera.lookAt(INTRO_TARGET);
      camera.updateMatrixWorld();

      if (introTime.current >= 1) {
        startRound();
      }
      return;
    }

    if (phase === 'countdown' && !countdownSnapDone.current) {
      countdownSnapDone.current = true;
      // Snap to first-person spawn so arena is visible; FirstPersonCamera will keep it
      camera.position.set(0, EYE_HEIGHT, SPAWN_Z);
      camera.lookAt(0, EYE_HEIGHT, SPAWN_Z + 4);
      camera.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Glambot mech during intro only — uses player customization */}
      {phase === 'intro' && (
        <group position={[0, 0, 0]}>
          <MechaEntity
            color={accentColor}
            scaleHead={segmentScales.head}
            scaleTorso={segmentScales.torso}
            scaleArms={segmentScales.arms}
            scaleLegs={segmentScales.legs}
          />
        </group>
      )}

      {/* 3D FIGHT! text during countdown — emissive glow */}
      {phase === 'countdown' && (
        <Text
          position={[0, 2, -3]}
          fontSize={0.8}
          color="#ff0044"
          anchorX="center"
          anchorY="middle"
        >
          FIGHT!
          <meshStandardMaterial
            color="#ff0044"
            emissive="#ff0044"
            emissiveIntensity={5}
          />
        </Text>
      )}
    </>
  );
}
