/* ===MODULE:liveModes=== */
// OA-3..OA-8 (Nov 4 2026, plan "Oracle Assistant + Live now modes",
// records/2026-11/oracle_assistant_live_modes_paranoia_2026-11-04.txt). Alex:
// "I want live now to have a mode for each domain and sub domain - while
// cooking, at gym, work, music production and others where possible"; "I want
// everything I can do as actions in RPGACE to have a live now page, linked to
// domain or sub domain where it makes sense". One Live now page
// (realmTasks.ui._drawLive) with ONE mode slot: logic.pick() chooses the mode
// from what you're doing (the block, the realm, a shift), ui.draw() puts that
// activity's EXISTING screen inside Live now - never a copy (rule 8):
//   cook  -> cookingOracle.ui._renderLiveCookPanel (steps, timers, Finish cook)
//   gym   -> gymTracker.ui.render (this week, Log a session, bests)
//   work  -> workMode.ui.open({ host }) (clock in/break/out + drink specs)
//   music -> beatsHub.logic.load() next list + Make / Mix / Log a beat
//   shop  -> shopTrip.ui.draw (ST-1: which shop, list + wishlist, basket ticks)
// No mode = the standard Live now (steps, timer, Done, Ask Oracle) + an Open
// button to the action's own tool (OA-8).
RPGACE.register('liveModes', {
  domain: 'schedule',

  MODES: {
    cook:  { icon: '🍳', name: 'Cooking mode' },
    gym:   { icon: '🏋️', name: 'Gym mode' },
    work:  { icon: '💼', name: 'Work mode' },
    music: { icon: '🎵', name: 'Music production mode' },
    shop:  { icon: '🛒', name: 'Shopping mode' }
  },

  logic: {
    // Pure: ctx { block, realm, onShift, action } -> mode key or null.
    // A block decides first (it's what you tapped), then the realm you're in,
    // then a shift happening now when nothing else is running.
    pick: function(ctx) {
      ctx = ctx || {};
      var b = ctx.block, r = ctx.realm || (b && b.realm) || null;
      if (ctx.mode && RPGACE.modules.liveModes.MODES[ctx.mode]) return ctx.mode;
      if (b && b.kind === 'cooking') return 'cook';
      if (ctx.action && ctx.action.opens === 'shop') return 'shop';
      if (ctx.action && ctx.action.opens === 'gym') return 'gym';
      if (ctx.action && (ctx.action.opens === 'cook' || ctx.action.opens === 'cooking')) return 'cook';
      if (r === 'chef') return 'cook';
      if (r === 'athlete') return 'gym';
      if (r === 'producer') return 'music';
      if (ctx.onShift && !b && (!r || r === 'life')) return 'work';
      return null;
    },
    // What Live now knows right now, for pick(). Reads only in-memory state.
    context: function(opts, liveRealm) {
      var w = RPGACE.modules.workMode, onShift = false;
      try { onShift = !!(w && w.logic.current()); } catch (e) {}
      return { block: opts.block || null, realm: opts.realm || liveRealm || null, onShift: onShift, action: opts.action || null, mode: opts.mode || null };
    }
  },

  ui: {
    // Draws the mode panel into Live now's box. Returns the mode key (or null).
    draw: function(box, ctx) {
      var self = RPGACE.modules.liveModes, key = self.logic.pick(ctx);
      var old = document.getElementById('lm-panel'); if (old) old.remove();
      if (!key) return null;
      var M = self.MODES[key];
      var wrap = document.createElement('div'); wrap.id = 'lm-panel'; wrap.className = 'lm-panel'; wrap.dataset.mode = key;
      wrap.style.cssText = 'margin:12px 0;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--panel);';
      var eb = document.createElement('div'); eb.className = 'lm-eyebrow';
      eb.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      eb.textContent = M.icon + ' ' + M.name;
      var body = document.createElement('div'); body.id = 'lm-body';
      wrap.appendChild(eb); wrap.appendChild(body); box.appendChild(wrap);
      try { self.ui['_' + key](body, ctx); }
      catch (e) { body.textContent = '⚠️ Could not open ' + M.name.toLowerCase() + ': ' + (e.message || e); }
      return key;
    },
    _fail: function(body, what, e) { body.innerHTML = ''; var m = document.createElement('div'); m.style.color = '#CC4A4A'; m.textContent = '⚠️ Could not load ' + what + ': ' + ((e && e.message) || e); body.appendChild(m); },
    _btns: function(body, list) {
      var row = document.createElement('div'); row.className = 'lm-btns'; row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
      list.forEach(function(x) { var b = RPGACE.kit.btn(x[0], x[2] || ''); b.style.minHeight = '44px'; if (x[3]) b.id = x[3]; b.onclick = x[1]; row.appendChild(b); });
      body.appendChild(row); return row;
    },

    // OA-4: the planned cook's live panel (steps, timers, Finish cook) in place;
    // with no planned cook, the ways into a cook.
    _cook: function(body, ctx) {
      var self = RPGACE.modules.liveModes, co = RPGACE.modules.cookingOracle, b = ctx.block;
      if (!co) { body.textContent = 'Cooking is not loaded.'; return; }
      var pcId = b && b.planned_cook_id;
      if (!pcId) {
        body.innerHTML = '<div style="font-size:13px;color:var(--muted);">No planned cook in this block. Pick a recipe or plan a cook.</div>';
        self.ui._btns(body, [
          ['📖 My recipes', function() { co.ui.openMain(); }, '', 'lm-cook-recipes'],
          ['🧹 Fit chores while it cooks', function() { var fc = document.getElementById('rt-block-fitchores'); if (fc) fc.click(); else RPGACE.utils.toast('Plan the cook as a block first, then chores can fit around it', 'var(--muted)', 2600); }, '', 'lm-cook-chores']
        ]);
        return;
      }
      body.textContent = 'Loading the cook…';
      var panel = document.createElement('div'); panel.id = 'live-cook-panel';
      RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids,schedule,agenda_id&id=eq.' + pcId).then(function(rows) {
        var pc = rows && rows[0];
        body.innerHTML = '';
        if (!pc || !pc.schedule || !pc.schedule.blocks) { self.ui._fail(body, 'this cook\'s schedule', 'no schedule saved'); return; }
        body.appendChild(panel);
        var draw = function(started) { try { co.ui._clearLiveCookIntervals(); } catch (e) {} co.ui._renderLiveCookPanel(panel, pc, started); };
        if (!pc.agenda_id) { draw(null); return; }
        RPGACE.sb.select('rpgace_agendas', 'select=started_at&id=eq.' + pc.agenda_id)
          .then(function(a) { draw((a && a[0] && a[0].started_at) || null); }, function() { draw(null); });
      }, function(e) { self.ui._fail(body, 'the cook', e); });
    },

    // OA-5: the gym screen itself (this week vs target, Log a session, bests).
    _gym: function(body) {
      var self = RPGACE.modules.liveModes, g = RPGACE.modules.gymTracker;
      // GL: muscles -> exercises -> sets, live (gymLive). The old screen stays behind "📋 Log & bests".
      if (RPGACE.modules.gymLive) { RPGACE.modules.gymLive.ui.draw(body); return; }
      if (!g) { body.textContent = 'Gym is not loaded.'; return; }
      body.textContent = 'Loading your sessions…';
      var host = { box: body, close: function() {} };
      var draw = function() { g.logic.load().then(function(s) { g.ui.render(host, s, draw); }, function(e) { self.ui._fail(body, 'gym sessions', e); }); };
      draw();
    },

    // OA-6: clock in / break / out + drink specs, the same Work screen.
    _work: function(body) {
      var w = RPGACE.modules.workMode;
      if (!w) { body.textContent = 'Work is not loaded.'; return; }
      w.ui.open({ host: body });
    },

    // OA-7: what's next on your beats (running, to mix, to release, newest
    // idea) + the three moves of a Producer block.
    _music: function(body) {
      var self = RPGACE.modules.liveModes, H = RPGACE.modules.beatsHub;
      if (!H) { body.textContent = 'Beats is not loaded.'; return; }
      var list = document.createElement('div'); list.id = 'lm-music-next'; list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      list.textContent = 'Loading your beats…';
      body.appendChild(list);
      self.ui._btns(body, [
        ['▶ Make', function() { H.ui.go('make'); }, 'primary', 'lm-music-make'],
        ['🎚 Mix', function() { H.ui.go('mix'); }, '', 'lm-music-mix'],
        ['🥁 Log a beat', function() { H.ui.go('log'); }, '', 'lm-music-log']
      ]);
      H.logic.load().then(function(m) {
        list.innerHTML = '';
        var next = (m.next || []).filter(function(x) { return x.key !== 'myday'; }).slice(0, 4);
        if (!next.length) { list.innerHTML = '<div style="font-size:13px;color:var(--muted);">Nothing waiting. Start making something new.</div>'; return; }
        next.forEach(function(x) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'lm-music-item';
          b.style.cssText = 'text-align:left;min-height:44px;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:14px;cursor:pointer;';
          b.textContent = x.icon + ' ' + x.text;
          b.onclick = function() { H.ui.go(x.key); };
          list.appendChild(b);
        });
      }, function(e) { self.ui._fail(list, 'your beats', e); });
    },

    // ST-1: a shop trip - which shop, the newest grocery list + wishlist picks, tick into the basket (shopTrip).
    _shop: function(body) {
      var st = RPGACE.modules.shopTrip;
      if (!st) { body.textContent = 'Shopping is not loaded.'; return; }
      st.ui.draw(body);
    },

    // OA-8: an Action with no mode still gets its own tool, one tap away.
    openButton: function(box, action) {
      var md = RPGACE.modules.myDay;
      if (!action || !action.opens || !md) return null;
      var tl = (md.TOOLS || []).filter(function(x) { return x.key === action.opens; })[0];
      var row = RPGACE.modules.liveModes.ui._btns(box, [['Open ' + (tl ? tl.label : action.opens), function() { md.ui._openTool(action.opens); }, '', 'lm-open-tool']]);
      return row;
    }
  }
});
/* ===END:liveModes=== */
