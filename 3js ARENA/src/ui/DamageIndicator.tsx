// =============================================================================
// DamageIndicator.tsx — Floating damage numbers that drift up and fade
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

interface DamageNumber {
  id: number;
  amount: number;
  x: number; // viewport percentage
  isCritical: boolean;
  isBlocked: boolean;
  createdAt: number;
}

let nextId = 0;

export function useDamageIndicators() {
  const [numbers, setNumbers] = useState<DamageNumber[]>([]);

  const addDamageNumber = useCallback(
    (amount: number, screenX: number, isCritical: boolean, isBlocked: boolean) => {
      const id = nextId++;
      setNumbers((prev) => [
        ...prev,
        { id, amount, x: screenX, isCritical, isBlocked, createdAt: Date.now() },
      ]);

      // Auto-remove after animation
      setTimeout(() => {
        setNumbers((prev) => prev.filter((n) => n.id !== id));
      }, 1200);
    },
    []
  );

  return { numbers, addDamageNumber };
}

interface DamageIndicatorProps {
  numbers: DamageNumber[];
}

export function DamageIndicator({ numbers }: DamageIndicatorProps) {
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
      }}
    >
      {isBlocked ? 'BLOCKED' : ''} {Math.round(amount)}
      {isCritical ? '!' : ''}
    </div>
  );
}
