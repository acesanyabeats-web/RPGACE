
/* ===MODULE:realmTasks=== */
// Realm Tasks (Oct 27 2026, plan "Realm Tasks Oct 27", record
// records/2026-10/realm_tasks_ceo_2026-10-27.txt). One task pool per realm
// (private realm_tasks + realm_task_types). Alex: "i choice picker when im in
// the block so i can choose what to do, so i focus on types of tasks in the
// space of time rather than each task individually" ... "a way to make tasks
// appear when a video or post is shared ... this should always go through
// /deduplication". Every insert is deduplicated by the realm_tasks_dedup
// trigger in the database (same title -> merged, sources kept); videos,
// journal lines and Library saves feed the inbox from database triggers.
// The 52 activities Alex picked Oct 13 (old myDay.REALM_ACTIVITIES) are kept
// rows; 175 more are proposals he keeps or drops. ▶ Live now is the page a
// realm block runs on: pick a type, its top 3 tasks, Done ticks it into the
// block (the block's existing XP rules), then pick the next.
RPGACE.register('realmTasks', {
  domain: 'schedule',
  _types: null,
  _tasks: null,
  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(function() {
      // Once loaded, redraw the dashboard so its 📥 / ▶ rows appear.
      self.logic.load().then(function() { var dd = RPGACE.modules.dashDeck; if (dd && dd._refreshGlance) dd._refreshGlance(); }).catch(function() {});
    }, 2000); });
    // A realm block's ▶ Start opens Live now (Alex: "Opens when a block starts").
    RPGACE.hooks.on('myday:block-start', function(b) { if (b && (b.kind === 'realm' || b.realm)) setTimeout(function() { self.ui.openLive(); }, 50); });
    // DL-4: any finished cook (Cook Mode, a cooking block, an unplanned cook, a typed one) loads its follow-ups.
    RPGACE.hooks.on('cook:finished', function(d) {
      self.logic.load().then(function() { return self.logic.afterDone(null, 'cook', d && d.at, true); }).then(function(list) {
        if (list && list.length) RPGACE.utils.toast('⏭ Next: ' + list.map(function(x) { return x.title; }).join(', '), 'var(--gold)', 3500);
      }).catch(function() {});
    });
    RPGACE.areaNav.onPageShow('live', function() { self.ui.openLive(); });
  },
  logic: {
    read: function(table, params) { return RPGACE.modules.tripPlans.logic.read(table, params); },
    load: function(force) {
      var self = RPGACE.modules.realmTasks, L = self.logic;
      if (!force && self._tasks && Date.now() - (self._at || 0) < 60000) return Promise.resolve(self._tasks);
      return Promise.all([
        L.read('realm_task_types', 'select=*&order=realm.asc,sort.asc'),
        L.read('realm_tasks', 'select=*&status=in.(kept,inbox,proposed)&order=created_at.asc&limit=2000'),
      ]).then(function(r) {
        self._types = Array.isArray(r[0]) ? r[0] : [];
        self._tasks = Array.isArray(r[1]) ? r[1] : [];
        self._at = Date.now();
        RPGACE.hooks.fire('realmTasks:loaded', self._tasks);
        return self._tasks;
      });
    },
    types: function(realm) { return (RPGACE.modules.realmTasks._types || []).filter(function(t) { return t.realm === realm; }); },
    typeOf: function(realm, key) { return RPGACE.modules.realmTasks.logic.types(realm).filter(function(t) { return t.key === key; })[0] || null; },
    // A repeatable rests rest_days after it was done; a one-off retires. Pure.
    resting: function(t, now) {
      if (!t || t.kind !== 'repeat' || !t.last_done_at) return false;
      return (now || Date.now()) < new Date(t.last_done_at).getTime() + (Number(t.rest_days) || 0) * 86400000;
    },
    // Kept tasks of one type, best first: not resting, never done, least done, shortest. Pure.
    rank: function(tasks, realm, typeKey, now) {
      var L = RPGACE.modules.realmTasks.logic;
      return (tasks || []).filter(function(t) { return t.status === 'kept' && t.realm === realm && (!typeKey || t.type_key === typeKey); })
        .map(function(t) { return { t: t, rest: L.resting(t, now) ? 1 : 0 }; })
        .sort(function(a, b) { return (a.rest - b.rest) || ((a.t.done_count || 0) - (b.t.done_count || 0)) || ((a.t.mins || 30) - (b.t.mins || 30)) || String(a.t.title).localeCompare(b.t.title); })
        .map(function(x) { return Object.assign({}, x.t, { _resting: !!x.rest }); });
    },
    // Types for a realm, the block's chosen ones first, then the one left
    // longest (Alex: "i pick a main agenda - if done can always pick more"). Pure.
    orderTypes: function(types, tasks, agenda) {
      var last = {};
      (tasks || []).forEach(function(t) { if (t.last_done_at && (!last[t.type_key] || t.last_done_at > last[t.type_key])) last[t.type_key] = t.last_done_at; });
      agenda = agenda || [];
      return (types || []).slice().sort(function(a, b) {
        var ia = agenda.indexOf(a.key), ib = agenda.indexOf(b.key);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return String(last[a.key] || '').localeCompare(String(last[b.key] || '')) || (a.sort - b.sort);
      });
    },
    inbox: function() { return (RPGACE.modules.realmTasks._tasks || []).filter(function(t) { return t.status === 'inbox'; }); },
    // GM-1/2 (Oct 27 2026, plan "Generic Missions"): a mission is a generic task
    // with a context_kind; what it is about this time (a recipe, an exercise
    // combo, a reference track, a post idea or a typed card) is a context card in
    // private mission_contexts, picked when the block is planned.
    CONTEXT_KINDS: { recipe: '🍳 a recipe', combo: '🏋️ an exercise combo', reference: '🎧 a reference track or beat idea', post: '📣 a post idea', card: '🗂 a card' },
    isMission: function(t) { return !!(t && t.context_kind); },
    missions: function(realm) { return (RPGACE.modules.realmTasks._tasks || []).filter(function(t) { return t.realm === realm && t.context_kind && t.status === 'kept'; }); },
    loadContexts: function(missionId) {
      var tp = RPGACE.modules.tripPlans;
      if (!tp) return Promise.resolve([]);
      return tp.logic.read('mission_contexts', 'select=*&status=eq.kept' + (missionId ? '&mission_id=eq.' + missionId : '') + '&order=times_done.asc,created_at.desc')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    // Untried first, then least done; never more than one row per title.
    rankContexts: function(rows) {
      var seen = {};
      return (rows || []).filter(function(c) { var k = String(c.title || '').toLowerCase(); if (!k || seen[k]) return false; seen[k] = 1; return c.status !== 'dropped'; })
        .sort(function(a, b) { return (a.times_done || 0) - (b.times_done || 0) || String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    },
    addContext: function(m, row) {
      var title = String(row.title || '').trim().slice(0, 140);
      if (!m || !m.id) return Promise.reject(new Error('Pick a mission first'));
      if (!title) return Promise.reject(new Error('Give it a name'));
      var clean = { mission_id: m.id, realm: m.realm, title: title, detail: row.detail ? String(row.detail).slice(0, 1000) : null,
        source: ['video', 'generated', 'typed', 'starter', 'picked'].indexOf(row.source) >= 0 ? row.source : 'typed', source_ref: row.source_ref || null, recipe_id: row.recipe_id ? String(row.recipe_id) : null };
      return RPGACE.sb.secureWrite('mission_contexts', 'insert', clean).then(function(d) { RPGACE.cache.clear('mission_contexts'); return Array.isArray(d) ? d[0] : clean; });
    },
    // GM-3: specific inbox tasks in the mission realms are filed under a
    // generic mission as a context card (cheap model, ~10 per call); only a
    // task no mission fits proposes a new generic mission, which lands in the
    // inbox for review. Filed tasks keep their row (status filed, dup_of =
    // mission). Alex's own Actions are never filed.
    // GM-7 (Oct 28 2026): where a mission's context can be picked from Alex's
    // own data (no model call). combo -> exerciseLibrary.ui.pickCombo;
    // reference/post -> pickList over these rows. One registry so the other
    // realms (plan Missions Across Realms, MR-3) add a kind here, not a 2nd picker.
    CONTEXT_SOURCES: {
      combo: { label: '🏋️ Build a combo' },
      reference: { label: '🎧 Pick a reference track', empty: 'No reference tracks or beat ideas yet.' },
      post: { label: '💡 Pick a post idea', empty: 'No post ideas in your Idea Bank yet. Add some in 💡 Ideas, or type one above.' }
    },
    sourceItems: function(kind) {
      var sel = function(t, q) { return RPGACE.sb.select(t, q).then(function(r) { return Array.isArray(r) ? r : []; }).catch(function() { return []; }); };
      var pot = function(k) { return function(r) { return r.filter(function(x) { return x.kind === k && ['merged', 'done', 'dropped', 'archived'].indexOf(x.status) < 0; })
        .sort(function(a, b) { return (b.starred ? 1 : 0) - (a.starred ? 1 : 0); })
        .map(function(x) { return { title: String(x.title || x.idea_text || 'Idea').slice(0, 140), detail: x.idea_text || null, sub: (x.starred ? '⭐ ' : '') + (k === 'beat' ? 'beat idea' : 'post idea'), ref: 'conid_pot:' + x.id }; }); }; };
      if (kind === 'reference') return Promise.all([
        sel('reference_tracks', 'select=id,artist,title,bpm,key,scale,genre&order=created_at.desc&limit=200').then(function(r) {
          return r.map(function(x) { return { title: [x.artist, x.title].filter(Boolean).join(' – ').slice(0, 140) || 'Reference track', detail: null,
            sub: [x.bpm ? x.bpm + ' bpm' : '', [x.key, x.scale].filter(Boolean).join(' '), x.genre].filter(Boolean).join(' · ') || 'reference track', ref: 'reference_tracks:' + x.id }; });
        }),
        sel('conid_pot', 'select=id,title,idea_text,kind,status,starred&kind=eq.beat&order=created_at.desc&limit=50').then(pot('beat'))
      ]).then(function(r) { return r[1].filter(function(x) { return /⭐/.test(x.sub); }).concat(r[0]); });
      if (kind === 'post') return sel('conid_pot', 'select=id,title,idea_text,kind,status,starred&kind=eq.post&order=created_at.desc&limit=50').then(pot('post'));
      return Promise.resolve([]);
    },
    MISSION_REALMS: ['chef', 'athlete', 'producer', 'creator'],
    DEFAULT_KIND: { chef: 'recipe', athlete: 'combo', producer: 'card', creator: 'card' },
    fileable: function() {
      var self = RPGACE.modules.realmTasks;
      return (self._tasks || []).filter(function(t) {
        var src = (Array.isArray(t.sources) && t.sources[0] && t.sources[0].table) || '';
        return t.status === 'inbox' && !t.context_kind && self.logic.MISSION_REALMS.indexOf(t.realm) >= 0 && src !== 'routines' && src !== 'myday';
      });
    },
    // Never trust model JSON: keep only in-range numbers and short strings.
    sanitizeFiling: function(j, nTasks, nMissions) {
      var seen = {};
      return ((j && Array.isArray(j.items)) ? j.items : []).map(function(x) {
        x = x || {}; var t = parseInt(x.t, 10), m = parseInt(x.m, 10);
        if (!(t >= 1 && t <= nTasks) || seen[t]) return null;
        var card = String(x.card || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        var nw = String(x['new'] || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (m >= 1 && m <= nMissions) { seen[t] = 1; return { t: t, m: m, card: card }; }
        if (nw.length >= 3) { seen[t] = 1; return { t: t, nw: nw, card: card }; }
        return null;
      }).filter(Boolean);
    },
    fileInbox: function() {
      var self = RPGACE.modules.realmTasks, L = self.logic, pp = RPGACE.modules.phylumPath;
      if (self._filing) return self._filing;
      var todo = L.fileable();
      if (!todo.length || !pp) return Promise.resolve(0);
      var byRealm = {};
      todo.forEach(function(t) { (byRealm[t.realm] = byRealm[t.realm] || []).push(t); });
      var batches = [];
      Object.keys(byRealm).forEach(function(r) { for (var i = 0; i < byRealm[r].length; i += 10) batches.push({ realm: r, tasks: byRealm[r].slice(i, i + 10) }); });
      var filed = 0;
      var one = function(b) {
        var ms = (self._tasks || []).filter(function(t) { return t.realm === b.realm && t.context_kind && (t.status === 'kept' || t.status === 'inbox'); });
        var R = RPGACE.modules.xpSeason && RPGACE.modules.xpSeason.REALMS[b.realm];
        var prompt = RPGACE.prompt('mission_file', { realm: R ? R.name : b.realm,
          missions: ms.map(function(m, i) { return (i + 1) + '. ' + m.title; }).join('\n') || '(none yet)',
          tasks: b.tasks.map(function(t, i) { return (i + 1) + '. ' + t.title + (t.notes ? ': ' + String(t.notes).slice(0, 200) : ''); }).join('\n') });
        return pp._callGroundWorkerJSON(prompt, 700, pp.MECHANICAL_MODEL).then(function(j) {
          var items = L.sanitizeFiling(j, b.tasks.length, ms.length), made = {};
          return items.reduce(function(p, it) {
            return p.then(function() {
              var task = b.tasks[it.t - 1];
              var getM = it.m ? Promise.resolve(ms[it.m - 1]) : (made[it.nw.toLowerCase()] ? Promise.resolve(made[it.nw.toLowerCase()]) :
                RPGACE.sb.secureWrite('realm_tasks', 'insert', { realm: b.realm, type_key: task.type_key || null, title: it.nw, kind: 'repeat', mins: 30, earns: 'xp', xp: 20, status: 'inbox',
                  context_kind: L.DEFAULT_KIND[b.realm] || 'card', sources: [{ table: 'mission_filing', ref: String(task.id), label: 'new mission' }] })
                  .then(function(d) {
                    var row = Array.isArray(d) && d[0];
                    if (row) { made[it.nw.toLowerCase()] = row; return row; }
                    // realm_tasks_dedup merged it into an existing task: use that one.
                    return L.load(true).then(function() {
                      var want = it.nw.toLowerCase();
                      var hit = (self._tasks || []).filter(function(x) { return x.realm === b.realm && String(x.title).toLowerCase() === want; })[0] || null;
                      if (hit) made[want] = hit;
                      return hit;
                    });
                  }));
              return getM.then(function(m) {
                if (!m) return; // nothing to file under; the task stays in the inbox
                var ref = (Array.isArray(task.sources) && task.sources[0] && task.sources[0].ref) || String(task.id);
                return L.addContext(m, { title: it.card || task.title, detail: task.notes, source: 'video', source_ref: ref })
                  .then(function() { return L.update(task, { status: 'filed', dup_of: m.id }); })
                  .then(function() { filed++; });
              });
            });
          }, Promise.resolve());
        });
      };
      self._filing = batches.reduce(function(p, b) { return p.then(function() { return one(b); }); }, Promise.resolve())
        .then(function() { RPGACE.cache.clear('realm_tasks'); return L.load(true); })
        .then(function() { self._filing = null; return filed; },
              function(e) { self._filing = null; RPGACE.utils.toast('⚠️ Filing new tasks under missions failed: ' + (e.message || e), '#CC4A4A', 4000, 'realmTasks'); return filed; });
      return self._filing;
    },
    loadContext: function(id) {
      var tp = RPGACE.modules.tripPlans;
      if (!id || !tp) return Promise.resolve(null);
      return tp.logic.read('mission_contexts', 'select=*&id=eq.' + id + '&limit=1').then(function(r) { return (r && r[0]) || null; });
    },
    // GM-8: Done in Live now adds 1 to the planned card's "done N times".
    contextDoneById: function(id) {
      var L = RPGACE.modules.realmTasks.logic;
      return L.loadContext(id).then(function(c) { return c ? L.contextDone(c) : null; });
    },
    // The block item a task was planned as (Plan block 'activity' or Live now 'task'), not yet done.
    plannedItem: function(t, b) {
      return b ? (b.items || []).filter(function(i) { return (i.src === 'task' || i.src === 'activity') && String(i.ref_id) === String(t.id) && !i.done; })[0] || null : null;
    },
    contextDone: function(c) {
      if (!c || !c.id) return Promise.resolve();
      return RPGACE.sb.secureWrite('mission_contexts', 'update', { times_done: (Number(c.times_done) || 0) + 1, last_done_at: new Date().toISOString() }, 'id=eq.' + c.id)
        .then(function() { c.times_done = (Number(c.times_done) || 0) + 1; RPGACE.cache.clear('mission_contexts'); });
    },
    proposed: function(realm) { return (RPGACE.modules.realmTasks._tasks || []).filter(function(t) { return t.status === 'proposed' && (!realm || t.realm === realm); }); },
    // Kept tasks shaped like the old REALM_ACTIVITIES entries (for realm
    // ideas, Plan block, the realm brief). Sync, from the loaded pool.
    activities: function(realm) {
      return (RPGACE.modules.realmTasks._tasks || []).filter(function(t) { return t.status === 'kept' && t.realm === realm; })
        .map(function(t) { return { key: t.id, title: t.title, mins: t.mins || 30, earns: t.earns === 'real' || t.earns === 'xp' ? t.earns : 'tick', xp: t.earns === 'xp' && t.xp ? Number(t.xp) : null, how: t.how || null, opens: t.opens || null, type: t.type_key || null, context_kind: t.context_kind || null }; });
    },
    // One tapped idea (a video's quest, a realm suggestion, an idea card):
    // the matching task is kept, or a kept task is added (dedup merges).
    keepIdea: function(idea) {
      var self = RPGACE.modules.realmTasks, L = self.logic;
      var norm = function(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
      return L.load(true).then(function() {
        var want = norm(idea.title).slice(0, 120);
        var t = (self._tasks || []).filter(function(x) { return norm(x.title) === want; })[0];
        if (t) return t.status === 'kept' ? t : L.update(t, { status: 'kept', dup_of: null });
        return L.add({ realm: idea.realm, title: idea.title, notes: idea.notes, kind: idea.kind || 'once', earns: idea.xp ? 'xp' : 'tick', xp: idea.xp || null, status: 'kept', sources: idea.source ? [idea.source] : [] });
      });
    },
    // "⭐ Create · Finish & mix" for a block with main types; '' otherwise.
    typeLine: function(b) {
      var L = RPGACE.modules.realmTasks.logic;
      if (!b || b.kind !== 'realm' || !Array.isArray(b.types) || !b.types.length) return '';
      return '⭐ ' + b.types.map(function(k) { var t = L.typeOf(b.realm, k); return t ? t.label : k; }).join(' · ');
    },
    activityMap: function() {
      var L = RPGACE.modules.realmTasks.logic, xs = RPGACE.modules.xpSeason, out = {};
      (xs ? xs.ORDER : []).forEach(function(k) { out[k] = L.activities(k); });
      return out;
    },
    // Every new task goes through the database's dedup trigger.
    add: function(row) {
      var self = RPGACE.modules.realmTasks, xs = RPGACE.modules.xpSeason;
      var title = String(row.title || '').trim().slice(0, 120);
      if (!title) return Promise.reject(new Error('Give the task a name'));
      if (!row.realm || !(xs && xs.REALMS[row.realm])) return Promise.reject(new Error('Pick a realm'));
      var clean = { realm: row.realm, type_key: row.type_key || null, title: title, notes: row.notes ? String(row.notes).slice(0, 500) : null,
        kind: row.kind === 'once' ? 'once' : 'repeat', mins: Math.max(5, Math.min(480, parseInt(row.mins, 10) || 30)),
        earns: row.earns === 'real' || row.earns === 'xp' ? row.earns : 'tick', xp: row.xp || null, opens: row.opens || null,
        status: row.status === 'kept' ? 'kept' : 'inbox', sources: Array.isArray(row.sources) ? row.sources : [] };
      return RPGACE.sb.secureWrite('realm_tasks', 'insert', clean).then(function() { RPGACE.cache.clear('realm_tasks'); return self.logic.load(true); });
    },
    update: function(t, patch) {
      return RPGACE.sb.secureWrite('realm_tasks', 'update', patch, 'id=eq.' + t.id).then(function() {
        Object.assign(t, patch); RPGACE.cache.clear('realm_tasks'); return t;
      });
    },
    // A task finished: a one-off retires; a repeatable rests.
    markDone: function(t) {
      var patch = { last_done_at: new Date().toISOString(), done_count: (Number(t.done_count) || 0) + 1 };
      if (t.kind === 'once') patch.status = 'done';
      if (t.next_due_at) { patch.next_due_at = null; patch.next_after = null; } // DL-5: a done follow-up is no longer due
      return RPGACE.modules.realmTasks.logic.update(t, patch);
    },
    // The task whose sources include this table/ref (e.g. a video idea).
    bySource: function(table, ref) {
      return (RPGACE.modules.realmTasks._tasks || []).filter(function(t) { return (t.sources || []).some(function(s) { return s.table === table && String(s.ref) === String(ref); }); })[0] || null;
    },
    srcLabel: function(t) {
      var s = (t.sources || []).filter(function(x) { return x.table !== 'catalogue' && x.table !== 'realm_activities'; })[0];
      if (!s) return '';
      var from = { intel_reports: '🎬 from video', journal: '📓 from journal', library_items: '📚 from Library', oracle: '🔮 from Oracle', realm_suggest: '✨ suggested', idea_card: '💡 from idea card', bookworm: '📖 from book' }[s.table] || 'from ' + s.table;
      return from + (s.label ? ': ' + s.label : '') + ((t.sources || []).length > 1 ? ' (+' + ((t.sources || []).length - 1) + ' more)' : '');
    },
    // The running realm block (myDay focus run) and its chore_blocks row.
    liveBlock: function() {
      var md = RPGACE.modules.myDay, run = md && md.logic.focusRun();
      if (!run) return null;
      var b = (md._choreBlocks || []).filter(function(x) { return String(x.id) === String(run.blockId); })[0] || null;
      return { run: run, block: b };
    },
    // Done inside a block: the task becomes a ticked item on the block, so
    // the block's own XP rules pay (Alex: "Keep current rules"): +10 for a
    // plain task, nothing extra for one whose real action pays.
    doneInBlock: function(t, b) {
      var md = RPGACE.modules.myDay, L = RPGACE.modules.realmTasks.logic;
      var p = Promise.resolve();
      if (b) {
        var items = (b.items || []).slice(), idx = -1;
        // GM-8: Plan block saves realm tasks as src 'activity' - match those too, not just Live-now 'task' items.
        items.forEach(function(i, k) { if (idx === -1 && (i.src === 'task' || i.src === 'activity') && String(i.ref_id) === String(t.id) && !i.done) idx = k; });
        var ctxId = idx >= 0 ? items[idx].context_id : null;
        // GM-8: the task's own fixed XP pays (blocks planned before Oct 28 saved it as a flat tick).
        if (idx >= 0 && t.earns === 'xp' && t.xp && (items[idx].earns !== 'xp' || Number(items[idx].xp) !== Number(t.xp))) {
          items[idx] = Object.assign({}, items[idx], { earns: 'xp', xp: Number(t.xp) });
          p = RPGACE.sb.secureWrite('chore_blocks', 'update', { items: items }, 'id=eq.' + b.id).then(function() { b.items = items; });
        }
        if (idx === -1) {
          items.push({ src: 'task', ref_id: String(t.id), label: t.title, mins: t.mins || 30, earns: t.earns || 'tick', xp: t.xp || null, how: t.how || null, opens: t.opens || null, type: t.type_key || null });
          idx = items.length - 1;
          p = RPGACE.sb.secureWrite('chore_blocks', 'update', { items: items }, 'id=eq.' + b.id).then(function() { b.items = items; });
        }
        p = p.then(function() { return md.logic.setBlockItem(b, idx, true); });
        if (ctxId) p = p.then(function() { return L.contextDoneById(ctxId).catch(function(e) { console.warn('[realmTasks] card count not saved:', e.message); }); });
      } else {
        // DR-3 (Oct 27 2026, Alex: "Its realm's XP, wherever ticked"): outside a
        // block the tick is one completed quest_log ledger row; the existing
        // xp_on_change trigger pays it to the task's realm (quest_done). A
        // 'real' task records the tick with 0 XP - its real action pays.
        p = RPGACE.sb.secureWrite('quest_log', 'insert', L.ledgerRow(t));
      }
      return p.then(function() { return L.markDone(t); });
    },
    // DL-3 (Oct 28 2026, plan "Day Log & Live Now"): any two of start / end /
    // minutes give all three (ms). Only minutes = it ended now. Pure.
    solveTimes: function(o, now) {
      now = now == null ? Date.now() : now;
      var s = o.start != null && o.start !== '' ? Number(o.start) : null, e = o.end != null && o.end !== '' ? Number(o.end) : null;
      var m = o.mins != null && o.mins !== '' ? Math.round(Number(o.mins)) : null;
      if (m != null && !(m > 0)) m = null;
      if (s != null && e != null) m = Math.round((e - s) / 60000);
      else if (e != null && m != null) s = e - m * 60000;
      else if (s != null && m != null) e = s + m * 60000;
      else if (m != null) { e = now; s = e - m * 60000; }
      else return { error: 'Give two of: when you started, when you finished, how long.' };
      if (!(m > 0)) return { error: 'The finish has to be after the start.' };
      if (m > 720) return { error: 'That is over 12 hours - check the times.' };
      if (e > now + 60000) return { error: 'That finishes in the future.' };
      return { start: s, end: e, mins: m };
    },
    // DL-1: with no block running, ▶ Start opens a timed Live now entry (Doing
    // Now's store, so My Day's timeline draws it); the task's own tick pays the
    // XP (xp_on_doing_now skips entries with details.task_id).
    freeStart: function(t, realm) {
      var dn = RPGACE.modules.doingNow;
      if (!dn || !t) return null;
      return dn.logic.start(t.title, [t.realm || realm], null, { expect: t.mins || 30, details: { task_id: String(t.id) } });
    },
    freeEntry: function(id) {
      var dn = RPGACE.modules.doingNow;
      return id && dn ? dn.logic.all().filter(function(x) { return x.id === id; })[0] || null : null;
    },
    freeDone: function(t, entryId) {
      var L = RPGACE.modules.realmTasks.logic, dn = RPGACE.modules.doingNow, e = L.freeEntry(entryId), now = Date.now();
      return L.doneInBlock(t, null).then(function() {
        if (!e || e.completed) return null;
        return dn.logic.patch(e.id, { completed: true, ended_at: new Date(now).toISOString(), actual_mins: Math.max(1, Math.round((now - new Date(e.started_at).getTime()) / 60000)) })
          .then(function(hit) { try { dn.ui._checkBlocks(hit || e); } catch (x) {} return hit; }); // BT-2: covering a planned block? ask
      });
    },
    freeDiscard: function(entryId) {
      var L = RPGACE.modules.realmTasks.logic, e = L.freeEntry(entryId);
      return e && !e.completed ? RPGACE.modules.doingNow.logic.discard(e).catch(function() {}) : Promise.resolve();
    },
    // DL-3: a finished block written back in the timeline; a task is ticked at
    // its real finish time (XP once). A typed one pays like any Live now entry.
    retro: function(t, name, realm, times) {
      var L = RPGACE.modules.realmTasks.logic, dn = RPGACE.modules.doingNow;
      if (!dn) return Promise.reject(new Error('Live now is not loaded'));
      var title = t ? t.title : String(name || '').trim().slice(0, 80);
      if (!title) return Promise.reject(new Error('Pick a task or type what you did.'));
      var e = dn.logic.justDid(title, times.mins, [t ? t.realm : (realm || 'life')], times.end, { details: t ? { task_id: String(t.id) } : {} });
      if (!t) return Promise.resolve(e);
      var row = L.ledgerRow(t); row.completed_at = new Date(times.end).toISOString();
      return RPGACE.sb.secureWrite('quest_log', 'insert', row).then(function() { RPGACE.cache.clear('quest_log'); return L.markDone(t); }).then(function() { return e; });
    },
    // DL-4: "do after" chains. A finished cook (any way) counts as 'cook'.
    isCook: function(t, name) {
      var dn = RPGACE.modules.doingNow;
      if (t && t.realm === 'chef') return true;
      var m = dn ? dn.logic.matchKind(name || (t && t.title) || '', []) : null;
      return !!(m && m.kind === 'cook');
    },
    followers: function(t, cook) {
      return (RPGACE.modules.realmTasks._tasks || []).filter(function(x) {
        return x.status === 'kept' && (!t || x.id !== t.id) && ((t && String(x.after_task_id || '') === String(t.id)) || (cook && x.after_kind === 'cook'));
      });
    },
    // Something just finished: its followers become due now ("after your 19:40 cook").
    afterDone: function(t, name, at, isCook) {
      var L = RPGACE.modules.realmTasks.logic, cook = isCook || L.isCook(t, name), when = new Date(at || Date.now());
      var hh = String(when.getHours()).padStart(2, '0') + ':' + String(when.getMinutes()).padStart(2, '0');
      var label = cook ? 'after your ' + hh + ' cook' : 'after ' + (t ? t.title : name) + ' (' + hh + ')';
      var list = L.followers(t, cook);
      return Promise.all(list.map(function(x) { return L.update(x, { next_due_at: when.toISOString(), next_after: label.slice(0, 120) }); })).then(function() { return list; });
    },
    pendingNext: function() {
      return (RPGACE.modules.realmTasks._tasks || []).filter(function(x) { return x.status === 'kept' && x.next_due_at; })
        .sort(function(a, b) { return String(a.next_due_at).localeCompare(String(b.next_due_at)); });
    },
    // DL-5: skipped with a reason - a 0 XP quest_log row the evening review reads.
    skipNext: function(t, reason) {
      var L = RPGACE.modules.realmTasks.logic, day = RPGACE.modules.myDay ? RPGACE.modules.myDay.logic.iso() : new Date().toISOString().slice(0, 10);
      return RPGACE.sb.secureWrite('quest_log', 'insert', { quest_key: 'followup:' + t.id + ':' + day, quest_kind: 'followup', name: String(t.title).slice(0, 120),
        description: String(reason || 'skipped').slice(0, 200), category: t.realm, quest_type: 'followup', xp: 0, status: 'skipped',
        source_table: 'realm_tasks', source_ref: String(t.id), completed_at: new Date().toISOString() })
        .then(function() { RPGACE.cache.clear('quest_log'); return L.update(t, { next_due_at: null, next_after: null }); });
    },
    // DL-4: chain either way. mode 'after': t waits for other (a task or 'cook');
    // 'before': other waits for t. No loops.
    setChain: function(t, mode, other) {
      var L = RPGACE.modules.realmTasks.logic;
      if (other === 'cook') return L.update(t, { after_task_id: null, after_kind: 'cook' });
      if (!other) return L.update(t, { after_task_id: null, after_kind: null });
      var a = mode === 'before' ? other : t, b = mode === 'before' ? t : other, cur = b, guard = 0;
      while (cur && guard++ < 50) {
        if (cur.id === a.id) return Promise.reject(new Error('That chain would loop.'));
        cur = (RPGACE.modules.realmTasks._tasks || []).filter(function(x) { return x.id === cur.after_task_id; })[0] || null;
      }
      return L.update(a, { after_task_id: b.id, after_kind: null });
    },
    // The done-ledger row for one task tick. Pure.
    ledgerRow: function(t) {
      var md = RPGACE.modules.myDay, xp = t.earns === 'real' ? 0 : (t.earns === 'xp' && t.xp ? Math.min(100, Number(t.xp)) : ((md && md.TICK_XP) || 10));
      // DR-5: a task that is an Action (has a cadence) ticks like one, so
      // My Day's streaks, missed-why and reviews see it.
      if (t.cadence) return { quest_key: 'routine:' + t.id, quest_kind: 'routine', name: String(t.title || 'Task').slice(0, 120), category: t.realm,
        quest_type: t.cadence, xp: t.xp == null ? 10 : Number(t.xp), source_table: 'realm_tasks', source_ref: String(t.id), status: 'completed', completed_at: new Date().toISOString() };
      return { quest_key: 'task:' + t.id, quest_kind: 'task', name: String(t.title || 'Task').slice(0, 120), category: t.realm,
        quest_type: 'task', xp: xp, source_table: 'realm_tasks', source_ref: String(t.id), status: 'completed', completed_at: new Date().toISOString() };
    },
    // XP a tick pays (for toasts). Pure.
    tickXp: function(t) { return RPGACE.modules.realmTasks.logic.ledgerRow(t).xp; },
  },
  ui: {
    _esc: function(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    _btn: function(label, kind) { return RPGACE.modules.myDay.ui._btn(label, kind); },
    _realm: function(k) { var xs = RPGACE.modules.xpSeason; return (xs && xs.REALMS[k]) || { icon: '✨', name: k }; },
    _css: function() {
      if (document.getElementById('rt-css')) return;
      var st = document.createElement('style'); st.id = 'rt-css';
      st.textContent = '.rt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.rt-chip{min-height:40px;padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:none;color:var(--text);font:inherit;font-size:13px;cursor:pointer}' +
        '.rt-chip[aria-pressed="true"]{background:var(--gold);color:#111;border-color:var(--gold);font-weight:700}' +
        '.rt-task{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}.rt-task-t{flex:1 1 180px;min-width:0;font-size:14px}' +
        '.rt-sub{font-size:12px;color:var(--muted);margin-top:2px}.rt-now{border:1px solid var(--gold);border-radius:12px;padding:12px;margin:10px 0}' +
        '.rt-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}.rt-big{font-size:18px;font-weight:700}';
      document.head.appendChild(st);
    },
    // ▶ Live now: the running realm block's page (Alex: "each realm block to
    // have a live doing window like cooking ... a separate page as live now
    // so i can always revisit it").
    openLive: function(opts) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui;
      U._css();
      var host = RPGACE.areaNav.page('myday', 'live', '▶ Live now', { key: 'live', label: 'Live now', open: function() { U.openLive(); } });
      if (!host) return null;
      var box = host.box; box.id = 'rt-live';
      box.textContent = 'Loading…';
      var md = RPGACE.modules.myDay;
      Promise.all([L.load(), md ? md.logic.load().catch(function() {}) : null]).then(function() { U._drawLive(box, opts || {}); })
        .catch(function(e) { box.textContent = '⚠️ Could not load your tasks: ' + (e && e.message || e); });
      return host;
    },
    _drawLive: function(box, opts) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui, esc = U._esc, md = RPGACE.modules.myDay;
      box.innerHTML = ''; box._opts = Object.assign({}, opts || {}, { start: null }); // redraws from elsewhere keep the realm
      var top = document.createElement('div'); top.className = 'rt-head';
      var inN = L.inbox().length, prN = L.proposed().length;
      var tools = document.createElement('div'); tools.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
      var ib = U._btn('📥 New tasks' + (inN ? ' (' + inN + ')' : ''), ''); ib.id = 'rt-open-inbox'; ib.onclick = function() { U.openInbox(); };
      var cb = U._btn('🗂 Catalogue' + (prN ? ' (' + prN + ' to review)' : ''), ''); cb.id = 'rt-open-catalogue'; cb.onclick = function() { U.openCatalogue(); };
      var ab = U._btn('➕ Task', ''); ab.id = 'rt-open-add'; ab.onclick = function() { U.openAdd({}); };
      tools.appendChild(ib); tools.appendChild(cb); tools.appendChild(ab);
      top.appendChild(tools); box.appendChild(top);
      // TK-2: a block tapped on the timeline opens here: its steps as task cards, + Add a step, ⋯ for move/edit.
      if (opts.block) {
        var ob = opts.block, od = opts.date || md.logic.iso(), om = md.logic.blockMode(ob, od), oF = md.logic.toMin(ob.start_time);
        var bh = document.createElement('div'); bh.id = 'rt-block-head'; bh.style.cssText = 'margin:12px 0 4px;';
        bh.innerHTML = '<div class="rt-big">' + esc(md.logic.blockLabel(ob)) + '</div><div class="rt-sub">' + esc(md.ui._dayLabel(od) + ' · ' + md.logic.fmtMin(oF) + '–' + md.logic.fmtMin(oF + (Number(ob.mins) || 30))) + ' · ' + (om === 'now' ? 'on now' : om === 'past' ? 'already done' : 'coming up') + '</div>';
        box.appendChild(bh);
        var bt = document.createElement('div'); bt.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;';
        var lv = om !== 'past' && opts.seg ? md.ui._live(opts.seg, od, md.logic.iso()) : null;
        if (lv && om === 'now' && !lv.running) { var sb = U._btn(lv.label, 'primary'); sb.id = 'rt-block-start'; sb.onclick = function() { sb.disabled = true; lv.run().then(function() { U._drawLive(box, opts); }, function() { sb.disabled = false; }); }; bt.appendChild(sb); }
        if (opts.seg) { var mo = U._btn('⋯ Move / edit block', ''); mo.id = 'rt-block-more'; mo.onclick = function() { md.ui.blockSheet(opts.seg, od, md.logic.iso(), opts.redraw); }; bt.appendChild(mo); }
        // Oct 29 2026: a past block can carry details (people, place, reflection, photo) as a memory - same format as events.
        var em = RPGACE.modules.eventMemories;
        if (om === 'past' && em) { var dt = U._btn('🎞 Add details', ''); dt.id = 'rt-block-details'; dt.onclick = function() { dt.disabled = true; em.logic.forBlock(ob).then(function(m) { dt.disabled = false; em.ui.openEdit(m); }, function(e) { dt.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500); }); }; bt.appendChild(dt); }
        box.appendChild(bt);
        md.ui.blockSteps(box, ob, od, function() { if (opts.redraw) { try { opts.redraw(); } catch (e) {} } });
        return;
      }
      var live = L.liveBlock(), realm = opts.realm || (live && live.run.realm) || null, b = live ? live.block : null;
      var head = document.createElement('div'); head.id = 'rt-live-head'; head.style.cssText = 'margin:12px 0 4px;';
      if (live) {
        var R = U._realm(live.run.realm), st = md.logic.focusAt(live.run, Date.now());
        var left = Math.max(0, Math.round((live.run.startedAt + live.run.mins * 60000 + (live.run.pausedMs || 0) - Date.now()) / 60000));
        head.innerHTML = '<div class="rt-big">' + esc(R.icon + ' ' + R.name + ' block') + '</div><div class="rt-sub">' + (st.done ? 'Time is up' : left + ' min left') + (st.phase ? ' · ' + esc(st.phase.kind === 'focus' ? 'focus' : 'break') : '') + '</div>';
      } else if (realm) {
        var R2 = U._realm(realm); head.innerHTML = '<div class="rt-big">' + esc(R2.icon + ' ' + R2.name) + '</div><div class="rt-sub">No block running — tasks done here are still recorded.</div>';
      } else {
        head.innerHTML = '<div class="rt-big">Nothing running</div><div class="rt-sub">Start a realm block on My Day (▶ Start) and it opens here, or pick a realm to work on now.</div>';
      }
      box.appendChild(head);
      // TK-2: the running block's steps as task cards (same cards as the timeline's block page).
      if (b) md.ui.blockSteps(box, b, md.logic.iso());
      U._liveNext(box, opts);
      U._liveFree(box, realm, opts);
      if (!realm) {
        var rc = document.createElement('div'); rc.className = 'rt-chips'; rc.id = 'rt-realm-pick';
        (RPGACE.modules.xpSeason ? RPGACE.modules.xpSeason.ORDER : []).forEach(function(k) {
          var R3 = U._realm(k), c = document.createElement('button'); c.type = 'button'; c.className = 'rt-chip'; c.dataset.realm = k; c.textContent = R3.icon + ' ' + R3.name;
          c.onclick = function() { U._drawLive(box, { realm: k }); };
          rc.appendChild(c);
        });
        box.appendChild(rc);
        return;
      }
      var key = 'rt_live_' + (b ? b.id : 'free_' + realm), st2 = {};
      try { st2 = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}
      var save = function() { try { localStorage.setItem(key, JSON.stringify(st2)); } catch (e) {} };
      if (opts.start && st2.task !== opts.start) {
        var st0 = (self._tasks || []).filter(function(t) { return t.id === opts.start; })[0];
        if (st0) { if (st2.entry) L.freeDiscard(st2.entry); st2.task = st0.id; st2.entry = null; if (!b) { var e0 = L.freeStart(st0, realm); st2.entry = e0 ? e0.id : null; } save(); }
        opts = Object.assign({}, opts, { start: null });
      }
      var agenda = (b && Array.isArray(b.types)) ? b.types : [];
      var types = L.orderTypes(L.types(realm), self._tasks, agenda);
      if (!st2.type && types[0]) st2.type = types[0].key;
      // current task
      var cur = st2.task ? (self._tasks || []).filter(function(t) { return t.id === st2.task; })[0] : null;
      if (cur) {
        var nw = document.createElement('div'); nw.className = 'rt-now'; nw.id = 'rt-current';
        nw.innerHTML = '<div class="rt-sub">Live now</div><div class="rt-big">' + esc(cur.title) + '</div>' + (cur.notes ? '<div class="rt-sub">' + esc(cur.notes) + '</div>' : '') + (cur.how ? '<div class="rt-sub">Counts when you ' + esc(cur.how) + '</div>' : '');
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';
        // GM-8: the context picked in Plan block, with its own Open.
        var pi = L.plannedItem(cur, b);
        if (pi && pi.context) {
          var cx = document.createElement('div'); cx.id = 'rt-ctx'; cx.style.cssText = 'margin-top:6px;padding:8px 10px;border:1px dashed var(--gold);border-radius:8px;';
          cx.innerHTML = '<div style="color:var(--gold);font-weight:700;">🎯 ' + esc(pi.context) + '</div>';
          nw.appendChild(cx);
          var co = RPGACE.modules.cookingOracle;
          if (pi.context_kind === 'recipe' && co && b && b.planned_cook_id) {
            var sc = U._btn('▶ Start cooking', 'primary'); sc.id = 'rt-ctx-cook'; sc.onclick = function() { co.logic._startCookNow(b.planned_cook_id, b.agenda_id); }; row.appendChild(sc);
          } else if (pi.context_kind === 'recipe' && co && pi.recipe_id) {
            var orc = U._btn('📖 Open recipe', ''); orc.id = 'rt-ctx-recipe';
            orc.onclick = function() { co.logic._loadSavedRecipe(pi.recipe_id, function(err, rec) { if (err || !rec) { RPGACE.utils.toast('⚠️ ' + (err || 'Recipe not found'), '#CC4A4A', 3000); return; } co.ui._showRecipeCard(rec, null, pi.recipe_id); }); };
            row.appendChild(orc);
          }
          if (pi.context_id) L.loadContext(pi.context_id).then(function(c) {
            if (!c || !c.detail || !cx.isConnected) return;
            var d = document.createElement('div'); d.className = 'rt-sub'; d.id = 'rt-ctx-detail'; d.style.whiteSpace = 'pre-wrap'; d.textContent = c.detail;
            cx.appendChild(d);
          }).catch(function() {});
        }
        if (cur.opens) { var op = U._btn('Open ↗', ''); op.onclick = function() { md.ui._openTool(cur.opens); }; row.appendChild(op); }
        var dn = U._btn('✅ Done', 'primary'); dn.id = 'rt-done';
        dn.onclick = function() {
          dn.disabled = true;
          // DL-1: in a realm block the block pays; otherwise a timed Live now entry closes and the task ticks.
          var work = b && b.kind === 'realm' ? L.doneInBlock(cur, b) : L.freeDone(cur, b ? null : st2.entry);
          work.then(function() { return L.afterDone(cur, null, Date.now()).catch(function() { return []; }); }).then(function(next) {
            RPGACE.utils.toast('✅ ' + cur.title + (cur.earns !== 'real' ? ' · +' + L.tickXp(cur) + ' ' + U._realm(cur.realm || realm).name : '') + (next && next.length ? ' · ⏭ Next: ' + next[0].title : ''), '#4caf82', 2600);
            st2.task = null; st2.entry = null; st2.done = (st2.done || 0) + 1; save(); U._drawLive(box, opts);
          }).catch(function(e) { dn.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'realmTasks'); });
        };
        var nn = U._btn('↩ Not now', ''); nn.onclick = function() { if (st2.entry) L.freeDiscard(st2.entry); st2.task = null; st2.entry = null; save(); U._drawLive(box, opts); };
        var ch = U._btn('⛓ Chain', ''); ch.id = 'rt-chain'; ch.title = 'Do this after / before another task'; ch.onclick = function() { U.openChain(cur); };
        row.appendChild(dn); row.appendChild(nn); row.appendChild(ch); nw.appendChild(row);
        if (st2.entry && !b) { var tm = document.createElement('div'); tm.className = 'rt-sub'; tm.id = 'rt-free-on'; tm.textContent = '⏱ On your timeline from ' + U._clock(new Date((L.freeEntry(st2.entry) || {}).started_at || Date.now()).getTime()); nw.appendChild(tm); }
        box.appendChild(nw);
      }
      // type picker
      var lab = document.createElement('div'); lab.className = 'rt-sub'; lab.style.marginTop = '10px';
      lab.textContent = agenda.length ? 'Your agenda first (⭐). Done with it? Pick another type.' : 'What kind of work for this stretch?';
      box.appendChild(lab);
      var chips = document.createElement('div'); chips.className = 'rt-chips'; chips.id = 'rt-types';
      types.forEach(function(ty) {
        var n = L.rank(self._tasks, realm, ty.key).filter(function(t) { return !t._resting; }).length;
        var c = document.createElement('button'); c.type = 'button'; c.className = 'rt-chip'; c.dataset.type = ty.key;
        c.setAttribute('aria-pressed', st2.type === ty.key ? 'true' : 'false');
        c.textContent = (agenda.indexOf(ty.key) !== -1 ? '⭐ ' : '') + (ty.icon ? ty.icon + ' ' : '') + ty.label + ' (' + n + ')';
        c.onclick = function() { st2.type = ty.key; save(); U._drawLive(box, opts); };
        chips.appendChild(c);
      });
      box.appendChild(chips);
      // that type's tasks: top 3, then the rest
      var list = L.rank(self._tasks, realm, st2.type).filter(function(t) { return !cur || t.id !== cur.id; });
      var wrap = document.createElement('div'); wrap.id = 'rt-list';
      var draw = function(all) {
        wrap.innerHTML = '';
        (all ? list : list.slice(0, 3)).forEach(function(t) {
          var r = document.createElement('div'); r.className = 'rt-task'; r.dataset.id = t.id;
          var tx = document.createElement('div'); tx.className = 'rt-task-t';
          var tp0 = L.plannedItem(t, b);
          var sub = [tp0 && tp0.context ? '🎯 ' + tp0.context : null, t.mins + ' min', t.kind === 'once' ? 'one-off' : null, t._resting ? 'resting' : null, t.earns === 'real' ? 'counts when you ' + (t.how || 'do it') : null, L.srcLabel(t) || null].filter(Boolean);
          tx.innerHTML = esc(t.title) + '<div class="rt-sub">' + esc(sub.join(' · ')) + '</div>';
          var go = U._btn('▶ Start', cur ? '' : 'primary'); go.className += ' rt-start';
          go.onclick = function() {
            if (st2.entry) L.freeDiscard(st2.entry);
            st2.task = t.id; st2.entry = null;
            if (!b) { var en = L.freeStart(t, realm); st2.entry = en ? en.id : null; } // DL-1
            save(); if (t.opens) md.ui._openTool(t.opens); U._drawLive(box, opts);
          };
          r.appendChild(tx); r.appendChild(go); wrap.appendChild(r);
        });
        if (!list.length) wrap.innerHTML = '<div class="rt-sub" style="padding:8px 0;">No kept tasks of this type yet — keep some in 🗂 Catalogue or 📥 New tasks.</div>';
        if (!all && list.length > 3) {
          var more = U._btn('Show ' + (list.length - 3) + ' more', ''); more.id = 'rt-more'; more.style.marginTop = '8px';
          more.onclick = function() { draw(true); };
          wrap.appendChild(more);
        }
      };
      draw(false);
      box.appendChild(wrap);
      if (st2.done) { var dl = document.createElement('div'); dl.className = 'rt-sub'; dl.style.marginTop = '10px'; dl.textContent = '✅ ' + st2.done + ' done in this stretch'; box.appendChild(dl); }
      U._liveDue(box, realm);
    },
    _clock: function(ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
    // DL-5: follow-ups waiting (a chained task after something finished) stay on top until done or skipped.
    _liveNext: function(box, opts) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui, esc = U._esc, pend = L.pendingNext();
      if (!pend.length) return;
      var w = document.createElement('div'); w.id = 'rt-next'; w.style.cssText = 'margin:8px 0;padding:8px 10px;border:1px solid var(--gold);border-radius:10px;';
      pend.forEach(function(x) {
        var r = document.createElement('div'); r.className = 'rt-task rt-next-row'; r.dataset.id = x.id;
        var tx = document.createElement('div'); tx.className = 'rt-task-t'; tx.innerHTML = '⏭ Next: ' + esc(x.title) + '<div class="rt-sub">' + esc(x.next_after || '') + '</div>';
        var go = U._btn('▶ Start', 'primary'); go.className += ' rt-next-start'; go.onclick = function() { U._drawLive(box, Object.assign({}, opts, { realm: x.realm, start: x.id })); };
        var sk = U._btn('Skip', ''); sk.className += ' rt-next-skip'; sk.onclick = function() { U.openSkip(x, function() { U._drawLive(box, opts); }); };
        r.appendChild(tx); r.appendChild(go); r.appendChild(sk); w.appendChild(r);
      });
      box.appendChild(w);
    },
    openSkip: function(x, done) {
      var self = RPGACE.modules.realmTasks, U = self.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '⏭ Skip', title: 'Why skip ' + x.title + '?', width: '420px' });
      pop.box.id = 'rt-skip';
      ['Too tired', 'No time', 'Not needed today', 'Doing it later', 'Something came up'].forEach(function(why) {
        var b = U._btn(why, ''); b.className += ' rt-skip-why'; b.style.cssText += 'display:block;width:100%;margin:4px 0;text-align:left;';
        b.onclick = function() { b.disabled = true; self.logic.skipNext(x, why).then(function() { pop.close(); RPGACE.utils.toast('Skipped ' + x.title + ' - it comes up in tonight\'s review', '#E2A83D', 2600); if (done) done(); })
          .catch(function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); }); };
        pop.box.appendChild(b);
      });
      return pop;
    },
    // DL-2: what Doing Now did, now on Live now - anything that is not a task, and other timed entries still running.
    _liveFree: function(box, realm, opts) {
      var self = RPGACE.modules.realmTasks, U = self.ui, esc = U._esc, dn = RPGACE.modules.doingNow;
      if (!dn) return;
      var w = document.createElement('div'); w.id = 'rt-free'; w.style.cssText = 'margin:8px 0;';
      // Task entries live in the task panel above; this lists typed ones.
      dn.logic.running().filter(function(e) { return !(e.details && e.details.task_id); }).forEach(function(e) {
        var r = document.createElement('div'); r.className = 'rt-task rt-free-run';
        var tx = document.createElement('div'); tx.className = 'rt-task-t'; tx.innerHTML = '▶ Live now: ' + esc(e.title) + '<div class="rt-sub">' + esc(dn.logic.fmt(dn.logic.mins(e))) + '</div>';
        var stop = U._btn('■ Done', 'primary'); stop.className += ' rt-free-stop'; stop.onclick = function() { dn.ui.openStop(e); };
        r.appendChild(tx); r.appendChild(stop); w.appendChild(r);
      });
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
      var jd = U._btn('✓ I just did', ''); jd.id = 'rt-just-did'; jd.onclick = function() { U.openJustDid(realm); };
      var se = U._btn('✏️ Something else…', ''); se.id = 'rt-something';
      se.onclick = function() { dn.ui.openTyped(realm); };
      bar.appendChild(jd); bar.appendChild(se); w.appendChild(bar);
      box.appendChild(w);
    },
    // DL-3: I just did - a task or something typed, with any two of start / finish / how long.
    openJustDid: function(realm) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui, xs = RPGACE.modules.xpSeason;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '✓ I just did', title: 'Put it on your timeline', width: '460px' });
      pop.box.id = 'rt-did';
      var css = 'width:100%;box-sizing:border-box;min-height:44px;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;font:inherit;margin-bottom:8px;';
      var lab = function(t) { var d = document.createElement('div'); d.className = 'rt-sub'; d.textContent = t; return d; };
      var ts = document.createElement('select'); ts.id = 'rt-did-task'; ts.style.cssText = css;
      ts.innerHTML = '<option value="">— something else (type it below) —</option>';
      L.load().catch(function() {}).then(function() {
        var kept = (self._tasks || []).filter(function(t) { return t.status === 'kept'; });
        kept.sort(function(a, b) { return (a.realm === realm ? 0 : 1) - (b.realm === realm ? 0 : 1) || String(a.title).localeCompare(String(b.title)); });
        kept.forEach(function(t) { var o = document.createElement('option'); o.value = t.id; o.textContent = U._realm(t.realm).icon + ' ' + t.title; ts.appendChild(o); });
      });
      var nm = document.createElement('input'); nm.id = 'rt-did-name'; nm.placeholder = 'Or type it, e.g. cooked rice and eggs'; nm.style.cssText = css;
      var rs = document.createElement('select'); rs.id = 'rt-did-realm'; rs.style.cssText = css;
      (xs ? xs.ORDER : ['life']).forEach(function(k) { var o = document.createElement('option'); o.value = k; o.textContent = U._realm(k).icon + ' ' + U._realm(k).name; rs.appendChild(o); });
      rs.value = realm || 'life';
      var row = document.createElement('div'); row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      var sIn = document.createElement('input'); sIn.type = 'time'; sIn.id = 'rt-did-start'; sIn.style.cssText = css;
      var eIn = document.createElement('input'); eIn.type = 'time'; eIn.id = 'rt-did-end'; eIn.style.cssText = css;
      var c1 = document.createElement('div'); c1.appendChild(lab('Started about')); c1.appendChild(sIn);
      var c2 = document.createElement('div'); c2.appendChild(lab('Finished about')); c2.appendChild(eIn);
      row.appendChild(c1); row.appendChild(c2);
      var mIn = document.createElement('input'); mIn.type = 'number'; mIn.id = 'rt-did-mins'; mIn.min = '1'; mIn.max = '720'; mIn.inputMode = 'numeric'; mIn.placeholder = 'How long (min)'; mIn.style.cssText = css;
      var chips = document.createElement('div'); chips.className = 'rt-chips'; chips.style.marginBottom = '8px';
      [5, 10, 15, 20, 30, 45, 60, 90].forEach(function(m) { var c = document.createElement('button'); c.type = 'button'; c.className = 'rt-chip rt-did-chip'; c.textContent = m + ' min'; c.onclick = function() { mIn.value = m; calc(); }; chips.appendChild(c); });
      var out = document.createElement('div'); out.id = 'rt-did-out'; out.style.cssText = 'font-size:14px;margin:4px 0 10px;';
      var toMs = function(v, now) { if (!v) return null; var p = v.split(':'), d = new Date(now); d.setHours(Number(p[0]) || 0, Number(p[1]) || 0, 0, 0); var t = d.getTime(); return t > now + 60000 ? t - 864e5 : t; };
      var res = null;
      var calc = function() {
        var now = Date.now(); res = L.solveTimes({ start: toMs(sIn.value, now), end: toMs(eIn.value, now), mins: mIn.value }, now);
        out.style.color = res.error ? '#CC4A4A' : 'var(--text)';
        out.textContent = res.error ? res.error : U._clock(res.start) + '–' + U._clock(res.end) + ' · ' + res.mins + ' min';
      };
      [sIn, eIn, mIn].forEach(function(el) { el.oninput = calc; });
      var sv = U._btn('Add to my timeline', 'primary'); sv.id = 'rt-did-save'; sv.style.width = '100%';
      sv.onclick = function() {
        calc(); if (!res || res.error) return;
        var t = (self._tasks || []).filter(function(x) { return x.id === ts.value; })[0] || null, name = nm.value.trim();
        if (!t && !name) { out.style.color = '#CC4A4A'; out.textContent = 'Pick a task or type what you did.'; return; }
        sv.disabled = true;
        var times = res;
        var entry = null;
        L.retro(t, name, rs.value, times).then(function(e) { entry = e; return L.afterDone(t, name, times.end).catch(function() { return []; }); }).then(function(next) {
          pop.close();
          // BT-2: same "Did this replace your block?" as the typed path (doingNow.ui._checkBlocks, rule 8).
          try { if (entry && RPGACE.modules.doingNow) RPGACE.modules.doingNow.ui._checkBlocks(entry); } catch (x) {}
          RPGACE.utils.toast('✓ ' + (t ? t.title : name) + ' ' + U._clock(times.start) + '–' + U._clock(times.end) + (next && next.length ? ' · ⏭ Next: ' + next[0].title : ''), '#4caf82', 3000);
          var lv = document.getElementById('rt-live'); if (lv) U._drawLive(lv, lv._opts || {});
          try { if (RPGACE.modules.myDay) RPGACE.modules.myDay.ui.render(); } catch (e) {}
        }).catch(function(e) { sv.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'realmTasks'); });
      };
      [lab('What did you do?'), ts, nm, lab('Realm (for something typed)'), rs, row, lab('How long'), chips, mIn, out, sv].forEach(function(el) { pop.box.appendChild(el); });
      return pop;
    },
    // DL-4: chain a task after another (or after any cook), or before one.
    openChain: function(t) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '⛓ Chain', title: t.title, width: '440px' });
      pop.box.id = 'rt-chain-pop';
      var css = 'width:100%;box-sizing:border-box;min-height:44px;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;font:inherit;margin-bottom:8px;';
      var others = (self._tasks || []).filter(function(x) { return x.status === 'kept' && x.id !== t.id; }).sort(function(a, b) { return (a.realm === t.realm ? 0 : 1) - (b.realm === t.realm ? 0 : 1) || String(a.title).localeCompare(String(b.title)); });
      var opt = function(sel, v, txt) { var o = document.createElement('option'); o.value = v; o.textContent = txt; sel.appendChild(o); };
      var af = document.createElement('select'); af.id = 'rt-chain-after'; af.style.cssText = css;
      opt(af, '', '— on its own —'); opt(af, 'cook', '🍳 after any cook');
      others.forEach(function(x) { opt(af, x.id, U._realm(x.realm).icon + ' after ' + x.title); });
      af.value = t.after_kind === 'cook' ? 'cook' : (t.after_task_id || '');
      var bf = document.createElement('select'); bf.id = 'rt-chain-before'; bf.style.cssText = css;
      opt(bf, '', '— nothing waits for it —');
      others.forEach(function(x) { opt(bf, x.id, U._realm(x.realm).icon + ' before ' + x.title); });
      var cur = others.filter(function(x) { return String(x.after_task_id || '') === String(t.id); })[0]; if (cur) bf.value = cur.id;
      var sv = U._btn('Save chain', 'primary'); sv.id = 'rt-chain-save'; sv.style.width = '100%';
      sv.onclick = function() {
        sv.disabled = true;
        var a = af.value === 'cook' ? 'cook' : (others.filter(function(x) { return x.id === af.value; })[0] || null);
        var bo = others.filter(function(x) { return x.id === bf.value; })[0] || null;
        L.setChain(t, 'after', a).then(function() { return bo ? L.setChain(t, 'before', bo) : (cur && !bf.value ? L.update(cur, { after_task_id: null }) : null); }).then(function() {
          pop.close(); RPGACE.utils.toast('⛓ Chain saved', '#4caf82', 1800);
        }).catch(function(e) { sv.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); });
      };
      var l1 = document.createElement('div'); l1.className = 'rt-sub'; l1.textContent = 'Do it after… (it comes up as Next when that finishes)';
      var l2 = document.createElement('div'); l2.className = 'rt-sub'; l2.textContent = 'Or do it before… (that one comes up after this)';
      [l1, af, l2, bf, sv].forEach(function(el) { pop.box.appendChild(el); });
      return pop;
    },
    // Plans & People (Alex picked them as sources): Explorer shows trip tasks
    // with a book-by date coming up, Connector shows people due a reach-out.
    // Read live from Plans, never copied into realm_tasks.
    _liveDue: function(box, realm) {
      var tp = RPGACE.modules.tripPlans, U = RPGACE.modules.realmTasks.ui, esc = U._esc;
      if (!tp || !tp.logic.signedIn() || (realm !== 'explorer' && realm !== 'connector')) return;
      var today = RPGACE.modules.myDay.logic.iso();
      var people = tp.logic.read('people', 'select=*&limit=300').catch(function() { return []; });
      var work = realm === 'connector'
        ? people.then(function(pp) { return tp.logic.peopleDue(pp, today); })
        : Promise.all([tp.logic.read('plans', 'select=id,title,status,start_date,end_date,people,details,created_at&status=in.(planning,booked,done)&limit=100'),
            tp.logic.read('plan_tasks', 'select=id,plan_id,title,kind,due_by,done&done=eq.false&due_by=not.is.null&limit=500'), people])
          .then(function(x) { return tp.logic.tripDue(x[0], x[1], x[2], today); });
      work.then(function(rows) {
        if (!rows || !rows.length) return;
        var w = document.createElement('div'); w.id = 'rt-live-due'; w.style.marginTop = '14px';
        w.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">📌 Due from ' + (realm === 'connector' ? 'People' : 'Plans') + '</div>';
        rows.slice(0, 5).forEach(function(x) {
          var r = document.createElement('div'); r.className = 'rt-task';
          var tx = document.createElement('div'); tx.className = 'rt-task-t'; tx.innerHTML = esc((x.icon ? x.icon + ' ' : '') + x.text) + (x.sub ? '<div class="rt-sub">' + esc(x.sub) + '</div>' : '');
          var go = U._btn('Open', ''); go.onclick = function() { tp.ui.open('plans', x.plan ? { planId: x.plan.id } : undefined); };
          r.appendChild(tx); r.appendChild(go); w.appendChild(r);
        });
        box.appendChild(w);
      }).catch(function() {});
    },
    // 📥 New tasks: Keep (with a type) or Drop; "same as X?" asks.
    openInbox: function() {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui, esc = U._esc;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📥 New tasks', title: 'Keep or drop', width: '600px', scroll: true });
      pop.box.id = 'rt-inbox';
      var draw = function() {
        pop.box.innerHTML = '';
        var items = L.inbox();
        if (!items.length) { pop.box.innerHTML = '<div class="rt-sub">Nothing new. Tasks from videos you share, your journal and Library saves land here.</div>'; return; }
        var byRealm = {};
        items.forEach(function(t) { (byRealm[t.realm] = byRealm[t.realm] || []).push(t); });
        Object.keys(byRealm).forEach(function(rk) {
          var R = U._realm(rk), h = document.createElement('div'); h.style.cssText = 'font-weight:700;margin:12px 0 4px;'; h.textContent = R.icon + ' ' + R.name + ' (' + byRealm[rk].length + ')';
          pop.box.appendChild(h);
          byRealm[rk].forEach(function(t) {
            var r = document.createElement('div'); r.className = 'rt-task'; r.dataset.id = t.id;
            var same = t.dup_of ? (self._tasks || []).filter(function(x) { return x.id === t.dup_of; })[0] : null;
            var tx = document.createElement('div'); tx.className = 'rt-task-t';
            tx.innerHTML = (t.context_kind ? '🎯 ' : '') + esc(t.title) + (t.context_kind ? '<div class="rt-sub rt-mission-tag" style="color:var(--gold);">New mission · pick ' + esc(L.CONTEXT_KINDS[t.context_kind] || 'what it is about') + ' when you plan a block</div>' : '') + (t.notes ? '<div class="rt-sub">' + esc(t.notes) + '</div>' : '') + '<div class="rt-sub">' + esc([L.srcLabel(t), t.xp ? '+' + t.xp + ' XP' : null].filter(Boolean).join(' · ')) + '</div>' +
              (same ? '<div class="rt-sub" style="color:#e0a84c;">Same as "' + esc(same.title) + '"?</div>' : '');
            var sel = document.createElement('select'); sel.className = 'rt-type'; sel.setAttribute('aria-label', 'Type');
            sel.style.cssText = 'min-height:40px;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:4px;';
            L.types(rk).forEach(function(ty) { var o = document.createElement('option'); o.value = ty.key; o.textContent = ty.label; sel.appendChild(o); });
            if (t.type_key) sel.value = t.type_key;
            var keep = U._btn(same ? 'Different — keep' : 'Keep', 'primary'); keep.className += ' rt-keep';
            keep.onclick = function() { keep.disabled = true; L.update(t, { status: 'kept', type_key: sel.value || null, dup_of: null }).then(draw).catch(function(e) { keep.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); }); };
            var drop = U._btn(same ? 'Same — drop' : 'Drop', ''); drop.className += ' rt-drop';
            drop.onclick = function() { drop.disabled = true; L.update(t, { status: 'dropped' }).then(draw).catch(function(e) { drop.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); }); };
            r.appendChild(tx); r.appendChild(sel); r.appendChild(keep); r.appendChild(drop);
            pop.box.appendChild(r);
          });
        });
      };
      // GM-3: specific video tasks are filed under missions before you review.
      pop.box.textContent = 'Sorting new tasks under your missions…';
      L.load().then(function() { return L.fileInbox(); }).then(function(n) {
        draw();
        if (n) RPGACE.utils.toast('🎯 ' + n + ' new task' + (n === 1 ? '' : 's') + ' filed under missions as cards', '#3DAA6E', 3000, 'realmTasks');
      }).catch(function(e) { pop.box.textContent = '⚠️ ' + (e.message || e); });
      return pop;
    },
    // 🗂 Catalogue: per realm, the proposed tasks by type - Keep / Edit / Drop.
    openCatalogue: function(realm) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui, esc = U._esc, xs = RPGACE.modules.xpSeason;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🗂 Catalogue', title: 'Tasks for each realm', width: '640px', scroll: true });
      pop.box.id = 'rt-catalogue';
      var cur = realm || null;
      var draw = function() {
        pop.box.innerHTML = '';
        var chips = document.createElement('div'); chips.className = 'rt-chips';
        (xs ? xs.ORDER : []).forEach(function(k) {
          var R = U._realm(k), n = L.proposed(k).length, c = document.createElement('button'); c.type = 'button'; c.className = 'rt-chip'; c.dataset.realm = k;
          c.setAttribute('aria-pressed', cur === k ? 'true' : 'false'); c.textContent = R.icon + ' ' + R.name + (n ? ' · ' + n : ' ✓');
          c.onclick = function() { cur = k; draw(); };
          chips.appendChild(c);
        });
        pop.box.appendChild(chips);
        if (!cur) { var h = document.createElement('div'); h.className = 'rt-sub'; h.textContent = 'Pick a realm. Kept tasks show in your blocks; proposed ones only after you keep them.'; pop.box.appendChild(h); return; }
        L.types(cur).forEach(function(ty) {
          var all = (self._tasks || []).filter(function(t) { return t.realm === cur && t.type_key === ty.key && (t.status === 'kept' || t.status === 'proposed'); });
          all.sort(function(a, b) { return (b.context_kind ? 1 : 0) - (a.context_kind ? 1 : 0); }); // GM-2: missions first
          if (!all.length) return;
          var hd = document.createElement('div'); hd.className = 'rt-head'; hd.style.marginTop = '12px';
          hd.innerHTML = '<b>' + esc((ty.icon ? ty.icon + ' ' : '') + ty.label) + '</b>';
          var props = all.filter(function(t) { return t.status === 'proposed'; });
          if (props.length > 1) {
            var ka = U._btn('Keep all ' + props.length, ''); ka.className += ' rt-keepall';
            ka.onclick = function() { ka.disabled = true; props.reduce(function(p, t) { return p.then(function() { return L.update(t, { status: 'kept' }); }); }, Promise.resolve()).then(draw).catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); draw(); }); };
            hd.appendChild(ka);
          }
          pop.box.appendChild(hd);
          all.forEach(function(t) {
            var r = document.createElement('div'); r.className = 'rt-task'; r.dataset.id = t.id;
            var tx = document.createElement('div'); tx.className = 'rt-task-t';
            tx.innerHTML = esc(t.title) + '<div class="rt-sub">' + esc([t.mins + ' min', t.kind === 'once' ? 'one-off' : 'repeatable', t.status === 'kept' ? '✓ kept' : 'proposed'].join(' · ')) + '</div>';
            if (t.context_kind) { r.classList.add('rt-mission'); tx.insertAdjacentHTML('beforeend', '<div class="rt-sub rt-mission-tag" style="color:var(--gold);">🎯 Mission · when you plan a block, pick ' + esc(L.CONTEXT_KINDS[t.context_kind] || 'what it is about') + '</div>'); }
            r.appendChild(tx);
            if (t.status === 'proposed') {
              var k = U._btn('Keep', 'primary'); k.className += ' rt-keep';
              k.onclick = function() { k.disabled = true; L.update(t, { status: 'kept' }).then(draw); };
              r.appendChild(k);
            }
            var ed = U._btn('Edit', ''); ed.className += ' rt-edit';
            ed.onclick = function() {
              var nt = window.prompt('Task name', t.title); if (nt == null || !nt.trim()) return;
              var nm = window.prompt('Minutes', String(t.mins || 30)); var m = parseInt(nm, 10);
              L.update(t, { title: nt.trim().slice(0, 120), mins: m > 0 ? Math.min(480, m) : t.mins }).then(draw).catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); });
            };
            var dr = U._btn('Drop', ''); dr.className += ' rt-drop';
            dr.onclick = function() { dr.disabled = true; L.update(t, { status: 'dropped' }).then(function() { t.status = 'dropped'; draw(); }); };
            r.appendChild(ed); r.appendChild(dr);
            pop.box.appendChild(r);
          });
        });
      };
      L.load().then(draw).catch(function(e) { pop.box.textContent = '⚠️ ' + (e.message || e); });
      return pop;
    },
    // The one "➕ Task" button other screens add (idea cards, book insights).
    taskButton: function(opts) {
      var U = RPGACE.modules.realmTasks.ui, b = U._btn('➕ Task', '');
      b.className += ' rt-task-btn'; b.style.minHeight = '40px';
      b.onclick = function() { U.openAdd(opts); };
      return b;
    },
    // ➕ Task: one form for every place a task can come from (Oracle replies,
    // idea cards, Live now). opts: { title, notes, realm, source }.
    openAdd: function(opts) {
      var self = RPGACE.modules.realmTasks, L = self.logic, U = self.ui, xs = RPGACE.modules.xpSeason;
      opts = opts || {};
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '➕ Task', title: 'Add a task', width: '480px' });
      pop.box.id = 'rt-add';
      var inp = 'width:100%;box-sizing:border-box;min-height:44px;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;font:inherit;margin-bottom:8px;';
      var ti = document.createElement('input'); ti.id = 'rt-add-title'; ti.value = String(opts.title || '').slice(0, 120); ti.placeholder = 'What is the task?'; ti.style.cssText = inp;
      var rs = document.createElement('select'); rs.id = 'rt-add-realm'; rs.style.cssText = inp;
      (xs ? xs.ORDER : []).forEach(function(k) { var o = document.createElement('option'); o.value = k; o.textContent = U._realm(k).icon + ' ' + U._realm(k).name; rs.appendChild(o); });
      if (opts.realm) rs.value = opts.realm;
      var ts = document.createElement('select'); ts.id = 'rt-add-type'; ts.style.cssText = inp;
      var fillTypes = function() { ts.innerHTML = ''; L.types(rs.value).forEach(function(ty) { var o = document.createElement('option'); o.value = ty.key; o.textContent = ty.label; ts.appendChild(o); }); };
      rs.onchange = fillTypes;
      var kind = document.createElement('select'); kind.id = 'rt-add-kind'; kind.style.cssText = inp;
      kind.innerHTML = '<option value="repeat">Repeatable</option><option value="once">One-off</option>';
      if (opts.kind) kind.value = opts.kind;
      var sv = U._btn('Save task', 'primary'); sv.id = 'rt-add-save';
      sv.onclick = function() {
        sv.disabled = true;
        var before = (self._tasks || []).length;
        L.add({ realm: rs.value, type_key: ts.value, title: ti.value, notes: opts.notes, kind: kind.value, status: 'kept', sources: opts.source ? [opts.source] : [] }).then(function() {
          pop.close();
          RPGACE.utils.toast((self._tasks || []).length > before ? '➕ Task added to ' + U._realm(rs.value).name : '➕ Already there — merged into the existing task', '#4caf82', 2600);
        }).catch(function(e) { sv.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'realmTasks'); });
      };
      [ti, rs, ts, kind, sv].forEach(function(el) { pop.box.appendChild(el); });
      L.load().then(fillTypes).catch(fillTypes);
      return pop;
    },
  },
});
/* ===END:realmTasks=== */
