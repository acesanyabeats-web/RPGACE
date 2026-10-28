
/* ===MODULE:studyHub=== */
// Oct 20 2026 — 🎓 Study: exam practice inside Knowledge, starting with the
// AWS Certified AI Practitioner (AIF-C01). Alex approved the brief ("approved"):
// a general Study page, AWS first; lessons explained through RPGACE's own
// features; ~300 practice questions written up front (no AI cost per round);
// Quick 10 / topic round / full 65-question mock with the 90-minute timer /
// service-name flash round; wrong answers come back on Recall's own 1-3-7-16-35
// day schedule (recall.logic.next, rule 8); +2 Scholar XP per correct answer,
// max 30 a day (DB trigger xp_on_study -> xp_award 'study_round').
// Tables: study_courses / study_lessons / study_questions / study_sessions /
// study_attempts (anon read, writes via /api/data-write). The question files in
// study/<course>/ are the source of truth: on open, questions missing from
// Supabase are added from them (insert on_conflict course_id,stem).
// Options are shuffled every time a question is shown (the files list the
// right answer first most of the time).
RPGACE.register('studyHub', {
  domain: 'knowledge',
  COURSE: 'aws-aif-c01',
  BANK_DIR: '/study/aws-aif-c01/',
  OFFICIAL: 'https://skillbuilder.aws/',

  init: function() {
    var self = RPGACE.modules.studyHub;
    RPGACE.areaNav.onPageShow('study', function() { self.open(); });
  },

  open: function(opts) { return this.ui.open(opts); },

  // ============================================================
  // logic — data, picking, scoring. No DOM.
  // ============================================================
  logic: {
    MODES: {
      quick: { label: '⚡ Quick 10', n: 10 },
      topic: { label: '📖 Topic round', n: 15 },
      mock:  { label: '⏱ Full mock exam', n: 65 },
      flash: { label: '🏷 Service names', n: 15 },
      redo:  { label: '🔁 Redo wrong answers', n: 20 }
    },
    MIN_PER_TOPIC: 5,
    today: function(now) { return RPGACE.modules.recall.logic.today(now); },

    // Largest-remainder split of the mock's questions by exam weight
    // (20/24/28/14/14 of 65 -> 13/16/18/9/9).
    mockCounts: function(domains, total) {
      var sum = domains.reduce(function(a, d) { return a + Number(d.weight || 0); }, 0) || 1;
      var raw = domains.map(function(d) { return total * Number(d.weight || 0) / sum; });
      var out = raw.map(Math.floor);
      var left = total - out.reduce(function(a, b) { return a + b; }, 0);
      raw.map(function(r, i) { return { i: i, f: r - Math.floor(r) }; })
        .sort(function(a, b) { return b.f - a.f; })
        .slice(0, left).forEach(function(x) { out[x.i]++; });
      var m = {};
      domains.forEach(function(d, i) { m[d.code] = out[i]; });
      return m;
    },

    // Latest answer per question, and per-topic accuracy over the last
    // 40 answers in that topic.
    stats: function(questions, attempts) {
      var byId = {}, last = {}, dom = {};
      questions.forEach(function(q) { byId[q.id] = q; });
      (attempts || []).slice().sort(function(a, b) { return String(b.answered_at).localeCompare(String(a.answered_at)); })
        .forEach(function(a) {
          var q = byId[a.question_id];
          if (!q) return;
          if (!(a.question_id in last)) last[a.question_id] = !!a.correct;
          var d = dom[q.domain] || (dom[q.domain] = { answered: 0, correct: 0 });
          if (d.answered >= 40) return;
          d.answered++; if (a.correct) d.correct++;
        });
      Object.keys(dom).forEach(function(k) { dom[k].acc = dom[k].answered ? dom[k].correct / dom[k].answered : 0; });
      return { last: last, domains: dom };
    },

    // Estimated score out of 1000: exam-weighted accuracy, shown only once
    // every topic has at least MIN_PER_TOPIC answers.
    estimate: function(course, st) {
      var L = RPGACE.modules.studyHub.logic, short = [];
      var sum = 0, w = 0;
      (course.domains || []).forEach(function(d) {
        var s = st.domains[d.code];
        if (!s || s.answered < L.MIN_PER_TOPIC) short.push(d.code);
        w += Number(d.weight); sum += Number(d.weight) * (s ? s.acc : 0);
      });
      if (short.length) return { ready: false, short: short };
      var score = Math.round(1000 * sum / (w || 1));
      return { ready: true, score: score, pass: score >= (course.pass_score || 700) };
    },

    // Higher = asked sooner: wrong last time, then never seen, then
    // weak topics; rnd breaks ties so rounds differ.
    priority: function(q, st, rnd) {
      var p = 0, last = st.last[q.id];
      if (last === false) p += 3;
      else if (last === undefined) p += 2;
      var d = st.domains[q.domain];
      p += d ? (1 - d.acc) * 2 : 1;
      return p + (rnd ? rnd() : Math.random());
    },

    pick: function(mode, questions, st, course, opts, rnd) {
      var L = RPGACE.modules.studyHub.logic;
      opts = opts || {};
      rnd = rnd || Math.random;
      var by = function(list, n) {
        return list.map(function(q) { return { q: q, p: L.priority(q, st, rnd) }; })
          .sort(function(a, b) { return b.p - a.p; }).slice(0, n).map(function(x) { return x.q; });
      };
      if (mode === 'topic') return by(questions.filter(function(q) { return q.domain === opts.domain; }), L.MODES.topic.n);
      if (mode === 'flash') return by(questions.filter(function(q) { return (q.tags || []).indexOf('service') >= 0; }), L.MODES.flash.n);
      if (mode === 'redo') {
        var t = L.today();
        return questions.filter(function(q) { return q.recall_due && q.recall_due <= t; })
          .sort(function(a, b) { return String(a.recall_due).localeCompare(String(b.recall_due)); }).slice(0, L.MODES.redo.n);
      }
      if (mode === 'mock') {
        var counts = L.mockCounts(course.domains || [], course.exam_questions || 65), out = [];
        Object.keys(counts).forEach(function(code) {
          var pool = questions.filter(function(q) { return q.domain === code; })
            .map(function(q) { return { q: q, p: (st.last[q.id] === undefined ? 1 : 0) + rnd() }; })
            .sort(function(a, b) { return b.p - a.p; }).slice(0, counts[code]).map(function(x) { return x.q; });
          out = out.concat(pool);
        });
        return L.shuffle(out, rnd);
      }
      return by(questions, L.MODES.quick.n);
    },

    shuffle: function(list, rnd) {
      var a = list.slice();
      rnd = rnd || Math.random;
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    },
    // The order the options are shown in (original indexes).
    order: function(q, rnd) {
      var idx = (q.options || []).map(function(_, i) { return i; });
      return RPGACE.modules.studyHub.logic.shuffle(idx, rnd);
    },
    isCorrect: function(q, chosen) {
      var want = (q.answer || []).map(Number).sort().join(',');
      return (chosen || []).map(Number).sort().join(',') === want;
    },
    need: function(q) { return (q.answer || []).length; },

    // Recall schedule patch for a question after an answer (null = no change).
    recallPatch: function(q, correct, now) {
      var R = RPGACE.modules.recall.logic;
      if (!correct) return { recall_step: 0, recall_due: R.dueIn(0, now) };
      if (q.recall_due) return R.next(q, true, now);
      return null;
    },

    summary: function(run) {
      var by = {}, correct = 0;
      run.answers.forEach(function(a) {
        var d = by[a.domain] || (by[a.domain] = { total: 0, correct: 0 });
        d.total++; if (a.correct) { d.correct++; correct++; }
      });
      var total = run.answers.length;
      return { total: total, correct: correct, by_domain: by, score: total ? Math.round(1000 * correct / total) : 0 };
    },

    // ---- reads ----
    load: function() {
      var self = RPGACE.modules.studyHub, C = self.COURSE;
      var safe = function(p) { return Promise.resolve(p).catch(function() { return []; }); };
      return Promise.all([
        RPGACE.sb.select('study_courses', 'id=eq.' + C + '&select=*'),
        safe(RPGACE.sb.select('study_lessons', 'course_id=eq.' + C + '&select=id,domain,ord,title,body,analogy,opens&order=ord.asc')),
        RPGACE.sb.select('study_questions', 'course_id=eq.' + C + '&select=id,domain,kind,stem,options,answer,explanation,analogy,opens,tags,recall_step,recall_due&limit=2000'),
        safe(RPGACE.sb.select('study_attempts', 'select=question_id,correct,answered_at&order=answered_at.desc&limit=3000')),
        safe(RPGACE.sb.select('study_sessions', 'course_id=eq.' + C + '&finished_at=not.is.null&select=id,mode,domain,total,correct,score,finished_at&order=finished_at.desc&limit=8'))
      ]).then(function(r) {
        var course = Array.isArray(r[0]) ? r[0][0] : null;
        if (!course) throw new Error('course not found');
        return { course: course, lessons: r[1] || [], questions: Array.isArray(r[2]) ? r[2] : [], attempts: r[3] || [], sessions: r[4] || [] };
      });
    },
    dueCount: function() {
      var self = RPGACE.modules.studyHub;
      return RPGACE.sb.select('study_questions', 'course_id=eq.' + self.COURSE + '&recall_due=lte.' + self.logic.today() + '&select=id')
        .then(function(r) { return Array.isArray(r) ? r.length : 0; }).catch(function() { return 0; });
    },

    // The question files are the source of truth: add any question that
    // is in the files but not in Supabase. Resolves to how many it added.
    syncBank: function(haveStems) {
      var self = RPGACE.modules.studyHub, dir = self.BANK_DIR;
      var getJson = function(u) { return fetch(u, { cache: 'no-cache' }).then(function(r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); };
      return getJson(dir + 'index.json').then(function(man) {
        return Promise.all((man.questions || []).map(function(f) { return getJson(dir + f); }));
      }).then(function(parts) {
        var have = {};
        (haveStems || []).forEach(function(s) { have[s] = 1; });
        var rows = [];
        parts.forEach(function(list) {
          (list || []).forEach(function(x) {
            if (!x || !x.q || have[x.q]) return;
            have[x.q] = 1;
            rows.push({ course_id: self.COURSE, domain: String(x.d), kind: x.k === 'm' ? 'multi' : 'single', stem: x.q,
              options: x.o, answer: x.a, explanation: x.e, analogy: x.an || null, opens: x.op || null, tags: x.t || [] });
          });
        });
        var chunks = [];
        for (var i = 0; i < rows.length; i += 40) chunks.push(rows.slice(i, i + 40));
        return chunks.reduce(function(p, c) {
          return p.then(function() { return RPGACE.sb.secureWrite('study_questions', 'insert', c, null, 'course_id,stem'); });
        }, Promise.resolve()).then(function() { if (rows.length) RPGACE.cache.clear('study_questions'); return rows.length; });
      });
    },

    // ---- writes ----
    startSession: function(mode, domain) {
      var self = RPGACE.modules.studyHub;
      return RPGACE.sb.secureWrite('study_sessions', 'insert', { course_id: self.COURSE, mode: mode, domain: domain || null })
        .then(function(data) {
          var row = Array.isArray(data) ? data[0] : (data && data.data ? data.data[0] : data);
          if (!row || !row.id) throw new Error('no session id');
          return row.id;
        });
    },
    saveAnswer: function(sessionId, q, chosen, correct) {
      var L = RPGACE.modules.studyHub.logic;
      var writes = [RPGACE.sb.secureWrite('study_attempts', 'insert', { session_id: sessionId, question_id: q.id, chosen: chosen, correct: !!correct })];
      var patch = L.recallPatch(q, correct);
      if (patch) {
        writes.push(RPGACE.sb.secureWrite('study_questions', 'update', patch, 'id=eq.' + q.id).then(function() {
          q.recall_step = patch.recall_step; q.recall_due = patch.recall_due;
        }));
      }
      return Promise.all(writes).then(function() { RPGACE.cache.clear('study_attempts'); RPGACE.cache.clear('study_questions'); });
    },
    finishSession: function(sessionId, sum) {
      return RPGACE.sb.secureWrite('study_sessions', 'update', {
        finished_at: new Date().toISOString(), total: sum.total, correct: sum.correct, score: sum.score, by_domain: sum.by_domain
      }, 'id=eq.' + sessionId).then(function() { RPGACE.cache.clear('study_sessions'); });
    }
  },

  // ============================================================
  // ui — the Study page, lessons, the question runner.
  // ============================================================
  ui: {
    // Where an analogy's "Open in RPGACE" button goes.
    OPENS: {
      oracle:      ['🔮 Oracle', function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.oracle); }],
      cooking:     ['🍳 Cooking', function() { RPGACE.modules.dashDeck._navOpenCard('cooking'); }],
      review:      ['✅ Review', function() { RPGACE.modules.knowledgeReview.open(); }],
      library:     ['📚 Life Library', function() { RPGACE.modules.lifeLibrary.open(); }],
      screenshots: ['📸 Screenshot Inbox', function() { RPGACE.modules.screenshotInbox.open(); }],
      bookworm:    ['📗 Bookworm', function() { RPGACE.modules.dashDeck._openPage('bookworm-widget'); }],
      beats:       ['🥁 Beats', function() { RPGACE.modules.beatsHub.open(); }],
      money:       ['💷 Money', function() { RPGACE.modules.moneyHub.open('wishlist'); }],
      health:      ['❤️ Health & body', function() { RPGACE.modules.dashDeck._navOpenCard('health'); }],
      chronicles:  ['📜 Chronicles', function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.chronicles); }]
    },
    CSS: '.sy-wrap{display:flex;flex-direction:column;gap:14px;max-width:760px}' +
      '.sy-card{padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--panel)}' +
      '.sy-lbl{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--blue);font-weight:700}' +
      '.sy-big{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text)}' +
      '.sy-note{font-size:13px;color:var(--muted);line-height:1.5}' +
      '.sy-row{display:flex;flex-wrap:wrap;gap:8px}' +
      '.sy-btn{min-height:44px;padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-family:Rajdhani,sans-serif;font-size:15px;font-weight:700;cursor:pointer}' +
      '.sy-btn.sy-go{border-color:var(--blue);color:var(--blue)}.sy-btn:disabled{opacity:.5;cursor:default}' +
      '.sy-topic{display:grid;grid-template-columns:1fr;gap:8px;padding:12px 0;border-top:1px solid var(--border)}' +
      '@media (min-width:600px){.sy-topic{grid-template-columns:1fr auto;align-items:center}}' +
      '.sy-note a{color:var(--blue)}' +
      '.sy-topic:first-child{border-top:none}.sy-tn{font-weight:700;font-size:15px}.sy-tw{font-size:12px;color:var(--muted)}' +
      '.sy-bar{grid-column:1/-1;height:6px;border-radius:3px;background:var(--panel2);overflow:hidden}.sy-bar>i{display:block;height:100%;background:var(--blue)}' +
      '.sy-q{font-size:17px;line-height:1.45;font-weight:600;color:var(--text)}' +
      '.sy-opt{display:block;width:100%;text-align:left;min-height:48px;padding:10px 14px;margin-top:8px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-family:inherit;font-size:15px;line-height:1.4;cursor:pointer}' +
      '.sy-opt.sy-on{border-color:var(--blue);background:color-mix(in srgb,var(--blue) 14%,var(--panel2))}' +
      '.sy-opt.sy-right{border-color:#3FA66B;background:rgba(63,166,107,.14)}.sy-opt.sy-wrong{border-color:#CC4A4A;background:rgba(204,74,74,.12)}' +
      '.sy-fb{margin-top:12px;padding:12px;border-radius:10px;background:var(--panel2);font-size:14px;line-height:1.5}' +
      '.sy-an{margin-top:10px;padding:10px 12px;border-left:3px solid var(--blue);background:color-mix(in srgb,var(--blue) 8%,var(--panel));font-size:14px;line-height:1.5;border-radius:0 8px 8px 0}' +
      '.sy-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}' +
      '.sy-chip{display:inline-block;padding:2px 8px;border-radius:10px;border:1px solid var(--border);font-size:12px;color:var(--muted)}' +
      '.sy-miss{padding:10px 0;border-top:1px solid var(--border);font-size:14px;line-height:1.45}',

    _css: function() {
      if (document.getElementById('sy-css')) return;
      var st = document.createElement('style'); st.id = 'sy-css'; st.textContent = this.CSS; document.head.appendChild(st);
    },
    _btn: function(label, go, fn, id) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sy-btn' + (go ? ' sy-go' : '');
      b.textContent = label; if (id) b.id = id; if (fn) b.onclick = fn; return b;
    },
    _el: function(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },
    _domainName: function(code) {
      var c = RPGACE.modules.studyHub._data && RPGACE.modules.studyHub._data.course;
      var d = c && (c.domains || []).filter(function(x) { return x.code === code; })[0];
      return d ? d.name : 'Topic ' + code;
    },

    open: function(opts) {
      var self = RPGACE.modules.studyHub, U = self.ui;
      U._css();
      var host = RPGACE.areaNav.page('knowledge', RPGACE.CONFIG.pages.study, '🎓 Study',
        { key: 'study', label: 'Study', open: function() { self.open(); } });
      if (!host) return null;
      self._box = host.box;
      host.box.id = 'sy-body';
      if (self._run && !self._run.done) { U.renderQuestion(); return host; }
      host.box.textContent = 'Loading…';
      self.logic.load().then(function(d) {
        self._data = d;
        var signedIn = !!(RPGACE.modules.authGate && RPGACE.modules.authGate._apiSecret);
        if (!signedIn || self._synced) return d;
        self._synced = true;
        return self.logic.syncBank(d.questions.map(function(q) { return q.stem; })).then(function(n) {
          return n ? self.logic.load().then(function(d2) { self._data = d2; return d2; }) : d;
        }).catch(function(e) { console.warn('[studyHub] bank sync failed', e); return d; });
      }).then(function() {
        U.renderHome();
        if (opts && opts.mode) U.start(opts.mode, opts.domain);
      }).catch(function(e) { host.box.textContent = '⚠️ Could not load Study: ' + (e && e.message || e); });
      return host;
    },

    renderHome: function() {
      var self = RPGACE.modules.studyHub, U = self.ui, L = self.logic, d = self._data, box = self._box;
      if (!box || !d) return;
      box.innerHTML = '';
      var wrap = U._el('div', 'sy-wrap'); box.appendChild(wrap);
      var c = d.course, st = L.stats(d.questions, d.attempts), est = L.estimate(c, st), due = d.questions.filter(function(q) { return q.recall_due && q.recall_due <= L.today(); }).length;

      var head = U._el('div', 'sy-card'); head.id = 'sy-head';
      head.appendChild(U._el('div', 'sy-lbl', c.short_title || c.title));
      head.appendChild(U._el('div', 'sy-note', c.exam_questions + ' questions · ' + c.exam_minutes + ' minutes · pass ' + c.pass_score + ' of ' + c.max_score + ' · ' + d.questions.length + ' practice questions here'));
      var score = U._el('div', 'sy-big'); score.id = 'sy-estimate';
      var sub = U._el('div', 'sy-note');
      if (est.ready) {
        score.textContent = est.score + ' / 1000';
        sub.textContent = est.pass ? 'Estimated score from your recent answers: above the 700 pass mark. Do a full mock to confirm.' : 'Estimated score from your recent answers: below the 700 pass mark so far.';
      } else {
        score.textContent = '—';
        sub.textContent = 'Answer at least ' + L.MIN_PER_TOPIC + ' questions in every topic to see an estimated score. Topics still short: ' + est.short.join(', ') + '.';
      }
      head.appendChild(score); head.appendChild(sub);
      wrap.appendChild(head);

      var prac = U._el('div', 'sy-card');
      prac.appendChild(U._el('div', 'sy-lbl', 'Practise'));
      var row = U._el('div', 'sy-row'); row.style.marginTop = '8px';
      row.appendChild(U._btn(L.MODES.quick.label, true, function() { U.start('quick'); }, 'sy-quick'));
      row.appendChild(U._btn(L.MODES.mock.label + ' (' + c.exam_questions + ' · ' + c.exam_minutes + ' min)', false, function() { U.start('mock'); }, 'sy-mock'));
      row.appendChild(U._btn(L.MODES.flash.label, false, function() { U.start('flash'); }, 'sy-flash'));
      var waiting = d.questions.filter(function(q) { return q.recall_due && q.recall_due > L.today(); }).length;
      var redo = U._btn('🔁 Redo wrong answers (' + due + ' due' + (waiting ? ' · ' + waiting + ' coming back' : '') + ')', false, function() { U.start('redo'); }, 'sy-redo');
      redo.disabled = !due;
      row.appendChild(redo);
      prac.appendChild(row);
      wrap.appendChild(prac);

      var topics = U._el('div', 'sy-card'); topics.id = 'sy-topics';
      topics.appendChild(U._el('div', 'sy-lbl', 'Topics'));
      (c.domains || []).forEach(function(dm) {
        var s = st.domains[dm.code] || { answered: 0, correct: 0, acc: 0 };
        var t = U._el('div', 'sy-topic'); t.dataset.domain = dm.code;
        var left = U._el('div');
        left.appendChild(U._el('div', 'sy-tn', dm.code + '. ' + dm.name));
        left.appendChild(U._el('div', 'sy-tw', dm.weight + '% of the exam · ' + (s.answered ? Math.round(s.acc * 100) + '% right (last ' + s.answered + ')' : 'not practised yet')));
        var btns = U._el('div', 'sy-row');
        var ls = (d.lessons || []).filter(function(x) { return x.domain === dm.code; });
        if (ls.length) btns.appendChild(U._btn('📖 Learn', false, function() { U.openLessons(dm.code); }));
        btns.appendChild(U._btn('▶ Practise', true, function() { U.start('topic', dm.code); }));
        var bar = U._el('div', 'sy-bar'); var fill = document.createElement('i'); fill.style.width = Math.round((s.acc || 0) * 100) + '%'; bar.appendChild(fill);
        t.appendChild(left); t.appendChild(btns); t.appendChild(bar);
        topics.appendChild(t);
      });
      wrap.appendChild(topics);

      if (d.sessions.length) {
        var rec = U._el('div', 'sy-card'); rec.id = 'sy-recent';
        rec.appendChild(U._el('div', 'sy-lbl', 'Recent rounds'));
        d.sessions.forEach(function(s) {
          var m = L.MODES[s.mode] || { label: s.mode };
          var line = m.label + (s.domain ? ' · topic ' + s.domain : '') + ' — ' + s.correct + '/' + s.total + (s.mode === 'mock' ? ' · ' + s.score + '/1000' : '') + ' · ' + String(s.finished_at).slice(0, 10);
          rec.appendChild(U._el('div', 'sy-miss', line));
        });
        wrap.appendChild(rec);
      }

      var note = U._el('div', 'sy-note');
      note.textContent = 'These questions are written in the exam\'s style by Claude Code from AWS\'s published exam guide (version 1.1). They are not real exam questions. Also do AWS\'s free official practice question set: ';
      var a = document.createElement('a'); a.href = self.OFFICIAL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'AWS Skill Builder';
      note.appendChild(a);
      wrap.appendChild(note);
    },

    openLessons: function(code) {
      var self = RPGACE.modules.studyHub, U = self.ui, d = self._data;
      var ls = (d.lessons || []).filter(function(x) { return x.domain === code; });
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎓 Study', title: code + '. ' + U._domainName(code), width: '620px' });
      pop.box.id = 'sy-lessons';
      ls.forEach(function(l) {
        var card = U._el('div', 'sy-card'); card.style.marginBottom = '12px';
        card.appendChild(U._el('div', 'sy-tn', l.title));
        var body = U._el('div', 'sy-note', l.body); body.style.color = 'var(--text)'; body.style.fontSize = '15px'; body.style.marginTop = '6px';
        card.appendChild(body);
        if (l.analogy) card.appendChild(U.analogyBox(l.analogy, l.opens, pop));
        pop.box.appendChild(card);
      });
      pop.box.appendChild(U._btn('▶ Practise this topic', true, function() { pop.close(); U.start('topic', code); }));
    },

    analogyBox: function(text, opens, pop) {
      var U = RPGACE.modules.studyHub.ui;
      var box = U._el('div', 'sy-an');
      box.appendChild(U._el('div', 'sy-lbl', '🔗 In RPGACE'));
      box.appendChild(U._el('div', null, text));
      var o = opens && U.OPENS[opens];
      if (o) {
        var b = U._btn('Open ' + o[0] + ' →', false, function() {
          if (pop && pop.close) pop.close();
          RPGACE.areaNav.closePopups();
          try { o[1](); } catch (e) { RPGACE.utils.toast('⚠️ Could not open ' + o[0], '#CC4A4A', 3000, 'studyHub'); }
        });
        b.style.marginTop = '8px'; b.className += ' sy-open';
        box.appendChild(b);
      }
      return box;
    },

    start: function(mode, domain) {
      var self = RPGACE.modules.studyHub, L = self.logic, U = self.ui, d = self._data;
      if (!d) return;
      var qs = L.pick(mode, d.questions, L.stats(d.questions, d.attempts), d.course, { domain: domain });
      if (!qs.length) { RPGACE.utils.toast('Nothing to practise there yet', '#C9A84C', 2500); return; }
      self._box.textContent = 'Starting…';
      L.startSession(mode, domain).then(function(id) {
        self._run = { id: id, mode: mode, domain: domain || null, qs: qs, i: 0, answers: [], startedAt: Date.now(), done: false, chosen: [], checked: false,
          order: L.order(qs[0]) };
        U.renderQuestion();
        if (mode === 'mock') U._tick();
      }).catch(function(e) {
        RPGACE.utils.toast('⚠️ Could not start a round: ' + (e && e.message || e), '#CC4A4A', 4000, 'studyHub');
        U.renderHome();
      });
    },

    _tick: function() {
      var self = RPGACE.modules.studyHub, U = self.ui;
      clearInterval(self._timer);
      self._timer = setInterval(function() {
        var run = self._run;
        if (!run || run.done || run.mode !== 'mock') { clearInterval(self._timer); return; }
        var left = U._left(run);
        var el = document.getElementById('sy-timer');
        if (el) el.textContent = U._fmt(left);
        if (left <= 0) { clearInterval(self._timer); RPGACE.utils.toast('⏱ Time is up', '#C9A84C', 3000); U.finish(); }
      }, 1000);
    },
    _left: function(run) {
      var mins = (RPGACE.modules.studyHub._data.course.exam_minutes || 90);
      return Math.max(0, mins * 60 - Math.floor((Date.now() - run.startedAt) / 1000));
    },
    _fmt: function(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },

    renderQuestion: function() {
      var self = RPGACE.modules.studyHub, U = self.ui, L = self.logic, run = self._run, box = self._box;
      if (!run || !box) return;
      var q = run.qs[run.i], mock = run.mode === 'mock', need = L.need(q);
      box.innerHTML = '';
      var wrap = U._el('div', 'sy-wrap'); wrap.id = 'sy-run'; box.appendChild(wrap);
      var top = U._el('div', 'sy-top');
      top.appendChild(U._el('span', null, (L.MODES[run.mode] || {}).label + ' · question ' + (run.i + 1) + ' of ' + run.qs.length));
      if (mock) { var tm = U._el('span', null, U._fmt(U._left(run))); tm.id = 'sy-timer'; top.appendChild(tm); }
      wrap.appendChild(top);
      var card = U._el('div', 'sy-card');
      card.appendChild(U._el('span', 'sy-chip', U._domainName(q.domain)));
      var stem = U._el('div', 'sy-q', q.stem); stem.id = 'sy-stem'; stem.style.marginTop = '8px';
      card.appendChild(stem);
      if (need > 1) card.appendChild(U._el('div', 'sy-note', 'Choose ' + need + '.'));
      var opts = U._el('div'); opts.id = 'sy-opts';
      run.order.forEach(function(orig) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sy-opt'; b.dataset.orig = orig;
        b.textContent = q.options[orig];
        if (run.chosen.indexOf(orig) >= 0) b.className += ' sy-on';
        if (run.checked) {
          if ((q.answer || []).indexOf(orig) >= 0) b.className += ' sy-right';
          else if (run.chosen.indexOf(orig) >= 0) b.className += ' sy-wrong';
          b.disabled = true;
        }
        b.onclick = function() {
          if (run.checked) return;
          var at = run.chosen.indexOf(orig);
          if (need === 1) run.chosen = [orig];
          else if (at >= 0) run.chosen.splice(at, 1);
          else if (run.chosen.length < need) run.chosen.push(orig);
          U.renderQuestion();
        };
        opts.appendChild(b);
      });
      card.appendChild(opts);
      wrap.appendChild(card);

      var acts = U._el('div', 'sy-row');
      if (!run.checked) {
        var check = U._btn(mock ? (run.i + 1 < run.qs.length ? 'Next →' : 'Finish exam') : 'Check', true, function() { U.answer(); }, 'sy-check');
        check.disabled = run.chosen.length !== need;
        acts.appendChild(check);
      } else {
        var last = run.answers[run.answers.length - 1];
        var fb = U._el('div', 'sy-fb'); fb.id = 'sy-feedback';
        fb.appendChild(U._el('div', 'sy-tn', last.correct ? '✅ Right' : '❌ Not quite'));
        fb.appendChild(U._el('div', null, q.explanation));
        if (q.analogy) fb.appendChild(U.analogyBox(q.analogy, q.opens));
        if (!last.correct) fb.appendChild(U._el('div', 'sy-note', '🃏 This one comes back tomorrow in Redo.'));
        card.appendChild(fb);
        acts.appendChild(U._btn(run.i + 1 < run.qs.length ? 'Next →' : 'See results', true, function() { U.next(); }, 'sy-next'));
      }
      acts.appendChild(U._btn('✕ End round', false, function() { U.finish(); }, 'sy-end'));
      wrap.appendChild(acts);
    },

    answer: function() {
      var self = RPGACE.modules.studyHub, L = self.logic, U = self.ui, run = self._run, q = run.qs[run.i];
      var ok = L.isCorrect(q, run.chosen);
      run.answers.push({ id: q.id, domain: q.domain, correct: ok, chosen: run.chosen.slice() });
      L.saveAnswer(run.id, q, run.chosen.slice(), ok).catch(function(e) {
        RPGACE.utils.toast('⚠️ Answer not saved: ' + (e && e.message || e), '#CC4A4A', 3500, 'studyHub');
      });
      if (run.mode === 'mock') { U.next(); return; }
      run.checked = true;
      U.renderQuestion();
    },

    next: function() {
      var self = RPGACE.modules.studyHub, U = self.ui, run = self._run;
      if (run.i + 1 >= run.qs.length) { U.finish(); return; }
      run.i++; run.chosen = []; run.checked = false; run.order = self.logic.order(run.qs[run.i]);
      U.renderQuestion();
    },

    finish: function() {
      var self = RPGACE.modules.studyHub, L = self.logic, U = self.ui, run = self._run;
      if (!run || run.done) return;
      run.done = true;
      clearInterval(self._timer);
      var sum = L.summary(run);
      var saved = sum.total ? L.finishSession(run.id, sum) : RPGACE.sb.secureWrite('study_sessions', 'delete', null, 'id=eq.' + run.id);
      saved.catch(function(e) { RPGACE.utils.toast('⚠️ Round not saved: ' + (e && e.message || e), '#CC4A4A', 3500, 'studyHub'); });
      if (!sum.total) { self._run = null; self.logic.load().then(function(d) { self._data = d; U.renderHome(); }); return; }
      U.renderResults(run, sum);
    },

    renderResults: function(run, sum) {
      var self = RPGACE.modules.studyHub, U = self.ui, L = self.logic, box = self._box, d = self._data;
      box.innerHTML = '';
      var wrap = U._el('div', 'sy-wrap'); wrap.id = 'sy-results'; box.appendChild(wrap);
      var head = U._el('div', 'sy-card');
      head.appendChild(U._el('div', 'sy-lbl', (L.MODES[run.mode] || {}).label + ' — done'));
      var big = U._el('div', 'sy-big', sum.correct + ' / ' + sum.total + ' right'); big.id = 'sy-result-score';
      head.appendChild(big);
      if (run.mode === 'mock') head.appendChild(U._el('div', 'sy-note', 'Score ' + sum.score + ' / 1000 · ' + (sum.score >= (d.course.pass_score || 700) ? 'above' : 'below') + ' the ' + (d.course.pass_score || 700) + ' pass mark. (The real exam scales scores differently; treat this as a guide.)'));
      var xp = Math.min(30, 2 * sum.correct);
      if (sum.correct) head.appendChild(U._el('div', 'sy-note', '+ up to ' + xp + ' Scholar XP (max 30 a day).'));
      Object.keys(sum.by_domain).sort().forEach(function(k) {
        var b = sum.by_domain[k];
        head.appendChild(U._el('div', 'sy-note', k + '. ' + U._domainName(k) + ': ' + b.correct + '/' + b.total));
      });
      wrap.appendChild(head);
      var missed = run.answers.filter(function(a) { return !a.correct; });
      if (missed.length) {
        var mc = U._el('div', 'sy-card'); mc.id = 'sy-missed';
        mc.appendChild(U._el('div', 'sy-lbl', 'To go over (' + missed.length + ') — these come back in Redo'));
        var byId = {}; run.qs.forEach(function(q) { byId[q.id] = q; });
        missed.forEach(function(a) {
          var q = byId[a.id];
          var m = U._el('div', 'sy-miss');
          m.appendChild(U._el('div', 'sy-tn', q.stem));
          m.appendChild(U._el('div', null, '✅ ' + (q.answer || []).map(function(i) { return q.options[i]; }).join(' + ')));
          m.appendChild(U._el('div', 'sy-note', q.explanation));
          mc.appendChild(m);
        });
        wrap.appendChild(mc);
      }
      var acts = U._el('div', 'sy-row');
      acts.appendChild(U._btn('🎓 Study home', true, function() {
        self._run = null; box.textContent = 'Loading…';
        L.load().then(function(dd) { self._data = dd; U.renderHome(); });
      }, 'sy-home'));
      acts.appendChild(U._btn('↻ Another ' + ((L.MODES[run.mode] || {}).label || 'round'), false, function() {
        self._run = null;
        L.load().then(function(dd) { self._data = dd; U.start(run.mode, run.domain); });
      }, 'sy-again'));
      wrap.appendChild(acts);
    }
  }
});
/* ===END:studyHub=== */
