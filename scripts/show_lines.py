lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
for i in range(935, 945):
    print(i+1, repr(lines[i]))
