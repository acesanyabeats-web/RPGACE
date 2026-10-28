
/* ===MODULE:dailyLife=== */
// Oct 10 2026 — D1 ("Daily life") of the ratified /CEO plan "RPGACE Domains,
// Navigation & Deepstash Encyclopedia". Ideas from Alex's 50-projects list,
// each built on what already exists (rule 8):
//  33 fridge photo -> stock: a photo button on every Current Stock tab;
//     Oracle (api/oracle.js already takes images) lists what it sees, Alex
//     reviews/edits, and each row saves through cookingOracle.logic.
//     _upsertStock - the same write the manual add form uses.
//  30 watchlist digest: new uploads (last 7 days) from the YouTube creators
//     in intel_watchlist, via /api/search (sort:'date'); "Analyse" queues the
//     video exactly like the share target does (shareInbox.logic.queue).
//  10/08 your own words: open quests, decisions due and the latest journal
//     note go into the Morning Brief prompt so it can quote them back.
//  05 one timeline: done in careerStatCard (quest_log + planned_cooks).
RPGACE.register('dailyLife', {
  domain: 'habits',

  LAST_DIGEST_KEY: 'rpgace_watchlist_digest_at',
  MAX_ITEMS: 40,

  init: function() {},

  logic: {
    _today: function(offsetDays) {
      var d = new Date(); d.setDate(d.getDate() + (offsetDays || 0));
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    _clip: function(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; },

    // One block of Alex's own recent words for the Morning Brief prompt.
    ownWords: function() {
      var L = RPGACE.modules.dailyLife.logic;
      var sel = function(t, q) { return RPGACE.sb.select(t, q).then(function(r) { return Array.isArray(r) ? r : []; }).catch(function() { return []; }); };
      return Promise.all([
        sel('quest_log', 'select=name,description&status=eq.open&parent_quest_id=is.null&order=created_at.desc&limit=3'),
        sel('journal', 'select=title,content,review_on&entry_type=eq.decision&status=neq.reviewed&review_on=lte.' + L._today(3) + '&order=review_on.asc&limit=2'),
        sel('journal', 'select=title,content,created_at&or=(entry_type.is.null,entry_type.eq.note)&order=created_at.desc&limit=1'),
        RPGACE.modules.gymTracker ? RPGACE.modules.gymTracker.logic.weekLine().catch(function() { return ''; }) : Promise.resolve(''),
      ]).then(function(r) {
        var lines = [];
        if (r[3]) lines.push('• ' + r[3]);
        r[0].forEach(function(q) { lines.push('• Open quest: ' + L._clip(q.name, 80) + (q.description ? ' - "' + L._clip(q.description, 120) + '"' : '')); });
        r[1].forEach(function(d) { lines.push('• Decision due for a look-back (' + d.review_on + '): ' + L._clip(String(d.title || '').replace(/^🧭\s*/, ''), 80) + ' - you said: "' + L._clip(d.content, 140) + '"'); });
        r[2].forEach(function(j) { lines.push('• Latest journal note (' + String(j.created_at || '').slice(0, 10) + '): "' + L._clip(j.content || j.title, 160) + '"'); });
        if (!lines.length) return '';
        return '📌 IN YOUR OWN WORDS (quote these back where they matter, do not invent any)\n' + lines.join('\n');
      });
    },

    // Fence-tolerant: take the first {...} block in the reply.
    parseItems: function(raw) {
      var max = RPGACE.modules.dailyLife.MAX_ITEMS;
      var t = String(raw || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      var obj; try { obj = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
      var list = Array.isArray(obj) ? obj : (obj && obj.items);
      if (!Array.isArray(list)) return null;
      var seen = {}, out = [];
      list.forEach(function(x) {
        if (!x || typeof x.name !== 'string') return;
        var name = x.name.trim().toLowerCase().slice(0, 60);
        if (!name || seen[name]) return;
        seen[name] = 1;
        var q = parseFloat(x.quantity);
        var unit = typeof x.unit === 'string' ? x.unit.trim().slice(0, 15) : '';
        out.push({ name: name, quantity: (isNaN(q) || q <= 0) ? 1 : q, unit: unit || null });
      });
      return out.slice(0, max);
    },

    resizeImage: function(file, maxSide) { return RPGACE.utils.resizeImage(file, maxSide); },

    readPhoto: function(image, location) {
      return RPGACE.utils.oracleVision(image,
        'You catalogue kitchen stock from photos. Return ONLY one JSON object on a single line, no other text: {"items":[{"name":"milk","quantity":2,"unit":"litre"}]}. Names: lowercase, generic ingredient names as a recipe would write them (e.g. "cheddar cheese", "eggs", "spring onions"), no brands. quantity: count what you can see; for one container use 1 and a unit like "bottle", "pack", "jar", "bag", "tub". Skip anything you cannot identify. Never invent items.',
        'List the food and drink items you can see in this ' + location + ' photo.', 900);
    },

    saveItems: function(items, location, onEach) {
      var co = RPGACE.modules.cookingOracle;
      var done = 0, failed = [];
      return items.reduce(function(p, it) {
        return p.then(function() {
          return new Promise(function(res) {
            co.logic._upsertStock(it.name, location, it.quantity, it.unit, function(err) {
              if (err) failed.push(it.name + ' (' + err + ')'); else done++;
              if (onEach) onEach(done + failed.length);
              res();
            });
          });
        });
      }, Promise.resolve()).then(function() { return { saved: done, failed: failed }; });
    },

    // "3 days ago", "Streamed 5 hours ago", "1 week ago" -> within 7 days.
    isRecent: function(published) {
      var m = String(published || '').match(/(\d+)\s+(second|minute|hour|day|week)s?\s+ago/i);
      if (!m) return false;
      var n = parseInt(m[1], 10), u = m[2].toLowerCase();
      if (u === 'week') return n <= 1;
      if (u === 'day') return n <= 7;
      return true;
    },
    _norm: function(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); },
    creators: function(rows) {
      var seen = {}, out = [];
      (rows || []).forEach(function(r) {
        if (!r.creator || !/youtube/i.test(r.platform || '')) return;
        var k = RPGACE.modules.dailyLife.logic._norm(r.creator);
        if (!k || seen[k]) return;
        seen[k] = 1; out.push(r.creator);
      });
      return out;
    },
    newUploads: function(creator) {
      var L = RPGACE.modules.dailyLife.logic;
      return fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: creator, sort: 'date' }) })
        .then(function(r) { return r.ok ? r.json() : { videos: [] }; })
        .then(function(d) {
          return (d.videos || []).filter(function(v) { return L._norm(v.channel) === L._norm(creator) && L.isRecent(v.published); });
        }).catch(function() { return null; });
    },
    digest: function(onProgress) {
      var L = RPGACE.modules.dailyLife.logic;
      return RPGACE.sb.select('intel_watchlist', 'select=creator,platform').then(function(rows) {
        var cs = L.creators(rows), results = [], i = 0, finished = 0;
        var worker = function() {
          if (i >= cs.length) return Promise.resolve();
          var c = cs[i++];
          return L.newUploads(c).then(function(v) {
            results.push({ creator: c, videos: v || [], failed: v === null });
            finished++; if (onProgress) onProgress(finished, cs.length);
            return worker();
          });
        };
        return Promise.all([worker(), worker(), worker()]).then(function() {
          results.sort(function(a, b) { return b.videos.length - a.videos.length; });
          return { creators: cs.length, results: results };
        });
      });
    },
    lastDigestDays: function() {
      try {
        var t = localStorage.getItem(RPGACE.modules.dailyLife.LAST_DIGEST_KEY);
        return t ? Math.floor((Date.now() - Date.parse(t)) / 86400000) : null;
      } catch (e) { return null; }
    },
  },

  ui: {
    _btnCss: 'min-height:40px;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',

    photoButton: function(container, location, onDone) {
      var self = RPGACE.modules.dailyLife;
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment'); input.hidden = true;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dl-photo-btn';
      b.textContent = '📷 Add from a photo';
      b.style.cssText = 'display:block;width:100%;margin-top:8px;background:none;border:1px solid rgba(201,168,76,0.45);color:#C9A84C;' + self.ui._btnCss;
      b.onclick = function() { input.click(); };
      input.onchange = function() {
        var f = input.files && input.files[0];
        input.value = '';
        if (!f) return;
        b.disabled = true; b.textContent = '📷 Reading your photo…';
        self.logic.resizeImage(f).then(function(img) { return self.logic.readPhoto(img, location); })
          .then(function(raw) {
            var items = self.logic.parseItems(raw);
            if (!items) throw new Error('Oracle\'s reply had no item list in it');
            if (!items.length) throw new Error('No food items recognised in that photo');
            self.ui.openReview(items, location, onDone);
          })
          .catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'dailyLife'); })
          .then(function() { b.disabled = false; b.textContent = '📷 Add from a photo'; });
      };
      container.appendChild(b);
      container.appendChild(input);
    },

    openReview: function(items, location, onDone) {
      var self = RPGACE.modules.dailyLife;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📷 From your photo', title: 'Add to ' + location, width: '460px', noDefaultClose: true });
      var note = document.createElement('div');
      note.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      note.textContent = 'Check what Oracle saw. Untick anything wrong and fix names or amounts. Saving sets the amount you hold.';
      pop.box.appendChild(note);
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:7px 8px;font-family:Rajdhani,sans-serif;min-width:0;';
      var rows = items.map(function(it, i) {
        var r = document.createElement('div');
        r.style.cssText = 'display:grid;grid-template-columns:28px 1fr 64px 72px;gap:6px;align-items:center;margin-bottom:6px;';
        r.innerHTML = '<input type="checkbox" id="dl-ck-' + i + '" checked style="width:20px;height:20px;">' +
          '<input id="dl-nm-' + i + '" type="text" style="' + inp + '">' +
          '<input id="dl-q-' + i + '" type="number" min="0" step="any" style="' + inp + '">' +
          '<input id="dl-u-' + i + '" type="text" placeholder="unit" style="' + inp + '">';
        r.querySelector('#dl-nm-' + i).value = it.name;
        r.querySelector('#dl-q-' + i).value = it.quantity;
        r.querySelector('#dl-u-' + i).value = it.unit || '';
        pop.box.appendChild(r);
        return r;
      });
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:12px;display:none;margin-top:6px;';
      pop.box.appendChild(err);
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:12px;';
      var cancel = document.createElement('button');
      cancel.type = 'button'; cancel.textContent = 'Cancel';
      cancel.style.cssText = 'background:none;border:1px solid var(--border);color:var(--text);' + self.ui._btnCss;
      var save = document.createElement('button');
      save.type = 'button'; save.id = 'dl-save';
      save.style.cssText = 'background:var(--green);border:none;color:#08160f;' + self.ui._btnCss;
      var picked = function() {
        return rows.map(function(r, i) {
          if (!r.querySelector('#dl-ck-' + i).checked) return null;
          var n = r.querySelector('#dl-nm-' + i).value.trim().toLowerCase();
          var q = parseFloat(r.querySelector('#dl-q-' + i).value);
          if (!n || isNaN(q) || q < 0) return null;
          return { name: n, quantity: q, unit: r.querySelector('#dl-u-' + i).value.trim() || null };
        }).filter(Boolean);
      };
      var label = function() { var n = picked().length; save.textContent = 'Add ' + n + ' to ' + location; save.disabled = !n; save.style.opacity = n ? '1' : '0.4'; };
      pop.box.addEventListener('input', label); pop.box.addEventListener('change', label);
      label();
      cancel.onclick = function() { pop.close(); };
      save.onclick = function() {
        var list = picked();
        save.disabled = true;
        self.logic.saveItems(list, location, function(n) { save.textContent = 'Saving ' + n + ' / ' + list.length + '…'; }).then(function(res) {
          if (res.failed.length) {
            err.textContent = 'Saved ' + res.saved + '. Failed: ' + res.failed.join(', ');
            err.style.display = 'block';
            save.disabled = false; label();
          } else {
            pop.close();
            RPGACE.utils.toast('📦 ' + res.saved + ' item' + (res.saved === 1 ? '' : 's') + ' added to the ' + location, '#4caf82', 2500);
          }
          if (onDone) onDone();
        });
      };
      bar.appendChild(cancel); bar.appendChild(save);
      pop.box.appendChild(bar);
    },

    renderInto: function(wrap) {
      var self = RPGACE.modules.dailyLife;
      if (!wrap) return;
      var row = document.getElementById('dl-watch');
      if (!row) {
        row = document.createElement('div');
        row.id = 'dl-watch';
        row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;';
        var out = document.getElementById('mb-output');
        if (out && out.parentNode === wrap) wrap.insertBefore(row, out); else wrap.appendChild(row);
      }
      var days = self.logic.lastDigestDays();
      row.innerHTML = '';
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = '📺 New from your watchlist';
      b.style.cssText = 'background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);color:#C9A84C;' + self.ui._btnCss;
      b.onclick = function() { self.ui.openDigest(); };
      var lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:12px;color:' + (days == null || days >= 7 ? 'var(--gold)' : 'var(--muted)') + ';';
      lbl.textContent = days == null ? 'Weekly check - not run yet' : (days >= 7 ? 'Weekly check due (last ' + days + ' days ago)' : 'Checked ' + (days === 0 ? 'today' : days + ' day' + (days === 1 ? '' : 's') + ' ago'));
      row.appendChild(b); row.appendChild(lbl);
    },

    openDigest: function() {
      var self = RPGACE.modules.dailyLife;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📺 Watchlist', title: 'New this week', width: '560px' });
      var status = document.createElement('div');
      status.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;font-variant-numeric:tabular-nums;';
      status.textContent = 'Checking your creators…';
      pop.box.appendChild(status);
      var list = document.createElement('div');
      pop.box.appendChild(list);
      self.logic.digest(function(n, total) { status.textContent = 'Checked ' + n + ' / ' + total + ' creators…'; }).then(function(d) {
        try { localStorage.setItem(self.LAST_DIGEST_KEY, new Date().toISOString()); } catch (e) {}
        var withNew = d.results.filter(function(r) { return r.videos.length; });
        var failed = d.results.filter(function(r) { return r.failed; }).length;
        var total = withNew.reduce(function(s, r) { return s + r.videos.length; }, 0);
        status.textContent = total + ' new upload' + (total === 1 ? '' : 's') + ' from ' + withNew.length + ' of ' + d.creators + ' YouTube creators in the last 7 days' + (failed ? ' (' + failed + ' couldn\'t be checked)' : '') + '.';
        if (!total) return;
        withNew.forEach(function(r) {
          var h = document.createElement('div');
          h.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin:12px 0 6px;';
          h.textContent = r.creator;
          list.appendChild(h);
          r.videos.forEach(function(v) {
            var url = 'https://www.youtube.com/watch?v=' + v.id;
            var card = document.createElement('div');
            card.style.cssText = 'display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;';
            var txt = document.createElement('div');
            txt.style.cssText = 'flex:1;min-width:180px;';
            var t = document.createElement('a');
            t.href = url; t.target = '_blank'; t.rel = 'noopener';
            t.style.cssText = 'color:var(--text);font-size:14px;text-decoration:none;';
            t.textContent = v.title;
            var m = document.createElement('div');
            m.style.cssText = 'font-size:12px;color:var(--muted);';
            m.textContent = [v.published, v.duration, v.views].filter(Boolean).join(' · ');
            txt.appendChild(t); txt.appendChild(m);
            var a = document.createElement('button');
            a.type = 'button'; a.textContent = '⚡ Analyse';
            a.style.cssText = 'background:none;border:1px solid var(--border);color:var(--text);' + self.ui._btnCss;
            a.onclick = function() {
              if (!RPGACE.modules.shareInbox) return;
              a.disabled = true;
              RPGACE.modules.shareInbox.logic.queue(url, { title: v.title }).then(function(res) {
                a.textContent = res.already ? 'Already ' + res.already : '✓ Queued';
              }).catch(function(e) { a.disabled = false; RPGACE.utils.toast('⚠️ Could not queue: ' + (e.message || e), '#CC4A4A', 3500, 'dailyLife'); });
            };
            card.appendChild(txt); card.appendChild(a);
            list.appendChild(card);
          });
        });
        var mb = document.getElementById('mb-wrap');
        if (mb) self.ui.renderInto(mb);
      }).catch(function(e) { status.textContent = 'Could not load the watchlist: ' + (e.message || e); });
    },
  },

  ownWords: function() { return this.logic.ownWords(); },
  photoButton: function(c, l, d) { return this.ui.photoButton(c, l, d); },
  renderInto: function(w) { return this.ui.renderInto(w); },
});
/* ===END:dailyLife=== */
