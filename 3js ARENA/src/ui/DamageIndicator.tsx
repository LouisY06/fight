// =============================================================================
// DamageIndicator.tsx — Floating damage numbers that drift up and fade
// Uses store so HitEffectManager (outside React tree) can add numbers on hit.
// =============================================================================

import { useState, useEffect } from 'react';
import { create } from 'zustand';

export interface DamageNumber {
  id: number;
  amount: number;
  x: number; // viewport percentage (50 = center)
  isCritical: boolean;
  isBlocked: boolean;
  createdAt: number;
}

let nextId = 0;

interface DamageIndicatorStore {
  numbers: DamageNumber[];
  addDamageNumber: (amount: number, screenX?: number, isCritical?: boolean, isBlocked?: boolean) => void;
}

export const useDamageIndicatorStore = create<DamageIndicatorStore>((set) => ({
  numbers: [],
  addDamageNumber: (amount, screenX = 50, isCritical = false, isBlocked = false) => {
    const id = nextId++;
    const num: DamageNumber = { id, amount, x: screenX, isCritical, isBlocked, createdAt: Date.now() };
    set((s) => ({ numbers: [...s.numbers, num] }));
    setTimeout(() => {
      set((s) => ({ numbers: s.numbers.filter((n) => n.id !== id) }));
    }, 1200);
  },
}));

export function DamageIndicator() {
  const numbers = useDamageIndicatorStore((s) => s.numbers);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {numbers.map((num) => (
        <FloatingNumber key={num.id} {...num} />
      ))}
    </div>
  );
}

function FloatingNumber({
  amount,
  x,
  isCritical,
  isBlocked,
}: DamageNumber) {
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - start) / 1000;
      setOffset(elapsed * 80); // drift up
      setOpacity(Math.max(0, 1 - elapsed / 1.2));
      if (elapsed < 1.2) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const color = isBlocked ? '#8888ff' : isCritical ? '#ff4444' : '#ffffff';
  const size = isCritical ? '28px' : '20px';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `50%`,
        transform: `translate(-50%, -${offset}px)`,
        color,
        fontSize: size,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        textShadow: `0 0 8px ${color}88, 0 2px 4px rgba(0,0,0,0.5)`,
        opacity,
        pointerEvents: 'none',
        animation: 'scaleInBounce 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {isBlocked ? 'BLOCKED' : ''} {Math.round(amount)}
      {isCritical ? '!' : ''}
    </div>
  );
}
