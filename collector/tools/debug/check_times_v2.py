with open('australia_next.txt', 'r', encoding='utf-8') as f:
    txt = f.read()

import re
# Look for anything ending in :00 or Z around startTime
matches = re.findall(r'\"startTime\":\"(.*?)\"', txt)
for m in matches[:10]:
    print(m)

# Search for any string like "+NN:NN" or "-NN:NN"
offsets = re.findall(r'\"[a-zA-Z]*Offset\":\"(.*?)\"', txt)
print(f"Detected offsets: {set(offsets)}")
