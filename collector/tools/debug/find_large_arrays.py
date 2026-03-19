import re

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all instances of "key":[...]
# We're looking for a long array.
matches = re.finditer(r'"(\w+)":\[', text)
for m in matches:
    key = m.group(1)
    # Estimate length by finding the closing bracket
    start_idx = m.end() - 1
    brace_count = 0
    end_idx = -1
    for i in range(start_idx, len(text)):
        if text[i] == '[': brace_count += 1
        elif text[i] == ']': brace_count -= 1
        if brace_count == 0:
            end_idx = i + 1
            break
    
    if end_idx != -1:
        array_len = end_idx - start_idx
        if array_len > 1000: # Only care about big arrays
            # Try to parse or just print info
            print(f"Key: {key}, Array Length: {array_len}, Context: {text[start_idx : start_idx+100]}")
