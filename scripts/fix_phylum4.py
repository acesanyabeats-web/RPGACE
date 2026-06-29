src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    allPhyla.forEach(function(p) {
      var hits = p.keywords.filter(function(k) { return text.includes(k); }).length;
      if (hits >= 2) confirmed.push(p);
      else if (hits === 1) suggested.push(p);
    });

    // Also pull high gap-score nodes to suggest"""

new = """    var isContentIdea = text.includes('tutorial') || text.includes('teach') || text.includes('how to') ||
      text.includes('tip') || text.includes('reel') || text.includes('video') || text.includes('content') ||
      text.includes('learn') || text.includes('explain') || text.includes('guide') || text.includes('youtube');
    var isSocialIdea = text.includes('instagram') || text.includes('tiktok') || text.includes('reel') ||
      text.includes('caption') || text.includes('hook') || text.includes('post') || text.includes('platform');

    allPhyla.forEach(function(p) {
      var hits = p.keywords.filter(function(k) { return text.includes(k); }).length;
      if ((p.num === 12 && isContentIdea) || (p.num === 13 && isSocialIdea)) {
        confirmed.push(p);
      } else if (hits >= 2) {
        confirmed.push(p);
      } else if (hits === 1) {
        suggested.push(p);
      }
    });

    // Deduplicate by phylum number
    var seenNums = {};
    confirmed = confirmed.filter(function(p) { if (seenNums[p.num]) return false; seenNums[p.num]=true; return true; });
    suggested = suggested.filter(function(p) { return !seenNums[p.num]; });

    // Also pull high gap-score nodes to suggest"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: context-aware Phylum 12+13, deduplication added")
else:
    print("ERROR: anchor not found")
