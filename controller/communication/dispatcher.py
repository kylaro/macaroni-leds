"""Dispatcher — single interface for sending effects to both outputs.

Initializes the WebSocket server and the Modbus client, then provides
a unified `send_effect()` that fans out to both transports.
"""

from __future__ import annotations

import logging

from effects.effect import Effect
from communication.modbus_client import ModbusClient
from communication.websocket_server import WebSocketServer

log = logging.getLogger(__name__)


class Dispatcher:
    def __init__(
        self,
        ws_host: str = "0.0.0.0",
        ws_port: int = 8765,
        modbus_port: str = "/dev/ttyUSB0",
    ):
        self.ws = WebSocketServer(host=ws_host, port=ws_port)
        self.modbus = ModbusClient(port=modbus_port)

    async def start(self):
        await self.ws.start()
        await self.modbus.connect()
        log.info("Dispatcher ready (ws clients: %d, modbus: %s)",
                 self.ws.client_count, self.modbus.connected)

    async def stop(self):
        await self.ws.stop()
        await self.modbus.disconnect()

    async def send_effect(self, effect: Effect):
        """Dispatch an effect to the browser and the hardware network."""
        await self.ws.send_effect(effect)
        await self.modbus.send_effect(effect)
