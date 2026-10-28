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
    if not a or a[0] not in ('check', 'where', 'file', 'cat'):
        sys.exit(__doc__)
    if a[0] == 'check':
        sys.exit(check())
    if a[0] == 'where':
        f, n = where(int(a[1]))
        print('%s:%s' % (f, n) if f else 'line out of range')
    elif a[0] == 'file':
        print(module_file(a[1]))
    else:
        sys.stdout.write(read())
