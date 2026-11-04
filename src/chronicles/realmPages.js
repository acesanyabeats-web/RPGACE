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
  PAGES: {
    producer: { page: 'beats', title: '🎵 Producer', tool: { key: 'beats', name: '🥁 Beats', count: 'Idea → Make → Mix → Log → Release → Sell', nodes: ['bh-next', 'bh-steps'] } }
  },
  _arrive: null,

  init: function() {
    var self = RPGACE.modules.realmPages;
    RPGACE.hooks.on('page:show', function(name) {
      var realm = self.logic.realmOfPage(name);
      if (!realm) return;
      // Arriving from a button (open(realm, opts)) opens what it asked; from the menu, the tool section.
      var a = self._arrive; self._arrive = null;
      var conf = self.PAGES[realm];
      setTimeout(function() { self.ui.attach(realm, a || { open: conf.tool ? conf.tool.key : null }); }, 0);
    });
  },

  logic: {
    pageOf: function(realm) { var c = RPGACE.modules.realmPages.PAGES[realm]; return c ? (RPGACE.CONFIG && RPGACE.CONFIG.pages && RPGACE.CONFIG.pages[c.page]) || c.page : null; },
    realmOfPage: function(name) {
      var P = RPGACE.modules.realmPages.PAGES, CP = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
      for (var r in P) { if ((CP[P[r].page] || P[r].page) === name) return r; }
      return null;
    },
    // Pure: the folded sections of a realm page, in order. tasksN = kept tasks; starters = Oracle questions.
    sections: function(realm, conf, tasksN, starters) {
      var out = [];
      if (conf && conf.tool) out.push({ key: conf.tool.key, name: conf.tool.name, count: conf.tool.count || '' });
      out.push({ key: 'tasks', name: '🗂 Tasks', count: tasksN + ' kept' });
      out.push({ key: 'live', name: '▶ Live', count: 'Do this realm now' });
      out.push({ key: 'takein', name: '📥 Take in', count: 'Library + share' });
      out.push({ key: 'log', name: '📜 Log', count: 'What you did' });
      out.push({ key: 'prompts', name: '🔮 Prompts', count: (starters || []).length + ' ready questions' });
      out.push({ key: 'review', name: '📈 Weekly review', count: 'This week vs last' });
      return out;
    }
  },

  ui: {
    _css: function() {
      if (document.getElementById('rp-css')) return;
      var s = document.createElement('style'); s.id = 'rp-css';
      s.textContent = '.rp-sec{border:1px solid var(--border);border-radius:12px;background:var(--panel);margin:8px 0;overflow:hidden}' +
        '.rp-head{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:10px 14px;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer}' +
        '.rp-name{font-size:16px;font-weight:700}.rp-count{font-size:12px;color:var(--muted);margin-left:auto;text-align:right}.rp-chev{color:var(--muted);transition:transform .15s}' +
        '.rp-sec.rp-open .rp-chev{transform:rotate(90deg)}.rp-body{padding:0 14px 12px}.rp-btns{display:flex;gap:6px;flex-wrap:wrap}' +
        '@media (prefers-reduced-motion: reduce){.rp-chev{transition:none}}';
      document.head.appendChild(s);
    },
    // Open a realm's page. opts.open = a section key to open (else all folded).
    open: function(realm, opts) {
      var self = RPGACE.modules.realmPages, name = self.logic.pageOf(realm);
      if (!name) return false;
      try { RPGACE.areaNav.closePopups(); } catch (e) {}
      self._arrive = opts || {};
      if (realm === 'producer' && RPGACE.modules.beatsHub) { RPGACE.modules.beatsHub.ui.injectPage(); }
      if (typeof showPage === 'function') showPage(name);
      return true;
    },
    // Put the realm frame on top of the realm's page and fold every section.
    attach: function(realm, opts) {
      var self = RPGACE.modules.realmPages, U = self.ui, conf = self.PAGES[realm], X = RPGACE.modules.xpSeason, RF = RPGACE.modules.realmFrame;
      var pg = document.getElementById('page-' + self.logic.pageOf(realm));
      if (!pg || !conf || !X || !RF) return null;
      U._css();
      opts = opts || {};
      var t = pg.querySelector(':scope > .section-title'); if (t) t.textContent = conf.title;
      var old = pg.querySelector(':scope > #rp-frame');
      var frame = document.createElement('div'); frame.id = 'rp-frame'; frame.dataset.realm = realm;
      // The tool's own nodes move into its section once (they keep their ids, so the area module still draws them).
      var keep = (conf.tool && conf.tool.nodes || []).map(function(id) { return document.getElementById(id); }).filter(Boolean);
      if (old) old.replaceWith(frame);
      else { var bar = pg.querySelector(':scope > .area-bar, :scope > #bh-bar'); var anchor = bar || t; if (anchor && anchor.nextSibling) pg.insertBefore(frame, anchor.nextSibling); else pg.appendChild(frame); }
      frame.appendChild(X.ui.stripFull([realm]));
      var home = document.createElement('div'); home.id = 'rp-home'; frame.appendChild(home);
      RF.ui.render(home, realm, null, { noTiles: true });
      var list = document.createElement('div'); list.id = 'rp-sections'; frame.appendChild(list);
      var rt = RPGACE.modules.realmTasks;
      var tasksN = rt ? (rt._tasks || []).filter(function(x) { return x.status === 'kept' && x.realm === realm; }).length : 0;
      RF.logic.registry().then(function(reg) {
        var fr = RF.logic.frameOf(reg, realm);
        self.logic.sections(realm, conf, tasksN, fr.starters).forEach(function(sec) {
          var box = document.createElement('div'); box.className = 'rp-sec'; box.dataset.sec = sec.key; box.id = 'rp-sec-' + sec.key;
          var head = document.createElement('button'); head.type = 'button'; head.className = 'rp-head'; head.setAttribute('aria-expanded', 'false');
          head.innerHTML = '<span class="rp-chev">▸</span><span class="rp-name"></span><span class="rp-count"></span>';
          head.querySelector('.rp-name').textContent = sec.name; head.querySelector('.rp-count').textContent = sec.count;
          var body = document.createElement('div'); body.className = 'rp-body'; body.hidden = true;
          var drawn = false;
          var toggle = function(on) {
            box.classList.toggle('rp-open', on); body.hidden = !on; head.setAttribute('aria-expanded', on ? 'true' : 'false');
            if (on && !drawn) { drawn = true; U._drawSection(body, realm, sec.key, fr, keep); }
          };
          head.onclick = function() { toggle(body.hidden); };
          box.appendChild(head); box.appendChild(body); list.appendChild(box);
          // The tool section's nodes live in it from the start (folded), so the area module keeps drawing them.
          if (conf.tool && sec.key === conf.tool.key) { drawn = true; keep.forEach(function(n) { body.appendChild(n); }); }
          if (opts.open === sec.key) toggle(true);
        });
      });
      return frame;
    },
    _drawSection: function(body, realm, key, fr) {
      var RF = RPGACE.modules.realmFrame, rt = RPGACE.modules.realmTasks, K = RPGACE.kit;
      var btns = function(list) { var row = document.createElement('div'); row.className = 'rp-btns'; list.forEach(function(x) { var b = K.btn(x[0], x[2] || ''); b.style.minHeight = '44px'; if (x[3]) b.id = x[3]; b.onclick = x[1]; row.appendChild(b); }); body.appendChild(row); };
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
