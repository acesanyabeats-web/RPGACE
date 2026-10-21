#!/usr/bin/env python3
"""
The one Morning Brief, written by Orchestrator CC before 6am UK time
(CC-3, Oct 21 2026, plan "Orchestrator CC Analysis").

Alex: "make it at one time at 6am, deduplicate and /paranoia this to get
best results". So there is ONE AI-written brief a day, made by the scheduled
task "RPGACE Morning Brief"; the app shows it (morningBrief) instead of
paying the API for a second one.

  python3 scripts/morning_brief_cc.py gather       today's inputs as JSON (or "ALREADY WRITTEN")
  python3 scripts/morning_brief_cc.py save <file>  save the written brief to journal, checked
  python3 scripts/morning_brief_cc.py rules        how the brief is written (one copy, used by both writers)
  python3 scripts/morning_brief_cc.py fallback     API backup: writes it if CC hasn't, brief_fallback_mins after 05:39 UK

Backup (Oct 21 2026, Alex: "if ever failed, then 5 min timer on api to pick
up the job"): the first CC run failed on his plan's usage limit and no brief
was saved. .github/workflows/morning-brief-fallback.yml runs `fallback` every
5 minutes in the morning; once it is BRIEF_TIME + brief_fallback_mins
(app_settings.background_analysis, default 5) and there is still no brief,
it writes one with the API from the same data and rules and saves it the
same checked way (title ends "(API)").

What the brief covers, and what it deliberately leaves out (the app already
shows those live, from code, next to the brief - repeating them was the
duplication): realm pick (realmBrief), saved ideas due (recall), library pick
(lifeLibrary), XP line (xpSeason), own words (dailyLife), the My Day task
list (myDay's Good-morning screen) and the inbox/YouTube lines (need the
app's sign-in; fetched live when the brief opens). Only tables readable with
the public key are used - no secret is stored in the task.

Why a script, not hand-written curl: the old 06:00 task "succeeded" every day
but never wrote a single journal row (checked Oct 21: zero morning-routine
rows). save() checks the row really exists.
"""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "local_server"))
import intel_common as ic  # noqa: E402

SOURCE = "morning-routine"
BRIEF_TIME = (5, 39)          # UK time the scheduled CC task runs
FALLBACK_UNTIL = 13           # after 1pm UK the backup stops trying (the app's own window)
API_TAG = " (API)"

RULES = """Write the brief as plain text, under 220 words, direct, no greeting, RPG-toned like Oracle, UK English. Sections, in this order, each only if it has real data:
  ⚔️ TOP 3 TODAY - the three most important things, from the agenda/planned blocks/waiting items
  📅 SHIFTS & WINDOW - today's shift (or "no shift - full creative day"), the free window around it, tomorrow's shift if any
  📥 WAITING ON YOU - real counts/titles (taxonomy reviews, jargon terms, chapters in progress)
  🎛️ BEAT FOCUS - one specific thing to try in a session today, grounded in one real recent_producer_insights entry (name its source); leave the section out if there are none - never use cooking or other non-music tips
  🎬 CONTENT IDEA - one idea worth filming, from the Idea Bank or a recent video analysis
  ▶ one sharp action line, max 15 words
DO NOT include (the app already shows these live next to the brief - repeating them is duplication): today's realm pick, saved ideas due for recall, the library pick, XP/level lines, Alex's own words/decisions, the My Day task list, the inbox, YouTube stats. Never invent data; if something is empty, leave the section out. Entries with "_error" mean that source couldn't be read - say so briefly, never guess."""
try:
    from zoneinfo import ZoneInfo
    UK = ZoneInfo("Europe/London")
except Exception:  # pragma: no cover
    UK = timezone.utc


def uk_today(now=None):
    return (now or datetime.now(timezone.utc)).astimezone(UK).date()


def uk_midnight_utc(day):
    return datetime(day.year, day.month, day.day, tzinfo=UK).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(path):
    try:
        rows = ic.http("GET", "/rest/v1/" + path)
        return rows if isinstance(rows, list) else []
    except Exception as e:
        return [{"_error": str(e)[:120]}]


def existing_brief(day):
    rows = get(f"journal?source=eq.{SOURCE}&created_at=gte.{uk_midnight_utc(day)}&select=id,created_at&order=created_at.desc&limit=1")
    return rows[0] if rows and "id" in rows[0] else None


def gather(now=None):
    day = uk_today(now)
    d, tm = day.isoformat(), (day + timedelta(days=1)).isoformat()
    shifts = get(f"rpgace_shifts?date=in.({d},{tm})&select=date,role,start,end&order=date.asc,start.asc")
    blocks = get(f"day_blocks?start_date=lte.{d}&end_date=gte.{d}&select=title,kind,start_time,end_time&order=start_time.asc&limit=12")
    agenda = get(f"rpgace_agendas?date=eq.{d}&completed=is.false&select=title,hour,minute,category&order=hour.asc,minute.asc&limit=12")
    settings = get("myday_settings?id=eq.1&select=wake_time,bed_time")
    chapters = get("bookworm_chapters?status=eq.in_progress&analysis_complete=is.false&select=chapter_title,cc_queued_at&limit=5")
    reviews = {
        "taxonomy_proposals_pending": len(get("taxonomy_proposals?status=eq.pending&select=id&limit=200")),
        "jargon_terms_pending": len(get("jargon_encyclopedia?status=eq.pending&select=id&limit=1000")),
    }
    # Oct 21 2026 (Alex: "yes 100% do it"): Beat Focus came from a pork-knuckle
    # recipe tip, so only Producer-realm insights feed it.
    insights = get("encyclopedia_insights?status=neq.rejected&realms=cs.%7Bproducer%7D&select=insight_text,source_entry_title,realms&order=created_at.desc&limit=8")
    ideas = get("conid_pot?status=neq.archived&select=title,starred,kind&order=starred.desc,created_at.desc&limit=6")
    videos = get("intel_reports?select=title,creator,score,created_at&order=created_at.desc&limit=3")
    return {
        "date": d, "weekday": day.strftime("%A"),
        "shifts_today": [s for s in shifts if s.get("date") == d],
        "shift_tomorrow": next((s for s in shifts if s.get("date") == tm), None),
        "my_day": (settings[0] if settings and "wake_time" in settings[0] else {}),
        "planned_blocks_today": blocks,
        "agenda_today_open": agenda,
        "waiting_on_alex": dict(reviews, chapters_in_progress=[c.get("chapter_title") for c in chapters if c.get("chapter_title")]),
        "recent_producer_insights": insights,
        "idea_bank": ideas,
        "latest_video_analyses": videos,
    }


def fallback_due(now=None, mins=None):
    """(due, reason) for the API backup, from UK local time."""
    uk = (now or datetime.now(timezone.utc)).astimezone(UK)
    if mins is None:
        try:
            mins = int(float(ic.read_settings().get("brief_fallback_mins") or 5))
        except Exception:
            mins = 5
    start = uk.replace(hour=BRIEF_TIME[0], minute=BRIEF_TIME[1], second=0, microsecond=0) + timedelta(minutes=mins)
    if uk < start:
        return False, f"not yet - the backup starts at {start.strftime('%H:%M')} UK"
    if uk.hour >= FALLBACK_UNTIL:
        return False, "too late in the day - the app offers Write it now instead"
    return True, f"due since {start.strftime('%H:%M')} UK"


def fallback(now=None, mins=None, write=None):
    """API backup: write and save the brief if CC hasn't. Returns (ok, message)."""
    day = uk_today(now)
    if existing_brief(day):
        return True, "Today's brief is already saved - nothing to do."
    due, why = fallback_due(now, mins)
    if not due:
        return True, why
    data = gather(now)
    prompt = "Today's RPGACE data for Alex (@AceSanyaBeats), as JSON:\n" + json.dumps(data, ensure_ascii=False, default=str) + \
             "\n\n" + RULES + "\n\nReply with the brief text only."
    if write is None:
        from rpgace_intel import call_claude  # stdlib only; same API helper the video runner uses
        write = lambda pr: call_claude([{"role": "user", "content": pr}], max_tokens=900, timeout=90)
    try:
        text = write(prompt)
    except Exception as e:
        return False, f"API write failed: {str(e)[:200]}"
    ok, msg = save(text, now, api=True)
    return ok, ("API backup (" + why + "): " + msg)


def save(text, now=None, api=False):
    """Insert the brief once; returns (ok, message)."""
    text = (text or "").strip()
    if len(text) < 40:
        return False, "Brief is empty or too short - not saved."
    day = uk_today(now)
    if existing_brief(day):
        return True, "Today's brief is already saved - not saved twice."
    rows = ic.http("POST", "/rest/v1/journal",
                   {"title": f"Morning Brief — {day.strftime('%A %d %B %Y')}" + (API_TAG if api else ""), "date": day.isoformat(),
                    "content": text[:6000], "source": SOURCE},
                   headers={"Prefer": "return=representation"})
    if not (isinstance(rows, list) and rows and rows[0].get("id")):
        return False, "Supabase didn't return the new row - check journal."
    check = existing_brief(day)
    return (True, f"Saved and checked: journal {check['id']}") if check else (False, "Saved but not found on re-read.")


def main(argv):
    if len(argv) < 2 or argv[1] not in ("gather", "save", "rules", "fallback"):
        print(__doc__)
        return 2
    if argv[1] == "rules":
        print(RULES)
        return 0
    if argv[1] == "fallback":
        ok, msg = fallback()
        print(msg)
        return 0 if ok else 1
    if argv[1] == "gather":
        if existing_brief(uk_today()):
            print("ALREADY WRITTEN")
            return 0
        print(json.dumps(gather(), ensure_ascii=False, indent=1, default=str))
        return 0
    if len(argv) < 3:
        print("Usage: save <file>")
        return 2
    ok, msg = save(Path(argv[2]).read_text(encoding="utf-8"))
    print(msg)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
