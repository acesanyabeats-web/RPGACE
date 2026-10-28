

/* ===MODULE:encyclopediaPosts=== */
// Oct 10 2026 — C1 of the ratified /CEO plan "RPGACE Domains, Navigation &
// Deepstash Encyclopedia" (records/2026-10/rpgace_domains_navigation_ceo_plan_2026-10-10.txt).
// Alex: "id like encyclopedia to make the articles like a post or series from
// deepstash". Every Content Intelligence report already carries a finished
// article (insights.encyclopedia_entry) plus list-shaped methods
// (production_techniques / what_to_steal / what_to_avoid /
// content_strategy_insights). This module is the ONE pipeline (rule 8) that
// turns a report into:
//   - an `encyclopedia` row (source='intel', source_url = the video url), and
//   - one `encyclopedia_insights` row per idea card (idea_section/idea_order,
//     saved_at when Alex saves it), linked by source_entry_id.
// It replaced syncIntelData's old auto-save loop, which only looked at the
// newest 5 reports and was gated by a localStorage "already saved" marker
// that outlived the encyclopedia wipe — the real reason 37 finished articles
// never reached the Encyclopedia.
// UI: each article reads as a post of idea cards (Back/Next, "3 / 9", read
// time, Save idea, Full article); the Encyclopedia home gets a Posts strip
// with Series (articles grouped by shared tag) and Saved ideas.
RPGACE.register('encyclopediaPosts', {
  domain: 'knowledge',

  // Section order = card order inside a post. `src` is the key inside the
  // report's insights object; 'summary'/'key_learnings' live one level
  // deeper, inside insights.encyclopedia_entry.
  SECTIONS: [
    { key: 'summary',   label: 'The idea',     src: 'summary',                   inEntry: true,  macro: 'strategy' },
    { key: 'learning',  label: 'Key learning', src: 'key_learnings',             inEntry: true,  macro: 'strategy' },
    { key: 'technique', label: 'Technique',    src: 'production_techniques',     inEntry: false, macro: 'beat' },
    { key: 'steal',     label: 'Steal this',   src: 'what_to_steal',             inEntry: false, macro: 'content' },
    { key: 'avoid',     label: 'Avoid',        src: 'what_to_avoid',             inEntry: false, macro: 'content' },
    { key: 'strategy',  label: 'Strategy',     src: 'content_strategy_insights', inEntry: false, macro: 'strategy' },
    // VW-5: realm-section reports (insights.realm_sections) - no src, built
    // by realmIdeas(); each card carries its own realm.
    { key: 'point',     label: 'Key point',    src: null, inEntry: false, macro: 'strategy' },
    { key: 'try',       label: 'Try this',     src: null, inEntry: false, macro: 'strategy' },
    { key: 'made',      label: 'How it\'s made', src: null, inEntry: false, macro: 'content' },
  ],

  // VW-5: a card's heading - "🍳 Chef · Key point" when the card belongs to
  // one realm, else the section label.
  cardLabel: function(d) {
    var self = RPGACE.modules.encyclopediaPosts, X = RPGACE.modules.xpSeason, lab = 'Idea';
    self.SECTIONS.forEach(function(s) { if (s.key === d.idea_section) lab = s.label; });
    var rs = Array.isArray(d.realms) ? d.realms : [];
    var m = (d.idea_section === 'point' || d.idea_section === 'try') && rs.length === 1 && X && X.REALMS[rs[0]];
    return m ? m.icon + ' ' + m.name + ' · ' + lab : lab;
  },

  // VW-5: cards + article text from a realm-section report. One card per
  // key point (with its quote and time) and per Try this, tagged with that
  // realm; How it's made points only when the report has them (Creator /
  // Producer / Hustler). Quest ideas are not cards (they have their own).
  realmIdeas: function(r) {
    var ins = (r && r.insights) || {}, secs = ins.realm_sections || {}, X = RPGACE.modules.xpSeason;
    var enc = ins.encyclopedia_entry || {}, ideas = [], md = [];
    var order = (ins.realms || []).filter(function(k) { return secs[k]; });
    Object.keys(secs).forEach(function(k) { if (order.indexOf(k) === -1) order.push(k); });
    var pointText = function(p) {
      return String(p.text || '').trim() + (p.quote ? ' — "' + String(p.quote).trim() + '"' : '') + (p.at ? ' (' + p.at + ')' : '');
    };
    if (enc.summary) ideas.push({ section: 'summary', text: String(enc.summary).trim(), macro: 'strategy', realms: null });
    order.forEach(function(k) {
      var s = secs[k] || {}, m = X && X.REALMS[k];
      md.push('', '### ' + (m ? m.icon + ' ' + m.name : k) + ' — ' + (s.score || '?') + '/10');
      if (s.why) md.push('*' + s.why + '*');
      if (s.teaches) md.push('', s.teaches);
      (s.points || []).forEach(function(p) {
        if (!p || !p.text) return;
        md.push('- ' + pointText(p));
        ideas.push({ section: 'point', text: pointText(p), macro: 'strategy', realms: [k] });
      });
      if (s.action) {
        md.push('', '**Try this:** ' + s.action);
        ideas.push({ section: 'try', text: String(s.action).trim(), macro: 'strategy', realms: [k] });
      }
    });
    var made = ins.how_made;
    if (made && ((made.points || []).length || made.summary)) {
      md.push('', '### 🎬 How it\'s made');
      if (made.summary) md.push(made.summary);
      (made.points || []).forEach(function(p) {
        if (!p || !p.text) return;
        md.push('- ' + pointText(p));
        ideas.push({ section: 'made', text: pointText(p), macro: 'content', realms: null });
      });
      (made.steal || []).forEach(function(x) { md.push('- Reuse: ' + x); });
      (made.avoid || []).forEach(function(x) { md.push('- Don\'t copy: ' + x); });
    }
    return { ideas: ideas, md: md };
  },

  _running: false,
  _seriesCache: null,

  init: function() {
    var self = this;
    // Backfill once per load after boot (idempotent: skips any report that
    // already has an article). Needs a logged-in session for secureWrite.
    RPGACE.registerBootTask(function() {
      return new Promise(function(resolve) {
        setTimeout(function() { self.ensureArticles().then(resolve, resolve); }, 2500);
      });
    });
    RPGACE.hooks.on('page:show', function(name) {
      // KR-2 (Oct 27 2026): the Encyclopedia page is "Learned" - Write-ups | Ideas
      // | Jargon. Due idea cards (the old strip) live on Review now.
      if (name === 'encyclopedia') setTimeout(function() { self.ui.showLearned(self._learnTab || 'writeups'); }, 300);
    });
  },

  logic: {

    // Pure: report row -> { title, content, tags, ideas[] }. No I/O, so the
    // same function serves the in-app sync and any offline backfill.
    articleFromReport: function(r) {
      var self = RPGACE.modules.encyclopediaPosts;
      var ins = (r && r.insights) || {};
      var enc = ins.encyclopedia_entry || {};
      if (!enc.title || !enc.summary) return null;
      var ideas = [];
      var md = [];
      md.push('## ' + enc.title);
      md.push('');
      md.push('**Source:** ' + (r.title || 'video') + (r.creator ? ' by ' + r.creator : '') + (r.platform ? ' (' + r.platform + ')' : ''));
      if (r.score != null) md.push('**Score:** ' + r.score + '/10');
      if (r.url && /^https?:/i.test(r.url)) md.push('**Link:** ' + r.url); // SA-1: a shared text has no link
      if (ins.realm_sections) {
        var ri = self.realmIdeas(r);
        if (enc.summary) md.push('', '### The idea', enc.summary);
        md = md.concat(ri.md);
        ideas = ri.ideas;
      } else self.SECTIONS.forEach(function(s) {
        if (!s.src) return;
        var val = s.inEntry ? enc[s.src] : ins[s.src];
        var items = Array.isArray(val) ? val : (val ? [val] : []);
        items = items.map(function(t) { return String(t || '').trim(); }).filter(Boolean);
        if (!items.length) return;
        md.push('');
        md.push('### ' + s.label);
        items.forEach(function(t) {
          md.push(s.key === 'summary' ? t : '- ' + t);
          ideas.push({ section: s.key, text: t, macro: s.macro });
        });
      });
      ideas.forEach(function(d, i) { d.order = i; });
      return {
        title: String(enc.title).slice(0, 300),
        content: md.join('\n'),
        tags: Array.isArray(enc.tags) ? enc.tags.slice(0, 8) : [],
        source_url: r.url || null,
        realms: Array.isArray(r.realms) ? r.realms : [], // RI-5: the realms the video was read through
        ideas: ideas,
      };
    },

    readMinutes: function(ideas) {
      var words = (ideas || []).reduce(function(n, d) { return n + String(d.text || d.insight_text || '').split(/\s+/).length; }, 0);
      return Math.max(1, Math.round(words / 200));
    },

    // Ensures every (non-suppressed) intel report has its article + idea rows.
    ensureArticles: function() {
      var self = RPGACE.modules.encyclopediaPosts;
      if (self._running || !RPGACE.sb || !RPGACE.sb.select || !RPGACE.sb.secureWrite) return Promise.resolve(0);
      self._running = true;
      var reportsP = RPGACE.sb.select('intel_reports', 'select=url,title,creator,platform,score,insights,created_at&order=created_at.desc&limit=500');
      var encP = RPGACE.sb.select('encyclopedia', 'select=id,title,source_url,created_at&limit=1000');
      return Promise.all([reportsP, encP]).then(function(res) {
        var reports = Array.isArray(res[0]) ? res[0] : [];
        var encs = Array.isArray(res[1]) ? res[1] : [];
        var haveUrl = {}, haveTitle = {}, oldByUrl = {};
        // VW-6: a video re-analysed after its article was made (the report
        // is newer) gets its article + idea cards replaced, not skipped.
        var newest = {};
        reports.forEach(function(r) { if (r.url && (!newest[r.url] || r.created_at > newest[r.url])) newest[r.url] = r.created_at; });
        encs.forEach(function(e) {
          if (e.source_url && newest[e.source_url] && e.created_at && newest[e.source_url] > e.created_at) {
            oldByUrl[e.source_url] = e; return;
          }
          if (e.source_url) haveUrl[e.source_url] = true;
          if (e.title) haveTitle[String(e.title).toLowerCase()] = true;
        });
        self._oldByUrl = oldByUrl;
        var filterP = (RPGACE.utils && RPGACE.utils.filterReanalysisSuppressed)
          ? RPGACE.utils.filterReanalysisSuppressed(reports, 'created_at').catch(function() { return reports; })
          : Promise.resolve(reports);
        return filterP.then(function(list) {
          var todo = [];
          var seen = {};
          list.forEach(function(r) {
            var a = self.articleFromReport(r);
            if (!a) return;
            var tk = a.title.toLowerCase();
            if ((a.source_url && haveUrl[a.source_url]) || haveTitle[tk] || seen[tk]) return;
            seen[tk] = true;
            todo.push(a);
          });
          // Sequential, so one failure is reported and the rest still run.
          var made = 0;
          return todo.reduce(function(p, a) {
            return p.then(function() {
              return self._replaceOld(a).then(function() { return self._saveArticle(a); }).then(function() { made++; })
                .catch(function(e) { console.warn('[encyclopediaPosts] article save failed:', a.title, e.message); });
            });
          }, Promise.resolve()).then(function() { return made; });
        });
      }).then(function(made) {
        self._running = false;
        self._seriesCache = null;
        if (made) {
          RPGACE.utils.toast('📖 ' + made + ' new Encyclopedia post' + (made === 1 ? '' : 's') + ' from what you shared', 'var(--gold)', 3500, 'encyclopediaPosts');
          if (typeof refreshEncyclopediaDisplay === 'function' && document.getElementById('page-encyclopedia') && document.getElementById('page-encyclopedia').classList.contains('active')) refreshEncyclopediaDisplay();
        }
        return made;
      }, function(e) {
        self._running = false;
        console.warn('[encyclopediaPosts] ensureArticles failed:', e && e.message);
        return 0;
      });
    },

    // VW-6: drop the older article + its idea cards for a re-analysed video
    // (only when none of its cards were saved - a saved card keeps the old
    // article). Same delete path the Encyclopedia's own delete uses.
    _replaceOld: function(a) {
      var self = RPGACE.modules.encyclopediaPosts, old = a.source_url && (self._oldByUrl || {})[a.source_url];
      if (!old) return Promise.resolve();
      return RPGACE.sb.select('encyclopedia_insights', 'select=id&source_entry_id=eq.' + encodeURIComponent(String(old.id)) + '&saved_at=not.is.null&limit=1').then(function(saved) {
        if (saved && saved.length) throw new Error('kept the old article - it has saved idea cards');
        return RPGACE.sb.secureWrite('encyclopedia_insights', 'delete', null, 'source_entry_id=eq.' + encodeURIComponent(String(old.id)));
      }).then(function() {
        return RPGACE.sb.secureWrite('encyclopedia', 'delete', null, 'id=eq.' + encodeURIComponent(String(old.id)));
      }).then(function() { delete self._oldByUrl[a.source_url]; });
    },

    _saveArticle: function(a) {
      var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      var row = { title: a.title, date: date, content: a.content, html: '', source: 'intel', source_url: a.source_url, realms: a.realms || [], created_at: new Date().toISOString() };
      return RPGACE.sb.secureWrite('encyclopedia', 'insert', row, undefined, 'title').then(function(saved) {
        var entry = Array.isArray(saved) ? saved[0] : saved;
        if (!entry || !entry.id) throw new Error('no id returned for ' + a.title);
        if (!a.ideas.length) return entry;
        var rows = a.ideas.map(function(d) {
          return {
            source_entry_id: String(entry.id), source_entry_title: a.title,
            insight_text: d.text, micro_categories: a.tags, macro_category: d.macro,
            status: 'auto', idea_section: d.section, idea_order: d.order, realms: d.realms || a.realms || [],
          };
        });
        return RPGACE.sb.secureWrite('encyclopedia_insights', 'insert', rows).then(function() { return entry; });
      });
    },

    loadIdeas: function(entryId) {
      return RPGACE.sb.select('encyclopedia_insights',
        'source_entry_id=eq.' + encodeURIComponent(String(entryId)) + '&idea_section=not.is.null&order=idea_order.asc&limit=200')
        .then(function(rows) { return Array.isArray(rows) ? rows : []; });
    },

    // Series = tags shared by 2+ posts. Tags live on each post's summary idea.
    loadSeries: function() {
      var self = RPGACE.modules.encyclopediaPosts;
      // RI-5: posts follow the Encyclopedia realm filter (self._realm).
      var realm = self._realm || '';
      if (self._seriesCache && self._seriesCache.realm === realm) return Promise.resolve(self._seriesCache);
      return Promise.all([
        RPGACE.sb.select('encyclopedia_insights', 'idea_section=eq.summary&select=source_entry_id,source_entry_title,micro_categories,realms&limit=1000'),
        RPGACE.sb.select('encyclopedia_insights', 'saved_at=not.is.null&select=id&limit=1000'),
      ]).then(function(res) {
        var all = Array.isArray(res[0]) ? res[0] : [];
        var rows = realm ? all.filter(function(r) { return RPGACE.realmOf('encyclopedia_insights', r).indexOf(realm) !== -1; }) : all;
        var byTag = {};
        rows.forEach(function(r) {
          (r.micro_categories || []).forEach(function(t) {
            var k = String(t).toLowerCase();
            (byTag[k] = byTag[k] || []).push({ id: r.source_entry_id, title: r.source_entry_title });
          });
        });
        var series = Object.keys(byTag).filter(function(k) { return byTag[k].length >= 2; })
          .map(function(k) { return { tag: k, posts: byTag[k] }; })
          .sort(function(a, b) { return b.posts.length - a.posts.length || (a.tag < b.tag ? -1 : 1); });
        self._seriesCache = { series: series, postCount: rows.length, savedCount: Array.isArray(res[1]) ? res[1].length : 0, realm: realm };
        return self._seriesCache;
      });
    },

    toggleSave: function(idea) {
      var self = RPGACE.modules.encyclopediaPosts;
      var next = idea.saved_at ? null : new Date().toISOString();
      // L1 (Oct 10 2026): saving an idea puts it on the recall schedule
      // (first resurfacing tomorrow); unsaving takes it off.
      var patch = { saved_at: next, recall_step: 0, recall_due: next && RPGACE.modules.recall ? RPGACE.modules.recall.logic.dueIn(0) : null };
      return RPGACE.sb.secureWrite('encyclopedia_insights', 'update', patch, 'id=eq.' + idea.id)
        .then(function() { idea.saved_at = next; idea.recall_step = 0; idea.recall_due = patch.recall_due; self._seriesCache = null; return idea; });
    },
  },

  ui: {

    _esc: function(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    },

    _btn: function(label, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'min-height:44px;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;' +
        (primary ? 'background:var(--gold);color:#000;border:1px solid var(--gold);' : 'background:none;color:var(--text);border:1px solid var(--border);');
      return b;
    },

    // Posts strip above the Encyclopedia list: series chips + saved ideas.
    _injectStrip: function() {
      var self = RPGACE.modules.encyclopediaPosts;
      // LL-2: the strip now heads the Ideas tab (#enc-ideas), not the
      // folded old article list.
      var host = document.getElementById('enc-ideas');
      if (!host) return;
      var strip = document.getElementById('enc-posts-strip');
      if (!strip) {
        strip = document.createElement('div');
        strip.id = 'enc-posts-strip';
        strip.style.cssText = 'margin:0 0 16px;padding:14px 16px;background:var(--panel2);border:1px solid var(--border);border-radius:10px;';
        host.insertBefore(strip, host.firstChild);
      }
      strip.innerHTML = '<div style="font-size:14px;color:var(--muted)">Loading posts…</div>';
      self.loadSeries().then(function(data) {
        strip.innerHTML = '';
        var head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;';
        var h = document.createElement('h3');
        h.style.cssText = 'margin:0;font-size:16px;color:var(--text);flex:1;min-width:140px;';
        h.textContent = 'Posts (' + data.postCount + ')';
        head.appendChild(h);
        var saved = self._btn('★ Saved ideas (' + data.savedCount + ')', false);
        saved.onclick = function() { self.openSaved(); };
        head.appendChild(saved);
        strip.appendChild(head);
        if (!data.series.length) {
          var none = document.createElement('div');
          none.style.cssText = 'font-size:14px;color:var(--muted);';
          none.textContent = data.postCount ? 'No series yet — a series appears when 2+ posts share a topic.' : 'Posts appear here once what you share (videos, pages, text) is analysed.';
          strip.appendChild(none);
          return;
        }
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
        data.series.slice(0, 12).forEach(function(s) {
          var chip = self._btn(s.tag.replace(/-/g, ' ') + ' · ' + s.posts.length, false);
          chip.style.minHeight = '40px';
          chip.style.fontWeight = '500';
          chip.onclick = function() { self.openSeries(s); };
          row.appendChild(chip);
        });
        strip.appendChild(row);
      }).catch(function(e) {
        strip.innerHTML = '<div style="font-size:14px;color:var(--muted)">Couldn\'t load posts: ' + self._esc(e.message) + '</div>';
      });
    },

    openSeries: function(s) {
      var self = RPGACE.modules.encyclopediaPosts;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: 'Series', title: s.tag.replace(/-/g, ' ') + ' — ' + s.posts.length + ' posts' });
      s.posts.forEach(function(p, i) {
        var b = self._btn((i + 1) + '. ' + (p.title || 'Post'), false);
        b.style.cssText += 'display:block;width:100%;text-align:left;margin-bottom:8px;font-weight:500;';
        b.onclick = function() { pop.close(); self.openPost(p.id, { series: s, index: i }); };
        pop.box.appendChild(b);
      });
    },

    // Deepstash-style reader: one idea card at a time.
    // UI Debloat (Oct 27 2026, Alex: "no link to full article"): open the
    // write-up for a video by its link (encyclopedia.source_url); onMissing
    // runs when that video has no write-up yet.
    openByUrl: function(url, onMissing) {
      var self = RPGACE.modules.encyclopediaPosts, u = String(url || '');
      if (!u) { if (onMissing) onMissing(); return; }
      var hit = ((typeof ENC_ALL_ENTRIES !== 'undefined' && ENC_ALL_ENTRIES) || []).find(function(e) { return e.source_url === u; });
      if (hit) { self.ui.openPost(hit.id); return; }
      RPGACE.sb.select('encyclopedia', 'select=id&source_url=eq.' + encodeURIComponent(u) + '&limit=1').then(function(r) {
        if (Array.isArray(r) && r[0]) self.ui.openPost(r[0].id); else if (onMissing) onMissing(); else RPGACE.utils.toast('No write-up for this yet', 'var(--gold)', 2500);
      }).catch(function() { if (onMissing) onMissing(); });
    },
    openPost: function(entryId, ctx) {
      var self = RPGACE.modules.encyclopediaPosts;
      ctx = ctx || {};
      var entry = ((typeof ENC_ALL_ENTRIES !== 'undefined' && ENC_ALL_ENTRIES) || []).find(function(e) { return String(e.id) === String(entryId); });
      var entryP = entry ? Promise.resolve(entry)
        : RPGACE.sb.select('encyclopedia', 'id=eq.' + encodeURIComponent(entryId) + '&limit=1').then(function(r) { return (r && r[0]) || null; });
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: ctx.series ? 'Series · ' + ctx.series.tag.replace(/-/g, ' ') : 'Post', title: 'Loading…', noDefaultClose: true });
      var titleEl = pop.box.parentNode.children[pop.box.parentNode.children.length - 2];
      Promise.all([entryP, self.loadIdeas(entryId)]).then(function(res) {
        var e = res[0], ideas = res[1];
        if (titleEl && titleEl !== pop.box) titleEl.textContent = (e && e.title) || 'Post';
        self._renderCards(pop, e, ideas, ctx);
      }).catch(function(err) {
        pop.box.innerHTML = '<p style="color:var(--muted)">Couldn\'t load this post: ' + self._esc(err.message) + '</p>';
        var c = self._btn('Close', false); c.onclick = pop.close; pop.box.appendChild(c);
      });
    },

    _renderCards: function(pop, entry, ideas, ctx) {
      var self = RPGACE.modules.encyclopediaPosts;
      var labels = {};
      self.SECTIONS.forEach(function(s) { labels[s.key] = s.label; });
      var i = 0, full = false;
      var mins = self.readMinutes(ideas);
      function draw() {
        pop.box.innerHTML = '';
        var meta = document.createElement('div');
        meta.style.cssText = 'display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:10px;font-variant-numeric:tabular-nums;';
        meta.innerHTML = '<span>' + (full ? 'Full article' : (ideas.length ? (i + 1) + ' / ' + ideas.length : 'No idea cards')) + '</span><span>' + mins + ' min read</span>';
        pop.box.appendChild(meta);
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:18px;min-height:150px;font-size:16px;line-height:1.6;color:var(--text);max-height:55vh;overflow:auto;';
        if (full || !ideas.length) {
          card.innerHTML = (typeof renderMarkdown === 'function') ? renderMarkdown((entry && entry.content) || '') : self._esc((entry && entry.content) || '');
          card.style.fontSize = '14px';
        } else {
          var d = ideas[i];
          card.innerHTML = '<div style="font-size:13px;font-weight:600;color:var(--gold);margin-bottom:8px;">' + self._esc(RPGACE.modules.encyclopediaPosts.cardLabel(d)) + '</div>' +
            '<div>' + self._esc(d.insight_text) + '</div>';
        }
        pop.box.appendChild(card);

        var nav = document.createElement('div');
        nav.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;';
        var back = self._btn('← Back', false), next = self._btn('Next →', true);
        back.disabled = full || i === 0; back.style.opacity = back.disabled ? '0.4' : '1';
        var last = !ideas.length || i === ideas.length - 1;
        if (!full && last && ctx.series && ctx.index < ctx.series.posts.length - 1) next.textContent = 'Next post →';
        else if (!full && last) next.textContent = 'Done';
        if (full) next.textContent = 'Back to cards';
        back.onclick = function() { if (i > 0) { i--; draw(); } };
        next.onclick = function() {
          if (full) { full = false; return draw(); }
          if (!last) { i++; return draw(); }
          if (ctx.series && ctx.index < ctx.series.posts.length - 1) {
            var n = ctx.series.posts[ctx.index + 1];
            pop.close();
            return self.openPost(n.id, { series: ctx.series, index: ctx.index + 1 });
          }
          pop.close();
        };
        nav.appendChild(back); nav.appendChild(next);
        pop.box.appendChild(nav);

        var row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;';
        var save = self._btn(!full && ideas[i] && ideas[i].saved_at ? '★ Saved' : '☆ Save idea', false);
        save.disabled = full || !ideas.length; save.style.opacity = save.disabled ? '0.4' : '1';
        save.onclick = function() {
          var d = ideas[i];
          save.disabled = true;
          (ctx.saveIdea ? ctx.saveIdea(d) : self.toggleSave(d)).then(draw).catch(function(err) {
            save.disabled = false;
            RPGACE.utils.toast('Couldn\'t save idea: ' + err.message, '#CC4A4A', 4000, 'encyclopediaPosts');
          });
        };
        var art = self._btn(full ? 'Idea cards' : 'Full article', false);
        art.onclick = function() { full = !full; draw(); };
        var close = self._btn('Close', false);
        close.onclick = pop.close;
        row.appendChild(save); row.appendChild(art); row.appendChild(close);
        pop.box.appendChild(row);
        // Oct 10 2026 (P1): quests / watch creator / related jargon.
        if (entry && !ctx.book && RPGACE.modules.pathways) RPGACE.modules.pathways.articleActions(pop.box, entry);
      }
      draw();
    },

    // ── LL-2 (Oct 13 2026, Knowledge untangle) ──────────────────────────
    // Encyclopedia = what you learned: one tab bar shared by the Encyclopedia
    // page (Ideas) and the Jargon page; Sources opens the Life Library.
    _injectTabs: function(active) {
      var self = RPGACE.modules.encyclopediaPosts;
      var host = document.getElementById(active === 'jargon' ? 'jarg-tabs' : 'enc-tabs');
      if (!host) return;
      host.innerHTML = '';
      host.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;';
      var P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
      var onLearned = function(tab) { return function() {
        self._learnTab = tab;
        var pg = document.getElementById('page-' + P.encyclopedia);
        if (pg && pg.classList.contains('active')) self.ui.showLearned(tab); else if (typeof showPage === 'function') showPage(P.encyclopedia);
      }; };
      // KR-2: one Learned page - Write-ups | Ideas | Jargon, then the map.
      [['writeups', '📄 Write-ups', onLearned('writeups')],
       ['ideas', '💡 Ideas', onLearned('ideas')],
       ['jargon', '📖 Jargon', function() { if (typeof showPage === 'function') showPage(P.jargonEncyclopedia); }],
       ['map', '🧬 Map', function() { if (typeof showPage === 'function') showPage(P.phylumPath); }]].forEach(function(t) {
        var b = self._btn(t[1], t[0] === active);
        b.className = 'enc-tab'; b.dataset.tab = t[0];
        b.style.minHeight = '40px';
        b.onclick = t[2];
        host.appendChild(b);
      });
      var hint = document.createElement('div');
      hint.style.cssText = 'width:100%;font-size:13px;color:var(--muted);line-height:1.5;';
      hint.textContent = { writeups: 'Full write-ups of everything you shared and analysed.', ideas: 'Idea cards pulled from what you took in. Save one to have it come back in Review.',
        jargon: 'The vocabulary you are building, phylum by phylum.' }[active] || '';
      host.appendChild(hint);
    },

    // KR-2: switch the Learned page between Write-ups and Ideas (Jargon has its own page with the same tabs).
    showLearned: function(tab) {
      var self = RPGACE.modules.encyclopediaPosts, P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
      self._learnTab = tab;
      var pg = document.getElementById('page-' + P.encyclopedia);
      if (pg) {
        var t = pg.querySelector(':scope > .section-title'); if (t) t.textContent = '📖 Learned';
        var old = document.getElementById('enc-old-articles'); if (old) old.hidden = true;
      }
      // KR-2: the empty bibliography block (intelDelete) re-injects on page:show, so hide it by CSS, not by node.
      if (!document.getElementById('enc-learned-css')) {
        var css = document.createElement('style'); css.id = 'enc-learned-css';
        css.textContent = '#page-' + P.encyclopedia + ' #rpgace-bib-section{display:none!important}';
        document.head.appendChild(css);
      }
      self.ui._injectTabs(tab);
      var host = document.getElementById('enc-ideas'); if (!host) return;
      host.innerHTML = '';
      if (tab === 'ideas') self.ui._renderIdeas(); else self.ui._renderWriteups(host);
    },
    _renderWriteups: function(host) {
      var self = RPGACE.modules.encyclopediaPosts;
      var box = document.createElement('div'); box.id = 'enc-writeups'; box.textContent = 'Loading write-ups…';
      host.appendChild(box);
      RPGACE.sb.select('encyclopedia', 'select=id,title,date,source,source_url,realms,created_at&order=created_at.desc&limit=500').then(function(rows) {
        rows = Array.isArray(rows) ? rows : [];
        box.innerHTML = '';
        var q = document.createElement('input'); q.type = 'search'; q.id = 'enc-writeups-q'; q.placeholder = 'Search write-ups…';
        q.style.cssText = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;margin-bottom:8px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:15px;';
        var list = document.createElement('div'); list.id = 'enc-writeups-list';
        box.appendChild(q); box.appendChild(list);
        var X = RPGACE.modules.xpSeason;
        var kindOf = function(r) { var u = String(r.source_url || ''); return /^text:/.test(u) ? '📝' : (/youtu|instagram|tiktok|vimeo/i.test(u) ? '🎬' : (/^https?:/.test(u) ? '🌐' : '📄')); };
        var paint = function() {
          var w = q.value.trim().toLowerCase();
          var hits = rows.filter(function(r) { return !w || String(r.title || '').toLowerCase().indexOf(w) !== -1; });
          list.innerHTML = '';
          if (!hits.length) { list.textContent = rows.length ? 'No write-ups match.' : 'No write-ups yet — share a video, page or text and its write-up lands here.'; return; }
          hits.forEach(function(r) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'enc-wu-row'; b.dataset.id = r.id;
            b.style.cssText = 'display:flex;gap:10px;align-items:center;width:100%;text-align:left;min-height:52px;padding:10px 12px;margin-bottom:6px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--text);font:inherit;cursor:pointer;';
            var realms = (r.realms || []).map(function(k) { return X && X.REALMS[k] ? X.REALMS[k].icon : ''; }).join('');
            b.innerHTML = '<span style="font-size:20px" aria-hidden="true">' + kindOf(r) + '</span><span style="flex:1;min-width:0"><b style="display:block;font-size:15px;line-height:1.3"></b><span style="font-size:12px;color:var(--muted)"></span></span>';
            b.querySelector('b').textContent = r.title || 'Untitled';
            b.querySelector('span span').textContent = [r.date || String(r.created_at || '').slice(0, 10), realms].filter(Boolean).join(' · ');
            b.onclick = function() { self.openPost(r.id); };
            list.appendChild(b);
          });
        };
        q.oninput = paint; paint();
      }).catch(function(e) { box.textContent = '⚠️ Could not load write-ups: ' + (e && e.message || e); });
    },

    // Where an idea came from: a book chapter, a screenshot, or a source in
    // the Life Library (falls back to the post reader if it has no item).
    _openSource: function(d) {
      var self = RPGACE.modules.encyclopediaPosts;
      var sid = String(d.source_entry_id || '');
      if (sid.indexOf('book:') === 0 && RPGACE.modules.recall) return RPGACE.modules.recall.openChapterById(sid.slice(5));
      if (sid.indexOf('shot:') === 0 && RPGACE.modules.screenshotInbox) return RPGACE.modules.screenshotInbox.open({ id: sid.slice(5) });
      var lib = RPGACE.modules.lifeLibrary;
      if (lib && lib.logic.signedIn()) return lib.open({ focusSource: { table: 'encyclopedia', id: sid }, onMissing: function() { self.openPost(sid); } });
      self.openPost(sid);
    },

    IDEA_PAGE: 40,
    _renderIdeas: function() {
      var self = RPGACE.modules.encyclopediaPosts;
      var host = document.getElementById('enc-ideas');
      if (!host) return;
      var box = document.getElementById('enc-ideas-list');
      if (!box) { box = document.createElement('div'); box.id = 'enc-ideas-list'; host.appendChild(box); }
      box.innerHTML = '<div style="font-size:14px;color:var(--muted)">Loading ideas…</div>';
      RPGACE.sb.select('encyclopedia_insights', 'select=id,insight_text,idea_section,macro_category,source_entry_id,source_entry_title,saved_at,created_at,realms&order=created_at.desc&limit=1500').then(function(rows) {
        rows = Array.isArray(rows) ? rows : [];
        var labels = {}; self.SECTIONS.forEach(function(x) { labels[x.key] = x.label; });
        var state = { q: '', macro: '', shown: self.ui.IDEA_PAGE, shelfOf: null };
        var realmBox = null; // RI-5
        // KN-5: which phylum shelf each idea's source sits on (one cached read).
        var LL = RPGACE.modules.lifeLibrary;
        if (LL && LL.logic.signedIn()) LL.logic.shelfData().then(function(data) {
          var byKey = {};
          (data.items || []).forEach(function(it) { if (it.source_table && it.source_id) byKey[it.source_table + ':' + it.source_id] = it; });
          state.shelfOf = function(d) { var it = LL.logic.ideaItem(d, byKey); return it && it.phylum_number ? it.phylum_number : null; };
          paint();
        }).catch(function() {});
        box.innerHTML = '';
        var h = document.createElement('h3'); h.style.cssText = 'margin:0 0 8px;font-size:16px;color:var(--text);';
        h.textContent = 'All ideas (' + rows.length + ')';
        box.appendChild(h);
        var q = document.createElement('input'); q.type = 'search'; q.id = 'enc-ideas-q'; q.placeholder = 'Search ideas…';
        q.style.cssText = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;margin-bottom:8px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;font-family:inherit;';
        box.appendChild(q);
        realmBox = document.createElement('div'); realmBox.id = 'enc-realms';
        box.appendChild(realmBox);
        var chips = document.createElement('div'); chips.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;';
        box.appendChild(chips);
        var list = document.createElement('div'); list.id = 'enc-ideas-items';
        box.appendChild(list);
        var paint = function() {
          var realm = self._realm || '';
          realmBox.innerHTML = '';
          realmBox.appendChild(RPGACE.realmFilterRow({ counts: RPGACE.realmCounts(rows, 'encyclopedia_insights'), selected: realm,
            onPick: function(k) { self._realm = k; state.shown = self.ui.IDEA_PAGE; paint(); self.ui._injectStrip(); } }));
          chips.innerHTML = '';
          [['', 'All'], ['beat', 'Beat'], ['content', 'Content'], ['strategy', 'Strategy']].forEach(function(c) {
            var b = self._btn(c[1], state.macro === c[0]); b.className = 'enc-macro'; b.dataset.macro = c[0];
            b.style.minHeight = '36px'; b.style.padding = '6px 12px';
            b.onclick = function() { state.macro = c[0]; state.shown = self.ui.IDEA_PAGE; paint(); };
            chips.appendChild(b);
          });
          var ql = state.q.toLowerCase();
          var hits = rows.filter(function(d) {
            if (state.macro && d.macro_category !== state.macro) return false;
            if (realm && RPGACE.realmOf('encyclopedia_insights', d).indexOf(realm) === -1) return false;
            return !ql || (String(d.insight_text || '') + ' ' + String(d.source_entry_title || '')).toLowerCase().indexOf(ql) >= 0;
          });
          list.innerHTML = '';
          if (!hits.length) { list.innerHTML = '<div style="font-size:14px;color:var(--muted)">' + (rows.length ? 'No ideas match.' : 'No ideas yet - they appear when you analyse videos, read books or file screenshots.') + '</div>'; return; }
          hits.slice(0, state.shown).forEach(function(d) {
            var card = document.createElement('div'); card.className = 'enc-idea'; card.dataset.id = d.id;
            card.style.cssText = 'padding:12px 14px;margin-bottom:8px;background:var(--panel2);border:1px solid var(--border);border-radius:10px;';
            card.innerHTML = (d.idea_section ? '<div style="font-size:12px;font-weight:600;color:var(--gold);margin-bottom:4px;">' + self._esc(RPGACE.modules.encyclopediaPosts.cardLabel(d)) + '</div>' : '') +
              '<div style="font-size:15px;line-height:1.5;color:var(--text);">' + self._esc(d.insight_text) + '</div>';
            var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';
            var from = self._btn('From: ' + (d.source_entry_title || 'source'), false); from.className = 'enc-idea-from';
            from.style.cssText += 'font-weight:500;font-size:13px;min-height:40px;padding:6px 12px;text-align:left;';
            from.onclick = function() { self._openSource(d); };
            var save = self._btn(d.saved_at ? '★ Saved' : '☆ Save', false); save.className = 'enc-idea-save';
            save.style.cssText += 'min-height:40px;padding:6px 12px;';
            save.onclick = function() {
              save.disabled = true;
              self.toggleSave(d).then(function() { save.disabled = false; save.textContent = d.saved_at ? '★ Saved' : '☆ Save'; })
                .catch(function(e) { save.disabled = false; RPGACE.utils.toast('Couldn\'t save idea: ' + e.message, '#CC4A4A', 4000, 'encyclopediaPosts'); });
            };
            row.appendChild(save); row.appendChild(from);
            // Realm Tasks: an idea card can become a task (duplicate-checked).
            if (RPGACE.modules.realmTasks) row.appendChild(RPGACE.modules.realmTasks.ui.taskButton({ title: String(d.insight_text || '').slice(0, 120), realm: (d.realms || [])[0] || d.realm || null, kind: 'once', source: { table: 'idea_card', ref: String(d.id), label: String(d.source_entry_title || 'idea card').slice(0, 60) } }));
            var ph = state.shelfOf && state.shelfOf(d);
            if (ph && RPGACE.modules.knowledgeHub) {
              var sh = self._btn('🧭 Phylum ' + ph + ' shelf', false); sh.className = 'enc-idea-shelf';
              sh.style.cssText += 'font-weight:500;font-size:13px;min-height:40px;padding:6px 12px;';
              sh.onclick = function() { RPGACE.modules.knowledgeHub.ui.go('shelf', ph); };
              row.appendChild(sh);
            }
            card.appendChild(row);
            list.appendChild(card);
          });
          if (hits.length > state.shown) {
            var more = self._btn('Show more (' + (hits.length - state.shown) + ' left)', false); more.id = 'enc-ideas-more';
            more.onclick = function() { state.shown += self.ui.IDEA_PAGE; paint(); };
            list.appendChild(more);
          }
        };
        q.oninput = function() { state.q = q.value; state.shown = self.ui.IDEA_PAGE; paint(); };
        paint();
      }).catch(function(e) { box.innerHTML = '<div style="font-size:14px;color:var(--muted)">Couldn\'t load ideas: ' + self._esc(e.message) + '</div>'; });
    },

    openSaved: function() {
      var self = RPGACE.modules.encyclopediaPosts;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: 'Encyclopedia', title: 'Saved ideas' });
      pop.box.innerHTML = '<p style="color:var(--muted)">Loading…</p>';
      RPGACE.sb.select('encyclopedia_insights', 'saved_at=not.is.null&order=saved_at.desc&limit=300').then(function(rows) {
        rows = Array.isArray(rows) ? rows : [];
        pop.box.innerHTML = '';
        if (!rows.length) { pop.box.innerHTML = '<p style="color:var(--muted)">No saved ideas yet. Tap ☆ Save idea on any card.</p>'; return; }
        rows.forEach(function(d) {
          var item = document.createElement('div');
          item.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border);';
          item.innerHTML = '<div style="font-size:15px;line-height:1.5;color:var(--text)">' + self._esc(d.insight_text) + '</div>';
          var open = self._btn('From: ' + (d.source_entry_title || 'post'), false);
          open.style.cssText += 'margin-top:8px;font-weight:500;font-size:13px;';
          open.onclick = function() { pop.close(); self._openSource(d); };
          item.appendChild(open);
          pop.box.appendChild(item);
        });
      }).catch(function(e) { pop.box.innerHTML = '<p style="color:var(--muted)">Couldn\'t load saved ideas: ' + self._esc(e.message) + '</p>'; });
    },
  },

  // Public pass-throughs (G53 convention).
  articleFromReport: function(r) { return this.logic.articleFromReport(r); },
  readMinutes: function(i) { return this.logic.readMinutes(i); },
  ensureArticles: function() { return this.logic.ensureArticles(); },
  _saveArticle: function(a) { return this.logic._saveArticle(a); },
  _replaceOld: function(a) { return this.logic._replaceOld(a); },
  loadIdeas: function(id) { return this.logic.loadIdeas(id); },
  loadSeries: function() { return this.logic.loadSeries(); },
  toggleSave: function(d) { return this.logic.toggleSave(d); },
  _esc: function(s) { return this.ui._esc(s); },
  _btn: function(l, p) { return this.ui._btn(l, p); },
  openSeries: function(s) { return this.ui.openSeries(s); },
  openPost: function(id, ctx) { return this.ui.openPost(id, ctx); },
  _renderCards: function(p, e, i, c) { return this.ui._renderCards(p, e, i, c); },
  openSaved: function() { return this.ui.openSaved(); },
  _openSource: function(d) { return this.ui._openSource(d); },
});
/* ===END:encyclopediaPosts=== */
