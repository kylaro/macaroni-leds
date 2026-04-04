"""Effect ID mapping — shared between controller and firmware."""

from enum import IntEnum


class EffectID(IntEnum):
    FLASH = 1
    RAINBOW = 2
    SHIMMER = 3
    BREATHE = 4
    SOLID = 5
    CHASE = 6
    SPARKLE = 7
    WAVE = 8


# Reverse lookup: name string -> ID
EFFECT_REGISTRY: dict[str, int] = {e.name.lower(): e.value for e in EffectID}
