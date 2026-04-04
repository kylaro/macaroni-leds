"""Macaroni controller — entry point.

Starts the dispatcher (WebSocket + Modbus) and sends a test effect
every second to verify the connection is working.
"""

import asyncio
import logging

from communication import Dispatcher
from effects import Effect
from effects.registry import EffectID

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
log = logging.getLogger("main")


async def main():
    dispatcher = Dispatcher(ws_port=8765)
    await dispatcher.start()

    log.info("Controller running. Sending test effects — connect a browser to see them.")

    try:
        cycle = [EffectID.FLASH, EffectID.RAINBOW]
        i = 0
        while True:
            eid = cycle[i % len(cycle)]
            effect = Effect(
                effect_id=eid,
                address=0,
                color=(255, 100, 50),
                duration_ms=800,
            )
            await dispatcher.send_effect(effect)
            log.info("Sent %s to address %d (%d clients)",
                     eid.name, effect.address, dispatcher.ws.client_count)
            i += 1
            await asyncio.sleep(1.0)
    except asyncio.CancelledError:
        pass
    finally:
        await dispatcher.stop()


if __name__ == "__main__":
    asyncio.run(main())
