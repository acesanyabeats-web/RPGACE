src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Fix 1: Better title extraction from Oracle contribution
old1 = """          var titleGuess = oracleTxt.slice(0, 60).replace(/[^a-zA-Z0-9\s]/g,'').trim() || 'Content Idea';"""

new1 = """          // Extract clean title from Oracle contribution
          var titleGuess = 'Content Idea';
          // Try to find a quoted idea title first e.g. "Why your beats sound quiet"
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

# Fix 2: Auto-confirm Phylum 12 (Fons Educationis) for content/tutorial ideas
old2 = """        allPhyla.forEach(function(p) {
          var hits = p.keywords.filter(function(k) { return text.includes(k); }).length;
          if (hits >= 2) confirmed.push(p);
          else if (hits === 1) suggested.push(p);
        });"""

new2 = """        allPhyla.forEach(function(p) {
          var hits = p.keywords.filter(function(k) { return text.includes(k); }).length;
          // Phylum 12 (Fons Educationis) and 13 (Contentum) auto-confirm for any content idea
          if (p.num === 12 || p.num === 13) {
            confirmed.push(p);
          } else if (hits >= 2) {
            confirmed.push(p);
          } else if (hits === 1) {
            suggested.push(p);
          }
        });

        // Deduplicate by phylum number across confirmed and suggested
        var seenNums = {};
        confirmed = confirmed.filter(function(p) {
          if (seenNums[p.num]) return false;
          seenNums[p.num] = true;
          return true;
        });
        suggested = suggested.filter(function(p) { return !seenNums[p.num]; });"""

count = 0
if old1 in src:
    src = src.replace(old1, new1, 1)
    count += 1
if old2 in src:
    src = src.replace(old2, new2, 1)
    count += 1

open('rpgace_core.js', 'w', encoding='utf-8').write(src)
print("PATCHED:", count, "fixes applied")
