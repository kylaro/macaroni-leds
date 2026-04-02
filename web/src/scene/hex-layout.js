/**
 * Converts hex grid (col, row) to world (x, y) using offset coordinates.
 * Uses "odd-r" offset: odd rows are shifted right by half a column.
 *
 * @param {number} col
 * @param {number} row
 * @param {number} spacing  center-to-center distance
 * @returns {[number, number]}  [worldX, worldY]
 */
export function hexToWorld(col, row, spacing) {
  const xStep = spacing;
  const yStep = spacing * Math.sqrt(3) / 2;   // ~0.866 × spacing

  const x = col * xStep + (row % 2 === 1 ? xStep * 0.5 : 0);
  const y = -row * yStep;   // negative so row 0 is at top

  return [x, y];
}

/**
 * Centers the grid origin so the array is centered around (0, 0).
 * Call this once after computing all positions to offset them.
 *
 * @param {[number,number][]} positions
 * @returns {[number,number][]}
 */
export function centerGrid(positions) {
  if (positions.length === 0) return positions;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of positions) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return positions.map(([x, y]) => [x - cx, y - cy]);
}
