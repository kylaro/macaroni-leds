import * as pc from 'playcanvas';

// ── Geometry constants from the 2D source of truth (macaroni-cell.js) ────────
// DO NOT change these — they mirror macaroni-cell.js exactly.
const TRI_CIRCUM     = 1.0;
const ARC_RADIUS     = TRI_CIRCUM * Math.sqrt(3) / 2;
const ARC_SPAN       = Math.PI / 3;                   // 60°
const ARC_REST_START = 2 * Math.PI / 3;                // 120°
const ARC_CX_REST    = TRI_CIRCUM * Math.cos(-Math.PI / 6);
const ARC_CY_REST    = TRI_CIRCUM * Math.sin(-Math.PI / 6);
const ARC_THICKNESS  = 0.06;

// 3D tuning
const ARC_TUBE_RADIUS = ARC_THICKNESS;
const ARC_SEGMENTS    = 24;
const TUBE_SEGMENTS   = 8;

export { TRI_CIRCUM };

/**
 * Flat equilateral-triangle mesh (double-sided).
 * Vertices at 90°, 210°, 330° scaled by TRI_CIRCUM, Y multiplied by ySign.
 *
 * @param {pc.GraphicsDevice} device
 * @param {number} ySign  1 = point-up, -1 = point-down
 * @returns {pc.Mesh}
 */
export function createTriangleMesh(device, ySign) {
  const angles = [90, 210, 330];
  const verts = angles.map(deg => {
    const a = deg * Math.PI / 180;
    return [TRI_CIRCUM * Math.cos(a), ySign * TRI_CIRCUM * Math.sin(a)];
  });

  // 6 verts: 0-2 front face, 3-5 back face
  const positions = [];
  const normals   = [];

  for (const [x, y] of verts) { positions.push(x, y, 0); normals.push(0, 0, 1); }
  for (const [x, y] of verts) { positions.push(x, y, 0); normals.push(0, 0, -1); }

  // Winding: CCW from the normal direction.
  // For ySign=1 (up): (0,1,2) is CCW viewed from +Z.
  // For ySign=-1 (down): the Y flip reverses handedness → use (0,2,1).
  const indices = ySign >= 0
    ? [0, 1, 2, 5, 4, 3]
    : [0, 2, 1, 3, 4, 5];

  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  return mesh;
}

/**
 * 60° torus section (the macaroni arc) with flat end caps.
 * Built for ySign=1, then Y-flipped + winding-reversed if ySign=-1.
 *
 * @param {pc.GraphicsDevice} device
 * @param {number} ySign  1 = normal, -1 = flipped
 * @returns {pc.Mesh}
 */
export function createArcMesh(device, ySign) {
  const positions = [];
  const normals   = [];
  const indices   = [];

  const cx = ARC_CX_REST;
  const cy = ARC_CY_REST;
  const R  = ARC_RADIUS;
  const r  = ARC_TUBE_RADIUS;

  // ── Torus body ──────────────────────────────────────────────────────────
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const theta = ARC_REST_START + (i / ARC_SEGMENTS) * ARC_SPAN;
    const cosT  = Math.cos(theta);
    const sinT  = Math.sin(theta);

    for (let j = 0; j <= TUBE_SEGMENTS; j++) {
      const phi  = (j / TUBE_SEGMENTS) * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      positions.push(
        cx + (R + r * cosP) * cosT,
        cy + (R + r * cosP) * sinT,
        r * sinP,
      );
      normals.push(cosP * cosT, cosP * sinT, sinP);
    }
  }

  const cols = TUBE_SEGMENTS + 1;
  for (let i = 0; i < ARC_SEGMENTS; i++) {
    for (let j = 0; j < TUBE_SEGMENTS; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // ── End caps (flat discs) ───────────────────────────────────────────────
  for (const capI of [0, ARC_SEGMENTS]) {
    const theta = ARC_REST_START + (capI / ARC_SEGMENTS) * ARC_SPAN;
    const cosT  = Math.cos(theta);
    const sinT  = Math.sin(theta);

    // Normal = arc tangent direction, sign depends on which end
    const s  = capI === 0 ? 1 : -1;   // start cap faces backward along arc
    const nx = s * sinT;               // tangent is (-sinT, cosT, 0)
    const ny = s * -cosT;
    const nz = 0;

    const centerIdx = positions.length / 3;
    positions.push(cx + R * cosT, cy + R * sinT, 0);
    normals.push(nx, ny, nz);

    for (let j = 0; j <= TUBE_SEGMENTS; j++) {
      const phi  = (j / TUBE_SEGMENTS) * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      positions.push(
        cx + (R + r * cosP) * cosT,
        cy + (R + r * cosP) * sinT,
        r * sinP,
      );
      normals.push(nx, ny, nz);
    }

    const ringStart = centerIdx + 1;
    for (let j = 0; j < TUBE_SEGMENTS; j++) {
      if (capI === 0) {
        indices.push(centerIdx, ringStart + j + 1, ringStart + j);
      } else {
        indices.push(centerIdx, ringStart + j, ringStart + j + 1);
      }
    }
  }

  // ── Apply ySign flip ────────────────────────────────────────────────────
  if (ySign < 0) {
    // Negate all Y positions and normals
    for (let k = 1; k < positions.length; k += 3) {
      positions[k] = -positions[k];
      normals[k]   = -normals[k];
    }
    // Reverse winding of every triangle
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1];
      indices[k + 1] = indices[k + 2];
      indices[k + 2] = tmp;
    }
  }

  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  return mesh;
}
