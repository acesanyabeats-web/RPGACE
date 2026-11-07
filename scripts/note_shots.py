#!/usr/bin/env python3
"""Turn a note_shots query result into image files the dev session can open.

Alex, Nov 7 2026: "Make notes screenshots save elsewhere, so you can see them".
Note screenshots live in the note_shots table (base64 JPEG). Run in Supabase:
  select n.id, n.created_at, n.realm, n.mime, n.b64 from note_shots n where n.created_at > now() - interval '1 day' order by n.created_at;
The connector saves a big result to a file; then:
  python3 scripts/note_shots.py <that result file> [out_dir]
Writes <out_dir>/<created_at>_<realm>_<id8>.jpg for each row and prints the paths (open them with the Read tool).
Match a screenshot to its note: the note's journal row has a line "📷 shot:<id>".
"""
import base64, json, os, re, sys

def rows_from(text):
    m = re.search(r'\[\s*\{.*\}\s*\]', text, re.S)
    if not m:
        raise SystemExit('no JSON rows found in the input')
    raw = m.group(0)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return json.loads(raw.encode().decode('unicode_escape'))

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '-'
    out = sys.argv[2] if len(sys.argv) > 2 else 'note_shots_out'
    text = sys.stdin.read() if src == '-' else open(src, encoding='utf-8').read()
    try:
        outer = json.loads(text)
        if isinstance(outer, dict) and isinstance(outer.get('result'), str):
            text = outer['result']
    except json.JSONDecodeError:
        pass
    os.makedirs(out, exist_ok=True)
    for r in rows_from(text):
        if not r.get('b64'):
            continue
        ext = 'png' if 'png' in (r.get('mime') or '') else 'jpg'
        when = re.sub(r'[^0-9T]', '', str(r.get('created_at') or ''))[:13]
        name = '%s_%s_%s.%s' % (when or 'shot', r.get('realm') or 'today', str(r.get('id'))[:8], ext)
        path = os.path.join(out, name)
        with open(path, 'wb') as f:
            f.write(base64.b64decode(re.sub(r'\s+', '', r['b64'])))
        print(path)

if __name__ == '__main__':
    main()
