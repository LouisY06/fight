// =============================================================================
// ArenaPlatform.tsx — Octagonal fighting platform with Rapier colliders
// =============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { GAME_CONFIG } from '../game/GameConfig';

interface ArenaPlatformProps {
  edgeColor?: string;
}

export function ArenaPlatform({ edgeColor = '#ff4400' }: ArenaPlatformProps) {
  const radius = GAME_CONFIG.arenaRadius;
  const thickness = 0.5;
  const sides = 8; // octagon

  // Create octagonal shape
  const platformGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -thickness, 0);
    return geo;
  }, [radius, thickness]);

  // Edge ring geometry
  const edgeGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(radius - 0.15, radius + 0.05, sides, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [radius]);

  return (
    <group>
      {/* Platform mesh */}
      <mesh geometry={platformGeometry} receiveShadow>
        <meshStandardMaterial
          color="#333333"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Glowing edge ring */}
      <mesh geometry={edgeGeometry} position={[0, 0.01, 0]}>
        <meshStandardMaterial
          color={edgeColor}
          emissive={edgeColor}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Physics: floor collider */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[radius, thickness / 2, radius]}
          position={[0, -thickness / 2, 0]}
        />
      </RigidBody>

      {/* Physics: invisible cylindrical boundary wall */}
      <RigidBody type="fixed" colliders={false}>
        {/* Create wall segments around the perimeter */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const wallRadius = radius + 0.5;
          const x = Math.cos(angle) * wallRadius;
          const z = Math.sin(angle) * wallRadius;
          return (
            <CylinderCollider
              key={i}
              args={[3, 0.5]}
              position={[x, 3, z]}
            />
          );
        })}
      </RigidBody>
    </group>
  );
}
