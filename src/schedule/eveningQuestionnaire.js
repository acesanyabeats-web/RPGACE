/* ===MODULE:eveningQuestionnaire=== */
// RP-7 (Nov 5 2026, plan "Realm Pages + Evening Questionnaire", record
// records/2026-11/ui_audit_improvements_paranoia_2026-11-04.txt). Alex:
// "proper questionnaire to plan, run it on /interrogation logic"; ask about
// "Blocks with no log, Gaps in the day, Tomorrow's plan, Money & mood check",
// "Today's take-ins, Trackers & habits, New tasks queue, Realm targets";
// "separated by realms in foldable rows, and don't overwhelm me with these,
// 5 each by urgency and importance, with yes/no why and plan on yeses";
// "Frame first, Producer first"; ask style "I can decide between the 2".
// One Oracle call per evening (logic.generate) turns the day's facts into
// questions; answers + plans are kept in one journal row (source
// 'evening_questions', review_on = the day). FF-4: open feature_findings rows
// (written by the dev session's feedback review) join as questions with no
// call; Yes/No + why go back onto the finding.
RPGACE.register('eveningQuestionnaire', {
  domain: 'schedule',
  SOURCE: 'evening_questions',
  PER_REALM: 5,
  MODEL: 'claude-sonnet-4-6',
  _state: null, // { day, rowId, questions: [...], mode: 'one'|'all' }

  logic: {
    // Pure: 'day' first, then Producer, then the menu's realm order.
    realmOrder: function(order) {
      var o = (order || []).filter(function(r) { return r !== 'producer'; });
      return ['day', 'producer'].concat(o);
    },
    // Pure: clean model JSON -> ranked, capped, ordered questions.
    sanitize: function(j, order) {
      var self = RPGACE.modules.eveningQuestionnaire, X = RPGACE.modules.xpSeason, ok = function(r) { return r === 'day' || !!(X && X.REALMS[r]); };
      var clamp = function(n) { n = parseInt(n, 10); return isNaN(n) ? 3 : Math.max(1, Math.min(5, n)); };
      var qs = ((j && j.questions) || []).filter(function(q) { return q && ok(q.realm) && String(q.q || '').trim(); }).map(function(q, i) {
        var p = q.yes_plan || {}, kind = ['block', 'task', 'none'].indexOf(p.kind) > -1 ? p.kind : 'none';
        return { id: 'q' + i, src: 'oracle', realm: q.realm, q: String(q.q).trim().slice(0, 200), because: String(q.because || '').trim().slice(0, 200),
          urgency: clamp(q.urgency), importance: clamp(q.importance),
          plan: kind === 'none' ? null : { kind: kind, title: String(p.title || q.q).trim().slice(0, 100), mins: Math.max(10, Math.min(120, parseInt(p.mins, 10) || 30)) } };
      });
      return self.logic.rank(qs, order);
    },
    // Pure: per realm by urgency x importance, max PER_REALM, realms in order.
    rank: function(qs, order) {
      var self = RPGACE.modules.eveningQuestionnaire, ro = self.logic.realmOrder(order), by = {};
      (qs || []).forEach(function(q) { (by[q.realm] = by[q.realm] || []).push(q); });
      var out = [];
      ro.concat(Object.keys(by).filter(function(r) { return ro.indexOf(r) === -1; })).forEach(function(r) {
        (by[r] || []).sort(function(a, b) { return b.urgency * b.importance - a.urgency * a.importance; }).slice(0, self.PER_REALM).forEach(function(q) { out.push(q); });
      });
      return out;
    },
    // The day's facts, one line each with its realm. Reads what the app already holds.
    facts: function(day) {
      var M = RPGACE.modules, md = M.myDay, out = [], add = function(realm, text) { if (text) out.push({ realm: realm || 'day', text: String(text).slice(0, 160) }); };
      var L = md && md.logic;
      try { L.eveningModel(day).open.forEach(function(o) { add((o.b && o.b.realm) || 'day', 'Not done: ' + o.label); }); } catch (e) {}
      try { L.missedItems(day, [], 1440).forEach(function(x) { add(x.realm || 'day', 'Nothing logged: ' + x.label + ' at ' + L.fmtMin(x.from)); }); } catch (e) {}
      try { var tm = RPGACE.kit.addDays(day, 1); L.dayBlocks(tm).forEach(function(b) { add(b.realm || 'day', 'Tomorrow ' + (b.start_time || '') + ': ' + L.blockLabel(b)); }); if (!L.dayBlocks(tm).length) add('day', 'Tomorrow has nothing planned yet'); } catch (e) {}
      try { L.trackerRows(day).filter(function(x) { return x.zone === 'red'; }).forEach(function(x) { add('day', x.label + ': ' + (x.since == null ? 'never logged' : x.since + ' days (aim every ' + x.every + ')')); }); } catch (e) {}
      try { var inb = {}; (M.realmTasks ? M.realmTasks.logic.inbox() : []).forEach(function(t) { inb[t.realm] = (inb[t.realm] || 0) + 1; }); Object.keys(inb).forEach(function(r) { add(r, inb[r] + ' new task' + (inb[r] === 1 ? '' : 's') + ' waiting to be kept or dropped'); }); } catch (e) {}
      var waits = [
        M.tonightNotes ? M.tonightNotes.logic.list(day).then(function(rows) { rows.forEach(function(r) { add((r.realms || [])[0], 'Note for tonight: ' + r.content.replace(/\n.*/g, '')); }); }).catch(function() {}) : null,
        RPGACE.sb.select('intel_reports', 'select=title,realms&created_at=gte.' + day + 'T00:00:00&limit=10').then(function(rows) { (rows || []).forEach(function(r) { add((r.realms || [])[0], 'Took in: ' + r.title); }); }).catch(function() {}),
        M.realmFrame ? M.realmFrame.logic.targetState('steward').then(function(st) { var t = M.realmFrame.logic.targetText(st); if (t) add('steward', 'Money: ' + t); }).catch(function() {}) : null
      ];
      return Promise.all(waits).then(function() { return out.slice(0, 45); });
    },
    generate: function(day) {
      var self = RPGACE.modules.eveningQuestionnaire, RP = RPGACE.modules.realmPages;
      return self.logic.facts(day).then(function(fs) {
        if (!fs.length) return [];
        var prompt = RPGACE.prompt('evening_questions', { today: day, facts: fs.map(function(f) { return '[' + f.realm + '] ' + f.text; }).join('\n') });
        return RPGACE.kit.ask(prompt, { json: true, max: 1000, model: self.MODEL }).then(function(j) { return self.logic.sanitize(j, RP ? RP.logic.cachedOrder() : []); });
      });
    },
    // FF-4: open findings as questions (no Oracle call).
    findings: function() {
      return RPGACE.kit.readPrivate('feature_findings', 'select=*&status=eq.open&order=created_at.asc&limit=40').then(function(rows) {
        var X = RPGACE.modules.xpSeason;
        return (rows || []).map(function(f) {
          var realm = f.realm && (f.realm === 'day' || (X && X.REALMS[f.realm])) ? f.realm : 'day';
          return { id: 'f_' + f.id, src: 'finding', findingId: f.id, realm: realm, q: String(f.finding || '').slice(0, 220),
            because: [f.feature || f.page, f.evidence].filter(Boolean).join(' · ').slice(0, 220), urgency: f.urgency || 3, importance: f.importance || 3, plan: null, kind: f.kind || 'improve' };
        });
      }).catch(function() { return []; });
    },
    load: function(day) {
      return RPGACE.sb.select('journal', 'select=id,content&source=eq.evening_questions&review_on=eq.' + day + '&limit=1').then(function(r) {
        var row = r && r[0]; if (!row) return null;
        try { var c = JSON.parse(row.content); c.rowId = row.id; return c; } catch (e) { return null; }
      });
    },
    save: function(st) {
      var self = RPGACE.modules.eveningQuestionnaire;
      var content = JSON.stringify({ day: st.day, questions: st.questions });
      var row = { title: '🔮 Evening questions', content: content, source: self.SOURCE, entry_type: 'evening_questions', review_on: st.day, date: st.day };
      var w = st.rowId ? RPGACE.sb.secureWrite('journal', 'update', { content: content }, 'id=eq.' + st.rowId)
        : RPGACE.sb.secureWrite('journal', 'insert', row).then(function(res) {
          var d = res && (res.data || res); var id = Array.isArray(d) ? d[0] && d[0].id : d && d.id; if (id) st.rowId = id; return res;
        });
      return w.then(function() { try { RPGACE.cache.clear('journal'); } catch (e) {} });
    },
    // A Yes's plan: a block tomorrow, or a kept task in that realm.
    makePlan: function(q, day) {
      var M = RPGACE.modules, p = q.plan, realm = q.realm === 'day' ? 'life' : q.realm;
      if (!p) return Promise.resolve(null);
      if (p.kind === 'block') {
        var tm = RPGACE.kit.addDays(day, 1);
        return M.myDay.logic.placeNext(tm, RPGACE.kit.iso(), { type: 'activity', realm: realm, label: '✨ ' + p.title, mins: p.mins, src: 'evening' })
          .then(function(at) { return 'Block tomorrow at ' + M.myDay.logic.fmtMin(at); });
      }
      return M.realmTasks.logic.keepIdea({ realm: realm, title: p.title, notes: q.because, kind: 'once', source: 'evening' }).then(function() { return 'Task kept in ' + realm; });
    },
    answerFinding: function(q) {
      return RPGACE.sb.secureWrite('feature_findings', 'update', { status: q.answer, answer_why: q.why || null, answered_at: new Date().toISOString() }, 'id=eq.' + q.findingId);
    }
  },

  ui: {
    // Mounted at the top of the evening review. Generates once per day (one call), then reuses the saved row.
    mount: function(host, day) {
      var self = RPGACE.modules.eveningQuestionnaire, L = self.logic, U = self.ui;
      var box = document.createElement('div'); box.id = 'eq-box';
      box.style.cssText = 'border:1px solid rgba(155,89,182,.45);border-radius:12px;padding:10px 12px;margin-bottom:12px;background:rgba(155,89,182,.06);';
      box.innerHTML = '<div style="font-weight:700;color:#9B59B6;margin-bottom:6px;">🔮 Tonight\'s questions</div><div id="eq-body" style="font-size:13px;color:var(--muted);">Reading your day…</div>';
      host.appendChild(box);
      var body = box.querySelector('#eq-body');
      Promise.all([L.load(day).catch(function() { return null; }), L.findings()]).then(function(r) {
        var saved = r[0], fq = r[1];
        var merge = function(qs) {
          var have = {}; qs.forEach(function(q) { have[q.id] = 1; });
          fq.forEach(function(q) { if (!have[q.id]) qs.push(q); });
          var RP = RPGACE.modules.realmPages; return L.rank(qs, RP ? RP.logic.cachedOrder() : []);
        };
        if (saved && saved.questions) { self._state = { day: day, rowId: saved.rowId, questions: merge(saved.questions), mode: 'one' }; U.draw(body); return; }
        body.textContent = 'Writing tonight\'s questions…';
        L.generate(day).then(function(qs) {
          self._state = { day: day, rowId: null, questions: merge(qs), mode: 'one' };
          if (qs.length) L.save(self._state).catch(function(e) { RPGACE.utils.toast('⚠️ Questions not saved: ' + (e.message || e), '#CC4A4A', 4000, 'eveningQuestionnaire'); });
          U.draw(body);
        }, function(e) {
          self._state = { day: day, rowId: null, questions: merge([]), mode: 'one' };
          U.draw(body);
          var m = document.createElement('div'); m.style.cssText = 'color:#CC4A4A;font-size:12px;margin-top:6px;'; m.textContent = '⚠️ Oracle could not write tonight\'s questions: ' + (e.message || e);
          body.appendChild(m);
        });
      });
      return box;
    },
    draw: function(body) {
      var self = RPGACE.modules.eveningQuestionnaire, st = self._state, U = self.ui, X = RPGACE.modules.xpSeason;
      body.innerHTML = ''; body.style.color = 'var(--text)';
      var qs = st.questions, left = qs.filter(function(q) { return !q.answer; });
      if (!qs.length) { body.textContent = 'Nothing to ask tonight.'; return; }
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;';
      var cnt = document.createElement('span'); cnt.id = 'eq-count'; cnt.style.cssText = 'flex:1;font-size:13px;color:var(--muted);'; cnt.textContent = (qs.length - left.length) + ' of ' + qs.length + ' answered';
      var sw = RPGACE.kit.btn(st.mode === 'one' ? '☰ See all' : '▶ One at a time', ''); sw.id = 'eq-mode';
      sw.onclick = function() { st.mode = st.mode === 'one' ? 'all' : 'one'; U.draw(body); };
      bar.appendChild(cnt); bar.appendChild(sw); body.appendChild(bar);
      var name = function(r) { if (r === 'day') return '🌙 Your day'; var R = X && X.REALMS[r]; return R ? R.icon + ' ' + R.name : r; };
      if (st.mode === 'one') {
        if (!left.length) { var d = document.createElement('div'); d.id = 'eq-done'; d.textContent = '✅ All answered. Tomorrow is planned from your yeses.'; body.appendChild(d); return; }
        var q = left[0], tag = document.createElement('div'); tag.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:4px;'; tag.textContent = name(q.realm);
        body.appendChild(tag); body.appendChild(U.card(q, function() { U.draw(body); }));
        return;
      }
      var by = {}, order = [];
      qs.forEach(function(q) { if (!by[q.realm]) { by[q.realm] = []; order.push(q.realm); } by[q.realm].push(q); });
      order.forEach(function(r) {
        var det = document.createElement('details'); det.className = 'eq-realm'; det.dataset.realm = r;
        det.style.cssText = 'border:1px solid var(--border);border-radius:10px;margin:6px 0;padding:0 10px;';
        var open = by[r].filter(function(q) { return !q.answer; }).length;
        var sm = document.createElement('summary'); sm.style.cssText = 'min-height:44px;display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;';
        sm.textContent = name(r) + ' · ' + (open ? open + ' to answer' : 'done');
        det.appendChild(sm);
        by[r].forEach(function(q) { det.appendChild(U.card(q, function() { U.draw(body); })); });
        body.appendChild(det);
      });
    },
    // One question: Yes / No + a why box; a Yes with a plan shows it before saving.
    card: function(q, redraw) {
      var self = RPGACE.modules.eveningQuestionnaire, L = self.logic, st = self._state;
      var c = document.createElement('div'); c.className = 'eq-card'; c.dataset.id = q.id;
      c.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);';
      var t = document.createElement('div'); t.style.cssText = 'font-size:15px;font-weight:700;line-height:1.4;'; t.textContent = (q.src === 'finding' ? '🧪 ' : '') + q.q; c.appendChild(t);
      if (q.because) { var b = document.createElement('div'); b.style.cssText = 'font-size:12px;color:var(--muted);margin:2px 0 6px;'; b.textContent = q.because; c.appendChild(b); }
      if (q.answer) {
        var a = document.createElement('div'); a.className = 'eq-answered'; a.style.cssText = 'font-size:13px;';
        a.textContent = (q.answer === 'yes' ? '✅ Yes' : '❌ No') + (q.why ? ' — ' + q.why : '') + (q.planned ? ' · ' + q.planned : '');
        c.appendChild(a); return c;
      }
      var why = document.createElement('input'); why.type = 'text'; why.className = 'eq-why'; why.placeholder = 'Why? (optional)';
      why.style.cssText = 'width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);margin-bottom:6px;font-family:inherit;';
      c.appendChild(why);
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;';
      var yes = RPGACE.kit.btn('Yes', 'primary'), no = RPGACE.kit.btn('No', '');
      yes.className += ' eq-yes'; no.className += ' eq-no'; yes.style.flex = no.style.flex = '1';
      var finish = function(ans, planned) {
        q.answer = ans; q.why = why.value.trim() || null; if (planned) q.planned = planned;
        var w = [L.save(st)]; if (q.src === 'finding') w.push(L.answerFinding(q));
        Promise.all(w).then(redraw, function(e) { RPGACE.utils.toast('⚠️ Answer not saved: ' + (e.message || e), '#CC4A4A', 4000, 'eveningQuestionnaire'); redraw(); });
      };
      no.onclick = function() { finish('no'); };
      yes.onclick = function() {
        if (!q.plan) { finish('yes'); return; }
        row.innerHTML = '';
        var pv = document.createElement('div'); pv.className = 'eq-plan'; pv.style.cssText = 'flex:1 1 100%;font-size:13px;margin-bottom:6px;';
        pv.textContent = 'Plan: ' + (q.plan.kind === 'block' ? 'a ' + RPGACE.kit.hm(q.plan.mins) + ' block tomorrow' : 'a task') + ' · ' + q.plan.title;
        var ok = RPGACE.kit.btn('Save plan', 'primary'), skip = RPGACE.kit.btn('Yes, no plan', '');
        ok.className += ' eq-plan-ok'; ok.style.flex = skip.style.flex = '1';
        ok.onclick = function() { ok.disabled = true; L.makePlan(q, st.day).then(function(msg) { finish('yes', msg); }, function(e) { ok.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'eveningQuestionnaire'); }); };
        skip.onclick = function() { finish('yes'); };
        row.style.flexWrap = 'wrap'; row.appendChild(pv); row.appendChild(ok); row.appendChild(skip);
      };
      row.appendChild(yes); row.appendChild(no); c.appendChild(row);
      return c;
    }
  }
});
/* ===END:eveningQuestionnaire=== */
