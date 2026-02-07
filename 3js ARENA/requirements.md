# 3js ARENA — Requirements

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A **Gemini API key** (for the Map Generator dev tool) — get one at https://aistudio.google.com/apikey

## Setup

```bash
cd "3js ARENA"
npm install
```

Create a `.env` file in the `3js ARENA/` root (see `.env.example`):

```
VITE_GEMINI_API_KEY=your_api_key_here
VITE_WS_URL=wss://your-railway-url.up.railway.app
```

## Running

### Game (dev mode — browser)

```bash
npm run dev
```

Opens at `http://localhost:5173`. Click the canvas to lock the pointer.

### Multiplayer Server (local dev)

```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:3001`. For local testing, set `VITE_WS_URL=ws://localhost:3001` in `.env`.

### Both at once

```bash
npm run dev:all
```

Requires `concurrently` (`npm i -D concurrently`).

### Map Generator (dev tool)

```bash
npm run map-generator
```

Opens a standalone Electron window for generating arena panoramas with Gemini.

### Build Desktop App (Electron)

```bash
npm run dist          # current platform
npm run dist:mac      # macOS .dmg + .zip
npm run dist:win      # Windows NSIS + .zip
npm run dist:linux    # Linux AppImage + .deb
```

Output goes to `release/`.

## Deploying the Server

The `server/` folder deploys independently to **Railway** (or any Node.js host).

- **Root directory:** `3js ARENA/server`
- **Build command:** `npm install`
- **Start command:** `npm start`
- Railway provides `PORT` automatically; the server reads `process.env.PORT`.

Once deployed, update `VITE_WS_URL` in `.env` to `wss://your-app.up.railway.app`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + TypeScript |
| 3D Engine | Three.js via React Three Fiber |
| Physics | Rapier (WASM) via @react-three/rapier |
| State Management | Zustand |
| Multiplayer | WebSocket (ws) relay server |
| Desktop App | Electron + electron-builder |
| Build Tool | Vite |
| AI Image Gen | Google Gemini API (Map Generator) |
| Audio | Howler.js |
| Post-processing | @react-three/postprocessing |
| Particles | three.quarks |

## Project Structure

```
3js ARENA/
├── electron/              # Electron main process scripts
│   ├── main.ts            # Game window
│   ├── map-generator.ts   # Map Generator window
│   └── preload.ts         # IPC bridge
├── server/                # Multiplayer WebSocket server (deploys separately)
│   ├── index.ts           # Express + ws entry point
│   ├── rooms.ts           # Room management + matchmaking
│   ├── protocol.ts        # Shared message types
│   └── package.json
├── src/
│   ├── arena/             # Arena environment, lighting, skybox, platform
│   ├── audio/             # Sound manager + sound definitions
│   ├── combat/            # Attack types, damage calc, melee raycasting
│   ├── cv/                # Computer vision input (placeholder)
│   ├── entities/          # Player, weapons, viewmodel sword, hit effects
│   ├── game/              # GameState, GameEngine, GameConfig, InputManager, FPS camera
│   ├── networking/         # WebSocket client, NetworkProvider, protocol, input sync
│   ├── tools/             # Dev tools (Map Generator)
│   ├── ui/                # HUD, menus, health bars, lobby, crosshair
│   ├── utils/             # Math + random helpers
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
├── public/assets/         # Static assets (arena images, sounds)
├── .env                   # Environment variables (not committed)
├── .env.example           # Template for .env
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Controls

| Action | Key |
|--------|-----|
| Move | WASD |
| Look | Mouse |
| Attack (swing sword) | Left Click |
| Pause | ESC |

## Game Modes

- **Local Practice** — Fight a dummy opponent locally
- **Online 1v1** — Quick Match (auto-matchmaking), Create Room (4-letter code), or Join Room
- **2v2** — Coming soon (one player moves, one shoots)
