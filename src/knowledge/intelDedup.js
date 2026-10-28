
/* ===MODULE:intelDedup=== */
// July 19 — root-cause fix for the duplicate Content Intelligence rows
// (real evidence: one video cached 5 times; 24 dup rows total). Cause:
// main.js's mergeByUrl dedups by EXACT url string only - mismatched
// formats (youtu.be vs watch?v=, trailing params, m.youtube.com) never
// match, and importIntelJSON skips dedup entirely; bad rows then persist
// forever because the cache itself is merged back in on every 30s sync.
// Fix: normalized-URL + title-fallback dedup applied to the localStorage
// caches, once on init and after every sync (chainable wrap). main.js
// untouched (frozen).
RPGACE.register('intelDedup', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 37 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle. Bodies are deliberately NOT re-indented
  // inside their new namespace, matching established precedent, so the
  // diff shows only real changes.
  //
  // This module splits 6 logic (normUrl, dedupKey, _pick, dedupArray,
  // _safeSet, purge) / 1 ui (_writeStats). `_writeStats` is the only
  // real DOM touch in this module — `getElementById('intel-stats')`
  // plus an `.innerHTML` write. `purge` calls it as its last step but
  // stays `logic`: the fetch/render seam already exists as two
  // separately-named, independently-reachable functions (same
  // knowledgeGap._load-shaped precedent already established this
  // series), so `purge`'s real job — dedup + persist to localStorage —
  // is genuinely separable from the DOM write that follows it.
  //
  // Real, load-bearing external touchpoints, confirmed by grep, not
  // assumed: main.js's legacy `mergeByUrl` reads
  // `RPGACE.modules.intelDedup.normUrl` directly (a fallback closure,
  // guarded — `|| function(u){...}` — so a dropped pass-through would
  // have failed SILENTLY, same class of risk as the local-alias finding
  // in G53 batch 11); `RPGACE.modules.intelDedup.dedupKey(r)` is called
  // directly by another module's own `_key` helper. Both preserved via
  // the pass-throughs below.
  // ══════════════════════════════════════════════════════════════════

  // ============================================================
  // logic — business logic/data: localStorage read/write, string
  // normalization, dedup comparison. Zero DOM except _writeStats
  // below, kept in ui.
  // ============================================================
  logic: {

  normUrl: function(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    s = s.replace(/^https?:\/\//i, '');
    s = s.replace(/^www\./i, '');
    s = s.replace(/^m\.youtube\.com/i, 'youtube.com');
    s = s.split('#')[0];
    var m = s.match(/^youtu\.be\/([A-Za-z0-9_-]{5,20})/i);
    if (m) return 'youtube.com/watch?v=' + m[1];
    m = s.match(/^youtube\.com\/shorts\/([A-Za-z0-9_-]{5,20})/i);
    if (m) return 'youtube.com/watch?v=' + m[1];
    if (/^youtube\.com\/watch/i.test(s)) {
      var vm = s.match(/[?&]v=([A-Za-z0-9_-]{5,20})/);
      return vm ? 'youtube.com/watch?v=' + vm[1] : s.split('?')[0].toLowerCase();
    }
    s = s.split('?')[0];
    s = s.replace(/\/+$/, '');
    return s.toLowerCase();
  },

  dedupKey: function(r) {
    var self = RPGACE.modules.intelDedup;
    var u = self.normUrl(r && r.url);
    if (u) return u;
    return 'title:' + String((r && r.title) || '').replace('☁️', '').trim().toLowerCase();
  },

  // Deterministic keep-rule when two rows share a key: richest row wins
  // (has the full insights payload), then the one deletable server-side
  // (has a Supabase id), then the newer. Backfills id/url onto the
  // winner so dedup never loses delete-ability or the original link.
  _pick: function(a, b) {
    var keep, lose;
    var aRich = !!(a.insights && a.insights.encyclopedia_entry);
    var bRich = !!(b.insights && b.insights.encyclopedia_entry);
    if (aRich !== bRich) { keep = aRich ? a : b; }
    else if (!!a.id !== !!b.id) { keep = a.id ? a : b; }
    else {
      var ad = new Date(a.date || a.created_at || 0).getTime();
      var bd = new Date(b.date || b.created_at || 0).getTime();
      keep = bd > ad ? b : a;
    }
    lose = (keep === a) ? b : a;
    if (!keep.id && lose.id) keep.id = lose.id;
    if (!keep.url && lose.url) keep.url = lose.url;
    return keep;
  },

  dedupArray: function(arr) {
    var self = RPGACE.modules.intelDedup;
    var map = {};
    var order = [];
    (arr || []).forEach(function(r) {
      if (!r) return;
      var key = self.dedupKey(r);
      if (map[key] === undefined) { map[key] = r; order.push(key); }
      else { map[key] = self._pick(map[key], r); }
    });
    return order.map(function(k) { return map[k]; });
  },

  _safeSet: function(key, arr, cap, halfCap) {
    try { localStorage.setItem(key, JSON.stringify(arr.slice(0, cap))); }
    catch (e1) {
      try { localStorage.setItem(key, JSON.stringify(arr.slice(0, halfCap))); }
      catch (e2) { console.warn('[intelDedup] quota:', e2.message); }
    }
  },

  purge: function() {
    var self = RPGACE.modules.intelDedup;
    var reports = [];
    var wl = [];
    try { reports = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]'); } catch (e) { reports = []; }
    try { wl = JSON.parse(localStorage.getItem('rpgace_intel_watchlist') || '[]'); } catch (e) { wl = []; }
    reports = self.dedupArray(reports);
    wl = self.dedupArray(wl);
    self._safeSet('rpgace_intel_insights', reports, 200, 100);
    self._safeSet('rpgace_intel_watchlist', wl, 100, 50);
    self._writeStats(reports, wl);
    return reports;
  },

  },

  // ============================================================
  // ui — the one real DOM touch in this module.
  // ============================================================
  ui: {

  // Rewrites #intel-stats with DEDUPED counts - syncIntelData writes it
  // from the raw merged array mid-flight; this runs after and corrects it
  // (same markup as main.js:4271).
  _writeStats: function(reports, wl) {
    var el = document.getElementById('intel-stats');
    if (!el) return;
    var scores = reports.map(function(r) { return r.score || 0; }).filter(Boolean);
    var avg = scores.length ? (scores.reduce(function(a, b) { return a + b; }, 0) / scores.length).toFixed(1) : 0;
    el.innerHTML = '<span style="color:var(--gold)">📊 ' + reports.length + ' analysed</span> · <span style="color:var(--purple)">⭐ ' + wl.length + ' watchlist</span> · <span style="color:var(--green)">avg ' + avg + '/10</span>';
  },

  },

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() {
      self.purge();
      if (typeof window.loadIntelInsights === 'function') window.loadIntelInsights();
    });
    function patch() {
      if (typeof window.syncIntelData !== 'function' || window._intelDedupPatched) return;
      window._intelDedupPatched = true;
      var orig = window.syncIntelData;
      window.syncIntelData = function() {
        var result = orig.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          return result.then(function() {
            var deduped = self.purge();
            if (typeof window.loadIntelInsights === 'function') window.loadIntelInsights();
            return deduped;
          });
        }
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoints: main.js's legacy
  // `mergeByUrl` reads `RPGACE.modules.intelDedup.normUrl` directly
  // (guarded, would fail silently if dropped); another module's `_key`
  // helper calls `RPGACE.modules.intelDedup.dedupKey(r)` directly. Also
  // carries this module's own internal calls: `init`'s boot task and
  // `syncIntelData` wrap both call `self.purge()`, and `logic.purge`
  // itself reaches `self.dedupArray()` ×2, `self._safeSet()` ×2 and
  // `self._writeStats()` — every one of those `self`s is the module,
  // so each lands here first and is routed on to the right namespace.
  normUrl: function(raw) { return this.logic.normUrl(raw); },
  dedupKey: function(r) { return this.logic.dedupKey(r); },
  _pick: function(a, b) { return this.logic._pick(a, b); },
  dedupArray: function(arr) { return this.logic.dedupArray(arr); },
  _safeSet: function(key, arr, cap, halfCap) { return this.logic._safeSet(key, arr, cap, halfCap); },
  purge: function() { return this.logic.purge(); },
  _writeStats: function(reports, wl) { return this.ui._writeStats(reports, wl); },

});
/* ===END:intelDedup=== */
