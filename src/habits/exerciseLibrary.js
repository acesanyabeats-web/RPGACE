
/* ===MODULE:exerciseLibrary=== */
// DR-12 (Oct 27 2026, plan "Day & Habits Rewire"). Alex: exercises from gym
// videos "grouped by muscle group and over arching group by discipline",
// "sub categories under each for regions in group so I hit the entire group
// properly", and they should "auto pop up as possible task to add to routine
// when I choose exercises". Record:
// records/2026-10/schedule_habits_rewire_paranoia_2026-10-27.txt (section 9-10).
// Video exercises live in `exercises` (one row per kept exercise, linked to its
// intel_reports row); the STARTER list lives only here and is always labelled
// "not from your videos". Extraction uses the cheap model and Alex reviews
// before anything is saved; intel_reports.exercises_scanned_at marks a video done.
RPGACE.register('exerciseLibrary', {
  domain: 'habits',
  DISCIPLINES: [['weights', '🏋️ Weights'], ['bodyweight', '🤸 Bodyweight'], ['cardio', '🏃 Cardio'], ['stretches', '🧘 Stretches'], ['mobility', '🌀 Mobility']],
  // Muscle group -> its regions [key, label]. A combo "hits the whole group"
  // when every region is a primary target of something in it.
  GROUPS: {
    chest:     ['Chest', [['upper_chest', 'Upper chest'], ['mid_chest', 'Mid chest'], ['lower_chest', 'Lower chest']]],
    back:      ['Back', [['lats', 'Lats'], ['upper_back', 'Upper back & traps'], ['mid_back', 'Mid back'], ['lower_back', 'Lower back']]],
    shoulders: ['Shoulders', [['front_delts', 'Front delts'], ['side_delts', 'Side delts'], ['rear_delts', 'Rear delts'], ['rotator_cuff', 'Rotator cuff']]],
    arms:      ['Arms', [['biceps', 'Biceps'], ['triceps', 'Triceps'], ['forearms', 'Forearms & grip']]],
    core:      ['Core', [['abs', 'Abs'], ['obliques', 'Obliques'], ['deep_core', 'Deep core']]],
    legs:      ['Legs', [['quads', 'Quads'], ['hamstrings', 'Hamstrings'], ['calves', 'Calves'], ['adductors', 'Inner thighs'], ['knee_tendons', 'Knees & tendons']]],
    glutes:    ['Glutes', [['glute_max', 'Glute max'], ['glute_med', 'Side glutes'], ['hip_flexors', 'Hip flexors']]],
    full_body: ['Full body', [['power', 'Power'], ['conditioning', 'Conditioning'], ['stability', 'Carry & stability']]]
  },
  // [name, discipline, group, primary, secondary, cue]
  STARTER: [
    ['Barbell bench press', 'weights', 'chest', ['mid_chest'], ['front_delts', 'triceps'], 'Shoulder blades pinned, bar to mid chest.'],
    ['Incline dumbbell press', 'weights', 'chest', ['upper_chest'], ['front_delts', 'triceps'], 'Bench at 30 degrees, elbows under wrists.'],
    ['Dips (chest lean)', 'bodyweight', 'chest', ['lower_chest'], ['triceps', 'front_delts'], 'Lean forward, lower until shoulders are below elbows.'],
    ['Push-up', 'bodyweight', 'chest', ['mid_chest'], ['triceps', 'front_delts', 'deep_core'], 'Body in one line, chest to a fist from the floor.'],
    ['Cable fly (high to low)', 'weights', 'chest', ['lower_chest'], ['mid_chest'], 'Soft elbows, hands meet at hip height.'],
    ['Pull-up', 'bodyweight', 'back', ['lats'], ['biceps', 'mid_back', 'forearms'], 'Dead hang to chin over bar, no swing.'],
    ['Barbell row', 'weights', 'back', ['mid_back', 'lats'], ['rear_delts', 'biceps', 'lower_back'], 'Hinge to 45 degrees, pull to the belly button.'],
    ['Lat pulldown', 'weights', 'back', ['lats'], ['biceps'], 'Pull the bar to the top of the chest, elbows down.'],
    ['Shrug', 'weights', 'back', ['upper_back'], ['forearms'], 'Straight up to the ears, pause, no rolling.'],
    ['Deadlift', 'weights', 'back', ['lower_back', 'hamstrings', 'glute_max'], ['upper_back', 'forearms', 'quads'], 'Bar over mid foot, push the floor away, flat back.'],
    ['Overhead press', 'weights', 'shoulders', ['front_delts'], ['side_delts', 'triceps', 'deep_core'], 'Squeeze glutes, press in a straight line, head through.'],
    ['Lateral raise', 'weights', 'shoulders', ['side_delts'], [], 'Lead with elbows, stop at shoulder height.'],
    ['Face pull', 'weights', 'shoulders', ['rear_delts', 'rotator_cuff'], ['upper_back'], 'Pull to the forehead, thumbs back.'],
    ['Band external rotation', 'mobility', 'shoulders', ['rotator_cuff'], ['rear_delts'], 'Elbow pinned to the side, rotate out slowly.'],
    ['Barbell curl', 'weights', 'arms', ['biceps'], ['forearms'], 'Elbows still, full stretch at the bottom.'],
    ['Triceps pushdown', 'weights', 'arms', ['triceps'], [], 'Elbows at the sides, lock out fully.'],
    ['Farmer carry', 'weights', 'full_body', ['stability', 'forearms'], ['upper_back', 'deep_core'], 'Heavy, tall posture, short steps.'],
    ['Towel hang', 'bodyweight', 'arms', ['forearms'], ['lats'], 'Towel over the bar, hold 20-30 s at a hard effort.'],
    ['Plank', 'bodyweight', 'core', ['deep_core'], ['abs'], 'Ribs down, squeeze glutes, breathe.'],
    ['Hanging leg raise', 'bodyweight', 'core', ['abs', 'hip_flexors'], ['forearms'], 'Curl the pelvis up, no swinging.'],
    ['Side plank', 'bodyweight', 'core', ['obliques'], ['glute_med'], 'Hips high, straight line head to heel.'],
    ['Pallof press', 'weights', 'core', ['obliques', 'deep_core'], [], 'Press out and resist the twist.'],
    ['Back squat', 'weights', 'legs', ['quads', 'glute_max'], ['adductors', 'lower_back'], 'Brace, sit between the heels, knees track toes.'],
    ['Romanian deadlift', 'weights', 'legs', ['hamstrings'], ['glute_max', 'lower_back'], 'Push hips back, bar close to the legs.'],
    ['Bulgarian split squat', 'weights', 'legs', ['quads', 'glute_max'], ['adductors', 'glute_med'], 'Back foot on a bench, drop straight down.'],
    ['Standing calf raise', 'weights', 'legs', ['calves'], [], 'Full stretch at the bottom, pause at the top.'],
    ['Copenhagen plank', 'bodyweight', 'legs', ['adductors'], ['obliques'], 'Top leg on a bench, hold the hips up.'],
    ['Wall sit', 'bodyweight', 'legs', ['knee_tendons', 'quads'], [], 'Thighs parallel, hold at a 7/10 effort.'],
    ['Spanish squat hold', 'bodyweight', 'legs', ['knee_tendons'], ['quads'], 'Band behind the knees, sit back and hold.'],
    ['Hip thrust', 'weights', 'glutes', ['glute_max'], ['hamstrings'], 'Chin tucked, ribs down, squeeze at the top.'],
    ['Banded lateral walk', 'bodyweight', 'glutes', ['glute_med'], [], 'Band above the knees, small steps, toes forward.'],
    ['Kettlebell swing', 'weights', 'full_body', ['power', 'glute_max'], ['hamstrings', 'conditioning'], 'Snap the hips, arms just guide the bell.'],
    ['Burpee', 'bodyweight', 'full_body', ['conditioning'], ['mid_chest', 'quads'], 'Chest to floor, jump at the top.'],
    ['Rowing machine', 'cardio', 'full_body', ['conditioning'], ['lats', 'quads'], 'Legs, then body, then arms.'],
    ['Running', 'cardio', 'legs', ['conditioning'], ['calves', 'quads'], 'Easy pace you could talk at, most of the time.'],
    ['Cycling', 'cardio', 'legs', ['conditioning'], ['quads'], 'Steady cadence, 80-90 rpm.'],
    ['Skipping', 'cardio', 'full_body', ['conditioning'], ['calves'], 'Light bounces on the balls of the feet.'],
    ['Couch stretch', 'stretches', 'glutes', ['hip_flexors'], ['quads'], 'Back knee against a wall, squeeze the glute.'],
    ['Hamstring stretch', 'stretches', 'legs', ['hamstrings'], [], 'Hinge at the hips with a flat back, 30 s.'],
    ['Doorway pec stretch', 'stretches', 'chest', ['mid_chest'], ['front_delts'], 'Forearm on the frame, step through gently.'],
    ['Child\'s pose', 'stretches', 'back', ['lats', 'lower_back'], [], 'Reach long, sink the hips back.'],
    ['Cat-cow', 'mobility', 'back', ['lower_back', 'mid_back'], [], 'Slow, one vertebra at a time.'],
    ['90/90 hip switch', 'mobility', 'glutes', ['glute_med', 'hip_flexors'], [], 'Sit tall, rotate the knees side to side.'],
    ['Ankle wall drill', 'mobility', 'legs', ['calves'], ['knee_tendons'], 'Knee to the wall, heel down.']
  ],
  logic: {
    region: function(key) {
      var G = RPGACE.modules.exerciseLibrary.GROUPS, out = null;
      Object.keys(G).forEach(function(g) { G[g][1].forEach(function(r) { if (r[0] === key) out = { key: key, label: r[1], group: g }; }); });
      return out;
    },
    regionKeys: function() {
      var G = RPGACE.modules.exerciseLibrary.GROUPS, out = [];
      Object.keys(G).forEach(function(g) { G[g][1].forEach(function(r) { out.push(r[0]); }); });
      return out;
    },
    norm: function(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); },
    // Pure: video rows + starter list -> one list, video rows win on name.
    merge: function(rows) {
      var self = RPGACE.modules.exerciseLibrary, L = self.logic, seen = {}, out = [];
      (rows || []).filter(function(r) { return r.status !== 'dropped'; }).forEach(function(r) {
        var k = L.norm(r.name); if (!k || seen[k]) return; seen[k] = 1;
        out.push({ name: r.name, discipline: r.discipline, group: r.muscle_group, primary: r.primary_regions || [], secondary: r.secondary_regions || [], cue: r.cue || '', video: r.video_url || null, videoTitle: r.video_title || '', fromVideo: true, id: r.id });
      });
      self.STARTER.forEach(function(s) {
        var k = L.norm(s[0]); if (seen[k]) return; seen[k] = 1;
        out.push({ name: s[0], discipline: s[1], group: s[2], primary: s[3], secondary: s[4], cue: s[5], video: null, fromVideo: false });
      });
      return out;
    },
    // Pure: which regions of `group` a combo hits. full = a primary target,
    // part = only a secondary one. gaps -> up to 2 suggestions each, video first.
    coverage: function(group, combo, lib) {
      var self = RPGACE.modules.exerciseLibrary, regs = (self.GROUPS[group] || ['', []])[1], names = {};
      (combo || []).forEach(function(x) { names[RPGACE.modules.exerciseLibrary.logic.norm(x.name)] = 1; });
      return regs.map(function(r) {
        var full = (combo || []).some(function(x) { return x.primary.indexOf(r[0]) >= 0; });
        var part = !full && (combo || []).some(function(x) { return x.secondary.indexOf(r[0]) >= 0; });
        var sugg = full ? [] : (lib || []).filter(function(x) { return !names[self.logic.norm(x.name)] && x.primary.indexOf(r[0]) >= 0; })
          .sort(function(a, b) { return (b.fromVideo ? 1 : 0) - (a.fromVideo ? 1 : 0); }).slice(0, 2);
        return { key: r[0], label: r[1], state: full ? 'full' : part ? 'part' : 'gap', suggest: sugg };
      });
    },
    // GM-7: sets per muscle group over recent gym sessions (names matched to
    // the library), least-trained first. Pure.
    groupLoad: function(sessions, lib) {
      var self = RPGACE.modules.exerciseLibrary, L = self.logic, byName = {}, n = {};
      (lib || []).forEach(function(x) { byName[L.norm(x.name)] = x.group; });
      Object.keys(self.GROUPS).forEach(function(g) { n[g] = 0; });
      (sessions || []).forEach(function(s) { (s.gym_sets || []).forEach(function(st) { var g = byName[L.norm(st.exercise)]; if (g && n[g] != null) n[g]++; }); });
      return Object.keys(n).map(function(g) { return { group: g, label: self.GROUPS[g][0], sets: n[g] }; })
        .sort(function(a, b) { return a.sets - b.sets; });
    },
    // Groups a combo touches (its exercises' own groups plus groups of their primary regions).
    groupsOf: function(combo) {
      var L = RPGACE.modules.exerciseLibrary.logic, out = [];
      (combo || []).forEach(function(x) {
        [x.group].concat(x.primary.map(function(k) { var r = L.region(k); return r && r.group; })).forEach(function(g) { if (g && out.indexOf(g) < 0) out.push(g); });
      });
      return out;
    },
    // Never trust model JSON: keep only known disciplines/groups/regions.
    sanitize: function(list, report) {
      var self = RPGACE.modules.exerciseLibrary, L = self.logic, keys = L.regionKeys();
      var D = self.DISCIPLINES.map(function(d) { return d[0]; }), seen = {};
      return (Array.isArray(list) ? list : []).map(function(x) {
        x = x || {};
        var name = String(x.name || '').replace(/\s+/g, ' ').trim().slice(0, 60), k = L.norm(name);
        if (!k || seen[k]) return null; seen[k] = 1;
        var prim = (Array.isArray(x.primary) ? x.primary : []).filter(function(r) { return keys.indexOf(r) >= 0; }).slice(0, 4);
        var sec = (Array.isArray(x.secondary) ? x.secondary : []).filter(function(r) { return keys.indexOf(r) >= 0 && prim.indexOf(r) < 0; }).slice(0, 5);
        var g = self.GROUPS[x.group] ? x.group : (prim[0] && L.region(prim[0]) ? L.region(prim[0]).group : null);
        if (!g || !prim.length) return null;
        return { name: name, discipline: D.indexOf(x.discipline) >= 0 ? x.discipline : 'weights', muscle_group: g, primary_regions: prim, secondary_regions: sec,
          cue: String(x.cue || '').slice(0, 160) || null, status: 'kept', intel_report_id: report.id, video_url: report.url || null, video_title: String(report.title || '').slice(0, 160) };
      }).filter(Boolean).slice(0, 8);
    },
    load: function() {
      return RPGACE.sb.select('exercises', 'select=*&order=created_at.desc&limit=500').then(function(r) { return Array.isArray(r) ? r : []; });
    },
    pending: function() {
      return RPGACE.sb.select('intel_reports', 'select=id,title,url,insights,transcript_snippet,realms&realms=cs.{athlete}&exercises_scanned_at=is.null&order=created_at.desc&limit=10')
        .then(function(r) { return (Array.isArray(r) ? r : []).filter(function(x) { return (x.realms || []).indexOf('athlete') >= 0 && !x.exercises_scanned_at; }); });
    },
    // One cheap-model call per video write-up.
    extract: function(report) {
      var self = RPGACE.modules.exerciseLibrary, pp = RPGACE.modules.phylumPath, ins = report.insights || {};
      var lines = [];
      (ins.quests || []).forEach(function(q) { if (q && (q.realm === 'athlete' || q.category === 'athlete')) lines.push('- ' + (q.name || '') + ': ' + (q.action || '')); });
      ['summary', 'key_points', 'takeaways'].forEach(function(f) { var v = ins[f]; if (v) lines.push(Array.isArray(v) ? v.join('\n') : String(v)); });
      if (report.transcript_snippet) lines.push(String(report.transcript_snippet));
      return pp._condenseIfLarge(lines.join('\n'), 'exercise_extract').then(function(text) {
        var prompt = RPGACE.prompt('exercise_extract', { regions: self.logic.regionKeys().join(', '), title: report.title || '', text: text });
        return pp._callGroundWorkerJSON(prompt, 900, pp.MECHANICAL_MODEL);
      }).then(function(j) { return self.logic.sanitize(j && j.exercises, report); });
    },
    saveReview: function(report, kept, existing) {
      var L = RPGACE.modules.exerciseLibrary.logic, have = {};
      (existing || []).forEach(function(r) { have[L.norm(r.name)] = 1; });
      var rows = (kept || []).filter(function(r) { return !have[L.norm(r.name)]; });
      var w = rows.length ? RPGACE.sb.secureWrite('exercises', 'insert', rows) : Promise.resolve();
      return w.then(function() {
        return RPGACE.sb.update('intel_reports', 'id=eq.' + report.id, { exercises_scanned_at: new Date().toISOString() });
      }).then(function() { RPGACE.cache.clear('exercises'); RPGACE.cache.clear('intel_reports'); return rows.length; });
    },
    taskType: function(discipline) { return discipline === 'cardio' ? 'cardio' : (discipline === 'stretches' || discipline === 'mobility') ? 'mobility' : 'strength'; },
    // A combo becomes Athlete tasks (one per exercise) through the one task path.
    addAsTasks: function(combo) {
      var rt = RPGACE.modules.realmTasks, L = RPGACE.modules.exerciseLibrary.logic;
      if (!rt) return Promise.reject(new Error('Realm tasks not loaded'));
      var regs = function(x) { return x.primary.map(function(k) { var r = L.region(k); return r ? r.label : k; }).join(', '); };
      return (combo || []).reduce(function(p, x) {
        return p.then(function(n) {
          return rt.logic.keepIdea({ realm: 'athlete', title: x.name, notes: [regs(x), x.cue].filter(Boolean).join(' · '), kind: 'repeat', source: 'exercise_library' })
            .then(function() { return n + 1; });
        });
      }, Promise.resolve(0));
    },
  },
  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, cls) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls;
      b.style.cssText = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:14px;cursor:pointer;';
      return b;
    },
    // GM-7: pick a 2-4 exercise combo for a mission (Plan block). Groups you
    // trained least in the last 4 weeks come first; the region coverage line
    // is the same logic.coverage the library page uses. cb({title, detail}).
    pickCombo: function(box, cb, back) {
      var self = RPGACE.modules.exerciseLibrary, L = self.logic, U = self.ui, esc = U._esc;
      var since = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
      box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading your exercises…</div>';
      Promise.all([L.load().catch(function() { return []; }), RPGACE.sb.select('gym_sessions', 'select=performed_on,gym_sets(exercise)&performed_on=gte.' + since).catch(function() { return []; })]).then(function(r) {
        var lib = L.merge(r[0]), load = L.groupLoad(r[1] || [], lib), picked = [], group = null;
        var draw = function() {
          box.innerHTML = '';
          var h = document.createElement('div'); h.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;';
          h.textContent = group ? 'Pick 2-4 for ' + self.GROUPS[group][0] + '.' : 'Least trained in the last 4 weeks first.';
          box.appendChild(h);
          if (!group) {
            var grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;';
            load.forEach(function(g) {
              var b = U._btn(''); b.className = 'exc-group'; b.dataset.group = g.group; b.style.textAlign = 'left';
              b.innerHTML = esc(g.label) + '<br><span style="font-size:12px;color:var(--muted);">' + (g.sets ? g.sets + ' set' + (g.sets === 1 ? '' : 's') + ' in 4 wks' : 'not trained lately') + '</span>';
              b.onclick = function() { group = g.group; picked = []; draw(); };
              grid.appendChild(b);
            });
            box.appendChild(grid);
            if (back) { var bk = U._btn('Back'); bk.style.cssText += 'width:100%;margin-top:8px;'; bk.onclick = back; box.appendChild(bk); }
            return;
          }
          var regs = self.GROUPS[group][1].map(function(x) { return x[0]; });
          lib.filter(function(x) { return x.group === group || x.primary.some(function(k) { return regs.indexOf(k) >= 0; }); }).forEach(function(x) {
            var on = picked.indexOf(x) >= 0;
            var lab = document.createElement('label'); lab.className = 'exc-ex';
            lab.style.cssText = 'display:flex;gap:10px;align-items:center;min-height:44px;padding:4px 0;border-bottom:1px solid var(--border);cursor:pointer;';
            lab.innerHTML = '<input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (on ? ' checked' : '') + '><span style="flex:1;min-width:0;">' + esc(x.name) + '<br><span style="font-size:12px;color:var(--muted);">' + esc(x.primary.map(function(k) { var rg = L.region(k); return rg ? rg.label : k; }).join(', ') + (x.fromVideo ? ' · from a video' : '')) + '</span></span>';
            lab.querySelector('input').onchange = function(ev) { if (ev.target.checked) { if (picked.length >= 4) { ev.target.checked = false; RPGACE.utils.toast('Four is plenty for one combo', '#E2A83D', 2000); return; } picked.push(x); } else picked = picked.filter(function(y) { return y !== x; }); draw(); };
            box.appendChild(lab);
          });
          var cov = L.coverage(group, picked, lib);
          var cl = document.createElement('div'); cl.id = 'exc-cov'; cl.style.cssText = 'font-size:12px;margin:8px 0;';
          cl.innerHTML = cov.map(function(c) { return '<span style="color:' + (c.state === 'full' ? 'var(--green)' : c.state === 'part' ? 'var(--gold)' : 'var(--muted)') + ';">' + (c.state === 'full' ? '●' : c.state === 'part' ? '◐' : '○') + ' ' + esc(c.label) + '</span>'; }).join(' &nbsp; ');
          box.appendChild(cl);
          var use = U._btn('Use combo (' + picked.length + ')'); use.id = 'exc-use'; use.style.cssText += 'width:100%;background:var(--gold);color:#111;font-weight:700;';
          use.disabled = picked.length < 2;
          use.onclick = function() { cb({ title: self.GROUPS[group][0] + ': ' + picked.map(function(x) { return x.name; }).join(' + '), detail: picked.map(function(x) { return x.name + (x.cue ? ' - ' + x.cue : ''); }).join('\n') }); };
          box.appendChild(use);
          var bg = U._btn('Other group'); bg.style.cssText += 'width:100%;margin-top:6px;'; bg.onclick = function() { group = null; picked = []; draw(); };
          box.appendChild(bg);
        };
        draw();
      });
    },
    // Line on the Gym page: library button + "N videos to review" when there are some.
    mountGym: function(box) {
      var self = RPGACE.modules.exerciseLibrary, U = self.ui;
      var row = document.createElement('div'); row.id = 'gym-exlib'; row.style.cssText = 'display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:16px;';
      var lib = U._btn('📚 Exercise library & combos'); lib.id = 'gym-exlib-open'; lib.onclick = function() { U.open(); };
      row.appendChild(lib); box.appendChild(row);
      self.logic.pending().then(function(list) {
        if (!list.length || !row.isConnected) return;
        var rv = U._btn('🎬 ' + list.length + ' gym video' + (list.length === 1 ? '' : 's') + ' with exercises to review'); rv.id = 'gym-exlib-review';
        rv.onclick = function() { U.openReview(list); };
        row.appendChild(rv);
      }).catch(function() {});
    },
    open: function(opts) {
      var self = RPGACE.modules.exerciseLibrary, L = self.logic, U = self.ui, esc = U._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🏋️ Gym', title: 'Exercise library', width: '640px', scroll: true });
      pop.box.id = 'exlib'; pop.box.textContent = 'Loading…';
      var state = { disc: (opts && opts.discipline) || 'weights', combo: [] };
      L.load().then(function(rows) {
        var lib = L.merge(rows);
        var draw = function() {
          pop.box.innerHTML = '';
          // Combo + coverage first: what you picked and what it misses.
          var cb = document.createElement('div'); cb.id = 'exlib-combo';
          cb.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px;background:var(--panel);';
          if (!state.combo.length) cb.innerHTML = '<div style="color:var(--muted);font-size:13px;">Tap exercises to build a combo. It shows which parts of each muscle group you hit and suggests exercises for the gaps.</div>';
          else {
            cb.innerHTML = '<div style="font-weight:700;margin-bottom:6px;">Your combo (' + state.combo.length + '): ' + esc(state.combo.map(function(x) { return x.name; }).join(', ')) + '</div>';
            L.groupsOf(state.combo).forEach(function(g) {
              var cov = L.coverage(g, state.combo, lib);
              var gl = document.createElement('div'); gl.className = 'exlib-cov'; gl.dataset.group = g; gl.style.cssText = 'margin:6px 0;font-size:13px;';
              gl.innerHTML = '<b>' + esc(self.GROUPS[g][0]) + '</b> ' + cov.map(function(c) { return '<span class="exlib-reg" data-reg="' + c.key + '" data-state="' + c.state + '" style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:12px;border:1px solid var(--border);' + (c.state === 'full' ? 'background:rgba(61,170,110,0.18);' : c.state === 'part' ? 'background:rgba(224,168,76,0.15);' : 'opacity:.7;') + '">' + (c.state === 'full' ? '✓ ' : c.state === 'part' ? '½ ' : '✗ ') + esc(c.label) + '</span>'; }).join('');
              cb.appendChild(gl);
              cov.filter(function(c) { return c.suggest.length; }).forEach(function(c) {
                var sg = document.createElement('div'); sg.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:2px 0 6px;font-size:12px;color:var(--muted);';
                sg.appendChild(document.createTextNode('For ' + c.label.toLowerCase() + ':'));
                c.suggest.forEach(function(x) {
                  var b = U._btn('＋ ' + x.name + (x.fromVideo ? ' 🎬' : ''), 'exlib-suggest'); b.dataset.name = x.name; b.style.minHeight = '36px'; b.style.fontSize = '13px';
                  b.onclick = function() { state.combo.push(x); draw(); };
                  sg.appendChild(b);
                });
                cb.appendChild(sg);
              });
            });
            var add = U._btn('➕ Add combo as Athlete tasks', 'exlib-add'); add.style.width = '100%'; add.style.marginTop = '6px';
            add.onclick = function() {
              add.disabled = true;
              L.addAsTasks(state.combo).then(function(n) { RPGACE.utils.toast('➕ ' + n + ' Athlete task' + (n === 1 ? '' : 's') + ' added — give them a rhythm in Tasks to make them a routine', '#3DAA6E', 4000, 'exerciseLibrary'); add.disabled = false; })
                .catch(function(e) { add.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'exerciseLibrary'); });
            };
            var clr = U._btn('Clear combo'); clr.style.width = '100%'; clr.style.marginTop = '6px'; clr.onclick = function() { state.combo = []; draw(); };
            cb.appendChild(add); cb.appendChild(clr);
          }
          pop.box.appendChild(cb);
          // Discipline tabs.
          var tabs = document.createElement('div'); tabs.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
          self.DISCIPLINES.forEach(function(d) {
            var n = lib.filter(function(x) { return x.discipline === d[0]; }).length;
            var t = U._btn(d[1] + ' ' + n, 'exlib-tab'); t.dataset.disc = d[0];
            if (d[0] === state.disc) { t.style.background = 'var(--gold)'; t.style.color = '#111'; }
            t.onclick = function() { state.disc = d[0]; draw(); };
            tabs.appendChild(t);
          });
          pop.box.appendChild(tabs);
          // Muscle groups with their exercises.
          Object.keys(self.GROUPS).forEach(function(g) {
            var xs = lib.filter(function(x) { return x.discipline === state.disc && x.group === g; });
            if (!xs.length) return;
            var h = document.createElement('div'); h.className = 'exlib-group'; h.dataset.group = g; h.style.cssText = 'font-weight:700;color:var(--gold);margin:12px 0 4px;';
            h.textContent = self.GROUPS[g][0] + ' · ' + self.GROUPS[g][1].map(function(r) { return r[1]; }).join(', ');
            pop.box.appendChild(h);
            xs.forEach(function(x) {
              var on = state.combo.some(function(c) { return L.norm(c.name) === L.norm(x.name); });
              var r = document.createElement('div'); r.className = 'exlib-ex'; r.dataset.name = x.name; r.dataset.video = x.fromVideo ? '1' : '0';
              r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:8px 10px;margin:4px 0;border:1px solid ' + (on ? 'var(--gold)' : 'var(--border)') + ';border-radius:8px;cursor:pointer;min-height:44px;';
              var regs = function(a) { return a.map(function(k) { var rr = L.region(k); return rr ? rr.label : k; }).join(', '); };
              r.innerHTML = '<div style="font-size:18px;">' + (on ? '☑' : '☐') + '</div><div style="flex:1;min-width:0;font-size:14px;"><b>' + esc(x.name) + '</b>' +
                '<div style="font-size:12px;color:var(--muted);">Works: ' + esc(regs(x.primary)) + (x.secondary.length ? ' · also ' + esc(regs(x.secondary)) : '') + '</div>' +
                (x.cue ? '<div style="font-size:12px;">' + esc(x.cue) + '</div>' : '') +
                '<div style="font-size:11px;color:var(--muted);">' + (x.fromVideo ? '🎬 From your video: ' + esc(x.videoTitle) : 'Starter list — not from your videos') + '</div></div>';
              if (x.video) {
                var a = document.createElement('a'); a.href = x.video; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '▶'; a.title = 'Open the video';
                a.style.cssText = 'min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;color:var(--gold);text-decoration:none;';
                a.onclick = function(e) { e.stopPropagation(); };
                r.appendChild(a);
              }
              r.onclick = function() {
                if (on) state.combo = state.combo.filter(function(c) { return L.norm(c.name) !== L.norm(x.name); }); else state.combo.push(x);
                draw();
              };
              pop.box.appendChild(r);
            });
          });
        };
        draw();
      }).catch(function(e) { pop.box.textContent = '⚠️ ' + (e.message || e); RPGACE.utils.toast('⚠️ Exercise library: ' + (e.message || e), '#CC4A4A', 4000, 'exerciseLibrary'); });
      return pop;
    },
    // Review: one cheap call per video, then Keep / Drop each before saving.
    openReview: function(list) {
      var self = RPGACE.modules.exerciseLibrary, L = self.logic, U = self.ui, esc = U._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎬 Gym videos', title: 'Exercises found — keep or drop', width: '600px', scroll: true });
      pop.box.id = 'exlib-review'; pop.box.textContent = 'Reading ' + list.length + ' video' + (list.length === 1 ? '' : 's') + '…';
      Promise.all([L.load()].concat(list.map(function(rep) { return L.extract(rep).then(function(xs) { return { rep: rep, xs: xs }; }, function(e) { return { rep: rep, xs: [], err: e.message || String(e) }; }); })))
        .then(function(res) {
          var existing = res[0]; res = res.slice(1);
          pop.box.innerHTML = '';
          res.forEach(function(v) {
            var sec = document.createElement('div'); sec.className = 'exlib-rv-video'; sec.dataset.report = v.rep.id;
            var h = document.createElement('div'); h.style.cssText = 'font-weight:700;margin:10px 0 4px;'; h.textContent = '🎬 ' + (v.rep.title || 'Video');
            sec.appendChild(h);
            if (v.err) { var er = document.createElement('div'); er.style.color = '#CC4A4A'; er.textContent = '⚠️ ' + v.err + ' — try again later.'; sec.appendChild(er); pop.box.appendChild(sec); return; }
            var keep = v.xs.map(function() { return true; });
            v.xs.forEach(function(x, i) {
              var r = document.createElement('label'); r.className = 'exlib-rv-ex';
              r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;min-height:44px;';
              var cbx = document.createElement('input'); cbx.type = 'checkbox'; cbx.checked = true; cbx.style.cssText = 'width:22px;height:22px;';
              cbx.onchange = function() { keep[i] = cbx.checked; };
              var t = document.createElement('div');
              t.innerHTML = '<b>' + esc(x.name) + '</b> <span style="color:var(--muted);font-size:12px;">' + esc(x.discipline) + ' · ' + esc(self.GROUPS[x.muscle_group][0]) + '</span><div style="font-size:12px;color:var(--muted);">Works: ' +
                esc(x.primary_regions.map(function(k) { return L.region(k).label; }).join(', ')) + (x.secondary_regions.length ? ' · also ' + esc(x.secondary_regions.map(function(k) { return L.region(k).label; }).join(', ')) : '') + '</div>' + (x.cue ? '<div style="font-size:12px;">' + esc(x.cue) + '</div>' : '');
              r.appendChild(cbx); r.appendChild(t); sec.appendChild(r);
            });
            if (!v.xs.length) { var n = document.createElement('div'); n.style.color = 'var(--muted)'; n.textContent = 'No exercises in this one.'; sec.appendChild(n); }
            var save = U._btn(v.xs.length ? 'Save kept' : 'Mark as read', 'exlib-rv-save'); save.style.width = '100%'; save.style.marginTop = '6px';
            save.onclick = function() {
              save.disabled = true;
              L.saveReview(v.rep, v.xs.filter(function(x, i) { return keep[i]; }), existing).then(function(n) {
                sec.innerHTML = '<div style="color:#3DAA6E;margin:8px 0;">✓ ' + esc(v.rep.title || 'Video') + ': ' + n + ' exercise' + (n === 1 ? '' : 's') + ' saved to your library</div>';
              }).catch(function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'exerciseLibrary'); });
            };
            sec.appendChild(save);
            pop.box.appendChild(sec);
          });
        }).catch(function(e) { pop.box.textContent = '⚠️ ' + (e.message || e); });
      return pop;
    },
  },
  open: function(opts) { return this.ui.open(opts); },
});
/* ===END:exerciseLibrary=== */
