from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

marker = "/* ================================================================\n   INTEL CARD DELETE"
while marker in src:
    idx = src.index(marker)
    src = src[:idx].rstrip()
print("Stripped old. Size:", len(src))

module = """

/* ================================================================
   INTEL CARD DELETE v4 — Supabase-native delete
   Deletes from intel_reports + intel_watchlist directly.
   No more local blacklist fighting sync.
================================================================ */
RPGACE.register('intelDelete', {

  SB_URL: 'https://gripopghczmrbrhqtqbm.supabase.co',
  SB_KEY: 'sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf',
  BIB:    'rpgace_intel_bibliography',

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning' || name === 'research') {
        setTimeout(function() { self._injectAll(); }, 400);
      }
      if (name === 'encyclopedia') {
        setTimeout(function() { self._injectBibSection(); }, 500);
      }
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      [500, 1200, 3000].forEach(function(d) {
        setTimeout(function() { self._injectAll(); }, d);
      });
      setTimeout(function() { self._injectBibSection(); }, 1500);
      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m) { return m.addedNodes.length > 0; })) {
          setTimeout(function() { self._injectAll(); }, 150);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  },

  /* ── Supabase helpers ─────────────────────────── */
  _sbDel: function(table, filter) {
    return fetch(this.SB_URL + '/rest/v1/' + table + '?' + filter, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + this.SB_KEY,
        'apikey': this.SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      }
    });
  },

  _sbInsert: function(table, row) {
    return fetch(this.SB_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.SB_KEY,
        'apikey': this.SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  },

  /* ── Inject buttons on both card types ─────────── */
  _injectAll: function() {
    this._injectInsights();
    this._injectWatchlist();
  },

  _injectInsights: function() {
    var self = this;
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('\u2601\uFE0F','').trim() : '';
      /* Get entry id and url from localStorage */
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      var btn = self._mkBtn(function() {
        self._confirm(title, entry ? entry.url : '', card, function(saveBib) {
          self._deleteInsight(entry, title, card, saveBib);
        });
      });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });
  },

  _injectWatchlist: function() {
    var self = this;
    document.querySelectorAll('[style*="rgba(139,92,246"]').forEach(function(card) {
      if (card.dataset.dw4) return;
      card.dataset.dw4 = '1';
      var content = card.children[1];
      var te = content ? content.querySelector('div') : null;
      var title = te ? te.textContent.trim() : '';
      if (!title) return;
      var entry = self._findEntry('rpgace_intel_watchlist', title);
      var url = entry ? (entry.url||'') : '';
      var btn = self._mkBtn(function() {
        self._confirm(title, url, card, function(saveBib) {
          self._deleteWatchlist(url, title, card, saveBib);
        });
      });
      btn.style.marginLeft = 'auto';
      btn.style.flexShrink = '0';
      card.appendChild(btn);
    });
  },

  _mkBtn: function(cb) {
    var btn = document.createElement('button');
    btn.textContent = 'DEL';
    btn.style.cssText = 'background:rgba(226,84,84,0.12);border:1px solid rgba(226,84,84,0.35);color:rgba(226,84,84,0.85);border-radius:4px;padding:3px 8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;display:block;';
    btn.onclick = function(e) { e.stopPropagation(); cb(); };
    return btn;
  },

  _findEntry: function(key, title) {
    try {
      var d = JSON.parse(localStorage.getItem(key)||'[]');
      return d.find(function(x){ return (x.title||'').trim() === title; }) || null;
    } catch(e) { return null; }
  },

  /* ── Delete from Supabase ───────────────────────── */
  _deleteInsight: function(entry, title, card, saveBib) {
    var self = this;
    /* Remove from Supabase intel_reports by id */
    if (entry && entry.id) {
      self._sbDel('intel_reports', 'id=eq.' + entry.id)
        .then(function(r) {
          if (r.ok) {
            console.log('[intelDelete] Deleted from intel_reports:', entry.id);
          } else {
            console.warn('[intelDelete] Supabase delete failed:', r.status);
          }
        }).catch(function(e) { console.warn('[intelDelete]', e); });
    }
    /* Remove from local storage */
    self._rmLocal('rpgace_intel_insights', title);
    /* Hide card */
    self._hideCard(card);
    /* Save to bibliography if requested */
    if (saveBib && entry) self._saveBib(title, entry.url||'');
    RPGACE.utils.toast(saveBib ? 'Deleted + saved to bibliography' : 'Deleted', saveBib ? 'rgba(61,170,110,0.9)' : 'rgba(226,84,84,0.9)', 2000);
  },

  _deleteWatchlist: function(url, title, card, saveBib) {
    var self = this;
    /* Remove from Supabase intel_watchlist by url */
    if (url) {
      self._sbDel('intel_watchlist', 'url=eq.' + encodeURIComponent(url))
        .then(function(r) {
          if (r.ok) {
            console.log('[intelDelete] Deleted from intel_watchlist:', url);
          } else {
            console.warn('[intelDelete] Watchlist delete failed:', r.status);
          }
        }).catch(function(e) { console.warn('[intelDelete]', e); });
    }
    self._rmLocal('rpgace_intel_watchlist', title);
    self._hideCard(card);
    if (saveBib) self._saveBib(title, url);
    RPGACE.utils.toast(saveBib ? 'Deleted + saved to bibliography' : 'Deleted', saveBib ? 'rgba(61,170,110,0.9)' : 'rgba(226,84,84,0.9)', 2000);
  },

  _rmLocal: function(key, title) {
    try {
      var d = JSON.parse(localStorage.getItem(key)||'[]');
      localStorage.setItem(key, JSON.stringify(
        d.filter(function(x){ return (x.title||'').trim() !== title; })
      ));
    } catch(e) {}
  },

  _hideCard: function(card) {
    card.style.transition = 'opacity .18s';
    card.style.opacity = '0';
    setTimeout(function(){ card.style.display = 'none'; }, 200);
  },

  /* ── Bibliography ───────────────────────────────── */
  _saveBib: function(title, url) {
    var self = this;
    try {
      var bib = JSON.parse(localStorage.getItem(self.BIB)||'[]');
      if (!bib.some(function(b){ return b.url===url; })) {
        var row = { title: title, url: url, saved: new Date().toISOString() };
        bib.push(row);
        localStorage.setItem(self.BIB, JSON.stringify(bib));
        /* Also try to insert into Supabase intel_bibliography table */
        self._sbInsert('intel_bibliography', row)
          .catch(function() {}); /* silent fail if table doesn't exist */
      }
    } catch(e) {}
  },

  /* ── Confirmation popup ─────────────────────────── */
  _confirm: function(title, url, card, onDecide) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.3);border-radius:10px;padding:24px 28px;width:min(360px,90vw);';
    function el(tag, css, txt) { var e=document.createElement(tag); e.style.cssText=css||''; if(txt!==undefined)e.textContent=txt; return e; }
    box.appendChild(el('div','font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:6px;','Delete Report'));
    box.appendChild(el('div','font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:16px;line-height:1.4;', title.length>65?title.substring(0,65)+'...':title));
    box.appendChild(el('div','font-size:13px;font-weight:600;color:rgba(226,226,236,0.85);margin-bottom:8px;','Save URL to bibliography?'));
    box.appendChild(el('div','font-size:10px;color:rgba(201,168,76,0.55);margin-bottom:18px;font-family:monospace;word-break:break-all;', url?(url.length>60?url.substring(0,60)+'...':url):'No URL'));
    var row = el('div','display:flex;gap:8px;flex-wrap:wrap;');
    function mkb(label, bg, bd, col, saveBib) {
      var b = el('button','flex:1;min-width:80px;background:'+bg+';border:1px solid '+bd+';color:'+col+';border-radius:6px;padding:9px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;', label);
      b.onclick = function(){ ov.remove(); onDecide(saveBib); };
      return b;
    }
    row.appendChild(mkb('Yes, save it','rgba(61,170,110,0.12)','rgba(61,170,110,0.35)','rgba(61,170,110,0.9)', true));
    row.appendChild(mkb('No, just delete','rgba(226,84,84,0.1)','rgba(226,84,84,0.3)','rgba(226,84,84,0.8)', false));
    var cancel = el('button','background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:6px;padding:9px 14px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;','Cancel');
    cancel.onclick = function(){ ov.remove(); };
    row.appendChild(cancel);
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
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
    var htxt = el('div','font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;','BIBLIOGRAPHY \u00B7 ' + bib.length + ' SOURCES');
    var clr = el('button','background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;','Clear');
    clr.onclick = function() { localStorage.removeItem('rpgace_intel_bibliography'); s.remove(); };
    hdr.appendChild(htxt); hdr.appendChild(clr); s.appendChild(hdr);
    function el(tag,css,txt){var e=document.createElement(tag);e.style.cssText=css||'';if(txt!==undefined)e.textContent=txt;return e;}
    if (!bib.length) {
      s.appendChild(el('div','font-size:12px;color:rgba(226,226,236,0.3);font-style:italic;','No entries yet. Delete cards and choose "Yes, save it" to build this list.'));
    } else {
      bib.forEach(function(b) {
        var row = el('div','display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);align-items:flex-start;');
        var dot = el('span','color:rgba(201,168,76,0.5);flex-shrink:0;','\u2022');
        var info = el('div','');
        var t = el('div','font-size:12px;font-weight:600;color:rgba(226,226,236,0.75);margin-bottom:2px;font-family:Rajdhani,sans-serif;', b.title||'Untitled');
        var lnk = document.createElement('a');
        lnk.href=b.url||'#'; lnk.target='_blank';
        lnk.textContent=b.url?(b.url.length>65?b.url.substring(0,65)+'...':b.url):'No URL';
        lnk.style.cssText='font-size:10px;color:rgba(201,168,76,0.55);text-decoration:none;font-family:monospace;';
        info.appendChild(t); info.appendChild(lnk);
        row.appendChild(dot); row.appendChild(info); s.appendChild(row);
      });
    }
    enc.appendChild(s);
  },

});
"""

src = src.rstrip() + module

tmp = Path("_v4.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node','--check',str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"R-29: intel delete v4 Supabase native\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
