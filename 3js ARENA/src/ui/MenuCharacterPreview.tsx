// =============================================================================
// MenuCharacterPreview.tsx — 3D mech preview on main menu (lightweight Canvas)
// =============================================================================

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MechaEntity } from '../entities/MechaEntity';
import { useMechaCustomizationStore } from '../game/MechaCustomizationStore';

function MenuMech() {
  const groupRef = useRef<THREE.Group>(null!);
  const { accentColor, segmentScales } = useMechaCustomizationStore();

  useFrame((state) => {
    if (groupRef.current) {
      // Slow idle rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0.9}>
      <MechaEntity
        color={accentColor}
        scaleHead={segmentScales.head}
        scaleTorso={segmentScales.torso}
        scaleArms={segmentScales.arms}
        scaleLegs={segmentScales.legs}
      />
    </group>
  );
}

function MenuLighting() {
  const accentColor = useMechaCustomizationStore((s) => s.accentColor);
  return (
    <>
      <ambientLight intensity={0.4} color="#331144" />
      <directionalLight position={[3, 4, 2]} intensity={1.2} color="#ff88aa" castShadow />
      <pointLight position={[-2, 2, 2]} intensity={0.8} color={accentColor} />
    </>
  );
}

export function MenuCharacterPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,0,25,0.15) 50%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{
          position: [3.2, 1.1, 3.2],
          fov: 38,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['transparent']} />
        <MenuLighting />
        <MenuMech />
      </Canvas>
    </div>
  );
}
