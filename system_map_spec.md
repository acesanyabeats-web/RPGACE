# RPGACE — System Map Spec

**The real mapping methodology graphify + Obsidian (and the `/cartographer`
skill) read from.** Built Aug 13 2026, real Alex ask: "make a document for
graphify and obsidian to read grounded by oversight and RPGACE total
systems that will tell them how to map it all out." This doc does NOT
restate facts other docs already own — it states the RULES for turning
those facts into a map. If a rule here conflicts with a fact in Tier (b)
(`interconnection_map.md`/`system_flow_map.md`/`ai_tooling_and_rules_map.md`),
Tier (b) wins; fix this doc, not the other way round (this doc is
methodology, not truth).

**Real, standing update discipline**: this doc changes only when the
mapping METHODOLOGY changes (a new hierarchy level, a new tagging rule,
a new interaction type) — not on every ordinary content update, which
still routes through `scripts/graphify_river_group.py`'s own real data
tables as before. Wired into `update-logging-system`'s artifact map (see
that skill's own file) and into `/CEO` Grounded Mode (see
`.claude/skills/CEO/SKILL.md`) so a plan touching the mapping system
checks this doc first.

---

## 1. The real hierarchy — 4 levels, top to bottom

1. **Galaxy** — a real Total-system member with its own operating
   boundary: `Orchestrator CC` (this session), `OpenMontage CC` (separate
   Claude Code session, `calesthio/OpenMontage` repo), `Graphify CC`
   (separate session, tool-authoring), any other real external AI
   provider that plays an operating role (not a one-off API call — see
   §3), and `RPGACE Architecture` itself (the app/codebase, its own
   galaxy since it's the thing every other galaxy ultimately serves or
   is served by).
2. **River** — within the RPGACE Architecture galaxy specifically, the
   16 real rivers already defined in `RIVER_NAME`/`RIVER_MODULES`
   (`scripts/graphify_river_group.py`, the canonical data source — this
   doc states the RULE, that script holds the real values).
3. **Module/Function node** — within a river, the real modules
   (`RPGACE.register()` boundaries) and their real functions, per
   `graph.json`'s own AST-extracted nodes (or hand-entered ground-truth
   nodes where the extractor has a confirmed blind spot — see §5).
4. **Connector edge** — a real, functional link between any two of the
   above (galaxy↔galaxy, river↔river, or river↔external), tagged by its
   real interaction TYPE (§4), never by mere proximity.

**Recursion rule**: keep descending exactly this far — Galaxy → River →
Module/Function — and no deeper by default. A future 5th level (e.g.
per-line detail) is out of scope unless a real, separate ask justifies
it; this doc is not itself a size cap on any one visual artifact, just
the real hierarchy those artifacts render.

## 2. The connector-bridge-node rule

Every real external connector (Total-system member or third-party
provider — `EXTERNAL_CONNECTORS` in `graphify_river_group.py` is the
canonical live list) is represented as its own bridge NODE, carrying:
- `bridges_to` — the real external system/repo/account on the other
  side, never invented.
- `tested` — real hand-verified working, vs. built-but-unconfirmed.
  **An untested real connector is always shown, flagged, never hidden**
  (Alex's own explicit rule, Aug 13).
- A real galaxy on each side it connects, where one exists (OpenMontage
  bridges RPGACE Architecture ↔ the OpenMontage galaxy; a connector with
  no separate operating galaxy on the far side — Jina AI, Last.fm — still
  gets a bridge node, just without a 2nd galaxy to point into).

Supabase is deliberately NOT a "connector" under this rule — it's core
infrastructure RPGACE itself owns (see `SUPABASE_CORE` in the same
script), shown as its own real node but never framed as bridging to an
"external galaxy."

## 3. Real vs. one-off: when does an external get its own galaxy?

An external gets a full GALAXY (its own operating boundary, drill-down
target) only if it's a real Total-system MEMBER — something that does
real, ongoing work with its own agency (a separate Claude Code session,
a tool with its own repo/lifecycle). A plain API call-out (Anthropic,
Kimi, Luna, Last.fm, Jina AI) gets a bridge NODE per §2, not a galaxy —
there's no "OpenAI galaxy" to drill into, just a real edge to a real
provider. Oracle itself sits INSIDE the RPGACE Architecture galaxy as
its own distinct node (River III's real harness), not folded into
"RPGACE" as if RPGACE were the provider — Oracle fans out to multiple
real providers, RPGACE is the harness routing to it (Alex's own
explicit correction, Aug 13).

## 4. Interaction-type taxonomy (edges, not node color)

10 real types, evidence-grounded against actual call sites, never
derived from river/node membership alone (redundant with node color/
position otherwise): `nav_route`, `ai_judgment_call`,
`external_extract_call`, `write_commit`, `human_confirm_gate`,
`dispatch_trigger`, `oversight_deposit`, `session_start_pull`,
`doc_staleness_flag`, `terminal_sink`. Canonical definitions + live
color tokens: `INTERACTION_TYPE_LABEL`/`INTERACTION_TYPE_COLOR` in
`scripts/graphify_river_group.py`. New types get added there first,
this doc updated to match — never the reverse.

## 5. Extraction blind spots — a known, real limitation, not a bug to keep re-discovering

Graphify's own AST extractor has 2 confirmed, structural blind spots in
this codebase: (a) `RPGACE.register('name', {...})` object-literal
methods are invisible to it (confirmed multiple times, Aug 6 and Aug
13); (b) it silently stops extracting past a certain point in very
large single files (confirmed: `rpgace_core.js`'s tail past ~line
18,844, 6 real modules affected as of Aug 13). **Standing rule**: before
re-attempting a "just refresh graphify" fix on a missing-node report,
check whether the missing thing falls into (a) or (b) first — if so, a
fresh export will NOT fix it; the real fix is a hand-entered
ground-truth node (real function name + real line number, read from
source, never fabricated), following the exact precedent in
`scripts/graphify_river_group.py`'s own Aug 13 comment block. This spec
exists partly so that precedent doesn't get lost to a future session
re-deriving it from scratch.

## 6. Oversight connection — how a map level shows its own documentation trail

Per Alex's own explicit rule (Aug 13, Fork 5): every level of this
hierarchy that has a real, standing connection into Oversight (a river
flowing into River XIV, a galaxy's own real doc trail) represents that
connection explicitly — reusing `minotaur_map.html`'s existing
`.river-flow-next` connector data (`RIVER_FLOWS` in the same Python
script), never re-derived.

## 7. Consumer / Developer visibility (real, proposed convention — see the
Aug 13 record for the open fork this still needs Alex's confirm on)

A real, forward-looking convention for once RPGACE becomes a
market-facing product: every map artifact (a doc, a table row, a
galaxy/river/node) can carry a `visibility` tag — `developer` (Alex-only,
the real oversight/dev-process detail) or `consumer` (safe to show a
future end user, if RPGACE ever ships one). **Not yet applied anywhere**
— this section states the RULE for when it is; the actual tagging pass
across existing docs/tables is real, separate, future work (see the
ratified plan's own new item for it).

## 8. The trickle-down/up procedure (real, standing discipline once built)

When a real change lands anywhere in the hierarchy above:
1. Identify its real level (galaxy/river/module/connector) and what it
   touches, using §1-§4's own rules.
2. Cross-reference against this map + Tier (b) truth docs for real
   integration friction — does anything downstream (or upstream) now
   describe something that's gone stale?
3. A real finding gets a row in the real, live `system_map_flags`
   table (built Aug 13), tagged `visibility` per §7, and — per Alex's
   own explicit expansion of his original idea — surfaced to HIM
   directly, not just logged for the next AI session to maybe notice.
4. `/drift`, `/paranoia`, or `/misunderstanding` get invoked where the
   finding's own shape calls for them (a goal-vs-baseline check, a
   maximal-scrutiny pass, or a real disconnect only Alex can resolve) —
   never reflexively, per each skill's own existing invocation rule.

---

Full compiled spec, open forks, and paranoia/drift/restructure scrutiny
of this whole ask: `records/2026-08/galaxy_map_ceo_loop1_spec_paranoia_2026-08-13.txt`.
