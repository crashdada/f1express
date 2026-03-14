import os
import requests
import re

# 路径配置
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.join(BASE_DIR, 'public', 'photos', 'custom', 'drivers')

# 手动恢复主要车手的原始 URL 并应用“上半身特写”裁剪参数
DRIVERS_MAP = {
    "NOR": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/mclaren/lannor01/2025mclarenlannor01side.webp",
    "VER": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/redbullracing/maxver01/2025redbullracingmaxver01side.webp",
    "RUS": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/mercedes/georus01/2025mercedesgeorus01side.webp",
    "ALB": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/williams/alealb01/2025williamsalealb01side.webp",
    "STR": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/astonmartin/lanstr01/2025astonmartinlanstr01side.webp",
    "HUL": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/kicksauber/nichul01/2025kicksaubernichul01side.webp",
    "LEC": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/ferrari/chalec01/2025ferrarichalec01side.webp",
    "PIA": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/mclaren/oscpia01/2025mclarenoscpia01side.webp",
    "HAM": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/ferrari/lewham01/2025ferrarilewham01side.webp",
    "GAS": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/alpine/piegas01/2025alpinepiegas01side.webp",
    "TSU": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/racingbulls/yuktsu01/2025racingbullsyuktsu01side.webp",
    "OCO": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/haasf1team/estoco01/2025haasf1teamestoco01side.webp",
    "BEA": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/haasf1team/olibea01/2025haasf1teamolibea01side.webp",
    "LAW": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/redbullracing/lialaw01/2025redbullracinglialaw01side.webp",
    "BOR": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/kicksauber/gabbor01/2025kicksaubergabbor01side.webp",
    "ALO": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/astonmartin/feralo01/2025astonmartinferalo01side.webp",
    "SAI": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/williams/carsai01/2025williamscarsai01side.webp",
    "DOO": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/alpine/jacdoo01/2025alpinejacdoo01side.webp",
    "HAD": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/racingbulls/isahad01/2025racingbullsisahad01side.webp",
    "COL": "https://media.formula1.com/image/upload/c_fill,g_face,w_600,h_600/q_auto/v1740000000/common/f1/2025/alpine/fracol01/2025alpinefracol01side.webp",
}

def download_fix():
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    for code, url in DRIVERS_MAP.items():
        target = os.path.join(PHOTOS_DIR, f"avatar_{code}.webp")
        print(f"Fixing {code} ...")
        
        # 尝试 side.webp
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            print(f"  Side.webp failed for {code}, falling back to right.webp")
            url = url.replace('side.webp', 'right.webp')
            r = requests.get(url, timeout=10)
            
        if r.status_code == 200:
            with open(target, 'wb') as f:
                f.write(r.content)
            print(f"  [OK] Saved to {target}")
        else:
            print(f"  [Error] Failed all attempts for {code}")

if __name__ == "__main__":
    download_fix()
    print("Avatar fixes (upper body crop) applied.")
