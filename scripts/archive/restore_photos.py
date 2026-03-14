import sqlite3
import json
import os

# 路径配置
DB_PATH = r"C:\Users\jaymz\Desktop\oc\f1-website\public\f1.db"
DRIVER_JSON_PATH = r"C:\Users\jaymz\Desktop\oc\f1-website\public\data\drivers_2026.json"
TEAM_JSON_PATH = r"C:\Users\jaymz\Desktop\oc\f1-website\public\data\teams_2026.json"

def restore_photos():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. 从 drivers_2026.json 恢复车手照片
    print("正在从 drivers_2026.json 恢复车手照片...")
    if os.path.exists(DRIVER_JSON_PATH):
        try:
            with open(DRIVER_JSON_PATH, 'r', encoding='utf-8') as f:
                drivers = json.load(f)
                count = 0
                for d in drivers:
                    code = d.get('code')
                    image_url = d.get('image')
                    first = d.get('firstName')
                    last = d.get('lastName')
                    if image_url:
                        # 优先按姓名匹配，其次按缩写
                        if first and last:
                            cursor.execute('SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?', (first, last))
                        else:
                            cursor.execute('SELECT driver_id FROM drivers WHERE code = ?', (code,))
                        
                        row = cursor.fetchone()
                        if row:
                            did = row[0]
                            cursor.execute('INSERT OR REPLACE INTO driver_photos (driver_id, url) VALUES (?, ?)', (did, image_url))
                            count += 1
                print(f"  成功恢复 {count} 张车手照片")
        except Exception as e:
            print(f"  恢复车手照片失败: {e}")
    else:
        print(f"  警告: 找不到 {DRIVER_JSON_PATH}")

    # 2. 从 teams_2026.json 恢复车队照片 (Logo)
    print("正在从 teams_2026.json 恢复车队照片...")
    if os.path.exists(TEAM_JSON_PATH):
        try:
            with open(TEAM_JSON_PATH, 'r', encoding='utf-8') as f:
                teams = json.load(f)
                count = 0
                for t in teams:
                    name = t.get('name')
                    logo_url = t.get('logo')
                    if name and logo_url:
                        # 查找对应的 team_id
                        cursor.execute('SELECT team_id FROM teams WHERE name LIKE ?', (f'%{name}%',))
                        row = cursor.fetchone()
                        if row:
                            tid = row[0]
                            cursor.execute('INSERT OR REPLACE INTO team_photos (team_id, url) VALUES (?, ?)', (tid, logo_url))
                            count += 1
                print(f"  成功恢复 {count} 张车队照片")
        except Exception as e:
            print(f"  恢复车队照片失败: {e}")
    else:
        print(f"  警告: 找不到 {TEAM_JSON_PATH}")

    conn.commit()
    conn.close()
    print("数据库照片表修复完成。")

if __name__ == "__main__":
    restore_photos()
