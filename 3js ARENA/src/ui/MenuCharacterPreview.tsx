// =============================================================================
// MenuCharacterPreview.tsx — 3D mech preview on main menu (lightweight Canvas)
// Interactive orbit: click + drag to spin the mech 360°
// =============================================================================

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MechaEntity } from '../entities/MechaEntity';
import { RiggedMechEntity } from '../riggedMechs/RiggedMechEntity';
import { useMechaCustomizationStore } from '../game/MechaCustomizationStore';

function MenuMech() {
  const { accentColor, segmentScales, avatarType, selectedPlayerMechId } = useMechaCustomizationStore();

  return (
    <group position={[0, -1.0, 0]} scale={0.9}>
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
          key={`menu-rigged-${selectedPlayerMechId}`}
          color={accentColor}
          mechIndex={selectedPlayerMechId}
          scaleHead={segmentScales.head}
          scaleTorso={segmentScales.torso}
          scaleArms={segmentScales.arms}
          scaleLegs={segmentScales.legs}
        />
      )}
    </group>
  );
}

function MenuLighting() {
  const accentColor = useMechaCustomizationStore((s) => s.accentColor);
  return (
    <>
      <ambientLight intensity={0.3} color="#1a2030" />
      <directionalLight position={[3, 4, 2]} intensity={1.0} color="#c0c8d0" castShadow />
      <pointLight position={[-2, 2, 2]} intensity={0.6} color={accentColor} />
      <pointLight position={[2, 0.5, 3]} intensity={0.3} color="#ff8c00" />
    </>
  );
}

export function MenuCharacterPreview() {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: 'grab',
      }}
      onPointerDown={(e) => {
        // Prevent the menu from swallowing drag events
        e.stopPropagation();
      }}
    >
      <Canvas
        camera={{
          position: [0, 0.6, 4.2],
          fov: 40,
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
        <MenuLighting />
        <MenuMech />

        {/* Interactive orbit — drag to spin, auto-rotates when idle */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.5}
          target={[0, 0.2, 0]}
          minPolarAngle={Math.PI / 3}       // limit looking from above
          maxPolarAngle={Math.PI / 1.8}     // limit looking from below
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
