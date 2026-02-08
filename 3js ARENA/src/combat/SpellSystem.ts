// =============================================================================
// SpellSystem.ts — Spell definitions, state, and event bus
// Spells are activated by voice command and synced over websocket.
// =============================================================================

import { create } from 'zustand';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Spell types
// ---------------------------------------------------------------------------

export type SpellType = 'fireball' | 'laser' | 'ice_blast';

export type SpellDebuff = 'none' | 'stun' | 'slow';

export interface SpellConfig {
  name: string;
  voiceTriggers: string[];  // words/phrases that trigger this spell
  damage: number;
  cooldownMs: number;
  /** Travel speed (units/sec) for projectile spells */
  speed: number;
  /** Max range before despawn */
  range: number;
  /** Color theme */
  color: string;
  /** Emissive color */
  emissive: string;
  /** Debuff applied on hit */
  debuff: SpellDebuff;
  /** Duration of debuff in ms */
  debuffDurationMs: number;
}

export const SPELL_CONFIGS: Record<SpellType, SpellConfig> = {
  fireball: {
    name: 'Fireball',
    voiceTriggers: ['fireball', 'fire ball', 'fire'],
    damage: 30,
    cooldownMs: 4000,
    speed: 12,
    range: 25,
    color: '#ff4400',
    emissive: '#ff6600',
    debuff: 'none',
    debuffDurationMs: 0,
  },
  laser: {
    name: 'Electric Beam',
    voiceTriggers: ['laser', 'laser beam', 'beam', 'electric', 'lightning', 'shock', 'zap'],
    damage: 18,
    cooldownMs: 3000,
    speed: 50,
    range: 30,
    color: '#00ccff',
    emissive: '#44eeff',
    debuff: 'stun',
    debuffDurationMs: 2000,
  },
  ice_blast: {
    name: 'Ice Blast',
    voiceTriggers: ['ice blast', 'ice', 'freeze', 'frost', 'blizzard', 'cold', 'blast', 'eyes', 'icy', 'nice'],
    damage: 15,
    cooldownMs: 5000,
    speed: 8,
    range: 20,
    color: '#88ccff',
    emissive: '#aaddff',
    debuff: 'slow',
    debuffDurationMs: 3500,
  },
};

// ---------------------------------------------------------------------------
// Active spell instance (in-flight projectile or active beam)
// ---------------------------------------------------------------------------

export interface ActiveSpell {
  id: string;
  type: SpellType;
  caster: 'player1' | 'player2';
  origin: [number, number, number];
  direction: [number, number, number];
  spawnTime: number;
  hit: boolean;
}

// ---------------------------------------------------------------------------
// Spell store (Zustand)
// ---------------------------------------------------------------------------

interface SpellStore {
  activeSpells: ActiveSpell[];
  cooldowns: Record<SpellType, number>; // timestamp of last cast per spell
  castSpell: (type: SpellType, caster: 'player1' | 'player2', origin: THREE.Vector3, direction: THREE.Vector3) => ActiveSpell | null;
  removeSpell: (id: string) => void;
  clearAll: () => void;
}

let spellIdCounter = 0;

export const useSpellStore = create<SpellStore>((set, get) => ({
  activeSpells: [],
  cooldowns: { fireball: 0, laser: 0, ice_blast: 0 },

  castSpell: (type, caster, origin, direction) => {
    const now = Date.now();
    const config = SPELL_CONFIGS[type];
    const cooldowns = get().cooldowns;

    // Check cooldown
    if (now - cooldowns[type] < config.cooldownMs) return null;

    const id = `spell-${spellIdCounter++}`;
    const spell: ActiveSpell = {
      id,
      type,
      caster,
      origin: [origin.x, origin.y, origin.z],
      direction: [direction.x, direction.y, direction.z],
      spawnTime: now,
      hit: false,
    };

    set((s) => ({
      activeSpells: [...s.activeSpells, spell],
      cooldowns: { ...s.cooldowns, [type]: now },
    }));

    return spell;
  },

  removeSpell: (id) =>
    set((s) => ({
      activeSpells: s.activeSpells.filter((sp) => sp.id !== id),
    })),

  clearAll: () => set({ activeSpells: [] }),
}));

// ---------------------------------------------------------------------------
// Debuff state — applied to opponent on spell hit
// ---------------------------------------------------------------------------

interface DebuffState {
  type: SpellDebuff;
  expiresAt: number; // Date.now() when debuff wears off
}

/** Active debuffs per player slot */
const activeDebuffs: Record<string, DebuffState> = {};

/** Apply a debuff to a target player */
export function applyDebuff(target: 'player1' | 'player2', debuff: SpellDebuff, durationMs: number): void {
  if (debuff === 'none') return;
  activeDebuffs[target] = { type: debuff, expiresAt: Date.now() + durationMs };
}

/** Check if a target currently has a specific debuff (or any debuff) */
export function getDebuff(target: 'player1' | 'player2'): SpellDebuff {
  const d = activeDebuffs[target];
  if (!d) return 'none';
  if (Date.now() > d.expiresAt) {
    delete activeDebuffs[target];
    return 'none';
  }
  return d.type;
}

/** Get remaining debuff duration in seconds (0 if none) */
export function getDebuffRemaining(target: 'player1' | 'player2'): number {
  const d = activeDebuffs[target];
  if (!d) return 0;
  const remaining = d.expiresAt - Date.now();
  return remaining > 0 ? remaining / 1000 : 0;
}

/** Clear all debuffs (call on round reset) */
export function clearDebuffs(): void {
  delete activeDebuffs['player1'];
  delete activeDebuffs['player2'];
}

// ---------------------------------------------------------------------------
// Spell event bus (for VFX and sound triggers)
// ---------------------------------------------------------------------------

type SpellEventHandler = (spell: ActiveSpell) => void;
const spellCastListeners: SpellEventHandler[] = [];
const spellHitListeners: SpellEventHandler[] = [];

export function onSpellCast(handler: SpellEventHandler): () => void {
  spellCastListeners.push(handler);
  return () => {
    const i = spellCastListeners.indexOf(handler);
    if (i >= 0) spellCastListeners.splice(i, 1);
  };
}

export function fireSpellCast(spell: ActiveSpell): void {
  for (const h of spellCastListeners) h(spell);
}

export function onSpellHit(handler: SpellEventHandler): () => void {
  spellHitListeners.push(handler);
  return () => {
    const i = spellHitListeners.indexOf(handler);
    if (i >= 0) spellHitListeners.splice(i, 1);
  };
}

export function fireSpellHit(spell: ActiveSpell): void {
  for (const h of spellHitListeners) h(spell);
}
