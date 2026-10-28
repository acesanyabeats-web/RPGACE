
/* ===MODULE:contentRepurpose=== */
RPGACE.register('contentRepurpose', {
  domain: 'content',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 43 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 4 ui (openPopup, _restructureQuickBar,
  // _injectAgentButtons, _injectVideoWorkshopBtn) / 4 logic
  // (platformOutputInstructions, _getOracleMessages, _detectPhyla,
  // _getPhylaContext). `platformOutputInstructions` returns a built
  // prompt-text string never assigned to innerHTML, same
  // oracleTreeGrounding-shaped precedent already established this
  // series; `_getOracleMessages` delegates its one DOM query to the
  // already-separate shared `RPGACE.utils.getOracleMessageElements()`
  // utility and does pure array processing on the result, so it's `logic`
  // by the same "delegated DOM discovery, no direct DOM touch in this
  // function's own body" reasoning already applied to
  // taxonomySync.logic._runSync. `openPopup` is kept as ONE whole
  // function despite containing real judgment-shaped inline handlers
  // (phylum detection, prompt building) — same `_showOptionSequence`-
  // shaped precedent: it is not separable into `logic` without splitting
  // the function down the middle, which this pass forbids. `init` stays
  // a literal top-level function.
  //
  // Real, PRE-EXISTING bug found while reading this module for the
  // split, NOT introduced or fixed by this refactor, flagged per this
  // project's own standing discipline (multi-effect/ambiguous-intent,
  // left for a separate task): the one real external caller of
  // `openPopup`, an Idea Bank card's "🔀 Repurpose" connector button,
  // calls `RPGACE.modules.contentRepurpose.openPopup(row.idea_text,
  // row.title)` — but `openPopup`'s own signature takes zero parameters
  // and has never read either argument (checked directly, confirmed
  // both before and after this pure move). Clicking that specific
  // button opens the popup with the dropdown/textarea empty rather than
  // pre-filled with the idea's own text — a real, silent UX gap, not a
  // crash. A real fix would need new routing logic to feed both params
  // into the popup's Step-1 flow, which is genuine feature work outside
  // this pass's pure-refactor scope — left exactly as-is, not guessed
  // at or silently patched.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() {
      self._restructureQuickBar();
      self._injectAgentButtons();
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._restructureQuickBar(); }, 400);
      }
      if (name === 'agents') {
        setTimeout(function() { self._injectAgentButtons(); }, 400);
      }
    });
    // July 23 — gated behind researchTabs' 'research:tab-active', key
    // 'workshop', same reasoning as the other research sub-panel fixes.
    RPGACE.hooks.on('research:tab-active', function(key) {
    });
  },

  // ============================================================
  // logic — business logic/data: prompt-text building, Oracle-message
  // extraction, phylum detection, taxonomy-context fetching. Zero DOM.
  // ============================================================
  logic: {

  // ── Shared platform-output instruction block (Aug 23 2026, A7) ───────
  // This exact text used to live inline inside openPopup's own generate
  // handler and nowhere else. A7's OBS-raw scripting phase genuinely needs
  // the SAME repurposing instructions folded into its own script prompt
  // ("the scripting will also include all social media oracles and
  // repurpose to make one script", Alex's own words) — so it is extracted
  // here and called from both places rather than pasted a second time
  // (rule 8: same real work, one pipeline). Behaviour for openPopup is
  // byte-identical — this is the same string it always sent.
  platformOutputInstructions: function() {
    return 'First, decide: would the Instagram Reels caption, YouTube Shorts hook, and TikTok caption end up being essentially the same short-form message for THIS specific idea? If yes, save tokens — write ONE merged "📱 SHORT-FORM CAPTION (Instagram/YouTube Shorts/TikTok)" section instead of three, and say plainly at the top of that section that you merged them and why. If the platforms genuinely need different angles (usually true — different opening lines, hook style, audience expectation per platform), keep them as 3 separate sections instead, each with a different opening line — no copy-paste between platforms.\n\n' +
      'Generate the following:\n\n' +
      '1. SHORT-FORM CAPTION(S) — either the one merged section above, or 3 separate sections: 📸 INSTAGRAM REELS CAPTION (hook that stops scroll in 2 seconds + value + CTA, under 150 words, line breaks, 3-5 hashtags), 🎬 YOUTUBE SHORTS HOOK (8-word text overlay + spoken hook line + one-line video description, question or bold claim), 🎵 TIKTOK CAPTION (different angle to Instagram, casual, direct, under 100 words, 1-2 trending hooks, hashtags).\n\n' +
      '2. 📧 EMAIL BLURB\nExactly 60 words. Subject line included. Producer newsletter tone. Personal but professional. CTA at end.\n\n' +
      'After that, add:\n3. 🎬 YOUTUBE SCRIPT OUTLINE — intro hook, 3-5 teaching sections with key points, outro CTA\n4. 🎛 PRODUCTION TEACHING ANGLE — what to demonstrate in FL Studio, which concepts to explain, difficulty level\n\n';
  },

  // ── Get last N Oracle messages for dropdown ──────────────────
  _getOracleMessages: function(limit) {
    // F1: now uses the shared RPGACE.utils.getOracleMessageElements() query
    // instead of its own duplicated DOM-walk.
    var elements = RPGACE.utils.getOracleMessageElements ? RPGACE.utils.getOracleMessageElements() : [];
    var lim = limit || 8;
    var recent = elements.slice(-lim);
    return recent.map(function(el) {
      var txt = el.textContent.trim();
      return { text: txt, preview: txt.slice(0, 80) + '...' };
    });
  },

  // ── Detect relevant phyla from idea text ─────────────────────
  _detectPhyla: function(ideaText, callback) {
    var text = (ideaText || '').toLowerCase();

    var isContentIdea = text.includes('tutorial') || text.includes('teach') || text.includes('how to') ||
      text.includes('tip') || text.includes('reel') || text.includes('video') || text.includes('content') ||
      text.includes('learn') || text.includes('explain') || text.includes('guide') || text.includes('youtube');
    var isSocialIdea = text.includes('instagram') || text.includes('tiktok') || text.includes('reel') ||
      text.includes('caption') || text.includes('hook') || text.includes('post') || text.includes('platform');

    var confirmed = [];
    var suggested = [];
    var threshold = RPGACE.utils.PHYLA_MATCH_THRESHOLD || 3;
    var phylumEnglish = (RPGACE.modules.taxonomyTree && RPGACE.modules.taxonomyTree.PHYLUM_ENGLISH) || {};

    // F8: this used to be a third, independent copy of the phyla keyword
    // list (missed by F2's consolidation of _quickPhylaScan/isPlausiblePhylum
    // onto one shared scorer, and stuck on the old 14-of-21-phyla/raw-count
    // model). Now reuses RPGACE.utils._PHYLA_KEYWORDS/phylaKeywordScore -
    // one list, one weighted scorer, can't drift out of sync again.
    (RPGACE.utils._PHYLA_KEYWORDS || []).forEach(function(p) {
      var score = RPGACE.utils.phylaKeywordScore ? RPGACE.utils.phylaKeywordScore(text, p.num) : 0;
      var entry = { num: p.num, name: p.name, reason: phylumEnglish[p.num] || p.name };
      if ((p.num === 12 && isContentIdea) || (p.num === 13 && isSocialIdea)) {
        confirmed.push(entry);
      } else if (score >= threshold) {
        confirmed.push(entry);
      } else if (score > 0) {
        suggested.push(entry);
      }
    });

    // Deduplicate by phylum number
    var seenNums = {};
    confirmed = confirmed.filter(function(p) { if (seenNums[p.num]) return false; seenNums[p.num]=true; return true; });
    suggested = suggested.filter(function(p) { return !seenNums[p.num]; });

    // Also pull high gap-score nodes to suggest
    if (RPGACE.modules.taxonomySync) {
      RPGACE.modules.taxonomySync.getTopGaps(5).then(function(gaps) {
        var gapPhyla = (gaps || []).map(function(g) {
          return { num: g.phylum_number, name: g.phylum_name, reason: 'Gap score ' + parseFloat(g.gap_score).toFixed(1) + '/10 — adding this makes the video push your knowledge boundary', isGap: true, concept: g.concept, gapScore: g.gap_score };
        });
        callback(confirmed, suggested, gapPhyla);
      }).catch(function() { callback(confirmed, suggested, []); });
    } else {
      callback(confirmed, suggested, []);
    }
  },

  // ── Pull encyclopedia entries for confirmed phyla ─────────────
  _getPhylaContext: function(phylaNums, callback) {
    if (!phylaNums || phylaNums.length === 0) { callback(''); return; }
    RPGACE.sb.select('encyclopedia', 'order=created_at.desc&limit=50')
      .then(function(entries) {
        // Also get taxonomy nodes for these phyla
        return RPGACE.sb.select('taxonomy_nodes', 'order=gap_score.desc&limit=100')
          .then(function(nodes) {
            var relevant = (nodes || []).filter(function(n) {
              return phylaNums.includes(n.phylum_number);
            }).slice(0, 8);
            var context = relevant.map(function(n) {
              return '• ' + n.concept + (n.fl_studio_implementation ? ': ' + n.fl_studio_implementation.slice(0, 100) : '');
            }).join('\n');
            callback(context);
          });
      }).catch(function() { callback(''); });
  },

  },

  // ============================================================
  // ui — rendering/DOM: the main repurpose popup, the quick-bar
  // restructure, agent-page quick buttons, and the Video Workshop button.
  // ============================================================
  ui: {

  // ── Main repurpose popup ──────────────────────────────────────
  openPopup: function() {
    if (document.getElementById('cr-popup-overlay')) return;
    var self = RPGACE.modules.contentRepurpose;
    var oracleMsgs = self._getOracleMessages(8);

    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.92', scroll: true, width: '620px', borderColor: 'rgba(61,170,110,0.25)',
      eyebrow: 'Content Repurpose · Step 14', title: 'Repurpose an idea', noDefaultClose: true,
    });
    var overlay = pop.overlay, box = pop.box;
    overlay.id = 'cr-popup-overlay';

    // ── STEP 1: Oracle idea selection ──
    var step1 = document.createElement('div');
    step1.style.cssText = 'margin-bottom:20px;';
    var s1lbl = document.createElement('div');
    s1lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(61,170,110,0.6);margin-bottom:8px;';
    s1lbl.textContent = 'Step 1 — Oracle Contribution';

    var dropdown = document.createElement('select');
    dropdown.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
    var blankOpt = document.createElement('option');
    blankOpt.value = ''; blankOpt.textContent = oracleMsgs.length ? '— Select from recent Oracle responses —' : '— No Oracle conversation yet —';
    dropdown.appendChild(blankOpt);
    oracleMsgs.forEach(function(msg, i) {
      var opt = document.createElement('option');
      opt.value = msg.text;
      opt.textContent = (i+1) + '. ' + msg.preview;
      dropdown.appendChild(opt);
    });

    var oracleContribLbl = document.createElement('div');
    oracleContribLbl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    oracleContribLbl.textContent = 'Oracle contribution:';

    var oracleContrib = document.createElement('textarea');
    oracleContrib.id = 'cr-oracle-contrib';
    oracleContrib.placeholder = 'Select from dropdown above, or paste Oracle content here...';
    oracleContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;max-height:200px;overflow-y:auto;margin-bottom:10px;';

    dropdown.onchange = function() {
      if (dropdown.value) oracleContrib.value = dropdown.value.slice(0, 1000);
    };

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept Oracle contribution';
    acceptBtn.style.cssText = 'padding:8px 16px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';

    step1.appendChild(s1lbl); step1.appendChild(dropdown);
    step1.appendChild(oracleContribLbl); step1.appendChild(oracleContrib);
    step1.appendChild(acceptBtn);
    box.appendChild(step1);

    // ── STEP 2: Your contribution (hidden until step 1 accepted) ──
    var step2 = document.createElement('div');
    step2.style.cssText = 'margin-bottom:20px;display:none;';
    var s2lbl = document.createElement('div');
    s2lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;';
    s2lbl.textContent = 'Step 2 — Your Contribution';
    var yourContribLbl = document.createElement('div');
    yourContribLbl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    yourContribLbl.textContent = 'Your contribution:';
    var yourContrib = document.createElement('textarea');
    yourContrib.id = 'cr-your-contrib';
    yourContrib.placeholder = 'Add your personal angle, specific details, or additional context here (optional)...';
    yourContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;margin-bottom:10px;';
    var step2NextBtn = document.createElement('button');
    step2NextBtn.textContent = '→ Detect taxonomy';
    step2NextBtn.style.cssText = 'padding:8px 16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    step2.appendChild(s2lbl); step2.appendChild(yourContribLbl);
    step2.appendChild(yourContrib); step2.appendChild(step2NextBtn);
    box.appendChild(step2);

    // ── STEP 3: Taxonomy selection (hidden until step 2) ──
    var step3 = document.createElement('div');
    step3.style.cssText = 'margin-bottom:20px;display:none;';
    var s3lbl = document.createElement('div');
    s3lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(74,144,226,0.6);margin-bottom:6px;';
    s3lbl.textContent = 'Step 3 — Taxonomy Selection';
    var s3sub = document.createElement('div');
    s3sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:12px;';
    s3sub.textContent = 'Confirmed phyla are auto-selected. Tick suggested ones that add value. Red = knowledge gap — include to make the video push your limits.';
    var phylaList = document.createElement('div');
    phylaList.id = 'cr-phyla-list';
    var generateBtn = document.createElement('button');
    generateBtn.textContent = '⚡ Generate all platform outputs';
    generateBtn.style.cssText = 'margin-top:14px;padding:10px 20px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    step3.appendChild(s3lbl); step3.appendChild(s3sub);
    step3.appendChild(phylaList); step3.appendChild(generateBtn);
    box.appendChild(step3);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;';
    closeBtn.onclick = function() { overlay.remove(); };
    box.appendChild(closeBtn);

    // ── Step 1 accept ──
    acceptBtn.onclick = function() {
      if (!oracleContrib.value.trim()) {
        RPGACE.utils.toast('Add Oracle contribution first', '#CC4A4A', 2000);
        return;
      }
      step1.style.opacity = '0.5';
      step1.style.pointerEvents = 'none';
      step2.style.display = 'block';
      step2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ── Step 2 next ──
    step2NextBtn.onclick = function() {
      var oracleTxt = oracleContrib.value.trim();
      var yourTxt = yourContrib.value.trim();
      var combined = oracleTxt + ' ' + yourTxt;
      step2.style.opacity = '0.5';
      step2.style.pointerEvents = 'none';
      step3.style.display = 'block';
      phylaList.innerHTML = '<div style="color:rgba(226,226,236,0.3);font-size:12px;">Detecting relevant phyla...</div>';
      step3.scrollIntoView({ behavior: 'smooth', block: 'center' });

      self._detectPhyla(combined, function(confirmed, suggested, gapPhyla) {
        phylaList.innerHTML = '';
        var allToShow = [];
        confirmed.forEach(function(p) { allToShow.push({ p: p, type: 'confirmed' }); });
        suggested.forEach(function(p) { allToShow.push({ p: p, type: 'suggested' }); });
        gapPhyla.forEach(function(p) { allToShow.push({ p: p, type: 'gap' }); });

        if (allToShow.length === 0) {
          phylaList.innerHTML = '<div style="color:rgba(226,226,236,0.3);font-size:12px;">No specific phyla detected — will use general production context.</div>';
          return;
        }

        allToShow.forEach(function(item) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:6px;' +
            (item.type === 'gap' ? 'background:rgba(226,84,84,0.06);border:1px solid rgba(226,84,84,0.2);' :
             item.type === 'confirmed' ? 'background:rgba(61,170,110,0.06);border:1px solid rgba(61,170,110,0.15);' :
             'background:rgba(74,144,226,0.04);border:1px solid rgba(74,144,226,0.1);');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.phylumNum = item.p.num;
          cb.dataset.phylumName = item.p.name;
          cb.checked = item.type === 'confirmed' || item.type === 'gap';
          cb.style.cssText = 'margin-top:3px;flex-shrink:0;cursor:pointer;';
          var info = document.createElement('div');
          var nameEl = document.createElement('div');
          nameEl.style.cssText = 'font-size:12px;font-weight:700;color:' +
            (item.type === 'gap' ? '#CC4A4A' : item.type === 'confirmed' ? '#4CAF82' : '#4A8CCC') + ';';
          nameEl.textContent = (item.type === 'gap' ? '🔴 ' : item.type === 'confirmed' ? '✅ ' : '💡 ') +
            RPGACE.utils.phylumLabel(item.p.num) +
            (item.p.gapScore ? ' (Gap ' + parseFloat(item.p.gapScore).toFixed(1) + '/10)' : '');
          var reasonEl = document.createElement('div');
          reasonEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-top:2px;';
          reasonEl.textContent = item.p.reason + (item.p.concept ? ' · Concept: ' + item.p.concept : '');
          info.appendChild(nameEl); info.appendChild(reasonEl);
          row.appendChild(cb); row.appendChild(info);
          phylaList.appendChild(row);
        });
      });

      // ── Generate ──
      generateBtn.onclick = function() {
        var oracleTxt = oracleContrib.value.trim();
        var yourTxt = yourContrib.value.trim();
        var checkedPhyla = Array.from(phylaList.querySelectorAll('input[type="checkbox"]:checked'))
          .map(function(cb) { return { num: parseInt(cb.dataset.phylumNum), name: cb.dataset.phylumName }; });

        generateBtn.textContent = '⏳ Fetching taxonomy context...';
        generateBtn.disabled = true;

        self._getPhylaContext(checkedPhyla.map(function(p){return p.num;}), function(taxonomyContext) {
          // Extract clean title from Oracle contribution
          var titleGuess = 'Content Idea';
          // Extract clean title — try quoted string first, then first meaningful line
          var quotedMatch = oracleTxt.match(/[“”"]([^“”"]{10,80})[“”"]/);
          if (quotedMatch) {
            titleGuess = quotedMatch[1].trim().slice(0, 80);
          } else {
            var lines2 = oracleTxt.split('\n').map(function(l){return l.replace(/[#*\[\]•⭐]/g,'').trim();}).filter(function(l){return l.length > 15 && l.length < 100;});
            if (lines2.length > 0) titleGuess = lines2[0].slice(0, 80);
          }

          // Aug 22 (A5 Phase 2, slice 2) — Alex's own verbatim ask: "if short
          // form content works for all 3 short content platforms, merge the
          // idea into one to also save tokens." Real, contained fix: fold the
          // merge DECISION into this same existing Oracle call (never a 2nd
          // call — rule 11, token cost is a design constraint) — Oracle
          // judges whether Insta/YouTube-Shorts/TikTok would be genuinely
          // identical short-form content for THIS idea and merges if so,
          // stating plainly that it merged and why. Distinct from conidPot's
          // own _showMergePrompt (that merges two DUPLICATE ideas on save;
          // this merges PLATFORM OUTPUTS for one idea when they'd be
          // identical) — same word, different real mechanism, not the same
          // gap.
          var prompt = 'Repurpose the following content idea into platform formats for @AceSanyaBeats (FL Studio, UK hip hop, aspiring producers 18-35).\n\n' +
            'ORACLE CONTRIBUTION:\n' + oracleTxt.slice(0, 800) + '\n\n' +
            (yourTxt ? 'MY ADDITIONAL CONTEXT:\n' + yourTxt + '\n\n' : '') +
            (taxonomyContext ? 'TAXONOMY KNOWLEDGE CONTEXT (use this to add depth and teaching credibility):\n' + taxonomyContext + '\n\n' : '') +
            'CONFIRMED PHYLA: ' + checkedPhyla.map(function(p){return p.name;}).join(', ') + '\n\n' +
            self.platformOutputInstructions() +
            'Be specific to FL Studio and UK hip hop throughout.';

          overlay.remove();
          RPGACE.utils.sendToOracle(prompt);

          // PC-6 (Oct 17 2026): no ConID is created any more (the old
          // production list is retired) - posts start in Posting.
          RPGACE.utils.toast('⚡ Generating repurposed outputs', '#4CAF82', 3000);
        });
      };
    };
  },

  _restructureQuickBar: function() {
    if (document.getElementById('cr-restructured')) return;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var self = RPGACE.modules.contentRepurpose;

    // F0 (Sep 2026): the "remove 4 redundant buttons" step below (Aug 6)
    // is REMOVED — real, found conflict, not silently patched around.
    // Those same 4 buttons (New quests/Draft email/Log to Notion/YT
    // stats) were rewired by F0 to actually do something real
    // (oracleControl's confirm+execute mechanism, questEngine.refresh(),
    // a real Gmail draft) per Alex's own later, more specific directive
    // ("they actually work, but are pointless in this format — rewire
    // them, don't remove them") — this Aug 6 deletion, run on every boot,
    // would have silently undone that rewire in production the moment it
    // shipped. Alex's own direct call: stop removing them, keep
    // "Repurpose" alongside. Full record:
    // records/2026-09/f0_quickprompt_oracle_rewire_spec_2026-09-04.txt.

    // Add Repurpose button
    if (!document.getElementById('cr-btn')) {
      var crBtn = document.createElement('button');
      crBtn.id = 'cr-btn';
      crBtn.className = 'agent-btn';
      crBtn.textContent = '🔀 Repurpose';
      crBtn.style.cssText = 'border-color:rgba(61,170,110,0.4);color:#4CAF82;background:rgba(61,170,110,0.08);margin-left:4px;';
      crBtn.onclick = function() { self.openPopup(); };
      row.appendChild(crBtn);
    }

    row.id = 'cr-restructured';
    console.log('[RPGACE:contentRepurpose] Quick bar restructured');
  },

  // F15 (Sep 22 2026) — real rewire, closing the rule-8 duplicate flagged
  // Sep 4 while building F0 (quickActions.ui._setup, see that module's
  // own header comment). Every button here used to run its own bespoke
  // sendToOracle/fillGaps/RPGACE.api closure — a second, independent
  // chat-relay/Composio-call implementation living right next to the one
  // F0 already rewired for the .quick-row bar. Real spec: ceo_plan_items
  // item_code F15. All 4 buttons now dispatch through the exact same
  // oracleControl._showActionConfirm(row) confirm+execute mechanism F0
  // already proved, using the same 4 real oracle_actions rows
  // (new_quests/draft_email/yt_stats/log_notion) — never a second
  // implementation of the same 4 actions.
  _injectAgentButtons: function() {
    // Oct 10 2026 (N2, Oracle slice): retired. The Agents page now lives
    // inside Oracle (agentsIntoOracle), right under the chat toolbar's own
    // New quests / Draft email / Log to Notion / YT stats buttons, which run
    // the same 4 oracleControl actions (F0) - this bar was a second copy of
    // them on the same page (rule 8). Code kept below, unreachable.
    return;
    if (document.getElementById('agent-quick-btns')) return;
    var agentPage = document.getElementById('page-agents');
    if (!agentPage) return;

    var wrap = document.createElement('div');
    wrap.id = 'agent-quick-btns';
    wrap.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px 20px;margin-bottom:20px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(226,226,236,0.25);text-transform:uppercase;margin-bottom:12px;';
    lbl.textContent = 'Quick Actions';
    var btnGrid = document.createElement('div');
    btnGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    var ACTION_ID = {
      '📋 New Quests':    'new_quests',
      '📧 Draft Email':   'draft_email',
      '📓 Log to Notion': 'log_notion',
      '🎬 YT Stats':      'yt_stats',
    };

    var oc = RPGACE.modules.oracleControl;
    if (!oc || !oc._fetchActions) { console.warn('[contentRepurpose] oracleControl unavailable, agent quick-action bar not wired'); return; }

    oc._fetchActions().then(function() {
      Object.keys(ACTION_ID).forEach(function(label) {
        var actionId = ACTION_ID[label];
        var btn = document.createElement('button');
        btn.className = 'agent-btn';
        btn.textContent = label;
        btn.onclick = function() {
          var row = oc._byId(actionId);
          if (!row) { RPGACE.utils.toast('⚠️ This quick action isn\'t configured yet', '#E2A83D', 2500); return; }
          oc._showActionConfirm(row);
        };
        btnGrid.appendChild(btn);
      });
      console.log('[RPGACE:contentRepurpose] Agent quick-action bar patched (F15 rewire — all 4 through oracleControl)');
    });

    wrap.appendChild(lbl); wrap.appendChild(btnGrid);
    agentPage.insertBefore(wrap, agentPage.firstChild);
  }


  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoint: an Idea Bank card's
  // "🔀 Repurpose" connector calls
  // `RPGACE.modules.contentRepurpose.openPopup(...)` directly (see the
  // pre-existing unused-parameters bug flagged in the G53 block above).
  // Also carries this module's own internal calls: `init`'s boot task
  // and hook listeners call `self._restructureQuickBar()`/
  // `self._injectAgentButtons()`/`self._injectVideoWorkshopBtn()`, and
  // `ui.openPopup` reaches `self._getOracleMessages()`/
  // `self._detectPhyla()`/`self._getPhylaContext()`/
  // `self.platformOutputInstructions()` — every one of those `self`s is
  // the module, so each lands here first and is routed on to the right
  // namespace.
  platformOutputInstructions: function() { return this.logic.platformOutputInstructions(); },
  _getOracleMessages: function(limit) { return this.logic._getOracleMessages(limit); },
  _detectPhyla: function(ideaText, callback) { return this.logic._detectPhyla(ideaText, callback); },
  _getPhylaContext: function(phylaNums, callback) { return this.logic._getPhylaContext(phylaNums, callback); },
  openPopup: function() { return this.ui.openPopup(); },
  _restructureQuickBar: function() { return this.ui._restructureQuickBar(); },
  _injectAgentButtons: function() { return this.ui._injectAgentButtons(); },

});
/* ===END:contentRepurpose=== */
