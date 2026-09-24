import pathlib
import sys

import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
EXPORTERS_DIR = PROJECT_ROOT / "collector" / "exporters"
SCRAPERS_DIR = PROJECT_ROOT / "collector" / "scrapers"

for candidate in (EXPORTERS_DIR, SCRAPERS_DIR):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from export_results_json import to_points  # noqa: E402
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
