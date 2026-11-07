/* ===MODULE:gymPlan=== */
// GY-1..5 (Nov 7 2026, record records/2026-11/athlete_page_gym_paranoia_2026-11-06.txt). Alex: "eg gym, plan the type of
// day, then plan the exercises for it based on 2d to hit, the exercises accumulate red areas that are hit to its all
// highlighted"; a session = one split (Push / Pull / Legs) + one add-on (Core / Forearms & grip / Shoulders) - "I always
// have to choose 1 in option 1 with one in options 2"; "abs is a must every 2 sessions"; shoulders "slightly more than
// others"; plan "ahead or at the gym"; map "red main, pink helper"; Next "plan if not started, start if planned, then
// resume once live, then done"; a saved gym note (left shoulder). Plans live in gym_plans; Gym Live (gymLive) runs them.
RPGACE.register('gymPlan', {
  domain: 'habits',
  SPLITS: {
    push: ['💪 Push', ['upper_chest', 'mid_chest', 'lower_chest', 'front_delts', 'side_delts', 'triceps']],
    pull: ['🧲 Pull', ['lats', 'upper_back', 'mid_back', 'lower_back', 'rear_delts', 'biceps']],
    legs: ['🦵 Legs', ['quads', 'hamstrings', 'calves', 'adductors', 'glute_max', 'glute_med']]
  },
  // Shoulders = the shoulder parts the split leaves out, always with the rotator cuff (Alex: one Shoulders add-on, Nov 7).
  ADDONS: {
    core: ['🎯 Core', ['abs', 'obliques', 'deep_core']],
    forearms: ['✊ Forearms & grip', ['forearms']],
    shoulders: ['🛡 Shoulders', ['front_delts', 'side_delts', 'rear_delts', 'rotator_cuff']]
  },
  SHOULDER_WEIGHT: 0.8, // Shoulders' recent load counts 20% less, so it is suggested a bit more often.
  NOTE_SOURCE: 'gym_note',
  // Shoulder-care ranking when the gym note mentions a shoulder: these first, these last, for shoulder and press work.
  SAFE_RX: /cable|dumbbell|one[- ]arm|single[- ]arm|band|face pull|external rotation|internal rotation|landmine|machine/i,
  RISKY_RX: /behind[- ]the[- ]neck|upright row|barbell (overhead|military)|dips?\b/i,
  PRESS_REGIONS: ['front_delts', 'side_delts', 'rear_delts', 'rotator_cuff', 'upper_chest', 'mid_chest', 'lower_chest', 'triceps'],
  _note: undefined,

  init: function() {
    // The gym note is read once after sign-in, so Ask Oracle in Gym Live knows it straight away.
    try { RPGACE.hooks.on('rpgace:login', function() { RPGACE.modules.gymPlan.logic.note(true); }); } catch (e) {}
  },

  logic: {
    // Pure: the areas to cover for a split + add-on (no repeats; Shoulders only adds what the split misses + rotator cuff).
    targets: function(split, addon) {
      var self = RPGACE.modules.gymPlan, out = ((self.SPLITS[split] || ['', []])[1]).slice();
      ((self.ADDONS[addon] || ['', []])[1]).forEach(function(r) { if (out.indexOf(r) < 0) out.push(r); });
      return out;
    },
    // Pure: sets per region (main areas) over the last `days` days of sessions, names matched to the library.
    regionLoad: function(sessions, lib, now, days) {
      var EL = RPGACE.modules.exerciseLibrary.logic, by = {}, n = {};
      var from = new Date((now || new Date()).getTime() - (days || 28) * 86400000).toISOString().slice(0, 10);
      (lib || []).forEach(function(x) { by[EL.norm(x.name)] = x.primary || []; });
      (sessions || []).forEach(function(s) {
        if (String(s.performed_on || '') < from) return;
        (s.gym_sets || []).forEach(function(st) { (by[EL.norm(st.exercise)] || []).forEach(function(r) { n[r] = (n[r] || 0) + 1; }); });
      });
      return n;
    },
    // Pure: Alex's suggested pair. Split = least trained (sets per area, 4 weeks). Add-on = Core when the last session hit no
    // core area; else the least trained add-on, Shoulders' load weighted down so it comes up a bit more often.
    suggest: function(sessions, lib, now) {
      var self = RPGACE.modules.gymPlan, L = self.logic, load = L.regionLoad(sessions, lib, now, 28);
      var avg = function(regs) { return regs.reduce(function(s, r) { return s + (load[r] || 0); }, 0) / Math.max(1, regs.length); };
      var split = Object.keys(self.SPLITS).sort(function(a, b) { return avg(self.SPLITS[a][1]) - avg(self.SPLITS[b][1]); })[0];
      var last = (sessions || [])[0], lastLoad = last ? L.regionLoad([last], lib, new Date(String(last.performed_on) + 'T12:00:00'), 1) : {};
      var hadCore = self.ADDONS.core[1].some(function(r) { return lastLoad[r]; });
      var addon = 'core', why = 'abs every 2 sessions - none last time';
      if (hadCore) {
        addon = Object.keys(self.ADDONS).filter(function(a) { return a !== 'core'; }).sort(function(a, b) {
          var la = avg(self.ADDONS[a][1]) * (a === 'shoulders' ? self.SHOULDER_WEIGHT : 1), lb = avg(self.ADDONS[b][1]) * (b === 'shoulders' ? self.SHOULDER_WEIGHT : 1);
          return la - lb;
        })[0];
        why = 'core done last time; least trained add-on';
      }
      return { split: split, addon: addon, why: 'least trained split in 4 weeks; ' + why };
    },
    // Pure: each target area -> full (a main hit) / part (helper only) / gap. Only main hits count as covered.
    coverage: function(targets, exercises) {
      var EL = RPGACE.modules.exerciseLibrary.logic;
      var rows = (targets || []).map(function(r) {
        var full = (exercises || []).some(function(x) { return (x.primary || []).indexOf(r) >= 0; });
        var part = !full && (exercises || []).some(function(x) { return (x.secondary || []).indexOf(r) >= 0; });
        var rg = EL.region(r);
        return { key: r, label: rg ? rg.label : r, state: full ? 'full' : part ? 'part' : 'gap' };
      });
      return { rows: rows, covered: rows.filter(function(x) { return x.state === 'full'; }).length, of: rows.length };
    },
    // Pure: the library ranked for the target areas (gymLive.logic.rank), shoulder-safe options first when the note asks.
    rank: function(lib, targets, note) {
      var self = RPGACE.modules.gymPlan, ranked = RPGACE.modules.gymLive.logic.rank(lib, targets);
      if (!note || !/shoulder/i.test(note)) return ranked;
      var press = function(o) { return o.hits.some(function(r) { return self.PRESS_REGIONS.indexOf(r) >= 0; }); };
      var w = function(o) { if (!press(o)) return 0; if (self.RISKY_RX.test(o.x.name)) return 2; return self.SAFE_RX.test(o.x.name) ? -1 : 0; };
      return ranked.map(function(o, i) { return { o: o, i: i }; }).sort(function(a, b) { return w(a.o) - w(b.o) || a.i - b.i; }).map(function(z) { z.o.safe = w(z.o) < 0; z.o.risky = w(z.o) > 0; return z.o; });
    },
    // Pure: up to 2 exercises that would make a gap area a main hit (not already chosen).
    fill: function(ranked, area, chosen) {
      var have = {}; (chosen || []).forEach(function(x) { have[x.name] = 1; });
      return (ranked || []).filter(function(o) { return !have[o.x.name] && (o.x.primary || []).indexOf(area) >= 0; }).slice(0, 2);
    },
    plans: function(from) {
      return RPGACE.sb.select('gym_plans', 'select=id,plan_date,split,addon,regions,exercises,status,created_at&plan_date=gte.' + (from || RPGACE.kit.iso()) + '&status=in.(planned,started)&order=plan_date.asc,created_at.desc&limit=20')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    forDay: function(day) { return RPGACE.modules.gymPlan.logic.plans(day).then(function(r) { return r.filter(function(p) { return p.plan_date === day; }); }); },
    // One plan per day: a new plan for a day replaces (drops) the open one.
    save: function(plan) {
      var row = { plan_date: plan.plan_date, split: plan.split, addon: plan.addon, regions: plan.regions, exercises: plan.exercises, status: plan.status || 'planned', updated_at: new Date().toISOString() };
      var write = plan.id ? RPGACE.sb.secureWrite('gym_plans', 'update', row, 'id=eq.' + plan.id).then(function() { return Object.assign({ id: plan.id }, row); })
        : RPGACE.modules.gymPlan.logic.forDay(plan.plan_date).then(function(old) {
          var drop = old.length ? RPGACE.sb.secureWrite('gym_plans', 'update', { status: 'dropped', updated_at: row.updated_at }, 'id=in.(' + old.map(function(o) { return o.id; }).join(',') + ')') : Promise.resolve();
          return drop.then(function() { return RPGACE.sb.secureWrite('gym_plans', 'insert', row); }).then(function(d) { var r = Array.isArray(d) ? d[0] : d; if (!r || !r.id) throw new Error('the plan was not saved'); return r; });
        });
      return write.then(function(r) { try { RPGACE.cache.clear('gym_plans'); } catch (e) {} return r; });
    },
    setStatus: function(id, status) {
      if (!id) return Promise.resolve();
      return RPGACE.sb.secureWrite('gym_plans', 'update', { status: status, updated_at: new Date().toISOString() }, 'id=eq.' + id).then(function() { try { RPGACE.cache.clear('gym_plans'); } catch (e) {} });
    },
    // GY-5: the saved gym note (one journal row, source gym_note; removed = status done).
    note: function(force) {
      var self = RPGACE.modules.gymPlan;
      if (self._note !== undefined && !force) return Promise.resolve(self._note);
      return RPGACE.sb.select('journal', 'select=id,content&source=eq.' + self.NOTE_SOURCE + '&status=is.null&order=created_at.desc&limit=1')
        .then(function(r) { self._note = (Array.isArray(r) && r[0]) || null; return self._note; }).catch(function() { return null; });
    },
    saveNote: function(text) {
      var self = RPGACE.modules.gymPlan, cur = self._note;
      var w = cur && cur.id ? RPGACE.sb.secureWrite('journal', 'update', { content: text }, 'id=eq.' + cur.id)
        : RPGACE.sb.secureWrite('journal', 'insert', { title: '🩹 Gym note', content: text, source: self.NOTE_SOURCE, entry_type: 'note', date: RPGACE.kit.iso(), realms: ['athlete'] });
      return w.then(function() { self._note = undefined; try { RPGACE.cache.clear('journal'); } catch (e) {} return self.logic.note(true); });
    },
    removeNote: function() {
      var self = RPGACE.modules.gymPlan, cur = self._note;
      if (!cur || !cur.id) return Promise.resolve(null);
      return RPGACE.sb.secureWrite('journal', 'update', { status: 'done' }, 'id=eq.' + cur.id).then(function() { self._note = null; try { RPGACE.cache.clear('journal'); } catch (e) {} return null; });
    },
    label: function(p) { var self = RPGACE.modules.gymPlan; return (self.SPLITS[p.split] || [p.split])[0] + ' + ' + (self.ADDONS[p.addon] || [p.addon])[0]; },
    // GY-1, pure: the Athlete page's Next. Plan (nothing planned) -> Start (planned) -> Resume (live) -> Done.
    step: function(d) {
      if (d.live) return { kind: 'resume', icon: '▶', title: 'Resume your workout', sub: d.live, label: '▶ Resume' };
      if (d.today) return { kind: 'start', icon: '▶', title: 'Start ' + d.today.label, sub: d.today.n + ' exercise' + (d.today.n === 1 ? '' : 's') + ' planned', label: '▶ Start' };
      if (d.trained || d.week >= d.target) return { kind: 'done', icon: '✓', title: d.trained ? 'Trained today' : 'Week target hit', sub: d.week + '/' + d.target + ' this week' + (d.nextPlan ? ' · next: ' + d.nextPlan : ''), label: '📋 Plan next' };
      return { kind: 'plan', icon: '📋', title: 'Plan today\'s session', sub: d.week + '/' + d.target + ' this week' + (d.nextPlan ? ' · planned: ' + d.nextPlan : ''), label: '📋 Plan' };
    },
    journeyData: function() {
      var self = RPGACE.modules.gymPlan, L = self.logic, G = RPGACE.modules.gymTracker, GL = RPGACE.modules.gymLive, today = RPGACE.kit.iso();
      var s = GL ? GL.logic.load() : null, cur = s && s.step === 'go' && s.exercises && s.exercises.length ? GL.logic.current(s) : null;
      return Promise.all([L.plans(today).catch(function() { return []; }), G.logic.load().catch(function() { return []; })]).then(function(r) {
        var plans = r[0], sessions = r[1], p = plans.filter(function(x) { return x.plan_date === today; })[0], nx = plans.filter(function(x) { return x.plan_date > today; })[0];
        return {
          live: s && s.step === 'go' && s.exercises && s.exercises.length ? (cur ? cur.e.name + ' · set ' + cur.set + ' of ' + cur.of : 'all sets done - finish it') : null,
          today: p ? { id: p.id, label: L.label(p), n: (p.exercises || []).length } : null,
          nextPlan: nx ? L.label(nx) + ' ' + nx.plan_date : null,
          trained: sessions.some(function(x) { return x.performed_on === today; }),
          week: G.logic.thisWeek(sessions), target: G.WEEKLY_TARGET || 5
        };
      });
    }
  },

  ui: {
    _btn: function(label, kind, id) { var b = RPGACE.kit.btn(label, kind || ''); if (id) b.id = id; b.style.minHeight = '44px'; return b; },
    _chip: function(label, on, id) {
      var b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = label; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.style.cssText = 'min-height:44px;padding:6px 12px;border-radius:22px;font:inherit;font-size:14px;cursor:pointer;border:1px solid ' + (on ? 'var(--gold)' : 'var(--border)') + ';background:' + (on ? 'rgba(201,168,76,.15)' : 'none') + ';color:var(--text);';
      return b;
    },
    // GY-1: the Athlete page's Next step.
    journey: function(el) {
      var self = RPGACE.modules.gymPlan, L = self.logic, U = self.ui;
      el.textContent = 'Checking your gym…';
      return L.journeyData().then(function(d) {
        var st = L.step(d), go = function() {
          if (st.kind === 'plan' || st.kind === 'done') return U.open({ date: st.kind === 'done' ? RPGACE.kit.addDays(RPGACE.kit.iso(), 1) : RPGACE.kit.iso() });
          var rt = RPGACE.modules.realmTasks; if (rt) rt.ui.openLive({ realm: 'athlete', mode: 'gym' });
        };
        el.textContent = '';
        RPGACE.areaNav.next(el, [{ icon: st.icon, title: st.title, sub: st.sub, go: [st.label, go] }], { cls: 'rf', label: '' });
        var b = el.querySelector('.an-row-go'); if (b) b.id = 'gp-journey-go';
        el.dataset.step = st.kind;
      }).catch(function(e) { el.textContent = '⚠️ Could not work out the next gym step: ' + ((e && e.message) || e); });
    },
    // GY-1: the 6 gym tools on the Athlete page (shared tile helper areaNav.steps), + the gym note line (GY-5).
    drawTools: function(host) {
      var self = RPGACE.modules.gymPlan, L = self.logic, U = self.ui, M = RPGACE.modules;
      var grid = document.createElement('div'); grid.id = 'gp-tools'; host.appendChild(grid);
      RPGACE.areaNav.steps(grid, [
        { key: 'plan', name: '📋 Plan a session', count: 'Split + add-on, map fills in', open: function() { U.open({}); } },
        { key: 'live', name: '▶ Gym', count: 'Live now · sets, rest, Ask Oracle', open: function() { if (M.realmTasks) M.realmTasks.ui.openLive({ realm: 'athlete', mode: 'gym' }); } },
        { key: 'log', name: '📝 Log by hand', count: 'A session you already did', open: function() { M.gymTracker.logic.load().then(function(s) { M.gymTracker.ui.openLog(s); }); } },
        { key: 'bests', name: '🏆 Bests & history', count: 'This week, bests, past sessions', open: function() { M.gymTracker.ui.open(); } },
        { key: 'library', name: '📚 Exercise library', count: 'Every exercise + what it hits', open: function() { if (M.exerciseLibrary) M.exerciseLibrary.ui.open(); } },
        { key: 'health', name: '❤️ Health & body', count: 'Food, weight, water, sleep', open: function() { if (M.dashDeck && M.dashDeck._navOpenCard) M.dashDeck._navOpenCard('health'); } }
      ], function() { return document.createElement('button'); });
      var sub = function(k, t) { var e = grid.querySelector('[data-step="' + k + '"] .an-tile-count'); if (e) e.textContent = t; };
      L.journeyData().then(function(d) {
        sub('plan', d.today ? 'Today: ' + d.today.label : d.nextPlan ? 'Planned: ' + d.nextPlan : 'Split + add-on, map fills in');
        sub('live', d.live ? 'Live: ' + d.live : d.week + '/' + d.target + ' this week');
      }).catch(function() {});
      if (M.exerciseLibrary) M.exerciseLibrary.logic.load().then(function(r) { sub('library', M.exerciseLibrary.logic.merge(r).length + ' exercises'); }).catch(function() {});
      var nl = document.createElement('div'); nl.id = 'gp-note-line'; nl.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;color:var(--muted);';
      host.appendChild(nl);
      var paint = function(n) {
        nl.textContent = '';
        var t = document.createElement('span'); t.style.flex = '1'; t.textContent = n ? '🩹 Gym note: ' + n.content : '🩹 No gym note'; nl.appendChild(t);
        var e = U._btn(n ? '✏️ Edit' : '＋ Note', '', 'gp-note-edit'); e.onclick = function() { U.editNote(paint); }; nl.appendChild(e);
      };
      L.note().then(paint);
    },
    // GY-5: edit or remove the gym note.
    editNote: function(after) {
      var self = RPGACE.modules.gymPlan, L = self.logic, U = self.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🩹 Gym note', title: 'What the planner and Oracle should know', width: '420px' });
      pop.box.id = 'gp-note';
      var ta = document.createElement('textarea'); ta.id = 'gp-note-text'; ta.rows = 3; ta.value = (self._note && self._note.content) || '';
      ta.placeholder = 'e.g. Left shoulder needs care'; ta.style.cssText = 'width:100%;box-sizing:border-box;min-height:80px;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font:inherit;';
      pop.box.appendChild(ta);
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:10px;';
      var save = U._btn('Save', 'primary', 'gp-note-save'); save.style.flex = '1';
      save.onclick = function() { var v = ta.value.trim(); if (!v) { RPGACE.utils.toast('Write the note first, or use Remove', 'var(--muted)', 2200); return; } save.disabled = true;
        L.saveNote(v).then(function(n) { pop.close(); RPGACE.utils.toast('🩹 Gym note saved', '#4caf82', 2000); if (after) after(n); }, function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000); }); };
      row.appendChild(save);
      if (self._note) {
        var rm = U._btn('Remove', '', 'gp-note-remove');
        RPGACE.kit.armConfirm(rm, function() { L.removeNote().then(function() { pop.close(); if (after) after(null); }); }, 'Tap again to remove');
        row.appendChild(rm);
      }
      pop.box.appendChild(row);
    },
    // GY-2/3: Plan a session as a pop-up (Athlete page). opts.date = the day it is for.
    open: function(opts) {
      opts = opts || {};
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🏋️ Gym', title: '📋 Plan a session', width: '520px', scroll: true });
      pop.box.id = 'gp-pop';
      RPGACE.modules.gymPlan.ui.planner(pop.box, { date: opts.date, onSaved: function(p) { pop.close(); RPGACE.utils.toast('📋 ' + RPGACE.modules.gymPlan.logic.label(p) + ' planned for ' + (p.plan_date === RPGACE.kit.iso() ? 'today' : p.plan_date), '#4caf82', 2600); try { RPGACE.hooks.fire('gym:planned', p); } catch (e) {} } });
      return pop;
    },
    // The planner. opts.live = inside Gym Live (today only; saves the plan as started and hands it to the workout).
    planner: function(host, opts) {
      var self = RPGACE.modules.gymPlan, L = self.logic, U = self.ui, EL = RPGACE.modules.exerciseLibrary, GL = RPGACE.modules.gymLive, G = RPGACE.modules.gymTracker;
      opts = opts || {};
      host.textContent = 'Loading your gym…';
      Promise.all([EL.logic.load().catch(function() { return []; }), G.logic.load().catch(function() { return []; }), L.note()]).then(function(r) {
        var lib = EL.logic.merge(r[0]), sessions = r[1], note = r[2] && r[2].content, sug = L.suggest(sessions, lib, new Date());
        var st = { split: sug.split, addon: sug.addon, date: opts.live ? RPGACE.kit.iso() : (opts.date || RPGACE.kit.iso()), chosen: [] };
        var draw = function() {
          host.textContent = '';
          var targets = L.targets(st.split, st.addon), ranked = L.rank(lib, targets, note), cov = L.coverage(targets, st.chosen);
          var sec = function(t) { var h = document.createElement('div'); h.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:10px 0 6px;'; h.textContent = t; host.appendChild(h); };
          if (!opts.live) {
            sec('Day');
            var dr = document.createElement('div'); dr.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;';
            var t0 = RPGACE.kit.iso(), t1 = RPGACE.kit.addDays(t0, 1);
            [[t0, 'Today'], [t1, 'Tomorrow']].forEach(function(d) { var c = U._chip(d[1], st.date === d[0], 'gp-day-' + d[1].toLowerCase()); c.onclick = function() { st.date = d[0]; draw(); }; dr.appendChild(c); });
            var di = document.createElement('input'); di.type = 'date'; di.id = 'gp-date'; di.value = st.date; di.min = t0; di.style.cssText = 'min-height:44px;padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font:inherit;';
            di.onchange = function() { if (di.value) { st.date = di.value; draw(); } }; dr.appendChild(di); host.appendChild(dr);
          }
          sec('Split (pick 1)');
          var sr = document.createElement('div'); sr.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
          Object.keys(self.SPLITS).forEach(function(k) { var c = U._chip(self.SPLITS[k][0] + (k === sug.split ? ' ✨' : ''), st.split === k, 'gp-split-' + k); c.onclick = function() { st.split = k; draw(); }; sr.appendChild(c); });
          host.appendChild(sr);
          sec('Add-on (pick 1)');
          var ar = document.createElement('div'); ar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
          Object.keys(self.ADDONS).forEach(function(k) { var c = U._chip(self.ADDONS[k][0] + (k === sug.addon ? ' ✨' : ''), st.addon === k, 'gp-addon-' + k); c.onclick = function() { st.addon = k; draw(); }; ar.appendChild(c); });
          host.appendChild(ar);
          var why = document.createElement('div'); why.style.cssText = 'font-size:12px;color:var(--muted);margin-top:4px;'; why.textContent = '✨ suggested: ' + sug.why + (note ? ' · 🩹 ' + note + ' - shoulder-friendly options first' : '');
          host.appendChild(why);
          // GY-3: the map - targets outlined, main hits red, helper hits pink.
          sec(L.label({ split: st.split, addon: st.addon }) + ' · ' + cov.covered + '/' + cov.of + ' covered');
          var main = [], help = [];
          st.chosen.forEach(function(x) { (x.primary || []).forEach(function(k) { if (main.indexOf(k) < 0) main.push(k); }); (x.secondary || []).forEach(function(k) { if (help.indexOf(k) < 0) help.push(k); }); });
          // Front and back side by side, so every area can be seen filling in at once.
          var map = document.createElement('div'); map.id = 'gp-map'; map.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start;';
          [['f', 'Front'], ['b', 'Back']].forEach(function(v) {
            var col = document.createElement('div'); col.style.textAlign = 'center';
            var cap = document.createElement('div'); cap.style.cssText = 'font-size:12px;color:var(--muted);'; cap.textContent = v[1]; col.appendChild(cap);
            col.appendChild(GL.ui.bodySvg(v[0], [], { main: main, help: help }, null, { outline: targets, mainColor: '#E0533D', helpColor: '#F4A6B8' }));
            map.appendChild(col);
          });
          host.appendChild(map);
          var cl = document.createElement('div'); cl.id = 'gp-coverage'; cl.style.cssText = 'font-size:13px;margin:8px 0;';
          cov.rows.forEach(function(c) {
            var line = document.createElement('div'); line.className = 'gp-cov gp-cov-' + c.state; line.dataset.area = c.key; line.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:32px;';
            var t = document.createElement('span'); t.textContent = (c.state === 'full' ? '🔴 ' : c.state === 'part' ? '🩷 ' : '○ ') + c.label + (c.state === 'part' ? ' (helper only)' : ''); line.appendChild(t);
            if (c.state !== 'full') L.fill(ranked, c.key, st.chosen).forEach(function(o) { var b = U._btn('＋ ' + o.x.name, '', null); b.className += ' gp-fill'; b.style.minHeight = '36px'; b.onclick = function() { st.chosen.push(o.x); draw(); }; line.appendChild(b); });
            cl.appendChild(line);
          });
          host.appendChild(cl);
          sec('Exercises (tap to add or remove)');
          ranked.slice(0, 15).forEach(function(o) {
            var on = st.chosen.some(function(x) { return x.name === o.x.name; });
            var lab = document.createElement('label'); lab.className = 'gp-ex'; lab.dataset.name = o.x.name;
            lab.style.cssText = 'display:flex;gap:10px;align-items:center;min-height:52px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;';
            lab.innerHTML = '<input type="checkbox" style="width:22px;height:22px;accent-color:#E0533D;"><span style="flex:1;min-width:0;"><b></b><br><span style="font-size:12px;color:var(--muted);"></span></span>';
            lab.querySelector('b').textContent = o.x.name + (o.safe ? ' 🛡' : '') + (o.risky ? ' ⚠️' : '');
            lab.querySelector('span span').textContent = 'main: ' + (o.x.primary || []).map(function(k) { var rg = EL.logic.region(k); return rg ? rg.label : k; }).join(', ') + (o.safe ? ' · shoulder-friendly' : o.risky ? ' · go easy on the shoulder' : '');
            var cb = lab.querySelector('input'); cb.checked = on;
            cb.onchange = function() { if (cb.checked) st.chosen.push(o.x); else st.chosen = st.chosen.filter(function(x) { return x.name !== o.x.name; }); draw(); };
            host.appendChild(lab);
          });
          var save = U._btn(opts.live ? '▶ Start workout' : '💾 Save plan', 'primary', 'gp-save'); save.style.cssText += 'width:100%;margin-top:12px;';
          save.onclick = function() {
            if (!st.chosen.length) { RPGACE.utils.toast('Add at least one exercise', 'var(--muted)', 2200); return; }
            save.disabled = true;
            var exs = st.chosen.map(function(x) { var t = GL.logic.target(GL.logic.last(sessions, x.name)); return { name: x.name, primary: x.primary || [], secondary: x.secondary || [], cue: x.cue || '', why: t.why, sets: t.sets, reps: t.reps, kg: t.kg }; });
            L.save({ plan_date: st.date, split: st.split, addon: st.addon, regions: targets, exercises: exs, status: opts.live ? 'started' : 'planned' }).then(function(p) { if (opts.onSaved) opts.onSaved(p); },
              function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Plan not saved: ' + (e.message || e), '#CC4A4A', 4000); });
          };
          host.appendChild(save);
          if (opts.free) { var fr = U._btn('Tap muscles freely instead', '', 'gp-free'); fr.style.cssText += 'width:100%;margin-top:6px;'; fr.onclick = opts.free; host.appendChild(fr); }
        };
        draw();
      }).catch(function(e) { host.textContent = '⚠️ Could not load the planner: ' + ((e && e.message) || e); });
    }
  }
});
/* ===END:gymPlan=== */
