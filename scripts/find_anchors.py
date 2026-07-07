src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Find reapplyIntelUI context
idx = src.find('reapplyIntelUI, 500')
if idx > 0:
    print("=== reapplyIntelUI context ===")
    print(repr(src[idx-200:idx+100]))

print()

# Find patchIntelFns context
idx2 = src.find('patchIntelFns')
if idx2 > 0:
    print("=== patchIntelFns context ===")
    print(repr(src[idx2-100:idx2+50]))

print()

# Find generateAgendas
idx3 = src.find('generateAgendas')
if idx3 > 0:
    print("=== generateAgendas context ===")
    print(repr(src[idx3-50:idx3+100]))
