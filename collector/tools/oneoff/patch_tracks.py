import json
import os

path = 'data/schedule_2026.json'
with open(path, 'r', encoding='utf-8') as f:
    schedule = json.load(f)

# v参数可能变了，但我们尝试目前已知的 CDN 节点
# https://media.formula1.com/image/upload/f_auto/q_auto/v1677245653/content/dam/fom-website/2018-redesign-assets/circuit-maps/main-menu/Australia.png

for race in schedule:
    slug = race.get('slug', '').capitalize()
    if not slug: continue
    
    # 模拟 HTTP URL 以便 download_assets 识别
    race['image'] = f"https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/circuit-maps/main-menu/{slug}.png"
    race['detailedImage'] = f"https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/circuit-maps/main/{slug}_Circuit.png"

with open(path, 'w', encoding='utf-8') as f:
    json.dump(schedule, f, indent=4, ensure_ascii=False)

print("Patch complete: Schedule URLs are back to HTTP. Ready for re-download.")
