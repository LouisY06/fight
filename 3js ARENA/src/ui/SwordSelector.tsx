// =============================================================================
// SwordSelector.tsx — Slide-out sword customization panel
// Military mech HUD aesthetic with 3D preview, variant cards, and animations
// Opened via the weapon selector or keyboard shortcut (Tab when sword selected)
// =============================================================================

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  useSwordStore,
  SWORD_VARIANTS,
  type SwordVariant,
  type SwordId,
} from '../game/SwordSelection';
import { useGameStore } from '../game/GameState';
import { COLORS, FONTS, CLIP } from './theme';
import { SwordPreview } from '../entities/SwordModel';

// ============================================================================
// Sword Selector Panel
// ============================================================================

export function SwordSelector() {
  const isOpen = useSwordStore((s) => s.selectorOpen);
  const closeSelector = useSwordStore((s) => s.closeSelector);
  const selectedId = useSwordStore((s) => s.selectedSwordId);
  const setSelectedSword = useSwordStore((s) => s.setSelectedSword);
  const phase = useGameStore((s) => s.phase);

  // Preview state: which sword is being hovered/previewed (may differ from selected)
  const [previewId, setPreviewId] = useState<SwordId>(selectedId);
  const [animateIn, setAnimateIn] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync preview to selection when panel opens
  useEffect(() => {
    if (isOpen) {
      setPreviewId(selectedId);
      setSaved(false);
      // Trigger entrance animation
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
  }, [isOpen, selectedId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSelector();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closeSelector]);

  // Don't show during non-menu phases unless paused
  const canShow = phase === 'menu' || phase === 'lobby' || phase === 'waiting' || phase === 'paused';
  if (!isOpen || !canShow) return null;

  const previewVariant = SWORD_VARIANTS.find((v) => v.id === previewId) ?? SWORD_VARIANTS[0];
  const selectedVariant = SWORD_VARIANTS.find((v) => v.id === selectedId) ?? SWORD_VARIANTS[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        opacity: animateIn ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSelector();
      }}
    >
      {/* Main panel */}
      <div
        style={{
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: `linear-gradient(135deg, ${COLORS.bgSurface} 0%, ${COLORS.bgDeep} 100%)`,
          border: `1px solid ${COLORS.borderDefault}`,
          clipPath: CLIP.panelLarge,
          boxShadow: `0 0 60px rgba(255, 140, 0, 0.08), 0 0 120px rgba(0, 0, 0, 0.5)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px 16px',
            borderBottom: `1px solid ${COLORS.borderDefault}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '9px',
                fontFamily: FONTS.mono,
                color: COLORS.textDim,
                letterSpacing: '3px',
                marginBottom: '4px',
              }}
            >
              // ARMORY SYSTEM
            </div>
            <div
              style={{
                fontSize: '22px',
                fontFamily: FONTS.heading,
                fontWeight: 700,
                color: COLORS.amber,
                letterSpacing: '4px',
                textTransform: 'uppercase',
              }}
            >
              BLADE SELECTION
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={closeSelector}
            style={{
              background: 'rgba(255, 140, 0, 0.06)',
              border: `1px solid ${COLORS.borderDefault}`,
              color: COLORS.textSecondary,
              fontFamily: FONTS.mono,
              fontSize: '11px',
              letterSpacing: '2px',
              padding: '8px 16px',
              cursor: 'pointer',
              clipPath: CLIP.button,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.amber;
              e.currentTarget.style.color = COLORS.amber;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = COLORS.borderDefault;
              e.currentTarget.style.color = COLORS.textSecondary;
            }}
          >
            ESC · CLOSE
          </button>
        </div>

        {/* Content area */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Left: 3D Preview */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              position: 'relative',
              borderRight: `1px solid ${COLORS.borderFaint}`,
            }}
          >
            {/* Preview Canvas */}
            <div style={{ width: '100%', height: '360px', position: 'relative' }}>
              <Canvas
                camera={{ position: [0, 0.4, 1.6], fov: 50 }}
                style={{ background: 'transparent' }}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[3, 5, 4]} intensity={2} color="#ffffff" />
                <pointLight
                  position={[-1, 1, 2]}
                  intensity={1.5}
                  color={previewVariant.energyColor}
                />
                <pointLight position={[1, -0.5, 1.5]} intensity={0.8} color="#4488ff" />
                <spotLight
                  position={[0, 2, 0]}
                  angle={0.5}
                  penumbra={0.5}
                  intensity={1}
                  color="#ffffff"
                />
                <Suspense fallback={null}>
                  <SwordPreview variant={previewVariant} scaleMul={2.5} />
                </Suspense>
              </Canvas>

              {/* Corner brackets */}
              {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                <div
                  key={corner}
                  style={{
                    position: 'absolute',
                    ...(corner.includes('t') ? { top: 8 } : { bottom: 8 }),
                    ...(corner.includes('l') ? { left: 8 } : { right: 8 }),
                    width: '12px',
                    height: '12px',
                    ...(corner === 'tl' && { borderTop: `1px solid ${COLORS.amber}`, borderLeft: `1px solid ${COLORS.amber}` }),
                    ...(corner === 'tr' && { borderTop: `1px solid ${COLORS.amber}`, borderRight: `1px solid ${COLORS.amber}` }),
                    ...(corner === 'bl' && { borderBottom: `1px solid ${COLORS.amber}`, borderLeft: `1px solid ${COLORS.amber}` }),
                    ...(corner === 'br' && { borderBottom: `1px solid ${COLORS.amber}`, borderRight: `1px solid ${COLORS.amber}` }),
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>

            {/* Selected sword stats */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: `1px solid ${COLORS.borderFaint}`,
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontFamily: FONTS.heading,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  letterSpacing: '2px',
                  marginBottom: '8px',
                }}
              >
                {previewVariant.name}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: FONTS.mono,
                  color: COLORS.textSecondary,
                  lineHeight: 1.6,
                  marginBottom: '12px',
                }}
              >
                {previewVariant.description}
              </div>

              {/* Stat bars */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <StatBar label="ENERGY" value={previewVariant.glowIntensity / 1.5} color={previewVariant.energyColor} />
                <StatBar label="REACH" value={previewVariant.bladeLength / 0.7} color={COLORS.amber} />
                <StatBar label="WEIGHT" value={previewVariant.scale / 0.45} color={COLORS.steel} />
              </div>
            </div>
          </div>

          {/* Right: Variant list */}
          <div
            style={{
              width: '320px',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                fontFamily: FONTS.mono,
                color: COLORS.textDim,
                letterSpacing: '3px',
                marginBottom: '4px',
                padding: '0 4px',
              }}
            >
              AVAILABLE BLADES [{SWORD_VARIANTS.length}]
            </div>

            {SWORD_VARIANTS.map((variant, idx) => (
              <SwordCard
                key={variant.id}
                variant={variant}
                index={idx}
                isSelected={previewId === variant.id}
                onSelect={() => { setPreviewId(variant.id); setSaved(false); }}
                animDelay={idx * 80}
                animateIn={animateIn}
              />
            ))}

            {/* Save & Equip button */}
            <button
              onClick={() => {
                setSelectedSword(previewId);
                setSaved(true);
                setTimeout(() => closeSelector(), 600);
              }}
              style={{
                marginTop: 'auto',
                padding: '14px 16px',
                background: saved
                  ? `linear-gradient(180deg, ${COLORS.green}, #00884a)`
                  : `linear-gradient(180deg, ${COLORS.amber}, #cc6600)`,
                border: saved
                  ? `2px solid ${COLORS.green}`
                  : `2px solid ${COLORS.amberBright}`,
                clipPath: CLIP.button,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: saved
                  ? `0 0 20px rgba(0, 204, 102, 0.3)`
                  : `0 0 20px rgba(255, 140, 0, 0.3)`,
              }}
              onMouseEnter={(e) => {
                if (!saved) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 0 28px rgba(255, 140, 0, 0.4)`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = saved
                  ? `0 0 20px rgba(0, 204, 102, 0.3)`
                  : `0 0 20px rgba(255, 140, 0, 0.3)`;
              }}
            >
              {saved ? (
                <>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      background: '#fff',
                      clipPath: 'polygon(20% 50%, 40% 70%, 80% 30%, 85% 35%, 40% 80%, 15% 55%)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '14px',
                      fontFamily: FONTS.heading,
                      fontWeight: 700,
                      color: '#000',
                      letterSpacing: '3px',
                    }}
                  >
                    EQUIPPED
                  </span>
                </>
              ) : (
                <>
                  <span
                    style={{
                      fontSize: '14px',
                      fontFamily: FONTS.heading,
                      fontWeight: 700,
                      color: '#000',
                      letterSpacing: '3px',
                    }}
                  >
                    EQUIP {SWORD_VARIANTS.find((v) => v.id === previewId)?.name ?? ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sword Card — individual variant in the list
// ============================================================================

function SwordCard({
  variant,
  index,
  isSelected,
  onSelect,
  animDelay,
  animateIn,
}: {
  variant: SwordVariant;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  animDelay: number;
  animateIn: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const borderColor = isSelected
    ? COLORS.amber
    : hovered
    ? COLORS.borderActive
    : COLORS.borderFaint;

  const bgColor = isSelected
    ? 'rgba(255, 140, 0, 0.08)'
    : hovered
    ? 'rgba(255, 140, 0, 0.04)'
    : 'rgba(0, 0, 0, 0.3)';

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '12px 14px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        clipPath: CLIP.button,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: animateIn
          ? 'translateX(0)'
          : `translateX(30px)`,
        opacity: animateIn ? 1 : 0,
        transitionDelay: `${animDelay}ms`,
        boxShadow: isSelected
          ? `0 0 16px ${COLORS.amberGlow}, inset 0 0 12px ${COLORS.amberGlow}`
          : hovered
          ? `0 0 8px rgba(255, 140, 0, 0.08)`
          : 'none',
      }}
    >
      {/* Top row: index + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        {/* Index badge */}
        <div
          style={{
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontFamily: FONTS.mono,
            fontWeight: 700,
            color: isSelected ? COLORS.bgDeep : COLORS.textDim,
            background: isSelected ? COLORS.amber : 'transparent',
            border: `1px solid ${isSelected ? COLORS.amber : COLORS.borderFaint}`,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>

        <div
          style={{
            fontSize: '12px',
            fontFamily: FONTS.heading,
            fontWeight: 700,
            color: isSelected ? COLORS.amber : COLORS.textPrimary,
            letterSpacing: '1.5px',
            flex: 1,
          }}
        >
          {variant.name}
        </div>

        {/* Color swatch */}
        <div
          style={{
            width: '10px',
            height: '10px',
            background: variant.energyColor,
            boxShadow: `0 0 6px ${variant.energyColor}`,
            borderRadius: '50%',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Type badge */}
      <div
        style={{
          fontSize: '8px',
          fontFamily: FONTS.mono,
          color: COLORS.textDim,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      >
        PROCEDURAL ·{' '}
        <span style={{ color: variant.energyColor }}>{variant.energyColor.toUpperCase()}</span>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: '2px',
            background: COLORS.amber,
            boxShadow: `0 0 8px ${COLORS.amber}`,
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Stat Bar — horizontal fill bar with label
// ============================================================================

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const clampedValue = Math.min(Math.max(value, 0), 1);

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: '8px',
          fontFamily: FONTS.mono,
          color: COLORS.textDim,
          letterSpacing: '2px',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${clampedValue * 100}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}
