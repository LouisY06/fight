// =============================================================================
// arenaThemes.ts — Arena theme registry
// =============================================================================

export interface ArenaTheme {
  id: string;
  name: string;
  skybox: string; // path to equirectangular image
  platformTexture: string; // path to floor texture set
  ambientLight: { color: string; intensity: number };
  spotLights: Array<{
    color: string;
    intensity: number;
    position: [number, number, number];
  }>;
  fog: { color: string; near: number; far: number };
  particleColor: string; // floating ambient particles
  ambientSound: string; // background audio loop
}

export const ARENA_THEMES: ArenaTheme[] = [
  {
    id: 'volcanic',
    name: 'Volcanic Arena',
    skybox: '/assets/environments/volcanic-arena.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#ff4400', intensity: 0.3 },
    spotLights: [
      { color: '#ff6600', intensity: 2, position: [0, 15, 0] },
      { color: '#ff2200', intensity: 1, position: [-5, 10, 5] },
    ],
    fog: { color: '#1a0500', near: 10, far: 50 },
    particleColor: '#ff4400',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Pit',
    skybox: '/assets/environments/cyberpunk-pit.jpg',
    platformTexture: '/assets/textures/metal-grate',
    ambientLight: { color: '#6600ff', intensity: 0.25 },
    spotLights: [
      { color: '#00ffff', intensity: 2.5, position: [0, 12, 0] },
      { color: '#ff00ff', intensity: 1.5, position: [5, 8, -5] },
    ],
    fog: { color: '#0a0015', near: 12, far: 55 },
    particleColor: '#00ffff',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
  {
    id: 'underwater',
    name: 'Underwater Colosseum',
    skybox: '/assets/environments/underwater-colosseum.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#004466', intensity: 0.35 },
    spotLights: [
      { color: '#00ccff', intensity: 1.8, position: [0, 15, 0] },
      { color: '#00ff88', intensity: 0.8, position: [4, 10, 4] },
    ],
    fog: { color: '#001a2e', near: 8, far: 40 },
    particleColor: '#00ffaa',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
  {
    id: 'ancient-temple',
    name: 'Ancient Temple',
    skybox: '/assets/environments/ancient-temple.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#ffcc66', intensity: 0.3 },
    spotLights: [
      { color: '#ffaa33', intensity: 2, position: [0, 14, 0] },
      { color: '#ff6600', intensity: 1, position: [-4, 8, -4] },
    ],
    fog: { color: '#1a1200', near: 10, far: 50 },
    particleColor: '#ffcc44',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
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
    fog: { color: '#000510', near: 15, far: 60 },
    particleColor: '#4488ff',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
  {
    id: 'frozen-tundra',
    name: 'Frozen Tundra',
    skybox: '/assets/environments/frozen-tundra.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#88ccff', intensity: 0.35 },
    spotLights: [
      { color: '#ccddff', intensity: 1.8, position: [0, 14, 0] },
      { color: '#44aaff', intensity: 1, position: [-5, 8, 3] },
    ],
    fog: { color: '#0a1520', near: 10, far: 45 },
    particleColor: '#aaddff',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
  {
    id: 'neon-cage',
    name: 'Neon Cage',
    skybox: '/assets/environments/neon-cage.jpg',
    platformTexture: '/assets/textures/metal-grate',
    ambientLight: { color: '#ff00aa', intensity: 0.2 },
    spotLights: [
      { color: '#ff0088', intensity: 2.5, position: [0, 12, 0] },
      { color: '#00ffcc', intensity: 1.5, position: [4, 8, 4] },
      { color: '#8800ff', intensity: 1, position: [-4, 8, -4] },
    ],
    fog: { color: '#05000a', near: 12, far: 50 },
    particleColor: '#ff44cc',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
  {
    id: 'desert-ruins',
    name: 'Desert Ruins',
    skybox: '/assets/environments/desert-ruins.jpg',
    platformTexture: '/assets/textures/stone-floor',
    ambientLight: { color: '#ffaa44', intensity: 0.4 },
    spotLights: [
      { color: '#ffcc88', intensity: 1.8, position: [0, 15, 0] },
      { color: '#ff8844', intensity: 0.8, position: [5, 10, -3] },
    ],
    fog: { color: '#1a1005', near: 10, far: 55 },
    particleColor: '#ffaa33',
    ambientSound: '/assets/audio/crowd-ambience.mp3',
  },
];

/**
 * Get a theme by ID, or return the first theme as fallback.
 */
export function getThemeById(id: string): ArenaTheme {
  return ARENA_THEMES.find((t) => t.id === id) ?? ARENA_THEMES[0];
}
