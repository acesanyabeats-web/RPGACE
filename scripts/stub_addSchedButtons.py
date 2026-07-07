import re

src = open('main.js', encoding='utf-8', errors='replace').read()

def find_function_span(src, fn_signature_start):
    idx = src.find(fn_signature_start)
    if idx == -1:
        return None, None
    brace_start = src.find('{', idx)
    if brace_start == -1:
        return None, None
    depth = 0
    i = brace_start
    while i < len(src):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return idx, i + 1
        i += 1
    return None, None

start, end = find_function_span(src, 'function _addSchedButtons(){')
if start is not None:
    fixed = src[:start] + "function _addSchedButtons(){} // stub - superseded by inline Start/Done buttons in renderDailyGrid's rewrite, kept as empty stub since multiple places still call it" + src[end:]
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: _addSchedButtons stubbed to empty - eliminates duplicate buttons regardless of call site")
else:
    print("ERROR: function not found")
