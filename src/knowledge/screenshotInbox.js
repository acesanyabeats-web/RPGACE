
/* ===MODULE:screenshotInbox=== */
// Oct 11 2026 — S1 of the ratified /CEO plan "RPGACE Domains, Navigation &
// Deepstash Encyclopedia" (ideas #01 Screenshot brain + #03 photo search,
// records/2026-10/fifty_claude_projects_paranoia_2026-10-10.txt). Alex's
// answers (records/2026-10/s1_screenshot_inbox_build_2026-10-11.txt): keep the
// picture, locked; index + suggest a home; upload in the app AND the Android
// share sheet. Flow: image -> RPGACE.utils.resizeImage -> /api/data-write
// action=screenshots op=upload (private bucket + locked table, service role
// only) -> RPGACE.utils.oracleVision reads text/description/tags/kind and
// suggests up to 2 homes -> op=update. Routing reuses the real writers:
// shoppingWishlist.logic._addItem, encyclopedia_insights (recall schedule),
// journal, cookingOracle's own Generate form. Nothing moves without a tap.
var _rpgaceShotShareAtLoad = (function() {
  try { return new URLSearchParams(location.search).get('share_image') || null; } catch (e) { return null; }
})();

RPGACE.register('screenshotInbox', {
  domain: 'knowledge',

  MAX_SIDE: 1600,
  SHARE_CACHE: 'rpgace-share',
  KINDS: ['recipe', 'product', 'idea', 'music', 'article', 'message', 'rota', 'other'],
  ROUTES: {
    wishlist: { icon: '🛒', label: 'Add to Wishlist' },
    idea:     { icon: '💡', label: 'Save as idea card' },
    recipe:   { icon: '🍳', label: 'Start a recipe' },
    journal:  { icon: '📓', label: 'Journal it' },
    // MD2-3 (Oct 14 2026): the backup route for shifts when the Monday Fourth import fails.
    shifts:   { icon: '🧑‍🍳', label: 'Import shifts' },
  },
  READ_SYSTEM: RPGACE.prompt('screenshot_read'), // RF-7: prompts/screenshot_read.md

  init: function() {
    var self = this;
    // KN-2: /screenshots reached by Back or a direct link renders itself.
    RPGACE.areaNav.onPageShow('screenshots', function() { self.open(); });
    // Made as soon as config is up (before login routes a cold /screenshots link), retried later.
    [0, 1700].forEach(function(ms) { setTimeout(function() { if (RPGACE.CONFIG && RPGACE.CONFIG.pages) RPGACE.areaNav.ensurePage(RPGACE.CONFIG.pages.screenshots, '📸 Screenshot Inbox'); }, ms); });
    if (!_rpgaceShotShareAtLoad) return;
    try { history.replaceState(history.state, '', location.pathname); } catch (e) {}
    var fired = false;
    RPGACE.hooks.on('rpgace:login', function() {
      if (fired) return; fired = true;
      setTimeout(function() { self.ui.handleShare(_rpgaceShotShareAtLoad); }, 800);
    });
  },

  logic: {
    api: function(op, extra) {
      var body = Object.assign({ action: 'screenshots', op: op }, extra || {});
      return fetch('/api/data-write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function(r) { return r.json().catch(function() { return {}; }).then(function(d) {
          if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
          return d.data;
        }); });
    },
    upload: function(file, source, realms) {
      var self = RPGACE.modules.screenshotInbox;
      return RPGACE.utils.resizeImage(file, self.MAX_SIDE, 0.85).then(function(img) {
        return self.logic.api('upload', { base64: img.base64, mediaType: img.mediaType, source: source || 'upload', realms: realms || [] })
          .then(function(row) { return { row: row, image: img }; });
      });
    },
    // Fence-tolerant: first {...} block. Unknown kinds/routes are dropped.
    parse: function(raw) {
      var self = RPGACE.modules.screenshotInbox;
      var t = String(raw || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      var o; try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
      if (!o || typeof o !== 'object') return null;
      var str = function(v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; };
      var tags = (Array.isArray(o.tags) ? o.tags : []).map(function(x) { return str(x, 30).toLowerCase(); }).filter(Boolean).slice(0, 6);
      var kind = self.KINDS.indexOf(str(o.kind, 20).toLowerCase()) !== -1 ? str(o.kind, 20).toLowerCase() : 'other';
      var seen = {};
      var sug = (Array.isArray(o.suggest) ? o.suggest : []).map(function(x) { return str(x, 20).toLowerCase(); })
        .filter(function(x) { if (!self.ROUTES[x] || seen[x]) return false; seen[x] = 1; return true; }).slice(0, 2);
      var desc = str(o.description, 300), text = str(o.text, 1500);
      if (!desc && !text) return null;
      return { extracted_text: text || null, description: desc || null, tags: tags, kind: kind, suggestions: sug };
    },
    read: function(row, image) {
      var self = RPGACE.modules.screenshotInbox;
      var getImage = image ? Promise.resolve(image) : fetch(row.url).then(function(r) {
        if (!r.ok) throw new Error('could not load the stored image');
        return r.blob();
      }).then(function(blob) { return RPGACE.utils.resizeImage(blob, self.MAX_SIDE, 0.85); });
      // RI-4: when realms were picked, say which so the description and
      // tags are written for them (no realms = the plain read, as before).
      var picked = RPGACE.realmPicker.clean(row.realms);
      var lensP = picked.length ? RPGACE.realmLensText(picked).then(function(l) {
        return 'Read this screenshot. Alex saved it for these realms: ' + l.names.join(', ') + '.\n' + l.text;
      }) : Promise.resolve('Read this screenshot.');
      return Promise.all([getImage, lensP]).then(function(r) {
        return RPGACE.utils.oracleVision(r[0], self.READ_SYSTEM, r[1], 1000);
      }).then(function(raw) {
        var p = self.logic.parse(raw);
        if (!p) throw new Error('Oracle\'s reply could not be understood');
        p.status = 'new'; p.read_at = new Date().toISOString();
        return self.logic.api('update', { id: row.id, patch: p }).then(function(res) {
          // LL-4: every read screenshot is also a Life Library item.
          var ll = RPGACE.modules.lifeLibrary;
          if (ll) ll.logic.feedQuiet({
            kind: 'screenshot', title: (p.description || 'Screenshot').slice(0, 120),
            summary: p.description || null, body: p.extracted_text || null,
            topics: p.tags || [], source_table: 'screenshots', source_id: row.id, realms: row.realms || []
          }, 'screenshot');
          return res;
        });
      }).catch(function(e) {
        return self.logic.api('update', { id: row.id, patch: { status: 'read_failed' } }).catch(function() {}).then(function() { throw e; });
      });
    },
    // MD2-3: a second, rota-specific read of the stored picture (one vision call).
    readShifts: function(row) {
      var self = RPGACE.modules.screenshotInbox, ss = RPGACE.modules.shiftSync;
      if (!ss) return Promise.reject(new Error('Shift sync is not loaded'));
      return fetch(row.url).then(function(r) {
        if (!r.ok) throw new Error('could not load the stored image');
        return r.blob();
      }).then(function(blob) { return RPGACE.utils.resizeImage(blob, self.MAX_SIDE, 0.85); })
        .then(function(img) { return RPGACE.utils.oracleVision(img, ss.logic.ROTA_SYSTEM, 'Extract all shifts from this rota screenshot.', 1000); })
        .then(function(raw) { return ss.logic.fromRotaJson(raw); });
    },
    list: function(q, status) { return RPGACE.modules.screenshotInbox.logic.api('list', { q: q || '', status: status || '' }); },
    // Oct 12 2026: before login there is no API secret yet, so the call
    // could only come back 401 - report 0 until signed in.
    count: function() { var ag = RPGACE.modules.authGate; if (!ag || !ag._apiSecret) return Promise.resolve(0); return RPGACE.modules.screenshotInbox.logic.api('count').then(function(d) { return (d && d.count) || 0; }); },
    setStatus: function(id, status, routedTo) {
      var patch = { status: status };
      if (routedTo !== undefined) patch.routed_to = routedTo;
      return RPGACE.modules.screenshotInbox.logic.api('update', { id: id, patch: patch });
    },
    remove: function(id) { return RPGACE.modules.screenshotInbox.logic.api('delete', { id: id }); },
    // Ask My Data: compact rows, no image URLs (text answer only).
    searchRows: function(words) {
      return RPGACE.modules.screenshotInbox.logic.api('list', { q: words || '', withUrls: false }).then(function(rows) {
        return (rows || []).slice(0, 30).map(function(r) {
          return { description: r.description, text: r.extracted_text, tags: (r.tags || []).join(', '), kind: r.kind, status: r.status, saved: r.created_at };
        });
      });
    },
    summary: function(row) {
      return (row.description || '') + (row.extracted_text ? '\n' + row.extracted_text : '');
    },
    toWishlist: function(row, name, price, why) {
      return new Promise(function(resolve, reject) {
        var sw = RPGACE.modules.shoppingWishlist;
        if (!sw || !sw.logic || !sw.logic._addItem) return reject(new Error('Wishlist is not available'));
        sw.logic._addItem({ name: name, priority: 'medium', estimated_price: price, want_reason: why || null, notes: 'From a screenshot: ' + (row.description || '') }, function(err) {
          if (err) reject(new Error(err)); else resolve();
        });
      });
    },
    toIdea: function(row, text) {
      var rc = RPGACE.modules.recall;
      return RPGACE.sb.secureWrite('encyclopedia_insights', 'insert', {
        source_entry_id: 'shot:' + row.id,
        realms: row.realms || [], // RI-5
        source_entry_title: 'Screenshot — ' + (row.description || 'saved screenshot'),
        insight_text: text,
        idea_section: 'learning',
        idea_order: 0,
        saved_at: new Date().toISOString(),
        recall_step: 0,
        recall_due: rc && rc.logic && rc.logic.dueIn ? rc.logic.dueIn(0) : null,
      }).then(function() { RPGACE.cache.clear('encyclopedia_insights'); });
    },
    toJournal: function(row, title, content) {
      return RPGACE.sb.secureWrite('journal', 'insert', {
        title: '📸 ' + title,
        content: content || '',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        source: 'screenshot_inbox',
        created_at: new Date().toISOString(),
      }).then(function() { RPGACE.cache.clear('journal'); });
    },
  },

  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, kind) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
        (kind === 'primary' ? 'background:var(--purple);border:none;color:#fff;'
          : kind === 'suggest' ? 'background:rgba(155,89,182,0.14);border:1px solid var(--purple);color:var(--text);'
          : 'background:none;border:1px solid var(--border);color:var(--text);');
      return b;
    },
    _input: function(id, value, placeholder, type) {
      var i = document.createElement(type === 'area' ? 'textarea' : 'input');
      i.id = id;
      if (type && type !== 'area') i.type = type;
      if (type === 'area') i.rows = 4;
      i.value = value || ''; i.placeholder = placeholder || '';
      i.setAttribute('aria-label', placeholder || id);
      i.style.cssText = 'width:100%;box-sizing:border-box;min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-size:14px;font-family:inherit;';
      return i;
    },

    open: function(opts) {
      var self = RPGACE.modules.screenshotInbox;
      opts = opts || {};
      var state = { filter: opts.id ? 'all' : 'tosort', q: '' };
      // KN-2 (Oct 15 2026): a full page (/screenshots) instead of a popup.
      var pop = RPGACE.areaNav.page('knowledge', RPGACE.CONFIG.pages.screenshots, '📸 Screenshot Inbox',
        { key: 'screenshots', label: 'Screenshots', open: function() { self.open(); } });
      if (!pop) return null;

      var top = document.createElement('div');
      top.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;';
      var file = document.createElement('input');
      file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.id = 'shot-file'; file.style.display = 'none';
      var add = self.ui._btn('➕ Add screenshots', 'primary');
      add.onclick = function() { file.click(); };
      var search = self.ui._input('shot-search', '', 'Search what they say', 'search');
      search.style.flex = '1 1 180px'; search.style.width = 'auto';
      top.appendChild(add); top.appendChild(search); top.appendChild(file);
      pop.box.appendChild(top);

      var chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      var FILTERS = [['tosort', 'To sort'], ['all', 'All'], ['kept', 'Kept'], ['routed', 'Sorted']];
      pop.box.appendChild(chips);
      var status = document.createElement('div');
      status.setAttribute('role', 'status');
      status.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;min-height:18px;';
      pop.box.appendChild(status);
      var list = document.createElement('div');
      pop.box.appendChild(list);

      var drawChips = function() {
        chips.innerHTML = '';
        FILTERS.forEach(function(f) {
          var c = self.ui._btn(f[1], state.filter === f[0] ? 'suggest' : '');
          c.setAttribute('aria-pressed', state.filter === f[0] ? 'true' : 'false');
          c.onclick = function() { state.filter = f[0]; drawChips(); load(); };
          chips.appendChild(c);
        });
      };
      var statusFor = { tosort: 'new,unread,read_failed', all: '', kept: 'kept', routed: 'routed' };
      var load = function() {
        list.innerHTML = '<div style="color:var(--muted);font-size:13px;">Loading…</div>';
        self.logic.list(state.q, statusFor[state.filter]).then(function(rows) {
          if (opts.id) rows = rows.filter(function(r) { return r.id === opts.id; }).concat(rows.filter(function(r) { return r.id !== opts.id; }));
          self.ui.renderList(list, rows, load, state);
        }).catch(function(e) {
          list.innerHTML = '';
          var m = document.createElement('div'); m.style.color = '#CC4A4A'; m.textContent = 'Could not load screenshots: ' + (e.message || e);
          list.appendChild(m);
        });
      };
      var t = null;
      search.oninput = function() { clearTimeout(t); t = setTimeout(function() { state.q = search.value.trim(); if (state.q) state.filter = 'all'; drawChips(); load(); }, 350); };
      file.onchange = function() {
        var files = Array.prototype.slice.call(file.files || []);
        file.value = '';
        if (!files.length) return;
        add.disabled = true;
        self.ui.ingest(files, 'upload', function(msg) { status.textContent = msg; }).then(function(res) {
          add.disabled = false;
          status.textContent = res.saved + ' saved' + (res.failed.length ? ', ' + res.failed.length + ' failed: ' + res.failed.join('; ') : '') + '.';
          state.filter = 'tosort'; drawChips(); load();
        });
      };
      drawChips(); load();
      return pop;
    },

    // Upload + read one at a time (bounded cost, clear progress).
    // RI-2: one realm pick for the whole batch, before anything is saved.
    ingest: function(files, source, onProgress) {
      var self = RPGACE.modules.screenshotInbox;
      var saved = 0, failed = [], lastRow = null, realms = [];
      var ask = RPGACE.realmPicker.pick({ what: 'screenshot' + (files.length === 1 ? '' : 's'),
        title: files.length === 1 ? (files[0].name || '1 screenshot') : files.length + ' screenshots' })
        .then(function(r) { realms = r || []; });
      return files.reduce(function(p, f, i) {
        return p.then(function() {
          if (onProgress) onProgress('Saving ' + (i + 1) + ' of ' + files.length + '…');
          return self.logic.upload(f, source, realms).then(function(up) {
            saved++;
            if (onProgress) onProgress('Oracle is reading ' + (i + 1) + ' of ' + files.length + '…');
            return self.logic.read(up.row, up.image).then(function(row) { lastRow = row; }, function(e) {
              lastRow = up.row;
              failed.push((f.name || 'image') + ' saved but not read (' + (e.message || e) + ')');
            });
          }, function(e) { failed.push((f.name || 'image') + ': ' + (e.message || e)); });
        });
      }, ask).then(function() { return { saved: saved, failed: failed, lastRow: lastRow }; });
    },

    renderList: function(list, rows, reload, state) {
      var self = RPGACE.modules.screenshotInbox;
      list.innerHTML = '';
      if (!rows.length) {
        var e = document.createElement('div');
        e.style.cssText = 'color:var(--muted);font-size:13px;padding:12px 0;';
        e.textContent = state.q ? 'No screenshots match "' + state.q + '".' : (state.filter === 'tosort' ? 'Nothing to sort. Add screenshots, or share one to RPGACE from your phone.' : 'No screenshots here yet.');
        list.appendChild(e);
        return;
      }
      rows.forEach(function(r) { list.appendChild(self.ui.card(r, reload)); });
    },

    card: function(r, reload) {
      var self = RPGACE.modules.screenshotInbox, esc = self.ui._esc;
      var c = document.createElement('div');
      c.className = 'shot-card';
      c.style.cssText = 'display:grid;grid-template-columns:96px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--border);';
      var thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.setAttribute('aria-label', 'View full screenshot');
      thumb.style.cssText = 'padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--panel2);cursor:pointer;height:128px;width:96px;';
      if (r.url) { var img = document.createElement('img'); img.src = r.url; img.alt = r.description || 'Screenshot'; img.loading = 'lazy'; img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'; thumb.appendChild(img); }
      else thumb.textContent = '📸';
      thumb.onclick = function() { self.ui.viewFull(r); };
      c.appendChild(thumb);

      var body = document.createElement('div');
      body.style.cssText = 'min-width:0;font-size:13px;color:var(--text);';
      var when = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      var head = '<div style="font-size:14px;font-weight:700;line-height:1.35;">' + esc(r.description || (r.status === 'read_failed' ? 'Oracle could not read this one' : r.status === 'unread' ? 'Not read yet' : 'Screenshot')) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin:2px 0 6px;">' + esc(when) + (r.kind ? ' · ' + esc(r.kind) : '') +
        (r.status === 'routed' ? ' · sent to ' + esc(r.routed_to || '') : r.status === 'kept' ? ' · kept' : '') +
        ((r.tags || []).length ? ' · ' + esc(r.tags.join(', ')) : '') + '</div>';
      body.innerHTML = head;
      if (r.extracted_text) {
        var d = document.createElement('details');
        d.innerHTML = '<summary style="cursor:pointer;color:var(--muted);font-size:12px;min-height:32px;">Text Oracle read</summary>';
        var p = document.createElement('div');
        p.style.cssText = 'white-space:pre-wrap;font-size:13px;line-height:1.45;margin-top:4px;';
        p.textContent = r.extracted_text.split(' / ').join('\n');
        d.appendChild(p); body.appendChild(d);
      }
      var form = document.createElement('div');
      form.style.cssText = 'margin-top:8px;';
      var acts = document.createElement('div');
      acts.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';
      var sug = r.suggestions || [];
      if (r.status === 'unread' || r.status === 'read_failed') {
        var again = self.ui._btn('🔮 Read it', 'primary');
        again.onclick = function() {
          again.disabled = true; again.textContent = 'Reading…';
          self.logic.read(r).then(reload, function(e) { again.disabled = false; again.textContent = '🔮 Read it'; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'screenshotInbox'); });
        };
        acts.appendChild(again);
      }
      var order = sug.concat(Object.keys(self.ROUTES).filter(function(k) { return sug.indexOf(k) === -1; }));
      order.forEach(function(k) {
        var rt = self.ROUTES[k];
        var b = self.ui._btn(rt.icon + ' ' + rt.label + (sug.indexOf(k) !== -1 ? ' ★' : ''), sug.indexOf(k) !== -1 ? 'suggest' : '');
        if (sug.indexOf(k) !== -1) b.title = 'Oracle suggests this';
        b.onclick = function() { self.ui.routeForm(k, r, form, reload); };
        acts.appendChild(b);
      });
      // KN-5: a read screenshot is also a Library item - one tap to it.
      var LL = RPGACE.modules.lifeLibrary;
      if (r.status !== 'unread' && r.status !== 'read_failed' && LL && LL.logic.signedIn()) {
        var inLib = self.ui._btn('📚 In your Library'); inLib.className = 'shot-lib';
        inLib.onclick = function() { LL.open({ focusSource: { table: 'screenshots', id: r.id }, onMissing: function() { RPGACE.utils.toast('Not in your Library yet', '#888', 2200); } }); };
        acts.appendChild(inLib);
      }
      if (r.status !== 'kept') {
        var keep = self.ui._btn('📌 Keep in inbox');
        keep.onclick = function() { keep.disabled = true; self.logic.setStatus(r.id, 'kept').then(reload, function(e) { keep.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'screenshotInbox'); }); };
        acts.appendChild(keep);
      }
      var del = self.ui._btn('🗑 Delete');
      var armed = false, timer = null;
      del.onclick = function() {
        if (!armed) { armed = true; del.textContent = 'Tap again to delete'; del.style.borderColor = '#CC4A4A'; timer = setTimeout(function() { armed = false; del.textContent = '🗑 Delete'; del.style.borderColor = ''; }, 3000); return; }
        clearTimeout(timer); del.disabled = true;
        self.logic.remove(r.id).then(reload, function(e) { del.disabled = false; RPGACE.utils.toast('⚠️ Delete failed: ' + (e.message || e), '#CC4A4A', 3500, 'screenshotInbox'); });
      };
      acts.appendChild(del);
      body.appendChild(acts);
      body.appendChild(form);
      c.appendChild(body);
      return c;
    },

    viewFull: function(r) {
      if (!r.url) return;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📸 Screenshot', title: r.description || 'Screenshot', width: '720px' });
      var img = document.createElement('img');
      img.src = r.url; img.alt = r.description || 'Screenshot';
      img.style.cssText = 'max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;';
      pop.box.appendChild(img);
    },

    // Inline confirm form per destination; the write only happens on its button.
    routeForm: function(kind, r, form, reload) {
      var self = RPGACE.modules.screenshotInbox;
      form.innerHTML = '';
      form.style.cssText = 'margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:8px;display:grid;gap:8px;';
      var done = function(label) {
        return self.logic.setStatus(r.id, 'routed', kind).then(function() {
          RPGACE.utils.toast('📸 ' + label, '#4caf82', 2500);
          reload();
        });
      };
      var fail = function(btn, txt) { return function(e) { btn.disabled = false; btn.textContent = txt; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'screenshotInbox'); }; };
      var cancel = self.ui._btn('Cancel');
      cancel.onclick = function() { form.innerHTML = ''; form.style.cssText = 'margin-top:8px;'; };
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
      if (kind === 'shifts') {
        // Read the shifts off the stored picture, show them, save only on a tap.
        var ss = RPGACE.modules.shiftSync;
        var info = document.createElement('div');
        info.className = 'shot-shifts-info';
        info.style.cssText = 'font-size:13px;color:var(--muted);';
        info.textContent = '🧑‍🍳 Reading the shifts…';
        form.appendChild(info);
        self.logic.readShifts(r).then(function(list) {
          if (!list || !list.length) { info.textContent = 'No shifts could be read from this picture. Try a clearer screenshot of the rota.'; form.appendChild(cancel); return; }
          info.textContent = list.length + ' shift' + (list.length === 1 ? '' : 's') + ' found — untick any that are wrong:';
          var boxes = list.map(function(sh, i) {
            var lab = document.createElement('label');
            lab.className = 'shot-shift';
            lab.style.cssText = 'display:flex;align-items:center;gap:8px;min-height:36px;font-size:14px;color:var(--text);cursor:pointer;';
            var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.style.cssText = 'width:20px;height:20px;';
            lab.appendChild(cb);
            lab.appendChild(document.createTextNode(sh.day + ' ' + sh.date.split('-').reverse().join('/') + ' · ' + sh.start + '–' + sh.end + (sh.role ? ' · ' + sh.role : '')));
            form.appendChild(lab);
            return cb;
          });
          var save = self.ui._btn('Save shifts', 'primary');
          save.className += ' shot-shifts-save';
          save.onclick = function() {
            var pick = list.filter(function(sh, i) { return boxes[i].checked; });
            if (!pick.length) { RPGACE.utils.toast('Tick at least one shift', '#e0a84c', 2500); return; }
            save.disabled = true; save.textContent = 'Saving…';
            ss.logic.replaceDates(pick, 'rota screenshot (inbox)').then(function(res) {
              return done(res.saved + ' shift' + (res.saved === 1 ? '' : 's') + ' saved' + (res.pushed ? '' : ' (will sync when online)'));
            }).catch(fail(save, 'Save shifts'));
          };
          bar.appendChild(cancel); bar.appendChild(save);
          form.appendChild(bar);
        }).catch(function(e) { info.textContent = '⚠️ ' + (e.message || e); form.appendChild(cancel); });
        return;
      }
      if (kind === 'wishlist') {
        var name = self.ui._input('shot-wish-name-' + r.id, (r.description || '').slice(0, 80), 'Item name');
        var price = self.ui._input('shot-wish-price-' + r.id, '', '£ estimated price (optional)', 'number');
        price.step = '0.01'; price.min = '0';
        var why = self.ui._input('shot-wish-why-' + r.id, '', 'Why do you want it? (optional)');
        var go = self.ui._btn('Add to Wishlist', 'primary');
        go.onclick = function() {
          var n = name.value.trim(); if (!n) { name.focus(); return; }
          go.disabled = true; go.textContent = 'Adding…';
          self.logic.toWishlist(r, n, price.value ? Number(price.value) : null, why.value.trim()).then(function() { return done('Added to your Wishlist'); }).catch(fail(go, 'Add to Wishlist'));
        };
        [name, price, why].forEach(function(x) { form.appendChild(x); });
        bar.appendChild(cancel); bar.appendChild(go);
      } else if (kind === 'idea') {
        var txt = self.ui._input('shot-idea-' + r.id, self.logic.summary(r).slice(0, 600), 'The idea, in your words', 'area');
        var save = self.ui._btn('Save idea card', 'primary');
        save.onclick = function() {
          var v = txt.value.trim(); if (!v) { txt.focus(); return; }
          save.disabled = true; save.textContent = 'Saving…';
          self.logic.toIdea(r, v).then(function() { return done('Saved — it comes back in your Morning Brief'); }).catch(fail(save, 'Save idea card'));
        };
        form.appendChild(txt);
        bar.appendChild(cancel); bar.appendChild(save);
      } else if (kind === 'journal') {
        var jt = self.ui._input('shot-jt-' + r.id, (r.description || 'Screenshot note').slice(0, 120), 'Title');
        var jc = self.ui._input('shot-jc-' + r.id, r.extracted_text ? r.extracted_text.split(' / ').join('\n') : '', 'Note', 'area');
        var jg = self.ui._btn('Save to Journal', 'primary');
        jg.onclick = function() {
          jg.disabled = true; jg.textContent = 'Saving…';
          self.logic.toJournal(r, jt.value.trim() || 'Screenshot note', jc.value).then(function() { return done('Saved to your Journal'); }).catch(fail(jg, 'Save to Journal'));
        };
        form.appendChild(jt); form.appendChild(jc);
        bar.appendChild(cancel); bar.appendChild(jg);
      } else if (kind === 'recipe') {
        var co = RPGACE.modules.cookingOracle;
        var note = document.createElement('div');
        note.style.cssText = 'font-size:13px;color:var(--muted);';
        note.textContent = 'Opens Cooking\'s Generate form with this screenshot\'s text filled in. You still choose servings and press Generate.';
        var open = self.ui._btn('Open in Cooking', 'primary');
        open.onclick = function() {
          if (!co || !co.logic || !co.ui || !co.ui._showGenerateForm) { RPGACE.utils.toast('⚠️ Cooking is not available', '#CC4A4A', 3000, 'screenshotInbox'); return; }
          var desc = ((r.description || '') + (r.extracted_text ? ' — ' + r.extracted_text : '')).slice(0, 700);
          open.disabled = true;
          self.logic.setStatus(r.id, 'routed', 'recipe').catch(function() {}).then(function() {
            co.logic._loadConfig(function(cfg) { co.ui._showGenerateForm(cfg || {}, desc); });
          });
        };
        form.appendChild(note);
        bar.appendChild(cancel); bar.appendChild(open);
      }
      form.appendChild(bar);
    },

    // Android share sheet -> sw.js stored the image in the share cache and
    // opened /?share_image=<key>. Save + read it, then return to the app it
    // came from (shareInbox's own sent screen, rule 8).
    handleShare: function(key) {
      var self = RPGACE.modules.screenshotInbox;
      var si = RPGACE.modules.shareInbox;
      var cacheKey = '/shared-image/' + key;
      if (!('caches' in window)) { RPGACE.utils.toast('⚠️ This browser cannot receive shared images', '#CC4A4A', 4000, 'screenshotInbox'); return; }
      var cache;
      caches.open(self.SHARE_CACHE).then(function(c) { cache = c; return c.match(cacheKey); }).then(function(res) {
        if (!res) throw new Error('the shared image was not found - try sharing it again');
        return res.blob();
      }).then(function(blob) {
        RPGACE.utils.toast('📸 Saving your screenshot…', '#9B59B6', 3000);
        return self.ui.ingest([blob], 'share', null);
      }).then(function(res) {
        if (cache) cache.delete(cacheKey);
        if (!res.saved) throw new Error(res.failed.join('; ') || 'upload failed');
        var d = res.lastRow && res.lastRow.description;
        if (si && si.ui && si.ui.sentScreen) si.ui.sentScreen('Screenshot', false, { title: 'Saved to Screenshot Inbox', sub: d ? 'Oracle read it: ' + d : (res.failed.length ? 'Saved — Oracle will read it when you open the inbox.' : 'Saved.') });
        else self.ui.open();
      }).catch(function(e) {
        RPGACE.utils.toast('⚠️ Could not save the shared screenshot: ' + (e.message || e), '#CC4A4A', 5000, 'screenshotInbox');
      });
    },
  },

  open: function(opts) { return this.ui.open(opts); },
});
/* ===END:screenshotInbox=== */
