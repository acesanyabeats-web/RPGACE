src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """            if (plausible) {
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

new = """            if (plausible) {
              var proposeBtn = document.createElement('button');
              proposeBtn.textContent = '🌳 Propose lineage';
              proposeBtn.style.cssText = 'padding:2px 8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:10px;color:#9B59B6;font-size:9px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
              proposeBtn.onclick = function() {
                if (!RPGACE.modules.taxonomyTree) return;
                var tt = RPGACE.modules.taxonomyTree;
                // Try to extract Oracle's own named nodes first — use those
                // instead of a vague blob slice if the response actually wrote them out
                var namedTopics = tt.extractNamedTopics ? tt.extractNamedTopics(text, m.num) : [];
                if (namedTopics.length >= 2) {
                  tt._showNamedTopicPicker(namedTopics, m.num);
                } else {
                  var topicGuess = text.slice(0, 300);
                  tt.proposeLineage(topicGuess, m.num, 'oracle', null);
                }
              };
              topLine.appendChild(proposeBtn);
            }"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: propose button uses named-topic extraction when available")
else:
    print("ERROR: anchor not found")
