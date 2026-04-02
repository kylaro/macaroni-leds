import * as pc from 'playcanvas';

/**
 * Creates the macaroni mesh: a 90° elbow-macaroni arc (torus section).
 *
 * The arc center of curvature is at the entity's LOCAL ORIGIN, which is also
 * the rotation pivot. This means the center never moves as the entity rotates —
 * the arc sweeps around it like a hand of a clock.
 *
 * For hex Truchet tiling: entities are placed at hex cell centers. The arc
 * radius is ~90% of the cell inradius so endpoints nearly reach adjacent edge
 * midpoints, giving visual connectivity at Truchet-aligned rotations.
 *
 * Coordinate system: X right, Y up, Z toward viewer.
 *
 * @param {pc.GraphicsDevice} device
 * @param {number} spacing  hex grid center-to-center distance
 * @returns {pc.Mesh}
 */
export function createMacaroniMesh(device, spacing = 0.22) {
  // Hex cell inradius = spacing/2 (distance from cell center to edge midpoint).
  // Arc radius slightly less so the endpoints stay inside their cell.
  const ringRadius = spacing * 0.45;  // ~90% of inradius; arc centered at entity origin
  const tubeRadius = ringRadius * 0.22; // tube cross-section thickness
  const arcDeg = 90;                  // quarter-circle (elbow macaroni)
  const arcSegs = 18;                 // segments along the arc
  const tubeSegs = 10;                // segments around the tube cross-section

  // Symmetric 90° arc: −45° to +45° around the +X axis.
  // The entity's Z-rotation in applyFrame sweeps this arc around the cell center.
  const arcStart = -45 * (Math.PI / 180);
  const arcEnd   =  45 * (Math.PI / 180);

  const positions = [];
  const normals   = [];
  const uvs       = [];
  const indices   = [];

  for (let i = 0; i <= arcSegs; i++) {
    const u = i / arcSegs;
    const theta = arcStart + u * (arcEnd - arcStart);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    for (let j = 0; j <= tubeSegs; j++) {
      const v = j / tubeSegs;
      const phi = v * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Standard torus parametrisation — arc center at origin.
      // Tube cross-section is perpendicular to the arc tangent at every point.
      const px = (ringRadius + tubeRadius * cosP) * cosT;
      const py = (ringRadius + tubeRadius * cosP) * sinT;
      const pz = tubeRadius * sinP;

      const nx = cosP * cosT;
      const ny = cosP * sinT;
      const nz = sinP;

      positions.push(px, py, pz);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
    }
  }

  // Quads → triangles
  const cols = tubeSegs + 1;
  for (let i = 0; i < arcSegs; i++) {
    for (let j = 0; j < tubeSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setUvs(0, uvs);
  mesh.setIndices(indices);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  return mesh;
}
