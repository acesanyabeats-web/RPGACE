lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
start = None
for i, l in enumerate(lines):
    if '===MODULE:contentRepurpose===' in l:
        start = i
        break
if start:
    for i in range(start, min(start+30, len(lines))):
        print(i+1, lines[i], end='')
