/* ===MODULE:deepDive=== */
// Oct 27 2026 — FL-4 of plan "Oracle Flags Oct 27" (Alex's Oct 26 flag +
// his answers Oct 27: "Button under replies with questions"; "send straight
// away, the prompt would be too large"; journal only when he taps 📓).
// A 🧭 Deep dive button sits under any Oracle reply that lists 3+ questions.
// It opens one pop-up per question (text box, Back / Skip / Next), then a
// last "anything else?" pop-up, then sends one compiled prompt to Oracle.
// Answers are kept on the device while he goes (closing loses nothing).
// The exchange is backed up by saveOracleChat (oracle_chats) like any chat.
RPGACE.register('deepDive', {
  domain: 'oracle',
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 40,
  STORE_KEY: 'rpgace_deep_dive',

  logic: {
    // Pure: the questions in a raw reply (one per line that ends with "?"),
    // markdown and list markers stripped, de-duplicated.
    questions: function(reply) {
      var self = RPGACE.modules.deepDive, seen = {}, out = [];
      String(reply || '').split('\n').forEach(function(line) {
        var l = line.replace(/\*\*|__|`/g, '').replace(/^\s*(?:[-*•>]+|\d+[.)])\s*/, '').trim();
        if (l.length < 8 || l.length > 400 || !/\?\s*["”)]*\s*$/.test(l)) return;
        var k = l.toLowerCase();
        if (seen[k]) return;
        seen[k] = 1; out.push(l);
      });
      return out.slice(0, self.MAX_QUESTIONS);
    },
    key: function(qs) {
      var s = qs.join('|'), h = 0;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return 'dd' + (h >>> 0).toString(36);
    },
    load: function(k) {
      try { var all = JSON.parse(localStorage.getItem(RPGACE.modules.deepDive.STORE_KEY) || '{}'); return all[k] || null; } catch (e) { return null; }
    },
    save: function(k, state) {
      try {
        var self = RPGACE.modules.deepDive, all = JSON.parse(localStorage.getItem(self.STORE_KEY) || '{}');
        all[k] = state;
        var keys = Object.keys(all);
        if (keys.length > 5) keys.sort(function(a, b) { return (all[a].at || 0) - (all[b].at || 0); }).slice(0, keys.length - 5).forEach(function(x) { delete all[x]; });
        localStorage.setItem(self.STORE_KEY, JSON.stringify(all));
      } catch (e) {}
    },
    clear: function(k) {
      try { var self = RPGACE.modules.deepDive, all = JSON.parse(localStorage.getItem(self.STORE_KEY) || '{}'); delete all[k]; localStorage.setItem(self.STORE_KEY, JSON.stringify(all)); } catch (e) {}
    },
    // Pure: the one prompt sent to Oracle.
    compile: function(context, qs, state) {
      var lines = ['DEEP DIVE — my answers to the questions you asked me, one by one. Take them all together and give me one complete answer: what you see across them, the patterns, and what I should do next.', ''];
      if (context) lines.push('Your earlier reply began: "' + String(context).replace(/\s+/g, ' ').slice(0, 300) + '…"', '');
      var skipped = [];
      qs.forEach(function(q, i) {
        var a = String((state.answers || {})[i] || '').trim();
        if (!a) { skipped.push(i + 1); return; }
        lines.push((i + 1) + '. Q: ' + q, '   A: ' + a, '');
      });
      if (skipped.length) lines.push('Skipped (chose not to answer): ' + skipped.map(function(n) { return '#' + n; }).join(', '), '');
      var extra = String(state.extra || '').trim();
      lines.push('Extra thoughts that came up: ' + (extra || '(none)'));
      return lines.join('\n');
    }
  },

  ui: {
    // Called by addReplySaveRow for every Oracle answer.
    button: function(row, reply) {
      var self = RPGACE.modules.deepDive, qs = self.logic.questions(reply);
      if (qs.length < self.MIN_QUESTIONS) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'deep-dive-open';
      b.textContent = '🧭 Deep dive (' + qs.length + ')';
      b.style.cssText = 'background:none;border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif';
      b.onclick = function() { self.ui.open(qs, reply); };
      row.insertBefore(b, row.firstChild);
    },

    open: function(qs, reply) {
      var self = RPGACE.modules.deepDive, L = self.logic, dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return;
      var k = L.key(qs);
      var state = L.load(k) || { i: 0, answers: {}, extra: '' };
      var pop = dd._popup({ eyebrow: '🔮 Oracle', title: '🧭 Deep dive', width: '560px', noNav: true });
      var box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
      pop.box.appendChild(box);
      var persist = function() { state.at = Date.now(); L.save(k, state); };
      var btn = function(label, primary) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        b.style.cssText = 'min-height:44px;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;' +
          (primary ? 'background:var(--gold);border:1px solid var(--gold);color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
        return b;
      };
      var step = function() {
        box.innerHTML = '';
        var n = qs.length, last = state.i >= n;
        var prog = document.createElement('div'); prog.id = 'deep-dive-progress';
        prog.style.cssText = 'font-size:12px;color:var(--muted);';
        prog.textContent = last ? 'Last step' : 'Question ' + (state.i + 1) + ' of ' + n;
        var q = document.createElement('div'); q.id = 'deep-dive-question';
        q.style.cssText = 'font-size:17px;line-height:1.45;color:var(--text);font-weight:600;';
        q.textContent = last ? 'Any extra information or thoughts that came up?' : qs[state.i];
        var ta = document.createElement('textarea'); ta.id = 'deep-dive-answer'; ta.rows = 6;
        ta.style.cssText = 'width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
        ta.placeholder = last ? 'Optional' : 'Your answer…';
        ta.value = last ? (state.extra || '') : (state.answers[state.i] || '');
        ta.oninput = function() { if (last) state.extra = ta.value; else state.answers[state.i] = ta.value; persist(); };
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
        var back = btn('← Back'); back.disabled = state.i === 0;
        back.onclick = function() { state.i = Math.max(0, state.i - 1); persist(); step(); };
        row.appendChild(back);
        if (!last) {
          var skip = btn('Skip'); skip.id = 'deep-dive-skip';
          skip.onclick = function() { state.answers[state.i] = ''; state.i++; persist(); step(); };
          var next = btn(state.i === n - 1 ? 'Next: extra thoughts →' : 'Next →', true); next.id = 'deep-dive-next';
          next.onclick = function() { state.i++; persist(); step(); };
          row.appendChild(skip); row.appendChild(next);
        } else {
          var send = btn('✓ Send to Oracle', true); send.id = 'deep-dive-send';
          send.onclick = function() {
            var answered = qs.filter(function(_, i) { return String(state.answers[i] || '').trim(); }).length;
            if (!answered && !String(state.extra || '').trim()) { RPGACE.utils.toast('Answer at least one question first', '#E2A83D', 3000); return; }
            var prompt = L.compile(reply, qs, state);
            var inp = document.getElementById('chat-input');
            if (!inp || typeof sendChat !== 'function') { RPGACE.utils.toast('⚠️ Oracle chat is not available here', '#CC4A4A', 4000, 'deepDive'); return; }
            L.clear(k);
            pop.close();
            inp.value = prompt;
            sendChat();
          };
          row.appendChild(send);
        }
        var note = document.createElement('div'); note.style.cssText = 'font-size:12px;color:var(--muted);';
        note.textContent = 'Saved as you type — close any time and carry on later from the same button.';
        box.appendChild(prog); box.appendChild(q); box.appendChild(ta); box.appendChild(row); box.appendChild(note);
        setTimeout(function() { try { ta.focus(); } catch (e) {} }, 50);
      };
      step();
      return pop;
    }
  },

  init: function() {}
});
/* ===END:deepDive=== */
