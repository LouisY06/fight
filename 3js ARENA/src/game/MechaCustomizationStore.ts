// =============================================================================
// MechaCustomizationStore.ts — Player mech color + segment scale customization
// Persisted to localStorage for persistence across sessions
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

const DEFAULT_COLOR = '#ff8c00';

export type AvatarType = 'classic' | 'riggedPack';

interface MechaCustomizationState {
  accentColor: string;
  segmentScales: MechaSegmentScales;
  avatarType: AvatarType;
  selectedPlayerMechId: number;
  setAccentColor: (color: string) => void;
  setSegmentScale: (segment: keyof MechaSegmentScales, value: number) => void;
  resetScales: () => void;
  resetAll: () => void;
  setAvatarType: (type: AvatarType) => void;
  setSelectedPlayerMechId: (index: number) => void;
}

const STORAGE_KEY = 'smf-mech-customization';

function loadFromStorage(): Partial<MechaCustomizationState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persist(partial: Record<string, unknown>) {
  try {
    const prev = loadFromStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch { /* ignore */ }
}

const saved = loadFromStorage();

export const useMechaCustomizationStore = create<MechaCustomizationState>((set) => ({
  accentColor: (saved.accentColor as string) ?? DEFAULT_COLOR,
  segmentScales: (saved.segmentScales as MechaSegmentScales) ?? { ...DEFAULT_SCALES },
  avatarType: (saved.avatarType as AvatarType) ?? 'classic',
  selectedPlayerMechId: (saved.selectedPlayerMechId as number) ?? 0,

  setAccentColor: (color) => {
    persist({ accentColor: color });
    set({ accentColor: color });
  },

  setSegmentScale: (segment, value) =>
    set((s) => {
      const newScales = {
        ...s.segmentScales,
        [segment]: Math.max(0.5, Math.min(1.5, value)),
      };
      persist({ segmentScales: newScales });
      return { segmentScales: newScales };
    }),

  resetScales: () => {
    const scales = { ...DEFAULT_SCALES };
    persist({ segmentScales: scales });
    set({ segmentScales: scales });
  },

  resetAll: () => {
    const defaults = {
      accentColor: DEFAULT_COLOR,
      segmentScales: { ...DEFAULT_SCALES },
      avatarType: 'classic' as AvatarType,
      selectedPlayerMechId: 0,
    };
    persist(defaults);
    set(defaults);
  },

  setAvatarType: (avatarType) => {
    persist({ avatarType });
    set({ avatarType });
  },

  setSelectedPlayerMechId: (selectedPlayerMechId) => {
    const val = Math.max(0, selectedPlayerMechId);
    persist({ selectedPlayerMechId: val });
    set({ selectedPlayerMechId: val });
  },
}));
