/* ===END_DOMAIN:LEARNING=== */

/* ===DOMAIN:CONFIG=== */

/* ===MODULE:config=== */
RPGACE.register('config', {
  domain: 'platform',

  // G53 (Sep 2026) housekeeping note: reviewed for the ui/logic split —
  // genuinely not applicable. This module has exactly one real function
  // (`init`, which must stay a literal top-level function regardless,
  // since RPGACE.register() calls `module.init()` directly) — the rest of
  // its size is a single large static data literal (RPGACE.CONFIG), never
  // executed as its own function. There is nothing to separate into
  // `ui`/`logic` sub-namespaces with only one real method. Left as-is,
  // byte-identical.

  init: function() {
    /* CONFIG module — no DOM work, just sets globals */
    RPGACE.CONFIG = {
      supabase: {
        url: 'https://gripopghczmrbrhqtqbm.supabase.co',
        key: 'sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf',
      },
      pages: {
        dashboard:    'dashboard',
        agenda:       'quests',
        schedule:     'schedule',
        oracle:       'advisor',
        agents:       'agents',
        // 'research' (slug 'learning') deliberately LEFT AS-IS, not removed
        // here — real callers still compare against it directly
        // (researchTabs.init's page:show guard, leftNav._applyActive's
        // onResearch check, both pre-UI2). That page div itself is gone
        // (retired Aug 23 2026, UI2 — #page-learning is now
        // #legacy-worm-panels, a non-.page staging holder showPage() can
        // never target), so the slug is already unreachable via any real
        // navigation (showPage('learning') throws before a page:show hook
        // could ever fire with this name) — a known, already-flagged UI2
        // residual, not something this pass introduces or needs to touch.
        // Deleting the KEY (leaving `.research` reading `undefined`) was
        // tried and reverted here: pathRouter's own page:show listener
        // already guards `if (!name) return`, meaning `name` can genuinely
        // be falsy on a real fire — turning `pages.research` from the
        // harmless, unreachable string 'learning' into `undefined` would
        // make an unrelated undefined-name fire silently start matching
        // these old guards, a real behavior change with no real benefit.
        research:     'learning',
        encyclopedia: 'encyclopedia',
        journal:      'journal',
        phylumPath:   'phylumpath',
        chronicles:   'chronicles',
        // Sep 26 2026 — real standalone page (Jargon Encyclopedia UI rework,
        // same real routable-page shape as videoworm/musicworm below, own
        // page:show listener + page shell, never a button crammed onto
        // Phylum Path's title anymore).
        jargonEncyclopedia: 'jargon-encyclopedia',
        // Oct 15 2026 (KN-1) — the Knowledge home page (knowledgeHub).
        knowledge: 'knowledge',
        // BT-0 (Oct 16 2026) — the Beats home page (beatsHub).
        beats: 'beats',
        // PC-0 (Oct 17 2026) — the Posting home page (postingHub).
        posting: 'posting',
        // SH-0 (Oct 17 2026) — the Selling home page (sellingHub).
        selling: 'selling',
        // SH-5b (Oct 17 2026) — the Money page (moneyHub), shared by Selling and Habits.
        money: 'money',
        // KN-2: Life Library + Screenshot Inbox became pages.
        library: 'library',
        screenshots: 'screenshots',
        // KN-3: the Knowledge Review page.
        review: 'review',
        // Oct 20 2026 — the Study page (studyHub): exam practice.
        study: 'study',
        // Aug 31 2026 (UI11) — 8 real routable pages, real content moved in
        // by dashDeck._openPage() (PAGE_PANELS).
        bookworm:        'bookworm',
        videoworm:       'videoworm',
        musicworm:       'musicworm',
        bibliography:    'bibliography',
        contentPipeline: 'content-pipeline',
        ideaBank:        'idea-bank',
        beatLogPage:     'beat-log',
      },
      mainFns: {
        prodOracle:  'toggleProdOraclePanel',
        instaOracle: 'toggleInstaPanel',
        sync:        'syncAndPush',
        clearEnc:    'clearEncyclopedia',
        refreshEnc:  'refreshEncyclopediaDisplay',
      },
    };
    RPGACE.sb = {
      url: function(table) {
        return RPGACE.CONFIG.supabase.url + '/rest/v1/' + table;
      },
      headers: function() {
        var k = RPGACE.CONFIG.supabase.key;
        return {
          'Authorization': 'Bearer ' + k,
          'apikey': k,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        };
      },
      del: function(table, filter) {
        return fetch(RPGACE.sb.url(table) + '?' + filter, {
          method: 'DELETE', headers: RPGACE.sb.headers(),
        });
      },
      update: function(table, filter, patch) {
        return fetch(RPGACE.sb.url(table) + '?' + filter, {
          method: 'PATCH', headers: RPGACE.sb.headers(),
          body: JSON.stringify(patch),
        });
      },
      insert: function(table, row) {
        return fetch(RPGACE.sb.url(table), {
          method: 'POST', headers: RPGACE.sb.headers(),
          body: JSON.stringify(row),
        });
      },
      // Routes a write through /api/data-write (service-role key, bypasses
      // RLS) instead of the anon key hitting Supabase directly - for tables
      // where anon has been locked to read-only (Approach B, phased July 24).
      // Always returns the written row(s) (return=representation server-side),
      // unlike insert()/update() above which default to return=minimal.
      // onConflict (5th, optional param, July 24): passes through to
      // api/data-write.js for the one real upsert call site
      // (saveOracleToEncyclopedia's ?on_conflict=title) - every other
      // caller omits it and gets a plain insert, unchanged.
      secureWrite: function(table, operation, payload, match, onConflict) {
        return fetch('/api/data-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: table, operation: operation, payload: payload, match: match, onConflict: onConflict }),
        }).then(function(r) {
          // Real bug fixed Sep 2 (found via error_log: 16 occurrences of
          // "Unexpected token '<', <!DOCTYPE ... is not valid JSON",
          // questEngine._createQuests among them) — this used to call
          // r.json() unconditionally, BEFORE checking r.ok. When the
          // response body is real HTML (a platform/SSO intercept, a Vercel
          // error page — the standing, still-unconfirmed root cause named
          // in error_log's own backtrack_note) rather than JSON, r.json()
          // itself throws a raw SyntaxError, discarding the real HTTP
          // status and body — exactly the diagnostic info error_log's own
          // "next step" asked Alex to manually capture via DevTools each
          // time. Fixed to check r.ok FIRST and read the body as text on
          // failure, so every future occurrence surfaces the real status
          // code + a body snippet in the thrown error automatically,
          // instead of a cryptic parse error. Success path unchanged.
          if (!r.ok) {
            return r.text().then(function(text) {
              var snippet = (text || '').slice(0, 200);
              throw new Error('secureWrite failed (' + r.status + '): ' + snippet);
            });
          }
          return r.json().then(function(body) { return body.data; });
        });
      },
      select: function(table, params) {
        return fetch(RPGACE.sb.url(table) + (params ? '?' + params : ''), {
          headers: RPGACE.sb.headers(),
        }).then(function(r) { return r.json(); });
      },
      // July 29 (/restructure finding 2) - calls a Postgres function via
      // PostgREST's RPC endpoint. First real user: oracleTreeGrounding's
      // trigram-similarity search (search_taxonomy_leaves). Shared here
      // per rule 8 rather than a one-off fetch, since any future RPC need
      // should reuse this same path.
      rpc: function(fn, params) {
        return fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/rpc/' + fn, {
          method: 'POST', headers: RPGACE.sb.headers(),
          body: JSON.stringify(params || {}),
        }).then(function(r) { return r.json(); });
      },
    };
    console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');

    // In-memory Supabase cache — 60 second TTL
    RPGACE.cache = {
      _store: {},
      get: function(key) {
        var entry = this._store[key];
        if (!entry) return null;
        if (Date.now() - entry.ts > 60000) { delete this._store[key]; return null; }
        return entry.data;
      },
      set: function(key, data) {
        this._store[key] = { data: data, ts: Date.now() };
        return data;
      },
      // Bug fixed here: every real cache key is `table + '|' + params`
      // (set by RPGACE.sb.select's wrapper below), but every caller of
      // clear() below (the insert/update/del wrappers) passes just the
      // bare table name - `delete this._store[key]` was deleting a key
      // that never existed, silently. Cache-busting on write has never
      // actually worked; stale reads could persist for the full 60s TTL
      // after any insert/update/delete. Now matches by prefix so a bare
      // table name clears every cached query against that table.
      clear: function(key) {
        var store = this._store;
        if (!key) { this._store = {}; return; }
        var prefix = key + '|';
        Object.keys(store).forEach(function(k) {
          if (k === key || k.indexOf(prefix) === 0) delete store[k];
        });
      }
    };

    // Patch RPGACE.sb.select to use cache
    var _origSelect = RPGACE.sb.select.bind(RPGACE.sb);
    RPGACE.sb.select = function(table, params) {
      var cacheKey = table + '|' + (params || '');
      // Don't cache writes-heavy tables. rpgace_shifts added July 22:
      // confirmed real shifts get written by an external local Python
      // script (browser-use automation scraping Alex's rota, outside the
      // app entirely) - a write path this cache's own busting can never
      // see or invalidate, since RPGACE.cache.clear() only ever fires from
      // this app's OWN insert/update/delete wrappers. Any external write
      // could sit behind up to 60s of stale cached reads with no way for
      // the app to know. Table is read-often/tiny, not write-heavy in the
      // app's own sense, but the same "never guaranteed fresh" problem
      // applies - excluded from caching for the same reason as the others.
      // pantry_stock added Sep 13 2026 (H7, real bug found via a headless-
      // Chromium test of the new shopping-list code, not guessed): its
      // cache key never varies per ingredient/session, so a fresh
      // pantry_stock write via ui._showPantry's add-stock flow could sit
      // behind up to 60s of stale cached reads the next time a shopping
      // list is generated from _loadPantry - a genuinely wrong have/not-
      // have split, not just a display-lag annoyance, same real-world-
      // decision-correctness reasoning as rpgace_shifts below.
      var noCache = ['content_productions','conid_pot','journal','intel_jobs','rpgace_shifts','chronicles_finance','system_updates','pantry_stock'];
      if (noCache.indexOf(table) !== -1) return _origSelect(table, params);
      var cached = RPGACE.cache.get(cacheKey);
      if (cached) return Promise.resolve(cached);
      return _origSelect(table, params).then(function(data) {
        RPGACE.cache.set(cacheKey, data);
        return data;
      });
    };

    // Bust cache on any insert/delete
    var _origInsert = RPGACE.sb.insert.bind(RPGACE.sb);
    RPGACE.sb.insert = function(table, row) {
      RPGACE.cache.clear(table);
      return _origInsert(table, row);
    };
    var _origDel = RPGACE.sb.del.bind(RPGACE.sb);
    RPGACE.sb.del = function(table, filter) {
      RPGACE.cache.clear(table);
      return _origDel(table, filter);
    };
    var _origUpdate = RPGACE.sb.update.bind(RPGACE.sb);
    RPGACE.sb.update = function(table, filter, patch) {
      RPGACE.cache.clear(table);
      return _origUpdate(table, filter, patch);
    };

    // Bust cache on secureWrite too (real bug found in a July 24 audit):
    // secureWrite was added the same day as Approach B's write-proxy but
    // never wrapped like insert/update/del above - 66 real call sites
    // across 15 tables (taxonomy_tree/proposals/links, bookworm_books/
    // chapters, etc.) were silently serving up to 60s of stale cached
    // reads after every write, e.g. an approved taxonomy_proposals row
    // still showing "pending" in the review queue. Same fix shape as the
    // one already documented on RPGACE.cache.clear() above.
    var _origSecureWrite = RPGACE.sb.secureWrite.bind(RPGACE.sb);
    RPGACE.sb.secureWrite = function(table, operation, payload, match, onConflict) {
      RPGACE.cache.clear(table);
      return _origSecureWrite(table, operation, payload, match, onConflict);
    };

    // July 28: RPGACE.streamOracle + the sendChat intercept that used to
    // live here (and the restoreSendChat module that neutralised it) are
    // removed entirely, not just deprecated - the real fix now lives
    // directly in main.js's own callOracle()/sendChat() (a genuine
    // server-backed stream, replacing the broken client-only shim this
    // was). Keeping a second, dead, differently-broken streaming path
    // around risked a future session reviving the wrong mechanism by
    // mistake (rule 8) - this was CLAUDE.md's own standing tech-debt item
    // ("Streaming Oracle intercept — dead code, neutralised, not removed"),
    // closed here rather than re-flagged again.
    console.log('[RPGACE:config] Cache ready');

    // Attach global phyla-scan observer directly — rpgace:ready may have
    // already fired before this code runs, so we don't wait for it.
    // _initPhylaObserver has its own self-retry if #send-btn isn't in the DOM yet.
    setTimeout(function() {
      if (RPGACE.utils._initPhylaObserver) RPGACE.utils._initPhylaObserver();
    }, 500);

    // July 20: nav-scroll-arrow injection removed — the old .nav-tabs bar it
    // wrapped is gone (replaced by the leftNav slide-out drawer). The
    // orphaned .nav-scroll-arrow CSS was removed from style.css in the same
    // pass.

    // Intel UI: hide main.js container, show our collapsed list instead
    function applyIntelUI() {
      if (!RPGACE.modules.intelDelete) return;
      var id = RPGACE.modules.intelDelete;

      // If expanded mode is active, don't touch anything
      if (window._intelViewExpanded) return;

      var container = document.getElementById('intel-insights-content');
      if (!container) return;

      // Hide main.js full cards
      container.style.display = 'none';

      // Inject toggle + collapsed list above the container
      var parent = container.parentElement;
      if (!parent) return;

      // Remove stale elements
      var oldToggle = document.getElementById('kg-master-toggle');
      if (oldToggle) oldToggle.remove();
      var oldList = document.getElementById('intel-collapsed-list');
      if (oldList) oldList.remove();

      // Build fresh collapsed list and toggle
      id._buildCollapsedList(parent);
      id._injectMasterToggle(parent);

      // Also inject DEL buttons into hidden cards for when user expands
      setTimeout(function() { id._injectAll(); }, 100);
    }

    // Aug 23 2026 (UI2) - was a page:show listener on 'learning'/'research'.
    // That page is retired; #intel-insights-content (the element applyIntelUI
    // actually operates on) lives inside #file-analyzer-panel, which now opens
    // as its own dashDeck popup. Same staggered retries, real new trigger.
    RPGACE.hooks.on('worm-panel:open', function(panelId) {
      if (panelId !== 'file-analyzer-panel') return;
      // Staggered to catch the panel's own list finishing its render.
      [300, 800, 1500, 3000].forEach(function(d) {
        setTimeout(applyIntelUI, d);
      });
    });

    // Block agenda auto-generation on load — user must click Generate
    setTimeout(function() {
      if (typeof window.generateAgendas === 'function' && !window._agendaAutoBlocked) {
        window._agendaAutoBlocked = true;
        var _orig = window.generateAgendas;
        var _blocked = true;
        window.generateAgendas = function() {
          if (_blocked) { _blocked = false; return; } // skip the first auto-call
          return _orig.apply(this, arguments);
        };
        setTimeout(function() { _blocked = false; }, 4000);
      }
    }, 1500);


    // Also intercept intel reload functions
    function patchIntelFns() {
      if (typeof window.syncIntelData === 'function' && !window._syncIntelPatched) {
        window._syncIntelPatched = true;
        var _origSync = window.syncIntelData;
        window.syncIntelData = function() {
          var result = _origSync.apply(this, arguments);
          setTimeout(applyIntelUI, 800);
          return result;
        };
      }
      if (typeof window.loadIntelInsights === 'function' && !window._loadIntelPatched) {
        window._loadIntelPatched = true;
        var _origLoad = window.loadIntelInsights;
        window.loadIntelInsights = function() {
          var result = _origLoad.apply(this, arguments);
          setTimeout(applyIntelUI, 800);
          return result;
        };
      }
      if (typeof window.startIntelPolling === 'function' && !window._pollPatched) {
        window._pollPatched = true;
        var _origPoll = window.startIntelPolling;
        window.startIntelPolling = function() {
          var result = _origPoll.apply(this, arguments);
          setTimeout(applyIntelUI, 800);
          return result;
        };
      }
    }
    patchIntelFns();
    setTimeout(patchIntelFns, 1500);

    // Utility: send text to Oracle chat input and fire sendChat
    // ── Shared low-level query: find AI-message elements in the chat container ──
    // ── Both contentRepurpose's dropdown and conidPot's save-button injector    ──
    // ── independently re-implemented this exact DOM lookup. Consolidated here.  ──
    RPGACE.utils.getOracleMessageElements = function() {
      var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
      if (!chatBox) return [];
      var children = Array.from(chatBox.children);
      return children.filter(function(el) {
        var cls = el.className || '';
        var txt = el.textContent.trim();
        if (txt.length < 40) return false;
        return cls.includes('ai') || cls.includes('assistant') || cls.includes('oracle') ||
               cls.includes('response') || cls.includes('bot') ||
               el.querySelector('[class*="assistant"]') || el.querySelector('[class*="ai"]');
      });
    };

    // Aug 6 (Engineer pass, real Content Pipeline bugfix) — now returns
    // whether the send actually went through (true) or was blocked by the
    // in-flight guard (false), so callers that arm a one-shot response
    // capture right before/after calling this can skip arming it on a
    // blocked send instead of leaving it dangling. See scheduleOracle's
    // sendChat wrap (real root-cause comment there) for the full evidence.
    RPGACE.utils.sendToOracle = function(text) {
      var input = document.querySelector('#chat-input');
      if (!input) return false;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof sendChat === 'function') {
        return sendChat() !== false;
      } else {
        var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
        if (btn) btn.click();
        return true; // can't observe the guard via a raw click - best-effort, unchanged from prior behaviour
      }
    };

    // Aug 22 (real Alex ask, screenshot evidence) — the Oracle Mode
    // switch/badge/Scouted button/oracleProviderMode switch were all
    // rendering on the LOGIN GATE screen itself, before any real
    // authentication, since they're all registerBootTask injections
    // (fire at module-init time regardless of login state) - nothing
    // ever gated their visibility on real login. Real, shared fix (rule
    // 8 - 4 real creation sites, one helper, not 4 copies): hide an
    // element until 'rpgace:login' actually fires (which it always
    // does exactly once on a genuine successful login - confirmed via
    // direct read of authGate/checkPassword, no session-persistence
    // path skips it, so this can never get stuck hidden). A no-op if
    // login has already happened by the time this runs (a mode badge
    // created after the fact, e.g. toggling modes mid-session).
    RPGACE.utils.hideUntilLogin = function(el) {
      if (!el) return;
      var gate = document.getElementById('gate');
      var stillGated = gate && gate.style.display !== 'none';
      if (!stillGated) return;
      el.style.visibility = 'hidden';
      var off = RPGACE.hooks.on('rpgace:login', function() {
        el.style.visibility = '';
        off();
      });
    };

    // Aug 22 (real Alex ask, screenshot evidence: "too clunky... needs an
    // impeccable and emil kowalski ui redesign to make it not stand out
    // in an awful manner") — mockOracle's Oracle Mode switch, its own
    // Scouted button, and oracleProviderMode's separate switch were 3
    // independently-styled floating pills stacked at magic-number top
    // offsets (10px/44px/78px), each with its own box-shadow/border/
    // radius — literally 3 different debug widgets bolted onto the same
    // corner across 3 separate builds, exactly as clunky as it looked.
    // Real, consistency-driven fix, cross-module (mockOracle +
    // oracleProviderMode are separate modules; a shared container in
    // RPGACE.utils, created idempotently by whichever module runs
    // first, is the correct shape - rule 8, one container not two
    // copies): one calm dark panel (matching RPGACE.utils.toast's own
    // established #0f0f18/thin-border/colored-text treatment, NOT a
    // separately-invented style), rows separated by a hairline divider
    // instead of separate boxes/shadows.
    // Aug 22 (2nd redesign pass, real Alex ask: "hide the scouted button
    // and dummy/fallback/api pill and local pill to be hidden behind a
    // pressable button on the dummy oracle banner") — starts hidden by
    // default now (was always `display:flex`); mockOracle's own bar
    // toggle button reveals it and sets a real `top` matching the bar's
    // own measured height at reveal time, since it no longer has a
    // fixed top:10px of its own (the permanent bar now owns that space).
    RPGACE.utils.getDevStatusCluster = function() {
      var el = document.getElementById('rpg-dev-cluster');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'rpg-dev-cluster';
      el.style.cssText = 'position:fixed;right:10px;z-index:999999;display:none;flex-direction:column;background:#0f0f18;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,.4);overflow:hidden;font-family:Rajdhani,sans-serif;user-select:none;';
      document.body.appendChild(el);
      RPGACE.utils.hideUntilLogin(el);
      return el;
    };
    RPGACE.utils.addClusterRow = function(rowEl) {
      var cluster = RPGACE.utils.getDevStatusCluster();
      if (cluster.children.length) {
        var divider = document.createElement('div');
        divider.style.cssText = 'height:1px;background:rgba(255,255,255,0.08);flex-shrink:0;';
        cluster.appendChild(divider);
      }
      rowEl.style.padding = '6px 12px';
      cluster.appendChild(rowEl);
      return cluster;
    };

    // ── Shared phylum display helpers — single source of truth for how a  ──
    // ── phylum's name is shown, everywhere it's shown: short UI labels    ──
    // ── use phylumLabel() (Latin + English in brackets), anything sent to ──
    // ── Oracle uses phylumContext() (adds the one-line purpose too, so    ──
    // ── the model is reminded what the phylum is actually for). Both read ──
    // ── taxonomyTree's PHYLUM_NAMES/PHYLUM_ENGLISH/PHYLUM_PURPOSE at call  ──
    // ── time rather than duplicating the data here.                       ──
    RPGACE.utils.phylumLabel = function(num) {
      var tt = RPGACE.modules.taxonomyTree;
      var lat = (tt && tt.PHYLUM_NAMES[num]) || 'Unknown';
      var eng = (tt && tt.PHYLUM_ENGLISH[num]) || '';
      return 'Phylum ' + num + ' — ' + lat + (eng ? ' (' + eng + ')' : '');
    };
    RPGACE.utils.phylumContext = function(num) {
      var tt = RPGACE.modules.taxonomyTree;
      var lat = (tt && tt.PHYLUM_NAMES[num]) || 'Unknown';
      var eng = (tt && tt.PHYLUM_ENGLISH[num]) || '';
      var purpose = (tt && tt.PHYLUM_PURPOSE[num]) || '';
      return 'Phylum ' + num + ' — ' + lat + (eng ? ' (' + eng + ')' : '') + (purpose ? '. Purpose: ' + purpose : '');
    };

    // ── Global phyla-scan observer — attached ONCE at init, independent of  ──
    // ── sendToOracle. Catches direct typing (sendChat/sendChatWithImage)   ──
    // ── AND panel-injected prompts, since both flip #send-btn's disabled   ──
    // ── attribute through the same underlying sendChat() call.            ──
    RPGACE.utils._initPhylaObserver = function() {
      if (RPGACE.utils._phylaObserverActive) return;
      var sendBtn = document.querySelector('#send-btn');
      if (!sendBtn) { setTimeout(RPGACE.utils._initPhylaObserver, 1000); return; }
      RPGACE.utils._phylaObserverActive = true;
      var obs = new MutationObserver(function(muts) {
        muts.forEach(function(m) {
          if (m.attributeName === 'disabled' && !sendBtn.disabled) {
            setTimeout(function() { RPGACE.utils._runPhylaScan(); }, 50);
          }
        });
      });
      obs.observe(sendBtn, { attributes: true });
      console.log('[RPGACE] Global phyla-scan observer attached to #send-btn');
    };

    // ── Layer 1: cheap local keyword scan, always runs ──────────────
    // F8: formal redesign, replacing the flat keyword-list/raw-count model.
    // Three concrete problems fixed:
    //   1. Only 14 of 21 phyla had any keywords at all (11,15,17-21 could
    //      never be silently matched by anything, no matter how relevant).
    //   2. Every keyword counted equally - "sidechain" (near-unique to
    //      Mixtura) and "style" (generic, shows up everywhere) both scored
    //      1 point. Now {term, weight}: 2 = specific/rare outside this
    //      phylum, 1 = generic/could plausibly appear in several.
    //   3. Naive substring match (`text.includes(k)`) false-positived on
    //      short terms inside unrelated words - "key" matched "monkey",
    //      "turkey", "keyword". Now word-boundary regex matching.
    // Also found and fixed a real overlap: 14 (Visio Cinematica) and the
    // new 11 (Lingua Musicae, colour/mood/visual language) both claimed
    // "colour" and "mood board" - kept 14 to concrete filmmaking-production
    // terms, 11 to abstract aesthetic/branding terms.
    // 21 (Miscellaneous) deliberately has NO keywords - it's the catch-all
    // for "doesn't fit anywhere else"; giving it keywords would mean the
    // scanner could match on it exactly when it shouldn't.
    RPGACE.utils._PHYLA_KEYWORDS = [
      { num: 1,  name: 'Compositio',           keywords: [
        // core (pre-existing)
        {t:'melody',w:2},{t:'chord progression',w:2},{t:'harmony',w:2},{t:'chord',w:1},{t:'scale',w:1},{t:'key change',w:2},{t:'notes',w:1},
        // scales & modes — July 14 jargon enrichment, pilot phylum for Phylum Path
        {t:'mode',w:1},{t:'minor scale',w:2},{t:'major scale',w:2},{t:'natural minor',w:2},{t:'harmonic minor',w:2},{t:'melodic minor',w:2},
        {t:'dorian',w:2},{t:'phrygian',w:2},{t:'lydian',w:2},{t:'mixolydian',w:2},{t:'locrian',w:2},{t:'pentatonic',w:2},{t:'minor pentatonic',w:2},
        {t:'major pentatonic',w:2},{t:'blues scale',w:2},{t:'chromatic',w:2},{t:'diatonic',w:2},{t:'modal interchange',w:2},{t:'borrowed chord',w:2},
        {t:'key signature',w:2},{t:'relative minor',w:2},{t:'relative major',w:2},{t:'parallel minor',w:2},
        // chord types & qualities
        {t:'triad',w:2},{t:'major chord',w:2},{t:'minor chord',w:2},{t:'diminished chord',w:2},{t:'augmented chord',w:2},{t:'seventh chord',w:2},
        {t:'maj7',w:2},{t:'min7',w:2},{t:'dominant 7',w:2},{t:'sus2',w:2},{t:'sus4',w:2},{t:'add9',w:2},{t:'sixth chord',w:2},{t:'ninth chord',w:2},
        {t:'eleventh chord',w:2},{t:'thirteenth chord',w:2},{t:'power chord',w:2},{t:'inversion',w:1},{t:'voicing',w:1},{t:'chord voicing',w:2},
        {t:'close voicing',w:2},{t:'open voicing',w:2},{t:'drop voicing',w:2},
        // progressions & harmonic function
        {t:'progression',w:1},{t:'cadence',w:2},{t:'resolution',w:1},{t:'tension',w:1},{t:'i-iv-v',w:2},{t:'ii-v-i',w:2},{t:'circle of fifths',w:2},
        {t:'tonic',w:2},{t:'subdominant',w:2},{t:'dominant',w:1},{t:'submediant',w:2},{t:'leading tone',w:2},{t:'root note',w:2},{t:'root position',w:2},
        {t:'harmonic function',w:2},{t:'chord function',w:2},{t:'modulation',w:2},{t:'pivot chord',w:2},
        // melody construction
        {t:'melodic line',w:2},{t:'hook',w:1},{t:'top line',w:2},{t:'lead melody',w:2},{t:'counter melody',w:2},{t:'melodic motif',w:2},{t:'motif',w:1},
        {t:'phrase',w:1},{t:'melodic phrase',w:2},{t:'call and response',w:2},{t:'melodic contour',w:2},{t:'stepwise motion',w:2},{t:'leap',w:1},
        {t:'passing tone',w:2},{t:'neighbor tone',w:2},{t:'ornamentation',w:2},{t:'melodic development',w:2},{t:'riff',w:1},{t:'lick',w:1},
        // harmony (deeper)
        {t:'harmonic',w:1},{t:'harmonization',w:2},{t:'counterpoint',w:2},{t:'voice leading',w:2},{t:'chord tone',w:2},{t:'non-chord tone',w:2},
        {t:'suspension',w:1},{t:'pedal tone',w:2},{t:'drone',w:1},{t:'harmonic rhythm',w:2},{t:'chord extension',w:2},{t:'chord substitution',w:2},
        {t:'tritone substitution',w:2},{t:'secondary dominant',w:2},
        // intervals
        {t:'interval',w:1},{t:'semitone',w:2},{t:'whole tone',w:2},{t:'minor third',w:2},{t:'major third',w:2},{t:'perfect fifth',w:2},
        {t:'perfect fourth',w:2},{t:'minor seventh',w:2},{t:'major seventh',w:2},{t:'octave',w:1},{t:'unison',w:1},
        // genre/production jargon (UK rap/drill)
        {t:'type beat melody',w:2},{t:'sample flip',w:1},{t:'chord loop',w:2},{t:'piano loop',w:2},{t:'string melody',w:2},{t:'pluck melody',w:2},
        {t:'melodic trap',w:2},{t:'dark melody',w:2},{t:'eerie melody',w:2},{t:'haunting chords',w:2},{t:'minor key melody',w:2},{t:'sad piano',w:2},
        {t:'emotional chords',w:2},{t:'drill melody',w:2},{t:'uk drill piano',w:2},{t:'8-bar loop',w:1},{t:'melodic hook',w:2},{t:'vocal chop melody',w:2},
        // DAW/FL Studio-specific
        {t:'piano roll',w:2},{t:'scale helper',w:2},{t:'chord stamp',w:2},{t:'arpeggiator',w:2},{t:'midi chord',w:2},{t:'chord progression generator',w:2},{t:'scale snap',w:2},
      ] },
      { num: 2,  name: 'Percussio',             keywords: [
        // Drum Elements — July 16/17 rework, merging a GODMODE+Council-of-5
        // pass (done in a separate RPGACE Python-side project) with the
        // original July 16 sweep, same 7-category shape as Phylum 1's list.
        {t:'kick',w:2},{t:'snare',w:2},{t:'hi-hat',w:2},{t:'hihat',w:2},{t:'open hat',w:2},{t:'closed hat',w:2},{t:'clap',w:2},{t:'rim shot',w:2},
        {t:'rimshot',w:1},{t:'tom',w:1},{t:'crash',w:1},{t:'ride',w:1},{t:'shaker',w:1},{t:'tambourine',w:1},{t:'percussion',w:1},{t:'perc',w:1},
        {t:'cowbell',w:1},{t:'snap',w:1},{t:'clave',w:1},{t:'bongo',w:1},{t:'conga',w:1},{t:'kick drum',w:2},{t:'snare drum',w:2},{t:'drum bus',w:1},
        {t:'drum rack',w:2},{t:'drum kit',w:1},
        // 808s & Bass Percussion
        {t:'808',w:2},{t:'sub bass',w:2},{t:'808 bass',w:2},{t:'808 slide',w:2},{t:'808 glide',w:2},{t:'808 pattern',w:2},{t:'808 melody',w:2},
        {t:'sub',w:1},{t:'bass hit',w:2},{t:'distorted 808',w:2},{t:'808 tuning',w:2},{t:'glide',w:1},{t:'portamento',w:2},{t:'808 kick',w:2},
        {t:'layered 808',w:2},{t:'808 bend',w:2},{t:'sliding 808',w:2},{t:'808 pitch',w:2},{t:'808 pitch bend',w:2},{t:'808 mute',w:2},
        {t:'808 distortion',w:2},{t:'808 saturation',w:2},{t:'808 drive',w:2},{t:'808 clip',w:2},{t:'808 layering',w:2},{t:'808 stack',w:2},
        {t:'sub layer',w:2},{t:'808 tail',w:2},{t:'808 decay',w:2},{t:'808 length',w:2},{t:'808 note length',w:2},
        // Rhythm & Pattern Construction
        {t:'groove',w:1},{t:'drum pattern',w:2},{t:'rhythm',w:1},{t:'rhythmic pattern',w:2},{t:'beat pattern',w:2},{t:'drum programming',w:2},
        {t:'sequencing',w:1},{t:'step sequencer',w:2},{t:'drum loop',w:2},{t:'break',w:1},{t:'breakbeat',w:2},{t:'syncopation',w:2},{t:'swing',w:1},
        {t:'shuffle',w:1},{t:'quantize',w:1},{t:'quantization',w:2},{t:'humanize',w:1},{t:'velocity',w:1},{t:'ghost note',w:2},{t:'drum fill',w:2},
        {t:'hi-hat roll',w:2},{t:'triplet roll',w:2},{t:'ratchet',w:1},{t:'hi-hat ratchet',w:2},{t:'stutter',w:1},
        {t:'drum stutter',w:2},{t:'pocket',w:1},{t:'groove percentage',w:2},{t:'rhythmic displacement',w:2},{t:'snare roll',w:2},{t:'kick roll',w:2},
        {t:'syncopated kick',w:2},{t:'four on the floor',w:2},{t:'kick-808 interlock',w:2},{t:'ruff',w:1},{t:'buildup',w:1},{t:'riser',w:1},
        {t:'transition fill',w:2},{t:'breakdown',w:1},{t:'groove template',w:2},{t:'micro-timing',w:2},{t:'timing',w:1},{t:'straight groove',w:2},
        {t:'shuffle groove',w:2},{t:'kick placement',w:2},{t:'snare placement',w:2},{t:'clap placement',w:2},{t:'hi-hat triplets',w:2},
        {t:'stutter hats',w:2},{t:'hat roll',w:2},{t:'hat automation',w:2},{t:'velocity automation',w:2},{t:'rolled hats',w:2},{t:'hi-hat swing',w:2},
        {t:'hi-hat velocity',w:2},
        // Time Signature & Subdivision
        {t:'tempo',w:1},{t:'bpm',w:1},{t:'time signature',w:2},{t:'4/4',w:1},{t:'triplet',w:1},{t:'sixteenth note',w:2},{t:'eighth note',w:2},
        {t:'subdivision',w:2},{t:'polyrhythm',w:2},{t:'cross-rhythm',w:2},{t:'half-time',w:2},{t:'double-time',w:2},{t:'on the beat',w:1},
        {t:'off the beat',w:1},{t:'upbeat',w:1},{t:'downbeat',w:1},{t:'backbeat',w:2},{t:'quarter note',w:2},{t:'half-time feel',w:2},
        {t:'sixteenth note grid',w:2},{t:'triplet feel',w:2},{t:'bar',w:1},{t:'beat',w:1},
        // Genre-Specific / UK Drill & Trap Jargon
        {t:'drill pattern',w:2},{t:'uk drill drums',w:2},{t:'drill hi-hats',w:2},{t:'triplet hats',w:2},{t:'drill snare',w:2},
        {t:'gunshot snare',w:2},{t:'trap hats',w:2},{t:'hi-hat pattern',w:2},{t:'drill beat',w:2},{t:'sample drums',w:2},{t:'boom bap drums',w:2},
        {t:'one-shot',w:1},{t:'drum one-shot',w:2},{t:'drum sample pack',w:2},{t:'drum kit pack',w:2},{t:'vintage drums',w:2},{t:'dusty drums',w:2},
        {t:'mpc swing',w:2},{t:'drill groove',w:2},{t:'drill clap',w:2},{t:'drill kick pattern',w:2},{t:'chicago drill',w:2},{t:'brooklyn drill',w:2},
        {t:'trap 808',w:2},{t:'trap snare roll',w:2},{t:'trap drum pattern',w:2},{t:'afrobeats drums',w:2},{t:'amapiano drums',w:2},
        {t:'uk garage drums',w:2},{t:'grime drums',w:2},{t:'trap hi-hats',w:2},
        // Mixing/Processing Percussion
        {t:'drum bus compression',w:2},{t:'transient',w:1},{t:'transient shaper',w:2},{t:'punch',w:1},{t:'drum layering',w:2},
        {t:'layering drums',w:2},{t:'sidechain',w:1},{t:'sidechain compression',w:2},{t:'drum saturation',w:2},{t:'drum eq',w:2},
        {t:'drum tuning',w:2},{t:'pitched drums',w:2},{t:'drum reverb',w:2},{t:'drum room',w:2},{t:'parallel compression',w:2},{t:'thump',w:1},
        {t:'attack',w:1},
        // DAW/FL Studio-specific
        {t:'fpc',w:2},{t:'fruity slicer',w:2},{t:'piano roll drums',w:2},{t:'channel rack',w:2},{t:'drum grid',w:2},{t:'sample slicing',w:2},
        {t:'chop drums',w:2},{t:'drum layering rack',w:2},{t:'playlist pattern',w:2},{t:'midi drum programming',w:2},{t:'drum sequencer',w:2},
      ] },
      { num: 3,  name: 'Sonus Designatio',      keywords: [
        // Synthesis Fundamentals — July 17, second Phylum Development
        // Framework pass, same 7/8-category shape as Phylum 1/2's lists,
        // merging a GODMODE+Council-of-5 pass from the separate RPGACE
        // Python project with the original 7 seed terms.
        {t:'synth',w:2},{t:'synthesizer',w:2},{t:'oscillator',w:2},{t:'osc',w:1},{t:'waveform',w:2},{t:'sine wave',w:2},{t:'saw wave',w:2},
        {t:'square wave',w:2},{t:'triangle wave',w:2},{t:'noise',w:1},{t:'white noise',w:2},{t:'pink noise',w:2},{t:'wavetable',w:2},
        {t:'wavetable synthesis',w:2},{t:'subtractive synthesis',w:2},{t:'additive synthesis',w:2},{t:'fm synthesis',w:2},{t:'frequency modulation',w:2},
        {t:'phase modulation',w:2},{t:'granular synthesis',w:2},{t:'physical modeling',w:2},
        // Synth Parameters
        {t:'filter',w:1},{t:'low pass filter',w:2},{t:'lpf',w:2},{t:'high pass filter',w:2},{t:'hpf',w:2},{t:'band pass filter',w:2},
        {t:'filter cutoff',w:2},{t:'resonance',w:2},{t:'filter envelope',w:2},{t:'adsr',w:2},{t:'attack',w:1},{t:'decay',w:1},{t:'sustain',w:1},
        {t:'release',w:1},{t:'envelope',w:1},{t:'lfo',w:2},{t:'low frequency oscillator',w:2},{t:'modulation',w:1},{t:'mod wheel',w:2},
        {t:'pitch bend',w:2},{t:'unison',w:2},{t:'detune',w:2},{t:'voice',w:1},{t:'polyphony',w:2},{t:'monophony',w:2},{t:'glide',w:1},
        {t:'portamento',w:2},
        // Sound Design Techniques
        {t:'sound design',w:2},{t:'patch',w:1},{t:'preset',w:1},{t:'sound sculpting',w:2},{t:'layering',w:1},{t:'sound layering',w:2},
        {t:'texture',w:1},{t:'sonic texture',w:2},{t:'timbre',w:2},{t:'tone shaping',w:2},{t:'resynthesis',w:2},{t:'sound morphing',w:2},
        {t:'wavetable morphing',w:2},{t:'vector synthesis',w:2},{t:'cross-modulation',w:2},
        // Sampling
        {t:'sample',w:1},{t:'sampling',w:1},{t:'sample chop',w:2},{t:'chopping',w:1},{t:'sample flip',w:2},{t:'flip',w:1},
        {t:'sample manipulation',w:2},{t:'time stretch',w:2},{t:'time stretching',w:2},{t:'pitch shift',w:2},{t:'pitch shifting',w:2},
        {t:'resample',w:2},{t:'resampling',w:2},{t:'one-shot',w:1},{t:'one-shot sample',w:2},{t:'sample pack',w:2},{t:'loop',w:1},
        {t:'sample loop',w:2},{t:'vinyl sample',w:2},{t:'dusty sample',w:2},{t:'sample library',w:2},{t:'royalty free sample',w:2},
        {t:'sample clearance',w:2},{t:'sample layering',w:2},
        // Effects & Processing
        {t:'reverb',w:1},{t:'delay',w:1},{t:'chorus',w:1},{t:'flanger',w:1},{t:'phaser',w:1},{t:'distortion',w:1},{t:'bitcrush',w:2},
        {t:'bit crusher',w:2},{t:'saturation',w:1},{t:'tape saturation',w:2},{t:'vinyl crackle',w:2},{t:'lo-fi effect',w:2},{t:'degrade',w:1},
        {t:'degradation',w:1},{t:'filter sweep',w:2},{t:'riser',w:1},{t:'downlifter',w:2},{t:'impact',w:1},{t:'whoosh',w:1},
        {t:'transition effect',w:2},
        // Textural & Atmospheric Elements
        {t:'pad',w:1},{t:'ambient pad',w:2},{t:'drone',w:1},{t:'atmosphere',w:1},{t:'texture layer',w:2},{t:'background texture',w:2},
        {t:'sound bed',w:2},{t:'foley',w:1},{t:'field recording',w:2},{t:'found sound',w:2},{t:'vocal chop',w:2},{t:'vocal texture',w:2},
        {t:'choir stab',w:2},{t:'string stab',w:2},{t:'orchestral hit',w:2},
        // Genre-Specific / UK Drill & Trap Jargon
        {t:'dark synth',w:2},{t:'eerie synth',w:2},{t:'haunting pad',w:2},{t:'drill lead',w:2},{t:'trap lead',w:2},{t:'plucky synth',w:2},
        {t:'pluck',w:1},{t:'arp',w:1},{t:'arpeggio',w:2},{t:'arpeggiated synth',w:2},{t:'cinematic synth',w:2},{t:'evil synth',w:2},
        {t:'distorted synth',w:2},{t:'sub synth',w:2},{t:'808 synth layer',w:2},
        // DAW/FL Studio & Plugin-specific
        {t:'sytrus',w:2},{t:'harmor',w:2},{t:'3xosc',w:2},{t:'serum',w:2},{t:'massive',w:2},{t:'vital',w:2},{t:'slicex',w:2},
        {t:'wavetable editor',w:2},{t:'granulizer',w:2},{t:'sakura',w:2},{t:'directwave',w:2},{t:'sampler',w:1},{t:'chop editor',w:2},
      ] },
      { num: 4,  name: 'Mixtura',               keywords: [
        // Gain Staging & Levels — July 17, third Phylum Development
        // Framework pass, same 8-category shape as Phylum 1/2/3's lists.
        {t:'mixing',w:2},{t:'gain',w:1},{t:'gain staging',w:2},{t:'level',w:1},{t:'headroom',w:2},{t:'unity gain',w:2},{t:'fader',w:1},
        {t:'fader level',w:2},{t:'volume automation',w:2},{t:'trim',w:1},{t:'input gain',w:2},{t:'output gain',w:2},{t:'clipping',w:1},
        {t:'peak',w:1},{t:'peak level',w:2},{t:'rms',w:2},{t:'loudness',w:1},{t:'lufs',w:2},{t:'true peak',w:2},
        // EQ
        {t:'eq',w:2},{t:'equalization',w:2},{t:'equalizer',w:1},{t:'parametric eq',w:2},{t:'graphic eq',w:2},{t:'high pass filter',w:2},
        {t:'low pass filter',w:2},{t:'shelf',w:1},{t:'shelving',w:2},{t:'bell curve',w:2},{t:'notch filter',w:2},{t:'boost',w:1},{t:'cut',w:1},
        {t:'frequency',w:1},{t:'frequency band',w:2},{t:'low end',w:2},{t:'low mids',w:2},{t:'high mids',w:2},{t:'high end',w:2},
        {t:'presence',w:1},{t:'air',w:1},{t:'mud',w:1},{t:'muddiness',w:2},{t:'boxiness',w:2},{t:'harshness',w:2},{t:'sibilance',w:2},
        {t:'resonant frequency',w:2},{t:'bandwidth',w:2},
        // Compression
        {t:'compress',w:2},{t:'compressor',w:2},{t:'threshold',w:1},{t:'ratio',w:1},{t:'attack time',w:2},{t:'release time',w:2},
        {t:'knee',w:1},{t:'soft knee',w:2},{t:'hard knee',w:2},{t:'makeup gain',w:2},{t:'sidechain',w:2},{t:'sidechain compression',w:2},
        {t:'sidechaining',w:2},{t:'parallel compression',w:2},{t:'multiband compression',w:2},{t:'limiter',w:1},{t:'limiting',w:1},
        {t:'brickwall limiter',w:2},{t:'transient',w:1},{t:'transient shaping',w:2},{t:'glue compression',w:2},{t:'bus compression',w:2},
        {t:'vca compression',w:2},{t:'optical compression',w:2},{t:'fet compression',w:2},
        // Spatial & Stereo Processing
        {t:'panning',w:1},{t:'stereo width',w:2},{t:'stereo imaging',w:2},{t:'mono compatibility',w:2},{t:'phase',w:1},
        {t:'phase cancellation',w:2},{t:'phase alignment',w:2},{t:'mid-side processing',w:2},{t:'haas effect',w:2},{t:'stereo widener',w:2},
        {t:'correlation',w:1},{t:'stereo field',w:2},
        // Reverb & Delay in Mix Context
        {t:'reverb',w:1},{t:'reverb send',w:2},{t:'wet/dry',w:2},{t:'pre-delay',w:2},{t:'decay time',w:2},{t:'room reverb',w:2},
        {t:'plate reverb',w:2},{t:'hall reverb',w:2},{t:'delay',w:1},{t:'delay throw',w:2},{t:'echo',w:1},{t:'slapback delay',w:2},
        {t:'ducking delay',w:2},{t:'tempo-synced delay',w:2},
        // Mix Bus & Signal Flow
        {t:'mix bus',w:2},{t:'master bus',w:2},{t:'bus routing',w:2},{t:'send',w:1},{t:'return',w:1},{t:'aux',w:1},
        {t:'auxiliary track',w:2},{t:'insert',w:1},{t:'insert effect',w:2},{t:'signal chain',w:2},{t:'signal flow',w:2},
        {t:'gain reduction',w:2},{t:'vu meter',w:2},{t:'spectrum analyzer',w:2},{t:'metering',w:1},
        // Balance & Space
        {t:'mix balance',w:2},{t:'frequency masking',w:2},{t:'masking',w:1},{t:'carving space',w:2},{t:'eq carving',w:2},
        {t:'ducking',w:1},{t:'sidechain ducking',w:2},{t:'layering in the mix',w:2},{t:'mix clarity',w:2},{t:'mix depth',w:2},
        {t:'front-to-back depth',w:2},{t:'width vs depth',w:2},
        // Genre-Specific / UK Drill & Trap Mixing
        // (loudness war / streaming loudness target deliberately live in
        // Magistra only, not here - July 17 explicit-overlap decision:
        // those are final-delivery/mastering-stage concerns, not mixing
        // ones, even though the original draft list included both here.)
        {t:'drill mix',w:2},{t:'trap mix',w:2},{t:'808 glue',w:2},{t:'vocal sit',w:2},{t:'vocal pocket',w:2},{t:'beat pocket',w:2},
        {t:'hi-hat clarity',w:2},{t:'kick and 808 relationship',w:2},{t:'mix reference',w:2},{t:'reference track',w:2},
        // DAW/FL Studio & Plugin-specific
        {t:'fruity parametric eq 2',w:2},{t:'fruity limiter',w:2},{t:'fruity compressor',w:2},{t:'maximus',w:2},
        {t:'fruity multiband compressor',w:2},{t:'fruity balance',w:2},{t:'mixer insert',w:2},{t:'mixer channel',w:2},{t:'fl mixer',w:2},
        {t:'pro-q',w:2},{t:'pro-c',w:2},{t:'pro-l',w:2},{t:'ott',w:2},{t:'klanghelm mjuc',w:2},
      ] },
      { num: 5,  name: 'Magistra',              keywords: [
        // Mastering Fundamentals — July 17, fifth Phylum Development
        // Framework pass. Deliberately qualifies almost every term shared
        // with Mixtura (EQ/compression/limiting) with "mastering" as a
        // prefix rather than duplicating Mixtura's bare terms wholesale -
        // Magistra and Mixtura are still the heaviest overlap of any two
        // phyla (mastering is downstream of mixing, so real vocabulary
        // legitimately spans both), but this keeps Magistra's own list
        // focused on mastering-specific escalations, not a copy of Mixtura.
        {t:'mastering',w:2},{t:'master',w:2},{t:'master chain',w:2},{t:'mastering chain',w:2},{t:'final mix',w:2},{t:'pre-master',w:2},
        {t:'mastering engineer',w:2},{t:'mastering session',w:2},{t:'reference master',w:2},{t:'master bus processing',w:2},
        {t:'mastering signal flow',w:2},
        // Loudness & Metering
        {t:'loudness',w:2},{t:'lufs',w:2},{t:'integrated lufs',w:2},{t:'short-term lufs',w:2},{t:'momentary lufs',w:2},{t:'true peak',w:2},
        {t:'dbtp',w:2},{t:'rms',w:2},{t:'loudness normalization',w:2},{t:'loudness war',w:2},{t:'streaming loudness target',w:2},
        {t:'spotify loudness',w:2},{t:'apple music loudness',w:2},{t:'youtube loudness',w:2},{t:'loudness matching',w:2},
        {t:'perceived loudness',w:2},{t:'headroom',w:2},{t:'ceiling',w:1},
        // Limiting
        {t:'limiter',w:2},{t:'limiting',w:1},{t:'brickwall limiter',w:2},{t:'master limiter',w:2},{t:'lookahead',w:1},
        {t:'lookahead limiting',w:2},{t:'transparent limiting',w:2},{t:'limiting artifacts',w:2},{t:'pumping',w:1},{t:'isp',w:2},
        {t:'inter-sample peak',w:2},{t:'clip protection',w:2},{t:'soft clipping',w:2},{t:'hard clipping',w:2},
        // Mastering EQ
        {t:'mastering eq',w:2},{t:'linear phase eq',w:2},{t:'tonal balance',w:2},{t:'tonal correction',w:2},{t:'low end control',w:2},
        {t:'high end sheen',w:2},{t:'master eq curve',w:2},{t:'subtractive mastering eq',w:2},{t:'broad strokes eq',w:2},
        {t:'surgical eq',w:2},{t:'frequency balance',w:2},
        // Mastering Compression
        {t:'mastering compression',w:2},{t:'glue compression',w:2},{t:'multiband mastering compression',w:2},{t:'gentle compression',w:2},
        {t:'mastering ratio',w:2},{t:'slow attack mastering',w:2},{t:'transparent compression',w:2},{t:'mastering bus glue',w:2},
        // Stereo & Width in Mastering
        {t:'mastering width',w:2},{t:'stereo enhancement',w:2},{t:'mid-side mastering',w:2},{t:'m/s eq',w:2},{t:'width automation',w:2},
        {t:'mono compatibility check',w:2},{t:'phase check',w:2},{t:'correlation meter',w:2},
        // Dynamics & Character
        {t:'dynamic range',w:2},{t:'dynamic range compression',w:2},{t:'dr value',w:2},{t:'punch retention',w:2},
        {t:'transient preservation',w:2},{t:'loudness vs dynamics tradeoff',w:2},{t:'mastering character',w:2},
        {t:'tape emulation mastering',w:2},{t:'analog warmth',w:2},{t:'digital mastering',w:2},{t:'hybrid mastering',w:2},
        // Export & Delivery
        {t:'export settings',w:2},{t:'bit depth',w:2},{t:'sample rate',w:2},{t:'dither',w:1},{t:'dithering',w:2},{t:'wav export',w:2},
        {t:'16-bit',w:2},{t:'24-bit',w:2},{t:'44.1khz',w:2},{t:'48khz',w:2},{t:'ddp',w:2},{t:'master file delivery',w:2},
        {t:'distributor loudness specs',w:2},{t:'platform-specific master',w:2},
        // Genre-Specific / UK Drill & Trap Mastering
        {t:'loud drill master',w:2},{t:'competitive loudness',w:2},{t:'streaming-ready master',w:2},{t:'club-ready master',w:2},
        {t:'radio-ready master',w:2},{t:'drill low end translation',w:2},{t:'808 translation across systems',w:2},
        {t:'phone speaker translation',w:2},{t:'car system translation',w:2},
        // DAW/FL Studio & Plugin-specific
        {t:'fruity limiter',w:2},{t:'maximus',w:2},{t:'ozone',w:2},{t:'fruity multiband compressor',w:2},{t:'mastering plugin chain',w:2},
        {t:'fruity stereo enhancer',w:2},{t:'lufs meter plugin',w:2},{t:'youlean loudness meter',w:2},
        {t:'stem',w:1},
      ] },
      { num: 6,  name: 'Instrumentarium',       keywords: [
        // FL Studio Core — July 17, fourth batch of the Phylum
        // Development Framework (phyla 6-10 built together).
        {t:'fl studio',w:2},{t:'piano roll',w:2},{t:'playlist',w:1},{t:'channel rack',w:2},{t:'mixer',w:1},{t:'browser',w:1},
        {t:'pattern',w:1},{t:'arrangement',w:1},{t:'project file',w:2},{t:'flp',w:2},{t:'step sequencer',w:2},{t:'automation clip',w:2},
        {t:'automation',w:1},{t:'playlist track',w:2},{t:'pattern block',w:2},
        // Plugin & VST Terminology
        {t:'vst',w:2},{t:'vst3',w:2},{t:'plugin',w:2},{t:'instrument plugin',w:2},{t:'effect plugin',w:2},{t:'generator',w:1},
        {t:'native plugin',w:2},{t:'third-party plugin',w:2},{t:'plugin chain',w:2},{t:'plugin delay compensation',w:2},{t:'pdc',w:2},
        {t:'plugin preset',w:2},{t:'plugin browser',w:2},{t:'wrapper',w:1},
        // Workflow & Efficiency
        {t:'workflow',w:1},{t:'template',w:1},{t:'project template',w:2},{t:'mixer routing',w:2},{t:'track routing',w:2},
        {t:'color coding',w:2},{t:'naming convention',w:2},{t:'keyboard shortcut',w:2},{t:'macro',w:1},{t:'macro control',w:2},
        {t:'performance mode',w:2},{t:'freeze track',w:2},{t:'render',w:1},{t:'bounce',w:1},{t:'stem export',w:2},
        {t:'project organization',w:2},
        // FL Studio Native Tools
        {t:'fpc',w:2},{t:'slicex',w:2},{t:'fruity slicer',w:2},{t:'sytrus',w:2},{t:'harmor',w:2},{t:'3xosc',w:2},{t:'sakura',w:2},
        {t:'directwave',w:2},{t:'edison',w:2},{t:'patcher',w:2},{t:'fruity formula controller',w:2},{t:'fruity lsd',w:2},
        {t:'fruity envelope controller',w:2},{t:'fruity x-y controller',w:2},{t:'newtone',w:2},{t:'vocodex',w:2},
        // Session & File Management
        {t:'save state',w:2},{t:'autosave',w:2},{t:'backup',w:1},{t:'project backup',w:2},{t:'sample browser',w:2},
        {t:'plugin database',w:2},{t:'plugin manager',w:2},{t:'vst scan',w:2},{t:'missing sample',w:2},{t:'relocate sample',w:2},
        {t:'project zip',w:2},{t:'flp to wav',w:2},
        // Hardware & Controllers
        {t:'midi controller',w:2},{t:'midi keyboard',w:2},{t:'midi mapping',w:2},{t:'controller mapping',w:2},{t:'audio interface',w:2},
        {t:'asio',w:2},{t:'buffer size',w:2},{t:'latency',w:1},{t:'sample rate setting',w:2},{t:'driver',w:1},{t:'midi cc',w:2},
        // Third-Party DAW Comparison Terms
        {t:'ableton',w:2},{t:'logic pro',w:2},{t:'pro tools',w:2},{t:'studio one',w:2},{t:'cross-daw workflow',w:2},{t:'daw-agnostic',w:2},
        // Genre-Specific / UK Drill & Trap Production Workflow
        {t:'type beat template',w:2},{t:'drill template',w:2},{t:'beat starter pack',w:2},{t:'drum kit import',w:2},
        {t:'sample pack organization',w:2},{t:'quick drum swap',w:2},{t:'fast workflow drill',w:2},
        {t:'daw',w:2},
      ] },
      { num: 7,  name: 'Sensus Auris',          keywords: [
        // Critical Listening Fundamentals
        {t:'critical listening',w:2},{t:'active listening',w:2},{t:'reference listening',w:2},{t:'ear training',w:2},
        {t:'frequency recognition',w:2},{t:'ear training exercise',w:2},{t:'listening environment',w:2},{t:'monitoring environment',w:2},
        {t:'room treatment',w:2},{t:'acoustic treatment',w:2},
        // Reference Track Practice
        {t:'reference track',w:2},{t:'a/b',w:2},{t:'a/b comparison',w:2},{t:'a/b testing',w:2},{t:'gain matching',w:2},
        {t:'level matching',w:2},{t:'reference mix',w:2},{t:'commercial reference',w:2},{t:'genre reference',w:2},
        {t:'translation check',w:2},{t:'mix translation',w:2},
        // Monitoring
        {t:'monitor',w:1},{t:'speaker',w:1},{t:'studio monitor',w:2},{t:'monitor calibration',w:2},{t:'near-field monitor',w:2},
        {t:'headphone mixing',w:2},{t:'monitor controller',w:2},{t:'flat response',w:2},{t:'monitor placement',w:2},{t:'sweet spot',w:1},
        {t:'room mode',w:2},{t:'bass trap',w:2},
        // Listening Skills
        {t:'frequency identification',w:2},{t:'identifying muddiness',w:2},{t:'identifying harshness',w:2},{t:'identifying masking',w:2},
        {t:'spotting phase issues',w:2},{t:'spotting distortion',w:2},{t:'detecting clipping',w:2},{t:'detecting sibilance',w:2},
        {t:'dynamic range perception',w:2},{t:'stereo image perception',w:2},
        // Translation & Playback Systems
        {t:'car system check',w:2},{t:'phone speaker check',w:2},{t:'earbud check',w:2},{t:'club system check',w:2},
        {t:'multi-system translation',w:2},{t:'mono check',w:1},{t:'mono compatibility check',w:2},{t:'playback consistency',w:2},
        // Ear Fatigue & Practice
        {t:'ear fatigue',w:2},{t:'listening break',w:2},{t:'gain staging by ear',w:2},{t:'volume matched listening',w:2},
        {t:'blind listening test',w:2},{t:'critical listening session',w:2},{t:'daily ear training',w:2},
        // Genre-Specific / UK Drill & Trap Reference Practice
        {t:'drill reference track',w:2},{t:'trap reference track',w:2},{t:'uk rap reference',w:2},
        {t:'comparing to commercial drill releases',w:2},{t:'benchmark track',w:2},{t:'industry standard comparison',w:2},
      ] },
      { num: 8,  name: 'Anatomia',              keywords: [
        // Basic Theory
        {t:'music theory',w:2},{t:'notation',w:1},{t:'staff',w:1},{t:'clef',w:1},{t:'treble clef',w:2},{t:'bass clef',w:2},
        {t:'note value',w:2},{t:'rhythm notation',w:2},{t:'time signature',w:2},{t:'key signature',w:2},{t:'sharp',w:1},{t:'flat',w:1},
        {t:'natural',w:1},{t:'accidental',w:1},
        // Intervals
        {t:'interval',w:2},{t:'semitone',w:2},{t:'whole tone',w:2},{t:'minor second',w:2},{t:'major second',w:2},{t:'minor third',w:2},
        {t:'major third',w:2},{t:'perfect fourth',w:2},{t:'tritone',w:2},{t:'perfect fifth',w:2},{t:'minor sixth',w:2},
        {t:'major sixth',w:2},{t:'minor seventh',w:2},{t:'major seventh',w:2},{t:'octave',w:1},
        // Scales
        {t:'scale',w:1},{t:'major scale',w:2},{t:'minor scale',w:2},{t:'scale degree',w:2},{t:'tonic',w:2},{t:'supertonic',w:2},
        {t:'mediant',w:2},{t:'subdominant',w:2},{t:'dominant',w:1},{t:'submediant',w:2},{t:'leading tone',w:2},{t:'chromatic scale',w:2},
        {t:'whole tone scale',w:2},{t:'pentatonic scale',w:2},{t:'modes',w:1},
        // Chord Theory
        {t:'triad',w:2},{t:'chord construction',w:2},{t:'stacking thirds',w:2},{t:'chord quality',w:2},{t:'major triad',w:2},
        {t:'minor triad',w:2},{t:'diminished triad',w:2},{t:'augmented triad',w:2},{t:'seventh chord theory',w:2},
        {t:'chord inversion theory',w:2},{t:'roman numeral analysis',w:2},
        // Rhythm Theory
        {t:'beat',w:1},{t:'measure',w:1},{t:'bar',w:1},{t:'meter',w:1},{t:'simple meter',w:2},{t:'compound meter',w:2},
        {t:'syncopation theory',w:2},{t:'note duration',w:2},{t:'whole note',w:1},{t:'half note',w:1},{t:'quarter note',w:2},
        {t:'eighth note',w:2},{t:'sixteenth note',w:2},{t:'dotted note',w:2},{t:'tie',w:1},{t:'rest',w:1},
        // Harmonic Theory
        {t:'functional harmony',w:2},{t:'non-functional harmony',w:2},{t:'voice leading theory',w:2},{t:'counterpoint theory',w:2},
        {t:'cadence theory',w:2},{t:'perfect cadence',w:2},{t:'plagal cadence',w:2},{t:'deceptive cadence',w:2},{t:'half cadence',w:2},
        {t:'modulation theory',w:2},{t:'key relationships',w:2},
        // Ear/Theory Crossover
        {t:'solfege',w:2},{t:'relative pitch',w:2},{t:'perfect pitch',w:2},{t:'interval recognition',w:2},
        {t:'chord quality recognition',w:2},{t:'transcription',w:1},{t:'transcribing by ear',w:2},
        // Genre-Specific Theory Application
        {t:'theory applied to trap',w:2},{t:'theory applied to drill',w:2},{t:'minor key theory in rap',w:2},
        {t:'modal theory in hip hop production',w:2},
      ] },
      { num: 9,  name: 'Historia',              keywords: [
        // Producer Study
        {t:'producer history',w:2},{t:'producer discography',w:2},{t:'production style',w:2},{t:'signature sound',w:2},
        {t:'producer tag',w:2},{t:'producer influence',w:2},{t:'production era',w:2},{t:'production timeline',w:2},
        {t:'legacy producer',w:2},{t:'up-and-coming producer',w:2},
        // Historical Eras & Movements
        {t:'era',w:1},{t:'golden era hip hop',w:2},{t:'boom bap era',w:2},{t:'trap era',w:2},{t:'drill era',w:2},
        {t:'uk grime era',w:2},{t:'uk garage influence',w:2},{t:'afrobeats influence',w:2},{t:'sound evolution',w:2},
        {t:'genre evolution',w:2},{t:'regional sound',w:2},
        // Regional & Scene History
        {t:'uk drill history',w:2},{t:'chicago drill origin',w:2},{t:'new york drill',w:2},{t:'brooklyn drill',w:2},
        {t:'south london scene',w:2},{t:'north london scene',w:2},{t:'grime to drill lineage',w:2},{t:'road rap influence',w:2},
        // Artist & Producer Case Studies
        {t:'type beat study',w:2},{t:'artist sound study',w:2},{t:'artist discography breakdown',w:2},{t:'artist sonic signature',w:2},
        {t:'artist production evolution',w:2},{t:'collaborator history',w:2},{t:'frequent collaborator',w:2},{t:'in-house producer',w:2},
        // Sampling History
        {t:'sample history',w:2},{t:'sample origin',w:2},{t:'sampled record',w:2},{t:'original sample source',w:2},
        {t:'sample clearance history',w:2},{t:'interpolation',w:2},{t:'iconic sample',w:2},
        // Influence Mapping
        {t:'influence',w:1},{t:'influenced by',w:2},{t:'influence chain',w:2},{t:'sound lineage',w:2},{t:'stylistic descendant',w:2},
        {t:'genre crossover influence',w:2},{t:'cross-genre influence',w:2},{t:'pioneering producer',w:2},{t:'innovation in production',w:2},
        // Genre-Specific / UK Drill & Trap History
        {t:'sech drill sound',w:2},{t:'67 collective influence',w:2},{t:'harlem spartans era',w:2},{t:'drill pioneers',w:2},
        {t:'chicago to uk drill migration',w:2},{t:'metro boomin influence',w:2},{t:'southside influence',w:2},
        {t:'uk rap history timeline',w:2},
        {t:'sound like',w:2},{t:'inspired by',w:2},
      ] },
      { num: 10, name: 'Psychologia',           keywords: [
        // Creative Process
        {t:'creative process',w:2},{t:'creative block',w:2},{t:'writers block',w:2},{t:'producers block',w:2},{t:'inspiration',w:1},
        {t:'creative flow',w:2},{t:'flow state',w:2},{t:'getting in the zone',w:2},{t:'creative momentum',w:2},{t:'creative routine',w:2},
        // Motivation & Discipline
        {t:'motivation',w:1},{t:'discipline',w:1},{t:'consistency',w:1},{t:'creative consistency',w:2},{t:'habit formation',w:2},
        {t:'creative habit',w:2},{t:'daily practice',w:2},{t:'practice routine',w:2},{t:'accountability',w:1},
        {t:'creative goal setting',w:2},
        // Mindset
        {t:'mindset',w:1},{t:'growth mindset',w:2},{t:'fixed mindset',w:2},{t:'imposter syndrome',w:2},{t:'creative confidence',w:2},
        {t:'self-doubt',w:1},{t:'perfectionism',w:1},{t:'comparison trap',w:2},{t:'creative burnout',w:2},{t:'avoiding burnout',w:2},
        {t:'mental fatigue',w:2},
        // Focus & Environment
        {t:'deep work',w:2},{t:'focus session',w:2},{t:'distraction-free environment',w:2},{t:'creative environment',w:2},
        {t:'studio mindset',w:2},{t:'session preparation',w:2},{t:'pre-session ritual',w:2},{t:'warm-up routine',w:2},
        // Emotional Expression
        {t:'emotional expression in music',w:2},{t:'translating emotion to sound',w:2},{t:'mood-driven production',w:2},
        {t:'personal experience in music',w:2},{t:'authenticity',w:1},{t:'vulnerability in music',w:2},{t:'emotional honesty',w:2},
        // Collaboration Psychology
        {t:'creative collaboration',w:2},{t:'studio chemistry',w:2},{t:'ego in collaboration',w:2},{t:'feedback receptiveness',w:2},
        {t:'creative compromise',w:2},{t:'session energy',w:2},{t:'group creativity',w:2},
        // Career Psychology
        {t:'career longevity mindset',w:2},{t:'patience in music career',w:2},{t:'comparison to other producers',w:2},
        {t:'handling rejection',w:2},{t:'handling criticism',w:2},{t:'staying inspired long-term',w:2},
        {t:'avoiding creative stagnation',w:2},
        // Genre-Specific / Producer Mental Game
        {t:'staying authentic in drill',w:2},{t:'avoiding trend-chasing',w:2},{t:'finding your sound psychologically',w:2},
        {t:'confidence in a saturated genre',w:2},
        {t:'habit',w:1},{t:'routine',w:1},
      ] },
      // Engineer pass 2026-07-30 (Phylum 11+14 buildout, real content
      // provided by Alex) - substantially expanded from the July-era
      // placeholder list. Bare mood adjectives are correct HERE (P12's
      // own real subject matter), unlike P13 below. (Renumbered Aug 11:
      // this was num:11 before the phylum renumber, now num:12.)
      { num: 12, name: 'Lingua Musicae',        keywords: [
        {t:'colour palette',w:2},{t:'mood board',w:2},{t:'aesthetic',w:2},{t:'visual identity',w:2},{t:'vibe',w:1},{t:'tone',w:1},{t:'brand colours',w:2},
        {t:'sonic palette',w:2},{t:'sonic atmosphere',w:2},{t:'emotional tone',w:2},{t:'emotion-first production',w:2},{t:'sonic storytelling',w:2},
        {t:'moody',w:1},{t:'melancholic',w:1},{t:'euphoric',w:1},{t:'nostalgic',w:1},{t:'eerie',w:1},{t:'haunting',w:1},
        {t:'gritty',w:1},{t:'atmospheric',w:1},{t:'brooding',w:1},
        {t:'drill darkness',w:2},{t:'grimy atmosphere',w:2},{t:'cold uk sound',w:2},
        {t:'warmth (as feeling)',w:2},{t:'weight of a sound',w:2},
      ] },
      // Engineer pass 2026-08-11 (Alex's own real jargon-bucket content for
      // phyla 12-21, the same GODMODE+Council-of-5 discipline that built
      // 11/14 on July 30 — his own overlap-analysis flagged the real
      // collision risks below, honoured directly rather than re-derived:
      // "breakdown" (bare) is dangerously generic across 12/2/4, so kept
      // compound here ("technique breakdown"); "pitch" bare collides
      // between 15 (pitching yourself as a collaborator) and 16 (pitching
      // a beat for sale) — both kept as full compound phrases; "contract"/
      // "agreement" bare would collide between 16's lease agreements and
      // 17's general business contracts — 17's terms prefixed "business "
      // to stay the administrative/structural half, not the transaction-
      // specific one; "data"/"market"/"trend" (Alex's own flagged weak
      // discriminators for 19) kept compound ("market analytics," not
      // bare "data"); 20 deliberately excludes every DAW/plugin-name term
      // Alex's own analysis said belongs to 6 (Instrumentarium), the
      // single tightest-scoping pair he named.
      { num: 11, name: 'Fons Educationis',      keywords: [
        {t:'tutorial',w:2},{t:'walkthrough',w:1},{t:'step-by-step',w:1},{t:'beginner guide',w:2},{t:'masterclass',w:2},{t:'learning path',w:2},{t:'skill tree',w:2},
        {t:'technique breakdown',w:2},{t:'quick tip',w:1},{t:'pro tip',w:1},{t:'cheat sheet',w:2},{t:'common mistakes',w:1},{t:'mistakes to avoid',w:2},
        {t:'case study',w:1},{t:'simplified explanation',w:2},{t:'spaced repetition',w:2},{t:'practice exercise',w:1},{t:'learning curve',w:2},
      ] },
      { num: 14, name: 'Contentum',             keywords: [
        {t:'youtube',w:2},{t:'instagram',w:2},{t:'tiktok',w:2},{t:'reels',w:2},{t:'shorts',w:2},{t:'stories',w:1},{t:'carousel post',w:2},
        {t:'thumbnail',w:2},{t:'caption',w:1},{t:'hashtag',w:1},{t:'intro hook',w:2},{t:'watch time',w:2},{t:'retention rate',w:2},
        {t:'click-through rate',w:2},{t:'content calendar',w:2},{t:'content pillar',w:2},{t:'posting schedule',w:2},{t:'trending sound',w:2},
        {t:'trending audio',w:2},{t:'type beat video',w:2},{t:'beat showcase',w:2},{t:'producer vlog',w:2},{t:'behind the scenes',w:1},
      ] },
      // Engineer pass 2026-07-30 - "cinematic" (bare) and "neural frames"
      // both REMOVED here: real evidence confirmed "cinematic" as a bare
      // keyword collided with Phylum 12's own legitimate mood vocabulary
      // (Alex's own diagnosis, independently confirmed in this exact
      // array). Every new term below is a genuinely visual-specific
      // compound phrase, never a bare adjective a music description
      // would also use. "neural frames" removed per the Neural Frames ->
      // OpenMontage swap (Part 2 of the same pass). (Renumbered Aug 11:
      // this was num:14 before the phylum renumber, now num:13.)
      { num: 13, name: 'Visio Cinematica',      keywords: [
        {t:'camera',w:2},{t:'filmmaker',w:2},{t:'shot',w:1},{t:'b-roll',w:2},{t:'colour grade',w:2},{t:'footage',w:1},
        {t:'wide shot',w:2},{t:'tracking shot',w:2},{t:'drone shot',w:2},{t:'establishing shot',w:2},
        {t:'colour grading',w:2},{t:'lut',w:2},{t:'storyboard',w:2},{t:'mise-en-scène',w:2},{t:'depth of field',w:2},
        {t:'moody lighting',w:2},{t:'low-key lighting',w:2},{t:'chiaroscuro',w:2},
        {t:'jump cut',w:2},{t:'match cut',w:2},{t:'visual rhythm',w:2},
        {t:'music video',w:2},{t:'type beat video',w:2},{t:'visualizer',w:2},
        {t:'director style',w:2},{t:'director signature',w:2},
        {t:'openmontage',w:2},{t:'ai video generation',w:2},
      ] },
      { num: 15, name: 'Collaboratio',          keywords: [
        {t:'collab',w:2},{t:'co-production',w:2},{t:'feature',w:1},{t:'joint session',w:2},{t:'remote collaboration',w:2},{t:'split sheet',w:2},
        {t:'credit split',w:2},{t:'cold outreach',w:2},{t:'industry contact',w:2},{t:'artist relations',w:2},{t:'pitching yourself as a collaborator',w:2},
        {t:'studio chemistry',w:2},{t:'creative partnership',w:2},{t:'trust building',w:2},{t:'creative compromise',w:2},{t:'collaborative beat',w:2},
        {t:'stem exchange',w:2},
      ] },
      { num: 16, name: 'Venditionis Beatorum',  keywords: [
        {t:'beatstars',w:2},{t:'airbit',w:2},{t:'beat store',w:2},{t:'beat pricing',w:2},{t:'beat catalogue',w:2},{t:'license',w:1},{t:'lease',w:1},
        {t:'exclusive rights',w:2},{t:'non-exclusive',w:2},{t:'mechanical license',w:2},{t:'sync license',w:2},{t:'basic lease',w:2},{t:'premium lease',w:2},
        {t:'unlimited lease',w:2},{t:'trackout lease',w:2},{t:'custom beat request',w:2},{t:'beat store seo',w:2},{t:'tagged beat',w:2},{t:'untagged beat',w:2},
        {t:'drill beat sale',w:2},{t:'uk drill licensing',w:2},{t:'type beat monetization',w:2},
      ] },
      { num: 17, name: 'Negotium',              keywords: [
        {t:'business model',w:2},{t:'revenue stream',w:2},{t:'sole trader',w:2},{t:'limited company',w:2},{t:'self-employed',w:2},{t:'invoice',w:1},
        {t:'self-assessment tax',w:2},{t:'business expenses',w:2},{t:'profit margin',w:2},{t:'bookkeeping',w:2},{t:'accounting',w:1},{t:'business contract',w:2},
        {t:'business agreement',w:2},{t:'intellectual property',w:2},{t:'contract negotiation',w:2},{t:'income diversification',w:2},{t:'passive income',w:2},
        {t:'business goal setting',w:2},
      ] },
      { num: 18, name: 'Distributio',           keywords: [
        {t:'distrokid',w:2},{t:'tunecore',w:2},{t:'cd baby',w:2},{t:'digital distribution',w:2},{t:'streaming platform',w:1},{t:'single release',w:2},
        {t:'ep release',w:2},{t:'album release',w:2},{t:'pre-save',w:2},{t:'release schedule',w:2},{t:'drop date',w:1},{t:'streaming royalty',w:2},
        {t:'mechanical royalty',w:2},{t:'royalty split',w:2},{t:'isrc code',w:2},{t:'playlist placement',w:2},{t:'editorial playlist',w:2},
        {t:'playlist pitching',w:2},{t:'release rollout',w:2},{t:'release campaign',w:2},
      ] },
      { num: 19, name: 'Referentia Mercati',    keywords: [
        {t:'market trend',w:2},{t:'genre trend',w:2},{t:'sound trend',w:2},{t:'trend forecasting',w:2},{t:'competitor analysis',w:2},{t:'market research',w:2},
        {t:'industry benchmark',w:2},{t:'industry standard',w:1},{t:'market positioning',w:2},{t:'scene evolution',w:2},
        {t:'oversaturated genre',w:2},{t:'emerging scene',w:2},{t:'market analytics',w:2},{t:'target demographic',w:2},
      ] },
      { num: 20, name: 'Technologia',           keywords: [
        // Deliberately excludes DAW/plugin-name terms — those stay owned
        // by Phylum 6 (Instrumentarium) per Alex's own explicit overlap
        // warning, the tightest-scoping pair in his whole analysis.
        {t:'generative ai',w:2},{t:'ai plugin',w:1},{t:'ai mastering',w:2},{t:'ai mixing',w:2},{t:'machine learning model',w:2},{t:'neural network',w:2},
        {t:'ai video generation',w:2},{t:'prompt engineering',w:2},{t:'cloud storage',w:2},{t:'cloud computing',w:2},{t:'plugin architecture',w:2},
        {t:'vst format',w:2},{t:'tech stack',w:2},{t:'beta tester',w:2},{t:'early access',w:1},
      ] },
      // Deliberately unscoped catch-all — Alex's own explicit design note
      // (his overlap analysis for 21): keeping this near-empty is the
      // point, not a gap. Real content only ever routes here when it
      // scores zero everywhere else, never by matching a keyword.
      { num: 21, name: 'Miscellaneous Ordinanda', keywords: [] },
    ];

    // Escapes regex metacharacters in a keyword term before building a
    // word-boundary pattern from it (several terms contain "/" or "-").
    RPGACE.utils._escapeRegExp = function(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // F2 (kept)/F8 (reworked): single source of truth for keyword-overlap
    // scoring, used by both the badge scan (_quickPhylaScan) and the
    // taxonomy tree's pre-filter (isPlausiblePhylum). Now returns a
    // WEIGHTED score, not a raw hit count - callers compare against the
    // new threshold (3), not the old one (2).
    RPGACE.utils.phylaKeywordScore = function(text, phylumNumber) {
      if (!RPGACE.utils._PHYLA_KEYWORDS) return 0;
      var entry = RPGACE.utils._PHYLA_KEYWORDS.find(function(p) { return p.num === phylumNumber; });
      if (!entry || !entry.keywords.length) return 0;
      var t = (text || '').toLowerCase();
      return entry.keywords.reduce(function(score, kw) {
        var pattern = new RegExp('\\b' + RPGACE.utils._escapeRegExp(kw.t) + '\\b', 'i');
        return pattern.test(t) ? score + kw.w : score;
      }, 0);
    };

    // Weighted-score threshold: roughly "2 specific terms" or "1 specific +
    // 2 generic" - deliberately higher than the old raw-count>=2 bar, which
    // let two generic words alone (e.g. "style" + "tone") trigger a match.
    RPGACE.utils.PHYLA_MATCH_THRESHOLD = 3;

    RPGACE.utils._quickPhylaScan = function(text) {
      var matches = [];
      RPGACE.utils._PHYLA_KEYWORDS.forEach(function(p) {
        var score = RPGACE.utils.phylaKeywordScore(text, p.num);
        if (score >= RPGACE.utils.PHYLA_MATCH_THRESHOLD) matches.push({ num: p.num, name: p.name, hits: score });
      });
      matches.sort(function(a, b) { return b.hits - a.hits; });
      return matches;
    };

    // ── Layer 2: confidence gate + Layer 3: badge injection ──────────
    RPGACE.utils._runPhylaScan = function() {
      var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box');
      if (!chatBox) return;
      var aiMsgs = chatBox.querySelectorAll('.msg.ai');
      if (aiMsgs.length === 0) return;
      var lastMsg = aiMsgs[aiMsgs.length - 1];
      if (lastMsg.dataset.phylaScanned) return;
      lastMsg.dataset.phylaScanned = '1';

      var text = lastMsg.textContent || '';

      // Aug 26 2026 (G41 Phase 1) — real bug found while wiring oracleControl's
      // ORACLE_ACTION: trailer: the hook fire below used to sit AFTER a
      // `text.length < 60` early return, so a short reply (exactly the shape
      // Oracle's own concise conversational persona produces for a real
      // action-trigger like "log the beat") never fired oracle:response-
      // scanned at all — silently breaking any consumer that needs a SHORT
      // reply's trailer, not just the long-document trailers (DIRECTOR_
      // CHOSEN:/EDL_JSON:) this hook was originally built for, which never
      // hit the gate since a Visual Treatment Doc/EDL is always long. Fixed
      // by computing matches (or [] on short text — accurate, not
      // fabricated) and firing the hook unconditionally; only the
      // phyla-badge-specific work below stays gated on the real 60-char
      // floor, since that gate genuinely still matters there (a short reply
      // can't meaningfully carry 2+ phyla topics) — every existing consumer
      // that only cares about long replies is unaffected, their own regex
      // just won't match on short, irrelevant text, same as before.
      var matches = text.length >= 60 ? RPGACE.utils._quickPhylaScan(text) : [];
      var gapConcepts = matches.length > 0 ? 1 : 0; // placeholder signal, refined on click

      // Fires once per completed Oracle response, before the generic badge's
      // own 2+-phyla confidence gate below - lets single-phylum-specific
      // subscribers (e.g. phylumPath's auto-detect) apply their own
      // threshold against `matches` without installing a second
      // MutationObserver on #send-btn or re-querying the chat DOM. Found
      // and fixed same-session: phylumPath's first version did exactly
      // that duplicate-observer thing this hook now prevents.
      RPGACE.hooks.fire('oracle:response-scanned', text, lastMsg, matches);

      if (text.length < 60) return; // too short for a real phyla badge specifically

      // Confidence gate: only show if 2+ phyla matched
      if (matches.length < 2) return;

      var badge = document.createElement('button');
      badge.textContent = '🌿 ' + matches.length + ' topics';
      badge.style.cssText = 'margin-top:6px;padding:3px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:12px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      badge.onclick = function() {
        if (document.getElementById('phyla-badge-detail-' + lastMsg.dataset.phylaScanned + '-open')) {
          var existing = badge.nextElementSibling;
          if (existing && existing.classList.contains('phyla-detail-panel')) { existing.remove(); return; }
        }
        RPGACE.utils._expandPhylaDetail(badge, matches, text);
      };
      lastMsg.appendChild(badge);
    };

    // Layer 3 continued: expensive gap-score pull, only on click
    // NOW SCROLLABLE (shows all N matches, not silently truncated to 5)
    // NOW includes a 🌳 Propose Lineage button per row, wired to taxonomyTree module
    RPGACE.utils._expandPhylaDetail = function(badge, matches, text) {
      var panel = document.createElement('div');
      panel.className = 'phyla-detail-panel';
      panel.style.cssText = 'margin-top:8px;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:11px;max-height:280px;overflow-y:auto;';
      panel.innerHTML = '<div style="color:rgba(226,226,236,0.3);">Loading gap scores...</div>';
      badge.insertAdjacentElement('afterend', panel);

      RPGACE.sb.select('taxonomy_nodes', 'order=gap_score.desc&limit=100')
        .then(function(nodes) {
          nodes = nodes || [];
          panel.innerHTML = '';
          var countLabel = document.createElement('div');
          countLabel.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.25);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;';
          countLabel.textContent = matches.length + ' topics detected · scroll for all';
          panel.appendChild(countLabel);

          matches.forEach(function(m) {
            var relevantGaps = nodes.filter(function(n) { return n.phylum_number === m.num && n.gap_score >= 5; });
            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.04);';
            var isGap = relevantGaps.length > 0;

            var topLine = document.createElement('div');
            topLine.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
            var label = document.createElement('span');
            label.style.cssText = 'color:' + (isGap ? '#CC4A4A' : '#4CAF82') + ';font-weight:700;';
            label.textContent = (isGap ? '🔴 ' : '✅ ') + RPGACE.utils.phylumLabel(m.num);
            topLine.appendChild(label);

            // Pre-filter: only show the propose button if this phylum's own
            // keyword set genuinely overlaps the text — costs zero API calls,
            // prevents generating mismatch notices for implausible phyla.
            var plausible = RPGACE.modules.taxonomyTree
              ? RPGACE.modules.taxonomyTree.isPlausiblePhylum(text, m.num)
              : true;

            if (plausible) {
              var proposeBtn = document.createElement('button');
              proposeBtn.textContent = '🌳 Propose lineage';
              proposeBtn.style.cssText = 'padding:2px 8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:10px;color:#9B6EC8;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
              proposeBtn.onclick = function() {
                if (RPGACE.modules.taxonomyTree) {
                  var topicGuess = text.slice(0, 300);
                  RPGACE.modules.taxonomyTree.proposeLineage(topicGuess, m.num, 'oracle', null);
                }
              };
              topLine.appendChild(proposeBtn);
            }
            row.appendChild(topLine);

            if (isGap) {
              var gapLine = document.createElement('div');
              gapLine.style.cssText = 'color:rgba(226,226,236,0.4);margin-top:2px;';
              gapLine.textContent = 'Gap: ' + relevantGaps[0].concept + ' (' + parseFloat(relevantGaps[0].gap_score).toFixed(1) + '/10)';
              row.appendChild(gapLine);
            }
            panel.appendChild(row);
          });
        }).catch(function() {
          panel.innerHTML = '<div style="color:#CC4A4A;">Could not load gap scores</div>';
        });
    };

    // Utility: detect [PLACEHOLDER] in prompt, show step-by-step fill overlay
    // July 22 — shared by every module that calls fillGaps (40+ command
    // entries across prodOraclePanel/instaOraclePanel/visualOracle/
    // youtubeOracle) - reused here rather than duplicated, since the
    // streaming sendChat intercept already walks #chat-msgs the same way
    // to rebuild conversation history from the DOM.
    RPGACE.utils._captureChatHistory = function(maxChars) {
      maxChars = maxChars || 6000;
      var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box');
      if (!chatBox) return '';
      var lines = [];
      Array.from(chatBox.children).forEach(function(el) {
        var cls = el.className || '';
        var txt = (el.textContent || '').trim();
        if (!txt) return;
        if (cls.indexOf('user') !== -1) lines.push('You: ' + txt);
        else if (cls.indexOf('ai') !== -1) lines.push('Oracle: ' + txt);
      });
      var full = lines.join('\n\n');
      if (full.length > maxChars) full = '...(earlier messages truncated)...\n\n' + full.slice(-maxChars);
      return full;
    };

    RPGACE.utils.fillGaps = function(prompt, onComplete, opts) {
      opts = opts || {};
      var regex = /\[([^\]]+)\]/g;
      var gaps = [];
      var match;
      while ((match = regex.exec(prompt)) !== null) {
        gaps.push({ placeholder: match[0], label: match[1] });
      }
      if (gaps.length === 0) { onComplete(prompt); return; }

      var idx = 0;
      var filled = prompt;

      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', width: '480px', bg: '#0f0f1a', borderColor: 'rgba(201,168,76,0.25)',
        eyebrow: 'FILL IN THE DETAILS', noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;
      overlay.id = 'rpgace-gap-overlay';
      box.style.padding = '28px 32px';

      var counter = document.createElement('div');
      counter.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:8px;';

      var label = document.createElement('div');
      label.style.cssText = 'font-size:15px;font-weight:700;color:#D4DAF5;margin-bottom:14px;line-height:1.4;';

      var inp = document.createElement('textarea');
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:13px;font-family:Rajdhani,sans-serif;padding:10px 12px;resize:vertical;min-height:70px;outline:none;';
      inp.placeholder = 'Type your answer here...';

      var hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.25);margin-top:6px;margin-bottom:16px;';
      hint.textContent = 'Ctrl+Enter to continue';

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

      var cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.4);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;';
      cancelBtn.onclick = function() { overlay.remove(); };

      var nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#C9A84C);border-radius:6px;padding:8px 20px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';

      // July 22 — opt-in only (opts.allowConversationCapture), so the
      // other 40+ command entries that already use fillGaps are completely
      // unaffected. Built for Council of 5's "audit this conversation
      // instead of me re-typing it" ask.
      var captureBtn = null;
      if (opts.allowConversationCapture) {
        captureBtn = document.createElement('button');
        captureBtn.textContent = '📋 Use this conversation';
        captureBtn.title = 'Fill this in with our chat so far, instead of typing your own answer';
        captureBtn.style.cssText = 'background:none;border:1px solid rgba(74,144,226,.3);color:#4A8CCC;border-radius:6px;padding:8px 14px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-right:auto;';
        captureBtn.onclick = function() {
          var captured = RPGACE.utils._captureChatHistory();
          if (!captured) { RPGACE.utils.toast('⚠️ No conversation to capture yet', '#E2A83D', 2500); return; }
          inp.value = 'Here is our recent conversation for you to review — audit whatever decision or direction it converges on:\n\n' + captured;
          advance();
        };
      }

      function showGap(i) {
        var g = gaps[i];
        counter.textContent = 'Step ' + (i+1) + ' of ' + gaps.length;
        label.textContent = g.label;
        inp.value = '';
        nextBtn.textContent = (i === gaps.length - 1) ? 'Send to Oracle' : 'Next →';
        setTimeout(function(){ inp.focus(); }, 50);
      }

      function advance() {
        var val = inp.value.trim();
        if (!val) { inp.focus(); return; }
        filled = filled.replace(gaps[idx].placeholder, val);
        idx++;
        if (idx >= gaps.length) {
          overlay.remove();
          onComplete(filled);
        } else {
          showGap(idx);
        }
      }

      nextBtn.onclick = advance;
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); advance(); }
      });

      if (captureBtn) btnRow.appendChild(captureBtn);
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(nextBtn);
      box.appendChild(counter);
      box.appendChild(label);
      box.appendChild(inp);
      box.appendChild(hint);
      box.appendChild(btnRow);
      showGap(0);
    };
  },

});
/* ===END:config=== */
