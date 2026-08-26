#!/usr/bin/env python3
"""
galaxy_map_loops.py — G104 (Aug 26 2026), real synthesis page, built after
Alex directly pushed back on an in-chat loop-finding pass: "surely there
are more than just those as loops" (correct — the first pass only checked
direct function calls) and then, once hooks/tables were added: "wouldn't
these hooks calls and shared tables be present in galaxy map too? like in
load, supabase and ui buttons/text fields and bubbles?" (also correct —
most of the raw data already existed on other pages).

Real design, confirmed via /interrogation (2 real forks, both answered):
this page is a pure SYNTHESIS over already-computed data, never a new
detector of its own (rule 8):
  - compute_cross_module_function_calls() — real direct module->module
    calls (already used by galaxy_map_module.py/galaxy_map_current.py).
  - compute_hook_signal_edges() — the full real project-wide fire/listen
    graph (already used, more narrowly, by galaxy_map_load.py's own new
    "Cross-Module Event Signals" tab, G104 same pass).
  - compute_all_supabase_table_touches() — real (module, func, op) per
    table (already used, un-cross-referenced, by galaxy_map_supabase.py).
  - compute_module_ui_signal() + galaxy_map_decision_matrix.build_unified()
    — real Alex-touchpoint cross-reference (Alex's own confirmed ask):
    for each loop, which member modules Alex can actually see/click/decide
    on, not just that the loop exists in code.

Real method: Tarjan's algorithm (same as compute_river_flow_cycles(),
never a naive DFS-back-edge scan — rule 4, that approach was already
tried and discarded once at river grain) over TWO separate graphs, kept
apart rather than merged into one undifferentiated blob because they are
genuinely different real mechanisms:
  1. Direct calls + hook fire/listen edges (a real CODE-PATH loop — one
     module's own code reaches another's, directly or via an event).
  2. Shared Supabase table writes/reads (a real DATA loop — two modules
     never call each other at all, but one's write becomes another's
     read, and the loop closes through the database, not the code).
core-wrapper[mainjs:X] pseudo-nodes (compute_hook_signal_edges()'s own
real naming for the legacy/main.js section) only ever have OUTGOING
edges in that function's own design — they can structurally never be
part of a multi-node cycle, so including them costs nothing and needed
no manual filtering.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, MODULE_RIVER, LEVEL3_MODULES,
    compute_cross_module_function_calls, compute_hook_signal_edges,
    compute_all_supabase_table_touches, compute_module_ui_signal,
)
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402
from galaxy_map_decision_matrix import build_unified  # noqa: E402

OUT = Path('graphify-out/galaxy_map_loops.html')

READ_OPS = {'select'}
WRITE_OPS = {'insert', 'update', 'del', 'secureWrite', 'upsert'}


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def _mod_link(mod):
    if mod in LEVEL3_MODULES:
        return f'<a href="galaxy_map_current.html#mod-{esc(mod)}"><code>{esc(mod)}</code></a>'
    return f'<code>{esc(mod)}</code>'


def _river_chip(mod):
    r = MODULE_RIVER.get(mod)
    if not r:
        return '<span class="rchip cross">cross-cutting</span>'
    color = RIVER_COLOR[r]
    short = RIVER_NAME[r].split('—')[0].strip()
    return f'<a class="rchip" style="--c:{color}" href="galaxy_map_module.html#river-{r}">{esc(short)}</a>'


def _tarjan(adj):
    """Real Tarjan SCC — same algorithm, same tie-break discipline
    (sorted() adjacency iteration, R5) as compute_river_flow_cycles()."""
    sys.setrecursionlimit(10000)
    index_counter = [0]
    stack, lowlink, index, on_stack, result = [], {}, {}, {}, []

    def strongconnect(v):
        index[v] = index_counter[0]
        lowlink[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack[v] = True
        for w in sorted(adj.get(v, ())):
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
            result.append(comp)

    all_nodes = set(adj.keys()) | {n for vs in adj.values() for n in vs}
    for n in sorted(all_nodes):
        if n not in index:
            strongconnect(n)
    return [sorted(c) for c in result if len(c) > 1]


def compute_call_hook_edges():
    """Graph 1: real direct-call edges + real hook fire/listen edges,
    combined (rule 8 — both already-computed, never re-derived)."""
    edges = set()
    for fm, ff, tm, tf in compute_cross_module_function_calls():
        if fm != tm:
            edges.add((fm, tm))
    for firer, listener, hook in compute_hook_signal_edges():
        if firer != listener:
            edges.add((firer, listener))
    adj = {}
    for a, b in edges:
        adj.setdefault(a, set()).add(b)
    return adj, edges


def compute_data_edges():
    """Graph 2: real Supabase write->read edges — module A writes table
    T, module B reads T, so A "feeds" B. Reuses compute_all_supabase_
    table_touches()'s already-computed (module, func, op) data directly
    (rule 8) — the exact data galaxy_map_supabase.py already renders,
    never re-parsed here."""
    writers_by_table, readers_by_table = {}, {}
    for tbl, entries in compute_all_supabase_table_touches().items():
        for mod, fn, op in entries:
            if op in WRITE_OPS:
                writers_by_table.setdefault(tbl, set()).add(mod)
            elif op in READ_OPS:
                readers_by_table.setdefault(tbl, set()).add(mod)
    edges = {}  # (a,b) -> set of tables
    for tbl in set(writers_by_table) | set(readers_by_table):
        for w in writers_by_table.get(tbl, ()):
            for r in readers_by_table.get(tbl, ()):
                if w != r:
                    edges.setdefault((w, r), set()).add(tbl)
    adj = {}
    for (a, b) in edges:
        adj.setdefault(a, set()).add(b)
    return adj, edges


def _alex_touch_html(members, decisions_by_module):
    """Real Alex-touchpoint cross-reference (Alex's own confirmed ask —
    "Yes, cross-reference it"). Reuses compute_module_ui_signal() (the
    same evidence the Level 2/3 Alex bubble is built from) and Decision
    Matrix's own build_unified() (the same data its own bubble view
    reads) — never a new detector, a real synthesis over both."""
    rows = []
    for m in sorted(members):
        sig = compute_module_ui_signal(m)
        decs = decisions_by_module.get(m, [])
        if not sig['output'] and not sig['input'] and not decs:
            continue
        bits = []
        if sig['output']:
            bits.append('🖥️ real rendered output')
        if sig['input']:
            bits.append('🖱️ real button/input')
        for d in decs:
            bits.append(f'<a href="{d["link"]}">{d["kind_label"]} {esc(d["title"])}</a>')
        rows.append(f'<li><code>{esc(m)}</code> — {" · ".join(bits)}</li>')
    if not rows:
        return '<p class="notouch">No real Alex-facing evidence (UI signal or decision gate) on any member of this loop — this one is purely internal/backend.</p>'
    return f'<p class="touchnote">🧑 Alex can actually see or act on this loop at:</p><ul class="touchlist">{"".join(rows)}</ul>'


def build_loop_card(idx, members, mechanism_label, mechanism_note, edge_lines, decisions_by_module):
    rivers = sorted({MODULE_RIVER.get(m) for m in members if MODULE_RIVER.get(m)})
    river_txt = ', '.join(RIVER_NAME[r].split('—')[0].strip() for r in rivers) if rivers else 'cross-cutting only'
    chips = ''.join(f'<span class="mchip">{_mod_link(m)} {_river_chip(m)}</span>' for m in members)
    edges_html = ''.join(f'<li>{e}</li>' for e in edge_lines)
    touch_html = _alex_touch_html(members, decisions_by_module)
    return f'''<div class="loopcard">
  <div class="loophead"><h3>Loop {idx} — {mechanism_label}</h3><span class="loopcount">{len(members)} modules · {len(rivers)} river(s): {esc(river_txt)}</span></div>
  <p class="loopnote">{mechanism_note}</p>
  <div class="mchips">{chips}</div>
  <details class="edgedetail"><summary>Real edges forming this loop ({len(edge_lines)})</summary><ul class="edgelist">{edges_html}</ul></details>
  {touch_html}
</div>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Loops)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --red:#cc4a4a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #1a0e0e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto}}
  .content{{max-width:1100px;margin:0 auto;padding:24px}}
  .grouphead{{font-family:Georgia,serif;font-size:18px;color:#fff;margin:28px 0 6px}}
  .groupnote{{font-size:11.5px;color:#a8a8b8;margin-bottom:16px;line-height:1.6}}
  .loopcard{{background:rgba(204,74,74,.06);border:1px solid rgba(204,74,74,.25);border-radius:10px;padding:18px 20px;margin-bottom:16px}}
  .loophead{{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:6px}}
  .loophead h3{{font-family:Georgia,serif;font-size:16px;color:#fff}}
  .loopcount{{font-size:10px;color:var(--red);font-weight:700}}
  .loopnote{{font-size:11.5px;color:#a8a8b8;line-height:1.6;margin-bottom:10px}}
  .mchips{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}}
  .mchip{{background:rgba(255,255,255,0.05);border-radius:6px;padding:4px 8px;font-size:11px;display:flex;align-items:center;gap:6px}}
  .mchip code{{color:var(--gold);font-family:'Cascadia Code','Fira Mono',monospace}}
  .rchip{{font-size:9.5px;padding:1px 6px;border-radius:8px;border:1px solid var(--c,#666);color:var(--c,#aaa);text-decoration:none}}
  .rchip.cross{{color:#6a6a78;border-color:#6a6a78}}
  .edgedetail{{margin-bottom:10px}}
  .edgedetail summary{{cursor:pointer;font-size:11px;color:var(--dim)}}
  .edgelist{{margin:8px 0 0 18px;font-size:10.5px;color:#c8c8d8;line-height:1.8}}
  .touchnote{{font-size:11px;color:var(--gold);margin-bottom:4px}}
  .touchlist{{margin:0 0 0 18px;font-size:10.5px;color:#c8c8d8;line-height:1.7}}
  .touchlist a{{color:var(--gold)}}
  .notouch{{font-size:10.5px;color:#6a6a78;font-style:italic}}
  a{{color:var(--gold)}}
  .note{{max-width:1100px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Loops (G104)</div>
  <h1>🔄 Loops — Real Cycles Across Calls, Hooks, and Shared Tables</h1>
  <p>Alex's own real ask, after a chat-only pass badly undercounted: "identify loop between all levels and objects of levels, infra and inter, river and modules." Two genuinely different real mechanisms create a real cycle here — a module's own code reaching another's (directly or via a fired/listened event), or two modules never calling each other at all but sharing a Supabase table's write and read — kept as two separate groups below, never merged into one blob.</p>
</div>
<div class="content">

<div class="grouphead">Mechanism 1 — Direct calls + cross-module event signals</div>
<div class="groupnote">Real edges: <code>compute_cross_module_function_calls()</code> (a module literally calling another's function) + <code>compute_hook_signal_edges()</code> (a real <code>RPGACE.hooks.fire()</code>/<code>.on()</code> pairing, or a legacy main.js function calling a module directly) — the exact same data <a href="galaxy_map_load.html#cat-events">Load Dimension's own "Cross-Module Event Signals" tab</a> renders. Full list of every real edge is there; this page only shows the ones that actually close a loop.</div>
{call_loops}

<div class="grouphead">Mechanism 2 — Shared Supabase tables (a real data loop, no direct call at all)</div>
<div class="groupnote">Real edges: one module writes a table, another reads it — the exact same <code>(module, function, operation)</code> data <a href="galaxy_map_supabase.html">the Supabase page</a> already shows per table, cross-referenced here into "does this actually close a loop." A pair of modules can be in BOTH groups above and below — that's real, not a bug: two modules can genuinely call each other directly AND share a table.</div>
{data_loops}

</div>
{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_loops.py</code> — real Tarjan-SCC synthesis over already-computed
  <code>graphify_river_group.py</code> data (<code>compute_cross_module_function_calls</code>/<code>compute_hook_signal_edges</code>/
  <code>compute_all_supabase_table_touches</code>/<code>compute_module_ui_signal</code>) and
  <code>galaxy_map_decision_matrix.build_unified()</code> — nothing here is re-derived from source, only recombined
  and cross-referenced (rule 8). G104 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan.
  Real, honest scope limit: server-side (<code>api/*.js</code>) call/data relationships aren't reachable by this
  client-side detector — same limit every other Galaxy Map page states.
</div>
</body>
</html>
"""


def main():
    call_adj, call_edges = compute_call_hook_edges()
    data_adj, data_edges = compute_data_edges()

    call_cycles = _tarjan(call_adj)
    data_cycles = _tarjan(data_adj)

    decisions_by_module = {}
    for d in build_unified():
        if d.get('module'):
            decisions_by_module.setdefault(d['module'], []).append(d)

    call_html = []
    for i, members in enumerate(call_cycles, 1):
        member_set = set(members)
        lines = []
        for (a, b) in sorted(call_edges):
            if a in member_set and b in member_set:
                lines.append(f'<code>{esc(a)}</code> → <code>{esc(b)}</code>')
        card = build_loop_card(
            i, members, 'direct calls + event signals',
            'A real module-to-module code path, either a literal function call or a fired/listened hook, that leads back to where it started.',
            lines, decisions_by_module,
        )
        call_html.append(card)
    if not call_html:
        call_html.append('<p class="groupnote">No real cycle found in this graph.</p>')

    data_html = []
    for i, members in enumerate(data_cycles, 1):
        member_set = set(members)
        lines = []
        for (a, b), tables in sorted(data_edges.items()):
            if a in member_set and b in member_set:
                lines.append(f'<code>{esc(a)}</code> writes → <code>{esc(b)}</code> reads (via {", ".join(sorted(tables))})')
        card = build_loop_card(
            i, members, 'shared Supabase table',
            'Two or more modules never call each other directly — one writes a real table, another reads it, and that read/write chain closes back on itself.',
            lines, decisions_by_module,
        )
        data_html.append(card)
    if not data_html:
        data_html.append('<p class="groupnote">No real cycle found in this graph.</p>')

    html = TEMPLATE.format(
        call_loops=''.join(call_html), data_loops=''.join(data_html),
        dim_index=dimension_index_html(OUT.name), dim_css=DIMENSION_INDEX_CSS,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(call_cycles)} real call/event loop(s), {len(data_cycles)} real data loop(s).")
    for c in call_cycles:
        print(f"  call/event loop: {len(c)} modules -> {c}")
    for c in data_cycles:
        print(f"  data loop: {len(c)} modules -> {c}")


if __name__ == '__main__':
    main()
