
/* ===MODULE:beatsHub=== */
// Oct 16 2026 — BT-0 of the ratified plan "Beats (Producer)"
// (records/2026-10/beats_producer_ceo_plan_2026-10-16.txt). The Beats home
// page: one "what's next" line, then the journey Alex chose -
// Idea -> Make -> Mix -> Log (= finished) -> Release -> Sell - with live
// counts. It owns no data: ideas are conid_pot, beats are content_productions
// (content_type music_video), sessions are Doing Now rows with the Producer
// realm, sales are chronicles_finance. Every button opens the owning
// module's own screen. RPGACE.AREAS.beats.hub points here, so 🏠 on any Beats
// screen lands on this page; screens opened from here are recorded in
// RPGACE.areaNav so ← Back returns to them. Layout reuses knowledgeHub's CSS.
RPGACE.register('beatsHub', {
  domain: 'content',

  init: function() {
    var self = RPGACE.modules.beatsHub;
    RPGACE.AREAS.beats.hub = function() { self.open(); };
    RPGACE.hooks.on('page:show', function(name) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P) return;
      if (name === P.beats) {
        self.ui.injectPage();
        RPGACE.areaNav.visit('beats', { key: 'hub', label: 'Beats', open: function() { self.open(); } });
        self.ui.render();
        return;
      }
      var e = self.logic.screenFor(name);
      if (!e) return;
      RPGACE.areaNav.visit('beats', e);
      setTimeout(function() { self.ui.decoratePage(name); }, 40);
      // BT-3: Beat Log's "from a beat in progress" list stays current.
      if (name === P.beatLogPage && RPGACE.modules.beatLog && RPGACE.modules.beatLog.ui._refreshFinish) RPGACE.modules.beatLog.ui._refreshFinish();
    });
    [0, 1700].forEach(function(ms) { setTimeout(function() { self.ui.injectPage(); }, ms); });
    // BT-2: a making session just stopped -> "Ready to mix?".
    RPGACE.hooks.on('doingnow:finished', function(entry) {
      var d = entry && entry.details;
      self.logic._times = null;
      if (d && d.kind === 'beat' && d.stage === 'make' && d.link && d.link.kind === 'conid_pot' && !d.ready_to_mix) self.ui.askReadyToMix(entry);
    });
  },

  open: function() {
    this.ui.injectPage();
    if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.beats);
  },

  // ============================================================
  // logic — reads and the "what's next" decision. No DOM.
  // ============================================================
  logic: {
    VIA_MS: 5000,
    // The Back-stack entry for a Beats screen slug (null if not one).
    // MusicWorm (reference tracks) is a Knowledge page; it only counts as
    // a Beats screen when it was opened from here (areaNav._via).
    screenFor: function(slug) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages, dd = RPGACE.modules.dashDeck;
      if (!P || !slug) return null;
      var page = function(p) { return function() { dd._openPage(p); }; };
      var M = {};
      // PC-1: Idea Bank opened from Posting belongs to Posting (areaNav._via).
      var vi = RPGACE.areaNav._via;
      if (!(slug === P.ideaBank && vi && vi.slug === slug && vi.area === 'posting' && Date.now() - vi.at < this.VIA_MS)) M[P.ideaBank] = ['ideas', 'Idea Bank', page('cp-idea-bank')];
      M[P.beatLogPage] = ['beatlog', 'Beat Log', page('beat-log-panel')];
      M[P.contentPipeline] = ['beats', 'My beats', page('cpl-widget')];
      var v = RPGACE.areaNav._via;
      if (slug === P.musicworm && v && v.slug === slug && v.area === 'beats' && Date.now() - v.at < this.VIA_MS) M[P.musicworm] = ['refs', 'Reference tracks', page('ref-corpus-panel')];
      var m = M[slug];
      return m ? { key: m[0], label: m[1], open: m[2] } : null;
    },
    load: function() {
      var safe = function(p, dflt) { return Promise.resolve(p).catch(function() { return dflt; }); };
      var since = new Date(Date.now() - 7 * 864e5).toISOString();
      return Promise.all([
        safe(RPGACE.sb.select('conid_pot', 'select=id,title,idea_text,status,created_at&status=in.(potential,making)&kind=neq.post&order=created_at.desc&limit=100'), []),
        safe(RPGACE.sb.select('content_productions', 'select=id,con_id,title,status,finished_at,released_at,release_url,release_links,licence_type,licence_tiers,price,created_at&content_type=eq.music_video&order=created_at.desc&limit=300'), []),
        safe(RPGACE.sb.select('rpgace_agendas', 'select=id,title,started_at,completed,actual_mins,realms&source_type=eq.doing_now&realms=cs.{producer}&order=started_at.desc&limit=200'), []),
        safe(RPGACE.sb.select('chronicles_finance', 'select=amount,content_production_id&type=eq.sale&limit=1000'), []),
        safe(RPGACE.modules.beatsHub.logic.loadTimes(), {})
      ]).then(function(r) {
        var arr = function(x) { return Array.isArray(x) ? x : []; };
        return RPGACE.modules.beatsHub.logic.model(arr(r[0]), arr(r[1]), arr(r[2]), arr(r[3]), Date.now(), since, r[4] || {});
      });
    },
    // Pure: everything the page shows, from already-read rows.
    model: function(ideas, beats, sessions, sales, now, since, times) {
      var prog = RPGACE.modules.beatsHub.logic.inProgress(ideas, times || {});
      var making = ideas.filter(function(i) { return i.status === 'making'; });
      ideas = ideas.filter(function(i) { return i.status !== 'making'; });
      var week = sessions.filter(function(x) { return x.started_at && x.started_at >= since; });
      var running = sessions.filter(function(x) { return !x.completed && x.started_at; });
      var released = beats.filter(function(b) { return !!b.released_at; });
      var m = {
        ideas: ideas.length, newestIdea: ideas[0] || null, making: making.length,
        inProgress: prog.list, toMix: prog.toMix,
        sessions: week.length,
        mins: week.reduce(function(a, x) { return a + (Number(x.actual_mins) || 0); }, 0),
        running: running[0] || null,
        logged: beats.length,
        toRelease: beats.filter(function(b) { return !b.released_at; }).length,
        released: released.length,
        notListed: released.filter(function(b) { return !RPGACE.modules.beatsHub.logic.linksOf(b).some(function(l) { return l.place === 'Beatstars'; }); }).length,
        unreleased: beats.filter(function(b) { return !b.released_at; }),
        priced: beats.filter(function(b) { return RPGACE.modules.beatsHub.logic.tiersOf(b).some(function(t) { return Number(t.price) > 0; }); }).length,
        bySales: RPGACE.modules.beatsHub.logic.salesBy(sales),
        topSellers: (function() {
          var by = RPGACE.modules.beatsHub.logic.salesBy(sales);
          return beats.filter(function(b) { return by[b.id]; }).sort(function(a, b) { return by[b.id].total - by[a.id].total; }).slice(0, 4)
            .map(function(b) { return { idea: { title: b.title }, t: {}, sold: by[b.id] }; });
        })(),
        sales: sales.length,
        salesTotal: sales.reduce(function(a, x) { return a + (Number(x.amount) || 0); }, 0)
      };
      m.next = RPGACE.modules.beatsHub.logic.nextList(m);
      return m;
    },
    // Order: what's in your hands now, then finishing work, then new work.
    nextList: function(m) {
      var out = [], s = function(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
      if (m.running) out.push({ key: 'myday', icon: '▶', text: 'Running now: ' + m.running.title });
      if (m.toMix && m.toMix.length) out.push({ key: 'mix', icon: '🎚', text: s(m.toMix.length, 'beat') + ' ready to mix' });
      if (m.toRelease) out.push({ key: 'release', icon: '🚀', text: s(m.toRelease, 'beat') + ' logged, not released yet' });
      if (m.notListed) out.push({ key: 'beats', icon: '💰', text: s(m.notListed, 'released beat') + ' not on Beatstars yet' });
      if (m.newestIdea) out.push({ key: 'make', icon: '💡', text: 'Newest idea: ' + String(m.newestIdea.title || m.newestIdea.idea_text || 'idea').slice(0, 70) });
      return out;
    },
    // BT-1: an idea becomes a Producer Doing Now session linked to it; the
    // idea is marked 'making' (BT-3 marks it done when the beat is logged).
    startMaking: function(idea) { return RPGACE.modules.beatsHub.logic.startSession(idea, 'make'); },
    // BT-2: a making or mixing session on one idea (details.kind 'beat',
    // details.stage 'make' | 'mix', details.link -> conid_pot).
    STAGE_WORD: { make: 'Making', mix: 'Mixing' },
    beatDetails: function(idea, stage) {
      var title = String(idea.title || idea.idea_text || 'idea').slice(0, 80);
      return { kind: 'beat', stage: stage === 'mix' ? 'mix' : 'make', link: { kind: 'conid_pot', id: idea.id, label: title, title: title } };
    },
    startSession: function(idea, stage) {
      var dn = RPGACE.modules.doingNow, L = RPGACE.modules.beatsHub.logic;
      if (!dn || !idea) return Promise.reject(new Error('Live now is not loaded'));
      var d = L.beatDetails(idea, stage);
      var e = dn.logic.start(L.STAGE_WORD[d.stage] + ': ' + d.link.title, ['producer']);
      e.details = Object.assign({}, e.details || {}, d);
      L._times = null;
      return dn.logic.patch(e.id, { details: e.details }).then(function() {
        if (idea.status === 'making') return null;
        return RPGACE.sb.secureWrite('conid_pot', 'update', { status: 'making' }, 'id=eq.' + idea.id);
      }).then(function() { return e; });
    },
    // Pure: making / mixing minutes per idea id from Doing Now rows linked to
    // a conid_pot idea. A running session counts its minutes so far. A row
    // without a stage counts as making.
    times: function(rows, now) {
      var out = {};
      (rows || []).forEach(function(x) {
        var d = x && x.details, l = d && d.link;
        if (!l || l.kind !== 'conid_pot' || !l.id) return;
        var t = out[l.id] || (out[l.id] = { make: 0, mix: 0, mixN: 0, ready: false, running: null });
        var mins = x.completed ? (Number(x.actual_mins) || 0)
          : (x.started_at ? Math.max(0, Math.round(((now || Date.now()) - new Date(x.started_at).getTime()) / 60000)) : 0);
        if (d.stage === 'mix') { t.mix += mins; t.mixN++; } else t.make += mins;
        if (d.ready_to_mix) t.ready = true;
        if (!x.completed && x.started_at) t.running = d.stage === 'mix' ? 'mix' : 'make';
      });
      return out;
    },
    // Server rows plus this device's own (a just-started session may not have
    // synced yet). Cached for a few seconds so a list of cards reads once.
    loadTimes: function() {
      var L = RPGACE.modules.beatsHub.logic, dn = RPGACE.modules.doingNow;
      if (L._times && Date.now() - L._times.at < 4000) return L._times.p;
      var p = Promise.resolve(RPGACE.sb.select('rpgace_agendas', 'select=id,started_at,completed,actual_mins,details&source_type=eq.doing_now&details->link->>kind=eq.conid_pot&order=started_at.desc&limit=500'))
        .catch(function() { return []; })
        .then(function(rows) {
          rows = Array.isArray(rows) ? rows : [];
          var ids = {}; rows.forEach(function(r) { ids[r.id] = 1; });
          var local = dn ? dn.logic.all().filter(function(x) { return x && x.source_type === dn.SOURCE && !ids[x.id]; }) : [];
          return L.times(rows.concat(local), Date.now());
        });
      L._times = { at: Date.now(), p: p };
      return p;
    },
    // "2h 40m making · 35m mixing" (empty when no time yet).
    timeLine: function(t) {
      var L = RPGACE.modules.beatsHub.logic, parts = [];
      if (t && t.make) parts.push(L.fmtMins(t.make) + ' making');
      if (t && t.mix) parts.push(L.fmtMins(t.mix) + ' mixing');
      return parts.join(' · ');
    },
    // Ideas being made, each with its time; ready-to-mix ones listed separately.
    inProgress: function(ideas, times) {
      var list = (ideas || []).filter(function(i) { return i.status === 'making'; }).map(function(i) {
        return { idea: i, t: times[i.id] || { make: 0, mix: 0, mixN: 0, ready: false, running: null } };
      });
      return { list: list, toMix: list.filter(function(x) { return x.t.ready && !x.t.mixN; }) };
    },
    // BT-5: release = put out anywhere, one or more links (a Beatstars link
    // is the listing). Links can be added later; only the first release
    // sets released_at (the trigger pays beat_released once).
    // PC-4 (Oct 17 2026): DistroKid added (Alex will post through it too).
    PLACES: ['YouTube', 'Beatstars', 'SoundCloud', 'Spotify', 'Instagram', 'TikTok', 'DistroKid', 'Other'],
    placeOf: function(url) {
      var u = String(url || '').toLowerCase();
      if (/youtu\.?be/.test(u)) return 'YouTube';
      if (/beatstars/.test(u)) return 'Beatstars';
      if (/soundcloud/.test(u)) return 'SoundCloud';
      if (/spotify/.test(u)) return 'Spotify';
      if (/instagram/.test(u)) return 'Instagram';
      if (/tiktok/.test(u)) return 'TikTok';
      if (/distrokid|hyperfollow/.test(u)) return 'DistroKid';
      return 'Other';
    },
    // Pure: the beat's links (release_links, plus an old single release_url).
    linksOf: function(row) {
      var out = [], seen = {};
      (Array.isArray(row && row.release_links) ? row.release_links : []).forEach(function(l) {
        if (l && l.url && !seen[l.url]) { seen[l.url] = 1; out.push(l); }
      });
      if (row && row.release_url && /^https?:\/\//.test(row.release_url) && !seen[row.release_url]) out.push({ place: RPGACE.modules.beatsHub.logic.placeOf(row.release_url), url: row.release_url });
      return out;
    },
    // Pure: the update for adding links (null + reason when nothing valid).
    releaseUpdate: function(row, add, now) {
      var L = RPGACE.modules.beatsHub.logic, have = L.linksOf(row), seen = {}, bad = [];
      have.forEach(function(l) { seen[l.url] = 1; });
      var fresh = [];
      (add || []).forEach(function(a) {
        var url = String(a.url || '').trim();
        if (!url) return;
        if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(url)) { bad.push(url); return; }
        if (seen[url]) return;
        seen[url] = 1;
        fresh.push({ place: L.PLACES.indexOf(a.place) > -1 ? a.place : L.placeOf(url), url: url, added_at: new Date(now || Date.now()).toISOString() });
      });
      if (bad.length) return { error: 'Not a full link: ' + bad.join(', ') };
      if (!fresh.length && row.released_at) return { error: 'Add at least one new link' };
      var all = have.concat(fresh);
      var upd = { release_links: all };
      if (!row.released_at) upd.released_at = new Date(now || Date.now()).toISOString();
      var bs = all.filter(function(l) { return l.place === 'Beatstars'; })[0];
      if (all.length) upd.release_url = (bs || all[0]).url;
      return { update: upd, added: fresh.length, first: !row.released_at };
    },
    // BT-8: selling. Tiers = [{name, price}] per beat (licence_tiers); a new
    // beat starts from the last beat's tiers. A sale is a chronicles_finance
    // 'sale' row linked to the beat (content_production_id) - the existing
    // trigger pays Hustler XP (2 per £1, at least 100).
    TIER_NAMES: ['Basic', 'Premium', 'Exclusive'],
    SALE_PLACES: ['Beatstars', 'Direct', 'Other'],
    tiersOf: function(row) {
      if (row && Array.isArray(row.licence_tiers) && row.licence_tiers.length) return row.licence_tiers;
      if (row && row.licence_type && Number(row.price) > 0) return [{ name: row.licence_type, price: Number(row.price) }];
      return [];
    },
    // Pure: trimmed names, prices >= 0 (or null), no repeats, max 8.
    cleanTiers: function(list) {
      var seen = {}, out = [];
      (list || []).forEach(function(t) {
        var n = String(t && t.name || '').trim().slice(0, 40), k = n.toLowerCase();
        if (!n || seen[k] || out.length >= 8) return;
        seen[k] = 1;
        var pr = t.price === '' || t.price == null ? null : Math.round(Number(t.price) * 100) / 100;
        out.push({ name: n, price: pr != null && pr >= 0 && isFinite(pr) ? pr : null });
      });
      return out;
    },
    // SH-4 (Oct 17 2026): standard licence prices (xp_settings.licence_defaults),
    // pre-filled on every beat; UK starting prices until Alex saves his own.
    UK_DEFAULTS: [{ name: 'MP3 lease', price: 30 }, { name: 'WAV lease', price: 50 }, { name: 'Trackout (stems)', price: 100 }, { name: 'Exclusive', price: 500 }],
    loadStandard: function() {
      var L = RPGACE.modules.beatsHub.logic, tp = RPGACE.modules.tripPlans;
      var fall = function() { return L.UK_DEFAULTS.map(function(x) { return { name: x.name, price: x.price }; }); };
      if (!tp) return Promise.resolve(fall());
      return tp.logic.read('xp_settings', 'select=licence_defaults&id=eq.1').then(function(r) {
        var t = r && r[0] && Array.isArray(r[0].licence_defaults) ? L.cleanTiers(r[0].licence_defaults) : [];
        return t.length ? t : fall();
      }, fall);
    },
    saveStandard: function(tiers) {
      var t = RPGACE.modules.beatsHub.logic.cleanTiers(tiers);
      if (!t.length) return Promise.reject(new Error('Add at least one licence'));
      return RPGACE.sb.secureWrite('xp_settings', 'update', { licence_defaults: t, updated_at: new Date().toISOString() }, 'id=eq.1').then(function() { return t; });
    },
    defaultTiers: function() { return RPGACE.modules.beatsHub.logic.loadStandard(); },
    saveTiers: function(row, tiers) {
      var L = RPGACE.modules.beatsHub.logic, t = L.cleanTiers(tiers);
      if (!t.length) return Promise.reject(new Error('Add at least one tier'));
      var priced = t.filter(function(x) { return x.price != null; }).map(function(x) { return x.price; });
      var upd = { licence_tiers: t, price: priced.length ? Math.min.apply(null, priced) : null, updated_at: new Date().toISOString() };
      return RPGACE.sb.secureWrite('content_productions', 'update', upd, 'id=eq.' + row.id).then(function() {
        try { RPGACE.cache.clear('content_productions'); } catch (e) {}
        Object.assign(row, upd);
        return t;
      });
    },
    // SH-5 (Oct 17 2026): what kind of income a sale is (chronicles_finance.income_kind).
    INCOME_KINDS: { lease: 'Lease', exclusive: 'Exclusive', placement: 'Placement', collab: 'Collab', royalties: 'Royalties', other: 'Other' },
    // Pure: a kind from a tier / item text (old rows have no income_kind).
    incomeKindOf: function(text) {
      var t = String(text || '').toLowerCase();
      if (!t) return 'other';
      if (/exclusive/.test(t)) return 'exclusive';
      if (/placement/.test(t)) return 'placement';
      if (/collab/.test(t)) return 'collab';
      if (/royalt/.test(t)) return 'royalties';
      if (/lease|mp3|wav|trackout|stems|basic|premium|unlimited|beat pack/.test(t)) return 'lease';
      return 'other';
    },
    // Pure: the chronicles_finance row for a sale (null + reason if not valid).
    saleRow: function(row, f, today) {
      var L = RPGACE.modules.beatsHub.logic;
      var amt = Math.round(Number(f.amount) * 100) / 100;
      if (!(amt > 0)) return { error: 'Add the amount you were paid' };
      var bits = [f.place, f.buyer ? 'buyer: ' + String(f.buyer).trim().slice(0, 60) : ''].filter(Boolean);
      var kind = L.INCOME_KINDS[f.kind] ? f.kind : (f.tier ? L.incomeKindOf(f.tier) : 'other');
      return { row: {
        type: 'sale', entry_date: f.date || today, category: 'Beats', amount: amt,
        item: (f.item ? String(f.item).trim() : 'Beat sale: ' + (row.title || 'beat') + (f.tier ? ' — ' + f.tier : '')).slice(0, 120),
        notes: bits.join(' · ') || null, content_production_id: row.id || null, income_kind: kind
      } };
    },
    logSale: function(row, f) {
      var dn = RPGACE.modules.doingNow, today = dn ? dn.logic.iso() : new Date().toISOString().slice(0, 10);
      var r = RPGACE.modules.beatsHub.logic.saleRow(row, f, today);
      if (r.error) return Promise.reject(new Error(r.error));
      return RPGACE.sb.secureWrite('chronicles_finance', 'insert', r.row).then(function(d) {
        try { RPGACE.cache.clear('chronicles_finance'); } catch (e) {}
        // SH-3: the saved row (with its id) when the database sends it back.
        return Object.assign({}, r.row, Array.isArray(d) && d[0] ? d[0] : {});
      });
    },
    // Pure: {beatId: {n, total}} from sale rows.
    salesBy: function(sales) {
      var out = {};
      (sales || []).forEach(function(x) {
        if (!x || !x.content_production_id) return;
        var o = out[x.content_production_id] || (out[x.content_production_id] = { n: 0, total: 0 });
        o.n++; o.total = Math.round((o.total + (Number(x.amount) || 0)) * 100) / 100;
      });
      return out;
    },
    release: function(row, add) {
      var r = RPGACE.modules.beatsHub.logic.releaseUpdate(row, add, Date.now());
      if (r.error) return Promise.reject(new Error(r.error));
      r.update.updated_at = new Date().toISOString();
      return RPGACE.sb.secureWrite('content_productions', 'update', r.update, 'id=eq.' + row.id).then(function() {
        try { RPGACE.cache.clear('content_productions'); } catch (e) {}
        Object.assign(row, r.update);
        return r;
      });
    },
    fmtMins: function(n) {
      n = Math.round(n || 0);
      return n < 60 ? n + ' min' : Math.floor(n / 60) + 'h' + (n % 60 ? ' ' + (n % 60) + 'm' : '');
    }
  },

  // ============================================================
  // ui — the page, its styles, and where each button goes.
  // ============================================================
  ui: {
    // knowledgeHub's layout in the Content colour (one stylesheet, rule 8);
    // 6 steps sit 3 to a row on wide screens.
    css: function() {
      var kh = RPGACE.modules.knowledgeHub;
      var base = kh ? kh.ui.CSS.replace(/kh-/g, 'bh-').replace(/--blue/g, '--purple') : '';
      return base + '@media (min-width:760px){.bh-steps{grid-template-columns:repeat(3,1fr)}.bh-arrow{display:none}}';
    },

    injectPage: function() {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || document.getElementById('page-' + P.beats)) return;
      var app = document.getElementById('app');
      if (!app) return;
      if (!document.getElementById('bh-css')) {
        var st = document.createElement('style'); st.id = 'bh-css'; st.textContent = this.css();
        document.head.appendChild(st);
      }
      var page = document.createElement('div');
      page.className = 'page';
      page.id = 'page-' + P.beats;
      page.innerHTML = '<div class="section-title">🥁 Beats</div>' +
        '<div id="bh-bar"></div><div id="bh-next"></div><div id="bh-steps" class="bh-steps"></div>';
      app.appendChild(page);
    },

    // The old "← Content Pipeline" button gives way to ← Back / 🏠 Beats.
    // area defaults to 'beats'; Posting reuses this for the Idea Bank.
    decoratePage: function(slug, area) {
      var pg = document.getElementById('page-' + slug);
      if (!pg) return;
      pg.querySelectorAll(':scope > .area-bar').forEach(function(n) { n.remove(); });
      pg.querySelectorAll(':scope > button.learn-btn').forEach(function(b) { b.hidden = true; });
      var bar = RPGACE.areaNav.bar(area || 'beats');
      var title = pg.querySelector(':scope > .section-title');
      if (title) pg.insertBefore(bar, title.nextSibling); else pg.insertBefore(bar, pg.firstChild);
    },

    // Every destination, recorded for ← Back before it opens.
    go: function(key) {
      var dd = RPGACE.modules.dashDeck, P = RPGACE.CONFIG.pages;
      var T = {
        ideas:   ['Idea Bank', function() { dd._openPage('cp-idea-bank'); }],
        beatlog: ['Beat Log', function() { dd._openPage('beat-log-panel'); }],
        beats:   ['My beats', function() { dd._openPage('cpl-widget'); }],
        refs:    ['Reference tracks', function() { RPGACE.areaNav._via = { slug: P.musicworm, area: 'beats', at: Date.now() }; dd._openPage('ref-corpus-panel'); }],
        start:   ['Beats', function() { var dn = RPGACE.modules.doingNow; if (dn) dn.ui.openStart(); }],
        make:    ['Beats', function() { RPGACE.modules.beatsHub.ui.pickIdea('make'); }],
        // SH-6 (Oct 17 2026): beat ideas from what Alex has been listening to.
        playlist: ['Beats', function() { var pt = RPGACE.modules.producerTools; if (pt) pt.ui.send('Playlist Psychologist'); }],
        mix:     ['Beats', function() { RPGACE.modules.beatsHub.ui.pickIdea('mix'); }],
        log:     ['Beats', function() { RPGACE.modules.beatsHub.ui.pickIdea('log'); }],
        release: ['Beats', function() { RPGACE.modules.beatsHub.ui.pickRelease(); }],
        sell:    ['Beats', function() { RPGACE.modules.beatsHub.ui.pickSell(); }],
        myday:   ['My Day', function() { if (typeof showPage === 'function') showPage('quests'); }]
      };
      var t = T[key];
      if (!t) return;
      // Pop-ups and other areas' pages are not Beats screens: no Back entry.
      if (['start', 'make', 'mix', 'log', 'release', 'sell', 'myday'].indexOf(key) < 0) RPGACE.areaNav.visit('beats', { key: key, label: t[0], open: t[1] });
      t[1]();
    },

    // BT-1/BT-2: pick what to work on. 'make': beats being made (keep
    // making), then new ideas, or start without one. 'mix': beats with making
    // time (ready-to-mix first).
    pickIdea: function(stage) {
      stage = stage === 'mix' || stage === 'log' ? stage : 'make';
      var H = RPGACE.modules.beatsHub, L = H.logic, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '🥁 Beats', title: stage === 'mix' ? '🎚 Start mixing' : stage === 'log' ? '🥁 Log a finished beat' : '▶ Start making', width: '480px' });
      var box = document.createElement('div'); box.id = 'bh-pick'; box.dataset.stage = stage; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      box.textContent = 'Loading ideas…';
      pop.box.appendChild(box);
      Promise.all([
        RPGACE.sb.select('conid_pot', 'select=id,title,idea_text,status,created_at&status=in.(potential,making)&kind=neq.post&order=created_at.desc&limit=60'),
        L.loadTimes()
      ]).then(function(r) {
        box.textContent = '';
        var rows = Array.isArray(r[0]) ? r[0] : [], times = r[1] || {};
        var prog = L.inProgress(rows, times).list;
        var pick;
        if (stage === 'log') {
          pick = prog;
        } else if (stage === 'mix') {
          pick = prog.filter(function(x) { return x.t.make > 0 || x.t.ready; });
          pick.sort(function(a, b) { return (b.t.ready ? 1 : 0) - (a.t.ready ? 1 : 0); });
        } else {
          pick = prog.concat(rows.filter(function(i) { return i.status === 'potential'; }).slice(0, 8).map(function(i) { return { idea: i, t: null }; }));
        }
        var note = document.createElement('div'); note.style.cssText = 'font-size:13px;color:var(--muted);';
        note.textContent = stage === 'log' ? (pick.length ? 'Pick the beat you finished — Beat Log opens with it filled in.' : 'No beats in progress — you can still log one in Beat Log.') : pick.length
          ? (stage === 'mix' ? 'Pick the beat you are mixing — it starts a Producer session on My Day.' : 'Pick the idea you are making — it starts a Producer session on My Day.')
          : (stage === 'mix' ? 'No beats with making time yet — make one first.' : 'No ideas waiting in the Idea Bank.');
        box.appendChild(note);
        pick.forEach(function(x) {
          var i = x.idea, b = document.createElement('button'); b.type = 'button'; b.className = 'bh-morerow bh-pick-idea'; b.dataset.id = i.id;
          var line = x.t ? L.timeLine(x.t) : '';
          b.textContent = (x.t ? (stage === 'mix' ? (x.t.ready ? '🎚  ' : '🎛  ') : '🎛  ') : '💡  ') + String(i.title || i.idea_text || 'idea').slice(0, 70) + (line ? '  ·  ' + line : '');
          b.onclick = function() {
            if (stage === 'log') { pop.close(); H.ui.logIdea(i); return; }
            b.disabled = true;
            L.startSession(i, stage).then(function() {
              pop.close();
              RPGACE.utils.toast('▶ ' + L.STAGE_WORD[stage] + ': ' + String(i.title || '').slice(0, 40), 'var(--gold)', 2200);
              try { RPGACE.modules.doingNow.ui._refresh(); } catch (e) {}
              H.ui.render();
            }, function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ Could not start: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub'); });
          };
          box.appendChild(b);
        });
        if (stage === 'log') {
          var bl = document.createElement('button'); bl.type = 'button'; bl.className = 'bh-btn'; bl.id = 'bh-pick-beatlog';
          bl.textContent = '🥁 Open Beat Log without one';
          bl.onclick = function() { pop.close(); H.ui.go('beatlog'); };
          box.appendChild(bl);
        }
        if (stage === 'make') {
          var free = document.createElement('button'); free.type = 'button'; free.className = 'bh-btn'; free.id = 'bh-pick-free';
          free.textContent = '▶ Start without an idea';
          free.onclick = function() { pop.close(); var dn = RPGACE.modules.doingNow; if (dn) dn.ui.openStart(); };
          box.appendChild(free);
        }
      }, function(e) { box.textContent = '⚠️ Could not load ideas: ' + (e && e.message || e); });
    },

    // BT-3: open Beat Log filled from a beat in progress (recorded for ← Back).
    logIdea: function(idea) {
      var bl = RPGACE.modules.beatLog, dd = RPGACE.modules.dashDeck;
      if (!bl || !bl.ui.logFromIdea) return;
      RPGACE.areaNav.visit('beats', { key: 'beatlog', label: 'Beat Log', open: function() { dd._openPage('beat-log-panel'); } });
      bl.ui.logFromIdea(idea);
    },

    // BT-8: pick a logged beat to sell (released ones first).
    pickSell: function() {
      var H = RPGACE.modules.beatsHub, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '🥁 Beats', title: '💰 Sell a beat', width: '480px' });
      var box = document.createElement('div'); box.id = 'bh-sell-pick'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      box.textContent = 'Loading beats…';
      pop.box.appendChild(box);
      RPGACE.sb.select('content_productions', 'select=*&content_type=eq.music_video&order=created_at.desc&limit=40').then(function(rows) {
        box.textContent = '';
        rows = Array.isArray(rows) ? rows : [];
        rows.sort(function(a, b) { return (b.released_at ? 1 : 0) - (a.released_at ? 1 : 0); });
        if (!rows.length) { box.textContent = 'No logged beats yet.'; return; }
        rows.forEach(function(r) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'bh-morerow bh-sell-beat'; b.dataset.id = r.id;
          b.textContent = (r.released_at ? '🚀  ' : '🥁  ') + (r.con_id ? '#' + r.con_id + ' ' : '') + (r.title || 'beat');
          b.onclick = function() { pop.close(); H.ui.openSell(r, function() { H.ui.render(); }); };
          box.appendChild(b);
        });
      }, function(e) { box.textContent = '⚠️ Could not load beats: ' + (e && e.message || e); });
    },

    // BT-8: the Sell pop-up - licence tiers, Beatstars listing text, Log a
    // sale, and this beat's sales so far.
    openSell: function(row, after) {
      var H = RPGACE.modules.beatsHub, L = H.logic, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '🥁 Beats', title: '💰 Sell: ' + (row.title || 'beat'), width: '560px', scroll: true });
      var box = document.createElement('div'); box.id = 'bh-sell'; box.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      pop.box.appendChild(box);
      var inCss = 'box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;';
      var h = function(t) { var d = document.createElement('div'); d.style.cssText = 'font-size:13px;font-weight:700;color:var(--text);margin-top:4px;'; d.textContent = t; return d; };
      var btn = function(label, id, go) { var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'bh-btn' + (go ? ' bh-go' : ''); b.textContent = label; return b; };
      // sales so far
      var salesBox = document.createElement('div'); salesBox.id = 'bh-sell-sales'; salesBox.style.cssText = 'font-size:13px;color:var(--muted);';
      var loadSales = function() {
        salesBox.textContent = 'Loading sales…';
        RPGACE.sb.select('chronicles_finance', 'select=id,amount,item,entry_date,notes,content_production_id&type=eq.sale&content_production_id=eq.' + row.id + '&order=entry_date.desc').then(function(rs) {
          rs = Array.isArray(rs) ? rs : [];
          var tot = rs.reduce(function(a, x) { return a + (Number(x.amount) || 0); }, 0);
          salesBox.textContent = rs.length ? '💷 ' + rs.length + ' sale' + (rs.length === 1 ? '' : 's') + ' · £' + tot.toFixed(2) + ' — latest: ' + rs.slice(0, 3).map(function(x) { return '£' + Number(x.amount).toFixed(2) + ' ' + (x.entry_date || ''); }).join(', ') : 'No sales logged for this beat yet.';
        }, function(e) { salesBox.textContent = '⚠️ Could not load sales: ' + (e && e.message || e); });
      };
      box.appendChild(salesBox); loadSales();
      // SH-7: the pitches this beat is in (Selling).
      var shm = RPGACE.modules.sellingHub;
      if (shm && row.id) { box.appendChild(h('Deals')); box.appendChild(shm.ui.beatDealsBox(row.id, function() { pop.close(); })); }
      // tiers
      box.appendChild(h('Licence tiers'));
      var tierRows = document.createElement('div'); tierRows.id = 'bh-tiers'; tierRows.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      var addTier = function(t) {
        var r = document.createElement('div'); r.className = 'bh-tier'; r.style.cssText = 'display:flex;gap:6px;align-items:center;';
        var nm = document.createElement('input'); nm.type = 'text'; nm.className = 'bh-tier-name'; nm.maxLength = 40; nm.placeholder = 'Tier name'; nm.value = t.name || ''; nm.style.cssText = inCss + 'flex:1 1 90px;min-width:0;';
        var pr = document.createElement('input'); pr.type = 'number'; pr.className = 'bh-tier-price'; pr.min = '0'; pr.step = '0.01'; pr.inputMode = 'decimal'; pr.placeholder = '£'; pr.value = t.price == null ? '' : t.price; pr.style.cssText = inCss + 'flex:0 0 84px;width:84px;';
        var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'bh-tier-rm'; rm.textContent = '✕'; rm.setAttribute('aria-label', 'Remove tier');
        rm.style.cssText = 'min-height:44px;min-width:44px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--muted);cursor:pointer;';
        rm.onclick = function() { r.remove(); fillTierSel(); };
        nm.oninput = pr.oninput = fillTierSel;
        r.appendChild(nm); r.appendChild(pr); r.appendChild(rm); tierRows.appendChild(r);
      };
      var readTiers = function() { return Array.prototype.map.call(tierRows.querySelectorAll('.bh-tier'), function(r) { return { name: r.querySelector('.bh-tier-name').value, price: r.querySelector('.bh-tier-price').value }; }); };
      box.appendChild(tierRows);
      var tierActs = document.createElement('div'); tierActs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
      var plus = btn('+ tier', 'bh-tier-add'); plus.onclick = function() { addTier({}); };
      var saveT = btn('Save tiers', 'bh-tier-save', true);
      var tierMsg = document.createElement('span'); tierMsg.style.cssText = 'font-size:12px;color:var(--muted);align-self:center;';
      saveT.onclick = function() {
        saveT.disabled = true;
        L.saveTiers(row, readTiers()).then(function(t) {
          saveT.disabled = false; tierMsg.textContent = '✓ Saved ' + t.length + ' tier' + (t.length === 1 ? '' : 's');
          if (after) after();
        }, function(e) { saveT.disabled = false; tierMsg.textContent = '⚠️ ' + (e && e.message || e); });
      };
      var listing = btn('🎧 Beatstars listing text', 'bh-sell-listing');
      listing.onclick = function() { pop.close(); var cpl = RPGACE.modules.contentProductionLive; if (cpl) cpl._generateBeatstarsListing(row); };
      [plus, saveT, listing, tierMsg].forEach(function(n) { tierActs.appendChild(n); });
      box.appendChild(tierActs);
      // log a sale
      box.appendChild(h('💷 Log a sale'));
      var sg = document.createElement('div'); sg.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;';
      var tierSel = document.createElement('select'); tierSel.id = 'bh-sale-tier'; tierSel.style.cssText = inCss;
      var amount = document.createElement('input'); amount.id = 'bh-sale-amount'; amount.type = 'number'; amount.min = '0'; amount.step = '0.01'; amount.inputMode = 'decimal'; amount.placeholder = 'Amount £'; amount.style.cssText = inCss;
      var place = document.createElement('select'); place.id = 'bh-sale-place'; place.style.cssText = inCss;
      L.SALE_PLACES.forEach(function(p) { var o = document.createElement('option'); o.value = p; o.textContent = p; place.appendChild(o); });
      var buyer = document.createElement('input'); buyer.id = 'bh-sale-buyer'; buyer.type = 'text'; buyer.maxLength = 60; buyer.placeholder = 'Buyer (optional)'; buyer.style.cssText = inCss;
      var date = document.createElement('input'); date.id = 'bh-sale-date'; date.type = 'date'; date.value = RPGACE.modules.doingNow ? RPGACE.modules.doingNow.logic.iso() : new Date().toISOString().slice(0, 10); date.style.cssText = inCss;
      [tierSel, amount, place, buyer, date].forEach(function(n) { sg.appendChild(n); });
      box.appendChild(sg);
      var fillTierSel = function() {
        var keep = tierSel.value;
        tierSel.textContent = '';
        var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '— tier —'; tierSel.appendChild(o0);
        L.cleanTiers(readTiers()).forEach(function(t) { var o = document.createElement('option'); o.value = t.name; o.dataset.price = t.price == null ? '' : t.price; o.textContent = t.name + (t.price != null ? ' · £' + t.price : ''); tierSel.appendChild(o); });
        tierSel.value = keep;
      };
      tierSel.onchange = function() { var o = tierSel.options[tierSel.selectedIndex]; if (o && o.dataset.price) amount.value = o.dataset.price; };
      var saleErr = document.createElement('div'); saleErr.style.cssText = 'color:#CC4A4A;font-size:13px;'; saleErr.hidden = true; box.appendChild(saleErr);
      var logB = btn('💷 Log sale', 'bh-sale-save', true);
      logB.onclick = function() {
        logB.disabled = true; saleErr.hidden = true;
        L.logSale(row, { tier: tierSel.value, amount: amount.value, place: place.value, buyer: buyer.value, date: date.value }).then(function(r) {
          logB.disabled = false;
          RPGACE.utils.toast('💷 Sale logged: £' + r.amount.toFixed(2) + ' — ' + (row.title || 'beat'), 'var(--gold)', 2500);
          amount.value = ''; buyer.value = ''; tierSel.value = '';
          loadSales();
          if (after) after();
        }, function(e) {
          logB.disabled = false; saleErr.textContent = '⚠️ ' + (e && e.message || e); saleErr.hidden = false;
          if (!/Add the amount/.test(String(e && e.message))) RPGACE.utils.toast('⚠️ Sale not saved: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub');
        });
      };
      box.appendChild(logB);
      // fill tiers: this beat's, else your standard licence prices (SH-4)
      var own = L.tiersOf(row);
      (own.length ? Promise.resolve(own) : L.defaultTiers()).then(function(ts) {
        ts.forEach(addTier); fillTierSel();
        if (!own.length) tierMsg.textContent = 'Your standard prices — save to keep them on this beat';
      });
      return pop;
    },

    // BT-5: pick a logged beat that is not out yet.
    pickRelease: function() {
      var H = RPGACE.modules.beatsHub, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '🥁 Beats', title: '🚀 Release a beat', width: '480px' });
      var box = document.createElement('div'); box.id = 'bh-rel-pick'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      box.textContent = 'Loading beats…';
      pop.box.appendChild(box);
      RPGACE.sb.select('content_productions', 'select=id,con_id,title,finished_at,released_at,release_url,release_links,created_at&content_type=eq.music_video&released_at=is.null&order=created_at.desc&limit=30').then(function(rows) {
        box.textContent = '';
        rows = Array.isArray(rows) ? rows : [];
        var note = document.createElement('div'); note.style.cssText = 'font-size:13px;color:var(--muted);';
        note.textContent = rows.length ? 'Pick the beat you put out.' : 'Every logged beat is already released.';
        box.appendChild(note);
        rows.forEach(function(r) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'bh-morerow bh-rel-beat'; b.dataset.id = r.id;
          b.textContent = '🥁  ' + (r.con_id ? '#' + r.con_id + ' ' : '') + (r.title || 'beat');
          b.onclick = function() { pop.close(); H.ui.openRelease(r, function() { H.ui.render(); }); };
          box.appendChild(b);
        });
      }, function(e) { box.textContent = '⚠️ Could not load beats: ' + (e && e.message || e); });
    },

    // BT-5: add release links (first save = released). Then the hand-offs.
    openRelease: function(row, after) {
      var H = RPGACE.modules.beatsHub, L = H.logic, dd = RPGACE.modules.dashDeck;
      var first = !row.released_at;
      var pop = dd._popup({ eyebrow: '🥁 Beats', title: (first ? '🚀 Release: ' : '🔗 Links: ') + (row.title || 'beat'), width: '520px' });
      var box = document.createElement('div'); box.id = 'bh-release'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var inCss = 'box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;';
      var have = L.linksOf(row);
      if (have.length) {
        var hl = document.createElement('div'); hl.id = 'bh-rel-have'; hl.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
        have.forEach(function(l) {
          var a = document.createElement('a'); a.href = l.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'bh-rel-link';
          a.textContent = '🔗 ' + (l.place || L.placeOf(l.url));
          a.style.cssText = 'padding:6px 10px;border:1px solid var(--border);border-radius:8px;color:var(--text);text-decoration:none;font-size:13px;';
          hl.appendChild(a);
        });
        box.appendChild(hl);
      }
      var note = document.createElement('div'); note.style.cssText = 'font-size:13px;color:var(--muted);';
      note.textContent = first ? 'Where is it out? Add one or more links — a Beatstars link counts as the listing. You can add more later.' : 'Add more places it is out.';
      box.appendChild(note);
      var rows = document.createElement('div'); rows.id = 'bh-rel-rows'; rows.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      var addRow = function() {
        var r = document.createElement('div'); r.className = 'bh-rel-row'; r.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
        var sel = document.createElement('select'); sel.className = 'bh-rel-place'; sel.style.cssText = inCss + 'flex:0 0 130px;';
        L.PLACES.forEach(function(p) { var o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); });
        var url = document.createElement('input'); url.type = 'url'; url.className = 'bh-rel-url'; url.placeholder = 'https://…'; url.style.cssText = inCss + 'flex:1 1 200px;';
        var touched = false;
        sel.onchange = function() { touched = true; };
        url.oninput = function() { if (!touched && url.value.trim()) sel.value = L.placeOf(url.value); };
        r.appendChild(sel); r.appendChild(url); rows.appendChild(r);
        return url;
      };
      addRow();
      box.appendChild(rows);
      var more = document.createElement('button'); more.type = 'button'; more.className = 'bh-btn'; more.id = 'bh-rel-more'; more.textContent = '+ another link';
      more.onclick = function() { addRow().focus(); };
      box.appendChild(more);
      var err = document.createElement('div'); err.style.cssText = 'color:#CC4A4A;font-size:13px;'; err.hidden = true;
      box.appendChild(err);
      var save = document.createElement('button'); save.type = 'button'; save.className = 'bh-btn bh-go'; save.id = 'bh-rel-save';
      save.textContent = first ? '🚀 Mark released' : 'Save links';
      save.onclick = function() {
        var add = Array.prototype.map.call(rows.querySelectorAll('.bh-rel-row'), function(r) {
          return { place: r.querySelector('.bh-rel-place').value, url: r.querySelector('.bh-rel-url').value };
        });
        save.disabled = true; err.hidden = true;
        L.release(row, add).then(function(res) {
          RPGACE.utils.toast(res.first ? '🚀 Released: ' + (row.title || 'beat') : '🔗 ' + res.added + ' link' + (res.added === 1 ? '' : 's') + ' added', 'var(--gold)', 2200);
          if (after) after(res);
          // My beats keeps its own rendered list; refresh it so the card shows the links.
          var cplR = RPGACE.modules.contentProductionLive;
          if (cplR && cplR._refreshWidget) { try { cplR._refreshWidget(); } catch (x) {} }
          if (!res.first) { pop.close(); return; }
          // Hand-offs: the video steps, and the sell side.
          box.textContent = '';
          var done = document.createElement('div'); done.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);';
          done.textContent = '🚀 ' + (row.title || 'Beat') + ' is out. What next?';
          box.appendChild(done);
          var vid = document.createElement('button'); vid.type = 'button'; vid.className = 'bh-btn bh-go'; vid.id = 'bh-rel-video'; vid.textContent = '🎬 Make a video';
          vid.onclick = function() {
            pop.close();
            // PC-4 (Oct 17 2026): a beat video is now a Posting post.
            var ph = RPGACE.modules.postingHub;
            if (ph) ph.logic.fromBeat(row).then(function(post) { ph.open(); ph.ui.openPlan(post.id); },
              function(e) { RPGACE.utils.toast('⚠️ Could not start the video post: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub'); });
          };
          var sell = document.createElement('button'); sell.type = 'button'; sell.className = 'bh-btn'; sell.id = 'bh-rel-sell'; sell.textContent = '💰 Sell this beat';
          sell.onclick = function() { pop.close(); H.ui.openSell(row, after); };
          var later = document.createElement('button'); later.type = 'button'; later.className = 'bh-btn'; later.id = 'bh-rel-done'; later.textContent = 'Done for now';
          later.onclick = function() { pop.close(); };
          [vid, sell, later].forEach(function(n) { box.appendChild(n); });
        }, function(e) {
          save.disabled = false;
          err.textContent = '⚠️ ' + (e && e.message || e); err.hidden = false;
          if (!/Not a full link|Add at least/.test(String(e && e.message))) RPGACE.utils.toast('⚠️ Could not save the release: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub');
        });
      };
      box.appendChild(save);
      pop.box.appendChild(box);
      return pop;
    },

    // BT-7: show one beat - its card in My beats (highlighted), or its Sell
    // pop-up when the card is not in the list (My beats shows the newest 20).
    // SH-7: opts.sell opens its Sell screen straight away (sales + deals).
    openBeat: function(id, opts) {
      var H = RPGACE.modules.beatsHub;
      return Promise.resolve(RPGACE.sb.select('content_productions', 'select=*&id=eq.' + id + '&limit=1')).then(function(rows) {
        var row = rows && rows[0];
        if (!row) { RPGACE.utils.toast('⚠️ That beat was not found', '#CC4A4A', 3000, 'beatsHub'); return; }
        if (opts && opts.sell) { H.ui.openSell(row, function() { H.ui.render(); }); return; }
        H.ui.go('beats');
        setTimeout(function() {
          var card = document.querySelector('[data-cp-id="' + id + '"]');
          if (card && card.offsetParent !== null) {
            if (card.scrollIntoView) card.scrollIntoView({ block: 'center' });
            card.style.outline = '2px solid var(--gold)';
            setTimeout(function() { card.style.outline = ''; }, 2500);
          } else H.ui.openSell(row, function() { H.ui.render(); });
        }, 700);
      }, function(e) { RPGACE.utils.toast('⚠️ Could not open the beat: ' + (e && e.message || e), '#CC4A4A', 3500, 'beatsHub'); });
    },

    // BT-2: a Producer session started from Doing Now's own button asks which
    // beat it is for (beats being made), or none.
    offerBeat: function(entry) {
      var H = RPGACE.modules.beatsHub, L = H.logic, dd = RPGACE.modules.dashDeck, dn = RPGACE.modules.doingNow;
      return Promise.all([
        RPGACE.sb.select('conid_pot', 'select=id,title,idea_text,status&status=eq.making&order=created_at.desc&limit=20'),
        L.loadTimes()
      ]).then(function(r) {
        var prog = L.inProgress(Array.isArray(r[0]) ? r[0] : [], r[1] || {}).list;
        if (!prog.length) return null;
        var pop = dd._popup({ eyebrow: '🥁 Beats', title: 'Which beat?', width: '480px' });
        var box = document.createElement('div'); box.id = 'bh-which'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
        var note = document.createElement('div'); note.style.cssText = 'font-size:13px;color:var(--muted);';
        note.textContent = '"' + entry.title + '" — is it for a beat you are making? Its time adds up on that beat.';
        box.appendChild(note);
        var link = function(i, stage, btn) {
          btn.disabled = true;
          var d = Object.assign({}, entry.details || {}, L.beatDetails(i, stage));
          entry.details = d;
          L._times = null;
          dn.logic.patch(entry.id, { details: d }).then(function() {
            pop.close();
            RPGACE.utils.toast('🔗 ' + L.STAGE_WORD[d.stage] + ': ' + d.link.title.slice(0, 40), 'var(--gold)', 2000);
            try { dn.ui._refresh(); } catch (e) {}
          }, function(e) { btn.disabled = false; RPGACE.utils.toast('⚠️ Could not link the beat: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub'); });
        };
        prog.forEach(function(x) {
          var row = document.createElement('div'); row.className = 'bh-which-row';
          row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:1px solid var(--border);border-radius:10px;padding:8px 10px;';
          var t = document.createElement('div'); t.style.cssText = 'flex:1 1 160px;font-size:14px;font-weight:600;color:var(--text);';
          var line = L.timeLine(x.t);
          t.textContent = String(x.idea.title || x.idea.idea_text || 'idea').slice(0, 60) + (line ? ' · ' + line : '');
          row.appendChild(t);
          var mk = document.createElement('button'); mk.type = 'button'; mk.className = 'bh-btn bh-which-make'; mk.textContent = '🎛 Making';
          mk.onclick = function() { link(x.idea, 'make', mk); };
          row.appendChild(mk);
          if (x.t.make > 0 || x.t.ready) {
            var mx = document.createElement('button'); mx.type = 'button'; mx.className = 'bh-btn bh-which-mix'; mx.textContent = '🎚 Mixing';
            mx.onclick = function() { link(x.idea, 'mix', mx); };
            row.appendChild(mx);
          }
          box.appendChild(row);
        });
        var none = document.createElement('button'); none.type = 'button'; none.className = 'bh-btn'; none.id = 'bh-which-none';
        none.textContent = 'Not for a beat';
        none.onclick = function() { pop.close(); };
        box.appendChild(none);
        pop.box.appendChild(box);
        return pop;
      }, function() { return null; });
    },

    // BT-2: stopping a making session asks "Ready to mix?".
    askReadyToMix: function(entry) {
      var H = RPGACE.modules.beatsHub, L = H.logic, dd = RPGACE.modules.dashDeck, dn = RPGACE.modules.doingNow;
      var l = entry.details.link, title = l.title || l.label || 'this beat';
      var pop = dd._popup({ eyebrow: '🥁 Beats', title: '🎚 Ready to mix?', width: '440px' });
      var box = document.createElement('div'); box.id = 'bh-ready'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var note = document.createElement('div'); note.style.cssText = 'font-size:14px;color:var(--text);';
      note.textContent = 'Is "' + title + '" ready to mix?';
      box.appendChild(note);
      var mark = function() {
        L._times = null;
        return dn.logic.patch(entry.id, { details: Object.assign({}, entry.details, { ready_to_mix: true }) });
      };
      var fail = function(e) { RPGACE.utils.toast('⚠️ Could not save: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub'); };
      var now = document.createElement('button'); now.type = 'button'; now.className = 'bh-btn bh-go'; now.id = 'bh-ready-now';
      now.textContent = '🎚 Yes — start mixing now';
      now.onclick = function() {
        now.disabled = true;
        mark().then(function() { return L.startSession({ id: l.id, title: title, status: 'making' }, 'mix'); }).then(function() {
          pop.close();
          RPGACE.utils.toast('▶ Mixing: ' + title.slice(0, 40), 'var(--gold)', 2200);
          try { dn.ui._refresh(); } catch (e) {}
          H.ui.render();
        }, function(e) { now.disabled = false; fail(e); });
      };
      var later = document.createElement('button'); later.type = 'button'; later.className = 'bh-btn'; later.id = 'bh-ready-later';
      later.textContent = '✓ Yes, mix later';
      later.onclick = function() {
        later.disabled = true;
        mark().then(function() { pop.close(); RPGACE.utils.toast('🎚 Ready to mix: ' + title.slice(0, 40), 'var(--gold)', 2000); H.ui.render(); }, function(e) { later.disabled = false; fail(e); });
      };
      var notYet = document.createElement('button'); notYet.type = 'button'; notYet.className = 'bh-btn'; notYet.id = 'bh-ready-no';
      notYet.textContent = 'Not yet';
      notYet.onclick = function() { pop.close(); };
      [now, later, notYet].forEach(function(n) { box.appendChild(n); });
      pop.box.appendChild(box);
      return pop;
    },

    // BT-2: an Idea Bank card being made shows its time and Keep making /
    // Start mixing (mixing once it has making time).
    ideaExtras: function(item, row, after) {
      var H = RPGACE.modules.beatsHub, L = H.logic;
      var box = document.createElement('div'); box.className = 'cp-beat-time';
      box.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 6px;font-size:12px;color:var(--muted);';
      item.appendChild(box);
      L.loadTimes().then(function(times) {
        var t = times[row.id] || { make: 0, mix: 0, mixN: 0, ready: false };
        var line = document.createElement('span'); line.className = 'cp-beat-line';
        line.textContent = (L.timeLine(t) || 'No session time yet') + (t.ready && !t.mixN ? ' · ready to mix' : '');
        box.appendChild(line);
        var btn = function(label, cls, stage) {
          var b = document.createElement('button'); b.type = 'button'; b.className = cls;
          b.style.cssText = 'min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid #9B6EC8;background:none;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;';
          b.textContent = label;
          b.onclick = function() {
            b.disabled = true;
            L.startSession(row, stage).then(function() {
              RPGACE.utils.toast('▶ ' + L.STAGE_WORD[stage] + ': ' + String(row.title || '').slice(0, 40), 'var(--gold)', 2200);
              try { RPGACE.modules.doingNow.ui._refresh(); } catch (e) {}
              if (after) after();
            }, function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ Could not start: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatsHub'); });
          };
          box.appendChild(b);
        };
        btn('▶ Keep making', 'cp-keep-making', 'make');
        if (t.make > 0 || t.ready) btn('🎚 Start mixing', 'cp-start-mixing', 'mix');
        // BT-3: finished -> Beat Log, filled from this idea.
        var lg = document.createElement('button'); lg.type = 'button'; lg.className = 'cp-log-beat';
        lg.style.cssText = 'min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;';
        lg.textContent = '🥁 Log this beat';
        lg.onclick = function() { H.ui.logIdea(row); };
        box.appendChild(lg);
      });
    },

    _btn: function(label, key, go) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bh-btn' + (go ? ' bh-go' : ''); b.textContent = label;
      b.dataset.go = key;
      b.onclick = function() { RPGACE.modules.beatsHub.ui.go(key); };
      return b;
    },

    render: function() {
      var H = RPGACE.modules.beatsHub, U = H.ui;
      var bar = document.getElementById('bh-bar'), next = document.getElementById('bh-next'), steps = document.getElementById('bh-steps');
      if (!bar || !next || !steps) return;
      bar.replaceWith(Object.assign(RPGACE.areaNav.bar('beats', { isHub: true }), { id: 'bh-bar' }));
      next.textContent = 'Loading…';
      H.logic.load().then(function(m) { H._model = m; U.renderNext(m); U.renderSteps(m); })
        .catch(function(e) { next.textContent = '⚠️ Could not load Beats: ' + (e && e.message || e); });
    },

    renderNext: function(m) {
      var U = RPGACE.modules.beatsHub.ui, el = document.getElementById('bh-next');
      // RF-4: the shared What's next (areaNav.next), rows keep the bh- classes.
      RPGACE.areaNav.next(el, m.next.map(function(n) {
        return { icon: n.icon, title: n.text, go: ['Go →', function() { U.go(n.key); }] };
      }), { cls: 'bh', empty: 'Nothing waiting — start a beat session.', emptyGo: ['▶ Start', function() { U.go('start'); }] });
    },

    renderSteps: function(m) {
      var U = RPGACE.modules.beatsHub.ui, L = RPGACE.modules.beatsHub.logic, el = document.getElementById('bh-steps');
      el.textContent = '';
      var n = function(x, w) { return x + ' ' + w + (x === 1 ? '' : 's'); };
      var STEPS = [
        { n: 1, name: 'Idea', what: 'what to make', count: n(m.ideas, 'idea') + ' in the Idea Bank', btns: [['💡 Idea Bank', 'ideas']] },
        { n: 2, name: 'Make', what: 'a Doing Now session', count: (m.sessions ? n(m.sessions, 'Producer session') + ' this week · ' + L.fmtMins(m.mins) : 'No Producer sessions this week') + (m.making ? ' · ' + m.making + ' being made' : ''),
          badge: m.running ? 'running' : '', list: (m.inProgress || []).slice(0, 4), btns: [['▶ Start making', 'make']] },
        { n: 3, name: 'Mix', what: 'before you log it', count: (m.toMix && m.toMix.length ? n(m.toMix.length, 'beat') + ' ready to mix' : 'Nothing marked ready to mix') + ' · then export the WAV + stems to your drive',
          list: (m.toMix || []).slice(0, 4), btns: [['🎚 Start mixing', 'mix']] },
        { n: 4, name: 'Log', what: '= finished', count: n(m.logged, 'beat') + ' logged · WAV + stems on your drive', btns: [['🥁 Log a finished beat', 'log']] },
        { n: 5, name: 'Release', what: 'put it out', count: m.released + ' released · ' + m.toRelease + ' to release',
          list: (m.unreleased || []).slice(0, 4).map(function(b) { return { idea: { title: b.title }, t: {} }; }), btns: [['🚀 Release a beat', 'release'], ['🎬 My beats', 'beats']] },
        { n: 6, name: 'Sell', what: 'licences + sales', count: m.priced + ' priced · ' + n(m.sales, 'sale') + (m.salesTotal ? ' · £' + m.salesTotal.toFixed(2) : ''),
          list: m.topSellers || [], btns: [['💰 Sell a beat', 'sell']] }
      ];
      // SL-1 (Oct 27 2026): each step keeps its own buttons once (Start making sits on Make,
      // My beats on Release); the tools live in the › side list.
      var pg = el.closest('.page');
      if (pg) pg._sideExtras = function() {
        return [['🎶', 'Playlist Psychologist', function() { U.go('playlist'); }, 'bh:playlist'],
          ['🎧', 'Reference tracks', function() { U.go('refs'); }, 'bh:refs'],
          ['🎬', 'My beats', function() { U.go('beats'); }, 'bh:beats']];
      };
      // UI Debloat (Oct 27 2026): tiles; a step's beats move into its sheet.
      STEPS.forEach(function(s) {
        s.lines = (s.list || []).map(function(x) {
          var line = L.timeLine(x.t || {});
          return (x.t && x.t.running ? '▶ ' : '• ') + String((x.idea && (x.idea.title || x.idea.idea_text)) || 'idea').slice(0, 50) + (line ? ' — ' + line : '') +
            (x.sold ? ' — ' + x.sold.n + ' sale' + (x.sold.n === 1 ? '' : 's') + ' · £' + x.sold.total.toFixed(2) : '');
        });
      });
      RPGACE.areaNav.steps(el, STEPS, function(b) { return U._btn(b[0], b[1]); }, 'bh-step');
    }
  }
});
/* ===END:beatsHub=== */
