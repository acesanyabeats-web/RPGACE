# RPGACE — System Map Spec

**The real mapping methodology graphify + Obsidian (and the `/cartographer`
skill) read from.** Built Aug 13 2026, real Alex ask: "make a document for
graphify and obsidian to read grounded by oversight and RPGACE total
systems that will tell them how to map it all out."

**Real correction, Aug 13, same day — a genuine gap, not a wording
nuance.** The first version of this doc stated only the RULES for
drawing a map (hierarchy levels, connector conventions, interaction
types) and deliberately left out the actual CONTENT of what those
rules apply to — Alex's own direct correction: *"you didnt actually
include how rpgace total systems works in a document that explain how
rpgace total systems works."* He's right — a doc meant to ground
graphify/Obsidian on how Total Systems works has to actually SAY what
Total Systems concretely IS (the real galaxies, the real 16 rivers,
the real connectors), not just the abstract rules for mapping it.
**Section 0 below is the fix** — a real, concrete inventory, sourced
directly from the same canonical data every other section already
points at (never re-invented), read FIRST, before the methodology
sections that follow. Section 0 is intentionally NOT a second copy of
`interconnection_map.md`'s own deeper module-level detail — it's the
real inventory at THIS doc's own galaxy/river altitude (names + real
one-line roles), the level `/cartographer` and graphify actually need
to ground a map at.

**Real, standing update discipline**: Section 0 updates whenever a
real galaxy/river/connector is added or its role changes (the same
trigger as `scripts/graphify_river_group.py`'s own tables, since
Section 0 is sourced from them). The methodology sections (1 onward)
change only when the mapping RULES themselves change. Wired into
`update-logging-system`'s artifact map (see that skill's own file) and
into `/CEO` Grounded Mode (see `.claude/skills/CEO/SKILL.md`) so a
plan touching the mapping system checks this doc first.

---

## 0. The real Total Systems inventory — what actually exists

**4 real galaxies** (own operating boundary, per §3's rule below):

- **RPGACE Architecture** 🏛️ — the app/codebase itself. Every real
  external connector and AI provider routes through here (or through
  Oracle specifically, for AI providers — see §3's sharpened rule).
  Contains the 16 real rivers listed below.
- **Orchestrator CC** 🧭 — this Claude Code session. Planner/orchestrator:
  evidence-gathering, dispatch-writing, RPGACE-side schema/UI/doc work.
  No separate repo — runs inside RPGACE itself.
- **OpenMontage CC** 🎬 — a separate Claude Code session, agent-operated
  video pipeline, hands-on execution inside its own repo
  (`calesthio/OpenMontage`). Real dispatch channel: `openmontage_jobs`.
- **Graphify CC** 🌐 — the real 4th Total-system member, a separate
  Claude Code session generating `GRAPH_TREE.html` + the cross-repo
  global graph. Real dispatch channel: `graphify_jobs`.

**16 real rivers**, all inside the RPGACE Architecture galaxy. Real
names + real role, sourced Aug 13 (2nd correction, same day) directly
from `minotaur_map.html`'s own `.river-sub` narrative text for I-XI
(the authoritative real-role description — pulled verbatim/close-
paraphrase, NOT re-inferred from `RIVER_MODULES`' code-membership list
alone, which was the mistake the first version of this section made:
`RIVER_MODULES` says WHICH modules sit in a river, `minotaur_map.html`
says WHAT the river actually does) and `RIVER_ROLE_NOTE` for XII-XVI:

| River | Real role (grounded against `minotaur_map.html`) |
|---|---|
| I — Gatekeeper's Checkpoint | The real first step of every visit — nothing else happens until this river is crossed (`authGate`) |
| II — The Great Confluence | Once through the gate: every kind of information that can enter RPGACE, and the two great estuaries it all eventually reaches (`pathRouter` + the Great Tree's own commit point) |
| III — The Oracle Current | The most common entry point — what happens between typing a message and seeing a reply |
| IV — The Bookworm River | The longest river in RPGACE — a whole book carried from its cover to a finished shelf entry |
| V — Two Independent Streams | Content Intelligence still feeds the Great Tree; Schedule Oracle never does — its own separate river, start to finish |
| VI — The Judgment Chamber | Where ideas from the three entry rivers (Oracle/Bookworm/Content Intel) converge — how RPGACE decides where a new idea belongs in the Great Tree, and how confident it is (`phylumPath`) |
| VII — The Library Current | Downstream of a real placement — how a branch of the Tree becomes a real, readable article, and how two distant branches sometimes merge into something new (article generation + concept fusion) |
| VIII — The Confluence Pool | Everything still uncertain, from every river above, gathers in one place, waiting for Alex's own judgment (the real review queue) |
| IX — The Mirror and the Far Shore | Oracle learns to see its own reflection on everything above — and water leaves RPGACE entirely, carried to a Claude Code session. 4 real channels: Flagged Suggestion, Morning Brief, Fallback Drain, OpenMontage Commission (the one whose far shore is a genuinely different repository) |
| X — The Confluence of Chronicles | The final estuary — every river above flows into one shared place Alex can see and click into; water from River IX flows back the other way too |
| XI — Content Production Live | A beat or idea becomes a tracked ConID, carried through its own real phases, with an Oracle bar riding alongside so the conversation and the tracker never drift apart |
| XII — The API / Auth Layer | The one river carrying literal runtime API traffic to external Total-system members — every OpenMontage/Kimi/Luna/librosa/OpenArt/Composio call routes through here |
| XIII — Skills | The dispatch discipline every Total-system Claude Code session (Orchestrator CC/Graphify CC/OpenMontage CC) runs against |
| XIV — Oversight Docs | The shared truth layer Total-system members read from and write into |
| XV — Session Records / Backlog | Real dispatch/session history — the same real record `openmontage_jobs`/`graphify_jobs` rows themselves become once resolved |
| XVI — Dev Tooling | The actual scripts that build, ship, and graph the Total system itself (`graphify_river_group.py`/`graphify_to_obsidian.py`/`galaxy_map.py`) |

Rivers XII-XVI are real, not second-class — `minotaur_map.html`'s own
"🔗 The Total System Gateway" section states this directly: they carry
the connectors that let RPGACE receive and push data within the Total
system at all, a genuinely different kind of real traffic than I-XI's
in-app information flow, not a lesser one.

**Real harness + connector inventory** (canonical source: `EXTERNAL_
CONNECTORS`/`SUPABASE_CORE` in `scripts/graphify_river_group.py` —
full per-connector detail, including `tested`/`bridges_to`, lives
there and in `ai_tooling_and_rules_map.md`'s own 1d/1e tables; this is
the at-a-glance list, not a 3rd copy of the full detail):

- **Oracle** 🔮 — the real AI-provider harness inside RPGACE
  Architecture, mediating Anthropic (live/primary), Moonshot AI/Kimi
  (dormant), and OpenAI/Luna (dormant) — never a direct RPGACE→provider
  edge (§3).
- **Self-Awareness** 🪞 — `oracleAppGrounding.SELF_KNOWLEDGE`, Oracle's
  own live self-knowledge layer.
- **Supabase** 🗄️ — core infrastructure (not an "external provider" —
  RPGACE's own persistence layer), real communication (reads) vs.
  execution (writes) edges (§4).
- **10 real external connectors**: OpenMontage, Composio, librosa,
  FFmpeg, OpenArt (deferred), Jina AI, Last.fm, n8n, Whisper — each a
  real bridge node per §2, tagged tested/untested, never hidden.

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
4. **Connector edge** — a real, functional link between two real
   ACTORS (a galaxy, a module/function, or a connector/provider bridge
   node — see §1a below), tagged by its real interaction TYPE (§4),
   never by mere proximity.

### 1a. Rivers are a grouping label, not an actor — real Aug 13 correction

**A river never acts, calls, communicates, or gets called — only the
real caller INSIDE it does.** Alex's own direct correction: "no RPGACE
river is the group in which the caller exists, not the river itself,
it's just an overarching group for me to understand in terms that both
me and RPGACE total systems can communicate in so /misunderstanding
becomes less frequent." A river is a real, useful CATEGORY — the same
kind of thing a folder or a tag is — that lets a human and an AI talk
about "the group of modules that handle X" in one word instead of
naming every module every time. It has no agency of its own.

**What this changes, concretely:**
- A real functional edge (§4's interaction types) always has a real
  ACTOR at each end — a specific galaxy, module/function, or connector
  — never a bare river name. "River XI triggers OpenMontage" is
  shorthand for "Content Production Live's own 'Generate Video' button
  (a real function, which happens to live inside River XI's group)
  triggers OpenMontage" — the shorthand is fine in prose, but the
  underlying real edge always cites the real caller, not the river.
- A "river → river" flow (`RIVER_FLOWS` in `graphify_river_group.py`,
  drawn as `.river-flow-next` in `minotaur_map.html`) is a real,
  legitimate AGGREGATE view — it must be grounded in at least one real
  underlying caller-level edge crossing from a module in river A to a
  module/connector in river B (never invented for narrative symmetry)
  — but it is a rolled-up SUMMARY for human/AI orientation, not a
  literal 12th interaction type sitting alongside §4's 11 real ones.
  Never point `/perspective`, `galaxy_map.py`, or any Level 0-2 map at
  a river as if it were itself a Total-system member with its own
  relationships — that question is only ever answerable by asking the
  real module/function that lives inside it.
- This does not deprecate the river metaphor anywhere it already
  works well (`minotaur_map.html`'s whole labyrinth narrative, this
  doc's own §0 table) — it only fixes the literal EDGE semantics so a
  future map/report/self-report never implies a river itself did
  something, communicated something, or has its own opinion.

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

**Real, sharpened rule, Aug 13 2nd pass — a genuine G2 topology bug
found and fixed, not just a naming nuance**: every real AI-provider
edge (Anthropic/Kimi/Luna) draws FROM Oracle, never from RPGACE
Architecture directly — Oracle is the real mediator "orchestrating"
which provider actually gets called (Alex's own words), so the
topology must be RPGACE Architecture → Oracle → {provider}, never a
flat RPGACE Architecture → provider edge sitting parallel to Oracle's
own edge. The same discipline applies to any FUTURE AI provider added
to the map — it hangs off Oracle, not off RPGACE Architecture.

## 4. Interaction-type taxonomy (edges, not node color)

11 real types (10 original + `read_query`, added Aug 13 2nd pass — see
below), evidence-grounded against actual call sites, never derived
from river/node membership alone (redundant with node color/position
otherwise): `nav_route`, `ai_judgment_call`, `external_extract_call`,
`write_commit`, `human_confirm_gate`, `dispatch_trigger`,
`oversight_deposit`, `session_start_pull`, `doc_staleness_flag`,
`terminal_sink`, `read_query`. Canonical definitions + live color
tokens: `INTERACTION_TYPE_LABEL`/`INTERACTION_TYPE_COLOR` in
`scripts/graphify_river_group.py`.

**Real Alex framing, Aug 13 2nd pass, mapped onto these 11 types
directly (not a second taxonomy)**: "the lines should represent what
AFFECTS what (`doc_staleness_flag`), what COMMUNICATES with what
(`read_query`/`external_extract_call`/`session_start_pull`), what
INFORMATION-CHANGE-OUTPUT is done (`ai_judgment_call`/`write_commit`),
then where it is TRANSPORTED TO (`dispatch_trigger`/
`oversight_deposit`), with HUMAN GATES on my end (`human_confirm_gate`)."
`read_query` was added specifically because Supabase's real reads had
no honest home in the original 10 — `session_start_pull` is real but
scoped narrowly to session-start reads only, and forcing an ongoing
real-time read into that bucket would have been dishonest. New types
get added there first,
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
hierarchy that has a real, standing connection into Oversight (a real
caller inside one river whose output lands in River XIV, a galaxy's
own real doc trail) represents that connection explicitly — reusing
`minotaur_map.html`'s existing `.river-flow-next` connector data
(`RIVER_FLOWS` in the same Python script — a real aggregate view per
§1a, always grounded in an actual caller-level edge), never re-derived.

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

## 9. Level-2 layout principle — flow runs left (input) to right (output)

Real, standing rule (Alex's own direct correction, Aug 13, after seeing
a radial Level-2 diagram): "it should be flowing from left (input) to
right (output) and depict contributers along the way from left to
right... the river flows through modules into river 2." This is the
required layout for any river with real modules, not a one-off fix:

- **Far left**: the river's own identity hub, and any real incoming
  `RIVER_FLOWS`/`FLOWS_IN` connection from another river (real input).
- **Middle band, ordered by real evidence** (`compute_module_flow_rank`
  in `graphify_river_group.py`): modules position left-to-right by
  their real relationship to the river's own computed terminal — direct
  upstream feeders sit left of it, the terminal itself sits at the real
  convergence point, real downstream helpers (modules the terminal
  calls out to) sit just past it. A module with no computed
  relationship gets a neutral, honestly-unranked position — never
  guessed onto the flow line.
- **Far right**: any real outgoing `RIVER_FLOWS` connection (real
  output), plus the terminal's own 👁️/🤖 badge (a real visible-in-app
  output, a real external-AI connection, or both).
- **Contributors** (dashboard cards, G0 external connectors, skill
  streams) attach as real tributaries at the specific module's position
  when a real citation supports it, or near the terminal when it
  doesn't — "joining the flow along the way," per Alex's own words,
  never scattered in a separate ring disconnected from the flow itself.

**Real, stated exception**: a river with NO real registered modules
(Rivers XII-XVI) has no module flow to reorient — these keep the
original radial layout, since forcing a left-right shape onto a river
that structurally has nothing to flow through would be decorative, not
evidence-based. This also preserves River XIII's own real skill "web"
(25 nodes), which Alex explicitly wanted kept radial ("itll look like a
slow trickle or spider web... but will explain rivers so much better").

---

Full compiled spec, open forks, and paranoia/drift/restructure scrutiny
of this whole ask: `records/2026-08/galaxy_map_ceo_loop1_spec_paranoia_2026-08-13.txt`.
