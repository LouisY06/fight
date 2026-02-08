# SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM

## 🎮 Tagline
A gesture-driven first-person mecha combat game where your body movements control a giant robot through webcam pose tracking and AI-powered commentary.

## 🚀 Inspiration
We wanted to break down the barrier between player and game by making your physical movements directly control a massive mecha warrior. Inspired by VR experiences but accessible through just a webcam, we created a "phygital" combat system where punching in real life translates to devastating mecha strikes in the game.

## 🔥 What It Does

**SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM** is a first-person mecha combat game with three groundbreaking features:

1. **Gesture-Driven Combat**: Your body movements control the mecha through MediaPipe pose tracking. Punch with your right arm to swing the mecha's sword, move your body to dodge attacks.

2. **Dynamic AI Commentary**: Powered by Google Gemini and ElevenLabs, an AI announcer provides real-time fight commentary that adapts to your combat style, landing critical hits, and dramatic moments.

3. **Multiplayer Arena**: Battle friends online with WebSocket-based real-time multiplayer, featuring:
   - Quick Match auto-matchmaking
   - Private room creation with 4-letter codes
   - Best-of-3 rounds with dynamic arena environments

4. **AI Opponents**: Fight against Vultr-powered AI opponents that learn from your fighting patterns and adapt their strategies.

## 🛠️ Tech Stack

### Frontend & Rendering
- **React 19 + TypeScript** — Modern UI framework with type safety
- **React Three Fiber** — Declarative Three.js rendering
- **Three.js** — WebGL 3D graphics engine
- **@react-three/drei** — Useful helpers for R3F
- **@react-three/postprocessing** — Cinematic visual effects
- **three.quarks** — Particle systems for combat effects

### Computer Vision & Input
- **MediaPipe Tasks Vision** — Real-time pose tracking (33 body landmarks)
- **Custom CV Bridge** — Quaternion slerping for smooth bone rotations
- **Gesture Mapping System** — Translates body movements to mecha controls

### Physics & Combat
- **@react-three/rapier** — WASM-based physics engine (Rapier)
- **Custom Combat System** — Melee raycasting, damage calculation, clash detection
- **Spell System** — Special abilities with cooldowns and VFX

### AI Services
- **Google Gemini API** — Dynamic fight commentary generation
- **ElevenLabs API** — Text-to-speech for AI announcer voice
- **Vultr Serverless Inference** — AI opponent behavior and decision-making

### Networking & State
- **WebSocket (ws)** — Real-time multiplayer relay server
- **Zustand** — Client-side state management
- **Express** — WebSocket server backend

### Audio
- **Howler.js** — Spatial audio engine for combat sounds
- **ElevenLabs TTS** — Dynamic voiceover synthesis

### Desktop Distribution
- **Electron** — Cross-platform desktop app
- **electron-builder** — Packaging for macOS, Windows, Linux

### Build & Dev Tools
- **Vite** — Lightning-fast HMR and bundling
- **TypeScript** — Type safety across the entire codebase

### Deployment
- **Railway** — Multiplayer server hosting
- **Cross-platform builds** — macOS (.dmg), Windows (NSIS), Linux (AppImage, .deb)

## 🎨 How We Built It

### 1. Gesture Recognition Pipeline
We integrated MediaPipe's 33-landmark pose detection system and built a custom CV bridge that:
- Tracks shoulder, elbow, and wrist positions in real-time
- Converts landmark positions to quaternion rotations using slerping
- Maps arm movements to mecha sword swings with smooth interpolation
- Detects punch gestures by analyzing velocity and extension

### 2. 3D Mecha Rendering
Using React Three Fiber, we created:
- First-person cockpit viewmodel with animated arms
- Procedural mecha models with customizable parts
- Dynamic lighting systems with rim lights for dramatic effect
- Particle effects for hits, clashes, and special abilities
- Post-processing effects (bloom, chromatic aberration, vignette)

### 3. AI Commentary System
Built a two-stage AI pipeline:
- **Context Analysis**: Gemini analyzes fight state (health, combo chains, special moves)
- **Dynamic Script Generation**: Creates context-aware commentary lines
- **Voice Synthesis**: ElevenLabs speaks the lines with professional announcer voice
- **Timing System**: Queues and delivers commentary at dramatic moments

### 4. Multiplayer Architecture
Designed a lightweight relay server that:
- Handles room creation with 4-letter codes
- Implements auto-matchmaking for quick matches
- Syncs player positions, health, and combat events
- Manages round timers and victory conditions

### 5. Combat System
Engineered a satisfying melee combat system with:
- Raycasting for sword hit detection
- Clash mechanics when both players swing simultaneously
- Stun states and knockback physics
- Special abilities (dash, shield, power strikes)
- Visual feedback (damage numbers, screen shake, impact effects)

## 🧗 Challenges We Ran Into

1. **Latency in Pose Tracking**: MediaPipe runs at 30fps but the game renders at 60fps. We built an interpolation system using quaternion slerping to create smooth animations.

2. **Gesture Recognition Accuracy**: Detecting intentional punches vs. casual movements required calibrating velocity thresholds and adding cooldown timers.

3. **Multiplayer Synchronization**: Balancing responsiveness vs. cheat prevention led us to use client-side prediction with server reconciliation.

4. **AI Commentary Timing**: Preventing commentary overlap and ensuring dramatic delivery required building a queue system with priority levels and cooldowns.

5. **Cross-Platform Distribution**: Supporting macOS, Windows, and Linux with Electron required careful handling of file paths and platform-specific builds.

## 🏆 Accomplishments That We're Proud Of

- **Seamless Gesture Control**: Body movements feel natural and responsive, creating an intuitive "you ARE the mecha" experience
- **Real-Time AI Commentary**: Dynamic announcer that reacts to your playstyle feels like a professional esports broadcast
- **Smooth Multiplayer**: Sub-100ms latency in online battles with no desync issues
- **Beautiful Visuals**: Cinematic post-processing and particle effects rival AAA game quality
- **Complete Package**: From gesture tracking to AI opponents to online multiplayer—a fully realized game

## 📚 What We Learned

- **Computer Vision Integration**: How to bridge MediaPipe landmarks to 3D skeletal animation using quaternions
- **WebSocket Optimization**: Minimizing packet size and implementing delta compression for smooth multiplayer
- **AI Service Orchestration**: Chaining multiple AI APIs (Gemini → ElevenLabs) for dynamic content
- **React Three Fiber Performance**: Optimizing 3D rendering in React without sacrificing declarative patterns
- **TypeScript in Game Development**: Type safety caught countless bugs in our combat and networking systems

## 🚢 What's Next for SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM

### Near-Term Features
- **2v2 Cooperative Mode**: One player controls movement, the other controls weapons
- **Tournament System**: Ranked matchmaking with leaderboards
- **Mecha Customization**: Unlock parts, skins, and special abilities
- **More Gestures**: Kicks, grabs, dodges, and signature finishing moves

### Long-Term Vision
- **VR Support**: Full body tracking in VR for maximum immersion
- **Physical Controllers**: Arduino-powered motion sensors for enhanced feedback
- **Mobile Version**: Simplified controls for tablet/phone play
- **Spectator Mode**: Watch matches with live AI commentary
- **Map Editor**: Community-created arenas with Gemini-powered generation

## 🎥 Demo & Links

- **Live Demo**: [Coming Soon]
- **GitHub Repository**: [Coming Soon]
- **Gameplay Video**: [Coming Soon]
- **Try It Yourself**: Download for macOS, Windows, or Linux

## 🛠️ Built With

`typescript` `react` `threejs` `react-three-fiber` `mediapipe` `google-gemini` `elevenlabs` `vultr` `websocket` `electron` `vite` `zustand` `rapier` `howlerjs` `computer-vision` `ai-commentary` `multiplayer` `gesture-recognition`

---

## 📋 Setup Instructions

### Prerequisites
- Node.js >= 18
- npm >= 9
- Webcam for gesture control
- API Keys:
  - [Google Gemini](https://aistudio.google.com/apikey)
  - [ElevenLabs](https://elevenlabs.io)
  - [Vultr Serverless Inference](https://my.vultr.com)

### Installation

```bash
cd "3js ARENA"
npm install
```

Create `.env` file:
```env
VITE_GEMINI_API_KEY=your_gemini_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
VITE_VULTR_API_KEY=your_vultr_key
VITE_WS_URL=ws://localhost:3001
```

### Run Locally

```bash
# Start game client
npm run dev

# Start multiplayer server (separate terminal)
npm run server

# Or run both at once
npm run dev:all
```

Open `http://localhost:5173` and allow camera access.

### Build Desktop App

```bash
npm run dist:mac      # macOS
npm run dist:win      # Windows
npm run dist:linux    # Linux
```

Outputs to `release/` folder.

## 🎮 Controls

| Action | Input |
|--------|-------|
| Move | WASD |
| Look | Mouse |
| Attack | Left Click OR Real-life punch |
| Block | Hold Right Click |
| Special Ability | Q |
| Dash | Shift |
| Pause | ESC |

## 🤝 Team

Built with passion by developers who believe the future of gaming is phygital!

---

**Experience the thrill of piloting a giant mecha with just your webcam. Your body is the controller. Your movements are the weapon. Are you ready to fight?**

🤖⚔️🔥
