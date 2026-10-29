
/* ===MODULE:eventMemories=== */
// DR-6 (Oct 27 2026, plan "Day & Habits Rewire"). Alex: "I need an option for
// one off events", "Save one off events in table as memories I can revisit for
// nostalgia", "Chronicles entry + optional note/photo". One private table
// (memories): an event is status 'upcoming' with a date (+ time) and shows on
// that day's timeline (an rpgace_agendas row, source_type 'event'); after the
// day My Day asks "How was it?" and it becomes a kept memory (note, photo via
// screenshotInbox's private proof upload) - Chronicles lists kept memories and
// 🎞 Memories lets him look back. Confirming pays its realm through the done
// ledger (quest_log quest_kind 'memory', +25), no new XP path.
RPGACE.register('eventMemories', {
  domain: 'schedule',
  XP: 25,
  _rows: null,
  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.chronicles) {
        var cp = document.getElementById('page-' + name);
        if (cp && !cp._evExtras) { cp._evExtras = true; cp._sideExtras = function() { return [['🎞', 'Memories', function() { self.ui.openMemories(); }, 'ev:mem']]; }; }
        return;
      }
      if (name !== RPGACE.CONFIG.pages.agenda) return;
      setTimeout(function() { self.ui.askLine(true); self.ui.sideExtras(); }, 500);
    });
    // My Day's render clears its panel; put the line back from the cached rows.
    RPGACE.hooks.on('myday:rendered', function() { self.ui.askLine(false); });
  },
  logic: {
    read: function(params) { var tp = RPGACE.modules.tripPlans; return tp && tp.logic.signedIn() ? tp.logic.read('memories', params) : Promise.resolve([]); },
    iso: function(d) { return RPGACE.modules.myDay.logic.iso(d); },
    load: function() {
      var self = RPGACE.modules.eventMemories;
      return self.logic.read('select=*&status=in.(upcoming,kept)&order=happened_on.desc&limit=500').then(function(r) { self._rows = Array.isArray(r) ? r : []; return self._rows; });
    },
    // Events whose day has passed and are still waiting for "How was it?". Pure.
    pending: function(rows, today) { return (rows || []).filter(function(r) { return r.status === 'upcoming' && r.happened_on < today; }); },
    upcoming: function(rows, today) { return (rows || []).filter(function(r) { return r.status === 'upcoming' && r.happened_on >= today; }); },
    kept: function(rows) { return (rows || []).filter(function(r) { return r.status === 'kept'; }); },
    addEvent: function(f) {
      var title = String(f.title || '').trim().slice(0, 120), xs = RPGACE.modules.xpSeason;
      if (!title) return Promise.reject(new Error('Name the event.'));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return Promise.reject(new Error('Pick the date.'));
      var realm = f.realm && xs && xs.REALMS[f.realm] ? f.realm : 'connector';
      var row = { title: title, happened_on: f.date, at_time: f.time || null, realm: realm, place: f.place || null, people: f.people || null, status: 'upcoming', source: 'event' };
      return RPGACE.sb.secureWrite('memories', 'insert', row).then(function(data) {
        var saved = Array.isArray(data) && data[0];
        if (!saved || !saved.id) throw new Error('The event saved but came back without an id - reopen My Day.');
        var m = /^(\d{1,2}):(\d{2})/.exec(f.time || '');
        var ag = { date: f.date, hour: m ? +m[1] : 12, minute: m ? +m[2] : 0, title: '📅 ' + title, description: [f.place, f.people].filter(Boolean).join(' · ') || null,
          category: 'personal', xp: 0, estimated_mins: Number(f.mins) || 120, source_type: 'event', source_id: String(saved.id), realms: [realm] };
        return RPGACE.sb.secureWrite('rpgace_agendas', 'insert', ag).then(function(a) {
          var aid = Array.isArray(a) && a[0] && a[0].id;
          RPGACE.cache.clear('rpgace_agendas');
          return aid ? RPGACE.sb.secureWrite('memories', 'update', { agenda_id: String(aid) }, 'id=eq.' + saved.id).then(function() { return saved; }) : saved;
        });
      });
    },
    // "How was it?" -> a kept memory; optional photo; +25 to its realm.
    remember: function(ev, f) {
      var L = RPGACE.modules.eventMemories.logic, si = RPGACE.modules.screenshotInbox;
      var photo = f.file && si ? si.logic.upload(f.file, 'proof', [ev.realm]).then(function(x) { return x && x.row ? String(x.row.id) : null; }) : Promise.resolve(null);
      return photo.then(function(pid) {
        var patch = { status: 'kept', note: f.note ? String(f.note).slice(0, 1000) : null, updated_at: new Date().toISOString() };
        if (pid) patch.photo_id = pid;
        return RPGACE.sb.secureWrite('memories', 'update', patch, 'id=eq.' + ev.id).then(function() { Object.assign(ev, patch); return L.pay(ev); });
      });
    },
    pay: function(ev) {
      return RPGACE.sb.secureWrite('quest_log', 'insert', { quest_key: 'memory:' + ev.id, quest_kind: 'memory', name: ev.title, category: ev.realm, quest_type: 'memory',
        xp: RPGACE.modules.eventMemories.XP, source_table: 'memories', source_ref: String(ev.id), status: 'completed', completed_at: new Date().toISOString() });
    },
    // Oct 29 2026 (Alex: "i want to be able to edit log so i can add details, like i did with freya pub crawl in same
    // format to leave reflection and impression"): edit a memory's details any time.
    update: function(ev, f) {
      var si = RPGACE.modules.screenshotInbox;
      var photo = f.file && si ? si.logic.upload(f.file, 'proof', [ev.realm]).then(function(x) { return x && x.row ? String(x.row.id) : null; }) : Promise.resolve(null);
      return photo.then(function(pid) {
        var patch = { title: String(f.title || ev.title).trim().slice(0, 120) || ev.title, people: f.people || null, place: f.place || null,
          note: f.note ? String(f.note).slice(0, 4000) : null, updated_at: new Date().toISOString() };
        if (pid) patch.photo_id = pid;
        return RPGACE.sb.secureWrite('memories', 'update', patch, 'id=eq.' + ev.id).then(function() { Object.assign(ev, patch); return ev; });
      });
    },
    // A logged or finished block becomes a memory you can add details to (same format as events). The block already
    // paid its XP, so this one does not pay again ("no double counting"). Found again by date + start + realm.
    forBlock: function(b) {
      var L = RPGACE.modules.eventMemories.logic, md = RPGACE.modules.myDay;
      var at = String(b.start_time || '').slice(0, 5);
      return L.read('select=*&source=eq.block&happened_on=eq.' + b.block_date + '&realm=eq.' + (b.realm || 'life') + '&at_time=eq.' + at + '&limit=1').then(function(rows) {
        if (Array.isArray(rows) && rows[0]) return rows[0];
        var title = (b.items || []).map(function(i) { return i.label; }).join(' · ') || (md ? md.logic.blockLabel(b) : 'Block');
        return RPGACE.sb.secureWrite('memories', 'insert', { title: title.slice(0, 120), happened_on: b.block_date, at_time: at, realm: b.realm || 'life', status: 'kept', source: 'block' })
          .then(function(data) { var s = Array.isArray(data) && data[0]; if (!s || !s.id) throw new Error('The memory saved but came back without an id.'); RPGACE.cache.clear('memories'); return s; });
      });
    },
    // It didn't happen: dropped, never deleted.
    drop: function(ev) { return RPGACE.sb.secureWrite('memories', 'update', { status: 'dropped' }, 'id=eq.' + ev.id).then(function() { ev.status = 'dropped'; }); },
  },
  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, primary, id) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (id) b.id = id;
      b.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;' + (primary ? 'background:var(--gold);border:none;color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
      return b;
    },
    // A one-line "How was it?" card at the top of My Day while any wait.
    askLine: function(fresh) {
      var self = RPGACE.modules.eventMemories, L = self.logic, today = L.iso();
      var get = fresh || !self._rows ? L.load() : Promise.resolve(self._rows);
      return get.then(function(rows) {
        var pg = document.getElementById('page-' + RPGACE.CONFIG.pages.agenda), old = document.getElementById('ev-howwas');
        if (old) old.remove();
        var p = L.pending(rows, today);
        if (!pg || !p.length) return;
        var b = self.ui._btn('🎞 How was ' + p[0].title + '?' + (p.length > 1 ? ' (+' + (p.length - 1) + ' more)' : ''), false, 'ev-howwas');
        b.style.cssText += 'display:block;width:100%;margin:0 0 10px;text-align:left;';
        b.onclick = function() { self.ui.openHowWas(p[0]); };
        // My Day's layout hides every page child except #myday-panel.
        var host = document.getElementById('myday-panel') || pg;
        host.insertBefore(b, host.firstChild);
      }).catch(function() {});
    },
    sideExtras: function() {
      var self = RPGACE.modules.eventMemories, pg = document.getElementById('page-' + RPGACE.CONFIG.pages.agenda);
      if (!pg || pg._evExtras) return;
      pg._evExtras = true;
      var prev = pg._sideExtras;
      pg._sideExtras = function() {
        var mine = [['📅', 'Add a one-off event', function() { self.ui.openAdd(); }, 'ev:add'], ['🎞', 'Memories', function() { self.ui.openMemories(); }, 'ev:mem']];
        return mine.concat(RPGACE.sideList ? RPGACE.sideList.extrasOf({ _sideExtras: prev }) : []);
      };
    },
    openAdd: function(onDone) {
      var self = RPGACE.modules.eventMemories, L = self.logic, U = self.ui, xs = RPGACE.modules.xpSeason;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📅 ONE-OFF EVENT', title: 'Add an event', width: '440px' });
      var f = document.createElement('div'); f.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var inp = function(id, ph, type) { var i = document.createElement('input'); i.id = id; i.placeholder = ph; i.type = type || 'text'; i.style.cssText = 'min-height:42px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;'; f.appendChild(i); return i; };
      var t = inp('ev-title', 'What is it? (interview, birthday drinks...)'), d = inp('ev-date', '', 'date'), tm = inp('ev-time', '', 'time'), pl = inp('ev-place', 'Where (optional)'), pe = inp('ev-people', 'Who with (optional)');
      d.value = L.iso();
      var sel = document.createElement('select'); sel.id = 'ev-realm'; sel.style.cssText = 'min-height:42px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;';
      (xs ? xs.ORDER : ['connector']).forEach(function(k) { var o = document.createElement('option'); o.value = k; o.textContent = ((xs && xs.REALMS[k] || {}).icon || '') + ' ' + ((xs && xs.REALMS[k] || {}).name || k); if (k === 'connector') o.selected = true; sel.appendChild(o); });
      f.appendChild(sel);
      var go = U._btn('Save event', true, 'ev-save'); f.appendChild(go);
      go.onclick = function() {
        go.disabled = true;
        L.addEvent({ title: t.value, date: d.value, time: tm.value, place: pl.value.trim(), people: pe.value.trim(), realm: sel.value }).then(function() {
          pop.close(); RPGACE.utils.toast('📅 ' + t.value.trim() + ' on ' + d.value, '#4caf82', 2200);
          var md = RPGACE.modules.myDay; if (md) md.logic.load().then(function() { md.ui.render(); }).catch(function() {});
          if (onDone) onDone();
        }, function(e) { go.disabled = false; RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'eventMemories'); });
      };
      pop.box.appendChild(f);
      return pop;
    },
    openHowWas: function(ev) {
      var self = RPGACE.modules.eventMemories, L = self.logic, U = self.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎞 HOW WAS IT?', title: ev.title, width: '440px' });
      var f = document.createElement('div'); f.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var sub = document.createElement('div'); sub.style.cssText = 'font-size:13px;color:var(--muted);';
      sub.textContent = ev.happened_on + [ev.place, ev.people].filter(Boolean).map(function(x) { return ' · ' + x; }).join('');
      f.appendChild(sub);
      var note = document.createElement('textarea'); note.id = 'ev-note'; note.placeholder = 'One line to remember it by (optional)';
      note.style.cssText = 'min-height:70px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;';
      f.appendChild(note);
      var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.id = 'ev-photo'; f.appendChild(file);
      var keep = U._btn('🎞 Save the memory (+' + self.XP + ' XP)', true, 'ev-keep'), skip = U._btn("It didn't happen", false, 'ev-drop');
      keep.onclick = function() {
        keep.disabled = true;
        L.remember(ev, { note: note.value.trim(), file: file.files && file.files[0] }).then(function() {
          pop.close(); RPGACE.utils.toast('🎞 Saved: ' + ev.title, '#4caf82', 2200); self.ui.askLine(true);
        }, function(e) { keep.disabled = false; RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'eventMemories'); });
      };
      skip.onclick = function() { skip.disabled = true; L.drop(ev).then(function() { pop.close(); self.ui.askLine(true); }, function(e) { skip.disabled = false; RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'eventMemories'); }); };
      f.appendChild(keep); f.appendChild(skip);
      pop.box.appendChild(f);
      return pop;
    },
    openEdit: function(ev, onSaved) {
      var self = RPGACE.modules.eventMemories, L = self.logic, U = self.ui, xs = RPGACE.modules.xpSeason, R = (xs && xs.REALMS[ev.realm]) || {};
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎞 ' + (R.icon || '') + ' ' + (R.name || ev.realm || ''), title: 'Edit memory', width: '480px' });
      pop.box.id = 'ev-edit';
      var css = 'min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;font-family:inherit;width:100%;box-sizing:border-box;';
      var f = document.createElement('div'); f.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var sub = document.createElement('div'); sub.style.cssText = 'font-size:13px;color:var(--muted);'; sub.textContent = ev.happened_on + (ev.at_time ? ' · ' + ev.at_time : ''); f.appendChild(sub);
      var field = function(id, ph, val, area) { var x = document.createElement(area ? 'textarea' : 'input'); if (!area) x.type = 'text'; x.id = id; x.placeholder = ph; x.value = val || ''; x.style.cssText = css + (area ? 'min-height:120px;' : ''); f.appendChild(x); return x; };
      var ti = field('ev-edit-title', 'What was it?', ev.title), pe = field('ev-edit-people', 'Who with?', ev.people), pl = field('ev-edit-place', 'Where?', ev.place);
      var no = field('ev-edit-note', 'Reflection and impression — how was it, what stood out?', ev.note, true);
      var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.id = 'ev-edit-photo'; f.appendChild(file);
      if (ev.photo_id) { var ph = document.createElement('div'); ph.style.cssText = 'font-size:12px;color:var(--muted);'; ph.textContent = '📷 A photo is saved (adding one replaces it)'; f.appendChild(ph); }
      var sv = U._btn('💾 Save', true, 'ev-edit-save');
      sv.onclick = function() {
        sv.disabled = true;
        L.update(ev, { title: ti.value, people: pe.value.trim(), place: pl.value.trim(), note: no.value.trim(), file: file.files && file.files[0] }).then(function() {
          pop.close(); RPGACE.utils.toast('🎞 Saved: ' + ev.title, '#4caf82', 2000); RPGACE.cache.clear('memories'); if (onSaved) onSaved(ev);
        }, function(e) { sv.disabled = false; RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'eventMemories'); });
      };
      f.appendChild(sv); pop.box.appendChild(f);
      return pop;
    },
    openMemories: function() {
      var self = RPGACE.modules.eventMemories, L = self.logic, U = self.ui, xs = RPGACE.modules.xpSeason, today = L.iso();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎞 MEMORIES', title: 'Things you did', width: '520px', scroll: true });
      pop.box.id = 'ev-memories';
      var add = U._btn('📅 Add a one-off event', false, 'ev-mem-add'); add.onclick = function() { pop.close(); U.openAdd(); }; pop.box.appendChild(add);
      L.load().then(function(rows) {
        var up = L.upcoming(rows, today), kept = L.kept(rows);
        var sec = function(title, list) {
          if (!list.length) return;
          var h = document.createElement('div'); h.style.cssText = 'font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin:14px 0 6px;'; h.textContent = title; pop.box.appendChild(h);
          list.forEach(function(r) {
            var R = (xs && xs.REALMS[r.realm]) || {};
            var d = document.createElement('div'); d.className = 'ev-mem'; d.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;';
            d.innerHTML = '<b>' + U._esc(r.title) + '</b> <span style="color:var(--muted);">' + U._esc(r.happened_on) + (r.at_time ? ' ' + U._esc(r.at_time) : '') + ' · ' + (R.icon || '') + ' ' + U._esc(R.name || r.realm) + '</span>' +
              ([r.place, r.people].filter(Boolean).length ? '<br><span style="color:var(--muted);">' + U._esc([r.place, r.people].filter(Boolean).join(' · ')) + '</span>' : '') +
              (r.note ? '<br>' + U._esc(r.note) : '') + (r.photo_id ? '<br><span style="color:var(--muted);">📷 photo saved</span>' : '');
            if (r.status === 'kept') { var ed = U._btn('✏️ Edit', false, ''); ed.className += ' ev-mem-edit'; ed.style.marginTop = '6px'; ed.onclick = function() { pop.close(); U.openEdit(r, function() { U.openMemories(); }); }; d.appendChild(document.createElement('br')); d.appendChild(ed); }
            pop.box.appendChild(d);
          });
        };
        sec('Coming up', up);
        sec('Remembered', kept);
        if (!up.length && !kept.length) { var e = document.createElement('div'); e.style.cssText = 'color:var(--muted);margin-top:10px;'; e.textContent = 'No memories yet. Add an event and it will ask how it went.'; pop.box.appendChild(e); }
      }).catch(function(e) { RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'eventMemories'); });
      return pop;
    },
  },
});
/* ===END:eventMemories=== */
