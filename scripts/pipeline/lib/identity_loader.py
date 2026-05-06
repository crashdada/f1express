from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path


def _identity_root() -> Path:
    return Path(__file__).resolve().parents[3] / "src" / "data" / "identity"


def normalize_identity_text(value: str | None) -> str:
    text = str(value or "").strip()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return "".join(ch for ch in text.lower() if ch.isalnum())


@lru_cache(maxsize=1)
def load_driver_records() -> list[dict]:
    path = _identity_root() / "drivers.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_team_records() -> list[dict]:
    path = _identity_root() / "teams.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def build_driver_translation_tuples() -> list[tuple[str, str, str, str]]:
    tuples: list[tuple[str, str, str, str]] = []
    for record in load_driver_records():
        tuples.append(
            (
                record["name"]["en"]["first"],
                record["name"]["en"]["last"],
                record["name"]["zh"]["first"],
                record["name"]["zh"]["last"],
            )
        )
    return tuples


@lru_cache(maxsize=1)
def build_team_translation_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for record in load_team_records():
        translation = record["name"]["zh"] or record["display"]["short"] or record["name"]["en"]
        aliases = {record["name"]["en"], record["name"]["zh"], *record.get("aliases", []), *record.get("sourceKeys", [])}
        for alias in aliases:
            if alias:
                mapping[str(alias)] = translation
    return mapping


@lru_cache(maxsize=1)
def build_team_alias_map() -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for record in load_team_records():
        canonical_name = record["name"]["en"]
        aliases = {canonical_name, record["name"]["zh"], *record.get("aliases", []), *record.get("sourceKeys", [])}
        for alias in aliases:
            normalized = normalize_identity_text(alias)
            if normalized and normalized not in alias_map:
                alias_map[normalized] = canonical_name
    return alias_map


@lru_cache(maxsize=1)
def build_team_family_aliases() -> dict[str, list[str]]:
    family_aliases: dict[str, list[str]] = {}
    for record in load_team_records():
        family_id = record["familyId"]
        aliases = family_aliases.setdefault(family_id, [])
        for value in [record["name"]["en"], record["name"]["zh"], *record.get("aliases", []), *record.get("sourceKeys", [])]:
            if value and value not in aliases:
                aliases.append(value)
    return family_aliases


def resolve_team_name_from_registry(raw_name: str | None) -> str | None:
    normalized = normalize_identity_text(raw_name)
    if not normalized:
        return None
    return build_team_alias_map().get(normalized)
