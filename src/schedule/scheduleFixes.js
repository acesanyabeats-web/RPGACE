
/* ===MODULE:scheduleFixes=== */
// July 22, 2 real QoL bugs found by GODMODE evidence pass, both root-caused
// against real main.js source rather than guessed:
//
// 1) "Daily view is missing its ◄Prev/date/Next► nav on first load, only
//    appears after cycling through Weekly and back." Root cause:
//    showPage('schedule') never calls showSched() at all - it just leaves
//    whatever #sched-X div is already marked visible in static HTML on
//    screen, raw. Only an explicit showSched('daily') call runs
//    initDailyNav()/renderDailyGrid() (main.js, lines ~1960/~1848), which
//    is what actually builds the Prev/Next header. Fix: fire it once,
//    shortly after arriving at the Schedule page - the exact same call a
//    manual Daily-tab click already makes, just triggered automatically.
//
// 2) "Clicking Daily/Weekly gives XP, this needs to stop." Root cause:
//    showSched('daily'|'weekly') both schedule a call to
//    autoApplyStoredShifts() (main.js), which re-populates the grid from
//    already-stored shifts on every view - a pure redisplay, not a new
//    import. But it calls the SAME applyShifts() the real Import Shifts
//    flow uses, and applyShifts() unconditionally ends with addXP(30) -
//    so every single schedule view was re-awarding the one-time import
//    bonus. Can't edit applyShifts (main.js, frozen) to add a "skip XP"
//    flag without breaking real imports elsewhere. Fix: since
//    autoApplyStoredShifts() is fully synchronous (no await/promise),
//    wrap window.autoApplyStoredShifts to swap addXP to a no-op only for
//    the duration of that one synchronous call, then restore it - real
//    imports (parseICS/parseCSV/parseText → applyShifts, called directly,
//    never through this wrapper) are completely unaffected and still earn
//    their XP normally.
RPGACE.register('scheduleFixes', {
  domain: 'schedule',

  // G53 (Sep 2026), module 23 of 60. init stays literal top-level
  // (its page:show closure calls a bare global `window.showSched`,
  // not a module method - untouched). _patchAutoApply is zero-DOM:
  // it wraps a global function to temporarily neutralise window.addXP
  // during a bulk auto-apply, pure logic - ui is empty. Zero external
  // touchpoints confirmed via repo-wide grep. Handled directly given
  // the trivial single-function scope.
  init: function() {
    var self = this;
    self._patchAutoApply();
    RPGACE.registerBootTask(function() { return self._patchAutoApply(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.schedule) {
        // DR-8: Schedule is the Calendar - Week first (the day itself is My Day).
        setTimeout(function() { if (typeof window.showSched === 'function') window.showSched('weekly', document.querySelector('.sched-tab')); }, 200);
        var em = RPGACE.modules.eventMemories;
        if (em) em.logic.load().then(function() { if (typeof buildWeekSlots === 'function') buildWeekSlots(); if (typeof buildMonthSlots === 'function' && window._calMonthDate) buildMonthSlots(); }).catch(function() {});
        self.ui.sideExtras();
      }
    });
  },

  logic: {
    _patchAutoApply: function() {
      if (typeof window.autoApplyStoredShifts !== 'function' || window._autoApplyXPPatched) return;
      window._autoApplyXPPatched = true;
      var orig = window.autoApplyStoredShifts;
      window.autoApplyStoredShifts = function() {
        var realAddXP = window.addXP;
        if (typeof realAddXP === 'function') window.addXP = function() {};
        try {
          return orig.apply(this, arguments);
        } finally {
          window.addXP = realAddXP;
        }
      };
    },
  },

  ui: {
    // DR-8: a date tapped on the Calendar opens My Day on that day.
    openDay: function(ds) {
      var md = RPGACE.modules.myDay;
      if (md) md._mdxView = { date: ds, mode: 'day' };
      if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.agenda);
      if (md) setTimeout(function() { try { md.ui.render(); } catch (e) {} }, 100);
    },
    // SL-4 (Oct 27 2026): the rota buttons (⬆ Import Shifts tab, + Update Rota)
    // live in the › side list; rota-sync.yml still imports Fourth every Monday.
    sideExtras: function() {
      var pg = document.getElementById('page-' + RPGACE.CONFIG.pages.schedule);
      if (!pg) return;
      pg._sideExtras = function() {
        return [
          ['⬆', 'Import shifts', function() { if (typeof window.showSched === 'function') window.showSched('import'); }, 'sched-import'],
          ['🏪', 'Update rota (paste)', function() { if (typeof window.openPasteRota === 'function') window.openPasteRota(); }, 'sched-rota']
        ];
      };
    },
  },

  _patchAutoApply: function() { return this.logic._patchAutoApply(); },

});
/* ===END:scheduleFixes=== */
