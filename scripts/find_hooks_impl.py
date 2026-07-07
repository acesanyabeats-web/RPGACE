src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

idx = src.find('hooks')
# find the hooks object definition specifically
idx2 = src.find('RPGACE.hooks = {')
if idx2 == -1:
    idx2 = src.find('hooks: {')
if idx2 > 0:
    print(repr(src[idx2:idx2+600]))
else:
    print("hooks definition not found with those patterns, searching broader")
    idx3 = src.find("fire: function")
    if idx3 > 0:
        print(repr(src[idx3-100:idx3+400]))
