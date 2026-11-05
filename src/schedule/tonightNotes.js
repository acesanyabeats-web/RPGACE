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
  },

  logic: {
    // Pure: the journal row for one note.
    row: function(text, realm, link, day) {
      var t = String(text || '').trim().slice(0, 600);
      if (!t && !link) return null;
      return { title: '📝 Note for tonight', content: t + (link ? (t ? '\n' : '') + link : ''), source: 'tonight_note', entry_type: 'note',
        date: day, review_on: day, realms: realm ? [realm] : [] };
    },
    add: function(text, opts) {
      opts = opts || {};
      var self = RPGACE.modules.tonightNotes, realm = opts.realm;
      if (realm === undefined) { try { var cr = RPGACE.modules.realmPages && RPGACE.modules.realmPages.logic.contextRealm(); realm = cr ? cr.realm : null; } catch (e) { realm = null; } }
      var row = self.logic.row(text, realm, opts.link, RPGACE.kit.iso());
      if (!row) return Promise.reject(new Error('Type the note first'));
      return RPGACE.sb.secureWrite('journal', 'insert', row).then(function() { try { RPGACE.cache.clear('journal'); } catch (e) {} return row; });
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
      if (opts.realm && X && X.REALMS[opts.realm]) cr = { realm: opts.realm, why: opts.why || 'what you\'re on' };
      var realm = cr && X && X.REALMS[cr.realm] ? cr.realm : null;
      where.textContent = realm ? 'Saved under ' + X.REALMS[realm].icon + ' ' + X.REALMS[realm].name + ' (' + cr.why + '). Shows in tonight\'s review.' : 'Shows in tonight\'s review.';
      pop.box.appendChild(where);
      var save = RPGACE.kit.btn('Save note', 'primary'); save.id = 'tn-save'; save.style.width = '100%'; save.style.minHeight = '44px';
      if (!opts.link) RPGACE.kit.needs(save, ta, 'Type the note first');
      save.onclick = function() {
        save.disabled = true;
        self.logic.add(ta.value, { realm: realm, link: opts.link }).then(function() {
          pop.close();
          if (opts.after) opts.after(); else RPGACE.utils.toast('📝 Saved for tonight', '#3DAA6E', 2200);
        }, function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Note not saved: ' + (e.message || e), '#CC4A4A', 4000, 'tonightNotes'); });
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
          d.textContent = (R ? R.icon + ' ' : '• ') + r.content;
          box.appendChild(d);
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
