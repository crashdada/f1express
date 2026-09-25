import pathlib
import sys

import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
EXPORTERS_DIR = PROJECT_ROOT / "collector" / "exporters"
SCRAPERS_DIR = PROJECT_ROOT / "collector" / "scrapers"

for candidate in (EXPORTERS_DIR, SCRAPERS_DIR):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from export_results_json import enrich_result, to_points  # noqa: E402
from scraper import F1DataCollector  # noqa: E402


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("25", 25),
        (25, 25),
        ("0.5", 0.5),
        ("0", 0),
        (0, 0),
        ("", 0),
        (None, 0),
        ("-", 0),
        ("NC", 0),
        ("DNF", 0),
        (" 18 ", 18),
        ("not-a-number", 0),
    ],
)
def test_to_points_normalizes_scraped_values(raw, expected):
    result = to_points(raw)
    assert result == expected
    assert isinstance(result, (int, float))


def test_cell_text_joins_driver_fragments():
    row = [
        {"content": ["1"]},
        {"content": ["12"]},
        {"content": ["Kimi Antonelli", " ANT"]},
        {"content": ["Mercedes"]},
        {"content": ["57"]},
        {"content": ["1:34:23.754"]},
        {"content": ["25"]},
    ]
    collector = F1DataCollector(season=2026)
    assert collector._cell_text(row, 0) == "1"
    assert collector._cell_text(row, 2, join=True) == "Kimi Antonelli  ANT"
    assert collector._cell_text(row, 3, join=True) == "Mercedes"
    assert collector._cell_text(row, 9) is None


LAWSON_ROSTER = {
    "firstName": "Liam",
    "lastName": "Lawson",
    "code": "LAW",
    "team": "Racing Bulls",
    "teamCn": "RB",
}


def test_result_team_prefers_scraped_team_over_season_roster():
    item = {
        "pos": "6",
        "no": "30",
        "code": "LAW",
        "team": "Red Bull Racing",
        "laps": "57",
        "time": "+86.746s",
        "points": "8",
    }
    result = enrich_result(item, LAWSON_ROSTER, None, "LAW")
    assert result["team"] == "Red Bull"
    assert result["teamCn"] == "红牛"
    assert result["points"] == 8


def test_result_team_falls_back_to_substitution_config():
    roster = {
        "firstName": "Yuki",
        "lastName": "Tsunoda",
        "code": "TSU",
        "team": "Racing Bulls",
        "teamCn": "RB",
    }
    item = {"pos": "10", "no": "22", "code": "TSU", "points": "1"}
    result = enrich_result(item, roster, {"team": "Red Bull", "teamCn": "红牛"}, "TSU")
    assert result["team"] == "Red Bull"
    assert result["teamCn"] == "红牛"
    assert result["isSubstitute"] is True


def test_result_team_falls_back_to_season_roster():
    item = {"pos": "7", "no": "30", "code": "LAW", "points": "6"}
    result = enrich_result(item, LAWSON_ROSTER, None, "LAW")
    assert result["team"] == "Racing Bulls"
    assert result["teamCn"] == "RB"


def _results_table_html():
    """Minimal mimic of the current formula1.com server-rendered results table."""
    rows = [
        ("1", "1", "Lando Norris", "NOR", "McLaren", "72", "2:04:44.859", "25"),
        ("2", "12", "Kimi Antonelli", "ANT", "Mercedes", "72", "+11.536s", "18"),
        ("7", "30", "Liam Lawson", "LAW", "Red Bull Racing", "72", "+79.915s", "6"),
        ("11", "22", "Yuki Tsunoda", "TSU", "Racing Bulls", "71", "+1 lap", "0"),
        ("12", "41", "Arvid Lindblad", "LIN", "Racing Bulls", "71", "+1 lap", "0"),
        ("NC", "3", "Max Verstappen", "VER", "Red Bull Racing", "0", "DNF", "0"),
    ]
    body = "".join(
        f"<tr><td>{pos}</td><td>{no}</td>"
        f"<td><span>{name}</span> {code}</td>"
        f"<td>{team}</td><td>{laps}</td><td>{t}</td><td>{pts}</td></tr>"
        for pos, no, name, code, team, laps, t, pts in rows
    )
    return f"<html><body><table class='Table-module_table'>{body}</table></body></html>"


def test_parses_server_rendered_results_table():
    results = F1DataCollector._extract_html_results_table(_results_table_html())
    assert len(results) == 6

    lawson = next(r for r in results if r["no"] == "30")
    assert lawson["code"] == "LAW"
    assert lawson["team"] == "Red Bull Racing"
    assert lawson["points"] == "6"

    tsunoda = next(r for r in results if r["no"] == "22")
    assert tsunoda["code"] == "TSU"
    assert tsunoda["team"] == "Racing Bulls"
    assert tsunoda["driver"] == "Yuki Tsunoda TSU"

    verstappen = next(r for r in results if r["no"] == "3")
    assert verstappen["pos"] == "NC"


def test_html_parser_returns_empty_without_table():
    assert F1DataCollector._extract_html_results_table("<html><body>no table</body></html>") == []
