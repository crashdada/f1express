#!/usr/bin/env python3
"""
照片索引生成器
- 固定扫描 storage/photos 目录
- 如存在 dist/photos，则同步写入索引，避免构建产物与源目录脱节
"""
import json
import os
import sys
from collections import Counter
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs


def update_photo_index():
    ensure_dirs()
    base_dir = str(Path(__file__).resolve().parents[2])
    src_dir = get_path('photos')

    if not os.path.exists(src_dir):
        print(f"[SKIP] photos directory not found: {src_dir}")
        return

    photos = []
    for root, _, files in os.walk(src_dir):
        for name in files:
            if name.lower().endswith(('.png', '.webp', '.jpg', '.jpeg', '.svg')):
                rel = os.path.relpath(os.path.join(root, name), src_dir).replace('\\', '/')
                photos.append(rel)

    photos.sort()

    targets = [os.path.join(src_dir, 'index.json')]
    dist_photos = os.path.join(base_dir, 'dist', 'photos')
    if os.path.exists(dist_photos):
        targets.append(os.path.join(dist_photos, 'index.json'))

    for idx_path in targets:
        try:
            with open(idx_path, 'w', encoding='utf-8') as handle:
                json.dump(photos, handle, ensure_ascii=False, indent=2)
            loc = 'dist' if 'dist' in idx_path else 'storage'
            print(f"  [OK] [{loc}] {len(photos)} photos -> {os.path.basename(os.path.dirname(idx_path))}/index.json")
        except Exception as exc:
            print(f"  [ERROR] failed to write index: {idx_path}: {exc}")

    categories = Counter()
    for photo in photos:
        top = photo.split('/')[0] if '/' in photo else '(root)'
        categories[top] += 1

    print("  Category distribution:")
    for key, value in sorted(categories.items(), key=lambda item: (-item[1], item[0])):
        print(f"    {key:<30} {value}")


if __name__ == "__main__":
    update_photo_index()
