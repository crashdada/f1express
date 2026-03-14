import requests

slugs = [
    'bahrain', 'sakhir', 
    'monaco', 'monte-carlo', 'monmancan',
    'belgium', 'spa', 'spa-francorchamps',
    'hungary', 'budapest', 'hungaroring', 
    'imola', 'emilia-romagna',
    'barcelona', 'barcelona-catalunya',
    'madrid', 'spain',
    'austria', 'spielberg', 'red-bull-ring',
    'canada', 'montreal',
    'netherlands', 'zandvoort',
    'italy', 'monza'
]
v = "v1740000000"

for s in slugs:
    url = f"https://media.formula1.com/image/upload/c_lfill,w_3392/{v}/common/f1/2026/track/2026track{s}blackoutline.svg"
    try:
        r = requests.head(url, timeout=5)
        print(f"{s}: {r.status_code}")
        if r.status_code == 200:
            print(f"FOUND: {url}")
    except Exception as e:
        print(f"{s}: Error {e}")
