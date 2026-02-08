// =============================================================================
// GunState.ts — Gun fire state and projectile management
// Manages gun cooldowns, muzzle flash state, and active projectiles.
// =============================================================================

import { create } from 'zustand';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Gun configuration
// ---------------------------------------------------------------------------

export const GUN_CONFIG = {
  /** Damage per shot */
  damage: 12,
  /** Cooldown between shots (ms) */
  cooldownMs: 350,
  /** Projectile travel speed (units/sec) */
  projectileSpeed: 40,
  /** Max range before despawn */
  range: 50,
  /** Muzzle flash duration (ms) */
  muzzleFlashMs: 80,
  /** Recoil animation duration (seconds) */
  recoilDuration: 0.15,
  /** Projectile color */
  color: '#00ccff',
  /** Emissive glow color */
  emissive: '#44eeff',
} as const;

// ---------------------------------------------------------------------------
// Active projectile instance
// ---------------------------------------------------------------------------

export interface GunProjectile {
  id: string;
  origin: [number, number, number];
  direction: [number, number, number];
  spawnTime: number;
  caster: 'player1' | 'player2';
  hit: boolean;
}

// ---------------------------------------------------------------------------
// Gun store (Zustand)
// ---------------------------------------------------------------------------

interface GunStore {
  activeProjectiles: GunProjectile[];
  lastFireTime: number;
  muzzleFlashActive: boolean;
  fireProjectile: (
    caster: 'player1' | 'player2',
    origin: THREE.Vector3,
    direction: THREE.Vector3,
  ) => GunProjectile | null;
  removeProjectile: (id: string) => void;
  clearAll: () => void;
  setMuzzleFlash: (active: boolean) => void;
}

let projectileIdCounter = 0;

export const useGunStore = create<GunStore>((set, get) => ({
  activeProjectiles: [],
  lastFireTime: 0,
  muzzleFlashActive: false,

  fireProjectile: (caster, origin, direction) => {
    const now = Date.now();
    if (now - get().lastFireTime < GUN_CONFIG.cooldownMs) return null;

    const id = `bullet-${projectileIdCounter++}`;
    const projectile: GunProjectile = {
      id,
      origin: [origin.x, origin.y, origin.z],
      direction: [direction.x, direction.y, direction.z],
      spawnTime: now,
      caster,
      hit: false,
    };

    set((s) => ({
      activeProjectiles: [...s.activeProjectiles, projectile],
      lastFireTime: now,
      muzzleFlashActive: true,
    }));

    // Auto-clear muzzle flash
    setTimeout(() => {
      set({ muzzleFlashActive: false });
    }, GUN_CONFIG.muzzleFlashMs);

    return projectile;
  },

  removeProjectile: (id) =>
    set((s) => ({
      activeProjectiles: s.activeProjectiles.filter((p) => p.id !== id),
    })),

  clearAll: () => set({ activeProjectiles: [] }),
  setMuzzleFlash: (active) => set({ muzzleFlashActive: active }),
}));

// ---------------------------------------------------------------------------
// Gun fire event bus (for VFX/sound triggers)
// ---------------------------------------------------------------------------

type GunFireHandler = (projectile: GunProjectile) => void;
const fireListeners: GunFireHandler[] = [];

export function onGunFire(handler: GunFireHandler): () => void {
  fireListeners.push(handler);
  return () => {
    const i = fireListeners.indexOf(handler);
    if (i >= 0) fireListeners.splice(i, 1);
  };
}

export function fireGunEvent(projectile: GunProjectile): void {
  for (const h of fireListeners) h(projectile);
}
