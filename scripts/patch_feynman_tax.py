src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _updateTaxonomyNode: function(concept, score) {
    if (!window.sb) return;
    window.sb
      .from('taxonomy_nodes')
      .select('id,study_count,genus')
      .ilike('genus', '%' + concept + '%')
      .limit(1)
      .then(function(res) {
        if (!res.data || !res.data.length) return;
        var node = res.data[0];
        var updates = {
          study_count:     (node.study_count || 0) + 1,
          last_studied_at: new Date().toISOString(),
        };
        if (score >= 8) updates.applied_in_beat = true;
        window.sb.from('taxonomy_nodes').update(updates).eq('id', node.id).then(function() {
          console.log('[feynman] Taxonomy node updated:', concept, 'score:', score);
        });
      })
      .catch(function(e) { console.warn('[feynman] Taxonomy update failed:', e.message); });
  },"""

new = """  _updateTaxonomyNode: function(concept, score) {
    // Route through taxonomySync module which uses RPGACE.sb helpers and correct schema
    if (RPGACE.modules.taxonomySync && typeof RPGACE.modules.taxonomySync.updateGapScore === 'function') {
      RPGACE.modules.taxonomySync.updateGapScore(concept, score);
      console.log('[feynman] Taxonomy gap score updated via taxonomySync:', concept, 'score:', score);
    } else {
      console.warn('[feynman] taxonomySync not available — gap score not updated');
    }
  },"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: Feynman _updateTaxonomyNode now routes through taxonomySync.updateGapScore")
else:
    print("ERROR: anchor not found in rpgace_core.js")
