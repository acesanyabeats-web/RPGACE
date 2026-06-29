lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
for i, l in enumerate(lines):
    if 'allPhyla.forEach' in l:
        print("Found at line", i+1)
        for j in range(i, min(i+10, len(lines))):
            print(j+1, repr(lines[j]))
        break
