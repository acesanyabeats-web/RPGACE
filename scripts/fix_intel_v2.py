from pathlib import Path
import subprocess, re

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# ── Strip ALL existing intelDelete blocks ──────────────────────────────────
marker = "/* ================================================================\n   INTEL CARD DELETE"
count = src.count(marker)
print(f"Found {count} intelDelete block(s) — stripping all")
while marker in src:
    idx = src.index(marker)
    src = src[:idx].rstrip()

print("Stripped. Size now:", len(src))

module = """

/* ================================================================
   INTEL CARD DELETE + BIBLIOGRAPHY (R-29)
================================================================ */
RPGACE.register('intelDelete', {

  BL_KEY: 'rpgace_intel_blacklist',
  BIB_KEY: 'rpgace_intel_bibliography',

  init: function() {
    var self = this;
    /* Fire on research/learning tab */
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning' || name === 'research') {
        setTimeout(function() { self._run(); }, 400);
      }
      if (name === 'encyclopedia') {
        setTimeout(function() { self._injectBibSection(); }, 500);
      }
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._run(); }, 500);
      setTimeout(function() { self._run(); }, 1500);
      setTimeout(function() { self._run(); }, 3500);
      setTimeout(function() { self._injectBibSection(); }, 1000);
      /* Watch DOM — re-apply after any re-render */
      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m) { return m.addedNodes.length > 0; })) {
          setTimeout(function() { self._run(); }, 120);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  },

  /* Run: hide blacklisted cards + inject delete buttons on visible ones */
  _run: function() {
    var self = this;
    var bl = self._getBL();
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    cards.forEach(function(card) {
      var titleEl = card.querySelector('[style*="font-weight:600"]');
      var title = titleEl ? titleEl.textContent.replace('\u2601\uFE0F','').trim() : '';
      /* Hide blacklisted */
      if (bl[title]) { card.style.display = 'none'; return; }
      /* Inject button if not already done */
      if (!card.dataset.delOk) {
        card.dataset.delOk = '1';
        var url = self._urlFor(title);
        var flexRow = card.querySelector('[style*="justify-content:space-between"]');
        if (!flexRow || !flexRow.children[1]) return;
        var scoreBox = flexRow.children[1];
        var btn = document.createElement('button');
        btn.textContent = 'DEL';
        btn.title = 'Delete this report';
        btn.style.cssText = 'display:block;background:rgba(226,84,84,0.12);border:1px solid rgba(226,84,84,0.35);color:rgba(226,84,84,0.85);border-radius:4px;padding:2px 8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;margin-bottom:4px;margin-left:auto;';
        btn.onclick = function(e) { e.stopPropagation(); self._confirm(title, url, card); };
        scoreBox.insertBefore(btn, scoreBox.firstChild);
      }
    });
  },

  _getBL: function() {
    try { return JSON.parse(localStorage.getItem(this.BL_KEY) || '{}'); } catch(e) { return {}; }
  },

  _addToBL: function(title) {
    try {
      var bl = this._getBL();
      bl[title] = Date.now();
      localStorage.setItem(this.BL_KEY, JSON.stringify(bl));
    } catch(e) {}
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
    h.textContent = 'Delete Report';
    h.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:6px;';
    var t = document.createElement('div');
    t.textContent = title.length > 60 ? title.substring(0,60)+'...' : title;
    t.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:16px;line-height:1.4;';
    var q = document.createElement('div');
    q.textContent = 'Save URL to bibliography?';
    q.style.cssText = 'font-size:13px;font-weight:600;color:rgba(226,226,236,0.85);margin-bottom:8px;';
    var ul = document.createElement('div');
    ul.textContent = url ? (url.length>55?url.substring(0,55)+'...':url) : 'No URL';
    ul.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.55);margin-bottom:18px;font-family:monospace;word-break:break-all;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    function mk(label, bg, bd, col, cb) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'flex:1;min-width:80px;background:'+bg+';border:1px solid '+bd+';color:'+col+';border-radius:6px;padding:9px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.5px;';
      b.onclick = function(){ ov.remove(); cb(); };
      return b;
    }
    row.appendChild(mk('Yes, save it','rgba(61,170,110,0.12)','rgba(61,170,110,0.35)','rgba(61,170,110,0.9)', function(){
      self._saveBib(title, url);
      self._delete(title, card);
      RPGACE.utils.toast('Deleted + saved to bibliography','rgba(61,170,110,0.9)',2200);
      self._refreshBibSection();
    }));
    row.appendChild(mk('No, just delete','rgba(226,84,84,0.1)','rgba(226,84,84,0.3)','rgba(226,84,84,0.8)', function(){
      self._delete(title, card);
      RPGACE.utils.toast('Deleted','rgba(226,84,84,0.9)',1500);
    }));
    row.appendChild(mk('Cancel','none','rgba(255,255,255,0.1)','rgba(226,226,236,0.3)', function(){}));
    box.appendChild(h); box.appendChild(t); box.appendChild(q); box.appendChild(ul); box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
  },

  _delete: function(title, card) {
    /* Add to blacklist so it stays hidden even after re-renders */
    this._addToBL(title);
    /* Remove from localStorage */
    try {
      var d = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
      localStorage.setItem('rpgace_intel_insights', JSON.stringify(
        d.filter(function(x){ return (x.title||'').trim() !== title; })
      ));
    } catch(e) {}
    /* Hide card */
    card.style.transition = 'opacity .18s, transform .18s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(16px)';
    setTimeout(function(){ card.style.display = 'none'; }, 200);
  },

  _saveBib: function(title, url) {
    try {
      var bib = JSON.parse(localStorage.getItem(this.BIB_KEY) || '[]');
      if (!bib.some(function(b){ return b.url === url && b.title === title; })) {
        bib.push({ title: title, url: url, saved: new Date().toISOString() });
        localStorage.setItem(this.BIB_KEY, JSON.stringify(bib));
      }
    } catch(e) {}
  },

  /* ── Bibliography section in Encyclopedia tab ── */
  _injectBibSection: function() {
    if (document.getElementById('rpgace-bib-section')) return;
    var encPage = document.getElementById('page-encyclopedia');
    if (!encPage) return;
    var bib = JSON.parse(localStorage.getItem(this.BIB_KEY) || '[]');

    var section = document.createElement('div');
    section.id = 'rpgace-bib-section';
    section.style.cssText = 'margin-top:32px;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    var title = document.createElement('div');
    title.style.cssText = 'font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;';
    title.textContent = 'BIBLIOGRAPHY \u00B7 ' + bib.length + ' SOURCES';
    var clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Bibliography';
    clearBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:4px;padding:4px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;';
    clearBtn.onclick = function() {
      localStorage.removeItem('rpgace_intel_bibliography');
      var s = document.getElementById('rpgace-bib-section');
      if (s) s.remove();
    };
    hdr.appendChild(title); hdr.appendChild(clearBtn);
    section.appendChild(hdr);

    if (!bib.length) {
      var empty = document.createElement('div');
      empty.textContent = 'No bibliography entries yet. Delete intel cards and choose "Yes, save it" to build this list.';
      empty.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.3);font-style:italic;';
      section.appendChild(empty);
    } else {
      bib.forEach(function(b) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
        var dot = document.createElement('span');
        dot.textContent = '\u2022';
        dot.style.cssText = 'color:rgba(201,168,76,0.5);flex-shrink:0;margin-top:1px;';
        var info = document.createElement('div');
        var t = document.createElement('div');
        t.textContent = b.title || 'Untitled';
        t.style.cssText = 'font-size:12px;font-weight:600;color:rgba(226,226,236,0.75);margin-bottom:2px;font-family:Rajdhani,sans-serif;';
        var link = document.createElement('a');
        link.href = b.url || '#';
        link.target = '_blank';
        link.textContent = b.url ? (b.url.length>55?b.url.substring(0,55)+'...':b.url) : 'No URL';
        link.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.55);text-decoration:none;font-family:monospace;';
        info.appendChild(t); info.appendChild(link);
        row.appendChild(dot); row.appendChild(info);
        section.appendChild(row);
      });
    }
    encPage.appendChild(section);
  },

  _refreshBibSection: function() {
    var s = document.getElementById('rpgace-bib-section');
    if (s) s.remove();
    this._injectBibSection();
  },

});
"""

src = src.rstrip() + module

tmp = Path("_iv2.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"R-29: intel delete v2 blacklist + bib section\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
