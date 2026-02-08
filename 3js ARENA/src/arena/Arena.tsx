// =============================================================================
// Arena.tsx — Main arena component: loads environment + platform + lighting
// =============================================================================

import { Suspense, useEffect } from 'react';
import { ArenaEnvironment } from './ArenaEnvironment';
import { ArenaPlatform } from './ArenaPlatform';
import { ArenaLighting } from './ArenaLighting';
import { ArenaEffects } from './ArenaEffects';
import { ArenaProps } from './ArenaProps';
import { MechHangar } from './MechHangar';
import { EnemyRimLight } from './EnemyRimLight';
import { GAME_CONFIG } from '../game/GameConfig';
import { useGameStore } from '../game/GameState';
import type { ArenaTheme } from './arenaThemes';

interface ArenaComponentProps {
  theme: ArenaTheme;
}

function ArenaInner({ theme }: ArenaComponentProps) {
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);

  // Arena loaded → start intro (Glambot circles mech, visor power-on), then countdown
  useEffect(() => {
    if (phase === 'arenaLoading') {
      setPhase('intro');
    }
  }, [phase, setPhase]);

  const radius = GAME_CONFIG.arenaRadius;
  return (
    <group>
      <ArenaEnvironment skyboxPath={theme.skybox} fogColor={theme.fog.color} />
      <ArenaPlatform edgeColor={theme.particleColor} />
      <ArenaLighting theme={theme} />
      {(phase === 'playing' || phase === 'countdown' || phase === 'roundEnd') && (
        <EnemyRimLight />
      )}
      <ArenaEffects theme={theme} />
      <ArenaProps accentColor={theme.particleColor} />
      {/* Mech hangar on one side of the arena */}
      <MechHangar
        position={[radius + 6, 0, 0]}
        scale={2.5}
        rotation={[0, -Math.PI / 2, 0]}
      />
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
