#!/usr/bin/env python3
"""
RPGACE Local Intel Server v3
Uses Supabase job queue AND serves local JSON files as fallback.
RPGACE polls this server every 10s for new reports.
"""
import os, json, ssl, time, sys, threading
from pathlib import Path
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request, urllib.error

HOME      = Path.home() / "RPGACE"
INTEL_DIR = HOME / "intel"
STRATEGY  = HOME / "strategy"
PORT      = 7842

SB_URL = "https://gripopghczmrbrhqtqbm.supabase.co"
SB_KEY = "sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf"
SB_HEADERS = {
    "apikey": SB_KEY,
    "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE

POLL_INTERVAL = 10
CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
}

def log(msg, color=""):
    print(f"  [{datetime.now().strftime('%H:%M:%S')}] {msg}")

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default
    except: return default

def sb_post(table, data):
    payload = json.dumps(data, ensure_ascii=False, default=str).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}",
        data=payload, headers=SB_HEADERS, method="POST"
    )
    with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
        return r.status

def sb_get(table, params=""):
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}?{params}",
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
        return json.loads(r.read())

def load_all_reports():
    """Load reports from local JSON files in strategy folder."""
    reports = []
    if not STRATEGY.exists():
        return reports
    for jf in sorted(STRATEGY.glob("intel_*.json"), reverse=True)[:50]:
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
            data["_local_file"] = jf.name
            reports.append(data)
        except: pass
    return reports

def load_watchlist():
    wl = load_json(INTEL_DIR / "watchlist.json", [])
    return wl

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, default=str).encode()
        self.send_response(status)
        for k,v in CORS.items(): self.send_header(k, v)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        for k,v in CORS.items(): self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        p = self.path.split("?")[0].rstrip("/")

        if p == "/health":
            self.send_json({"status": "ok", "version": 3})

        elif p == "/reports":
            # Serve local JSON files — these always exist even if Supabase failed
            reports = load_all_reports()
            self.send_json({"reports": reports, "count": len(reports), "source": "local_files"})

        elif p == "/watchlist":
            self.send_json({"watchlist": load_watchlist()})

        elif p == "/stats":
            reports = load_all_reports()
            scores = [r.get("score",0) for r in reports if r.get("score")]
            self.send_json({
                "total": len(reports),
                "avg_score": round(sum(scores)/len(scores),1) if scores else 0,
                "watchlist": len(load_watchlist())
            })

        elif p == "/push-to-supabase":
            # Push all local JSON files to Supabase
            reports = load_all_reports()
            pushed = 0
            errors = []
            for r in reports:
                try:
                    sb_post("intel_reports", {
                        "url": r.get("url",""),
                        "title": r.get("title",""),
                        "creator": r.get("creator",""),
                        "platform": r.get("platform",""),
                        "score": r.get("score",0),
                        "insights": r.get("insights",{}),
                        "transcript_snippet": r.get("transcript_snippet","")[:500],
                        "added_to_watchlist": r.get("score",0) >= 7
                    })
                    # Push encyclopedia entry
                    enc = r.get("insights",{}).get("encyclopedia_entry",{})
                    if enc.get("title"):
                        content = f"## {enc['title']}\n\n**Source:** {r.get('title','')} by {r.get('creator','')}\n**Score:** {r.get('score',0)}/10\n\n### Summary\n{enc.get('summary','')}\n\n### Key Learnings\n" + "\n".join(f"- {l}" for l in enc.get("key_learnings",[])) + "\n\n### Tags\n" + ", ".join(enc.get("tags",[]))
                        sb_post("encyclopedia", {
                            "title": enc["title"],
                            "date": datetime.now().strftime("%d %b %Y"),
                            "content": content,
                            "source": "intel"
                        })
                    pushed += 1
                except Exception as e:
                    errors.append(str(e)[:100])
            self.send_json({"pushed": pushed, "errors": errors})

        else:
            self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        p = self.path.rstrip("/")
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")

        if p == "/analyse":
            url = body.get("url","").strip()
            if not url:
                self.send_json({"error": "No URL"}, 400); return
            # Submit to Supabase job queue
            try:
                result = sb_post("intel_jobs", {"url": url, "status": "queued"})
                self.send_json({"ok": True, "message": "Job queued"})
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
        else:
            self.send_json({"error": "Not found"}, 404)

ACTIVE = set()

def process_job(job):
    jid = job["id"]; url = job["url"]
    log(f"Processing: {url[:60]}")
    try:
        # Update status
        req = urllib.request.Request(
            f"{SB_URL}/rest/v1/intel_jobs?id=eq.{jid}",
            data=json.dumps({"status":"processing","progress":"Starting..."}).encode(),
            headers={**SB_HEADERS,"Prefer":"return=minimal"}, method="PATCH"
        )
        urllib.request.urlopen(req, timeout=10, context=SSL_CTX)
    except: pass

    sys.path.insert(0, str(HOME))
    try:
        import rpgace_intel as intel
        key_file = HOME / ".anthropic_key"
        if key_file.exists(): intel.ANTHROPIC_KEY = key_file.read_text().strip()

        orig_log = intel.log
        def pl(msg, *a, **k):
            try:
                req = urllib.request.Request(
                    f"{SB_URL}/rest/v1/intel_jobs?id=eq.{jid}",
                    data=json.dumps({"progress": msg.strip()[:100]}).encode(),
                    headers={**SB_HEADERS,"Prefer":"return=minimal"}, method="PATCH"
                )
                urllib.request.urlopen(req, timeout=5, context=SSL_CTX)
            except: pass
            print(f"    {msg}")
        intel.log = pl

        result = intel.process_url(url)
        intel.log = orig_log

        status = "complete" if result else "error"
        req = urllib.request.Request(
            f"{SB_URL}/rest/v1/intel_jobs?id=eq.{jid}",
            data=json.dumps({"status": status, "progress": "Done"}).encode(),
            headers={**SB_HEADERS,"Prefer":"return=minimal"}, method="PATCH"
        )
        urllib.request.urlopen(req, timeout=10, context=SSL_CTX)
    except Exception as e:
        log(f"Job error: {e}")
        try:
            req = urllib.request.Request(
                f"{SB_URL}/rest/v1/intel_jobs?id=eq.{jid}",
                data=json.dumps({"status":"error","progress":str(e)[:100]}).encode(),
                headers={**SB_HEADERS,"Prefer":"return=minimal"}, method="PATCH"
            )
            urllib.request.urlopen(req, timeout=10, context=SSL_CTX)
        except: pass
    finally:
        ACTIVE.discard(jid)

def poll_loop():
    log("Polling Supabase for jobs...")
    while True:
        try:
            jobs = sb_get("intel_jobs", "status=eq.queued&order=created_at.asc&limit=3")
            for job in jobs:
                if job["id"] not in ACTIVE and len(ACTIVE) < 2:
                    ACTIVE.add(job["id"])
                    t = threading.Thread(target=process_job, args=(job,), daemon=True)
                    t.start()
        except Exception as e:
            pass  # Supabase may be temporarily unavailable
        time.sleep(POLL_INTERVAL)

def main():
    for d in [HOME, INTEL_DIR, STRATEGY]:
        d.mkdir(parents=True, exist_ok=True)

    print(f"\n  ╔══════════════════════════════════════════╗")
    print(f"  ║  RPGACE Intel Server v3                 ║")
    print(f"  ║  http://localhost:{PORT} + Supabase queue  ║")
    print(f"  ╚══════════════════════════════════════════╝\n")

    key_file = HOME / ".anthropic_key"
    if not key_file.exists():
        key = input("  Anthropic API key: ").strip()
        if key: key_file.write_text(key)

    threading.Thread(target=poll_loop, daemon=True).start()
    server = HTTPServer(("localhost", PORT), Handler)
    log(f"HTTP server on port {PORT}")
    log("Submit URLs from RPGACE or run: python rpgace_intel.py <url>")
    log("Press Ctrl+C to stop\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")

if __name__ == "__main__":
    main()
