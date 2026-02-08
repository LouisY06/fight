// =============================================================================
// App.tsx — Root component: game state machine (first-person 1v1 arena)
// =============================================================================

import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import { useGameStore } from './game/GameState';
import { GameEngine } from './game/GameEngine';
import { IntroSequencer } from './game/IntroSequencer';
import { Arena } from './arena/Arena';
import { SceneBackground } from './arena/SceneBackground';
import { MechHangar } from './arena/MechHangar';
import { MenuSceneCamera } from './arena/MenuSceneCamera';
import { getThemeById, ARENA_THEMES } from './arena/arenaThemes';
import { NetworkOpponent } from './entities/NetworkOpponent';
import { BotOpponent } from './entities/BotOpponent';
import { GAME_CONFIG } from './game/GameConfig';
import { FirstPersonCamera } from './game/FirstPersonCamera';
import { ViewmodelSword } from './entities/ViewmodelSword';
import { ViewmodelGun } from './entities/ViewmodelGun';
import { ViewmodelShield } from './entities/ViewmodelShield';
import { MechaArms } from './entities/MechaArms';
import { NetworkProvider } from './networking/NetworkProvider';
import { InputSyncBridge } from './networking/InputSyncBridge';
import { MeleeCombat } from './combat/MeleeCombat';
import { HitEffectManager } from './combat/HitEffectManager';
import { SpellEffects } from './combat/SpellEffects';
import { SpellCaster } from './combat/SpellCaster';
import { BulletManager } from './combat/BulletManager';
import { initWeaponKeyListener } from './game/WeaponState';

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
import { SpellHUD } from './ui/SpellHUD';

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

  // Init weapon key listener (1=shield, 2=sword, 3=gun)
  useEffect(() => {
    return initWeaponKeyListener();
  }, []);

  const theme = currentThemeId ? getThemeById(currentThemeId) : ARENA_THEMES[0];

  const showArena =
    phase !== 'menu' && phase !== 'lobby' && phase !== 'waiting';

  const showPlayers =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd';

  // Canvas: menu (hangar) + game. Menu scene is lightweight (no Physics).
  const showCanvas =
    phase === 'menu' ||
    phase === 'arenaLoading' ||
    phase === 'intro' ||
    phase === 'countdown' ||
    phase === 'playing' ||
    phase === 'paused' ||
    phase === 'roundEnd' ||
    phase === 'gameOver';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: phase === 'menu' || phase === 'lobby' || phase === 'waiting'
          ? 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0015 50%, #000 100%)'
          : '#000000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 3D Canvas — only mount when game starts */}
      {showCanvas && (
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
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      >
        <Suspense fallback={null}>
          {phase === 'menu' ? (
            <>
              <MenuSceneCamera />
              <SceneBackground />
              <MechHangar position={[0, 0, 0]} scale={4} rotation={[0, 0, 0]} />
              <ambientLight intensity={0.5} color="#ffffff" />
              <directionalLight position={[5, 12, 5]} intensity={2} castShadow />
              <spotLight position={[0, 10, 0]} angle={0.6} penumbra={0.5} intensity={3} castShadow target-position={[0, 0, 0]} />
              <pointLight position={[4, 8, 4]} intensity={1.5} color="#ff8866" />
              <pointLight position={[-4, 6, -2]} intensity={0.8} color="#aaccff" />
            </>
          ) : (
            <>
              <Physics gravity={[0, -9.81, 0]}>
                {/* Game logic loop */}
                <GameEngine />

                {/* Glambot intro: orbit mech + Power On visor (runs during intro phase) */}
                <IntroSequencer />

                {/* CV pose detection (runs every frame inside render loop) */}
                <CVSync />

                {/* First-person camera + viewmodel weapons + input sync + combat */}
                <FirstPersonCamera />
                <ViewmodelSword />
                <ViewmodelGun />
                <ViewmodelShield />
                <MechaArms />
                <MeleeCombat />
                <HitEffectManager />
                <SpellEffects />
                <SpellCaster />
                <BulletManager />
                <InputSyncBridge />

                {/* Arena environment */}
                {showArena && <Arena theme={theme} />}

                {/* Opponent */}
                {showPlayers && (
                  isMultiplayer ? (
                    <NetworkOpponent color="#CC00FF" />
                  ) : (
                    <BotOpponent color="#CC00FF" />
                  )
                )}
              </Physics>
              {(phase === 'lobby' || phase === 'waiting') && (
                <>
                  <SceneBackground />
                  <ambientLight intensity={0.3} color="#220033" />
                  <pointLight position={[0, 8, 0]} intensity={2} color="#ff0066" />
                </>
              )}
            </>
          )}
        </Suspense>
      </Canvas>
      )}

      {/* UI Overlays — above Canvas when present, or full screen during menu */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <MainMenu />
        <LobbyMenu />
        <ArenaLoadingOverlay />
        <HUD />
        <SpellHUD />
        <PauseMenu />
        <GameOverScreen />
        <WebcamView />
      </div>
    </div>
  );
}

export default App;
