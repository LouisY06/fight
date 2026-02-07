// =============================================================================
// NetworkProvider.tsx — Real WebSocket networking context
// =============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { gameSocket } from './socket';
import type { ServerMessage, ClientMessage } from './protocol';
import { useGameStore } from '../game/GameState';

export interface OpponentState {
  position: [number, number, number];
  rotation: [number, number];
  isSwinging: boolean;
  isBlocking: boolean;
}

interface NetworkContextType {
  isConnected: boolean;
  roomId: string | null;
  playerSlot: 'player1' | 'player2' | null;
  opponentConnected: boolean;
  opponentState: OpponentState;
  error: string | null;
  // Actions
  connect: () => void;
  disconnect: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  findMatch: () => void;
  cancelMatch: () => void;
  sendInput: (input: Omit<ClientMessage & { type: 'player_input' }, 'type'>) => void;
  sendGameStart: (themeId: string) => void;
  sendDamage: (target: 'player1' | 'player2', amount: number) => void;
  sendRoundEnd: (winner: 'player1' | 'player2' | 'draw') => void;
}

const defaultOpponentState: OpponentState = {
  position: [0, 0, 2],
  rotation: [0, 0],
  isSwinging: false,
  isBlocking: false,
};

const NetworkContext = createContext<NetworkContextType>({
  isConnected: false,
  roomId: null,
  playerSlot: null,
  opponentConnected: false,
  opponentState: defaultOpponentState,
  error: null,
  connect: () => {},
  disconnect: () => {},
  createRoom: () => {},
  joinRoom: () => {},
  findMatch: () => {},
  cancelMatch: () => {},
  sendInput: () => {},
  sendGameStart: () => {},
  sendDamage: () => {},
  sendRoundEnd: () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerSlot, setPlayerSlot] = useState<'player1' | 'player2' | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opponentStateRef = useRef<OpponentState>({ ...defaultOpponentState });
  const [opponentState, setOpponentState] = useState<OpponentState>(defaultOpponentState);

  const setPhase = useGameStore((s) => s.setPhase);
  const startGame = useGameStore((s) => s.startGame);
  const dealDamage = useGameStore((s) => s.dealDamage);
  const endRound = useGameStore((s) => s.endRound);

  // Subscribe to socket events
  useEffect(() => {
    const unsubStatus = gameSocket.onStatus(setIsConnected);

    const unsubMsg = gameSocket.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case 'room_created':
          setRoomId(msg.roomId);
          setPlayerSlot(msg.playerSlot);
          setError(null);
          break;

        case 'room_joined':
          setRoomId(msg.roomId);
          setPlayerSlot(msg.playerSlot);
          setError(null);
          break;

        case 'match_found':
          setRoomId(msg.roomId);
          setPlayerSlot(msg.playerSlot);
          setError(null);
          break;

        case 'opponent_joined':
          setOpponentConnected(true);
          break;

        case 'opponent_left':
          setOpponentConnected(false);
          setError('Opponent disconnected');
          break;

        case 'error':
          setError(msg.message);
          break;

        // Gameplay relay
        case 'opponent_input':
          opponentStateRef.current = {
            position: msg.position,
            rotation: msg.rotation,
            isSwinging: msg.isSwinging,
            isBlocking: msg.isBlocking,
          };
          setOpponentState({ ...opponentStateRef.current });
          break;

        case 'opponent_damage':
          dealDamage(msg.target, msg.amount);
          break;

        case 'opponent_game_start':
          startGame(msg.themeId);
          break;

        case 'opponent_round_end':
          endRound(msg.winner);
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [setPhase, startGame, dealDamage, endRound]);

  // Actions
  const connect = useCallback(() => gameSocket.connect(), []);
  const disconnect = useCallback(() => {
    gameSocket.disconnect();
    setRoomId(null);
    setPlayerSlot(null);
    setOpponentConnected(false);
    setError(null);
  }, []);

  const createRoomAction = useCallback(() => {
    setError(null);
    gameSocket.send({ type: 'create_room' });
  }, []);

  const joinRoomAction = useCallback((code: string) => {
    setError(null);
    gameSocket.send({ type: 'join_room', roomId: code });
  }, []);

  const findMatchAction = useCallback(() => {
    setError(null);
    gameSocket.send({ type: 'find_match' });
  }, []);

  const cancelMatchAction = useCallback(() => {
    gameSocket.send({ type: 'cancel_match' });
  }, []);

  const sendInput = useCallback(
    (input: { position: [number, number, number]; rotation: [number, number]; isSwinging: boolean; isBlocking: boolean }) => {
      gameSocket.send({ type: 'player_input', ...input });
    },
    []
  );

  const sendGameStart = useCallback((themeId: string) => {
    gameSocket.send({ type: 'game_start', themeId });
  }, []);

  const sendDamage = useCallback((target: 'player1' | 'player2', amount: number) => {
    gameSocket.send({ type: 'damage_event', target, amount });
  }, []);

  const sendRoundEnd = useCallback((winner: 'player1' | 'player2' | 'draw') => {
    gameSocket.send({ type: 'round_end', winner });
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        roomId,
        playerSlot,
        opponentConnected,
        opponentState,
        error,
        connect,
        disconnect,
        createRoom: createRoomAction,
        joinRoom: joinRoomAction,
        findMatch: findMatchAction,
        cancelMatch: cancelMatchAction,
        sendInput,
        sendGameStart,
        sendDamage,
        sendRoundEnd,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
