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


def get_track_mapping() -> dict[str, str]:
    """赛道中文名到英文关键字映射。"""
    return {
        "英国 (银石)": "Silverstone",
        "意大利 (蒙扎)": "Monza",
        "意大利 (伊莫拉)": "Enzo",
        "巴西 (圣保罗)": "Carlos Pace",
        "比利时 (斯帕)": "Spa",
        "奥地利 (红牛环)": "Spielberg",
        "美国 (奥斯汀)": "Austin",
        "美国 (迈阿密)": "Miami",
        "阿塞拜疆 (巴库)": "Baku",
        "卡塔尔 (卢赛尔)": "Lusail",
        "中国 (上海)": "Shanghai",
    }


def get_driver_mapping() -> dict[str, tuple[str, str]]:
    """中文车手名到英文 first_name / last_name 映射。"""
    return {
        "维斯塔潘": ("Max", "Verstappen"),
        "汉密尔顿": ("Lewis", "Hamilton"),
        "博塔斯": ("Valtteri", "Bottas"),
        "里卡多": ("Daniel", "Ricciardo"),
        "赛恩斯": ("Carlos", "Sainz"),
        "勒克莱尔": ("Charles", "Leclerc"),
        "佩雷兹": ("Sergio", "Perez"),
        "诺里斯": ("Lando", "Norris"),
        "马格努森": ("Kevin", "Magnussen"),
        "拉塞尔": ("George", "Russell"),
        "奥康": ("Esteban", "Ocon"),
        "阿隆索": ("Fernando", "Alonso"),
        "斯特罗尔": ("Lance", "Stroll"),
        "斯托尔": ("Lance", "Stroll"),
        "霍肯伯格": ("Nico", "Hulkenberg"),
        "胡肯伯格": ("Nico", "Hulkenberg"),
        "皮亚斯特里": ("Oscar", "Piastri"),
        "阿尔本": ("Alexander", "Albon"),
        "加斯利": ("Pierre", "Gasly"),
        "周冠宇": ("Guanyu", "Zhou"),
        "角田": ("Yuki", "Tsunoda"),
        "角田裕毅": ("Yuki", "Tsunoda"),
        "德弗里斯": ("Nyck", "De Vries"),
        "劳森": ("Liam", "Lawson"),
        "科拉平托": ("Franco", "Colapinto"),
        "杜汉": ("Jack", "Doohan"),
        "安东内利": ("Kimi", "Antonelli"),
        "哈贾尔": ("Isack", "Hadjar"),
        "贝尔曼": ("Oliver", "Bearman"),
        "博托莱托": ("Gabriel", "Bortoleto"),
        "Hadjar": ("Isack", "Hadjar"),
        "Antonelli": ("Kimi", "Antonelli"),
        "Bearman": ("Oliver", "Bearman"),
        "Bortoleto": ("Gabriel", "Bortoleto"),
        "Doohan": ("Jack", "Doohan"),
        "Lawson": ("Liam", "Lawson"),
    }


def resolve_circuit_id(cursor: sqlite3.Cursor, track_en: str) -> int | None:
    cursor.execute(
        """
        SELECT circuit_id
        FROM circuits
        WHERE name LIKE ?
        LIMIT 1
        """,
        (f"%{track_en}%",),
    )
    row = cursor.fetchone()
    return row[0] if row else None


def resolve_race_for_sprint(
    cursor: sqlite3.Cursor,
    season: int,
    circuit_id: int,
    track_en: str,
) -> tuple[int | None, int | None, str | None]:
    """优先按赛季+circuit_id 关联正赛，回退到赛道名模糊匹配。"""
    cursor.execute(
        """
        SELECT race_id, round_number, race_date
        FROM races
        WHERE season = ? AND circuit_id = ?
        LIMIT 1
        """,
        (season, circuit_id),
    )
    row = cursor.fetchone()
    if row:
        return row[0], row[1], row[2]

    cursor.execute(
        """
        SELECT r.race_id, r.round_number, r.race_date
        FROM races r
        JOIN circuits c ON r.circuit_id = c.circuit_id
        WHERE r.season = ? AND c.name LIKE ?
        LIMIT 1
        """,
        (season, f"%{track_en}%"),
    )
    row = cursor.fetchone()
    if row:
        return row[0], row[1], row[2]
    return None, None, None


def resolve_driver_id(
    cursor: sqlite3.Cursor,
    raw_name: str,
    driver_mapping: dict[str, tuple[str, str]],
) -> int | None:
    driver_tuple = driver_mapping.get(raw_name)

    if driver_tuple:
        cursor.execute(
            """
            SELECT driver_id
            FROM drivers
            WHERE first_name = ? AND last_name = ?
            LIMIT 1
            """,
            driver_tuple,
        )
        row = cursor.fetchone()
        if row:
            return row[0]

    search_name = driver_tuple[1] if driver_tuple else raw_name
    cursor.execute(
        """
        SELECT driver_id
        FROM drivers
        WHERE last_name = ? OR last_name_cn = ?
        LIMIT 1
        """,
        (search_name, search_name),
    )
    row = cursor.fetchone()
    return row[0] if row else None


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
    csv_path = get_path("csv") / "sprint_results.csv"
    df_sprint = pd.read_csv(csv_path)

    track_mapping = get_track_mapping()
    driver_mapping = get_driver_mapping()

    total_records = len(df_sprint)
    success_count = 0
    failed_records: list[str] = []

    grouped = df_sprint.groupby(["年份", "赛道"])
    for (season, track_cn), group in grouped:
        season = int(season)
        track_en = track_mapping.get(track_cn)
        if not track_en:
            failed_records.append(f"未找到赛道映射: {track_cn}")
            continue

        circuit_id = resolve_circuit_id(cursor, track_en)
        if circuit_id is None:
            failed_records.append(f"数据库未找到赛道: {track_cn} -> {track_en}")
            continue

        race_id, round_number, race_date = resolve_race_for_sprint(cursor, season, circuit_id, track_en)
        if round_number is None:
            print(f"[WARN] {season} {track_cn} 未能关联到正赛 round_number，将保留为空")

        cursor.execute(
            """
            INSERT INTO sprint_races (season, race_id, round_number, circuit_id, race_date, track_name_cn)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (season, race_id, round_number, circuit_id, race_date, track_cn),
        )
        sprint_race_id = cursor.lastrowid

        for _, row in group.iterrows():
            raw_name = normalize_name(row["人员列表"])
            driver_id = resolve_driver_id(cursor, raw_name, driver_mapping)
            if driver_id is None:
                failed_records.append(f"数据库未找到车手: {raw_name}")
                continue

            team_id = resolve_team_id_for_sprint_result(cursor, race_id, season, driver_id)
            position = int(row["真实排名"])
            points = float(row["得分"])

            cursor.execute(
                """
                INSERT INTO sprint_results
                (sprint_race_id, driver_id, team_id, position, points, driver_name_cn)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (sprint_race_id, driver_id, team_id, position, points, raw_name),
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
