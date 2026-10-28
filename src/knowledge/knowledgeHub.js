

/* ===MODULE:knowledgeHub=== */
// Oct 15 2026 — KN-1 of the ratified plan "Knowledge Reorganisation
// (Scholar)" (records/2026-10/knowledge_reorg_ceo_plan_2026-10-15.txt).
// Alex: "regen every domain like you did for cooking". The Knowledge home
// page: one "what's next" line, then the 4 steps in their real order —
// Take in (Life Library) -> Study (Bookworm/Videoworm/MusicWorm) ->
// Learned (Encyclopedia ideas + jargon) -> Map (Phylum Path) — with live
// counts and a Review badge while jargon waits. It owns no data: every
// number comes from the owning module's own read (lifeLibrary.logic.
// shelfData, recall.logic.loadDue, screenshotInbox.logic.count,
// bookworm_books), and every button opens that module's own screen.
// RPGACE.AREAS.knowledge.hub points here, so 🏠 on any Knowledge screen
// lands on this page; each screen opened from here is recorded in
// RPGACE.areaNav so ← Back returns to it.
RPGACE.register('knowledgeHub', {
  domain: 'knowledge',

  init: function() {
    var self = RPGACE.modules.knowledgeHub;
    RPGACE.AREAS.knowledge.hub = function() { self.open(); };
    // KR-5: Videoworm opens slimmed (reports + Find videos; the rest in ›).
    RPGACE.areaNav.onPageShow('videoworm', function() { setTimeout(function() { self.ui.slimVideoworm(); }, 200); });
    RPGACE.hooks.on('page:show', function(name) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || name !== P.knowledge) return;
      self.ui.injectPage();
      RPGACE.areaNav.visit('knowledge', { key: 'hub', label: 'Knowledge', open: function() { self.open(); } });
      self.ui.render();
    });
    [0, 1700].forEach(function(ms) { setTimeout(function() { self.ui.injectPage(); }, ms); });
    // KN-4: every other Knowledge page records itself for ← Back and gets
    // the same ← Back / 🏠 Knowledge row, however it was reached.
    RPGACE.hooks.on('page:show', function(name) {
      var e = self.logic.screenFor(name);
      if (!e) return;
      // KN-6: a worm page reached from the menu or a link gets its panels.
      var P = RPGACE.CONFIG.pages, dd = RPGACE.modules.dashDeck, PANELS = {};
      PANELS[P.bookworm] = ['bookworm-widget']; PANELS[P.videoworm] = ['file-analyzer-panel', 'video-finder-panel'];
      PANELS[P.musicworm] = ['ref-corpus-panel']; PANELS[P.bibliography] = ['bookworm-bibliography'];
      if (dd && dd._mountPanel) (PANELS[name] || []).forEach(function(id) { dd._mountPanel(id); });
      // BT-0: MusicWorm opened from Beats home belongs to Beats' Back stack.
      var via = RPGACE.areaNav._via;
      if (via && via.slug === name && via.area !== 'knowledge' && Date.now() - via.at < 5000) return;
      RPGACE.areaNav.visit('knowledge', e);
      setTimeout(function() { self.ui.decoratePage(name); }, 30);
    });
  },

  open: function() {
    var P = RPGACE.CONFIG.pages;
    this.ui.injectPage();
    if (typeof showPage === 'function') showPage(P.knowledge);
  },

  // ============================================================
  // logic — reads and the "what's next" decision. No DOM.
  // ============================================================
  logic: {
    // KN-4: the Back-stack entry for a Knowledge page slug (null if not
    // one). Keys match ui.go's, so arriving by any route is one entry.
    screenFor: function(slug) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages, dd = RPGACE.modules.dashDeck;
      if (!P) return null;
      var page = function(p) { return function() { dd._openPage(p); }; };
      var show = function(sl) { return function() { if (typeof showPage === 'function') showPage(sl); }; };
      var M = {};
      M[P.bookworm] = ['bookworm', 'Bookworm', page('bookworm-widget')];
      M[P.videoworm] = ['videoworm', 'Videoworm', page('file-analyzer-panel')];
      M[P.musicworm] = ['musicworm', 'MusicWorm', page('ref-corpus-panel')];
      M[P.bibliography] = ['bibliography', 'Bibliography', page('bookworm-bibliography')];
      M[P.encyclopedia] = ['ideas', 'Encyclopedia', show(P.encyclopedia)];
      M[P.jargonEncyclopedia] = ['jargon', 'Jargon', show(P.jargonEncyclopedia)];
      M[P.phylumPath] = ['map', 'Phylum Path', show(P.phylumPath)];
      var m = slug && M[slug];
      return m ? { key: m[0], label: m[1], open: m[2] } : null;
    },
    PHYLA: 21,
    localDay: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    load: function() {
      var safe = function(p, dflt) { return Promise.resolve(p).catch(function() { return dflt; }); };
      var lib = RPGACE.modules.lifeLibrary, rec = RPGACE.modules.recall, shot = RPGACE.modules.screenshotInbox;
      return Promise.all([
        safe(lib ? lib.logic.shelfData() : null, { items: [], ideas: [], terms: [] }),
        safe(RPGACE.sb.select('bookworm_books', 'status=eq.in_progress&order=created_at.desc&limit=1&select=id,title,current_chapter_index'), []),
        safe(rec ? rec.logic.loadDue() : [], []),
        safe(shot ? shot.logic.count() : 0, 0),
        safe(RPGACE.realmPicker.held(), []),
        safe(RPGACE.modules.studyHub ? RPGACE.modules.studyHub.logic.dueCount() : 0, 0)
      ]).then(function(r) {
        var m = RPGACE.modules.knowledgeHub.logic.model(r[0] || {}, Array.isArray(r[1]) ? r[1][0] : null, r[2] || [], r[3] || 0);
        // Study (Oct 20 2026): exam questions answered wrong come back on
        // Recall's schedule; they sit right after the idea recall line.
        m.studyDue = Number(r[5]) || 0;
        if (m.studyDue) {
          var at = m.next.map(function(n) { return n.key; }).indexOf('recall');
          m.next.splice(at >= 0 ? at + 1 : m.next.length, 0, { key: 'study', icon: '🎓', text: m.studyDue + ' exam question' + (m.studyDue === 1 ? '' : 's') + ' to redo' });
        }
        // RI-3: inputs waiting for realms go to the top of "what's next".
        var held = (r[4] || []).length;
        m.held = held;
        if (held) m.next.unshift({ key: 'realms', icon: '🎯', text: held + ' input' + (held === 1 ? '' : 's') + ' waiting for you to pick realms' });
        return m;
      });
    },
    // Pure: everything the page shows, from already-read rows.
    model: function(data, book, due, shots, today) {
      var L = RPGACE.modules.knowledgeHub.logic, lib = RPGACE.modules.lifeLibrary;
      var items = data.items || [], ideas = data.ideas || [], terms = data.terms || [];
      today = today || L.localDay();
      var wk = new Date(today + 'T12:00:00'); wk.setDate(wk.getDate() - 7);
      var since = L.localDay(wk);
      var shelves = lib ? lib.logic.byPhylum(data) : {};
      var filled = Object.keys(shelves).filter(function(n) { var s = shelves[n]; return s.items.length || s.ideas.length || s.terms.length; }).map(Number);
      var empty = [];
      for (var n = 1; n <= L.PHYLA; n++) if (filled.indexOf(n) < 0) empty.push(n);
      var m = {
        items: items.length,
        toCheck: items.filter(function(i) { return i.status === 'to_check'; }).length,
        fresh: items.filter(function(i) { return String(i.taken_in_on || i.created_at || '').slice(0, 10) >= since; }).length,
        webUnshelved: items.filter(function(i) { return i.kind === 'web_lookup' && !i.phylum_number; }).length,
        ideas: ideas.length,
        pending: terms.filter(function(t) { return t.status === 'pending'; }).length,
        accepted: terms.filter(function(t) { return t.status === 'accepted'; }).length,
        filled: filled.length, empty: empty, book: book || null,
        due: due.length, dueRows: due, shots: Number(shots) || 0
      };
      m.next = L.nextList(m);
      return m;
    },
    // The "what's next" order Alex chose: reading first, then jargon review,
    // recall, inboxes, then gaps on the map.
    nextList: function(m) {
      var out = [];
      if (m.book) out.push({ key: 'resume', icon: '📖', text: 'Continue reading "' + m.book.title + '" — chapter ' + ((m.book.current_chapter_index || 0) + 1) });
      if (m.pending) out.push({ key: 'review', icon: '🗂️', text: m.pending + ' jargon term' + (m.pending === 1 ? '' : 's') + ' waiting for review' });
      if (m.due) out.push({ key: 'recall', icon: '🃏', text: m.due + ' idea' + (m.due === 1 ? '' : 's') + ' to recall today' });
      if (m.shots) out.push({ key: 'screenshots', icon: '📸', text: m.shots + ' screenshot' + (m.shots === 1 ? '' : 's') + ' waiting to be sorted' });
      if (m.toCheck) out.push({ key: 'toCheck', icon: '🔍', text: m.toCheck + ' Library item' + (m.toCheck === 1 ? '' : 's') + ' to check' });
      if (m.fresh) out.push({ key: 'fresh', icon: '🆕', text: m.fresh + ' new in your Library this week' });
      if (m.webUnshelved) out.push({ key: 'web', icon: '🔗', text: m.webUnshelved + ' web lookup' + (m.webUnshelved === 1 ? '' : 's') + ' not on a shelf yet' });
      if (m.empty.length) out.push({ key: 'empty', icon: '🧬', text: m.empty.length + ' phyl' + (m.empty.length === 1 ? 'um has' : 'a have') + ' an empty shelf', phylum: m.empty[0] });
      return out;
    }
  },

  // ============================================================
  // ui — the page, its styles, and where each button goes.
  // ============================================================
  ui: {
    CSS: '' +
      '.kh-btn{min-height:44px;padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;cursor:pointer}' +
      '.kh-btn:hover{border-color:var(--border2)}.kh-btn.kh-go{border-color:var(--blue);color:var(--blue)}' +
      '.kh-steps{display:grid;grid-template-columns:1fr;gap:6px;margin-top:14px}' +
      '.kh-step{position:relative;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--panel)}' +
      '.kh-step-top{display:flex;align-items:baseline;gap:8px}' +
      '.kh-step-n{font-size:12px;font-weight:700;color:var(--blue);letter-spacing:1px}' +
      '.kh-step-name{font-size:17px;font-weight:700;color:var(--text)}' +
      '.kh-step-what{font-size:13px;color:var(--muted);margin-left:auto}' +
      '.kh-step-count{font-size:14px;color:var(--text);margin:6px 0 8px;font-variant-numeric:tabular-nums}' +
      '.kh-step-btns{display:flex;flex-wrap:wrap;gap:6px}' +
      '.kh-badge{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;background:rgba(226,168,61,.16);border:1px solid rgba(226,168,61,.5);color:#E2A83D;font-size:12px;font-weight:700}' +
      '.kh-arrow{text-align:center;color:var(--blue);font-size:14px;line-height:1;opacity:.7}' +
      '@media (min-width:760px){.kh-steps{grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;align-items:stretch}.kh-arrow{align-self:center}}',

    injectPage: function() {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || document.getElementById('page-' + P.knowledge)) return;
      var app = document.getElementById('app');
      if (!app) return;
      if (!document.getElementById('kh-css')) {
        var st = document.createElement('style'); st.id = 'kh-css'; st.textContent = this.CSS;
        document.head.appendChild(st);
      }
      var page = document.createElement('div');
      page.className = 'page';
      page.id = 'page-' + P.knowledge;
      page.innerHTML = '<div class="section-title">📚 Knowledge</div>' +
        '<div id="kh-bar"></div><div id="kh-next"></div><div id="kh-steps" class="kh-steps"></div>';
      app.appendChild(page);
    },

    // KN-4: clears the old LL-7 "what this is" bar and puts a fresh
    // ← Back / 🏠 Knowledge row under the page title.
    decoratePage: function(slug) {
      var pg = document.getElementById('page-' + slug);
      if (!pg) return;
      pg.querySelectorAll(':scope > .kn-head, :scope > .area-bar').forEach(function(n) { n.remove(); });
      var bar = RPGACE.areaNav.bar('knowledge');
      var title = pg.querySelector(':scope > .section-title');
      if (title) pg.insertBefore(bar, title.nextSibling); else pg.insertBefore(bar, pg.firstChild);
    },

    // Every destination, recorded for ← Back before it opens.
    go: function(key, extra) {
      var H = RPGACE.modules.knowledgeHub, P = RPGACE.CONFIG.pages, dd = RPGACE.modules.dashDeck;
      var show = function(slug) { return function() { if (typeof showPage === 'function') showPage(slug); }; };
      var T = {
        library:     ['Life Library', function() { RPGACE.modules.lifeLibrary.open(); }],
        toCheck:     ['Life Library', function() { RPGACE.modules.lifeLibrary.open(); }],
        fresh:       ['Life Library', function() { RPGACE.modules.lifeLibrary.open({ filter: { days: 7 } }); }],
        web:         ['Life Library', function() { RPGACE.modules.lifeLibrary.open({ filter: { kind: 'web_lookup', shelf: 'none' } }); }],
        screenshots: ['Screenshots', function() { RPGACE.modules.screenshotInbox.open(); }],
        bookworm:    ['Bookworm', function() { dd._openPage('bookworm-widget'); }],
        resume:      ['Bookworm', function() { var b = extra; dd._openPage('bookworm-widget', { after: function() { var bw = RPGACE.modules.bookworm; if (bw && b) bw._openBook(b.id); } }); }],
        videoworm:   ['Videoworm', function() { dd._openPage('file-analyzer-panel'); }],
        musicworm:   ['MusicWorm', function() { dd._openPage('ref-corpus-panel'); }],
        takein:      ['Take in', function() { H.ui.openTakeIn(); }],
        writeups:    ['Learned', function() { var ep = RPGACE.modules.encyclopediaPosts; if (ep) ep._learnTab = 'writeups'; show(P.encyclopedia)(); }],
        ideas:       ['Learned', function() { var ep = RPGACE.modules.encyclopediaPosts; if (ep) ep._learnTab = 'ideas'; show(P.encyclopedia)(); }],
        jargon:      ['Jargon', show(P.jargonEncyclopedia)],
        map:         ['Phylum Path', show(P.phylumPath)],
        empty:       ['Phylum Path', function() { show(P.phylumPath)(); var pp = RPGACE.modules.phylumPath; if (pp && extra) setTimeout(function() { pp._switchPhylum(extra); }, 300); }],
        shelf:       ['Phylum Path', function() { RPGACE.areaNav.closePopups(); show(P.phylumPath)(); var pp = RPGACE.modules.phylumPath; if (pp && extra) setTimeout(function() { pp._switchPhylum(extra); }, 300); }],
        feynman:     ['Knowledge', function() { H.ui.openFeynman(); }],
        recall:      ['Review', function() { RPGACE.modules.knowledgeReview.open(); }],
        study:       ['Study', function() { RPGACE.modules.studyHub.open(); }],
        review:      ['Review', function() { RPGACE.modules.knowledgeReview.open(); }],
        realms:      ['Knowledge', function() { RPGACE.realmPicker.askHeld().then(function() { H.ui.render(); }); }]
      };
      var t = T[key];
      if (!t) return;
      // One Back entry per screen: the four Library shortcuts are one screen.
      var navKey = { toCheck: 'library', fresh: 'library', web: 'library', resume: 'bookworm', empty: 'map', shelf: 'map' }[key] || key;
      // The Feynman pop-up is not a screen of its own: no Back entry.
      if (key !== 'feynman' && key !== 'realms' && key !== 'takein') RPGACE.areaNav.visit('knowledge', { key: navKey, label: t[0], open: t[1] });
      t[1]();
    },

    // KR-1 (Oct 27 2026): the one way in. Every kind hands off to its own
    // engine (shareInbox, screenshotInbox, Bookworm, MusicWorm, Life Library).
    openTakeIn: function() {
      var H = RPGACE.modules.knowledgeHub, U = H.ui, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '📚 Knowledge', title: '＋ Take in', width: '480px' });
      pop.box.id = 'kh-takein';
      var p = document.createElement('div'); p.style.cssText = 'font-size:14px;color:var(--muted);margin:0 0 10px;line-height:1.5;';
      p.textContent = 'A link (video or web page) or any text is analysed into a write-up; everything lands in your Library.';
      var ta = document.createElement('textarea'); ta.id = 'kh-takein-text'; ta.rows = 3; ta.placeholder = 'Paste a link or any text…';
      ta.style.cssText = 'width:100%;box-sizing:border-box;min-height:80px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font:inherit;font-size:15px;resize:vertical;';
      var go = document.createElement('button'); go.type = 'button'; go.id = 'kh-takein-go'; go.className = 'kh-btn kh-go'; go.textContent = '⚡ Analyse';
      go.style.cssText = 'width:100%;margin:8px 0 14px;';
      go.onclick = function() {
        var v = ta.value.trim(); if (!v) { ta.focus(); return; }
        var si = RPGACE.modules.shareInbox; if (!si) return;
        if (!si.logic.source({ text: v })) { RPGACE.utils.toast('Paste a link, or a few sentences of text', '#CC4A4A', 2500); return; }
        pop.close(); si.ui.handle({ text: v });
      };
      [p, ta, go].forEach(function(n) { pop.box.appendChild(n); });
      var grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;';
      var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.hidden = true; file.id = 'kh-takein-shot';
      file.onchange = function() {
        var fs = Array.prototype.slice.call(file.files || []); if (!fs.length) return;
        pop.close();
        var sb = RPGACE.modules.screenshotInbox;
        if (sb) sb.ui.ingest(fs, 'upload', function(t) { RPGACE.utils.toast('📸 ' + t, 'var(--gold)', 1800); }).then(function() { sb.open(); }).catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 3500); });
      };
      pop.box.appendChild(file);
      [['📸 Screenshot', function() { file.click(); }],
       ['📗 Book', function() { pop.close(); U.go('bookworm'); }],
       ['🎼 Reference track', function() { pop.close(); U.go('musicworm'); }],
       ['🔎 Find a video', function() { pop.close(); dd._openPage('video-finder-panel'); }],
       ['📝 Note, quote or course', function() { pop.close(); RPGACE.modules.lifeLibrary.open({ add: {} }); }],
       ['📚 Open Library', function() { pop.close(); U.go('library'); }]].forEach(function(o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'kh-btn kh-takein-opt'; b.textContent = o[0]; b.onclick = o[1];
        b.style.cssText = 'min-height:52px;';
        grid.appendChild(b);
      });
      pop.box.appendChild(grid);
      return pop;
    },

    // KR-5 (Oct 27 2026): Videoworm = your analysed videos + Find videos. The
    // old File Analyzer kit (server check, share box, Sync, How it works,
    // Manual Import, Watchlist) moves into the › side list.
    slimVideoworm: function() {
      var panel = document.getElementById('file-analyzer-panel');
      if (!panel) return;
      var H = RPGACE.modules.knowledgeHub, hide = function(el) { if (el) el.hidden = true; };
      var st = document.getElementById('intel-server-status'); hide(st && st.parentNode);
      hide(document.getElementById('intel-sync-status'));
      var inp = document.getElementById('intel-url-input'); hide(inp && inp.closest('div[style*="rgba(201,168,76"]'));
      var ins = panel.querySelector('button[onclick*="showIntelTab(\'insights\')"]'); hide(ins && ins.parentNode);
      if (!document.getElementById('kh-vw-top')) {
        var top = document.createElement('div'); top.id = 'kh-vw-top'; top.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;';
        var a = document.createElement('button'); a.type = 'button'; a.className = 'kh-btn kh-go'; a.textContent = '＋ Take in'; a.onclick = function() { H.ui.openTakeIn(); };
        var f = document.createElement('button'); f.type = 'button'; f.className = 'kh-btn'; f.id = 'kh-vw-find'; f.textContent = '🔎 Find videos to analyse'; f.onclick = function() { RPGACE.modules.dashDeck._openPage('video-finder-panel'); };
        top.appendChild(a); top.appendChild(f);
        panel.insertBefore(top, panel.firstChild);
      }
      if (typeof showIntelTab === 'function') { try { showIntelTab('insights'); } catch (e) {} }
      var host = panel.closest('.page') || panel;
      host._sideExtras = function() {
        return [['⭐', 'Watchlist', function() { if (typeof showIntelTab === 'function') showIntelTab('watchlist'); }, 'vw:watch'],
          ['🔄', 'Sync reports', function() { if (typeof syncIntelData === 'function') syncIntelData(true); }, 'vw:sync'],
          ['ℹ️', 'How it works', function() { if (typeof showIntelTab === 'function') showIntelTab('setup'); }, 'vw:how'],
          ['📥', 'Manual import', function() { if (typeof importIntelJSON === 'function') importIntelJSON(); }, 'vw:import'],
          ['🖥', 'Analysis server: ' + ((document.getElementById('intel-server-label') || {}).textContent || '?'), function() {}, 'vw:server']];
      };
    },

    // KN-5: "Explain it back" (Feynman) from the Study step: pick what to
    // explain - your own words, the book in progress or a saved idea.
    openFeynman: function() {
      var fy = RPGACE.modules.feynman;
      if (!fy) return;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📚 Knowledge', title: '🧠 Explain it back', width: '520px' });
      var p = document.createElement('div');
      p.style.cssText = 'font-size:14px;color:var(--muted);line-height:1.5;margin-bottom:10px;';
      p.textContent = 'Explain something in your own words; Oracle finds the gaps.';
      var inp = document.createElement('input'); inp.type = 'text'; inp.id = 'kh-fy-concept'; inp.placeholder = 'What do you want to explain?';
      inp.style.cssText = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;font-family:inherit;';
      var picks = document.createElement('div'); picks.id = 'kh-fy-picks'; picks.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px;';
      var go = document.createElement('button'); go.type = 'button'; go.id = 'kh-fy-go'; go.className = 'kh-btn kh-go'; go.textContent = '▶ Start';
      go.onclick = function() {
        var c = inp.value.trim();
        if (!c) { inp.focus(); return; }
        pop.close(); fy.start(c, 'knowledge');
      };
      inp.onkeydown = function(e) { if (e.key === 'Enter') go.onclick(); };
      [p, inp, picks, go].forEach(function(n) { pop.box.appendChild(n); });
      var add = function(t) {
        if (!t) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'kh-btn';
        b.textContent = t.length > 60 ? t.slice(0, 60) + '…' : t;
        b.onclick = function() { inp.value = t; inp.focus(); };
        picks.appendChild(b);
      };
      var m = RPGACE.modules.knowledgeHub._model;
      if (m && m.book) add(m.book.title);
      RPGACE.sb.select('encyclopedia_insights', 'select=insight_text&saved_at=not.is.null&order=saved_at.desc&limit=3')
        .then(function(r) { (Array.isArray(r) ? r : []).forEach(function(x) { add(x.insight_text); }); }).catch(function() {});
    },

    openRecall: function() {
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📚 Knowledge', title: '🃏 Recall', width: '560px' });
      var w = document.createElement('div'); pop.box.appendChild(w);
      RPGACE.modules.recall.renderInto(w);
    },

    _btn: function(label, key, extra, go) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'kh-btn' + (go ? ' kh-go' : ''); b.textContent = label;
      b.onclick = function() { RPGACE.modules.knowledgeHub.ui.go(key, extra); };
      return b;
    },

    render: function() {
      var H = RPGACE.modules.knowledgeHub, U = H.ui;
      var bar = document.getElementById('kh-bar'), next = document.getElementById('kh-next'), steps = document.getElementById('kh-steps');
      if (!bar || !next || !steps) return;
      bar.replaceWith(Object.assign(RPGACE.areaNav.bar('knowledge', { isHub: true }), { id: 'kh-bar' }));
      next.textContent = 'Loading…';
      H.logic.load().then(function(m) { H._model = m; U.renderNext(m); U.renderSteps(m); })
        .catch(function(e) { next.textContent = '⚠️ Could not load Knowledge: ' + (e && e.message || e); });
    },

    renderNext: function(m) {
      var U = RPGACE.modules.knowledgeHub.ui, el = document.getElementById('kh-next');
      var extraFor = function(n) { return n.key === 'resume' ? m.book : n.key === 'empty' ? n.phylum : null; };
      // RF-4: the shared What's next (areaNav.next), rows keep the kh- classes.
      RPGACE.areaNav.next(el, m.next.map(function(n) {
        return { icon: n.icon, title: n.text, go: ['Go →', function() { U.go(n.key, extraFor(n)); }] };
      }), { cls: 'kh', empty: 'All caught up — add something to your Library.', emptyGo: ['Open Library', function() { U.go('library'); }] });
    },

    renderSteps: function(m) {
      var U = RPGACE.modules.knowledgeHub.ui, el = document.getElementById('kh-steps');
      el.textContent = '';
      // KR-8: the 4 steps match the menu - Take in, Study, Learned, Review.
      var STEPS = [
        { n: 1, name: '📥 Take in', count: m.items + ' item' + (m.items === 1 ? '' : 's') + ' in your Library' + (m.shots ? ' · ' + m.shots + ' screenshot' + (m.shots === 1 ? '' : 's') + ' waiting' : ''),
          btns: [['＋ Take in', 'takein'], ['📚 Library', 'library'], ['📸 Screenshots', 'screenshots']] },
        { n: 2, name: '📗 Study', count: m.book ? 'Reading "' + m.book.title + '"' : 'No book in progress',
          btns: [['📖 Bookworm', 'bookworm'], ['🐛 Videoworm', 'videoworm'], ['🎼 MusicWorm', 'musicworm'], ['🧠 Explain it back', 'feynman'], ['🎓 Exam practice', 'study']] },
        { n: 3, name: '📖 Learned', count: m.ideas + ' idea card' + (m.ideas === 1 ? '' : 's') + ' · ' + m.accepted + ' jargon term' + (m.accepted === 1 ? '' : 's') + ' accepted',
          btns: [['📄 Write-ups', 'writeups'], ['💡 Ideas', 'ideas'], ['📖 Jargon', 'jargon'], ['🧬 Map', 'map']] },
        { n: 4, name: '✅ Review', count: (m.due ? m.due + ' idea card' + (m.due === 1 ? '' : 's') + ' due · ' : '') + m.pending + ' jargon to review',
          badge: (m.due || m.pending) ? (m.due + m.pending) + ' due' : '', btns: [['✅ Review', 'review']] }
      ];
      // UI Debloat (Oct 27 2026): tiles instead of stacked step cards.
      RPGACE.areaNav.steps(el, STEPS, function(b) { return U._btn(b[0], b[1]); }, 'kh-step');
    }
  }
});
/* ===END:knowledgeHub=== */
