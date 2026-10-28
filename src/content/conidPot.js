

/* ===MODULE:conidPot=== */
RPGACE.register('conidPot', {
  domain: 'content',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Aug 2026) — real, ratified /CEO plan item, and the SIXTH module
  // to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot and contentProductionLive): this module is split
  // into two internal namespaces, `ui` (rendering/DOM) and `logic`
  // (business logic/data), following the exact shape those five already
  // shipped and verified. Pure internal-structure refactor — zero
  // functional, behavioural, UX, data or schema change; every function
  // below was MOVED wholesale, never rewritten, never split down the
  // middle, and its own body is otherwise untouched.
  //
  // 16 real functions: `init` stays a literal top-level function (because
  // RPGACE.register() calls `module.init()` directly and cannot see into a
  // sub-object, and its own `self` genuinely IS the module — byte-identical,
  // still calling the top-level pass-throughs), 7 moved into `logic`, 8 into
  // `ui`. The one module-scope DATA field, BRIEF_ROTATION, stays exactly
  // where it was. Only functions moved.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. All 8 moved functions that opened with
  // `var self = this;` now open with `var self = RPGACE.modules.conidPot;`,
  // so every pre-existing `self.X` reference keeps resolving to the module
  // exactly as before — reaching the top-level pass-throughs, which is
  // precisely why every moved function keeps one. The 2 functions that had
  // NO `var self` and used bare `this.BRIEF_ROTATION`
  // (_updateBriefRotationLabel, getIdeasForBrief) get that same handle
  // inserted as their first statement with `this.` rewritten to `self.` —
  // the videoPipeline pilot's own `var mod = RPGACE.modules.videoPipeline;`
  // precedent, and identical to how contentProductionLive handled its own
  // _flowFor/_undoLastStage. In both cases the handle lands immediately
  // above the single usage, preceded only by a side-effect-free
  // `var day = new Date().getDay();`, so statement order is unchanged in
  // effect. The remaining 5 moved functions (_extractTitle, _parseIdeas,
  // _quickDetectPhyla, _similarity, _createNewIdea) reference neither
  // `this` nor `self` at all and moved completely untouched.
  //
  // Classification rule used (stated so a later reader can check it by grep
  // rather than guess, identical to the rule beatLog/contentProductionLive
  // recorded): a function lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM
  // (document.*, createElement, getElementById, querySelector, innerHTML);
  // otherwise in `logic`. Deliberately NOT counted as a ui signal, matching
  // the phylumPath pilot's own precedent: a bare window `confirm()`/
  // `prompt()` dialog, a `showPage()` page-nav call, or opening ANOTHER
  // module's picker/popup. A function that merely TRIGGERS a UI action
  // without constructing any DOM of its own is logic.
  //
  // The genuinely mixed / judgment-call functions, each named here with the
  // real evidence rather than silently classified:
  //   • 2 of the 8 `ui` functions also contain real Supabase writes, and are
  //     in `ui` on dominant responsibility (each is primarily a popup or the
  //     card list itself), never split down the middle — verified as exactly
  //     these 2 and no others: _showMergePrompt (a secureWrite update on
  //     conid_pot behind its own "🔀 Merge" button) and _refreshIdeaBank
  //     (four real conid_pot writes wired onto the cards it renders — the
  //     star toggle, the "⚡ Activate ConID" status flip, the "🗑" delete,
  //     plus its own read). _refreshIdeaBank is the exact same shape as
  //     contentProductionLive._refreshWidget, classified the same way.
  //   • _createNewIdea is in `logic` on the "merely triggers UI" clause: it
  //     calls showPage() and RPGACE.utils.sendToOracle() and builds a prompt
  //     string, but constructs no DOM of its own.
  //   • _saveToSupabase is in `logic` and calls RPGACE.utils.toast() (another
  //     module's own UI surface, never DOM built here) and then
  //     ui._refreshIdeaBank — so logic -> ui cross-namespace calls are normal
  //     here, exactly as ui.saveIdea/_showMergePrompt/_injectSaveBtn/
  //     _showIdeaSelectPopup/_patchTextSelect already call logic.* functions.
  //   • _updateBriefRotationLabel is in `ui` despite its name reading like a
  //     data update: it is entirely getElementById + createElement + append,
  //     reading BRIEF_ROTATION only to pick the label text.
  // ══════════════════════════════════════════════════════════════════


  // Day-based morning brief rotation
  BRIEF_ROTATION: {
    1: { type: 'gap',     label: 'Monday — Gap Score match' },
    2: { type: 'gap',     label: 'Tuesday — Gap Score match' },
    3: { type: 'oldest',  label: 'Wednesday — Oldest relevant 5' },
    4: { type: 'oldest',  label: 'Thursday — Oldest relevant 5' },
    5: { type: 'starred', label: 'Friday — Random from top starred' },
    6: { type: 'starred', label: 'Saturday — Random from top starred' },
    0: { type: 'gap',     label: 'Sunday — Gap Score match' },
  },


  init: function() {
    var self = this;
    // 'rpgace:ready' already fired before init() runs - call directly.
    RPGACE.registerBootTask(function() {
      self._injectSaveBtn();
      self._patchTextSelect();
      self._updateBriefRotationLabel();
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._injectSaveBtn(); }, 500);
      }
    });
    // July 23 — _injectIdeaBank() used to fire on every page:show->research
    // regardless of active tab, a real contributor to the reported 12-23s
    // freeze. Gated behind researchTabs' 'research:tab-active', key 'ideas'.
    RPGACE.hooks.on('research:tab-active', function(key) {
      if (key === 'ideas') setTimeout(function() { self._injectIdeaBank(); }, 500);
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM construction or discovery.
  // ============================================================
  logic: {


    // Aug 22 (A5 Phase 2, slice 1) — full build note. Alex's own verbatim
    // spec: "Idea Bank gets a 'create new' button -> straight to the Oracle
    // page, Oracle asks what new idea I want, can pull in Insta/YouTube/
    // TikTok Oracles for suggestions, keep chatting until something lands;
    // save result to Idea Bank (do later) or straight to Content Pipeline
    // (do now)." Reuses contentProductionLive._findOracleCmdText (rule 8 —
    // the exact real-command-borrowing pattern Phase G's caption generation
    // already established, Aug 5) instead of inventing new platform-growth
    // prose. Deliberately a real human-gated click, not an auto-fire (the
    // Aug 6 dangling-capture lesson this file's own comments elsewhere
    // apply to Beat Log) — Alex clicking this button IS the gate. The two
    // other real halves of this ask are already built, not duplicated here:
    // "save to Idea Bank" is _injectSaveBtn's existing isIdeasResponse
    // detection (this reply's own "Content Idea:" framing below matches
    // it); "straight to Content Pipeline" is contentRepurpose.openPopup's
    // existing Oracle-message dropdown, one page over.
    _createNewIdea: function() {
      if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.oracle);
      setTimeout(function() {
        var cpl = RPGACE.modules.contentProductionLive;
        var instaHooks = cpl && cpl._findOracleCmdText ? cpl._findOracleCmdText('instaOraclePanel', '50 Viral Hooks') : null;
        var ytHooks    = cpl && cpl._findOracleCmdText ? cpl._findOracleCmdText('youtubeOracle', 'Viral Hook Generator 50') : null;
        var ttHooks    = cpl && cpl._findOracleCmdText ? cpl._findOracleCmdText('tiktokOracle', 'Viral Hook Generator 50') : null;
        var grounding = [instaHooks, ytHooks, ttHooks].filter(Boolean).join('\n\n');
        var prompt = 'I want to brainstorm a brand new content idea for @AceSanyaBeats (FL Studio, UK hip hop, aspiring producers 18-35) — not repurposing an existing beat or video, a genuinely fresh idea.' +
          (grounding ? '\n\nApply this real hook/growth-mechanic expertise while brainstorming (reused as grounding, not as separate literal instructions):\n' + grounding : '') +
          '\n\nAsk me clarifying questions if you need to, and keep going back and forth with me until one clear idea lands. Once it does, restate it plainly starting with "Content Idea: <title>" followed by a short pitch, so I can save it to my Idea Bank.';
        RPGACE.utils.sendToOracle(prompt);
      }, 600);
    },


    // ⚠️ PRE-EXISTING, FLAGGED NOT FIXED (G53 conidPot split, Aug 2026).
    // This function starts a real Supabase write chain and never RETURNS it
    // (`RPGACE.sb.secureWrite(...).then(...)`, no leading `return`), so no
    // caller can await the write actually landing — the exact same bug class
    // already found and fixed in questEngine.startQuest/.completeQuest/
    // .dismissQuest (Aug 24 2026). Verified pre-existing, not introduced by
    // this split: `git show HEAD:rpgace_core.js` at the pre-split location
    // shows the identical un-returned chain, and this body is byte-identical
    // to it. Real current consequence is limited — all 4 live callers
    // (ui.saveIdea, ui._showMergePrompt's "Keep separate", ui._injectSaveBtn
    // via saveIdea, ui._showIdeaSelectPopup's bulk save) are fire-and-forget
    // and none awaits it today; _showIdeaSelectPopup is the one that would
    // most benefit, since it fires this in a loop and toasts a success count
    // immediately, before any write has resolved. Left untouched deliberately:
    // this pass is a pure structural refactor, and adding a `return` is a real
    // behavioural change that belongs in its own separately-reviewed commit.
    // PC-1 (Oct 17 2026): kind 'beat' | 'post' (+ postType for a post).
    _saveToSupabase: function(title, text, source, starred, kind, postType) {
      var self = RPGACE.modules.conidPot;
      // Detect phyla from idea text
      var phylaNums = self._quickDetectPhyla(text);

      // Real bug fixed Sep 2 (found + flagged by the G53 split's own review,
      // fixed here as a clearly separate change): this chain was never
      // returned, so no caller could await the write landing - same bug
      // class as the Aug 24 questEngine.startQuest/.completeQuest fix.
      // Returning it is zero-risk for the 3 existing single-item callers
      // (none capture the return value, so their behavior is byte-
      // identical) - it exists so _showIdeaSelectPopup's bulk-save path can
      // wait for the real outcome instead of assuming success (see its own
      // fix below). Resolves true/false rather than rejecting, so a bulk
      // caller can Promise.all() this safely without its own catch.
      return RPGACE.sb.secureWrite('conid_pot', 'insert', {
        title:          title,
        idea_text:      text.slice(0, 3000),
        source:         source || 'manual',
        status:         'potential',
        phyla_detected: phylaNums,
        gap_score_avg:  0,
        starred:        starred || false,
        kind:           kind === 'post' ? 'post' : 'beat',
        post_type:      kind === 'post' ? (postType || 'clip') : null,
      }).then(function() {
        RPGACE.utils.toast('💡 Saved to Idea Bank: ' + title.slice(0, 40), '#C9A84C', 3000);
        // Refresh idea bank if visible
        self._refreshIdeaBank();
        return true;
      }).catch(function(e) {
        RPGACE.utils.toast('Error saving: ' + e.message, '#CC4A4A', 3000);
        return false;
      });
    },


    // ── Get ideas for Morning Brief by day rotation ───────────────
    getIdeasForBrief: function() {
      var day = new Date().getDay();
      var self = RPGACE.modules.conidPot;
      var rotation = self.BRIEF_ROTATION[day] || { type: 'gap' };

      return RPGACE.sb.select('conid_pot', 'status=eq.potential&order=created_at.desc&limit=50')
        .then(function(rows) {
          rows = rows || [];
          if (rows.length === 0) return [];

          if (rotation.type === 'starred') {
            var starred = rows.filter(function(r) { return r.starred; });
            if (starred.length === 0) starred = rows;
            return [starred[Math.floor(Math.random() * starred.length)]];
          }
          if (rotation.type === 'oldest') {
            return rows.slice(-5).reverse(); // oldest 5
          }
          // gap: highest gap_score_avg
          return rows.sort(function(a,b) { return (b.gap_score_avg||0) - (a.gap_score_avg||0); }).slice(0, 3);
        });
    },


    // ── Helpers ───────────────────────────────────────────────────
    _extractTitle: function(text) {
      // Try quoted string first
      var q = text.match(/[\u201c\u201d"]([^\u201c\u201d"]{10,80})[\u201c\u201d"]/);
      if (q) return q[1].trim();
      // Try first meaningful line
      var lines = text.split('\n').map(function(l) { return l.replace(/[#*\[\]•\u2b50\d\.]/g,'').trim(); }).filter(function(l) { return l.length > 15 && l.length < 100; });
      return lines.length > 0 ? lines[0].slice(0,80) : text.slice(0,60);
    },


    _parseIdeas: function(text) {
      var ideas = [];
      // Match numbered items: "1." "T1." "⭐ 1." etc
      var lines = text.split('\n');
      var current = null;
      lines.forEach(function(line) {
        var trimmed = line.trim();
        var isNumbered = /^[A-Z]?\d+[\.\)]\s/.test(trimmed) || /^[\u2b50]\s*\d+/.test(trimmed);
        if (isNumbered && trimmed.length > 10) {
          if (current) ideas.push(current);
          var titleMatch = trimmed.match(/[\u201c\u201d"]([^\u201c\u201d"]{5,80})[\u201c\u201d"]/);
          var title = titleMatch ? titleMatch[1] : trimmed.replace(/^[A-Z]?\d+[\.\)]\s*[\u2b50]?\s*/, '').slice(0, 70);
          current = { title: title.trim(), text: trimmed };
        } else if (current && trimmed.length > 0) {
          current.text += '\n' + trimmed;
        }
      });
      if (current) ideas.push(current);
      return ideas.slice(0, 50); // max 50 per response
    },


    _quickDetectPhyla: function(text) {
      var t = text.toLowerCase();
      var nums = [];
      if (t.includes('drum') || t.includes('808') || t.includes('kick')) nums.push(2);
      if (t.includes('mix') || t.includes('eq') || t.includes('compress')) nums.push(4);
      if (t.includes('fl studio') || t.includes('plugin') || t.includes('vst')) nums.push(6);
      if (t.includes('tutorial') || t.includes('teach') || t.includes('learn')) nums.push(12);
      if (t.includes('youtube') || t.includes('instagram') || t.includes('content')) nums.push(13);
      return nums;
    },


    _similarity: function(a, b) {
      var wa = a.toLowerCase().split(/\s+/);
      var wb = b.toLowerCase().split(/\s+/);
      var common = wa.filter(function(w) { return w.length > 3 && wb.includes(w); });
      return common.length / Math.max(wa.length, wb.length);
    },

  },

  // ============================================================
  // ui — rendering/DOM: builds the popups/panels/lists, delegating
  // every non-display decision to logic.* rather than deciding here.
  // ============================================================
  ui: {


    // ── Save an idea to ConIDPot ──────────────────────────────────
    saveIdea: function(text, source, suggestedTitle) {
      var self = RPGACE.modules.conidPot;
      // Generate suggested title from text
      var title = suggestedTitle || self._extractTitle(text);

      // Show save popup
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.88', width: '500px', bg: '#0f0f1a', borderColor: 'rgba(201,168,76,0.25)',
        eyebrow: 'Save to Idea Bank · ConIDPot', noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var titleLbl = document.createElement('div');
      titleLbl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
      titleLbl.textContent = 'Idea title (edit if needed):';

      var titleInp = document.createElement('input');
      titleInp.type = 'text';
      titleInp.value = title;
      titleInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:#D4DAF5;font-size:13px;font-weight:600;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:12px;';

      var previewLbl = document.createElement('div');
      previewLbl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
      previewLbl.textContent = 'Idea content preview:';

      var preview = document.createElement('div');
      preview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:8px 10px;max-height:100px;overflow-y:auto;margin-bottom:14px;line-height:1.5;';
      preview.textContent = text.slice(0, 400) + (text.length > 400 ? '...' : '');

      var starRow = document.createElement('div');
      starRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;';
      var starCb = document.createElement('input');
      starCb.type = 'checkbox'; starCb.id = 'cp-star';
      var starLbl = document.createElement('label');
      starLbl.htmlFor = 'cp-star';
      starLbl.textContent = '⭐ Star this idea (adds to Friday random rotation)';
      starLbl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);cursor:pointer;';
      starRow.appendChild(starCb); starRow.appendChild(starLbl);

      // PC-1 (Oct 17 2026): beat or post (+ post type), one shared chooser.
      var ph = RPGACE.modules.postingHub;
      var kindPick = ph ? ph.ui.kindChooser('beat', null) : null;

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;';

      var saveBtn = document.createElement('button');
      saveBtn.id = 'cp-save-idea';
      saveBtn.textContent = '💡 Save to Idea Bank';
      saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';

      var cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      cancelBtn.onclick = function() { overlay.remove(); };

      saveBtn.onclick = function() {
        var finalTitle = titleInp.value.trim() || title;
        var starred = starCb.checked;
        var k = kindPick ? kindPick.get() : { kind: 'beat', post_type: null };

        // Check for duplicates first
        RPGACE.sb.select('conid_pot', 'order=created_at.desc&limit=50')
          .then(function(existing) {
            var similar = (existing || []).find(function(e) {
              return self._similarity(e.title, finalTitle) > 0.6;
            });

            if (similar) {
              // Show merge prompt
              overlay.remove();
              self._showMergePrompt(similar, finalTitle, text, source, starred, k.kind, k.post_type);
            } else {
              // Save fresh
              self._saveToSupabase(finalTitle, text, source, starred, k.kind, k.post_type);
              overlay.remove();
            }
          }).catch(function() {
            self._saveToSupabase(finalTitle, text, source, starred, k.kind, k.post_type);
            overlay.remove();
          });
      };

      btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
      box.appendChild(titleLbl);
      box.appendChild(titleInp); box.appendChild(previewLbl);
      box.appendChild(preview);
      if (kindPick) box.appendChild(kindPick.el);
      box.appendChild(starRow);
      box.appendChild(btnRow);
      titleInp.focus();
      titleInp.select();
    },


    _showMergePrompt: function(existing, newTitle, newText, source, starred, kind, postType) {
      var self = RPGACE.modules.conidPot;
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.9', width: '480px', bg: '#0f0f1a', borderColor: 'rgba(226,84,84,0.25)',
        title: '⚠️ Similar idea found', noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var msg = document.createElement('div');
      msg.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);margin-bottom:16px;line-height:1.6;';
      msg.innerHTML = 'Existing: <strong style="color:#C9A84C;">' + existing.title + '</strong><br>New: <strong style="color:#4A8CCC;">' + newTitle + '</strong><br><br>Merge into one combined idea (best of both), or keep separate?';

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      var mergeBtn = document.createElement('button');
      mergeBtn.textContent = '🔀 Merge (recommended)';
      mergeBtn.style.cssText = 'flex:1;padding:9px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      mergeBtn.onclick = function() {
        // Merge: combine text, keep better title, add to merged_from
        var combinedText = existing.idea_text + '\n\n--- MERGED ---\n\n' + newText.slice(0, 1500);
        RPGACE.sb.secureWrite('conid_pot', 'update', { idea_text: combinedText, merged_from: [newTitle] }, 'id=eq.' + existing.id)
        .then(function() {
          RPGACE.utils.toast('🔀 Merged into: ' + existing.title, '#4CAF82', 3000);
          self._refreshIdeaBank();
        });
        overlay.remove();
      };

      var keepBtn = document.createElement('button');
      keepBtn.textContent = 'Keep separate';
      keepBtn.style.cssText = 'padding:9px 14px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      keepBtn.onclick = function() {
        self._saveToSupabase(newTitle, newText, source, starred, kind, postType);
        overlay.remove();
      };

      btnRow.appendChild(mergeBtn); btnRow.appendChild(keepBtn);
      box.appendChild(msg); box.appendChild(btnRow);
    },


    // ── Inject Save Ideas button after Oracle panel responses ─────
    _injectSaveBtn: function() {
      var self = RPGACE.modules.conidPot;
      // F1: now uses the shared RPGACE.utils.getOracleMessageElements() query
      // instead of its own separate .msg.ai selector - one shared source of
      // truth for "what counts as an AI message."
      var aiMsgs = RPGACE.utils.getOracleMessageElements ? RPGACE.utils.getOracleMessageElements() : [];
      aiMsgs.forEach(function(msg) {
        if (msg.dataset.cpSave) return;
        msg.dataset.cpSave = '1';

        var txt = msg.textContent.trim();
        if (txt.length < 100) return;

        // Only show Save Ideas for Oracle panel responses (content/idea patterns)
        var isIdeasResponse = txt.includes('INSTA-ORACLE') || txt.includes('YouTube Oracle') ||
          txt.includes('PROD. ORACLE') || txt.includes('VISUAL ORACLE') ||
          txt.includes('content idea') || txt.includes('Content Idea') ||
          (txt.match(/\d+\./g) || []).length >= 3; // 3+ numbered items

        if (!isIdeasResponse) return;

        var saveRow = document.createElement('div');
        saveRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);flex-wrap:wrap;';

        var saveAllBtn = document.createElement('button');
        saveAllBtn.textContent = '💡 Save ideas to bank';
        saveAllBtn.style.cssText = 'padding:4px 12px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:5px;color:#C9A84C;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        saveAllBtn.onclick = function() {
          // Parse numbered ideas from this message
          var ideas = self._parseIdeas(txt);
          if (ideas.length === 0) {
            // Save whole message as one idea
            self.saveIdea(txt, 'oracle_panel', self._extractTitle(txt));
          } else {
            // Show multi-select for ideas
            self._showIdeaSelectPopup(ideas);
          }
        };

        saveRow.appendChild(saveAllBtn);
        msg.appendChild(saveRow);
      });
    },


    _showIdeaSelectPopup: function(ideas) {
      var self = RPGACE.modules.conidPot;
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.9', scroll: true, width: '600px', bg: '#0f0f1a', borderColor: 'rgba(201,168,76,0.25)',
        title: '💡 Select ideas to save (' + ideas.length + ' found)', noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:16px;';
      sub.textContent = 'Each selected idea becomes a ConIDPot entry in your Idea Bank.';
      box.appendChild(sub);

      var selectAll = document.createElement('button');
      selectAll.textContent = 'Select all';
      selectAll.style.cssText = 'padding:4px 10px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
      selectAll.onclick = function() {
        box.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = true; });
      };
      box.appendChild(selectAll);

      ideas.forEach(function(idea, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
        var cb = document.createElement('input');
        cb.type = 'checkbox'; cb.id = 'cp-idea-' + i; cb.checked = true;
        cb.style.cssText = 'margin-top:3px;flex-shrink:0;';
        var info = document.createElement('div');
        info.style.cssText = 'flex:1;';
        var titleEl = document.createElement('input');
        titleEl.type = 'text';
        titleEl.value = idea.title;
        titleEl.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#D4DAF5;font-size:12px;font-weight:600;padding:4px 8px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:3px;';
        var preview = document.createElement('div');
        preview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);';
        preview.textContent = idea.text.slice(0, 100) + '...';
        info.appendChild(titleEl); info.appendChild(preview);
        row.appendChild(cb); row.appendChild(info);
        box.appendChild(row);
      });

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
      var saveSelBtn = document.createElement('button');
      saveSelBtn.textContent = '💡 Save selected to Idea Bank';
      saveSelBtn.style.cssText = 'flex:1;padding:10px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      saveSelBtn.onclick = function() {
        // Real bug fixed Sep 2 (found + flagged by the G53 split's own
        // review, fixed here as a clearly separate change, rule 7): this
        // used to count SELECTED items and toast that count as "saved"
        // immediately, before any of the real writes had resolved - a
        // real, honest failure would have been silently misreported as a
        // success. Now waits for every real write outcome (_saveToSupabase
        // resolves true/false, never rejects, so Promise.all is safe here)
        // and reports the REAL count. Each item's own per-item toast from
        // _saveToSupabase still fires in real time as writes land; this is
        // the honest summary once they all have.
        var promises = [];
        ideas.forEach(function(idea, i) {
          var cb = document.getElementById('cp-idea-' + i);
          var titleInp = box.querySelectorAll('input[type="text"]')[i];
          if (cb && cb.checked) {
            var t = titleInp ? titleInp.value.trim() : idea.title;
            promises.push(self._saveToSupabase(t, idea.text, 'oracle_panel', false));
          }
        });
        overlay.remove();
        Promise.all(promises).then(function(results) {
          var saved = results.filter(Boolean).length;
          var failed = results.length - saved;
          RPGACE.utils.toast(
            '💡 Saved ' + saved + ' idea' + (saved === 1 ? '' : 's') + ' to Idea Bank' + (failed ? ' — ' + failed + ' failed (see error above)' : ''),
            failed ? '#E2A83D' : '#C9A84C', 3500
          );
        });
      };
      var cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      cancelBtn.onclick = function() { overlay.remove(); };
      btnRow.appendChild(saveSelBtn); btnRow.appendChild(cancelBtn);
      box.appendChild(btnRow);
    },


    // ── Patch text-select panel to add Save as Idea button ───────
    _patchTextSelect: function() {
      var self = RPGACE.modules.conidPot;
      // Watch for the text-select popup (🔍 Identify button)
      var obs = new MutationObserver(function(muts) {
        muts.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            // Find the identify popup
            var popup = node.id === 'text-select-popup' ? node :
                        node.querySelector && node.querySelector('#text-select-popup');
            if (!popup) return;
            if (popup.dataset.cpPatched) return;
            popup.dataset.cpPatched = '1';
            var saveIdeaBtn = document.createElement('button');
            saveIdeaBtn.textContent = '💡 Save as Idea';
            saveIdeaBtn.style.cssText = 'padding:4px 10px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:5px;color:#C9A84C;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:6px;';
            saveIdeaBtn.onclick = function() {
              var selectedText = window.getSelection ? window.getSelection().toString() : '';
              var text = selectedText || popup.dataset.selectedText || '';
              if (text) self.saveIdea(text, 'text_select', self._extractTitle(text));
            };
            // Append to popup button row
            var btnRow = popup.querySelector('div');
            if (btnRow) btnRow.appendChild(saveIdeaBtn);
            else popup.appendChild(saveIdeaBtn);
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
    },


    // ── Idea Bank panel in Research tab ──────────────────────────
    _injectIdeaBank: function() {
      if (document.getElementById('cp-idea-bank')) return;
      var self = RPGACE.modules.conidPot;
      // Aug 23 2026 (UI2/UI3) — see RPGACE.utils.panelHome()'s own comment.
      var page = RPGACE.utils.panelHome();
      if (!page) return;

      var panel = document.createElement('div');
      panel.id = 'cp-idea-bank';
      panel.style.cssText = 'background:rgba(201,168,76,0.03);border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px;';
      eyebrow.textContent = 'Idea Bank · ConIDPot';
      eyebrow.style.display = 'none'; // Oct 10 2026 (N2): duplicate of the page title
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#D4DAF5;margin-bottom:4px;';
      titleEl.textContent = 'Content Idea Bank';
      titleEl.style.display = 'none'; // Oct 10 2026 (N2): duplicate of the page title
      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:14px;';
      sub.textContent = 'All saved ideas. Click any idea to send to Oracle, Repurpose, Agenda, or Video Finder.';

      // Filter tabs
      var filterRow = document.createElement('div');
      filterRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;';
      // PC-1 (Oct 17 2026): Beats / Posts split the one Idea Bank.
      var filters = ['All', '🥁 Beats', '📣 Posts', 'Potential', 'Making 🎛', 'Starred ⭐', 'Gap Match 🔴'];
      var activeFilter = 'All';
      filters.forEach(function(f) {
        var btn = document.createElement('button');
        btn.textContent = f;
        btn.dataset.filter = f;
        btn.style.cssText = 'padding:4px 10px;background:' + (f === activeFilter ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)') + ';border:1px solid ' + (f === activeFilter ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)') + ';border-radius:12px;color:' + (f === activeFilter ? '#C9A84C' : 'rgba(226,226,236,0.4)') + ';font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        btn.onclick = function() {
          activeFilter = f;
          filterRow.querySelectorAll('button').forEach(function(b) {
            var isActive = b.dataset.filter === f;
            b.style.background = isActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)';
            b.style.borderColor = isActive ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)';
            b.style.color = isActive ? '#C9A84C' : 'rgba(226,226,236,0.4)';
          });
          self._refreshIdeaBank(f);
        };
        filterRow.appendChild(btn);
      });

      // Add idea button
      var addBtn = document.createElement('button');
      addBtn.textContent = '+ Add idea manually';
      addBtn.style.cssText = 'padding:4px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.35);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      addBtn.onclick = function() { self.saveIdea('', 'manual', ''); };
      filterRow.appendChild(addBtn);

      // Aug 22 (A5 Phase 2, slice 1) — Alex's own verbatim ask: "Idea Bank
      // gets a 'create new' button -> straight to the Oracle page, Oracle
      // asks what new idea I want, can pull in Insta/YouTube/TikTok Oracles
      // for suggestions, keep chatting until something lands." See
      // _createNewIdea below for the real build notes.
      var createBtn = document.createElement('button');
      createBtn.textContent = '💬 Create new via Oracle';
      createBtn.style.cssText = 'padding:4px 12px;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.25);border-radius:12px;color:#4A90E2;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      createBtn.onclick = function() { self._createNewIdea(); };
      filterRow.appendChild(createBtn);

      var list = document.createElement('div');
      list.id = 'cp-idea-bank-list';
      list.style.cssText = 'max-height:400px;overflow-y:auto;';

      panel.appendChild(eyebrow); panel.appendChild(titleEl); panel.appendChild(sub);
      panel.appendChild(filterRow); panel.appendChild(list);

      // Append as a direct child of the Research page. Previously inserted
      // before ref-corpus / beat-log, which (while those were nested inside
      // #video-workshop-panel) landed this inside that panel too (Bug A).
      page.appendChild(panel);
      RPGACE.hooks.fire('research:panel-injected');

      self._refreshIdeaBank('All');
    },


    // ⚠️ PRE-EXISTING, FLAGGED NOT FIXED (G53 conidPot split, Aug 2026).
    // Same un-returned-promise-chain shape as logic._saveToSupabase above
    // (`RPGACE.sb.select(...).then(...)`, no leading `return`) — verified
    // pre-existing against `git show HEAD:rpgace_core.js`, body byte-identical.
    // Consequence here is smaller than _saveToSupabase's: this is a render
    // refresh whose callers genuinely are fire-and-forget, so nothing today
    // needs to await it. Noted for completeness so a future reader sees both
    // instances at once rather than rediscovering the second one later.
    _refreshIdeaBank: function(filter) {
      var self = RPGACE.modules.conidPot;
      var list = document.getElementById('cp-idea-bank-list');
      if (!list) return;
      list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">Loading...</div>';

      // Same real fix as _saveToSupabase above, Sep 2 - was never returned;
      // zero-risk since no existing caller captures the return value.
      return RPGACE.sb.select('conid_pot', 'order=created_at.desc&limit=50')
        .then(function(rows) {
          rows = rows || [];

          // Apply filter
          if (filter === 'Starred ⭐') rows = rows.filter(function(r) { return r.starred; });
          if (filter === 'Potential') rows = rows.filter(function(r) { return r.status === 'potential'; });
          if (filter === 'Gap Match 🔴') rows = rows.filter(function(r) { return r.gap_score_avg >= 6; });
          if (filter === 'Making 🎛') rows = rows.filter(function(r) { return r.status === 'making'; });
          if (filter === '🥁 Beats') rows = rows.filter(function(r) { return r.kind !== 'post'; });
          if (filter === '📣 Posts') rows = rows.filter(function(r) { return r.kind === 'post'; });

          list.innerHTML = '';
          if (rows.length === 0) {
            list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">No ideas yet. Use 💡 Save ideas to bank after Oracle responses.</div>';
            return;
          }

          rows.forEach(function(row) {
            var item = document.createElement('div');
            item.style.cssText = 'padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);position:relative;';

            var topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;';

            var starEl = document.createElement('span');
            starEl.textContent = row.starred ? '⭐' : '○';
            starEl.style.cssText = 'font-size:11px;flex-shrink:0;cursor:pointer;';
            starEl.onclick = function(e) {
              e.stopPropagation();
              RPGACE.sb.secureWrite('conid_pot', 'update', { starred: !row.starred }, 'id=eq.' + row.id)
                .then(function() { self._refreshIdeaBank(filter || 'All'); });
            };

            var titleEl = document.createElement('div');
            titleEl.style.cssText = 'flex:1;font-size:12px;font-weight:600;color:#D4DAF5;';
            titleEl.textContent = row.title;

            var sourceBadge = document.createElement('span');
            sourceBadge.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.25);flex-shrink:0;';
            sourceBadge.textContent = row.source || 'manual';

            topRow.appendChild(starEl); topRow.appendChild(titleEl);
            // BT-1 (Oct 16 2026): an idea being made shows it.
            if (row.status === 'making') {
              var mk = document.createElement('span'); mk.className = 'cp-making-badge';
              mk.style.cssText = 'font-size:11px;font-weight:700;color:var(--purple);flex-shrink:0;';
              mk.textContent = '🎛 making';
              topRow.appendChild(mk);
            }
            // BT-3: logging the beat marks its idea done.
            if (row.status === 'done') {
              var dn = document.createElement('span'); dn.className = 'cp-done-badge';
              dn.style.cssText = 'font-size:11px;font-weight:700;color:var(--green, #4CAF82);flex-shrink:0;';
              dn.textContent = '✅ beat logged';
              topRow.appendChild(dn);
              // BT-7: from the idea to the beat it became.
              if (RPGACE.modules.beatsHub) {
                var ob = document.createElement('button'); ob.type = 'button'; ob.className = 'cp-open-beat';
                ob.textContent = '🥁 Open beat';
                ob.style.cssText = 'min-height:32px;padding:4px 10px;border-radius:6px;border:1px solid var(--gold);background:none;color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0;';
                ob.onclick = function(e) {
                  e.stopPropagation();
                  RPGACE.sb.select('content_productions', 'select=id&idea_id=eq.' + row.id + '&order=created_at.desc&limit=1').then(function(r) {
                    if (r && r[0]) RPGACE.modules.beatsHub.ui.openBeat(r[0].id);
                    else RPGACE.utils.toast('⚠️ No logged beat is linked to this idea', '#CC4A4A', 3000, 'conidPot');
                  }, function(x) { RPGACE.utils.toast('⚠️ ' + (x && x.message || x), '#CC4A4A', 3000, 'conidPot'); });
                };
                topRow.appendChild(ob);
              }
            }
            // PC-1: beat / post tag; tap to retag.
            var phm = RPGACE.modules.postingHub;
            if (phm) topRow.appendChild(phm.ui.kindTag(row, function() { self._refreshIdeaBank(filter || 'All'); }));
            if ((row.status === 'in_post' || row.status === 'posted') && phm) {
              var ip = document.createElement('button'); ip.type = 'button'; ip.className = 'cp-open-posting';
              ip.textContent = row.status === 'posted' ? '✅ posted' : '📣 In Posting';
              ip.style.cssText = 'min-height:32px;padding:4px 10px;border-radius:6px;border:1px solid var(--purple);background:none;color:var(--text);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0;';
              ip.onclick = function(e) { e.stopPropagation(); phm.open(); };
              topRow.appendChild(ip);
            }
            topRow.appendChild(sourceBadge);
            item.appendChild(topRow);
            // BT-2: session time + Keep making / Start mixing.
            if (row.status === 'making' && RPGACE.modules.beatsHub) {
              RPGACE.modules.beatsHub.ui.ideaExtras(item, row, function() { self._refreshIdeaBank(filter || 'All'); });
            }

            // Action buttons — connectors
            var actRow = document.createElement('div');
            actRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

            var connectors = [
              // BT-1 (Oct 16 2026): start a Producer Doing Now session for this idea.
              { label: '▶ Start making', color: '#9B6EC8', cls: 'cp-start-making', hide: row.status !== 'potential' || row.kind === 'post', action: function() {
                var bh = RPGACE.modules.beatsHub;
                if (!bh) return;
                bh.logic.startMaking(row).then(function() {
                  RPGACE.utils.toast('▶ Making: ' + String(row.title || '').slice(0, 40), 'var(--gold)', 2200);
                  try { RPGACE.modules.doingNow.ui._refresh(); } catch (e) {}
                  self._refreshIdeaBank(filter || 'All');
                }, function(e) { RPGACE.utils.toast('⚠️ Could not start: ' + (e && e.message || e), '#CC4A4A', 4000, 'conidPot'); });
              }},
              // PC-1 (Oct 17 2026): a post idea becomes a post (Idea stage).
              { label: '▶ Plan a post', color: '#9B6EC8', cls: 'cp-plan-post', hide: row.status !== 'potential' || row.kind !== 'post', action: function() {
                var ph2 = RPGACE.modules.postingHub;
                if (!ph2) return;
                ph2.logic.fromIdea(row).then(function(post) {
                  RPGACE.utils.toast('📣 Post started: ' + String(post.title || '').slice(0, 40), 'var(--green)', 2200);
                  ph2.open();
                }, function(e) { RPGACE.utils.toast('⚠️ Could not start the post: ' + (e && e.message || e), '#CC4A4A', 4000, 'conidPot'); });
              }},
              { label: '🔀 Repurpose', color: '#4CAF82', action: function() {
                if (RPGACE.modules.contentRepurpose) {
                  RPGACE.modules.contentRepurpose.openPopup(row.idea_text, row.title);
                }
              }},
              { label: '💬 Oracle', color: '#4A8CCC', action: function() {
                if (typeof showPage === 'function') showPage('advisor');
                setTimeout(function() { RPGACE.utils.sendToOracle('Help me develop this content idea for @AceSanyaBeats:\n\n"' + row.title + '"\n\n' + (row.idea_text || '').slice(0, 500)); }, 300);
              }},
              { label: '📅 Add to Agenda', color: '#C9A84C', action: function() {
                // July 24 audit fix: routed through RPGACE.DB.get/set instead
                // of raw localStorage (rule 8 - DB.SCHEMA already declares
                // 'sched' as this exact key) - the raw call used to skip
                // R.hooks.fire('db:change', ...), so any future listener on
                // that hook would never learn this write happened.
                var agendas = RPGACE.DB.get('sched');
                var today = new Date().toISOString().split('T')[0];
                agendas.push({ id: 'cp_' + Date.now(), date: today, hour: 14, title: 'Content: ' + row.title.slice(0,40), description: 'Film and post: ' + row.title, category: 'content', estimated_mins: 60, xp: 80 });
                RPGACE.DB.set('sched', agendas);
                RPGACE.utils.toast('📅 Added to agenda: ' + row.title.slice(0,30), '#C9A84C', 2500);
              }},
              { label: '🗑', color: 'rgba(226,84,84,0.6)', action: function() {
                if (confirm('Delete "' + row.title + '"?')) {
                  RPGACE.sb.secureWrite('conid_pot', 'delete', null, 'id=eq.' + row.id)
                    .then(function() { self._refreshIdeaBank(filter || 'All'); });
                }
              }},
            ];

            connectors.forEach(function(c) {
              if (c.hide) return;
              var btn = document.createElement('button');
              if (c.cls) btn.className = c.cls;
              btn.textContent = c.label;
              btn.style.cssText = 'padding:3px 9px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:5px;color:' + c.color + ';font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
              btn.onclick = c.action;
              actRow.appendChild(btn);
            });

            item.appendChild(actRow);
            list.appendChild(item);
          });
        }).catch(function(e) {
          list.innerHTML = '<div style="color:#CC4A4A;font-size:11px;">Load error: ' + e.message + '</div>';
        });
    },


    // ── Update Morning Brief rotation label ───────────────────────
    _updateBriefRotationLabel: function() {
      var day = new Date().getDay();
      var self = RPGACE.modules.conidPot;
      var rotation = self.BRIEF_ROTATION[day];
      if (!rotation) return;

      var briefWrap = document.getElementById('mb-wrap');
      if (!briefWrap) return;

      var existing = document.getElementById('mb-rotation-label');
      if (existing) existing.remove();

      var label = document.createElement('span');
      label.id = 'mb-rotation-label';
      label.style.cssText = 'font-size:11px;color:rgba(201,168,76,0.5);margin-left:10px;';
      label.textContent = '· ' + rotation.label;

      var autoLabel = briefWrap.querySelector('[style*="font-size:11px"]');
      if (autoLabel) autoLabel.appendChild(label);
    },

  },

  // Thin top-level pass-throughs — these preserve the exact existing
  // public API byte-for-byte. `this` is always the module object itself,
  // because every real call site invokes them as a property access on the
  // module (RPGACE.modules.conidPot.X(...), a local
  // `var m = RPGACE.modules.conidPot;` alias, or `self.X` from inside this
  // module) — never a detached function reference. Confirmed real external
  // callers, from a fresh whole-repo grep for BOTH the
  // `RPGACE.modules.conidPot.X` form and every local-alias form
  // (rpgace_core.js is the only live-code file that references this module
  // at all — index.html has no onclick handler touching it, and there is no
  // bracket-form `RPGACE.modules['conidPot']` access anywhere): exactly TWO
  // — _injectIdeaBank (dashDeck.PAGE_PANELS' own `ensure:` hook for
  // #cp-idea-bank, reached through a local `var m` alias) and
  // getIdeasForBrief (morningBrief's own brief assembly, direct form).
  // Every other function is internal-only today, but all 15 keep a
  // pass-through regardless, so the module's real public API surface is
  // byte-identical to before this split. BRIEF_ROTATION is DATA, stays at
  // module scope, and is NOT a pass-through.
  //
  // Note for a future reader: errorLog.METHOD_MODULE_MAP (the G109 stack-
  // trace attribution table) is keyed by method NAME, and this split changes
  // no name — a fresh run of scripts/generate_method_module_map.py before
  // and after produces byte-identical output, verified.
  saveIdea: function(text, source, suggestedTitle) { return this.ui.saveIdea(text, source, suggestedTitle); },
  _createNewIdea: function() { return this.logic._createNewIdea(); },
  _saveToSupabase: function(title, text, source, starred, kind, postType) { return this.logic._saveToSupabase(title, text, source, starred, kind, postType); },
  _showMergePrompt: function(existing, newTitle, newText, source, starred, kind, postType) { return this.ui._showMergePrompt(existing, newTitle, newText, source, starred, kind, postType); },
  _injectSaveBtn: function() { return this.ui._injectSaveBtn(); },
  _showIdeaSelectPopup: function(ideas) { return this.ui._showIdeaSelectPopup(ideas); },
  _patchTextSelect: function() { return this.ui._patchTextSelect(); },
  _injectIdeaBank: function() { return this.ui._injectIdeaBank(); },
  _refreshIdeaBank: function(filter) { return this.ui._refreshIdeaBank(filter); },
  _updateBriefRotationLabel: function() { return this.ui._updateBriefRotationLabel(); },
  getIdeasForBrief: function() { return this.logic.getIdeasForBrief(); },
  _extractTitle: function(text) { return this.logic._extractTitle(text); },
  _parseIdeas: function(text) { return this.logic._parseIdeas(text); },
  _quickDetectPhyla: function(text) { return this.logic._quickDetectPhyla(text); },
  _similarity: function(a, b) { return this.logic._similarity(a, b); },

});
/* ===END:conidPot=== */
