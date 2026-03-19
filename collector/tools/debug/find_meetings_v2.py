import re
with open('debug_next_data.txt', 'r', encoding='utf-8') as f:
    data = f.read()

matches = re.findall(r'\"meetingKey\":\"(.*?)\"', data)
print(f"Total meetingKey matches: {len(matches)}")
print(f"Unique meetingKey matches: {len(set(matches))}")
print(f"Sample: {list(set(matches))[:10]}")

# Look for sessionTimes or timetables
matches2 = re.findall(r'\"(sessionTimes|timetables)\":\[', data)
print(f"Session containers matches: {set(matches2)}")
