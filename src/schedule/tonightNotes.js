/* ===MODULE:tonightNotes=== */
// RP-5 (Nov 5 2026, plan "Realm Pages + Evening Questionnaire", record
// records/2026-11/ui_audit_improvements_paranoia_2026-11-04.txt). Alex:
// capture from "Oracle chat, Live now, One box on every page, Phone share";
// share screen "Note or realms+why". One note = one journal row
// (source 'tonight_note', realms = the realm you're on via
// realmPages.logic.contextRealm). Tonight's evening review lists them until
// the questionnaire (RP-7) takes over. Same store as the evening review
// (journal), so nothing is kept twice (rule 8).
RPGACE.register('tonightNotes', {
  domain: 'schedule',
  SOURCE: 'tonight_note',
  TRIGGER_PREFIXES: ['note:', 'note for tonight:'],

  init: function() {
    var self = RPGACE.modules.tonightNotes;
    self.ui._patchChatTrigger();
    if (!window._tonightNotesPatched) setTimeout(function() { self.ui._patchChatTrigger(); }, 1500);
    self.ui._fab();
  },

  logic: {
    // Pure: the journal row for one note.
    // shots = screenshot ids (screenshots table, tag note_shot), kept as "📷 shot:<id>" lines so one journal row holds the note.
    row: function(text, realm, link, day, shots) {
      var t = String(text || '').trim().slice(0, 600), sl = (shots || []).map(function(id) { return '📷 shot:' + id; }).join('\n');
      if (!t && !link && !sl) return null;
      var body = [t, link || '', sl].filter(Boolean).join('\n');
      return { title: '📝 Note for tonight', content: body, source: 'tonight_note', entry_type: 'note',
        date: day, review_on: day, realms: realm ? [realm] : [] };
    },
    add: function(text, opts) {
      opts = opts || {};
      var self = RPGACE.modules.tonightNotes, realm = opts.realm;
      if (realm === undefined) { try { var cr = RPGACE.modules.realmPages && RPGACE.modules.realmPages.logic.contextRealm(); realm = cr ? cr.realm : null; } catch (e) { realm = null; } }
      var row = self.logic.row(text, realm, opts.link, RPGACE.kit.iso(), opts.shots);
      if (!row) return Promise.reject(new Error('Type the note first'));
      return RPGACE.sb.secureWrite('journal', 'insert', row).then(function() { try { RPGACE.cache.clear('journal'); } catch (e) {} return row; });
    },
    // Pure: a note's content -> { text, shots: [ids] }.
    split: function(content) {
      var shots = [], text = String(content || '').split('\n').filter(function(l) { var m = l.match(/^📷 shot:([0-9a-f-]{36})$/); if (m) { shots.push(m[1]); return false; } return true; }).join('\n');
      return { text: text, shots: shots };
    },
    // A screenshot for a note: private, never read by Oracle, out of the Screenshot inbox (tag note_shot).
    upload: function(file, realm) {
      var SI = RPGACE.modules.screenshotInbox;
      if (!SI) return Promise.reject(new Error('screenshots not loaded'));
      return SI.logic.upload(file, 'note', realm ? [realm] : []).then(function(r) { return r.row; });
    },
    shotUrl: function(id) {
      return RPGACE.modules.screenshotInbox.logic.api('list', { id: id, note: true, limit: 1 }).then(function(rows) { return rows && rows[0] && rows[0].url; });
    },
    list: function(day) {
      return RPGACE.sb.select('journal', 'select=id,created_at,content,realms&source=eq.tonight_note&review_on=eq.' + day + '&order=created_at.asc&limit=50')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    }
  },

  ui: {
    // The 📝 button every area bar carries (navigation.bar) and Live now shows.
    button: function(label, getOpts) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tn-btn';
      b.setAttribute('aria-label', 'Note for tonight'); b.title = 'Note for tonight';
      b.textContent = label || '📝';
      b.style.cssText = 'min-height:44px;min-width:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);font-size:16px;cursor:pointer;';
      b.onclick = function(ev) { ev.stopPropagation(); RPGACE.modules.tonightNotes.ui.open(getOpts ? getOpts() : null); };
      return b;
    },
    // 📝 always on screen (Nov 7 2026, Alex: "as long as notes is always present, I'll be able to critique the app even when no
    // credits are left"). A floating 📝 shows only where no other 📝 is visible: over a pop-up, or a page with no area bar.
    // One button on screen at a time (rule 19): hidden while the area bar's 📝, Live now's 📝 Note or the note box is showing.
    _fab: function() {
      if (document.getElementById('tn-fab') || !document.body) return;
      var st = document.createElement('style'); st.id = 'tn-fab-css';
      st.textContent = '#tn-fab{display:none;position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:100000;width:48px;height:48px;border-radius:24px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:20px;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4);cursor:pointer;opacity:.92;}' +
        'body:not(:has(#tn-pop)):not(:has(#rt-live-note)):has(.dd-overlay) #tn-fab,' +
        'body:not(:has(#tn-pop)):not(:has(#rt-live-note)):not(:has(.page.active .area-note-btn)) #tn-fab{display:flex;}';
      document.head.appendChild(st);
      var b = RPGACE.modules.tonightNotes.ui.button('📝', null); b.id = 'tn-fab'; b.style.cssText = '';
      document.body.appendChild(b);
    },
    // A one-line box. opts.link = a shared link kept with the note.
    open: function(opts) {
      opts = opts || {};
      var self = RPGACE.modules.tonightNotes, X = RPGACE.modules.xpSeason, cr = null;
      try { cr = RPGACE.modules.realmPages && RPGACE.modules.realmPages.logic.contextRealm(); } catch (e) {}
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📝 Note for tonight', title: opts.title || 'What do you want to remember tonight?', width: '440px' });
      pop.box.id = 'tn-pop';
      if (opts.link) { var l = document.createElement('div'); l.style.cssText = 'font-size:12px;color:var(--muted);word-break:break-all;margin-bottom:8px;'; l.textContent = opts.link; pop.box.appendChild(l); }
      var ta = document.createElement('textarea'); ta.id = 'tn-text'; ta.rows = 2;
      ta.placeholder = opts.placeholder || 'e.g. ask Oracle why the mix felt muddy';
      ta.style.cssText = 'width:100%;box-sizing:border-box;font-size:16px;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;resize:vertical;';
      pop.box.appendChild(ta);
      var where = document.createElement('div'); where.id = 'tn-realm'; where.style.cssText = 'font-size:12px;color:var(--muted);margin:6px 0 10px;';
      // Live now open: its realm wins over the page behind it (a note from Live now never lands realm-less).
      var lc = document.getElementById('rt-live-note') && RPGACE.modules.realmTasks && RPGACE.modules.realmTasks._liveCtx;
      if (!opts.realm && lc && lc.realm) { opts.realm = lc.realm; opts.why = opts.why || 'Live now'; }
      if (opts.realm && X && X.REALMS[opts.realm]) cr = { realm: opts.realm, why: opts.why || 'what you\'re on' };
      var realm = cr && X && X.REALMS[cr.realm] ? cr.realm : null;
      where.textContent = realm ? 'Saved under ' + X.REALMS[realm].icon + ' ' + X.REALMS[realm].name + ' (' + cr.why + '). Shows in tonight\'s review.' : 'Shows in tonight\'s review.';
      pop.box.appendChild(where);
      var save = RPGACE.kit.btn('Save note', 'primary'); save.id = 'tn-save'; save.style.width = '100%'; save.style.minHeight = '44px';
      // Screenshots on a note (Nov 7 2026, Alex: "if I can add screenshots to notes, would be perfect, this is the most
      // important to me right now"). Picked here, uploaded on Save; no Oracle call, so notes work with no credits left.
      var files = [], shotRow = document.createElement('div'); shotRow.id = 'tn-shots'; shotRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 10px;';
      var fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true; fi.id = 'tn-file'; fi.style.display = 'none';
      var pick = RPGACE.kit.btn('📷 Add screenshot', ''); pick.id = 'tn-add-shot'; pick.style.minHeight = '44px';
      pick.onclick = function() { fi.click(); };
      var drawShots = function() {
        [].slice.call(shotRow.querySelectorAll('.tn-thumb')).forEach(function(t) { t.remove(); });
        files.forEach(function(f, i) {
          var t = document.createElement('div'); t.className = 'tn-thumb'; t.style.cssText = 'position:relative;width:56px;height:56px;border-radius:8px;overflow:hidden;border:1px solid var(--border);';
          var im = document.createElement('img'); im.src = URL.createObjectURL(f); im.alt = 'Screenshot ' + (i + 1); im.style.cssText = 'width:100%;height:100%;object-fit:cover;'; t.appendChild(im);
          var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Remove screenshot'); x.style.cssText = 'position:absolute;top:0;right:0;min-width:24px;min-height:24px;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:12px;cursor:pointer;';
          x.onclick = function() { files.splice(i, 1); drawShots(); };
          t.appendChild(x); shotRow.insertBefore(t, pick);
        });
        pick.textContent = files.length ? '📷 Add another' : '📷 Add screenshot';
      };
      fi.onchange = function() { [].slice.call(fi.files || []).forEach(function(f) { if (/^image\//.test(f.type) && files.length < 6) files.push(f); }); fi.value = ''; drawShots(); };
      shotRow.appendChild(pick); shotRow.appendChild(fi); pop.box.insertBefore(shotRow, where);
      save.onclick = function() {
        if (!String(ta.value || '').trim() && !files.length && !opts.link) { RPGACE.utils.toast('Type the note or add a screenshot', 'var(--muted)', 1800); ta.focus(); return; }
        save.disabled = true; save.textContent = files.length ? 'Saving ' + files.length + ' screenshot' + (files.length > 1 ? 's' : '') + '…' : 'Saving…';
        var up = files.reduce(function(p, f) { return p.then(function(ids) { return self.logic.upload(f, realm).then(function(r) { ids.push(r.id); return ids; }); }); }, Promise.resolve([]));
        up.then(function(ids) { return self.logic.add(ta.value, { realm: realm, link: opts.link, shots: ids }); }).then(function() {
          pop.close();
          if (opts.after) opts.after(); else RPGACE.utils.toast('📝 Saved for tonight', '#3DAA6E', 2200);
        }, function(e) { save.disabled = false; save.textContent = 'Save note'; RPGACE.utils.toast('⚠️ Note not saved: ' + (e.message || e), '#CC4A4A', 4000, 'tonightNotes'); });
      };
      pop.box.appendChild(save);
      setTimeout(function() { try { ta.focus(); } catch (e) {} }, 50);
      return pop;
    },
    // Tonight's notes inside the evening review.
    drawInto: function(host, day) {
      var self = RPGACE.modules.tonightNotes, X = RPGACE.modules.xpSeason;
      var box = document.createElement('div'); box.id = 'tn-evening'; host.appendChild(box);
      self.logic.list(day).then(function(rows) {
        if (!rows.length || !box.isConnected) return;
        var h = document.createElement('div'); h.style.cssText = 'font-size:13px;font-weight:700;color:var(--text);margin:12px 0 4px;';
        h.textContent = '📝 Notes for tonight (' + rows.length + ')'; box.appendChild(h);
        rows.forEach(function(r) {
          var R = X && (r.realms || [])[0] && X.REALMS[r.realms[0]];
          var d = document.createElement('div'); d.className = 'tn-line'; d.style.cssText = 'font-size:13px;color:var(--text);line-height:1.5;padding:2px 0;white-space:pre-wrap;word-break:break-word;';
          var sp = self.logic.split(r.content), tm = r.created_at ? new Date(r.created_at).toTimeString().slice(0, 5) + ' ' : '';
          d.textContent = (R ? R.icon + ' ' : '• ') + tm + sp.text;
          box.appendChild(d);
          if (sp.shots.length) {
            var sr = document.createElement('div'); sr.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 6px;';
            sp.shots.forEach(function(id) {
              var a = document.createElement('a'); a.className = 'tn-shot'; a.target = '_blank'; a.rel = 'noopener'; a.style.cssText = 'display:block;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--panel2);';
              self.logic.shotUrl(id).then(function(u) { if (!u) return; a.href = u; var im = document.createElement('img'); im.src = u; im.alt = 'Note screenshot'; im.style.cssText = 'width:100%;height:100%;object-fit:cover;'; a.appendChild(im); }, function() {});
              sr.appendChild(a);
            });
            box.appendChild(sr);
          }
        });
      }, function(e) { box.textContent = '⚠️ Could not load tonight\'s notes: ' + (e.message || e); });
      return box;
    },
    // "note: ..." in Oracle chat saves a note instead of asking Oracle.
    _patchChatTrigger: function() {
      var self = RPGACE.modules.tonightNotes;
      if (typeof window.sendChat !== 'function' || window._tonightNotesPatched) return;
      window._tonightNotesPatched = true;
      var origSend = window.sendChat;
      window.sendChat = function() {
        var input = document.getElementById('chat-input');
        var val = input ? input.value.trim() : '', lower = val.toLowerCase();
        var p = self.TRIGGER_PREFIXES.filter(function(x) { return lower.indexOf(x) === 0; }).sort(function(a, b) { return b.length - a.length; })[0];
        if (p) {
          var text = val.slice(p.length).trim();
          if (!text) { RPGACE.utils.toast('Write the note after "' + p + '"', '#CC4A4A', 2500); return; }
          input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
          self.logic.add(text).then(function() { RPGACE.utils.toast('📝 Saved for tonight', '#3DAA6E', 2200); },
            function(e) { input.value = val; RPGACE.utils.toast('⚠️ Note not saved: ' + (e.message || e), '#CC4A4A', 4000, 'tonightNotes'); });
          return;
        }
        return origSend.apply(this, arguments);
      };
    }
  }
});
/* ===END:tonightNotes=== */
