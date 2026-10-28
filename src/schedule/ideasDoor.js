
/* ===MODULE:ideasDoor=== */
// DR-10 (Oct 27 2026, plan "Day & Habits Rewire", Alex: "One 💡 Ideas door,
// engines kept"). One menu door listing every idea by realm: Idea Bank
// (conid_pot: beats -> Producer, posts -> Creator), saved outing ideas
// (plans status idea -> Explorer) and new realm tasks (realm_tasks inbox ->
// their realm). Tapping opens the idea's own home; nothing is stored here.
RPGACE.register('ideasDoor', {
  domain: 'schedule',
  logic: {
    // Pure: rows from the three stores -> [{realm, items:[...], inbox:[...]}],
    // in xpSeason.REALMS order, empty realms left out.
    model: function(ideas, outings, inbox) {
      var by = {};
      var put = function(rk, key, x) { var g = by[rk] = by[rk] || { realm: rk, items: [], inbox: [] }; g[key].push(x); };
      (ideas || []).forEach(function(r) {
        if (r.status === 'dropped' || r.status === 'merged') return;
        var post = r.kind === 'post';
        put(post ? 'creator' : 'producer', 'items', { kind: post ? 'post' : 'beat', icon: post ? '📣' : '🥁', id: r.id,
          title: String(r.title || r.idea_text || 'Idea').slice(0, 80), sub: post ? 'Post idea' : 'Beat idea', starred: !!r.starred });
      });
      (outings || []).forEach(function(p) {
        put('explorer', 'items', { kind: 'outing', icon: '🧳', id: p.id, title: String(p.title || 'Outing idea').slice(0, 80), sub: p.start_date ? 'Outing idea · ' + p.start_date : 'Outing idea' });
      });
      (inbox || []).forEach(function(t) { put(t.realm || 'life', 'inbox', { id: t.id, title: String(t.title || '').slice(0, 80) }); });
      var xs = RPGACE.modules.xpSeason, order = Object.keys((xs && xs.REALMS) || {});
      Object.keys(by).forEach(function(k) { if (order.indexOf(k) < 0) order.push(k); });
      return order.filter(function(k) { return by[k]; }).map(function(k) {
        by[k].items.sort(function(a, b) { return (b.starred ? 1 : 0) - (a.starred ? 1 : 0); });
        return by[k];
      });
    },
    load: function() {
      var tp = RPGACE.modules.tripPlans, rt = RPGACE.modules.realmTasks;
      return Promise.all([
        RPGACE.sb.select('conid_pot', 'select=id,title,idea_text,status,kind,starred,created_at&order=created_at.desc&limit=100').catch(function() { return []; }),
        tp ? tp.logic.read('plans', 'select=id,title,start_date,status&status=eq.idea&order=created_at.desc').catch(function() { return []; }) : Promise.resolve([]),
        rt ? rt.logic.load().then(function() { return rt.logic.inbox(); }).catch(function() { return []; }) : Promise.resolve([])
      ]).then(function(r) { return RPGACE.modules.ideasDoor.logic.model(r[0], Array.isArray(r[1]) ? r[1] : [], r[2]); });
    },
    // Where each kind of idea lives.
    openItem: function(x) {
      var M = RPGACE.modules;
      if (x.kind === 'post' && M.postingHub) return M.postingHub.ui.go('ideas');
      if (x.kind === 'outing' && M.tripPlans) return M.tripPlans.open('ideas');
      if (M.dashDeck) M.dashDeck._openPage('cp-idea-bank');
    },
  },
  ui: {
    open: function() {
      var self = RPGACE.modules.ideasDoor, L = self.logic;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '💡 Ideas', title: 'Every idea, by realm', width: '600px', scroll: true });
      pop.box.id = 'ideas-door';
      pop.box.textContent = 'Loading…';
      var btn = function(txt, fn) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = txt;
        b.style.cssText = 'display:block;width:100%;text-align:left;min-height:44px;padding:8px 10px;margin:4px 0;background:var(--panel);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;cursor:pointer;';
        b.onclick = function() { pop.close(); fn(); };
        return b;
      };
      L.load().then(function(groups) {
        pop.box.textContent = '';
        var sub = document.createElement('div'); sub.style.cssText = 'color:var(--muted);font-size:13px;margin-bottom:8px;';
        sub.textContent = 'Beat and post ideas, outing ideas and new tasks waiting to be kept. Tap one to open it where it lives.';
        pop.box.appendChild(sub);
        if (!groups.length) { var e = document.createElement('div'); e.style.color = 'var(--muted)'; e.textContent = 'No ideas yet. Save ideas from Oracle replies, the Plans Ideas tab, or share a video.'; pop.box.appendChild(e); return; }
        var xs = RPGACE.modules.xpSeason;
        groups.forEach(function(g) {
          var R = (xs && xs.REALMS[g.realm]) || { icon: '✨', name: g.realm };
          var sec = document.createElement('div'); sec.className = 'ideas-realm'; sec.dataset.realm = g.realm;
          var h = document.createElement('div'); h.style.cssText = 'font-weight:700;margin:14px 0 4px;color:var(--gold);';
          h.textContent = R.icon + ' ' + R.name; sec.appendChild(h);
          g.items.forEach(function(x) {
            var b = btn(x.icon + '  ' + (x.starred ? '⭐ ' : '') + x.title + '  ·  ' + x.sub, function() { L.openItem(x); });
            b.className = 'ideas-item'; b.dataset.kind = x.kind; sec.appendChild(b);
          });
          if (g.inbox.length) {
            var ib = btn('📥  ' + g.inbox.length + ' new task' + (g.inbox.length === 1 ? '' : 's') + ' to keep or drop: ' + g.inbox.slice(0, 3).map(function(t) { return t.title; }).join(' · ') + (g.inbox.length > 3 ? ' …' : ''),
              function() { RPGACE.modules.realmTasks.ui.openInbox(); });
            ib.className = 'ideas-inbox'; sec.appendChild(ib);
          }
          pop.box.appendChild(sec);
        });
      }).catch(function(e) { pop.box.textContent = '⚠️ ' + (e.message || e); RPGACE.utils.toast('⚠️ Ideas: ' + (e.message || e), '#CC4A4A', 3500, 'ideasDoor'); });
      return pop;
    },
  },
  open: function() { return this.ui.open(); },
});
/* ===END:ideasDoor=== */
