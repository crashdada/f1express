import requests
import re
import json

url = "https://www.formula1.com/en/racing/2026"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

resp = requests.get(url, headers=headers)
html = resp.text

# Reconstruct Next.js data
pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
matches = re.findall(pattern, html)
full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')

with open('debug_next_data.txt', 'w', encoding='utf-8') as f:
    f.write(full_text)

# Search for sessions or meetings
print("Length of Next.js data:", len(full_text))
print("Occurrences of 'sessionTimes':", full_text.count('sessionTimes'))
print("Occurrences of 'meetingKey':", full_text.count('meetingKey'))
