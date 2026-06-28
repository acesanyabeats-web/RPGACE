from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# Replace _intercept in prodOraclePanel — wrap window.toggleProdOraclePanel
old_prod = """  _intercept: function() {
    if (window._prodOraclePanelIntercepted) return;
    var btn = document.querySelector('[onclick*="toggleProdOraclePanel"]');
    if (!btn) return;
    window._prodOraclePanelIntercepted = true;
    var self = this;
    btn.onclick = function() { self.open(); };
  },"""

new_prod = """  _intercept: function() {
    if (window._prodOraclePanelIntercepted) return;
    if (typeof window.toggleProdOraclePanel === 'undefined') return;
    window._prodOraclePanelIntercepted = true;
    var self = this;
    window.toggleProdOraclePanel = function() { self.open(); };
  },"""

# Replace _intercept in instaOraclePanel — wrap window.toggleInstaPanel
old_insta = """  _intercept: function() {
    if (window._instaOraclePanelIntercepted) return;
    var btn = document.querySelector('[onclick*="toggleInstaPanel"]');
    if (!btn) return;
    window._instaOraclePanelIntercepted = true;
    var self = this;
    btn.onclick = function() { self.open(); };
  },"""

new_insta = """  _intercept: function() {
    if (window._instaOraclePanelIntercepted) return;
    if (typeof window.toggleInstaPanel === 'undefined') return;
    window._instaOraclePanelIntercepted = true;
    var self = this;
    window.toggleInstaPanel = function() { self.open(); };
  },"""

if old_prod in src:
    src = src.replace(old_prod, new_prod)
    print("Fixed: prodOraclePanel intercept wraps window.toggleProdOraclePanel")
else:
    print("WARNING: prod intercept pattern not found")

if old_insta in src:
    src = src.replace(old_insta, new_insta)
    print("Fixed: instaOraclePanel intercept wraps window.toggleInstaPanel")
else:
    print("WARNING: insta intercept pattern not found")

tmp = Path("_int.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node','--check',str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"Fix: intercept window fns not btn onclick\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
