/**
 * Generates a demo frame for when the WebSocket isn't connected yet.
 * Animates a rainbow wave across the hex grid to show the visualization
 * is alive and the LED glow system works.
 *
 * @param {number} t  elapsed time in seconds
 * @param {{ columns: number, rows: number }} layout
 * @returns {object}  frame object matching the WebSocket protocol
 */
export function DEMO_FRAME(t, layout) {
  const macaronis = [];
  const count = layout.columns * layout.rows;

  for (let i = 0; i < count; i++) {
    const col = i % layout.columns;
    const row = Math.floor(i / layout.columns);

    // Phase offset in multiples of 60° (π/3) so arc endpoints can align with
    // hex edge midpoints of adjacent cells, forming Truchet connections.
    // Alternating pattern based on hex parity gives a mix of connected paths.
    const hexParity = (col + row) % 2;
    const phase = hexParity * (Math.PI / 3);
    const angle = t * 0.4 + phase;

    // Rainbow hue shifts across the grid + time
    const hue = ((t * 0.15 + phase * 0.3) % 1 + 1) % 1;

    const concaveColor = hslToRgb(hue, 0.9, 0.55);
    const convexColor = hslToRgb((hue + 0.33) % 1, 0.9, 0.45);
    const topColor = hslToRgb((hue + 0.66) % 1, 0.7, 0.5);

    // Fade LEDs along the strip for a gradient effect
    const concaveLeds = buildStrip(concaveColor, 6, true);
    const convexLeds = buildStrip(convexColor, 6, false);
    const topLeds = buildStrip(topColor, 6, true);

    macaronis.push({
      id: i,
      angle,
      angular_velocity: 0.4,
      leds_concave: concaveLeds,
      leds_convex: convexLeds,
      leds_top: topLeds,
    });
  }

  return { macaronis, layout };
}

/** Build a 6-LED strip with a brightness gradient. */
function buildStrip(baseRgb, count, fadeToTip) {
  const leds = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const brightness = fadeToTip ? 0.3 + 0.7 * t : 0.3 + 0.7 * (1 - t);
    leds.push([
      Math.round(baseRgb[0] * brightness),
      Math.round(baseRgb[1] * brightness),
      Math.round(baseRgb[2] * brightness),
    ]);
  }
  return leds;
}

/** HSL → RGB. h/s/l in [0,1]. Returns [r,g,b] in [0,255]. */
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  const h6 = h * 6;
  if (h6 < 1)      { r = c; g = x; b = 0; }
  else if (h6 < 2) { r = x; g = c; b = 0; }
  else if (h6 < 3) { r = 0; g = c; b = x; }
  else if (h6 < 4) { r = 0; g = x; b = c; }
  else if (h6 < 5) { r = x; g = 0; b = c; }
  else             { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
