src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()
new_module = open('mod_contentRepurpose.js', encoding='utf-8', errors='replace').read()

# Find start and end markers
start_marker = '/* ===MODULE:contentRepurpose=== */'
end_marker = '/* ===END:contentRepurpose=== */'

start_idx = src.find(start_marker)
end_idx = src.find(end_marker)

if start_idx == -1:
    print("ERROR: start marker not found")
elif end_idx == -1:
    print("ERROR: end marker not found")
else:
    end_idx += len(end_marker)
    fixed = src[:start_idx] + new_module + src[end_idx:]
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("REPLACED: contentRepurpose module with v2")
    print("New size:", len(fixed))
