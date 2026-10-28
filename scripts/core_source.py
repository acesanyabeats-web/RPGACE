#!/usr/bin/env python3
"""CK-8 (Oct 28 2026, plan "Caps and Central Kit"): the ONE reader of RPGACE's client source.

Alex: "the big files should reference smaller blocks so oracle goes deeper when needed, like a ladder or tree".
rpgace_core.js is a HUB: a short index (one `// @file src/...` line per file, in load order) that holds no code.
The code lives in src/_core/*.js (the pre-module core) and src/<domain>/<module>.js (one per module). Every tool that
needs "the whole client source" calls read() here, which joins the hub's files IN MEMORY - no joined copy is ever
written to disk, so nothing is edited in two places. Only rpgace_core.min.js is built (scripts/minify_client.js,
through the JS twin scripts/core_source.js). A hub with no @file lines is read as the file itself (pre-split).

Line numbers: "rpgace_core.js:N" in docs and maps means line N of the joined source; `where N` says which src file
and local line that is.

  python3 scripts/core_source.py check          join, node --check, and fail if a src file is missing or unlisted
  python3 scripts/core_source.py where 12345    -> src/schedule/myDay.js:678
  python3 scripts/core_source.py file myDay     -> src/schedule/myDay.js
  python3 scripts/core_source.py cat > x.js     the joined source (for a one-off tool; never commit it)
"""
import os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HUB = ROOT / 'rpgace_core.js'
SRC = ROOT / 'src'
FILE_RE = re.compile(r'^// @file (\S+)', re.M)
_cache = {}


def hub_files():
    """src paths listed by the hub, in order; [] while rpgace_core.js still holds the code itself."""
    txt = HUB.read_text(encoding='utf-8')
    return FILE_RE.findall(txt) if txt.startswith('/* RPGACE HUB') else []


def _key():
    files = hub_files()
    paths = [HUB] + [ROOT / f for f in files]
    return tuple((str(p), p.stat().st_mtime_ns, p.stat().st_size) for p in paths if p.exists())


def read():
    """The whole client source, exactly as the single file used to be."""
    k = _key()
    if _cache.get('k') != k:
        files = hub_files()
        _cache['t'] = ''.join((ROOT / f).read_text(encoding='utf-8') for f in files) if files else HUB.read_text(encoding='utf-8')
        _cache['k'] = k
    return _cache['t']


def spans():
    """[(src path, first joined line, last joined line)]; one entry ('rpgace_core.js', 1, n) before the split."""
    files = hub_files() or ['rpgace_core.js']
    out, at = [], 1
    for f in files:
        n = (ROOT / f).read_text(encoding='utf-8').count('\n')
        out.append((f, at, at + max(n, 1) - 1))
        at += n
    return out


def where(line):
    for f, a, b in spans():
        if a <= line <= b:
            return f, line - a + 1
    return None, None


def module_file(name):
    for f in hub_files():
        if Path(f).stem == name:
            return f
    return 'rpgace_core.js'


def write_region(start_marker, end_marker, new_block):
    """Replace start_marker..end_marker (inclusive) with new_block in whichever file holds it. Returns the file."""
    for f in (hub_files() or ['rpgace_core.js']):
        p = ROOT / f
        t = p.read_text(encoding='utf-8')
        a = t.find(start_marker)
        if a < 0:
            continue
        b = t.find(end_marker, a)
        if b < 0:
            raise SystemExit('core_source: end marker missing in ' + f)
        p.write_text(t[:a] + new_block + t[b + len(end_marker):], encoding='utf-8')
        _cache.clear()
        return f
    raise SystemExit('core_source: start marker not found: ' + start_marker[:60])


def read_at(rev):
    """The joined source at a git revision (hub or pre-split single file)."""
    git = lambda path: subprocess.run(['git', 'show', '%s:%s' % (rev, path)], cwd=ROOT, capture_output=True, text=True).stdout
    hub = git('rpgace_core.js')
    files = FILE_RE.findall(hub) if hub.startswith('/* RPGACE HUB') else []
    return ''.join(git(f) for f in files) if files else hub


def file_containing(needle):
    """The src file (or the single file) whose text contains needle."""
    for f in (hub_files() or ['rpgace_core.js']):
        if needle in (ROOT / f).read_text(encoding='utf-8'):
            return f
    return None


def replace_once(old, new):
    """Replace old (must occur exactly once across the source) in whichever file holds it."""
    hits = [f for f in (hub_files() or ['rpgace_core.js']) if old in (ROOT / f).read_text(encoding='utf-8')]
    if len(hits) != 1 or (ROOT / hits[0]).read_text(encoding='utf-8').count(old) != 1:
        raise SystemExit('core_source.replace_once: text must occur exactly once (found in %s)' % hits)
    p = ROOT / hits[0]
    p.write_text(p.read_text(encoding='utf-8').replace(old, new, 1), encoding='utf-8')
    _cache.clear()
    return hits[0]


HUB_HEAD = """/* RPGACE HUB - rpgace_core.js holds no code (CK-8, Oct 28 2026, plan "Caps and Central Kit").
 * Alex: "the big files should reference smaller blocks so oracle goes deeper when needed, like a ladder or tree".
 * Ladder: this hub -> src/<domain>/<module>.js (one per RPGACE.register module) and src/_core/core.js (the
 * pre-module core: config, utils, register, legacy main.js). Load order = the order below. Edit the src files only.
 * Read the whole source with scripts/core_source.py (Python) / scripts/core_source.js (Node): it joins these files
 * in memory; nothing joined is written to disk except the served build rpgace_core.min.js (scripts/minify_client.js).
 * "rpgace_core.js:N" in docs = line N of the joined source; `python3 scripts/core_source.py where N` finds the file.
 * Check: `python3 scripts/core_source.py check` (syntax + every src file listed + every listed file present).
 */
"""


def split():
    """CK-8b: cut the single file into src/ files at module boundaries; byte-identical join or nothing is written."""
    if hub_files():
        raise SystemExit('already split')
    orig = HUB.read_text(encoding='utf-8')
    lines = orig.splitlines(keepends=True)
    mods, cur = [], None
    for i, l in enumerate(lines):
        m = re.match(r'\s*/\* ===MODULE:(\w+)=== \*/\s*$', l)
        e = re.match(r'\s*/\* ===END:(\w+)=== \*/\s*$', l)
        if m:
            cur = (m.group(1), i)
        elif e and cur and e.group(1) == cur[0]:
            mods.append((cur[0], cur[1], i)); cur = None
    if cur:
        raise SystemExit('unclosed module ' + cur[0])
    plan = [('src/_core/core.js', 0, mods[0][1])]           # [start, end) line indexes
    prev_end = mods[0][1]
    for k, (name, s, e) in enumerate(mods):
        body = ''.join(lines[s:e + 1])
        dm = re.search(r"domain:\s*'(\w+)'", body)
        dom = dm.group(1) if dm else 'platform'
        stop = mods[k + 1][1] if k + 1 < len(mods) else len(lines)
        # a module file = any gap before it (domain markers, banners) + the module + (last file only) the tail
        plan.append(('src/%s/%s.js' % (dom, name), prev_end, stop if k + 1 == len(mods) else e + 1))
        prev_end = e + 1
    chunks = [(f, ''.join(lines[a:b])) for f, a, b in plan]   # gaps between modules travel with the next file
    joined = ''.join(c for _, c in chunks)
    if joined != orig:
        raise SystemExit('split would not be byte-identical - nothing written')
    names = [f for f, _ in chunks]
    if len(set(names)) != len(names):
        raise SystemExit('duplicate module file name')
    for f, c in chunks:
        (ROOT / f).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / f).write_text(c, encoding='utf-8')
    hub = HUB_HEAD + ''.join('// @file %s\n' % f for f in names)
    HUB.write_text(hub, encoding='utf-8')
    _cache.clear()
    if read() != orig:
        raise SystemExit('re-read after split differs - restore with: git checkout rpgace_core.js && rm -rf src')
    print('split: %d files (%d modules + core), join byte-identical (%d bytes)' % (len(names), len(mods), len(orig.encode('utf-8'))))


class CorePath:
    """Drop-in for Path('rpgace_core.js') in tools that call .read_text()/.exists()/str()."""
    name = 'rpgace_core.js'

    def read_text(self, encoding='utf-8', errors=None):
        return read()

    def exists(self):
        return HUB.exists()

    def __str__(self):
        return 'rpgace_core.js'

    __repr__ = __str__


CORE = CorePath()


def check():
    files = hub_files()
    problems = []
    if files:
        listed = set(files)
        missing = [f for f in files if not (ROOT / f).exists()]
        on_disk = sorted(str(p.relative_to(ROOT)) for p in SRC.rglob('*.js'))
        unlisted = [f for f in on_disk if f not in listed]
        problems += ['hub names a missing file: ' + f for f in missing] + ['src file not in the hub: ' + f for f in unlisted]
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as tmp:
        tmp.write(read())
    r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
    os.unlink(tmp.name)
    if r.returncode:
        problems.append('syntax: ' + (r.stderr or r.stdout).strip()[:600])
    for p in problems:
        print('FAIL', p)
    print('core_source: %d files, %d lines, %s' % (len(files) or 1, read().count('\n'), 'FAIL' if problems else 'syntax clean'))
    return 1 if problems else 0


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('check', 'where', 'file', 'cat', 'split'):
        sys.exit(__doc__)
    if a[0] == 'check':
        sys.exit(check())
    if a[0] == 'split':
        split(); sys.exit(0)
    if a[0] == 'where':
        f, n = where(int(a[1]))
        print('%s:%s' % (f, n) if f else 'line out of range')
    elif a[0] == 'file':
        print(module_file(a[1]))
    else:
        sys.stdout.write(read())
