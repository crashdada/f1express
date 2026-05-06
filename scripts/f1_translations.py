"""
Shared F1 translation tables.

Identity data now lives in src/data/identity/*.json.
This module remains as a compatibility layer for existing Python scripts.
"""

from __future__ import annotations

from pipeline.lib.identity_loader import (
    build_driver_translation_tuples,
    build_team_translation_map,
)

DRIVER_TRANSLATIONS: list[tuple[str, str, str, str]] = build_driver_translation_tuples()
TEAM_TRANSLATIONS: dict[str, str] = build_team_translation_map()


def build_driver_fullname_dict() -> dict[str, str]:
    result: dict[str, str] = {}
    for first_en, last_en, first_cn, last_cn in DRIVER_TRANSLATIONS:
        result[f"{first_en} {last_en}"] = f"{first_cn}·{last_cn}"
    return result


def build_driver_split_dict() -> dict[str, tuple[str, str]]:
    result: dict[str, tuple[str, str]] = {}
    for first_en, last_en, first_cn, last_cn in DRIVER_TRANSLATIONS:
        result[f"{first_en} {last_en}"] = (first_cn, last_cn)
    return result
