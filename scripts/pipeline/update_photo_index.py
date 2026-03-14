#!/usr/bin/env python3
"""
照片索引生成器
- 固定从 public/photos/ 扫描（Step 0 download_csv_assets.py 的写出地）
- 同时同步写入 dist/photos/（如果已存在），避免构建产物与源目录脱节
"""
import os
import json


def update_photo_index():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # 固定从 public/photos 扫描（Step 0 下载新图片的目标目录）
    src_dir = os.path.join(base_dir, 'public', 'photos')

    if not os.path.exists(src_dir):
        print(f"[SKIP] photos 目录不存在: {src_dir}")
        return

    # 递归收集所有图片的相对路径
    photos = []
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            if f.lower().endswith(('.png', '.webp', '.jpg', '.jpeg', '.svg')):
                rel = os.path.relpath(
                    os.path.join(root, f), src_dir
                ).replace('\\', '/')
                photos.append(rel)

    photos.sort()

    # 写入目标：public/photos/index.json（必写）
    # 同步写入 dist/photos/index.json（若 dist 已存在则同步，避免热更新延迟）
    targets = [os.path.join(src_dir, 'index.json')]
    dist_photos = os.path.join(base_dir, 'dist', 'photos')
    if os.path.exists(dist_photos):
        targets.append(os.path.join(dist_photos, 'index.json'))

    for idx_path in targets:
        try:
            with open(idx_path, 'w', encoding='utf-8') as f:
                json.dump(photos, f, ensure_ascii=False, indent=2)
            loc = 'public' if 'public' in idx_path else 'dist  '
            print(f"  [OK] [{loc}] {len(photos)} 张图片 -> {os.path.basename(os.path.dirname(idx_path))}/index.json")
        except Exception as e:
            print(f"  [ERROR] 写入失败: {idx_path}: {e}")

    # 按目录统计
    from collections import Counter
    cats = Counter()
    for p in photos:
        top = p.split('/')[0] if '/' in p else '(root)'
        cats[top] += 1
    print("  目录分布:")
    for k, v in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"    {k:<30} {v} 张")


if __name__ == "__main__":
    update_photo_index()
