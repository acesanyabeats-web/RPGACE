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
ANALYSER_VERSION = "2026-10-20.3"

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
