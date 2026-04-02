import * as pc from 'playcanvas';
import { createScene } from './scene/scene.js';
import { WsClient } from './net/ws-client.js';

const canvas = document.getElementById('application-canvas');

const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas),
  graphicsDeviceOptions: {
    antialias: true,
    alpha: false,
    preferWebGl2: true,
  },
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener('resize', () => app.resizeCanvas());

app.start();

// Build the 3D scene (hex grid of macaroni, lights, camera)
const { updateFrame } = createScene(app);

// Connect to Python controller WebSocket
const ws = new WsClient('ws://localhost:8765', updateFrame);
ws.connect();
