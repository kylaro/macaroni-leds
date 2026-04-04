/**
 * FPS counter overlay — toggled with the F key.
 * Call update(dt) every frame from the app update loop.
 */
export class FpsCounter {
  constructor() {
    this._el = document.getElementById('fps-counter');
    this._visible = true;
    this._frames = 0;
    this._accum = 0;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        this._visible = !this._visible;
        this._el.style.display = this._visible ? 'block' : 'none';
      }
    });
  }

  update(dt) {
    if (!this._visible) return;
    this._frames++;
    this._accum += dt;
    if (this._accum >= 0.1) {
      this._el.textContent = `${(this._frames / this._accum) | 0} fps`;
      this._frames = 0;
      this._accum = 0;
    }
  }
}
