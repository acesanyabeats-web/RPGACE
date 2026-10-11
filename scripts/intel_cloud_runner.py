#!/usr/bin/env python3
"""
Cloud runner for the Content Intelligence queue (GitHub Actions).

Oct 11 2026, Alex: "Can we make the server constantly online without needing
my laptop?" -> GitHub Actions first (free; may get bot-blocked by YouTube/
Instagram because it runs from a data-centre address - if so, the same
pipeline moves to a home device). The laptop's local_server.py keeps working
as a backup: both take jobs from the same intel_jobs queue, and a job is only
taken if it is still 'queued' at the moment of claiming, so nothing is
analysed twice.

Runs local_server/rpgace_intel.py's own process_url() unchanged (one
pipeline, rule 8). This repo is public, so its Actions logs are public: the
pipeline's own output (titles, transcripts, the full report) is kept off the
log; only a short job id + outcome + failure reason is printed.

Env: ANTHROPIC_API_KEY (GitHub secret INTEL_ANTHROPIC_KEY). Max jobs per run:
INTEL_MAX_JOBS (default 3).
"""
import contextlib
import io
import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

SB_URL = "https://gripopghczmrbrhqtqbm.supabase.co"
# Supabase publishable key - the same one already public in rpgace_core.js.
SB_KEY = "sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf"
HDRS = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"}


def sb(method, path, body=None, prefer=None):
    h = dict(HDRS)
    if prefer:
        h["Prefer"] = prefer
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{path}", method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=20) as r:
        txt = r.read().decode() or "[]"
        return json.loads(txt) if txt.strip() else []


def claim(job_id):
    """Take the job only if it is still queued (the laptop may have it)."""
    rows = sb("PATCH", f"intel_jobs?id=eq.{job_id}&status=eq.queued",
              {"status": "processing", "progress": "Cloud runner: starting"}, prefer="return=representation")
    return bool(rows)


def finish(job_id, ok, reason=""):
    body = {"status": "complete" if ok else "error", "progress": "Done (cloud)"}
    if not ok:
        body["error"] = (reason or "Failed with no message")[:300]
    sb("PATCH", f"intel_jobs?id=eq.{job_id}", body, prefer="return=minimal")


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        # Exit clean (a red run every 10 min would email Alex each time).
        print("::warning::No INTEL_ANTHROPIC_KEY secret set - leaving the queue for the laptop.")
        return 0
    max_jobs = int(os.environ.get("INTEL_MAX_JOBS", "3"))
    jobs = sb("GET", "intel_jobs?status=eq.queued&order=created_at.asc&select=id,url&limit=%d" % max_jobs)
    if not jobs:
        print("Queue empty.")
        return 0

    # The pipeline keeps its working files under ~/RPGACE; give it a scratch
    # home so nothing lands in the checkout. Set before import (HOME is read
    # at import time).
    os.environ["HOME"] = tempfile.mkdtemp(prefix="rpgace_home_")
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "local_server"))
    import rpgace_intel as intel
    intel.ensure_dirs()

    failures = 0
    for job in jobs:
        jid = job["id"]
        if not claim(jid):
            print(f"{jid[:8]}: already taken")
            continue
        last = {"msg": ""}

        def quiet_log(msg, *a, **k):
            last["msg"] = str(msg).strip()
            try:
                sb("PATCH", f"intel_jobs?id=eq.{jid}", {"progress": ("Cloud: " + last["msg"])[:100]}, prefer="return=minimal")
            except Exception:
                pass
        intel.log = quiet_log

        sink = io.StringIO()
        try:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                result = intel.process_url(job["url"])
        except Exception as e:  # process_url catches its own errors; belt and braces
            result, last["msg"] = None, f"Runner error: {e}"
        ok = bool(result)
        if not ok:
            failures += 1
        finish(jid, ok, last["msg"])
        print(f"{jid[:8]}: {'complete' if ok else 'error - ' + last['msg'][:160]}")
        if not ok:
            print(f"::warning::{jid[:8]} failed - reason saved on its intel_jobs row")
    # A failed video is recorded on its own row; the run itself still exits 0
    # so GitHub saves the pip/Whisper cache (a failed run skips saving it).
    return 0


if __name__ == "__main__":
    sys.exit(main())
