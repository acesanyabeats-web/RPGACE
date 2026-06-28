#!/usr/bin/env python3
"""
RPGACE — Fourth Rota Extractor (Playwright)
Logs into secure.fourth.com and extracts upcoming shifts.
Run: python fourth_rota.py
"""

import asyncio, json, getpass
from pathlib import Path
from datetime import datetime, date
from playwright.async_api import async_playwright

OUTPUT       = Path(r"C:\Users\acesa\RPGACE\rota_output.json")
CONSOLE_FILE = Path(r"C:\Users\acesa\RPGACE\rota_console_cmd.txt")
API_KEY_FILE = Path(r"C:\Users\acesa\RPGACE\.anthropic_key")
LOGIN_URL    = "https://secure.fourth.com/fmplogin"
SS_DIR       = Path(r"C:\Users\acesa\RPGACE")


def day_abbr(date_str):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return ["MON","TUE","WED","THU","FRI","SAT","SUN"][d.weekday()]
    except:
        return "???"


async def try_click(page, selectors):
    """Try a list of selectors, click the first one found."""
    for sel in selectors:
        try:
            el = page.locator(sel).first
            if await el.count() > 0:
                await el.click()
                return sel
        except:
            pass
    return None


async def try_fill(page, selectors, value):
    """Fill the first matching field."""
    for sel in selectors:
        try:
            el = page.locator(sel).first
            if await el.count() > 0:
                await el.fill(value)
                return sel
        except:
            pass
    return None


async def extract():
    print("=" * 60)
    print("RPGACE — Fourth Rota Extractor")
    print("=" * 60)
    username = input("Fourth username / email: ").strip()
    password = getpass.getpass("Fourth password (hidden): ").strip()
    print("\nOpening browser...\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=300)
        ctx  = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()

        # ── LOGIN ─────────────────────────────────────────────
        print("Step 1: Logging in...")
        await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
        await page.screenshot(path=str(SS_DIR / "fourth_1_login.png"))

        filled_user = await try_fill(page, [
            'input[name="username"]', 'input[name="email"]',
            'input[type="email"]',    'input[id*="user" i]',
            'input[id*="email" i]',   'input[placeholder*="email" i]',
            'input[placeholder*="user" i]',
        ], username)

        filled_pass = await try_fill(page, [
            'input[name="password"]', 'input[type="password"]',
        ], password)

        if filled_user and filled_pass:
            print(f"  Filled: {filled_user} / {filled_pass}")
            clicked = await try_click(page, [
                'button[type="submit"]', 'input[type="submit"]',
                'button:has-text("Log")', 'button:has-text("Sign")',
            ])
            print(f"  Clicked: {clicked}")
            try:
                await page.wait_for_load_state("networkidle", timeout=20000)
            except:
                await asyncio.sleep(3)
        else:
            print("\n⚠  Could not detect login fields automatically.")
            print("   The browser is open — please log in manually.")
            input("   Press Enter once you are logged in... ")

        await page.screenshot(path=str(SS_DIR / "fourth_2_after_login.png"))
        print(f"  URL after login: {page.url}")

        # ── NAVIGATE TO SCHEDULE ──────────────────────────────
        print("\nStep 2: Finding schedule page...")

        schedule_found = await try_click(page, [
            'a:has-text("My Schedule")', 'a:has-text("Schedule")',
            'a:has-text("My Shifts")',   'a:has-text("Shifts")',
            'a:has-text("Rota")',        'a:has-text("Timetable")',
            '[href*="schedule" i]',      '[href*="rota" i]',
            '[href*="shift" i]',
        ])

        if schedule_found:
            print(f"  Found nav: {schedule_found}")
            try:
                await page.wait_for_load_state("networkidle", timeout=15000)
            except:
                await asyncio.sleep(2)
        else:
            print("\n⚠  Could not find schedule link automatically.")
            print("   The browser is open — please navigate to your schedule/rota page.")
            input("   Once you can SEE your upcoming shifts, press Enter... ")

        await page.screenshot(path=str(SS_DIR / "fourth_3_schedule.png"))
        print(f"  URL on schedule page: {page.url}")

        # ── EXTRACT PAGE TEXT ─────────────────────────────────
        print("\nStep 3: Reading page content...")
        page_text = await page.evaluate("() => document.body.innerText")
        raw_file  = SS_DIR / "fourth_page_raw.txt"
        raw_file.write_text(page_text[:20000], encoding="utf-8")
        print(f"  Page text saved ({len(page_text)} chars) → {raw_file}")

        await browser.close()

    # ── PARSE WITH CLAUDE ─────────────────────────────────────
    print("\nStep 4: Extracting shifts with Claude...")
    import anthropic as ant
    client    = ant.Anthropic(api_key=API_KEY_FILE.read_text().strip())
    today_str = date.today().strftime("%Y-%m-%d")

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""You are extracting work shift data from a hospitality scheduling app (Fourth).
Today's date is {today_str}. Extract ALL upcoming shifts (today onwards, next 8 weeks).

PAGE CONTENT:
{page_text[:9000]}

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {{"date":"2026-07-04","day":"SAT","role":"Bar Tender","start":"13:00","end":"22:00","hours":9.0}},
  {{"date":"2026-07-05","day":"SUN","role":"Bar Tender","start":"17:00","end":"00:00","hours":7.0}}
]

Rules:
- date: YYYY-MM-DD format
- day: 3-letter abbreviation MON/TUE/WED/THU/FRI/SAT/SUN
- role: job title as shown
- start/end: 24-hour HH:MM (midnight = 00:00)
- hours: decimal (e.g. 13:00-22:00 = 9.0)
- Only include shifts from {today_str} onwards
- If no shifts found return: []"""
        }]
    )

    raw = msg.content[0].text.strip()

    # Clean markdown fences if present
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        shifts = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"\n❌ JSON parse error: {e}")
        print("Claude returned:", raw[:500])
        print("\nCheck the raw page text at:", raw_file)
        print("Screenshots at:", SS_DIR)
        return

    # Fill missing day abbreviations
    for s in shifts:
        if not s.get("day") or s["day"] == "???":
            s["day"] = day_abbr(s.get("date", ""))

    # ── SAVE ──────────────────────────────────────────────────
    if not shifts:
        print("\n⚠  No upcoming shifts extracted.")
        print(f"   Check screenshots in: {SS_DIR}")
        print(f"   Check raw page text:  {raw_file}")
        print("   If the schedule was visible, the page layout may need adjusting.")
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(shifts, indent=2), encoding="utf-8")

    print(f"\n✅ Extracted {len(shifts)} upcoming shifts:")
    for s in shifts:
        print(f"   {s['date']} {s['day']}  "
              f"{s.get('start','?')}-{s.get('end','?')}  "
              f"({s.get('hours','?')}h)  {s.get('role','')}")

    # ── GENERATE LOCALSTORAGE COMMAND ─────────────────────────
    ls_cmd = (
        f"localStorage.setItem('rpgace_shifts', "
        f"JSON.stringify({json.dumps(shifts)})); "
        f"console.log('✅ {len(shifts)} shifts loaded'); "
        f"location.reload();"
    )
    CONSOLE_FILE.write_text(ls_cmd, encoding="utf-8")

    print(f"""
{'='*60}
NEXT STEP — load shifts into RPGACE:

  1. Open rpgace.vercel.app in your browser
  2. Press F12 → click Console tab
  3. Open this file, copy ALL its contents:
       {CONSOLE_FILE}
  4. Paste into the console → press Enter
  5. Page reloads — Schedule tab now shows real shifts

{'='*60}
Shift data also saved to: {OUTPUT}
Screenshots saved to:    {SS_DIR}
""")


if __name__ == "__main__":
    asyncio.run(extract())
