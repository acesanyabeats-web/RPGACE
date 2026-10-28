
/* ===MODULE:authGate=== */
// July 23 — Tier 3 security fix, Alex-authorized ("do now"). Real problem
// (confirmed by the /5thDimension Phase 1 audit): CORRECT_PW lived as a
// plain string in main.js, shipped to every browser and trivially
// readable via view-source; separately, every /api/*.js endpoint had
// ZERO server-side auth - anyone who found the URL could invoke Oracle/
// Composio actions directly, bypassing the password screen entirely.
// Both are fixed by the SAME mechanism: the real password check now
// happens server-side (api/auth.js, comparing against process.env.
// CORRECT_PW - never shipped to the client), and on success the server
// hands back a shared secret (process.env.RPGACE_API_SECRET) that gets
// attached to every subsequent /api/* call via the single fetch() wrap
// below - not 26 separate call-site edits (main.js's own 15 + this
// file's 11), one real choke point, matching Alex's own "same steps
// must go through one pipeline" rule from this same session.
// main.js's checkPassword() (FROZEN, one deliberate logged exception,
// see patch_notes.html) now calls window.RPGACE_verifyPassword(pw)
// instead of comparing a local constant - CORRECT_PW itself is removed
// from main.js entirely, so the real value is never shipped to a browser.
// Runs immediately at parse time (like pwaInstall just above), not
// gated behind rpgace:ready - it needs to exist before any human could
// plausibly type a password and hit Enter.
RPGACE.register('authGate', {
  domain: 'platform',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 38 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // Real, security-critical module — handled with extra care given
  // genuine Tier-3 sensitivity (this IS the auth chain, not a normal UI
  // module). Splits 0 ui / 2 logic — a genuine "empty ui" case: `verify()`
  // is a pure fetch()+state-write, `_installFetchWrap()` patches the
  // GLOBAL `window.fetch` function itself — neither has a single
  // document.*/createElement/innerHTML/querySelector call anywhere,
  // checked directly rather than assumed, given how much this file
  // relies on this module working correctly.
  //
  // `_apiSecret` stays a module-scope field, unchanged — it is read
  // DIRECTLY by an external caller via
  // `RPGACE.modules.authGate._apiSecret` (morningBrief.logic._autoRun,
  // ×2, a readiness probe before firing Composio calls, confirmed by
  // grep) — moving it into either sub-namespace would silently break
  // both of those real external reads. `init` stays a literal top-level
  // no-op (RPGACE.register() calls `module.init()` directly and cannot
  // see into a sub-object) — byte-identical, same reasoning as
  // pwaInstall's own no-op init(). Two more real, load-bearing external
  // touchpoints, confirmed by grep, not assumed: `window.
  // RPGACE_verifyPassword` calls `RPGACE.modules.authGate.verify(pw)`;
  // the line right after this register() block calls
  // `RPGACE.modules.authGate._installFetchWrap()` immediately at parse
  // time. Both preserved via the pass-throughs below.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    // No-op: setup runs immediately below, outside init() - same
    // reasoning as pwaInstall's own no-op init().
  },

  _apiSecret: null,
  DEVICE_KEY: 'rpgace_device_auth',

  // ============================================================
  // logic — business logic/data: zero DOM anywhere in this module.
  // ============================================================
  logic: {

  // Called by main.js's wrapped checkPassword(). Returns a real
  // true/false the wrap can act on, unlike the old synchronous
  // client-side compare this replaces.
  verify: function(pw) {
    var self = RPGACE.modules.authGate;
    return fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    }).then(function(res) {
      return res.json().then(function(data) { return { ok: res.ok, data: data }; });
    }).then(function(r) {
      if (r.ok && r.data && r.data.ok && r.data.secret) {
        self._apiSecret = r.data.secret;
        // Oct 10 2026: remember this device (Alex: "i hate that im always
        // logged out"). Cleared by "Sign out on this device".
        try { localStorage.setItem(self.DEVICE_KEY, r.data.secret); } catch (e) {}
        return true;
      }
      return false;
    }).catch(function(e) {
      console.warn('[RPGACE authGate] verify failed', e.message);
      return false;
    });
  },

  // Oct 10 2026 — remembered-device sign-in. Resolves true (secret valid,
  // now attached to /api/* calls), false (rejected - forgotten, so the
  // password screen shows) or null (offline/server error - kept for next time).
  resume: function(token) {
    var self = RPGACE.modules.authGate;
    return fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token }) })
      .then(function(res) {
        if (res.ok) { self._apiSecret = token; return true; }
        if (res.status === 401) { try { localStorage.removeItem(self.DEVICE_KEY); } catch (e) {} return false; }
        return null;
      }).catch(function() { return null; });
  },

  storedToken: function() {
    try { return localStorage.getItem(RPGACE.modules.authGate.DEVICE_KEY); } catch (e) { return null; }
  },

  // Skip the password screen when this device is remembered: wait for the
  // legacy checkPassword wrap (which fires rpgace:login), then run the
  // normal login sequence with the already-verified secret.
  autoLogin: function() {
    var self = RPGACE.modules.authGate;
    var token = self.logic.storedToken();
    if (!token) return;
    var err = document.getElementById('gate-error');
    if (err) err.textContent = 'Signing in…';
    self.logic.resume(token).then(function(ok) {
      if (err && err.textContent === 'Signing in…') err.textContent = '';
      if (!ok) return;
      var tries = 0;
      (function go() {
        var gate = document.getElementById('gate');
        if (gate && gate.style.display === 'none') return;
        if (!window._rpgaceLoginWrapped || typeof window.checkPassword !== 'function') {
          if (++tries < 50) setTimeout(go, 100);
          return;
        }
        window._rpgaceAutoLogin = true;
        window.checkPassword();
      })();
    });
  },

  forget: function() {
    var self = RPGACE.modules.authGate;
    try { localStorage.removeItem(self.DEVICE_KEY); } catch (e) {}
    self._apiSecret = null;
    location.reload();
  },

  // Global fetch() wrap: attaches the shared secret to every /api/*
  // request except /api/auth itself (which doesn't have the secret yet -
  // that's the whole point of it). Installed once, immediately, so it
  // covers every one of the ~26 real call sites across main.js and this
  // file without touching any of them individually - real deduplication
  // (one shared pipeline instead of many hand-rolled copies), not just a
  // security fix.
  _installFetchWrap: function() {
    var self = RPGACE.modules.authGate;
    if (window._authGateFetchPatched) return;
    window._authGateFetchPatched = true;
    var origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url);
        if (url && url.indexOf('/api/') === 0 && url !== '/api/auth' && self._apiSecret) {
          init = init || {};
          if (init.headers instanceof Headers) {
            init.headers.set('X-RPGACE-Auth', self._apiSecret);
          } else {
            init.headers = Object.assign({}, init.headers || {}, { 'X-RPGACE-Auth': self._apiSecret });
          }
        }
      } catch (e) { /* never let the wrap itself break a real request */ }
      return origFetch(input, init);
    };
  }

  },

  // ============================================================
  // ui — genuinely empty. Zero DOM anywhere in this module (checked
  // directly, not assumed) — declared explicitly rather than omitted,
  // matching the established "empty namespace" precedent elsewhere in
  // this series (e.g. youtubeOracle.logic, ciAutoPropose.ui).
  // ============================================================
  ui: {},

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoints: `window.
  // RPGACE_verifyPassword` calls `RPGACE.modules.authGate.verify(pw)`;
  // the line immediately after this register() block calls
  // `RPGACE.modules.authGate._installFetchWrap()` at parse time.
  verify: function(pw) { return this.logic.verify(pw); },
  _installFetchWrap: function() { return this.logic._installFetchWrap(); },
  forget: function() { return this.logic.forget(); },

});
RPGACE.modules.authGate._installFetchWrap();
window.RPGACE_verifyPassword = function(pw) {
  // Remembered-device path: the secret was already checked by resume().
  if (window._rpgaceAutoLogin) { window._rpgaceAutoLogin = false; return Promise.resolve(true); }
  return RPGACE.modules.authGate.verify(pw);
};
(function() {
  var start = function() { RPGACE.modules.authGate.logic.autoLogin(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
// "Sign out on this device" at the foot of the left-nav drawer.
RPGACE.hooks.on('rpgace:login', function() {
  setTimeout(function() {
    var d = document.getElementById('ln-drawer');
    if (!d || document.getElementById('ln-signout')) return;
    var b = document.createElement('button');
    b.id = 'ln-signout'; b.type = 'button';
    b.textContent = '🔒 Sign out on this device';
    b.style.cssText = 'display:block;width:calc(100% - 24px);margin:16px 12px;min-height:40px;background:none;border:1px solid rgba(226,226,236,0.15);border-radius:8px;color:rgba(226,226,236,0.55);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    b.onclick = function() { RPGACE.modules.authGate.forget(); };
    d.appendChild(b);
  }, 1500);
});
/* ===END:authGate=== */
