#!/usr/bin/env python3
"""
obsidian_vault_to_html.py — Aug 11 2026, closes the real gap found when
Alex asked "how do I actually reach Obsidian, and can it live in Oversight
like graphify does."

Real problem, not a workaround dressed up as one: obsidian-vault/ is a
folder of plain markdown using [[wikilink]] syntax. That syntax only
becomes real clickable navigation inside the Obsidian application itself
— a browser (or GitHub's file viewer) shows literal brackets, not links.
There was no URL Alex could open from the in-app Oversight popup the way
graphify-out/graph.html already works, so this script builds one.

Real Aintergration-shaped tool check done first, not skipped: the two
real static-vault exporters (Quartz, obsidianhtml) were checked against
this environment before writing a from-scratch converter —
`obsidianhtml` installs from PyPI fine but depends on a `pandoc` binary
that is NOT present here (no apt access confirmed, not assumed); Quartz
is a full Node static-site-generator project (its own package.json,
build pipeline, dozens of transitive deps), real overkill for a 16-file,
~400-line vault. Given the vault's actual size, a small self-contained
script mirroring this project's OWN already-proven pattern
(graphify_recolor.py / graphify_river_group.py: plain Python, zero new
runtime dependency, deterministic, output committed to the repo like
graph.html already is) is the right-sized fix — not a rule-8 violation,
since neither obsidianhtml nor Quartz is already live anywhere in this
project to duplicate.

What this does NOT do, honestly: this is not a general Obsidian-vault
converter — it knows exactly the shape graphify_to_obsidian.py produces
(YAML frontmatter delimited by `---`, then a small real markdown subset:
#/##/### headers, **bold**, `code`, `- ` bullet lists, blank-line
paragraphs, `---` rules, and [[wikilink]] / [[wikilink|label]] links). If
the vault's own generator ever emits a construct outside that subset,
this script will render it as a plain paragraph rather than silently
mis-rendering it — fail-visible, not fail-silent, per rule 7.

Usage:
    python3 scripts/obsidian_vault_to_html.py [vault_dir] [out_file]
    (defaults: obsidian-vault/ -> graphify-out/obsidian_vault.html)
"""
import re
import sys
from pathlib import Path
from html import escape

DEFAULT_VAULT = Path('obsidian-vault')
DEFAULT_OUT = Path('graphify-out/obsidian_vault.html')

# Real tokens, copied directly from style.css's own :root (same sourcing
# discipline as graphify_recolor.py — every value below is confirmed
# present in style.css, none fabricated).
TOKENS = {
    'gold': '#c9a84c', 'gold2': '#e8c96a', 'dark': '#0d0f14', 'darker': '#080a0e',
    'panel': '#13161e', 'panel2': '#1a1e29', 'panel3': '#20263a',
    'border': '#2a3050', 'border2': '#3a4570',
    'text': '#d4daf5', 'muted': '#868db8',
    'green': '#4caf82', 'blue': '#4a8ccc', 'red': '#cc4a4a',
    'purple': '#9b6ec8', 'orange': '#cc7a3a',
}


def slugify(stem: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', stem.lower()).strip('-')


def parse_frontmatter(text: str):
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', text, re.DOTALL)
    if not m:
        return {}, text
    fm_raw, body = m.group(1), m.group(2)
    fm = {}
    for line in fm_raw.splitlines():
        if ':' not in line:
            continue
        k, v = line.split(':', 1)
        fm[k.strip()] = v.strip().strip('"')
    return fm, body


def render_inline(text: str, pages_by_key: dict) -> str:
    # Wikilinks first (may contain characters that would otherwise get
    # HTML-escaped or caught by later rules).
    def wikilink(m):
        target, label = m.group(1), m.group(2)
        label = label or target
        key = re.sub(r'\.md$', '', target).strip().lower()
        slug = pages_by_key.get(key)
        if slug:
            return f'<a href="#{slug}" class="wl" onclick="nav(\'{slug}\');return false;">{escape(label)}</a>'
        # Honest unresolved link — as of v2 scope (G57, Aug 20 2026) all
        # 45 real modules have their own note; a genuinely unresolved
        # link now means the target is something else entirely (a
        # skill name, a main.js-legacy function, a non-module concept)
        # rather than a known-missing module note.
        return f'<span class="wl-broken" title="No note exists for this target — see obsidian-vault/ in graphify_to_obsidian.py">{escape(label)}</span>'

    text = re.sub(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]', wikilink, text)
    text = escape(text, quote=False).replace('&lt;a ', '<a ').replace('&lt;/a&gt;', '</a>') \
        if False else text  # placeholder no-op, escaping handled per-token below
    # Bold / inline code (applied after wikilinks so their generated HTML
    # tags aren't re-escaped).
    parts = re.split(r'(<a[^>]*>.*?</a>|<span[^>]*>.*?</span>)', text)
    out = []
    for part in parts:
        if part.startswith('<a ') or part.startswith('<span '):
            out.append(part)
            continue
        p = escape(part)
        p = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', p)
        p = re.sub(r'`([^`]+)`', r'<code>\1</code>', p)
        out.append(p)
    return ''.join(out)


def render_body(body: str, pages_by_key: dict) -> str:
    html = []
    in_list = False
    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            if in_list:
                html.append('</ul>')
                in_list = False
            continue
        if line.strip() == '---':
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append('<hr>')
            continue
        h = re.match(r'^(#{1,3})\s+(.*)$', line)
        if h:
            if in_list:
                html.append('</ul>')
                in_list = False
            level = len(h.group(1)) + 1  # h1 reserved for the page title
            html.append(f'<h{level}>{render_inline(h.group(2), pages_by_key)}</h{level}>')
            continue
        li = re.match(r'^-\s+(.*)$', line)
        if li:
            if not in_list:
                html.append('<ul>')
                in_list = True
            html.append(f'<li>{render_inline(li.group(1), pages_by_key)}</li>')
            continue
        em = re.match(r'^\*(.+)\*$', line.strip())
        if em:
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<p class="em">{render_inline(em.group(1), pages_by_key)}</p>')
            continue
        if in_list:
            html.append('</ul>')
            in_list = False
        html.append(f'<p>{render_inline(line, pages_by_key)}</p>')
    if in_list:
        html.append('</ul>')
    return '\n'.join(html)


def build(vault_dir: Path, out_file: Path):
    md_files = sorted(vault_dir.glob('*.md'))
    if not md_files:
        print(f'ERROR: no .md files found in {vault_dir}/')
        sys.exit(1)

    pages = []
    for f in md_files:
        fm, body = parse_frontmatter(f.read_text(encoding='utf-8'))
        title_m = re.search(r'^#\s+(.*)$', body, re.MULTILINE)
        title = title_m.group(1) if title_m else f.stem
        pages.append({'stem': f.stem, 'slug': slugify(f.stem), 'title': title,
                       'fm': fm, 'body': body})

    pages_by_key = {p['stem'].lower(): p['slug'] for p in pages}
    # Also key by the title (rivers are wikilinked by filename incl. .md
    # in graphify_to_obsidian.py, but keying both ways is a cheap real
    # safety net against a future generator change).
    for p in pages:
        pages_by_key.setdefault(p['title'].lower(), p['slug'])

    for p in pages:
        p['html'] = render_body(p['body'], pages_by_key)

    index_slug = next((p['slug'] for p in pages if p['stem'] == 'RPGACE System Map'), pages[0]['slug'])

    nav_items = []
    for p in pages:
        kind = p['fm'].get('kind', '')
        badge = f'<span class="nav-kind">{escape(kind)}</span>' if kind else ''
        nav_items.append(
            f'<li><a href="#{p["slug"]}" onclick="nav(\'{p["slug"]}\');return false;" '
            f'data-slug="{p["slug"]}">{escape(p["title"])}{badge}</a></li>'
        )

    sections = []
    for p in pages:
        color = p['fm'].get('color', TOKENS['gold'])
        sections.append(
            f'<section id="{p["slug"]}" class="page" data-slug="{p["slug"]}" '
            f'style="--accent:{escape(color)}">\n'
            f'<h1>{escape(p["title"])}</h1>\n{p["html"]}\n</section>'
        )

    css = f"""
:root{{--gold:{TOKENS['gold']};--gold2:{TOKENS['gold2']};--dark:{TOKENS['dark']};
--darker:{TOKENS['darker']};--panel:{TOKENS['panel']};--panel2:{TOKENS['panel2']};
--panel3:{TOKENS['panel3']};--border:{TOKENS['border']};--border2:{TOKENS['border2']};
--text:{TOKENS['text']};--muted:{TOKENS['muted']};--green:{TOKENS['green']};
--blue:{TOKENS['blue']};--red:{TOKENS['red']};--purple:{TOKENS['purple']};--orange:{TOKENS['orange']}}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--darker);color:var(--text);
font-family:'Rajdhani',Arial,sans-serif;display:flex;min-height:100vh}}
aside{{width:280px;flex-shrink:0;background:var(--dark);border-right:1px solid var(--border);
padding:18px 0;position:sticky;top:0;height:100vh;overflow-y:auto}}
aside h2{{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);
padding:0 18px;margin:18px 0 8px}}
aside ul{{list-style:none;margin:0;padding:0}}
aside li a{{display:flex;justify-content:space-between;align-items:center;gap:6px;
padding:8px 18px;color:var(--text);text-decoration:none;font-size:13.5px;
border-left:3px solid transparent}}
aside li a:hover{{background:var(--panel2)}}
aside li a.active{{background:var(--panel2);border-left-color:var(--gold);color:var(--gold)}}
.nav-kind{{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);
border:1px solid var(--border);border-radius:3px;padding:1px 5px;flex-shrink:0}}
main{{flex:1;padding:32px 40px;max-width:900px}}
.page{{display:none}}
.page.active{{display:block}}
.page h1{{font-family:Cinzel,serif;font-size:24px;color:var(--accent,var(--gold));
border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:18px}}
.page h2{{font-size:16px;color:var(--gold2);margin:24px 0 10px}}
.page h3{{font-size:14px;color:var(--text);margin:18px 0 8px}}
.page p{{line-height:1.6;font-size:14.5px;margin:8px 0}}
.page p.em{{color:var(--muted);font-style:italic;font-size:13px}}
.page ul{{margin:6px 0 14px;padding-left:22px}}
.page li{{line-height:1.6;font-size:14px;margin:4px 0}}
.page code{{background:var(--panel3);border:1px solid var(--border);border-radius:3px;
padding:1px 5px;font-size:12.5px;color:var(--gold2)}}
.page hr{{border:none;border-top:1px solid var(--border);margin:20px 0}}
.wl{{color:var(--blue);text-decoration:none;border-bottom:1px dotted var(--blue)}}
.wl:hover{{color:var(--gold2)}}
.wl-broken{{color:var(--muted);border-bottom:1px dashed var(--red);cursor:help}}
.topbar{{position:fixed;top:0;left:280px;right:0;background:var(--darker);
border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:var(--muted);
letter-spacing:1px;z-index:5}}
main{{margin-top:44px}}
@media(max-width:800px){{body{{flex-direction:column}}aside{{width:100%;height:auto;
position:relative;border-right:none;border-bottom:1px solid var(--border)}}
.topbar{{left:0}}main{{max-width:100%;padding:20px}}}}
"""

    js = f"""
var DEFAULT_SLUG = {index_slug!r};
function nav(slug){{
  document.querySelectorAll('.page').forEach(function(el){{el.classList.remove('active')}});
  document.querySelectorAll('aside a').forEach(function(el){{el.classList.remove('active')}});
  var target = document.getElementById(slug) ? slug : DEFAULT_SLUG;
  document.getElementById(target).classList.add('active');
  var link = document.querySelector('aside a[data-slug="'+target+'"]');
  if(link) link.classList.add('active');
  window.location.hash = target;
  document.querySelector('main').scrollTop = 0;
}}
window.addEventListener('hashchange', function(){{nav(window.location.hash.slice(1))}});
nav(window.location.hash.slice(1) || DEFAULT_SLUG);
"""

    rivers = [p for p in pages if p['fm'].get('kind') == 'river']
    zones = [p for p in pages if p['fm'].get('kind') == 'zone']
    other = [p for p in pages if p['fm'].get('kind') not in ('river', 'zone')]

    def nav_group(title, items):
        if not items:
            return ''
        lis = '\n'.join(
            f'<li><a href="#{p["slug"]}" onclick="nav(\'{p["slug"]}\');return false;" '
            f'data-slug="{p["slug"]}">{escape(p["title"])}</a></li>' for p in items
        )
        return f'<h2>{escape(title)}</h2><ul>{lis}</ul>'

    html_doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>RPGACE Obsidian Vault — Auto-generated</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>{css}</style></head>
<body>
<div class="topbar">RPGACE Obsidian Vault &middot; auto-generated by scripts/obsidian_vault_to_html.py &middot; re-run after obsidian-vault/ changes</div>
<aside>
{nav_group('Index', other)}
{nav_group('Rivers', rivers)}
{nav_group('Zones', zones)}
</aside>
<main>
{chr(10).join(sections)}
</main>
<script>{js}</script>
</body></html>"""

    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(html_doc, encoding='utf-8')
    return len(pages)


if __name__ == '__main__':
    vault = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VAULT
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    if not vault.exists():
        print(f'ERROR: {vault}/ not found — run from the repo root.')
        sys.exit(1)
    n = build(vault, out)
    print(f'Wrote {n} pages to {out}')
