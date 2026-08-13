---
name: misunderstanding
description: Alex's own real-time disconnect-repair tool — when HE feels a gap between what he meant and what an AI (this session, RPGACE Oracle, OpenMontage CC, Graphify CC, or any other Total-system AI) typed back, he pastes the exact confusing text and this runs a fixed 3-step repair (quote what he actually said → state what was understood and why → state the concrete plan going forward) so both sides are provably on the same page before more work happens on a possibly-wrong premise. Use this skill ONLY when Alex explicitly invokes it ("/misunderstanding", or pastes back something an AI said with "this confused me" / similar) — never proactively, and never self-triggered by the AI side, because only Alex can experience his own confusion.
---

# /misunderstanding — Alex's confusion, repaired in 3 fixed steps

Named and defined by Alex Aug 11 2026, built live as its own first worked
example (the "/CEO Grounded Mode retroactive vs. forward-only" open fork
from the same message). His own framing, verbatim: *"its like a /drift
skill for me and you when i feel there is a disconnect in what i think and
what you type. make it only a skill i prompt when im confused. my confusion
can only be experienced by [me], so make sense."*

**The real asymmetry this is built around**: `/drift` checks whether BUILT
WORK matches a STATED PLAN — a question either side can raise, since both
sides can look at the same evidence. Confusion about what a REPLY MEANT is
different — only the person who read it knows whether it landed correctly.
That is why this skill is deliberately **one-directional and Alex-only**:
an AI cannot detect that Alex is confused (it has no access to his internal
state), so it must never try to trigger this on his behalf. This is the
same asymmetry rule 4 already respects for human checkpoints elsewhere in
this project (a machine doesn't get to decide a human understood it).

## The 3 fixed steps, run in order, every time

**Step 1 — Quote it back, verbatim.** Alex pastes the exact text that
confused him (his own words, the AI's own words, or both) — this skill's
FIRST job is to locate and quote back the SPECIFIC source text the
confusing reply was actually built from, not a paraphrase of it. If the
confusing reply drew on something Alex said earlier in the conversation,
find and quote that too — the disconnect usually lives in the gap between
what Alex actually typed and what got read into it, and that gap is
invisible until both texts sit side by side.

**Step 2 — State what was understood, and why.** Explain, plainly, what
the AI took Alex's words to mean, and point at the SPECIFIC words or
phrasing that led to that reading. This is not a defense or an apology —
it is real, checkable evidence Alex can look at and say "yes, that's what
I meant" or "no, here's the actual gap." Same evidentiary standard as
`/drift`'s own findings: a real citation, never an assertion alone.

**Step 3 — State the concrete plan going forward.** Once Step 1 and 2 make
the gap (or the lack of one) visible, state plainly what happens next —
either "this was correct, proceeding as planned" or a real, updated plan
reflecting Alex's actual intent. Never leave this step vague ("I'll keep
that in mind") — a plan Alex can't verify against later isn't a real plan,
same discipline as every other RPGACE protocol's own reporting standard.

## A RPGACE Total-systems skill, not just this session's

Alex's own explicit ask: *"make it a RPGACE total systems skill too, so i
can always ask any extranal ai or oracle ai or orchestrator CC and other
CCs to close this gap, very valuable."* Real, honest scope given the
standing Total-systems constraint (CLAUDE.md's own "Total" section):
OpenMontage CC / Graphify CC / any future Total-system member cannot literally
invoke a `.claude/skills/` file that isn't in their own repo — the same
constraint that already means `/Engineer`/`/GODMODE`/`/scope` don't
transfer there either. What DOES transfer, per that section's own
established pattern (prose-embedded discipline in every dispatch, not
skill-name infrastructure): the 3-step PROCEDURE itself is portable —
Alex can paste this file's Step 1-3 shape directly into a message to
Oracle, OpenMontage CC, Graphify CC, or any other AI and get the same real
repair, even without that system having this file installed. RPGACE
Oracle specifically: no code change needed to "have" this skill — Alex can
just paste a confusing Oracle reply back into the SAME Oracle conversation
with "run /misunderstanding on this" and the 3 steps work identically,
since they're a reasoning procedure, not a RPGACE-specific mechanism.

## Guardrails

- **Never self-triggered.** No AI in the Total system should ever run this
  unprompted, including this session noticing its own reply might have
  been unclear — that would be guessing at Alex's internal state, exactly
  the failure mode this skill exists to avoid. Wait for Alex to invoke it.
- **Step 1 is not optional and not summarized.** Quoting the ACTUAL text
  (not a gist of it) is what makes Steps 2-3 checkable instead of another
  round of the same kind of guessing that caused the confusion.
- **This is not a blame exercise.** The gap can be Alex's phrasing being
  genuinely ambiguous, the AI's reading being genuinely wrong, or both
  landing on a reasonable-but-different interpretation — Step 2's job is
  to make the REASONING visible, not to assign fault.
- **Scale to the size of the confusion.** A one-line "wait, I meant X not
  Y" doesn't need heavy ceremony — the 3 steps can be a few sentences each
  when the gap is small. Reserve the full worked-example depth (like the
  one in this file's own build) for a genuinely load-bearing disconnect,
  same anti-ceremony discipline as every other RPGACE skill.
