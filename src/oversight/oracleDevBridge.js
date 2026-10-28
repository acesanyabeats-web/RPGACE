
/* ===MODULE:oracleDevBridge=== */
// July 22 — Phase 2 of the same request: the "Oracle suggests back to
// Orchestrator CC" bridge (renamed Aug 13 from "Claude Code" — Total
// Systems now has 3 real Claude Code sessions, so the generic name had
// gone ambiguous; this table has only ever been read by THIS session,
// the orchestrator, per CLAUDE.md's own session-start-check convention)
// CLAUDE.md already specs (RPGACE_ORACLE_NOTES.md)
// but which was never built, and which can't work exactly as originally
// written - Oracle runs as a stateless Vercel serverless function with no
// persistent or git-writable filesystem, so it can never literally edit
// a markdown file. Corrected transport: a Supabase table, the same way
// everything else in this app persists anything. Requires the
// oracle_dev_suggestions table to exist - see patch_notes for the exact
// migration and Alex's confirmation before it was applied.
//
// UX: reuses the existing 'oracle:response-scanned' hook (fired once per
// completed Oracle reply, already relied on by phylumPath's auto-detect
// badge) instead of installing a second MutationObserver on the chat box -
// the exact duplication CLAUDE.md's landmines already flag as a bug found
// and fixed once. A manual click is the human checkpoint here (same
// philosophy as the taxonomy-write checkpoint, scaled down since this is
// an append-only text log, not a destructive or structural change) -
// nothing gets written to Supabase without Alex choosing to flag it.
RPGACE.register('oracleDevBridge', {
  domain: 'oversight',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the EIGHTEENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete, feynman, taxonomyReviewQueue, youtubeOracle,
  // tiktokOracle, instaOraclePanel, jargonEncyclopedia, encyclopediaQoL
  // and pathRouter): split into two internal namespaces, `ui`
  // (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape those seventeen already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle.
  //
  // 4 real members, checked by direct read of every top-level key
  // rather than assumed: 3 functions and ONE plain data field, `TABLE`
  // ('oracle_dev_suggestions'). That field STAYS AT MODULE SCOPE and
  // was not moved — see the dedicated requalification note below, which
  // is the single most dangerous line in this whole split. `init` stays
  // a literal top-level function (RPGACE.register() calls
  // `module.init()` directly and cannot see into a sub-object) —
  // byte-identical, its own `self = this` genuinely IS the module, so
  // its boot task still reaches `self._hook()` through the top-level
  // pass-through below.
  //
  // Classification, function by function, each checked against its
  // actual body rather than its name:
  //   • _hook → ui. Unambiguous on the primary rule: document.
  //     createElement, a full inline style/textContent build, and
  //     insertAdjacentElement onto a live chat message. It DISCOVERS
  //     and CONSTRUCTS DOM outright.
  //   • _flag → logic. SEE THE DEDICATED NOTE BELOW — this was the one
  //     genuinely open call in this module and is named here rather
  //     than decided quietly.
  //
  // ─── _flag: the open call, both readings stated ───────────────────
  // Two real, defensible readings existed:
  //   (a) `ui` — it directly mutates a DOM element's properties
  //       (`btn.disabled`, `btn.textContent`) in three separate places:
  //       the optimistic pre-write state, the success `.then`, and the
  //       failure `.catch`. A literal "does it touch DOM at all" test
  //       lands here.
  //   (b) `logic` — its DOMINANT RESPONSIBILITY is the async
  //       `RPGACE.sb.secureWrite(TABLE, 'insert', …)` plus the real
  //       16000-char truncation-with-marker decision that precedes it.
  //       It DISCOVERS and CONSTRUCTS zero DOM of its own: `btn`
  //       arrives as a caller-supplied handle, and there is no
  //       `document.*` / `createElement` / `querySelector` /
  //       `innerHTML` anywhere in the body. The button writes are
  //       success/failure FEEDBACK on that handle, not construction.
  // (b) was chosen. This is not a fresh judgment — it is the exact
  // shape videoSummary.logic._runRetro was already shipped on
  // ("MUTATE a DOM element, and only one handed to them by their
  // caller (`btn.disabled` / `btn.textContent` spinner state) —
  // neither constructs nor discovers one… and their real jobs are
  // data"), and contentProductionLive._generateBundle before that.
  // The counter-precedent that keeps the rule honest is
  // intelDelete.ui._hideCard, which has the SAME "mutates a handed-in
  // element" shape but was classified `ui` — because it has no data
  // job at all (a 180ms opacity fade is 100% presentation). That
  // discriminator is exactly what separates the two here: _flag's body
  // is a truncation decision plus a Supabase insert, so the data half
  // is real and dominant, and the `ui`/`logic` line falls on the
  // `logic` side. _hook is this module's deliberate counter-example
  // and stays `ui` — it genuinely builds an element from nothing.
  // The honest cost of (b), stated rather than hidden: a reader
  // scanning for "who touches this button" now finds the creation in
  // `ui` and the state changes in `logic`. That is the trade, made
  // deliberately, and it is the same trade every prior module in this
  // series already made.
  //
  // ─── the `this.TABLE` requalification — the real bug risk here ────
  // `_flag` read a bare `this.TABLE`. `TABLE` stays at module scope,
  // so inside `logic` that would have resolved to `logic.TABLE`, which
  // is `undefined` — and it fails LOUDLY but wrongly: the write would
  // have gone to `RPGACE.sb.secureWrite(undefined, 'insert', …)`,
  // hitting the write proxy with no table name at all. Every flag Alex
  // pressed would have failed, and the only surface would have been
  // the `.catch` toast. Requalified to
  // `RPGACE.modules.oracleDevBridge.TABLE` via the standard module
  // handle inserted as `_flag`'s first statement.
  //
  // `this`/`self` accounting for both moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _hook — references neither `this` nor `self`; its own onclick
  //     closure was ALREADY fully qualified as
  //     `RPGACE.modules.oracleDevBridge._flag(text, btn)` before this
  //     pass, so it moved byte-identical, no handle needed and none
  //     added. That pre-existing qualification is why the button still
  //     routes through the top-level pass-through correctly.
  //   • _flag — read bare `this.TABLE`; module handle inserted as its
  //     first statement, read rewritten to `self.TABLE` (see the
  //     dedicated note above).
  // ══════════════════════════════════════════════════════════════════

  TABLE: 'oracle_dev_suggestions',

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._hook(); });
  },

  // ============================================================
  // logic — business logic/data: no DOM construction or discovery.
  // The single Supabase write path for Oracle-flagged suggestions,
  // plus the truncation decision in front of it (see the dedicated
  // _flag note in the G53 block above for why it lands here despite
  // writing to a caller-supplied button).
  // ============================================================
  logic: {

    _flag: function(text, btn) {
      var self = RPGACE.modules.oracleDevBridge;
      btn.disabled = true;
      btn.textContent = '⏳ Logging...';
      // July 28: the old 4000-char cap silently cut off a real flagged
      // 5thDimension reply mid-sentence, with no indication to Alex that
      // anything was lost - `suggestion_text` is a plain unbounded `text`
      // column (confirmed via information_schema), so this was a client-
      // side-only limit, not a real DB constraint. Raised to 8000 at the time
      // (comfortably covered the then-current max_tokens:1200 reply cap).
      // Aug 6 (real /Summary review of this exact table's own rows) — that
      // cap is now itself stale: sendChat's callOracle cap was raised to
      // max_tokens:3000 on July 31 (a separate real fix, for a different
      // "reply cut off mid-document" complaint about Visual Treatment Docs)
      // and NEVER cross-checked against this flag cap. Real evidence: 6 of
      // 8 real flagged rows in this exact table between Aug 5-6 hit the old
      // 8000-char ceiling almost exactly and lost their endings — including
      // DIRECTOR_CHOSEN:/EDL_JSON: trailers and final scene breakdowns on
      // real Visual Treatment Docs. Raised to 16000 (comfortable headroom
      // over a 3000-token reply) with the same explicit-marker safety net
      // for anything that somehow still exceeds it.
      var toSave = text.length > 16000 ? (text.slice(0, 16000) + '\n\n[...truncated - original reply was ' + text.length + ' chars]') : text;
      RPGACE.sb.secureWrite(self.TABLE, 'insert', [{ suggestion_text: toSave, category: 'oracle-flagged', status: 'new', source: 'oracle' }])
      .then(function() {
        btn.textContent = '✓ Sent to Orchestrator CC';
        RPGACE.utils.toast('🧪 Logged for the next Orchestrator CC session', 'rgba(74,144,226,0.9)', 2400);
      }).catch(function(e) {
        btn.disabled = false;
        btn.textContent = '🧪 Flag to Orchestrator CC';
        RPGACE.utils.toast('⚠️ Could not log: ' + e.message, '#CC4A4A', 3200);
      });
    },

  },

  // ============================================================
  // ui — rendering/DOM. The one function here builds the flag button
  // from nothing (document.createElement + insertAdjacentElement) and
  // attaches it to a live Oracle chat message, on the shared
  // 'oracle:response-scanned' hook.
  // ============================================================
  ui: {

    _hook: function() {
      if (window._oracleDevBridgeHooked) return;
      window._oracleDevBridgeHooked = true;
      RPGACE.hooks.on('oracle:response-scanned', function(text, lastMsg) {
        if (!text || text.length < 40 || !lastMsg || !lastMsg.parentNode) return;
        if (lastMsg.nextElementSibling && lastMsg.nextElementSibling.classList && lastMsg.nextElementSibling.classList.contains('odb-flag-btn')) return;
        var btn = document.createElement('button');
        btn.className = 'odb-flag-btn';
        btn.textContent = '🧪 Flag to Orchestrator CC';
        btn.style.cssText = 'display:inline-block;background:none;border:1px solid rgba(74,144,226,.3);color:#4A8CCC;border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;margin:2px 0 8px 0;';
        btn.onclick = function() { RPGACE.modules.oracleDevBridge._flag(text, btn); };
        lastMsg.insertAdjacentElement('afterend', btn);
      });
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of the whole repo for `RPGACE.modules.oracleDevBridge.` and
  // of index.html both — the only hits are inside this module's own
  // body: `init`'s boot task calling `self._hook()`, and `ui._hook`'s
  // own injected onclick calling
  // `RPGACE.modules.oracleDevBridge._flag(text, btn)`, which was already
  // fully qualified before this pass). Both of those land here first and
  // are routed on to the right namespace.
  _flag: function(text, btn) { return this.logic._flag(text, btn); },
  _hook: function() { return this.ui._hook(); },

});
/* ===END:oracleDevBridge=== */
