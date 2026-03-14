import os
import requests

# 路径配置
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
LIBS_DIR = os.path.join(PUBLIC_DIR, 'libs')
FONTS_DIR = os.path.join(PUBLIC_DIR, 'fonts')

ASSETS = {
    "sql.js": [
        ("https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js", "libs/sql.js/sql-wasm.js"),
        ("https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.wasm", "libs/sql.js/sql-wasm.wasm"),
    ],
    "fonts": [
        # Inter-Regular
        ("https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff2", "fonts/inter-regular.woff2"),
        # Inter-Bold
        ("https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-700-normal.woff2", "fonts/inter-bold.woff2"),
        # Orbitron-Bold
        ("https://cdn.jsdelivr.net/npm/@fontsource/orbitron/files/orbitron-latin-700-normal.woff2", "fonts/orbitron-bold.woff2"),
    ]
}

def download_file(url, rel_path):
    target_path = os.path.join(BASE_DIR, 'public', rel_path)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    try:
        print(f"Downloading {url} to {rel_path}...")
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            with open(target_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"Failed to download {url}: {response.status_code}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")
    return False

if __name__ == "__main__":
    print("Localizing web dependencies...")
    for category, items in ASSETS.items():
        print(f"Processing {category}...")
        for url, rel_path in items:
            download_file(url, rel_path)
    print("Localization completed.")
