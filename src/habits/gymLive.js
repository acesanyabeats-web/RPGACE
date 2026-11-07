/* ===MODULE:gymLive=== */
// GL-1..6 (Nov 5 2026, plan "Oracle Assistant + Live now modes", record
// records/2026-11/gym_live_mode_paranoia_2026-11-05.txt). Alex: "For gym live
// now, I choose muscle groups I want to hit, then choose exercises and sets
// and reps, with oracle to talk to if something is wrong or need tips";
// answers: "2D tap map", "Guided, prefilled", form help = cue + map highlight
// + YouTube search + "Ask Oracle about this exercise" + "Once video finishes
// and I return back, ask if I want it shared and taken in", gym chats "same as
// cooking". Built on exerciseLibrary (regions, exercises, cues) and gymTracker
// (sessions, sets, save) - nothing stored twice. The workout in progress lives
// in localStorage until Finish saves one gym_sessions row + its gym_sets.
RPGACE.register('gymLive', {
  domain: 'habits',
  KEY: 'rpgace.gymLive',
  REST: 90,
  MODEL: 'claude-sonnet-4-6',
  // GL-1: a flat front/back body, one shape per exerciseLibrary region. [region, view, kind, x, y, w, h]
  SHAPES: [
    ['front_delts', 'f', 'e', 62, 78, 14, 12], ['front_delts', 'f', 'e', 138, 78, 14, 12],
    ['side_delts', 'f', 'e', 52, 86, 9, 12], ['side_delts', 'f', 'e', 148, 86, 9, 12],
    ['upper_chest', 'f', 'r', 78, 76, 44, 12], ['mid_chest', 'f', 'r', 78, 89, 44, 12], ['lower_chest', 'f', 'r', 80, 102, 40, 9],
    ['biceps', 'f', 'e', 52, 116, 9, 18], ['biceps', 'f', 'e', 148, 116, 9, 18],
    ['forearms', 'f', 'e', 46, 152, 8, 18], ['forearms', 'f', 'e', 154, 152, 8, 18],
    ['abs', 'f', 'r', 88, 114, 24, 44], ['obliques', 'f', 'r', 76, 116, 10, 38], ['obliques', 'f', 'r', 114, 116, 10, 38],
    ['deep_core', 'f', 'e', 100, 166, 9, 6], ['hip_flexors', 'f', 'r', 80, 176, 40, 10],
    ['quads', 'f', 'r', 74, 192, 22, 56], ['quads', 'f', 'r', 104, 192, 22, 56],
    ['adductors', 'f', 'r', 94, 196, 12, 34], ['knee_tendons', 'f', 'e', 85, 256, 9, 7], ['knee_tendons', 'f', 'e', 115, 256, 9, 7],
    ['calves', 'f', 'r', 76, 270, 16, 44], ['calves', 'f', 'r', 108, 270, 16, 44],
    ['upper_back', 'b', 'r', 78, 70, 44, 14], ['rear_delts', 'b', 'e', 62, 82, 12, 10], ['rear_delts', 'b', 'e', 138, 82, 12, 10],
    ['rotator_cuff', 'b', 'e', 80, 92, 8, 7], ['rotator_cuff', 'b', 'e', 120, 92, 8, 7],
    ['lats', 'b', 'r', 72, 100, 14, 36], ['lats', 'b', 'r', 114, 100, 14, 36], ['mid_back', 'b', 'r', 88, 88, 24, 30],
    ['lower_back', 'b', 'r', 88, 122, 24, 34], ['triceps', 'b', 'e', 52, 116, 9, 18], ['triceps', 'b', 'e', 148, 116, 9, 18],
    ['forearms', 'b', 'e', 46, 152, 8, 18], ['forearms', 'b', 'e', 154, 152, 8, 18],
    ['glute_med', 'b', 'r', 74, 162, 12, 18], ['glute_med', 'b', 'r', 114, 162, 12, 18], ['glute_max', 'b', 'r', 86, 166, 28, 26],
    ['hamstrings', 'b', 'r', 74, 198, 22, 52], ['hamstrings', 'b', 'r', 104, 198, 22, 52],
    ['calves', 'b', 'r', 76, 264, 16, 46], ['calves', 'b', 'r', 108, 264, 16, 46]
  ],
  FULL_BODY: ['power', 'conditioning', 'stability'],
  // GL-6: gym chat colours (the cooking transcript machinery with its own set).
  TAGS: [
    { key: 'pain', icon: '🔴', name: 'Pain / injury', color: '#CC4A4A', re: /\b(pain\w*|hurt\w*|ache\w*|sore|injur\w*|tweak\w*|pull(?:ed)? (?:a|my)|sharp|twinge|click\w*|pop\w*)\b/i },
    { key: 'form', icon: '🔵', name: 'Form', color: '#4A90E2', re: /\b(form|technique|grip|stance|posture|elbow\w*|knee\w* (?:cave|in)|back (?:round|arch)|brace|range of motion|rom|depth|tempo|how (?:do|should) i)\b/i },
    { key: 'easy', icon: '🟢', name: 'Too easy', color: '#4CAF82', re: /\b(too easy|easy|light|could do more|more weight|go heavier|add weight)\b/i },
    { key: 'hard', icon: '🟠', name: 'Too hard', color: '#E2A83D', re: /\b(too hard|too heavy|can'?t (?:finish|lift|do)|failed|fail\w*|struggl\w*|exhaust\w*|tired|drop the weight|lighter)\b/i },
    { key: 'swap', icon: '🟣', name: 'Swap', color: '#9B59B6', re: /\b(instead|swap\w*|substitut\w*|replac\w*|alternative|machine (?:is )?taken|no (?:bench|rack|cable|barbell|dumbbells?))\b/i },
    { key: 'other', icon: '⚪', name: 'Other', color: '#8A8FA3', re: null }
  ],

  logic: {
    load: function() { try { var s = JSON.parse(localStorage.getItem(RPGACE.modules.gymLive.KEY) || 'null'); return s && s.date === RPGACE.kit.iso() ? s : null; } catch (e) { return null; } },
    store: function(s) { try { if (s) localStorage.setItem(RPGACE.modules.gymLive.KEY, JSON.stringify(s)); else localStorage.removeItem(RPGACE.modules.gymLive.KEY); } catch (e) {} return s; },
    fresh: function() { return { date: RPGACE.kit.iso(), started: Date.now(), regions: [], step: 'map', exercises: [], restUntil: 0, view: 'f' }; },
    // GL-2, pure: rank the library for the picked regions (primary hit 2, helper hit 1).
    rank: function(lib, regions) {
      var want = {}; (regions || []).forEach(function(r) { want[r] = 1; });
      return (lib || []).map(function(x) {
        var p = (x.primary || []).filter(function(r) { return want[r]; }).length, s = (x.secondary || []).filter(function(r) { return want[r]; }).length;
        return { x: x, score: p * 2 + s, hits: (x.primary || []).concat(x.secondary || []).filter(function(r) { return want[r]; }) };
      }).filter(function(o) { return o.score > 0; }).sort(function(a, b) { return b.score - a.score || (b.x.fromVideo ? 1 : 0) - (a.x.fromVideo ? 1 : 0) || a.x.name.localeCompare(b.x.name); });
    },
    // GL-3, pure: what you did last time for an exercise -> today's target.
    last: function(sessions, name) {
      var k = String(name || '').trim().toLowerCase();
      for (var i = 0; i < (sessions || []).length; i++) {
        var sets = (sessions[i].gym_sets || []).filter(function(x) { return String(x.exercise || '').trim().toLowerCase() === k; });
        if (sets.length) {
          var kg = Math.max.apply(null, sets.map(function(x) { return Number(x.weight_kg) || 0; }));
          var reps = Math.min.apply(null, sets.map(function(x) { return Number(x.reps) || 0; }));
          return { on: sessions[i].performed_on, sets: sets.length, reps: reps || null, kg: kg || null };
        }
      }
      return null;
    },
    target: function(last) {
      if (!last) return { sets: 3, reps: 10, kg: null, why: 'first time: 3 × 10, pick a weight you could do 12 times' };
      if (last.kg && last.reps >= 8) return { sets: last.sets, reps: last.reps, kg: Math.round((last.kg + 2.5) * 2) / 2, why: 'last time ' + last.sets + ' × ' + last.reps + ' @ ' + last.kg + 'kg → +2.5kg' };
      return { sets: last.sets, reps: (last.reps || 8) + 1, kg: last.kg, why: 'last time ' + last.sets + ' × ' + (last.reps || '?') + (last.kg ? ' @ ' + last.kg + 'kg' : '') + ' → +1 rep' };
    },
    exerciseFrom: function(x, t) {
      var sets = []; for (var i = 0; i < t.sets; i++) sets.push({ reps: t.reps, kg: t.kg, done: false });
      return { name: x.name, primary: x.primary || [], secondary: x.secondary || [], cue: x.cue || '', why: t.why, sets: sets };
    },
    // GY-4: a saved gym_plans row -> the workout state (straight to the sets).
    fromPlan: function(p) {
      var L = RPGACE.modules.gymLive.logic;
      return { date: RPGACE.kit.iso(), started: Date.now(), regions: p.regions || [], step: 'go', restUntil: 0, view: 'f', planId: p.id, split: p.split, addon: p.addon,
        exercises: (p.exercises || []).map(function(e) { return L.exerciseFrom({ name: e.name, primary: e.primary, secondary: e.secondary, cue: e.cue }, { sets: e.sets || 3, reps: e.reps, kg: e.kg, why: e.why || '' }); }) };
    },
    // Finish: done sets -> gymTracker rows (one row per reps/kg run).
    rows: function(s) {
      var out = [];
      (s.exercises || []).forEach(function(e) {
        e.sets.filter(function(x) { return x.done; }).forEach(function(x) {
          var last = out[out.length - 1];
          if (last && last.exercise === e.name && last.reps === x.reps && last.kg === x.kg) last.sets++;
          else out.push({ exercise: e.name, sets: 1, reps: x.reps, kg: x.kg });
        });
      });
      return out;
    },
    current: function(s) {
      if (!s) return null;
      for (var i = 0; i < s.exercises.length; i++) { var e = s.exercises[i], n = e.sets.filter(function(x) { return x.done; }).length; if (n < e.sets.length) return { e: e, set: n + 1, of: e.sets.length }; }
      return null;
    },
    // GL-6: gym chats live in cook_chats (one store for Live now chats) under key gym_<date>.
    chatKey: function() { var s = RPGACE.modules.gymLive.logic.load(); return s && s.exercises.length ? 'gym_' + s.date : null; },
    tagLine: function(text) { var T = RPGACE.modules.gymLive.TAGS, t = String(text || ''); for (var i = 0; i < T.length; i++) if (T[i].re && T[i].re.test(t)) return T[i].key; return 'other'; },
    chats: function() { return RPGACE.kit.readPrivate('cook_chats', 'select=id,created_at,cook_key,transcript,line_tags,messages&cook_key=like.gym_*&order=created_at.desc&limit=20'); },
    // One call: up to 5 changes for next time, from the transcript + what was lifted.
    propose: function(row, lifted) {
      var prompt = 'You coach Alex in the gym. From his gym chat and what he lifted, suggest at most 5 changes for his NEXT workout (weight, reps, an exercise swap, a form cue, rest). Only what the chat or the numbers support; no generic advice.\n' +
        'Return only JSON: {"changes":[{"exercise":"<name or empty>","change":"<one short line>","because":"<the chat line or number it comes from>"}]}\n\nLifted:\n' + (lifted || 'not logged') + '\n\nChat:\n' + String(row.transcript || '').slice(0, 6000);
      return RPGACE.kit.ask(prompt, { json: true, max: 800, model: RPGACE.modules.gymLive.MODEL }).then(function(j) {
        return ((j && j.changes) || []).filter(function(c) { return c && String(c.change || '').trim(); }).slice(0, 5).map(function(c) {
          return { exercise: String(c.exercise || '').slice(0, 80), change: String(c.change).slice(0, 200), because: String(c.because || '').slice(0, 200) };
        });
      });
    },
    // Accepted changes wait for the next workout (journal source gym_next, shown at the top of gym mode).
    keepNext: function(c) {
      return RPGACE.sb.secureWrite('journal', 'insert', { title: '🏋️ Next workout', content: (c.exercise ? c.exercise + ': ' : '') + c.change, source: 'gym_next', entry_type: 'note', date: RPGACE.kit.iso(), realms: ['athlete'] });
    },
    nextNotes: function() { return RPGACE.sb.select('journal', 'select=id,content,created_at&source=eq.gym_next&status=is.null&order=created_at.desc&limit=8').then(function(r) { return Array.isArray(r) ? r : []; }).catch(function() { return []; }); }
  },

  init: function() {
    var self = RPGACE.modules.gymLive;
    // GL-4: back from a form video -> "Share and take in that video?"
    document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible' && self._watching) setTimeout(function() { self.ui.askShareBack(); }, 600); });
    // GL-5: Oracle knows the exercise and set you're on.
    var oc = RPGACE.modules.oracleControl;
    if (oc && oc.registerContextProvider) oc.registerContextProvider('gymLive', function() {
      var box = document.getElementById('gl-box'); if (!box || box.offsetParent === null) return null;
      var s = self.logic.load(), cur = self.logic.current(s); if (!cur) return null;
      var x = cur.e.sets[cur.set - 1] || {};
      return 'Alex is in the gym (Live now): ' + cur.e.name + ', set ' + cur.set + ' of ' + cur.of + ', target ' + (x.reps || '?') + ' reps' + (x.kg ? ' @ ' + x.kg + 'kg' : '') + ' (' + cur.e.why + '). Give short, practical gym advice for this lift right now.' + (s.split && RPGACE.modules.gymPlan ? ' Today\'s plan: ' + RPGACE.modules.gymPlan.logic.label(s) + '.' : '') + (RPGACE.modules.gymPlan && RPGACE.modules.gymPlan._note ? ' His gym note: ' + RPGACE.modules.gymPlan._note.content + '.' : '');
    });
  },

  ui: {
    _btn: function(label, kind, id) { var b = RPGACE.kit.btn(label, kind || ''); if (id) b.id = id; b.style.minHeight = '44px'; return b; },
    // Live now gym mode (liveModes._gym) draws this.
    draw: function(host) {
      var self = RPGACE.modules.gymLive, L = self.logic, U = self.ui;
      host.innerHTML = '';
      var box = document.createElement('div'); box.id = 'gl-box'; host.appendChild(box);
      var s = L.load();
      // Accepted changes from the last workout's chat sit on top.
      L.nextNotes().then(function(rows) {
        if (!rows.length || !box.isConnected) return;
        var n = document.createElement('div'); n.id = 'gl-next'; n.style.cssText = 'border:1px dashed var(--gold);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:13px;';
        n.innerHTML = '<b>Coach notes for today</b>' + rows.map(function(r) { return '<div>• ' + RPGACE.kit.esc(r.content) + '</div>'; }).join('');
        box.insertBefore(n, box.firstChild);
      });
      // GY-4: no workout yet -> today's plan straight into the sets; no plan -> the planner (split + add-on).
      var GP = RPGACE.modules.gymPlan;
      if (!s && GP) {
        box.textContent = 'Loading today\'s plan…';
        GP.logic.forDay(RPGACE.kit.iso()).then(function(ps) {
          var p = ps.filter(function(x) { return (x.exercises || []).length; })[0];
          box.textContent = '';
          if (p) { var st = L.store(L.fromPlan(p)); if (p.status !== 'started') GP.logic.setStatus(p.id, 'started'); return U.drawWorkout(box, st); }
          GP.ui.planner(box, { live: true, onSaved: function(np) { U.drawWorkout(box, L.store(L.fromPlan(np))); },
            free: function() { box.textContent = ''; U.drawMap(box, L.store(L.fresh())); } });
        }).catch(function() { box.textContent = ''; U.drawMap(box, L.store(L.fresh())); });
        return;
      }
      if (!s || s.step === 'map') return U.drawMap(box, s || L.store(L.fresh()));
      if (s.step === 'pick') return U.drawPick(box, s);
      return U.drawWorkout(box, s);
    },
    // GL-1: tap muscles. hi = { main: [...], help: [...] } highlights for an exercise.
    // GY-3: opts.outline = target areas (outlined), opts.mainColor / helpColor = the planner's red / pink.
    bodySvg: function(view, picked, hi, onTap, opts) {
      opts = opts || {};
      var self = RPGACE.modules.gymLive, NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '30 30 140 300'); svg.setAttribute('class', 'gl-body'); svg.style.cssText = 'width:100%;max-width:220px;height:auto;display:block;margin:0 auto;';
      var sil = document.createElementNS(NS, 'path');
      sil.setAttribute('d', 'M100 34c11 0 18 9 18 20s-7 18-18 18-18-7-18-18 7-20 18-20zM70 74h60l22 10 8 48-6 40-8-2 0-34-6 30v32l-4 44 2 50-8 0-8-48-6-58-6 58-8 48-8 0 2-50-4-44v-32l-6-30 0 34-8 2-6-40 8-48z');
      sil.setAttribute('fill', 'var(--panel2)'); sil.setAttribute('stroke', 'var(--border)'); svg.appendChild(sil);
      var on = {}; (picked || []).forEach(function(r) { on[r] = 1; });
      var main = {}, help = {}; ((hi && hi.main) || []).forEach(function(r) { main[r] = 1; }); ((hi && hi.help) || []).forEach(function(r) { help[r] = 1; });
      self.SHAPES.filter(function(sh) { return sh[1] === view; }).forEach(function(sh) {
        var el = document.createElementNS(NS, sh[2] === 'e' ? 'ellipse' : 'rect');
        if (sh[2] === 'e') { el.setAttribute('cx', sh[3]); el.setAttribute('cy', sh[4]); el.setAttribute('rx', sh[5] / 2 + 2); el.setAttribute('ry', sh[6] / 2 + 2); }
        else { el.setAttribute('x', sh[3]); el.setAttribute('y', sh[4]); el.setAttribute('width', sh[5]); el.setAttribute('height', sh[6]); el.setAttribute('rx', 4); }
        var fill = main[sh[0]] ? (opts.mainColor || '#C9A84C') : help[sh[0]] ? (opts.helpColor || 'rgba(201,168,76,.45)') : on[sh[0]] ? '#9B59B6' : 'rgba(138,143,163,.25)';
        var tgt = (opts.outline || []).indexOf(sh[0]) >= 0;
        el.setAttribute('fill', fill); el.setAttribute('stroke', tgt ? (opts.mainColor || 'var(--gold)') : 'var(--bg)'); if (tgt) { el.setAttribute('stroke-width', '2'); el.setAttribute('stroke-dasharray', '3 2'); el.setAttribute('data-target', '1'); } el.setAttribute('data-region', sh[0]); el.setAttribute('class', 'gl-region');
        if (onTap) { el.style.cursor = 'pointer'; el.addEventListener('click', function() { onTap(sh[0]); }); }
        svg.appendChild(el);
      });
      return svg;
    },
    drawMap: function(box, s) {
      var self = RPGACE.modules.gymLive, L = self.logic, U = self.ui, EL = RPGACE.modules.exerciseLibrary;
      var h = document.createElement('div'); h.style.cssText = 'font-size:14px;margin-bottom:6px;'; h.textContent = 'Tap the muscles you want to hit today.'; box.appendChild(h);
      var vrow = document.createElement('div'); vrow.style.cssText = 'display:flex;gap:6px;justify-content:center;margin-bottom:6px;';
      [['f', 'Front'], ['b', 'Back']].forEach(function(v) { var b = U._btn(v[1], s.view === v[0] ? 'primary' : '', 'gl-view-' + v[0]); b.onclick = function() { s.view = v[0]; L.store(s); self.ui.draw(box.parentNode); }; vrow.appendChild(b); });
      box.appendChild(vrow);
      var toggle = function(r) { var i = s.regions.indexOf(r); if (i > -1) s.regions.splice(i, 1); else s.regions.push(r); L.store(s); self.ui.draw(box.parentNode); };
      box.appendChild(U.bodySvg(s.view, s.regions, null, toggle));
      var fb = document.createElement('div'); fb.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:6px 0;';
      self.FULL_BODY.forEach(function(r) { var rg = EL && EL.logic.region(r), b = U._btn((s.regions.indexOf(r) > -1 ? '✓ ' : '') + (rg ? rg.label : r), '', 'gl-fb-' + r); b.onclick = function() { toggle(r); }; fb.appendChild(b); });
      box.appendChild(fb);
      var picked = document.createElement('div'); picked.id = 'gl-picked'; picked.style.cssText = 'font-size:13px;color:var(--muted);margin:4px 0 8px;';
      picked.textContent = s.regions.length ? 'Picked: ' + s.regions.map(function(r) { var rg = EL && EL.logic.region(r); return rg ? rg.label : r; }).join(', ') : 'Nothing picked yet.';
      box.appendChild(picked);
      var go = U._btn('Next: pick exercises', 'primary', 'gl-next-btn'); go.style.width = '100%'; go.disabled = !s.regions.length; go.style.opacity = s.regions.length ? '1' : '.5';
      go.onclick = function() { s.step = 'pick'; L.store(s); self.ui.draw(box.parentNode); };
      box.appendChild(go);
      var lg = U._btn('📋 Log & bests', '', 'gl-log'); lg.style.cssText += 'width:100%;margin-top:6px;';
      lg.onclick = function() { var g = RPGACE.modules.gymTracker; if (g) g.ui.open(); };
      box.appendChild(lg);
    },
    // GL-2: ranked exercises for the picked muscles, prefilled from last time.
    drawPick: function(box, s) {
      var self = RPGACE.modules.gymLive, L = self.logic, U = self.ui, EL = RPGACE.modules.exerciseLibrary, G = RPGACE.modules.gymTracker;
      box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading exercises…</div>';
      Promise.all([EL.logic.load().catch(function() { return []; }), G.logic.load().catch(function() { return []; })]).then(function(r) {
        var ranked = L.rank(EL.logic.merge(r[0]), s.regions), sessions = r[1], chosen = {};
        box.innerHTML = '';
        var h = document.createElement('div'); h.style.cssText = 'font-size:14px;margin-bottom:6px;'; h.textContent = 'Best matches for what you picked. Tick the ones you\'ll do.'; box.appendChild(h);
        if (!ranked.length) { var em = document.createElement('div'); em.textContent = 'No exercises for those muscles yet.'; box.appendChild(em); }
        ranked.slice(0, 15).forEach(function(o, i) {
          var t = L.target(L.last(sessions, o.x.name));
          var lab = document.createElement('label'); lab.className = 'gl-ex'; lab.dataset.name = o.x.name;
          lab.style.cssText = 'display:flex;gap:10px;align-items:center;min-height:52px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;';
          lab.innerHTML = '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--gold);"><span style="flex:1;min-width:0;"><b></b><br><span class="gl-ex-sub" style="font-size:12px;color:var(--muted);"></span></span>';
          lab.querySelector('b').textContent = o.x.name + (o.x.fromVideo ? ' 🎬' : '');
          lab.querySelector('.gl-ex-sub').textContent = 'hits ' + o.hits.map(function(k) { var rg = EL.logic.region(k); return rg ? rg.label : k; }).join(', ') + ' · ' + t.why;
          var cb = lab.querySelector('input'); if (i < 3) { cb.checked = true; chosen[o.x.name] = { x: o.x, t: t }; }
          cb.onchange = function() { if (cb.checked) chosen[o.x.name] = { x: o.x, t: t }; else delete chosen[o.x.name]; };
          box.appendChild(lab);
        });
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:10px;';
        var back = U._btn('← Muscles', '', 'gl-back'); back.onclick = function() { s.step = 'map'; L.store(s); self.ui.draw(box.parentNode); };
        var go = U._btn('▶ Start workout', 'primary', 'gl-start'); go.style.flex = '1';
        go.onclick = function() {
          var names = Object.keys(chosen); if (!names.length) { RPGACE.utils.toast('Tick at least one exercise', 'var(--muted)', 2000); return; }
          s.exercises = names.map(function(n) { return L.exerciseFrom(chosen[n].x, chosen[n].t); }); s.step = 'go'; s.started = Date.now(); L.store(s); self.ui.draw(box.parentNode);
        };
        row.appendChild(back); row.appendChild(go); box.appendChild(row);
      });
    },
    // GL-3/4: log each set, rest timer, form help, Finish saves.
    drawWorkout: function(box, s) {
      var self = RPGACE.modules.gymLive, L = self.logic, U = self.ui, EL = RPGACE.modules.exerciseLibrary;
      box.innerHTML = '';
      var cur = L.current(s);
      var rest = document.createElement('div'); rest.id = 'gl-rest'; rest.style.cssText = 'font-size:16px;font-weight:700;text-align:center;margin-bottom:8px;font-variant-numeric:tabular-nums;';
      box.appendChild(rest);
      var tick = function() {
        if (!rest.isConnected) return;
        var left = Math.ceil((s.restUntil - Date.now()) / 1000);
        rest.textContent = left > 0 ? '⏱ Rest ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : (cur ? '▶ ' + cur.e.name + ' · set ' + cur.set + ' of ' + cur.of : '✅ All sets done');
        if (left > 0) setTimeout(tick, 500); else if (s.restUntil && left === 0 && navigator.vibrate) try { navigator.vibrate(300); } catch (e) {}
      };
      tick();
      if (cur) box.appendChild(U.bodySvg(cur.e.primary.concat(cur.e.secondary).some(function(r) { return ['upper_back', 'lats', 'mid_back', 'lower_back', 'rear_delts', 'rotator_cuff', 'triceps', 'glute_max', 'glute_med', 'hamstrings'].indexOf(r) > -1; }) && !cur.e.primary.some(function(r) { return ['upper_chest', 'mid_chest', 'lower_chest', 'quads', 'abs', 'biceps', 'front_delts'].indexOf(r) > -1; }) ? 'b' : 'f', [], { main: cur.e.primary, help: cur.e.secondary }, null));
      s.exercises.forEach(function(e, ei) {
        var c = document.createElement('div'); c.className = 'gl-card'; c.dataset.name = e.name;
        c.style.cssText = 'border:1px solid ' + (cur && cur.e === e ? 'var(--gold)' : 'var(--border)') + ';border-radius:10px;padding:8px 10px;margin:8px 0;';
        var t = document.createElement('div'); t.style.cssText = 'font-weight:700;font-size:15px;'; t.textContent = e.name; c.appendChild(t);
        var sub = document.createElement('div'); sub.style.cssText = 'font-size:12px;color:var(--muted);';
        sub.textContent = [e.cue, 'main: ' + e.primary.map(function(k) { var rg = EL && EL.logic.region(k); return rg ? rg.label : k; }).join(', '), e.why].filter(Boolean).join(' · ');
        c.appendChild(sub);
        e.sets.forEach(function(x, si) {
          var r = document.createElement('div'); r.className = 'gl-set'; r.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px;';
          var css = 'width:64px;min-height:40px;font-size:16px;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);';
          r.innerHTML = '<span style="width:44px;font-size:13px;color:var(--muted);">Set ' + (si + 1) + '</span>';
          var reps = document.createElement('input'); reps.type = 'number'; reps.inputMode = 'numeric'; reps.className = 'gl-reps'; reps.value = x.reps == null ? '' : x.reps; reps.style.cssText = css; reps.placeholder = 'reps';
          var kg = document.createElement('input'); kg.type = 'number'; kg.inputMode = 'decimal'; kg.step = '0.5'; kg.className = 'gl-kg'; kg.value = x.kg == null ? '' : x.kg; kg.style.cssText = css; kg.placeholder = 'kg';
          reps.onchange = function() { x.reps = reps.value === '' ? null : parseInt(reps.value, 10); L.store(s); };
          kg.onchange = function() { x.kg = kg.value === '' ? null : parseFloat(kg.value); L.store(s); };
          var d = U._btn(x.done ? '✓' : 'Done', x.done ? 'primary' : '', null); d.className += ' gl-set-done'; d.style.minWidth = '64px';
          d.onclick = function() { x.reps = reps.value === '' ? null : parseInt(reps.value, 10); x.kg = kg.value === '' ? null : parseFloat(kg.value); x.done = !x.done; if (x.done) s.restUntil = Date.now() + self.REST * 1000; L.store(s); U.drawWorkout(box, s); };
          r.appendChild(reps); r.appendChild(document.createTextNode('×')); r.appendChild(kg); r.appendChild(d); c.appendChild(r);
        });
        var tools = document.createElement('div'); tools.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
        var add = U._btn('＋ Set', '', null); add.className += ' gl-add-set'; add.onclick = function() { var l = e.sets[e.sets.length - 1] || {}; e.sets.push({ reps: l.reps, kg: l.kg, done: false }); L.store(s); U.drawWorkout(box, s); };
        var yt = U._btn('📺 Form video', '', null); yt.className += ' gl-yt';
        yt.onclick = function() { self._watching = e.name; window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(e.name + ' proper form'), '_blank', 'noopener'); };
        var rm = U._btn('Remove', '', null); rm.className += ' gl-rm'; rm.onclick = function() { s.exercises.splice(ei, 1); L.store(s); U.drawWorkout(box, s); };
        tools.appendChild(add); tools.appendChild(yt); tools.appendChild(rm); c.appendChild(tools);
        box.appendChild(c);
      });
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;';
      var more = U._btn('＋ Exercise', '', 'gl-more'); more.onclick = function() { s.step = 'pick'; L.store(s); self.ui.draw(box.parentNode); };
      var fin = U._btn('🏁 Finish workout', 'primary', 'gl-finish'); fin.style.flex = '1';
      fin.onclick = function() {
        var rows = L.rows(s); if (!rows.length) { RPGACE.utils.toast('Tick at least one set as Done first', 'var(--muted)', 2200); return; }
        fin.disabled = true;
        RPGACE.modules.gymTracker.logic.save({ performed_on: s.date, duration_min: Math.max(1, Math.round((Date.now() - s.started) / 60000)), notes: 'Live now · ' + s.regions.join(', ') }, rows).then(function() {
          var lifted = rows.map(function(r) { return r.exercise + ' ' + r.sets + '×' + r.reps + (r.kg ? '@' + r.kg + 'kg' : ''); }).join('; ');
          L.store(null); RPGACE.utils.toast('🏋️ Workout saved', '#4caf82', 2500);
          if (s.planId && RPGACE.modules.gymPlan) RPGACE.modules.gymPlan.logic.setStatus(s.planId, 'done');
          try { RPGACE.hooks.fire('gym:finished', { lifted: lifted }); } catch (e) {}
          U.afterFinish(box, s.date, lifted);
        }, function(e) { fin.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'gymLive'); });
      };
      // GY-4 (Alex: "make sure ask oracle is present on gym live"): the floating Oracle chat, which knows the lift you're on.
      var ask = U._btn('🔮 Ask Oracle', '', 'gl-ask'); ask.style.cssText += 'width:100%;';
      ask.onclick = function() { var RP = RPGACE.modules.realmPages; if (RP) RP.ui._footOpen('athlete', 'prompts'); else if (RPGACE.modules.realmFrame) RPGACE.modules.realmFrame.ui.ask(''); };
      row.appendChild(more); row.appendChild(fin); row.appendChild(ask); box.appendChild(row);
    },
    // GL-6: after Finish, the chat (if any) can suggest changes for next time.
    afterFinish: function(box, day, lifted) {
      var self = RPGACE.modules.gymLive, U = self.ui;
      box.innerHTML = '<div style="font-size:15px;font-weight:700;margin-bottom:6px;">✅ Workout saved</div>';
      self.logic.chats().then(function(rows) {
        var row = (rows || []).filter(function(r) { return r.cook_key === 'gym_' + day; })[0];
        if (!row) { var n = document.createElement('div'); n.style.cssText = 'font-size:13px;color:var(--muted);'; n.textContent = 'No gym chat today, so nothing to suggest.'; box.appendChild(n); return; }
        var b = U._btn('💡 Suggest changes for next workout', 'primary', 'gl-propose'); b.style.width = '100%';
        b.onclick = function() { b.disabled = true; b.textContent = 'Thinking…'; self.logic.propose(row, lifted).then(function(cs) { b.remove(); U.drawChanges(box, cs); }, function(e) { b.disabled = false; b.textContent = '💡 Suggest changes for next workout'; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'gymLive'); }); };
        box.appendChild(b);
      });
    },
    drawChanges: function(box, cs) {
      var self = RPGACE.modules.gymLive, U = self.ui;
      if (!cs.length) { box.appendChild(document.createTextNode('Nothing to change - keep going.')); return; }
      cs.forEach(function(c) {
        var r = document.createElement('div'); r.className = 'gl-change'; r.style.cssText = 'border-bottom:1px solid var(--border);padding:6px 0;';
        r.innerHTML = '<div style="font-weight:700;"></div><div style="font-size:12px;color:var(--muted);"></div>';
        r.children[0].textContent = (c.exercise ? c.exercise + ': ' : '') + c.change; r.children[1].textContent = c.because;
        var bt = document.createElement('div'); bt.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
        var ok = U._btn('Keep for next time', 'primary', null); ok.className += ' gl-keep';
        var no = U._btn('Reject', '', null); no.className += ' gl-reject';
        var talk = U._btn('Talk to Oracle', '', null);
        ok.onclick = function() { ok.disabled = true; self.logic.keepNext(c).then(function() { r.style.opacity = '.6'; bt.innerHTML = '✓ Kept'; }, function(e) { ok.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'gymLive'); }); };
        no.onclick = function() { r.remove(); };
        talk.onclick = function() { var RF = RPGACE.modules.realmFrame; if (RF) RF.ui.ask('About my next workout: "' + c.change + '" - '); };
        bt.appendChild(ok); bt.appendChild(no); bt.appendChild(talk); r.appendChild(bt); box.appendChild(r);
      });
    },
    // GL-4: back from YouTube.
    askShareBack: function() {
      var self = RPGACE.modules.gymLive, name = self._watching; self._watching = null;
      if (!name || document.getElementById('gl-share')) return;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📺 ' + name, title: 'Share and take in that video?', width: '420px' });
      pop.box.id = 'gl-share';
      var p = document.createElement('div'); p.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;'; p.textContent = 'Paste the link of the video you watched. It is analysed for Athlete and your library grows.'; pop.box.appendChild(p);
      var inp = document.createElement('input'); inp.type = 'url'; inp.id = 'gl-share-url'; inp.placeholder = 'https://youtube.com/…';
      inp.style.cssText = 'width:100%;box-sizing:border-box;font-size:16px;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);margin-bottom:8px;';
      pop.box.appendChild(inp);
      var ok = self.ui._btn('📥 Take it in', 'primary', 'gl-share-ok'); ok.style.width = '100%'; RPGACE.kit.needs(ok, inp, 'Paste the video link first');
      ok.onclick = function() {
        var u = inp.value.trim(); if (!/^https?:\/\//.test(u)) { RPGACE.utils.toast('That isn\'t a link', 'var(--muted)', 2000); return; }
        var SI = RPGACE.modules.shareInbox; ok.disabled = true;
        SI.logic.queue(u, { preset: ['athlete'], note: 'Form video for ' + name }, null, SI.ui.askWhy).then(function(r) { pop.close(); RPGACE.utils.toast(r && r.already ? 'Already in the queue' : '📥 Taken in for Athlete', '#4caf82', 2500); },
          function(e) { ok.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'gymLive'); });
      };
      var no = self.ui._btn('Not now', '', 'gl-share-no'); no.style.cssText += 'width:100%;margin-top:6px;'; no.onclick = function() { pop.close(); };
      pop.box.appendChild(ok); pop.box.appendChild(no);
      return pop;
    }
  }
});
/* ===END:gymLive=== */
