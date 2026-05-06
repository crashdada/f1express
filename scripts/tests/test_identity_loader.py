from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from pipeline.lib.identity_loader import (
    build_driver_translation_tuples,
    build_team_alias_map,
    build_team_family_aliases,
    build_team_translation_map,
    resolve_team_name_from_registry,
)


def test_driver_translation_tuples_include_active_alias_targets():
    translations = build_driver_translation_tuples()
    assert ("Kimi", "Antonelli", "基米", "安东内利") in translations


def test_team_translation_map_covers_aliases():
    translations = build_team_translation_map()
    assert translations["Racing Bulls"] == "小红牛"
    assert translations["Kick Sauber"] == "奥迪"


def test_team_alias_resolution_returns_canonical_english_name():
    alias_map = build_team_alias_map()
    assert alias_map["racingbulls"] == "Racing Bulls"
    assert resolve_team_name_from_registry("Kick Sauber") == "Audi F1 Team"


def test_team_family_aliases_group_current_and_historical_names():
    family_aliases = build_team_family_aliases()
    assert "Racing Point" in family_aliases["aston-martin-family"]
    assert "Toro Rosso" in family_aliases["rb-family"]
