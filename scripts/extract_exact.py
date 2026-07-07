src = open('main.js', encoding='utf-8', errors='replace').read()
idx = src.find("function buildMonthSlots(){const el=document.getElementById('month-slots')")
if idx > 0:
    # Find the end of this function - it ends right before the next function or dzOver
    end_idx = src.find("function dzOver(e)")
    snippet = src[idx:end_idx]
    print("LENGTH:", len(snippet))
    print("---START---")
    print(repr(snippet))
    print("---END---")
else:
    print("Not found at all")
