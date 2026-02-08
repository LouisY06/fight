// =============================================================================
// ArenaProps.tsx — Theme-specific 3D world building around the arena platform.
//
// Each world has: sky (via ArenaEnvironment), floor, cohesive structures,
// atmospheric lighting, and fog. Assets come from Kenney kits + hangar GLB.
// =============================================================================

import { Suspense, useMemo } from 'react';
import { WorldModel } from './WorldAssets';
import { GAME_CONFIG } from '../game/GameConfig';
import type { ArenaTheme } from './arenaThemes';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface ArenaPropsProps {
  theme: ArenaTheme;
}

export function ArenaProps({ theme }: ArenaPropsProps) {
  switch (theme.id) {
    case 'cyberpunk':
      return <CyberpunkWorld />;
    case 'space-station':
      return <SpaceStationWorld />;
    case 'medieval':
      return <MedievalWorld />;
    case 'castle':
      return <CastleWorld />;
    case 'graveyard':
      return <GraveyardWorld />;
    case 'hangar':
      return <HangarWorld />;
    default:
      return <CyberpunkWorld />;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const R = GAME_CONFIG.arenaRadius; // 12
const BASE = '/assets/worlds';

interface Piece {
  name: string;
  pos: [number, number, number];
  rotY: number;
  scale: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Place items evenly around a circle */
function ring(count: number, radius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    out.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return out;
}

/** Place items along a straight line */
function line(
  startX: number, startZ: number,
  endX: number, endZ: number,
  count: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    out.push([
      startX + (endX - startX) * t,
      startZ + (endZ - startZ) * t,
    ]);
  }
  return out;
}

/** Wrap a WorldModel in Suspense so one failed load doesn't crash everything */
function M({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  path: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <Suspense fallback={null}>
      <WorldModel path={path} position={position} rotation={rotation} scale={scale} />
    </Suspense>
  );
}

/** Render a list of pieces from a folder */
function PieceList({ folder, pieces }: { folder: string; pieces: Piece[] }) {
  return (
    <>
      {pieces.map((p, i) => (
        <M
          key={i}
          path={`${BASE}/${folder}/${p.name}.glb`}
          position={p.pos}
          rotation={[0, p.rotY, 0]}
          scale={p.scale}
        />
      ))}
    </>
  );
}

/** Ground plane with material properties */
function Ground({
  color = '#1a1a1a',
  metalness = 0.2,
  roughness = 0.8,
  size = 120,
}: {
  color?: string;
  metalness?: number;
  roughness?: number;
  size?: number;
}) {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Neon strip light on the ground (emissive box) */
function NeonStrip({
  position,
  rotation = [0, 0, 0],
  size = [4, 0.05, 0.15],
  color = '#00ffff',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
    </mesh>
  );
}

// ==========================================================================
// CYBERPUNK CITY — Night city, neon-drenched, wet streets, dense skyline
// ==========================================================================

function CyberpunkWorld() {
  const pieces = useMemo(() => {
    const r = seededRandom(42);

    const buildingsSmall = [
      'building-a', 'building-b', 'building-c', 'building-d',
      'building-e', 'building-f', 'building-g', 'building-h',
    ];
    const buildingsMedium = [
      'building-i', 'building-j', 'building-k', 'building-l',
      'building-m', 'building-n',
    ];
    const skyscrapers = [
      'building-skyscraper-a', 'building-skyscraper-b',
      'building-skyscraper-c', 'building-skyscraper-d',
      'building-skyscraper-e',
    ];
    const lowDetail = [
      'low-detail-building-a', 'low-detail-building-b',
      'low-detail-building-c', 'low-detail-building-d',
      'low-detail-building-e', 'low-detail-building-f',
      'low-detail-building-g', 'low-detail-building-h',
      'low-detail-building-wide-a', 'low-detail-building-wide-b',
    ];
    const details = [
      'detail-awning', 'detail-awning-wide',
      'detail-overhang', 'detail-overhang-wide',
    ];

    const out: Piece[] = [];
    const sc = 2.5;

    // --- CITY BLOCKS: 4 clusters in each quadrant ---
    // Each block is a tight 2x3 grid of buildings
    const blockCenters = [
      [R + 10, R + 10],
      [-(R + 10), R + 10],
      [R + 10, -(R + 10)],
      [-(R + 10), -(R + 10)],
    ];

    for (const [cx, cz] of blockCenters) {
      const faceAngle = Math.atan2(-cz, -cx); // face toward arena
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const offset = sc * 2; // spacing between buildings
          const lx = (col - 1) * offset;
          const lz = (row - 0.5) * offset;
          // Rotate offset by face angle
          const cos = Math.cos(faceAngle);
          const sin = Math.sin(faceAngle);
          const x = cx + lx * cos - lz * sin;
          const z = cz + lx * sin + lz * cos;
          out.push({
            name: pick([...buildingsSmall, ...buildingsMedium], r),
            pos: [x, 0, z],
            rotY: faceAngle + (r() - 0.5) * 0.3,
            scale: sc * (0.85 + r() * 0.3),
          });
        }
      }
    }

    // --- SIDE STREETS: buildings along +X/-X and +Z/-Z corridors ---
    // Left and right streets
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = (i - 1.5) * 6;
        const x = side * (R + 8);
        out.push({
          name: pick(buildingsMedium, r),
          pos: [x, 0, z],
          rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2,
          scale: sc * (0.9 + r() * 0.2),
        });
      }
    }
    // Front and back streets
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * 6;
        const z = side * (R + 8);
        out.push({
          name: pick(buildingsSmall, r),
          pos: [x, 0, z],
          rotY: side > 0 ? Math.PI : 0,
          scale: sc * (0.9 + r() * 0.2),
        });
      }
    }

    // --- SKYSCRAPERS: taller buildings behind the blocks ---
    const skyscraperPositions = ring(8, R + 25);
    for (const [x, z] of skyscraperPositions) {
      out.push({
        name: pick(skyscrapers, r),
        pos: [x + (r() - 0.5) * 6, 0, z + (r() - 0.5) * 6],
        rotY: r() * Math.PI * 2,
        scale: 4 + r() * 2,
      });
    }

    // --- DISTANT SKYLINE: low-detail fill ---
    const skylinePositions = ring(14, R + 40);
    for (const [x, z] of skylinePositions) {
      out.push({
        name: pick(lowDetail, r),
        pos: [x + (r() - 0.5) * 8, 0, z + (r() - 0.5) * 8],
        rotY: r() * Math.PI * 2,
        scale: 5 + r() * 4,
      });
    }

    // --- AWNINGS / DETAIL between inner buildings ---
    ring(8, R + 6).forEach(([x, z]) => {
      out.push({
        name: pick(details, r),
        pos: [x, 1 + r() * 2, z],
        rotY: Math.atan2(-z, -x),
        scale: sc,
      });
    });

    return out;
  }, []);

  // Neon strip positions on the ground
  const neonStrips = useMemo(() => {
    const strips: { pos: [number, number, number]; rot: number; color: string }[] = [];
    // Radial neon lines pointing outward from arena
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const color = i % 2 === 0 ? '#00ffff' : '#ff00ff';
      strips.push({
        pos: [Math.cos(a) * (R + 3), -0.45, Math.sin(a) * (R + 3)],
        rot: a,
        color,
      });
    }
    // Ring of neon at arena edge
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      strips.push({
        pos: [Math.cos(a) * (R + 1.5), -0.45, Math.sin(a) * (R + 1.5)],
        rot: a + Math.PI / 2,
        color: '#6600cc',
      });
    }
    return strips;
  }, []);

  return (
    <group>
      {/* Wet asphalt floor — high metalness for neon reflections */}
      <Ground color="#111115" metalness={0.85} roughness={0.3} size={150} />

      {/* City buildings */}
      <PieceList folder="cyberpunk" pieces={pieces} />

      {/* Neon ground strips */}
      {neonStrips.map((s, i) => (
        <NeonStrip
          key={i}
          position={s.pos}
          rotation={[0, s.rot, 0]}
          color={s.color}
          size={[3, 0.04, 0.12]}
        />
      ))}

      {/* Neon point lights around the arena for color splashes */}
      {ring(10, R + 4).map(([x, z], i) => (
        <pointLight
          key={`inner-${i}`}
          color={i % 3 === 0 ? '#ff00ff' : i % 3 === 1 ? '#00ffff' : '#6600ff'}
          intensity={3}
          distance={18}
          decay={2}
          position={[x, 3, z]}
        />
      ))}
      {/* Overhead neon glow from buildings */}
      {ring(6, R + 12).map(([x, z], i) => (
        <pointLight
          key={`mid-${i}`}
          color={i % 2 === 0 ? '#00ffff' : '#ff00ff'}
          intensity={2}
          distance={20}
          decay={2}
          position={[x, 8, z]}
        />
      ))}
    </group>
  );
}

// ==========================================================================
// SPACE STATION — Indoor docking bay, walls forming a room, tech interior
// ==========================================================================

function SpaceStationWorld() {
  const pieces = useMemo(() => {
    const r = seededRandom(100);
    const out: Piece[] = [];
    const wallScale = 3.5;
    const roomHalf = R + 12; // half-width of the room

    // NO floor tiles — they're thick 3D blocks that sit above the arena.
    // The procedural Ground plane handles the floor.

    // --- WALLS: rectangular room perimeter ---
    const wallTypes = ['wall', 'wall', 'wall-detail', 'wall-window', 'wall-pillar'];
    const wallTypesDoor = ['wall-door-center', 'wall-door'];
    const segmentWidth = wallScale;
    const segsPerSide = Math.ceil((roomHalf * 2) / segmentWidth);
    const doorIndex = Math.floor(segsPerSide / 2);

    const walls: { sx: number; sz: number; ex: number; ez: number; faceY: number }[] = [
      { sx: -roomHalf, sz: -roomHalf, ex: roomHalf, ez: -roomHalf, faceY: 0 },
      { sx: -roomHalf, sz: roomHalf, ex: roomHalf, ez: roomHalf, faceY: Math.PI },
      { sx: roomHalf, sz: -roomHalf, ex: roomHalf, ez: roomHalf, faceY: -Math.PI / 2 },
      { sx: -roomHalf, sz: -roomHalf, ex: -roomHalf, ez: roomHalf, faceY: Math.PI / 2 },
    ];

    for (const { sx, sz, ex, ez, faceY } of walls) {
      const positions = line(sx, sz, ex, ez, segsPerSide);
      positions.forEach(([x, z], i) => {
        const isDoor = i === doorIndex;
        out.push({
          name: isDoor ? pick(wallTypesDoor, r) : pick(wallTypes, r),
          pos: [x, 0, z],
          rotY: faceY,
          scale: wallScale,
        });
      });
    }

    // --- CORNER PIECES ---
    const corners: [number, number][] = [
      [-roomHalf, -roomHalf], [roomHalf, -roomHalf],
      [-roomHalf, roomHalf], [roomHalf, roomHalf],
    ];
    for (const [x, z] of corners) {
      out.push({
        name: 'wall-corner',
        pos: [x, 0, z],
        rotY: Math.atan2(z, x),
        scale: wallScale,
      });
    }

    // --- COMPUTER SYSTEMS along walls (inside) ---
    const computers = ['computer-system', 'computer-wide', 'computer-screen', 'display-wall', 'display-wall-wide'];
    for (const zSide of [-roomHalf + 2, roomHalf - 2]) {
      for (let i = 0; i < 5; i++) {
        const x = -roomHalf + 4 + i * 5;
        if (Math.abs(x) < roomHalf - 2) {
          out.push({
            name: pick(computers, r),
            pos: [x, 0, zSide],
            rotY: zSide < 0 ? 0 : Math.PI,
            scale: 2.5,
          });
        }
      }
    }

    // --- CONTAINERS in corners and along walls ---
    const containers = ['container', 'container-tall', 'container-wide', 'container-flat'];
    const containerSpots: [number, number][] = [
      [-roomHalf + 3, -roomHalf + 3],
      [roomHalf - 3, -roomHalf + 3],
      [-roomHalf + 3, roomHalf - 3],
      [roomHalf - 3, roomHalf - 3],
      [-roomHalf + 3, 0],
      [roomHalf - 3, 0],
    ];
    for (const [x, z] of containerSpots) {
      out.push({
        name: pick(containers, r),
        pos: [x, 0, z],
        rotY: r() * Math.PI * 2,
        scale: 2.5,
      });
    }

    // --- STRUCTURE BARRIERS near arena (safety rails) ---
    const barriers = ['structure-barrier', 'structure-barrier-high'];
    ring(12, R + 2).forEach(([x, z]) => {
      out.push({
        name: pick(barriers, r),
        pos: [x, 0, z],
        rotY: Math.atan2(z, x) + Math.PI / 2,
        scale: 2,
      });
    });

    // No floating pipes — they looked random and bad.

    return out;
  }, []);

  return (
    <group>
      {/* Dark metallic floor — no GLB tiles, just a clean procedural surface */}
      <Ground color="#0e0e14" metalness={0.75} roughness={0.35} size={80} />

      {/* All station pieces */}
      <PieceList folder="space-station" pieces={pieces} />

      {/* Blue accent glow from computer screens */}
      {ring(6, R + 8).map(([x, z], i) => (
        <pointLight
          key={i}
          color="#4488ff"
          intensity={1.5}
          distance={10}
          decay={2}
          position={[x, 2, z]}
        />
      ))}

      {/* Overhead white lights (simulating ceiling panels) */}
      {ring(4, R + 4).map(([x, z], i) => (
        <pointLight
          key={`ceil-${i}`}
          color="#ccddff"
          intensity={2}
          distance={15}
          decay={2}
          position={[x, 5, z]}
        />
      ))}
    </group>
  );
}

// ==========================================================================
// MEDIEVAL VILLAGE — Dusk, cobblestone plaza, half-timber buildings, torches
// ==========================================================================

function MedievalWorld() {
  const pieces = useMemo(() => {
    const r = seededRandom(200);
    const out: Piece[] = [];
    const sc = 2.5;
    const courtyard = R + 6; // distance to main buildings

    // NO floor tiles — Kenney floor GLBs are thick blocks that sit above the arena.
    // The procedural Ground plane provides the floor surface.

    // --- BUILDINGS: walls + roofs forming structures on 4 sides ---
    const wallTypes = ['wall', 'wall-paint', 'wall-fortified', 'wall-window', 'wall-paint-window'];
    const roofTypes = ['roof', 'roof-edge', 'roof-side'];

    // 4 building rows, one per side of the courtyard
    const sides: { cx: number; cz: number; rotY: number }[] = [
      { cx: 0, cz: -(courtyard + 2), rotY: 0 },
      { cx: 0, cz: courtyard + 2, rotY: Math.PI },
      { cx: courtyard + 2, cz: 0, rotY: -Math.PI / 2 },
      { cx: -(courtyard + 2), cz: 0, rotY: Math.PI / 2 },
    ];

    for (const { cx, cz, rotY } of sides) {
      // 4 wall segments per side
      for (let i = 0; i < 4; i++) {
        const lx = (i - 1.5) * sc;
        const x = cx + lx * Math.cos(rotY + Math.PI / 2);
        const z = cz + lx * Math.sin(rotY + Math.PI / 2);
        // Ground floor wall
        out.push({
          name: pick(wallTypes, r),
          pos: [x, 0, z],
          rotY: rotY,
          scale: sc,
        });
        // Second floor wall (stacked)
        out.push({
          name: pick(['wall-paint', 'wall-pane-paint', 'wall-pane-wood'], r),
          pos: [x, sc, z],
          rotY: rotY,
          scale: sc,
        });
        // Roof on top
        out.push({
          name: pick(roofTypes, r),
          pos: [x, sc * 2, z],
          rotY: rotY,
          scale: sc,
        });
      }
    }

    // --- CORNER TOWERS ---
    const towerSpots: [number, number][] = [
      [courtyard + 2, courtyard + 2],
      [-(courtyard + 2), courtyard + 2],
      [courtyard + 2, -(courtyard + 2)],
      [-(courtyard + 2), -(courtyard + 2)],
    ];
    for (const [x, z] of towerSpots) {
      out.push({ name: 'tower-base', pos: [x, 0, z], rotY: Math.atan2(-z, -x), scale: sc });
      out.push({ name: 'tower', pos: [x, sc, z], rotY: Math.atan2(-z, -x), scale: sc });
      out.push({ name: 'tower-top', pos: [x, sc * 2, z], rotY: Math.atan2(-z, -x), scale: sc });
    }

    // --- COLUMNS around the arena edge (colonnade) ---
    ring(10, R + 2).forEach(([x, z]) => {
      out.push({
        name: pick(['column', 'column-paint', 'column-wood'], r),
        pos: [x, 0, z],
        rotY: 0,
        scale: sc,
      });
    });

    // --- DETAIL PROPS scattered in courtyard ---
    const detailProps = ['detail-barrel', 'detail-crate', 'barrels', 'bricks'];
    ring(8, R + 4).forEach(([x, z]) => {
      if (r() > 0.4) {
        out.push({
          name: pick(detailProps, r),
          pos: [x + (r() - 0.5) * 2, 0, z + (r() - 0.5) * 2],
          rotY: r() * Math.PI * 2,
          scale: 1.8,
        });
      }
    });

    // --- FENCES along outer edges ---
    ring(16, courtyard + 6).forEach(([x, z]) => {
      out.push({
        name: pick(['fence', 'fence-wood'], r),
        pos: [x, 0, z],
        rotY: Math.atan2(z, x) + Math.PI / 2,
        scale: sc,
      });
    });

    // --- TREES beyond the village ---
    ring(8, courtyard + 10).forEach(([x, z]) => {
      out.push({
        name: pick(['tree-large', 'tree-shrub'], r),
        pos: [x + (r() - 0.5) * 5, 0, z + (r() - 0.5) * 5],
        rotY: r() * Math.PI * 2,
        scale: 2 + r() * 1.5,
      });
    });

    return out;
  }, []);

  return (
    <group>
      {/* Warm earth ground base */}
      <Ground color="#3a2a18" metalness={0.05} roughness={0.95} size={120} />

      <PieceList folder="medieval" pieces={pieces} />

      {/* Torchlight around the courtyard */}
      {ring(8, R + 2.5).map(([x, z], i) => (
        <pointLight
          key={`torch-${i}`}
          color="#ff8833"
          intensity={3}
          distance={12}
          decay={2}
          position={[x, 3, z]}
        />
      ))}
      {/* Warm sunset-like fill from above */}
      <pointLight color="#ffaa44" intensity={2} distance={50} position={[0, 15, 0]} />
    </group>
  );
}

// ==========================================================================
// CASTLE SIEGE — Daytime outdoor, fortress walls, siege weapons, nature
// ==========================================================================

function CastleWorld() {
  const pieces = useMemo(() => {
    const r = seededRandom(300);
    const out: Piece[] = [];
    const wallDist = R + 8;
    const sc = 2.5;

    // NO ground GLBs — they're thick blocks that clip above the arena platform.
    // The procedural Ground plane provides the green grass floor.

    // --- CASTLE WALLS in an octagonal perimeter ---
    const wallTypes = ['wall', 'wall', 'wall-half', 'wall-pillar'];
    const wallCount = 20;
    ring(wallCount, wallDist).forEach(([x, z], i) => {
      // Leave 2 gaps for entrances (at index 0 and wallCount/2)
      if (i % (wallCount / 2) === 0) {
        // Gate at entrance
        out.push({
          name: 'gate',
          pos: [x, 0, z],
          rotY: Math.atan2(z, x) + Math.PI / 2,
          scale: sc,
        });
      } else {
        out.push({
          name: pick(wallTypes, r),
          pos: [x, 0, z],
          rotY: Math.atan2(z, x) + Math.PI / 2,
          scale: sc,
        });
      }
    });

    // --- WALL STUDS / top decorations ---
    ring(wallCount, wallDist).forEach(([x, z], i) => {
      if (i % (wallCount / 2) !== 0 && r() > 0.5) {
        out.push({
          name: 'wall-stud',
          pos: [x, sc, z],
          rotY: Math.atan2(z, x) + Math.PI / 2,
          scale: sc,
        });
      }
    });

    // --- CORNER TOWERS (at 4 cardinal points + diagonals) ---
    const towerPositions = ring(6, wallDist + 2);
    for (const [x, z] of towerPositions) {
      const ty = Math.atan2(z, x);
      out.push({ name: 'tower-square-base', pos: [x, 0, z], rotY: ty, scale: sc });
      out.push({ name: 'tower-square-mid', pos: [x, sc, z], rotY: ty, scale: sc });
      out.push({ name: 'tower-square-top', pos: [x, sc * 2, z], rotY: ty, scale: sc });
      // Flag on top of tower (just above top block so it doesn't float in the sky)
      out.push({
        name: pick(['flag', 'flag-banner-long'], r),
        pos: [x, sc * 2 + 0.6, z],
        rotY: r() * Math.PI * 2,
        scale: sc,
      });
    }

    // --- SIEGE WEAPONS outside the walls ---
    const siegeWeapons = ['siege-catapult', 'siege-ballista', 'siege-trebuchet', 'siege-ram'];
    ring(5, wallDist + 8).forEach(([x, z]) => {
      out.push({
        name: pick(siegeWeapons, r),
        pos: [x + (r() - 0.5) * 4, 0, z + (r() - 0.5) * 4],
        rotY: Math.atan2(-z, -x), // facing the castle
        scale: sc,
      });
    });

    // --- TREES AND ROCKS (nature around the castle) ---
    ring(10, wallDist + 14).forEach(([x, z]) => {
      out.push({
        name: pick(['tree-large', 'tree-small', 'rocks-large', 'rocks-small'], r),
        pos: [x + (r() - 0.5) * 6, 0, z + (r() - 0.5) * 6],
        rotY: r() * Math.PI * 2,
        scale: sc * (0.8 + r() * 0.6),
      });
    });

    // More distant trees for depth
    ring(14, wallDist + 25).forEach(([x, z]) => {
      out.push({
        name: pick(['tree-large', 'tree-small'], r),
        pos: [x + (r() - 0.5) * 8, 0, z + (r() - 0.5) * 8],
        rotY: r() * Math.PI * 2,
        scale: sc * (1 + r()),
      });
    });

    // --- BRIDGES leading to gates ---
    out.push({ name: 'bridge-straight', pos: [wallDist + 4, 0, 0], rotY: Math.PI / 2, scale: sc });
    out.push({ name: 'bridge-straight', pos: [-(wallDist + 4), 0, 0], rotY: -Math.PI / 2, scale: sc });

    return out;
  }, []);

  return (
    <group>
      {/* Green grass ground */}
      <Ground color="#4a6a2a" metalness={0.02} roughness={0.95} size={150} />

      <PieceList folder="castle" pieces={pieces} />

      {/* Bright outdoor sunlight feel */}
      <directionalLight
        color="#ffffdd"
        intensity={2}
        position={[-15, 25, 10]}
        castShadow
      />
      {/* Warm fill from opposite side */}
      <pointLight color="#ffcc88" intensity={1.5} distance={40} position={[10, 8, -10]} />
    </group>
  );
}

// ==========================================================================
// GRAVEYARD — Foggy night, iron fences, organized graves, crypts, dead trees
// ==========================================================================

function GraveyardWorld() {
  const pieces = useMemo(() => {
    const r = seededRandom(400);
    const out: Piece[] = [];
    const sc = 2;
    const fenceDist = R + 6;

    // --- ROAD PATHS radiating from arena ---
    // Placed well below arena level so they don't clip above the platform
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      for (let d = R + 2; d < fenceDist + 10; d += sc) {
        out.push({
          name: 'road',
          pos: [Math.cos(angle) * d, -1.5, Math.sin(angle) * d],
          rotY: angle,
          scale: sc,
        });
      }
    }

    // --- IRON FENCE PERIMETER ---
    const fenceCount = 24;
    ring(fenceCount, fenceDist).forEach(([x, z], i) => {
      // Gate at 2 positions
      if (i === 0 || i === fenceCount / 2) {
        out.push({
          name: 'iron-fence-border-gate',
          pos: [x, 0, z],
          rotY: Math.atan2(z, x) + Math.PI / 2,
          scale: sc,
        });
      } else {
        out.push({
          name: pick(['iron-fence', 'iron-fence-border', 'iron-fence'], r),
          pos: [x, 0, z],
          rotY: Math.atan2(z, x) + Math.PI / 2,
          scale: sc,
        });
      }
    });

    // --- FENCE CORNER PILLARS ---
    ring(8, fenceDist).forEach(([x, z]) => {
      out.push({
        name: 'iron-fence-border-column',
        pos: [x, 0, z],
        rotY: 0,
        scale: sc,
      });
    });

    // --- GRAVESTONES in organized rows (4 rows radiating out) ---
    const graves = [
      'gravestone-wide', 'gravestone-cross', 'gravestone-round',
      'gravestone-decorative', 'gravestone-bevel', 'gravestone-broken',
    ];
    // Place graves in ordered rows between the paths
    for (let sector = 0; sector < 4; sector++) {
      const baseAngle = (sector / 4) * Math.PI * 2 + Math.PI / 4; // offset from paths
      for (let row = 0; row < 3; row++) {
        const dist = R + 3 + row * 2.5;
        for (let col = 0; col < 4; col++) {
          const angle = baseAngle + (col - 1.5) * 0.15;
          out.push({
            name: pick(graves, r),
            pos: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
            rotY: angle + Math.PI, // face outward
            scale: sc * (0.8 + r() * 0.4),
          });
        }
      }
    }

    // --- CROSSES scattered ---
    ring(6, R + 4).forEach(([x, z]) => {
      out.push({
        name: pick(['cross', 'cross-wood', 'cross-column'], r),
        pos: [x + (r() - 0.5) * 2, 0, z + (r() - 0.5) * 2],
        rotY: r() * Math.PI * 2,
        scale: sc * 1.2,
      });
    });

    // --- CRYPTS at 3 positions beyond the fence ---
    const cryptSpots: [number, number][] = [
      [fenceDist + 6, 0],
      [-(fenceDist + 4), fenceDist + 4],
      [0, -(fenceDist + 6)],
    ];
    for (const [x, z] of cryptSpots) {
      const cryptType = pick(['crypt-large', 'crypt-a', 'crypt-b'], r);
      out.push({
        name: cryptType,
        pos: [x, 0, z],
        rotY: Math.atan2(-z, -x),
        scale: sc * 1.5,
      });
      // Add door to large crypts
      if (cryptType === 'crypt-large') {
        out.push({
          name: 'crypt-large-roof',
          pos: [x, sc * 1.5, z],
          rotY: Math.atan2(-z, -x),
          scale: sc * 1.5,
        });
      }
    }

    // --- DEAD TREES forming dark canopy ---
    const trees = ['pine-crooked', 'pine-fall', 'trunk', 'trunk-long'];
    ring(10, fenceDist + 3).forEach(([x, z]) => {
      out.push({
        name: pick(trees, r),
        pos: [x + (r() - 0.5) * 4, 0, z + (r() - 0.5) * 4],
        rotY: r() * Math.PI * 2,
        scale: sc * (1.2 + r() * 0.8),
      });
    });
    // More distant pines
    ring(12, fenceDist + 12).forEach(([x, z]) => {
      out.push({
        name: pick(['pine', 'pine-crooked'], r),
        pos: [x + (r() - 0.5) * 6, 0, z + (r() - 0.5) * 6],
        rotY: r() * Math.PI * 2,
        scale: sc * (1.5 + r()),
      });
    });

    // --- LIGHTPOSTS along paths ---
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const dist = R + 4;
      out.push({
        name: pick(['lightpost-single', 'lightpost-double'], r),
        pos: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
        rotY: angle,
        scale: sc,
      });
    }

    // --- STONE WALLS in the distance (ruined boundary) ---
    ring(8, fenceDist + 8).forEach(([x, z]) => {
      out.push({
        name: pick(['stone-wall', 'stone-wall-damaged', 'brick-wall'], r),
        pos: [x, 0, z],
        rotY: Math.atan2(z, x) + Math.PI / 2,
        scale: sc * 1.3,
      });
    });

    // --- PROPS: altar, benches, fire baskets ---
    out.push({ name: 'altar-stone', pos: [0, 0, R + 2], rotY: 0, scale: sc * 1.5 });
    ring(4, R + 5).forEach(([x, z]) => {
      out.push({
        name: pick(['bench', 'fire-basket', 'candle-multiple'], r),
        pos: [x, 0, z],
        rotY: Math.atan2(-z, -x),
        scale: sc,
      });
    });

    // A couple of carved pumpkins for flavor
    out.push({ name: 'pumpkin-carved', pos: [R + 3, 0, R + 1], rotY: 0, scale: sc });
    out.push({ name: 'pumpkin-tall-carved', pos: [-(R + 2), 0, -(R + 3)], rotY: 0, scale: sc });

    return out;
  }, []);

  return (
    <group>
      {/* Dark earth ground */}
      <Ground color="#121210" metalness={0.05} roughness={0.95} size={120} />

      <PieceList folder="graveyard" pieces={pieces} />

      {/* Dim moonlight from above */}
      <directionalLight color="#8899bb" intensity={0.4} position={[5, 20, -5]} />

      {/* Eerie lantern glow along paths */}
      {ring(4, R + 4).map(([x, z], i) => (
        <pointLight
          key={`lantern-${i}`}
          color="#ffaa44"
          intensity={2}
          distance={10}
          decay={2}
          position={[x, 3.5, z]}
        />
      ))}

      {/* Ghostly blue ambient from the crypts */}
      <pointLight color="#4466aa" intensity={1} distance={25} position={[R + 8, 2, 0]} />
      <pointLight color="#4466aa" intensity={1} distance={25} position={[0, 2, -(R + 8)]} />

      {/* Fire basket glow */}
      {ring(4, R + 5).map(([x, z], i) => (
        <pointLight
          key={`fire-${i}`}
          color="#ff6622"
          intensity={1.5}
          distance={8}
          decay={2}
          position={[x, 1, z]}
        />
      ))}
    </group>
  );
}

// ==========================================================================
// MECH HANGAR — Pre-built hangar GLB, industrial interior
// ==========================================================================

function HangarWorld() {
  return (
    <group>
      {/* Concrete industrial floor */}
      <Ground color="#2a2a2a" metalness={0.4} roughness={0.6} size={100} />

      {/* The actual hangar model — pushed far enough back so the arena
          platform sits in the open yard in front of the building,
          not inside the structure. */}
      <M
        path={`${BASE}/hangar/mech_hangar.glb`}
        position={[0, 0, R + 24]}
        rotation={[0, Math.PI, 0]}
        scale={4}
      />

      {/* Second hangar on the opposite side for symmetry */}
      <M
        path={`${BASE}/hangar/mech_hangar.glb`}
        position={[0, 0, -(R + 24)]}
        rotation={[0, 0, 0]}
        scale={4}
      />

      {/* Overhead industrial lights */}
      {ring(6, R + 4).map(([x, z], i) => (
        <pointLight
          key={i}
          color="#ffaa66"
          intensity={2.5}
          distance={15}
          decay={2}
          position={[x, 8, z]}
        />
      ))}

      {/* Warning stripe lights around arena perimeter */}
      {ring(8, R + 2).map(([x, z], i) => (
        <pointLight
          key={`warn-${i}`}
          color={i % 2 === 0 ? '#ffaa00' : '#ff4400'}
          intensity={1}
          distance={6}
          decay={2}
          position={[x, 0.5, z]}
        />
      ))}

      {/* Distant hangar bay lights */}
      <pointLight color="#ffcc88" intensity={3} distance={30} decay={2} position={[0, 12, R + 20]} />
      <pointLight color="#ffcc88" intensity={3} distance={30} decay={2} position={[0, 12, -(R + 20)]} />
    </group>
  );
}
