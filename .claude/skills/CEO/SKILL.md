---
name: CEO
description: RPGACE's meta-framework for running a genuinely large, multi-day/multi-session build (the shape rule 5 calls "3+ new pieces," scaled up to "dozens of pieces") end-to-end - from a raw pile of ideas, through a real approved plan, through execution spread across many future sessions, to a real completion record Alex can tick by hand. Two linked loops: a PLANNING loop (compile -> interrogate -> paranoia-advised drafting -> drift-check -> report -> Alex approves) and an EXECUTION loop (the approved plan becomes a real /drift baseline; /Engineer executes against it; every build re-checked via /drift; completed items populate a real "smoke test" oversight doc). While a plan is active, Grounded Mode keeps it live context on every prompt (not just ones that say "/CEO"), backed by a real Supabase datasheet (ceo_plans/ceo_plan_items/ceo_reports) tying every report to the plan item it verified; "/stopCEO"/"/ResumeCEO" pause/resume Grounded Mode without losing state. Use this skill whenever Alex says "/CEO", "/stopCEO", or "/ResumeCEO", or whenever a build is genuinely too large for /interrogation+/paranoia alone to carry through to completion in one sitting - a plan meant to survive across many future sessions, not just one big pass. Named and defined by Alex Aug 11, inline inside the massive-expansion critique-doc build; Grounded Mode + the Supabase datasheet added the same day. Do NOT use this for a normal Tier 2 feature - that stays on the standard Omnitrix Judgment Funnel; CEO is for when the answer to "how many sessions will this take" is genuinely "several," not "one."
---

# /CEO — running a real multi-day build without re-litigating it every session

Alex's own words, verbatim, from inside the massive-expansion critique-doc build (Aug 11 2026): *"this is a multi day build, so create a plan, use any of my inputs through /interrogation, then run /paranoia with /engineer, /aintergrations and /restructure as advisors for writing the full list. make sure to use /drift on everything written in this document throughout to make sure nothing is missed, then compile into huge summary report. this report will then be given to me to read and improve, so we change the plan with /drift in mind. the final approved plan will be the original drift file for /Engineer to then execute through multiple days and sessions, with each build going through /drift and /paranoia to make sure everything is being executed as needed. then when steps in plan are complete, they compile into a smoke test document that will be implemented into rpgace as an oversight doc... run this as a new CEO framework that needs an md file."*

This is not a new kind of reasoning — same design as `/5thDimension`, `/Routine`, and `/paranoia`: a fixed sequence of protocols RPGACE already has, run in a specific order for a specific shape of problem. What's genuinely new here is the shape it's built for: a build that will outlive a single session, where the real risk isn't "did this one pass go well" but "did session 4 still know what session 1 approved."

**Source of truth**: this file, plus the `drift`, `paranoia`, `interrogation`, `Engineer`, `aintergration`, and `restructure` sibling skills it sequences. If this file and CLAUDE.md's own `## Invokable frameworks` section ever disagree on GODMODE/Council of 5/Omnitrix behavior, CLAUDE.md wins.

## The two loops

### Loop 1 — PLANNING (produces an approved plan, builds nothing)

**Step 1 — Compile.** Gather every real idea in scope — a pasted doc, a backlog of open forks, whatever prompted the build — into one real, close-to-verbatim spec file (rule 5's existing convention: a committed `.txt`, never left in chat only). Cross-reference against the existing backlog for real overlaps (two asks that are secretly the same underlying problem) rather than filing everything as flat, disconnected items. **This step already has a real precedent**: `alex_critique_and_massive_expansion_spec_2026-08-10.txt`, Parts A-C, built exactly this way before this skill existed.

**Step 2 — `/interrogation`.** Resolve genuine ambiguity before drafting the full list — never guess at intent for anything consequential. Skip this step's questions for anything already unambiguous; forcing a question round on a clearly-specified item is `/interrogation`'s own named failure mode.

**Step 3 — `/paranoia`, with `/Engineer`, `/aintergration`, and `/restructure` as advisors.** `/paranoia` already sequences most of the heaviest protocols in the project on its own; naming these three as advisors means their specific lenses get pulled in at the right points inside that sequence — `/Engineer`'s shape sketches real implementations for anything that needs to look concrete rather than hand-wavy, `/aintergration` judges any third-party tool the plan wants to lean on, `/restructure` flags anything that would actually change RPGACE-Claude Code's own skeleton rather than just adding a feature to it. This produces the real, full drafted list.

**Step 4 — `/drift`-check the draft against the compiled ideas, continuously.** Not a one-time gate at the end — while Step 3 is drafting, periodically re-run `/drift` Steps 1-4 against Step 1's own compiled source: does the drafted list still cover everything Step 1 found, or has something been silently dropped or reworded into a different, smaller ask? A `MINOR` finding here is a missed item to add back; a `CAPTURED` finding means the draft has quietly redefined the goal and needs to stop and re-anchor to what was actually asked.

**Step 5 — Compile the huge summary report.** The real deliverable of Loop 1. Written from the drafted list, organized (reuse `/scope`'s grouped-category method), and explicit about what's proposed vs. what's already decided vs. what's still a real open fork only Alex can settle.

**Step 6 — Alex reads, pushes back, and approves (or asks for changes).** This is the real gate. Nothing from Loop 1 becomes buildable until Alex has actually seen the report — per his own words, "given to me to read and improve." If he pushes back on part of it, that's `/drift` in the literal, intended sense: the plan changes, a new version of the report is written, and this step repeats. **Real, already-proven precedent**: this happened for real, same session this skill was named — Alex pushed back on 4 of 5 first-pass tool verdicts in the compiled report, real evidence-gathering and real building followed directly from that pushback (see Part F of the same spec file).

**Step 7 — The approved plan becomes the real `/drift` baseline.** Once Alex signs off (in whole or in named parts), that approved version — not the original draft, not chat scrollback — is the pinned, `ratified` baseline every future session's `/drift` check measures against for this build. Loop 1 ends here; Loop 2 begins.

### Loop 2 — EXECUTION (spans many future sessions, builds real things)

**Step 1 — `/Engineer` executes against the ratified baseline.** Each session picks up the next unstarted or in-progress item from the approved plan and runs it through `/Engineer`'s own real build-verify-report cycle (Opus builds, Sonnet reviews, a real Truth Check before anything is called done) — `/CEO` does not replace `/Engineer`'s own discipline, it hands `/Engineer` a real, pre-approved goal instead of a freshly-negotiated one each time.

**Step 2 — Every build gets checked with `/drift`.** After `/Engineer` reports a real result, run `/drift` Steps 1-4 against the ratified baseline for that specific item: does what actually got built match what the plan asked for? `MINOR` gets fixed as a doc correction; `MATERIAL` gets a real undo/shelve/adopt decision (adopt needs Alex's confirmation if the change is real enough to matter); `CAPTURED` stops that item and surfaces to Alex before continuing — the goal moved, and that always needs his say-so, same weight as everywhere else in this project.

**Step 3 — Completed items populate the smoke-test doc.** A real, new RPGACE oversight-doc artifact (see below) — not built empty in advance, created and grown as real plan items actually finish. Alex ticks items by hand as he confirms they work in the live app; this is deliberately a *human* checkpoint, not an auto-tick, matching every other taxonomy/destructive-action checkpoint already in this project.

**Step 4 — Errors amend the smoke-test doc, and feed back to Oracle self-awareness.** When a ticked item later breaks (an error surfaces, a hand-test fails), the smoke-test doc's own entry for it gets un-ticked with a real note of what broke — and per Alex's own ask, that state should be reachable by `oracleAppGrounding.SELF_KNOWLEDGE` (the existing live Oracle self-awareness mechanism, not a new parallel one — rule 8) so Oracle itself knows what's currently working vs. currently broken, not just what was built once. When fixed, re-ticked, and self-awareness reflects that too. **Real, honest scope note**: routing live error codes through Supabase into self-awareness automatically (Alex's own stated wish) is real future infrastructure, not built by this skill file alone — it's exactly the kind of concrete piece Loop 1's own Step 3 (`/Engineer` sketches) should size and schedule as its own plan item once a real approved plan calls for it, not invented ad hoc here.

**Step 5 — Ties into Chronicles.** Real plan-item completions and the smoke-test doc's own state changes are exactly the shape of thing `system_updates`/Chronicles already logs — route them there the same way any other real Claude Code change gets logged (rule 6), so the smoke-test doc and Chronicles tell the same story from two angles (a checklist vs. a timeline) rather than drifting apart from each other.

## Grounded Mode — CEO active on every prompt until the plan is smoke-tested (Aug 11 2026, Alex's own explicit ask)

Alex's own words, verbatim: *"from now on CEO framework is grounded to every prompt until the plan is done and smoke tested. this will help continue /drift verification throughout the build phase and iterations along the way to keep larger goals in tact. this will help chase long term goals."* This is a real, standing behavior change, not a one-time instruction — while any `ceo_plans` row has `status = 'active'`, this session (and every future session working on RPGACE) treats that plan as live context for every prompt, not just prompts that explicitly say "/CEO".

**What "grounded to every prompt" actually means in practice** — scoped to stay honest about rule 11 (tokens/time are a design constraint), never the full Loop 2 ceremony on every single message:

1. **Before starting real work on a prompt**, check the real, derived display state (`paused`/`dormant`/`active`/`none` — see the `/stopCEO`/`/ResumeCEO` section below for the real distinction between `paused` and `dormant`). If it's anything other than `active`, Grounded Mode is a no-op — proceed normally. `paused` and `dormant` are both "off" for this purpose; they only differ in how they turn back on.
2. **If an active plan exists**, a lightweight relevance check: does this prompt's work touch a `ceo_plan_items` row (by item code, title keyword, or file/module overlap)? If clearly no (a genuinely unrelated bug fix, a one-line UI tweak), say so plainly and proceed without further ceremony — Grounded Mode does not force every unrelated prompt through a plan lens.
3. **If it does touch a plan item**, run `/drift` Steps 1-4 against that item's own real baseline (same shape as Loop 2 Step 2, just triggered by the prompt itself rather than waiting for a `/CEO`-named invocation) — update that item's `status`/`last_verdict`/`evidence` row in `ceo_plan_items` when the work changes its real state. This is what keeps "larger goals in tact" the way Alex asked: a plan item's real status is never more than one real prompt behind what's actually true, rather than only refreshed when someone remembers to run `/colourgradient` or `/CEO` by name.
4. **A `CAPTURED`-grade finding during a Grounded Mode check stops and asks**, same weight as every other `CAPTURED` finding in this file — Grounded Mode sharpens how often the check runs, it does not loosen what a bad finding requires.
5. **If the touched plan item sits anywhere in the real mapping hierarchy** (a galaxy/river/module/connector-edge change — `system_map_spec.md` §1) — added Aug 13, real Alex ask ("update into ceo so it happens when ceo mode is on") — Step 3's `/drift` check runs alongside `.claude/skills/cartographer/SKILL.md`'s own trickle-down/up cross-reference (Steps 3-4 of that skill), not as a separate ritual. A real MINOR/MATERIAL/CAPTURED integration-friction finding from that cross-reference gets surfaced to Alex the same way any other Grounded Mode finding does. Most Grounded Mode checks won't touch the mapping hierarchy at all — this step only fires when one genuinely does.

**`/stopCEO` and `/ResumeCEO` — real, named controls, not implicit.** Alex's own ask: *"/stopCEO and /ResumeCEO will help access plans and stop or resume planned build."*

- **`/stopCEO`** — sets the active plan's `ceo_plans.status` to `'paused'` (with `paused_at` timestamped). Grounded Mode goes fully dormant for that plan — no per-prompt relevance checks, no drift re-verification — until resumed. Real, honest use case: Alex wants to work on something genuinely unrelated to the active plan for a stretch without every prompt getting checked against it, or a plan needs to sit while he thinks about Loop 1 Step 6 feedback. `/stopCEO` never deletes anything — every `ceo_plan_items`/`ceo_reports` row for that plan stays exactly as it was.
- **`/ResumeCEO`** — sets `status` back to `'active'` (with a fresh `resumed_at` entry, `paused_at` left as history, not overwritten). The next prompt after resuming runs a real `/drift` catch-up pass across all `ceo_plan_items` for that plan (per-item Step 3 of Loop 2) before Grounded Mode resumes its normal per-prompt cadence — a plan that was paused for real days shouldn't resume assuming nothing changed underneath it; check first.
- **If more than one plan is ever `active` simultaneously** (not the common case today — only one real `/CEO`-tracked plan exists as of Aug 11), `/stopCEO`/`/ResumeCEO` take an explicit plan name/id argument; with none active or exactly one, they act on that one plan without requiring the argument.

**Two genuinely different OFF states — a real Aug 11 (2nd pass, same day) addition, per Alex's own explicit re-iteration.** His own words: *"every prompt in orchestrator is grounded with CEO framework while ceomode is on, when plan is finished and future plans is completely empty, /ceo mode switches off automatically until a plan or report populates the future integrations doc, or /stopceo switches off the mode too until /resumeceo is prompted by me."* This names TWO real, distinct off-paths, never conflated:
- **`paused`** — the manual `/stopCEO` path above. Stays off no matter what else changes, until Alex himself runs `/ResumeCEO`. Nothing auto-resumes this one.
- **`dormant`** — a fully-derived (not stored) state: the active plan's own `ceo_plan_items` are all green (real, checkable — auto-flips the plan's `status` to `'complete'` the moment this becomes true) AND `future_integrations.html` (every non-green `ceo_plan_items` row, across every plan) is completely empty — nothing real left to ground against. Alex doesn't need to do anything for this to end; the very next real plan or Future Integrations item, from ANY source, makes the next check read `active` again automatically, with no explicit "reactivate" step.

**Real correction, Aug 12 — a live app UI element was built for this and REMOVED, real `/misunderstanding` finding.** A same-day earlier pass read "just pop up that say CEO off or on, like a mode toggle" (Alex's own real answer to a different open question) as an instruction to build a real, visible toggle pill inside `rpgace_core.js` — rendered on every page of the deployed RPGACE app. Alex's own direct correction: *"ceo should not be present in rpgace, only orchestrator CC since its a development framework only, doesnt make sense to put it anywhere in rpgace total systems but orchestrator CC."* **Fixed**: the `ceoMode` module (the pill, `_fetchState()`, `_deriveDisplay()`, `stop()`/`resume()`) was deleted from `rpgace_core.js` entirely — RPGACE the product now has zero code, zero UI, zero visible trace of `/CEO`. The real distinction that holds, stated plainly so it isn't re-broken later: `ceo_plans`/`ceo_plan_items`/`ceo_reports` stay as Supabase DATA (Orchestrator-CC-internal, same posture as `session_memory`/`graphify_jobs` — invisible to a real RPGACE user, queried only by this session); `smoke_test.html`/`future_integrations.html` stay as real, independent, previously-and-separately-requested oversight ARTIFACTS that Loop 2 happens to populate, not "the CEO framework" rendered into the product. **The one live, checkable way to know Grounded Mode's real state going forward: ask this session directly** — it reads `ceo_plans`/`ceo_plan_items` from Supabase and reports back in chat, exactly the way any other `/drift`/`/colourgradient` status check already works. No pill, no popup, no app-facing surface, ever again without Alex's own explicit re-ask.

## The Supabase datasheet — `ceo_plans` / `ceo_plan_items` / `ceo_reports` (Aug 11 2026, Alex's own explicit ask)

Alex's own words, verbatim: *"making a supabase for this would help a lot, and tie all the loose reports and plans together. tie reports to the plans to make datasheet on all of it."* Real problem this solves: before this table set existed, a `/CEO` plan's real state lived only as prose scattered across CLAUDE.md bullets and dated `records/*.txt` files — genuinely durable (rule 5's own convention), but not queryable, and nothing tied a specific report file back to the specific plan item it verified. Three tables, `anon_all`/`authenticated_all` RLS matching the established internal-dev-tooling posture (`session_memory`, `graphify_jobs` — this is RPGACE-Claude-Code's own working data, not a Tier-3-sensitive table):

```sql
CREATE TABLE ceo_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. 'Massive Expansion'
  source_file text,                   -- the compiled spec .txt this plan came from
  status text not null default 'active', -- active | paused | complete
  basis text,                         -- ratified | provisional | none (drift vocabulary)
  created_at timestamptz default now(),
  ratified_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  notes text
);

CREATE TABLE ceo_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references ceo_plans(id),
  item_code text not null,            -- e.g. 'A1', 'A10' (matches the compiled spec's own numbering)
  title text not null,
  status text not null default 'red', -- red | yellow | green (the /colourgradient vocabulary)
  basis text,                         -- ratified | provisional | none
  last_verdict text,                  -- on_track | drifted | inconclusive | blocked
  evidence text,                      -- a real file:line / commit hash / query result citation, never a guess
  last_checked_at timestamptz default now(),
  created_at timestamptz default now()
);

CREATE TABLE ceo_reports (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references ceo_plans(id),
  plan_item_id uuid references ceo_plan_items(id), -- nullable: a whole-plan report has no single item
  report_type text not null,          -- drift | paranoia | colourgradient | engineer | ceo_loop1 | ceo_loop2
  file_path text,                     -- the real records/*.txt this corresponds to, rule 5's own convention
  summary text,
  created_at timestamptz default now()
);
```

**How this ties in, concretely**: `/drift`'s own Step 5 report shape (Baseline/Work map/Verdict/Findings/Grades) is exactly what populates a `ceo_reports` row's `summary` plus updates the matching `ceo_plan_items` row; `/colourgradient`'s green/yellow/red benchmark reads `ceo_plan_items.status` directly instead of re-deriving it from scratch every run (real speed + consistency win, not a new evidence method — `/colourgradient`'s own guardrail against inventing a second evidence source still holds, this is a cache of the SAME evidence, not a shortcut around gathering it); Grounded Mode's per-prompt check (above) is what keeps these rows fresh without waiting for an explicit `/CEO`/`/drift`/`/colourgradient` invocation. **Never treat a `ceo_plan_items.status` value as truth on its own** — it's a cache of the last real check, timestamped via `last_checked_at`; if that timestamp is old relative to how much has changed, re-verify before trusting it, same "a doc's own claim needs re-verification" discipline as everywhere else in this project.

**Migration note, honest**: this table set is genuinely new infrastructure, built the same session it was asked for (additive `CREATE TABLE` only, no risk to existing data — proceeds under this file's own reduced-friction model without a separate stop-and-ask, per CLAUDE.md's own "CEO-framework Supabase migrations — narrowed, not abolished" carve-out for purely additive schema). It does not retroactively replace `records/*.txt` files as the verbatim-record store (rule 5 still applies — a report's full prose still gets written to a committed file); it ties those files together and makes their real-time STATUS queryable, which prose files alone can't do.

## The smoke-test doc — a real 8th oversight-doc artifact, grown not pre-built

Per Alex's own ask ("implemented into rpgace as an oversight doc"), this is real new oversight infrastructure, joining the existing seven — but it is **not built empty by this skill**. It comes into existence the first time Loop 2 Step 3 has a real completed item to record, and grows from there. When it's first created, it needs the same real integration pass any new oversight doc gets: a mention in CLAUDE.md's own `## Oversight — now SEVEN docs` section (which becomes eight), a real update-type entry in the `update-logging-system` sibling skill's dependency map, and cross-linking from the other docs per rule 8 (never a second copy of a fact `patch_notes.html` or `manual.html` already owns — the smoke-test doc's real, distinct job is "what's currently confirmed working," not "what shipped" or "how to use it," which the other docs already cover).

## The reduced-friction confirmation model — read the boundary carefully

Alex's own words: *"I don't care if it is not made well first time, I want you to just not drift and report everything truly... just do accept once or accept all etc... just report and log everything truthfully with /drift."*

This is real, and it is honored — but scoped exactly the way CLAUDE.md's own GODMODE boundary is scoped, not as a general override:

- **What this DOES reduce**: re-confirming individual Tier 1/2-shaped build steps that are already inside a plan Alex has personally read and ratified in Loop 1 Step 6. Once he's approved "build the Kimi/Luna routing scaffold," a future session executing that exact item doesn't need to re-ask "should I build this" — that question was already answered. Mistakes are expected and fine ("I don't care if it is not made well first time") — `/drift` is what catches and reports them, not a permission gate re-asked every time.
- **What this does NOT reduce, ever**: Tier 3 — destructive git operations, force-pushes, Supabase migrations, taxonomy writes, spending, credential/API-key handling, anything CLAUDE.md's own non-negotiable rules already gate on explicit confirmation. `/CEO` never substitutes for that confirmation, exactly the same boundary GODMODE's own section states word-for-word ("rigor is not authorization"). A plan item that turns out to need a real migration or a real spend decision still stops and asks, even mid-execution of an otherwise-approved plan.
- **The honest reason this split matters**: Alex approved the *plan*, not a blank check on *every possible consequence* of executing it. A build step that stays inside what was actually approved doesn't need re-asking. A build step that would require something Tier 3 - shaped and wasn't explicitly named in the approved plan is a new decision, not a re-litigation of an old one, and gets treated like any other Tier 3 fork.

## `/deduplication` and `/debug`

Alex asked for both to be "included." Real, honest handling of each:

- **`/deduplication`** is not a separate skill to build — it is CLAUDE.md's own standing rule 8 ("Eliminate deduplication gaps — always, no exceptions"), already load-bearing everywhere in this project. `/CEO` and `/drift` both apply it as a standing check at every step above (Step 1's overlap cross-reference, the smoke-test doc's own "don't duplicate what another doc owns" rule) — inventing a second, redundant skill called `/deduplication` would itself violate the exact rule it's named after. If a future session wants a dedicated deduplication *scan* tool (distinct from the standing discipline), that's a real, separate, smaller ask worth its own `/interrogation`, not folded blind into this file.
- **`/debug`** does not exist as a named RPGACE skill yet, and this file does not invent one. Real existing coverage: `commit-archaeologist` (why code exists, real root-cause reconstruction), rule 4 (get real evidence, stop after one failed fix), and `/Engineer`'s own Truth Check (re-verifies claims against real state). Whether a genuinely new, dedicated `/debug` skill is worth building on top of that real existing coverage is an open question for Alex, not decided here — flagged, not silently skipped.

## Ends at `/investor`

Per Alex's own closing line ("we will then complete all this an make a plan on how to build this as a product with /investor to make RPGACE a financial success") — once a real, meaningful slice of Loop 2 has shipped (not before), run `/investor` against the real, updated state of RPGACE to turn genuine build progress into a real commercial-readiness read and a practical next step toward revenue. This is the last real step of a `/CEO` run, not a parallel one — `/investor` needs something real to evaluate, and running it before Loop 2 has produced anything would just be judging the plan instead of the product.

## Guardrails

- **Loop 1 never skips Step 6.** No plan produced by this skill is "approved" until Alex has actually seen and responded to the report — a `/CEO` run that starts executing before that step is skipping the one real human checkpoint the whole framework is built around.
- **The ratified baseline is the plan Alex actually approved, not a paraphrase of it or an assumption about what he'd probably want.** If a future session is unsure whether something is really covered by the ratified plan, that's a `/drift` `BASIS` question (is this actually ratified, or just assumed) — check, don't guess.
- **`CAPTURED`-grade findings always stop and ask**, mid-execution or not, exactly like `/drift`'s own guardrail states. This is the one place the "don't ask permission each time" instruction explicitly does not apply, and Alex's own words support this reading (spend/destructive/Tier-3 items were never what he was asking to skip).
- **Scale to the real size of the build.** This is the heaviest planning framework in the project alongside `/paranoia`/`/5thDimension` — reserve it for genuinely multi-session work, same rarity discipline as those two. A single-session feature stays on the normal Judgment Funnel.
