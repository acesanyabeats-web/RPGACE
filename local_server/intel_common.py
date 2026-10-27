"""Shared by the laptop server (local_server.py), the cloud runner
(scripts/intel_cloud_runner.py) and the analyser (rpgace_intel.py).

VW-0 (Oct 20 2026): the laptop used to run its own older copy of the
analyser that ignored realms. Now the laptop starter downloads these files
from the repo before every start, every report says which analyser made it,
and jobs stuck in "processing" are put back in the queue.
"""
from datetime import datetime, timedelta, timezone

# Bump this whenever rpgace_intel.py's analysis changes. The app labels any
# report made by an older version.
ANALYSER_VERSION = "2026-10-27.6"  # SA-1: web pages + shared text

STUCK_HOURS = 2
STUCK_RESET = {"status": "queued", "progress": "Reset: stuck in processing for over 2 h", "started_at": None}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def stuck_query(now=None):
    """intel_jobs filter for jobs 'processing' for over STUCK_HOURS (by
    started_at, or created_at for jobs taken before started_at existed)."""
    cut = ((now or datetime.now(timezone.utc)) - timedelta(hours=STUCK_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"intel_jobs?status=eq.processing&or=(started_at.lt.{cut},and(started_at.is.null,created_at.lt.{cut}))"


def claim_body(who, progress="Starting..."):
    """PATCH body when a runner takes a queued job (send with status=eq.queued
    in the filter so only one runner gets it)."""
    return {"status": "processing", "progress": progress, "started_at": now_iso(), "taken_by": who}


# ── CC-1 (Oct 21 2026, plan "Orchestrator CC Analysis") ───────────────────────
# Alex: "i want analysis to fallback on orchestrator CC most of the time".
# app_settings.background_analysis (the app's 🤖/💳 switch) says who does the
# thinking. 'cc': the runner does the free part (download, Whisper transcript,
# frames), uploads it to the intel-cc bucket and leaves the job 'awaiting_cc';
# Orchestrator CC (scripts/intel_cc_worker.py) writes the analysis on the Claude
# plan. 'api': unchanged, Sonnet via the API key.
import json as _json
import urllib.request as _ureq

SB_URL = "https://gripopghczmrbrhqtqbm.supabase.co"
# Supabase publishable key - the same one already public in rpgace_core.js.
SB_KEY = "sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf"
CC_BUCKET = "intel-cc"
AWAITING_CC = "awaiting_cc"
CC_WAIT_NOTE = "Waiting for Orchestrator CC (Claude plan)"


def _ctx():
    try:
        import ssl, certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return None


def http(method, path, body=None, headers=None, raw=False, timeout=30):
    """One request to Supabase (REST or storage). body: dict/list -> JSON,
    bytes -> sent as is. Returns parsed JSON, or bytes when raw=True."""
    h = {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY}
    data = None
    if isinstance(body, (bytes, bytearray)):
        data = bytes(body)
    elif body is not None:
        data = _json.dumps(body, ensure_ascii=False, default=str).encode("utf-8")
        h["Content-Type"] = "application/json"
    h.update(headers or {})
    req = _ureq.Request(SB_URL + path, data=data, headers=h, method=method)
    with _ureq.urlopen(req, timeout=timeout, context=_ctx()) as r:
        out = r.read()
    if raw:
        return out
    txt = out.decode("utf-8") if out else ""
    return _json.loads(txt) if txt.strip() else []


def read_settings():
    """app_settings.background_analysis value ({} on any failure)."""
    try:
        rows = http("GET", "/rest/v1/app_settings?key=eq.background_analysis&select=value")
        return (rows[0].get("value") or {}) if rows else {}
    except Exception:
        return {}


def read_mode():
    """'cc' or 'api'. Any read failure -> 'api', so videos still get analysed."""
    return "cc" if read_settings().get("mode") == "cc" else "api"


FALLBACK_NOTE = "Waited too long for Orchestrator CC - the API is taking it"


def fallback_query(hours, now=None):
    cut = ((now or datetime.now(timezone.utc)) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"intel_jobs?status=eq.{AWAITING_CC}&awaiting_since=lt.{cut}"


def fallback_requeue():
    """Alex: "API after 12 hours". A job waiting for Orchestrator CC longer than
    fallback_hours goes back in the queue marked use_api, so the next runner
    analyses it with the API whatever the switch says. Returns how many."""
    hours = float(read_settings().get("fallback_hours") or 12)
    rows = http("PATCH", "/rest/v1/" + fallback_query(hours),
                {"status": "queued", "use_api": True, "progress": FALLBACK_NOTE, "started_at": None},
                headers={"Prefer": "return=representation"})
    return len(rows or [])


def clear_job_files(jid):
    """Delete a job's files from the intel-cc bucket (after it is analysed)."""
    names = [f"{jid}/{n}" for n in ("meta.json", "transcript.txt", "plain.txt")]
    try:
        names += [f"{jid}/frames/{n}" for n in list_files(f"{jid}/frames")]
    except Exception:
        pass
    delete_files(names)


def awaiting_body():
    """PATCH body once a job's files are uploaded for Orchestrator CC."""
    return {"status": AWAITING_CC, "progress": CC_WAIT_NOTE, "awaiting_since": now_iso(), "error": None}


def put_file(path, data, ctype):
    """Upload (or replace) one file in the intel-cc bucket."""
    return http("POST", f"/storage/v1/object/{CC_BUCKET}/{path}", data,
                {"Content-Type": ctype, "x-upsert": "true"})


def get_file(path):
    return http("GET", f"/storage/v1/object/{CC_BUCKET}/{path}", raw=True)


def list_files(prefix):
    rows = http("POST", f"/storage/v1/object/list/{CC_BUCKET}",
                {"prefix": prefix, "limit": 100, "sortBy": {"column": "name", "order": "asc"}})
    return [r["name"] for r in rows if r.get("name") and r.get("id")]


def delete_files(paths):
    if paths:
        http("DELETE", f"/storage/v1/object/{CC_BUCKET}", {"prefixes": list(paths)})
