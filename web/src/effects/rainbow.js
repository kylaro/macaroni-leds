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

/**
 * Convert RGB [0-255] to hue [0-1].
 */
function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  if (h < 0) h += 1;
  return h;
}

/**
 * HSL to RGB, returns {r, g, b} in [0-1].
 */
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  const sector = (h * 6) | 0;
  switch (sector % 6) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    default: r = c; g = 0; b = x; break;
  }
  return { r: r + m, g: g + m, b: b + m };
}
