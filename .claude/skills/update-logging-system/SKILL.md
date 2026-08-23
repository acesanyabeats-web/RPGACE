---
name: update-logging-system
description: A shared change-type → required-artifact checklist (CLAUDE.md Current State, patch_notes.html, Chronicles, interconnection_map.md, system_flow_map.md, minotaur_map.html, manual.html, taxonomy_map.html, ai_tooling_and_rules_map.md, oracleAppGrounding.SELF_KNOWLEDGE, session_lessons.html, and the specific skill .md file whose behavior evolved) that closes the gap where a real fix updates SOME oversight docs but not all the ones it should. Also owns the Cross-Doc Drift Check (Aug 23 2026, DD6) — the targeted doc-to-doc pass asking whether any OTHER oversight doc still asserts something about the same subject that just changed, referenced by name from /scope, GODMODE and /commit-archaeologist. Use this skill at the same point CLAUDE.md rule 6 already requires doc updates (any Tier 2+ real change, and always as part of Bedtime's Step 1) — run through the dependency map, mark each artifact touched/skipped-with-reason, explicitly. Do NOT use this for Tier 0/1 mechanical edits (same threshold as Council of 5/GODMODE) — it is a completeness gate for real changes, not a per-commit ritual.
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
prevent. **One narrow, Alex-answered exception as of Aug 23 2026 (DD6)**:
`/scope`, GODMODE (`omnitrix`) and `/commit-archaeologist` now each carry
a real obligation to run the single **Cross-Doc Drift Check** step below
— by a one-line pointer to this file, never a copy of the map. See the
Guardrails section for why that distinction is load-bearing.

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
15. **A `/colourgradient`, `/paranoia`, or `/drift` pass produces a real
    blue/red/yellow finding (not green)** (added Aug 11, same day, Alex's
    own explicit ask: "future integrations on /paranoia and /drift against
    any file and push just generated") → `future_integrations.html` gets
    the corresponding card added/updated/removed in its matching color
    section, sourced from the same `ceo_plan_items.status` row the finding
    already updated (never re-derived separately, rule 8). A finding that
    reaches green does the REVERSE — removed from `future_integrations.html`
    and its real status added to whichever tier doc(s) artifacts 1-14 above
    already route it to. **Real grouping rule, added Aug 13 (Alex's own
    ask, "mark your output... with all the steps in a group, with each
    subgroup explained... combined by what they are changing")**: a
    multi-step CEO plan (2+ `ceo_plan_items` sharing one `ceo_plans` row)
    always renders as ONE labeled plan-group with each step its own
    explained subgroup card — never scattered loose cards. Every other
    item gets grouped under its real affected river/dashboard-card/
    external-connector (matching `minotaur_map.html`'s own river names),
    not left flat under a bare color heading — find its real home first,
    only add a new group label if nothing existing fits.

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

16. **Content is about to be ADDED to `manual.html` (or any Tier (a)
    explaining doc)** (added Aug 13, real Alex ask after a genuine
    redundancy audit found `manual.html` had accumulated 4 whole
    sections — Session History, the 4-level Diagram Chain, the full bug
    table, the F0-F18 roadmap table — that were verbatim duplicates of
    content `patch_notes.html`/`patch_notes_archive.html`/
    `interconnection_map.md`/`minotaur_map.html` already owned, one of
    them (the old "Future Integrations a-f" lettering) also a repeat of
    a naming collision already fixed everywhere else once) → before
    writing new narrative/history/table content into a Tier (a) doc,
    check whether it's already narrated in full elsewhere: `patch_notes.
    html`/`patch_notes_archive.html` own ALL day-by-day build history and
    bug root-cause narrative (Tier (a)'s own stated role is "shown/
    explaining," never a second copy of the story); `interconnection_map.
    md`/`system_flow_map.md`/`minotaur_map.html` own ALL structural/flow
    diagrams. **The real obstacle this closes**: Tier (a) docs are edited
    far more often than Tier (b) truth docs (they're the ones a fresh
    session reaches for first), so new content naturally lands there
    first and never gets moved to its rightful canonical home — the fix
    isn't "audit occasionally," it's "check before adding," the same
    shape as artifact 8's own dedup discipline for the tooling catalog.
    If the content is genuinely NEW (not already told anywhere), it still
    goes in its rightful canonical doc first (per whichever artifact type
    above matches its real content), with Tier (a) getting only a short
    pointer — never the full narrative twice.
17. **A real `/misunderstanding`, `/drift` finding, or genuine obstacle
    gets resolved during a session** (added Aug 15, real Alex ask: "make a
    doc that records any /misunderstandings, /drift, challanges and
    obstacles faced, and how the solution was created and what the
    solution is... record future rules and changes during a session, then
    /Bedtime and pushes would record this for reflection") → `session_lessons.html`
    (new 11th oversight doc), one card per episode: the trigger, the real
    obstacle, how the solution was actually reached (the reasoning, not
    just the outcome), the solution, and any resulting standing rule
    (cross-referenced to its CLAUDE.md rule number or a skill's own R-N,
    never restated in full — rule 8). Genuinely different from
    `error_log.html` (runtime/code errors, not process/methodology) and
    from `patch_notes.html` (what shipped, not why a decision was hard).
    Hand-authored per session like `patch_notes.html`, not Supabase-live.
    **Same day, real follow-up (CEO SKILL.md Loop 1 Step 6)**: every card
    opens with the real prompt scope that was active when the episode
    happened, sourced from Alex's own words where he gave them — written
    BEFORE the other blocks, never synthesized afterward from the
    solution (which would launder away exactly the "scope narrowed once
    real evidence came in" signal this field exists to preserve).
18. **A `/colourgradient` pass finds a real stale CLAIM (not a code
    regression) — a fact/count/rule that was true and a later real
    change made false** (added Aug 20/21, G54, real Alex ask — "brown," a
    new `/colourgradient` color, distinct from purple which tracks broken
    code) → a real row in `achiever_archive` (`achiever.html`, the 12th
    oversight doc, layer (e)'s past-tense half), citing the real old
    value, the real new value, and the real reason they diverged. The
    live doc's own claim gets corrected in the same pass (artifact 13's
    own discipline, extended). **Real, mandatory removal step, Alex's
    own direct correction**: "what gets brown is removed from smoke test,
    along with all other oversight docs that are reporting truth" — grep
    every Tier (a)-(d) doc for the exact stale claim; a `smoke_test_items`
    row that exists solely to hand-test a now-false claim gets DELETED
    outright (nothing real left to verify), never just re-flagged — a
    genuinely different treatment than purple's `needs_confirm_highlight`
    (which re-flags because the underlying feature might still be
    fixable). See `.claude/skills/colourgradient/SKILL.md`'s own brown
    entry for the full worked example (`TOTAL_ZONES`) and the complete
    procedure — not restated here (rule 8).

19. **A real fix/feature ships that corresponds to an EXISTING red/yellow
    `ceo_plan_items` row** (added Aug 22, real Alex ask after a `/paranoia`
    +`/CEO` drift check found "A2 — Dummy Oracle banner slide-down UI fix"
    shipped and hand-tested working while its own tracking row still read
    `red`, citing evidence from 11 days before the fix) → check whether
    the shipped work matches an existing plan-item title/description in
    `ceo_plan_items` (a quick `ilike` search on the feature's own name is
    usually enough) and flip its `status` + refresh its `evidence` field
    in the SAME pass the file-based docs (artifacts 1-18) get updated —
    never assume logging CLAUDE.md/patch_notes.html/Chronicles also
    covers this, since it doesn't. If the item was carrying a red/yellow
    card in `future_integrations.html`, remove it there too (same
    artifact-15 discipline, just triggered by a shipped fix instead of a
    fresh `/colourgradient` run finding it). **The real, concrete gap this
    closes**: a shipped fix's oversight-doc logging and its own Supabase
    plan-tracking status are two genuinely separate updates that don't
    share muscle memory — a session can do the first perfectly and still
    leave the second stale for days. This is exactly a `/colourgradient`-
    shaped check (does this item's real color match its real state) run
    proactively at ship time, not just when someone runs `/colourgradient`
    explicitly.

20. **Anything on artifacts 1-19 actually changed a specific SUBJECT that
    more than one oversight doc makes a claim about** (added Aug 23 2026,
    DD6 of the ratified "Oversight Doc Drift Discipline & Plan-First
    Restructure" `/CEO` plan; Alex's own confirmed direction was
    "Strengthen + wire existing mechanisms," so this invents no new
    mechanism — it names a step the existing ones each half-did) → run
    the **Cross-Doc Drift Check** below.

## The Cross-Doc Drift Check

**The real gap this closes, stated precisely.** Three existing
mechanisms already sit next to this and none of them actually do it:

- `/cartographer` runs the trickle-down/up procedure — but its axis is
  the **Galaxy→River→Module→Connector hierarchy**, i.e. does a real
  change create integration friction upstream or downstream in the MAP.
  It is not a doc-to-doc claim comparison.
- The **Achiever/brown** mechanism (`/colourgradient`, artifact 18)
  correctly removes a stale claim from every doc asserting it — but it
  fires only once someone has ALREADY identified the claim as stale. It
  is the cleanup, not the detector.
- This skill's own artifacts 1-19 answer "which docs must I WRITE to
  after this change." They never ask "which docs already SAID something
  about this subject, and does that still hold."

So a real change could update every artifact its row demanded, and leave
a second doc quietly asserting the old thing — which is exactly what
happened to `future_integrations.html`'s A5 card ("Research Lab page
confirmed fully intact, untouched") while CLAUDE.md's own Current State
described the same feature accurately as retired.

**Step 1 — name the subject, not the change.** Write one line: what
specific, checkable THING is now different? A river's module list. A
plan item's status. A feature's built/not-built state. A count (docs,
modules, rows, phyla). A file's existence or location. A rule's wording.
This is deliberately narrower than "what did I do" — a subject is the
thing another doc could have an opinion about.

**Step 2 — targeted lookup, never exhaustive.** The search space is
**this skill's own artifact list above** — do not build a second doc
inventory (rule 8). Walk artifacts 1-19, and for each one ask only: does
this artifact plausibly carry a claim about THIS subject? Usually 2-4
qualify, not 19. Then grep those specific docs for the subject itself
(the module name, the file name, the count, the plan item code) — not
for the change. A count is worth grepping as a bare number; a file name
is worth grepping in tooling config and Supabase rows too, not just
tracked files (CLAUDE.md's own `vercel.json` / `graphify_river_group.py`
/ `.claude/settings.json` landmine is three instances of exactly that).

**Step 3 — grade any real inconsistency with `/drift`'s vocabulary,
don't invent a second grading scale** (rule 8): VERDICT (on track /
drifted / inconclusive / blocked), BASIS (ratified / provisional /
none), and grade the gap MINOR / MATERIAL / CAPTURED.

**Step 4 — route to the mechanism that already owns that outcome.** No
new handling is defined here:
- A stale **CLAIM** (was true, a real change made it false, the feature
  itself may work fine) → the Achiever/brown procedure, artifact 18.
  That includes brown's own mandatory removal step: delete a
  `smoke_test_items` row that exists solely to test a now-dead claim,
  never re-flag it.
- **Broken CODE** (a real regression, not just stale prose) → the
  `error_log.html` purple procedure, artifact 15 + the `error_log`
  session-start check.
- **Neither** (a doc is simply out of date, nothing was ever true-then-
  false and nothing is broken) → just fix it in place, in that doc's own
  format, same pass. No ceremony.

**Token-cost guardrail (rule 11), stated explicitly because this is the
step most likely to bloat.** This is a TARGETED check scoped to the
subject that actually changed. A full pairwise sweep across all 12
oversight docs on every push is **explicitly rejected as a design** —
it would cost more than the drift it catches, and it is the same
disproportion this skill's own Tier 2+ guardrail already refuses
everywhere else. If a change has no single nameable subject, that is a
real signal the check doesn't apply, not a reason to sweep everything.

**Where this runs.** `/CEO`, `/Summary` and `/Bedtime` already carry
partial coverage of this and now point here by name. `/scope`, GODMODE
(`omnitrix`) and `commit-archaeologist` did NOT require it at all before
DD6 and now each carry a real, explicit obligation, scaled to what that
skill already does — see their own files. Those three carry a one-line
pointer to this section, never a copy of it.

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
[x] ceo_plan_items/future_integrations.html status check for anything shipped this pass
[x] Cross-Doc Drift Check — subject: <the one thing that changed>; docs checked: <2-4>; findings: <none / graded>
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
  moment) actually runs the full 20-artifact checklist.
- **The open scope question this guardrail used to name is now
  ANSWERED, and only for one step** (Aug 23 2026, DD6). This guardrail
  previously ended "if a future session finds real value in also running
  it from one of those five, that's a genuine scope question for Alex,
  not a default to assume." Alex answered it directly, in the DD6 plan
  item: `/scope`, GODMODE (`omnitrix`) and `commit-archaeologist` now
  each carry a real, explicit obligation to run the **Cross-Doc Drift
  Check** — that ONE named step, not the artifact map. The distinction
  is the whole point and must not erode: those three files carry a
  one-line pointer to this file's own section. If a future session finds
  itself pasting artifact rows into any of them, that is the rule-8
  duplication this guardrail still forbids.
