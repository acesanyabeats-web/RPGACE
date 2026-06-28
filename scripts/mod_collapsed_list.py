src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _buildCollapsedList: function(container) {
    // Container A — compact collapsed list built from localStorage
    var existing = document.getElementById('intel-collapsed-list');
    if (existing) existing.remove();
    var entries = [];
    try {
      entries = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
    } catch(e) { entries = []; }
    if (entries.length === 0) return;
    var self = this;
    var list = document.createElement('div');
    list.id = 'intel-collapsed-list';
    list.style.cssText = 'margin-bottom:8px;';
    entries.forEach(function(entry) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:4px;';
      var left = document.createElement('div');
      left.style.cssText = 'flex:1;min-width:0;margin-right:12px;';
      var title = document.createElement('div');
      title.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      title.textContent = (entry.title || 'Untitled').replace('☁️','').trim();
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
      meta.textContent = (entry.creator || '') + (entry.date ? ' · ' + entry.date : '');
      left.appendChild(title);
      left.appendChild(meta);
      var right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';
      var score = document.createElement('div');
      var s = parseInt(entry.score) || 0;
      score.style.cssText = 'font-size:13px;font-weight:700;color:' + (s >= 8 ? 'var(--green)' : s >= 6 ? 'var(--gold)' : 'var(--muted)') + ';';
      score.textContent = s + '/10';
      var bar = document.createElement('div');
      bar.style.cssText = 'font-size:9px;color:var(--muted);letter-spacing:0;';
      var filled = Math.round(s);
      bar.textContent = '█'.repeat(filled) + '░'.repeat(10 - filled);
      var del = self._mkBtn(function() {
        self._confirm(entry.title, entry.url || '', row, function(saveBib) {
          self._deleteInsight(entry, entry.title, row, saveBib);
          row.remove();
        });
      });
      right.appendChild(bar);
      right.appendChild(score);
      right.appendChild(del);
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });
    container.insertBefore(list, container.firstChild);
  },"""

new = """  _fmtDate: function(raw) {
    if (!raw) return '';
    // Handle ISO timestamps
    if (raw.includes('T') || raw.includes('+')) {
      try {
        var d = new Date(raw);
        return d.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'});
      } catch(e) { return raw; }
    }
    return raw;
  },

  _deleteUnified: function(entry, title, rowEl, cardEl) {
    var self = this;
    self._confirm(title, entry ? entry.url : '', rowEl || cardEl, function(saveBib) {
      // 1. Delete from Supabase intel_reports
      if (entry && entry.id) {
        self._sbDel('intel_reports', 'id=eq.' + entry.id)
          .then(function() {
            console.log('[intelDelete] Supabase intel_reports deleted:', entry.id);
          }).catch(function(e) { console.warn('[intelDelete]', e); });
      }
      // 2. Delete from localStorage intel_insights
      self._rmLocal('rpgace_intel_insights', title);
      // 3. Save to bibliography if requested
      if (saveBib && entry && entry.url) {
        var row = { title: title, url: entry.url };
        self._sbInsert('intel_bibliography', row).catch(function(){});
      }
      // 4. Remove from collapsed list
      var collRow = document.querySelector('[data-intel-title="' + CSS.escape(title) + '"]');
      if (collRow) collRow.remove();
      // 5. Remove from expanded list
      var expCard = document.querySelector('[data-intel-card="' + CSS.escape(title) + '"]');
      if (expCard) expCard.remove();
      // 6. Remove encyclopedia entry with same title
      self._sbDel('encyclopedia', 'title=eq.' + encodeURIComponent(title))
        .then(function() { console.log('[intelDelete] Encyclopedia entry removed:', title); })
        .catch(function(){});
      // 7. Remove taxonomy node with same concept
      self._sbDel('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(title))
        .then(function() { console.log('[intelDelete] Taxonomy node removed:', title); })
        .catch(function(){});
      // Update collapsed list count in toggle
      setTimeout(function() {
        var tog = document.getElementById('kg-master-toggle');
        if (tog) {
          var remaining = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length;
          var lbl = tog.querySelector('span');
          if (lbl && !window._intelViewExpanded) {
            lbl.textContent = 'Insights · ' + remaining + ' videos · Click to expand';
          }
        }
      }, 200);
    });
  },

  _showEncPopup: function(entry) {
    var existing = document.getElementById('enc-preview-popup');
    if (existing) { existing.remove(); return; }
    var popup = document.createElement('div');
    popup.id = 'enc-preview-popup';
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(560px,90vw);max-height:80vh;background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;z-index:99999;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.7);';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;';
    var htxt = document.createElement('div');
    var ht = document.createElement('div');
    ht.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);margin-bottom:4px;text-transform:uppercase;';
    ht.textContent = 'Encyclopedia Preview';
    var hs = document.createElement('div');
    hs.style.cssText = 'font-size:13px;font-weight:700;color:#E2E2EC;line-height:1.3;max-width:440px;';
    hs.textContent = (entry.title || '').replace('☁️','').trim();
    htxt.appendChild(ht); htxt.appendChild(hs);
    var cb = document.createElement('button');
    cb.textContent = '×';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;';
    cb.onclick = function() { popup.remove(); };
    hdr.appendChild(htxt); hdr.appendChild(cb);
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
    // Load from Supabase encyclopedia
    body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">Loading...</div>';
    RPGACE.sb.select('encyclopedia', 'title=eq.' + encodeURIComponent(entry.title || '') + '&limit=1')
      .then(function(rows) {
        if (!rows || rows.length === 0) {
          body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">No encyclopedia entry found for this video.</div>';
          return;
        }
        var enc = rows[0];
        var content = enc.content || '';
        body.innerHTML = '';
        var pre = document.createElement('div');
        pre.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.75);line-height:1.8;white-space:pre-wrap;';
        pre.textContent = content.slice(0, 1500) + (content.length > 1500 ? '...' : '');
        body.appendChild(pre);
      }).catch(function() {
        body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">Could not load encyclopedia entry.</div>';
      });
    var ftr = document.createElement('div');
    ftr.style.cssText = 'padding:12px 20px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;flex-shrink:0;';
    var goBtn = document.createElement('button');
    goBtn.textContent = '📖 Go to Encyclopedia';
    goBtn.style.cssText = 'flex:1;padding:8px 16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:var(--gold,#C9A84C);cursor:pointer;font-size:12px;font-weight:700;font-family:Rajdhani,sans-serif;';
    goBtn.onclick = function() {
      popup.remove();
      if (typeof showPage === 'function') showPage('encyclopedia');
    };
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);cursor:pointer;font-size:12px;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { popup.remove(); };
    ftr.appendChild(goBtn); ftr.appendChild(closeBtn);
    popup.appendChild(hdr); popup.appendChild(body); popup.appendChild(ftr);
    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99998;';
    backdrop.onclick = function() { popup.remove(); backdrop.remove(); };
    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
  },

  _buildCollapsedList: function(container) {
    var existing = document.getElementById('intel-collapsed-list');
    if (existing) existing.remove();
    var entries = [];
    try {
      entries = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
    } catch(e) { entries = []; }
    if (entries.length === 0) return;
    var self = this;
    var list = document.createElement('div');
    list.id = 'intel-collapsed-list';
    list.style.cssText = 'margin-bottom:8px;';

    entries.forEach(function(entry) {
      var title = (entry.title || 'Untitled').replace('☁️','').trim();
      var s = parseInt(entry.score) || 0;
      var scoreColor = s >= 8 ? 'var(--green)' : s >= 6 ? 'var(--gold,#C9A84C)' : 'var(--muted)';

      // Main row
      var row = document.createElement('div');
      row.dataset.intelTitle = title;
      row.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:4px;overflow:hidden;';

      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;padding:8px 12px;gap:8px;cursor:pointer;';

      // Expand indicator
      var expInd = document.createElement('span');
      expInd.textContent = '▸';
      expInd.style.cssText = 'font-size:9px;color:var(--muted);flex-shrink:0;transition:transform .15s;';

      var left = document.createElement('div');
      left.style.cssText = 'flex:1;min-width:0;';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      titleEl.textContent = title;
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:1px;';
      meta.textContent = (entry.creator || '') + (entry.date ? ' · ' + self._fmtDate(entry.date) : '');
      left.appendChild(titleEl); left.appendChild(meta);

      var right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

      var bar = document.createElement('div');
      bar.style.cssText = 'font-size:9px;color:var(--muted);';
      bar.textContent = '█'.repeat(s) + '░'.repeat(10 - s);

      var scoreEl = document.createElement('div');
      scoreEl.style.cssText = 'font-size:12px;font-weight:700;color:' + scoreColor + ';min-width:28px;text-align:right;';
      scoreEl.textContent = s + '/10';

      // Encyclopedia button
      var encBtn = document.createElement('button');
      encBtn.textContent = '📖';
      encBtn.title = 'Encyclopedia preview';
      encBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:rgba(226,226,236,0.5);cursor:pointer;font-size:11px;padding:2px 6px;';
      encBtn.onclick = function(e) { e.stopPropagation(); self._showEncPopup(entry); };

      // DEL button — unified delete
      var delBtn = self._mkBtn(function() {
        self._deleteUnified(entry, title, row, null);
      });

      right.appendChild(bar);
      right.appendChild(scoreEl);
      right.appendChild(encBtn);
      right.appendChild(delBtn);

      header.appendChild(expInd);
      header.appendChild(left);
      header.appendChild(right);

      // Inline expanded body
      var body = document.createElement('div');
      body.style.cssText = 'overflow:hidden;max-height:0;transition:max-height .25s ease;border-top:0 solid rgba(255,255,255,0.05);';
      var bodyInner = document.createElement('div');
      bodyInner.style.cssText = 'padding:10px 14px;font-size:12px;color:rgba(226,226,236,0.65);line-height:1.7;';

      // Summary
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
      }

      // Original link
      if (entry.url) {
        var link = document.createElement('a');
        link.href = entry.url;
        link.target = '_blank';
        link.textContent = '🔗 Original';
        link.style.cssText = 'display:inline-block;margin-top:8px;font-size:11px;color:var(--blue,#4A90E2);text-decoration:none;';
        bodyInner.appendChild(link);
      }

      body.appendChild(bodyInner);

      // Toggle expand on header click
      var isOpen = false;
      header.onclick = function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        isOpen = !isOpen;
        if (isOpen) {
          body.style.maxHeight = '400px';
          body.style.borderTopWidth = '1px';
          expInd.style.transform = 'rotate(90deg)';
        } else {
          body.style.maxHeight = '0';
          body.style.borderTopWidth = '0';
          expInd.style.transform = 'rotate(0deg)';
        }
      };

      row.appendChild(header);
      row.appendChild(body);
      list.appendChild(row);
    });

    container.insertBefore(list, container.firstChild);
  },"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: unified delete, individual expand, enc popup, date format")
else:
    print("ERROR: anchor not found")
    idx = src.find('_buildCollapsedList')
    print("Found at:", idx)

# Also tag expanded cards with data-intel-card for cross-delete
old2 = """    cards.forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('☁️','').trim() : '';
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      // Inject DEL button BEFORE making collapsible (DOM structure must be intact)
      var btn = self._mkBtn(function() {
        self._confirm(title, entry ? entry.url : '', card, function(saveBib) {
          self._deleteInsight(entry, title, card, saveBib);
        });
      });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });"""

new2 = """    cards.forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('☁️','').trim() : '';
      // Tag card for cross-delete
      card.dataset.intelCard = title;
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      // Use unified delete
      var btn = self._mkBtn(function() {
        self._deleteUnified(entry, title, null, card);
      });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });"""

if old2 in fixed:
    fixed = fixed.replace(old2, new2, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: expanded cards tagged and use unified delete")
else:
    print("ERROR: expanded card anchor not found")
