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
const ARC_HALF_W = ARC_THICKNESS;       // half-width (in-plane)
const ARC_HALF_H = ARC_THICKNESS * 0.5; // half-height (out-of-plane)
const ARC_SEGMENTS = 24;
// Rectangular cross-section: 4 corners, duplicated per face for flat normals
const RECT_CORNERS = [
  // [offset along radial, offset along Z, normal radial, normal Z]
  // bottom face (2 verts)
  [-ARC_HALF_W, -ARC_HALF_H, 0, -1],
  [ ARC_HALF_W, -ARC_HALF_H, 0, -1],
  // right face
  [ ARC_HALF_W, -ARC_HALF_H, 1,  0],
  [ ARC_HALF_W,  ARC_HALF_H, 1,  0],
  // top face
  [ ARC_HALF_W,  ARC_HALF_H, 0,  1],
  [-ARC_HALF_W,  ARC_HALF_H, 0,  1],
  // left face
  [-ARC_HALF_W,  ARC_HALF_H, -1, 0],
  [-ARC_HALF_W, -ARC_HALF_H, -1, 0],
];
const RECT_VERTS_PER_RING = RECT_CORNERS.length;

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

  // ── Swept rectangle body ─────────────────────────────────────────────
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const theta = ARC_REST_START + (i / ARC_SEGMENTS) * ARC_SPAN;
    const cosT  = Math.cos(theta);
    const sinT  = Math.sin(theta);

    for (let j = 0; j < RECT_VERTS_PER_RING; j++) {
      const [dr, dz, nr, nz] = RECT_CORNERS[j];
      positions.push(
        cx + (R + dr) * cosT,
        cy + (R + dr) * sinT,
        dz,
      );
      normals.push(nr * cosT, nr * sinT, nz);
    }
  }

  const cols = RECT_VERTS_PER_RING;
  for (let i = 0; i < ARC_SEGMENTS; i++) {
    // Each pair of adjacent corners forms a quad face
    for (let j = 0; j < RECT_VERTS_PER_RING; j += 2) {
      const a = i * cols + j;
      const b = i * cols + j + 1;
      const c = (i + 1) * cols + j;
      const d = (i + 1) * cols + j + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // ── End caps (flat quads) ────────────────────────────────────────────
  // 4 unique corners of the rectangle cross-section
  const RECT_UNIQUE = [
    [-ARC_HALF_W, -ARC_HALF_H],
    [ ARC_HALF_W, -ARC_HALF_H],
    [ ARC_HALF_W,  ARC_HALF_H],
    [-ARC_HALF_W,  ARC_HALF_H],
  ];
  for (const capI of [0, ARC_SEGMENTS]) {
    const theta = ARC_REST_START + (capI / ARC_SEGMENTS) * ARC_SPAN;
    const cosT  = Math.cos(theta);
    const sinT  = Math.sin(theta);

    const s  = capI === 0 ? 1 : -1;
    const nx = s * sinT;
    const ny = s * -cosT;

    const base = positions.length / 3;
    for (const [dr, dz] of RECT_UNIQUE) {
      positions.push(cx + (R + dr) * cosT, cy + (R + dr) * sinT, dz);
      normals.push(nx, ny, 0);
    }

    if (capI === 0) {
      indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    } else {
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
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
