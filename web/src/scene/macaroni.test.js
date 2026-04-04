import { describe, it, expect, beforeEach } from 'vitest';
import { Macaroni } from './macaroni.js';

/** Create a fake LED entity that mimics the pc.Entity light interface. */
function fakeLed() {
  return {
    light: {
      color: { r: 0, g: 0, b: 0 },
      intensity: 0,
    },
  };
}

function createTestMacaroni(id = 1, ledCount = 6) {
  const leds = Array.from({ length: ledCount }, () => fakeLed());
  return new Macaroni({ id, cell: {}, arc: {}, leds });
}

describe('Macaroni', () => {
  let mac;

  beforeEach(() => {
    mac = createTestMacaroni(1);
  });

  it('starts with all LEDs off', () => {
    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
      expect(led.light.color.r).toBe(0);
      expect(led.light.color.g).toBe(0);
      expect(led.light.color.b).toBe(0);
    }
  });

  it('flash sets LEDs to full color on first update', () => {
    mac.applyEffect({ type: 'flash', color: [255, 0, 0] });
    mac.update(0); // dt=0: first frame, brightness = 1

    for (const led of mac.leds) {
      expect(led.light.intensity).toBeCloseTo(1, 5);
      expect(led.light.color.r).toBeCloseTo(1, 5);
      expect(led.light.color.g).toBeCloseTo(0, 5);
      expect(led.light.color.b).toBeCloseTo(0, 5);
    }
  });

  it('flash defaults to white when no color given', () => {
    mac.applyEffect({ type: 'flash' });
    mac.update(0);

    for (const led of mac.leds) {
      expect(led.light.color.r).toBeCloseTo(1, 5);
      expect(led.light.color.g).toBeCloseTo(1, 5);
      expect(led.light.color.b).toBeCloseTo(1, 5);
    }
  });

  it('flash fades out over time', () => {
    mac.applyEffect({ type: 'flash', color: [255, 0, 0], duration: 1.0 });

    // Halfway through
    mac.update(0.5);
    for (const led of mac.leds) {
      expect(led.light.intensity).toBeCloseTo(0.5, 5);
      expect(led.light.color.r).toBeCloseTo(1, 5);
    }
  });

  it('flash completes and LEDs go off', () => {
    mac.applyEffect({ type: 'flash', color: [0, 255, 0], duration: 0.4 });

    // Run past the end — effect marks itself finished
    mac.update(0.5);

    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
    }

    // Finished effects are pruned at the start of the next update
    mac.update(0);
    expect(mac._effects.length).toBe(0);
  });

  it('update with no active effect is a no-op', () => {
    mac.update(1.0); // should not throw
    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
    }
  });

  it('unknown effect type is ignored', () => {
    mac.applyEffect({ type: 'unknown_effect' });
    expect(mac._effects.length).toBe(0);
    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
    }
  });

  it('multiple effects blend together', () => {
    // Red flash + green flash = yellow-ish average
    mac.applyEffect({ type: 'flash', color: [255, 0, 0], duration: 1.0 });
    mac.applyEffect({ type: 'flash', color: [0, 255, 0], duration: 1.0 });
    mac.update(0); // dt=0: full brightness for both

    for (const led of mac.leds) {
      // Average of (1,0,0) and (0,1,0) = (0.5, 0.5, 0)
      // intensity = max(0.5, 0.5, 0) = 0.5
      // color = (1, 1, 0) normalized by intensity
      expect(led.light.intensity).toBeCloseTo(0.5, 5);
      expect(led.light.color.r).toBeCloseTo(1, 5);
      expect(led.light.color.g).toBeCloseTo(1, 5);
      expect(led.light.color.b).toBeCloseTo(0, 5);
    }
  });

  it('rainbow effect produces different colors per LED', () => {
    mac.applyEffect({ type: 'rainbow' });
    mac.update(0);

    // LEDs should not all be the same color
    const colors = mac.leds.map(l => ({
      r: l.light.color.r,
      g: l.light.color.g,
      b: l.light.color.b,
    }));
    const allSame = colors.every(c =>
      Math.abs(c.r - colors[0].r) < 0.01 &&
      Math.abs(c.g - colors[0].g) < 0.01 &&
      Math.abs(c.b - colors[0].b) < 0.01
    );
    expect(allSame).toBe(false);
  });

  it('rainbow effect changes over time', () => {
    mac.applyEffect({ type: 'rainbow' });
    mac.update(0);
    const colorBefore = {
      r: mac.leds[0].light.color.r,
      g: mac.leds[0].light.color.g,
      b: mac.leds[0].light.color.b,
    };

    mac.update(0.5);
    const colorAfter = {
      r: mac.leds[0].light.color.r,
      g: mac.leds[0].light.color.g,
      b: mac.leds[0].light.color.b,
    };

    const changed = Math.abs(colorBefore.r - colorAfter.r) > 0.01 ||
                    Math.abs(colorBefore.g - colorAfter.g) > 0.01 ||
                    Math.abs(colorBefore.b - colorAfter.b) > 0.01;
    expect(changed).toBe(true);
  });
});
