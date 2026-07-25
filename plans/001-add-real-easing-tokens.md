# 001 — Replace bare `ease` with real easing tokens everywhere

- **Status**: DONE
- **Commit**: e6867e7
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 2 files (style.css, rpgace_core.js), ~23 call sites + 1 new token block

## Problem

Zero `ease-out` or `ease-in-out` exists anywhere in the codebase (confirmed by grep across both files). Every entrance/exit animation — drawer slide-ins, the `popIn`/`fadeIn` modal keyframes, the dashboard card stagger, toast fades — uses the bare CSS `ease` keyword, which is a weak curve that starts slow. Entering/exiting UI should feel responsive (`ease-out`), not sluggish. This is the same finding CLAUDE.md logged from the July 25 Aintergration audit and left unfixed at the time.

Current code (representative sample — 23 total sites use bare `ease`):

```css
/* style.css:19 — current */
.gate-box{...animation:fadeIn .5s ease}
/* style.css:183 — current */
.popup{...animation:popIn .25s ease}
```

```js
// rpgace_core.js:702 — current (prodOraclePanel drawer, one of 6+ identical duplicates)
panel.style.cssText = '...transform:translateX(100%);transition:transform .28s ease;';
```

```js
// rpgace_core.js:4744 — current (dashDeck card entrance)
'.dd-card{...transition:border-color .2s,transform .15s;animation:ddRiseIn .35s ease both;cursor:pointer}'
```

## Target

Add two real tokens to `style.css`'s existing `:root` block (alongside `--gold`, `--text`, `--green`, etc. — the block already fixed for WCAG contrast this session):

```css
:root{
  ...
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer curve */
}
```

Then replace bare `ease` at every site:
- **Drawer/panel slide-ins** (translateX transform transitions) → `var(--ease-drawer)`.
- **Everything else** (modal `popIn`/`fadeIn`, dashboard card `ddRiseIn`, hover/border-color transitions, `spin`, `shake`) → `var(--ease-out)`.

`rpgace_core.js` builds these as inline CSS strings inside JS (`cssText`/string-concatenated `<style>` blocks), not `<link>`ed stylesheets — `var(--ease-out)` and `var(--ease-drawer)` resolve fine there since they're plain CSS custom properties read from the page's already-loaded `style.css` `:root`, same mechanism the file already relies on for `var(--gold)` etc. throughout.

```css
/* target */
.gate-box{...animation:fadeIn .5s var(--ease-out)}
.popup{...animation:popIn .25s var(--ease-out)}
```

```js
panel.style.cssText = '...transform:translateX(100%);transition:transform .28s var(--ease-drawer);';
```

## Repo conventions to follow

- Tokens live in `style.css`'s `:root` block (top of file) — this session already added/fixed tokens there (`--muted:#868db8`), same block, same pattern.
- `rpgace_core.js` already reads CSS custom properties inside JS-built inline styles elsewhere (e.g. `background:rgba(var(--blue-rgb),.08)`), so `var(--ease-out)` inside a `cssText` string is the established idiom, not a new one.

## Steps

1. In `style.css`, inside the existing `:root{...}` block, add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` and `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);`.
2. In `style.css`, replace every bare `ease` inside a `transition:`/`animation:` declaration with `var(--ease-out)` (5 keyframe/transition sites: `.gate-box`, `.gate-input.error` (`shake`), `.popup`, `.levelup-overlay.show`, `.learn-status.loading::before` (`spin` — leave `linear`, that one is correct as-is per AUDIT.md category 2, do not touch), `#focus-concept-panel`).
3. In `rpgace_core.js`, replace bare `ease` with `var(--ease-drawer)` specifically at the 6+ drawer/panel `translateX(100%)` slide-in sites (lines ~702, 814, 918, 1120, 3034, 7490, 13368, plus the `.3s ease` variant at ~1889).
4. In `rpgace_core.js`, replace bare `ease` with `var(--ease-out)` everywhere else it appears (dashDeck `ddRiseIn` keyframe animation and its `#dd-needs` usage, and any remaining transition/animation site not covered by step 3).
5. Do not touch the one `linear` easing (`spin` keyframe, both files) — constant-motion loading spinners are correctly `linear` per AUDIT.md category 2.

## Boundaries

- Do NOT touch `linear` easing anywhere (loading spinners) — that's already correct.
- Do NOT change any duration values in this plan — durations are addressed only where a separate finding calls for it (none do here).
- Do NOT change markup/structure — CSS/JS style-string values only.
- Do NOT add new dependencies.
- If a bare-`ease` site is found that isn't listed above (grep may surface a couple more given `rpgace_core.js`'s size), apply the same rule: drawer/panel slide-in → `--ease-drawer`, everything else → `--ease-out`. If genuinely ambiguous, leave it and report instead of guessing.

## Verification

- **Mechanical**: `node --check rpgace_core.js` must pass clean. `grep -n "ease[^-]" rpgace_core.js style.css | grep -v "ease-out\|ease-in-out\|linear"` should return zero remaining bare-`ease` matches (excluding the two `linear` spin sites, which contain no `ease` substring anyway).
- **Feel check**: open any right-side drawer panel (e.g. the Prod. Oracle panel) and confirm the slide-in now has a slightly snappier, less mushy start than before — most visible in the first 100ms. Open a popup/modal and confirm the same. In DevTools' Animations panel, set playback to 10% and confirm the drawer's motion front-loads (moves fastest at the start, not the middle) — that's `ease-out`/the drawer curve working, versus the old symmetric `ease` curve.
- **Done when**: zero bare `ease` remains in either file (excluding `linear`), `node --check` is clean, and both a drawer and a modal visibly snap in rather than ease in symmetrically.
