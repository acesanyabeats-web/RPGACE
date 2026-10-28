
/* ===MODULE:healthBody=== */
// Oct 14 2026 — "Health & body" plan (HB-1..HB-3; HB-4 steps waits on Alex's
// Google Health API check). Alex: calories + protein, weekly split + overload,
// plus body weight trend, water and sleep hours.
// - HB-1 food: a meal photo, a label photo or typed words -> Oracle lists items
//   with grams; each item is re-checked against cofid_foods through
//   cookingOracle.logic._lookupCofid (the same lookup Cooking's nutrition uses)
//   and the CoFID numbers win when it matches. "From your cooks" adds a serving
//   of a recipe cooked in the last 3 days (planned_cooks status cooked), per
//   serving from recipe_ingredients.grams_estimate x ingredients per-100g.
//   Rows land in food_log; daily totals vs health_settings targets show here
//   and on My Day.
// - HB-2 gym programme: health_settings.programme = {template, days{dow:name},
//   workouts{name:[{exercise,sets,rep_min,rep_max}]}}. Today's workout shows
//   last time's sets (gymTracker.logic.load, gym_sets) and an overload nudge;
//   "Start this workout" opens gymTracker.ui.openLog prefilled (one gym log).
// - HB-3 body: body_log rows (weight / water ml / sleep hours; steps later),
//   weight 7-day average, 14-day trends.
// food_log, body_log and health_settings are locked (authenticated only): every
// read goes through /api/data-write action 'read' via tripPlans.logic.read.
RPGACE.register('healthBody', {
  domain: 'habits',

  MEALS: ['breakfast', 'lunch', 'dinner', 'snack'],
  MEAL_LABELS: { breakfast: '🥣 Breakfast', lunch: '🥪 Lunch', dinner: '🍲 Dinner', snack: '🍎 Snacks' },
  DOW: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  // Starter programmes. rep ranges drive the overload nudge.
  TEMPLATES: {
    ppl: { label: 'Push / Pull / Legs', rotation: ['Push', 'Pull', 'Legs'], workouts: {
      Push: [{ exercise: 'Bench press', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Overhead press', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Incline dumbbell press', sets: 3, rep_min: 8, rep_max: 12 }, { exercise: 'Lateral raise', sets: 3, rep_min: 12, rep_max: 15 }, { exercise: 'Triceps pushdown', sets: 3, rep_min: 10, rep_max: 15 }],
      Pull: [{ exercise: 'Deadlift', sets: 3, rep_min: 4, rep_max: 6 }, { exercise: 'Pull-up', sets: 3, rep_min: 5, rep_max: 10 }, { exercise: 'Barbell row', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Face pull', sets: 3, rep_min: 12, rep_max: 15 }, { exercise: 'Biceps curl', sets: 3, rep_min: 8, rep_max: 12 }],
      Legs: [{ exercise: 'Squat', sets: 3, rep_min: 5, rep_max: 8 }, { exercise: 'Romanian deadlift', sets: 3, rep_min: 8, rep_max: 10 }, { exercise: 'Leg press', sets: 3, rep_min: 10, rep_max: 12 }, { exercise: 'Leg curl', sets: 3, rep_min: 10, rep_max: 15 }, { exercise: 'Calf raise', sets: 3, rep_min: 12, rep_max: 15 }] } },
    ul: { label: 'Upper / Lower', rotation: ['Upper', 'Lower'], workouts: {
      Upper: [{ exercise: 'Bench press', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Barbell row', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Overhead press', sets: 3, rep_min: 8, rep_max: 10 }, { exercise: 'Pull-up', sets: 3, rep_min: 5, rep_max: 10 }, { exercise: 'Biceps curl', sets: 2, rep_min: 10, rep_max: 12 }],
      Lower: [{ exercise: 'Squat', sets: 3, rep_min: 5, rep_max: 8 }, { exercise: 'Romanian deadlift', sets: 3, rep_min: 8, rep_max: 10 }, { exercise: 'Lunge', sets: 3, rep_min: 8, rep_max: 12 }, { exercise: 'Leg curl', sets: 3, rep_min: 10, rep_max: 15 }, { exercise: 'Calf raise', sets: 3, rep_min: 12, rep_max: 15 }] } },
    fb: { label: 'Full body', rotation: ['Full body A', 'Full body B'], workouts: {
      'Full body A': [{ exercise: 'Squat', sets: 3, rep_min: 5, rep_max: 8 }, { exercise: 'Bench press', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Barbell row', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Plank (seconds)', sets: 3, rep_min: 30, rep_max: 60 }],
      'Full body B': [{ exercise: 'Deadlift', sets: 3, rep_min: 4, rep_max: 6 }, { exercise: 'Overhead press', sets: 3, rep_min: 6, rep_max: 10 }, { exercise: 'Pull-up', sets: 3, rep_min: 5, rep_max: 10 }, { exercise: 'Lunge', sets: 3, rep_min: 8, rep_max: 12 }] } },
  },
  KG_STEP: 2.5,
  _s: null,

  init: function() {},

  logic: {
    iso: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    addDays: function(isoDate, n) { var d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() + n); return RPGACE.modules.healthBody.logic.iso(d); },
    signedIn: function() { var tp = RPGACE.modules.tripPlans; return !!(tp && tp.logic.signedIn()); },
    read: function(table, params) { return RPGACE.modules.tripPlans.logic.read(table, params); },
    round: function(n, dp) { var f = Math.pow(10, dp || 0); return Math.round((Number(n) || 0) * f) / f; },

    loadSettings: function() {
      var self = RPGACE.modules.healthBody;
      return self.logic.read('health_settings', 'select=*&id=eq.1').then(function(r) { self._s = r[0] || { id: 1, water_target_ml: 2000, glass_ml: 250, sleep_target_h: 8 }; return self._s; });
    },
    loadDay: function(day) {
      var L = RPGACE.modules.healthBody.logic;
      return Promise.all([L.loadSettings(), L.read('food_log', 'select=*&eaten_on=eq.' + day + '&order=created_at.asc'),
        L.read('body_log', 'select=*&logged_on=gte.' + L.addDays(day, -13) + '&logged_on=lte.' + day + '&order=logged_on.asc,created_at.asc')])
        .then(function(r) { return { settings: r[0], food: r[1], body: r[2], day: day }; });
    },
    loadRange: function(day, days) {
      var L = RPGACE.modules.healthBody.logic, from = L.addDays(day, -(days - 1));
      return Promise.all([L.loadSettings(), L.read('food_log', 'select=eaten_on,kcal,protein_g&eaten_on=gte.' + from + '&limit=2000'),
        L.read('body_log', 'select=*&logged_on=gte.' + L.addDays(from, -6) + '&order=logged_on.asc,created_at.asc&limit=2000')])
        .then(function(r) { return { settings: r[0], food: r[1], body: r[2], from: from, day: day, days: days }; });
    },
    totals: function(food) {
      var L = RPGACE.modules.healthBody.logic, k = 0, p = 0;
      (food || []).forEach(function(f) { k += Number(f.kcal) || 0; p += Number(f.protein_g) || 0; });
      return { kcal: L.round(k), protein: L.round(p) };
    },
    // Body numbers for one day: water summed, weight/sleep latest, steps max.
    bodyOn: function(rows, day) {
      var out = { water: 0, weight: null, sleep: null, steps: null };
      (rows || []).filter(function(r) { return r.logged_on === day; }).forEach(function(r) {
        var v = Number(r.value) || 0;
        if (r.kind === 'water') out.water += v;
        else if (r.kind === 'weight') out.weight = v;
        else if (r.kind === 'sleep') out.sleep = v;
        else if (r.kind === 'steps') out.steps = Math.max(out.steps || 0, v);
      });
      return out;
    },
    // Trailing 7-day average of logged weights up to `day` (null when none).
    weightAvg: function(rows, day) {
      var L = RPGACE.modules.healthBody.logic, from = L.addDays(day, -6), byDay = {};
      (rows || []).forEach(function(r) { if (r.kind === 'weight' && r.logged_on >= from && r.logged_on <= day) byDay[r.logged_on] = Number(r.value); });
      var v = Object.keys(byDay).map(function(k) { return byDay[k]; });
      return v.length ? L.round(v.reduce(function(a, b) { return a + b; }, 0) / v.length, 1) : null;
    },
    mealFor: function(d) { var h = (d || new Date()).getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h >= 17 && h < 22 ? 'dinner' : 'snack'; },
    saveSettings: function(patch) {
      var self = RPGACE.modules.healthBody, row = Object.assign({ id: 1 }, patch, { updated_at: new Date().toISOString() });
      return RPGACE.sb.secureWrite('health_settings', 'insert', row, null, 'id').then(function() { self._s = Object.assign({}, self._s || {}, row); return self._s; });
    },
    num: function(v) { if (v === '' || v == null) return null; var n = Number(v); return isFinite(n) && n >= 0 ? n : NaN; },
    cleanFood: function(it, day, meal) {
      var L = RPGACE.modules.healthBody.logic;
      var name = String(it.name || '').trim().slice(0, 120);
      if (!name) throw new Error('Every item needs a name');
      var kcal = L.num(it.kcal), prot = L.num(it.protein_g), g = L.num(it.grams);
      if (isNaN(kcal) || isNaN(prot) || isNaN(g)) throw new Error('Numbers only for grams, kcal and protein (' + name + ')');
      return { eaten_on: day, meal: meal, name: name, grams: g, kcal: L.round(kcal || 0), protein_g: L.round(prot || 0, 1),
        source: it.source || 'manual', matched_food: it.matched_food || null, recipe_id: it.recipe_id || null, servings: it.servings || null };
    },
    addFood: function(items, day, meal) {
      var L = RPGACE.modules.healthBody.logic, rows;
      try { rows = items.map(function(it) { return L.cleanFood(it, day, meal); }); } catch (e) { return Promise.reject(e); }
      if (!rows.length) return Promise.reject(new Error('Nothing to add'));
      return RPGACE.sb.secureWrite('food_log', 'insert', rows);
    },
    removeFood: function(id) { return RPGACE.sb.secureWrite('food_log', 'delete', null, 'id=eq.' + id); },
    addBody: function(kind, value, day, source) {
      var v = Number(value);
      if (!isFinite(v) || v < 0) return Promise.reject(new Error('Enter a number'));
      var lim = { weight: 400, water: 10000, sleep: 24, steps: 200000 }[kind];
      if (v > lim) return Promise.reject(new Error('That looks too high for ' + kind));
      return RPGACE.sb.secureWrite('body_log', 'insert', { kind: kind, value: v, logged_on: day, source: source || 'manual' });
    },
    removeBody: function(id) { return RPGACE.sb.secureWrite('body_log', 'delete', null, 'id=eq.' + id); },

    // ── reading food with Oracle ─────────────────────────────────────
    ITEMS_RULES: 'Return ONLY one JSON object on a single line, no other text: {"items":[{"name":"scrambled eggs","grams":120,"kcal":180,"protein_g":12}]}. ' +
      'One entry per separate food; name = a plain generic food name (e.g. "white rice, boiled", "chicken breast, grilled"); grams = your best estimate of the portion; ' +
      'kcal and protein_g for that portion (UK food tables). If nothing edible is shown, return {"items":[]}.',
    parseJson: function(raw) {
      if (raw && typeof raw === 'object') return raw;
      var t = String(raw || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
    },
    parseItems: function(raw, source) {
      var L = RPGACE.modules.healthBody.logic, o = L.parseJson(raw);
      var list = o && (Array.isArray(o) ? o : o.items);
      if (!Array.isArray(list)) return null;
      var n = function(v) { var x = Number(v); return isFinite(x) && x >= 0 ? x : null; };
      return list.filter(function(x) { return x && typeof x.name === 'string' && x.name.trim(); }).slice(0, 15).map(function(x) {
        return { name: x.name.trim().slice(0, 120), grams: n(x.grams), kcal: n(x.kcal) || 0, protein_g: n(x.protein_g) || 0, source: source, matched_food: null };
      });
    },
    readMeal: function(image) {
      var L = RPGACE.modules.healthBody.logic;
      return RPGACE.utils.oracleVision(image, 'You estimate nutrition from photos of meals. ' + L.ITEMS_RULES, 'List the foods on this plate or in this photo with portion sizes.', 700)
        .then(function(t) { var it = L.parseItems(t, 'photo'); if (!it) throw new Error('Oracle\'s answer could not be read - try again'); return it; });
    },
    readText: function(text) {
      var L = RPGACE.modules.healthBody.logic, pp = RPGACE.modules.phylumPath;
      if (!pp || !pp.logic._callGroundWorkerJSON) return Promise.reject(new Error('Oracle is not available'));
      return pp.logic._callGroundWorkerJSON('Alex ate: "' + String(text).slice(0, 400) + '". Split it into separate foods. ' + L.ITEMS_RULES, 700)
        .then(function(o) { var it = L.parseItems(o, 'typed'); if (!it) throw new Error('Oracle\'s answer could not be read - try again'); return it; });
    },
    parseLabel: function(raw) {
      var L = RPGACE.modules.healthBody.logic, o = L.parseJson(raw);
      if (!o || typeof o !== 'object') return null;
      var n = function(v) { var x = Number(v); return isFinite(x) && x >= 0 ? x : null; };
      var per = o.per100 || {};
      var out = { name: String(o.name || 'Packaged food').trim().slice(0, 120), kcal100: n(per.kcal), protein100: n(per.protein_g), serving_g: n(o.serving_g) };
      if (out.kcal100 == null) return null;
      return out;
    },
    readLabel: function(image) {
      var L = RPGACE.modules.healthBody.logic;
      return RPGACE.utils.oracleVision(image, 'You read UK/EU nutrition labels. Return ONLY one JSON object on a single line: {"name":"product name","per100":{"kcal":0,"protein_g":0},"serving_g":0}. ' +
        'Use the per 100g (or 100ml) column; kcal not kJ. serving_g = the pack\'s stated portion in grams, or 0 if none. If no label is readable return {"name":"","per100":{}}.', 'Read this nutrition label.', 400)
        .then(function(t) { var l = L.parseLabel(t); if (!l) throw new Error('No nutrition label could be read - try a sharper photo'); return l; });
    },
    labelItem: function(label, grams) {
      var L = RPGACE.modules.healthBody.logic, g = Number(grams) || label.serving_g || 100;
      return { name: label.name, grams: g, kcal: L.round(label.kcal100 * g / 100), protein_g: L.round((label.protein100 || 0) * g / 100, 1), source: 'label', matched_food: 'pack label' };
    },
    // CoFID check: when the food matches and grams are known, its numbers win.
    checkItem: function(it) {
      var co = RPGACE.modules.cookingOracle, L = RPGACE.modules.healthBody.logic;
      if (!co || !co.logic._lookupCofid || !it.grams) return Promise.resolve(it);
      return new Promise(function(resolve) {
        co.logic._lookupCofid(it.name, function(err, d) {
          if (err || !d || !d.matched || typeof d.kcal_per_100g !== 'number') { resolve(it); return; }
          resolve(Object.assign({}, it, { kcal: L.round(d.kcal_per_100g * it.grams / 100), protein_g: L.round((d.protein_g_per_100g || 0) * it.grams / 100, 1), matched_food: d.fdcDescription, oracle_kcal: it.kcal }));
        });
      });
    },
    checkAll: function(items) { var L = RPGACE.modules.healthBody.logic; return Promise.all((items || []).map(L.checkItem)); },

    // ── cooked recipes, per serving ──────────────────────────────────
    recentCooks: function(day) {
      var L = RPGACE.modules.healthBody.logic;
      return RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids,scheduled_at&status=eq.cooked&scheduled_at=gte.' + L.addDays(day, -3) + '&order=scheduled_at.desc&limit=10').then(function(pc) {
        var ids = [];
        (pc || []).forEach(function(c) { (c.recipe_ids || []).forEach(function(id) { if (ids.indexOf(id) === -1) ids.push(id); }); });
        if (!ids.length) return [];
        return Promise.all([
          RPGACE.sb.select('recipes', 'select=id,title,servings_base&id=in.(' + ids.join(',') + ')'),
          RPGACE.sb.select('recipe_ingredients', 'select=recipe_id,grams_estimate,ingredients(kcal_per_100g,protein_g_per_100g)&recipe_id=in.(' + ids.join(',') + ')'),
        ]).then(function(r) { return L.servingsOf(r[0] || [], r[1] || []); });
      });
    },
    servingsOf: function(recipes, ris) {
      var L = RPGACE.modules.healthBody.logic;
      return recipes.map(function(rc) {
        var k = 0, p = 0, known = 0, total = 0;
        ris.filter(function(x) { return x.recipe_id === rc.id; }).forEach(function(x) {
          total++;
          var ing = x.ingredients || {}, g = Number(x.grams_estimate);
          if (!g || typeof ing.kcal_per_100g !== 'number') return;
          known++; k += ing.kcal_per_100g * g / 100; p += (Number(ing.protein_g_per_100g) || 0) * g / 100;
        });
        var s = Math.max(1, Number(rc.servings_base) || 1);
        return { recipe_id: rc.id, name: rc.title, kcal: L.round(k / s), protein_g: L.round(p / s, 1), known: known, total: total };
      });
    },

    // ── HB-2 gym programme ───────────────────────────────────────────
    buildProgramme: function(tplKey, dows) {
      var self = RPGACE.modules.healthBody, t = self.TEMPLATES[tplKey];
      if (!t) throw new Error('Pick a programme');
      var days = (dows || []).map(Number).filter(function(d) { return d >= 0 && d <= 6; }).sort(function(a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
      if (!days.length) throw new Error('Pick at least one gym day');
      var map = {};
      days.forEach(function(d, i) { map[d] = t.rotation[i % t.rotation.length]; });
      return { template: tplKey, days: map, workouts: JSON.parse(JSON.stringify(t.workouts)) };
    },
    workoutOn: function(prog, isoDay) {
      if (!prog || !prog.days) return null;
      var dow = new Date(isoDay + 'T12:00:00').getDay(), name = prog.days[dow];
      if (!name) return null;
      return { name: name, exercises: (prog.workouts && prog.workouts[name]) || [] };
    },
    // Latest session that has this exercise: its sets, in order.
    lastSets: function(exercise, sessions) {
      var k = String(exercise).trim().toLowerCase();
      for (var i = 0; i < (sessions || []).length; i++) {
        var sets = (sessions[i].gym_sets || []).filter(function(x) { return String(x.exercise || '').trim().toLowerCase() === k; })
          .sort(function(a, b) { return (a.set_index || 0) - (b.set_index || 0); });
        if (sets.length) return { on: sessions[i].performed_on, sets: sets };
      }
      return null;
    },
    // Double progression: all sets at the top of the range -> add weight and
    // drop to the bottom; otherwise same weight, one more rep.
    suggest: function(ex, sessions) {
      var self = RPGACE.modules.healthBody, last = self.logic.lastSets(ex.exercise, sessions);
      var lo = Number(ex.rep_min) || 8, hi = Number(ex.rep_max) || lo;
      if (!last) return { kg: null, reps: lo, note: 'First time: pick a weight you can lift for ' + lo + '-' + hi + ' reps', last: null };
      var kg = Math.max.apply(null, last.sets.map(function(s) { return Number(s.weight_kg) || 0; }));
      var reps = last.sets.map(function(s) { return Number(s.reps) || 0; });
      var top = last.sets.filter(function(s) { return (Number(s.weight_kg) || 0) === kg; });
      var allTop = top.length >= (Number(ex.sets) || 1) && top.every(function(s) { return (Number(s.reps) || 0) >= hi; });
      if (allTop && kg > 0) return { kg: kg + self.KG_STEP, reps: lo, note: '⬆️ All sets hit ' + hi + ': add ' + self.KG_STEP + 'kg', last: last, up: true };
      var best = top.length ? Math.min.apply(null, top.map(function(s) { return Number(s.reps) || 0; })) : Math.max.apply(null, reps);
      var aim = Math.min(hi, Math.max(lo, best + 1));
      return { kg: kg || null, reps: aim, note: kg ? 'Same weight, aim for ' + aim + ' reps on every set' : 'Aim for ' + aim + ' reps', last: last };
    },
    planRows: function(workout, sessions) {
      var L = RPGACE.modules.healthBody.logic;
      return (workout.exercises || []).map(function(ex) { var s = L.suggest(ex, sessions); return { exercise: ex.exercise, sets: ex.sets || 3, reps: s.reps, kg: s.kg }; });
    },
    lastText: function(last) {
      if (!last) return 'Not done yet';
      return last.sets.map(function(s) { return (s.weight_kg != null ? s.weight_kg + 'kg' : 'bw') + '×' + (s.reps == null ? '?' : s.reps); }).join(', ') + ' (' + new Date(last.on + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')';
    },
  },

  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, kind) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'min-height:44px;padding:8px 12px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
        (kind === 'primary' ? 'background:var(--gold);border:none;color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
      return b;
    },
    _inp: function(type, id, val, ph) {
      var i = document.createElement('input'); i.type = type; if (id) i.id = id; if (val != null) i.value = val; if (ph) i.placeholder = ph;
      if (type === 'number') { i.min = '0'; i.step = 'any'; i.inputMode = 'decimal'; }
      i.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;width:100%;box-sizing:border-box;font-family:Rajdhani,sans-serif;min-width:0;';
      return i;
    },
    _h: function(parent, text) { var g = document.createElement('div'); g.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:14px 0 6px;'; g.textContent = text; parent.appendChild(g); return g; },
    _toastErr: function(e) { RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 3800, 'healthBody'); },
    _bar: function(label, v, target, unit, color) {
      var pct = target ? Math.min(100, Math.round(v / target * 100)) : 0;
      return '<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text);font-variant-numeric:tabular-nums;"><b>' + label + '</b><span>' +
        v.toLocaleString('en-GB') + (target ? ' / ' + Number(target).toLocaleString('en-GB') : '') + ' ' + unit + '</span></div>' +
        (target ? '<div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;margin-top:3px;"><div style="height:100%;width:' + pct + '%;background:' + color + ';"></div></div>' : '') + '</div>';
    },
    _arm: function(btn, label, onConfirm) { btn.textContent = label; RPGACE.kit.armConfirm(btn, onConfirm, 'Delete?'); },   // CK-6: RPGACE.kit
    _pickFile: function(cb) {
      var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none';
      f.onchange = function() { var file = f.files && f.files[0]; f.remove(); if (file) cb(file); };
      document.body.appendChild(f); f.click();
    },

    open: function(tab) {
      var self = RPGACE.modules.healthBody;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🏋️ Habits', title: '❤️ Health & body', width: '600px' });
      pop.box.id = 'health-body';
      self._pop = pop;
      var tabs = document.createElement('div'); tabs.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
      var body = document.createElement('div'); body.id = 'hb-body';
      pop.box.appendChild(tabs); pop.box.appendChild(body);
      var show = function(t) {
        tabs.innerHTML = '';
        // DR-9 (Oct 27 2026): the Gym plan lives on the one Gym page now.
        [['today', '🍽 Today'], ['trends', '📈 Trends'], ['targets', '🎯 Targets']].forEach(function(x) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'hb-tab'; b.dataset.tab = x[0]; b.textContent = x[1];
          b.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
            (x[0] === t ? 'background:var(--gold);border:none;color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
          b.onclick = function() { show(x[0]); };
          tabs.appendChild(b);
        });
        body.innerHTML = '<div style="color:var(--muted);font-size:13px;">Loading…</div>';
        var fail = function(e) { body.textContent = 'Could not load: ' + (e.message || e); };
        if (t === 'gym') self.ui.renderGym(body).catch(fail);
        else if (t === 'trends') self.ui.renderTrends(body).catch(fail);
        else if (t === 'targets') self.logic.loadSettings().then(function() { self.ui.renderTargets(body); }).catch(fail);
        else self.ui.renderToday(body).catch(fail);
      };
      self._show = show;
      if (!self.logic.signedIn()) { body.textContent = 'Sign in to see your health log.'; return pop; }
      if (tab === 'gym') { pop.close(); var gt = RPGACE.modules.gymTracker; return gt ? gt.ui.open() : null; }
      show(tab || 'today');
      return pop;
    },

    // ── Today ────────────────────────────────────────────────────────
    renderToday: function(body) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, esc = U._esc, day = L.iso();
      return L.loadDay(day).then(function(d) {
        body.innerHTML = '';
        var s = d.settings || {}, tot = L.totals(d.food), b = L.bodyOn(d.body, day);
        var head = document.createElement('div'); head.id = 'hb-totals';
        head.innerHTML = U._bar('🔥 Calories', tot.kcal, s.kcal_target, 'kcal', 'var(--gold)') + U._bar('🥩 Protein', tot.protein, s.protein_target, 'g', 'var(--purple)');
        body.appendChild(head);
        // SL-3 (Oct 27 2026): calorie + protein targets are set on the 🎯 Targets tab only.
        U._h(body, '+ Add food');
        var meal = document.createElement('select'); meal.id = 'hb-meal';
        meal.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;margin-bottom:8px;';
        meal.innerHTML = self.MEALS.map(function(m) { return '<option value="' + m + '">' + self.MEAL_LABELS[m] + '</option>'; }).join('');
        meal.value = L.mealFor(new Date());
        body.appendChild(meal);
        var acts = document.createElement('div'); acts.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;';
        var photo = U._btn('📷 Meal photo', 'primary'); photo.id = 'hb-photo';
        var label = U._btn('🏷 Label photo', ''); label.id = 'hb-label';
        var typed = U._btn('✍️ Type it', ''); typed.id = 'hb-typed';
        var cooks = U._btn('🍳 From your cooks', ''); cooks.id = 'hb-cooks';
        [photo, label, typed, cooks].forEach(function(x) { acts.appendChild(x); });
        body.appendChild(acts);
        var status = document.createElement('div'); status.id = 'hb-status'; status.style.cssText = 'font-size:13px;color:var(--muted);min-height:18px;margin:6px 0;';
        body.appendChild(status);
        var review = document.createElement('div'); review.id = 'hb-review'; body.appendChild(review);
        var redraw = function() { self.ui.renderToday(body).catch(U._toastErr); };
        var reviewItems = function(items, why) {
          status.textContent = '';
          if (!items.length) { status.textContent = 'Nothing found - try again or type it.'; return; }
          self.ui.renderReview(review, items, function() { return meal.value; }, day, redraw, why);
        };
        var busy = function(msg) { status.textContent = msg; };
        photo.onclick = function() {
          U._pickFile(function(file) {
            busy('Reading the photo…');
            RPGACE.utils.resizeImage(file, 1024).then(L.readMeal).then(function(items) { busy('Checking against UK food tables…'); return L.checkAll(items); })
              .then(function(items) { reviewItems(items, 'From your photo'); }).catch(function(e) { busy(''); U._toastErr(e); });
          });
        };
        label.onclick = function() {
          U._pickFile(function(file) {
            busy('Reading the label…');
            RPGACE.utils.resizeImage(file, 1280).then(L.readLabel).then(function(lab) { busy(''); self.ui.renderLabel(review, lab, function() { return meal.value; }, day, redraw); })
              .catch(function(e) { busy(''); U._toastErr(e); });
          });
        };
        typed.onclick = function() {
          review.innerHTML = '';
          var t = document.createElement('textarea'); t.id = 'hb-typed-text'; t.rows = 2; t.placeholder = 'e.g. 2 eggs, 2 slices of toast with butter, a latte';
          t.style.cssText = 'width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;font-family:Rajdhani,sans-serif;';
          var go = U._btn('Work it out', 'primary'); go.id = 'hb-typed-go'; go.style.marginTop = '6px';
          go.onclick = function() {
            if (!t.value.trim()) return;
            go.disabled = true; busy('Oracle is working it out…');
            L.readText(t.value.trim()).then(function(items) { busy('Checking against UK food tables…'); return L.checkAll(items); })
              .then(function(items) { reviewItems(items, 'From what you typed'); }).catch(function(e) { go.disabled = false; busy(''); U._toastErr(e); });
          };
          review.appendChild(t); review.appendChild(go); t.focus();
        };
        cooks.onclick = function() {
          busy('Looking at your recent cooks…'); review.innerHTML = '';
          L.recentCooks(day).then(function(list) {
            busy('');
            if (!list.length) { status.textContent = 'No cooks finished in the last 3 days. Finish a planned cook in Cooking and it shows here.'; return; }
            U._h(review, '🍳 A serving of…');
            list.forEach(function(r) {
              var row = document.createElement('div'); row.className = 'hb-cook'; row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);';
              var tx = document.createElement('div'); tx.style.cssText = 'flex:1;min-width:0;font-size:14px;color:var(--text);';
              tx.innerHTML = '<b>' + esc(r.name) + '</b><br><span style="font-size:12px;color:var(--muted);">' + r.kcal + ' kcal · ' + r.protein_g + 'g protein per serving' +
                (r.known < r.total ? ' (' + r.known + ' of ' + r.total + ' ingredients have nutrition, so it\'s an underestimate)' : '') + '</span>';
              var add = U._btn('+ Add', 'primary'); add.className = 'hb-cook-add';
              add.onclick = function() {
                add.disabled = true;
                L.addFood([{ name: r.name, kcal: r.kcal, protein_g: r.protein_g, source: 'recipe', recipe_id: r.recipe_id, servings: 1, matched_food: 'RPGACE recipe' }], day, meal.value)
                  .then(function() { RPGACE.utils.toast('🍽 Added ' + r.name, '#4caf82', 1800); redraw(); }).catch(function(e) { add.disabled = false; U._toastErr(e); });
              };
              row.appendChild(tx); row.appendChild(add); review.appendChild(row);
            });
          }).catch(function(e) { busy(''); U._toastErr(e); });
        };

        // logged food by meal
        self.MEALS.forEach(function(m) {
          var list = d.food.filter(function(f) { return (f.meal || 'snack') === m; });
          if (!list.length) return;
          var t = L.totals(list);
          U._h(body, self.MEAL_LABELS[m] + ' · ' + t.kcal + ' kcal · ' + t.protein + 'g');
          list.forEach(function(f) {
            var row = document.createElement('div'); row.className = 'hb-food'; row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;';
            var tx = document.createElement('div'); tx.style.cssText = 'flex:1;min-width:0;color:var(--text);font-variant-numeric:tabular-nums;';
            tx.innerHTML = esc(f.name) + (f.grams ? ' <span style="color:var(--muted);">' + f.grams + 'g</span>' : '') + ' · ' + f.kcal + ' kcal · ' + f.protein_g + 'g' +
              (f.matched_food ? ' <span style="color:var(--muted);font-size:12px;">(' + esc(f.matched_food) + ')</span>' : '');
            var del = U._btn('✕', ''); del.style.minHeight = '36px'; del.style.padding = '4px 10px';
            U._arm(del, '✕', function() { L.removeFood(f.id).then(redraw).catch(function(e) { del.disabled = false; U._toastErr(e); }); });
            row.appendChild(tx); row.appendChild(del); body.appendChild(row);
          });
        });
        self.ui.renderBodyToday(body, d, redraw);
      });
    },

    // Editable review of read items before saving.
    renderReview: function(box, items, mealFn, day, done, why) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, esc = U._esc;
      box.innerHTML = '';
      U._h(box, (why || 'Check it') + ' - edit anything, then save');
      var rows = [];
      items.forEach(function(it) {
        var r = document.createElement('div'); r.className = 'hb-rev'; r.style.cssText = 'display:grid;grid-template-columns:1fr 60px 64px 56px 32px;gap:6px;align-items:center;margin-bottom:6px;';
        var n = U._inp('text', null, it.name), g = U._inp('number', null, it.grams == null ? '' : it.grams), k = U._inp('number', null, it.kcal), p = U._inp('number', null, it.protein_g);
        n.className = 'hb-rev-name'; g.className = 'hb-rev-g'; k.className = 'hb-rev-kcal'; p.className = 'hb-rev-p';
        var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.style.cssText = 'min-height:36px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
        // Changing grams rescales kcal/protein from the same per-gram ratio.
        var base = { g: Number(it.grams) || 0, k: Number(it.kcal) || 0, p: Number(it.protein_g) || 0 };
        g.oninput = function() { var ng = Number(g.value); if (base.g && ng >= 0) { k.value = L.round(base.k * ng / base.g); p.value = L.round(base.p * ng / base.g, 1); } };
        var rec = { el: r, it: it, n: n, g: g, k: k, p: p };
        x.onclick = function() { r.remove(); if (src) src.remove(); rows = rows.filter(function(z) { return z !== rec; }); };
        [n, g, k, p, x].forEach(function(e) { r.appendChild(e); });
        box.appendChild(r);
        var src = document.createElement('div'); src.style.cssText = 'font-size:11px;color:var(--muted);margin:-3px 0 6px;';
        src.innerHTML = it.matched_food ? '✓ ' + esc(it.matched_food) + (it.oracle_kcal != null && it.oracle_kcal !== it.kcal ? ' (Oracle guessed ' + it.oracle_kcal + ' kcal)' : '') : '~ Oracle\'s estimate (no match in the UK food tables)';
        box.appendChild(src);
        rows.push(rec);
      });
      var hdr = document.createElement('div'); hdr.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:6px;';
      hdr.textContent = 'Name · grams · kcal · protein g';
      box.insertBefore(hdr, box.children[1]);
      var save = U._btn('Save to today', 'primary'); save.id = 'hb-rev-save'; save.style.width = '100%';
      save.onclick = function() {
        var out = rows.map(function(z) { return Object.assign({}, z.it, { name: z.n.value, grams: z.g.value, kcal: z.k.value, protein_g: z.p.value }); });
        save.disabled = true;
        L.addFood(out, day, mealFn()).then(function() { RPGACE.utils.toast('🍽 Logged ' + out.length + ' item' + (out.length === 1 ? '' : 's'), '#4caf82', 1800); done(); })
          .catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      box.appendChild(save);
    },
    renderLabel: function(box, lab, mealFn, day, done) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, esc = U._esc;
      box.innerHTML = '';
      U._h(box, '🏷 ' + lab.name);
      var info = document.createElement('div'); info.style.cssText = 'font-size:13px;color:var(--text);margin-bottom:6px;';
      info.textContent = 'Per 100g: ' + lab.kcal100 + ' kcal · ' + (lab.protein100 || 0) + 'g protein' + (lab.serving_g ? ' · pack portion ' + lab.serving_g + 'g' : '');
      box.appendChild(info);
      var g = U._inp('number', 'hb-label-g', lab.serving_g || 100); 
      var out = document.createElement('div'); out.id = 'hb-label-out'; out.style.cssText = 'font-size:14px;color:var(--text);margin:6px 0;font-variant-numeric:tabular-nums;';
      var paint = function() { var it = L.labelItem(lab, g.value); out.textContent = '= ' + it.kcal + ' kcal · ' + it.protein_g + 'g protein'; };
      g.oninput = paint; paint();
      var f = document.createElement('label'); f.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);';
      f.appendChild(document.createTextNode('How much did you have? (g)')); f.appendChild(g);
      box.appendChild(f); box.appendChild(out);
      var save = U._btn('Save to today', 'primary'); save.id = 'hb-label-save'; save.style.width = '100%';
      save.onclick = function() {
        save.disabled = true;
        L.addFood([L.labelItem(lab, g.value)], day, mealFn()).then(function() { RPGACE.utils.toast('🍽 Logged ' + lab.name, '#4caf82', 1800); done(); })
          .catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      box.appendChild(save);
    },

    // ── HB-3 body: water, weight, sleep ──────────────────────────────
    renderBodyToday: function(body, d, redraw) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, s = d.settings || {}, day = d.day, b = L.bodyOn(d.body, day);
      // SL-3 (Oct 27 2026): one Quick log row - 💧 +1 glass · ⚖️ Weight · 😴 Sleep · 🚬 · ☕.
      // Weight and sleep open their own row; cigarettes and coffee are My Day's
      // cut-back counters (cutback_log via myDay.logic.cutSet), not a second store.
      U._h(body, '⚡ Quick log');
      var ql = document.createElement('div'); ql.id = 'hb-quick'; ql.style.cssText = 'display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin-bottom:8px;';
      var tile = function(id, icon, label, fn) {
        var t = U._btn('', ''); t.id = id; t.textContent = icon;
        var sub = document.createElement('span'); sub.style.cssText = 'display:block;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'; sub.textContent = label; t.appendChild(sub);
        t.style.cssText += 'min-height:56px;padding:6px 4px;line-height:1.2;'; t.onclick = fn; ql.appendChild(t); return t;
      };
      body.appendChild(ql);
      var qWater = tile('hb-water-add', '💧', '+1 glass'), reveal = function(el) { return function() { el.hidden = !el.hidden; if (!el.hidden) { var i = el.querySelector('input'); if (i) i.focus(); } }; };
      var glass = Number(s.glass_ml) || 250, target = Number(s.water_target_ml) || 2000;
      var w = document.createElement('div'); w.id = 'hb-water'; w.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;';
      var glasses = Math.round(b.water / glass), goal = Math.round(target / glass);
      var wl = document.createElement('div'); wl.style.cssText = 'flex:1;min-width:160px;font-size:14px;color:var(--text);';
      wl.innerHTML = '💧 ' + glasses + ' / ' + goal + ' glasses <span style="color:var(--muted);font-size:12px;">(' + b.water + ' / ' + target + ' ml)</span>';
      var plus = qWater;
      plus.onclick = function() { plus.disabled = true; L.addBody('water', glass, day).then(redraw).catch(function(e) { plus.disabled = false; U._toastErr(e); }); };
      var minus = U._btn('−', ''); minus.id = 'hb-water-undo'; minus.setAttribute('aria-label', 'Undo last glass');
      var lastW = d.body.filter(function(r) { return r.kind === 'water' && r.logged_on === day; }).pop();
      minus.disabled = !lastW;
      minus.onclick = function() { if (!lastW) return; minus.disabled = true; L.removeBody(lastW.id).then(redraw).catch(function(e) { minus.disabled = false; U._toastErr(e); }); };
      w.appendChild(wl); w.appendChild(minus); body.appendChild(w);

      var avg = L.weightAvg(d.body, day);
      var wt = document.createElement('div'); wt.id = 'hb-weight'; wt.style.cssText = 'display:grid;grid-template-columns:1fr 90px auto;gap:8px;align-items:center;margin-bottom:10px;';
      var wtl = document.createElement('div'); wtl.style.cssText = 'font-size:14px;color:var(--text);';
      wtl.innerHTML = '⚖️ ' + (b.weight != null ? b.weight + ' kg today' : 'Weight') + (avg != null ? '<br><span style="font-size:12px;color:var(--muted);">7-day average ' + avg + ' kg' + (s.weight_goal_kg ? ' · goal ' + s.weight_goal_kg + ' kg' : '') + '</span>' : '');
      var wi = U._inp('number', 'hb-weight-in', '', 'kg');
      var ws = U._btn('Save', ''); ws.id = 'hb-weight-save';
      ws.onclick = function() { if (wi.value === '') return; ws.disabled = true; L.addBody('weight', wi.value, day).then(redraw).catch(function(e) { ws.disabled = false; U._toastErr(e); }); };
      wt.appendChild(wtl); wt.appendChild(wi); wt.appendChild(ws); body.appendChild(wt);
      wt.hidden = b.weight == null && avg == null;
      tile('hb-q-weight', '⚖️', b.weight != null ? b.weight + ' kg' : 'Weight', reveal(wt));

      var sl = document.createElement('div'); sl.id = 'hb-sleep'; sl.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
      var sll = document.createElement('div'); sll.style.cssText = 'flex:1;min-width:140px;font-size:14px;color:var(--text);';
      sll.innerHTML = '😴 ' + (b.sleep != null ? b.sleep + 'h last night' : 'Sleep last night') + ' <span style="color:var(--muted);font-size:12px;">(aim ' + (s.sleep_target_h || 8) + 'h)</span>';
      sl.appendChild(sll);
      [6, 7, 8, 9].forEach(function(h) {
        var c = U._btn(h + 'h', b.sleep === h ? 'primary' : ''); c.className = 'hb-sleep-chip'; c.style.minHeight = '40px'; c.style.padding = '4px 10px';
        c.onclick = function() { c.disabled = true; L.addBody('sleep', h, day).then(redraw).catch(function(e) { c.disabled = false; U._toastErr(e); }); };
        sl.appendChild(c);
      });
      var si = U._inp('number', 'hb-sleep-in', '', 'h'); si.style.width = '70px';
      var ss = U._btn('Save', ''); ss.id = 'hb-sleep-save';
      ss.onclick = function() { if (si.value === '') return; ss.disabled = true; L.addBody('sleep', si.value, day).then(redraw).catch(function(e) { ss.disabled = false; U._toastErr(e); }); };
      sl.appendChild(si); sl.appendChild(ss); body.appendChild(sl);
      sl.hidden = b.sleep != null;
      tile('hb-q-sleep', '😴', b.sleep != null ? b.sleep + 'h' : 'Sleep', reveal(sl));
      self.ui.cutTiles(ql, tile, day, redraw);
      if (b.steps != null) { var st = document.createElement('div'); st.style.cssText = 'font-size:14px;color:var(--text);margin-top:10px;'; st.textContent = '👟 ' + b.steps.toLocaleString('en-GB') + ' steps'; body.appendChild(st); }
    },

    // SL-3: 🚬 / ☕ tiles from My Day's cut-back items (names match), +1 today; "−" undoes one.
    cutTiles: function(row, tile, day, redraw) {
      var md = RPGACE.modules.myDay, U = RPGACE.modules.healthBody.ui;
      if (!md || !md.logic.loadTrackers) return Promise.resolve();
      return md.logic.loadTrackers().then(function(t) {
        [[/cigar/i, '🚬', 'hb-q-cig', 'Cigs'], [/coffee|energy/i, '☕', 'hb-q-coffee', 'Coffee']].forEach(function(m) {
          var item = (t.cut || []).filter(function(c) { return m[0].test(c.name || ''); })[0];
          if (!item) return;
          var n = md.logic.cutCount(item, day) || 0;
          var b = tile(m[2], m[1], m[3] + ' ' + n, function() {
            b.disabled = true;
            md.logic.cutSet(item, day, n + 1).then(function() { RPGACE.utils.toast(m[1] + ' ' + (n + 1) + ' today (aim ' + item.target + ')', 'var(--gold)', 1800); redraw(); })
              .catch(function(e) { b.disabled = false; U._toastErr(e); });
          });
          if (n > item.target) b.style.borderColor = '#CC4A4A';
          if (n > 0) {
            var u = document.createElement('span'); u.textContent = '−'; u.className = 'hb-q-undo'; u.setAttribute('role', 'button'); u.setAttribute('aria-label', 'Take one off');
            u.style.cssText = 'display:block;font-size:13px;color:var(--muted);';
            u.onclick = function(e) { e.stopPropagation(); md.logic.cutSet(item, day, n - 1).then(redraw).catch(U._toastErr); };
            b.appendChild(u);
          }
        });
      }).catch(function() {});
    },

    // ── HB-2 Gym plan ────────────────────────────────────────────────
    renderGym: function(body) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, esc = U._esc, gt = RPGACE.modules.gymTracker, day = L.iso();
      return Promise.all([L.loadSettings(), gt ? gt.logic.load() : Promise.resolve([])]).then(function(r) {
        var prog = r[0] && r[0].programme, sessions = r[1] || [];
        body.innerHTML = '';
        var redraw = function() { self.ui.renderGym(body).catch(U._toastErr); };
        if (!prog || !prog.days) { self.ui.renderProgrammeSetup(body, redraw); return; }
        var w = L.workoutOn(prog, day);
        U._h(body, w ? '🏋️ Today: ' + w.name : '🏋️ Today');
        if (!w) {
          var rest = document.createElement('div'); rest.style.cssText = 'font-size:14px;color:var(--muted);'; rest.textContent = 'Rest day. Next: ' + self.ui.nextDay(prog, day); body.appendChild(rest);
        } else {
          w.exercises.forEach(function(ex) {
            var sg = L.suggest(ex, sessions);
            var row = document.createElement('div'); row.className = 'hb-ex'; row.style.cssText = 'padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;';
            row.innerHTML = '<b style="font-size:14px;color:var(--text);">' + esc(ex.exercise) + '</b> <span style="color:var(--muted);">' + ex.sets + ' × ' + ex.rep_min + '-' + ex.rep_max + '</span><br>' +
              '<span style="color:var(--muted);">Last: ' + esc(L.lastText(sg.last)) + '</span><br>' +
              '<span class="hb-nudge" style="color:' + (sg.up ? '#4caf82' : 'var(--text)') + ';">' + esc(sg.note) + (sg.kg ? ' → ' + sg.kg + 'kg × ' + sg.reps : '') + '</span>';
            body.appendChild(row);
          });
          var start = U._btn('▶ Start this workout', 'primary'); start.id = 'hb-start'; start.style.cssText += 'width:100%;margin-top:10px;';
          start.onclick = function() {
            if (!gt) { U._toastErr('Gym tracker is not loaded'); return; }
            gt.ui.openLog(sessions, L.planRows(w, sessions), function() { redraw(); });
          };
          body.appendChild(start);
        }
        U._h(body, '📅 This week');
        var wk = document.createElement('div'); wk.id = 'hb-week'; wk.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:12px;text-align:center;';
        [1, 2, 3, 4, 5, 6, 0].forEach(function(dw) {
          var c = document.createElement('div'); var nm = prog.days[dw];
          c.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:6px 2px;color:' + (nm ? 'var(--text)' : 'var(--muted)') + ';' + (new Date(day + 'T12:00:00').getDay() === dw ? 'border-color:var(--gold);' : '');
          c.innerHTML = '<b>' + self.DOW[dw] + '</b><br>' + esc(nm || 'Rest');
          wk.appendChild(c);
        });
        body.appendChild(wk);
        U._h(body, '✏️ Exercises');
        Object.keys(prog.workouts || {}).forEach(function(name) { self.ui.renderWorkoutEditor(body, prog, name, redraw); });
        var reset = U._btn('Change programme or days', ''); reset.id = 'hb-prog-reset'; reset.style.cssText += 'width:100%;margin-top:10px;';
        reset.onclick = function() { body.innerHTML = ''; self.ui.renderProgrammeSetup(body, redraw, prog); };
        body.appendChild(reset);
      });
    },
    nextDay: function(prog, day) {
      var self = RPGACE.modules.healthBody, L = self.logic;
      for (var i = 1; i <= 7; i++) { var dd = L.addDays(day, i), w = L.workoutOn(prog, dd); if (w) return w.name + ' on ' + self.DOW[new Date(dd + 'T12:00:00').getDay()]; }
      return 'none set';
    },
    renderProgrammeSetup: function(body, redraw, current) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui;
      U._h(body, 'Pick a programme');
      var pick = current && current.template || 'ppl', dows = {};
      if (current && current.days) Object.keys(current.days).forEach(function(k) { dows[k] = 1; }); else [1, 3, 5].forEach(function(k) { dows[k] = 1; });
      var tp = document.createElement('div'); tp.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      var paintT = function() {
        tp.innerHTML = '';
        Object.keys(self.TEMPLATES).forEach(function(k) {
          var c = U._btn(self.TEMPLATES[k].label, k === pick ? 'primary' : ''); c.className = 'hb-tpl'; c.dataset.tpl = k;
          c.onclick = function() { pick = k; paintT(); };
          tp.appendChild(c);
        });
      };
      paintT(); body.appendChild(tp);
      var hint = document.createElement('div'); hint.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:6px;';
      hint.textContent = 'Gym days (the workouts rotate through them in order):';
      body.appendChild(hint);
      var dd = document.createElement('div'); dd.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
      var paintD = function() {
        dd.innerHTML = '';
        [1, 2, 3, 4, 5, 6, 0].forEach(function(k) {
          var c = U._btn(self.DOW[k], dows[k] ? 'primary' : ''); c.className = 'hb-dow'; c.dataset.dow = k; c.style.minHeight = '40px';
          c.onclick = function() { if (dows[k]) delete dows[k]; else dows[k] = 1; paintD(); };
          dd.appendChild(c);
        });
      };
      paintD(); body.appendChild(dd);
      if (current) { var keep = document.createElement('div'); keep.style.cssText = 'font-size:12px;color:#e0a84c;margin-bottom:8px;'; keep.textContent = 'Saving replaces your current exercise lists with the programme\'s starter lists. Your logged sessions are not touched.'; body.appendChild(keep); }
      var save = U._btn('Save programme', 'primary'); save.id = 'hb-prog-save'; save.style.width = '100%';
      save.onclick = function() {
        var prog; try { prog = L.buildProgramme(pick, Object.keys(dows)); } catch (e) { U._toastErr(e); return; }
        save.disabled = true;
        L.saveSettings({ programme: prog }).then(function() { RPGACE.utils.toast('🏋️ Programme saved', '#4caf82', 1800); redraw(); }).catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      body.appendChild(save);
    },
    renderWorkoutEditor: function(body, prog, name, redraw) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, esc = U._esc;
      var det = document.createElement('details'); det.className = 'hb-wo'; det.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px;';
      var sum = document.createElement('summary'); sum.style.cssText = 'cursor:pointer;font-size:14px;color:var(--text);font-weight:700;min-height:28px;';
      sum.textContent = name + ' (' + (prog.workouts[name] || []).length + ' exercises)';
      det.appendChild(sum);
      var list = document.createElement('div'); det.appendChild(list);
      var hdr = document.createElement('div'); hdr.style.cssText = 'display:grid;grid-template-columns:1fr 44px 44px 44px 32px;gap:4px;font-size:11px;color:var(--muted);margin:6px 0 2px;';
      hdr.innerHTML = '<span>Exercise</span><span>Sets</span><span>Min</span><span>Max</span><span></span>';
      list.appendChild(hdr);
      var rows = [];
      var add = function(ex) {
        var r = document.createElement('div'); r.className = 'hb-wo-row'; r.style.cssText = 'display:grid;grid-template-columns:1fr 44px 44px 44px 32px;gap:4px;margin-bottom:4px;';
        var n = U._inp('text', null, ex.exercise || ''), st = U._inp('number', null, ex.sets || 3), lo = U._inp('number', null, ex.rep_min || 8), hi = U._inp('number', null, ex.rep_max || 12);
        var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.style.cssText = 'background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
        var rec = { r: r, n: n, st: st, lo: lo, hi: hi };
        x.onclick = function() { r.remove(); rows = rows.filter(function(z) { return z !== rec; }); };
        [n, st, lo, hi, x].forEach(function(e) { r.appendChild(e); });
        list.appendChild(r); rows.push(rec);
      };
      (prog.workouts[name] || []).forEach(add);
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
      var more = U._btn('+ Exercise', ''); more.onclick = function() { add({}); };
      var save = U._btn('Save ' + name, 'primary'); save.className = 'hb-wo-save';
      save.onclick = function() {
        var out = rows.map(function(z) { return { exercise: z.n.value.trim(), sets: Math.max(1, Math.min(10, parseInt(z.st.value, 10) || 3)), rep_min: Math.max(1, parseInt(z.lo.value, 10) || 8), rep_max: Math.max(1, parseInt(z.hi.value, 10) || 12) }; })
          .filter(function(e) { return e.exercise; }).map(function(e) { if (e.rep_max < e.rep_min) e.rep_max = e.rep_min; return e; });
        var np = JSON.parse(JSON.stringify(prog)); np.workouts[name] = out;
        save.disabled = true;
        L.saveSettings({ programme: np }).then(function() { RPGACE.utils.toast('Saved ' + name, '#4caf82', 1600); redraw(); }).catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      bar.appendChild(more); bar.appendChild(save); det.appendChild(bar);
      body.appendChild(det);
    },

    // ── Trends (14 days) ─────────────────────────────────────────────
    renderTrends: function(body) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, day = L.iso(), N = 14;
      return L.loadRange(day, N).then(function(d) {
        body.innerHTML = '';
        var s = d.settings || {}, days = [];
        for (var i = 0; i < N; i++) days.push(L.addDays(d.from, i));
        var food = {};
        d.food.forEach(function(f) { var x = food[f.eaten_on] || (food[f.eaten_on] = { k: 0, p: 0 }); x.k += Number(f.kcal) || 0; x.p += Number(f.protein_g) || 0; });
        // weight chart
        var pts = days.map(function(dd) { return { d: dd, w: L.bodyOn(d.body, dd).weight, a: L.weightAvg(d.body, dd) }; });
        var ws = pts.filter(function(p) { return p.w != null; });
        U._h(body, '⚖️ Weight (dots) and 7-day average (line)');
        if (ws.length) {
          var all = ws.map(function(p) { return p.w; }).concat(pts.filter(function(p) { return p.a != null; }).map(function(p) { return p.a; }));
          var lo = Math.min.apply(null, all) - 0.5, hi = Math.max.apply(null, all) + 0.5, W = 560, H = 140, pad = 34;
          var x = function(i) { return pad + i * (W - pad - 8) / (N - 1); }, y = function(v) { return 8 + (hi - v) / (hi - lo) * (H - 28); };
          var line = pts.map(function(p, i) { return p.a == null ? null : x(i).toFixed(1) + ',' + y(p.a).toFixed(1); }).filter(Boolean).join(' ');
          var svg = '<svg id="hb-weight-chart" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;" role="img" aria-label="Weight over 14 days">' +
            '<text x="2" y="' + (y(hi - 0.5) + 4) + '" fill="var(--muted)" font-size="11">' + L.round(hi - 0.5, 1) + '</text><text x="2" y="' + (y(lo + 0.5) + 4) + '" fill="var(--muted)" font-size="11">' + L.round(lo + 0.5, 1) + '</text>' +
            (line ? '<polyline points="' + line + '" fill="none" stroke="var(--gold)" stroke-width="2"/>' : '') +
            pts.map(function(p, i) { return p.w == null ? '' : '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.w).toFixed(1) + '" r="3.5" fill="var(--purple)"><title>' + p.d + ': ' + p.w + ' kg</title></circle>'; }).join('') +
            '<text x="' + pad + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="11">' + new Date(days[0] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</text>' +
            '<text x="' + (W - 8) + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="11" text-anchor="end">Today</text></svg>';
          var c = document.createElement('div'); c.innerHTML = svg; body.appendChild(c);
        } else { var e = document.createElement('div'); e.style.cssText = 'font-size:13px;color:var(--muted);'; e.textContent = 'No weights logged in the last 2 weeks.'; body.appendChild(e); }
        U._h(body, 'Day by day');
        var tbl = document.createElement('div'); tbl.id = 'hb-trend-rows'; tbl.style.cssText = 'overflow-x:auto;';
        var th = '<table style="width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;color:var(--text);"><tr style="color:var(--muted);text-align:right;"><th style="text-align:left;padding:4px;">Day</th><th style="padding:4px;">kcal</th><th style="padding:4px;">Protein</th><th style="padding:4px;">Water</th><th style="padding:4px;">Sleep</th><th style="padding:4px;">Weight</th></tr>';
        days.slice().reverse().forEach(function(dd) {
          var f = food[dd] || { k: 0, p: 0 }, b = L.bodyOn(d.body, dd);
          var good = function(v, t) { return t && v >= t * 0.9 && v <= t * 1.1 ? 'color:#4caf82;' : ''; };
          th += '<tr style="border-top:1px solid var(--border);text-align:right;"><td style="text-align:left;padding:4px;">' + new Date(dd + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) + '</td>' +
            '<td style="padding:4px;' + good(f.k, s.kcal_target) + '">' + (f.k ? L.round(f.k) : '–') + '</td><td style="padding:4px;' + (s.protein_target && f.p >= s.protein_target ? 'color:#4caf82;' : '') + '">' + (f.p ? L.round(f.p) + 'g' : '–') + '</td>' +
            '<td style="padding:4px;">' + (b.water ? L.round(b.water / 1000, 1) + 'L' : '–') + '</td><td style="padding:4px;">' + (b.sleep != null ? b.sleep + 'h' : '–') + '</td><td style="padding:4px;">' + (b.weight != null ? b.weight : '–') + '</td></tr>';
        });
        tbl.innerHTML = th + '</table>';
        body.appendChild(tbl);
      });
    },

    renderTargets: function(body) {
      var self = RPGACE.modules.healthBody, L = self.logic, U = self.ui, s = self._s || {};
      body.innerHTML = '';
      U._h(body, '🎯 Daily targets');
      var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;';
      var f = { kcal_target: U._inp('number', 'hb-t-kcal', s.kcal_target || '', 'e.g. 2400'), protein_target: U._inp('number', 'hb-t-protein', s.protein_target || '', 'e.g. 150'),
        water_target_ml: U._inp('number', 'hb-t-water', s.water_target_ml || 2000), glass_ml: U._inp('number', 'hb-t-glass', s.glass_ml || 250),
        sleep_target_h: U._inp('number', 'hb-t-sleep', s.sleep_target_h || 8), weight_goal_kg: U._inp('number', 'hb-t-weight', s.weight_goal_kg || '', 'optional') };
      var lab = { kcal_target: 'Calories (kcal)', protein_target: 'Protein (g)', water_target_ml: 'Water (ml)', glass_ml: 'One glass (ml)', sleep_target_h: 'Sleep (hours)', weight_goal_kg: 'Weight goal (kg)' };
      Object.keys(f).forEach(function(k) { var w = document.createElement('label'); w.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);'; w.appendChild(document.createTextNode(lab[k])); w.appendChild(f[k]); g.appendChild(w); });
      body.appendChild(g);
      var tip = document.createElement('div'); tip.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0;line-height:1.5;';
      tip.textContent = 'Not sure? A common gym starting point is about 1.6-2g of protein per kg of body weight. Ask Oracle for a calorie number for your goal.';
      body.appendChild(tip);
      var save = U._btn('Save targets', 'primary'); save.id = 'hb-t-save'; save.style.width = '100%';
      save.onclick = function() {
        var patch = {}, bad = null;
        Object.keys(f).forEach(function(k) { var v = L.num(f[k].value); if (isNaN(v)) bad = lab[k]; patch[k] = v; });
        if (bad) { U._toastErr('Numbers only: ' + bad); return; }
        save.disabled = true;
        L.saveSettings(patch).then(function() { save.disabled = false; RPGACE.utils.toast('🎯 Targets saved', '#4caf82', 1800); }).catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      body.appendChild(save);
    },

    // My Day: today's totals + today's workout (async; fills a placeholder).
    myDayCard: function(panel) {
      var self = RPGACE.modules.healthBody, L = self.logic;
      if (!L.signedIn()) return;
      var box = document.createElement('div'); box.id = 'myday-health';
      box.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:12px 0;';
      panel.appendChild(box);
      var day = L.iso(), gt = RPGACE.modules.gymTracker;
      Promise.all([L.loadDay(day), gt ? gt.logic.load().catch(function() { return []; }) : Promise.resolve([])]).then(function(r) {
        var d = r[0], s = d.settings || {}, t = L.totals(d.food), b = L.bodyOn(d.body, day), w = L.workoutOn(s.programme, day);
        var glass = Number(s.glass_ml) || 250;
        var parts = [s.kcal_target ? '🔥 ' + t.kcal.toLocaleString('en-GB') + ' / ' + Number(s.kcal_target).toLocaleString('en-GB') + ' kcal' : '🔥 ' + t.kcal + ' kcal',
          s.protein_target ? '🥩 ' + t.protein + ' / ' + s.protein_target + 'g' : '🥩 ' + t.protein + 'g',
          '<span id="myday-health-water-count">💧 ' + Math.round(b.water / glass) + '/' + Math.round((Number(s.water_target_ml) || 2000) / glass) + '</span>'];
        if (b.sleep != null) parts.push('😴 ' + b.sleep + 'h');
        box.innerHTML = '<div style="flex:1;min-width:200px;font-size:14px;color:var(--text);font-variant-numeric:tabular-nums;"><b>❤️ Health today</b><br><span style="font-size:13px;">' + parts.join(' · ') + '</span>' +
          (w ? '<br><span class="myday-health-gym" style="font-size:13px;color:var(--gold);">🏋️ ' + self.ui._esc(w.name) + ' day: ' + w.exercises.length + ' exercises</span>' : '') +
          (!s.kcal_target ? '<br><span style="font-size:12px;color:var(--muted);">Set your targets in Health &amp; body</span>' : '') + '</div>';
        // FL-6 (Oct 27 2026): one-tap glass of water from My Day, same write as Health & body's +1 glass.
        var water = self.ui._btn('+1 💧', ''); water.id = 'myday-health-water';
        water.setAttribute('aria-label', 'Log a glass of water');
        water.onclick = function() {
          water.disabled = true;
          L.addBody('water', glass, day).then(function() {
            b.water += glass; water.disabled = false;
            var c = box.querySelector('#myday-health-water-count');
            if (c) c.textContent = '💧 ' + Math.round(b.water / glass) + '/' + Math.round((Number(s.water_target_ml) || 2000) / glass);
            RPGACE.utils.toast('💧 Glass logged', '#4caf82', 1500);
          }).catch(function(e) { water.disabled = false; self.ui._toastErr(e); });
        };
        var open = self.ui._btn('Open', ''); open.id = 'myday-health-open';
        open.onclick = function() { self.ui.open(w ? 'gym' : 'today'); };
        box.appendChild(water); box.appendChild(open);
      }).catch(function() { box.remove(); });
    },
  },

  open: function(tab) { return this.ui.open(tab); },
});
/* ===END:healthBody=== */
