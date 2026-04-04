const DEFAULT_DURATION = 0.4;

/**
 * Flash effect: all LEDs snap to a color, then linearly fade out.
 */
export class FlashEffect {
  /** @param {{ color?: number[], duration?: number }} params */
  constructor(params = {}) {
    const [r, g, b] = params.color || [255, 255, 255];
    this.r = r / 255;
    this.g = g / 255;
    this.b = b / 255;
    this.duration = params.duration || DEFAULT_DURATION;
    this.elapsed = 0;
    this.finished = false;
  }

  /**
   * @param {number} dt - delta time in seconds
   * @param {number} ledCount
   * @returns {Array<{r: number, g: number, b: number}>}
   */
  update(dt, ledCount) {
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.duration, 1);
    const brightness = 1 - t;

    if (this.elapsed >= this.duration) {
      this.finished = true;
    }

    const r = this.r * brightness;
    const g = this.g * brightness;
    const b = this.b * brightness;

    const out = new Array(ledCount);
    for (let i = 0; i < ledCount; i++) {
      out[i] = { r, g, b };
    }
    return out;
  }
}
