import { rgbToHue, hslToRgb } from './color.js';

/**
 * Rainbow effect: LED 0 starts at the given base hue, subsequent LEDs
 * spread across the spectrum. The whole rainbow shifts over time.
 *
 * Runs indefinitely until replaced or cleared.
 */
export class RainbowEffect {
  /** @param {{ color?: number[], duration?: number }} params */
  constructor(params = {}) {
    // Derive base hue from color if provided, otherwise start at red (0)
    if (params.color) {
      this.baseHue = rgbToHue(params.color[0], params.color[1], params.color[2]);
    } else {
      this.baseHue = 0;
    }
    this.speed = 1; // full rotations per second
    this.elapsed = 0;
    this.finished = false;
    this.duration = params.duration;
  }

  /**
   * @param {number} dt
   * @param {number} ledCount
   * @returns {Array<{r: number, g: number, b: number}>}
   */
  update(dt, ledCount) {
    this.elapsed += dt;

    const out = new Array(ledCount);
    for (let i = 0; i < ledCount; i++) {
      // Spread LEDs evenly across the hue wheel, shift over time
      const hue = (this.baseHue + i / ledCount + this.elapsed * this.speed) % 1;
      out[i] = hslToRgb(hue, 1, 0.5);
    }

    if (this.elapsed >= this.duration) {
      this.finished = true;
    }
    return out;
  }
}
