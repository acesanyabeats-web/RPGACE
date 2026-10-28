

/* ===MODULE:oracleEntry=== */
// Oct 16 2026 — Alex: Oracle "logged" two journal entries that were never
// saved. This is the real path: "📓 Save as entry" under an Oracle reply
// opens a review card (edit the text, pick a date and realms) that saves
// either a journal entry (source 'oracle_entry' -> journal XP; ⭐ Big
// unusual day -> +50 split over its realms, DB trigger) or a realm mission
// (a finished Doing Now "I just did" entry -> realm XP). A reply holding
// several write-ups is split so each is saved on its own.
RPGACE.register('oracleEntry', {
  domain: 'schedule',

  logic: {
    // Pure: realm keys named on the reply's realm lines (a line saying
    // "realm" and the bullets under it; phylum lines ignored), max 4.
    guessRealms: function(text) {
      var X = RPGACE.modules.xpSeason, out = [];
      if (!X) return out;
      var lines = String(text || '').split('\n'), keep = [], on = false;
      lines.forEach(function(l) {
        if (/realm/i.test(l)) { on = true; keep.push(l); return; }
        if (on && /^\s*(>|[-•*]|\s*$)/.test(l) && l.trim()) { keep.push(l); return; }
        on = false;
      });
      var t = ' ' + keep.filter(function(l) { return !/phyl/i.test(l); }).join(' ').toLowerCase() + ' ';
      X.ORDER.forEach(function(k) {
        var n = X.REALMS[k].name.toLowerCase();
        if (new RegExp('[^a-z]' + n + '[^a-z]').test(t) && out.length < 4) out.push(k);
      });
      return out;
    },
    // Pure: drop the "✦ Oracle" label, made-up XP tables and the sign-off line.
    clean: function(text) {
      var t = String(text || '').replace(/^\s*✦\s*Oracle\s*/, '');
      t = t.replace(/(^|\n)[^\n]*XP AWARDED[\s\S]*?(?=\n\s*\n(?![^\n]*\|)|$)/i, '\n');
      t = t.split('\n').filter(function(l) { return !/^\s*\|.*\|\s*$/.test(l) && !/TOTAL:\s*\+?\d+\s*XP/i.test(l); }).join('\n');
      return t.replace(/\n{3,}/g, '\n\n').trim();
    },
    // Pure: one write-up per "JOURNAL ENTRY" / "ENTRY #n" heading, else the whole text.
    split: function(text) {
      var L = RPGACE.modules.oracleEntry.logic, t = L.clean(text);
      var parts = t.split(/\n(?=[^\n]*(?:JOURNAL ENTRY|ENTRY\s*#\s*\d))/i).map(function(x) { return x.trim(); }).filter(Boolean);
      var heads = parts.filter(function(x) { return /JOURNAL ENTRY|ENTRY\s*#\s*\d/i.test(x.split('\n')[0]); });
      if (heads.length < 2) return [L.entry(t)];
      return heads.map(L.entry);
    },
    entry: function(body) {
      var m = /Title:\s*["“]?([^"”\n]+)["”]?/i.exec(body);
      var first = body.split('\n').filter(function(l) { return l.trim(); })[0] || '';
      var title = m ? m[1].trim() : first.replace(/[#*📖]/g, '').trim();
      return { title: title.slice(0, 120) || 'Journal entry', body: body, realms: RPGACE.modules.oracleEntry.logic.guessRealms(body) };
    },
    ukDate: function(iso) {
      var d = iso ? new Date(iso + 'T12:00:00') : new Date();
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    saveJournal: function(f) {
      return RPGACE.sb.secureWrite('journal', 'insert', {
        title: f.title, content: f.body, date: RPGACE.modules.oracleEntry.logic.ukDate(f.date),
        source: 'oracle_entry', entry_type: f.bigDay ? 'big_day' : 'note', realms: f.realms, big_day: !!f.bigDay
      }).then(function(r) {
        try { RPGACE.cache.clear('journal'); } catch (e) {}
        try { if (typeof refreshJournalDisplay === 'function') refreshJournalDisplay(); } catch (e) {}
        RPGACE.hooks.fire('journal:saved', { title: f.title, source: 'oracle_entry' });
        return r;
      });
    }
  },

  ui: {
    // The last Oracle reply in this chat.
    openLast: function() {
      var hist = (typeof STATE !== 'undefined' && STATE.chatHistory) || [];
      var last = hist.filter(function(m) { return m.role === 'assistant'; }).slice(-1)[0];
      if (!last || !last.content) { RPGACE.utils.toast('No Oracle reply to save yet', '#CC4A4A', 2500, 'oracleEntry'); return; }
      return RPGACE.modules.oracleEntry.ui.open(last.content);
    },
    open: function(text) {
      var M = RPGACE.modules.oracleEntry, L = M.logic, dd = RPGACE.modules.dashDeck;
      var entries = L.split(text);
      var pop = dd._popup({ eyebrow: '🔮 Oracle', title: '📓 Save as entry', width: '560px' });
      var box = document.createElement('div'); box.id = 'oe-box'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      pop.box.appendChild(box);
      var saved = {};
      var list = function() {
        box.textContent = '';
        var n = document.createElement('div'); n.style.cssText = 'font-size:13px;color:var(--muted);';
        n.textContent = 'This reply has ' + entries.length + ' write-ups — save each one as a journal entry or a ➕ task.';
        box.appendChild(n);
        entries.forEach(function(en, i) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'bh-morerow oe-pick'; b.dataset.i = i;
          b.style.cssText = 'text-align:left;min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);font-size:14px;cursor:pointer;font-family:inherit;';
          b.textContent = (saved[i] ? '✅ ' : '📝 ') + en.title + (saved[i] ? ' — saved as ' + saved[i] : '');
          b.disabled = !!saved[i];
          b.onclick = function() { form(i); };
          box.appendChild(b);
        });
      };
      var form = function(i) {
        var en = entries[i], kind = 'journal', realms = en.realms.slice();
        box.textContent = '';
        var inCss = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
        var lab = function(t) { var d = document.createElement('div'); d.style.cssText = 'font-size:12px;font-weight:700;color:var(--muted);'; d.textContent = t; return d; };
        var chipCss = function(on) { return 'min-height:40px;padding:6px 12px;border-radius:18px;font-size:13px;cursor:pointer;font-family:inherit;' + (on ? 'background:var(--gold);border:1px solid var(--gold);color:#111;font-weight:700;' : 'background:none;border:1px solid var(--border);color:var(--text);'); };
        var kinds = document.createElement('div'); kinds.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
        var kb = {};
        [['journal', '📓 Journal entry'], ['task', '➕ Task']].forEach(function(k) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'oe-kind'; b.dataset.kind = k[0]; b.textContent = k[1];
          b.onclick = function() { kind = k[0]; paint(); };
          kb[k[0]] = b; kinds.appendChild(b);
        });
        var help = document.createElement('div'); help.style.cssText = 'font-size:12px;color:var(--muted);';
        box.appendChild(kinds); box.appendChild(help);
        box.appendChild(lab('Title'));
        var title = document.createElement('input'); title.id = 'oe-title'; title.type = 'text'; title.maxLength = 120; title.value = en.title; title.style.cssText = inCss; box.appendChild(title);
        box.appendChild(lab('Date'));
        var date = document.createElement('input'); date.id = 'oe-date'; date.type = 'date'; date.value = RPGACE.modules.doingNow ? RPGACE.modules.doingNow.logic.iso() : new Date().toISOString().slice(0, 10); date.style.cssText = inCss; box.appendChild(date);
        box.appendChild(lab('Text'));
        var body = document.createElement('textarea'); body.id = 'oe-body'; body.rows = 8; body.value = en.body; body.style.cssText = inCss; box.appendChild(body);
        box.appendChild(lab('Realms (up to 4)'));
        var rbox = document.createElement('div'); rbox.id = 'oe-realms'; rbox.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
        var X = RPGACE.modules.xpSeason;
        (X ? X.ORDER : []).forEach(function(k) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'oe-realm'; c.dataset.realm = k;
          c.textContent = X.REALMS[k].icon + ' ' + X.REALMS[k].name;
          c.onclick = function() { var j = realms.indexOf(k); if (j > -1) realms.splice(j, 1); else if (realms.length < 4) realms.push(k); paint(); };
          rbox.appendChild(c);
        });
        box.appendChild(rbox);
        var big = document.createElement('button'); big.type = 'button'; big.id = 'oe-big'; big.dataset.on = '0';
        big.onclick = function() { big.dataset.on = big.dataset.on === '1' ? '0' : '1'; paint(); };
        box.appendChild(big);
        var minsWrap = document.createElement('div');
        minsWrap.appendChild(lab('How long (minutes)'));
        var mins = document.createElement('input'); mins.id = 'oe-mins'; mins.type = 'number'; mins.min = '1'; mins.max = '720'; mins.value = '60'; mins.inputMode = 'numeric'; mins.style.cssText = inCss;
        minsWrap.appendChild(mins); box.appendChild(minsWrap);
        var err = document.createElement('div'); err.style.cssText = 'color:#CC4A4A;font-size:13px;'; err.hidden = true; box.appendChild(err);
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
        var save = document.createElement('button'); save.type = 'button'; save.id = 'oe-save';
        save.style.cssText = 'min-height:44px;padding:8px 18px;border-radius:8px;border:none;background:var(--gold);color:#111;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;';
        var back = document.createElement('button'); back.type = 'button'; back.id = 'oe-back'; back.textContent = entries.length > 1 ? '← All write-ups' : 'Cancel';
        back.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);font-size:14px;cursor:pointer;font-family:inherit;';
        back.onclick = function() { if (entries.length > 1) list(); else pop.close(); };
        row.appendChild(save); row.appendChild(back); box.appendChild(row);
        var paint = function() {
          Object.keys(kb).forEach(function(k) { kb[k].style.cssText = chipCss(kind === k); kb[k].setAttribute('aria-pressed', kind === k ? 'true' : 'false'); });
          help.textContent = kind === 'journal'
            ? 'A journal entry earns journal XP. Tick ⭐ for a big, unusual day: +50 XP split over its realms.'
            : 'A task goes into the first realm\'s task list (duplicates merge) so you can do it in a block. Realm missions moved to Live now (Oct 27 2026).';
          Array.prototype.forEach.call(rbox.children, function(c) { var on = realms.indexOf(c.dataset.realm) > -1; c.style.cssText = chipCss(on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          big.hidden = kind !== 'journal'; minsWrap.hidden = true; date.hidden = kind === 'task';
          var bo = big.dataset.on === '1';
          big.textContent = (bo ? '⭐ Big unusual day — +50 XP' : '☆ Big unusual day?');
          big.style.cssText = chipCss(bo) + 'align-self:flex-start;';
          save.textContent = kind === 'journal' ? '📓 Save journal entry' : '➕ Next: add as task';
        };
        paint();
        save.onclick = function() {
          var f = { title: title.value.trim(), body: body.value.trim(), date: date.value, realms: realms.slice(), bigDay: big.dataset.on === '1', mins: Math.max(1, Math.min(720, Math.round(Number(mins.value) || 60))) };
          if (!f.title || !f.body) { err.textContent = 'Add a title and some text.'; err.hidden = false; return; }
          // Realm Tasks (Oct 27 2026): ⚔️ Realm mission replaced by ➕ Task (Alex:
          // "⚔️ Realm mission saving" leaves the Oracle page; doing happens on Live now).
          if (kind === 'task') {
            var rt = RPGACE.modules.realmTasks;
            if (!rt) { err.textContent = 'Tasks are not loaded.'; err.hidden = false; return; }
            pop.close();
            rt.ui.openAdd({ title: f.title, notes: f.body.slice(0, 500), realm: f.realms[0], kind: 'once', source: { table: 'oracle', ref: 'reply:' + Date.now(), label: f.title.slice(0, 60) } });
            return;
          }
          save.disabled = true; err.hidden = true;
          L.saveJournal(f).then(function() {
            saved[i] = f.bigDay ? '⭐ journal entry' : 'journal entry';
            RPGACE.utils.toast('📓 Saved to Journal' + (f.bigDay ? ' — ⭐ big day' : ''), 'var(--gold)', 2500);
            if (entries.length > 1) list(); else pop.close();
          }, function(e) {
            save.disabled = false;
            err.textContent = '⚠️ Not saved: ' + (e && e.message || e); err.hidden = false;
            RPGACE.utils.toast('⚠️ Entry not saved: ' + (e && e.message || e), '#CC4A4A', 4000, 'oracleEntry');
          });
        };
      };
      if (entries.length > 1) list(); else form(0);
      return pop;
    }
  },

  init: function() {}
});
/* ===END:oracleEntry=== */
