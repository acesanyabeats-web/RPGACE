
/* ===MODULE:orchestratorCC=== */
// Oct 21 2026 — CC-0 of "Orchestrator CC Analysis"
// (records/2026-10/orchestrator_cc_analysis_toggle_2026-10-21.txt).
// Alex: background analysis (videos, book chapters, Morning Brief, weekly
// challenges, Year Wrapped) done by a scheduled Orchestrator CC session
// every 2 hours on his Claude plan instead of the API; anything waiting
// over 12 hours falls back to the API.
// This step is only the switch + shared helpers; CC-1..4 route through it.
//   app_settings row 'background_analysis' = {mode: 'cc'|'api', every_hours,
//   fallback_hours, anchor_minute} — anon-readable so the cloud runner reads
//   it too; written only through /api/data-write (secureWrite).
RPGACE.register('orchestratorCC', {
  domain: 'platform',

  KEY: 'background_analysis',
  DEFAULTS: { mode: 'cc', every_hours: 2, fallback_hours: 12, anchor_minute: 5, brief_fallback_mins: 5 },
  TTL: 60000,
  _settings: null,
  _loadedAt: 0,

  init: function() {
    var self = this;
    setTimeout(function() { self.logic.load(); self.ui.inject(); }, 1700);
  },

  logic: {
    load: function(force) {
      var self = RPGACE.modules.orchestratorCC;
      if (!force && self._settings && Date.now() - self._loadedAt < self.TTL) return Promise.resolve(self._settings);
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(self.logic.settings());
      return RPGACE.sb.select('app_settings', 'select=value&key=eq.' + self.KEY + '&limit=1').then(function(rows) {
        var v = (Array.isArray(rows) && rows[0] && rows[0].value) || {};
        self._settings = Object.assign({}, self.DEFAULTS, v);
        self._loadedAt = Date.now();
        self.ui.render();
        return self._settings;
      }).catch(function() { return self.logic.settings(); });
    },
    settings: function() {
      var self = RPGACE.modules.orchestratorCC;
      return self._settings || Object.assign({}, self.DEFAULTS);
    },
    mode: function() { return RPGACE.modules.orchestratorCC.logic.settings().mode === 'api' ? 'api' : 'cc'; },
    isCC: function() { return RPGACE.modules.orchestratorCC.logic.mode() === 'cc'; },

    setMode: function(mode) {
      var self = RPGACE.modules.orchestratorCC;
      if (mode !== 'cc' && mode !== 'api') return Promise.reject(new Error('Unknown mode: ' + mode));
      var value = Object.assign({}, self.logic.settings(), { mode: mode });
      return RPGACE.sb.secureWrite('app_settings', 'update', { value: value, updated_at: new Date().toISOString() }, 'key=eq.' + self.KEY).then(function() {
        self._settings = value;
        self._loadedAt = Date.now();
        self.ui.render();
        RPGACE.hooks.fire('orchestrator:mode', mode);
        return value;
      });
    },

    // Next scheduled pick-up: every N hours (UTC) at the anchor minute.
    nextPickup: function(now) {
      var st = RPGACE.modules.orchestratorCC.logic.settings();
      var every = Math.max(1, Number(st.every_hours) || 2), minute = Number(st.anchor_minute) || 0;
      var t = new Date(now ? new Date(now).getTime() : Date.now());
      var base = t.getTime();
      t.setUTCMinutes(minute, 0, 0);
      for (var i = 0; i < 48 && (t.getTime() <= base || t.getUTCHours() % every !== 0); i++) t = new Date(t.getTime() + 3600000);
      return t;
    },

    fmtWait: function(ms) {
      var m = Math.max(1, Math.round(ms / 60000));
      return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');
    },

    // State of one queued job: waiting for the next pick-up, or past the
    // fallback age (the API should take it).
    waiting: function(createdAt, now) {
      var self = RPGACE.modules.orchestratorCC;
      var st = self.logic.settings();
      var n = now ? new Date(now).getTime() : Date.now();
      var age = (n - new Date(createdAt || n).getTime()) / 3600000;
      if (age >= (Number(st.fallback_hours) || 12)) return { state: 'fallback', text: '⏳ Waited ' + Math.floor(age) + 'h — handing to the API' };
      return { state: 'waiting', text: '⏳ Waiting for Orchestrator · next pick-up ~' + self.logic.fmtWait(self.logic.nextPickup(n).getTime() - n) };
    },

    // ── CC-2 (Oct 21 2026): the app's own background Oracle jobs ──────────
    // Book chapters, weekly challenge ideas and the Year Wrapped paragraph
    // don't call the API on 🤖: their prompt goes into oracle_fallback_queue
    // (the same queue and the same answered-row sweep the credit-exhaustion
    // lane uses - phylumPath._checkFallbackAnswers) with context.cc = true.
    // Orchestrator CC's 2-hourly task answers it (scripts/intel_cc_worker.py
    // jobs/job/answer); the sweep hands the answer to the type's apply().
    // A row still pending after fallback_hours is run on the API instead
    // (sweepStale), by the type's own api() or the same prompt.
    // types[type] = { apply(answer, row) -> Promise, api(row) -> Promise (optional) }
    types: {},
    registerType: function(type, handlers) { RPGACE.modules.orchestratorCC.logic.types[type] = handlers; },
    handles: function(type) { return !!RPGACE.modules.orchestratorCC.logic.types[type]; },

    // The open queue row for this job, if any (pending, or answered and not yet used).
    openRow: function(type, key) {
      return RPGACE.sb.select('oracle_fallback_queue', 'select=id,status,created_at&context->>type=eq.' + encodeURIComponent(type) +
        '&context->>key=eq.' + encodeURIComponent(key) + '&status=in.(pending,answered)&resumed_at=is.null&order=created_at.desc&limit=1')
        .then(function(rows) { return (Array.isArray(rows) && rows[0]) || null; });
    },

    // Resolves true when the job went to Orchestrator CC (queued now or
    // already queued), false when the switch says API - the caller then
    // runs its normal API call.
    queue: function(o) {
      var self = RPGACE.modules.orchestratorCC;
      return self.logic.load().then(function() {
        if (!self.logic.isCC() || !self.logic.handles(o.type)) return false;
        return self.logic.openRow(o.type, o.key).then(function(row) {
          if (row) return true;
          var ctx = Object.assign({}, o.context || {}, { type: o.type, key: String(o.key), cc: true });
          return RPGACE.sb.secureWrite('oracle_fallback_queue', 'insert', [{
            prompt: o.prompt, tier: o.tier || 'ground_worker_json', max_tokens: o.maxTokens || 1000,
            model: o.model || null, status: 'pending', context: ctx
          }]).then(function() { return true; });
        });
      });
    },

    // Same defensive parse as phylumPath._callGroundWorkerJSON.
    parseAnswer: function(row) {
      var raw = String((row && row.answer) || '');
      if (row && row.tier === 'ground_worker_text') return raw.trim();
      var m = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON in the Orchestrator CC answer');
      return JSON.parse(m[0]);
    },

    // An answered row (from the shared sweep): apply it, then mark it used.
    resumeRow: function(row) {
      var self = RPGACE.modules.orchestratorCC, h = self.logic.types[(row.context || {}).type];
      if (!h) return Promise.resolve();
      return Promise.resolve().then(function() { return h.apply(self.logic.parseAnswer(row), row); }).then(function() {
        return RPGACE.sb.secureWrite('oracle_fallback_queue', 'update', { resumed_at: new Date().toISOString() }, 'id=eq.' + row.id);
      }).catch(function(e) {
        console.warn('[orchestratorCC] could not use the answer for ' + row.id + ':', e && e.message);
        // A broken answer goes to the API instead of retrying forever.
        return RPGACE.sb.secureWrite('oracle_fallback_queue', 'update', { resumed_at: new Date().toISOString() }, 'id=eq.' + row.id)
          .then(function() { return self.logic.runApi(row); });
      });
    },

    // The API path for one row: the type's own api(), or the same prompt.
    runApi: function(row) {
      var self = RPGACE.modules.orchestratorCC, h = self.logic.types[(row.context || {}).type], pp = RPGACE.modules.phylumPath;
      if (!h) return Promise.resolve();
      if (h.api) return Promise.resolve(h.api(row));
      var call = row.tier === 'ground_worker_text'
        ? pp.logic._callGroundWorkerText(row.prompt, row.max_tokens || 1000, row.model || undefined)
        : pp.logic._callGroundWorkerJSON(row.prompt, row.max_tokens || 1000, row.model || undefined);
      return call.then(function(ans) { return h.apply(ans, row); });
    },

    // Rows still pending past fallback_hours: take them (only if still
    // pending, so two tabs can't both run one) and run them on the API.
    sweepStale: function(now) {
      var self = RPGACE.modules.orchestratorCC;
      var hours = Number(self.logic.settings().fallback_hours) || 12;
      var cut = new Date((now || Date.now()) - hours * 3600000).toISOString();
      return RPGACE.sb.select('oracle_fallback_queue', 'select=*&status=eq.pending&context->>cc=eq.true&created_at=lt.' + cut + '&order=created_at.asc&limit=5')
        .then(function(rows) {
          return Promise.all((Array.isArray(rows) ? rows : []).filter(function(r) { return self.logic.handles((r.context || {}).type); }).map(function(r) {
            return RPGACE.sb.secureWrite('oracle_fallback_queue', 'update', { status: 'api_fallback', resumed_at: new Date().toISOString() }, 'id=eq.' + r.id + '&status=eq.pending')
              .then(function(d) { if (Array.isArray(d) && !d.length) return; return self.logic.runApi(r); })
              .catch(function(e) { console.warn('[orchestratorCC] API fallback failed for ' + r.id + ':', e && e.message); });
          }));
        }).catch(function() {});
    },
  },

  ui: {
    // A row in the shared dev-status cluster, next to the Oracle Mode switch.
    inject: function() {
      var self = RPGACE.modules.orchestratorCC;
      if (document.getElementById('orch-cc-switch')) return;
      if (!RPGACE.utils.addClusterRow) { if (!self._retried) { self._retried = true; setTimeout(function() { self.ui.inject(); }, 2000); } return; }
      var row = document.createElement('div');
      row.id = 'orch-cc-switch';
      row.title = 'Who does background analysis (videos, book chapters, Morning Brief, weekly challenges): Orchestrator CC on your Claude plan every 2h, or the API straight away';
      row.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.3px;cursor:pointer;min-height:32px;display:flex;align-items:center;';
      row.onclick = function() {
        var next = self.logic.isCC() ? 'api' : 'cc';
        self.logic.setMode(next).then(function() {
          RPGACE.utils.toast(next === 'cc' ? '🤖 Background analysis: Orchestrator CC — queued jobs are picked up every 2 hours on your Claude plan (API after ' + (Number(RPGACE.modules.orchestratorCC.logic.settings().fallback_hours) || 12) + 'h).' : '💳 Background analysis: API — jobs run straight away and are billed to the API.', next === 'cc' ? '#4CAF82' : '#C9A84C', 5000);
        }).catch(function(e) { RPGACE.utils.toast('Couldn\'t change the analysis switch: ' + ((e && e.message) || e), '#CC4A4A', 4500, 'orchestratorCC'); });
      };
      RPGACE.utils.addClusterRow(row);
      self.ui.render();
    },
    render: function() {
      var self = RPGACE.modules.orchestratorCC;
      var row = document.getElementById('orch-cc-switch');
      if (!row) return;
      var cc = self.logic.isCC();
      row.textContent = cc ? '🤖 Analysis: Orchestrator CC' : '💳 Analysis: API';
      row.style.color = cc ? '#4CAF82' : '#C9A84C';
    },
    // Shared "waiting" line for any queued job (CC-1..4 use it).
    waitingLine: function(createdAt) {
      var w = RPGACE.modules.orchestratorCC.logic.waiting(createdAt);
      var el = document.createElement('div');
      el.className = 'cc-wait';
      el.style.cssText = 'font-size:12px;color:' + (w.state === 'fallback' ? 'var(--gold)' : 'var(--muted)') + ';';
      el.textContent = w.text;
      return el;
    },
  },

  // Public pass-throughs (G53 convention).
  load: function(f) { return this.logic.load(f); },
  isCC: function() { return this.logic.isCC(); },
  setMode: function(m) { return this.logic.setMode(m); },
  waiting: function(c, n) { return this.logic.waiting(c, n); },
  nextPickup: function(n) { return this.logic.nextPickup(n); },
});
/* ===END:orchestratorCC=== */
