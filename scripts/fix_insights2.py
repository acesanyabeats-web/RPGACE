src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """      // Summary
      if (entry.insights) {
        var summary = document.createElement('div');
        summary.style.cssText = 'font-style:italic;color:rgba(226,226,236,0.5);margin-bottom:8px;border-left:2px solid rgba(201,168,76,0.3);padding-left:8px;';
        summary.textContent = entry.insights.slice(0, 200) + (entry.insights.length > 200 ? '...' : '');
        bodyInner.appendChild(summary);
      }

      // Bullet insights
      if (entry.transcript_snippet) {
        var bullets = entry.transcript_snippet.split('•').filter(function(b) { return b.trim(); });
        bullets.forEach(function(b) {
          var li = document.createElement('div');
          li.style.cssText = 'margin-bottom:6px;padding-left:10px;position:relative;';
          li.innerHTML = '<span style="position:absolute;left:0;color:var(--gold,#C9A84C);">•</span>' + b.trim();
          bodyInner.appendChild(li);
        });
      }"""

new = """      // Verdict summary from insights object
      var ins = entry.insights || {};
      if (ins.verdict_summary) {
        var summary = document.createElement('div');
        summary.style.cssText = 'font-style:italic;color:rgba(226,226,236,0.5);margin-bottom:10px;border-left:2px solid rgba(201,168,76,0.3);padding-left:8px;font-size:11px;';
        summary.textContent = '"' + ins.verdict_summary + '"';
        bodyInner.appendChild(summary);
      }

      // What to steal / content insights bullets
      var steals = ins.what_to_steal || ins.content_strategy_insights || ins.production_techniques || [];
      if (typeof steals === 'string') steals = steals.split('\\u2022').filter(function(b){return b.trim();});
      if (!Array.isArray(steals)) steals = [];
      steals.slice(0, 3).forEach(function(b) {
        var txt = typeof b === 'object' ? (b.insight || b.technique || b.tip || b.steal || JSON.stringify(b)) : b;
        var li = document.createElement('div');
        li.style.cssText = 'margin-bottom:6px;padding-left:14px;position:relative;font-size:11px;color:rgba(226,226,236,0.65);';
        li.innerHTML = '<span style="position:absolute;left:0;color:var(--gold,#C9A84C);">\\u2022</span>' + txt.toString().trim();
        bodyInner.appendChild(li);
      });"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: insights rendered from verdict_summary + what_to_steal")
else:
    print("ERROR: anchor not found")
    # Debug
    idx = src.find('entry.insights.slice')
    print("entry.insights.slice at index:", idx)
    if idx > 0:
        print(repr(src[idx-100:idx+100]))
