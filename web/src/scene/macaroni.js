import * as pc from 'playcanvas';
import {
  TRI_CIRCUM, ARC_CX_REST, ARC_CY_REST, ARC_RADIUS, ARC_HALF_W,
  ARC_REST_START, ARC_SPAN, ARC_Z0, ARC_Z1, ARC_LED_COUNT,
} from './macaroni-mesh.js';

const FLASH_DURATION = 0.4; // seconds

/**
 * Represents a single macaroni unit in the scene.
 * Owns its PlayCanvas entities (cell, triangle, arc, LEDs) and handles
 * LED effects internally.
 */
export class Macaroni {
  /**
   * @param {object} opts
   * @param {number} opts.id         - 1-based macaroni address
   * @param {pc.Entity} opts.cell    - root entity for this cell
   * @param {pc.Entity} opts.arc     - arc child entity (rotates)
   * @param {pc.Entity[]} opts.leds  - LED light entities (children of arc)
   */
  constructor({ id, cell, arc, leds }) {
    this.id = id;
    this.cell = cell;
    this.arc = arc;
    this.leds = leds;

    /** @type {{ type: string, color: pc.Color, elapsed: number, duration: number } | null} */
    this._effect = null;

    // Base state: LEDs off
    this._setAllLeds(0, 0, 0, 0);
  }

  /**
   * Apply an effect to this macaroni.
   * @param {{ type: string, color?: number[], duration?: number }} effect
   */
  applyEffect(effect) {
    if (effect.type === 'flash') {
      const [r, g, b] = effect.color || [255, 255, 255];
      this._effect = {
        type: 'flash',
        color: new pc.Color(r / 255, g / 255, b / 255),
        elapsed: 0,
        duration: effect.duration || FLASH_DURATION,
      };
      // Snap LEDs to full color immediately
      this._setAllLeds(r / 255, g / 255, b / 255, 1);
    }
  }

  /**
   * Called every frame from the app update loop.
   * @param {number} dt - delta time in seconds
   */
  update(dt) {
    if (!this._effect) return;

    const fx = this._effect;
    fx.elapsed += dt;

    if (fx.type === 'flash') {
      const t = Math.min(fx.elapsed / fx.duration, 1);
      const brightness = 1 - t; // linear fade out
      this._setAllLeds(
        fx.color.r * brightness,
        fx.color.g * brightness,
        fx.color.b * brightness,
        brightness,
      );
      if (t >= 1) {
        this._effect = null;
      }
    }
  }

  /**
   * Set all LED lights to the same color and intensity.
   */
  _setAllLeds(r, g, b, intensity) {
    for (const led of this.leds) {
      led.light.color.set(r, g, b);
      led.light.intensity = intensity;
    }
  }
}

/**
 * Create a Macaroni instance with all its PlayCanvas entities.
 *
 * @param {object} opts
 * @param {number} opts.id
 * @param {pc.Application} opts.app
 * @param {number} opts.x - world x position
 * @param {number} opts.y - world y position
 * @param {boolean} opts.flipped
 * @param {pc.Mesh} opts.triMesh
 * @param {pc.Mesh} opts.arcMesh
 * @param {pc.Material} opts.triMat
 * @param {pc.Material} opts.arcMat
 * @returns {Macaroni}
 */
export function createMacaroni({ id, app, x, y, flipped, triMesh, arcMesh, triMat, arcMat }) {
  const yOffset = flipped ? TRI_CIRCUM / 2 : 0;
  const yS = flipped ? -1 : 1;

  const cell = new pc.Entity(`cell-${id}`);
  cell.setPosition(x, y + yOffset, 0);
  app.root.addChild(cell);

  const triEntity = new pc.Entity('tri');
  triEntity.addComponent('render', {
    meshInstances: [new pc.MeshInstance(triMesh, triMat)],
  });
  cell.addChild(triEntity);

  const arcEntity = new pc.Entity('arc');
  arcEntity.addComponent('render', {
    meshInstances: [new pc.MeshInstance(arcMesh, arcMat)],
  });
  cell.addChild(arcEntity);

  // LED lights on inner (concave) face
  const innerR = ARC_RADIUS - ARC_HALF_W;
  const ledZ = (ARC_Z0 + ARC_Z1) / 2;
  const leds = [];

  for (let li = 0; li < ARC_LED_COUNT; li++) {
    const t = ARC_REST_START + (li + 0.5) / ARC_LED_COUNT * ARC_SPAN;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const led = new pc.Entity(`led-${id}-${li}`);
    led.addComponent('light', {
      type: 'omni',
      color: new pc.Color(0, 0, 0),
      intensity: 0,
      range: 0.2,
      castShadows: false,
    });
    arcEntity.addChild(led);
    led.setLocalPosition(
      ARC_CX_REST + innerR * cosT + 0.1,
      yS * (ARC_CY_REST + innerR * sinT),
      ledZ + 0.03,
    );
    led.lookAt(new pc.Vec3(
      x + ARC_CX_REST,
      y + yOffset + yS * ARC_CY_REST,
      ledZ,
    ));
    led.rotateLocal(90, 0, 0);
    leds.push(led);
  }

  return new Macaroni({ id, cell, arc: arcEntity, leds });
}
