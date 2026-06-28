lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
for i in range(1960, 1990):
    print(i+1, lines[i], end='')
