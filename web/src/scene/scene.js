import * as pc from 'playcanvas';
import { createMacaroniMesh } from './macaroni-mesh.js';
import { hexToWorld, centerGrid } from './hex-layout.js';
import { DEMO_FRAME } from '../net/demo-frame.js';

// Default layout — overridden by layout in incoming frames
const DEFAULT_LAYOUT = { type: 'hex', columns: 6, rows: 4, spacing: 0.22 };
const LEDS_PER_SIDE = 6;

/**
 * @typedef {Object} SceneState
 * @property {(frame: object) => void} updateFrame - Call with each WebSocket frame
 */

/**
 * Creates the full 3D scene and returns a frame-update callback.
 * @param {pc.Application} app
 * @returns {SceneState}
 */
export function createScene(app) {
  // ── Camera ──────────────────────────────────────────────────────────────────
  const cameraEntity = new pc.Entity('camera');
  cameraEntity.addComponent('camera', {
    clearColor: new pc.Color(0.02, 0.02, 0.04),
    farClip: 50,
    fov: 45,
  });
  cameraEntity.setPosition(0, 0, 4.5);
  app.root.addChild(cameraEntity);

  // ── Ambient light (very dim — LEDs provide most light) ────────────────────
  app.scene.ambientLight = new pc.Color(0.04, 0.04, 0.06);

  // ── Single fill light from slightly above ────────────────────────────────
  const fillLight = new pc.Entity('fill-light');
  fillLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.3, 0.3, 0.4),
    intensity: 0.6,
    castShadows: false,
  });
  fillLight.setEulerAngles(30, 0, 0);
  app.root.addChild(fillLight);

  // ── Shared materials ───────────────────────────────────────────────────────
  // Macaroni body: dark matte plastic
  const bodyMat = new pc.StandardMaterial();
  bodyMat.diffuse = new pc.Color(0.08, 0.07, 0.09);
  bodyMat.shininess = 60;
  bodyMat.metalness = 0.1;
  bodyMat.useMetalness = true;
  bodyMat.update();

  // ── Build initial grid from default layout ────────────────────────────────
  let macaroniEntities = [];
  let layout = DEFAULT_LAYOUT;

  function buildGrid(newLayout) {
    // Tear down old entities
    for (const e of macaroniEntities) e.destroy();
    macaroniEntities = [];
    layout = newLayout;

    const mesh = createMacaroniMesh(app.graphicsDevice);

    // Pre-compute world positions and center the grid around origin
    const rawPositions = [];
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.columns; col++) {
        rawPositions.push(hexToWorld(col, row, layout.spacing));
      }
    }
    const centeredPositions = centerGrid(rawPositions);

    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.columns; col++) {
        const id = row * layout.columns + col;
        const [wx, wy] = centeredPositions[id];

        const entity = new pc.Entity(`macaroni-${id}`);
        entity.addComponent('render', {
          meshInstances: [new pc.MeshInstance(mesh, bodyMat)],
          castShadows: false,
          receiveShadows: false,
        });
        entity.setPosition(wx, wy, 0);

        // LED point lights — one per LED strip side (averaged color)
        const ledLights = createLedLights(entity, app);

        entity._macaroniId = id;
        entity._ledLights = ledLights;

        app.root.addChild(entity);
        macaroniEntities.push(entity);
      }
    }
  }

  buildGrid(DEFAULT_LAYOUT);

  // Kick off demo animation while waiting for WebSocket
  let demoRunning = true;
  let demoT = 0;
  app.on('update', (dt) => {
    if (!demoRunning) return;
    demoT += dt;
    const frame = DEMO_FRAME(demoT, layout);
    applyFrame(frame);
  });

  // ── Frame application ──────────────────────────────────────────────────────
  function applyFrame(frame) {
    // Rebuild grid if layout changed
    if (frame.layout) {
      const l = frame.layout;
      if (
        l.columns !== layout.columns ||
        l.rows !== layout.rows ||
        l.spacing !== layout.spacing
      ) {
        buildGrid(l);
      }
    }

    if (!frame.macaronis) return;

    for (const m of frame.macaronis) {
      const entity = macaroniEntities[m.id];
      if (!entity) continue;

      // Rotate the macaroni entity around its pivot
      entity.setEulerAngles(0, 0, (m.angle * 180) / Math.PI);

      // Update LED glow lights
      updateLedLights(entity._ledLights, m);
    }
  }

  return {
    updateFrame(frame) {
      demoRunning = false;
      applyFrame(frame);
    },
  };
}

// ── LED lights ─────────────────────────────────────────────────────────────
// Each macaroni has 3 small omni lights (one per strip side) tinted by the
// average color of that strip. This gives a convincing LED glow cheaply.

function createLedLights(parentEntity, app) {
  const offsets = [
    // concave inner arc — offset slightly inward
    new pc.Vec3(0, 0.05, 0.05),
    // convex outer arc — offset outward
    new pc.Vec3(0, -0.05, 0.05),
    // top
    new pc.Vec3(0, 0, 0.08),
  ];
  const names = ['concave', 'convex', 'top'];
  const lights = [];

  for (let i = 0; i < 3; i++) {
    const e = new pc.Entity(`led-${names[i]}`);
    e.addComponent('light', {
      type: 'omni',
      color: new pc.Color(1, 1, 1),
      intensity: 0,
      range: 0.45,
      castShadows: false,
      // Physically based falloff looks nicer
      falloffMode: pc.LIGHTFALLOFF_LINEAR,
    });
    e.setLocalPosition(offsets[i]);
    parentEntity.addChild(e);
    lights.push(e.light);
  }
  return lights;
}

/**
 * @param {pc.LightComponent[]} lights  [concave, convex, top]
 * @param {object} m  macaroni frame data
 */
function updateLedLights(lights, m) {
  const strips = [m.leds_concave, m.leds_convex, m.leds_top];
  for (let i = 0; i < 3; i++) {
    const strip = strips[i];
    if (!strip || strip.length === 0) continue;

    // Average the strip color
    let r = 0, g = 0, b = 0;
    for (const [lr, lg, lb] of strip) {
      r += lr; g += lg; b += lb;
    }
    const n = strip.length;
    r /= n * 255; g /= n * 255; b /= n * 255;

    const brightness = (r + g + b) / 3;
    lights[i].color.set(r, g, b);
    // Scale intensity by brightness so dark = off
    lights[i].intensity = brightness * 2.5;
  }
}
