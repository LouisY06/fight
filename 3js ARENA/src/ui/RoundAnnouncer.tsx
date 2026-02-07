// =============================================================================
// RoundAnnouncer.tsx — Full-screen text: "ROUND 1", "FIGHT!", "K.O." with punch effects
// ElevenLabs AI announcer voice + screen shake
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { playKO } from '../audio/SoundManager';
import { ElevenLabs } from '../audio/ElevenLabsService';
import { useScreenShakeStore } from '../game/useScreenShake';

export function RoundAnnouncer() {
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const roundWinner = useGameStore((s) => s.roundWinner);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [variant, setVariant] = useState<'round' | 'fight' | 'ko' | 'draw'>('round');
  const [showFlash, setShowFlash] = useState(false);
  const flashDone = useRef(false);
  const preWarmed = useRef(false);

  // Pre-warm ElevenLabs cache on first render
  useEffect(() => {
    if (!preWarmed.current) {
      preWarmed.current = true;
      ElevenLabs.preWarm();
    }
  }, []);

  useEffect(() => {
    if (phase === 'countdown') {
      setVisible(true);
      setScale(0.5);
      setVariant('round');
      setShowFlash(false);
      flashDone.current = false;

      setText(`ROUND ${currentRound}`);
      requestAnimationFrame(() => setScale(1));

      // ElevenLabs: announce "Round X!"
      ElevenLabs.announceRound(currentRound);

      const fightTimer = setTimeout(() => {
        setScale(0.3);
        setTimeout(() => {
          setText('FIGHT!');
          setVariant('fight');
          setScale(1.2);
          useScreenShakeStore.getState().trigger(0.3, 100);
          ElevenLabs.announceFight();
        }, 150);
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
      setShowFlash(true);
      flashDone.current = false;

      if (roundWinner === 'draw') {
        setText('DRAW');
        setVariant('draw');
        ElevenLabs.announceDraw();
      } else {
        setText('K.O.');
        setVariant('ko');
        playKO();
        useScreenShakeStore.getState().trigger(0.6, 250);
        ElevenLabs.announceKO();
        ElevenLabs.playCrowdRoar();
      }
      requestAnimationFrame(() => setScale(1.15));

      return () => {};
    }

    setVisible(false);
  }, [phase, currentRound, roundWinner]);

  // K.O. flash overlay - brief white/red flash
  useEffect(() => {
    if (!showFlash || variant !== 'ko' || flashDone.current) return;
    flashDone.current = true;
    const id = setTimeout(() => setShowFlash(false), 180);
    return () => clearTimeout(id);
  }, [showFlash, variant]);

  if (!visible) return null;

  const isFight = variant === 'fight';
  const isKo = variant === 'ko';
  const isDraw = variant === 'draw';

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
      {/* K.O. screen flash */}
      {showFlash && isKo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,50,50,0.5) 50%, transparent 70%)',
            animation: 'koFlash 0.2s ease-out forwards',
          }}
        />
      )}

      <div
        style={{
          color: isDraw ? '#ffcc44' : '#ffffff',
          fontSize: isFight ? '96px' : isKo ? '120px' : '80px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: isFight ? '16px' : isKo ? '20px' : '8px',
          textShadow: isDraw
            ? '0 0 40px rgba(255,200,0,0.8), 0 4px 8px rgba(0,0,0,0.8)'
            : '0 0 40px rgba(255,100,0,0.8), 0 0 80px rgba(255,50,0,0.4), 0 4px 8px rgba(0,0,0,0.8)',
          transform: `scale(${scale})`,
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          WebkitTextStroke: isDraw ? '2px rgba(255,200,0,0.5)' : '2px rgba(255,100,0,0.5)',
          animation: isFight ? 'shake 0.4s ease-out' : isKo ? 'scaleInBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
      >
        {text}
      </div>
    </div>
  );
}
