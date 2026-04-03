import * as pc from 'playcanvas';
import { MacaroniCell } from './macaroni-cell.js';
import { centerGrid } from './hex-layout.js';

const GRID_COLS      = 5;
const GRID_ROWS      = 3;
const GRID_SPACING_X = 0.866;  // center-to-center distance, horizontal, sqrt(3)/2
const GRID_SPACING_Y = 1.5;  // center-to-center distance, vertical
const GRID_EVEN_X    = 0;

/**
 * @param {pc.Application} app
 * @returns {{ updateFrame: (frame: object) => void }}
 */
export function createScene(app) {
  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.05, 0.08),
    farClip: 50,
    fov: 90,
  });
  camera.setPosition(0, 0, 4);
  app.root.addChild(camera);

  // ── Macaroni cells ───────────────────────────────────────────────────────
  const rawPositions = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      rawPositions.push([col * GRID_SPACING_X + GRID_EVEN_X * (row % 2), -row * GRID_SPACING_Y]);
    }
  }
  const positions = centerGrid(rawPositions);
  const cells = positions.map(([x, y], i) => {
    return new MacaroniCell(x, y, i % 2 /* flipped or not */);
  });

  app.on('update', (dt) => {
    for (const cell of cells) {
      cell.update(dt);
      cell.draw(app);
    }
  });

  return {
    updateFrame(_frame) {},
  };
}
