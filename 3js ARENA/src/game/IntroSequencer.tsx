// =============================================================================
// IntroSequencer.tsx — Glambot-style intro: orbit around procedural MechaEntity
// Direct camera orbit (no CameraControls) so handoff to FirstPersonCamera is reliable.
// =============================================================================

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';
import { MechaEntity } from '../entities/MechaEntity';
import { RiggedMechEntity } from '../riggedMechs/RiggedMechEntity';
import { useMechaCustomizationStore } from './MechaCustomizationStore';

const INTRO_TARGET = new THREE.Vector3(0, 1, 0);
const ORBIT_RADIUS = 5;
const ORBIT_HEIGHT = 3;

export function IntroSequencer() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const { accentColor, segmentScales, avatarType, selectedPlayerMechId } = useMechaCustomizationStore();
  const introTime = useRef(0);
  const azimuth = useRef(0);

  useEffect(() => {
    if (phase !== 'intro') return;
    introTime.current = 0;
    azimuth.current = 0;
    // Initial orbit position
    camera.position.set(ORBIT_RADIUS, ORBIT_HEIGHT, 0);
    camera.lookAt(INTRO_TARGET);
    camera.updateMatrixWorld();
  }, [phase, camera]);

  useFrame((_, delta) => {
    if (phase !== 'intro') return;

    const duration = GAME_CONFIG.introDuration;
    introTime.current = Math.min(1, introTime.current + delta / duration);
    azimuth.current += delta * 1.2;
    const x = Math.cos(azimuth.current) * ORBIT_RADIUS;
    const z = Math.sin(azimuth.current) * ORBIT_RADIUS;
    camera.position.set(x, ORBIT_HEIGHT, z);
    camera.lookAt(INTRO_TARGET);
    camera.updateMatrixWorld();

    // When intro orbit finishes, go directly to playing
    // (health/timer already initialized by startRound() when entering intro)
    if (introTime.current >= 1) {
      setPhase('playing');
    }
  });

  return (
    <>
      {/* Glambot mech during intro only — uses player customization */}
      {phase === 'intro' && (
        <group position={[0, 0, 0]}>
          {avatarType === 'classic' ? (
            <MechaEntity
              color={accentColor}
              scaleHead={segmentScales.head}
              scaleTorso={segmentScales.torso}
              scaleArms={segmentScales.arms}
              scaleLegs={segmentScales.legs}
            />
          ) : (
            <RiggedMechEntity
              key={`intro-rigged-${selectedPlayerMechId}`}
              color={accentColor}
              mechIndex={selectedPlayerMechId}
              scaleHead={segmentScales.head}
              scaleTorso={segmentScales.torso}
              scaleArms={segmentScales.arms}
              scaleLegs={segmentScales.legs}
            />
          )}
        </group>
      )}
    </>
  );
}
