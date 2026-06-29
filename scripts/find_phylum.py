lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
for i, l in enumerate(lines):
    if 'p.num === 12' in l or 'Fons Educationis' in l or 'auto-confirm' in l:
        for j in range(max(0,i-2), min(len(lines), i+5)):
            print(j+1, lines[j], end='')
        print('---')
