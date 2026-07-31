# /free-for-all-debate — individual competitors, not two teams

Alex named and defined this July 31, as a variant of the existing `/debate`
skill for a specific shape of problem: several REAL, genuinely distinct
problems need solving in the same pass, and forcing them all through one
FOR/AGAINST pairing (like `/debate` does) would flatten real differences
between the problems into one artificial two-sided fight. This skill exists
for exactly that case — multiple problems, each argued on its own terms.

## When to use this instead of `/debate`

`/debate` is for ONE real tension — two positions that genuinely conflict
on the SAME question. Use `/free-for-all-debate` when Alex hands over
several (2+) real, separate problems at once and wants each one argued
through properly rather than rushed past on the way to the next. If there's
only one real problem, `/debate` (or no debate at all — see its own
guardrails) is the right tool; don't force this skill onto a single-issue
case just because it was named more recently.

## The procedure, in order

1. **Split into individual competitors, not teams.** Every real problem in
   scope gets a pool of individual "competitors" (a competitor is a
   distinct angle of attack on that problem, not a person) — each
   competitor picks exactly 2 of the real problems to argue for (Alex's
   own framing: "pick 2 problems each"). This is deliberately NOT the
   `/debate` skill's FOR/AGAINST structure — it's a genuine free-for-all
   where multiple competitors can converge on the same problem from
   different angles and disagree with each other, not just with an
   opposing team.
2. **Same-problem competitors argue directly against each other.**
   Whenever two or more competitors picked the same problem, they debate
   each other specifically (not the field in general) — same GODMODE
   evidence discipline as `/debate` (cite the actual code, the actual row,
   the actual constraint — no vague assertions), same "a weak point that
   doesn't survive interrogation gets dropped, not carried forward" rule.
   Every competitor may use `/5thDimension` and `/Omnitrix` (Fable optional,
   Opus available — same "without Fable by default" convention as
   `/Routine`/`/Summary`), may put direct questions to `/Engineer` (asking
   whether a proposed angle is actually buildable, not asking Engineer to
   build yet), and may invoke `/Godmode` + `/scope` for deeper evidence.
3. **Converging points get merged, not fought over.** When multiple
   competitors land on compatible or complementary points for the same
   problem (Alex's own framing: "all excellent points that can work in
   tandem"), they're combined rather than treated as rivals that need a
   single winner — this skill is hunting for the best real combined answer
   per problem, not a single "winning" competitor.
4. **Council of 5 turns the surviving points into one step-by-step plan.**
   Using `/scope` + `/Godmode` + `/commit-archaeologist` (git-history
   context on why the current code is shaped the way it is, before
   proposing to reshape it) to produce one practical, ordered plan per
   problem — real risk, real cost, real sequencing (which sub-fix has to
   land before another can), same rigor `/debate`'s own Council-of-5
   cleanup step applies.
5. **Hand off to `/Engineer`.** The Council of 5 plan is the goal
   contract `/Engineer` executes — same as any other Tier 2 build, no
   separate confirmation ceremony required beyond what `/Engineer` itself
   already does, unless a real fork surfaces that only Alex can decide.

## Guardrails

- Never let the debate itself write code or touch the database — same
  boundary as `/debate` — a point "winning" the argument is not the same
  as it being built; building happens in step 5, through `/Engineer`.
- Scale the ceremony to the real number of problems and their real size.
  Two small, well-scoped problems (the common real case) don't need a
  dozen named competitors and multi-round transcripts — a concise pass
  that genuinely applies steps 1-4 is enough. Don't manufacture extra
  competitors or extra rounds just to look thorough; that wastes exactly
  the token budget this project's own rules (CLAUDE.md rule 11) treat as
  a real design constraint.
- Same honesty rule as `/debate`: a real disagreement stays visible in the
  final plan (as an explicit fork for Alex, if Council of 5 can't resolve
  it on evidence alone) rather than smoothed into false consensus.
