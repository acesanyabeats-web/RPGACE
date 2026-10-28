

/* ===MODULE:refCorpus=== */
RPGACE.register('refCorpus', {
  domain: 'content',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 46 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // forty-five predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL/shiftSync/knowledgeGap precedent,
  // so the diff shows only real changes rather than a whitespace wall.
  //
  // 7 real top-level keys, ALL of them functions — ZERO data fields,
  // declared or otherwise. Checked BOTH ways rather than assumed from
  // the shape: a direct read of every top-level key (`init`,
  // `_inject`, `_addSingle`, `_bulkImport`, `_loadList`, `findMatches`,
  // `_showBackfillPopup`), and a grep of the whole module body for
  // `self.X =` / `this.X =` (0 hits), so this module has NONE of the
  // undeclared runtime-assigned field trap that journalQoL's
  // `_activeSource` and oracleDevBridge's `this.TABLE` both hit. The
  // `X.Y =` writes in the body are all onto locally-created DOM
  // elements (`inp.id`, `panel.style.cssText`, `saveBtn.disabled`, …)
  // or onto a caller-supplied row object — `row._score = score` inside
  // `logic.findMatches`, a scratch field written onto each fetched
  // `reference_tracks` ROW, never onto the module. `init` stays a
  // literal top-level function (RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object) — byte-identical, its
  // own `self = this` genuinely IS the module, so the
  // 'research:tab-active' listener's `self._inject()` still reaches
  // `ui` through the top-level pass-through below.
  //
  // This module splits 5 ui / 1 logic. Classification, function by
  // function, each checked against its actual body rather than its
  // name:
  //   • _inject → ui. Unambiguous: a `getElementById` idempotency
  //     guard, `RPGACE.utils.panelHome()` for its host node, ~20
  //     `createElement` calls (panel, eyebrow/title/sub, the 9-field
  //     auto-fit input grid, bulk textarea, 4 buttons, list wrapper +
  //     header), four `onclick` assignments and a `page.appendChild`.
  //   • _addSingle → ui. GENUINELY MIXED and filed here deliberately
  //     rather than split down the middle — see the mixed-function
  //     note below.
  //   • _bulkImport → ui. Same mixed shape as `_addSingle`; same note.
  //   • _loadList → ui. The INSEPARABLE FETCH+RENDER case, and it
  //     genuinely meets that rule's precondition (unlike
  //     knowledgeGap._load, which did not): it DISCOVERS the DOM nodes
  //     itself up front (`getElementById('rc-list')`,
  //     `getElementById('rc-list-header')`, plus the early
  //     `if (!list) return;` bail), then its own `.then` writes the
  //     header text, drains the old children, and builds every row
  //     (name/link/meta/delete) straight into that same discovered
  //     node. The rows are never returned, never stored and never
  //     reused — there is no seam to cut along.
  //   • _showBackfillPopup → ui. Same inseparable shape at popup
  //     grain: the `or=(scale.is.null,genre.is.null)` read exists only
  //     to build the popup, and its `.then` opens
  //     `dashDeck._popup(...)` and fills `pop.box` with a name +
  //     scale/genre input line per row plus the Save button, closing
  //     over `inputs` (live DOM element references) for the write.
  //   • findMatches → logic. SEE THE DEDICATED NOTE BELOW — it is the
  //     one genuinely clean call in this module and the only member
  //     with a real external consumer, so it is argued rather than
  //     filed quietly.
  //
  // ─── the two genuinely mixed functions: why ui, not split ─────────
  // `_addSingle` and `_bulkImport` each contain real DOM form-reading
  // AND a real `RPGACE.sb.secureWrite('reference_tracks', 'insert', …)`
  // in the same body. `_addSingle` reads all 9 inputs via its own
  // `get(id)` `getElementById` helper, validates, writes, then clears
  // those same 9 inputs on success; `_bulkImport` reads
  // `getElementById('rc-bulk')`, parses its lines into rows, writes
  // each, then clears `raw.value` when the last one lands. Neither
  // could be cut in two without inventing a new intermediate contract
  // that does not exist in the source. They land in `ui` on the exact
  // precedent beatLog.ui._submit / beatLog.ui._submitUpdate already
  // set in this same series — real form-reading plus a real Supabase
  // write in one body goes to `ui`, because the DOM discovery is what
  // the function cannot be understood without. The honest cost, stated
  // rather than hidden: a reader looking for "where does a corpus row
  // get written" will find two of the three write sites in `ui`.
  //
  // ─── findMatches: why the corpus scorer is logic ──────────────────
  // `findMatches` contains zero DOM of any kind — no `document.*`, no
  // `createElement`, no `innerHTML`, no `querySelector`/
  // `getElementById`, no listener (grepped, not assumed). Its whole
  // body is a `reference_tracks` read and a pure similarity score per
  // row (BPM band with a far-BPM penalty, mood/scale/genre exact
  // matches, an energy-within-1 bonus), then a `_score > 0` filter and
  // a descending sort — and it RETURNS that array to its caller rather
  // than drawing anything. It is also the one member of this module
  // with a real cross-module consumer (beatLog, see below), which
  // makes the data-not-markup reading doubly clear.
  //
  // ─── EXTERNAL TOUCHPOINTS: three real ones, one via a LOCAL ALIAS ──
  // Named plainly because the obvious direct-call grep alone would
  // have missed the second of these:
  //   1. `dashDeck.PAGE_PANELS['ref-corpus-panel'].ensure` —
  //      `var m = RPGACE.modules.refCorpus; if (m && m._inject) m._inject();`
  //      the real lazy-injection hook behind UI12's
  //      `_openPage('ref-corpus-panel')` MusicWorm route.
  //   2. `dashDeck._openCorpus` — reaches this module through a LOCAL
  //      ALIAS the direct grep does not surface:
  //      `var rc = RPGACE.modules.refCorpus; if (rc && rc._inject) { … rc._inject(); … }`.
  //      (That function is itself marked SUPERSEDED with zero live
  //      callers as of UI10/UI12, but is kept on disk, so the
  //      touchpoint is still real code.)
  //   3. `beatLog` — `RPGACE.modules.refCorpus && typeof
  //      RPGACE.modules.refCorpus.findMatches === 'function'` then
  //      `RPGACE.modules.refCorpus.findMatches(form.bpm, form.mood,
  //      form.scale, form.energy, form.genre)`.
  // All three are guarded by a `typeof`/truthiness check, which is
  // exactly what makes them dangerous: had the pass-throughs below
  // been omitted, every one of those guards would have quietly
  // evaluated false — MusicWorm would have opened an empty page and
  // Beat Log would have silently produced zero artist matches, with no
  // error thrown anywhere. All three land on the top-level
  // pass-throughs and are routed on unchanged. The dynamic-lookup
  // check is separately clean: the only real `RPGACE.modules[variable]`
  // site in the file is contentProductionLive._findOracleCmdText,
  // which reaches modules by NAME STRING and then reads `.CMDS` — this
  // module has no `CMDS` field and is never named at any of its call
  // sites. index.html has zero references to it in any form. The five
  // `"…": "refCorpus"` entries in this file's own METHOD_MODULE_MAP
  // (G109, in the errorLog module) are a generated name->module DATA
  // table, not call sites, and are unaffected by this split.
  //
  // `this`/`self` accounting for all 6 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • 3 already had `var self = this;` and get the module handle
  //     swapped in IN PLACE, never hoisted, so no control flow moved:
  //     ui._inject (declared after its own `getElementById` guard;
  //     captured four times, for the Add/Bulk/Refresh/Backfill button
  //     onclicks, plus the trailing initial `self._loadList()`),
  //     ui._bulkImport (captured for `self._loadList()` once the last
  //     row lands) and ui._showBackfillPopup (captured for
  //     `self._loadList()` after a successful save).
  //   • 1 (ui._loadList) has `var self = this;` used ONLY inside the
  //     per-row delete handler's `self._loadList()` refresh — same
  //     in-place swap.
  //   • 1 (ui._addSingle) had no `var self` at all: it reaches its own
  //     refresh through `.bind(this)` on the success `.then`, so
  //     `this._loadList()` inside that callback would have resolved to
  //     `ui._loadList` — which, unusually for this series, DOES exist
  //     on `ui`, so this one would NOT have thrown. It is still
  //     rewritten to the module handle rather than left alone, so
  //     every internal call in this module routes through the same
  //     public pass-throughs and no caller quietly bypasses them
  //     (the same reasoning intelDelete.ui._injectAll was fixed on).
  //   • 1 (logic.findMatches) references neither `this` nor `self` at
  //     all and moved completely untouched.
  // ══════════════════════════════════════════════════════════════════

  // July 23 — this used to inject (and fetch reference_tracks) 1100ms
  // after EVERY boot, regardless of whether Research Lab was even open
  // (`.page` divs exist in the DOM at all times, just hidden via CSS) -
  // one of ~6 real contributors found to the reported 12-23s post-login
  // freeze. Now gated behind researchTabs' 'research:tab-active' hook,
  // which only fires the first time the 'corpus' tab is actually opened.
  init: function() {
    var self = this;
    RPGACE.hooks.on('research:tab-active', function(key) {
      if (key === 'corpus') setTimeout(function() { self._inject(); }, 100);
    });
    RPGACE.hooks.on('page:show', function() { setTimeout(function() { self.ui.sideExtras(); }, 400); });
  },

  // ============================================================
  // ui — rendering/DOM: builds the Reference Corpus panel (the 9-field
  // add form, the bulk-import textarea, the Add/Bulk/Refresh/Backfill
  // button row and the scrolling track list) into whatever host
  // RPGACE.utils.panelHome() resolves to, then draws the corpus list
  // itself and the backfill popup. The two form handlers live here too
  // — they read and clear the very inputs this namespace built, even
  // though each also performs a real reference_tracks write; see the
  // mixed-function note in the G53 block above.
  // ============================================================
  ui: {

  // SL-1: whichever page holds the corpus panel gets its tools in "This page".
  sideExtras: function() {
    var self = RPGACE.modules.refCorpus, panel = document.getElementById('ref-corpus-panel');
    var host = panel && panel.closest('.page');
    if (!host || host._refExtras) return;
    host._refExtras = true;
    var prev = host._sideExtras;
    host._sideExtras = function() {
      var mine = [['⚡', 'Bulk import tracks', function() { if (self._revealBulk) self._revealBulk(); }, 'rc:bulk'],
        ['↻', 'Refresh the track list', function() { self._loadList(); }, 'rc:refresh'],
        ['🔎', 'Look up missing scale/genre (8 at a time)', function() { self.ui._showLookup(); }, 'rc:lookup']];
      return mine.concat(RPGACE.sideList ? RPGACE.sideList.extrasOf({ _sideExtras: prev }) : []);
    };
  },

  _inject: function() {
    if (document.getElementById('ref-corpus-panel')) return;
    var self = RPGACE.modules.refCorpus;
    // Aug 23 2026 (UI2/UI3) — see RPGACE.utils.panelHome()'s own comment:
    // one shared staging holder, replacing 5 copies of a fallback chain that
    // pointed at the now-retired Research Lab page.
    var page = RPGACE.utils.panelHome();
    if (!page) return;

    var panel = document.createElement('div');
    panel.id = 'ref-corpus-panel';
    panel.style.cssText = 'background:rgba(74,144,226,0.04);border:1px solid rgba(74,144,226,0.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;';

    // Header
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(74,144,226,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Reference Corpus · ' + RPGACE.utils.phylumLabel(8) + ' + ' + RPGACE.utils.phylumLabel(17);
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#D4DAF5;margin-bottom:4px;';
    titleEl.textContent = 'Track Reference Library';
    var subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:16px;';
    subEl.textContent = 'Add reference tracks. Beat Log matches your beat against this corpus to find artist targets. Phase 2: librosa auto-analyses each track.';
    panel.appendChild(eyebrow); panel.appendChild(titleEl); panel.appendChild(subEl);

    // Add track form
    // 2026-07-28 (real hand-test feedback): scale/genre/url added. scale and
    // genre are real columns on reference_tracks that already existed
    // (genre was even already selected by manual.html's dashboard query),
    // but this form never collected either - a real evidence check found
    // ALL 32 existing corpus rows have scale/genre stuck at null, which
    // silently killed 2 of findMatches()'s own scoring dimensions and is
    // the real reason matches kept surfacing the same ~8 names for any
    // aggressive ~140BPM beat (the corpus just has no other way to tell
    // those rows apart). url is a genuinely new column - "I can't even
    // listen to it to see if it's similar" - lets a real reference link
    // travel with the row. Auto-fit grid, not a fixed column count, so
    // this doesn't overflow on a phone (the surface this was reported from).
    var form = document.createElement('div');
    form.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-bottom:10px;align-items:end;';

    var formFields = [
      { id: 'rc-artist', placeholder: 'Artist', type: 'text' },
      { id: 'rc-title',  placeholder: 'Track title', type: 'text' },
      { id: 'rc-bpm',    placeholder: 'BPM', type: 'number' },
      { id: 'rc-key',    placeholder: 'Key', type: 'text' },
      { id: 'rc-scale',  placeholder: 'Scale', type: 'text' },
      { id: 'rc-energy', placeholder: 'Energy 1-5', type: 'number' },
      { id: 'rc-mood',   placeholder: 'Mood', type: 'text' },
      { id: 'rc-genre',  placeholder: 'Genre', type: 'text' },
      { id: 'rc-url',    placeholder: 'Listen link (optional)', type: 'text' },
    ];

    formFields.forEach(function(f) {
      var inp = document.createElement('input');
      inp.id = f.id; inp.type = f.type; inp.placeholder = f.placeholder;
      inp.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:7px 10px;outline:none;font-family:Rajdhani,sans-serif;width:100%;';
      form.appendChild(inp);
    });
    panel.appendChild(form);

    // Bulk add textarea
    var bulkLbl = document.createElement('div');
    bulkLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.3);margin-bottom:5px;margin-top:10px;';
    bulkLbl.textContent = 'Or bulk add — one per line: Artist, Track Title, BPM, Key, Scale, Energy, Mood, Genre, Listen link (last 3 optional)';
    var bulkArea = document.createElement('textarea');
    bulkArea.id = 'rc-bulk';
    bulkArea.placeholder = 'Nines, Money & Muscle, 92, D, Minor, 3, Melancholic, UK Rap\nDave, Titanium, 88, F#, Major, 4, Cinematic, UK Hip Hop';
    bulkArea.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#D4DAF5;font-size:11px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;margin-bottom:10px;';
    panel.appendChild(bulkLbl);
    panel.appendChild(bulkArea);

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;';

    var addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Track';
    addBtn.style.cssText = 'padding:8px 16px;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:6px;color:#4A8CCC;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    addBtn.onclick = function() { self._addSingle(); };

    var bulkBtn = document.createElement('button');
    bulkBtn.textContent = '⚡ Bulk Import';
    bulkBtn.style.cssText = 'padding:8px 16px;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:6px;color:#4A8CCC;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    bulkBtn.onclick = function() { self._bulkImport(); };

    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = '↻ Refresh List';
    refreshBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    refreshBtn.onclick = function() { self._loadList(); };


    // BT-6: web lookup of missing scale/genre (8 at a time, reviewed).
    var lookupBtn = document.createElement('button');
    lookupBtn.id = 'rc-lookup-btn';
    lookupBtn.textContent = '🔎 Look up missing (8 at a time)';
    lookupBtn.style.cssText = 'padding:8px 16px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    lookupBtn.onclick = function() { self.ui._showLookup(); };

    btnRow.appendChild(addBtn); btnRow.appendChild(bulkBtn); btnRow.appendChild(refreshBtn); btnRow.appendChild(lookupBtn);
    panel.appendChild(btnRow);
    // SL-1 (Oct 27 2026): the 9-field form folds behind '➕ Add a track'; Bulk import,
    // Refresh and Look up missing live in the › side list (self.ui.sideExtras).
    refreshBtn.hidden = true; lookupBtn.hidden = true;
    [bulkLbl, bulkArea, bulkBtn].forEach(function(e) { e.hidden = true; });
    if (RPGACE.sideList) self._revealAdd = RPGACE.sideList.foldForm(panel, [form, addBtn], form.firstChild, '➕ Add a track', { before: form }).reveal;
    self._revealBulk = function() { [bulkLbl, bulkArea, bulkBtn].forEach(function(e) { e.hidden = false; }); bulkArea.focus(); };

    // Track list
    var listWrap = document.createElement('div');
    listWrap.id = 'rc-list';
    listWrap.style.cssText = 'max-height:240px;overflow-y:auto;';
    var listHeader = document.createElement('div');
    listHeader.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(226,226,236,0.25);margin-bottom:8px;';
    listHeader.textContent = 'Corpus · 0 tracks';
    listHeader.id = 'rc-list-header';
    listWrap.appendChild(listHeader);
    panel.appendChild(listWrap);

    // Append as a direct child of the Research page. Previously inserted
    // before #beat-log-panel, which (while beat-log was itself nested inside
    // #video-workshop-panel) landed this inside that panel too (Bug A).
    page.appendChild(panel);
    RPGACE.hooks.fire('research:panel-injected');

    self._loadList();
    console.log('[RPGACE:refCorpus] Panel injected');
  },

  // LL-4: a reference track Alex adds by hand (single or bulk) is also a
  // Life Library music item. The beat-match artist-growth rows are not -
  // those are discovered artists, not tracks he took in.
  _feedLibrary: function(row, inserted) {
    var ll = RPGACE.modules.lifeLibrary;
    if (!ll) return;
    var saved = (Array.isArray(inserted) && inserted[0]) || {};
    var facts = [row.bpm ? row.bpm + ' BPM' : '', [row.key, row.scale].filter(Boolean).join(' '), row.mood, row.genre].filter(Boolean).join(' · ');
    ll.logic.feedQuiet({
      kind: 'music', title: row.artist + ' — ' + row.title, url: row.url || '',
      summary: facts || null, topics: [row.genre, row.mood].filter(Boolean),
      source_table: 'reference_tracks', source_id: saved.id != null ? saved.id : (row.artist + ' — ' + row.title).toLowerCase()
    }, 'reference track');
  },

  _addSingle: function() {
    // G53: `this` is `ui` inside this namespace, and the success `.then`
    // below is `.bind(this)` — so its `this._loadList()` would resolve
    // to `ui._loadList` and quietly bypass the module's own public
    // pass-through. Bound to the module handle instead, same call
    // intelDelete.ui._injectAll was fixed on.
    var self = RPGACE.modules.refCorpus;
    var get = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var artist = get('rc-artist');
    var title  = get('rc-title');
    if (!artist || !title) { RPGACE.utils.toast('Artist and title required', '#CC4A4A', 2000); return; }
    var row = {
      artist:  artist,
      title:   title,
      bpm:     parseInt(get('rc-bpm')) || null,
      key:     get('rc-key') || null,
      scale:   get('rc-scale') || null,
      energy:  parseInt(get('rc-energy')) || null,
      mood:    get('rc-mood') || null,
      genre:   get('rc-genre') || null,
      url:     get('rc-url') || null,
      source:  'manual',
      analysed: false,
    };
    RPGACE.sb.secureWrite('reference_tracks', 'insert', row)
      .then(function(d) {
        self._feedLibrary(row, d);
        RPGACE.utils.toast('✅ Added: ' + artist + ' — ' + title, '#4A8CCC', 2500);
        // BT-6: a new track missing scale/genre gets the same web look-up.
        var saved = Array.isArray(d) && d[0];
        if (saved && saved.id && (!row.scale || !row.genre)) self.ui._showLookup([Object.assign({ id: saved.id }, row)]);
        ['rc-artist','rc-title','rc-bpm','rc-key','rc-scale','rc-energy','rc-mood','rc-genre','rc-url'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
        self._loadList();
      }.bind(self))
      .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3000); });
  },

  // 2026-07-28: bulk format extended to Artist, Title, BPM, Key, Scale,
  // Energy, Mood, Genre, Listen link - the last 3 are optional so existing
  // pasted lists in the old 6-field shape still import fine (parts[6-8]
  // simply come back undefined -> null, never an error).
  _bulkImport: function() {
    var self = RPGACE.modules.refCorpus;
    var raw = document.getElementById('rc-bulk');
    if (!raw || !raw.value.trim()) { RPGACE.utils.toast('Paste tracks first', '#CC4A4A', 2000); return; }
    var lines = raw.value.trim().split('\n').filter(function(l) { return l.trim(); });
    var rows = lines.map(function(line) {
      var parts = line.split(',').map(function(p) { return p.trim(); });
      return {
        artist:   parts[0] || '',
        title:    parts[1] || '',
        bpm:      parseInt(parts[2]) || null,
        key:      parts[3] || null,
        scale:    parts[4] || null,
        energy:   parseInt(parts[5]) || null,
        mood:     parts[6] || null,
        genre:    parts[7] || null,
        url:      parts[8] || null,
        source:   'bulk_import',
        analysed: false,
      };
    }).filter(function(r) { return r.artist && r.title; });

    if (rows.length === 0) { RPGACE.utils.toast('No valid rows found', '#CC4A4A', 2000); return; }

    RPGACE.utils.toast('Importing ' + rows.length + ' tracks...', '#4A8CCC', 2000);
    var done = 0;
    rows.forEach(function(row) {
      RPGACE.sb.secureWrite('reference_tracks', 'insert', row)
        .then(function(d) {
          self._feedLibrary(row, d);
          done++;
          if (done === rows.length) {
            RPGACE.utils.toast('✅ Imported ' + done + ' tracks', '#4A8CCC', 3000);
            raw.value = '';
            self._loadList();
          }
        }).catch(function(){});
    });
  },

  _loadList: function() {
    var self = RPGACE.modules.refCorpus;
    var list = document.getElementById('rc-list');
    var header = document.getElementById('rc-list-header');
    if (!list) return;

    RPGACE.sb.select('reference_tracks', 'order=created_at.desc&limit=100')
      .then(function(rows) {
        rows = rows || [];
        if (header) header.textContent = 'Corpus · ' + rows.length + ' tracks · Phase 2: librosa auto-analysis pending';

        // Clear existing rows (keep header)
        while (list.children.length > 1) list.removeChild(list.lastChild);

        if (rows.length === 0) {
          var empty = document.createElement('div');
          empty.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.2);padding:8px 0;';
          empty.textContent = 'No tracks yet. Add some above.';
          list.appendChild(empty);
          return;
        }

        rows.forEach(function(row) {
          var item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
          var left = document.createElement('div');
          var name = document.createElement('div');
          name.style.cssText = 'font-size:12px;color:#D4DAF5;font-weight:600;';
          // 2026-07-28: a real listen link now travels with the row (the
          // whole point being able to actually check similarity, not just
          // read a name) - rendered as a clickable link, not plain text.
          if (row.url) {
            var link = document.createElement('a');
            link.href = row.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
            link.style.cssText = 'color:#4A8CCC;text-decoration:none;';
            link.textContent = '🔗 ' + row.artist + ' — ' + row.title;
            name.appendChild(link);
          } else {
            name.textContent = row.artist + ' — ' + row.title;
          }
          var meta = document.createElement('div');
          meta.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);';
          var parts = [];
          if (row.bpm) parts.push(row.bpm + ' BPM');
          if (row.key) parts.push(row.key + (row.scale ? ' ' + row.scale : ''));
          if (row.energy) parts.push('Energy ' + row.energy);
          if (row.mood) parts.push(row.mood);
          if (row.genre) parts.push(row.genre);
          meta.textContent = parts.join(' · ') || 'No metadata yet';
          left.appendChild(name); left.appendChild(meta);
          var del = document.createElement('button');
          del.textContent = '×';
          del.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.2);cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0;';
          del.onclick = function() {
            RPGACE.sb.secureWrite('reference_tracks', 'delete', null, 'id=eq.' + row.id)
              .then(function() { self._loadList(); })
              .catch(function(){});
          };
          item.appendChild(left); item.appendChild(del);
          list.appendChild(item);
        });
      }).catch(function(e) {
        console.warn('[refCorpus] load error:', e.message);
      });
  },

  // BT-6: the review list. `only` = specific rows (a track just added);
  // otherwise the next 8 tracks missing scale or genre, never looked up.
  _showLookup: function(only) {
    var self = RPGACE.modules.refCorpus, L = self.logic, dd = RPGACE.modules.dashDeck;
    var pop = dd._popup({ scroll: true, width: '640px', eyebrow: 'Reference tracks', title: '🔎 Look up key, scale, BPM, genre' });
    var box = document.createElement('div'); box.id = 'rc-lookup'; box.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    box.textContent = 'Picking tracks…';
    pop.box.appendChild(box);
    var rowsP = only ? Promise.resolve(only) : RPGACE.sb.select('reference_tracks', 'select=id,artist,title,bpm,key,scale,genre,lookup_at&or=(scale.is.null,genre.is.null)&lookup_at=is.null&order=created_at.asc&limit=' + L.LOOKUP_BATCH);
    rowsP.then(function(rows) {
      rows = Array.isArray(rows) ? rows.slice(0, L.LOOKUP_BATCH) : [];
      if (!rows.length) { box.textContent = 'Nothing left to look up — every track has scale and genre (or was skipped).'; return; }
      box.textContent = '🔎 Searching the web for ' + rows.length + ' track' + (rows.length === 1 ? '' : 's') + '…';
      return L.lookup(rows).then(function(res) {
        box.textContent = '';
        var byId = {}; res.found.forEach(function(f) { byId[f.id] = f; });
        var note = document.createElement('div'); note.style.cssText = 'font-size:13px;color:var(--muted);';
        note.textContent = 'Your own values are kept; found values fill the gaps. "found:" shows where the web disagrees. Nothing is saved until you press Accept.';
        box.appendChild(note);
        var inCss = 'box-sizing:border-box;min-height:40px;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;';
        rows.forEach(function(r) {
          var f = byId[r.id], v = L.merged(r, f);
          var card = document.createElement('div'); card.className = 'rc-lk-row'; card.dataset.id = r.id;
          card.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px;';
          var h = document.createElement('div'); h.style.cssText = 'font-weight:700;color:var(--text);font-size:14px;';
          h.textContent = (r.artist || '') + ' — ' + (r.title || '') + (f ? '' : '  (not found — fill in by hand or skip)');
          card.appendChild(h);
          var grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;';
          var fields = {};
          [['key', 'Key'], ['scale', 'Major/Minor'], ['bpm', 'BPM'], ['genre', 'Genre']].forEach(function(x) {
            var w = document.createElement('label'); w.style.cssText = 'display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--muted);';
            w.appendChild(document.createTextNode(x[1]));
            var el;
            if (x[0] === 'scale') {
              el = document.createElement('select');
              ['', 'Major', 'Minor'].forEach(function(o) { var op = document.createElement('option'); op.value = o; op.textContent = o || '—'; el.appendChild(op); });
            } else { el = document.createElement('input'); el.type = x[0] === 'bpm' ? 'number' : 'text'; }
            el.className = 'rc-lk-' + x[0]; el.style.cssText = inCss; el.value = v[x[0]] == null ? '' : String(v[x[0]]);
            w.appendChild(el);
            if (v.differs[x[0]]) { var dfl = document.createElement('span'); dfl.className = 'rc-lk-diff'; dfl.style.cssText = 'color:var(--gold);font-size:11px;'; dfl.textContent = 'found: ' + f[x[0]]; w.appendChild(dfl); }
            fields[x[0]] = el; grid.appendChild(w);
          });
          card.appendChild(grid);
          var acts = document.createElement('div'); acts.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
          var mk = function(label, cls) { var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.style.cssText = 'min-height:40px;padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;'; return b; };
          var acc = mk('✓ Accept', 'rc-lk-accept'), skip = mk('Skip', 'rc-lk-skip');
          acc.style.borderColor = 'var(--gold)'; acc.style.color = 'var(--gold)';
          var done = function(msg) { acts.textContent = ''; var d = document.createElement('span'); d.className = 'rc-lk-done'; d.style.cssText = 'font-size:13px;color:var(--muted);'; d.textContent = msg; acts.appendChild(d); grid.style.opacity = '0.6'; };
          var write = function(upd, msg, btn) {
            btn.disabled = true;
            upd.lookup_at = new Date().toISOString();
            RPGACE.sb.secureWrite('reference_tracks', 'update', upd, 'id=eq.' + r.id).then(function() {
              try { RPGACE.cache.clear('reference_tracks'); } catch (e) {}
              done(msg);
            }, function(e) { btn.disabled = false; RPGACE.utils.toast('⚠️ Could not save ' + (r.title || '') + ': ' + (e && e.message || e), '#CC4A4A', 4000, 'refCorpus'); });
          };
          acc.onclick = function() {
            var k = L.normKey(fields.key.value, fields.scale.value);
            var bpm = parseInt(fields.bpm.value, 10);
            write({ key: k.key || (fields.key.value.trim() || null), scale: fields.scale.value || k.scale || null, bpm: bpm >= 40 && bpm <= 250 ? bpm : null, genre: fields.genre.value.trim() || null }, '✓ Saved', acc);
          };
          skip.onclick = function() { write({}, 'Skipped — will not be looked up again', skip); };
          acts.appendChild(acc); acts.appendChild(skip);
          card.appendChild(acts);
          box.appendChild(card);
        });
        if (res.sources.length) {
          var src = document.createElement('div'); src.style.cssText = 'font-size:12px;color:var(--muted);';
          src.appendChild(document.createTextNode('Sources: '));
          res.sources.slice(0, 5).forEach(function(s, i) { var a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = (i ? ', ' : '') + (s.title || s.url); a.style.color = 'var(--gold)'; src.appendChild(a); });
          box.appendChild(src);
        }
        if (!only) {
          var next = document.createElement('button'); next.type = 'button'; next.id = 'rc-lk-next'; next.textContent = '🔎 Next 8';
          next.style.cssText = 'min-height:44px;padding:8px 16px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-weight:700;cursor:pointer;font-family:inherit;align-self:flex-start;';
          next.onclick = function() { pop.close(); self._loadList(); self.ui._showLookup(); };
          box.appendChild(next);
        }
      });
    }).catch(function(e) {
      box.textContent = '⚠️ Look-up failed: ' + (e && e.message || e) + (e && e.setup ? ' (the web search key is not set up)' : '');
      RPGACE.utils.toast('⚠️ Reference look-up failed: ' + (e && e.message || e), '#CC4A4A', 4000, 'refCorpus');
    });
    return pop;
  },

  // BT-7 (Oct 16 2026): the hand-edit backfill popup is retired - 🔎 Look up
  // (_showLookup) fills and reviews the same gaps.
  },

  // ============================================================
  // logic — business logic/data: the corpus similarity scorer beatLog
  // calls to turn a beat's own BPM/mood/scale/energy/genre into a
  // ranked list of reference tracks. No DOM of any kind; it returns
  // the scored array to its caller rather than drawing anything.
  // ============================================================
  logic: {

  // BT-6 (Oct 16 2026): look reference tracks up on the web (Gemini via
  // /api/search type web, tripPlans.logic.webSearch - one shared caller).
  // 8 tracks per call; the reply is asked for one "n | key | scale | bpm |
  // genre" line per track (the raw API answer, not chat DOM, so lines
  // survive). Nothing is written until Alex accepts a row; his own values
  // stay unless he changes them.
  LOOKUP_BATCH: 8,
  NOTE_ALIASES: { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C' },
  // The search box takes 500 characters: the instruction goes first, then
  // each song trimmed to an equal share so none is cut off.
  lookupQuery: function(tracks) {
    var head = 'Key, major/minor, BPM, genre (tunebat/songbpm). Reply one line per song: n | key | Major or Minor | BPM | genre; ? if unknown. Songs: ';
    var per = Math.max(12, Math.floor((500 - head.length) / Math.max(1, tracks.length)) - 6);
    var list = tracks.map(function(t, i) { return (i + 1) + '. ' + (String(t.artist || '') + ' - ' + String(t.title || '')).slice(0, per); }).join('; ');
    return (head + list).slice(0, 500);
  },
  // Pure: "F#m", "Gb minor", "A" (+ an optional scale word) -> {key, scale}; flats as sharps.
  normKey: function(k, sc) {
    var t = String(k || '').trim();
    var m = /^([A-Ga-g])\s*([#♯b♭]?)\s*(minor|min|m|major|maj)?(?![a-z])/i.exec(t);
    if (!m) return { key: null, scale: null };
    var acc = m[2] === '♯' ? '#' : (m[2] === '♭' || m[2] === 'b') ? 'b' : m[2];
    var note = m[1].toUpperCase() + acc;
    note = RPGACE.modules.refCorpus.logic.NOTE_ALIASES[note] || note;
    var w = (m[3] || '').toLowerCase(), s2 = String(sc || '').toLowerCase().trim();
    var scale = (w === 'm' || /^min/.test(w)) ? 'Minor' : /^maj/.test(w) ? 'Major' : null;
    if (/^(minor|min|m)$/.test(s2)) scale = 'Minor'; else if (/^(major|maj)$/.test(s2)) scale = 'Major';
    return { key: note, scale: scale };
  },
  // Pure: answer lines -> [{id, key, scale, bpm, genre}] for the tracks asked about.
  parseLookup: function(answer, tracks) {
    var L = RPGACE.modules.refCorpus.logic, out = [];
    String(answer || '').split('\n').forEach(function(line) {
      var m = /^\s*\**\s*(\d+)\s*[.)|:-]?\s*(.*)$/.exec(line.replace(/\*\*/g, ''));
      if (!m) return;
      var i = Number(m[1]) - 1, t = tracks[i];
      if (!t) return;
      var parts = m[2].split('|').map(function(x) { return x.trim(); });
      if (parts.length < 4) return;
      if (parts.length >= 5 && /[a-z]/i.test(parts[0]) && !/^[A-Ga-g][#♯b♭]?\s*(m|min|minor|maj|major)?$/i.test(parts[0])) parts.shift();
      var k = L.normKey(parts[0], parts[1]);
      var bpm = parseInt(String(parts[2]).replace(/[^0-9.]/g, ''), 10);
      var genre = String(parts[3] || '').replace(/[?.]+$/, '').trim();
      out.push({ id: t.id, key: k.key, scale: k.scale, bpm: bpm >= 40 && bpm <= 250 ? Math.round(bpm) : null, genre: genre && genre !== '?' ? genre.slice(0, 40) : null });
    });
    return out;
  },
  lookup: function(tracks) {
    var L = RPGACE.modules.refCorpus.logic, tp = RPGACE.modules.tripPlans;
    if (!tp || !tp.logic.webSearch) return Promise.reject(new Error('web search is not loaded'));
    return tp.logic.webSearch(L.lookupQuery(tracks)).then(function(d) { return { found: L.parseLookup(d.answer, tracks), sources: d.sources || [], answer: d.answer || '' }; });
  },
  // Pure: what the review row starts with — his own values kept, gaps filled.
  merged: function(row, found) {
    found = found || {};
    var pick = function(mine, theirs) { return mine != null && mine !== '' ? mine : (theirs != null ? theirs : ''); };
    var diff = function(mine, theirs) { return mine != null && mine !== '' && theirs != null && String(mine).toLowerCase() !== String(theirs).toLowerCase(); };
    return {
      key: pick(row.key, found.key), scale: pick(row.scale, found.scale), bpm: pick(row.bpm, found.bpm), genre: pick(row.genre, found.genre),
      differs: { key: diff(row.key, found.key), scale: diff(row.scale, found.scale), bpm: diff(row.bpm, found.bpm), genre: diff(row.genre, found.genre) }
    };
  },

  // Called by beatLog to find matching artists from corpus.
  // 2026-07-28 (real hand-test feedback): genre added as a real scoring
  // dimension - the corpus already had this column (and scale, scored
  // below), but real evidence showed every existing row had both stuck at
  // null (the add-track UI never collected them), which flattened the
  // corpus's own ability to tell apart two rows with the same BPM/mood/
  // energy - the real reason matches kept surfacing the same handful of
  // names for any aggressive ~140BPM beat.
  findMatches: function(bpm, mood, scale, energy, genre) {
    var bpmNum = parseInt(bpm) || 130;
    var energyNum = parseInt(energy) || 3;
    var bpmRange = 15; // match within ±15 BPM

    return RPGACE.sb.select('reference_tracks',
      'order=created_at.desc&limit=200'
    ).then(function(rows) {
      if (!rows || rows.length === 0) return [];

      // Score each track by similarity
      var scored = rows.map(function(row) {
        var score = 0;
        if (row.bpm) {
          var bpmDiff = Math.abs(row.bpm - bpmNum);
          if (bpmDiff <= 5) score += 4;
          else if (bpmDiff <= 10) score += 3;
          else if (bpmDiff <= bpmRange) score += 1;
          else score -= 2; // penalise far BPM
        }
        if (row.mood && mood && row.mood.toLowerCase() === mood.toLowerCase()) score += 3;
        if (row.scale && scale && row.scale.toLowerCase() === scale.toLowerCase()) score += 2;
        if (row.energy && Math.abs(row.energy - energyNum) <= 1) score += 2;
        if (row.genre && genre && row.genre.toLowerCase() === genre.toLowerCase()) score += 3;
        row._score = score;
        return row;
      });

      // Filter minimum score and sort
      return scored
        .filter(function(r) { return r._score > 0; })
        .sort(function(a, b) { return b._score - a._score });
    });
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Three of these are genuinely LOAD-BEARING for real external
  // callers, all behind truthiness/`typeof` guards that would have
  // failed SILENTLY had these been dropped:
  // `dashDeck.PAGE_PANELS['ref-corpus-panel'].ensure` and the
  // superseded-but-still-present `dashDeck._openCorpus` (via its
  // `var rc = RPGACE.modules.refCorpus;` LOCAL ALIAS) both reach
  // `_inject`, and `beatLog` reaches `findMatches` — see the
  // external-touchpoints note in the G53 block above. They also carry
  // this module's own internal calls: `init`'s 'research:tab-active'
  // listener calls `self._inject()`, `ui._inject` calls
  // `self._addSingle()` / `self._bulkImport()` / `self._loadList()` /
  // `self._showBackfillPopup()` from its four button onclicks plus a
  // trailing initial `self._loadList()`, and `ui._addSingle`,
  // `ui._bulkImport`, `ui._loadList`'s per-row delete handler and
  // `ui._showBackfillPopup`'s save handler each call `self._loadList()`
  // to refresh — every one of those `self`s is the module, so each
  // lands here first and is routed on to the right namespace.
  _inject: function() { return this.ui._inject(); },
  _addSingle: function() { return this.ui._addSingle(); },
  _feedLibrary: function(row, inserted) { return this.ui._feedLibrary(row, inserted); },
  _bulkImport: function() { return this.ui._bulkImport(); },
  _loadList: function() { return this.ui._loadList(); },
  findMatches: function(bpm, mood, scale, energy, genre) { return this.logic.findMatches(bpm, mood, scale, energy, genre); },

});
/* ===END:refCorpus=== */
