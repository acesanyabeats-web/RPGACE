# 003 — Gate hover-transform rules behind `@media (hover:hover) and (pointer:fine)`

- **Status**: DONE
- **Commit**: e6867e7
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files (style.css, rpgace_core.js), 3 selectors

## Problem

Zero `@media (hover: hover) and (pointer: fine)` gating exists anywhere in the codebase (confirmed by grep — no matches in either file). Three selectors apply a `transform` on `:hover`, which on touch devices can fire from a tap and "stick" until the user taps elsewhere (a false hover with no way to clear it via touch alone):

```css
/* style.css:76 — current */
.quest-card:hover{border-color:var(--border2);transform:translateY(-1px)}

/* style.css:284 — current */
.video-card:hover{border-color:var(--border2);transform:translateX(2px)}
```

```js
// rpgace_core.js:4749 — current (dashDeck, the primary dashboard nav — highest-traffic surface in the app)
'.dd-card:hover{border-color:var(--border2);transform:translateY(-2px)}.dd-card:active{transform:translateY(0)}'
```

## Target

Wrap each hover-transform rule in the pointer/hover media query. The `:active` press-feedback rule stays ungated (it's touch-correct as-is — it responds to an actual tap, not a hover):

```css
/* target */
@media (hover: hover) and (pointer: fine) {
  .quest-card:hover{transform:translateY(-1px)}
}
.quest-card:hover{border-color:var(--border2)} /* color change is fine on touch, keep ungated */
```

```css
@media (hover: hover) and (pointer: fine) {
  .video-card:hover{transform:translateX(2px)}
}
.video-card:hover{border-color:var(--border2)}
```

```js
// target — rpgace_core.js:4749
'@media (hover:hover) and (pointer:fine){.dd-card:hover{transform:translateY(-2px)}}' +
'.dd-card:hover{border-color:var(--border2)}.dd-card:active{transform:translateY(0)}'
```

## Repo conventions to follow

- `rpgace_core.js` already builds `<style>` block content as string-concatenated lines pushed into an array then joined (see the existing `dashDeck` style-injection code around line 4744) — add the new `@media` line using the identical string-concatenation idiom, not a template literal (this file targets older syntax throughout — check surrounding code style before writing new lines).
- Split each hover rule into a transform-only part (gated) and a color/border-only part (ungated) rather than gating the whole selector — the color change is a legitimate touch affordance and shouldn't disappear on mobile.

## Steps

1. In `style.css`, split `.quest-card:hover{border-color:var(--border2);transform:translateY(-1px)}` into two rules as shown in Target — the `border-color` half stays a plain `:hover` rule, the `transform` half moves inside the new media query.
2. In `style.css`, do the same split for `.video-card:hover{border-color:var(--border2);transform:translateX(2px)}`.
3. In `rpgace_core.js`, do the same split for `.dd-card:hover{border-color:var(--border2);transform:translateY(-2px)}` at line ~4749, leaving `.dd-card:active{transform:translateY(0)}` untouched (it's tap-triggered, already correct).

## Boundaries

- Do NOT gate `:active` rules — those respond to a real tap/click and are correct as-is on touch.
- Do NOT gate color/border-color-only hover changes — only the `transform` component needs gating.
- Do NOT touch any other `:hover` rule not listed here (this plan's grep already confirmed these are the only 3 hover-transform sites in the codebase).

## Verification

- **Mechanical**: `node --check rpgace_core.js` clean. `grep -c "@media (hover: hover) and (pointer: fine)\|@media (hover:hover) and (pointer:fine)" style.css rpgace_core.js` should show 3 new occurrences (one per migrated selector, or fewer if consolidated into one shared media block — either is fine as long as all 3 transforms are covered).
- **Feel check**: on desktop with a mouse, confirm `.quest-card`, `.video-card`, and `.dd-card` still lift/shift on hover exactly as before. On a real touch device (or Chrome DevTools' device toolbar with touch simulation), confirm tapping a `.dd-card` no longer leaves it in a shifted/lifted state after the tap ends — it should return to rest immediately, with only the border-color/press feedback visible during the tap itself.
- **Done when**: all 3 transform-hover rules are gated, `node --check` is clean, and touch-simulated taps no longer leave a stuck hover-transform.
