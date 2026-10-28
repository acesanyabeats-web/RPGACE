
/* ===MODULE:agendaReminder=== */
// F9: third button (Start/Done/Reminder) on scheduled agenda blocks in the
// Daily Grid. Standalone from Schedule Oracle - just redisplays the stored
// title/description/context for that block on demand. renderDailyGrid()
// (main.js) fully rebuilds #time-slots on every date-nav/refresh, so this
// wraps that function the same way encTaxonomyLink wraps renderEncEntries
// rather than doing a one-time DOM pass.
RPGACE.register('agendaReminder', {
  domain: 'schedule',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 31 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // thirty predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL precedent, so the diff shows only
  // real changes rather than a whitespace wall.
  //
  // 3 real members, all functions — ZERO data fields, declared or
  // otherwise (checked by direct read of every top-level key, and by a
  // grep of the whole module body for `self.X =` / `this.X =`: no hits,
  // so this module has none of the undeclared runtime-assigned field
  // trap journalQoL's `_activeSource` hit. The one flag it does set,
  // `window._agendaReminderPatched`, is a GLOBAL — the standard wrap
  // guard this codebase uses everywhere — not a module field, and is
  // untouched). `init` stays a literal top-level function (RPGACE.
  // register() calls `module.init()` directly and cannot see into a
  // sub-object) — byte-identical, its own `self = this` genuinely IS
  // the module, so the `window.renderDailyGrid` wrapper it installs
  // still reaches `_injectButtons` through the top-level pass-through
  // below.
  //
  // This module splits 0 / 2: both movable functions land in `ui`, and
  // `logic` is genuinely EMPTY — kept as an explicit `logic: {}` so the
  // module still declares the same two-namespace shape as every
  // sibling (the same honest inverse already shipped for journalQoL).
  // Classification, function by function, each checked against its
  // actual body rather than its name:
  //   • _injectButtons → ui. Unambiguous: `document.querySelectorAll`,
  //     a `.dataset` re-entry guard write, `getAttribute`,
  //     `document.createElement('button')`, a full inline `style.
  //     cssText` build, an `onclick` assignment and `appendChild`.
  //   • _show → ui. SEE THE INSEPARABILITY NOTE BELOW — it opens with
  //     a real localStorage read, so it is named here rather than
  //     filed quietly.
  //
  // ─── _show: why its localStorage read stays in `ui` ───────────────
  // Its first four lines are a genuine data read: parse
  // `rpgace_sched_agendas` out of localStorage and `.find` the entry
  // matching the id it was handed. In isolation that is textbook
  // `logic`. It is NOT lifted out, for the reason this pass's own rules
  // give: lifting it would split the function down the middle, which is
  // forbidden, and the read is not separable from what follows without
  // doing exactly that. The rest of the body is unambiguous DOM
  // construction — `RPGACE.modules.dashDeck._popup(...)`, two
  // `document.createElement('div')` calls with full `style.cssText`
  // builds, and two `box.appendChild(...)` calls — and it consumes
  // `entry` field by field (`entry.title`, `.hour`, `.minute`,
  // `.category`, `.estimated_mins`, `.xp`, `.description`) straight
  // into the popup it just built. The entry is never returned, never
  // stored and never reused; its only consumer is the markup this
  // function was already committed to building, and the not-found
  // branch's response is itself a UI action (`RPGACE.utils.toast`),
  // not a returned error. That is the exact shape
  // journalQoL.ui._injectAuditEntries, jargonEncyclopedia.ui.
  // _openGlossary and encTaxonomyLink.ui._injectButtons were all
  // shipped on.
  //
  // `this`/`self` accounting for both moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _injectButtons — already had `var self = this;` as its first
  //     statement, swapped for the module handle IN PLACE. Captured by
  //     the created button's `onclick` closure for `self._show(id)`.
  //     Left as `this.`, it would have read `ui._show` — which DOES
  //     exist on `ui`, so this one would have kept working by luck
  //     rather than by design; requalified anyway, per the standing
  //     rule that the module must never depend on two functions
  //     happening to share a namespace. Its `startBtns.forEach`
  //     callback uses a plain `startBtn` parameter, not `this`, so
  //     nothing else there needed touching.
  //   • _show — references neither `this` nor `self` anywhere in its
  //     body (it reaches dashDeck through the full `RPGACE.modules.
  //     dashDeck` path already); moved byte-identical, no handle
  //     needed and none added. Its `stored.find` callback uses a plain
  //     `a` parameter, untouched.
  //
  // Zero external touchpoints confirmed by a fresh repo-wide grep for
  // `RPGACE.modules.agendaReminder.` (0 hits anywhere — rpgace_core.js
  // and index.html both), plus the dynamic-lookup check: the only real
  // `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field and is never named at any of its call sites. The module is
  // driven entirely by the `window.renderDailyGrid` wrapper `init`
  // installs and by the injected buttons' own onclick handlers. The
  // `"_show"` entry in this file's own METHOD_MODULE_MAP (G109) is a
  // generated name->module DATA table, not a call site, and is
  // unaffected by this split.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.renderDailyGrid !== 'function' || window._agendaReminderPatched) return;
      window._agendaReminderPatched = true;
      var orig = window.renderDailyGrid;
      window.renderDailyGrid = function() {
        var result = orig.apply(this, arguments);
        setTimeout(function() { self._injectButtons(); }, 50);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // ============================================================
  // logic — genuinely empty. Both real functions in this module
  // construct DOM; the only data read that exists here (the
  // localStorage lookup at the head of `_show`) is inseparable from
  // the popup it feeds, per the dedicated note in the G53 block
  // above. Kept as an explicit empty object so the module still
  // declares the same two-namespace shape as every sibling.
  // ============================================================
  logic: {},

  // ============================================================
  // ui — rendering/DOM: the injected 🔔 Reminder button on every
  // scheduled Daily Grid block, and the popup it opens.
  // ============================================================
  ui: {

  _injectButtons: function() {
    var self = RPGACE.modules.agendaReminder;
    var startBtns = document.querySelectorAll('#time-slots button[onclick*="startScheduledTask("]');
    startBtns.forEach(function(startBtn) {
      var actions = startBtn.parentElement;
      if (!actions || actions.dataset.reminderInjected) return;
      actions.dataset.reminderInjected = '1';
      var m = startBtn.getAttribute('onclick').match(/startScheduledTask\('([^']+)'\)/);
      var id = m ? m[1] : null;
      if (!id) return;

      var btn = document.createElement('button');
      btn.textContent = '🔔 Reminder';
      btn.style.cssText = 'background:none;border:1px solid rgba(201,168,76,0.3);color:#C9A84C;border-radius:4px;padding:3px 9px;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;';
      btn.onclick = function(e) {
        e.stopPropagation();
        self._show(id);
      };
      actions.appendChild(btn);
    });
  },

  _show: function(id) {
    var stored = [];
    try { stored = JSON.parse(localStorage.getItem('rpgace_sched_agendas') || '[]'); } catch (e) {}
    var entry = stored.find(function(a) { return a.id === id; });
    if (!entry) { RPGACE.utils.toast("Could not find this task's stored details", '#CC4A4A', 2500); return; }

    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.85', width: '440px', borderColor: 'rgba(201,168,76,0.3)',
      eyebrow: '🔔 Reminder', title: entry.title || 'Task',
    });
    var box = pop.box;

    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:14px;';
    var timeStr = String(entry.hour || 0).padStart(2, '0') + ':' + String(entry.minute || 0).padStart(2, '0');
    meta.textContent = timeStr + ' · ' + (entry.category || 'personal') + ' · ' + (entry.estimated_mins || 60) + 'min · +' + (entry.xp || 50) + 'XP';

    var desc = document.createElement('div');
    desc.style.cssText = 'font-size:13px;color:rgba(226,226,236,0.75);line-height:1.6;margin-bottom:18px;white-space:pre-wrap;';
    desc.textContent = entry.description || 'No description was saved for this task.';

    box.appendChild(meta); box.appendChild(desc);
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.agendaReminder` anywhere outside this module's
  // own body), so these exist for convention and for its OWN internal
  // calls: `init`'s `window.renderDailyGrid` wrapper calls
  // `self._injectButtons()` on a 50ms timer after every real grid
  // rebuild, and `ui._injectButtons`'s created-button onclick calls
  // `self._show(id)` — both of those `self`s are the module, so each
  // lands here first and is routed on to `ui`.
  _injectButtons: function() { return this.ui._injectButtons(); },
  _show: function(id) { return this.ui._show(id); },

});
/* ===END:agendaReminder=== */
