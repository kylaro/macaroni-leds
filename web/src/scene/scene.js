import * as pc from 'playcanvas';
import { CameraFrame } from 'playcanvas';
import { MacaroniCell } from './macaroni-cell.js';
import {
  createTriangleMesh, createArcMesh,
  TRI_CIRCUM,
} from './macaroni-mesh.js';
import { centerGrid } from './hex-layout.js';
import { createMacaroni } from './macaroni.js';

const GRID_COLS      = 5;
const GRID_ROWS      = 3;
const GRID_SPACING_X = 0.866;
const GRID_SPACING_Y = 1.5;
const GRID_EVEN_X    = 0;
const ROTATE_SPEED   = 0.4; // rad/s — matches 2D source of truth

const CAM_FOV = 90

function getInitialMode() {
  const param = new URLSearchParams(window.location.search).get('mode');
  if (param === '2d' || param === '3d') return param;
  return '3d';
}

/**
 * @param {pc.Application} app
 * @returns {{ updateFrame: (frame: object) => void }}
 */
export function createScene(app) {
  const device = app.graphicsDevice;
  let mode = getInitialMode();

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.05, 0.08),
    farClip: 10,
    fov: CAM_FOV,
  });
  app.root.addChild(camera);

  // ── Bloom (HDR post-processing) ───────────────────────────────────────────
  const cameraFrame = new CameraFrame(app, camera.camera);
  // TODO - I don't think this bloom does anything.
  // cameraFrame.bloom.intensity = 0.04;
  // cameraFrame.bloom.blurLevel = 100;
  cameraFrame.enabled = true;

  // ── Lighting ──────────────────────────────────────────────────────────────
  app.scene.ambientLight = new pc.Color(0.12, 0.12, 0.14);

  const keyLight = new pc.Entity('key-light');
  keyLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1.0, 0.95, 0.9),
    intensity: 0.5,
    castShadows: false,
  });
  keyLight.setEulerAngles(30, -30, 0);
  app.root.addChild(keyLight);

  const fillLight = new pc.Entity('fill-light');
  fillLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.5, 0.55, 0.7),
    intensity: 0.4,
    castShadows: false,
  });
  fillLight.setEulerAngles(-20, 40, 0);
  app.root.addChild(fillLight);

  // ── Grid layout (shared by both modes) ────────────────────────────────────
  const rawPositions = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      rawPositions.push([
        col * GRID_SPACING_X + GRID_EVEN_X * (row % 2),
        -row * GRID_SPACING_Y,
      ]);
    }
  }
  const positions = centerGrid(rawPositions);

  // ── 2D mode: MacaroniCell line-drawing ────────────────────────────────────
  const cells2d = positions.map(([x, y], i) => {
    return new MacaroniCell(x, y, i % 2 !== 0);
  });

  // ── 3D mode: mesh entities ────────────────────────────────────────────────
  const triMeshUp   = createTriangleMesh(device, 1);
  const triMeshDown = createTriangleMesh(device, -1);
  const arcMeshUp   = createArcMesh(device, 1);
  const arcMeshDown = createArcMesh(device, -1);

  const triMat = new pc.StandardMaterial();
  triMat.diffuse.set(0.5, 0.5, 0.55);
  triMat.specular.set(0.94, 0.94, 0.94);
  triMat.shininess = 1000;
  triMat.update();

  const arcMat = new pc.StandardMaterial();
  arcMat.diffuse.set(0.85, 0.85, 0.85);
  arcMat.specular.set(0.2, 0.2, 0.2);
  arcMat.shininess = 64;
  arcMat.emissive.set(0, 0, 0);  // Unused for now.
  arcMat.emissiveIntensity = 0;
  // TODO - The arcs could be multiple materials
  // It would actually be ideal for the arcs to be made of multiple segments.
  // Each segment will be one material with emissive Intensity and color, separate from the others.
  // This is to simulate the diffused LED strip that would be inside of the arc.
  // If there is a way to do this effect of multiple colors being emissive, that'd be great.
  // Let's consider this later.
  // For now, I think the effect is achieved by just using omni lights, because they reflect back on the arc.
  arcMat.update();

  /** @type {Macaroni[]} */
  const macaronis = [];

  positions.forEach(([x, y], i) => {
    const flipped = i % 2 !== 0;
    const id = i + 1; // 1-based IDs; address 0 = broadcast

    const mac = createMacaroni({
      id,
      app,
      x, y,
      flipped,
      triMesh: flipped ? triMeshDown : triMeshUp,
      arcMesh: flipped ? arcMeshDown : arcMeshUp,
      triMat,
      arcMat,
    });
    macaronis.push(mac);
  });

  // ── Camera orbit (click-drag, clamped ±45°) ────────────────────────────
  const MAX_ANGLE = 120;
  const DRAG_SENSITIVITY = 0.3; // degrees per pixel
  let orbitYaw = 0;    // horizontal angle (degrees)
  let orbitPitch = 0;  // vertical angle (degrees)
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function updateCameraOrbit() {
    const is3d = mode === '3d';
    const dist = is3d ? 8 : 4;
    const yawRad = orbitYaw * Math.PI / 180;
    const pitchRad = orbitPitch * Math.PI / 180;
    camera.setPosition(
      dist * Math.sin(yawRad) * Math.cos(pitchRad),
      dist * Math.sin(pitchRad),
      dist * Math.cos(yawRad) * Math.cos(pitchRad),
    );
    camera.lookAt(0, 0, 0);
  }

  const canvas = app.graphicsDevice.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    orbitYaw = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, orbitYaw - dx * DRAG_SENSITIVITY));
    orbitPitch = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, orbitPitch + dy * DRAG_SENSITIVITY));
    updateCameraOrbit();
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  // ── Mode switching ────────────────────────────────────────────────────────
  function applyMode() {
    const is3d = mode === '3d';
    for (const mac of macaronis) mac.cell.enabled = is3d;
    camera.camera.fov = is3d ? 53 : 90;
    updateCameraOrbit();
  }
  applyMode();

  window.addEventListener('keydown', (e) => {
    if (e.key === '2') {
      mode = mode === '2d' ? '3d' : '2d';
      applyMode();
    }
  });

  // ── Update loop ───────────────────────────────────────────────────────────
  const rotDegPerSec = ROTATE_SPEED * (180 / Math.PI);

  app.on('update', (dt) => {
    if (mode === '2d') {
      for (const cell of cells2d) {
        cell.update(dt);
        cell.draw(app);
      }
    } else {
      for (const mac of macaronis) {
        mac.arc.rotateLocal(0, 0, rotDegPerSec * dt);
        mac.update(dt);
      }
    }
  });

  return {
    /**
     * Handle an incoming frame from the WebSocket.
     * Expects: { effect_name, address, color?, duration_ms? }
     * address 0 = broadcast to all macaronis.
     */
    updateFrame(frame) {
      const effectType = frame.effect_name;
      if (!effectType) return;

      const effect = {
        type: effectType,
        color: frame.color,
        duration: frame.duration_ms != null ? frame.duration_ms / 1000 : undefined,
      };
      const addr = frame.address ?? 0;
      if (addr === 0) {
        for (const mac of macaronis) mac.applyEffect(effect);
      } else {
        const mac = macaronis.find(m => m.id === addr);
        if (mac) mac.applyEffect(effect);
      }
    },
  };
}
