
/* ===MODULE:recall=== */
// Oct 10 2026 — L1 ("Never forget / learn") of the ratified /CEO plan
// "RPGACE Domains, Navigation & Deepstash Encyclopedia". Two ideas from
// Alex's 50-projects list: (06) the forgetting-curve killer - saved idea
// cards come back in Morning Brief on a widening schedule (1, 3, 7, 16, 35
// days) until they stick; (24) PDF -> flashcards - a Bookworm chapter's
// insights open as the same Deepstash-style cards C1 uses
// (encyclopediaPosts._renderCards, rule 8). Saving a chapter card writes
// an encyclopedia_insights row (source_entry_id 'book:<chapterId>') so book
// ideas and video ideas share one Saved list and one recall queue.
RPGACE.register('recall', {
  domain: 'knowledge',

  INTERVALS: [1, 3, 7, 16, 35],
  PER_BRIEF: 3,

  init: function() {},

  logic: {
    dueIn: function(step, now) {
      var I = RPGACE.modules.recall.INTERVALS;
      var days = step >= I.length ? null : I[step];
      if (days == null) return null;
      var d = now ? new Date(now) : new Date();
      d.setDate(d.getDate() + days);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    today: function(now) {
      var d = now ? new Date(now) : new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    // "Got it" moves to the next interval; after the last one the idea is
    // learned (recall_due null, stays saved). "Again" restarts at 1 day.
    next: function(row, remembered, now) {
      var step = remembered ? (row.recall_step || 0) + 1 : 0;
      return { recall_step: step, recall_due: RPGACE.modules.recall.logic.dueIn(step, now) };
    },
    loadDue: function() {
      var t = RPGACE.modules.recall.logic.today();
      return RPGACE.sb.select('encyclopedia_insights',
        'select=id,insight_text,source_entry_id,source_entry_title,recall_step,recall_due&saved_at=not.is.null&recall_due=lte.' + t + '&order=recall_due.asc&limit=20')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    answer: function(row, remembered) {
      var patch = RPGACE.modules.recall.logic.next(row, remembered);
      return RPGACE.sb.secureWrite('encyclopedia_insights', 'update', patch, 'id=eq.' + row.id)
        .then(function() { RPGACE.cache.clear('encyclopedia_insights'); return patch; });
    },
    chapterIdeas: function(chapter) {
      var ins = (chapter && Array.isArray(chapter.insights)) ? chapter.insights : [];
      return ins.filter(function(x) { return x && typeof x.text === 'string' && x.text.trim() && x.decision !== 'rejected'; })
        .map(function(x, i) { return { insight_text: x.text.trim(), idea_section: 'learning', idea_order: i }; });
    },
    // Save/unsave a chapter card. The card's own row is found by
    // (source_entry_id, idea_order), so no client-side id is needed.
    saveChapterIdea: function(book, chapter, idea) {
      var src = 'book:' + chapter.id;
      var match = 'source_entry_id=eq.' + encodeURIComponent(src) + '&idea_order=eq.' + idea.idea_order;
      if (idea.saved_at) {
        return RPGACE.sb.secureWrite('encyclopedia_insights', 'update', { saved_at: null, recall_due: null, recall_step: 0 }, match)
          .then(function() { idea.saved_at = null; return idea; });
      }
      var now = new Date().toISOString();
      var due = RPGACE.modules.recall.logic.dueIn(0);
      var write = idea._rowExists
        ? RPGACE.sb.secureWrite('encyclopedia_insights', 'update', { saved_at: now, recall_step: 0, recall_due: due }, match)
        : RPGACE.sb.secureWrite('encyclopedia_insights', 'insert', {
            source_entry_id: src,
            source_entry_title: book.title + ' — ' + chapter.chapter_title,
            insight_text: idea.insight_text,
            idea_section: 'learning',
            idea_order: idea.idea_order,
            status: 'auto',
            saved_at: now, recall_step: 0, recall_due: due,
            // RI-5: the insight's own realm (RI-4 tag), else the book's realms.
            realms: (chapter.insight_realms && chapter.insight_realms[idea.insight_text]) ? [chapter.insight_realms[idea.insight_text]] : (book.realms || []),
          });
      return write.then(function() { idea.saved_at = now; idea._rowExists = true; RPGACE.cache.clear('encyclopedia_insights'); return idea; });
    },
  },

  ui: {
    renderInto: function(wrap) {
      var self = RPGACE.modules.recall;
      if (!wrap) return;
      var strip = document.getElementById('recall-strip');
      if (!strip) {
        strip = document.createElement('div');
        strip.id = 'recall-strip';
        strip.style.cssText = 'margin-bottom:14px;';
        var out = document.getElementById('mb-output');
        if (out && out.parentNode === wrap) wrap.insertBefore(strip, out); else wrap.appendChild(strip);
      }
      strip.innerHTML = '';
      self.logic.loadDue().then(function(rows) { self.ui.renderStrip(strip, rows); self.ui.studyLine(strip); })
        .catch(function(e) { console.warn('[recall] load failed', e); });
    },

    // Study (Oct 20 2026): exam questions answered wrong are due on the same
    // schedule; one line under the idea cards opens a Redo round.
    studyLine: function(strip) {
      var sh = RPGACE.modules.studyHub;
      if (!sh || !strip) return;
      sh.logic.dueCount().then(function(n) {
        if (!n || document.getElementById('recall-study')) return;
        var b = document.createElement('button');
        b.type = 'button'; b.id = 'recall-study';
        b.style.cssText = 'display:block;width:100%;text-align:left;min-height:44px;padding:10px 14px;margin-top:4px;border-radius:10px;border:1px solid var(--blue,#4A8CCC);background:none;color:var(--text);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;';
        b.textContent = '🎓 ' + n + ' exam question' + (n === 1 ? '' : 's') + ' to redo → Redo now';
        b.onclick = function() { RPGACE.areaNav.closePopups(); sh.open({ mode: 'redo' }); };
        strip.appendChild(b);
      });
    },

    renderStrip: function(strip, rows) {
      var self = RPGACE.modules.recall;
      strip.innerHTML = '';
      if (!rows.length) return;
      var queue = rows.slice(0, self.PER_BRIEF);
      var head = document.createElement('div');
      head.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin-bottom:8px;';
      head.textContent = '🧠 Remember these (' + rows.length + ' due)';
      strip.appendChild(head);
      queue.forEach(function(r) {
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;';
        var txt = document.createElement('div');
        txt.style.cssText = 'font-size:15px;line-height:1.5;color:var(--text);';
        txt.textContent = r.insight_text;
        // KN-5: the source line opens where the idea came from.
        var src = document.createElement('button'); src.type = 'button'; src.className = 'recall-src';
        src.style.cssText = 'display:block;background:none;border:none;padding:0;min-height:32px;text-align:left;font-size:12px;color:var(--blue,#4A8CCC);text-decoration:underline;cursor:pointer;font-family:inherit;margin:4px 0 8px;';
        src.textContent = '📍 From: ' + (r.source_entry_title || 'saved idea');
        src.onclick = function() { var ep = RPGACE.modules.encyclopediaPosts; if (!ep) return; RPGACE.areaNav.closePopups(); ep.ui._openSource(r); };
        var btns = document.createElement('div');
        btns.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
        var mk = function(label, primary, remembered) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.style.cssText = 'min-height:40px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
            (primary ? 'background:var(--gold);color:#1a1405;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);');
          b.onclick = function() {
            b.disabled = true;
            self.logic.answer(r, remembered).then(function(p) {
              var msg = remembered ? (p.recall_due ? 'Next in ' + self.INTERVALS[p.recall_step] + ' days' : 'Learned — off the schedule') : 'Back tomorrow';
              card.innerHTML = '<div style="font-size:13px;color:var(--muted);">✓ ' + msg + '</div>';
            }).catch(function(e) {
              b.disabled = false;
              RPGACE.utils.toast('⚠️ Couldn\'t save: ' + (e.message || e), '#CC4A4A', 3500, 'recall');
            });
          };
          return b;
        };
        btns.appendChild(mk('Again', false, false));
        btns.appendChild(mk('Got it', true, true));
        card.appendChild(txt); card.appendChild(src); card.appendChild(btns);
        strip.appendChild(card);
      });
    },

    openChapter: function(book, chapter) {
      var self = RPGACE.modules.recall;
      var ep = RPGACE.modules.encyclopediaPosts;
      var ideas = self.logic.chapterIdeas(chapter);
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🃏 ' + book.title, title: chapter.chapter_title, noDefaultClose: true });
      var entry = { title: chapter.chapter_title, content: chapter.formatted_text || chapter.raw_text || '' };
      var ctx = { book: book, saveIdea: function(d) { return self.logic.saveChapterIdea(book, chapter, d); } };
      // Mark cards already saved from an earlier read.
      RPGACE.sb.select('encyclopedia_insights', 'select=idea_order,saved_at&source_entry_id=eq.' + encodeURIComponent('book:' + chapter.id))
        .then(function(rows) {
          (Array.isArray(rows) ? rows : []).forEach(function(r) {
            ideas.forEach(function(d) { if (d.idea_order === r.idea_order) { d._rowExists = true; d.saved_at = r.saved_at; } });
          });
        }).catch(function() {})
        .then(function() { ep._renderCards(pop, entry, ideas, ctx); });
    },

    openChapterById: function(chapterId) {
      var self = RPGACE.modules.recall;
      RPGACE.sb.select('bookworm_chapters', 'select=id,book_id,chapter_title,insights,formatted_text,raw_text&id=eq.' + chapterId + '&limit=1').then(function(cs) {
        var c = cs && cs[0];
        if (!c) throw new Error('chapter not found');
        return RPGACE.sb.select('bookworm_books', 'select=id,title&id=eq.' + c.book_id + '&limit=1').then(function(bs) {
          self.ui.openChapter((bs && bs[0]) || { title: 'Book' }, c);
        });
      }).catch(function(e) { RPGACE.utils.toast('⚠️ Couldn\'t open that chapter: ' + (e.message || e), '#CC4A4A', 3500, 'recall'); });
    },
  },

  renderInto: function(w) { return this.ui.renderInto(w); },
  openChapter: function(b, c) { return this.ui.openChapter(b, c); },
  openChapterById: function(id) { return this.ui.openChapterById(id); },
});
/* ===END:recall=== */
