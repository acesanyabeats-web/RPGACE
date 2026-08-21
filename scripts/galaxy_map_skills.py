#!/usr/bin/env python3
"""
galaxy_map_skills.py — G28 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 14 2026). Real, curated build of "skills interact
with external AI, UI, and backend" — Alex's own 4th dimension. Via
/interrogation (real answers): a curated write-up per skill, reusing
ai_tooling_and_rules_map.md's own already-sourced skill catalog (Tier
1c's flat list + the Galaxy Development Framework's own named skills)
rather than inventing a new list, and two separate pages from G27
(external connectors are running code; skills are Claude-Code-session
reasoning procedures — genuinely different actor types).

Real, honest classification method, stated plainly (this is judgment,
not a grep — no mechanical detector can read a skill's own prose): 3
real axes, deliberately narrower than "does this skill exist" —
  🔮 External AI — the skill's OWN documented procedure explicitly
     dispatches to a DIFFERENT real AI system as part of its work
     (RPGACE's own Oracle, or a Total-system member — OpenMontage
     CC/Graphify CC) — NOT "Claude Code itself runs this skill," which
     would trivially make every skill qualify and mean nothing.
  🖥️ UI — the skill's real output changes/touches RPGACE's own app UI
     (a page, button, rendered behavior a viewer would see).
  🗄️ Backend — the skill's real output changes/touches code logic,
     Supabase data, or a real oversight doc.
Sourced from each skill's own real, already-documented behavior
(ai_tooling_and_rules_map.md / CLAUDE.md's own "Invokable frameworks"
section) — a real judgment call per skill, same curation discipline as
Level 5's decision points, not mechanically derived.

**Real Aug 21 2026 correction (via /misunderstanding, same day) — this
file no longer generates its own standalone page.** Alex's own direct
words: "the skills composition network is the map view, whilst g28 is
the table view... again you are duplicating and not integrating
everything exactly as i said." A first attempt gave THIS file its own
independent map+table toggle (a column-clustered bubble view) — wrong;
that duplicated galaxy_map_skill_network.py's own real bubble map
instead of the two becoming ONE real page. This file now stays a pure
DATA + RENDER module (SKILLS/GROUPS/build_group_section — the real
table-view content) imported directly by galaxy_map_skill_network.py,
which is the one real merged page (map = skill composition network,
table = this file's own grouped classification). graphify-out/
galaxy_map_skills.html no longer exists.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import SKILL_SECONDARY_RIVER, RIVER_NAME  # noqa: E402

# G46 (Aug 18 2026, real Part 4F/10 ask — "skills should be treated same
# as supabase," i.e. its own documented Level/River usage). Real reuse,
# not re-derived (rule 8): every real skill lives in River XIII by
# default (its own full 25-skill catalog, already built at
# galaxy_map_module.py's River XIII section); SKILL_SECONDARY_RIVER adds
# a real citation for the 7 skills whose own description names a
# SPECIFIC other river. "Level" is honestly N/A for a skill — skills
# document Orchestrator CC's own dev process, not runtime app code, so
# no Level 0-6 grain applies; stated plainly rather than forced.

# Real, curated classification — {name: {ai, ui, backend, note}}.
# ai/ui/backend are bool; note is the real, short justification.
SKILLS = {
    'Engineer': {'ai': False, 'ui': True, 'backend': True,
                 'note': 'Executes real builds through Omnitrix (Opus builds/Sonnet reviews) — frequently changes real app UI and always touches real code/Supabase.'},
    'Regeneration': {'ai': False, 'ui': False, 'backend': True,
                      'note': 'Taxonomy-tree quality sweep — real Supabase reads/scoring, human-gated writes, no direct UI change of its own.'},
    'restructure': {'ai': False, 'ui': False, 'backend': True,
                     'note': 'A real evolution-debate over infrastructure choices — produces a written verdict, not a direct code/UI change itself.'},
    'free-for-all-debate': {'ai': False, 'ui': False, 'backend': False,
                             'note': 'Pure deliberation procedure — individual competitors argue real problems, no direct system touch of its own.'},
    'loggingregen': {'ai': False, 'ui': False, 'backend': True,
                      'note': 'Regenerates one oversight doc against its own stated role + dedup discipline — real doc writes, no runtime UI.'},
    'scope': {'ai': False, 'ui': False, 'backend': True,
              'note': 'Gathers real git/Supabase evidence into grouped categories — a real evidence pass, no direct write of its own.'},
    'debate': {'ai': False, 'ui': False, 'backend': False,
               'note': 'Structured adversarial case-building — a real deliberation output, not a system touch.'},
    '5thDimension': {'ai': False, 'ui': False, 'backend': True,
                      'note': 'Built-vs-reported reconciliation across real code/Supabase/docs — the heaviest evidence pass short of /paranoia, real doc updates follow from it.'},
    'Routine': {'ai': False, 'ui': False, 'backend': True,
                'note': 'Session-start Top-10 backlog debate — writes a real dated record file, no direct UI/code change itself.'},
    'Summary': {'ai': False, 'ui': False, 'backend': False,
                'note': 'A verified recap of recent work — real evidence-checked, but produces a report, not a system change.'},
    'Bedtime': {'ai': False, 'ui': False, 'backend': True,
                'note': 'Session-end ritual — real writes across all seven oversight docs + Chronicles (system_updates).'},
    'impeccable': {'ai': False, 'ui': True, 'backend': False,
                    'note': "Runs a real free design-pattern scan against index.html/style.css — reports on real UI anti-patterns, doesn't fix them itself."},
    'interrogation': {'ai': False, 'ui': False, 'backend': False,
                       'note': 'Real questions-before-building discipline — a procedure, not a system touch (this exact skill built G26/G27/G28).'},
    'paranoia': {'ai': True, 'ui': False, 'backend': True,
                 'note': 'The heaviest scrutiny pass — runs Aintergration/restructure/GODMODE/5thDimension/debate/interrogation/Council-of-5 in sequence; real evidence-checked outputs feed real doc/code changes. Counted 🔮 since its own procedure explicitly folds in real Oracle-grounded reasoning steps via 5thDimension.'},
    'investor': {'ai': False, 'ui': False, 'backend': False,
                 'note': 'A commercial-readiness judgment lens/persona — a real report, not a system touch.'},
    'update-logging-system': {'ai': False, 'ui': False, 'backend': True,
                               'note': 'The change-type -> required-artifact checklist itself — real doc-completeness enforcement, no UI.'},
    'drift': {'ai': False, 'ui': False, 'backend': False,
              'note': 'Checks real work against a real stated plan — VERDICT+BASIS output, a real evidence check, not a direct write.'},
    'CEO': {'ai': True, 'ui': True, 'backend': True,
            'note': 'The whole meta-framework governing this multi-day build — real Total-system dispatch (Engineer CC/Graphify CC = external AI), real shipped UI (every Galaxy Map page), real Supabase datasheet (ceo_plans/ceo_plan_items/ceo_reports). The one skill that genuinely touches all 3 axes at once.'},
    'colourgradient': {'ai': False, 'ui': True, 'backend': True,
                        'note': 'A real green/red/yellow/blue/purple build-status benchmark, rendered as an optional HTML artifact — real Supabase read (ceo_plan_items), real optional UI output.'},
    'decompress': {'ai': False, 'ui': True, 'backend': True,
                    'note': 'Standing performance-discipline checklist — real shipped fixes (cache headers, preconnect) directly change real UI load behavior.'},
    'misunderstanding': {'ai': False, 'ui': False, 'backend': False,
                          'note': 'A real 3-step disconnect-repair procedure between Alex and an AI — pure deliberation, portable as prose to other Total-system AIs (a real design property, not a system touch by itself).'},
    'cartographer': {'ai': True, 'ui': False, 'backend': True,
                      'note': 'Grounds graphify/Obsidian against system_map_spec.md, runs the trickle-down/up check — real cross-reference with Graphify CC (external AI) and real system_map_flags/smoke_test writes.'},
    'perspective': {'ai': False, 'ui': False, 'backend': True,
                     'note': 'Writes a real, evidence-grounded first-person self-report per Total-system element into perspective_reports — real Supabase writes, no direct UI.'},
    'omnitrix': {'ai': False, 'ui': True, 'backend': True,
                  'note': 'The 3-agent build workflow itself (Fable/Opus/Sonnet role split) — every real Tier 2 build in this project routes through it, so its real effect is whatever that build touches.'},
}

GROUPS = [
    {'id': 'all3', 'label': '🔮🖥️🗄️ All Three Axes', 'test': lambda s: s['ai'] and s['ui'] and s['backend']},
    {'id': 'ai', 'label': '🔮 Touches External AI', 'test': lambda s: s['ai']},
    {'id': 'ui_backend', 'label': '🖥️🗄️ UI + Backend (no external AI)', 'test': lambda s: not s['ai'] and s['ui'] and s['backend']},
    {'id': 'backend_only', 'label': '🗄️ Backend Only', 'test': lambda s: not s['ai'] and not s['ui'] and s['backend']},
    {'id': 'none', 'label': '💭 Pure Deliberation (no direct system touch)', 'test': lambda s: not s['ai'] and not s['ui'] and not s['backend']},
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_group_section(grp):
    members = [(name, s) for name, s in SKILLS.items() if grp['test'](s)]
    # Aug 15 (G35, real Alex ask: "i want these skills to show adjacent
    # bubbles to each path it auto combines with") — real, bounded visual
    # fix: the 3 axis markers move from separate flat table COLUMNS to
    # real small bubble badges rendered directly ADJACENT to the skill
    # name (one cell, not three), reusing the exact bubble visual
    # language (small rounded pill, colored border) already established
    # at Level 3 for the Oracle/Composio actor bubbles — never a new
    # visual vocabulary invented for this one page. Each row also gets a
    # real cross-link into the map view's own detail panel (G36) — ties
    # the two "skill dimensions" together, now literally one page.
    def _bubbles(s):
        b = []
        if s['ai']: b.append('<span class="axbubble ax-ai" title="Touches external AI">🔮</span>')
        if s['ui']: b.append('<span class="axbubble ax-ui" title="Touches real app UI">🖥️</span>')
        if s['backend']: b.append('<span class="axbubble ax-be" title="Touches real backend">🗄️</span>')
        return ''.join(b) or '<span class="axbubble ax-none" title="No real axis touched">💭</span>'
    def _river_usage(name):
        chips = ['<span class="river-chip">🌊 River XIII</span>']
        sec = SKILL_SECONDARY_RIVER.get(name)
        if sec:
            rnum, note = sec
            rlabel = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
            chips.append(f'<span class="river-chip river-sec" title="{esc(note)}">🌊 {rlabel}</span>')
        return ''.join(chips)

    rows = ''.join(
        f'<tr><td class="skname">/{esc(name)} {_bubbles(s)} '
        f'<a class="netlink" href="#" data-jump-skill="{esc(name)}" title="Jump to this skill on the Map view">🕸️</a></td>'
        f'<td class="sknote">{esc(s["note"])}</td>'
        f'<td class="skriver">{_river_usage(name)}<div class="lvl-na">Level: N/A — dev-process, not app-runtime</div></td></tr>'
        for name, s in members
    )
    return f'''<section class="gsection" id="grp-{grp['id']}" style="display:none">
  <div class="ghead"><h2>{grp['label']}</h2><span class="gcount">{len(members)} real skill(s)</span></div>
  <table class="sktable"><thead><tr><th>Skill (axis bubbles + map link)</th><th>Real justification</th><th>Real Level/River usage</th></tr></thead>
  <tbody>{rows}</tbody></table>
</section>'''
