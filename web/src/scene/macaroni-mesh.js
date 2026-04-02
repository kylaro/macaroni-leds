import * as pc from 'playcanvas';

/**
 * Creates the macaroni mesh: a curved arc (elbow macaroni cross-section tube)
 * offset from its rotation origin so it tiles as a Truchet tile.
 *
 * The arc sweeps ~120° of a torus. The center of the torus ring is offset
 * from the entity origin by `ringOffset`, so when the entity rotates the
 * macaroni orbits around the corner of its grid cell.
 *
 * Coordinate system: X right, Y up, Z toward viewer.
 *
 * @param {pc.GraphicsDevice} device
 * @returns {pc.Mesh}
 */
export function createMacaroniMesh(device) {
  // Torus parameters
  const ringRadius = 0.07;    // radius of the arc path (how curved the macaroni is)
  const tubeRadius = 0.018;   // thickness of the tube
  const arcDeg = 115;         // degrees swept
  const arcSegs = 18;         // segments along the arc
  const tubeSegs = 10;        // segments around the tube cross-section

  // The ring center is offset so the arc endpoints sit at grid cell corners
  // For a hex grid cell of ~spacing=0.22, offset ~= ringRadius puts the arc
  // corner near the edge midpoint where Truchet tiles connect.
  const offsetX = ringRadius;
  const offsetY = -ringRadius;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const arcStart = -10 * (Math.PI / 180);   // start angle (radians)
  const arcEnd = arcStart + arcDeg * (Math.PI / 180);

  for (let i = 0; i <= arcSegs; i++) {
    const u = i / arcSegs;
    const theta = arcStart + u * (arcEnd - arcStart);
    const cx = offsetX + ringRadius * Math.cos(theta);
    const cy = offsetY + ringRadius * Math.sin(theta);

    // Tangent along the arc path (for tube normal)
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);

    for (let j = 0; j <= tubeSegs; j++) {
      const v = j / tubeSegs;
      const phi = v * Math.PI * 2;

      // In-plane normal (points outward from the arc center)
      const nx = Math.cos(phi) * Math.cos(theta);
      const ny = Math.cos(phi) * Math.sin(theta);
      const nz = Math.sin(phi);

      // Tube surface point
      const px = cx + tubeRadius * Math.cos(phi) * Math.cos(theta);
      const py = cy + tubeRadius * Math.cos(phi) * Math.sin(theta);
      const pz = tubeRadius * Math.sin(phi);

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
