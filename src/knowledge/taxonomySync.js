
/* ===MODULE:taxonomySync=== */
RPGACE.register('taxonomySync', {
  domain: 'knowledge',

  // DOMAIN A — CRAFT (I–VIII): the making
  // DOMAIN B — KNOWLEDGE (IX–XII): what you learn
  // DOMAIN C — CONTENT (XIII–XV): what you make public
  // DOMAIN D — BUSINESS (XVI–XIX): how you earn
  // DOMAIN E — SYSTEMS (XX–XXI): infrastructure + overflow
  PHYLUM_MAP: [
    // DOMAIN A — CRAFT
    [1,  'Compositio',           'melody harmony chord progression scale mode song structure arrangement motif theme key signature time signature'],
    [2,  'Percussio',            'drum kick snare hi-hat 808 groove pattern percussion rhythm loop break clap trap drill percussion programming'],
    [3,  'Sonus Designatio',     'sound design synthesis synthesizer sampler sampling foley texture layer patch preset timbre oscillator wavetable fm am'],
    [4,  'Mixtura',              'mix mixing eq equaliser equalizer compression compressor sidechain saturation reverb delay stereo width pan balance level gain frequency spectrum masking'],
    [5,  'Magistra',             'master mastering lufs loudness limiter limiting stem streaming export final chain buss glue true peak'],
    [6,  'Instrumentarium',      'fl studio daw plugin vst instrument workflow midi controller keyboard pad launchpad template project channel rack mixer playlist'],
    [7,  'Sensus Auris',         'listening critical ear reference a/b compare analysis frequency spectrum monitor speaker headphone hearing training ear'],
    [8,  'Anatomia',             'theory interval mode scale degree triad seventh chord voice leading tension resolution counterpoint circle fifth cadence'],
    // DOMAIN B — KNOWLEDGE
    [9,  'Historia',             'producer history era golden boom bap trap drill afrobeats west coast south atlanta uk french russian influence inspiration legacy sample'],
    [10, 'Psychologia',          'psychology flow state creativity block procrastination identity mindset habit routine discipline motivation artist persona brand vision'],
    [11, 'Fons Educationis',     'learning method study skill spaced repetition retrieval practice active recall memory memorise note taking metacognition practice deliberate understanding'],
    [12, 'Lingua Musicae',       'colour palette visual music language scale colour map mood emotion tone aesthetic feel cinematic dark light warm cold'],
    // DOMAIN C — CONTENT
    [13, 'Visio Cinematica',     'filmmaker director visual treatment neural frames storyboard shot camera movement colour grade cinematography mood board brief video production'],
    [14, 'Contentum',            'youtube tutorial instagram reels shorts hook thumbnail title caption script content creator post video upload audience watch time retention algorithm'],
    [15, 'Collaboratio',         'collab collaboration outreach network community email cold pitch feature verse producer artist relationship contact connect'],
    // DOMAIN D — BUSINESS
    [16, 'Venditionis Beatorum', 'beat selling beatstars airbit price lease exclusive licence non-exclusive premium uk drill trap sell store catalogue listing'],
    [17, 'Negotium',             'contract publishing rights split work for hire copyright ownership royalty publishing deal sync licence agreement clause'],
    [18, 'Distributio',          'distribution distrokid routenote prs content id fingerprint streaming spotify apple tidal release upload distribute royalty collect'],
    [19, 'Referentia Mercati',   'trend market competitive analysis region gap opportunity niche demand search volume trend report intelligence competitor'],
    // DOMAIN E — SYSTEMS
    [20, 'Technologia',          'ai automation rpgace composio supabase vercel n8n pipeline workflow tool system api integration build deploy code script'],
    [21, 'Miscellaneous Ordinanda', 'misc unsorted uncategorised general note insight observation todo review'],
    // RC-0 (Oct 15 2026): 11-14 above re-matched to the Aug 11 numbering (this table had kept the old
    // order: 11 colour, 12 education, 13 content, 14 film); 22-29 added for the life realms.
    [22, 'Ars Culinaria',        'recipe cooking cook baking meal prep ingredient nutrition cuisine kitchen'],
    [23, 'Corpus Athleticum',    'workout gym strength training hypertrophy cardio running stretching protein recovery'],
    [24, 'Ars Vivendi',          'habit routine morning wellbeing self care sleep hygiene health'],
    [25, 'Cura Domus',           'cleaning laundry declutter diy home repair organising housework chores'],
    [26, 'Res Pecuniaria',       'budget budgeting saving savings investing pension debt personal finance'],
    [27, 'Peregrinatio',         'travel trip holiday city itinerary backpacking culture abroad'],
    [28, 'Mens Sana',            'meditation mindfulness anxiety stoicism journaling calm rest'],
    [29, 'Societas',             'friendship relationships family dating social skills communication'],
  ],

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 41 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 1 ui (_injectUI) / 6 logic (_detectPhylum,
  // _runSync, _syncBatch, updateGapScore, markApplied, getTopGaps).
  // `PHYLUM_MAP` stays a module-scope field, read by `logic._detectPhylum`.
  // `init` stays a literal top-level function.
  //
  // Real, load-bearing external touchpoints, confirmed by grep, not
  // assumed: `getTopGaps` is called directly via
  // `RPGACE.modules.taxonomySync.getTopGaps(...)` from 3 real real
  // sites (Bookworm's gap-widget badge, Morning Brief, and one more);
  // `markApplied` is called directly from 3 real sites (Beat Log's
  // artist-tagging flow, another). `updateGapScore` is called (guarded)
  // from Feynman after a study session. All preserved via the
  // pass-throughs below.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._injectUI(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectUI(); }, 400);
      }
    });
  },

  // ============================================================
  // ui — the one real DOM touch in this module: the "🌿 Sync Taxonomy"
  // button injected next to the encyclopedia sync control.
  // ============================================================
  ui: {

  _injectUI: function() {
    if (document.getElementById('tax-sync-btn')) return;
    var self = RPGACE.modules.taxonomySync;

    // Find the encyclopedia sync button area to inject near it
    var targets = [
      document.querySelector('[onclick*="syncAndPush"]'),
      document.querySelector('[onclick*="syncEncyclopedia"]'),
      document.querySelector('#sync-btn'),
    ];
    var anchor = targets.find(function(t) { return t; });
    if (!anchor) return;

    var btn = document.createElement('button');
    btn.id = 'tax-sync-btn'; btn.className = 'tax-dormant-hide';
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

  },

  // ============================================================
  // logic — business logic/data: taxonomy sync, phylum detection,
  // Supabase reads/writes. Zero DOM except _injectUI above.
  // ============================================================
  logic: {

  _detectPhylum: function(text) {
    var self = RPGACE.modules.taxonomySync;
    var t = (text || '').toLowerCase();
    var scores = self.PHYLUM_MAP.map(function(p) {
      var keywords = p[2].toLowerCase().split(/[\s,]+/);
      var score = keywords.reduce(function(acc, kw) {
        return acc + (kw.length > 3 && t.includes(kw) ? 1 : 0);
      }, 0);
      return { num: p[0], name: p[1], score: score };
    });
    scores.sort(function(a, b) { return b.score - a.score; });
    // F8: fallback default had num:10/name:'Technologia' - PHYLUM_MAP (above)
    // has 10 as Psychologia and 20 as Technologia, so any zero-score entry
    // landed with a self-contradictory {num, name} pair. Technologia is 20.
    return scores[0].score > 0 ? scores[0] : { num: 20, name: 'Technologia' };
  },

  _runSync: function() {
    var self = RPGACE.modules.taxonomySync;
    RPGACE.utils.toast('🌿 Fetching encyclopedia entries...', '#2ABFB0', 2000);

    RPGACE.sb.select('encyclopedia', 'order=created_at.desc&limit=50')
      .then(function(entries) {
        if (!entries || entries.length === 0) {
          RPGACE.utils.toast('No encyclopedia entries found.', '#CC4A4A', 3000);
          return;
        }

        // Check existing taxonomy nodes to avoid duplicates
        return RPGACE.sb.select('taxonomy_nodes', 'select=concept')
          .then(function(existing) {
            var existingConcepts = (existing || []).map(function(n) {
              return (n.concept || '').toLowerCase().trim();
            });

            // Deduplicate within the incoming batch too
            var seenTitles = {};
            var toSync = entries.filter(function(e) {
              var t = (e.title || '').toLowerCase().trim();
              if (existingConcepts.includes(t)) return false;
              if (seenTitles[t]) return false;
              seenTitles[t] = true;
              return true;
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
        RPGACE.utils.toast('Sync error: ' + err.message, '#CC4A4A', 4000);
        console.error('[taxonomySync] error:', err);
      });
  },

  _syncBatch: function(entries, idx, count) {
    var self = RPGACE.modules.taxonomySync;
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

    RPGACE.sb.secureWrite('taxonomy_nodes', 'insert', node)
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
        RPGACE.sb.secureWrite('taxonomy_nodes', 'update', {
          study_count: (rows[0].study_count || 0) + 1,
          gap_score: gapScore,
          last_studied_at: new Date().toISOString()
        }, 'id=eq.' + id);
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
        RPGACE.sb.secureWrite('taxonomy_nodes', 'update', { applied_in_beat: true }, 'id=eq.' + id);
      });
  },

  // Get top N nodes by gap score — used by agenda generator and Morning Brief
  getTopGaps: function(limit) {
    limit = limit || 5;
    // Aug 22 (real /Routine follow-up — headless-Chromium-reproduced the
    // exact "boot task failed: Cannot read properties of undefined
    // (reading 'select')" warning from Alex's own console, with a real
    // stack trace pinning it here): knowledgeGap._inject()'s boot task
    // calls this synchronously via _load(), and this module (taxonomySync)
    // registers before config in file order — config.init() is what sets
    // RPGACE.sb, so on every real boot this ran before RPGACE.sb existed
    // yet. Same real guard dashDeck._refreshGlance already uses for the
    // identical race, applied here once so every caller (not just the
    // boot-time one) is protected, per rule 8.
    if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve([]);
    return RPGACE.sb.select('taxonomy_nodes',
      'order=gap_score.desc&limit=' + limit + '&applied_in_beat=eq.false'
    );
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoints: `getTopGaps` and
  // `markApplied` are each called directly via
  // `RPGACE.modules.taxonomySync.<method>(...)` from 3 real sites
  // across the file; `updateGapScore` is called (guarded) from Feynman.
  // Also carries this module's own internal calls: `init`'s boot task
  // calls `self._injectUI()`, `ui._injectUI`'s button onclick calls
  // `self._runSync()`, and `logic._runSync`/`logic._syncBatch` reach
  // `self._detectPhylum()`/`self._syncBatch()` — every one of those
  // `self`s is the module, so each lands here first and is routed on to
  // the right namespace.
  _injectUI: function() { return this.ui._injectUI(); },
  _detectPhylum: function(text) { return this.logic._detectPhylum(text); },
  _runSync: function() { return this.logic._runSync(); },
  _syncBatch: function(entries, idx, count) { return this.logic._syncBatch(entries, idx, count); },
  updateGapScore: function(concept, score) { return this.logic.updateGapScore(concept, score); },
  markApplied: function(concept) { return this.logic.markApplied(concept); },
  getTopGaps: function(limit) { return this.logic.getTopGaps(limit); },

});
/* ===END:taxonomySync=== */
