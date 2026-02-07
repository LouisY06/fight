// =============================================================================
// ArenaLighting.tsx — Dramatic per-theme lighting setup
// Boosted intensities to look good even without a skybox/environment map.
// =============================================================================

import type { ArenaTheme } from './arenaThemes';

interface ArenaLightingProps {
  theme: ArenaTheme;
}

export function ArenaLighting({ theme }: ArenaLightingProps) {
  return (
    <group>
      {/* Strong ambient so nothing is pitch black */}
      <ambientLight color="#ffffff" intensity={0.6} />

      {/* Themed ambient tint */}
      <ambientLight
        color={theme.ambientLight.color}
        intensity={theme.ambientLight.intensity * 3}
      />

      {/* Main overhead spotlight — dramatic top-down, casts shadows */}
      <spotLight
        color={theme.spotLights[0]?.color ?? '#ffffff'}
        intensity={(theme.spotLights[0]?.intensity ?? 2) * 4}
        position={theme.spotLights[0]?.position ?? [0, 15, 0]}
        angle={0.7}
        penumbra={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-near={1}
        target-position={[0, 0, 0]}
      />

      {/* Secondary overhead white light for general visibility */}
      <directionalLight
        color="#ffffff"
        intensity={1.5}
        position={[5, 20, 5]}
        castShadow
      />

      {/* Accent colored point lights — boosted */}
      {theme.spotLights.slice(1).map((light, i) => (
        <pointLight
          key={i}
          color={light.color}
          intensity={light.intensity * 4}
          position={light.position}
          distance={40}
          decay={1.5}
        />
      ))}

      {/* Strong hemisphere fill light */}
      <hemisphereLight
        color="#aaccff"
        groundColor={theme.ambientLight.color}
        intensity={0.8}
      />

      {/* Rim lights from the sides for dramatic depth */}
      <pointLight color="#ffffff" intensity={1.5} position={[-8, 5, 0]} distance={25} />
      <pointLight color="#ffffff" intensity={1.5} position={[8, 5, 0]} distance={25} />
    </group>
  );
}
