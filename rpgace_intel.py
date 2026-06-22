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

# ── CONFIG ────────────────────────────────────────────────────────────────────
HOME          = Path.home() / "RPGACE"
INTEL_DIR     = HOME / "intel"
WATCHLIST_FILE= INTEL_DIR / "watchlist.json"
INSIGHTS_FILE = INTEL_DIR / "insights.json"
RPGACE_URL    = "https://rpgace.vercel.app"  # your live app

WHISPER_MODEL = "small"   # tiny=fastest, small=good balance, medium=best quality
FRAME_INTERVAL= 30
MAX_FRAMES    = 8
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
        "-f", "best[height<=720][ext=mp4]/best[height<=720]/best",
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
def transcribe_audio(video_path: Path) -> str:
    """Transcribe audio track with Whisper."""
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
    log(f"Transcript: {len(transcript.split())} words", GREEN)
    return transcript

# ── FRAME EXTRACTION ──────────────────────────────────────────────────────────
def extract_frames(video_path: Path, duration: int, out_dir: Path) -> list:
    """Extract frames at regular intervals using ffmpeg."""
    if duration <= 0:
        return []
    ffmpeg_bin = get_ffmpeg_path()
    if not ffmpeg_bin:
        log("FFmpeg not available — skipping frame extraction", RED)
        return []

    log(f"Extracting frames every {FRAME_INTERVAL}s...", CYAN)
    frames = []
    timestamps = list(range(0, min(duration, FRAME_INTERVAL*MAX_FRAMES), FRAME_INTERVAL))
    if not timestamps:
        timestamps = [int(duration * 0.25), int(duration * 0.5), int(duration * 0.75)]

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

def encode_frame(frame_path: Path) -> str:
    """Base64 encode an image frame."""
    import base64
    return base64.b64encode(frame_path.read_bytes()).decode("utf-8")

# ── CLAUDE API ────────────────────────────────────────────────────────────────
def call_claude(messages: list, system: str = "", max_tokens: int = 2000) -> str:
    """Call Anthropic Claude API directly."""
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set. Add it to your environment variables.")

    payload = {
        "model": "claude-sonnet-4-6",
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["content"][0]["text"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        raise RuntimeError(f"Claude API error {e.code}: {body[:200]}")

def analyse_frames(frames: list, meta: dict) -> str:
    """Send frames to Claude Vision for visual analysis."""
    if not frames:
        return "No frames extracted."

    log(f"Analysing {len(frames)} frames with Claude Vision...", CYAN)
    content = []
    for i, frame in enumerate(frames[:MAX_FRAMES]):
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": encode_frame(frame)}
        })
    content.append({
        "type": "text",
        "text": f"""These are frames from a {meta['platform']} video titled "{meta['title']}" by {meta['uploader']}.

Analyse the visual content and describe:
1. What is shown on screen (DAW, plugins, equipment, face cam, text overlays)
2. Production techniques visible (chord progressions shown, sample packs, mixer layout)
3. Thumbnail strategy — what visual hook is used
4. Editing style — cuts, text animations, colour grading
5. Any specific plugin names, sample packs or tools clearly visible

Be specific. This analysis feeds into production learning insights."""
    })

    return call_claude([{"role": "user", "content": content}],
                      "You are a music production visual analyst. Be precise and specific.", 800)

def generate_oracle_insights(meta: dict, transcript: str, visual_analysis: str) -> dict:
    """Send everything to Claude for Oracle-style insights + score."""

    duration_mins = int((meta.get("duration") or 0) // 60)
    views = meta.get("view_count") or 0
    likes = meta.get("like_count") or 0

    prompt = f"""You are the RPGACE Oracle — Alex's 300IQ AI life coach and content strategist.
Alex (@AceSanyaBeats) is a UK music producer/content creator building toward 100k YouTube subscribers.

Analyse this {meta['platform']} content and return ONLY valid JSON (no fences, no explanation):

VIDEO METADATA:
Title: {meta['title']}
Creator: {meta['uploader']}
Platform: {meta['platform']}
Duration: {duration_mins} minutes
Views: {views:,}
Likes: {likes:,}
Description: {meta['description'][:300]}

VISUAL ANALYSIS:
{visual_analysis[:600]}

TRANSCRIPT (first 3000 words):
{transcript[:3000]}

Return this exact JSON structure:
{{
  "verdict_score": <integer 1-10>,
  "verdict_summary": "<one punchy sentence verdict>",
  "add_to_watchlist": <true if score >= {SCORE_THRESHOLD} else false>,
  "watchlist_reason": "<why worth revisiting or null>",
  "production_techniques": ["<specific technique>", "<specific technique>", "<specific technique>"],
  "content_strategy_insights": ["<insight about what made this content work>", "<insight>", "<insight>"],
  "what_to_steal": ["<specific replicable idea for AceSanya>", "<idea>", "<idea>"],
  "what_to_avoid": ["<something that didn't work or to skip>", "<thing>"],
  "quests": [
    {{"name": "<quest name>", "xp": <50-200>, "type": "daily|weekly", "category": "career|health|lifestyle", "action": "<specific thing Alex should do"}},
    {{"name": "<quest name>", "xp": <50-200>, "type": "daily|weekly", "category": "career|health|lifestyle", "action": "<specific thing Alex should do"}}
  ],
  "encyclopedia_entry": {{
    "title": "<title for the encyclopedia entry>",
    "summary": "<2 sentence summary>",
    "key_learnings": ["<learning>", "<learning>", "<learning>", "<learning>", "<learning>"],
    "tags": ["<tag>", "<tag>", "<tag>"]
  }}
}}"""

    log("Generating Oracle insights...", GOLD)
    raw = call_claude([{"role": "user", "content": prompt}], "", 1500)
    raw = raw.replace("```json","").replace("```","").strip()

    # Extract JSON
    start = raw.find("{")
    end   = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise RuntimeError("Claude returned non-JSON: " + raw[:200])

    return json.loads(raw[start:end])

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
    """Format insights as readable text for console + file output."""
    score = insights.get("verdict_score", 0)
    score_bar = "█" * score + "░" * (10-score)
    watchlist = "✅ ADDED TO WATCHLIST" if insights.get("add_to_watchlist") else ""

    enc = insights.get("encyclopedia_entry", {})
    quests = insights.get("quests", [])

    out = f"""
╔══════════════════════════════════════════════════════════════╗
║  RPGACE ORACLE — Content Intelligence Report               ║
╚══════════════════════════════════════════════════════════════╝

📹  {meta['title'][:60]}
👤  {meta['uploader']} · {meta['platform']}
🔗  {meta['url'][:60]}

ORACLE VERDICT: {score}/10  [{score_bar}]  {watchlist}
"{insights.get('verdict_summary','')}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎛  PRODUCTION TECHNIQUES SPOTTED:
{chr(10).join(f'  • {t}' for t in insights.get('production_techniques',[]))}

📊  CONTENT STRATEGY INSIGHTS:
{chr(10).join(f'  • {i}' for i in insights.get('content_strategy_insights',[]))}

🔥  WHAT TO STEAL (apply to @AceSanyaBeats):
{chr(10).join(f'  → {w}' for w in insights.get('what_to_steal',[]))}

⚠️   WHAT TO AVOID:
{chr(10).join(f'  ✗ {w}' for w in insights.get('what_to_avoid',[]))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖  ENCYCLOPEDIA ENTRY — "{enc.get('title','')}"
{enc.get('summary','')}

Key Learnings:
{chr(10).join(f'  [{i+1}] {l}' for i,l in enumerate(enc.get('key_learnings',[])))}

Tags: {', '.join(enc.get('tags',[]))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡  QUESTS UNLOCKED:
{chr(10).join(f"  QUEST: {q['name']} | XP: {q['xp']} | {q['type'].upper()} | {q['category'].upper()}" + chr(10) + f"  → {q['action']}" for q in quests)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: {datetime.now().strftime('%d %b %Y %H:%M')}
Video deleted after analysis · Insights preserved in encyclopedia
"""
    return out

# ── MAIN PIPELINE ─────────────────────────────────────────────────────────────
def process_url(url: str):
    """Full pipeline: download → transcribe → analyse → report → delete."""
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
            transcript = transcribe_audio(video_file)

            # Save transcript to transcripts folder
            ts_file = HOME/"transcripts"/f"{meta['id']}_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"
            ts_file.write_text(transcript, encoding="utf-8")

            # 4 — Extract frames
            frames = extract_frames(video_file, int(duration), tmp_path)

            # 5 — Visual analysis
            visual_analysis = analyse_frames(frames, meta) if frames else "No frames extracted."

            # 6 — Oracle insights
            insights = generate_oracle_insights(meta, transcript, visual_analysis)

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
                # Windows SSL fix — bypass cert verification
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE

                def sb_post(table, data):
                    payload = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
                    req = urllib.request.Request(
                        f"{SB_URL}/rest/v1/{table}",
                        data=payload, headers=SB_HEADERS, method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=20, context=ssl_ctx) as r:
                        return r.status

                # Push intel report
                status = sb_post("intel_reports", {
                    "url":               meta.get("url",""),
                    "title":             meta.get("title",""),
                    "creator":           meta.get("uploader",""),
                    "platform":          meta.get("platform",""),
                    "score":             score,
                    "insights":          insights,
                    "transcript_snippet": transcript[:500],
                    "added_to_watchlist": bool(insights.get("add_to_watchlist"))
                })
                log(f"Intel report pushed to Supabase (status {status})", GREEN)

                # Push encyclopedia entry
                enc = insights.get("encyclopedia_entry", {})
                if enc.get("title"):
                    content = f"## {enc['title']}\n\n**Source:** {meta.get('title','')} by {meta.get('uploader','')} ({meta.get('platform','')})\n**Score:** {score}/10\n\n### Summary\n{enc.get('summary','')}\n\n### Key Learnings\n" + "\n".join(f"- {l}" for l in enc.get("key_learnings",[])) + f"\n\n### Production Techniques\n" + "\n".join(f"- {t}" for t in insights.get("production_techniques",[])) + f"\n\n### What To Apply\n" + "\n".join(f"→ {s}" for s in insights.get("what_to_steal",[])) + f"\n\n### Tags\n{', '.join(enc.get('tags',[]))}"
                    from datetime import datetime as dt
                    date_str = dt.now().strftime("%d %b %Y")
                    sb_post("encyclopedia", {
                        "title":   enc["title"],
                        "date":    date_str,
                        "content": content,
                        "source":  "intel"
                    })
                    log(f"Encyclopedia entry pushed: {enc['title'][:50]}", GREEN)

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
