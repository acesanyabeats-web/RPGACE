src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """          // Phylum 12 (Fons Educationis) and 13 (Contentum) auto-confirm for any content idea
          if (p.num === 12 || p.num === 13) {
            confirmed.push(p);
          } else if (hits >= 2) {"""

new = """          // Phylum 12 (Fons Educationis) auto-confirm only when idea is about teaching/tutorials
          var isContentIdea = text.includes('tutorial') || text.includes('teach') || text.includes('explain') ||
            text.includes('learn') || text.includes('how to') || text.includes('guide') || text.includes('tip') ||
            text.includes('youtube') || text.includes('reel') || text.includes('video') || text.includes('content');
          // Phylum 13 (Contentum) auto-confirm only when idea is about posting/social media
          var isSocialIdea = text.includes('instagram') || text.includes('tiktok') || text.includes('youtube') ||
            text.includes('reel') || text.includes('caption') || text.includes('hook') || text.includes('content') ||
            text.includes('post') || text.includes('platform') || text.includes('audience');
          if ((p.num === 12 && isContentIdea) || (p.num === 13 && isSocialIdea)) {
            confirmed.push(p);
          } else if (hits >= 2) {"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: Phylum 12+13 auto-confirm is now context-aware")
else:
    print("ERROR: anchor not found")
