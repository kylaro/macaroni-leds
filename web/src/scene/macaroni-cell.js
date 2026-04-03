import * as pc from 'playcanvas';

// Equilateral triangle circumradius (center → vertex)
const TRI_CIRCUM = 1.0;

// Macaroni arc geometry — see scene.js header comments for derivation.
const ARC_RADIUS     = TRI_CIRCUM * Math.sqrt(3) / 2;
const ARC_SPAN       = Math.PI / 3;                      // 60°
const ARC_REST_START = 2 * Math.PI / 3;                  // 120° in arc-center's local frame
const ARC_REST_END   = Math.PI;                          // 180°
const ARC_CX_REST    = TRI_CIRCUM * Math.cos(-Math.PI / 6);  // V3 at 330°
const ARC_CY_REST    = TRI_CIRCUM * Math.sin(-Math.PI / 6);

const ARC_THICKNESS = 0.06;
const ARC_SEGS      = 32;

const PIVOT_RADIUS = 0.04;
const PIVOT_SEGS   = 12;

const ROTATE_SPEED = 0.4; // rad/s

const TRI_COLOR   = new pc.Color(0.85, 0.65, 0.1);
const ARC_COLOR   = new pc.Color(0.25, 0.75, 0.3);
const PIVOT_COLOR = new pc.Color(1.0,  0.15, 0.15);

/**
 * A single "macaroni cell": equilateral triangle outline + rotating 60° arc + pivot dot.
 * Self-contained — holds its own rotation state, handles its own drawing.
 *
 * @param {number}  x        world-space center X
 * @param {number}  y        world-space center Y
 * @param {boolean} flipped  if true, cell is mirrored vertically (point-down triangle)
 */
export class MacaroniCell {
  constructor(x = 0, y = 0, flipped = false) {
    this.x = x;
    // Flipped (point-down) triangle: circumcenter is only inradius (R/2) below the
    // row top, vs. circumradius (R) for point-up. Shift up by R/2 so both share
    // the same top/bottom bounds within a row.
    this.y = y + (flipped ? TRI_CIRCUM / 2 : 0);
    this.theta = 0;
    this._ySign = flipped ? -1 : 1;

    // Triangle vertices in local space (relative to cell center)
    this._triVerts = [90, 210, 330].map(deg => {
      const a = deg * (Math.PI / 180);
      return { x: TRI_CIRCUM * Math.cos(a), y: this._ySign * TRI_CIRCUM * Math.sin(a) };
    });
  }

  update(dt) {
    this.theta += ROTATE_SPEED * dt;
  }

  /** @param {pc.Application} app */
  draw(app) {
    this._drawTriangle(app);
    this._drawArc(app);
    this._drawPivot(app);
  }

  _drawTriangle(app) {
    const v = this._triVerts;
    for (let i = 0; i < 3; i++) {
      const a = v[i];
      const b = v[(i + 1) % 3];
      app.drawLine(
        new pc.Vec3(this.x + a.x, this.y + a.y, 0),
        new pc.Vec3(this.x + b.x, this.y + b.y, 0),
        TRI_COLOR,
      );
    }
  }

  _drawArc(app) {
    const cosT = Math.cos(this.theta);
    const sinT = Math.sin(this.theta);

    const inner = [];
    const outer = [];

    for (let i = 0; i <= ARC_SEGS; i++) {
      const a = ARC_REST_START + (i / ARC_SEGS) * ARC_SPAN;

      // Sample inner/outer band at rest position; _ySign mirrors vertically for flipped cells
      const pix = ARC_CX_REST + (ARC_RADIUS - ARC_THICKNESS) * Math.cos(a);
      const piy = this._ySign * (ARC_CY_REST + (ARC_RADIUS - ARC_THICKNESS) * Math.sin(a));
      const pox = ARC_CX_REST + (ARC_RADIUS + ARC_THICKNESS) * Math.cos(a);
      const poy = this._ySign * (ARC_CY_REST + (ARC_RADIUS + ARC_THICKNESS) * Math.sin(a));

      // Rotate around cell centroid by theta, then translate to world position
      inner.push(new pc.Vec3(
        this.x + pix * cosT - piy * sinT,
        this.y + pix * sinT + piy * cosT,
        0,
      ));
      outer.push(new pc.Vec3(
        this.x + pox * cosT - poy * sinT,
        this.y + pox * sinT + poy * cosT,
        0,
      ));
    }

    for (let i = 0; i < ARC_SEGS; i++) {
      app.drawLine(inner[i], inner[i + 1], ARC_COLOR);
      app.drawLine(outer[i], outer[i + 1], ARC_COLOR);
    }
    app.drawLine(inner[0],        outer[0],        ARC_COLOR);
    app.drawLine(inner[ARC_SEGS], outer[ARC_SEGS], ARC_COLOR);
  }

  _drawPivot(app) {
    for (let i = 0; i < PIVOT_SEGS; i++) {
      const a0 = (Math.PI * 2 * i)       / PIVOT_SEGS;
      const a1 = (Math.PI * 2 * (i + 1)) / PIVOT_SEGS;
      app.drawLine(
        new pc.Vec3(this.x + PIVOT_RADIUS * Math.cos(a0), this.y + PIVOT_RADIUS * Math.sin(a0), 0),
        new pc.Vec3(this.x + PIVOT_RADIUS * Math.cos(a1), this.y + PIVOT_RADIUS * Math.sin(a1), 0),
        PIVOT_COLOR,
      );
    }
  }
}
