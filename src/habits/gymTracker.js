
/* ===MODULE:gymTracker=== */
// Oct 10 2026 — HABITS module 2, Alex's pick for D1's "next HABITS module":
// "gym tracker". Log a session (exercise x sets x reps x kg), see this week
// against a 5-session target (the same number as the Quest Board's weekly
// "5x gym sessions"), personal bests per exercise (heaviest set and an
// Epley estimated 1-rep max), and recent history. Tables gym_sessions +
// gym_sets (anon_read_only / authenticated_all); every write goes through
// RPGACE.sb.secureWrite. Sessions also show in Chronicles and the Morning
// Brief's own-words section, and Ask My Data can read gym_sets.
RPGACE.register('gymTracker', {
  domain: 'habits',

  WEEKLY_TARGET: 5, // RF-3: replaced on login by Athlete's realm target (realmFrame)

  init: function() {},

  logic: {
    _iso: function(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    weekStart: function(now) {
      var d = now ? new Date(now) : new Date();
      var day = (d.getDay() + 6) % 7; // Monday = 0
      d.setDate(d.getDate() - day);
      return RPGACE.modules.gymTracker.logic._iso(d);
    },
    e1rm: function(kg, reps) {
      kg = Number(kg); reps = Number(reps);
      if (!kg || !reps || reps < 1) return 0;
      return reps === 1 ? kg : kg * (1 + reps / 30);
    },
    load: function() {
      return RPGACE.sb.select('gym_sessions', 'select=id,performed_on,duration_min,notes,created_at,gym_sets(id,exercise,set_index,reps,weight_kg)&order=performed_on.desc,created_at.desc&limit=60')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    thisWeek: function(sessions, now) {
      var ws = RPGACE.modules.gymTracker.logic.weekStart(now);
      return (sessions || []).filter(function(s) { return s.performed_on >= ws; }).length;
    },
    bests: function(sessions) {
      var L = RPGACE.modules.gymTracker.logic, out = {};
      (sessions || []).forEach(function(s) {
        (s.gym_sets || []).forEach(function(x) {
          var k = String(x.exercise || '').trim().toLowerCase();
          if (!k) return;
          var b = out[k] || (out[k] = { exercise: x.exercise, maxKg: 0, maxKgReps: 0, maxKgOn: null, e1rm: 0 });
          var kg = Number(x.weight_kg) || 0, reps = Number(x.reps) || 0;
          if (kg > b.maxKg || (kg === b.maxKg && reps > b.maxKgReps)) { b.maxKg = kg; b.maxKgReps = reps; b.maxKgOn = s.performed_on; }
          b.e1rm = Math.max(b.e1rm, L.e1rm(kg, reps));
        });
      });
      return Object.keys(out).map(function(k) { return out[k]; }).sort(function(a, b) { return b.e1rm - a.e1rm || b.maxKg - a.maxKg; });
    },
    exercises: function(sessions) {
      var seen = {}, out = [];
      (sessions || []).forEach(function(s) { (s.gym_sets || []).forEach(function(x) { var k = String(x.exercise || '').toLowerCase(); if (k && !seen[k]) { seen[k] = 1; out.push(x.exercise); } }); });
      return out;
    },
    // Group a session's sets back into exercise rows: {exercise, sets, reps, kg}.
    rowsOf: function(session) {
      var by = {}, order = [];
      (session && session.gym_sets || []).slice().sort(function(a, b) { return (a.set_index || 0) - (b.set_index || 0); }).forEach(function(x) {
        var k = x.exercise + '|' + (x.reps || '') + '|' + (x.weight_kg == null ? '' : x.weight_kg);
        if (!by[k]) { by[k] = { exercise: x.exercise, sets: 0, reps: x.reps, kg: x.weight_kg }; order.push(k); }
        by[k].sets++;
      });
      return order.map(function(k) { return by[k]; });
    },
    // rows: [{exercise, sets, reps, kg}] -> one gym_sets row per set.
    expand: function(rows, sessionId) {
      var out = [], idx = 0;
      (rows || []).forEach(function(r) {
        var n = Math.max(1, Math.min(20, parseInt(r.sets, 10) || 1));
        for (var i = 0; i < n; i++) {
          idx++;
          out.push({ session_id: sessionId, exercise: String(r.exercise).trim(), set_index: idx, reps: r.reps === '' || r.reps == null ? null : parseInt(r.reps, 10), weight_kg: r.kg === '' || r.kg == null ? null : Number(r.kg) });
        }
      });
      return out;
    },
    // Names of exercises where this session beats every earlier best.
    newBests: function(rows, sessions) {
      var L = RPGACE.modules.gymTracker.logic, prev = {};
      L.bests(sessions).forEach(function(b) { prev[b.exercise.toLowerCase()] = b; });
      var out = [];
      (rows || []).forEach(function(r) {
        var k = String(r.exercise).trim().toLowerCase(), kg = Number(r.kg) || 0;
        var p = prev[k];
        if (p && kg > p.maxKg && out.indexOf(r.exercise) === -1) out.push(r.exercise.trim() + ' ' + kg + 'kg');
      });
      return out;
    },
    save: function(session, rows) {
      var L = RPGACE.modules.gymTracker.logic;
      return RPGACE.sb.secureWrite('gym_sessions', 'insert', session).then(function(data) {
        var row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.id) throw new Error('session saved but no id came back');
        var sets = L.expand(rows, row.id);
        if (!sets.length) return row;
        return RPGACE.sb.secureWrite('gym_sets', 'insert', sets).then(function() { return row; });
      }).then(function(row) { RPGACE.cache.clear('gym_sessions'); RPGACE.cache.clear('gym_sets'); return row; });
    },
    remove: function(id) {
      return RPGACE.sb.secureWrite('gym_sessions', 'delete', null, 'id=eq.' + id).then(function() { RPGACE.cache.clear('gym_sessions'); });
    },
    weekLine: function() {
      var self = RPGACE.modules.gymTracker;
      return RPGACE.sb.select('gym_sessions', 'select=performed_on&performed_on=gte.' + self.logic.weekStart()).then(function(r) {
        var n = Array.isArray(r) ? r.length : 0;
        return 'Gym this week: ' + n + ' / ' + self.WEEKLY_TARGET + ' sessions';
      });
    },
  },

  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, kind) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
        (kind === 'primary' ? 'background:var(--purple);border:none;color:#fff;' : 'background:none;border:1px solid var(--border);color:var(--text);');
      return b;
    },

    open: function() {
      var self = RPGACE.modules.gymTracker;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🏋️ Habits', title: 'Gym', width: '560px' });
      pop.box.innerHTML = '<div style="color:var(--muted);font-size:13px;">Loading…</div>';
      var draw = function() {
        self.logic.load().then(function(sessions) { self.ui.render(pop, sessions, draw); })
          .catch(function(e) { pop.box.innerHTML = ''; var m = document.createElement('div'); m.style.color = '#CC4A4A'; m.textContent = 'Could not load gym sessions: ' + (e.message || e); pop.box.appendChild(m); });
      };
      draw();
      return pop;
    },

    render: function(pop, sessions, redraw) {
      var self = RPGACE.modules.gymTracker, esc = self.ui._esc;
      var box = pop.box;
      box.innerHTML = '';
      var n = self.logic.thisWeek(sessions), T = self.WEEKLY_TARGET;
      var head = document.createElement('div');
      head.style.cssText = 'margin-bottom:14px;';
      var last = sessions[0];
      var days = last ? Math.round((Date.parse(self.logic._iso(new Date()) + 'T00:00:00') - Date.parse(last.performed_on + 'T00:00:00')) / 86400000) : null;
      head.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text);font-variant-numeric:tabular-nums;margin-bottom:6px;"><b>This week: ' + n + ' / ' + T + '</b><span style="color:var(--muted);">' +
        (days == null ? 'No sessions yet' : 'Last session ' + (days === 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago')) + '</span></div>' +
        '<div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;"><div style="height:100%;width:' + Math.min(100, Math.round(n / T * 100)) + '%;background:var(--purple);"></div></div>';
      box.appendChild(head);

      var actions = document.createElement('div');
      actions.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;';
      var logB = self.ui._btn('+ Log a session', 'primary');
      logB.onclick = function() { self.ui.openLog(sessions, null, redraw); };
      var repB = self.ui._btn('↻ Repeat last', '');
      repB.disabled = !last; repB.style.opacity = last ? '1' : '0.4';
      repB.onclick = function() { self.ui.openLog(sessions, self.logic.rowsOf(last), redraw); };
      actions.appendChild(logB); actions.appendChild(repB);
      box.appendChild(actions);
      // DR-12: exercise library + gym videos waiting for review.
      if (RPGACE.modules.exerciseLibrary) RPGACE.modules.exerciseLibrary.ui.mountGym(box);
      // DR-9 (Oct 27 2026, Alex: "One Gym page with everything"): today's
      // workout from the programme + next-weight suggestions (healthBody's
      // renderGym, same engine) sit on the Gym page; Health & body lost its tab.
      var hb = RPGACE.modules.healthBody;
      if (hb && hb.logic.signedIn && hb.logic.signedIn()) {
        var plan = document.createElement('div'); plan.id = 'gym-plan'; plan.style.cssText = 'margin-bottom:16px;';
        box.appendChild(plan);
        hb.ui.renderGym(plan).catch(function(e) { plan.textContent = 'Could not load your programme: ' + (e.message || e); });
      }

      var bests = self.logic.bests(sessions).filter(function(b) { return b.maxKg > 0; });
      if (bests.length) {
        var bh = document.createElement('div');
        bh.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;';
        bh.textContent = 'Personal bests';
        box.appendChild(bh);
        bests.slice(0, 8).forEach(function(b) {
          var r = document.createElement('div');
          r.style.cssText = 'display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;font-variant-numeric:tabular-nums;';
          r.innerHTML = '<span style="color:var(--text);">' + esc(b.exercise) + '</span><span style="color:var(--muted);">' + b.maxKg + ' kg × ' + b.maxKgReps + ' · est. 1RM ' + Math.round(b.e1rm) + ' kg</span>';
          box.appendChild(r);
        });
      }

      var hh = document.createElement('div');
      hh.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:16px 0 6px;';
      hh.textContent = 'Recent sessions';
      box.appendChild(hh);
      if (!sessions.length) {
        var e = document.createElement('div');
        e.style.cssText = 'font-size:13px;color:var(--muted);';
        e.textContent = 'Nothing logged yet. Tap + Log a session after your next workout.';
        box.appendChild(e);
      }
      sessions.slice(0, 12).forEach(function(s) {
        var rows = self.logic.rowsOf(s);
        var card = document.createElement('div');
        card.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);';
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';
        var t = document.createElement('div');
        t.style.cssText = 'font-size:14px;color:var(--text);font-weight:700;';
        t.textContent = new Date(s.performed_on + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + (s.duration_min ? ' · ' + s.duration_min + ' min' : '');
        var del = document.createElement('button');
        del.type = 'button'; del.textContent = '🗑';
        del.title = 'Delete session';
        del.style.cssText = 'min-height:36px;min-width:36px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
        var armed = false, timer = null;
        del.onclick = function() {
          if (!armed) { armed = true; del.textContent = 'Delete?'; del.style.color = '#CC4A4A'; timer = setTimeout(function() { armed = false; del.textContent = '🗑'; del.style.color = 'var(--muted)'; }, 3000); return; }
          clearTimeout(timer); del.disabled = true;
          self.logic.remove(s.id).then(redraw).catch(function(err) { del.disabled = false; RPGACE.utils.toast('⚠️ Delete failed: ' + (err.message || err), '#CC4A4A', 3500, 'gymTracker'); });
        };
        top.appendChild(t); top.appendChild(del);
        card.appendChild(top);
        var lines = document.createElement('div');
        lines.style.cssText = 'font-size:13px;color:var(--muted);margin-top:4px;line-height:1.6;font-variant-numeric:tabular-nums;';
        lines.innerHTML = rows.map(function(r) { return esc(r.exercise) + ' — ' + r.sets + ' × ' + (r.reps == null ? '?' : r.reps) + (r.kg != null ? ' @ ' + r.kg + ' kg' : ''); }).join('<br>') + (s.notes ? '<br><i>' + esc(s.notes) + '</i>' : '');
        card.appendChild(lines);
        box.appendChild(card);
      });
    },

    // opts.minutes prefills the Minutes box (DN-3: time from Doing Now); onSaved gets the saved session row.
    openLog: function(sessions, prefill, onSaved, opts) {
      var self = RPGACE.modules.gymTracker;
      opts = opts || {};
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🏋️ Gym', title: prefill ? 'Repeat last session' : 'Log a session', width: '520px', noDefaultClose: true });
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;font-family:Rajdhani,sans-serif;min-width:0;width:100%;box-sizing:border-box;';
      var dl = document.createElement('datalist');
      dl.id = 'gym-ex-list';
      self.logic.exercises(sessions).forEach(function(x) { var o = document.createElement('option'); o.value = x; dl.appendChild(o); });
      pop.box.appendChild(dl);
      var top = document.createElement('div');
      top.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;';
      top.innerHTML = '<label style="font-size:12px;color:var(--muted);">Date<input id="gym-date" type="date" style="' + inp + 'margin-top:4px;"></label>' +
        '<label style="font-size:12px;color:var(--muted);">Minutes (optional)<input id="gym-min" type="number" min="0" inputmode="numeric" style="' + inp + 'margin-top:4px;"></label>';
      pop.box.appendChild(top);
      pop.box.querySelector('#gym-date').value = self.logic._iso(new Date());
      if (opts.minutes) pop.box.querySelector('#gym-min').value = String(opts.minutes);
      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:grid;grid-template-columns:1fr 48px 52px 60px 36px;gap:6px;font-size:12px;color:var(--muted);margin-bottom:4px;';
      hdr.innerHTML = '<span>Exercise</span><span>Sets</span><span>Reps</span><span>kg</span><span></span>';
      pop.box.appendChild(hdr);
      var list = document.createElement('div');
      pop.box.appendChild(list);
      var rowsEls = [];
      var addRow = function(r) {
        r = r || {};
        var el = document.createElement('div');
        el.className = 'gym-row';
        el.style.cssText = 'display:grid;grid-template-columns:1fr 48px 52px 60px 36px;gap:6px;margin-bottom:6px;align-items:center;';
        el.innerHTML = '<input class="gym-ex" type="text" list="gym-ex-list" placeholder="e.g. Squat" style="' + inp + '">' +
          '<input class="gym-sets" type="number" min="1" max="20" inputmode="numeric" style="' + inp + '">' +
          '<input class="gym-reps" type="number" min="0" inputmode="numeric" style="' + inp + '">' +
          '<input class="gym-kg" type="number" min="0" step="0.5" inputmode="decimal" style="' + inp + '">' +
          '<button type="button" title="Remove" style="min-height:36px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;">✕</button>';
        el.querySelector('.gym-ex').value = r.exercise || '';
        el.querySelector('.gym-sets').value = r.sets || 3;
        el.querySelector('.gym-reps').value = r.reps == null ? '' : r.reps;
        el.querySelector('.gym-kg').value = r.kg == null ? '' : r.kg;
        el.querySelector('button').onclick = function() { el.remove(); rowsEls = rowsEls.filter(function(x) { return x !== el; }); };
        list.appendChild(el); rowsEls.push(el);
      };
      (prefill && prefill.length ? prefill : [null]).forEach(addRow);
      var add = self.ui._btn('+ Add exercise', '');
      add.style.width = '100%'; add.style.marginTop = '4px';
      add.onclick = function() { addRow(); };
      pop.box.appendChild(add);
      var notes = document.createElement('textarea');
      notes.id = 'gym-notes'; notes.rows = 2; notes.placeholder = 'Notes (optional) — how it felt, what to change next time';
      notes.style.cssText = inp + 'margin-top:10px;resize:vertical;';
      pop.box.appendChild(notes);
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:12px;display:none;margin-top:8px;';
      pop.box.appendChild(err);
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:12px;';
      var cancel = self.ui._btn('Cancel', ''); cancel.onclick = function() { pop.close(); };
      var save = self.ui._btn('Save session', 'primary'); save.id = 'gym-save';
      bar.appendChild(cancel); bar.appendChild(save);
      pop.box.appendChild(bar);
      save.onclick = function() {
        var rows = rowsEls.map(function(el) {
          return { exercise: el.querySelector('.gym-ex').value.trim(), sets: el.querySelector('.gym-sets').value, reps: el.querySelector('.gym-reps').value, kg: el.querySelector('.gym-kg').value };
        }).filter(function(r) { return r.exercise; });
        var date = pop.box.querySelector('#gym-date').value;
        if (!date) { err.textContent = 'Pick the date.'; err.style.display = 'block'; return; }
        if (!rows.length) { err.textContent = 'Add at least one exercise.'; err.style.display = 'block'; return; }
        var mins = parseInt(pop.box.querySelector('#gym-min').value, 10);
        var pbs = self.logic.newBests(rows, sessions);
        save.disabled = true; save.textContent = 'Saving…';
        self.logic.save({ performed_on: date, duration_min: isNaN(mins) ? null : mins, notes: notes.value.trim() || null }, rows).then(function(row) {
          pop.close();
          RPGACE.utils.toast(pbs.length ? '🏆 New best: ' + pbs.join(', ') : '🏋️ Session logged', '#4caf82', 3000);
          if (onSaved) onSaved(row);
        }).catch(function(e) { save.disabled = false; save.textContent = 'Save session'; err.textContent = 'Save failed: ' + (e.message || e); err.style.display = 'block'; });
      };
    },
  },

  open: function() { return this.ui.open(); },
});
/* ===END:gymTracker=== */
