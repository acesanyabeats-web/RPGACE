from pathlib import Path

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")

# Find and fix the broken onmouseover/onmouseout inside JS string literals
# The issue: single quotes inside single-quoted JS strings need to be escaped as \'
# but Python wrote them as plain ' which terminates the JS string

old = """    var cmds = this.COMMANDS.map(function(c, i) {
      return '<button onclick="RPGACE.modules.youtubeOracle.run(' + i + ')" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;" onmouseover="this.style.background=\'rgba(255,60,60,0.1)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.03)\'">' + c.icon + ' ' + c.label + '</button>';
    }).join('');"""

new = """    var cmds = this.COMMANDS.map(function(c, i) {
      return '<button onclick="RPGACE.modules.youtubeOracle.run(' + i + ')" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;">' + c.icon + ' ' + c.label + '</button>';
    }).join('');"""

if old in src:
    src = src.replace(old, new)
    print("Fixed: removed broken hover handlers from button builder")
else:
    # Try a broader fix - find the cmds builder and remove onmouseover/onmouseout
    import re
    count = src.count("onmouseover=")
    print(f"Found {count} onmouseover instances, doing broad cleanup...")
    # Remove the onmouseover and onmouseout attributes from the cmds string
    src = re.sub(
        r""" onmouseover="[^"]*" onmouseout="[^"]*" """,
        ' ',
        src
    )
    src = re.sub(
        r""" onmouseover=\\'[^\\']*\\' onmouseout=\\'[^\\']*\\' """,
        ' ',
        src
    )
    # Also try removing any line with both onmouseover and rgba on same line
    lines = src.split('\n')
    fixed_lines = []
    for line in lines:
        if 'onmouseover' in line and 'rgba' in line and "cmds" in src[max(0, src.find(line)-200):src.find(line)+200]:
            line = line.replace("onmouseover=\\'rgba(255,60,60,0.1)\\' onmouseout=\\'rgba(255,255,255,0.03)\\'", '')
            line = line.replace("onmouseover=\"this.style.background='rgba(255,60,60,0.1)'\" onmouseout=\"this.style.background='rgba(255,255,255,0.03)'\"", '')
        fixed_lines.append(line)
    src = '\n'.join(fixed_lines)
    print("Applied broad fix")

f.write_text(src, encoding="utf-8", errors="replace")
print("Written:", len(src), "chars")
print("Run: git add rpgace_core.js && git commit -m \"Fix: yt oracle syntax error\" && git push && npx vercel --prod")
