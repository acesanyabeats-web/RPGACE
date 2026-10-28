
/* ===MODULE:oracleProviderMode=== */
// G34 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan (Aug
// 15 2026), Level 1 only — a real, separate axis from mockOracle's own
// Real/Dummy/Fallback toggle (that one picks WHETHER a real network call
// happens at all; this one picks WHICH real provider answers when it
// does). Alex's own confirmed spec: "Level 1 (Y/N): local Claude vs
// external provider (Moonshot/Luna, dormant, honest-labeled)." Level 2
// (a real Fable/Opus dev-role indicator) is a real, separate, deliberately
// NOT-yet-built piece — Alex is typing down his own real spec for it
// next; this module and its UI leave real room for that (see the
// comment on _injectToggleButton below) without guessing its shape.
//
// Real, load-bearing landmine avoided (found by reading api/oracle.js
// directly, not assumed): the server's `provider` branch runs BEFORE the
// `stream` branch and always returns a plain JSON blob, never SSE — so
// external-provider mode always sends `stream:false`, even from a caller
// that normally streams. main.js's callOracle() forwards the real final
// text to onChunk ONCE at the end when this happens, so a streaming
// caller's UI still renders correctly, just without the word-by-word
// animation (an honest, deliberate UX difference for this mode, not a
// silent bug).
RPGACE.register('oracleProviderMode', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 39 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 6 logic (getMode, isExternal, getProviderName,
  // setProviderName, toggle, cycleProvider) / 2 ui (_injectToggleButton,
  // _renderState). MODE_KEY/PROVIDERS/PROVIDER_KEY stay module-scope
  // constants, read by both namespaces. `init` stays a literal top-level
  // function (RPGACE.register() calls `module.init()` directly and
  // cannot see into a sub-object) — byte-identical.
  //
  // Real, load-bearing external touchpoints, confirmed by grep, not
  // assumed: main.js's legacy Oracle-call chain reads
  // `RPGACE.modules.oracleProviderMode.isExternal()` and
  // `.getProviderName()` directly, both guarded behind
  // `RPGACE.modules.oracleProviderMode &&`. Both preserved via the
  // pass-throughs below.
  // ══════════════════════════════════════════════════════════════════

  MODE_KEY: 'rpgace_oracle_provider',
  // Real, dormant free-tier providers this can route to — same real
  // FREE_TIER_PROVIDERS keys api/oracle.js already defines (rule 8, not
  // re-derived; kept in sync by hand since this is a client-side mirror
  // of a server-side object, same pattern already accepted for
  // SKILL_RIVER-style small constants elsewhere in this codebase).
  PROVIDERS: ['kimi', 'luna'],
  PROVIDER_KEY: 'rpgace_oracle_provider_choice',

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._injectToggleButton(); });
  },

  // ============================================================
  // logic — business logic/data: localStorage read/write, toasts. Zero
  // DOM except the two functions kept in ui below.
  // ============================================================
  logic: {

  getMode: function() {
    var self = RPGACE.modules.oracleProviderMode;
    try { return localStorage.getItem(self.MODE_KEY) === 'external' ? 'external' : 'local'; }
    catch (e) { return 'local'; }
  },
  isExternal: function() {
    var self = RPGACE.modules.oracleProviderMode;
    return self.getMode() === 'external';
  },
  getProviderName: function() {
    var self = RPGACE.modules.oracleProviderMode;
    try {
      var p = localStorage.getItem(self.PROVIDER_KEY);
      return self.PROVIDERS.indexOf(p) !== -1 ? p : 'kimi';
    } catch (e) { return 'kimi'; }
  },
  setProviderName: function(p) {
    var self = RPGACE.modules.oracleProviderMode;
    if (self.PROVIDERS.indexOf(p) === -1) return;
    try { localStorage.setItem(self.PROVIDER_KEY, p); } catch (e) {}
    self._renderState();
  },
  toggle: function() {
    var self = RPGACE.modules.oracleProviderMode;
    var next = self.isExternal() ? 'local' : 'external';
    try { localStorage.setItem(self.MODE_KEY, next); } catch (e) {}
    if (next === 'external') {
      RPGACE.utils.toast('🌐 External provider mode ON (' + self.getProviderName() + ') — dormant until a real API key is configured server-side; a send will fail loud with an honest error until then.', '#4A90E2', 5500);
    } else {
      RPGACE.utils.toast('🔮 Local Oracle (Claude) — real calls resume', '#4CAF82', 3000);
    }
    self._renderState();
  },
  // Right-click cycles which dormant provider is targeted (kimi/luna) —
  // deliberately a secondary interaction, not a 3rd toggle track, since
  // neither is live yet and this keeps the pinned-toggle row uncluttered
  // ahead of Alex's own real Level 2 spec landing on top of this module.
  cycleProvider: function() {
    var self = RPGACE.modules.oracleProviderMode;
    var i = self.PROVIDERS.indexOf(self.getProviderName());
    self.setProviderName(self.PROVIDERS[(i + 1) % self.PROVIDERS.length]);
    RPGACE.utils.toast('Target provider: ' + self.getProviderName(), '#4A90E2', 2000);
  },

  },

  // ============================================================
  // ui — rendering/DOM: the pinned dev-status cluster row.
  // ============================================================
  ui: {

  _injectToggleButton: function() {
    if (document.getElementById('oracle-provider-switch')) return;
    var self = RPGACE.modules.oracleProviderMode;
    // Aug 22 real redesign — this used to be its own separately-styled
    // floating pill, hand-stacked below mockOracle's switch+Scouted
    // button via a hardcoded top:78px offset (3 real widgets bolted onto
    // the same corner across 3 separate builds). Now a plain row in the
    // shared RPGACE.utils dev-status cluster (getDevStatusCluster/
    // addClusterRow) — same real axis distinction as before (WHICH
    // provider, not WHETHER a call happens), just one cohesive panel
    // instead of a 3rd stacked pill.
    var wrap = document.createElement('div');
    wrap.id = 'oracle-provider-switch';
    wrap.title = 'Click: toggle Local Claude ↔ External provider (dormant). Right-click: cycle target provider (kimi/luna).';
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;';

    var track = document.createElement('div');
    track.id = 'oracle-provider-track';
    track.style.cssText = 'position:relative;width:44px;height:22px;border-radius:11px;flex-shrink:0;transition:background .2s ease;';
    var knob = document.createElement('div');
    knob.id = 'oracle-provider-knob';
    knob.style.cssText = 'position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:left .2s ease;';
    track.appendChild(knob);

    var label = document.createElement('span');
    label.id = 'oracle-provider-label';
    label.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.4px;white-space:nowrap;';

    wrap.appendChild(track);
    wrap.appendChild(label);
    wrap.onclick = function() { self.toggle(); };
    wrap.oncontextmenu = function(e) { e.preventDefault(); self.cycleProvider(); };
    RPGACE.utils.addClusterRow(wrap);
    self._renderState();
  },

  _renderState: function() {
    var self = RPGACE.modules.oracleProviderMode;
    var track = document.getElementById('oracle-provider-track');
    var knob = document.getElementById('oracle-provider-knob');
    var label = document.getElementById('oracle-provider-label');
    if (!track || !knob || !label) return;
    if (self.isExternal()) {
      track.style.background = '#4A90E2';
      knob.style.left = '24px';
      label.textContent = '🌐 ' + self.getProviderName();
      label.style.color = '#4A90E2';
    } else {
      track.style.background = 'rgba(255,255,255,0.15)';
      knob.style.left = '2px';
      label.textContent = '🔮 Local';
      label.style.color = 'rgba(226,226,236,0.7)';
    }
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoints: main.js's legacy
  // Oracle-call chain reads `RPGACE.modules.oracleProviderMode.
  // isExternal()` and `.getProviderName()` directly. Also carries this
  // module's own internal calls: `init`'s boot task calls
  // `self._injectToggleButton()`, and every logic/ui function above
  // reaches its siblings through `self.X` — every one of those `self`s
  // is the module, so each lands here first and is routed on to the
  // right namespace.
  getMode: function() { return this.logic.getMode(); },
  isExternal: function() { return this.logic.isExternal(); },
  getProviderName: function() { return this.logic.getProviderName(); },
  setProviderName: function(p) { return this.logic.setProviderName(p); },
  toggle: function() { return this.logic.toggle(); },
  cycleProvider: function() { return this.logic.cycleProvider(); },
  _injectToggleButton: function() { return this.ui._injectToggleButton(); },
  _renderState: function() { return this.ui._renderState(); },

});
/* ===END:oracleProviderMode=== */
