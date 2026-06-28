#!/usr/bin/env python3
"""
RPGACE Supabase Sync
====================
Pushes Intel reports to Supabase so RPGACE shows them automatically.
Imported by rpgace_intel.py — not run directly.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

SUPABASE_URL = "https://gripopghczmrbrhqtqbm.supabase.co"
SUPABASE_KEY = "sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf"

HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Prefer": "return=minimal"
}

def supabase_post(table: str, data: dict) -> bool:
    """Insert a row into a Supabase table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  Supabase error {e.code}: {body[:200]}")
        return False
    except Exception as e:
        print(f"  Supabase connection error: {e}")
        return False

def push_report(meta: dict, insights: dict, transcript_snippet: str) -> bool:
    """Push a full Intel report to Supabase."""
    score = insights.get("verdict_score", 0)
    data = {
        "url":               meta.get("url",""),
        "title":             meta.get("title",""),
        "creator":           meta.get("uploader",""),
        "platform":          meta.get("platform",""),
        "score":             score,
        "insights":          insights,
        "transcript_snippet": transcript_snippet[:500],
        "added_to_watchlist": insights.get("add_to_watchlist", False)
    }
    success = supabase_post("intel_reports", data)
    if success:
        print(f"  [OK] Pushed to Supabase: {meta.get('title','')[:40]}")
    return success

def push_watchlist(meta: dict, insights: dict) -> bool:
    """Push a watchlist entry to Supabase (upsert by URL)."""
    # Use upsert to avoid duplicates
    url = f"{SUPABASE_URL}/rest/v1/intel_watchlist"
    headers = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
    enc = insights.get("encyclopedia_entry", {})
    data = {
        "url":      meta.get("url",""),
        "title":    meta.get("title",""),
        "creator":  meta.get("uploader",""),
        "platform": meta.get("platform",""),
        "score":    insights.get("verdict_score", 0),
        "reason":   insights.get("watchlist_reason",""),
        "tags":     enc.get("tags", [])
    }
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"  Watchlist push error: {e}")
        return False

def fetch_reports(limit: int = 50) -> list:
    """Fetch recent reports from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/intel_reports?order=created_at.desc&limit={limit}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  Fetch error: {e}")
        return []
