#!/usr/bin/env python3
"""ED-4 (Oct 22 2026, plan "Domain Spine & Externals") — the in-app
dimensions, shown inside each domain on galaxy_map_domain.html.

Seven Dimension pages described things that happen INSIDE the RPGACE app
(Oracle calls, human gates, the decision catalog, Alex's click path, the
branch ledger, load triggers, loops) plus the Dimensions Matrix that
cross-tabbed them. Alex's answer (Oct 22): fold them into the domain
pages; the old files become redirect stubs. Dimensions that live outside
the app (External AIs, the Claude Code side, Supabase, the local PC
pipeline) keep their own pages.

Nothing here detects anything new. Every table reads the same data
functions the old pages used (rule 8), and each section keeps the old
pages' anchor ids (`dp-<id>`, `d-<id>`, `m-<mod>`, `fn-<mod>-<func>`,
`card-<key>`) so old links redirect straight onto the right entry.
Table data comes first; the bubble row per domain is drawn from the same
counts (R22).
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from graphify_river_group import (  # noqa: E402
    DOMAIN_ORDER, DOMAIN_NUM, MODULE_DOMAIN, RIVER_NAME, DASHBOARD_CARDS, LEVEL3_MODULES,
    compute_dashboard_card_flow, compute_function_branches, render_bubble_row,
    _curved_edge, _build_markers,
)
from galaxy_map_oracle import CALLS as ORACLE_CALLS  # noqa: E402
from galaxy_map_decisions import DECISION_POINTS, _lines  # noqa: E402
from galaxy_map_decision_matrix import LOGIC_POINTS, build_logic_writeups, build_unified  # noqa: E402
from galaxy_map_load import (  # noqa: E402
    compute_boot_task_registrations, compute_click_load_triggers, compute_hook_signal_edges,
    compute_page_nav_triggers,
)
from galaxy_map_loops import compute_call_hook_edges, compute_data_edges, _tarjan  # noqa: E402
from galaxy_map_alex_path import _flow_modules, _flow_pages  # noqa: E402

KIND_ICON = {'if': '🔀', 'else if': '🔁', 'else': '↩️', 'switch': '🔢'}

DIMS = [
    ('oracle', '🔮', 'Oracle calls'),
    ('gates', '🚦', 'Human gates'),
    ('decisions', '🧠', 'Decision catalog'),
    ('path', '🧑', "Alex's click path"),
    ('branches', '🔬', 'Branch ledger'),
    ('load', '⏱️', 'Load triggers'),
    ('loops', '🔄', 'Loops'),
]

DOMAIN_DIMS_CSS = '''
.ddims{max-width:900px;margin:0 auto 18px;padding:0 24px}
.ddims>details{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:10px}
.ddims>details>summary{cursor:pointer;padding:10px 14px;font-size:12.5px;font-weight:700;color:#E2E2EC}
.ddims .dd-body{padding:0 14px 12px}
.ddims h4{font-size:12px;color:#C9A84C;margin:14px 0 6px}
.ddims table{width:100%;border-collapse:collapse;font-size:11px}
.ddims th,.ddims td{text-align:left;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;color:#c8c8d8}
.ddims th{color:#8a8a9a;font-weight:600}
.ddims .none{font-size:11px;color:#6a6a78}
.ddims pre{white-space:pre-wrap;font-size:10px;max-height:260px;overflow:auto;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px}
.ddims .dpcard,.ddims .logic-writeup{border-left:3px solid rgba(201,168,76,0.5);padding:6px 10px;margin:8px 0}
.ddims .dlabel{font-size:9px;font-weight:700;text-transform:uppercase;color:#8a8a9a;margin-top:6px}
.ddims .dblock p{font-size:11px;line-height:1.55;color:#c8c8d8}
.ddims .mod-chip{display:inline-block;font-size:10.5px;margin:4px 8px 0 0;color:#C9A84C}
.ddims .cite{font-size:9.5px;color:#6a6a78}
.ddims details details{margin:4px 0 4px 8px}
.ddims details details summary{cursor:pointer;font-size:11px;color:#E2E2EC}
.ddims .branch-row{font-size:10.5px;padding:1px 0 1px 12px}
.ddims .bcond{font-size:10px}
'''


def esc(s):
    return (str(s) if s is not None else '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _mods(domain):
    return sorted(m for m, d in MODULE_DOMAIN.items() if d == domain)


def _cur(mod, func=None):
    if mod not in LEVEL3_MODULES:
        return f'<code>{esc(mod)}{"." + esc(func) + "()" if func else ""}</code>'
    anchor = f'cur-{mod}-{func}' if func else f'mod-{mod}'
    return f'<a href="galaxy_map_current.html#{esc(anchor)}"><code>{esc(mod)}{"." + esc(func) + "()" if func else ""}</code></a>'


def _table(head, rows):
    if not rows:
        return '<p class="none">None in this domain.</p>'
    th = ''.join(f'<th>{h}</th>' for h in head)
    return f'<table><tr>{th}</tr>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</table>'


class _Data:
    """Every data source computed once per build (the old pages each ran
    these on their own; now one domain page reads them all)."""
    def __init__(self):
        self.unified = build_unified()
        # build_logic_writeups() returns one joined string, one <section> per LOGIC_POINTS entry, in order.
        marker = '<section class="logic-writeup"'
        writeups = [marker + s for s in build_logic_writeups().split(marker)[1:]]
        if len(writeups) != len(LOGIC_POINTS):
            raise SystemExit(f'SELF-CONSISTENCY FAIL: {len(writeups)} logic write-ups for {len(LOGIC_POINTS)} logic points.')
        self.logic = list(zip(LOGIC_POINTS, writeups))
        self.boot = compute_boot_task_registrations()
        self.clicks = compute_click_load_triggers()
        self.events = [e for e in compute_hook_signal_edges() if e[2] != 'page:show']
        call_adj, self.call_edges = compute_call_hook_edges()
        data_adj, self.data_edges = compute_data_edges()
        self.cycles = ([('call', c) for c in _tarjan(call_adj)] + [('data', c) for c in _tarjan(data_adj)])
        self.flow = compute_dashboard_card_flow()


_DATA = None


def data():
    global _DATA
    if _DATA is None:
        _DATA = _Data()
    return _DATA


def _oracle(domain, mods):
    rows = []
    for m in mods:
        counts = ORACLE_CALLS.get(m, {})
        for f, n in sorted(counts.items()):
            rows.append([_cur(m, f), str(n)])
    return len(rows), _table(['Function', 'Oracle calls'], rows)


def _gates(domain, mods):
    out = []
    for dp in DECISION_POINTS:
        if MODULE_DOMAIN.get(dp['module']) != domain:
            continue
        a, b = dp['lines']
        code = _lines(a, b)
        if dp['anchor'] not in code:
            raise SystemExit(f"STALE ANCHOR: {dp['id']} — '{dp['anchor']}' not found in rpgace_core.js lines {a}-{b}.")
        out.append(f'''<div class="dpcard" id="dp-{esc(dp['id'])}">
  <b>{esc(dp['title'])}</b> <span class="cite">({esc(dp['category'])})</span>
  <div class="dblock"><div class="dlabel">Trigger</div><p>{dp['trigger']}</p></div>
  <div class="dblock"><div class="dlabel">Logic</div><p>{dp['logic']}</p></div>
  <details><summary>Code (rpgace_core.js lines {a}-{b})</summary><pre>{esc(code)}</pre></details>
  {_cur(dp['module'], dp['func'])}
</div>''')
    return len(out), ''.join(out) or '<p class="none">None in this domain.</p>'


def _decisions(domain, mods):
    d = data()
    parts, n = [], 0
    for lp, html in d.logic:
        if MODULE_DOMAIN.get(lp.get('level3') or lp['module']) == domain:
            parts.append(html.replace('galaxy_map_level6.html#m-', 'galaxy_map_domain.html#m-'))
            n += 1
    # 'legacy (sendChat)' is the Oracle chat box itself (pre-merge main.js handler, no module of its own).
    texts = [u for u in d.unified if u['kind'] == 'text_input'
             and MODULE_DOMAIN.get(u['module'], 'oracle' if 'sendChat' in u['module'] else None) == domain]
    for u in texts:
        parts.append(f'<div class="dpcard" id="d-{esc(u["id"])}"><b>⌨️ {esc(u["title"])}</b>'
                     f'<div class="dblock"><p>{esc(u["detail"])}</p></div>{_cur(u["module"], u["func"])}</div>')
        n += 1
    return n, ''.join(parts) or '<p class="none">None in this domain.</p>'


def _path(domain, mods):
    d = data()
    r = DOMAIN_NUM[domain]
    out = []
    for card in DASHBOARD_CARDS:
        if r not in card.get('rivers', []):
            continue
        cm = _flow_modules(card, d.flow)
        pages = _flow_pages(card, d.flow)
        gates = [dp for dp in DECISION_POINTS if dp['module'] in cm]
        opens = ', '.join(_cur(m) for m in cm) or ''
        if pages:
            opens += (' · ' if opens else '') + 'page ' + ', '.join(f'<code>{esc(p)}</code>' for p in pages)
        gate_txt = ', '.join(f'<a href="#dp-{esc(g["id"])}">{esc(g["title"])}</a>' for g in gates) or 'no gate (straight click-through)'
        out.append([f'<span id="card-{esc(card["key"])}">{esc(card["label"])}</span>', opens or '—', gate_txt])
    return len(out), _table(['Menu entry Alex taps', 'Opens', 'Gates on the way'], out)


def _branches(domain, mods):
    blocks, n = [], 0
    for m in mods:
        if m not in LEVEL3_MODULES:
            continue
        br = compute_function_branches(m)
        if not br:
            continue
        total = sum(len(v) for v in br.values())
        n += total
        funcs = ''.join(
            f'<div id="fn-{esc(m)}-{esc(f)}"><b>{esc(f)}()</b> {_cur(m, f)} · {len(br[f])}'
            + ''.join(f'<div class="branch-row">{KIND_ICON.get(b["kind"], "•")} {esc(b["kind"])} '
                      f'<code class="bcond">{esc(b["condition"]) if b["condition"] else "(fallback)"}</code></div>'
                      for b in br[f]) + '</div>'
            for f in sorted(br))
        blocks.append(f'<details id="m-{esc(m)}"><summary>{esc(m)} — {total} branch point(s) in {len(br)} function(s)</summary>{funcs}</details>')
    return n, ''.join(blocks) or '<p class="none">None in this domain.</p>'


def _load(domain, mods):
    d = data()
    ms = set(mods)
    rows = []
    for b in d.boot:
        if b['module'] in ms:
            rows.append(['boot task', _cur(b['module']), f'boot order #{b["seq"]} (line {b["line"]})'])
    for m in mods:
        for page, targets in sorted(compute_page_nav_triggers(m).items()):
            rows.append(['page show', _cur(m), f're-injects on page <code>{esc(page)}</code>' + (f' ({", ".join(esc(t) for t in targets)})' if targets else '')])
    for trig, pairs in sorted(d.clicks.items()):
        for tm, tf in pairs:
            if tm in ms:
                rows.append(['click', _cur(tm, tf), f'loaded by <code>{esc(trig)}()</code>'])
    for src, dst, ev in d.events:
        if dst in ms:
            rows.append(['event', _cur(dst), f'listens to <code>{esc(ev)}</code> from <code>{esc(src)}</code>'])
    return len(rows), _table(['Kind', 'Module', 'Trigger'], rows)


def _loops(domain, mods):
    d = data()
    ms = set(mods)
    out = []
    for i, (kind, members) in enumerate(d.cycles, 1):
        inside = sorted(ms & set(members))
        if not inside:
            continue
        mech = 'direct calls + event signals' if kind == 'call' else 'shared Supabase table'
        others = sorted(set(members) - ms)
        out.append([f'Loop {i} ({mech})', ', '.join(_cur(m) for m in inside),
                    ', '.join(f'<code>{esc(m)}</code> ({esc(MODULE_DOMAIN.get(m, "cross-cutting"))})' for m in others) or '—'])
    return len(out), _table(['Loop', 'This domain\'s members', 'Members in other domains'], out)


BUILDERS = {'oracle': _oracle, 'gates': _gates, 'decisions': _decisions, 'path': _path,
            'branches': _branches, 'load': _load, 'loops': _loops}


def build_domain_dims(rnum):
    """The 'In-app dimensions' block for one domain (river number)."""
    domain = DOMAIN_ORDER[rnum - 1]
    mods = _mods(domain)
    sections, counts = [], {}
    for key, icon, label in DIMS:
        n, body = BUILDERS[key](domain, mods)
        counts[key] = n
        sections.append(f'<details id="dim-{domain}-{key}"><summary>{icon} {label} — {n}</summary>'
                        f'<div class="dd-body">{body}</div></details>')
    hub = dict(icon='🏛️', label=RIVER_NAME[rnum].split('—')[0].strip(), color='#C9A84C')
    leaves = [dict(id=f'{domain}-{k}', icon=i, label=l, sub=f'{counts[k]}', color='#4A90E2',
                   href=f'#dim-{domain}-{k}', dead=(counts[k] == 0), note='none in this domain')
              for k, i, l in DIMS]
    bubble = render_bubble_row(hub, leaves, _curved_edge, _build_markers, leaf_r=22, width=900,
                               emit_defs=(rnum == 1))
    return (f'<div class="ddims" id="dims-{domain}"><h4>🧭 In-app dimensions — {esc(RIVER_NAME[rnum])}</h4>'
            f'{bubble}{"".join(sections)}</div>'), counts


def build_all():
    """(html, totals) for every domain, in DOMAIN_ORDER."""
    html, totals = [], {k: 0 for k, _, _ in DIMS}
    for d in DOMAIN_ORDER:
        h, c = build_domain_dims(DOMAIN_NUM[d])
        html.append(h)
        for k, v in c.items():
            totals[k] += v
    return ''.join(html), totals


def write_redirect(path, target_hash='#in-app-dims', title='Moved'):
    """Old in-app dimension pages become one-line redirects (hash kept)."""
    Path(path).write_text(
        '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<title>{title}</title>\n'
        f'<meta http-equiv="refresh" content="0; url=galaxy_map_domain.html{target_hash}">\n'
        f'<script>location.replace("galaxy_map_domain.html"+(location.hash||"{target_hash}"));</script>\n'
        '</head><body><p>This page moved into the domain pages: '
        f'<a href="galaxy_map_domain.html{target_hash}">In-app dimensions</a>.</p></body></html>\n',
        encoding='utf-8')
