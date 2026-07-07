src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

idx = src.find('_initPhylaObserver();')
if idx > 0:
    print(repr(src[idx-200:idx+100]))
else:
    print("Call site not found at all")

idx2 = src.find("console.log('[RPGACE:config] Cache")
if idx2 > 0:
    print("---")
    print(repr(src[idx2:idx2+400]))
