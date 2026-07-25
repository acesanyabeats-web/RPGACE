# 005 — Convert `width`/`max-height` transitions to transform/measured-height

- **Status**: DONE
- **Commit**: e6867e7
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 2 files (style.css, rpgace_core.js), 3 selectors

## Problem

Three sites transition a layout-triggering property (`width` or `max-height`) instead of `transform`, per the performance playbook. Real, but low real-world severity — these are isolated progress bars and one small collapse panel, not scroll- or drag-coupled elements, and a prior session already checked and ruled out these exact 3 sites as the cause of RPGACE's still-unsolved swipe-gesture freeze (leftNav's own drawer already correctly uses `transform`, unrelated to these). Named honestly here as a real but lower-priority cleanup, not re-litigating that investigation.

```css
/* style.css:55 — current */
.bar-fill{height:100%;border-radius:5px;transition:width .6s ease}
```

```js
// rpgace_core.js:1905 — current
'<div id="feynman-progress" style="height:100%;background:#4A8CCC;width:33%;transition:width .4s ease"></div>'
```

```js
// rpgace_core.js:4382 — current
body.style.cssText = 'overflow:hidden;max-height:0;transition:max-height .25s ease;border-top:0 solid rgba(255,255,255,0.05);';
```

## Target

**Progress bars** (`.bar-fill`, `#feynman-progress`) — both already sit inside a fixed-width track and only ever grow left-to-right, which is exactly what `transform:scaleX()` on a `transform-origin:left` element replaces cleanly:

```css
/* target */
.bar-fill{height:100%;border-radius:5px;width:100%;transform:scaleX(0);transform-origin:left;transition:transform .6s var(--ease-out)}
```
(JS call sites that currently set `.style.width = pct+'%'` on `.bar-fill`/`#feynman-progress` must instead set `.style.transform = 'scaleX('+ (pct/100) +')'` — find and update those call sites too, not just the CSS.)

**`#focus-concept-panel`'s expand/collapse** — a true variable-height collapse is the one case in this audit where a layout property genuinely can't be fully avoided without a bigger rewrite (CSS `interpolate-size`/grid-template-rows trick is a real option but changes markup, out of scope per this plan's boundaries). Keep `max-height` but tighten it to the real content height instead of an arbitrary large value, and use the real easing token:

```js
// target — rpgace_core.js:4382
body.style.cssText = 'overflow:hidden;max-height:0;transition:max-height .25s var(--ease-out);border-top:0 solid rgba(255,255,255,0.05);';
// and wherever this panel opens, set max-height to body.scrollHeight + 'px' (measured), not an arbitrary constant —
// check the existing open-toggle code first; if it already measures scrollHeight, only the easing token changes here.
```

## Repo conventions to follow

- Use `var(--ease-out)` from Plan 001 (this plan depends on Plan 001 shipping first).
- Search for every JS call site that sets `.style.width` on `.bar-fill` or `#feynman-progress` before editing the CSS — changing the CSS to `transform:scaleX()` without updating the JS that currently writes `style.width = X+'%'` would silently break the progress bar (it would stay invisible at `scaleX(0)` forever). This is exactly the kind of two-sided change CLAUDE.md's own rule 1 (pull real source before editing) exists to catch — grep first, don't assume.

## Steps

1. Grep `rpgace_core.js` for every place that sets `.style.width` (or `style.cssText` containing `width:`) targeting `.bar-fill` or `#feynman-progress` — there will be at least one JS call site per progress bar that currently writes a percentage width.
2. Update `style.css`'s `.bar-fill` rule and the inline `#feynman-progress` template string as shown in Target.
3. Update each JS call site found in step 1 to set `transform:scaleX(pct/100)` instead of `width:pct+'%'`.
4. For `#focus-concept-panel` (`rpgace_core.js:4382`), change only the easing (`ease` → `var(--ease-out)`); leave `max-height` as the transitioned property. Locate the code that opens/expands this panel and confirm whether it already sets `max-height` to a measured `scrollHeight` value or a hardcoded constant — if hardcoded, change it to measure and use the real `scrollHeight`; if already measured, this step is just the easing swap.

## Boundaries

- Do NOT rewrite `#focus-concept-panel`'s markup into a CSS-grid-rows or `interpolate-size` approach — that's a bigger structural change than this plan's scope (LOW severity, smallest fix only).
- Do NOT touch any other progress-bar-shaped element not named here.
- If step 1's grep finds the width-setting call site is more complex than a simple `style.width = x+'%'` assignment (e.g. it's computed from a CSS class toggle instead), STOP and report rather than forcing the `scaleX` conversion.

## Verification

- **Mechanical**: `node --check rpgace_core.js` clean. `grep -n "transition:width\|transition: width" style.css rpgace_core.js` should return zero matches.
- **Feel check**: trigger whatever fills `.bar-fill` and `#feynman-progress` (find their real trigger points in the app) and confirm the bar still visibly fills left-to-right at the same speed as before — a `scaleX` bar should look identical to a `width` bar when both are anchored `transform-origin:left`, so any visible difference (e.g. it starts from the wrong side, or doesn't fill at all) means the JS call site update in step 3 was missed or wrong. For the focus-concept-panel, expand and collapse it and confirm content isn't clipped early or shows an awkward pause — it should feel identical to before except a marginally snappier finish from the new easing.
- **Done when**: zero `transition:width`/`max-height` on the 2 progress-bar sites (converted to `transform`), `#focus-concept-panel` still uses `max-height` (by design) but with the real easing token, `node --check` is clean, and both progress bars visibly fill correctly after the JS update.
