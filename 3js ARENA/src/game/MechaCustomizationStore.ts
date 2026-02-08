// =============================================================================
// MechaCustomizationStore.ts — Player mech color + segment scale customization
// Persisted across menu and used by IntroSequencer, menu preview, etc.
// =============================================================================

import { create } from 'zustand';

export interface MechaSegmentScales {
  head: number;
  torso: number;
  arms: number;
  legs: number;
}

const DEFAULT_SCALES: MechaSegmentScales = {
  head: 1,
  torso: 1,
  arms: 1,
  legs: 1,
};

export type AvatarType = 'classic' | 'riggedPack';

interface MechaCustomizationState {
  accentColor: string;
  segmentScales: MechaSegmentScales;
  /** Default 'classic' so current procedural mech is preserved. */
  avatarType: AvatarType;
  /** Index into rigged mechs pack (0 .. MECH_PACK_COUNT-1). Used when avatarType === 'riggedPack'. */
  selectedPlayerMechId: number;
  setAccentColor: (color: string) => void;
  setSegmentScale: (segment: keyof MechaSegmentScales, value: number) => void;
  resetScales: () => void;
  setAvatarType: (type: AvatarType) => void;
  setSelectedPlayerMechId: (index: number) => void;
}

export const useMechaCustomizationStore = create<MechaCustomizationState>((set) => ({
  accentColor: '#CC00FF',
  segmentScales: { ...DEFAULT_SCALES },
  avatarType: 'classic',
  selectedPlayerMechId: 0,

  setAccentColor: (color) => set({ accentColor: color }),

  setSegmentScale: (segment, value) =>
    set((s) => ({
      segmentScales: {
        ...s.segmentScales,
        [segment]: Math.max(0.5, Math.min(1.5, value)),
      },
    })),

  resetScales: () => set({ segmentScales: { ...DEFAULT_SCALES } }),

  setAvatarType: (avatarType) => set({ avatarType }),

  setSelectedPlayerMechId: (selectedPlayerMechId) =>
    set({ selectedPlayerMechId: Math.max(0, selectedPlayerMechId) }),
}));
