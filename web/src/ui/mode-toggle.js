/**
 * 2D/3D mode toggle — press '2' to switch.
 * Calls the provided onModeChange callback with the new mode string.
 */
export class ModeToggle {
  /**
   * @param {string} initialMode - '2d' or '3d'
   * @param {(mode: string) => void} onModeChange
   */
  constructor(initialMode, onModeChange) {
    this._mode = initialMode;
    this._onModeChange = onModeChange;

    window.addEventListener('keydown', (e) => {
      if (e.key === '2') {
        this._mode = this._mode === '2d' ? '3d' : '2d';
        this._onModeChange(this._mode);
      }
    });
  }

  get mode() {
    return this._mode;
  }
}
