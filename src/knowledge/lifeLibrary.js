/* ===MODULE:lifeLibrary=== */
// Oct 13 2026 — LL-1 of the ratified /CEO plan "Life Library & Knowledge
// Untangle" (record records/2026-10/life_library_paranoia_ffa_interrogation_ceo_2026-10-12.txt).
// Alex: "I'd like bibliography to become the life library". Four roles:
// Life Library = what I took in (sources); Bookworm = how I study a source;
// Encyclopedia = what I learned (ideas + jargon); Phylum Path = where it fits.
// This module owns ONE private table, library_items (one row per source, a
// `kind` column, never a table per kind). Each item: date taken in, ONE
// phylum shelf (his answer: "one shelf") + free topics, dedup by link
// (url_key unique - the same link saved twice stays one item).
// Shelving (his answer: "Oracle auto, you can change"): a free keyword scan
// over the 21 phyla first; one small ground-worker call only when no keyword
// matches or no topics were typed (rule 11). The shelf chip is always
// editable and then marked shelf_by='manual'.
// library_items has no anon policy: reads go through /api/data-write action
// 'read' (tripPlans.logic.read, shared - rule 8), writes through secureWrite.
// LL-2..LL-7 (feeds, moves, web lookups, resurfacing, map hook) build on this.
RPGACE.register('lifeLibrary', {
  domain: 'knowledge',

  KINDS: {
    link: '🔗 Link', video: '🎬 Video', book: '📕 Book', music: '🎵 Music', file: '📄 File', course: '🎓 Course',
    recommendation: '🙋 Recommendation', note: '📝 Note', quote: '💬 Quote',
    web_lookup: '🌐 Web lookup', screenshot: '📸 Screenshot', answer: '⭐ Oracle answer'
  },
  ADD_KINDS: ['link', 'video', 'book', 'music', 'file', 'course', 'recommendation', 'note', 'quote'],
  // Extra shelf keywords on top of taxonomyTree.PHYLUM_ENGLISH's own words.
  // Compound phrases where a bare word would collide (landmine: hyphens are
  // word boundaries, so 'roll' matches 'b-roll').
  SHELF_KEYWORDS: {
    1: ['melody', 'melodies', 'chord', 'chords', 'harmony', 'chord progression', 'counter melody'],
    2: ['drum', 'drums', '808', '808s', 'hi hat', 'hi-hats', 'hihat', 'groove', 'swing', 'bounce', 'percussion'],
    3: ['synth', 'synths', 'sampling', 'sample pack', 'sound design', 'serum', 'vital', 'preset', 'chopping samples'],
    4: ['mixing', 'mixdown', 'eq', 'compression', 'compressor', 'sidechain', 'reverb', 'gain staging', 'saturation'],
    5: ['mastering', 'loudness', 'lufs', 'limiter'],
    6: ['fl studio', 'vst', 'vsts', 'plugin', 'plugins', 'daw', 'piano roll', 'mixer routing'],
    7: ['reference track', 'critical listening', 'ear training'],
    8: ['music theory', 'interval', 'intervals', 'cadence', 'time signature'],
    9: ['producer history', 'music history', 'pioneer', 'pioneers'],
    10: ['motivation', 'flow state', 'creative block', 'mindset', 'discipline', 'burnout', 'productivity'],
    // RC-0: 11 = learning methods; a tutorial goes on its subject's shelf.
    11: ['spaced repetition', 'retrieval practice', 'study method', 'study skills', 'memorisation', 'memorization', 'note taking', 'active recall', 'learning how to learn'],
    12: ['colour palette', 'color palette', 'mood board', 'colour grading', 'color grading'],
    13: ['music video', 'director', 'cinematography', 'camera angle', 'filmmaking', 'storyboard', 'b-roll'],
    14: ['youtube', 'instagram', 'tiktok', 'reel', 'reels', 'shorts', 'thumbnail', 'algorithm', 'content strategy', 'hook'],
    15: ['collab', 'collaboration', 'outreach', 'networking', 'send beats'],
    16: ['beatstars', 'licence', 'license', 'lease', 'leasing', 'sell beats', 'beat selling', 'exclusive rights'],
    17: ['business', 'invoice', 'tax', 'accounting', 'branding'],
    18: ['distribution', 'distrokid', 'release strategy', 'spotify for artists', 'streaming'],
    19: ['trend', 'trends', 'trending', 'charts', 'market'],
    20: ['claude', 'gemini', 'chatgpt', 'github', 'software', 'ai tool', 'ai tools', 'automation'],
    22: ['recipe', 'recipes', 'cooking', 'baking', 'meal prep', 'nutrition', 'ingredients', 'cuisine'],
    23: ['workout', 'gym', 'strength training', 'hypertrophy', 'cardio', 'running', 'stretching', 'protein'],
    24: ['habit', 'habits', 'morning routine', 'self care', 'wellbeing', 'well-being', 'sleep hygiene'],
    25: ['cleaning', 'laundry', 'decluttering', 'diy', 'home repair', 'organising', 'organizing', 'housework'],
    26: ['budget', 'budgeting', 'saving money', 'savings', 'investing', 'pension', 'debt', 'personal finance'],
    27: ['travel', 'trip', 'holiday', 'city guide', 'itinerary', 'backpacking', 'culture'],
    28: ['meditation', 'mindfulness', 'anxiety', 'stoicism', 'journaling', 'focus', 'rest'],
    29: ['friendship', 'relationships', 'family', 'dating', 'social skills', 'communication'],
  },
  _items: [],
  _people: [],
  _loaded: false,

  logic: {
    lib: function() { return RPGACE.modules.lifeLibrary; },
    signedIn: function() { var ag = RPGACE.modules.authGate; return !!(ag && ag._apiSecret); },
    read: function(table, params) {
      var tp = RPGACE.modules.tripPlans;
      if (!tp) return Promise.reject(new Error('Private reads unavailable'));
      return tp.logic.read(table, params);
    },
    // RC-0: shelves run 1..highest phylum number (29 since Oct 15 2026).
    maxShelf: function() {
      var n = Object.keys(RPGACE.modules.lifeLibrary.logic.phylumNames()).map(Number).filter(function(x) { return x > 0; });
      return n.length ? Math.max.apply(null, n) : 21;
    },
    phylumNames: function() {
      var tt = RPGACE.modules.taxonomyTree;
      return (tt && tt.PHYLUM_ENGLISH) || {};
    },
    shelfLabel: function(n) {
      if (!n) return 'Unshelved';
      var tt = RPGACE.modules.taxonomyTree;
      return n + '. ' + ((tt && tt.PHYLUM_ENGLISH && tt.PHYLUM_ENGLISH[n]) || 'Phylum ' + n);
    },
    // Same link saved twice = one item. Tracking params and fragments are
    // dropped; YouTube/Instagram/TikTok URLs collapse to their video id.
    urlKey: function(url) {
      var s = String(url || '').trim();
      if (!/^https?:\/\//i.test(s)) return null;
      var u;
      try { u = new URL(s); } catch (e) { return null; }
      var host = u.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, '');
      var path = u.pathname.replace(/\/+$/, '');
      var yt = null;
      if (host === 'youtu.be') yt = path.slice(1);
      else if (/youtube\.com$/.test(host)) yt = u.searchParams.get('v') || ((path.match(/^\/(shorts|live|embed)\/([^/]+)/) || [])[2]);
      if (yt) return 'youtube:' + yt;
      var ig = /instagram\.com$/.test(host) && path.match(/^\/(p|reel|reels|tv)\/([^/]+)/);
      if (ig) return 'instagram:' + ig[2];
      var tt = /tiktok\.com$/.test(host) && path.match(/\/video\/(\d+)/);
      if (tt) return 'tiktok:' + tt[1];
      var keep = [];
      u.searchParams.forEach(function(v, k) {
        if (/^(utm_|fbclid|gclid|si$|igsh|igshid|srtk|dlrf|rpxt|is$|feature|ref$|ref_src)/i.test(k)) return;
        keep.push(k + '=' + v);
      });
      keep.sort();
      return host + path.toLowerCase() + (keep.length ? '?' + keep.join('&') : '');
    },
    guessKind: function(url) {
      var s = String(url || '').toLowerCase();
      if (/youtube\.com|youtu\.be|instagram\.com\/(reel|p|tv)|tiktok\.com|vimeo\.com/.test(s)) return 'video';
      if (/spotify\.com|soundcloud\.com|music\.apple\.com|bandcamp\.com/.test(s)) return 'music';
      if (/\.pdf(\?|$)/.test(s)) return 'file';
      return 'link';
    },
    cleanTopics: function(v) {
      var list = Array.isArray(v) ? v : String(v || '').split(/[,#\n]/);
      var seen = {}, out = [];
      list.forEach(function(t) {
        t = String(t || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40);
        if (t && !seen[t]) { seen[t] = 1; out.push(t); }
      });
      return out.slice(0, 8);
    },
    // Free shelf guess: phylum words + SHELF_KEYWORDS, whole-word match,
    // highest score wins; a tie or no hit returns null (then Oracle decides).
    keywordShelf: function(text) {
      var lib = RPGACE.modules.lifeLibrary, names = lib.logic.phylumNames();
      var hay = ' ' + String(text || '').toLowerCase() + ' ';
      var best = null, bestScore = 0, tie = false;
      for (var n = 1; n <= lib.logic.maxShelf(); n++) {
        if (n === 21) continue;  // Miscellaneous is never a keyword match
        var words = (lib.SHELF_KEYWORDS[n] || []).slice();
        String(names[n] || '').split(',').forEach(function(w) { w = w.trim().toLowerCase(); if (w.length > 3) words.push(w); });
        var score = 0;
        words.forEach(function(w) {
          var re = new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i');
          if (re.test(hay)) score += w.indexOf(' ') > 0 ? 2 : 1;
        });
        if (score > bestScore) { best = n; bestScore = score; tie = false; }
        else if (score && score === bestScore) tie = true;
      }
      return tie ? null : best;
    },
    // One small ground-worker call: shelf + topics. Only the item's own
    // title/summary/text is sent.
    oracleShelf: function(item, hint) {
      var pp = RPGACE.modules.phylumPath, names = RPGACE.modules.lifeLibrary.logic.phylumNames();
      if (!pp || !pp.logic || !pp.logic._callGroundWorkerJSON) return Promise.reject(new Error('Oracle unavailable'));
      var list = Object.keys(names).map(function(n) { return n + '. ' + names[n]; }).join('\n');
      var text = [item.title, item.url, item.summary, item.body].filter(Boolean).join('\n').slice(0, 700);
      var prompt = 'Shelve one item in a music producer\'s personal library.\n\nShelves:\n' + list +
        '\n\nItem (' + item.kind + '):\n' + text + '\n\n' + (hint ? 'Keyword guess: shelf ' + hint + '.\n' : '') +
        'Reply with JSON only: {"phylum": <shelf number 1-' + RPGACE.modules.lifeLibrary.logic.maxShelf() + '>, "topics": [2-4 short lowercase topics, 1-3 words each]}';
      return pp.logic._callGroundWorkerJSON(prompt, 200);
    },
    autoShelve: function(row, wantTopics) {
      var L = RPGACE.modules.lifeLibrary.logic;
      if (row.phylum_number && !wantTopics) { row.shelf_by = 'manual'; return Promise.resolve(row); }
      var kw = row.phylum_number ? null : L.keywordShelf([row.title, row.summary, row.body, (row.topics || []).join(' ')].join(' '));
      if (kw && !wantTopics) { row.phylum_number = kw; row.shelf_by = 'keyword'; return Promise.resolve(row); }
      return L.oracleShelf(row, kw || row.phylum_number).then(function(j) {
        var n = Math.round(Number(j && j.phylum));
        if (!row.phylum_number) {
          if (kw) { row.phylum_number = kw; row.shelf_by = 'keyword'; }
          else if (n >= 1 && n <= RPGACE.modules.lifeLibrary.logic.maxShelf()) { row.phylum_number = n; row.shelf_by = 'oracle'; }
        } else row.shelf_by = 'manual';
        if (wantTopics) row.topics = L.cleanTopics(j && j.topics);
        return row;
      }).catch(function() {
        if (!row.phylum_number && kw) { row.phylum_number = kw; row.shelf_by = 'keyword'; }
        else if (row.phylum_number) row.shelf_by = 'manual';
        return row;
      });
    },
    clean: function(f) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic;
      var url = String(f.url || '').trim();
      if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      if (url && !L.urlKey(url)) throw new Error('That link doesn\'t look right');
      // The add form's default chip is 'link'; a YouTube/Spotify/PDF link is
      // still filed as video/music/file.
      var kind = (!f.kind || f.kind === 'link') && url ? L.guessKind(url) : (f.kind || 'note');
      if (!lib.KINDS[kind]) throw new Error('Unknown kind: ' + kind);
      var body = String(f.body || '').trim().slice(0, 20000) || null; // LL-4: room for a full starred Oracle answer
      var title = String(f.title || '').trim().slice(0, 200);
      if (!title && url) { try { title = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {} }
      if (!title && body) title = body.split('\n')[0].slice(0, 80);
      if (!title) throw new Error('Add a title, a link or some text');
      var phylum = f.phylum_number === '' || f.phylum_number == null ? null : Math.round(Number(f.phylum_number));
      if (phylum != null && !(phylum >= 1 && phylum <= RPGACE.modules.lifeLibrary.logic.maxShelf())) phylum = null;
      var date = /^\d{4}-\d{2}-\d{2}$/.test(f.taken_in_on || '') ? f.taken_in_on : null;
      var row = {
        kind: kind, title: title, url: url || null, url_key: url ? L.urlKey(url) : null,
        summary: String(f.summary || '').trim().slice(0, 1200) || null, body: body,
        topics: L.cleanTopics(f.topics), phylum_number: phylum,
        recommended_by: /^[0-9a-f-]{36}$/i.test(f.recommended_by || '') ? f.recommended_by : null,
        status: kind === 'recommendation' ? (f.status === 'done' ? 'done' : 'to_check') : null,
        source_table: f.source_table || null, source_id: f.source_id != null ? String(f.source_id) : null,
        // RI-2/3: [] = asked, "Not now" (waits for realms); null = never asked.
        realms: Array.isArray(f.realms) ? RPGACE.realmPicker.clean(f.realms) : null
      };
      if (date) row.taken_in_on = date;
      if (phylum != null && f.shelf_by === 'realm') row.shelf_by = 'realm'; // VW-5
      return row;
    },
    findByKey: function(key) {
      var lib = RPGACE.modules.lifeLibrary;
      var local = lib._items.filter(function(i) { return i.url_key === key; })[0];
      if (local) return Promise.resolve(local);
      return lib.logic.read('library_items', 'select=*&url_key=eq.' + encodeURIComponent(key) + '&limit=1').then(function(r) { return r[0] || null; });
    },
    // Returns { item, duplicate }. A link already in the library is never
    // saved twice; the existing item is returned instead.
    // RI-2: a caller that has not already asked (no `realms` key) gets the
    // realm picker here, once, after the duplicate check - so the Library
    // form and Bibliography saves ask, and a book (asked already) does not.
    add: function(f) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, row;
      try { row = L.clean(f); } catch (e) { return Promise.reject(e); }
      var dup = row.url_key ? L.findByKey(row.url_key) : Promise.resolve(null);
      return dup.then(function(existing) {
        if (existing) return { item: existing, duplicate: true };
        var ask = ('realms' in f) ? Promise.resolve(row.realms)
          : RPGACE.realmPicker.pick({ what: String(lib.KINDS[row.kind] || row.kind).replace(/^\S+\s/, '').toLowerCase(), title: row.title })
            .then(function(r) { return r || []; });
        return ask.then(function(realms) { row.realms = realms; return L.autoShelve(row, !row.topics.length); }).then(function(r) {
          return RPGACE.sb.secureWrite('library_items', 'insert', r).then(function(d) {
            var saved = (Array.isArray(d) && d[0]) || r;
            lib._items = [saved].concat(lib._items.filter(function(i) { return i.id !== saved.id; }));
            return { item: saved, duplicate: false };
          });
        });
      });
    },
    update: function(id, patch) {
      var lib = RPGACE.modules.lifeLibrary, p = Object.assign({}, patch, { updated_at: new Date().toISOString() });
      if (p.topics) p.topics = lib.logic.cleanTopics(p.topics);
      if ('phylum_number' in p) p.shelf_by = 'manual';
      return RPGACE.sb.secureWrite('library_items', 'update', p, 'id=eq.' + id).then(function() {
        lib._items = lib._items.map(function(i) { return i.id === id ? Object.assign({}, i, p) : i; });
      });
    },
    remove: function(id) {
      var lib = RPGACE.modules.lifeLibrary;
      return RPGACE.sb.secureWrite('library_items', 'delete', null, 'id=eq.' + id).then(function() {
        lib._items = lib._items.filter(function(i) { return i.id !== id; });
      });
    },
    load: function() {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic;
      return Promise.all([
        L.read('library_items', 'select=*&order=taken_in_on.desc,created_at.desc&limit=2000'),
        L.read('people', 'select=id,name&order=name.asc').catch(function() { return []; })
      ]).then(function(r) { lib._items = r[0]; lib._people = r[1]; lib._loaded = true; return lib._items; });
    },
    bySource: function(table, id) {
      return RPGACE.modules.lifeLibrary._items.filter(function(i) { return i.source_table === table && String(i.source_id) === String(id); })[0] || null;
    },
    personName: function(id) {
      var p = RPGACE.modules.lifeLibrary._people.filter(function(x) { return x.id === id; })[0];
      return p ? p.name : '';
    },
    // f: { q, shelf ('' | 'none' | n), kind, topic, days, realm }
    filter: function(items, f, today) {
      f = f || {};
      var L = RPGACE.modules.lifeLibrary.logic;
      var q = String(f.q || '').trim().toLowerCase();
      var since = f.days ? (function() { var d = today ? new Date(today + 'T12:00:00') : new Date(); d.setDate(d.getDate() - Number(f.days)); return d.toISOString().slice(0, 10); })() : null;
      return (items || []).filter(function(i) {
        if (f.shelf === 'none' && i.phylum_number) return false;
        if (f.shelf && f.shelf !== 'none' && Number(f.shelf) !== i.phylum_number) return false;
        if (f.kind && i.kind !== f.kind) return false;
        if (f.topic && (i.topics || []).indexOf(f.topic) < 0) return false;
        if (f.realm && RPGACE.realmOf('library_items', i).indexOf(f.realm) < 0) return false; // RI-5
        if (since && String(i.taken_in_on || '') < since) return false;
        if (q) {
          var hay = [i.title, i.summary, i.body, i.url, (i.topics || []).join(' '), L.personName(i.recommended_by)].join(' ').toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });
    },
    topicCounts: function(items) {
      var c = {};
      (items || []).forEach(function(i) { (i.topics || []).forEach(function(t) { c[t] = (c[t] || 0) + 1; }); });
      return Object.keys(c).sort(function(a, b) { return c[b] - c[a] || a.localeCompare(b); }).map(function(t) { return { topic: t, n: c[t] }; });
    },
    monthLabel: function(isoDate) {
      return isoDate ? new Date(isoDate + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Undated';
    },

    // ── LL-4 feeds (Oct 13 2026) ─────────────────────────────────────
    // ONE entry point for every automatic source (new video analyses,
    // screenshots, reference tracks, starred Oracle answers). Differences
    // from add(): never calls Oracle (shelf = free keyword match only, else
    // left unshelved for Alex to set - his choice, rule 11); also dedups by
    // the source row (source_table + source_id), not just by link; does
    // nothing before login (the table is private). Returns { item, duplicate }
    // or null when skipped.
    feed: function(f) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, row;
      if (!L.signedIn()) return Promise.resolve(null);
      try { row = L.clean(f); } catch (e) { return Promise.reject(e); }
      var local = lib._items.filter(function(i) {
        return (row.url_key && i.url_key === row.url_key) ||
          (row.source_table && row.source_id && i.source_table === row.source_table && String(i.source_id) === row.source_id);
      })[0];
      if (local) return Promise.resolve({ item: local, duplicate: true });
      var q = row.url_key ? 'url_key=eq.' + encodeURIComponent(row.url_key)
        : (row.source_table && row.source_id) ? 'source_table=eq.' + encodeURIComponent(row.source_table) + '&source_id=eq.' + encodeURIComponent(row.source_id)
        : null;
      var dup = q ? L.read('library_items', 'select=*&' + q + '&limit=1').then(function(r) { return (r && r[0]) || null; }) : Promise.resolve(null);
      return dup.then(function(existing) {
        if (existing) return { item: existing, duplicate: true };
        if (!row.phylum_number) {
          var kw = L.keywordShelf([row.title, row.summary, row.body, (row.topics || []).join(' ')].join(' '));
          if (kw) { row.phylum_number = kw; row.shelf_by = 'keyword'; }
        } else row.shelf_by = row.shelf_by || 'manual';
        return RPGACE.sb.secureWrite('library_items', 'insert', row).then(function(d) {
          var saved = (Array.isArray(d) && d[0]) || row;
          if (lib._loaded) lib._items = [saved].concat(lib._items);
          return { item: saved, duplicate: false };
        });
      });
    },
    // Fire-and-forget wrapper for save points that must never fail because
    // of the library: logs, never throws, never toasts.
    feedQuiet: function(f, label) {
      return RPGACE.modules.lifeLibrary.logic.feed(f).catch(function(e) {
        console.warn('[lifeLibrary] ' + (label || 'feed') + ' skipped:', e && e.message);
        return null;
      });
    },
    // ── LL-7 (Oct 13 2026): phylum shelves for Phylum Path (the map) ──
    // One loader for the three things a phylum page shows: Library items
    // on that shelf, idea cards whose source item is on that shelf, and
    // that phylum's jargon terms. Cached 60s so switching phyla is instant.
    _shelfCache: null,
    shelfData: function(force) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, c = L._shelfCache;
      if (!force && c && (Date.now() - c.at) < 60000) return Promise.resolve(c.data);
      var items = L.signedIn() ? (lib._loaded ? Promise.resolve(lib._items) : L.load()) : Promise.resolve([]);
      return Promise.all([
        items.catch(function() { return []; }),
        RPGACE.sb.select('encyclopedia_insights', 'select=id,insight_text,source_entry_id,source_entry_title,saved_at&limit=3000').catch(function() { return []; }),
        RPGACE.sb.select('jargon_encyclopedia', 'select=term,phylum_number,status&status=neq.rejected&order=term.asc&limit=3000').catch(function() { return []; })
      ]).then(function(r) {
        var data = { items: r[0] || [], ideas: Array.isArray(r[1]) ? r[1] : [], terms: Array.isArray(r[2]) ? r[2] : [] };
        // Only cache a signed-in read; a pre-login read has no Library items.
        if (L.signedIn()) L._shelfCache = { at: Date.now(), data: data };
        return data;
      });
    },
    // Which Library item an idea card came from: video articles ('encyclopedia'
    // source ids) and screenshots ('shot:'). Book-chapter ideas have no
    // Library item of their own yet, so they are not shelved.
    ideaItem: function(d, byKey) {
      var sid = String(d.source_entry_id || '');
      if (sid.indexOf('shot:') === 0) return byKey['screenshots:' + sid.slice(5)] || null;
      if (sid.indexOf('book:') === 0) return null;
      return byKey['encyclopedia:' + sid] || null;
    },
    byPhylum: function(data) {
      var L = RPGACE.modules.lifeLibrary.logic, out = {}, byKey = {};
      var get = function(n) { return out[n] = out[n] || { items: [], ideas: [], terms: [] }; };
      (data.items || []).forEach(function(i) {
        if (i.source_table && i.source_id) byKey[i.source_table + ':' + i.source_id] = i;
        if (i.phylum_number) get(i.phylum_number).items.push(i);
      });
      (data.ideas || []).forEach(function(d) {
        var it = L.ideaItem(d, byKey);
        if (it && it.phylum_number) get(it.phylum_number).ideas.push(d);
      });
      (data.terms || []).forEach(function(t) { if (t.phylum_number) get(t.phylum_number).terms.push(t); });
      return out;
    },

    // ── LL-6 (Oct 13 2026): one Library item a day in the Morning Brief ──
    // Alex's choices: every kind can come back; unchecked recommendations
    // first, then the oldest; an item shown is not shown again for 30 days
    // (resurfaced_at, so it holds across devices); "Done with it" turns it
    // off for good (resurface_off). The same item stays all day.
    RESURFACE_DAYS: 30,
    _localDay: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    pickDaily: function(items, now) {
      var L = RPGACE.modules.lifeLibrary.logic;
      now = now || new Date();
      var today = L._localDay(now);
      var live = (items || []).filter(function(i) { return i && !i.resurface_off; });
      var shownToday = live.filter(function(i) { return i.resurfaced_at && L._localDay(new Date(i.resurfaced_at)) === today; })[0];
      if (shownToday) return { item: shownToday, fresh: false };
      var cutoff = now.getTime() - L.RESURFACE_DAYS * 864e5;
      var age = function(i) { return String(i.taken_in_on || i.created_at || ''); };
      var pool = live.filter(function(i) { return !i.resurfaced_at || new Date(i.resurfaced_at).getTime() < cutoff; });
      var recs = pool.filter(function(i) { return i.kind === 'recommendation' && i.status !== 'done'; });
      var rest = pool.filter(function(i) { return recs.indexOf(i) === -1; });
      var byAge = function(a, b) { return age(a) < age(b) ? -1 : age(a) > age(b) ? 1 : 0; };
      var pick = recs.sort(byAge)[0] || rest.sort(byAge)[0] || null;
      return pick ? { item: pick, fresh: true } : null;
    },
    markSurfaced: function(item) {
      var lib = RPGACE.modules.lifeLibrary, at = new Date().toISOString();
      return RPGACE.sb.secureWrite('library_items', 'update', { resurfaced_at: at }, 'id=eq.' + item.id).then(function() {
        item.resurfaced_at = at;
        lib._items = lib._items.map(function(i) { return i.id === item.id ? Object.assign({}, i, { resurfaced_at: at }) : i; });
      });
    },
    // Recommendations are also marked checked, same as the Library's own button.
    doneWith: function(item) {
      var patch = { resurface_off: true };
      if (item.kind === 'recommendation') patch.status = 'done';
      return RPGACE.modules.lifeLibrary.logic.update(item.id, patch);
    },
    // ── LL-6: jargon "where you met it" ──────────────────────────────
    // term (lowercase) -> up to 3 places it appears: Library items first,
    // then idea cards. Reuses pathways' whole-word jargon matcher (rule 8).
    metIn: function(terms, items, ideas) {
      var pw = RPGACE.modules.pathways, out = {};
      if (!pw || !pw.logic || !pw.logic.matchJargon) return out;
      var add = function(hits, ref) {
        hits.forEach(function(t) {
          var k = String(t.term || '').toLowerCase();
          var list = out[k] = out[k] || [];
          if (list.length < 3 && !list.some(function(x) { return x.key === ref.key; })) list.push(ref);
        });
      };
      (items || []).forEach(function(i) {
        var text = [i.title, i.summary, i.body, (i.topics || []).join(' ')].join(' ');
        add(pw.logic.matchJargon(text, terms), { key: 'll:' + i.id, type: 'library', id: i.id, label: (RPGACE.modules.lifeLibrary.KINDS[i.kind] || '📚').split(' ')[0] + ' ' + String(i.title || '').slice(0, 60) });
      });
      (ideas || []).forEach(function(d) {
        add(pw.logic.matchJargon(d.insight_text, terms), { key: 'idea:' + (d.source_entry_id || '') , type: 'idea', d: d, label: '💡 ' + String(d.source_entry_title || 'idea card').slice(0, 60) });
      });
      return out;
    },

    // Videos analysed from Oct 13 2026 on (older ones were moved in by LL-2).
    // Covers Video Finder "Learn" and Videoworm uploads too - both queue the
    // same analysis, which lands in intel_reports.
    // A starred Oracle answer. The question loses any silent context prefix
    // the floating overlay adds (the overlay remembers what Alex typed).
    exchange: function(question, answer) {
      var q = String(question || '').trim();
      var typed = window._ocLastTyped ? String(window._ocLastTyped).trim() : '';
      if (typed && q.length > typed.length && q.slice(-typed.length) === typed) q = typed;
      var a = String(answer || '')
        .replace(/\n?ORACLE_ACTION:\s*[a-z0-9_]+\s*$/i, '')
        .replace(/\n?[A-Z_]+_JSON:\s*\{[\s\S]*\}\s*$/, '')
        .trim();
      return { q: q, a: a };
    },
    starAnswer: function(ex) {
      var L = RPGACE.modules.lifeLibrary.logic;
      if (!ex || !ex.a) return Promise.reject(new Error('Nothing to save'));
      // A long app-generated prompt (Morning Brief, recipes...) makes a poor
      // title - use the answer's first line then.
      var firstLine = ex.a.split('\n').filter(function(l) { return l.trim(); })[0] || 'Oracle answer';
      var title = ((ex.q && ex.q.length <= 200) ? ex.q : firstLine).replace(/[*#_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
      // RI-2: starring is an input too - ask which realms first.
      return RPGACE.realmPicker.pick({ what: 'Oracle answer', title: title }).then(function(realms) {
        return L.feed({
          kind: 'answer', title: title, summary: ex.q ? 'You asked: ' + ex.q.slice(0, 600) : null,
          body: ex.a, source_table: 'oracle_answer', source_id: L.hashText(ex.q + '\n' + ex.a), realms: realms || []
        });
      });
    },
    hashText: function(t) {
      var h = 2166136261; t = String(t || '');
      for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return 'a' + h.toString(36) + '-' + t.length;
    },
    FEED_SINCE: '2026-10-13',
    videoRow: function(r) {
      var enc = (r && r.insights && r.insights.encyclopedia_entry) || {};
      var when = String(r.created_at || r.date || '').slice(0, 10);
      var tags = (Array.isArray(enc.tags) ? enc.tags : []).map(function(t) { return String(t || '').replace(/[-_]+/g, ' '); });
      // SA-1: a shared web page is a link, a shared text a note.
      var kind = r.platform === 'Web page' ? 'link' : (r.platform === 'Text' ? 'note' : 'video');
      return {
        kind: kind,
        title: String(r.title || enc.title || '').trim() || (r.creator ? (kind === 'video' ? 'Video by ' : '') + r.creator : ''),
        url: /^https?:/i.test(String(r.url || '')) ? r.url : null, summary: enc.summary || (r.insights && r.insights.verdict_summary) || null,
        topics: tags, taken_in_on: /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : null,
        source_table: 'intel_reports', source_id: r.url,
        realms: (r.realms && r.realms.length) ? r.realms : null // RI-2: the realms picked when the link was sent
      };
    },
    // VW-5: a realm-section report shelves the video on its best realm's
    // first phylum (realm_lenses.json's realm -> phyla map, RPGACE.phylumRealms)
    // instead of the keyword guess. Older reports keep the keyword shelf.
    topRealm: function(r) {
      var secs = (r && r.insights && r.insights.realm_sections) || null, best = null;
      if (!secs) return null;
      Object.keys(secs).forEach(function(k) { if (!best || (secs[k].score || 0) > (secs[best].score || 0)) best = k; });
      return best;
    },
    shelveByRealm: function(row, r, map) {
      var top = RPGACE.modules.lifeLibrary.logic.topRealm(r);
      var ph = top && map && map.byRealm && (map.byRealm[top] || [])[0];
      if (ph) { row.phylum_number = ph; row.shelf_by = 'realm'; }
      return row;
    },
    feedVideos: function(all) {
      var L = RPGACE.modules.lifeLibrary.logic;
      if (!L.signedIn()) return Promise.resolve(0);
      var guard = ''; try { guard = localStorage.getItem('rpgace_ll_fed_videos') || ''; } catch (e) {}
      var fresh = (all || []).filter(function(r) {
        var when = String(r.created_at || r.date || '').slice(0, 10);
        return r && r.url && when >= L.FEED_SINCE && guard.indexOf('|' + r.url + '|') === -1;
      }).slice(0, 10);
      // VW-6: a realm-section report whose video is already in the Library on
      // a keyword (or no) shelf moves to its best realm's shelf. Update only -
      // the item stays, so its input XP is not paid twice (xp_on_input pays
      // on update only for a held item).
      var reshelve = (all || []).filter(function(r) { return r && r.url && L.topRealm(r); });
      if (reshelve.length) {
        Promise.all([RPGACE.phylumRealms().catch(function() { return null; }),
          L.read('library_items', 'select=id,source_id,shelf_by,phylum_number&source_table=eq.intel_reports&limit=500').catch(function() { return []; })
        ]).then(function(res) {
          var map = res[0], items = res[1] || [];
          reshelve.forEach(function(r) {
            var it = items.filter(function(i) { return i.source_id === r.url && i.shelf_by !== 'realm' && i.shelf_by !== 'manual'; })[0];
            var row = it && L.shelveByRealm({}, r, map);
            if (!row || !row.phylum_number || row.phylum_number === it.phylum_number) return;
            RPGACE.sb.secureWrite('library_items', 'update', { phylum_number: row.phylum_number, shelf_by: 'realm' }, 'id=eq.' + it.id)
              .catch(function(e) { console.warn('[lifeLibrary] reshelve skipped:', e && e.message); });
          });
        });
      }
      var added = 0, chain = fresh.length ? RPGACE.phylumRealms().catch(function() { return null; }) : Promise.resolve(null);
      fresh.forEach(function(r) {
        chain = chain.then(function(map) {
          return L.feed(L.shelveByRealm(L.videoRow(r), r, map)).then(function(res) {
            if (res && !res.duplicate) added++;
            if (res) { guard += '|' + r.url + '|'; try { localStorage.setItem('rpgace_ll_fed_videos', guard.slice(-20000)); } catch (e) {} }
          }).catch(function(e) { console.warn('[lifeLibrary] video feed skipped:', e && e.message); });
        });
      });
      return chain.then(function() { return added; });
    },
  },

  // LL-4: new video analyses arrive through syncIntelData (Supabase +
  // local server merge, every 30s). Chainable wrap, same guard pattern as
  // ciAutoPropose - falls through untouched.
  init: function() {
    // KN-2: /library reached by Back or a direct link renders itself.
    RPGACE.areaNav.onPageShow('library', function() { RPGACE.modules.lifeLibrary.open(); });
    // Made as soon as config is up (before login routes a cold /library link), retried later.
    [0, 1700].forEach(function(ms) { setTimeout(function() { if (RPGACE.CONFIG && RPGACE.CONFIG.pages) RPGACE.areaNav.ensurePage(RPGACE.CONFIG.pages.library, '📚 Life Library'); }, ms); });
    // LL-7: Phylum Path's switcher counts, as of now. (The LL-7 "what this
    // is" header bar was replaced by knowledgeHub's ← Back / 🏠 row, KN-4.)
    RPGACE.hooks.on('page:show', function(name) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || name !== P.phylumPath) return;
      setTimeout(function() { RPGACE.modules.lifeLibrary.ui.renderSwitcherCounts(); }, 50);
    });
    function patch() {
      if (typeof window.syncIntelData !== 'function' || window._lifeLibraryFeedPatched) return;
      window._lifeLibraryFeedPatched = true;
      var orig = window.syncIntelData;
      window.syncIntelData = function() {
        var result = orig.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          result.then(function(all) { RPGACE.modules.lifeLibrary.logic.feedVideos(all || []); });
        }
        return result;
      };
    }
    patch();
    setTimeout(patch, 1700);
  },

  ui: {
    T: function() { return RPGACE.modules.tripPlans.ui; },
    // ── LL-7: phylum shelf block on Phylum Path ──
    SHELF_SHOW: 5,
    renderShelf: function(num) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, U = lib.ui;
      var host = document.getElementById('pp-shelf');
      if (!host) return;
      host.innerHTML = '<div style="font-size:12px;color:var(--muted);">Loading this shelf…</div>';
      Promise.all([L.shelfData(), RPGACE.phylumRealms().catch(function() { return null; })]).then(function(res) {
        var data = res[0];
        if (host.dataset.num && Number(host.dataset.num) !== num) return;
        var sh = L.byPhylum(data)[num] || { items: [], ideas: [], terms: [] };
        host.innerHTML = '';
        var intro = document.createElement('div');
        intro.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:8px;';
        var pr = RPGACE.phylumRealmMap && RPGACE.phylumRealmMap.byPhylum[num], X = RPGACE.modules.xpSeason;
        intro.textContent = (pr && X && X.REALMS[pr] ? X.REALMS[pr].icon + ' ' + X.REALMS[pr].name + ' realm. ' : '') + 'What you have gathered on this shelf. When you rebuild this phylum, build it from here.';
        host.appendChild(intro);
        U._shelfSection(host, '📚 Library', sh.items, function(i) { return i.title; }, function(i) { lib.open({ focusId: i.id }); },
          { label: 'Open shelf in Library', run: function() { lib.open({ filter: { shelf: String(num) } }); } }, L.signedIn() ? 'Nothing on this shelf yet.' : 'Sign in to see your Library.');
        U._shelfSection(host, '💡 Idea cards', sh.ideas, function(d) { return d.insight_text; }, function(d) { var ep = RPGACE.modules.encyclopediaPosts; if (ep) ep.ui._openSource(d); },
          null, 'No idea cards from this shelf\'s sources yet.');
        U._shelfSection(host, '📖 Jargon', sh.terms, function(t) { return t.term; }, function(t) { var je = RPGACE.modules.jargonEncyclopedia; if (je) { je._focusTerm = t.term; je._focusTermAt = Date.now(); } if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.jargonEncyclopedia); },
          { label: 'All ' + sh.terms.length + ' terms in Jargon', run: function() { var je = RPGACE.modules.jargonEncyclopedia; if (je) { je._phylumFilter = num; je._phylumFilterAt = Date.now(); } if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.jargonEncyclopedia); } }, 'No jargon for this phylum yet.', true);
      }).catch(function(e) { host.textContent = 'Shelf could not load: ' + (e.message || e); });
    },
    _shelfSection: function(host, title, rows, label, open, all, empty, inline) {
      var U = RPGACE.modules.lifeLibrary.ui;
      var sec = document.createElement('div');
      sec.className = 'pp-shelf-sec';
      sec.style.cssText = 'margin-bottom:12px;';
      var h = document.createElement('div');
      h.style.cssText = 'font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;';
      h.textContent = title + ' (' + rows.length + ')';
      sec.appendChild(h);
      if (!rows.length) {
        var e = document.createElement('div'); e.style.cssText = 'font-size:12px;color:var(--muted);'; e.textContent = empty;
        sec.appendChild(e); host.appendChild(sec); return;
      }
      var list = document.createElement('div');
      list.style.cssText = inline ? 'display:flex;flex-wrap:wrap;gap:6px;' : '';
      var draw = function(n) {
        list.innerHTML = '';
        rows.slice(0, n).forEach(function(r) {
          var b = document.createElement(open ? 'button' : 'span');
          if (open) { b.type = 'button'; b.onclick = function() { open(r); }; }
          b.className = 'pp-shelf-row';
          var text = String(label(r) || '').replace(/\s+/g, ' ');
          b.textContent = inline ? text : (text.length > 140 ? text.slice(0, 140) + '…' : text);
          b.style.cssText = inline
            ? 'font-size:12px;padding:3px 9px;border:1px solid var(--border);border-radius:12px;color:var(--text);background:none;'
            : 'display:block;width:100%;text-align:left;min-height:36px;padding:6px 0;background:none;border:none;border-bottom:1px solid var(--border);color:var(--text);font-size:13px;line-height:1.4;cursor:pointer;font-family:inherit;';
          list.appendChild(b);
        });
      };
      draw(U.SHELF_SHOW);
      sec.appendChild(list);
      var foot = document.createElement('div');
      foot.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;';
      var link = function(text, fn) {
        var a = document.createElement('button'); a.type = 'button'; a.textContent = text;
        a.style.cssText = 'background:none;border:none;padding:4px 0;min-height:32px;color:var(--blue,#4A8CCC);text-decoration:underline;cursor:pointer;font-size:12px;font-family:inherit;';
        a.onclick = fn; foot.appendChild(a); return a;
      };
      if (rows.length > U.SHELF_SHOW) {
        var more = link('Show all ' + rows.length, function() { draw(rows.length); more.remove(); });
      }
      if (all) link(all.label, all.run);
      sec.appendChild(foot);
      host.appendChild(sec);
    },
    _countsLine: function(i, d, j) {
      return [[i, '📚'], [d, '💡'], [j, '📖']].filter(function(x) { return x[0] > 0; }).map(function(x) { return x[1] + ' ' + x[0]; }).join(' · ');
    },
    // Counts on each phylum row in the Phylum Path switcher.
    renderSwitcherCounts: function() {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic;
      var pills = document.querySelectorAll('#pp-phylum-switcher .pp-switch-pill');
      if (!pills.length) return;
      L.shelfData().then(function(data) {
        var by = L.byPhylum(data);
        pills.forEach(function(p) {
          var n = Number(p.dataset.num), sh = by[n] || { items: [], ideas: [], terms: [] };
          var c = p.querySelector('.pp-counts');
          if (!c) { c = document.createElement('div'); c.className = 'pp-counts'; c.style.cssText = 'font-size:11px;font-weight:400;color:rgba(226,226,236,0.55);margin-top:2px;'; p.appendChild(c); }
          // UI Debloat: zero counts are left out.
          c.textContent = RPGACE.modules.lifeLibrary.ui._countsLine(sh.items.length, sh.ideas.length, sh.terms.length);
        });
        // RC-1: each realm header totals its phyla.
        document.querySelectorAll('#pp-phylum-switcher .pp-realm-head').forEach(function(h) {
          var t = { i: 0, d: 0, j: 0 };
          String(h.dataset.phyla || '').split(',').forEach(function(n) { var sh = by[Number(n)]; if (sh) { t.i += sh.items.length; t.d += sh.ideas.length; t.j += sh.terms.length; } });
          var c = h.querySelector('.pp-realm-count'); if (c) c.textContent = RPGACE.modules.lifeLibrary.ui._countsLine(t.i, t.d, t.j);
        });
      }).catch(function() {});
    },
    // ── LL-7: one "what this is" header for the 4 Knowledge pages ──
    KNOWLEDGE: [
      { key: 'library', icon: '📚', name: 'Life Library', line: 'What you took in: books, videos, links, lookups, notes and recommendations.' },
      { key: 'bookworm', icon: '📗', name: 'Bookworm', line: 'How you study a source: a book chapter by chapter, or a video.' },
      { key: 'encyclopedia', icon: '📖', name: 'Encyclopedia', line: 'What you learned: idea cards and jargon.' },
      { key: 'phylumPath', icon: '🧬', name: 'Phylum Path', line: 'The map: where it all fits, shelf by shelf.' }
    ],
    goKnowledge: function(key) {
      if (key === 'library') return RPGACE.modules.lifeLibrary.open();
      var dd = RPGACE.modules.dashDeck;
      if (key === 'bookworm') { if (dd && dd._openBookworm) dd._openBookworm(); return; }
      var P = RPGACE.CONFIG.pages;
      if (typeof showPage === 'function') showPage(key === 'encyclopedia' ? P.encyclopedia : P.phylumPath);
    },
    knowledgeHeader: function(key, beforeLeave) {
      var U = RPGACE.modules.lifeLibrary.ui;
      var me = U.KNOWLEDGE.filter(function(k) { return k.key === key; })[0];
      var d = document.createElement('div');
      d.className = 'kn-head'; d.dataset.key = key;
      d.style.cssText = 'margin:0 0 12px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--panel2,rgba(255,255,255,0.03));';
      var line = document.createElement('div');
      line.style.cssText = 'font-size:14px;line-height:1.5;color:var(--text);';
      line.textContent = me ? me.icon + ' ' + me.line : '';
      var links = document.createElement('div');
      links.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px;';
      U.KNOWLEDGE.forEach(function(k) {
        if (k.key === key) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'kn-link'; b.dataset.key = k.key;
        b.textContent = k.icon + ' ' + k.name;
        b.style.cssText = 'background:none;border:none;padding:4px 0;min-height:32px;color:var(--blue,#4A8CCC);cursor:pointer;font-size:13px;font-family:inherit;';
        b.onclick = function() { if (beforeLeave) beforeLeave(); U.goKnowledge(k.key); };
        links.appendChild(b);
      });
      d.appendChild(line); d.appendChild(links);
      return d;
    },
    // Puts the header at the top of a page once (idempotent).
    ensureKnowledgeHeader: function(pageEl, key, before) {
      if (!pageEl || pageEl.querySelector(':scope > .kn-head')) return;
      var h = RPGACE.modules.lifeLibrary.ui.knowledgeHeader(key);
      var anchor = before ? pageEl.querySelector(before) : null;
      var first = pageEl.firstElementChild;
      if (anchor && anchor.parentNode === pageEl) pageEl.insertBefore(h, anchor);
      else if (first && first.classList.contains('section-title')) pageEl.insertBefore(h, first.nextSibling); // under the page title
      else pageEl.insertBefore(h, pageEl.firstChild);
    },

    // LL-6: "📚 From your Library" card in the Morning Brief popup.
    renderDailyInto: function(wrap) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic;
      if (!wrap || !L.signedIn()) return;
      var strip = document.getElementById('ll-daily-strip');
      if (!strip) {
        strip = document.createElement('div');
        strip.id = 'll-daily-strip';
        strip.style.cssText = 'margin-bottom:14px;';
        var anchor = document.getElementById('mb-output');
        if (anchor && anchor.parentNode === wrap) wrap.insertBefore(strip, anchor); else wrap.appendChild(strip);
      }
      strip.innerHTML = '';
      (lib._loaded ? Promise.resolve() : L.load()).then(function() {
        var res = L.pickDaily(lib._items);
        if (!res) return;
        lib.ui._dailyCard(strip, res.item);
        if (res.fresh) L.markSurfaced(res.item).catch(function(e) { console.warn('[lifeLibrary] resurfaced_at not saved:', e && e.message); });
      }).catch(function(e) { console.warn('[lifeLibrary] daily pick failed', e && e.message); });
    },
    _dailyCard: function(strip, i) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic;
      var head = document.createElement('div');
      head.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin-bottom:8px;';
      head.textContent = '📚 From your Library';
      var card = document.createElement('div');
      card.className = 'll-daily';
      card.style.cssText = 'background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;';
      var kind = document.createElement('div');
      kind.style.cssText = 'font-size:12px;color:var(--muted);';
      var when = i.taken_in_on ? new Date(i.taken_in_on + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      var who = i.recommended_by ? L.personName(i.recommended_by) : '';
      kind.textContent = (lib.KINDS[i.kind] || i.kind) + (who ? ' from ' + who : '') + (when ? ' · ' + (i.kind === 'web_lookup' ? 'looked up ' : '') + when : '');
      var title = document.createElement('div');
      title.style.cssText = 'font-size:15px;font-weight:700;line-height:1.4;color:var(--text);margin-top:2px;';
      title.textContent = i.title || '';
      card.appendChild(kind); card.appendChild(title);
      if (i.summary) {
        var sum = document.createElement('div');
        sum.style.cssText = 'font-size:13px;line-height:1.5;color:var(--muted);margin-top:4px;';
        sum.textContent = String(i.summary).replace(/\s+/g, ' ').slice(0, 180) + (String(i.summary).length > 180 ? '…' : '');
        card.appendChild(sum);
      }
      var btns = document.createElement('div');
      btns.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;';
      var mk = function(label, primary) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        b.style.cssText = 'min-height:40px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
          (primary ? 'background:var(--gold);color:#1a1405;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);');
        return b;
      };
      var open = mk('Open', true); open.className = 'll-daily-open';
      open.onclick = function() {
        var dd = RPGACE.modules.dashDeck;
        if (dd && dd.logic && dd.logic.closeWidgetPopup) dd.logic.closeWidgetPopup('mb-wrap');
        lib.open({ focusId: i.id });
      };
      var done = mk('Done with it', false); done.className = 'll-daily-done';
      done.onclick = function() {
        done.disabled = true;
        L.doneWith(i).then(function() {
          card.innerHTML = '<div style="font-size:13px;color:var(--muted);">✓ Won\'t come back' + (i.kind === 'recommendation' ? ' · marked checked' : '') + '</div>';
        }).catch(function(e) { done.disabled = false; lib.ui._err(e); });
      };
      btns.appendChild(open); btns.appendChild(done);
      card.appendChild(btns);
      strip.appendChild(head); strip.appendChild(card);
    },
    // LL-6: "📍 Met in: …" under a jargon term.
    metInLine: function(refs) {
      var d = document.createElement('div');
      d.className = 'jarg-met-in';
      d.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;';
      var lab = document.createElement('span'); lab.textContent = '📍 Met in:'; d.appendChild(lab);
      refs.forEach(function(r) {
        var b = document.createElement('button'); b.type = 'button';
        b.textContent = r.label;
        b.style.cssText = 'background:none;border:none;padding:4px 0;min-height:28px;color:var(--blue,#4A8CCC);text-decoration:underline;cursor:pointer;font-size:11px;font-family:inherit;text-align:left;';
        b.onclick = function() {
          if (r.type === 'library') RPGACE.modules.lifeLibrary.open({ focusId: r.id });
          else if (RPGACE.modules.encyclopediaPosts) RPGACE.modules.encyclopediaPosts.ui._openSource(r.d);
        };
        d.appendChild(b);
      });
      return d;
    },
    // ⭐ button used under main-chat replies and in the floating overlay.
    starButton: function(ex) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'll-star-btn';
      b.textContent = '⭐ Keep in Library';
      b.setAttribute('aria-label', 'Keep this answer in your Life Library');
      b.style.cssText = "background:none;border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:5px;padding:3px 10px;min-height:32px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif";
      b.onclick = function() {
        if (b.disabled) return;
        b.disabled = true; b.textContent = '⭐ Saving…';
        RPGACE.modules.lifeLibrary.logic.starAnswer(ex).then(function(res) {
          if (!res) throw new Error('Sign in first');
          b.textContent = res.duplicate ? '⭐ Already kept' : '⭐ Kept';
          RPGACE.utils.toast(res.duplicate ? 'Already in your Life Library' : '⭐ Kept in your Life Library', '#C9A84C', 2200);
        }).catch(function(e) {
          b.disabled = false; b.textContent = '⭐ Keep in Library';
          RPGACE.modules.lifeLibrary.ui._err(e);
        });
      };
      return b;
    },
    _err: function(e) { RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 3800, 'lifeLibrary'); },
    _sel: function(id, options, value) {
      var s = document.createElement('select'); s.id = id;
      s.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;width:100%;box-sizing:border-box;';
      options.forEach(function(o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if (String(o[0]) === String(value == null ? '' : value)) op.selected = true; s.appendChild(op); });
      return s;
    },
    _shelfOptions: function(first) {
      var L = RPGACE.modules.lifeLibrary.logic, out = first ? [first] : [];
      for (var n = 1; n <= L.maxShelf(); n++) out.push([String(n), L.shelfLabel(n)]);
      return out;
    },

    open: function(opts) {
      var lib = RPGACE.modules.lifeLibrary, U = lib.ui;
      // LL-2 "From" links: check the source is in the Library BEFORE leaving
      // the current screen, so a miss falls back without any navigation.
      if (opts && opts.focusSource && !opts._checked) {
        var go = function() {
          if (!lib.logic.bySource(opts.focusSource.table, opts.focusSource.id)) { if (opts.onMissing) opts.onMissing(); return null; }
          return U.open(Object.assign({}, opts, { _checked: true }));
        };
        if (!lib.logic.signedIn()) { if (opts.onMissing) opts.onMissing(); return null; }
        return (lib._loaded ? Promise.resolve() : lib.logic.load()).then(go, function() { if (opts.onMissing) opts.onMissing(); return null; });
      }
      // KN-2 (Oct 15 2026): a full page (/library) instead of a popup, same
      // render code; the LL-7 "what this is" links bar is replaced by the
      // area's ← Back / 🏠 Knowledge row.
      var pop = RPGACE.areaNav.page('knowledge', RPGACE.CONFIG.pages.library, '📥 Take in · Life Library',
        { key: 'library', label: 'Take in', open: function() { lib.open(); } });
      if (!pop) return null;
      pop.box.id = 'life-library';
      lib._pop = pop;
      lib._filter = Object.assign({ q: '', shelf: '', kind: '', topic: '', days: '', realm: '' }, (opts && opts.filter) || {});
      var body = document.createElement('div'); body.id = 'll-body';
      pop.box.appendChild(body);
      lib._body = body;
      if (!lib.logic.signedIn()) { body.textContent = 'Sign in to see your library.'; return pop; }
      body.textContent = 'Loading…';
      lib.logic.load().then(function() {
        if (opts && opts.add) return U.renderAdd(body, opts.add);
        // LL-2: open straight onto one source (an idea card's "From" link).
        var hit = opts && opts.focusSource ? lib.logic.bySource(opts.focusSource.table, opts.focusSource.id) : null;
        if (opts && opts.focusSource && !hit) {
          if (opts.onMissing) opts.onMissing(); // already checked above; kept for safety
          return;
        }
        U.renderList(body);
        if (hit) U.focus(hit.id);
        else if (opts && opts.focusId) U.focus(opts.focusId); // LL-6 (Morning Brief card, jargon Met in)
      })
        .catch(function(e) { body.textContent = 'Library could not load: ' + (e.message || e); });
      return pop;
    },

    renderList: function(body) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, U = lib.ui, T = U.T(), f = lib._filter;
      body.innerHTML = '';
      // KR-1 (Oct 27 2026): the one way in - ＋ Take in (links, text, screenshots, books, tracks, notes).
      var add = T._btn('＋ Take in', 'primary'); add.id = 'll-add';
      add.onclick = function() { var kh = RPGACE.modules.knowledgeHub; if (kh) kh.ui.openTakeIn(); else U.renderAdd(body, {}); };
      body.appendChild(add);

      var g = T._grid(); g.style.marginTop = '10px';
      var q = T._input('search', 'll-q', f.q, 'Search title, notes, topics, who…');
      var shelf = U._sel('ll-shelf', U._shelfOptions(['', 'All shelves']).concat([['none', 'Unshelved']]), f.shelf);
      var kinds = [['', 'All kinds']].concat(Object.keys(lib.KINDS).map(function(k) { return [k, lib.KINDS[k]]; }));
      var kind = U._sel('ll-kind', kinds, f.kind);
      var days = U._sel('ll-days', [['', 'Any time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['365', 'Last year']], f.days);
      g.appendChild(T._field('Search', q)); g.appendChild(T._field('Shelf', shelf)); g.appendChild(T._field('Kind', kind)); g.appendChild(T._field('When', days));
      body.appendChild(g);
      var realmBox = document.createElement('div'); realmBox.id = 'll-realms'; // RI-5
      body.appendChild(realmBox);
      var chips = document.createElement('div'); chips.id = 'll-topics';
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      body.appendChild(chips);
      var list = document.createElement('div'); list.id = 'll-list';
      body.appendChild(list);

      var paint = function() {
        var items = L.filter(lib._items, f);
        realmBox.innerHTML = '';
        realmBox.appendChild(RPGACE.realmFilterRow({ counts: RPGACE.realmCounts(L.filter(lib._items, Object.assign({}, f, { realm: '' })), 'library_items'),
          selected: f.realm, onPick: function(k) { f.realm = k; paint(); } }));
        chips.innerHTML = '';
        L.topicCounts(L.filter(lib._items, Object.assign({}, f, { topic: '' }))).slice(0, 14).forEach(function(t) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'll-topic'; c.dataset.topic = t.topic;
          c.textContent = '#' + t.topic + ' ' + t.n;
          var on = f.topic === t.topic;
          c.style.cssText = 'min-height:34px;padding:4px 10px;border-radius:16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;' + (on ? 'background:var(--gold);color:#111;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);');
          c.onclick = function() { f.topic = on ? '' : t.topic; paint(); };
          chips.appendChild(c);
        });
        U.renderItems(list, items);
      };
      q.oninput = function() { f.q = q.value; paint(); };
      shelf.onchange = function() { f.shelf = shelf.value; paint(); };
      kind.onchange = function() { f.kind = kind.value; paint(); };
      days.onchange = function() { f.days = days.value; paint(); };
      lib._paint = paint;
      paint();
      var old = document.createElement('button'); old.type = 'button'; old.id = 'll-old-bib';
      old.textContent = '🗄 Old bibliography (saved before Oct 13)';
      old.style.cssText = 'margin-top:14px;background:none;border:none;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer;min-height:40px;font-family:Rajdhani,sans-serif;';
      old.onclick = function() { if (lib._pop) lib._pop.close(); var dd = RPGACE.modules.dashDeck; if (dd && dd._openPage) dd._openPage('bookworm-bibliography'); };
      body.appendChild(old);
    },

    focus: function(id) {
      var row = document.querySelector('#ll-list .ll-item[data-id="' + id + '"]');
      if (!row) return;
      var more = row.querySelector('.ll-more');
      if (more) more.hidden = false;
      row.style.borderColor = 'var(--gold)';
      try { row.scrollIntoView({ block: 'start' }); } catch (e) {}
    },

    renderItems: function(list, items) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, U = lib.ui;
      list.innerHTML = '';
      if (!items.length) {
        var e = document.createElement('div'); e.style.cssText = 'font-size:14px;color:var(--muted);padding:8px 0;';
        e.textContent = lib._items.length ? 'Nothing matches these filters.' : 'Your library is empty. Add a link, a note, a quote or a recommendation to start it.';
        list.appendChild(e); return;
      }
      var month = null;
      items.forEach(function(i) {
        var m = L.monthLabel(i.taken_in_on);
        if (m !== month) { month = m; U.T()._h(list, m); }
        list.appendChild(U.renderRow(i));
      });
    },

    renderRow: function(i) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, U = lib.ui, T = U.T(), esc = T._esc;
      var row = document.createElement('div'); row.className = 'll-item'; row.dataset.id = i.id;
      row.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--panel);';
      var who = i.recommended_by ? L.personName(i.recommended_by) : '';
      var title = i.url ? T._link(i.url, i.title) : esc(i.title);
      row.innerHTML = '<div style="font-size:15px;font-weight:700;line-height:1.35;">' + esc((lib.KINDS[i.kind] || '').split(' ')[0]) + ' ' + title + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:3px;">' + esc([T._dayLabel(i.taken_in_on), who ? 'from ' + who : '', i.status === 'to_check' ? 'to check' : (i.status === 'done' ? 'checked' : '')].filter(Boolean).join(' · ')) + '</div>';
      var meta = document.createElement('div'); meta.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;';
      var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'll-shelf';
      chip.textContent = '🧬 ' + L.shelfLabel(i.phylum_number);
      chip.title = 'Change shelf';
      chip.style.cssText = 'min-height:32px;padding:3px 10px;border-radius:14px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;background:none;color:var(--gold);border:1px solid var(--gold);';
      chip.onclick = function(ev) {
        ev.stopPropagation();
        var s = U._sel('ll-shelf-' + i.id, U._shelfOptions(['', 'Unshelved']), i.phylum_number || '');
        s.style.width = 'auto';
        chip.replaceWith(s); s.focus();
        s.onchange = function() {
          var v = s.value ? Number(s.value) : null;
          L.update(i.id, { phylum_number: v }).then(function() { RPGACE.utils.toast('🧬 Moved to ' + L.shelfLabel(v), '#4caf82', 1800); if (lib._paint) lib._paint(); }).catch(U._err);
        };
      };
      meta.appendChild(chip);
      // RI-5: the realms this item is filed under; tap to change them.
      var X = RPGACE.modules.xpSeason, rs = RPGACE.realmOf('library_items', i);
      var rc = document.createElement('button'); rc.type = 'button'; rc.className = 'll-realms';
      rc.textContent = rs.length && X ? rs.map(function(k) { return X.REALMS[k].icon + ' ' + X.REALMS[k].name; }).join(' · ') : (Array.isArray(i.realms) ? '🎯 Pick realms' : '🎯 Add realms');
      rc.title = 'Change realms';
      rc.style.cssText = chip.style.cssText;
      rc.onclick = function(ev) {
        ev.stopPropagation();
        RPGACE.realmPicker.pick({ what: String(lib.KINDS[i.kind] || i.kind).replace(/^\S+\s/, '').toLowerCase(), title: i.title, preset: rs }).then(function(picked) {
          if (!picked) return;
          return L.update(i.id, { realms: picked }).then(function() { RPGACE._takenCache = null; RPGACE._knowCache = null; if (lib._paint) lib._paint(); });
        }).catch(U._err);
      };
      meta.appendChild(rc);
      (i.topics || []).forEach(function(t) {
        var tg = document.createElement('span'); tg.textContent = '#' + t;
        tg.style.cssText = 'font-size:12px;color:var(--muted);';
        meta.appendChild(tg);
      });
      row.appendChild(meta);

      var more = document.createElement('div'); more.className = 'll-more'; more.hidden = true; more.style.cssText = 'margin-top:8px;';
      if (i.summary) { var s = document.createElement('div'); s.style.cssText = 'font-size:14px;line-height:1.5;margin-bottom:6px;'; s.textContent = i.summary; more.appendChild(s); }
      if (i.body) {
        var b = document.createElement('div'); b.className = 'll-body';
        // LL-2: moved Encyclopedia articles keep their full text, rendered
        // through the XSS-safe renderMarkdown (it escapes HTML first).
        var md = i.source_table === 'encyclopedia' || /(^|\n)#{1,3} |\*\*/.test(i.body);
        if (md && typeof renderMarkdown === 'function') {
          b.style.cssText = 'font-size:14px;line-height:1.55;max-height:60vh;overflow:auto;border-top:1px solid var(--border);padding-top:8px;';
          b.innerHTML = renderMarkdown(i.body);
        } else {
          b.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-wrap;' + (i.kind === 'quote' ? 'font-style:italic;border-left:3px solid var(--gold);padding-left:8px;' : '');
          b.textContent = i.body;
        }
        more.appendChild(b);
      }
      var acts = document.createElement('div'); acts.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;';
      if (i.source_table === 'encyclopedia' && RPGACE.modules.encyclopediaPosts) {
        var ideas = T._btn('💡 Idea cards', 'primary'); ideas.className = 'll-ideas';
        ideas.onclick = function() { RPGACE.modules.encyclopediaPosts.openPost(i.source_id); };
        acts.appendChild(ideas);
      }
      // KN-5: every source leads on to where you study it.
      var KH = RPGACE.modules.knowledgeHub;
      if (i.kind === 'book' && KH) {
        var bw = T._btn(i.source_table === 'bookworm_books' ? '📗 Open in Bookworm' : '📗 Study in Bookworm', 'primary'); bw.className = 'll-study';
        bw.onclick = function() { if (i.source_table === 'bookworm_books') KH.ui.go('resume', { id: i.source_id }); else KH.ui.go('bookworm'); };
        acts.appendChild(bw);
      }
      if (i.kind === 'video' && i.source_table !== 'encyclopedia' && KH) {
        // UI Debloat (Oct 27 2026): open THIS video's write-up, not the whole Videoworm list.
        var vw = T._btn('📖 Read the write-up', 'primary'); vw.className = 'll-study';
        vw.onclick = function() {
          var ep = RPGACE.modules.encyclopediaPosts;
          if (ep) ep.ui.openByUrl(i.source_id || i.url, function() { KH.ui.go('videoworm'); }); else KH.ui.go('videoworm');
        };
        acts.appendChild(vw);
      }
      // KR-1: "Study this" for tracks, and Explain it back for anything else.
      if (i.kind === 'music' && KH) {
        var mw = T._btn('🎼 Open in MusicWorm', 'primary'); mw.className = 'll-study';
        mw.onclick = function() { KH.ui.go('musicworm'); };
        acts.appendChild(mw);
      }
      if (RPGACE.modules.feynman && ['book', 'video', 'music'].indexOf(i.kind) === -1) {
        var fy = T._btn('🧠 Explain it back'); fy.className = 'll-explain';
        fy.onclick = function() { RPGACE.modules.feynman.start(String(i.title || '').slice(0, 120), 'knowledge'); };
        acts.appendChild(fy);
      }
      if (i.kind === 'recommendation') {
        var tick = T._btn(i.status === 'done' ? '↩ Mark to check' : '✅ Checked it', i.status === 'done' ? '' : 'primary');
        tick.onclick = function() { L.update(i.id, { status: i.status === 'done' ? 'to_check' : 'done' }).then(function() { if (lib._paint) lib._paint(); }).catch(U._err); };
        acts.appendChild(tick);
      }
      var topicsBtn = T._btn('✎ Topics');
      topicsBtn.onclick = function() {
        var inp = T._input('text', 'll-edit-topics-' + i.id, (i.topics || []).join(', '), 'comma separated');
        var ok = T._btn('Save', 'primary');
        ok.onclick = function() { L.update(i.id, { topics: inp.value }).then(function() { if (lib._paint) lib._paint(); }).catch(U._err); };
        acts.innerHTML = ''; acts.appendChild(inp); acts.appendChild(ok);
      };
      acts.appendChild(topicsBtn);
      var del = T._btn('🗑 Delete');
      T._armDelete(del, function() { L.remove(i.id).then(function() { RPGACE.utils.toast('Removed from library', '#888', 1800); if (lib._paint) lib._paint(); }).catch(U._err); });
      acts.appendChild(del);
      more.appendChild(acts);
      row.appendChild(more);
      row.addEventListener('click', function(ev) {
        if (ev.target.closest('a,button,select,input')) return;
        more.hidden = !more.hidden;
      });
      return row;
    },

    renderAdd: function(body, pre) {
      var lib = RPGACE.modules.lifeLibrary, L = lib.logic, U = lib.ui, T = U.T();
      body.innerHTML = '';
      T._h(body, 'Add to library');
      var kind = pre.kind || 'link';
      var kinds = document.createElement('div'); kinds.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      body.appendChild(kinds);
      var form = document.createElement('div'); body.appendChild(form);
      var f = {};
      var drawForm = function() {
        kinds.innerHTML = '';
        lib.ADD_KINDS.forEach(function(k) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'll-kind'; c.dataset.kind = k; c.textContent = lib.KINDS[k];
          c.style.cssText = 'min-height:36px;padding:4px 10px;border-radius:16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;' + (k === kind ? 'background:var(--gold);color:#111;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);');
          c.onclick = function() { kind = k; drawForm(); };
          kinds.appendChild(c);
        });
        form.innerHTML = '';
        var textKind = kind === 'note' || kind === 'quote';
        f.url = T._input('url', 'll-url', pre.url || '', 'https://…');
        f.title = T._input('text', 'll-title', pre.title || '', kind === 'quote' ? 'Who said it / where from' : 'Title (optional for links)');
        f.body = T._input('textarea', 'll-body-text', pre.body || '', kind === 'quote' ? 'The quote' : (textKind ? 'Your note' : 'Your notes (optional)'));
        f.topics = T._input('text', 'll-topics-in', pre.topics || '', 'e.g. sidechain, 808 glide (leave empty and Oracle picks)');
        f.shelf = U._sel('ll-shelf-in', U._shelfOptions(['', 'Auto (Oracle picks)']), pre.phylum_number || '');
        f.date = T._input('date', 'll-date', pre.taken_in_on || RPGACE.modules.tripPlans.logic.iso());
        if (!textKind) form.appendChild(T._field('Link', f.url));
        form.appendChild(T._field(kind === 'quote' ? 'Source' : 'Title', f.title));
        if (kind === 'recommendation') {
          var people = [['', 'Who recommended it?']].concat(lib._people.map(function(p) { return [p.id, p.name]; })).concat([['__new', '+ Someone new…']]);
          f.who = U._sel('ll-who', people, pre.recommended_by || '');
          f.newWho = T._input('text', 'll-who-new', '', 'Their name'); f.newWho.hidden = true;
          f.who.onchange = function() { f.newWho.hidden = f.who.value !== '__new'; };
          form.appendChild(T._field('Recommended by', f.who)); form.appendChild(f.newWho);
        } else f.who = null;
        form.appendChild(T._field(textKind ? (kind === 'quote' ? 'Quote' : 'Note') : 'Notes', f.body));
        var g = T._grid();
        g.appendChild(T._field('Topics', f.topics)); g.appendChild(T._field('Shelf', f.shelf)); g.appendChild(T._field('Taken in on', f.date));
        form.appendChild(g);
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;';
        var save = T._btn('Save to library', 'primary'); save.id = 'll-save';
        var back = T._btn('← Back'); back.onclick = function() { U.renderList(body); };
        row.appendChild(save); row.appendChild(back); form.appendChild(row);
        save.onclick = function() {
          save.disabled = true; save.textContent = 'Saving…';
          var whoP = Promise.resolve(f.who ? f.who.value : null);
          if (f.who && f.who.value === '__new') {
            var nm = f.newWho.value.trim();
            whoP = nm ? RPGACE.modules.tripPlans.logic.addPerson({ name: nm }).then(function(p) { lib._people = lib._people.concat([{ id: p.id, name: p.name }]); return p.id; }) : Promise.resolve(null);
          }
          whoP.then(function(whoId) {
            return L.add({ kind: kind, url: f.url.value, title: f.title.value, body: f.body.value, topics: f.topics.value,
              phylum_number: f.shelf.value, taken_in_on: f.date.value, recommended_by: whoId });
          }).then(function(res) {
            if (res.duplicate) RPGACE.utils.toast('📚 Already in your library: ' + res.item.title, '#C9A84C', 3000);
            else RPGACE.utils.toast('📚 Saved · ' + L.shelfLabel(res.item.phylum_number), '#4caf82', 2400);
            U.renderList(body);
          }).catch(function(e) { save.disabled = false; save.textContent = 'Save to library'; U._err(e); });
        };
      };
      drawForm();
    },
  },

  open: function(opts) { return this.ui.open(opts); },
});
/* ===END:lifeLibrary=== */
