# 002 — Consolidate 6+ duplicated drawer slide-in blocks into one shared helper

- **Status**: DONE
- **Commit**: e6867e7
- **Severity**: HIGH
- **Category**: Cohesion & tokens (duplication)
- **Estimated scope**: 1 file (rpgace_core.js), ~6-8 call sites + 1 new shared helper

## Problem

At least 6 distinct modules each hand-duplicate the identical right-side drawer slide-in pattern as a literal inline string instead of one shared helper — a real instance of CLAUDE.md's own standing rule 8 (code duplication must route through one shared function). A visible side effect of the drift: 2 of these open-call sites use a nested double `requestAnimationFrame`, while the rest use a single one, for the exact same visual effect — meaning the duplication has already diverged, not just repeated identically.

Current code (one of 6+ near-identical duplicates):

```js
// rpgace_core.js:809-853 — prodOraclePanel.open(), current
open: function() {
  if (document.getElementById('prod-op')) { this._close(); return; }
  var self = this;
  var panel = document.createElement('div');
  panel.id = 'prod-op';
  panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(201,168,76,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';
  // ...build header/body/commands...
  document.body.appendChild(panel);
  requestAnimationFrame(function() { requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; }); });
},
_close: function() {
  var p = document.getElementById('prod-op');
  if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
}
```

Other duplicates of the identical pattern (verified, not assumed): `rpgace_core.js:814` (instaOraclePanel), `918` (agentsIntoOracle), `1120` (a 4th panel), `3034` (leftNav drawer — left-anchored, `translateX(-100%)`), `7490` (contentRepurpose or similar), `13368` (another panel). Border color (accent) and width vary per module (that's intentional, keep it); the position/transform/transition/open/close choreography is identical.

## Target

One shared helper in `RPGACE.ui` (create this namespace if it doesn't exist yet — check first) that any module calls instead of hand-rolling the choreography:

```js
// target — new shared helper, RPGACE.ui.slideInPanel
RPGACE.ui = RPGACE.ui || {};
RPGACE.ui.slideInPanel = function(panel, opts) {
  opts = opts || {};
  var edge = opts.edge || 'right'; // 'right' or 'left'
  var closedTransform = edge === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
  panel.style.transform = closedTransform;
  panel.style.transition = 'transform .28s var(--ease-drawer)';
  document.body.appendChild(panel);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
  });
};
RPGACE.ui.slideOutPanel = function(panel, edge) {
  var closedTransform = edge === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
  panel.style.transform = closedTransform;
  setTimeout(function() { panel.remove(); }, 280);
};
```

Each module keeps its own panel-content-building code (header, body, commands — that's genuinely different per module) but replaces its own open/close choreography with the shared calls:

```js
// target — prodOraclePanel.open(), after
open: function() {
  if (document.getElementById('prod-op')) { this._close(); return; }
  var self = this;
  var panel = document.createElement('div');
  panel.id = 'prod-op';
  panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(201,168,76,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;';
  // ...build header/body/commands (unchanged)...
  RPGACE.ui.slideInPanel(panel, {edge:'right'});
},
_close: function() {
  var p = document.getElementById('prod-op');
  if (p) RPGACE.ui.slideOutPanel(p, 'right');
}
```

## Repo conventions to follow

- `RPGACE.register(name, module)` between `/* ===MODULE:x=== */`/`/* ===END:x=== */` markers is the existing convention for new shared functionality — add `slideInPanel`/`slideOutPanel` as a small new module (e.g. `RPGACE.register('uiPanels', {...})` exposing `RPGACE.modules.uiPanels.slideIn`/`slideOut`), OR attach directly to an existing `RPGACE.ui` object if one already exists — check `grep -n "RPGACE.ui\s*="  rpgace_core.js` first before deciding which.
- Use `var(--ease-drawer)` from Plan 001 — this plan depends on Plan 001 shipping first (see plans/README.md for order).
- This is the exact pattern the website-optimization backlog in CLAUDE.md already names as backlog item 2 ("consolidate popup scaffolding") — reuse its reasoning, don't invent a second convention.

## Steps

1. Grep for `RPGACE.ui` to confirm whether a namespace already exists; if not, add a small new registered module near the top of the "shared utilities" section of `rpgace_core.js` (same area as `RPGACE.utils.toast`/`RPGACE.hooks`).
2. Add `slideInPanel(panel, opts)` and `slideOutPanel(panel, edge)` exactly as specified in Target.
3. Migrate each of the 6+ identified call sites (prodOraclePanel, instaOraclePanel, agentsIntoOracle, the panel at line ~1120, contentRepurpose/line ~7490, the panel at line ~13368) to call the shared helpers instead of their own inline `cssText` transform/transition + rAF choreography. Leave each panel's own header/body/content-building code untouched.
4. Migrate `leftNav`'s drawer (line ~3034, left-anchored) the same way, passing `{edge:'left'}`.
5. Delete the now-dead duplicated transform/transition lines and the manual rAF calls at each migrated site.

## Boundaries

- Do NOT change any panel's visual content, width, colors, or z-index — only the open/close choreography.
- Do NOT merge this with Plan 001 in the same edit if Plan 001 hasn't shipped yet — this plan's target code assumes `var(--ease-drawer)` already exists.
- Do NOT touch panels that don't match this exact `translateX(100%|-100%)` pattern (e.g. the centered `popup`/modal class is a different, correctly-different pattern — leave it alone).
- If a call site's structure has drifted further than described here (e.g. a 7th duplicate not listed, or one of the 6 no longer matches), STOP and report instead of forcing it into the helper.

## Verification

- **Mechanical**: `node --check rpgace_core.js` clean. `grep -c "requestAnimationFrame(function() { requestAnimationFrame" rpgace_core.js` should drop from 2 to 0 (both nested double-rAF sites now route through the one shared helper's single rAF-pair, defined once). `grep -c "transform:translateX(100%);transition:transform" rpgace_core.js` should drop to 0 (all migrated).
- **Feel check**: open each of the 6+ migrated panels one at a time (Prod. Oracle, Insta Oracle, Agents, the taxonomy/content panels, leftNav's hamburger drawer) and confirm each still slides in/out exactly as before, with no visible regression in timing or direction. Specifically re-test the 2 panels that previously used double-rAF — confirm they still open reliably (no "flash" of already-open state, no failure to animate) now that they share the single-rAF helper.
- **Done when**: zero duplicated inline slide-in `cssText` blocks remain among the migrated sites, `node --check` is clean, and every migrated panel visually opens/closes identically to before.
