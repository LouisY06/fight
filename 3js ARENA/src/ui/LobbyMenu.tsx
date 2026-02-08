// =============================================================================
// LobbyMenu.tsx — Online lobby: Quick Match / Create Room / Join Room
// Military mech command center aesthetic
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { useNetwork } from '../networking/NetworkProvider';
import { MapSelector } from './MapSelector';
import { COLORS, FONTS, CLIP } from './theme';
import { MechButton } from './MainMenu';

type LobbyView = 'choose' | 'create' | 'join' | 'searching' | 'waiting' | 'map_select' | 'map_select_waiting';

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
  const [copied, setCopied] = useState(false);
  const joinInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus join input
  useEffect(() => {
    if (view === 'join' && joinInputRef.current) {
      joinInputRef.current.focus();
    }
  }, [view]);

  // When opponent connects, randomly decide which player picks the map.
  // Use roomId to deterministically agree on the picker (both clients
  // compute the same result from the shared room code).
  useEffect(() => {
    if (opponentConnected && roomId && playerSlot) {
      setMultiplayerInfo({
        isHost: playerSlot === 'player1',
        roomId,
        playerSlot,
      });

      // Deterministic coin flip based on roomId
      const pickerIsP1 = roomId.charCodeAt(0) % 2 === 0;
      const isMapPicker = pickerIsP1
        ? playerSlot === 'player1'
        : playerSlot === 'player2';

      if (isMapPicker) {
        setView('map_select');
      } else {
        setView('map_select_waiting');
      }
    }
  }, [opponentConnected, roomId, playerSlot, setMultiplayerInfo]);

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

  const handleMapSelected = (themeId: string) => {
    sendGameStart(themeId);
    startGame(themeId);
  };

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
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
        background: `linear-gradient(180deg, ${COLORS.bgDeep} 0%, ${COLORS.bgDark} 100%)`,
        zIndex: 200,
        gap: '14px',
      }}
    >
      {/* Noise overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          background: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%) 0 0 / 3px 3px',
          pointerEvents: 'none',
        }}
      />

      {/* Connection indicator */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontFamily: FONTS.mono,
          color: isConnected ? COLORS.green : COLORS.red,
          letterSpacing: '1px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? COLORS.green : COLORS.red,
            boxShadow: isConnected ? `0 0 6px ${COLORS.green}` : `0 0 6px ${COLORS.red}`,
          }}
        />
        {isConnected ? 'LINKED' : 'CONNECTING'}
      </div>

      {/* Title */}
      <h2
        style={{
          color: COLORS.textPrimary,
          fontSize: '32px',
          fontWeight: '700',
          fontFamily: FONTS.heading,
          textTransform: 'uppercase',
          letterSpacing: '8px',
          marginBottom: '4px',
        }}
      >
        {view === 'choose' && 'COMMAND CENTER'}
        {view === 'create' && 'ROOM CREATED'}
        {view === 'join' && 'JOIN ROOM'}
        {view === 'searching' && 'SCANNING'}
        {view === 'waiting' && 'STANDBY'}
        {view === 'map_select' && 'SELECT ARENA'}
        {view === 'map_select_waiting' && 'STANDBY'}
      </h2>

      {/* Warning stripe */}
      <div
        style={{
          width: '250px',
          height: '2px',
          background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
          marginBottom: '8px',
          opacity: 0.3,
        }}
      />

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: '8px 20px',
            background: COLORS.redDim,
            border: `1px solid ${COLORS.red}`,
            clipPath: CLIP.button,
            color: '#ff8888',
            fontSize: '12px',
            fontFamily: FONTS.mono,
            letterSpacing: '1px',
          }}
        >
          ERROR: {error}
        </div>
      )}

      {/* ---- Choose mode ---- */}
      {view === 'choose' && (
        <>
          <MechButton onClick={handleQuickMatch} variant="primary" disabled={!isConnected}>
            {isConnected ? 'QUICK MATCH' : 'CONNECTING...'}
          </MechButton>
          <MechButton onClick={handleCreateRoom} disabled={!isConnected}>CREATE ROOM</MechButton>
          <MechButton onClick={() => setView('join')} disabled={!isConnected}>JOIN ROOM</MechButton>
        </>
      )}

      {/* ---- Create room: show code ---- */}
      {view === 'create' && (
        <>
          <div style={{ fontSize: '12px', color: COLORS.textDim, fontFamily: FONTS.mono, letterSpacing: '2px' }}>
            // SHARE THIS CODE
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: '700',
              fontFamily: FONTS.mono,
              color: COLORS.amber,
              letterSpacing: '16px',
              textShadow: `0 0 30px ${COLORS.amberGlow}`,
              userSelect: 'all',
              animation: 'roomCodeGlow 2s ease-in-out infinite',
              cursor: 'pointer',
            }}
            onClick={handleCopyCode}
            title="Click to copy"
          >
            {roomId ?? '....'}
          </div>
          {/* Copy button */}
          <button
            onClick={handleCopyCode}
            style={{
              padding: '6px 16px',
              fontSize: '11px',
              fontFamily: FONTS.mono,
              color: copied ? COLORS.green : COLORS.textDim,
              background: 'rgba(255, 140, 0, 0.05)',
              border: `1px solid ${copied ? COLORS.greenDim : COLORS.borderFaint}`,
              clipPath: CLIP.button,
              cursor: 'pointer',
              letterSpacing: '2px',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? '[COPIED]' : '[COPY CODE]'}
          </button>
          <div style={{ fontSize: '13px', color: COLORS.textDim, fontFamily: FONTS.mono, letterSpacing: '2px', marginTop: '8px' }}>
            AWAITING OPPONENT...
          </div>
          <Spinner />
        </>
      )}

      {/* ---- Join room: enter code ---- */}
      {view === 'join' && (
        <>
          <div style={{ fontSize: '12px', color: COLORS.textDim, fontFamily: FONTS.mono, letterSpacing: '2px' }}>
            // ENTER 4-LETTER ROOM CODE
          </div>
          <input
            ref={joinInputRef}
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD"
            autoFocus
            maxLength={4}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            style={{
              fontSize: '48px',
              fontWeight: '700',
              fontFamily: FONTS.mono,
              textAlign: 'center',
              width: '240px',
              padding: '8px',
              background: 'rgba(255, 140, 0, 0.04)',
              border: `2px solid ${COLORS.borderDefault}`,
              clipPath: CLIP.button,
              color: COLORS.textPrimary,
              letterSpacing: '16px',
              outline: 'none',
              textTransform: 'uppercase',
              caretColor: COLORS.amber,
            }}
          />
          <MechButton
            onClick={handleJoinRoom}
            variant="primary"
            disabled={joinCode.trim().length < 4}
          >
            JOIN
          </MechButton>
        </>
      )}

      {/* ---- Searching for match ---- */}
      {view === 'searching' && (
        <>
          <div style={{ fontSize: '13px', color: COLORS.textDim, fontFamily: FONTS.mono, letterSpacing: '2px' }}>
            SCANNING FOR OPPONENTS...
          </div>
          <Spinner />
          <MechButton onClick={() => { cancelMatch(); setView('choose'); }} variant="secondary">
            CANCEL
          </MechButton>
        </>
      )}

      {/* ---- Waiting in room ---- */}
      {view === 'waiting' && (
        <>
          <div style={{ fontSize: '13px', color: COLORS.textDim, fontFamily: FONTS.mono, letterSpacing: '2px' }}>
            JOINING ROOM...
          </div>
          <Spinner />
        </>
      )}

      {/* ---- Map selection (this player picks) ---- */}
      {view === 'map_select' && (
        <MapSelector
          mode="practice"
          onSelect={handleMapSelected}
          onCancel={handleBack}
        />
      )}

      {/* ---- Waiting for opponent to select map ---- */}
      {view === 'map_select_waiting' && (
        <>
          <div style={{ fontSize: '13px', color: COLORS.amber, fontFamily: FONTS.mono, letterSpacing: '2px' }}>
            OPPONENT IS SELECTING ARENA...
          </div>
          <Spinner />
          <div style={{ fontSize: '11px', color: COLORS.textDim, fontFamily: FONTS.mono, letterSpacing: '1px', marginTop: '8px' }}>
            // STANDBY FOR DEPLOYMENT
          </div>
        </>
      )}

      {/* Back button */}
      {view !== 'map_select' && (
        <>
          <div style={{ height: '4px' }} />
          <MechButton onClick={handleBack} variant="secondary">BACK</MechButton>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner() {
  return (
    <div
      style={{
        width: '24px',
        height: '24px',
        border: `2px solid ${COLORS.amberGlow}`,
        borderTop: `2px solid ${COLORS.amber}`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        marginTop: '8px',
        boxShadow: `0 0 10px ${COLORS.amberGlow}`,
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
