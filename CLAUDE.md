# Macaroni Art Installation

## Project Overview
The Macaroni Art Installation is a wall-mounted kinetic LED art piece featuring 12–126 "macaroni" shaped elements that rotate and form geometric patterns, complemented by LED light rays on three sides (concave, convex, top). Each macaroni rotates offset from its center of rotation. The product is sold as premium home wall art through Kylar Technologies LLC.

**Timeline:** Prototype before June 15, 2026
**Budget:** $2,500 prototyping

## Repository Structure
```
macaroni/
├── CLAUDE.md              # This file — project context for Claude Code
├── controller/            # Python source of truth — pattern engine + WebSocket server
│   ├── engine/            # Macaroni state machine, pattern generators
│   ├── transport/         # WebSocket server (pushes frames to web UI)
│   ├── modbus/            # pymodbus output to physical hardware (future)
│   ├── patterns/          # Pattern definitions (authored in Python)
│   └── main.py            # Entry point
├── web/                   # PlayCanvas browser visualization
│   ├── src/               # PlayCanvas app source (ES modules)
│   │   ├── scene/         # 3D scene setup, macaroni entities, lighting
│   │   ├── net/           # WebSocket client, frame parser
│   │   ├── ui/            # HUD / overlay UI elements
│   │   └── main.js        # App entry point
│   ├── assets/            # Textures, models, shaders
│   ├── public/            # Static files served to browser
│   ├── package.json
│   └── vite.config.js     # Vite dev server + build
├── firmware/              # RP2040 node firmware (C++)
│   ├── src/               # Modbus, LED drivers
│   ├── lib/               # Modbus, LED drivers
├── hardware/              # PCB designs, schematics
│   ├── kicad/
│   └── bom/
│   └── gerbers/
├── docs/                  # Documentation, architecture diagrams
│   └── architecture.md
└── misc/                  # CAD files, 3D print STLs, notes, images
    ├── cad/
    └── stl/
```

## Architecture

### System Dataflow
```
Python Controller (source of truth)
    │
    ├──► WebSocket ──► Browser (PlayCanvas 3D visualization)
    │
    └──► pymodbus/RS485 ──► RP2040 nodes (physical hardware, future)
```
The Python Controller will command both the Browser and the RP2040s, so the web view displays the expected state of the RP2040 node's LEDs and motor positions.

### Frame Protocol (WebSocket JSON)
The controller pushes frames to the browser at ~30fps:
```json
{
  "timestamp": 1711900000.123,
  "macaronis": [
    {
      "id": 0,
      "angle": 1.57,
      "angular_velocity": 0.5,
      "leds_concave": [[255,0,0], [255,50,0], [255,100,0], [200,150,0], [150,200,0], [100,255,0]],
      "leds_convex":  [[0,0,255], [0,50,255], [0,100,255], [0,150,200], [0,200,150], [0,255,100]],
      "leds_top":     [[255,255,255], [200,200,200], [150,150,150], [100,100,100], [50,50,50], [0,0,0]]
    }
  ],
  "layout": {
    "type": "hex",
    "columns": 6,
    "rows": 4,
    "spacing": 0.1
  }
}
```

Each LED strip has **6 LEDs** per side, 3 sides per macaroni (concave, convex, top). This number should be configurable.

### Future Frame Extension
Eventually frames will use a higher-level effect system:
```json
{
  "timestamp": 1711900000.123,
  "macaronis": [
    {
      "id": 0,
      "angle": 1.57,
      "angular_velocity": 0.5,
      "led_effect": { "type": "rainbow_left", "speed": 1.0 }
    }
  ]
}
```
Effects like `rainbow_left`, `rainbow_right`, `solid_color`, `breathe`, etc. This is a later concern — for now use explicit per-LED RGB arrays.

## Tech Stack

### Web (PlayCanvas Visualization)
- **PlayCanvas Engine** — open source, self-hosted via npm (`playcanvas` package)
- **Vite** — dev server + production build
- **No PlayCanvas Editor** — pure code-driven scene, no cloud dependency
- **Target:** Must render smoothly on iPhone (Safari/WebKit). Performance is critical.
- **Aesthetic:** Stunning, high-fidelity. The visualization IS the product demo. Think: glowing LEDs casting volumetric light onto a dark wall, beautiful reflections on the macaroni surfaces, subtle ambient particles or bloom. Aesthetics are king.
- **Camera:** Fixed front-facing view (as if standing in front of the wall art). No orbit controls needed. UI overlays for triggering patterns or adjusting config.

### Controller (Python)
- **Python 3.11+**
- **asyncio** WebSocket server (e.g., `websockets` library)
- Pattern engine runs a loop: update macaroni states → serialize frame → push to all connected WebSocket clients
- Patterns are authored in Python. The browser is view-only for now.
- **pymodbus** for RS485 output to physical hardware (future, not yet implemented)

### Firmware (RP2040)
- AS5600 magnetic encoder for absolute position
- MAX3485 for RS485/Modbus communication
- SK9822 LEDs via SPI or WS2812B via PIO
- Self-enumeration via daisy-chained UART

### Hardware
- KiCad for PCB design
- Custom node PCB: RP2040 + MAX3485 + motor driver + 12V→5V regulator + encoder header
- 4 twisted pairs: RS485, 12V DC, UART Rx/Tx, TBD

## Layout System
Macaronis are arranged in a **hex grid**. The layout is configurable:
- Grid dimensions derived from total macaroni count
- Hex grid with configurable spacing
- Each macaroni has a grid position `(col, row)` mapped to a 3D world position
- The hex offset (odd-r or even-r) should be consistent

## Development Workflow
- **Dev machine** is the primary environment (Fedora Linux)
- Claude Code runs locally, edits code on this machine
- `web/` uses Vite dev server for hot reload during PlayCanvas development
- `controller/` runs Python locally, pushes frames over WebSocket to browser
- No Raspberry Pi in the loop yet — that comes later
- For pattern iteration: edit Python → see results live in browser

## Current Focus
**Phase 1: Web visualization + Python controller**
1. Scaffold the PlayCanvas project with Vite
2. Build the 3D scene: hex grid of macaroni entities with LED glow on each side
3. Python WebSocket server pushing mock/demo frames
4. Browser connects, renders state in real-time
5. Make it look absolutely stunning

## Coding Conventions
- **JavaScript:** ES modules, no TypeScript for now (speed of iteration). Use JSDoc comments for important interfaces.
- **Python:** Type hints, asyncio, `ruff` for linting.
- **Firmware:** C++. Builds with Bazel. Uses existing FireFly LED Framework which is written by the user.
- **General:** Prefer simple, readable code. This is a solo project — clarity over abstraction. Minimal dependencies. Comments explaining *why*, not *what*.

## CRITICAL
- **Challenge the requirements:** You must decide what is truly necessary to accomplish the goal. Use a first-principles approach to delete unnecessary dependencies and code.
- **Ownership:** You are fully responsible for the code that you contribute. You must verify that your work is correct and satisfies the requirements.

## Key Constraints
- Must render on iPhone (Safari). Test with mobile viewport. Keep draw calls low.
- Pi Zero 2W will eventually serve this — keep the built web bundle small.
- WebSocket frames are the only communication channel between Python and browser.
- The macaroni shape is a curved arc (like elbow macaroni), the shape is offset from its rotation axis to form a Truchet Tiling. The 3D model should reflect this geometry.

## What NOT to Do
- Don't use the PlayCanvas Editor or cloud services
- Don't add TypeScript — keep iteration fast
- Don't over-abstract early — this is prototyping
- Don't use heavy frameworks in the web UI (no React, no Vue — just PlayCanvas + vanilla JS)
- Don't implement Modbus/hardware output yet — focus on the simulation in the frontend
