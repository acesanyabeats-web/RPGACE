import re

src = open('main.js', encoding='utf-8', errors='replace').read()

# Match top-level function declarations
pattern = re.compile(r'^function (\w+)\(', re.MULTILINE)
names = pattern.findall(src)

from collections import Counter
counts = Counter(names)
dupes = {name: count for name, count in counts.items() if count > 1}

print("Total functions found:", len(names))
print("Duplicate function names:", len(dupes))
for name, count in sorted(dupes.items()):
    print(f"  {name}: declared {count} times")
