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
import { NetworkOpponent } from './entities/NetworkOpponent';
import { BotOpponent } from './entities/BotOpponent';
import { GAME_CONFIG } from './game/GameConfig';
import { FirstPersonCamera } from './game/FirstPersonCamera';
import { ViewmodelSword } from './entities/ViewmodelSword';
import { MechaArms } from './entities/MechaArms';
import { NetworkProvider } from './networking/NetworkProvider';
import { InputSyncBridge } from './networking/InputSyncBridge';
import { MeleeCombat } from './combat/MeleeCombat';
import { HitEffectManager } from './combat/HitEffectManager';

import { CVProvider } from './cv/CVProvider';
import { CVSync } from './cv/CVSync';
import { WebcamView } from './cv/WebcamView';

// UI Overlays
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { LobbyMenu } from './ui/LobbyMenu';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverScreen } from './ui/GameOverScreen';
import { ArenaLoadingOverlay } from './ui/ArenaLoadingOverlay';

function App() {
  return (
    <CVProvider>
      <NetworkProvider>
        <GameApp />
      </NetworkProvider>
    </CVProvider>
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

            {/* CV pose detection (runs every frame inside render loop) */}
            <CVSync />

            {/* First-person camera + viewmodel weapons + input sync + combat */}
            <FirstPersonCamera />
            <ViewmodelSword />
            <MechaArms />
            <MeleeCombat />
            <HitEffectManager />
            <InputSyncBridge />

            {/* Arena environment */}
            {showArena && <Arena theme={theme} />}

            {/* Opponent */}
            {showPlayers && (
              isMultiplayer ? (
                <NetworkOpponent color="#ff4444" />
              ) : (
                <BotOpponent color="#ff4444" />
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
      <ArenaLoadingOverlay />
      <HUD />
      <PauseMenu />
      <GameOverScreen />

      {/* Webcam PiP (shown when CV mode is active during gameplay) */}
      <WebcamView />
    </div>
  );
}

export default App;
