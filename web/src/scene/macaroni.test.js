import { describe, it, expect, beforeEach } from 'vitest';
import { Macaroni } from './macaroni.js';

/** Create a fake LED entity that mimics the pc.Entity light interface. */
function fakeLed() {
  return {
    light: {
      // _setAllLeds assigns a new pc.Color, so color is replaced by reference.
      // The fake just needs to be a plain object with r/g/b fields.
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

  it('flash sets LEDs to full color immediately', () => {
    mac.applyEffect({ type: 'flash', color: [255, 0, 0] });

    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(1);
      expect(led.light.color.r).toBe(1);
      expect(led.light.color.g).toBe(0);
      expect(led.light.color.b).toBe(0);
    }
  });

  it('flash defaults to white when no color given', () => {
    mac.applyEffect({ type: 'flash' });

    for (const led of mac.leds) {
      expect(led.light.color.r).toBe(1);
      expect(led.light.color.g).toBe(1);
      expect(led.light.color.b).toBe(1);
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

    // Run past the end
    mac.update(0.5);

    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
      expect(led.light.color.r).toBe(0);
      expect(led.light.color.g).toBe(0);
      expect(led.light.color.b).toBe(0);
    }
    expect(mac._effect).toBeNull();
  });

  it('update with no active effect is a no-op', () => {
    mac.update(1.0); // should not throw
    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
    }
  });

  it('new flash replaces an in-progress flash', () => {
    mac.applyEffect({ type: 'flash', color: [255, 0, 0], duration: 1.0 });
    mac.update(0.2); // partially through red flash

    // Apply a new blue flash
    mac.applyEffect({ type: 'flash', color: [0, 0, 255], duration: 1.0 });

    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(1);
      expect(led.light.color.r).toBe(0);
      expect(led.light.color.b).toBe(1);
    }
  });

  it('unknown effect type is ignored', () => {
    mac.applyEffect({ type: 'unknown_effect' });
    expect(mac._effect).toBeNull();
    for (const led of mac.leds) {
      expect(led.light.intensity).toBe(0);
    }
  });
});
