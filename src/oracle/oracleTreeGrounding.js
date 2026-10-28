
/* ===MODULE:oracleTreeGrounding=== */
// July 19 — TOP PRIORITY per Alex ("yes and make top"): Oracle chat now
// READS the taxonomy tree, not just writes into it. Spec answers
// recorded verbatim in oracle_grounding_spec.txt: trigger = keyword
// match only (zero cost on unrelated chat), depth = leaf names +
// explainers only (never deep_content - stays far from the 504/length
// danger zone), gap behavior = say "not in your library yet" and offer
// to place it via Phylum Path (every gap becomes a learning prompt).
//
// Mechanism: a chainable wrap on window.callOracle (main.js global, the
// single funnel every Oracle surface uses) - NO main.js edit needed.
// Gated by persona marker so it fires ONLY for conversational surfaces
// (main chat's ORACLE_SYS, Prod Oracle's teaching persona) - never for
// JSON/placement/formatter calls, which have their own system prompts.
// Same _xPatched guard + fall-through convention as scheduleOracle's
// and bookworm's sendChat wraps.
RPGACE.register('oracleTreeGrounding', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 32 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // thirty-one predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL precedent, so the diff shows only
  // real changes rather than a whitespace wall.
  //
  // 4 real members: 3 functions and ONE declared data field,
  // `PERSONA_MARKERS` (checked by direct read of every top-level key,
  // not assumed). That field STAYS AT MODULE SCOPE and was not moved —
  // it is read only by `init`'s own `window.callOracle` wrapper, where
  // `self` genuinely IS the module, so the read is correct as-is and a
  // copy inside `ui`/`logic` would be a second, divergent marker list
  // rather than the one real one. A grep of the whole module body for
  // `self.X =` / `this.X =` returns no hits, so this module has none of
  // the undeclared runtime-assigned field trap journalQoL's
  // `_activeSource` and oracleDevBridge's `this.TABLE` both hit — the
  // one flag it does set, `window._treeGroundingPatched`, is a GLOBAL
  // (the standard wrap guard this codebase uses everywhere), not a
  // module field, and is untouched. `init` stays a literal top-level
  // function (RPGACE.register() calls `module.init()` directly and
  // cannot see into a sub-object) — byte-identical.
  //
  // This module splits 2 / 0: both movable functions land in `logic`,
  // and `ui` is genuinely EMPTY — kept as an explicit `ui: {}` so the
  // module still declares the same two-namespace shape as every
  // sibling. That is the honest answer here rather than a shortcut:
  // this module never touches the page at all. It sits entirely
  // between the chat input and the Anthropic API, wrapping
  // `window.callOracle` to append retrieved library context to the
  // SYSTEM PROMPT of a call someone else already initiated.
  // Classification, function by function, each checked against its
  // actual body rather than its name:
  //   • _buildGroundingBlock → logic. Zero DOM keywords, and zero DOM
  //     reached indirectly either: its one helper call,
  //     `RPGACE.utils._quickPhylaScan`, was read directly to confirm it
  //     is pure (a keyword/regex scoring loop over
  //     `_PHYLA_KEYWORDS` — it is the DOM-free HALF of that pair; its
  //     sibling `_runPhylaScan` is the one that reads `#chat-msgs` and
  //     writes badges, and is NOT called here). The rest is a Supabase
  //     `select`, a Supabase `rpc`, word-overlap scoring and
  //     reciprocal-rank fusion.
  //   • _gapOnlyBlock → logic. A single `return` of a fixed string
  //     constant. No branching, no DOM, no I/O.
  //
  // ─── The one thing worth stating plainly: strings ≠ markup ────────
  // Both functions RETURN a built string, and this pass's own standing
  // rule says a function that builds HTML markup counts as
  // constructing DOM. That rule does not reach these two, and the
  // distinction is real rather than a technicality: what they build is
  // PROMPT TEXT, not markup. There is no tag, no attribute and no
  // entity anywhere in either output — `_buildGroundingBlock` emits a
  // plain-text `'- ' + path + ' — ' + explainer` bullet list under a
  // `---` separator, and `_gapOnlyBlock` a single English sentence.
  // Neither string is ever assigned to `.innerHTML`, passed to
  // `insertAdjacentHTML` or handed to any element; the sole consumer
  // is `init`'s wrapper, which concatenates it onto the `system`
  // argument (`newArgs[1] = system + block`) of the outbound API call.
  // The markup rule exists to catch DOM construction wearing a string
  // disguise; this is the opposite case, and filing either function in
  // `ui` on the basis of "it builds a string" would be exactly the
  // shape-matching this pass's rules warn against.
  //
  // `this`/`self` accounting for both moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _buildGroundingBlock — already had `var self = this;` as its
  //     first statement, swapped for the module handle IN PLACE (it
  //     sits before the `_quickPhylaScan` guard, so control flow is
  //     unchanged). Captured by two separate nested `.then` callbacks
  //     for `self._gapOnlyBlock()` — the no-leaves-at-all branch and
  //     the empty-after-fusion branch. Left as `this.`, it would have
  //     read `logic._gapOnlyBlock` — which DOES exist on `logic`, so
  //     this one would have kept working by luck rather than by
  //     design; requalified anyway, per the standing rule that the
  //     module must never depend on two functions happening to share a
  //     namespace.
  //   • _gapOnlyBlock — references neither `this` nor `self`; moved
  //     byte-identical, no handle needed and none added.
  //
  // Zero external touchpoints confirmed by a fresh repo-wide grep for
  // `RPGACE.modules.oracleTreeGrounding.` (0 hits anywhere —
  // rpgace_core.js and index.html both), plus the dynamic-lookup
  // check: the only real `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field and is never named at any of its call sites. The module is
  // driven entirely by the `window.callOracle` wrapper `init` installs.
  // The two `"_buildGroundingBlock"` / `"_gapOnlyBlock"` entries in
  // this file's own METHOD_MODULE_MAP (G109) are a generated
  // name->module DATA table, not call sites, and are unaffected by
  // this split.
  //
  // Standing note preserved, unchanged by this split: this module is
  // ONE of the three real `window.callOracle` wrappers CLAUDE.md's own
  // landmine names (with oracleAppGrounding and oracleFetchGuard), and
  // its wrapper's `Array.prototype.slice.call(args)` full-argument
  // rebuild is the exact thing that landmine requires. Nothing in this
  // refactor touches `init`, so that guarantee is untouched.
  // ══════════════════════════════════════════════════════════════════

  PERSONA_MARKERS: ['You are the Oracle —', "You are Alex's personal 300IQ music production teacher"],

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.callOracle !== 'function' || window._treeGroundingPatched) return;
      window._treeGroundingPatched = true;
      var orig = window.callOracle;
      window.callOracle = function(messages, system, maxTokens) {
        var isConversational = typeof system === 'string' && self.PERSONA_MARKERS.some(function(m) { return system.indexOf(m) !== -1; });
        if (!isConversational || !messages || !messages.length) {
          return orig.apply(this, arguments);
        }
        var lastUser = null;
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') { lastUser = String(messages[i].content || ''); break; }
        }
        if (!lastUser) return orig.apply(this, arguments);
        var args = arguments;
        var callerThis = this;
        // Retrieval failure must NEVER break chat - fall through to the
        // original call with the original system prompt on any error.
        return self._buildGroundingBlock(lastUser).catch(function() { return ''; }).then(function(block) {
          if (block) {
            // July 28: was orig.call(callerThis, messages, system+block,
            // maxTokens) - a fixed 3-arg forward that silently dropped any
            // 4th+ argument (main.js's callOracle gained an optional
            // onChunk callback the same day for real streaming). Rebuild
            // the full args array instead so a matched grounding block
            // never silently reverts a streaming call to non-streaming.
            var newArgs = Array.prototype.slice.call(args);
            newArgs[1] = system + block;
            return orig.apply(callerThis, newArgs);
          }
          return orig.apply(callerThis, args);
        });
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // Keyword-match trigger: reuses the same phyla-keyword machinery the
  // auto-detect badge already uses. No match = empty block = the call
  // proceeds untouched, costing nothing.
  // ============================================================
  // logic — business logic/data: no DOM, and none reached
  // indirectly either. Keyword prefilter, taxonomy retrieval,
  // reciprocal-rank fusion, and the prompt-text block both branches
  // return. See the "strings ≠ markup" note in the G53 block above
  // for why building a returned string does not make either of
  // these `ui`.
  // ============================================================
  logic: {

  _buildGroundingBlock: function(userText) {
    var self = RPGACE.modules.oracleTreeGrounding;
    if (!RPGACE.utils._quickPhylaScan) return Promise.resolve('');
    var matches = RPGACE.utils._quickPhylaScan(userText);
    if (!matches.length) return Promise.resolve('');
    var phylaNums = matches.slice(0, 2).map(function(m) { return m.num; });
    return RPGACE.sb.select('taxonomy_tree',
      'phylum_number=in.(' + phylaNums.join(',') + ')&node_type=eq.leaf&select=name,path,explainer&limit=200'
    ).then(function(leaves) {
      leaves = leaves || [];
      if (!leaves.length) return self._gapOnlyBlock();
      // Rank leaves by word overlap with the question - crude but free,
      // and enough to pick the 6 most relevant out of a phylum's leaves.
      var qWords = userText.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 3; });
      var scored = leaves.map(function(l) {
        var hay = (l.name + ' ' + (l.explainer || '')).toLowerCase();
        var score = 0;
        qWords.forEach(function(w) { if (hay.indexOf(w) !== -1) score++; });
        return { leaf: l, score: score };
      }).sort(function(a, b) { return b.score - a.score; });
      var top = scored.filter(function(s) { return s.score > 0; }).slice(0, 6);
      // July 29 (/restructure finding 2): the word-overlap check above only
      // catches an exact substring match - "compression" never matches
      // "compressor," a typo, or a synonym. It stays as the FIRST, free
      // pass since it's cheap and already works for exact matches; a real
      // trigram-similarity RPC (search_taxonomy_leaves, pg_trgm - available
      // in this project but unused until today) now runs ALONGSIDE it and
      // the two result sets are merged, so a near-miss the word-overlap
      // check would silently drop still surfaces. Fails open to the
      // word-overlap result alone on any RPC error - never blocks the
      // grounding block over a DB hiccup.
      return RPGACE.sb.rpc('search_taxonomy_leaves', { q: userText, phyla: phylaNums })
        .catch(function() { return []; })
        .then(function(trgmRows) {
          // Aug 4 (/restructure finding, Council-of-5 confirmed): the old
          // merge just appended trigram hits after every keyword hit,
          // threshold-filtered - a strong trigram match (a real synonym or
          // typo-fix) could never outrank a weak keyword match, it could
          // only ever fill remaining slots. Replaced with real reciprocal-
          // rank fusion (k=60, the standard RRF constant): each leaf's
          // score is the sum of 1/(k+rank) across whichever of the two
          // ranked lists it appears in, so a leaf both lists agree on
          // ranks above one only one list found, and a top trigram match
          // can genuinely outrank a middling keyword match. Same fails-
          // open behavior: an empty/errored trgmRows just means every
          // leaf's score comes from the keyword list alone.
          var RRF_K = 60;
          var byPath = {};
          top.forEach(function(s, i) {
            var p = s.leaf.path;
            byPath[p] = { leaf: s.leaf, rrf: 1 / (RRF_K + i + 1) };
          });
          (trgmRows || []).filter(function(row) { return row.score > 0.15; })
            .forEach(function(row, i) {
              var contribution = 1 / (RRF_K + i + 1);
              if (byPath[row.path]) { byPath[row.path].rrf += contribution; }
              else { byPath[row.path] = { leaf: row, rrf: contribution }; }
            });
          var merged = Object.keys(byPath).map(function(p) { return byPath[p]; })
            .sort(function(a, b) { return b.rrf - a.rrf; })
            .slice(0, 8);
          if (!merged.length) return self._gapOnlyBlock();
          var lines = merged.map(function(s) {
            return '- ' + s.leaf.path + (s.leaf.explainer ? ' — ' + s.leaf.explainer : '');
          }).join('\n');
          return '\n\n---\nALEX\'S OWN KNOWLEDGE LIBRARY (real, personally gathered insights from the RPGACE taxonomy tree relevant to this message):\n' + lines + '\n' +
            'Ground your answer in these first - reference them by name so Alex sees his own library working - then add general knowledge on top. ' +
            'If the specific thing asked about is NOT covered by the entries above, say briefly that it isn\'t in his RPGACE library yet and offer to place it via Phylum Path so it gets learned properly.';
        });
    });
  },

  // The matched phylum has no relevant leaves at all - still worth
  // telling Oracle, per the confirmed gap behavior: the honest "not in
  // your library yet" + offer to learn is the answer, not silence.
  _gapOnlyBlock: function() {
    return '\n\n---\nNOTE: this message matches topics in RPGACE\'s taxonomy, but no gathered insight in Alex\'s own knowledge library covers it yet. Answer from general knowledge, but say briefly that this isn\'t in his RPGACE library yet and offer to place it via Phylum Path so it gets learned properly.';
  },

  },

  // ============================================================
  // ui — genuinely empty. This module sits entirely between the chat
  // input and the Anthropic API; it discovers, constructs, reads and
  // mutates zero DOM nodes. Kept as an explicit empty object so the
  // module still declares the same two-namespace shape as every
  // sibling.
  // ============================================================
  ui: {},

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.oracleTreeGrounding` anywhere outside this
  // module's own body), so these exist for convention and for its OWN
  // internal calls: `init`'s `window.callOracle` wrapper calls
  // `self._buildGroundingBlock(lastUser)` on every conversational
  // Oracle call, and `logic._buildGroundingBlock` itself reaches
  // `self._gapOnlyBlock()` from two separate branches — every one of
  // those `self`s is the module, so each lands here first and is routed
  // on to `logic`.
  _buildGroundingBlock: function(userText) { return this.logic._buildGroundingBlock(userText); },
  _gapOnlyBlock: function() { return this.logic._gapOnlyBlock(); },

});
/* ===END:oracleTreeGrounding=== */
