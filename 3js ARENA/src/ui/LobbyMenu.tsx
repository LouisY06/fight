// =============================================================================
// LobbyMenu.tsx — Online lobby: Quick Match / Create Room / Join Room
// =============================================================================

import { useState, useEffect } from 'react';
import { useGameStore } from '../game/GameState';
import { useNetwork } from '../networking/NetworkProvider';
import { ARENA_THEMES } from '../arena/arenaThemes';
import { randomPick } from '../utils/random';

type LobbyView = 'choose' | 'create' | 'join' | 'searching' | 'waiting';

export function LobbyMenu() {
  const phase = useGameStore((s) => s.phase);
  const resetToMenu = useGameStore((s) => s.resetToMenu);
  const startGame = useGameStore((s) => s.startGame);
  const setMultiplayerInfo = useGameStore((s) => s.setMultiplayerInfo);

  const {
    isConnected,
    roomId,
    playerSlot,
    opponentConnected,
    error,
    createRoom,
    joinRoom,
    findMatch,
    cancelMatch,
    disconnect,
    sendGameStart,
  } = useNetwork();

  const [view, setView] = useState<LobbyView>('choose');
  const [joinCode, setJoinCode] = useState('');

  // When opponent connects, auto-start the game (host picks theme)
  useEffect(() => {
    if (opponentConnected && roomId && playerSlot) {
      setMultiplayerInfo({
        isHost: playerSlot === 'player1',
        roomId,
        playerSlot,
      });

      // Host picks the arena and tells the opponent
      if (playerSlot === 'player1') {
        const theme = randomPick(ARENA_THEMES);
        sendGameStart(theme.id);
        startGame(theme.id);
      }
    }
  }, [opponentConnected, roomId, playerSlot, setMultiplayerInfo, sendGameStart, startGame]);

  // When we receive a game_start from the host (we're player2)
  // This is handled by NetworkProvider dispatching startGame

  if (phase !== 'lobby' && phase !== 'waiting') return null;

  const handleBack = () => {
    cancelMatch();
    disconnect();
    resetToMenu();
    setView('choose');
    setJoinCode('');
  };

  const handleQuickMatch = () => {
    setView('searching');
    findMatch();
  };

  const handleCreateRoom = () => {
    setView('create');
    createRoom();
  };

  const handleJoinRoom = () => {
    if (joinCode.trim().length >= 4) {
      setView('waiting');
      joinRoom(joinCode.trim().toUpperCase());
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at center, rgba(20,0,40,0.95) 0%, rgba(0,0,0,0.98) 100%)',
        zIndex: 200,
        gap: '16px',
      }}
    >
      {/* Connection status indicator */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: isConnected ? '#44cc66' : '#cc4444',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? '#44cc66' : '#cc4444',
            boxShadow: isConnected ? '0 0 8px #44cc66' : 'none',
          }}
        />
        {isConnected ? 'CONNECTED' : 'CONNECTING...'}
      </div>

      {/* Title */}
      <h2
        style={{
          color: '#ffffff',
          fontSize: '36px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          marginBottom: '8px',
        }}
      >
        {view === 'choose' && 'ONLINE 1v1'}
        {view === 'create' && 'YOUR ROOM'}
        {view === 'join' && 'JOIN ROOM'}
        {view === 'searching' && 'SEARCHING...'}
        {view === 'waiting' && 'WAITING...'}
      </h2>

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: '8px 20px',
            background: '#331111',
            border: '1px solid #662222',
            borderRadius: '4px',
            color: '#ff6666',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          {error}
        </div>
      )}

      {/* ---- Choose mode ---- */}
      {view === 'choose' && (
        <>
          <LobbyButton onClick={handleQuickMatch} primary disabled={!isConnected}>
            {isConnected ? 'QUICK MATCH' : 'CONNECTING...'}
          </LobbyButton>
          <LobbyButton onClick={handleCreateRoom} disabled={!isConnected}>CREATE ROOM</LobbyButton>
          <LobbyButton onClick={() => setView('join')} disabled={!isConnected}>JOIN ROOM</LobbyButton>
        </>
      )}

      {/* ---- Create room: show code ---- */}
      {view === 'create' && (
        <>
          <div
            style={{
              fontSize: '14px',
              color: '#888',
              fontFamily: 'monospace',
            }}
          >
            Share this code with your friend:
          </div>
          <div
            style={{
              fontSize: '64px',
              fontWeight: '900',
              fontFamily: 'monospace',
              color: '#ff4488',
              letterSpacing: '16px',
              textShadow: '0 0 30px rgba(255,0,80,0.5)',
              userSelect: 'all',
            }}
          >
            {roomId ?? '....'}
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#666',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}
          >
            Waiting for opponent...
          </div>
          <Spinner />
        </>
      )}

      {/* ---- Join room: enter code ---- */}
      {view === 'join' && (
        <>
          <div
            style={{
              fontSize: '14px',
              color: '#888',
              fontFamily: 'monospace',
            }}
          >
            Enter the 4-letter room code:
          </div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD"
            autoFocus
            maxLength={4}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            style={{
              fontSize: '48px',
              fontWeight: '900',
              fontFamily: 'monospace',
              textAlign: 'center',
              width: '240px',
              padding: '8px',
              background: '#1a1a1a',
              border: '2px solid #444',
              borderRadius: '8px',
              color: '#ffffff',
              letterSpacing: '16px',
              outline: 'none',
              textTransform: 'uppercase',
            }}
          />
          <LobbyButton
            onClick={handleJoinRoom}
            primary
            disabled={joinCode.trim().length < 4}
          >
            JOIN
          </LobbyButton>
        </>
      )}

      {/* ---- Searching for match ---- */}
      {view === 'searching' && (
        <>
          <div
            style={{
              fontSize: '16px',
              color: '#888',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}
          >
            Looking for an opponent...
          </div>
          <Spinner />
        </>
      )}

      {/* ---- Waiting in room ---- */}
      {view === 'waiting' && (
        <>
          <div
            style={{
              fontSize: '16px',
              color: '#888',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}
          >
            Joining room...
          </div>
          <Spinner />
        </>
      )}

      {/* Back button */}
      <div style={{ height: '8px' }} />
      <LobbyButton onClick={handleBack}>BACK</LobbyButton>
    </div>
  );
}

// ---- Components ----

function LobbyButton({
  onClick,
  children,
  primary,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '12px 48px',
        fontSize: '18px',
        fontWeight: 'bold',
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '3px',
        color: disabled ? '#555' : '#ffffff',
        background: disabled
          ? '#222'
          : primary
            ? 'linear-gradient(180deg, #ff2266, #cc0044)'
            : 'rgba(255, 255, 255, 0.08)',
        border: primary ? '2px solid #ff4488' : '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '4px',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: '240px',
        transition: 'transform 0.15s ease',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: '24px',
        height: '24px',
        border: '3px solid #333',
        borderTop: '3px solid #ff4488',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginTop: '8px',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
