#!/usr/bin/env python3
"""
Orchestrator CC's side of video analysis (CC-1, Oct 21 2026, plan
"Orchestrator CC Analysis").

Alex: "i want analysis to fallback on orchestrator CC most of the time ... so
orchestrator can analyze, then push it into RPGACE where needed."

When the app's 🤖/💳 switch (app_settings.background_analysis) is on 🤖, the
GitHub runner / laptop only does the free part (download, Whisper transcript,
frames - rpgace_intel.prepare_for_cc) and leaves the job 'awaiting_cc' with
its files in the intel-cc bucket. A Claude Code session (the scheduled task in
CC-4, or by hand) then runs:

  python3 scripts/intel_cc_worker.py list              waiting videos
  python3 scripts/intel_cc_worker.py fetch <job_id>    claim it, download files + TASK.md
      ... the session reads TASK.md, looks at the frames, reads the transcript
      and writes answer.json (the same JSON the API path asks for) ...
  python3 scripts/intel_cc_worker.py finish <job_id>   quote-check + save the report
  python3 scripts/intel_cc_worker.py release <job_id>  put it back if it couldn't finish

finish runs rpgace_intel.parse_insights (every quote checked word for word
against the whole transcript, VW-3) and rpgace_intel.push_report - the exact
code the API path uses (rule 8), so a CC report looks the same in the app.
Writes use the public key, like the Fallback Drain task (intel tables and the
intel-cc bucket are anon-writable).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "local_server"))
import intel_common as ic  # noqa: E402

WORK = Path("/tmp/intel_cc")
WHO = "orchestrator_cc"


def job_dir(jid):
    return WORK / jid


def get_job(jid):
    rows = ic.http("GET", f"/rest/v1/intel_jobs?id=eq.{jid}&select=id,url,status,realms,taken_by,awaiting_since")
    return rows[0] if rows else None


def cmd_list():
    rows = ic.http("GET", f"/rest/v1/intel_jobs?status=eq.{ic.AWAITING_CC}"
                          "&order=awaiting_since.asc.nullsfirst&select=id,url,realms,awaiting_since")
    if not rows:
        print("No videos waiting for Orchestrator CC.")
        return 0
    print(f"{len(rows)} video(s) waiting:")
    for r in rows:
        print(f"  {r['id']}  since {r.get('awaiting_since') or '?'}  realms {','.join(r.get('realms') or []) or '-'}  {r['url']}")
    return 0


def task_text(jid, meta, frames):
    import rpgace_intel as intel
    realms = intel.clean_realms(meta.get("realms"))
    times = []
    for f in frames:
        m = re.search(r"_(\d+)s\.jpg$", f)
        times.append(int(m.group(1)) if m else 0)
    look = intel.frames_prompt(meta, times, realms, intel.load_lenses())
    visual = ("(No separate frame description - look at every image in frames/ yourself before writing. "
              "Each file name carries its second, e.g. frame_02_0045s.jpg = 0:45.)\n"
              "What to look for in the frames:\n" + look) if frames else "No frames extracted."
    prompt = intel.insights_prompt(meta, "(The whole timed transcript is in transcript.txt next to this file - read ALL of it.)",
                                   visual, realms)
    return f"""# Videoworm analysis for Alex - job {jid}

You are doing this instead of the API (Alex's 🤖 switch). Steps:
1. Look at every image in `frames/` ({len(frames)} frames).
2. Read the whole of `transcript.txt` (each line starts with its [m:ss]).
3. Write ONLY the JSON asked for below to `answer.json` in this folder - no fences, no notes.
   Quotes are checked word for word against transcript.txt, so copy them exactly.
4. Run: `python3 scripts/intel_cc_worker.py finish {jid}`
   If it says the JSON didn't parse, fix answer.json and run finish again.
   If you can't do it, run `python3 scripts/intel_cc_worker.py release {jid}`.

---

{prompt}
"""


def cmd_fetch(jid):
    job = get_job(jid)
    if not job:
        print(f"No job {jid}")
        return 1
    if job["status"] == ic.AWAITING_CC:
        body = ic.claim_body(WHO, "Orchestrator CC: writing the analysis")
        rows = ic.http("PATCH", f"/rest/v1/intel_jobs?id=eq.{jid}&status=eq.{ic.AWAITING_CC}", body,
                       headers={"Prefer": "return=representation"})
        if not rows:
            print("Someone else took it just now.")
            return 1
    elif not (job["status"] == "processing" and job.get("taken_by") == WHO):
        print(f"Job is '{job['status']}', not waiting for CC.")
        return 1
    d = job_dir(jid)
    (d / "frames").mkdir(parents=True, exist_ok=True)
    meta = json.loads(ic.get_file(f"{jid}/meta.json").decode("utf-8"))
    (d / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    (d / "transcript.txt").write_bytes(ic.get_file(f"{jid}/transcript.txt"))
    try:
        (d / "plain.txt").write_bytes(ic.get_file(f"{jid}/plain.txt"))
    except Exception:
        pass
    frames = ic.list_files(f"{jid}/frames")
    for name in frames:
        (d / "frames" / name).write_bytes(ic.get_file(f"{jid}/frames/{name}"))
    (d / "TASK.md").write_text(task_text(jid, meta, frames), encoding="utf-8")
    print(f"Ready: {d}/TASK.md  ({len(frames)} frames, title: {meta.get('title', '?')})")
    return 0


def finish_job(jid, d):
    """Parse + quote-check answer.json and save the report. Returns (ok, message)."""
    import rpgace_intel as intel
    meta = json.loads((d / "meta.json").read_text(encoding="utf-8"))
    timed = (d / "transcript.txt").read_text(encoding="utf-8")
    plain_f = d / "plain.txt"
    plain = plain_f.read_text(encoding="utf-8") if plain_f.exists() else timed
    raw = (d / "answer.json").read_text(encoding="utf-8")
    realms = intel.clean_realms(meta.get("realms"))
    try:
        insights = intel.parse_insights(raw, realms, timed)
    except Exception as e:
        return False, f"answer.json didn't parse: {e}"
    if not intel.push_report(meta, insights, plain):
        return False, "Saving the report failed (see the log above)"
    dropped = sum(s.get("dropped", 0) for s in insights["realm_sections"].values())
    return True, (f"Saved: {insights['verdict_score']}/10, "
                  f"{sum(len(s['points']) for s in insights['realm_sections'].values())} points kept, "
                  f"{dropped} thrown out (quote not in the video)")


def cmd_finish(jid):
    d = job_dir(jid)
    if not (d / "answer.json").exists():
        print(f"No {d}/answer.json yet.")
        return 1
    ok, msg = finish_job(jid, d)
    print(msg)
    if not ok:
        return 1
    ic.http("PATCH", f"/rest/v1/intel_jobs?id=eq.{jid}",
            {"status": "complete", "progress": "Done (Orchestrator CC)", "error": None},
            headers={"Prefer": "return=minimal"})
    try:
        ic.clear_job_files(jid)
    except Exception as e:
        print(f"(Couldn't clear the job's files: {e})")
    return 0


def cmd_release(jid):
    ic.http("PATCH", f"/rest/v1/intel_jobs?id=eq.{jid}&taken_by=eq.{WHO}",
            {"status": ic.AWAITING_CC, "progress": ic.CC_WAIT_NOTE, "started_at": None},
            headers={"Prefer": "return=minimal"})
    print("Put back in the CC queue.")
    return 0


def main(argv):
    if len(argv) < 2 or argv[1] not in ("list", "fetch", "finish", "release"):
        print(__doc__)
        return 2
    if argv[1] == "list":
        return cmd_list()
    if len(argv) < 3:
        print(f"Usage: {argv[0]} {argv[1]} <job_id>")
        return 2
    return {"fetch": cmd_fetch, "finish": cmd_finish, "release": cmd_release}[argv[1]](argv[2])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
