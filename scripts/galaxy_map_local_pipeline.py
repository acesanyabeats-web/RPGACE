#!/usr/bin/env python3
"""
galaxy_map_local_pipeline.py — G110 (Sep 1 2026), the real Galaxy Map
identity for local_server.py / rpgace_intel.py.

RATIFIED SCOPE, verbatim from Alex's own final direction (ceo_plan_items
G110, "REAL UPDATE, same day, immediate follow-up"): "make a dimension
joining three as an inter, so it all one bubble migration with the logic
attached." — i.e. NOT 3 peer EXTERNAL_CONNECTORS bubbles sitting next to
each other on River XII, but ONE real Dimension page whose members
(local_server.py + Anthropic + Whisper) are shown as a single cluster,
with the governing logic that actually joins them attached inline.
librosa is deliberately EXCLUDED — its very existence is genuinely
unconfirmed (ceo_plan_items G114, Alex's own honest "i think so but
forgot it"), and forcing it in here would assert a relationship no real
evidence supports.

REAL EVIDENCE — every fact below was read directly out of the actual
source in this repo (local_server/local_server.py, local_server/
rpgace_intel.py, rpgace_core.js) during this build, never carried over
from a prior session's summary:

  * local_server.py runs a plain http.server on port 7842 with 5 real
    GET routes (/health /reports /watchlist /stats /push-to-supabase)
    and 1 real POST route (/analyse), plus a real poll_loop() that
    picks `intel_jobs` rows up out of Supabase and runs process_job().
  * process_job() imports rpgace_intel as a module and reads Alex's own
    Anthropic key from ~/.anthropic_key.
  * rpgace_intel.transcribe_audio() imports `whisper` (openai-whisper,
    WHISPER_MODEL = "small"), pip-installing it on first use.
  * rpgace_intel.call_claude() POSTs DIRECTLY to
    https://api.anthropic.com/v1/messages with model claude-sonnet-4-6.
    This is a real, SECOND Anthropic call path that does NOT go through
    RPGACE's own api/oracle.js proxy — a genuinely notable structural
    fact, and precisely the kind of thing that was invisible while these
    two files had no Galaxy Map identity at all.
  * The browser side is 3 real fetch() call sites, all inside
    rpgace_core.js's own /* ===LEGACY:mainjs=== */ section:
    fetchFromLocal() -> /reports, pushLocalToSupabase() -> /push-to-
    supabase, fetchWatchlistFromLocal() -> /watchlist; reached from
    syncIntelData() and syncAndPush().

R22 (bubble follows table) is honored literally: build_members()/
build_stages() are the real data, the table view renders them first, and
the bubble view is a pure rendering layer over those same structures.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, EXTERNAL_CONNECTORS,
    render_bubble_row, render_fc_bar, _curved_edge, _build_markers,
    inject_level_rail, dimension_index_html, DIMENSION_INDEX_CSS,
)

OUT = Path('graphify-out/galaxy_map_local_pipeline.html')

# The real river this cluster attaches to — River XII, the Research &
# Intel Stream (RIVER_MODULES[12]: researchTabs/intelBatchList/
# intelDelete/intelDedup/ciAutoPropose). Confirmed by direct read, not
# assumed: every browser-side call site below is reached from
# syncIntelData(), which is that river's own Content-Intelligence sync.
HOST_RIVER = 12

CLUSTER_COLOR = '#E8967A'   # reused from LOAD_COLOR's own family — a
                            # local, machine-side pipeline, deliberately
                            # NOT one of the hosted-connector colors.

# --------------------------------------------------------------------
# The 3 real cluster members. `evidence` is a real, checkable citation
# (file + what is literally there), never a paraphrase.
MEMBERS = [
    {
        'id': 'local-server',
        'icon': '🖥️',
        'label': 'local_server.py',
        'role': 'The host — the only member Alex actually starts',
        'kind': 'Local process (Alex\'s own machine, port 7842)',
        'evidence': 'local_server/local_server.py — http.server on port 7842; real routes GET /health, /reports, /watchlist, /stats, /push-to-supabase and POST /analyse; poll_loop() picks up queued intel_jobs rows and hands each to process_job().',
        'status': 'real, in-repo since Aug 27 2026; only running when Alex has started it',
        'color': CLUSTER_COLOR,
    },
    {
        'id': 'whisper',
        'icon': '🎙️',
        'label': 'Whisper (OpenAI, local)',
        'role': 'Speech-to-text, inside the pipeline — never called from the browser',
        'kind': 'Local Python package (openai-whisper)',
        'evidence': 'local_server/rpgace_intel.py transcribe_audio() — `import whisper`, WHISPER_MODEL = "small", pip-installs openai-whisper on first use. Called only from process_url(), never from any RPGACE client code.',
        'status': 'built; current live status genuinely unconfirmed (EXTERNAL_CONNECTORS says the same — do not claim active without asking Alex)',
        'color': '#9B59B6',
    },
    {
        'id': 'anthropic-direct',
        'icon': '🧠',
        'label': 'Anthropic API (direct, not via api/oracle.js)',
        'role': 'Vision + insight generation, called straight from the local script',
        'kind': 'Hosted API, reached from Alex\'s machine with his own key',
        'evidence': 'local_server/rpgace_intel.py call_claude() — POSTs directly to https://api.anthropic.com/v1/messages, model claude-sonnet-4-6, key read from ~/.anthropic_key by local_server.process_job(). This bypasses RPGACE\'s own api/oracle.js proxy entirely.',
        'status': 'real second Anthropic call path — structurally separate from River III\'s Oracle harness',
        'color': '#C9A84C',
    },
]

# --------------------------------------------------------------------
# The governing logic, attached inline (Alex's own "with the logic
# attached"). One real stage per step actually present in the source.
STAGES = [
    ('1', 'Browser asks for an analysis',
     'A real POST to <code>http://localhost:7842/analyse</code> with a URL. local_server.py does NOT analyse it inline — it writes an <code>intel_jobs</code> row with <code>status:"queued"</code> and returns immediately.',
     'local_server.py do_POST() → sb_post("intel_jobs", {...})'),
    ('2', 'The local poller picks the job up',
     'A real background <code>poll_loop()</code> inside local_server.py watches Supabase for queued rows, marks one <code>processing</code>, and calls <code>process_job()</code>. This is why the whole pipeline is invisible to the deployed app: nothing on Vercel drives it.',
     'local_server.py poll_loop() → process_job()'),
    ('3', 'rpgace_intel takes over, with Alex\'s own API key',
     '<code>process_job()</code> imports <code>rpgace_intel</code> as a module and sets <code>intel.ANTHROPIC_KEY</code> from <code>~/.anthropic_key</code>. Progress strings are PATCHed back onto the same <code>intel_jobs</code> row so the browser can show them.',
     'local_server.py process_job() → rpgace_intel.process_url()'),
    ('4', 'Media in: metadata, download, transcript, frames',
     'Real chain inside <code>process_url()</code>: <code>get_metadata()</code> (yt-dlp) → <code>download_video()</code> → <b>Whisper</b> <code>transcribe_audio()</code> → <code>extract_frames()</code> (FFmpeg).',
     'rpgace_intel.py get_metadata/download_video/transcribe_audio/extract_frames'),
    ('5', 'Judgement out: Claude Vision, then insights',
     '<code>analyse_frames()</code> base64-encodes real extracted frames and sends them to <b>Anthropic</b> via <code>call_claude()</code>; <code>generate_oracle_insights()</code> then turns metadata + transcript + visual analysis into the real structured report.',
     'rpgace_intel.py analyse_frames() / generate_oracle_insights() → call_claude()'),
    ('6', 'Results land in Supabase and on local disk',
     'Real writes: <code>intel_reports</code> and <code>encyclopedia</code> (via <code>sb_post</code>), <code>intel_watchlist</code> (via a real PATCH/POST), plus a real JSON file on Alex\'s own machine — which is why <code>/reports</code> still works when Supabase does not.',
     'rpgace_intel.py save_insight() / add_to_watchlist()'),
    ('7', 'The browser reads it back',
     '3 real client fetch sites, all in rpgace_core.js\'s <code>/* ===LEGACY:mainjs=== */</code> section: <code>fetchFromLocal()</code> → <code>/reports</code>, <code>fetchWatchlistFromLocal()</code> → <code>/watchlist</code>, <code>pushLocalToSupabase()</code> → <code>/push-to-supabase</code>. Reached from <code>syncIntelData()</code> (River XII\'s own 30s sync) and <code>syncAndPush()</code>.',
     'rpgace_core.js syncIntelData() / syncAndPush()'),
]

# Real client-side attachment points — the honest bridge between this
# local cluster and RPGACE's own tracked code.
CLIENT_SITES = [
    ('fetchFromLocal()', 'GET /reports', 'Reads the real local JSON report files — the fallback that still works when Supabase is unreachable.'),
    ('fetchWatchlistFromLocal()', 'GET /watchlist', 'Reads the local watchlist, only when the Supabase watchlist came back empty.'),
    ('pushLocalToSupabase()', 'GET /push-to-supabase', 'Asks the local server to push its own files up. Since Aug 27 2026 this endpoint skips a URL that already has an intel_reports row, and skips anything a real intel_reanalysis_pool deletion marker suppresses.'),
]

# Honest, stated gaps — never smoothed over.
GAPS = [
    ('librosa is NOT part of this cluster', 'Direct grep of both real files found zero librosa/BPM/beat_audio code. EXTERNAL_CONNECTORS\' own "via local_server.py" claim for librosa is therefore likely stale. Whether a genuinely separate script exists is honestly open — Alex\'s own answer was "i think so but forgot it" (ceo_plan_items G114, still blue).'),
    ('Whisper\'s current live status is unconfirmed', 'Historically confirmed working July 7 2026 (metadata → download → Whisper → frames → Claude Vision → Oracle report). Nothing in this session re-confirmed it end-to-end, and it runs on a machine no Claude Code session can reach.'),
    ('Nothing here runs on Vercel', 'Every member of this cluster lives on Alex\'s own machine. If the server is not started, all 3 real browser call sites fail their AbortSignal timeout and fall back silently — by design, not by accident.'),
    ('This is a second Anthropic path', 'rpgace_intel.call_claude() reaches api.anthropic.com directly with Alex\'s own local key, entirely outside api/oracle.js. It is not covered by RPGACE\'s own auth gate, prompt caching, Oracle Mode toggle, or fallback queue.'),
]


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _connector_note(name_prefix):
    """The real EXTERNAL_CONNECTORS row for a member, if one exists —
    reused verbatim rather than restated in this file's own words
    (rule 8). Returns '' when there genuinely is no such row, which is
    itself the honest answer for local_server.py: it has never been a
    registered connector, and that gap is exactly what G110 closes."""
    for c in EXTERNAL_CONNECTORS:
        if c['name'].lower().startswith(name_prefix.lower()):
            return c['note']
    return ''


def build_members_table():
    rows = []
    for m in MEMBERS:
        note = ''
        if m['id'] == 'whisper':
            note = _connector_note('Whisper')
        elif m['id'] == 'anthropic-direct':
            note = _connector_note('Anthropic')
        note_html = (f'<div class="lp-conn"><b>Registered connector note:</b> {esc(note)}</div>'
                     if note else
                     '<div class="lp-conn lp-conn-none"><b>No EXTERNAL_CONNECTORS row of its own</b> — '
                     'this is precisely the invisibility G110 exists to close: it was only ever a '
                     '"via" footnote inside other connectors\' entries.</div>')
        rows.append(
            f'<tr id="mem-{m["id"]}">'
            f'<td class="lp-name"><span class="lp-dot" style="background:{m["color"]}"></span>'
            f'{m["icon"]} <b>{esc(m["label"])}</b><div class="lp-kind">{esc(m["kind"])}</div></td>'
            f'<td>{esc(m["role"])}</td>'
            f'<td class="lp-ev">{esc(m["evidence"])}{note_html}</td>'
            f'<td class="lp-status">{esc(m["status"])}</td>'
            f'</tr>')
    return ''.join(rows)


def build_stages_html():
    return ''.join(
        f'<details class="lp-stage" id="stage-{n}"><summary><span class="lp-num">{n}</span>{esc(title)}</summary>'
        f'<div class="lp-stage-body"><p>{body}</p>'
        f'<div class="lp-src">📄 {esc(src)}</div></div></details>'
        for n, title, body, src in STAGES)


def build_client_table():
    return ''.join(
        f'<tr><td><code>{esc(fn)}</code></td><td><code>{esc(ep)}</code></td><td>{esc(desc)}</td></tr>'
        for fn, ep, desc in CLIENT_SITES)


def build_gaps_html():
    return ''.join(
        f'<div class="lp-gap"><b>{esc(t)}</b><p>{esc(b)}</p></div>' for t, b in GAPS)


def build_bubble_view():
    """Pure rendering layer over MEMBERS/STAGES (R22) — the table above
    is the real data, this draws exactly the same three members as one
    cluster hanging off a single hub, plus the real river attachment."""
    hub = dict(icon='🖥️', label='Local Analysis Pipeline', color=CLUSTER_COLOR)
    leaves = [
        dict(id=m['id'], icon=m['icon'], label=m['label'], sub=m['kind'],
             color=m['color'], href=f'#mem-{m["id"]}')
        for m in MEMBERS
    ]
    cluster = render_bubble_row(hub, leaves, _curved_edge, _build_markers,
                                leaf_r=26, width=900)
    river_hub = dict(icon='🌊', label=RIVER_NAME[HOST_RIVER].split('—')[0].strip(),
                     color=RIVER_COLOR[HOST_RIVER])
    river_leaves = [
        dict(id=mod, icon='⚙️', label=mod, sub='River XII module',
             color=RIVER_COLOR[HOST_RIVER],
             href=f'galaxy_map_current.html#mod-{mod}')
        for mod in sorted(RIVER_MODULES.get(HOST_RIVER, []))
    ]
    river = render_bubble_row(river_hub, river_leaves, _curved_edge, _build_markers,
                              leaf_r=22, width=900, emit_defs=False)
    return (
        '<div class="fc-scope mode-full">'
        + render_fc_bar()
        + '<div class="lp-bubble-block"><h3>🔗 The cluster — one Inter, three members</h3>'
        '<p class="lp-bnote">Click a member to jump to its own row in the table above. '
        'These three are drawn as ONE cluster rather than three peer connector bubbles because they '
        'genuinely only ever run together: Whisper and the direct Anthropic call are both reached '
        '<i>through</i> local_server.py, never independently.</p>'
        f'{cluster}</div>'
        '<div class="lp-bubble-block"><h3>🌊 Where it attaches — River XII, the Research &amp; Intel Stream</h3>'
        '<p class="lp-bnote">The real host river. Every browser-side call site listed above is reached from '
        '<code>syncIntelData()</code>, this river\'s own Content-Intelligence sync — no other river touches '
        'this pipeline at all.</p>'
        f'{river}</div>'
        '</div>')


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Local Analysis Pipeline)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --lp:#E8967A; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 25%, #1a1410 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 14px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--lp);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto;line-height:1.65}}
  .wrap{{max-width:1000px;margin:0 auto;padding:20px 24px 50px}}
  .lp-toggle-row{{display:flex;gap:6px;justify-content:center;margin:14px 0 18px}}
  .lp-tbtn{{padding:6px 14px;border-radius:16px;font-size:11px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .lp-tbtn.active{{background:var(--lp);color:#1a0f08;font-weight:700;border-color:var(--lp)}}
  .lp-view{{display:none}}
  .lp-view.active{{display:block}}
  h2{{font-family:Georgia,serif;font-size:17px;color:#fff;margin:26px 0 6px}}
  h2:first-child{{margin-top:0}}
  .sub{{font-size:11px;color:var(--dim);line-height:1.65;margin-bottom:12px}}
  table{{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}}
  th{{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--lp);padding:7px 9px;border-bottom:1px solid rgba(232,150,122,0.3)}}
  td{{padding:9px;border-bottom:1px solid rgba(255,255,255,0.07);vertical-align:top;line-height:1.6;color:#b8b8c8}}
  .lp-name{{white-space:nowrap;color:#E2E2EC}}
  .lp-dot{{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}}
  .lp-kind{{font-size:9.5px;color:var(--dim);font-weight:400;margin-top:3px;white-space:normal;max-width:180px}}
  .lp-ev{{font-size:10.5px}}
  .lp-status{{font-size:10px;color:var(--dim);max-width:180px}}
  .lp-conn{{margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.07);font-size:10px;color:var(--dim)}}
  .lp-conn b{{color:#c8c8d8}}
  .lp-conn-none{{color:var(--lp)}}
  .lp-conn-none b{{color:var(--lp)}}
  .lp-stage{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-left:3px solid var(--lp);border-radius:8px;padding:8px 12px;margin-bottom:7px}}
  .lp-stage summary{{cursor:pointer;font-size:12px;font-weight:700;color:#E2E2EC;list-style:none}}
  .lp-stage summary::-webkit-details-marker{{display:none}}
  .lp-num{{display:inline-block;min-width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:var(--lp);color:#1a0f08;font-size:10px;font-weight:700;margin-right:8px}}
  .lp-stage-body{{margin-top:8px}}
  .lp-stage p{{font-size:11px;color:#b8b8c8;line-height:1.7}}
  .lp-src{{margin-top:7px;font-size:9.5px;color:var(--gold);font-family:ui-monospace,Menlo,Consolas,monospace}}
  code{{background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px;font-size:10.5px}}
  .lp-gap{{background:rgba(204,74,74,0.07);border-left:3px solid #cc4a4a;border-radius:6px;padding:9px 12px;margin-bottom:8px}}
  .lp-gap b{{font-size:11.5px;color:#fff}}
  .lp-gap p{{font-size:10.5px;color:#b8b8c8;line-height:1.65;margin-top:4px}}
  .lp-bubble-block{{margin-bottom:26px}}
  .lp-bubble-block h3{{font-family:Georgia,serif;font-size:15px;color:#fff;margin-bottom:5px}}
  .lp-bnote{{font-size:10.5px;color:var(--dim);line-height:1.65;margin-bottom:10px}}
  .note{{max-width:1000px;margin:10px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--lp)}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Dimension · Inter</div>
  <h1>🖥️ Local Analysis Pipeline — One Cluster, Three Members</h1>
  <p>The real Content-Intelligence pipeline that runs on Alex's own machine: <b>local_server.py</b> hosting it,
  <b>Whisper</b> transcribing inside it, and a <b>direct Anthropic API call</b> doing the vision and insight work —
  reached only through the host, never independently. Built as one Dimension (Alex's own ratified direction) rather
  than three peer connector bubbles, with the governing logic attached inline.</p>
</div>
<div class="lp-toggle-row">
  <div class="lp-tbtn active" data-view="table">📊 Table view</div>
  <div class="lp-tbtn" data-view="map">🫧 Bubble view</div>
</div>
<div class="wrap">
<div class="lp-view active" data-lpview="table">
  <h2>The three members</h2>
  <p class="sub">Every citation below was read directly out of the real source in this repo during this build — never carried over from a prior session's summary.</p>
  <table><thead><tr><th>Member</th><th>Role in the cluster</th><th>Real evidence</th><th>Status</th></tr></thead>
  <tbody>{members}</tbody></table>

  <h2>The governing logic — what actually joins them</h2>
  <p class="sub">One stage per real step present in the source. This is the "logic attached" half of G110's own ratified scope: the cluster is not just three names, it is one ordered pipeline.</p>
  {stages}

  <h2>Where RPGACE's own code touches it</h2>
  <p class="sub">3 real <code>fetch()</code> call sites, all inside <code>rpgace_core.js</code>'s <code>/* ===LEGACY:mainjs=== */</code> section, all reached from River XII's own sync.</p>
  <table><thead><tr><th>Client function</th><th>Endpoint</th><th>What it really does</th></tr></thead>
  <tbody>{client}</tbody></table>

  <h2>Honest gaps</h2>
  <p class="sub">Stated plainly rather than smoothed over — each one is a real limit on what this page can claim.</p>
  {gaps}
</div>
<div class="lp-view" data-lpview="map">{bubbles}</div>
</div>
{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_local_pipeline.py</code> — G110 of the ratified
  "RPGACE Total Systems Galaxy Map" /CEO plan. Members and stages are read from the real
  <code>local_server/local_server.py</code>, <code>local_server/rpgace_intel.py</code> and
  <code>rpgace_core.js</code> source; the registered-connector notes are reused verbatim from
  <code>EXTERNAL_CONNECTORS</code> (rule 8, never restated). Table view is the real data,
  bubble view is a pure rendering layer over the same structures (CEO SKILL.md R22).
</div>
<script>
(function() {{
  var btns = document.querySelectorAll('.lp-tbtn');
  var views = document.querySelectorAll('.lp-view');
  btns.forEach(function(b) {{
    b.addEventListener('click', function() {{
      var v = b.dataset.view;
      btns.forEach(function(x) {{ x.classList.toggle('active', x === b); }});
      views.forEach(function(x) {{ x.classList.toggle('active', x.dataset.lpview === v); }});
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    html = TEMPLATE.format(
        members=build_members_table(),
        stages=build_stages_html(),
        client=build_client_table(),
        gaps=build_gaps_html(),
        bubbles=build_bubble_view(),
        dim_index=dimension_index_html(OUT.name),
        dim_css=DIMENSION_INDEX_CSS,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(MEMBERS)} real cluster members, {len(STAGES)} real pipeline stages, "
          f"{len(CLIENT_SITES)} real client call sites, {len(GAPS)} honest gaps, host River {HOST_RIVER}.")


if __name__ == '__main__':
    main()
