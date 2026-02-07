// =============================================================================
// App.tsx — Root component: game state machine (first-person 1v1 arena)
// =============================================================================

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import { useGameStore } from './game/GameState';
import { GameEngine } from './game/GameEngine';
import { Arena } from './arena/Arena';
import { getThemeById, ARENA_THEMES } from './arena/arenaThemes';
import { Player } from './entities/Player';
import { NetworkOpponent } from './entities/NetworkOpponent';
import { usePlayer2Input } from './game/InputManager';
import { GAME_CONFIG } from './game/GameConfig';
import { FirstPersonCamera } from './game/FirstPersonCamera';
import { ViewmodelSword } from './entities/ViewmodelSword';
import { NetworkProvider } from './networking/NetworkProvider';
import { InputSyncBridge } from './networking/InputSyncBridge';

// UI Overlays
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { LobbyMenu } from './ui/LobbyMenu';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverScreen } from './ui/GameOverScreen';

function App() {
  return (
    <NetworkProvider>
      <GameApp />
    </NetworkProvider>
  );
}

// ---------------------------------------------------------------------------
// Main Game
// ---------------------------------------------------------------------------

function GameApp() {
  const phase = useGameStore((s) => s.phase);
  const currentThemeId = useGameStore((s) => s.currentThemeId);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);

  const theme = currentThemeId ? getThemeById(currentThemeId) : ARENA_THEMES[0];

  const showArena =
    phase !== 'menu' && phase !== 'lobby' && phase !== 'waiting';

  const showPlayers =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{
          position: [0, 1.7, -GAME_CONFIG.playerSpawnDistance / 2],
          fov: 70,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            {/* Game logic loop */}
            <GameEngine />

            {/* First-person camera + viewmodel sword + input sync */}
            <FirstPersonCamera />
            <ViewmodelSword />
            <InputSyncBridge />

            {/* Arena environment */}
            {showArena && <Arena theme={theme} />}

            {/* Opponent */}
            {showPlayers && (
              isMultiplayer ? (
                <NetworkOpponent color="#ff4444" />
              ) : (
                <LocalOpponent />
              )
            )}
          </Physics>
        </Suspense>

        {/* Fallback lighting for menu/lobby */}
        {(phase === 'menu' || phase === 'lobby' || phase === 'waiting') && (
          <>
            <ambientLight intensity={0.3} color="#220033" />
            <pointLight position={[0, 8, 0]} intensity={2} color="#ff0066" />
          </>
        )}
      </Canvas>

      {/* UI Overlays (HTML on top of Canvas) */}
      <MainMenu />
      <LobbyMenu />
      <HUD />
      <PauseMenu />
      <GameOverScreen />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local opponent (for practice mode)
// ---------------------------------------------------------------------------

function LocalOpponent() {
  const p2Input = usePlayer2Input();

  return (
    <Player
      playerId="player2"
      input={p2Input}
      color="#ff4444"
      spawnPosition={[0, 0, GAME_CONFIG.playerSpawnDistance / 2]}
    />
  );
}

export default App;
