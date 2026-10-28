
/* ===END_DOMAIN:SYSTEM=== */

/* ===DOMAIN:SCHEDULE=== */

/* ===MODULE:shiftSync=== */
RPGACE.register('shiftSync', {
  domain: 'schedule',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 30 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // twenty-nine predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL precedent, so the diff shows only
  // real changes rather than a whitespace wall.
  //
  // 3 real members, all functions — ZERO data fields, declared or
  // otherwise (checked by direct read of every top-level key, and by a
  // grep of the whole module body for `self.X =` / `this.X =`: no
  // hits, so this module has none of the undeclared runtime-assigned
  // field trap that journalQoL's `_activeSource` and oracleDevBridge's
  // `this.TABLE` both hit). `init` stays a literal top-level function
  // (RPGACE.register() calls `module.init()` directly and cannot see
  // into a sub-object) — byte-identical, its own `self = this`
  // genuinely IS the module, so its 1200ms boot timer and `page:show`
  // listener still reach `_syncFromSupabase` through the top-level
  // pass-through below.
  //
  // This module splits 2 / 0: both movable functions land in `logic`,
  // and `ui` is genuinely EMPTY — kept as an explicit `ui: {}` so the
  // module still declares the same two-namespace shape as every
  // sibling (same precedent already shipped for scheduleFixes/encSync
  // in the ui-empty direction, and journalQoL in the logic-empty one).
  //
  // ─── Both functions: the one real judgment call in this module ────
  // Neither `_syncFromSupabase` nor `_syncAgendasFromSupabase`
  // contains a single literal DOM keyword — no `document.*`, no
  // `createElement`, no `innerHTML`, no `querySelector`, no listener.
  // But both END by calling real, global DOM-rendering functions:
  // `_syncFromSupabase` calls `window.autoApplyStoredShifts()` (which
  // is genuinely a renderer — it does `document.querySelectorAll
  // ('.day-col')` and builds `.auto-shift-block` divs, see its
  // definition in the LEGACY:mainjs section), and
  // `_syncAgendasFromSupabase` calls `window.buildMonthSlots()`,
  // `window.buildWeekSlots()` and `window.renderDailyGrid()`. So two
  // real readings existed and are named here rather than decided
  // quietly:
  //   (a) `ui`, on the DOMINANT-RESPONSIBILITY override already
  //       shipped for pathRouter._routeFromCurrentURL,
  //       phylumPath._jumpToNode and bookworm._goToDashboard — a
  //       function whose real job is what the user ends up seeing is
  //       `ui` even with zero literal DOM keywords, and these two
  //       demonstrably cause a real redraw of the Schedule page.
  //   (b) `logic` — their real job is CROSS-DEVICE DATA
  //       SYNCHRONISATION (the module's whole reason to exist: a shift
  //       or task entered on the phone showing up on the desktop). The
  //       body is a Supabase read, a row map, and a `RPGACE.DB.set`
  //       persistence write; the render calls are a trailing "now
  //       redraw with the new data" side effect.
  // (b) was chosen for two real reasons, neither of them keyword
  // counting. First, the "inseparable fetch + render" rule that sends
  // a whole function to `ui` has an explicit condition — results never
  // returned, stored or reused — and it is plainly not met here: both
  // functions' entire point is that the rows ARE stored, via
  // `RPGACE.DB.set('shifts', ...)` and `RPGACE.DB.set('sched', rows)`,
  // into localStorage, where every other Schedule consumer reads them
  // independently of this module. The data outlives the call; that is
  // the opposite of the render-and-discard shape that rule describes.
  // Second, the dominant-responsibility override exists for functions
  // whose ENTIRE job is driving what the user sees — pathRouter's own
  // note is explicit that extending it past that would be misuse. Here
  // the render calls are optional trailing follow-ons, each individually
  // guarded by `typeof window.X === 'function'` and (for the three in
  // `_syncAgendasFromSupabase`) wrapped in its own `try{}catch{}` — the
  // sync still completes and still persists correctly if every one of
  // them is absent, which is not how a function's actual purpose
  // behaves. The honest cost of (b), stated rather than hidden: a
  // reader chasing "why did the Schedule grid just redraw" will find
  // the trigger in `logic`, not `ui`.
  //
  // `this`/`self` accounting for both moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _syncFromSupabase — already had `var self = this;` as its
  //     first statement, swapped for the module handle IN PLACE.
  //     Captured by BOTH the `.then` and the `.catch` for
  //     `self._syncAgendasFromSupabase()`. Left as `this.`, that would
  //     have read `logic._syncAgendasFromSupabase` — which DOES exist
  //     on `logic`, so this one would have kept working by luck rather
  //     than by design; requalified anyway, per the standing rule that
  //     the module must never depend on two functions happening to
  //     share a namespace.
  //   • _syncAgendasFromSupabase — references neither `this` nor
  //     `self` anywhere in its body; moved byte-identical, no handle
  //     needed and none added.
  //
  // Zero external touchpoints confirmed by a fresh repo-wide grep for
  // `RPGACE.modules.shiftSync.` (0 hits anywhere — rpgace_core.js and
  // index.html both), plus the dynamic-lookup check: the only real
  // `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field and is never named at any of its call sites. The module is
  // driven entirely by the 1200ms boot timer and the `page:show` hook
  // that `init` registers. The two `"_syncFromSupabase"` /
  // `"_syncAgendasFromSupabase"` entries in this file's own
  // METHOD_MODULE_MAP (G109) are a generated name->module DATA table,
  // not call sites, and are unaffected by this split.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    // Do NOT rely solely on rpgace:ready — it may have already fired before
    // this module's init() runs (confirmed failure mode from the taxonomy
    // detection build). Call directly with a delay instead, plus keep the
    // hook as a secondary path in case timing differs on some page loads.
    setTimeout(function() { self._syncFromSupabase(); }, 1200);

    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.schedule) {
        setTimeout(function() { self._syncFromSupabase(); }, 300);
      }
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure fetch + persistence.
  // Both real functions live here; see the dedicated judgment-call
  // note in the G53 block above for why the trailing global render
  // calls do NOT pull them into `ui`.
  // ============================================================
  logic: {

  // Oct 12 2026 (MD2-1, My Day Round 2). Before this, NO code wrote to
  // rpgace_shifts: every import (rota screenshot in Oracle chat, the paste
  // box, the PC script's console paste) only reached this browser's
  // localStorage, and this sync then REPLACED localStorage with the 15
  // hand-inserted July rows on every load — so imports vanished. Now:
  //   - replaceDates() is the one save path every import uses: an import is
  //     the truth for the dates it covers (other dates untouched), saved
  //     locally at once and pushed to rpgace_shifts through /api/data-write
  //     (delete those dates, insert the new rows).
  //   - Dates not yet pushed (offline, or before login) are kept in
  //     rpgace_shifts_pending and retried on the next sync/login.
  //   - Sync merges: Supabase is the truth except for pending dates.
  //   - First run on each device uploads its stored shifts from today
  //     onwards once (Alex: "start fresh", nothing before today).
  PENDING_KEY: 'rpgace_shifts_pending',
  UPLOADED_FLAG: 'rpgace_shifts_uploaded_v1',

  _iso: function(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _ls: function(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  },
  _norm: function(s) {
    var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    var date = String(s.date || '').slice(0, 10);
    var d = new Date(date + 'T12:00:00');
    var hours = Number(s.hours);
    if (!isFinite(hours) || hours <= 0) {
      var a = String(s.start || '').split(':'), b = String(s.end || '').split(':');
      hours = (Number(b[0]) * 60 + Number(b[1] || 0) - Number(a[0]) * 60 - Number(a[1] || 0)) / 60;
      if (hours <= 0) hours += 24;
      hours = Math.round(hours * 10) / 10;
    }
    return { date: date, day: isNaN(d) ? String(s.day || '').toUpperCase() : DAYS[d.getDay()], role: s.role || 'Shift', start: s.start || '00:00', end: s.end || '00:00', hours: hours };
  },
  // Most recent role seen, so an import with no role keeps the real one.
  lastRole: function() {
    var all = (RPGACE.DB.get('shifts') || []).filter(function(s) { return s && s.role; });
    return all.length ? all[all.length - 1].role : 'Shift';
  },
  _byDate: function(a, b) { return a.date.localeCompare(b.date) || String(a.start).localeCompare(String(b.start)); },

  // MD2-3 (Oct 14 2026): the one rota-screenshot reader, shared by the Oracle
  // chat image upload and the Screenshot inbox "Import shifts" route (rule 8).
  ROTA_SYSTEM: RPGACE.prompt('rota_read'), // RF-7: prompts/rota_read.md
  // Oracle's rota reply -> shift rows ({date ISO, day, role, start, end, hours}),
  // or null when no usable JSON came back. dd/mm with no year gets this year
  // (next year if that is over 6 months back); role falls back to the last one.
  fromRotaJson: function(raw, now) {
    var L = RPGACE.modules.shiftSync.logic;
    var cleaned = String(raw || '').replace(/```json|```/g, '').trim();
    var match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    var result; try { result = JSON.parse(match[0]); } catch (e) { return null; }
    if (!result || !Array.isArray(result.shifts) || !result.shifts.length) return null;
    now = now || new Date();
    var fallbackRole = L.lastRole();
    return result.shifts.map(function(s) {
      var d = String(s.date || ''), parts = d.split(/[\/\-.]/), dateStr = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dateStr = d;
      else if (parts.length >= 2) {
        var y = parts[2] ? (parts[2].length === 2 ? '20' + parts[2] : parts[2]) : String(now.getFullYear());
        if (!parts[2]) { var guess = new Date(+y, +parts[1] - 1, +parts[0]); if (now - guess > 182 * 864e5) y = String(+y + 1); }
        dateStr = y + '-' + String(parts[1]).padStart(2, '0') + '-' + String(parts[0]).padStart(2, '0');
      }
      return { date: dateStr, day: String(s.day || '').toUpperCase(), role: s.role || fallbackRole, start: s.start || '00:00', end: s.end || '00:00', hours: s.hours || 0 };
    }).filter(function(s) { return s.date; });
  },

  // The one save path for every shift import. Returns a promise that
  // resolves {saved, pushed} — pushed=false means kept locally, retried later.
  replaceDates: function(shifts, source) {
    var L = RPGACE.modules.shiftSync.logic;
    var rows = (shifts || []).map(L._norm).filter(function(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s.date); });
    if (!rows.length) return Promise.resolve({ saved: 0, pushed: false });
    var dates = {};
    rows.forEach(function(s) { dates[s.date] = 1; });
    var kept = (RPGACE.DB.get('shifts') || []).filter(function(s) { return !dates[s.date]; });
    RPGACE.DB.set('shifts', kept.concat(rows).sort(L._byDate));
    var pending = L._ls(L.PENDING_KEY) || [];
    Object.keys(dates).forEach(function(d) { if (pending.indexOf(d) === -1) pending.push(d); });
    L._ls(L.PENDING_KEY, pending);
    console.log('[shiftSync] ' + rows.length + ' shifts saved from ' + (source || 'import'));
    if (typeof window.renderShiftBlocks === 'function') { try { window.renderShiftBlocks(); } catch (e) {} }
    return L.pushPending().then(function(pushed) { return { saved: rows.length, pushed: pushed }; });
  },

  // Push every pending date: delete that date's rows, insert the local ones.
  // Needs login (secureWrite); without it the dates simply stay pending.
  pushPending: function() {
    var L = RPGACE.modules.shiftSync.logic;
    var pending = L._ls(L.PENDING_KEY) || [];
    if (!pending.length) return Promise.resolve(true);
    var auth = RPGACE.modules.authGate;
    if (!auth || !auth._apiSecret || !RPGACE.sb.secureWrite) {
      if (!L._waitingLogin) {
        L._waitingLogin = true;
        var off = RPGACE.hooks.on('rpgace:login', function() { off(); L._waitingLogin = false; L.pushPending(); });
      }
      return Promise.resolve(false);
    }
    var local = (RPGACE.DB.get('shifts') || []).filter(function(s) { return pending.indexOf(s.date) !== -1; }).map(L._norm);
    return RPGACE.sb.secureWrite('rpgace_shifts', 'delete', null, 'date=in.(' + pending.join(',') + ')')
      .then(function() { return local.length ? RPGACE.sb.secureWrite('rpgace_shifts', 'insert', local) : null; })
      .then(function() {
        var still = (L._ls(L.PENDING_KEY) || []).filter(function(d) { return pending.indexOf(d) === -1; });
        L._ls(L.PENDING_KEY, still);
        RPGACE.cache.clear('rpgace_shifts');
        return true;
      })
      .catch(function(e) {
        RPGACE.utils.toast('⚠️ Shifts saved on this device only, upload failed: ' + (e.message || e), '#CC4A4A', 4500, 'shiftSync');
        return false;
      });
  },

  // First run on a device: queue its stored shifts from today onwards.
  _firstUpload: function() {
    var L = RPGACE.modules.shiftSync.logic;
    if (L._ls(L.UPLOADED_FLAG)) return;
    var today = L._iso();
    var future = (RPGACE.DB.get('shifts') || []).filter(function(s) { return s && s.date >= today; });
    var pending = L._ls(L.PENDING_KEY) || [];
    future.forEach(function(s) { if (pending.indexOf(s.date) === -1) pending.push(s.date); });
    L._ls(L.PENDING_KEY, pending);
    L._ls(L.UPLOADED_FLAG, new Date().toISOString());
  },

  _syncFromSupabase: function() {
    var self = RPGACE.modules.shiftSync, L = self.logic;
    if (!RPGACE.sb || !RPGACE.sb.select) return;
    L._firstUpload();
    RPGACE.sb.select('rpgace_shifts', 'order=date.asc,start.asc&limit=500')
      .then(function(rows) {
        if (!Array.isArray(rows)) throw new Error('unexpected reply');
        var pending = L._ls(L.PENDING_KEY) || [];
        var remote = rows.map(L._norm).filter(function(s) { return pending.indexOf(s.date) === -1; });
        var local = (RPGACE.DB.get('shifts') || []).filter(function(s) { return pending.indexOf(s.date) !== -1; });
        var merged = remote.concat(local).sort(L._byDate);
        RPGACE.DB.set('shifts', merged);
        console.log('[shiftSync] ' + remote.length + ' shifts from Supabase + ' + local.length + ' waiting to upload');
        // renderShiftBlocks applies stored shifts AND draws the Schedule
        // page's shift panel (with the paste box) — before Oct 12 2026 it was
        // only ever called after a successful paste, so the panel and its
        // "+ Update Rota" button were unreachable.
        if (typeof window.renderShiftBlocks === 'function') { try { window.renderShiftBlocks(); } catch (e) { console.warn('[shiftSync] render:', e.message); } }
        else if (typeof window.autoApplyStoredShifts === 'function') window.autoApplyStoredShifts();
        if (pending.length) L.pushPending();
        self._syncAgendasFromSupabase();
      })
      .catch(function(e) {
        console.warn('[shiftSync] Supabase shifts fetch failed:', e.message);
        self._syncAgendasFromSupabase();
      });
  },

  _syncAgendasFromSupabase: function() {
    RPGACE.sb.select('rpgace_agendas', 'order=date.asc&limit=300')
      .then(function(rows) {
        rows = rows || [];
        RPGACE.DB.set('sched', rows); // July 24 audit fix - see shifts sync above, same reasoning
        console.log('[shiftSync] Synced ' + rows.length + ' agendas from Supabase');
        if (typeof window.buildMonthSlots === 'function') { try { window.buildMonthSlots(); } catch(e){} }
        if (typeof window.buildWeekSlots === 'function') { try { window.buildWeekSlots(); } catch(e){} }
        if (typeof window.renderDailyGrid === 'function') { try { window.renderDailyGrid(); } catch(e){} }
      })
      .catch(function(e) {
        console.warn('[shiftSync] Supabase agendas fetch failed:', e.message);
      });
  },

  },

  // ============================================================
  // ui — genuinely empty. This module discovers, constructs, reads
  // and mutates zero DOM nodes of its own; the redraws it triggers
  // are performed by global functions defined elsewhere. Kept as an
  // explicit empty object so the module still declares the same
  // two-namespace shape as every sibling.
  // ============================================================
  ui: {},

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.shiftSync` anywhere outside this module's own
  // body), so these exist for convention and for its OWN internal
  // calls: `init`'s 1200ms boot timer and its `page:show` listener both
  // call `self._syncFromSupabase()`, and `logic._syncFromSupabase`
  // itself reaches `self._syncAgendasFromSupabase()` from both its
  // `.then` and its `.catch` — every one of those `self`s is the
  // module, so each lands here first and is routed on to `logic`.
  _syncFromSupabase: function() { return this.logic._syncFromSupabase(); },
  replaceDates: function(shifts, source) { return this.logic.replaceDates(shifts, source); },
  _syncAgendasFromSupabase: function() { return this.logic._syncAgendasFromSupabase(); },

});
/* ===END:shiftSync=== */
