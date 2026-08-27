#!/usr/bin/env python3
"""
graphify_river_group.py — Aug 6, real Alex ask: "id also like graphify to
resemble more of a river, with functions skills and modules to be grouped
based on river... to make minotaur mapping easier."

**Aug 13 update — this script's real methodology now has a canonical
prose home: `system_map_spec.md`.** That doc states the RULES (the
Galaxy->River->Module->Connector hierarchy, the connector-bridge-node
convention, the interaction-type taxonomy, the known extraction blind
spots); the tables below (RIVER_MODULES/RIVER_FLOWS/EXTERNAL_CONNECTORS/
INTERACTION_TYPE_LABEL) remain the real LIVE DATA that methodology
governs. Update the spec doc first when the METHODOLOGY changes, this
script when the DATA changes — same "doc first, mirror second"
discipline already governing RIVER_FLOWS' own relationship to
minotaur_map.html. See `.claude/skills/cartographer/SKILL.md` for the
real cross-talk/trickle-down-up discipline built around this relationship.

Real, bounded scope (Alex-confirmed via /interrogation, Aug 6): NAMED
MODULES ONLY — not every node. graphify's own AST extractor cannot see
RPGACE.register('name', {...}) boundaries (confirmed, see
graphify_restructure_paranoia_2026-08-06.txt), so a per-function river
tag isn't available for free; this script derives it itself, from real
evidence:

1. Parses rpgace_core.js's own real /* ===MODULE:x=== */ .../* ===END:x=== */
   markers (54 real pairs, the project's own standing convention) to get
   each module's real line range.
2. For every node in graph.html's embedded RAW_NODES whose source_file is
   rpgace_core.js and whose source_location falls inside a known module's
   range, tags it with that module's real river (per the curated
   RIVER_MODULES table below — built from interconnection_map.md's own
   section headers + minotaur_map.html's own river titles, not guessed).
3. Recolors matched nodes to a real per-river palette (11 colors, same
   RPGACE-token sourcing discipline as graphify_recolor.py) and gives them
   a new `community` id (1000+river number, well clear of graphify's own
   0-184 range) so the EXISTING legend-toggle checkbox code works
   correctly for rivers too — zero new JS needed (rule 8: reuse the
   existing LEGEND.forEach rendering/toggle logic already in the file).
4. Appends 11 new LEGEND entries (one per river that matched at least one
   node) so they show up in the same sidebar list, toggleable the same way.

Unmatched nodes (main.js, docs, generic/unmapped rpgace_core.js
functions outside any real module marker) are left exactly as
graphify_recolor.py already colored them — this is a deliberate, honest
scope limit, not an oversight. Run AFTER graphify_recolor.py, on the
same file.

Aug 6, real Alex ask (2nd round, via /Engineer): "communities in graphify
should make up to make block, then the modules, and then the river in
the physical space, it just looks like a massive blob." Extends this
script from color-only tagging to REAL spatial clustering: every
river-tagged node now also gets a fixed x/y position inside its own
river's "zone" (11 zones arranged around one large circle, deterministic
per-node jitter via a hash of the node id - never Math.random, so
re-running this script against a fresh export always produces the exact
same layout, same idempotency discipline as graphify_recolor.py).
`fixed:{x:true,y:true}` is set ONLY on these nodes, so vis.js's own
forceAtlas2Based physics leaves them exactly where placed instead of
letting the sim's repulsion drag them back toward the blob - the other
1048 untagged nodes are completely unaffected, same "named modules
only" honest scope limit as the color-only version.

Real, necessary companion fix: graph.html's own nodesDS mapping
function explicitly whitelists which RAW_NODES fields become vis.js
DataSet fields (id/label/color/size/font/title/_community/...) - it did
NOT forward x/y/fixed, so setting those fields on RAW_NODES alone would
have been silently dropped. This script also patches that one mapping
line (idempotent - checks for its own marker string before patching, so
re-running does not double-patch), a real find made by reading
graph.html's own init script directly rather than assuming vis.js would
"just work."

Round 3 (Aug 10/11, real /paranoia continuation, Alex out of the loop on
this specific sub-decision - the classification rules below are
evidence-based, not aesthetic, so this ran straight to build): splits
the old single Zone XIII (Dev Process) into 4 real sub-zones (Skills /
Oversight Docs / Session Records-Backlog / Dev Tooling) using the exact
same file-path evidence already governing the original classification,
just finer-grained; and adds classify_mainjs_by_keyword(), which tags
main.js's 240 nodes INDIVIDUALLY by real function-name keyword instead
of leaving the whole file as one honestly-unclassified blob - main.js is
one connected component internally, so the existing
build_component_zone_map() component-vote approach would have wrongly
lumped all of it into whichever river its most-populous neighbor
happened to be. 228 of 240 real main.js nodes matched a real keyword
rule (see MAINJS_RIVER_RULES); the remaining 12 (main.js's own bootstrap
state, a dead stub, the cross-cutting global-text-select feature, and
the new shared _sbGet helper used by many domains at once) stay
honestly unclassified, same discipline as everywhere else in this file.

Usage:
    python3 scripts/graphify_river_group.py [path/to/graph.html]
"""
import hashlib
import json
import math
import re
import sys
from pathlib import Path

CORE_JS = Path('rpgace_core.js')
# main.js was mechanically merged into rpgace_core.js Aug 20 2026 (Alex's
# own direct ask) — there is no separate main.js file to point at anymore.
# Every former MAIN_JS reader now sources from CORE_JS's own legacy
# section instead, via _legacy_mainjs_text().
INDEX_HTML = Path('index.html')

# Real, confirmed structural finding, Aug 13 (Alex asked for a "small
# semantic re-export to close the errorLog gap" — investigated first
# rather than blindly running one, since a semantic/LLM pass wouldn't
# have fixed this): graphify's own AST extractor stops finding real
# function declarations partway through rpgace_core.js's tail region
# (confirmed on BOTH the original richer export AND a fresh --no-
# description code-only rebuild — same cutoff either way, so this is
# an EXTRACTION gap, not a missing-description gap). 6 real modules
# (jargonEncyclopedia/pathRouter/perfWatch/voiceInput/mockOracle/
# errorLog, 34 real methods total) had ZERO graph.json/graph.html
# representation as a result. Fixed by hand-entering real, accurate
# nodes for all 34 (real function names + real line numbers, read
# directly from source — not fabricated) into both graph.json and
# graph.html's embedded RAW_NODES, then re-running this script so the
# 3 river-mapped modules (jargonEncyclopedia->VII, pathRouter->II,
# mockOracle->III) get properly colored/positioned; the other 3
# (perfWatch/voiceInput/errorLog) correctly stay untagged, matching
# the same cross-cutting-infra treatment already given to leftNav/
# popup scaffolding elsewhere in this file. A future full `graphify
# export`-family rebuild will likely drop these hand-entered nodes
# again (same tail-cutoff bug) — re-apply this same fix if that
# happens, don't assume a fresh export closes it.

# Real river palette - RPGACE style.css tokens again, deliberately
# DIFFERENT hexes from graphify_recolor.py's community palette so a
# river-tagged node is visually distinct from an untagged one even
# when they'd otherwise land on a similar color.
RIVER_COLOR = {
    1: '#cc4a4a',   # --red     River I   Gatekeeper's Checkpoint
    2: '#4a8ccc',   # --blue    River II  The Great Confluence
    3: '#c9a84c',   # --gold    River III The Oracle Current
    4: '#9b6ec8',   # --purple  River IV  The Bookworm River
    5: '#4caf82',   # --green   River V   Daily Ops: Agenda, Schedule & Journal (renamed G49, Aug 18 — see RIVER_NAME)
    6: '#e8c96a',   # --gold2   River VI  The Judgment Chamber
    7: '#cc7a3a',   # --orange  River VII The Library Current
    8: '#5588ee',   # --mp-col  River VIII The Confluence Pool
    9: '#e05555',   # --hp-col  River IX  The Mirror and the Far Shore
    10: '#868db8',  # --muted   River X   The Confluence of Chronicles
    11: '#3a4570',  # --border2 River XI  Content Production Live
    # G103 (Aug 26 2026) — real rechronologize, Alex's own direct ask
    # ("why didn't you rename river 17 - come on that an obvious fix,
    # rechronologise the rivers please"), same session as the G102
    # retirement above. Once Rivers XII-XVI (old numbering) were marked
    # deprecated/merged, River XVII (a real, live, module-bearing river)
    # was left stranded right after River XI with an awkward gap — the
    # "obvious fix" is closing that gap so the LIVE river sequence stays
    # contiguous and chronological (I-XII), with the 5 retired
    # Total-systems categories shifted one slot each to sit AFTER every
    # real river (XIII-XVII), in their own original relative order.
    # Real permutation applied everywhere a river number appears
    # (RIVER_COLOR/RIVER_NAME/RIVER_MODULES/RIVER_ROLE_NOTE/
    # RIVER_RETIRED/RIVER_FLOWS/FLOWS_IN/DASHBOARD_CARDS/
    # EXTERNAL_RIVER_LINKS/SKILL_SECONDARY_RIVER/SKILL_RIVER/
    # OVERSIGHT_RIVER, plus every hand-authored doc and the Obsidian
    # vault filenames): old 17 -> new 12 (Research & Intel Stream,
    # now the live sequence's own real next river); old 12 -> new 13
    # (API/Auth Layer); old 13 -> new 14 (Skills); old 14 -> new 15
    # (Oversight Docs); old 15 -> new 16 (Session Records/Backlog);
    # old 16 -> new 17 (Dev Tooling). Rivers 1-11 are untouched.
    # PURELY HISTORICAL/narrative comments elsewhere in this file that
    # still cite an OLD river number (e.g. "River XII" meaning the old
    # API/Auth Layer, in a dated Aug 13/14 note) are left as-said per
    # this project's own doc-discipline precedent (same as the Aug 11
    # phylum renumber) — this note is the one place to look for the
    # current, correct mapping; read any older in-code comment
    # mentioning a specific river number with this permutation in mind.
    12: '#4A90E2',  # --blue (minotaur/manual/patch_notes palette) River XII  Research & Intel Stream (was River XVII)
    13: '#2ABFB0',  # --teal    River XIII  The API / Auth Layer (shared infra) (was River XII)
    14: '#E2A83D',  # --amber (minotaur/manual/patch_notes palette) River XIV  Skills (was River XIII)
    15: '#d4daf5',  # --text (style.css)   River XV  Oversight Docs (was River XIV)
    16: '#20263a',  # --panel3 (style.css) River XVI  Session Records / Backlog (was River XV)
    17: '#2a3050',  # --border (style.css) River XVII  Dev Tooling (was River XVI)
}
RIVER_NAME = {
    1: "River I — Gatekeeper's Checkpoint",
    2: 'River II — The Great Confluence',
    3: 'River III — The Oracle Current',
    4: 'River IV — The Bookworm River',
    5: 'River V — Daily Ops: Agenda, Schedule & Journal',  # G49 (Aug 18): renamed after the real split — "Two Independent Streams" no longer applies, this river now holds one coherent real theme
    6: 'River VI — The Judgment Chamber',
    7: 'River VII — The Library Current',
    8: 'River VIII — The Confluence Pool',
    9: 'River IX — The Mirror and the Far Shore',
    10: 'River X — The Confluence of Chronicles',
    11: 'River XI — Content Production Live',
    12: 'River XII — The Research & Intel Stream',  # G103 (Aug 26): was River XVII, moved to close the gap left by retiring the old 12-16
    13: 'River XIII — The API / Auth Layer',  # G103: was River XII
    14: 'River XIV — Skills',  # G103: was River XIII
    15: 'River XV — Oversight Docs',  # G103: was River XIV
    16: 'River XVI — Session Records / Backlog',  # G103: was River XV
    17: 'River XVII — Dev Tooling',  # G103: was River XVI
}
# Aug 11, real Alex ask: 12-16 stop being a separate "Zone" species and
# join the unified river system, because they DO carry real Total-
# systems traffic — Alex's own correction: "they do have connectors,
# otherwise it would not receive and push data within the total
# systems." Real, checkable, not invented: River XII (API/Auth) is
# literally the layer every external Total-system call (OpenMontage,
# Kimi/Luna, librosa/ffmpeg, OpenArt, Composio) routes through —
# api/oracle.js, api/_context.js, api/data-write.js. Rivers XIII-XVI
# carry a different KIND of real traffic — not runtime API calls, but
# the dev-process/knowledge layer the Total-system's own Claude Code
# members (RPGACE CC, Graphify CC, OpenMontage CC) read from and write
# into to coordinate (skills define dispatch discipline; oversight docs
# are the shared truth Graphify CC deposits into via graphify_jobs;
# session records ARE the real dispatch history; dev tooling is what
# generates this very graph/vault output). See EXTERNAL_CONNECTORS and
# RIVER_ROLE_NOTE below for the real, sourced detail — canonical source
# of truth is ai_tooling_and_rules_map.md's own "External AI/tool
# providers" table (1d); this mirrors those same facts for graphify/
# Obsidian display, never invents new ones (rule 8: same underlying
# facts, not restated from scratch).
TOTAL_ZONES = 17  # Real, stale-fact bug fixed Aug 20 2026 (found via this session's own
# Obsidian-vault v2-scope build, not a hypothetical): RIVER_NAME already had 17 real
# entries since the Aug 18 G49 River-v2 split (River XVII — The Research & Intel
# Stream), but this constant was never updated to match, silently dropping River
# XVII from every consumer (the Obsidian vault's own hub-note loop, and the
# zone_center() angle formula below - a real rendering risk, since river=17's old
# angle 2*pi*16/16 collided with river=1's angle 2*pi*0/16).

# Real, evidence-mirrored from ai_tooling_and_rules_map.md's own 1d
# table (the canonical source — this is a presentation-layer mirror for
# graphify/Obsidian, not a second independent fact-set). River XII is
# the one river that carries literal runtime API traffic to external
# Total-system members, so it's the only one that gets this structured
# connector list; status values ('live'/'dormant'/'deferred') match
# that table's own wording exactly.
# Real, full parity pass Aug 13 — synced against ai_tooling_and_rules_map.md's
# own canonical 1d table (this dict was missing 5 real, already-catalogued
# rows: Jina AI, Last.fm, n8n, Whisper, Anthropic — a real staleness gap,
# not new discovery). Alex's own real ask, same pass: "implement all
# externals built and included... ones that arent tests should be present,
# just logged to smoke test as not tested, yet visible... do this for
# all of them" (the OpenMontage connector-node pattern — a real bridge
# node into its own external galaxy — generalized to every real
# connector, not just OpenMontage). Two new real fields per entry:
# 'tested' (real hand-verified working, vs. built-but-unconfirmed — NEVER
# hides an entry, only feeds a future smoke_test.html flag) and
# 'bridges_to' (the real external system/repo this connector is the real
# spring/mouth into — the concrete "own galaxy" this node bridges to for
# the future Galaxy Map's G2/G3 build). Supabase is deliberately NOT in
# this list — it's core RPGACE infrastructure, not an external "provider"
# in the same sense (see the new 1e section in ai_tooling_and_rules_map.md
# + this file's own SUPABASE_CORE constant below).
EXTERNAL_CONNECTORS = [
    {'name': 'Anthropic (Claude API)', 'status': 'live', 'tested': True, 'via': 'api/oracle.js callClaude()',
     'bridges_to': 'Anthropic\'s own hosted API — no separate repo/galaxy to bridge to, the real default provider',
     'note': 'the real default Oracle provider — every ungrounded Oracle call routes here unless a dormant provider (Kimi/Luna) is live. River III\'s Oracle Current is the harness; this IS the real external call, not RPGACE code.'},
    {'name': 'OpenMontage', 'status': 'live', 'tested': True, 'via': 'openmontage_jobs Supabase queue',
     'bridges_to': 'calesthio/OpenMontage repo, operated by a separate Claude Code session ("OpenMontage CC")',
     'note': 'agent-operated video pipeline, driven by a separate Claude Code session ("OpenMontage CC") in its own repo — never RPGACE-embedded. Real spring AND mouth both sit in River XI: opens at Content Production Live\'s "Generate Video," closes at "Mark ConID as Filmed" (the reservoir is polled, not pushed).'},
    {'name': 'Composio', 'status': 'live', 'tested': True, 'via': 'api/composio.js / api/executor.js / api/orchestrate.js',
     'bridges_to': 'Gmail / Instagram / YouTube / Notion / GitHub connected accounts',
     'note': 'Gmail/Instagram/YouTube/Notion/GitHub connected-account automation — real triggering call sites confirmed by grep: River V\'s morningBrief (Gmail fetch) and River XI\'s contentRepurpose (Notion page + YouTube channel data via Supadata).'},
    {'name': 'Moonshot AI (Kimi)', 'status': 'dormant', 'tested': False, 'via': 'api/oracle.js provider:\'kimi\'',
     'bridges_to': 'Moonshot AI\'s own hosted API (api.moonshot.ai/v1)',
     'note': 'real OpenAI-compatible scaffold, dormant until MOONSHOT_API_KEY is set — would be called from River III\'s Oracle Current in place of the default Anthropic call once live.'},
    {'name': 'OpenAI (Luna)', 'status': 'dormant', 'tested': False, 'via': 'api/oracle.js provider:\'luna\'',
     'bridges_to': 'OpenAI\'s own hosted API',
     'note': 'same scaffold shape as Kimi, dormant until OPENAI_API_KEY is set — same River III relationship once live.'},
    {'name': 'librosa', 'status': 'optional/local', 'tested': False, 'via': 'beat_audio_jobs + beat-audio bucket, a local Python script (real script identity UNCONFIRMED as of Aug 27)',
     'bridges_to': 'Alex\'s own local machine (not a hosted service) — real evidence found local_server.py itself (real source now in this repo) has zero librosa/BPM code, so this connector\'s "via local_server.py" claim is likely stale; whether a genuinely separate script exists is honestly open (Alex: "i think so but forgot it" — see ceo_plan_items G114)',
     'note': 'BPM + Major/Minor key analysis only, needs Alex running a local Python snippet — not a hosted service. Triggered by River XI\'s Beat Log, nowhere else.'},
    {'name': 'FFmpeg', 'status': 'live (external repo)', 'tested': True, 'via': "OpenMontage's own pipeline, confirmed working July 31",
     'bridges_to': 'runs inside the OpenMontage galaxy itself, not a separate bridge',
     'note': "runs inside OpenMontage CC's OpenMontage environment, not RPGACE's own runtime — reached only via River XI's OpenMontage handoff (through this river), never called directly by any RPGACE river."},
    {'name': 'OpenArt', 'status': 'deferred', 'tested': False, 'via': 'none yet',
     'bridges_to': 'not wired — a named future companion galaxy to OpenMontage',
     'note': '"connect it at a later date" — a named future video-gen companion to OpenMontage, not wired to anything yet'},
    {'name': 'Graphify CC', 'status': 'live', 'tested': True, 'via': 'graphify_jobs Supabase queue',
     'bridges_to': 'graphifyy (PyPI), operated by a separate Claude Code session ("Graphify CC")',
     'note': 'the real 4th Total-system member — generates graphify-out/GRAPH_TREE.html + the cross-repo global graph. Dispatched from River IX\'s own session-start check, deposits real findings back into River XIV via graphify_jobs.'},
    {'name': 'Jina AI', 'status': 'live', 'tested': True, 'via': 'r.jina.ai, 4 real call sites (scout.js/bookworm-fetch.js/main.js/_context.js)',
     'bridges_to': 'Jina AI\'s own hosted read/fetch API',
     'note': 'real, live URL-to-text fetch — load-bearing for Bookworm URL ingestion, Schedule Oracle, and chat-pasted-URL handling. Confirmed by direct grep, not assumed.'},
    {'name': 'Last.fm', 'status': 'live', 'tested': True, 'via': 'api/lastfm.js, LASTFM_API_KEY',
     'bridges_to': 'Last.fm\'s own hosted API',
     'note': 'real artist/tag discovery — refCorpus.findMatches()\'s real fallback when no reference-corpus match exists; grows the corpus from its own results.'},
    {'name': 'n8n', 'status': 'built, unconfirmed', 'tested': False, 'via': 'n8n/rota_sync_workflow.json (Cron -> scripts/fourth_rota.py)',
     'bridges_to': 'a self-hosted/cloud n8n instance Alex imports the workflow into',
     'note': 'real, importable workflow for F10\'s rota-sync automation — never test-run against a live unattended execution (2 manual login-confirmation gates deliberately untouched).'},
    {'name': 'Whisper (OpenAI, local)', 'status': 'built, unconfirmed this session', 'tested': False, 'via': 'local_server.py / Python scripts on Alex\'s own machine',
     'bridges_to': 'Alex\'s own local machine — not in this repo',
     'note': 'local speech-to-text — historically confirmed working July 7 (Content Intelligence: metadata->download->Whisper->frame extraction->Claude Vision->Oracle report). Current live status genuinely unconfirmed this session, same visibility gap as local_server.py\'s other integrations — do not claim active without asking Alex.'},
]

# Supabase is deliberately its own real category, not folded into
# EXTERNAL_CONNECTORS above — it's core RPGACE infrastructure (the
# persistence layer nearly every river writes to/reads from), not an
# optional external provider the app reaches OUT to. Real Alex ask, same
# pass: "i think supabase should also be part of the galaxy and minotaur
# river system, since it is part of RPGACE total systems and is used a
# lot." Kept as a single real summary entry (not per-table) since every
# individual table is already covered in manual.html's own Supabase
# Tables section — this is the CONNECTOR-LEVEL fact, one real hub node
# every river writes into.
SUPABASE_CORE = {
    'name': 'Supabase', 'status': 'live', 'tested': True,
    'via': 'RPGACE.sb.* (anon key, RLS-gated) + /api/data-write.js (service-role proxy for 19 restricted tables)',
    'bridges_to': 'Supabase\'s own hosted Postgres project (gripopghczmrbrhqtqbm) — RPGACE\'s real persistence layer, not a separate operated galaxy',
    'note': 'the real hub every river writes into/reads from — not a "connector" in the OpenMontage/Composio sense (RPGACE owns this data, it does not hand off to an external agent), but a real, load-bearing Total-system member in its own right, used by nearly every real river.',
}

# Real, honest per-river role text for XIII-XVI — replaces the old
# negative "no single-module river tag" framing (which read as
# second-class) with an affirmative statement of their actual real role
# in the Total system, since that's what they are now presented as.
RIVER_ROLE_NOTE = {
    13: 'The one river that carries literal runtime API traffic to external Total-system members — every OpenMontage/Kimi/Luna/librosa/OpenArt/Composio call routes through here (api/oracle.js, api/_context.js, api/data-write.js). File-path membership: `api/*.js`. See "Total-systems connectors" below for the real, per-connector detail.',
    14: 'The dispatch discipline every Total-system Claude Code session (RPGACE CC, Graphify CC, OpenMontage CC) runs against — file-path membership: `.claude/skills/`.',
    15: 'The shared truth layer Total-system members read from and write into (Graphify CC deposits real findings here via graphify_jobs when a row is flagged "please log to Chronicles"). File-path membership: the live-maintained doc set.',
    16: 'Real dispatch/session history — dated backlog `.txt`/`.md` at repo root, the same real record `openmontage_jobs`/`graphify_jobs` rows themselves become once resolved.',
    17: 'The actual scripts/config that build, ship, and graph the Total system — including the very scripts (graphify_recolor.py/graphify_river_group.py/graphify_to_obsidian.py/obsidian_vault_to_html.py) that generate this graph and the Obsidian vault themselves.',
}

# G102 (Aug 26 2026) — 5 rivers retired (marked deprecated/merged,
# NEVER deleted outright — Alex's own confirmed answer, "all 5 and yes
# too"). Real evidence for retiring these 5 specifically: all 5 have
# ZERO real rpgace_core.js modules (confirmed by direct query) — they
# were always a role-DESCRIPTION of a Total-systems category, never a
# river of real app code the way 1-12 are. The L0-unit Infra/Inter
# system (G77-G100, Aug 25 2026) now gives every one of those same real
# categories its OWN evidence-grounded bubble system, at finer grain
# than a single river-wide role note ever was — so the retirement isn't
# a deletion of real coverage, it's a real upgrade already built, just
# never pointed back at from here. Deliberately NOT retiring 1-12 —
# those all have real modules (RIVER_MODULES[n] non-empty) and are the
# real app-code rivers the whole Galaxy Map hierarchy exists to
# describe; only the 5 zero-module "Total-systems category" rivers are
# in scope, per Alex's own explicit confirmation of exactly this list
# (not "retire everything the L0 unit system also covers" — Oracle/
# Supabase, River III/River V's own hub modules etc. stay live rivers
# with real modules, their own L0-unit facet is an ADDITIONAL lens, not
# a replacement). Renumbered 12->17 (from the original 12-16), G103
# (Aug 26 2026, same session) — see RIVER_COLOR's own header note for
# the full rechronologize: River XII was freed for the real, live
# Research & Intel Stream river (old River XVII), so these 5 retired
# categories shifted one slot each to sit AFTER every real river.
RIVER_RETIRED = {
    13: {
        'reason': 'Zero real modules — this river was always a role description of the API/auth call surface, not a river of actual app code. That real role is now represented per-actor at L0, at finer grain than one river-wide note ever gave.',
        'superseded_by': [
            ('Supabase (Infra/Inter)', 'galaxy_map_supabase.html#view-map'),
            ('Oracle (Infra/Inter)', 'galaxy_map_oracle.html#view-map'),
            ('Composio', 'galaxy_map_connectors.html#conn-composio'),
            ('Jina AI', 'galaxy_map_connectors.html#conn-jina'),
            ('Last.fm', 'galaxy_map_connectors.html#conn-lastfm'),
            ('librosa', 'galaxy_map_connectors.html#conn-librosa'),
            ('n8n', 'galaxy_map_connectors.html#conn-n8n'),
            ('Whisper', 'galaxy_map_connectors.html#conn-whisper'),
        ],
    },
    14: {
        'reason': 'Zero real modules — this river was always the Claude Code skills dev-process layer, not app code. The Skills L0 unit\'s own real Infra/Inter bubble system covers every skill individually now (per-skill axes), a real upgrade over one river-wide role note.',
        'superseded_by': [('Skills (Infra/Inter, per-skill)', 'galaxy_map_skill_network.html#view-table')],
    },
    15: {
        'reason': 'Zero real modules — the shared oversight-doc truth layer. The Oversight Docs L0 unit\'s own real Infra/Inter system covers this now.',
        'superseded_by': [('Oversight Docs (Infra/Inter)', 'galaxy_map_oversight_sync.html#cat-sharedinfra')],
    },
    16: {
        'reason': 'Zero real modules — real dispatch/session history (dated backlog .txt/.md at repo root). Honest gap, not force-mapped: no single L0 unit is a clean 1:1 successor for "every dated file at repo root." Orchestrator CC\'s own unit is the closest real relationship (real Total-systems dispatch history with OpenMontage CC/Graphify CC lives there), but it does not cover the river\'s full original file-path membership.',
        'superseded_by': [('Orchestrator CC (partial — Total-systems dispatch history only)', 'galaxy_map_orchestrator_openmontage.html#cat-sharedinfra')],
    },
    17: {
        'reason': 'Zero real modules — the actual scripts/config that build/ship/graph the Total system (including the very scripts that generate this graph and the Obsidian vault). Honest gap, not force-mapped: no L0 unit represents "dev tooling" as its own real actor. Orchestrator CC is the closest real relationship (it is the session that runs this tooling), but tooling itself was never promoted to a unit.',
        'superseded_by': [('Orchestrator CC (partial — runs this tooling)', 'galaxy_map_orchestrator_openmontage.html#cat-sharedinfra')],
    },
}


def river_retirement_note_html(rnum, compact=False):
    """Real, evidence-grounded retirement banner for a river marked in
    RIVER_RETIRED. Returns '' for a live river (1-12) — every call
    site can call this unconditionally, no per-caller river_num in
    RIVER_RETIRED check needed (rule 8: one shared gate, not N copies).
    `compact=True` renders a shorter one-line version for tight spaces
    (ring-node tooltips, legend rows) vs. the fuller Level-2 banner."""
    info = RIVER_RETIRED.get(rnum)
    if not info:
        return ''
    links = ' · '.join(f'<a href="{href}">{label}</a>' for label, href in info['superseded_by'])
    if compact:
        return (f'<div class="river-retired-note" style="border-left:3px solid #cc4a4a;'
                f'background:rgba(204,74,74,.10);padding:6px 10px;margin:6px 0;border-radius:5px;font-size:12px;">'
                f'<b>⚠️ Deprecated — merged into the L0 Infra/Inter system.</b> See: {links}</div>')
    return (f'<div class="river-retired-note" style="border-left:3px solid #cc4a4a;'
            f'background:rgba(204,74,74,.10);padding:12px 16px;margin:12px 0;border-radius:6px;">'
            f'<b>⚠️ Retired (Aug 26 2026, G102) — marked deprecated/merged, not deleted.</b><br>'
            f'{info["reason"]}<br><b>See instead:</b> {links}</div>')


# Real module -> river mapping, built from interconnection_map.md's own
# section headers (Oracle Pipeline / Taxonomy Tree Pipeline / Content
# Production Pipeline / Schedule System / the Unified placement engine /
# Chronicles / API auth / Claude Code fallback lane / OpenMontage handoff
# lane) cross-referenced against minotaur_map.html's own 11 river titles
# and rpgace_core.js's real registered module names (grepped, not
# invented; re-verified Aug 22 2026 via a real /paranoia+/drift pass -
# live count is 55, not the "54" this comment used to claim, a real
# minor stale-count drift caught the same way this whole check exists
# to catch). Modules that are genuinely cross-cutting UI/infra
# (leftNav, popup scaffolding, voiceInput, perfWatch, pwaInstall,
# quickActions, docsLinks [dead], suppressQuestPopup, myFeature, config,
# errorLog [added Aug 12, never reconciled into this list until the Aug
# 22 pass above found it - a real, minor, standalone gap, not connected
# to that day's own actual code changes])
# are deliberately left OUT - they don't belong to one river, and
# force-fitting them would be dishonest, not "making mapping easier."
RIVER_MODULES = {
    1: ['authGate'],
    2: ['pathRouter'],
    3: ['oracleAppGrounding', 'oracleTreeGrounding', 'oracleFetchGuard',
        'oracleDevBridge', 'mockOracle', 'oracleProviderMode', 'agentsIntoOracle', 'prodOraclePanel',
        'instaOraclePanel', 'youtubeOracle', 'tiktokOracle', 'scheduleOracle',
        'feynman'],
    4: ['bookworm'],
    # G49 (Aug 18 2026) — real River-v2 closer look, per the already-
    # locked Part 6 reconciled approach (interaction evidence + shared-
    # goal coherence, never interaction alone). Real evidence gathered:
    # a fresh global module-interaction-graph run (same 4-signal method
    # as compute_intra_river_flow(), computed river-internally this
    # time) found River V splits into 9 real components along an exact
    # line the river's OWN NAME already predicted — "Two Independent
    # Streams." The 5 Content-Intelligence/research modules share ZERO
    # real interaction with the 5 agenda/schedule/journal modules, and
    # no real shared GOAL beyond "dashboard content that isn't Oracle/
    # taxonomy/beat-pipeline" — genuinely two different real features,
    # not one goal split into steps. This is the real, evidenced case
    # for a split (unlike River III/VII below, where goal-coherence
    # held even without full interaction evidence). Moved to River 17.
    5: ['scheduleFixes', 'shiftSync', 'agendaReminder',
        'morningBrief', 'journalQoL'],
    6: ['phylumPath'],
    7: ['jargonEncyclopedia', 'encyclopediaQoL', 'encSync', 'encTaxonomyLink',
        'refCorpus'],
    8: ['taxonomyReviewQueue', 'taxonomySync', 'taxonomyTree'],
    9: ['knowledgeGap'],
    10: ['chroniclesLog', 'careerStatCard'],
    11: ['contentProductionLive', 'beatLog', 'videoPipeline', 'videoSummary',
         'conidPot', 'contentRepurpose', 'visualOracle'],
    # G49 (Aug 18 2026) — the real Research/Intel half split off River V
    # (see River 5's own comment for the full real evidence). Real
    # shared goal: Content Intelligence ingestion, dedup, and review —
    # a genuinely different real feature from River 5's remaining
    # agenda/schedule/journal content. Renumbered 17->12, G103 (Aug 26
    # 2026) — see RIVER_COLOR's own header note for the full rechronologize.
    12: ['researchTabs', 'intelBatchList', 'intelDelete', 'intelDedup',
         'ciAutoPropose'],
}
MODULE_RIVER = {m: r for r, mods in RIVER_MODULES.items() for m in mods}

# Real, sourced mirror of dashDeck.MODULES (rpgace_core.js) — Alex's
# own Aug 13 ask for G4: "we should also include dashboard cards as
# reference points too." A dashboard card is not itself a river member
# (dashDeck is deliberately excluded from RIVER_MODULES above — it's
# cross-cutting UI, same as leftNav/popup scaffolding) but it IS a
# real, user-clickable entry point Alex actually uses to reach a
# river — exactly the kind of Total-systems relationship the Galaxy
# Map exists to show. Each entry's `rivers` list is read directly off
# that card's own real `go()` handler in rpgace_core.js (grepped, not
# guessed) resolved through MODULE_RIVER above — never re-derived from
# scratch, same "doc first, mirror second" discipline as
# EXTERNAL_CONNECTORS. Rule 8: this is a presentation-layer mirror,
# dashDeck.MODULES stays the one real source of the card list/labels/
# order itself.
#
# Two real, honest multi-value/partial cases, not smoothed over for
# symmetry: 'taxonomy' branches at runtime (review queue when pending
# items exist, else Phylum Path browse) — genuinely 2 real target
# rivers, both shown. 'agenda' opens a page whose CORE content (the
# Quest Board / addXP()/completeQuest()) lives in main.js and has never
# been river-tagged (same standing scope limit RIVER_MODULES' own
# docstring already names for cross-cutting main.js code) — its listed
# river is real (agendaReminder, a genuine QoL layer on the same page)
# but is honestly flagged as partial, not the page's whole story.
DASHBOARD_CARDS = [
    # G102 (Aug 25 2026) — the real "🧠 Research Lab" card is GONE, not
    # just stale data: Alex flagged its own galaxy_map_alex_path.html
    # entry directly ("this shouldn't be there too"), and direct code
    # read confirms dashDeck._openResearch() is real but genuinely
    # unreferenced (rpgace_core.js's own comment: "kept defined but
    # unreferenced... in case a future pass wants it back") — the Aug 23
    # 2026 UI Consistency batch retired the card outright, per CLAUDE.md's
    # own "Research Lab" entries. Removed here rather than left as stale
    # DASHBOARD_CARDS data (rule 16 cross-doc drift) — River XII's (was
    # XVII, renumbered G103 Aug 26) real modules did NOT lose their
    # dashboard-reachable status, they moved under Bookworm's own card
    # instead (see its real 'rivers' update below, evidenced by the real
    # file-analyzer-panel/video-finder-panel jump buttons Bookworm's
    # popup now carries — both are researchTabs/intelBatchList content,
    # River XII). Content Pipeline's own "Upload Workshop" jump button
    # was checked too and found NOT to map to any real River-XII-tracked
    # module (video-workshop-panel is static markup with no owning
    # module inject — confirmed by direct grep), so 'pipeline' below is
    # correctly left unchanged.
    {'key': 'bookworm', 'label': '📖 Bookworm', 'rivers': [4, 12],  # G103 (Aug 26): 17->12, see RIVER_COLOR's header note
     'via': "dashDeck._openBookworm() -> bookworm module, + real jump buttons into researchTabs/intelBatchList (Videoworm/Video Finder, River XII)"},
    {'key': 'taxonomy', 'label': '🌳 Taxonomy & Review', 'rivers': [8, 6],
     'via': "taxonomyReviewQueue._openCard() when items pending, else phylumPath page browse",
     'partial': False},
    {'key': 'oracle', 'label': '⚡ Oracle', 'rivers': [3],
     'via': "showPage(pages.oracle) -> oracleAppGrounding/oracleTreeGrounding etc"},
    {'key': 'agenda', 'label': '📋 Agenda', 'rivers': [5],
     'via': "showPage(pages.agenda) -> agendaReminder (QoL layer only; the page's own Quest Board core lives in main.js, not river-tagged)",
     'partial': True},
    {'key': 'morningBrief', 'label': '🌅 Morning Brief', 'rivers': [5],
     'via': "dashDeck._openMorningBrief() -> morningBrief module"},
    {'key': 'gaps', 'label': '🕳️ Knowledge Gaps', 'rivers': [9],
     'via': "dashDeck._openGaps() -> knowledgeGap module"},
    {'key': 'pipeline', 'label': '🎬 Content Pipeline', 'rivers': [11],
     'via': "dashDeck._openPipeline() -> contentProductionLive module"},
    {'key': 'encyclopedia', 'label': '📖 Encyclopedia', 'rivers': [7],
     'via': "showPage(pages.encyclopedia) -> jargonEncyclopedia module"},
    {'key': 'journal', 'label': '📓 Journal', 'rivers': [5],
     'via': "showPage(pages.journal) -> journalQoL module"},
    {'key': 'oversight', 'label': '📚 Oversight', 'rivers': [15],  # G103 (Aug 26): 14->15
     'via': "dashDeck._openOversight() -> Zone/River XV, the shared oversight-doc truth layer"},
    {'key': 'chronicles', 'label': '📜 The Chronicles', 'rivers': [10],
     'via': "chroniclesLog._openCard() -> chroniclesLog module"},
]
CARDS_BY_RIVER = {}
for _c in DASHBOARD_CARDS:
    for _r in _c['rivers']:
        CARDS_BY_RIVER.setdefault(_r, []).append(_c)

# Real, sourced river attribution per EXTERNAL_CONNECTORS entry — Aug 13,
# real Alex ask for G0 (Level 0 galaxies/connectors) to show up on
# Level 2 too, "to show how externals contribute to rivers." Every
# `rivers` value below is extracted directly from that connector's OWN
# `note` text above (re-read, not guessed) — same "doc first, mirror
# second" discipline as DASHBOARD_CARDS. Two real, honest omissions,
# not oversights: 'OpenArt' has no river citation because its own note
# says "not wired to anything yet" — nothing to link; 'n8n' has no
# river citation because its own note names a FEATURE (F10 rota-sync)
# but never a river number — inferring "Schedule = River V" from that
# alone would be a new claim this table doesn't have real evidence for,
# so it stays out rather than guessed in. Supabase is deliberately
# excluded too — SUPABASE_CORE's own note says "used by nearly every
# real river," which is real but not per-river-DISTINGUISHING
# information; forcing it onto all 16 rings would be noise, not signal,
# and it's already well-represented at Level 0.
EXTERNAL_RIVER_LINKS = [
    {'name': 'Anthropic (Claude API)', 'rivers': [3],
     'via': "River III's Oracle Current is the harness — the real default provider for every ungrounded Oracle call"},
    {'name': 'OpenMontage', 'rivers': [11],
     'via': 'Real spring AND mouth both sit in River XI: opens at "Generate Video," closes at "Mark ConID as Filmed"'},
    {'name': 'Composio', 'rivers': [5, 11],
     'via': "River V's morningBrief (Gmail fetch) and River XI's contentRepurpose (Notion + YouTube via Supadata)"},
    {'name': 'Moonshot AI (Kimi)', 'rivers': [3],
     'via': "Would be called from River III's Oracle Current in place of the default Anthropic call, once live"},
    {'name': 'OpenAI (Luna)', 'rivers': [3],
     'via': 'Same River III relationship as Kimi, once live'},
    {'name': 'librosa', 'rivers': [11],
     'via': "Triggered by River XI's Beat Log, nowhere else"},
    {'name': 'FFmpeg', 'rivers': [11],
     'via': "Reached only via River XI's OpenMontage handoff, never called directly by any RPGACE river"},
    {'name': 'Graphify CC', 'rivers': [9, 15],  # G103 (Aug 26): 14->15
     'via': "Dispatched from River IX's own session-start check, deposits real findings into River XV via graphify_jobs"},
    {'name': 'Jina AI', 'rivers': [3, 4],
     'via': 'Load-bearing for Bookworm URL ingestion (River IV), Schedule Oracle + chat-pasted-URL handling (River III)'},
    {'name': 'Last.fm', 'rivers': [7],
     'via': "refCorpus.findMatches()'s real fallback (River VII), grows the corpus from its own results"},
    {'name': 'Whisper (OpenAI, local)', 'rivers': [12],  # G49 (Aug 18): moved 5->17; G103 (Aug 26): 17->12, see RIVER_COLOR's header note
     'via': 'The Content Intelligence pipeline (River XII) — current live status genuinely unconfirmed'},
]
LINKS_BY_RIVER = {}
for _l in EXTERNAL_RIVER_LINKS:
    for _r in _l['rivers']:
        LINKS_BY_RIVER.setdefault(_r, []).append(_l)

# ── SUPABASE_L0_UNIT_TOUCHES (Aug 25 2026) — the real, curated registry
# of which Supabase table each NON-CODE L0 unit actually touches.
#
# Why this exists at all — a real, structural detection gap, not a
# convenience table: compute_all_supabase_table_touches() below is a
# per-function regex scan of rpgace_core.js, so it can only ever see
# CLIENT-SIDE touches made by RPGACE Architecture's own code. It is
# structurally blind to the fact that a non-code actor — Orchestrator
# CC (this session), OpenMontage CC (a separate Claude Code session in
# calesthio/OpenMontage), Alex, a Skill, an External AI provider —
# genuinely reads or writes a table too. Those touches are real and
# already documented in prose; they were simply never machine-readable.
#
# Discipline, deliberately the SAME as EXTERNAL_RIVER_LINKS' own `via`
# strings directly above: every entry cites the real CLAUDE.md section
# its fact came from. This data is NOT build-time anchor-verified
# against live code the way an rpgace_core.js citation is, so a reader
# is always told where the claim came from and can re-check it. Never
# invent an entry — if CLAUDE.md doesn't say it, it doesn't go here.
#
# Scope, updated Aug 25 2026 (G82) — the original G80 pass shipped this
# as a real 2-UNIT proof of concept (orchestrator_cc + openmontage_cc)
# and stated plainly that "the other 7 L0 units join by adding registry
# entries, with zero change to the consuming code." That extension is
# this pass. It is NOT a uniform sweep, because the 7 units genuinely
# do not all have the same KIND of evidence behind them — forcing one
# mechanism onto all of them would have manufactured symmetry that the
# real evidence does not support. The real split, per unit:
#
#   rpgace_architecture  → MECHANICAL. It is the client-side code the
#                          existing detector already scans, so curating
#                          it by hand would be a second, drifting copy
#                          of machine-readable truth (rule 8). Built as
#                          compute_rpgace_architecture_supabase_infra().
#   oversight_docs       → MECHANICAL, via a real NEW detector
#                          (compute_oversight_doc_supabase_reads) — the
#                          oversight HTML docs make their own live
#                          fetch('/rest/v1/...') calls, which the
#                          rpgace_core.js scanner is structurally blind
#                          to because those calls are in different files.
#   graphify_cc          → CURATED (below) — a real Total-system session,
#   skills / alex           a real Claude Code skill, and a real human.
#                          None of the three is code this repo can scan.
#   external_ai          → HONESTLY EMPTY. Neither has a real, citable
#   supabase                direct Supabase touch of its own; see the
#                          "deliberately absent" note under this dict.
#
# `indirect` (optional): present ONLY where the unit is the real CAUSAL
# TRIGGER of a write rather than its literal executor — a skill's write
# happens through whichever Claude Code session runs that skill; Alex's
# write happens through a UI click that runs someone else's JS. The
# value is the real executor, named. Rendered as a visibly weaker
# evidence tier by compute_l0_unit_supabase_infra() — never presented
# level with a direct, self-executed touch.
#
# Keys are L0 unit ids as used by galaxy_map.py's UNIT_ORDER/UNIT_META.
# role: 'read' | 'write' | 'read_write' | 'async_queue'
SUPABASE_L0_UNIT_TOUCHES = {
    'orchestrator_cc': [
        {'table': 'openmontage_jobs', 'role': 'async_queue',
         'source_note': "CLAUDE.md, \"External handoff lanes\" — \"`openmontage_jobs` — async queue between RPGACE, this session, and a separate OpenMontage Claude Code session in a different repo\"; and the \"Total\" section's own \"Channel: `openmontage_jobs`, queued rows for real jobs, standalone rows ... for cross-cutting state/decisions that aren't a single video job.\"",
         'detail': "Writes real dispatch rows and reads status back. Orchestrator CC is named the orchestrator/planner whose job includes \"dispatch-writing\" — the 8 real rows catalogued on the G29 page are this unit's own dispatch history (4 of them written by `rpgace_claude_code`, the real `requested_by` value)."},
        {'table': 'total_system_members', 'role': 'read_write',
         'source_note': "CLAUDE.md, Aug 6 \"Graphify CC is now real\" entry — \"`total_system_members` (a real role/repo/channel registry — 4 active members)\"; plus the Aug 14 `/Routine` entry's own G29 record — \"real drive-by fix, `total_system_members` still said 'RPGACE CC,' never updated to match the Aug 13 rename.\"",
         'detail': "Reads the registry for real Total-system role/channel facts, and has genuinely written to it: the Aug 14 \"RPGACE CC\" → \"Orchestrator CC\" rename was a real Orchestrator CC UPDATE against this exact table, not a doc-only edit."},
        # Added Aug 25 2026 (G82). Real, deliberate addition BEYOND the
        # graphify_cc task that prompted it, and worth stating why: this
        # queue is the ONLY real channel between Orchestrator CC and
        # Graphify CC, so leaving it off Orchestrator CC's own side would
        # have made the new graphify_cc Inter facet actively misleading
        # (it would claim the two units share only total_system_members,
        # a registry neither of them demonstrably writes). Cited, not
        # inferred — CLAUDE.md has a whole standing section on it.
        {'table': 'graphify_jobs', 'role': 'read',
         'source_note': "CLAUDE.md, \"Session-start check — graphify_jobs (Alex-confirmed Aug 6)\" — \"At the start of any session working on RPGACE, query `graphify_jobs` ... for undrained rows ... A row explicitly asking to be logged carries `-- FOR RPGACE CC: please log to Chronicles/system_updates` in its `output_note`.\"",
         'detail': "Drains Graphify CC's real session output at session start — the standing passive-pull check. Stated honestly: this is a READ relationship. CLAUDE.md documents Graphify CC as the writer here and Orchestrator CC as the reader that acts on what it finds; no Orchestrator CC write to this table is claimed, because none is evidenced."},
    ],
    'openmontage_cc': [
        {'table': 'openmontage_jobs', 'role': 'async_queue',
         'source_note': "CLAUDE.md, Known landmines — \"`openmontage_jobs` (July 31) must NEVER be added to a future Approach B RLS-restriction batch without giving the separate OpenMontage Claude Code session another way to write to it ... that external session writes back with the plain anon key.\"",
         'detail': "Reads queued rows and writes real results back using the plain anon key (no service-role key, no RPGACE_API_SECRET — both private to this codebase). The real July 31 round trip is the evidence: it picked up the Calibri job and wrote back `status='failed'` with an honest `output_note` rather than faking a render."},
        {'table': 'total_system_members', 'role': 'read',
         'source_note': "CLAUDE.md, Aug 6 \"Graphify CC is now real\" entry — the registry's own \"4 active members: RPGACE app, RPGACE CC, Engineer CC/OpenMontage, Graphify CC.\"",
         'detail': "OpenMontage CC's own identity is a ROW IN this registry. Stated honestly: that is evidence it is read ABOUT, not evidence it writes here itself — every documented write to this table is Orchestrator CC's (the Aug 14 rename). No self-write is claimed, because none is evidenced."},
    ],
    'graphify_cc': [
        {'table': 'graphify_jobs', 'role': 'async_queue',
         'source_note': "CLAUDE.md, Aug 6 \"Graphify CC is now real\" entry — \"`graphify_jobs` (Graphify CC's own dedicated dispatch channel, deliberately separate from `openmontage_jobs`)\"; plus its own \"New standing convention, Alex-confirmed\": \"Graphify CC does not write to `system_updates`/Chronicles directly (no visibility into RPGACE's own category taxonomy) — every real piece of its output lands as a standalone `graphify_jobs` row, `output_note` explicitly flagged `-- FOR RPGACE CC: please log to Chronicles/system_updates` when it's a real read-and-log request.\"",
         'detail': "Graphify CC's own dedicated dispatch channel — deliberately its OWN table, not shared with OpenMontage CC's. This is the one table it demonstrably WRITES: the standing convention exists precisely because it is barred from writing to `system_updates` directly, so every real output it produces lands here instead, for Orchestrator CC to drain at session start."},
        {'table': 'total_system_members', 'role': 'read',
         'source_note': "CLAUDE.md, Aug 6 \"Graphify CC is now real\" entry — \"`total_system_members` (a real role/repo/channel registry — 4 active members: RPGACE app, RPGACE CC, Engineer CC/OpenMontage, Graphify CC).\"",
         'detail': "Graphify CC is one of the 4 listed members — i.e. a ROW IN this registry. Same honesty as OpenMontage CC's entry above, and for the same reason: being listed is evidence it is read ABOUT, not evidence it writes here itself. Every documented write to this table is Orchestrator CC's. No self-write is claimed."},
    ],
    'skills': [
        {'table': 'system_map_flags', 'role': 'write',
         'indirect': 'whichever Claude Code session actually runs /cartographer (Orchestrator CC today)',
         'source_note': "CLAUDE.md, \"Session-start check — system_map_flags (Alex-confirmed Aug 13)\" — \"query `system_map_flags` ... for `status='flagged'` rows — real trickle-down/up integration-friction findings from `.claude/skills/cartographer/SKILL.md`'s own cross-reference.\"",
         'detail': "/cartographer's real output destination. A flagged row exists because that skill's own procedure produced a real integration-friction finding — the skill is why the row exists, which is exactly what makes this a Skills-unit fact rather than a session fact."},
        {'table': 'perspective_reports', 'role': 'write',
         'indirect': 'whichever Claude Code session actually runs /perspective',
         'source_note': "`.claude/skills/perspective/SKILL.md`, Step 4 — \"Persist to `perspective_reports`. One row per report\"; cross-checked against CLAUDE.md's Aug 14 G11 entry, \"`perspective_reports`: 65 rows total (4 galaxy + 17 node + 44 module).\"",
         'detail': "/perspective's own persistence step. The `expected_behavior` baseline it writes is then read back by two other real consumers — `error_log`'s `linked_perspective_id` and /colourgradient's purple-regression check — so this one write is deliberately the single place \"what correct looks like\" is asserted (rule 8)."},
        {'table': 'taxonomy_proposals', 'role': 'write',
         'indirect': 'whichever Claude Code session actually runs /Regeneration — and never without Alex\'s own review-queue confirm downstream',
         'source_note': "`.claude/skills/Regeneration/SKILL.md` — \"**Not a writer.** Regeneration never writes to `taxonomy_tree`. Its output is a report plus, optionally, `taxonomy_proposals` rows — which land in the existing review queue Alex already uses\"; and step 6, \"**Propose, never apply.** INSERT-shaped recommendations may go into `taxonomy_proposals`.\"",
         'detail': "/Regeneration's only sanctioned write, and deliberately a STAGING one: a proposal row is not a tree change, it is a queued suggestion that still needs Alex's own accept click. The skill file names this boundary in its own landmine section rather than leaving it implied."},
        {'table': 'taxonomy_tree', 'role': 'read',
         'indirect': 'whichever Claude Code session actually runs /Regeneration',
         'source_note': "`.claude/skills/Regeneration/SKILL.md`, Tier 0 — \"Deterministic structural audit. Zero model calls, zero cost, 100% repeatable. Pure SQL against `taxonomy_tree`\"; plus its own landmine, \"**Never write to `taxonomy_tree` from this skill.** Not even a 'trivially safe' one-row fix.\"",
         'detail': "A real READ, explicitly never a write — the skill's Tier 0 audit is pure SQL over the live tree, and its own landmine section forbids writing back even when its analysis is confident. Included precisely because a read-only relationship is a real relationship, and omitting it would leave the tree looking untouched by any skill."},
        {'table': 'ceo_plan_items', 'role': 'read',
         'indirect': 'whichever Claude Code session actually runs /colourgradient',
         'source_note': "CLAUDE.md, `future_integrations.html`'s own entry — \"Backed by the real `ceo_plan_items.status` column (shared source of truth with `/colourgradient` itself — never derived twice, rule 8)\"; and the `/colourgradient` skill's own description, \"now backed by the `/CEO` datasheet above rather than re-deriving from scratch each run.\"",
         'detail': "/colourgradient reads the real stored status rather than recomputing a colour per run — the deliberate rule-8 choice that keeps the skill and `future_integrations.html` from ever disagreeing. A read, not a write: the status column itself is written by /CEO Loop 2 and by Alex's own smoke-test confirm, not by the colour renderer."},
    ],
    'alex': [
        {'table': 'smoke_test_items', 'role': 'write',
         'indirect': "smoke_test.html's own inline confirm-click handler",
         'source_note': "CLAUDE.md, layer (d) — \"a `smoke_test_items` row can carry `needs_confirm_highlight=true` ... once a fix lands and awaits Alex's hand-test, clearing automatically (and resolving the linked error) the moment he confirms it\"; and `smoke_test.html`'s own real handler, which PATCHes `{status:'confirmed_working', verified_at, broken_note:null, needs_confirm_highlight:false}`.",
         'detail': "Alex's own hand-tick is a literal database write — the one row-state change in Total Systems that no AI is allowed to make on his behalf (\"ticked by Alex's own hand ... never auto-ticked\"). Named here at TABLE grain deliberately: his existing Infra tab already lists the 21 decisions he can make, but never said which tables those decisions actually move."},
        {'table': 'error_log', 'role': 'write',
         'indirect': "smoke_test.html's own inline confirm-click handler (a PATCH to `status='resolved'`)",
         'source_note': "CLAUDE.md, `error_log.html`'s own entry — \"the mechanical parts (dedup-on-insert, the smoke_test.html 'Just Failed' mirror, clearing `needs_confirm_highlight` + auto-resolving the linked error on Alex's real confirm click) are real and live\"; and the session-start check, \"On his real confirm, the `error_log` row moves to `status='resolved'`.\"",
         'detail': "The same single click also resolves the linked error row. Worth stating plainly: an error in RPGACE is never closed by the session that fixed it — it is closed by Alex confirming the fix actually works, which is why this write belongs to him and not to Orchestrator CC."},
        {'table': 'ceo_plan_items', 'role': 'write',
         'indirect': "smoke_test.html's own inline confirm-click handler (a PATCH to `status='green'`)",
         'source_note': "CLAUDE.md, Aug 20 G51 entry — \"`smoke_test_items` gained a `linked_plan_item_id` column; `smoke_test.html`'s existing confirm-click handler extended to PATCH the linked `ceo_plan_items` row to green on confirm ... plus a new `checkUmbrellaAutoFlip()` for G42.\"",
         'detail': "The third table the same click moves — a yellow plan item only ever turns green on Alex's own confirmation, which is what makes /colourgradient's green tier mean \"Alex verified it\" rather than \"a session claimed it.\" The umbrella auto-flip (G42) rides on this same write."},
    ],
}

# Deliberately absent, and stated rather than left as a silent hole:
#   'oracle' — every real Supabase write in an Oracle round trip is
#       made by rpgace_core.js AFTER the provider's answer comes back
#       (`_captureNextResponse` → `creative_docs`, the `style_profiles`
#       save, `oracle_fallback_queue`). The provider itself is called BY
#       RPGACE Architecture and hands text back; it holds no credentials
#       for this project and reaches no table. Its real, evidenced
#       Supabase relationship is therefore rpgace_architecture's, and it
#       is already rendered there — inventing a facet here would double-
#       count one touch as two actors' (rule 8).
#   'supabase' — the Supabase unit IS the tables. A "Supabase touches
#       table X" facet is a tautology, not a relationship, and its real
#       content (every table, who touches it) is already the whole of
#       galaxy_map_supabase.html, which its own unit links to.
# Both are honest zero results, deliberately NOT papered over with a
# synthetic placeholder row.
L0_SUPABASE_NO_TOUCH_UNITS = ('oracle', 'supabase')

# Real, single shared link target for a registry table, resolved against
# the same client-side detector G45's page is built from — so a deep
# link only ever points at a section that genuinely exists there.
_SB_PAGE = 'galaxy_map_supabase.html'

# Real, measured perf guard, same shape as _MAINJS_BRIDGE_CACHE /
# _WRAP_INSTALLER_CACHE below: compute_all_supabase_table_touches()
# re-parses the whole of rpgace_core.js on every call (measured at
# ~6s per call in this repo's current file size, timed directly, not
# assumed). The functions here would otherwise call it once per
# registry entry per unit. Cached for the life of one script run only —
# every generator script re-runs from a fresh process, so this can
# never serve a stale parse across builds.
_L0_SB_TOUCH_CACHE = {}


def _l0_client_side_touches():
    if 'v' not in _L0_SB_TOUCH_CACHE:
        _L0_SB_TOUCH_CACHE['v'] = compute_all_supabase_table_touches()
    return _L0_SB_TOUCH_CACHE['v']


def _l0_table_link(table):
    """Deep-link into G45's own per-table section (`id="tbl-{table}"`) —
    but ONLY when that table genuinely HAS a section on that page, so a
    facet can never point at a dead anchor.

    G82: G45 now renders two real kinds of section — build_table_row()
    for a table some rpgace_core.js module touches, and
    build_oversight_only_row() for one only an oversight doc fetches.
    Both use the same `#tbl-<table>` id, so both are valid targets. A
    table in neither set (e.g. `total_system_members`, `graphify_jobs`,
    `system_map_flags` — real tables no client-side code touches at all)
    still correctly links to the page plainly."""
    if table in _l0_client_side_touches():
        return f'{_SB_PAGE}#tbl-{table}'
    if any(r['table'] == table for r in _oversight_doc_touches()):
        return f'{_SB_PAGE}#tbl-{table}'
    return _SB_PAGE


# ── compute_oversight_doc_supabase_reads (G82, Aug 25 2026) — a real,
# NEW detector, and a genuinely different one from the rpgace_core.js
# scanner above.
#
# The real gap it closes: several oversight docs are not static prose at
# all — they render themselves live, each making its own
# `fetch(SB_URL + '/rest/v1/<table>...')` call from its own inline
# script. compute_all_supabase_table_touches() cannot see any of that,
# for a structural reason rather than a tuning one: it scans exactly one
# file (rpgace_core.js) for exactly one idiom (RPGACE.sb.*). A separate
# HTML file calling `fetch` directly matches neither.
#
# Scope decided by evidence, not by an assumed list: every root-level
# `.html` is scanned EXCEPT index.html (that is the app shell itself —
# its Supabase behaviour is rpgace_architecture's, already covered by
# the rpgace_core.js scanner, and counting it here would double-count
# one actor as two). So a future oversight doc that starts fetching a
# table is picked up automatically, with no list to remember to edit.
#
# Only `<script>` content is scanned. That matters for a real reason,
# not tidiness: patch_notes.html contains the literal text
# "/rest/v1/..." inside a prose <code> block describing a historical
# migration bug. It is documentation ABOUT a fetch, not a fetch — a
# whole-file grep reports it as a real touch, and would be wrong.
_OVERSIGHT_SB_FETCH = re.compile(
    r"fetch\(\s*[A-Za-z_$][\w$]*\s*\+\s*'/rest/v1/([a-z_]+)")
_SCRIPT_BLOCK = re.compile(r'<script\b[^>]*>([\s\S]*?)</script>', re.I)
_FETCH_METHOD = re.compile(r"method:\s*'(\w+)'")
_OVERSIGHT_HTML_DIR = Path('.')
_OVERSIGHT_HTML_SKIP = {'index.html'}


def _fetch_http_method(text, pos):
    """Real HTTP method of the fetch(...) call whose '/rest/v1/<table>'
    match ENDS at `pos` — read out of that call's own options object,
    never a fixed-width text window (which could pick up a LATER fetch's
    method and silently mislabel a read as a write).

    Rule, stated because it is an assumption about real code shape and
    not a general JS parse: the options object is the first `{` after
    the URL expression. Verified true for all real call sites in this
    repo's oversight docs — a `/rest/v1/` URL is built purely from
    string literals and `+` concatenation, so no `{` can appear inside
    it. If no `{` is found before the next `fetch(` (or within a
    generous 400 chars), the call has no options object at all, which
    means GET."""
    window = text[pos:pos + 400]
    brace = window.find('{')
    nxt = window.find('fetch(')
    if brace < 0 or (0 <= nxt < brace):
        return 'GET'
    # Balanced-brace extract of the real options object.
    i = pos + brace
    depth = 0
    for j in range(i, min(len(text), i + 2000)):
        if text[j] == '{':
            depth += 1
        elif text[j] == '}':
            depth -= 1
            if depth == 0:
                m = _FETCH_METHOD.search(text[i:j + 1])
                return (m.group(1) if m else 'GET').upper()
    return 'GET'


def compute_oversight_doc_supabase_reads(root: Path = _OVERSIGHT_HTML_DIR):
    """Real, per-{file, table} list of live Supabase calls made by the
    oversight HTML docs themselves.

    Returns a list of {'file', 'table', 'methods': [...], 'n': int},
    sorted by (file, table) so a fresh process re-run always produces
    byte-identical output (R5)."""
    found = {}
    for path in sorted(root.glob('*.html')):
        if path.name in _OVERSIGHT_HTML_SKIP:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except OSError:
            continue
        for block in _SCRIPT_BLOCK.finditer(text):
            body = block.group(1)
            for m in _OVERSIGHT_SB_FETCH.finditer(body):
                key = (path.name, m.group(1))
                rec = found.setdefault(key, {'methods': set(), 'n': 0})
                rec['methods'].add(_fetch_http_method(body, m.end()))
                rec['n'] += 1
    return [
        {'file': f, 'table': t, 'methods': sorted(v['methods']), 'n': v['n']}
        for (f, t), v in sorted(found.items())
    ]


_OVERSIGHT_DOC_CACHE = {}


def _oversight_doc_touches():
    if 'v' not in _OVERSIGHT_DOC_CACHE:
        _OVERSIGHT_DOC_CACHE['v'] = compute_oversight_doc_supabase_reads()
    return _OVERSIGHT_DOC_CACHE['v']


def _role_from_ops(ops):
    """Real read/write/read_write role from a set of real operation
    names — shared by both mechanical detectors so the two can never
    classify the same evidence differently (rule 8). Understands both
    the rpgace_core.js op vocabulary (select/insert/update/del/
    secureWrite) and HTTP methods (GET/POST/PATCH/DELETE)."""
    reads = {'select', 'GET'}
    ops = set(ops)
    if not ops:
        return 'read'
    if ops <= reads:
        return 'read'
    if not (ops & reads):
        return 'write'
    return 'read_write'


_L0_ROLE_LABEL = {
    'read': 'reads',
    'write': 'writes',
    'read_write': 'reads + writes',
    'async_queue': 'async queue (reads + writes)',
}


def _l0_unit_table_map(unit_id):
    """{table: entry} for ONE L0 unit, from whichever real evidence
    source that unit's touches genuinely come from — the curated
    registry, the rpgace_core.js scanner, or the oversight-doc scanner.

    This exists so the shared-table INTERSECTION logic below has exactly
    one place to ask "which tables does unit X touch," regardless of how
    that was established (rule 8). Without it, adding the two
    mechanically-detected units would have meant a second copy of the
    intersection loop — one for curated units, one for detected ones —
    which is precisely the drift-between-two-copies failure rule 8
    exists to prevent."""
    if unit_id == 'rpgace_architecture':
        out = {}
        for tbl, touches in _l0_client_side_touches().items():
            ops = {op for _m, _f, op in touches}
            out[tbl] = {'table': tbl, 'role': _role_from_ops(ops), 'mechanical': True}
        return out
    if unit_id == 'oversight_docs':
        out = {}
        for rec in _oversight_doc_touches():
            prev = out.get(rec['table'])
            methods = set(rec['methods']) | set(prev.get('methods', ()) if prev else ())
            out[rec['table']] = {'table': rec['table'], 'role': _role_from_ops(methods),
                                 'methods': sorted(methods), 'mechanical': True}
        return out
    return {e['table']: e for e in SUPABASE_L0_UNIT_TOUCHES.get(unit_id, ())}


# Every L0 unit with a real, evidenced Supabase relationship of any
# kind. Sorted at use-site, never iterated as a set — R5.
L0_SUPABASE_UNITS = sorted(
    set(SUPABASE_L0_UNIT_TOUCHES) | {'rpgace_architecture', 'oversight_docs'})


def compute_rpgace_architecture_supabase_infra():
    """Real Infra facets for the rpgace_architecture L0 unit — one per
    real table its own client-side code genuinely touches.

    Deliberately MECHANICAL, not curated: this unit IS the code the
    existing detector already scans, so every fact here is re-derived
    from live rpgace_core.js on every build. Hand-curating it would have
    produced a second copy of machine-readable truth, free to drift the
    moment a module gains or loses a table (rule 8) — the exact failure
    mode `vercel.json`, `graphify_river_group.py`'s own old `main.js`
    path, and `.claude/settings.json` each demonstrated once already.

    Evidence tier is stated per facet and is genuinely STRONGER than the
    curated registry's: these counts come from parsing the real file
    this build runs against, not from a doc quoting a past session."""
    out = []
    for tbl, touches in sorted(_l0_client_side_touches().items()):
        ops = sorted({op for _m, _f, op in touches})
        mods = sorted({m for m, _f, _op in touches})
        role = _role_from_ops(ops)
        mod_note = ', '.join(f'<code>{m}</code>' for m in mods[:6])
        if len(mods) > 6:
            mod_note += f' +{len(mods) - 6} more'
        out.append({
            'kind': 'infra', 'dim': 'Supabase (client-side code)',
            'label': f"🗄️ {tbl} — {_L0_ROLE_LABEL.get(role, role)}",
            'detail': (
                f"{len(touches)} real function touch(es) across {len(mods)} real module(s): {mod_note}. "
                f"Real operations: {', '.join('<code>' + o + '</code>' for o in ops)}."
                f"<span class=\"ev\">Code-derived, re-parsed from live <code>rpgace_core.js</code> on every "
                f"build by <code>compute_all_supabase_table_touches()</code> — a stronger evidence tier than "
                f"the curated Total-system-actor rows on other units, which quote a doc rather than the file. "
                f"Honest scope limit, same as G45's own page: server-side <code>api/*.js</code> touches are "
                f"not reachable by this client-side detector.</span>"),
            'share_key': f"sb-{tbl}", 'link': _l0_table_link(tbl),
        })
    return out


def compute_oversight_docs_supabase_infra():
    """Real Infra facets for the oversight_docs L0 unit — one per real
    {oversight HTML file, table} pair that file genuinely fetches live.

    Also mechanical, via compute_oversight_doc_supabase_reads(). One
    facet PER PAIR rather than per table, deliberately: "smoke_test.html
    writes ceo_plan_items" and "future_integrations.html reads
    ceo_plan_items" are two genuinely different relationships, and
    collapsing them to one `ceo_plan_items` row would hide which doc is
    the writer — which is the whole reason this unit's own facets are
    worth having."""
    out = []
    client_side = _l0_client_side_touches()
    for rec in _oversight_doc_touches():
        tbl, doc = rec['table'], rec['file']
        role = _role_from_ops(rec['methods'])
        n_client = len(client_side.get(tbl, ()))
        client_note = (
            f" RPGACE Architecture also touches this table client-side "
            f"({n_client} real rpgace_core.js function touch(es), G45) — so this doc and the app "
            f"share it."
            if n_client else
            " No rpgace_core.js touch exists for this table at all — this oversight doc is the only "
            "real client-side reader/writer of it, which is exactly why the rpgace_core.js scanner "
            "alone left this unit looking empty.")
        out.append({
            'kind': 'infra', 'dim': 'Supabase (oversight docs, live-rendered)',
            'label': f"🗄️ {tbl} — {_L0_ROLE_LABEL.get(role, role)} · {doc}",
            'detail': (
                f"<code>{doc}</code> makes {rec['n']} real live call(s) to this table from its own inline "
                f"script (HTTP {', '.join(rec['methods'])}). This is what makes the doc render itself from "
                f"real data rather than asserting a hand-typed claim — the structural half of rule 16."
                f"{client_note}"
                f"<span class=\"ev\">Code-derived, re-scanned on every build by "
                f"<code>compute_oversight_doc_supabase_reads()</code> — a real <code>fetch(... "
                f"'/rest/v1/&lt;table&gt;')</code> match inside that file's own <code>&lt;script&gt;</code> "
                f"blocks, with the HTTP method read from the call's own options object. Prose mentioning a "
                f"table is deliberately not counted.</span>"),
            'share_key': f"sb-{tbl}", 'link': _l0_table_link(tbl),
        })
    return out


def compute_l0_unit_supabase_infra(unit_id):
    """Real Infra facets for one L0 unit, straight from
    SUPABASE_L0_UNIT_TOUCHES — one facet per real table that unit
    genuinely touches.

    Returns galaxy_map.py's own standard facet shape
    ({kind, dim, label, detail, share_key, link}) so build_facets() can
    append them with zero adaptation. `share_key` is `sb-<table>`, so
    two units touching the SAME table cross-highlight each other
    through the existing share_key mechanism — no new JS.

    Honest evidence tier, stated in every facet's own detail text: this
    is CURATED-FROM-DOCS data with a cited source, not the build-time
    anchor-verified code evidence the rpgace_core.js-derived facets
    carry. Never silently presented as the same tier.

    A THIRD, still weaker tier exists for entries carrying `indirect`
    (G82): the unit is the real causal TRIGGER of the touch, not its
    literal executor — a Skill's write happens through whichever Claude
    Code session runs it; Alex's write happens through a UI click that
    runs someone else's JS. Those rows are labelled and worded to say so
    outright, so a reader never reads "Alex writes error_log" as Alex
    holding a database connection."""
    out = []
    client_side = _l0_client_side_touches()
    for entry in SUPABASE_L0_UNIT_TOUCHES.get(unit_id, ()):
        tbl = entry['table']
        n_client = len(client_side.get(tbl, ()))
        client_note = (
            f"RPGACE Architecture also touches this table client-side "
            f"({n_client} real rpgace_core.js function touch(es), G45)."
            if n_client else
            "No client-side rpgace_core.js touch exists for this table — "
            "it is reached only by non-code Total-system actors, which is "
            "exactly the gap this registry closes.")
        indirect = entry.get('indirect')
        tier_note = (
            f"Curated fact, sourced not code-derived — {entry['source_note']}"
            if not indirect else
            f"<b>Indirect (causal trigger), the weakest of the three evidence tiers on this page.</b> "
            f"{UNIT_LABEL_FOR_INDIRECT.get(unit_id, unit_id)} does not execute this write itself — it is "
            f"carried out by {indirect}. The relationship is real and the trigger is real; the executor is "
            f"someone else, and this row says so rather than flattening the two together. "
            f"Curated fact, sourced not code-derived — {entry['source_note']}")
        out.append({
            'kind': 'infra', 'dim': 'Supabase (Total-system actors)',
            'label': (f"🗄️ {tbl} — {_L0_ROLE_LABEL.get(entry['role'], entry['role'])}"
                      + (' · indirect' if indirect else '')),
            'detail': (
                f"{entry['detail']} {client_note}"
                f"<span class=\"ev\">{tier_note}</span>"),
            'share_key': f"sb-{tbl}", 'link': _l0_table_link(tbl),
        })
    return out


# Human-readable L0 unit labels, so no facet text ever shows a raw
# snake_case unit id to a reader. Mirrors galaxy_map.py's own UNIT_META
# labels; kept here (rather than imported) because that module imports
# THIS one — a reverse import would be circular. Small, stable, and
# checked against UNIT_META by galaxy_map.py's own build (see the
# assertion there), so the mirror cannot silently drift.
L0_UNIT_LABEL = {
    'rpgace_architecture': 'RPGACE Architecture',
    'orchestrator_cc': 'Orchestrator CC',
    'openmontage_cc': 'OpenMontage CC',
    'graphify_cc': 'Graphify CC',
    'oracle': 'Oracle',
    'composio': 'Composio',
    'jina': 'Jina AI',
    'lastfm': 'Last.fm',
    'librosa': 'librosa',
    'n8n': 'n8n',
    'whisper': 'Whisper (OpenAI, local)',
    'skills': 'Skills',
    'alex': 'Alex',
    'supabase': 'Supabase',
    'oversight_docs': 'Oversight Docs',
}

# Plain-language SUBJECT for an indirect row's own sentence — differs
# from L0_UNIT_LABEL only where the grammatical subject reads wrong
# ("Skills does not execute this write itself" → "A Skill ...").
UNIT_LABEL_FOR_INDIRECT = dict(L0_UNIT_LABEL, skills='A Skill')


def compute_l0_unit_supabase_inter(unit_id):
    """Real Inter facets for one L0 unit — every OTHER L0 unit with a
    real Supabase relationship that genuinely shares at least one table
    with it, and which tables those are.

    This is the real "how does this unit interact with another unit
    through shared infrastructure" half. Deterministic by construction
    (both the unit loop and the shared-table list are sorted), so a
    fresh process re-run always produces byte-identical output — R5.

    G82: both sides now come from _l0_unit_table_map(), so a curated
    unit and a mechanically-detected one intersect through the SAME
    code path — the intersection logic exists exactly once, whatever
    kind of evidence either side happens to be backed by (rule 8)."""
    mine = _l0_unit_table_map(unit_id)
    if not mine:
        return []
    out = []
    for other in L0_SUPABASE_UNITS:
        if other == unit_id:
            continue
        theirs = _l0_unit_table_map(other)
        shared = sorted(set(mine) & set(theirs))
        if not shared:
            continue
        lines = ''.join(
            f"<div><code>{t}</code> — {_L0_ROLE_LABEL.get(mine[t]['role'], mine[t]['role'])} here, "
            f"{_L0_ROLE_LABEL.get(theirs[t]['role'], theirs[t]['role'])} there.</div>"
            for t in shared)
        # Honest, pair-specific framing (G82). The original wording —
        # "the only channel between these two units" — was true of the
        # 2-unit PoC it was written for (two Claude Code sessions that
        # genuinely cannot reach each other any other way) and would be
        # simply false if reused for, say, rpgace_architecture and
        # oversight_docs, which share a table without a shared table
        # being their only relationship.
        both_sessions = {unit_id, other} <= {'orchestrator_cc', 'openmontage_cc', 'graphify_cc'}
        framing = (
            "Real shared Supabase infrastructure — the only channel between these two units "
            "(no live session-to-session link exists anywhere in Total Systems)."
            if both_sessions else
            "Real shared Supabase infrastructure — one genuine, checkable overlap between these two "
            "units. Not necessarily their only relationship: unlike two Claude Code sessions, these "
            "two can also meet through the other dimensions on this page.")
        tiers = sorted({('code-derived' if t in ('rpgace_architecture', 'oversight_docs')
                         else 'curated-from-docs') for t in (unit_id, other)})
        out.append({
            'kind': 'inter', 'dim': 'Supabase (shared tables)',
            'label': f"↔ shares {len(shared)} real table(s) with {L0_UNIT_LABEL.get(other, other)}",
            'detail': (
                f"{framing}{lines}"
                f"<span class=\"ev\">Evidence tier(s) behind this overlap: {' + '.join(tiers)} — each "
                f"table's own source is cited on the respective unit's Infra tab.</span>"),
            # Shared with the FIRST shared table's own infra facet, so
            # clicking here glows both units' matching table rows.
            'share_key': f"sb-{shared[0]}",
            'link': 'galaxy_map_orchestrator_openmontage.html'
                    if {unit_id, other} == {'orchestrator_cc', 'openmontage_cc'} else _SB_PAGE,
        })
    return out


# Real, sourced skill catalog — Aug 13, real Alex ask: "adding skills
# as a bubble category at all levels would show what skills play into
# which actions and relationships," followed by his own real framing:
# "skills are like streams that join the river flow, along with other
# modules, rivers etc." Full real list mirrored from
# ai_tooling_and_rules_map.md's own canonical catalog (never re-
# derived — that doc is the source; this is a presentation mirror,
# same discipline as EXTERNAL_CONNECTORS/DASHBOARD_CARDS). River XIII
# (Skills) is these skills' own real home river — ALL of them are real
# "streams" feeding it, no citation needed beyond "this is what River
# XIII structurally contains." A handful ALSO get a real, SECOND
# tributary into one other specific river — but only where that
# skill's own already-written description explicitly names that
# river/table/doc (same discipline as EXTERNAL_RIVER_LINKS — never
# guessed in). The rest are real, genuinely cross-cutting Claude-Code
# dev-process protocols (they govern HOW this session builds RPGACE,
# not a specific river of the running app) and stay honestly scoped to
# River XIII alone, not force-mapped elsewhere.
ALL_SKILLS = [
    'Engineer', 'Regeneration', 'restructure', 'free-for-all-debate',
    'loggingregen', 'scope', 'debate', '5thDimension', 'Routine',
    'Summary', 'Bedtime', 'impeccable', 'interrogation', 'paranoia',
    'investor', 'update-logging-system', 'drift', 'CEO', 'colourgradient',
    'decompress', 'misunderstanding', 'cartographer', 'perspective',
    'omnitrix', 'graphify',
]
# G103 (Aug 26 2026): Oversight Docs 14->15, Dev Tooling 16->17 (see
# RIVER_COLOR's own header note for the full rechronologize).
SKILL_SECONDARY_RIVER = {
    'Regeneration': (6, "Sweeps the whole taxonomy tree and the Phylum Path pipeline"),
    'loggingregen': (15, "Regenerates ONE oversight doc at a time against its own stated role"),
    'update-logging-system': (15, "Names SELF_KNOWLEDGE and skill .md files as required-artifact targets"),
    'colourgradient': (15, "Only green routes to the real oversight docs; everything else routes to future_integrations.html"),
    'cartographer': (15, "Baseline Reconciliation cross-references Tier (b) docs, feeding smoke_test.html real suggestions"),
    'impeccable': (17, "Runs a real design-pattern scan against index.html/style.css, the dev-tooling scan layer"),
    'graphify': (17, "The actual scripts (graphify_river_group.py etc.) that generate this graph and the Obsidian vault themselves"),
}

# Real, verbatim-extracted from minotaur_map.html's own `.river-flow-next`
# connectors (Aug 6 restructure pass) — never guessed. Each entry: real
# source river number -> list of (target label, real condition/note).
#
# Rivers 12-16 real flow data added Aug 11 (2nd same-day pass, real Alex
# critique: "river 12-16 have clear stakes to others... still poorly
# done and it is reflected in graphify and obsidian"). Real, checkable —
# the earlier "no flow-connector data, honest scope match" framing this
# comment used to carry was itself the bug: the Aug 11 (2nd) extension
# had already declared rivers XII-XVI real, non-lesser peer rivers, but
# never actually gave them the same flow-connector treatment I-XI get,
# so graph.html's own node-info panel (flows_into/fed_by, built from
# this exact table) rendered empty for all 5 of them — confirmed by
# direct read of build_river_notes() below before this fix. Every new
# entry traces to a real, grepped call site (RPGACE.api() callers'
# owning module resolved against RIVER_MODULES; see
# EXTERNAL_CONNECTORS' own notes for the same facts in prose), not
# invented for symmetry.
#
# Moved here from graphify_to_obsidian.py (Aug 11, rule-8 dedup) so this
# script — already the canonical source for RIVER_NAME/RIVER_COLOR/
# RIVER_MODULES — is also the one source for river-flow data; the vault
# exporter and graph.html's own new RIVER_NOTES bridge (see
# build_river_notes below) both import it from here instead of each
# keeping a copy.
# Real, functionally-grounded interaction-type taxonomy for RIVER_FLOWS
# edges (Aug 13, real Alex ask/G1 of the Galaxy Map plan — "right axis,
# but... all these edges dont have a strong distiction between what they
# do, only what river or node etc that it came from"). Deliberately NOT
# derived from river/node membership (that's already conveyed by node
# color/position) — each type below describes the real MECHANICAL ACTION
# happening at that edge, grepped/read against the actual call site each
# RIVER_FLOWS note already cites, not invented for symmetry. 10 real
# types, kept to a legible legend size rather than one-off per-edge
# labels. Colors are real RPGACE style.css tokens, deliberately a
# DIFFERENT swatch set from RIVER_COLOR so the two legends never get
# visually confused with each other.
# Aug 13, 2nd pass (real Alex ask on G2's own real topology bugs):
# "the lines should represent what affects what, what communicates with
# what, what information change output is done, then where it is
# transported to, with human gates on my end showing what i see and
# what i decide." Real, checked mapping of his own 5-word framing onto
# the 11 types below (not a second taxonomy — one shared vocabulary,
# rule 8): AFFECTS -> doc_staleness_flag; COMMUNICATES -> read_query/
# external_extract_call/session_start_pull; INFORMATION-CHANGE-OUTPUT
# -> ai_judgment_call/write_commit; TRANSPORTED-TO -> dispatch_trigger/
# oversight_deposit; HUMAN GATES -> human_confirm_gate. Real, genuine
# gap found applying this to Supabase specifically (Alex: "supabase
# links should also exist, its communication lines, not execution and
# changing with updates lines") — the existing 10 types had no general
# real-time READ type (session_start_pull is real but scoped narrowly
# to session-start reads only); added read_query as an 11th real type
# rather than force Supabase's real reads into the wrong bucket.
INTERACTION_TYPE_LABEL = {
    'nav_route': 'Page / UI routing',
    'ai_judgment_call': 'Oracle / Claude judgment call',
    'external_extract_call': 'Extracts data from outside RPGACE',
    'write_commit': 'Real persisted write',
    'human_confirm_gate': "Needs Alex's explicit confirm",
    'dispatch_trigger': 'Queues/drains an async Total-system job',
    'oversight_deposit': 'Writes into an oversight doc / Chronicles',
    'session_start_pull': 'Passive read at session start',
    'doc_staleness_flag': 'Advisory: may need a human doc update',
    'terminal_sink': 'No further real downstream flow',
    'read_query': 'Real-time data read (communication, not a change)',
}
INTERACTION_TYPE_COLOR = {
    'nav_route': '#6b7280',
    'ai_judgment_call': '#9B59B6',
    'external_extract_call': '#E2A83D',
    'write_commit': '#3DAA6E',
    'human_confirm_gate': '#E25454',
    'dispatch_trigger': '#4A90E2',
    'oversight_deposit': '#C9A84C',
    'session_start_pull': '#2ABFB0',
    'doc_staleness_flag': '#E0A040',
    'terminal_sink': '#4a4a55',
    'read_query': '#5FB3D9',
}

# Real Aug 13 correction (Alex's own words): a river never acts, calls,
# or communicates — only the real caller (a module/function) living
# inside it does. Every entry below is a real, GROUNDED AGGREGATE view
# (at least one actual caller-level edge crosses from a module in the
# source river into a module/connector in the target river) rolled up
# for human/AI orientation — never treat a river itself as a Total-
# system actor with its own relationships. See system_map_spec.md §1a
# for the full rule; /perspective and galaxy_map.py never draw a river
# as an edge endpoint, only real galaxies/modules/connectors.
# G103 (Aug 26 2026) — every key and every "River N" target label below
# renumbered to match the real rechronologize (see RIVER_COLOR's own
# header note for the full mapping). Old River XVII entries are now
# keyed 12; old River XII/XIII/XIV/XV/XVI entries are now keyed
# 13/14/15/16/17 respectively — content/meaning unchanged, only the
# number each real category sits at.
RIVER_FLOWS = {
    1: [('River II — The Great Confluence', 'always', 'nav_route')],
    2: [
        ('River III — The Oracle Current', 'Oracle page selected', 'nav_route'),
        ('River IV — The Bookworm River', 'Bookworm page selected', 'nav_route'),
        # G49 (Aug 18): split into 2 real edges, one per real post-split
        # river — the old single "Schedule/Content Intel" entry
        # genuinely named both halves of what's now 2 separate rivers.
        ('River V — Daily Ops: Agenda, Schedule & Journal', 'Schedule page selected', 'nav_route'),
        ('River XII — The Research & Intel Stream', 'Content Intel page selected', 'nav_route'),
    ],
    3: [
        ('River VI — The Judgment Chamber', 'a tapped insight badge', 'nav_route'),
        ('River IV — The Bookworm River', 'special prefix diverts the message', 'nav_route'),
        ('River V — Daily Ops: Agenda, Schedule & Journal', 'special prefix diverts the message (scheduleOracle)', 'nav_route'),
        ('River XIII — The API / Auth Layer', 'dormant: a Kimi/Luna provider call would route out through here instead of the default Anthropic call', 'ai_judgment_call'),
    ],
    4: [('River VI — The Judgment Chamber', 'every insight found here', 'ai_judgment_call')],
    5: [
        # G49 (Aug 18): the Content Intelligence -> River VIII flow moved
        # to River 12's own entry below — its real source modules
        # (ciAutoPropose etc.) moved there. River 5 is now terminal on
        # this axis, ending at the Schedule Calendar (a real main.js UI
        # destination, no further river hop).
        ('River XIII — The API / Auth Layer', "morningBrief's real Composio Gmail-fetch call routes out through here", 'external_extract_call'),
    ],
    12: [
        ('River VIII — The Confluence Pool', 'Content Intelligence real write path — the pending-proposal/review-queue flow', 'write_commit'),
    ],
    6: [
        ('River VII — The Library Current', "a fresh leaf's teaching page", 'ai_judgment_call'),
        ('River VIII — The Confluence Pool', 'any confirmable fusion-link bridge', 'human_confirm_gate'),
    ],
    7: [('River VIII — The Confluence Pool', 'a proposed merge', 'human_confirm_gate')],
    8: [('River II — The Great Confluence', "into The Great Tree, River II's own estuary — readable by every other river from there", 'write_commit')],
    9: [
        ('River X — The Confluence of Chronicles', "the Far Shore's own real changes, via system_updates", 'oversight_deposit'),
        ('River XIII — The API / Auth Layer', 'the Claude Code fallback lane\'s drain and Graphify CC\'s own session-start dispatch both route out through here', 'dispatch_trigger'),
    ],
    10: [('— terminal sink for every river above —', 'River XI is the one exception, see below', 'terminal_sink')],
    11: [
        ('River X — The Confluence of Chronicles', 'both branches loop back into the same shared estuary, not a new one', 'oversight_deposit'),
        ('River XIII — The API / Auth Layer', "the OpenMontage handoff, librosa's beat_audio_jobs analysis (via Beat Log), and contentRepurpose's real Composio calls (Notion/YouTube) all route out through here", 'dispatch_trigger'),
    ],
    13: [
        ('River XI — Content Production Live', 'the OpenMontage job result — the one external connector whose real spring AND mouth both sit back in River XI', 'dispatch_trigger'),
        ('River XV — Oversight Docs', 'Graphify CC deposits real findings here via graphify_jobs, flagged for logging', 'oversight_deposit'),
    ],
    14: [('River XV — Oversight Docs', "a skill's behavior change that could make an existing river's own written description go stale", 'doc_staleness_flag')],
    15: [('— feeds every river\'s own next real session —', "CLAUDE.md's own rule: read the relevant section before any nontrivial work", 'session_start_pull')],
    16: [('River XIV — Skills', "feeds Routine's own session-start check via session_memory, read at the start of every future session", 'session_start_pull')],
    17: [
        ('River XIII — The API / Auth Layer', "generates graph.html/GRAPH_TREE.html, this river's own visual form", 'write_commit'),
        ('River XV — Oversight Docs', 'generates obsidian_vault.html, the human-browsable presentation layer', 'write_commit'),
    ],
}


def _roman_to_int(s: str) -> int:
    vals = {'I': 1, 'V': 5, 'X': 10}
    total = 0
    prev = 0
    for ch in reversed(s):
        v = vals[ch]
        total += -v if v < prev else v
        prev = v
    return total


def _river_num_from_label(label: str) -> int | None:
    if not label.startswith('River'):
        return None
    token = label.split('—')[0].split()[1]
    return _roman_to_int(token)


# Build the reverse map (who flows INTO river N) now that the helper exists.
FLOWS_IN = {}
for _src, _targets in RIVER_FLOWS.items():
    for _label, _note, _itype in _targets:
        _tgt = _river_num_from_label(_label)
        if _tgt:
            FLOWS_IN.setdefault(_tgt, []).append((_src, _note, _itype))


_CORE_JS_LINES_CACHE = {}


def _cached_core_js_lines(core_js_path: Path):
    """Real, Aug 27 2026 fix — same real overhead class as
    _legacy_mainjs_text()'s own cache (rule 8, same pattern): 4 separate
    real functions (parse_module_ranges/parse_module_functions/
    _function_line_spans/_function_bodies) each independently called
    core_js_path.read_text().splitlines() fresh, and parse_module_ranges
    ITSELF got called 3x per real function-body lookup — for a real
    58-module rollup (compute_all_oracle_call_counts and friends), that's
    174+ full-file reads/scans of an now ~1.7MB file. Caught the same way
    the mainjs cache was: a real regen-and-verify pass timed out where it
    hadn't before, this time galaxy_map_current.py (a live faulthandler
    trace pinned it to parse_module_ranges via _function_bodies via
    compute_oracle_call_counts, not guessed). Module-level memoized by
    path string, same as _LEGACY_MAINJS_TEXT_CACHE."""
    key = str(core_js_path)
    if key not in _CORE_JS_LINES_CACHE:
        _CORE_JS_LINES_CACHE[key] = core_js_path.read_text(encoding='utf-8').splitlines()
    return _CORE_JS_LINES_CACHE[key]


_MODULE_RANGES_CACHE = {}


def parse_module_ranges(core_js_path: Path):
    """Real module -> (start_line, end_line) from the file's own markers.
    Module-level memoized (see _cached_core_js_lines's own note) — this
    was the real hot path: called 3x per _function_bodies() lookup,
    itself called once per module in every project-wide rollup."""
    key = str(core_js_path)
    if key in _MODULE_RANGES_CACHE:
        return _MODULE_RANGES_CACHE[key]
    ranges = {}
    lines = _cached_core_js_lines(core_js_path)
    stack = None
    for i, line in enumerate(lines, start=1):
        m = re.match(r'/\* ===MODULE:(\w+)=== \*/', line.strip())
        if m:
            stack = (m.group(1), i)
            continue
        e = re.match(r'/\* ===END:(\w+)=== \*/', line.strip())
        if e and stack and e.group(1) == stack[0]:
            ranges[stack[0]] = (stack[1], i)
            stack = None
    _MODULE_RANGES_CACHE[key] = ranges
    return ranges


def compute_intra_river_flow(core_js_path: Path = CORE_JS):
    """Real, mechanical module-to-module call edges WITHIN each river —
    Aug 13, real Alex ask/observation: "these should show relationships
    between each other, then all conjoin eventually at [a real visible
    output]... the modules are the flows of the river, so it makes
    sense as a river." Reuses parse_module_ranges() (rule 8, not
    re-parsed) — for each river's own module set, greps each module's
    real source block for a literal `RPGACE.modules.<sibling>` call.

    Real, honest scope limit stated plainly, not hidden: this only
    catches DIRECT calls; a relationship carried through
    RPGACE.hooks.fire()/shared Supabase state (real, but dynamic-
    dispatch, same confirmed extraction blind spot graphify's own AST
    extractor has for RPGACE.register()) is invisible to this method
    and simply won't show an edge — an absence here is not proof no
    real relationship exists, only that no DIRECT call was found.

    Aug 13, later pass — real /misunderstanding-diagnosed fix on River
    III. Alex's own direct rule: "at level 2 nothing should be
    disconnected as it should flow in one coherent pipeline." Real
    evidence check (GODMODE, not a guess) found River III drew 10 of
    12 modules as dead-end spokes off the river hub — but a real code
    read confirmed most of them DO genuinely converge on the same real
    Oracle pipeline, just through 3 OTHER real, documented RPGACE
    idioms this function's original single grep couldn't see (CLAUDE.md's
    own "Building guide for lower models" rule 9 names the first one by
    name — this was a genuine detection gap in the map, not a genuine
    absence of connection in the app):
      1. window.callOracle/sendChat re-wrap chains (oracleTreeGrounding/
         oracleAppGrounding/oracleFetchGuard/scheduleOracle each do
         `window.callOracle = function(...){{ ... orig ... }}` — a real,
         load-bearing monkey-patch chain, confirmed via direct grep of
         all 3 wrap sites cited in CLAUDE.md's own Oracle section).
      2. A shared RPGACE.utils.* convergence point — instaOraclePanel/
         tiktokOracle/prodOraclePanel all call the SAME real
         `RPGACE.utils.sendToOracle()`/`fillGaps()` helpers (confirmed
         by direct read of instaOraclePanel.run()) — genuinely
         different modules, genuinely the same real destination.
      3. Direct DOM-level triggering of the shared chat surface —
         youtubeOracle.run() grabs `#chat-input`/`#send-btn` by ID and
         drives them directly (confirmed by direct read) — a real UI-
         level connection with zero JS-identifier overlap with the
         other 2 mechanisms, invisible to any function-name grep.
    Each is a real, separately mechanical, checkable signal (never
    fabricated for symmetry) — added as its own edge `kind` so the
    renderer can show it honestly as an INFERRED convergence, visually
    distinct from a literal `RPGACE.modules.X()` call, never blended
    into the same "direct call" claim. A module that STILL shows no
    edge after all 4 signals is a real, honest remaining gap — flagged
    on the map as "no detected relationship," not silently stranded.

    Returns {river_num: [(from_module, to_module, kind), ...]} where
    kind is one of 'direct'/'wrap'/'utility'/'dom'."""
    ranges = parse_module_ranges(core_js_path)
    lines = core_js_path.read_text(encoding='utf-8').splitlines()

    def block_of(m):
        if m not in ranges:
            return ''
        s, e = ranges[m]
        return '\n'.join(lines[s - 1:e])

    # Real, cited whitelist — deliberately narrow. Only Oracle-specific
    # shared-send utilities count as a real "converges on the same
    # pipeline" signal; RPGACE.utils.toast() is generic app-wide UI
    # feedback used by nearly every module in the codebase and would
    # produce a meaningless dense web if included (same "exclude
    # generic lifecycle hooks" discipline this function already applies
    # below to RPGACE.hooks).
    UTILITY_SIGNALS = ('sendToOracle', 'fillGaps')
    # G25 (Aug 14, real /misunderstanding follow-up — River V showed
    # 10/10 modules isolated). Real evidence found by direct grep,
    # checked before generalizing (not assumed): `callOracle`/`sendChat`
    # were never the only real window.X wrap-chain targets in the
    # codebase — `syncIntelData` (3 real wraps, 2 of them ciAutoPropose/
    # intelDedup, BOTH River V) and `renderEncEntries` (2 real wraps,
    # both River VII) are real, equally-valid instances of the exact
    # same idiom, just never generalized past the 2 Oracle-specific
    # names this signal originally shipped with. WRAP_TARGETS is now
    # computed from the live file (every real window.X wrap site with
    # 2+ real wrappers anywhere in the codebase — genuinely dynamic,
    # not hand-extended with 2 more hardcoded names) rather than a
    # fixed tuple, so a future new wrap chain doesn't need this file
    # touched again to be detected.
    _wrap_counts = {}
    for _wm in re.findall(r'window\.(\w+)\s*=\s*function', core_js_path.read_text(encoding='utf-8')):
        _wrap_counts[_wm] = _wrap_counts.get(_wm, 0) + 1
    WRAP_TARGETS = sorted(k for k, v in _wrap_counts.items() if v >= 2)
    DOM_SIGNALS = (r"getElementById\(\s*['\"]chat-input['\"]\s*\)",
                   r"getElementById\(\s*['\"]send-btn['\"]\s*\)",
                   r'\[onclick\*="sendChat"\]')

    flows = {}
    for rnum, mods in RIVER_MODULES.items():
        edges = []
        touched = set()
        # Signal 1 (existing): direct RPGACE.modules.<sibling> calls.
        for m in mods:
            block = block_of(m)
            if not block:
                continue
            for other in mods:
                if other == m or other not in ranges:
                    continue
                if re.search(r'RPGACE\.modules\.' + re.escape(other) + r'\b', block):
                    edges.append((m, other, 'direct'))
                    touched.add(m); touched.add(other)

        # Signal 2: real window.X wrap-chain membership, ANY multi-
        # wrapped function (WRAP_TARGETS, computed dynamically above —
        # G25 generalized this past the original callOracle/sendChat-
        # only pair) — real file-declaration order IS the real wrap
        # order (the last reassignment before use is what executes),
        # so this draws a real ordered chain, not a fabricated complete
        # graph.
        for target in WRAP_TARGETS:
            wrappers = [m for m in mods if re.search(
                r'window\.' + target + r'\s*=\s*function', block_of(m))]
            wrappers.sort(key=lambda m: ranges[m][0])
            for a, b in zip(wrappers, wrappers[1:]):
                edges.append((a, b, 'wrap'))
                touched.add(a); touched.add(b)

        # Signal 2b (Aug 14, real G22 module-by-module evidence pass —
        # Alex: "lets do g26 to finish mid build, then g11, g22...").
        # Real root cause found by direct investigation of intelBatchList
        # (the last-standing false-isolated module in River V after
        # G25): it DOES wrap a real WRAP_TARGETS member (loadIntelInsights,
        # 3 real global wrappers — genuinely in WRAP_TARGETS already) —
        # but those 3 wrappers span 2 DIFFERENT rivers (intelBatchList/
        # River V, videoSummary/River XI) plus an unrivered `config`
        # module, so WITHIN River V specifically there is only ONE real
        # wrapper — Signal 2's own same-river chain (`zip(wrappers,
        # wrappers[1:])`) correctly finds no same-river peer to connect
        # to and silently produces zero edges, even though the module
        # genuinely isn't isolated — it has a real CROSS-river connection
        # via a shared main.js function. Reuses the exact same pseudo-
        # node naming convention compute_hook_signal_edges() already
        # established for main.js-side evidence (`core-wrapper[mainjs:X]`)
        # so downstream rendering needs zero special-casing.
        for target in WRAP_TARGETS:
            wrappers = [m for m in mods if re.search(
                r'window\.' + target + r'\s*=\s*function', block_of(m))]
            if len(wrappers) == 1:
                edges.append((wrappers[0], f'core-wrapper[mainjs:{target}]', 'wrap'))
                touched.add(wrappers[0])

        # Signal 3: shared RPGACE.utils.<oracle-send> convergence — each
        # qualifying module gets a real edge INTO this river's own
        # already-computed terminal (a genuine "feeds the same real
        # pipeline stage" claim), when a terminal candidate exists.
        # Real, honest fallback when no terminal exists yet: skip
        # (never guess a fake destination).
        util_users = [m for m in mods if any(
            re.search(r'RPGACE\.utils\.' + sig + r'\s*\(', block_of(m)) for sig in UTILITY_SIGNALS)]
        # Signal 4: direct DOM-level chat-surface triggering.
        dom_users = [m for m in mods if any(
            re.search(pat, block_of(m)) for pat in DOM_SIGNALS)]
        indirect_targets = [m for m in mods if m not in touched and (m in util_users or m in dom_users)]
        if indirect_targets:
            # Real terminal candidate from DIRECT+wrap evidence only —
            # computed here (not via compute_river_terminals(), which
            # would be circular) using the same real in-degree logic:
            # the module with the most real direct/wrap edges pointing
            # INTO it, since that's the module signal 2/3 users are
            # genuinely converging toward.
            indeg = {}
            for f, t, _k in edges:
                indeg[t] = indeg.get(t, 0) + 1
            target = max(indeg, key=indeg.get) if indeg else None
            if target:
                for m in indirect_targets:
                    kind = 'utility' if m in util_users else 'dom'
                    edges.append((m, target, kind))
                    touched.add(m)

        # Signal 5 (Aug 14, real main.js/hooks-aware detection extension
        # — closes the exact gap this function's own docstring names as
        # invisible: "a relationship carried through RPGACE.hooks.fire()
        # ... is invisible to this method"). Real RPGACE.hooks.fire()/
        # hooks.on() pairing WITHIN this same river only — a firer
        # outside this river (including a real 'core-wrapper[mainjs:x]'
        # bridge firer) is genuine, real evidence too, but belongs at
        # the cross-river/backdoor layer, not drawn as an intra-river
        # edge here (same honest scoping this function already applies
        # to signals 1-4).
        for f, t, hook in _HOOK_SIGNAL_EDGES:
            if f in mods and t in mods and f != t:
                edges.append((f, t, 'hook'))
                touched.add(f); touched.add(t)
        if edges:
            flows[rnum] = edges
    return flows


# Aug 13, real Level-3 rollout (Alex's own direct ask: "flow through a
# level 3 structure which is a module or function... those flow
# through buttons being the gateway to level 3 diagrams," then "lets
# finish g14 so we mark down all components into galaxy map"). The
# real, canonical list of modules that actually have a built Level-3
# page — a module only ever becomes a clickable Level-2 gateway
# (galaxy_map_module.py) once it's genuinely in this set, never a
# guessed/empty destination. Proof-of-concept shipped on beatLog first
# (19 real functions, 19 real call edges), matching manual.html's own
# long-standing "4 parallel actions (see Level 2 diagram)" cross-
# reference note — the pattern held up under a real stress test against
# all 44 modules (2 real bugs found and fixed: an infinite-loop risk on
# a genuine function-call cycle in compute_function_rank(), and a
# canvas-height formula that sized by depth-COUNT instead of the
# widest real column), then rolled out to all 44 real Level-2 modules.
LEVEL3_MODULES = set(m for mods in RIVER_MODULES.values() for m in mods)
# Real, full rollout: every module RIVER_MODULES already knows about
# gets a real Level-3 page — never a hand-picked subset, so this stays
# correct automatically as RIVER_MODULES grows (rule 8, single source
# of truth). intelBatchList needed a real one-time fix first: it was
# sitting inside uiBatchList's own /* ===MODULE:x=== */ marker block
# with no markers of its own (a genuine pre-existing gap in this
# file's marker convention, found by this exact rollout's own test
# pass), so parse_module_ranges() silently returned zero functions for
# it — fixed directly in rpgace_core.js (real marker split, zero
# behavior change), confirmed via a fresh parse: 44 of 44 modules now
# return at least 1 real function.


def _module_def_line_match(line):
    """Real, shared single-line definition-matcher (rule 8) — one regex
    check used by BOTH parse_module_functions() and _function_bodies(),
    so the two never silently diverge on what counts as a real function.
    Matches the standard `name: function(...)`/`name: async function`
    module-method shape, OR (Aug 14, real evidence: rpgace_core.js:18309,
    `window.RPGACE_verifyPassword = function(pw){...}`, authGate's own
    real password-verify bridge — sitting OUTSIDE the register() object
    literal, at true zero indentation, so it was invisible to the
    key:function pattern alone and never became a Level-3 node at all —
    a real, deeper root cause behind the Aug 13 authGate
    /misunderstanding, not just missing UI evidence on an already-drawn
    node) a real, module-SCOPE `window.<Name> = function(...) {` bare
    assignment. Deliberately anchored at column 0 (`^window\.`, no
    leading whitespace) — confirmed by direct grep this is the ONLY
    such zero-indent case in the whole file; the same `window.X =
    function` shape appears ~20 more times elsewhere but always
    nested 4+ spaces deep inside a real containing method (e.g.
    `_intercept: function(){ ... window.toggleInstaPanel = ... }`) —
    those are correctly left alone here, since they're already part of
    their containing method's own real body, and treating them as a
    second top-level definition would wrongly truncate that method's
    real span. Returns the real function name, or None."""
    m = re.match(r'\s*(_?[A-Za-z0-9]+)\s*:\s*(?:async\s+)?function\b', line)
    if m:
        return m.group(1)
    m = re.match(r'window\.(\w+)\s*=\s*function\b', line)
    if m:
        return m.group(1)
    return None


def parse_module_functions(module_name, core_js_path: Path = CORE_JS):
    """Real, mechanical function inventory for ONE module — Aug 13 Level-3
    proof-of-concept (Alex's own ask: "flow through a level 3 structure
    which is a module or function... those flow through buttons being
    the gateway to level 3 diagrams"). Greps the module's own real
    source block (parse_module_ranges(), rule 8) for its own top-level
    `_funcName: function(...)` / `funcName: function(...)` definitions —
    the same real object-literal-method shape every RPGACE.register()
    module uses, plus (Aug 14) any real bare module-scope `window.<Name>
    = function` statement via the shared _module_def_line_match()
    (rule 8). Returns [func_name, ...] in real source order (top to
    bottom), never alphabetized or reordered — source order is itself
    real evidence of a module's own intended read order.

    Real, honest scope limit: only catches DIRECT `name: function` /
    `name: async function` top-level methods on the module object
    literal (plus the one real zero-indent window.X pattern above) — a
    function nested inside another function's own body (a closure) is
    deliberately not surfaced as a separate node, since it isn't part
    of the module's own real public/callable surface."""
    ranges = parse_module_ranges(core_js_path)
    if module_name not in ranges:
        return []
    lines = _cached_core_js_lines(core_js_path)
    s, e = ranges[module_name]
    block_lines = lines[s - 1:e]
    funcs = []
    for line in block_lines:
        name = _module_def_line_match(line)
        if name and name not in funcs:
            funcs.append(name)
    return funcs


def _function_line_spans(module_name, core_js_path: Path = CORE_JS):
    """Real {func_name: (abs_start_line, abs_end_line)}, 1-indexed and
    inclusive at both ends — factored out of _function_bodies() below,
    G87 (Aug 26 2026), so a second real consumer (compute_boot_task_
    by_function(), which needs to resolve a bare global line number back
    to its enclosing function) can reuse the exact same span logic
    rather than re-deriving it a 2nd time (rule 8)."""
    ranges = parse_module_ranges(core_js_path)
    if module_name not in ranges:
        return {}
    lines = _cached_core_js_lines(core_js_path)
    s, e = ranges[module_name]
    block_lines = lines[s - 1:e]
    funcs = parse_module_functions(module_name, core_js_path)
    if not funcs:
        return {}
    def_lines = []
    for i, line in enumerate(block_lines):
        name = _module_def_line_match(line)
        if name and name in funcs:
            def_lines.append((i, name))
    spans = {}
    for idx, (start_i, fname) in enumerate(def_lines):
        end_i = def_lines[idx + 1][0] if idx + 1 < len(def_lines) else len(block_lines)
        spans[fname] = (s + start_i, s + end_i - 1)
    return spans


def _function_bodies(module_name, core_js_path: Path = CORE_JS):
    """Real, shared per-function source-span splitter (rule 8 — Aug 13,
    factored out here after a real self-audit caught this exact
    splitting logic about to be pasted a THIRD time, once each for
    compute_module_function_flow()/compute_cross_module_function_calls()/
    the new UI-signal detector below — the same "eliminate duplication
    gaps" discipline this file already applies to everything else).
    Finds each real function's own definition line inside the module's
    marker-delimited block, then takes everything up to the next real
    top-level function definition (or the end of the module) as that
    function's real body. Returns {func_name: body_text}."""
    ranges = parse_module_ranges(core_js_path)
    if module_name not in ranges:
        return {}
    lines = _cached_core_js_lines(core_js_path)
    spans = _function_line_spans(module_name, core_js_path)
    return {fname: '\n'.join(lines[a - 1:b]) for fname, (a, b) in spans.items()}


def compute_module_function_flow(module_name, core_js_path: Path = CORE_JS):
    """Real, mechanical function-to-function call edges WITHIN one
    module — the function-grain sibling of compute_intra_river_flow()
    (rule 8, same technique, one level deeper). For each of the
    module's own real functions (_function_bodies()), greps that
    function's own real source body for a literal `self.<sibling>(` or
    `<moduleName>.<sibling>(` call to another function in the same
    module. Returns [(from_func, to_func), ...].

    Real, honest scope limit, same shape as the module-level version:
    only DIRECT same-module calls are caught. A call reached through
    RPGACE.hooks.fire(), a callback passed by reference, or a dynamic
    property lookup is invisible here — an absence is not proof no
    real relationship exists, only that no direct call was found."""
    bodies = _function_bodies(module_name, core_js_path)
    funcs = list(bodies.keys())
    edges = []
    for fname, body in bodies.items():
        for other in funcs:
            if other == fname:
                continue
            if re.search(r'\bself\.' + re.escape(other) + r'\s*\(', body) or \
               re.search(re.escape(module_name) + r'\.' + re.escape(other) + r'\s*\(', body):
                edges.append((fname, other))
    return edges


# Real, shared UI-actor detection patterns (Aug 13, Alex's own direct
# ask: "make it so all functions at level 3 also connect to a ui exit
# i can see if it makes sense... a permanent overarch bubble titled
# Alex... where the input is shown to me (doms and their pop-up
# systems) the buttons i can press (so also my input)"). Two real,
# mechanical, checkable signals, deliberately narrow (never a guess):
# OUTPUT = this function renders something Alex would actually see on
# screen; INPUT = this function wires up or reads a real user-triggered
# control. A function can be neither (pure internal logic — the honest,
# common case), one, or both.
# Aug 14 — broadened per real, direct evidence (grep of
# rpgace_core.js's own addEventListener usage, not a guess): the
# original INPUT pattern only checked for 'click'/.value/.dispatchEvent
# and missed real, already-live event types this exact codebase uses —
# 'input'×5, 'keydown'×3, 'popstate'×1 (pathRouter's own real browser
# back/forward handler, one of the two Aug 13 "mystery" modules), plus
# 'change' and drag/touch events. Also adds a bare `showPage(` call
# (35 real occurrences in rpgace_core.js — a load-bearing OUTPUT signal
# needing zero cross-file scanning, since it's a call already inside
# the file already being read) to OUTPUT.
UI_OUTPUT_PATTERN = re.compile(
    r'document\.createElement\(|innerHTML\s*=|RPGACE\.ui\.slideInPanel\(|_popup\(|\.appendChild\(|\bshowPage\(')
UI_INPUT_PATTERN = re.compile(
    r'\.onclick\s*=|addEventListener\(\s*[\'"](click|input|keydown|change|popstate|dragover|dragleave|drop|touchstart|touchend|focusin)|getElementById\([^)]*\)\.value|\.dispatchEvent\(')


# Aug 14 — the real main.js/index.html-aware detection extension,
# G15's own stated blocking prerequisite (ceo_plan_items). Real
# evidence, GODMODE pass (never guessed): the whole Galaxy Map pipeline
# only ever scans rpgace_core.js — Alex's own diagnosis, "i think
# galaxy map is only mapping out backend," confirmed literally true.
# Two real, distinct bridges close this, both grep-only/read-only,
# never touching main.js or index.html:
#
# (1) CORE_WRAPPER_HOOKS — rpgace_core.js's own real "FUNCTION
# WRAPPERS" section (lines ~395-544, its own comment: "Wraps existing
# main.js functions to add hook fire points... Do NOT patch main.js —
# wrap here instead") is a genuine, already-built, self-documenting
# bridge: it wraps 6 real main.js-defined UI functions and fires a
# named RPGACE.hooks event right after each one runs. This is the
# actual, confirmed mechanism resolving BOTH Aug 13 "mystery" modules
# at once — checkPassword() (index.html:61 onclick, main.js:12) is
# wrapped here to fire 'rpgace:login', which pathRouter.init() listens
# for directly (RPGACE.hooks.on('rpgace:login', ...)); showPage() is
# wrapped here to fire 'page:show', which pathRouter ALSO listens for.
CORE_WRAPPER_HOOKS = {
    'showSched': 'sched:show',
    'showPage': 'page:show',
    'renderAgendas': 'agendas:rendered',
    'addXP': 'xp:awarded',
    'checkPassword': 'rpgace:login',
    'saveToJournal': 'journal:saved',
}


_LEGACY_MAINJS_TEXT_CACHE = {}


def _legacy_mainjs_text(core_js_path: Path = CORE_JS) -> str:
    """Real, Aug 20 2026 fix: main.js was mechanically merged into
    rpgace_core.js (Alex's own direct ask — one file instead of two,
    zero logic rewrite; see that file's own header comment). Every
    detector below that used to read a separate main.js file now reads
    THIS instead — the text between the /* ===LEGACY:mainjs=== */ and
    /* ===END:LEGACY:mainjs=== */ sentinel lines, which is byte-
    identical to the old main.js content. Returns '' if the markers
    are ever missing (fails open to empty, same as the old
    main_js_path.exists() check it replaces — never crashes the
    pipeline on a missing/renamed marker). Module-level memoized (rule
    11, same pattern as _HOOK_SIGNAL_EDGES/find_wrap_installer_function
    above): pre-merge this read a separate ~258KB main.js file; post-
    merge it's a ~1.2MB rpgace_core.js read + DOTALL regex scan, real
    overhead if called once per function instead of once per script
    run — caught during this pass's own regen-and-verify pass (2
    scripts, galaxy_map_module.py/galaxy_map_zoom.py, timing out where
    they hadn't before)."""
    key = str(core_js_path)
    if key in _LEGACY_MAINJS_TEXT_CACHE:
        return _LEGACY_MAINJS_TEXT_CACHE[key]
    if not core_js_path.exists():
        return ''
    text = core_js_path.read_text(encoding='utf-8', errors='ignore')
    m = re.search(r'/\* ===LEGACY:mainjs=== \*/\n(.*?)/\* ===END:LEGACY:mainjs=== \*/',
                  text, re.DOTALL)
    result = m.group(1) if m else ''
    _LEGACY_MAINJS_TEXT_CACHE[key] = result
    return result


def _mainjs_function_bodies(core_js_path: Path = CORE_JS):
    """Real, main.js-side sibling of _function_bodies() (rule 8, same
    "until the next top-level definition" splitting technique, applied
    to main.js's own flatter top-level-function shape rather than a
    RPGACE.register() module object literal). Read-only evidence
    gathering — never mutates anything. Matches `function name(...) {`/
    `async function name(...) {` at real column-0 indentation
    (confirmed by direct read: checkPassword/togglePwVis/etc. are all
    true top-level declarations, not indented). Real, honest scope
    limit: a function assigned via `const x = function(){}` or one
    nested inside another function's body is not split out separately
    here — same class of limit _function_bodies() already states.
    Aug 20 2026: sources from _legacy_mainjs_text() (the merged
    file's own legacy section) instead of a separate main.js file."""
    text = _legacy_mainjs_text(core_js_path)
    if not text:
        return {}
    lines = text.splitlines()
    def_lines = []
    for i, line in enumerate(lines):
        m = re.match(r'(?:async\s+)?function\s+(\w+)\s*\(', line)
        if m:
            def_lines.append((i, m.group(1)))
    bodies = {}
    for idx, (start_i, fname) in enumerate(def_lines):
        end_i = def_lines[idx + 1][0] if idx + 1 < len(def_lines) else len(lines)
        bodies[fname] = '\n'.join(lines[start_i:end_i])
    return bodies


def compute_hook_signal_edges(core_js_path: Path = CORE_JS):
    """Real module-to-legacy-section relationship edges, 2 real signal
    types merged into one list (rule 8 — one shared function, every
    consumer picks up both automatically):

    (1) RPGACE.hooks.fire()/hooks.on() pairing — closes the exact gap
    compute_intra_river_flow()'s own docstring names as invisible ("a
    relationship carried through RPGACE.hooks.fire()... is invisible
    to this method"). For every real hook name, finds every module
    whose own source block contains a real `hooks.fire('name'` (the
    firer) and every module whose block contains a real
    `hooks.on('name'` (the listener), plus CORE_WRAPPER_HOOKS' own
    real firers (labeled 'core-wrapper[mainjs:<fn>]' since they're not
    owned by any single RPGACE.register() module — they're the legacy
    section's own top-level bridge code, wrapping a real main.js UI
    function).

    (2) Aug 20 2026, G22 continuation post-main.js-merge — the mirror
    image of (1): a legacy-section function calling a real module
    DIRECTLY via `RPGACE.modules.<mod>.<method>(...)`, labeled
    'direct-call' instead of a hook name. Real, confirmed find:
    oracleProviderMode (G34) fell through every existing signal
    because its entire connection to the app is main.js's own
    callOracle() calling it directly — no hook, no window.X bridge, no
    cross-module call from another module. Same
    'core-wrapper[mainjs:<fn>]' pseudo-node naming as (1).

    Returns [(from_label, to_module, hook_or_kind), ...]. Real, honest
    scope limit: only catches a DIRECT `hooks.fire('name'`/
    `hooks.on('name'` literal string match — a hook name built
    dynamically (never done anywhere in this codebase, confirmed by
    grep) would be invisible, same class of limit as every other
    detector in this file."""
    ranges = parse_module_ranges(core_js_path)
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
    fire_map, listen_map = {}, {}
    for mod, (s, e) in ranges.items():
        block = '\n'.join(lines[s - 1:e])
        for h in re.findall(r"hooks\.fire\(\s*'([^']+)'", block):
            fire_map.setdefault(h, set()).add(mod)
        for h in re.findall(r"hooks\.on\(\s*'([^']+)'", block):
            listen_map.setdefault(h, set()).add(mod)
    for fn, hook in CORE_WRAPPER_HOOKS.items():
        fire_map.setdefault(hook, set()).add('core-wrapper[mainjs:%s]' % fn)
    edges = []
    for hook, listeners in listen_map.items():
        for f in sorted(fire_map.get(hook, ())):
            for l in sorted(listeners):
                if f == l:
                    continue
                edges.append((f, l, hook))

    # Real, 2nd signal type (Aug 20 2026, G22 continuation post-main.js-
    # merge): a legacy-section function calling a real module DIRECTLY
    # via `RPGACE.modules.<mod>.<method>(...)` — the mirror image of
    # CORE_WRAPPER_HOOKS above (which only catches the module -> legacy
    # direction, a real `window.X = function` a legacy function reads).
    # Real, confirmed find: oracleProviderMode (G34, Aug 15 2026) fell
    # through EVERY existing signal (same-river, cross-module backdoor,
    # hook pairing, main.js window-bridge) because its entire real
    # connection to the rest of the app is main.js's own callOracle()
    # calling `RPGACE.modules.oracleProviderMode.isExternal()`/
    # `.getProviderName()` directly — a real, live relationship no
    # existing detector was built to see. Reuses the exact same
    # `core-wrapper[mainjs:<fn>]` pseudo-node naming CORE_WRAPPER_HOOKS
    # already established, labeled 'direct-call' instead of a real hook
    # name so a reader can tell the two signal types apart at a glance.
    # G108 continuation (Aug 26 2026) — real R5 idempotency bug caught
    # by this session's own before/after diff (galaxy_map_load.html's
    # last 2 rows swapped order between 2 regenerations, no source
    # change in between): iterating a bare `set()` here relies on
    # Python's hash-randomized set order, which is NOT guaranteed
    # stable across process runs — `sorted()` fixes it, same standing
    # discipline every other detector in this file already follows.
    for fname, body in sorted(_mainjs_function_bodies(core_js_path).items()):
        for called_mod in sorted(set(re.findall(r'RPGACE\.modules\.(\w+)\.', body))):
            if called_mod in ranges:
                edges.append(('core-wrapper[mainjs:%s]' % fname, called_mod, 'direct-call'))
    return edges


# Real, module-level precompute (rule 11 — same 44-module scale as
# _WRAP_INSTALLER_CACHE, cheap and never changes within one script run;
# compute_intra_river_flow() reads this directly rather than
# recomputing per-river, matching CROSS_MODULE_CALLS' own eager-
# precompute convention in galaxy_map_level3.py). Safe regardless of
# definition order — compute_intra_river_flow() only reads this name
# when it's actually CALLED by an external script, by which point this
# whole module has finished importing.
_HOOK_SIGNAL_EDGES = compute_hook_signal_edges()


_MAINJS_BRIDGE_CACHE = {}


def compute_mainjs_window_bridge(core_js_path: Path = CORE_JS,
                                  index_html_path: Path = INDEX_HTML):
    """The real 2-hop UI-trigger bridge — Aug 14, built directly off
    Alex's own words: "verify would require my input... i think galaxy
    map is only mapping out backend. make it show frontend too." A
    real rpgace_core.js function that does `window.X = function` gets
    no real input evidence under the plain per-function scan if X is
    never itself the literal onclick target in index.html — because
    RPGACE's own documented override convention (CLAUDE.md: main.js
    defines an original/stub, a rpgace_core.js module's init()/
    _intercept() reassigns window.X to the real implementation) means
    the button's onclick often names a DIFFERENT function, defined in
    main.js's legacy section, which then calls window.X internally.

    Real, confirmed evidence chain (Aug 14, direct read, not guessed):
    index.html:61 `onclick="checkPassword()"` -> main.js's own
    `checkPassword()` body contains the literal text
    `window.RPGACE_verifyPassword` -> rpgace_core.js's authGate module
    does `window.RPGACE_verifyPassword = function(pw){...}` (now a
    real Level-3 node itself, see _module_def_line_match()).

    Aug 20 2026: main.js was mechanically merged into rpgace_core.js —
    `_mainjs_function_bodies()` now sources from that file's own
    legacy section (`_legacy_mainjs_text()`) instead of a separate
    file, so this bridge keeps working identically post-merge. The
    real evidence chain above is unchanged; only where the "main.js
    text" comes from changed.

    Returns {(module, func): evidence_string} for every real
    rpgace_core.js function whose own `window.Y = function`
    assignment is genuinely reachable this way — either directly
    (index.html names Y itself) or via one real main.js-legacy-section
    hop. Real, honest scope limit: only a DIRECT textual `window.<name>`
    reference inside the legacy function body counts — a call reached
    through a variable alias is invisible here, same class of limit as
    every other detector in this file. Module-level memoized (rule 11
    — same pattern as find_wrap_installer_function(), this doesn't
    change within one script run)."""
    key = (str(core_js_path), str(index_html_path))
    if key in _MAINJS_BRIDGE_CACHE:
        return _MAINJS_BRIDGE_CACHE[key]
    onclick_targets = set()
    if index_html_path.exists():
        onclick_targets = set(re.findall(
            r'on(?:click|change|input)="(\w+)\(',
            index_html_path.read_text(encoding='utf-8', errors='ignore')))
    mainjs_bodies = _mainjs_function_bodies(core_js_path)
    # Which window.<Y> globals does each real, index.html-triggered
    # main.js function body actually reference (the one real hop)?
    bridged_globals = {}
    for fn in onclick_targets:
        body = mainjs_bodies.get(fn)
        if not body:
            continue
        for g in re.findall(r'window\.(\w+)', body):
            bridged_globals.setdefault(g, fn)
    result = {}
    for mod in parse_module_ranges(core_js_path):
        for fname, body in _function_bodies(mod, core_js_path).items():
            for m in re.finditer(r'window\.(\w+)\s*=\s*function', body):
                gname = m.group(1)
                if gname in onclick_targets:
                    result[(mod, fname)] = 'index.html onclick="%s(...)"' % gname
                elif gname in bridged_globals:
                    src_fn = bridged_globals[gname]
                    result[(mod, fname)] = (
                        'index.html onclick="%s(...)" -> main.js %s() -> window.%s'
                        % (src_fn, src_fn, gname))
    _MAINJS_BRIDGE_CACHE[key] = result
    return result


def compute_function_ui_signals(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION UI-actor signal (Level 3's own granularity) —
    {func_name: {'output': bool, 'input': bool, 'bridge': str|None}}.
    Reuses _function_bodies() (rule 8, not re-split a 3rd time). Aug 14:
    'input' is also true, and 'bridge' names the real evidence chain,
    when compute_mainjs_window_bridge() confirms this exact function is
    genuinely reachable from a real index.html control via main.js —
    the fix for authGate/pathRouter reading as false-isolated."""
    bodies = _function_bodies(module_name, core_js_path)
    bridge = compute_mainjs_window_bridge(core_js_path)
    sigs = {}
    for f, b in bodies.items():
        bridge_ev = bridge.get((module_name, f))
        sigs[f] = {'output': bool(UI_OUTPUT_PATTERN.search(b)),
                   'input': bool(UI_INPUT_PATTERN.search(b)) or bool(bridge_ev),
                   'bridge': bridge_ev}
    return sigs


def compute_module_ui_signal(module_name, core_js_path: Path = CORE_JS):
    """Real, MODULE-granularity aggregate (Level 2's own granularity,
    per Alex's "also present at level 0, 1 and 2 where it makes
    sense") — True for a signal if ANY real function in this module
    carries it, per compute_function_ui_signals() (rule 8, not
    re-derived). {'output': bool, 'input': bool}."""
    sigs = compute_function_ui_signals(module_name, core_js_path)
    return {'output': any(v['output'] for v in sigs.values()),
            'input': any(v['input'] for v in sigs.values())}


# Aug 14, later pass — the real "Oracle bubble" + edge-action-count
# feature. Alex's own direct ask, with a real, important correction on
# the follow-up: "other externals don't have to be permanent, oracle
# too tbh, its just going to be very prevalent since claude api runs a
# lot of the architecture until moonshot and luna is added." This is
# NOT a forced-everywhere bubble — it's a real, evidence-driven one,
# same discipline as every other detector in this file: it will look
# prevalent for Oracle specifically because Oracle genuinely IS called
# from a lot of real places right now, not because the code fakes it.
# Real, confirmed call-site patterns (direct grep, not guessed):
# `sendToOracle(` (17 real occurrences), `callOracle(` (7),
# `fillGaps(` (6) — RPGACE.utils' own real Oracle-send helpers plus the
# direct callOracle() entry point.
ORACLE_CALL_PATTERNS = ('sendToOracle(', 'callOracle(', 'fillGaps(')


def compute_oracle_call_counts(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION count of how many times a function's own body
    references a real Oracle-call pattern (ORACLE_CALL_PATTERNS) — the
    real "number next to the edge" Alex asked for (how many real
    actions happen between Oracle and this function). Reuses
    _function_bodies() (rule 8). Returns {func_name: count}, 0 for a
    function with no real Oracle call. Real, honest scope limit: a
    literal substring count, same class of limit as every other
    pattern-based detector here — a call reached through a stored
    reference or built dynamically is invisible to this method."""
    bodies = _function_bodies(module_name, core_js_path)
    return {f: sum(b.count(p) for p in ORACLE_CALL_PATTERNS) for f, b in bodies.items()}


def compute_module_oracle_call_count(module_name, core_js_path: Path = CORE_JS):
    """Real, MODULE-granularity aggregate — the real sum of every real
    function's own Oracle-call count (rule 8, not re-derived). A
    module with 0 total genuinely never calls Oracle directly (it may
    still be reached indirectly, e.g. via a hook or a sibling — same
    honest scope limit as everywhere else)."""
    counts = compute_oracle_call_counts(module_name, core_js_path)
    return sum(counts.values())


def compute_all_oracle_call_counts(core_js_path: Path = CORE_JS):
    """Real, project-wide roll-up — {module: {func: count}}, every real
    function ANYWHERE that calls Oracle (count > 0 only), module-grouped
    upstream at parse_module_ranges() (rule 8, not re-parsed) — same
    real shape as compute_all_supabase_table_touches() one screen up.

    G91 continuation (Aug 25 2026) — powers External AI's own infra
    drill-down (galaxy_map_externals.html), the generalized river ->
    module -> function shape build_infra_drilldown()/
    render_infra_drilldown() were factored for, fed with real Oracle-
    call evidence instead of Supabase-table evidence this time. Not
    scoped to LEVEL3_MODULES on purpose — a cross-cutting (no-river)
    module that calls Oracle is a real fact too, and build_infra_
    drilldown()'s own river_of.get(module) lookup already returns None
    for those, routing them into the orphans bucket exactly the way the
    Supabase page's config/dashDeck/etc. rows already do."""
    ranges = parse_module_ranges(core_js_path)
    out = {}
    for m in ranges:
        counts = {f: n for f, n in compute_oracle_call_counts(m, core_js_path).items() if n > 0}
        if counts:
            out[m] = counts
    return out


def compute_card_oracle_call_count(card, card_flow, core_js_path: Path = CORE_JS):
    """Real, DASHBOARD-CARD-granularity aggregate (Aug 14, G16
    continuation — Alex: "move on with next phase or step of g-series
    that are planned"). Reuses compute_dashboard_card_flow()'s own
    already-resolved real target modules (rule 8, never re-derived): a
    'popup' target's own module + its real sub_injector module (the
    established _openX() -> _inject*() handoff), or — for a 'page'
    target — every real module in the card's own CARDS_BY_RIVER
    river(s), same honest "no single owning module" treatment
    compute_dashboard_card_flow() already applies. Returns a real int,
    0 for a card with no real Oracle-calling module anywhere in its
    resolved flow."""
    entry = card_flow.get(card['key'], {'targets': []})
    mods = set()
    for t in entry['targets']:
        if t['kind'] == 'page':
            for r in card['rivers']:
                mods.update(RIVER_MODULES.get(r, []))
        else:
            mods.add(t['module'])
            if t.get('sub_injector'):
                mods.add(t['sub_injector'][0])
    return sum(compute_module_oracle_call_count(m, core_js_path) for m in mods)


# Aug 14 — G18 of the ratified Galaxy Map plan: the exhaustive,
# MECHANICAL counterpart to Level 5's curated "core logic" (Alex's own
# words: "then do level 6 for all yes/no — detailed decision"). Real,
# honest scope: every real if/else-if/bare-else/switch branch point a
# function's own body contains, extracted by real balanced-paren
# parsing (not a bare regex up to the first `)`, which would truncate
# a real nested condition like `(a || (b && c))`) — never hand-curated,
# which is exactly what makes it tractable at 1088+ real branch points
# across 44 modules where Level 5's hand-written prose would not be.
_BRANCH_KEYWORD = re.compile(r'\b(if|switch)\s*\(|\}\s*else\s*\{')


def _extract_balanced(text, open_paren_idx):
    """Real balanced-paren slice starting at text[open_paren_idx]=='('.
    Returns the full condition text between the parens (exclusive),
    or None if the file is malformed and no match is ever found."""
    depth = 0
    for i in range(open_paren_idx, len(text)):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                return text[open_paren_idx + 1:i]
    return None


# Aug 14, later pass (Alex's own Q2 answer on the meanders/Level-1.5
# ask): "1.5 could also be used to show how externals integrate into
# dashboard too with each function." Real, confirmed call convention
# (direct grep, not guessed): `RPGACE.api('ACTION_NAME', params)` is
# THIS codebase's one real Composio-proxy call site (8 real occurrences
# total, e.g. 'GMAIL_FETCH_EMAILS', 'SUPADATA_GET_YOUTUBE_CHANNEL') —
# confirmed against its own real definition site. Oracle already has
# its own richer detector (compute_oracle_call_counts) — this covers
# the other real, mechanically-detectable external, Composio.
_COMPOSIO_CALL = re.compile(r"RPGACE\.api\(\s*['\"]([A-Z_]+)['\"]")


def compute_external_call_sites(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION list of real Composio action calls —
    {func_name: [action_name, ...]}. Reuses _function_bodies() (rule 8).
    Empty for a function with no real RPGACE.api() call — most of them,
    honestly, since only 8 real call sites exist project-wide."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        actions = _COMPOSIO_CALL.findall(b)
        if actions:
            out[f] = actions
    return out


# G31 (Aug 14, real continuation — Alex: "an external can attach to any
# level 0-6 if it has connections at level 1"). Real, second connector
# with a genuine client-side call site detectable at function grain
# (confirmed by direct grep: fetch('/api/lastfm', beatLog, rpgace_core.js
# line 13824) — extends the same real evidence-gate pattern proven for
# Composio, not a new mechanism. Real, honest scope: 9 more connectors
# have real Level-1 (EXTERNAL_RIVER_LINKS) eligibility but no detectable
# client-side rpgace_core.js call site — most real call sites live in
# api/*.js server-side files, a genuinely different scope this function
# doesn't reach; not claimed done here.
_LASTFM_CALL = re.compile(r"fetch\(\s*['\"]/api/lastfm['\"]")

# G45 (Aug 18 2026, real Part 10 evidence — Alex: "skills and supabase
# should always be shown as a injection tool... it is data pulling based
# on prompts"). Real per-FUNCTION Supabase table-touch detector, same
# regex family already proven at Current-grain
# (RPGACE.sb.select/insert/update/del/secureWrite('table' — the exact
# real idiom this whole codebase uses, confirmed by direct grep before
# committing to build it: 113 of 502 real functions, 22%, have a real
# touch, across 25 distinct tables). Reused for both G45 (the new
# Supabase table page) and G47/G49 (Current/River-grain injection
# badges) — one detector, never re-derived (rule 8).
_SUPABASE_TABLE_CALL = re.compile(
    r"RPGACE\.sb\.(select|insert|update|del|secureWrite)\(\s*'([^']+)'")


def compute_supabase_table_touches(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION list of real Supabase table touches —
    {func_name: [(op, table), ...]}. Empty for most functions (only 22%
    of all 502 real functions touch a table directly)."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        touches = _SUPABASE_TABLE_CALL.findall(b)
        if touches:
            out[f] = touches
    return out


def compute_module_supabase_touch_count(module_name, core_js_path: Path = CORE_JS):
    """Real, MODULE-granularity aggregate (G48, Aug 18 2026) — same
    real sum-of-real-function-counts pattern as
    compute_module_oracle_call_count() (rule 8), for the new Supabase
    injection-tool bubble at Level 2/Module grain. Returns
    (n_functions_touching, n_total_touches, {table_name, ...}).

    Includes the dynamic-config idiom (compute_dynamic_table_config_
    touches(), below) alongside the direct-literal one — same real
    fact, two real call shapes, merged here so this aggregate can't
    silently disagree with compute_all_supabase_table_touches()'s own
    project-wide roll-up (Aug 25 2026 fix)."""
    touches = dict(compute_supabase_table_touches(module_name, core_js_path))
    for f, ops in compute_dynamic_table_config_touches(module_name, core_js_path).items():
        touches[f] = touches.get(f, []) + ops
    tables = set()
    n_total = 0
    for ops in touches.values():
        for _op, tbl in ops:
            tables.add(tbl)
            n_total += 1
    return len(touches), n_total, tables


# Real, second Supabase-touch idiom (Aug 25 2026 — found while
# generalizing G80, Alex's own direct ask: "smoke_test_items still
# doesn't appear in the rpgace_core.js scanner... make it appear").
# _SUPABASE_TABLE_CALL above only matches a LITERAL string argument
# (RPGACE.sb.select('tablename', ...)) — structurally blind to a real,
# confirmed idiom this codebase also uses: a config array of
# { table: 'name', ... } objects, iterated via .map()/.forEach() with
# RPGACE.sb.<op>(loopVar.table, ...) inside the callback. Confirmed by
# direct grep (Aug 25) to be exactly ONE real instance right now
# (questEngine.NEEDS_INPUT_SOURCES / _scanNeedsInput, 4 real tables:
# smoke_test_items, error_log, oracle_dev_suggestions,
# system_map_flags) — built general, not name-specific, so a future
# config array of the same real shape is picked up automatically
# rather than needing its own hand-added special case each time.
_DYNAMIC_TABLE_ARRAY = re.compile(r"(\w+)\s*:\s*\[((?:[^\[\]]|\[[^\[\]]*\])*)\]", re.DOTALL)
_DYNAMIC_TABLE_ENTRY = re.compile(r"table\s*:\s*'([^']+)'")
_DYNAMIC_TABLE_MAP_CALL = re.compile(
    r"(?:self\.|this\.)?(\w+)\.(?:map|forEach)\(\s*function\s*\(\s*(\w+)\s*\)")
_DYNAMIC_TABLE_SB_CALL = re.compile(
    r"RPGACE\.sb\.(select|insert|update|del|secureWrite)\(\s*(\w+)\.table\b")


def compute_dynamic_table_config_touches(module_name, core_js_path: Path = CORE_JS):
    """Real, second real Supabase-touch idiom — see the module comment
    above. Returns {func_name: [(op, table), ...]}, the SAME shape as
    compute_supabase_table_touches(), so callers can merge the two
    without a special case (rule 8).

    Real matching discipline: the config array (e.g. NEEDS_INPUT_
    SOURCES) is a sibling property on the module object, not nested
    inside the consuming function's own body — so this scans the whole
    real module text for `{ table: 'x', ... }` arrays FIRST, then
    checks each function body separately for a real
    `ARRAY.map(function(loopVar){ ... RPGACE.sb.OP(loopVar.table` chain,
    only attributing a table when the loop variable genuinely matches
    on both sides — never a guess."""
    ranges = parse_module_ranges(core_js_path)
    if module_name not in ranges:
        return {}
    start, end = ranges[module_name]
    lines = _cached_core_js_lines(core_js_path)
    module_text = '\n'.join(lines[start - 1:end])

    arrays = {}
    for m in _DYNAMIC_TABLE_ARRAY.finditer(module_text):
        name, body = m.group(1), m.group(2)
        tables = _DYNAMIC_TABLE_ENTRY.findall(body)
        if tables:
            arrays[name] = tables

    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        map_m = _DYNAMIC_TABLE_MAP_CALL.search(b)
        sb_m = _DYNAMIC_TABLE_SB_CALL.search(b)
        if not (map_m and sb_m):
            continue
        array_ref, loop_var = map_m.group(1), map_m.group(2)
        op, sb_var = sb_m.group(1), sb_m.group(2)
        if loop_var != sb_var or array_ref not in arrays:
            continue
        out[f] = [(op, tbl) for tbl in arrays[array_ref]]
    return out


def compute_all_supabase_table_touches(core_js_path: Path = CORE_JS):
    """Real, project-wide roll-up — {table_name: [(module, func, op), ...]}
    — every real function that touches each table, module-grouped
    upstream at parse_module_ranges() (rule 8, not re-parsed). Powers
    the real G45 Supabase page (which Level/River/Module touches which
    table) and River-grain injection aggregation (G49).

    Merges BOTH real touch idioms (direct-literal + dynamic-config,
    Aug 25 2026) — one project-wide fact, not two separately-consumed
    partial pictures."""
    ranges = parse_module_ranges(core_js_path)
    by_table = {}
    for m in ranges:
        touches = compute_supabase_table_touches(m, core_js_path)
        dyn = compute_dynamic_table_config_touches(m, core_js_path)
        for f, ops in touches.items():
            for op, tbl in ops:
                by_table.setdefault(tbl, []).append((m, f, op))
        for f, ops in dyn.items():
            for op, tbl in ops:
                by_table.setdefault(tbl, []).append((m, f, op))
    return by_table


# G82 (Aug 25 2026) — the real, GENERIC outbound-call-site pattern.
# _COMPOSIO_CALL above only sees `RPGACE.api('ACTION')` and
# _LASTFM_CALL only sees one hardcoded endpoint; neither can answer the
# real question "which function in this river actually makes the call
# that routes out through River XII (api/*.js)". Both real client-side
# shapes are covered here: a literal `fetch('/api/<name>'` and a
# `RPGACE.api(` Composio dispatch (which itself lands in
# api/composio.js). Same honest scope limit as every detector in this
# file — a call built dynamically or reached through a stored reference
# is invisible to it.
_OUTBOUND_API_FETCH = re.compile(r"fetch\(\s*['\"](/api/[A-Za-z0-9_-]+)['\"]")
_OUTBOUND_API_DISPATCH = re.compile(r"RPGACE\.api\(")


def compute_outbound_api_call_sites(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION list of outbound `api/*.js` call sites —
    {func_name: [endpoint_label, ...]}. Reuses _function_bodies()
    (rule 8). Empty for a function that never calls out; most of them,
    honestly — only 14 real call-site functions exist across all 45
    real modules (measured, Aug 25 2026)."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        eps = list(dict.fromkeys(_OUTBOUND_API_FETCH.findall(b)))
        if _OUTBOUND_API_DISPATCH.search(b):
            eps.append('/api/composio (RPGACE.api)')
        if eps:
            out[f] = eps
    return out


def compute_lastfm_call_sites(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION flag for a real fetch('/api/lastfm') call site.
    {func_name: True} — same shape discipline as compute_external_call_sites,
    reused not re-derived (rule 8)."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        if _LASTFM_CALL.search(b):
            out[f] = True
    return out


# G99 (Aug 25 2026) — real, project-wide per-CONNECTOR function-level
# evidence for the 3 of 6 remaining real connectors (Composio/Jina AI/
# Last.fm) that genuinely have a real client-side rpgace_core.js call
# site, built to give each its own real Infra bubble system the same
# honest way Oracle/Supabase already have one. Reuses
# compute_outbound_api_call_sites()/compute_lastfm_call_sites() —
# never a new regex, never re-derived (rule 8). The other 3
# (librosa/Whisper (OpenAI, local)/n8n) are deliberately NOT in this
# map — direct evidence (this same function, run for real) confirms
# zero real client-side rpgace_core.js call site exists for any of
# them; their own real trigger genuinely lives outside the client
# entirely (a local Python script, a cron workflow) — an honest finding
# stated plainly on their own page rather than a fabricated drilldown.
_CONNECTOR_OUTBOUND_LABELS = {
    'Composio': ('/api/composio (RPGACE.api)',),
    'Jina AI': ('/api/scout', '/api/bookworm-fetch'),
}


def compute_all_connector_call_counts(core_js_path: Path = CORE_JS):
    """Real, project-wide roll-up — {connector_name: [(module, func,
    detail), ...]} — for the 3 real connectors with a genuine detectable
    client-side call site. Sorted at use site (R5)."""
    label_to_connector = {}
    for conn, labels in _CONNECTOR_OUTBOUND_LABELS.items():
        for lab in labels:
            label_to_connector[lab] = conn
    ranges = parse_module_ranges(core_js_path)
    out = {}
    for m in ranges:
        eps = compute_outbound_api_call_sites(m, core_js_path)
        for f, labels in eps.items():
            for lab in labels:
                conn = label_to_connector.get(lab)
                if conn:
                    out.setdefault(conn, []).append((m, f, lab))
        for f in compute_lastfm_call_sites(m, core_js_path):
            out.setdefault('Last.fm', []).append((m, f, "fetch('/api/lastfm')"))
    return out


# G39, "Load Dimension" (Aug 15 2026, real Alex ask: "we should also make
# a load dimension (what ui, backend or alex trigger certain backend and
# ui to load, in what steps etc) this could help tie everything together
# for diagnosing"). Real /interrogation resolved the shape: 3 real,
# separately-tracked categories (not merged), serving both diagnostic-
# correctness AND performance-visibility equally. Real, confirmed
# mechanism first (not guessed): RPGACE.registerBootTask(fn) at
# rpgace_core.js:194 runs fn() SYNCHRONOUSLY the moment it's called and
# queues its return value into R._bootTasks, which a single
# Promise.all(...).then(_hideBootOnce) gates the real boot-loader hide
# on (a real 20s hard ceiling) — so real SOURCE order of registerBootTask
# calls genuinely IS real fire order, a legitimate diagnostic proxy, not
# an assumption.
_BOOT_TASK_CALL = re.compile(r'registerBootTask\(')
_PAGE_SHOW_HOOK = re.compile(
    r"hooks\.on\(\s*['\"]page:show['\"]\s*,\s*function\s*\(\s*(\w+)\s*\)\s*\{([\s\S]{0,400}?)\n\s*\}\s*\)"
)
_PAGE_CONST_REF = re.compile(r'RPGACE\.CONFIG\.pages\.(\w+)|===\s*[\'"](\w+)[\'"]')


def compute_boot_task_registrations(core_js_path: Path = CORE_JS):
    """Real, GLOBAL sequence of every registerBootTask(...) call in the
    file, in real source order (== real fire order, per the module
    header above). Returns a list of {module, line, seq} dicts, seq
    being the real 1-based position among all real registrations
    project-wide. Module resolved via parse_module_ranges() (rule 8)."""
    ranges = parse_module_ranges(core_js_path)
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
    out = []
    seq = 0
    for i, line in enumerate(lines, start=1):
        if _BOOT_TASK_CALL.search(line):
            mod = next((m for m, (s, e) in ranges.items() if s <= i <= e), None)
            if mod is None:
                continue  # a real registration outside any module marker (main.js-side); not this detector's scope
            seq += 1
            out.append({'module': mod, 'line': i, 'seq': seq})
    return out


def compute_page_nav_triggers(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION list of page:show hook registrations and the
    real page constant(s) each one gates on — {func_name: [page_name,...]}.
    Reuses _function_bodies() (rule 8). A function with no real page:show
    registration is simply absent from the returned dict."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        pages = []
        for m in _PAGE_SHOW_HOOK.finditer(b):
            inner = m.group(2)
            for pm in _PAGE_CONST_REF.finditer(inner):
                name = pm.group(1) or pm.group(2)
                if name and name not in pages:
                    pages.append(name)
        if pages:
            out[f] = pages
    return out


# Real, confirmed on-demand/click idiom (Aug 15, sourced from THIS SAME
# session's own A5/Bookworm work): dashDeck's own _open*() functions
# check for an existing DOM node, and — if missing — call a target
# module's real inject function directly before showing a popup. Real,
# already-proven examples: _openGaps->knowledgeGap._inject,
# _openCorpus->refCorpus._inject, _openBookworm->bookworm._injectDashboardWidget
# + bookworm._injectBibliographySection, _openPipeline->
# contentProductionLive._injectDashboardWidget + beatLog._inject +
# conidPot._injectIdeaBank, _openMorningBrief->morningBrief._injectButton.
_CLICK_LOAD_PATTERN = re.compile(
    r'RPGACE\.modules\.(\w+)[\s\S]{0,150}?\.(_inject\w*)\s*\(\s*\)'
)


def compute_click_load_triggers(module_name='dashDeck', core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION list of (target_module, inject_fn) pairs a
    dashDeck open-function calls on demand — {func_name: [(module, fn),...]}.
    Defaults to dashDeck since that's the one real, confirmed source of
    this idiom project-wide; kept as a real param (not hardcoded) in
    case a future module adopts the same pattern."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        if not f.startswith('_open'):
            continue
        pairs = []
        for m in _CLICK_LOAD_PATTERN.finditer(b):
            pair = (m.group(1), m.group(2))
            if pair not in pairs:
                pairs.append(pair)
        if pairs:
            out[f] = pairs
    return out


# ---------------------------------------------------------------------
# G87 (Aug 26 2026) — 3 more real, evidence-gated Current(L3) bubble
# types (Decision/Load/Logic), all 3 built from data this file already
# computes elsewhere for a DIFFERENT real page (Decision Matrix, Load
# Dimension, Logic Dimension) — zero new detection code, per this
# item's own /debate-confirmed evidence. Every helper below just
# resolves the SAME already-real fact down to Current(L3)'s own
# function grain.

def compute_boot_task_by_function(core_js_path: Path = CORE_JS):
    """Real, per-(module,function) resolution of compute_boot_task_
    registrations()'s own global module+line list — that detector can't
    say WHICH function registered a boot task on its own, only which
    module and which raw line. Resolves each real registration to its
    enclosing function via that module's own real _function_line_spans()
    — a registration outside every known function span (bare module-
    scope code) is honestly dropped, never force-attributed to the
    nearest function. Returns {module: {func: True}}."""
    regs = compute_boot_task_registrations(core_js_path)
    out = {}
    spans_cache = {}
    for reg in regs:
        mod = reg['module']
        if mod not in spans_cache:
            spans_cache[mod] = _function_line_spans(mod, core_js_path)
        for fname, (a, b) in spans_cache[mod].items():
            if a <= reg['line'] <= b:
                out.setdefault(mod, {})[fname] = True
                break
    return out


def compute_load_signal(module_name, core_js_path: Path = CORE_JS):
    """Real, per-function union of all 3 Load Dimension signals for ONE
    module — G87's Current(L3) "Load" bubble: a function has a real
    Load signal if it registers a boot task, a page:show nav trigger, or
    (dashDeck only, the one real confirmed source of this idiom) a
    click-load trigger. Returns {func: [reason, ...]}, never a bare
    boolean — the real reason is what a hover/tooltip actually shows."""
    out = {}
    boot = compute_boot_task_by_function(core_js_path).get(module_name, {})
    for f in boot:
        out.setdefault(f, []).append('registers a boot task')
    for f, pages in compute_page_nav_triggers(module_name, core_js_path).items():
        out.setdefault(f, []).append(f'page:show trigger ({"/".join(pages)})')
    if module_name == 'dashDeck':
        for f, pairs in compute_click_load_triggers(module_name, core_js_path).items():
            targets = ', '.join(f'{m}.{fn}()' for m, fn in pairs)
            out.setdefault(f, []).append(f'click-load ({targets})')
    return out


def compute_decision_targets():
    """Real, per-(module,function) roll-up of every real Decision Matrix
    entry (G72's build_unified() — gate/logic/text-input points alike) —
    G87's Current(L3) "Decision" bubble. Lazy import: galaxy_map_
    decision_matrix.py itself imports FROM this file, so a module-level
    import here would be circular; a function-local import resolves
    fine since both modules are always fully loaded by the time this is
    actually called. A decision point with no real per-function `func`
    (some gate points are module-scope, not one specific function) is
    honestly skipped, never force-attributed."""
    from galaxy_map_decision_matrix import build_unified
    out = {}
    for d in build_unified():
        mod, func = d.get('module'), d.get('func')
        if mod and func:
            out.setdefault(mod, {}).setdefault(func, []).append(d['title'])
    return out


def compute_logic_attribution_targets(cross_calls=None, core_js_path: Path = CORE_JS):
    """Real, global {module: {func: [connection_label, ...]}} of every
    function attribute_river_connection_function() has resolved a real
    RIVER_FLOWS connection onto — G87's Current(L3) "Logic" bubble.
    Reuses the EXACT SAME RIVER_FLOWS iteration galaxy_map_logic_
    dimension.py's own G82 coverage count already performs (rule 8) —
    never a second independent walk of the same data. Pass a pre-
    computed `cross_calls` (compute_cross_module_function_calls()) when
    the caller already has one cached, to avoid a second real regex
    sweep of the whole file."""
    if cross_calls is None:
        cross_calls = compute_cross_module_function_calls(core_js_path)
    out = {}
    for src, targets in RIVER_FLOWS.items():
        for label, note, itype in targets:
            tgt = _river_num_from_label(label)
            if not tgt:
                continue
            attr = attribute_river_connection_function(
                src, tgt, note, core_js_path, cross_calls=cross_calls, itype=itype)
            if not attr:
                continue
            _from_mod, to_mod, to_func, reason = attr
            if to_mod == 'main.js' or not to_func:
                continue  # no real Current(L3) page for main.js
            out.setdefault(to_mod, {}).setdefault(to_func, []).append(
                f'River {src}→{tgt}: {reason}')
    return out


def compute_river_flow_cycles():
    """Real strongly-connected-component detection over RIVER_FLOWS
    (Aug 14, G24 — Alex's own /misunderstanding: "back into reoccuring
    rivers to form loops (there are so many loops)"). Real, confirmed
    finding, not assumed: these cycles exist. Tarjan's algorithm (not a
    naive DFS-back-edge scan, which was tried first and produced 4
    overlapping/redundant "cycles" for what is really ONE real 7-river
    mutually-reachable group — discarded per rule 4, not shipped) gives
    the real, CANONICAL grouping: each strongly-connected component is
    exactly the set of rivers that can all reach each other, no more,
    no less, no overlap between groups.

    Real, deterministic (sorted() adjacency iteration — same tie-break
    discipline as every other detector in this file; re-run twice to
    confirm identical output before shipping). Returns a list of
    sorted river-number lists, each a real cycle group (size 1 —
    genuinely acyclic — silently excluded, only real cycles returned)."""
    adj = {}
    nodes = set()
    for src, targets in RIVER_FLOWS.items():
        nodes.add(src)
        for t in targets:
            dst = _river_num_from_label(t[0])
            if dst is not None:
                adj.setdefault(src, []).append(dst)
                nodes.add(dst)

    index_counter = [0]
    stack, lowlink, index, on_stack, sccs = [], {}, {}, {}, []

    def strongconnect(v):
        index[v] = lowlink[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack[v] = True
        for w in sorted(adj.get(v, [])):
            if w not in index:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif on_stack.get(w):
                lowlink[v] = min(lowlink[v], index[w])
        if lowlink[v] == index[v]:
            comp = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                comp.append(w)
                if w == v:
                    break
            sccs.append(sorted(comp))

    for n in sorted(nodes):
        if n not in index:
            strongconnect(n)
    return [c for c in sccs if len(c) > 1]


def describe_river_cycle(members):
    """Real, evidence-grounded explanation for one real cycle group
    (compute_river_flow_cycles()) — the real interaction-TYPE evidence
    that tells 'a genuine hub, many independent real actions converging
    on a shared resource' apart from 'a real two-way round trip with
    one external system' (Aug 14, checked against live data — these are
    NOT the same shape, confirmed by direct inspection: the 2-river
    River XI<->XII cycle is 100% dispatch_trigger both directions — a
    real send/receive round trip, not a hub; the 7-river group carries
    4 distinct real types). Never a blanket 'it's a hub' assertion —
    the real type set decides which story is told."""
    members_set = set(members)
    types = set()
    for r in members:
        for t in RIVER_FLOWS.get(r, []):
            if _river_num_from_label(t[0]) in members_set:
                types.add(t[2])
    if len(types) <= 1:
        kind = 'round_trip'
        reason = ("a real two-way round trip — one real interaction type (%s) in both directions, "
                   "not a hub: something real goes out, a real result comes back through the same "
                   "channel." % (next(iter(types)) if types else 'unlabeled'))
    else:
        kind = 'hub'
        type_labels = ', '.join(sorted(INTERACTION_TYPE_LABEL.get(t, t) for t in types))
        reason = ("a real hub — %d genuinely different real interaction types (%s) all pass through "
                   "this shared group, which is why the aggregate graph shows a cycle: it's several "
                   "independent real actions converging on (and radiating from) one shared resource, "
                   "never one action automatically triggering the next in a runtime loop." % (len(types), type_labels))
    return {'kind': kind, 'types': sorted(types), 'reason': reason}


def rivers_needing_meanders():
    """Real, mechanical rule (Alex's own confirmed answer, Aug 14): a
    river gets a Level-1.5 meanders page only where it can actually be
    split by something real — 2+ real dashboard cards (CARDS_BY_RIVER).
    A river with 0-1 cards has nothing real to split by, even if it has
    many modules (e.g. River III: 12 modules, but all 12 feed the same
    single 'oracle' card — no real meander boundary exists there).
    Checked against live data (Aug 14): exactly River V qualifies."""
    return [r for r, cards in CARDS_BY_RIVER.items() if len(cards) >= 2]


def compute_function_branches(module_name, core_js_path: Path = CORE_JS):
    """Real, per-FUNCTION list of every real conditional branch point —
    {func_name: [{'kind': 'if'|'else if'|'else'|'switch', 'condition': str|None}, ...]}.
    Reuses _function_bodies() (rule 8). A bare `else` (no condition —
    the real "no" side of the preceding if) still counts as a real
    branch point, condition recorded as None rather than invented."""
    bodies = _function_bodies(module_name, core_js_path)
    out = {}
    for f, b in bodies.items():
        branches = []
        for m in _BRANCH_KEYWORD.finditer(b):
            if m.group(0).strip() == '} else {':
                # Distinguish a real "else if" (immediately followed by
                # another if() on the same real branch) from a bare
                # terminal else — both are real, but they read
                # differently to a human scanning this list.
                tail = b[m.end():m.end() + 40].lstrip()
                if tail.startswith('if') or tail.startswith('if('):
                    continue  # the following `if (` match below covers this branch's real condition
                branches.append({'kind': 'else', 'condition': None})
                continue
            kind = 'switch' if m.group(0).strip().startswith('switch') else (
                'else if' if b[:m.start()].rstrip().endswith('else') else 'if')
            paren_idx = b.index('(', m.start())
            cond = _extract_balanced(b, paren_idx)
            if cond is not None:
                cond = ' '.join(cond.split())
                if len(cond) > 140:
                    cond = cond[:137] + '...'
            branches.append({'kind': kind, 'condition': cond})
        if branches:
            out[f] = branches
    return out


# Aug 14 — G15's real data source (Level 4: "click a dashboard card, see
# the real frontend flow"). Alex's own confirmed scope: what actually
# happens on click (which page/popup opens, real DOM evidence, buttons
# pressed, where it leads), with real links back to Level 3. Reads
# dashDeck.MODULES' own real `go:` trigger directly — DASHBOARD_CARDS'
# `via` field above is a real, independently-useful hand-written label,
# not this function's source of truth.
def parse_dashboard_card_go(core_js_path: Path = CORE_JS):
    """Real, mechanical per-card `go:` body extraction from
    rpgace_core.js's own dashDeck.MODULES array — same "capture until
    the next similarly-shaped marker" technique as _function_bodies()/
    _mainjs_function_bodies() (rule 8), splitting at each real
    `key: '<x>'` boundary. Returns {key: go_body_text} for all 12 real
    cards. Real, honest scope limit: a raw substring capture, not a
    real JS parser — confirmed by direct read this doesn't mis-close on
    any of the 12 current cards (no `}` sits inside a string literal in
    any of their real go: bodies)."""
    text = core_js_path.read_text(encoding='utf-8')
    m = re.search(r'MODULES:\s*\[(.*?)\n  \],\n', text, re.S)
    if not m:
        return {}
    block = m.group(1)
    positions = [(mm.start(), mm.group(1)) for mm in re.finditer(r"key:\s*'(\w+)'", block)]
    result = {}
    for i, (start, key) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(block)
        result[key] = block[start:end]
    return result


def resolve_dashboard_card_target(go_body):
    """Real classification of a card's own go: body into what it
    genuinely opens — a real popup/panel call or a real page navigation
    (`showPage(RPGACE.CONFIG.pages.X)`). Popup-call detection reuses
    compute_module_calls_with_aliases() (rule 8, not a raw regex here
    and the alias-aware one elsewhere) — real evidence found this
    matters: taxonomy's own go: body reads `var rq =
    RPGACE.modules.taxonomyReviewQueue; ... rq._openCard();`, a real
    aliased call a literal `RPGACE.modules.X.Y(` regex alone would have
    silently missed entirely. Returns [(kind, a, b), ...] since a
    card's go: can genuinely branch (taxonomy: a real conditional
    between a popup call and a page navigation — both real, both kept,
    never arbitrarily picking one), excluding dashDeck._popup()/
    _pendingReviewCount-shaped false positives isn't needed here since
    _popup itself is never called directly inside a top-level go: body
    (confirmed by direct read of all 12)."""
    targets = [('popup', mod, fn) for mod, fn in compute_module_calls_with_aliases(go_body)]
    for page in re.findall(r'showPage\(\s*RPGACE\.CONFIG\.pages\.(\w+)\s*\)', go_body):
        targets.append(('page', page, None))
    return targets


def _resolve_module_aliases(body):
    """Real, mechanical alias resolution — this codebase's own
    established real style (`var self = this`, `var rt =
    RPGACE.modules.researchTabs`, `var bw = RPGACE.modules.bookworm`,
    all real, confirmed examples) assigns a local alias to
    `RPGACE.modules.<name>` before calling `alias.method(...)`, which a
    literal `RPGACE.modules.<name>.<method>(` regex alone misses.
    Returns {alias: module_name}."""
    return dict(re.findall(r'var\s+(\w+)\s*=\s*RPGACE\.modules\.(\w+)\s*;', body))


def compute_module_calls_with_aliases(body):
    """Real cross-module call extraction that also resolves the real
    local-alias pattern above — the SAME literal `RPGACE.modules.X.Y(`
    signal compute_intra_river_flow()/compute_cross_module_function_calls()
    already use (rule 8, not a second detection method), extended to
    also catch the aliased form. Returns [(module, func), ...], real
    source order, duplicates kept (a real call count, not a set)."""
    calls = list(re.findall(r'RPGACE\.modules\.(\w+)\.(\w+)\s*\(', body))
    for alias, mod in _resolve_module_aliases(body).items():
        for fn in re.findall(r'\b' + re.escape(alias) + r'\.(\w+)\s*\(', body):
            calls.append((mod, fn))
    return calls


def compute_dashboard_card_flow(core_js_path: Path = CORE_JS):
    """Real, evidence-based per-dashboard-card frontend flow — Aug 14,
    G15's actual data source. For each of DASHBOARD_CARDS' 12 real
    cards, resolves the ACTUAL `go:` trigger one real hop deep: for a
    popup target, real evidence found by direct read of 5 of these
    functions (_openBookworm/_openMorningBrief/_openGaps/_openPipeline,
    plus _openResearch's own different real shape) shows the SAME
    established pattern — dashDeck's own `_openX()` calls a real target
    module's own `_inject*` function BEFORE opening the popup (e.g.
    `bookworm._injectDashboardWidget()`), which is genuinely the real
    destination module, not dashDeck itself. Surfaced here as
    `sub_injector` via compute_module_calls_with_aliases() (rule 8),
    never hardcoded per card. Also surfaces every other real
    cross-module call inside that popup's own body (sub_calls) and
    whether the popup body itself carries real UI_OUTPUT/UI_INPUT
    evidence. For a page-navigation target, the real candidate modules
    come from CARDS_BY_RIVER's own already-sourced `rivers` list — page
    ownership is honestly multi-module here (e.g. the Oracle page has
    no single owning module, confirmed by direct read elsewhere in this
    file), never forced into one guessed winner.

    Returns {card_key: {'go_body': str, 'targets': [...]}}."""
    go_map = parse_dashboard_card_go(core_js_path)
    result = {}
    for card in DASHBOARD_CARDS:
        key = card['key']
        go_body = go_map.get(key, '')
        raw_targets = resolve_dashboard_card_target(go_body)
        entry = {'go_body': go_body.strip(), 'targets': []}
        for kind, a, b in raw_targets:
            if kind == 'page':
                entry['targets'].append({'kind': 'page', 'page': a})
                continue
            mod, fn = a, b
            body = _function_bodies(mod, core_js_path).get(fn, '')
            sub_calls = compute_module_calls_with_aliases(body)
            sub_injector = next(((m, f) for m, f in sub_calls if f.startswith('_inject')), None)
            entry['targets'].append({
                'kind': 'popup', 'module': mod, 'func': fn,
                'sub_injector': sub_injector, 'sub_calls': sub_calls,
                'output': bool(UI_OUTPUT_PATTERN.search(body)),
                'input': bool(UI_INPUT_PATTERN.search(body)),
            })
        result[key] = entry
    return result


WRAP_TARGETS = ('callOracle', 'sendChat')


_WRAP_INSTALLER_CACHE = {}


def find_wrap_installer_function(module_name, core_js_path: Path = CORE_JS):
    """Real, per-module wrap-installer lookup — Aug 13, built for the
    "next function at Level 3" river-boundary indicator. Returns the
    real function name that does `window.callOracle = function`/
    `window.sendChat = function` inside this module (the same real
    pattern compute_intra_river_flow()'s own 'wrap' signal already
    detects at module grain, rule 8 — same WRAP_TARGETS, now resolved
    to a specific FUNCTION rather than just membership). None if this
    module doesn't install a wrap.

    Real, module-level memoized (rule 11 — only 44 real modules, result
    never changes within one script run; found necessary the same pass
    attribute_river_connection_function() needed its own efficiency
    fix, same root cause: a bare-file re-read/re-parse per call adds up
    fast across dozens of connections/modules)."""
    key = (module_name, str(core_js_path))
    if key in _WRAP_INSTALLER_CACHE:
        return _WRAP_INSTALLER_CACHE[key]
    result = None
    for fname, body in _function_bodies(module_name, core_js_path).items():
        for target in WRAP_TARGETS:
            if re.search(r'window\.' + target + r'\s*=\s*function', body):
                result = fname
                break
        if result:
            break
    _WRAP_INSTALLER_CACHE[key] = result
    return result


_WRAP_NOTE_KEYWORDS = ('prefix', 'message', 'chat', 'divert', 'trigger')

# G82 (Aug 25 2026) — support data for signals 4 and 5 below.
_ATTR_NORM_CACHE = {}


def _attr_norm(s):
    """Lowercase, alphanumerics only — lets a RIVER_FLOWS note's own
    prose ("contentRepurpose's real Composio calls", "morningBrief's
    real Composio Gmail-fetch call") be matched against a real module
    name without either side being re-typed. Same helper shape as
    galaxy_map.py's `_mig_norm` / galaxy_map_externals.py's `_norm`."""
    if s not in _ATTR_NORM_CACHE:
        _ATTR_NORM_CACHE[s] = ''.join(ch for ch in (s or '').lower() if ch.isalnum())
    return _ATTR_NORM_CACHE[s]


def _endpoint_token(endpoint_label):
    """'/api/composio (RPGACE.api)' -> 'composio'; '/api/lastfm' ->
    'lastfm'. The real, comparable name of the endpoint a call site
    actually hits, for matching against a connection's own note."""
    return (endpoint_label or '').split(' ')[0].rstrip('/').rsplit('/', 1)[-1].lower()


def _camel_tokens(name):
    """['get', 'gmail'] from '_getGmail' — real camelCase split, used
    ONLY to disambiguate between two real call-site functions inside
    the same already-note-named module. Tokens shorter than 4 chars are
    dropped: they are too generic to be real evidence ('get', 'you'),
    and a wrong pick here would be exactly the over-attribution class
    signal 2's own gating exists to prevent."""
    parts = re.findall(r'[A-Za-z][a-z0-9]*', name or '')
    return [p.lower() for p in parts if len(p) >= 4]


# Real, snake_case table token inside an EXTERNAL_CONNECTORS `via`
# string (e.g. 'openmontage_jobs Supabase queue' -> 'openmontage_jobs').
# Requires an underscore, so a bare word in prose can never be mistaken
# for a table name.
_VIA_TABLE_TOKEN = re.compile(r'\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b')


def attribute_river_connection_function(from_river, to_river, note='', core_js_path: Path = CORE_JS, cross_calls=None, itype=None):
    """Real, evidence-gated attribution of WHICH function a river-to-
    river connection actually lands on — Aug 13, Alex's own direct ask
    ("both ends of river have the next function chaining off it...
    river 3 travels into bookworm where the cog function exists").
    Real evidence check first (rule 4): compute_cross_module_function_
    calls() found ZERO direct calls from any real River III module into
    bookworm — the actual mechanism, per RIVER_FLOWS' own note text
    ("special prefix diverts the message"), is bookworm's own
    TRIGGER_PREFIXES / window.sendChat wrap (find_wrap_installer_
    function() resolves this to the real `_patchChatTrigger`).

    Three real, ordered signals — never a guess:
      1. A real compute_cross_module_function_calls() edge whose source
         module's river is `from_river` and target module's river is
         `to_river` — the strongest evidence (a literal traced call).
      2. Any module in `to_river` with a real wrap-installer function
         (find_wrap_installer_function()) — the real mechanism behind
         a "special prefix diverts the message"-shaped RIVER_FLOWS
         note. Real over-attribution bug caught testing this (rule 4):
         signal 2 applied blindly returned `_patchChatTrigger` for
         River II's own "Bookworm page selected" connection too — a
         real navigation click, not a chat-prefix divert, so that
         attribution would have been WRONG, not just imprecise. Gated
         on `note` actually naming a message/prefix-shaped mechanism
         (_WRAP_NOTE_KEYWORDS) before signal 2 fires at all — an empty
         or unrelated note correctly returns no attribution rather
         than reusing whatever wrap function happens to exist.
      3. (Aug 14, G23b, real /misunderstanding follow-up — 6 of the 20
         real unattributed gaps were `nav_route` type.) When `itype`
         is passed as `'nav_route'` and signals 1-2 both find nothing,
         attribute to main.js's own real `showPage()` — CORE_WRAPPER_
         HOOKS confirms it's the one real, generic function every page
         switch in the whole app goes through (bridges to the real
         `'page:show'` hook). Real, honestly generic: every nav_route
         gap gets the SAME answer, because there genuinely is only one
         real mediating function for "the user clicked a nav link" —
         checked (compute_hook_signal_edges()) to confirm no MORE
         specific per-connection evidence exists before falling back
         to this. `to_mod` returns as the literal string `'main.js'`
         (not a RPGACE.register module — correctly renders with no
         Level-3 link, since main.js has no Level-3 page).
      4. (Aug 25, G82.) `to_river` genuinely has NO modules of its own
         (River XII, the api/*.js layer, is the real case) — so signals
         1-2 are structurally incapable of ever firing for it. Real
         evidence lives on the SOURCE side instead: the function in
         `from_river` that actually makes the outbound call
         (compute_outbound_api_call_sites()). Gated on the note NAMING
         the module, for the same rule-4 reason signal 2 is gated; see
         the inline comment for the real over-attribution this prevents
         (River III's dormant Kimi/Luna note would otherwise have
         wrongly grabbed `scheduleOracle._ingest`).
      5. (Aug 25, G82.) The mirror image — `from_river` has no modules,
         `to_river` does, and the note names a real EXTERNAL_CONNECTORS
         entry whose own `via` names a real Supabase reservoir table
         (`openmontage_jobs`, `graphify_jobs`). Attributes to the one
         real function in `to_river` that SELECTs that table — the
         genuine landing point, since these reservoirs are polled, not
         pushed. Only fires when exactly one real reader exists.
    Signals 4 and 5 are deliberately ordered BEFORE signal 3: signal 3
    is a generic same-answer-for-everything fallback, so a more
    specific real attribution must get first refusal. Verified this
    changes nothing for the connections signal 3 already resolved (no
    nav_route connection targets a module-less river).

    Returns (from_module_or_None, to_module, to_func, real_reason) or
    None if no signal finds anything — an honest gap, never fabricated
    to fill the space.

    `cross_calls`: pass a pre-computed compute_cross_module_function_
    calls() list when checking many connections in a loop (a real,
    necessary efficiency fix found testing this against all 16 rivers —
    the bare function does a full rpgace_core.js re-parse per call, and
    recomputing it once per connection made a full sweep time out)."""
    to_mods = RIVER_MODULES.get(to_river, [])
    from_mods = RIVER_MODULES.get(from_river, [])
    if cross_calls is None:
        cross_calls = compute_cross_module_function_calls(core_js_path)
    for from_mod, from_func, to_mod, to_func in cross_calls:
        if from_mod in from_mods and to_mod in to_mods:
            return (from_mod, to_mod, to_func, 'a real, traced direct function call')
    note_lower = (note or '').lower()
    if any(kw in note_lower for kw in _WRAP_NOTE_KEYWORDS):
        for to_mod in to_mods:
            wrap_fn = find_wrap_installer_function(to_mod, core_js_path)
            if wrap_fn:
                return (None, to_mod, wrap_fn, 'a real callOracle/sendChat wrap installer')

    # Signal 4 — the real OUTBOUND call site, for a connection whose
    # target river genuinely has no modules of its own. River XII (the
    # api/*.js layer) is the real case: it is deliberately module-less
    # by design, so signals 1-2 can NEVER fire for anything pointing at
    # it — every `-> River XII` connection was structurally guaranteed
    # to show "❓ no known function" no matter how much real evidence
    # existed. The real evidence that does exist is on the SOURCE side:
    # which function in `from_river` actually makes the call that
    # routes out through there (compute_outbound_api_call_sites()).
    #
    # Gated exactly as hard as signal 2, for the same rule-4 reason: the
    # note must NAME the module. Fired ungated, this would have wrongly
    # attributed River III -> River XII (a dormant Kimi/Luna PROVIDER
    # call, per its own note) to `scheduleOracle._ingest`'s unrelated
    # /api/analyst call, purely because that happens to be River III's
    # only outbound call site — a real, checked over-attribution, not a
    # hypothetical one. Where a named module has two real call-site
    # functions, a camelCase token from the function name must also
    # appear in the note (this is what picks `_getGmail` over
    # `_getYouTube` for River V's own "Gmail-fetch" note); if that still
    # leaves it ambiguous, no attribution is made rather than an
    # arbitrary pick.
    #
    # `to_mod` here is the module HOSTING the attributed function, which
    # is what every consumer actually uses it for (the Level-3 link and
    # the label) — the same latitude signal 3 already takes when it
    # returns 'main.js'.
    if not to_mods and note_lower:
        note_norm = _attr_norm(note)
        named = []
        for m in from_mods:
            if _attr_norm(m) in note_norm:
                sites = compute_outbound_api_call_sites(m, core_js_path)
                for fn, eps in sites.items():
                    named.append((m, fn, eps))
        if len(named) > 1:
            # Real refinement tier 1 — the ENDPOINT the call actually
            # hits, when the note names it. This is what separates
            # River XI's own two real call sites: its note names
            # "contentRepurpose's real Composio calls", and only
            # contentRepurpose's site is a Composio dispatch (beatLog's
            # is /api/lastfm, which the note never mentions).
            refined = [t for t in named
                       if any(_endpoint_token(ep) in note_lower for ep in t[2])]
            if refined:
                named = refined
        if len(named) > 1:
            # Real refinement tier 2 — a camelCase token of the function
            # name itself, for two real sites inside the SAME named
            # module hitting the SAME endpoint (River V's own
            # `_getGmail` vs `_getYouTube`, both /api/composio, with a
            # note that says "Gmail-fetch").
            refined = [t for t in named if any(tok in note_lower for tok in _camel_tokens(t[1]))]
            if refined:
                named = refined
        if len(named) == 1:
            m, fn, eps = named[0]
            return (None, m, fn,
                    f'a real outbound call site ({", ".join(eps)}) in this river, named in the connection\'s own note')

    # Signal 5 — the real RESERVOIR READER, the mirror image of signal
    # 4: a connection FROM a module-less infrastructure river INTO a
    # river that does have modules. The real mechanism for these is an
    # external connector's own Supabase queue (openmontage_jobs,
    # graphify_jobs — both named literally in EXTERNAL_CONNECTORS' own
    # `via` field), which is polled, not pushed, so the real landing
    # function is whichever function in `to_river` actually SELECTs that
    # table. Gated on the note naming the connector, and on exactly one
    # real reader existing — River XII -> River XIV ("Graphify CC
    # deposits real findings here via graphify_jobs") correctly stays
    # unattributed under this signal, because River XIV has no modules
    # and therefore no real reader to name.
    if not from_mods and to_mods and note_lower:
        note_norm = _attr_norm(note)
        readers = []
        for conn in EXTERNAL_CONNECTORS:
            if _attr_norm(conn['name']) not in note_norm:
                continue
            for tbl in _VIA_TABLE_TOKEN.findall(conn.get('via') or ''):
                for m in to_mods:
                    for fn, ops in compute_supabase_table_touches(m, core_js_path).items():
                        if any(op == 'select' and t == tbl for op, t in ops):
                            readers.append((m, fn, tbl, conn['name']))
        readers = sorted(set(readers))
        if len(readers) == 1:
            m, fn, tbl, cname = readers[0]
            return (None, m, fn,
                    f"the real function that reads {cname}'s own `{tbl}` reservoir (polled, not pushed)")

    if itype == 'nav_route':
        return (None, 'main.js', 'showPage', "the real, generic page-switch function every nav_route connection goes through (bridges to the real 'page:show' hook)")
    return None


def compute_cross_module_function_calls(core_js_path: Path = CORE_JS):
    """Real, mechanical FUNCTION-level cross-MODULE call detection —
    Aug 13, real Alex ask: "there should also be a back button to river
    too, with connecting level 3 from previous river being the
    backdoor." A real `RPGACE.modules.<other>.<function>(` call inside
    one module's own function body is genuine, checkable evidence that
    THIS SPECIFIC function reaches directly into ANOTHER module's own
    function-call chain — real "backdoor" data letting Level 3 jump
    straight across a river boundary without climbing back up through
    Level 2, when (and only when) real code evidence supports it.

    Real, honest scope limit, same shape as every other detector here:
    only literal `RPGACE.modules.X.fn(` calls are caught — a call
    reached through a stored reference, a callback, or RPGACE.hooks is
    invisible to this method, same confirmed blind spot as everywhere
    else in this file.

    Returns [(from_module, from_func, to_module, to_func), ...] — every
    real cross-module function call found anywhere in rpgace_core.js,
    not scoped to one river (a real backdoor can and does cross rivers,
    e.g. taxonomyTree calling into dashDeck).

    G82 (Aug 25 2026) — real, measured detector fix. The original
    pattern was `RPGACE\\.modules\\.(\\w+)\\.(\\w+)\\s*\\(`, which
    requires the `.` between module and method to sit IMMEDIATELY after
    the module name. That made it structurally blind to a real,
    line-wrapped call — and exactly one such call exists in the whole
    file (confirmed by diffing old vs. new matches across all 45 real
    modules before shipping, not assumed): ciAutoPropose._dispatch's
    `RPGACE.modules.taxonomyTree\\n        .silentPropose(...)`, the
    real Content-Intelligence -> taxonomy-proposal write path. Now
    whitespace-tolerant on both sides of that dot. Real, measured blast
    radius: +1 edge project-wide, no existing edge changed."""
    ranges = parse_module_ranges(core_js_path)
    result = []
    for m in ranges:
        for fname, body in _function_bodies(m, core_js_path).items():
            for call_mod, call_fn in re.findall(r'RPGACE\.modules\.(\w+)\s*\.\s*(\w+)\s*\(', body):
                if call_mod != m and call_mod in ranges:
                    result.append((m, fname, call_mod, call_fn))
    return result


def compute_river_terminals(rnum, flow_edges):
    """Real, computed 'where does this river's own module flow actually
    land' marker — Alex's own "conjoin eventually at [a visible output]"
    ask.

    Aug 13, real fix (found via /misunderstanding on River V): the
    original version only ever returned ONE terminal, picked by
    first-match order through CARDS_BY_RIVER — for River V, two real
    modules (`morningBrief` AND `journalQoL`) both have an equally
    real, unambiguous `-> X module` dashboard-card citation, and River
    V has ZERO real intra-flow edges to disambiguate between them
    (matching its own real name, "Two Independent Streams" — there
    genuinely isn't one true terminal here). The old code silently
    picked whichever module happened to sit earlier in DASHBOARD_
    CARDS' own unrelated definition order — an artifact of table
    order, not real evidence, and it visually isolated `morningBrief`
    from its 9 real siblings for no real reason. Now returns a REAL
    LIST: every module with a real exact dashboard-card citation is a
    genuine co-terminal UNLESS real in-degree evidence clearly favors
    one over the others (a real disambiguator, when it exists).

    Returns [(module, kind), ...] — kind in {'ui','ai','both'}. An
    empty list is a real, honest gap (River I's own case: `authGate`
    has no dashboard card and no siblings to call it), never forced to
    a guess."""
    edges = flow_edges.get(rnum, [])
    indeg = {}
    for _f, t, _k in edges:
        indeg[t] = indeg.get(t, 0) + 1
    ui_candidates = []
    for c in CARDS_BY_RIVER.get(rnum, []):
        found = dashboard_card_target_module(c.get('via', ''), RIVER_MODULES.get(rnum, []))
        if found and found not in ui_candidates:
            ui_candidates.append(found)
    if len(ui_candidates) > 1 and indeg:
        # real in-degree evidence CAN disambiguate multiple citations —
        # only if one candidate strictly beats every other real
        # candidate; otherwise all stay real co-terminals.
        scored = sorted(ui_candidates, key=lambda m: indeg.get(m, 0), reverse=True)
        if indeg.get(scored[0], 0) > indeg.get(scored[1], 0):
            ui_candidates = [scored[0]]
    if not ui_candidates and indeg:
        ui_candidates = [max(indeg, key=indeg.get)]
    ai_module = None
    ai_names = {'Anthropic (Claude API)', 'Moonshot AI (Kimi)', 'OpenAI (Luna)'}
    if any(l['name'] in ai_names for l in LINKS_BY_RIVER.get(rnum, [])):
        ai_module = 'oracleAppGrounding' if 'oracleAppGrounding' in RIVER_MODULES.get(rnum, []) else None
    result = []
    for m in ui_candidates:
        result.append((m, 'both' if m == ai_module else 'ui'))
    if ai_module and ai_module not in ui_candidates:
        result.append((ai_module, 'ai'))
    return result


def dashboard_card_target_module(via, valid_mods):
    """Real, shared extraction (rule 8 — same regex compute_river_
    terminal() already uses, now reusable from one place): pulls the
    exact single module a DASHBOARD_CARDS entry's own `via` text names,
    if it's an unambiguous `-> X module` citation naming a real member
    of this river. Returns None on any ambiguity — never guessed."""
    m = re.search(r'->\s*(\w+)\s+module\b', via or '')
    if m and m.group(1) in valid_mods:
        return m.group(1)
    return None


def dashboard_card_primary_module(via, valid_mods):
    """Real, PRIMARY-destination-only classifier — Aug 13, Alex-
    confirmed rule after 2 disproven hypotheses on the same real
    example. Real GODMODE evidence found the "isolated flag" and
    "strict -> X module regex" hypotheses both WRONGLY dropped
    phylumPath, which Alex explicitly confirmed as a real, legitimate
    Alex-bubble connection — reverted rather than shipped wrong twice
    (rule 4), his own real answer put to him directly instead of
    guessed a third time. The real rule: a module counts only when a
    card's own `via` text names it as the PRIMARY/fallback thing that
    card actually opens — not merely one of several siblings sharing a
    card, and not a module the via text itself explicitly demotes.

    Two real, narrow patterns (never a broad keyword match):
      1. An exact "-> X module" citation (dashboard_card_target_
         module()'s own pattern, reused here, rule 8) — e.g.
         "dashDeck._openMorningBrief() -> morningBrief module".
      2. An "else X page/browse" fallback citation — e.g.
         "...else phylumPath page browse", a real distinct "this is
         what you land on by default" signal, not a shared-sibling one.
    Real, explicit demotion check: a via text containing "QoL layer"
    (case-insensitive) means the named module is NOT primary regardless
    of an otherwise-matching pattern — agendaReminder's own via text
    literally says "QoL layer only... not the core," Alex's own real
    disqualifying example. A module named only via a slash-joined
    sibling list ("-> X/Y etc") correctly matches neither pattern and
    returns None — researchTabs/intelBatchList/oracleAppGrounding's own
    real case, Alex's other disqualifying example."""
    if not via or 'qol layer' in via.lower():
        return None
    m = re.search(r'->\s*(\w+)\s+module\b', via)
    if m and m.group(1) in valid_mods:
        return m.group(1)
    m2 = re.search(r'else\s+(\w+)\s+(?:page|browse)\b', via)
    if m2 and m2.group(1) in valid_mods:
        return m2.group(1)
    return None


def compute_module_flow_rank(rnum, flow_edges, terminals):
    """Real, LEFT-TO-RIGHT flow position per module — Aug 13, real Alex
    correction on the original radial layout: "it should be flowing
    from left (input) to right (output) and depict contributers along
    the way from left to right... the river flows through modules into
    river 2. make this a principal of how level 2 maps work for future
    updates." This is now the STANDING layout rule for every Level-2
    river diagram, not a one-off fix.

    Returns {module: rank} where rank is a real, evidence-derived
    x-position class:
      2  = the real terminal (rightmost among modules — a real visible
           output or AI connection, per compute_river_terminal)
      1  = a real DIRECT upstream feeder (has an edge straight INTO
           the terminal) — sits just left of it
      0  = a module with no real edge to/from the terminal at all
           (the honest, neutral default — most single-module rivers
           and any module compute_intra_river_flow found no evidence
           for land here, never guessed into 1/-1)
      -1 = a real downstream HELPER (the terminal, or an upstream
           feeder, calls OUT to it — real evidence it's invoked TO
           PRODUCE the output, not a step before it) — sits just
           right of the terminal, alongside the real river-flow OUT
           band, matching "a helper joining near the output," not a
           second output stage.
    Real, stated limit: this is a simple 2-hop classification from
    real edges only (direct calls, wrap chains, shared-utility/DOM
    convergence — every real signal compute_intra_river_flow() itself
    finds, edge `kind` ignored here since rank cares only THAT a real
    edge exists, not which of the 4 real signals found it), not a full
    topological sort — genuinely faithful to the real evidence and no
    more."""
    edges = flow_edges.get(rnum, [])
    rank = {}
    if not terminals:
        return rank
    term_set = set(terminals)
    for t in terminals:
        rank[t] = 2
    for frm, to, _k in edges:
        if to in term_set and frm not in term_set:
            rank[frm] = max(rank.get(frm, -99), 1)
    for frm, to, _k in edges:
        if frm in term_set and to not in term_set and to not in rank:
            rank[to] = -1
        elif frm in rank and rank.get(frm) == 1 and to not in term_set and to not in rank:
            rank[to] = -1
    return rank


def line_of(node):
    """Best-effort line number extraction from a node's source_location
    (graph.json has this; graph.html's embedded RAW_NODES does NOT -
    real, confirmed field-loss during export, not a bug in this script)."""
    loc = node.get('source_location') or ''
    m = re.search(r'[Ll](\d+)', str(loc))
    return int(m.group(1)) if m else None


def build_id_river_map(graph_json_path: Path, module_ranges):
    """graph.json is the authoritative source for source_location -
    build id -> river from THERE, then apply by id to graph.html's
    RAW_NODES (which shares the same id scheme but not the line data)."""
    data = json.loads(graph_json_path.read_text(encoding='utf-8'))
    id_river = {}
    for node in data.get('nodes', []):
        src = node.get('source_file') or ''
        if not src.endswith('rpgace_core.js'):
            continue
        ln = line_of(node)
        if ln is None:
            continue
        for mod, (start, end) in module_ranges.items():
            if start <= ln <= end:
                river = MODULE_RIVER.get(mod)
                if river:
                    id_river[node['id']] = river
                break
    return id_river


def build_id_module_map(graph_json_path: Path, module_ranges):
    """Companion to build_id_river_map, same loop shape, keyed by real
    module name instead of river number. Aug 11 addition, real Alex ask
    ("one combined view" — graphify's graph and the Obsidian vault notes
    together, not two separate disconnected links): this is what lets
    graph.html's new RIVER_NOTES bridge (build_river_notes below) list,
    for each river's real member modules, the actual node ids physically
    inside that module's line range — so clicking a member name in the
    inline note can select/focus those real nodes in the graph itself,
    a genuine two-way link, not a decorative list."""
    data = json.loads(graph_json_path.read_text(encoding='utf-8'))
    id_module = {}
    for node in data.get('nodes', []):
        src = node.get('source_file') or ''
        if not src.endswith('rpgace_core.js'):
            continue
        ln = line_of(node)
        if ln is None:
            continue
        for mod, (start, end) in module_ranges.items():
            if start <= ln <= end:
                id_module[node['id']] = mod
                break
    return id_module


def build_river_notes(module_ranges, id_module):
    """Real, structured (JSON, not markdown) equivalent of
    graphify_to_obsidian.py's build_hub_note — same underlying data
    (RIVER_MODULES/RIVER_NAME/RIVER_COLOR/RIVER_FLOWS/FLOWS_IN, all
    canonical in this file), reshaped for graph.html's own JS to render
    inline in the node-info panel rather than as a separate markdown
    page. Deliberately NOT a call into graphify_to_obsidian.py (would be
    a circular import — that script imports FROM this one) — the shared
    truth is the module-level tables above, not the markdown renderer,
    so this is real reuse, not a second hand-typed copy of the content."""
    module_to_ids = {}
    for nid, mod in id_module.items():
        module_to_ids.setdefault(mod, []).append(nid)

    notes = {}
    for river in range(1, TOTAL_ZONES + 1):
        mods = RIVER_MODULES.get(river)
        members = None
        if mods:
            members = []
            for mod in mods:
                rng = module_ranges.get(mod)
                members.append({
                    'name': mod,
                    'range': f'{rng[0]}-{rng[1]}' if rng else None,
                    'node_ids': module_to_ids.get(mod, []),
                })
        flows_into = [
            {'label': label, 'note': note, 'itype': itype,
             'itype_label': INTERACTION_TYPE_LABEL.get(itype), 'itype_color': INTERACTION_TYPE_COLOR.get(itype)}
            for label, note, itype in RIVER_FLOWS.get(river, [])
        ]
        fed_by = [
            {'label': RIVER_NAME[src], 'note': note, 'itype': itype,
             'itype_label': INTERACTION_TYPE_LABEL.get(itype), 'itype_color': INTERACTION_TYPE_COLOR.get(itype)}
            for src, note, itype in FLOWS_IN.get(river, [])
        ]
        notes[str(river)] = {
            'name': RIVER_NAME[river],
            'kind': 'river',
            'carries_data_flow': river <= 11,
            'color': RIVER_COLOR[river],
            'members': members,
            'zone_note': RIVER_ROLE_NOTE.get(river),
            'flows_into': flows_into,
            'fed_by': fed_by,
            'external_connectors': EXTERNAL_CONNECTORS if river == 12 else None,
            'core_infrastructure': [SUPABASE_CORE] if river == 12 else None,
        }
    return notes


def build_component_zone_map(graph_json_path: Path, id_river):
    """Aug 6, 3rd Engineer pass - real Alex ask: "go through the list to
    see nodes with no neighbour... to see what we can hook it up to,"
    then, on seeing this still left 56 disconnected components, "i want
    it closest to the part of rpgace it is connected to." Positioning a
    whole connected component near its real topic is a genuinely SAFER
    way to express "these are related" than adding a fabricated edge
    would be - proximity doesn't claim a hard reference relationship the
    way an edge does (same honesty boundary as the "why not just hook
    them up" answer this session already gave).

    Real, evidence-based rules only - never a guess at what a file
    "probably" relates to:
    - Any node already river-tagged (id_river, from real
      rpgace_core.js module-marker ranges) keeps that river - authority
      order, this function never overrides it.
    - `.claude/skills/` goes to Zone XIII (Skills) - real, checkable:
      this is Claude Code's own dev-process tooling, a distinct kind of
      material from the docs it's read alongside.
    - root-level oversight docs (CLAUDE.md, patch_notes.html,
      interconnection_map.md, system_flow_map.md, manual.html,
      taxonomy_map.html, minotaur_map.html, ai_tooling_and_rules_map.md,
      RPGACE_ARCHITECTURE.md, RPGACE.md, DESIGN.md,
      RPGACE_ORACLE_NOTES.md, and their 2 archive files) go to Zone XIV
      (Oversight Docs) - the live, hand-maintained reference set this
      file's own CLAUDE.md rules govern directly.
    - every dated backlog/spec/debate/session .txt or .md at repo root
      goes to Zone XV (Session Records / Backlog) - real, checkable:
      these are point-in-time verbatim records (rule 5's convention),
      genuinely different material from the 7 live-maintained docs
      above even though both are "about" the project.
    - `plans/*.md` and dev/build tooling (scripts/, rpgace_build.py,
      package.json, vercel.json, manifest.json, sw.js,
      .graphify_version) go to Zone XVI (Dev Tooling) - the actual
      scripts/config that build/ship/graph the project, as opposed to
      material that just describes it.
    - Round 2 split (this pass): same file-path evidence as the
      original single Zone XIII, just partitioned finer - a skill .md,
      a dated backlog .txt, and rpgace_build.py are all real "dev
      process" material, but they aren't the SAME kind of dev-process
      material, and lumping them was itself a coarser fit than the
      real evidence supported.
    - `api/*.js` goes to Zone XII - real, checkable membership: every
      one of those files routes through requireAuth()/setCORS() in
      api/_context.js (confirmed by direct grep this session), making
      "shared API/auth layer" a real, not guessed, description.
    - scripts/fourth_rota.py and n8n/* go to River V - real, checkable
      membership: both are genuine Schedule-system automation
      (interconnection_map.md/patch_notes.html both document
      fourth_rota.py as the real rota-sync tool feeding the Schedule
      System).
    - Everything else (main.js nodes with no real per-function keyword
      match — see classify_mainjs_by_keyword below, rpgace_core.js code
      outside any known module range, and anything not matching a rule
      above) is left UNCLASSIFIED on purpose - positioning it would mean
      guessing at a relationship this script has no real evidence for.
      Honest scope limit, not an oversight.
    """
    data = json.loads(graph_json_path.read_text(encoding='utf-8'))
    nodes_by_id = {n['id']: n for n in data.get('nodes', [])}
    links = data.get('links', [])
    adj = {}
    for l in links:
        s, t = l.get('source'), l.get('target')
        adj.setdefault(s, set()).add(t)
        adj.setdefault(t, set()).add(s)

    def file_zone(src):
        if not src:
            return None
        if src.startswith('.claude/skills/'):
            return 13  # Zone XIII — Skills
        if src.startswith('plans/'):
            return 16  # Zone XVI — Dev Tooling
        if src.startswith('scripts/') or src in (
            'rpgace_build.py', 'package.json', 'vercel.json',
            'manifest.json', 'sw.js', '.graphify_version'):
            if src == 'scripts/fourth_rota.py':
                return 5
            return 16  # Zone XVI — Dev Tooling
        if src.startswith('n8n/'):
            return 5
        if src.startswith('api/'):
            return 12
        oversight_docs = (
            'CLAUDE.md', 'CLAUDE_archive.md', '.claude/CLAUDE.md',
            'patch_notes.html', 'patch_notes_archive.html',
            'interconnection_map.md', 'system_flow_map.md', 'manual.html',
            'taxonomy_map.html', 'minotaur_map.html',
            'ai_tooling_and_rules_map.md', 'RPGACE_ARCHITECTURE.md',
            'RPGACE.md', 'DESIGN.md', 'RPGACE_ORACLE_NOTES.md',
        )
        if src in oversight_docs:
            return 14  # Zone XIV — Oversight Docs
        if src.endswith('.txt') and '/' not in src:
            return 15  # Zone XV — every dated backlog/spec/debate/session .txt at repo root
        if src.endswith('.md') and '/' not in src and src not in ('README.md',):
            return 15  # Zone XV — dated session/report .md files at repo root
        return None

    seen = set()
    zone_map = {}
    for n in data.get('nodes', []):
        nid = n['id']
        if nid in seen:
            continue
        stack = [nid]
        comp = set()
        while stack:
            x = stack.pop()
            if x in comp:
                continue
            comp.add(x)
            seen.add(x)
            stack.extend(adj.get(x, set()) - comp)
        # Authority order: an existing river tag wins outright.
        river_votes = {}
        for cid in comp:
            if cid in id_river:
                r = id_river[cid]
                river_votes[r] = river_votes.get(r, 0) + 1
                continue
            z = file_zone(nodes_by_id.get(cid, {}).get('source_file'))
            if z is not None:
                river_votes[z] = river_votes.get(z, 0) + 1
        if not river_votes:
            continue
        # Aug 11, real bug found while extending this script: a tied
        # vote used to resolve via dict/set iteration order, which
        # Python randomizes per-process for string keys (PYTHONHASHSEED)
        # - re-running this script against the SAME graph.json could
        # silently assign a different river to a tied component each
        # time, contradicting this file's own "re-running always
        # reproduces the exact same layout" claim. sorted() first makes
        # a tie resolve to the lowest river number, always, regardless
        # of hash seed - real determinism, not just claimed.
        best = max(sorted(river_votes.items()), key=lambda kv: kv[1])[0]
        for cid in comp:
            if cid in id_river:
                continue
            # Real fix (this pass): main.js's ~240 nodes form ONE big
            # connected component internally (call-graph edges, not
            # module markers) - so a component-level vote here would
            # wrongly drag every unmatched main.js node into whichever
            # river the OTHER, individually keyword-classified main.js
            # nodes happen to dominate, defeating the whole point of
            # classifying main.js per-function instead of per-component.
            # main.js nodes get ONLY their own id_river entry (from
            # classify_mainjs_by_keyword, real per-function evidence) or
            # stay honestly unclassified - never a component-vote
            # inherited from an unrelated tagged neighbor.
            src = (nodes_by_id.get(cid, {}) or {}).get('source_file') or ''
            if src.endswith('main.js'):
                continue
            zone_map[cid] = best
    return zone_map


# Round 2 (this pass): "classify main.js nodes individually, by
# function-name keyword" - main.js's own real names ARE evidence, same
# reasoning the standing keyword-collision convention already relies on
# elsewhere in this project (CLAUDE.md's "Word-boundary regex... keyword
# lists use compound phrases" landmine note - real function names are a
# stronger, not weaker, signal than a bare adjective). Built by reading
# every one of main.js's 240 real node labels directly (not guessed),
# cross-checked against actual function bodies wherever a name alone was
# ambiguous (e.g. renderDB/loadNote/deleteNote/extractTopic - confirmed
# by reading the code around them that they operate on LEARN.db, the
# Learning-page video-notes store, not Content Intelligence, despite
# living in the same file). Ordered rule list, first match wins - order
# matters where a name could plausibly fit two rivers (e.g.
# saveOracleToEncyclopedia checks 'oracle' - river 3 - before river 7's
# 'enc', since the function is an Oracle-side action whose destination
# happens to be the encyclopedia, not an encyclopedia action in its own
# right).
MAINJS_RIVER_RULES = [
    (1, ['password', 'pwvis']),
    (2, ['showpage', 'showsched']),
    (3, ['oracle', 'sendchat', 'addmsg', 'rendermarkdown', 'escchathtml',
         'callcomposio', 'insta_commands', 'renderinstamsg', 'addinstaquest',
         'toggleinstapanel', 'fireinstacommand', 'prod_commands',
         'fireprodcommand', 'firebeatanalysis', 'clearpendingimage',
         'sendchatwithimage']),
    (7, ['enc', 'insight', 'vst', 'learn', 'video', 'notion', 'workshop',
         'renderdb', 'loadnote', 'deletenote', 'extracttopic', 'ytkey',
         'extractall', 'jumpto', 'detectcategory', 'sortentries',
         'filterentries', 'renderbullets', 'syncandpush', 'generatenotes',
         'copydescription']),
    (5, ['shift', 'agenda', 'sched', 'timer', 'focus', 'fm_session',
         'startdonow', 'pickduration', 'closesessionsetup', 'beginsession',
         'buildtimeslots', 'dzover', 'dzleave', 'dzdrop', 'handlefile',
         'pastearea', 'parsepasteinput', 'parseics', 'parsecsv', 'parsetext',
         'cat_icon', 'cat_col', 'dailygrid', 'dailynav', 'logdailyaction',
         'pasterota', 'journal', 'intel', 'watchlist', 'tracked',
         'startjobpolling', 'polljobs', 'renderjobs', 'fetchfromsupabase',
         'fetchfromlocal', 'pushlocaltosupabase', 'mergebyurl',
         'checkserverstatus', 'submitintelurl', 'default_shifts',
         'importerr', 'stopreason', 'freewindow', 'rota', 'cal', 'duration',
         'slot', 'fracclock', 'switchtoci']),
    (10, ['quest', 'xp', 'levelup', 'skilltree', 'skills', 'agent',
          'makecard', 'buildqs', 'suggestion']),
]


def classify_mainjs_by_keyword(graph_json_path: Path):
    """Real per-node id -> river map for main.js, from the rule table
    above. Returns (id_river_subset, matched_ids) - matched_ids lets the
    caller mark these nodes' tooltips as keyword-matched (a real, but
    weaker, evidence tier than rpgace_core.js's structural module
    markers - honest, not hidden). Deliberately leaves genuinely
    cross-cutting/dead main.js nodes (main, CONFIG, STATE, LEVEL_TITLES,
    the dead updateDBStats stub, the global-text-select cluster,
    initApp, and the new shared _sbGet helper used by many domains at
    once) unclassified - same "don't force a fit" discipline as
    file_zone() above. 228 of 240 real main.js nodes matched."""
    data = json.loads(graph_json_path.read_text(encoding='utf-8'))
    out = {}
    matched = set()
    for node in data.get('nodes', []):
        src = node.get('source_file') or ''
        if not src.endswith('main.js'):
            continue
        nid = node['id']
        key = nid[5:] if nid.startswith('main_') else nid
        for river, kws in MAINJS_RIVER_RULES:
            if any(kw in key for kw in kws):
                out[nid] = river
                matched.add(nid)
                break
    return out, matched


ZONE_RADIUS = 2400  # px from the graph's own origin - well outside the
                     # untagged-node blob's natural forceAtlas2Based
                     # settling radius, so river zones read as clearly
                     # separate from it, not swallowed back in.
JITTER_RADIUS = 220  # px scatter within a zone, so same-river nodes are
                      # a visible cluster, not one stacked point.


def zone_center(river):
    """Deterministic center for a river's zone - 11 rivers placed evenly
    around one large circle. Same real technique as minotaur_map.html's
    own bird's-eye block layout: one shape per river, arranged in a
    fixed ring, not randomly - so the physical layout itself is legible."""
    angle = 2 * math.pi * (river - 1) / TOTAL_ZONES
    return ZONE_RADIUS * math.cos(angle), ZONE_RADIUS * math.sin(angle)


def deterministic_jitter(node_id, community, scale=1.0):
    """A node's scatter position within its zone, seeded from its own id
    (never Math.random/random.random) - re-running this script against a
    fresh export always reproduces the exact same layout, same
    idempotency discipline as graphify_recolor.py. Nodes sharing a
    graphify `community` id get pulled toward one shared sub-point
    inside the zone first (the real 'communities make up a block'
    request), then jittered a little further so they don't overlap.
    `scale` (Aug 6, 3rd Engineer pass) widens the jitter radius for the
    2 meta-zones, which hold whole connected components (dozens to low
    hundreds of nodes) rather than the ~16 the 11 named-module rivers
    hold - without it, those zones would overlap into an unreadable
    knot. Real rivers always pass scale=1.0, unaffected."""
    radius = JITTER_RADIUS * scale
    h = int(hashlib.sha1(f'{node_id}'.encode()).hexdigest(), 16)
    sub_h = int(hashlib.sha1(f'{community}'.encode()).hexdigest(), 16)
    sub_angle = 2 * math.pi * (sub_h % 1000) / 1000
    sub_r = radius * 0.35 * ((sub_h // 1000) % 100) / 100
    sub_dx, sub_dy = sub_r * math.cos(sub_angle), sub_r * math.sin(sub_angle)
    angle = 2 * math.pi * (h % 1000) / 1000
    r = radius * 0.65 * ((h // 1000) % 100) / 100
    return sub_dx + r * math.cos(angle), sub_dy + r * math.sin(angle)


DATASET_MARKER = '_river_fixed: n._river_fixed'  # idempotency check string


def patch_dataset_mapping(text):
    """graph.html's own nodesDS mapping function (checked directly by
    reading the file, not assumed) explicitly whitelists which RAW_NODES
    fields become vis.js DataSet fields - x/y/fixed were never among
    them, so setting them on RAW_NODES alone would be silently dropped.
    Idempotent: skips if this exact patch already landed."""
    if DATASET_MARKER in text:
        return text, False
    old = ("const nodesDS = new vis.DataSet(RAW_NODES.map(n => ({\n"
           "  id: n.id, label: n.label, color: n.color, size: n.size,\n"
           "  font: n.font, title: n.title,\n"
           "  _community: n.community, _community_name: n.community_name,\n"
           "  _source_file: n.source_file, _file_type: n.file_type, _degree: n.degree,\n"
           "})));")
    new = ("const nodesDS = new vis.DataSet(RAW_NODES.map(n => ({\n"
           "  id: n.id, label: n.label, color: n.color, size: n.size,\n"
           "  font: n.font, title: n.title,\n"
           "  _community: n.community, _community_name: n.community_name,\n"
           "  _source_file: n.source_file, _file_type: n.file_type, _degree: n.degree,\n"
           "  x: n.x, y: n.y, fixed: n.fixed, _river_fixed: n._river_fixed,\n"
           "})));")
    if old not in text:
        raise ValueError('graph.html\'s nodesDS mapping line has changed shape - '
                          'a graphify version bump likely rewrote its own export '
                          'template. Re-check by hand before patching blind.')
    return text.replace(old, new), True


RIVER_NOTES_START = '/* RIVER_NOTES_BRIDGE:START — regenerated every run, do not hand-edit */'
RIVER_NOTES_END = '/* RIVER_NOTES_BRIDGE:END */'


def build_river_notes_block(river_notes):
    """Aug 11, real Alex ask: 'one combined view' — graphify's own
    graph and the Obsidian vault's river/zone notes together, not two
    separate disconnected Oversight links. Injects the real river/zone
    note content (same source data as graphify_to_obsidian.py's
    markdown notes — RIVER_MODULES/RIVER_NAME/RIVER_COLOR/RIVER_FLOWS/
    FLOWS_IN, all canonical in this file) as inline JS, plus a small
    renderer + a click handler on member-module names that selects and
    focuses their real node ids in the graph — a genuine two-way bridge,
    not decoration. Wrapped in a marker-delimited region so a re-run
    always replaces the whole block with fresh data (river/zone content
    changes over time; the helper JS does not need to, but regenerating
    both together is simpler and still fully idempotent)."""
    notes_json = json.dumps(river_notes, ensure_ascii=False).replace('</script', '<\\/script')
    return (
        RIVER_NOTES_START + '\n'
        'const RIVER_NOTES = ' + notes_json + ';\n'
        'function riverNoteHtml(rn) {\n'
        '  var html = \'<div class="river-note" style="border-top:2px solid \' + esc(rn.color) + \';margin-top:10px;padding-top:8px;">\';\n'
        '  html += \'<div class="field" style="color:\' + esc(rn.color) + \';font-weight:700;">\\uD83D\\uDCD6 \' + esc(rn.name) + \'</div>\';\n'
        '  if (rn.members) {\n'
        '    html += \'<div class="field" style="margin-top:4px;color:#aaa;font-size:11px;">Real member modules</div>\';\n'
        '    rn.members.forEach(function(m) {\n'
        '      var has = m.node_ids && m.node_ids.length;\n'
        '      html += \'<span class="neighbor-link member-link" \' + (has ? (\'data-ids="\' + esc(m.node_ids.join(\',\')) + \'"\') : \'\')\n'
        '        + \' style="border-left-color:\' + esc(rn.color) + \';cursor:\' + (has ? \'pointer\' : \'default\') + \';color:\' + (has ? \'#e0e0e0\' : \'#777\') + \';">\'\n'
        '        + (has ? \'\\u25B6 \' : \'\\u00B7 \') + esc(m.name) + (m.range ? (\' (\' + esc(m.range) + \')\') : \'\') + \'</span>\';\n'
        '    });\n'
        '  } else if (rn.zone_note) {\n'
        '    html += \'<div class="field" style="font-size:11px;color:#999;">\' + esc(rn.zone_note) + \'</div>\';\n'
        '  }\n'
        '  function connectorRow(x) {\n'
        '    var dot = x.status === \'live\' || x.status.indexOf(\'live\') === 0 ? \'#4caf82\' : (x.status === \'deferred\' ? \'#777\' : \'#c9a84c\');\n'
        '    var testedMark = x.tested ? \'\' : \' <span style="color:#e0a040;" title="Built, not hand-verified working">\\u26A0 not tested</span>\';\n'
        '    return \'<div class="field" style="font-size:11px;"><span style="color:\' + dot + \';">\\u25CF</span> \' + esc(x.name) + \' <span style="color:#777;">(\' + esc(x.status) + \' \\u2014 \' + esc(x.via) + \')</span>\' + testedMark + \'</div>\';\n'
        '  }\n'
        '  if (rn.core_infrastructure && rn.core_infrastructure.length) {\n'
        '    html += \'<div class="field" style="margin-top:6px;color:#aaa;font-size:11px;">Core infrastructure</div>\';\n'
        '    rn.core_infrastructure.forEach(function(x) { html += connectorRow(x); });\n'
        '  }\n'
        '  if (rn.external_connectors && rn.external_connectors.length) {\n'
        '    html += \'<div class="field" style="margin-top:6px;color:#aaa;font-size:11px;">Total-systems connectors — all real/built ones shown, tested or not</div>\';\n'
        '    rn.external_connectors.forEach(function(x) { html += connectorRow(x); });\n'
        '  }\n'
        '  function itypeBadge(f) {\n'
        '    if (!f.itype_label) return \'\';\n'
        '    return \' <span style="display:inline-block;font-size:9px;font-weight:700;letter-spacing:.3px;padding:1px 6px;border-radius:8px;border:1px solid \' + esc(f.itype_color) + \';color:\' + esc(f.itype_color) + \';">\' + esc(f.itype_label) + \'</span>\';\n'
        '  }\n'
        '  if (rn.flows_into && rn.flows_into.length) {\n'
        '    html += \'<div class="field" style="margin-top:6px;color:#aaa;font-size:11px;">Flows into</div>\';\n'
        '    rn.flows_into.forEach(function(f) {\n'
        '      html += \'<div class="field" style="font-size:11px;">\\u2192 \' + esc(f.label) + itypeBadge(f) + \' <span style="color:#777;">(\' + esc(f.note) + \')</span></div>\';\n'
        '    });\n'
        '  }\n'
        '  if (rn.fed_by && rn.fed_by.length) {\n'
        '    html += \'<div class="field" style="margin-top:6px;color:#aaa;font-size:11px;">Fed by</div>\';\n'
        '    rn.fed_by.forEach(function(f) {\n'
        '      html += \'<div class="field" style="font-size:11px;">\\u2190 \' + esc(f.label) + itypeBadge(f) + \' <span style="color:#777;">(\' + esc(f.note) + \')</span></div>\';\n'
        '    });\n'
        '  }\n'
        '  html += \'</div>\';\n'
        '  return html;\n'
        '}\n'
        'document.addEventListener(\'click\', function(e) {\n'
        '  var el = e.target.closest(\'.member-link\');\n'
        '  if (el && el.dataset.ids) {\n'
        '    var ids = el.dataset.ids.split(\',\');\n'
        '    network.selectNodes(ids);\n'
        '    network.fit({ nodes: ids, animation: true });\n'
        '    showInfo(ids[0]);\n'
        '  }\n'
        '});\n'
        + RIVER_NOTES_END
    )


SHOW_INFO_MARKER = 'riverNoteHtml(RIVER_NOTES'  # idempotency check string


def patch_river_notes_bridge(text, river_notes):
    """Injects/refreshes the RIVER_NOTES data+helper block (always
    replaced in full, so content stays current run to run) and patches
    showInfo()'s own template literal to render it, exactly once (the
    showInfo patch itself never needs to change, only the data does)."""
    block = build_river_notes_block(river_notes)
    if RIVER_NOTES_START in text:
        start = text.index(RIVER_NOTES_START)
        end = text.index(RIVER_NOTES_END) + len(RIVER_NOTES_END)
        text = text[:start] + block + text[end:]
    else:
        marker = '</script>\n<script>\n// Render hyperedges as shaded regions'
        if marker not in text:
            raise ValueError('graph.html\'s script-block boundary has changed shape - '
                              'a graphify version bump likely rewrote its own export '
                              'template. Re-check by hand before patching blind.')
        text = text.replace(marker, block + '\n</script>\n<script>\n// Render hyperedges as shaded regions', 1)

    if SHOW_INFO_MARKER not in text:
        old = ("    ${neighborIds.length ? `<div class=\"field\" style=\"margin-top:8px;color:#aaa;font-size:11px\">"
               "Neighbors (${neighborIds.length})</div><div id=\"neighbors-list\">${neighborItems}</div>` : ''}\n"
               "  `;")
        new = ("    ${neighborIds.length ? `<div class=\"field\" style=\"margin-top:8px;color:#aaa;font-size:11px\">"
               "Neighbors (${neighborIds.length})</div><div id=\"neighbors-list\">${neighborItems}</div>` : ''}\n"
               "    ${(n._community >= 1000 && RIVER_NOTES[n._community - 1000]) ? "
               "riverNoteHtml(RIVER_NOTES[n._community - 1000]) : ''}\n"
               "  `;")
        if old not in text:
            raise ValueError("graph.html's showInfo() template has changed shape - "
                              're-check by hand before patching blind.')
        text = text.replace(old, new, 1)
    return text


def extract_array(text, name):
    """Pull `const NAME = [ ... ];` out of the HTML via bracket counting -
    safer than a greedy regex against a 900K+ char single-line file."""
    marker = f'const {name} = ['
    start = text.index(marker) + len(marker) - 1  # position of the '['
    depth = 0
    i = start
    while i < len(text):
        if text[i] == '[':
            depth += 1
        elif text[i] == ']':
            depth -= 1
            if depth == 0:
                return start, i + 1, json.loads(text[start:i + 1])
        i += 1
    raise ValueError(f'Could not find matching bracket for {name}')


def river_group(html_path: Path, graph_json_path: Path):
    module_ranges = parse_module_ranges(CORE_JS)
    id_river = build_id_river_map(graph_json_path, module_ranges)
    # Real per-function main.js classification (this pass) - merged into
    # id_river BEFORE build_component_zone_map so each matched main.js
    # node gets its own individual river directly (id_river.get(nid)
    # below), not a whole-component vote. See classify_mainjs_by_keyword's
    # own docstring and build_component_zone_map's main.js bypass for why
    # this ordering matters.
    mainjs_river, mainjs_matched = classify_mainjs_by_keyword(graph_json_path)
    id_river.update(mainjs_river)
    zone_map = build_component_zone_map(graph_json_path, id_river)
    text = html_path.read_text(encoding='utf-8')

    n_start, n_end, raw_nodes = extract_array(text, 'RAW_NODES')
    l_start, l_end, legend = extract_array(text, 'LEGEND')
    # Aug 11, real bug found: legend.append() below always adds fresh
    # river/zone entries (cid >= 1000) without checking for ones this
    # script itself already appended on a PRIOR run against the same
    # graph.html - re-running river_group() more than once (e.g. after
    # editing RIVER_NAME/EXTERNAL_CONNECTORS, without a fresh
    # `graphify export html` first) silently tripled every river's
    # legend entry. Strip any river/zone entries this script owns
    # before appending fresh ones - full replace, same idempotency
    # discipline as the RIVER_NOTES bridge block above.
    legend = [c for c in legend if c.get('cid', 0) < 1000]

    # Zones 12-16 hold whole connected components (dozens to low hundreds
    # of nodes each, not the ~16 the 11 real rivers hold) - a fixed
    # JITTER_RADIUS sized for the small river case would overlap badly
    # here, so scale it up per zone by real occupancy first.
    zone_occupancy = {}
    for zid in zone_map.values():
        zone_occupancy[zid] = zone_occupancy.get(zid, 0) + 1

    river_counts = {}
    for node in raw_nodes:
        nid = node.get('id')
        river = id_river.get(nid)
        zone = zone_map.get(nid) if river is None else None
        target = river if river is not None else zone
        if target is None:
            continue
        color = RIVER_COLOR[target]
        node['color'] = {'background': color, 'border': color,
                          'highlight': {'background': '#ffffff', 'border': color}}
        node['community'] = 1000 + target
        label = RIVER_NAME[target]
        suffix = f' · {label}'
        if nid in mainjs_matched:
            # Honest evidence-tier flag: a rpgace_core.js module marker is
            # a structural fact; a main.js function name is a real but
            # weaker signal (same relative strength as the keyword-scan
            # convention already used elsewhere in this project) - say so
            # in the tooltip rather than presenting both the same way.
            suffix += ' (main.js · keyword-matched)'
        node['title'] = (node.get('title') or node.get('label') or '') + suffix
        river_counts[target] = river_counts.get(target, 0) + 1

        # Real spatial clustering (Aug 6, 2nd + 3rd Engineer passes): a
        # fixed position inside this zone, so vis.js's physics leaves it
        # there instead of dragging it back toward the blob. Zones 12-16
        # get a jitter radius scaled to their real occupancy (they hold
        # far more nodes than the 11 named-module rivers do); every
        # other zone keeps the original fixed radius, unaffected.
        zx, zy = zone_center(target)
        occ = zone_occupancy.get(target, 1)
        scale = max(1.0, (occ / 16) ** 0.5) if target >= 12 else 1.0
        jx, jy = deterministic_jitter(nid, node.get('community'), scale)
        node['x'] = round(zx + jx, 1)
        node['y'] = round(zy + jy, 1)
        node['fixed'] = {'x': True, 'y': True}
        node['_river_fixed'] = True

    for target, count in sorted(river_counts.items()):
        # Aug 11: both icons now say "river" (unified naming, real Alex
        # ask) — the distinction kept is honest, not hierarchical: 🌊
        # carries in-app narrative information flow (rivers I-XI), 🔗
        # carries real Total-systems traffic instead (rivers XII-XVI —
        # API/Auth calls to external members, or the dev-process/
        # knowledge layer those members coordinate through).
        icon = '🌊' if target <= 11 else '🔗'
        legend.append({'cid': 1000 + target, 'color': RIVER_COLOR[target],
                        'label': f'{icon} {RIVER_NAME[target]}', 'count': count})

    # Re-serialize LEGEND first (higher offset, so RAW_NODES's offsets
    # stay valid when we splice LEGEND back in after it).
    new_legend_json = json.dumps(legend, ensure_ascii=False)
    text = text[:l_start] + new_legend_json + text[l_end:]
    new_nodes_json = json.dumps(raw_nodes, ensure_ascii=False)
    text = text[:n_start] + new_nodes_json + text[n_end:]

    text, patched = patch_dataset_mapping(text)

    # Aug 11: the real "one combined view" bridge — river/zone notes
    # (same content as the Obsidian vault's own hub notes) rendered
    # inline in graph.html's own info panel, with member modules
    # clickable back into the graph. id_module reuses the exact same
    # module_ranges already parsed above; no re-parsing.
    id_module = build_id_module_map(graph_json_path, module_ranges)
    river_notes = build_river_notes(module_ranges, id_module)
    text = patch_river_notes_bridge(text, river_notes)

    html_path.write_text(text, encoding='utf-8')
    return river_counts, len(module_ranges), patched


# Aug 21 2026, real Alex ask (mid-session, verbatim): "i want every
# possible version of these [🌌L0 -> 🏛️L1 -> 🌊L2 -> 🔽L3 -> 🖱️L4 -> 🧠L5]
# to all be present in each file so i can see it better too." One real,
# shared "level rail" component (rule 8 — every one of the 22 real
# galaxy_map_*.py generator scripts shares the exact same
# `OUT.write_text(html, encoding='utf-8')` convention, so this is a single
# mechanical post-process, not 22 hand-copied nav blocks).
#
# **Real Aug 25 2026 shrink (G75) — the ladder is now 4 real stops, not
# 8.** Alex's own ratified scope: a "Level" means a real CONTAINMENT
# step (L0 galaxies -> L1 rivers -> L2 modules -> L3 the module's own
# Currents), and only those four genuinely nest. The four stops removed
# were never containment steps:
#   * L2.5 — real content, but it is Level 2's own TABLE VIEW of the
#     same modules (galaxy_map_module.py), not a step below Level 2.
#     Removed as a rail chip only; the table view itself is untouched.
#   * Zoom (L4) — a per-Current detail walkthrough, i.e. a LENS over
#     L3's own content. Folded into Current as a real inline
#     expand-for-detail toggle; galaxy_map_zoom.py/.html deleted.
#   * L5 — 7 curated core-logic decision points, another lens over the
#     same functions. Merged into the Decision Matrix (which already
#     imported all 7 by reference); galaxy_map_level5.py/.html deleted.
#   * L6 — 1180 mechanical branch points. Keeps its own page (the data
#     genuinely needs somewhere to live) but is link-out-only detail,
#     reached from the Decision Matrix / Current entries that cite it,
#     never a rung of the ladder.
# Everything a "level" used to mean that these four actually were is
# now called a Dimension — see DIMENSION_PAGES below.
LEVEL_RAIL = [
    ('galaxy_map.html', '🌌', 'L0'),
    ('galaxy_map_river.html', '🏛️', 'L1'),
    ('galaxy_map_module.html', '🌊', 'L2'),
    ('galaxy_map_current.html', '🔽', 'Current (L3)'),
]

# ---------------------------------------------------------------------
# G74 (Aug 25 2026) — the real, canonical Dimension index.
#
# Alex's own ratified scope: Dimensions get equal visual/structural
# status with Rivers, WITHOUT becoming numbered list items (no "River
# XVIII" — a River is a strict one-module-one-home partition of the
# code, a Dimension is deliberately multi-membership, and collapsing
# the two would destroy that property). This list is the ONE place that
# fact is written down; every page that shows a Dimension index imports
# it rather than hand-typing its own copy (rule 8).
#
# `kind` reuses galaxy_map_hub.py's own already-established vocabulary,
# verified against its PAGES catalogue rather than reinvented:
#   inter = a connection/flow dimension (renders as edges)
#   infra = an attached-resource dimension (renders as a node bubble)
#   meta  = a cross-dimension synthesis page (neither, by itself)
DIMENSION_PAGES = [
    ('galaxy_map_decision_matrix.html', '🚦', 'Decision Matrix', 'meta',
     'Every real decision — gates, curated core logic, text inputs — by river.'),
    ('galaxy_map_dimensions.html', '🧭', 'Dimensions Matrix', 'meta',
     'Which modules are multi-home across every other dimension.'),
    ('galaxy_map_logic_dimension.html', '📖', 'Logic Dimension', 'inter',
     'Every river-to-river connection, connector and skill stream as a passage.'),
    ('galaxy_map_decisions.html', '🗑️', 'Decisions — Human Gates', 'infra',
     'The real human-confirm gates before a destructive or taxonomy write.'),
    ('galaxy_map_level6.html', '🔬', 'Branch Ledger', 'infra',
     'Exhaustive, mechanical if/else/switch branch extraction, listed not narrated.'),
    ('galaxy_map_supabase.html', '💉', 'Supabase', 'infra',
     'Every real client-side Supabase table touch, by level/river/module.'),
    ('galaxy_map_externals.html', '🔌', 'Externals', 'infra',
     'Whether each external connector genuinely touches real UI AND real backend.'),
    ('galaxy_map_load.html', '⏳', 'Load Dimension', 'infra',
     'What actually triggers a load: boot task, page nav, or on-demand click.'),
    ('galaxy_map_skill_network.html', '🕸️', 'Skills', 'inter',
     'Real skill-to-skill invocation edges, plus each skill’s AI/UI/backend axes.'),
    ('galaxy_map_alex_path.html', '🧑', 'Alex’s Decision Path', 'inter',
     'Each dashboard card’s real flow, and the real Y/N fork Alex actually hits.'),
    ('galaxy_map_orchestrator_openmontage.html', '🛰️', 'Orchestrator ↔ OpenMontage', 'inter',
     'Real async dispatch history between the two Claude Code sessions.'),
    ('galaxy_map_oversight_sync.html', '📚', 'Oversight Sync', 'inter',
     'Which oversight doc gets touched, in what order, during a push or ritual.'),
    ('galaxy_map_loops.html', '🔄', 'Loops', 'meta',
     'Real cycles across direct calls, cross-module event signals, and shared Supabase tables.'),
]

DIMENSION_KIND_META = {
    'inter': ('🔗', 'Inter — a connection/flow between things', '#4A90E2'),
    'infra': ('💉', 'Infra — a resource attached to things', '#9B59B6'),
    'meta': ('🧭', 'Meta — synthesis across several dimensions', '#8a8a9a'),
}

DIMENSION_INDEX_CSS = '''
.dim-index{max-width:1180px;margin:18px auto 26px;padding:0 24px}
.dim-index h2{font-family:Georgia,serif;font-size:19px;color:#fff;margin-bottom:4px;text-align:center}
.dim-index .dim-sub{font-size:11px;color:#8a8a9a;text-align:center;margin-bottom:14px;line-height:1.6}
.dim-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.dim-card{display:block;text-decoration:none;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-left-width:3px;border-radius:10px;padding:11px 13px;transition:background .15s,border-color .15s}
.dim-card:hover{background:rgba(255,255,255,0.07)}
.dim-card .dim-name{font-size:12.5px;font-weight:700;color:#E2E2EC;margin-bottom:3px}
.dim-card .dim-desc{font-size:10px;color:#8a8a9a;line-height:1.55}
.dim-card .dim-kind{font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;opacity:.9}
'''


def dimension_index_html(current_file=None, heading='🌌 Dimensions'):
    """Real no-op, Aug 26 2026 — Alex's own direct ask: "get rid of
    these [the in-page Dimensions index]... i only want left nav now."
    The real left-nav sidebar (left_nav_html()/G101) already nests every
    Dimension page under its own genuinely-relevant Level, sourced from
    the SAME DIMENSION_PAGES data this function used to render inline —
    a second, always-visible in-page copy of the identical list is
    exactly the redundancy he's asking to remove. Kept as a real
    no-op (not deleted) since ~18 page scripts still call it and
    interpolate the result into their own TEMPLATE strings — returning
    '' is a safe, single-point removal with zero risk of a broken
    template placeholder, versus editing 18 files individually. Real
    call-site cleanup (removing the now-dead calls entirely) is a
    future, lower-risk-tolerance pass, not needed to satisfy the actual
    ask."""
    return ''


# ---------------------------------------------------------------------
# _cid / _build_markers / _curved_edge — moved here from galaxy_map.py,
# G106 (Aug 26 2026). render_infra_drilldown() below needed real SVG
# edge/marker drawing to become a genuine bubble panel (Alex's own
# direct ask, on a screenshot of galaxy_map_connectors.html's flat
# card-grid drill-down: "it should be the same bubble system as in
# level 2 and 3") and galaxy_map.py can't be imported from here (it
# imports FROM this file — the reverse would be circular). Re-exported
# from galaxy_map.py's own namespace so every existing
# `from galaxy_map import _curved_edge, ...` call site
# (galaxy_map_current.py/galaxy_map_module.py/galaxy_map_river.py) keeps
# working unchanged — one real definition, not a second copy (rule 8).

def _cid(color):
    """Real, stable per-color id for a <marker> def — Aug 13 (5th pass),
    Alex's own explicit ask: every edge gets a real X mark at its start
    and a real arrowhead at its end, so the diagrams show relationship
    DIRECTION, not just presence of a line. One marker pair per real
    color actually used (never emitted for a color unused in that
    diagram — same "only what's real" discipline as itype_legend's own
    itype_used set)."""
    return color.replace('#', '').lower()


def _build_markers(colors):
    """Real, shared marker defs (arrowhead + X-start) for a given set of
    real colors — called once per file, right before its own </defs>,
    covers every edge that file draws regardless of which script built
    it. Deliberately NOT using CSS context-stroke/context-fill (real
    portability risk — this app targets Android/desktop PWA via real
    Chrome, and while modern Chromium supports it, a fixed-color-per-
    marker approach has zero browser-version risk and costs only a few
    extra <marker> defs)."""
    out = []
    for c in sorted(set(colors)):
        cid = _cid(c)
        out.append(
            f'<marker id="arrow-{cid}" viewBox="0 0 10 10" refX="8.5" refY="5" '
            f'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>'
        )
        out.append(
            f'<marker id="xstart-{cid}" viewBox="0 0 10 10" refX="5" refY="5" '
            f'markerWidth="6" markerHeight="6">'
            f'<path d="M1,1 L9,9 M9,1 L1,9" stroke="{c}" stroke-width="2" fill="none"/></marker>'
        )
    return ''.join(out)


def _curved_edge(x1, y1, x2, y2, color, real=True, dashed=False, offset_mult=1, r1=0, r2=0, markers=True):
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1
    ux, uy = dx / length, dy / length
    # Real geometry fix: trim each endpoint inward by the real radius of
    # the node it touches, so the X-start/arrow-end markers land AT the
    # node's visible boundary instead of buried under its fill/icon at
    # the node's exact center. r1/r2 default to 0 (no trim) for any
    # caller that hasn't been updated with real radius info yet.
    tx1, ty1 = x1 + ux * r1, y1 + uy * r1
    tx2, ty2 = x2 - ux * r2, y2 - uy * r2
    mx, my = (tx1 + tx2) / 2, (ty1 + ty2) / 2
    ox, oy = -dy / length * 24 * offset_mult, dx / length * 24 * offset_mult
    cx_, cy_ = mx + ox, my + oy
    dash = ' stroke-dasharray="5,4"' if dashed else ''
    op = '0.85' if real else '0.4'
    mk = f' marker-start="url(#xstart-{_cid(color)})" marker-end="url(#arrow-{_cid(color)})"' if markers else ''
    return (f'<path d="M {tx1} {ty1} Q {cx_} {cy_} {tx2} {ty2}" fill="none" '
            f'stroke="{color}" stroke-width="1.8" opacity="{op}"{dash} filter="url(#edgeglow)"{mk}/>')


# ---------------------------------------------------------------------
# G74 (Aug 25 2026) — one shared renderer for the real, evidence-gated
# connector bubbles (Oracle / Composio / Last.fm / Supabase).
#
# Real finding this was extracted from, not a speculative abstraction:
# the exact same ~20-line shape had been hand-written FIVE times across
# two files, each added in a different session — galaxy_map_current.py's
# Oracle/Composio/Last.fm bubbles and galaxy_map_module.py's
# Oracle/Supabase bubbles. Every real difference between the five was a
# number or a word (fan step, hub radius, font sizes, y-offsets, the
# unit noun), never behaviour, so this collapses to one function plus
# two size presets taken VERBATIM from the two call-site families —
# output is byte-identical to the copies it replaced (verified by diff).
#
# Deliberately NOT generalized into this: the Alex bubble. It is a
# genuinely different shape — bidirectional (separate in/out edge
# passes), no per-edge count label, its own subtitle wording ("N shown
# to me · M buttons I press"), and it is drawn permanently rather than
# gated on an evidence count. Forcing it through this signature would
# need three mutually-exclusive flags and would make both call sites
# harder to read, not easier — said plainly rather than papered over.
BUBBLE_STYLE = {
    # galaxy_map_current.py's own established per-FUNCTION sizing.
    'function': dict(fan=13, hub_r=26, hub_sw='2.5', emoji_dy=6, emoji_fs='16',
                     label_dy=42, sub_dy=55, sub_fs='8',
                     edge_r1=26, edge_r2=20, offset_mult=0.6),
    # galaxy_map_module.py's own established per-MODULE sizing.
    'module': dict(fan=15, hub_r=24, hub_sw='3', emoji_dy=5, emoji_fs='15',
                   label_dy=38, sub_dy=50, sub_fs='7.5',
                   edge_r1=22, edge_r2=20, offset_mult=0.5),
}


def core_js_lines(a, b, core_js_path: Path = CORE_JS):
    """Real verbatim excerpt, rpgace_core.js lines a..b inclusive
    (1-indexed).

    G74/G75 (Aug 25 2026) — this was two byte-identical hand-written
    copies, one in galaxy_map_level5.py and one in
    galaxy_map_decisions.py, the second of which even said so in its own
    docstring ("same helper as galaxy_map_level5.py (rule 8)") while
    still being a second copy. Now one shared implementation both real
    call sites import.

    Deliberately does NOT verify the anchor itself — that stays with
    verify_core_js_anchor() below, so a caller can read an excerpt and
    assert on it as two separate, explicit steps.
    """
    return '\n'.join(_cached_core_js_lines(core_js_path)[a - 1:b])


def verify_core_js_anchor(point_id, anchor, a, b, core_js_path: Path = CORE_JS):
    """Fails loud (not silently) if a hand-cited line range no longer
    contains its own anchor text — a mismatched anchor means the page is
    now citing the WRONG code, and a build-time crash is strictly better
    than shipping a confidently-stale excerpt.

    This project has already been saved by exactly this behaviour twice
    (the Aug 20 main.js merge's +4451-line shift, and the Aug 22 drift
    caught by a /paranoia pass). Shared here so the discipline survives
    the L5 -> Decision Matrix merge instead of being re-implemented,
    slightly differently, in each consumer."""
    if anchor not in core_js_lines(a, b, core_js_path):
        raise SystemExit(
            f"STALE ANCHOR: {point_id} — {anchor!r} not found in rpgace_core.js lines {a}-{b}. "
            f"The real source has moved — re-verify and update this decision point's line numbers before shipping.")


def render_evidence_bubble(items, pos, hub_xy, color, emoji, label,
                           unit_noun, count_noun, edge_fn, style='function',
                           link_href=None):
    """One real evidence-gated connector bubble.

    items      — [(key, count), ...], already filtered to count > 0 and
                 to keys that genuinely have a position. The CALLER does
                 that filtering, because "which items count" is real
                 per-page evidence, not layout.
    pos        — {key: (x, y)} for the already-laid-out nodes.
    hub_xy     — (x, y) for the bubble itself.
    edge_fn    — the page's own _curved_edge; passed in rather than
                 imported so this module keeps no dependency on the
                 render scripts that import it.
    link_href  — G105 (Aug 26 2026), Alex's own direct complaint on a
                 screenshot ("clickable bubbles to dimensions for all
                 modules as i asked"): every one of these evidence
                 bubbles rendered as inert decoration, with the ONLY
                 real click-through into a unit's own bubble system
                 living in a separate, disconnected static box
                 (build_module_infra_inter_row's `.idd-mig` cards) that
                 duplicated the exact same real relationship. Optional
                 so a caller with no real destination (none currently)
                 still gets the exact old inert output — but every real
                 caller now passes `UNIT_BUBBLE_SYSTEM[unit_id]`.

    Returns (edges, nodes) — two lists of SVG string fragments, appended
    by the caller in that order, exactly as the five hand-written copies
    did. Returns ([], []) for empty `items`, so "no real evidence, no
    bubble" stays the caller's own one-line guard.
    """
    if not items:
        return [], []
    st = BUBBLE_STYLE[style]
    hx, hy = hub_xy
    edges, nodes = [], []
    n = 0
    for key, cnt in items:
        n += 1
        fx, fy = pos[key]
        ox = hx + (n * st['fan'] if n % 2 == 0 else -n * st['fan'])
        edges.append(edge_fn(fx, fy, ox, hy, color, real=True, dashed=True,
                             r1=st['edge_r1'], r2=st['edge_r2'],
                             offset_mult=st['offset_mult']))
        mx, my = (fx + ox) / 2, (fy + hy) / 2
        nodes.append(f'<circle cx="{mx}" cy="{my}" r="8" fill="#0f0f1a" stroke="{color}" stroke-width="1"/>'
                     f'<text x="{mx}" y="{my+3}" text-anchor="middle" font-size="8" fill="{color}" font-weight="700">{cnt}</text>')
    total = sum(c for _k, c in items)
    hub = (
        f'<circle cx="{hx}" cy="{hy}" r="{st["hub_r"]}" fill="#0f0f1a" stroke="{color}" stroke-width="{st["hub_sw"]}" filter="url(#glow)"/>'
        f'<text x="{hx}" y="{hy+st["emoji_dy"]}" text-anchor="middle" font-size="{st["emoji_fs"]}">{emoji}</text>'
        f'<text x="{hx}" y="{hy+st["label_dy"]}" text-anchor="middle" font-size="9.5" fill="{color}" font-weight="700">{label}</text>'
        f'<text x="{hx}" y="{hy+st["sub_dy"]}" text-anchor="middle" font-size="{st["sub_fs"]}" fill="{color}" opacity="0.85">{len(items)} {unit_noun}(s) · {total} real {count_noun}(s)</text>'
        f'<text x="{hx}" y="{hy+st["sub_dy"]+11}" text-anchor="middle" font-size="8" fill="{color}" opacity="0.65">🔽 jump to this unit\'s own Infra bubble system ↗</text>'
    ) if link_href else (
        f'<circle cx="{hx}" cy="{hy}" r="{st["hub_r"]}" fill="#0f0f1a" stroke="{color}" stroke-width="{st["hub_sw"]}" filter="url(#glow)"/>'
        f'<text x="{hx}" y="{hy+st["emoji_dy"]}" text-anchor="middle" font-size="{st["emoji_fs"]}">{emoji}</text>'
        f'<text x="{hx}" y="{hy+st["label_dy"]}" text-anchor="middle" font-size="9.5" fill="{color}" font-weight="700">{label}</text>'
        f'<text x="{hx}" y="{hy+st["sub_dy"]}" text-anchor="middle" font-size="{st["sub_fs"]}" fill="{color}" opacity="0.85">{len(items)} {unit_noun}(s) · {total} real {count_noun}(s)</text>'
    )
    if link_href:
        nodes.append(f'<a href="{link_href}" class="drill-link"><g class="node">{hub}</g></a>')
    else:
        nodes.append(f'<g class="node">{hub}</g>')
    return edges, nodes


def _bubble_leaf_svg(x, y, r, color, icon, label, sub):
    """One real leaf node for render_bubble_row() below — a small circle
    (icon centered) with a 2-line label underneath. Deliberately plain
    text truncation, not CSS ellipsis (SVG <text> has no text-overflow),
    with the FULL untruncated string kept in a real <title> tooltip so
    nothing is silently lost, just visually shortened."""
    def _cut(s, n):
        s = s or ''
        return s if len(s) <= n else s[:n - 1] + '…'
    lbl, sub_s = _cut(label, 17), _cut(sub, 24)
    title = f'<title>{label}{(" — " + sub) if sub else ""}</title>' if (label or sub) else ''
    return (
        f'{title}'
        f'<circle cx="{x}" cy="{y}" r="{r}" fill="#0f0f1a" stroke="{color}" stroke-width="2.5"/>'
        f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="15">{icon}</text>'
        f'<text x="{x}" y="{y+r+13}" text-anchor="middle" font-size="9.5" fill="{color}" font-weight="700">{lbl}</text>'
        f'<text x="{x}" y="{y+r+24}" text-anchor="middle" font-size="8" fill="#8a8a9a">{sub_s}</text>'
    )


def render_bubble_row(hub, leaves, edge_fn, markers_fn, leaf_r=25, width=1180, emit_defs=True):
    """A real, self-contained radial hub-and-spoke SVG panel: one hub
    node (a unit, or a river/module one level further into a drill-
    down) with its own real leaves fanned out in a row beneath it,
    connected by the exact same dashed glow-edge visual language
    render_evidence_bubble() already established (reused here via the
    caller's own `_curved_edge`/`_build_markers`, never re-derived —
    rule 8; both now live in THIS file, see the note above).

    G106 (Aug 26 2026) — Alex's own direct correction on a screenshot of
    galaxy_map_connectors.html's flat `.idd-bub` card-grid drill-down:
    "these are well done, but it should be the same bubble system as in
    level 2 and 3, i think inters should have bubble systems too."
    render_infra_drilldown() below now renders every one of its 3 real
    levels (unit→rivers, river→modules, module→functions) this way —
    the same real diagram Alex already sees at Level 2/Current, not a
    second, plainer visual language for the exact same relationship.

    hub    — dict(icon, label, color)
    leaves — [dict(id, icon, label, sub, color, href=None, css_class='',
              data={...}), ...]. No `href` = a real in-page reveal (the
              caller's own existing click-to-reveal JS still drives it,
              matched on `css_class`/`data-*` exactly as before); a real
              `href` = a real migration bubble link, same convention
              `render_evidence_bubble()` already uses.

    emit_defs — G106 real fix: every panel embedding its OWN <defs>
              (glow/edgeglow filters + per-color markers) produced
              duplicate ids whenever more than one panel renders on the
              same page (every real infra drilldown has L1 + one L2 pane
              per river + one L3 pane per module — dozens of panels).
              Harmless in practice (every <defs> block is byte-identical
              for the same color, so `url(#glow)` resolving to whichever
              copy is first in the DOM renders identically either way),
              but real duplicate ids are still invalid markup worth
              closing properly rather than accepting as a shrug. The
              real fix: since every color any L2/L3 panel could ever use
              is already a subset of L1's own hub+leaf colors (a river's
              L2/L3 panels are always colored that SAME river's color,
              which is already one of L1's own river leaves), only the
              FIRST render_bubble_row() call on a page (L1) needs
              emit_defs=True — every later panel passes emit_defs=False
              and safely references the defs L1 already put in the DOM.

    Returns '' for zero leaves (no bubble, matching render_evidence_
    bubble()'s own "no real evidence, no bubble" rule)."""
    n = len(leaves)
    if n == 0:
        return ''
    hub_r, row_y, hub_y = 32, 150, 46
    spacing = 150 if n <= 6 else max(92, min(150, (width - 140) / (n - 1)))
    total_w = spacing * (n - 1) if n > 1 else 0
    start_x = max(width / 2 - total_w / 2, 90)
    real_w = max(width, start_x * 2 + total_w)
    hx = real_w / 2
    edges, nodes = [], []
    colors_used = {hub['color']}
    for i, leaf in enumerate(leaves):
        lx = start_x + i * spacing if n > 1 else hx
        colors_used.add(leaf['color'])
        edges.append(edge_fn(lx, row_y, hx, hub_y, leaf['color'], real=True, dashed=True,
                              r1=leaf_r, r2=hub_r, offset_mult=0.28))
        body = _bubble_leaf_svg(lx, row_y, leaf_r, leaf['color'], leaf['icon'],
                                 leaf.get('label', ''), leaf.get('sub', ''))
        attrs = ''.join(f' data-{k}="{v}"' for k, v in (leaf.get('data') or {}).items())
        cls = leaf.get('css_class', '')
        if leaf.get('href'):
            nodes.append(f'<a href="{leaf["href"]}" class="{cls}"{attrs}><g>{body}'
                         f'<text x="{lx}" y="{row_y+leaf_r+35}" text-anchor="middle" font-size="7.5" '
                         f'fill="#C9A84C" font-weight="700">🔽 jump ↗</text></g></a>')
        elif leaf.get('dead'):
            # A real, honestly-dead leaf — this module genuinely has no
            # destination page (no river home for it). Non-clickable,
            # dimmed, and says so, rather than a link that would 404 or
            # a pointer cursor implying an interaction that isn't real.
            nodes.append(f'<g class="{cls}"{attrs} opacity="0.55">{body}'
                         f'<text x="{lx}" y="{row_y+leaf_r+35}" text-anchor="middle" font-size="7" '
                         f'fill="#8a8a9a">{leaf.get("note", "no destination")}</text></g>')
        else:
            nodes.append(f'<g class="{cls}"{attrs} style="cursor:pointer">{body}</g>')
    hub_svg = (
        f'<circle cx="{hx}" cy="{hub_y}" r="{hub_r}" fill="#0f0f1a" stroke="{hub["color"]}" '
        f'stroke-width="3" filter="url(#glow)"/>'
        f'<text x="{hx}" y="{hub_y+6}" text-anchor="middle" font-size="19">{hub["icon"]}</text>'
        f'<text x="{hx}" y="{hub_y+hub_r+16}" text-anchor="middle" font-size="10.5" '
        f'fill="{hub["color"]}" font-weight="700">{hub["label"]}</text>'
    )
    height = row_y + leaf_r + 46
    defs_block = ''
    if emit_defs:
        defs = (
            '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">'
            '<feGaussianBlur stdDeviation="4" result="blur"/>'
            '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            '<filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%">'
            '<feGaussianBlur stdDeviation="1.4" result="blur"/>'
            '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            + markers_fn(colors_used)
        )
        defs_block = f'<defs>{defs}</defs>'
    return (f'<div class="canvas-wrap"><svg viewBox="0 0 {real_w} {height}" width="100%" '
            f'style="max-width:{real_w}px;display:block;margin:0 auto">'
            f'{defs_block}{"".join(edges)}{"".join(nodes)}<g>{hub_svg}</g></svg></div>')


# ---------------------------------------------------------------------
# G83 (Aug 25 2026) — the shared INFRA BUBBLE SYSTEM mechanism.
#
# Alex's own words, after clicking the Supabase L0 unit and being handed
# a flat facet list: "supabase should have a level 1 showing which
# rivers, then level 2 for which modules, then level 3 for currents, so
# migration bubbles can be established in one supabase bubble system,
# while also tying all levels and rivers for the supabase infra bubble
# system. this should be standard for all infra bubble systems for l0
# items."
#
# So the STRUCTURE lives here, not in galaxy_map_supabase.py: the next
# L0 unit that gets its own infra bubble system (Skills, Oversight Docs,
# External AI, …) has a different EVIDENCE source but the identical
# river -> module -> function question to answer, and re-deriving that
# filtering per page is exactly the rule-8 duplication this project
# keeps paying for. Only the evidence set and the leaf's own destination
# are per-unit; everything between them is shared.
#
# Honest scope limit, stated rather than papered over: a real module can
# genuinely have no river. RIVER_MODULES' own documented cross-cutting
# exclusions (config/dashDeck/errorLog/questEngine and friends) are real
# modules with real evidence and no river home by design, so they are
# returned SEPARATELY instead of being dropped (which would understate
# the evidence) or force-fitted into some river (which would be a lie).


def build_infra_drilldown(evidence_by_resource):
    """Real river -> module -> function drill-down over any per-function
    evidence set shaped like compute_all_supabase_table_touches().

    evidence_by_resource — {resource: [(module, func, detail), ...]}
        e.g. {'taxonomy_tree': [('phylumPath', '_insertNewSteps',
        'secureWrite'), ...]}. `resource` and `detail` are opaque here;
        only `module`/`func` are interpreted.

    Returns (drill, orphans):
        drill   = {river_num: {module: {func: [(resource, detail), ...]}}}
        orphans = {module: {func: [(resource, detail), ...]}}

    Every level is filtered to genuinely-present evidence — a river with
    no touching module never appears, a module with no touching function
    never appears. Everything is sorted so a fresh process re-run is
    byte-identical (R5)."""
    river_of = {}
    for r, mods in RIVER_MODULES.items():
        for m in mods:
            river_of[m] = r
    drill, orphans = {}, {}
    for resource in sorted(evidence_by_resource):
        for module, func, detail in sorted(evidence_by_resource[resource]):
            r = river_of.get(module)
            bucket = orphans if r is None else drill.setdefault(r, {})
            bucket.setdefault(module, {}).setdefault(func, []).append((resource, detail))
    return drill, orphans


def infra_drilldown_counts(drill, orphans=None):
    """Real, flat counts for one drill-down — used both to label the
    levels and to gate a build against its own rendering (a page that
    renders a different number of leaves than the detector actually
    found is a page telling two different truths)."""
    orphans = orphans or {}
    def _walk(mods):
        f = sum(len(fs) for fs in mods.values())
        res = {r for fs in mods.values() for pairs in fs.values() for r, _d in pairs}
        return len(mods), f, res
    n_mod = n_fn = 0
    res = set()
    for mods in drill.values():
        a, b, c = _walk(mods)
        n_mod += a
        n_fn += b
        res |= c
    a, b, c = _walk(orphans)
    return {
        'rivers': len(drill), 'modules': n_mod, 'functions': n_fn,
        'resources': len(res | c),
        'orphan_modules': a, 'orphan_functions': b,
    }


INFRA_DRILLDOWN_CSS = '''
.idd{max-width:1400px;margin:12px auto 0;padding:0 24px}
.idd-crumb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11px;font-weight:700;padding:8px 10px;margin-bottom:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px}
.idd-crumb span{padding:3px 9px;border-radius:10px;background:rgba(255,255,255,0.05);color:#8a8a9a}
.idd-crumb span.on{color:#0a0a0f;background:#C9A84C}
.idd-crumb .idd-sep{background:none;padding:0;color:#55555f}
.idd-lvl{margin-bottom:16px}
.idd-lbl{font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#8a8a9a;margin-bottom:8px}
.idd-row{display:flex;flex-wrap:wrap;gap:10px}
.idd-bub{--c:#8a8a9a;min-width:190px;flex:0 1 230px;background:rgba(255,255,255,0.03);border:2px solid var(--c);border-radius:16px;padding:11px 13px;cursor:pointer;transition:transform .15s,background .15s}
.idd-bub:hover{transform:translateY(-2px);background:rgba(255,255,255,0.07)}
.idd-bub.on{background:color-mix(in srgb, var(--c) 18%, transparent);box-shadow:0 0 0 2px var(--c)}
.idd-bub b{display:block;font-size:12px;color:var(--c)}
.idd-bub span{display:block;font-size:10.5px;color:#E2E2EC;margin-top:2px}
.idd-bub em{display:block;font-style:normal;font-size:9px;color:#8a8a9a;margin-top:5px}
.idd-pane{display:none}
.idd-pane.on{display:block}
.idd-hint{font-size:10.5px;color:#8a8a9a;padding:6px 2px}
.canvas-wrap{overflow-x:auto}
.idd .idd-river,.idd .idd-mod{transition:opacity .15s}
.idd .idd-river:hover,.idd .idd-mod:hover{opacity:0.8}
.idd .idd-river.on circle:first-of-type,.idd .idd-mod.on circle:first-of-type{stroke-width:4.5}
.idd-mig{display:block;text-decoration:none;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.12);border-left:3px solid var(--c,#C9A84C);border-radius:10px;padding:9px 12px;min-width:230px;flex:0 1 300px;transition:background .15s}
.idd-mig:hover{background:rgba(201,168,76,0.1)}
.idd-mig b{display:block;font-size:11px;color:#fff;font-family:'Cascadia Code','Fira Mono',monospace}
.idd-mig .idd-res{display:block;font-size:9.5px;color:#8a8a9a;margin-top:4px;line-height:1.5}
.idd-mig .idd-jump{display:block;font-size:9px;font-weight:700;color:#C9A84C;margin-top:6px}
.idd-mig.idd-dead{cursor:default;opacity:0.8}
.idd-mig.idd-dead .idd-jump{color:#8a8a9a}
'''

INFRA_DRILLDOWN_JS = '''
(function() {
  // G106 (Aug 26 2026) — real, pre-existing bug found while wiring the
  // new bubble panels in: a page rendering MORE THAN ONE real infra
  // drilldown at once (galaxy_map_connectors.html — 3 real ones,
  // Composio/Jina AI/Last.fm, one per connector tab) emitted 3 copies
  // of this exact script, and every copy did `document.querySelector
  // ('.idd')`/`document.getElementById('idd-c1'/'idd-l2'/...)` — global
  // lookups that ALWAYS resolve to the FIRST instance on the page
  // (duplicate ids besides). Only the first connector's own click
  // handlers ever attached to real elements; the other two connectors'
  // river/module bubbles were silently unwired the whole time — a real
  // bug that predates this session's own bubble-panel rewrite, just
  // never surfaced under headless verification until a 3-instance page
  // was actually click-tested. Fixed by scoping every lookup to
  // `document.currentScript.previousElementSibling` — the specific
  // `.idd` this exact script tag was written directly after — and by
  // switching the id-based `#idd-c1`/`#idd-c2`/`#idd-l2`/`#idd-l3`
  // selectors to real per-instance CLASS lookups scoped under that same
  // root, so no two instances can ever collide again regardless of how
  // many real drilldowns share one page.
  var root = document.currentScript.previousElementSibling;
  if (!root || !root.classList.contains('idd')) return;
  var c1 = root.querySelector('.idd-c1'), c2 = root.querySelector('.idd-c2');
  var l2wrap = root.querySelector('.idd-l2'), l3wrap = root.querySelector('.idd-l3');
  function panes(sel) { return root.querySelectorAll(sel); }
  function closeAll(sel) { panes(sel).forEach(function(p) { p.classList.remove('on'); }); }
  root.querySelectorAll('.idd-river').forEach(function(b) {
    b.addEventListener('click', function() {
      root.querySelectorAll('.idd-river').forEach(function(x) { x.classList.toggle('on', x === b); });
      root.querySelectorAll('.idd-mod').forEach(function(x) { x.classList.remove('on'); });
      closeAll('.idd-l2 .idd-pane');
      closeAll('.idd-l3 .idd-pane');
      var p = root.querySelector('.idd-l2 .idd-pane[data-river="' + b.dataset.river + '"]');
      if (p) p.classList.add('on');
      c1.textContent = b.dataset.crumb; c1.className = 'idd-c1 on';
      c2.textContent = ''; c2.className = 'idd-c2';
      l2wrap.scrollIntoView({behavior:'smooth', block:'nearest'});
    });
  });
  root.querySelectorAll('.idd-mod').forEach(function(b) {
    b.addEventListener('click', function() {
      root.querySelectorAll('.idd-mod').forEach(function(x) { x.classList.toggle('on', x === b); });
      closeAll('.idd-l3 .idd-pane');
      var p = root.querySelector('.idd-l3 .idd-pane[data-mod="' + b.dataset.mod + '"]');
      if (p) p.classList.add('on');
      c2.textContent = b.dataset.crumb; c2.className = 'idd-c2 on';
      l3wrap.scrollIntoView({behavior:'smooth', block:'nearest'});
    });
  });
})();
'''


# G108 (Aug 26 2026) — real, shared Full/Choice sub-toggle, Alex's own
# direct ask: "all infra inter should have map view with full/choice
# with full open at default when navigated to, and the table toggle
# able too, same with level 2 and 3." Full = everything expanded/
# visible at once (best for seeing the whole real wiring in one look).
# Choice = narrowed down to exactly one real object's own chain (best
# for tracing a single thing). Full is always the sub-default — the
# page-level Table/Map toggle each page already has (or gains) is
# UNCHANGED by this; this only governs what MAP VIEW shows once you're
# in it. One shared mechanism (rule 8), two real uses:
#   (a) Infra-drilldown pages (Oracle/Supabase/Connectors/Orchestrator
#       CC/Oversight Sync) — Choice is the EXISTING river->module->
#       function pane click-through, unchanged; Full force-opens every
#       `.idd-pane` at once via a CSS override, no picker needed (the
#       existing L1/L2 bubbles ARE the picker, by clicking them).
#   (b) Level 2/Current(L3)'s own evidence-bubble diagrams (Alex/
#       Oracle/Composio/Last.fm/Supabase/Jina AI/Decision/Load/Logic) —
#       these are flat SIBLING bubbles with no parent/child structure
#       to drill through, so Choice needs a real picker: a small button
#       per real evidence type actually present, only the picked one's
#       `.ev-group` shown at a time.
FULL_CHOICE_CSS = '''
.fc-bar{display:flex;gap:8px;align-items:center;margin:0 0 10px;flex-wrap:wrap}
.fc-btn{padding:5px 14px;border-radius:14px;font-size:10.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:#8a8a9a;border:1px solid rgba(255,255,255,0.12);user-select:none}
.fc-btn:hover{background:rgba(255,255,255,0.09)}
.fc-btn.active{background:#C9A84C;color:#1a1608;border-color:#C9A84C}
.fc-pick{display:none;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.fc-pick-btn{padding:4px 11px;border-radius:10px;font-size:9.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.04);border:1.5px solid var(--c,#8a8a9a);color:var(--c,#8a8a9a);user-select:none}
.fc-pick-btn:hover{background:color-mix(in srgb, var(--c,#8a8a9a) 14%, transparent)}
.fc-pick-btn.on{background:var(--c,#8a8a9a);color:#0a0a0f}
.fc-pick-hint{font-size:10px;color:#6a6a78;padding:2px 0 8px;width:100%}
/* (a) Infra-drilldown pages: Choice is the existing pane click-through
   (zero change); Full force-opens every real pane at once. */
.fc-scope.mode-full .idd-pane{display:block !important}
.fc-scope.mode-full .idd-hint{display:none}
/* (b) Level 2/3 evidence-bubble picker: Full shows every real
   `.ev-group` at once (today's existing behaviour, unchanged); Choice
   shows only the one currently picked. */
.fc-scope.mode-choice .fc-pick{display:flex}
.fc-scope.mode-choice .ev-group{display:none}
.fc-scope.mode-choice .ev-group.picked{display:inline}
/* An .ev-group wrapping a plain HTML block (Level 3's Tier 2 panels)
   needs block, not inline, or its own padding/border render squeezed
   to content width — a real HTML div and an SVG <g> both match
   `.ev-group.picked` above, so this more-specific override (2 classes
   + a tag qualifier beats 2 classes alone) fixes the div case only,
   leaving the SVG <g> case governed by the rule above unchanged. */
.fc-scope.mode-choice div.ev-group.picked{display:block}
'''

FULL_CHOICE_JS = '''
(function() {
  // Event delegation on document, not a per-instance script tag —
  // many real .fc-scope regions can share one page (every band-canvas
  // on Current, every connector tab on Connectors), and this handles
  // all of them with zero per-instance wiring.
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.fc-btn');
    if (btn) {
      var scope = btn.closest('.fc-scope');
      if (!scope) return;
      scope.classList.remove('mode-full', 'mode-choice');
      scope.classList.add('mode-' + btn.dataset.mode);
      scope.querySelectorAll('.fc-btn').forEach(function(b) { b.classList.toggle('active', b === btn); });
      return;
    }
    var pick = e.target.closest('.fc-pick-btn');
    if (pick) {
      var scope2 = pick.closest('.fc-scope');
      if (!scope2) return;
      var key = pick.dataset.key;
      scope2.querySelectorAll('.fc-pick-btn').forEach(function(x) { x.classList.toggle('on', x === pick); });
      scope2.querySelectorAll('.ev-group').forEach(function(g) { g.classList.toggle('picked', g.dataset.unit === key); });
    }
  });
})();
'''


def render_fc_bar(picker_items=None):
    """Returns the shared Full/Choice control HTML for one `.fc-scope`
    region — see FULL_CHOICE_CSS's own comment for the full design.

    picker_items — optional list of (key, icon, label, color) for real
    evidence-bubble TYPES actually present in this specific region.
    Omit for an Infra-drilldown page's own `.idd` region (its Choice
    mode is the existing click-through, no picker needed); pass it for
    Level 2/3's flat evidence-bubble diagrams, built ONLY from types
    with real evidence (the caller has already filtered — a picker
    button for a type with zero real bubbles here would be a dead
    control, never rendered)."""
    bar = ('<div class="fc-bar">'
           '<div class="fc-btn active" data-mode="full">🌌 Full</div>'
           '<div class="fc-btn" data-mode="choice">🎯 Choice</div>'
           '</div>')
    if not picker_items:
        return bar
    buttons = ''.join(
        f'<div class="fc-pick-btn" data-key="{key}" style="--c:{color}">{icon} {label}</div>'
        for key, icon, label, color in picker_items
    )
    return bar + f'<div class="fc-pick"><div class="fc-pick-hint">Pick one to see just its own chain:</div>{buttons}</div>'


def render_infra_drilldown(drill, orphans, unit_icon, unit_label,
                           leaf_link_fn, resource_emoji='🗄️',
                           orphan_label='Cross-cutting (no river)',
                           orphan_note='', esc=None,
                           edge_fn=_curved_edge, markers_fn=_build_markers,
                           unit_color='#C9A84C'):
    """Renders one real infra bubble system: Level 1 rivers -> Level 2
    modules -> Level 3 migration bubbles.

    leaf_link_fn(module) -> href, or None when that module genuinely has
    no destination page (returned as an honestly-dead bubble that says
    so, never a link that 404s). Every pane is pre-rendered into the
    static HTML rather than built by JS on click, deliberately: it keeps
    every real destination href greppable by this project's own
    link-integrity check, which is what has repeatedly caught dead
    `#mod-…` anchors.

    G106 (Aug 26 2026) — every one of the 3 levels now renders as a real
    SVG hub-and-spoke bubble panel (render_bubble_row(), which reuses
    render_evidence_bubble()'s own dashed-glow-edge visual language) in
    place of the old flat `.idd-bub` card grid — Alex's own direct ask,
    on a screenshot: "it should be the same bubble system as in level 2
    and 3, i think inters should have bubble systems too." The click-to-
    reveal interaction and every real destination href are UNCHANGED —
    only the visual language of the L1/L2 nodes moved from a div grid to
    a real bubble diagram; `INFRA_DRILLDOWN_JS` below still drives it,
    matched on the exact same `.idd-river`/`.idd-mod` classes and
    `data-river`/`data-mod`/`data-crumb` attributes as before (now living
    on SVG `<g>`/`<a>` elements instead of `<div>`s — both support
    `dataset` and click listeners identically)."""
    e = esc or (lambda s: (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
    resource_noun = 'table' if resource_emoji == '🗄️' else 'resource'

    def _res_line(pairs):
        seen = []
        for r, d in pairs:
            lab = f'{resource_emoji} {r} · {d}'
            if lab not in seen:
                seen.append(lab)
        return ' &nbsp;·&nbsp; '.join(e(s) for s in sorted(seen))

    def _mod_leaf(mod, fns, colour):
        n_res = len({r for pairs in fns.values() for r, _d in pairs})
        return dict(icon='🔽', label=mod, color=colour,
                    sub=f'{len(fns)} fn · {n_res} {resource_noun}(s)',
                    css_class='idd-mod', data={'mod': e(mod), 'crumb': e(mod)})

    def _leaf_pane(mod, fns, colour):
        href = leaf_link_fn(mod)
        leaves = []
        for fn in sorted(fns):
            res_line = _res_line(fns[fn])
            if href:
                leaves.append(dict(icon=resource_emoji, label=f'{mod}.{fn}()', color=colour,
                                    sub=res_line, href=href))
            else:
                leaves.append(dict(icon=resource_emoji, label=f'{mod}.{fn}()', color=colour,
                                    sub=res_line, dead=True,
                                    note='no Current Series page for this module'))
        hub = dict(icon='🔽', label=mod, color=colour)
        return (f'<div class="idd-pane" data-mod="{mod}">'
                + render_bubble_row(hub, leaves, edge_fn, markers_fn, emit_defs=False) + '</div>')

    l1_leaves, l2, l3 = [], [], []
    for r in sorted(drill):
        mods = drill[r]
        colour = RIVER_COLOR.get(r, '#8a8a9a')
        name = RIVER_NAME.get(r, f'River {r}')
        short = name.split('—')[-1].strip() if '—' in name else name
        head = name.split('—')[0].strip() if '—' in name else name
        n_fn = sum(len(f) for f in mods.values())
        n_res = len({res for fs in mods.values() for pairs in fs.values() for res, _d in pairs})
        l1_leaves.append(dict(icon='🌊', label=head, color=colour,
                               sub=f'{len(mods)} mod · {n_fn} fn · {n_res} {resource_noun}(s)',
                               css_class='idd-river', data={'river': r, 'crumb': e(head)}))
        r_hub = dict(icon='🌊', label=short, color=colour)
        l2.append(f'<div class="idd-pane" data-river="{r}">'
                  + render_bubble_row(r_hub, [_mod_leaf(m, mods[m], colour) for m in sorted(mods)],
                                       edge_fn, markers_fn, emit_defs=False) + '</div>')
        for m in sorted(mods):
            l3.append(_leaf_pane(m, mods[m], colour))
    if orphans:
        colour = '#8a8a9a'
        n_fn = sum(len(f) for f in orphans.values())
        n_res = len({res for fs in orphans.values() for pairs in fs.values() for res, _d in pairs})
        l1_leaves.append(dict(icon='⚙️', label=orphan_label, color=colour,
                               sub=f'{len(orphans)} mod · {n_fn} fn · {n_res} {resource_noun}(s)',
                               css_class='idd-river', data={'river': 'orphan', 'crumb': e(orphan_label)}))
        o_hub = dict(icon='⚙️', label=orphan_label, color=colour)
        l2.append('<div class="idd-pane" data-river="orphan">'
                  + render_bubble_row(o_hub, [_mod_leaf(m, orphans[m], colour) for m in sorted(orphans)],
                                       edge_fn, markers_fn, emit_defs=False) + '</div>')
        for m in sorted(orphans):
            l3.append(_leaf_pane(m, orphans[m], colour))

    c = infra_drilldown_counts(drill, orphans)
    unit_hub = dict(icon=unit_icon, label=unit_label, color=unit_color)
    # G108 continuation (Aug 26 2026) — Alex's own direct catch, on a
    # screenshot of Orchestrator CC's own drilldown (1 river, 1 module,
    # 4 functions): "no point in choice and full map since they are the
    # same and not cluttered. i think cluttered ones need the choice
    # one on top of full one." Real, evidence-gated fix: the Full/Choice
    # bar only renders when this specific unit's own real counts are
    # actually crowded enough for the two modes to look genuinely
    # different — more than one real river, or enough real leaves at
    # Level 3 that a single always-open view would be a lot to scan at
    # once. A small unit (like Orchestrator CC) renders in Full mode
    # permanently, with no toggle UI at all, rather than offering a
    # choice that changes nothing.
    is_cluttered = c['rivers'] > 1 or c['functions'] > 12
    fc_bar_html = render_fc_bar() if is_cluttered else ''
    return (
        f'<div class="idd fc-scope mode-full">'
        + fc_bar_html
        + f'<div class="idd-crumb"><span class="on">{unit_icon} {e(unit_label)}</span>'
        f'<span class="idd-sep">→</span><span class="idd-c1">pick a river</span>'
        f'<span class="idd-sep">→</span><span class="idd-c2"></span></div>'
        f'<div class="idd-lvl"><div class="idd-lbl">Level 1 · rivers that really touch {e(unit_label)} — '
        f'{c["rivers"]} of {TOTAL_ZONES} real rivers qualify</div>'
        + render_bubble_row(unit_hub, l1_leaves, edge_fn, markers_fn) + '</div>'
        f'<div class="idd-lvl idd-l2"><div class="idd-lbl">Level 2 · modules in that river with a real touch</div>'
        f'<div class="idd-hint">Pick a river above.</div>{"".join(l2)}</div>'
        f'<div class="idd-lvl idd-l3"><div class="idd-lbl">Level 3 · the real Currents (functions) that touch — '
        f'each is a migration bubble out to that module\'s own Current Series section</div>'
        f'<div class="idd-hint">Pick a module above.</div>{"".join(l3)}</div>'
        f'</div><script>{INFRA_DRILLDOWN_JS}</script>')


def inject_level_rail(html, current_file):
    """Mechanical post-process applied to an already-rendered page, right
    before it's written to disk — injects the real left-nav sidebar
    (see inject_left_nav() below), for every one of the ~20 pages that
    already call this one function (rule 8/11: zero other page script
    needed to change when the sidebar itself changes).

    Real removal, Aug 26 2026 — Alex's own direct ask: "get rid of
    these [the top level-rail bar]... i only want left nav now." The
    old top-of-page rail (`level_rail_html()`/`LEVEL_RAIL_CSS`, a
    single-row L0→L1→L2→Current chain) is gone outright — the left-nav
    sidebar's own "🌌 Levels" section already covers the identical real
    navigation, sourced from the SAME LEVEL_RAIL data, so the rail was
    a second, always-visible copy of one thing. Function kept under its
    original name (only the docstring/body changed) since ~20 page
    scripts call it by this exact name as their one shared post-process
    hook — renaming it would be a purely cosmetic 20-file edit for zero
    real benefit. `galaxy_map_hub.py`'s own `<nav class="level-rail">`
    stripping regex (its own real de-dup step when building the hub
    index) is now a harmless no-op — nothing left to strip — left as-is
    rather than touched, since it costs nothing to keep and would still
    be correct if a rail-shaped element ever returned.

    G108 (Aug 26 2026) — same shared-hook reasoning now also carries the
    Full/Choice CSS/JS (FULL_CHOICE_CSS/FULL_CHOICE_JS above): every
    page that already calls this one function to get the sidebar gets
    the Full/Choice mechanism for free too, whether or not that specific
    page actually uses a `.fc-scope` region — harmless, unused CSS/JS on
    a page with no `.fc-scope` element, same precedent LEFT_NAV_CSS/JS
    already set."""
    if '.fc-bar{' not in html:
        if '</style>' in html:
            html = html.replace('</style>', FULL_CHOICE_CSS + '</style>', 1)
        else:
            html = html.replace('</head>', f'<style>{FULL_CHOICE_CSS}</style></head>', 1)
        if '</body>' in html:
            html = html.replace('</body>', f'<script>{FULL_CHOICE_JS}</script></body>', 1)
        else:
            html = html + f'<script>{FULL_CHOICE_JS}</script>'
    html = inject_left_nav(html, current_file)
    return html


# ---------------------------------------------------------------------
# G101 (Aug 25 2026) — the real left-nav sidebar tying Levels and
# Dimensions into one persistent hierarchy, per Alex's own direct ask
# and his own literal per-level annotation ("infra and rivers in level
# 1, modules and inter and infra in level 2, inter infra and currents
# in level 3"). Built entirely from data this project already computed
# for other real purposes — LEVEL_RAIL (the top rail), DIMENSION_PAGES/
# DIMENSION_KIND_META (the in-page Dimension index) — never a second,
# hand-typed copy (rule 8). Two real, separate categories of equal
# visual standing, per Alex's own confirmed architecture: "Levels" (the
# strict L0->L1->L2->Current containment chain) and "Dimensions" (real
# cross-cutting, multi-membership facets — deliberately NOT numbered
# rungs of the same ladder).
#
# Collapsed-by-default, overlay-on-expand (never a body margin-shift) —
# the same safe, already-proven RPGACE UI pattern this session's own
# CLAUDE.md documents elsewhere (a dev-status cluster that "starts
# collapsed... only opens when that button is pressed"), chosen
# specifically because this sidebar is being retrofitted onto 19
# already-shipped, independently-laid-out pages with no live browser
# available in this environment to visually confirm a pushed-content
# layout doesn't collide with any one of their own existing max-width/
# centered/fixed-canvas designs.
# G101 real correction (Aug 25 2026, Alex's own direct fix on the first
# build): "the main category is levels, then those level groups are
# split further within the level grouping, not separated like this" —
# Dimensions is NOT a 2nd sibling top-level category; each real
# Dimension page nests as a child of whichever Level it's genuinely
# relevant to. Real 2nd correction (Aug 26 2026, Alex: "too many
# repeats i dont like how it looks... keep it at highest possible point
# to make sense of it") — the original build repeated Infra-kind under
# L1/L2/L3 and Inter-kind under L2/L3, which read as noisy duplication.
# Fixed: every real dimension now appears EXACTLY ONCE, at the highest
# (most general) level where it's genuinely still relevant — Infra at
# L1 (the highest level Infra applies to, per G93's own rule), Inter at
# L2 (the highest level Inter applies to, since Rivers never get Inter),
# meta at L0 (whole-system synthesis, no river/module grain of its own).
LEFT_NAV_LEVEL_ANNOTATION = {
    'galaxy_map.html': None,
    'galaxy_map_river.html': 'Infra',
    'galaxy_map_module.html': 'Modules + Inter',
    'galaxy_map_current.html': 'Currents',
}
LEFT_NAV_LEVEL_KINDS = {
    'galaxy_map.html': ('meta',),
    'galaxy_map_river.html': ('infra',),
    'galaxy_map_module.html': ('inter',),
    'galaxy_map_current.html': (),
}

# G101, 3rd real correction, same day (Alex: "not just dimensions - a
# hierarchy, also include rivers as another division for needed level")
# — Rivers are the OTHER real division of the system (a strict one-
# module-one-home partition, per Dimensions' own definition text
# contrasting itself against exactly this), so they get their own
# nested list too, not just Dimension pages. Real anchor evidence
# checked before wiring, not assumed: galaxy_map_river.html (L1) itself
# has NO per-river id="river-N" anchors — it is one whole-system ring
# diagram with no deep-linkable sub-parts — while galaxy_map_module.html
# (L2) genuinely has all 17 real id="river-N" sections. So every river
# link here points at L2's own real anchor regardless of which level
# it's nested under; L1 gets the list because L1 itself has nothing to
# jump to internally, L2 gets it for same-page river-to-river jumping.
LEFT_NAV_LEVEL_RIVERS = {
    'galaxy_map_river.html': True,
    'galaxy_map_module.html': True,
}

LEFT_NAV_CSS = '''
.gside-toggle{position:fixed;top:50%;left:0;transform:translateY(-50%);z-index:10001;background:#C9A84C;color:#1a1a1f;border:none;border-radius:0 8px 8px 0;padding:16px 6px;font-size:13px;cursor:pointer;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:1.5px;font-weight:700;box-shadow:2px 0 10px rgba(0,0,0,0.4)}
.gside-toggle:hover{background:#ddbb5c}
.gside-nav{position:fixed;top:0;left:-300px;width:280px;height:100vh;overflow-y:auto;background:#0a0a0f;border-right:1px solid rgba(255,255,255,0.12);z-index:10000;transition:left .2s ease;padding:18px 16px 40px;box-shadow:4px 0 28px rgba(0,0,0,0.55)}
.gside-nav.open{left:0}
.gside-nav h3{font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#8a8a9a;margin:20px 0 8px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07)}
.gside-nav h3:first-child{margin-top:0;padding-top:0;border-top:none}
.gside-def{font-size:10px;color:#7a7a88;line-height:1.6;margin-bottom:10px}
.gside-level{display:block;text-decoration:none;padding:7px 9px;border-radius:7px;margin-bottom:2px}
.gside-level:hover{background:rgba(255,255,255,0.05)}
.gside-level.active{background:rgba(201,168,76,0.16)}
.gside-level b{display:block;font-size:12.5px;color:#E2E2EC}
.gside-level span{display:block;font-size:9px;color:#6a6a78;margin-top:2px}
.gside-dim{display:block;text-decoration:none;padding:6px 9px;border-radius:7px;margin-bottom:2px;border-left:2px solid transparent}
.gside-dim:hover{background:rgba(255,255,255,0.05)}
.gside-dim.active{background:rgba(201,168,76,0.16)}
.gside-dim b{display:block;font-size:11.5px;color:#E2E2EC}
.gside-dim .gside-kind{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
.gside-dim .gside-desc{display:block;font-size:9px;color:#6a6a78;line-height:1.5;margin-top:1px}
.gside-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9999;display:none}
.gside-backdrop.open{display:block}
/* G101 real correction — Levels is the one main category; each level's
   own genuinely-relevant Dimension pages nest directly beneath it. */
.gside-levelgroup{margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.05)}
.gside-levelgroup:last-child{border-bottom:none}
.gside-nested{margin:2px 0 2px 14px;padding-left:8px;border-left:1px solid rgba(255,255,255,0.08)}
.gside-subhead{font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#55555f;margin:6px 0 2px 14px}
.gside-river{display:block;text-decoration:none;padding:4px 9px;border-radius:6px;margin-bottom:1px;border-left:2px solid transparent;font-size:10.5px}
.gside-river:hover{background:rgba(255,255,255,0.05)}
.gside-river b{font-weight:400;color:#b8b8c4}
.gside-rivers{max-height:320px;overflow-y:auto}
.gside-river-mod{margin-left:14px;font-size:9.5px;opacity:.85}
.gside-river-mod b{color:#8a8a98}
.gside-river-empty{color:#55555f;font-style:italic;padding:2px 9px 4px}
'''

LEFT_NAV_JS = '''
(function() {
  var toggle = document.querySelector('.gside-toggle');
  var nav = document.querySelector('.gside-nav');
  var backdrop = document.querySelector('.gside-backdrop');
  if (!toggle || !nav) return;
  function setOpen(open) {
    nav.classList.toggle('open', open);
    if (backdrop) backdrop.classList.toggle('open', open);
  }
  toggle.addEventListener('click', function() { setOpen(!nav.classList.contains('open')); });
  if (backdrop) backdrop.addEventListener('click', function() { setOpen(false); });
})();
'''


def _left_nav_dim_row(entry, current_file):
    fname, icon, label, kind, desc = entry
    cls = ' active' if fname == current_file else ''
    kicon, klabel, kcolor = DIMENSION_KIND_META[kind]
    return (
        f'<a class="gside-dim{cls}" href="{fname}" style="border-left-color:{kcolor}" title="{klabel}">'
        f'<b>{icon} {label}</b> <span class="gside-kind" style="color:{kcolor}">{kicon} {kind}</span>'
        f'<span class="gside-desc">{desc}</span></a>'
    )


def left_nav_html(current_file):
    """Renders the real left-nav sidebar — ONE main category, Levels
    (the strict L0-L3 containment chain, LEVEL_RAIL's own data), each
    level split further to nest its own genuinely-relevant real
    Dimension pages directly beneath it (LEFT_NAV_LEVEL_KINDS — see
    that dict's own comment for the real G93/G94-grounded reasoning).
    Dimensions is NOT a second sibling category — Alex's own direct
    correction on the first build. Same real DIMENSION_PAGES/
    DIMENSION_KIND_META data every in-page Dimension index already
    uses — never a second copy (rule 8); a dimension whose kind is
    relevant at 2-3 levels genuinely appears that many times, which is
    the honest shape of "Infra is relevant at every granularity,
    Inter only where Rivers' own Infra-only rule allows it" — not
    duplication for its own sake."""
    dims_by_kind = {}
    for entry in DIMENSION_PAGES:
        dims_by_kind.setdefault(entry[3], []).append(entry)

    def _river_rows():
        rows = []
        for r in sorted(RIVER_NAME):
            name = RIVER_NAME[r].split('—')[0].strip()
            color = RIVER_COLOR.get(r, '#8a8a9a')
            rows.append(
                f'<a class="gside-river" href="galaxy_map_module.html#river-{r}" '
                f'style="border-left-color:{color}"><b>🌊 {name}</b></a>'
            )
        return ''.join(rows)

    # G101, 4th real correction (Aug 26 2026, Alex: "get rid of the
    # duplicate scroll down list - divide modules by river as category,
    # so river 1 - then under its module, then sub head river 2 -
    # smaller sub head module etc.") — the previous build rendered TWO
    # separate flat lists back to back under L2 (all 17 rivers, then
    # all 45 modules alphabetically with no river context), which read
    # as a duplicated, disconnected scroll. Real fix: one single nested
    # list — each river is its own sub-heading, its own real
    # RIVER_MODULES members render directly beneath it, repeated per
    # river in river-number order. Rivers with zero tracked modules
    # (the 5 real retired categories, RIVER_RETIRED) still get their own
    # sub-heading with an honest "— no modules —" note rather than being
    # silently skipped, so the river numbering stays visibly complete.
    def _river_module_nested_rows():
        rows = []
        for r in sorted(RIVER_NAME):
            name = RIVER_NAME[r].split('—')[0].strip()
            color = RIVER_COLOR.get(r, '#8a8a9a')
            rows.append(
                f'<a class="gside-river" href="galaxy_map_module.html#river-{r}" '
                f'style="border-left-color:{color}"><b>🌊 River {r}: {name}</b></a>'
            )
            mods = RIVER_MODULES.get(r, [])
            if mods:
                for m in sorted(mods):
                    rows.append(
                        f'<a class="gside-river gside-river-mod" '
                        f'href="galaxy_map_current.html#mod-{m}">'
                        f'<b>🔽 {m}</b></a>'
                    )
            else:
                rows.append('<span class="gside-river gside-river-mod gside-river-empty">— no modules —</span>')
        return ''.join(rows)

    level_blocks = []
    for fname, icon, label in LEVEL_RAIL:
        cls = ' active' if fname == current_file else ''
        annot = LEFT_NAV_LEVEL_ANNOTATION.get(fname)
        sub = f'<span>{annot}</span>' if annot else ''
        head = f'<a class="gside-level{cls}" href="{fname}"><b>{icon} {label}</b>{sub}</a>'
        nested = ''
        if fname == 'galaxy_map_module.html':
            # L2 gets the ONE combined river->module nested list (rivers
            # and modules were previously two separate flat lists here).
            nested += (
                '<div class="gside-subhead">🌊 Rivers &amp; Modules</div>'
                f'<div class="gside-nested gside-rivers">{_river_module_nested_rows()}</div>'
            )
        elif LEFT_NAV_LEVEL_RIVERS.get(fname):
            # L1 (galaxy_map_river.html) has no per-module content of
            # its own to jump to — plain river list only.
            nested += (
                '<div class="gside-subhead">🌊 Rivers</div>'
                f'<div class="gside-nested gside-rivers">{_river_rows()}</div>'
            )
        dim_nested = ''.join(
            _left_nav_dim_row(entry, current_file)
            for kind in LEFT_NAV_LEVEL_KINDS.get(fname, ())
            for entry in dims_by_kind.get(kind, ())
        )
        if dim_nested:
            nested += (
                '<div class="gside-subhead">🌌 Dimensions</div>'
                f'<div class="gside-nested">{dim_nested}</div>'
            )
        level_blocks.append(f'<div class="gside-levelgroup">{head}{nested}</div>')

    return (
        '<button class="gside-toggle" type="button" aria-label="Open Galaxy Map navigation">MAP ▸</button>'
        '<div class="gside-backdrop"></div>'
        '<nav class="gside-nav">'
        '<h3>🌌 Levels</h3>'
        '<div class="gside-def">A Dimension is a real cross-cutting facet — the same modules and functions, '
        'seen through one lens. Deliberately <b>multi-membership</b>: a module can sit in several at once, '
        'which is exactly why a Dimension is never a numbered River (a River is a strict one-module-one-home '
        'partition). Nested under whichever Level(s) it\'s genuinely relevant to, not a separate category.</div>'
        + ''.join(level_blocks) +
        '</nav>'
    )


def inject_left_nav(html, current_file):
    """Mechanical post-process — same discipline as inject_level_rail()
    itself (which calls this), purely additive, injected once per
    build. Called automatically by inject_level_rail() for all 19
    existing call sites; not meant to be called standalone."""
    if '.gside-nav{' not in html:
        if '</style>' in html:
            html = html.replace('</style>', LEFT_NAV_CSS + '</style>', 1)
        else:
            html = html.replace('</head>', f'<style>{LEFT_NAV_CSS}</style></head>', 1)
    nav = left_nav_html(current_file)
    m = re.search(r'(<body[^>]*>)', html)
    if m:
        after = html[m.end():m.end() + 4000]
        if 'class="gside-nav"' not in after:
            html = html[:m.end()] + '\n' + nav + html[m.end():]
    if '</body>' in html:
        marker = '<script>' + LEFT_NAV_JS + '</script></body>'
        if marker not in html:
            html = html.replace('</body>', marker, 1)
    return html


# ---------------------------------------------------------------------
# DD7 (Aug 23 2026) — live in-flight plan overlay for the Galaxy Map.
#
# Alex's own ask: "i would also like bubble systems of changed aspects to
# always reflect in galaxy map, so it auto updates visuals too." This is
# the trickle-UP complement to DD1: DD1 tags every ceo_plan_items row with
# real Galaxy Map identifiers (galaxy_river / galaxy_modules /
# galaxy_level / galaxy_dimensions / galaxy_facet_kind); this reads those
# same tags back and shows, ON the map, what plan work is touching a view
# right now.
#
# WHY A LIVE FETCH RATHER THAN THE REGEN PIPELINE (the load-bearing
# reason, per rule 8): code STRUCTURE is regenerated truth and rightly
# comes from this pipeline. "Which plan item is mid-build against this
# river" changes several times a day and has no business triggering a
# 22-page regeneration — it is exactly the case already settled for
# future_integrations.html and smoke_test.html, so it reuses their exact
# fetch shape (same SB_URL / SB_KEY / HEADERS / esc()) rather than
# inventing a second idiom.
#
# WHY IT LIVES HERE AND NOT IN THE 4 PAGES' HTML: those pages are
# generated and idempotent (verified — re-running a page script
# reproduces a byte-identical file), so a hand-edit to the HTML would be
# silently wiped on the next regeneration. That is precisely the stale-
# drift class the DD plan exists to kill, so the overlay is injected at
# the same mechanical post-process point inject_level_rail() already
# owns, and every page script gets it by calling one shared function.
#
# HONEST SCOPE, stated rather than smoothed over: per-node badges are
# only drawn where a page has a real, stable handle to hang one on —
# galaxy_map.html's [data-unit] nodes and galaxy_map_dimensions.html's
# .modname cells. galaxy_map_river.html and galaxy_map_logic_dimension.html
# have no per-river DOM handle (their rivers are SVG text / prose
# headings), so those get the scoped panel only, and the panel says so.
# Inventing markup on those two pages purely to hang a badge from would
# be a real change to their generators for a cosmetic gain — not done.
PLAN_OVERLAY_CSS = """
.plan-fab{position:fixed;right:14px;bottom:14px;z-index:9999;font-family:inherit}
.plan-fab-btn{background:#14141f;border:1px solid rgba(201,168,76,0.45);color:#C9A84C;border-radius:20px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.45)}
.plan-fab-btn[hidden]{display:none}
.plan-fab-panel{display:none;margin-top:8px;width:330px;max-height:60vh;overflow-y:auto;background:#0f0f1a;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,0.6)}
.plan-fab-panel.open{display:block}
.plan-fab-panel h4{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;margin:0 0 4px}
.plan-fab-scope{font-size:10.5px;color:#9a9aa8;margin-bottom:10px;line-height:1.5}
.plan-fab-plan{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9B59B6;margin:10px 0 5px}
.plan-fab-item{font-size:11.5px;line-height:1.5;color:#e2e2ec;padding:6px 8px;margin-bottom:5px;border-radius:7px;background:rgba(255,255,255,0.03);border-left:3px solid #6b7280}
.plan-fab-item.red{border-left-color:#E25454}
.plan-fab-item.yellow{border-left-color:#E0C450}
.plan-fab-item.blue{border-left-color:#4A90E2}
.plan-fab-item.purple{border-left-color:#9B59B6}
.plan-fab-item .code{font-weight:700;color:#C9A84C}
.plan-fab-item .meta{display:block;font-size:9.5px;color:#8a8a98;margin-top:3px}
.plan-badge{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:9px;font-size:9px;font-weight:700;background:rgba(201,168,76,0.16);color:#C9A84C;border:1px solid rgba(201,168,76,0.4);cursor:help;vertical-align:middle}
"""

PLAN_OVERLAY_TEMPLATE = r"""
<div class="plan-fab">
  <button class="plan-fab-btn" id="plan-fab-btn" hidden></button>
  <div class="plan-fab-panel" id="plan-fab-panel"></div>
</div>
<script>
(function(){
  /* Same fetch shape as future_integrations.html / smoke_test.html
     (rule 8) - one idiom for reading ceo_plan_items, not three. */
  var SB_URL='https://gripopghczmrbrhqtqbm.supabase.co';
  var SB_KEY='sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf';
  var HEADERS={apikey:SB_KEY,Authorization:'Bearer '+SB_KEY};
  var SCOPE='__SCOPE__';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function arr(v){if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}return (v&&v.length)?v:[];}

  /* Real L0 unit id -> the DD1 dimension name that genuinely represents
     that unit. Not invented: these are the exact dimension strings DD1
     writes, and the exact unit ids galaxy_map.py's own UNIT_ORDER uses. */
  var UNIT_DIM={supabase:['Supabase'],skills:['Skills'],
    oversight_docs:['Oversight Sync'],alex:['UI/Alex-Accessibility','Decision/Human-Gate'],
    openmontage_cc:['Orchestrator↔OpenMontage']};
  /* 'external_ai' retired as a unit id (Aug 25 2026, G99) -- its
     smoke_test dimension tag ("Externals") is about the connector-
     classification PAGE, which stays live, not about the new "oracle"
     unit specifically. No real "Oracle" dimension tag exists in
     smoke_test_items yet, so no fabricated mapping is added here — a
     real future smoke_test row tagged that way would need this map
     extended then, not guessed now. */

  function itemsForUnit(items,unit){
    if(unit==='rpgace_architecture'){
      return items.filter(function(i){return /^River /.test(i.galaxy_river||'');});
    }
    var dims=UNIT_DIM[unit]; if(!dims) return [];
    return items.filter(function(i){
      var d=arr(i.galaxy_dimensions);
      return dims.some(function(x){return d.indexOf(x)>-1;});
    });
  }

  function badge(n,title){
    var b=document.createElement('span');
    b.className='plan-badge'; b.textContent='\u{1F527} '+n;
    b.title=title||(n+' in-flight plan item'+(n===1?'':'s')+' touching this');
    return b;
  }

  function decorate(items){
    var touched=0;
    if(SCOPE==='l0'){
      Array.prototype.forEach.call(document.querySelectorAll('[data-unit]'),function(el){
        if(el.querySelector&&el.querySelector('.plan-badge')) return;
        var n=itemsForUnit(items,el.getAttribute('data-unit')).length;
        if(!n) return;
        var host=(el.querySelector&&(el.querySelector('.unit-card')||el.querySelector('.unit-node-label')))||el;
        if(host.ownerSVGElement||(window.SVGElement&&host instanceof SVGElement)) return;
        host.appendChild(badge(n)); touched++;
      });
    } else if(SCOPE==='dimensions'){
      Array.prototype.forEach.call(document.querySelectorAll('.modname'),function(el){
        if(el.querySelector&&el.querySelector('.plan-badge')) return;
        var name=(el.textContent||'').trim();
        if(!name) return;
        var n=items.filter(function(i){return arr(i.galaxy_modules).indexOf(name)>-1;}).length;
        if(!n) return;
        el.appendChild(badge(n,n+' in-flight plan item'+(n===1?'':'s')+' naming module '+name));
        touched++;
      });
    }
    return touched;
  }

  function relevant(items){
    /* river/logic pages have no per-node handle, so the panel covers
       every item that names a real river - honestly stated in the panel. */
    if(SCOPE==='river'||SCOPE==='logic')
      return items.filter(function(i){return /^River /.test(i.galaxy_river||'');});
    if(SCOPE==='dimensions')
      return items.filter(function(i){return arr(i.galaxy_dimensions).length||arr(i.galaxy_modules).length;});
    return items;
  }

  var SCOPE_NOTE={
    l0:'Badges sit on each L0 unit whose real dimension a plan item touches.',
    dimensions:'Badges sit on each module named in a plan item’s galaxy_modules.',
    river:'This view has no per-river node to badge (its rivers are SVG text), so this panel lists every in-flight item that names a real river.',
    logic:'This view has no per-river node to badge (its rivers are prose headings), so this panel lists every in-flight item that names a real river.'
  };

  function render(plans,items){
    var rel=relevant(items);
    var btn=document.getElementById('plan-fab-btn');
    var panel=document.getElementById('plan-fab-panel');
    if(!btn||!panel) return;
    var nBadged=decorate(items);
    if(!rel.length){ btn.hidden=true; return; }
    btn.hidden=false;
    btn.textContent='\u{1F527} '+rel.length+' in-flight';
    var byPlan={}; rel.forEach(function(i){(byPlan[i.plan_id]=byPlan[i.plan_id]||[]).push(i);});
    var html='<h4>In-flight plan work</h4><div class="plan-fab-scope">Live from <code>ceo_plan_items</code> (non-green). '+
      esc(SCOPE_NOTE[SCOPE]||'')+(nBadged?' '+nBadged+' node'+(nBadged===1?'':'s')+' badged on this page.':'')+'</div>';
    (plans||[]).forEach(function(p){
      var rows=byPlan[p.id]; if(!rows||!rows.length) return;
      html+='<div class="plan-fab-plan">'+esc(p.name)+'</div>';
      rows.sort(function(a,b){return String(a.item_code).localeCompare(String(b.item_code));})
        .forEach(function(i){
          var meta=[i.galaxy_river,arr(i.galaxy_level).join('·'),arr(i.galaxy_dimensions).join(', '),i.galaxy_facet_kind]
            .filter(Boolean).join(' — ');
          html+='<div class="plan-fab-item '+esc(i.status)+'"><span class="code">'+esc(i.item_code)+
            '</span> '+esc(i.title)+(meta?'<span class="meta">'+esc(meta)+'</span>':'')+'</div>';
        });
    });
    html+='<div class="plan-fab-scope" style="margin-top:10px">Full detail: <a href="../future_integrations.html" style="color:#4A90E2">future_integrations.html</a></div>';
    panel.innerHTML=html;
    btn.addEventListener('click',function(){panel.classList.toggle('open');});
  }

  fetch(SB_URL+'/rest/v1/ceo_plans?select=id,name&order=created_at.asc',{headers:HEADERS})
    .then(function(r){return r.json();})
    .then(function(plans){
      if(!plans||!plans.length) throw new Error('no plans');
      var ids=plans.map(function(p){return p.id;}).join(',');
      return fetch(SB_URL+'/rest/v1/ceo_plan_items?plan_id=in.('+ids+')&status=neq.green&select=*&order=item_code.asc',{headers:HEADERS})
        .then(function(r){return r.json();})
        .then(function(items){render(plans,items||[]);});
    })
    .catch(function(){ /* offline / blocked: overlay stays hidden, page unaffected */ });
})();
</script>
"""


def plan_overlay_html(page_scope):
    """The real overlay markup + live-fetch script for one page scope.
    page_scope is one of: 'l0', 'river', 'dimensions', 'logic'."""
    return PLAN_OVERLAY_TEMPLATE.replace('__SCOPE__', page_scope)


def inject_plan_overlay(html, page_scope):
    """Additive post-process, applied at exactly the point
    inject_level_rail() is. Idempotent: re-running never stacks a second
    overlay, so a page script stays byte-identical across re-runs."""
    if 'plan-fab-btn' in html:
        return html
    if '.plan-fab{' not in html:
        if '</style>' in html:
            html = html.replace('</style>', PLAN_OVERLAY_CSS + '</style>', 1)
        else:
            html = html.replace('</head>', '<style>' + PLAN_OVERLAY_CSS + '</style></head>', 1)
    overlay = plan_overlay_html(page_scope)
    if '</body>' in html:
        return html.replace('</body>', overlay + '</body>', 1)
    return html + overlay


if __name__ == '__main__':
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('graphify-out/graph.html')
    graph_json = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('graphify-out/graph.json')
    if not target.exists():
        print(f'ERROR: {target} not found. Run `graphify export html` first.')
        sys.exit(1)
    if not graph_json.exists():
        print(f'ERROR: {graph_json} not found.')
        sys.exit(1)
    if not CORE_JS.exists():
        print(f'ERROR: {CORE_JS} not found - run from the repo root.')
        sys.exit(1)
    counts, n_modules, patched = river_group(target, graph_json)
    print(f'Parsed {n_modules} real module marker ranges from {CORE_JS}.')
    total = sum(counts.values())
    print(f'River-tagged {total} nodes across {len(counts)} rivers, each given a real fixed x/y inside its river zone:')
    for r in sorted(counts):
        print(f'  {RIVER_NAME[r]}: {counts[r]} nodes')
    print(f'nodesDS mapping patch: {"applied" if patched else "already present (no-op)"}')
