/* ===END_DOMAIN:CONTENT=== */

/* ===DOMAIN:JOURNAL=== */

/* ===MODULE:morningBrief=== */
RPGACE.register('morningBrief', {
  domain: 'schedule',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 34 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // thirty-three predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL/shiftSync precedent, so the diff
  // shows only real changes rather than a whitespace wall.
  //
  // 8 real members: 7 functions and ONE declared data field,
  // `LAST_RUN_KEY`, which stays at module scope (three functions read
  // it — `ui._injectButton`, `logic._autoRun`, `ui._generate` — so it
  // would have to be duplicated or cross-referenced whichever
  // namespace it went into; module scope is where it already correctly
  // lives). Checked for the undeclared-runtime-field trap BOTH ways,
  // not assumed: a direct read of every top-level key, and a grep of
  // the whole module body for `self.X =` / `this.X =` (0 hits) — so
  // this module has none of what journalQoL's `_activeSource` and
  // oracleDevBridge's `this.TABLE` both hit. `init` stays a literal
  // top-level function (RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object) — byte-identical, its
  // own `self = this` genuinely IS the module, so its boot task and
  // `page:show` listener still reach `_injectButton`/`_autoRun`
  // through the top-level pass-throughs below.
  //
  // This module splits 2 ui / 5 logic. Classification, function by
  // function, each checked against its actual body rather than its
  // name:
  //   • _injectButton → ui. Unambiguous: two `getElementById` reads,
  //     six `document.createElement` calls, an `onclick` assignment,
  //     and the `#dd-stash-holder` discover-or-create-then-`appendChild`
  //     handoff to dashDeck (identical shape to knowledgeGap._inject).
  //     Its one non-DOM read, `localStorage.getItem(self.LAST_RUN_KEY)`,
  //     exists purely to word the "Last run: …" label it is building.
  //   • _autoRun → logic. Zero DOM of any kind (grepped, not assumed):
  //     a `localStorage` read, same-day and before-1pm date guards, an
  //     `authGate._apiSecret` readiness probe, and then either a 2s
  //     timer or a one-shot `RPGACE.hooks.on('rpgace:login', …)`
  //     subscription before calling `self._generate()`. `RPGACE.hooks`
  //     is this project's own event bus, NOT a DOM `addEventListener`
  //     — the distinction matters and is why this is not `ui`. Its real
  //     job is scheduling: should the brief run at all today, and when.
  //   • _generate → ui. SEE THE DEDICATED NOTE BELOW — it is the one
  //     genuine judgment call in this module.
  //   • _getGmail → logic. Pure `RPGACE.api('GMAIL_FETCH_EMAILS', …)`
  //     read, a defensive array coercion, a subject map, and a
  //     `.catch` returning a fallback shape. No DOM, no UI trigger.
  //   • _getShifts → logic. Pure `localStorage` read + date arithmetic
  //     over today's/tomorrow's shifts, wrapped in try/catch, returning
  //     a resolved promise. No DOM.
  //   • _getYouTube → logic. Pure `RPGACE.api('SUPADATA_GET_YOUTUBE_
  //     CHANNEL', …)` read plus a real `localStorage` PERSISTENCE write
  //     (`rpgace_yt_prev`, so the next brief can report a view delta).
  //     No DOM.
  //   • _getKnowledgeGaps → logic. Pure cross-module read via
  //     `RPGACE.modules.taxonomySync.getTopGaps(1)`. No DOM.
  //
  // ─── _generate: why the whole function lands in `ui` ──────────────
  // A real case exists for calling it `logic`: the bulk of its line
  // count is data orchestration (a `Promise.all` over the four
  // `logic._getX` readers, a nested `conidPot.getIdeasForBrief()`
  // promise, a day-of-week rotation label, and the assembly of the
  // ~30-line Morning Brief prompt string) and its final act is
  // `RPGACE.utils.sendToOracle(prompt)` plus a `localStorage.setItem`
  // — both of which are, on this series' own standing rules,
  // respectively a TRIGGER of UI and a real persistence write.
  // It is nevertheless `ui`, on the INSEPARABLE FETCH+RENDER rule as
  // written — and this time the rule's precondition is genuinely met,
  // unlike knowledgeGap._load in the previous module of this same
  // batch. The distinction is worth stating exactly, since the two
  // functions sit one batch apart and look superficially similar:
  //   • It DISCOVERS the DOM node first: `var output =
  //     document.getElementById('mb-output')` is its opening line, and
  //     `if (!output) return;` on the next line means the function
  //     refuses to do ANY of its data work at all without that node.
  //     The fetch is downstream of the DOM, not the other way round.
  //   • It writes `output.innerHTML` FOUR separate times — a
  //     "Gathering your morning data…" state before the Promise.all, a
  //     "Writing your brief…" state inside its `.then`, a success
  //     state after the send, and an error state in the `.catch`. That
  //     is a progressive render, interleaved with the data work at
  //     every stage; there is no seam to cut along without splitting
  //     the function down the middle, which this pass forbids.
  //   • It additionally re-discovers and mutates a SECOND node it did
  //     not create — `document.querySelector('#mb-wrap div[style*=
  //     "font-size:11px"]')`, the "Last run:" label — to keep it in
  //     sync after a manual run.
  // The results of the four `logic._getX` calls are never returned,
  // never stored, and never reused: their only consumer is the prompt
  // string this function was already committed to building and the
  // status markup it writes alongside. Same shape journalQoL.ui.
  // _injectAuditEntries and jargonEncyclopedia.ui._openGlossary were
  // both shipped on. The honest cost, stated rather than hidden: the
  // real Morning Brief PROMPT — the thing that actually determines
  // what Oracle writes — lives in `ui`, so a future edit to its
  // wording is made in the rendering namespace.
  //
  // `this`/`self` accounting for all 7 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • ui._injectButton — already had `var self = this;`, swapped for
  //     the module handle IN PLACE (it sits after both early-return
  //     guards, neither of which touches `this`). Captured for
  //     `self._generate()` (the button's onclick) and `self.
  //     LAST_RUN_KEY`. Left as `this.`, the first would have read
  //     `ui._generate` — which DOES exist on `ui`, so it would have
  //     kept working by luck; the second would have read
  //     `ui.LAST_RUN_KEY`, which does NOT exist, and
  //     `localStorage.getItem(undefined)` returns null silently, so
  //     the button's "Last run: …" label would have permanently and
  //     wrongly read "Auto-runs once per morning". Both requalified.
  //   • logic._autoRun — same in-place swap. Captured for
  //     `self.LAST_RUN_KEY` (the same silent-null trap: left bare,
  //     `logic.LAST_RUN_KEY` is undefined, the same-day guard would
  //     never fire and the brief would auto-run on EVERY morning page
  //     load rather than once) and for `self._generate()` in both the
  //     already-logged-in and the `rpgace:login`-hook branches — that
  //     one would have read `logic._generate`, which does NOT exist, a
  //     real TypeError inside a timer callback.
  //   • ui._generate — same in-place swap. Captured for all four
  //     `self._getX()` readers (each of which would have read
  //     `ui._getGmail` etc., none of which exist — four real
  //     TypeErrors, thrown synchronously while building the
  //     `promises` array) and for `self.LAST_RUN_KEY` in the
  //     `localStorage.setItem` that marks the brief as run for today
  //     (left bare, it would have written to the literal key
  //     "undefined", so the once-a-day guard would never see it).
  //   • logic._getGmail / _getShifts / _getYouTube / _getKnowledgeGaps
  //     — none of the four references `this` or `self` anywhere; all
  //     four moved byte-identical, no handle needed and none added.
  //
  // ─── EXTERNAL TOUCHPOINT: this module is NOT touchpoint-free ──────
  // Named plainly because the obvious grep does NOT show it and this
  // batch was briefed as "0 external touchpoints": a repo-wide grep for
  // the direct `RPGACE.modules.morningBrief.` form returns 0 hits, but
  // dashDeck._openMorningBrief reaches this module through a LOCAL
  // ALIAS — `var mb = RPGACE.modules.morningBrief; if (mb &&
  // mb._injectButton) { try { mb._injectButton(); } catch (e) {} }` —
  // to force-inject the widget when `#mb-wrap` is not already in the
  // DOM. That call is guarded AND inside a `try{}catch{}`, which is
  // what makes it dangerous: had the pass-through below been omitted,
  // the guard would have quietly evaluated false and dashDeck's
  // Morning Brief card would have silently shown its "still loading"
  // fallback message forever, with nothing thrown anywhere. It lands
  // on the top-level pass-through and is routed on unchanged. The
  // dynamic-lookup check is separately clean: the only real
  // `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field. The `'morningBrief'` string literals in dashDeck's own
  // MODULES card table and its `set('morningBrief', …)` glance-line
  // write are dashDeck's CARD key, not a module lookup (that card's
  // `go:` calls `dashDeck._openMorningBrief()`), so they are
  // unaffected. index.html has zero references in any form. The six
  // `"_autoRun"/"_generate"/"_getGmail"/"_getKnowledgeGaps"/
  // "_getShifts"/"_getYouTube"` entries in this file's own
  // METHOD_MODULE_MAP (G109) are a generated name->module DATA table,
  // not call sites, and are unaffected by this split.
  // ══════════════════════════════════════════════════════════════════

  LAST_RUN_KEY: 'rpgace_morning_brief_last',

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() {
      self._injectButton();
      self._autoRun();
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        self._injectButton();
      }
    });
  },

  // ============================================================
  // ui — rendering/DOM: builds the Morning Brief button, last-run
  // label and output pane, stashes them in #dd-stash-holder for
  // dashDeck's card popup to relocate, and drives the progressive
  // gathering -> writing -> sent status render around the real brief
  // assembly (see the _generate note in the G53 block above).
  // ============================================================
  ui: {

  _injectButton: function() {
    if (document.getElementById('mb-wrap')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    // Oct 29 2026 (Alex: "Morning brief button in morning brief??? ... redundancy"): no ☀️ Morning Brief button or
    // "Last run" label inside the brief any more - it loads itself, and writes itself when it's missing after 7:00.
    var wrap = document.createElement('div');
    wrap.id = 'mb-wrap';
    wrap.style.cssText = 'margin-bottom:20px;';

    var output = document.createElement('div');
    output.id = 'mb-output';
    output.style.cssText = 'display:none;';
    wrap.appendChild(output);

    // /Engineer pass (July 28, round 2) — this widget used to inject
    // straight onto #page-dashboard, a loose block outside dashDeck's card
    // grid, and a real duplicate of dashDeck's own 'Morning Brief' card
    // (which used to just do a hollow static Oracle-input prefill, now
    // removed). This IS the real Morning Brief now; dashDeck's card opens
    // it via _openMorningBrief(). Same fix as vp-widget/cpl-widget: inject
    // straight into the shared #dd-stash-holder instead of the raw page —
    // dashDeck owns showing it. Prefer dashDeck's own holder helper; fall
    // back to the same-id holder if dashDeck hasn't run yet.
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
    holder.appendChild(wrap);
    console.log('[RPGACE:morningBrief] Button injected (stashed for dashDeck popup)');
  },

  // CC-3 (Oct 21 2026, Alex: "make it at one time at 6am, deduplicate"):
  // ONE AI brief a day, written by Orchestrator CC at 7am (MB-1, was before 6am)
  // (scripts/morning_brief_cc.py, journal source 'morning-routine'). If it's
  // there, it is shown - in either switch mode - with live inbox/YouTube lines
  // (code only, no AI). If it isn't: on 🤖 a "write it now" button, on 💳 the
  // Morning Brief pressed with none yet: the API writes it now (MB-1).
  _generate: function(opts) {
    var self = RPGACE.modules.morningBrief;
    var output = document.getElementById('mb-output');
    if (!output) return;
    output.style.display = 'block';
    output.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;padding:12px 0;">☀️ Looking for this morning\'s brief...</div>';
    // MB-1 (Oct 28 2026, Alex: "generate at 7am or if I press morning brief before 7am"): a press with no brief yet
    // writes it now with the API (same rules + data shape as the 7am writer); opening the screen never writes one.
    return self.logic.todayBrief().then(function(row) {
      if (row) return self.ui._showCCBrief(output, row);
      if ((opts && opts.press) || self.logic.due()) return self.ui._writeNow(output);
      return self.ui._showNoBrief(output);
    });
  },

  _showCCBrief: function(output, row) {
    var self = RPGACE.modules.morningBrief;
    localStorage.setItem(self.LAST_RUN_KEY, new Date().toISOString());
    output.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'mb-cc-head';
    head.style.cssText = 'font-size:11px;color:var(--muted);margin:6px 0;';
    // Oct 21 2026: when Orchestrator CC misses it, the API backup writes it
    // (.github/workflows/morning-brief-fallback.yml) and its title ends "(API)".
    head.textContent = '🌅 Written ' + new Date(row.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + (/\(API\)\s*$/.test(row.title || '') ? ' by the API (Orchestrator CC missed it)' : ' by Orchestrator CC');
    // MB-3: one card per section (headings fixed by prompts/morning_brief.md) so the Good morning story can
    // place each in its chapter; a brief with no known headings stays one card.
    var body = document.createDocumentFragment();
    self.logic.sections(row.content || '').forEach(function(s) {
      var c = document.createElement('div'); c.className = 'mb-sec mb-cc-text mb-sec-' + s.key;
      if (s.title) { var h = document.createElement('div'); h.className = 'mb-sec-h'; h.textContent = s.title; c.appendChild(h); }
      var b = document.createElement('div'); b.className = 'mb-sec-b'; b.textContent = s.text; c.appendChild(b);
      // Oct 29 2026 (Alex: "won't let me add quests suggested for today"): each Top 3 line can go on today.
      var md = RPGACE.modules.myDay;
      if (s.key === 'top3' && md && md.ui.addTodayBtn) {
        var lines = s.text.split('\n').map(function(x) { return x.trim(); }).filter(Boolean);
        if (lines.some(function(x) { return /^\d+[.)]\s+/.test(x); })) {
          b.textContent = '';
          lines.forEach(function(x) {
            if (!/^\d+[.)]\s+/.test(x)) { var h = document.createElement('div'); h.textContent = x; b.appendChild(h); return; }
            var label = x.replace(/^\d+[.)]\s+/, '').replace(/\*\*/g, '');
            var r = document.createElement('div'); r.className = 'mb-top3-row'; r.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:space-between;margin:4px 0;';
            var t = document.createElement('span'); t.textContent = x; r.appendChild(t);
            r.appendChild(md.ui.addTodayBtn(label, 'life'));
            b.appendChild(r);
          });
        }
      }
      body.appendChild(c);
    });
    var live = document.createElement('div');
    live.className = 'mb-cc-live';
    live.style.cssText = 'margin-top:10px;font-size:13px;line-height:1.6;color:var(--text);border-top:1px solid var(--border);padding-top:8px;';
    live.textContent = '📧 Checking your inbox and YouTube…';
    output.appendChild(head); output.appendChild(body); output.appendChild(live);
    return Promise.all([self._getGmail(), self._getYouTube()]).then(function(r) {
      var g = r[0] || { unread: 0, subjects: [] }, y = r[1] || {};
      live.textContent = '📧 Inbox now: ' + g.unread + ' unread' + ((g.subjects || []).length ? '\n' + g.subjects.map(function(x) { return '• ' + x; }).join('\n') : '') +
        '\n🎬 YouTube: ' + (y.summary || '—');
      live.style.whiteSpace = 'pre-wrap';
    });
  },

  // Oct 28 2026 fix: after a reload the auto-run skips ("already ran today"),
  // so a reopened Good morning screen had no written brief. Opening it now
  // shows today's saved brief - display only, never writes a new one.
  _showSaved: function() {
    var self = RPGACE.modules.morningBrief, output = document.getElementById('mb-output');
    if (!output || output.textContent.trim()) return Promise.resolve();
    return self.logic.todayBrief().then(function(row) {
      if (output.textContent.trim()) return;
      output.style.display = 'block';
      return row ? self.ui._showCCBrief(output, row) : self.logic.due() ? self.ui._writeNow(output) : self.ui._showNoBrief(output);
    });
  },

  _showNoBrief: function(output) {
    var self = RPGACE.modules.morningBrief;
    output.innerHTML = '';
    var msg = document.createElement('div');
    msg.className = 'mb-wait';
    msg.style.cssText = 'font-size:13px;color:var(--muted);padding:8px 0;line-height:1.5;';
    msg.textContent = '🤖 Today\'s brief is written at 7:00 by Orchestrator CC (the API steps in a few minutes later if that fails). Want it now?';
    var btn = document.createElement('button');
    btn.className = 'mb-write-now';
    btn.textContent = '✍️ Write it now';
    btn.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-weight:700;cursor:pointer;font-family:inherit;';
    btn.onclick = function() { self.ui._writeNow(output); };
    output.appendChild(msg); output.appendChild(btn);
  },

  // MB-1: the API writes today's brief from the same rules file (prompts/morning_brief.md)
  // and saves it to journal once, then it shows like the 7am one.
  _writeNow: function(output) {
    var self = RPGACE.modules.morningBrief;
    output.style.display = 'block';
    output.innerHTML = '<div class="mb-writing" style="color:var(--muted);font-size:12px;padding:12px 0;">☀️ Writing your brief…</div>';
    return self.logic.writeNow().then(function(row) { return self.ui._showCCBrief(output, row); }, function(e) {
      output.innerHTML = '';
      var m = document.createElement('div'); m.className = 'mb-err'; m.style.cssText = 'color:#CC4A4A;font-size:13px;padding:8px 0;';
      m.textContent = '⚠️ The brief could not be written: ' + (e && e.message || e);
      output.appendChild(m);
      RPGACE.utils.toast('⚠️ Morning Brief failed: ' + (e && e.message || e), '#CC4A4A', 4500);
    });
  },

  },

  // ============================================================
  // logic — business logic/data: the once-a-day/before-1pm auto-run
  // scheduler (which waits for the real `rpgace:login` signal rather
  // than a blind boot timer), plus the four independent data readers
  // the brief is assembled from — Gmail unread, today's/tomorrow's
  // shifts, the YouTube channel delta, and the top knowledge gap. No
  // DOM in any of them.
  // ============================================================
  logic: {

  // CC-3: today's Orchestrator CC brief (journal, source 'morning-routine'),
  // or null. "Today" = since local midnight.
  todayBrief: function() {
    var m = new Date(); m.setHours(0, 0, 0, 0);
    return RPGACE.sb.select('journal', 'select=id,title,content,created_at&source=eq.morning-routine&created_at=gte.' + encodeURIComponent(m.toISOString()) + '&order=created_at.desc&limit=1')
      .then(function(rows) { return (Array.isArray(rows) && rows[0] && rows[0].content) ? rows[0] : null; })
      .catch(function() { return null; });
  },

  // MB-3: split the written brief by its section headings -> [{key, title, text}].
  SECTIONS: [['⚔', 'top3'], ['📅', 'window'], ['📥', 'waiting'], ['🎛', 'beat'], ['🎬', 'content'], ['▶', 'action']],
  // Oct 29 2026 (Alex: "orchestrator cc can't make morning brief at 7am"; the GitHub backup ran at 10:46): from 7:00
  // the app writes a missing brief itself with the API when it opens, instead of waiting for a button press.
  due: function() { return new Date().getHours() >= 7; },

  sections: function(text) {
    var S = RPGACE.modules.morningBrief.logic.SECTIONS, out = [], cur = null;
    String(text || '').split('\n').forEach(function(line) {
      var tl = line.trim(), hit = null;
      S.forEach(function(s) { if (!hit && tl.indexOf(s[0]) === 0) hit = s[1]; });
      if (hit) {
        var rest = tl.replace(/^[^A-Za-z0-9*]+/, '');
        if (hit === 'action') { cur = { key: 'action', title: '', text: rest }; out.push(cur); return; }
        var m = /^([A-Z0-9 &'’\-]{3,})(?:\s*[-–:]\s*(.*))?$/.exec(rest);
        cur = { key: hit, title: m ? m[1].trim() : rest, text: m && m[2] ? m[2] : '' }; out.push(cur); return;
      }
      if (!cur) { cur = { key: 'top3', title: '', text: '' }; out.push(cur); }
      cur.text += (cur.text ? '\n' : '') + line;
    });
    return out.map(function(s) { s.text = s.text.replace(/^\n+|\s+$/g, ''); return s; }).filter(function(s) { return s.text || s.title; });
  },

  // MB-1/MB-2: today's data in the same shape scripts/morning_brief_cc.py gather() prints, so one rules file
  // (prompts/morning_brief.md) serves the 7am writer, its API backup and this.
  gatherNow: function() {
    var md = RPGACE.modules.myDay;
    var d = md ? md.logic.iso() : new Date().toISOString().slice(0, 10);
    var nx = new Date(d + 'T12:00:00'); nx.setDate(nx.getDate() + 1);
    var tm = nx.getFullYear() + '-' + String(nx.getMonth() + 1).padStart(2, '0') + '-' + String(nx.getDate()).padStart(2, '0');
    var get = function(table, q) { return RPGACE.sb.select(table, q).then(function(r) { return Array.isArray(r) ? r : []; }, function(e) { return [{ _error: String(e && e.message || e) }]; }); };
    return Promise.all([
      get('rpgace_shifts', 'date=in.(' + d + ',' + tm + ')&select=date,role,start,end&order=date.asc,start.asc'),
      get('chore_blocks', 'block_date=eq.' + d + '&status=neq.cancelled&select=kind,realm,start_time,mins,items,status&order=start_time.asc&limit=12'),
      get('rpgace_agendas', 'date=eq.' + d + '&completed=is.false&select=title,hour,minute,category&order=hour.asc,minute.asc&limit=12'),
      get('myday_settings', 'id=eq.1&select=wake_time,bed_time'),
      get('bookworm_chapters', 'status=eq.in_progress&analysis_complete=is.false&select=chapter_title&limit=5'),
      get('taxonomy_proposals', 'status=eq.pending&select=id&limit=200'),
      get('jargon_encyclopedia', 'status=eq.pending&select=id&limit=1000'),
      get('encyclopedia_insights', 'status=neq.rejected&realms=cs.%7Bproducer%7D&select=insight_text,source_entry_title,realms&order=created_at.desc&limit=8'),
      get('conid_pot', 'status=neq.archived&select=title,starred,kind&order=starred.desc,created_at.desc&limit=6'),
      get('intel_reports', 'select=title,creator,score,created_at&order=created_at.desc&limit=3')
    ]).then(function(r) {
      return {
        date: d, weekday: new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }),
        shifts_today: r[0].filter(function(s) { return s.date === d; }),
        shift_tomorrow: r[0].filter(function(s) { return s.date === tm; })[0] || null,
        my_day: (r[3][0] && 'wake_time' in r[3][0]) ? r[3][0] : {},
        planned_blocks_today: r[1].map(function(b) { return b._error ? b : Object.assign({}, b, { items: (b.items || []).map(function(i) { return i && i.label; }).filter(Boolean).slice(0, 5) }); }),
        agenda_today_open: r[2],
        waiting_on_alex: { taxonomy_proposals_pending: r[5].length, jargon_terms_pending: r[6].length, chapters_in_progress: r[4].map(function(c) { return c.chapter_title; }).filter(Boolean) },
        recent_producer_insights: r[7], idea_bank: r[8], latest_video_analyses: r[9]
      };
    });
  },

  // MB-1: write + save once (journal source 'morning-routine', title ends "(API)" like the backup).
  writeNow: function() {
    var self = RPGACE.modules.morningBrief;
    return self.logic.todayBrief().then(function(have) {
      if (have) return have;
      return self.logic.gatherNow().then(function(data) {
        var prompt = 'Today\'s RPGACE data for Alex (@AceSanyaBeats), as JSON:\n' + JSON.stringify(data) + '\n\n' + RPGACE.prompt('morning_brief') + '\n\nReply with the brief text only.';
        return RPGACE.kit.ask(prompt, { max: 900, model: 'claude-sonnet-4-6' });
      }).then(function(text) {
        text = String(text || '').trim();
        if (text.length < 40) throw new Error('the brief came back empty');
        return self.logic.todayBrief().then(function(again) {
          if (again) return again;   // the 7am writer got there first
          var day = new Date(), title = 'Morning Brief — ' + day.toLocaleDateString('en-GB', { weekday: 'long' }) + ' ' + String(day.getDate()).padStart(2, '0') + ' ' + day.toLocaleDateString('en-GB', { month: 'long' }) + ' ' + day.getFullYear() + ' (API)';
          var h = RPGACE.sb.headers(); h.Prefer = 'return=representation';
          return fetch(RPGACE.sb.url('journal'), { method: 'POST', headers: h, body: JSON.stringify({ title: title, date: RPGACE.modules.myDay ? RPGACE.modules.myDay.logic.iso() : day.toISOString().slice(0, 10), content: text.slice(0, 6000), source: 'morning-routine' }) })
            .then(function(r) { if (!r.ok) throw new Error('saving it failed (' + r.status + ')'); return r.json(); })
            .then(function(rows) { if (RPGACE.cache && RPGACE.cache.clear) RPGACE.cache.clear('journal'); if (!rows || !rows[0]) throw new Error('saved row not returned'); return rows[0]; });
        });
      });
    });
  },

  _autoRun: function() {
    var self = RPGACE.modules.morningBrief;
    var lastRun = localStorage.getItem(self.LAST_RUN_KEY);
    if (lastRun) {
      var last = new Date(lastRun);
      var now = new Date();
      // Only auto-run if last run was not today
      if (last.toDateString() === now.toDateString()) return;
    }
    // Auto-run if it's before noon (morning session)
    var hour = new Date().getHours();
    if (hour >= 13) return;
    // Aug 22 (real /Routine finding — console evidence: 2x real
    // "/api/composio: 401" on first login of the day). Root cause: this
    // runs from registerBootTask, which fires at MODULE-INIT time -
    // before any real login, since #gate's own hide only happens inside
    // checkPassword()'s success branch. The old bare setTimeout(fn,2000)
    // fired _generate()'s real Gmail/YouTube Composio calls 2s after
    // BOOT, not 2s after LOGIN - almost always still on the password
    // screen, guaranteed to 401 (authGate._apiSecret is null pre-login,
    // so the auth header never gets attached). Real fix: if login
    // hasn't happened yet, wait for the real 'rpgace:login' signal
    // (fires exactly once on a genuine successful login) instead of a
    // blind timer: same real signal authGate/pathRouter already key
    // off, no new mechanism invented (rule 8).
    var apiSecretReady = RPGACE.modules.authGate && RPGACE.modules.authGate._apiSecret;
    if (apiSecretReady) {
      setTimeout(function() { self._generate(); }, 2000);
    } else {
      var off = RPGACE.hooks.on('rpgace:login', function() {
        off();
        setTimeout(function() { self._generate(); }, 2000);
      });
    }
  },

  _getGmail: function() {
    return RPGACE.api('GMAIL_FETCH_EMAILS', { max_results: 10, label_ids: ['UNREAD'] })
      .then(function(result) {
        var messages = (result.data && result.data.messages) || result.messages || [];
        if (!Array.isArray(messages)) messages = [];
        var subjects = messages.slice(0, 5).map(function(m) {
          return m.subject || m.snippet || 'No subject';
        }).filter(function(s) { return s; });
        return { unread: messages.length, subjects: subjects };
      })
      .catch(function() {
        return { unread: 0, subjects: ['Could not fetch — check Gmail connection'] };
      });
  },


  _getYouTube: function() {
    return RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
      .then(function(result) {
        var d = result.data || result;
        var views = parseInt(d.viewCount) || 0;
        var videos = parseInt(d.videoCount) || 0;
        var summary = videos + ' videos · ' + views + ' total views';

        // Compare to stored previous stats
        var prev = JSON.parse(localStorage.getItem('rpgace_yt_prev') || '{}');
        if (prev.views) {
          var diff = views - (prev.views || 0);
          if (diff > 0) summary += ' · +' + diff + ' views since last check';
          else if (diff < 0) summary += ' · ' + diff + ' views since last check';
        }
        // Store current as previous
        localStorage.setItem('rpgace_yt_prev', JSON.stringify({ views: views, videos: videos, date: new Date().toISOString() }));
        return { summary: summary };
      })
      .catch(function() {
        return { summary: 'Could not fetch — check Composio connection' };
      });
  },


  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. `_injectButton` is genuinely LOAD-BEARING for an external
  // caller: dashDeck._openMorningBrief reaches it through a local alias
  // (`var mb = RPGACE.modules.morningBrief; … mb._injectButton();`)
  // behind a guard that would have failed SILENTLY had it been dropped
  // — see the external-touchpoint note in the G53 block above. The rest
  // carry this module's own internal calls: `init`'s boot task calls
  // `self._injectButton()` and `self._autoRun()`, its `page:show`
  // listener calls `self._injectButton()`, `ui._injectButton`'s onclick
  // calls `self._generate()`, `logic._autoRun` calls `self._generate()`
  // from both its timer and its `rpgace:login` branch, and
  // `ui._generate` calls all four `self._getX()` readers — every one of
  // those `self`s is the module, so each lands here first and is routed
  // on to the right namespace.
  _injectButton: function() { return this.ui._injectButton(); },
  _generate: function(o) { return this.ui._generate(o); },
  todayBrief: function() { return this.logic.todayBrief(); },
  _autoRun: function() { return this.logic._autoRun(); },
  _getGmail: function() { return this.logic._getGmail(); },
  _getYouTube: function() { return this.logic._getYouTube(); },

});
/* ===END:morningBrief=== */
