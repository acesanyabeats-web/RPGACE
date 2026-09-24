---
name: debloat
description: Finds real, quantified redundancy across a named family of files (the Galaxy Map's 23 HTML pages, the oversight docs, or any other real file set) or across this conversation's own context, and shortens only what a real evidence-and-scrutiny pass confirms is safe to shorten without losing information. Two modes -- FILE-FAMILY (paranoia-shaped evidence -> drift check -> a misunderstanding-shaped scope confirm -> real interrogation -> Council of 5 + commit-archaeologist decide block-by-block what's safe to consolidate) and CONTEXT-OFFLOAD (a self-monitored proactive pass, roughly when context feels heavy, that writes everything load-bearing into session_memory/real oversight docs before compaction can drop it from raw scrollback). Use this skill whenever Alex says "/debloat", asks to shorten/consolidate a set of docs or pages without losing real information, or asks for a redundancy audit across a file family. Also self-invoke it proactively, without being asked, when this session's own context is getting heavy, to offload durable facts before compaction. Named and defined by Alex Sep 24 2026, built directly out of the same session's real Galaxy Map HTML bloat audit (23 pages, ~464KB of quantified extractable duplication) as its first worked example. Do NOT use this to delete or shorten anything Council of 5 hasn't explicitly cleared -- a thing that LOOKS redundant is not the same as a thing confirmed safe to remove; get real evidence first, same discipline as everywhere else in this project.
---

# /debloat — shorten only what's proven safe to shorten

Alex's own framing, verbatim (Sep 24 2026, inside the Galaxy Map HTML audit
this skill was built to formalize): *"i want /debloat to use /paranoia
/drift /misunderstanding towards me then straight /interrogation with
/misunderstanding to answer, then council of 5 on /paranoia and
/commit-archaeologist to see what can be shortend without losing any info.
also when context window gets to 60% - it should use /debloat to offload
context to keep this convo fresh whilst not losing any context."*

**Source of truth**: CLAUDE.md's `## Invokable frameworks` section defines
GODMODE/Council of 5/Omnitrix/Aintergration; `paranoia`, `drift`,
`misunderstanding`, `interrogation`, and `commit-archaeologist` are sibling
skills in this directory. If this file and CLAUDE.md ever disagree,
CLAUDE.md wins and this file is stale.

**A real reconciliation, stated plainly rather than silently worked around**:
`/misunderstanding`'s own file is explicit — "never self-triggered... only
Alex can experience his own confusion." `/debloat` never literally
auto-invokes that skill on a schedule; every step below that says
"misunderstanding-shaped" borrows its 3-step FORMAT (quote the real target
verbatim → state what was understood and why, pointing at the specific
words → state the concrete plan going forward) as a self-check this skill
runs on itself before spending real analysis time, not a claim that the
named skill fired. If that self-check — or Alex's own reaction to it —
surfaces a real gap, the genuine `/misunderstanding` skill is Alex's own to
invoke, same as always.

## Mode A — FILE-FAMILY debloat

**Step 1 — GODMODE evidence pass, /paranoia-shaped.** Quantify the real
bloat before proposing anything, never guess: byte-level duplication
across the named file family (near-identical chunks via a real diff/hash
comparison, not eyeballing), embedded-boilerplate overlap (shared
CSS/JS/nav/header skeleton repeated per file), content-level redundancy
(the same real fact/explanation asserted in 2+ places when one could
excerpt-and-link instead, per this project's own already-proven GMP-A
pattern), and design-token/structural consistency (does every file in the
family draw from the same real canonical palette/shape, or has drift crept
in since the last audit). Report real numbers — bytes, percentages, file
counts — never "this seems bloated."

**Step 2 — `/drift` check.** Does the real bloat found in Step 1 match or
violate this file family's own stated design intent (rule 8's
deduplication discipline, rule 16's cross-doc drift discipline, a Tier's
own role definition if the family is an oversight-doc tier)? Real VERDICT
(on track / drifted / inconclusive / blocked) split from real BASIS
(ratified / provisional / none) — a family that was NEVER meant to share
resources (e.g., deliberately self-contained static files with no build
step) drifting toward duplication is a different finding than one that HAD
a shared-resource convention that quietly eroded.

**Step 3 — A misunderstanding-shaped scope confirm, toward Alex.** Before
spending real analysis time: quote back the exact file family / scope
Alex named, state plainly what's understood about which content is fair
game to shorten and why (pointing at his own words), and state the
concrete audit-and-recommend plan about to run. This is a self-check, not
a stall — move straight into Step 4 once stated, unless Alex's own reply
signals a real gap.

**Step 4 — Real `/interrogation`, with a misunderstanding-shaped
confirm-back on the answer.** If Step 1-2's evidence leaves a genuine,
load-bearing open question only Alex can answer (is a specific
near-duplicate block deliberate, is a specific file allowed to change,
does a specific piece of "redundant" content actually serve two different
real readers) — ask it, batched, real questions only, never manufactured
ones. When Alex answers, quote his exact answer back, state what was
understood, state the resulting plan, before acting on it — same 3-step
discipline as Step 3, now applied to his real answer rather than the
skill's own opening scope-read.

**Step 5 — Council of 5 on the combined evidence + `/commit-archaeologist`,
block by block.** For every real near-duplicate or oversized block Step 1
found: run `/commit-archaeologist` to reconstruct WHY it exists (a
deliberate design choice with a real reason — e.g. GMR-4's canonical
palette existing on purpose in every page's own `:root` block — vs.
accidental copy-paste drift with no real reason it can't be shared).
Council of 5 then makes the actual call per block: **SAFE TO SHORTEN**
(real duplication, no information lost by consolidating) or **MUST STAY**
(the apparent duplication carries real, non-redundant information, or a
genuine architectural reason blocks consolidation — e.g. a family of
fully self-contained static files with no shared-resource loading
mechanism). Never a blanket verdict for the whole family — block by
block, with a real reason recorded for each.

**Step 6 — Execute only what Council of 5 cleared.** Through the normal
build-verify discipline this project already uses for the target's own
kind of file (for generated HTML: div/a/svg tag-balance, R5 idempotency
on any touched generator script, `verify_anchors.py` if the family has
line-cited anchors, a headless-Chromium spot-check for zero new console
errors; for prose docs: the same rule-16 cross-doc drift check any other
oversight-doc edit already gets). Never touch a block Council of 5 marked
MUST STAY.

**Step 7 — Report, honestly.** Real before/after byte counts, what was
actually consolidated and why, what was deliberately left alone and why —
same standard as every other skill's own reporting in this project. A
debloat pass that quietly also lost real information is a worse outcome
than not running it at all.

## Mode B — CONTEXT-OFFLOAD (this conversation's own context)

**No hard hook exists for a literal "context window at 60%" trigger in
this harness** — confirmed directly (no tool exposes a live token
percentage, no event fires at a threshold) before this mode was designed,
per rule 10's own "hand a verification, not an assumption" discipline.
This mode runs on **self-monitored judgment**, not a guaranteed numeric
trigger: periodically, without being asked, assess whether this session's
own conversation is getting heavy (a long multi-hour session, many tool
calls, several real decisions made) and proactively run the steps below —
aiming for roughly the density Alex's own "60%" framing describes, never
promising the exact number.

**Step 1 — Gather what's load-bearing right now.** Open threads, key
decisions made this session, files/tables actually touched, and anything
Alex explicitly referenced (an attachment, a pasted spec) — the same
shape `/Bedtime`'s own Step 1b already captures for `session_memory`.

**Step 2 — Check nothing durable is ONLY in raw chat.** Per rule 6 (every
confirmed idea or fix updates the oversight docs in the same session,
not batched): if this session made a real decision or shipped real work
that hasn't yet been written into a real doc/Supabase row, write it now,
before offloading — a context-offload pass that lets a real fact exist
only in scrollback about to be compacted has failed at its one job.

**Step 3 — Write/update a real `session_memory` row.** Same schema
`/Bedtime` already uses (`summary`, `key_decisions`, `open_threads`,
`referenced_inputs`, `tags`) — this makes the current state recoverable
even if raw scrollback gets summarized away, without waiting for a full
session-close ritual.

**Step 4 — Report in one line and continue.** "Context offload ran, wrote
a session_memory checkpoint" — not a ceremony, not a work stoppage. This
mode is a background hygiene pass; the actual task keeps moving.

## Guardrails

- **Never literally auto-invokes `/misunderstanding`** — see the
  reconciliation note above. Every "misunderstanding-shaped" step borrows
  the format, never the trigger.
- **Never deletes or shortens anything Council of 5 hasn't explicitly
  cleared** — a thing that LOOKS redundant is not the same as a thing
  confirmed safe to remove. Get real evidence (Step 1) and real scrutiny
  (Step 5) first, every time, no exceptions for an "obvious" case.
- **Mode B never substitutes for `/Bedtime`'s own full session-close
  ritual** — it's a lighter, proactive MID-session hygiene pass (write a
  checkpoint, keep working), not a replacement for the real end-of-session
  logging obligation `/Bedtime` still owns.
- **Scale to the size of the target** — same anti-ceremony discipline as
  every skill in this project. Two files with an obviously small,
  legitimate overlap don't need the full Council-of-5 ceremony; that's
  Tier 1, handle it directly. Reserve the full 7-step Mode A for a
  genuinely large, ambiguous, or multi-file redundancy question.
- **The "60%" figure is Alex's own intent-signal, not an engine
  guarantee** — never describe Mode B to a future reader as firing at a
  precise threshold; it's a self-monitored approximation, honestly named
  as one.

## Worked example — the Galaxy Map HTML audit (Sep 24 2026, this skill's
own first real run)

23 real `galaxy_map*.html` pages, 5.7MB total. Step 1's real evidence: the
left-nav sidebar (`gside-nav`) is ~99.96% byte-identical across all 23
pages via direct `SequenceMatcher` comparison — ~374KB of the 5.7MB total
is this one block alone, varying only by a small per-page "active link"
delta. Embedded `<style>` blocks overlap less (~34% shared, ~90KB
extractable) — most per-page CSS is genuinely unique styling for that
page's own distinct visual components (SVG hub-and-spoke systems, bubble
panels, tables), not waste. `galaxy_map_current.html` alone is 3MB, but
that's real, unique per-function content (a Current-series entry for
every real function across 58 modules), not bloat in the redundant sense
— a real example of Step 1 needing to tell genuine size from genuine
duplication. Design-token check (extending GMR-4's Sep 16 canonical-
palette audit) found `galaxy_map_generator_toolchain.html` (built Sep 22,
after that audit) using `--accent:#4A90E2` where the canonical name is
`--blue` — same real value, wrong token name, the same class of drift
GMR-4 already fixed 4 instances of once. Full record and the actual
Council-of-5 SAFE-TO-SHORTEN/MUST-STAY verdicts land in
`records/2026-09/debloat_galaxy_map_first_run_2026-09-24.txt` once Step
4-6 complete.
