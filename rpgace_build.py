#!/usr/bin/env python3
"""
RPGACE Master Build Tool v2
Domain-aware module management for rpgace_core.js

USAGE:
  python rpgace_build.py list                    - All modules by domain
  python rpgace_build.py add <DOMAIN> <file.js>  - Add module to domain
  python rpgace_build.py update <name> <file.js> - Replace existing module
  python rpgace_build.py remove <name>           - Remove module
  python rpgace_build.py check                   - Syntax + duplicate check
  python rpgace_build.py deploy "msg"            - Full git + vercel deploy
  python rpgace_build.py status                  - Overview
  python rpgace_build.py migrate                 - Add domain markers
  python rpgace_build.py new <DOMAIN> <name>     - Scaffold empty module
"""
import sys, re, subprocess
from pathlib import Path

TARGET = Path("rpgace_core.js")
IS_WIN = sys.platform == 'win32'

def MOD_S(n): return f"/* ===MODULE:{n}=== */"
def MOD_E(n): return f"/* ===END:{n}=== */"
def DOM_S(n): return f"/* ===DOMAIN:{n}=== */"
def DOM_E(n): return f"/* ===END_DOMAIN:{n}=== */"
MOD_S_RE = re.compile(r'/\* ===MODULE:(\w+)=== \*/')
DOM_S_RE = re.compile(r'/\* ===DOMAIN:(\w+)=== \*/')

DOMAINS = ['FOUNDATION','CONFIG','ORACLE','LEARNING','SCHEDULE','CONTENT','JOURNAL','SYSTEM']

REAL_MODULES = {
    'config','feynman','youtubeOracle','prodOraclePanel','instaOraclePanel',
    'encSync','intelDelete','ytOracle','prodOracle','instaOracle','visualOracle',
    'contentRepurpose','taxonomySync','knowledgeGap','deepResearch','feynmanLoop',
    'workStyle','flowState','agendaScheduler','shiftIntegration',
    'beatLog','videoTab','visualTreatment',
    'morningBrief','weeklyReview','sessionLogger',
    'composioFix','n8nHooks','directInject',
}

DOMAIN_MAP = {
    'config':'CONFIG',
    'ytOracle':'ORACLE','youtubeOracle':'ORACLE',
    'prodOracle':'ORACLE','prodOraclePanel':'ORACLE',
    'instaOracle':'ORACLE','instaOraclePanel':'ORACLE',
    'visualOracle':'ORACLE','contentRepurpose':'ORACLE',
    'feynman':'LEARNING','feynmanLoop':'LEARNING',
    'encSync':'LEARNING','intelDelete':'LEARNING',
    'taxonomySync':'LEARNING','knowledgeGap':'LEARNING','deepResearch':'LEARNING',
    'workStyle':'SCHEDULE','flowState':'SCHEDULE',
    'agendaScheduler':'SCHEDULE','shiftIntegration':'SCHEDULE',
    'beatLog':'CONTENT','videoTab':'CONTENT','visualTreatment':'CONTENT',
    'morningBrief':'JOURNAL','weeklyReview':'JOURNAL','sessionLogger':'JOURNAL',
    'composioFix':'SYSTEM','n8nHooks':'SYSTEM','directInject':'SYSTEM',
}

def read():
    return TARGET.read_text(encoding='utf-8', errors='replace')

def write(src):
    TARGET.write_text(src, encoding='utf-8', errors='replace')

def sh(cmd):
    """Shell command - Windows safe."""
    c = cmd if isinstance(cmd, str) else ' '.join(cmd)
    return subprocess.run(c, shell=IS_WIN or isinstance(cmd, str))

def sh_out(cmd):
    c = cmd if isinstance(cmd, str) else ' '.join(cmd)
    return subprocess.run(c, shell=True, capture_output=True, text=True)

def find_module_end(src, start_pos):
    """
    Find the end position (after ');') of a RPGACE.register() call.
    Handles strings, template literals, and block/line comments.
    """
    # Find the opening { of the module object
    i = src.find('{', start_pos)
    if i == -1:
        return len(src)
    depth = 0
    in_str = None    # None, "'", '"', '`'
    escape = False

    while i < len(src):
        c = src[i]

        if escape:
            escape = False; i += 1; continue

        if in_str:
            if c == '\\':
                escape = True
            elif c == in_str:
                in_str = None
            i += 1; continue

        # Not in string
        if c in ('"', "'", '`'):
            in_str = c; i += 1; continue

        if c == '/' and i + 1 < len(src):
            if src[i+1] == '/':            # line comment
                nl = src.find('\n', i)
                i = (nl + 1) if nl != -1 else len(src)
                continue
            if src[i+1] == '*':            # block comment
                end = src.find('*/', i + 2)
                i = (end + 2) if end != -1 else len(src)
                continue

        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                # Look for ); within the next 5 characters
                tail = src[i+1:i+6]
                semi = tail.find(');')
                if semi != -1:
                    return i + 1 + semi + 2
                return i + 1
        i += 1

    return len(src)

def syntax_check(src=None):
    code = src if src is not None else read()
    safe = re.sub(r'(?<![.])\.\.\.(?![.])', 'null', code)
    tmp = Path("_build_check.js")
    tmp.write_text(safe, encoding='utf-8', errors='replace')
    r = subprocess.run(['node', '--check', str(tmp.resolve())], capture_output=True, text=True, encoding='utf-8', errors='replace')
    tmp.unlink(missing_ok=True)
    return r.returncode == 0, r.stderr.strip()

def get_modules(src):
    mods = []
    for m in MOD_S_RE.finditer(src):
        name = m.group(1)
        em = MOD_E(name)
        ei = src.find(em, m.start())
        if ei == -1: continue
        domain = DOMAIN_MAP.get(name, 'UNKNOWN')
        for dm in DOM_S_RE.finditer(src):
            de = src.find(DOM_E(dm.group(1)), dm.start())
            if de != -1 and dm.start() <= m.start() < de:
                domain = dm.group(1); break
        mods.append((name, domain, m.start(), ei + len(em)))
    return mods

def get_domains(src):
    doms = []
    for m in DOM_S_RE.finditer(src):
        e = src.find(DOM_E(m.group(1)), m.start())
        if e != -1: doms.append((m.group(1), m.start(), e + len(DOM_E(m.group(1)))))
    return doms

# ── Commands ────────────────────────────────────────────────────────────
def cmd_list():
    src = read()
    mods = get_modules(src)
    by_dom = {}
    for n,d,s,e in mods: by_dom.setdefault(d,[]).append((n,e-s))
    cov = [(s,e) for (_,_,s,e) in mods]
    unreg = []
    seen = set()
    for m in re.finditer(r"RPGACE\.register\(['\"](\w+)['\"]", src):
        n = m.group(1)
        if not any(s<=m.start()<e for s,e in cov) and n in REAL_MODULES and n not in seen:
            unreg.append(n); seen.add(n)
    print(f"\n{'='*65}")
    print(f"  RPGACE Modules  |  {len(src):,} chars  |  {len(mods)} delimited")
    print(f"{'='*65}")
    for dom in DOMAINS:
        es = by_dom.get(dom,[])
        if not es: continue
        print(f"\n  [{dom}]")
        for n,sz in es: print(f"    {n:<30} {sz:>6,} chars")
    if unreg:
        print(f"\n  ⚠ UNDELIMITED — run migrate: {', '.join(unreg)}")
    print()

def cmd_add(domain, js_file):
    domain = domain.upper()
    if domain not in DOMAINS:
        print(f"Unknown domain. Use: {', '.join(DOMAINS)}"); return
    p = Path(js_file)
    if not p.exists():
        print(f"ERROR: {js_file} not found"); return
    code = p.read_text(encoding='utf-8', errors='replace').strip()
    m = re.search(r"RPGACE\.register\(['\"](\w+)['\"]", code)
    if not m:
        print("ERROR: No RPGACE.register() found in file"); return
    name = m.group(1)
    src = read()
    if MOD_S(name) in src:
        print(f"'{name}' already exists. Use: update {name} {js_file}"); return
    # Strip any existing markers in the file
    code = re.sub(r'/\* ===MODULE:\w+=== \*/\n?', '', code)
    code = re.sub(r'/\* ===END:\w+=== \*/\n?', '', code).strip()
    block = f"\n{MOD_S(name)}\n{code}\n{MOD_E(name)}\n"
    de = DOM_E(domain)
    if de in src:
        src = src.replace(de, block + de, 1)
    else:
        src = src.rstrip() + f"\n\n{DOM_S(domain)}\n{block}\n{de}\n"
    ok, err = syntax_check(src)
    if not ok:
        print("SYNTAX FAILED:"); print(err); return
    write(src)
    print(f"  '{name}' added to {domain}")
    print(f"  Deploy: python rpgace_build.py deploy \"Add {name}\"")

def cmd_update(name, js_file):
    p = Path(js_file)
    if not p.exists():
        print(f"ERROR: {js_file} not found"); return
    code = p.read_text(encoding='utf-8', errors='replace').strip()
    code = re.sub(r'/\* ===MODULE:\w+=== \*/\n?', '', code)
    code = re.sub(r'/\* ===END:\w+=== \*/\n?', '', code).strip()
    src = read()
    if MOD_S(name) not in src:
        print(f"ERROR: '{name}' not found"); cmd_list(); return
    s = src.index(MOD_S(name))
    em = MOD_E(name)
    e = src.index(em, s) + len(em)
    src = src[:s] + f"{MOD_S(name)}\n{code}\n{em}" + src[e:]
    ok, err = syntax_check(src)
    if not ok:
        print("SYNTAX FAILED:"); print(err); return
    write(src)
    print(f"  '{name}' updated")
    print(f"  Deploy: python rpgace_build.py deploy \"Update {name}\"")

def cmd_remove(name):
    src = read()
    if MOD_S(name) not in src:
        print(f"ERROR: '{name}' not found"); return
    s = src.index(MOD_S(name))
    while s > 0 and src[s-1] == '\n': s -= 1
    e = src.index(MOD_E(name), s) + len(MOD_E(name))
    src = src[:s] + src[e:]
    ok, err = syntax_check(src)
    if not ok:
        print("SYNTAX FAILED after removal:"); print(err); return
    write(src)
    print(f"  '{name}' removed")

def cmd_check():
    src = read()
    ok, err = syntax_check(src)
    mods = get_modules(src)
    names = [n for n,_,_,_ in mods]
    dupes = {n for n in names if names.count(n)>1}
    print(f"{'OK' if ok else 'FAILED'} | {len(src):,} chars | {len(mods)} modules")
    if dupes: print(f"  DUPLICATES: {dupes}")
    if not ok: print(err[:300])

def cmd_deploy(msg="Update RPGACE"):
    cmd_check()
    for c in [['git','add','rpgace_core.js'],
               ['git','commit','-m',msg],
               ['git','push'],
               ['npx','vercel','--prod']]:
        print(f"\n$ {' '.join(c)}")
        sh(c)

def cmd_migrate():
    src = read()
    mods = get_modules(src)
    cov = [(s,e) for (_,_,s,e) in mods]

    # Find all register positions for REAL modules
    # Use only the LAST occurrence of each name (the real one, not the example)
    all_regs = {}
    for m in re.finditer(r"RPGACE\.register\(['\"](\w+)['\"]", src):
        n = m.group(1)
        if n in REAL_MODULES and not any(s<=m.start()<e for s,e in cov):
            all_regs[n] = m.start()   # overwrite → keeps last occurrence

    if not all_regs:
        print("All modules already delimited."); cmd_list(); return

    print(f"Migrating {len(all_regs)} real modules...")

    # Process in reverse position order to preserve char offsets
    for name, pos in sorted(all_regs.items(), key=lambda x: x[1], reverse=True):
        block_end = find_module_end(src, pos)
        if block_end <= pos:
            print(f"  ⚠ Could not find end of '{name}' — skipping"); continue
        old = src[pos:block_end]
        new = f"{MOD_S(name)}\n{old}\n{MOD_E(name)}"
        src = src[:pos] + new + src[block_end:]
        print(f"  Wrapped '{name}'")

    ok, err = syntax_check(src)
    if ok:
        write(src)
        print(f"\nWrapped. Now adding domain structure...")
        # Re-read and add domain wrappers
        src = read()
        mods2 = get_modules(src)
        if not get_domains(src) and mods2:
            first = min(s for (_,_,s,_) in mods2)
            foundation = src[:first].rstrip()
            by_dom = {}
            for n,d,s,e in sorted(mods2, key=lambda x: x[2]):
                by_dom.setdefault(d,[]).append(src[s:e])
            new_sec = '\n'
            for dom in DOMAINS:
                blks = by_dom.get(dom,[])
                if not blks: continue
                new_sec += f"\n{DOM_S(dom)}\n"
                for b in blks: new_sec += '\n' + b + '\n'
                new_sec += f"{DOM_E(dom)}\n"
            final = foundation + new_sec
            ok2, err2 = syntax_check(final)
            if ok2:
                write(final)
                print(f"Migration complete ({len(final):,} chars)")
                cmd_list()
            else:
                print("Domain wrapping syntax error:", err2[:200])
                print("Blocks are wrapped, domain markers skipped.")
    else:
        print("SYNTAX FAILED:", err[:300])

def cmd_new(domain, name):
    domain = domain.upper()
    fname = f"mod_{name}.js"
    if Path(fname).exists():
        print(f"{fname} already exists"); return
    code = f"""RPGACE.register('{name}', {{

  init: function() {{
    var self = this;
    RPGACE.hooks.on('page:show', function(pageName) {{
      /* Wire to a tab: if (pageName === RPGACE.CONFIG.pages.oracle) self._setup(); */
    }});
    RPGACE.hooks.on('rpgace:ready', function() {{
      setTimeout(function() {{ self._setup(); }}, 500);
    }});
  }},

  _setup: function() {{
    /* TODO: implement */
  }},

}});
"""
    Path(fname).write_text(code, encoding='utf-8')
    print(f"Created {fname}")
    print(f"Implement it, then:")
    print(f"  python rpgace_build.py add {domain} {fname}")

def cmd_status():
    src = read()
    mods = get_modules(src)
    doms = get_domains(src)
    ok, _ = syntax_check(src)
    print(f"\nRPGACE | {len(src):,} chars | Syntax: {'OK' if ok else 'FAILED'}")
    print(f"Domains: {len(doms)} | Modules: {len(mods)}")
    r = sh_out(['git','log','--oneline','-3'])
    if r.stdout:
        print("\nRecent commits:")
        for l in r.stdout.strip().split('\n'): print(f"  {l}")

CMDS = {
    'list':    (cmd_list,   0),
    'add':     (cmd_add,    2),
    'update':  (cmd_update, 2),
    'remove':  (cmd_remove, 1),
    'check':   (cmd_check,  0),
    'deploy':  (lambda *a: cmd_deploy(a[0] if a else "Update RPGACE"), 0),
    'status':  (cmd_status, 0),
    'migrate': (cmd_migrate, 0),
    'new':     (cmd_new,    2),
}

if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] not in CMDS:
        print(__doc__); sys.exit(0)
    fn, n = CMDS[args[0]]
    fn(*args[1:1+n])


def cmd_cleanup():
    """Remove any undelimited register calls for modules that are already delimited."""
    src = read()
    mods = get_modules(src)
    cov = [(s,e) for (_,_,s,e) in mods]
    already_delimited = {n for n,_,_,_ in mods}

    removed = []
    # Find undelimited registers of already-wrapped names
    for m in re.finditer(r"RPGACE\.register\(['\"](\w+)['\"]", src):
        name = m.group(1)
        pos = m.start()
        if name not in already_delimited: continue
        if any(s <= pos < e for s,e in cov): continue  # already inside a block
        # This is an orphan — remove its full block
        block_end = find_module_end(src, pos)
        removed.append((name, pos, block_end))

    if not removed:
        print("No orphan registers found."); return

    print(f"Removing {len(removed)} orphan register(s)...")
    for name, s, e in sorted(removed, reverse=True):
        # Strip surrounding newlines
        while s > 0 and src[s-1] == '\n': s -= 1
        src = src[:s] + src[e:]
        print(f"  Removed orphan '{name}'")

    ok, err = syntax_check(src)
    if ok:
        write(src)
        print(f"Done ({len(src):,} chars)")
        cmd_list()
    else:
        print("SYNTAX FAILED:", err[:200])


# Patch CMDS to include cleanup
CMDS['cleanup'] = (cmd_cleanup, 0)
