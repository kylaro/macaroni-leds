/**
 * WebSocket client that receives JSON frames from the Python controller
 * and calls onFrame(frame) for each one.
 *
 * Reconnects automatically with exponential backoff so a browser refresh
 * before the server is up doesn't require a manual reconnect.
 */
export class WsClient {
  /**
   * @param {string} url  e.g. 'ws://localhost:8765'
   * @param {(frame: object) => void} onFrame
   */
  constructor(url, onFrame) {
    this._url = url;
    this._onFrame = onFrame;
    this._ws = null;
    this._retryDelay = 100;
    this._maxDelay = 1600;
    this._stopped = false;
  }

  connect() {
    if (this._stopped) return;
    console.log(`[ws] connecting to ${this._url}`);

    try {
      this._ws = new WebSocket(this._url);
    } catch (e) {
      console.warn('[ws] failed to create WebSocket:', e);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = () => {
      console.log('[ws] connected');
      this._retryDelay = 1000;  // reset backoff on success
    };

    this._ws.onmessage = (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch (e) {
        console.warn('[ws] bad JSON:', e);
        return;
      }
      this._onFrame(frame);
    };

    this._ws.onclose = () => {
      console.log(`[ws] closed, retrying in ${this._retryDelay}ms`);
      this._scheduleReconnect();
    };

    this._ws.onerror = (e) => {
      // onclose fires after onerror — no extra action needed
    };
  }

  stop() {
    this._stopped = true;
    this._ws?.close();
  }

  _scheduleReconnect() {
    if (this._stopped) return;
    setTimeout(() => this.connect(), this._retryDelay);
    this._retryDelay = Math.min(this._retryDelay * 2, this._maxDelay);
  }
}
