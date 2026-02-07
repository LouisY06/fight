// =============================================================================
// Arena.tsx — Main arena component: loads environment + platform + lighting
// =============================================================================

import { Suspense, useEffect } from 'react';
import { ArenaEnvironment } from './ArenaEnvironment';
import { ArenaPlatform } from './ArenaPlatform';
import { ArenaLighting } from './ArenaLighting';
import { ArenaEffects } from './ArenaEffects';
import { ArenaProps } from './ArenaProps';
import { useArenaReady } from '../game/GameEngine';
import type { ArenaTheme } from './arenaThemes';

interface ArenaComponentProps {
  theme: ArenaTheme;
}

function ArenaInner({ theme }: ArenaComponentProps) {
  const onArenaReady = useArenaReady();

  // Signal that the arena has loaded
  useEffect(() => {
    onArenaReady();
  }, [onArenaReady]);

  return (
    <group>
      <ArenaEnvironment skyboxPath={theme.skybox} fogColor={theme.fog.color} />
      <ArenaPlatform edgeColor={theme.particleColor} />
      <ArenaLighting theme={theme} />
      <ArenaEffects theme={theme} />
      <ArenaProps accentColor={theme.particleColor} />
    </group>
  );
}

export function Arena({ theme }: ArenaComponentProps) {
  return (
    <Suspense fallback={null}>
      <ArenaInner theme={theme} />
    </Suspense>
  );
}
