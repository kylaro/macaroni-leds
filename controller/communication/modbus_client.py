"""Placeholder RS485 Modbus-over-USB client.

This will eventually use pymodbus to send effect commands to the
physical macaroni node network over a USB-to-RS485 adapter.
"""

from __future__ import annotations

import logging
import struct

from effects.effect import Effect

log = logging.getLogger(__name__)


class ModbusClient:
    def __init__(self, port: str = "/dev/ttyUSB0", baudrate: int = 115200):
        self.port = port
        self.baudrate = baudrate
        self._connected = False

    async def connect(self):
        # TODO: Initialize pymodbus async serial client
        log.info("ModbusClient: placeholder connect (port=%s, baud=%d)", self.port, self.baudrate)
        self._connected = True

    async def disconnect(self):
        log.info("ModbusClient: placeholder disconnect")
        self._connected = False

    async def send_effect(self, effect: Effect):
        """Pack an effect into binary and send to a macaroni node.

        Layout (14 bytes, little-endian):
          effect_id   : uint32
          address     : uint8
          timestamp_ms: uint32
          r, g, b     : uint8, uint8, uint8
          duration_ms : uint32
        """
        if not self._connected:
            log.warning("ModbusClient: not connected, dropping frame for address %d", effect.address)
            return
        r, g, b = effect.color
        # TODO: Not sure the effect.address is being used correctly here, the address is for the modbus node that would receive.
        data = struct.pack(
            "<IBIBBBI",
            effect.effect_id,
            effect.address,
            effect.timestamp_ms,
            r, g, b,
            effect.duration_ms,
        )
        # TODO: Write holding registers via pymodbus
        log.debug("ModbusClient: would send %d bytes to address %d", len(data), effect.address)

    @property
    def connected(self) -> bool:
        return self._connected
