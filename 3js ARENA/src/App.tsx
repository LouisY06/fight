// =============================================================================
// App.tsx — Root component: game state machine (first-person 1v1 arena)
// =============================================================================

import { Suspense, Component, type ReactNode } from 'react';
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
import { MechaArms } from './entities/MechaArms';
import { NetworkProvider } from './networking/NetworkProvider';
import { InputSyncBridge } from './networking/InputSyncBridge';
import { MeleeCombat } from './combat/MeleeCombat';
import { HitEffectManager } from './combat/HitEffectManager';
import { SpellEffects } from './combat/SpellEffects';
import { SpellCaster } from './combat/SpellCaster';
import { BulletManager } from './combat/BulletManager';
// WeaponState.ts registers its own keydown listener at module level (1=sword, 2=gun)
import './game/WeaponState';

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
import { RoundAnnouncer } from './ui/RoundAnnouncer';

// ---------------------------------------------------------------------------
// Error boundary for Three.js / Canvas crashes
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CanvasErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0c10',
            color: '#ff8c00',
            fontFamily: "'Share Tech Mono', monospace",
            gap: '16px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', letterSpacing: '4px' }}>// RENDER ERROR</div>
          <div style={{ fontSize: '13px', color: '#888', maxWidth: '500px', wordBreak: 'break-word' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 32px',
              fontSize: '14px',
              fontFamily: "'Share Tech Mono', monospace",
              color: '#ff8c00',
              background: 'rgba(255, 140, 0, 0.08)',
              border: '1px solid rgba(255, 140, 0, 0.3)',
              cursor: 'pointer',
              letterSpacing: '2px',
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // Canvas: menu (hangar) + lobby/waiting + game. Menu scene is lightweight (no Physics).
  const showCanvas =
    phase === 'menu' ||
    phase === 'lobby' ||
    phase === 'waiting' ||
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
      {/* 3D Canvas — wrapped in error boundary for crash recovery */}
      {showCanvas && (
      <CanvasErrorBoundary>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
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
          powerPreference: 'high-performance',
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
      </CanvasErrorBoundary>
      )}

      {/* UI Overlays — above Canvas when present, or full screen during menu */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <MainMenu />
        <LobbyMenu />
        <ArenaLoadingOverlay />
        <HUD />
        <SpellHUD />
        {/* RoundAnnouncer rendered outside HUD so it's visible during intro + countdown */}
        <RoundAnnouncer />
        <PauseMenu />
        <GameOverScreen />
        <WebcamView />
      </div>
    </div>
  );
}

export default App;
