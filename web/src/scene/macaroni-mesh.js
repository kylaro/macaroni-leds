import * as pc from 'playcanvas';

/**
 * Creates the macaroni mesh: a 60° elbow-macaroni arc (torus section).
 *
 * The arc center of curvature is at the entity's LOCAL ORIGIN, which is also
 * the rotation pivot. This means the center never moves as the entity rotates —
 * the arc sweeps around it like a hand of a clock.
 *
 * Hex Truchet geometry:
 *   - Pointy-top hex cells have 6 edge midpoints at 0°,60°,120°,180°,240°,300°
 *     all at distance spacing/2 (inradius) from the cell center.
 *   - A 60° arc centered at the cell center with radius ≈ inradius has its two
 *     endpoints aligned with one pair of adjacent edge midpoints.
 *   - As the entity rotates, the endpoints sweep through all 6 edge midpoints,
 *     creating continuous Truchet-style path connections.
 *
 * Coordinate system: X right, Y up, Z toward viewer.
 *
 * @param {pc.GraphicsDevice} device
 * @param {number} spacing  hex grid center-to-center distance
 * @returns {pc.Mesh}
 */
export function createMacaroniMesh(device, spacing = 0.22) {
  // Inradius = spacing/2. Keep ringRadius slightly under so the tube outer
  // surface (ringRadius + tubeRadius) lands right at the edge midpoint.
  const tubeRadius = spacing * 0.06;
  const ringRadius = spacing * 0.48;  // centerline at 96% of inradius
  const arcDeg = 60;                  // spans exactly one pair of adjacent hex edge midpoints
  const arcSegs = 14;
  const tubeSegs = 10;

  // Symmetric 60° arc: −30° to +30° around the +X axis.
  // At rotation multiples of 60° the endpoints sit on hex edge midpoints.
  const arcStart = -30 * (Math.PI / 180);
  const arcEnd   =  30 * (Math.PI / 180);

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
