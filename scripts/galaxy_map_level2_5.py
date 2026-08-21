#!/usr/bin/env python3
"""
galaxy_map_level2_5.py — G38 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 14 2026). Real, generalized successor to
Level 1.5 (Meanders, which only ever covered River V's own 4 cards).
Alex's own real ask: "meanders should become 2.5, where all dashboard
cards live (meander is a part of the river after all) i want the river
to point out to dashboard card, and the dashboard card will contain its
functions." Real, confirmed purpose (his own words, same session):
"think of 2.5 as regrouping rivers by what is accessible by ui and
alex, this will help connect dimensions later on" — the organizing
principle here is real UI/Alex-accessibility, not just "cards under a
river."

Real, confirmed shape: a new, ADDITIVE page — not a Level 3 rewrite,
same position in the hierarchy (between Level 2 and Level 3). Real
restructure, Aug 14 same day later pass, 3 real /interrogation answers
(Alex: "i dont want 1.5 it doesnt make sense... meanders should become
the central point where all ui/alex/backend/externals all eventually
meet"): (1) Level 1.5 (Meanders) is retired as a standalone level —
River V's own real card-declutter role folds in here; (2) this stays
Level 2.5, not a new hub-level concept; (3) real dimension-links are a
real, honest deferred stub pending G30 (Level 0 -> dimensions), never
faked ahead of it. Real, confirmed scoping fix (his own direct ask,
"only take into account rivers that actually have them"): ONLY rivers
with a real dashboard card get a tab/section — I/II/XII/XIII/XV/XVI
(zero real cards, confirmed via CARDS_BY_RIVER) are silently excluded,
not shown as an empty placeholder.

Real externals-attachment layer (his own ask, "they could feature where
externals attach too") reuses EXTERNAL_RIVER_LINKS (rule 8, the same
real per-river connector citations Level 2's own 4th ring already
shows) — never re-derived.

**Real Aug 21 2026 fold — this file no longer generates its own
standalone page.** Alex's own direct words: "2.5 is a table view of 2,
so fix that too please." galaxy_map_module.py (Level 2) now has a real
map/table toggle per river — map is its existing SVG flow diagram
(unchanged), table is THIS file's own build_river_section() output,
imported directly (rule 8, same discipline as galaxy_map_skills.py's
relationship to galaxy_map_skill_network.py, and galaxy_map_l0.py's
relationship to galaxy_map.html). This file is now a pure DATA + RENDER
module (RIVER_NUMS/build_river_section/build_card_block/
build_externals_block) — graphify-out/galaxy_map_level2_5.html no
longer exists. build_river_section() itself no longer wraps a
<section id="river-N"> (that would collide with Level 2's own outer
section id) and drops its old "zoom out: Level 2" link (a same-page
no-op now that this content lives directly inside Level 2's own table
view). Its own former .rhead CSS class is renamed .l25-rhead in the
reused CSS to avoid colliding with Level 2's own, differently-styled
.rhead.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, CARDS_BY_RIVER, DASHBOARD_CARDS,
    dashboard_card_primary_module, compute_module_ui_signal,
    LEVEL3_MODULES, EXTERNAL_RIVER_LINKS,
)

RIVER_NUMS = sorted(r for r in range(1, 17) if CARDS_BY_RIVER.get(r))


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_card_block(card):
    key = card['key']
    label = card['label']
    via = card.get('via', '')
    valid_mods = set(LEVEL3_MODULES)
    primary = dashboard_card_primary_module(via, valid_mods)
    ui_badge = ''
    mod_link = ''
    # Real "logic bubbles" per Alex's own direct refinement (Aug 14,
    # same pass): each card should link to its Level 2 backend home too,
    # not just forward into Level 3. The 3rd real bubble he asked for —
    # a UI/Alex bubble sending into the future "alex/ui conjoined
    # dimension" — depends on G30 (dimensions) and G37 (Alex bubble
    # system) landing first, neither built yet; deliberately NOT faked
    # here, logged as a real amendment on G38 instead (see CLAUDE.md).
    river2_link = ''
    if card.get('rivers'):
        river2_link = f'<a class="modlink r2" href="galaxy_map_module.html#river-{card["rivers"][0]}">🌊 Level 2 (backend home)</a>'
    if primary:
        sig = compute_module_ui_signal(primary)
        has_ui = any(sig.values()) if isinstance(sig, dict) else bool(sig)
        if has_ui:
            ui_badge = '<span class="uibadge">🧑 real UI/input evidence</span>'
        mod_link = f'<a class="modlink" href="galaxy_map_current.html#mod-{esc(primary)}">🔽 {esc(primary)} — its own functions on Current Series</a>'
    else:
        mod_link = '<span class="nomod">No single primary module — real shared/sibling ownership (see Level 4 for the full real target list)</span>'
    partial = ' <span class="partial">(partial — via text names a QoL-layer-only module)</span>' if card.get('partial') else ''
    return f'''<div class="ccard">
  <div class="chead"><span class="cicon">{esc(label)}</span>{ui_badge}</div>
  <div class="cvia">{esc(via)}{partial}</div>
  <div class="clinks">{river2_link}</div>
  <div class="cmod">{mod_link}</div>
</div>'''


def build_externals_block(rnum):
    """Real per-river external-connector attachment (Alex: "they could
    feature where externals attach too") — reuses EXTERNAL_RIVER_LINKS
    verbatim (rule 8), the same real citations Level 2's own 4th ring
    already shows. Honest empty state, never guessed."""
    hits = [c for c in EXTERNAL_RIVER_LINKS if rnum in c.get('rivers', [])]
    if not hits:
        return '<div class="extnone">No real external connector cited for this river.</div>'
    chips = ''.join(
        f'<div class="extchip"><b>{esc(c["name"])}</b><span>{esc(c.get("via", ""))}</span></div>'
        for c in hits
    )
    return f'<div class="extgrid">{chips}</div>'


def build_river_section(rnum):
    """Real Aug 21 2026 fold (Alex: "2.5 is a table view of 2, so fix
    that too please") — this no longer wraps its own <section id="river-
    N"> (that would collide with galaxy_map_module.py's own outer
    section id once this content lives INSIDE its table view); returns
    the real inner content only. The old "zoom out: Level 2" link is
    dropped too — it's a same-page no-op now that this content lives
    directly inside Level 2's own table view, not a separate page."""
    _full_name = RIVER_NAME.get(rnum, f'River {rnum} — Untitled')
    name = _full_name.split('—', 1)[1].strip() if '—' in _full_name else _full_name
    color = RIVER_COLOR.get(rnum, '#888')
    cards = CARDS_BY_RIVER.get(rnum, [])
    seen = set()
    unique_cards = []
    for c in cards:
        if c['key'] not in seen:
            seen.add(c['key'])
            unique_cards.append(c)
    cards_html = ''.join(build_card_block(c) for c in unique_cards)
    externals_html = build_externals_block(rnum)
    return f'''<div class="l25-rhead" style="border-color:{color}"><h2 style="color:{color}">River {_roman(rnum)} — {esc(name)}</h2><span class="rcount">{len(unique_cards)} real dashboard card(s)</span></div>
  <div class="cgrid">{cards_html}</div>
  <div class="convrow">
    <div class="convblock"><div class="convlabel">🔀 Externals attaching here</div>{externals_html}</div>
    <div class="convblock"><div class="convlabel">🌌 Dimensions</div><div class="dimstub">⏳ Real links pending G30 (Level 0 → dimensions) — not built, not faked ahead of it.</div></div>
  </div>'''


def _roman(n):
    vals = [(10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]
    out = ''
    for v, s in vals:
        while n >= v:
            out += s
            n -= v
    return out
