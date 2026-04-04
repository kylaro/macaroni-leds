"""Base Effect class.

An Effect encodes a command to a single macaroni node:
  - effect_id:  32-bit effect type (see registry.py)
  - address:    8-bit macaroni address (0–255)
  - timestamp:  32-bit playback time in milliseconds
  - color:      (R, G, B) each 8-bit
  - duration:   32-bit duration in milliseconds
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from effects.registry import EffectID


@dataclass
class Effect:
    effect_id: int
    address: int  # 0–255
    color: tuple[int, int, int] = (255, 255, 255)
    duration_ms: int = 1000
    timestamp_ms: int = field(default_factory=lambda: int(time.time() * 1000) & 0xFFFFFFFF)


# --- Concrete effects (thin subclasses for convenience) ---


class Flash(Effect):
    def __init__(self, address: int, **kwargs):
        super().__init__(effect_id=EffectID.FLASH, address=address, **kwargs)


class Rainbow(Effect):
    def __init__(self, address: int, **kwargs):
        super().__init__(effect_id=EffectID.RAINBOW, address=address, **kwargs)


class Shimmer(Effect):
    def __init__(self, address: int, **kwargs):
        super().__init__(effect_id=EffectID.SHIMMER, address=address, **kwargs)
