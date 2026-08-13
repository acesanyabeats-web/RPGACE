---
name: paranoia
description: The heaviest possible pre-build scrutiny pass for one proposed update/idea - runs Aintergration+restructure in tandem for real evidence, GODMODE+scope+commit-archaeologist+Omnitrix+5thDimension (no Fable, Opus 5) to reconcile it against real state, debate+free-for-all-debate to stress-test it against Alex's actual workflow, /interrogation to get his real opinions folded in, then a fact-checking Council of 5 pass with /simplify+/scope+/godmode+/commit-archaeologist, and a final /Summary of what can/can't be done, implications, obstacles, code/intercommunication improvements, and output-quality impact - all supervised end-to-end by /Engineer. Use this skill whenever Alex says "/paranoia" or asks for the full-strength version of "what will this update actually do, honestly, pros and cons." Named and defined by Alex Aug 6, verbatim inside a real credit-exhaustion / multi-provider-fallback question. Do NOT use this reflexively - it is deliberately the most expensive protocol in the project (heavier than /5thDimension and /restructure, which it both calls), reserved for a single proposed change Alex wants maximally scrutinized before committing real build time to it. A normal Tier 2 feature stays on the standard Omnitrix Judgment Funnel; this is for when Alex explicitly wants paranoid-level rigor on one specific goal.
---

# /paranoia — maximum-rigor pre-build scrutiny for one proposed update

Alex's own framing (verbatim, Aug 6, inside a real "I'm out of credits, could
we replace Oracle with Gemini/ChatGPT via OmniRoute" question): *"use
/restructure and /aintergration in tandem to see what is purely possible and
what outcomes will come of it using /scope, /godmode and /commit-archaeologist
with /omnitrix and /5thDimension without fable with opus 5, then /debate and
/free-for-all-debate where needed to see what will work with my workflow and
ideas logged and implemented with /interrogation to get my opinions into it,
then council of 5 this outcome with /simplify and /scope /godmode and
/commit-archaeologist to fact check all of it and give me a /Summary of all i
can and cant do, what implications and obstacle come with it, and what
improvements in code, intercommunication of agents ai buttons doms and
functions are, and how output will be improved. use /Engineer to supervise all
stages."* He named the whole bracketed sequence **/paranoia**: *"it visualises
how an update will shape and give honest pros and cons on goal set."*

**Source of truth**: CLAUDE.md's `## Invokable frameworks` section defines
GODMODE/Council of 5/Omnitrix/Aintergration; `restructure`, `debate`,
`free-for-all-debate`, `interrogation`, `5thDimension`, `scope`,
`commit-archaeologist`, `simplify`, `Summary`, and `Engineer` are sibling
skills in this directory. If this file and CLAUDE.md ever disagree, CLAUDE.md
wins and this file is stale.

## The procedure, in order

**Step 1 — Dual research: /restructure + /aintergration in tandem.** Run
both on the same proposed update, in parallel reasoning (not sequentially
re-deriving the same evidence twice — rule 8). Aintergration answers "is
this worth adopting, and for RPGACE the product or this dev session or
both." `/restructure` answers the sharper question: would fitting this
INSTEAD of existing RPGACE-Claude Code infrastructure make code shorter,
faster, or produce better output. Between them this is "what is purely
possible" — the real technical menu, not the wishlist.

**Step 2 — Reconcile against real state.** `/scope` + GODMODE gather the
real current evidence (live code, git, Supabase, deployment state) —
never a doc's claim taken on faith. `/commit-archaeologist` explains why
the CURRENT infrastructure exists the way it does, so Step 1's proposed
change is judged against real history, not a guessed rationale.
`/omnitrix` (Council of 5 + GODMODE, no Fable by default, Opus 5 as
builder for any sketch work) and `/5thDimension` reconcile Step 1's
findings against what's actually built vs. reported, and against Alex's
real goals — same discipline both those skills already hold themselves
to standalone.

**Step 3 — Stress-test against Alex's actual workflow.** `/debate`
(two-team adversarial case-building) and, where the update has more than
two real competing shapes, `/free-for-all-debate` (individual competitors
each picking distinct angles) surface genuine disagreement rather than
a single manufactured verdict. This step exists specifically to catch
"technically correct but doesn't fit how Alex actually works" — the same
failure mode Council of 5's own "why NOT to build this" case exists to
catch, given more adversarial teeth here because /paranoia is reserved
for higher-stakes calls.

**Step 4 — /interrogation: get Alex's real opinions in, don't guess.**
Any genuine fork the first three steps surface — a real design choice
only Alex can make, not one Claude can infer — goes to him directly as a
real, well-scoped question, per `/interrogation`'s own standing rule.
This step is not optional ceremony; a /paranoia pass that reaches Step 5
without ever having asked Alex anything real has skipped the step.

**Step 5 — Fact-check via Council of 5 + /simplify + /scope + /godmode +
/commit-archaeologist.** A second, independent pass — not the same
people re-reading their own conclusions. `/simplify` checks the proposed
outcome for real reuse/efficiency/altitude problems the earlier steps
may have missed while focused on the adopt/reject question. `/scope` +
GODMODE + `/commit-archaeologist` re-verify the whole chain's factual
claims against live evidence one more time before anything is reported
as true. This is the step that keeps /paranoia honest — everything
above is allowed to be wrong; this step is where it gets caught.

**Step 6 — /Summary: the actual deliverable.** One real, evidence-
checked account covering exactly what Alex asked for: what he can and
can't do with the proposed update, the real implications and obstacles,
what it would improve about code quality / intercommunication between
agents, AI, buttons, DOMs, and functions, and how real output quality
would change. This is a report, same as `/restructure`'s "rebirth of
RPGACE" deliverable — /paranoia never ships code on its own authority.
A Tier-3 fork inside the recommendation always still needs Alex's own
explicit go-ahead.

**Throughout — /Engineer supervises.** Not as a 7th sequential step but
as the standing discipline across all six: real goal contract before
starting, real evidence at every stage, a Council of 5 report written
from what actually happened (not recalled from memory), and an
independent Truth Check on the final /Summary before it's handed to
Alex as fact.

## Real tie-in, Aug 13 — when a /paranoia pass finds a regression

Step 2 and Step 5 both gather real evidence against live code/Supabase/
deployment state — if that evidence contradicts an EXISTING `/perspective`
baseline (`perspective_reports.expected_behavior`) for the scope being
scrutinized, that's not just a finding for the Step 6 `/Summary` — it's a
real regression, and it routes through the exact same mechanism
`/perspective`'s own Step 5 defines: a stable `error_code`, a real
`error_log` row (rationale + backtrack_note), and — if the scope had a
`ceo_plan_items` row that was genuinely green — a flip to `/colourgradient`
purple. `/paranoia` never re-derives this routing itself (rule 8); it
defers to `/perspective`'s own procedure the moment it recognizes the
shape. Named explicitly here because Alex's own real ask ("this could be
paired with /perspective and /paranoia... any difference... highlights as
purple if broken now") means a `/paranoia` pass is a real, valid SOURCE of
a purple finding, not just `/perspective` running standalone.

## Guardrails

- **This is genuinely the heaviest protocol in the project — heavier
  than `/5thDimension` and `/restructure`, which it both calls as
  sub-steps.** Reserve it for exactly what Alex named it for: a single
  proposed update he wants maximally, paranoidly scrutinized before
  committing real build time — not a default for every feature request.
  A normal Tier 2 item stays on the standard Judgment Funnel in the
  `omnitrix` skill.
- **Token cost (rule 11) is not suspended by the word "/paranoia."** If
  Alex is visibly resource-constrained when he invokes it (his own
  stated case, Aug 6: "im officially out of credits"), say so directly
  and propose a right-sized version — reuse existing evidence/verdicts
  rather than re-deriving them, defer the full heaviest pass to when
  resource pressure has eased — rather than mechanically executing all
  six steps at maximum cost because the skill names were said. This is
  the same judgment call rule 11 already asks for everywhere else in
  this project, made explicit here because /paranoia is the single most
  expensive named sequence and therefore the one most likely to be
  invoked exactly when restraint matters most.
- **Never manufactured balance.** Step 3's debate and Step 5's fact-check
  must be real — if the honest answer is "yes, unambiguously adopt this"
  or "no, this doesn't work at all," say so plainly rather than padding
  out artificial tension on both sides, same standing rule every other
  debate-shaped skill in this project already holds itself to.
- **A `/paranoia` verdict is not itself a build authorization.** Same
  boundary as GODMODE's own: more rigor never means less confirmation.
  Anything the resulting `/Summary` recommends that touches Tier 3
  territory (spend, destructive ops, architecture reversal) still needs
  Alex's explicit go-ahead, exactly like everywhere else in this file's
  parent CLAUDE.md.
