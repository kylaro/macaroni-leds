/**
 * Effect registry — maps effect type names to their constructor classes.
 *
 * To add a new effect:
 * 1. Create a file in this folder with a class that has:
 *    - constructor(params) — receives { color?, duration?}
 *    - update(dt, ledCount) — returns Array<{r, g, b}> with values in [0-1]
 *    - finished (boolean property) — true when the effect is done
 * 2. Import and register it below.
 * 3. The effects all must corresponde with the firmware, so the simulation is 1 to 1 with reality.
 */

import { FlashEffect } from './flash.js';
import { RainbowEffect } from './rainbow.js';

const registry = {
  flash: FlashEffect,
  rainbow: RainbowEffect,
};

/**
 * Create an effect instance by name.
 * @param {string} type - effect name (e.g. 'flash', 'rainbow')
 * @param {object} params - effect-specific parameters
 * @returns {object|null} effect instance, or null if type is unknown
 */
export function createEffect(type, params) {
  const Ctor = registry[type];
  if (!Ctor) return null;
  return new Ctor(params);
}
