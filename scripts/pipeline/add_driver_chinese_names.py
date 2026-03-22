#!/usr/bin/env python3
"""
Populate Chinese driver names in the historical SQLite database.

This step is part of the legacy 13-step pipeline and must remain runnable after
every database rebuild.

Translation data is maintained in scripts/f1_translations.py (single source of truth).
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import ensure_dirs, get_path
from f1_translations import DRIVER_TRANSLATIONS


def add_chinese_names() -> None:
    ensure_dirs()
    db_path = str(get_path("db"))
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("开始更新车手中文名称...")
    updated_count = 0

    for first_name, last_name, first_name_cn, last_name_cn in DRIVER_TRANSLATIONS:
        cursor.execute(
            """
            UPDATE drivers
            SET first_name_cn = ?, last_name_cn = ?
            WHERE first_name = ? AND last_name = ?
            """,
            (first_name_cn, last_name_cn, first_name, last_name),
        )
        updated_count += cursor.rowcount

    conn.commit()

    total_with_chinese = cursor.execute(
        "SELECT COUNT(*) FROM drivers WHERE first_name_cn IS NOT NULL AND first_name_cn != ''"
    ).fetchone()[0]
    total_drivers = cursor.execute("SELECT COUNT(*) FROM drivers").fetchone()[0]

    # Check how many scored drivers still lack Chinese names
    missing_scored = cursor.execute(
        """
        SELECT COUNT(*) FROM drivers d
        LEFT JOIN (
            SELECT driver_id, SUM(CAST(points AS FLOAT)) as total_points
            FROM driver_season_stats GROUP BY driver_id
        ) s ON d.driver_id = s.driver_id
        WHERE (d.first_name_cn IS NULL OR d.first_name_cn = '')
          AND s.total_points > 0
        """
    ).fetchone()[0]

    print("\n[OK] 完成！")
    print(f"  更新了 {updated_count} 位车手的中文名称")
    print(f"  总共 {total_drivers} 位车手，其中 {total_with_chinese} 位有中文名")
    if missing_scored > 0:
        print(f"  ⚠ 仍有 {missing_scored} 位有积分车手缺少中文名")

    conn.close()


if __name__ == "__main__":
    add_chinese_names()
