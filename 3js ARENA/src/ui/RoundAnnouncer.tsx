// =============================================================================
// RoundAnnouncer.tsx — Full-screen text: "ROUND 1", "FIGHT!", "K.O."
// Military mech aesthetic with warning stripes
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { playKO } from '../audio/SoundManager';
import { ElevenLabs } from '../audio/ElevenLabsService';
import { useScreenShakeStore } from '../game/useScreenShake';
import { COLORS, FONTS } from './theme';

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

      ElevenLabs.announceRound(currentRound);

      const fightTimer = setTimeout(() => {
        setScale(0.3);
        setTimeout(() => {
          setText('ENGAGE');
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

  const textColor = isKo
    ? COLORS.red
    : isFight
      ? COLORS.amber
      : isDraw
        ? '#ffcc44'
        : COLORS.textPrimary;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
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
            background: 'radial-gradient(ellipse at center, rgba(255,100,50,0.6) 0%, rgba(204,34,34,0.3) 50%, transparent 70%)',
            animation: 'koFlash 0.2s ease-out forwards',
          }}
        />
      )}

      {/* Warning stripes above */}
      {(isFight || isKo) && (
        <div
          style={{
            width: '400px',
            height: '4px',
            background: `repeating-linear-gradient(-45deg, ${isKo ? COLORS.red : COLORS.amber}, ${isKo ? COLORS.red : COLORS.amber} 4px, transparent 4px, transparent 8px)`,
            marginBottom: '16px',
            opacity: 0.6,
          }}
        />
      )}

      <div
        style={{
          color: textColor,
          fontSize: isFight ? '64px' : isKo ? '80px' : '48px',
          fontWeight: 700,
          fontFamily: FONTS.heading,
          textTransform: 'uppercase',
          letterSpacing: isFight ? '16px' : isKo ? '20px' : '12px',
          textShadow: `0 0 40px ${textColor}88, 0 0 80px ${textColor}33, 0 4px 8px rgba(0,0,0,0.8)`,
          transform: `scale(${scale})`,
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: isFight ? 'shake 0.4s ease-out' : isKo ? 'scaleInBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
      >
        {text}
      </div>

      {/* Warning stripes below */}
      {(isFight || isKo) && (
        <div
          style={{
            width: '400px',
            height: '4px',
            background: `repeating-linear-gradient(-45deg, ${isKo ? COLORS.red : COLORS.amber}, ${isKo ? COLORS.red : COLORS.amber} 4px, transparent 4px, transparent 8px)`,
            marginTop: '16px',
            opacity: 0.6,
          }}
        />
      )}
    </div>
  );
}
