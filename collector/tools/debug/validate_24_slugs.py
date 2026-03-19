import requests

slugs = [
    "melbourne", "shanghai", "suzuka", "sakhir", "jeddah", "miami", "montreal",
    "montecarlo", "catalunya", "spielberg", "silverstone", "spafrancorchamps",
    "hungaroring", "zandvoort", "monza", "madring", "baku", "singapore",
    "austin", "mexicocity", "interlagos", "lasvegas", "lusail", "yasmarinacircuit"
]

v = "v1740000000"
for s in slugs:
    url = f"https://media.formula1.com/image/upload/c_lfill,w_3392/{v}/common/f1/2026/track/2026track{s}blackoutline.svg"
    r = requests.head(url)
    print(f"{s}: {r.status_code}")
