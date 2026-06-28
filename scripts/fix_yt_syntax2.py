from pathlib import Path

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")

# The problem: inside a single-quoted JS string, single quotes terminate the string.
# Python wrote 'yt-oracle-panel' but JS needs \'yt-oracle-panel\'
# Fix: replace the entire openPanel and closePanel with version that avoids this

old_open = """  openPanel: function() {
    var ex = document.getElementById('yt-oracle-panel');
    if (ex) { ex.remove(); return; }
    var self = this;
    var p = document.createElement('div');
    p.id = 'yt-oracle-panel';
    p.style.cssText = 'position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(255,80,80,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';
    var cmds = this.COMMANDS.map(function(c, i) {
      return '<button onclick="RPGACE.modules.youtubeOracle.run(' + i + ')" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;">' + c.icon + ' ' + c.label + '</button>';
    }).join('');
    p.innerHTML = '<div style="background:rgba(255,40,40,0.06);border-bottom:1px solid rgba(255,80,80,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0"><div><div style="font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,100,100,0.6)">YOUTUBE ORACLE</div><div style="font-size:13px;font-weight:700;color:#E2E2EC">@AceSanyaBeats</div></div><button onclick="document.getElementById(\'yt-oracle-panel\').remove()" style="background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:18px">&times;</button></div><div style="flex:1;overflow-y:auto;padding:14px">' + cmds + '</div>';
    document.body.appendChild(p);
    requestAnimationFrame(function() { requestAnimationFrame(function() { p.style.transform = 'translateX(0)'; }); });
  },"""

new_open = """  closePanel: function() {
    var p = document.getElementById('yt-oracle-panel');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  openPanel: function() {
    var ex = document.getElementById('yt-oracle-panel');
    if (ex) { this.closePanel(); return; }
    var self = this;
    var p = document.createElement('div');
    p.id = 'yt-oracle-panel';
    p.style.cssText = 'position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(255,80,80,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var header = document.createElement('div');
    header.style.cssText = 'background:rgba(255,40,40,0.06);border-bottom:1px solid rgba(255,80,80,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0';
    header.innerHTML = '<div><div style="font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,100,100,0.6)">YOUTUBE ORACLE</div><div style="font-size:13px;font-weight:700;color:#E2E2EC">@AceSanyaBeats</div></div>';
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:18px;';
    closeBtn.onclick = function() { self.closePanel(); };
    header.appendChild(closeBtn);
    p.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
    this.COMMANDS.forEach(function(c, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      btn.textContent = c.icon + ' ' + c.label;
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    p.appendChild(body);
    document.body.appendChild(p);
    requestAnimationFrame(function() { requestAnimationFrame(function() { p.style.transform = 'translateX(0)'; }); });
  },"""

if old_open in src:
    src = src.replace(old_open, new_open)
    print("Fixed: replaced innerHTML approach with createElement (no quote escaping needed)")
else:
    print("WARNING: old_open not found exactly. Trying partial match...")
    if "yt-oracle-panel" in src and "getElementById" in src:
        # Find and replace the closePanel onclick
        import re
        # Replace any getElementById('yt-oracle-panel') inside string literals
        src = re.sub(
            r"getElementById\(\\'yt-oracle-panel\\'\)",
            "getElementById('yt-oracle-panel')",
            src
        )
        # Also fix the close button inline handler
        src = src.replace(
            """onclick="document.getElementById(\\'yt-oracle-panel\\').remove()" """,
            'onclick="RPGACE.modules.youtubeOracle.closePanel()" '
        )
        print("Applied partial fix via regex")
    else:
        print("Could not find target. No changes made.")

import subprocess
result = subprocess.run(['node', '--check', 'rpgace_core.js'], capture_output=True, text=True)
if result.returncode == 0:
    print("Syntax check: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src), "chars")
    print("Run: git add rpgace_core.js && git commit -m \"Fix: yt oracle no innerHTML escaping\" && git push && npx vercel --prod")
else:
    print("Syntax check FAILED:", result.stderr[:300])
    print("NOT writing file - fix the script first")
