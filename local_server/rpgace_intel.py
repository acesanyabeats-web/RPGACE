#!/usr/bin/env python3
"""
RPGACE Content Intelligence
============================
Paste any YouTube, Instagram, TikTok or X URL.
Downloads video → transcribes → analyses → sends to RPGACE Oracle.
Video deleted after analysis. Insights saved to your encyclopedia.

Usage:
  python rpgace_intel.py                    # interactive mode
  python rpgace_intel.py <url>              # process one URL
  python rpgace_intel.py --batch urls.txt  # process list of URLs
"""

import os
import re
import sys
import json
import time
import shutil
import hashlib
import argparse
import tempfile
import subprocess
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from datetime import datetime

# VW-0: which analyser made a report (shared with both runners).
try:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from intel_common import ANALYSER_VERSION
except Exception:  # an old copy of intel_common.py, or none
    ANALYSER_VERSION = "unknown"

# ── CONFIG ────────────────────────────────────────────────────────────────────
HOME          = Path.home() / "RPGACE"
INTEL_DIR     = HOME / "intel"
WATCHLIST_FILE= INTEL_DIR / "watchlist.json"
INSIGHTS_FILE = INTEL_DIR / "insights.json"
RPGACE_URL    = "https://rpgace.vercel.app"  # your live app

WHISPER_MODEL = "small"   # tiny=fastest, small=good balance, medium=best quality
FRAME_INTERVAL= 30        # unused since VW-1 (frames now spread over the whole video)
MAX_FRAMES    = 8
# VW-1 (Oct 20 2026): the whole transcript goes to the analysis. Only a long one
# (over CONDENSE_OVER words) is condensed first, by the cheap model, and only by
# DROPPING filler lines - kept lines stay word for word with their [m:ss] time,
# so quotes can later be checked against what was really said.
CONDENSE_OVER  = 6000     # words
CONDENSE_CHUNK = 2500     # words per cheap-model call
TRANSCRIPT_CAP = 90000    # chars, applied AFTER condensing, with a visible marker
MECHANICAL_MODEL = "claude-haiku-4-5-20251001"
SCORE_THRESHOLD = 7

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ── FFMPEG SETUP ──────────────────────────────────────────────────────────────
def get_ffmpeg_path():
    """Find ffmpeg — system install or portable fallback."""
    # Check system PATH first
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True)
    if result.returncode == 0:
        return "ffmpeg"
    # Check portable location
    portable = HOME / "ffmpeg" / "ffmpeg.exe"
    if portable.exists():
        # Add to PATH for this session
        os.environ["PATH"] = str(portable.parent) + os.pathsep + os.environ.get("PATH","")
        return str(portable)
    return None

# ── COLOURS ───────────────────────────────────────────────────────────────────
GOLD="\033[93m"; GREEN="\033[92m"; RED="\033[91m"
CYAN="\033[96m"; PURPLE="\033[95m"; DIM="\033[2m"; RESET="\033[0m"

def log(msg, color=RESET, end="\n"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  {DIM}[{ts}]{RESET} {color}{msg}{RESET}", end=end)

def banner():
    os.system("cls" if os.name=="nt" else "clear")
    print(f"\n{GOLD}  ╔══════════════════════════════════════════════╗")
    print(f"  ║   RPGACE CONTENT INTELLIGENCE SYSTEM        ║")
    print(f"  ║   Study · Analyse · Delete · Evolve         ║")
    print(f"  ╚══════════════════════════════════════════════╝{RESET}\n")

def ensure_dirs():
    for d in [HOME, INTEL_DIR, HOME/"inbox", HOME/"processed", HOME/"transcripts", HOME/"strategy"]:
        d.mkdir(parents=True, exist_ok=True)

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default
    except: return default

def save_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

# ── YT-DLP ────────────────────────────────────────────────────────────────────
def check_ytdlp():
    try:
        r = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True)
        if r.returncode == 0:
            log(f"yt-dlp {r.stdout.strip()} ready", DIM)
            return True
    except FileNotFoundError: pass
    log("yt-dlp not found — installing...", CYAN)
    subprocess.run([sys.executable, "-m", "pip", "install", "yt-dlp", "--quiet"])
    return True

def get_metadata(url: str) -> dict:
    """Get video metadata without downloading."""
    log("Fetching metadata...", CYAN)
    r = subprocess.run(
        ["yt-dlp", "--dump-json", "--no-download", url],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        raise RuntimeError(f"Metadata failed: {r.stderr[:200]}")
    data = json.loads(r.stdout.split("\n")[0])
    return {
        "title":       data.get("title","Unknown"),
        "uploader":    data.get("uploader", data.get("channel","Unknown")),
        "platform":    data.get("extractor_key","Unknown"),
        "duration":    data.get("duration", 0),
        "view_count":  data.get("view_count", 0),
        "like_count":  data.get("like_count", 0),
        "description": (data.get("description") or "")[:500],
        "upload_date": data.get("upload_date",""),
        "url":         url,
        "id":          data.get("id","")
    }

def download_video(url: str, out_dir: Path) -> Path:
    """Download video to temp directory."""
    log("Downloading video...", CYAN)
    out_template = str(out_dir / "%(id)s.%(ext)s")
    r = subprocess.run([
        "yt-dlp",
        # Oct 11 2026: YouTube mostly no longer serves one file with both
        # audio and video, so plain "best" failed ("Requested format is not
        # available"). Take separate video+audio streams and let ffmpeg merge
        # them; fall back to a single combined file where one exists (Instagram).
        "-f", "bv*[height<=720]+ba/b[height<=720]/bv*+ba/b",
        "--merge-output-format", "mp4",
        "--no-playlist",
        "-o", out_template,
        "--quiet",
        "--no-warnings",
        url
    ], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Download failed: {r.stderr[:300]}")
    videos = list(out_dir.glob("*.*"))
    if not videos:
        raise RuntimeError("Download seemed to succeed but no file found")
    video_file = max(videos, key=lambda f: f.stat().st_size)
    size_mb = video_file.stat().st_size / 1024 / 1024
    log(f"Downloaded: {video_file.name} ({size_mb:.1f} MB)", GREEN)
    return video_file

# ── WHISPER ───────────────────────────────────────────────────────────────────
def fmt_time(sec) -> str:
    sec = int(max(0, sec or 0))
    h, rem = divmod(sec, 3600)
    m, s_ = divmod(rem, 60)
    return f"{h}:{m:02d}:{s_:02d}" if h else f"{m}:{s_:02d}"


def mark_segments(segments) -> str:
    """Whisper segments -> one line per segment, '[m:ss] text' (VW-1)."""
    lines = []
    for seg in segments or []:
        text = (seg.get("text") or "").strip()
        if text:
            lines.append(f"[{fmt_time(seg.get('start'))}] {text}")
    return "\n".join(lines)


def transcribe_audio(video_path: Path) -> tuple:
    """Transcribe audio track with Whisper.
    Returns (plain text, timed text with one '[m:ss] ...' line per segment)."""
    log(f"Transcribing audio (Whisper {WHISPER_MODEL})...", CYAN)
    try:
        import whisper
    except ImportError:
        log("Installing Whisper (CPU-only, no GPU bloat)...", CYAN)
        # Install torch CPU-only first to avoid 2GB GPU download
        subprocess.run([sys.executable, "-m", "pip", "install",
            "torch", "torchvision", "torchaudio",
            "--index-url", "https://download.pytorch.org/whl/cpu",
            "--quiet"])
        subprocess.run([sys.executable, "-m", "pip", "install", "openai-whisper", "--quiet"])
        import whisper

    model = whisper.load_model(WHISPER_MODEL)
    result = model.transcribe(str(video_path), language="en", verbose=False)
    transcript = result["text"].strip()
    timed = mark_segments(result.get("segments")) or transcript
    log(f"Transcript: {len(transcript.split())} words", GREEN)
    return transcript, timed

# ── FRAME EXTRACTION ──────────────────────────────────────────────────────────
def extract_frames(video_path: Path, duration: int, out_dir: Path) -> list:
    """Extract frames at regular intervals using ffmpeg."""
    if duration <= 0:
        return []
    ffmpeg_bin = get_ffmpeg_path()
    if not ffmpeg_bin:
        log("FFmpeg not available — skipping frame extraction", RED)
        return []

    frames = []
    timestamps = frame_times(duration)
    log(f"Extracting {len(timestamps)} frames across the whole video...", CYAN)

    for i, t in enumerate(timestamps[:MAX_FRAMES]):
        frame_path = out_dir / f"frame_{i:02d}_{t:04d}s.jpg"
        r = subprocess.run([
            ffmpeg_bin, "-ss", str(t), "-i", str(video_path),
            "-vframes", "1", "-q:v", "3", "-vf", "scale=640:-1",
            str(frame_path), "-y", "-loglevel", "quiet"
        ], capture_output=True)
        if frame_path.exists() and frame_path.stat().st_size > 0:
            frames.append(frame_path)

    log(f"Extracted {len(frames)} frames", GREEN)
    return frames

def frame_times(duration) -> list:
    """VW-1: MAX_FRAMES moments spread evenly over the whole video (the middle of
    each equal slice), not the first 4 minutes. Capped at 60 min like the rest."""
    d = min(int(duration or 0), 3600)
    if d <= 0:
        return []
    n = max(1, min(MAX_FRAMES, d // 2))   # very short clips: one frame per ~2s
    return sorted({int(d * (i + 0.5) / n) for i in range(n)})


def encode_frame(frame_path: Path) -> str:
    """Base64 encode an image frame."""
    import base64
    return base64.b64encode(frame_path.read_bytes()).decode("utf-8")

# ── CLAUDE API ────────────────────────────────────────────────────────────────
def call_claude(messages: list, system: str = "", max_tokens: int = 2000,
                model: str = "claude-sonnet-4-6", timeout: int = 60) -> str:
    """Call Anthropic Claude API directly."""
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set. Add it to your environment variables.")

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages
    }
    if system:
        payload["system"] = system

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["content"][0]["text"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        raise RuntimeError(f"Claude API error {e.code}: {body[:200]}")

MADE_REALMS = ("creator", "producer", "hustler")   # realms that also want "how it's made"


def frames_prompt(meta: dict, times: list, realms: list, lenses: dict) -> str:
    """VW-1: the frame question follows the picked realms. Editing/thumbnail/DAW
    questions only for Creator/Producer/Hustler; every realm gets 'what is being
    shown or done' with the time of each frame."""
    names = ", ".join((lenses.get(k) or {}).get("name") or k.title() for k in realms)
    stamps = ", ".join(f"frame {i+1} = {fmt_time(t)}" for i, t in enumerate(times))
    looks = "\n".join(f"- {(lenses.get(k) or {}).get('name') or k.title()}: {(lenses.get(k) or {}).get('looks_for', '')}"
                       for k in realms)
    made = ""
    if any(k in MADE_REALMS for k in realms):
        made = ("\nAlso, because the realms include making content or music: how it's made - "
                "editing style, text on screen, the opening hook, and any software, plugins, gear "
                "or tools clearly visible (only what you can actually see).")
    return f"""These are frames from a {meta['platform']} video titled "{meta['title']}" by {meta['uploader']}.
They are spread over the whole video ({stamps}).
Alex sent it for these realms: {names}. What each realm looks for:
{looks}

For each frame, say in one or two lines what is being shown or done that matters to those realms
(ingredients, amounts, movements, equipment, steps, numbers or text on screen), starting the line with its time.
Only describe what is visible - never guess at what is not shown.{made}"""


def analyse_frames(frames: list, meta: dict, realms=None) -> str:
    """Send frames to Claude Vision for visual analysis (realm-aware, VW-1)."""
    if not frames:
        return "No frames extracted."

    log(f"Analysing {len(frames)} frames with Claude Vision...", CYAN)
    content = []
    for i, frame in enumerate(frames[:MAX_FRAMES]):
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": encode_frame(frame)}
        })
    realms = clean_realms(realms)
    # each frame's own time, from its file name (frame_00_0123s.jpg), so a
    # frame ffmpeg failed to write can't shift the times of the rest
    times = []
    for f in frames[:MAX_FRAMES]:
        m = re.search(r"_(\d+)s\.jpg$", Path(f).name)
        times.append(int(m.group(1)) if m else 0)
    content.append({"type": "text", "text": frames_prompt(meta, times, realms, load_lenses())})

    return call_claude([{"role": "user", "content": content}],
                      "You describe video frames precisely and only report what is visible.", 1000)

# ── REALM LENSES (Realm Inputs RI-4, Oct 15 2026) ─────────────────────────────
# Alex picks up to 4 of his 13 realms for every link he sends (intel_jobs.realms).
# Each realm's lens (what to look for, what its 1-10 score means, quest style)
# lives in ONE file at the repo root, realm_lenses.json, read here and by the app.
REALM_KEYS = ["producer", "creator", "hustler", "chef", "athlete", "scholar", "life",
              "homekeeper", "mind", "steward", "explorer", "connector", "builder"]
# VW-0: on the laptop the file sits next to this one (%USERPROFILE%\RPGACE,
# downloaded by start_server.bat); in the repo it is one folder up.
_HERE = Path(__file__).resolve().parent
REALM_LENS_FILE = next((p for p in (_HERE / "realm_lenses.json", _HERE.parent / "realm_lenses.json") if p.exists()),
                       _HERE.parent / "realm_lenses.json")
DEFAULT_REALMS = ["producer"]  # links sent before the picker existed


def load_lenses() -> dict:
    """realm_lenses.json's realms map; {} when the file isn't next to this
    checkout (e.g. a laptop copy) - the prompt then names the realms only."""
    try:
        return json.loads(REALM_LENS_FILE.read_text(encoding="utf-8")).get("realms", {}) or {}
    except Exception:
        return {}


def clean_realms(realms) -> list:
    out = []
    for k in realms or []:
        if k in REALM_KEYS and k not in out:
            out.append(k)
    return out[:4] or list(DEFAULT_REALMS)


def lens_block(realms: list, lenses: dict) -> str:
    lines = []
    for k in realms:
        l = lenses.get(k) or {}
        name = l.get("name") or k.title()
        if l:
            lines.append(f"- {name} (key \"{k}\"): looks for {l.get('looks_for','')} "
                         f"Score means: {l.get('score_means','')} Quest style: {l.get('quest_style','')}")
        else:
            lines.append(f"- {name} (key \"{k}\")")
    return "\n".join(lines)


def _keep_lines(lines: list, meta: dict) -> list:
    """One cheap-model call: which numbered lines carry real substance.
    Returns the kept lines, word for word. Fails open (keeps all)."""
    numbered = "\n".join(f"{i+1}| {l}" for i, l in enumerate(lines))
    prompt = (f"Below is part of the transcript of \"{meta.get('title','')}\", one numbered line each.\n"
              "Reply with ONLY the numbers of the lines to KEEP, comma-separated. Keep every line that "
              "has a technique, step, instruction, ingredient, amount, number, time, name, claim, story "
              "point or quotable sentence. Drop only filler: greetings, sponsor reads, 'like and "
              "subscribe', repeats, ums and chit-chat. When unsure, keep it.\n\n" + numbered)
    try:
        raw = call_claude([{"role": "user", "content": prompt}], "", 800, MECHANICAL_MODEL, 90)
        keep = {int(n) for n in re.findall(r"\d+", raw) if 0 < int(n) <= len(lines)}
        if not keep:
            return lines
        return [l for i, l in enumerate(lines) if (i + 1) in keep]
    except Exception as e:
        log(f"Condense step failed, keeping that part whole ({e})", DIM)
        return lines


def condense_transcript(timed: str, meta: dict) -> str:
    """VW-1: whole transcript, trimmed of filler only when long. Extractive:
    the cheap model picks line numbers, the kept lines are copied untouched
    (with their [m:ss]). Then an honest cap with a visible marker."""
    if len(timed.split()) > CONDENSE_OVER:
        lines = [l for l in timed.splitlines() if l.strip()]
        chunks, cur, words = [], [], 0
        for l in lines:
            cur.append(l); words += len(l.split())
            if words >= CONDENSE_CHUNK:
                chunks.append(cur); cur, words = [], 0
        if cur:
            chunks.append(cur)
        log(f"Long transcript - trimming filler in {len(chunks)} parts...", CYAN)
        kept = []
        for c in chunks:
            kept.extend(_keep_lines(c, meta))
        before = len(timed.split())
        timed = "\n".join(kept)
        log(f"Transcript trimmed {before} -> {len(timed.split())} words", GREEN)
    if len(timed) > TRANSCRIPT_CAP:
        cut = timed[:TRANSCRIPT_CAP]
        cut = cut[:cut.rfind("\n")] if "\n" in cut else cut
        timed = cut + "\n[... transcript continues - cut here for length ...]"
    return timed


def generate_oracle_insights(meta: dict, transcript: str, visual_analysis: str, realms=None,
                             full_transcript: str = None) -> dict:
    """VW-2 (Oct 20 2026): one call writes a section per picked realm (what it
    teaches, key points with their quote and time, one thing to try, 3 quest
    ideas) plus a "how it's made" block only for Creator/Producer/Hustler.
    One call whatever the number of realms (Alex: one call per input, never
    one per realm). parse_insights() then fills the long-standing keys
    (key_learnings, production_techniques, what_to_steal, quests...) from these
    sections in code, so every reader in the app keeps working."""

    realms = clean_realms(realms)
    lenses = load_lenses()
    names = ", ".join((lenses.get(k) or {}).get("name") or k.title() for k in realms)
    duration_mins = int((meta.get("duration") or 0) // 60)
    made = [k for k in realms if k in MADE_REALMS]
    point = '{"text": "<the point, with the real numbers/steps/names>", "quote": "<the exact words from the transcript that say it>", "at": "<m:ss of that line>", "also": ["<another picked realm key it also serves, or leave empty>"]}'
    quest = '{"name": "<short quest name>", "xp": <10-100>, "type": "daily|weekly", "action": "<the specific thing to do>"}'
    realm_entry = ",\n    ".join(
        f'"{k}": {{"score": <1-10>, "why": "<one line>", "teaches": "<2 lines: what it teaches for this realm, or exactly: nothing for this realm>", '
        f'"points": [{point}, ...3 to 7], "action": "<one thing to try>", "quests": [{quest}, {quest}, {quest}]}}'
        for k in realms)
    made_part = ""
    made_rule = "Do NOT write anything about how the video is made, edited, hooked or marketed."
    if made:
        made_part = (',\n  "how_made": {"summary": "<2 lines: how this video/content is made and why it works>", '
                     f'"points": [{point}, ...up to 5], "steal": ["<a specific idea to reuse in Alex\'s own content>", "..."], '
                     '"avoid": ["<something not to copy>", "..."]}')
        made_rule = ("Only the \"how_made\" block may talk about how the video is made (hook, editing, format, "
                     "on-screen tools, why it performs) - keep that out of the realm sections.")

    prompt = f"""You are the RPGACE Oracle. Alex sent this {meta['platform']} video to learn from it in these realms: {names}.
Alex is a UK music producer, but judge each realm ONLY by its own lens, never by music or content-creation value
unless that realm is about music or content.

Realm lenses:
{lens_block(realms, lenses)}

Rules:
- For each realm, say what the video actually TEACHES in that realm: the real protocol, recipe, steps, numbers,
  amounts, times, names. Specific beats general - "proof 45 min at 27C" not "proofing matters".
- Every point must come from the video. Its "quote" is the exact words copied from the transcript line that says it
  (copy, never paraphrase), and "at" is that line's [m:ss] time without brackets. No quote, no point - do not add
  general knowledge the video does not say. Something only shown on screen (never said) is not a point: every
  quote is checked word for word against the transcript and points without a real quote are thrown out.
- If a realm gets little or nothing from this video, say so: score 1-2, "teaches": "nothing for this realm",
  empty "points", and no padding. Fewer, real points beat many vague ones.
- A point that serves two picked realms is written ONCE, under the realm it serves best, with the other realm key
  in "also".
- Score each realm 1-10 by how much this is worth to Alex in that realm (its "score means"). Do not mark it down
  for a small audience or low polish.
- {made_rule}
- "action": one concrete thing to try this week. "quests": 3 different quest ideas for that realm.

Return ONLY valid JSON (no fences, no explanation).

VIDEO: "{meta['title']}" by {meta['uploader']} ({meta['platform']}, {duration_mins} min)
Description: {meta['description'][:300]}

VISUAL ANALYSIS (frames spread over the whole video, each starting with its time):
{visual_analysis[:4000]}

TRANSCRIPT (the whole video; each line starts with its [m:ss] time; long videos have filler lines removed):
{transcript}

Return this exact JSON structure:
{{
  "realms": {{
    {realm_entry}
  }},
  "verdict_summary": "<one honest sentence: what this video is worth to Alex>",
  "watchlist_reason": "<why worth revisiting, or null>",
  "encyclopedia_entry": {{"title": "<title for the article>", "summary": "<2 sentences>", "tags": ["<tag>", "<tag>", "<tag>"]}}{made_part}
}}"""

    log("Generating Oracle insights (" + names + ")...", GOLD)
    # VW-2: up to 4 realm sections with quotes - 6000 is a ceiling billed on
    # what is written; the whole transcript makes this call longer (3 min).
    raw = call_claude([{"role": "user", "content": prompt}], "", 6000, timeout=180)
    # VW-3: quotes are checked against the whole original transcript
    return parse_insights(raw, realms, full_transcript if full_transcript is not None else transcript)


NOTHING = "nothing for this realm"


def _clean_point(p, realms) -> dict:
    if isinstance(p, str):
        p = {"text": p}
    if not isinstance(p, dict) or not str(p.get("text") or "").strip():
        return None
    at = str(p.get("at") or "").strip().strip("[]")
    if not re.fullmatch(r"\d+:\d{2}(:\d{2})?", at):
        at = ""
    also = [k for k in (p.get("also") or []) if k in realms] if isinstance(p.get("also"), list) else []
    return {"text": str(p["text"]).strip()[:400], "quote": str(p.get("quote") or "").strip()[:400],
            "at": at, "also": also}


# ── VW-3: PROOF IN CODE ───────────────────────────────────────────────────────
# Alex: "drop any point with no quote". Every point's quote is looked for in the
# ORIGINAL full transcript (never the condensed one). Not found = point dropped.
# Small differences (punctuation, a word Whisper heard differently) still match.
# The time comes from the line the quote was found in, not from the model.
MIN_QUOTE_WORDS = 4
QUOTE_MATCH = 0.85


def _norm_words(text: str) -> list:
    return re.sub(r"[^\w\s']", " ", (text or "").lower()).replace("'", "").split()


def transcript_words(timed: str) -> tuple:
    """(words, times): every word of the timed transcript with its line's [m:ss]."""
    words, times = [], []
    for line in (timed or "").splitlines():
        m = re.match(r"\s*\[(\d+:\d{2}(?::\d{2})?)\]\s*(.*)", line)
        at, text = (m.group(1), m.group(2)) if m else ("", line)
        for w in _norm_words(text):
            words.append(w)
            times.append(at)
    return words, times


def find_quote(quote: str, words: list, times: list):
    """Where the quote is said: (time, ratio), or None. Exact match first, then
    the best same-length stretch of the transcript sharing most of its words."""
    from difflib import SequenceMatcher
    q = _norm_words(quote)
    n = len(q)
    if n < MIN_QUOTE_WORDS or not words:
        return None
    for i in range(len(words) - n + 1):
        if words[i] == q[0] and words[i:i + n] == q:
            return times[i], 1.0
    joined, qset, best = " ".join(q), set(q), None
    for i in range(max(1, len(words) - n + 1)):
        win = words[i:i + n]
        if len(qset.intersection(win)) * 2 < n:
            continue
        r = SequenceMatcher(None, joined, " ".join(win)).ratio()
        if r >= QUOTE_MATCH and (best is None or r > best[1]):
            best = (times[i], r)
    return best


def verify_points(points: list, words: list, times: list) -> tuple:
    """(kept, dropped_count). Kept points take the transcript's own time."""
    kept, dropped = [], 0
    for p in points:
        hit = find_quote(p.get("quote", ""), words, times)
        if not hit:
            dropped += 1
            continue
        p["at"] = hit[0]
        kept.append(p)
    return kept, dropped


def parse_insights(raw: str, realms: list, source: str = None) -> dict:
    """Fence-tolerant JSON parse + clean-up done in code, never trusted to the
    model: unknown realms dropped, scores clamped 1-10, 3-7 points (fewer for a
    thin video), 3 quests, a point listed under two realms kept once (under the
    higher-scoring one, tagged with the other), "how_made" kept only for
    Creator/Producer/Hustler. Then the long-standing keys are filled from the
    realm sections so the app's ~30 readers keep working (VW-2)."""
    raw = raw.replace("```json", "").replace("```", "").strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise RuntimeError("Claude returned non-JSON: " + raw[:200])
    ins = json.loads(raw[start:end])

    src = ins.get("realms") if isinstance(ins.get("realms"), dict) else (ins.get("realm_scores") or {})
    words, times = transcript_words(source) if source is not None else ([], [])
    sections = {}
    for k in realms:
        v = src.get(k)
        if not isinstance(v, dict):
            continue
        try:
            sc = max(1, min(10, int(round(float(v.get("score", 0))))))
        except (TypeError, ValueError):
            continue
        pts = [x for x in (_clean_point(p, realms) for p in (v.get("points") or [])) if x][:7]
        teaches = str(v.get("teaches") or "").strip()[:500]
        dropped = 0
        if source is not None:
            pts, dropped = verify_points(pts, words, times)
            if not pts:
                teaches = NOTHING   # what it "teaches" had no proof left
        if not pts and not teaches:
            teaches = NOTHING
        qs = []
        for q in (v.get("quests") or [])[:3]:
            if isinstance(q, dict) and str(q.get("name") or "").strip():
                try:
                    xp = int(q.get("xp") or 50)
                except (TypeError, ValueError):
                    xp = 50
                qs.append({"name": str(q["name"])[:120], "realm": k, "xp": max(10, min(100, xp)),
                           "type": "daily" if q.get("type") == "daily" else "weekly",
                           "category": k, "action": str(q.get("action") or "")[:400]})
        sections[k] = {"score": sc, "why": str(v.get("why") or "")[:300], "teaches": teaches,
                       "points": pts, "action": str(v.get("action") or "")[:400], "quests": qs,
                       "dropped": dropped}

    # one point, one place: same text under two realms -> keep it under the
    # higher score, tag it with the other realm
    seen = {}
    for k in sorted(sections, key=lambda r: -sections[r]["score"]):
        keep = []
        for p in sections[k]["points"]:
            key = re.sub(r"\W+", " ", p["text"].lower()).strip()
            if key in seen:
                first = seen[key]
                if k not in first["also"]:
                    first["also"].append(k)
                continue
            seen[key] = p
            p["also"] = [r for r in p["also"] if r != k]
            keep.append(p)
        sections[k]["points"] = keep
    # a realm left empty after that says where its shared points went
    for k, sec in sections.items():
        if not sec["points"] and not sec["teaches"]:
            homes = [r for r, o in sections.items() if r != k and any(k in p["also"] for p in o["points"])]
            sec["teaches"] = NOTHING + (" beyond the points shared under " + ", ".join(h.title() for h in homes) if homes else "")

    made = ins.get("how_made") if isinstance(ins.get("how_made"), dict) else None
    if made and any(k in MADE_REALMS for k in realms):
        made = {"summary": str(made.get("summary") or "")[:500],
                "points": [x for x in (_clean_point(p, realms) for p in (made.get("points") or [])) if x][:5],
                "steal": [str(s)[:300] for s in (made.get("steal") or []) if str(s).strip()][:5],
                "avoid": [str(s)[:300] for s in (made.get("avoid") or []) if str(s).strip()][:4],
                "dropped": 0}
        if source is not None:
            made["points"], made["dropped"] = verify_points(made["points"], words, times)
    else:
        made = None

    enc = ins.get("encyclopedia_entry") if isinstance(ins.get("encyclopedia_entry"), dict) else {}
    all_points = [p for k in realms if k in sections for p in sections[k]["points"]]
    out = {
        "realm_sections": sections,
        "how_made": made,
        "realms": realms,
        "quotes_checked": source is not None,
        "verdict_summary": str(ins.get("verdict_summary") or "")[:300],
        "watchlist_reason": ins.get("watchlist_reason") or None,
        # long-standing keys, filled from the sections (readers unchanged)
        "realm_scores": {k: {"score": s["score"], "why": s["why"], "points": [p["text"] for p in s["points"][:3]]}
                         for k, s in sections.items()},
        "production_techniques": [p["text"] for p in (made or {}).get("points", [])],
        "content_strategy_insights": [made["summary"]] if made and made["summary"] else [],
        "what_to_steal": (made or {}).get("steal", []),
        "what_to_avoid": (made or {}).get("avoid", []),
        "quests": [q for k in realms if k in sections for q in sections[k]["quests"]],
        "encyclopedia_entry": {
            "title": str(enc.get("title") or "")[:200],
            "summary": str(enc.get("summary") or "")[:600],
            "key_learnings": [p["text"] for p in all_points],
            "tags": [str(t) for t in (enc.get("tags") or [])][:6],
        },
    }
    out["verdict_score"] = max((s["score"] for s in sections.values()), default=0)
    out["add_to_watchlist"] = out["verdict_score"] >= SCORE_THRESHOLD
    return out


def realm_label(k: str, lenses: dict) -> str:
    l = lenses.get(k) or {}
    return ((l.get("icon") + " ") if l.get("icon") else "") + (l.get("name") or k.title())


def point_line(p: dict, lenses: dict) -> str:
    also = (" (also " + ", ".join(realm_label(r, lenses) for r in p["also"]) + ")") if p.get("also") else ""
    quote = f' — "{p["quote"]}"' if p.get("quote") else ""
    at = f' [{p["at"]}]' if p.get("at") else ""
    return f"{p['text']}{also}{quote}{at}"


# (VW-5: the Encyclopedia article is built by the app - encyclopediaPosts.realmIdeas)


# ── WATCHLIST ─────────────────────────────────────────────────────────────────
def add_to_watchlist(url: str, meta: dict, insights: dict):
    watchlist = load_json(WATCHLIST_FILE, [])
    entry = {
        "url":       url,
        "title":     meta["title"],
        "creator":   meta["uploader"],
        "platform":  meta["platform"],
        "score":     insights["verdict_score"],
        "reason":    insights.get("watchlist_reason",""),
        "added":     datetime.now().isoformat(),
        "tags":      insights.get("encyclopedia_entry",{}).get("tags",[])
    }
    # Avoid duplicates
    watchlist = [w for w in watchlist if w.get("url") != url]
    watchlist.insert(0, entry)
    watchlist = watchlist[:100]  # cap at 100
    save_json(WATCHLIST_FILE, watchlist)
    log(f"Added to watchlist: {meta['title'][:50]}", PURPLE)

def save_insight(url: str, meta: dict, insights: dict, transcript: str):
    all_insights = load_json(INSIGHTS_FILE, [])
    entry = {
        "url":       url,
        "title":     meta["title"],
        "creator":   meta["uploader"],
        "platform":  meta["platform"],
        "score":     insights["verdict_score"],
        "date":      datetime.now().isoformat(),
        "insights":  insights,
        "transcript_snippet": transcript[:500]
    }
    all_insights.insert(0, entry)
    all_insights = all_insights[:200]
    save_json(INSIGHTS_FILE, all_insights)

def format_output(meta: dict, insights: dict) -> str:
    """The report printed in the laptop window and saved to strategy/ (VW-2:
    one section per picked realm, "how it's made" only when it was asked for)."""
    lenses = load_lenses()
    score = insights.get("verdict_score", 0)
    score_bar = "█" * score + "░" * (10 - score)
    watchlist = "✅ ADDED TO WATCHLIST" if insights.get("add_to_watchlist") else ""
    enc = insights.get("encyclopedia_entry", {})
    rule = "━" * 62
    out = ["", "╔" + "═" * 62 + "╗", "║  RPGACE ORACLE — Videoworm report" + " " * 28 + "║", "╚" + "═" * 62 + "╝", "",
           f"📹  {meta['title'][:60]}", f"👤  {meta['uploader']} · {meta['platform']}", f"🔗  {meta['url'][:60]}", "",
           f"VERDICT: {score}/10  [{score_bar}]  {watchlist}", f'"{insights.get("verdict_summary", "")}"', ""]
    for k, sec in (insights.get("realm_sections") or {}).items():
        why = f" — {sec['why']}" if sec.get("why") else ""
        out += [rule, f"{realm_label(k, lenses).upper()}  {sec['score']}/10{why}", ""]
        if sec.get("teaches"):
            out += [f"  {sec['teaches']}", ""]
        out += [f"  • {point_line(p, lenses)}" for p in sec.get("points", [])]
        if sec.get("dropped"):
            out.append(f"  ({sec['dropped']} more thrown out: their quote isn't in the video)")
        if sec.get("action"):
            out += ["", f"  ▶ Try this: {sec['action']}"]
        if sec.get("quests"):
            out += ["", "  Quest ideas (add one in the app):"]
            out += [f"    {i+1}. {q['name']} ({q['xp']} XP, {q['type']}) — {q['action']}" for i, q in enumerate(sec["quests"])]
        out.append("")
    made = insights.get("how_made")
    if made:
        out += [rule, "🎬  HOW IT'S MADE", ""]
        if made.get("summary"):
            out += [f"  {made['summary']}", ""]
        out += [f"  • {point_line(p, lenses)}" for p in made.get("points", [])]
        out += [f"  → Reuse: {s_}" for s_ in made.get("steal", [])]
        out += [f"  ✗ Don't copy: {s_}" for s_ in made.get("avoid", [])]
        out.append("")
    out += [rule, f"📖  {enc.get('title', '')}", enc.get("summary", ""), "",
            f"Tags: {', '.join(enc.get('tags', []))}", rule,
            f"Analyser {ANALYSER_VERSION} · {datetime.now().strftime('%d %b %Y %H:%M')}",
            "Video deleted after analysis · Insights saved to Videoworm and the Encyclopedia", ""]
    return "\n".join(out)

# ── MAIN PIPELINE ─────────────────────────────────────────────────────────────
def process_url(url: str, realms=None):
    """Full pipeline: download → transcribe → analyse → report → delete.
    realms: the realm keys Alex picked for this link (RI-4); None = Producer."""
    print()
    log(f"Processing: {url[:60]}", GOLD)

    with tempfile.TemporaryDirectory(prefix="rpgace_intel_") as tmp:
        tmp_path = Path(tmp)
        video_file = None

        try:
            # 1 — Metadata (fast, no download needed)
            meta = get_metadata(url)
            duration = meta.get("duration") or 0
            log(f"'{meta['title'][:50]}' by {meta['uploader']} ({int(duration//60)}m)", CYAN)

            if duration > 3600:
                log("Video over 60 mins — capping analysis at first 60 mins", DIM)

            # 2 — Download
            video_file = download_video(url, tmp_path)

            # 3 — Transcribe audio
            transcript, timed = transcribe_audio(video_file)

            # Save transcript to transcripts folder (timed version, VW-1)
            ts_file = HOME/"transcripts"/f"{meta['id']}_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"
            ts_file.write_text(timed, encoding="utf-8")

            # 4 — Extract frames (spread over the whole video)
            frames = extract_frames(video_file, int(duration), tmp_path)

            # 5 — Visual analysis (follows the picked realms)
            visual_analysis = analyse_frames(frames, meta, realms) if frames else "No frames extracted."

            # 6 — Oracle insights on the whole (condensed if long) timed transcript
            insights = generate_oracle_insights(meta, condense_transcript(timed, meta), visual_analysis, realms,
                                                full_transcript=timed)

            # 7 — Delete video (frames are in temp dir, auto-deleted)
            if video_file and video_file.exists():
                video_file.unlink()
                log("Video deleted ✓", DIM)

            # 8 — Format and display
            report = format_output(meta, insights)
            print(f"{GOLD}{report}{RESET}")


            # 9 — Save insight record locally
            save_insight(url, meta, insights, transcript)

            # 10 — Push to Supabase directly (inline — no separate module)
            score = insights.get("verdict_score", 0)
            log("Pushing to Supabase...", CYAN)
            try:
                import urllib.request, urllib.error, ssl
                SB_URL = "https://gripopghczmrbrhqtqbm.supabase.co"
                SB_KEY = "sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf"
                SB_HEADERS = {
                    "apikey": SB_KEY,
                    "Authorization": f"Bearer {SB_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                }
                # Aug 27 2026 fix: the old "Windows SSL fix" here disabled
                # cert verification entirely (ssl.CERT_NONE) - confirmed via
                # its own comment to be a workaround for Windows Python's
                # missing system cert store, not a deliberate tradeoff. The
                # real fix is certifi's own bundled CA root store (auto-
                # installed on first run, same pattern already used for
                # yt-dlp/whisper below), not disabling verification.
                try:
                    import certifi
                except ImportError:
                    log("Installing certifi (for real TLS certificate verification)...", CYAN)
                    subprocess.run([sys.executable, "-m", "pip", "install", "certifi", "--quiet"])
                    import certifi
                ssl_ctx = ssl.create_default_context(cafile=certifi.where())

                def sb_post(table, data):
                    payload = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
                    req = urllib.request.Request(
                        f"{SB_URL}/rest/v1/{table}",
                        data=payload, headers=SB_HEADERS, method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=20, context=ssl_ctx) as r:
                        return r.status

                # VW-6: a re-run replaces the video's old report (intel_reports
                # is anon-writable). The app then sees a report newer than the
                # article and rebuilds the article + idea cards
                # (encyclopediaPosts._replaceOld).
                if meta.get("url"):
                    try:  # never let the clear-out block saving the new report
                        from urllib.parse import quote
                        req = urllib.request.Request(
                            f"{SB_URL}/rest/v1/intel_reports?url=eq.{quote(meta['url'], safe='')}",
                            headers=SB_HEADERS, method="DELETE")
                        with urllib.request.urlopen(req, timeout=20, context=ssl_ctx) as r:
                            log(f"Old report for this video cleared (status {r.status})", DIM)
                    except Exception as de:
                        log(f"Couldn't clear the old report ({de}) - saving the new one anyway", RED)

                # Push intel report
                status = sb_post("intel_reports", {
                    "url":               meta.get("url",""),
                    "title":             meta.get("title",""),
                    "creator":           meta.get("uploader",""),
                    "platform":          meta.get("platform",""),
                    "score":             score,
                    "insights":          insights,
                    "transcript_snippet": transcript[:500],
                    "added_to_watchlist": bool(insights.get("add_to_watchlist")),
                    # RI-4: the realms it was read through + a score per realm
                    "realms":            insights.get("realms") or [],
                    "realm_scores":      insights.get("realm_scores") or {},
                    "analyser_version":  ANALYSER_VERSION
                })
                log(f"Intel report pushed to Supabase (status {status})", GREEN)

                # VW-5 (Oct 20 2026): no direct Encyclopedia write from here any
                # more. encyclopedia has been app-write-only since the July 24 RLS
                # flip, so this anon-key POST always failed - and the failure
                # jumped past the watchlist push below. The app's
                # encyclopediaPosts.ensureArticles is the one pipeline (rule 8):
                # it builds the article AND its idea cards from this report.
                enc = insights.get("encyclopedia_entry", {})

                # Push watchlist if high score
                if insights.get("add_to_watchlist"):
                    try:
                        wl_headers = {**SB_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
                        wl_data = json.dumps({
                            "url":    meta.get("url",""),
                            "title":  meta.get("title",""),
                            "creator": meta.get("uploader",""),
                            "platform": meta.get("platform",""),
                            "score":  score,
                            "reason": insights.get("watchlist_reason",""),
                            "tags":   enc.get("tags",[])
                        }, ensure_ascii=False).encode("utf-8")
                        req = urllib.request.Request(
                            f"{SB_URL}/rest/v1/intel_watchlist",
                            data=wl_data, headers=wl_headers, method="POST"
                        )
                        with urllib.request.urlopen(req, timeout=20) as r:
                            log(f"Watchlist pushed (status {r.status})", GREEN)
                    except Exception as we:
                        log(f"Watchlist push error: {we}", DIM)

            except urllib.error.HTTPError as he:
                body = he.read().decode("utf-8")
                log(f"Supabase HTTP error {he.code}: {body[:300]}", RED)
            except Exception as se:
                log(f"Supabase push error: {se}", RED)
                log("Report saved locally — use Manual Import in RPGACE as fallback", DIM)

            # 11 — Watchlist locally
            if insights.get("add_to_watchlist"):
                add_to_watchlist(url, meta, insights)

            # 12 — Save report files
            score = insights.get("verdict_score",0)
            safe_title = "".join(c for c in meta['title'] if c.isalnum() or c in " -_")[:40]
            base_name = f"intel_{score}pts_{safe_title}_{datetime.now().strftime('%Y%m%d_%H%M')}"

            report_path = HOME/"strategy"/(base_name+".txt")
            report_path.write_text(report, encoding="utf-8")
            log(f"Report saved: {report_path.name}", GREEN)

            # JSON export for RPGACE import
            json_export = {
                "url": url, "title": meta["title"], "creator": meta["uploader"],
                "platform": meta["platform"], "score": score,
                "date": datetime.now().isoformat(),
                "insights": insights,
                "transcript_snippet": transcript[:500]
            }
            json_path = HOME/"strategy"/(base_name+".json")
            json_path.write_text(json.dumps(json_export, indent=2, ensure_ascii=False), encoding="utf-8")
            log(f"JSON saved: {json_path.name} (import into RPGACE)", GREEN)

            # 12 — Open report on Windows
            if os.name == "nt":
                os.startfile(str(report_path))
            log(f"Copy JSON to RPGACE: {json_path.name}", CYAN)

            return insights

        except Exception as e:
            # Always clean up video even on error
            if video_file and video_file.exists():
                video_file.unlink()
                log("Video cleaned up after error", DIM)
            log(f"Error: {e}", RED)
            return None

def show_watchlist():
    """Display the current watchlist."""
    watchlist = load_json(WATCHLIST_FILE, [])
    if not watchlist:
        print(f"\n  {DIM}Watchlist is empty — process some videos first.{RESET}\n")
        return
    print(f"\n{GOLD}  ╔═══ WATCHLIST ({len(watchlist)} videos) ═══╗{RESET}")
    for i, w in enumerate(watchlist, 1):
        score_bar = "█" * w['score'] + "░" * (10-w['score'])
        print(f"  {GOLD}[{i:02d}]{RESET} {w['score']}/10 [{score_bar}]")
        print(f"       {w['title'][:55]}")
        print(f"       {DIM}{w['creator']} · {w['platform']} · {w.get('reason','')[:50]}{RESET}")
        print(f"       {CYAN}{w['url'][:55]}{RESET}\n")

def batch_process(file_path: str):
    """Process a list of URLs from a text file."""
    urls = [l.strip() for l in Path(file_path).read_text().splitlines() if l.strip() and not l.startswith("#")]
    log(f"Batch: {len(urls)} URLs to process", CYAN)
    results = []
    for i, url in enumerate(urls, 1):
        log(f"[{i}/{len(urls)}] Processing...", GOLD)
        result = process_url(url)
        results.append(result)
        if i < len(urls):
            log("Waiting 5s before next download...", DIM)
            time.sleep(5)
    log(f"Batch complete — {sum(1 for r in results if r)} succeeded", GREEN)

# ── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    banner()
    ensure_dirs()

    # Check API key
    global ANTHROPIC_KEY
    if not ANTHROPIC_KEY:
        key_file = HOME / ".anthropic_key"
        if key_file.exists():
            ANTHROPIC_KEY = key_file.read_text().strip()
        else:
            print(f"  {CYAN}Enter your Anthropic API key (saved locally for future use):{RESET}")
            print(f"  {DIM}Get it from: console.anthropic.com{RESET}")
            key = input("  API Key: ").strip()
            if key:
                ANTHROPIC_KEY = key
                key_file.write_text(key)
                print(f"  {GREEN}Key saved to {key_file}{RESET}")
            else:
                print(f"  {RED}No key provided — exiting.{RESET}")
                sys.exit(1)

    check_ytdlp()

    global WHISPER_MODEL

    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", help="URL to process")
    parser.add_argument("--batch", help="Text file with one URL per line")
    parser.add_argument("--watchlist", action="store_true", help="Show watchlist")
    parser.add_argument("--model", default=WHISPER_MODEL, help="Whisper model")
    args = parser.parse_args()

    WHISPER_MODEL = args.model

    if args.watchlist:
        show_watchlist()
    elif args.batch:
        batch_process(args.batch)
    elif args.url:
        process_url(args.url)
    else:
        # Interactive mode
        print(f"  {GOLD}Paste any YouTube, Instagram, TikTok or X URL:{RESET}")
        print(f"  {DIM}Or type 'watchlist' to see saved videos | 'quit' to exit{RESET}\n")
        while True:
            try:
                url = input(f"  {CYAN}URL >{RESET} ").strip()
                if not url: continue
                if url.lower() in ("quit","exit","q"): break
                if url.lower() in ("watchlist","w"): show_watchlist(); continue
                if url.startswith("http"):
                    process_url(url)
                else:
                    print(f"  {RED}Please enter a valid URL starting with http{RESET}")
            except KeyboardInterrupt:
                print(f"\n  {DIM}Goodbye.{RESET}\n")
                break

if __name__ == "__main__":
    main()
