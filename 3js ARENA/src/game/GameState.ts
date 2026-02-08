// =============================================================================
// GameState.ts — Zustand store for global game state
// =============================================================================

import { create } from 'zustand';
import { GAME_CONFIG, AI_DIFFICULTY, type AIDifficulty } from './GameConfig';

export type GamePhase =
  | 'menu'
  | 'lobby'
  | 'waiting'
  | 'arenaLoading'
  | 'intro'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'roundEnd'
  | 'gameOver';

export interface PlayerState {
  health: number;
  roundsWon: number;
  position: [number, number, number];
  isBlocking: boolean;
  lastAttackTime: number;
}

interface GameState {
  // Phase
  phase: GamePhase;
  /** Phase before pausing (so resume returns to the right place) */
  prePausePhase: GamePhase | null;
  setPhase: (phase: GamePhase) => void;

  // Username
  username: string;
  opponentName: string;
  setUsername: (name: string) => void;
  setOpponentName: (name: string) => void;

  // Multiplayer
  isMultiplayer: boolean;
  isHost: boolean;
  roomId: string | null;
  playerSlot: 'player1' | 'player2' | null;

  // Round
  currentRound: number;
  roundTimeRemaining: number;
  roundWinner: 'player1' | 'player2' | 'draw' | null;

  // Players
  player1: PlayerState;
  player2: PlayerState;

  // Arena
  currentThemeId: string | null;

  // AI Difficulty
  aiDifficulty: AIDifficulty;
  setAIDifficulty: (d: AIDifficulty) => void;

  /** For health bar damage flash — which player just took damage */
  lastDamagedPlayer: 'player1' | 'player2' | null;
  lastDamageTime: number;

  // Actions
  goToLobby: () => void;
  goToWaiting: (roomId: string | null) => void;
  setMultiplayerInfo: (info: { isHost: boolean; roomId: string | null; playerSlot: 'player1' | 'player2' | null }) => void;
  startGame: (themeId: string) => void;
  startRound: () => void;
  endRound: (winner: 'player1' | 'player2' | 'draw') => void;
  endGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  dealDamage: (target: 'player1' | 'player2', amount: number) => void;
  /** Set health directly (for authoritative network sync) */
  setHealth: (target: 'player1' | 'player2', health: number) => void;
  setRoundTime: (time: number) => void;
  setPlayerBlocking: (player: 'player1' | 'player2', blocking: boolean) => void;
  resetToMenu: () => void;
}

const defaultPlayerState = (spawnX: number): PlayerState => ({
  health: GAME_CONFIG.maxHealth,
  roundsWon: 0,
  position: [spawnX, 0, 0],
  isBlocking: false,
  lastAttackTime: 0,
});

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  prePausePhase: null,
  username: '',
  opponentName: '',
  setUsername: (name) => set({ username: name }),
  setOpponentName: (name) => set({ opponentName: name }),
  isMultiplayer: false,
  isHost: false,
  roomId: null,
  playerSlot: null,
  currentRound: 1,
  roundTimeRemaining: GAME_CONFIG.roundTime,
  roundWinner: null,
  player1: defaultPlayerState(-GAME_CONFIG.playerSpawnDistance / 2),
  player2: defaultPlayerState(GAME_CONFIG.playerSpawnDistance / 2),
  currentThemeId: null,
  aiDifficulty: 'medium',
  setAIDifficulty: (d) => set({ aiDifficulty: d }),
  lastDamagedPlayer: null,
  lastDamageTime: 0,

  setPhase: (phase) => set({ phase }),

  goToLobby: () => set({ phase: 'lobby', isMultiplayer: true }),

  goToWaiting: (roomId) => set({ phase: 'waiting', roomId }),

  setMultiplayerInfo: ({ isHost, roomId, playerSlot }) =>
    set({ isHost, roomId, playerSlot }),

  startGame: (themeId) =>
    set({
      phase: 'arenaLoading',
      currentThemeId: themeId,
      currentRound: 1,
      roundWinner: null,
      player1: defaultPlayerState(-GAME_CONFIG.playerSpawnDistance / 2),
      player2: defaultPlayerState(GAME_CONFIG.playerSpawnDistance / 2),
    }),

  startRound: () => {
    const state = get();
    // In practice mode, player gets bonus health based on difficulty
    const diffConfig = AI_DIFFICULTY[state.aiDifficulty];
    const p1Health = state.isMultiplayer
      ? GAME_CONFIG.maxHealth
      : Math.floor(GAME_CONFIG.maxHealth * diffConfig.playerHealthMultiplier);

    // Round 1 coming from arenaLoading: enter 'intro' phase first
    // (camera orbit + "ROUND 1" + "3, 2, 1" announcements).
    // IntroSequencer will call startRound() again when the orbit ends,
    // transitioning from 'intro' → 'countdown' (shows "FIGHT!").
    // Rounds 2+: skip intro, go straight to 'countdown' (full sequence).
    const useIntro = state.phase === 'arenaLoading';

    set({
      phase: useIntro ? 'intro' : 'countdown',
      roundTimeRemaining: GAME_CONFIG.roundTime,
      roundWinner: null,
      lastDamagedPlayer: null,
      player1: {
        ...state.player1,
        health: p1Health,
        isBlocking: false,
      },
      player2: {
        ...state.player2,
        health: GAME_CONFIG.maxHealth,
        isBlocking: false,
      },
    });
  },

  endRound: (winner) => {
    const state = get();
    // Guard: only end round if we're in a valid phase (prevents double-call corruption)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d3f7d08b-6cb2-4350-808e-89b409b0090c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameState.ts:endRound',message:'endRound called',data:{winner,currentPhase:state.phase,p1Health:state.player1.health,p2Health:state.player2.health,p1Rounds:state.player1.roundsWon,p2Rounds:state.player2.roundsWon},timestamp:Date.now(),hypothesisId:'D,E'})}).catch(()=>{});
    // #endregion
    const p1Wins =
      state.player1.roundsWon + (winner === 'player1' ? 1 : 0);
    const p2Wins =
      state.player2.roundsWon + (winner === 'player2' ? 1 : 0);

    const isGameOver =
      p1Wins >= GAME_CONFIG.roundsToWin ||
      p2Wins >= GAME_CONFIG.roundsToWin;

    set({
      phase: isGameOver ? 'gameOver' : 'roundEnd',
      roundWinner: winner,
      currentRound: state.currentRound + (isGameOver ? 0 : 1),
      player1: { ...state.player1, roundsWon: p1Wins },
      player2: { ...state.player2, roundsWon: p2Wins },
    });
  },

  endGame: () => set({ phase: 'gameOver' }),

  pauseGame: () => {
    const p = get().phase;
    // Allow pausing from any active gameplay phase
    const pausable: GamePhase[] = ['playing', 'countdown', 'roundEnd', 'gameOver'];
    if (pausable.includes(p)) {
      set({ phase: 'paused', prePausePhase: p });
    }
  },

  resumeGame: () => {
    if (get().phase === 'paused') {
      const resumeTo = get().prePausePhase ?? 'playing';
      set({ phase: resumeTo, prePausePhase: null });
    }
  },

  dealDamage: (target, amount) => {
    const state = get();
    // Guard: only deal damage during active gameplay
    if (state.phase !== 'playing' && state.phase !== 'countdown') return;
    const player = state[target];
    const effectiveAmount = amount;
    const newHealth = Math.max(0, player.health - effectiveAmount);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d3f7d08b-6cb2-4350-808e-89b409b0090c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameState.ts:dealDamage',message:'dealDamage called',data:{target,amount,isBlocking:player.isBlocking,effectiveAmount,oldHealth:player.health,newHealth,phase:state.phase},timestamp:Date.now(),hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion

    set({
      [target]: { ...player, health: newHealth },
      lastDamagedPlayer: target,
      lastDamageTime: Date.now(),
    });

    if (newHealth <= 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d3f7d08b-6cb2-4350-808e-89b409b0090c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameState.ts:dealDamage->endRound',message:'Health reached 0, calling endRound',data:{target,newHealth,phase:get().phase},timestamp:Date.now(),hypothesisId:'D,E'})}).catch(()=>{});
      // #endregion
      const winner = target === 'player1' ? 'player2' : 'player1';
      get().endRound(winner);
    }
  },

  setHealth: (target, health) => {
    const state = get();
    const player = state[target];
    const clampedHealth = Math.max(0, Math.min(GAME_CONFIG.maxHealth, health));

    set({
      [target]: { ...player, health: clampedHealth },
      lastDamagedPlayer: target,
      lastDamageTime: Date.now(),
    });

    if (clampedHealth <= 0) {
      const winner = target === 'player1' ? 'player2' : 'player1';
      get().endRound(winner);
    }
  },

  setRoundTime: (time) => set({ roundTimeRemaining: time }),

  setPlayerBlocking: (player, blocking) => {
    const state = get();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d3f7d08b-6cb2-4350-808e-89b409b0090c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameState.ts:setPlayerBlocking',message:'setPlayerBlocking called',data:{player,blocking,prevBlocking:state[player].isBlocking},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    set({ [player]: { ...state[player], isBlocking: blocking } });
  },

  resetToMenu: () =>
    set({
      phase: 'menu',
      prePausePhase: null,
      opponentName: '',
      isMultiplayer: false,
      isHost: false,
      roomId: null,
      playerSlot: null,
      currentRound: 1,
      roundTimeRemaining: GAME_CONFIG.roundTime,
      roundWinner: null,
      currentThemeId: null,
      lastDamagedPlayer: null,
      lastDamageTime: 0,
      player1: defaultPlayerState(-GAME_CONFIG.playerSpawnDistance / 2),
      player2: defaultPlayerState(GAME_CONFIG.playerSpawnDistance / 2),
    }),
}));
