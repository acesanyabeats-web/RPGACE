lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
for i, l in enumerate(lines):
    if 'panel2' in l or 'intel' in l.lower() or 'watchlist' in l.lower():
        print(i+1, repr(l[:120]))
