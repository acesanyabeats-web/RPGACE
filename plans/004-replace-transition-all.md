# 004 — Replace `transition: all` with explicit properties

- **Status**: DONE
- **Commit**: e6867e7
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file (style.css), ~24 selectors + 1 in rpgace_core.js

## Problem

`transition: all` appears on nearly every interactive button/card selector in `style.css` (confirmed by grep: 24 occurrences) plus 1 in `rpgace_core.js`. Per the audit playbook, `transition: all` is always a finding — it makes the browser watch every animatable property for changes instead of only the ones that actually transition, which is wasted work even when (as here) the real intent is just background/border/color.

Current code (representative — all 24 style.css sites follow this exact shape, only the selector and duration differ):

```css
/* style.css:27 — current */
.gate-btn{...transition:all .2s}
/* style.css:71 — current */
.quest-card{...transition:all .2s;position:relative;overflow:hidden}
/* style.css:95 — current */
.sched-tab{...transition:all .2s}
```

```js
// rpgace_core.js:12020 — current
chip.style.cssText = '...transition:all .15s;';
```

Full list of `style.css` selectors using `transition:all` (verified by grep, line numbers as of commit e6867e7): `.gate-btn:27`, `.quest-card:71`, `.complete-btn:89`, `.sched-tab:95`, `.month-task:115`, `.add-month-task:119`, `.drop-zone:125`, `.import-method-btn:132`, `.import-btn:138`, `.mode-btn:152`, `.agent-btn:154`, `.send-btn:161`, `.popup-btn:190`, `.levelup-btn:201`, `.skill-node:206`, `.pipeline-input-zone:221`, `.type-chip:229`, `.chain-step:240`, `.learn-btn:269`, `.enc-cat-btn:272`, `.enc-sort-btn:274`, `.video-card:283`, `.db-item:307`, `.db-btn:313`, `.dur-btn:398`, `#focus-concept-panel:420`, `.prod-cmd-btn:448`.

For every one of these, the actual properties that change on hover/state are exclusively `background`, `border-color`, and/or `color` (verified by reading each selector's `:hover`/`:active`/state rules — none of them animate width, height, padding, margin, or box-shadow on state change).

## Target

Replace `transition:all <duration>` with the exact properties that change, same duration:

```css
/* target */
.gate-btn{...transition:background .2s,border-color .2s,color .2s}
.quest-card{...transition:background .2s,border-color .2s,color .2s;position:relative;overflow:hidden}
.sched-tab{...transition:background .2s,border-color .2s,color .2s}
```

```js
chip.style.cssText = '...transition:background .15s,border-color .15s,color .15s;';
```

Note: `#focus-concept-panel` (line 420) also transitions `max-height` — that site is addressed separately by Plan 005 and should use whatever property list Plan 005 leaves it with; do not re-add `all` there once Plan 005 has converted it.

## Repo conventions to follow

- Keep the existing per-selector duration exactly as-is (`.15s`, `.2s`, `.3s`) — this plan only narrows the property list, it does not change timing (that's out of scope; no finding called for changing any of these durations).
- If a specific selector's actual hover rule only changes one or two of background/border-color/color (not all three), list only the properties that selector actually uses — check each selector's own `:hover`/`:active`/`.active`/`.selected` rule before writing the replacement, don't blanket-apply all three to every selector without checking.

## Steps

1. For each of the 26 sites listed in Problem (24 in `style.css`, 1 in `rpgace_core.js`, excluding `#focus-concept-panel` which Plan 005 owns), read that selector's own state rules (`:hover`, `:active`, `.active`, `.selected`, etc. — whatever modifies it) to confirm which of `background`/`border-color`/`color` (or occasionally just one) actually changes.
2. Replace `transition:all <duration>` with the confirmed explicit property list at that same duration, comma-separated (e.g. `transition:background .2s,border-color .2s,color .2s`).
3. Leave every other declaration on each selector unchanged (no reordering, no duration changes, no touching non-transition properties).

## Boundaries

- Do NOT touch `#focus-concept-panel` (`rpgace_core.js:4382`, using `max-height`) — that's Plan 005's responsibility; converting it here would conflict with Plan 005's target state.
- Do NOT change any duration values.
- Do NOT add `transform` to any of these 26 sites' transition lists unless that selector already has a `:hover`/`:active` transform rule elsewhere (check first — most don't; `.quest-card`/`.video-card`/`.dd-card` do have separate transform-on-hover rules covered by Plan 003, but those are gated inside a media query as a *second* transition rule, not merged into this one — keep them as two separate rules per Plan 003's own target code, don't consolidate).
- If any listed selector's actual changing properties don't match background/border-color/color (i.e. this plan's own recon was wrong for that one site), STOP and report that specific selector rather than guessing.

## Verification

- **Mechanical**: `node --check rpgace_core.js` clean. `grep -c "transition:all\|transition: all" style.css rpgace_core.js` should drop from 26 to 0 (or to 1, if `#focus-concept-panel` is deliberately left for Plan 005 to handle — confirm which plan actually lands last and executes the fix there).
- **Feel check**: hover over a handful of the migrated buttons/cards (`.gate-btn`, `.quest-card`, `.sched-tab`, `.send-btn`) and confirm the hover feedback (background/border/color change) looks and times identically to before — this is a no-visible-difference fix, its entire value is removing unnecessary property-watching, not changing what's seen.
- **Done when**: no bare `transition:all` remains outside the one site Plan 005 owns, `node --check` is clean, and hover feedback is visually unchanged on a sample of migrated elements.
