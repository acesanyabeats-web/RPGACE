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
10. **`rpgace_core.js`/`main.js`/`api/*.js` structural change** (added Aug
    6, real `/paranoia`+`/restructure` evidence: `graphify_restructure_paranoia_2026-08-06.txt`)
    → run `graphify . --update --code-only --no-viz` (free, AST-only, no
    LLM key, seconds) in the same pass. This does NOT fix graphify's own
    confirmed structural gap (`RPGACE.register('name', {...})` isn't
    extracted as a first-class symbol — a rebuild was tested live and
    did not close it), but it keeps the code-side index from drifting
    further than it already has, and is genuinely free to run. Skip for
    doc-only sessions — nothing code-side changed. **`/5thDimension`'s
    own Phase 1 ("what's actually built," Aug 6 addition) runs this same
    step as part of its evidence pass, referencing this artifact rather
    than restating it — rule 8, one definition of "keep the graph
    current," not two.**
    **Mandatory as of Aug 6 (real Alex ask — `graphify-out/graph.html` is
    now a real, clickable entry in the live "Oversight" popup, `dashDeck._openOversight`'s
    "Auto-generated" group): every time this artifact fires, also run
    `graphify export html` then `python3 scripts/graphify_recolor.py`**
    (graphify's own export always resets to its default Tableau10
    palette, so the RPGACE-palette swap needs re-running every time the
    HTML regenerates, not just once) **then `python3 scripts/graphify_river_group.py`
    third** (Aug 6, 2nd real Alex ask — river-groups the real, named
    RPGACE modules graphify's own AST extractor CAN see, per the module
    marker line-ranges in `rpgace_core.js`, against the curated
    module→river table documented in that script's own header; scope
    confirmed via `/interrogation`: named modules only, not every node —
    most nodes stay in graphify's native community color, an honest
    scope limit, not an oversight. **Aug 6, 3rd real Alex ask, via
    `/Engineer`**: the same script now also gives each river-tagged node
    a real fixed x/y position inside its own river's zone (11 zones
    around one large circle, deterministic per-node jitter — never
    random, so re-running always reproduces the same layout) and
    patches `graph.html`'s own `nodesDS` mapping function to forward
    x/y/fixed through to vis.js — a required, idempotent companion fix,
    since that mapping line never passed those fields through before.
    Real physical clustering, not just color, for the same 16-of-1064
    tagged nodes — same honest scope limit as the color-only version,
    not a fix for the untagged blob) — then commit the refreshed
    `graphify-out/graph.html` alongside the code change, same standing
    commit/merge/push discipline as everything else, so the live link
    never points at a stale visual. This was previously framed as
    optional ("if a visual export is also wanted") — no longer accurate
    now that Alex clicks it from inside the app. **Real order matters**:
    export → recolor → river-group, always in that sequence (river-group
    depends on the RPGACE palette already being applied so river colors
    read as a distinct, deliberately different palette from the
    community colors, not a coincidental clash).
    **Aug 11 addition, real gap found when Alex asked "can I actually
    reach Obsidian from Oversight" and the honest answer was no**:
    `obsidian-vault/`'s raw markdown only becomes clickable navigation
    inside the Obsidian desktop/mobile app itself — there was no URL to
    click from the in-app Oversight popup the way `graph.html` already
    has one. Fixed with `scripts/obsidian_vault_to_html.py`, a small
    self-contained converter (checked against real alternatives first —
    `obsidianhtml` needs a `pandoc` binary not present in this
    environment, Quartz is a full Node static-site-generator project;
    real overkill for a 16-file vault) that renders the vault into one
    self-contained `graphify-out/obsidian_vault.html`, wired into
    Oversight's "Auto-generated" group next to Graphify Map/Tree.
    **Whenever `scripts/graphify_to_obsidian.py` is re-run** (i.e.
    whenever river/zone structure changes and the vault itself
    regenerates), immediately re-run `python3 scripts/obsidian_vault_to_html.py`
    too and commit the refreshed HTML alongside — same "the live link
    never points at a stale visual" discipline as the graph.html case
    above, now a 4th step in the same pipeline (export → recolor →
    river-group → obsidian-vault-html).
11. **`interconnection_map.md`, `taxonomy_placement_rules.txt`, or a
    skill `.md` file changes in a way that could affect an EXISTING
    minotaur_map.html river's accuracy** (added Aug 6, real `/interrogation`-
    confirmed scope — a consistency-CHECK, explicitly NOT a live auto-
    generation pipeline, same shape as minotaur_map.html's own existing
    relationship to `system_flow_map.md`: "a direct plain-language
    translation... nothing here was invented separately from it") → cross-
    check the corresponding river's own text in `minotaur_map.html` and
    flag (not silently auto-rewrite) if it's gone stale. Skills are
    cross-referenced for this consistency check only — they document
    Claude Code's own dev process, not information flowing through the
    deployed app, so they do NOT become river content themselves
    (`/interrogation`-confirmed, Aug 6). Still honors minotaur_map.html's
    own standing rule: internal patches belong in `patch_notes.html`,
    not here — this artifact type only fires when a river's own real
    accuracy is at stake, not for every unrelated doc edit.
12. **A Current State entry (or any equivalent Tier-b "durable fact")
    is confirmed fully resolved and no longer being actively
    re-litigated** (added Aug 11, real Alex ask: "make this a constantly
    updating framework... always make this happen, always" — full
    design record: `records/2026-08/archive_diagnostic_and_supabase_dedup_ceo_paranoia_2026-08-11.txt`)
    → move the full narrative verbatim into that doc's paired archive
    (`CLAUDE.md` → `CLAUDE_archive.md`; `patch_notes.html` →
    `patch_notes_archive.html`; `ai_tooling_and_rules_map.md` →
    `records/YYYY-MM/`), then rewrite the live entry to ONE present-tense
    durable-fact bullet — same discipline the July 31 CLAUDE.md prune
    already proved works, now a checked item instead of a one-off. Real
    scope note: `interconnection_map.md`/`system_flow_map.md`/
    `minotaur_map.html` don't get a paired archive — they're already
    rule-built to hold only present-tense current state and never
    accumulate resolved narrative in the first place (a doc drifting
    into changelog form there is a violation of ITS OWN existing rule,
    fixed by rewriting to present tense, not by adding an archive step).
13. **This session's own real evidence-gathering (a Supabase query, a
    live code read) touches a fact some doc already asserts as current**
    (added Aug 11, same Alex ask) → compare the live value against the
    doc's claim right there, in the same pass — don't defer it. If they
    agree, no action. If they disagree, that's a real `/drift` MINOR
    finding (see `drift`'s own "Live-numbers staleness" worked example):
    fix the doc's claim in the same session, same as any other stale
    fact. **This row is mandatory on every real report/push, not just
    at Bedtime** — it costs nothing beyond the evidence already
    gathered for the task at hand; it only checks facts THIS session
    already touched, never triggers a fresh blanket re-query of
    everything CLAUDE.md asserts (that would be real, avoidable token
    cost against rule 11, for drift this session has no actual evidence
    about either way).
14. **A Supabase table this session touched gains real new rows, a
    schema change, or a new write path** (added Aug 11, same Alex ask —
    real /deduplication extended to Supabase itself, not just RLS/write-
    path parity) → run `scripts/supabase_dedup_scan.py` against that
    specific table (read-only, anon key, normalized-key similarity —
    see the script's own header for the method, mirrors `intelDedup`'s
    existing real approach). Findings-only, appended to a dated record
    file — never auto-merges or deletes a row, same human-checkpoint
    discipline as every other RPGACE mechanism that touches real data.
    **Scoped, not blanket**: this fires for the table(s) actually
    touched this session, or as a full 35-table pass at `Bedtime` —
    never a full re-scan on every single push, which would be real
    recurring cost against rule 11 with no evidence backing the need
    (the Aug 11 full scan found zero real table-level duplication).

**Optional, non-authoritative pre-check** (same Aug 6 evidence): before
marking a doc artifact `[ ] — skipped`, a single properly vocab-expanded
`graphify query` (see that skill's own `references/query.md` Step 0 —
extract real graph vocabulary first, never pass a raw natural-language
phrase) on the change's own topic is a legitimate, cheap first-pass check
for existing coverage — demonstrated working for doc-content questions
in the live evidence pass. Never treat a "no results" answer as proof
something isn't covered — the doc-side graph is only as current as its
last real semantic rebuild (which needs an LLM pass, not run by default,
a genuine cost/benefit call per rule 11), so an empty result means
"check by hand," not "confirmed absent."

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
[ ] Archive fully-resolved entries — skipped, nothing resolved this pass
[x] Live-fact staleness check on evidence touched this session
[ ] Supabase dedup scan — skipped, no table meaningfully changed
```

Every row gets a mark, every skip gets a real reason (not blank). This
IS `Bedtime`'s Step 1 now — that step points here instead of restating
its own ad hoc version. **The "Live-fact staleness check" row is
mandatory on EVERY real report/push, not just at Bedtime** (Aug 11,
Alex: "always make this happen, always") — see artifact 13 above for
the exact scope (checks only what this session's own evidence already
touched, never a blind full re-query).

## Guardrails

- **This is a Tier 2+ discipline**, same threshold as Council of 5/GODMODE
  per CLAUDE.md's Judgment Funnel. A one-line mechanical fix doesn't need
  the checklist run explicitly — applying it to everything would itself
  become the token-cost problem rule 11 exists to prevent.
- **Artifacts 12 and 13 are the one deliberate exception to the Tier 2+
  threshold above** (Aug 11, Alex's own explicit ask, verbatim: "make
  this a constantly updating framework when reporting and pushing... to
  prevent same future problems, always make this happen, always, I'm
  tired of this"). They run on every real report/push regardless of
  tier, because they're genuinely free — 12 only fires when something is
  ALREADY confirmed resolved, 13 only checks facts THIS session's own
  evidence already surfaced. Artifact 14 (the Supabase dedup scan) stays
  Tier 2+/table-touched-scoped, same as everything else — "always" is
  honored for the two checks that cost nothing extra, not stretched into
  a blanket recurring re-scan with no evidence behind it (that would
  just be rule 11's problem wearing a different name). Full reasoning:
  `records/2026-08/archive_diagnostic_and_supabase_dedup_ceo_paranoia_2026-08-11.txt`.
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
