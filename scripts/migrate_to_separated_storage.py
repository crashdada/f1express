import os
import shutil
from pathlib import Path

def migrate():
    base_dir = Path(__file__).resolve().parent.parent
    storage_root = base_dir / "storage"
    
    print(f"[*] Starting migration to {storage_root}...")
    
    # Create target structure
    dirs = ["db", "live", "photos", "uploads", "csv"]
    for d in dirs:
        (storage_root / d).mkdir(parents=True, exist_ok=True)
        
    # 1. Migrate public/data/f1.db
    src_db = base_dir / "public" / "data" / "f1.db"
    if src_db.exists():
        print(f"  > Moving f1.db")
        shutil.copy2(src_db, storage_root / "f1.db")
        
    # 2. Migrate public/data/*.json to live/
    src_data = base_dir / "public" / "data"
    if src_data.exists():
        for f in src_data.glob("*.json"):
            print(f"  > Copying {f.name} to live/")
            shutil.copy2(f, storage_root / "live" / f.name)
            # Also keep in storage root for simpler frontend mapping if needed
            shutil.copy2(f, storage_root / f.name)

    # 3. Migrate public/photos to photos/
    src_photos = base_dir / "public" / "photos"
    if src_photos.exists():
        print(f"  > Syncing photos...")
        for item in src_photos.iterdir():
            target_item = storage_root / "photos" / item.name
            if item.is_dir():
                if target_item.exists():
                    shutil.rmtree(target_item)
                shutil.copytree(item, target_item)
            else:
                shutil.copy2(item, target_item)

    # 4. Migrate csv/ to csv/
    src_csv = base_dir / "csv"
    if src_csv.exists():
        print(f"  > Syncing CSV source data...")
        target_csv = storage_root / "csv"
        for item in src_csv.iterdir():
            target_item = target_csv / item.name
            if item.is_file():
                shutil.copy2(item, target_item)
            elif item.is_dir():
                if target_item.exists():
                    shutil.rmtree(target_item)
                shutil.copytree(item, target_item)

    # 5. Migrate assets/ to assets/ 
    # (Including root assets and collector assets)
    target_assets = storage_root / "assets"
    target_assets.mkdir(parents=True, exist_ok=True)
    
    asset_sources = [base_dir / "assets", base_dir / "collector" / "assets"]
    for src in asset_sources:
        if src.exists():
            print(f"  > Syncing {src.name} to assets/...")
            for item in src.iterdir():
                target_item = target_assets / item.name
                if item.is_file():
                    shutil.copy2(item, target_item)
                elif item.is_dir():
                    if target_item.exists():
                        shutil.rmtree(target_item)
                    shutil.copytree(item, target_item)

    print("[OK] Migration complete.")
    print("[!] Remember to update your Docker volumes and environment variables.")

if __name__ == "__main__":
    migrate()
