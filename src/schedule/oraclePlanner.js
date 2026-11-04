/* ===MODULE:oraclePlanner=== */
// OA-2 (Nov 4 2026, plan "Oracle Assistant + Live now modes"). Alex: "plan my day out by just talking to oracle directly
// saying what I need to get done today or another day, at it creates blocks based on answers I give what I want to
// achieve, the goals I set, then uses the UI and code to do logs of planning for me". Answers: plan card first - "but I
// can edit too with suggestions in chat, oracle revises it, then I accept"; "My Day button + chat".
// Flow: 🗣 Plan with Oracle (Plan my day, or "plan my day" typed on the Oracle page) -> a chat pop-up that goes through
// the real Oracle chat (oracleControl._sendFromOverlay + reply mirror) with a 'dayplan' context: the day's shifts,
// blocks, free time and the DAY_PLAN_JSON trailer rule. Each plan reply redraws the plan card; Accept saves the ticked
// blocks through myDay.logic.saveRealmBlock (clash guard, Homekeeping/Building alongside rules).
// Planning log (Alex: "Planning log is in journal until it is set in my day ... once all blocks set, the log is deleted
// to save data. Save the plan logs for the week to test"): one Journal entry per plan (source oracle_plan), updated on
// each revision and on Accept; deleted once every block is set - but kept during the test week (to TEST_UNTIL).
RPGACE.register('oraclePlanner', {
  domain: 'schedule',

  logic: {
    TRAILER: 'DAY_PLAN_JSON:',
    TEST_UNTIL: '2026-11-10',
    realmKeys: function() { var xs = RPGACE.modules.xpSeason; return xs ? (xs.ORDER || Object.keys(xs.REALMS)) : ['life']; },
    // What Oracle needs to know about the day (shifts, blocks already there, free time, Morning/Night).
    dayFacts: function(date) {
      var md = RPGACE.modules.myDay, L = md.logic, out = [];
      try {
        var sh = L.shiftsOn(date) || [];
        if (sh.length) out.push('Shifts: ' + sh.map(function(s) { return s.start + '-' + s.end; }).join(', ') + ' (plus get-ready/travel either side).');
        var s = L.daySegs(date), segs = s.segs;
        var be = L.dayParts(date).be;
        if (be.morning && be.morning.to > be.morning.from) out.push('Morning routine ' + L.fmtMin(be.morning.from) + '-' + L.fmtMin(be.morning.to) + '.');
        if (be.night && be.night.to > be.night.from) out.push('Night routine ' + L.fmtMin(be.night.from) + '-' + L.fmtMin(be.night.to) + '.');
        var taken = segs.filter(function(g) { return g.kind === 'block' || g.kind === 'item'; })
          .map(function(g) { return L.fmtMin(g.from) + '-' + L.fmtMin(g.to) + ' ' + g.label; });
        if (taken.length) out.push('Already planned: ' + taken.join('; ') + '.');
        var startM = date === L.iso() ? L.snap5(L.nowMin()) : (be.morning && be.morning.to) || 480;
        var gaps = L.freeGaps(segs, startM, (be.night && be.night.from) || 1380, 20).map(function(g) { return L.fmtMin(g.from) + '-' + L.fmtMin(g.to); });
        out.push(gaps.length ? 'Free time: ' + gaps.join(', ') + '.' : 'No free time left that day.');
      } catch (e) { out.push('(Day details could not be read.)'); }
      return out.join('\n');
    },
    instructions: function(date) {
      var L = RPGACE.modules.oraclePlanner.logic, md = RPGACE.modules.myDay;
      var label = md ? md.ui._dayLabel(date) : date;
      return '[PLANNING ' + label + ' (' + date + ') WITH ALEX]\n' + L.dayFacts(date) + '\n'
        + 'Be his planner: if he hasn\'t said what he needs done and what he wants to achieve, ask (briefly, max 3 questions). '
        + 'When you have enough, propose a realistic plan inside the free time (Homekeeper and Builder blocks may run alongside other blocks; Builder may run during a shift). '
        + 'Whenever you propose or revise a plan, end your reply with ONE line: ' + L.TRAILER + ' {"date":"' + date + '","goals":["..."],"blocks":[{"date":"' + date + '","start":"HH:MM","mins":60,"realm":"<key>","title":"...","steps":["..."]}]} '
        + '- always the FULL plan, realm keys only from: ' + L.realmKeys().join(', ') + '. Never say blocks are saved: Alex accepts them in the app.\n[/PLANNING]\n';
    },
    // Pure: the last DAY_PLAN_JSON in a reply -> a clean plan, or null.
    parse: function(text, fallbackDate) {
      var L = RPGACE.modules.oraclePlanner.logic, t = String(text || ''), i = t.lastIndexOf(L.TRAILER);
      if (i < 0) return null;
      var raw = t.slice(i + L.TRAILER.length), a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      var j; try { j = JSON.parse(raw.slice(a, b + 1)); } catch (e) { return null; }
      var keys = L.realmKeys(), isoRx = /^\d{4}-\d{2}-\d{2}$/, hmRx = /^([01]?\d|2[0-3]):[0-5]\d$/;
      var date = isoRx.test(j && j.date) ? j.date : fallbackDate;
      var blocks = (Array.isArray(j && j.blocks) ? j.blocks : []).map(function(x) {
        if (!x || !hmRx.test(String(x.start || ''))) return null;
        var mins = Math.max(10, Math.min(480, Math.round(Number(x.mins) || 60)));
        var steps = (Array.isArray(x.steps) ? x.steps : []).map(function(s) { return String(s || '').trim().slice(0, 80); }).filter(Boolean).slice(0, 6);
        var title = String(x.title || '').trim().slice(0, 80) || steps[0] || 'Block';
        return { date: isoRx.test(x.date) ? x.date : date, start: String(x.start).padStart(5, '0'), mins: mins, realm: keys.indexOf(x.realm) !== -1 ? x.realm : 'life', title: title, steps: steps.length ? steps : [title] };
      }).filter(Boolean).slice(0, 16);
      if (!blocks.length) return null;
      var goals = (Array.isArray(j.goals) ? j.goals : []).map(function(g) { return String(g || '').trim().slice(0, 120); }).filter(Boolean).slice(0, 6);
      blocks.sort(function(p, q) { return (p.date + p.start).localeCompare(q.date + q.start); });
      return { date: date, goals: goals, blocks: blocks };
    },
    // Save the ticked blocks one by one; a clash on one never stops the rest.
    save: function(plan, picked) {
      var md = RPGACE.modules.myDay, L = md.logic, set = [], failed = [];
      return plan.blocks.filter(function(b, i) { return picked[i] !== false; }).reduce(function(p, b) {
        return p.then(function() {
          var per = Math.max(5, Math.round(b.mins / b.steps.length));
          return L.saveRealmBlock(b.date, { realm: b.realm, start: b.start, mins: b.mins, method: L.methodFor(b.realm),
            realm_items: b.steps.map(function(s) { return { src: 'own', label: s, mins: per, earns: 'tick' }; }) })
            .then(function() { set.push(b); }, function(e) { failed.push({ b: b, why: (e && e.message) || String(e) }); });
        });
      }, Promise.resolve()).then(function() { return { set: set, failed: failed }; });
    },
    // Pure: the log text.
    logText: function(plan, result, picked) {
      var lines = ['🗓 Planned with Oracle'];
      if (plan.goals.length) lines.push('Goals: ' + plan.goals.join('; '));
      var R = function(k) { var xs = RPGACE.modules.xpSeason; return (xs && xs.REALMS[k]) || { icon: '✨', name: k }; };
      plan.blocks.forEach(function(b, i) {
        var st = !result ? 'proposed' : result.set.indexOf(b) !== -1 ? 'set' : picked && picked[i] === false ? 'left out' : 'not set';
        lines.push('- ' + b.date.slice(5) + ' ' + b.start + ' (' + RPGACE.kit.hm(b.mins) + ') ' + R(b.realm).icon + ' ' + b.title + ' · ' + st);
      });
      if (result && result.failed.length) result.failed.forEach(function(f) { lines.push('Not set: ' + f.b.title + ' — ' + f.why); });
      return lines.join('\n');
    },
    // One Journal entry per plan: insert, then update; deleted once all blocks are set (kept in the test week).
    log: function(st, plan, result, picked) {
      var L = RPGACE.modules.oraclePlanner.logic, md = RPGACE.modules.myDay;
      var row = { title: '🗓 Plan for ' + (md ? md.ui._dayLabel(plan.date) : plan.date), content: L.logText(plan, result, picked),
        date: new Date(plan.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        source: 'oracle_plan', entry_type: 'day_plan', review_on: plan.date };
      var done = result && !result.failed.length && result.set.length === plan.blocks.filter(function(b, i) { return !picked || picked[i] !== false; }).length;
      var keep = RPGACE.kit.today() <= L.TEST_UNTIL;
      var p = st.logId ? RPGACE.sb.secureWrite('journal', 'update', row, 'id=eq.' + st.logId)
        : RPGACE.sb.secureWrite('journal', 'insert', Object.assign({ created_at: new Date().toISOString() }, row)).then(function(d) { st.logId = (Array.isArray(d) && d[0] && d[0].id) || null; });
      return p.then(function() {
        RPGACE.cache.clear('journal');
        if (done && !keep && st.logId) return RPGACE.sb.secureWrite('journal', 'delete', null, 'id=eq.' + st.logId).then(function() { st.logId = null; RPGACE.cache.clear('journal'); return 'deleted'; });
        return done ? 'kept (test week)' : 'saved';
      });
    }
  },

  ui: {
    open: function(date, firstText) {
      var self = RPGACE.modules.oraclePlanner, L = self.logic, oc = RPGACE.modules.oracleControl, md = RPGACE.modules.myDay, K = RPGACE.kit;
      if (!oc || !oc._sendFromOverlay) { RPGACE.utils.toast('⚠️ Oracle is not loaded yet', '#CC4A4A', 3000, 'oraclePlanner'); return null; }
      date = date || md.logic.iso();
      var st = { date: date, plan: null, picked: [], logId: null, open: true };
      self._st = st;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🗣 Plan with Oracle', title: md.ui._dayLabel(date), width: '620px', closeLabel: 'Close',
        onClose: function() { st.open = false; } });
      pop.box.id = 'op-planner';
      // One live Oracle log at a time: free the shared ids from any other Ask box.
      ['oc-ov-log', 'oc-ov-input', 'oc-ov-send', 'oc-ov-thinking'].forEach(function(id) { var o = document.getElementById(id); if (o) o.removeAttribute('id'); });
      var hint = document.createElement('div'); hint.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;';
      hint.textContent = 'Tell Oracle what you need to get done and what you want to achieve. It answers with a plan card; type changes and it redoes the card; Accept puts the blocks on My Day.';
      var log = document.createElement('div'); log.id = 'oc-ov-log'; log.style.cssText = 'font-size:14px;line-height:1.5;color:var(--text);max-height:38vh;overflow-y:auto;';
      var card = document.createElement('div'); card.id = 'op-card';
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
      var ta = document.createElement('textarea'); ta.id = 'oc-ov-input'; ta.rows = 2; ta.placeholder = 'e.g. I need to make a beat, gym, shop for work trousers - goal: post a video by Friday';
      ta.style.cssText = 'flex:1;min-width:0;resize:none;min-height:52px;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:16px;font-family:inherit;';
      var sb = document.createElement('button'); sb.type = 'button'; sb.id = 'oc-ov-send'; sb.textContent = 'Send';
      sb.style.cssText = 'min-height:52px;padding:0 16px;border-radius:8px;border:none;background:#9B59B6;color:#fff;font-weight:700;font-size:15px;cursor:pointer;';
      var send = function(t) { t = String(t || ta.value || '').trim(); if (!t) return; self._sending = true; try { oc._sendFromOverlay(t); } finally { self._sending = false; } ta.value = ''; };
      sb.onclick = function() { send(); };
      ta.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      row.appendChild(ta); row.appendChild(sb);
      pop.box.appendChild(hint); pop.box.appendChild(log); pop.box.appendChild(card); pop.box.appendChild(row);
      self.ui._card(st);
      if (firstText) setTimeout(function() { send(firstText); }, 50);
      return pop;
    },
    _card: function(st) {
      var self = RPGACE.modules.oraclePlanner, L = self.logic, K = RPGACE.kit, card = document.getElementById('op-card');
      if (!card) return;
      card.innerHTML = '';
      if (!st.plan) return;
      var xs = RPGACE.modules.xpSeason, box = document.createElement('div');
      box.style.cssText = 'margin-top:10px;border:1px solid var(--gold);border-radius:12px;padding:10px 12px;';
      var h = document.createElement('div'); h.style.cssText = 'font-weight:700;color:var(--gold);margin-bottom:6px;'; h.textContent = '🗓 Plan · untick anything you don\'t want';
      box.appendChild(h);
      if (st.plan.goals.length) { var g = document.createElement('div'); g.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;'; g.textContent = '🎯 ' + st.plan.goals.join(' · '); box.appendChild(g); }
      st.plan.blocks.forEach(function(b, i) {
        var R = (xs && xs.REALMS[b.realm]) || { icon: '✨', name: b.realm };
        var r = document.createElement('label'); r.className = 'op-block';
        r.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--border);cursor:pointer;';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = st.picked[i] !== false; cb.style.cssText = 'width:22px;height:22px;margin-top:2px;';
        cb.onchange = function() { st.picked[i] = cb.checked; };
        var tx = document.createElement('div'); tx.style.cssText = 'flex:1;min-width:0;font-size:14px;color:var(--text);';
        tx.innerHTML = '<b>' + K.esc((b.date !== st.plan.date ? b.date.slice(5) + ' ' : '') + b.start + ' · ' + RPGACE.kit.hm(b.mins)) + '</b> ' + K.esc(R.icon + ' ' + b.title)
          + '<div style="font-size:12px;color:var(--muted);">' + K.esc(b.steps.join(' · ')) + '</div>';
        r.appendChild(cb); r.appendChild(tx); box.appendChild(r);
      });
      var acc = K.btn('✓ Accept plan', 'primary'); acc.id = 'op-accept'; acc.style.cssText += 'margin-top:8px;min-height:44px;';
      acc.onclick = function() {
        acc.disabled = true; acc.textContent = 'Saving…';
        L.save(st.plan, st.picked).then(function(res) {
          return L.log(st, st.plan, res, st.picked).then(function(how) {
            var msg = '🗓 ' + res.set.length + ' block' + (res.set.length === 1 ? '' : 's') + ' on My Day' + (res.failed.length ? ' · ' + res.failed.length + ' not set (clash) - see the Journal log' : '');
            RPGACE.utils.toast(msg, res.failed.length ? '#e0a84c' : '#4caf82', 4000);
            acc.textContent = res.failed.length ? '✓ Saved ' + res.set.length + ' · ask Oracle to fix the rest' : '✓ All set';
            try { RPGACE.modules.myDay.ui.render(); } catch (e) {}
            return how;
          });
        }).catch(function(e) { acc.disabled = false; acc.textContent = '✓ Accept plan'; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'oraclePlanner'); });
      };
      box.appendChild(acc);
      card.appendChild(box);
    },
    // Each Oracle reply while the planner is open: a plan in it redraws the card and updates the Journal log.
    _onReply: function() {
      var self = RPGACE.modules.oraclePlanner, L = self.logic, st = self._st;
      if (!st || !st.open || typeof STATE === 'undefined') return;
      var h = STATE.chatHistory || [], last = null;
      for (var i = h.length - 1; i >= 0; i--) if (h[i] && h[i].role === 'assistant') { last = h[i]; break; }
      if (!last || last === st.lastSeen) return;
      st.lastSeen = last;
      var plan = L.parse(last.content, st.date);
      if (!plan) return;
      st.plan = plan; st.picked = [];
      self.ui._card(st);
      L.log(st, plan, null, null).catch(function(e) { console.warn('[oraclePlanner] log:', e && e.message); });
    }
  },

  init: function() {
    var self = this;
    var oc = RPGACE.modules.oracleControl;
    if (oc && oc.registerContextProvider) oc.registerContextProvider('dayplan', function() {
      var st = self._st; return st && st.open && document.getElementById('op-planner') ? self.logic.instructions(st.date) : null;
    });
    RPGACE.hooks.on('oracle:response-scanned', function() { setTimeout(function() { try { self.ui._onReply(); } catch (e) { console.warn('[oraclePlanner]', e); } }, 0); });
    // "plan my day / tomorrow / my week" typed on the Oracle page opens the planner with that text.
    var patch = function() {
      if (typeof window.sendChat !== 'function' || window._planChatPatched) return;
      window._planChatPatched = true;
      var orig = window.sendChat;
      window.sendChat = function() {
        var inp = document.getElementById('chat-input'), v = inp ? String(inp.value || '').trim() : '';
        if (!self._sending && /^(help me )?plan (out )?(my |the )?(day|tomorrow|week|today)\b/i.test(v)) {
          inp.value = '';
          var md = RPGACE.modules.myDay, d = md ? md.logic.iso() : null;
          if (md && /tomorrow/i.test(v)) d = md.logic.addDays(d, 1);
          self.ui.open(d, v);
          return;
        }
        return orig.apply(this, arguments);
      };
    };
    patch();
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(patch, 1000); });
  }
});
/* ===END:oraclePlanner=== */
