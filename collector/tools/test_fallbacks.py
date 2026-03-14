import requests

urls = [
    "https://media.formula1.com/image/upload/f_auto/q_auto/v1677245653/content/dam/fom-website/2018-redesign-assets/circuit-maps/main-menu/Monaco.png",
    "https://media.formula1.com/image/upload/f_auto/q_auto/v1677245653/content/dam/fom-website/2018-redesign-assets/circuit-maps/main-menu/Spain.png",
    "https://media.formula1.com/image/upload/f_auto/q_auto/v1677245653/content/dam/fom-website/2018-redesign-assets/circuit-maps/main-menu/Belgium.png",
    "https://media.formula1.com/image/upload/c_lfill,w_3392/v1740000000/common/f1/2026/track/2026tracksaopauloblackoutline.svg"
]

for url in urls:
    r = requests.head(url)
    print(f"{url}: {r.status_code}")
