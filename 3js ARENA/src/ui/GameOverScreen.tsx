// =============================================================================
// GameOverScreen.tsx — Winner display, play again
// =============================================================================

import { useGameStore } from '../game/GameState';
import { ARENA_THEMES } from '../arena/arenaThemes';
import { randomPick } from '../utils/random';

export function GameOverScreen() {
  const phase = useGameStore((s) => s.phase);
  const player1 = useGameStore((s) => s.player1);
  const player2 = useGameStore((s) => s.player2);
  const startGame = useGameStore((s) => s.startGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);

  if (phase !== 'gameOver') return null;

  const winner =
    player1.roundsWon > player2.roundsWon ? 'Player 1' : 'Player 2';
  const winnerColor =
    player1.roundsWon > player2.roundsWon ? '#4488ff' : '#ff4444';

  const handleRematch = () => {
    const theme = randomPick(ARENA_THEMES);
    startGame(theme.id);
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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        gap: '12px',
      }}
    >
      <h2
        style={{
          color: winnerColor,
          fontSize: '56px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          textShadow: `0 0 40px ${winnerColor}88`,
          marginBottom: '8px',
        }}
      >
        {winner} WINS!
      </h2>

      <div
        style={{
          color: '#888888',
          fontSize: '18px',
          fontFamily: 'monospace',
          marginBottom: '32px',
        }}
      >
        {player1.roundsWon} — {player2.roundsWon}
      </div>

      <button
        onClick={handleRematch}
        style={{
          padding: '14px 56px',
          fontSize: '20px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          color: '#ffffff',
          background: 'linear-gradient(180deg, #ff2266, #cc0044)',
          border: '2px solid #ff4488',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 0 25px rgba(255,0,80,0.4)',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
        }}
      >
        REMATCH
      </button>

      <button
        onClick={resetToMenu}
        style={{
          padding: '10px 40px',
          fontSize: '14px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: '#888888',
          background: 'transparent',
          border: '1px solid #444444',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          marginTop: '8px',
        }}
      >
        Main Menu
      </button>
    </div>
  );
}
