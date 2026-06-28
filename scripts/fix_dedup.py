src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """            var toSync = entries.filter(function(e) {
              return !existingConcepts.includes((e.title || '').toLowerCase().trim());
            });"""

new = """            // Deduplicate within the incoming batch too
            var seenTitles = {};
            var toSync = entries.filter(function(e) {
              var t = (e.title || '').toLowerCase().trim();
              if (existingConcepts.includes(t)) return false;
              if (seenTitles[t]) return false;
              seenTitles[t] = true;
              return true;
            });"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: taxonomySync deduplication fixed")
else:
    print("ERROR: anchor not found")
