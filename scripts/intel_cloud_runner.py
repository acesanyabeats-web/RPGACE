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

Env: ANTHROPIC_API_KEY (GitHub secret INTEL_ANTHROPIC_KEY); optional YT_COOKIES
(secret YT_COOKIES, a cookies.txt export) to let the cloud try YouTube;
INTEL_BUDGET_MIN time budget per run (default 35).
"""
import contextlib
import io
import json
import os
import sys
import tempfile
import time
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


sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "local_server"))
import intel_common  # VW-0: version, stuck-job reset, claim body (no HOME side effects)


def claim(job_id):
    """Take the job only if it is still queued (the laptop may have it)."""
    rows = sb("PATCH", f"intel_jobs?id=eq.{job_id}&status=eq.queued",
              intel_common.claim_body("cloud", "Cloud runner: starting"), prefer="return=representation")
    return bool(rows)


def reset_stuck():
    """VW-0: a job left 'processing' for over 2 h (a runner died) goes back in the queue."""
    try:
        rows = sb("PATCH", intel_common.stuck_query(), intel_common.STUCK_RESET, prefer="return=representation")
        if rows:
            print(f"Put {len(rows)} stuck job(s) back in the queue.")
    except Exception as e:
        print(f"::warning::Could not reset stuck jobs: {e}")


def finish(job_id, ok, reason=""):
    body = {"status": "complete" if ok else "error", "progress": "Done (cloud)"}
    if not ok:
        body["error"] = (reason or "Failed with no message")[:300]
    sb("PATCH", f"intel_jobs?id=eq.{job_id}", body, prefer="return=minimal")


YT_PATTERN = "*youtu*"
YT_WAIT_NOTE = "Waiting for the laptop: YouTube blocks cloud servers"


def main():
    # CC-1: the app's 🤖/💳 switch. 'cc' = this runner only does the free part
    # (download, transcript, frames) and Orchestrator CC writes the analysis.
    mode = intel_common.read_mode()
    print(f"Background analysis: {mode}")
    if mode == "api" and not os.environ.get("ANTHROPIC_API_KEY"):
        # Exit clean (a red run every 10 min would email Alex each time).
        print("::warning::No INTEL_ANTHROPIC_KEY secret set - leaving the queue for the laptop.")
        return 0
    reset_stuck()
    try:  # CC-1/CC-4: too long waiting for Orchestrator CC -> back in the queue for the API
        n = intel_common.fallback_requeue()
        if n:
            print(f"{n} job(s) waited too long for Orchestrator CC - the API takes them.")
    except Exception as e:
        print(f"::warning::Could not check the CC fallback: {e}")
    print(f"Analyser version {intel_common.ANALYSER_VERSION}")
    # YouTube answers data-centre addresses with "Sign in to confirm you're not
    # a bot" (Oct 11 run #2). Without cookies the cloud leaves YouTube links
    # queued for the laptop instead of failing them; with a YT_COOKIES secret
    # (a cookies.txt export) it tries them.
    yt_cookies = os.environ.get("YT_COOKIES", "").strip()
    yt_filter = "" if yt_cookies else "&url=not.ilike." + YT_PATTERN
    # Work through the whole queue (not a fixed 3) until it's empty or the
    # time budget runs out; the workflow's own timeout is 45 min.
    budget_s = int(os.environ.get("INTEL_BUDGET_MIN", "35")) * 60
    started = time.time()

    def next_job(skip):
        q = "intel_jobs?status=eq.queued&order=created_at.asc&select=id,url,realms,use_api&limit=5" + yt_filter
        for j in sb("GET", q):
            if j["id"] not in skip:
                return j
        return None

    if not yt_cookies:
        try:
            sb("PATCH", "intel_jobs?status=eq.queued&progress=is.null&url=ilike." + YT_PATTERN,
               {"progress": YT_WAIT_NOTE}, prefer="return=minimal")
        except Exception:
            pass

    first = next_job(set())
    if not first:
        print("Nothing the cloud can take right now.")
        return 0

    # The pipeline keeps its working files under ~/RPGACE; give it a scratch
    # home so nothing lands in the checkout. Set before import (HOME is read
    # at import time).
    scratch = tempfile.mkdtemp(prefix="rpgace_home_")
    os.environ["HOME"] = scratch
    if yt_cookies:
        cfg = Path(scratch) / ".config" / "yt-dlp"
        cfg.mkdir(parents=True, exist_ok=True)
        (Path(scratch) / "yt_cookies.txt").write_text(yt_cookies + "\n")
        (cfg / "config").write_text("--cookies " + str(Path(scratch) / "yt_cookies.txt") + "\n")
        os.environ["XDG_CONFIG_HOME"] = str(Path(scratch) / ".config")
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "local_server"))
    import rpgace_intel as intel
    intel.ensure_dirs()

    tried = set()
    done = 0
    job = first
    while job and time.time() - started < budget_s:
        jid = job["id"]
        tried.add(jid)
        if not claim(jid):
            print(f"{jid[:8]}: already taken")
            job = next_job(tried)
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
        cc = False
        try:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                # RI-4: read it through the realms Alex picked (None = Producer).
                cc = mode == "cc" and not job.get("use_api")
                if cc:
                    result = intel.prepare_for_cc(job["url"], job.get("realms"), jid)
                else:
                    result = intel.process_url(job["url"], job.get("realms"))
        except Exception as e:  # process_url catches its own errors; belt and braces
            result, last["msg"] = None, f"Runner error: {e}"
        ok = bool(result)
        if ok and cc:
            sb("PATCH", f"intel_jobs?id=eq.{jid}", intel_common.awaiting_body(), prefer="return=minimal")
        else:
            finish(jid, ok, last["msg"])
            if ok and job.get("use_api"):
                try:
                    intel_common.clear_job_files(jid)
                except Exception:
                    pass
        done += 1
        print(f"{jid[:8]}: {(intel_common.AWAITING_CC if cc else 'complete') if ok else 'error - ' + last['msg'][:160]}")
        if not ok:
            print(f"::warning::{jid[:8]} failed - reason saved on its intel_jobs row")
        job = next_job(tried)
    if job:
        print("Time budget used; the rest waits for the next run.")
    print(f"{done} video(s) handled.")
    # A failed video is recorded on its own row; the run itself still exits 0
    # so GitHub saves the pip/Whisper cache (a failed run skips saving it).
    return 0


if __name__ == "__main__":
    sys.exit(main())
