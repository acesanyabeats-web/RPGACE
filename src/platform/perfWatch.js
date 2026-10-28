
/* ===MODULE:perfWatch=== */
// July 23 — real-evidence infra, not a fix. Alex reported the leftNav
// drawer's exit button and dashDeck popups' Close button "freeze" on his
// real phone/laptop, AFTER the request-storm dedup fix (careerStatCard
// _inflightFetch) already shipped. A synthetic Playwright pass (headless
// desktop AND mobile-viewport touch taps, real hit-testing via
// elementFromPoint at the button's exact screen coordinates) found the
// close handlers themselves wired correctly and instant in both cases —
// but that sandbox's network can't reach Supabase at all (every request
// fails instantly), so it cannot reproduce a REAL slow-network / real-CPU
// main-thread block the way Alex's actual device would. Per this file's
// own "one failed fix = stop, get real evidence, don't patch blind a
// second time" rule: rather than guess a second blind fix, this ships a
// passive PerformanceObserver('longtask') watcher — standard browser API,
// zero behavior change, fails silently where unsupported — that surfaces
// any real main-thread block over 500ms as BOTH a console.warn (for a
// plugged-in debug session) and a visible toast (since Alex is testing on
// a phone, not with devtools open). Next time the freeze recurs, it should
// self-report its own real duration instead of needing another guess.
// Oct 14 2026 (Polish & speed, step 1 — "find the freeze first"): the
// toast above only ever said HOW LONG a freeze lasted (141 rows, never a
// cause). Each freeze over 500ms now also writes one perf_freezes row with
// what was running: Chrome's Long Animation Frame API (where supported)
// names the script functions and what invoked them (click, timer, fetch
// response...), plus the last 12 things Alex did (pages, taps), slow
// network responses around the freeze, whether boot was still running and
// how many boot tasks were pending, and the build. Rows queue in memory and
// localStorage until signed in, then go through RPGACE.sb.secureWrite
// (perf_freezes is authenticated-only). The toast (and its error_log row)
// is unchanged.
RPGACE.register('perfWatch', {
  domain: 'platform',
  THRESHOLD_MS: 500,
  MAX_PER_SESSION: 15,
  PENDING_KEY: 'rpgace_perf_pending',
  _crumbs: [],
  _queue: [],
  _sent: 0,
  _loaf: false,
  init: function() {
    var self = this;
    try { self.logic.restorePending(); } catch (e) {}
    try { self.logic.watchActions(); } catch (e) {}
    try {
      if (typeof PerformanceObserver === 'undefined') return;
      var types = PerformanceObserver.supportedEntryTypes || [];
      if (types.indexOf('long-animation-frame') !== -1) {
        self._loaf = true;
        // Buffered long-animation-frame entries don't replay frames from
        // before this point (the script's own load), so those come from
        // the longtask observer below instead.
        self._loafSince = performance.now();
        new PerformanceObserver(function(list) {
          list.getEntries().forEach(function(e) { if (e.duration >= self.THRESHOLD_MS) self.logic.record(e, 'loaf'); });
        }).observe({ type: 'long-animation-frame', buffered: true });
      }
      var obs = new PerformanceObserver(function(list) {
        list.getEntries().forEach(function(entry) {
          if (entry.duration < self.THRESHOLD_MS) return;
          var ms = Math.round(entry.duration);
          console.warn('[RPGACE perfWatch] main thread blocked for ' + ms + 'ms', entry);
          if (!self._loaf || entry.startTime < self._loafSince) self.logic.record(entry, 'longtask');
          // Oct 14 2026: a block before boot finishes is the app loading behind
          // the boot loader (phone-speed profile: ~690ms compiling the one
          // 1.9MB script + ~280ms of module setup), not a freeze Alex sees -
          // still recorded in perf_freezes, but no red toast / error_log row.
          if (!RPGACE._bootDoneAt) return;
          try {
            if (RPGACE.utils && RPGACE.utils.toast) {
              RPGACE.utils.toast('⚠️ App froze for ' + ms + 'ms (logged)', '#CC4A4A', 4000, 'perfWatch');
            }
          } catch (e2) {}
        });
      });
      obs.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // 'longtask' unsupported on this browser (e.g. Safari) - silent,
      // this is diagnostic-only and must never itself break anything.
    }
    try { if (RPGACE.hooks) RPGACE.hooks.on('rpgace:login', function() { self.logic.flush(); }); } catch (e) {}
    setInterval(function() { try { self.logic.flush(); } catch (e) {} }, 60000);
  },

  logic: {
    crumb: function(kind, text) {
      var self = RPGACE.modules.perfWatch;
      self._crumbs.push({ t: Math.round(performance.now()), k: kind, v: String(text || '').replace(/\s+/g, ' ').trim().slice(0, 60) });
      if (self._crumbs.length > 12) self._crumbs.shift();
    },
    watchActions: function() {
      var L = RPGACE.modules.perfWatch.logic;
      document.addEventListener('click', function(ev) {
        var el = ev.target && ev.target.closest ? ev.target.closest('button,a,[onclick],[role="button"],input,select,summary') : null;
        if (!el) return;
        L.crumb('tap', (el.id ? '#' + el.id + ' ' : '') + (el.textContent || el.value || el.getAttribute('aria-label') || el.tagName));
      }, { capture: true, passive: true });
      if (RPGACE.hooks) RPGACE.hooks.on('page:show', function(name) { L.crumb('page', name); });
    },
    // Slow network responses that finished in the 3s before the freeze or during it.
    resourcesNear: function(start, dur) {
      try {
        return performance.getEntriesByType('resource').filter(function(r) { return r.responseEnd >= start - 3000 && r.responseEnd <= start + dur + 200 && r.duration >= 200; })
          .sort(function(a, b) { return b.duration - a.duration; }).slice(0, 6).map(function(r) {
            var n = String(r.name).split('?')[0].replace(/^https?:\/\/[^/]+/, '');
            return { url: n.slice(-80), ms: Math.round(r.duration), kb: Math.round((r.transferSize || 0) / 1024), ended_before_ms: Math.round(start - r.responseEnd) };
          });
      } catch (e) { return []; }
    },
    scriptsOf: function(entry) {
      return (entry.scripts || []).slice().sort(function(a, b) { return b.duration - a.duration; }).slice(0, 6).map(function(sc) {
        return { fn: sc.sourceFunctionName || '', url: String(sc.sourceURL || '').split('/').pop().split('?')[0], pos: sc.sourceCharPosition, invoker: String(sc.invoker || '').slice(0, 80), type: sc.invokerType || '', ms: Math.round(sc.duration), forced_layout_ms: Math.round(sc.forcedStyleAndLayoutDuration || 0) };
      });
    },
    build: function() {
      try { var s = document.querySelector('script[src*="rpgace_core"]'); var m = s && /v=([^&]+)/.exec(s.getAttribute('src')); return m ? m[1] : null; } catch (e) { return null; }
    },
    report: function(entry, source) {
      var self = RPGACE.modules.perfWatch, L = self.logic, R = RPGACE;
      var since = Math.round(entry.startTime);
      var done = !!R._bootDoneAt;
      return {
        ms: Math.round(entry.duration), blocking_ms: entry.blockingDuration != null ? Math.round(entry.blockingDuration) : null,
        phase: done ? 'use' : 'boot', since_load_ms: since,
        page: (document.querySelector('.page.active') || {}).id || (self._crumbs.filter(function(c) { return c.k === 'page'; }).pop() || {}).v || null, build: L.build(), source: source,
        scripts: source === 'loaf' ? L.scriptsOf(entry) : null,
        last_actions: self._crumbs.filter(function(c) { return c.t <= since + entry.duration; }).map(function(c) { return { ago_ms: Math.max(0, since - c.t), k: c.k, v: c.v }; }),
        resources: L.resourcesNear(entry.startTime, entry.duration),
        boot_pending: done ? 0 : Math.max(0, (R._bootTasks || []).length - (R._bootSettled || 0)),
        device: (navigator.userAgent || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/AppleWebKit\/\S+|KHTML|like Gecko|Safari\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80),
      };
    },
    record: function(entry, source) {
      var self = RPGACE.modules.perfWatch;
      if (self._sent + self._queue.length >= self.MAX_PER_SESSION) return;
      try { self._queue.push(self.logic.report(entry, source)); } catch (e) { return; }
      self.logic.savePending();
      self.logic.flush();
    },
    savePending: function() {
      var self = RPGACE.modules.perfWatch;
      try { localStorage.setItem(self.PENDING_KEY, JSON.stringify(self._queue.slice(-10))); } catch (e) {}
    },
    restorePending: function() {
      var self = RPGACE.modules.perfWatch;
      try { var a = JSON.parse(localStorage.getItem(self.PENDING_KEY) || '[]'); if (Array.isArray(a)) self._queue = a.slice(-10); } catch (e) {}
    },
    flush: function() {
      var self = RPGACE.modules.perfWatch, ag = RPGACE.modules.authGate;
      if (self._flushing || !self._queue.length || !ag || !ag._apiSecret || !RPGACE.sb || !RPGACE.sb.secureWrite) return Promise.resolve(0);
      var batch = self._queue.slice();
      self._flushing = true;
      return RPGACE.sb.secureWrite('perf_freezes', 'insert', batch).then(function() {
        self._queue = self._queue.slice(batch.length); self._sent += batch.length; self.logic.savePending();
        return batch.length;
      }).catch(function(e) { console.warn('[RPGACE perfWatch] could not save freeze report', e && e.message); return 0; })
        .then(function(n) { self._flushing = false; return n; });
    },
  },
});
/* ===END:perfWatch=== */
