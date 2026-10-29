

/* ===MODULE:doingNow=== */
// Oct 16 2026, plan "Doing Now" DN-0/DN-1 (records/2026-10/doing_now_plan_paranoia_2026-10-15.txt).
// Log what you are doing as it happens (or just did): a running rpgace_agendas
// entry (source_type 'doing_now', started_at set, completed false) shown at the
// top of My Day + the dashboard Today list, a timer, "+ note" while it runs,
// then a short Stop sheet (how it went + mood) with "+ more details" (photo,
// who with, where, money, linked thing, would do again, effort). Realms are
// picked on start (RPGACE.realmPicker). No XP yet (DN-5). DN-1b: "Try
// something new" ideas from the quietest realms (kept realm tasks, realmTasks).
// DN-2: after 3h asks "still doing it?"; 4h after the last answer it auto-stops at that mark.
// DN-3: cooking-sounding names offer Cook Mode (cookingOracle.ui.cookRecipeNow), gym ones the
// gym logger; an Actual cook / saved session stops the entry and links it (one schedule entry).
// DN-4: the same name 3+ times in 21 days offers "Make it a routine" (myDay editor, prefilled);
// the 2nd time fills an activity_templates row, which also holds the snooze / stop-asking state.
RPGACE.register('doingNow', {
  domain: 'schedule',
  SOURCE: 'doing_now',
  ASK_MIN: 180,      // DN-2: ask "still doing it?" after 3 hours
  CAP_MIN: 240,      // DN-2: no answer 4 hours after the last confirm -> auto-stop at that mark
  SNOOZE_MIN: 60,    // DN-2: "Yes, still going" quiets the question for an hour
  REPEAT_N: 3,       // DN-4: 3 times ...
  REPEAT_DAYS: 21,   // ... in 21 days -> offer to make it a routine
  REPEAT_SNOOZE_DAYS: 30,
  MOODS: ['😞', '😕', '😐', '🙂', '😄'],
  AGAIN: [['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']],

  logic: {
    iso: function(d) {
      d = d || new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    all: function() { try { return RPGACE.DB.get('sched') || []; } catch (e) { return []; } },
    running: function(list) {
      var src = RPGACE.modules.doingNow.SOURCE;
      return (list || RPGACE.modules.doingNow.logic.all()).filter(function(x) {
        return x && x.source_type === src && !x.completed && x.started_at;
      });
    },
    mins: function(entry, now) {
      var s = entry && entry.started_at ? new Date(entry.started_at).getTime() : NaN;
      if (isNaN(s)) return 0;
      return Math.max(0, Math.round(((now || Date.now()) - s) / 60000));
    },
    fmt: function(m) {
      m = Math.max(0, Math.round(m || 0));
      return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
    },
    // Local copy first (instant), then the server row — same write shape as
    // completeScheduledTask.
    patch: function(id, fields) {
      var list = RPGACE.modules.doingNow.logic.all();
      var hit = null;
      list.forEach(function(x) { if (x.id === id) { Object.assign(x, fields); hit = x; } });
      try { RPGACE.DB.set('sched', list); } catch (e) {}
      return RPGACE.sb.secureWrite('rpgace_agendas', 'update', fields, 'id=eq.' + id).then(function() { return hit; });
    },
    // AC-3: extra = { expect: minutes you think it takes, details: {action_id, ...} }.
    start: function(name, realms, startedAt, extra) {
      var now = startedAt ? new Date(startedAt) : new Date();
      extra = extra || {};
      var expect = Math.max(1, Math.round(Number(extra.expect) || 30));
      var d = Object.assign({ notes: [] }, extra.details || {});
      if (extra.expect) d.expect_mins = expect;
      return scheduleToCalendar({
        date: RPGACE.modules.doingNow.logic.iso(now), hour: now.getHours(), minute: now.getMinutes(),
        title: name, category: 'personal', xp: 0, duration_mins: expect,
        source_type: RPGACE.modules.doingNow.SOURCE, started_at: now.toISOString(),
        realms: realms || [], details: d
      });
    },
    // "I just did X": a finished entry back-dated by its minutes.
    justDid: function(name, mins, realms, endAt, extra) {
      var end = endAt ? new Date(endAt) : new Date(), m = Math.max(1, Math.round(Number(mins) || 0));
      var start = new Date(end.getTime() - m * 60000);
      return scheduleToCalendar({
        date: RPGACE.modules.doingNow.logic.iso(start), hour: start.getHours(), minute: start.getMinutes(),
        title: name, category: 'personal', xp: 0, duration_mins: m,
        source_type: RPGACE.modules.doingNow.SOURCE, completed: true,
        started_at: start.toISOString(), ended_at: end.toISOString(), actual_mins: m,
        realms: realms || [], details: Object.assign({ notes: [], just_did: true }, (extra && extra.details) || {})
      });
    },
    // AC-3 (Oct 22 2026, Alex: "both go same way to grant xp, but
    // communication to other just tells what to tick off"): an entry picked
    // from an Action ticks that Action off with xp 0, so only the Doing Now
    // entry pays XP (xp_on_change skips quest_log rows with xp 0).
    tickAction: function(entry) {
      var md = RPGACE.modules.myDay, id = entry && entry.details && entry.details.action_id;
      if (!md || !id) return Promise.resolve(null);
      var ready = (md._routines || []).length ? Promise.resolve() : md.logic.load();
      return ready.then(function() {
        var r = (md._routines || []).filter(function(x) { return String(x.id) === String(id); })[0];
        if (!r) return null;
        if (md.logic.todayLog(r, md._logs, md.logic.iso())) return null;
        return md.logic.tick(r, { xp: 0, actual: Number(entry.actual_mins) || null, note: 'doing_now' });
      }).catch(function(e) {
        RPGACE.utils.toast('⚠️ "' + (entry.title || 'Action') + '" not ticked off: ' + (e.message || e), '#CC4A4A', 4000, 'doingNow');
        return null;
      });
    },
    // A start/end time from the When step: chips are minutes ago, or a
    // typed HH:MM today. Returns ms, or null when it's in the future.
    whenMs: function(ago, hhmm, now) {
      now = now == null ? Date.now() : now;
      if (hhmm) {
        var p = String(hhmm).split(':'), d = new Date(now);
        d.setHours(Number(p[0]) || 0, Number(p[1]) || 0, 0, 0);
        var t = d.getTime();
        return t > now + 60000 ? null : t;
      }
      return now - Math.max(0, Number(ago) || 0) * 60000;
    },
    addNote: function(entry, text) {
      var d = Object.assign({}, entry.details || {});
      d.notes = (d.notes || []).concat([{ at: new Date().toISOString(), text: String(text).slice(0, 500) }]);
      return RPGACE.modules.doingNow.logic.patch(entry.id, { details: d });
    },
    // Stop/save: the entry's own fields plus the side effects each detail has.
    finish: function(entry, form) {
      var L = RPGACE.modules.doingNow.logic;
      var d = Object.assign({}, entry.details || {});
      ['how', 'mood', 'effort', 'again', 'who', 'money', 'link', 'photo'].forEach(function(k) {
        if (form[k] != null && form[k] !== '' && !(Array.isArray(form[k]) && !form[k].length)) d[k] = form[k];
      });
      var fields = { details: d };
      if (!entry.completed) {
        var end = new Date();
        fields.completed = true;
        fields.ended_at = end.toISOString();
        fields.actual_mins = L.mins(entry, end.getTime());
      }
      if (form.place) fields.place = String(form.place).slice(0, 120);
      // DL-4: a typed cook finishing loads its follow-ups (e.g. washing up).
      if (!entry.completed && !(entry.details && entry.details.task_id)) { var mk = L.matchKind(entry.title, []); if (mk && mk.kind === 'cook') setTimeout(function() { try { RPGACE.hooks.fire('cook:finished', { at: Date.now(), title: entry.title }); } catch (e) {} }, 0); }
      return L.patch(entry.id, fields).then(function() {
        var side = [];
        if (fields.completed) side.push(L.tickAction(Object.assign({}, entry, fields)));
        var today = L.iso();
        (form.who || []).forEach(function(p) {
          var tp = RPGACE.modules.tripPlans;
          if (tp && p.id) side.push(tp.logic.updatePerson(p.id, { last_spoke: today }));
        });
        if (form.money && Number(form.money.amount) > 0) {
          side.push(RPGACE.sb.secureWrite('chronicles_finance', 'insert', {
            type: 'expense', entry_date: today, item: entry.title, category: form.money.category || 'Personal',
            amount: Number(form.money.amount), notes: 'Doing Now'
          }).then(function() { try { RPGACE.cache.clear('chronicles_finance'); } catch (e) {} }));
        }
        return Promise.all(side.map(function(p) { return p.catch(function(e) { return { failed: e.message || String(e) }; }); }));
      }).then(function(results) {
        return { fields: fields, failed: (results || []).filter(function(r) { return r && r.failed; }).map(function(r) { return r.failed; }) };
      });
    },
    // Running entries started on another device show here too.
    sync: function() {
      var self = RPGACE.modules.doingNow;
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve([]);
      return RPGACE.sb.select('rpgace_agendas', 'select=*&source_type=eq.' + self.SOURCE + '&completed=eq.false&order=started_at.desc&limit=5')
        .then(function(rows) {
          rows = Array.isArray(rows) ? rows : [];
          var list = self.logic.all(), ids = {}, added = 0;
          list.forEach(function(x) { ids[x.id] = 1; });
          rows.forEach(function(r) { if (!ids[r.id]) { list.push(r); added++; } });
          if (added) { try { RPGACE.DB.set('sched', list); } catch (e) {} }
          return rows;
        }).catch(function() { return []; });
    },
    // DN-3: does this activity name sound like cooking or the gym? Pure.
    // A saved recipe's title inside the name wins (that recipe is offered first).
    COOK_RE: /\b(cook|cooking|cooked|dinner|lunch|breakfast|brunch|bake|baking|meal ?prep|recipe)\b/i,
    GYM_RE: /\b(gym|workout|work ?out|lifting|weights|push day|pull day|leg day|training session)\b/i,
    matchKind: function(name, recipes) {
      var L = RPGACE.modules.doingNow.logic, n = String(name || '').toLowerCase(), hit = null;
      (recipes || []).forEach(function(r) {
        var t = String(r.title || '').toLowerCase().trim();
        if (t.length >= 4 && n.indexOf(t) > -1 && (!hit || t.length > hit.title.length)) hit = r;
      });
      if (hit) return { kind: 'cook', recipe: hit };
      if (L.COOK_RE.test(n)) return { kind: 'cook', recipe: null };
      if (L.GYM_RE.test(n)) return { kind: 'gym' };
      return null;
    },
    KIND_REALM: { cook: 'chef', gym: 'athlete' },
    // AC-3: activities with a live page of their own.
    STUDY_RE: /\b(study|studying|revise|revising|revision|exam|aws|quiz|flash ?cards?)\b/i,
    READ_RE: /\b(read|reading|book|chapter)\b/i,
    liveKind: function(name, recipes) {
      var L = RPGACE.modules.doingNow.logic, m = L.matchKind(name, recipes);
      if (m) return m;
      if (L.STUDY_RE.test(name || '')) return { kind: 'study' };
      if (L.READ_RE.test(name || '')) return { kind: 'read' };
      return null;
    },
    // A realm block planned for right now that runs a timer (MD-4).
    focusBlockNow: function(realms, now) {
      var md = RPGACE.modules.myDay;
      if (!md || !md.logic.dayBlocks || !(realms || []).length) return null;
      now = now || new Date();
      var ML = md.logic, m = now.getHours() * 60 + now.getMinutes();
      return ML.dayBlocks(ML.iso(now)).filter(function(b) {
        var s = ML.toMin(b.start_time);
        return b.kind === 'realm' && realms.indexOf(b.realm) > -1 && s != null && m >= s - 10 && m < s + (Number(b.mins) || 30) && ML.blockMethod(b) !== 'none';
      })[0] || null;
    },
    loadRecipes: function() {
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve([]);
      return RPGACE.sb.select('recipes', 'select=id,title&order=created_at.desc&limit=40')
        .then(function(r) { return Array.isArray(r) ? r : []; }, function() { return []; });
    },
    // The cook/gym session saved: stop the Doing Now entry and link it.
    linkFinish: function(entryId, extra) {
      var L = RPGACE.modules.doingNow.logic;
      var e = L.all().filter(function(x) { return x.id === entryId; })[0];
      if (!e) return Promise.resolve(null);
      if (e.completed) return L.patch(e.id, { details: Object.assign({}, e.details || {}, extra) });
      return L.endAt(e, Date.now(), extra).then(function(r) { L.tickAction(e); return r; });
    },

    // DN-6: a cook or gym session already has its own Chronicles entry.
    isLinked: function(x) {
      var d = (x && x.details) || {};
      return !!d.planned_cook_id || !!(d.link && d.link.kind === 'gym_sessions');
    },
    // DN-6 (Alex: "Section by realm"): the first realm with its own section wins. Pure.
    CHRONICLE_SECTION: { chef: 'doing_cook', producer: 'doing_content', scholar: 'doing_learning' },
    chronicleType: function(x) {
      var map = RPGACE.modules.doingNow.logic.CHRONICLE_SECTION, rs = (x && x.realms) || [];
      for (var i = 0; i < rs.length; i++) if (map[rs[i]]) return map[rs[i]];
      return 'doing_life';
    },
    // DN-6: Sunday review block for the week ws..end (YYYY-MM-DD). Pure.
    weekSummary: function(list, ws, end) {
      var self = RPGACE.modules.doingNow, L = self.logic, by = {}, n = 0, mins = 0, best = null;
      (list || []).forEach(function(x) {
        if (!x || x.source_type !== self.SOURCE || !x.completed || !x.started_at) return;
        var day = L.iso(new Date(x.started_at));
        if (day < ws || day > end) return;
        var m = Number(x.actual_mins) || 0, mood = Number(x.details && x.details.mood) || 0;
        n++; mins += m;
        var k = L.norm(x.title) || x.title;
        var g = by[k] || (by[k] = { title: x.title, mins: 0, n: 0 });
        g.mins += m; g.n++;
        if (mood && (!best || mood > best.mood || (mood === best.mood && x.started_at > best.at))) best = { title: x.title, mood: mood, at: x.started_at };
      });
      var top = Object.keys(by).map(function(k) { return by[k]; }).sort(function(a, b) { return b.mins - a.mins || b.n - a.n; }).slice(0, 3);
      return { n: n, mins: mins, top: top, best: best };
    },
    weekLines: function(w) {
      var self = RPGACE.modules.doingNow, L = self.logic;
      if (!w || !w.n) return [];
      var out = [w.n + ' activit' + (w.n === 1 ? 'y' : 'ies') + ', ' + L.fmt(w.mins) + ' in total'];
      if (w.top.length) out.push('Most time: ' + w.top.map(function(g) { return g.title + ' ' + L.fmt(g.mins); }).join(', '));
      if (w.best) out.push('Best mood: ' + w.best.title + ' ' + self.MOODS[w.best.mood - 1]);
      return out;
    },

    // DN-4: repeats. Names match loosely (case, spaces, punctuation, emoji).
    norm: function(name) {
      return String(name || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    },
    // Doing Now entries in the last REPEAT_DAYS, grouped by name. Pure.
    repeats: function(list, today) {
      var self = RPGACE.modules.doingNow, L = self.logic, by = {};
      var from = new Date(today + 'T12:00:00').getTime() - self.REPEAT_DAYS * 864e5;
      (list || []).forEach(function(x) {
        if (!x || x.source_type !== self.SOURCE || !x.started_at) return;
        var t = new Date(x.started_at);
        if (isNaN(t.getTime()) || t.getTime() < from) return;
        var key = L.norm(x.title);
        if (!key) return;
        var g = by[key] || (by[key] = { key: key, title: x.title, n: 0, last: 0, days: {}, startMins: [], mins: [], places: {}, realms: {} });
        g.n++;
        if (t.getTime() >= g.last) { g.last = t.getTime(); g.title = x.title; }
        var dow = ((t.getDay() + 6) % 7) + 1;
        g.days[dow] = (g.days[dow] || 0) + 1;
        g.startMins.push(t.getHours() * 60 + t.getMinutes());
        if (x.completed && Number(x.actual_mins) > 0) g.mins.push(Number(x.actual_mins));
        if (x.place) g.places[x.place] = (g.places[x.place] || 0) + 1;
        (x.realms || []).forEach(function(r) { g.realms[r] = 1; });
      });
      return Object.keys(by).map(function(k) {
        var g = by[k], avg = function(a) { return a.length ? a.reduce(function(s, v) { return s + v; }, 0) / a.length : null; };
        var sm = avg(g.startMins), mm = avg(g.mins);
        var place = Object.keys(g.places).sort(function(a, b) { return g.places[b] - g.places[a]; })[0] || null;
        return { key: g.key, title: g.title, n: g.n, days: g.days, startMin: sm == null ? null : Math.round(sm / 15) * 15,
                 mins: mm == null ? null : Math.max(5, Math.round(mm / 5) * 5), place: place, realms: Object.keys(g.realms) };
      }).sort(function(a, b) { return b.n - a.n; });
    },
    templateFor: function(key, templates) {
      var L = RPGACE.modules.doingNow.logic;
      return (templates || []).filter(function(t) { return L.norm(t.name) === key; })[0] || null;
    },
    // The one repeat to offer right now, or null. Pure.
    suggestion: function(list, templates, routines, today, now) {
      var self = RPGACE.modules.doingNow, L = self.logic;
      var taken = {};
      (routines || []).forEach(function(r) { if (r.active !== false) taken[L.norm(r.title)] = 1; });
      return L.repeats(list, today).filter(function(g) {
        if (g.n < self.REPEAT_N || taken[g.key]) return false;
        var t = L.templateFor(g.key, templates);
        if (t && t.suggest_off) return false;
        if (t && t.suggest_snoozed_until && new Date(t.suggest_snoozed_until).getTime() > (now || Date.now())) return false;
        return true;
      })[0] || null;
    },
    fmtClock: function(m) { return m == null ? null : String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },
    // "Tue/Thu ~19:00, 40 min" for the card. Pure.
    usualText: function(g) {
      var self = RPGACE.modules.doingNow, md = RPGACE.modules.myDay, names = (md && md.DAYS) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      var days = Object.keys(g.days).map(Number).sort().map(function(d) { return names[d - 1]; });
      var bits = [];
      if (days.length <= 3) bits.push(days.join('/'));
      if (g.startMin != null) bits.push('~' + self.logic.fmtClock(g.startMin));
      if (g.mins) bits.push(g.mins + ' min');
      return bits.join(', ');
    },
    // Routine editor prefill from a repeat. Same weekdays (<=3, one seen twice)
    // -> "Certain days"; otherwise "A few times a week". Pure.
    routinePrefill: function(g) {
      var self = RPGACE.modules.doingNow, md = RPGACE.modules.myDay;
      var dayKeys = Object.keys(g.days).map(Number).sort();
      var fixed = dayKeys.length <= 3 && dayKeys.some(function(d) { return g.days[d] >= 2; });
      var area = 'Other';
      if (md && md.AREA_REALM) {
        var realmArea = {};
        Object.keys(md.AREA_REALM).forEach(function(a) { if (!realmArea[md.AREA_REALM[a]]) realmArea[md.AREA_REALM[a]] = a.charAt(0).toUpperCase() + a.slice(1); });
        for (var i = 0; i < g.realms.length; i++) if (realmArea[g.realms[i]]) { area = realmArea[g.realms[i]]; break; }
      }
      var sm = g.startMin, part = sm == null ? 'any' : sm < 720 ? 'morning' : sm < 1020 ? 'afternoon' : 'evening';
      return {
        title: g.title, area: area,
        cadence: fixed ? 'weekly' : 'times_per_week',
        days: fixed ? dayKeys : [],
        times_per_week: fixed ? null : Math.max(1, Math.round(g.n * 7 / self.REPEAT_DAYS)),
        part_of_day: part, preferred_time: self.logic.fmtClock(sm),
        est_mins: g.mins || 30, xp: 10
      };
    },
    // Save/update the repeat's template (it carries the snooze / stop-asking state).
    setTemplate: function(g, patch) {
      var md = RPGACE.modules.myDay, L = RPGACE.modules.doingNow.logic;
      if (!md || !md.logic.addTemplate) return Promise.resolve(null);
      var t = L.templateFor(g.key, md._templates);
      var write = function(row) {
        if (!patch) return Promise.resolve(row);
        return RPGACE.sb.secureWrite('activity_templates', 'update', patch, 'id=eq.' + row.id).then(function() {
          Object.assign(row, patch);
          try { RPGACE.cache.clear('activity_templates'); } catch (e) {}
          return row;
        });
      };
      if (t) return write(t);
      return md.logic.addTemplate({ name: g.title, category: 'personal', place: g.place, est_mins: g.mins || 30 }).then(write);
    },
    // The shared schedule sync keeps the OLDEST 300 agendas, so read the last
    // REPEAT_DAYS of Doing Now rows directly and merge with the local list.
    loadRecent: function() {
      var self = RPGACE.modules.doingNow, L = self.logic;
      var from = new Date(Date.now() - self.REPEAT_DAYS * 864e5).toISOString();
      var local = L.all();
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(local);
      return RPGACE.sb.select('rpgace_agendas', 'select=id,title,source_type,started_at,completed,actual_mins,place,realms,details&source_type=eq.' + self.SOURCE + '&started_at=gte.' + from + '&limit=500')
        .then(function(rows) {
          var seen = {}, out = [];
          (local || []).concat(Array.isArray(rows) ? rows : []).forEach(function(x) { if (x && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
          return out;
        }, function() { return local; });
    },
    // After every finish: the 2nd time something is done, fill its template.
    autoTemplate: function() {
      var md = RPGACE.modules.myDay, L = RPGACE.modules.doingNow.logic;
      if (!md || !md._templates) return Promise.resolve(null);
      return L.loadRecent().then(function(list) {
        var todo = L.repeats(list, L.iso()).filter(function(x) { return x.n >= 2 && !L.templateFor(x.key, md._templates); });
        return todo.reduce(function(chain, g) { return chain.then(function() { return L.setTemplate(g, null); }); }, Promise.resolve(null));
      }).catch(function(e) { console.warn('[doingNow] template fill failed', e && e.message); });
    },

    // DN-2: what to do about each running entry right now. Pure.
    // anchor = start, or the last "still going" answer; the 4-hour cap counts from it.
    overdue: function(list, now) {
      var self = RPGACE.modules.doingNow, out = { ask: [], stop: [] };
      self.logic.running(list).forEach(function(e) {
        var d = e.details || {}, start = new Date(e.started_at).getTime();
        if (isNaN(start)) return;
        var anchor = d.still_going_at ? Math.max(start, new Date(d.still_going_at).getTime()) : start;
        if (now - anchor >= self.CAP_MIN * 60000) out.stop.push({ entry: e, endAt: anchor + self.CAP_MIN * 60000 });
        // AC-3: with an expected length, ask 15 min after it should have ended.
        else if (now - start >= (d.expect_mins ? Math.min(self.ASK_MIN, Math.max(30, Number(d.expect_mins) + 15)) : self.ASK_MIN) * 60000 && !(d.snooze_until && new Date(d.snooze_until).getTime() > now)) out.ask.push(e);
      });
      return out;
    },
    // End an entry at a given time (I stopped at… / auto-stop). Keeps details.
    endAt: function(entry, endMs, extra) {
      var start = new Date(entry.started_at).getTime();
      var d = Object.assign({}, entry.details || {}, extra || {});
      return RPGACE.modules.doingNow.logic.patch(entry.id, {
        completed: true, ended_at: new Date(endMs).toISOString(),
        actual_mins: Math.max(0, Math.round((endMs - start) / 60000)), details: d
      });
    },
    stillGoing: function(entry, now) {
      var self = RPGACE.modules.doingNow;
      var d = Object.assign({}, entry.details || {}, {
        still_going_at: new Date(now).toISOString(),
        snooze_until: new Date(now + self.SNOOZE_MIN * 60000).toISOString()
      });
      return self.logic.patch(entry.id, { details: d });
    },
    discard: function(entry) {
      var list = RPGACE.modules.doingNow.logic.all().filter(function(x) { return x.id !== entry.id; });
      try { RPGACE.DB.set('sched', list); } catch (e) {}
      return RPGACE.sb.secureWrite('rpgace_agendas', 'delete', null, 'id=eq.' + entry.id);
    },
    // "I stopped at HH:MM": the latest moment at that clock time that is after
    // the start and not in the future (handles past-midnight). null if impossible.
    stopTime: function(entry, hhmm, now) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
      if (!m) return null;
      var start = new Date(entry.started_at).getTime(), t = new Date(now);
      t.setHours(Number(m[1]), Number(m[2]), 0, 0);
      var ms = t.getTime();
      if (ms > now) ms -= 864e5;
      return ms > start ? ms : null;
    },
    // Today's auto-stopped entries still waiting for the real end time.
    autoStopped: function(list) {
      return (list || RPGACE.modules.doingNow.logic.all()).filter(function(x) {
        return x && x.source_type === RPGACE.modules.doingNow.SOURCE && x.completed && x.details && x.details.auto_stopped && !x.details.time_fixed;
      });
    },
    // DN-1b: the quietest realms (longest since any XP or Doing Now entry;
    // never-touched realms first), one idea each from the kept realm tasks,
    // rotated by day so the list changes daily. Pure: data in, ideas out.
    ideas: function(events, sched, today, n) {
      var S = RPGACE.modules.xpSeason, md = RPGACE.modules.myDay, L = RPGACE.modules.doingNow.logic;
      var acts = RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.activityMap() : {}, order = (S && S.ORDER) || Object.keys(acts);
      var last = {};
      var seen = function(r, d) { if (r && d && (!last[r] || d > last[r])) last[r] = d; };
      (events || []).forEach(function(e) { if (!e.status || e.status === 'active') seen(e.realm, e.earned_on); });
      (sched || []).forEach(function(x) {
        if (x && x.source_type === RPGACE.modules.doingNow.SOURCE) (x.realms || []).forEach(function(r) { seen(r, String(x.started_at || x.date || '').slice(0, 10)); });
      });
      var dayN = Math.floor(new Date(today + 'T12:00:00').getTime() / 864e5);
      var running = L.running(sched).map(function(x) { return x.title; });
      return order.filter(function(r) { return (acts[r] || []).length; })
        .map(function(r, i) {
          var gap = last[r] ? Math.round((new Date(today + 'T12:00:00') - new Date(last[r] + 'T12:00:00')) / 864e5) : 99999;
          return { realm: r, gap: gap, i: i };
        })
        .filter(function(x) { return x.gap >= 3; })
        .sort(function(a, b) { return (b.gap - a.gap) || (a.i - b.i); })
        .slice(0, n || 3)
        .map(function(x) {
          var list = acts[x.realm].filter(function(a) { return running.indexOf(a.title) === -1; });
          var a = list.length ? list[dayN % list.length] : acts[x.realm][0];
          var R = S && S.REALMS && S.REALMS[x.realm];
          return { realm: x.realm, icon: R ? R.icon : '✨', name: R ? R.name : x.realm, title: a.title, mins: a.mins || null,
                   why: x.gap >= 99999 ? 'not tried yet' : x.gap + ' days quiet' };
        });
    },
    loadIdeas: function() {
      var S = RPGACE.modules.xpSeason, L = RPGACE.modules.doingNow.logic;
      var p = S && S.logic && S.logic.load ? S.logic.load().catch(function() { return []; }) : Promise.resolve([]);
      return p.then(function(events) { return L.ideas(events || [], L.all(), L.iso(), 3); });
    },
    // Linked thing: recent beats/videos, recipes, plans and Library items.
    loadLinks: function() {
      var tp = RPGACE.modules.tripPlans, sb = RPGACE.sb;
      var safe = function(p, kind, icon) {
        return p.then(function(rows) {
          return (Array.isArray(rows) ? rows : []).filter(function(r) { return r.title; })
            .map(function(r) { return { kind: kind, id: String(r.id), title: r.title, icon: icon }; });
        }, function() { return []; });
      };
      return Promise.all([
        safe(sb.select('content_productions', 'select=id,title&order=created_at.desc&limit=15'), 'content_productions', '🎵'),
        safe(sb.select('recipes', 'select=id,title&order=created_at.desc&limit=15'), 'recipes', '🍳'),
        tp ? safe(tp.logic.read('plans', 'select=id,title&order=created_at.desc&limit=15'), 'plans', '🧭') : Promise.resolve([]),
        tp ? safe(tp.logic.read('library_items', 'select=id,title&order=created_at.desc&limit=15'), 'library_items', '📚') : Promise.resolve([]),
        // BT-2: beats being made (their time adds up on the idea).
        safe(sb.select('conid_pot', 'select=id,title&status=eq.making&order=created_at.desc&limit=15'), 'conid_pot', '🎛'),
        // PC-3: posts being made.
        tp ? safe(tp.logic.read('posts', 'select=id,title&stage=in.(planned,recording,editing)&order=updated_at.desc&limit=15'), 'posts', '📣') : Promise.resolve([])
      ]).then(function(r) { return [].concat(r[4], r[5], r[0], r[1], r[2], r[3]); });
    }
  },

  ui: {
    _btn: function(label, kind) { return RPGACE.kit.btn(label, kind); },   // CK-6: one copy in RPGACE.kit
    _refresh: function() {
      var md = RPGACE.modules.myDay, dd = RPGACE.modules.dashDeck;
      try { RPGACE.modules.doingNow.logic.autoTemplate(); } catch (e) {}
      try { if (md && md.ui && document.getElementById('myday-panel')) md.ui.render(); } catch (e) {}
      try { if (dd && dd._refreshGlance) dd._refreshGlance(); } catch (e) {}
      try { var lv = document.getElementById('rt-live'), rt = RPGACE.modules.realmTasks; if (lv && rt) rt.ui._drawLive(lv, lv._opts || {}); } catch (e) {} // DL-2: Live now shows it
    },
    // DN-4: the repeat offer.
    repeatCard: function(g) {
      var self = RPGACE.modules.doingNow, L = self.logic, ui = self.ui;
      var box = document.createElement('div');
      box.id = 'dn-repeat';
      box.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;';
      var t = document.createElement('div');
      t.style.cssText = 'font-size:14px;color:var(--text);';
      var usual = L.usualText(g);
      t.textContent = '🔁 You\'ve done ' + g.title + ' ' + g.n + ' times in 3 weeks' + (usual ? ' (usually ' + usual + ')' : '') + '.';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      var make = ui._btn('Make it an Action', 'primary');
      make.id = 'dn-repeat-make';
      var later = ui._btn('Not now', '');
      later.id = 'dn-repeat-later';
      var never = ui._btn('Stop asking', '');
      never.id = 'dn-repeat-never';
      var fail = function(e) { RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 4000, 'doingNow'); };
      make.onclick = function() {
        var md = RPGACE.modules.myDay;
        if (!md || !md.ui.openEditor) return fail('My Day is not loaded');
        md.ui.openEditor(L.routinePrefill(g), null, function() {
          L.setTemplate(g, { suggest_off: true }).catch(fail);
          RPGACE.utils.toast('🔁 ' + g.title + ' is an Action now', 'var(--gold)', 2200);
        });
      };
      later.onclick = function() {
        later.disabled = true;
        L.setTemplate(g, { suggest_snoozed_until: new Date(Date.now() + self.REPEAT_SNOOZE_DAYS * 864e5).toISOString() })
          .then(function() { box.remove(); }, function(e) { later.disabled = false; fail(e); });
      };
      never.onclick = function() {
        never.disabled = true;
        L.setTemplate(g, { suggest_off: true }).then(function() { box.remove(); }, function(e) { never.disabled = false; fail(e); });
      };
      row.appendChild(make); row.appendChild(later); row.appendChild(never);
      box.appendChild(t); box.appendChild(row);
      return box;
    },
    // DN-2: auto-stop anything past the cap, then ask about one long-running entry.
    check: function() {
      var self = RPGACE.modules.doingNow, L = self.logic, now = Date.now();
      var o = L.overdue(L.all(), now);
      var stops = o.stop.map(function(x) {
        return L.endAt(x.entry, x.endAt, { auto_stopped: true }).catch(function(e) {
          RPGACE.utils.toast('⚠️ Could not auto-stop "' + x.entry.title + '": ' + (e.message || e), '#CC4A4A', 4000, 'doingNow');
        });
      });
      if (o.stop.length) RPGACE.utils.toast('⏹ Auto-stopped after 4 hours: ' + o.stop.map(function(x) { return x.entry.title; }).join(', ') + ' — fix the time on My Day', 'var(--gold)', 4500);
      return Promise.all(stops).then(function() {
        if (o.stop.length) self.ui._refresh();
        if (o.ask.length && !self._asking) self.ui.askStill(o.ask[0]);
      });
    },
    _timeInput: function(id, value) {
      var t = document.createElement('input');
      t.type = 'time'; t.id = id; t.value = value;
      t.style.cssText = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:16px;';
      return t;
    },
    _hhmm: function(ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
    // Pick the real end time, save it, then open the normal Stop screen.
    _pickEnd: function(wrap, entry, defMs, onSaved) {
      var self = RPGACE.modules.doingNow, L = self.logic, ui = self.ui;
      wrap.innerHTML = '';
      var lab = document.createElement('div');
      lab.style.cssText = 'font-size:14px;color:var(--text);';
      lab.textContent = 'What time did you stop? (started ' + ui._hhmm(new Date(entry.started_at).getTime()) + ')';
      var t = ui._timeInput('dn-stop-at', ui._hhmm(defMs));
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;';
      var ok = ui._btn('Save time', 'primary');
      ok.id = 'dn-stop-at-ok';
      ok.onclick = function() {
        var ms = L.stopTime(entry, t.value, Date.now());
        if (ms == null) { err.textContent = 'Pick a time after it started and not in the future.'; err.style.display = 'block'; return; }
        ok.disabled = true;
        onSaved(ms);
      };
      [lab, t, err, ok].forEach(function(n) { wrap.appendChild(n); });
    },
    askStill: function(entry) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, L = self.logic, ui = self.ui;
      self._asking = true;
      var pop = dd._popup({ title: 'Still doing "' + entry.title + '"?', width: '440px', onClose: function() { self._asking = false; } });
      var wrap = document.createElement('div');
      wrap.id = 'dn-still';
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      var info = document.createElement('div');
      info.style.cssText = 'font-size:14px;color:var(--muted);';
      info.textContent = 'Running for ' + L.fmt(L.mins(entry)) + '. Anything left running 4 hours after your last answer stops itself at that point.';
      var yes = ui._btn('▶ Yes, still going', 'primary');
      yes.id = 'dn-still-yes';
      var stopped = ui._btn('⏹ I stopped at…', '');
      stopped.id = 'dn-still-stopped';
      var discard = ui._btn('🗑 Discard', '');
      discard.id = 'dn-still-discard';
      discard.style.color = '#CC4A4A';
      yes.onclick = function() {
        yes.disabled = true;
        L.stillGoing(entry, Date.now()).then(function() { pop.close(); RPGACE.utils.toast('▶ Keeping it running', 'var(--gold)', 1800); ui._refresh(); },
          function(e) { pop.close(); RPGACE.utils.toast('⚠️ Saved on this device only: ' + (e.message || e), '#CC4A4A', 4000, 'doingNow'); ui._refresh(); });
      };
      stopped.onclick = function() {
        ui._pickEnd(wrap, entry, Date.now(), function(ms) {
          L.endAt(entry, ms).then(function() {
            pop.close(); ui._refresh();
            var fresh = L.all().filter(function(x) { return x.id === entry.id; })[0] || entry;
            ui.openStop(fresh);
          }, function(e) { pop.close(); RPGACE.utils.toast('⚠️ Could not save the stop time: ' + (e.message || e), '#CC4A4A', 4000, 'doingNow'); ui._refresh(); });
        });
      };
      // Two taps to delete (3s), same as Bookworm's 🗑.
      var armed = null;
      discard.onclick = function() {
        if (!armed) {
          discard.textContent = 'Tap again to delete';
          armed = setTimeout(function() { armed = null; discard.textContent = '🗑 Discard'; }, 3000);
          return;
        }
        clearTimeout(armed);
        discard.disabled = true;
        L.discard(entry).then(function() { pop.close(); RPGACE.utils.toast('🗑 Discarded', 'var(--gold)', 1800); ui._refresh(); },
          function(e) { pop.close(); RPGACE.utils.toast('⚠️ Removed here, server delete failed: ' + (e.message || e), '#CC4A4A', 4000, 'doingNow'); ui._refresh(); });
      };
      [info, yes, stopped, discard].forEach(function(n) { wrap.appendChild(n); });
      pop.box.appendChild(wrap);
      return pop;
    },
    // Oct 29 2026 (Alex: "a page where I can see active timers and stop them"): every running timer in one list
    // (⚡ Actions → ⏱ Running now). ■ Stop opens the usual Stop screen; ✓ Done finishes it straight away.
    openRunning: function() {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, L = self.logic, ui = self.ui;
      var pop = dd._popup({ eyebrow: '⏱ Running now', title: 'Your timers', width: '460px', closeLabel: 'Close' });
      pop.box.id = 'dn-running-list';
      var list = document.createElement('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var paint = function() {
        list.innerHTML = '';
        var run = L.running();
        if (!run.length) { var none = document.createElement('div'); none.style.cssText = 'color:var(--muted);font-size:14px;'; none.textContent = 'Nothing is running.'; list.appendChild(none); return; }
        run.forEach(function(e) {
          var row = document.createElement('div'); row.className = 'dn-run-row';
          row.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
          var t = document.createElement('div'); t.style.cssText = 'flex:1 1 180px;font-size:15px;font-weight:700;color:var(--text);';
          t.textContent = e.title + ' · ' + L.fmt(L.mins(e));
          var stop = ui._btn('■ Stop', ''); stop.className = 'dn-run-stop';
          stop.onclick = function() { pop.close(); ui.openStop(e); };
          var done = ui._btn('✓ Done', 'primary'); done.className = 'dn-run-done';
          done.onclick = function() {
            done.disabled = true;
            L.finish(e, {}).then(function(res) {
              ui._refresh(); paint();
              try { RPGACE.modules.myDay.ui.render(); } catch (x) {}
              RPGACE.utils.toast(res.failed.length ? '⚠️ Done, but: ' + res.failed.join('; ') : '✓ ' + e.title + ' done', res.failed.length ? '#CC4A4A' : '#4caf82', 2600);
            }, function(x) { done.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (x.message || x), '#CC4A4A', 4000, 'doingNow'); });
          };
          [t, stop, done].forEach(function(n) { row.appendChild(n); });
          list.appendChild(row);
        });
      };
      paint();
      pop.box.appendChild(list);
      return pop;
    },
    // Fix the end time of an auto-stopped entry, then the Stop screen.
    openFixTime: function(entry) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, L = self.logic, ui = self.ui;
      var pop = dd._popup({ title: '⏹ ' + entry.title + ' — when did you stop?', width: '440px' });
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      pop.box.appendChild(wrap);
      ui._pickEnd(wrap, entry, new Date(entry.ended_at).getTime(), function(ms) {
        L.endAt(entry, ms, { time_fixed: true }).then(function() {
          pop.close(); ui._refresh();
          var fresh = L.all().filter(function(x) { return x.id === entry.id; })[0] || entry;
          ui.openStop(fresh);
        }, function(e) { pop.close(); RPGACE.utils.toast('⚠️ Could not save the time: ' + (e.message || e), '#CC4A4A', 4000, 'doingNow'); });
      });
      var keep = ui._btn('4 hours is right', '');
      keep.id = 'dn-fix-keep';
      keep.onclick = function() {
        L.patch(entry.id, { details: Object.assign({}, entry.details || {}, { time_fixed: true }) }).then(function() { pop.close(); ui._refresh(); },
          function(e) { pop.close(); RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'doingNow'); });
      };
      wrap.parentNode.appendChild(keep);
      return pop;
    },
    // The card at the top of My Day: the running activity, or the two start buttons.
    mount: function(panel) {
      var self = RPGACE.modules.doingNow, L = self.logic;
      var old = document.getElementById('dn-card');
      if (old) old.remove();
      var card = document.createElement('div');
      card.id = 'dn-card';
      card.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:4px 0 12px;';
      var run = L.running();
      if (run.length) {
        run.forEach(function(e) {
          var row = document.createElement('div');
          row.className = 'dn-running';
          row.style.cssText = 'border:1px solid var(--gold);border-radius:10px;padding:10px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
          var t = document.createElement('div');
          t.style.cssText = 'flex:1 1 180px;font-size:15px;font-weight:700;color:var(--text);';
          t.textContent = '▶ Live now: ' + e.title;
          var m = document.createElement('span');
          m.className = 'dn-mins';
          m.setAttribute('data-start', e.started_at);
          m.style.cssText = 'font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;margin-left:8px;font-weight:600;';
          m.textContent = L.fmt(L.mins(e));
          t.appendChild(m);
          var kind = e.details && e.details.kind, lk = null;
          if (kind === 'cook' || kind === 'gym') {
            lk = self.ui._btn(kind === 'cook' ? '🍳 Cook Mode' : '🏋️ Gym log', '');
            lk.className = 'dn-link-btn';
            lk.onclick = function() {
              var l = e.details && e.details.link;
              if (kind === 'cook' && l && l.kind === 'recipes') self.ui.openCook(e.id, { id: l.id, title: l.title });
              else if (kind === 'cook') L.loadRecipes().then(function(rs) { self.ui.offerLink(e, { kind: 'cook', recipe: null }, rs); });
              else self.ui.openGym(e.id);
            };
          } else if (kind === 'beat' && RPGACE.modules.beatsHub) {
            lk = self.ui._btn('🥁 Beats', '');
            lk.className = 'dn-link-btn';
            lk.onclick = function() { RPGACE.modules.beatsHub.open(); };
          } else if (kind === 'post' && RPGACE.modules.postingHub) {
            // PC-3: a recording / editing session links back to Posting.
            lk = self.ui._btn('📣 Posting', '');
            lk.className = 'dn-link-btn';
            lk.onclick = function() { RPGACE.modules.postingHub.open(); };
          }
          var note = self.ui._btn('+ note', '');
          note.className = 'dn-note-btn';
          note.onclick = function() { self.ui.openNote(e); };
          var stop = self.ui._btn('■ Stop', 'primary');
          stop.className = 'dn-stop-btn';
          stop.onclick = function() { self.ui.openStop(e); };
          row.appendChild(t); if (lk) row.appendChild(lk); row.appendChild(note); row.appendChild(stop);
          var notes = (e.details && e.details.notes) || [];
          if (notes.length) {
            var n = document.createElement('div');
            n.style.cssText = 'flex-basis:100%;font-size:12px;color:var(--muted);';
            n.textContent = '📝 ' + notes.map(function(x) { return x.text; }).join(' · ');
            row.appendChild(n);
          }
          card.appendChild(row);
        });
      }
      // DN-2: auto-stopped entries waiting for the real end time.
      L.autoStopped().forEach(function(e) {
        var row = document.createElement('div');
        row.className = 'dn-autostopped';
        row.style.cssText = 'border:1px dashed var(--border);border-radius:10px;padding:8px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
        var t = document.createElement('div');
        t.style.cssText = 'flex:1 1 180px;font-size:14px;color:var(--text);';
        t.textContent = '⏹ Auto-stopped at 4 hours: ' + e.title;
        var fix = self.ui._btn('Fix time', '');
        fix.className = 'dn-fix-btn';
        fix.onclick = function() { self.ui.openFixTime(e); };
        row.appendChild(t); row.appendChild(fix);
        card.appendChild(row);
      });
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      // DL-2 (Oct 28 2026, Alex: "doing now should be merged fully with live now ... rename doing now to live now, it
      // should open the same page"): both open ▶ Live now; Doing Now is the store underneath.
      var go = self.ui._btn('▶ Live now', 'primary');
      go.id = 'dn-start';
      go.onclick = function() { self.ui.openStart(); };
      var did = self.ui._btn('✓ I just did', '');
      did.id = 'dn-just-did';
      did.onclick = function() { self.ui.openJustDid(); };
      bar.appendChild(go); bar.appendChild(did);
      card.appendChild(bar);
      // DL-5: a follow-up stays on top of My Day until done or skipped.
      var rtm = RPGACE.modules.realmTasks;
      if (rtm && rtm._tasks) rtm.logic.pendingNext().forEach(function(x) {
        var r = document.createElement('div'); r.className = 'dn-next';
        r.style.cssText = 'border:1px solid var(--gold);border-radius:10px;padding:8px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
        var t = document.createElement('div'); t.style.cssText = 'flex:1 1 180px;font-size:14px;color:var(--text);';
        t.textContent = '⏭ Due: ' + x.title + (x.next_after ? ' — ' + x.next_after : '');
        var g = self.ui._btn('▶ Start', 'primary'); g.onclick = function() { rtm.ui.openLive({ realm: x.realm, start: x.id }); };
        var k = self.ui._btn('Skip', ''); k.onclick = function() { rtm.ui.openSkip(x, function() { self.ui._refresh(); }); };
        r.appendChild(t); r.appendChild(g); r.appendChild(k); card.insertBefore(r, bar);
      });
      // DN-1b: "Try something new" — 3 ideas from the quietest realms; one tap starts it.
      var ideas = document.createElement('div');
      ideas.id = 'dn-ideas';
      ideas.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;';
      card.appendChild(ideas);
      // DN-4: one "you keep doing this" offer at a time.
      var rep = document.createElement('div');
      card.appendChild(rep);
      L.loadRecent().then(function(list) {
        var md = RPGACE.modules.myDay, sug = md ? L.suggestion(list, md._templates, md._routines, L.iso(), Date.now()) : null;
        if (sug && rep.isConnected) rep.replaceWith(self.ui.repeatCard(sug));
      });
      L.loadIdeas().then(function(list) {
        if (!list.length || !ideas.isConnected) return;
        var md0 = RPGACE.modules.myDay;
        if (md0 && md0.ui._mdxOn && md0.ui._mdxOn() && panel.closest && panel.closest('#myday-panel')) return; // MDX-4: ideas are in the ▾ list
        var lab = document.createElement('div');
        lab.style.cssText = 'flex-basis:100%;font-size:12px;color:var(--muted);font-weight:700;';
        lab.textContent = '✨ Try something new';
        ideas.appendChild(lab);
        list.forEach(function(it) {
          var bt = self.ui._btn(it.icon + ' ' + it.title, '');
          bt.className = 'dn-idea';
          bt.setAttribute('data-realm', it.realm);
          bt.title = it.name + ': ' + it.why + (it.mins ? ' · about ' + it.mins + ' min' : '');
          bt.style.fontSize = '13px';
          bt.onclick = function() {
            bt.disabled = true;
            L.start(it.title, [it.realm]);
            RPGACE.utils.toast('▶ Started: ' + it.title, 'var(--gold)', 2000);
            self.ui._refresh();
          };
          var w = document.createElement('div');
          w.style.cssText = 'display:flex;flex-direction:column;';
          var sub = document.createElement('span');
          sub.style.cssText = 'font-size:11px;color:var(--muted);padding-left:4px;';
          sub.textContent = it.name + ' · ' + it.why;
          w.appendChild(bt); w.appendChild(sub);
          ideas.appendChild(w);
        });
      });
      var head = panel.firstChild;
      panel.insertBefore(card, head ? head.nextSibling : null);
      self.ui._tick();
    },
    // One shared ticker; stops itself once no timer is on screen.
    _tick: function() {
      var self = RPGACE.modules.doingNow;
      if (self._timer) return;
      self._timer = setInterval(function() {
        var els = document.querySelectorAll('.dn-mins');
        if (!els.length) { clearInterval(self._timer); self._timer = null; return; }
        els.forEach(function(el) { el.textContent = self.logic.fmt(self.logic.mins({ started_at: el.getAttribute('data-start') })); });
      }, 30000);
    },
    _nameForm: function(title, withMins, onGo) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow;
      var pop = dd._popup({ title: title, width: '440px' });
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      var inp = document.createElement('input');
      inp.id = 'dn-name'; inp.type = 'text'; inp.maxLength = 80;
      inp.placeholder = 'What are you doing? e.g. Walk to the park';
      inp.style.cssText = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;';
      wrap.appendChild(inp);
      var minsIn = null;
      if (withMins) {
        minsIn = document.createElement('input');
        minsIn.id = 'dn-mins-in'; minsIn.type = 'number'; minsIn.min = '1'; minsIn.max = '720'; minsIn.inputMode = 'numeric';
        minsIn.placeholder = 'How many minutes?';
        minsIn.style.cssText = inp.style.cssText;
        wrap.appendChild(minsIn);
      }
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;';
      wrap.appendChild(err);
      var ok = self.ui._btn('Next', 'primary');
      ok.id = 'dn-name-ok';
      ok.onclick = function() {
        var name = inp.value.trim(), m = minsIn ? Number(minsIn.value) : 0;
        if (!name) { err.textContent = 'Give it a name.'; err.style.display = 'block'; return; }
        if (minsIn && !(m > 0)) { err.textContent = 'Enter how many minutes it took.'; err.style.display = 'block'; return; }
        pop.close();
        onGo(name, m);
      };
      inp.addEventListener('keydown', function(ev) { if (ev.key === 'Enter') ok.click(); });
      wrap.appendChild(ok);
      pop.box.appendChild(wrap);
      setTimeout(function() { try { inp.focus(); } catch (e) {} }, 50);
      return pop;
    },
    _pickRealms: function(name, preset) {
      var rp = RPGACE.realmPicker;
      if (!rp || !rp.pick) return Promise.resolve([]);
      return rp.pick({ what: 'activity', title: name, preset: preset || [] }).then(function(r) { return Array.isArray(r) ? r : []; }, function() { return []; });
    },
    // MDX-4 (Oct 21 2026, Alex: "the log buttons should have a drop list with
    // thing i can do, first by realm, then by tasks available, do sub
    // categories if possible"): one list for ▶ Doing now and ✓ I just did.
    openDropList: function(mode) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, L = self.logic, md = RPGACE.modules.myDay, xs = RPGACE.modules.xpSeason;
      var pop = dd._popup({ title: mode === 'did' ? '✓ I just did…' : '▶ Live now', width: '520px' });
      pop.box.id = 'dn-drop';
      var esc = function(t) { var d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; };
      var btn = function(label, sub, cls) {
        var b = document.createElement('button'); b.type = 'button'; b.className = cls || 'dn-drop-item';
        b.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:48px;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:15px;text-align:left;cursor:pointer;font-family:inherit;';
        b.innerHTML = '<span>' + esc(label) + '</span>' + (sub ? '<span style="font-size:12px;color:var(--muted);">' + esc(sub) + '</span>' : '');
        return b;
      };
      // AC-3: every pick asks when + how long; an Action is ticked off (xp 0).
      var go = function(title, realm, mins, actionId) {
        pop.close();
        var realms = realm ? [realm] : [];
        var details = actionId ? { action_id: String(actionId) } : {};
        if (mode === 'did') { self.ui._didThen(title, realms, mins, details); return; }
        self.ui._askWhen('now', title, mins, function(w) {
          L.loadRecipes().then(function(recipes) { self.ui._afterStart(title, realms, recipes, { startedAt: w.at, expect: w.mins, details: details }); });
        });
      };
      var list = document.createElement('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      pop.box.appendChild(list);
      var home = function() {
        list.innerHTML = '';
        var own = btn('✏️ Something else…', 'Type it yourself', 'dn-drop-own');
        own.onclick = function() { pop.close(); if (mode === 'did') self.ui.openJustDid(); else self.ui.openStart(); };
        list.appendChild(own);
        // AC-1: your Actions first - due today, then lately, then the rest (folded).
        var actBox = document.createElement('div'); actBox.id = 'dn-drop-actions'; actBox.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
        list.appendChild(actBox);
        var mdReady = md && !(md._routines || []).length ? md.logic.load().catch(function() { return null; }) : Promise.resolve();
        Promise.all([L.loadRecent().catch(function() { return []; }), mdReady]).then(function(res) {
          var recent = res[0];
          if (!md || !md.logic.actionList || !actBox.isConnected) return;
          var a = md.logic.actionList(L.iso(), recent);
          var head = function(t) { var h = document.createElement('div'); h.className = 'dn-drop-sub'; h.style.cssText = 'font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px;'; h.textContent = t; return h; };
          var row = function(it, into) { var b = btn((it.icon ? it.icon + ' ' : '') + it.label, it.sub + (it.mins ? (it.sub ? ' · ' : '') + 'about ' + it.mins + ' min' : ''), 'dn-drop-action'); b.onclick = function() { go(it.label, it.realm, it.mins, it.routine ? it.routine.id : null); }; into.appendChild(b); };
          var mine = a.due.concat(a.recent);
          if (mine.length) { actBox.appendChild(head('⭐ Your Actions')); mine.forEach(function(it) { row(it, actBox); }); }
          if (a.rest.length) {
            var more = document.createElement('details'); more.className = 'dn-drop-more';
            var sm = document.createElement('summary'); sm.style.cssText = 'cursor:pointer;min-height:40px;display:flex;align-items:center;font-size:14px;color:var(--muted);';
            sm.textContent = (mine.length ? 'All your Actions' : '⭐ Your Actions') + ' (' + a.rest.length + ')';
            var inner = document.createElement('div'); inner.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:6px;';
            a.rest.forEach(function(it) { row(it, inner); });
            more.appendChild(sm); more.appendChild(inner); actBox.appendChild(more);
          }
        });
        var ideasBox = document.createElement('div'); list.appendChild(ideasBox);
        L.loadIdeas().then(function(ideas) {
          if (!ideas.length || !ideasBox.isConnected) return;
          var h = document.createElement('div'); h.style.cssText = 'font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px;'; h.textContent = '✨ Try something new';
          ideasBox.appendChild(h);
          ideas.forEach(function(it) { var b = btn(it.icon + ' ' + it.title, it.name + ' · ' + it.why, 'dn-drop-idea'); b.onclick = function() { go(it.title, it.realm, it.mins); }; ideasBox.appendChild(b); });
        });
        var h2 = document.createElement('div'); h2.style.cssText = 'font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:6px;'; h2.textContent = 'By realm';
        list.appendChild(h2);
        var grid = document.createElement('div'); grid.id = 'dn-drop-realms'; grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;';
        list.appendChild(grid);
        var choices = md ? md.logic.realmChoices() : Promise.resolve(xs ? xs.ORDER.map(function(k) { return { realm: k, icon: xs.REALMS[k].icon, name: xs.REALMS[k].name }; }) : []);
        choices.then(function(cs) {
          cs.forEach(function(c) {
            var b = btn(c.icon + ' ' + c.name, c.behind ? 'quietest this week' : '', 'dn-drop-realm'); b.dataset.realm = c.realm;
            b.onclick = function() { realmView(c); };
            grid.appendChild(b);
          });
        });
      };
      var realmView = function(c) {
        list.innerHTML = '';
        var back = btn('‹ All realms', '', 'dn-drop-back'); back.onclick = home; list.appendChild(back);
        var head = document.createElement('div'); head.style.cssText = 'font-size:17px;font-weight:700;color:var(--text);'; head.textContent = c.icon + ' ' + c.name;
        list.appendChild(head);
        var section = function(title, items) {
          if (!items.length) return;
          var h = document.createElement('div'); h.className = 'dn-drop-sub'; h.style.cssText = 'font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:6px;'; h.textContent = title;
          list.appendChild(h);
          items.forEach(function(it) { var b = btn(it.label, it.mins ? 'about ' + it.mins + ' min' : '', 'dn-drop-task'); b.onclick = function() { go(it.label, c.realm, it.mins, it.src === 'routine' ? it.ref_id : null); }; list.appendChild(b); });
        };
        var opt = md ? md.logic.realmOptions(c.realm) : Promise.resolve({ starters: [], routines: [], books: [] });
        Promise.all([opt, L.loadRecent().catch(function() { return []; })]).then(function(r) {
          var o = r[0] || {}, seen = {};
          var mark = function(arr) { return (arr || []).filter(function(i) { var k = L.norm(i.label); if (seen[k]) return false; seen[k] = 1; return true; }); };
          section('Ideas for this realm', mark(o.starters));
          section('Your actions', mark(o.routines));
          section('Books', mark(o.books));
          var recent = (r[1] || []).filter(function(e) { return (e.realms || []).indexOf(c.realm) > -1; })
            .map(function(e) { return { label: e.title, mins: Number(e.actual_mins) || null }; });
          section('You did lately', mark(recent).slice(0, 8));
          if (list.querySelectorAll('.dn-drop-task').length === 0) { var none = document.createElement('div'); none.style.cssText = 'font-size:13px;color:var(--muted);'; none.textContent = 'Nothing saved for this realm yet — use ✏️ Something else.'; list.appendChild(none); }
        });
      };
      home();
      return pop;
    },
    // AC-3 (Oct 22 2026, Alex: "What + when + how long"): one step for both
    // buttons. mode 'now' = started when + how long you expect; 'did' =
    // finished when + how long it took. cb({ at: ms, mins }).
    _askWhen: function(mode, title, def, cb) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, L = self.logic;
      var pop = dd._popup({ title: (mode === 'did' ? '✓ ' : '▶ ') + title, width: '420px' });
      pop.box.id = 'dn-when';
      var field = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;box-sizing:border-box;';
      var label = function(t) { var d = document.createElement('div'); d.style.cssText = 'font-size:13px;color:var(--muted);margin:8px 0 6px;'; d.textContent = t; return d; };
      var state = { ago: 0, hhmm: '' };
      pop.box.appendChild(label(mode === 'did' ? 'When did you finish?' : 'When did you start?'));
      var chips = document.createElement('div'); chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      var opts = [[0, mode === 'did' ? 'Just now' : 'Now'], [15, '15 min ago'], [30, '30 min ago'], [60, '1 h ago']];
      var time = document.createElement('input'); time.type = 'time'; time.id = 'dn-when-time'; time.style.cssText = field + 'width:120px;';
      var paint = function() { chips.querySelectorAll('.dn-when-chip').forEach(function(c) { var on = !state.hhmm && Number(c.dataset.ago) === state.ago; c.setAttribute('aria-pressed', on ? 'true' : 'false'); c.style.borderColor = on ? 'var(--gold)' : 'var(--border)'; c.style.color = on ? 'var(--gold)' : 'var(--text)'; }); };
      opts.forEach(function(o) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'dn-when-chip'; c.dataset.ago = o[0]; c.textContent = o[1];
        c.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--panel);cursor:pointer;font-size:14px;';
        c.onclick = function() { state.ago = o[0]; state.hhmm = ''; time.value = ''; paint(); };
        chips.appendChild(c);
      });
      time.onchange = function() { state.hhmm = time.value; paint(); };
      chips.appendChild(time);
      pop.box.appendChild(chips);
      pop.box.appendChild(label(mode === 'did' ? 'How many minutes did it take?' : 'About how long will it take? (minutes)'));
      var inp = document.createElement('input'); inp.type = 'number'; inp.id = 'dn-ask-mins'; inp.min = '1'; inp.max = '720'; inp.inputMode = 'numeric';
      inp.value = def || 30; inp.style.cssText = field + 'width:100%;';
      pop.box.appendChild(inp);
      var err = document.createElement('div'); err.id = 'dn-when-err'; err.style.cssText = 'color:#CC4A4A;font-size:13px;margin-top:6px;display:none;';
      pop.box.appendChild(err);
      var ok = self.ui._btn(mode === 'did' ? 'Save' : '▶ Start', 'primary'); ok.id = 'dn-ask-ok'; ok.style.marginTop = '10px';
      ok.onclick = function() {
        var m = Number(inp.value), at = L.whenMs(state.ago, state.hhmm);
        if (!(m > 0)) { err.textContent = 'Enter the minutes.'; err.style.display = 'block'; return; }
        if (at == null) { err.textContent = 'That time hasn\'t happened yet.'; err.style.display = 'block'; return; }
        pop.close(); cb({ at: at, mins: m });
      };
      pop.box.appendChild(ok);
      paint();
      setTimeout(function() { try { inp.focus(); inp.select(); } catch (e) {} }, 50);
      return pop;
    },
    // I just did: when + how long, log it, tick its Action off, then the stop card.
    _didThen: function(title, realms, def, details) {
      var self = RPGACE.modules.doingNow, L = self.logic;
      self.ui._askWhen('did', title, def, function(w) {
        var e = L.justDid(title, w.mins, realms, w.at, { details: details || {} });
        L.tickAction(e);
        self.ui._refresh();
        self.ui._checkBlocks(e, function() { self.ui.openStop(e); });
      });
    },
    // AC-4 (Oct 22 2026): an entry covering a planned block asks "Did this
    // replace it?" Yes = block marked replaced; No = Move it later (next free
    // gap after this, with Undo) or Keep both. One question per block, then next().
    _checkBlocks: function(e, next) {
      var self = RPGACE.modules.doingNow, md = RPGACE.modules.myDay;
      next = next || function() {};
      if (!md || !md.logic.overlapsFor || !e || !e.started_at) { next(); return; }
      var ready = (md._routines || []).length ? Promise.resolve() : md.logic.load().catch(function() {});
      ready.then(function() {
        var ML = md.logic, start = new Date(e.started_at);
        var end = e.ended_at ? new Date(e.ended_at) : new Date(start.getTime() + (Number(e.estimated_mins) || 30) * 60000);
        var from = start.getHours() * 60 + start.getMinutes();
        var to = Math.min(1440, from + Math.max(1, Math.round((end - start) / 60000)));
        var list = ML.overlapsFor(ML.iso(start), from, to, (e.details || {}).block_id);
        var step = function(i) { if (i >= list.length) { next(); return; } self.ui._askReplaced(e, list[i], to, function() { step(i + 1); }); };
        step(0);
      });
    },
    _askReplaced: function(e, b, afterMin, done) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, md = RPGACE.modules.myDay, ML = md.logic;
      var s = ML.toMin(b.start_time), m = Number(b.mins) || 30, label = ML.blockLabel(b);
      var pop = dd._popup({ title: 'Did this replace ' + label + '?', width: '440px' });
      pop.box.id = 'dn-replace';
      var p = document.createElement('div'); p.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
      p.textContent = '"' + e.title + '" overlaps ' + label + ' (' + ML.fmtMin(s) + '–' + ML.fmtMin(s + m) + ').';
      pop.box.appendChild(p);
      var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      pop.box.appendChild(row);
      var finish = function() { try { pop.close(); } catch (x) {} try { md.ui.render(); } catch (x) {} done(); };
      var fail = function(err) { RPGACE.utils.toast('⚠️ ' + (err.message || err), '#CC4A4A', 4000, 'doingNow'); };
      var yes = self.ui._btn('Yes, it replaced it', 'primary'); yes.id = 'dn-rep-yes';
      yes.onclick = function() {
        yes.disabled = true;
        ML.replaceBlock(b, e.id).then(function() { RPGACE.utils.toast('✓ ' + label + ' marked as replaced', 'var(--gold)', 2200); finish(); }, function(err) { yes.disabled = false; fail(err); });
      };
      var no = self.ui._btn('No', ''); no.id = 'dn-rep-no';
      no.onclick = function() {
        row.innerHTML = '';
        var mv = self.ui._btn('Move it later', 'primary'); mv.id = 'dn-rep-move';
        mv.onclick = function() {
          mv.disabled = true;
          ML.moveBlockAfter(b, afterMin).then(function(r) {
            RPGACE.utils.toast('⏭ ' + label + ' moved to ' + ML.fmtMin(r.at), 'var(--gold)', 2200);
            try { md.ui.undoToast(r.moved); } catch (x) {}
            finish();
          }, function(err) { mv.disabled = false; fail(err); });
        };
        var keep = self.ui._btn('Keep both', ''); keep.id = 'dn-rep-keep';
        keep.onclick = finish;
        row.appendChild(mv); row.appendChild(keep);
      };
      row.appendChild(yes); row.appendChild(no);
      return pop;
    },
    // Starting something, wherever it was picked (name form or drop list).
    // AC-3: opts = { startedAt, expect, details }. A live page opens straight
    // away (Cook Mode, gym logger, Study, Bookworm, or the block's focus timer);
    // beats and posts keep their "which one?" question.
    _afterStart: function(name, realms, recipes, opts) {
      var self = RPGACE.modules.doingNow, L = self.logic, md = RPGACE.modules.myDay;
      opts = opts || {};
      var m = L.liveKind(name, recipes);
      var fresh = !opts.startedAt || Date.now() - opts.startedAt < 2 * 60000;
      var fb = !m && fresh ? L.focusBlockNow(realms) : null;
      if (fb && md) {
        return md.logic.startFocus(fb).then(function(run) {
          var e = run && run.entryId ? self.ui._entry(run.entryId) : null;
          if (e && opts.details && opts.details.action_id) L.patch(e.id, { details: Object.assign({}, e.details || {}, opts.details) }).catch(function() {});
          RPGACE.utils.toast('⏱ ' + run.label + ' timer started', 'var(--gold)', 2200);
          try { md.ui._focusTick(); md.ui.render(); } catch (x) {}
          self.ui._refresh();
          return e;
        }, function() { return self.ui._startPlain(name, realms, recipes, opts, null); });
      }
      return self.ui._startPlain(name, realms, recipes, opts, m);
    },
    _startPlain: function(name, realms, recipes, opts, m) {
      var self = RPGACE.modules.doingNow, L = self.logic;
      var details = Object.assign({}, opts.details || {}, m ? { kind: m.kind } : {});
      var e = L.start(name, realms, opts.startedAt, { expect: opts.expect, details: details });
      RPGACE.utils.toast('▶ Started: ' + name, 'var(--gold)', 2000);
      self.ui._refresh();
      // AC-4: settle any planned block it covers first, then the live page.
      self.ui._checkBlocks(e, function() {
        if (m) self.ui.openLive(e, m, recipes);
        // BT-2: a Producer session asks which beat it is for.
        else if (realms.indexOf('producer') > -1 && RPGACE.modules.beatsHub) RPGACE.modules.beatsHub.ui.offerBeat(e);
        // PC-3: a Creator session asks which post it is for.
        else if (realms.indexOf('creator') > -1 && RPGACE.modules.postingHub) RPGACE.modules.postingHub.ui.offerPost(e);
      });
      return e;
    },
    // AC-3: open the activity's own page, no "Open it?" step.
    openLive: function(entry, m, recipes) {
      var self = RPGACE.modules.doingNow, ui = self.ui, M = RPGACE.modules;
      try { RPGACE.areaNav.closePopups(); } catch (x) {}
      if (m.kind === 'cook') return m.recipe ? ui.openCook(entry.id, m.recipe) : ui.offerLink(entry, m, recipes);
      if (m.kind === 'gym') return ui.openGym(entry.id);
      if (m.kind === 'study' && M.studyHub) return M.studyHub.open();
      if (m.kind === 'read' && M.bookworm) {
        return RPGACE.sb.select('bookworm_books', 'select=id,title&status=eq.in_progress&order=created_at.desc&limit=1').then(function(rows) {
          var b = rows && rows[0];
          if (b) M.bookworm.logic._openCurrentChapter(b.id);
          else RPGACE.utils.toast('📖 No book in progress in Bookworm', 'var(--muted)', 2200);
        }).catch(function() {});
      }
    },
    openStart: function() {
      var rt = RPGACE.modules.realmTasks;
      if (rt) { rt.ui.openLive(); return; } // DL-2: one page
      RPGACE.modules.doingNow.ui.openTyped();
    },
    // Something that isn't a task: name -> realm -> when -> start (Cook Mode / gym links kept). Live now's "Something else…".
    openTyped: function(presetRealm) {
      var self = RPGACE.modules.doingNow, L = self.logic;
      self.ui._nameForm('▶ Live now', false, function(name) {
        L.loadRecipes().then(function(recipes) {
          var m = L.matchKind(name, recipes);
          self.ui._pickRealms(name, m ? [L.KIND_REALM[m.kind]] : (presetRealm ? [presetRealm] : null)).then(function(realms) {
            self.ui._askWhen('now', name, 30, function(w) {
              self.ui._afterStart(name, realms, recipes, { startedAt: w.at, expect: w.mins });
            });
          });
        });
      });
    },
    // DN-3: cooking -> Cook Mode for a recipe; gym -> the gym logger with today's workout.
    offerLink: function(entry, m, recipes) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, ui = self.ui;
      var pop = dd._popup({ title: m.kind === 'cook' ? '🍳 Open Cook Mode?' : '🏋️ Open the gym logger?', width: '440px' });
      var wrap = document.createElement('div');
      wrap.id = 'dn-offer';
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var note = document.createElement('div');
      note.style.cssText = 'font-size:14px;color:var(--muted);';
      if (m.kind === 'cook') {
        note.textContent = 'Pick the recipe. When you finish it as an Actual cook, this activity stops and stays the one entry for today.';
        wrap.appendChild(note);
        var list = (m.recipe ? [m.recipe] : []).concat((recipes || []).filter(function(r) { return !m.recipe || r.id !== m.recipe.id; })).slice(0, 8);
        if (!list.length) {
          var none = document.createElement('div');
          none.style.cssText = 'font-size:14px;color:var(--text);';
          none.textContent = 'No saved recipes yet — make one in Cooking first.';
          wrap.appendChild(none);
        }
        list.forEach(function(r, i) {
          var b = ui._btn('▶ ' + r.title, i === 0 && m.recipe ? 'primary' : '');
          b.className = 'dn-offer-recipe';
          b.setAttribute('data-id', r.id);
          b.onclick = function() { pop.close(); ui.openCook(entry.id, r); };
          wrap.appendChild(b);
        });
      } else {
        note.textContent = 'Opens today\'s workout from your programme (or a blank log). Saving the session stops this activity and links them.';
        wrap.appendChild(note);
        var go = ui._btn('▶ Open gym logger', 'primary');
        go.id = 'dn-offer-gym';
        go.onclick = function() { pop.close(); ui.openGym(entry.id); };
        wrap.appendChild(go);
      }
      var no = ui._btn('Not now', '');
      no.id = 'dn-offer-no';
      no.onclick = function() { pop.close(); };
      wrap.appendChild(no);
      pop.box.appendChild(wrap);
      return pop;
    },
    _entry: function(id) { return RPGACE.modules.doingNow.logic.all().filter(function(x) { return x.id === id; })[0] || null; },
    openCook: function(entryId, recipe) {
      var self = RPGACE.modules.doingNow, L = self.logic, co = RPGACE.modules.cookingOracle;
      var e = self.ui._entry(entryId);
      if (!co || !co.ui.cookRecipeNow) { RPGACE.utils.toast('⚠️ Cooking is not loaded', '#CC4A4A', 3000, 'doingNow'); return; }
      if (!e) return;
      var link = { kind: 'recipes', id: String(recipe.id), title: recipe.title };
      L.patch(e.id, { details: Object.assign({}, e.details || {}, { link: link }) }).catch(function() {});
      co.ui.cookRecipeNow(recipe.id, {
        agendaId: e.id, startedAt: e.started_at,
        onActual: function(pcId) {
          L.linkFinish(e.id, { link: link, planned_cook_id: pcId }).then(function() {
            RPGACE.utils.toast('▶ "' + e.title + '" stopped with the cook', 'var(--gold)', 2200);
            self.ui._refresh();
          }, function(x) { RPGACE.utils.toast('⚠️ Could not stop "' + e.title + '": ' + (x.message || x), '#CC4A4A', 4000, 'doingNow'); });
        }
      });
    },
    openGym: function(entryId) {
      var self = RPGACE.modules.doingNow, L = self.logic, M = RPGACE.modules, gt = M.gymTracker, hb = M.healthBody;
      var e = self.ui._entry(entryId);
      if (!gt) { RPGACE.utils.toast('⚠️ Gym tracker is not loaded', '#CC4A4A', 3000, 'doingNow'); return; }
      if (!e) return;
      var safe = function(p) { return Promise.resolve(p).catch(function() { return null; }); };
      Promise.all([safe(hb && hb.logic.loadSettings ? hb.logic.loadSettings() : null), safe(gt.logic.load())]).then(function(r) {
        var prog = r[0] && r[0].programme, sessions = r[1] || [], rows = null;
        try { var w = prog && hb.logic.workoutOn(prog, hb.logic.iso()); if (w) rows = hb.logic.planRows(w, sessions); } catch (x) {}
        gt.ui.openLog(sessions, rows, function(row) {
          L.linkFinish(e.id, { link: { kind: 'gym_sessions', id: row && row.id ? String(row.id) : null, title: 'Gym session' } }).then(function() {
            self.ui._refresh();
          }, function(x) { RPGACE.utils.toast('⚠️ Could not stop "' + e.title + '": ' + (x.message || x), '#CC4A4A', 4000, 'doingNow'); });
        }, { minutes: Math.max(1, L.mins(e)) });
      });
    },
    openJustDid: function() {
      var rt = RPGACE.modules.realmTasks;
      if (rt) { rt.ui.openJustDid(); return; } // DL-3: the same retro form as Live now
      RPGACE.modules.doingNow.ui.openTypedDid();
    },
    openTypedDid: function() {
      var self = RPGACE.modules.doingNow;
      self.ui._nameForm('✓ I just did…', false, function(name) {
        self.ui._pickRealms(name).then(function(realms) { self.ui._didThen(name, realms, 30, {}); });
      });
    },
    openNote: function(entry) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow;
      var pop = dd._popup({ title: '📝 Note — ' + entry.title, width: '440px' });
      var ta = document.createElement('textarea');
      ta.id = 'dn-note'; ta.rows = 3; ta.maxLength = 500;
      ta.placeholder = 'Anything worth remembering?';
      ta.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
      var ok = self.ui._btn('Save note', 'primary');
      ok.id = 'dn-note-ok';
      ok.style.marginTop = '10px';
      ok.onclick = function() {
        var t = ta.value.trim();
        if (!t) { pop.close(); return; }
        ok.disabled = true;
        self.logic.addNote(entry, t).then(function() {
          pop.close(); RPGACE.utils.toast('📝 Note saved', 'var(--gold)', 1800); self.ui._refresh();
        }, function(e) {
          ok.disabled = false;
          RPGACE.utils.toast('⚠️ Note saved on this device only: ' + (e.message || e), '#CC4A4A', 4000, 'doingNow');
          self.ui._refresh();
        });
      };
      pop.box.appendChild(ta); pop.box.appendChild(ok);
    },
    _chips: function(id, options, multi) {
      var self = RPGACE.modules.doingNow;
      var row = document.createElement('div');
      row.id = id;
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      var picked = [];
      options.forEach(function(o) {
        var b = self.ui._btn(o.label, '');
        b.setAttribute('data-val', o.value);
        b.style.minWidth = '44px';
        b.onclick = function() {
          var i = picked.indexOf(o.value);
          if (i > -1) picked.splice(i, 1);
          else { if (!multi) picked = []; picked.push(o.value); }
          row.querySelectorAll('button').forEach(function(x) {
            var on = picked.indexOf(x.getAttribute('data-val')) > -1;
            x.style.background = on ? 'var(--gold)' : 'none';
            x.style.color = on ? '#111' : 'var(--text)';
          });
        };
        row.appendChild(b);
      });
      row._get = function() { return multi ? picked.slice() : (picked[0] || null); };
      return row;
    },
    _label: function(text) {
      var l = document.createElement('div');
      l.style.cssText = 'font-size:13px;color:var(--muted);font-weight:700;margin-top:6px;';
      l.textContent = text;
      return l;
    },
    // Short by default: how it went + mood. "+ more details" opens the rest.
    openStop: function(entry) {
      var dd = RPGACE.modules.dashDeck, self = RPGACE.modules.doingNow, L = self.logic, ui = self.ui;
      var mins = entry.completed ? (entry.actual_mins || 0) : L.mins(entry);
      var pop = dd._popup({ title: '■ ' + entry.title + ' · ' + L.fmt(mins), width: '520px' });
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      var fieldCss = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
      wrap.appendChild(ui._label('How did it go?'));
      var how = document.createElement('textarea');
      how.id = 'dn-how'; how.rows = 2; how.maxLength = 600; how.style.cssText = fieldCss;
      wrap.appendChild(how);
      wrap.appendChild(ui._label('Mood after'));
      var mood = ui._chips('dn-mood', self.MOODS.map(function(e, i) { return { label: e, value: String(i + 1) }; }), false);
      wrap.appendChild(mood);

      var more = document.createElement('div');
      more.id = 'dn-more';
      more.style.cssText = 'display:none;flex-direction:column;gap:6px;border-top:1px solid var(--border);margin-top:8px;padding-top:6px;';
      var moreBtn = document.createElement('button');
      moreBtn.type = 'button'; moreBtn.id = 'dn-more-btn';
      moreBtn.textContent = '+ more details';
      moreBtn.style.cssText = 'align-self:flex-start;min-height:44px;background:none;border:none;color:var(--gold);font-size:14px;font-weight:700;cursor:pointer;padding:8px 0;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(moreBtn);
      wrap.appendChild(more);

      // Filled lazily the first time "+ more details" opens.
      var parts = {};
      moreBtn.onclick = function() {
        var open = more.style.display === 'none';
        more.style.display = open ? 'flex' : 'none';
        moreBtn.textContent = open ? '− fewer details' : '+ more details';
        if (!open || parts.built) return;
        parts.built = true;
        more.appendChild(ui._label('📷 Photo'));
        parts.photo = document.createElement('input');
        parts.photo.type = 'file'; parts.photo.accept = 'image/*'; parts.photo.id = 'dn-photo';
        more.appendChild(parts.photo);
        more.appendChild(ui._label('👥 Who with'));
        parts.whoBox = document.createElement('div');
        parts.whoBox.textContent = 'Loading your People…';
        parts.whoBox.style.cssText = 'font-size:13px;color:var(--muted);';
        more.appendChild(parts.whoBox);
        var tp = RPGACE.modules.tripPlans;
        (tp ? tp.logic.read('people', 'select=id,name&order=name.asc') : Promise.resolve([])).then(function(people) {
          parts.people = people || [];
          parts.whoBox.innerHTML = '';
          if (!parts.people.length) { parts.whoBox.textContent = 'No People saved yet.'; return; }
          parts.who = ui._chips('dn-who', parts.people.map(function(p) { return { label: p.name, value: String(p.id) }; }), true);
          parts.whoBox.appendChild(parts.who);
        }, function() { parts.whoBox.textContent = 'People could not load.'; });
        more.appendChild(ui._label('📍 Where'));
        parts.place = document.createElement('input');
        parts.place.id = 'dn-place'; parts.place.type = 'text'; parts.place.maxLength = 120;
        parts.place.style.cssText = fieldCss; parts.place.value = entry.place || '';
        more.appendChild(parts.place);
        more.appendChild(ui._label('💷 Money spent (£)'));
        parts.money = document.createElement('input');
        parts.money.id = 'dn-money'; parts.money.type = 'number'; parts.money.min = '0'; parts.money.step = '0.01'; parts.money.inputMode = 'decimal';
        parts.money.style.cssText = fieldCss;
        more.appendChild(parts.money);
        more.appendChild(ui._label('🔗 What it was for'));
        parts.link = document.createElement('select');
        parts.link.id = 'dn-link'; parts.link.style.cssText = fieldCss;
        parts.link.innerHTML = '<option value="">Nothing / loading…</option>';
        more.appendChild(parts.link);
        L.loadLinks().then(function(items) {
          parts.links = items;
          parts.link.innerHTML = '<option value="">Nothing</option>';
          items.forEach(function(it, i) {
            var o = document.createElement('option');
            o.value = String(i); o.textContent = it.icon + ' ' + it.title;
            parts.link.appendChild(o);
          });
        });
        more.appendChild(ui._label('Would you do it again?'));
        parts.again = ui._chips('dn-again', self.AGAIN.map(function(a) { return { label: a[1], value: a[0] }; }), false);
        more.appendChild(parts.again);
        more.appendChild(ui._label('Effort (1 easy – 5 hard)'));
        parts.effort = ui._chips('dn-effort', [1, 2, 3, 4, 5].map(function(n) { return { label: String(n), value: String(n) }; }), false);
        more.appendChild(parts.effort);
      };

      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;';
      wrap.appendChild(err);
      var save = ui._btn(entry.completed ? 'Save' : '■ Stop & save', 'primary');
      save.id = 'dn-save';
      save.style.marginTop = '8px';
      save.onclick = function() {
        var m = mood._get();
        var form = { how: how.value.trim(), mood: m ? Number(m) : null };
        if (parts.built) {
          var whoIds = parts.who ? parts.who._get() : [];
          form.who = (parts.people || []).filter(function(p) { return whoIds.indexOf(String(p.id)) > -1; }).map(function(p) { return { id: p.id, name: p.name }; });
          form.place = parts.place.value.trim();
          var amt = Number(parts.money.value);
          if (amt > 0) form.money = { amount: Math.round(amt * 100) / 100, category: 'Personal' };
          var li = parts.link.value;
          if (li !== '' && parts.links && parts.links[Number(li)]) {
            var lk = parts.links[Number(li)];
            form.link = { kind: lk.kind, id: lk.id, title: lk.title };
          }
          form.again = parts.again._get();
          var ef = parts.effort._get();
          form.effort = ef ? Number(ef) : null;
        }
        save.disabled = true; save.textContent = 'Saving…';
        var file = parts.photo && parts.photo.files && parts.photo.files[0];
        var si = RPGACE.modules.screenshotInbox;
        var photoP = (file && si) ? si.logic.upload(file, 'proof', entry.realms || []).then(function(r) {
          return r && r.row && r.row.storage_path ? r.row.storage_path : null;
        }, function(e) { return { failed: 'photo: ' + (e.message || e) }; }) : Promise.resolve(null);
        photoP.then(function(ph) {
          var photoFail = ph && ph.failed;
          if (ph && !photoFail) form.photo = ph;
          return L.finish(entry, form).then(function(res) {
            pop.close();
            var fails = res.failed.concat(photoFail ? [photoFail] : []);
            if (fails.length) RPGACE.utils.toast('⚠️ Saved, but some extras failed: ' + fails.join('; '), '#CC4A4A', 5000, 'doingNow');
            else RPGACE.utils.toast('✓ Logged: ' + entry.title, 'var(--gold)', 2200);
            ui._refresh();
            // BT-2: other areas react to a finished activity (Beats asks "Ready to mix?").
            var done = L.all().filter(function(x) { return x.id === entry.id; })[0] || entry;
            RPGACE.hooks.fire('doingnow:finished', done);
          });
        }).catch(function(e) {
          save.disabled = false; save.textContent = 'Try again';
          err.textContent = 'Could not save to the server: ' + (e.message || e) + ' (kept on this device).';
          err.style.display = 'block';
          ui._refresh();
        });
      };
      wrap.appendChild(save);
      pop.box.appendChild(wrap);
      return pop;
    }
  },

  init: function() {
    var self = RPGACE.modules.doingNow;
    var syncCheck = function() {
      return self.logic.sync().then(function(rows) { if (rows.length) self.ui._refresh(); return self.ui.check(); });
    };
    RPGACE.hooks.on('page:show', function(name) { if (name === 'quests') syncCheck(); });
    if (RPGACE.registerBootTask) RPGACE.registerBootTask(function() { return syncCheck(); });
    // DN-2: coming back to the app is when a forgotten timer gets caught.
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && RPGACE.sb && RPGACE.sb.select) syncCheck();
    });
  }
});
/* ===END:doingNow=== */
