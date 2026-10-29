
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
    // Oct 29 2026 (phone alarm test): an installed app stays open for days, so MacroDroid's "Launch RPGACE"
    // brought back a copy loaded before that night's changes. When RPGACE comes back to the screen it now asks
    // for index.html (no cache) and reloads once if the rpgace_core.min.js?v= stamp there is newer than its own.
    _version: function(html) {
      var m = /rpgace_core\.min\.js\?v=([0-9a-z]+)/.exec(html || '');
      return m ? m[1] : null;
    },
    _checkUpdate: function() {
      var L = RPGACE.modules.pwaInstall.logic, now = Date.now();
      if (now - (L._checkedAt || 0) < 60000) return Promise.resolve(false);
      L._checkedAt = now;
      var tag = document.querySelector('script[src*="rpgace_core.min.js?v="]'), mine = tag ? L._version(tag.getAttribute('src')) : null;
      if (!mine || typeof fetch !== 'function') return Promise.resolve(false);
      return fetch('/index.html?u=' + now, { cache: 'no-store' }).then(function(r) { return r.ok ? r.text() : ''; }).then(function(html) {
        var live = L._version(html);
        if (!live || live === mine) return false;
        console.log('[RPGACE] newer version ' + live + ' (running ' + mine + ') - reloading');
        location.reload();
        return true;
      }).catch(function() { return false; });
    },
    _watchUpdates: function() {
      if (typeof document === 'undefined') return;
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') RPGACE.modules.pwaInstall.logic._checkUpdate();
      });
    },
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
RPGACE.modules.pwaInstall.logic._watchUpdates();
/* ===END:pwaInstall=== */
