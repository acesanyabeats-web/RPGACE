# Animation improvement plans — July 25, 2026

Written by `/improve-animations` (standard effort, full-repo audit), stamped at commit `e6867e7`. All 5 findings from that audit selected for execution by Alex.

| # | Title | Severity | Category | Status |
|---|---|---|---|---|
| [001](001-add-real-easing-tokens.md) | Replace bare `ease` with real easing tokens everywhere | HIGH | Easing & duration | DONE |
| [002](002-consolidate-drawer-slidein.md) | Consolidate 6+ duplicated drawer slide-in blocks into one shared helper | HIGH | Cohesion & tokens (duplication) | DONE |
| [003](003-gate-hover-transforms.md) | Gate hover-transform rules behind `(hover:hover) and (pointer:fine)` | MEDIUM | Accessibility | DONE |
| [004](004-replace-transition-all.md) | Replace `transition: all` with explicit properties | MEDIUM | Performance | DONE |
| [005](005-fix-layout-transitions.md) | Convert `width`/`max-height` transitions to transform-based | LOW | Performance | DONE |

## Recommended execution order

1. **001 first, always.** It creates `--ease-out`/`--ease-drawer` in `style.css`'s `:root`. Plans 002 and 005 both reference these tokens in their target code and will produce invalid CSS (`var()` referencing an undefined custom property just silently no-ops rather than erroring, but the intended easing simply won't apply) if executed before 001 lands.
2. **002 next.** Depends on 001's `--ease-drawer` token. Touches the same 6+ `rpgace_core.js` call sites that 001 also edits (the bare `ease` at those exact lines) — executing 002 after 001 means 002's migration naturally inherits 001's token instead of re-introducing bare `ease` that 002 would then have to also fix.
3. **003, 004, 005 have no dependency on each other and can execute in any order** after 001 (005 also depends on 001's `--ease-out` token; 003 and 004 don't touch easing at all, no dependency).

## Notes

- Plan 004 explicitly excludes `#focus-concept-panel` (owned by Plan 005) to avoid the two plans fighting over the same selector's `transition` property list.
- Plan 003's hover-transform split and Plan 004's `transition:all` replacement can touch the same selectors (`.quest-card`, `.video-card`) — 003 adds a *second*, separately-gated transition rule for the transform; 004 narrows the *existing* ungated rule's property list. They are not in conflict as long as 004 doesn't add `transform` back into the ungated rule's property list (004's own boundaries section says not to).

## Execution notes — real deviations found while implementing (July 25)

All 5 plans executed same session, in the recommended order. Four real corrections surfaced during implementation that the plans-as-written got wrong or incomplete — recorded here rather than silently absorbed, since the plans are the audit trail:

1. **Plan 002's "2 of 8 panels use double-rAF, the rest use single" claim was false.** A full re-grep during implementation found all 8 real drawer-open call sites use the identical double-nested `requestAnimationFrame` — the original audit's grep only matched one specific single-line formatting of the pattern and missed 4 sites that wrote the same two calls across two lines. The real, surviving finding is just the duplication itself (7 near-identical hand-copied choreography blocks) — the "already diverged" framing is retracted.
2. **A 7th duplicate panel (the `feynman` module's learning-loop drawer) was found and migrated during Plan 002's execution**, not present in the original audit's list of 6. Its transition duration (`.3s`) differed slightly from the other 6 (`.28s`) and its close-timeout (320ms) didn't match either — migrating it to the shared helper standardizes it to 280ms/`.28s`, a deliberate small timing consolidation in the same spirit as the plan's own goal, not an uncontrolled side effect.
3. **`#focus-concept-panel`'s `transition:all` was deliberately left unconverted** (Plan 004's one real exception). Real evidence: it has no JS call site anywhere that changes a transitionable property — its only observed state change is `display:none`/toggling via a static `onclick`, which CSS transitions don't apply to. Per Plan 004's own boundary ("if actual changing properties don't match, STOP and report"), this was reported rather than guessed at.
4. **Plan 004's own note that `#focus-concept-panel` "also transitions max-height" was incorrect** — that max-height transition belongs to a completely different, unrelated element (an inline expand/collapse body inside a list-item renderer, `rpgace_core.js` ~line 4391). The two are unconnected; Plan 004 and Plan 005 never actually competed for the same selector as the note worried they might.
5. **Plan 005's max-height site had a second real bug fixed alongside the easing swap**: the expand toggle used a hardcoded `max-height:400px` ceiling rather than measuring the real content height, meaning any insight body taller than 400px would have been clipped. Changed to `body.scrollHeight + 'px'`, measured at toggle time — a real correctness fix, not scope creep, since Plan 005's own step 4 anticipated exactly this ("if hardcoded, change it to measure and use the real scrollHeight").
