# SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM

Gesture-driven first-person mecha combat. Your body controls the mecha via webcam pose tracking. Fight AI opponents powered by live LLM inference, or battle friends in real-time multiplayer.

## Quick Start

```bash
cd "3js ARENA"
npm install
npm run dev
```

Open the browser and allow camera access. Move your body to control the mecha.

---

## Vultr AI Architecture

The AI opponent ("IRON WRAITH") is powered by **Vultr Serverless Inference**. Every decision — movement, attacks, blocking, and spell casting — is generated live by an LLM on Vultr's GPU infrastructure.

```mermaid
flowchart TB
    subgraph BROWSER["Browser (Client)"]
        GS["Game State\n(health, distance, actions,\nspell cooldowns, debuffs)"]
        BOT["BotOpponent.tsx\n(polls every 0.8–2.5s)"]
        FM["FightMemory\n(localStorage)\nTracks player patterns,\nskill rating, win rate"]
        EXEC["60fps Execution Loop\n(movement, attacks,\nblocking, spells)"]
    end

    subgraph VULTR["Vultr Serverless Inference"]
        MODELS["/v1/models\nAuto-discover\nchat model"]
        LLM["/v1/chat/completions\nLLM generates\ncombat decision"]
    end

    GS -->|snapshot| BOT
    FM -->|"Combat Intelligence\nDossier (TRUE AI)"| BOT
    BOT -->|"POST { system prompt +\nconversation history +\ngame state }"| LLM
    BOT -.->|"first call only"| MODELS
    LLM -->|"JSON response\n{move, action,\ntiming, spell}"| BOT
    BOT -->|decision| EXEC
    EXEC -->|"events"| FM

    style VULTR fill:#1a1a2e,stroke:#ff8c00,stroke-width:2px,color:#fff
    style BROWSER fill:#0d1117,stroke:#4a8fbf,stroke-width:2px,color:#fff
    style LLM fill:#ff8c00,stroke:#fff,stroke-width:1px,color:#000
    style FM fill:#2a2d33,stroke:#00cc66,stroke-width:1px,color:#fff
```

### Decision Flow

1. **BotOpponent** polls `VultrAI.getDecision()` at intervals based on difficulty
2. A **game state snapshot** is built (HP, distance, recent actions, spell cooldowns, debuffs)
3. In **TRUE AI** mode, `FightMemory` injects a **Combat Intelligence Dossier** (player patterns, skill rating, win rate, known combos)
4. The request is sent to Vultr's OpenAI-compatible `/v1/chat/completions` endpoint
5. The LLM returns a JSON decision: `{"move":"strafe_left", "action":"attack", "timing":"immediate", "spell":"laser"}`
6. **BotOpponent** executes the decision at 60fps — movement, sword swings, blocking, and spell casting
7. All events are recorded back to `FightMemory` for the next fight

### Difficulty Modes

| Mode | LLM | Poll Rate | Behavior |
|------|-----|-----------|----------|
| Easy | No | 2.5s | Heuristic only, slow, predictable |
| Medium | Yes | 1.5s | Balanced LLM strategy |
| Hard | Yes | 0.8s | Aggressive, fast reads, low temperature |
| TRUE AI | Yes | 1.0s | Memory-powered, adapts to YOUR patterns across sessions |

---

## Full Tech Stack

```mermaid
flowchart LR
    subgraph INPUT["Input Layer"]
        CAM["Webcam\n(MediaPipe Pose)"]
        KB["Keyboard\n+ Mouse"]
        VOICE["Microphone\n(ElevenLabs STT)"]
    end

    subgraph ENGINE["Game Engine"]
        R3F["React Three Fiber\n+ Three.js"]
        RAPIER["Rapier Physics\n(WASM)"]
        ZUSTAND["Zustand\nState Management"]
        COMBAT["Combat System\n(melee + spells)"]
    end

    subgraph AI["AI Services"]
        VULTR["Vultr Serverless\nInference\n(AI Opponent)"]
        GEMINI["Google Gemini\n2.0 Flash\n(Commentary)"]
        ELEVEN["ElevenLabs\n(TTS Announcer +\nSTT Voice Spells)"]
        MEMORY["FightMemory\n(Adaptive Learning)"]
    end

    subgraph NETWORK["Multiplayer"]
        WS["WebSocket Server\n(Express + ws)"]
        RAIL["Railway\n(Hosting)"]
    end

    subgraph RENDER["Output"]
        WEBGL["WebGL\n3D Arena"]
        AUDIO["Howler.js\nSpatial Audio"]
        HUD["React UI\nHUD + Menus"]
        ELECTRON["Electron\nDesktop App"]
    end

    CAM -->|"33 landmarks\n(quaternion slerp)"| R3F
    KB --> R3F
    VOICE -->|"'mechabot fireball'"| COMBAT

    R3F --> RAPIER
    R3F --> ZUSTAND
    ZUSTAND --> COMBAT

    COMBAT -->|"game state"| VULTR
    VULTR -->|"combat decisions"| COMBAT
    COMBAT -->|"fight events"| GEMINI
    GEMINI -->|"commentary text"| ELEVEN
    ELEVEN -->|"audio stream"| AUDIO
    COMBAT --> MEMORY
    MEMORY -->|"dossier"| VULTR

    ZUSTAND -->|"sync"| WS
    WS --> RAIL

    R3F --> WEBGL
    R3F --> HUD
    WEBGL --> ELECTRON

    style VULTR fill:#ff8c00,stroke:#fff,stroke-width:2px,color:#000
    style GEMINI fill:#4285f4,stroke:#fff,stroke-width:1px,color:#fff
    style ELEVEN fill:#7c3aed,stroke:#fff,stroke-width:1px,color:#fff
    style R3F fill:#61dafb,stroke:#000,stroke-width:1px,color:#000
    style MEMORY fill:#00cc66,stroke:#fff,stroke-width:1px,color:#000
```

### Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **3D Engine** | React Three Fiber + Three.js | WebGL rendering, scene graph |
| **Physics** | Rapier (WASM) | Collision detection, rigid bodies |
| **Computer Vision** | MediaPipe Tasks Vision | 33-landmark body pose tracking |
| **AI Opponent** | Vultr Serverless Inference | LLM-powered combat decisions |
| **AI Commentary** | Google Gemini 2.0 Flash | Dynamic fight commentary generation |
| **Voice** | ElevenLabs | TTS announcer + STT voice-activated spells |
| **State** | Zustand | Client-side state management |
| **Multiplayer** | WebSocket (ws + Express) | Real-time game sync, room matchmaking |
| **Audio** | Howler.js | Spatial audio, sound effects |
| **Particles** | three.quarks | Particle effects (hits, spells, trails) |
| **Desktop** | Electron | Cross-platform desktop distribution |
| **Build** | Vite + TypeScript | Fast HMR, type safety |
| **Hosting** | Railway | WebSocket server deployment |

---

## Project Structure

```
SUPERMECHAFIGHTER ULTRAREALITY 3600 OF DOOM/
├── 3js ARENA/                    # Main game (React + R3F)
│   ├── src/
│   │   ├── ai/                   # Vultr AI + FightMemory
│   │   ├── arena/                # 3D arena environments
│   │   ├── audio/                # Sound manager, ElevenLabs, voice commands
│   │   ├── avatars/              # Mecha geometry builders
│   │   ├── combat/               # Melee, spells, damage, clash detection
│   │   ├── cv/                   # MediaPipe pose tracking pipeline
│   │   ├── entities/             # Player, bot, sword, arms, weapons
│   │   ├── game/                 # Game engine, state, config, customization
│   │   ├── networking/           # WebSocket multiplayer sync
│   │   ├── riggedMechs/          # Rigged mech model loader
│   │   └── ui/                   # HUD, menus, customization panel
│   └── server/                   # WebSocket relay server
└── README.md
```
