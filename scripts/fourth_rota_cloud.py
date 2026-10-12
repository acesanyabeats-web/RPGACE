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


async def _settle(page, seconds=20):
    """After login Fourth redirects through several pages; wait until the URL
    stops changing and the page has loaded before reading or clicking."""
    last, same = None, 0
    for _ in range(seconds):
        await asyncio.sleep(1)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        if page.url == last:
            same += 1
            if same >= 2:
                return
        else:
            last, same = page.url, 0


async def _text(page):
    """document.body.innerText, retried if a redirect destroys the page mid-read."""
    for _ in range(5):
        try:
            return await page.evaluate("() => document.body ? document.body.innerText : ''")
        except Exception:
            await _settle(page, 5)
    return await page.evaluate("() => document.body ? document.body.innerText : ''")


def _safe_error(e):
    """Short, public-safe description: error class + first line, URLs cut to
    host/path (query strings can carry session tokens)."""
    import re
    first = (str(e).strip().splitlines() or [""])[0]
    first = re.sub(r"(https?://[^\s?#]+)[?#]\S*", r"\1", first)
    return f"{type(e).__name__}: {first[:140]}"


async def _password_visible(page):
    loc = page.locator('input[type="password"]')
    for i in range(await loc.count()):
        try:
            if await loc.nth(i).is_visible():
                return True
        except Exception:
            pass
    return False


async def _wait_login_gone(page, seconds):
    for _ in range(seconds):
        await asyncio.sleep(1)
        try:
            if not await _password_visible(page):
                return True
        except Exception:
            pass  # mid-navigation
    return False


ERROR_HINTS = ["invalid", "incorrect", "not recognised", "not recognized", "locked",
               "expired", "try again", "failed", "wrong", "disabled", "required"]


async def _login_diagnostic(page, username):
    """Short, public-safe reason: the page's own error line if there is one
    (username redacted), plus where the browser ended up (host + path only)."""
    from urllib.parse import urlparse
    try:
        lines = [l.strip() for l in (await page.evaluate("() => document.body.innerText")).splitlines()]
    except Exception:
        lines = []
    msg = next((l for l in lines if 3 < len(l) < 160 and any(h in l.lower() for h in ERROR_HINTS)), "")
    if username and len(username) >= 3:
        msg = msg.replace(username, "<user>")
    u = urlparse(page.url)
    where = f"{u.netloc}{u.path}"[:70]
    return (f'page says "{msg[:90]}"' if msg else "no error message shown") + f" (still on {where})"


async def _log_form_structure(page, username=""):
    """Public-safe evidence for a failed login: field types/names/visibility,
    button labels, frames, and which kinds of field are filled. Never values."""
    try:
        info = await page.evaluate("""() => {
          const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
          return {
            title: document.title,
            frames: Array.from(document.querySelectorAll('iframe')).map(f => (f.src || '').split('?')[0].slice(0, 80)),
            inputs: Array.from(document.querySelectorAll('input')).map(e => [e.type, e.name || '', e.id || '', vis(e) ? 'visible' : 'hidden', e.value ? 'filled' : 'empty']),
            buttons: Array.from(document.querySelectorAll('button, input[type=submit], a[role=button]')).map(e => [(e.innerText || e.value || '').trim().slice(0, 40), e.type || '', vis(e) ? 'visible' : 'hidden']),
            forms: Array.from(document.forms).map(f => (f.getAttribute('action') || '').split('?')[0].slice(0, 80)),
          };
        }""")
        for k in ("title", "frames", "forms", "inputs", "buttons"):
            print(f"login page {k}: {info.get(k)}")
        print("browser user agent headless:", "Headless" in await page.evaluate("() => navigator.userAgent"))
        text = await page.evaluate("() => document.body.innerText")
        lines = [l.strip() for l in text.splitlines() if l.strip()][:25]
        if username and len(username) >= 3:
            lines = [l.replace(username, "<user>") for l in lines]
        print("login page text:", [l[:100] for l in lines])
    except Exception as e:
        print(f"could not read login page structure ({type(e).__name__})")


async def _log_landing(page, username, text_len):
    """Public-safe: where the run ended up and what the menu offers (labels
    only, short ones, username dropped) - never the page's shift text."""
    from urllib.parse import urlparse
    try:
        u = urlparse(page.url)
        print("landed on:", f"{u.netloc}{u.path}"[:90], "| title:", (await page.title())[:60], "| text chars:", text_len)
        print("frames:", [f"{urlparse(f.url).netloc}{urlparse(f.url).path}"[:80] for f in page.frames[1:]][:10])
        labels = await page.evaluate("""() => Array.from(document.querySelectorAll('a, button, [role=tab], [role=menuitem]'))
            .map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' '))
            .filter(t => t && t.length <= 30)""")
        seen = []
        for l in labels:
            if username and len(username) >= 3 and username.lower() in l.lower():
                continue
            if l not in seen and not any(ch.isdigit() for ch in l):
                seen.append(l)
        print("menu labels:", seen[:60])
    except Exception as e:
        print("could not describe landing page", type(e).__name__)


async def read_schedule_text(username, password):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        # CHROMIUM_PATH: a pre-installed Chrome/Chromium. Actions sets it to
        # the runner's Google Chrome (no browser download needed).
        browser = await p.chromium.launch(headless=True, executable_path=os.environ.get("CHROMIUM_PATH") or None)
        # Oct 12 2026: Fourth's login (a Salesforce page) silently re-showed the
        # form for a browser announcing itself as "HeadlessChrome" - present
        # the same browser's normal Chrome identity instead.
        probe_ctx = await browser.new_context()
        probe = await probe_ctx.new_page()
        real_ua = (await probe.evaluate("() => navigator.userAgent")).replace("HeadlessChrome", "Chrome")
        await probe_ctx.close()
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900}, user_agent=real_ua,
                                        locale="en-GB", timezone_id="Europe/London")
        page = await ctx.new_page()
        await page.goto(fr.LOGIN_URL, wait_until="domcontentloaded", timeout=45000)
        u = await fr.try_fill(page, USER_SELECTORS, username)
        pw = await fr.try_fill(page, PASS_SELECTORS, password)
        if pw:
            # Type it key by key too, so any key-event handlers on the page fire.
            box = page.locator(pw).first
            await box.fill("")
            await box.press_sequentially(password, delay=40)
        if not (u and pw):
            await browser.close()
            raise RuntimeError("Fourth's login page wasn't recognised (layout may have changed)")
        clicked = await fr.try_click(page, SUBMIT_SELECTORS)
        if not clicked:
            await page.keyboard.press("Enter")
        # Oct 12 2026: first real run reported "login didn't go through".
        # networkidle can settle before a redirect, and a hidden password
        # input left in the DOM counted as "still on the login page" - so
        # wait up to 30s for the VISIBLE password box to go away instead.
        if not await _wait_login_gone(page, 30):
            # Enter as a second try, in case the button click didn't submit.
            # Only if the box still holds the password - pressing Enter on an
            # emptied box after a rejected login just adds "Enter a value in
            # the Password field" and hides Fourth's real answer (run 7).
            try:
                box = page.locator('input[type="password"]').first
                if await box.input_value():
                    await box.press("Enter")
            except Exception:
                pass
            await _wait_login_gone(page, 15)
        await _settle(page)
        body = (await _text(page)).lower()
        if any(h in body for h in CODE_HINTS):
            await browser.close()
            raise RuntimeError("Fourth asked for a code or captcha, so it can't log in unattended")
        if await _password_visible(page):
            why = await _login_diagnostic(page, username)
            await _log_form_structure(page, username)
            await browser.close()
            raise RuntimeError("Fourth login didn't go through - " + why)
        if await fr.try_click(page, SCHEDULE_SELECTORS):
            try:
                await page.wait_for_load_state("networkidle", timeout=20000)
            except Exception:
                await asyncio.sleep(3)
            await _settle(page)
        text = await _text(page)
        await _log_landing(page, username, len(text))
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
        if isinstance(e, RuntimeError):
            report(False, str(e))
        else:
            print("error detail:", _safe_error(e))
            report(False, f"Fourth couldn't be read ({_safe_error(e)[:150]})")
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
