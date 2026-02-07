// =============================================================================
// PlayerAvatar.tsx — 3D model for the opponent (placeholder until GLB loaded)
// =============================================================================

import { useRef } from 'react';
import * as THREE from 'three';

interface PlayerAvatarProps {
  color: string;
  position?: [number, number, number];
}

/**
 * Placeholder humanoid avatar. Replace with useGLTF + Mixamo rigged model later.
 */
export function PlayerAvatar({ color, position = [0, 0, 0] }: PlayerAvatarProps) {
  const groupRef = useRef<THREE.Group>(null!);

  return (
    <group ref={groupRef} position={position}>
      {/* Torso */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.45, 1.1, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Right arm */}
      <mesh position={[0.45, 1.1, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.15, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.15, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}
