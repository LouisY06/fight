// =============================================================================
// arenaThemes.ts — Arena theme registry (one per Kenney world kit + hangar)
// =============================================================================

export interface ArenaTheme {
  id: string;
  name: string;
  skybox: string;
  platformTexture: string;
  ambientLight: { color: string; intensity: number };
  spotLights: Array<{
    color: string;
    intensity: number;
    position: [number, number, number];
  }>;
  fog: { color: string; near: number; far: number };
  particleColor: string;
  ambientSound: string;
  /** Gradient sky fallback when no skybox image exists */
  skyGradient: { top: string; bottom: string };
  /** Show stars in the sky */
  stars: boolean;
}

export const ARENA_THEMES: ArenaTheme[] = [
  // ---- CYBERPUNK CITY (night) ----
  {
    id: 'cyberpunk',
    name: 'Cyberpunk City',
    skybox: '/assets/environments/cyberpunk-pit.jpg',
    platformTexture: '/assets/textures/metal-grate',
    ambientLight: { color: '#6600ff', intensity: 0.25 },
    spotLights: [
      { color: '#00ffff', intensity: 2.5, position: [0, 12, 0] },
      { color: '#ff00ff', intensity: 1.5, position: [5, 8, -5] },
    ],
    fog: { color: '#06001a', near: 25, far: 70 },
    particleColor: '#00ffff',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
    skyGradient: { top: '#050018', bottom: '#1a0040' },
    stars: true,
  },

  // ---- SPACE STATION (indoor docking bay — no visible sky) ----
  {
    id: 'space-station',
    name: 'Space Station',
    skybox: '/assets/environments/space-station.jpg',
    platformTexture: '/assets/textures/metal-grate',
    ambientLight: { color: '#aaccff', intensity: 0.3 },
    spotLights: [
      { color: '#ffffff', intensity: 2, position: [0, 12, 0] },
      { color: '#4488ff', intensity: 1.2, position: [3, 10, -3] },
    ],
    fog: { color: '#05050a', near: 20, far: 55 },
    particleColor: '#4488ff',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
    skyGradient: { top: '#020204', bottom: '#08080e' },
    stars: false,
  },

  // ---- MEDIEVAL VILLAGE (dusk / sunset) ----
  {
    id: 'medieval',
    name: 'Medieval Village',
    skybox: '/assets/environments/ancient-temple.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#ffcc66', intensity: 0.3 },
    spotLights: [
      { color: '#ffaa33', intensity: 2, position: [0, 14, 0] },
      { color: '#ff6600', intensity: 1, position: [-4, 8, -4] },
    ],
    fog: { color: '#1a1008', near: 20, far: 65 },
    particleColor: '#ffcc44',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
    skyGradient: { top: '#0a1530', bottom: '#cc6622' },
    stars: false,
  },

  // ---- CASTLE SIEGE (daytime) ----
  {
    id: 'castle',
    name: 'Castle Siege',
    skybox: '/assets/environments/desert-ruins.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#ffdd88', intensity: 0.45 },
    spotLights: [
      { color: '#ffffee', intensity: 2, position: [0, 18, 0] },
      { color: '#ffcc88', intensity: 1, position: [5, 10, -3] },
    ],
    fog: { color: '#c8d8e8', near: 30, far: 80 },
    particleColor: '#ffaa33',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
    skyGradient: { top: '#3366aa', bottom: '#88aacc' },
    stars: false,
  },

  // ---- GRAVEYARD (foggy night) ----
  {
    id: 'graveyard',
    name: 'Graveyard',
    skybox: '/assets/environments/frozen-tundra.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#445566', intensity: 0.2 },
    spotLights: [
      { color: '#88aacc', intensity: 1.5, position: [0, 14, 0] },
      { color: '#446688', intensity: 0.8, position: [-5, 8, 3] },
    ],
    fog: { color: '#0a0a12', near: 15, far: 50 },
    particleColor: '#6688aa',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
    skyGradient: { top: '#0a0a15', bottom: '#1a1a28' },
    stars: true,
  },

  // ---- MECH HANGAR (industrial interior) ----
  {
    id: 'hangar',
    name: 'Mech Hangar',
    skybox: '/assets/environments/volcanic-arena.jpg',
    platformTexture: '/assets/textures/metal-grate',
    ambientLight: { color: '#ffaa66', intensity: 0.3 },
    spotLights: [
      { color: '#ffffff', intensity: 2, position: [0, 15, 0] },
      { color: '#ffaa44', intensity: 1, position: [-5, 10, 5] },
    ],
    fog: { color: '#0a0805', near: 20, far: 60 },
    particleColor: '#ffaa44',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
    skyGradient: { top: '#080605', bottom: '#1a1510' },
    stars: false,
  },
];

/**
 * Get a theme by ID, or return the first theme as fallback.
 */
export function getThemeById(id: string): ArenaTheme {
  return ARENA_THEMES.find((t) => t.id === id) ?? ARENA_THEMES[0];
}
