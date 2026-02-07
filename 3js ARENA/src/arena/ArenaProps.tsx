// =============================================================================
// ArenaProps.tsx — Decorative elements: pillars, barriers, torch lights
// =============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { GAME_CONFIG } from '../game/GameConfig';

interface ArenaPropsProps {
  accentColor?: string;
}

export function ArenaProps({ accentColor = '#ff4400' }: ArenaPropsProps) {
  const radius = GAME_CONFIG.arenaRadius;
  const pillarCount = 8;

  // Pillar positions evenly spaced around perimeter
  const pillarPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * (radius + 1.5);
      const z = Math.sin(angle) * (radius + 1.5);
      positions.push([x, 0, z]);
    }
    return positions;
  }, [radius]);

  return (
    <group>
      {/* Stone pillars */}
      {pillarPositions.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Pillar body */}
          <mesh castShadow position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 5, 8]} />
            <meshStandardMaterial
              color="#555555"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>

          {/* Pillar cap */}
          <mesh position={[0, 5.1, 0]}>
            <cylinderGeometry args={[0.5, 0.35, 0.3, 8]} />
            <meshStandardMaterial
              color="#444444"
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>

          {/* Torch light on top of each pillar */}
          <pointLight
            color={accentColor}
            intensity={0.5}
            distance={8}
            decay={2}
            position={[0, 5.5, 0]}
          />

          {/* Small glowing ember sphere (torch representation) */}
          <mesh position={[0, 5.4, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={3}
            />
          </mesh>
        </group>
      ))}

      {/* Chain/rope barriers between pillars */}
      {pillarPositions.map((pos, i) => {
        const nextPos = pillarPositions[(i + 1) % pillarCount];
        const midX = (pos[0] + nextPos[0]) / 2;
        const midZ = (pos[2] + nextPos[2]) / 2;
        const dx = nextPos[0] - pos[0];
        const dz = nextPos[2] - pos[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        return (
          <mesh
            key={`chain-${i}`}
            position={[midX, 2, midZ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, 0.08, 0.08]} />
            <meshStandardMaterial
              color="#666666"
              roughness={0.6}
              metalness={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}
