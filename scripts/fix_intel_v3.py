from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# Strip ALL existing intelDelete blocks
marker = "/* ================================================================\n   INTEL CARD DELETE"
while marker in src:
    idx = src.index(marker)
    src = src[:idx].rstrip()
print("Stripped old. Size:", len(src))

module = """

/* ================================================================
   INTEL CARD DELETE v3 — blacklist + interval enforcement + watchlist
================================================================ */
RPGACE.register('intelDelete', {

  BL: 'rpgace_intel_blacklist',
  BIB: 'rpgace_intel_bibliography',

  init: function() {
    var self = this;

    /* Continuous enforcement — hides blacklisted cards every 600ms */
    setInterval(function() { self._enforce(); }, 600);

    /* Tab triggers */
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning' || name === 'research') {
        setTimeout(function() { self._injectInsights(); }, 400);
      }
      if (name === 'encyclopedia') {
        setTimeout(function() { self._injectBibSection(); }, 500);
      }
    });

    RPGACE.hooks.on('rpgace:ready', function() {
      [400, 1000, 2500, 5000].forEach(function(d) {
        setTimeout(function() { self._injectInsights(); self._injectWatchlist(); }, d);
      });
      setTimeout(function() { self._injectBibSection(); }, 1200);
      /* Intercept syncAndPush to filter blacklist from incoming data */
      self._patchSync();
    });

    /* DOM observer — catch dynamic re-renders */
    var obs = new MutationObserver(function(muts) {
      if (muts.some(function(m) { return m.addedNodes.length > 0; })) {
        setTimeout(function() {
          self._enforce();
          self._injectInsights();
          self._injectWatchlist();
        }, 100);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },

  /* ── Blacklist helpers ──────────────────────────── */
  _bl: function() {
    try { return JSON.parse(localStorage.getItem(this.BL) || '{}'); } catch(e) { return {}; }
  },
  _addBL: function(title) {
    var bl = this._bl();
    bl[title] = Date.now();
    localStorage.setItem(this.BL, JSON.stringify(bl));
  },

  /* ── Enforce: hide any rendered card whose title is blacklisted ── */
  _enforce: function() {
    var bl = this._bl();
    if (!Object.keys(bl).length) return;
    /* Insights cards */
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      var te = card.querySelector('[style*="font-weight:600"]');
      var t = te ? te.textContent.replace('\u2601\uFE0F','').trim() : '';
      if (bl[t]) card.style.display = 'none';
    });
    /* Watchlist cards */
    document.querySelectorAll('[style*="rgba(139,92,246"]').forEach(function(card) {
      var te = card.querySelector('[style*="font-weight:600"], [style*="font-weight: 600"]');
      if (!te) { var kids = card.children; te = kids && kids[1] ? kids[1].querySelector('div') : null; }
      var t = te ? te.textContent.trim() : '';
      if (bl[t]) card.style.display = 'none';
    });
  },

  /* ── Intercept syncAndPush to filter blacklist from Supabase data ── */
  _patchSync: function() {
    if (window._syncPatched2) return;
    var self = this;
    if (typeof window.syncAndPush !== 'function') return;
    var orig = window.syncAndPush;
    window.syncAndPush = function() {
      orig.apply(this, arguments);
      setTimeout(function() {
        var bl = self._bl();
        var keys = ['rpgace_intel_insights', 'rpgace_intel_watchlist'];
        keys.forEach(function(key) {
          try {
            var d = JSON.parse(localStorage.getItem(key) || '[]');
            var filtered = d.filter(function(x) { return !bl[(x.title||'').trim()]; });
            if (filtered.length < d.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
              console.log('[intelDelete] Filtered', d.length-filtered.length, 'blacklisted from', key);
            }
          } catch(e) {}
        });
      }, 2000);
    };
    window._syncPatched2 = true;
  },

  /* ── Inject DEL buttons on Insights cards ─────── */
  _injectInsights: function() {
    var self = this;
    var bl = this._bl();
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('\u2601\uFE0F','').trim() : '';
      if (bl[title]) { card.style.display = 'none'; return; }
      if (card.dataset.di) return;
      card.dataset.di = '1';
      var url = self._urlFrom('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      var btn = self._mkBtn(function() { self._confirm(title, url, card); });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });
  },

  /* ── Inject DEL buttons on Watchlist cards ─────── */
  _injectWatchlist: function() {
    var self = this;
    var bl = this._bl();
    document.querySelectorAll('[style*="rgba(139,92,246"]').forEach(function(card) {
      /* Find title — second child's first div */
      var content = card.children[1];
      var te = content ? content.querySelector('[style*="font-weight:600"], div') : null;
      var title = te ? te.textContent.trim() : '';
      if (!title) return;
      if (bl[title]) { card.style.display = 'none'; return; }
      if (card.dataset.dw) return;
      card.dataset.dw = '1';
      var url = self._urlFrom('rpgace_intel_watchlist', title);
      var btn = self._mkBtn(function() { self._confirm(title, url, card); });
      btn.style.marginLeft = 'auto';
      btn.style.flexShrink = '0';
      card.appendChild(btn);
    });
  },

  _mkBtn: function(onClick) {
    var btn = document.createElement('button');
    btn.textContent = 'DEL';
    btn.style.cssText = 'background:rgba(226,84,84,0.12);border:1px solid rgba(226,84,84,0.35);color:rgba(226,84,84,0.85);border-radius:4px;padding:3px 8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;display:block;';
    btn.onclick = function(e) { e.stopPropagation(); onClick(); };
    return btn;
  },

  _urlFrom: function(key, title) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || '[]');
      var e = d.find(function(x){ return (x.title||'').trim() === title; });
      return e ? (e.url||'') : '';
    } catch(e) { return ''; }
  },

  /* ── Confirmation popup ─────────────────────────── */
  _confirm: function(title, url, card) {
    var self = this;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.3);border-radius:10px;padding:24px 28px;width:min(360px,90vw);';
    function el(tag, css, txt) { var e=document.createElement(tag); e.style.cssText=css||''; if(txt)e.textContent=txt; return e; }
    box.appendChild(el('div','font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:6px;','Delete Report'));
    box.appendChild(el('div','font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:16px;', title.length>60?title.substring(0,60)+'...':title));
    box.appendChild(el('div','font-size:13px;font-weight:600;color:rgba(226,226,236,0.85);margin-bottom:8px;','Save URL to bibliography?'));
    box.appendChild(el('div','font-size:10px;color:rgba(201,168,76,0.55);margin-bottom:18px;font-family:monospace;word-break:break-all;', url?(url.length>55?url.substring(0,55)+'...':url):'No URL'));
    var row = el('div','display:flex;gap:8px;flex-wrap:wrap;');
    function mkb(label,bg,bd,col,cb){
      var b=el('button','flex:1;min-width:80px;background:'+bg+';border:1px solid '+bd+';color:'+col+';border-radius:6px;padding:9px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;',label);
      b.onclick=function(){ov.remove();cb();};
      return b;
    }
    row.appendChild(mkb('Yes, save it','rgba(61,170,110,0.12)','rgba(61,170,110,0.35)','rgba(61,170,110,0.9)',function(){
      self._saveBib(title,url); self._delete(title,card);
      RPGACE.utils.toast('Deleted + saved to bibliography','rgba(61,170,110,0.9)',2200);
      setTimeout(function(){self._refreshBibSection();},300);
    }));
    row.appendChild(mkb('No, just delete','rgba(226,84,84,0.1)','rgba(226,84,84,0.3)','rgba(226,84,84,0.8)',function(){
      self._delete(title,card);
      RPGACE.utils.toast('Deleted','rgba(226,84,84,0.9)',1500);
    }));
    row.appendChild(mkb('Cancel','none','rgba(255,255,255,0.1)','rgba(226,226,236,0.3)',function(){}));
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
  },

  _delete: function(title, card) {
    this._addBL(title);
    ['rpgace_intel_insights','rpgace_intel_watchlist'].forEach(function(key) {
      try {
        var d = JSON.parse(localStorage.getItem(key)||'[]');
        localStorage.setItem(key, JSON.stringify(d.filter(function(x){return (x.title||'').trim()!==title;})));
      } catch(e){}
    });
    card.style.transition = 'opacity .18s';
    card.style.opacity = '0';
    setTimeout(function(){ card.style.display = 'none'; }, 200);
  },

  _saveBib: function(title, url) {
    try {
      var bib = JSON.parse(localStorage.getItem(this.BIB)||'[]');
      if (!bib.some(function(b){return b.url===url&&b.title===title;})) {
        bib.push({title:title,url:url,saved:new Date().toISOString()});
        localStorage.setItem(this.BIB, JSON.stringify(bib));
      }
    } catch(e){}
  },

  /* ── Bibliography section in Encyclopedia tab ── */
  _injectBibSection: function() {
    if (document.getElementById('rpgace-bib-section')) return;
    var enc = document.getElementById('page-encyclopedia');
    if (!enc) return;
    var bib = JSON.parse(localStorage.getItem(this.BIB)||'[]');
    var s = document.createElement('div');
    s.id = 'rpgace-bib-section';
    s.style.cssText = 'margin-top:32px;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;padding-bottom:32px;';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    var htxt = document.createElement('div');
    htxt.style.cssText = 'font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;';
    htxt.textContent = 'BIBLIOGRAPHY \u00B7 ' + bib.length + ' SOURCES';
    var clr = document.createElement('button');
    clr.textContent = 'Clear';
    clr.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;';
    clr.onclick = function() { localStorage.removeItem('rpgace_intel_bibliography'); s.remove(); };
    hdr.appendChild(htxt); hdr.appendChild(clr); s.appendChild(hdr);
    if (!bib.length) {
      var em = document.createElement('div');
      em.textContent = 'No entries yet. Delete intel cards and choose "Yes, save it" to build this list.';
      em.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.3);font-style:italic;';
      s.appendChild(em);
    } else {
      bib.forEach(function(b) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);align-items:flex-start;';
        var dot = document.createElement('span');
        dot.textContent = '\u2022'; dot.style.cssText = 'color:rgba(201,168,76,0.5);flex-shrink:0;';
        var info = document.createElement('div');
        var t = document.createElement('div');
        t.textContent = b.title||'Untitled';
        t.style.cssText = 'font-size:12px;font-weight:600;color:rgba(226,226,236,0.75);margin-bottom:2px;font-family:Rajdhani,sans-serif;';
        var lnk = document.createElement('a');
        lnk.href = b.url||'#'; lnk.target='_blank';
        lnk.textContent = b.url?(b.url.length>60?b.url.substring(0,60)+'...':b.url):'No URL';
        lnk.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.55);text-decoration:none;font-family:monospace;';
        info.appendChild(t); info.appendChild(lnk);
        row.appendChild(dot); row.appendChild(info);
        s.appendChild(row);
      });
    }
    enc.appendChild(s);
  },

  _refreshBibSection: function() {
    var s = document.getElementById('rpgace-bib-section');
    if (s) s.remove();
    this._injectBibSection();
  },

});
"""

src = src.rstrip() + module

tmp = Path("_v3.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node','--check',str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"R-29: intel delete v3 interval+watchlist\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
