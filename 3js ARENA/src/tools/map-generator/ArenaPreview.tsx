// =============================================================================
// ArenaPreview.tsx — Live Three.js preview for generated arena images
// =============================================================================

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { GAME_CONFIG } from '../../game/GameConfig';

interface ArenaPreviewProps {
  imageDataUrl: string | null;
}

export function ArenaPreview({ imageDataUrl }: ArenaPreviewProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#111111',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          {imageDataUrl && <SkyboxFromDataUrl dataUrl={imageDataUrl} />}
          <PreviewPlatform />
          <ambientLight intensity={0.3} />
          <spotLight
            position={[0, 15, 0]}
            intensity={2}
            castShadow
            angle={0.5}
            penumbra={0.5}
          />
          <OrbitControls
            enablePan={false}
            minDistance={3}
            maxDistance={20}
            target={[0, 1, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

/**
 * Load a data URL as an equirectangular environment/skybox.
 */
function SkyboxFromDataUrl({ dataUrl }: { dataUrl: string }) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(dataUrl);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }, [dataUrl]);

  return (
    <>
      <primitive object={texture} attach="background" />
      <primitive object={texture} attach="environment" />
    </>
  );
}

/**
 * Simple preview platform matching the game arena dimensions.
 */
function PreviewPlatform() {
  const radius = GAME_CONFIG.arenaRadius;

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial
          color="#333333"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Edge glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius - 0.1, radius + 0.05, 32]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff4400"
          emissiveIntensity={2}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}
