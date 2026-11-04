/* ===MODULE:oracleMemory=== */
// Plan "Oracle Assistant + Live now modes", D (Nov 4 2026). Alex: "This is in addition to D" (D = Oracle remembers).
// D-1: after a reload, today's conversation (since ☀️ I'm up, else since 04:00) comes back into the Oracle chat, so
// Oracle carries on instead of starting blank. Read from the private oracle_chats table (FL-3 saves every exchange);
// app-made prompts (recipe generation, dish ideas, briefs) are left out, and each turn is capped so the token cost stays
// small (max 6 exchanges). D-2 (running memory lines) and D-3 (🧠 Oracle remembers list) build on this module.
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
    load: function() {
      var L = RPGACE.modules.oracleMemory.logic, md = RPGACE.modules.myDay;
      var ds = md && md.logic.dayState ? md.logic.dayState() : null;
      var from = L.since(new Date(), ds).toISOString();
      return RPGACE.kit.readPrivate('oracle_chats', 'select=question,answer,created_at&created_at=gte.' + encodeURIComponent(from) + '&order=created_at.desc&limit=20')
        .then(function(rows) { return L.turns(Array.isArray(rows) ? rows : []); });
    }
  },

  ui: {
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
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(function() { try { self.ui.restore(); } catch (e) {} }, 3000); });
  }
});
/* ===END:oracleMemory=== */
