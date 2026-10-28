/* ===MODULE:postingHub=== */
// Oct 17 2026 — PC-0 of the ratified plan "Posting (Creator)"
// (records/2026-10/posting_creator_ceo_plan_2026-10-17.txt). The Posting
// home page: the journey Alex chose - Idea -> Plan -> Record -> Edit ->
// Post -> Results (Results is a later plan) - with live counts, a "what's
// next" list and + New post. Data: the private `posts` table (one row per
// post, a link per platform, read via /api/data-write action 'read').
// A beat video points at its beat (beat_id -> content_productions).
// RPGACE.AREAS.posting.hub points here for ← Back / 🏠. Layout reuses
// knowledgeHub's CSS (rule 8), the same way beatsHub does.
RPGACE.register('postingHub', {
  domain: 'content',

  init: function() {
    var self = RPGACE.modules.postingHub;
    RPGACE.AREAS.posting.hub = function() { self.open(); };
    RPGACE.hooks.on('page:show', function(name) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P) return;
      // PC-1: Idea Bank opened from Posting gets Posting's ← Back / 🏠 row.
      var v = RPGACE.areaNav._via;
      if (name === P.ideaBank && v && v.slug === name && v.area === 'posting' && Date.now() - v.at < 5000) {
        RPGACE.areaNav._via = null;
        setTimeout(function() { var bh = RPGACE.modules.beatsHub; if (bh) bh.ui.decoratePage(name, 'posting'); }, 40);
        return;
      }
      if (name !== P.posting) return;
      self.ui.injectPage();
      RPGACE.areaNav.visit('posting', { key: 'hub', label: 'Posting', open: function() { self.open(); } });
      self.ui.render();
    });
    [0, 1700].forEach(function(ms) { setTimeout(function() { self.ui.injectPage(); }, ms); });
    // PC-4: a link pasted into Oracle chat can be saved to a post.
    RPGACE.registerBootTask(function() { self.logic.patchChat(); });
    // PC-3: a recording / editing session just stopped -> add its time to
    // the post, then ask what is next.
    RPGACE.hooks.on('doingnow:finished', function(entry) {
      var d = entry && entry.details;
      if (!d || d.kind !== 'post' || !d.link || d.link.kind !== 'posts' || d.counted) return;
      self.logic.addTime(entry).then(function(post) {
        if (!post) return;
        if (d.stage === 'record') self.ui.askRecordDone(post);
        else self.ui.askReadyToPost(post);
      }, function(e) { RPGACE.utils.toast('⚠️ Session time not added to the post: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); });
    });
  },

  open: function() {
    this.ui.injectPage();
    if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.posting);
  },

  // ============================================================
  // logic — reads, writes and the "what's next" decision. No DOM.
  // ============================================================
  logic: {
    KINDS: {
      beat_video:  { icon: '🎵', name: 'Beat video' },
      tutorial:    { icon: '🎓', name: 'Tutorial' },
      clip:        { icon: '✂️', name: 'Short clip' },
      studio_life: { icon: '🏠', name: 'Studio / life' }
    },
    KIND_ORDER: ['beat_video', 'tutorial', 'clip', 'studio_life'],
    // The stage a post is in, and what it needs next.
    STAGES: ['idea', 'planned', 'recording', 'editing', 'posted'],
    NEXT: {
      idea:      { icon: '📝', verb: 'Plan it' },
      planned:   { icon: '🎥', verb: 'Record it' },
      recording: { icon: '▶', verb: 'Keep recording' },
      editing:   { icon: '✂️', verb: 'Keep editing' },
      ready:     { icon: '📣', verb: 'Post it' }
    },
    // Private table: same signed-in read every locked table uses (rule 8).
    read: function(params) {
      var tp = RPGACE.modules.tripPlans;
      return tp ? tp.logic.read('posts', params) : Promise.resolve([]);
    },
    load: function() {
      var L = RPGACE.modules.postingHub.logic;
      return Promise.all([
        L.read('select=id,title,kind,stage,beat_id,idea_id,realms,updated_at,posted_at,ready_at,record_mins,edit_mins,links,platforms&order=updated_at.desc&limit=300'),
        // PC-1: post ideas in the Idea Bank not turned into posts yet.
        Promise.resolve(RPGACE.sb.select('conid_pot', 'select=id&kind=eq.post&status=eq.potential&limit=500')).catch(function() { return []; }),
        L.loadTarget()
      ]).then(function(r) {
        var m = L.model(Array.isArray(r[0]) ? r[0] : [], Date.now(), Array.isArray(r[1]) ? r[1].length : 0);
        m.target = r[2]; m.week = L.weekStatus(r[0] || [], r[2], L.isoDay());
        return m;
      });
    },
    // Pure: counts per stage, this week's posts, and the next list.
    model: function(posts, now, ideas) {
      var L = RPGACE.modules.postingHub.logic, counts = {};
      L.STAGES.forEach(function(s) { counts[s] = 0; });
      posts.forEach(function(p) { if (counts[p.stage] != null) counts[p.stage]++; });
      var weekAgo = (now || Date.now()) - 7 * 864e5;
      return {
        total: posts.length, counts: counts, ideas: ideas || 0,
        // PC-4: newest posted first, for + link.
        recent: posts.filter(function(p) { return p.stage === 'posted'; }).sort(function(a, b) { return String(b.posted_at || '').localeCompare(String(a.posted_at || '')); }).slice(0, 4),
        postedWeek: posts.filter(function(p) { return p.posted_at && new Date(p.posted_at).getTime() >= weekAgo; }).length,
        byStage: function(s) { return posts.filter(function(p) { return p.stage === s; }); },
        next: L.nextList(posts)
      };
    },
    // Closest to posted first, then newest; up to 5.
    nextList: function(posts) {
      var L = RPGACE.modules.postingHub.logic, rank = { ready: 0, editing: 1, recording: 2, planned: 3, idea: 4 };
      var st = function(p) { return p.stage === 'editing' && p.ready_at ? 'ready' : p.stage; };
      return posts.filter(function(p) { return rank[st(p)] != null; })
        .slice().sort(function(a, b) {
          return (rank[st(a)] - rank[st(b)]) || String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
        }).slice(0, 5)
        .map(function(p) { var n = L.NEXT[st(p)]; return { post: p, icon: n.icon, verb: n.verb, state: st(p) }; });
    },
    // Pure: the row to insert, or { error }.
    newRow: function(title, kind, realms) {
      var L = RPGACE.modules.postingHub.logic;
      var t = String(title || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      if (!t) return { error: 'Give the post a title' };
      if (!L.KINDS[kind]) return { error: 'Pick a type' };
      var r = RPGACE.realmPicker ? RPGACE.realmPicker.clean(realms) : [];
      return { row: { title: t, kind: kind, stage: 'idea', realms: r.length ? r : ['creator'] } };
    },
    // PC-1 (Oct 17 2026): a post idea becomes a post at the Idea stage,
    // linked back to it; the idea is marked 'in_post'. Never two posts for
    // one idea.
    fromIdea: function(idea) {
      var L = RPGACE.modules.postingHub.logic;
      if (!idea || !idea.id) return Promise.reject(new Error('No idea'));
      var mark = function(post) {
        return RPGACE.sb.secureWrite('conid_pot', 'update', { status: 'in_post' }, 'id=eq.' + idea.id).then(function() { return post; });
      };
      return L.read('select=id,title,stage&idea_id=eq.' + idea.id + '&limit=1').then(function(have) {
        if (have && have[0]) return mark(have[0]);
        var row = { title: String(idea.title || idea.idea_text || 'Post').trim().slice(0, 120), kind: L.KINDS[idea.post_type] ? idea.post_type : 'clip',
          stage: 'idea', idea_id: idea.id, realms: ['creator'] };
        return RPGACE.sb.secureWrite('posts', 'insert', row).then(function(d) {
          var saved = Array.isArray(d) && d[0];
          if (!saved || !saved.id) throw new Error('The post was not saved (no id came back)');
          return mark(saved);
        });
      });
    },
    // Pure: the update for retagging an idea (beat, or post + type).
    retagUpdate: function(kind, postType) {
      var L = RPGACE.modules.postingHub.logic;
      if (kind === 'post') return { kind: 'post', post_type: L.KINDS[postType] ? postType : 'clip' };
      return { kind: 'beat', post_type: null };
    },
    // ── PC-2 (Oct 17 2026): planning a post ─────────────────────────
    PLATFORMS: ['Instagram', 'YouTube', 'TikTok'],
    // A starting prompt per type, shown in the empty boxes.
    STARTERS: {
      beat_video:  { hook: 'First 3 seconds: what grabs them? (e.g. the drop with a hard cut)', script: 'Visual mood, colours, story beats across the track…', shots: 'One shot per line, e.g.\nClose-up on hands on the pads\nWide studio shot as the 808 hits' },
      tutorial:    { hook: 'The result first: what will they be able to do?', script: 'What you are teaching, then the 3 steps…', shots: 'One shot per line, e.g.\nScreen: FL Studio playlist\nFace cam: the tip in one line' },
      clip:        { hook: 'The one moment worth stopping for', script: 'What happens, in a few lines…', shots: 'One shot per line' },
      studio_life: { hook: 'Where are we and why should they care?', script: 'The moments to catch today…', shots: 'One shot per line' }
    },
    // Pure: one string per box, trimmed and capped; shots one per line.
    cleanPlan: function(f) {
      var t = function(x, n) { return String(x == null ? '' : x).replace(/\r/g, '').trim().slice(0, n); };
      var shots = Array.isArray(f && f.shots) ? f.shots : String(f && f.shots || '').split('\n');
      return { hook: t(f && f.hook, 300), script: t(f && f.script, 4000),
        shots: shots.map(function(x) { return t(x, 200).replace(/^[-•*\d.)\s]+/, ''); }).filter(Boolean).slice(0, 40) };
    },
    cleanPlatforms: function(list) {
      var P = RPGACE.modules.postingHub.logic.PLATFORMS, seen = {};
      return (list || []).filter(function(x) { if (P.indexOf(x) < 0 || seen[x]) return false; seen[x] = 1; return true; });
    },
    // Pure: captions only for ticked platforms, strings, capped.
    cleanCaptions: function(obj, platforms) {
      var out = {};
      (platforms || []).forEach(function(k) { var v = obj && obj[k]; if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 2200); });
      return out;
    },
    // Pure: what the beat brings to a prompt (title + Beat Log fields).
    beatLine: function(beat) {
      if (!beat) return '';
      var m = (beat.creative_docs && beat.creative_docs.beat_meta) || {};
      var bits = [beat.title || m.title, m.bpm ? m.bpm + ' BPM' : '', [m.key, m.scale].filter(Boolean).join(' '), m.mood, m.genre].filter(Boolean);
      return bits.join(', ');
    },
    draftPrompt: function(post, ideaText, beat) {
      var L = RPGACE.modules.postingHub.logic, k = L.KINDS[post.kind] || { name: 'post' };
      return 'Plan a short ' + k.name.toLowerCase() + ' for @AceSanyaBeats (UK music producer, FL Studio, aspiring producers 18-35).\n' +
        'Title: ' + post.title + '\n' + (ideaText ? 'Idea: ' + String(ideaText).slice(0, 800) + '\n' : '') +
        (beat ? 'Beat: ' + L.beatLine(beat) + '\n' : '') +
        'Return JSON only: {"hook": "first 3 seconds, max 25 words", "script": "talking points or visual story, max 120 words", "shots": ["shot 1", "...", "max 8 shots, 12 words each"]}';
    },
    captionPrompt: function(post, plan, platforms, beat) {
      var L = RPGACE.modules.postingHub.logic;
      var shape = {}; platforms.forEach(function(p) { shape[p] = '...'; });
      return 'Write one caption per platform for this post by @AceSanyaBeats (UK producer).\n' +
        'Title: ' + post.title + '\nHook: ' + (plan.hook || '-') + '\nAbout: ' + String(plan.script || '').slice(0, 600) + '\n' +
        (beat ? 'Beat: ' + L.beatLine(beat) + '\n' : '') +
        'Instagram: up to 60 words + 5 hashtags. YouTube: a title line then 2 short lines. TikTok: up to 25 words + 3 hashtags.\n' +
        'Return JSON only with exactly these keys: ' + JSON.stringify(shape);
    },
    loadPost: function(id) {
      return RPGACE.modules.postingHub.logic.read('select=*&id=eq.' + id + '&limit=1').then(function(r) {
        if (!r || !r[0]) throw new Error('Post not found');
        return r[0];
      });
    },
    loadBeats: function() {
      return Promise.resolve(RPGACE.sb.select('content_productions', 'select=id,title,creative_docs,finished_at,stems_drive,stems_folder&content_type=eq.music_video&order=created_at.desc&limit=60')).catch(function() { return []; });
    },
    // Pure: the posts update for a plan save (done = the plan is finished).
    planUpdate: function(post, f, done, now) {
      var L = RPGACE.modules.postingHub.logic;
      var plats = L.cleanPlatforms(f.platforms);
      var upd = { plan: Object.assign({}, post.plan || {}, L.cleanPlan(f)), platforms: plats,
        captions: L.cleanCaptions(f.captions, plats), updated_at: new Date(now || Date.now()).toISOString() };
      if (post.kind === 'beat_video') upd.beat_id = f.beat_id || null;
      if (f.files) upd.files = RPGACE.modules.postingHub.logic.cleanFiles(f.files);
      if (done) {
        if (!upd.plan.hook && !upd.plan.script) return { error: 'Write a hook or a script first' };
        if (!plats.length) return { error: 'Tick at least one platform' };
        if (post.stage === 'idea') upd.stage = 'planned';
        if (!post.planned_at) upd.planned_at = upd.updated_at;
      }
      return { update: upd };
    },
    savePlan: function(post, f, done) {
      var v = RPGACE.modules.postingHub.logic.planUpdate(post, f, done);
      if (v.error) return Promise.reject(new Error(v.error));
      return RPGACE.sb.secureWrite('posts', 'update', v.update, 'id=eq.' + post.id).then(function() { return Object.assign({}, post, v.update); });
    },
    // Pure: the openmontage_jobs row for a beat video's AI hand-off.
    handoffRow: function(post, plan, beat) {
      var L = RPGACE.modules.postingHub.logic, m = (beat && beat.creative_docs && beat.creative_docs.beat_meta) || {};
      var brief = ['POST: ' + post.title + ' (beat video)', 'HOOK: ' + (plan.hook || '-'), 'STORY:\n' + (plan.script || '-'),
        'SHOTS:\n' + (plan.shots || []).map(function(x, i) { return (i + 1) + '. ' + x; }).join('\n'),
        'PROVIDER NOTE: prefer fal.ai (the provider wired into OpenMontage).'].join('\n\n');
      return { content_production_id: beat ? beat.id : null, title: post.title, brief: brief,
        beat_meta: Object.assign({}, m, { beat: L.beatLine(beat), post_id: post.id }), status: 'queued', requested_by: 'rpgace_posting' };
    },
    handoff: function(post, plan, beat) {
      var row = RPGACE.modules.postingHub.logic.handoffRow(post, plan, beat);
      var h = RPGACE.sb.headers(); h['Prefer'] = 'return=representation';
      return fetch(RPGACE.sb.url('openmontage_jobs'), { method: 'POST', headers: h, body: JSON.stringify(row) })
        .then(function(r) { return r.json().catch(function() { return null; }).then(function(d) {
          if (!r.ok || !d || !d[0] || !d[0].id) throw new Error((d && d.message) || ('HTTP ' + r.status));
          return d[0];
        }); })
        .then(function(job) {
          var pl = Object.assign({}, post.plan || {}, { handoff: { job_id: job.id, at: new Date().toISOString() } });
          return RPGACE.sb.secureWrite('posts', 'update', { plan: pl, updated_at: new Date().toISOString() }, 'id=eq.' + post.id)
            .then(function() { post.plan = pl; return job; });
        });
    },
    handoffStatus: function(jobId) {
      return Promise.resolve(RPGACE.sb.select('openmontage_jobs', 'select=id,status,output_note,updated_at&id=eq.' + jobId + '&limit=1'))
        .then(function(r) { return r && r[0] || null; }).catch(function() { return null; });
    },
    // ── PC-3 (Oct 17 2026): record + edit as Doing Now sessions ──────
    STAGE_WORD: { record: 'Recording', edit: 'Editing' },
    postDetails: function(post, stage) {
      var title = String(post.title || 'post').slice(0, 80);
      return { kind: 'post', stage: stage === 'edit' ? 'edit' : 'record', link: { kind: 'posts', id: post.id, label: title, title: title } };
    },
    // Pure: the stage a post moves to when a session starts.
    stageFor: function(post, stage) {
      if (stage === 'edit') return (post.stage === 'posted' || post.stage === 'editing') ? null : 'editing';
      return (post.stage === 'idea' || post.stage === 'planned') ? 'recording' : null;
    },
    startSession: function(post, stage) {
      var dn = RPGACE.modules.doingNow, L = RPGACE.modules.postingHub.logic;
      if (!dn || !post) return Promise.reject(new Error('Live now is not loaded'));
      var d = L.postDetails(post, stage);
      var realms = (post.realms && post.realms.length) ? post.realms : ['creator'];
      var e = dn.logic.start(L.STAGE_WORD[d.stage] + ': ' + d.link.title, realms);
      e.details = Object.assign({}, e.details || {}, d);
      var next = L.stageFor(post, d.stage), upd = { updated_at: new Date().toISOString() };
      if (next) upd.stage = next;
      return dn.logic.patch(e.id, { details: e.details })
        .then(function() { return RPGACE.sb.secureWrite('posts', 'update', upd, 'id=eq.' + post.id); })
        .then(function() { return e; });
    },
    // Pure: minutes added to the right column.
    timeUpdate: function(post, stage, mins) {
      var m = Math.max(0, Math.round(Number(mins) || 0));
      return stage === 'edit' ? { edit_mins: (Number(post.edit_mins) || 0) + m } : { record_mins: (Number(post.record_mins) || 0) + m };
    },
    // A finished session's minutes go onto the post once (details.counted).
    addTime: function(entry) {
      var L = RPGACE.modules.postingHub.logic, dn = RPGACE.modules.doingNow, d = entry.details;
      return L.loadPost(d.link.id).then(function(post) {
        var upd = Object.assign(L.timeUpdate(post, d.stage, entry.actual_mins), { updated_at: new Date().toISOString() });
        return RPGACE.sb.secureWrite('posts', 'update', upd, 'id=eq.' + post.id).then(function() {
          var nd = Object.assign({}, d, { counted: true });
          entry.details = nd;
          return dn.logic.patch(entry.id, { details: nd }).catch(function() {}).then(function() { return Object.assign(post, upd); });
        });
      });
    },
    // "40m recording · 1h 10m editing" (empty when no time yet).
    timeLine: function(post) {
      var bh = RPGACE.modules.beatsHub, f = bh ? bh.logic.fmtMins : function(m) { return m + 'm'; }, parts = [];
      if (Number(post.record_mins) > 0) parts.push(f(Number(post.record_mins)) + ' recording');
      if (Number(post.edit_mins) > 0) parts.push(f(Number(post.edit_mins)) + ' editing');
      return parts.join(' · ');
    },
    // Pure: file names + where they are (nothing is uploaded).
    cleanFiles: function(f) {
      var t = function(x, n) { return String(x == null ? '' : x).trim().slice(0, n); };
      var one = function(o) { o = o || {}; var r = { name: t(o.name, 200), path: t(o.path, 400) }; return (r.name || r.path) ? r : null; };
      var out = {}, v = one(f && f.video), b = one(f && f.beat);
      if (v) out.video = v;
      if (b) out.beat = b;
      return out;
    },
    // Pure: the beat's file as Beat Log saved it (WAV name + drive / folder).
    beatFile: function(beat) {
      if (!beat) return null;
      var m = (beat.creative_docs && beat.creative_docs.beat_meta) || {};
      var path = [beat.stems_drive, beat.stems_folder].filter(Boolean).join(' / ');
      var name = m.wavFile || '';
      return (name || path) ? { name: name, path: path } : null;
    },
    readyUpdate: function(post, files, now) {
      var at = new Date(now || Date.now()).toISOString();
      var upd = { ready_at: at, stage: 'editing', updated_at: at };
      var f = RPGACE.modules.postingHub.logic.cleanFiles(Object.assign({}, post.files || {}, files || {}));
      if (Object.keys(f).length) upd.files = f;
      return upd;
    },
    // ── PC-4 (Oct 17 2026): post it = links ─────────────────────────
    LINK_PLACES: ['YouTube', 'Instagram', 'TikTok', 'DistroKid', 'Other'],
    // One place-guesser for beats and posts (beatsHub's, rule 8).
    placeOf: function(url) {
      var bh = RPGACE.modules.beatsHub, pl = bh ? bh.logic.placeOf(url) : 'Other';
      return RPGACE.modules.postingHub.logic.LINK_PLACES.indexOf(pl) > -1 ? pl : 'Other';
    },
    linksOf: function(post) {
      return (Array.isArray(post && post.links) ? post.links : []).filter(function(l) { return l && l.url; });
    },
    // Pure: the update for adding links (first link = posted). Same rules
    // as a beat release: full http links only, no repeats.
    postUpdate: function(post, add, now) {
      var L = RPGACE.modules.postingHub.logic, have = L.linksOf(post), seen = {}, bad = [], fresh = [];
      have.forEach(function(l) { seen[l.url] = 1; });
      (add || []).forEach(function(a) {
        var url = String(a && a.url || '').trim();
        if (!url) return;
        if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(url)) { bad.push(url); return; }
        if (seen[url]) return;
        seen[url] = 1;
        fresh.push({ place: L.LINK_PLACES.indexOf(a.place) > -1 ? a.place : L.placeOf(url), url: url, added_at: new Date(now || Date.now()).toISOString() });
      });
      if (bad.length) return { error: 'Not a full link: ' + bad.join(', ') };
      if (!fresh.length) return { error: have.length ? 'Add at least one new link' : 'Paste the link first' };
      var at = new Date(now || Date.now()).toISOString();
      var upd = { links: have.concat(fresh), updated_at: at };
      var first = !post.posted_at;
      if (first) { upd.posted_at = at; upd.stage = 'posted'; }
      return { update: upd, added: fresh, first: first };
    },
    // Save links on a post; the idea shows posted; a beat video's links
    // also go on the beat (released the first time, BT-5's own path).
    savePost: function(post, add) {
      var L = RPGACE.modules.postingHub.logic, r = L.postUpdate(post, add, Date.now());
      if (r.error) return Promise.reject(new Error(r.error));
      return RPGACE.sb.secureWrite('posts', 'update', r.update, 'id=eq.' + post.id).then(function() {
        Object.assign(post, r.update);
        var extras = [];
        if (r.first && post.idea_id) extras.push(RPGACE.sb.secureWrite('conid_pot', 'update', { status: 'posted' }, 'id=eq.' + post.idea_id).catch(function(e) { return 'idea: ' + (e && e.message || e); }));
        var bh = RPGACE.modules.beatsHub;
        if (post.kind === 'beat_video' && post.beat_id && bh) {
          extras.push(Promise.resolve(RPGACE.sb.select('content_productions', 'select=id,title,released_at,release_url,release_links&id=eq.' + post.beat_id + '&limit=1')).then(function(rows) {
            var beat = rows && rows[0];
            if (!beat) return 'beat not found';
            return bh.logic.release(beat, r.added.map(function(l) { return { place: l.place, url: l.url }; })).then(function(br) { r.beatReleased = br.first; return null; },
              function(e) { return /Add at least/.test(e && e.message) ? null : 'beat: ' + (e && e.message || e); });
          }, function(e) { return 'beat: ' + (e && e.message || e); }));
        }
        return Promise.all(extras).then(function(fails) { r.failed = fails.filter(Boolean); return r; });
      });
    },
    // BT-5 hand-off: a released beat starts a beat-video post (one per beat
    // that is not posted yet).
    fromBeat: function(beat) {
      var L = RPGACE.modules.postingHub.logic;
      return L.read('select=id,title,stage&beat_id=eq.' + beat.id + '&stage=neq.posted&limit=1').then(function(have) {
        if (have && have[0]) return have[0];
        var row = { title: String((beat.title || 'Beat') + ' — video').slice(0, 120), kind: 'beat_video', stage: 'idea', beat_id: beat.id, realms: ['creator'] };
        return RPGACE.sb.secureWrite('posts', 'insert', row).then(function(d) {
          var saved = Array.isArray(d) && d[0];
          if (!saved || !saved.id) throw new Error('The post was not saved (no id came back)');
          return saved;
        });
      });
    },
    // Pure: links in a chat message that look like his own posts.
    chatLinks: function(text) {
      var L = RPGACE.modules.postingHub.logic, out = [], seen = {};
      (String(text || '').match(/https?:\/\/[^\s<>"')]+/g) || []).forEach(function(u) {
        u = u.replace(/[.,;!?]+$/, '');
        var pl = L.placeOf(u);
        if (pl !== 'Other' && !seen[u]) { seen[u] = 1; out.push({ place: pl, url: u }); }
      });
      return out;
    },
    patchChat: function() {
      if (typeof window.sendChat !== 'function' || window._postingLinkPatched) return;
      window._postingLinkPatched = true;
      var orig = window.sendChat;
      window.sendChat = function() {
        var inp = document.getElementById('chat-input'), links = [];
        try { links = RPGACE.modules.postingHub.logic.chatLinks(inp ? inp.value : ''); } catch (e) {}
        var res = orig.apply(this, arguments);
        if (links.length) setTimeout(function() { RPGACE.modules.postingHub.ui.offerLinkSave(links); }, 300);
        return res;
      };
    },
    // ── PC-5 (Oct 17 2026): weekly post target + Due nudges ──────────
    TARGET_DEFAULT: 2,
    STALE_PLANNED_DAYS: 7,
    STALE_READY_DAYS: 2,
    // Local YYYY-MM-DD (UK week, Monday start - same week the XP uses).
    isoDay: function(d) { d = d ? new Date(d) : new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    weekStart: function(isoDay) { var d = new Date(isoDay + 'T12:00:00'), dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return RPGACE.modules.postingHub.logic.isoDay(d); },
    loadTarget: function() {
      var L = RPGACE.modules.postingHub.logic, tp = RPGACE.modules.tripPlans;
      if (!tp) return Promise.resolve(L.TARGET_DEFAULT);
      return tp.logic.read('xp_settings', 'select=posts_per_week&id=eq.1').then(function(r) {
        var v = r && r[0] ? r[0].posts_per_week : null;
        return v == null ? L.TARGET_DEFAULT : Number(v);
      }, function() { return L.TARGET_DEFAULT; });
    },
    saveTarget: function(n) {
      n = Math.round(Number(n));
      if (!(n >= 0 && n <= 14)) return Promise.reject(new Error('Pick 0 to 14 posts a week'));
      return RPGACE.sb.secureWrite('xp_settings', 'update', { posts_per_week: n, updated_at: new Date().toISOString() }, 'id=eq.1').then(function() { return n; });
    },
    // Pure: this week's posted count against the target.
    weekStatus: function(posts, target, today) {
      var L = RPGACE.modules.postingHub.logic, ws = L.weekStart(today);
      var end = new Date(ws + 'T12:00:00'); end.setDate(end.getDate() + 7);
      var we = L.isoDay(end);
      var done = (posts || []).filter(function(p) { if (!p.posted_at) return false; var d = L.isoDay(p.posted_at); return d >= ws && d < we; }).length;
      var dow = (new Date(today + 'T12:00:00').getDay() + 6) % 7;
      return { done: done, target: Number(target) || 0, daysLeft: 7 - dow, left: Math.max(0, (Number(target) || 0) - done), hit: (Number(target) || 0) > 0 && done >= target, dow: dow };
    },
    weekLine: function(st) {
      if (!st || !st.target) return '';
      if (st.hit) return '✅ ' + st.done + ' of ' + st.target + ' posts this week';
      return st.done + ' of ' + st.target + ' post' + (st.target === 1 ? '' : 's') + ' this week · ' + st.daysLeft + ' day' + (st.daysLeft === 1 ? '' : 's') + ' left';
    },
    // Pure: the Due rows (behind from Thursday, stale planned, ready not posted).
    due: function(posts, target, today, now) {
      var L = RPGACE.modules.postingHub.logic, out = [], st = L.weekStatus(posts, target, today);
      var age = function(x) { return x ? Math.floor(((now || Date.now()) - new Date(x).getTime()) / 864e5) : 0; };
      if (st.target && !st.hit && st.dow >= 3) out.push({ kind: 'behind', icon: '📣', hot: st.dow >= 5,
        text: st.left + ' more post' + (st.left === 1 ? '' : 's') + ' to hit this week\'s ' + st.target, sub: L.weekLine(st) });
      (posts || []).forEach(function(p) {
        if (p.stage === 'editing' && p.ready_at && !p.posted_at && age(p.ready_at) >= L.STALE_READY_DAYS)
          out.push({ kind: 'ready', post: p, icon: '📣', text: '"' + p.title + '" is ready — post it?', sub: 'Ready ' + age(p.ready_at) + ' days' });
        else if (p.stage === 'planned' && age(p.planned_at || p.updated_at) >= L.STALE_PLANNED_DAYS)
          out.push({ kind: 'planned', post: p, icon: '📝', text: '"' + p.title + '" has been planned for ' + age(p.planned_at || p.updated_at) + ' days', sub: 'Record it, or drop it' });
      });
      return out.slice(0, 4);
    },
    loadDue: function(today) {
      var L = RPGACE.modules.postingHub.logic;
      return Promise.all([L.read('select=id,title,stage,kind,realms,planned_at,ready_at,posted_at,updated_at&stage=in.(planned,editing,posted)&order=updated_at.desc&limit=200'), L.loadTarget()])
        .then(function(r) { return L.due(r[0] || [], r[1], today, Date.now()); });
    },
    // ── PC-7 (Oct 17 2026): Chronicles entry + stage-by-stage report ──
    // Pure: "Posted: <title> — YouTube, TikTok".
    chronicleLabel: function(post) {
      var seen = {}, places = [];
      RPGACE.modules.postingHub.logic.linksOf(post).forEach(function(l) { if (!seen[l.place]) { seen[l.place] = 1; places.push(l.place); } });
      return 'Posted: ' + (post.title || 'post') + (places.length ? ' — ' + places.join(', ') : '');
    },
    // Pure: finished Doing Now rows linked to this post, oldest first.
    sessionsFor: function(post, doing) {
      return (doing || []).filter(function(r) { var lk = r && r.details && r.details.link; return lk && lk.kind === 'posts' && lk.id === post.id; })
        .sort(function(a, b) { return new Date(a.started_at) - new Date(b.started_at); });
    },
    // Pure: time between two moments, in words ("" when unknown).
    gap: function(a, b) {
      if (!a || !b) return '';
      var h = (new Date(b) - new Date(a)) / 3600000;
      if (!(h >= 0)) return '';
      if (h < 1) return 'under an hour';
      if (h < 24) return Math.round(h) + 'h';
      var d = Math.round(h / 24);
      return d + ' day' + (d === 1 ? '' : 's');
    },
    // Pure: [label, lines[]] per stage - what was done, when, how long.
    // A line is text, or { text, url } for a link. The caller escapes.
    report: function(post, doing, idea) {
      var L = RPGACE.modules.postingHub.logic, bh = RPGACE.modules.beatsHub;
      var fm = bh ? bh.logic.fmtMins : function(m) { return Math.round(m) + ' min'; };
      var day = function(iso) { return iso ? String(iso).slice(0, 10) : ''; };
      var after = function(a, b, what) { var g = L.gap(a, b); return g ? ' (' + g + ' ' + what + ')' : ''; };
      var k = L.KINDS[post.kind] || { icon: '📣', name: 'Post' }, plan = post.plan || {}, files = post.files || {};
      var sess = L.sessionsFor(post, doing), rows = [];
      rows.push(['Type', [k.icon + ' ' + k.name]]);
      var start = (idea && idea.created_at) || post.created_at;
      rows.push(['💡 Idea', idea
        ? ['Idea logged ' + day(idea.created_at) + (idea.title ? ': ' + idea.title : ''), 'Post started ' + day(post.created_at) + after(idea.created_at, post.created_at, 'later')]
        : ['Post started ' + day(post.created_at)]]);
      var pl = [];
      if (post.planned_at) pl.push('Planned ' + day(post.planned_at) + after(post.created_at, post.planned_at, 'after starting'));
      if (plan.hook) pl.push('Hook: ' + plan.hook);
      var plats = (post.platforms || []).join(', ');
      if (plats) pl.push('For: ' + plats);
      rows.push(['📝 Plan', pl.length ? pl : ['No plan saved']]);
      [['record', '🎥 Record', 'record_mins', 'recording'], ['edit', '✂️ Edit', 'edit_mins', 'editing']].forEach(function(st) {
        var mine = sess.filter(function(r) { return (r.details.stage === 'edit' ? 'edit' : 'record') === st[0]; });
        var lines = mine.map(function(r) { return day(r.started_at) + ' · ' + fm(Number(r.actual_mins) || 0); });
        var tot = Number(post[st[2]]) || 0;
        if (tot) lines.push('Total ' + fm(tot) + ' ' + st[3] + (mine.length > 1 ? ' over ' + mine.length + ' sessions' : ''));
        rows.push([st[1], lines.length ? lines : ['No ' + st[3] + ' sessions logged']]);
      });
      var rd = [];
      if (post.ready_at) rd.push('Ready ' + day(post.ready_at));
      if (files.video) rd.push('Video: ' + [files.video.name, files.video.path].filter(Boolean).join(' — '));
      if (files.beat) rd.push('Beat: ' + [files.beat.name, files.beat.path].filter(Boolean).join(' — '));
      rows.push(['✅ Ready', rd.length ? rd : ['Not marked ready (went straight to posting)']]);
      var po = ['Posted ' + day(post.posted_at) + after(post.ready_at || post.planned_at || post.created_at, post.posted_at, post.ready_at ? 'after ready' : 'later')];
      L.linksOf(post).forEach(function(l) { po.push({ text: l.place, url: l.url }); });
      rows.push(['📣 Posted', po]);
      var work = (Number(post.record_mins) || 0) + (Number(post.edit_mins) || 0), tl = [];
      if (work) tl.push(fm(work) + ' of recording and editing');
      var whole = L.gap(start, post.posted_at);
      if (whole) tl.push((idea ? 'Idea' : 'Start') + ' to posted: ' + whole);
      rows.push(['⏱ Totals', tl.length ? tl : ['—']]);
      return rows;
    },
    create: function(title, kind, realms) {
      var v = RPGACE.modules.postingHub.logic.newRow(title, kind, realms);
      if (v.error) return Promise.reject(new Error(v.error));
      return RPGACE.sb.secureWrite('posts', 'insert', v.row).then(function(d) {
        var saved = Array.isArray(d) && d[0];
        if (!saved || !saved.id) throw new Error('The post was not saved (no id came back)');
        return saved;
      });
    }
  },

  // ============================================================
  // ui
  // ============================================================
  ui: {
    css: function() {
      var kh = RPGACE.modules.knowledgeHub;
      var base = kh ? kh.ui.CSS.replace(/kh-/g, 'ph-').replace(/--blue/g, '--purple') : '';
      return base + '@media (min-width:760px){.ph-steps{grid-template-columns:repeat(3,1fr)}.ph-arrow{display:none}}' +
        '.ph-new{display:block;width:100%;min-height:44px;margin:0 0 10px;border-radius:10px;border:1px solid var(--purple);background:color-mix(in srgb,var(--purple) 14%,var(--panel));color:var(--text);font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}' +
        '.ph-list{display:flex;flex-direction:column;gap:6px;margin:0 0 12px}' +
        '.ph-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--panel)}' +
        '.ph-row-tx{flex:1;min-width:0}.ph-row-t{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ph-row-s{font-size:12px;color:var(--muted)}' +
        '.ph-row-go{min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid var(--purple);background:none;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}' +
        '.ph-later{opacity:.6}' +
        '.ph-types{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}' +
        '.ph-type{min-height:52px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:14px;cursor:pointer;font-family:inherit}' +
        '.ph-type[aria-pressed="true"]{border-color:var(--purple);background:color-mix(in srgb,var(--purple) 18%,var(--panel));font-weight:700}';
    },

    injectPage: function() {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || document.getElementById('page-' + P.posting)) return;
      var app = document.getElementById('app');
      if (!app) return;
      this._css();
      var page = document.createElement('div');
      page.className = 'page';
      page.id = 'page-' + P.posting;
      page.innerHTML = '<div class="section-title">📣 Posting</div>' +
        '<div id="ph-bar"></div><div id="ph-week" class="ph-week"></div><button type="button" id="ph-new" class="ph-new">＋ New post</button>' +
        '<div id="ph-next"></div><div id="ph-steps" class="ph-steps"></div>';
      app.appendChild(page);
      page.querySelector('#ph-new').onclick = function() { RPGACE.modules.postingHub.ui.newPost(); };
    },

    // A step that is still being built says so (never a silent button).
    soon: function(what, step) {
      RPGACE.utils.toast(what + ' comes in ' + step + ' of the Posting plan', 'var(--gold)', 2600);
    },
    act: function(post) {
      var U = RPGACE.modules.postingHub.ui;
      if (post.stage === 'idea') { U.openPlan(post.id); return; }
      if (post.stage === 'editing' && post.ready_at) { U.openPost(post.id); return; }
      if (post.stage === 'planned' || post.stage === 'recording') { U.start(post, 'record'); return; }
      if (post.stage === 'editing') U.start(post, 'edit');
    },

    render: function() {
      var H = RPGACE.modules.postingHub, U = H.ui;
      var bar = document.getElementById('ph-bar'), next = document.getElementById('ph-next'), steps = document.getElementById('ph-steps');
      if (!bar || !next || !steps) return;
      bar.replaceWith(Object.assign(RPGACE.areaNav.bar('posting', { isHub: true }), { id: 'ph-bar' }));
      next.textContent = 'Loading…';
      H.logic.load().then(function(m) { H._model = m; U.renderWeek(m); U.renderNext(m); U.renderSteps(m); })
        .catch(function(e) { next.textContent = '⚠️ Could not load posts: ' + (e && e.message || e); });
    },

    renderNext: function(m) {
      var L = RPGACE.modules.postingHub.logic, U = RPGACE.modules.postingHub.ui, el = document.getElementById('ph-next');
      // RF-4: the shared What's next (areaNav.next), rows keep the ph- classes.
      RPGACE.areaNav.next(el, m.next.map(function(n) {
        var k = L.KINDS[n.post.kind] || { icon: '📣', name: '' }, tl = L.timeLine(n.post);
        return { id: n.post.id, icon: k.icon, title: n.post.title, open: function() { U.openPlan(n.post.id); },
          sub: k.name + ' · ' + (n.state === 'ready' ? 'ready to post' : n.post.stage) + (tl ? ' · ' + tl : ''),
          go: [n.icon + ' ' + n.verb, function() { U.act(n.post); }],
          // PC-3: a post being recorded can move on to editing.
          extra: n.post.stage === 'recording' ? [['✂️ Edit it', function() { U.start(n.post, 'edit'); }]] : [] };
      }), { cls: 'ph', open: true, empty: m.total ? 'Everything is posted. Start a new one.' : 'No posts yet — tap ＋ New post to start one.' });
    },

    renderSteps: function(m) {
      var el = document.getElementById('ph-steps');
      if (!el) return;
      var U = RPGACE.modules.postingHub.ui, c = m.counts, n = function(x, w) { return x + ' ' + w + (x === 1 ? '' : 's'); };
      // UI Debloat: shared tiles. A stage tile lists its posts; tap one to open it.
      var list = function(stage, icon, fn) {
        return (m.byStage ? m.byStage(stage) : []).slice(0, 8).map(function(p) { return [icon + ' ' + String(p.title || 'Untitled').slice(0, 40), function() { fn(p); }]; });
      };
      var openPlan = function(p) { U.openPlan(p.id); };
      var STEPS = [
        { n: 1, name: '💡 Idea', count: n(c.idea, 'post') + ' · ' + n(m.ideas, 'idea') + ' banked', btns: [['💡 Post ideas', 'ideas']].concat(list('idea', '📝', openPlan)) },
        { n: 2, name: '📝 Plan', count: n(c.planned, 'post') + ' planned', btns: list('planned', '📝', openPlan) },
        { n: 3, name: '🎥 Record', count: c.recording + ' recording', btns: list('recording', '🎥', openPlan) },
        { n: 4, name: '✂️ Edit', count: c.editing + ' editing', btns: list('editing', '✂️', openPlan) },
        { n: 5, name: '✅ Post', count: c.posted + ' posted · ' + m.postedWeek + ' this week',
          btns: (m.recent || []).map(function(pp) {
            var places = RPGACE.modules.postingHub.logic.linksOf(pp).map(function(l) { return l.place; });
            return ['✅ ' + String(pp.title).slice(0, 34) + (places.length ? ' — ' + places.join(', ') : '') + ' · + link', function() { U.openPost(pp.id); }];
          }) }
      ];
      RPGACE.areaNav.steps(el, STEPS, function(b) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'ph-btn';
        if (typeof b[1] === 'string') bt.dataset.go = b[1];
        bt.textContent = b[0];
        bt.onclick = typeof b[1] === 'function' ? b[1] : function() { U.go(b[1]); };
        return bt;
      }, 'ph-step');
    },

    // Destinations from Posting home (recorded for ← Back).
    go: function(key) {
      var dd = RPGACE.modules.dashDeck;
      if (key === 'ideas') {
        RPGACE.areaNav._via = { slug: RPGACE.CONFIG.pages.ideaBank, area: 'posting', at: Date.now() };
        RPGACE.areaNav.visit('posting', { key: 'ideas', label: 'Idea Bank', open: function() { RPGACE.modules.postingHub.ui.go('ideas'); } });
        dd._openPage('cp-idea-bank', { after: function() {
          var b = document.querySelector('#cp-idea-bank [data-filter="📣 Posts"]');
          if (b) b.click();
        } });
      }
    },

    // PC-1: beat / post chooser (post shows its type). Shared by the Idea
    // Bank's save pop-up and the retag pop-up. Returns { el, get }.
    kindChooser: function(kind, postType) {
      var L = RPGACE.modules.postingHub.logic;
      var st = { kind: kind === 'post' ? 'post' : 'beat', post_type: L.KINDS[postType] ? postType : 'clip' };
      var el = document.createElement('div'); el.className = 'ph-kind';
      el.style.cssText = 'margin:0 0 12px';
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;';
      var types = document.createElement('div'); types.className = 'ph-types';
      var press = function(box, val, attr) { box.querySelectorAll('button').forEach(function(x) { x.setAttribute('aria-pressed', x.dataset[attr] === val ? 'true' : 'false'); }); };
      var paint = function() { press(row, st.kind, 'k'); press(types, st.post_type, 'kind'); types.hidden = st.kind !== 'post'; };
      [['beat', '🥁 Beat'], ['post', '📣 Post']].forEach(function(o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-type'; b.dataset.k = o[0]; b.textContent = o[1];
        b.style.flex = '1';
        b.onclick = function() { st.kind = o[0]; paint(); };
        row.appendChild(b);
      });
      L.KIND_ORDER.forEach(function(k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-type'; b.dataset.kind = k;
        b.textContent = L.KINDS[k].icon + ' ' + L.KINDS[k].name;
        b.onclick = function() { st.post_type = k; paint(); };
        types.appendChild(b);
      });
      el.appendChild(row); el.appendChild(types);
      RPGACE.modules.postingHub.ui._css();
      paint();
      return { el: el, get: function() { return { kind: st.kind, post_type: st.kind === 'post' ? st.post_type : null }; } };
    },
    _css: function() {
      if (document.getElementById('ph-css')) return;
      var st = document.createElement('style'); st.id = 'ph-css'; st.textContent = this.css();
      document.head.appendChild(st);
    },
    // PC-1: the tag on an Idea Bank card; tapping it retags the idea.
    kindTag: function(row, after) {
      var L = RPGACE.modules.postingHub.logic, U = RPGACE.modules.postingHub.ui;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cp-kind-tag';
      var isPost = row.kind === 'post', k = L.KINDS[row.post_type];
      b.textContent = (isPost ? '📣 ' + (k ? k.name : 'Post') : '🥁 Beat') + ' ↔';
      b.title = 'Change beat / post';
      b.style.cssText = 'min-height:32px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:none;color:var(--muted);font-size:11px;cursor:pointer;font-family:inherit;flex-shrink:0;';
      b.onclick = function(e) {
        e.stopPropagation();
        if (row.status === 'making' || row.status === 'done' || row.status === 'in_post' || row.status === 'posted') {
          RPGACE.utils.toast('This idea is already ' + (row.status === 'in_post' || row.status === 'posted' ? 'a post' : 'a beat') + ' — it keeps its tag', 'var(--gold)', 2600);
          return;
        }
        var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '💡 Idea Bank', title: 'Beat or post?', accent: 'var(--purple)', width: '420px', closeLabel: 'Cancel' });
        var ch = U.kindChooser(row.kind, row.post_type);
        var sv = document.createElement('button'); sv.type = 'button'; sv.id = 'ph-retag-save'; sv.className = 'ph-new'; sv.textContent = 'Save';
        sv.onclick = function() {
          var g = ch.get(), upd = L.retagUpdate(g.kind, g.post_type);
          sv.disabled = true;
          RPGACE.sb.secureWrite('conid_pot', 'update', upd, 'id=eq.' + row.id).then(function() {
            pop.close();
            if (after) after();
          }, function(x) { sv.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (x && x.message || x), '#CC4A4A', 4000, 'postingHub'); });
        };
        pop.box.appendChild(ch.el); pop.box.appendChild(sv);
      };
      return b;
    },

    // PC-2: the plan screen (hook, script, shots, platforms + captions,
    // beat + AI hand-off for beat videos). Nothing saves until Save / Done.
    openPlan: function(postOrId) {
      var H = RPGACE.modules.postingHub, L = H.logic, U = H.ui;
      var load = typeof postOrId === 'string' ? L.loadPost(postOrId) : Promise.resolve(postOrId);
      var k0 = postOrId && postOrId.kind ? L.KINDS[postOrId.kind] : null;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📣 Posting · Plan', title: '📝 Plan', accent: 'var(--purple)', width: '560px', closeLabel: 'Close' });
      var box = document.createElement('div'); box.id = 'ph-plan'; box.textContent = 'Loading…';
      pop.box.appendChild(box);
      U._css();
      load.then(function(post) {
        return Promise.all([post, post.kind === 'beat_video' ? L.loadBeats() : [],
          post.idea_id ? Promise.resolve(RPGACE.sb.select('conid_pot', 'select=idea_text&id=eq.' + post.idea_id + '&limit=1')).catch(function() { return []; }) : []]);
      }).then(function(r) {
        var post = r[0], beats = r[1] || [], ideaText = r[2] && r[2][0] ? r[2][0].idea_text : '';
        var k = L.KINDS[post.kind] || { icon: '📣', name: 'Post' }, st = L.STARTERS[post.kind] || L.STARTERS.clip;
        var pl = post.plan || {}, caps = Object.assign({}, post.captions || {});
        box.textContent = '';
        var css = 'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;';
        var lbl = function(t, forId) { var l = document.createElement('label'); l.textContent = t; if (forId) l.htmlFor = forId; l.style.cssText = 'display:block;font-size:12px;color:var(--muted);margin:10px 0 4px;letter-spacing:.5px'; return l; };
        var head = document.createElement('div'); head.className = 'ph-plan-head'; head.style.cssText = 'font-weight:700;font-size:15px;margin-bottom:4px';
        head.textContent = k.icon + ' ' + post.title + ' · ' + k.name;
        box.appendChild(head);
        // Beat (beat videos)
        var beatSel = null;
        if (post.kind === 'beat_video') {
          box.appendChild(lbl('Which beat?', 'ph-plan-beat'));
          beatSel = document.createElement('select'); beatSel.id = 'ph-plan-beat'; beatSel.style.cssText = css + 'min-height:44px';
          var o0 = document.createElement('option'); o0.value = ''; o0.textContent = beats.length ? '— pick a logged beat —' : 'No logged beats yet'; beatSel.appendChild(o0);
          beats.forEach(function(b) { var o = document.createElement('option'); o.value = b.id; o.textContent = L.beatLine(b) || b.title; beatSel.appendChild(o); });
          beatSel.value = post.beat_id || '';
          box.appendChild(beatSel);
          // PC-7: jump to the chosen beat.
          if (RPGACE.modules.beatsHub) {
            var ob = document.createElement('button'); ob.type = 'button'; ob.className = 'ph-open-beat';
            ob.textContent = '🥁 Open beat';
            ob.style.cssText = 'margin-top:6px;min-height:44px;padding:8px 14px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-weight:700;cursor:pointer;font-family:inherit;';
            var syncOb = function() { ob.hidden = !beatSel.value; };
            beatSel.addEventListener('change', syncOb); syncOb();
            ob.onclick = function() { if (!beatSel.value) return; pop.close(); RPGACE.modules.beatsHub.ui.openBeat(beatSel.value); };
            box.appendChild(ob);
          }
        }
        var beatNow = function() { var id = beatSel && beatSel.value; return beats.filter(function(b) { return b.id === id; })[0] || null; };
        var area = function(id, val, ph, rows) { var t = document.createElement(rows ? 'textarea' : 'input'); t.id = id; if (rows) t.rows = rows; else t.type = 'text'; t.value = val || ''; t.placeholder = ph; t.style.cssText = css + (rows ? 'resize:vertical' : 'min-height:44px'); return t; };
        box.appendChild(lbl('Hook', 'ph-plan-hook'));
        var hook = area('ph-plan-hook', pl.hook, st.hook); box.appendChild(hook);
        box.appendChild(lbl('Script / talking points', 'ph-plan-script'));
        var script = area('ph-plan-script', pl.script, st.script, 5); box.appendChild(script);
        box.appendChild(lbl('Shot list (one per line)', 'ph-plan-shots'));
        var shots = area('ph-plan-shots', (pl.shots || []).join('\n'), st.shots, 5); box.appendChild(shots);
        var btn = function(id, t, cls) { var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = cls || 'ph-row-go'; b.textContent = t; return b; };
        var draft = btn('ph-plan-draft', '🔮 Draft with Oracle'); draft.style.marginTop = '8px';
        draft.onclick = function() {
          var empty = !hook.value.trim() && !script.value.trim() && !shots.value.trim();
          if (!empty && draft.dataset.armed !== '1') { draft.dataset.armed = '1'; draft.textContent = '🔮 Replace what you wrote? Tap again'; setTimeout(function() { draft.dataset.armed = ''; draft.textContent = '🔮 Draft with Oracle'; }, 3000); return; }
          draft.dataset.armed = ''; draft.disabled = true; draft.textContent = '🔮 Drafting…';
          RPGACE.modules.phylumPath._callGroundWorkerJSON(L.draftPrompt(post, ideaText, beatNow()), 700).then(function(j) {
            var c = L.cleanPlan(j);
            hook.value = c.hook; script.value = c.script; shots.value = c.shots.join('\n');
            RPGACE.utils.toast('🔮 Draft in the boxes — edit, then Save', 'var(--gold)', 2600);
          }, function(e) { RPGACE.utils.toast('⚠️ Draft failed: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); })
            .then(function() { draft.disabled = false; draft.textContent = '🔮 Draft with Oracle'; });
        };
        box.appendChild(draft);
        // Platforms + captions
        box.appendChild(lbl('Platforms'));
        var pRow = document.createElement('div'); pRow.className = 'ph-plats'; pRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
        var on = (post.platforms || []).slice(), capBox = document.createElement('div'); capBox.id = 'ph-plan-caps';
        var readCaps = function() { capBox.querySelectorAll('textarea').forEach(function(t) { caps[t.dataset.p] = t.value; }); };
        var drawCaps = function() {
          readCaps(); capBox.textContent = '';
          L.PLATFORMS.filter(function(x) { return on.indexOf(x) > -1; }).forEach(function(pn) {
            capBox.appendChild(lbl(pn + ' caption', 'ph-cap-' + pn));
            var t = area('ph-cap-' + pn, caps[pn], 'Caption for ' + pn, 3); t.dataset.p = pn; capBox.appendChild(t);
          });
        };
        L.PLATFORMS.forEach(function(pn) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-type'; b.dataset.plat = pn; b.textContent = pn;
          b.style.minHeight = '44px'; b.style.padding = '0 14px';
          var paint = function() { b.setAttribute('aria-pressed', on.indexOf(pn) > -1 ? 'true' : 'false'); };
          b.onclick = function() { var i = on.indexOf(pn); if (i > -1) on.splice(i, 1); else on.push(pn); paint(); drawCaps(); };
          paint(); pRow.appendChild(b);
        });
        box.appendChild(pRow);
        var capBtn = btn('ph-plan-captions', '✍️ Write captions'); capBtn.style.marginTop = '8px';
        capBtn.onclick = function() {
          var plats = L.cleanPlatforms(on);
          if (!plats.length) { RPGACE.utils.toast('Tick a platform first', 'var(--gold)', 2200); return; }
          capBtn.disabled = true; capBtn.textContent = '✍️ Writing…';
          RPGACE.modules.phylumPath._callGroundWorkerJSON(L.captionPrompt(post, L.cleanPlan({ hook: hook.value, script: script.value }), plats, beatNow()), 600).then(function(j) {
            readCaps(); Object.assign(caps, L.cleanCaptions(j, plats)); capBox.textContent = ''; drawCaps();
          }, function(e) { RPGACE.utils.toast('⚠️ Captions failed: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); })
            .then(function() { capBtn.disabled = false; capBtn.textContent = '✍️ Write captions'; });
        };
        box.appendChild(capBtn); box.appendChild(capBox); drawCaps();
        var fv, fb;
        var fields = function() { readCaps(); var f = { hook: hook.value, script: script.value, shots: shots.value, platforms: on, captions: caps, beat_id: beatSel ? beatSel.value || null : null };
          if (fv) f.files = { video: fv._get(), beat: fb ? fb._get() : (post.files || {}).beat }; return f; };
        // AI hand-off (beat videos)
        if (post.kind === 'beat_video') {
          box.appendChild(lbl('AI video'));
          var hs = document.createElement('div'); hs.id = 'ph-plan-handoff'; hs.className = 'ph-row-s';
          var hb = btn('ph-plan-handoff-go', '🤖 AI video hand-off');
          var showJob = function(jobId) {
            hs.textContent = 'Sent to the AI video queue — checking status…';
            L.handoffStatus(jobId).then(function(j) { hs.textContent = j ? 'AI video: ' + j.status + (j.output_note ? ' — ' + String(j.output_note).slice(0, 140) : '') : 'Sent (status not readable right now)'; });
          };
          if (pl.handoff && pl.handoff.job_id) { showJob(pl.handoff.job_id); hb.textContent = '🤖 Send again'; } else hs.textContent = 'Sends this plan + the beat to the OpenMontage queue.';
          hb.onclick = function() {
            var f = fields(), b = beatNow(), c = L.cleanPlan(f);
            if (!b) { RPGACE.utils.toast('Pick the beat first', 'var(--gold)', 2400); return; }
            if (!c.hook && !c.script) { RPGACE.utils.toast('Write a hook or a script first', 'var(--gold)', 2400); return; }
            hb.disabled = true;
            L.savePlan(post, f, false).then(function(saved) { post = saved; return L.handoff(post, c, b); }).then(function(job) {
              RPGACE.utils.toast('🤖 Sent to the AI video queue', 'var(--green)', 2400); showJob(job.id); hb.textContent = '🤖 Send again';
            }, function(e) { RPGACE.utils.toast('⚠️ Hand-off failed: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); })
              .then(function() { hb.disabled = false; });
          };
          box.appendChild(hb); box.appendChild(hs);
        }
        // PC-3: files — names + where they are (nothing is uploaded).
        box.appendChild(lbl('Files (name + where it is — nothing is uploaded)'));
        fv = U.fileFields('video', '🎬 Video', (post.files || {}).video);
        box.appendChild(fv);
        fb = null;
        if (post.kind === 'beat_video') {
          var bf0 = (post.files || {}).beat || L.beatFile(beatNow());
          fb = U.fileFields('beat', '🥁 Beat', bf0);
          box.appendChild(fb);
          if (beatSel) beatSel.addEventListener('change', function() {
            var bf = L.beatFile(beatNow()), n2 = document.getElementById('ph-file-beat-name'), p2 = document.getElementById('ph-file-beat-path');
            if (bf && n2 && !n2.value.trim()) n2.value = bf.name || '';
            if (bf && p2 && !p2.value.trim()) p2.value = bf.path || '';
          });
        }
        // Save / Done
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:16px';
        var sv = btn('ph-plan-save', '💾 Save', 'ph-new'); sv.style.margin = '0';
        var dn = btn('ph-plan-done', post.planned_at ? '✅ Save plan' : '✅ Plan done', 'ph-new'); dn.style.margin = '0';
        var finish = function(done) {
          sv.disabled = dn.disabled = true;
          L.savePlan(post, fields(), done).then(function(saved) {
            post = saved;
            RPGACE.utils.toast(done && saved.stage === 'planned' && !r[0].planned_at ? '✅ Planned · +60 Creator XP' : '💾 Saved', 'var(--green)', 2400);
            if (done) pop.close();
            U.render();
          }, function(e) { RPGACE.utils.toast((/first|Tick/.test(e && e.message) ? '' : '⚠️ Not saved: ') + (e && e.message || e), (/first|Tick/.test(e && e.message) ? 'var(--gold)' : '#CC4A4A'), 3500, 'postingHub'); })
            .then(function() { sv.disabled = dn.disabled = false; });
        };
        sv.onclick = function() { finish(false); };
        dn.onclick = function() { finish(true); };
        row.appendChild(sv); row.appendChild(dn); box.appendChild(row);
      }).catch(function(e) { box.textContent = '⚠️ Could not open the plan: ' + (e && e.message || e); });
    },

    // ── PC-3: sessions, the two questions, "Which post?" ──────────────
    start: function(post, stage) {
      var H = RPGACE.modules.postingHub, L = H.logic;
      return L.startSession(post, stage).then(function(e) {
        RPGACE.utils.toast('▶ ' + L.STAGE_WORD[stage === 'edit' ? 'edit' : 'record'] + ': ' + String(post.title || '').slice(0, 40), 'var(--gold)', 2200);
        try { RPGACE.modules.doingNow.ui._refresh(); } catch (x) {}
        H.ui.render();
        return e;
      }, function(e) { RPGACE.utils.toast('⚠️ Could not start: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); });
    },
    _ask: function(id, title, lines, opts) {
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📣 Posting', title: title, width: '440px' });
      var box = document.createElement('div'); box.id = id; box.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      lines.forEach(function(t) { var n = document.createElement('div'); n.style.cssText = 'font-size:14px;color:var(--text);'; n.textContent = t; box.appendChild(n); });
      opts.forEach(function(o) {
        if (o.el) { box.appendChild(o.el); return; }
        var b = document.createElement('button'); b.type = 'button'; b.id = o.id; b.className = 'ph-new'; b.style.margin = '0'; b.textContent = o.label;
        b.onclick = function() { b.disabled = true; Promise.resolve(o.run()).then(function(ok) { if (ok !== false) pop.close(); else b.disabled = false; }, function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); }); };
        box.appendChild(b);
      });
      RPGACE.modules.postingHub.ui._css();
      pop.box.appendChild(box);
      return pop;
    },
    // Stopping a recording session.
    askRecordDone: function(post) {
      var H = RPGACE.modules.postingHub, U = H.ui;
      var toEditing = function() { return RPGACE.sb.secureWrite('posts', 'update', { stage: 'editing', updated_at: new Date().toISOString() }, 'id=eq.' + post.id); };
      var line = H.logic.timeLine(post);
      return U._ask('ph-rec-done', '🎥 Recording finished?', ['"' + post.title + '"' + (line ? ' — ' + line : '')], [
        { id: 'ph-rec-edit-now', label: '✂️ Yes — start editing now', run: function() { return toEditing().then(function() { post.stage = 'editing'; return U.start(post, 'edit'); }); } },
        { id: 'ph-rec-edit-later', label: '✓ Yes, edit later', run: function() { return toEditing().then(function() { RPGACE.utils.toast('✂️ Ready to edit: ' + post.title.slice(0, 40), 'var(--gold)', 2000); U.render(); }); } },
        { id: 'ph-rec-not-yet', label: 'Not yet', run: function() { U.render(); } }
      ]);
    },
    // Two text boxes: a file's name + where it is (nothing is uploaded).
    fileFields: function(prefix, label, val) {
      var wrap = document.createElement('div'); wrap.className = 'ph-file'; wrap.dataset.file = prefix;
      var css = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;margin-top:4px';
      var l = document.createElement('div'); l.textContent = label; l.style.cssText = 'font-size:12px;color:var(--muted);margin-top:8px';
      var n = document.createElement('input'); n.type = 'text'; n.id = 'ph-file-' + prefix + '-name'; n.maxLength = 200; n.placeholder = 'File name, e.g. final_v2.mp4'; n.value = (val && val.name) || ''; n.style.cssText = css;
      var pth = document.createElement('input'); pth.type = 'text'; pth.id = 'ph-file-' + prefix + '-path'; pth.maxLength = 400; pth.placeholder = 'Where it is, e.g. Samsung T7 / Videos/2026'; pth.value = (val && val.path) || ''; pth.style.cssText = css;
      n.setAttribute('aria-label', label + ' file name'); pth.setAttribute('aria-label', label + ' location');
      wrap.appendChild(l); wrap.appendChild(n); wrap.appendChild(pth);
      wrap._get = function() { return { name: n.value, path: pth.value }; };
      return wrap;
    },
    // Stopping an editing session.
    askReadyToPost: function(post) {
      var H = RPGACE.modules.postingHub, L = H.logic, U = H.ui;
      var files = post.files || {}, vid = U.fileFields('video', '🎬 Final video', files.video);
      var line = L.timeLine(post);
      return U._ask('ph-ready', '📣 Ready to post?', ['"' + post.title + '"' + (line ? ' — ' + line : ''), 'Where is the finished video? (only its name and place are saved)'], [
        { el: vid },
        { id: 'ph-ready-yes', label: '📣 Yes — ready to post', run: function() {
          var upd = L.readyUpdate(post, { video: vid._get() });
          return RPGACE.sb.secureWrite('posts', 'update', upd, 'id=eq.' + post.id).then(function() { RPGACE.utils.toast('📣 Ready to post: ' + post.title.slice(0, 40), 'var(--green)', 2200); U.render(); });
        } },
        { id: 'ph-ready-not-yet', label: 'Not yet — more editing', run: function() {
          var f = L.cleanFiles(Object.assign({}, files, { video: vid._get() }));
          var p2 = Object.keys(f).length ? RPGACE.sb.secureWrite('posts', 'update', { files: f, updated_at: new Date().toISOString() }, 'id=eq.' + post.id) : Promise.resolve();
          return p2.then(function() { U.render(); });
        } }
      ]);
    },
    // A Creator session started from Doing Now: which post is it for?
    offerPost: function(entry) {
      var H = RPGACE.modules.postingHub, L = H.logic, U = H.ui, dn = RPGACE.modules.doingNow;
      return L.read('select=id,title,kind,stage,realms,record_mins,edit_mins,ready_at&stage=in.(planned,recording,editing)&order=updated_at.desc&limit=20').then(function(rows) {
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) return null;
        var opts = rows.map(function(p) {
          var row = document.createElement('div'); row.className = 'ph-which-row';
          row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:1px solid var(--border);border-radius:10px;padding:8px 10px;';
          var t = document.createElement('div'); t.style.cssText = 'flex:1 1 160px;font-size:14px;font-weight:600;color:var(--text);';
          var tl = L.timeLine(p); t.textContent = String(p.title).slice(0, 60) + (tl ? ' · ' + tl : '');
          row.appendChild(t);
          [['record', '🎥 Recording'], ['edit', '✂️ Editing']].forEach(function(o) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-row-go ph-which-' + o[0]; b.textContent = o[1];
            b.onclick = function() {
              b.disabled = true;
              var d = Object.assign({}, entry.details || {}, L.postDetails(p, o[0]));
              entry.details = d;
              var next = L.stageFor(p, o[0]);
              dn.logic.patch(entry.id, { details: d }).then(function() {
                return next ? RPGACE.sb.secureWrite('posts', 'update', { stage: next, updated_at: new Date().toISOString() }, 'id=eq.' + p.id) : null;
              }).then(function() {
                pop.close();
                RPGACE.utils.toast('🔗 ' + L.STAGE_WORD[d.stage] + ': ' + d.link.title.slice(0, 40), 'var(--gold)', 2000);
                try { dn.ui._refresh(); } catch (x) {}
              }, function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ Could not link the post: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub'); });
            };
            row.appendChild(b);
          });
          return { el: row };
        });
        var pop = U._ask('ph-which', 'Which post?', ['"' + entry.title + '" — is it for a post? Its time adds up on that post.'],
          opts.concat([{ id: 'ph-which-none', label: 'Not for a post', run: function() {} }]));
        return pop;
      }, function() { return null; });
    },

    // ── PC-4: 📣 Post it — one link per platform ─────────────────────
    openPost: function(postOrId, preset) {
      var H = RPGACE.modules.postingHub, L = H.logic, U = H.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📣 Posting', title: '📣 Post it', accent: 'var(--purple)', width: '520px', closeLabel: 'Close' });
      var box = document.createElement('div'); box.id = 'ph-post'; box.textContent = 'Loading…';
      pop.box.appendChild(box); U._css();
      (typeof postOrId === 'string' ? L.loadPost(postOrId) : Promise.resolve(postOrId)).then(function(post) {
        box.textContent = '';
        var css = 'box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;';
        var head = document.createElement('div'); head.style.cssText = 'font-weight:700;font-size:15px;margin-bottom:6px';
        head.textContent = ((L.KINDS[post.kind] || {}).icon || '📣') + ' ' + post.title;
        box.appendChild(head);
        var have = L.linksOf(post);
        if (have.length) {
          var hv = document.createElement('div'); hv.className = 'ph-post-have'; hv.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:10px;font-size:13px';
          have.forEach(function(l) { var a = document.createElement('a'); a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '🔗 ' + l.place + ' — ' + l.url; a.style.cssText = 'color:var(--text);word-break:break-all'; hv.appendChild(a); });
          box.appendChild(hv);
        }
        var rows = document.createElement('div'); rows.id = 'ph-post-rows'; rows.style.cssText = 'display:flex;flex-direction:column;gap:8px';
        var addRow = function(place, url) {
          var r = document.createElement('div'); r.className = 'ph-post-row'; r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
          var sel = document.createElement('select'); sel.className = 'ph-post-place'; sel.style.cssText = css + 'flex:0 0 120px';
          sel.setAttribute('aria-label', 'Platform');
          L.LINK_PLACES.forEach(function(x) { var o = document.createElement('option'); o.value = x; o.textContent = x; sel.appendChild(o); });
          sel.value = place || 'Other';
          var inp = document.createElement('input'); inp.type = 'url'; inp.className = 'ph-post-url'; inp.placeholder = 'Paste the ' + (place || '') + ' link';
          inp.style.cssText = css + 'flex:1 1 200px;min-width:0'; inp.value = url || ''; inp.setAttribute('aria-label', 'Link');
          inp.addEventListener('input', function() { var g = L.placeOf(inp.value); if (g !== 'Other') sel.value = g; });
          r.appendChild(sel); r.appendChild(inp); rows.appendChild(r);
        };
        var donePlaces = have.map(function(l) { return l.place; });
        var planned = (post.platforms || []).filter(function(x) { return donePlaces.indexOf(x) < 0; });
        if (preset && preset.length) preset.forEach(function(l) { addRow(l.place, l.url); });
        else if (planned.length) planned.forEach(function(x) { addRow(x, ''); });
        else addRow(have.length ? 'Other' : 'YouTube', '');
        box.appendChild(rows);
        var more = document.createElement('button'); more.type = 'button'; more.id = 'ph-post-more'; more.className = 'ph-row-go'; more.textContent = '+ another platform';
        more.style.marginTop = '8px'; more.onclick = function() { addRow('Other', ''); };
        box.appendChild(more);
        var err = document.createElement('div'); err.className = 'ph-row-s'; err.hidden = true; err.style.color = '#CC4A4A'; box.appendChild(err);
        var save = document.createElement('button'); save.type = 'button'; save.id = 'ph-post-save'; save.className = 'ph-new'; save.style.marginTop = '14px';
        save.textContent = post.posted_at ? '🔗 Save links' : '📣 Mark posted';
        save.onclick = function() {
          var add = Array.prototype.map.call(rows.querySelectorAll('.ph-post-row'), function(r) { return { place: r.querySelector('.ph-post-place').value, url: r.querySelector('.ph-post-url').value }; });
          save.disabled = true; err.hidden = true;
          L.savePost(post, add).then(function(res) {
            pop.close();
            var msg = res.first ? '📣 Posted: ' + post.title.slice(0, 36) + ' · +300 Creator XP' : '🔗 ' + res.added.length + ' link' + (res.added.length === 1 ? '' : 's') + ' saved';
            if (res.beatReleased) msg += ' · beat released';
            RPGACE.utils.toast(msg, 'var(--green)', 2600);
            if (res.failed.length) RPGACE.utils.toast('⚠️ Saved, but: ' + res.failed.join('; '), '#CC4A4A', 5000, 'postingHub');
            U.render();
          }, function(e) {
            save.disabled = false; err.textContent = '⚠️ ' + (e && e.message || e); err.hidden = false;
            if (!/Not a full link|Add at least|Paste the link/.test(String(e && e.message))) RPGACE.utils.toast('⚠️ Links not saved: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub');
          });
        };
        box.appendChild(save);
      }).catch(function(e) { box.textContent = '⚠️ Could not open the post: ' + (e && e.message || e); });
      return pop;
    },
    // A link pasted into Oracle chat: "Save this link to which post?"
    offerLinkSave: function(links) {
      var H = RPGACE.modules.postingHub, L = H.logic, U = H.ui;
      return L.read('select=id,title,kind,stage,ready_at,posted_at,links,platforms,idea_id,beat_id&stage=in.(editing,posted,recording,planned)&order=updated_at.desc&limit=12').then(function(rows) {
        rows = (Array.isArray(rows) ? rows : []).filter(function(p) {
          var urls = L.linksOf(p).map(function(l) { return l.url; });
          return links.some(function(l) { return urls.indexOf(l.url) < 0; });
        });
        if (!rows.length) return null;
        rows.sort(function(a, b) { return (b.ready_at && !b.posted_at ? 1 : 0) - (a.ready_at && !a.posted_at ? 1 : 0); });
        var opts = rows.slice(0, 8).map(function(p) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-row-go ph-linksave-post'; b.dataset.id = p.id;
          b.style.cssText = 'text-align:left;min-height:44px';
          b.textContent = ((L.KINDS[p.kind] || {}).icon || '📣') + ' ' + p.title + (p.posted_at ? ' · posted' : p.ready_at ? ' · ready' : ' · ' + p.stage);
          b.onclick = function() { pop.close(); U.openPost(p, links); };
          return { el: b };
        });
        var pop = U._ask('ph-linksave', '🔗 Save this link to a post?', [links.map(function(l) { return l.place + ': ' + l.url; }).join('\n')],
          opts.concat([{ id: 'ph-linksave-no', label: 'Not my post', run: function() {} }]));
        return pop;
      }, function() { return null; });
    },

    // PC-5: "1 of 2 posts this week · 3 days left" + ⚙️ target.
    renderWeek: function(m) {
      var L = RPGACE.modules.postingHub.logic, U = RPGACE.modules.postingHub.ui, el = document.getElementById('ph-week');
      if (!el) return;
      el.textContent = '';
      el.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;font-size:14px;font-variant-numeric:tabular-nums';
      var t = document.createElement('span'); t.className = 'ph-week-line'; t.style.flex = '1 1 180px';
      t.textContent = m.target ? L.weekLine(m.week) : 'No weekly target';
      t.style.color = m.week && m.week.hit ? 'var(--green)' : 'var(--text)';
      var b = document.createElement('button'); b.type = 'button'; b.id = 'ph-target'; b.className = 'ph-row-go'; b.textContent = '⚙️ ' + (m.target ? m.target + ' a week' : 'Set target');
      b.onclick = function() { U.openTarget(m.target); };
      el.appendChild(t); el.appendChild(b);
    },
    openTarget: function(cur) {
      var L = RPGACE.modules.postingHub.logic, U = RPGACE.modules.postingHub.ui;
      var inp = document.createElement('input'); inp.type = 'number'; inp.id = 'ph-target-n'; inp.min = '0'; inp.max = '14'; inp.step = '1';
      inp.value = cur == null ? L.TARGET_DEFAULT : cur; inp.setAttribute('aria-label', 'Posts per week');
      inp.style.cssText = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:16px;font-family:inherit';
      U._ask('ph-target-box', '⚙️ Posts per week', ['How many posts a week? 0 turns the target off.'], [
        { el: inp },
        { id: 'ph-target-save', label: 'Save', run: function() {
          return L.saveTarget(inp.value).then(function(n) { RPGACE.utils.toast(n ? '📣 Target: ' + n + ' a week' : 'Weekly target off', 'var(--green)', 2000); U.render(); });
        } }
      ]);
    },
    // PC-5: the same week line on My Day (only when a target is set).
    myDayLine: function(panel) {
      var L = RPGACE.modules.postingHub.logic, tp = RPGACE.modules.tripPlans;
      if (!panel || !tp || !tp.logic.signedIn()) return;
      var box = document.createElement('div'); box.id = 'myday-posting';
      box.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:12px 0;';
      panel.appendChild(box);
      Promise.all([L.read('select=id,posted_at&stage=eq.posted&order=posted_at.desc&limit=60'), L.loadTarget()]).then(function(r) {
        if (!r[1]) { box.remove(); return; }
        var st = L.weekStatus(r[0] || [], r[1], L.isoDay());
        var t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:200px;font-size:14px;color:var(--text);font-variant-numeric:tabular-nums';
        var b0 = document.createElement('b'); b0.textContent = '📣 Posting'; t.appendChild(b0); t.appendChild(document.createElement('br'));
        var sp = document.createElement('span'); sp.className = 'myday-posting-line'; sp.style.fontSize = '13px'; sp.style.color = st.hit ? 'var(--green)' : 'var(--text)'; sp.textContent = L.weekLine(st);
        t.appendChild(sp);
        var o = document.createElement('button'); o.type = 'button'; o.className = 'ph-row-go'; o.id = 'myday-posting-open'; o.textContent = 'Open';
        o.onclick = function() { RPGACE.modules.postingHub.open(); };
        box.appendChild(t); box.appendChild(o);
      }).catch(function() { box.remove(); });
    },

    // + New post: title + type, then realms (Creator ticked by default).
    newPost: function() {
      var H = RPGACE.modules.postingHub, L = H.logic;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📣 Posting', title: 'New post', accent: 'var(--purple)', width: '440px', closeLabel: 'Cancel' });
      var box = pop.box, kind = null;
      var lab = document.createElement('label'); lab.htmlFor = 'ph-title'; lab.textContent = 'What is it?';
      lab.style.cssText = 'display:block;font-size:13px;color:var(--muted);margin-bottom:4px';
      var inp = document.createElement('input'); inp.id = 'ph-title'; inp.type = 'text'; inp.maxLength = 120;
      inp.placeholder = 'e.g. Cooking up a dark trap beat';
      inp.style.cssText = 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit';
      var types = document.createElement('div'); types.className = 'ph-types';
      L.KIND_ORDER.forEach(function(k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-type'; b.dataset.kind = k;
        b.setAttribute('aria-pressed', 'false');
        b.textContent = L.KINDS[k].icon + ' ' + L.KINDS[k].name;
        b.onclick = function() {
          kind = k;
          types.querySelectorAll('.ph-type').forEach(function(x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        };
        types.appendChild(b);
      });
      var save = document.createElement('button'); save.type = 'button'; save.id = 'ph-save'; save.className = 'ph-new';
      save.textContent = 'Next: pick realms →';
      save.onclick = function() {
        var v = L.newRow(inp.value, kind, ['creator']);
        if (v.error) { RPGACE.utils.toast(v.error, 'var(--gold)', 2400); return; }
        save.disabled = true;
        var pick = RPGACE.realmPicker ? RPGACE.realmPicker.pick({ what: 'post', title: v.row.title, preset: ['creator'] }) : Promise.resolve(null);
        pick.then(function(realms) {
          return L.create(v.row.title, kind, realms && realms.length ? realms : ['creator']);
        }).then(function(saved) {
          pop.close();
          RPGACE.utils.toast('📣 Post added: ' + saved.title.slice(0, 40), 'var(--green)', 2200);
          H.ui.render();
        }, function(e) {
          save.disabled = false;
          RPGACE.utils.toast('⚠️ Post not saved: ' + (e && e.message || e), '#CC4A4A', 4000, 'postingHub');
        });
      };
      box.appendChild(lab); box.appendChild(inp); box.appendChild(types); box.appendChild(save);
      setTimeout(function() { try { inp.focus(); } catch (e) {} }, 50);
    }
  }
});
/* ===END:postingHub=== */
