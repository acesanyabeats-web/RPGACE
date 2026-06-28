from pathlib import Path
import subprocess, re

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# Remove any existing intelDelete module
marker = "\n/* ================================================================\n   INTEL CARD DELETE BUTTONS"
if marker in src:
    idx = src.index(marker)
    src = src[:idx].rstrip()
    print("Stripped old intelDelete module")
else:
    print("No existing intelDelete module - appending fresh")

fresh_module = """

/* ================================================================
   INTEL CARD DELETE + BIBLIOGRAPHY CONFIRMATION
================================================================ */
RPGACE.register('intelDelete', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'research') setTimeout(function() { self._inject(); }, 500);
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 700);
      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m){ return m.addedNodes.length > 0; }))
          setTimeout(function() { self._inject(); }, 200);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  },

  _inject: function() {
    var self = this;
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    cards.forEach(function(card) {
      if (card.dataset.delInjected) return;
      card.dataset.delInjected = '1';
      var titleEl = card.querySelector('[style*="font-weight:600"]');
      var title = titleEl ? titleEl.textContent.replace('\u2601\uFE0F','').trim() : '';
      var url = self._urlFor(title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      var btn = document.createElement('button');
      btn.textContent = '\uD83D\uDDD1';
      btn.title = 'Delete this report';
      btn.style.cssText = 'display:block;background:rgba(226,84,84,0.1);border:1px solid rgba(226,84,84,0.3);color:rgba(226,84,84,0.75);border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;margin-bottom:5px;margin-left:auto;';
      btn.onclick = function(e) { e.stopPropagation(); self._confirm(title, url, card); };
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });
  },

  _urlFor: function(title) {
    try {
      var d = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
      var e = d.find(function(x){ return (x.title||'').trim() === title; });
      return e ? (e.url||'') : '';
    } catch(e) { return ''; }
  },

  _confirm: function(title, url, card) {
    var self = this;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.3);border-radius:10px;padding:24px 28px;width:min(360px,90vw);';
    var h = document.createElement('div');
    h.textContent = '\uD83D\uDDD1 Delete Report';
    h.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:6px;';
    var t = document.createElement('div');
    t.textContent = title.length > 60 ? title.substring(0,60)+'\u2026' : title;
    t.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:18px;line-height:1.4;';
    var q = document.createElement('div');
    q.textContent = 'Save URL to bibliography?';
    q.style.cssText = 'font-size:13px;font-weight:600;color:rgba(226,226,236,0.85);margin-bottom:10px;';
    var ul = document.createElement('div');
    ul.textContent = url ? (url.length > 55 ? url.substring(0,55)+'\u2026' : url) : 'No URL';
    ul.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.55);margin-bottom:18px;font-family:monospace;word-break:break-all;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var mk = function(label, bg, border, color, cb) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'flex:1;min-width:80px;background:'+bg+';border:1px solid '+border+';color:'+color+';border-radius:6px;padding:9px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.5px;';
      b.onclick = function(){ ov.remove(); cb(); };
      return b;
    };
    row.appendChild(mk('\u2713 Yes, save it',
      'rgba(61,170,110,0.12)', 'rgba(61,170,110,0.35)', 'rgba(61,170,110,0.9)',
      function() {
        self._toBib(title, url);
        self._rm(title, card);
        RPGACE.utils.toast('\u2713 Deleted \u00B7 URL saved to bibliography','rgba(61,170,110,0.9)',2200);
      }));
    row.appendChild(mk('\u2717 No, just delete',
      'rgba(226,84,84,0.1)', 'rgba(226,84,84,0.3)', 'rgba(226,84,84,0.8)',
      function() {
        self._rm(title, card);
        RPGACE.utils.toast('\uD83D\uDDD1 Deleted','rgba(226,84,84,0.9)',1500);
      }));
    row.appendChild(mk('Cancel',
      'none', 'rgba(255,255,255,0.1)', 'rgba(226,226,236,0.3)',
      function() {}));
    box.appendChild(h); box.appendChild(t); box.appendChild(q);
    box.appendChild(ul); box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
  },

  _toBib: function(title, url) {
    try {
      var bib = JSON.parse(localStorage.getItem('rpgace_intel_bibliography') || '[]');
      if (url && !bib.some(function(b){ return b.url === url; })) {
        bib.push({ title: title, url: url, saved: new Date().toISOString() });
        localStorage.setItem('rpgace_intel_bibliography', JSON.stringify(bib));
      }
    } catch(e) {}
  },

  _rm: function(title, card) {
    try {
      var d = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
      localStorage.setItem('rpgace_intel_insights',
        JSON.stringify(d.filter(function(x){ return (x.title||'').trim() !== title; })));
    } catch(e) {}
    card.style.transition = 'opacity .18s, transform .18s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(16px)';
    setTimeout(function(){ card.remove(); }, 200);
  },

});
"""

src = src + fresh_module

tmp = Path("_bib2.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"R-29: intel delete bib confirm popup\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
