
/* ===MODULE:pathways=== */
// Oct 10 2026 — P1 of the ratified /CEO plan "RPGACE Domains, Navigation &
// Deepstash Encyclopedia". Five new connections between code that already
// existed but never talked to each other. Every write reuses the owning
// module's own path (rule 8) — this module only connects them:
//   1. Encyclopedia post -> "Make these quests": the article's source report
//      (intel_reports.insights.quests) -> questEngine._createQuests, which
//      already dedupes on (quest_kind, source_ref).
//   2. Encyclopedia post -> "Watch this creator": the report's creator ->
//      intel_watchlist (skipped if that url is already watched).
//   3. Platform Oracle -> "About a beat": pick a real beat (beat_audio_jobs
//      filename/BPM/key, or a content_productions title) and every command is
//      prefixed with it (captionsPanel calls beatContext()).
//   4. Encyclopedia post -> "Related jargon": jargon_encyclopedia terms that
//      appear in the article, each with its explainer.
//   5. Cooking shopping list -> "Add a non-food item to your Wishlist":
//      shoppingWishlist.logic._addItem, same item shape as its own form.
RPGACE.register('pathways', {
  domain: 'knowledge',

  _jargon: null,

  init: function() {},

  logic: {

    reportForArticle: function(entry) {
      if (!entry || !entry.source_url) return Promise.resolve(null);
      return RPGACE.sb.select('intel_reports', 'select=url,title,creator,platform,score,insights&url=eq.' + encodeURIComponent(entry.source_url) + '&limit=1')
        .then(function(rows) { return (rows && rows[0]) || null; })
        .catch(function() { return null; });
    },

    questsFromReport: function(report) {
      var qs = (report && report.insights && report.insights.quests) || [];
      return Array.isArray(qs) ? qs.filter(function(q) { return q && q.name; }) : [];
    },

    // VW-4: places in questsFromReport() of one realm's quest ideas.
    questIndexes: function(report, realm) {
      var out = [];
      RPGACE.modules.pathways.logic.questsFromReport(report).forEach(function(q, i) { if (q.realm === realm) out.push(i); });
      return out;
    },

    // VW-4: a link that opens the video at a point's time ("1:15" / "1:02:05").
    // YouTube (watch, youtu.be, shorts) seeks with &t=; other sites open the
    // video itself (they have no time link).
    timeUrl: function(url, at) {
      var secs = String(at || '').split(':').reduce(function(n, x) { return n * 60 + (parseInt(x, 10) || 0); }, 0);
      var m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
      return m ? 'https://www.youtube.com/watch?v=' + m[1] + '&t=' + secs + 's' : String(url || '');
    },

    // RI-7 (Oct 15 2026): one suggested quest from an analysed input ->
    // a quest_log candidate. Its realm goes in `category` (the convention
    // My Day realm blocks already use; xp_on_change pays that realm). XP is
    // Oracle's figure rounded to 5, 5..100 (Alex: "capped at 100"); the
    // database also enforces this and pays only the first 3 a day.
    QUEST_XP_MAX: 100,
    questXp: function(xp) {
      return Math.max(5, Math.min(RPGACE.modules.pathways.logic.QUEST_XP_MAX, Math.round((Number(xp) || 50) / 5) * 5));
    },
    questRealm: function(report, q) {
      var picked = RPGACE.realmOf('intel_reports', report || {});
      if (q && picked.indexOf(q.realm) !== -1) return q.realm;
      var own = q ? RPGACE.realmPicker.clean([q.realm]) : [];
      return own[0] || picked[0] || (q && RPGACE.QUEST_CATEGORY_REALM[q.category]) || 'producer';
    },
    questCand: function(report, i) {
      var L = RPGACE.modules.pathways.logic;
      var q = L.questsFromReport(report)[i];
      if (!q) return null;
      return {
        key: 'input_quest', kind: 'input_quest', name: String(q.name).slice(0, 120),
        description: q.action || '', category: L.questRealm(report, q),
        questType: q.type === 'daily' ? 'daily' : 'weekly', xp: L.questXp(q.xp),
        sourceTable: 'intel_reports', sourceRef: String(report.url || report.id || 'report') + '#q' + i, workflow: null,
      };
    },
    // One tap = one quest (was: every quest at once).
    // Realm Tasks (Oct 27 2026): a video's idea is a realm task now (one
    // system, not quests + tasks); every report's ideas already reach the
    // 📥 inbox by themselves - this keeps the one tapped.
    addQuest: function(report, i) {
      var rt = RPGACE.modules.realmTasks, c = RPGACE.modules.pathways.logic.questCand(report, i);
      if (!rt) return Promise.reject(new Error('Tasks are not loaded'));
      if (!c) return Promise.reject(new Error('That idea is no longer in the report'));
      return rt.logic.keepIdea({ realm: c.category, title: c.name, notes: c.description, xp: c.xp, source: { table: 'intel_reports', ref: c.sourceRef, label: String(report.title || 'video').slice(0, 80) } });
    },
    makeQuests: function(entry, report) {
      // KR-7 (Oct 27 2026): one route - every quest from a write-up becomes a
      // Realm Task (deduped), the same way a single quest's button does.
      var L = RPGACE.modules.pathways.logic, n = L.questsFromReport(report).length, made = 0;
      var chain = Promise.resolve();
      for (var i = 0; i < n; i++) (function(i) { chain = chain.then(function() { return L.addQuest(report, i).then(function() { made++; }); }); })(i);
      return chain.then(function() { return made; });
    },

    watchCreator: function(report) {
      if (!report || !report.url) return Promise.reject(new Error('No source video for this post'));
      return RPGACE.sb.select('intel_watchlist', 'select=id&url=eq.' + encodeURIComponent(report.url) + '&limit=1').then(function(rows) {
        if (rows && rows.length) return 'already';
        var ins = report.insights || {};
        return RPGACE.sb.secureWrite('intel_watchlist', 'insert', {
          url: report.url, title: report.title || null, creator: report.creator || null,
          platform: report.platform || null, score: report.score || null,
          reason: ins.watchlist_reason || ('Added from Encyclopedia post: ' + (report.title || '')),
        }).then(function() { return 'added'; });
      });
    },

    loadJargon: function() {
      var self = RPGACE.modules.pathways;
      if (self._jargon) return Promise.resolve(self._jargon);
      return RPGACE.sb.select('jargon_encyclopedia', 'select=term,explainer,status,phylum_number&status=neq.rejected&limit=2000')
        .then(function(rows) { self._jargon = Array.isArray(rows) ? rows : []; return self._jargon; })
        .catch(function() { return []; });
    },

    // Terms (3+ chars) that appear as whole words in the text, longest first.
    matchJargon: function(text, terms) {
      var lower = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9#&'+\s-]/g, ' ') + ' ';
      var seen = {};
      return (terms || []).filter(function(t) {
        var term = String(t.term || '').toLowerCase().trim();
        if (term.length < 3 || seen[term]) return false;
        var esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var hit = new RegExp('[\\s-]' + esc + '[\\s-]').test(lower);
        if (hit) seen[term] = true;
        return hit;
      }).sort(function(a, b) { return b.term.length - a.term.length; }).slice(0, 12);
    },

    // BT-4 (Oct 16 2026): beats come from Beat Log (content_productions) -
    // the old beat_audio_jobs uploads are retired. A logged beat carries its
    // BPM / key from Beat Log's form (creative_docs.beat_meta).
    loadBeats: function() {
      return RPGACE.sb.select('content_productions', 'select=id,con_id,title,content_type,creative_docs,created_at&order=created_at.desc&limit=30').catch(function() { return []; })
        .then(function(rows) {
          var beats = [];
          (rows || []).forEach(function(c) {
            if (!c.title) return;
            var m = (c.creative_docs && c.creative_docs.beat_meta) || {};
            var bits = [m.bpm ? m.bpm + ' BPM' : '', m.key ? (m.key + ' ' + (m.scale || '')).trim() : '', m.mood || ''].filter(Boolean).join(', ');
            var beat = c.content_type === 'music_video';
            beats.push({ id: 'cp:' + c.id, label: (beat ? '🥁 ' : (c.con_id ? 'ConID #' + c.con_id + ' — ' : '')) + c.title + (bits ? ' (' + bits + ')' : ''),
                         context: (beat ? 'my beat "' : 'my production "') + c.title + '"' + (bits ? ' (' + bits + ')' : '') });
          });
          return beats;
        });
    },

    beatContext: function(prompt, beat) {
      if (!beat) return prompt;
      return 'This is about ' + beat.context + '. ' + prompt;
    },
  },

  ui: {

    _btn: function(label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'min-height:40px;padding:8px 12px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;';
      return b;
    },

    // Row of actions under an Encyclopedia post (called by encyclopediaPosts).
    articleActions: function(container, entry) {
      var self = RPGACE.modules.pathways;
      if (!container || !entry) return;
      var row = document.createElement('div');
      row.className = 'pw-article-actions';
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);';
      container.appendChild(row);
      var jb = self.ui._btn('📚 Related jargon…');
      jb.onclick = function() { self.ui.openRelatedJargon(entry); };
      row.appendChild(jb);
      self.logic.reportForArticle(entry).then(function(report) {
        if (!report) return;
        // VW-4: a new-style report shows its realm sections (key points with
        // a time that opens the video there, Try this, quest card) folded
        // under the cards; older reports keep RI-7's quest list.
        var rs = self.ui.realmSections(report);
        if (rs) {
          var det = document.createElement('details');
          det.className = 'pw-realms-fold';
          det.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--border);';
          var sum = document.createElement('summary');
          sum.style.cssText = 'cursor:pointer;min-height:44px;line-height:44px;font-size:14px;font-weight:700;color:var(--gold);';
          sum.textContent = '🧭 By realm: key points, times, quest ideas';
          det.appendChild(sum); det.appendChild(rs);
          container.insertBefore(det, row);
        } else {
          // RI-7: suggested quests, each with its realm and its own + Add.
          var ql = self.ui.questList(report);
          if (ql) container.insertBefore(ql, row);
        }
        if (report.creator) {
          var wb = self.ui._btn('⭐ Watch ' + report.creator);
          wb.onclick = function() {
            wb.disabled = true;
            self.logic.watchCreator(report).then(function(r) {
              wb.textContent = r === 'already' ? '✓ Already watching' : '✓ Watching';
            }).catch(function(e) {
              wb.disabled = false;
              RPGACE.utils.toast('Couldn\'t add to watchlist: ' + e.message, '#CC4A4A', 4000, 'pathways');
            });
          };
          row.insertBefore(wb, jb);
        }
      });
    },

    // RI-7: "Suggested quests" for an analysed input - realm icon, XP (as
    // it will pay) and one "+ Add" per quest. Returns null when none.
    questList: function(report) {
      var self = RPGACE.modules.pathways, L = self.logic, X = RPGACE.modules.xpSeason;
      var qs = L.questsFromReport(report);
      if (!qs.length) return null;
      var box = document.createElement('div');
      box.className = 'pw-quests';
      box.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--border);';
      var h = document.createElement('div');
      h.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;';
      h.textContent = 'Suggested quests';
      box.appendChild(h);
      qs.forEach(function(q, i) {
        var realm = L.questRealm(report, q), meta = X && X.REALMS[realm];
        var r = document.createElement('div');
        r.className = 'pw-quest'; r.dataset.realm = realm;
        r.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--border);';
        var t = document.createElement('div');
        t.style.cssText = 'flex:1;min-width:180px;font-size:14px;color:var(--text);line-height:1.4;';
        t.textContent = (meta ? meta.icon + ' ' : '') + q.name + (q.action ? ' - ' + q.action : '');
        var xp = document.createElement('span');
        xp.style.cssText = 'font-size:13px;color:var(--muted);';
        xp.textContent = '+' + L.questXp(q.xp) + ' ' + (meta ? meta.name : '') + ' XP';
        var add = self.ui._btn('+ Add');
        add.className = 'pw-quest-add';
        add.style.minHeight = '44px';
        add.onclick = function() {
          add.disabled = true;
          L.addQuest(report, i).then(function() {
            add.textContent = '✓ Added';
            RPGACE.utils.toast('➕ Task kept: ' + q.name, 'var(--gold)', 2500, 'pathways');
          }).catch(function(e) {
            add.disabled = false;
            RPGACE.utils.toast('Couldn\'t keep the task: ' + e.message, '#CC4A4A', 4000, 'pathways');
          });
        };
        r.appendChild(t); r.appendChild(xp); r.appendChild(add);
        box.appendChild(r);
      });
      return box;
    },

    // VW-4 (Oct 20 2026): one quest idea at a time for a realm, 🎲 steps to
    // the next of its 3 (no AI call), + Add creates the one showing. The
    // index is the quest's place in insights.quests, so addQuest/questCand
    // (dedupe on source_ref) stay the one write path.
    questCard: function(report, realm) {
      var self = RPGACE.modules.pathways, L = self.logic, X = RPGACE.modules.xpSeason;
      var idx = L.questIndexes(report, realm);
      if (!idx.length) return null;
      var qs = L.questsFromReport(report), meta = X && X.REALMS[realm], pos = 0, added = {};
      var r = document.createElement('div');
      r.className = 'pw-quest pw-quest-card'; r.dataset.realm = realm;
      r.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;margin-top:8px;border:1px solid var(--border);border-radius:8px;';
      var t = document.createElement('div');
      t.className = 'pw-quest-text';
      t.style.cssText = 'flex:1;min-width:180px;font-size:14px;color:var(--text);line-height:1.4;';
      var roll = self.ui._btn('🎲');
      roll.className = 'pw-quest-roll'; roll.title = 'Another idea';
      roll.style.minHeight = '44px'; roll.style.minWidth = '44px';
      var add = self.ui._btn('+ Add');
      add.className = 'pw-quest-add'; add.style.minHeight = '44px';
      function show() {
        var i = idx[pos], q = qs[i];
        t.textContent = '⚔️ ' + q.name + (q.action ? ' - ' + q.action : '') + '  (+' + L.questXp(q.xp) + (meta ? ' ' + meta.name : '') + ' XP' + (idx.length > 1 ? ', ' + (pos + 1) + '/' + idx.length : '') + ')';
        add.textContent = added[i] ? '✓ Added' : '+ Add';
        add.disabled = !!added[i];
      }
      roll.onclick = function() { pos = (pos + 1) % idx.length; show(); };
      roll.style.display = idx.length > 1 ? '' : 'none';
      add.onclick = function() {
        var i = idx[pos];
        add.disabled = true;
        L.addQuest(report, i).then(function() {
          added[i] = true; show();
          RPGACE.utils.toast('➕ Task kept: ' + qs[i].name, 'var(--gold)', 2500, 'pathways');
        }).catch(function(e) {
          add.disabled = false;
          RPGACE.utils.toast('Couldn\'t keep the task: ' + e.message, '#CC4A4A', 4000, 'pathways');
        });
      };
      r.appendChild(t); r.appendChild(roll); r.appendChild(add);
      show();
      return r;
    },

    // VW-4: a report's realm sections (insights.realm_sections, written by
    // local_server/rpgace_intel.py since VW-2) - score + why, what it
    // teaches, key points with their quote and a time that opens the video
    // there, Try this, the realm's quest card, then How it's made. Shared by
    // Videoworm (videoSummary) and Encyclopedia posts (articleActions).
    realmSections: function(report) {
      var self = RPGACE.modules.pathways, L = self.logic, X = RPGACE.modules.xpSeason;
      var ins = (report && report.insights) || {}, secs = ins.realm_sections;
      if (!secs || typeof secs !== 'object') return null;
      var wrap = document.createElement('div');
      wrap.className = 'pw-realm-sections';
      function el(tag, css, text, cls) {
        var e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (text != null) e.textContent = text;
        if (cls) e.className = cls;
        return e;
      }
      function pointRow(p) {
        var row = el('div', 'padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;line-height:1.5;color:var(--text);', null, 'pw-point');
        row.appendChild(el('span', '', '• ' + p.text));
        (p.also || []).forEach(function(k) {
          var m = X && X.REALMS[k];
          row.appendChild(el('span', 'margin-left:6px;font-size:12px;color:var(--muted);', '(also ' + (m ? m.icon + ' ' + m.name : k) + ')'));
        });
        if (p.quote || p.at) {
          var q = el('div', 'font-size:13px;color:var(--muted);font-style:italic;margin-top:2px;');
          if (p.quote) q.appendChild(el('span', '', '"' + p.quote + '" '));
          // SA-1: a page/text point carries a paragraph mark (¶3), not a time.
          var isTime = /^\d/.test(String(p.at || ''));
          if (p.at && report.url && (isTime || /^https?:/i.test(report.url))) {
            var a = el('a', 'font-style:normal;color:var(--gold);text-decoration:none;display:inline-block;min-height:32px;line-height:32px;padding:0 6px;', (isTime ? '▶ ' : '') + p.at, 'pw-point-time');
            a.href = isTime ? L.timeUrl(report.url, p.at) : report.url; a.target = '_blank'; a.rel = 'noopener';
            q.appendChild(a);
          } else if (p.at) q.appendChild(el('span', 'font-style:normal;color:var(--gold);padding:0 6px;', p.at));
          row.appendChild(q);
        }
        return row;
      }
      var order = (ins.realms || []).filter(function(k) { return secs[k]; });
      Object.keys(secs).forEach(function(k) { if (order.indexOf(k) === -1) order.push(k); });
      order.forEach(function(k) {
        var s = secs[k] || {}, m = X && X.REALMS[k];
        var box = el('div', 'margin-top:12px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;', null, 'pw-realm');
        box.dataset.realm = k;
        box.appendChild(el('div', 'font-size:15px;font-weight:700;color:var(--gold);', (m ? m.icon + ' ' + m.name : k) + ' · ' + (s.score || '?') + '/10'));
        if (s.why) box.appendChild(el('div', 'font-size:13px;color:var(--muted);margin-bottom:6px;', s.why));
        if (s.teaches) box.appendChild(el('div', 'font-size:14px;color:var(--text);line-height:1.5;margin-bottom:4px;', s.teaches, 'pw-teaches'));
        (s.points || []).forEach(function(p) { box.appendChild(pointRow(p)); });
        if (s.dropped) box.appendChild(el('div', 'font-size:12px;color:var(--muted);margin-top:4px;', s.dropped + ' more thrown out: their quote isn\'t in the video'));
        if (s.action) box.appendChild(el('div', 'font-size:14px;color:var(--text);margin-top:8px;', '▶ Try this: ' + s.action, 'pw-try'));
        var qc = self.ui.questCard(report, k);
        if (qc) box.appendChild(qc);
        wrap.appendChild(box);
      });
      var made = ins.how_made;
      if (made && ((made.points || []).length || made.summary)) {
        var mb = el('div', 'margin-top:12px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;', null, 'pw-made');
        mb.appendChild(el('div', 'font-size:15px;font-weight:700;color:var(--gold);', '🎬 How it\'s made'));
        if (made.summary) mb.appendChild(el('div', 'font-size:14px;color:var(--text);line-height:1.5;margin:4px 0;', made.summary));
        (made.points || []).forEach(function(p) { mb.appendChild(pointRow(p)); });
        (made.steal || []).forEach(function(x) { mb.appendChild(el('div', 'font-size:14px;color:var(--text);padding-top:4px;', '→ Reuse: ' + x)); });
        (made.avoid || []).forEach(function(x) { mb.appendChild(el('div', 'font-size:14px;color:var(--muted);padding-top:4px;', '✗ Don\'t copy: ' + x)); });
        wrap.appendChild(mb);
      }
      return wrap;
    },

    openRelatedJargon: function(entry) {
      var self = RPGACE.modules.pathways;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: 'Related jargon', title: entry.title || 'Post' });
      pop.box.innerHTML = '<p style="color:var(--muted)">Looking for jargon in this article…</p>';
      self.logic.loadJargon().then(function(terms) {
        var hits = self.logic.matchJargon(entry.content || '', terms);
        pop.box.innerHTML = '';
        if (!hits.length) { pop.box.innerHTML = '<p style="color:var(--muted)">No Jargon Encyclopedia terms appear in this article yet.</p>'; return; }
        hits.forEach(function(t) {
          var d = document.createElement('div');
          d.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);';
          var h = document.createElement('div');
          h.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);';
          h.textContent = t.term + (t.status === 'pending' ? ' · pending review' : '');
          var p = document.createElement('div');
          p.style.cssText = 'font-size:14px;line-height:1.5;color:var(--muted);margin-top:4px;';
          p.textContent = t.explainer || '';
          d.appendChild(h); d.appendChild(p);
          pop.box.appendChild(d);
        });
      });
    },

    // Shopping list popup -> Wishlist (non-food items).
    wishlistLink: function(pop) {
      var self = RPGACE.modules.pathways;
      var sw = RPGACE.modules.shoppingWishlist;
      if (!pop || !pop.box || !sw || !sw.logic || !sw.logic._addItem) return;
      var wrap = document.createElement('div');
      wrap.className = 'pw-wish-wrap';
      wrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid var(--border);';
      var open = self.ui._btn('🛒 Add a non-food item to your Wishlist');
      open.style.width = '100%';
      wrap.appendChild(open);
      open.onclick = function() {
        open.style.display = 'none';
        var form = document.createElement('div');
        form.style.cssText = 'display:grid;grid-template-columns:1fr 110px;gap:8px;';
        var name = document.createElement('input');
        name.id = 'pw-wish-name'; name.placeholder = 'Item, e.g. kitchen roll'; name.setAttribute('aria-label', 'Item name');
        var price = document.createElement('input');
        price.id = 'pw-wish-price'; price.type = 'number'; price.step = '0.01'; price.min = '0'; price.placeholder = '£ price'; price.setAttribute('aria-label', 'Estimated price');
        [name, price].forEach(function(i) { i.style.cssText = 'min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-size:14px;'; });
        var add = self.ui._btn('Add to Wishlist');
        add.style.gridColumn = '1 / -1';
        add.onclick = function() {
          var n = name.value.trim();
          if (!n) { name.focus(); return; }
          add.disabled = true;
          sw.logic._addItem({ name: n, category: 'household', priority: 'medium', estimated_price: price.value ? Number(price.value) : null }, function(err) {
            add.disabled = false;
            if (err) { RPGACE.utils.toast('Couldn\'t add: ' + err, '#CC4A4A', 4000, 'pathways'); return; }
            RPGACE.utils.toast('🛒 ' + n + ' added to your Wishlist', 'var(--gold)', 2500, 'pathways');
            name.value = ''; price.value = '';
          });
        };
        form.appendChild(name); form.appendChild(price); form.appendChild(add);
        wrap.appendChild(form);
        name.focus();
      };
      var popBox = pop.box.parentNode;
      popBox.insertBefore(wrap, pop.box.nextSibling);
    },
  },

  // Public pass-throughs (G53 convention).
  makeQuests: function(e, r) { return this.logic.makeQuests(e, r); },
  watchCreator: function(r) { return this.logic.watchCreator(r); },
  matchJargon: function(t, j) { return this.logic.matchJargon(t, j); },
  loadBeats: function() { return this.logic.loadBeats(); },
  beatContext: function(p, b) { return this.logic.beatContext(p, b); },
  articleActions: function(c, e) { return this.ui.articleActions(c, e); },
  wishlistLink: function(p) { return this.ui.wishlistLink(p); },
});
/* ===END:pathways=== */
