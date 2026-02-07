# Mecha-Mime: Phygital Combat

A gesture-driven mecha fighting game. Use your webcam and physical props to pilot a mecha in first-person, fighting a real opponent over WebSocket. Runs in the browser or as a standalone Electron desktop app.

## Tech Stack

- **3D Engine:** Three.js (WebGL)
- **Pose Tracking:** MediaPipe Pose Landmarker (GPU-accelerated)
- **Object Detection:** OpenCV.js (HSV color thresholding + LED brightness detection)
- **Networking:** WebSocket relay server (Node.js + ws)
- **Desktop App:** Electron
- **Build Tool:** Vite

## Quick Start

```bash
npm install
```

### Browser Mode

**Solo** (pose tracking + enemy combat, no opponent):
```bash
npm run dev
```

**Two-player:**
```bash
# Terminal 1 — relay server
npm run server

# Terminal 2 — frontend
npm run dev
```

Open two browser tabs to `http://localhost:5173`. Each tab connects a webcam and sends pose data to the other player.

### Electron Desktop App

**Development** (loads from Vite dev server):
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run electron
```

**Build a distributable .dmg / .exe / .AppImage:**
```bash
npm run electron:build
```

Output goes to `release/`. The packaged app embeds the WebSocket relay server — no separate server process needed.

## Controls

| Input | Action |
|---|---|
| Webcam pose | Drives your mecha's arms in first-person |
| Green object near hand | Equips GUN |
| Red object near hand | Equips SWORD |
| Bright LED near fingertip | Fires weapon |
| `1` / `2` / `3` | Keyboard weapon swap (Fists / Gun / Sword) |
| `Space` / `F` | Keyboard fire |

## How It Works

### Pose Tracking
MediaPipe Pose Landmarker detects 33 body landmarks from the webcam at ~30fps. World-space 3D coordinates are mapped to Three.js scene coordinates to drive the mecha's arms, hands, and weapon in real time.

### Phygital Weapon Swap
The webcam frame around your right hand is analyzed for color markers:
- **Green** (HSV 35-85) equips the gun
- **Red** (HSV 0-10 or 170-180) equips the sword

Uses OpenCV.js when loaded, falls back to canvas-based RGB thresholding.

### LED Trigger
A 100x100px region around your right index fingertip is thresholded for extreme brightness (>240). When a bright LED is detected, the weapon fires.

### Combat
Enemies spawn as floating octahedrons. Weapon fire uses Three.js raycasting from your hand direction. Hits trigger particle explosions and flash effects.

### Two-Player Networking
A lightweight WebSocket relay server (`server.js`) forwards pose landmark data between two connected clients. The opponent's full mecha (orange accents, red eyes) appears 6 meters in front of you, mirrored to face you.

## Project Structure

```
├── server.js          # WebSocket relay server (standalone or embedded)
├── electron/
│   └── main.js        # Electron main process
├── index.html         # Main page + HUD overlay
├── src/
│   ├── main.js        # Game loop orchestrator
│   ├── scene.js       # Three.js scene, camera, lighting, bloom
│   ├── mecha.js       # Mecha body parts + landmark mapping
│   ├── tracking.js    # MediaPipe pose detection
│   ├── vision.js      # Color detection + LED trigger
│   ├── combat.js      # Enemy spawning, raycasting, particles
│   ├── network.js     # WebSocket client
│   └── style.css      # HUD styling
```

## HUD Status Indicators

- **SOLO MODE** — No relay server running
- **WAITING FOR OPPONENT** — Connected to server, waiting for player 2
- **PVP ACTIVE** — Both players connected
- **NO CAMERA** — Webcam access denied
- **NO SIGNAL** — Webcam active but no pose detected
