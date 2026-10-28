
/* ===END_DOMAIN:SCHEDULE=== */

/* ===MODULE:pwaInstall=== */
// July 22: makes RPGACE a real installable PWA (Android/desktop "Add to
// Home Screen"/"Install app"). Registration has zero dependency on
// RPGACE.CONFIG or login state, so it runs immediately at parse time
// rather than waiting behind the rpgace:ready gate - the earlier a
// browser sees a valid SW + manifest, the sooner it offers the install
// prompt. Belongs in rpgace_core.js (not a new <script> tag - see the
// "never add a static script tag" landmine) since it's plain JS logic,
// not an external library needing its own file.
RPGACE.register('pwaInstall', {
  domain: 'platform',

  // G53 (Sep 2026), module 21 of 60: split into ui/logic. init is a
  // real, deliberate no-op (see its own comment) and stays literal
  // top-level. _register is the only movable function: zero DOM
  // (feature-detects `serviceWorker in navigator`, then a real async
  // Service Worker API call) - it lands in logic, and ui is genuinely
  // empty, stated outright. Handled directly (self-verified: node
  // --check + a headless call-through test), not dispatched, given
  // the trivial single-function scope. Called from module-scope right
  // after registration (`RPGACE.modules.pwaInstall._register()` below,
  // unchanged) via the top-level pass-through - no external caller
  // (confirmed via a repo-wide grep) beyond that one immediate call.
  init: function() {
    // No-op: registration already ran below, outside init(). This module
    // exists mainly so failures show up in RPGACE's normal module-init
    // logging/console conventions rather than as a silent bare call.
  },

  logic: {
    _register: function() {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('/sw.js').then(function(reg) {
        console.log('[RPGACE] Service worker registered', reg.scope);
      }).catch(function(err) {
        console.warn('[RPGACE] Service worker registration failed', err.message);
      });
    }
  },

  ui: {},

  _register: function() { return this.logic._register(); },

});
RPGACE.modules.pwaInstall._register();
/* ===END:pwaInstall=== */
