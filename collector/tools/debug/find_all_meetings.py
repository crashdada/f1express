with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find all meeting objects by looking for the meetingKey pattern
# or the URL pattern /en/racing/2026/XXXX
meetings = []
matches = re.finditer(r'/en/racing/2026/([a-zA-Z0-9-]+)', text)
found_slugs = set()
for m in matches:
    slug = m.group(1)
    if slug not in found_slugs and slug not in ['2026', 'Schedule', 'testing']:
        found_slugs.add(slug)
        meetings.append(slug)

print("Found slugs in flight data:", meetings)
print("Count:", len(meetings))
