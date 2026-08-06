---
name: update-logging-system
description: A shared change-type → required-artifact checklist (CLAUDE.md Current State, patch_notes.html, Chronicles, interconnection_map.md, system_flow_map.md, minotaur_map.html, manual.html, taxonomy_map.html, ai_tooling_and_rules_map.md, oracleAppGrounding.SELF_KNOWLEDGE, and the specific skill .md file whose behavior evolved) that closes the gap where a real fix updates SOME oversight docs but not all the ones it should. Use this skill at the same point CLAUDE.md rule 6 already requires doc updates (any Tier 2+ real change, and always as part of Bedtime's Step 1) — run through the dependency map, mark each artifact touched/skipped-with-reason, explicitly. Do NOT use this for Tier 0/1 mechanical edits (same threshold as Council of 5/GODMODE) — it is a completeness gate for real changes, not a per-commit ritual.
---

# /update-logging-system — one shared map, so nothing goes stale by accident

Alex named this Aug 6, directly after `oracleAppGrounding.SELF_KNOWLEDGE`
went stale mid-session despite CLAUDE.md's rule 6 already requiring it
to update in the same session as any Current State change — proof that
an obligation stated in prose gets missed in practice. Full record of
the real evidence and debate behind this: `dummy_mode_tracelog_and_update_logging_system_paranoia_2026-08-06.txt`.

**Source of truth**: CLAUDE.md's own "Context/logging efficiency rules"
and rule 6 already state PART of this (which doc gets which kind of
detail). This skill does not replace that — it turns it into one
explicit, checkable map, and adds two artifact types CLAUDE.md's
existing rule 6 language didn't name outright: Oracle's own
`SELF_KNOWLEDGE` digest, and the skill `.md` files themselves. If this
file and CLAUDE.md ever disagree, CLAUDE.md wins and this file is stale.

**Deliberately NOT a new ritual to remember.** This is wired into the
ONE place doc-writing already happens as standing discipline —
`Bedtime`'s Step 1 — rather than asking `/Routine`, `/scope`, `/Summary`,
`/commit-archaeologist`, or GODMODE to each carry their own copy. Those
five feed evidence INTO a decision; `Bedtime` (or a direct mid-session
"update oversight" moment) is the actual write-out point, so that's
where the checklist runs. Don't add this map to those five skills' own
files — that would be the exact rule-8 duplication this skill exists to
prevent.

## The dependency map — change type → required artifact(s)

Run down this list for whatever was just built/fixed/decided. For each
row that applies, either touch the artifact or state explicitly why not
(never silently skip).

1. **Durable fact changes** (what's true right now about RPGACE) →
   CLAUDE.md Current State (one line, present tense) + `patch_notes.html`
   (dated card, full story) + Chronicles (`system_updates` row).
2. **Architecture/structural change** (new module, new cross-module
   connection, new data flow) → `interconnection_map.md` (current-state
   paragraph, never a changelog — see its own file header).
3. **Pipeline/flow change** (a built/not-built status moves) →
   `system_flow_map.md` (the affected diagram + truth table).
4. **New wing** (a genuinely new entrance/hub/exit in the information-flow
   sense, not an internal patch) → `minotaur_map.html`.
5. **User-facing surface change** (new button, new table reference, new
   roadmap status) → `manual.html`.
6. **Taxonomy structural change** (columns/query shape, not content) →
   `taxonomy_map.html`.
7. **Oracle's own self-knowledge** — any change that touches CLAUDE.md's
   Current State, Known landmines, or a biggest-open-item list →
   `oracleAppGrounding.SELF_KNOWLEDGE` in `rpgace_core.js`. **This is the
   artifact that went stale and triggered this skill's own creation** —
   treat it with the same non-optional weight as CLAUDE.md itself, not
   as an afterthought.
8. **Tooling/rules catalog change** (new skill, new global tool used
   against RPGACE for the first time, new rule-bearing file anywhere in
   the repo) → `ai_tooling_and_rules_map.md`.
9. **Skill behavior evolves through real use** (a skill produces a new
   precedent, guardrail, or finding worth keeping — pattern: Aintergration's
   own numbered Worked Precedents) → that skill's own `.md` file gets the
   new precedent appended in the SAME session the real use happened, not
   deferred. This is the "skill md files... update at the same time" half
   of Alex's own ask — skills are living documents of what's actually been
   tried, not fixed specs written once.

## How to actually run this (the enforceable part)

Not a paragraph of prose per artifact — a fast declarative pass, same
shape as `/Engineer`'s own Objective Completion Gate (a named checklist
with explicit pass/fail beats a vague "make sure it's done"):

```
Change: <one line, what actually happened>
[x] CLAUDE.md Current State
[x] patch_notes.html
[x] Chronicles (system_updates)
[ ] interconnection_map.md — skipped, no structural change
[ ] system_flow_map.md — skipped, no pipeline status change
[x] oracleAppGrounding.SELF_KNOWLEDGE
[ ] ai_tooling_and_rules_map.md — skipped, no new skill/tool/rule-file
[ ] <skill>.md — skipped, no new precedent produced
```

Every row gets a mark, every skip gets a real reason (not blank). This
IS `Bedtime`'s Step 1 now — that step points here instead of restating
its own ad hoc version.

## Guardrails

- **This is a Tier 2+ discipline**, same threshold as Council of 5/GODMODE
  per CLAUDE.md's Judgment Funnel. A one-line mechanical fix doesn't need
  the checklist run explicitly — applying it to everything would itself
  become the token-cost problem rule 11 exists to prevent.
- **A checklist doesn't enforce itself.** This closes the exact gap
  found this session (a stated obligation, missed anyway) by making the
  obligation checkable instead of just stated — but if an artifact goes
  stale again after this ships, that's real evidence to strengthen this
  skill, not proof it "doesn't work" on one miss (rule 4 — get real
  evidence before a second attempt, same standing discipline everywhere
  else in this project).
- **Never invent an artifact update.** Marking something `[x]` without
  actually having touched it is worse than an honest `[ ] — skipped`.
  Same rule 7 (fail loud) as everywhere else.
- **Don't duplicate this map into other skill files.** `Routine`,
  `scope`, `Summary`, `commit-archaeologist`, and GODMODE stay evidence-
  gatherers; only `Bedtime`'s Step 1 (and any direct "update oversight"
  moment) actually runs the checklist. If a future session finds real
  value in also running it from one of those five, that's a genuine
  scope question for Alex, not a default to assume.
