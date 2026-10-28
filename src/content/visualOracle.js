
/* ===MODULE:visualOracle=== */
RPGACE.register('visualOracle', {
  domain: 'content',

  // Engineer pass 2026-07-30 — Neural Frames replaced with OpenMontage
  // throughout (Alex's own call: Neural Frames is the old idea, RPGACE's
  // real operated video-generation tool per the July 24 Aintergration
  // verdict is OpenMontage — adopted as a separate operated tool, never
  // embedded in RPGACE's own runtime, so these commands generate a real
  // OpenMontage-ready brief rather than a single AI-video-prompt string).
  CMDS: [
    ['Copyright Risk Analyser', 'Analyse the copyright risk of my planned music video concept. CONCEPT: [DESCRIBE YOUR VIDEO CONCEPT IN DETAIL] VISUAL REFERENCES: [LIST ANY FILMS, MUSIC VIDEOS, OR DIRECTORS YOU PLAN TO REFERENCE] FOOTAGE SOURCES: [LIST WHERE YOU PLAN TO SOURCE FOOTAGE — stock, self-shot, archival, AI-generated]. For each element: copyright risk level (Low / Medium / High), what specifically creates the risk, how to modify the concept to eliminate or reduce the risk, and safe alternative approaches. End with an overall risk score and a clear/proceed/modify verdict.'],
    ['Mood Board Brief', 'Create a detailed mood board brief for my beat visual. BEAT DESCRIPTION: [DESCRIBE YOUR BEAT — genre, mood, key, BPM, feel] TARGET PLATFORM: [YOUTUBE / INSTAGRAM / BEATSTARS / ALL]. The brief must specify: 5 colour hex codes with usage ratios, 3 texture references (describe the material/surface quality), lighting direction (quality, direction, colour temperature), typography direction if text appears, 5 specific shot types with descriptions, 3 real-world location types that fit, and 3 visual DONTs for this concept. Format this so I can hand it directly to a designer or use it in Canva.'],
    ['Storyboard Scene Builder', 'Build a shot-by-shot storyboard for my music video. SONG SECTION: [INTRO / VERSE / CHORUS / BRIDGE / OUTRO — choose one, or ALL] DURATION: [TYPE THE SECTION LENGTH IN SECONDS] VISUAL STYLE: [TYPE YOUR VISUAL DIRECTION — e.g. dark cinematic UK drill, lo-fi nostalgic, futuristic minimal] LOCATION: [TYPE YOUR PLANNED LOCATION OR WRITE "studio" / "street" / "AI-generated"]. For each shot: shot number, shot type (close-up / medium / wide / extreme close-up), camera movement, subject action, duration in seconds, lighting note, and cut type to next shot. End with a total shot count and pacing assessment. '],
    ['OpenMontage Brief', 'Generate 3 OpenMontage production briefs for my beat. BEAT FEEL: [DESCRIBE IN 5 WORDS] COLOUR DIRECTION: [TYPE 2-3 COLOURS OR A PALETTE NAME] SUBJECT: [TYPE WHAT SHOULD APPEAR — abstract, character, landscape, object] AVOID: [TYPE ANYTHING YOU DO NOT WANT — faces, text, specific styles]. For each brief: a 100-word OpenMontage production brief (visual concept, pacing, shot suggestions) optimised for beat-sync, the recommended motion intensity setting (Low / Medium / High / Extreme), the recommended style preset if applicable, and what this brief will generate visually. Label them Option A (safest), Option B (most striking), Option C (most experimental).'],
  ],

  // Doc-type slug per CMDS index — used as the key when saving a response
  // into content_productions.creative_docs (2026-07-28 Content Pipeline
  // overseer build, Alex-confirmed forks).
  DOC_SLUGS: ['copyright_risk', 'mood_board', 'storyboard', 'openmontage_brief'],

  ICONS: ['⚠️','🎨','🎞️','🎥'],

  _pendingCapture: false,

  // G53 (Sep 2026) split note: ui holds real DOM construction (the
  // quick-row button injection, the slide-in command panel, and both
  // popup pickers). logic holds pure Supabase-read/text-building work
  // with zero DOM refs (the filmmaker-library fetch, the shared
  // response-capture guard, and the creative_docs/style_profiles/
  // video_jobs save chain). Every moved function was MOVED wholesale,
  // never rewritten. Any function that reads a module-scope field
  // (CMDS/DOC_SLUGS/ICONS/_pendingCapture) or calls a sibling method
  // resolves through `var self = RPGACE.modules.visualOracle;`, never
  // bare `this.` - a function invoked as ui.X()/logic.X() has `this`
  // bound to that sub-object, not the module.

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._inject(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._inject(); }, 600);
    });
  },

  // ui - rendering/DOM.
  ui: {

  _inject: function() {
    if (document.getElementById('visual-oracle-btn')) return;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var btn = document.createElement('button');
    btn.id = 'visual-oracle-btn';
    btn.className = 'agent-btn';
    btn.textContent = '🎬 Visual Oracle';
    btn.style.cssText = 'border-color:rgba(155,89,182,0.4);color:#9B6EC8;background:rgba(155,89,182,0.08);margin-left:4px;';
    btn.onclick = function() { RPGACE.modules.visualOracle.open(); };
    row.appendChild(btn);
    console.log('[RPGACE:visualOracle] Button injected');
  },

  _close: function() {
    RPGACE.ui.slideOutPanel(document.getElementById('visual-op'), 'right');
  },

  open: function() {
    var self = RPGACE.modules.visualOracle;
    if (document.getElementById('visual-op')) { self._close(); return; }
    var panel = document.createElement('div');
    panel.id = 'visual-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(155,89,182,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(155,89,182,0.06);border-bottom:1px solid rgba(155,89,182,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'VISUAL ORACLE';
    lb.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = RPGACE.utils.phylumLabel(14) + ' · 4 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#D4DAF5;';
    ht.appendChild(lb); ht.appendChild(sub);
    var cb = document.createElement('button');
    cb.textContent = '×';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';

    var note = document.createElement('div');
    note.textContent = '4 COMMANDS';
    note.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    var phNote = document.createElement('div');
    phNote.textContent = RPGACE.utils.phylumContext(14);
    phNote.style.cssText = 'font-size:11px;color:rgba(155,89,182,0.6);margin-bottom:14px;letter-spacing:1px;border-left:2px solid rgba(155,89,182,0.3);padding-left:8px;line-height:1.5;';
    body.appendChild(phNote);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '🎬'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(155,89,182,0.08)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() {
        self._close();
        // 2026-07-28 - arm the shared response capture right before the
        // filled prompt is actually sent, so whichever reply comes back
        // next can be offered a "save to Content Pipeline" picker (Content
        // Pipeline overseer build, Alex-confirmed forks). Every command
        // gets the offer, not just the 4 flagged as real per-project
        // candidates in the plan - a save button costing nothing to
        // ignore is simpler than special-casing which commands get one.
        // Aug 6 (Engineer pass, real Content Pipeline bugfix) — send
        // first, only arm the save-picker capture if it actually sent
        // (see _sendFilledPromptToOracle's own comment for the full real
        // root-cause evidence this pattern fixes).
        var proceed = function(promptText) {
          RPGACE.utils.fillGaps(promptText, function(filled) {
            var input = document.querySelector('#chat-input');
            if (!input) return;
            input.value = filled;
            input.dispatchEvent(new Event('input', {bubbles:true}));
            var sent = (typeof sendChat === 'function') ? (sendChat() !== false) : true;
            if (sent) {
              self._captureNextResponse(function(text) {
                self._showSaveToPipelinePicker(self.DOC_SLUGS[i], text);
              });
            } else {
              RPGACE.utils.toast('⏳ Oracle was still busy — try this command again in a moment', '#E2A83D', 3500);
            }
          });
        };
        proceed(cmd[1]);
      };
      body.appendChild(btn);
    });

    panel.appendChild(body);
    RPGACE.ui.slideInPanel(panel, {edge:'right'});
  },


  // Manual save picker - shown after any of the 6 commands completes
  // (Fork 3, Alex-confirmed: explicit picker, not an ambient "active
  // production" context - that idea is logged as a real future
  // enhancement, not built, per the same spec backlog). Lists recent
  // content_productions rows so Alex can pick a target; calls the same
  // _saveDocToProduction logic the automatic flow uses.
  _showSaveToPipelinePicker: function(docSlug, text) {
    var self = RPGACE.modules.visualOracle;
    RPGACE.sb.select('content_productions', 'select=id,con_id,title&order=created_at.desc&limit=15')
      .then(function(rows) {
        rows = rows || [];
        var pop = RPGACE.modules.dashDeck._popup({
          dim: '0.9', width: '420px', borderColor: 'rgba(155,89,182,0.25)',
          title: '💾 Save to Content Pipeline', closeLabel: 'Skip',
        });
        var box = pop.box;

        if (rows.length === 0) {
          var msg = document.createElement('div');
          msg.style.cssText = 'color:rgba(226,226,236,0.4);font-size:12px;margin-bottom:16px;';
          msg.textContent = 'No Content Pipeline entries yet.';
          box.appendChild(msg);
        } else {
          var sel = document.createElement('select');
          sel.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:16px;';
          rows.forEach(function(r) {
            var opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = '#' + r.con_id + ' — ' + r.title;
            sel.appendChild(opt);
          });
          box.appendChild(sel);
        }

        var saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save';
        saveBtn.disabled = rows.length === 0;
        saveBtn.style.cssText = 'width:100%;padding:10px;margin-bottom:8px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:6px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        saveBtn.onclick = function() {
          var selEl = box.querySelector('select');
          var productionId = selEl ? selEl.value : null;
          pop.close();
          if (productionId) self._saveDocToProduction(docSlug, text, productionId);
        };
        box.appendChild(saveBtn);
      })
      .catch(function() {});
  },

  },

  // logic - business logic/data.
  logic: {


  // ── Content Pipeline overseer build (2026-07-28, Alex-confirmed forks:
  // content_pipeline_overseer_spec_backlog_2026-07-28.txt) ──────────────
  // Shared one-shot capture: waits for the very next completed Oracle
  // response and hands its full text to callback, then detaches. Reused
  // by beatLog's automatic F18 Visual Treatment flow AND the manual
  // "save to Content Pipeline" picker below - one real mechanism, not
  // two hand-rolled waits (rule 8). Built on the existing
  // 'oracle:response-scanned' hook (fires once per completed reply,
  // already relied on by kg-panel/phylumPath's own auto-detect) rather
  // than a second MutationObserver.
  // Aug 31 2026 — real, confirmed bug: 2 overlapping captures (e.g. a
  // Visual Treatment started on one ConID while an earlier one on a
  // DIFFERENT ConID hadn't returned yet) both stay armed on this same
  // shared hook with zero request correlation - whichever Oracle reply
  // arrives first gets grabbed by whichever capture armed first,
  // regardless of which job it was actually for. Confirmed live: a
  // "Turnover" ConID's creative_docs ended up holding an "Asylum" beat's
  // Visual Treatment text. This is a DIFFERENT, deeper flavor of the
  // already-documented Aug 6 dangling-capture bug (that fix only covered
  // a capture left armed by a FAILED send - this covers two SUCCESSFUL
  // sends racing each other). Real fix: refuse a second arm while one is
  // still outstanding, fail loud (toast) instead of silently
  // cross-consuming - forces one Oracle round-trip to finish before the
  // next one starts, which is the only way to guarantee correct
  // attribution without a much larger request-correlation rewrite across
  // every real call site (rule 11 - proportionate to the actual risk).
  // Real bug found live (Alex report: recipe generation + the "Suggest
  // 5 ideas" narrow-down dropdown appearing to silently do nothing) -
  // BOTH failure paths below (the busy-guard's early return, and the
  // 90s timeout) released the pending-capture lock but NEVER told the
  // caller anything happened - `callback` simply never fired. Every
  // caller that shows a loading/disabled button state while waiting
  // (cookingOracle's Generate/Suggest-5-ideas/Suggest-additions flows
  // among them) had no way to know the wait had ended in failure, so
  // that button stayed stuck on its loading text FOREVER with zero
  // error shown - indistinguishable from "nothing is happening."
  // Fixed with a real, optional 2nd `onFail(reason)` param, `reason`
  // one of 'busy'|'timeout' - deliberately backward compatible (rule 8,
  // one shared implementation, not a per-caller patch): every EXISTING
  // 1-arg caller (`callback` only) is completely unaffected, since
  // `onFail` is simply undefined there and every call below is
  // `if (onFail) onFail(...)` - their own pre-existing "hangs silently
  // on failure" gap is untouched, not fixed and not worsened, out of
  // scope for this pass. Only callers that explicitly opt in (the 3
  // real cookingOracle generation call sites, wired the same session)
  // get the real fail-loud behavior rule 7 already requires everywhere
  // else in this project.
  _captureNextResponse: function(callback, onFail) {
    var self = RPGACE.modules.visualOracle;
    if (self._pendingCapture) {
      RPGACE.utils.toast('⚠️ Another Oracle reply is still pending — wait for it to finish before starting a new Visual Treatment/action, or it can save into the wrong ConID', '#CC4A4A', 5000);
      if (onFail) onFail('busy');
      return;
    }
    self._pendingCapture = true;
    // Real safety release: oracle:response-scanned only fires off a
    // successfully RENDERED chat reply (RPGACE.utils._runPhylaScan scans
    // the actual DOM) - if Oracle's own call fails/times out server-side
    // after a confirmed send (no reply ever renders), this flag would
    // otherwise get stuck true forever, permanently blocking every future
    // capture. 90s comfortably covers a real Visual Treatment Doc's own
    // observed reply time; clearing it after that is strictly safer than
    // a permanent lock, even in the rare case a genuinely slow reply
    // still lands right after.
    var timedOut = false;
    var timer = setTimeout(function() {
      timedOut = true;
      self._pendingCapture = false;
      if (onFail) onFail('timeout');
    }, 90000);
    var off = RPGACE.hooks.on('oracle:response-scanned', function(text) {
      off();
      if (timedOut) return; // already released; a late reply just isn't captured
      clearTimeout(timer);
      self._pendingCapture = false;
      callback(text);
    });
  },

  _saveDocToProduction: function(docSlug, text, productionId) {
    if (!productionId) {
      RPGACE.utils.toast('⚠️ Could not save ' + docSlug.replace(/_/g, ' ') + ' — no beat linked', '#E2A83D', 3500, 'visualOracle');
      return;
    }
    // PC-6 (Oct 17 2026): just stores the text under creative_docs[docSlug]
    // on the beat; the old status jumps (Scripted/Posted) and the
    // DIRECTOR_CHOSEN / EDL_JSON parsing went with the retired video tools.
    RPGACE.sb.select('content_productions', 'id=eq.' + productionId + '&select=creative_docs&limit=1')
      .then(function(rows) {
        var existing = (rows && rows[0] && rows[0].creative_docs) || {};
        existing[docSlug] = text;
        return RPGACE.sb.secureWrite('content_productions', 'update', { creative_docs: existing, updated_at: new Date().toISOString() }, 'id=eq.' + productionId);
      })
      .then(function() { RPGACE.utils.toast('💾 Saved ' + docSlug.replace(/_/g, ' ') + ' on the beat', '#9B6EC8', 2500); })
      .catch(function(e) {
        RPGACE.utils.toast('⚠️ Failed to save ' + docSlug.replace(/_/g, ' ') + ': ' + e.message, '#CC4A4A', 4000, 'visualOracle');
      });
  },

  },

  // Thin top-level pass-throughs - preserve the exact existing public
  // API. See ui/logic above for the real implementations.
  _inject: function() { return this.ui._inject(); },
  _close: function() { return this.ui._close(); },
  open: function() { return this.ui.open(); },
  _showSaveToPipelinePicker: function(docSlug, text) { return this.ui._showSaveToPipelinePicker(docSlug, text); },
  _captureNextResponse: function(callback, onFail) { return this.logic._captureNextResponse(callback, onFail); },
  _saveDocToProduction: function(docSlug, text, productionId) { return this.logic._saveDocToProduction(docSlug, text, productionId); },

});
/* ===END:visualOracle=== */
