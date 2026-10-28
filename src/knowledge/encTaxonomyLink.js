
/* ===MODULE:encTaxonomyLink=== */
// F7: per-entry "🌳 Propose to Taxonomy" button on Encyclopedia cards. Per
// the interconnection map's spec this is a second, manual entry point into
// the SAME taxonomy_proposals queue F4/F5 feed silently - not a fresh
// popup, not a direct taxonomy_tree write. main.js re-renders the whole
// #enc-output list on every sort/filter/refresh (window.renderEncEntries),
// so buttons are injected by wrapping that function rather than a one-time
// pass - a MutationObserver would fight the innerHTML replace on every call.
RPGACE.register('encTaxonomyLink', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the TWENTIETH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete, feynman, taxonomyReviewQueue, youtubeOracle,
  // tiktokOracle, instaOraclePanel, jargonEncyclopedia, encyclopediaQoL,
  // pathRouter, oracleDevBridge and quickActions): split into two
  // internal namespaces, `ui` (rendering/DOM) and `logic` (business
  // logic/data), following the exact shape those nineteen already
  // shipped and verified. Pure internal-structure refactor — zero
  // functional, behavioural, UX, data or schema change; every function
  // below was MOVED wholesale, never rewritten and never split down the
  // middle.
  //
  // 4 real members, all functions, no data fields at all (checked by
  // direct read of every top-level key, not assumed from the shape).
  // `init` stays a literal top-level function (RPGACE.register() calls
  // `module.init()` directly and cannot see into a sub-object) —
  // byte-identical, its own `self = this` genuinely IS the module, so
  // the `window.renderEncEntries` wrapper it installs still reaches
  // `self._injectButtons()` through the top-level pass-through below.
  //
  // This module splits 1 / 2: one function in `logic`, two in `ui`.
  // Classification, function by function, each checked against its
  // actual body rather than its name:
  //   • _injectButtons → ui. SEE THE INSEPARABILITY NOTE BELOW — it
  //     runs a real Supabase read, so it is named here rather than
  //     filed quietly.
  //   • _injectOne → ui. Unambiguous on the primary rule and the
  //     heaviest DOM function in the module: `div.dataset` guard
  //     writes, `getAttribute`, `closest`, `querySelector`,
  //     `document.createElement` ×3 and `insertAdjacentElement` /
  //     `appendChild` on all three of its mutually-exclusive render
  //     branches (already-linked label, pending label, live button).
  //   • _propose → logic. SEE THE DEDICATED NOTE BELOW — this was the
  //     one genuinely open call in this module.
  //
  // ─── _injectButtons: why its Supabase read stays in `ui` ──────────
  // It opens with `document.querySelectorAll('#enc-output
  // [data-entry-id]')`, so it DISCOVERS DOM and qualifies for `ui` on
  // the primary rule outright. The read that follows
  // (`RPGACE.sb.select('taxonomy_proposals', …)`) is genuinely NOT
  // separable into `logic` without splitting the function down the
  // middle, which this pass's own rules forbid: both the `.then` AND
  // the `.catch` do nothing but loop the SAME `contentDivs` NodeList —
  // captured before the query was ever issued — into
  // `self._injectOne(...)`. The query result is not returned, not
  // stored and not reused; its only consumer is the DOM injection this
  // function was already committed to performing. That is the exact
  // shape jargonEncyclopedia.ui._openGlossary was shipped on ("the
  // query's `.then` immediately renders into the DOM nodes the same
  // function just created"), applied here to nodes it just discovered
  // rather than created — the same inseparability either way. The one
  // real behavioural consequence, stated because it is a design choice
  // and not an accident: the `.catch` injects with an EMPTY
  // `pendingIds` map, so a failed query degrades to showing a live
  // "Propose" button on an entry that already has a pending proposal,
  // rather than showing nothing at all.
  //
  // ─── _propose: the open call, both readings stated ────────────────
  // Two real, defensible readings existed:
  //   (a) `ui` — it mutates a DOM element's properties in four places
  //       (`btn.disabled`, `btn.textContent` ×3, `btn.style.opacity`)
  //       across the optimistic pre-write state, the success `.then`
  //       and the failure `.catch`, and its two early-return guards
  //       both surface a real `RPGACE.utils.toast(...)` to the user.
  //   (b) `logic` — its DOMINANT RESPONSIBILITY is data: it builds the
  //       title+content blob, runs the free `RPGACE.utils.
  //       _quickPhylaScan(blob)` keyword prefilter, and on a real match
  //       drives `RPGACE.modules.taxonomyTree.silentPropose(...)`,
  //       which mints an actual `taxonomy_proposals` row. It DISCOVERS
  //       and CONSTRUCTS zero DOM: `btn` arrives as a caller-supplied
  //       handle from `ui._injectOne`, and there is no `document.*` /
  //       `createElement` / `querySelector` / `innerHTML` anywhere in
  //       the body. The button writes are success/failure FEEDBACK on
  //       that handle; the toasts are explicitly NOT a `ui` signal per
  //       the standing rule this series has used since the phylumPath
  //       pilot (a function that merely TRIGGERS a UI action without
  //       constructing DOM of its own is logic).
  // (b) was chosen. It is worth being precise that this is not a fresh
  // judgment: `_propose` is near-identical in shape to
  // videoSummary.logic._runRetro, which was already shipped as `logic`
  // on exactly this reasoning — same `btn.disabled`/`btn.textContent`
  // spinner-state mutation on a handed-in element, and the same real
  // job of driving a sequential `taxonomyTree.silentPropose` chain.
  //
  // ─── do _propose and oracleDevBridge._flag land the same way? ─────
  // Yes — and that is a real, checked conclusion, not reasoning copied
  // across because the two rhyme. Both were read independently and
  // both were tested against the SAME discriminator, which is the one
  // that already separates the shipped precedents: for a function that
  // mutates a caller-supplied element and constructs nothing, does it
  // have a real DATA job? videoSummary.logic._runRetro and
  // contentProductionLive.logic._generateBundle answered yes and are
  // `logic`; intelDelete.ui._hideCard answered NO — a 180ms opacity
  // fade is 100% presentation with no data half at all — and is `ui`.
  // `_flag`'s data half is a truncation decision plus a
  // `secureWrite` insert; `_propose`'s is a keyword prefilter plus a
  // `silentPropose` call that writes a real proposal row. Both answer
  // yes, on their own evidence, so both land in `logic`. If either had
  // been a bare "grey the button out" with no write behind it, it
  // would have gone to `ui` like `_hideCard` — the rule, not the
  // resemblance, is what put them together.
  //
  // `this`/`self` accounting for all 3 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _injectButtons — already had `var self = this;`, that one line
  //     swapped for the module handle IN PLACE so statement order is
  //     unchanged. It is captured by both the `.then` and the `.catch`
  //     closures, which call `self._injectOne(...)`. Left as `this.`,
  //     it would have read `ui._injectOne` — which DOES exist on `ui`,
  //     so this one would have kept working by luck rather than by
  //     design; requalified anyway so the module never depends on two
  //     functions happening to share a namespace.
  //   • _injectOne — same treatment, same in-place swap. THIS IS THE
  //     ONE THAT GENUINELY WOULD HAVE BROKEN: its `btn.onclick` closure
  //     calls `self._propose(entry, btn)`, and `_propose` lives in
  //     `logic`, so `this._propose` inside `ui` is `undefined`. The
  //     failure mode is nasty precisely because it is not a load-time
  //     error: the buttons would inject and render perfectly, and only
  //     throw a TypeError at the moment Alex actually clicked one, with
  //     no toast and no visible feedback at all.
  //   • _propose — references neither `this` nor `self` (its cross-
  //     module call to `RPGACE.modules.taxonomyTree.silentPropose` was
  //     already fully qualified); moved byte-identical, no handle
  //     needed and none added.
  //
  // ui -> logic cross-namespace calls are therefore normal in this
  // module (ui._injectOne -> logic._propose), exactly as in intelDelete
  // and videoSummary before it. That call goes through the top-level
  // pass-through via `self._propose`, never `this.logic._propose`
  // directly, so no call site inside the module had to change.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.renderEncEntries !== 'function' || window._encTaxLinkPatched) return;
      window._encTaxLinkPatched = true;
      var orig = window.renderEncEntries;
      window.renderEncEntries = function() {
        var result = orig.apply(this, arguments);
        setTimeout(function() { self._injectButtons(); }, 50);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // ============================================================
  // logic — business logic/data: no DOM construction or discovery.
  // The one function here runs the free keyword prefilter and drives
  // the real taxonomy_proposals write (see the dedicated _propose note
  // in the G53 block above for why it lands here despite writing to a
  // caller-supplied button).
  // ============================================================
  logic: {

    _propose: function(entry, btn) {
      if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) {
        RPGACE.utils.toast('Taxonomy system not ready yet — try again in a moment', '#CC4A4A', 2500);
        return;
      }
      var blob = (entry.title || '') + ' ' + (entry.content || '');
      var matches = RPGACE.utils._quickPhylaScan(blob);
      if (matches.length === 0) {
        RPGACE.utils.toast('No clear phylum match for this entry — try "🌳 Add to Taxonomy Tree" on the Research tab instead', '#CC4A4A', 3500);
        return;
      }

      btn.disabled = true;
      btn.textContent = '🌳 Generating proposal...';
      var entryId = entry.id || entry.created_at;

      RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'encyclopedia', entryId)
        .then(function() {
          btn.textContent = '✓ Queued for review';
          btn.style.opacity = '0.6';
          RPGACE.utils.toast('🌳 Queued — review it from the Dashboard', 'rgba(155,89,182,0.85)', 3000);
        })
        .catch(function(err) {
          btn.disabled = false;
          btn.textContent = '🌳 Propose to Taxonomy';
          RPGACE.utils.toast('Error generating proposal: ' + err.message, '#CC4A4A', 3500);
        });
    },

  },

  // ============================================================
  // ui — rendering/DOM. The batch injection pass over every rendered
  // Encyclopedia card, and the per-card renderer that decides between
  // the three mutually-exclusive states (already linked / proposal
  // pending / a live Propose button).
  // ============================================================
  ui: {

    _injectButtons: function() {
      var self = RPGACE.modules.encTaxonomyLink;
      var contentDivs = document.querySelectorAll('#enc-output [data-entry-id]');
      if (contentDivs.length === 0) return;

      // One batch query for which entries already have a pending proposal,
      // instead of one query per card - RPGACE.sb.select already caches for
      // 60s so repeated re-renders (sort/filter clicks) don't refetch.
      RPGACE.sb.select('taxonomy_proposals', 'source_type=eq.encyclopedia&status=eq.pending&select=source_id')
        .then(function(pending) {
          var pendingIds = {};
          (pending || []).forEach(function(p) { if (p.source_id) pendingIds[p.source_id] = true; });
          contentDivs.forEach(function(div) { self._injectOne(div, pendingIds); });
        })
        .catch(function() {
          contentDivs.forEach(function(div) { self._injectOne(div, {}); });
        });
    },

    _injectOne: function(div, pendingIds) {
      var self = RPGACE.modules.encTaxonomyLink;
      if (div.dataset.taxLinkInjected) return;
      div.dataset.taxLinkInjected = '1';

      var id = div.getAttribute('data-entry-id');
      var entry = (window.ENC_ALL_ENTRIES || []).find(function(e) { return String(e.id || e.created_at) === String(id); });
      if (!entry) return;

      var expandedContainer = div.closest('[id^="enc-expanded-"]');
      if (!expandedContainer) return;
      var collapseBtn = expandedContainer.querySelector('button[onclick^="collapseEncEntry"]');
      var anchor = collapseBtn || null;

      if (entry.taxonomy_node_id) {
        var linked = document.createElement('span');
        linked.style.cssText = 'display:inline-block;margin-top:10px;margin-right:8px;padding:4px 10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:5px;color:#4CAF82;font-size:11px;font-family:Rajdhani,sans-serif;';
        linked.textContent = '🌳 Linked to Taxonomy Tree';
        if (anchor) anchor.insertAdjacentElement('beforebegin', linked); else expandedContainer.appendChild(linked);
        return;
      }

      if (pendingIds[id]) {
        var pendingLabel = document.createElement('span');
        pendingLabel.style.cssText = 'display:inline-block;margin-top:10px;margin-right:8px;padding:4px 10px;background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.2);border-radius:5px;color:rgba(155,89,182,0.7);font-size:11px;font-family:Rajdhani,sans-serif;';
        pendingLabel.textContent = '⏳ Proposal pending review';
        if (anchor) anchor.insertAdjacentElement('beforebegin', pendingLabel); else expandedContainer.appendChild(pendingLabel);
        return;
      }

      var btn = document.createElement('button');
      btn.className = 'tax-dormant-hide'; // KR-4: hidden while the tree is empty
      btn.textContent = '🌳 Propose to Taxonomy';
      btn.style.cssText = 'background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);color:#9B6EC8;border-radius:5px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-top:10px;margin-right:8px;';
      btn.onclick = function() { self._propose(entry, btn); };
      if (anchor) anchor.insertAdjacentElement('beforebegin', btn); else expandedContainer.appendChild(btn);
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of the whole repo for `RPGACE.modules.encTaxonomyLink.` and
  // of index.html both — zero hits outside this module's own body; the
  // module is driven entirely by the `window.renderEncEntries` wrapper
  // that `init` installs). These exist for convention and for its OWN
  // internal calls: `init`'s wrapper calls `self._injectButtons()`,
  // `ui._injectButtons` calls `self._injectOne(...)` from both its
  // `.then` and its `.catch`, and `ui._injectOne`'s button onclick
  // calls `self._propose(entry, btn)` — every one of those `self`s is
  // the module, so each lands here first and is routed on to the right
  // namespace.
  //
  // Note for a future reader doing an external-touchpoint grep: this
  // module DOES make a real outbound cross-module call,
  // `RPGACE.modules.taxonomyTree.silentPropose(...)` in logic._propose.
  // That is a call OUT of this module and is unaffected by this split;
  // the "zero external touchpoints" fact above is about calls INTO it.
  _injectButtons: function() { return this.ui._injectButtons(); },
  _injectOne: function(div, pendingIds) { return this.ui._injectOne(div, pendingIds); },
  _propose: function(entry, btn) { return this.logic._propose(entry, btn); },

});
/* ===END:encTaxonomyLink=== */
