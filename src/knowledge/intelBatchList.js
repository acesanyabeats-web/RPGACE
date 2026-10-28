
/* ===MODULE:intelBatchList=== */
// Real, standalone module — Aug 13 marker fix (found while testing the
// Galaxy Map's Level-3 function-drill-down against all 44 real
// modules): this was previously sitting INSIDE uiBatchList's own
// marker block with no markers of its own, a real pre-existing gap in
// this file's own /* ===MODULE:x=== */ convention (parse_module_ranges()
// silently returned zero functions for it, since it isn't uiBatchList
// itself — RPGACE.ui.batchList is a plain utility function, not a
// registered module). Split into its own real, correctly-marked block;
// zero behavior change, pure marker-scoping fix.
//
// Re-batch the intel insights list after every re-render (its 30s sync
// polling rebuilds innerHTML, which would otherwise un-hide everything).
// Chainable wrap, same guard convention as every other wrap in this file.
RPGACE.register('intelBatchList', {
  domain: 'knowledge',
  // G53 (Sep 2026) housekeeping note: reviewed for the ui/logic split —
  // genuinely not applicable. This module has exactly one real function
  // (`init`, which must stay a literal top-level function regardless,
  // since RPGACE.register() calls `module.init()` directly) and nothing
  // else. Left as-is, byte-identical.
  init: function() {
    function patch() {
      if (typeof window.loadIntelInsights !== 'function' || window._intelBatchPatched) return;
      window._intelBatchPatched = true;
      var orig = window.loadIntelInsights;
      window.loadIntelInsights = function() {
        var result = orig.apply(this, arguments);
        RPGACE.ui.batchList(document.getElementById('intel-insights-content'), 5);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },
});
/* ===END:intelBatchList=== */
