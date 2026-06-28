"""
RPGACE — Step 1: Split index.html into main.js + style.css + index.html shell
Run this script ONCE inside: C:\\Users\\acesa\\Downloads\\rpgace-vercel-v4
Usage: python split.py
"""

import os, re, sys

SRC = 'index.html'

if not os.path.exists(SRC):
    print(f"ERROR: {SRC} not found. Run this script inside the rpgace-vercel-v4 folder.")
    sys.exit(1)

with open(SRC, 'r', encoding='utf-8') as f:
    raw = f.read()

# ── 1. EXTRACT CSS ──────────────────────────────────────────────────────────
# Find <style> ... </style> block in <head>
style_match = re.search(r'<style>(.*?)</style>', raw, re.DOTALL)
if not style_match:
    print("ERROR: No <style> block found in index.html")
    sys.exit(1)

css = style_match.group(1).strip()
print(f"✓ CSS extracted — {len(css):,} chars")

# ── 2. EXTRACT JS ───────────────────────────────────────────────────────────
# Find the LAST <script>...</script> block (the main one, not any CDN imports)
# Use rfind to get the main script tag
js_open_idx  = raw.rindex('<script>')
js_close_idx = raw.rindex('</script>')

if js_open_idx > js_close_idx:
    print("ERROR: Could not locate main script block.")
    sys.exit(1)

js = raw[js_open_idx + len('<script>') : js_close_idx].strip()
print(f"✓ JS extracted  — {len(js):,} chars, {js.count(chr(10)):,} lines")

# ── 3. BUILD CLEAN index.html SHELL ─────────────────────────────────────────
html = raw

# Replace <style>...</style> with external link
html = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="style.css">', html, count=1, flags=re.DOTALL)

# Replace the main <script>...</script> with external src reference
# Use rindex positions to replace only the last script block
before_script = html[:html.rindex('<script>')]
after_script  = html[html.rindex('</script>') + len('</script>'):]
html = before_script + '<script src="main.js"></script>' + after_script

print(f"✓ HTML shell    — {len(html):,} chars, {html.count(chr(10)):,} lines")

# ── 4. SAFETY CHECKS ────────────────────────────────────────────────────────
remaining_inline_style  = '<style>' in html
remaining_inline_script = bool(re.search(r'<script>(?!.*src=)', html))

if remaining_inline_style:
    print("WARNING: Inline <style> block still present — check manually")
if remaining_inline_script:
    print("WARNING: Inline <script> block still present — check manually")

# Verify key elements still in HTML
for check in ['id="gate"', 'id="app"', 'id="page-dashboard"', 'id="page-quests"',
              'id="page-encyclopedia"', 'id="page-journal"', 'style.css', 'main.js']:
    if check not in html:
        print(f"WARNING: '{check}' not found in HTML shell")

# ── 5. WRITE FILES ──────────────────────────────────────────────────────────
with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css + '\n')
print("✓ style.css written")

with open('main.js', 'w', encoding='utf-8') as f:
    f.write(js + '\n')
print("✓ main.js written")

# Backup original before overwriting
if os.path.exists('index.html.bak'):
    os.remove('index.html.bak')
os.rename('index.html', 'index.html.bak')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("✓ index.html written (original backed up as index.html.bak)")

# ── 6. VERIFY JS SYNTAX ─────────────────────────────────────────────────────
import subprocess
result = subprocess.run(['node', '--check', 'main.js'], capture_output=True, text=True)
if result.returncode == 0:
    print("✓ main.js syntax check PASSED")
else:
    print(f"✗ main.js syntax check FAILED:\n{result.stderr}")
    print("  Restoring original index.html...")
    os.rename('index.html.bak', 'index.html')
    sys.exit(1)

print("\n✅ Split complete. Deploy with: npx vercel --prod")
print("   Verify the site works identically, then proceed to Step 2 (GitHub).")
