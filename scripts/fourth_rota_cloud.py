#!/usr/bin/env python3
"""
Fourth rota -> RPGACE, without the laptop (GitHub Actions).

Oct 12 2026, MD2-2 of the ratified "My Day Round 2" plan. Alex: run the
Fourth script without the laptop; he agreed to store his Fourth login as
GitHub secrets. Same login helpers and the same Claude parsing as the PC
script (scripts/fourth_rota.py, rule 8), but headless and with no "press
Enter" fallbacks: if Fourth asks for a code, shows a captcha or changes its
page, the run stops, says why on sync_status (key 'rota'), and the RPGACE
dashboard asks Alex for a rota screenshot instead.

Writes go through https://rpgace.vercel.app/api/data-write with the
RPGACE_API_SECRET secret (rpgace_shifts is read-only for the anon key).
Semantics match shiftSync.replaceDates in the app: the scraped window (today
to the last scraped date) replaces what's stored for those dates.

This repo is public, so its Actions logs are public: nothing here prints
dates, times, roles, page text or URLs - only counts and a short reason.

Env: FOURTH_USERNAME, FOURTH_PASSWORD, RPGACE_API_SECRET, ANTHROPIC_API_KEY.
"""
import asyncio
import json
import os
import sys
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fourth_rota as fr  # shared: LOGIN_URL, try_fill, try_click, parse_shifts

API = os.environ.get("RPGACE_API_URL", "https://rpgace.vercel.app/api/data-write")

USER_SELECTORS = [
    'input[name="username"]', 'input[name="email"]', 'input[type="email"]',
    'input[id*="user" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]',
    'input[placeholder*="user" i]',
]
PASS_SELECTORS = ['input[name="password"]', 'input[type="password"]']
SUBMIT_SELECTORS = ['button[type="submit"]', 'input[type="submit"]',
                    'button:has-text("Log")', 'button:has-text("Sign")']
SCHEDULE_SELECTORS = [
    'a:has-text("My Schedule")', 'a:has-text("Schedule")', 'a:has-text("My Shifts")',
    'a:has-text("Shifts")', 'a:has-text("Rota")', 'a:has-text("Timetable")',
    '[href*="schedule" i]', '[href*="rota" i]', '[href*="shift" i]',
]
CODE_HINTS = ["verification code", "one-time", "authenticator", "captcha",
              "i'm not a robot", "enter the code", "security code"]


def write(table, operation, payload=None, match=None, on_conflict=None):
    body = {"table": table, "operation": operation, "payload": payload, "match": match}
    if on_conflict:
        body["onConflict"] = on_conflict
    req = urllib.request.Request(
        API, method="POST", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "X-RPGACE-Auth": os.environ["RPGACE_API_SECRET"]})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode() or "{}")


def report(ok, message, count=None):
    """Last-run status for the dashboard. Never fails the run itself."""
    try:
        write("sync_status", "insert",
              {"key": "rota", "ok": ok, "message": message[:200], "item_count": count,
               "ran_at": __import__("datetime").datetime.utcnow().isoformat() + "Z"},
              on_conflict="key")
    except Exception as e:
        print(f"::warning::could not write sync_status ({type(e).__name__})")
    print(("OK: " if ok else "NOT OK: ") + message)


def clean(shifts, today):
    out = []
    for s in shifts:
        d = str(s.get("date", ""))[:10]
        if len(d) != 10 or d < today:
            continue
        out.append({
            "date": d, "day": (s.get("day") or fr.day_abbr(d)).upper()[:3],
            "role": s.get("role") or "Shift",
            "start": s.get("start") or "00:00", "end": s.get("end") or "00:00",
            "hours": float(s.get("hours") or 0),
        })
    # Same (date, start) twice would break the table's UNIQUE(date, start).
    seen, uniq = set(), []
    for s in out:
        k = (s["date"], s["start"])
        if k not in seen:
            seen.add(k)
            uniq.append(s)
    return uniq


async def read_schedule_text(username, password):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        # CHROMIUM_PATH: a pre-installed Chrome/Chromium. Actions sets it to
        # the runner's Google Chrome (no browser download needed).
        browser = await p.chromium.launch(headless=True, executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = await (await browser.new_context(viewport={"width": 1280, "height": 900})).new_page()
        await page.goto(fr.LOGIN_URL, wait_until="domcontentloaded", timeout=45000)
        u = await fr.try_fill(page, USER_SELECTORS, username)
        pw = await fr.try_fill(page, PASS_SELECTORS, password)
        if not (u and pw):
            await browser.close()
            raise RuntimeError("Fourth's login page wasn't recognised (layout may have changed)")
        await fr.try_click(page, SUBMIT_SELECTORS)
        try:
            await page.wait_for_load_state("networkidle", timeout=25000)
        except Exception:
            await asyncio.sleep(4)
        body = (await page.evaluate("() => document.body.innerText")).lower()
        if any(h in body for h in CODE_HINTS):
            await browser.close()
            raise RuntimeError("Fourth asked for a code or captcha, so it can't log in unattended")
        if await page.locator('input[type="password"]').count() > 0:
            await browser.close()
            raise RuntimeError("Fourth login didn't go through (check FOURTH_USERNAME/FOURTH_PASSWORD)")
        if await fr.try_click(page, SCHEDULE_SELECTORS):
            try:
                await page.wait_for_load_state("networkidle", timeout=20000)
            except Exception:
                await asyncio.sleep(3)
        text = await page.evaluate("() => document.body.innerText")
        await browser.close()
        return text


def main():
    missing = [k for k in ("FOURTH_USERNAME", "FOURTH_PASSWORD", "RPGACE_API_SECRET", "ANTHROPIC_API_KEY")
               if not os.environ.get(k)]
    if missing:
        print("::warning::Missing secret(s): " + ", ".join(missing) + " - nothing done.")
        return 0
    today = date.today().isoformat()
    try:
        text = asyncio.run(read_schedule_text(os.environ["FOURTH_USERNAME"], os.environ["FOURTH_PASSWORD"]))
    except Exception as e:
        report(False, str(e) if isinstance(e, RuntimeError) else f"Fourth couldn't be read ({type(e).__name__})")
        return 0
    try:
        shifts = clean(fr.parse_shifts(text, os.environ["ANTHROPIC_API_KEY"], today), today)
    except Exception as e:
        report(False, f"Shifts couldn't be read from the Fourth page ({type(e).__name__})")
        return 0
    if not shifts:
        # Could be a genuinely empty rota or a page that isn't the schedule;
        # keep what's stored and let Alex check.
        report(False, "No upcoming shifts found on the Fourth page - check the rota or send a screenshot", 0)
        return 0
    last = max(s["date"] for s in shifts)
    try:
        write("rpgace_shifts", "delete", match=f"date=gte.{today}&date=lte.{last}")
        write("rpgace_shifts", "insert", shifts)
    except Exception as e:
        report(False, f"Saving shifts to RPGACE failed ({type(e).__name__})")
        return 0
    report(True, f"{len(shifts)} shifts imported from Fourth", len(shifts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
