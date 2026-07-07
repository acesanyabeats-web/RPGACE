/* ===MODULE:taxonomySync=== */
RPGACE.register('taxonomySync', {

  PHYLUM_MAP: [
    [1,  'Compositio',          'Melody, harmony, chord progressions, scales, song structure'],
    [2,  'Percussio',           'Drum programming, groove, 808 design, hi-hat patterns, UK drill rhythms'],
    [3,  'Sonus Designatio',    'Sound design, synthesis, sampling, foley, textural layers'],
    [4,  'Mixtura',             'Mixing: EQ, compression, saturation, sidechain, spatial placement'],
    [5,  'Magistra',            'Mastering: LUFS targets, limiting, stem mastering, streaming loudness'],
    [6,  'Instrumentarium',     'FL Studio, VSTs, hardware controllers, DAW workflow efficiency'],
    [7,  'Negotium',            'Licensing, contracts, publishing splits, work-for-hire clauses'],
    [8,  'Historia',            'Producer history corpus — Golden Era through UK, French rap, Russian trap'],
    [9,  'Psychologia',         'Creative psychology, flow state, anti-procrastination, artist identity'],
    [10, 'Technologia',         'AI tools, automation, content intelligence, production tech stack'],
    [11, 'Lingua Musicae',      'Scale to colour palette map, visual language of music theory'],
    [12, 'Contentum',           'YouTube tutorials, Instagram Reels, hooks, thumbnails, titles, scripts'],
    [13, 'Collaboratio',        'A&R outreach, collab strategy, community building, cold email'],
    [14, 'Sensus Auris',        'Critical listening, reference track analysis, A/B comparison'],
    [15, 'Anatomia',            'Music theory fundamentals: intervals, modes, voice leading, tension'],
    [16, 'Venditionis Beatorum','Beat selling: Beatstars, pricing, lease vs exclusive, UK regional advantages'],
    [17, 'Fons Educationis',    'Source database: artists and YouTube educators per node'],
    [18, 'Referentia Mercati',  'Trend intelligence, competitive analysis, regional market gaps'],
    [25, 'Visio Cinematica',    'Filmmaker library, Neural Frames briefs, colour grading, camera grammar'],
  ],

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectUI(); }, 800);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectUI(); }, 400);
      }
    });
  },

  _injectUI: function() {
    if (document.getElementById('tax-sync-btn')) return;
    var self = this;

    // Find the encyclopedia sync button area to inject near it
    var targets = [
      document.querySelector('[onclick*="syncAndPush"]'),
      document.querySelector('[onclick*="syncEncyclopedia"]'),
      document.querySelector('#sync-btn'),
    ];
    var anchor = targets.find(function(t) { return t; });
    if (!anchor) return;

    var btn = document.createElement('button');
    btn.id = 'tax-sync-btn';
    btn.textContent = '🌿 Sync Taxonomy';
    btn.title = 'Push encyclopedia entries to taxonomy_nodes';
    btn.style.cssText = anchor.style.cssText || '';
    btn.style.marginLeft = '8px';
    btn.style.borderColor = 'rgba(42,191,176,0.4)';
    btn.style.color = '#2ABFB0';
    btn.style.background = 'rgba(42,191,176,0.08)';
    btn.className = anchor.className || '';
    btn.onclick = function() { self._runSync(); };
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);

    console.log('[RPGACE:taxonomySync] Button injected');
  },

  _detectPhylum: function(text) {
    var t = (text || '').toLowerCase();
    var scores = this.PHYLUM_MAP.map(function(p) {
      var keywords = p[2].toLowerCase().split(/[\s,]+/);
      var score = keywords.reduce(function(acc, kw) {
        return acc + (kw.length > 3 && t.includes(kw) ? 1 : 0);
      }, 0);
      return { num: p[0], name: p[1], score: score };
    });
    scores.sort(function(a, b) { return b.score - a.score; });
    return scores[0].score > 0 ? scores[0] : { num: 10, name: 'Technologia' };
  },

  _runSync: function() {
    var self = this;
    RPGACE.utils.toast('🌿 Fetching encyclopedia entries...', '#2ABFB0', 2000);

    RPGACE.sb.select('encyclopedia', 'order=created_at.desc&limit=50')
      .then(function(entries) {
        if (!entries || entries.length === 0) {
          RPGACE.utils.toast('No encyclopedia entries found.', '#E25454', 3000);
          return;
        }

        // Check existing taxonomy nodes to avoid duplicates
        return RPGACE.sb.select('taxonomy_nodes', 'select=concept')
          .then(function(existing) {
            var existingConcepts = (existing || []).map(function(n) {
              return (n.concept || '').toLowerCase().trim();
            });

            var toSync = entries.filter(function(e) {
              return !existingConcepts.includes((e.title || '').toLowerCase().trim());
            });

            if (toSync.length === 0) {
              RPGACE.utils.toast('All entries already in taxonomy.', '#2ABFB0', 3000);
              return;
            }

            RPGACE.utils.toast('🌿 Syncing ' + toSync.length + ' new entries...', '#2ABFB0', 2000);
            return self._syncBatch(toSync, 0, 0);
          });
      })
      .catch(function(err) {
        RPGACE.utils.toast('Sync error: ' + err.message, '#E25454', 4000);
        console.error('[taxonomySync] error:', err);
      });
  },

  _syncBatch: function(entries, idx, count) {
    var self = this;
    if (idx >= entries.length) {
      RPGACE.utils.toast('✅ Taxonomy sync complete — ' + count + ' nodes added', '#2ABFB0', 4000);
      return;
    }

    var entry = entries[idx];
    var phylum = self._detectPhylum((entry.title || '') + ' ' + (entry.content || ''));
    var contentPreview = (entry.content || '').slice(0, 400);

    var node = {
      concept: entry.title || 'Untitled',
      phylum_number: phylum.num,
      phylum_name: phylum.name,
      definition: contentPreview,
      source: 'encyclopedia_sync',
      study_count: 0,
      gap_score: 5.0,
      applied_in_beat: false,
    };

    RPGACE.sb.insert('taxonomy_nodes', node)
      .then(function() {
        // Stagger requests to avoid Supabase rate limits
        setTimeout(function() {
          self._syncBatch(entries, idx + 1, count + 1);
        }, 150);
      })
      .catch(function(err) {
        console.warn('[taxonomySync] skipped "' + entry.title + '":', err.message);
        setTimeout(function() {
          self._syncBatch(entries, idx + 1, count);
        }, 150);
      });
  },

  // Called by Feynman after a session to update gap_score
  updateGapScore: function(concept, score) {
    var gapScore = Math.max(0, 10 - score);
    RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(concept) + '&limit=1')
      .then(function(rows) {
        if (!rows || rows.length === 0) return;
        var id = rows[0].id;
        fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_nodes?id=eq.' + id, {
          method: 'PATCH',
          headers: {
            'apikey': RPGACE.CONFIG.supabase.key,
            'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            study_count: (rows[0].study_count || 0) + 1,
            gap_score: gapScore,
            last_studied_at: new Date().toISOString()
          })
        });
      })
      .catch(function(err) {
        console.warn('[taxonomySync] updateGapScore error:', err.message);
      });
  },

  // Called by Beat Log when nodes are tagged
  markApplied: function(concept) {
    RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(concept) + '&limit=1')
      .then(function(rows) {
        if (!rows || rows.length === 0) return;
        var id = rows[0].id;
        fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_nodes?id=eq.' + id, {
          method: 'PATCH',
          headers: {
            'apikey': RPGACE.CONFIG.supabase.key,
            'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ applied_in_beat: true })
        });
      });
  },

  // Get top N nodes by gap score — used by agenda generator and Morning Brief
  getTopGaps: function(limit) {
    limit = limit || 5;
    return RPGACE.sb.select('taxonomy_nodes',
      'order=gap_score.desc&limit=' + limit + '&applied_in_beat=eq.false'
    );
  },

});
/* ===END:taxonomySync=== */
