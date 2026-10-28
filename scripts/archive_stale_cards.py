#!/usr/bin/env python3
"""CK-5 brown archive for patch_notes.html (plan "Caps and Central Kit", Oct 28 2026).

A patch-note card is archived when a change makes it untrue, never by age.
  propose [--since REV]   list cards whose code references no longer exist in the code
                          (with --since: only cards naming something the diff since REV removed)
  archive ID... --reason "why it became untrue" [--plan-item UUID]
                          move each card verbatim to patch_notes_archive.html, leave a one-line
                          brown pointer with the same id in patch_notes.html, and print the
                          achiever_archive insert to run (short SQL, one row per card)
Plan items name the cards they make untrue in ceo_plan_items.stales; this script proposes
extras, Alex confirms the first batch. Nothing is deleted: the full card lives in the archive.
"""
import os, re, sys, subprocess, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = os.path.join(ROOT, 'patch_notes.html')
ARCH = os.path.join(ROOT, 'patch_notes_archive.html')
CODE_DIRS = ['api', 'scripts', 'prompts', 'local_server', 'src']
CODE_FILES = ['rpgace_core.js', 'index.html', 'main.js', 'realm_lenses.json']
ARCH_SECTION = '<div class="section" id="archived-untrue">'
CARD_OPEN = re.compile(r'<div class="card[^"]*" id="(card-[^"]+)"[^>]*>')


def card_spans(text):
    """{id: (start, end)} for every top-level card with an id, end after its closing </div>."""
    out = {}
    for m in CARD_OPEN.finditer(text):
        depth, i = 0, m.start()
        for t in re.finditer(r'<div\b|</div>', text[m.start():]):
            depth += 1 if t.group(0) == '<div' else -1
            if depth == 0:
                i = m.start() + t.end()
                break
        out[m.group(1)] = (m.start(), i)
    return out


def code_tokens():
    toks = set()
    paths = [os.path.join(ROOT, f) for f in CODE_FILES]
    for d in CODE_DIRS:
        for base, _, files in os.walk(os.path.join(ROOT, d)):
            paths += [os.path.join(base, f) for f in files if f.endswith(('.js', '.py', '.sql', '.md', '.json'))]
    for p in paths:
        if os.path.isfile(p):
            toks.update(re.findall(r'[A-Za-z_]\w{3,}', open(p, encoding='utf-8', errors='ignore').read()))
    return toks


def refs(card_html):
    """Code names a card asserts: dotted names (module.fn) and _private fns inside <code>."""
    names = set()
    for c in re.findall(r'<code>(.*?)</code>', card_html, re.S):
        c = html.unescape(re.sub(r'<[^>]+>', '', c))
        for d in re.findall(r'\b[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)+', c):
            if not re.search(r'\.(js|py|md|html|json|sql|txt|css|png)$', d):
                names.add(d.split('.')[-1])
        names.update(re.findall(r'\b_[a-zA-Z]\w{3,}', c))
    return {n for n in names if len(n) >= 4}


def title(card_html):
    m = re.search(r'<div class="card-title">(.*?)</div>', card_html, re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(1)))).strip() if m else ''


def removed_names(since):
    diff = subprocess.run(['git', 'diff', since, '--', 'rpgace_core.js', 'api'], cwd=ROOT,
                          capture_output=True, text=True).stdout
    gone = set()
    for l in diff.splitlines():
        if l.startswith('-') and not l.startswith('---'):
            gone.update(re.findall(r'^-\s*(?:async\s+)?(?:function\s+)?([a-zA-Z_]\w{3,})\s*(?::\s*(?:async\s+)?function|\()', l))
    return gone


def propose(since=None):
    text = open(LIVE, encoding='utf-8').read()
    toks = code_tokens()
    gone = removed_names(since) - toks if since else None
    rows = []
    for cid, (a, b) in card_spans(text).items():
        card = text[a:b]
        if 'card brown' in card[:60]:
            continue
        r = refs(card)
        missing = sorted(n for n in r if n not in toks)
        if gone is not None:
            words = set(re.findall(r'[A-Za-z_]\w{3,}', card))   # plain-English cards name code outside <code> too
            hit = sorted(gone & (words | r))
            if hit:
                rows.append((cid, len(r), hit, title(card)))
        elif len(r) >= 3 and len(missing) / len(r) >= 0.6:
            rows.append((cid, len(r), missing, title(card)))
    for cid, n, miss, t in rows:
        print('%s | %d refs, gone: %s | %s' % (cid, n, ', '.join(miss[:6]), t[:90]))
    print('%d proposed (nothing moved; archive needs the ids and a reason)' % len(rows))
    return rows


def sql_str(s):
    return "'" + s.replace("'", "''") + "'"


def archive(ids, reason, plan_item=None):
    live = open(LIVE, encoding='utf-8').read()
    arch = open(ARCH, encoding='utf-8').read()
    spans = card_spans(live)
    missing = [i for i in ids if i not in spans]
    if missing:
        sys.exit('not in patch_notes.html: ' + ', '.join(missing))
    if ARCH_SECTION not in arch:
        head = ('%s\n  <div class="section-eyebrow">Brown</div>\n  <div class="section-title">Archived as untrue</div>\n'
                '  <div class="section-sub">Cards a later change made untrue (CK-5, Oct 28 2026). Moved here word for word; '
                'the live doc keeps a one-line pointer with the same id.</div>\n<!--ARCHIVED-UNTRUE-END-->\n</div>\n\n') % ARCH_SECTION
        arch = arch.replace('<div class="section" id="format-rules">', head + '<div class="section" id="format-rules">', 1)
    sql = []
    for cid in sorted(ids, key=lambda i: -spans[i][0]):   # bottom-up so earlier offsets stay valid
        a, b = spans[cid]
        card, t = live[a:b], title(live[a:b])
        pointer = ('<div class="card brown" id="%s" style="margin-bottom:30px;"><div class="card-title">🟫 %s (archived: no longer true)</div>'
                   '<div class="card-body">%s <a href="patch_notes_archive.html#%s">Full card in the archive</a>.</div></div>'
                   % (cid, html.escape(t), html.escape(reason), cid))
        live = live[:a] + pointer + live[b:]
        arch = arch.replace('<!--ARCHIVED-UNTRUE-END-->', card + '\n\n<!--ARCHIVED-UNTRUE-END-->', 1)
        sql.append("insert into achiever_archive (category, claim_text, source_doc, source_location, became_false_reason, archived_by%s) values ('patch_note', %s, 'patch_notes.html', %s, %s, 'archive_stale_cards.py'%s);"
                   % (', linked_plan_item_id' if plan_item else '', sql_str(t[:300]), sql_str(cid), sql_str(reason),
                      ', ' + sql_str(plan_item) if plan_item else ''))
    if '.card.brown' not in live:
        live = live.replace('</style>', '  .card.brown{border-color:rgba(150,105,60,0.3);background:rgba(150,105,60,0.05)}\n</style>', 1)
    open(LIVE, 'w', encoding='utf-8').write(live)
    open(ARCH, 'w', encoding='utf-8').write(arch)
    print('\n'.join(sql))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('propose', 'archive'):
        sys.exit(__doc__)
    if a[0] == 'propose':
        propose(a[a.index('--since') + 1] if '--since' in a else None)
    else:
        if '--reason' not in a:
            sys.exit('archive needs --reason "why it became untrue"')
        reason = a[a.index('--reason') + 1]
        plan = a[a.index('--plan-item') + 1] if '--plan-item' in a else None
        skip = {reason, plan, '--reason', '--plan-item'}
        archive([x for x in a[1:] if x not in skip], reason, plan)
