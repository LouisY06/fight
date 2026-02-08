// =============================================================================
// SwordSelection.ts — Zustand store for sword skin selection & customization
// Supports procedural + GLB model swords with per-sword color & animation config.
// =============================================================================

import { create } from 'zustand';

export type SwordId = 'energy_greatsword' | 'mecha_sword' | 'mecha_textured';

export interface SwordVariant {
  id: SwordId;
  name: string;
  description: string;
  /** Scale applied to the sword model */
  scale: number;
  /** Rotation offset (Euler xyz) for correct orientation */
  rotationOffset: [number, number, number];
  /** Position offset from hand anchor */
  positionOffset: [number, number, number];
  /** Primary energy/accent color (hex) */
  energyColor: string;
  /** Secondary accent color (hex) */
  accentColor: string;
  /** Glow intensity multiplier */
  glowIntensity: number;
  /** Trail color during swings */
  trailColor: string;
  /** Whether this sword has an idle animation (glow pulse, hover, etc.) */
  hasIdleAnimation: boolean;
  /** Blade length in local space for collision detection */
  bladeLength: number;
  /** Preview camera distance for the selector UI */
  previewDistance: number;
}

export const SWORD_VARIANTS: SwordVariant[] = [
  {
    id: 'energy_greatsword',
    name: 'ENERGY GREATSWORD',
    description: 'Heavy sci-fi blade with orange energy channels and chrome accents. The original mech weapon.',
    scale: 0.18,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    energyColor: '#ff4400',
    accentColor: '#ff6600',
    glowIntensity: 1.0,
    trailColor: '#ff6600',
    hasIdleAnimation: true,
    bladeLength: 0.56,
    previewDistance: 2.5,
  },
  {
    id: 'mecha_sword',
    name: 'CRYO KATANA',
    description: 'Curved single-edge blade with cryo-blue energy conduits. Precise cuts with freezing arc traces.',
    scale: 0.18,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    energyColor: '#00ccff',
    accentColor: '#0088ff',
    glowIntensity: 1.2,
    trailColor: '#00aaff',
    hasIdleAnimation: true,
    bladeLength: 0.56,
    previewDistance: 2.5,
  },
  {
    id: 'mecha_textured',
    name: 'PLASMA RAPIER',
    description: 'Forked twin-prong blade with purple plasma conduits. Fast thrusts channelling volatile energy.',
    scale: 0.18,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    energyColor: '#ff00ff',
    accentColor: '#cc00ff',
    glowIntensity: 1.5,
    trailColor: '#ff44ff',
    hasIdleAnimation: true,
    bladeLength: 0.56,
    previewDistance: 2.5,
  },
];

interface SwordSelectionState {
  selectedSwordId: SwordId;
  /** Whether the sword selector panel is open */
  selectorOpen: boolean;
  setSelectedSword: (id: SwordId) => void;
  toggleSelector: () => void;
  openSelector: () => void;
  closeSelector: () => void;
}

export const useSwordStore = create<SwordSelectionState>((set) => ({
  selectedSwordId: 'energy_greatsword',
  selectorOpen: false,
  setSelectedSword: (id) => set({ selectedSwordId: id }),
  toggleSelector: () => set((s) => ({ selectorOpen: !s.selectorOpen })),
  openSelector: () => set({ selectorOpen: true }),
  closeSelector: () => set({ selectorOpen: false }),
}));

/** Get the full variant config for the currently selected sword. */
export function getSelectedSword(): SwordVariant {
  const id = useSwordStore.getState().selectedSwordId;
  return SWORD_VARIANTS.find((v) => v.id === id) ?? SWORD_VARIANTS[0];
}
