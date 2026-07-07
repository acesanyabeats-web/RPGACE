/* ===MODULE:shiftSync=== */
RPGACE.register('shiftSync', {

  init: function() {
    var self = this;
    // Do NOT rely solely on rpgace:ready — it may have already fired before
    // this module's init() runs (confirmed failure mode from the taxonomy
    // detection build). Call directly with a delay instead, plus keep the
    // hook as a secondary path in case timing differs on some page loads.
    setTimeout(function() { self._syncFromSupabase(); }, 1200);

    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._syncFromSupabase(); }, 900);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.schedule) {
        setTimeout(function() { self._syncFromSupabase(); }, 300);
      }
    });
  },

  _syncFromSupabase: function() {
    var self = this;
    RPGACE.sb.select('rpgace_shifts', 'order=date.asc&limit=200')
      .then(function(rows) {
        rows = rows || [];
        if (rows.length === 0) {
          console.log('[shiftSync] No shifts in Supabase yet');
          return;
        }

        // Map Supabase row shape to the shape autoApplyStoredShifts / main.js expects
        var shifts = rows.map(function(r) {
          return {
            date: r.date,
            day: r.day,
            role: r.role,
            start: r.start,
            end: r.end,
            hours: r.hours,
          };
        });

        var before = JSON.parse(localStorage.getItem('rpgace_shifts') || '[]').length;
        localStorage.setItem('rpgace_shifts', JSON.stringify(shifts));

        console.log('[shiftSync] Synced ' + shifts.length + ' shifts from Supabase (was ' + before + ' in localStorage)');

        // Trigger the existing main.js function that renders shifts into the calendar
        if (typeof window.autoApplyStoredShifts === 'function') {
          window.autoApplyStoredShifts();
          console.log('[shiftSync] autoApplyStoredShifts() called');
        }

        // If we're currently on the schedule page, refresh whatever view is active
        if (typeof window.buildMonthSlots === 'function') { try { window.buildMonthSlots(); } catch(e){} }
        if (typeof window.buildWeekSlots === 'function') { try { window.buildWeekSlots(); } catch(e){} }
        if (typeof window.renderDailyGrid === 'function') { try { window.renderDailyGrid(); } catch(e){} }
      })
      .catch(function(e) {
        console.warn('[shiftSync] Supabase fetch failed:', e.message);
      });
  },

});
/* ===END:shiftSync=== */
