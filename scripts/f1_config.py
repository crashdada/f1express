import os
import sys
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_ROOT_ENV = os.environ.get('F1_STORAGE_ROOT')

if STORAGE_ROOT_ENV:
    STORAGE_ROOT = Path(STORAGE_ROOT_ENV).resolve()
else:
    # Auto-detect logic
    LOCAL_STORAGE = BASE_DIR / "storage"
    if LOCAL_STORAGE.exists():
        STORAGE_ROOT = LOCAL_STORAGE
    else:
        # Fallback to current structure (public/data)
        STORAGE_ROOT = BASE_DIR / "public" / "data"

# Common Paths
DB_PATH = STORAGE_ROOT / "f1.db"
LIVE_DATA_DIR = STORAGE_ROOT  # Simplified: Live data directly in storage root for frontend access
PHOTO_DIR = STORAGE_ROOT / "photos"
UPLOAD_DIR = STORAGE_ROOT / "uploads"
CSV_SOURCE_DIR = STORAGE_ROOT / "csv"
ASSETS_DIR = STORAGE_ROOT / "assets"
BACKUP_DIR = STORAGE_ROOT / "backups"

# Ensure directories exist
def ensure_dirs():
    LIVE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    CSV_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def get_path(handle):
    mapping = {
        'db': DB_PATH,
        'live': LIVE_DATA_DIR,
        'photos': PHOTO_DIR,
        'uploads': UPLOAD_DIR,
        'csv': CSV_SOURCE_DIR,
        'assets': ASSETS_DIR,
        'backups': BACKUP_DIR,
        'root': STORAGE_ROOT
    }
    return mapping.get(handle)
