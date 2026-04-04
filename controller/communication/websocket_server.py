"""WebSocket server that pushes effect frames to the browser visualization."""

from __future__ import annotations

import asyncio
import json
import logging

import websockets
from websockets.asyncio.server import ServerConnection

from effects.effect import Effect
from effects.registry import EffectID

log = logging.getLogger(__name__)


class WebSocketServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self._clients: set[ServerConnection] = set()
        self._server = None

    async def start(self):
        self._server = await websockets.serve(self._handler, self.host, self.port)
        log.info("WebSocket server listening on ws://%s:%d", self.host, self.port)

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            log.info("WebSocket server stopped")

    async def _handler(self, ws: ServerConnection):
        self._clients.add(ws)
        remote = ws.remote_address
        log.info("Client connected: %s", remote)
        try:
            async for msg in ws:
                # Browser is view-only for now; log anything it sends
                log.debug("Received from %s: %s", remote, msg)
        finally:
            self._clients.discard(ws)
            log.info("Client disconnected: %s", remote)

    async def send_effect(self, effect: Effect):
        """Serialize an effect to JSON and send to every connected browser client."""
        if not self._clients:
            return
        payload = json.dumps({
            "effect_id": effect.effect_id,
            "effect_name": EffectID(effect.effect_id).name.lower(),
            "address": effect.address,
            "timestamp_ms": effect.timestamp_ms,
            "color": list(effect.color),
            "duration_ms": effect.duration_ms,
        })
        # Fire-and-forget to each client; drop slow ones
        await asyncio.gather(
            *(self._send(ws, payload) for ws in list(self._clients)),
            return_exceptions=True,
        )

    async def _send(self, ws: ServerConnection, payload: str):
        try:
            await ws.send(payload)
        except websockets.ConnectionClosed:
            self._clients.discard(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)
