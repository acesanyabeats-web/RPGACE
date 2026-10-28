
/* ===MODULE:realmBrief=== */
// RI-9 (Oct 15 2026, "Realm Inputs" plan): the Morning Brief's "Today's realm".
// Alex: "think of more scenarios, Neglected realm, Today's shift/day type,
// Today's planned blocks" -> a blend of 9 signals, each adding points to a
// realm with a plain reason. Top realm + a runner-up, shown with why, at the
// top of the Brief and passed into Oracle's brief prompt. Plain code, no AI.
// A winning realm with nothing of Alex's own to do suggests one of its
// the kept realm tasks (realmTasks) and says so (never a silent random pick).
RPGACE.register('realmBrief', {
  domain: 'schedule',
  PICKS: 2,
  // Planned-block kinds without their own realm (chore_blocks.kind).
  BLOCK_REALM: { chore: 'homekeeper', cooking: 'chef', shopping: 'life' },

  init: function() {},

  logic: {
    iso: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    addDays: function(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return RPGACE.modules.realmBrief.logic.iso(d); },
    daysBetween: function(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); },
    valid: function(r) { var S = RPGACE.modules.xpSeason; return !!(S && S.REALMS && S.REALMS[r]); },
    name: function(r) { var S = RPGACE.modules.xpSeason, x = S && S.REALMS && S.REALMS[r]; return x ? x.name : r; },
    icon: function(r) { var S = RPGACE.modules.xpSeason, x = S && S.REALMS && S.REALMS[r]; return x ? x.icon : '✨'; },

    // Everything the signals read, each source on its own so one failure
    // (signed out, a table missing) only drops that signal.
    gather: function() {
      var M = RPGACE.modules, L = M.realmBrief.logic, today = L.iso();
      var safe = function(f) { return Promise.resolve().then(f).catch(function() { return null; }); };
      var S = M.xpSeason, my = M.myDay, tp = M.tripPlans, lib = M.lifeLibrary;
      return Promise.all([
        safe(function() { return S ? S.logic.load() : null; }),
        safe(function() { return S ? S.logic.loadTrophies() : null; }),
        safe(function() { return my ? Promise.all([my.logic.load(), my.logic.loadTimings(), my.logic.loadTrackers()]) : null; }),
        safe(function() { return tp && tp.logic.signedIn() ? tp.logic.read('plans', 'select=id,title,status,start_date,end_date&status=in.(planning,booked)&limit=100') : null; }),
        safe(function() { return lib ? (lib._loaded ? true : lib.logic.load()) : null; }),
        safe(function() { return S ? S.logic.weekSpend(today) : null; }),
      ]).then(function(r) {
        var T = r[1] || {}, myOk = !!r[2];
        var kind = null;
        try { kind = myOk ? my.logic.dayKind(today) : null; } catch (e) {}
        var routines = [];
        if (myOk) {
          var logs = my._logs || [];
          (my._routines || []).forEach(function(x) {
            try {
              if (!my.logic.isDueToday(x, logs, today) || my.logic.todayLog(x, logs, today)) return;
              routines.push({ title: x.title, realm: my.logic.realmOf(x), missed: my.logic.missRun(x, logs, today) });
            } catch (e) {}
          });
        }
        return {
          today: today, events: r[0] || [], challenges: T.challenges || [],
          limit: T.settings ? Number(T.settings.weekly_spend_limit) || 0 : 0,
          spent: r[5] ? r[5].spent : null, dayKind: kind, routines: routines,
          blocks: myOk ? (my._choreBlocks || []) : [], plans: Array.isArray(r[3]) ? r[3] : [],
          library: lib && lib._items ? lib._items : [],
        };
      });
    },

    // The 9 signals. Pure: data in, [{realm, pts, why, act}] out.
    signals: function(d) {
      var self = RPGACE.modules.realmBrief, L = self.logic, out = [], today = d.today;
      var add = function(realm, pts, why, act) { if (L.valid(realm) && pts > 0) out.push({ realm: realm, pts: pts, why: why, act: act || null }); };
      var S = RPGACE.modules.xpSeason, ws = S ? S.logic.weekStart(today) : today;
      // 1. Neglected: a realm you have earned in before, quiet 4+ days.
      var last = {};
      (d.events || []).forEach(function(e) { if (e.status === 'active' || !e.status) { if (!last[e.realm] || e.earned_on > last[e.realm]) last[e.realm] = e.earned_on; } });
      Object.keys(last).map(function(r) { return { r: r, n: L.daysBetween(last[r], today) }; })
        .filter(function(x) { return x.n >= 4; }).sort(function(a, b) { return b.n - a.n; }).slice(0, 2)
        .forEach(function(x) { add(x.r, Math.min(3, x.n / 3), 'nothing in ' + L.name(x.r) + ' for ' + x.n + ' days'); });
      // 2. Day type from your shifts.
      if (d.dayKind === 'off') { add('producer', 1.5, 'day off: room for a long session'); add('creator', 1, 'day off: time to film or post'); }
      else if (d.dayKind === 'early') add('producer', 1, 'early shift: your evening is free');
      else if (d.dayKind === 'late') add('mind', 1.5, 'late shift tonight: something light first');
      // 3. Blocks you already planned for today.
      (d.blocks || []).filter(function(b) { return b.block_date === today && b.status !== 'cancelled' && b.status !== 'replaced'; }).forEach(function(b) {
        var realm = b.realm || self.BLOCK_REALM[b.kind] || 'homekeeper';
        add(realm, 3, 'you planned a ' + (b.kind || 'block') + ' block' + (b.start_time ? ' at ' + String(b.start_time).slice(0, 5) : ''), (b.kind === 'cooking' ? 'Cook as planned' : b.kind === 'shopping' ? 'Do the shop' : b.kind === 'chore' ? 'Your chore block' : 'Your ' + L.name(realm) + ' block'));
      });
      // 4. A streak at risk (never miss twice).
      (d.routines || []).filter(function(x) { return x.missed >= 1; }).forEach(function(x) {
        add(x.realm, x.missed >= 2 ? 3.5 : 2.5, x.title + (x.missed >= 2 ? ' missed twice' : ' missed last time: don\'t miss twice'), x.title);
      });
      // 5. Coming up within a week.
      (d.plans || []).forEach(function(p) {
        if (!p.start_date) return;
        var n = L.daysBetween(today, p.start_date);
        if (n >= 0 && n <= 7) add('explorer', 2, p.title + (n === 0 ? ' starts today' : ' in ' + n + ' day' + (n === 1 ? '' : 's')), 'Sort what\'s left for ' + p.title);
      });
      // 6. This week's challenge, still open.
      (d.challenges || []).filter(function(c) { return c.kind === 'weekly' && c.status === 'active' && c.period_start === ws && c.realm && (Number(c.progress) || 0) < (Number(c.target) || 1); })
        .forEach(function(c) { add(c.realm, 2, 'challenge "' + c.title + '" at ' + (Number(c.progress) || 0) + '/' + (Number(c.target) || 1), c.title); });
      // 7. Your season resolution.
      (d.challenges || []).filter(function(c) { return c.kind === 'resolution' && c.status === 'active' && c.realm; })
        .forEach(function(c) { add(c.realm, 1, 'your resolution: ' + c.title, c.title); });
      // 8. Something you took in recently, not used yet (one per realm).
      var since = L.addDays(today, -14), seen = {};
      (d.library || []).filter(function(i) { return Array.isArray(i.realms) && i.realms.length && (i.taken_in_on || String(i.created_at || '').slice(0, 10)) >= since; })
        .forEach(function(i) { i.realms.forEach(function(r) { if (seen[r]) return; seen[r] = 1; add(r, 1, 'new input waiting: ' + i.title, 'Use "' + i.title + '"'); }); });
      // 9. Money week: 80% of your weekly limit spent.
      if (d.limit > 0 && d.spent != null && d.spent >= d.limit * 0.8) {
        add('steward', 2, '£' + Math.round(d.spent) + ' of your £' + Math.round(d.limit) + ' week spent', 'Keep the rest of the week no-spend');
      }
      return out;
    },

    // Points per realm; top PICKS with up to 2 reasons and one thing to do.
    pick: function(signals) {
      var self = RPGACE.modules.realmBrief, L = self.logic, by = {};
      (signals || []).forEach(function(s) {
        var x = by[s.realm] || (by[s.realm] = { realm: s.realm, pts: 0, sigs: [] });
        x.pts += s.pts; x.sigs.push(s);
      });
      var acts = RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.activityMap() : {};
      return Object.keys(by).map(function(k) { return by[k]; })
        .sort(function(a, b) { return (b.pts - a.pts) || (a.realm < b.realm ? -1 : 1); }).slice(0, self.PICKS)
        .map(function(x) {
          x.sigs.sort(function(a, b) { return b.pts - a.pts; });
          var own = x.sigs.filter(function(s) { return s.act; })[0], fall = (acts[x.realm] || [])[0];
          return { realm: x.realm, name: L.name(x.realm), icon: L.icon(x.realm), pts: Math.round(x.pts * 10) / 10,
            why: x.sigs.slice(0, 2).map(function(s) { return s.why; }), act: own ? own.act : (fall ? fall.title : null), empty: !own };
        });
    },

    // One line per pick, for Oracle's brief prompt.
    lines: function(picks) {
      return (picks || []).map(function(p, i) {
        return (i === 0 ? '' : 'Runner-up: ') + p.icon + ' ' + p.name + ' — ' + p.why.join('; ') + (p.act ? ' → do: ' + p.act : '') + (p.empty ? ' (nothing of yours in ' + p.name + ' yet)' : '');
      });
    },

    today: function() {
      var L = RPGACE.modules.realmBrief.logic;
      return L.gather().then(function(d) { return L.pick(L.signals(d)); });
    },

    // RI-10: XP, inputs taken in and quests done per realm for a date range
    // (Sunday review, Year so far). Frozen reports carry the same keys from
    // xp_save_report (inputs / quests).
    period: function(start, end) {
      var M = RPGACE.modules, L = M.realmBrief.logic, S = M.xpSeason, lib = M.lifeLibrary;
      var safe = function(f) { return Promise.resolve().then(f).catch(function() { return null; }); };
      return Promise.all([
        safe(function() { return S ? S.logic.load() : null; }),
        safe(function() { return lib ? (lib._loaded ? true : lib.logic.load()) : null; }),
        safe(function() { return RPGACE.sb.select('quest_log', 'select=category,quest_kind,completed_at&status=eq.completed&completed_at=gte.' + start + 'T00:00:00&order=completed_at.desc&limit=2000'); }),
      ]).then(function(r) { return L.periodFrom(start, end, r[0] || [], (lib && lib._items) || [], r[2] || []); });
    },
    questRealm: function(q) {
      var L = RPGACE.modules.realmBrief.logic, c = String(q.category || '');
      return L.valid(c) ? c : (RPGACE.QUEST_CATEGORY_REALM[c.toLowerCase()] || 'life');
    },
    periodFrom: function(start, end, events, items, quests) {
      var L = RPGACE.modules.realmBrief.logic, out = { start: start, end: end, xp: {}, inputs: {}, quests: {} };
      var inR = function(d) { d = String(d || '').slice(0, 10); return d >= start && d <= end; };
      (events || []).forEach(function(e) { var x = Number(e.xp) || 0; if (e.status !== 'removed' && x > 0 && inR(e.earned_on)) out.xp[e.realm] = (out.xp[e.realm] || 0) + x; });
      (items || []).forEach(function(i) {
        if (!Array.isArray(i.realms) || !i.realms.length || !inR(i.taken_in_on || String(i.created_at || '').slice(0, 10))) return;
        i.realms.forEach(function(r) { out.inputs[r] = (out.inputs[r] || 0) + 1; });
      });
      (quests || []).forEach(function(q) {
        if (q.quest_kind === 'routine' || q.quest_kind === 'block' || !q.completed_at || !inR(L.iso(new Date(q.completed_at)))) return;
        var r = L.questRealm(q); out.quests[r] = (out.quests[r] || 0) + 1;
      });
      return out;
    },
    // One line per realm with anything, busiest first, then the quiet ones.
    periodLines: function(p) {
      var S = RPGACE.modules.xpSeason, L = RPGACE.modules.realmBrief.logic, order = (S && S.ORDER) || [];
      var score = function(r) { return (p.xp[r] || 0) + 50 * ((p.inputs[r] || 0) + (p.quests[r] || 0)); };
      var busy = order.filter(function(r) { return score(r) > 0; }).sort(function(a, b) { return score(b) - score(a); });
      var lines = busy.map(function(r) {
        var bits = [];
        if (p.xp[r]) bits.push(p.xp[r] + ' XP');
        if (p.inputs[r]) bits.push(p.inputs[r] + ' taken in');
        if (p.quests[r]) bits.push(p.quests[r] + ' quest' + (p.quests[r] === 1 ? '' : 's'));
        return L.icon(r) + ' ' + L.name(r) + ': ' + bits.join(' · ');
      });
      var quiet = order.filter(function(r) { return !score(r); }).map(L.name);
      return { lines: lines, quiet: quiet };
    },
  },

  ui: {
    renderInto: function(wrap) {
      var self = RPGACE.modules.realmBrief;
      if (!wrap) return Promise.resolve();
      var strip = document.getElementById('realm-pick-strip');
      if (!strip) { strip = document.createElement('div'); strip.id = 'realm-pick-strip'; strip.style.cssText = 'margin-bottom:14px;'; }
      wrap.insertBefore(strip, wrap.firstChild);
      strip.textContent = '';
      return self.logic.today().then(function(picks) { self.ui.render(strip, picks); })
        .catch(function(e) { console.warn('[realmBrief] pick failed', e && e.message); });
    },
    render: function(strip, picks) {
      strip.textContent = '';
      if (!picks || !picks.length) return;
      var head = document.createElement('div');
      head.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin-bottom:8px;';
      head.textContent = '🎯 Today\'s realm';
      strip.appendChild(head);
      picks.forEach(function(p, i) {
        var card = document.createElement('div');
        card.className = 'realm-pick' + (i ? ' realm-pick-runner' : '');
        card.dataset.realm = p.realm;
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:' + (i ? '8px 12px' : '12px 14px') + ';margin-bottom:8px;';
        var t = document.createElement('div');
        t.style.cssText = 'font-size:' + (i ? '13px' : '15px') + ';font-weight:700;color:var(--text);';
        t.textContent = (i ? 'Runner-up: ' : '') + p.icon + ' ' + p.name;
        var why = document.createElement('div');
        why.className = 'realm-pick-why';
        why.style.cssText = 'font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5;';
        why.textContent = 'Why: ' + p.why.join(' · ');
        card.appendChild(t); card.appendChild(why);
        if (p.act) {
          var act = document.createElement('div');
          act.className = 'realm-pick-act';
          act.style.cssText = 'font-size:13px;color:var(--text);margin-top:4px;';
          act.textContent = (p.empty ? 'Nothing of yours in ' + p.name + ' yet. Try: ' : 'Do: ') + p.act;
          card.appendChild(act);
        }
        strip.appendChild(card);
      });
    },
  },
});
/* ===END:realmBrief=== */
