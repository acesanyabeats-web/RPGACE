src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """      // Summary — insights can be string or object
      var insightsText = '';
      if (entry.insights) {
        if (typeof entry.insights === 'string') {
          insightsText = entry.insights;
        } else if (Array.isArray(entry.insights)) {
          insightsText = entry.insights.join(' • ');
        } else if (typeof entry.insights === 'object') {
          insightsText = Object.values(entry.insights).join(' • ');
        }
      }
      if (insightsText) {
        var summary = document.createElement('div');
        summary.style.cssText = 'font-style:italic;color:rgba(226,226,236,0.5);margin-bottom:8px;border-left:2px solid rgba(201,168,76,0.3);padding-left:8px;';
        summary.textContent = insightsText.slice(0, 300) + (insightsText.length > 300 ? '...' : '');
        bodyInner.appendChild(summary);
      }

      // Bullet insights from transcript_snippet
      if (entry.transcript_snippet) {
        var snippetText = typeof entry.transcript_snippet === 'string' 
          ? entry.transcript_snippet 
          : JSON.stringify(entry.transcript_snippet);
        var bullets = snippetText.split('•').filter(function(b) { return b.trim(); });
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

      // What to steal bullets
      var steals = ins.what_to_steal || ins.content_strategy_insights || ins.production_techniques || [];
      if (typeof steals === 'string') steals = steals.split('•').filter(function(b){return b.trim();});
      if (Array.isArray(steals) && steals.length > 0) {
        steals.slice(0, 3).forEach(function(b) {
          var txt = typeof b === 'object' ? (b.insight || b.technique || b.tip || JSON.stringify(b)) : b;
          var li = document.createElement('div');
          li.style.cssText = 'margin-bottom:6px;padding-left:14px;position:relative;font-size:11px;color:rgba(226,226,236,0.65);';
          li.innerHTML = '<span style="position:absolute;left:0;color:var(--gold,#C9A84C);">•</span>' + txt.toString().trim();
          bodyInner.appendChild(li);
        });
      }"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: insights rendered from verdict_summary + what_to_steal")
else:
    print("ERROR: anchor not found")
