// =============================================================================
// GameState.ts — Zustand store for global game state
// =============================================================================

import { create } from 'zustand';
import { GAME_CONFIG } from './GameConfig';

export type GamePhase =
  | 'menu'
  | 'lobby'
  | 'waiting'
  | 'arenaLoading'
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
  setPhase: (phase: GamePhase) => void;

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

  startRound: () =>
    set({
      phase: 'countdown',
      roundTimeRemaining: GAME_CONFIG.roundTime,
      roundWinner: null,
      player1: {
        ...get().player1,
        health: GAME_CONFIG.maxHealth,
        isBlocking: false,
      },
      player2: {
        ...get().player2,
        health: GAME_CONFIG.maxHealth,
        isBlocking: false,
      },
    }),

  endRound: (winner) => {
    const state = get();
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
    if (get().phase === 'playing') set({ phase: 'paused' });
  },

  resumeGame: () => {
    if (get().phase === 'paused') set({ phase: 'playing' });
  },

  dealDamage: (target, amount) => {
    const state = get();
    const player = state[target];
    const effectiveAmount = player.isBlocking
      ? amount * (1 - GAME_CONFIG.blockDamageReduction)
      : amount;
    const newHealth = Math.max(0, player.health - effectiveAmount);

    set({ [target]: { ...player, health: newHealth } });

    if (newHealth <= 0) {
      const winner = target === 'player1' ? 'player2' : 'player1';
      get().endRound(winner);
    }
  },

  setRoundTime: (time) => set({ roundTimeRemaining: time }),

  setPlayerBlocking: (player, blocking) => {
    const state = get();
    set({ [player]: { ...state[player], isBlocking: blocking } });
  },

  resetToMenu: () =>
    set({
      phase: 'menu',
      isMultiplayer: false,
      isHost: false,
      roomId: null,
      playerSlot: null,
      currentRound: 1,
      roundTimeRemaining: GAME_CONFIG.roundTime,
      roundWinner: null,
      currentThemeId: null,
      player1: defaultPlayerState(-GAME_CONFIG.playerSpawnDistance / 2),
      player2: defaultPlayerState(GAME_CONFIG.playerSpawnDistance / 2),
    }),
}));
