// =============================================================================
// SpellHUD.tsx — Spell cooldown bar + debuff overlays
//
// Modern, minimal UI. No emojis. Uses Orbitron / Rajdhani fonts.
// SVG inline icons for each spell.
// =============================================================================

import { useState, useEffect } from 'react';
import { useGameStore } from '../game/GameState';
import { useSpellStore, SPELL_CONFIGS, getDebuff, getDebuffRemaining, type SpellType } from '../combat/SpellSystem';
import { isVoiceAvailable, isVoiceActive } from '../audio/VoiceCommands';

const SPELL_ORDER: SpellType[] = ['fireball', 'laser', 'ice_blast', 'forcefield'];

const SPELL_KEYS: Record<SpellType, string> = {
  fireball: 'Q',
  laser: 'E',
  ice_blast: 'R',
  forcefield: 'F',
};

// ---------------------------------------------------------------------------
// SVG Icons — clean, minimal line art
// ---------------------------------------------------------------------------

function FireIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 6 8.5 6 14a6 6 0 0 0 12 0c0-5.5-6-12-6-12Zm0 16a3 3 0 0 1-3-3c0-2 3-5 3-5s3 3 3 5a3 3 0 0 1-3 3Z"
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}

function BoltIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z"
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}

function CrystalIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L6 8l6 14 6-14-6-6Zm0 3.5L8.5 9 12 18.5 15.5 9 12 5.5Z"
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}

function ShieldIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
        fill={color}
        opacity={0.9}
      />
    </svg>
  );
}

const SPELL_ICON_COMPONENTS: Record<SpellType, (props: { color: string; size?: number }) => JSX.Element> = {
  fireball: FireIcon,
  laser: BoltIcon,
  ice_blast: CrystalIcon,
  forcefield: ShieldIcon,
};

// ---------------------------------------------------------------------------
// Font constants
// ---------------------------------------------------------------------------

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";
const FONT_BODY = "'Rajdhani', 'Segoe UI', system-ui, sans-serif";

// ---------------------------------------------------------------------------
// SpellHUD
// ---------------------------------------------------------------------------

export function SpellHUD() {
  const phase = useGameStore((s) => s.phase);
  const cooldowns = useSpellStore((s) => s.cooldowns);
  const [now, setNow] = useState(Date.now());

  const showHUD =
    phase === 'playing' || phase === 'countdown' || phase === 'paused' || phase === 'roundEnd';

  useEffect(() => {
    if (!showHUD) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [showHUD]);

  if (!showHUD) return null;

  const voiceReady = isVoiceAvailable();
  const voiceActive = isVoiceActive();

  const playerSlot = useGameStore.getState().playerSlot ?? 'player1';
  const debuff = getDebuff(playerSlot as 'player1' | 'player2');
  const debuffRemaining = getDebuffRemaining(playerSlot as 'player1' | 'player2');

  return (
    <>
      {/* ---- Full-screen debuff overlays ---- */}
      {debuff === 'stun' && <StunOverlay />}
      {debuff === 'slow' && <SlowOverlay remaining={debuffRemaining} />}

      {/* ---- Keyframe styles ---- */}
      <style>{`
        @keyframes stunScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes stunFlicker {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.22; }
        }
        @keyframes slowDrift {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }
        @keyframes barPulse {
          0%, 100% { box-shadow: 0 0 0px transparent; }
          50% { box-shadow: 0 0 8px var(--glow); }
        }
      `}</style>

      {/* ---- Spell bar (bottom-right) ---- */}
      <div
        style={{
          position: 'absolute',
          bottom: '28px',
          right: '24px',
          display: 'flex',
          gap: '6px',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          zIndex: 55,
        }}
      >
        {SPELL_ORDER.map((type) => {
          const config = SPELL_CONFIGS[type];
          const lastCast = cooldowns[type];
          const elapsed = now - lastCast;
          const isReady = elapsed >= config.cooldownMs;
          const cdProgress = isReady ? 1 : elapsed / config.cooldownMs;
          const cdSeconds = isReady ? 0 : ((config.cooldownMs - elapsed) / 1000);
          const IconComponent = SPELL_ICON_COMPONENTS[type];

          return (
            <div
              key={type}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                width: '64px',
              }}
            >
              {/* Spell card */}
              <div
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '56px',
                  borderRadius: '6px',
                  background: isReady
                    ? `linear-gradient(135deg, ${config.color}18, ${config.color}08)`
                    : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${isReady ? config.color + '80' : 'rgba(255,255,255,0.08)'}`,
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s ease, background 0.3s ease',
                  // @ts-ignore
                  '--glow': config.color + '60',
                  animation: isReady ? 'barPulse 2s ease-in-out infinite' : 'none',
                }}
              >
                {/* Cooldown fill (bottom-up sweep) */}
                {!isReady && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${(1 - cdProgress) * 100}%`,
                      background: 'rgba(0,0,0,0.55)',
                      transition: 'height 0.1s linear',
                    }}
                  />
                )}

                {/* Icon */}
                <div style={{ position: 'relative', zIndex: 1, opacity: isReady ? 1 : 0.35 }}>
                  <IconComponent color={isReady ? config.color : '#666'} size={22} />
                </div>

                {/* Cooldown timer */}
                {!isReady && (
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '10px',
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      color: '#999',
                      marginTop: '1px',
                    }}
                  >
                    {cdSeconds.toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Key binding label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: FONT_HEADING,
                    fontWeight: 700,
                    color: isReady ? '#fff' : '#444',
                    background: isReady ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: `1px solid ${isReady ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    letterSpacing: '0.5px',
                    lineHeight: '14px',
                  }}
                >
                  {SPELL_KEYS[type]}
                </span>
              </div>

              {/* Spell name */}
              <span
                style={{
                  fontSize: '8px',
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  color: isReady ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {config.name}
              </span>
            </div>
          );
        })}

        {/* Voice status indicator */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginLeft: '6px',
            paddingBottom: '4px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: voiceActive ? '#44cc66' : voiceReady ? '#888' : '#333',
              boxShadow: voiceActive ? '0 0 6px #44cc66' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
          <span
            style={{
              fontSize: '7px',
              fontFamily: FONT_BODY,
              fontWeight: 500,
              color: voiceActive ? '#44cc66' : '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '3px',
              whiteSpace: 'nowrap',
            }}
          >
            {voiceActive ? 'MIC ON' : voiceReady ? 'MIC' : ''}
          </span>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stun overlay — sharp, electric feel (no emojis)
// ---------------------------------------------------------------------------

function StunOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Cyan tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 180, 255, 0.12)',
          animation: 'stunFlicker 0.15s ease-in-out infinite',
        }}
      />

      {/* Scanline effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(0, 220, 255, 0.4)',
            animation: 'stunScanline 0.5s linear infinite',
          }}
        />
      </div>

      {/* Border glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid rgba(0, 200, 255, 0.35)',
          boxShadow: 'inset 0 0 60px rgba(0, 180, 255, 0.08)',
        }}
      />

      {/* Center text */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <span
          style={{
            fontFamily: FONT_HEADING,
            fontSize: '28px',
            fontWeight: 800,
            color: 'rgba(0, 220, 255, 0.7)',
            textShadow: '0 0 30px rgba(0, 200, 255, 0.5)',
            letterSpacing: '12px',
            textTransform: 'uppercase',
          }}
        >
          STUNNED
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slow overlay — frost vignette (no emojis)
// ---------------------------------------------------------------------------

function SlowOverlay({ remaining }: { remaining: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Frost vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(136, 204, 255, 0.1) 100%)',
          animation: 'slowDrift 3s ease-in-out infinite',
        }}
      />

      {/* Subtle border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '1.5px solid rgba(136, 204, 255, 0.2)',
          boxShadow: 'inset 0 0 80px rgba(136, 204, 255, 0.04)',
        }}
      />

      {/* Top center indicator */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 14px',
          background: 'rgba(136, 204, 255, 0.08)',
          border: '1px solid rgba(136, 204, 255, 0.2)',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
        }}
      >
        <CrystalIcon color="#88ccff" size={14} />
        <span
          style={{
            fontFamily: FONT_HEADING,
            fontSize: '11px',
            fontWeight: 700,
            color: 'rgba(136, 204, 255, 0.8)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          SLOWED
        </span>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(136, 204, 255, 0.5)',
          }}
        >
          {remaining.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
