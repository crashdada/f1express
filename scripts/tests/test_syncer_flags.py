from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[2] / "collector"))

import syncer


def test_abbreviated_country_flags_keep_uppercase_asset_names():
    assert syncer.get_flag_name("USA") == "USA"
    assert syncer.get_flag_name("UAE") == "UAE"
