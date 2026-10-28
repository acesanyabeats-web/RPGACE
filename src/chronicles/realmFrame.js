
/* ===MODULE:realmFrame=== */
// RF-1..RF-6 (Oct 27 2026, plan "Realm Frame & Folder Architecture",
// records/2026-10/folder_architecture_paranoia_2026-10-27.txt). Alex: "what
// belongs to only realms and what structures are applicable to all realms to
// make a structure thats is outside of realms for universal use". This is
// that universal structure, built once: every realm home gets the same 7
// pieces (Home: rank + one target + what's next, Tasks, Live, Take in, Log,
// Prompts, Weekly review) plus "Ready from other realms". What differs per
// realm (its target, tools, feeds, Oracle starters) lives in ONE registry,
// realm_lenses.json's "frame" (the folder-as-agent idea from the lostandlucky
// reel: the data file is the realm's folder, read by the app, Oracle and the
// Python analyser). Targets: one per realm; Creator/Hustler/Steward keep
// their existing xp_settings columns, the rest live in xp_settings.realm_targets.
RPGACE.register('realmFrame', {
  domain: 'chronicles',

  // RF-3: the gym's weekly number is Athlete's realm target (one store).
  init: function() {
    var sync = function() {
      var g = RPGACE.modules.gymTracker, L = RPGACE.modules.realmFrame.logic;
      if (!g) return;
      Promise.all([L.registry(), L.settings(true)]).then(function(x) {
        var t = L.targetOf(L.frameOf(x[0], 'athlete'), x[1], 'athlete'); if (t > 0) g.WEEKLY_TARGET = t;
      }).catch(function() {});
    };
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(sync, 1500); });
    // RF-6: the registry, kept for Oracle's sync realm match.
    RPGACE.modules.realmFrame.logic.registry().then(function(reg) { RPGACE.modules.realmFrame._reg = reg; });
    RPGACE.hooks.on('realm:target', function(d) { if (!d || d.realm === 'athlete') sync(); });
  },

  logic: {
    // Private tables are read through /api/data-write (RLS), the rest directly.
    PRIVATE: { posts: 1, outreach_log: 1, xp_events: 1, xp_settings: 1, library_items: 1, realm_tasks: 1, plan_tasks: 1, people: 1 },
    rd: function(table, params) {
      var L = RPGACE.modules.realmFrame.logic;
      var p = L.PRIVATE[table] ? RPGACE.modules.tripPlans.logic.read(table, params) : RPGACE.sb.select(table, params);
      return Promise.resolve(p).then(function(r) { return Array.isArray(r) ? r : []; });
    },
    registry: function() {
      return RPGACE.realmLenses().then(function(d) { return (d && d.realms) || {}; }).catch(function() { return {}; });
    },
    frameOf: function(reg, realm) { return (reg && reg[realm] && reg[realm].frame) || { target: null, tools: [], feeds: [], starters: [] }; },
    settings: function(force) {
      var L = RPGACE.modules.realmFrame.logic;
      if (!force && L._set && Date.now() - L._set.at < 15000) return Promise.resolve(L._set.data);
      return L.rd('xp_settings', 'select=*&id=eq.1').then(function(r) { var s = r[0] || {}; L._set = { at: Date.now(), data: s }; return s; });
    },
    iso: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    // Monday of this week / 1st of this month (local time). Pure.
    periodStart: function(period, now) {
      var d = now ? new Date(now) : new Date();
      if (period === 'month') return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
      var back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back);
      return RPGACE.modules.realmFrame.logic.iso(d);
    },
    // The one target for a realm: an existing xp_settings column when the
    // registry names one, else realm_targets[realm], else the registry default. Pure.
    targetOf: function(frame, settings, realm) {
      var t = frame && frame.target; if (!t) return null;
      settings = settings || {};
      if (t.setting) {
        if (t.setting === 'monthly_income_target' && RPGACE.modules.xpSeason) return RPGACE.modules.xpSeason.logic.monthlyOf(settings);
        var v = settings[t.setting];
        return v == null || v === '' ? (t.default != null ? Number(t.default) : null) : Number(v);
      }
      var own = settings.realm_targets && settings.realm_targets[realm];
      return own != null && own !== '' ? Number(own) : (t.default != null ? Number(t.default) : null);
    },
    setTarget: function(realm, frame, n) {
      var L = RPGACE.modules.realmFrame.logic, t = frame && frame.target;
      if (!t) return Promise.reject(new Error('No target for this realm'));
      var val = n === '' || n == null ? null : Number(n);
      if (val != null && !(val >= 0)) return Promise.reject(new Error('Target must be a number'));
      var write;
      if (t.setting === 'weekly_spend_limit' && RPGACE.modules.xpSeason) write = RPGACE.modules.xpSeason.logic.setWeeklyLimit(val);
      if (!write && t.setting) { var p = { updated_at: new Date().toISOString() }; p[t.setting] = val; write = RPGACE.sb.secureWrite('xp_settings', 'update', p, 'id=eq.1'); }
      if (!write) write = L.settings(true).then(function(s) {
        var rt = Object.assign({}, s.realm_targets || {}); if (val == null) delete rt[realm]; else rt[realm] = val;
        return RPGACE.sb.secureWrite('xp_settings', 'update', { realm_targets: rt, updated_at: new Date().toISOString() }, 'id=eq.1');
      });
      return Promise.resolve(write).then(function(d) { L._set = null; if (RPGACE.modules.xpSeason) RPGACE.modules.xpSeason.logic.clear(); RPGACE.hooks.fire('realm:target', { realm: realm }); return d; });
    },
    // Counters by registry `source` key: how far the period has got. Each resolves to a number.
    COUNT: {
      beats_finished: function(L, s) { return L.rd('content_productions', 'select=id&finished_at=gte.' + s).then(function(r) { return r.length; }); },
      posts_posted: function(L, s) { return L.rd('posts', 'select=id&posted_at=gte.' + s).then(function(r) { return r.length; }); },
      money_in: function(L, s) { return L.rd('chronicles_finance', 'select=amount&type=eq.sale&entry_date=gte.' + s).then(function(r) { return Math.round(r.reduce(function(a, y) { return a + (Number(y.amount) || 0); }, 0) * 100) / 100; }); },
      spend_week: function(L, s) { return L.rd('chronicles_finance', 'select=amount&type=eq.expense&entry_date=gte.' + s).then(function(r) { return Math.round(r.reduce(function(a, y) { return a + (Number(y.amount) || 0); }, 0) * 100) / 100; }); },
      gym_sessions: function(L, s) { return L.rd('gym_sessions', 'select=id&performed_on=gte.' + s).then(function(r) { return r.length; }); },
      cooks: function(L, s) { return L.rd('journal', 'select=id&cooked_at=gte.' + s).then(function(r) { return r.length; }); },
      cooks_week: function(L) { return L.COUNT.cooks(L, L.periodStart('week')); },
      study: function(L, s) { return L.rd('study_sessions', 'select=id&finished_at=gte.' + s).then(function(r) { return r.length; }); },
      chore_blocks: function(L, s) { return L.rd('chore_blocks', 'select=id&kind=eq.chores&status=eq.completed&block_date=gte.' + s).then(function(r) { return r.length; }); },
      reflections: function(L, s) { return L.rd('journal', 'select=id&entry_type=in.(note,evening_review,weekly_review,big_day,motivational)&created_at=gte.' + s).then(function(r) { return r.length; }); },
      xp_explorer: function(L, s) { return L.rd('xp_events', 'select=id&realm=eq.explorer&earned_on=gte.' + s).then(function(r) { return r.length; }); },
      outreach: function(L, s) { return L.rd('outreach_log', 'select=id&done_on=gte.' + s).then(function(r) { return r.length; }); },
      reachouts_week: function(L) { return L.COUNT.outreach(L, L.periodStart('week')); },
      builder_tasks: function(L, s) { return L.rd('realm_tasks', 'select=id&realm=eq.builder&last_done_at=gte.' + s).then(function(r) { return r.length; }); },
      // Days this week where a morning AND an evening Action were ticked.
      bookend_days: function(L, s) {
        return Promise.all([L.rd('routines', 'select=id,part_of_day&part_of_day=in.(morning,evening)'),
          L.rd('quest_log', 'select=quest_key,completed_at&status=eq.completed&quest_kind=eq.routine&completed_at=gte.' + s)]).then(function(x) {
          var part = {}; x[0].forEach(function(r) { part['routine:' + r.id] = r.part_of_day; });
          var days = {}; x[1].forEach(function(q) { var p = part[q.quest_key]; if (!p) return; var d = String(q.completed_at).slice(0, 10); (days[d] = days[d] || {})[p] = 1; });
          return Object.keys(days).filter(function(d) { return days[d].morning && days[d].evening; }).length;
        });
      },
      beats_to_post: function(L) {
        return Promise.all([L.rd('content_productions', 'select=id&finished_at=not.is.null&order=finished_at.desc&limit=60'), L.rd('posts', 'select=beat_id&beat_id=not.is.null')]).then(function(x) {
          var used = {}; x[1].forEach(function(p) { used[p.beat_id] = 1; }); return x[0].filter(function(b) { return !used[b.id]; }).length;
        });
      },
      beats_to_sell: function(L) { return L.rd('content_productions', 'select=id&finished_at=not.is.null&price=is.null&limit=60').then(function(r) { return r.length; }); },
      shopping_open: function(L) { return L.rd('shopping_list_items', 'select=id&bought=eq.false&to_buy_amount=gt.0&limit=200').then(function(r) { return r.length; }); },
    },
    count: function(source, start) {
      var L = RPGACE.modules.realmFrame.logic, f = L.COUNT[source];
      return f ? Promise.resolve(f(L, start)).catch(function() { return null; }) : Promise.resolve(null);
    },
    // { realm, frame, target, got, period, label, money, under } - one target, live. Never rejects.
    targetState: function(realm) {
      var L = RPGACE.modules.realmFrame.logic;
      return Promise.all([L.registry(), L.settings().catch(function() { return {}; })]).then(function(x) {
        var frame = L.frameOf(x[0], realm), t = frame.target;
        if (!t) return { realm: realm, frame: frame, target: null };
        return L.count(t.source, L.periodStart(t.period)).then(function(got) {
          return { realm: realm, frame: frame, target: L.targetOf(frame, x[1], realm), got: got, period: t.period, label: t.label, money: !!t.money, under: !!t.under };
        });
      }).catch(function() { return { realm: realm, frame: null, target: null }; });
    },
    // "3/5 gym sessions this week" / "£80 of £300 money in this month" / "£12 spent of £50 this week". Pure.
    targetText: function(st) {
      if (!st || !st.frame || !st.frame.target) return '';
      var f = function(n) { return st.money ? '£' + Number(n || 0).toLocaleString('en-GB') : String(n == null ? '?' : n); };
      var when = st.period === 'month' ? 'this month' : 'this week';
      if (st.target == null) return f(st.got) + ' ' + st.label + ' ' + when + ' · no target set';
      return f(st.got) + (st.money ? ' of ' : '/') + f(st.target) + ' ' + st.label + ' ' + when;
    },
    // 0..1, and whether it's on track (a spend limit is good while under). Pure.
    progress: function(st) {
      if (!st || st.target == null || !(st.target > 0)) return { pct: 0, good: true };
      var pct = Math.min(1, (st.got || 0) / st.target);
      return { pct: pct, good: st.under ? (st.got || 0) <= st.target : pct >= 1 };
    },
    // Ready from other realms: [{ from, label, n, open, money }] with n > 0.
    feeds: function(realm) {
      var L = RPGACE.modules.realmFrame.logic;
      return L.registry().then(function(reg) {
        var list = L.frameOf(reg, realm).feeds || [];
        return Promise.all(list.map(function(f) {
          var s = f.source === 'money_in' ? L.periodStart('month') : L.periodStart('week');
          return L.count(f.source, s).then(function(n) { return Object.assign({}, f, { n: n }); });
        })).then(function(r) { return r.filter(function(f) { return f.n > 0; }); });
      });
    },
    // What's next for a realm: its best kept tasks (realmTasks' own ranking).
    next: function(realm) {
      var rt = RPGACE.modules.realmTasks; if (!rt) return Promise.resolve([]);
      return rt.logic.load().then(function() {
        var all = (rt._tasks || []).filter(function(t) { return t.status === 'kept' && t.realm === realm; });
        return rt.logic.rank(all, realm, null, Date.now()).filter(function(t) { return !t._resting; }).slice(0, 3);
      }).catch(function() { return []; });
    },
    log: function(realm) {
      return RPGACE.modules.realmFrame.logic.rd('xp_events', 'select=action,note,xp,earned_at&realm=eq.' + realm + '&order=earned_at.desc&limit=8');
    },
    takeIn: function(realm) {
      return RPGACE.modules.realmFrame.logic.rd('library_items', 'select=id,kind,title,status,url&realms=cs.{' + realm + '}&order=created_at.desc&limit=6');
    },
    // XP this week vs last week, tasks done this week. Never rejects.
    review: function(realm) {
      var L = RPGACE.modules.realmFrame.logic, wk = L.periodStart('week'), d = new Date(wk + 'T00:00:00'); d.setDate(d.getDate() - 7);
      var last = L.iso(d);
      return Promise.all([L.rd('xp_events', 'select=xp,earned_on&realm=eq.' + realm + '&earned_on=gte.' + last),
        L.rd('realm_tasks', 'select=id&realm=eq.' + realm + '&last_done_at=gte.' + wk)]).then(function(x) {
        var tw = 0, lw = 0; x[0].forEach(function(e) { if (String(e.earned_on) >= wk) tw += Number(e.xp) || 0; else lw += Number(e.xp) || 0; });
        return { thisWeek: tw, lastWeek: lw, tasksDone: x[1].length };
      }).catch(function() { return { thisWeek: 0, lastWeek: 0, tasksDone: 0 }; });
    },
    // RF-6: a short live brief for Oracle about one realm (<= ~120 words).
    brief: function(realm) {
      var L = RPGACE.modules.realmFrame.logic, X = RPGACE.modules.xpSeason, meta = X && X.REALMS[realm];
      if (!meta) return Promise.resolve('');
      return Promise.all([L.targetState(realm), L.next(realm), L.feeds(realm).catch(function() { return []; }), L.review(realm)]).then(function(x) {
        var st = x[0], parts = ['REALM BRIEF - ' + meta.name + ' (live, realmFrame):'];
        var tt = L.targetText(st); if (tt) parts.push('Target: ' + tt + '.');
        parts.push('XP this week ' + x[3].thisWeek + ' (last week ' + x[3].lastWeek + '), tasks done this week ' + x[3].tasksDone + '.');
        if (x[1].length) parts.push('Next tasks: ' + x[1].map(function(t) { return t.title; }).join('; ') + '.');
        if (x[2].length) parts.push('Waiting from other realms: ' + x[2].map(function(f) { return (f.money ? '£' + f.n : f.n) + ' ' + f.label; }).join('; ') + '.');
        if (st.frame && st.frame.tools && st.frame.tools.length) parts.push('Its own tools: ' + st.frame.tools.join(', ') + '.');
        return parts.join(' ');
      }).catch(function() { return ''; });
    },
    // Which realms a message is about: realm names, plus their tools' words. Pure.
    realmsIn: function(text, reg) {
      var t = String(text || '').toLowerCase(), out = [], X = RPGACE.modules.xpSeason;
      if (!X) return out;
      Object.keys(X.REALMS).forEach(function(k) {
        var words = [X.REALMS[k].name.toLowerCase()].concat(((reg && reg[k] && reg[k].frame && reg[k].frame.tools) || []).map(function(w) { return String(w).toLowerCase(); }));
        if (words.some(function(w) { return w.length > 2 && new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t); })) out.push(k);
      });
      return out.slice(0, 2);
    },
  },

  ui: {
    _css: function() {
      if (document.getElementById('rf-css')) return;
      var s = document.createElement('style'); s.id = 'rf-css';
      s.textContent = '.rf-home{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--panel);margin:10px 0}' +
        '.rf-tgt-l{font-size:13px;color:var(--muted)}.rf-tgt-v{font-size:20px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;margin-top:2px}' +
        '.rf-bar{height:6px;border-radius:3px;background:var(--border);margin-top:6px;overflow:hidden}.rf-bar>div{height:100%;background:var(--gold)}.rf-bar.rf-over>div{background:#CC4A4A}' +
        '.rf-set{margin-left:6px;min-height:32px;padding:2px 10px;border:1px solid var(--border);border-radius:8px;background:none;color:var(--muted);font:inherit;font-size:12px;cursor:pointer}' +
        '.rf-h{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}' +
        '.rf-feed{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:8px 12px;margin:0 0 6px;border:1px dashed var(--gold);border-radius:10px;background:none;color:var(--text);font:inherit;font-size:14px;text-align:left;cursor:pointer}';
      document.head.appendChild(s);
    },
    // The universal frame inside a realm home popup.
    render: function(box, realm, close) {
      var self = RPGACE.modules.realmFrame, L = self.logic, U = self.ui, X = RPGACE.modules.xpSeason, meta = X.REALMS[realm];
      U._css();
      var home = document.createElement('div'); home.className = 'rf-home'; home.id = 'rf-home'; home.textContent = 'Loading…';
      var feedsEl = document.createElement('div'); feedsEl.id = 'rf-feeds';
      var tiles = document.createElement('div'); tiles.id = 'rf-tiles';
      box.appendChild(home); box.appendChild(feedsEl); box.appendChild(tiles);
      L.targetState(realm).then(function(st) { U._drawHome(home, st, realm, close); });
      L.feeds(realm).then(function(fs) {
        if (!fs.length) return;
        var h = document.createElement('div'); h.className = 'rf-h'; h.textContent = 'Ready from other realms'; feedsEl.appendChild(h);
        fs.forEach(function(f) {
          var fm = X.REALMS[f.from] || { icon: '', name: f.from };
          var b = document.createElement('button'); b.type = 'button'; b.className = 'rf-feed'; b.dataset.source = f.source;
          b.textContent = fm.icon + ' ' + (f.money ? '£' + f.n.toLocaleString('en-GB') : f.n) + ' ' + f.label + ' (from ' + fm.name + ')';
          b.onclick = function() { if (close) close(); U._openPage(f.open); };
          feedsEl.appendChild(b);
        });
      }).catch(function() {});
      L.registry().then(function(reg) { U._drawTiles(tiles, realm, L.frameOf(reg, realm), close); });
    },
    _drawHome: function(el, st, realm, close) {
      var self = RPGACE.modules.realmFrame, L = self.logic, U = self.ui;
      el.textContent = '';
      var lbl = document.createElement('div'); lbl.className = 'rf-tgt-l';
      lbl.textContent = '🎯 Target' + (st.frame && st.frame.target ? ' · ' + st.label + (st.period === 'month' ? ' per month' : ' per week') : '');
      if (st.frame && st.frame.target) {
        var set = document.createElement('button'); set.type = 'button'; set.className = 'rf-set'; set.id = 'rf-set-target'; set.textContent = 'Change';
        set.onclick = function() { U._editTarget(realm, st, function() { L.targetState(realm).then(function(s2) { U._drawHome(el, s2, realm, close); }); }); };
        lbl.appendChild(set);
      }
      var v = document.createElement('div'); v.className = 'rf-tgt-v'; v.id = 'rf-target-text'; v.textContent = L.targetText(st) || 'No target for this realm yet';
      el.appendChild(lbl); el.appendChild(v);
      if (st.target != null) {
        var pg = L.progress(st), bar = document.createElement('div'); bar.className = 'rf-bar' + (st.under && !pg.good ? ' rf-over' : '');
        var fill = document.createElement('div'); fill.style.width = Math.round(pg.pct * 100) + '%'; bar.appendChild(fill); el.appendChild(bar);
      }
      var nh = document.createElement('div'); nh.className = 'rf-h'; nh.textContent = 'What\'s next'; el.appendChild(nh);
      var nx = document.createElement('div'); nx.id = 'rf-next'; el.appendChild(nx);
      L.next(realm).then(function(ts) {
        RPGACE.areaNav.next(nx, ts.map(function(t) {
          return { icon: '▶', title: t.title, sub: (t.mins || 30) + ' min' + (t.earns === 'xp' && t.xp ? ' · +' + t.xp + ' XP' : ''),
            go: ['▶ Do it', function() { if (close) close(); RPGACE.modules.realmTasks.ui.openLive({ realm: realm }); }] };
        }), { cls: 'rf', empty: 'No tasks kept for this realm yet.', emptyGo: ['🗂 Pick tasks', function() { if (close) close(); RPGACE.modules.realmTasks.ui.openCatalogue(realm); }] });
      });
    },
    _editTarget: function(realm, st, done) {
      var self = RPGACE.modules.realmFrame, L = self.logic;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎯 Target', title: st.label + (st.period === 'month' ? ' per month' : ' per week'), width: '360px' });
      var inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.step = st.money ? '1' : '1'; inp.id = 'rf-target-input';
      inp.value = st.target == null ? '' : st.target; inp.style.cssText = 'width:100%;min-height:44px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font:inherit;font-size:16px;';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'learn-btn green'; b.id = 'rf-target-save'; b.textContent = 'Save'; b.style.cssText = 'margin-top:10px;min-height:44px;width:100%;';
      b.onclick = function() {
        b.disabled = true;
        L.setTarget(realm, st.frame, inp.value).then(function() { pop.close(); RPGACE.utils.toast('🎯 Target saved', '#4CAF82', 2000); if (done) done(); })
          .catch(function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ Target not saved: ' + (e.message || e), '#CC4A4A', 3500); });
      };
      pop.box.appendChild(inp); pop.box.appendChild(b);
    },
    // The 6 shared pieces under Home, as tiles (areaNav.steps).
    _drawTiles: function(el, realm, frame, close) {
      var self = RPGACE.modules.realmFrame, L = self.logic, U = self.ui, rt = RPGACE.modules.realmTasks;
      var done = function(fn) { return function() { if (close) close(); fn(); }; };
      var tasksN = rt ? (rt._tasks || []).filter(function(t) { return t.status === 'kept' && t.realm === realm; }).length : 0;
      var steps = [
        { n: 'tasks', name: '🗂 Tasks', count: tasksN + ' kept', btns: [['🗂 All tasks', done(function() { rt.ui.openCatalogue(realm); })], ['📥 New tasks', done(function() { rt.ui.openInbox(); })]] },
        { n: 'live', name: '▶ Live', count: 'Do this realm now', btns: [['▶ Live now', done(function() { rt.ui.openLive({ realm: realm }); })]] },
        { n: 'takein', name: '📥 Take in', count: 'Library + share', open: function() { U._openTakeIn(realm, close); } },
        { n: 'log', name: '📜 Log', count: 'What you did', open: function() { U._openLog(realm); } },
        { n: 'prompts', name: '🔮 Prompts', count: (frame.starters || []).length + ' ready questions', btns: (frame.starters || []).map(function(q) { return [q, done(function() { U.ask(q); })]; }) },
        { n: 'review', name: '📈 Weekly review', count: 'This week vs last', open: function() { U._openReview(realm); } }
      ];
      RPGACE.areaNav.steps(el, steps, function(b) { var x = document.createElement('button'); x.type = 'button'; x.className = 'rf-btn learn-btn'; x.textContent = b[0]; x.onclick = b[1]; return x; }, 'rf-tile');
      if (frame.tools && frame.tools.length) {
        var t = document.createElement('div'); t.className = 'rf-h'; t.id = 'rf-tools'; t.textContent = 'Own tools: ' + frame.tools.join(' · ');
        t.style.textTransform = 'none'; t.style.letterSpacing = '0'; t.style.fontWeight = '400';
        el.parentNode.insertBefore(t, el.nextSibling);
      }
    },
    _sheet: function(title, lines) {
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: title, title: title, width: '420px', scroll: true });
      pop.box.classList.add('an-sheet');
      return pop;
    },
    _openTakeIn: function(realm, close) {
      var self = RPGACE.modules.realmFrame, L = self.logic, X = RPGACE.modules.xpSeason;
      var pop = self.ui._sheet('📥 Take in · ' + X.REALMS[realm].name);
      pop.box.id = 'rf-takein';
      var list = document.createElement('div'); list.textContent = 'Loading…'; pop.box.appendChild(list);
      L.takeIn(realm).then(function(rows) {
        list.textContent = rows.length ? '' : 'Nothing saved for this realm yet.';
        rows.forEach(function(r) { var d = document.createElement('div'); d.className = 'an-sheet-line'; d.textContent = (r.status === 'to_check' ? '🔵 ' : '') + (r.title || r.kind); list.appendChild(d); });
      });
      var share = document.createElement('button'); share.type = 'button'; share.className = 'learn-btn green an-sheet-btn'; share.textContent = '📤 Share a link or text';
      share.onclick = function() { pop.close(); if (close) close(); var P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {}; var kh = RPGACE.modules.knowledgeHub; if (kh) kh.ui.go('videoworm'); setTimeout(function() { var i = document.getElementById('intel-url-input'); if (i) i.focus(); }, 600); };
      var lib = document.createElement('button'); lib.type = 'button'; lib.className = 'learn-btn an-sheet-btn'; lib.textContent = '📚 Open Life Library';
      lib.onclick = function() { pop.close(); if (close) close(); var kh = RPGACE.modules.knowledgeHub; if (kh) kh.ui.go('library'); };
      pop.box.appendChild(share); pop.box.appendChild(lib);
    },
    _openLog: function(realm) {
      var self = RPGACE.modules.realmFrame, L = self.logic, X = RPGACE.modules.xpSeason;
      var pop = self.ui._sheet('📜 Log · ' + X.REALMS[realm].name); pop.box.id = 'rf-log';
      L.log(realm).then(function(rows) {
        if (!rows.length) { pop.box.appendChild(document.createTextNode('Nothing logged in this realm yet.')); return; }
        rows.forEach(function(e) {
          var d = document.createElement('div'); d.className = 'an-sheet-line';
          d.textContent = String(e.earned_at || '').slice(0, 10) + ' · ' + (e.note || String(e.action || '').replace(/_/g, ' ')) + ' · +' + (e.xp || 0) + ' XP';
          pop.box.appendChild(d);
        });
      });
    },
    _openReview: function(realm) {
      var self = RPGACE.modules.realmFrame, L = self.logic, X = RPGACE.modules.xpSeason;
      var pop = self.ui._sheet('📈 This week · ' + X.REALMS[realm].name); pop.box.id = 'rf-review';
      Promise.all([L.review(realm), L.targetState(realm)]).then(function(x) {
        var r = x[0], lines = ['XP: ' + r.thisWeek + ' this week · ' + r.lastWeek + ' last week' + (r.thisWeek > r.lastWeek ? ' ↑' : r.thisWeek < r.lastWeek ? ' ↓' : ''),
          'Tasks done: ' + r.tasksDone, 'Target: ' + (L.targetText(x[1]) || 'none')];
        lines.forEach(function(t) { var d = document.createElement('div'); d.className = 'an-sheet-line'; d.textContent = t; pop.box.appendChild(d); });
      });
    },
    // A ready question goes into the Oracle box (not sent) so it can be edited first.
    ask: function(q) {
      var P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
      if (typeof showPage === 'function') showPage(P.oracle);
      setTimeout(function() { var inp = document.getElementById('chat-input'); if (inp) { inp.value = q; inp.focus(); } }, 300);
    },
    // A page by its area/page key or by the left-menu label.
    _openPage: function(key) {
      var rows = document.querySelectorAll('.ln-card'), want = String(key || '').toLowerCase(), hit = null;
      [].forEach.call(rows, function(r) {
        if (hit) return;
        var label = ((r.querySelector('.ln-ctitle') || r).textContent || '').toLowerCase();
        if (r.dataset.page === key || r.dataset.card === key || label.indexOf(want) !== -1) hit = r;
      });
      if (hit) hit.click(); else RPGACE.utils.toast('Could not find the ' + key + ' page', '#CC4A4A', 2500);
    },
  },
});
/* ===END:realmFrame=== */
