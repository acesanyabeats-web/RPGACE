"""Study question bank -> SQL insert batches (Oct 20 2026).

The JSON files in study/aws-aif-c01/ (served by the site; the Study page
syncs missing questions into Supabase on open) are the source of truth for the Study page's
AWS AI Practitioner bank (Supabase has no backup, so this folder is the
restore path). Each question: d (domain code), k ('m' = choose several,
default single), q (question), o (options), a (correct option indexes),
e (explanation), an (optional RPGACE analogy), op (optional screen key),
t (optional tags, 'service' = in the service-name flash round).

Usage: python3 scripts/study_bank_sql.py study/aws-aif-c01/ <file.json> [batch_size]  -> prints one
INSERT ... ON CONFLICT (course_id, stem) DO NOTHING per batch, separated
by a line '-- BATCH'. Lessons file (aws_aif_c01_lessons.json) is detected
by its 't'/'b' keys.
"""
import json, sys

COURSE = 'aws-aif-c01'

def dq(s, tag='q'):
    s = '' if s is None else str(s)
    assert '$' + tag + '$' not in s
    return '$' + tag + '$' + s + '$' + tag + '$'

def validate(x):
    assert x['d'] in '12345', x
    assert len(x['o']) >= 3, x['q']
    assert x['a'] and all(0 <= i < len(x['o']) for i in x['a']), x['q']
    k = 'multi' if x.get('k') == 'm' else 'single'
    assert (k == 'multi') == (len(x['a']) > 1), x['q']
    assert len(set(x['o'])) == len(x['o']), x['q']
    return k

def questions(rows):
    out = []
    for x in rows:
        k = validate(x)
        tags = '{' + ','.join(x.get('t', [])) + '}'
        out.append('(' + ','.join([
            dq(COURSE), dq(x['d']), dq(k), dq(x['q']),
            dq(json.dumps(x['o'], ensure_ascii=False), 'j') + '::jsonb',
            dq(json.dumps(x['a']), 'j') + '::jsonb',
            dq(x['e']), dq(x.get('an')) if x.get('an') else 'null',
            dq(x.get('op')) if x.get('op') else 'null', dq(tags) + '::text[]']) + ')')
    head = 'insert into public.study_questions (course_id, domain, kind, stem, options, answer, explanation, analogy, opens, tags) values '
    return head, out, ' on conflict (course_id, stem) do nothing'

def lessons(rows):
    out = []
    for i, x in enumerate(rows):
        out.append('(' + ','.join([dq(COURSE), dq(x['d']), str(i), dq(x['t']), dq(x['b']), dq(x.get('an')), dq(x.get('op'))]) + ')')
    head = 'insert into public.study_lessons (course_id, domain, ord, title, body, analogy, opens) values '
    return head, out, ' on conflict (course_id, title) do nothing'

if __name__ == '__main__':
    rows = json.load(open(sys.argv[1]))
    size = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    head, vals, tail = (lessons if 'b' in rows[0] else questions)(rows)
    for i in range(0, len(vals), size):
        print(head + ',\n'.join(vals[i:i + size]) + tail)
        print('-- BATCH')
