import * as pc from 'playcanvas';
import {
  TRI_CIRCUM, ARC_CX_REST, ARC_CY_REST, ARC_RADIUS, ARC_HALF_W,
  ARC_REST_START, ARC_SPAN, ARC_Z0, ARC_Z1, ARC_LED_COUNT,
} from './macaroni-mesh.js';
import { createEffect } from '../effects/registry.js';

/**
 * Represents a single macaroni unit in the scene.
 * Owns its PlayCanvas entities (cell, triangle, arc, LEDs) and handles
 * LED effects via the pluggable effect system.
 *
 * Multiple effects can run simultaneously. Each frame, all active effects
 * contribute per-LED colors which are averaged together.
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

    /** @type {object[]} Active effect instances */
    this._effects = [];

    // LEDs off until an effect is applied
    this._setAllLeds(0, 0, 0, 0);
  }

  /**
   * Apply an effect to this macaroni. The effect is added to the active
   * effects list and blends with any already-running effects.
   * @param {{ type: string, color?: number[], duration?: number, speed?: number }} effect
   */
  applyEffect(effect) {
    const fx = createEffect(effect.type, effect);
    if (!fx) return;
    this._effects.push(fx);
  }

  /**
   * Called every frame from the app update loop.
   * Updates all active effects, blends their outputs, and applies to LEDs.
   * @param {number} dt - delta time in seconds
   */
  update(dt) {
    if (this._effects.length === 0) return;

    const ledCount = this.leds.length;
    const contributions = [];

    // Remove finished effects
    this._effects = this._effects.filter(fx => !fx.finished);

    for (const fx of this._effects) {
      contributions.push(fx.update(dt, ledCount));
    }

    // Blend: average all contributions per LED
    const n = contributions.length;
    if (n === 0) {
      this._setAllLeds(0, 0, 0, 0);
      return;
    }

    for (let i = 0; i < ledCount; i++) {
      let r = 0, g = 0, b = 0;
      for (let c = 0; c < n; c++) {
        r += contributions[c][i].r;
        g += contributions[c][i].g;
        b += contributions[c][i].b;
      }
      r /= n;
      g /= n;
      b /= n;
      const intensity = Math.max(r, g, b);
      if (intensity > 0) {
        this.leds[i].light.color = new pc.Color(r / intensity, g / intensity, b / intensity);
        this.leds[i].light.intensity = intensity;
        this.leds[i].light.range = 0.6*(intensity**0.5);
      } else {
        this.leds[i].light.color = new pc.Color(0, 0, 0);
        this.leds[i].light.intensity = 0;
      }
    }
  }

  /**
   * Set all LED lights to the same color.
   */
  _setAllLeds(r, g, b, intensity) {
    for (const led of this.leds) {
      led.light.color = new pc.Color(r, g, b);
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
      range: 0.3,
      castShadows: false,
    });
    arcEntity.addChild(led);
    led.setLocalPosition(
      ARC_CX_REST + innerR * cosT,
      yS * (ARC_CY_REST + innerR * sinT),
      ledZ,
    );
    leds.push(led);
  }

  return new Macaroni({ id, cell, arc: arcEntity, leds });
}
