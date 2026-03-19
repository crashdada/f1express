from pathlib import Path


def tools_root_from(file_path: str) -> Path:
    return Path(file_path).resolve().parents[1]


def collector_root_from(file_path: str) -> Path:
    return tools_root_from(file_path).parent


def project_root_from(file_path: str) -> Path:
    return collector_root_from(file_path).parent


def _first_existing(candidates: list[Path], label: str) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate

    formatted = "\n".join(f"- {candidate}" for candidate in candidates)
    raise FileNotFoundError(f"Unable to locate {label}. Checked:\n{formatted}")


def resolve_db_path(file_path: str) -> Path:
    project_root = project_root_from(file_path)
    collector_root = collector_root_from(file_path)
    return _first_existing(
        [
            project_root / "storage" / "f1.db",
            collector_root / "data" / "f1.db",
            project_root / "public" / "data" / "f1.db",
            project_root / "public" / "f1.db",
            project_root / "dist" / "f1.db",
        ],
        "f1.db",
    )


def resolve_schedule_path(file_path: str) -> Path:
    project_root = project_root_from(file_path)
    collector_root = collector_root_from(file_path)
    return _first_existing(
        [
            project_root / "storage" / "schedule_2026.json",
            collector_root / "data" / "schedule_2026.json",
            project_root / "dist" / "data" / "schedule_2026.json",
        ],
        "schedule_2026.json",
    )
