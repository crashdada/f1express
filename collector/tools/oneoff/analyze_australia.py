from bs4 import BeautifulSoup
import json

with open('australia.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

sessions = []
# F1 sessions are often in a list or grid
# They usually have a name and a time
# Let's search for anything with f1-heading or similar

# A common pattern for Next.js F1 pages:
# Session containers have a specific class or data-attribute
# Or they have text like "Practice 1"

for row in soup.find_all(['div', 'tr']):
    text = row.get_text(strip=True)
    if any(s in text for s in ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Race"]):
        # Extract time if possible
        # Look for something like "12:30" or ISO date
        # Actually Next.js App Router often hides the real data in JSON blobs
        pass

# Let's search for the JSON blobs in scripts again
import re
scripts = soup.find_all('script')
for script in scripts:
    if script.string and 'timetables' in script.string:
        print("Found timetables in script!")
        # Try to extract the JSON part
        match = re.search(r'\"timetables\":\[(.*?)\]', script.string)
        if match:
            print("Extracted sessions JSON")
            # ...
            break

# If not found in scripts, maybe it's in the text
# I'll just print a chunk of the text around "Practice 1"
idx = soup.get_text().find("Practice 1")
print("Text around Practice 1:", soup.get_text()[idx:idx+200])
