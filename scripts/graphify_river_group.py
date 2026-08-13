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
    5: '#4caf82',   # --green   River V   Two Independent Streams
    6: '#e8c96a',   # --gold2   River VI  The Judgment Chamber
    7: '#cc7a3a',   # --orange  River VII The Library Current
    8: '#5588ee',   # --mp-col  River VIII The Confluence Pool
    9: '#e05555',   # --hp-col  River IX  The Mirror and the Far Shore
    10: '#868db8',  # --muted   River X   The Confluence of Chronicles
    11: '#3a4570',  # --border2 River XI  Content Production Live
    # Aug 6, 3rd Engineer pass — 2 real, honest META zones, not rivers.
    # Alex's own real evidence-check request ("go through the list...
    # place closest to what it's connected to") surfaced 2 real families
    # of components that don't belong to any ONE river but do have a
    # real, checkable home: the shared API/auth layer, and RPGACE's own
    # dev-process material (oversight docs + Claude Code skills). Giving
    # them a real zone (not "Uncategorized," not forced into a river) is
    # more honest than either extreme.
    # --teal is real (minotaur_map.html/manual.html/patch_notes.html's
    # own shared oversight-doc :root palette — confirmed by grep, not
    # style.css's runtime palette, but an equally real, already-used
    # token elsewhere in this project — not fabricated).
    12: '#2ABFB0',  # --teal    Zone XII  The API / Auth Layer (shared infra)
    # Round 2 (this pass): Zone XIII split into 4 real sub-zones, same
    # file-path evidence as before, just finer-grained (a skill file and
    # a dated backlog .txt are both "dev process," but they aren't the
    # SAME kind of dev-process material). The old '#7a7a8a' was checked
    # against both style.css and the oversight-doc palette and matched
    # NEITHER — a real fabricated value, not sourced like this table's
    # own docstring claims elsewhere. Replaced with real tokens; the
    # last 2 are lower-saturation dark blues because that's genuinely
    # what's left unused in both real palettes once 11 rivers + Zone XII
    # + amber/text are already spoken for — not a guess, a real scarcity.
    13: '#E2A83D',  # --amber (minotaur/manual/patch_notes palette) Zone XIII  Skills
    14: '#d4daf5',  # --text (style.css)   Zone XIV  Oversight Docs
    15: '#20263a',  # --panel3 (style.css) Zone XV   Session Records / Backlog
    16: '#2a3050',  # --border (style.css) Zone XVI  Dev Tooling
}
RIVER_NAME = {
    1: "River I — Gatekeeper's Checkpoint",
    2: 'River II — The Great Confluence',
    3: 'River III — The Oracle Current',
    4: 'River IV — The Bookworm River',
    5: 'River V — Two Independent Streams',
    6: 'River VI — The Judgment Chamber',
    7: 'River VII — The Library Current',
    8: 'River VIII — The Confluence Pool',
    9: 'River IX — The Mirror and the Far Shore',
    10: 'River X — The Confluence of Chronicles',
    11: 'River XI — Content Production Live',
    12: 'River XII — The API / Auth Layer',
    13: 'River XIII — Skills',
    14: 'River XIV — Oversight Docs',
    15: 'River XV — Session Records / Backlog',
    16: 'River XVI — Dev Tooling',
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
TOTAL_ZONES = 16  # 16 unified rivers: I-XI (narrative info-flow) + XII-XVI (Total-systems/dev-process)

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
    {'name': 'librosa', 'status': 'optional/local', 'tested': False, 'via': 'beat_audio_jobs + beat-audio bucket, local_server.py',
     'bridges_to': 'Alex\'s own local machine, via local_server.py (not a hosted service)',
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
    12: 'The one river that carries literal runtime API traffic to external Total-system members — every OpenMontage/Kimi/Luna/librosa/OpenArt/Composio call routes through here (api/oracle.js, api/_context.js, api/data-write.js). File-path membership: `api/*.js`. See "Total-systems connectors" below for the real, per-connector detail.',
    13: 'The dispatch discipline every Total-system Claude Code session (RPGACE CC, Graphify CC, OpenMontage CC) runs against — file-path membership: `.claude/skills/`.',
    14: 'The shared truth layer Total-system members read from and write into (Graphify CC deposits real findings here via graphify_jobs when a row is flagged "please log to Chronicles"). File-path membership: the live-maintained doc set.',
    15: 'Real dispatch/session history — dated backlog `.txt`/`.md` at repo root, the same real record `openmontage_jobs`/`graphify_jobs` rows themselves become once resolved.',
    16: 'The actual scripts/config that build, ship, and graph the Total system — including the very scripts (graphify_recolor.py/graphify_river_group.py/graphify_to_obsidian.py/obsidian_vault_to_html.py) that generate this graph and the Obsidian vault themselves.',
}

# Real module -> river mapping, built from interconnection_map.md's own
# section headers (Oracle Pipeline / Taxonomy Tree Pipeline / Content
# Production Pipeline / Schedule System / the Unified placement engine /
# Chronicles / API auth / Claude Code fallback lane / OpenMontage handoff
# lane) cross-referenced against minotaur_map.html's own 11 river titles
# and rpgace_core.js's real 54 registered module names (grepped, not
# invented). Modules that are genuinely cross-cutting UI/infra
# (leftNav, popup scaffolding, voiceInput, perfWatch, pwaInstall,
# quickActions, docsLinks [dead], suppressQuestPopup, myFeature, config)
# are deliberately left OUT - they don't belong to one river, and
# force-fitting them would be dishonest, not "making mapping easier."
RIVER_MODULES = {
    1: ['authGate'],
    2: ['pathRouter'],
    3: ['oracleAppGrounding', 'oracleTreeGrounding', 'oracleFetchGuard',
        'oracleDevBridge', 'mockOracle', 'agentsIntoOracle', 'prodOraclePanel',
        'instaOraclePanel', 'youtubeOracle', 'tiktokOracle', 'scheduleOracle',
        'feynman'],
    4: ['bookworm'],
    5: ['researchTabs', 'intelBatchList', 'intelDelete', 'intelDedup',
        'ciAutoPropose', 'scheduleFixes', 'shiftSync', 'agendaReminder',
        'morningBrief', 'journalQoL'],
    6: ['phylumPath'],
    7: ['jargonEncyclopedia', 'encyclopediaQoL', 'encSync', 'encTaxonomyLink',
        'refCorpus'],
    8: ['taxonomyReviewQueue', 'taxonomySync', 'taxonomyTree'],
    9: ['knowledgeGap'],
    10: ['chroniclesLog', 'careerStatCard'],
    11: ['contentProductionLive', 'beatLog', 'videoPipeline', 'videoSummary',
         'conidPot', 'contentRepurpose', 'visualOracle'],
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
    {'key': 'research', 'label': '🧠 Research Lab', 'rivers': [5],
     'via': "dashDeck._openResearch() -> researchTabs/intelBatchList etc"},
    {'key': 'bookworm', 'label': '📖 Bookworm', 'rivers': [4],
     'via': "dashDeck._openBookworm() -> bookworm module"},
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
    {'key': 'oversight', 'label': '📚 Oversight', 'rivers': [14],
     'via': "dashDeck._openOversight() -> Zone/River XIV, the shared oversight-doc truth layer"},
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
    {'name': 'Graphify CC', 'rivers': [9, 14],
     'via': "Dispatched from River IX's own session-start check, deposits real findings into River XIV via graphify_jobs"},
    {'name': 'Jina AI', 'rivers': [3, 4],
     'via': 'Load-bearing for Bookworm URL ingestion (River IV), Schedule Oracle + chat-pasted-URL handling (River III)'},
    {'name': 'Last.fm', 'rivers': [7],
     'via': "refCorpus.findMatches()'s real fallback (River VII), grows the corpus from its own results"},
    {'name': 'Whisper (OpenAI, local)', 'rivers': [5],
     'via': 'The Content Intelligence pipeline (River V) — current live status genuinely unconfirmed'},
]
LINKS_BY_RIVER = {}
for _l in EXTERNAL_RIVER_LINKS:
    for _r in _l['rivers']:
        LINKS_BY_RIVER.setdefault(_r, []).append(_l)

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
SKILL_SECONDARY_RIVER = {
    'Regeneration': (6, "Sweeps the whole taxonomy tree and the Phylum Path pipeline"),
    'loggingregen': (14, "Regenerates ONE oversight doc at a time against its own stated role"),
    'update-logging-system': (14, "Names SELF_KNOWLEDGE and skill .md files as required-artifact targets"),
    'colourgradient': (14, "Only green routes to the real oversight docs; everything else routes to future_integrations.html"),
    'cartographer': (14, "Baseline Reconciliation cross-references Tier (b) docs, feeding smoke_test.html real suggestions"),
    'impeccable': (16, "Runs a real design-pattern scan against index.html/style.css, the dev-tooling scan layer"),
    'graphify': (16, "The actual scripts (graphify_river_group.py etc.) that generate this graph and the Obsidian vault themselves"),
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
RIVER_FLOWS = {
    1: [('River II — The Great Confluence', 'always', 'nav_route')],
    2: [
        ('River III — The Oracle Current', 'Oracle page selected', 'nav_route'),
        ('River IV — The Bookworm River', 'Bookworm page selected', 'nav_route'),
        ('River V — Two Independent Streams', 'Schedule/Content Intel page selected', 'nav_route'),
    ],
    3: [
        ('River VI — The Judgment Chamber', 'a tapped insight badge', 'nav_route'),
        ('River IV — The Bookworm River', 'special prefix diverts the message', 'nav_route'),
        ('River V — Two Independent Streams', 'special prefix diverts the message', 'nav_route'),
        ('River XII — The API / Auth Layer', 'dormant: a Kimi/Luna provider call would route out through here instead of the default Anthropic call', 'ai_judgment_call'),
    ],
    4: [('River VI — The Judgment Chamber', 'every insight found here', 'ai_judgment_call')],
    5: [
        ('River VIII — The Confluence Pool', 'Content Intelligence branch only — the Schedule branch is terminal, ends at the Schedule Calendar', 'write_commit'),
        ('River XII — The API / Auth Layer', "morningBrief's real Composio Gmail-fetch call routes out through here", 'external_extract_call'),
    ],
    6: [
        ('River VII — The Library Current', "a fresh leaf's teaching page", 'ai_judgment_call'),
        ('River VIII — The Confluence Pool', 'any confirmable fusion-link bridge', 'human_confirm_gate'),
    ],
    7: [('River VIII — The Confluence Pool', 'a proposed merge', 'human_confirm_gate')],
    8: [('River II — The Great Confluence', "into The Great Tree, River II's own estuary — readable by every other river from there", 'write_commit')],
    9: [
        ('River X — The Confluence of Chronicles', "the Far Shore's own real changes, via system_updates", 'oversight_deposit'),
        ('River XII — The API / Auth Layer', 'the Claude Code fallback lane\'s drain and Graphify CC\'s own session-start dispatch both route out through here', 'dispatch_trigger'),
    ],
    10: [('— terminal sink for every river above —', 'River XI is the one exception, see below', 'terminal_sink')],
    11: [
        ('River X — The Confluence of Chronicles', 'both branches loop back into the same shared estuary, not a new one', 'oversight_deposit'),
        ('River XII — The API / Auth Layer', "the OpenMontage handoff, librosa's beat_audio_jobs analysis (via Beat Log), and contentRepurpose's real Composio calls (Notion/YouTube) all route out through here", 'dispatch_trigger'),
    ],
    12: [
        ('River XI — Content Production Live', 'the OpenMontage job result — the one external connector whose real spring AND mouth both sit back in River XI', 'dispatch_trigger'),
        ('River XIV — Oversight Docs', 'Graphify CC deposits real findings here via graphify_jobs, flagged for logging', 'oversight_deposit'),
    ],
    13: [('River XIV — Oversight Docs', "a skill's behavior change that could make an existing river's own written description go stale", 'doc_staleness_flag')],
    14: [('— feeds every river\'s own next real session —', "CLAUDE.md's own rule: read the relevant section before any nontrivial work", 'session_start_pull')],
    15: [('River XIII — Skills', "feeds Routine's own session-start check via session_memory, read at the start of every future session", 'session_start_pull')],
    16: [
        ('River XII — The API / Auth Layer', "generates graph.html/GRAPH_TREE.html, this river's own visual form", 'write_commit'),
        ('River XIV — Oversight Docs', 'generates obsidian_vault.html, the human-browsable presentation layer', 'write_commit'),
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


def parse_module_ranges(core_js_path: Path):
    """Real module -> (start_line, end_line) from the file's own markers."""
    ranges = {}
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
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
    WRAP_TARGETS = ('callOracle', 'sendChat')
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

        # Signal 2: window.callOracle/sendChat wrap-chain membership —
        # real file-declaration order IS the real real wrap order (the
        # last reassignment before use is what executes), so this draws
        # a real ordered chain, not a fabricated complete graph.
        for target in WRAP_TARGETS:
            wrappers = [m for m in mods if re.search(
                r'window\.' + target + r'\s*=\s*function', block_of(m))]
            wrappers.sort(key=lambda m: ranges[m][0])
            for a, b in zip(wrappers, wrappers[1:]):
                edges.append((a, b, 'wrap'))
                touched.add(a); touched.add(b)

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


def parse_module_functions(module_name, core_js_path: Path = CORE_JS):
    """Real, mechanical function inventory for ONE module — Aug 13 Level-3
    proof-of-concept (Alex's own ask: "flow through a level 3 structure
    which is a module or function... those flow through buttons being
    the gateway to level 3 diagrams"). Greps the module's own real
    source block (parse_module_ranges(), rule 8) for its own top-level
    `_funcName: function(...)` / `funcName: function(...)` definitions —
    the same real object-literal-method shape every RPGACE.register()
    module uses. Returns [func_name, ...] in real source order (top to
    bottom), never alphabetized or reordered — source order is itself
    real evidence of a module's own intended read order.

    Real, honest scope limit: only catches DIRECT `name: function` /
    `name: async function` top-level methods on the module object
    literal — a function nested inside another function's own body
    (a closure) is deliberately not surfaced as a separate node, since
    it isn't part of the module's own real public/callable surface."""
    ranges = parse_module_ranges(core_js_path)
    if module_name not in ranges:
        return []
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
    s, e = ranges[module_name]
    block_lines = lines[s - 1:e]
    funcs = []
    for line in block_lines:
        m = re.match(r'\s*(_?[A-Za-z0-9]+)\s*:\s*(?:async\s+)?function\b', line)
        if m and m.group(1) not in funcs:
            funcs.append(m.group(1))
    return funcs


def compute_module_function_flow(module_name, core_js_path: Path = CORE_JS):
    """Real, mechanical function-to-function call edges WITHIN one
    module — the function-grain sibling of compute_intra_river_flow()
    (rule 8, same technique, one level deeper). For each of the
    module's own real functions (parse_module_functions()), greps that
    function's own real source body for a literal `self.<sibling>(` or
    `<moduleName>.<sibling>(` call to another function in the same
    module. Returns [(from_func, to_func), ...].

    Real, honest scope limit, same shape as the module-level version:
    only DIRECT same-module calls are caught. A call reached through
    RPGACE.hooks.fire(), a callback passed by reference, or a dynamic
    property lookup is invisible here — an absence is not proof no
    real relationship exists, only that no direct call was found."""
    ranges = parse_module_ranges(core_js_path)
    if module_name not in ranges:
        return []
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
    s, e = ranges[module_name]
    block_lines = lines[s - 1:e]
    funcs = parse_module_functions(module_name, core_js_path)
    if not funcs:
        return []
    # Split the module block into per-function real source spans by
    # finding each function's own definition line, then taking
    # everything up to the next top-level function definition (or the
    # end of the module) as that function's real body.
    def_lines = []
    for i, line in enumerate(block_lines):
        m = re.match(r'\s*(_?[A-Za-z0-9]+)\s*:\s*(?:async\s+)?function\b', line)
        if m and m.group(1) in funcs:
            def_lines.append((i, m.group(1)))
    edges = []
    for idx, (start_i, fname) in enumerate(def_lines):
        end_i = def_lines[idx + 1][0] if idx + 1 < len(def_lines) else len(block_lines)
        body = '\n'.join(block_lines[start_i:end_i])
        for other in funcs:
            if other == fname:
                continue
            if re.search(r'\bself\.' + re.escape(other) + r'\s*\(', body) or \
               re.search(re.escape(module_name) + r'\.' + re.escape(other) + r'\s*\(', body):
                edges.append((fname, other))
    return edges


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
    e.g. taxonomyTree calling into dashDeck)."""
    ranges = parse_module_ranges(core_js_path)
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
    all_mods = list(ranges.keys())
    result = []
    for m in all_mods:
        s, e = ranges[m]
        block_lines = lines[s - 1:e]
        funcs = parse_module_functions(m, core_js_path)
        if not funcs:
            continue
        def_lines = []
        for i, line in enumerate(block_lines):
            fm = re.match(r'\s*(_?[A-Za-z0-9]+)\s*:\s*(?:async\s+)?function\b', line)
            if fm and fm.group(1) in funcs:
                def_lines.append((i, fm.group(1)))
        for idx, (start_i, fname) in enumerate(def_lines):
            end_i = def_lines[idx + 1][0] if idx + 1 < len(def_lines) else len(block_lines)
            body = '\n'.join(block_lines[start_i:end_i])
            for call_mod, call_fn in re.findall(r'RPGACE\.modules\.(\w+)\.(\w+)\s*\(', body):
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
