src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """          // Try to find a quoted idea title first e.g. "Why your beats sound quiet"
          var quotedMatch = oracleTxt.match(/["\u201c\u201d]([^"\u201c\u201d]{10,80})["\u201c\u201d]/);
          if (quotedMatch) {
            titleGuess = quotedMatch[1].trim();
          } else {
            // Try numbered idea format: "T9. Why your beats..." or "9. Why your beats..."
            var numberedMatch = oracleTxt.match(/(?:^|\n)[A-Z]?\d+[\.\)]\s*[\u2b50\*]?\s*[""]?([^\n""\u201c\u201d]{10,80})/);
            if (numberedMatch) {
              titleGuess = numberedMatch[1].trim();
            } else {
              // Fall back to first meaningful line
              var lines = oracleTxt.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length > 20 && l.length < 100;});
              if (lines.length > 0) titleGuess = lines[0].replace(/[#*\[\]]/g,'').trim();
            }
          }
          titleGuess = titleGuess.slice(0, 80);"""

new = """          // Extract clean title — try quoted string first, then first meaningful line
          var quotedMatch = oracleTxt.match(/[\u201c\u201d"]([^\u201c\u201d"]{10,80})[\u201c\u201d"]/);
          if (quotedMatch) {
            titleGuess = quotedMatch[1].trim().slice(0, 80);
          } else {
            var lines2 = oracleTxt.split('\\n').map(function(l){return l.replace(/[#*\[\]•\u2b50]/g,'').trim();}).filter(function(l){return l.length > 15 && l.length < 100;});
            if (lines2.length > 0) titleGuess = lines2[0].slice(0, 80);
          }"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: regex fixed, title extraction simplified")
else:
    print("ERROR: anchor not found")
    idx = src.find('Try to find a quoted')
    print("Found at:", idx)
