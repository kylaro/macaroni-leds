import * as pc from 'playcanvas';
import { MacaroniCell } from './macaroni-cell.js';

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
    fov: 45,
  });
  camera.setPosition(0, 0, 4);
  app.root.addChild(camera);

  // ── Macaroni cells ───────────────────────────────────────────────────────
  const cells = [
    new MacaroniCell(0, 0),
  ];

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
