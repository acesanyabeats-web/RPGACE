src = open('main.js', encoding='utf-8', errors='replace').read()
idx = src.find("function buildWeekSlots(){const days=")
if idx > 0:
    end_idx = src.find("function buildMonthSlots", idx)
    if end_idx == -1:
        end_idx = idx + 500
    snippet = src[idx:end_idx]
    print("LENGTH:", len(snippet))
    print("---START---")
    print(repr(snippet))
    print("---END---")
else:
    print("Not found")
