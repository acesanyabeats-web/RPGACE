src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """            var proposeBtn = document.createElement('button');
            proposeBtn.textContent = '🌳 Propose lineage';
            proposeBtn.style.cssText = 'padding:2px 8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:10px;color:#9B59B6;font-size:9px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
            proposeBtn.onclick = function() {
              if (RPGACE.modules.taxonomyTree) {
                // Extract a reasonable topic snippet from the response text for this phylum's context
                var topicGuess = text.slice(0, 300);
                RPGACE.modules.taxonomyTree.proposeLineage(topicGuess, m.num, 'oracle', null);
              }
            };
            topLine.appendChild(proposeBtn);"""

new = """            // Pre-filter: only show the propose button if this phylum's own
            // keyword set genuinely overlaps the text — costs zero API calls,
            // prevents generating mismatch notices for implausible phyla.
            var plausible = RPGACE.modules.taxonomyTree
              ? RPGACE.modules.taxonomyTree.isPlausiblePhylum(text, m.num)
              : true;

            if (plausible) {
              var proposeBtn = document.createElement('button');
              proposeBtn.textContent = '🌳 Propose lineage';
              proposeBtn.style.cssText = 'padding:2px 8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:10px;color:#9B59B6;font-size:9px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
              proposeBtn.onclick = function() {
                if (RPGACE.modules.taxonomyTree) {
                  var topicGuess = text.slice(0, 300);
                  RPGACE.modules.taxonomyTree.proposeLineage(topicGuess, m.num, 'oracle', null);
                }
              };
              topLine.appendChild(proposeBtn);
            }"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: propose button hidden for implausible phyla, saves API calls")
else:
    print("ERROR: anchor not found")
