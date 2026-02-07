// =============================================================================
// RoundAnnouncer.tsx — Full-screen text overlay: "ROUND 1", "FIGHT!", "K.O."
// =============================================================================

import { useState, useEffect } from 'react';
import { useGameStore } from '../game/GameState';
import { playKO } from '../audio/SoundManager';

export function RoundAnnouncer() {
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const roundWinner = useGameStore((s) => s.roundWinner);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (phase === 'countdown') {
      setVisible(true);
      setScale(0.5);

      // "ROUND X" for 1.5s, then "FIGHT!" for 1s
      setText(`ROUND ${currentRound}`);
      requestAnimationFrame(() => setScale(1));

      const fightTimer = setTimeout(() => {
        setScale(0.5);
        setTimeout(() => {
          setText('FIGHT!');
          setScale(1);
        }, 200);
      }, 1500);

      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 2800);

      return () => {
        clearTimeout(fightTimer);
        clearTimeout(hideTimer);
      };
    }

    if (phase === 'roundEnd' || phase === 'gameOver') {
      setVisible(true);
      setScale(0.5);

      if (roundWinner === 'draw') {
        setText('DRAW');
      } else {
        setText('K.O.');
        playKO(); // Boom sound on knockout
      }
      requestAnimationFrame(() => setScale(1));

      return () => {};
    }

    setVisible(false);
  }, [phase, currentRound, roundWinner]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: '80px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '8px',
          textShadow:
            '0 0 40px rgba(255,100,0,0.8), 0 0 80px rgba(255,50,0,0.4), 0 4px 8px rgba(0,0,0,0.8)',
          transform: `scale(${scale})`,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          WebkitTextStroke: '2px rgba(255,100,0,0.5)',
        }}
      >
        {text}
      </div>
    </div>
  );
}
