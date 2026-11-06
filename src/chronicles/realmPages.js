/* ===MODULE:realmPages=== */
// RP-1 (Nov 4 2026, plan "Realm Pages + Evening Questionnaire",
// records/2026-11/ui_audit_improvements_paranoia_2026-11-04.txt). Alex chose
// "Realm = page": each realm becomes one real page instead of a pop-up home,
// with its area tools inside it; "Folded, open what you tap": every section
// arrives folded (title + one-line count), opens when tapped and stays open
// while you're on the page; leave and come back = folded again; arriving from
// a button opens only that section. Live is a link to Live now (OA-3..8 own
// the modes). A realm page is an existing area page with the realm frame on
// top (PAGES below), so nothing is copied: the frame is realmFrame's, the
// rank card is xpSeason's, the tool section holds the area page's own nodes.
// RP-1 = Producer (the Beats page). RP-3 adds the other 12 realms here.
RPGACE.register('realmPages', {
  domain: 'chronicles',

  // realm -> { page: CONFIG.pages key, title, tool: { key, name, nodes: ids moved into the tool section } }
  // RP-3 (Nov 5 2026, Alex: "Do rpg 3 all of it"): every realm has a page. An existing area page carries the frame
  // (tool.nodes '*' = that page's own content moves into the tool section); a realm whose tools are pop-ups or
  // panels gets the shared page-realm, its tool section drawing the existing screen in place (draw) or opening it (btns).
  PAGES: {
    producer: { page: 'beats', title: '🎵 Producer', tool: { key: 'beats', name: '🥁 Beats', count: 'Idea → Make → Mix → Log → Release → Sell', nodes: ['bh-next', 'bh-steps'] } },
    creator: { page: 'posting', mod: 'postingHub', title: '🎬 Creator', tool: { key: 'posting', name: '📣 Posting', count: 'Idea → Plan → Record → Edit → Post', nodes: '*' } },
    hustler: { page: 'selling', mod: 'sellingHub', title: '💼 Hustler', tool: { key: 'selling', name: '💼 Selling', count: 'Beats for sale · outreach · log · money in', nodes: '*' } },
    steward: { page: 'money', mod: 'moneyHub', title: '💷 Steward', tool: { key: 'money', name: '💷 Money', count: 'In − out · subscriptions · receipts · software', nodes: '*' },
      extras: [{ key: 'wishlist', name: '🛒 Wishlist', count: 'Future purchases vs budget', btns: [['🛒 Open Wishlist', 'card:wishlist'], ['🛒 Shop now', 'shop']] }] },
    scholar: { page: 'knowledge', mod: 'knowledgeHub', title: '📚 Scholar', tool: { key: 'knowledge', name: '📚 Knowledge', count: 'Take in → Study → Learned → Review', nodes: '*' } },
    // CP-3 (Nov 6 2026): the kitchen's 6 tools drawn on the page (no Cooking button to a further list).
    chef: { page: 'realm', title: '🍳 Chef', tool: { key: 'cooking', name: '🍳 Kitchen', count: 'Recipes, plan, shop, cook, stock', draw: 'chef' } },
    athlete: { page: 'realm', title: '💪 Athlete', tool: { key: 'gym', name: '🏋️ Gym', count: 'This week, log a session, bests', draw: 'gym' },
      extras: [{ key: 'health', name: '❤️ Health & body', count: 'Food, weight, water, sleep', btns: [['❤️ Open Health & body', 'card:health']] }] },
    explorer: { page: 'realm', title: '✈️ Explorer', tool: { key: 'plans', name: '🧳 Plans', count: 'Trips, events, days out', btns: [['🧳 Open Plans', 'plans:plans'], ['💡 Outing ideas', 'plans:ideas']] } },
    connector: { page: 'realm', title: '🤝 Connector', tool: { key: 'people', name: '👥 People', count: 'Who to reach out to', btns: [['👥 Open People', 'plans:people']] } },
    homekeeper: { page: 'realm', title: '🏡 Homekeeper', tool: { key: 'chores', name: '🧹 Chores', count: 'What\'s due around the house', draw: 'chores' } },
    mind: { page: 'realm', title: '🧘 Mind', tool: { key: 'journal', name: '📓 Journal', count: 'Session logs, decisions, look-back', btns: [['📓 Open Journal', 'page:journal'], ['🧭 Log a decision', 'decision']] } },
    builder: { page: 'realm', title: '🛠 Builder', tool: { key: 'oversight', name: '📚 Oversight', count: 'Docs, smoke test, what works', btns: [['📚 Open Oversight', 'card:oversight']] } },
    life: { page: 'realm', title: '🏠 Life', tool: { key: 'work', name: '💼 Work', count: 'Clock in · drink specs', draw: 'work' } }
  },
  // CP-2: a realm's own Next step (its journey), drawn at the top of the action card. Realms without one show their tasks.
  JOURNEY: {
    chef: function(el) { var co = RPGACE.modules.cookingOracle; return co ? co.ui.journey(el) : null; }
  },
  _current: null,
  _arrive: null,

  init: function() {
    var self = RPGACE.modules.realmPages;
    // Nov 5 2026 (Alex: "These pages should have ask oracle too"): Ask Oracle on a realm page knows the realm,
    // its target and what's next (read off the page; the floating Oracle chat sends it with the message).
    var oc = RPGACE.modules.oracleControl;
    if (oc && oc.registerContextProvider) oc.registerContextProvider('realmPage', function() {
      var f = document.getElementById('rp-frame'); if (!f || f.offsetParent === null) return null;
      var X = RPGACE.modules.xpSeason, R = X && X.REALMS[f.dataset.realm]; if (!R) return null;
      var t = document.getElementById('rf-target-text'), nx = document.getElementById('rf-next');
      var tiles = [].map.call(f.querySelectorAll('#rp-sections .rp-name'), function(n) { return n.textContent; }).join(', ');
      return 'Alex is on his ' + R.name + ' realm page. Target: ' + (t ? t.textContent : 'none') + '. What\'s next: ' + (nx ? nx.textContent.replace(/\s+/g, ' ').slice(0, 300) : 'nothing') +
        '. Its tools here: ' + tiles + '. Answer for this realm, short and practical. ';
    });
    // RP-2: the menu's realms band follows what you open, straight away.
    RPGACE.hooks.on('realm:opened', function() { var ln = RPGACE.modules.leftNav; if (ln && ln.ui.redrawRealms) ln.ui.redrawRealms(); });
    RPGACE.hooks.on('page:show', function(name) {
      var realm = self.logic.realmOfPage(name);
      if (!realm) return;
      // Arriving from a button (open(realm, opts)) opens what it asked; from the menu, the tool section.
      var a = self._arrive; self._arrive = null;
      var conf = self.PAGES[realm];
      if (!a) {
        var on = null; try { on = self.logic.now(); } catch (e) {}
        a = { open: conf.tool ? conf.tool.key : null };
        if (on && on.realm === realm) a = { open: on.source === 'shift' && conf.tool && conf.tool.key === 'work' ? 'work' : 'live', now: on };
      }
      // Nov 5 2026 (Alex: "when I go on the page, it isn't already loaded ... should have a loading screen just for switching"):
      // a cover goes up before the first paint and comes down once the frame and its sections are drawn.
      self.ui._cover(realm);
      setTimeout(function() { if (!self.ui.attach(realm, a)) self.ui._uncover(); }, 0);
    });
  },

  logic: {
    // RP-2 (Alex: "Last one pinned, rest ranked"): the realm you opened last
    // is first; the rest by functions used (saves/ticks/logs = xp_events in
    // that realm), then by opens (ui_usage), over the last 30 days; ties keep
    // the usual realm order. Pure.
    DAYS: 30, ORDER_KEY: 'rpgace.rp.order',
    order: function(events, uses, nowMs) {
      var X = RPGACE.modules.xpSeason, base = (X && X.ORDER) || [], since = new Date((nowMs || Date.now()) - 30 * 864e5).toISOString();
      var fn = {}, op = {}, last = null, lastAt = '';
      (events || []).forEach(function(e) { if (e && e.realm && String(e.earned_at || '') >= since && e.status !== 'removed') fn[e.realm] = (fn[e.realm] || 0) + 1; });
      (uses || []).forEach(function(u) {
        if (!u || !u.realm || base.indexOf(u.realm) === -1) return;
        var at = String(u.created_at || ''); if (at < since) return;
        op[u.realm] = (op[u.realm] || 0) + 1;
        if (at > lastAt) { lastAt = at; last = u.realm; }
      });
      var rest = base.slice().sort(function(a, b) { return (fn[b] || 0) - (fn[a] || 0) || (op[b] || 0) - (op[a] || 0) || base.indexOf(a) - base.indexOf(b); });
      if (last) { rest.splice(rest.indexOf(last), 1); rest.unshift(last); }
      return rest;
    },
    cachedOrder: function() {
      var X = RPGACE.modules.xpSeason, base = (X && X.ORDER) || [];
      try { var o = JSON.parse(localStorage.getItem(RPGACE.modules.realmPages.logic.ORDER_KEY) || 'null'); if (Array.isArray(o) && o.length === base.length && base.every(function(r) { return o.indexOf(r) > -1; })) return o; } catch (e) {}
      return base.slice();
    },
    _saveOrder: function(o) { try { localStorage.setItem(RPGACE.modules.realmPages.logic.ORDER_KEY, JSON.stringify(o)); } catch (e) {} return o; },
    loadOrder: function() {
      var L = RPGACE.modules.realmPages.logic, X = RPGACE.modules.xpSeason, since = new Date(Date.now() - 30 * 864e5).toISOString();
      return Promise.all([
        X ? X.logic.load().catch(function() { return []; }) : [],
        RPGACE.kit.readPrivate('ui_usage', 'select=realm,created_at&created_at=gte.' + since + '&order=created_at.desc&limit=3000').catch(function() { return []; })
      ]).then(function(r) { return L._saveOrder(L.order(r[0] || [], r[1] || [], Date.now())); });
    },
    // One row per realm page / realm home opened. The menu moves it to the top straight away.
    logUse: function(realm) {
      var L = RPGACE.modules.realmPages.logic, o = L.cachedOrder(), i = o.indexOf(realm);
      if (i === -1) return Promise.resolve(null);
      o.splice(i, 1); o.unshift(realm); L._saveOrder(o);
      try { RPGACE.hooks.fire('realm:opened', realm); } catch (e) {}
      return RPGACE.sb.secureWrite('ui_usage', 'insert', { realm: realm, kind: 'open' })
        .catch(function(e) { console.warn('[realmPages] usage not saved:', e && e.message || e); });
    },
    // RP-4 (Alex: "Open on what I'm doing"): what you're on right now. Pure.
    // ctx { running: Doing now entries, blocks: today's live blocks, shift,
    // nowMin, toMin }. A Doing now timer wins (you started it), then the block
    // happening now, then a work shift (Life page, Work tool).
    BLOCK_REALM: { cooking: 'chef', gym: 'athlete', chores: 'homekeeper' },
    nowPick: function(ctx) {
      ctx = ctx || {};
      var L = RPGACE.modules.realmPages.logic, X = RPGACE.modules.xpSeason, ok = function(r) { return !!(r && X && X.REALMS[r]); };
      var run = (ctx.running || []).slice().sort(function(a, b) { return String(b.started_at || '').localeCompare(String(a.started_at || '')); });
      for (var i = 0; i < run.length; i++) { var rr = (run[i].realms || [])[0]; if (ok(rr)) return { realm: rr, source: 'doing', title: run[i].title || '' }; }
      var m = ctx.nowMin, toMin = ctx.toMin || function() { return null; };
      if (m != null) {
        var hit = (ctx.blocks || []).filter(function(b) {
          var s = toMin(b.start_time), e = toMin(b.end_time);
          if (s == null) return false;
          if (e == null || e <= s) e = s + (Number(b.mins) || 30);
          return m >= s && m < e;
        })[0];
        if (hit) { var br = hit.realm || L.BLOCK_REALM[hit.kind]; if (ok(br)) return { realm: br, source: 'block', title: hit.title || '' }; }
      }
      if (ctx.shift) return { realm: 'life', source: 'shift', title: 'Work shift' };
      return null;
    },
    // Reads in-memory state only (no fetch).
    now: function(at) {
      var M = RPGACE.modules, dn = M.doingNow, md = M.myDay, wm = M.workMode, d = at || new Date(), ctx = { nowMin: d.getHours() * 60 + d.getMinutes() };
      try { ctx.running = dn ? dn.logic.running() : []; } catch (e) { ctx.running = []; }
      try { if (md) { ctx.blocks = md.logic.dayBlocks(md.logic.iso(d)); ctx.toMin = md.logic.toMin; } } catch (e) { ctx.blocks = []; }
      try { ctx.shift = wm ? wm.logic.current() : null; } catch (e) { ctx.shift = null; }
      return RPGACE.modules.realmPages.logic.nowPick(ctx);
    },
    // RP-4 (Alex: "Prefill pickers from context"): the realm a picker should
    // tick for you - the realm page you're on, else what you're doing now.
    contextRealm: function() {
      var self = RPGACE.modules.realmPages, pg = document.querySelector('.page.active'), name = pg ? pg.id.replace(/^page-/, '') : null;
      var r = name ? self.logic.realmOfPage(name) : null;
      if (r) return { realm: r, why: 'the page you\'re on' };
      var n = self.logic.now();
      return n ? { realm: n.realm, why: n.source === 'doing' ? 'what you\'re doing now' : n.source === 'block' ? 'the block on now' : 'your shift' } : null;
    },
    // Nov 5 2026 (Alex: "Tried the 200 cooking items, did not work"): a page/tool
    // key ('cooking', 'money', 'health', ...) -> the realm page + section that holds it. Pure.
    realmOfKey: function(key) {
      var P = RPGACE.modules.realmPages.PAGES, k = String(key || '').toLowerCase();
      for (var r in P) {
        var c = P[r];
        if (c.tool && c.tool.key === k) return { realm: r, open: c.tool.key };
        var ex = (c.extras || []).filter(function(x) { return x.key === k; })[0];
        if (ex) return { realm: r, open: ex.key };
      }
      for (var r2 in P) { if (P[r2].page === k) return { realm: r2, open: P[r2].tool ? P[r2].tool.key : null }; }
      return null;
    },
    pageOf: function(realm) { var c = RPGACE.modules.realmPages.PAGES[realm]; return c ? (RPGACE.CONFIG && RPGACE.CONFIG.pages && RPGACE.CONFIG.pages[c.page]) || c.page : null; },
    realmOfPage: function(name) {
      var self = RPGACE.modules.realmPages, P = self.PAGES, CP = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
      if (name === 'realm') return self._current;
      for (var r in P) { if ((CP[P[r].page] || P[r].page) === name) return r; }
      return null;
    },
    // Pure: the folded sections of a realm page, in order. tasksN = kept tasks; starters = Oracle questions.
    sections: function(realm, conf, tasksN, starters) {
      var out = [];
      // Nov 5 2026 (Alex: "too many duplicates of buttons that don't make sense"): a tile whose only
      // content is one button does that button's job on the first tap (no second "Open X" step).
      var actOf = function(x) { return x.act || (x.btns && x.btns.length === 1 && !x.draw && !x.nodes ? x.btns[0][1] : null); };
      if (conf && conf.tool) out.push({ key: conf.tool.key, name: conf.tool.name, count: conf.tool.count || '', act: actOf(conf.tool) });
      ((conf && conf.extras) || []).forEach(function(x) { out.push({ key: x.key, name: x.name, count: x.count || '', act: actOf(x) }); });
      return out;
    },
    // RH (Nov 5 2026, Alex: "Do-first"): the small row at the bottom of every realm page.
    // CP-1 (Nov 6 2026): every button at the bottom, each with one job.
    FOOT: [{ key: 'grow', name: '💡 Grow' }, { key: 'tasks', name: '🗂 Tasks' }, { key: 'takein', name: '📥 Take in' }, { key: 'log', name: '📜 Log' }, { key: 'review', name: '📈 Review' }, { key: 'prompts', name: '🔮 Ask Oracle' }]
  },

  ui: {
    _css: function() {
      if (document.getElementById('rp-css')) return;
      var s = document.createElement('style'); s.id = 'rp-css';
      s.textContent = '.rp-sec{border:1px solid var(--border);border-radius:12px;background:var(--panel);margin:8px 0;overflow:hidden}' +
        '.rp-head{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:10px 14px;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer}' +
        '.rp-name{font-size:16px;font-weight:700}.rp-count{font-size:12px;color:var(--muted);margin-left:auto;text-align:right}.rp-chev{color:var(--muted);transition:transform .15s}' +
        '.rp-sec.rp-open .rp-chev{transform:rotate(90deg)}.rp-body{padding:0 14px 12px}.rp-btns{display:flex;gap:6px;flex-wrap:wrap}' +
        '@media (prefers-reduced-motion: reduce){.rp-chev{transition:none}}' +
        // RH (Nov 5 2026): do-first layout.
        '#rp-sections.rp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}' +
        '.rp-grid .rp-sec{margin:0}.rp-grid .rp-sec.rp-open{grid-column:1/-1}' +
        '.rp-grid .rp-head{flex-direction:column;align-items:flex-start;gap:2px;min-height:68px;padding:10px 12px}' +
        '.rp-grid .rp-chev{display:none}.rp-grid .rp-count{margin-left:0;text-align:left}.rp-grid .rp-sec.rp-open .rp-head{flex-direction:row;align-items:center;min-height:52px}.rp-grid .rp-sec.rp-open .rp-count{margin-left:auto}' +
        '.rp-card{border:1px solid var(--gold);border-radius:14px;background:var(--panel);padding:12px 14px;margin:8px 0}' +
        '.rp-card .rf-home{border:0 !important;padding:0 !important;margin:0 !important;background:none !important;box-shadow:none !important}' +
        '#rp-live{width:100%;min-height:52px;font-size:17px;margin-top:10px}' +
        '.rp-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 4px}.rp-top .xp-strip{margin:0 !important}' +
        '#rp-grow{min-height:44px;padding:6px 12px;border-radius:22px;border:1px solid var(--border);background:none;color:var(--muted);font:inherit;font-size:13px;cursor:pointer;text-align:left}' +
        '#rp-foot{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0 14px}' +
        '.rp-h2{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);padding:12px 14px 6px}' +
        '#rp-rank{display:block;width:100%;text-align:left;border:1px solid var(--border);border-radius:14px;background:var(--panel);padding:12px 14px;margin:6px 0 8px;color:var(--text);font:inherit;cursor:pointer}' +
        '#rp-foot button{min-height:52px;padding:6px 4px;border-radius:10px;border:1px solid var(--border);background:none;color:var(--text);font:inherit;font-size:13px;cursor:pointer}' +
        '.rp-on > .xp-strip,.rp-on .mh-go-selling,.rp-on .mh-go-wishlist,#rp-rank .xp-slim-tgt{display:none !important}' +
        '.rp-ranksheet .xp-rc-tabs,.rp-ranksheet .xp-rc-suggest{display:none !important}' +
        '.rp-growsheet .xp-rc-card,.rp-growsheet .xp-rc-tabs{display:none !important}';
      document.head.appendChild(s);
    },
    // Open a realm's page. opts.open = a section key to open (else all folded).
    open: function(realm, opts) {
      var self = RPGACE.modules.realmPages, name = self.logic.pageOf(realm);
      if (!name) return false;
      try { RPGACE.areaNav.closePopups(); } catch (e) {}
      self._arrive = opts || {};
      var conf = self.PAGES[realm];
      if (realm === 'producer' && RPGACE.modules.beatsHub) { RPGACE.modules.beatsHub.ui.injectPage(); }
      if (conf.page === 'realm') { self._current = realm; self.ui._ensureGeneric(); }
      // An area page's own open() injects it and shows it (page:show then attaches the frame).
      var m = conf.mod && RPGACE.modules[conf.mod];
      if (m && typeof m.open === 'function') { m.open(); return true; }
      if (typeof showPage === 'function') showPage(name);
      return true;
    },
    // RP-3: the one shared page for realms whose tools are pop-ups or panels.
    _ensureGeneric: function() {
      if (document.getElementById('page-realm')) return;
      var app = document.getElementById('app'); if (!app) return;
      var pg = document.createElement('div'); pg.className = 'page'; pg.id = 'page-realm';
      pg.innerHTML = '<div class="section-title">Realm</div>';
      app.appendChild(pg);
    },
    // Take a realm frame off its page, putting the page's own content (the tool section's nodes) back first.
    _detach: function(f) {
      var self = RPGACE.modules.realmPages, conf = self.PAGES[f.dataset.realm], pg = f.parentNode;
      if (!pg) return;
      var body = conf && conf.tool && conf.tool.nodes && f.querySelector('#rp-sec-' + conf.tool.key + ' > .rp-body');
      if (body) [].slice.call(body.childNodes).forEach(function(n) { pg.insertBefore(n, f); });
      pg.classList.remove('rp-on');
      f.remove();
    },
    // The ids of an area page's own content (everything but its title, its ← Back bar and the frame).
    _pageNodes: function(pg) {
      return [].filter.call(pg.children, function(n) {
        return !n.classList.contains('section-title') && n.id !== 'rp-frame' && !/-bar$/.test(n.id || '') && !n.classList.contains('area-bar');
      });
    },
    _act: function(spec, realm) {
      var M = RPGACE.modules, a = String(spec).split(':');
      if (a[0] === 'card') { if (M.dashDeck && M.dashDeck._navOpenCard) M.dashDeck._navOpenCard(a[1]); return; }
      if (a[0] === 'plans') { if (M.tripPlans) M.tripPlans.open(a[1]); return; }
      if (a[0] === 'page') { var P = RPGACE.CONFIG.pages; if (typeof showPage === 'function') showPage(P[a[1]] || a[1]); return; }
      if (a[0] === 'decision') { if (M.decisionJournal) M.decisionJournal.ui.openLog(); return; }
      // GR-2 (Alex: "Shop now -> list first"): the grocery list check; its Start shop opens shopTrip in Live now.
      if (a[0] === 'shop') { if (M.groceryCheck) M.groceryCheck.ui.open(); else if (M.realmTasks) M.realmTasks.ui.openLive({ mode: 'shop', realm: realm || 'chef' }); return; }
    },
    // A tool drawn in place: the existing screen, given the section body as its host.
    _drawTool: function(body, kind) {
      var M = RPGACE.modules;
      try {
        if (kind === 'gym' && M.gymTracker) { body.textContent = 'Loading your sessions…'; var host = { box: body, close: function() {} }, g = M.gymTracker; var d = function() { g.logic.load().then(function(s) { g.ui.render(host, s, d); }, function(e) { body.textContent = '⚠️ Could not load gym sessions: ' + (e.message || e); }); }; d(); return; }
        if (kind === 'work' && M.workMode) { M.workMode.ui.open({ host: body }); return; }
        if (kind === 'bestBefore' && M.bestBefore) { M.bestBefore.ui.lists(body); return; }
        if (kind === 'chef' && M.cookingOracle) { M.cookingOracle.ui.drawTools(body); return; }
        if (kind === 'chores' && M.myDay) {
          var md = M.myDay; body.textContent = 'Loading chores…';
          Promise.resolve(md.logic.load()).then(function() { body.textContent = ''; md.ui.renderChores(body, md.logic.iso()); if (!body.children.length) body.textContent = 'No chores due. Add chores as Actions on My Day (every N days).'; },
            function(e) { body.textContent = '⚠️ Could not load chores: ' + (e.message || e); });
          return;
        }
      } catch (e) { body.textContent = '⚠️ ' + (e.message || e); }
    },
    // Put the realm frame on top of the realm's page and fold every section.
    attach: function(realm, opts) {
      var self = RPGACE.modules.realmPages, U = self.ui, conf = self.PAGES[realm], X = RPGACE.modules.xpSeason, RF = RPGACE.modules.realmFrame;
      var pg = document.getElementById('page-' + self.logic.pageOf(realm));
      if (!pg || !conf || !X || !RF) return null;
      U._css();
      opts = opts || {};
      self.logic.logUse(realm);
      var t = pg.querySelector(':scope > .section-title'); if (t) t.textContent = conf.title;
      var old = pg.querySelector(':scope > #rp-frame');
      var frame = document.createElement('div'); frame.id = 'rp-frame'; frame.dataset.realm = realm;
      // The tool's own nodes move into its section once (they keep their ids, so the area module still draws them).
      var nodes = conf.tool && conf.tool.nodes, keep;
      if (nodes === '*') {
        var oldBody = old && old.querySelector('#rp-sec-' + conf.tool.key + ' > .rp-body');
        keep = (oldBody ? [].slice.call(oldBody.childNodes) : []).concat(U._pageNodes(pg));
      } else keep = (nodes || []).map(function(id) { return document.getElementById(id); }).filter(Boolean);
      // The shared page holds one realm at a time: a different realm's frame goes.
      if (old && old.dataset.realm !== realm && conf.page === 'realm') { old.remove(); old = null; }
      // One realm frame in the app at a time (section ids are shared): other pages get their own content back.
      [].forEach.call(document.querySelectorAll('#rp-frame'), function(f) { if (f !== old) U._detach(f); });
      if (old) old.replaceWith(frame);
      else { var bar = pg.querySelector(':scope > .area-bar, :scope > #bh-bar'); var anchor = bar || t; if (anchor && anchor.nextSibling) pg.insertBefore(frame, anchor.nextSibling); else pg.appendChild(frame); }
      // RH (Nov 5 2026, Alex: "Do-first"; rank = one slim line; the 4 hint lines = one Grow row; Steward's extra
      // links + mini realm cards dropped via .rp-on): rank + Grow on top, then target / what's next / Live now,
      // then the realm's tools as tiles, then Log · Take in · Ask · Review.
      pg.classList.add('rp-on');
      // CP-1 (Nov 6 2026, Alex: "rank card at top ... just current level stars and xp bar to next, then second page with full
      // breakdown"; "keep action at top"; "all buttons, including grow should be at bottom"; "it should all be on this page"):
      // rank card -> action card (target, Next, Also to do) -> the realm's own tools drawn open -> 6 buttons.
      frame.appendChild(U._top(realm));
      var card = document.createElement('div'); card.className = 'rp-card'; card.id = 'rp-do'; frame.appendChild(card);
      var home = document.createElement('div'); home.id = 'rp-home'; card.appendChild(home);
      var waits = 2, ready = function() { if (--waits === 0) U._uncover(); };
      var J = self.JOURNEY[realm];
      RF.ui.render(home, realm, null, { noTiles: true, onReady: ready, journey: J ? function(el) { return J(el); } : null, foldTasks: !!J });
      var list = document.createElement('div'); list.id = 'rp-sections'; frame.appendChild(list);
      var foot = document.createElement('div'); foot.id = 'rp-foot'; frame.appendChild(foot);
      self.logic.FOOT.forEach(function(f) {
        var b = document.createElement('button'); b.type = 'button'; b.dataset.sec = f.key; b.id = 'rp-foot-' + f.key; b.textContent = f.name;
        b.onclick = function() { U._footOpen(realm, f.key); }; foot.appendChild(b);
      });
      RF.logic.registry().then(function(reg) {
        var fr = RF.logic.frameOf(reg, realm);
        self.logic.sections(realm, conf, 0, fr.starters).forEach(function(sec) {
          var box = document.createElement('div'); box.className = 'rp-sec rp-open'; box.dataset.sec = sec.key; box.id = 'rp-sec-' + sec.key;
          var head = document.createElement('div'); head.className = 'rp-h2'; head.textContent = sec.name;
          var body = document.createElement('div'); body.className = 'rp-body';
          box.appendChild(head); box.appendChild(body); list.appendChild(box);
          // The tool section's nodes move in (they keep their ids, so the area module keeps drawing them); everything else is drawn now.
          if (conf.tool && sec.key === conf.tool.key && nodes) keep.forEach(function(n) { body.appendChild(n); });
          else U._drawSection(body, realm, sec.key, fr, keep);
          if (opts.open === sec.key) setTimeout(function() { try { box.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }, 300);
        });
        ready();
      }).catch(function(e) { ready(); console.warn('[realmPages] sections not drawn:', e && e.message || e); });
      return frame;
    },
    // RH: slim rank line (tap = the full rank card) + one Grow row (taken in, knows, quests, milestone).
    // CP-1: the rank card = rank + stars + XP bar to the next rank; tap = the full breakdown (xpSeason.stripFull, this realm only).
    _top: function(realm) {
      var U = RPGACE.modules.realmPages.ui, X = RPGACE.modules.xpSeason, top = document.createElement('div'); top.className = 'rp-top'; top.id = 'rp-top';
      var rank = X.ui.rankMini(realm); rank.id = 'rp-rank';
      rank.onclick = function() { U._sheetOf('🏅 ' + X.REALMS[realm].name, 'rp-ranksheet', realm); };
      top.appendChild(rank);
      return top;
    },
    // The existing full realm card (xpSeason.stripFull), shown as just the rank card or just the Grow lines.
    _sheetOf: function(title, cls, realm) {
      var X = RPGACE.modules.xpSeason, pop = RPGACE.modules.dashDeck._popup({ eyebrow: title, title: title, width: '440px', scroll: true });
      pop.box.classList.add(cls); pop.box.id = cls; pop.box.appendChild(X.ui.stripFull([realm]));
      return pop;
    },
    // RH: the bottom row opens each as a sheet (same screens as before).
    _footOpen: function(realm, key) {
      var RF = RPGACE.modules.realmFrame, X = RPGACE.modules.xpSeason;
      if (key === 'log') return RF.ui._openLog(realm);
      // Grow = new quest ideas for this realm; Tasks = every task kept for it (+ new ones).
      if (key === 'grow') return X.ui.openQuestSuggest(realm);
      if (key === 'tasks') return RPGACE.modules.realmTasks && RPGACE.modules.realmTasks.ui.openCatalogue(realm);
      if (key === 'takein') return RF.ui._openTakeIn(realm, null);
      if (key === 'review') return RF.ui._openReview(realm);
      if (key === 'prompts') {
        // The floating Oracle chat, right here on the page (realm context goes with each message), + the ready questions.
        var oc = RPGACE.modules.oracleControl;
        if (!oc || !oc._toggleOverlay) { RF.ui.ask(''); return; }
        if (!document.getElementById('oc-ov-panel') && !document.getElementById('oc-overlay-panel')) oc._toggleOverlay();
        var panel = document.getElementById('oc-overlay-panel'), log = document.getElementById('oc-ov-log'), inp = document.getElementById('oc-ov-input');
        if (!panel || !log) return;
        panel.dataset.realm = realm;
        if (inp) { inp.placeholder = 'Ask Oracle about ' + X.REALMS[realm].name + '…'; setTimeout(function() { try { inp.focus(); } catch (e) {} }, 50); }
        if (log.querySelector('.rp-ask-chips')) return;
        RF.logic.registry().then(function(reg) {
          var qs = RF.logic.frameOf(reg, realm).starters || []; if (!qs.length || !log.isConnected) return;
          var chips = document.createElement('div'); chips.className = 'rp-ask-chips'; chips.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:8px;';
          qs.forEach(function(q) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'rp-ask-chip'; b.textContent = q;
            b.style.cssText = 'text-align:left;min-height:40px;padding:6px 10px;border-radius:8px;border:1px solid rgba(155,89,182,.35);background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer;';
            b.onclick = function() { chips.remove(); oc._sendFromOverlay(q); };
            chips.appendChild(b);
          });
          log.insertBefore(chips, log.firstChild);
        });
      }
    },
    // The switching screen: full screen under pop-ups, gone on ready or after 4s at most.
    _cover: function(realm) {
      var U = RPGACE.modules.realmPages.ui, X = RPGACE.modules.xpSeason, R = X && X.REALMS[realm];
      U._uncover();
      var c = document.createElement('div'); c.id = 'rp-cover'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
      c.style.cssText = 'position:fixed;inset:0;z-index:9000;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text);font-family:inherit;';
      c.innerHTML = '<div style="font-size:40px;line-height:1;">' + (R ? R.icon : '⏳') + '</div><div style="font-size:18px;font-weight:700;">Opening ' + (R ? R.name : 'page') + '…</div>' +
        '<div class="rp-cover-bar" style="width:140px;height:4px;border-radius:2px;background:var(--border);overflow:hidden;"><div style="width:40%;height:100%;background:var(--gold);animation:rpCover 0.9s ease-in-out infinite;"></div></div>';
      if (!document.getElementById('rp-cover-css')) { var st = document.createElement('style'); st.id = 'rp-cover-css'; st.textContent = '@keyframes rpCover{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@media (prefers-reduced-motion: reduce){#rp-cover .rp-cover-bar div{animation:none}}'; document.head.appendChild(st); }
      document.body.appendChild(c);
      U._coverT = setTimeout(U._uncover, 4000);
    },
    _uncover: function() {
      var U = RPGACE.modules.realmPages.ui; clearTimeout(U._coverT);
      var c = document.getElementById('rp-cover'); if (c) c.remove();
    },
    // RP-2: the realms band of the side menu, in menu order. A realm with a page opens it (all folded); else its home.
    menuItems: function(order) {
      var X = RPGACE.modules.xpSeason, self = RPGACE.modules.realmPages;
      return (order || self.logic.cachedOrder()).map(function(r) {
        var m = X.REALMS[r] || { icon: '', name: r }, has = !!self.logic.pageOf(r);
        return { icon: m.icon, label: m.name, realm: r, desc: has ? 'Page: rank, target, tasks, live, log' : 'Rank, target, what\'s next',
          run: function() { if (has) self.ui.open(r, {}); else X.ui.openRealmHome(r); } };
      });
    },
    _drawSection: function(body, realm, key, fr) {
      var self = RPGACE.modules.realmPages, RF = RPGACE.modules.realmFrame, rt = RPGACE.modules.realmTasks, K = RPGACE.kit, conf = self.PAGES[realm] || {};
      var btns = function(list) { var row = document.createElement('div'); row.className = 'rp-btns'; list.forEach(function(x) { var b = K.btn(x[0], x[2] || ''); b.style.minHeight = '44px'; if (x[3]) b.id = x[3]; b.onclick = x[1]; row.appendChild(b); }); body.appendChild(row); };
      // RP-3: a realm's own tool (drawn in place, or buttons to its existing screen) and extra sections.
      var tool = [conf.tool].concat(conf.extras || []).filter(function(x) { return x && x.key === key; })[0];
      if (tool && tool.draw) return self.ui._drawTool(body, tool.draw);
      if (tool && tool.btns) return btns(tool.btns.map(function(b, i) { return [b[0], function() { self.ui._act(b[1], realm); }, i ? '' : 'primary', 'rp-' + key + '-' + i]; }));
      if (key === 'tasks') return btns([['🗂 All tasks', function() { rt.ui.openCatalogue(realm); }, '', 'rp-tasks-all'], ['📥 New tasks', function() { rt.ui.openInbox(); }, '', 'rp-tasks-new']]);
      if (key === 'live') return btns([['▶ Live now', function() { rt.ui.openLive({ realm: realm }); }, 'primary', 'rp-live']]);
      if (key === 'takein') return RF.ui._openTakeIn(realm, null, body);
      if (key === 'log') return RF.ui._openLog(realm, body);
      if (key === 'review') return RF.ui._openReview(realm, body);
      if (key === 'prompts') {
        var qs = fr.starters || [];
        if (!qs.length) { body.textContent = 'No ready questions for this realm yet.'; return; }
        return btns(qs.map(function(q) { return [q, function() { RF.ui.ask(q); }]; }));
      }
    }
  }
});
/* ===END:realmPages=== */
