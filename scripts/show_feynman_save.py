lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
start = None
for i, l in enumerate(lines):
    if '_updateTaxonomyNode' in l and 'function' in l:
        start = i
        break
if start:
    for i in range(max(0, start-5), min(start+40, len(lines))):
        print(i+1, lines[i], end='')
else:
    # Try finding _saveSession instead
    for i, l in enumerate(lines):
        if '_saveSession' in l and 'function' in l:
            print(i+1, l, end='')
            for j in range(i+1, min(i+30, len(lines))):
                print(j+1, lines[j], end='')
            break
