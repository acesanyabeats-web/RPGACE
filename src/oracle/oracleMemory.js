/* ===MODULE:oracleMemory=== */
// Plan "Oracle Assistant + Live now modes", D (Nov 4 2026). Alex: "This is in addition to D" (D = Oracle remembers).
// D-1: after a reload, today's conversation (since ☀️ I'm up, else since 04:00) comes back into the Oracle chat, so
// Oracle carries on instead of starting blank. Read from the private oracle_chats table (FL-3 saves every exchange);
// app-made prompts (recipe generation, dish ideas, briefs) are left out, and each turn is capped so the token cost stays
// small (max 6 exchanges).
// D-2: after a chat goes quiet (90s), the cheap model picks 0-3 lasting facts about Alex from the new exchanges
// (prompts/oracle_memory.md) into the private oracle_memory table. Every main-chat turn gets the newest 15 lines
// (pinned first; unpinned ones fade from the feed after 60 days, the rows stay) via logic.systemLines() in sendChat.
// D-3: 🧠 Oracle remembers (button on the Oracle page) lists every line: edit, pin, remove - nothing hidden.
RPGACE.register('oracleMemory', {
  domain: 'oracle',

  logic: {
    MAX_TURNS: 6,
    // Pure: questions the app wrote itself, not Alex. They're long instructions that would only cost tokens.
    isAppPrompt: function(q) {
      q = String(q || '');
      return q.length > 1500 || /^(Generate a real, cookable recipe|I want to cook something in this category|Context on what I'm currently looking at)/i.test(q);
    },
    // Pure: when "today" started for Oracle - I'm up if pressed today, else 04:00 local.
    since: function(now, ds, iso) {
      var up = ds && ds.up_at ? new Date(ds.up_at) : null;
      var four = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0);
      if (now < four) four = new Date(four.getTime() - 86400000);
      return up && up > four && up <= now ? up : four;
    },
    // Pure: rows (newest first) -> chat turns, oldest first, app prompts dropped, each side capped.
    turns: function(rows, max) {
      var L = RPGACE.modules.oracleMemory.logic, cap = function(t, n) { t = String(t || '').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
      return (rows || []).filter(function(r) { return r && r.question && r.answer && !L.isAppPrompt(r.question); })
        .slice(0, max || L.MAX_TURNS).reverse()
        .map(function(r) { return { q: cap(r.question, 1200), a: cap(r.answer, 2000), at: r.created_at }; });
    },
    FEED: 15, FADE_DAYS: 60, QUIET_MS: 90000,
    // Pure: what goes into the chat: pinned first, then newest; unpinned older than 60 days left out.
    feed: function(lines, now, max) {
      var L = RPGACE.modules.oracleMemory.logic, cut = (now || new Date()).getTime() - L.FADE_DAYS * 86400000;
      return (lines || []).filter(function(m) { return m.status !== 'removed' && (m.pinned || new Date(m.created_at).getTime() >= cut); })
        .sort(function(a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at); })
        .slice(0, max || L.FEED);
    },
    // Sync, for sendChat's system prompt: '' until lines are loaded.
    systemLines: function() {
      var self = RPGACE.modules.oracleMemory, f = self.logic.feed(self._lines || []);
      if (!f.length) return '';
      return '\nWHAT YOU REMEMBER ABOUT ALEX (from past chats; use it naturally, never recite the list; it may be out of date):\n' + f.map(function(m) { return '- ' + m.line; }).join('\n') + '\n';
    },
    loadLines: function() {
      var self = RPGACE.modules.oracleMemory;
      return RPGACE.kit.readPrivate('oracle_memory', 'select=id,line,pinned,status,source,created_at&status=eq.active&order=created_at.desc&limit=200')
        .then(function(rows) { self._lines = Array.isArray(rows) ? rows : []; return self._lines; });
    },
    // Pure: normalised text for duplicate checks.
    norm: function(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); },
    // Pure: the model's JSON -> up to 3 clean, new lines.
    clean: function(j, known) {
      var L = RPGACE.modules.oracleMemory.logic, have = {}, out = [];
      (known || []).forEach(function(k) { have[L.norm(k)] = 1; });
      var arr = j && Array.isArray(j.lines) ? j.lines : [];
      arr.forEach(function(x) {
        var t = String(x || '').replace(/\s+/g, ' ').trim();
        if (t.length < 8 || t.length > 200 || out.length >= 3) return;
        var n = L.norm(t); if (!n || have[n]) return;
        have[n] = 1; out.push(t);
      });
      return out;
    },
    // New exchanges -> 0-3 saved lines (one cheap call).
    extract: function(exchanges) {
      var self = RPGACE.modules.oracleMemory, L = self.logic, pp = RPGACE.modules.phylumPath;
      var real = (exchanges || []).filter(function(x) { return x && x.q && x.a && !L.isAppPrompt(x.q); });
      if (!real.length) return Promise.resolve([]);
      return (self._lines ? Promise.resolve(self._lines) : L.loadLines()).then(function(lines) {
        var known = lines.map(function(m) { return m.line; });
        var chat = real.map(function(x) { return 'Alex: ' + String(x.q).slice(0, 600) + '\nOracle: ' + String(x.a).slice(0, 900); }).join('\n\n');
        var prompt = RPGACE.prompt('oracle_memory', { today: RPGACE.kit.today(), known: known.slice(0, 60).map(function(k) { return '- ' + k; }).join('\n') || '(nothing yet)', chat: chat });
        return RPGACE.kit.ask(prompt, { json: true, max: 300, model: pp && pp.MECHANICAL_MODEL }).then(function(j) {
          var add = L.clean(j, known);
          return add.reduce(function(p, line) { return p.then(function(acc) {
            return RPGACE.sb.secureWrite('oracle_memory', 'insert', { line: line, source: 'chat' }).then(function(d) {
              var row = (Array.isArray(d) && d[0]) || { line: line, created_at: new Date().toISOString(), pinned: false, status: 'active' };
              self._lines = [row].concat(self._lines || []); acc.push(line); return acc;
            });
          }); }, Promise.resolve([]));
        });
      });
    },
    // Each saved chat queues; after 90s with no new message, the queue is read once.
    queue: function(q, a) {
      var self = RPGACE.modules.oracleMemory, L = self.logic;
      if (L.isAppPrompt(q)) return;
      (self._q = self._q || []).push({ q: q, a: a });
      clearTimeout(self._qt);
      self._qt = setTimeout(function() { var batch = self._q.splice(0); L.extract(batch).catch(function(e) { console.warn('[oracleMemory] extract:', e && e.message); }); }, L.QUIET_MS);
    },
    update: function(id, patch) {
      var self = RPGACE.modules.oracleMemory;
      patch.updated_at = new Date().toISOString();
      return RPGACE.sb.secureWrite('oracle_memory', 'update', patch, 'id=eq.' + id).then(function() {
        self._lines = (self._lines || []).map(function(m) { return m.id === id ? Object.assign({}, m, patch) : m; }).filter(function(m) { return m.status !== 'removed'; });
      });
    },
    load: function() {
      var L = RPGACE.modules.oracleMemory.logic, md = RPGACE.modules.myDay;
      var ds = md && md.logic.dayState ? md.logic.dayState() : null;
      var from = L.since(new Date(), ds).toISOString();
      return RPGACE.kit.readPrivate('oracle_chats', 'select=question,answer,created_at&created_at=gte.' + encodeURIComponent(from) + '&order=created_at.desc&limit=20')
        .then(function(rows) { return L.turns(Array.isArray(rows) ? rows : []); });
    }
  },

  ui: {
    // D-3: 🧠 Oracle remembers - every line, newest first; edit, pin, remove (two taps).
    openList: function() {
      var self = RPGACE.modules.oracleMemory, L = self.logic, K = RPGACE.kit;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🔮 Oracle', title: '🧠 Oracle remembers', width: '560px', closeLabel: 'Close' });
      pop.box.id = 'om-list';
      var help = document.createElement('div'); help.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      help.textContent = 'Oracle writes these from your chats and reads the newest 15 (📌 pinned first) in every chat. Lines older than 60 days stop being used unless pinned.';
      var list = document.createElement('div'); list.id = 'om-rows';
      pop.box.appendChild(help); pop.box.appendChild(list);
      var add = document.createElement('div'); add.style.cssText = 'display:flex;gap:6px;margin-top:10px;';
      var ai = document.createElement('input'); ai.type = 'text'; ai.id = 'om-add'; ai.placeholder = 'Add something Oracle should know';
      ai.style.cssText = 'flex:1;min-width:0;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
      var ab = K.btn('+ Add', 'primary'); ab.id = 'om-add-btn'; K.needs(ab, ai, 'Write at least 3 letters', 3);
      ab.onclick = function() {
        var t = ai.value.trim(); if (t.length < 3) return;
        ab.disabled = true;
        RPGACE.sb.secureWrite('oracle_memory', 'insert', { line: t.slice(0, 200), source: 'typed', pinned: true }).then(function(d) {
          var row = (Array.isArray(d) && d[0]) || { line: t, pinned: true, status: 'active', created_at: new Date().toISOString() };
          self._lines = [row].concat(self._lines || []); ai.value = ''; ab.disabled = false; draw();
        }, function(e) { ab.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 3500, 'oracleMemory'); });
      };
      add.appendChild(ai); add.appendChild(ab); pop.box.appendChild(add);
      var draw = function() {
        list.innerHTML = '';
        var rows = (self._lines || []).filter(function(m) { return m.status !== 'removed'; });
        var used = {}; L.feed(rows).forEach(function(m) { used[m.id] = 1; });
        if (!rows.length) { list.innerHTML = '<div class="mdx-sub" style="padding:8px 0;">Nothing yet. Oracle adds lines after you chat.</div>'; return; }
        rows.forEach(function(m) {
          var r = document.createElement('div'); r.className = 'om-row'; r.dataset.id = m.id;
          r.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);';
          var tx = document.createElement('div'); tx.style.cssText = 'flex:1 1 200px;min-width:0;font-size:14px;color:var(--text);';
          tx.textContent = (m.pinned ? '📌 ' : '') + m.line;
          var sub = document.createElement('div'); sub.style.cssText = 'font-size:12px;color:var(--muted);';
          sub.textContent = String(m.created_at || '').slice(0, 10) + (used[m.id] ? ' · in use' : ' · not used (older than 60 days)');
          tx.appendChild(sub);
          var pin = K.btn(m.pinned ? 'Unpin' : '📌 Pin', ''); pin.className += ' om-pin';
          pin.onclick = function() { pin.disabled = true; L.update(m.id, { pinned: !m.pinned }).then(draw, function(e) { pin.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3000, 'oracleMemory'); }); };
          var ed = K.btn('✏️', ''); ed.className += ' om-edit'; ed.title = 'Edit';
          ed.onclick = function() {
            var inp = document.createElement('input'); inp.type = 'text'; inp.value = m.line; inp.style.cssText = 'width:100%;min-height:40px;padding:6px 8px;border-radius:6px;border:1px solid var(--gold);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
            tx.innerHTML = ''; tx.appendChild(inp); inp.focus();
            ed.textContent = 'Save'; ed.onclick = function() { var v = inp.value.trim(); if (v.length < 3) return; ed.disabled = true; L.update(m.id, { line: v.slice(0, 200) }).then(draw, function(e) { ed.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3000, 'oracleMemory'); }); };
          };
          var rm = K.btn('Remove', ''); rm.className += ' om-rm';
          K.armConfirm(rm, function() { return L.update(m.id, { status: 'removed' }).then(draw); }, 'Tap again to remove');
          r.appendChild(tx); r.appendChild(pin); r.appendChild(ed); r.appendChild(rm);
          list.appendChild(r);
        });
      };
      list.textContent = 'Loading…';
      L.loadLines().then(draw, function(e) { list.textContent = '⚠️ Could not load: ' + (e.message || e); });
      return pop;
    },
    // The 🧠 button on the Oracle page toolbar (no floating buttons).
    injectButton: function() {
      var bar = document.querySelector('#page-advisor .chat-toolbar');
      if (!bar || document.getElementById('om-open')) return;
      var b = document.createElement('button'); b.type = 'button'; b.id = 'om-open'; b.textContent = '🧠 Oracle remembers';
      b.style.cssText = 'min-height:36px;padding:4px 12px;border-radius:8px;border:1px solid rgba(155,89,182,.5);background:none;color:#9B59B6;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-left:8px;';
      b.onclick = function() { RPGACE.modules.oracleMemory.ui.openList(); };
      bar.insertBefore(b, bar.children[1] || null);
    },
    // Put today's turns back into the chat (history + on screen), once per load, only if the chat is still empty.
    restore: function() {
      var self = RPGACE.modules.oracleMemory;
      if (self._restored) return Promise.resolve(0);
      if (typeof STATE === 'undefined' || !STATE.chatHistory || STATE.chatHistory.length) { self._restored = true; return Promise.resolve(0); }
      self._restored = true;
      return self.logic.load().then(function(turns) {
        if (!turns.length || STATE.chatHistory.length) return 0;
        var msgs = document.getElementById('chat-msgs');
        if (msgs && typeof addMsg === 'function') addMsg('🧠 Carrying on from earlier today (' + turns.length + ' message' + (turns.length === 1 ? '' : 's') + ')', 'system');
        turns.forEach(function(t) {
          STATE.chatHistory.push({ role: 'user', content: t.q }, { role: 'assistant', content: t.a });
          if (msgs && typeof addMsg === 'function') { addMsg(t.q, 'user'); addMsg(t.a, 'ai'); }
        });
        // Mark them scanned so the reply hooks never treat an old message as a new reply.
        if (msgs) [].forEach.call(msgs.querySelectorAll('.msg.ai'), function(el) { el.dataset.phylaScanned = '1'; });
        return turns.length;
      }).catch(function(e) { console.warn('[oracleMemory] restore:', e && e.message); return 0; });
    }
  },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:login', function() {
      setTimeout(function() { try { self.ui.restore(); } catch (e) {} }, 3000);
      setTimeout(function() { self.logic.loadLines().catch(function() {}); }, 4000); // D-2: lines ready for the next chat
    });
    RPGACE.hooks.on('oracle:chat-saved', function(x) { if (x) self.logic.queue(x.question, x.reply); });
    try { self.ui.injectButton(); } catch (e) {}
    RPGACE.hooks.on('page:show', function() { try { self.ui.injectButton(); } catch (e) {} });
  }
});
/* ===END:oracleMemory=== */
