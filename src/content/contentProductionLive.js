
/* ===MODULE:contentProductionLive=== */
RPGACE.register('contentProductionLive', {
  domain: 'content',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Aug 2026) — real, ratified /CEO plan item, and the FIFTH module
  // to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot): this module is split into two internal namespaces,
  // `ui` (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape those four already shipped and verified. Pure internal-
  // structure refactor — zero functional, behavioural, UX, data or schema
  // change; every function below was MOVED wholesale, never rewritten,
  // never split down the middle, and its own body is otherwise untouched.
  //
  // 39 real functions: `init` stays a literal top-level function (because
  // RPGACE.register() calls `module.init()` directly and cannot see into a
  // sub-object, and its own `self` genuinely IS the module — byte-identical,
  // still calling the top-level pass-throughs), 21 moved into `logic`, 17
  // into `ui`. Every module-scope DATA field stays exactly where it was:
  // _activeConID / _oracleSession / _activeId (the last one is never
  // declared in this literal — createEntry mints it at runtime, see below)
  // / OPENMONTAGE_HANDOFF_ENABLED / the 6 MUSIC_VIDEO_* + OBS_RAW_* lookup
  // tables / STAGE_DOC_KEYS. Only functions moved.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that used to open with
  // `var self = this;` now opens with `var self = RPGACE.modules.
  // contentProductionLive;` (36 of the 38), so every pre-existing `self.X`
  // reference keeps resolving to the module exactly as before — including
  // the real module-scope WRITES (`self._activeConID = ...`, `self._activeId
  // = ...`, in createEntry/_prepOracleBarFor/_generateBeatstarsListing/
  // _refreshWidget/_openProductionPanel/_endSession), which is the silent
  // state-desync bug this pattern exists to prevent: those must land on the
  // module, never on a sub-object, because 2 real EXTERNAL call sites read
  // and write them directly (see the pass-through block at the foot of this
  // module). The 2 functions that had NO `var self` and used bare `this.X`
  // (_flowFor, _undoLastStage) get that same handle inserted as their first
  // statement, with `this.` rewritten to `self.` — the videoPipeline pilot's
  // own `var mod = RPGACE.modules.videoPipeline;` precedent. _injectOracleBar
  // is the one genuinely awkward case: it had BOTH a `var self = this;` AND
  // a bare `this._activeConID` guard one line ABOVE that declaration, so the
  // declaration is hoisted to the top of the body — it moves past exactly 2
  // side-effect-free early-return guards, so ordering is unchanged in effect.
  // `self[primary.fn](row)` / `self[redo.fn](row)` inside _refreshWidget are
  // dynamic dispatch through the module (the string values live in the
  // MUSIC_VIDEO_*/OBS_RAW_PRIMARY_ACTION tables), so they resolve to the
  // top-level pass-throughs — which is exactly why every moved function
  // keeps one.
  //
  // Classification rule used (stated so a later reader can check it by grep
  // rather than guess, and identical to the rule beatLog's own split
  // recorded): a function lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM
  // (document.*, createElement, getElementById, querySelector, innerHTML);
  // otherwise in `logic`. Deliberately NOT counted as a ui signal, matching
  // the phylumPath pilot's own precedent (`_placeInsight`/`_generateArticle`
  // landed in `logic` despite opening a confirm popup, because neither
  // builds DOM itself): a bare window `confirm()`/`prompt()` dialog, a
  // `showPage()` page-nav call, or opening ANOTHER module's picker/popup.
  // A function that merely TRIGGERS a UI action without constructing any
  // DOM of its own is logic.
  //
  // The genuinely mixed / judgment-call functions, each named here with the
  // real evidence rather than silently classified:
  //   • 4 of the 17 `ui` functions also contain a real Supabase write, and
  //     are in `ui` on dominant responsibility (each is primarily a popup or
  //     the card list itself), never split down the middle — verified as
  //     exactly these 4 and no others: _openObsRawIntake (secureWrite on
  //     conid_pot after a successful createEntry), _refreshWidget (the real
  //     3-step cascade delete: secureWrite video_jobs -> sb.del
  //     openmontage_jobs -> secureWrite content_productions), _generateVideo
  //     (sb.insert openmontage_jobs), _viewOpenMontageJob (secureWrite
  //     content_productions from its "Mark ConID as Filmed" button).
  //   • _generateVideo is the sharpest of those four: its DOM half is only
  //     the honest OPENMONTAGE_HANDOFF_ENABLED=false payload-preview popup
  //     (that flag is currently TRUE, so in live use it only ever inserts).
  //     Kept in `ui` anyway so the classification rule above stays a single
  //     uniform, grep-checkable test rather than a per-function verdict.
  //   • _sendFilledPromptToOracle is in `ui` and renders nothing: it
  //     genuinely DISCOVERS a live DOM node (`document.querySelector
  //     ('#chat-input')`) and writes into it. Real consequence worth
  //     knowing: 4 `logic` functions (_generateVisualTreatment,
  //     _generateObsScript, _generateCaptions, _retroRegenerateScript) call
  //     it, so logic -> ui cross-namespace calls are normal here, exactly as
  //     _revertToStage/createEntry/_markObsCutDone already call
  //     ui._refreshWidget.
  //   • 3 `logic` functions touch the browser without building DOM, per the
  //     rule above: _undoLastStage (`confirm()`), _markObsCutDone
  //     (`prompt()`), and _generateBundle — the last is the only logic
  //     function that MUTATES a DOM element, and only one supplied by its
  //     caller (`btnEl.textContent`/`.disabled` spinner state); it neither
  //     constructs nor discovers one, and its real job is the server-side
  //     zip call + download.
  //   • _generateBeatstarsListing / _prepOracleBarFor / _generateVisualTreatment
  //     / _generateObsScript are all in `logic` on the "merely triggers UI"
  //     clause: they close a popup, call showPage(), open visualOracle's own
  //     picker, and build prompt strings — none constructs DOM here.
  // ══════════════════════════════════════════════════════════════════


  // PC-6 (Oct 17 2026): the hand-off flag, Oracle bar, Production Panels,
  // OBS raw intake and video-job tracker are retired ("start fresh"); this
  // module is now only the My beats list (Beats' release / sell / links)
  // and the Beatstars listing text. Posts live in postingHub.
  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._injectDashboardWidget(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        self._injectDashboardWidget();
      }
    });
  },





  // ============================================================
  // logic — business logic/data: builds no DOM of its own. May call a
  // window confirm()/prompt() dialog, showPage(), or another module's
  // picker, and may call into ui.* for a refresh — none of that is DOM
  // construction. Order below is the original file order, unchanged.
  // ============================================================
  logic: {





    // ── Update an existing entry ──────────────────────────────────
    updateEntry: function(id, updates) {
      updates.updated_at = new Date().toISOString();
      return RPGACE.sb.secureWrite('content_productions', 'update', updates, 'id=eq.' + id);
    },

    // ── F16: Beatstars listing generator ──────────────────────────
    // BeatStars has no public API for creating listings (confirmed July 13
    // via web search — it's a repeatedly-requested, still-unimplemented
    // feature). So this generates ready-to-copy-paste listing content via
    // Oracle instead of attempting true auto-posting — same pattern as F10's
    // scoped-down Fourth automation.
    _generateBeatstarsListing: function(row) {
      var self = RPGACE.modules.contentProductionLive;
      RPGACE.utils.toast('🎧 Pulling beat data + generating listing...', '#C9A84C', 3000);

      // PC-6: the beat's facts come from its own Beat Log save (creative_docs.beat_meta).
      RPGACE.sb.select('content_productions', 'select=creative_docs&id=eq.' + row.id + '&limit=1')
        .catch(function(e) {
          console.warn('[contentProductionLive] beatstars listing lookup error:', e.message);
          return [];
        })
        .then(function(rows) {
          var beat = rows && rows[0] && rows[0].creative_docs ? rows[0].creative_docs.beat_meta || null : null;

          var licenceTerms = {
            'lease': 'Lease — MP3/WAV, non-exclusive, up to 10,000 streams/sales, credit required, seller retains ownership and may resell.',
            'non-exclusive': 'Non-Exclusive — WAV + trackout stems, unlimited streams/sales, credit required, seller retains ownership and may resell.',
            'exclusive': 'Exclusive — full trackout stems + exclusive rights transfer, unlimited use, no credit required, beat removed from store after sale, one buyer only.'
          };

          var prompt = 'Generate a complete BeatStars listing for a beat I am selling.\n' +
            'Title: ' + row.title + '\n' +
            (beat && beat.key ? 'Key: ' + beat.key + ' ' + (beat.scale || '') + '\n' : '') +
            (beat && beat.bpm ? 'BPM: ' + beat.bpm + '\n' : '') +
            (beat && beat.mood ? 'Mood: ' + beat.mood + '\n' : '') +
            'Licence: ' + row.licence_type + '\n' +
            'Price: £' + (row.price != null ? row.price : 'TBD') + '\n' +
            'Licence terms to use verbatim: ' + (licenceTerms[row.licence_type] || row.licence_type) + '\n\n' +
            'Generate ALL of the following, ready to copy-paste directly into BeatStars\' listing fields:\n\n' +
            '1. LISTING TITLE (3 options) — BeatStars SEO format, e.g. "[Artist] x [Artist] Type Beat - \\"' + row.title + '\\""\n\n' +
            '2. DESCRIPTION — 150-200 words, professional, SEO-friendly, mention key/BPM/mood, end with a clear purchase CTA.\n\n' +
            '3. GENRE + TAGS — 10-15 comma-separated BeatStars tags, most relevant first.\n\n' +
            '4. LICENCE TERMS BLOCK — formatted as it should appear in the listing, based on the licence terms given above.\n\n' +
            'Be specific and pre-filled for @AceSanyaBeats / UK hip hop — no placeholders.';

          // Close the hosting dashDeck popup first — showPage('advisor') would
          // otherwise swap the page UNDER the still-open overlay. No-op when
          // opened outside the popup.
          if (RPGACE.modules.dashDeck && RPGACE.modules.dashDeck.closeWidgetPopup) {
            RPGACE.modules.dashDeck.closeWidgetPopup('cpl-widget');
          }
          if (typeof showPage === 'function') showPage('advisor');
          setTimeout(function() { RPGACE.utils.sendToOracle(prompt); }, 500);
        });
    },



    // BT-8 (Oct 16 2026): the Phase H deliverable-zip helpers (_fileAppliesToTier,
    // _uploadDeliverableFiles, _removeDeliverableFile, _generateBundle) are
    // retired with the server zip action - Alex: "no file zips". Selling is
    // beatsHub.ui.openSell (tiers + logged sales).








    // Aug 5 (Engineer pass, Phase G curveball) — real reuse, not a retyped
    // paraphrase: pulls a named command's exact prompt text straight out of
    // instaOraclePanel/youtubeOracle's own CMDS array (matched by name, same
    // pattern prodOraclePanel.run() already uses so a future CMDS reorder
    // can't silently break this), so their real audience-psychology/hook
    // expertise is one source of truth read from 2 places, never copy-
    // pasted and left to drift.
    _findOracleCmdText: function(moduleName, cmdName) {
      var mod = RPGACE.modules[moduleName];
      if (!mod || !mod.CMDS) return null;
      var found = mod.CMDS.filter(function(c) { return c[0] === cmdName; })[0];
      return found ? found[1] : null;
    },


  },

  // ============================================================
  // ui — rendering/DOM: constructs or discovers real DOM (the ConID card
  // list, the Production Panel, every popup, the Oracle bar). Delegates
  // the non-display decisions to logic.* rather than deciding itself.
  // Order below is the original file order, unchanged.
  // ============================================================
  ui: {




    // ── Dashboard widget — ConID tracker ─────────────────────────
    _injectDashboardWidget: function() {
      if (document.getElementById('cpl-widget')) return;
      var self = RPGACE.modules.contentProductionLive;
      var page = document.getElementById('page-dashboard');
      if (!page) return;

      var widget = document.createElement('div');
      widget.id = 'cpl-widget';
      widget.style.cssText = 'background:rgba(61,170,110,0.03);border:1px solid rgba(61,170,110,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
      var titleEl = document.createElement('div');
      // Aug 6 (Engineer pass, real /deduplication ask) — was "Content
      // Production Live" (eyebrow) stacked over "Content Pipeline" (title):
      // two different names on the SAME single widget/node (this is not
      // two systems — see the _openPipeline comment above, "node MOVED,
      // never rebuilt"), which read exactly like two overlapping features.
      // Real code check confirmed there is only ever one #cpl-widget; the
      // module's internal name (contentProductionLive) is an implementation
      // detail that never needed to leak into the user-facing header. Now
      // one consistent brand voice, matching the dashDeck card's own real
      // desc string (line ~5707: "Ideas -> productions -> posts.").
      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(61,170,110,0.6);text-transform:uppercase;margin-bottom:3px;';
      eyebrow.textContent = 'Ideas → Productions → Posts';
      // Oct 10 2026 (N2, Content & Video slice): the page already carries a
      // "Content Pipeline" title, so the eyebrow + a 2nd identical title read
      // as a stutter (impeccable: kicker-above-heading). One plain heading
      // naming what the list is.
      eyebrow.style.display = 'none';
      var titleText = document.createElement('div');
      titleText.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);';
      titleText.textContent = 'My beats';
      titleEl.appendChild(eyebrow); titleEl.appendChild(titleText);

      var refreshBtn = document.createElement('button');
      refreshBtn.textContent = '↻';
      refreshBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);cursor:pointer;font-size:12px;padding:4px 10px;';
      refreshBtn.onclick = function() { self._refreshWidget(); };
      hdr.appendChild(titleEl); hdr.appendChild(refreshBtn);
      widget.appendChild(hdr);

      var list = document.createElement('div');
      list.id = 'cpl-list';
      list.style.cssText = 'max-height:300px;overflow-y:auto;';
      list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
      widget.appendChild(list);

      // July 20 Pass 1: this widget now lives inside dashDeck's Content Pipeline
      // card popup (_openPipeline relocates the live node in/out). Inject
      // straight into the shared hidden stash holder — dashDeck owns showing
      // it. Prefer dashDeck's holder helper; fall back to the same-id holder if
      // dashDeck hasn't run yet.
      var holder = document.getElementById('dd-stash-holder');
      if (!holder && RPGACE.modules.dashDeck && RPGACE.modules.dashDeck._ensureStash) {
        holder = RPGACE.modules.dashDeck._ensureStash();
      }
      if (!holder) {
        holder = document.createElement('div');
        holder.id = 'dd-stash-holder';
        holder.style.display = 'none';
        page.appendChild(holder);
      }
      holder.appendChild(widget);

      self._refreshWidget();
      console.log('[contentProductionLive] Dashboard widget injected (stashed for dashDeck popup)');
    },

    _refreshWidget: function() {
      var self = RPGACE.modules.contentProductionLive;
      var list = document.getElementById('cpl-list');
      if (!list) return;

      // Engineer pass 2026-07-30 (Slice A item 3, symmetric reverse of the
      // Video Pipeline "↩ Beat Log" button) - bulk-fetch which productions
      // have a linked video_jobs row, once, rather than an N+1 query per
      // row (rule 8/11 - one extra request total, not one per card).
      // PC-6: beats only (posts live in Posting).
      Promise.all([
        RPGACE.sb.select('content_productions', 'content_type=eq.music_video&order=updated_at.desc&limit=40'),
        // PC-7: which beats have a video post (private table, empty before sign-in).
        (RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('posts', 'select=id,beat_id,stage,updated_at&beat_id=not.is.null&order=updated_at.desc&limit=200') : Promise.resolve([])).catch(function() { return []; })
      ])
        .then(function(results) {
          var rows = results[0] || [];
          var postByBeat = {};
          (Array.isArray(results[1]) ? results[1] : []).forEach(function(p) { if (p.beat_id && !postByBeat[p.beat_id]) postByBeat[p.beat_id] = p; });
          list.innerHTML = '';

          if (rows.length === 0) {
            list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">No beats logged yet — log one in Beat Log.</div>';
            return;
          }

          rows.forEach(function(row) {
            var color = row.released_at ? '#4CAF82' : '#C9A84C';

            var item = document.createElement('div');
            item.style.cssText = 'padding:10px 12px;border:1px solid rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,0.02);';
            item.dataset.cpId = row.id; // BT-7: Beats cross-links find a beat's card by this

            var topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin-bottom:6px;';

            var idBadge = document.createElement('span');
            idBadge.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(61,170,110,0.7);background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:10px;padding:2px 7px;margin-right:8px;';
            idBadge.textContent = 'ConID #' + row.con_id;

            var titleSpan = document.createElement('span');
            titleSpan.style.cssText = 'font-size:15px;font-weight:600;color:#D4DAF5;flex:1 1 140px;min-width:0;overflow-wrap:anywhere;';
            titleSpan.textContent = row.title;


            var statusBadge = document.createElement('span');
            // Oct 10 2026 (N2): the old rgb()->rgba() string trick did nothing
            // to these hex colours, so the badge's background was the same
            // solid colour as its text - the label was invisible. color-mix
            // tints any colour format. "X: tick" renders as "X ✓".
            statusBadge.style.cssText = 'font-size:12px;font-weight:700;color:' + color + ';background:color-mix(in srgb,' + color + ' 14%,transparent);border:1px solid color-mix(in srgb,' + color + ' 40%,transparent);border-radius:10px;padding:3px 9px;flex-shrink:0;';
            statusBadge.textContent = row.released_at ? 'Released ✓' : row.finished_at ? 'Finished ✓' : 'In progress';

            topRow.appendChild(idBadge); topRow.appendChild(titleSpan); topRow.appendChild(statusBadge);
            item.appendChild(topRow);


            // Aug 6 (Engineer pass, 2nd real hand-test round, item 8) —
            // "⇄ Swap ConID" removed entirely. Alex's own words: "i think
            // swap conid is so redundant now with no actual benefit to
            // me" — the same ConID list is already one click away (this
            // widget itself), and the Oracle-session/Production-Panel
            // buttons below already carry the con_id context switch.
            var topActions = document.createElement('div');
            topActions.style.cssText = 'display:flex;align-items:center;margin-bottom:6px;';

            // Inline title edit
            var titleWrap = document.createElement('div');
            titleWrap.style.cssText = 'flex:1;';
            var titleDisplay = document.createElement('div');
            titleDisplay.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);cursor:pointer;';
            titleDisplay.textContent = '✎ Edit title';
            titleDisplay.onclick = function() {
              var inp = document.createElement('input');
              inp.type = 'text';
              inp.value = row.title;
              inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(61,170,110,0.3);border-radius:4px;color:#D4DAF5;font-size:11px;padding:3px 6px;outline:none;font-family:Rajdhani,sans-serif;';
              titleWrap.replaceChild(inp, titleDisplay);
              inp.focus();
              inp.onblur = function() {
                var newTitle = inp.value.trim() || row.title;
                self.updateEntry(row.id, { title: newTitle }).then(function() {
                  RPGACE.utils.toast('✅ Title updated', '#4CAF82', 2000);
                  self._refreshWidget();
                });
              };
              inp.onkeydown = function(e) { if (e.key === 'Enter') inp.blur(); };
            };
            titleWrap.appendChild(titleDisplay);
            topActions.appendChild(titleWrap);
            item.appendChild(topActions);

            // Action buttons row
            var actions = document.createElement('div');
            actions.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
            // PC-7: this beat's video post, when there is one.
            var vp = postByBeat[row.id];
            if (vp && RPGACE.modules.postingHub) {
              var vpBtn = document.createElement('button');
              vpBtn.type = 'button'; vpBtn.className = 'cpl-video-post';
              vpBtn.textContent = '📣 Video post' + (vp.stage === 'posted' ? ' ✓' : '');
              vpBtn.style.cssText = 'padding:4px 10px;background:rgba(155,110,240,0.08);border:1px solid rgba(155,110,240,0.35);border-radius:5px;color:#B49BF0;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;min-height:32px;';
              vpBtn.onclick = function() {
                var ph = RPGACE.modules.postingHub.ui;
                if (vp.stage === 'posted') ph.openPost(vp.id); else ph.openPlan(vp.id);
              };
              actions.appendChild(vpBtn);
            }

            // Oct 13 2026 (XP-1, Alex: "Add two ticks to the beat card"):
            // the pipeline had no "beat finished" / "beat released" step, so
            // Producer XP had nothing to fire on. Setting these columns is
            // all it takes: the database's xp_on_change trigger awards
            // beat_finished (120) / beat_released (300) to the Producer realm.
            if (row.content_type === 'music_video') {
              var tickCss = 'padding:4px 10px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:5px;color:#C9A84C;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;min-height:32px;';
              if (!row.finished_at) {
                var finBtn = document.createElement('button');
                finBtn.className = 'cpl-beat-finished';
                finBtn.textContent = '✅ Beat finished';
                finBtn.style.cssText = tickCss;
                finBtn.onclick = function() {
                  finBtn.disabled = true;
                  self.updateEntry(row.id, { finished_at: new Date().toISOString() }).then(function() {
                    self._refreshWidget();
                    RPGACE.utils.toast('✅ Beat finished: ' + (row.title || 'ConID #' + row.con_id), color, 2200);
                  }).catch(function(e) { finBtn.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'contentProductionLive'); });
                };
                actions.appendChild(finBtn);
              } else {
                // BT-5 (Oct 16 2026): release = one or more links via Beats'
                // release pop-up (links can be added later); was a prompt.
                var bh5 = RPGACE.modules.beatsHub;
                if (bh5) {
                  bh5.logic.linksOf(row).forEach(function(l) {
                    var la = document.createElement('a');
                    la.href = l.url; la.target = '_blank'; la.rel = 'noopener noreferrer'; la.className = 'cpl-release-link';
                    la.textContent = '🔗 ' + (l.place || 'Link');
                    la.style.cssText = tickCss + 'text-decoration:none;';
                    actions.appendChild(la);
                  });
                  var relBtn = document.createElement('button');
                  relBtn.className = row.released_at ? 'cpl-beat-addlink' : 'cpl-beat-released';
                  relBtn.textContent = row.released_at ? '+ link' : '🚀 Beat released';
                  relBtn.style.cssText = tickCss;
                  relBtn.onclick = function() {
                    if (RPGACE.modules.dashDeck) RPGACE.modules.dashDeck.closeWidgetPopup('cpl-widget');
                    bh5.ui.openRelease(row, function() { self._refreshWidget(); });
                  };
                  actions.appendChild(relBtn);
                }
              }
            }

            // BT-8 (Oct 16 2026): one 💰 Sell button on every beat (was a
            // licence-gated toggle with Beatstars listing + zip deliverables;
            // zips retired). Opens Beats' Sell pop-up: tiers, listing text,
            // Log a sale, this beat's sales.
            if (row.content_type === 'music_video' && RPGACE.modules.beatsHub) {
              var sellBtn = document.createElement('button');
              sellBtn.className = 'cpl-beat-sell';
              sellBtn.textContent = '💰 Sell';
              sellBtn.style.cssText = 'padding:4px 10px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:5px;color:#C9A84C;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;min-height:32px;';
              sellBtn.onclick = function() {
                if (RPGACE.modules.dashDeck) RPGACE.modules.dashDeck.closeWidgetPopup('cpl-widget');
                RPGACE.modules.beatsHub.ui.openSell(row, function() { self._refreshWidget(); });
              };
              actions.appendChild(sellBtn);
            }

            // 2026-07-31 — Alex's real ask: "a delete for each conID should
            // be present." Real risk checked first (pg_constraint): video_jobs.
            // content_production_id has NO cascade, so deleting a linked
            // ConID would hard-fail with an FK violation.
            //
            // Aug 6, real Alex ask ("the button should delete both, one
            // button also triggers the other") — the FK-violation confirm
            // dialog was correct but unhelpful; it made Alex manually delete
            // the linked job first instead of just doing it. Re-checked
            // pg_constraint directly (rule 1, never assume): a SECOND
            // non-cascading FK exists too — openmontage_jobs.content_production_id
            // — not previously handled here, a real gap this fix also closes.
            // Cascade delete now: video_jobs rows (via the service-role
            // secureWrite proxy, content_productions/video_jobs are both in
            // api/data-write.js's ALLOWED_TABLES) → openmontage_jobs rows
            // (plain anon-key RPGACE.sb.del — deliberately NOT secureWrite,
            // per the standing landmine: openmontage_jobs must stay anon_all
            // so the separate OpenMontage Claude Code session can still
            // write to it) → the content_productions row itself. Each step
            // still fails loud on a real error (rule 7) rather than silently
            // leaving an orphaned row.
            var delBtn = document.createElement('button');
            delBtn.textContent = '🗑';
            delBtn.style.cssText = 'padding:4px 10px;background:rgba(226,84,84,0.06);border:1px solid rgba(226,84,84,0.2);border-radius:5px;color:rgba(226,84,84,0.7);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            delBtn.onclick = function() {
              var msg = 'Delete ConID #' + row.con_id + ' ("' + row.title + '")?';
              if (!confirm(msg)) return;
              RPGACE.sb.secureWrite('video_jobs', 'delete', null, 'content_production_id=eq.' + row.id)
                .catch(function(e) { throw new Error('linked video job: ' + e.message); })
                .then(function() {
                  return RPGACE.sb.del('openmontage_jobs', 'content_production_id=eq.' + row.id)
                    .catch(function(e) { throw new Error('linked OpenMontage job: ' + e.message); });
                })
                .then(function() {
                  return RPGACE.sb.secureWrite('content_productions', 'delete', null, 'id=eq.' + row.id)
                    .catch(function(e) { throw new Error('ConID row: ' + e.message); });
                })
                .then(function() {
                  RPGACE.utils.toast('🗑 Deleted ConID #' + row.con_id + '', 'rgba(226,226,236,0.5)', 2500);
                  self._refreshWidget();
                })
                .catch(function(e) {
                  RPGACE.utils.toast('⚠️ Delete failed (' + e.message + ')', '#CC4A4A', 4500);
                });
            };
            actions.appendChild(delBtn);

            item.appendChild(actions);
            list.appendChild(item);
          });
        }).catch(function(e) {
          list.innerHTML = '<div style="color:#CC4A4A;font-size:11px;">Load error: ' + e.message + '</div>';
        });
    },












  },

  // Thin top-level pass-throughs — these preserve the exact existing
  // public API byte-for-byte. `this` is always the module object itself,
  // because every real call site invokes them as a property access on the
  // module (RPGACE.modules.contentProductionLive.X(...), a local
  // `var cpl = RPGACE.modules.contentProductionLive;` alias, or `self.X`/
  // `self[table.fn]` from inside this module) — never a detached function
  // reference. Confirmed real external callers, from a fresh whole-repo
  // grep for BOTH the `RPGACE.modules.contentProductionLive.X` form and
  // every local-alias form (rpgace_core.js is the only live-code file that
  // references this module at all): createEntry (contentRepurpose's
  // generate handler + conidPot's "⚡ Activate ConID"), _injectDashboardWidget
  // (dashDeck.PAGE_PANELS' own `ensure:` hook for #cpl-widget — reached
  // through no alias at all, the exact caller shape the bookworm split
  // nearly missed), _openProductionPanel (dashDeck._openPage + beatLog),
  // _openObsRawIntake (dashDeck + conidPot), _findOracleCmdText
  // (contentRepurpose, 3 calls), _flowFor (conidPot), plus the two module-
  // scope DATA fields _activeConID and _activeId, which 2 of those sites
  // assign directly — data, so they stay at module scope and are NOT
  // pass-throughs.
  updateEntry: function(id, updates) { return this.logic.updateEntry(id, updates); },
  _generateBeatstarsListing: function(row) { return this.logic._generateBeatstarsListing(row); },
  _injectDashboardWidget: function() { return this.ui._injectDashboardWidget(); },
  _refreshWidget: function() { return this.ui._refreshWidget(); },
  _findOracleCmdText: function(moduleName, cmdName) { return this.logic._findOracleCmdText(moduleName, cmdName); },

});
/* ===END:contentProductionLive=== */
