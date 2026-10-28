/* ===MODULE:sellingHub=== */
// Oct 17 2026 — SH-0 of the ratified plan "Selling (Hustler)"
// (records/2026-10/selling_hustler_ceo_plan_2026-10-17.txt). The Selling
// home page with Alex's two tracks: 🥁 Beats for sale (List -> Promote ->
// Sell -> Paid) and 🎤 Artist outreach (Find -> Pitch -> Follow up -> Deal
// -> Paid), live counts and a "what's next" list closest to money first.
// Data: private artists / pitches / pitch_sends (one row per artist per
// pitch; stage to_send -> potential_pitch (sent, no reply) ->
// potential_close (reply with pushback) or agreed_sale (no pushback) ->
// paid; ends no / no_reply), plus logged beats (content_productions) and
// sales (chronicles_finance type sale). Only "paid" ever touches money.
// Layout reuses knowledgeHub's CSS (rule 8), the same way Posting does.
RPGACE.register('sellingHub', {
  domain: 'content',

  init: function() {
    var self = RPGACE.modules.sellingHub;
    RPGACE.AREAS.selling.hub = function() { self.open(); };
    RPGACE.hooks.on('page:show', function(name) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || name !== P.selling) return;
      self.ui.injectPage();
      RPGACE.areaNav.visit('selling', { key: 'hub', label: 'Selling', open: function() { self.open(); } });
      self.ui.render();
    });
    [0, 1700].forEach(function(ms) { setTimeout(function() { self.ui.injectPage(); }, ms); });
  },

  open: function() {
    this.ui.injectPage();
    if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.selling);
  },

  // ============================================================
  // logic — reads and the "what's next" decision. No DOM.
  // ============================================================
  logic: {
    // Stages of one pitch sent to one artist (Alex's words, Oct 17).
    STAGES: {
      to_send:         { icon: '✉️', name: 'To send' },
      potential_pitch: { icon: '⏳', name: 'Potential pitch' },
      potential_close: { icon: '🤝', name: 'Potential close' },
      agreed_sale:     { icon: '✅', name: 'Agreed sale' },
      paid:            { icon: '💷', name: 'Paid' },
      no:              { icon: '✖', name: 'No' },
      no_reply:        { icon: '🔕', name: 'No reply' }
    },
    FOLLOW_UP_DAYS: 5,
    // SH-5: pitch kind -> income kind on Paid.
    PAY_KIND: { lease: 'lease', beat_pack: 'lease', exclusive: 'exclusive', collab: 'collab', placement: 'placement', other: 'other' },
    // Private tables: the same signed-in read every locked table uses (rule 8).
    read: function(table, params) {
      var tp = RPGACE.modules.tripPlans;
      return tp ? tp.logic.read(table, params).then(function(r) { return Array.isArray(r) ? r : []; }) : Promise.resolve([]);
    },
    load: function() {
      var L = RPGACE.modules.sellingHub.logic, safe = function(p) { return Promise.resolve(p).catch(function() { return []; }); };
      return Promise.all([
        safe(L.read('artists', 'select=id,name&limit=1000')),
        safe(L.read('pitches', 'select=id,title,kind&limit=1000')),
        safe(L.read('pitch_sends', 'select=id,pitch_id,artist_id,stage,sent_at,stage_at,follow_up_on,deal_amount,paid_at,updated_at,follow_ups,last_follow_up_at,history&limit=2000')),
        safe(RPGACE.sb.select('content_productions', 'select=id,con_id,title,created_at,released_at,release_url,release_links,licence_tiers,price,creative_docs&content_type=eq.music_video&order=created_at.desc&limit=500')),
        safe(RPGACE.sb.select('chronicles_finance', 'select=id,amount,entry_date,item,income_kind,content_production_id&type=eq.sale&limit=2000')),
        safe(L.read('posts', 'select=id,beat_id,stage&beat_id=not.is.null&limit=500')),
        safe(L.read('xp_settings', 'select=monthly_income_target,revenue_target&id=eq.1'))
      ]).then(function(r) {
        return L.model({ artists: r[0], pitches: r[1], sends: r[2], beats: r[3], sales: r[4], posts: r[5], settings: r[6][0] || null }, Date.now());
      });
    },
    // Pure: a beat is "listed" when one of its links is a selling place.
    isListed: function(beat) {
      var bh = RPGACE.modules.beatsHub;
      var links = bh ? bh.logic.linksOf(beat) : [];
      return links.some(function(l) { return l.place === 'Beatstars'; });
    },
    // Pure: counts for both tracks and the next list.
    model: function(d, now) {
      var L = RPGACE.modules.sellingHub.logic;
      var arr = function(x) { return Array.isArray(x) ? x : []; };
      var beats = arr(d.beats), sends = arr(d.sends), sales = arr(d.sales), posts = arr(d.posts);
      var released = beats.filter(function(b) { return b.released_at; });
      var listed = released.filter(L.isListed);
      var promoted = {};
      posts.forEach(function(p) { if (p.stage === 'posted' && p.beat_id) promoted[p.beat_id] = 1; });
      var priced = beats.filter(function(b) { return Array.isArray(b.licence_tiers) && b.licence_tiers.length; });
      var st = {};
      Object.keys(L.STAGES).forEach(function(k) { st[k] = 0; });
      sends.forEach(function(s) { if (st[s.stage] != null) st[s.stage]++; });
      var total = sales.reduce(function(a, s) { return a + (Number(s.amount) || 0); }, 0);
      return {
        artists: arr(d.artists).length, pitches: arr(d.pitches).length, sends: sends.length, stages: st,
        beats: { released: released.length, listed: listed.length, unlisted: released.length - listed.length,
          promoted: released.filter(function(b) { return promoted[b.id]; }).length, priced: priced.length },
        sales: { n: sales.length, total: Math.round(total * 100) / 100 },
        funnel: L.funnel(sends),
        followDue: sends.filter(function(x) { return L.followDue(x, now); }).length,
        next: L.nextList(sends, released, arr(d.artists), arr(d.pitches), now),
        lists: L.beatLists(beats, posts),
        money: L.money(sales, beats, L.targetOf(d.settings), now),
        rates: L.pitchRates(arr(d.pitches), sends)
      };
    },
    // ── SH-5 (Oct 17 2026): money in ────────────────────────────────
    targetOf: function(settings) {
      var xs = RPGACE.modules.xpSeason;
      if (xs) return xs.logic.monthlyOf(settings);
      return settings && settings.monthly_income_target != null ? Number(settings.monthly_income_target) : null;
    },
    // Pure: this month vs target, pace, income by type, earnings per beat, best sellers.
    money: function(sales, beats, target, now) {
      var bh = RPGACE.modules.beatsHub, d = new Date(now), pad = function(n) { return String(n).padStart(2, '0'); };
      var ym = d.getFullYear() + '-' + pad(d.getMonth() + 1), day = d.getDate(), daysIn = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      var r2 = function(x) { return Math.round(x * 100) / 100; };
      var month = 0, total = 0, byKind = {}, monthKind = {};
      (sales || []).forEach(function(x) {
        var a = Number(x.amount) || 0, k = x.income_kind || (bh ? bh.logic.incomeKindOf(x.item) : 'other');
        total += a; byKind[k] = r2((byKind[k] || 0) + a);
        if (String(x.entry_date || '').slice(0, 7) === ym) { month += a; monthKind[k] = r2((monthKind[k] || 0) + a); }
      });
      month = r2(month);
      var per = bh ? bh.logic.salesBy(sales) : {}, titles = {};
      (beats || []).forEach(function(b) { titles[b.id] = b.title || 'Beat'; });
      var best = Object.keys(per).filter(function(id) { return titles[id]; }).map(function(id) { return { id: id, title: titles[id], n: per[id].n, total: r2(per[id].total) }; })
        .sort(function(a, b) { return b.total - a.total || b.n - a.n; }).slice(0, 5);
      var t = target != null && target > 0 ? Number(target) : null;
      return { ym: ym, day: day, daysIn: daysIn, month: month, total: r2(total), target: t,
        pct: t ? Math.min(100, Math.round(month * 100 / t)) : null,
        pace: t ? r2(t * day / daysIn) : null,
        behind: !!(t && day >= 15 && month < t / 2),
        byKind: byKind, monthKind: monthKind, perBeat: per, best: best };
    },
    // Pure: "£80 of £300 this month (27%)".
    moneyLine: function(mo) {
      var f = function(x) { return '£' + Number(x).toFixed(2).replace(/\.00$/, ''); };
      if (!mo.target) return f(mo.month) + ' this month · no monthly target set';
      return f(mo.month) + ' of ' + f(mo.target) + ' this month (' + mo.pct + '%)' + (mo.month >= mo.target ? ' — hit 🎯' : mo.behind ? ' — behind pace' : '');
    },
    // Pure: "Lease £60 · Exclusive £400".
    kindLine: function(byKind) {
      var bh = RPGACE.modules.beatsHub, names = bh ? bh.logic.INCOME_KINDS : {};
      return Object.keys(byKind).sort(function(a, b) { return byKind[b] - byKind[a]; })
        .map(function(k) { return (names[k] || k) + ' £' + Number(byKind[k]).toFixed(2).replace(/\.00$/, ''); }).join(' · ');
    },
    // Pure: per pitch - artists sent, paid, deal rate (paid / sent), most sent first.
    pitchRates: function(pitches, sends) {
      var L = RPGACE.modules.sellingHub.logic;
      return (pitches || []).map(function(p) {
        var f = L.funnel((sends || []).filter(function(x) { return x.pitch_id === p.id; }));
        return { id: p.id, title: p.title, sent: f.sent, agreed: f.agreed, paid: f.paid, rate: f.paidPct };
      }).filter(function(x) { return x.sent > 0; }).sort(function(a, b) { return b.sent - a.sent || b.rate - a.rate; });
    },
    rateLine: function(r) { return r.paid + ' of ' + r.sent + ' paid (' + r.rate + '%)'; },
    // ── SH-4 (Oct 17 2026): the beats behind each Beats-for-sale step ──
    // Pure: list = released with no selling link; promote = released, not
    // yet shown in a posted video first; sell = no licence prices yet;
    // paid = every logged beat (log a sale on any of them).
    beatLists: function(beats, posts) {
      var L = RPGACE.modules.sellingHub.logic, shown = {};
      (posts || []).forEach(function(p) { if (p.stage === 'posted' && p.beat_id) shown[p.beat_id] = 1; });
      beats = beats || [];
      var released = beats.filter(function(b) { return b.released_at; });
      var priced = function(b) { return Array.isArray(b.licence_tiers) && b.licence_tiers.length; };
      return {
        list: released.filter(function(b) { return !L.isListed(b); }),
        promote: released.filter(function(b) { return !shown[b.id]; }).concat(released.filter(function(b) { return shown[b.id]; })),
        shown: shown,
        sell: beats.filter(function(b) { return !priced(b); }),
        paid: beats.slice()
      };
    },
    // Pure: the A&R Critic prompt about one real beat (+ how often it has been shown).
    critiquePrompt: function(beat, posted, cmd) {
      var ph = RPGACE.modules.postingHub, line = ph ? ph.logic.beatLine(beat) : (beat.title || 'beat');
      var ctx = 'CONTEXT: my beat "' + (beat.title || 'beat') + '"' + (line && line !== beat.title ? ' (' + line + ')' : '') +
        (beat.released_at ? ', released' : ', not released yet') + (posted ? ', already shown in a posted video' : ', not shown in a video post yet') + '.\n\n';
      return ctx + String(cmd || '').replace('[DESCRIBE THE BEAT OR VIDEO, OR PICK A BEAT ABOVE]', 'the beat above');
    },
    // Pure: up to 5 jobs, closest to money first.
    nextList: function(sends, released, artists, pitches, now) {
      var L = RPGACE.modules.sellingHub.logic, an = {}, pn = {}, out = [];
      artists.forEach(function(a) { an[a.id] = a.name; });
      pitches.forEach(function(p) { pn[p.id] = p.title; });
      var label = function(s) { return (pn[s.pitch_id] || 'Pitch') + ' → ' + (an[s.artist_id] || 'artist'); };
      var by = function(stage) { return sends.filter(function(s) { return s.stage === stage; }).sort(function(a, b) { return String(b.updated_at || '').localeCompare(String(a.updated_at || '')); }); };
      by('agreed_sale').forEach(function(s) { out.push({ kind: 'send', send: s, icon: '💷', verb: 'Log payment', title: label(s), sub: 'Agreed sale' + (s.deal_amount ? ' · £' + s.deal_amount : '') }); });
      by('potential_close').forEach(function(s) { out.push({ kind: 'send', send: s, icon: '🤝', verb: 'Negotiate', title: label(s), sub: 'Potential close' }); });
      by('potential_pitch').forEach(function(s) {
        var f = L.followDue(s, now);
        if (!f) return;
        out.push({ kind: 'follow', send: s, icon: f.kind === 'give_up' ? '🔕' : '🔁', verb: f.kind === 'give_up' ? 'No reply?' : 'Follow up',
          title: label(s), sub: f.kind === 'give_up' ? 'No reply after ' + (s.follow_ups || 0) + ' follow-ups' : 'Follow-up ' + f.n + ' · no reply for ' + f.days + ' days' });
      });
      by('to_send').forEach(function(s) { out.push({ kind: 'send', send: s, icon: '✉️', verb: 'Send it', title: label(s), sub: 'Not sent yet' }); });
      released.filter(function(b) { return !L.isListed(b); }).forEach(function(b) { out.push({ kind: 'beat', beat: b, icon: '🏷', verb: 'List it', title: b.title || 'Beat', sub: 'Released, no selling link yet' }); });
      return out.slice(0, 5);
    },
    // ── SH-1 (Oct 17 2026): artist profiles ─────────────────────────
    FIELDS: [
      ['name', 'Name', 'e.g. Kay Dot', 80], ['genre', 'Genre', 'e.g. UK drill', 60], ['location', 'Location', 'e.g. Derby', 60],
      ['instagram', 'Instagram', '@handle or link', 200], ['tiktok', 'TikTok', '@handle or link', 200], ['youtube', 'YouTube', 'channel link or @handle', 200],
      ['email', 'Email', 'name@email.com', 200], ['phone', 'Phone', '07…', 40], ['manager', 'Manager', 'name and contact', 200],
      ['link', 'Other link', 'Spotify, website…', 300], ['notes', 'Notes', 'what they make, how you found them', 2000]
    ],
    // Pure: the row to save, or { error }. Only the name is required.
    cleanArtist: function(f) {
      var row = {};
      RPGACE.modules.sellingHub.logic.FIELDS.forEach(function(x) {
        var v = String(f && f[x[0]] != null ? f[x[0]] : '').trim().slice(0, x[3]);
        row[x[0]] = v || null;
      });
      if (!row.name) return { error: 'Give the artist a name' };
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return { error: 'That email does not look right' };
      row.person_id = f && f.person_id ? f.person_id : null;
      return { row: row };
    },
    // Pure: tappable contact links for a profile.
    contactLinks: function(a) {
      var out = [], h = function(v) { return String(v || '').trim().replace(/^@/, ''); };
      var url = function(v) { return /^https?:\/\//i.test(String(v || '').trim()) ? String(v).trim() : null; };
      if (a.instagram) out.push({ label: '📸 Instagram', href: url(a.instagram) || 'https://instagram.com/' + encodeURIComponent(h(a.instagram)) });
      if (a.tiktok) out.push({ label: '🎵 TikTok', href: url(a.tiktok) || 'https://www.tiktok.com/@' + encodeURIComponent(h(a.tiktok)) });
      if (a.youtube) out.push({ label: '▶️ YouTube', href: url(a.youtube) || 'https://www.youtube.com/@' + encodeURIComponent(h(a.youtube)) });
      if (a.email) out.push({ label: '✉️ ' + a.email, href: 'mailto:' + a.email });
      if (a.phone) out.push({ label: '📞 ' + a.phone, href: 'tel:' + String(a.phone).replace(/[^\d+]/g, '') });
      if (a.link && url(a.link)) out.push({ label: '🔗 Link', href: url(a.link) });
      return out;
    },
    // Pure: name / genre / location contains every word typed.
    searchArtists: function(list, q) {
      var words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
      return (list || []).filter(function(a) {
        var hay = [a.name, a.genre, a.location].join(' ').toLowerCase();
        return words.every(function(w) { return hay.indexOf(w) > -1; });
      }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
    },
    loadArtists: function() {
      return RPGACE.modules.sellingHub.logic.read('artists', 'select=*&order=name.asc&limit=1000');
    },
    loadArtist: function(id) {
      var L = RPGACE.modules.sellingHub.logic;
      return Promise.all([
        L.read('artists', 'select=*&id=eq.' + id + '&limit=1'),
        L.read('pitch_sends', 'select=id,pitch_id,stage,sent_at,stage_at,deal_amount,updated_at&artist_id=eq.' + id + '&order=updated_at.desc&limit=200')
      ]).then(function(r) {
        var a = r[0][0];
        if (!a) throw new Error('Artist not found');
        var ids = r[1].map(function(x) { return x.pitch_id; });
        var pp = ids.length ? L.read('pitches', 'select=id,title,kind&id=in.(' + ids.join(',') + ')') : Promise.resolve([]);
        return pp.then(function(pitches) {
          var t = {}; pitches.forEach(function(x) { t[x.id] = x.title; });
          return { artist: a, sends: r[1].map(function(x) { return Object.assign({ title: t[x.pitch_id] || 'Pitch' }, x); }) };
        });
      });
    },
    saveArtist: function(id, form) {
      var v = RPGACE.modules.sellingHub.logic.cleanArtist(form);
      if (v.error) return Promise.reject(new Error(v.error));
      v.row.updated_at = new Date().toISOString();
      if (id) return RPGACE.sb.secureWrite('artists', 'update', v.row, 'id=eq.' + id).then(function() { return Object.assign({ id: id }, v.row); });
      v.row.realms = ['hustler'];
      return RPGACE.sb.secureWrite('artists', 'insert', v.row).then(function(d) {
        var saved = Array.isArray(d) && d[0];
        if (!saved || !saved.id) throw new Error('The artist was not saved (no id came back)');
        return saved;
      });
    },
    // Their pitch sends go too (the table cascades).
    deleteArtist: function(id) {
      return RPGACE.sb.secureWrite('artists', 'delete', null, 'id=eq.' + id);
    },
    // ── SH-2 (Oct 17 2026): pitches ─────────────────────────────────
    PITCH_KINDS: {
      lease:     { icon: '📄', name: 'Lease' },
      exclusive: { icon: '💎', name: 'Exclusive' },
      beat_pack: { icon: '📦', name: 'Beat pack' },
      collab:    { icon: '🤝', name: 'Collab' },
      placement: { icon: '🎯', name: 'Placement' },
      other:     { icon: '✨', name: 'Other' }
    },
    PITCH_KIND_ORDER: ['lease', 'exclusive', 'beat_pack', 'collab', 'placement', 'other'],
    CHANNELS: { dm: '📸 DM', email: '✉️ Email', other: '💬 Other' },
    // Pure: the pitch row to save, or { error }.
    cleanPitch: function(f) {
      var L = RPGACE.modules.sellingHub.logic, t = function(x, n) { return String(x == null ? '' : x).trim().slice(0, n); };
      var title = t(f && f.title, 120);
      if (!title) return { error: 'Give the pitch a title' };
      if (!L.PITCH_KINDS[f.kind]) return { error: 'Pick what you are offering' };
      var ask = f.ask === '' || f.ask == null ? null : Number(String(f.ask).replace(/[£,\s]/g, ''));
      if (ask != null && (!isFinite(ask) || ask < 0)) return { error: 'The price must be a number' };
      var ids = [], seen = {};
      (Array.isArray(f.beat_ids) ? f.beat_ids : []).forEach(function(id) { if (id && !seen[id]) { seen[id] = 1; ids.push(String(id)); } });
      return { row: { title: title, kind: f.kind, beat_ids: ids.slice(0, 20), ask: ask == null ? null : Math.round(ask * 100) / 100,
        message: t(f.message, 2000) || null, notes: t(f.notes, 2000) || null, follow_up_message: t(f.follow_up_message, 600) || null } };
    },
    // Pure: the message with this artist's name where {name} is.
    fillName: function(msg, name) {
      return String(msg || '').replace(/\{name\}/gi, String(name || '').trim() || 'there');
    },
    // Pure: one Oracle prompt for the whole pitch (the Artist Outreach rules).
    draftPrompt: function(f, beats) {
      var L = RPGACE.modules.sellingHub.logic, k = L.PITCH_KINDS[f.kind] || { name: 'offer' };
      var bl = RPGACE.modules.postingHub ? RPGACE.modules.postingHub.logic.beatLine : function(b) { return b.title; };
      var lines = (beats || []).map(bl).filter(Boolean);
      return 'Write a cold outreach message from me (AceSanyaBeats, UK hip hop and drill producer) to an artist.\n' +
        'WHAT I AM OFFERING: ' + k.name + ' - ' + (f.title || '') + '\n' +
        (lines.length ? 'BEATS: ' + lines.join(' | ') + '\n' : '') +
        (f.ask ? 'PRICE: £' + f.ask + '\n' : '') +
        (f.notes ? 'NOTES: ' + f.notes + '\n' : '') +
        'Rules: under 90 words, one clear ask, no begging, no "hope you are well", no emojis spam. ' +
        'The same message goes to several artists, so write {name} exactly where the artist\'s name goes and do not invent anything about the artist. ' +
        'Return only the message text, written as an Instagram DM.';
    },
    loadBeats: function() {
      var ph = RPGACE.modules.postingHub;
      return ph ? ph.logic.loadBeats() : Promise.resolve([]);
    },
    loadPitches: function() {
      var L = RPGACE.modules.sellingHub.logic;
      return Promise.all([
        L.read('pitches', 'select=*&order=updated_at.desc&limit=500'),
        L.read('pitch_sends', 'select=id,pitch_id,stage&limit=3000')
      ]).then(function(r) {
        var by = {};
        r[1].forEach(function(x) { (by[x.pitch_id] = by[x.pitch_id] || []).push(x); });
        return r[0].map(function(p) { return Object.assign({ sends: by[p.id] || [] }, p); });
      });
    },
    // Pure: "3 artists · 1 to send · 2 potential pitches".
    pitchSummary: function(sends) {
      var L = RPGACE.modules.sellingHub.logic, c = {}, parts = [];
      (sends || []).forEach(function(x) { c[x.stage] = (c[x.stage] || 0) + 1; });
      parts.push((sends || []).length + ' artist' + ((sends || []).length === 1 ? '' : 's'));
      Object.keys(L.STAGES).forEach(function(k) { if (c[k]) parts.push(c[k] + ' ' + L.STAGES[k].name.toLowerCase()); });
      return parts.join(' · ');
    },
    loadPitch: function(id) {
      var L = RPGACE.modules.sellingHub.logic;
      return Promise.all([
        L.read('pitches', 'select=*&id=eq.' + id + '&limit=1'),
        L.read('pitch_sends', 'select=*&pitch_id=eq.' + id + '&order=created_at.asc&limit=500')
      ]).then(function(r) {
        var p = r[0][0];
        if (!p) throw new Error('Pitch not found');
        var aids = r[1].map(function(x) { return x.artist_id; });
        var ap = aids.length ? L.read('artists', 'select=*&id=in.(' + aids.join(',') + ')') : Promise.resolve([]);
        var bp = (p.beat_ids || []).length ? Promise.resolve(RPGACE.sb.select('content_productions', 'select=id,title,creative_docs&id=in.(' + p.beat_ids.join(',') + ')')).catch(function() { return []; }) : Promise.resolve([]);
        return Promise.all([ap, bp]).then(function(x) {
          var by = {}; x[0].forEach(function(a) { by[a.id] = a; });
          return { pitch: p, beats: Array.isArray(x[1]) ? x[1] : [], sends: r[1].map(function(sd) { return Object.assign({ artist: by[sd.artist_id] || { id: sd.artist_id, name: 'Artist' } }, sd); }) };
        });
      });
    },
    savePitch: function(id, form) {
      var v = RPGACE.modules.sellingHub.logic.cleanPitch(form);
      if (v.error) return Promise.reject(new Error(v.error));
      v.row.updated_at = new Date().toISOString();
      if (id) return RPGACE.sb.secureWrite('pitches', 'update', v.row, 'id=eq.' + id).then(function() { return Object.assign({ id: id }, v.row); });
      v.row.realms = ['hustler'];
      return RPGACE.sb.secureWrite('pitches', 'insert', v.row).then(function(d) {
        var saved = Array.isArray(d) && d[0];
        if (!saved || !saved.id) throw new Error('The pitch was not saved (no id came back)');
        return saved;
      });
    },
    deletePitch: function(id) {
      return RPGACE.sb.secureWrite('pitches', 'delete', null, 'id=eq.' + id);
    },
    // Pure: the artists not already on this pitch (one send each, never twice).
    newSendRows: function(pitchId, artistIds, existing) {
      var have = {}, out = [];
      (existing || []).forEach(function(x) { have[x.artist_id] = 1; });
      (artistIds || []).forEach(function(a) { if (a && !have[a]) { have[a] = 1; out.push({ pitch_id: pitchId, artist_id: a, stage: 'to_send' }); } });
      return out;
    },
    addSends: function(pitchId, artistIds, existing) {
      var rows = RPGACE.modules.sellingHub.logic.newSendRows(pitchId, artistIds, existing);
      if (!rows.length) return Promise.resolve([]);
      return RPGACE.sb.secureWrite('pitch_sends', 'insert', rows).then(function() { return rows; });
    },
    removeSend: function(id) {
      return RPGACE.sb.secureWrite('pitch_sends', 'delete', null, 'id=eq.' + id);
    },
    // Pure: the update when you have actually sent it.
    sentUpdate: function(channel, now) {
      var at = new Date(now || Date.now()).toISOString();
      return { stage: 'potential_pitch', sent_at: at, stage_at: at, updated_at: at,
        channel: RPGACE.modules.sellingHub.logic.CHANNELS[channel] ? channel : 'other' };
    },
    // Sent = potential pitch; it counts as outreach (Hustler XP) through
    // producerTools' own outreach log, the one path that pays it (rule 8).
    markSent: function(send, channel, pitchTitle) {
      var L = RPGACE.modules.sellingHub.logic, upd = L.sentUpdate(channel, Date.now());
      return RPGACE.sb.secureWrite('pitch_sends', 'update', upd, 'id=eq.' + send.id).then(function() {
        Object.assign(send, upd);
        var pt = RPGACE.modules.producerTools, a = send.artist || {};
        if (!pt) return { send: send, logged: false };
        return pt.logic.addOutreach({ kind: 'outreach', who: a.name || 'Artist', note: 'Pitch: ' + (pitchTitle || ''), personId: a.person_id || null })
          .then(function() { return { send: send, logged: true }; }, function(e) { return { send: send, logged: false, error: e }; });
      });
    },
    // Pure: where Copy & open takes you (Instagram for a DM, email for email).
    openLink: function(artist, channel) {
      var links = RPGACE.modules.sellingHub.logic.contactLinks(artist || {});
      var pick = function(re) { return links.filter(function(l) { return re.test(l.href); })[0]; };
      var l = channel === 'email' ? (pick(/^mailto:/) || pick(/^https?:/)) : (pick(/instagram\.com/) || pick(/tiktok\.com/) || pick(/^https?:/) || pick(/^mailto:/));
      return l ? l.href : null;
    },
    // ── SH-3 (Oct 17 2026): follow up, deal, paid ───────────────────
    // Follow-up cadence: 1st after 5 days, 2nd 7 days after that, then
    // after 7 more days suggest No reply (Alex: "play the numbers game").
    FOLLOW_GAPS: [5, 7],
    GIVE_UP_DAYS: 7,
    // Where each stage can go (Alex's rules, Oct 17).
    MOVES: {
      potential_pitch: ['potential_close', 'agreed_sale', 'no_reply', 'no'],
      potential_close: ['agreed_sale', 'no'],
      agreed_sale: ['paid', 'no'],
      no_reply: ['potential_close', 'agreed_sale'],
      no: [], paid: [], to_send: []
    },
    // Pure: is a follow-up (or giving up) due? null when not.
    followDue: function(send, now) {
      var L = RPGACE.modules.sellingHub.logic;
      if (!send || send.stage !== 'potential_pitch') return null;
      var base = send.last_follow_up_at || send.sent_at || send.stage_at;
      if (!base) return null;
      var days = Math.floor(((now || Date.now()) - new Date(base).getTime()) / 864e5), n = Number(send.follow_ups) || 0;
      if (n >= L.FOLLOW_GAPS.length) return days >= L.GIVE_UP_DAYS ? { kind: 'give_up', days: days, n: n } : null;
      return days >= L.FOLLOW_GAPS[n] ? { kind: 'follow', days: days, n: n + 1 } : null;
    },
    // Pure: the funnel. A send counts at a stage once it has ever reached it.
    funnel: function(sends) {
      var reached = function(x, list) {
        if (list.indexOf(x.stage) > -1) return true;
        return (Array.isArray(x.history) ? x.history : []).some(function(h) { return list.indexOf(h.to) > -1; });
      };
      var sent = 0, replied = 0, agreed = 0, paid = 0;
      (sends || []).forEach(function(x) {
        if (x.stage === 'to_send') return;
        sent++;
        if (reached(x, ['potential_close', 'agreed_sale', 'paid'])) replied++;
        if (reached(x, ['agreed_sale', 'paid'])) agreed++;
        if (x.stage === 'paid') paid++;
      });
      var pc = function(n) { return sent ? Math.round(n * 100 / sent) : 0; };
      return { sent: sent, replied: replied, agreed: agreed, paid: paid, repliedPct: pc(replied), agreedPct: pc(agreed), paidPct: pc(paid) };
    },
    // Pure: one line for Selling home.
    funnelLine: function(f) {
      if (!f || !f.sent) return 'Funnel: nothing sent yet';
      return 'Funnel: ' + f.sent + ' sent → ' + f.replied + ' replied (' + f.repliedPct + '%) → ' + f.agreed + ' agreed (' + f.agreedPct + '%) → ' + f.paid + ' paid (' + f.paidPct + '%)';
    },
    // Pure: the update for a stage move, or { error }.
    moveUpdate: function(send, to, f, now) {
      var L = RPGACE.modules.sellingHub.logic;
      if ((L.MOVES[send.stage] || []).indexOf(to) < 0) return { error: 'Can\'t go from ' + ((L.STAGES[send.stage] || {}).name || send.stage) + ' to ' + ((L.STAGES[to] || {}).name || to) };
      var at = new Date(now || Date.now()).toISOString(), note = String(f && f.note || '').trim().slice(0, 500);
      var upd = { stage: to, stage_at: at, updated_at: at,
        history: (Array.isArray(send.history) ? send.history : []).concat([{ kind: 'move', at: at, from: send.stage, to: to, note: note || null }]) };
      if (to === 'agreed_sale') {
        var amt = f && f.amount !== '' && f.amount != null ? Number(String(f.amount).replace(/[£,\s]/g, '')) : null;
        if (amt != null && (!isFinite(amt) || amt < 0)) return { error: 'The amount must be a number' };
        upd.deal_amount = amt == null ? null : Math.round(amt * 100) / 100;
        upd.deal_terms = String(f && f.terms || '').trim().slice(0, 1000) || null;
      }
      return { update: upd };
    },
    // Pure: the update for "Followed up".
    followUpdate: function(send, now) {
      var at = new Date(now || Date.now()).toISOString();
      return { follow_ups: (Number(send.follow_ups) || 0) + 1, last_follow_up_at: at, updated_at: at,
        history: (Array.isArray(send.history) ? send.history : []).concat([{ kind: 'follow', at: at, from: send.stage, to: send.stage, note: null }]) };
    },
    // Pure: undo the last step (never once paid - that is in your money).
    backUpdate: function(send, now) {
      var h = Array.isArray(send.history) ? send.history.slice() : [];
      if (send.stage === 'paid') return { error: 'Paid is logged in your money — remove the sale in Chronicles first' };
      var last = h.pop();
      if (!last) return { error: 'Nothing to undo' };
      var at = new Date(now || Date.now()).toISOString(), upd = { history: h, updated_at: at };
      if (last.kind === 'follow') {
        var prev = h.filter(function(x) { return x.kind === 'follow'; }).pop();
        upd.follow_ups = Math.max(0, (Number(send.follow_ups) || 0) - 1);
        upd.last_follow_up_at = prev ? prev.at : null;
      } else {
        upd.stage = last.from; upd.stage_at = at;
        if (last.to === 'agreed_sale') { upd.deal_amount = null; upd.deal_terms = null; }
      }
      return { update: upd };
    },
    _apply: function(send, r) {
      if (r.error) return Promise.reject(new Error(r.error));
      return RPGACE.sb.secureWrite('pitch_sends', 'update', r.update, 'id=eq.' + send.id).then(function() { return Object.assign(send, r.update); });
    },
    move: function(send, to, f) { var L = RPGACE.modules.sellingHub.logic; return L._apply(send, L.moveUpdate(send, to, f, Date.now())); },
    back: function(send) { var L = RPGACE.modules.sellingHub.logic; return L._apply(send, L.backUpdate(send, Date.now())); },
    // A follow-up counts as outreach too (Hustler XP), same path as Mark sent.
    markFollowed: function(send, pitchTitle) {
      var L = RPGACE.modules.sellingHub.logic;
      return L._apply(send, { update: L.followUpdate(send, Date.now()) }).then(function() {
        var pt = RPGACE.modules.producerTools, a = send.artist || {};
        if (!pt) return { send: send, logged: false };
        return pt.logic.addOutreach({ kind: 'outreach', who: a.name || 'Artist', note: 'Follow-up ' + send.follow_ups + ': ' + (pitchTitle || ''), personId: a.person_id || null })
          .then(function() { return { send: send, logged: true }; }, function(e) { return { send: send, logged: false, error: e }; });
      });
    },
    // Paid: ONE sale through Beats' own sale path (rule 8), linked to the
    // chosen beat; then the send is paid. A collab also counts Collab done.
    pay: function(send, pitch, f) {
      var L = RPGACE.modules.sellingHub.logic, bh = RPGACE.modules.beatsHub;
      if (!bh) return Promise.reject(new Error('Beats is not loaded'));
      var k = L.PITCH_KINDS[pitch.kind] || { name: 'Pitch' }, a = send.artist || {};
      var beat = f.beat || null;
      return bh.logic.logSale({ id: beat ? beat.id : null, title: beat ? beat.title : pitch.title }, { amount: f.amount, buyer: a.name, place: 'Pitch: ' + pitch.title, tier: k.name, date: f.date, kind: L.PAY_KIND[pitch.kind] || 'other', item: L.dealName(pitch.title, a.name) })
        .then(function(sale) {
          var at = new Date().toISOString();
          var upd = { stage: 'paid', stage_at: at, paid_at: at, updated_at: at, deal_amount: Number(sale.amount), finance_id: sale.id || null,
            history: (Array.isArray(send.history) ? send.history : []).concat([{ kind: 'move', at: at, from: send.stage, to: 'paid', note: null }]) };
          return RPGACE.sb.secureWrite('pitch_sends', 'update', upd, 'id=eq.' + send.id).then(function() {
            Object.assign(send, upd);
            var pt = RPGACE.modules.producerTools;
            var extra = pitch.kind === 'collab' && pt ? pt.logic.addOutreach({ kind: 'collab', who: a.name || 'Artist', note: 'Paid: ' + pitch.title, personId: a.person_id || null }).catch(function() { return null; }) : Promise.resolve(null);
            return extra.then(function() { return { send: send, sale: sale }; });
          }, function(e) {
            var err = new Error('The sale was logged, but the pitch did not move to Paid: ' + (e && e.message || e));
            err.saleLogged = true; throw err;
          });
        });
    },
    // Pure (SH-7): "Drill pack → Kay" - how a deal is named in money and Chronicles.
    dealName: function(pitchTitle, artistName) {
      return String(pitchTitle || 'Pitch').trim() + ' → ' + String(artistName || 'Artist').trim();
    },
    // Pure (SH-7): the Chronicles label for a sale row. A pitch paid before
    // SH-7 kept the names only in notes ("Pitch: X · buyer: Y").
    saleLabel: function(r) {
      var item = r.item || r.category || 'sale', m = /^Pitch: (.+?) · buyer: (.+)$/.exec(String(r.notes || ''));
      if (m && /^Beat sale: /.test(item)) item = RPGACE.modules.sellingHub.logic.dealName(m[1], m[2]);
      return 'Sale: ' + item + ' (£' + r.amount + ')';
    },
    // Pure (SH-7): one Chronicles entry per agreed sale (the "agreed" step in
    // each send's history, so undoing it removes the entry). Not money.
    agreedEntries: function(sends, pitches, artists) {
      var L = RPGACE.modules.sellingHub.logic, P = {}, A = {};
      (pitches || []).forEach(function(p) { P[p.id] = p; });
      (artists || []).forEach(function(a) { A[a.id] = a; });
      var out = [];
      (sends || []).forEach(function(sd) {
        var h = (Array.isArray(sd.history) ? sd.history : []).filter(function(x) { return x && x.kind === 'move' && x.to === 'agreed_sale'; }).pop();
        if (!h) return;
        var p = P[sd.pitch_id] || {}, a = A[sd.artist_id] || {};
        var amt = sd.deal_amount != null ? Number(sd.deal_amount) : null;
        out.push({ t: h.at, label: 'Agreed: ' + L.dealName(p.title, a.name) + (amt != null ? ', £' + amt : ''), send: sd, pitch: p, artist: a, amount: amt, paid: sd.stage === 'paid' });
      });
      return out;
    },
    loadAgreed: function() {
      var L = RPGACE.modules.sellingHub.logic;
      return L.read('pitch_sends', 'select=id,pitch_id,artist_id,stage,deal_amount,deal_terms,history&history=not.is.null&limit=2000').then(function(sends) {
        sends = (sends || []).filter(function(sd) { return (sd.history || []).some(function(x) { return x && x.to === 'agreed_sale'; }); });
        if (!sends.length) return [];
        var pids = {}, aids = {};
        sends.forEach(function(sd) { pids[sd.pitch_id] = 1; aids[sd.artist_id] = 1; });
        return Promise.all([
          L.read('pitches', 'select=id,title,kind&id=in.(' + Object.keys(pids).join(',') + ')'),
          L.read('artists', 'select=id,name&id=in.(' + Object.keys(aids).join(',') + ')')
        ]).then(function(r) { return L.agreedEntries(sends, r[0], r[1]); });
      });
    },
    // Pure (SH-7): the pitches a beat is in, each with its artists' stages.
    beatDeals: function(beatId, pitches, sends, artists) {
      var L = RPGACE.modules.sellingHub.logic, A = {};
      (artists || []).forEach(function(a) { A[a.id] = a; });
      return (pitches || []).filter(function(p) { return (p.beat_ids || []).indexOf(beatId) >= 0; }).map(function(p) {
        return { pitch: p, sends: (sends || []).filter(function(sd) { return sd.pitch_id === p.id; }).map(function(sd) {
          var st = L.STAGES[sd.stage] || { icon: '', name: sd.stage };
          return { id: sd.id, name: (A[sd.artist_id] || {}).name || 'Artist', stage: sd.stage, icon: st.icon, stageName: st.name };
        }) };
      });
    },
    loadBeatDeals: function(beatId) {
      var L = RPGACE.modules.sellingHub.logic;
      return L.read('pitches', 'select=id,title,kind,beat_ids&beat_ids=cs.{' + beatId + '}&order=updated_at.desc&limit=100').then(function(ps) {
        ps = ps || [];
        if (!ps.length) return [];
        return L.read('pitch_sends', 'select=id,pitch_id,artist_id,stage&pitch_id=in.(' + ps.map(function(p) { return p.id; }).join(',') + ')&limit=2000').then(function(sends) {
          var aids = {}; (sends || []).forEach(function(sd) { aids[sd.artist_id] = 1; });
          var ap = Object.keys(aids).length ? L.read('artists', 'select=id,name&id=in.(' + Object.keys(aids).join(',') + ')') : Promise.resolve([]);
          return ap.then(function(arts) { return L.beatDeals(beatId, ps, sends, arts); });
        });
      });
    },
    // Pure (SH-6): the real pitch + artist for the Artist Outreach tool's gaps.
    outreachContext: function(pitch, artist, beats) {
      var L = RPGACE.modules.sellingHub.logic, k = L.PITCH_KINDS[pitch.kind] || { name: 'offer' }, ph = RPGACE.modules.postingHub;
      var where = [artist.genre, artist.location, artist.instagram ? 'Instagram ' + artist.instagram : '', artist.tiktok ? 'TikTok ' + artist.tiktok : '', artist.youtube ? 'YouTube ' + artist.youtube : ''].filter(Boolean).join(', ');
      var bl = (beats || []).map(function(b) { return ph ? ph.logic.beatLine(b) : b.title; }).filter(Boolean);
      return 'CONTEXT: the artist is ' + (artist.name || 'the artist') + (where ? ' (' + where + ')' : '') + (artist.notes ? '. My notes on them: ' + artist.notes : '') +
        '. I am offering: ' + k.name + ' - ' + (pitch.title || '') + (pitch.ask != null ? ', asking £' + pitch.ask : '') + (bl.length ? '. Beats: ' + bl.join('; ') : '') +
        (pitch.message ? '. My draft message so far: ' + pitch.message : '') + '. Use this to fill the gaps below; ask me only for the detail about their music if my notes do not give one.';
    },
    // Pure: a 2-line follow-up message prompt (the Artist Outreach rules).
    followPrompt: function(pitch) {
      var k = RPGACE.modules.sellingHub.logic.PITCH_KINDS[pitch.kind] || { name: 'offer' };
      return 'Write a short follow-up DM from me (AceSanyaBeats, UK hip hop and drill producer) to an artist who has not replied to this pitch.\n' +
        'THE PITCH: ' + k.name + ' - ' + (pitch.title || '') + (pitch.ask ? ' (£' + pitch.ask + ')' : '') + '\n' +
        (pitch.message ? 'FIRST MESSAGE: ' + String(pitch.message).slice(0, 600) + '\n' : '') +
        'Rules: 2 lines max, friendly, no guilt-tripping, no "just checking in" cliche, one easy yes/no question. ' +
        'Write {name} exactly where the artist\'s name goes. Return only the message text.';
    },
    // Pure: the follow-up text for one artist.
    followText: function(pitch, name) {
      var L = RPGACE.modules.sellingHub.logic;
      return L.fillName(pitch.follow_up_message || 'Yo {name}, did you get a chance to hear the ' + (pitch.title || 'beats') + ' I sent? Want me to send it over?', name);
    },
    // Every send due a follow-up (or a give-up), oldest first, with its
    // pitch and artist - the Follow-up sweep and the Due row read this.
    loadFollowUps: function(now) {
      var L = RPGACE.modules.sellingHub.logic;
      return L.read('pitch_sends', 'select=*&stage=eq.potential_pitch&limit=2000').then(function(sends) {
        var due = sends.map(function(x) { return { send: x, due: L.followDue(x, now || Date.now()) }; }).filter(function(x) { return x.due; });
        if (!due.length) return [];
        var pids = {}, aids = {};
        due.forEach(function(x) { pids[x.send.pitch_id] = 1; aids[x.send.artist_id] = 1; });
        return Promise.all([
          L.read('pitches', 'select=*&id=in.(' + Object.keys(pids).join(',') + ')'),
          L.read('artists', 'select=*&id=in.(' + Object.keys(aids).join(',') + ')')
        ]).then(function(r) {
          var P = {}, A = {};
          r[0].forEach(function(x) { P[x.id] = x; }); r[1].forEach(function(x) { A[x.id] = x; });
          return due.map(function(x) {
            x.send.artist = A[x.send.artist_id] || { id: x.send.artist_id, name: 'Artist' };
            x.pitch = P[x.send.pitch_id] || { id: x.send.pitch_id, title: 'Pitch' };
            return x;
          }).sort(function(a, b) { return String(a.send.last_follow_up_at || a.send.sent_at).localeCompare(String(b.send.last_follow_up_at || b.send.sent_at)); });
        });
      });
    },
    // dashDeck Due: one row for the whole sweep.
    loadDue: function() {
      var L = RPGACE.modules.sellingHub.logic;
      var mh = RPGACE.modules.moneyHub;
      return Promise.all([L.loadFollowUps(Date.now()), L.loadMoneyDue().catch(function() { return null; }), mh ? mh.logic.loadDue().catch(function() { return []; }) : Promise.resolve([])]).then(function(r) {
        var list = r[0], out = [];
        if (list.length) {
          var f = list.filter(function(x) { return x.due.kind === 'follow'; }).length, g = list.length - f;
          out.push({ icon: '🔁', text: (f ? 'Follow up with ' + f + ' artist' + (f === 1 ? '' : 's') : '') + (f && g ? ' · ' : '') + (g ? g + ' to close as no reply' : ''), sub: 'Selling · follow-up sweep', hot: list.length >= 3 });
        }
        if (r[1]) out.push(r[1]);
        // SH-5b: subscription renewals to confirm (open the Money page).
        return out.concat(r[2] || []);
      });
    },
    // SH-5: one Due row when this month is past the 15th and under half the target.
    loadMoneyDue: function() {
      var L = RPGACE.modules.sellingHub.logic, now = Date.now(), d = new Date(now);
      var from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
      return Promise.all([
        L.read('xp_settings', 'select=monthly_income_target,revenue_target&id=eq.1'),
        Promise.resolve(RPGACE.sb.select('chronicles_finance', 'select=amount,entry_date&type=eq.sale&entry_date=gte.' + from + '&limit=1000')).catch(function() { return []; })
      ]).then(function(r) {
        var mo = L.money(Array.isArray(r[1]) ? r[1] : [], [], L.targetOf(r[0][0] || null), now);
        if (!mo.behind) return null;
        return { icon: '🎯', text: 'Income behind: ' + L.moneyLine(mo).replace(' — behind pace', ''), sub: 'Selling · ' + (mo.daysIn - mo.day + 1) + ' days left this month', hot: mo.day >= 24 };
      });
    }
  },

  // ============================================================
  // ui
  // ============================================================
  ui: {
    css: function() {
      var kh = RPGACE.modules.knowledgeHub;
      var base = kh ? kh.ui.CSS.replace(/kh-/g, 'sh-').replace(/--blue/g, '--gold') : '';
      return base + '@media (min-width:760px){.sh-steps{grid-template-columns:repeat(3,1fr)}.sh-arrow{display:none}}' +
        '.sh-track{font-size:15px;font-weight:700;margin:14px 0 6px;color:var(--text)}' +
        '.sh-track-sub{font-size:12px;color:var(--muted);margin:-4px 0 8px}' +
        '.sh-list{display:flex;flex-direction:column;gap:6px;margin:0 0 12px}' +
        '.sh-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--panel)}' +
        '.sh-row-tx{flex:1;min-width:0}.sh-row-t{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sh-row-s{font-size:12px;color:var(--muted)}' +
        '.sh-row-go{min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}' +
        '.sh-in{width:100%;box-sizing:border-box;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit}' +
        '.sh-lbl{display:block;font-size:13px;color:var(--muted);margin:8px 0 4px}' +
        '.sh-main{display:block;width:100%;min-height:44px;margin:12px 0 0;border-radius:10px;border:1px solid var(--gold);background:color-mix(in srgb,var(--gold) 14%,var(--panel));color:var(--text);font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}' +
        '.sh-links{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
        '.sh-link{display:inline-flex;align-items:center;min-height:40px;padding:6px 12px;border-radius:999px;border:1px solid var(--border);color:var(--text);text-decoration:none;font-size:13px;overflow-wrap:anywhere}' +
        '.sh-row-btn{cursor:pointer;width:100%;text-align:left;font-family:inherit;color:var(--text)}';
    },
    _css: function() {
      if (document.getElementById('sh-css')) return;
      var st = document.createElement('style'); st.id = 'sh-css'; st.textContent = this.css();
      document.head.appendChild(st);
    },

    injectPage: function() {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || document.getElementById('page-' + P.selling)) return;
      var app = document.getElementById('app');
      if (!app) return;
      this._css();
      var page = document.createElement('div');
      page.className = 'page';
      page.id = 'page-' + P.selling;
      // UI Debloat (Oct 27 2026, Alex: "each method needs to be broken down into smaller
      // pages"): Selling home = What's next + 4 tiles; each tile opens its own page (ui.openSection).
      page.innerHTML = '<div class="section-title">💼 Selling</div>' +
        '<div id="sh-bar"></div><div id="sh-next"></div><div id="sh-home-tiles"></div>';
      app.appendChild(page);
    },

    // A step still being built says so (never a silent button).
    soon: function(what, step) {
      RPGACE.utils.toast(what + ' comes in ' + step + ' of the Selling plan', 'var(--gold)', 2600);
    },

    render: function() {
      var H = RPGACE.modules.sellingHub, U = H.ui;
      var bar = document.getElementById('sh-bar'), next = document.getElementById('sh-next');
      if (!bar || !next) return;
      bar.replaceWith(Object.assign(RPGACE.areaNav.bar('selling', { isHub: true }), { id: 'sh-bar' }));
      next.textContent = 'Loading…';
      U.renderLog();
      H.logic.load().then(function(m) { H._model = m; U.renderNext(m); U.renderHomeTiles(m); U.renderTracks(m); U.renderMoney(m); })
        .catch(function(e) { next.textContent = '⚠️ Could not load Selling: ' + (e && e.message || e); });
    },
    // The four Selling pages, one tile each.
    SECTIONS: {
      beats: { title: '🥁 Beats for sale', sub: 'List → Promote → Sell → Paid', html: '<div id="sh-beats" class="sh-steps"></div>' },
      outreach: { title: '🎤 Artist outreach', sub: 'Find → Pitch → Follow up → Deal → Paid', html: '<div id="sh-outreach" class="sh-steps"></div>' },
      log: { title: '📤 Outreach & collabs log', sub: 'Anything sent outside a pitch, and collabs done', html: '<div id="sh-log"></div>' },
      money: { title: '💷 Money in', sub: 'This month, by type, best sellers', html: '<div id="sh-money"></div>' }
    },
    renderHomeTiles: function(m) {
      var H = RPGACE.modules.sellingHub, U = H.ui, el = document.getElementById('sh-home-tiles');
      if (!el) return;
      var n = function(x, w) { return x + ' ' + w + (x === 1 ? '' : 's'); };
      var mo = m.money || {};
      RPGACE.areaNav.steps(el, [
        { n: 'beats', name: '🥁 Beats for sale', count: n(m.beats.listed, 'beat') + ' listed · ' + n(m.sales.n, 'sale'), open: function() { U.openSection('beats'); } },
        { n: 'outreach', name: '🎤 Artist outreach', count: m.pitches + ' pitch' + (m.pitches === 1 ? '' : 'es') + ' · ' + m.stages.to_send + ' to send', badge: m.followDue ? m.followDue + ' to follow up' : '', open: function() { U.openSection('outreach'); } },
        { n: 'log', name: '📤 Outreach log', count: 'Messages and collabs', open: function() { U.openSection('log'); } },
        { n: 'money', name: '💷 Money in', count: mo.target ? '£' + Math.round(mo.month || 0) + ' of £' + Math.round(mo.target) + ' this month' : 'No monthly target yet', open: function() { U.openSection('money'); } }
      ], function() { return document.createElement('button'); }, 'sh-home-tile');
    },
    openSection: function(key) {
      var H = RPGACE.modules.sellingHub, U = H.ui, sec = U.SECTIONS[key];
      if (!sec) return null;
      U._css();
      var host = RPGACE.areaNav.page('selling', 'selling-' + key, sec.title, { key: 'selling-' + key, label: sec.title, open: function() { U.openSection(key); } });
      if (!host) return null;
      host.box.innerHTML = '<div class="sh-track-sub" style="margin-bottom:8px">' + sec.sub + '</div>' + sec.html;
      if (key === 'log') { U.renderLog(); return host; }
      var draw = function(m) { if (key === 'money') U.renderMoney(m); else U.renderTracks(m); };
      if (H._model) draw(H._model);
      H.logic.load().then(function(m) { H._model = m; draw(m); }).catch(function(e) { host.box.textContent = '⚠️ Could not load Selling: ' + (e && e.message || e); });
      return host;
    },

    renderNext: function(m) {
      var U = RPGACE.modules.sellingHub.ui, el = document.getElementById('sh-next');
      // RF-4: the shared What's next (areaNav.next), rows keep the sh- classes.
      RPGACE.areaNav.next(el, m.next.map(function(n) {
        return { icon: n.icon, title: n.title, sub: n.sub, go: [n.verb, function() { U.act(n); }] };
      }), { cls: 'sh', open: true, empty: 'Nothing waiting. Release a beat or add an artist to get started.' });
    },
    act: function(n) {
      var U = RPGACE.modules.sellingHub.ui;
      if (n.kind === 'beat') { var bh = RPGACE.modules.beatsHub; if (bh) bh.ui.openBeat(n.beat.id); return; }
      if (n.kind === 'follow') { U.openSweep(); return; }
      if (n.send) U.openPitch(n.send.pitch_id);
    },

    // One step card (same markup as Posting / Knowledge homes).
    _step: function(el, s, i) {
      if (i) { var a = document.createElement('div'); a.className = 'sh-arrow'; a.setAttribute('aria-hidden', 'true'); a.textContent = '↓'; el.appendChild(a); }
      var card = document.createElement('div'); card.className = 'sh-step'; card.dataset.step = s.key;
      var top = document.createElement('div'); top.className = 'sh-step-top';
      var nn = document.createElement('span'); nn.className = 'sh-step-n'; nn.textContent = s.n;
      var nm = document.createElement('span'); nm.className = 'sh-step-name'; nm.textContent = s.name;
      var wh = document.createElement('span'); wh.className = 'sh-step-what'; wh.textContent = s.what;
      top.appendChild(nn); top.appendChild(nm); top.appendChild(wh);
      var ct = document.createElement('div'); ct.className = 'sh-step-count'; ct.textContent = s.count;
      card.appendChild(top); card.appendChild(ct);
      var btns = s.btns || (s.btn ? [s.btn] : []);
      if (btns.length) {
        var bs = document.createElement('div'); bs.className = 'sh-step-btns';
        btns.forEach(function(b) {
          var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'sh-btn'; bt.textContent = b[0];
          bt.onclick = b[1];
          bs.appendChild(bt);
        });
        card.appendChild(bs);
      }
      el.appendChild(card);
    },

    renderTracks: function(m) {
      var U = RPGACE.modules.sellingHub.ui, bh = RPGACE.modules.beatsHub;
      var n = function(x, w) { return x + ' ' + w + (x === 1 ? '' : 's'); };
      var money = '£' + m.sales.total.toFixed(2).replace(/\.00$/, '');
      var beats = document.getElementById('sh-beats'), out = document.getElementById('sh-outreach');
      var mk = function(b) { var x = document.createElement('button'); x.type = 'button'; x.className = 'sh-btn'; x.textContent = b[0]; x.onclick = b[1]; return x; };
      var tiles = function(host, list) { if (host) RPGACE.areaNav.steps(host, list, mk, 'sh-step'); };
      if (!beats && !out) return;
      [
        { key: 'list', n: 1, name: 'List', what: 'a selling link (Beatstars)', count: n(m.beats.listed, 'beat') + ' listed · ' + m.beats.unlisted + ' released without one',
          btns: [['🏷 Not listed (' + m.beats.unlisted + ')', function() { U.openBeatList('list'); }], ['🎬 My beats', function() { RPGACE.modules.dashDeck._openPage('cpl-widget'); }]] },
        { key: 'promote', n: 2, name: 'Promote', what: 'posts that show the beat', count: n(m.beats.promoted, 'released beat') + ' with a video post',
          btns: [['📣 Promote a beat', function() { U.openBeatList('promote'); }]] },
        { key: 'sell', n: 3, name: 'Sell', what: 'licence prices', count: n(m.beats.priced, 'beat') + ' priced · ' + (m.lists ? m.lists.sell.length : 0) + ' not priced',
          btns: [['💰 Not priced (' + (m.lists ? m.lists.sell.length : 0) + ')', function() { U.openBeatList('sell'); }], ['⚙️ Standard prices', function() { U.editStandard(); }]] },
        { key: 'paid', n: 4, name: 'Paid', what: 'logged sales', count: n(m.sales.n, 'sale') + ' · ' + money,
          btns: [['💷 Log a sale', function() { U.openBeatList('paid'); }]] }
      ].forEach(function(s) { s.name = s.n + ' ' + s.name; (tiles._b = tiles._b || []).push(s); });
      tiles(beats, tiles._b); tiles._b = null;
      var st = m.stages;
      [
        { key: 'find', n: 1, name: 'Find', what: 'artist profiles', count: n(m.artists, 'artist'), btns: [['＋ Add artist', function() { U.editArtist(null); }], ['🎤 Artists', function() { U.openArtists(); }]] },
        { key: 'pitch', n: 2, name: 'Pitch', what: 'one pitch, many artists', count: m.pitches + ' pitch' + (m.pitches === 1 ? '' : 'es') + ' · ' + st.to_send + ' to send', btns: [['＋ New pitch', function() { U.editPitch(null); }], ['📋 Pitches', function() { U.openPitches(); }]] },
        { key: 'follow', n: 3, name: 'Follow up', what: 'sent, waiting on a reply', count: st.potential_pitch + ' potential pitch' + (st.potential_pitch === 1 ? '' : 'es') + ' · ' + m.followDue + ' due a follow-up · ' + st.no_reply + ' no reply',
          btns: [['🔁 Follow-up sweep' + (m.followDue ? ' (' + m.followDue + ')' : ''), function() { U.openSweep(); }]] },
        { key: 'deal', n: 4, name: 'Deal', what: 'pushback or agreed', count: st.potential_close + ' potential close · ' + st.agreed_sale + ' agreed sale' + (st.agreed_sale === 1 ? '' : 's') },
        { key: 'paid', n: 5, name: 'Paid', what: 'money in', count: st.paid + ' paid · ' + st.no + ' said no' }
      ].forEach(function(s) { s.name = s.n + ' ' + s.name; (tiles._o = tiles._o || []).push(s); });
      tiles(out, tiles._o); tiles._o = null;
      if (out) {
        var fl = document.createElement('div'); fl.id = 'sh-funnel'; fl.className = 'sh-row-s'; fl.style.margin = '8px 0 14px';
        fl.textContent = RPGACE.modules.sellingHub.logic.funnelLine(m.funnel);
        out.appendChild(fl);
      }
    },

    // SH-6 (Oct 17 2026): the outreach & collabs log (producerTools' own block).
    renderLog: function() {
      var el = document.getElementById('sh-log'), pt = RPGACE.modules.producerTools;
      if (!el || !pt) return;
      el.textContent = '';
      pt.ui.renderOutreachInto(el);
    },
    // ── SH-5 (Oct 17 2026): money in ─────────────────────────────────
    renderMoney: function(m) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui, el = document.getElementById('sh-money');
      if (!el || !m.money) return;
      var mo = m.money, f = function(x) { return '£' + Number(x).toFixed(2).replace(/\.00$/, ''); };
      el.textContent = '';
      var card = document.createElement('div'); card.className = 'sh-step'; card.id = 'sh-money-card';
      var line = document.createElement('div'); line.className = 'sh-row-t'; line.id = 'sh-money-line'; line.textContent = '🎯 ' + L.moneyLine(mo);
      card.appendChild(line);
      if (mo.target) {
        var bar = document.createElement('div'); bar.className = 'sh-bar'; bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuenow', mo.pct); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
        bar.style.cssText = 'height:8px;border-radius:4px;background:var(--border);margin:8px 0 4px;overflow:hidden;';
        var fill = document.createElement('div'); fill.style.cssText = 'height:100%;width:' + mo.pct + '%;background:' + (mo.behind ? 'var(--red, #CC4A4A)' : 'var(--gold)') + ';';
        bar.appendChild(fill); card.appendChild(bar);
        var pace = document.createElement('div'); pace.className = 'sh-row-s'; pace.textContent = 'On pace today: ' + f(mo.pace) + ' · ' + (mo.daysIn - mo.day + 1) + ' days left · year target ' + f(mo.target * 12);
        card.appendChild(pace);
      }
      var add = function(id, label, text) {
        if (!text) return;
        var d = document.createElement('div'); d.className = 'sh-row-s'; d.id = id; d.style.marginTop = '8px';
        var b = document.createElement('b'); b.textContent = label + ' '; d.appendChild(b); d.appendChild(document.createTextNode(text)); card.appendChild(d);
      };
      add('sh-money-month-kind', 'This month:', L.kindLine(mo.monthKind));
      add('sh-money-kind', 'All time by type:', L.kindLine(mo.byKind) + (mo.total ? ' (' + f(mo.total) + ')' : ''));
      add('sh-money-best', 'Best sellers:', mo.best.map(function(b) { return b.title + ' ' + f(b.total) + ' (' + b.n + ')'; }).join(' · '));
      add('sh-money-rates', 'Pitch → deal:', (m.rates || []).slice(0, 4).map(function(r) { return r.title + ' ' + L.rateLine(r); }).join(' · '));
      if (!mo.total) { var none = document.createElement('div'); none.className = 'sh-row-s'; none.style.marginTop = '8px'; none.textContent = 'No income logged yet. Sales from Beats and paid pitches land here.'; card.appendChild(none); }
      var bs = document.createElement('div'); bs.className = 'sh-step-btns';
      [['🎯 Monthly target', function() { U.editTarget(mo.target); }], ['＋ Other income', function() { U.logIncome(); }],
        ['💷 Money out & receipts', function() { var mh = RPGACE.modules.moneyHub; if (mh) mh.open('selling'); }]].forEach(function(b) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'sh-btn'; bt.textContent = b[0]; bt.onclick = b[1]; bs.appendChild(bt);
      });
      card.appendChild(bs);
      el.appendChild(card);
    },
    editTarget: function(current) {
      var U = RPGACE.modules.sellingHub.ui, xs = RPGACE.modules.xpSeason;
      if (!xs) { U._fail('XP is not loaded', ''); return; }
      var pop = U._pop('🎯 Monthly income target', 'Cancel');
      var box = document.createElement('div'); box.id = 'sh-target';
      var lab = document.createElement('label'); lab.className = 'sh-lbl'; lab.htmlFor = 'sh-target-in'; lab.textContent = 'Per month (£) — your year target for Tycoon becomes 12×';
      var inp = document.createElement('input'); inp.id = 'sh-target-in'; inp.className = 'sh-in'; inp.type = 'number'; inp.min = '0'; inp.step = '1'; inp.inputMode = 'decimal'; inp.value = current != null ? current : '';
      var save = document.createElement('button'); save.type = 'button'; save.id = 'sh-target-save'; save.className = 'sh-main'; save.textContent = '💾 Save target';
      save.onclick = function() {
        save.disabled = true;
        xs.logic.setMonthlyTarget(inp.value).then(function(v) {
          pop.close();
          RPGACE.utils.toast(v == null ? 'Monthly target cleared' : '🎯 £' + v + ' a month (£' + Math.round(v * 12) + ' a year)', 'var(--green)', 2400);
          U._refreshHome();
        }, function(e) { save.disabled = false; U._fail('Target not saved', e); });
      };
      box.appendChild(lab); box.appendChild(inp); box.appendChild(save);
      pop.box.appendChild(box);
    },
    // Royalties and other income that isn't a beat sale (same one sale path).
    logIncome: function() {
      var U = RPGACE.modules.sellingHub.ui, bh = RPGACE.modules.beatsHub;
      if (!bh) { U._fail('Beats is not loaded', ''); return; }
      var pop = U._pop('＋ Other income', 'Cancel');
      var box = document.createElement('div'); box.id = 'sh-income';
      var mk = function(id, label, el) { var l = document.createElement('label'); l.className = 'sh-lbl'; l.htmlFor = id; l.textContent = label; el.id = id; el.className = 'sh-in'; box.appendChild(l); box.appendChild(el); return el; };
      var kind = mk('sh-inc-kind', 'Type', document.createElement('select'));
      ['royalties', 'placement', 'collab', 'lease', 'exclusive', 'other'].forEach(function(k) { var o = document.createElement('option'); o.value = k; o.textContent = bh.logic.INCOME_KINDS[k]; kind.appendChild(o); });
      var what = mk('sh-inc-what', 'What for', document.createElement('input')); what.type = 'text'; what.maxLength = 80; what.placeholder = 'e.g. DistroKid September';
      var amt = mk('sh-inc-amount', 'Amount (£)', document.createElement('input')); amt.type = 'number'; amt.min = '0'; amt.step = '0.01'; amt.inputMode = 'decimal';
      var date = mk('sh-inc-date', 'Date', document.createElement('input')); date.type = 'date'; date.value = RPGACE.modules.doingNow ? RPGACE.modules.doingNow.logic.iso() : new Date().toISOString().slice(0, 10);
      var save = document.createElement('button'); save.type = 'button'; save.id = 'sh-inc-save'; save.className = 'sh-main'; save.textContent = '💷 Log income';
      save.onclick = function() {
        var nm = bh.logic.INCOME_KINDS[kind.value], w = what.value.trim();
        save.disabled = true;
        bh.logic.logSale({ id: null, title: w || nm }, { amount: amt.value, kind: kind.value, item: nm + (w ? ': ' + w : ''), date: date.value }).then(function(r) {
          pop.close();
          RPGACE.utils.toast('💷 £' + r.amount.toFixed(2) + ' ' + nm.toLowerCase() + ' logged', 'var(--gold)', 2400);
          U._refreshHome();
        }, function(e) { save.disabled = false; U._fail('Income not logged', e); });
      };
      box.appendChild(save);
      pop.box.appendChild(box);
    },
    // My Day: one line when a monthly target is set.
    myDayLine: function(panel) {
      var L = RPGACE.modules.sellingHub.logic, tp = RPGACE.modules.tripPlans;
      if (!panel || !tp || !tp.logic.signedIn()) return;
      var box = document.createElement('div'); box.id = 'myday-selling';
      box.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:12px 0;';
      panel.appendChild(box);
      var now = Date.now(), d = new Date(now), from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
      Promise.all([L.read('xp_settings', 'select=monthly_income_target,revenue_target&id=eq.1'),
        Promise.resolve(RPGACE.sb.select('chronicles_finance', 'select=amount,entry_date&type=eq.sale&entry_date=gte.' + from + '&limit=1000')).catch(function() { return []; })]).then(function(r) {
        var mo = L.money(Array.isArray(r[1]) ? r[1] : [], [], L.targetOf(r[0][0] || null), now);
        if (!mo.target) { box.remove(); return; }
        var t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:200px;font-size:14px;color:var(--text);font-variant-numeric:tabular-nums';
        var b0 = document.createElement('b'); b0.textContent = '💷 Income'; t.appendChild(b0); t.appendChild(document.createElement('br'));
        var sp = document.createElement('span'); sp.className = 'myday-selling-line'; sp.style.fontSize = '13px'; sp.style.color = mo.month >= mo.target ? 'var(--green)' : mo.behind ? '#CC4A4A' : 'var(--text)'; sp.textContent = L.moneyLine(mo);
        t.appendChild(sp);
        var o = document.createElement('button'); o.type = 'button'; o.className = 'sh-row-go'; o.id = 'myday-selling-open'; o.textContent = 'Open';
        o.onclick = function() { RPGACE.modules.sellingHub.open(); };
        box.appendChild(t); box.appendChild(o);
      }).catch(function() { box.remove(); });
    },

    // ── SH-4 (Oct 17 2026): beats behind each Beats-for-sale step ─────
    LIST_STEPS: {
      list:    { title: '🏷 Not listed yet', empty: 'Every released beat has a selling link.', note: 'Released beats with no Beatstars link. Add the link once it is up.' },
      promote: { title: '📣 Promote a beat', empty: 'No released beats yet — release one from My beats first.', note: 'Not shown in a posted video yet come first.' },
      sell:    { title: '💰 Not priced yet', empty: 'Every beat has licence prices.', note: 'Your standard prices fill in — change any, then save.' },
      paid:    { title: '💷 Log a sale', empty: 'No beats logged yet.', note: 'Pick the beat that sold.' }
    },
    openBeatList: function(step) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui, bh = RPGACE.modules.beatsHub, ph = RPGACE.modules.postingHub;
      var cfg = U.LIST_STEPS[step];
      if (!cfg) return;
      var pop = U._pop(cfg.title);
      var box = document.createElement('div'); box.id = 'sh-beatlist'; box.dataset.step = step; box.className = 'sh-list';
      box.textContent = 'Loading beats…';
      pop.box.appendChild(box);
      var again = function() { pop.close(); U._refreshHome(); U.openBeatList(step); };
      L.load().then(function(m) {
        H._model = m;
        var rows = m.lists[step] || [];
        box.textContent = '';
        var note = document.createElement('div'); note.className = 'sh-row-s'; note.style.margin = '0 0 8px';
        note.textContent = rows.length ? cfg.note : cfg.empty;
        box.appendChild(note);
        rows.forEach(function(b) {
          var row = document.createElement('div'); row.className = 'sh-row sh-beat'; row.dataset.id = b.id;
          var tx = document.createElement('div'); tx.className = 'sh-row-tx';
          var t = document.createElement('div'); t.className = 'sh-row-t'; t.textContent = '🥁 ' + (b.con_id ? '#' + b.con_id + ' ' : '') + (b.title || 'Beat');
          var sub = document.createElement('div'); sub.className = 'sh-row-s';
          var tiers = bh ? bh.logic.tiersOf(b) : [];
          var priced = tiers.filter(function(x) { return x.price != null; });
          var earned = m.money && m.money.perBeat[b.id];
          sub.textContent = [b.released_at ? 'Released' : 'Not released', step === 'promote' ? (m.lists.shown[b.id] ? 'shown in a video' : 'no video post yet') : '',
            step === 'paid' ? (earned ? '£' + earned.total.toFixed(2).replace(/\.00$/, '') + ' from ' + earned.n + ' sale' + (earned.n === 1 ? '' : 's') : 'no sales yet') : '',
            priced.length ? 'from £' + Math.min.apply(null, priced.map(function(x) { return x.price; })) : (step === 'list' ? '' : 'no prices')].filter(Boolean).join(' · ');
          tx.appendChild(t); tx.appendChild(sub);
          var acts = document.createElement('div'); acts.className = 'sh-links';
          var add = function(label, cls, fn) { var x = document.createElement('button'); x.type = 'button'; x.className = 'sh-row-btn ' + cls; x.textContent = label; x.onclick = fn; acts.appendChild(x); };
          if (step === 'list') add('🏷 Add link', 'sh-b-link', function() { if (bh) { pop.close(); bh.ui.openRelease(b, again); } });
          if (step === 'promote') {
            add('🎧 A&R Critic', 'sh-b-ar', function() { pop.close(); U.critique(b, !!m.lists.shown[b.id]); });
            add('📣 Make a video', 'sh-b-video', function() {
              if (!ph) { U._fail('Posting is not loaded', ''); return; }
              ph.logic.fromBeat(b).then(function(post) { pop.close(); ph.open(); ph.ui.openPlan(post.id); }, function(e) { U._fail('Video post not made', e); });
            });
          }
          if (step === 'sell') add('💰 Set prices', 'sh-b-price', function() { if (bh) { pop.close(); bh.ui.openSell(b, U._refreshHome); } });
          if (step === 'paid') add('💷 Log a sale', 'sh-b-sale', function() { if (bh) { pop.close(); bh.ui.openSell(b, U._refreshHome); } });
          row.appendChild(tx); row.appendChild(acts); box.appendChild(row);
        });
      }, function(e) { box.textContent = '⚠️ Could not load beats: ' + (e && e.message || e); });
    },
    // A&R Critic on one real beat (same Business tool, same send path - rule 8).
    critique: function(beat, posted) {
      var pt = RPGACE.modules.producerTools, cp = RPGACE.modules.captionsPanel;
      if (!pt || !cp) { RPGACE.utils.toast('Business tools are not loaded', '#CC4A4A', 3000, 'sellingHub'); return; }
      var i = pt.logic.find('A&R Critic');
      if (i < 0) return;
      cp.logic.sendPrompt(RPGACE.modules.sellingHub.logic.critiquePrompt(beat, posted, pt.CMDS[i][1]), pt.ICONS[i] + ' A&R Critic');
    },
    // Standard licence prices (xp_settings.licence_defaults), filled in on every beat.
    editStandard: function() {
      var U = RPGACE.modules.sellingHub.ui, bh = RPGACE.modules.beatsHub;
      if (!bh) { U._fail('Beats is not loaded', ''); return; }
      var pop = U._pop('⚙️ Standard licence prices', 'Cancel');
      var box = document.createElement('div'); box.id = 'sh-std';
      var note = document.createElement('div'); note.className = 'sh-row-s'; note.style.margin = '0 0 8px';
      note.textContent = 'These fill in on any beat that has no prices yet. A beat\'s own prices stay as they are.';
      var rows = document.createElement('div'); rows.id = 'sh-std-rows'; rows.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      var addRow = function(t) {
        var r = document.createElement('div'); r.className = 'sh-std-row'; r.style.cssText = 'display:flex;gap:6px;align-items:center;';
        var nm = document.createElement('input'); nm.type = 'text'; nm.className = 'sh-in sh-std-name'; nm.maxLength = 40; nm.placeholder = 'Licence'; nm.value = t.name || ''; nm.style.flex = '1 1 90px'; nm.style.minWidth = '0'; nm.setAttribute('aria-label', 'Licence name');
        var pr = document.createElement('input'); pr.type = 'number'; pr.className = 'sh-in sh-std-price'; pr.min = '0'; pr.step = '0.01'; pr.inputMode = 'decimal'; pr.placeholder = '£'; pr.value = t.price == null ? '' : t.price; pr.style.cssText += 'flex:0 0 90px;width:90px;'; pr.setAttribute('aria-label', 'Price in pounds');
        var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'sh-row-btn sh-std-rm'; rm.textContent = '✕'; rm.setAttribute('aria-label', 'Remove licence');
        rm.onclick = function() { r.remove(); };
        r.appendChild(nm); r.appendChild(pr); r.appendChild(rm); rows.appendChild(r);
      };
      var plus = document.createElement('button'); plus.type = 'button'; plus.className = 'sh-row-btn'; plus.id = 'sh-std-add'; plus.textContent = '+ licence';
      plus.onclick = function() { addRow({}); };
      var uk = document.createElement('button'); uk.type = 'button'; uk.className = 'sh-row-btn'; uk.id = 'sh-std-uk'; uk.textContent = '↺ UK starting prices';
      uk.onclick = function() { rows.textContent = ''; bh.logic.UK_DEFAULTS.forEach(addRow); };
      var save = document.createElement('button'); save.type = 'button'; save.id = 'sh-std-save'; save.className = 'sh-main'; save.textContent = '💾 Save standard prices';
      save.onclick = function() {
        var list = Array.prototype.map.call(rows.querySelectorAll('.sh-std-row'), function(r) { return { name: r.querySelector('.sh-std-name').value, price: r.querySelector('.sh-std-price').value }; });
        save.disabled = true;
        bh.logic.saveStandard(list).then(function(t) {
          pop.close();
          RPGACE.utils.toast('💰 Standard prices saved (' + t.length + ')', 'var(--green)', 2200);
        }, function(e) { save.disabled = false; U._fail('Prices not saved', e); });
      };
      var acts = document.createElement('div'); acts.className = 'sh-links'; acts.style.margin = '8px 0';
      acts.appendChild(plus); acts.appendChild(uk);
      box.appendChild(note); box.appendChild(rows); box.appendChild(acts); box.appendChild(save);
      pop.box.appendChild(box);
      rows.textContent = 'Loading…';
      bh.logic.loadStandard().then(function(t) { rows.textContent = ''; t.forEach(addRow); });
    },

    // ── SH-1 (Oct 17 2026): artist profiles ─────────────────────────
    _pop: function(title, closeLabel) {
      this._css();
      return RPGACE.modules.dashDeck._popup({ eyebrow: '💼 Selling', title: title, accent: 'var(--gold)', width: '480px', closeLabel: closeLabel || 'Close' });
    },
    _fail: function(what, e) { RPGACE.utils.toast('⚠️ ' + what + ': ' + (e && e.message || e), '#CC4A4A', 4000, 'sellingHub'); },
    _refreshHome: function() {
      var P = RPGACE.CONFIG.pages, pg = document.getElementById('page-' + P.selling);
      if (pg && pg.offsetParent !== null) { RPGACE.modules.sellingHub.ui.render(); return; }
      // UI Debloat: on one of the 4 Selling pages, redraw that page's tiles too.
      var H = RPGACE.modules.sellingHub, U = H.ui;
      var open = Object.keys(U.SECTIONS || {}).filter(function(k) { var e = document.getElementById('page-selling-' + k); return e && e.offsetParent !== null; })[0];
      if (open) H.logic.load().then(function(m) { H._model = m; if (open === 'money') U.renderMoney(m); else if (open === 'log') U.renderLog(); else U.renderTracks(m); }).catch(function() {});
    },

    // Add (artist null) or edit an artist.
    editArtist: function(artist) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui, a = artist || {};
      var pop = U._pop(artist ? 'Edit ' + artist.name : 'Add artist', 'Cancel');
      var form = document.createElement('div'); form.id = 'sh-artist-form';
      L.FIELDS.forEach(function(f) {
        var lab = document.createElement('label'); lab.className = 'sh-lbl'; lab.htmlFor = 'sh-a-' + f[0];
        lab.textContent = f[1] + (f[0] === 'name' ? ' *' : '');
        var inp = document.createElement(f[0] === 'notes' ? 'textarea' : 'input');
        inp.id = 'sh-a-' + f[0]; inp.className = 'sh-in'; inp.maxLength = f[3]; inp.placeholder = f[2];
        if (f[0] === 'notes') inp.rows = 3; else inp.type = f[0] === 'email' ? 'email' : f[0] === 'phone' ? 'tel' : 'text';
        inp.value = a[f[0]] || '';
        form.appendChild(lab); form.appendChild(inp);
      });
      // Optional link to someone already in People (never creates one).
      var plab = document.createElement('label'); plab.className = 'sh-lbl'; plab.htmlFor = 'sh-a-person'; plab.textContent = 'Also in People? (optional)';
      var psel = document.createElement('select'); psel.id = 'sh-a-person'; psel.className = 'sh-in';
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '— not linked —'; psel.appendChild(o0);
      form.appendChild(plab); form.appendChild(psel);
      L.read('people', 'select=id,name&order=name.asc&limit=300').then(function(people) {
        people.forEach(function(p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; psel.appendChild(o); });
        psel.value = a.person_id || '';
      });
      var save = document.createElement('button'); save.type = 'button'; save.id = 'sh-a-save'; save.className = 'sh-main';
      save.textContent = artist ? '💾 Save changes' : '＋ Add artist';
      save.onclick = function() {
        var f = { person_id: psel.value || null };
        L.FIELDS.forEach(function(x) { f[x[0]] = form.querySelector('#sh-a-' + x[0]).value; });
        save.disabled = true;
        L.saveArtist(artist && artist.id, f).then(function(saved) {
          pop.close();
          RPGACE.utils.toast('🎤 ' + (artist ? 'Saved ' : 'Added ') + saved.name, 'var(--green)', 2200);
          U._refreshHome();
          U.openArtist(saved.id);
        }, function(e) { save.disabled = false; U._fail(artist ? 'Not saved' : 'Artist not added', e); });
      };
      form.appendChild(save);
      pop.box.appendChild(form);
      setTimeout(function() { try { form.querySelector('#sh-a-name').focus(); } catch (e) {} }, 60);
    },

    // The artists list with search.
    openArtists: function() {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('🎤 Artists');
      var wrap = document.createElement('div'); wrap.id = 'sh-artists';
      var add = document.createElement('button'); add.type = 'button'; add.className = 'sh-main'; add.style.margin = '0 0 10px'; add.textContent = '＋ Add artist';
      add.onclick = function() { pop.close(); U.editArtist(null); };
      var q = document.createElement('input'); q.id = 'sh-artist-q'; q.type = 'search'; q.className = 'sh-in'; q.placeholder = 'Search name, genre or place';
      q.setAttribute('aria-label', 'Search artists');
      var list = document.createElement('div'); list.className = 'sh-list'; list.style.marginTop = '10px'; list.textContent = 'Loading…';
      wrap.appendChild(add); wrap.appendChild(q); wrap.appendChild(list);
      pop.box.appendChild(wrap);
      var all = [];
      var draw = function() {
        list.textContent = '';
        var hits = L.searchArtists(all, q.value);
        if (!hits.length) {
          var none = document.createElement('div'); none.className = 'sh-row-s';
          none.textContent = all.length ? 'No artist matches that.' : 'No artists yet — add the first one.';
          list.appendChild(none); return;
        }
        hits.forEach(function(a) {
          var row = document.createElement('button'); row.type = 'button'; row.className = 'sh-row sh-row-btn sh-artist-row'; row.dataset.id = a.id;
          var tx = document.createElement('div'); tx.className = 'sh-row-tx';
          var t = document.createElement('div'); t.className = 'sh-row-t'; t.textContent = a.name;
          var sub = document.createElement('div'); sub.className = 'sh-row-s'; sub.textContent = [a.genre, a.location].filter(Boolean).join(' · ') || 'No details yet';
          tx.appendChild(t); tx.appendChild(sub); row.appendChild(tx);
          row.onclick = function() { pop.close(); U.openArtist(a.id); };
          list.appendChild(row);
        });
      };
      q.addEventListener('input', draw);
      L.loadArtists().then(function(r) { all = r; draw(); }, function(e) { list.textContent = '⚠️ Could not load artists: ' + (e && e.message || e); });
    },

    // One artist: contact links, their pitches, edit, delete.
    openArtist: function(id) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('🎤 Artist');
      var wrap = document.createElement('div'); wrap.id = 'sh-artist'; wrap.textContent = 'Loading…';
      pop.box.appendChild(wrap);
      L.loadArtist(id).then(function(d) {
        var a = d.artist;
        wrap.textContent = '';
        var h = document.createElement('div'); h.style.cssText = 'font-size:20px;font-weight:700;overflow-wrap:anywhere'; h.textContent = a.name;
        var sub = document.createElement('div'); sub.className = 'sh-row-s'; sub.textContent = [a.genre, a.location].filter(Boolean).join(' · ');
        wrap.appendChild(h); if (sub.textContent) wrap.appendChild(sub);
        var links = L.contactLinks(a);
        if (links.length) {
          var lw = document.createElement('div'); lw.className = 'sh-links';
          links.forEach(function(l) {
            var x = document.createElement('a'); x.className = 'sh-link'; x.href = l.href; x.textContent = l.label;
            if (/^https?:/.test(l.href)) { x.target = '_blank'; x.rel = 'noopener'; }
            lw.appendChild(x);
          });
          wrap.appendChild(lw);
        }
        [['Manager', a.manager], ['Notes', a.notes]].forEach(function(r) {
          if (!r[1]) return;
          var b = document.createElement('div'); b.style.cssText = 'margin:8px 0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere';
          var k = document.createElement('div'); k.className = 'sh-row-s'; k.textContent = r[0];
          var v = document.createElement('div'); v.textContent = r[1];
          b.appendChild(k); b.appendChild(v); wrap.appendChild(b);
        });
        var ph = document.createElement('div'); ph.className = 'sh-lbl'; ph.textContent = 'Pitches (' + d.sends.length + ')';
        wrap.appendChild(ph);
        var pl = document.createElement('div'); pl.className = 'sh-list'; pl.id = 'sh-artist-pitches';
        if (!d.sends.length) {
          var none = document.createElement('div'); none.className = 'sh-row-s'; none.textContent = 'No pitches sent to ' + a.name + ' yet.';
          pl.appendChild(none);
        }
        d.sends.forEach(function(sn) {
          var st = L.STAGES[sn.stage] || { icon: '', name: sn.stage };
          var row = document.createElement('div'); row.className = 'sh-row';
          var tx = document.createElement('div'); tx.className = 'sh-row-tx';
          var t = document.createElement('div'); t.className = 'sh-row-t'; t.textContent = sn.title;
          var s2 = document.createElement('div'); s2.className = 'sh-row-s';
          s2.textContent = st.icon + ' ' + st.name + (sn.sent_at ? ' · sent ' + String(sn.sent_at).slice(0, 10) : '') + (sn.deal_amount ? ' · £' + sn.deal_amount : '');
          tx.appendChild(t); tx.appendChild(s2); row.appendChild(tx); pl.appendChild(row);
        });
        wrap.appendChild(pl);
        var acts = document.createElement('div'); acts.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px';
        var ed = document.createElement('button'); ed.type = 'button'; ed.id = 'sh-artist-edit'; ed.className = 'sh-main'; ed.style.margin = '0'; ed.textContent = '✏️ Edit';
        ed.onclick = function() { pop.close(); U.editArtist(a); };
        var del = document.createElement('button'); del.type = 'button'; del.id = 'sh-artist-del'; del.className = 'sh-main';
        del.style.cssText = 'margin:0;border-color:#CC4A4A;background:none'; del.textContent = '🗑 Delete';
        var armed = null;
        del.onclick = function() {
          if (!armed) {
            del.textContent = d.sends.length ? 'Delete ' + a.name + ' and their ' + d.sends.length + ' pitch' + (d.sends.length === 1 ? '' : 'es') + '?' : 'Tap again to delete';
            armed = setTimeout(function() { armed = null; del.textContent = '🗑 Delete'; }, 3000);
            return;
          }
          clearTimeout(armed); del.disabled = true;
          L.deleteArtist(a.id).then(function() {
            pop.close();
            RPGACE.utils.toast('🗑 Deleted ' + a.name, 'var(--gold)', 2200);
            U._refreshHome();
          }, function(e) { del.disabled = false; U._fail('Not deleted', e); });
        };
        acts.appendChild(ed); acts.appendChild(del); wrap.appendChild(acts);
      }, function(e) { wrap.textContent = '⚠️ Could not load the artist: ' + (e && e.message || e); });
    },

    // ── SH-2 (Oct 17 2026): pitches ─────────────────────────────────
    _btn: function(cls, txt, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt; b.onclick = fn; return b;
    },

    // New (pitch null) or edit.
    editPitch: function(pitch) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui, p = pitch || {};
      var pop = U._pop(pitch ? 'Edit pitch' : 'New pitch', 'Cancel');
      var form = document.createElement('div'); form.id = 'sh-pitch-form';
      var field = function(id, label, el) { var l = document.createElement('label'); l.className = 'sh-lbl'; l.htmlFor = id; l.textContent = label; form.appendChild(l); form.appendChild(el); return el; };
      var title = document.createElement('input'); title.id = 'sh-p-title'; title.className = 'sh-in'; title.maxLength = 120; title.placeholder = 'e.g. Dark drill pack for UK rappers'; title.value = p.title || '';
      field('sh-p-title', 'Pitch title *', title);
      var kl = document.createElement('div'); kl.className = 'sh-lbl'; kl.textContent = 'What are you offering? *'; form.appendChild(kl);
      var kinds = document.createElement('div'); kinds.id = 'sh-p-kinds'; kinds.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px';
      var kind = p.kind || null;
      L.PITCH_KIND_ORDER.forEach(function(k) {
        var b = U._btn('sh-row-go sh-kind', L.PITCH_KINDS[k].icon + ' ' + L.PITCH_KINDS[k].name, function() {
          kind = k; kinds.querySelectorAll('.sh-kind').forEach(function(x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); x.style.background = x === b ? 'color-mix(in srgb,var(--gold) 20%,var(--panel))' : 'none'; });
        });
        b.dataset.kind = k; b.style.minHeight = '44px';
        b.setAttribute('aria-pressed', k === kind ? 'true' : 'false'); if (k === kind) b.style.background = 'color-mix(in srgb,var(--gold) 20%,var(--panel))';
        kinds.appendChild(b);
      });
      form.appendChild(kinds);
      var bl = document.createElement('div'); bl.className = 'sh-lbl'; bl.textContent = 'Beats in this pitch'; form.appendChild(bl);
      var beatsBox = document.createElement('div'); beatsBox.id = 'sh-p-beats'; beatsBox.className = 'sh-list'; beatsBox.textContent = 'Loading your beats…';
      form.appendChild(beatsBox);
      var beatsAll = [], picked = {};
      (p.beat_ids || []).forEach(function(id) { picked[id] = 1; });
      L.loadBeats().then(function(beats) {
        beatsAll = beats || []; beatsBox.textContent = '';
        if (!beatsAll.length) { beatsBox.textContent = 'No logged beats yet (you can still pitch a collab or placement).'; return; }
        var bline = RPGACE.modules.postingHub ? RPGACE.modules.postingHub.logic.beatLine : function(b) { return b.title; };
        beatsAll.forEach(function(b) {
          var lab = document.createElement('label'); lab.className = 'sh-row'; lab.style.cursor = 'pointer';
          var cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'sh-p-beat'; cb.value = b.id; cb.checked = !!picked[b.id];
          cb.style.cssText = 'width:22px;height:22px;flex:none';
          cb.onchange = function() { if (cb.checked) picked[b.id] = 1; else delete picked[b.id]; };
          var t = document.createElement('span'); t.className = 'sh-row-tx'; t.textContent = bline(b) || b.title;
          lab.appendChild(cb); lab.appendChild(t); beatsBox.appendChild(lab);
        });
      });
      var ask = document.createElement('input'); ask.id = 'sh-p-ask'; ask.className = 'sh-in'; ask.inputMode = 'decimal'; ask.placeholder = 'e.g. 250'; ask.value = p.ask != null ? p.ask : '';
      field('sh-p-ask', 'Your price (£, optional)', ask);
      var msg = document.createElement('textarea'); msg.id = 'sh-p-message'; msg.className = 'sh-in'; msg.rows = 6; msg.maxLength = 2000;
      msg.placeholder = 'Yo {name}, …'; msg.value = p.message || '';
      field('sh-p-message', 'Message — write {name} where the artist\'s name goes', msg);
      var draft = U._btn('sh-row-go', '🔮 Draft message', null); draft.id = 'sh-p-draft'; draft.style.cssText = 'min-height:44px;margin-top:6px';
      var armed = false;
      draft.onclick = function() {
        if (msg.value.trim() && !armed) { armed = true; draft.textContent = 'Replace your message? Tap again'; setTimeout(function() { armed = false; draft.textContent = '🔮 Draft message'; }, 3000); return; }
        armed = false;
        if (!kind) { RPGACE.utils.toast('Pick what you are offering first', 'var(--gold)', 2400); return; }
        var pp = RPGACE.modules.phylumPath;
        if (!pp) { U._fail('Draft', 'Oracle is not loaded'); return; }
        var beats = beatsAll.filter(function(b) { return picked[b.id]; });
        draft.disabled = true; draft.textContent = '🔮 Drafting…';
        pp.logic._callGroundWorkerText(L.draftPrompt({ title: title.value, kind: kind, ask: ask.value, notes: notes.value }, beats), 400).then(function(t) {
          var clean = String(t || '').trim().replace(/^["']|["']$/g, '');
          if (!clean) throw new Error('Oracle sent back nothing');
          if (!/\{name\}/i.test(clean)) clean = 'Yo {name}, ' + clean;
          msg.value = clean.slice(0, 2000);
        }).catch(function(e) { U._fail('Draft failed', e); }).then(function() { draft.disabled = false; draft.textContent = '🔮 Draft message'; });
      };
      form.appendChild(draft);
      var notes = document.createElement('textarea'); notes.id = 'sh-p-notes'; notes.className = 'sh-in'; notes.rows = 2; notes.maxLength = 2000; notes.placeholder = 'Anything Oracle should know (e.g. who it suits)'; notes.value = p.notes || '';
      field('sh-p-notes', 'Notes', notes);
      // SH-3: the short follow-up for anyone who has not replied.
      var fmsg = document.createElement('textarea'); fmsg.id = 'sh-p-follow'; fmsg.className = 'sh-in'; fmsg.rows = 3; fmsg.maxLength = 600;
      fmsg.placeholder = 'Yo {name}, did you get a chance to hear it?'; fmsg.value = p.follow_up_message || '';
      field('sh-p-follow', 'Follow-up message (for no replies) — {name} for their name', fmsg);
      var fdraft = U._btn('sh-row-go', '🔮 Draft follow-up', null); fdraft.id = 'sh-p-fdraft'; fdraft.style.cssText = 'min-height:44px;margin-top:6px';
      fdraft.onclick = function() {
        var pp = RPGACE.modules.phylumPath;
        if (!pp) { U._fail('Draft', 'Oracle is not loaded'); return; }
        fdraft.disabled = true; fdraft.textContent = '🔮 Drafting…';
        pp.logic._callGroundWorkerText(L.followPrompt({ title: title.value, kind: kind, ask: ask.value, message: msg.value }), 200).then(function(t) {
          var clean = String(t || '').trim().replace(/^["']|["']$/g, '');
          if (!clean) throw new Error('Oracle sent back nothing');
          if (!/\{name\}/i.test(clean)) clean = 'Yo {name}, ' + clean;
          fmsg.value = clean.slice(0, 600);
        }).catch(function(e) { U._fail('Draft failed', e); }).then(function() { fdraft.disabled = false; fdraft.textContent = '🔮 Draft follow-up'; });
      };
      form.appendChild(fdraft);
      var save = U._btn('sh-main', pitch ? '💾 Save pitch' : '＋ Save pitch', function() {
        save.disabled = true;
        L.savePitch(pitch && pitch.id, { title: title.value, kind: kind, beat_ids: Object.keys(picked), ask: ask.value, message: msg.value, notes: notes.value, follow_up_message: fmsg.value }).then(function(saved) {
          pop.close();
          RPGACE.utils.toast('📋 ' + (pitch ? 'Saved ' : 'Pitch saved: ') + saved.title.slice(0, 40), 'var(--green)', 2200);
          U._refreshHome();
          U.openPitch(saved.id, !pitch);
        }, function(e) { save.disabled = false; U._fail('Pitch not saved', e); });
      });
      save.id = 'sh-p-save';
      form.appendChild(save);
      pop.box.appendChild(form);
    },

    openPitches: function() {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('📋 Pitches');
      var wrap = document.createElement('div'); wrap.id = 'sh-pitches';
      var add = U._btn('sh-main', '＋ New pitch', function() { pop.close(); U.editPitch(null); }); add.style.margin = '0 0 10px';
      var list = document.createElement('div'); list.className = 'sh-list'; list.textContent = 'Loading…';
      wrap.appendChild(add); wrap.appendChild(list); pop.box.appendChild(wrap);
      L.loadPitches().then(function(ps) {
        list.textContent = '';
        if (!ps.length) { var n = document.createElement('div'); n.className = 'sh-row-s'; n.textContent = 'No pitches yet — make the first one.'; list.appendChild(n); return; }
        ps.forEach(function(p) {
          var k = L.PITCH_KINDS[p.kind] || { icon: '', name: '' };
          var row = U._btn('sh-row sh-row-btn sh-pitch-row', '', function() { pop.close(); U.openPitch(p.id); }); row.dataset.id = p.id;
          var tx = document.createElement('div'); tx.className = 'sh-row-tx';
          var t = document.createElement('div'); t.className = 'sh-row-t'; t.textContent = k.icon + ' ' + p.title;
          var sub = document.createElement('div'); sub.className = 'sh-row-s'; var fr = L.funnel(p.sends); sub.textContent = L.pitchSummary(p.sends) + (p.ask != null ? ' · £' + p.ask : '') + (fr.sent ? ' · deal rate ' + fr.paidPct + '%' : '');
          tx.appendChild(t); tx.appendChild(sub); row.appendChild(tx); list.appendChild(row);
        });
      }, function(e) { list.textContent = '⚠️ Could not load pitches: ' + (e && e.message || e); });
    },

    // One pitch: what it offers, its message, each artist and their stage.
    // SH-7: the pitches a beat is in and each artist's stage; a pitch opens it.
    beatDealsBox: function(beatId, closeFirst) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var box = document.createElement('div'); box.id = 'sh-beat-deals'; box.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)';
      box.textContent = 'Loading deals…';
      L.loadBeatDeals(beatId).then(function(deals) {
        box.textContent = '';
        if (!deals.length) { box.textContent = 'Not in any pitch yet — pitch it from Selling.'; return; }
        deals.forEach(function(d) {
          var k = L.PITCH_KINDS[d.pitch.kind] || { icon: '📋' };
          var b = U._btn('sh-row-go sh-beat-deal', k.icon + ' ' + d.pitch.title, function() { if (closeFirst) closeFirst(); U.openPitch(d.pitch.id); });
          b.dataset.pitch = d.pitch.id; b.style.textAlign = 'left';
          var s = document.createElement('div'); s.className = 'sh-row-s';
          s.textContent = d.sends.length ? d.sends.map(function(x) { return x.name + ' ' + x.icon + ' ' + x.stageName; }).join(' · ') : 'No artists added yet';
          var row = document.createElement('div'); row.appendChild(b); row.appendChild(s); box.appendChild(row);
        });
      }, function(e) { box.textContent = '⚠️ Could not load deals: ' + (e && e.message || e); });
      return box;
    },
    openPitch: function(id, pickNow) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('📋 Pitch');
      var wrap = document.createElement('div'); wrap.id = 'sh-pitch'; wrap.textContent = 'Loading…';
      pop.box.appendChild(wrap);
      L.loadPitch(id).then(function(d) {
        var p = d.pitch, k = L.PITCH_KINDS[p.kind] || { icon: '', name: p.kind };
        wrap.textContent = '';
        var h = document.createElement('div'); h.style.cssText = 'font-size:20px;font-weight:700;overflow-wrap:anywhere'; h.textContent = p.title;
        var sub = document.createElement('div'); sub.className = 'sh-row-s'; sub.textContent = k.icon + ' ' + k.name + (p.ask != null ? ' · £' + p.ask : '');
        wrap.appendChild(h); wrap.appendChild(sub);
        if (d.beats.length) {
          var bl = RPGACE.modules.postingHub ? RPGACE.modules.postingHub.logic.beatLine : function(b) { return b.title; };
          // SH-7: each beat opens its own Sell screen (sales + deals).
          var bb = document.createElement('div'); bb.id = 'sh-pitch-beats'; bb.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px';
          d.beats.forEach(function(b) {
            var bt = U._btn('sh-row-go sh-pitch-beat', '🥁 ' + bl(b), function() { pop.close(); var bh = RPGACE.modules.beatsHub; if (bh) bh.ui.openBeat(b.id, { sell: true }); });
            bt.dataset.beat = b.id; bb.appendChild(bt);
          });
          wrap.appendChild(bb);
        }
        var mh = document.createElement('div'); mh.className = 'sh-lbl'; mh.textContent = 'Message'; wrap.appendChild(mh);
        var mb = document.createElement('div'); mb.id = 'sh-pitch-msg'; mb.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;padding:8px 10px;border:1px solid var(--border);border-radius:8px';
        mb.textContent = p.message || 'No message yet — tap ✏️ Edit to write or draft one.'; wrap.appendChild(mb);
        var ah = document.createElement('div'); ah.className = 'sh-lbl'; ah.textContent = 'Artists (' + d.sends.length + ')'; wrap.appendChild(ah);
        var list = document.createElement('div'); list.className = 'sh-list'; list.id = 'sh-pitch-sends';
        if (!d.sends.length) { var none = document.createElement('div'); none.className = 'sh-row-s'; none.textContent = 'Not sent to anyone yet — add artists.'; list.appendChild(none); }
        d.sends.forEach(function(sd) {
          var st = L.STAGES[sd.stage] || { icon: '', name: sd.stage };
          var row = document.createElement('div'); row.className = 'sh-row sh-send-row'; row.dataset.id = sd.id; row.style.flexWrap = 'wrap';
          var tx = document.createElement('div'); tx.className = 'sh-row-tx';
          var t = document.createElement('div'); t.className = 'sh-row-t'; t.textContent = sd.artist.name;
          var s2 = document.createElement('div'); s2.className = 'sh-row-s';
          s2.textContent = st.icon + ' ' + st.name + (sd.sent_at ? ' · sent ' + String(sd.sent_at).slice(0, 10) + (sd.channel ? ' by ' + (L.CHANNELS[sd.channel] || sd.channel).replace(/^\S+ /, '') : '') : '');
          tx.appendChild(t); tx.appendChild(s2); row.appendChild(tx);
          if (sd.stage === 'to_send') {
            var bx = document.createElement('div'); bx.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
            bx.appendChild(U._btn('sh-row-go sh-copy', '📋 Copy & open', function() { U.copyAndOpen(p, sd); }));
            bx.appendChild(U._btn('sh-row-go sh-outreach-tool', '✉️ Outreach tool', function() { pop.close(); U.outreachTool(p, sd, d.beats); }));
            bx.appendChild(U._btn('sh-row-go sh-sent', '✅ Mark sent', function() { U.askSent(p, sd, function() { pop.close(); U.openPitch(p.id); }); }));
            var rm = U._btn('sh-row-go sh-remove', '✕', null); rm.setAttribute('aria-label', 'Remove ' + sd.artist.name + ' from this pitch');
            var arm = null;
            rm.onclick = function() {
              if (!arm) { rm.textContent = 'Remove?'; arm = setTimeout(function() { arm = null; rm.textContent = '✕'; }, 3000); return; }
              clearTimeout(arm); rm.disabled = true;
              L.removeSend(sd.id).then(function() { pop.close(); U._refreshHome(); U.openPitch(p.id); }, function(e) { rm.disabled = false; U._fail('Not removed', e); });
            };
            bx.appendChild(rm); row.appendChild(bx);
          } else U._stageButtons(row, p, sd, d.beats, function() { pop.close(); U._refreshHome(); U.openPitch(p.id); });
          list.appendChild(row);
        });
        wrap.appendChild(list);
        var add = U._btn('sh-main', '＋ Add artists', function() { pop.close(); U.pickArtists(p, d.sends); }); add.id = 'sh-pitch-add';
        wrap.appendChild(add);
        var acts = document.createElement('div'); acts.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px';
        var ed = U._btn('sh-main', '✏️ Edit', function() { pop.close(); U.editPitch(p); }); ed.id = 'sh-pitch-edit'; ed.style.margin = '0';
        var del = U._btn('sh-main', '🗑 Delete', null); del.id = 'sh-pitch-del'; del.style.cssText = 'margin:0;border-color:#CC4A4A;background:none';
        var armed = null;
        del.onclick = function() {
          if (!armed) { del.textContent = d.sends.length ? 'Delete it and its ' + d.sends.length + ' send' + (d.sends.length === 1 ? '' : 's') + '?' : 'Tap again to delete'; armed = setTimeout(function() { armed = null; del.textContent = '🗑 Delete'; }, 3000); return; }
          clearTimeout(armed); del.disabled = true;
          L.deletePitch(p.id).then(function() { pop.close(); RPGACE.utils.toast('🗑 Pitch deleted', 'var(--gold)', 2200); U._refreshHome(); }, function(e) { del.disabled = false; U._fail('Not deleted', e); });
        };
        acts.appendChild(ed); acts.appendChild(del); wrap.appendChild(acts);
        if (pickNow) { pop.close(); U.pickArtists(p, d.sends); }
      }, function(e) { wrap.textContent = '⚠️ Could not load the pitch: ' + (e && e.message || e); });
    },

    // Tick artists to add to a pitch (one send each).
    pickArtists: function(pitch, sends) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('Send "' + String(pitch.title).slice(0, 40) + '" to…');
      var wrap = document.createElement('div'); wrap.id = 'sh-pick';
      var q = document.createElement('input'); q.type = 'search'; q.id = 'sh-pick-q'; q.className = 'sh-in'; q.placeholder = 'Search name, genre or place'; q.setAttribute('aria-label', 'Search artists');
      var list = document.createElement('div'); list.className = 'sh-list'; list.style.marginTop = '10px'; list.textContent = 'Loading…';
      var have = {}, picked = {}, all = [];
      (sends || []).forEach(function(x) { have[x.artist_id] = 1; });
      var save = U._btn('sh-main', 'Add to pitch', null); save.id = 'sh-pick-save';
      var newA = U._btn('sh-row-go', '＋ New artist', function() { pop.close(); U.editArtist(null); }); newA.style.cssText = 'min-height:44px;margin-top:8px';
      wrap.appendChild(q); wrap.appendChild(list); wrap.appendChild(save); wrap.appendChild(newA); pop.box.appendChild(wrap);
      var count = function() { var n = Object.keys(picked).length; save.textContent = n ? 'Add ' + n + ' artist' + (n === 1 ? '' : 's') + ' to pitch' : 'Add to pitch'; };
      var draw = function() {
        list.textContent = '';
        var hits = L.searchArtists(all, q.value);
        if (!hits.length) { var none = document.createElement('div'); none.className = 'sh-row-s'; none.textContent = all.length ? 'No artist matches that.' : 'No artists yet — add one first.'; list.appendChild(none); return; }
        hits.forEach(function(a) {
          var lab = document.createElement('label'); lab.className = 'sh-row sh-pick-row'; lab.dataset.id = a.id; lab.style.cursor = have[a.id] ? 'default' : 'pointer';
          var cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.cssText = 'width:22px;height:22px;flex:none';
          cb.checked = !!(have[a.id] || picked[a.id]); cb.disabled = !!have[a.id];
          cb.onchange = function() { if (cb.checked) picked[a.id] = 1; else delete picked[a.id]; count(); };
          var tx = document.createElement('span'); tx.className = 'sh-row-tx';
          tx.textContent = a.name + (have[a.id] ? ' — already on this pitch' : (a.genre ? ' · ' + a.genre : ''));
          lab.appendChild(cb); lab.appendChild(tx); list.appendChild(lab);
        });
      };
      q.addEventListener('input', draw);
      save.onclick = function() {
        var ids = Object.keys(picked);
        if (!ids.length) { RPGACE.utils.toast('Tick at least one artist', 'var(--gold)', 2200); return; }
        save.disabled = true;
        L.addSends(pitch.id, ids, sends).then(function(rows) {
          pop.close();
          RPGACE.utils.toast('🎤 Added ' + rows.length + ' artist' + (rows.length === 1 ? '' : 's') + ' — copy the message and send it', 'var(--green)', 2600);
          U._refreshHome(); U.openPitch(pitch.id);
        }, function(e) { save.disabled = false; U._fail('Not added', e); });
      };
      L.loadArtists().then(function(r) { all = r; draw(); }, function(e) { list.textContent = '⚠️ Could not load artists: ' + (e && e.message || e); });
    },

    // Copy the message with their name in it, then open their Instagram / email.
    copyAndOpen: function(pitch, send) {
      var L = RPGACE.modules.sellingHub.logic, U = RPGACE.modules.sellingHub.ui;
      if (!pitch.message) { RPGACE.utils.toast('Write the message first (✏️ Edit)', 'var(--gold)', 2600); return; }
      var text = L.fillName(pitch.message, send.artist.name), href = L.openLink(send.artist, 'dm');
      var go = function() { if (href) window.open(href, /^https?:/.test(href) ? '_blank' : '_self', 'noopener'); };
      var copied = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'));
      copied.then(function() {
        RPGACE.utils.toast('📋 Copied for ' + send.artist.name + (href ? ' — opening their page' : ' — no contact link saved'), 'var(--green)', 2600);
        go();
      }, function() {
        // Fail loud: show the text so it can be copied by hand.
        var pop = U._pop('Copy this message');
        var ta = document.createElement('textarea'); ta.id = 'sh-copy-text'; ta.className = 'sh-in'; ta.rows = 8; ta.value = text; ta.readOnly = true;
        pop.box.appendChild(ta);
        if (href) pop.box.appendChild(U._btn('sh-main', 'Open ' + send.artist.name + '\'s page', go));
        setTimeout(function() { try { ta.focus(); ta.select(); } catch (e) {} }, 60);
      });
    },

    // Mark sent: how it went out. Counts as outreach.
    askSent: function(pitch, send, after) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('✅ Sent to ' + send.artist.name + '?');
      var box = document.createElement('div'); box.id = 'sh-sent'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px';
      var n = document.createElement('div'); n.style.fontSize = '14px'; n.textContent = 'How did you send it? It moves to Potential pitch (waiting on a reply) and counts as outreach.';
      box.appendChild(n);
      Object.keys(L.CHANNELS).forEach(function(c) {
        var b = U._btn('sh-main sh-sent-' + c, L.CHANNELS[c], function() {
          box.querySelectorAll('button').forEach(function(x) { x.disabled = true; });
          L.markSent(send, c, pitch.title).then(function(r) {
            pop.close();
            RPGACE.utils.toast(r.logged ? '⏳ Potential pitch: ' + send.artist.name + ' · +Hustler XP (outreach)' : '⏳ Potential pitch: ' + send.artist.name + ' (outreach not logged: ' + (r.error && r.error.message || 'unavailable') + ')',
              r.logged ? 'var(--green)' : 'var(--gold)', 3000);
            U._refreshHome();
            if (after) after();
          }, function(e) { box.querySelectorAll('button').forEach(function(x) { x.disabled = false; }); U._fail('Not marked sent', e); });
        });
        b.style.margin = '0'; box.appendChild(b);
      });
      pop.box.appendChild(box);
    },

    // ── SH-3 (Oct 17 2026): follow up, deal, paid ───────────────────
    // The buttons under a sent artist, by stage.
    _stageButtons: function(row, pitch, send, beats, after) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui, h = Array.isArray(send.history) ? send.history : [];
      var lastNote = h.slice().reverse().filter(function(x) { return x.note; })[0];
      if (lastNote || send.deal_amount != null || send.follow_ups) {
        var info = document.createElement('div'); info.className = 'sh-row-s sh-send-info'; info.style.flexBasis = '100%';
        info.textContent = [send.follow_ups ? '🔁 ' + send.follow_ups + ' follow-up' + (send.follow_ups === 1 ? '' : 's') : '',
          send.deal_amount != null ? '£' + send.deal_amount + (send.deal_terms ? ' · ' + send.deal_terms : '') : '',
          lastNote ? '“' + lastNote.note + '”' : ''].filter(Boolean).join(' · ');
        row.appendChild(info);
      }
      var bx = document.createElement('div'); bx.className = 'sh-stage-btns'; bx.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;flex-basis:100%';
      var add = function(cls, txt, fn) { bx.appendChild(U._btn('sh-row-go ' + cls, txt, fn)); };
      var st = send.stage;
      if (st === 'potential_pitch') {
        add('sh-followed', '🔁 Followed up', function() { U.copyFollowUp(pitch, send, after); });
        add('sh-to-close', '💬 Replied with pushback', function() { U.askMove(pitch, send, 'potential_close', after); });
        add('sh-to-agreed', '✅ Agreed', function() { U.askMove(pitch, send, 'agreed_sale', after); });
        add('sh-to-noreply', '🔕 No reply', function() { U.askMove(pitch, send, 'no_reply', after); });
        add('sh-to-no', '✖ Said no', function() { U.askMove(pitch, send, 'no', after); });
      } else if (st === 'potential_close') {
        add('sh-to-agreed', '✅ Agreed', function() { U.askMove(pitch, send, 'agreed_sale', after); });
        add('sh-to-no', '✖ Said no', function() { U.askMove(pitch, send, 'no', after); });
        add('sh-tool-contract', '📜 Check contract', function() { U.dealTool('Contract Red Flags', pitch, send); });
        add('sh-tool-negotiate', '🎭 Practise negotiation', function() { U.dealTool('Negotiation Rehearsal', pitch, send); });
      } else if (st === 'agreed_sale') {
        add('sh-to-paid', '💷 Paid', function() { U.askPaid(pitch, send, beats, after); });
        add('sh-to-no', '✖ Fell through', function() { U.askMove(pitch, send, 'no', after); });
      } else if (st === 'no_reply') {
        add('sh-to-close', '💬 They replied after all', function() { U.askMove(pitch, send, 'potential_close', after); });
      }
      if (h.length && st !== 'paid') {
        var bk = U._btn('sh-row-go sh-back', '↩ Back a step', null), arm = null;
        bk.onclick = function() {
          if (!arm) { bk.textContent = 'Undo last step?'; arm = setTimeout(function() { arm = null; bk.textContent = '↩ Back a step'; }, 3000); return; }
          clearTimeout(arm); bk.disabled = true;
          L.back(send).then(function() { RPGACE.utils.toast('↩ Undone', 'var(--gold)', 1800); if (after) after(); }, function(e) { bk.disabled = false; U._fail('Not undone', e); });
        };
        bx.appendChild(bk);
      }
      if (bx.children.length) row.appendChild(bx);
    },

    // A stage move with an optional note (and amount + terms for Agreed).
    askMove: function(pitch, send, to, after) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui, st = L.STAGES[to];
      var pop = U._pop(st.icon + ' ' + st.name + ' — ' + send.artist.name);
      var box = document.createElement('div'); box.id = 'sh-move';
      var amount = null, terms = null;
      if (to === 'agreed_sale') {
        var al = document.createElement('label'); al.className = 'sh-lbl'; al.htmlFor = 'sh-m-amount'; al.textContent = 'Agreed price (£)';
        amount = document.createElement('input'); amount.id = 'sh-m-amount'; amount.className = 'sh-in'; amount.inputMode = 'decimal'; amount.value = send.deal_amount != null ? send.deal_amount : (pitch.ask != null ? pitch.ask : '');
        var tl = document.createElement('label'); tl.className = 'sh-lbl'; tl.htmlFor = 'sh-m-terms'; tl.textContent = 'Terms (optional)';
        terms = document.createElement('input'); terms.id = 'sh-m-terms'; terms.className = 'sh-in'; terms.maxLength = 1000; terms.placeholder = 'e.g. WAV lease, 50/50 publishing';
        box.appendChild(al); box.appendChild(amount); box.appendChild(tl); box.appendChild(terms);
      }
      var nl = document.createElement('label'); nl.className = 'sh-lbl'; nl.htmlFor = 'sh-m-note'; nl.textContent = to === 'potential_close' ? 'Their pushback (optional)' : 'Note (optional)';
      var note = document.createElement('textarea'); note.id = 'sh-m-note'; note.className = 'sh-in'; note.rows = 2; note.maxLength = 500;
      note.placeholder = to === 'potential_close' ? 'e.g. wants £150 not £250' : '';
      box.appendChild(nl); box.appendChild(note);
      var ok = U._btn('sh-main', 'Move to ' + st.name, function() {
        ok.disabled = true;
        L.move(send, to, { note: note.value, amount: amount ? amount.value : null, terms: terms ? terms.value : null }).then(function() {
          pop.close(); RPGACE.utils.toast(st.icon + ' ' + send.artist.name + ': ' + st.name, 'var(--green)', 2200); if (after) after();
        }, function(e) { ok.disabled = false; U._fail('Not moved', e); });
      });
      ok.id = 'sh-m-ok'; box.appendChild(ok);
      pop.box.appendChild(box);
    },

    // Paid: amount, which beat (or none), date -> one sale.
    askPaid: function(pitch, send, beats, after) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('💷 Paid — ' + send.artist.name);
      var box = document.createElement('div'); box.id = 'sh-paid';
      var lab = function(id, t) { var l = document.createElement('label'); l.className = 'sh-lbl'; l.htmlFor = id; l.textContent = t; box.appendChild(l); };
      lab('sh-pay-amount', 'Amount paid (£)');
      var amount = document.createElement('input'); amount.id = 'sh-pay-amount'; amount.className = 'sh-in'; amount.inputMode = 'decimal';
      amount.value = send.deal_amount != null ? send.deal_amount : (pitch.ask != null ? pitch.ask : ''); box.appendChild(amount);
      lab('sh-pay-beat', 'Which beat was it for?');
      var sel = document.createElement('select'); sel.id = 'sh-pay-beat'; sel.className = 'sh-in';
      (beats || []).forEach(function(b) { var o = document.createElement('option'); o.value = b.id; o.textContent = b.title || 'Beat'; sel.appendChild(o); });
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Not one beat (pack / collab)'; sel.appendChild(o0);
      box.appendChild(sel);
      lab('sh-pay-date', 'Date paid');
      var date = document.createElement('input'); date.id = 'sh-pay-date'; date.type = 'date'; date.className = 'sh-in';
      var dn = RPGACE.modules.doingNow; date.value = dn ? dn.logic.iso() : new Date().toISOString().slice(0, 10); box.appendChild(date);
      var ok = U._btn('sh-main', '💷 Log the payment', function() {
        ok.disabled = true;
        var beat = (beats || []).filter(function(b) { return b.id === sel.value; })[0] || null;
        L.pay(send, pitch, { amount: amount.value, beat: beat, date: date.value }).then(function(r) {
          pop.close();
          RPGACE.utils.toast('💷 Paid: £' + r.sale.amount + ' from ' + send.artist.name + ' · +Hustler XP' + (pitch.kind === 'collab' ? ' · collab done' : ''), 'var(--green)', 3000);
          if (after) after();
        }, function(e) { ok.disabled = !!(e && e.saleLogged); U._fail(e && e.saleLogged ? 'Half done' : 'Payment not logged', e); });
      });
      ok.id = 'sh-pay-ok'; box.appendChild(ok);
      pop.box.appendChild(box);
    },

    // Contract Red Flags / Negotiation Rehearsal with this deal filled in.
    dealTool: function(name, pitch, send) {
      var pt = RPGACE.modules.producerTools, cp = RPGACE.modules.captionsPanel;
      if (!pt || !cp) { RPGACE.utils.toast('Business tools are not loaded', '#CC4A4A', 3000, 'sellingHub'); return; }
      var i = pt.logic.find(name);
      if (i < 0) return;
      var L = RPGACE.modules.sellingHub.logic, k = L.PITCH_KINDS[pitch.kind] || { name: '' };
      var h = Array.isArray(send.history) ? send.history : [], push = h.slice().reverse().filter(function(x) { return x.note; })[0];
      var ctx = 'CONTEXT: my pitch "' + pitch.title + '" (' + k.name + (pitch.ask != null ? ', asking £' + pitch.ask : '') + ') to ' + send.artist.name +
        (push ? '. Their pushback: ' + push.note : '') + '.\n\n';
      RPGACE.areaNav.closePopups ? RPGACE.areaNav.closePopups() : null;
      cp.logic.sendPrompt(ctx + pt.CMDS[i][1], pt.ICONS[i] + ' ' + name);
    },

    // SH-6 (Oct 17 2026): the Artist Outreach tool on this pitch + artist (3
    // versions + a follow-up, in Oracle chat). The pitch's own short message stays.
    outreachTool: function(pitch, send, beats) {
      var pt = RPGACE.modules.producerTools;
      if (!pt) { RPGACE.utils.toast('Business tools are not loaded', '#CC4A4A', 3000, 'sellingHub'); return; }
      pt.ui.send('Artist Outreach', RPGACE.modules.sellingHub.logic.outreachContext(pitch, send.artist || {}, beats || []));
    },

    // Copy the follow-up for this artist, open their page, then ask to log it.
    copyFollowUp: function(pitch, send, after) {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var text = L.followText(pitch, send.artist.name), href = L.openLink(send.artist, send.channel === 'email' ? 'email' : 'dm');
      var log = function() {
        var pop = U._pop('🔁 Sent the follow-up to ' + send.artist.name + '?');
        var box = document.createElement('div'); box.id = 'sh-follow-confirm'; box.style.cssText = 'display:flex;flex-direction:column;gap:8px';
        var yes = U._btn('sh-main', '✅ Yes, log follow-up ' + ((Number(send.follow_ups) || 0) + 1), function() {
          yes.disabled = true;
          L.markFollowed(send, pitch.title).then(function(r) {
            pop.close();
            RPGACE.utils.toast(r.logged ? '🔁 Follow-up logged · +Hustler XP (outreach)' : '🔁 Follow-up logged (outreach not logged: ' + (r.error && r.error.message || 'unavailable') + ')', r.logged ? 'var(--green)' : 'var(--gold)', 2600);
            if (after) after();
          }, function(e) { yes.disabled = false; U._fail('Not logged', e); });
        });
        yes.id = 'sh-follow-yes'; yes.style.margin = '0';
        var no = U._btn('sh-main', 'Not yet', function() { pop.close(); }); no.style.cssText = 'margin:0;background:none';
        box.appendChild(yes); box.appendChild(no); pop.box.appendChild(box);
      };
      var go = function() { if (href) window.open(href, /^https?:/.test(href) ? '_blank' : '_self', 'noopener'); };
      var copied = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'));
      copied.then(function() { RPGACE.utils.toast('📋 Follow-up copied for ' + send.artist.name, 'var(--green)', 2200); go(); log(); }, function() {
        var pop = U._pop('Copy this follow-up');
        var ta = document.createElement('textarea'); ta.id = 'sh-copy-text'; ta.className = 'sh-in'; ta.rows = 5; ta.value = text; ta.readOnly = true;
        pop.box.appendChild(ta);
        pop.box.appendChild(U._btn('sh-main', 'Done — log it', function() { pop.close(); go(); log(); }));
      });
    },

    // The sweep: every due follow-up in one list, worked through in one go.
    openSweep: function() {
      var H = RPGACE.modules.sellingHub, L = H.logic, U = H.ui;
      var pop = U._pop('🔁 Follow-up sweep');
      var wrap = document.createElement('div'); wrap.id = 'sh-sweep'; wrap.textContent = 'Loading…';
      pop.box.appendChild(wrap);
      var draw = function() {
        L.loadFollowUps(Date.now()).then(function(list) {
          wrap.textContent = '';
          var head = document.createElement('div'); head.className = 'sh-row-s'; head.style.marginBottom = '8px';
          head.textContent = list.length ? list.length + ' due. Copy, send, log — then the next one.' : 'Nothing due. Everyone has had a follow-up in time. 🎉';
          wrap.appendChild(head);
          var box = document.createElement('div'); box.className = 'sh-list'; wrap.appendChild(box);
          list.forEach(function(x) {
            var sd = x.send, row = document.createElement('div'); row.className = 'sh-row sh-sweep-row'; row.dataset.id = sd.id; row.style.flexWrap = 'wrap';
            var tx = document.createElement('div'); tx.className = 'sh-row-tx';
            var t = document.createElement('div'); t.className = 'sh-row-t'; t.textContent = sd.artist.name + ' — ' + x.pitch.title;
            var s2 = document.createElement('div'); s2.className = 'sh-row-s';
            s2.textContent = x.due.kind === 'give_up' ? 'No reply after ' + x.due.n + ' follow-ups (' + x.due.days + ' days since the last)' : 'Follow-up ' + x.due.n + ' · ' + x.due.days + ' days since ' + (sd.follow_ups ? 'the last follow-up' : 'you sent it');
            tx.appendChild(t); tx.appendChild(s2); row.appendChild(tx);
            var bx = document.createElement('div'); bx.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;flex-basis:100%';
            if (x.due.kind === 'give_up') {
              bx.appendChild(U._btn('sh-row-go sh-sweep-noreply', '🔕 Close as no reply', function() {
                L.move(sd, 'no_reply', { note: 'No reply after ' + x.due.n + ' follow-ups' }).then(function() { U._refreshHome(); draw(); }, function(e) { U._fail('Not moved', e); });
              }));
              bx.appendChild(U._btn('sh-row-go sh-sweep-copy', '🔁 One more try', function() { U.copyFollowUp(x.pitch, sd, function() { U._refreshHome(); draw(); }); }));
            } else {
              bx.appendChild(U._btn('sh-row-go sh-sweep-copy', '📋 Copy & open', function() { U.copyFollowUp(x.pitch, sd, function() { U._refreshHome(); draw(); }); }));
              bx.appendChild(U._btn('sh-row-go sh-sweep-replied', '💬 They replied', function() { pop.close(); U.openPitch(sd.pitch_id); }));
            }
            row.appendChild(bx); box.appendChild(row);
          });
        }, function(e) { wrap.textContent = '⚠️ Could not load follow-ups: ' + (e && e.message || e); });
      };
      draw();
    }
  }
});
/* ===END:sellingHub=== */
