
/* ===MODULE:knowledgeReview=== */
// Oct 15 2026 — KN-3 of "Knowledge Reorganisation (Scholar)"
// (records/2026-10/knowledge_reorg_ceo_plan_2026-10-15.txt). Alex chose
// "Fold into a Review step" and one term at a time. The Review page
// (/review) shows the jargon queue one card at a time — Accept, Edit,
// Reject, Skip — through phylumPath._resolvePendingTerm, the same write
// the Jargon page uses (rule 8). Placements and Knowledge Gaps join here
// only while the phylum tree has rows (taxonomyTree.logic.isPaused() is
// false); nothing on this page adds to the tree. The old Taxonomy & Review
// and Knowledge Gaps cards now open this page.
RPGACE.register('knowledgeReview', {
  domain: 'knowledge',
  _queue: [],
  _i: 0,
  _today: 0,

  init: function() {
    var self = RPGACE.modules.knowledgeReview;
    RPGACE.areaNav.onPageShow('review', function() { self.open(); });
    [0, 1700].forEach(function(ms) { setTimeout(function() { if (RPGACE.CONFIG && RPGACE.CONFIG.pages) RPGACE.areaNav.ensurePage(RPGACE.CONFIG.pages.review, '✅ Review'); }, ms); });
  },

  open: function() { return this.ui.open(); },

  // ============================================================
  // logic — the queue and today's count. No DOM.
  // ============================================================
  logic: {
    dayStart: function(d) { d = d || new Date(); var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return x.toISOString(); },
    load: function() {
      var L = RPGACE.modules.knowledgeReview.logic;
      ['jargon_encyclopedia'].forEach(function(t) { try { RPGACE.cache.clear(t); } catch (e) {} });
      return Promise.all([
        RPGACE.sb.select('jargon_encyclopedia', 'select=id,term,phylum_number,explainer,deep_content,status&status=eq.pending&order=phylum_number.asc,term.asc&limit=1000'),
        RPGACE.sb.select('jargon_encyclopedia', 'select=id&status=in.(accepted,rejected)&updated_at=gte.' + encodeURIComponent(L.dayStart()) + '&limit=2000')
      ]).then(function(r) {
        return { queue: Array.isArray(r[0]) ? r[0] : [], today: Array.isArray(r[1]) ? r[1].length : 0 };
      });
    },
    // KN-6: the menu's Review count. Cached 60s; refreshed after a decision.
    _countAt: 0, _count: null,
    pendingCount: function(force) {
      var L = RPGACE.modules.knowledgeReview.logic;
      if (!force && L._count != null && Date.now() - L._countAt < 60000) return Promise.resolve(L._count);
      return RPGACE.sb.select('jargon_encyclopedia', 'select=id&status=eq.pending&limit=5000').then(function(r) {
        L._count = Array.isArray(r) ? r.length : 0; L._countAt = Date.now(); return L._count;
      });
    },
    treeLive: function() {
      var tt = RPGACE.modules.taxonomyTree;
      return !!(tt && tt.logic && tt.logic.isPaused && !tt.logic.isPaused());
    },
    // Resolve the current term; true when it saved.
    resolve: function(row, action, term, explainer) {
      var pp = RPGACE.modules.phylumPath;
      return pp._resolvePendingTerm(row, action, term, explainer).then(function(ok) { return ok !== false; });
    }
  },

  // ============================================================
  // ui — the page and the one-term card.
  // ============================================================
  ui: {
    CSS: '.kr-count{font-size:14px;color:var(--muted);margin:0 0 10px;font-variant-numeric:tabular-nums}' +
      '.kr-card{border:1px solid var(--blue);border-left-width:4px;border-radius:12px;padding:16px;background:var(--panel)}' +
      '.kr-phylum{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--blue);font-weight:700}' +
      '.kr-term{font-size:24px;font-weight:700;color:var(--text);margin:4px 0 8px;line-height:1.2}' +
      '.kr-expl{font-size:15px;color:var(--text);line-height:1.55;max-width:65ch}' +
      '.kr-more{margin-top:8px;font-size:14px;color:var(--muted)}.kr-more summary{cursor:pointer;min-height:36px;display:flex;align-items:center}' +
      '.kr-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}' +
      '.kr-btn{min-height:48px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-family:Rajdhani,sans-serif;font-size:16px;font-weight:700;cursor:pointer}' +
      '.kr-btn:disabled{opacity:.5;cursor:default}' +
      '.kr-accept{border-color:var(--green);color:var(--green)}.kr-reject{border-color:var(--red);color:var(--red)}' +
      '.kr-edit-f{display:flex;flex-direction:column;gap:8px;margin-top:8px}' +
      '.kr-edit-f input,.kr-edit-f textarea{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-family:inherit;font-size:15px}' +
      '.kr-edit-f textarea{min-height:110px;resize:vertical}' +
      '.kr-links{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}' +
      '.kr-link{background:none;border:none;color:var(--blue);font-family:inherit;font-size:14px;cursor:pointer;min-height:36px;padding:0}' +
      '.kr-section{margin-top:22px}.kr-section h3{font-size:14px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:0 0 8px}' +
      '.kr-note{font-size:14px;color:var(--muted);line-height:1.5}',

    open: function() {
      var self = RPGACE.modules.knowledgeReview, U = self.ui;
      if (!document.getElementById('kr-css')) { var st = document.createElement('style'); st.id = 'kr-css'; st.textContent = U.CSS; document.head.appendChild(st); }
      var host = RPGACE.areaNav.page('knowledge', RPGACE.CONFIG.pages.review, '✅ Review',
        { key: 'review', label: 'Review', open: function() { self.open(); } });
      if (!host) return null;
      var box = host.box;
      box.id = 'kr-body';
      box.textContent = 'Loading…';
      self.logic.load().then(function(d) {
        self._queue = d.queue; self._i = 0; self._today = d.today;
        U.render();
      }).catch(function(e) { box.textContent = '⚠️ Could not load the review queue: ' + (e && e.message || e); });
      return host;
    },

    render: function() {
      var self = RPGACE.modules.knowledgeReview, U = self.ui, box = document.getElementById('kr-body');
      if (!box) return;
      box.innerHTML = '';
      var left = self._queue.length;
      // KR-3 (Oct 27 2026): one Review list for everything due - idea cards
      // (recall), exam questions to redo (Study), then jargon. Each keeps its
      // own engine; this page only lines them up.
      var due = document.createElement('div'); due.id = 'kr-due'; due.className = 'kr-count';
      due.textContent = 'Due now: ' + left + ' jargon term' + (left === 1 ? '' : 's');
      box.appendChild(due);
      U.dueLine(function(t) { due.textContent = 'Due now: ' + t; }, left);
      var rc = document.createElement('div'); rc.id = 'kr-recall';
      box.appendChild(rc);
      if (RPGACE.modules.recall) {
        RPGACE.modules.recall.renderInto(rc);
      }
      var fy = document.createElement('button'); fy.type = 'button'; fy.className = 'kr-link'; fy.id = 'kr-explain';
      fy.textContent = '🧠 Explain something back in your own words';
      fy.onclick = function() { var kh = RPGACE.modules.knowledgeHub; if (kh) kh.ui.openFeynman(); };
      box.appendChild(fy);
      var count = document.createElement('div'); count.className = 'kr-count'; count.id = 'kr-count';
      count.style.marginTop = '14px';
      count.textContent = self._today + ' reviewed today · ' + left + ' left';
      box.appendChild(count);
      var h = document.createElement('h3'); h.className = 'kr-h'; h.textContent = '🗂️ Jargon';
      h.style.cssText = 'font-size:14px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:0 0 8px;';
      box.appendChild(h);
      if (!left) {
        var done = document.createElement('div'); done.className = 'kr-card'; done.id = 'kr-done';
        done.innerHTML = '<div class="kr-term">✅ All jargon reviewed</div><div class="kr-expl">Nothing is waiting. New terms land here when they are added.</div>';
        box.appendChild(done);
      } else {
        box.appendChild(U.card(self._queue[self._i % left]));
      }
      var links = document.createElement('div'); links.className = 'kr-links';
      var all = document.createElement('button'); all.type = 'button'; all.className = 'kr-link'; all.textContent = '📖 See all in Jargon';
      all.onclick = function() {
        RPGACE.areaNav.visit('knowledge', { key: 'jargon', label: 'Jargon', open: function() { showPage(RPGACE.CONFIG.pages.jargonEncyclopedia); } });
        showPage(RPGACE.CONFIG.pages.jargonEncyclopedia);
      };
      links.appendChild(all);
      // KR-3: explain the current term back (Feynman) without leaving Review.
      if (left && RPGACE.modules.feynman) {
        var ex = document.createElement('button'); ex.type = 'button'; ex.className = 'kr-link'; ex.id = 'kr-explain-term'; ex.textContent = '🧠 Explain this term back';
        var cur = self._queue[self._i % left];
        ex.onclick = function() { RPGACE.modules.feynman.start(cur.term, 'knowledge'); };
        links.appendChild(ex);
      }
      box.appendChild(links);
      U.treeSection(box);
    },
    // "Due now: 3 idea cards · 2 exam questions · 386 jargon terms" (each count from its own module).
    dueLine: function(cb, jargon) {
      var rc = RPGACE.modules.recall, sh = RPGACE.modules.studyHub;
      Promise.all([rc ? rc.logic.loadDue().then(function(r) { return r.length; }).catch(function() { return 0; }) : 0,
        sh && sh.logic.dueCount ? sh.logic.dueCount().catch(function() { return 0; }) : 0,
        jargon != null ? jargon : RPGACE.modules.knowledgeReview.logic.pendingCount().catch(function() { return 0; })]).then(function(n) {
        var p = function(x, w) { return x + ' ' + w + (x === 1 ? '' : 's'); };
        var bits = [];
        if (n[0]) bits.push(p(n[0], 'idea card'));
        if (n[1]) bits.push(p(n[1], 'exam question'));
        bits.push(p(n[2], 'jargon term'));
        cb(bits.join(' · '), n);
      });
    },
    // KR-3: Morning Brief shows one line and a tap into Review (was the recall strip).
    briefLine: function(wrap) {
      var U = RPGACE.modules.knowledgeReview.ui;
      if (!wrap || document.getElementById('kr-brief')) return;
      var b = document.createElement('button'); b.type = 'button'; b.id = 'kr-brief';
      b.style.cssText = 'display:block;width:100%;text-align:left;min-height:44px;padding:10px 14px;margin-bottom:14px;border-radius:10px;border:1px solid var(--blue,#4A8CCC);background:none;color:var(--text);font:inherit;font-size:14px;cursor:pointer;';
      b.textContent = '✅ Review: …';
      b.onclick = function() { RPGACE.areaNav.closePopups(); RPGACE.modules.knowledgeReview.open(); };
      var out = document.getElementById('mb-output');
      if (out && out.parentNode === wrap) wrap.insertBefore(b, out); else wrap.appendChild(b);
      U.dueLine(function(t, n) { if (!n[0] && !n[1] && !n[2]) { b.remove(); return; } b.textContent = '✅ Review: ' + t + ' →'; });
    },

    card: function(row) {
      var self = RPGACE.modules.knowledgeReview, U = self.ui;
      var c = document.createElement('div'); c.className = 'kr-card'; c.id = 'kr-card'; c.dataset.id = row.id;
      var ph = document.createElement('div'); ph.className = 'kr-phylum';
      ph.textContent = row.phylum_number ? (RPGACE.utils.phylumLabel ? RPGACE.utils.phylumLabel(row.phylum_number) : 'Phylum ' + row.phylum_number) : 'No phylum';
      var t = document.createElement('div'); t.className = 'kr-term'; t.textContent = row.term;
      var ex = document.createElement('div'); ex.className = 'kr-expl'; ex.textContent = row.explainer || 'No explanation yet.';
      c.appendChild(ph); c.appendChild(t); c.appendChild(ex);
      if (row.deep_content) {
        var d = document.createElement('details'); d.className = 'kr-more';
        var s = document.createElement('summary'); s.textContent = 'More detail';
        var p = document.createElement('div'); p.textContent = row.deep_content; p.style.cssText = 'margin-top:6px;white-space:pre-wrap;line-height:1.5;';
        d.appendChild(s); d.appendChild(p); c.appendChild(d);
      }
      var btns = document.createElement('div'); btns.className = 'kr-btns';
      var mk = function(label, cls, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'kr-btn ' + cls; b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
      mk('✅ Accept', 'kr-accept', function() { U.decide(row, 'accept'); });
      mk('❌ Reject', 'kr-reject', function() { U.decide(row, 'reject'); });
      mk('✏️ Edit', 'kr-editbtn', function() { U.editForm(c, row); });
      mk('⏭ Skip', 'kr-skip', function() { self._i++; U.render(); });
      c.appendChild(btns);
      return c;
    },

    editForm: function(c, row) {
      var U = RPGACE.modules.knowledgeReview.ui;
      var btns = c.querySelector('.kr-btns'); if (btns) btns.remove();
      var f = document.createElement('div'); f.className = 'kr-edit-f';
      var term = document.createElement('input'); term.id = 'kr-edit-term'; term.value = row.term; term.setAttribute('aria-label', 'Term');
      var ex = document.createElement('textarea'); ex.id = 'kr-edit-expl'; ex.value = row.explainer || ''; ex.setAttribute('aria-label', 'Explanation');
      var bar = document.createElement('div'); bar.className = 'kr-btns';
      var save = document.createElement('button'); save.type = 'button'; save.className = 'kr-btn kr-accept'; save.textContent = '✅ Save & accept';
      var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'kr-btn'; cancel.textContent = 'Cancel';
      save.onclick = function() {
        var nt = term.value.trim();
        if (!nt) { term.focus(); return; }
        U.decide(row, 'edit', nt, ex.value.trim());
      };
      cancel.onclick = function() { U.render(); };
      bar.appendChild(save); bar.appendChild(cancel);
      f.appendChild(term); f.appendChild(ex); f.appendChild(bar);
      c.appendChild(f);
      term.focus();
    },

    decide: function(row, action, term, explainer) {
      var self = RPGACE.modules.knowledgeReview, U = self.ui;
      var card = document.getElementById('kr-card');
      if (card) card.querySelectorAll('button').forEach(function(b) { b.disabled = true; });
      self.logic.resolve(row, action, term, explainer).then(function(ok) {
        if (!ok) { U.render(); return; } // the shared write already toasted the error
        var at = self._queue.indexOf(row);
        if (at >= 0) self._queue.splice(at, 1);
        if (self._queue.length) self._i = self._i % self._queue.length; else self._i = 0;
        self._today++;
        try { RPGACE.cache.clear('jargon_encyclopedia'); } catch (e) {}
        if (RPGACE.modules.lifeLibrary) RPGACE.modules.lifeLibrary.logic._shelfCache = null;
        U.render();
      });
    },

    // Placements + gaps only while the phylum tree has rows.
    treeSection: function(box) {
      var self = RPGACE.modules.knowledgeReview, dd = RPGACE.modules.dashDeck;
      var sec = document.createElement('div'); sec.className = 'kr-section'; sec.id = 'kr-tree';
      var h = document.createElement('h3'); h.textContent = '🌳 Placements & 🕳️ Gaps';
      sec.appendChild(h);
      if (!self.logic.treeLive()) {
        var n = document.createElement('div'); n.className = 'kr-note';
        n.textContent = 'These come back here once the phylum tree is rebuilt. Until then nothing is added to the tree.';
        sec.appendChild(n);
      } else {
        var row = document.createElement('div'); row.className = 'kr-links';
        var a = document.createElement('button'); a.type = 'button'; a.className = 'kr-link'; a.textContent = '🌳 Review placements';
        a.onclick = function() { if (dd && dd._openTaxonomy) dd._openTaxonomy(); };
        var g = document.createElement('button'); g.type = 'button'; g.className = 'kr-link'; g.textContent = '🕳️ Knowledge gaps';
        g.onclick = function() { if (dd && dd._openGaps) dd._openGaps(); };
        row.appendChild(a); row.appendChild(g); sec.appendChild(row);
      }
      box.appendChild(sec);
    }
  }
});
/* ===END:knowledgeReview=== */
