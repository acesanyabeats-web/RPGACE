#!/usr/bin/env python3
"""
session_lessons_retroactive_seed.py — Aug 15 2026, real Alex ask: "now
also use patch notes html to retroactively fill out sessions lessons
and rules log. just mark as blue, will plan it later."

Real, mechanical generator (R10 — never hand-curate 257 cards one at a
time): scans every real patch_notes.html <div class="card-title"> for
signal keywords indicating a genuine misunderstanding/correction/
obstacle-and-fix episode, and emits a lightweight "🔵 blue, not yet
fully written up" list entry per match into session_lessons.html — a
real title + date pointer back to patch_notes.html's own full card,
never a re-narrated summary (rule 8 — patch_notes.html still owns the
full story). Per Alex's own explicit "just mark as blue, will plan it
later": these are flagged for a future full Prompt-Scope/Obstacle/
Reasoning/Solution/Rule write-up, not attempted here.
"""
import re
from pathlib import Path

PATCH_NOTES = Path('patch_notes.html')
SESSION_LESSONS = Path('session_lessons.html')

SIGNAL_KEYWORDS = [
    'correction', 'misunderstanding', 'real bug', 'caught', 'found and fixed',
    'real regression', 'stale', 'drift', 'wrong', 'near-miss', 'landmine',
    'real find', 'root cause', 'never actually', 'silently', 'false positive',
]

CARD_TITLE_RE = re.compile(r'<div class="card-title">(.*?)</div>', re.DOTALL)
DATE_RE = re.compile(r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2})')


def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s).strip()


def main():
    html = PATCH_NOTES.read_text(encoding='utf-8')
    titles = CARD_TITLE_RE.findall(html)
    matches = []
    seen = set()
    for raw in titles:
        text = strip_tags(raw)
        low = text.lower()
        if not any(kw in low for kw in SIGNAL_KEYWORDS):
            continue
        if text in seen:
            continue
        seen.add(text)
        m = DATE_RE.search(text)
        date = m.group(1) if m else '(date in title)'
        matches.append((date, text))

    rows = ''.join(
        f'    <li><span class="retro-date">{date}</span> {text}</li>\n'
        for date, text in matches
    )
    block = f'''  <div class="card retro-block">
    <div class="card-top">
      <div class="card-title">🔵 Retroactively flagged from patch_notes.html — blue, not yet fully written up</div>
      <div class="card-date">Aug 15 2026</div>
    </div>
    <span class="trigger retro">Mechanical scan, R10 — not hand-curated</span>
    <div class="block scope"><b>Prompt scope</b>Alex: "now also use patch notes html to retroactively fill out sessions lessons and rules log. just mark as blue, will plan it later."</div>
    <div class="block obstacle"><b>What this is</b>{len(matches)} real patch_notes.html cards whose own titles signal a genuine misunderstanding/correction/obstacle-and-fix episode (mechanically matched on real keywords: correction, misunderstanding, real bug, caught, stale, drift, wrong, landmine, root cause, etc.) — each one is a real candidate for a full Prompt-Scope/Obstacle/Reasoning/Solution/Rule write-up later. Listed here as titles + dates only, pointing back to <a href="patch_notes.html">patch_notes.html</a>'s own full card (rule 8 — the full story stays there, not re-narrated here) — deliberately NOT expanded into full cards yet, per Alex's own "just mark as blue, will plan it later."</div>
    <ul class="retro-list">
{rows}    </ul>
  </div>

'''
    body = SESSION_LESSONS.read_text(encoding='utf-8')
    # Insert right after the intro <div class="wrap"> open tag, above the
    # existing real cards (newest-first convention this doc already uses).
    marker = '<div class="wrap">\n'
    idx = body.index(marker) + len(marker)
    if 'card retro-block' in body:
        print('Retroactive block already present — run this only once, or delete the existing block first.')
        return
    new_body = body[:idx] + '\n' + block + body[idx:]
    SESSION_LESSONS.write_text(new_body, encoding='utf-8')
    print(f"Wrote {len(matches)} retroactive entries into {SESSION_LESSONS}")


if __name__ == '__main__':
    main()
