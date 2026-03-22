#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导入冲刺赛 CSV 到数据库。

关键目标：
1. 导入时为 sprint_races 补齐 race_id / round_number / race_date。
2. 导入时为 sprint_results 补齐 team_id，避免后续统计再做脆弱推断。

这一步只负责把 sprint_results.csv 可靠落库，不负责改写历史正赛积分。
2025 Ferrari 这类差异，只有在：
create_normalized_db.py -> import_sprint_data.py -> recalculate_stats.py
完整跑通后，才会正确反映到 team_season_stats。
"""

from __future__ import annotations

import io
import re
import sqlite3
import sys
from pathlib import Path

import pandas as pd

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import ensure_dirs, get_path


def normalize_name(name_str: str) -> str:
    """从“姓名 (车队)”中提取车手姓名。"""
    match = re.match(r"(.+?)(?:\s*\((.+?)\))?$", str(name_str).strip())
    if match:
        return match.group(1).strip()
    return str(name_str).strip()


def create_sprint_tables(conn: sqlite3.Connection) -> None:
    """重建冲刺赛相关表。"""
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS sprint_results")
    cursor.execute("DROP TABLE IF EXISTS sprint_races")

    cursor.execute(
        """
        CREATE TABLE sprint_races (
            sprint_race_id INTEGER PRIMARY KEY AUTOINCREMENT,
            season INTEGER NOT NULL,
            race_id INTEGER,
            round_number INTEGER,
            circuit_id INTEGER,
            race_date TEXT,
            track_name_cn TEXT,
            FOREIGN KEY (race_id) REFERENCES races(race_id),
            FOREIGN KEY (circuit_id) REFERENCES circuits(circuit_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE sprint_results (
            result_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sprint_race_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            team_id INTEGER,
            position INTEGER,
            points REAL,
            driver_name_cn TEXT,
            FOREIGN KEY (sprint_race_id) REFERENCES sprint_races(sprint_race_id),
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            FOREIGN KEY (team_id) REFERENCES teams(team_id)
        )
        """
    )
    conn.commit()
    print("[OK] 已重建 sprint_races / sprint_results")


def resolve_team_id_for_sprint_result(
    cursor: sqlite3.Cursor,
    race_id: int | None,
    season: int,
    driver_id: int,
) -> int | None:
    """优先按同站正赛记录回填 team_id，失败时用赛季主车队兜底。"""
    if race_id is not None:
        cursor.execute(
            """
            SELECT team_id
            FROM race_results
            WHERE race_id = ? AND driver_id = ? AND team_id IS NOT NULL
            LIMIT 1
            """,
            (race_id, driver_id),
        )
        row = cursor.fetchone()
        if row:
            return row[0]

    cursor.execute(
        """
        SELECT rr.team_id
        FROM race_results rr
        JOIN races r ON rr.race_id = r.race_id
        WHERE r.season = ? AND rr.driver_id = ? AND rr.team_id IS NOT NULL
        GROUP BY rr.team_id
        ORDER BY COUNT(*) DESC, SUM(rr.points) DESC
        LIMIT 1
        """,
        (season, driver_id),
    )
    row = cursor.fetchone()
    return row[0] if row else None


def import_sprint_data(conn: sqlite3.Connection) -> tuple[int, list[str]]:
    """导入冲刺赛数据。"""
    cursor = conn.cursor()
    # 1. Load data
    csv_path = get_path("csv") / "sprint_results.csv"
    df_sprint = pd.read_csv(csv_path)

    total_records = len(df_sprint)
    success_count = 0
    failed_records: list[str] = []

    # 新结构：year, round, position, number, first_name, last_name, code, team, points, status
    grouped = df_sprint.groupby(["year", "round"])
    for (season, target_round), group in grouped:
        season = int(season)
        target_round = int(target_round)
        
        # 从 races_meta 获取赛道信息
        cursor.execute("SELECT circuit_id, race_id, race_date FROM races WHERE season = ? AND round_number = ?", (season, target_round))
        race_row = cursor.fetchone()
        if not race_row:
            failed_records.append(f"未找到赛站: {season} R{target_round}")
            continue
        
        circuit_id, race_id, race_date = race_row

        cursor.execute(
            """
            INSERT INTO sprint_races (season, race_id, round_number, circuit_id, race_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (season, race_id, target_round, circuit_id, race_date),
        )
        sprint_race_id = cursor.lastrowid

        for _, row in group.iterrows():
            f_name, l_name = str(row["first_name"]).strip(), str(row["last_name"]).strip()
            
            # 使用 first_name / last_name 直接锁定 driver_id
            cursor.execute("SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?", (f_name, l_name))
            d_row = cursor.fetchone()
            if not d_row:
                failed_records.append(f"数据库未找到车手: {f_name} {l_name}")
                continue
            
            driver_id = d_row[0]
            team_id = resolve_team_id_for_sprint_result(cursor, race_id, season, driver_id)
            position = int(row["position"])
            points = float(row["points"])

            cursor.execute(
                """
                INSERT INTO sprint_results
                (sprint_race_id, driver_id, team_id, position, points, driver_name_cn)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (sprint_race_id, driver_id, team_id, position, points, f"{f_name} {l_name}"),
            )
            success_count += 1

    conn.commit()

    print("\n导入统计:")
    print(f"  总记录: {total_records}")
    print(f"  成功: {success_count}")
    print(f"  失败: {len(failed_records)}")

    if failed_records:
        print("\n失败记录:")
        for item in failed_records[:20]:
            print(f"  - {item}")
        if len(failed_records) > 20:
            print(f"  ... 还有 {len(failed_records) - 20} 条")

    return success_count, failed_records


def verify_import(conn: sqlite3.Connection) -> None:
    """输出导入摘要，重点看关联字段是否落齐。"""
    cursor = conn.cursor()
    print("\n" + "=" * 60)
    print("验证导入结果")
    print("=" * 60)

    race_count = cursor.execute("SELECT COUNT(*) FROM sprint_races").fetchone()[0]
    result_count = cursor.execute("SELECT COUNT(*) FROM sprint_results").fetchone()[0]
    linked_race_count = cursor.execute("SELECT COUNT(*) FROM sprint_races WHERE race_id IS NOT NULL").fetchone()[0]
    linked_round_count = cursor.execute("SELECT COUNT(*) FROM sprint_races WHERE round_number IS NOT NULL").fetchone()[0]
    linked_team_count = cursor.execute("SELECT COUNT(*) FROM sprint_results WHERE team_id IS NOT NULL").fetchone()[0]

    print(f"1. 冲刺赛场次: {race_count}")
    print(f"2. 冲刺赛结果: {result_count}")
    print(f"3. 已关联正赛 race_id: {linked_race_count}/{race_count}")
    print(f"4. 已关联 round_number: {linked_round_count}/{race_count}")
    print(f"5. 已回填 team_id: {linked_team_count}/{result_count}")

    print("\n6. 各赛季冲刺赛场次:")
    for season, count in cursor.execute(
        """
        SELECT season, COUNT(*)
        FROM sprint_races
        GROUP BY season
        ORDER BY season
        """
    ):
        print(f"   {season}: {count} 场")


def main() -> None:
    ensure_dirs()
    db_path = str(get_path("db"))

    print("=" * 60)
    print("冲刺赛数据导入工具")
    print("=" * 60)

    conn = sqlite3.connect(db_path)
    try:
        create_sprint_tables(conn)
        import_sprint_data(conn)
        verify_import(conn)
        print("\n" + "=" * 60)
        print("导入完成")
        print("=" * 60)
    except Exception as exc:
        print(f"\n错误: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
