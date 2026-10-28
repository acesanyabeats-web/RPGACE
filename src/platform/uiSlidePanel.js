
/* ===MODULE:uiSlidePanel=== */
// Shared right/left-edge slide-in panel choreography (improve-animations
// Plan 002, July 25). Before this, 6+ modules each hand-duplicated the
// identical position:fixed;transform:translateX(±100%);transition
// cssText block plus the double-rAF open sequence (the second rAF
// guarantees the browser has committed the off-screen starting state
// before the transform is changed, so the transition actually plays
// instead of being coalesced away) - a real rule-8 dedup violation, not
// just visual repetition. This does NOT touch leftNav's drawer, which
// uses a persistent class-toggle mechanism (_buildDrawer once, then
// classList.add('open')) rather than create-fresh-panel-per-open - a
// genuinely different pattern that would need its own migration, not a
// drop-in fit for this helper.
RPGACE.ui.slideInPanel = function(panel, opts) {
  opts = opts || {};
  var edge = opts.edge || 'right';
  panel.style.transform = edge === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
  panel.style.transition = 'transform .28s var(--ease-drawer)';
  document.body.appendChild(panel);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
  });
};
RPGACE.ui.slideOutPanel = function(panel, edge) {
  if (!panel) return;
  panel.style.transform = edge === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
  setTimeout(function() { panel.remove(); }, 280);
};
/* ===END:uiSlidePanel=== */
