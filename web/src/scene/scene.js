import * as pc from 'playcanvas';

// Equilateral triangle circumradius (center → vertex)
const TRI_CIRCUM   = 1.0;
// Inradius = circumradius / 2  (center → edge midpoint)
const TRI_INRADIUS = TRI_CIRCUM / 2;

// Macaroni arc geometry:
//   Center of curvature = the SHARED VERTEX between the two connected edges (V3).
//   Radius = half the side length = TRI_CIRCUM * sqrt(3) / 2.
//   Span = 60°  →  bows INWARD (convex face toward interior, concave toward corner).
//
// At rest the arc center sits at V3 (angle 330°, at circumradius).
// The arc runs from 120° to 180° in V3's local frame, landing exactly on
// M_right and M_bottom — the two edge midpoints adjacent to V3.
//
// Rotation by theta around the centroid (origin) moves all arc points rigidly.
const ARC_RADIUS     = TRI_CIRCUM * Math.sqrt(3) / 2;  // S/2
const ARC_SPAN       = Math.PI / 3;   // 60°
const ARC_REST_START = 2 * Math.PI / 3;  // 120° relative to arc center (V3)
const ARC_REST_END   = Math.PI;          // 180° relative to arc center (V3)
// Arc center at rest = V3, the shared corner vertex (at circumradius, angle 330°)
const ARC_CX_REST = TRI_CIRCUM * Math.cos(-Math.PI / 6);  // 330°
const ARC_CY_REST = TRI_CIRCUM * Math.sin(-Math.PI / 6);

const ARC_THICKNESS = 0.06;
const ARC_SEGS      = 32;

const PIVOT_RADIUS = 0.04;
const PIVOT_SEGS   = 12;

const ROTATE_SPEED = 0.4; // rad/s

/**
 * @typedef {Object} SceneState
 * @property {(frame: object) => void} updateFrame
 */

/**
 * @param {pc.Application} app
 * @returns {SceneState}
 */
export function createScene(app) {
  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.05, 0.08),
    farClip: 50,
    fov: 45,
  });
  camera.setPosition(0, 0, 4);
  app.root.addChild(camera);

  // ── Triangle vertices (pointy-top: 90°, 210°, 330°) ──────────────────────
  const triVerts = [90, 210, 330].map(deg => {
    const a = deg * (Math.PI / 180);
    return new pc.Vec3(TRI_CIRCUM * Math.cos(a), TRI_CIRCUM * Math.sin(a), 0);
  });

  let theta = 0;

  const triColor   = new pc.Color(0.85, 0.65, 0.1);
  const pivotColor = new pc.Color(1.0,  0.15, 0.15);
  const arcColor   = new pc.Color(0.25, 0.75, 0.3);

  app.on('update', (dt) => {
    theta += ROTATE_SPEED * dt;

    // Triangle edges
    for (let i = 0; i < 3; i++) {
      app.drawLine(triVerts[i], triVerts[(i + 1) % 3], triColor);
    }

    // Macaroni arc: 60° convex arc rotating around centroid
    drawMacaroniArc(app, theta, arcColor);

    // Pivot at centroid
    drawCircle(app, 0, 0, PIVOT_RADIUS, pivotColor, PIVOT_SEGS);
  });

  return {
    updateFrame(_frame) {},
  };
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

/**
 * Draws the macaroni arc rotated by `theta` around the centroid (origin).
 *
 * At rest (theta=0) the arc is centered at the opposite edge midpoint (M_left)
 * and bows outward toward V3, connecting M_bottom and M_right.
 * Rotation by theta rigidly moves all arc points around the centroid.
 */
function drawMacaroniArc(app, theta, color) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const inner = [];
  const outer = [];

  for (let i = 0; i <= ARC_SEGS; i++) {
    // Angle within the arc-center's local frame (rest position)
    const a = ARC_REST_START + (i / ARC_SEGS) * ARC_SPAN;

    // Sample inner and outer band in rest position
    const pix = ARC_CX_REST + (ARC_RADIUS - ARC_THICKNESS) * Math.cos(a);
    const piy = ARC_CY_REST + (ARC_RADIUS - ARC_THICKNESS) * Math.sin(a);
    const pox = ARC_CX_REST + (ARC_RADIUS + ARC_THICKNESS) * Math.cos(a);
    const poy = ARC_CY_REST + (ARC_RADIUS + ARC_THICKNESS) * Math.sin(a);

    // Rotate around centroid (origin) by theta
    inner.push(new pc.Vec3(pix * cosT - piy * sinT, pix * sinT + piy * cosT, 0));
    outer.push(new pc.Vec3(pox * cosT - poy * sinT, pox * sinT + poy * cosT, 0));
  }

  for (let i = 0; i < ARC_SEGS; i++) {
    app.drawLine(inner[i], inner[i + 1], color);
    app.drawLine(outer[i], outer[i + 1], color);
  }
  // End caps
  app.drawLine(inner[0],       outer[0],       color);
  app.drawLine(inner[ARC_SEGS], outer[ARC_SEGS], color);
}

function drawCircle(app, cx, cy, r, color, segs) {
  for (let i = 0; i < segs; i++) {
    const a0 = (Math.PI * 2 * i) / segs;
    const a1 = (Math.PI * 2 * (i + 1)) / segs;
    app.drawLine(
      new pc.Vec3(cx + r * Math.cos(a0), cy + r * Math.sin(a0), 0),
      new pc.Vec3(cx + r * Math.cos(a1), cy + r * Math.sin(a1), 0),
      color
    );
  }
}
