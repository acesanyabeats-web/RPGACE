/**
 * RPGACE Core Foundation Layer v1.0
 * Loaded after main.js. Never modify main.js again.
 * New features (Step 8+) go here as RPGACE.register() modules.
 *
 * Architecture: rpgace.vercel.app/rpgace_core.js
 * Docs:         RPGACE_ARCHITECTURE.md
 */

(function (global) {
  'use strict';

  /* ─── WAIT FOR INITAPP TO COMPLETE ────────────────────── */
  function onReady(fn) {
    if (document.readyState === 'complete') {
      setTimeout(fn, 150); // give initApp() time to run
    } else {
      global.addEventListener('load', function () { setTimeout(fn, 150); });
    }
  }

  /* ─── NAMESPACE ────────────────────────────────────────── */
  global.RPGACE = global.RPGACE || {};
  const R = global.RPGACE;

  /* ══════════════════════════════════════════════════════════
     DATA LAYER
     Validated, schema-aware localStorage access.
     Never call localStorage directly in new code.
     ══════════════════════════════════════════════════════════ */
  R.DB = {
    SCHEMA: {
      shifts:   { key: 'rpgace_shifts',        fallback: [] },
      sched:    { key: 'rpgace_sched_agendas', fallback: [] },
      log:      { key: 'rpgace_daily_log',     fallback: {} },
      agendas:  { key: 'rpgace_agendas',       fallback: [] },
    },

    /* Resolve key string from schema name or raw key */
    _key(name) {
      return (this.SCHEMA[name] && this.SCHEMA[name].key) || name;
    },
    _fb(name) {
      const s = this.SCHEMA[name];
      if (!s) return null;
      return Array.isArray(s.fallback) ? [] : (typeof s.fallback === 'object' ? {} : s.fallback);
    },

    get(name) {
      try {
        const raw = localStorage.getItem(this._key(name));
        if (raw === null) return this._fb(name);
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[RPGACE.DB.get]', name, e.message);
        return this._fb(name);
      }
    },

    set(name, value) {
      try {
        localStorage.setItem(this._key(name), JSON.stringify(value));
        R.hooks.fire('db:change', name, value);
        return true;
      } catch (e) {
        console.warn('[RPGACE.DB.set]', name, e.message);
        return false;
      }
    },

    /* Append an item to an array key, auto-assigning an id */
    push(name, item) {
      const arr = this.get(name) || [];
      const entry = Object.assign({ id: R.utils.id(), createdAt: new Date().toISOString() }, item);
      arr.push(entry);
      this.set(name, arr);
      return entry;
    },

    /* Update one item by id in an array key */
    update(name, id, updates) {
      const arr = this.get(name) || [];
      const idx = arr.findIndex(function (x) { return x.id === id || x._id === id; });
      if (idx < 0) return null;
      arr[idx] = Object.assign({}, arr[idx], updates);
      this.set(name, arr);
      return arr[idx];
    },

    /* Remove one item by id from an array key */
    remove(name, id) {
      const arr = (this.get(name) || []).filter(function (x) {
        return x.id !== id && x._id !== id;
      });
      this.set(name, arr);
      return arr;
    },
  };

  /* ══════════════════════════════════════════════════════════
     STATE LAYER
     Single source of truth for all UI state.
     Replaces scattered window._xxx globals.
     ══════════════════════════════════════════════════════════ */
  R.STATE = (function () {
    var _s = {};
    return {
      get: function (key) { return _s[key]; },
      set: function (key, value) {
        _s[key] = value;
        R.hooks.fire('state:change', key, value);
        return value;
      },
      get dailyDate()    { return _s.dailyDate  || new Date(); },
      set dailyDate(d)   { _s.dailyDate  = d;  R.hooks.fire('state:change', 'dailyDate', d); },
      get weekStart()    { var d = _s.weekStart; if (d) return d; var n=new Date(); n.setDate(n.getDate()-((n.getDay()+6)%7)); n.setHours(0,0,0,0); return n; },
      set weekStart(d)   { _s.weekStart  = d;  R.hooks.fire('state:change', 'weekStart', d); },
      get monthDate()    { return _s.monthDate  || new Date(); },
      set monthDate(d)   { _s.monthDate  = d;  R.hooks.fire('state:change', 'monthDate', d); },
      get pendingSched()    { return _s.pendingSched; },
      set pendingSched(v)   { _s.pendingSched = v; },
    };
  }())

  /* Bridge: make existing window._xxx globals proxy through RPGACE.STATE
     so old code in main.js keeps working without changes.             */
    function bridgeGlobal(name, getter, setter) {
    try {
      Object.defineProperty(global, name, {
        get: getter, set: setter, configurable: true, enumerable: true,
      });
    } catch (e) {}
  }
  bridgeGlobal('_dailyDate',
    function() { var v = R.STATE && R.STATE.dailyDate; return (v instanceof Date) ? v : new Date(); },
    function(v) { if (R.STATE) R.STATE.dailyDate = v; });
  bridgeGlobal('_calWeekStart',
    function() { var v = R.STATE && R.STATE.weekStart; return (v instanceof Date) ? v : (function(){ var d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); d.setHours(0,0,0,0); return d; })(); },
    function(v) { if (R.STATE) R.STATE.weekStart = v; });
  bridgeGlobal('_calMonthDate',
    function() { var v = R.STATE && R.STATE.monthDate; return (v instanceof Date) ? v : new Date(); },
    function(v) { if (R.STATE) R.STATE.monthDate = v; });
  bridgeGlobal('_pendingSchedAgenda',
    function() { return R.STATE && R.STATE.pendingSched; },
    function(v) { if (R.STATE) R.STATE.pendingSched = v; });

  /* ══════════════════════════════════════════════════════════
     HOOK SYSTEM
     Register handlers on named events.
     New features hook in here — no more string replacement.

     Usage:
       RPGACE.hooks.on('sched:show', type => { ... });
       RPGACE.hooks.fire('sched:show', 'daily');
     ══════════════════════════════════════════════════════════ */
  R.hooks = {
    _reg: {},

    /* Subscribe. Returns an unsubscribe function. */
    on: function (event, handler, priority) {
      priority = priority || 10;
      if (!this._reg[event]) this._reg[event] = [];
      this._reg[event].push({ handler: handler, priority: priority });
      this._reg[event].sort(function (a, b) { return a.priority - b.priority; });
      var self = this;
      return function () { self.off(event, handler); };
    },

    off: function (event, handler) {
      if (!this._reg[event]) return;
      this._reg[event] = this._reg[event].filter(function (h) {
        return h.handler !== handler;
      });
    },

    /* Fire all handlers for an event */
    fire: function (event) {
      var args = Array.prototype.slice.call(arguments, 1);
      (this._reg[event] || []).forEach(function (h) {
        try { h.handler.apply(null, args); }
        catch (e) { console.warn('[RPGACE.hooks.fire]', event, e.message); }
      });
    },

    /* Pipe: each handler receives and returns the value, transforming it */
    pipe: function (event, value) {
      return (this._reg[event] || []).reduce(function (acc, h) {
        try { return h.handler(acc); }
        catch (e) { return acc; }
      }, value);
    },
  };

  /* ══════════════════════════════════════════════════════════
     API LAYER
     Unified external call interface.
     All Composio, Oracle, and future API calls go through here.

     Usage:
       await RPGACE.api('GMAIL_CREATE_EMAIL_DRAFT', { subject, body, to })
       await RPGACE.oracle([{ role:'user', content:'...' }], systemPrompt)
     ══════════════════════════════════════════════════════════ */
  R.api = async function (action, params) {
    params = params || {};
    var res = await fetch('/api/composio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'execute', tool: action, input: params }),
    });
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.data || data;
  };

  R.oracle = async function (messages, system, maxTokens) {
    if (typeof callOracle === 'function') {
      return callOracle(messages, system, maxTokens || 1000);
    }
    throw new Error('[RPGACE.oracle] callOracle not available');
  };

  /* ══════════════════════════════════════════════════════════
     UTILITIES
     Shared helpers used across all modules.
     ══════════════════════════════════════════════════════════ */
  R.utils = {

    /* YYYY-MM-DD string from a Date object */
    dateStr: function (d) {
      d = d || new Date();
      return d.toISOString().split('T')[0];
    },

    /* Monday of the week containing d */
    mondayOf: function (d) {
      d = d || new Date();
      var r = new Date(d);
      r.setHours(0, 0, 0, 0);
      var dow = r.getDay();
      r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
      return r;
    },

    /* 3-letter day abbreviation from YYYY-MM-DD */
    dayAbbr: function (dateStr) {
      try {
        var d = new Date(dateStr + 'T00:00:00');
        return ['MON','TUE','WED','THU','FRI','SAT','SUN'][
          d.getDay() === 0 ? 6 : d.getDay() - 1
        ];
      } catch (e) { return '???'; }
    },

    /* Format seconds as M:SS */
    fmtTime: function (secs) {
      var m = Math.floor(secs / 60);
      var s = Math.floor(secs % 60);
      return m + ':' + String(s).padStart(2, '0');
    },

    /* Generate a short unique ID */
    id: function () {
      return 'rp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    },

    /* Show a temporary gold toast notification */
    toast: function (msg, color, ms) {
      color = color || '#C9A84C';
      ms    = ms    || 3000;
      var t = document.createElement('div');
      t.style.cssText = [
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%)',
        'background:#0f0f18;border:1px solid ' + color + '40;color:' + color,
        'font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700',
        'padding:10px 20px;border-radius:8px;z-index:9999',
        'white-space:nowrap;pointer-events:none;transition:opacity .3s',
      ].join(';');
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () {
        t.style.opacity = '0';
        setTimeout(function () { t.remove(); }, 300);
      }, ms);
    },

    /* Copy text to clipboard and briefly show feedback on a button */
    copy: function (text, btn) {
      navigator.clipboard.writeText(text).then(function () {
        if (btn) {
          var orig = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = orig; }, 1500);
        }
      }).catch(function () {
        /* fallback for older browsers */
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      });
    },
  };

  /* ══════════════════════════════════════════════════════════
     FUNCTION WRAPPERS
     Wraps existing main.js functions to add hook fire points.
     This runs AFTER initApp() has completed.
     Do NOT patch main.js — wrap here instead.
     ══════════════════════════════════════════════════════════ */
  try{if(!window._calMonthDate||!(window._calMonthDate instanceof Date))window._calMonthDate=new Date();}catch(e){}
  onReady(function () {

    /* showSched → fires 'sched:show' after each tab switch */
    if (typeof showSched === 'function') {
      var _origShowSched = showSched;
      global.showSched = function (type, btn) {
        try { _origShowSched.call(this, type, btn); }
        catch (e) { console.warn('[RPGACE wrap:showSched]', e.message); }
        R.hooks.fire('sched:show', type);
      };
    }

    /* showPage → fires 'page:show' after each nav switch */
    if (typeof showPage === 'function') {
      var _origShowPage = showPage;
      global.showPage = function (name, tab) {
        try { _origShowPage.call(this, name, tab); }
        catch (e) { console.warn('[RPGACE wrap:showPage]', e.message); }
        R.hooks.fire('page:show', name);
      };
    }

    /* renderAgendas → fires 'agendas:rendered' after cards are drawn */
    if (typeof renderAgendas === 'function') {
      var _origRenderAgendas = renderAgendas;
      global.renderAgendas = function () {
        try { _origRenderAgendas.call(this); }
        catch (e) { console.warn('[RPGACE wrap:renderAgendas]', e.message); }
        R.hooks.fire('agendas:rendered');
      };
    }

    /* addXP → fires 'xp:awarded' for future streak/level systems */
    if (typeof addXP === 'function') {
      var _origAddXP = addXP;
      global.addXP = function (amount) {
        try { _origAddXP.call(this, amount); }
        catch (e) { console.warn('[RPGACE wrap:addXP]', e.message); }
        R.hooks.fire('xp:awarded', amount);
      };
    }

    /* saveToJournal → fires 'journal:saved' for cross-system sync */
    if (typeof saveToJournal === 'function') {
      var _origSaveJournal = saveToJournal;
      global.saveToJournal = async function (title, content, source) {
        var result;
        try { result = await _origSaveJournal.call(this, title, content, source); }
        catch (e) { console.warn('[RPGACE wrap:saveToJournal]', e.message); }
        R.hooks.fire('journal:saved', { title: title, source: source });
        return result;
      };
    }

    console.log('[RPGACE] Foundation layer active. Hooks wired. Modules:', Object.keys(R.modules));
    R._ready = true;
    R.hooks.fire('rpgace:ready');
  /* ── YouTube Oracle button injection (direct, no module dependency) ── */
  setTimeout(function() {
    var _ytBtnInject = function() {
      if (document.getElementById('yt-ob')) return;
      var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]');
      if (!anchor) return;
      var b = document.createElement('button');
      b.id = 'yt-ob';
      b.className = anchor.className;
      b.textContent = '\uD83C\uDFAC YouTube Oracle';
      b.style.marginLeft = '4px';
      b.onclick = function() {
        if (R.modules && R.modules.youtubeOracle) R.modules.youtubeOracle.open();
      };
      anchor.parentElement.insertBefore(b, anchor.nextSibling);
      console.log('[RPGACE:youtubeOracle] Button injected');
    };
    _ytBtnInject();
    setTimeout(_ytBtnInject, 800);
    setTimeout(_ytBtnInject, 2000);
  }, 400);
  });

  /* ══════════════════════════════════════════════════════════
     MODULE REGISTRY
     Step 8+ features register here as self-contained modules.
     Each module has an init() that runs after RPGACE is ready.

  ═══════════════════════════════════════════════════ */
  R.modules  = {};
  R._ready   = false;
  R._queue   = [];

  R.register = function (name, module) {
    if (R.modules[name]) {
      console.warn('[RPGACE.register] Already registered:', name);
      return;
    }
    R.modules[name] = module;

    if (typeof module.init === 'function') {
      if (R._ready) {
        try { module.init(); }
        catch (e) { console.error('[RPGACE] Module init failed:', name, e.message); }
      } else {
        R.hooks.on('rpgace:ready', function () {
          try { module.init(); }
          catch (e) { console.error('[RPGACE] Module init failed:', name, e.message); }
        });
      }
    }

    console.log('[RPGACE] Module registered:', name);
  };

  /* ══════════════════════════════════════════════════════════
     HOOK DEFINITIONS (reference)
     All named hooks fired in the system.
     ══════════════════════════════════════════════════════════

     rpgace:ready        — foundation layer live, all modules can init
     sched:show(type)    — schedule tab switched (daily/weekly/monthly/import)
     page:show(name)     — nav page switched
     agendas:rendered    — agenda cards redrawn
     xp:awarded(amount)  — XP given to the user
     journal:saved(data) — journal entry saved
     db:change(key,val)  — any RPGACE.DB key written
     state:change(k,v)   — any RPGACE.STATE key written
     shift:loaded        — shifts loaded from Fourth rota

  ══════════════════════════════════════════════════════════ */

})(window);

/* ══════════════════════════════════════════════════════════════════
   STEP 8+ MODULES GO BELOW THIS LINE.
   Each module is a RPGACE.register() call.
   No main.js edits. No string replacements. No patch scripts.

   Template:

   RPGACE.register('myFeature', {
     init() {
       RPGACE.hooks.on('sched:show', type => {
         if (type === 'daily') this.render();
       });
     },

     render() {
       const container = document.getElementById('sched-daily');
       if (!container || document.getElementById('my-widget')) return;
       const el = document.createElement('div');
       el.id = 'my-widget';
       el.innerHTML = '...';
       container.appendChild(el);
     },

     async fetchData() {
       return RPGACE.DB.get('myData');
     },

     async callAPI(params) {
       return RPGACE.api('TOOL_NAME', params);
     },
   });

══════════════════════════════════════════════════════════════════ */
/* ================================================================
   RPGACE — FEYNMAN LOOP MODULE
   Step 8 · Registers into rpgace_core.js
   
   Triggers:
     - Taxonomy node button in Encyclopedia
     - Do Now on a learning agenda
     - Oracle chat intent detection
     - Direct: RPGACE.modules.feynman.start(concept)
   
   Outputs:
     - Oracle tab: session report
     - Journal: structured study entry
     - Taxonomy node: study_count++, last_studied_at
     - Agenda: spaced repetition (3/7/14 day follow-up)
     - Content Pipeline: YouTube idea from verified explanation
================================================================ */

/* ===DOMAIN:ORACLE=== */

/* ===MODULE:youtubeOracle=== */
RPGACE.register('youtubeOracle', {

  CMDS: [
    ['Find Your Niche', 'Analyse this YouTube niche for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. FREQUENCY: 2x per week. Return: 1) Niche saturation score 1-10 with explanation 2) Top 3 direct competitors and their strengths 3) Three underserved sub-niches with lower competition 4) Monetisation potential ranking 5) Your single strongest differentiation angle. Be specific to this niche only.'],
    ['Channel Identity Builder', 'Build the channel identity for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. UNIQUE ANGLES: Russian and French and London cultural perspective, building while working hospitality shifts. Return: 1) Three tagline options under 10 words each 2) My Unique Mechanism 3) Brand voice in 3 words 4) Positioning statement in one sentence 5) Visual identity direction 6) What cliches to avoid.'],
    ['90-Day Content Machine', 'Build a 90-day compound view strategy for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. FREQUENCY: 2x per week, 24 videos total. Return: 1) The content pillars for the 90 days 2) Upload schedule with rotation logic 3) Ratio of evergreen vs trending content 4) Which video type to lead with 5) How videos compound on each other 6) What good traction looks like at day 30, 60, 90.'],
    ['Script Writer Hook to CTA', 'Write a complete YouTube script for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. FORMAT: Tutorial showing FL Studio screen with on-camera moments. Include: HOOK in first 10 seconds, PROBLEM in 30 seconds, SOLUTION as main body with scene notes as SCREEN: show X or CAM: say Y, PATTERN INTERRUPT every 90 seconds, CTA in final 20 seconds. TOPIC: Tell me your topic or I will suggest one for your niche.'],
    ['Title and Thumbnail Optimizer', 'Generate 10 title options and thumbnail concepts for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. For each title: CTR score 1-10, one reason, category of Curiosity or Number or Transformation or How-To. For each thumbnail: main image, text overlay max 5 words, colour scheme, emotion triggered. Rank your top 3 title and thumbnail combinations. TOPIC: Describe your video or I will suggest based on underserved gaps in your niche.'],
    ['YouTube Algorithm Audit', 'Audit @AceSanyaBeats for YouTube algorithm performance. NICHE: FL Studio beats and UK hip hop production tutorials. FREQUENCY: 2x per week. Return: 1) CTR OPTIMISATION 2) WATCH TIME retention architecture 3) SESSION TIME end screen card and playlist strategy 4) UPLOAD CONSISTENCY impact 5) COMMUNITY SIGNALS comment strategy 6) SHORTS recommendation 7) THE SINGLE BIGGEST MISTAKE music production channels make. Specific to FL Studio and UK hip hop only.'],
    ['Audience Mind Reader', 'Analyse audience psychology for @AceSanyaBeats. AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats. Return: 1) Their 5 biggest frustrations 2) Their 3 core desires 3) Exact language they use in forums and comments 4) One content idea per frustration 5) Emotional journey from first video to subscriber to buyer 6) What makes them click away in 30 seconds 7) The one emotional trigger that makes them share content.'],
    ['Viral Hook Generator 50', 'Generate 50 viral hooks for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. Category A: 18 TITLE HOOKS specific to FL Studio and beat-making. Category B: 17 THUMBNAIL TEXT HOOKS of 3-5 words max. Category C: 15 FIRST-10-SECONDS SPOKEN HOOKS that open a loop they must close. After the 50 hooks give your top 5 picks across all categories and explain why they outperform the others for this specific niche.'],
  ],

  ICONS: ['??','??','??','??','??','??','??','??'],

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') setTimeout(function() { self._btn(); }, 600);
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._btn(); }, 800);
    });
  },

  _btn: function() {
    if (document.getElementById('yt-ob')) return;
    var self = this;
    var tries = 0;
    var go = function() {
      tries++;
      if (document.getElementById('yt-ob')) return;
      var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]');
      if (!anchor) { if (tries < 20) setTimeout(go, 500); return; }
      var b = document.createElement('button');
      b.id = 'yt-ob';
      b.className = anchor.className;
      b.textContent = '\uD83C\uDFAC YouTube Oracle';
      b.onclick = function() { self.open(); };
      anchor.parentElement.insertBefore(b, anchor.nextSibling);
    };
    setTimeout(go, 600);
    setTimeout(go, 1500);
    setTimeout(go, 3000);
  },

  _close: function() {
    var p = document.getElementById('yt-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('yt-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'yt-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(255,80,80,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(255,40,40,0.06);border-bottom:1px solid rgba(255,80,80,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'YOUTUBE ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,100,100,0.6);margin-bottom:3px;';
    var ch = document.createElement('div');
    ch.textContent = '@AceSanyaBeats';
    ch.style.cssText = 'font-size:13px;font-weight:700;color:#E2E2EC;';
    ht.appendChild(lb); ht.appendChild(ch);
    var cb = document.createElement('button');
    cb.textContent = '×';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
    var note = document.createElement('div');
    note.textContent = '8 COMMANDS · PRE-FILLED FOR YOUR CHANNEL';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span');
      ic.textContent = self.ICONS[i] || '';
      ic.style.fontSize = '16px';
      var tx = document.createElement('span');
      tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(255,60,60,0.1)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });
  },

  run: function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    var input = document.getElementById('chat-input') || document.querySelector('textarea');
    if (input) {
      input.value = cmd[1];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var sb = document.getElementById('send-btn') || document.querySelector('[onclick*="sendChat"]');
      if (sb) { setTimeout(function() { sb.click(); }, 80); }
      else if (typeof sendChat === 'function') { setTimeout(sendChat, 80); }
    }
    RPGACE.utils.toast('?? ' + cmd[0], 'rgba(255,120,120,0.9)', 2500);
  },

});
/* ===END:youtubeOracle=== */

/* ===MODULE:prodOraclePanel=== */
RPGACE.register('prodOraclePanel', {

  CMDS: [
    ['Master Learning', 'I am a music producer using FL Studio making UK hip hop and drill beats. I want to master [TYPE A SPECIFIC PRODUCTION TOPIC]. Teach me this concept completely. Use the 3-layer method: simple terms first, then technical mechanics, then the expert nuance most tutorials miss. Be specific to FL Studio throughout.'],
    ['Instant Understanding', 'Explain [TYPE A PRODUCTION CONCEPT OR TECHNIQUE] to me in exactly 3 layers. Layer 1: explain it like I am 10 years old in 2 sentences. Layer 2: explain the real technical mechanics in 5 sentences. Layer 3: the one expert insight about this that most FL Studio producers never figure out.'],
    ['Socratic Teaching', 'Teach me [TYPE A PRODUCTION CONCEPT] using the Socratic method. Ask me questions to expose what I already know, what I think I know but am wrong about, and what I have never considered. Do not explain the concept directly. Lead me to understand it through my own answers. I make UK hip hop and drill in FL Studio.'],
    ['Real World Application', 'I understand [TYPE A PRODUCTION CONCEPT] in theory but have never applied it. Give me 5 specific real-world scenarios in FL Studio where this knowledge changes a decision I make tonight. For each: the exact situation, the exact decision this knowledge changes, the exact FL Studio steps, and exactly how my beat sounds different.'],
    ['Gap Finder', 'Analyse my production knowledge and find the gap I do not know exists. MY KNOWN CONCEPTS: [LIST EVERY PRODUCTION CONCEPT YOU KNOW, SEPARATED BY COMMAS]. Find: the hidden prerequisite I am missing, the assumption I am probably making that is wrong, the connection between concepts I have not made, and the exact gap limiting my sound right now.'],
    ['Teach It Back', 'I am going to explain [TYPE A PRODUCTION CONCEPT] to you as if you are a complete beginner. Score me on accuracy out of 10, identify every gap in my explanation, then teach me what I got wrong. Here is my explanation: [TYPE YOUR OWN EXPLANATION OF THE CONCEPT IN YOUR OWN WORDS]'],
    ['Permanent Knowledge', 'Design a spaced repetition system for [TYPE A PRODUCTION TOPIC]. Give me: the 5 most important facts to remember, a 30-second daily review exercise, a weekly FL Studio practice task, a test to verify I have mastered it, and the first mistake I will make so I know to watch for it.'],
    ['Beat Analysis', 'Analyse this beat reference and teach me every production technique used. REFERENCE: [DESCRIBE THE BEAT OR PASTE AN ARTIST AND TRACK NAME]. For each technique: name it, how it was done in FL Studio, which taxonomy node it maps to, exact FL Studio steps to recreate it, and difficulty 1-10.'],
    ['Learn in 20 Hours', 'Build a 20-hour plan for mastering [TYPE A PRODUCTION SKILL] in FL Studio. Divide into 10 x 2-hour sessions. For each session: specific skill focus, exact exercises, FL Studio tools involved, test to confirm learning before moving on, and the mistake to watch for.'],
    ['Test Me Until I Master It', 'I have just studied [TYPE A PRODUCTION TOPIC]. Test me with 10 increasingly difficult questions, starting with basic recall and ending with expert application. After each answer: tell me right or wrong, explain what I missed, ask the next question. Do not give answers until I attempt each one.'],
    ['Learning Ladder', 'Create a 5-level learning ladder for [TYPE A PRODUCTION SKILL] in FL Studio. Level 1 is complete beginner and Level 5 is professional. For each level: the skills that define it, how to test if I am at that level, the one exercise that takes me to the next level, and the most common mistake. Then tell me which level I am at based on: [DESCRIBE YOUR CURRENT ABILITY WITH THIS SKILL]'],
    ['Best Resources', 'Find the 5 best resources for learning [TYPE A PRODUCTION SKILL OR CONCEPT] specifically for FL Studio and UK hip hop production. For each: what it is, why it is the best for this topic, what level it targets, what I will learn that I cannot get elsewhere, and how long it takes to extract the value.'],
    ['Research Questions', 'Generate 10 strong research questions about [TYPE A PRODUCTION TOPIC] for FL Studio and UK hip hop production. Each must be specific, actionable in FL Studio, capable of producing a tutorial insight, and relevant to my genre. After the 10 questions, tell me which 3 to research first and why.'],
    ['Productize Yourself', 'Help me turn my production knowledge into a product. MY CORE SKILL: [TYPE YOUR STRONGEST PRODUCTION SKILL]. MY AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats. Give me 3 product formats scored by effort and revenue potential. For the highest scorer: outline, launch positioning, and 7-day launch plan.'],
  ],

  ICONS: ['??','??','❓','??','??','??','??','??','⏰','✅','??','??','??','??'],

  init: function() {
    var self = this;
    setTimeout(function() { self._intercept(); }, 1200);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._intercept(); }, 1200); });
  },

  _intercept: function() {
    if (window._prodOraclePanelIntercepted) return;
    if (typeof window.toggleProdOraclePanel === 'undefined') return;
    window._prodOraclePanelIntercepted = true;
    var self = this;
    window.toggleProdOraclePanel = function() { self.open(); };
  },

  _close: function() {
    var p = document.getElementById('prod-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('prod-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'prod-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(201,168,76,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(201,168,76,0.06);border-bottom:1px solid rgba(201,168,76,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'PROD. BY ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = 'FL Studio · UK Hip Hop · 14 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
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
    note.textContent = '14 COMMANDS · PRE-FILLED FOR YOUR SESSION';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '⭐'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(201,168,76,0.08)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() { requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; }); });
  },

  run: function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    RPGACE.utils.fillGaps(cmd[1], function(filled) {
      RPGACE.utils.sendToOracle(filled);
      RPGACE.utils.toast('?? ' + cmd[0], 'rgba(201,168,76,0.9)', 2000);
    });
  },

});
/* ===END:prodOraclePanel=== */

/* ===MODULE:instaOraclePanel=== */
RPGACE.register('instaOraclePanel', {

  CMDS: [
    ['Content Creator Mode', 'Activate full content creator mode for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. PLATFORMS: Instagram and YouTube. FREQUENCY: 3-4 posts per week. Generate: my positioning, unique voice and angle, content pillars with percentages, the 3 content types that drive the most followers in my niche, and the first 7 posts to create starting today.'],
    ['100 Content Ideas', 'Generate 100 content ideas for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. AUDIENCE: Aspiring producers aged 18-35. Organise into 9 categories: tutorials, beat showcases, process videos, opinion pieces, reaction content, challenges, collaborations, behind-the-scenes, and trending formats. For each idea: the hook angle, format, and why it performs for this audience. Mark the top 10 with a star.'],
    ['50 Viral Hooks', 'Generate 50 viral content hooks for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. AUDIENCE: Aspiring producers aged 18-35. Format: 20 Instagram caption hooks, 20 reel hooks for the first 3 seconds on screen, 10 story hooks. Each must stop the scroll, open a loop, and be specific to FL Studio or beat-making. No generic creator hooks.'],
    ['Viral Content Architect', 'Design a complete viral content piece for @AceSanyaBeats. TOPIC: [TYPE YOUR CONTENT TOPIC]. PLATFORM: Instagram Reels. Build the full architecture: hook in 1 second, tension-building problem, value-delivering solution, pattern interrupt at the midpoint, CTA at the end. Give me the script, visual direction, caption with hashtags, and thumbnail concept.'],
    ['30-Day Calendar', 'Build a 30-day content calendar for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. FREQUENCY: 3-4 posts per week on Instagram and YouTube Shorts. Include: daily posting schedule, content pillar rotation, hooks for each post, trending audio or format notes, and a tracking metric per week. Format as a clear calendar starting tomorrow.'],
    ['Audience Mind Reader', 'Analyse the psychology of my Instagram audience for @AceSanyaBeats. AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats. Return: their 5 deepest frustrations, 3 secret desires beyond just making beats, exact language from comments and DMs, what makes them save vs scroll, what makes them share, the single emotional trigger that makes them follow. Then give me 5 content ideas built directly from these insights.'],
    ['DIAGNOSE: Low Views', 'My Instagram content is getting low views. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose the exact reason and prescribe the fix. Check: hook quality in first 3 frames, audio choice, content relevance, posting time, hashtag strategy, reel length, visual quality, and caption structure. For each issue: how to diagnose it and the exact fix with examples for my niche.'],
    ['DIAGNOSE: Low Likes', 'My Instagram posts get low likes. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose and prescribe. Analyse: emotional resonance, relatability to aspiring producers, visual appeal, CTA quality, whether my content makes people feel something vs just learn, and how it compares to top FL Studio creators.'],
    ['DIAGNOSE: No Comments', 'My Instagram posts get no comments. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose the silence and prescribe how to start conversations. Cover: whether I ask questions, create opinions, am controversial enough to react to, how to end posts to invite discussion, and 5 specific comment-bait post ideas for the production niche.'],
    ['DIAGNOSE: Low Shares', 'My Instagram posts are not shared. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose and prescribe. Analyse: share triggers for the producer audience, whether my content is identity-expressing, whether my tips are good enough to send to a friend, and the 3 specific post formats that will generate shares in my niche.'],
    ['DIAGNOSE: Low Saves', 'My Instagram posts get no saves. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose and prescribe. Saves indicate reference value. Analyse: whether my content functions as a resource people return to, whether I use list formats worth saving, whether my tips are specific enough to keep, and the 5 most saveable content formats for the FL Studio production niche.'],
    ['DIAGNOSE: No Followers', 'My Instagram account is not growing. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Run a complete profile audit. Check: bio clarity, profile picture and highlights, content consistency and visual identity, reason to follow beyond the individual post, positioning vs other FL Studio creators, and whether my niche is clear. Give me a 7-day follower growth action plan.'],
    ['Full Profile Audit', 'Run a complete Instagram profile audit for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. Audit every element: bio, link in bio strategy, profile picture, highlight covers and content, pinned posts, content grid aesthetic, posting frequency, caption style, hashtag strategy, and engagement rate expectations. Priority list of what to fix first.'],
  ],

  ICONS: ['??','??','??','??','??','??','??','❤','??','♻','??','??','??'],

  init: function() {
    var self = this;
    setTimeout(function() { self._intercept(); }, 1400);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._intercept(); }, 1400); });
  },

  _intercept: function() {
    if (window._instaOraclePanelIntercepted) return;
    if (typeof window.toggleInstaPanel === 'undefined') return;
    window._instaOraclePanelIntercepted = true;
    var self = this;
    window.toggleInstaPanel = function() { self.open(); };
  },

  _close: function() {
    var p = document.getElementById('insta-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('insta-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'insta-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(155,89,182,0.2);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(155,89,182,0.06);border-bottom:1px solid rgba(155,89,182,0.15);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'INSTA-ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.8);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = '@AceSanyaBeats · Instagram · 13 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
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
    note.textContent = '13 COMMANDS · PRE-FILLED FOR YOUR ACCOUNT';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '??'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(155,89,182,0.1)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() { requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; }); });
  },

  run: function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    RPGACE.utils.fillGaps(cmd[1], function(filled) {
      RPGACE.utils.sendToOracle(filled);
      RPGACE.utils.toast('?? ' + cmd[0], 'rgba(155,89,182,0.9)', 2000);
    });
  },

});
/* ===END:instaOraclePanel=== */

/* ===MODULE:quickActions=== */
RPGACE.register('quickActions', {
  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._setup(); }, 600);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._setup(); }, 300);
      }
    });
  },

  _send: function(text) {
    var input = document.querySelector('#chat-input');
    if (!input) return;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof sendChat === 'function') {
      sendChat();
    } else {
      var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
      if (btn) btn.click();
    }
  },

  _setup: function() {
    var self = this;
    var row = document.querySelector('.quick-row');
    if (!row || row.dataset.qa === '1') return;
    row.dataset.qa = '1';

    // Fix the 4 broken quickPrompt buttons
    var broken = row.querySelectorAll('button[onclick*="quickPrompt"]');
    broken.forEach(function(btn) {
      var match = btn.getAttribute('onclick').match(/quickPrompt\('(.+)'\)/);
      if (!match) return;
      var text = match[1];
      var newBtn = btn.cloneNode(true);
      newBtn.removeAttribute('onclick');
      newBtn.addEventListener('click', function() {
        self._send(text);
      });
      btn.parentNode.replaceChild(newBtn, btn);
    });

    var allBtns = Array.from(row.querySelectorAll('button'));

    // YT Stats — Composio direct, correct Supadata field names
    var ytStatsBtn = allBtns.find(function(b) {
      return b.textContent.trim() === '🎬 YT stats';
    });
    if (ytStatsBtn && !ytStatsBtn.dataset.qa) {
      ytStatsBtn.dataset.qa = '1';
      ytStatsBtn.removeAttribute('onclick');
      ytStatsBtn.addEventListener('click', function() {
        RPGACE.utils.toast('Fetching YouTube stats...', '#C9A84C', 2000);
        RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
          .then(function(result) {
            var d = result.data || result;
            var msg = '📊 YouTube Stats for @AceSanyaBeats:\n'
              + 'Channel: ' + (d.name || 'AceSanya') + '\n'
              + 'Handle: ' + (d.handle || '@AceSanyaBeats') + '\n'
              + 'Total Views: ' + (d.viewCount || 0) + '\n'
              + 'Videos Published: ' + (d.videoCount || 0) + '\n'
              + (d.description ? 'Bio: ' + d.description + '\n' : '')
              + '\nGiven this is an early-stage channel (FL Studio / UK hip hop, targeting aspiring producers 18-35), what are the 3 most important things I should do THIS WEEK to grow @AceSanyaBeats? Be specific and actionable.';
            self._send(msg);
          })
          .catch(function(err) {
            self._send('YouTube stats fetch failed: ' + err.message);
          });
      });
    }

    // Log to Notion — Composio direct call, no Oracle relay
    var notionBtn = allBtns.find(function(b) {
      return b.textContent.includes('Log to Notion');
    });
    if (notionBtn && !notionBtn.dataset.qa) {
      notionBtn.dataset.qa = '1';
      notionBtn.removeAttribute('onclick');
      notionBtn.addEventListener('click', function() {
        var today = new Date().toISOString().split('T')[0];
        var title = 'RPGACE Session Log — ' + today;
        RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
          parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
          title: title,
          markdown: '## Session Log\n**Date:** ' + today + '\n\n**Source:** RPGACE Oracle\n\nSession logged from RPGACE.'
        }).then(function() {
          RPGACE.utils.toast('📓 Logged to Notion: ' + title, '#9B59B6', 3000);
        }).catch(function(err) {
          RPGACE.utils.toast('Notion failed: ' + err.message, '#E25454', 3000);
        });
      });
    }

    console.log('[RPGACE:quickActions] Quick-action bar patched');
  },
});
/* ===END:quickActions=== */

/* ===MODULE:visualOracle=== */
RPGACE.register('visualOracle', {

  CMDS: [
    ['Director Match', 'I am making a beat with the following characteristics: GENRE: [UK DRILL / UK HIP HOP / TRAP / AFROBEATS — choose one] MOOD: [DARK / EUPHORIC / MELANCHOLIC / AGGRESSIVE / CINEMATIC — choose one] KEY: [TYPE THE KEY AND SCALE, e.g. D Minor, F# Dorian] BPM: [TYPE THE BPM] REFERENCE ARTISTS: [NAME 1-3 ARTISTS THIS BEAT SOUNDS LIKE]. From the Phylum 14 (Visio Cinematica — Visual Treatment, Filmmaking) filmmaker library, match me 3 directors whose visual signature fits this beat. For each director: their signature visual style in 3 words, the camera movement that defines them, their colour palette, why this beat fits their aesthetic, and an 80-word Neural Frames prompt I can use immediately.'],
    ['Visual Treatment Doc', 'Generate a full Visual Treatment Document for my beat. BEAT TITLE: [TYPE BEAT TITLE] GENRE: [TYPE GENRE] MOOD: [TYPE MOOD] KEY + SCALE: [TYPE KEY AND SCALE] BPM: [TYPE BPM] DIRECTOR REFERENCE: [TYPE A FILMMAKER NAME OR VISUAL STYLE]. The document must include: Concept statement (2 sentences), Visual world description (colour palette, lighting, texture), Camera direction (movement vocabulary, shot types, rhythm), Talent/subject direction if any, Scene breakdown (4 scenes with duration), Neural Frames Autopilot prompt (120 words), and export format recommendations for YouTube, Reels, and Beatstars.'],
    ['Copyright Risk Analyser', 'Analyse the copyright risk of my planned music video concept. CONCEPT: [DESCRIBE YOUR VIDEO CONCEPT IN DETAIL] VISUAL REFERENCES: [LIST ANY FILMS, MUSIC VIDEOS, OR DIRECTORS YOU PLAN TO REFERENCE] FOOTAGE SOURCES: [LIST WHERE YOU PLAN TO SOURCE FOOTAGE — stock, self-shot, archival, AI-generated]. For each element: copyright risk level (Low / Medium / High), what specifically creates the risk, how to modify the concept to eliminate or reduce the risk, and safe alternative approaches. End with an overall risk score and a clear/proceed/modify verdict.'],
    ['Mood Board Brief', 'Create a detailed mood board brief for my beat visual. BEAT DESCRIPTION: [DESCRIBE YOUR BEAT — genre, mood, key, BPM, feel] TARGET PLATFORM: [YOUTUBE / INSTAGRAM / BEATSTARS / ALL]. The brief must specify: 5 colour hex codes with usage ratios, 3 texture references (describe the material/surface quality), lighting direction (quality, direction, colour temperature), typography direction if text appears, 5 specific shot types with descriptions, 3 real-world location types that fit, and 3 visual DONTs for this concept. Format this so I can hand it directly to a designer or use it in Canva.'],
    ['Storyboard Scene Builder', 'Build a shot-by-shot storyboard for my music video. SONG SECTION: [INTRO / VERSE / CHORUS / BRIDGE / OUTRO — choose one, or ALL] DURATION: [TYPE THE SECTION LENGTH IN SECONDS] VISUAL STYLE: [TYPE YOUR VISUAL DIRECTION — e.g. dark cinematic UK drill, lo-fi nostalgic, futuristic minimal] LOCATION: [TYPE YOUR PLANNED LOCATION OR WRITE "studio" / "street" / "AI-generated"]. For each shot: shot number, shot type (close-up / medium / wide / extreme close-up), camera movement, subject action, duration in seconds, lighting note, and cut type to next shot. End with a total shot count and pacing assessment.'],
    ['Neural Frames Prompt', 'Generate 3 Neural Frames AI video prompts for my beat. BEAT FEEL: [DESCRIBE IN 5 WORDS] COLOUR DIRECTION: [TYPE 2-3 COLOURS OR A PALETTE NAME] SUBJECT: [TYPE WHAT SHOULD APPEAR — abstract, character, landscape, object] AVOID: [TYPE ANYTHING YOU DO NOT WANT — faces, text, specific styles]. For each prompt: a 100-word Neural Frames Autopilot prompt optimised for beat-sync, the recommended motion intensity setting (Low / Medium / High / Extreme), the recommended style preset if applicable, and what this prompt will generate visually. Label them Option A (safest), Option B (most striking), Option C (most experimental).'],
  ],

  ICONS: ['🎬','📄','⚠️','🎨','🎞️','🤖'],

  init: function() {
    var self = this;
    setTimeout(function() { self._inject(); }, 1400);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._inject(); }, 1400); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._inject(); }, 600);
    });
  },

  _inject: function() {
    if (document.getElementById('visual-oracle-btn')) return;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var btn = document.createElement('button');
    btn.id = 'visual-oracle-btn';
    btn.className = 'agent-btn';
    btn.textContent = '🎬 Visual Oracle';
    btn.style.cssText = 'border-color:rgba(155,89,182,0.4);color:#9B59B6;background:rgba(155,89,182,0.08);margin-left:4px;';
    btn.onclick = function() { RPGACE.modules.visualOracle.open(); };
    row.appendChild(btn);
    console.log('[RPGACE:visualOracle] Button injected');
  },

  _close: function() {
    var p = document.getElementById('visual-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('visual-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'visual-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(155,89,182,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(155,89,182,0.06);border-bottom:1px solid rgba(155,89,182,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'VISUAL ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = RPGACE.utils.phylumLabel(14) + ' · Filmmaker Library · 6 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
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
    note.textContent = '6 COMMANDS · FILMMAKER LIBRARY · NEURAL FRAMES READY';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    var phNote = document.createElement('div');
    phNote.textContent = RPGACE.utils.phylumContext(14);
    phNote.style.cssText = 'font-size:10px;color:rgba(155,89,182,0.6);margin-bottom:14px;letter-spacing:1px;border-left:2px solid rgba(155,89,182,0.3);padding-left:8px;line-height:1.5;';
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
        var proceed = function(promptText) {
          RPGACE.utils.fillGaps(promptText, function(filled) {
            var input = document.querySelector('#chat-input');
            if (!input) return;
            input.value = filled;
            input.dispatchEvent(new Event('input', {bubbles:true}));
            if (typeof sendChat === 'function') sendChat();
          });
        };
        // F14: Director Match used to just tell Claude to imagine "the Phylum
        // XXV filmmaker library" with nothing behind it - no such data
        // existed. Now grounds the prompt in the real 50 profiles stored in
        // taxonomy_nodes (source='f14_filmmaker_library') instead of hoping
        // the model improvises consistent answers each time.
        if (i === 0) {
          self._withFilmmakerLibrary(function(block) { proceed(cmd[1] + '\n\n' + block); });
        } else {
          proceed(cmd[1]);
        }
      };
      body.appendChild(btn);
    });

    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });
  },

  // F14: fetches the 50-director Phylum 14 (Visio Cinematica) library and
  // formats it as a compact reference block for Director Match. Fails open
  // (empty block, same behaviour as before F14) if the fetch fails, rather
  // than blocking the command entirely.
  _withFilmmakerLibrary: function(callback) {
    RPGACE.sb.select('taxonomy_nodes', "source=eq.f14_filmmaker_library&select=concept,definition,colour_palette&order=concept.asc")
      .then(function(rows) {
        rows = rows || [];
        if (rows.length === 0) { callback(''); return; }
        var list = rows.map(function(r) {
          return '- ' + r.concept + ': ' + r.definition + ' Palette: ' + r.colour_palette;
        }).join('\n');
        callback(RPGACE.utils.phylumContext(14) + ' FILMMAKER LIBRARY (choose your 3 matches ONLY from this list, do not invent directors outside it):\n' + list);
      })
      .catch(function() { callback(''); });
  },

});
/* ===END:visualOracle=== */

/* ===MODULE:contentRepurpose=== */
RPGACE.register('contentRepurpose', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() {
        self._restructureQuickBar();
        self._injectAgentButtons();
      }, 1500);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._restructureQuickBar(); }, 400);
      }
      if (name === 'agents') {
        setTimeout(function() { self._injectAgentButtons(); }, 400);
      }
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectVideoWorkshopBtn(); }, 400);
      }
    });
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

  // ── Main repurpose popup ──────────────────────────────────────
  openPopup: function() {
    if (document.getElementById('cr-popup-overlay')) return;
    var self = this;
    var oracleMsgs = self._getOracleMessages(8);

    var overlay = document.createElement('div');
    overlay.id = 'cr-popup-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(61,170,110,0.25);border-radius:14px;padding:28px 32px;width:min(620px,95vw);max-height:90vh;overflow-y:auto;position:relative;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Content Repurpose · Step 14';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:18px;font-weight:700;color:#E2E2EC;margin-bottom:20px;';
    titleEl.textContent = 'Repurpose an idea';

    box.appendChild(eyebrow); box.appendChild(titleEl);

    // ── STEP 1: Oracle idea selection ──
    var step1 = document.createElement('div');
    step1.style.cssText = 'margin-bottom:20px;';
    var s1lbl = document.createElement('div');
    s1lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(61,170,110,0.6);margin-bottom:8px;';
    s1lbl.textContent = 'Step 1 — Oracle Contribution';

    var dropdown = document.createElement('select');
    dropdown.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
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
    oracleContribLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    oracleContribLbl.textContent = 'Oracle contribution:';

    var oracleContrib = document.createElement('textarea');
    oracleContrib.id = 'cr-oracle-contrib';
    oracleContrib.placeholder = 'Select from dropdown above, or paste Oracle content here...';
    oracleContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;max-height:200px;overflow-y:auto;margin-bottom:10px;';

    dropdown.onchange = function() {
      if (dropdown.value) oracleContrib.value = dropdown.value.slice(0, 1000);
    };

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept Oracle contribution';
    acceptBtn.style.cssText = 'padding:8px 16px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';

    step1.appendChild(s1lbl); step1.appendChild(dropdown);
    step1.appendChild(oracleContribLbl); step1.appendChild(oracleContrib);
    step1.appendChild(acceptBtn);
    box.appendChild(step1);

    // ── STEP 2: Your contribution (hidden until step 1 accepted) ──
    var step2 = document.createElement('div');
    step2.style.cssText = 'margin-bottom:20px;display:none;';
    var s2lbl = document.createElement('div');
    s2lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;';
    s2lbl.textContent = 'Step 2 — Your Contribution';
    var yourContribLbl = document.createElement('div');
    yourContribLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    yourContribLbl.textContent = 'Your contribution:';
    var yourContrib = document.createElement('textarea');
    yourContrib.id = 'cr-your-contrib';
    yourContrib.placeholder = 'Add your personal angle, specific details, or additional context here (optional)...';
    yourContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;margin-bottom:10px;';
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
    s3lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(74,144,226,0.6);margin-bottom:6px;';
    s3lbl.textContent = 'Step 3 — Taxonomy Selection';
    var s3sub = document.createElement('div');
    s3sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:12px;';
    s3sub.textContent = 'Confirmed phyla are auto-selected. Tick suggested ones that add value. Red = knowledge gap — include to make the video push your limits.';
    var phylaList = document.createElement('div');
    phylaList.id = 'cr-phyla-list';
    var generateBtn = document.createElement('button');
    generateBtn.textContent = '⚡ Generate all platform outputs';
    generateBtn.style.cssText = 'margin-top:14px;padding:10px 20px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    step3.appendChild(s3lbl); step3.appendChild(s3sub);
    step3.appendChild(phylaList); step3.appendChild(generateBtn);
    box.appendChild(step3);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;';
    closeBtn.onclick = function() { overlay.remove(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ── Step 1 accept ──
    acceptBtn.onclick = function() {
      if (!oracleContrib.value.trim()) {
        RPGACE.utils.toast('Add Oracle contribution first', '#E25454', 2000);
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
            (item.type === 'gap' ? '#E25454' : item.type === 'confirmed' ? '#3DAA6E' : '#4A90E2') + ';';
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

          var prompt = 'Repurpose the following content idea into 4 platform formats for @AceSanyaBeats (FL Studio, UK hip hop, aspiring producers 18-35).\n\n' +
            'ORACLE CONTRIBUTION:\n' + oracleTxt.slice(0, 800) + '\n\n' +
            (yourTxt ? 'MY ADDITIONAL CONTEXT:\n' + yourTxt + '\n\n' : '') +
            (taxonomyContext ? 'TAXONOMY KNOWLEDGE CONTEXT (use this to add depth and teaching credibility):\n' + taxonomyContext + '\n\n' : '') +
            'CONFIRMED PHYLA: ' + checkedPhyla.map(function(p){return p.name;}).join(', ') + '\n\n' +
            'Generate ALL FOUR with different opening lines — no copy-paste between platforms:\n\n' +
            '1. 📸 INSTAGRAM REELS CAPTION\nHook (stops scroll in 2 seconds) + value + CTA. Under 150 words. Line breaks. 3-5 hashtags.\n\n' +
            '2. 🎬 YOUTUBE SHORTS HOOK\n8-word text overlay + spoken hook line + one-line video description. Question or bold claim.\n\n' +
            '3. 🎵 TIKTOK CAPTION\nDifferent angle to Instagram. Casual, direct. Under 100 words. 1-2 trending hooks. Hashtags.\n\n' +
            '4. 📧 EMAIL BLURB\nExactly 60 words. Subject line included. Producer newsletter tone. Personal but professional. CTA at end.\n\n' +
            'After the 4 formats, add:\n5. 🎬 YOUTUBE SCRIPT OUTLINE — intro hook, 3-5 teaching sections with key points, outro CTA\n6. 🎛 PRODUCTION TEACHING ANGLE — what to demonstrate in FL Studio, which concepts to explain, difficulty level\n\n' +
            'Be specific to FL Studio and UK hip hop throughout.';

          overlay.remove();
          RPGACE.utils.sendToOracle(prompt);

          // Hand off to Content Production Live
          if (RPGACE.modules.contentProductionLive) {
            RPGACE.modules.contentProductionLive.createEntry({
              title: titleGuess,
              idea: oracleTxt,
              your_context: yourTxt,
              taxonomy_nodes: checkedPhyla,
              status: 'Idea'
            });
          }

          RPGACE.utils.toast('⚡ Generating outputs + creating ConID entry', '#3DAA6E', 3000);
        });
      };
    };
  },

  _restructureQuickBar: function() {
    if (document.getElementById('cr-restructured')) return;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var self = this;

    // Remove 4 redundant buttons
    Array.from(row.querySelectorAll('button')).forEach(function(btn) {
      var txt = btn.textContent.trim();
      if (txt === '📋 New quests' || txt === '📧 Draft email' ||
          txt === '📓 Log to Notion' || txt === '🎬 YT stats') {
        btn.remove();
      }
    });

    // Add Repurpose button
    if (!document.getElementById('cr-btn')) {
      var crBtn = document.createElement('button');
      crBtn.id = 'cr-btn';
      crBtn.className = 'agent-btn';
      crBtn.textContent = '🔀 Repurpose';
      crBtn.style.cssText = 'border-color:rgba(61,170,110,0.4);color:#3DAA6E;background:rgba(61,170,110,0.08);margin-left:4px;';
      crBtn.onclick = function() { self.openPopup(); };
      row.appendChild(crBtn);
    }

    row.id = 'cr-restructured';
    console.log('[RPGACE:contentRepurpose] Quick bar restructured');
  },

  _injectAgentButtons: function() {
    if (document.getElementById('agent-quick-btns')) return;
    var self = this;
    var agentPage = document.getElementById('page-agents');
    if (!agentPage) return;

    var wrap = document.createElement('div');
    wrap.id = 'agent-quick-btns';
    wrap.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px 20px;margin-bottom:20px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(226,226,236,0.25);text-transform:uppercase;margin-bottom:12px;';
    lbl.textContent = 'Quick Actions';
    var btnGrid = document.createElement('div');
    btnGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    var actions = [
      { label: '📋 New Quests', onclick: function() {
        if (typeof showPage==='function') showPage('advisor');
        setTimeout(function(){ RPGACE.utils.sendToOracle('Give me 3 specific career quests for @AceSanyaBeats today. FL Studio beats, UK hip hop, aspiring producers 18-35. Each: QUEST: [name] | XP: [amount] | Category: [type]'); }, 300);
      }},
      { label: '📧 Draft Email', onclick: function() {
        if (typeof showPage==='function') showPage('advisor');
        setTimeout(function(){ RPGACE.utils.fillGaps('Draft a professional email for @AceSanyaBeats. PURPOSE: [DESCRIBE WHO YOU ARE EMAILING AND WHY]. Sign as: Alex | @AceSanyaBeats | acesanyabeats@gmail.com', function(f){ RPGACE.utils.sendToOracle(f); }); }, 300);
      }},
      { label: '📓 Log to Notion', onclick: function() {
        var today = new Date().toISOString().split('T')[0];
        RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
          parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
          title: 'RPGACE Session — ' + today,
          markdown: '## Session Log\n**Date:** ' + today + '\n\nLogged from RPGACE.'
        }).then(function(){ RPGACE.utils.toast('📓 Logged to Notion', '#9B59B6', 3000); })
          .catch(function(e){ RPGACE.utils.toast('Error: '+e.message, '#E25454', 3000); });
      }},
      { label: '🎬 YT Stats', onclick: function() {
        RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
          .then(function(r){ var d=r.data||r; RPGACE.utils.sendToOracle('📊 YouTube Stats:\nChannel: '+(d.name||'AceSanya')+'\nVideos: '+(d.videoCount||0)+'\nViews: '+(d.viewCount||0)+'\n\nWhat are my 3 most important growth actions this week?'); if(typeof showPage==='function') showPage('advisor'); })
          .catch(function(e){ RPGACE.utils.toast('Error: '+e.message,'#E25454',3000); });
      }},
    ];

    actions.forEach(function(a) {
      var btn = document.createElement('button');
      btn.className = 'agent-btn';
      btn.textContent = a.label;
      btn.onclick = a.onclick;
      btnGrid.appendChild(btn);
    });

    wrap.appendChild(lbl); wrap.appendChild(btnGrid);
    agentPage.insertBefore(wrap, agentPage.firstChild);
  },

  _injectVideoWorkshopBtn: function() {
    if (document.getElementById('vw-repurpose-btn')) return;
    var self = this;
    var sections = document.querySelectorAll('.section-title, h2, h3');
    var vwSection = Array.from(sections).find(function(s){ return s.textContent && s.textContent.includes('VIDEO WORKSHOP'); });
    if (!vwSection) return;
    var btn = document.createElement('button');
    btn.id = 'vw-repurpose-btn';
    btn.textContent = '🔀 Repurpose for All Platforms';
    btn.style.cssText = 'margin-top:10px;padding:9px 18px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;display:block;';
    btn.onclick = function() { self.openPopup(); };
    vwSection.parentElement.insertBefore(btn, vwSection.nextSibling);
  },

});
/* ===END:contentRepurpose=== */


/* ===END_DOMAIN:ORACLE=== */

/* ===DOMAIN:LEARNING=== */

/* ===MODULE:feynman=== */
RPGACE.register('feynman', {

  /* ── Session state ──────────────────────────────────── */
  session: null,

  /* ── System prompts ─────────────────────────────────── */
  PROMPTS: {

    phase1: function(concept, context) {
      return 'You are running a Feynman learning session for a UK music producer named Alex (@AceSanyaBeats) who makes UK drill and hip hop in FL Studio.\n\nThe concept is: ' + concept + '\n' + (context ? 'Context from Alex\'s knowledge base:\n' + context + '\n' : '') + '\nYour job in this phase:\n1. Greet Alex briefly\n2. Ask him to explain ' + concept + ' in his own words — as if teaching someone who has never heard of it\n3. Tell him: no jargon, no looking anything up, just what he actually understands right now\n4. Be warm but direct. One short paragraph response only.\n\nDo NOT explain the concept yourself.';
    },

    phase2: function(concept, explanation) {
      return 'You are running a Feynman gap analysis for a music producer learning: ' + concept + '\n\nAlex\'s explanation:\n"' + explanation + '"\n\nYour job:\n1. Identify the 2-3 most critical gaps or vague points in this explanation\n2. Ask ONE focused question targeting the most important gap\n3. The question should make him think, not confirm — it should expose what he can\'t explain yet\n4. Keep your response to 3 sentences max\n\nDo NOT fill in the gaps for him. Do NOT over-praise. Just probe.';
    },

    phase3: function(concept, explanation, gapAnswer) {
      return 'You are completing a Feynman session for Alex, a UK music producer learning: ' + concept + '\n\nHis initial explanation:\n"' + explanation + '"\n\nHis gap response:\n"' + gapAnswer + '"\n\nGenerate a structured session report in this EXACT format:\n\n**FEYNMAN REPORT — ' + concept + '**\n\n**VERIFIED:** [2-3 things he clearly understands]\n\n**GAPS FOUND:** [1-2 specific things he couldn\'t explain or explained incorrectly]\n\n**SCORE:** [X/10] — [one sentence why]\n\n**NEXT STUDY:** [One specific action — e.g. "Watch Adam Neely\'s Dorian video, focus on the raised 6th"]\n\n**CONTENT ANGLE:** [One YouTube video idea that comes directly from the way he explained this concept — should be a tutorial only he could make based on his current understanding]\n\nBe honest with the score. A 6/10 is good progress. A 10/10 means he can teach it from scratch.';
    },

    singleShot: function(concept, context) {
      return 'Run a rapid one-question Feynman check for Alex on: ' + concept + '\n\n' + (context || '') + '\n\nAsk ONE question that tests whether he actually understands this or just recognises the term. Make it specific to FL Studio and beat-making where possible. Keep it to 1-2 sentences.';
    },
  },

  /* ── Init: wire all triggers ────────────────────────── */
  init: function() {
    var self = this;

    /* Trigger 1: Oracle page — detect learning intent in chat */
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') self._wireOracleDetection();
    });

    /* Trigger 2: Agenda Do Now — intercept learning category */
    self._wrapStartDoNow();

    /* Trigger 3: Encyclopedia / Learning page — add session buttons */
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'encyclopedia' || name === 'learning') {
        setTimeout(function() { self._wireEncyclopediaButtons(); }, 400);
      }
    });

    /* Trigger 4: Agendas rendered — add Feynman button to learning cards */
    RPGACE.hooks.on('agendas:rendered', function() {
      setTimeout(function() { self._wireAgendaCards(); }, 300);
    });

    console.log('[RPGACE:feynman] Module ready');
  },

  /* ── TRIGGER: Oracle chat intent detection ──────────── */
  _wireOracleDetection: function() {
    if (window._rpgace_feynman_oracle_wired) return;
    window._rpgace_feynman_oracle_wired = true;
    var self = this;

    var chatInput = document.getElementById('chat-input');
    if (!chatInput) return;

    /* Detect learning intent on Enter / send */
    chatInput.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      var text = chatInput.value.toLowerCase().trim();
      var learningIntent = [
        'teach me', 'explain', 'what is', 'how does', 'i want to learn',
        'help me understand', 'feynman', 'study', 'learn about',
      ];
      var isLearning = learningIntent.some(function(phrase) {
        return text.includes(phrase);
      });
      if (isLearning && text.length > 8) {
        /* Extract concept from message */
        var concept = self._extractConcept(chatInput.value);
        if (concept) {
          /* Show a subtle offer inline — don't block the normal chat */
          setTimeout(function() { self._showOracleOffer(concept); }, 800);
        }
      }
    }, { passive: true });
  },

  _extractConcept: function(text) {
    var patterns = [
      /teach me (?:about )?(.+)/i,
      /explain (.+)/i,
      /what is (.+)/i,
      /how does (.+) work/i,
      /i want to learn (.+)/i,
      /help me understand (.+)/i,
      /learn about (.+)/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m && m[1]) {
        return m[1].replace(/[?.!]$/, '').trim().slice(0, 60);
      }
    }
    return null;
  },

  _showOracleOffer: function(concept) {
    if (document.getElementById('feynman-offer')) return;
    var self = this;
    var offer = document.createElement('div');
    offer.id = 'feynman-offer';
    offer.style.cssText = 'background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:8px;padding:10px 14px;margin:8px 0;font-family:Rajdhani,sans-serif;font-size:12px;display:flex;align-items:center;gap:10px;';
    offer.innerHTML = '<span style="color:#4A90E2;font-weight:700">\uD83E\uDDE0 Feynman Loop detected</span>'
      + '<span style="color:rgba(226,226,236,0.6);flex:1">Study "' + concept + '" properly — explain it to verify you know it.</span>'
      + '<button onclick="RPGACE.modules.feynman.start(\'' + concept.replace(/'/g, "\\'") + '\',\'oracle\')" '
      + 'style="background:rgba(74,144,226,0.2);border:1px solid #4A90E2;color:#4A90E2;border-radius:5px;padding:4px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:11px;white-space:nowrap">'
      + 'Start Session</button>'
      + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:14px">\u00D7</button>';

    var chatBox = document.getElementById('chat-box') || document.querySelector('.chat-messages');
    if (chatBox) chatBox.appendChild(offer);
    setTimeout(function() { if (offer.parentNode) offer.remove(); }, 8000);
  },

  /* ── TRIGGER: Do Now on learning agenda ─────────────── */
  _wrapStartDoNow: function() {
    if (window._rpgace_feynman_donow_wired) return;
    window._rpgace_feynman_donow_wired = true;
    var self = this;

    if (typeof window.startDoNow !== 'function') return;
    var orig = window.startDoNow;
    window.startDoNow = function(idx) {
      var agendas = (window.STATE && STATE.agendas) || [];
      var agenda  = agendas[idx];
      if (agenda && agenda.category === 'learning') {
        self._showDoNowChoice(idx, agenda, orig);
      } else {
        orig.call(window, idx);
      }
    };
  },

  _showDoNowChoice: function(idx, agenda, orig) {
    var self = this;
    /* Remove any existing choice */
    var existing = document.getElementById('feynman-choice');
    if (existing) existing.remove();

    var choice = document.createElement('div');
    choice.id = 'feynman-choice';
    choice.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0f0f18;border:1px solid rgba(74,144,226,0.4);border-radius:12px;padding:24px;z-index:9998;min-width:300px;font-family:Rajdhani,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.6)';
    choice.innerHTML = '<div style="font-family:Cinzel,serif;font-size:14px;color:#C9A84C;margin-bottom:8px">\uD83D\uDCDA ' + agenda.title + '</div>'
      + '<div style="color:rgba(226,226,236,0.7);font-size:12px;margin-bottom:20px">This is a learning session. How do you want to approach it?</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px">'
      + '<button onclick="RPGACE.modules.feynman.start(\'' + agenda.title.replace(/'/g, "\\'") + '\',\'agenda\');document.getElementById(\'feynman-choice\').remove()" '
      + 'style="background:rgba(74,144,226,0.15);border:1px solid rgba(74,144,226,0.4);color:#4A90E2;padding:10px 14px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;text-align:left">'
      + '\uD83E\uDDE0 Feynman Loop — Test your understanding</button>'
      + '<button onclick="window._origStartDoNow(' + idx + ');document.getElementById(\'feynman-choice\').remove()" '
      + 'style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.7);padding:10px 14px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;text-align:left">'
      + '\u25B6 Standard Do Now — Timer only</button>'
      + '<button onclick="document.getElementById(\'feynman-choice\').remove()" style="background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:11px;margin-top:4px">Cancel</button>'
      + '</div>';
    window._origStartDoNow = orig;
    document.body.appendChild(choice);
  },

  /* ── TRIGGER: Encyclopedia taxonomy buttons ──────────── */
  _wireEncyclopediaButtons: function() {
    var self = this;
    /* Look for encyclopedia entry headers with taxonomy info */
    var entries = document.querySelectorAll('.enc-entry,.enc-card,[class*="enc-"]');
    entries.forEach(function(entry) {
      if (entry.querySelector('.feynman-enc-btn')) return;
      var title = entry.querySelector('h3,h4,.enc-title,.entry-title');
      if (!title) return;
      var concept = title.textContent.trim();
      var btn = document.createElement('button');
      btn.className = 'feynman-enc-btn';
      btn.style.cssText = 'font-size:10px;font-family:Rajdhani,sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);color:#4A90E2;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:8px;vertical-align:middle';
      btn.textContent = '\uD83E\uDDE0 Feynman';
      btn.onclick = function(e) {
        e.stopPropagation();
        self.start(concept, 'encyclopedia');
      };
      title.appendChild(btn);
    });
  },

  /* ── TRIGGER: Agenda card Feynman button ─────────────── */
  _wireAgendaCards: function() {
    var self = this;
    var agendas = (window.STATE && STATE.agendas) || [];
    document.querySelectorAll('.agenda-card,.agenda-item').forEach(function(card, i) {
      if (card.querySelector('.feynman-card-btn')) return;
      var agenda = agendas[i];
      if (!agenda || agenda.category !== 'learning') return;
      var btn = document.createElement('button');
      btn.className = 'feynman-card-btn';
      btn.style.cssText = 'font-size:10px;font-family:Rajdhani,sans-serif;font-weight:700;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);color:#4A90E2;padding:3px 8px;border-radius:4px;cursor:pointer;margin-top:4px;display:block';
      btn.textContent = '\uD83E\uDDE0 Feynman Test';
      btn.onclick = function(e) {
        e.stopPropagation();
        self.start(agenda.title, 'agenda');
      };
      card.appendChild(btn);
    });
  },

  /* ════════════════════════════════════════════════════════
     CORE: START SESSION
  ════════════════════════════════════════════════════════ */
  start: function(concept, source) {
    this.session = {
      id:          RPGACE.utils.id(),
      concept:     concept,
      source:      source || 'direct',
      phase:       1,
      explanation: '',
      gapAnswer:   '',
      score:       0,
      startedAt:   new Date().toISOString(),
    };
    this._openPanel(concept);
    this._runPhase1();
  },

  /* ── Panel UI ────────────────────────────────────────── */
  _openPanel: function(concept) {
    var existing = document.getElementById('feynman-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'feynman-panel';
    panel.style.cssText = [
      'position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh',
      'background:#0c0c16;border-left:1px solid rgba(74,144,226,0.2)',
      'z-index:9999;display:flex;flex-direction:column',
      'box-shadow:-20px 0 60px rgba(0,0,0,0.5)',
      'font-family:Rajdhani,sans-serif',
      'transform:translateX(100%);transition:transform .3s ease',
    ].join(';');

    panel.innerHTML = [
      '<div style="background:rgba(74,144,226,0.08);border-bottom:1px solid rgba(74,144,226,0.2);padding:16px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">',
        '<div>',
          '<div style="font-family:Cinzel,serif;font-size:11px;color:rgba(74,144,226,0.7);letter-spacing:2px;text-transform:uppercase">Feynman Loop</div>',
          '<div id="feynman-concept" style="font-size:15px;font-weight:700;color:#E2E2EC;margin-top:2px">' + concept + '</div>',
        '</div>',
        '<div style="display:flex;align-items:center;gap:10px">',
          '<div id="feynman-phase-badge" style="font-size:10px;font-weight:700;letter-spacing:1px;color:#4A90E2;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:10px;padding:3px 10px">Phase 1/3</div>',
          '<button onclick="RPGACE.modules.feynman.closePanel()" style="background:none;border:none;color:rgba(226,226,236,0.4);cursor:pointer;font-size:18px;line-height:1">\u00D7</button>',
        '</div>',
      '</div>',
      /* Progress bar */
      '<div style="height:3px;background:rgba(255,255,255,0.05);flex-shrink:0">',
        '<div id="feynman-progress" style="height:100%;background:#4A90E2;width:33%;transition:width .4s ease"></div>',
      '</div>',
      /* Messages */
      '<div id="feynman-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px"></div>',
      /* Input area */
      '<div style="border-top:1px solid rgba(255,255,255,0.06);padding:12px;flex-shrink:0">',
        '<textarea id="feynman-input" placeholder="Type your explanation here..." rows="3" ',
          'style="width:100%;background:#12121e;border:1px solid rgba(255,255,255,0.1);border-radius:7px;color:#E2E2EC;',
          'padding:10px 12px;font-family:Rajdhani,sans-serif;font-size:13px;resize:none;outline:none;box-sizing:border-box"></textarea>',
        '<div style="display:flex;gap:8px;margin-top:8px">',
          '<button id="feynman-submit" onclick="RPGACE.modules.feynman.submit()" ',
            'style="flex:1;background:rgba(74,144,226,0.2);border:1px solid rgba(74,144,226,0.5);color:#4A90E2;',
            'padding:9px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;letter-spacing:1px">',
            'SUBMIT',
          '</button>',
        '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(panel);
    /* Slide in */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });
  },

  closePanel: function() {
    var panel = document.getElementById('feynman-panel');
    if (panel) {
      panel.style.transform = 'translateX(100%)';
      setTimeout(function() { panel.remove(); }, 320);
    }
    this.session = null;
  },

  _addMessage: function(text, role) {
    var msgs = document.getElementById('feynman-messages');
    if (!msgs) return;
    var isOracle = role === 'oracle';
    var msg = document.createElement('div');
    msg.style.cssText = [
      'padding:10px 13px;border-radius:8px;font-size:12px;line-height:1.6;max-width:92%',
      isOracle
        ? 'background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.15);color:rgba(226,226,236,0.85);align-self:flex-start'
        : 'background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.15);color:rgba(226,226,236,0.85);align-self:flex-end',
    ].join(';');
    /* Render basic markdown bold */
    msg.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#E2E2EC">$1</strong>').replace(/\n/g, '<br>');
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
  },

  _setLoading: function(on) {
    var btn = document.getElementById('feynman-submit');
    var inp = document.getElementById('feynman-input');
    if (btn) btn.disabled = on;
    if (inp) inp.disabled = on;
    if (btn) btn.textContent = on ? 'THINKING...' : 'SUBMIT';
  },

  _setPhase: function(phase) {
    var badge = document.getElementById('feynman-phase-badge');
    var bar   = document.getElementById('feynman-progress');
    var labels = { 1: 'Phase 1/3 — Explain', 2: 'Phase 2/3 — Gap Check', 3: 'Phase 3/3 — Report' };
    var widths  = { 1: '33%', 2: '66%', 3: '100%' };
    if (badge) badge.textContent = labels[phase] || 'Phase ' + phase;
    if (bar)   bar.style.width   = widths[phase] || '33%';
  },

  /* ── Phase 1: Ask user to explain ───────────────────── */
  _runPhase1: function() {
    var self    = this;
    var concept = this.session.concept;
    this._setPhase(1);
    this._setLoading(true);

    RPGACE.oracle(
      [{ role: 'user', content: 'Begin Phase 1 of the Feynman session for concept: ' + concept }],
      this.PROMPTS.phase1(concept, '')
    ).then(function(resp) {
      var text = resp && resp.content ? resp.content[0].text : (typeof resp === 'string' ? resp : 'Explain ' + concept + ' in your own words, as simply as possible.');
      self._addMessage(text, 'oracle');
      self._setLoading(false);
    }).catch(function(e) {
      self._addMessage('Explain "' + concept + '" in plain language — no jargon, as if teaching someone completely new to music production.', 'oracle');
      self._setLoading(false);
    });
  },

  /* ── Phase 2: Probe gaps ─────────────────────────────── */
  _runPhase2: function(explanation) {
    var self    = this;
    var concept = this.session.concept;
    this.session.explanation = explanation;
    this._setPhase(2);
    this._addMessage(explanation, 'user');
    this._setLoading(true);

    RPGACE.oracle(
      [{ role: 'user', content: 'User explained: ' + explanation }],
      this.PROMPTS.phase2(concept, explanation)
    ).then(function(resp) {
      var text = resp && resp.content ? resp.content[0].text : (typeof resp === 'string' ? resp : "What's the one thing about " + concept + " you find hardest to explain?");
      self._addMessage(text, 'oracle');
      self._setLoading(false);
    }).catch(function(e) {
      self._addMessage("Now the hard part — what's the piece of " + concept + " you find hardest to explain?", 'oracle');
      self._setLoading(false);
    });
  },

  /* ── Phase 3: Report ─────────────────────────────────── */
  _runPhase3: function(gapAnswer) {
    var self    = this;
    var concept = this.session.concept;
    this.session.gapAnswer = gapAnswer;
    this.session.phase     = 3;
    this._setPhase(3);
    this._addMessage(gapAnswer, 'user');
    this._setLoading(true);

    /* Hide input while generating report */
    var inputArea = document.querySelector('#feynman-panel > div:last-child');
    if (inputArea) inputArea.style.display = 'none';

    RPGACE.oracle(
      [{ role: 'user', content: 'Gap answer: ' + gapAnswer }],
      this.PROMPTS.phase3(concept, this.session.explanation, gapAnswer)
    ).then(function(resp) {
      var report = resp && resp.content ? resp.content[0].text : (typeof resp === 'string' ? resp : 'Session complete. Review your explanation of ' + concept + '.');
      self.session.report    = report;
      self.session.completedAt = new Date().toISOString();

      /* Extract score */
      var scoreMatch = report.match(/SCORE[:\s]+(\d+)/i);
      self.session.score = scoreMatch ? parseInt(scoreMatch[1]) : 6;

      self._addMessage(report, 'oracle');
      self._setLoading(false);
      self._showCompleteActions();
      self._saveSession();
    }).catch(function(e) {
      self._addMessage('Session complete. Review your notes on ' + concept + '.', 'oracle');
      self._setLoading(false);
    });
  },

  /* ── Submit handler (phase router) ──────────────────── */
  submit: function() {
    var inp = document.getElementById('feynman-input');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = '';

    if (!this.session) return;

    if (this.session.phase === 1) {
      this.session.phase = 2;
      this._runPhase2(text);
    } else if (this.session.phase === 2) {
      this.session.phase = 3;
      this._runPhase3(text);
    }
  },

  /* ── Actions after report ────────────────────────────── */
  _showCompleteActions: function() {
    var self    = this;
    var concept = this.session.concept;
    var score   = this.session.score;

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-top:1px solid rgba(255,255,255,0.06)';
    actions.innerHTML = [
      '<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:4px">Session saved</div>',
      '<div style="display:flex;gap:8px">',
        '<div style="flex:1;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:7px;padding:10px;text-align:center">',
          '<div style="font-size:22px;font-weight:700;color:#4A90E2;font-family:Cinzel,serif">' + score + '<span style="font-size:12px">/10</span></div>',
          '<div style="font-size:10px;color:rgba(226,226,236,0.5);margin-top:2px">Feynman Score</div>',
        '</div>',
        '<div style="flex:2;display:flex;flex-direction:column;gap:5px">',
          score < 7
            ? '<div style="font-size:11px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);color:#C9A84C;border-radius:5px;padding:6px 10px">\u23F0 Review scheduled in 3 days</div>'
            : '<div style="font-size:11px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);color:#3DAA6E;border-radius:5px;padding:6px 10px">\u2713 Verified — follow-up in 7 days</div>',
          '<div style="font-size:11px;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.2);color:#4A90E2;border-radius:5px;padding:6px 10px">\uD83D\uDCD3 Saved to Journal</div>',
        '</div>',
      '</div>',
      '<button onclick="RPGACE.modules.feynman.closePanel()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(226,226,236,0.6);padding:8px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:12px;margin-top:2px">Close Panel</button>',
    ].join('');

    var panel = document.getElementById('feynman-panel');
    if (panel) panel.appendChild(actions);
  },

  /* ════════════════════════════════════════════════════════
     SAVE SESSION
     Journal + localStorage + Taxonomy + Spaced Repetition
  ════════════════════════════════════════════════════════ */
  _saveSession: function() {
    var self    = this;
    var session = this.session;
    if (!session) return;

    /* 1. Save to RPGACE.DB (localStorage) */
    RPGACE.DB.push('feynman_sessions', {
      concept:     session.concept,
      source:      session.source,
      score:       session.score,
      explanation: session.explanation,
      gapAnswer:   session.gapAnswer,
      report:      session.report,
      startedAt:   session.startedAt,
      completedAt: session.completedAt,
    });

    /* 2. Save to Journal */
    var journalContent = [
      '**Feynman Loop — ' + session.concept + '**',
      '',
      '**My explanation:**',
      session.explanation,
      '',
      '**Gap I found:**',
      session.gapAnswer,
      '',
      '**Session Report:**',
      session.report || '',
      '',
      'Score: ' + session.score + '/10',
      'Source: ' + session.source,
      'Duration: ~' + Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000) + ' min',
    ].join('\n');

    if (typeof saveToJournal === 'function') {
      saveToJournal(
        'Feynman: ' + session.concept + ' (' + session.score + '/10)',
        journalContent,
        'feynman'
      ).catch(function(e) { console.warn('[feynman] Journal save failed:', e.message); });
    }

    /* 3. Send report to Oracle chat (as an assistant message) */
    if (typeof addMsg === 'function' && session.report) {
      setTimeout(function() {
        addMsg(
          '\uD83E\uDDE0 **Feynman Report — ' + session.concept + '**\n\n' + session.report,
          'assistant'
        );
      }, 500);
    }

    /* 4. Spaced repetition — create follow-up agenda */
    var daysOut   = session.score >= 7 ? 7 : 3;
    var followUp  = new Date();
    followUp.setDate(followUp.getDate() + daysOut);
    var followDate = RPGACE.utils.dateStr(followUp);

    RPGACE.DB.push('sched', {
      date:           followDate,
      hour:           10,
      title:          'Feynman Review: ' + session.concept,
      description:    'Spaced repetition — re-test understanding. Previous score: ' + session.score + '/10',
      category:       'learning',
      estimated_mins: 20,
      xp:             30,
      from_feynman:   true,
      feynman_score:  session.score,
    });

    RPGACE.utils.toast(
      '\uD83E\uDDE0 Session saved ' + session.score + '/10 \u00B7 Review in ' + daysOut + ' days',
      '#4A90E2', 4000
    );

    /* 5. Update taxonomy node in Supabase (non-blocking) */
    self._updateTaxonomyNode(session.concept, session.score);

    /* 6. Log to daily action log */
    var today = RPGACE.utils.dateStr();
    var log   = RPGACE.DB.get('log') || {};
    if (!log[today]) log[today] = [];
    log[today].push({
      time:    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      title:   'Feynman: ' + session.concept,
      summary: 'Score ' + session.score + '/10. ' + (session.score < 7 ? 'Gaps found — review in 3 days.' : 'Verified.'),
      done:    true,
      id:      RPGACE.utils.id(),
    });
    RPGACE.DB.set('log', log);
  },

  _updateTaxonomyNode: function(concept, score) {
    // Route through taxonomySync module which uses RPGACE.sb helpers and correct schema
    if (RPGACE.modules.taxonomySync && typeof RPGACE.modules.taxonomySync.updateGapScore === 'function') {
      RPGACE.modules.taxonomySync.updateGapScore(concept, score);
      console.log('[feynman] Taxonomy gap score updated via taxonomySync:', concept, 'score:', score);
    } else {
      console.warn('[feynman] taxonomySync not available — gap score not updated');
    }
  },

});
/* ===END:feynman=== */

/* ===MODULE:encSync=== */
RPGACE.register('encSync', {

  init: function() {
    var self = this;
    setTimeout(function() { self._patch(); }, 800);
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._patch(); }, 800);
    });
  },

  _clearBacklog: function() {
    /* Wipe URL queue so next sync doesn't reimport the same items */
    var hadUrls = !!localStorage.getItem('rpgace_enc_saved');
    localStorage.removeItem('rpgace_enc_saved');
    localStorage.removeItem('rpgace_intel_insights');
    return hadUrls;
  },

  _patch: function() {
    if (window._encSyncPatched) return;
    var fn = window.syncAndPush;
    var clr = window.clearEncyclopedia;
    if (!fn || !clr) return;

    window._encSyncPatched = true;
    var self = this;

    /* ── Patch syncAndPush ── */
    window.syncAndPush = function() {
      var before = 0;
      try {
        var prev = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
        before = prev.length;
      } catch(e) {}

      fn.apply(this, arguments);

      /* Give the original function time to finish (it likely does fetch/setState) */
      setTimeout(function() {
        self._clearBacklog();

        try {
          var after = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
          var net = after.length - before;
          var msg = net > 0
            ? '✅ ' + net + ' new entries added'
            : net === 0
              ? '✓ Already up to date'
              : '✓ Sync complete';
          RPGACE.utils.toast(msg, 'rgba(201,168,76,0.9)', 3500);
          if (typeof window.refreshEncyclopediaDisplay === 'function') {
            window.refreshEncyclopediaDisplay();
          }
          self._autoPropose(after);
        } catch(e) {}
      }, 2500);
    };

    /* ── Patch clearEncyclopedia ── */
    window.clearEncyclopedia = function() {
      self._clearBacklog();
      clr.apply(this, arguments);
      RPGACE.utils.toast('?? Encyclopedia + backlog cleared', 'rgba(226,84,84,0.9)', 2500);
    };

    console.log('[RPGACE:encSync] Patched syncAndPush + clearEncyclopedia');
  },

  // F5: silent taxonomy_proposals queueing for Encyclopedia entries, same
  // pattern/guard as ciAutoPropose's F4 hook on Content Intelligence. Capped
  // at 5 checks per sync so one big backlog sync can't fire a burst of
  // Oracle calls.
  _autoPropose: function(entries) {
    if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) return;
    var guard = localStorage.getItem('rpgace_enc_proposed') || '';
    var queued = 0, checked = 0;
    (entries || []).forEach(function(e) {
      if (checked >= 5) return;
      var key = (e.title || '').toLowerCase().trim();
      if (!key || guard.indexOf('|' + key + '|') !== -1) return;
      checked++;
      guard += '|' + key + '|';
      var blob = (e.title || '') + ' ' + (e.content || '');
      if (blob.length < 60) return;
      var matches = RPGACE.utils._quickPhylaScan(blob);
      if (matches.length === 0) return;
      RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'encyclopedia', e.id || null)
        .catch(function(err) { console.warn('[encSync] silentPropose failed:', err.message); });
      queued++;
    });
    localStorage.setItem('rpgace_enc_proposed', guard);
    if (queued > 0) {
      RPGACE.utils.toast('🌳 ' + queued + ' taxonomy proposal' + (queued > 1 ? 's' : '') + ' queued for review', 'rgba(155,89,182,0.85)', 3000);
    }
  },

});
/* ===END:encSync=== */

/* ===MODULE:ciAutoPropose=== */
// F4: silent taxonomy_proposals queueing at the end of every Content
// Intelligence pipeline run (syncIntelData), same guarded pattern as
// main.js's existing "auto-save new entries to encyclopedia" loop just
// above it — mirrors that loop's dedup-by-url/title + 5-item cap so this
// doesn't fan out into a burst of Oracle calls on a big backlog sync.
RPGACE.register('ciAutoPropose', {

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.syncIntelData !== 'function' || window._ciAutoProposePatched) return;
      window._ciAutoProposePatched = true;
      var orig = window.syncIntelData;
      window.syncIntelData = function() {
        var result = orig.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          result.then(function(all) { self._scan(all || []); });
        }
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // REWRITTEN July 19 (Fable audit follow-up, confirmed by Alex): the
  // old version proposed ONE title-led 300-char blob per video - which
  // is exactly why YouTube-sourced leaves were video titles instead of
  // concepts, and why a video never got book-depth treatment despite
  // intel_reports ALREADY storing per-video key_learnings and
  // production_techniques arrays from the analysis. Now each stored
  // insight is proposed individually through the same unified scored
  // engine book insights use - same rules, same justification, same
  // confidence. Caps keep sync cost bounded: still max 5 new videos per
  // scan, max 3 insights per video, max 9 total proposals per scan.
  _scan: function(all) {
    if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) return;
    var guard = localStorage.getItem('rpgace_ci_proposed') || '';
    var queued = 0, checked = 0;
    var MAX_VIDEOS = 5, MAX_PER_VIDEO = 3, MAX_TOTAL = 9;
    all.forEach(function(r) {
      if (checked >= MAX_VIDEOS || queued >= MAX_TOTAL) return;
      var key = r.url || r.title;
      if (!key || guard.indexOf('|' + key + '|') !== -1) return;
      checked++;
      guard += '|' + key + '|';

      // Per-insight loop: the real analysed content, never the title.
      var insightTexts = []
        .concat((r.insights && r.insights.key_learnings) || [])
        .concat((r.insights && r.insights.production_techniques) || [])
        .map(function(t) { return String(t || '').trim(); })
        .filter(function(t) { return t.length >= 40; }); // substantial only

      if (insightTexts.length) {
        insightTexts.slice(0, MAX_PER_VIDEO).forEach(function(insightText) {
          if (queued >= MAX_TOTAL) return;
          var m = RPGACE.utils._quickPhylaScan(insightText);
          if (!m.length) return;
          RPGACE.modules.taxonomyTree.silentPropose(insightText.slice(0, 400), m[0].num, 'content_intelligence', r.url || null)
            .catch(function(err) { console.warn('[ciAutoPropose] silentPropose failed:', err.message); });
          queued++;
        });
        return;
      }

      // Fallback for older reports with no stored insight arrays: the
      // old blob behavior, minus the title/creator (the audit-confirmed
      // source of title-shaped placements) - summary text only.
      var enc = r.insights && r.insights.encyclopedia_entry;
      var blob = [enc && enc.summary].filter(Boolean).join(' ');
      if (blob.length < 60) return;
      var matches = RPGACE.utils._quickPhylaScan(blob);
      if (matches.length === 0) return;
      RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 400), matches[0].num, 'content_intelligence', r.url || null)
        .catch(function(err) { console.warn('[ciAutoPropose] silentPropose failed:', err.message); });
      queued++;
    });
    localStorage.setItem('rpgace_ci_proposed', guard);
    if (queued > 0) {
      RPGACE.utils.toast('🌳 ' + queued + ' taxonomy proposal' + (queued > 1 ? 's' : '') + ' queued for review', 'rgba(155,89,182,0.85)', 3000);
    }
  },

});
/* ===END:ciAutoPropose=== */

/* ===MODULE:oracleTreeGrounding=== */
// July 19 — TOP PRIORITY per Alex ("yes and make top"): Oracle chat now
// READS the taxonomy tree, not just writes into it. Spec answers
// recorded verbatim in oracle_grounding_spec.txt: trigger = keyword
// match only (zero cost on unrelated chat), depth = leaf names +
// explainers only (never deep_content - stays far from the 504/length
// danger zone), gap behavior = say "not in your library yet" and offer
// to place it via Phylum Path (every gap becomes a learning prompt).
//
// Mechanism: a chainable wrap on window.callOracle (main.js global, the
// single funnel every Oracle surface uses) - NO main.js edit needed.
// Gated by persona marker so it fires ONLY for conversational surfaces
// (main chat's ORACLE_SYS, Prod Oracle's teaching persona) - never for
// JSON/placement/formatter calls, which have their own system prompts.
// Same _xPatched guard + fall-through convention as scheduleOracle's
// and bookworm's sendChat wraps.
RPGACE.register('oracleTreeGrounding', {

  PERSONA_MARKERS: ['You are the Oracle —', "You are Alex's personal 300IQ music production teacher"],

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.callOracle !== 'function' || window._treeGroundingPatched) return;
      window._treeGroundingPatched = true;
      var orig = window.callOracle;
      window.callOracle = function(messages, system, maxTokens) {
        var isConversational = typeof system === 'string' && self.PERSONA_MARKERS.some(function(m) { return system.indexOf(m) !== -1; });
        if (!isConversational || !messages || !messages.length) {
          return orig.apply(this, arguments);
        }
        var lastUser = null;
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') { lastUser = String(messages[i].content || ''); break; }
        }
        if (!lastUser) return orig.apply(this, arguments);
        var args = arguments;
        var callerThis = this;
        // Retrieval failure must NEVER break chat - fall through to the
        // original call with the original system prompt on any error.
        return self._buildGroundingBlock(lastUser).catch(function() { return ''; }).then(function(block) {
          if (block) {
            return orig.call(callerThis, messages, system + block, maxTokens);
          }
          return orig.apply(callerThis, args);
        });
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // Keyword-match trigger: reuses the same phyla-keyword machinery the
  // auto-detect badge already uses. No match = empty block = the call
  // proceeds untouched, costing nothing.
  _buildGroundingBlock: function(userText) {
    var self = this;
    if (!RPGACE.utils._quickPhylaScan) return Promise.resolve('');
    var matches = RPGACE.utils._quickPhylaScan(userText);
    if (!matches.length) return Promise.resolve('');
    var phylaNums = matches.slice(0, 2).map(function(m) { return m.num; });
    return RPGACE.sb.select('taxonomy_tree',
      'phylum_number=in.(' + phylaNums.join(',') + ')&node_type=eq.leaf&select=name,path,explainer&limit=200'
    ).then(function(leaves) {
      leaves = leaves || [];
      if (!leaves.length) return self._gapOnlyBlock();
      // Rank leaves by word overlap with the question - crude but free,
      // and enough to pick the 6 most relevant out of a phylum's leaves.
      var qWords = userText.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 3; });
      var scored = leaves.map(function(l) {
        var hay = (l.name + ' ' + (l.explainer || '')).toLowerCase();
        var score = 0;
        qWords.forEach(function(w) { if (hay.indexOf(w) !== -1) score++; });
        return { leaf: l, score: score };
      }).sort(function(a, b) { return b.score - a.score; });
      var top = scored.filter(function(s) { return s.score > 0; }).slice(0, 6);
      if (!top.length) return self._gapOnlyBlock();
      var lines = top.map(function(s) {
        return '- ' + s.leaf.path + (s.leaf.explainer ? ' — ' + s.leaf.explainer : '');
      }).join('\n');
      return '\n\n---\nALEX\'S OWN KNOWLEDGE LIBRARY (real, personally gathered insights from the RPGACE taxonomy tree relevant to this message):\n' + lines + '\n' +
        'Ground your answer in these first - reference them by name so Alex sees his own library working - then add general knowledge on top. ' +
        'If the specific thing asked about is NOT covered by the entries above, say briefly that it isn\'t in his RPGACE library yet and offer to place it via Phylum Path so it gets learned properly.';
    });
  },

  // The matched phylum has no relevant leaves at all - still worth
  // telling Oracle, per the confirmed gap behavior: the honest "not in
  // your library yet" + offer to learn is the answer, not silence.
  _gapOnlyBlock: function() {
    return '\n\n---\nNOTE: this message matches topics in RPGACE\'s taxonomy, but no gathered insight in Alex\'s own knowledge library covers it yet. Answer from general knowledge, but say briefly that this isn\'t in his RPGACE library yet and offer to place it via Phylum Path so it gets learned properly.';
  },

});
/* ===END:oracleTreeGrounding=== */

/* ===MODULE:researchTabs=== */
// July 19 — Research page redesign (confirmed answers, recorded in the
// patch notes card: sub-tabs within Research / show-8-plus-Show-more
// lists / searchable Beat Log picker). The page previously rendered SIX
// full-depth sections stacked in one scroll - Content Intelligence,
// Video Finder, Idea Bank, Reference Corpus, Beat Log, Video Workshop,
// plus Bookworm's Bibliography - all at once. Now a tab bar at the top
// shows exactly one section at a time. Pure runtime layer: static
// index.html untouched (per the standing landmine rules), injected
// panels located by id, static panels by their h3 text. A section that
// can't be found simply stays visible - the fallback is the old
// behavior, never a hidden-forever section.
RPGACE.register('researchTabs', {

  TABS: [
    { key: 'intel',    label: '🧠 Intelligence' },
    { key: 'finder',   label: '🎬 Video Finder' },
    { key: 'ideas',    label: '💡 Idea Bank' },
    { key: 'corpus',   label: '🎼 Corpus' },
    { key: 'beatlog',  label: '🥁 Beat Log' },
    { key: 'workshop', label: '🔀 Workshop' },
    { key: 'biblio',   label: '📚 Bibliography' },
  ],

  init: function() {
    var self = this;
    // Injected sibling panels land at various timers (1300-1700ms) -
    // re-apply visibility at staggered delays so a panel injected AFTER
    // the first pass still gets sorted into its tab instead of leaking
    // into whatever tab is active. Idempotent, cheap (pure DOM checks).
    [1200, 2500, 4500, 8000].forEach(function(ms) {
      setTimeout(function() { self._inject(); self._apply(); }, ms);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) { self._inject(); self._apply(); }
    });
  },

  // Section roots resolved fresh on every apply - injected panels may
  // not exist yet on early passes, and that must never break anything.
  _resolveSections: function() {
    var page = document.getElementById('page-learning');
    if (!page) return {};
    var out = {};
    var panels = page.querySelectorAll('.learn-panel');
    Array.prototype.forEach.call(panels, function(p) {
      var h3 = p.querySelector('h3');
      var txt = h3 ? h3.textContent : '';
      if (txt.indexOf('CONTENT INTELLIGENCE') !== -1) out.intel = p;
      else if (txt.indexOf('VIDEO FINDER') !== -1) out.finder = p;
    });
    if (document.getElementById('video-workshop-panel')) out.workshop = document.getElementById('video-workshop-panel');
    if (document.getElementById('cp-idea-bank')) out.ideas = document.getElementById('cp-idea-bank');
    if (document.getElementById('ref-corpus-panel')) out.corpus = document.getElementById('ref-corpus-panel');
    if (document.getElementById('beat-log-panel')) out.beatlog = document.getElementById('beat-log-panel');
    if (document.getElementById('bookworm-bibliography')) out.biblio = document.getElementById('bookworm-bibliography');
    return out;
  },

  _activeTab: function() {
    return localStorage.getItem('rpgace_research_tab') || 'intel';
  },

  _inject: function() {
    var self = this;
    if (document.getElementById('research-tab-bar')) return;
    var page = document.getElementById('page-learning');
    if (!page) return;
    var anchor = page.querySelector('.section-title');
    if (!anchor) return;

    var bar = document.createElement('div');
    bar.id = 'research-tab-bar';
    bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 18px 0;';
    self.TABS.forEach(function(t) {
      var btn = document.createElement('button');
      btn.dataset.tabKey = t.key;
      btn.textContent = t.label;
      // Thumb-sized targets per the standing mobile-first rule.
      btn.style.cssText = 'padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:rgba(226,226,236,0.5);';
      btn.onclick = function() {
        localStorage.setItem('rpgace_research_tab', t.key);
        self._apply();
      };
      bar.appendChild(btn);
    });
    anchor.parentElement.insertBefore(bar, anchor.nextSibling);
  },

  _apply: function() {
    var bar = document.getElementById('research-tab-bar');
    if (!bar) return;
    var active = this._activeTab();
    var sections = this._resolveSections();
    Array.prototype.forEach.call(bar.children, function(btn) {
      var on = btn.dataset.tabKey === active;
      btn.style.background = on ? 'rgba(155,89,182,0.15)' : 'rgba(255,255,255,0.03)';
      btn.style.borderColor = on ? 'rgba(155,89,182,0.45)' : 'rgba(255,255,255,0.1)';
      btn.style.color = on ? '#B07CC6' : 'rgba(226,226,236,0.5)';
    });
    Object.keys(sections).forEach(function(key) {
      sections[key].style.display = (key === active) ? '' : 'none';
    });
    // Batch the long lists inside the newly-visible tab (show-8 rule).
    if (active === 'intel') RPGACE.ui.batchList(document.getElementById('intel-insights-content'), 8);
    if (active === 'corpus') RPGACE.ui.batchList(document.getElementById('rc-list'), 8);
  },

});
/* ===END:researchTabs=== */

/* ===MODULE:uiBatchList=== */
// Shared show-N-plus-"Show more" helper for long lists (July 19,
// Research redesign confirmed answer). Idempotent: safe to re-apply
// after any re-render; remembers how far the user expanded via a
// property on the container element itself, so a background re-render
// (e.g. Content Intelligence's 30s sync) doesn't collapse the list
// back down while they're reading it.
RPGACE.ui = RPGACE.ui || {};
RPGACE.ui.batchList = function(container, batchSize) {
  if (!container) return;
  var old = container.querySelector('.rpgace-show-more');
  if (old) old.remove();
  var kids = Array.prototype.slice.call(container.children);
  if (kids.length <= batchSize) {
    kids.forEach(function(k) { k.style.display = ''; });
    return;
  }
  var visible = container._rpgaceVisibleCount || batchSize;
  kids.forEach(function(k, i) { k.style.display = i < visible ? '' : 'none'; });
  if (visible < kids.length) {
    var btn = document.createElement('button');
    btn.className = 'rpgace-show-more';
    btn.textContent = '▼ Show more (' + (kids.length - visible) + ' hidden)';
    btn.style.cssText = 'display:block;width:100%;padding:9px;margin-top:4px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.15);border-radius:8px;color:rgba(226,226,236,0.5);font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    btn.onclick = function() {
      container._rpgaceVisibleCount = visible + batchSize;
      RPGACE.ui.batchList(container, batchSize);
    };
    container.appendChild(btn);
  }
};

// Re-batch the intel insights list after every re-render (its 30s sync
// polling rebuilds innerHTML, which would otherwise un-hide everything).
// Chainable wrap, same guard convention as every other wrap in this file.
RPGACE.register('intelListBatcher', {
  init: function() {
    function patch() {
      if (typeof window.loadIntelInsights !== 'function' || window._intelBatchPatched) return;
      window._intelBatchPatched = true;
      var orig = window.loadIntelInsights;
      window.loadIntelInsights = function() {
        var result = orig.apply(this, arguments);
        RPGACE.ui.batchList(document.getElementById('intel-insights-content'), 8);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },
});
/* ===END:uiBatchList=== */

/* ===MODULE:taxonomyReviewQueue=== */
// F6: Dashboard indicator + batch review popup for taxonomy_proposals rows
// queued silently by F4 (ciAutoPropose) and F5 (encSync._autoPropose).
// Reuses taxonomyTree's existing _acceptLineage/_showProposalPopup instead
// of rebuilding the accept/edit UI — same popup the manual + Oracle-badge
// flows already use, just fed from a stored proposal instead of a fresh one.
RPGACE.register('taxonomyReviewQueue', {

  init: function() {
    var self = this;
    setTimeout(function() { self._inject(); }, 1400);
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'dashboard') setTimeout(function() { self._inject(); }, 400);
    });
  },

  _inject: function() {
    var self = this;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    // July 16: badge count now also includes pending taxonomy_links
    // (fusion-link candidates) alongside taxonomy_proposals - same
    // review queue, same badge, different card type per row.
    Promise.all([
      RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&select=id&limit=200'),
      RPGACE.sb.select('taxonomy_links', 'status=eq.pending&select=id&limit=200')
    ]).then(function(results) {
        var total = (results[0] || []).length + (results[1] || []).length;
        var existing = document.getElementById('taxproposal-badge');
        if (total === 0) { if (existing) existing.remove(); return; }
        if (existing) { existing.querySelector('.count').textContent = total; return; }

        var badge = document.createElement('div');
        badge.id = 'taxproposal-badge';
        badge.style.cssText = 'background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.25);border-radius:10px;padding:12px 16px;margin-bottom:16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;';
        badge.innerHTML = '<span style="color:#9B59B6;font-size:12px;font-weight:700;">🌳 <span class="count">' + total + '</span> taxonomy item' + (total > 1 ? 's' : '') + ' waiting</span><span style="color:rgba(155,89,182,0.5);font-size:11px;">Review →</span>';
        badge.onclick = function() { self._openQueue(); };

        var firstChild = page.querySelector('.section-title') || page.firstChild;
        if (firstChild) page.insertBefore(badge, firstChild);
        else page.appendChild(badge);
      }).catch(function() {});
  },

  _openQueue: function() {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'position:relative;background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(640px,95vw);max-height:85vh;overflow-y:auto;';
    box.innerHTML = '<div style="font-size:15px;font-weight:700;color:#E2E2EC;">Loading proposals...</div>';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:sticky;float:right;top:0;background:none;border:none;color:rgba(226,226,236,0.4);font-size:16px;cursor:pointer;';
    closeBtn.onclick = function() { overlay.remove(); self._inject(); };

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    Promise.all([
      RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&order=created_at.asc&limit=200'),
      RPGACE.sb.select('taxonomy_links', 'status=eq.pending&order=created_at.asc&limit=200')
    ]).then(function(results) {
        var rows = results[0] || [];
        var linkRows = results[1] || [];
        box.innerHTML = '';
        box.appendChild(closeBtn);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
        title.textContent = 'Taxonomy Review Queue';
        var sub = document.createElement('div');
        sub.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
        var totalCount = rows.length + linkRows.length;
        sub.textContent = totalCount + ' item' + (totalCount !== 1 ? 's' : '') + ' waiting for review';
        box.appendChild(title); box.appendChild(sub);

        if (totalCount === 0) {
          var empty = document.createElement('div');
          empty.style.cssText = 'color:rgba(226,226,236,0.35);font-size:12px;padding:20px 0;text-align:center;';
          empty.textContent = 'Nothing waiting — all caught up.';
          box.appendChild(empty);
          return;
        }

        var sourceLabels = { content_intelligence: '📹 Content Intelligence', encyclopedia: '📖 Encyclopedia', oracle: '💬 Oracle', manual: '✎ Manual' };

        rows.forEach(function(p) {
          var row = document.createElement('div');
          row.style.cssText = 'padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;';

          var head = document.createElement('div');
          head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;';
          var pathEl = document.createElement('div');
          pathEl.style.cssText = 'font-size:12px;color:#E2E2EC;font-weight:600;line-height:1.5;';
          pathEl.textContent = p.proposed_path;
          var isPhylumPath = !!(p.proposed_steps && p.proposed_steps.engine === 'phylum_path');
          var isConceptFusion = !!(p.proposed_steps && p.proposed_steps.engine === 'concept_fusion');
          var srcEl = document.createElement('div');
          srcEl.style.cssText = 'font-size:9px;color:' + (isConceptFusion ? 'rgba(52,152,219,0.7)' : isPhylumPath ? 'rgba(61,170,110,0.7)' : 'rgba(155,89,182,0.6)') + ';white-space:nowrap;flex-shrink:0;';
          srcEl.textContent = isConceptFusion ? '🌌 Concept Fusion' : (isPhylumPath ? '🧬 Phylum Path · ' : '') + (sourceLabels[p.source_type] || p.source_type);
          head.appendChild(pathEl); head.appendChild(srcEl);
          row.appendChild(head);

          if (p.matched_existing_node_id && !isPhylumPath && !isConceptFusion) {
            var warn = document.createElement('div');
            warn.style.cssText = 'font-size:10px;color:#E25454;margin-bottom:8px;';
            warn.textContent = '⚠️ Possible overlap with an existing node — review before accepting.';
            row.appendChild(warn);
          }

          // Concept Fusion cards show the synthesis text - the whole
          // point of the proposal is "why does this merge deserve to be
          // its own new leaf," not just a path string.
          if (isConceptFusion && p.proposed_steps && p.proposed_steps.synthesis) {
            var synthEl = document.createElement('div');
            synthEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.6);margin-bottom:8px;font-style:italic;';
            synthEl.textContent = p.proposed_steps.synthesis;
            row.appendChild(synthEl);
          }

          // July 19: phylum_path cards now show the scored engine's own
          // reasoning - the justification and 1-10 confidence were being
          // computed on every silent proposal but thrown away before the
          // one human who has to judge the card ever saw them.
          if (isPhylumPath && p.proposed_steps && (p.proposed_steps.justification || p.proposed_steps.confidenceScore)) {
            var justEl = document.createElement('div');
            justEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.55);margin-bottom:8px;font-style:italic;';
            var score = p.proposed_steps.confidenceScore;
            justEl.textContent = (p.proposed_steps.justification || '') + (score ? ' (confidence ' + score + '/10)' : '');
            row.appendChild(justEl);
          }

          var btnRow = document.createElement('div');
          btnRow.style.cssText = 'display:flex;gap:6px;';

          var acceptBtn = document.createElement('button');
          acceptBtn.textContent = isConceptFusion ? '✓ Create Merged Leaf' : '✓ Accept';
          acceptBtn.style.cssText = 'padding:6px 12px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          acceptBtn.onclick = function() {
            row.style.opacity = '0.4'; row.style.pointerEvents = 'none';
            if (isConceptFusion) { self._acceptConceptFusion(p); }
            else if (isPhylumPath) { self._acceptPhylumPathProposal(p); }
            else { RPGACE.modules.taxonomyTree._acceptLineage(self._toProposal(p)); }
            row.remove();
          };

          var rejectBtn = document.createElement('button');
          rejectBtn.textContent = '✗ Reject';
          rejectBtn.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:6px;color:#E25454;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          rejectBtn.onclick = function() {
            RPGACE.sb.update('taxonomy_proposals', 'id=eq.' + p.id, { status: 'rejected', reviewed_at: new Date().toISOString() }).catch(function() {});
            row.remove();
          };

          btnRow.appendChild(acceptBtn);
          // Concept Fusion is just Accept/Reject, same as fusion links
          // below - the proposal is a full node + 2 backlinks, not an
          // editable multi-step path, so there's nothing granular to edit.
          if (!isConceptFusion) {
            var editBtn = document.createElement('button');
            editBtn.textContent = '✎ Edit';
            editBtn.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            editBtn.onclick = function() {
              overlay.remove();
              if (isPhylumPath) { self._editPhylumPathProposal(p); }
              else { RPGACE.modules.taxonomyTree._showProposalPopup(self._toProposal(p)); }
            };
            btnRow.appendChild(editBtn);
          }
          btnRow.appendChild(rejectBtn);
          row.appendChild(btnRow);
          box.appendChild(row);
        });

        // ── Fusion-link candidates (taxonomy_links, status=pending) - a  ──
        // ── separate card type in the same queue. Accept/Reject only, no ──
        // ── Edit: a link is just two node ids + one insight sentence,    ──
        // ── nothing to restructure like a lineage proposal's step list.  ──
        if (!linkRows.length) return;

        var nodeIds = [];
        linkRows.forEach(function(l) { nodeIds.push(l.node_a_id, l.node_b_id); });
        var uniqueIds = nodeIds.filter(function(id, i) { return nodeIds.indexOf(id) === i; });

        return RPGACE.sb.select('taxonomy_tree', 'id=in.(' + uniqueIds.join(',') + ')&select=id,name,path,phylum_number').then(function(nodeRows) {
          var byId = {};
          (nodeRows || []).forEach(function(n) { byId[n.id] = n; });
          var tt = RPGACE.modules.taxonomyTree;

          linkRows.forEach(function(l) {
            var a = byId[l.node_a_id], b = byId[l.node_b_id];
            if (!a || !b) return;
            var row = document.createElement('div');
            row.style.cssText = 'padding:12px 14px;margin-bottom:10px;background:rgba(52,152,219,0.04);border:1px solid rgba(52,152,219,0.2);border-radius:8px;';

            var head = document.createElement('div');
            head.style.cssText = 'font-size:9px;font-weight:700;color:rgba(52,152,219,0.7);margin-bottom:6px;';
            head.textContent = '🔗 Fusion Link';
            row.appendChild(head);

            var phA = tt ? (tt.PHYLUM_NAMES[a.phylum_number] || '') : '';
            var phB = tt ? (tt.PHYLUM_NAMES[b.phylum_number] || '') : '';
            var linkText = document.createElement('div');
            linkText.style.cssText = 'font-size:12px;color:#E2E2EC;font-weight:600;line-height:1.5;margin-bottom:4px;';
            linkText.textContent = '[' + phA + '] ' + a.path + '  ⇄  [' + phB + '] ' + b.path;
            row.appendChild(linkText);

            var insightEl = document.createElement('div');
            insightEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.6);margin-bottom:8px;font-style:italic;';
            insightEl.textContent = l.link_insight || '';
            row.appendChild(insightEl);

            var btnRow2 = document.createElement('div');
            btnRow2.style.cssText = 'display:flex;gap:6px;';

            var acceptBtn2 = document.createElement('button');
            acceptBtn2.textContent = '✓ Confirm Link';
            acceptBtn2.style.cssText = 'padding:6px 12px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
            acceptBtn2.onclick = function() {
              row.style.opacity = '0.4'; row.style.pointerEvents = 'none';
              RPGACE.sb.update('taxonomy_links', 'id=eq.' + l.id, { status: 'confirmed', reviewed_at: new Date().toISOString() }).catch(function() {});
              row.remove();
            };

            var rejectBtn2 = document.createElement('button');
            rejectBtn2.textContent = '✗ Reject';
            rejectBtn2.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:6px;color:#E25454;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            rejectBtn2.onclick = function() {
              RPGACE.sb.update('taxonomy_links', 'id=eq.' + l.id, { status: 'rejected', reviewed_at: new Date().toISOString() }).catch(function() {});
              row.remove();
            };

            btnRow2.appendChild(acceptBtn2); btnRow2.appendChild(rejectBtn2);
            row.appendChild(btnRow2);
            box.appendChild(row);
          });
        });
      }).catch(function() {
        box.innerHTML = '';
        box.appendChild(closeBtn);
        var err = document.createElement('div');
        err.style.cssText = 'color:#E25454;font-size:12px;';
        err.textContent = 'Could not load proposals.';
        box.appendChild(err);
      });
  },

  // ── Phylum Path-engine rows: reconstruct the real attach node (if any)  ──
  // ── by id, then insert directly via phylumPath._insertNewSteps - the    ──
  // ── queued row itself already IS the confirmed decision (this batch     ──
  // ── review is the deferred confirm/deny/modify step for silent          ──
  // ── triggers), so there's no second popup on plain Accept.              ──
  _acceptPhylumPathProposal: function(p) {
    var ps = p.proposed_steps || {};
    var pp = RPGACE.modules.phylumPath;
    var finish = function(attachNode) {
      pp._insertNewSteps(p.phylum_number, attachNode, ps.newSteps || [], ps.explainers || [], ps.insightText || '')
        .then(function() {
          RPGACE.sb.update('taxonomy_proposals', 'id=eq.' + p.id, { status: 'accepted', reviewed_at: new Date().toISOString() }).catch(function() {});
        });
    };
    if (ps.attachToId) {
      RPGACE.sb.select('taxonomy_tree', 'id=eq.' + ps.attachToId + '&limit=1')
        .then(function(rows) { finish(rows && rows[0] ? rows[0] : null); })
        .catch(function() { finish(null); });
    } else {
      finish(null);
    }
  },

  // ── Concept Fusion proposals: create the new merged node under         ──
  // ── whichever branch the ground worker picked as attach point, then    ──
  // ── write 2 confirmed taxonomy_links rows connecting it back to BOTH   ──
  // ── source branches - the merged node is discoverable from either      ──
  // ── side, not owned by just one. Same chained-insert convention as     ──
  // ── phylumPath._insertNewSteps (Prefer:return=representation, since    ──
  // ── RPGACE.sb.insert() defaults to return=minimal).                    ──
  _acceptConceptFusion: function(p) {
    var ps = p.proposed_steps || {};
    if (!ps.attachToId || !ps.otherNodeId || !ps.newName) return;

    RPGACE.sb.select('taxonomy_tree', 'id=eq.' + ps.attachToId + '&limit=1')
      .then(function(rows) {
        var attachNode = rows && rows[0];
        if (!attachNode) return;

        return fetch(RPGACE.sb.url('taxonomy_tree'), {
          method: 'POST',
          headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
          body: JSON.stringify({
            parent_id: attachNode.id,
            depth: attachNode.depth + 1,
            name: ps.newName,
            phylum_number: attachNode.phylum_number,
            path: attachNode.path + '/' + ps.newName,
            node_type: 'leaf',
            explainer: ps.synthesis || '',
            sources: [{ type: 'concept_fusion', id: null }]
          }),
        }).then(function(r) { return r.json(); }).then(function(result) {
          var newNode = Array.isArray(result) ? result[0] : result;
          if (!newNode || !newNode.id) return;
          return RPGACE.sb.insert('taxonomy_links', [
            { node_a_id: newNode.id, node_b_id: attachNode.id, link_insight: ps.synthesis || '', status: 'confirmed' },
            { node_a_id: newNode.id, node_b_id: ps.otherNodeId, link_insight: ps.synthesis || '', status: 'confirmed' }
          ]).catch(function() {});
        });
      })
      .then(function() {
        RPGACE.sb.update('taxonomy_proposals', 'id=eq.' + p.id, { status: 'accepted', reviewed_at: new Date().toISOString() }).catch(function() {});
      })
      .catch(function(e) {
        console.warn('[taxonomyReviewQueue] concept-fusion accept failed:', e.message);
      });
  },

  // ── Edit before accepting: reuses phylumPath's own confirm/edit popup ──
  // ── rather than the old full-path editor, since a Phylum Path proposal ──
  // ── is always "attach here, add these steps," never a whole fresh path. ──
  _editPhylumPathProposal: function(p) {
    var ps = p.proposed_steps || {};
    var pp = RPGACE.modules.phylumPath;
    var openEditor = function(attachNode) {
      pp._showPlacementConfirm(p.phylum_number, attachNode, (ps.newSteps || []).slice(), (ps.explainers || []).slice(), ps.insightText || '',
        function(finalSteps, finalExplainers) {
          pp._insertNewSteps(p.phylum_number, attachNode, finalSteps, finalExplainers, ps.insightText || '').then(function() {
            RPGACE.sb.update('taxonomy_proposals', 'id=eq.' + p.id, { status: 'accepted', reviewed_at: new Date().toISOString() }).catch(function() {});
          });
        }
      );
    };
    if (ps.attachToId) {
      RPGACE.sb.select('taxonomy_tree', 'id=eq.' + ps.attachToId + '&limit=1')
        .then(function(rows) { openEditor(rows && rows[0] ? rows[0] : null); })
        .catch(function() { openEditor(null); });
    } else {
      openEditor(null);
    }
  },

  _toProposal: function(p) {
    var tt = RPGACE.modules.taxonomyTree;
    return {
      phylumNumber: p.phylum_number,
      phylumName: (tt && tt.PHYLUM_NAMES[p.phylum_number]) || 'Unknown',
      path: ((p.proposed_steps && p.proposed_steps.path) || []).slice(),
      explainers: ((p.proposed_steps && p.proposed_steps.explainers) || []).slice(),
      sourceType: p.source_type,
      sourceId: p.source_id,
      morphMatch: null,
      suggestUpdate: false,
      queuedProposalId: p.id,
    };
  },

});
/* ===END:taxonomyReviewQueue=== */

/* ===MODULE:encTaxonomyLink=== */
// F7: per-entry "🌳 Propose to Taxonomy" button on Encyclopedia cards. Per
// the interconnection map's spec this is a second, manual entry point into
// the SAME taxonomy_proposals queue F4/F5 feed silently - not a fresh
// popup, not a direct taxonomy_tree write. main.js re-renders the whole
// #enc-output list on every sort/filter/refresh (window.renderEncEntries),
// so buttons are injected by wrapping that function rather than a one-time
// pass - a MutationObserver would fight the innerHTML replace on every call.
RPGACE.register('encTaxonomyLink', {

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.renderEncEntries !== 'function' || window._encTaxLinkPatched) return;
      window._encTaxLinkPatched = true;
      var orig = window.renderEncEntries;
      window.renderEncEntries = function() {
        var result = orig.apply(this, arguments);
        setTimeout(function() { self._injectButtons(); }, 50);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(patch, 500); });
  },

  _injectButtons: function() {
    var self = this;
    var contentDivs = document.querySelectorAll('#enc-output [data-entry-id]');
    if (contentDivs.length === 0) return;

    // One batch query for which entries already have a pending proposal,
    // instead of one query per card - RPGACE.sb.select already caches for
    // 60s so repeated re-renders (sort/filter clicks) don't refetch.
    RPGACE.sb.select('taxonomy_proposals', 'source_type=eq.encyclopedia&status=eq.pending&select=source_id')
      .then(function(pending) {
        var pendingIds = {};
        (pending || []).forEach(function(p) { if (p.source_id) pendingIds[p.source_id] = true; });
        contentDivs.forEach(function(div) { self._injectOne(div, pendingIds); });
      })
      .catch(function() {
        contentDivs.forEach(function(div) { self._injectOne(div, {}); });
      });
  },

  _injectOne: function(div, pendingIds) {
    var self = this;
    if (div.dataset.taxLinkInjected) return;
    div.dataset.taxLinkInjected = '1';

    var id = div.getAttribute('data-entry-id');
    var entry = (window.ENC_ALL_ENTRIES || []).find(function(e) { return String(e.id || e.created_at) === String(id); });
    if (!entry) return;

    var expandedContainer = div.closest('[id^="enc-expanded-"]');
    if (!expandedContainer) return;
    var collapseBtn = expandedContainer.querySelector('button[onclick^="collapseEncEntry"]');
    var anchor = collapseBtn || null;

    if (entry.taxonomy_node_id) {
      var linked = document.createElement('span');
      linked.style.cssText = 'display:inline-block;margin-top:10px;margin-right:8px;padding:4px 10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:5px;color:#3DAA6E;font-size:11px;font-family:Rajdhani,sans-serif;';
      linked.textContent = '🌳 Linked to Taxonomy Tree';
      if (anchor) anchor.insertAdjacentElement('beforebegin', linked); else expandedContainer.appendChild(linked);
      return;
    }

    if (pendingIds[id]) {
      var pendingLabel = document.createElement('span');
      pendingLabel.style.cssText = 'display:inline-block;margin-top:10px;margin-right:8px;padding:4px 10px;background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.2);border-radius:5px;color:rgba(155,89,182,0.7);font-size:11px;font-family:Rajdhani,sans-serif;';
      pendingLabel.textContent = '⏳ Proposal pending review';
      if (anchor) anchor.insertAdjacentElement('beforebegin', pendingLabel); else expandedContainer.appendChild(pendingLabel);
      return;
    }

    var btn = document.createElement('button');
    btn.textContent = '🌳 Propose to Taxonomy';
    btn.style.cssText = 'background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);color:#9B59B6;border-radius:5px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-top:10px;margin-right:8px;';
    btn.onclick = function() { self._propose(entry, btn); };
    if (anchor) anchor.insertAdjacentElement('beforebegin', btn); else expandedContainer.appendChild(btn);
  },

  _propose: function(entry, btn) {
    if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) {
      RPGACE.utils.toast('Taxonomy system not ready yet — try again in a moment', '#E25454', 2500);
      return;
    }
    var blob = (entry.title || '') + ' ' + (entry.content || '');
    var matches = RPGACE.utils._quickPhylaScan(blob);
    if (matches.length === 0) {
      RPGACE.utils.toast('No clear phylum match for this entry — try "🌳 Add to Taxonomy Tree" on the Research tab instead', '#E25454', 3500);
      return;
    }

    btn.disabled = true;
    btn.textContent = '🌳 Generating proposal...';
    var entryId = entry.id || entry.created_at;

    RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'encyclopedia', entryId)
      .then(function() {
        btn.textContent = '✓ Queued for review';
        btn.style.opacity = '0.6';
        RPGACE.utils.toast('🌳 Queued — review it from the Dashboard', 'rgba(155,89,182,0.85)', 3000);
      })
      .catch(function(err) {
        btn.disabled = false;
        btn.textContent = '🌳 Propose to Taxonomy';
        RPGACE.utils.toast('Error generating proposal: ' + err.message, '#E25454', 3500);
      });
  },

});
/* ===END:encTaxonomyLink=== */

/* ===MODULE:agendaReminder=== */
// F9: third button (Start/Done/Reminder) on scheduled agenda blocks in the
// Daily Grid. Standalone from Schedule Oracle - just redisplays the stored
// title/description/context for that block on demand. renderDailyGrid()
// (main.js) fully rebuilds #time-slots on every date-nav/refresh, so this
// wraps that function the same way encTaxonomyLink wraps renderEncEntries
// rather than doing a one-time DOM pass.
RPGACE.register('agendaReminder', {

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.renderDailyGrid !== 'function' || window._agendaReminderPatched) return;
      window._agendaReminderPatched = true;
      var orig = window.renderDailyGrid;
      window.renderDailyGrid = function() {
        var result = orig.apply(this, arguments);
        setTimeout(function() { self._injectButtons(); }, 50);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(patch, 500); });
  },

  _injectButtons: function() {
    var self = this;
    var startBtns = document.querySelectorAll('#time-slots button[onclick*="startScheduledTask("]');
    startBtns.forEach(function(startBtn) {
      var actions = startBtn.parentElement;
      if (!actions || actions.dataset.reminderInjected) return;
      actions.dataset.reminderInjected = '1';
      var m = startBtn.getAttribute('onclick').match(/startScheduledTask\('([^']+)'\)/);
      var id = m ? m[1] : null;
      if (!id) return;

      var btn = document.createElement('button');
      btn.textContent = '🔔 Reminder';
      btn.style.cssText = 'background:none;border:1px solid rgba(201,168,76,0.3);color:#C9A84C;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;';
      btn.onclick = function(e) {
        e.stopPropagation();
        self._show(id);
      };
      actions.appendChild(btn);
    });
  },

  _show: function(id) {
    var stored = [];
    try { stored = JSON.parse(localStorage.getItem('rpgace_sched_agendas') || '[]'); } catch (e) {}
    var entry = stored.find(function(a) { return a.id === id; });
    if (!entry) { RPGACE.utils.toast("Could not find this task's stored details", '#E25454', 2500); return; }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:22px 26px;width:min(440px,95vw);';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:8px;';
    eyebrow.textContent = '🔔 Reminder';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:10px;';
    title.textContent = entry.title || 'Task';

    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:14px;';
    var timeStr = String(entry.hour || 0).padStart(2, '0') + ':' + String(entry.minute || 0).padStart(2, '0');
    meta.textContent = timeStr + ' · ' + (entry.category || 'personal') + ' · ' + (entry.estimated_mins || 60) + 'min · +' + (entry.xp || 50) + 'XP';

    var desc = document.createElement('div');
    desc.style.cssText = 'font-size:13px;color:rgba(226,226,236,0.75);line-height:1.6;margin-bottom:18px;white-space:pre-wrap;';
    desc.textContent = entry.description || 'No description was saved for this task.';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding:8px 18px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); };

    box.appendChild(eyebrow); box.appendChild(title); box.appendChild(meta); box.appendChild(desc); box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

});
/* ===END:agendaReminder=== */

/* ===MODULE:scheduleOracle=== */
// F11: Schedule Oracle, Phase 1 (MVP). Per the roadmap: 3 Oracle-tab entry
// points, YouTube+PDF+text ingestion, sequential 3-option reveal with
// alert-style acknowledgment between each. Built as an extension of the
// existing taxonomy popup's visual language (dark overlay, bordered box,
// accept/reject-style buttons) - not a literal reuse of
// taxonomyTree._showProposalPopup, since that component is structurally
// specific to editable multi-step lineage paths and doesn't generalise to
// arbitrary sequential options; same look and interaction rhythm instead.
//
// Ingestion deliberately reuses the existing /api/scout + /api/analyst
// agents (already do URL-detection + Jina fetch + type-aware analysis)
// rather than building new ingestion infrastructure - this is genuinely
// Phase 1 scope; F12 (carousel toggle, two-tier session memory,
// auto-routing confidence gate) is NOT built here, it depends on this
// phase and is its own separate pass.
RPGACE.register('scheduleOracle', {

  TRIGGER_PREFIXES: ['schedule oracle:', 'schedule this:', 'learn later:'],

  init: function() {
    var self = this;
    setTimeout(function() { self._injectEntryPoints(); }, 1400);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._injectEntryPoints(); }, 1400); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._injectEntryPoints(); }, 600);
    });
  },

  // Entry point A: direct-launch button. Entry point C: chat-mode trigger
  // phrase, wraps window.sendChat once.
  _injectEntryPoints: function() {
    var self = this;
    if (!document.getElementById('sched-oracle-btn')) {
      var row = document.querySelector('.quick-row');
      if (row) {
        var btn = document.createElement('button');
        btn.id = 'sched-oracle-btn';
        btn.className = 'agent-btn';
        btn.textContent = '📅 Schedule Oracle';
        btn.style.cssText = 'border-color:rgba(74,144,226,0.4);color:#4A90E2;background:rgba(74,144,226,0.08);margin-left:4px;';
        btn.onclick = function() { self._openPanel(); };
        row.appendChild(btn);
      }
    }
    if (typeof window.sendChat === 'function' && !window._scheduleOracleChatPatched) {
      window._scheduleOracleChatPatched = true;
      var origSend = window.sendChat;
      window.sendChat = function() {
        // General concurrency guard - bundled here since this is the one
        // place window.sendChat gets wrapped, not Schedule-Oracle-specific.
        // sendChat()'s send-btn.disabled=true is only a VISUAL guard - it
        // doesn't stop a second call fired programmatically (e.g. a Visual
        // Oracle / Prod Oracle panel button calling sendToOracle() while a
        // prior request is still pending). Two overlapping calls share one
        // global STATE.chatHistory and one fixed #typing-indicator id, so
        // whichever response resolves first steals the other's placeholder -
        // confirmed via testing: a slow request (Director Match, near the
        // Oracle timeout ceiling) got its content silently swapped with a
        // faster one fired while it was still pending. Blocking overlap
        // entirely removes the chance of that happening, no main.js edit
        // needed.
        if (window._oracleRequestInFlight) {
          RPGACE.utils.toast('⏳ Oracle is still answering — wait for it to finish first', '#E25454', 2800);
          return;
        }
        var input = document.getElementById('chat-input');
        var val = input ? input.value.trim() : '';
        var lower = val.toLowerCase();
        var matchedPrefix = self.TRIGGER_PREFIXES.find(function(p) { return lower.indexOf(p) === 0; });
        if (matchedPrefix) {
          var rest = val.slice(matchedPrefix.length).trim();
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          self._openPanel(rest);
          return;
        }
        window._oracleRequestInFlight = true;
        var result = origSend.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          result.finally(function() { window._oracleRequestInFlight = false; });
        } else {
          window._oracleRequestInFlight = false;
        }
        return result;
      };
    }
  },

  // Entry point B: the panel's own URL/text field.
  _openPanel: function(prefill) {
    if (document.getElementById('sched-oracle-panel')) return;
    var self = this;
    var overlay = document.createElement('div');
    overlay.id = 'sched-oracle-panel';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(74,144,226,0.3);border-radius:12px;padding:24px 28px;width:min(520px,95vw);max-height:90vh;overflow-y:auto;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(74,144,226,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Schedule Oracle · Phase 1';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = 'What do you want to learn / schedule?';

    var input = document.createElement('textarea');
    input.id = 'sched-oracle-input';
    input.placeholder = 'Paste a YouTube link, a PDF link, or just type/paste text...';
    input.value = prefill || '';
    input.style.cssText = 'width:100%;min-height:100px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:13px;padding:10px 12px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:14px;';

    var goBtn = document.createElement('button');
    goBtn.textContent = '🔮 Ingest + Analyse';
    goBtn.style.cssText = 'padding:10px 20px;background:rgba(74,144,226,0.12);border:1px solid rgba(74,144,226,0.35);border-radius:8px;color:#4A90E2;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    goBtn.onclick = function() {
      var text = input.value.trim();
      if (!text) { RPGACE.utils.toast('Paste a link or type something first', '#E25454', 2000); return; }
      overlay.remove();
      self._ingest(text);
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:8px;';
    cancelBtn.onclick = function() { overlay.remove(); };

    box.appendChild(eyebrow); box.appendChild(title); box.appendChild(input); box.appendChild(goBtn); box.appendChild(cancelBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();
  },

  // Ingestion: /api/scout handles URL-or-text detection + Jina fetch (works
  // for YouTube page text and PDF URLs, not a full video transcript pipeline
  // - that's Content Intelligence's job, not this one) + type identification.
  // /api/analyst produces a type-aware structured analysis from it.
  _ingest: function(text) {
    var self = this;
    RPGACE.utils.toast('🔮 Ingesting content...', '#4A90E2', 2500);
    fetch('/api/scout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, type: 'auto' })
    })
    .then(function(r) { return r.json(); })
    .then(function(scout) {
      if (scout.error) throw new Error(scout.error);
      RPGACE.utils.toast('🔮 Analysing (' + scout.detectedType + ')...', '#4A90E2', 2500);
      return fetch('/api/analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: scout.content, detectedType: scout.detectedType, title: scout.title })
      }).then(function(r) { return r.json(); }).then(function(analyst) {
        if (analyst.error) throw new Error(analyst.error);
        self._showOptionSequence({ title: scout.title, analysis: analyst.analysis, sourceURL: scout.sourceURL });
      });
    })
    .catch(function(e) {
      RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500);
    });
  },

  // Sequential 3-option reveal - one option shown at a time, each requires
  // an explicit action or an explicit skip before the next one appears.
  _showOptionSequence: function(data) {
    var self = this;
    var steps = [
      {
        icon: '📖', title: 'Save to Encyclopedia',
        body: 'Save this as a permanent knowledge base entry, searchable later.',
        actionLabel: '📖 Save now',
        action: function(done) {
          if (typeof saveOracleToEncyclopedia !== 'function') { done(); return; }
          saveOracleToEncyclopedia(data.title, '## ' + data.title + '\n\n' + data.analysis + (data.sourceURL ? '\n\n**Source:** ' + data.sourceURL : ''))
            .then(function() { RPGACE.utils.toast('✅ Saved to Encyclopedia', '#3DAA6E', 2500); done(); })
            .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3000); done(); });
        }
      },
      {
        icon: '📅', title: 'Schedule a learning session',
        body: 'Block real time to study this via the Schedule modal.',
        actionLabel: '📅 Schedule',
        action: function(done) {
          if (typeof openSchedModal === 'function') {
            openSchedModal({ title: 'Study: ' + data.title, description: data.analysis.slice(0, 300), category: 'learning', xp: 60, duration_mins: 45 });
          }
          done();
        }
      },
      {
        icon: '🌳', title: 'Queue for Taxonomy Tree',
        body: 'Silently generate a taxonomy lineage proposal from this content, reviewable later from the Dashboard queue (same F4/F5/F6 pipeline).',
        actionLabel: '🌳 Queue proposal',
        action: function(done) {
          if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) { done(); return; }
          var blob = data.title + ' ' + data.analysis;
          var matches = RPGACE.utils._quickPhylaScan(blob);
          if (matches.length === 0) { RPGACE.utils.toast('No clear phylum match for this content', '#E25454', 2500); done(); return; }
          RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'schedule_oracle', null)
            .then(function() { RPGACE.utils.toast('🌳 Queued — review from Dashboard', 'rgba(155,89,182,0.85)', 3000); done(); })
            .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3000); done(); });
        }
      }
    ];

    var idx = 0;
    function renderStep() {
      var s = steps[idx];
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(74,144,226,0.3);border-radius:12px;padding:24px 28px;width:min(480px,95vw);';

      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(74,144,226,0.6);text-transform:uppercase;margin-bottom:6px;';
      eyebrow.textContent = 'Option ' + (idx + 1) + ' of ' + steps.length;
      var stepTitle = document.createElement('div');
      stepTitle.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:8px;';
      stepTitle.textContent = s.icon + ' ' + s.title;
      var body = document.createElement('div');
      body.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.55);line-height:1.6;margin-bottom:18px;';
      body.textContent = s.body;

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      var advance = function() {
        overlay.remove();
        idx++;
        if (idx < steps.length) renderStep();
        else RPGACE.utils.toast('✅ Schedule Oracle pass complete', '#4A90E2', 2500);
      };

      var actionBtn = document.createElement('button');
      actionBtn.textContent = s.actionLabel;
      actionBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      actionBtn.onclick = function() {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Working...';
        s.action(advance);
      };

      var skipBtn = document.createElement('button');
      skipBtn.textContent = idx < steps.length - 1 ? 'Skip →' : 'Done';
      skipBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.4);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      skipBtn.onclick = advance;

      btnRow.appendChild(actionBtn); btnRow.appendChild(skipBtn);
      box.appendChild(eyebrow); box.appendChild(stepTitle); box.appendChild(body); box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }
    renderStep();
  },

});
/* ===END:scheduleOracle=== */

/* ===MODULE:intelDelete=== */
RPGACE.register('intelDelete', {

  SB_URL: 'https://gripopghczmrbrhqtqbm.supabase.co',
  SB_KEY: 'sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf',
  BIB:    'rpgace_intel_bibliography',

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning' || name === 'research') {
        setTimeout(function() { self._injectAll(); }, 400);
      }
      if (name === 'encyclopedia') {
        setTimeout(function() { self._injectBibSection(); }, 500);
      }
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      [500, 1200, 3000].forEach(function(d) {
        setTimeout(function() { self._injectAll(); }, d);
      });
      setTimeout(function() { self._injectBibSection(); }, 1500);
      var _obsTimer = null;
      var obs = new MutationObserver(function(muts) {
        // Only fire for actual new card nodes, not our own injections
        var relevant = muts.some(function(m) {
          return Array.from(m.addedNodes).some(function(n) {
            return n.nodeType === 1 && !n.dataset.di4 && !n.dataset.dw4 && !n.id;
          });
        });
        if (!relevant) return;
        if (_obsTimer) clearTimeout(_obsTimer);
        _obsTimer = setTimeout(function() { self._injectAll(); }, 300);
      });
      // Only watch the research page container, not entire body
      var researchPage = document.getElementById('page-research') ||
                         document.getElementById('page-learning') ||
                         document.body;
      obs.observe(researchPage, { childList: true, subtree: true });

    });
  },

  /* ── Supabase helpers ─────────────────────────── */
  _sbDel: function(table, filter) {
    return fetch(this.SB_URL + '/rest/v1/' + table + '?' + filter, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + this.SB_KEY,
        'apikey': this.SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      }
    });
  },

  _sbInsert: function(table, row) {
    return fetch(this.SB_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.SB_KEY,
        'apikey': this.SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  },

  /* ── Inject buttons on both card types ─────────── */
  _injectAll: function() {
    this._injectInsights();
    this._injectWatchlist();
  },

  _pausePolling: function() {
    window._intelViewExpanded = true;
    if (typeof window.startIntelPolling === 'function' && !window._origIntelPoll) {
      window._origIntelPoll = window.startIntelPolling;
      window.startIntelPolling = function() {
        if (window._intelViewExpanded) return;
        return window._origIntelPoll.apply(this, arguments);
      };
    }
  },

  _resumePolling: function() {
    window._intelViewExpanded = false;
  },

  _fmtDate: function(raw) {
    if (!raw) return '';
    // Handle ISO timestamps
    if (raw.includes('T') || raw.includes('+')) {
      try {
        var d = new Date(raw);
        return d.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'});
      } catch(e) { return raw; }
    }
    return raw;
  },

  _deleteUnified: function(entry, title, rowEl, cardEl) {
    var self = this;
    self._confirm(title, entry ? entry.url : '', rowEl || cardEl, function(saveBib) {
      // 1. Delete from Supabase intel_reports
      if (entry && entry.id) {
        self._sbDel('intel_reports', 'id=eq.' + entry.id)
          .then(function() {
            console.log('[intelDelete] Supabase intel_reports deleted:', entry.id);
          }).catch(function(e) { console.warn('[intelDelete]', e); });
      }
      // 2. Delete from localStorage intel_insights
      self._rmLocal('rpgace_intel_insights', title);
      // 3. Save to bibliography if requested
      if (saveBib && entry && entry.url) {
        var row = { title: title, url: entry.url };
        self._sbInsert('intel_bibliography', row).catch(function(){});
      }
      // 4. Remove from collapsed list
      var collRow = document.querySelector('[data-intel-title="' + CSS.escape(title) + '"]');
      if (collRow) collRow.remove();
      // 5. Remove from expanded list
      var expCard = document.querySelector('[data-intel-card="' + CSS.escape(title) + '"]');
      if (expCard) expCard.remove();
      // 6. Remove encyclopedia entry with same title
      self._sbDel('encyclopedia', 'title=eq.' + encodeURIComponent(title))
        .then(function() { console.log('[intelDelete] Encyclopedia entry removed:', title); })
        .catch(function(){});
      // 7. Remove taxonomy node with same concept
      self._sbDel('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(title))
        .then(function() { console.log('[intelDelete] Taxonomy node removed:', title); })
        .catch(function(){});
      // Update collapsed list count in toggle
      setTimeout(function() {
        var tog = document.getElementById('kg-master-toggle');
        if (tog) {
          var remaining = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length;
          var lbl = tog.querySelector('span');
          if (lbl && !window._intelViewExpanded) {
            lbl.textContent = 'Insights · ' + remaining + ' videos · Click to expand';
          }
        }
      }, 200);
    });
  },

  _showEncPopup: function(entry) {
    var existing = document.getElementById('enc-preview-popup');
    if (existing) { existing.remove(); return; }
    var popup = document.createElement('div');
    popup.id = 'enc-preview-popup';
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(560px,90vw);max-height:80vh;background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;z-index:99999;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.7);';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;';
    var htxt = document.createElement('div');
    var ht = document.createElement('div');
    ht.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);margin-bottom:4px;text-transform:uppercase;';
    ht.textContent = 'Encyclopedia Preview';
    var hs = document.createElement('div');
    hs.style.cssText = 'font-size:13px;font-weight:700;color:#E2E2EC;line-height:1.3;max-width:440px;';
    hs.textContent = (entry.title || '').replace('☁️','').trim();
    htxt.appendChild(ht); htxt.appendChild(hs);
    var cb = document.createElement('button');
    cb.textContent = '×';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;';
    cb.onclick = function() { popup.remove(); };
    hdr.appendChild(htxt); hdr.appendChild(cb);
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
    // Load from Supabase encyclopedia
    body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">Loading...</div>';
    RPGACE.sb.select('encyclopedia', 'title=eq.' + encodeURIComponent(entry.title || '') + '&limit=1')
      .then(function(rows) {
        if (!rows || rows.length === 0) {
          body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">No encyclopedia entry found for this video.</div>';
          return;
        }
        var enc = rows[0];
        var content = enc.content || '';
        body.innerHTML = '';
        var pre = document.createElement('div');
        pre.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.75);line-height:1.8;white-space:pre-wrap;';
        pre.textContent = content.slice(0, 1500) + (content.length > 1500 ? '...' : '');
        body.appendChild(pre);
      }).catch(function() {
        body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">Could not load encyclopedia entry.</div>';
      });
    var ftr = document.createElement('div');
    ftr.style.cssText = 'padding:12px 20px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;flex-shrink:0;';
    var goBtn = document.createElement('button');
    goBtn.textContent = '📖 Go to Encyclopedia';
    goBtn.style.cssText = 'flex:1;padding:8px 16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:var(--gold,#C9A84C);cursor:pointer;font-size:12px;font-weight:700;font-family:Rajdhani,sans-serif;';
    goBtn.onclick = function() {
      popup.remove();
      if (typeof showPage === 'function') showPage('encyclopedia');
    };
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);cursor:pointer;font-size:12px;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { popup.remove(); };
    ftr.appendChild(goBtn); ftr.appendChild(closeBtn);
    popup.appendChild(hdr); popup.appendChild(body); popup.appendChild(ftr);
    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99998;';
    backdrop.onclick = function() { popup.remove(); backdrop.remove(); };
    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
  },

  _buildCollapsedList: function(container) {
    var existing = document.getElementById('intel-collapsed-list');
    if (existing) existing.remove();
    var entries = [];
    try {
      entries = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
    } catch(e) { entries = []; }
    if (entries.length === 0) return;
    var self = this;
    var list = document.createElement('div');
    list.id = 'intel-collapsed-list';
    list.style.cssText = 'margin-bottom:8px;';

    entries.forEach(function(entry) {
      var title = (entry.title || 'Untitled').replace('☁️','').trim();
      var s = parseInt(entry.score) || 0;
      var scoreColor = s >= 8 ? 'var(--green)' : s >= 6 ? 'var(--gold,#C9A84C)' : 'var(--muted)';

      // Main row
      var row = document.createElement('div');
      row.dataset.intelTitle = title;
      row.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:4px;overflow:hidden;';

      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;padding:8px 12px;gap:8px;cursor:pointer;';

      // Expand indicator
      var expInd = document.createElement('span');
      expInd.textContent = '▸';
      expInd.style.cssText = 'font-size:9px;color:var(--muted);flex-shrink:0;transition:transform .15s;';

      var left = document.createElement('div');
      left.style.cssText = 'flex:1;min-width:0;';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      titleEl.textContent = title;
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:1px;';
      meta.textContent = (entry.creator || '') + (entry.date ? ' · ' + self._fmtDate(entry.date) : '');
      left.appendChild(titleEl); left.appendChild(meta);

      var right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

      var bar = document.createElement('div');
      bar.style.cssText = 'font-size:9px;color:var(--muted);';
      bar.textContent = '█'.repeat(s) + '░'.repeat(10 - s);

      var scoreEl = document.createElement('div');
      scoreEl.style.cssText = 'font-size:12px;font-weight:700;color:' + scoreColor + ';min-width:28px;text-align:right;';
      scoreEl.textContent = s + '/10';

      // Encyclopedia button
      var encBtn = document.createElement('button');
      encBtn.textContent = '📖';
      encBtn.title = 'Encyclopedia preview';
      encBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:rgba(226,226,236,0.5);cursor:pointer;font-size:11px;padding:2px 6px;';
      encBtn.onclick = function(e) { e.stopPropagation(); self._showEncPopup(entry); };

      // DEL button — unified delete
      var delBtn = self._mkBtn(function() {
        self._deleteUnified(entry, title, row, null);
      });

      right.appendChild(bar);
      right.appendChild(scoreEl);
      right.appendChild(encBtn);
      right.appendChild(delBtn);

      header.appendChild(expInd);
      header.appendChild(left);
      header.appendChild(right);

      // Inline expanded body
      var body = document.createElement('div');
      body.style.cssText = 'overflow:hidden;max-height:0;transition:max-height .25s ease;border-top:0 solid rgba(255,255,255,0.05);';
      var bodyInner = document.createElement('div');
      bodyInner.style.cssText = 'padding:10px 14px;font-size:12px;color:rgba(226,226,236,0.65);line-height:1.7;';

      // Verdict summary from insights object
      var ins = entry.insights || {};
      if (ins.verdict_summary) {
        var summary = document.createElement('div');
        summary.style.cssText = 'font-style:italic;color:rgba(226,226,236,0.5);margin-bottom:10px;border-left:2px solid rgba(201,168,76,0.3);padding-left:8px;font-size:11px;';
        summary.textContent = '"' + ins.verdict_summary + '"';
        bodyInner.appendChild(summary);
      }

      // What to steal / content insights bullets
      var steals = ins.what_to_steal || ins.content_strategy_insights || ins.production_techniques || [];
      if (typeof steals === 'string') steals = steals.split('\u2022').filter(function(b){return b.trim();});
      if (!Array.isArray(steals)) steals = [];
      steals.slice(0, 3).forEach(function(b) {
        var txt = typeof b === 'object' ? (b.insight || b.technique || b.tip || b.steal || JSON.stringify(b)) : b;
        var li = document.createElement('div');
        li.style.cssText = 'margin-bottom:6px;padding-left:14px;position:relative;font-size:11px;color:rgba(226,226,236,0.65);';
        li.innerHTML = '<span style="position:absolute;left:0;color:var(--gold,#C9A84C);">\u2022</span>' + txt.toString().trim();
        bodyInner.appendChild(li);
      });

      // Original link
      if (entry.url) {
        var link = document.createElement('a');
        link.href = entry.url;
        link.target = '_blank';
        link.textContent = '🔗 Original';
        link.style.cssText = 'display:inline-block;margin-top:8px;font-size:11px;color:var(--blue,#4A90E2);text-decoration:none;';
        bodyInner.appendChild(link);
      }

      body.appendChild(bodyInner);

      // Toggle expand on header click
      var isOpen = false;
      header.onclick = function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        isOpen = !isOpen;
        if (isOpen) {
          body.style.maxHeight = '400px';
          body.style.borderTopWidth = '1px';
          expInd.style.transform = 'rotate(90deg)';
        } else {
          body.style.maxHeight = '0';
          body.style.borderTopWidth = '0';
          expInd.style.transform = 'rotate(0deg)';
        }
      };

      row.appendChild(header);
      row.appendChild(body);
      list.appendChild(row);
    });

    container.insertBefore(list, container.firstChild);
  },

  _injectMasterToggle: function(container) {
    if (!container || document.getElementById('kg-master-toggle')) return;
    var self = this;
    // Build collapsed list immediately
    self._buildCollapsedList(container);
    // Hide main.js expanded container
    var mainContainer = container;
    var cards = mainContainer.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    cards.forEach(function(c) { c.style.display = 'none'; });
    var bar = document.createElement('div');
    bar.id = 'kg-master-toggle';
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;cursor:pointer;user-select:none;';
    var label = document.createElement('span');
    label.style.cssText = 'font-size:11px;font-weight:700;color:rgba(226,226,236,0.45);letter-spacing:2px;text-transform:uppercase;';
    label.textContent = 'Insights · ' + (JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length) + ' videos · Click to expand';
    var chevron = document.createElement('span');
    chevron.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.25);';
    chevron.textContent = '▸';
    bar.appendChild(label);
    bar.appendChild(chevron);
    var expanded = false;
    bar.onclick = function() {
      expanded = !expanded;
      var collList = document.getElementById('intel-collapsed-list');
      var intelContainer = document.getElementById('intel-insights-content');
      if (expanded) {
        window._intelViewExpanded = true;
        if (collList) collList.style.display = 'none';
        if (intelContainer) intelContainer.style.display = '';
        chevron.textContent = '▾';
        label.textContent = 'Insights · Click to collapse';
      } else {
        window._intelViewExpanded = false;
        if (collList) collList.style.display = '';
        if (intelContainer) intelContainer.style.display = 'none';
        chevron.textContent = '▸';
        var count = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length;
        label.textContent = 'Insights · ' + count + ' videos · Click to expand';
      }
    };
    mainContainer.insertBefore(bar, mainContainer.firstChild);
  },

  _injectInsights: function() {
    var self = this;
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    if (cards.length > 0) {
      self._injectMasterToggle(cards[0].parentElement);
    }
    cards.forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('☁️','').trim() : '';
      // Tag card for cross-delete
      card.dataset.intelCard = title;
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      // Use unified delete
      var btn = self._mkBtn(function() {
        self._deleteUnified(entry, title, null, card);
      });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });
  },

  _injectWatchlist: function() {
    var self = this;
    document.querySelectorAll('[style*="rgba(139,92,246"]').forEach(function(card) {
      if (card.dataset.dw4) return;
      card.dataset.dw4 = '1';
      var content = card.children[1];
      var te = content ? content.querySelector('div') : null;
      var title = te ? te.textContent.trim() : '';
      if (!title) return;
      var entry = self._findEntry('rpgace_intel_watchlist', title);
      var url = entry ? (entry.url||'') : '';
      var btn = self._mkBtn(function() {
        self._confirm(title, url, card, function(saveBib) {
          self._deleteWatchlist(url, title, card, saveBib);
        });
      });
      btn.style.marginLeft = 'auto';
      btn.style.flexShrink = '0';
      card.appendChild(btn);
    });
  },

  _mkBtn: function(cb) {
    var btn = document.createElement('button');
    btn.textContent = 'DEL';
    btn.style.cssText = 'background:rgba(226,84,84,0.12);border:1px solid rgba(226,84,84,0.35);color:rgba(226,84,84,0.85);border-radius:4px;padding:3px 8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;display:block;';
    btn.onclick = function(e) { e.stopPropagation(); cb(); };
    return btn;
  },

  _findEntry: function(key, title) {
    try {
      var d = JSON.parse(localStorage.getItem(key)||'[]');
      return d.find(function(x){ return (x.title||'').trim() === title; }) || null;
    } catch(e) { return null; }
  },

  /* ── Delete from Supabase ───────────────────────── */
  _deleteInsight: function(entry, title, card, saveBib) {
    var self = this;
    /* Remove from Supabase intel_reports by id */
    if (entry && entry.id) {
      self._sbDel('intel_reports', 'id=eq.' + entry.id)
        .then(function(r) {
          if (r.ok) {
            console.log('[intelDelete] Deleted from intel_reports:', entry.id);
          } else {
            console.warn('[intelDelete] Supabase delete failed:', r.status);
          }
        }).catch(function(e) { console.warn('[intelDelete]', e); });
    }
    /* Remove from local storage */
    self._rmLocal('rpgace_intel_insights', title);
    /* Hide card */
    self._hideCard(card);
    /* Save to bibliography if requested */
    if (saveBib && entry) self._saveBib(title, entry.url||'');
    RPGACE.utils.toast(saveBib ? 'Deleted + saved to bibliography' : 'Deleted', saveBib ? 'rgba(61,170,110,0.9)' : 'rgba(226,84,84,0.9)', 2000);
  },

  _deleteWatchlist: function(url, title, card, saveBib) {
    var self = this;
    /* Remove from Supabase intel_watchlist by url */
    if (url) {
      self._sbDel('intel_watchlist', 'url=eq.' + encodeURIComponent(url))
        .then(function(r) {
          if (r.ok) {
            console.log('[intelDelete] Deleted from intel_watchlist:', url);
          } else {
            console.warn('[intelDelete] Watchlist delete failed:', r.status);
          }
        }).catch(function(e) { console.warn('[intelDelete]', e); });
    }
    self._rmLocal('rpgace_intel_watchlist', title);
    self._hideCard(card);
    if (saveBib) self._saveBib(title, url);
    RPGACE.utils.toast(saveBib ? 'Deleted + saved to bibliography' : 'Deleted', saveBib ? 'rgba(61,170,110,0.9)' : 'rgba(226,84,84,0.9)', 2000);
  },

  _rmLocal: function(key, title) {
    try {
      var d = JSON.parse(localStorage.getItem(key)||'[]');
      localStorage.setItem(key, JSON.stringify(
        d.filter(function(x){ return (x.title||'').trim() !== title; })
      ));
    } catch(e) {}
  },

  _hideCard: function(card) {
    card.style.transition = 'opacity .18s';
    card.style.opacity = '0';
    setTimeout(function(){ card.style.display = 'none'; }, 200);
  },

  /* ── Bibliography ───────────────────────────────── */
  _saveBib: function(title, url) {
    var self = this;
    try {
      var bib = JSON.parse(localStorage.getItem(self.BIB)||'[]');
      if (!bib.some(function(b){ return b.url===url; })) {
        var row = { title: title, url: url, saved: new Date().toISOString() };
        bib.push(row);
        localStorage.setItem(self.BIB, JSON.stringify(bib));
        /* Also try to insert into Supabase intel_bibliography table */
        self._sbInsert('intel_bibliography', row)
          .catch(function() {}); /* silent fail if table doesn't exist */
      }
    } catch(e) {}
  },

  /* ── Confirmation popup ─────────────────────────── */
  _confirm: function(title, url, card, onDecide) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.3);border-radius:10px;padding:24px 28px;width:min(360px,90vw);';
    function el(tag, css, txt) { var e=document.createElement(tag); e.style.cssText=css||''; if(txt!==undefined)e.textContent=txt; return e; }
    box.appendChild(el('div','font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:6px;','Delete Report'));
    box.appendChild(el('div','font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:16px;line-height:1.4;', title.length>65?title.substring(0,65)+'...':title));
    box.appendChild(el('div','font-size:13px;font-weight:600;color:rgba(226,226,236,0.85);margin-bottom:8px;','Save URL to bibliography?'));
    box.appendChild(el('div','font-size:10px;color:rgba(201,168,76,0.55);margin-bottom:18px;font-family:monospace;word-break:break-all;', url?(url.length>60?url.substring(0,60)+'...':url):'No URL'));
    var row = el('div','display:flex;gap:8px;flex-wrap:wrap;');
    function mkb(label, bg, bd, col, saveBib) {
      var b = el('button','flex:1;min-width:80px;background:'+bg+';border:1px solid '+bd+';color:'+col+';border-radius:6px;padding:9px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;', label);
      b.onclick = function(){ ov.remove(); onDecide(saveBib); };
      return b;
    }
    row.appendChild(mkb('Yes, save it','rgba(61,170,110,0.12)','rgba(61,170,110,0.35)','rgba(61,170,110,0.9)', true));
    row.appendChild(mkb('No, just delete','rgba(226,84,84,0.1)','rgba(226,84,84,0.3)','rgba(226,84,84,0.8)', false));
    var cancel = el('button','background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:6px;padding:9px 14px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;','Cancel');
    cancel.onclick = function(){ ov.remove(); };
    row.appendChild(cancel);
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
  },

  /* ── Bibliography section in Encyclopedia tab ── */
  _injectBibSection: function() {
    if (document.getElementById('rpgace-bib-section')) return;
    var enc = document.getElementById('page-encyclopedia');
    if (!enc) return;
    var bib = JSON.parse(localStorage.getItem(this.BIB)||'[]');
    var s = document.createElement('div');
    s.id = 'rpgace-bib-section';
    s.style.cssText = 'margin-top:32px;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;padding-bottom:32px;';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    var htxt = el('div','font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;','BIBLIOGRAPHY · ' + bib.length + ' SOURCES');
    var clr = el('button','background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;','Clear');
    clr.onclick = function() { localStorage.removeItem('rpgace_intel_bibliography'); s.remove(); };
    hdr.appendChild(htxt); hdr.appendChild(clr); s.appendChild(hdr);
    function el(tag,css,txt){var e=document.createElement(tag);e.style.cssText=css||'';if(txt!==undefined)e.textContent=txt;return e;}
    if (!bib.length) {
      s.appendChild(el('div','font-size:12px;color:rgba(226,226,236,0.3);font-style:italic;','No entries yet. Delete cards and choose "Yes, save it" to build this list.'));
    } else {
      bib.forEach(function(b) {
        var row = el('div','display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);align-items:flex-start;');
        var dot = el('span','color:rgba(201,168,76,0.5);flex-shrink:0;','•');
        var info = el('div','');
        var t = el('div','font-size:12px;font-weight:600;color:rgba(226,226,236,0.75);margin-bottom:2px;font-family:Rajdhani,sans-serif;', b.title||'Untitled');
        var lnk = document.createElement('a');
        lnk.href=b.url||'#'; lnk.target='_blank';
        lnk.textContent=b.url?(b.url.length>65?b.url.substring(0,65)+'...':b.url):'No URL';
        lnk.style.cssText='font-size:10px;color:rgba(201,168,76,0.55);text-decoration:none;font-family:monospace;';
        info.appendChild(t); info.appendChild(lnk);
        row.appendChild(dot); row.appendChild(info); s.appendChild(row);
      });
    }
    enc.appendChild(s);
  },

});
/* ===END:intelDelete=== */

/* ===MODULE:dashDeck=== */
// July 20 — Dashboard pass 1 of the DESIGN.md restructure (spec approved
// by Alex; structure from aingertomlin.co.nz, skin 100% existing RPGACE
// tokens - zero new colors/fonts, L1 interactions only). The one-scroll
// contract: character HUD (existing, untouched) answers "who am I";
// this module injects the 2x2 MODULE GRID ("what are my tools" - four
// cards, each eyebrow → name → one line → one live stat → one gold
// Enter link) directly under it, then ONE narrative-left/checklist-
// right split-section ("what needs me now") fed by live data. Existing
// widgets below are untouched in pass 1 - widget-by-widget
// consolidation is pass 2, after hand-test.
RPGACE.register('dashDeck', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) setTimeout(function() { self._inject(); }, 200);
    });
    [1400, 3000].forEach(function(ms) { setTimeout(function() { self._inject(); }, ms); });
  },

  _injectStyles: function() {
    if (document.getElementById('dd-styles')) return;
    var st = document.createElement('style');
    st.id = 'dd-styles';
    st.textContent =
      ':root{--dd-gold-rgb:201,168,76;--dd-purple-rgb:155,110,200;--dd-green-rgb:76,175,130;--dd-blue-rgb:74,140,204}' +
      '@keyframes ddRiseIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '#dd-deck{max-width:1080px;margin:0 auto 20px auto}' +
      '#dd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}' +
      '.dd-card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s,transform .15s;animation:ddRiseIn .35s ease both;cursor:pointer}' +
      '.dd-card:nth-child(2){animation-delay:.05s}.dd-card:nth-child(3){animation-delay:.1s}.dd-card:nth-child(4){animation-delay:.15s}' +
      '.dd-card:hover{border-color:var(--border2);transform:translateY(-2px)}.dd-card:active{transform:translateY(0)}' +
      '.dd-eyebrow{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase}' +
      '.dd-card h3{font-size:14px;font-weight:700;color:var(--text);letter-spacing:1px;font-family:Rajdhani,sans-serif}' +
      '.dd-card p{font-size:12px;color:var(--muted);line-height:1.6}' +
      '.dd-glance{font-size:11px;color:var(--muted)}' +
      '.dd-go{margin-top:auto;font-size:12px;font-weight:700;color:var(--gold);min-height:38px;display:inline-flex;align-items:center;gap:6px}' +
      '.dd-card:hover .dd-go{color:var(--gold2)}' +
      '#dd-needs{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;padding:20px 0;border-top:1px solid var(--border);animation:ddRiseIn .35s ease both;animation-delay:.2s}' +
      '#dd-needs .dd-story h2{font-size:15px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text);margin-bottom:8px;font-family:Rajdhani,sans-serif}' +
      '#dd-needs .dd-story p{font-size:13px;color:var(--muted);line-height:1.65;max-width:56ch}' +
      '.dd-glancebox{background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:14px 16px}' +
      '.dd-glancebox .dd-gtitle{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}' +
      '.dd-glancebox ul{margin:0;padding:0}' +
      '.dd-glancebox li{list-style:none;font-size:12px;font-weight:600;line-height:1.7;color:var(--text);cursor:pointer;min-height:30px;display:flex;align-items:center}' +
      '.dd-glancebox li::before{content:"\\2726";color:var(--gold);margin-right:8px}' +
      '.dd-glancebox li:hover{color:var(--gold2)}' +
      '@media (max-width:600px){#dd-grid{grid-template-columns:1fr}#dd-needs{grid-template-columns:1fr}#dd-needs .dd-glancebox{order:-1}.dd-go{min-height:44px}}' +
      '@media (prefers-reduced-motion:reduce){.dd-card,#dd-needs{animation:none !important}}';
    document.head.appendChild(st);
  },

  MODULES: [
    { key: 'research', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '🧠', name: 'Research Lab', desc: 'Analyse videos, mine books, bank ideas — every source becomes placed knowledge.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.research); } },
    { key: 'bookworm', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '📖', name: 'Bookworm', desc: 'Whole books, chapter by chapter, into the taxonomy — with review checkpoints.', go: function() { var w = document.getElementById('bookworm-widget'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
    { key: 'taxonomy', accent: '--dd-green-rgb', color: 'var(--green)', emoji: '🌳', name: 'Taxonomy & Review', desc: 'Your knowledge tree: browse phyla, approve placements, confirm fusions.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.phylumPath); } },
    { key: 'oracle', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '⚡', name: 'Oracle', desc: 'Chat grounded in your own gathered library — gaps become learning prompts.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.oracle); } },
  ],

  _inject: function() {
    if (document.getElementById('dd-deck')) { this._refreshGlance(); return; }
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    this._injectStyles();
    var self = this;

    var deck = document.createElement('div');
    deck.id = 'dd-deck';
    var grid = document.createElement('div');
    grid.id = 'dd-grid';
    this.MODULES.forEach(function(m) {
      var card = document.createElement('div');
      card.className = 'dd-card';
      card.id = 'dd-card-' + m.key;
      var eb = document.createElement('div');
      eb.className = 'dd-eyebrow';
      eb.style.color = m.color;
      eb.textContent = m.emoji + ' Module';
      var h = document.createElement('h3');
      h.textContent = m.name;
      var p = document.createElement('p');
      p.textContent = m.desc;
      var gl = document.createElement('div');
      gl.className = 'dd-glance';
      gl.id = 'dd-glance-' + m.key;
      gl.textContent = '…';
      var go = document.createElement('div');
      go.className = 'dd-go';
      go.textContent = 'Enter →';
      card.appendChild(eb); card.appendChild(h); card.appendChild(p); card.appendChild(gl); card.appendChild(go);
      card.onclick = m.go;
      grid.appendChild(card);
    });
    deck.appendChild(grid);

    var needs = document.createElement('div');
    needs.id = 'dd-needs';
    needs.innerHTML = '<div class="dd-story"><h2>⚑ Needs you now</h2><p id="dd-needs-story">Checking live state…</p></div>' +
      '<div class="dd-glancebox"><div class="dd-gtitle">At a glance</div><ul id="dd-needs-list"></ul></div>';
    deck.appendChild(needs);

    // The character HUD (.char-header) is GLOBAL - it sits above the page
    // divs in index.html (verified line 42), so it is already the hero on
    // every page. The deck therefore goes in as page-dashboard's FIRST
    // child: hero (global) → module grid → needs-you → existing widgets.
    page.insertBefore(deck, page.firstChild);

    this._refreshGlance();
  },

  // Live stats - cheap reads only (localStorage + two cached Supabase
  // selects that other dashboard widgets already make, so RPGACE.cache
  // usually serves them without extra network).
  _refreshGlance: function() {
    var set = function(key, text) {
      var el = document.getElementById('dd-glance-' + key);
      if (el) el.textContent = text;
    };
    try {
      var reports = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
      var wl = JSON.parse(localStorage.getItem('rpgace_intel_watchlist') || '[]');
      set('research', reports.length + ' analysed · ' + wl.length + ' watchlist');
    } catch (e) { set('research', '—'); }
    set('oracle', 'Grounded in your tree · gaps become quests');
    if (!RPGACE.sb || !RPGACE.sb.select) return;
    RPGACE.sb.select('bookworm_books', 'status=eq.in_progress&select=id,title,current_chapter_index').then(function(books) {
      books = books || [];
      set('bookworm', books.length ? (books.length + ' book' + (books.length > 1 ? 's' : '') + ' in progress') : 'No books in progress');
      var story = document.getElementById('dd-needs-story');
      var list = document.getElementById('dd-needs-list');
      RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&select=id').then(function(props) {
        props = props || [];
        set('taxonomy', props.length + ' placement' + (props.length === 1 ? '' : 's') + ' awaiting review');
        if (!story || !list) return;
        var bits = [];
        list.innerHTML = '';
        var addItem = function(text, onclick) {
          var li = document.createElement('li');
          li.textContent = text;
          li.onclick = onclick;
          list.appendChild(li);
        };
        if (props.length) {
          bits.push(props.length + ' taxonomy placement' + (props.length === 1 ? '' : 's') + ' waiting for your judgement');
          addItem('Review ' + props.length + ' pending placement' + (props.length === 1 ? '' : 's'), function() {
            var rq = RPGACE.modules.taxonomyReviewQueue;
            if (rq && rq._openQueue) rq._openQueue(); else if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.dashboard);
          });
        }
        books.forEach(function(b) {
          bits.push('"' + b.title + '" is mid-read');
          addItem('Continue: ' + (b.title.length > 34 ? b.title.slice(0, 34) + '…' : b.title), function() {
            var bw = RPGACE.modules.bookworm;
            if (bw && bw._openBook) bw._openBook(b.id);
          });
        });
        if (!bits.length) {
          story.textContent = 'All clear — nothing is waiting on you. Make a beat, analyse a video, or open a chapter.';
          addItem('Open Research Lab', function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.research); });
        } else {
          story.textContent = bits.join('. ') + '.';
        }
      }).catch(function() { set('taxonomy', '—'); });
    }).catch(function() { set('bookworm', '—'); });
  },

});
/* ===END:dashDeck=== */

/* ===MODULE:intelDedup=== */
// July 19 — root-cause fix for the duplicate Content Intelligence rows
// (real evidence: one video cached 5 times; 24 dup rows total). Cause:
// main.js's mergeByUrl dedups by EXACT url string only - mismatched
// formats (youtu.be vs watch?v=, trailing params, m.youtube.com) never
// match, and importIntelJSON skips dedup entirely; bad rows then persist
// forever because the cache itself is merged back in on every 30s sync.
// Fix: normalized-URL + title-fallback dedup applied to the localStorage
// caches, once on init and after every sync (chainable wrap). main.js
// untouched (frozen).
RPGACE.register('intelDedup', {

  normUrl: function(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    s = s.replace(/^https?:\/\//i, '');
    s = s.replace(/^www\./i, '');
    s = s.replace(/^m\.youtube\.com/i, 'youtube.com');
    s = s.split('#')[0];
    var m = s.match(/^youtu\.be\/([A-Za-z0-9_-]{5,20})/i);
    if (m) return 'youtube.com/watch?v=' + m[1];
    m = s.match(/^youtube\.com\/shorts\/([A-Za-z0-9_-]{5,20})/i);
    if (m) return 'youtube.com/watch?v=' + m[1];
    if (/^youtube\.com\/watch/i.test(s)) {
      var vm = s.match(/[?&]v=([A-Za-z0-9_-]{5,20})/);
      return vm ? 'youtube.com/watch?v=' + vm[1] : s.split('?')[0].toLowerCase();
    }
    s = s.split('?')[0];
    s = s.replace(/\/+$/, '');
    return s.toLowerCase();
  },

  dedupKey: function(r) {
    var u = this.normUrl(r && r.url);
    if (u) return u;
    return 'title:' + String((r && r.title) || '').replace('☁️', '').trim().toLowerCase();
  },

  // Deterministic keep-rule when two rows share a key: richest row wins
  // (has the full insights payload), then the one deletable server-side
  // (has a Supabase id), then the newer. Backfills id/url onto the
  // winner so dedup never loses delete-ability or the original link.
  _pick: function(a, b) {
    var keep, lose;
    var aRich = !!(a.insights && a.insights.encyclopedia_entry);
    var bRich = !!(b.insights && b.insights.encyclopedia_entry);
    if (aRich !== bRich) { keep = aRich ? a : b; }
    else if (!!a.id !== !!b.id) { keep = a.id ? a : b; }
    else {
      var ad = new Date(a.date || a.created_at || 0).getTime();
      var bd = new Date(b.date || b.created_at || 0).getTime();
      keep = bd > ad ? b : a;
    }
    lose = (keep === a) ? b : a;
    if (!keep.id && lose.id) keep.id = lose.id;
    if (!keep.url && lose.url) keep.url = lose.url;
    return keep;
  },

  dedupArray: function(arr) {
    var self = this;
    var map = {};
    var order = [];
    (arr || []).forEach(function(r) {
      if (!r) return;
      var key = self.dedupKey(r);
      if (map[key] === undefined) { map[key] = r; order.push(key); }
      else { map[key] = self._pick(map[key], r); }
    });
    return order.map(function(k) { return map[k]; });
  },

  _safeSet: function(key, arr, cap, halfCap) {
    try { localStorage.setItem(key, JSON.stringify(arr.slice(0, cap))); }
    catch (e1) {
      try { localStorage.setItem(key, JSON.stringify(arr.slice(0, halfCap))); }
      catch (e2) { console.warn('[intelDedup] quota:', e2.message); }
    }
  },

  purge: function() {
    var reports = [];
    var wl = [];
    try { reports = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]'); } catch (e) { reports = []; }
    try { wl = JSON.parse(localStorage.getItem('rpgace_intel_watchlist') || '[]'); } catch (e) { wl = []; }
    reports = this.dedupArray(reports);
    wl = this.dedupArray(wl);
    this._safeSet('rpgace_intel_insights', reports, 200, 100);
    this._safeSet('rpgace_intel_watchlist', wl, 100, 50);
    this._writeStats(reports, wl);
    return reports;
  },

  // Rewrites #intel-stats with DEDUPED counts - syncIntelData writes it
  // from the raw merged array mid-flight; this runs after and corrects it
  // (same markup as main.js:4271).
  _writeStats: function(reports, wl) {
    var el = document.getElementById('intel-stats');
    if (!el) return;
    var scores = reports.map(function(r) { return r.score || 0; }).filter(Boolean);
    var avg = scores.length ? (scores.reduce(function(a, b) { return a + b; }, 0) / scores.length).toFixed(1) : 0;
    el.innerHTML = '<span style="color:var(--gold)">📊 ' + reports.length + ' analysed</span> · <span style="color:var(--purple)">⭐ ' + wl.length + ' watchlist</span> · <span style="color:var(--green)">avg ' + avg + '/10</span>';
  },

  init: function() {
    var self = this;
    setTimeout(function() {
      self.purge();
      if (typeof window.loadIntelInsights === 'function') window.loadIntelInsights();
    }, 1600);
    function patch() {
      if (typeof window.syncIntelData !== 'function' || window._intelDedupPatched) return;
      window._intelDedupPatched = true;
      var orig = window.syncIntelData;
      window.syncIntelData = function() {
        var result = orig.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          return result.then(function() {
            var deduped = self.purge();
            if (typeof window.loadIntelInsights === 'function') window.loadIntelInsights();
            return deduped;
          });
        }
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

});
/* ===END:intelDedup=== */

/* ===MODULE:videoSummary=== */
// July 19 — the "Video Summary" page (approved plan, spec answers
// recorded there): replaces the Insights tab's flat rows with per-video
// summary cards. Collapsed card = video meta + its TOP 3 insights ranked
// by the unified scored engine's stored confidence, each with insight
// text, taxonomy path, and justification. Expanding shows ALL insights
// as readable prose, then a grouped Taxonomy placements section. Old
// videos (no per-insight proposals) get a per-video "🧬 Run Phylum Path"
// retro button (max 4 sequential calls, explicit click only). ZERO
// Oracle calls in the render path - Council-of-5 presence comes from the
// stored justification/confidenceScore, never re-computed.
//
// DELIBERATE: cards use the .vs-card CLASS, never inline
// background:var(--panel2)+margin-bottom:12px styles, and every card has
// an id - this makes intelDelete's legacy insight-UI selector match 0
// cards and its MutationObserver ignore our renders, cleanly retiring
// that module's master-toggle/collapsed-list without editing it (its
// watchlist delete, bibliography section, and _deleteUnified stay in
// active use - our 🗑 calls _deleteUnified directly).
RPGACE.register('videoSummary', {

  PROPOSALS_TTL: 30000,
  _proposals: null, // null = never loaded (distinct from [] = loaded, none)
  _proposalsAt: 0,
  _fetching: false,
  _expanded: {},

  _esc: function(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  _key: function(r) { return RPGACE.modules.intelDedup.dedupKey(r); },
  _sid: function(key) {
    var h = 5381;
    for (var i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
    return 'vs' + (h >>> 0).toString(36);
  },
  _reports: function() {
    try { return JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]'); } catch (e) { return []; }
  },
  _cleanTitle: function(r) { return String((r && r.title) || 'Untitled').replace('☁️', '').trim(); },
  _conf: function(p) { return (p.proposed_steps && Number(p.proposed_steps.confidenceScore)) || 0; },
  _coerce: function(b) {
    return typeof b === 'object' && b !== null ? (b.insight || b.technique || b.tip || b.steal || JSON.stringify(b)) : String(b);
  },

  _fetchProposals: function(force) {
    var self = this;
    if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(this._proposals || []);
    if (force && RPGACE.cache && RPGACE.cache.clear) RPGACE.cache.clear('taxonomy_proposals');
    this._fetching = true;
    return RPGACE.sb.select('taxonomy_proposals', 'source_type=eq.content_intelligence&select=id,source_id,proposed_path,proposed_steps,status,created_at&order=created_at.desc&limit=1000')
      .then(function(rows) {
        self._proposals = rows || [];
        self._proposalsAt = Date.now();
        self._fetching = false;
        return self._proposals;
      }).catch(function(e) {
        self._fetching = false;
        console.warn('[videoSummary] proposals fetch failed:', e.message);
        return self._proposals || []; // keep last-known - never null-out on failure
      });
  },

  _proposalsFor: function(key) {
    var self = this;
    var dd = RPGACE.modules.intelDedup;
    var out = (this._proposals || []).filter(function(p) {
      if (!p.source_id) return false;
      var pk = String(p.source_id).indexOf('title:') === 0
        ? String(p.source_id).toLowerCase()
        : dd.normUrl(p.source_id);
      return pk === key;
    });
    out.sort(function(a, b) { return self._conf(b) - self._conf(a); });
    return out;
  },

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.loadIntelInsights !== 'function' || window._videoSummaryPatched) return;
      window._videoSummaryPatched = true;
      var orig = window.loadIntelInsights;
      window.loadIntelInsights = function() {
        try { self._render(); }
        catch (e) {
          console.warn('[videoSummary] render failed, falling back:', e.message);
          return orig.apply(this, arguments);
        }
      };
    }
    patch();
    setTimeout(patch, 1500);
    setTimeout(function() { if (typeof window.loadIntelInsights === 'function') window.loadIntelInsights(); }, 1700);
  },

  _injectStyles: function() {
    if (document.getElementById('vs-styles')) return;
    var st = document.createElement('style');
    st.id = 'vs-styles';
    st.textContent =
      '.vs-card{background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:11px}' +
      '.vs-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      '.vs-btn{background:none;border:1px solid var(--border);color:var(--text);border-radius:6px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;min-height:38px}' +
      '.vs-chip{display:inline-block;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700;margin-right:4px}';
    document.head.appendChild(st);
  },

  _render: function() {
    var self = this;
    this._injectStyles();
    var el = document.getElementById('intel-insights-content');
    if (!el) return;
    var reports = this._reports();
    if (!reports.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No insights yet.<br><br>Run the Intel script and paste a URL.<br>Reports appear here automatically within 30 seconds.</div>';
      return;
    }
    el.innerHTML = reports.map(function(r) { return self._cardHtml(r); }).join('');
    this._bindDelegation(el);
    RPGACE.ui.batchList(el, 8);
    this._maybeRefresh();
  },

  _maybeRefresh: function() {
    if (this._fetching) return;
    if (Date.now() - this._proposalsAt <= this.PROPOSALS_TTL) return;
    var self = this;
    this._fetchProposals(false).then(function() { self._render(); });
  },

  _statusChip: function(status) {
    if (status === 'pending') return '<span class="vs-chip" style="background:rgba(201,168,76,0.15);color:var(--gold)">⏳ pending</span>';
    if (status === 'accepted') return '<span class="vs-chip" style="background:rgba(61,170,110,0.15);color:var(--green)">✓ accepted</span>';
    if (status === 'rejected') return '<span class="vs-chip" style="background:rgba(226,84,84,0.15);color:var(--red)">✗ rejected</span>';
    return '<span class="vs-chip" style="background:rgba(255,255,255,0.06);color:var(--muted)">' + this._esc(status || '?') + '</span>';
  },

  _placementRowHtml: function(p, clamp) {
    var steps = p.proposed_steps || {};
    return '<div style="border-left:2px solid rgba(155,89,182,0.4);padding-left:10px;margin-bottom:8px">' +
      '<div' + (clamp ? ' class="vs-clamp2"' : '') + ' style="font-size:12px;color:var(--text)">' + this._esc(steps.insightText) + '</div>' +
      '<div style="font-size:11px;color:var(--gold)">' + this._esc(p.proposed_path) + '</div>' +
      (steps.justification ? '<div style="font-size:11px;color:var(--muted);font-style:italic">' + this._esc(steps.justification) + '</div>' : '') +
      '<span class="vs-chip" style="background:rgba(155,89,182,0.15);color:var(--purple)">⚖ ' + this._conf(p) + '/10</span>' +
      this._statusChip(p.status) +
      '</div>';
  },

  _headerHtml: function(r) {
    var score = r.score || 0;
    var bar = '█'.repeat(score) + '░'.repeat(Math.max(0, 10 - score));
    var scoreColor = score >= 7 ? 'var(--green)' : score >= 5 ? 'var(--gold)' : 'var(--red)';
    var when = '';
    try { when = new Date(r.date || r.created_at).toLocaleDateString(); } catch (e) {}
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">' + this._esc(this._cleanTitle(r)) + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + this._esc(r.creator || '') + ' · ' + this._esc(r.platform || '') + ' · ' + this._esc(when) + '</div></div>' +
      '<div style="text-align:right;margin-left:12px"><div style="font-size:18px;font-weight:700;color:' + scoreColor + '">' + score + '/10</div>' +
      '<div style="font-size:10px;color:var(--muted);font-family:monospace">' + bar + '</div></div></div>';
  },

  _verdictHtml: function(r) {
    var v = r.insights && r.insights.verdict_summary;
    return v ? '<div style="font-size:12px;color:var(--gold2);margin-bottom:8px;font-style:italic">"' + this._esc(v) + '"</div>' : '';
  },

  _legacyBulletsHtml: function(r) {
    var self = this;
    var kl = (r.insights && r.insights.encyclopedia_entry && r.insights.encyclopedia_entry.key_learnings) || [];
    var bullets = kl.slice(0, 3).map(function(b) { return '• ' + self._esc(self._coerce(b)); }).join('<br>');
    var html = bullets ? '<div style="font-size:12px;color:var(--muted)">' + bullets + '</div>' : '';
    if (this._proposals === null) {
      html += '<div style="font-size:10px;color:var(--muted);margin-top:4px">taxonomy placements loading…</div>';
    }
    return html;
  },

  _bulletGroupHtml: function(label, items) {
    var self = this;
    if (!items || !items.length) return '';
    return '<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:10px 0 4px">' + label + '</div>' +
      '<div style="font-size:12px;color:rgba(226,226,236,0.7);line-height:1.7">' +
      items.map(function(b) { return '• ' + self._esc(self._coerce(b)); }).join('<br>') + '</div>';
  },

  _proseHtml: function(r) {
    var ins = r.insights || {};
    var enc = ins.encyclopedia_entry || {};
    var html = '<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:10px 0 6px">Summary</div>';
    html += this._verdictHtml(r);
    if (enc.summary) html += '<div style="font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;margin-bottom:6px">' + this._esc(enc.summary) + '</div>';
    html += this._bulletGroupHtml('Key learnings', enc.key_learnings);
    html += this._bulletGroupHtml('Production techniques', ins.production_techniques);
    html += this._bulletGroupHtml('What to steal', ins.what_to_steal);
    return html;
  },

  _placementsHtml: function(props, sid) {
    var self = this;
    var html = '<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin:14px 0 6px">Taxonomy placements</div>';
    if (props.length) {
      html += props.map(function(p) { return self._placementRowHtml(p, false); }).join('');
    } else if (this._proposals === null) {
      html += '<div style="font-size:10px;color:var(--muted)">taxonomy placements loading…</div>';
    } else {
      html += '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">No placements yet — this video was analysed before per-insight placement existed.</div>' +
        '<button class="vs-btn" data-vs-action="retro" id="vs-retro-x-' + sid + '" style="color:var(--purple);border-color:rgba(155,89,182,0.4)">🧬 Run Phylum Path</button>';
    }
    return html;
  },

  _footerHtml: function(r, expanded, showRetro, sid) {
    var html = '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="vs-btn" data-vs-action="toggle">' + (expanded ? '▴ Collapse' : '▾ Details') + '</button>' +
      '<button class="vs-btn" data-vs-action="enc">📖 Encyclopedia</button>';
    if (r.url) html += '<a class="vs-btn" style="text-decoration:none;color:var(--muted);display:inline-flex;align-items:center" href="' + this._esc(r.url) + '" target="_blank">🔗 Original</a>';
    if (showRetro) html += '<button class="vs-btn" data-vs-action="retro" id="vs-retro-' + sid + '" style="color:var(--purple);border-color:rgba(155,89,182,0.4)">🧬 Run Phylum Path</button>';
    html += '<button class="vs-btn" data-vs-action="del" style="color:rgba(226,84,84,0.8)">🗑</button></div>';
    return html;
  },

  _cardHtml: function(r) {
    var self = this;
    var key = this._key(r);
    var sid = this._sid(key);
    var title = this._cleanTitle(r);
    var props = this._proposalsFor(key);
    var expanded = !!this._expanded[key];
    var showRetro = this._proposals !== null && props.length === 0;

    var collapsedBody;
    if (props.length) {
      collapsedBody = this._verdictHtml(r) + props.slice(0, 3).map(function(p) { return self._placementRowHtml(p, true); }).join('');
    } else {
      collapsedBody = this._verdictHtml(r) + this._legacyBulletsHtml(r);
    }

    return '<div class="vs-card" id="vs-card-' + sid + '" data-vs-key="' + this._esc(key) + '" data-intel-title="' + this._esc(title) + '">' +
      '<div id="vs-collapsed-' + sid + '" style="display:' + (expanded ? 'none' : 'block') + '">' +
        this._headerHtml(r) + collapsedBody + this._footerHtml(r, false, showRetro, sid) +
      '</div>' +
      '<div id="vs-expanded-' + sid + '" style="display:' + (expanded ? 'block' : 'none') + '">' +
        this._headerHtml(r) + this._proseHtml(r) + this._placementsHtml(props, sid) + this._footerHtml(r, true, false, sid) +
      '</div>' +
      '</div>';
  },

  _bindDelegation: function(el) {
    if (el._vsDelegated) return;
    el._vsDelegated = true;
    var self = this;
    el.addEventListener('click', function(ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-vs-action]') : null;
      if (!btn) return;
      var card = btn.closest('.vs-card');
      if (!card) return;
      var key = card.getAttribute('data-vs-key');
      var action = btn.getAttribute('data-vs-action');
      if (action === 'toggle') self._toggle(key, card);
      else if (action === 'enc') self._saveEnc(key);
      else if (action === 'retro') self._runRetro(key, btn);
      else if (action === 'del') self._delete(key, card);
    });
  },

  _toggle: function(key, card) {
    this._expanded[key] = !this._expanded[key];
    var coll = card.querySelector('[id^="vs-collapsed-"]');
    var exp = card.querySelector('[id^="vs-expanded-"]');
    if (coll) coll.style.display = this._expanded[key] ? 'none' : 'block';
    if (exp) exp.style.display = this._expanded[key] ? 'block' : 'none';
  },

  _findByKey: function(key) {
    var arr = this._reports();
    var dd = RPGACE.modules.intelDedup;
    for (var i = 0; i < arr.length; i++) {
      if (dd.dedupKey(arr[i]) === key) return { entry: arr[i], idx: i };
    }
    return null;
  },

  // Kills the old index bug: the index is computed against the LIVE
  // storage array at click time - the same array main.js's frozen
  // saveIntelToEncyclopedia re-reads - never baked into render order.
  _saveEnc: function(key) {
    var found = this._findByKey(key);
    if (!found) { RPGACE.utils.toast('Report no longer in cache', 'rgba(226,84,84,0.85)', 2500); return; }
    if (typeof window.saveIntelToEncyclopedia === 'function') window.saveIntelToEncyclopedia(found.idx);
  },

  _delete: function(key, card) {
    var found = this._findByKey(key);
    if (!found) { if (card) card.remove(); return; }
    var title = this._cleanTitle(found.entry);
    var del = RPGACE.modules.intelDelete;
    var self = this;
    if (del && del._deleteUnified) {
      del._deleteUnified(found.entry, title, card, null);
    } else if (window.confirm('Delete "' + title + '"?')) {
      var arr = this._reports();
      arr.splice(found.idx, 1);
      try { localStorage.setItem('rpgace_intel_insights', JSON.stringify(arr)); } catch (e) {}
      self._render();
    }
  },

  // On-demand retro-analysis for pre-per-insight-loop videos (confirmed
  // answer: per video, never bulk). Sequential silentPropose chain - the
  // unified scored engine does the placement + justification + score;
  // proposals land in the Dashboard review queue like any other.
  _runRetro: function(key, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '🧬 Analysing…';
    var self = this;
    var reset = function(label) { btn.disabled = false; btn.textContent = label || '🧬 Run Phylum Path'; };
    var found = this._findByKey(key);
    if (!found) { RPGACE.utils.toast('Report no longer in cache', 'rgba(226,84,84,0.85)', 2500); reset(); return; }
    if (!RPGACE.modules.taxonomyTree || !RPGACE.utils._quickPhylaScan) { RPGACE.utils.toast('Taxonomy engine not ready', 'rgba(226,84,84,0.85)', 2500); reset(); return; }
    var r = found.entry;
    var ins = r.insights || {};
    var enc = ins.encyclopedia_entry || {};
    var texts = [].concat(enc.key_learnings || []).concat(ins.production_techniques || [])
      .map(function(t) { return String(self._coerce(t)).trim(); })
      .filter(function(t) { return t.length >= 40; })
      .slice(0, 4);
    if (!texts.length) { RPGACE.utils.toast('No substantial insights stored for this video', 'rgba(226,84,84,0.85)', 3000); reset(); return; }
    var sourceId = r.url || ('title:' + this._cleanTitle(r).toLowerCase());
    var queued = 0;
    var chain = Promise.resolve();
    texts.forEach(function(t) {
      chain = chain.then(function() {
        var m = RPGACE.utils._quickPhylaScan(t);
        if (!m.length) return;
        return RPGACE.modules.taxonomyTree.silentPropose(t.slice(0, 400), m[0].num, 'content_intelligence', sourceId)
          .then(function() { queued++; })
          .catch(function(e) { console.warn('[videoSummary] retro propose failed:', e.message); });
      });
    });
    chain.then(function() {
      // Append to ciAutoPropose's guard so the 30s scan never re-proposes
      // a video the user just retro-analysed (same key format it uses).
      var guard = localStorage.getItem('rpgace_ci_proposed') || '';
      var gk = r.url || r.title;
      if (gk && guard.indexOf('|' + gk + '|') === -1) {
        try { localStorage.setItem('rpgace_ci_proposed', guard + '|' + gk + '|'); } catch (e) {}
      }
      RPGACE.utils.toast(queued ? ('🌳 ' + queued + ' placement' + (queued > 1 ? 's' : '') + ' queued for review') : 'No phylum match found in stored insights', 'rgba(155,89,182,0.85)', 3500);
      return self._fetchProposals(true);
    }).then(function() { self._render(); });
  },

});
/* ===END:videoSummary=== */

/* ===MODULE:taxonomySync=== */
RPGACE.register('taxonomySync', {

  // DOMAIN A — CRAFT (I–VIII): the making
  // DOMAIN B — KNOWLEDGE (IX–XII): what you learn
  // DOMAIN C — CONTENT (XIII–XV): what you make public
  // DOMAIN D — BUSINESS (XVI–XIX): how you earn
  // DOMAIN E — SYSTEMS (XX–XXI): infrastructure + overflow
  PHYLUM_MAP: [
    // DOMAIN A — CRAFT
    [1,  'Compositio',           'melody harmony chord progression scale mode song structure arrangement motif theme key signature time signature'],
    [2,  'Percussio',            'drum kick snare hi-hat 808 groove pattern percussion rhythm loop break clap trap drill percussion programming'],
    [3,  'Sonus Designatio',     'sound design synthesis synthesizer sampler sampling foley texture layer patch preset timbre oscillator wavetable fm am'],
    [4,  'Mixtura',              'mix mixing eq equaliser equalizer compression compressor sidechain saturation reverb delay stereo width pan balance level gain frequency spectrum masking'],
    [5,  'Magistra',             'master mastering lufs loudness limiter limiting stem streaming export final chain buss glue true peak'],
    [6,  'Instrumentarium',      'fl studio daw plugin vst instrument workflow midi controller keyboard pad launchpad template project channel rack mixer playlist'],
    [7,  'Sensus Auris',         'listening critical ear reference a/b compare analysis frequency spectrum monitor speaker headphone hearing training ear'],
    [8,  'Anatomia',             'theory interval mode scale degree triad seventh chord voice leading tension resolution counterpoint circle fifth cadence'],
    // DOMAIN B — KNOWLEDGE
    [9,  'Historia',             'producer history era golden boom bap trap drill afrobeats west coast south atlanta uk french russian influence inspiration legacy sample'],
    [10, 'Psychologia',          'psychology flow state creativity block procrastination identity mindset habit routine discipline motivation artist persona brand vision'],
    [11, 'Lingua Musicae',       'colour palette visual music language scale colour map mood emotion tone aesthetic feel cinematic dark light warm cold'],
    [12, 'Fons Educationis',     'educator teacher tutorial youtube resource course learning study guide lesson explanation breakdown source reference mentor'],
    // DOMAIN C — CONTENT
    [13, 'Contentum',            'youtube tutorial instagram reels shorts hook thumbnail title caption script content creator post video upload audience watch time retention algorithm'],
    [14, 'Visio Cinematica',     'filmmaker director visual treatment neural frames storyboard shot camera movement colour grade cinematography mood board brief video production'],
    [15, 'Collaboratio',         'collab collaboration outreach network community email cold pitch feature verse producer artist relationship contact connect'],
    // DOMAIN D — BUSINESS
    [16, 'Venditionis Beatorum', 'beat selling beatstars airbit price lease exclusive licence non-exclusive premium uk drill trap sell store catalogue listing'],
    [17, 'Negotium',             'contract publishing rights split work for hire copyright ownership royalty publishing deal sync licence agreement clause'],
    [18, 'Distributio',          'distribution distrokid routenote prs content id fingerprint streaming spotify apple tidal release upload distribute royalty collect'],
    [19, 'Referentia Mercati',   'trend market competitive analysis region gap opportunity niche demand search volume trend report intelligence competitor'],
    // DOMAIN E — SYSTEMS
    [20, 'Technologia',          'ai automation rpgace composio supabase vercel n8n pipeline workflow tool system api integration build deploy code script'],
    [21, 'Miscellaneous Ordinanda', 'misc unsorted uncategorised general note insight observation todo review'],
  ],

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectUI(); }, 800);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectUI(); }, 400);
      }
    });
  },

  _injectUI: function() {
    if (document.getElementById('tax-sync-btn')) return;
    var self = this;

    // Find the encyclopedia sync button area to inject near it
    var targets = [
      document.querySelector('[onclick*="syncAndPush"]'),
      document.querySelector('[onclick*="syncEncyclopedia"]'),
      document.querySelector('#sync-btn'),
    ];
    var anchor = targets.find(function(t) { return t; });
    if (!anchor) return;

    var btn = document.createElement('button');
    btn.id = 'tax-sync-btn';
    btn.textContent = '🌿 Sync Taxonomy';
    btn.title = 'Push encyclopedia entries to taxonomy_nodes';
    btn.style.cssText = anchor.style.cssText || '';
    btn.style.marginLeft = '8px';
    btn.style.borderColor = 'rgba(42,191,176,0.4)';
    btn.style.color = '#2ABFB0';
    btn.style.background = 'rgba(42,191,176,0.08)';
    btn.className = anchor.className || '';
    btn.onclick = function() { self._runSync(); };
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);

    console.log('[RPGACE:taxonomySync] Button injected');
  },

  _detectPhylum: function(text) {
    var t = (text || '').toLowerCase();
    var scores = this.PHYLUM_MAP.map(function(p) {
      var keywords = p[2].toLowerCase().split(/[\s,]+/);
      var score = keywords.reduce(function(acc, kw) {
        return acc + (kw.length > 3 && t.includes(kw) ? 1 : 0);
      }, 0);
      return { num: p[0], name: p[1], score: score };
    });
    scores.sort(function(a, b) { return b.score - a.score; });
    // F8: fallback default had num:10/name:'Technologia' - PHYLUM_MAP (above)
    // has 10 as Psychologia and 20 as Technologia, so any zero-score entry
    // landed with a self-contradictory {num, name} pair. Technologia is 20.
    return scores[0].score > 0 ? scores[0] : { num: 20, name: 'Technologia' };
  },

  _runSync: function() {
    var self = this;
    RPGACE.utils.toast('🌿 Fetching encyclopedia entries...', '#2ABFB0', 2000);

    RPGACE.sb.select('encyclopedia', 'order=created_at.desc&limit=50')
      .then(function(entries) {
        if (!entries || entries.length === 0) {
          RPGACE.utils.toast('No encyclopedia entries found.', '#E25454', 3000);
          return;
        }

        // Check existing taxonomy nodes to avoid duplicates
        return RPGACE.sb.select('taxonomy_nodes', 'select=concept')
          .then(function(existing) {
            var existingConcepts = (existing || []).map(function(n) {
              return (n.concept || '').toLowerCase().trim();
            });

            // Deduplicate within the incoming batch too
            var seenTitles = {};
            var toSync = entries.filter(function(e) {
              var t = (e.title || '').toLowerCase().trim();
              if (existingConcepts.includes(t)) return false;
              if (seenTitles[t]) return false;
              seenTitles[t] = true;
              return true;
            });

            if (toSync.length === 0) {
              RPGACE.utils.toast('All entries already in taxonomy.', '#2ABFB0', 3000);
              return;
            }

            RPGACE.utils.toast('🌿 Syncing ' + toSync.length + ' new entries...', '#2ABFB0', 2000);
            return self._syncBatch(toSync, 0, 0);
          });
      })
      .catch(function(err) {
        RPGACE.utils.toast('Sync error: ' + err.message, '#E25454', 4000);
        console.error('[taxonomySync] error:', err);
      });
  },

  _syncBatch: function(entries, idx, count) {
    var self = this;
    if (idx >= entries.length) {
      RPGACE.utils.toast('✅ Taxonomy sync complete — ' + count + ' nodes added', '#2ABFB0', 4000);
      return;
    }

    var entry = entries[idx];
    var phylum = self._detectPhylum((entry.title || '') + ' ' + (entry.content || ''));
    var contentPreview = (entry.content || '').slice(0, 400);

    var node = {
      concept: entry.title || 'Untitled',
      phylum_number: phylum.num,
      phylum_name: phylum.name,
      definition: contentPreview,
      source: 'encyclopedia_sync',
      study_count: 0,
      gap_score: 5.0,
      applied_in_beat: false,
    };

    RPGACE.sb.insert('taxonomy_nodes', node)
      .then(function() {
        // Stagger requests to avoid Supabase rate limits
        setTimeout(function() {
          self._syncBatch(entries, idx + 1, count + 1);
        }, 150);
      })
      .catch(function(err) {
        console.warn('[taxonomySync] skipped "' + entry.title + '":', err.message);
        setTimeout(function() {
          self._syncBatch(entries, idx + 1, count);
        }, 150);
      });
  },

  // Called by Feynman after a session to update gap_score
  updateGapScore: function(concept, score) {
    var gapScore = Math.max(0, 10 - score);
    RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(concept) + '&limit=1')
      .then(function(rows) {
        if (!rows || rows.length === 0) return;
        var id = rows[0].id;
        fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_nodes?id=eq.' + id, {
          method: 'PATCH',
          headers: {
            'apikey': RPGACE.CONFIG.supabase.key,
            'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            study_count: (rows[0].study_count || 0) + 1,
            gap_score: gapScore,
            last_studied_at: new Date().toISOString()
          })
        });
      })
      .catch(function(err) {
        console.warn('[taxonomySync] updateGapScore error:', err.message);
      });
  },

  // Called by Beat Log when nodes are tagged
  markApplied: function(concept) {
    RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(concept) + '&limit=1')
      .then(function(rows) {
        if (!rows || rows.length === 0) return;
        var id = rows[0].id;
        fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_nodes?id=eq.' + id, {
          method: 'PATCH',
          headers: {
            'apikey': RPGACE.CONFIG.supabase.key,
            'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ applied_in_beat: true })
        });
      });
  },

  // Get top N nodes by gap score — used by agenda generator and Morning Brief
  getTopGaps: function(limit) {
    limit = limit || 5;
    return RPGACE.sb.select('taxonomy_nodes',
      'order=gap_score.desc&limit=' + limit + '&applied_in_beat=eq.false'
    );
  },

});
/* ===END:taxonomySync=== */

/* ===MODULE:knowledgeGap=== */
RPGACE.register('knowledgeGap', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 1000);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        self._inject();
      }
    });
  },

  _inject: function() {
    if (document.getElementById('kg-panel')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    var self = this;

    var panel = document.createElement('div');
    panel.id = 'kg-panel';
    panel.style.cssText = 'margin-bottom:24px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Knowledge Gap Tracker';

    var badge = document.createElement('div');
    badge.id = 'kg-badge';
    badge.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(42,191,176,0.7);background:rgba(42,191,176,0.08);border:1px solid rgba(42,191,176,0.2);border-radius:10px;padding:3px 10px;';
    badge.textContent = 'Loading...';

    var refreshBtn = document.createElement('button');
    refreshBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);cursor:pointer;font-size:10px;padding:3px 10px;margin-left:8px;';
    refreshBtn.textContent = '↻';
    refreshBtn.onclick = function() { self._load(); };

    hdr.appendChild(title);
    var badgeWrap = document.createElement('div');
    badgeWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
    badgeWrap.appendChild(badge);
    badgeWrap.appendChild(refreshBtn);
    hdr.appendChild(badgeWrap);
    panel.appendChild(hdr);

    var grid = document.createElement('div');
    grid.id = 'kg-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';
    panel.appendChild(grid);

    var emptyState = document.createElement('div');
    emptyState.id = 'kg-empty';
    emptyState.style.cssText = 'display:none;font-size:12px;color:rgba(226,226,236,0.3);padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-radius:8px;';
    emptyState.textContent = 'No taxonomy nodes yet. Sync your encyclopedia first.';
    panel.appendChild(emptyState);

    // Insert before the first section-title (quest grid)
    var firstTitle = page.querySelector('.section-title');
    if (firstTitle) {
      page.insertBefore(panel, firstTitle);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    self._load();
    console.log('[RPGACE:knowledgeGap] Panel injected');
  },

  _load: function() {
    var self = this;
    if (!RPGACE.modules.taxonomySync) return;

    RPGACE.modules.taxonomySync.getTopGaps(6)
      .then(function(nodes) {
        self._render(nodes || []);
      })
      .catch(function(err) {
        console.warn('[knowledgeGap] load error:', err.message);
      });
  },

  _render: function(nodes) {
    var self = this;
    var grid = document.getElementById('kg-grid');
    var badge = document.getElementById('kg-badge');
    var empty = document.getElementById('kg-empty');
    if (!grid) return;

    grid.innerHTML = '';

    if (nodes.length === 0) {
      if (empty) empty.style.display = 'block';
      if (badge) badge.textContent = '0 gaps';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (badge) badge.textContent = nodes.length + ' gaps tracked';

    nodes.forEach(function(node) {
      var gap = parseFloat(node.gap_score) || 5;
      var studied = node.study_count || 0;
      var applied = node.applied_in_beat || false;

      // Gap colour: red > 7, gold 4-7, teal < 4
      var gapColor = gap >= 7 ? '#E25454' : gap >= 4 ? '#C9A84C' : '#2ABFB0';
      var gapBg = gap >= 7 ? 'rgba(226,84,84,0.06)' : gap >= 4 ? 'rgba(201,168,76,0.06)' : 'rgba(42,191,176,0.06)';
      var gapBorder = gap >= 7 ? 'rgba(226,84,84,0.2)' : gap >= 4 ? 'rgba(201,168,76,0.2)' : 'rgba(42,191,176,0.2)';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + gapBg + ';border:1px solid ' + gapBorder + ';border-radius:8px;padding:14px 16px;position:relative;';

      var phylumLabel = document.createElement('div');
      phylumLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + gapColor + ';opacity:0.7;margin-bottom:4px;';
      phylumLabel.textContent = node.phylum_number ? RPGACE.utils.phylumLabel(node.phylum_number) : 'Phylum ? · Unknown';

      var conceptName = document.createElement('div');
      conceptName.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;margin-bottom:8px;line-height:1.3;';
      conceptName.textContent = node.concept || 'Untitled';

      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';

      var gapStat = document.createElement('div');
      gapStat.style.cssText = 'font-size:10px;color:' + gapColor + ';font-weight:700;';
      gapStat.textContent = 'Gap ' + gap.toFixed(1);

      var studiedStat = document.createElement('div');
      studiedStat.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.35);';
      studiedStat.textContent = studied + 'x studied';

      var appliedStat = document.createElement('div');
      appliedStat.style.cssText = 'font-size:10px;color:' + (applied ? '#3DAA6E' : 'rgba(226,226,236,0.2)') + ';';
      appliedStat.textContent = applied ? '✓ applied' : '○ not applied';

      statsRow.appendChild(gapStat);
      statsRow.appendChild(studiedStat);
      statsRow.appendChild(appliedStat);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;';

      var studyBtn = document.createElement('button');
      studyBtn.style.cssText = 'flex:1;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.7);font-size:10px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif;';
      studyBtn.textContent = '🧠 Study Now';
      studyBtn.onclick = function() {
        if (typeof RPGACE.modules.feynman !== 'undefined' && typeof RPGACE.modules.feynman.start === 'function') {
          RPGACE.modules.feynman.start(node.concept, 'knowledgeGap');
        } else {
          RPGACE.utils.sendToOracle('Start a Feynman Loop session on: ' + node.concept + '. I want to master this concept for FL Studio UK hip hop production.');
        }
      };

      var askBtn = document.createElement('button');
      askBtn.style.cssText = 'flex:1;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.7);font-size:10px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif;';
      askBtn.textContent = '⚡ Apply Tonight';
      askBtn.onclick = function() {
        RPGACE.utils.sendToOracle('Give me one specific FL Studio exercise I can do tonight to apply this concept in a beat: ' + node.concept + '. Be specific, step-by-step, and give me an exact task I can complete in 30 minutes.');
        if (typeof RPGACE.modules.taxonomySync !== 'undefined') {
          RPGACE.modules.taxonomySync.markApplied(node.concept);
          node.applied_in_beat = true;
          appliedStat.style.color = '#3DAA6E';
          appliedStat.textContent = '✓ applied';
        }
      };

      btnRow.appendChild(studyBtn);
      btnRow.appendChild(askBtn);

      card.appendChild(phylumLabel);
      card.appendChild(conceptName);
      card.appendChild(statsRow);
      card.appendChild(btnRow);
      grid.appendChild(card);
    });
  },

});
/* ===END:knowledgeGap=== */

/* ===MODULE:taxonomyTree=== */
RPGACE.register('taxonomyTree', {

  PHYLUM_NAMES: {
    1:'Compositio',2:'Percussio',3:'Sonus Designatio',4:'Mixtura',5:'Magistra',
    6:'Instrumentarium',7:'Sensus Auris',8:'Anatomia',9:'Historia',10:'Psychologia',
    11:'Lingua Musicae',12:'Fons Educationis',13:'Contentum',14:'Visio Cinematica',
    15:'Collaboratio',16:'Venditionis Beatorum',17:'Negotium',18:'Distributio',
    19:'Referentia Mercati',20:'Technologia',21:'Miscellaneous Ordinanda'
  },

  PHYLUM_ENGLISH: {
    1:'Melody, Harmony, Chords',2:'Drums, 808s, Rhythm',3:'Sound Design, Synths, Sampling',
    4:'Mixing, EQ, Compression',5:'Mastering, Loudness',6:'FL Studio, VSTs, DAW Workflow',
    7:'Critical Listening, Reference',8:'Music Theory Fundamentals',9:'Producer History, Influences',
    10:'Creative Psychology, Flow',11:'Colour, Mood, Visual Language',12:'Tutorials, Learning Resources',
    13:'YouTube, Instagram, Content',14:'Visual Treatment, Filmmaking',15:'Collaboration, Outreach',
    16:'Beat Selling, Licensing',17:'Business, Operations',18:'Distribution, Release',
    19:'Market Reference, Trends',20:'Technology, Tools',21:'Miscellaneous'
  },

  // One-line role reminder per phylum — restated wherever a phylum shows up
  // with real context (Oracle prompts, review popups, taxonomy_map.html),
  // not just the terse number+name shown everywhere else.
  PHYLUM_PURPOSE: {
    1:'The core melodic/harmonic decisions that make a beat memorable — chord choices, melody writing, key/scale selection.',
    2:'The rhythmic foundation of a beat — drum programming, 808 patterns, groove and swing.',
    3:'Shaping and sourcing the actual sounds used — synth patches, sampling, layering, texture.',
    4:'Balancing and polishing individual elements so they sit together correctly before mastering.',
    5:'Final loudness/tonal polish and platform-ready export standards.',
    6:'The tools and technical workflow used to actually build a track — FL Studio techniques, plugin usage, efficiency.',
    7:'Training the ear — critical listening skills, reference-track comparison, spotting what\'s wrong.',
    8:'The underlying theory knowledge (scales, intervals, structure) the other Craft phyla draw on.',
    9:'Knowing the lineage of producers and records that shaped the genres being worked in.',
    10:'The mental/creative-process side of producing — flow state, motivation, creative blocks.',
    11:'Translating musical feel (key, scale, mood) into a visual/colour language for content and branding.',
    12:'External learning material — tutorials, courses, educators worth following.',
    13:'Content creation and posting strategy across platforms.',
    14:'The visual/cinematic direction for beat videos — directors, camera language, treatment docs.',
    15:'Finding and reaching out to artists/collaborators.',
    16:'Monetising beats — licensing terms, pricing, marketplace listings.',
    17:'The operational/business admin side of running this as a project.',
    18:'Getting finished work out onto platforms — release logistics and requirements.',
    19:'Tracking what\'s trending/working in the market right now.',
    20:'The broader tech/tooling stack outside the DAW itself.',
    21:'Deliberate catch-all for anything that doesn\'t fit elsewhere yet.',
  },

  // Larger-scope groupings of the 21 phyla, derived directly from the
  // PHYLUM_PURPOSE lines above (Craft phyla vs the Knowledge phyla they
  // draw on vs Visual identity vs Business/Distribution vs Tech/Misc).
  // Built July 17 so the phylum switcher can render as a grouped list
  // instead of one flat undifferentiated row - real UX gap found hand-
  // testing the nav tab with 10 phyla already live.
  PHYLUM_SCOPE_GROUPS: [
    { label: 'Craft & Production', phyla: [1, 2, 3, 4, 5, 6, 7] },
    { label: 'Knowledge & Mind', phyla: [8, 9, 10, 12] },
    { label: 'Visual & Creative Identity', phyla: [11, 14] },
    { label: 'Business & Distribution', phyla: [13, 15, 16, 17, 18, 19] },
    { label: 'Technology & Misc', phyla: [20, 21] },
  ],

  // Rank naming, by depth. This convention previously only existed as a
  // display-only array in taxonomy_map.html - Phylum Path is the first live
  // app feature that reasons about rank names, not just raw depth integers.
  RANK_NAMES: ['Phylum', 'Order', 'Class', 'Family', 'Genus', 'Species', 'Variant'],
  rankNameForDepth: function(depth) { return this.RANK_NAMES[depth] || ('Rank ' + depth); },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectManualButton(); }, 1300);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectManualButton(); }, 500);
      }
    });
  },

  // ── Manual trigger button ─────────────────────────────────────
  _injectManualButton: function() {
    if (document.getElementById('taxtree-manual-btn')) return;
    var self = this;
    var page = document.getElementById('page-research') || document.getElementById('page-learning');
    if (!page) return;

    var btn = document.createElement('button');
    btn.id = 'taxtree-manual-btn';
    btn.textContent = '🌳 Add to Taxonomy Tree';
    btn.style.cssText = 'padding:9px 18px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:16px;';
    btn.onclick = function() { self._openManualEntry(); };

    var anchor = document.getElementById('cp-idea-bank') || document.getElementById('beat-log-panel');
    if (anchor) anchor.parentElement.insertBefore(btn, anchor);
    else page.insertBefore(btn, page.firstChild);
  },

  _openManualEntry: function() {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.25);border-radius:12px;padding:24px 28px;width:min(520px,95vw);';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Taxonomy Tree · Manual Entry';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = 'What topic do you want to add?';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'e.g. 1-1-3-4 chord progression in natural minor';
    input.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:13px;padding:10px 12px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:14px;';

    var phylumSelect = document.createElement('select');
    phylumSelect.style.cssText = 'width:100%;background:#1a1a24;border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
    var blank = document.createElement('option'); blank.value=''; blank.textContent='— which phylum does this belong to? —';
    blank.style.color = '#E2E2EC'; blank.style.background = '#1a1a24';
    phylumSelect.appendChild(blank);
    Object.keys(self.PHYLUM_ENGLISH).forEach(function(num) {
      var opt = document.createElement('option');
      opt.value = num;
      opt.textContent = RPGACE.utils.phylumLabel(num);
      opt.style.color = '#E2E2EC'; opt.style.background = '#1a1a24';
      phylumSelect.appendChild(opt);
    });

    // Native content preview — shows what's already in the selected phylum
    var previewBox = document.createElement('div');
    previewBox.id = 'taxtree-phylum-preview';
    previewBox.style.cssText = 'display:none;background:rgba(155,89,182,0.05);border:1px solid rgba(155,89,182,0.15);border-radius:6px;padding:10px 12px;margin-bottom:16px;font-size:11px;color:rgba(226,226,236,0.55);';

    phylumSelect.onchange = function() {
      var num = parseInt(phylumSelect.value);
      if (!num) { previewBox.style.display = 'none'; return; }
      previewBox.style.display = 'block';
      previewBox.innerHTML = '<div style="color:rgba(155,89,182,0.7);font-weight:700;margin-bottom:4px;">Loading what already lives here...</div>';
      RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + num + '&order=created_at.desc&limit=5')
        .then(function(nodes) {
          nodes = nodes || [];
          if (nodes.length === 0) {
            previewBox.innerHTML = '<div style="color:rgba(226,226,236,0.35);">Nothing in this phylum yet — you would be first to add here. Examples of what belongs: <strong style="color:#9B59B6;">' + self.PHYLUM_ENGLISH[num] + '</strong></div>';
            return;
          }
          previewBox.innerHTML = '<div style="color:rgba(155,89,182,0.7);font-weight:700;margin-bottom:4px;">Already in ' + self.PHYLUM_ENGLISH[num] + ':</div>' +
            nodes.map(function(n) { return '• ' + n.name; }).join('<br>');
        }).catch(function() {
          previewBox.innerHTML = '<div style="color:rgba(226,226,236,0.3);">Could not load preview</div>';
        });
    };

    var genBtn = document.createElement('button');
    genBtn.textContent = '🌳 Propose Lineage';
    genBtn.style.cssText = 'padding:10px 20px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:8px;color:#9B59B6;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    genBtn.onclick = function() {
      var topic = input.value.trim();
      var phylum = parseInt(phylumSelect.value);
      if (!topic) { RPGACE.utils.toast('Add a topic first', '#E25454', 2000); return; }
      if (!phylum) { RPGACE.utils.toast('Select a phylum', '#E25454', 2000); return; }
      overlay.remove();
      self.proposeLineage(topic, phylum, 'manual', null);
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:8px;';
    cancelBtn.onclick = function() { overlay.remove(); };

    box.appendChild(eyebrow); box.appendChild(title);
    box.appendChild(input); box.appendChild(phylumSelect);
    box.appendChild(previewBox);
    box.appendChild(genBtn); box.appendChild(cancelBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();
  },

  // ── Cheap pre-check: does this phylum's keyword set actually overlap  ──
  // ── the text at all? Uses the FREE Layer 1 scan already computed —    ──
  // ── prevents wasting an Oracle API call generating a mismatch notice. ──
  isPlausiblePhylum: function(text, phylumNumber) {
    // F2: reads from the shared RPGACE.utils.phylaKeywordScore(), same
    // scoring function the badge scan uses - one source of truth, can't drift.
    // F8: threshold now lives on RPGACE.utils.PHYLA_MATCH_THRESHOLD (weighted
    // score, not raw hit count) so this can't drift out of sync with
    // _quickPhylaScan's bar the way the old two-hardcoded-"2"s did.
    if (!RPGACE.utils.phylaKeywordScore) return true; // fail open if scorer unavailable
    return RPGACE.utils.phylaKeywordScore(text, phylumNumber) >= (RPGACE.utils.PHYLA_MATCH_THRESHOLD || 3);
  },

  // ── Extract named node candidates from an Oracle response ──────────
  // ── Looks for bullet-point items with a bold/named lead-in — Oracle    ──
  // ── frequently writes exactly this pattern when suggesting topics      ──
  // ── ("• The Major Scale & Interval Structure (tones/semitones...)").   ──
  // ── If found, these become the ACTUAL proposal topics instead of a     ──
  // ── vague blob slice of the whole response.                           ──
  extractNamedTopics: function(text, phylumNumber) {
    var phylumName = self.PHYLUM_NAMES ? self.PHYLUM_NAMES[phylumNumber] : null;
    var lines = text.split('\n');
    var candidates = [];
    var inRelevantSection = !phylumName; // if we don't know the name, scan everything

    lines.forEach(function(line) {
      var trimmed = line.trim();
      // Detect a section header naming this phylum's English or Latin name
      if (phylumName && trimmed.length < 80) {
        var lower = trimmed.toLowerCase();
        if (lower.includes(phylumName.toLowerCase())) { inRelevantSection = true; return; }
        // A new bolded header that ISN'T this phylum likely ends the section
        if (/^[•\-\*]/.test(trimmed) === false && trimmed.length > 10 && /^[A-Z]/.test(trimmed) && inRelevantSection) {
          // heuristic: heading-like line with no bullet, treat as new section boundary
        }
      }
      // Bullet items: "• Name Here (parenthetical description)"
      var bulletMatch = trimmed.match(/^[•\-\*]\s*(.+)/);
      if (bulletMatch && inRelevantSection) {
        var itemText = bulletMatch[1];
        // Strip trailing parenthetical for the "name" but keep full text as context
        var nameOnly = itemText.split('(')[0].trim();
        if (nameOnly.length > 3 && nameOnly.length < 90) {
          candidates.push({ name: nameOnly, fullText: itemText });
        }
      }
    });

    return candidates;
  },

  // ── Picker shown when Oracle's response contains multiple named nodes ──
  // ── for one phylum — lets user pick which specific ones to propose,   ──
  // ── instead of collapsing them all into one vague blob topic.          ──
  _showNamedTopicPicker: function(candidates, phylumNumber) {
    var self = this;
    var phylumName = self.PHYLUM_NAMES[phylumNumber] || '';
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(520px,95vw);max-height:80vh;overflow-y:auto;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Oracle already named these — pick which to propose';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = phylumName + ' — ' + candidates.length + ' named nodes found';
    box.appendChild(eyebrow); box.appendChild(title);

    candidates.forEach(function(c, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'named-topic-' + i; cb.checked = true;
      cb.style.cssText = 'margin-top:3px;flex-shrink:0;';
      var label = document.createElement('div');
      label.innerHTML = '<div style="font-size:12px;font-weight:600;color:#E2E2EC;">' + c.name + '</div>' +
        '<div style="font-size:10px;color:rgba(226,226,236,0.35);margin-top:2px;">' + c.fullText.slice(0, 100) + '</div>';
      row.appendChild(cb); row.appendChild(label);
      box.appendChild(row);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var proceedBtn = document.createElement('button');
    proceedBtn.textContent = '🌳 Propose selected';
    proceedBtn.style.cssText = 'flex:1;padding:10px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    proceedBtn.onclick = function() {
      var selected = candidates.filter(function(c, i) {
        var cb = document.getElementById('named-topic-' + i);
        return cb && cb.checked;
      });
      overlay.remove();
      // Propose each selected item as its own separate lineage, sequentially
      selected.forEach(function(c) {
        self.proposeLineage(c.fullText, phylumNumber, 'oracle', null);
      });
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(proceedBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Core: propose a lineage for any topic, from any source ────────
  // sourceType: 'manual' | 'oracle' | 'content_intelligence' | 'encyclopedia'
  // July 15, "old feeds new": this function used to be the only decision-
  // maker for every trigger source, and its flat top-down generation has
  // no real structural awareness (_checkForMorph only catches exact name
  // matches) - confirmed live to create duplicate/overlapping branches
  // (a whole new "Harmony & Chord Theory" Order sitting beside the
  // existing "Harmony" Order for near-identical content). For any phylum
  // phylumPath has taken over, delegate the actual placement DECISION to
  // its structure-aware 5-check reasoning instead - this function's job
  // becomes "how did the insight get here," not "where does it go."
  // UNIFIED July 19 (Fable audit): the old flat-prompt body that lived
  // here is deleted, not just bypassed. Real evidence from the tree audit:
  // it produced literal VIDEO TITLES as leaf names ("How to Make a Jazz
  // Sampled Type Beat for Nemzzz, Knucks & Hurricane Wisdom | FL Studio
  // Tutorial", two beat-selling chains with "(2022)"/"(2025)" in the
  // node names), invented parallel one-off branch chains per video with
  // zero fit-challenge (the phylum was pre-assumed), no confidence score,
  // and no stored justification - measurably the worst of the three
  // placement pipelines that existed. ALL placement decisions now go
  // through phylumPath.decidePlacementScored (one engine, one prompt,
  // one call - also cheaper than this path's 800-token flat call plus
  // decidePlacement's old extractor+worker two-call chain). The enabled-
  // phyla gate is gone too: the scored engine is structure-aware for any
  // phylum, including a completely empty one.
  proposeLineage: function(topicText, phylumNumber, sourceType, sourceId) {
    return this._proposeLineageViaPhylumPath(topicText, phylumNumber, sourceType, sourceId);
  },

  // ── Interactive placement via Phylum Path's structure-aware engine ──
  // Same external behavior as the old proposeLineage() from the caller's
  // point of view (fires, shows a confirm UI, writes on accept) - just a
  // smarter decision underneath, and a lighter confirm popup than the
  // old full-path editor since Phylum Path only ever appends below an
  // attach point.
  _proposeLineageViaPhylumPath: function(topicText, phylumNumber, sourceType, sourceId) {
    var pp = RPGACE.modules.phylumPath;
    RPGACE.utils.toast('🧬 Deciding placement (Phylum Path)...', '#3DAA6E', 2500);
    return pp.decidePlacement(topicText, phylumNumber).then(function(decision) {
      pp._showPlacementConfirm(phylumNumber, decision.attachNode, decision.newSteps, decision.explainers, topicText,
        function(finalSteps, finalExplainers) {
          pp._insertNewSteps(phylumNumber, decision.attachNode, finalSteps, finalExplainers, topicText);
        }
      );
    }).catch(function(err) {
      RPGACE.utils.toast('Error generating placement: ' + err.message, '#E25454', 3500);
    });
  },

  // ── F4/F5: silent sibling of proposeLineage() — same Oracle-generated  ──
  // ── lineage, but queues it into taxonomy_proposals for later batch      ──
  // ── review (F6's Dashboard queue) instead of opening the accept popup   ──
  // ── immediately. Used by unattended triggers (Content Intelligence      ──
  // ── pipeline completion, Encyclopedia sync) that must not block on a    ──
  // ── human decision mid-pipeline.                                       ──
  // UNIFIED July 19 (Fable audit): same deletion + reasoning as
  // proposeLineage above - the old flat body here was the SILENT variant
  // of the same worst-of-three pipeline (video-title leaves, pre-assumed
  // phylum fit, no score, no justification), and being silent made it
  // more dangerous, not less: its garbage only surfaced at review time,
  // titled exactly like a plausible proposal. All decisions now flow
  // through phylumPath.decidePlacementScored via the ViaPhylumPath
  // variant below, for every phylum.
  // Note on error handling, carried over: deliberately no .catch() here -
  // errors propagate to the caller. ciAutoPropose/encSync's batch scans
  // swallow per-item failures on purpose; encTaxonomyLink's per-entry
  // button attaches its own .catch() for real user feedback.
  silentPropose: function(topicText, phylumNumber, sourceType, sourceId) {
    return this._silentProposeViaPhylumPath(topicText, phylumNumber, sourceType, sourceId);
  },

  // ── Silent placement via Phylum Path's structure-aware engine ──────
  // Same queue-not-block contract as silentPropose() - writes into the
  // SAME taxonomy_proposals table so F6's existing Dashboard review queue
  // is still the one place all of this surfaces for review, just tagged
  // so taxonomyReviewQueue knows to render the lighter Phylum Path confirm
  // view (attach point + appended steps) instead of the old full-path
  // editor when the row's engine is 'phylum_path'.
  _silentProposeViaPhylumPath: function(topicText, phylumNumber, sourceType, sourceId) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;
    return pp.decidePlacement(topicText, phylumNumber).then(function(decision) {
      var phylumName = self.PHYLUM_NAMES[phylumNumber] || 'Unknown';
      var base = decision.attachNode ? decision.attachNode.path : phylumName;
      var previewPath = base + (decision.newSteps.length ? '/' + decision.newSteps.join('/') : '');
      return RPGACE.sb.insert('taxonomy_proposals', {
        source_type: sourceType,
        source_id: sourceId,
        proposed_path: previewPath.replace(/\//g, ' → '),
        proposed_steps: {
          engine: 'phylum_path',
          attachToId: decision.attachNode ? decision.attachNode.id : null,
          newSteps: decision.newSteps,
          explainers: decision.explainers,
          insightText: topicText,
          // July 19: the scored engine's reasoning now rides along so the
          // review queue can SHOW it - previously the decision used the
          // score internally but threw the evidence away before review.
          justification: decision.justification || '',
          confidenceScore: decision.confidenceScore || 0,
        },
        phylum_number: phylumNumber,
        matched_existing_node_id: decision.attachNode ? decision.attachNode.id : null,
      });
    });
    // Same no-.catch() contract as silentPropose() above - errors
    // propagate to the caller's own error handling.
  },

  // ── Check if any step in the proposed path already exists ────────
  // ── Now also detects if the NEW leaf's explainer is meaningfully      ──
  // ── different/better-written than an existing matching leaf, and      ──
  // ── offers to UPDATE the existing node's content instead of just      ──
  // ── warning about duplication.                                        ──
  _checkForMorph: function(phylumNumber, path, callback) {
    RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=depth.asc')
      .then(function(existing) {
        existing = existing || [];
        var matched = null;
        var exactLeafMatch = null;
        var lastStepName = path[path.length - 1];

        path.forEach(function(stepName) {
          var found = existing.find(function(n) {
            return n.name.toLowerCase().trim() === stepName.toLowerCase().trim();
          });
          if (found && !matched) matched = found;
        });

        // Check specifically if the LEAF matches an existing leaf — this is the
        // "duplicate insight" case, distinct from "shares a parent grouping" case
        exactLeafMatch = existing.find(function(n) {
          return n.node_type === 'leaf' && n.name.toLowerCase().trim() === lastStepName.toLowerCase().trim();
        });

        callback(matched, exactLeafMatch);
      }).catch(function() { callback(null, null); });
  },

  // ── Update an existing node's content with a better-written version ──
  _updateExistingNode: function(existingNode, proposal) {
    var self = this;
    RPGACE.utils.toast('🔄 Updating existing node with improved content...', '#3DAA6E', 2500);
    var newExplainer = proposal.explainers[proposal.explainers.length - 1] || existingNode.explainer;

    fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_tree?id=eq.' + existingNode.id, {
      method: 'PATCH',
      headers: {
        'apikey': RPGACE.CONFIG.supabase.key,
        'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ explainer: newExplainer, updated_at: new Date().toISOString() })
    }).then(function() {
      RPGACE.utils.toast('✅ Node updated: ' + existingNode.name, '#3DAA6E', 3000);
      self._generateNodeContent(existingNode);
    }).catch(function(e) {
      RPGACE.utils.toast('Error updating node: ' + e.message, '#E25454', 3000);
    });
  },

  // ── The accept/edit/reject/morph popup ────────────────────────────
  _showProposalPopup: function(proposal) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:85vh;overflow-y:auto;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Proposed Taxonomy Lineage · ' + proposal.sourceType;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    title.textContent = RPGACE.utils.phylumLabel(proposal.phylumNumber);
    var purposeLine = document.createElement('div');
    purposeLine.style.cssText = 'font-size:10.5px;color:rgba(226,226,236,0.4);margin-bottom:14px;line-height:1.5;';
    purposeLine.textContent = (self.PHYLUM_PURPOSE && self.PHYLUM_PURPOSE[proposal.phylumNumber]) || '';
    box.appendChild(eyebrow); box.appendChild(title); box.appendChild(purposeLine);

    // Insight summary — what the underlying content actually IS, so the lineage
    // isn't a guessing game. Reuses the leaf's own Oracle-generated explainer,
    // no new API call, keeps the "AI cost confined to 2 touchpoints" rule intact.
    if (proposal.explainers && proposal.explainers.length) {
      var insightSummary = document.createElement('div');
      insightSummary.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);line-height:1.6;margin-bottom:14px;padding:10px 12px;background:rgba(155,89,182,0.04);border-left:2px solid rgba(155,89,182,0.3);border-radius:0 6px 6px 0;';
      var leafSummary = proposal.explainers[proposal.explainers.length - 1] || '';
      insightSummary.innerHTML = '<strong style="color:rgba(226,226,236,0.7);">What this insight is:</strong> ' + leafSummary;
      box.appendChild(insightSummary);
    }

    if (proposal.morphMatch) {
      var morphNote = document.createElement('div');
      if (proposal.suggestUpdate) {
        morphNote.style.cssText = 'background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#3DAA6E;';
        morphNote.innerHTML = '🔄 This exact leaf already exists: "<strong>' + proposal.morphMatch.name + '</strong>". This proposal looks like a refinement — accepting will <strong>update the existing node\'s content</strong> instead of creating a duplicate.';
      } else {
        morphNote.style.cssText = 'background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#E25454;';
        morphNote.innerHTML = '⚠️ A node named "<strong>' + proposal.morphMatch.name + '</strong>" already exists in this phylum. Consider attaching under it instead of creating a duplicate branch.';
      }
      box.appendChild(morphNote);
    }

    var stepsContainer = document.createElement('div');
    stepsContainer.id = 'taxtree-steps-editor';
    stepsContainer.style.cssText = 'margin-bottom:16px;';

    function renderSteps() {
      stepsContainer.innerHTML = '';
      proposal.path.forEach(function(step, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;';
        var depthLabel = document.createElement('span');
        depthLabel.style.cssText = 'font-size:9px;color:rgba(155,89,182,0.5);flex-shrink:0;min-width:16px;';
        depthLabel.textContent = (i + 1) + '.';
        var stepInput = document.createElement('input');
        stepInput.type = 'text';
        stepInput.value = step;
        stepInput.style.cssText = 'flex:1;background:none;border:none;color:#E2E2EC;font-size:12px;font-family:Rajdhani,sans-serif;outline:none;';
        stepInput.oninput = function() { proposal.path[i] = stepInput.value; if (typeof renderSummary === 'function') renderSummary(); updatePreview(); };
        var delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.5);cursor:pointer;font-size:14px;flex-shrink:0;';
        delBtn.onclick = function() {
          proposal.path.splice(i, 1);
          proposal.explainers.splice(i, 1);
          renderSteps();
          if (typeof renderSummary === 'function') renderSummary();
          updatePreview();
        };
        row.appendChild(depthLabel); row.appendChild(stepInput); row.appendChild(delBtn);
        stepsContainer.appendChild(row);
      });

      var addStepBtn = document.createElement('button');
      addStepBtn.textContent = '+ Insert step';
      addStepBtn.style.cssText = 'padding:5px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.35);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      addStepBtn.onclick = function() {
        proposal.path.push('New step');
        proposal.explainers.push('');
        renderSteps();
        if (typeof renderSummary === 'function') renderSummary();
        updatePreview();
      };
      stepsContainer.appendChild(addStepBtn);
    }
    renderSteps();
    box.appendChild(stepsContainer);

    // Restored: this was referenced (renderSteps calls it on every edit) but
    // had no definition anywhere in this function - dead calls found July 8.
    var summaryLabel = document.createElement('div');
    summaryLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(155,89,182,0.5);margin-bottom:6px;';
    summaryLabel.textContent = 'What each step means';
    box.appendChild(summaryLabel);

    var summaryBox = document.createElement('div');
    summaryBox.style.cssText = 'max-height:180px;overflow-y:auto;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;margin-bottom:16px;';

    function renderSummary() {
      summaryBox.innerHTML = '';
      proposal.path.forEach(function(stepName, i) {
        var isLeaf = (i === proposal.path.length - 1);
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:10px;padding-bottom:10px;' + (i < proposal.path.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.05);' : '');
        var nameLine = document.createElement('div');
        nameLine.style.cssText = 'font-size:11px;font-weight:700;color:' + (isLeaf ? '#3DAA6E' : '#E2E2EC') + ';';
        nameLine.textContent = (isLeaf ? '🎯 ' : '📁 ') + stepName;
        row.appendChild(nameLine);
        var explainerText = proposal.explainers[i];
        if (explainerText) {
          var explLine = document.createElement('div');
          explLine.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.5);margin-top:3px;line-height:1.5;padding-left:' + (i * 10) + 'px;';
          explLine.textContent = explainerText;
          row.appendChild(explLine);
        }
        summaryBox.appendChild(row);
      });
    }
    renderSummary();
    box.appendChild(summaryBox);

    var pathPreview = document.createElement('div');
    pathPreview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:16px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;';
    function updatePreview() {
      pathPreview.textContent = proposal.phylumName + ' → ' + proposal.path.join(' → ');
    }
    updatePreview();
    box.appendChild(pathPreview);

    // No mismatch-notice path — implausible phyla are filtered out BEFORE
    // this popup can ever open (isPlausiblePhylum pre-check gates the propose
    // button itself in rpgace_core.js's badge panel, zero API cost).
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = proposal.suggestUpdate ? '✓ Update Existing Node' : '✓ Accept & Generate Content';
    acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    acceptBtn.onclick = function() {
      updatePreview();
      overlay.remove();
      if (proposal.suggestUpdate && proposal.morphMatch) {
        self._updateExistingNode(proposal.morphMatch, proposal);
      } else {
        self._acceptLineage(proposal);
      }
    };

    var rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#E25454;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    rejectBtn.onclick = function() { overlay.remove(); };

    btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Write accepted lineage into taxonomy_tree, generate content ──
  _acceptLineage: function(proposal) {
    var self = this;
    RPGACE.utils.toast('🌳 Writing lineage + generating content...', '#3DAA6E', 3000);

    var parentId = null;
    var pathSoFar = proposal.phylumName;
    var chain = Promise.resolve();

    proposal.path.forEach(function(stepName, i) {
      chain = chain.then(function() {
        pathSoFar += '/' + stepName;
        var isLeaf = (i === proposal.path.length - 1);
        var currentPath = pathSoFar;
        var currentParent = parentId;

        // Needs the inserted row's real id back to chain parent_id correctly on
        // the next step - RPGACE.sb.insert() defaults to Prefer:return=minimal
        // (empty body), which silently broke this into a flat set of orphan
        // nodes (parent_id always null) for any path longer than one step.
        return fetch(RPGACE.sb.url('taxonomy_tree'), {
          method: 'POST',
          headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
          body: JSON.stringify({
            parent_id: currentParent,
            depth: i + 1,
            name: stepName,
            latin_name: null,
            phylum_number: proposal.phylumNumber,
            path: currentPath,
            node_type: isLeaf ? 'leaf' : 'branch',
            explainer: proposal.explainers[i] || '',
            sources: [{ type: proposal.sourceType, id: proposal.sourceId }],
          }),
        }).then(function(r) { return r.json(); }).then(function(result) {
          var row = Array.isArray(result) ? result[0] : result;
          if (row && row.id) parentId = row.id;
          if (isLeaf && row) {
            self._generateNodeContent(row);
            // F7: Encyclopedia-sourced proposals need a two-table write on
            // accept, not just the taxonomy_tree insert every other source
            // uses - back-reference the leaf onto the originating entry so
            // its card can show "already linked" instead of the propose
            // button re-offering the same entry indefinitely.
            if (proposal.sourceType === 'encyclopedia' && proposal.sourceId) {
              RPGACE.sb.update('encyclopedia', 'id=eq.' + proposal.sourceId, { taxonomy_node_id: row.id }).catch(function() {});
            }
          }
        });
      });
    });

    chain.then(function() {
      RPGACE.utils.toast('✅ Taxonomy lineage saved: ' + pathSoFar, '#3DAA6E', 4000);
      // F6: if this lineage came from the review queue, close the loop on
      // the taxonomy_proposals row it originated from.
      if (proposal.queuedProposalId) {
        RPGACE.sb.update('taxonomy_proposals', 'id=eq.' + proposal.queuedProposalId,
          { status: 'accepted', reviewed_at: new Date().toISOString() }).catch(function() {});
      }
    }).catch(function(e) {
      RPGACE.utils.toast('Error saving lineage: ' + e.message, '#E25454', 3500);
    });
  },

  // ── Generation template — merged tutor + expert prompt ────────────
  // Trimmed July 14: real Phylum 1 data showed deep_content empty on every
  // single leaf despite this function supposedly populating it. Best-
  // supported theory (not empirically confirmed - no live browser access
  // this session): this is the same already-documented Oracle 504 timeout
  // on long structured responses, just manifesting silently here (this
  // call is fire-and-forget, its .catch() only console.warns) instead of
  // visibly in chat. The original prompt asked for 5 sections in one 1500-
  // token call; sections 3-5 (spaced-repetition blueprint, stages/
  // resources, practice assignment) overlap with what feynman's loop and
  // prodOraclePanel's own commands already cover elsewhere, so cut down to
  // the 2 sections that are actually this column's unique job - if this
  // doesn't fully fix it, the timeout needs its own dedicated pass
  // (streaming, or splitting into 2 sequential calls), not another blind
  // prompt trim.
  _generateNodeContent: function(node) {
    var prompt = 'You are a neuro-optimized tutor AND a world-class expert in "' + node.name + '".\n\n' +
      'Context: this is a node in a music production taxonomy tree, path: ' + node.path + '. ' +
      'This is for FL Studio / UK hip hop production, aspiring producers 18-35.\n\n' +
      'Give me, on "' + node.name + '" specifically:\n\n' +
      '1. WHAT THIS IS — clear explainer of ' + node.name + ' as a concept\n' +
      '2. THE ACTUAL TECHNICAL CONTENT — since this is a specific leaf topic, give me the real, specific information (exact notes/settings/techniques/chord identities as relevant), not general theory\n\n' +
      'Be specific and technical, but concise — this is a reference entry, not a full course.';

    fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: '',
        max_tokens: 900
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var text = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      return fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_tree?id=eq.' + node.id, {
        method: 'PATCH',
        headers: {
          'apikey': RPGACE.CONFIG.supabase.key,
          'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ deep_content: { generated: text, generated_at: new Date().toISOString() } })
      });
    })
    .then(function() {
      console.log('[taxonomyTree] Content generated for node:', node.name);
    })
    .catch(function(e) {
      console.warn('[taxonomyTree] Content generation failed:', e.message);
    });
  },

});
/* ===END:taxonomyTree=== */

/* ===MODULE:phylumPath=== */
// "Phylum Path" - bottom-up insight-to-article pipeline. Distinct from
// taxonomyTree.proposeLineage/silentPropose (which places one topic into a
// path FROM a phylum DOWN to a leaf, in one shot). This instead starts from
// a granular teaching insight and builds UP: the insight anchors at the
// deepest rank it needs, attaching under existing structure where possible
// (same exact-path-matching idea as taxonomyTree._checkForMorph, just
// applied per-rank instead of per-leaf), and any rank along the way can get
// its own synthesized reference article in Encyclopedia (reuses
// saveOracleToEncyclopedia + taxonomy_node_id linking, same as F7's
// encTaxonomyLink).
//
// Piloted on Phylum 1 (Compositio), joined by Phylum 2 (Percussio) July 17
// once its keyword sweep + tree build were done - ENABLED_PHYLA is the
// list to extend as more phyla clear the Phylum Development Framework's
// steps 1-4. PHYLUM_NUM is now the UI's *currently active/selected*
// phylum (mutable via the phylum-switcher pills in both the side panel
// and the nav-tab page), not a hardcoded pilot constant - every function
// below already took phylumNumber as a parameter rather than hardcoding
// it, so generalizing was a UI change (a switcher + a wider enabled-list
// check), not a rewrite.
//
// Persona: extends Prod Oracle's existing "Master Learning" 3-layer method
// (simple terms -> technical mechanics -> expert nuance) with a "private
// tutor, PhD in this phylum" framing, grounded via
// RPGACE.utils.phylumContext() - reused prompt shape, not reinvented.
//
// Depth flexes per insight (as many or as few new ranks as genuinely
// needed, same philosophy as proposeLineage), decided by an explicit
// 5-perspective check embedded in the placement prompt (pedagogical
// clarity / non-redundancy / practical applicability / structural fit /
// expansion headroom) - the phylum-appropriate version of this project's
// Council of 5 convention, operationalized as a real prompt instruction
// instead of only a human planning ritual.
//
// Scoped per the questionnaire: new insights only (no retroactive repair
// of Phylum 1's pre-existing flat-parent_id nodes); manual button triggers
// article regeneration (no auto-regen); every rank gets its own article,
// including the phylum root itself.
RPGACE.register('phylumPath', {

  // Currently active/selected phylum for the panel + nav-tab UI - mutable
  // at runtime via _switchPhylum(), defaults to Phylum 1 on first load.
  PHYLUM_NUM: 1,

  // Every phylum Phylum Path actually covers (placement, auto-detect,
  // nav-tab browsing, fusion-link search). Extend this list once a phylum
  // clears framework steps 1-4 (spec, keyword sweep, tree build, data
  // repair) - phyla 2-5 added July 17 individually, phyla 6-10
  // (Instrumentarium, Sensus Auris, Anatomia, Historia, Psychologia)
  // added the same day as one batch, pushed live together.
  ENABLED_PHYLA: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],

  // July 15: "old feeds new" unification - taxonomyTree.proposeLineage()/
  // silentPropose() check this before running their own flat top-down
  // path-generation, and delegate to decidePlacement()/_insertNewSteps()
  // below instead when the target phylum is enabled here.
  isEnabled: function(phylumNumber) { return this.ENABLED_PHYLA.indexOf(phylumNumber) !== -1; },

  // Switches the active phylum and re-renders whichever Phylum Path UI
  // surface is currently mounted (side panel or nav-tab page) - both read
  // self.PHYLUM_NUM dynamically already, so this is just: update the
  // constant, refresh whichever labels were set at initial render, then
  // re-fetch. Silently no-ops for a phylum that isn't enabled.
  // focusId is optional - when a caller already knows which node it wants
  // to land on after the switch (e.g. _jumpToNode() following a fusion
  // link across phyla), pass it through here so the nav-tab page loads
  // straight to that node instead of the phylum root, avoiding a wasted
  // extra fetch/race between two _loadNodesAndRender calls.
  _switchPhylum: function(num, focusId) {
    if (!this.isEnabled(num) || this.PHYLUM_NUM === num) return;
    this.PHYLUM_NUM = num;

    var panel = document.getElementById('phylum-path-panel');
    if (panel) {
      var sub = panel.querySelector('.pp-panel-sub');
      if (sub) sub.textContent = RPGACE.utils.phylumLabel(num);
      var purpose = panel.querySelector('.pp-panel-purpose');
      if (purpose) purpose.textContent = RPGACE.utils.phylumContext(num);
      var textarea = document.getElementById('phylum-path-input');
      var tt0 = RPGACE.modules.taxonomyTree;
      if (textarea) textarea.placeholder = 'Paste or describe a specific teaching insight - a fact, technique, or observation about ' + (tt0 ? tt0.PHYLUM_NAMES[num] : 'this phylum') + '...';
      panel.querySelectorAll('.pp-switch-pill').forEach(function(p) {
        var active = (parseInt(p.dataset.num, 10) === num);
        p.style.opacity = active ? '1' : '0.65';
        p.style.background = active ? 'rgba(61,170,110,0.14)' : 'rgba(255,255,255,0.02)';
        p.style.borderColor = active ? 'rgba(61,170,110,0.4)' : 'rgba(61,170,110,0.15)';
      });
      this._renderTree();
    }

    var pageTitle = document.getElementById('pp-phylum-title');
    if (pageTitle) pageTitle.textContent = '🧬 Phylum Path — ' + RPGACE.utils.phylumLabel(num);
    var pageSwitcher = document.getElementById('pp-phylum-switcher');
    if (pageSwitcher) {
      pageSwitcher.querySelectorAll('.pp-switch-pill').forEach(function(p) {
        var active = (parseInt(p.dataset.num, 10) === num);
        p.style.opacity = active ? '1' : '0.65';
        p.style.background = active ? 'rgba(61,170,110,0.14)' : 'rgba(255,255,255,0.02)';
        p.style.borderColor = active ? 'rgba(61,170,110,0.4)' : 'rgba(61,170,110,0.15)';
      });
      // Only re-fetch the drill-down view if it's the actually-visible
      // page - avoids a wasted background Supabase call when the switch
      // came from the side panel instead (the nav-tab page div persists
      // in the DOM once injected, whether visible or not).
      var page = document.getElementById('page-' + RPGACE.CONFIG.pages.phylumPath);
      if (page && page.classList.contains('active')) this._loadNodesAndRender(focusId || null);
    }
  },

  // Builds the shared phylum-switcher (one row per ENABLED_PHYLA entry,
  // grouped under PHYLUM_SCOPE_GROUPS headers) - used identically by the
  // side panel and the nav-tab page so there's one switcher implementation,
  // not two. Rewritten July 17 from a flat wrap of pills (cramped once 10
  // phyla were live, no grouping, small tap targets) into a vertical
  // grouped list - bigger clickable rows, grouped by larger scope so the
  // full 21-phylum future doesn't just become one long undifferentiated
  // row of pills either.
  _renderPhylumSwitcher: function() {
    var self = this;
    var tt = RPGACE.modules.taxonomyTree;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:12px;';
    var groups = (tt && tt.PHYLUM_SCOPE_GROUPS) ? tt.PHYLUM_SCOPE_GROUPS : [{ label: 'Phyla', phyla: this.ENABLED_PHYLA }];
    groups.forEach(function(group) {
      var enabledInGroup = group.phyla.filter(function(n) { return self.isEnabled(n); });
      if (!enabledInGroup.length) return;
      var lbl = document.createElement('div');
      lbl.textContent = group.label;
      lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin:10px 0 4px;';
      wrap.appendChild(lbl);
      enabledInGroup.forEach(function(num) {
        var active = (num === self.PHYLUM_NUM);
        var row = document.createElement('button');
        row.className = 'pp-switch-pill';
        row.dataset.num = num;
        row.style.cssText = 'display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:4px;background:' + (active ? 'rgba(61,170,110,0.14)' : 'rgba(255,255,255,0.02)') + ';border:1px solid rgba(61,170,110,' + (active ? '0.4' : '0.15') + ');border-radius:7px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;opacity:' + (active ? '1' : '0.65') + ';';
        var nameEl = document.createElement('div');
        nameEl.textContent = tt ? tt.PHYLUM_NAMES[num] : ('Phylum ' + num);
        var glossEl = document.createElement('div');
        glossEl.textContent = tt ? (tt.PHYLUM_ENGLISH[num] || '') : '';
        glossEl.style.cssText = 'font-size:10px;font-weight:400;color:rgba(226,226,236,0.4);margin-top:1px;';
        row.appendChild(nameEl); row.appendChild(glossEl);
        row.onclick = function() { self._switchPhylum(num); };
        wrap.appendChild(row);
      });
    });
    return wrap;
  },

  // ══════════════════════════════════════════════════════════════════
  // July 16: extractor -> ground-worker pipeline for all 3 of Phylum
  // Path's Oracle calls (decidePlacement, _generateInsightContent,
  // _generateArticle). A fast/cheap Fable 5 pass produces a structured
  // plan/outline first; the existing verified-working model (still
  // claude-sonnet-4-6, the ground worker) does the actual detailed
  // reasoning/writing, using that plan as a starting hint it can
  // expand or override, not a locked-in answer. If the extractor call
  // fails or times out, each caller falls back to the ground worker
  // alone with the original single-call prompt - the extractor is a
  // pure quality/framing addition, never a hard dependency.
  // ══════════════════════════════════════════════════════════════════
  EXTRACTOR_MODEL: 'claude-fable-5',

  _callExtractor: function(prompt, maxTokens) {
    return fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You return only valid JSON, no markdown formatting, no explanation text.',
        max_tokens: maxTokens,
        model: this.EXTRACTOR_MODEL,
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      var cleaned = raw.replace(/```json|```/g, '').trim();
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in extractor response');
      return JSON.parse(match[0]);
    });
  },

  // Third model tier, added July 19 with Alex's explicit confirmation
  // (token-cost retune): purely MECHANICAL text jobs - whitespace/
  // formatting cleanup, one-line rewording - go to Haiku at ~1/4 the
  // ground worker's price. Judgment work (placement, scoring, teaching,
  // fusion) stays on the ground worker; outlining stays on the extractor.
  // CLAUDE.md's model section documents all three.
  MECHANICAL_MODEL: 'claude-haiku-4-5-20251001',

  // Ground worker calls omit `model` entirely - api/oracle.js defaults to
  // the existing verified-working MODEL constant when none is given. The
  // optional `model` param (July 19) lets mechanical callers pass
  // MECHANICAL_MODEL; api/oracle.js forwards it as-is.
  _callGroundWorkerJSON: function(prompt, maxTokens, model) {
    return fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You return only valid JSON, no markdown formatting, no explanation text.',
        max_tokens: maxTokens,
        model: model || undefined,
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      var cleaned = raw.replace(/```json|```/g, '').trim();
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in Oracle response');
      return JSON.parse(match[0]);
    });
  },

  _callGroundWorkerText: function(prompt, maxTokens, model) {
    return fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        model: model || undefined,
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      return (data.content || []).map(function(c) { return c.text || ''; }).join('');
    });
  },

  init: function() {
    var self = this;
    // Found + fixed July 16: init() only ever runs because 'rpgace:ready'
    // already fired - RPGACE.register() wires every module's init() to
    // that same event (rpgace_core.js ~line 415). Re-subscribing to
    // 'rpgace:ready' from INSIDE init() (as this used to do, twice) is a
    // latent reliability bug: RPGACE.hooks.fire() iterates listeners via
    // a plain Array.forEach, which never revisits entries pushed onto the
    // array after iteration starts - so a listener registered here could
    // silently never fire on the very pass currently invoking init().
    // Confirmed via direct testing: manually re-firing 'rpgace:ready' a
    // second time made both this button and the new nav tab (below)
    // appear instantly, which is what exposed this. Calling directly
    // instead, since 'rpgace:ready' has unambiguously already happened by
    // the time this code runs. Same pattern found in ~25 other places in
    // this file - flagged in the plan doc, not fixed everywhere this pass.
    setTimeout(function() { self._injectButton(); }, 1500);
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._injectButton(); }, 600);
      if (name === RPGACE.CONFIG.pages.phylumPath) self._loadNodesAndRender(self._focusNodeId);
    });
    // Subscribes to the shared oracle:response-scanned hook instead of
    // installing a second MutationObserver on #send-btn - the original
    // version of this module did exactly that (duplicate observer +
    // duplicate chat-DOM query on every single Oracle response, forever),
    // found and fixed same-session. RPGACE.utils._runPhylaScan already
    // computes `matches` for all 21 phyla on every response; this just
    // reads phylum 1's score back out of that instead of re-scoring.
    RPGACE.hooks.on('oracle:response-scanned', function(text, lastMsg, matches) {
      self._checkLastResponse(text, lastMsg, matches);
    });
    self._patchTextSelect();
    // Phase 2 (July 15): dedicated nav tab + full drill-down page.
    setTimeout(function() { self._injectNavTab(); self._injectPageShell(); }, 1500);
  },

  // ── Highlight-any-text entry point ──────────────────────────────────
  // July 15: reuses main.js's existing native #text-select-popup (the
  // "🔍 Identify" popup that already appears over Oracle chat + Encyclopedia
  // text on selection) instead of building a second selection listener -
  // same exact pattern conidPot._patchTextSelect() already established for
  // its "💡 Save as Idea" button, just a different appended button and its
  // own dataset flag so both patches can coexist on the same popup without
  // re-patching each other.
  _patchTextSelect: function() {
    var self = this;
    var obs = new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          var popup = node.id === 'text-select-popup' ? node :
                      node.querySelector && node.querySelector('#text-select-popup');
          if (!popup) return;
          if (popup.dataset.ppPatched) return;
          popup.dataset.ppPatched = '1';
          var btn = document.createElement('button');
          btn.textContent = '🧬 Send to Phylum Path';
          btn.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.25);border-radius:5px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:6px;';
          btn.onclick = function() {
            var selectedText = window.getSelection ? window.getSelection().toString() : '';
            var text = selectedText || popup.dataset.selectedText || '';
            if (!text) { RPGACE.utils.toast('Select some text first', '#E25454', 2000); return; }
            self.open(text.slice(0, 2000));
          };
          var btnRow = popup.querySelector('div');
          if (btnRow) btnRow.appendChild(btn);
          else popup.appendChild(btn);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },

  _injectButton: function() {
    if (document.getElementById('phylum-path-btn')) return;
    var self = this;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var btn = document.createElement('button');
    btn.id = 'phylum-path-btn';
    btn.className = 'agent-btn';
    btn.textContent = '🧬 Phylum Path';
    btn.style.cssText = 'border-color:rgba(61,170,110,0.4);color:#3DAA6E;background:rgba(61,170,110,0.08);margin-left:4px;';
    btn.onclick = function() { self.open(); };
    row.appendChild(btn);
  },

  // ── Auto-detect entry point: reads phylum 1's score straight out of   ──
  // ── the shared scan's already-computed `matches` array (fired via the  ──
  // ── 'oracle:response-scanned' hook - see init()) rather than owning    ──
  // ── its own MutationObserver or re-scoring the text itself. Surfaces   ──
  // ── an opt-in button, never auto-commits anything to Supabase.        ──
  _checkLastResponse: function(text, lastMsg, matches) {
    var self = this;
    // July 17: was hardcoded to self.PHYLUM_NUM (Phylum 1 only) - now
    // checks every enabled phylum and opens on whichever one actually
    // matched, so Percussio-relevant responses get their own badge too.
    var m = matches.find(function(m) { return self.isEnabled(m.num); });
    if (!m) return;

    var badge = document.createElement('button');
    badge.textContent = '🧬 Add to Phylum Path? (' + m.name + ')';
    badge.style.cssText = 'margin-top:6px;padding:3px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.25);border-radius:12px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    // Fixed July 17: this used to just open the side panel pre-filled,
    // requiring a SECOND click on "Place this insight" inside it before
    // decidePlacement()/the confirm popup ever ran - easy to miss (a real
    // report: "no pop-up showed up" after clicking this badge). Now goes
    // straight to placement decision + the confirm popup in one click,
    // matching what the badge visually promises.
    badge.onclick = function() {
      badge.remove();
      RPGACE.utils.toast('🧬 Deciding placement...', '#3DAA6E', 2500);
      self._placeInsight(text.slice(0, 2000), m.num).catch(function(e) {
        RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500);
      });
    };
    lastMsg.appendChild(badge);
  },

  // ── Panel ──────────────────────────────────────────────────────────
  _close: function() {
    var p = document.getElementById('phylum-path-panel');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function(prefillText, phylumNumber) {
    if (document.getElementById('phylum-path-panel')) { this._close(); return; }
    var self = this;
    if (phylumNumber && this.isEnabled(phylumNumber)) this.PHYLUM_NUM = phylumNumber;
    var panel = document.createElement('div');
    panel.id = 'phylum-path-panel';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(440px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(61,170,110,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(61,170,110,0.06);border-bottom:1px solid rgba(61,170,110,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'PHYLUM PATH';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.className = 'pp-panel-sub';
    sub.textContent = RPGACE.utils.phylumLabel(self.PHYLUM_NUM);
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
    ht.appendChild(lb); ht.appendChild(sub);
    var cb = document.createElement('button');
    cb.textContent = '×';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';

    // Phylum switcher - only shows once there's more than one enabled
    // phylum to pick between (Compositio + Percussio, July 17 onward).
    if (this.ENABLED_PHYLA.length > 1) body.appendChild(this._renderPhylumSwitcher());

    var purposeNote = document.createElement('div');
    purposeNote.className = 'pp-panel-purpose';
    purposeNote.textContent = RPGACE.utils.phylumContext(self.PHYLUM_NUM);
    purposeNote.style.cssText = 'font-size:10px;color:rgba(61,170,110,0.6);margin-bottom:14px;letter-spacing:0.3px;line-height:1.5;border-left:2px solid rgba(61,170,110,0.3);padding-left:8px;';
    body.appendChild(purposeNote);

    // Manual insight entry
    var entryLbl = document.createElement('div');
    entryLbl.textContent = 'Add an insight';
    entryLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:6px;';
    body.appendChild(entryLbl);

    var tt0 = RPGACE.modules.taxonomyTree;
    var textarea = document.createElement('textarea');
    textarea.id = 'phylum-path-input';
    textarea.placeholder = 'Paste or describe a specific teaching insight - a fact, technique, or observation about ' + (tt0 ? tt0.PHYLUM_NAMES[self.PHYLUM_NUM] : 'this phylum') + '...';
    textarea.value = prefillText || '';
    textarea.rows = 5;
    textarea.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:10px;';
    body.appendChild(textarea);

    var placeBtn = document.createElement('button');
    placeBtn.textContent = '🧬 Place this insight';
    placeBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:18px;';
    placeBtn.onclick = function() {
      var text = document.getElementById('phylum-path-input').value.trim();
      if (!text) { RPGACE.utils.toast('Add an insight first', '#E25454', 2000); return; }
      placeBtn.disabled = true;
      placeBtn.textContent = '⏳ Placing...';
      self._placeInsight(text, self.PHYLUM_NUM).then(function(result) {
        placeBtn.disabled = false;
        placeBtn.textContent = '🧬 Place this insight';
        if (result && result.inserted) {
          document.getElementById('phylum-path-input').value = '';
          self._renderTree();
        }
      }).catch(function(e) {
        placeBtn.disabled = false;
        placeBtn.textContent = '🧬 Place this insight';
        RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500);
      });
    };
    body.appendChild(placeBtn);

    // Phylum-level article button (the root itself - no taxonomy_tree row
    // exists for it, node=null is the signal _generateArticle reads as "the
    // whole phylum" rather than one specific node).
    var phylumArticleBtn = document.createElement('button');
    phylumArticleBtn.textContent = '📄 Generate Phylum-Level Article';
    phylumArticleBtn.style.cssText = 'width:100%;padding:8px;background:rgba(155,89,182,0.08);border:1px solid rgba(155,89,182,0.25);border-radius:6px;color:#9B59B6;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:14px;';
    phylumArticleBtn.onclick = function() { self._generateArticle(null); };
    body.appendChild(phylumArticleBtn);

    var treeLbl = document.createElement('div');
    treeLbl.textContent = 'Current structure';
    treeLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:8px;';
    body.appendChild(treeLbl);

    var treeList = document.createElement('div');
    treeList.id = 'phylum-path-tree';
    treeList.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
    body.appendChild(treeList);

    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });

    self._renderTree();
  },

  _renderTree: function() {
    var self = this;
    var treeList = document.getElementById('phylum-path-tree');
    if (!treeList) return;
    treeList.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';

    RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + self.PHYLUM_NUM + '&order=path.asc')
      .then(function(nodes) {
        nodes = nodes || [];
        treeList.innerHTML = '';
        if (nodes.length === 0) {
          treeList.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;">Nothing mapped yet - add the first insight above.</div>';
          return;
        }
        var tt = RPGACE.modules.taxonomyTree;
        nodes.forEach(function(node) {
          var row = document.createElement('div');
          row.style.cssText = 'padding:8px 10px;border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:6px;background:rgba(255,255,255,0.02);';
          var rankLbl = document.createElement('div');
          rankLbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(61,170,110,0.6);margin-bottom:2px;';
          rankLbl.textContent = (tt ? tt.rankNameForDepth(node.depth) : 'Depth ' + node.depth) + (node.node_type === 'leaf' ? ' · leaf' : '');
          var nameEl = document.createElement('div');
          nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;margin-bottom:6px;';
          nameEl.textContent = node.name;
          var artBtn = document.createElement('button');
          artBtn.textContent = '📄 Generate/Refresh Article';
          artBtn.style.cssText = 'padding:3px 8px;background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.2);border-radius:5px;color:#9B59B6;font-size:9px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          artBtn.onclick = function() { self._generateArticle(node); };
          row.appendChild(rankLbl); row.appendChild(nameEl); row.appendChild(artBtn);
          treeList.appendChild(row);
        });
      }).catch(function(e) {
        treeList.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  // ── Decide (don't write) where a bottom-up insight belongs ──────────
  // Fetches existing structure, asks Oracle to decide an attach point +
  // however many new ranks are genuinely needed (the 5-perspective check
  // stands in for this project's Council of 5 convention here). Returns a
  // decision only - callers (the confirm popup below, or taxonomyTree's
  // proposeLineage/silentPropose once routed here) own what happens next.
  // Split out July 15 so the old top-down system can reuse this same
  // structure-aware decision instead of its own duplicate-blind one.
  // ══════════════════════════════════════════════════════════════════
  // UNIFIED PLACEMENT ENGINE — July 19, from the Fable tree audit.
  // Before this there were THREE different placement pipelines with
  // measurably different output quality (real evidence, queried from the
  // live tree): taxonomyTree's flat prompt (worst: video-title leaves,
  // pre-assumed fit, no score, no justification), this module's old
  // two-call decidePlacement (middle: 5 checks but no score, no stored
  // justification, extra extractor call = extra cost), and bookworm's
  // scored cascade (best-logged: 5 checks + numeric confidence +
  // justification + reword loop). Everything now routes here — the
  // best-logged version, generalized — one prompt, one call, one place
  // to fix. The audit's confirmed failure modes are addressed as
  // EXPLICIT RULES in the prompt below, each tied to a real observed
  // failure, plus mechanical guards in sanitizePlacement/_insertNewSteps
  // that hold even if a model regression slips past the wording.
  // priorLeaves: optional array of leaf names already created by the
  // same batch (e.g. earlier insights from the same book chapter) —
  // audit finding: without this, one chapter about inversions created
  // 5+ overlapping sibling leaves, each individually scored 9/10,
  // because every insight was placed blind to its siblings.
  decidePlacementScored: function(insightText, phylumNumber, priorLeaves) {
    var self = this;
    return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc').then(function(existing) {
      existing = existing || [];
      // TOKEN-COST RETUNE July 19: the structure listing used to print
      // every node's FULL slash-joined path - each line repeating its
      // entire ancestor chain (Compositio alone: ~10.6k chars ≈ ~2.9k
      // tokens PER CALL, and this is the most-called prompt in the app).
      // Now: an indented, NUMBERED name tree - same complete structural
      // information (order=path.asc keeps children under parents, indent
      // shows depth), ~65% fewer tokens. The model returns the NUMBER of
      // the attach node instead of copying a path string character-for-
      // character - cheaper AND more robust (no exact-string mismatch
      // failures). Path strings still accepted as a fallback for safety.
      var pathList = existing.length
        ? existing.map(function(n, i) {
            var indent = '';
            for (var d = 0; d < (n.depth || 0); d++) indent += ' ';
            return (i + 1) + '.' + indent + n.name + (n.node_type === 'leaf' ? ' *' : '');
          }).join('\n')
        : '(nothing mapped yet - this will be the first entry)';
      var priorBlock = (priorLeaves && priorLeaves.length)
        ? '\n\nLEAVES ALREADY CREATED BY THIS SAME BATCH/CHAPTER (in addition to the structure above):\n- ' + priorLeaves.join('\n- ') + '\n'
        : '';
      var prompt = 'You are a private tutor with a PhD in ' + RPGACE.utils.phylumContext(phylumNumber) + ' as a formal academic discipline.\n\n' +
        'An insight to place: "' + insightText + '"\n\n' +
        'EXISTING STRUCTURE in this phylum (numbered; indentation = depth under the phylum root; * marks a leaf):\n' + pathList + priorBlock + '\n\n' +
        'First decide honestly: does this insight genuinely belong in THIS phylum - not just loosely related? If it would sit more naturally in a DIFFERENT discipline, return fits:false rather than stretching a justification to make it fit here. A placement that needs a creative argument to defend is a wrong placement.\n\n' +
        'Then, using these 5 checks - pedagogical clarity, non-redundancy, practical applicability, structural fit, expansion headroom - decide where it attaches (the NUMBER of the existing node from the list above, or null for a new path from the phylum root), the new rank steps needed, one-sentence explainers per step, a one-sentence justification citing which check(s) drove the decision, and a self-scored confidence 1-10.\n\n' +
        'HARD RULES, each from a real corruption found in this tree:\n' +
        '1. NAMING: every step name is a general CONCEPT label - never a video/song/book title, never an artist name, never a year, never platform text like "| FL Studio Tutorial". If the insight text is itself a content title, name the leaf after the TECHNIQUE it teaches.\n' +
        '2. NO NEAR-DUPLICATE SIBLINGS: if an existing leaf (or a batch leaf listed above) already covers this concept or a facet of it, attach to/extend THAT area - do not create another sibling restating it. Several narrow facets of one concept belong as ONE leaf, not five.\n' +
        '3. STEPS ARE SINGLE RANKS: each newSteps entry is ONE new rank\'s own name - never a "/"-joined path, never a restatement of the attach path or any earlier step, never two ideas joined by "; then" or similar.\n' +
        '4. DEPTH: the rank chain is Phylum(0)→Order→Class→Family→Genus→Species→Variant(6) - a placement may NEVER exceed depth 6. Prefer 1-2 new steps; more than 3 is almost always padding.\n\n' +
        'Return ONLY JSON: {"fits": true, "attachTo": 12, "newSteps": ["..."], "explainers": ["..."], "justification": "...", "confidenceScore": 8} (attachTo: node NUMBER or null)';
      return self._callGroundWorkerJSON(prompt, 700).then(function(parsed) {
        var attachNode = null;
        if (parsed.attachTo !== null && parsed.attachTo !== undefined && parsed.attachTo !== '') {
          var idx = parseInt(parsed.attachTo, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= existing.length) {
            attachNode = existing[idx - 1];
          } else if (typeof parsed.attachTo === 'string') {
            // Fallback: a model that answers with a path or bare name
            // string instead of the number still resolves.
            attachNode = existing.find(function(n) { return n.path === parsed.attachTo || n.name === parsed.attachTo; }) || null;
          }
        }
        var sanitized = self.sanitizePlacement(
          attachNode ? attachNode.path : '',
          attachNode ? attachNode.depth : 0,
          parsed.newSteps || []
        );
        return {
          fits: !!parsed.fits, phylumNumber: phylumNumber, attachNode: attachNode,
          attachPath: attachNode ? attachNode.path : null,
          newSteps: sanitized.steps,
          explainers: parsed.explainers || [],
          justification: parsed.justification || '', confidenceScore: parsed.confidenceScore || 0
        };
      });
    });
  },

  // Mechanical guard for placement steps - holds even when a prompt
  // regression (or a raw human paste in an Edit box, the actual cause of
  // the depth-14 corruption found July 19) slips garbage past the model
  // rules. Splits path-like steps, drops steps that restate any rank
  // already in the attach path or an earlier step, and hard-caps the
  // final depth at 6 (Variant) - on overflow it keeps the LAST step (the
  // actual content leaf) plus as many leading intermediates as fit,
  // because losing an intermediate grouping is recoverable while losing
  // the leaf loses the insight itself.
  sanitizePlacement: function(attachPath, attachDepth, newSteps) {
    var cleaned = [];
    var notes = [];
    var soFarLower = (attachPath || '').split('/').map(function(s) { return s.trim().toLowerCase(); }).filter(Boolean);
    (newSteps || []).forEach(function(step) {
      if (!step) return;
      var parts = String(step).split('/').map(function(s) { return s.trim(); }).filter(Boolean);
      if (parts.length > 1) notes.push('split path-like step "' + String(step).slice(0, 60) + '"');
      parts.forEach(function(candidate) {
        if (soFarLower.indexOf(candidate.toLowerCase()) !== -1) {
          notes.push('dropped duplicate rank "' + candidate.slice(0, 60) + '"');
          return;
        }
        cleaned.push(candidate);
        soFarLower.push(candidate.toLowerCase());
      });
    });
    var maxNew = 6 - (attachDepth || 0);
    if (maxNew < 1) maxNew = 1;
    if (cleaned.length > maxNew) {
      var leaf = cleaned[cleaned.length - 1];
      cleaned = cleaned.slice(0, maxNew - 1).concat([leaf]);
      notes.push('trimmed to depth cap 6 (kept leaf)');
    }
    return { steps: cleaned, notes: notes };
  },

  // Back-compat wrapper - callers that only need {attachNode, newSteps,
  // explainers} (the confirm-popup flow, proposeLineage delegation) get
  // the same shape as before, now with the scored engine's justification
  // and confidence riding along for free. The old two-call extractor+
  // worker body is deleted, not kept - one call is cheaper and the
  // scored prompt is strictly more rigorous.
  decidePlacement: function(insightText, phylumNumber) {
    return this.decidePlacementScored(insightText, phylumNumber, null);
  },

  // ── Confirm/deny/modify checkpoint ──────────────────────────────────
  // July 15: was missing entirely - _placeInsight used to write straight
  // to taxonomy_tree the instant Oracle decided a placement, with zero
  // human checkpoint (every other proposal path in RPGACE has one). Same
  // editable-steps convention as taxonomyTree._showProposalPopup, but
  // scoped to what Phylum Path actually does - only ever appends new
  // steps below an attach point, never edits existing structure - so
  // there's no full-path editor, just the attach point (read-only) plus
  // the new steps (editable/removable/insertable).
  _showPlacementConfirm: function(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject) {
    var tt = RPGACE.modules.taxonomyTree;
    var steps = (newSteps || []).slice();
    var expl = (explainers || []).slice();

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(61,170,110,0.3);border-radius:12px;padding:24px 28px;width:min(520px,95vw);max-height:85vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Phylum Path · Confirm Placement';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    title.textContent = RPGACE.utils.phylumLabel(phylumNumber);
    box.appendChild(eyebrow); box.appendChild(title);

    var attachLine = document.createElement('div');
    attachLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);margin-bottom:14px;line-height:1.6;padding:10px 12px;background:rgba(61,170,110,0.04);border-left:2px solid rgba(61,170,110,0.3);border-radius:0 6px 6px 0;';
    attachLine.innerHTML = attachNode
      ? '<strong style="color:rgba(226,226,236,0.75);">Attaching under:</strong> ' + attachNode.path
      : '<strong style="color:rgba(226,226,236,0.75);">Starting a new path</strong> from ' + (tt ? tt.PHYLUM_NAMES[phylumNumber] : 'the phylum root') + ' — no matching existing branch found.';
    box.appendChild(attachLine);

    var stepsContainer = document.createElement('div');
    stepsContainer.style.cssText = 'margin-bottom:16px;';
    var preview = document.createElement('div');
    preview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:16px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;';

    function updatePreview() {
      var base = attachNode ? attachNode.path : ((tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber)));
      preview.textContent = base + (steps.length ? '/' + steps.join('/') : '');
    }

    function renderSteps() {
      stepsContainer.innerHTML = '';
      steps.forEach(function(step, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;';
        var depthLabel = document.createElement('span');
        depthLabel.style.cssText = 'font-size:9px;color:rgba(61,170,110,0.5);flex-shrink:0;min-width:16px;';
        depthLabel.textContent = (i + 1) + '.';
        var stepInput = document.createElement('input');
        stepInput.type = 'text'; stepInput.value = step;
        stepInput.style.cssText = 'flex:1;background:none;border:none;color:#E2E2EC;font-size:12px;font-family:Rajdhani,sans-serif;outline:none;';
        stepInput.oninput = function() { steps[i] = stepInput.value; updatePreview(); };
        var delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.5);cursor:pointer;font-size:14px;flex-shrink:0;';
        delBtn.onclick = function() { steps.splice(i, 1); expl.splice(i, 1); renderSteps(); updatePreview(); };
        row.appendChild(depthLabel); row.appendChild(stepInput); row.appendChild(delBtn);
        stepsContainer.appendChild(row);
      });
      var addBtn = document.createElement('button');
      addBtn.textContent = '+ Insert step';
      addBtn.style.cssText = 'padding:5px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.35);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      addBtn.onclick = function() { steps.push('New step'); expl.push(''); renderSteps(); updatePreview(); };
      stepsContainer.appendChild(addBtn);
    }
    renderSteps();
    updatePreview();
    box.appendChild(stepsContainer);
    box.appendChild(preview);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept & Generate Content';
    acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    acceptBtn.onclick = function() {
      if (!steps.length) { RPGACE.utils.toast('No steps left to place', '#E25454', 2500); return; }
      overlay.remove();
      onAccept(steps, expl);
    };
    var rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#E25454;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    rejectBtn.onclick = function() { overlay.remove(); if (onReject) onReject(); };
    btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Manual-panel entry point: decide, confirm, then insert ──────────
  _placeInsight: function(insightText, phylumNumber) {
    var self = this;
    RPGACE.utils.toast('🧬 Deciding placement...', '#3DAA6E', 2500);

    return self.decidePlacement(insightText, phylumNumber).then(function(decision) {
      return new Promise(function(resolve, reject) {
        self._showPlacementConfirm(phylumNumber, decision.attachNode, decision.newSteps, decision.explainers, insightText,
          function(finalSteps, finalExplainers) {
            self._insertNewSteps(phylumNumber, decision.attachNode, finalSteps, finalExplainers, insightText)
              .then(function() { resolve({ inserted: true }); })
              .catch(reject);
          },
          function() { resolve({ inserted: false }); }
        );
      });
    });
  },

  // Chained insert, same pattern as taxonomyTree._acceptLineage (needs the
  // real inserted id back each time to chain parent_id correctly, since
  // RPGACE.sb.insert() defaults to Prefer:return=minimal).
  _insertNewSteps: function(phylumNumber, attachNode, newSteps, explainers, insightText) {
    var self = this;
    if (!newSteps.length) return Promise.reject(new Error('Oracle returned no new steps to place this insight'));

    // Choke-point guard (July 19, from the Fable tree audit): EVERY
    // taxonomy write from every pipeline lands here, so sanitize here -
    // not only in the model-output path. The depth-14 corruption chain
    // ("...Chord Voicing & Inversion/Compositio/Harmony/...", 12 garbage
    // rows) got in through Bookworm's Edit box, which split raw human
    // input on "/" and passed it straight in - the model-side sanitizer
    // never saw it. A guard at the single write site can't be bypassed
    // by any current or future caller.
    var guarded = self.sanitizePlacement(attachNode ? attachNode.path : '', attachNode ? attachNode.depth : 0, newSteps);
    if (guarded.notes.length) {
      console.warn('[phylumPath] sanitizePlacement corrected a placement at insert time:', guarded.notes.join('; '));
      RPGACE.utils.toast('⚠️ Placement auto-corrected: ' + guarded.notes.join('; '), '#E2A83D', 5000);
    }
    newSteps = guarded.steps;
    if (!newSteps.length) return Promise.reject(new Error('Placement rejected: every step duplicated an existing rank in the attach path'));

    var tt = RPGACE.modules.taxonomyTree;
    var phylumLatin = tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber);
    var parentId = attachNode ? attachNode.id : null;
    var baseDepth = attachNode ? attachNode.depth : 0;
    var pathSoFar = attachNode ? attachNode.path : phylumLatin;
    var chain = Promise.resolve();
    var finalRow = null;

    newSteps.forEach(function(stepName, i) {
      chain = chain.then(function() {
        pathSoFar += '/' + stepName;
        var isLast = (i === newSteps.length - 1);
        var currentPath = pathSoFar;
        var currentParent = parentId;
        var currentDepth = baseDepth + i + 1;

        return fetch(RPGACE.sb.url('taxonomy_tree'), {
          method: 'POST',
          headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
          body: JSON.stringify({
            parent_id: currentParent,
            depth: currentDepth,
            name: stepName,
            latin_name: null,
            phylum_number: phylumNumber,
            path: currentPath,
            node_type: isLast ? 'leaf' : 'branch',
            explainer: explainers[i] || '',
            sources: [{ type: 'phylum_path', id: null }],
          }),
        }).then(function(r) { return r.json(); }).then(function(result) {
          var row = Array.isArray(result) ? result[0] : result;
          if (row && row.id) parentId = row.id;
          if (isLast) finalRow = row;
        });
      });
    });

    return chain.then(function() {
      RPGACE.utils.toast('✅ Placed: ' + pathSoFar, '#3DAA6E', 4000);
      if (finalRow) {
        // Fire-and-forget - a missed fusion-link pass shouldn't block the
        // insight's own content generation, same pattern as F18's auto
        // Visual Treatment Doc trigger elsewhere in this file.
        self._findFusionLinks(finalRow, phylumNumber);
        return self._generateInsightContent(finalRow, phylumNumber, insightText);
      }
    });
  },

  // ══════════════════════════════════════════════════════════════════
  // July 16: fusion links - cross-taxonomy connections between a new
  // leaf and topically-related nodes ANYWHERE else in the tree (any
  // rank, any phylum), staged in the new taxonomy_links table and
  // confirmed/rejected through the same review queue as taxonomy
  // proposals (taxonomyReviewQueue). Answers a question the strict
  // one-parent tree can't: "does this same idea show up somewhere
  // else, and how do the two combine into something new." A link is
  // symmetric - one row, shown identically from either node's side
  // (see _renderFusionLinks) - and carries a one-sentence insight
  // explaining HOW the two connect, not just that they're similar.
  // New nodes only, going forward - no retroactive scan of the
  // existing tree this pass (same precedent as Phylum Path's original
  // "new insights only" scope decision).
  // ══════════════════════════════════════════════════════════════════
  // TOKEN-COST RETUNE July 19 (confirmed by Alex, the single biggest
  // culprit in the £10 burn): the old version sent EVERY node's full path
  // (~58.5k chars ≈ ~16k tokens at 491 nodes) TWICE per approved insight -
  // once to the Fable extractor (premium pricing) and once to the ground
  // worker. ~32k tokens per approval, growing with the tree. Now:
  // 1. The Fable triage call is GONE - one ground-worker call does the job.
  // 2. A free client-side keyword prefilter scores every candidate by word
  //    overlap with the new node's name/leaf context and sends only the
  //    top 60 - a genuine fusion needs topical overlap to exist at all, so
  //    zero-overlap candidates were pure token padding.
  // 3. Candidates are sent as NUMBERED [Phylum] Name lines (not full
  //    paths); the model returns the number, mapped back client-side -
  //    more robust than exact-path-string matching too.
  // 4. If fewer than 3 candidates score any overlap, the call is SKIPPED
  //    entirely - nothing plausibly fuses, so spend nothing.
  // Net: ~32k tokens (part premium) → ~1-2k (ground worker only), ~94% cut,
  // with auto-fire behavior kept per Alex's explicit choice.
  _findFusionLinks: function(node, phylumNumber) {
    var self = this;
    if (!node) return Promise.resolve();

    return RPGACE.sb.select('taxonomy_tree', 'select=id,name,path,phylum_number&order=phylum_number.asc,path.asc')
      .then(function(allNodes) {
        allNodes = allNodes || [];
        var tt = RPGACE.modules.taxonomyTree;
        // Exclude the node itself and anything on its own direct
        // ancestor/descendant line (path prefix match) - fusion links are
        // for genuinely separate branches, not restating the tree's own
        // existing parent/child structure.
        var others = allNodes.filter(function(n) {
          return n.id !== node.id &&
            (n.path || '').indexOf(node.path + '/') !== 0 &&
            (node.path || '').indexOf(n.path + '/') !== 0;
        });
        if (!others.length) return;

        // Free keyword prefilter: score candidates by shared words (>3
        // chars) with the new node's name + its two nearest ancestors.
        var ctxWords = (node.name + ' ' + (node.path || '').split('/').slice(-3).join(' '))
          .toLowerCase().split(/\W+/).filter(function(w) { return w.length > 3; });
        var uniq = {};
        ctxWords = ctxWords.filter(function(w) { if (uniq[w]) return false; uniq[w] = true; return true; });
        var scored = others.map(function(n) {
          var hay = n.name.toLowerCase();
          var score = 0;
          ctxWords.forEach(function(w) { if (hay.indexOf(w) !== -1) score++; });
          return { n: n, score: score };
        }).filter(function(s) { return s.score > 0; })
          .sort(function(a, b) { return b.score - a.score; })
          .slice(0, 60);
        if (scored.length < 3) return; // nothing plausibly fuses - spend nothing

        var candidates = scored.map(function(s) { return s.n; });
        var candList = candidates.map(function(n, i) {
          var phName = tt ? (tt.PHYLUM_NAMES[n.phylum_number] || ('Phylum ' + n.phylum_number)) : ('Phylum ' + n.phylum_number);
          return (i + 1) + '. [' + phName + '] ' + n.name;
        }).join('\n');

        var prompt = 'You are a private tutor with a PhD across all music production disciplines, looking for genuine "fusion discipline" connections - places where two separately-classified ideas actually combine into a real technique, system, or craft angle a producer could use, not just two things that happen to share a topic.\n\n' +
          'NEW NODE just added: "' + node.name + '" (' + node.path + ')\n\n' +
          'CANDIDATE NODES (numbered, pre-filtered for topical overlap; [Phylum] Name):\n' + candList + '\n\n' +
          'Pick 0-3 REAL connections only - it is fine to return zero if nothing genuinely fuses. For each real connection, write a one-sentence insight explaining exactly HOW/WHY the two connect (this note will be shown on both nodes, so phrase it as the shared idea, not "node A relates to node B").\n\n' +
          'Return ONLY JSON: {"links": [{"n": 12, "insight": "..."}]}';

        return self._callGroundWorkerJSON(prompt, 500)
          .then(function(parsed) {
            var links = (parsed && parsed.links) || [];
            if (!links.length) return;

            var chain = Promise.resolve();
            links.forEach(function(link) {
              var li = parseInt(link.n, 10);
              var match = (!isNaN(li) && li >= 1 && li <= candidates.length)
                ? candidates[li - 1]
                : candidates.find(function(n) { return n.path === link.path || n.name === link.path; });
              if (!match) return;
              chain = chain.then(function() {
                return RPGACE.sb.insert('taxonomy_links', {
                  node_a_id: node.id,
                  node_b_id: match.id,
                  link_insight: link.insight || '',
                  status: 'pending'
                }).catch(function() {});
              });
            });
            return chain;
          });
      }).catch(function(e) {
        console.warn('[phylumPath] fusion link search failed:', e.message);
      });
  },

  // ── Content generation for the new deepest node - extends Prod         ──
  // ── Oracle's "Master Learning" 3-layer method with a private-tutor-PhD  ──
  // ── persona, per the questionnaire's answer, rather than a new prompt   ──
  // ── shape from scratch. Deliberately a separate call from taxonomyTree's ──
  // ── _generateNodeContent - real Phylum 1 data shows deep_content is     ──
  // ── empty on every node that call is supposed to have populated, an    ──
  // ── open bug not investigated here (flagged in the plan doc instead).  ──
  // July 15 smoke test: real Phrygian-Dominant insight got cut off mid-
  // sentence at max_tokens:1200 asking for a full 3-layer teaching format.
  // Same class of issue as the already-open Oracle 504 timeout bug -
  // generation time, not just token count, is the real ceiling. Trimmed
  // the ask to explicitly stay short (this is a reference note attached to
  // one taxonomy leaf, not a full lesson - Feynman/Prod Oracle already own
  // the full-length teaching job elsewhere) and lowered max_tokens to
  // match the placement call's already-reliable budget, rather than
  // raising it further.
  _generateInsightContent: function(node, phylumNumber, insightText) {
    var self = this;
    var extractorPrompt = 'You are outlining a short teaching note before a tutor writes it in full.\n\n' +
      'TOPIC: "' + node.name + '" (part of: ' + node.path + ')\n' +
      'INSIGHT: "' + insightText + '"\n\n' +
      'Produce a brief outline for a 3-layer teaching method:\n' +
      '- SIMPLE ANGLE: the one plain-terms hook to open with\n' +
      '- TECHNICAL MECHANIC: the one specific mechanism/technique to explain\n' +
      '- EXPERT NUANCE: the one thing most tutorials miss about this\n\n' +
      'Return ONLY JSON: {"simpleAngle": "...", "technicalMechanic": "...", "expertNuance": "..."}';

    return self._callExtractor(extractorPrompt, 250)
      .catch(function(e) {
        console.warn('[phylumPath] insight-content extractor failed, ground worker writes cold:', e.message);
        return null;
      })
      .then(function(outline) {
        var outlineBlock = outline
          ? '\n\nA FASTER TRIAGE PASS ALREADY OUTLINED THIS (a starting angle - expand or correct as needed, do not just restate it):\n' +
            '- Simple angle: ' + outline.simpleAngle + '\n' +
            '- Technical mechanic: ' + outline.technicalMechanic + '\n' +
            '- Expert nuance: ' + outline.expertNuance + '\n'
          : '';

        var prompt = 'You are a private tutor with a PhD in ' + RPGACE.utils.phylumContext(phylumNumber) + ', teaching a UK hip hop / drill producer who works in FL Studio.\n\n' +
          'TOPIC: "' + node.name + '" (part of: ' + node.path + ')\n' +
          'THE INSIGHT THAT PROMPTED THIS: "' + insightText + '"' + outlineBlock + '\n\n' +
          'Teach this using the 3-layer method: simple terms first, then technical mechanics, then the one expert nuance most tutorials miss. Be specific to FL Studio. Keep this concise — under 350 words total across all 3 layers, this is a reference note attached to one taxonomy leaf, not a full lesson.';

        return self._callGroundWorkerText(prompt, 700);
      })
      .then(function(text) {
        return RPGACE.sb.update('taxonomy_tree', 'id=eq.' + node.id, {
          deep_content: { generated: text, generated_at: new Date().toISOString() }
        });
      }).catch(function(e) {
        console.warn('[phylumPath] content generation failed:', e.message);
      });
  },

  // ── Article generation, any rank (or the phylum root itself if node   ──
  // ── is null) - manual button trigger only, per the questionnaire.     ──
  // ── Split July 17 into text-generation (this function) + a confirm    ──
  // ── popup + save (_generateArticle below) - the original version      ──
  // ── wrote straight to Encyclopedia with zero human checkpoint, the    ──
  // ── one Phylum Path Oracle call that had never gotten the same        ──
  // ── review-before-write treatment as insight placement did back in    ──
  // ── Phase 1. Real gap found hand-testing the drill-down live.         ──
  _generateArticleText: function(node) {
    var self = this;
    var phylumNumber = node ? node.phylum_number : self.PHYLUM_NUM;
    RPGACE.utils.toast('📄 Gathering content...', '#9B59B6', 2500);

    return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc')
      .then(function(allNodes) {
        allNodes = allNodes || [];
        var relevant = node
          ? allNodes.filter(function(n) { return n.id === node.id || (n.path || '').indexOf(node.path + '/') === 0; })
          : allNodes;

        var contentBlock = relevant.map(function(n) {
          var deep = (n.deep_content && n.deep_content.generated) ? n.deep_content.generated : '';
          return '### ' + n.name + '\n' + (n.explainer || '') + (deep ? '\n' + deep : '');
        }).join('\n\n');

        var tt = RPGACE.modules.taxonomyTree;
        var title = node ? node.name : (tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber));
        var rankLabel = node ? (tt ? tt.rankNameForDepth(node.depth) : 'Node') : 'Phylum';

        // July 15 smoke test: this call (max_tokens:1800, the longest of
        // Phylum Path's 3 Oracle calls) failed outright with a JSON-parse
        // error on "Church Modes" - Vercel's function timeout returned an
        // HTML error page instead of JSON. Reproduces the already-open
        // Oracle 504 timeout bug. Trimmed the ask + lowered max_tokens as
        // a scoped mitigation (same move already made for
        // _generateNodeContent and _generateInsightContent) - the timeout
        // itself still needs its own dedicated fix (streaming or chunked
        // generation), not another blind retry.
        //
        // July 16: extractor pass added on top of that mitigation - Fable
        // 5 outlines the article's structure first (which sub-points
        // matter, what the throughline is), so the ground worker writes
        // from a real outline instead of winging structure cold. Doesn't
        // change the token/length mitigation above, just the quality of
        // what gets written within that budget.
        var extractorPrompt = 'You are outlining a reference article before it gets written in full.\n\n' +
          'TOPIC: "' + title + '" (' + rankLabel + (node ? ', part of: ' + node.path : ', the root discipline itself') + ')\n\n' +
          'ACCUMULATED CONTENT to synthesize:\n\n' + (contentBlock || '(nothing accumulated yet)') + '\n\n' +
          'Produce a brief outline:\n' +
          '- THROUGHLINE: the one organizing idea that ties everything below together, one sentence.\n' +
          '- KEEP: up to 4 sub-points from the accumulated content that are most worth keeping in the final article.\n' +
          '- SKIP: anything redundant or minor worth leaving out.\n\n' +
          'Return ONLY JSON: {"throughline": "...", "keep": ["...", "..."], "skip": ["...", "..."]}';

        return self._callExtractor(extractorPrompt, 300)
          .catch(function(e) {
            console.warn('[phylumPath] article extractor failed, ground worker writes cold:', e.message);
            return null;
          })
          .then(function(outline) {
            var outlineBlock = outline
              ? '\n\nA FASTER TRIAGE PASS ALREADY OUTLINED THIS (a starting structure - expand or correct as needed, do not just restate it):\n' +
                '- Throughline: ' + outline.throughline + '\n' +
                '- Worth keeping: ' + ((outline.keep && outline.keep.length) ? outline.keep.join('; ') : '(none flagged)') + '\n' +
                '- Worth skipping: ' + ((outline.skip && outline.skip.length) ? outline.skip.join('; ') : '(none flagged)') + '\n'
              : '';

            var prompt = 'You are a private tutor with a PhD in ' + RPGACE.utils.phylumContext(phylumNumber) + '.\n\n' +
              'Write a reference article for "' + title + '" (' + rankLabel + (node ? ', part of: ' + node.path : ', the root discipline itself') + ').\n\n' +
              'Synthesize the following accumulated teaching content from this topic and everything beneath it in the tree:\n\n' + (contentBlock || '(nothing accumulated yet - write a short foundational overview instead)') + outlineBlock + '\n\n' +
              'Produce a well-organized synthesis a producer can use as a standing reference, not just a restated list. Keep it under 500 words — concise and usable beats exhaustive.';

            return self._callGroundWorkerText(prompt, 1000);
          })
          .then(function(text) {
            var articleTitle = title + ' — ' + rankLabel + ' Reference';
            return { articleTitle: articleTitle, text: text };
          });
      });
  },

  // Confirm/deny popup shown between article generation and saving - same
  // checkpoint pattern as _showPlacementConfirm, just simpler (nothing to
  // edit, an article is either worth keeping or it isn't). Approve saves
  // to Encyclopedia + links taxonomy_node_id + fires the existing Concept
  // Fusion pass; Deny discards and does nothing.
  _showArticleConfirm: function(node, articleTitle, text, onApprove, onDeny) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:85vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Phylum Path · Confirm Article';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:12px;';
    title.textContent = articleTitle;
    box.appendChild(eyebrow); box.appendChild(title);

    var body = document.createElement('div');
    body.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;background:rgba(155,89,182,0.04);border:1px solid rgba(155,89,182,0.15);border-radius:8px;padding:14px;margin-bottom:16px;';
    body.textContent = text;
    box.appendChild(body);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var approveBtn = document.createElement('button');
    approveBtn.textContent = '✓ Save to Encyclopedia';
    approveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    approveBtn.onclick = function() { overlay.remove(); onApprove(); };
    var denyBtn = document.createElement('button');
    denyBtn.textContent = '✗ Discard';
    denyBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#E25454;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    denyBtn.onclick = function() { overlay.remove(); if (onDeny) onDeny(); };
    btnRow.appendChild(approveBtn); btnRow.appendChild(denyBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // Manual-button entry point - generates the text, shows the confirm
  // popup, only saves on Approve. Returns a promise that resolves once
  // the user has made a choice either way (approved or denied), same
  // shape as _placeInsight's { inserted: bool } pattern, so the button's
  // .then() (cache-clear + re-render) runs consistently regardless of
  // which way the user went.
  _generateArticle: function(node) {
    var self = this;
    return self._generateArticleText(node).then(function(result) {
      var articleTitle = result.articleTitle, text = result.text;
      return new Promise(function(resolve) {
        self._showArticleConfirm(node, articleTitle, text,
          function() {
            if (typeof saveOracleToEncyclopedia !== 'function') {
              RPGACE.utils.toast('Article generated but saveOracleToEncyclopedia() not found', '#E25454', 3500);
              resolve({ saved: false });
              return;
            }
            saveOracleToEncyclopedia(articleTitle, text).then(function() {
              if (node) {
                return RPGACE.sb.update('encyclopedia', 'title=eq.' + encodeURIComponent(articleTitle), { taxonomy_node_id: node.id }).catch(function() {});
              }
            }).then(function() {
              RPGACE.utils.toast('✅ Article saved to Encyclopedia: ' + articleTitle, '#3DAA6E', 4000);
              // Fire-and-forget, same pattern as _findFusionLinks - a missed
              // concept-fusion pass shouldn't block the article save itself.
              self._findConceptFusion(node, text);
              resolve({ saved: true });
            });
          },
          function() {
            RPGACE.utils.toast('Article discarded', 'rgba(226,226,236,0.5)', 2500);
            resolve({ saved: false });
          }
        );
      });
    }).catch(function(e) {
      RPGACE.utils.toast('Error generating article: ' + e.message, '#E25454', 3500);
    });
  },

  // ══════════════════════════════════════════════════════════════════
  // July 17: Concept Fusion - distinct from _findFusionLinks() above.
  // That system links a single new LEAF insight to other specific leaves
  // (narrow, technique-level connections). This instead looks at a whole
  // BRANCH's synthesized article (Genus/Family/Order/Class - anything
  // above a leaf) once _generateArticle() writes it, and asks whether
  // merging that branch's actual concept with a distant branch anywhere
  // else in the tree (any rank, any phylum - Genus-to-Family, Family-to-
  // Order, whatever genuinely fits) would produce a NEW teachable idea
  // neither branch covers alone. If so, it doesn't just link the two -
  // it proposes a brand new taxonomy leaf representing the merge itself,
  // staged through the same taxonomy_proposals confirm/reject review as
  // every other tree write (engine: 'concept_fusion'), plus 2
  // taxonomy_links rows connecting the new node back to both sources
  // once accepted. Cross-phylum only, matching the "discipline far away"
  // framing - same-phylum branch relationships are already just tree
  // structure. Scoped to node_type==='branch' (Order/Class/Family/Genus)
  // so it never fires on a plain leaf article, where _findFusionLinks
  // already owns the narrower connection job.
  // ══════════════════════════════════════════════════════════════════
  _findConceptFusion: function(node, articleText) {
    var self = this;
    if (!node || node.node_type !== 'branch') return Promise.resolve();

    return RPGACE.sb.select('taxonomy_tree', 'select=id,name,path,phylum_number,depth,node_type,explainer&order=phylum_number.asc,path.asc')
      .then(function(allNodes) {
        allNodes = allNodes || [];
        var tt = RPGACE.modules.taxonomyTree;
        var others = allNodes.filter(function(n) {
          return n.node_type === 'branch' && n.phylum_number !== node.phylum_number;
        });
        if (!others.length) return;

        var pathList = others.map(function(n) {
          var phName = tt ? (tt.PHYLUM_NAMES[n.phylum_number] || ('Phylum ' + n.phylum_number)) : ('Phylum ' + n.phylum_number);
          return '- [' + phName + '] ' + n.path + (n.explainer ? ' — ' + n.explainer : '');
        }).join('\n');

        var extractorPrompt = 'You are a fast triage pass looking for concept-fusion candidates across disciplines.\n\n' +
          'BRANCH CONCEPT: "' + node.name + '" (' + node.path + ')\n' +
          'ITS SYNTHESIZED ARTICLE:\n' + (articleText || '').slice(0, 1500) + '\n\n' +
          'OTHER BRANCHES ACROSS THE TAXONOMY (different phyla only):\n' + pathList + '\n\n' +
          'Shortlist up to 5 branches whose core concept, combined with this one, might form a genuinely new teachable idea neither branch covers alone - not just related topics.\n\n' +
          'Return ONLY JSON: {"candidates": ["path1", "path2"]}';

        return self._callExtractor(extractorPrompt, 350)
          .catch(function(e) {
            console.warn('[phylumPath] concept-fusion extractor failed, ground worker scans cold:', e.message);
            return null;
          })
          .then(function(shortlist) {
            var candidateBlock = (shortlist && shortlist.candidates && shortlist.candidates.length)
              ? '\n\nA FASTER TRIAGE PASS ALREADY SHORTLISTED THESE (verify and refine, do not just accept blindly):\n' + shortlist.candidates.join('\n')
              : '';

            var prompt = 'You are a private tutor with a PhD across all music production disciplines, looking specifically for a "concept fusion" - two branches from DIFFERENT parts of the taxonomy whose core ideas genuinely combine into a NEW teachable concept, distinct from either branch alone. This is a higher bar than a simple connection: the merge itself should be worth its own leaf, giving a producer a real new angle neither discipline provides in isolation.\n\n' +
              'BRANCH CONCEPT: "' + node.name + '" (' + node.path + ')\n' +
              'ITS SYNTHESIZED ARTICLE:\n' + (articleText || '').slice(0, 2000) + '\n\n' +
              'OTHER BRANCHES (different phyla only):\n' + pathList + candidateBlock + '\n\n' +
              'Decide: is there ONE genuine fusion here, or none? Zero is a completely fine answer - most branches will not have one. If yes:\n' +
              '- TARGET PATH: the exact existing path string of the other branch to merge with.\n' +
              '- ATTACH UNDER: "source" or "target" - whichever branch is the more natural home for the new merged concept.\n' +
              '- NEW NAME: a short, specific name for the new merged concept (this becomes a new taxonomy leaf).\n' +
              '- SYNTHESIS: 2-3 sentences explaining what the merged concept actually is and how it gives a producer a genuinely new angle.\n\n' +
              'Return ONLY JSON: {"found": true/false, "targetPath": "...", "attachUnder": "source", "newName": "...", "synthesis": "..."}';

            return self._callGroundWorkerJSON(prompt, 600);
          })
          .then(function(parsed) {
            if (!parsed || !parsed.found || !parsed.targetPath || !parsed.newName) return;
            var target = others.find(function(n) { return n.path === parsed.targetPath; });
            if (!target) return;

            var attachNode = (parsed.attachUnder === 'target') ? target : node;
            var otherNode = (parsed.attachUnder === 'target') ? node : target;

            return RPGACE.sb.insert('taxonomy_proposals', {
              source_type: 'phylum_path_concept_fusion',
              source_id: node.id,
              proposed_path: attachNode.path + '/' + parsed.newName,
              phylum_number: attachNode.phylum_number,
              proposed_steps: {
                engine: 'concept_fusion',
                attachToId: attachNode.id,
                otherNodeId: otherNode.id,
                newName: parsed.newName,
                synthesis: parsed.synthesis || ''
              },
              status: 'pending'
            }).catch(function(e) {
              console.warn('[phylumPath] concept-fusion proposal write failed:', e.message);
            });
          });
      }).catch(function(e) {
        console.warn('[phylumPath] concept-fusion search failed:', e.message);
      });
  },

  // ══════════════════════════════════════════════════════════════════
  // PHASE 2 (July 15): dedicated nav tab, Linnaean drill-down browsing.
  // Confirmed decisions: Phylum 1 only (not all 21 with placeholders),
  // articles are lazy-generated + cached (not auto-regenerated), Circles
  // (the old "rabbit-hole nav" idea, previously deferred pending a
  // Research-tab declutter) folds straight into this instead of getting
  // its own build - sibling browsing at any level IS the rabbit-hole
  // concept, finally given a real home. Direct-from-chat placement
  // deliberately held back this pass. Insight-adding still happens via
  // the existing side panel / auto-detect badge / highlight-select -
  // this tab is for browsing + reading, not a duplicate entry point.
  // ══════════════════════════════════════════════════════════════════

  _focusNodeId: null, // null = phylum root

  _injectNavTab: function() {
    if (document.getElementById('phylum-path-nav-tab')) return;
    var self = this;
    var tabs = document.querySelector('.nav-tabs');
    if (!tabs) return;
    var btn = document.createElement('button');
    btn.id = 'phylum-path-nav-tab';
    btn.className = 'nav-tab';
    btn.textContent = '🧬 Phylum Path';
    btn.onclick = function() { showPage(RPGACE.CONFIG.pages.phylumPath, btn); };
    tabs.appendChild(btn);
  },

  _injectPageShell: function() {
    if (document.getElementById('page-' + RPGACE.CONFIG.pages.phylumPath)) return;
    var self = this;
    var app = document.getElementById('app');
    if (!app) return;
    var page = document.createElement('div');
    page.className = 'page';
    page.id = 'page-' + RPGACE.CONFIG.pages.phylumPath;
    page.innerHTML =
      '<div class="section-title" id="pp-phylum-title">🧬 Phylum Path — ' + RPGACE.utils.phylumLabel(this.PHYLUM_NUM) + '</div>' +
      '<div id="pp-phylum-switcher" style="margin-bottom:10px;"></div>' +
      '<div id="pp-breadcrumb" style="margin-bottom:10px;"></div>' +
      '<div id="pp-siblings" style="margin-bottom:14px;"></div>' +
      '<div id="pp-body"></div>';
    app.appendChild(page);
    // Switcher only shows once there's more than one enabled phylum.
    if (this.ENABLED_PHYLA.length > 1) {
      document.getElementById('pp-phylum-switcher').appendChild(this._renderPhylumSwitcher());
    }
  },

  // Fetches (fresh every render - cache-bust already covers writes) the
  // full Phylum 1 node set once per render pass, rather than once per
  // helper function, to avoid N redundant selects while building one view.
  _loadNodesAndRender: function(focusId) {
    var self = this;
    self._focusNodeId = focusId;
    var body = document.getElementById('pp-body');
    if (body) body.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:12px;">Loading...</div>';

    RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + self.PHYLUM_NUM + '&order=path.asc')
      .then(function(nodes) {
        self._renderDrillDown(nodes || [], focusId);
      }).catch(function(e) {
        if (body) body.innerHTML = '<div style="color:#E25454;font-size:12px;">Load error: ' + e.message + '</div>';
      });
  },

  _renderDrillDown: function(allNodes, focusId) {
    var self = this;
    var tt = RPGACE.modules.taxonomyTree;
    var focus = focusId ? allNodes.find(function(n) { return n.id === focusId; }) : null;

    // ── Breadcrumb: walk parent_id chain from focus up to root ──
    var crumb = document.getElementById('pp-breadcrumb');
    if (crumb) {
      crumb.innerHTML = '';
      var chain = [];
      var walk = focus;
      while (walk) {
        chain.unshift(walk);
        walk = walk.parent_id ? allNodes.find(function(n) { return n.id === walk.parent_id; }) : null;
      }
      var rootCrumb = document.createElement('span');
      rootCrumb.textContent = (tt ? tt.PHYLUM_NAMES[self.PHYLUM_NUM] : 'Phylum ' + self.PHYLUM_NUM);
      rootCrumb.style.cssText = 'cursor:pointer;color:' + (!focus ? '#3DAA6E;font-weight:700;' : 'rgba(61,170,110,0.6);') + 'font-size:12px;';
      rootCrumb.onclick = function() { self._loadNodesAndRender(null); };
      crumb.appendChild(rootCrumb);
      chain.forEach(function(n, i) {
        var sep = document.createElement('span');
        sep.textContent = ' › ';
        sep.style.cssText = 'color:rgba(226,226,236,0.25);font-size:12px;';
        crumb.appendChild(sep);
        var seg = document.createElement('span');
        seg.textContent = n.name;
        var isLast = (i === chain.length - 1);
        seg.style.cssText = 'cursor:pointer;color:' + (isLast ? '#3DAA6E;font-weight:700;' : 'rgba(61,170,110,0.6);') + 'font-size:12px;';
        seg.onclick = function() { self._loadNodesAndRender(n.id); };
        crumb.appendChild(seg);
      });
      // Explicit "up one level" affordance - previously the only way back
      // was clicking a specific breadcrumb word, easy to miss (especially
      // on mobile). Real gap found hand-testing the drill-down live.
      if (focus) {
        var backBtn = document.createElement('button');
        backBtn.textContent = '⬅ Back';
        backBtn.style.cssText = 'display:block;margin-top:8px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        backBtn.onclick = function() { self._loadNodesAndRender(focus.parent_id || null); };
        crumb.appendChild(backBtn);
      }
    }

    // ── Siblings ("scope" — Circles' rabbit-hole concept, browse ──
    // ── sideways without changing depth) ─────────────────────────
    var sibWrap = document.getElementById('pp-siblings');
    if (sibWrap) {
      sibWrap.innerHTML = '';
      var parentId = focus ? focus.parent_id : null;
      var siblings = allNodes.filter(function(n) {
        return focus ? n.parent_id === parentId && n.id !== focus.id : false;
      });
      if (focus && siblings.length) {
        var lbl = document.createElement('div');
        lbl.textContent = 'Other ' + (tt ? tt.rankNameForDepth(focus.depth) : 'items') + ' here:';
        lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(226,226,236,0.3);margin-bottom:6px;';
        sibWrap.appendChild(lbl);
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
        siblings.forEach(function(s) {
          var chip = document.createElement('button');
          chip.textContent = s.name;
          chip.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.06);border:1px solid rgba(61,170,110,0.2);border-radius:12px;color:#3DAA6E;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          chip.onclick = function() { self._loadNodesAndRender(s.id); };
          row.appendChild(chip);
        });
        sibWrap.appendChild(row);
      }
    }

    // ── Body: purpose line + children list, or leaf content ──────
    var body = document.getElementById('pp-body');
    if (!body) return;
    body.innerHTML = '';

    var purposeLine = document.createElement('div');
    purposeLine.textContent = focus ? (focus.explainer || '') : RPGACE.utils.phylumContext(self.PHYLUM_NUM);
    purposeLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);margin-bottom:14px;line-height:1.6;border-left:2px solid rgba(61,170,110,0.3);padding-left:10px;';
    if (purposeLine.textContent) body.appendChild(purposeLine);

    body.appendChild(self._articleSection(focus));

    if (focus) {
      var linksWrap = document.createElement('div');
      linksWrap.id = 'pp-links-' + focus.id;
      body.appendChild(linksWrap);
      self._renderFusionLinks(focus, linksWrap);
    }

    var children = allNodes.filter(function(n) {
      return focus ? n.parent_id === focus.id : n.parent_id === null;
    });

    if (children.length) {
      var childLbl = document.createElement('div');
      childLbl.textContent = focus ? 'Drill in' : 'Orders';
      childLbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin:16px 0 8px;';
      body.appendChild(childLbl);
      children.forEach(function(c) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:6px;cursor:pointer;background:rgba(255,255,255,0.02);';
        var left = document.createElement('div');
        var rankLbl = document.createElement('div');
        rankLbl.textContent = (tt ? tt.rankNameForDepth(c.depth) : 'Depth ' + c.depth) + (c.node_type === 'leaf' ? ' · leaf' : '');
        rankLbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(61,170,110,0.6);';
        var nameLbl = document.createElement('div');
        nameLbl.textContent = c.name;
        nameLbl.style.cssText = 'font-size:13px;font-weight:600;color:#E2E2EC;';
        left.appendChild(rankLbl); left.appendChild(nameLbl);
        var arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.style.cssText = 'color:rgba(61,170,110,0.5);font-size:14px;';
        row.appendChild(left); row.appendChild(arrow);
        row.onclick = function() { self._loadNodesAndRender(c.id); };
        body.appendChild(row);
      });
    } else if (focus && focus.node_type === 'leaf') {
      var deep = (focus.deep_content && focus.deep_content.generated) ? focus.deep_content.generated : '';
      if (deep) {
        var deepBox = document.createElement('div');
        deepBox.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.7);line-height:1.7;background:rgba(255,255,255,0.02);border-radius:8px;padding:14px;margin-top:12px;';
        deepBox.textContent = deep;
        body.appendChild(deepBox);
      }
    }
  },

  // ── Lazy + cached article view: checks Encyclopedia (via ──────────
  // ── taxonomy_node_id) for an existing article before ever calling ──
  // ── Oracle - only regenerates on explicit "Refresh" tap. Reuses    ──
  // ── _generateArticle()/saveOracleToEncyclopedia()'s existing       ──
  // ── upsert-on-title behavior, no new storage or column needed.     ──
  _articleSection: function(focus) {
    var self = this;
    var wrap = document.createElement('div');
    wrap.id = 'pp-article-' + (focus ? focus.id : 'root');
    wrap.style.cssText = 'margin-bottom:6px;';

    var renderButton = function(label, cached) {
      wrap.innerHTML = '';
      if (cached) {
        var box = document.createElement('div');
        box.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;background:rgba(155,89,182,0.04);border:1px solid rgba(155,89,182,0.15);border-radius:8px;padding:14px;margin-bottom:8px;';
        box.textContent = cached;
        wrap.appendChild(box);
      }
      var btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = 'padding:6px 14px;background:rgba(155,89,182,0.08);border:1px solid rgba(155,89,182,0.25);border-radius:6px;color:#9B59B6;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      btn.onclick = function() {
        btn.disabled = true; btn.textContent = '⏳ Generating...';
        self._generateArticle(focus).then(function() {
          // saveOracleToEncyclopedia() (main.js) writes via a raw fetch,
          // not RPGACE.sb.insert/update - the cache-busting wrapper never
          // fires for it, so the just-written row could show stale for up
          // to 60s on the immediate re-check below without this.
          RPGACE.cache.clear('encyclopedia');
          self._loadNodesAndRender(self._focusNodeId);
        });
      };
      wrap.appendChild(btn);
    };

    if (!focus) {
      renderButton('📄 Generate Phylum-Level Article', null);
      return wrap;
    }

    var title = focus.name + ' — ' + (RPGACE.modules.taxonomyTree ? RPGACE.modules.taxonomyTree.rankNameForDepth(focus.depth) : 'Node') + ' Reference';
    RPGACE.sb.select('encyclopedia', 'taxonomy_node_id=eq.' + focus.id + '&limit=1')
      .then(function(rows) {
        if (rows && rows[0]) renderButton('🔄 Refresh Article', rows[0].content);
        else renderButton('📄 Generate/Refresh Article', null);
      }).catch(function() { renderButton('📄 Generate/Refresh Article', null); });

    return wrap;
  },

  // ── Fusion links for the focused node - confirmed cross-taxonomy       ──
  // ── connections (see _findFusionLinks above). Rendered symmetrically   ──
  // ── from either side of a link since taxonomy_links doesn't privilege  ──
  // ── node_a over node_b - whichever node you're looking at, the OTHER   ──
  // ── one is what gets shown. Every link is now clickable (July 17 -     ──
  // ── previously only same-phylum links were, cross-phylum ones just    ──
  // ── displayed inert) and opens the interlink article popup below       ──
  // ── instead of jumping straight there, so the connection itself gets   ──
  // ── explained before you navigate away from either side.               ──
  _renderFusionLinks: function(focus, wrap) {
    var self = this;
    wrap.innerHTML = '';
    RPGACE.sb.select('taxonomy_links', 'status=eq.confirmed&or=(node_a_id.eq.' + focus.id + ',node_b_id.eq.' + focus.id + ')')
      .then(function(links) {
        links = links || [];
        if (!links.length) return;
        var otherIds = links.map(function(l) { return l.node_a_id === focus.id ? l.node_b_id : l.node_a_id; });
        return RPGACE.sb.select('taxonomy_tree', 'id=in.(' + otherIds.join(',') + ')&select=id,name,path,phylum_number,explainer').then(function(nodes) {
          var byId = {};
          (nodes || []).forEach(function(n) { byId[n.id] = n; });
          var tt = RPGACE.modules.taxonomyTree;

          var lbl = document.createElement('div');
          lbl.textContent = '🔗 Fusion connections';
          lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(52,152,219,0.6);margin:14px 0 8px;';
          wrap.appendChild(lbl);

          links.forEach(function(l) {
            var otherId = l.node_a_id === focus.id ? l.node_b_id : l.node_a_id;
            var other = byId[otherId];
            if (!other) return;
            var row = document.createElement('div');
            row.style.cssText = 'padding:10px 12px;margin-bottom:6px;background:rgba(52,152,219,0.05);border:1px solid rgba(52,152,219,0.15);border-radius:8px;cursor:pointer;';

            var phName = tt ? (tt.PHYLUM_NAMES[other.phylum_number] || ('Phylum ' + other.phylum_number)) : ('Phylum ' + other.phylum_number);
            var pathEl = document.createElement('div');
            pathEl.style.cssText = 'font-size:11px;font-weight:600;color:#3498DB;margin-bottom:3px;';
            pathEl.textContent = '[' + phName + '] ' + other.path;
            row.appendChild(pathEl);

            if (l.link_insight) {
              var insightEl = document.createElement('div');
              insightEl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.55);font-style:italic;';
              insightEl.textContent = l.link_insight;
              row.appendChild(insightEl);
            }

            row.onclick = function() { self._showLinkArticle(l, focus, other); };
            wrap.appendChild(row);
          });
        });
      }).catch(function() {});
  },

  // Jumps the nav-tab page to a specific node, switching phylum first if
  // needed - shared by the interlink popup's two exit buttons below.
  _jumpToNode: function(node) {
    if (node.phylum_number !== this.PHYLUM_NUM) {
      this._switchPhylum(node.phylum_number, node.id);
    } else {
      this._loadNodesAndRender(node.id);
    }
  },

  // Generates (or reuses a cached) short synthesis article specifically
  // about HOW two fusion-linked nodes connect, not either one alone -
  // lazy + cached on taxonomy_links.link_article, same "check cache first,
  // only call Oracle on demand" convention as _articleSection's node
  // articles. Single-tier ground-worker call (no extractor pass) since
  // this is a narrow, already-scoped synthesis, not a whole branch.
  _generateLinkArticle: function(link, nodeA, nodeB) {
    var self = this;
    var tt = RPGACE.modules.taxonomyTree;
    var phA = tt ? (tt.PHYLUM_NAMES[nodeA.phylum_number] || ('Phylum ' + nodeA.phylum_number)) : ('Phylum ' + nodeA.phylum_number);
    var phB = tt ? (tt.PHYLUM_NAMES[nodeB.phylum_number] || ('Phylum ' + nodeB.phylum_number)) : ('Phylum ' + nodeB.phylum_number);
    var prompt = 'You are a private tutor with a PhD in music production, explaining a genuine cross-discipline connection to a student.\n\n' +
      'Two separately-classified taxonomy concepts have been linked as a "fusion connection":\n\n' +
      'A) [' + phA + '] ' + nodeA.path + '\n' + (nodeA.explainer || '') + '\n\n' +
      'B) [' + phB + '] ' + nodeB.path + '\n' + (nodeB.explainer || '') + '\n\n' +
      'The confirmed reason they connect: "' + (link.link_insight || '') + '"\n\n' +
      'Write a short synthesis (under 300 words) explaining HOW these two ideas genuinely combine or reinforce each other in practice, with one concrete example a producer could apply. This is specifically about the connection between them, not a general overview of either concept alone.';

    return self._callGroundWorkerText(prompt, 600).then(function(text) {
      return RPGACE.sb.update('taxonomy_links', 'id=eq.' + link.id, {
        link_article: { generated: text, generated_at: new Date().toISOString() }
      }).then(function() { return text; });
    });
  },

  // Popup shown when a fusion-connection row is clicked - the interlink
  // article itself (cached or generate-on-demand), plus 2 exit buttons
  // jumping into either source node's own location, per the explicit ask
  // that a fusion article should have "an exit button into both parent
  // folders it is made from."
  _showLinkArticle: function(link, focus, other) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(52,152,219,0.3);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:85vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(52,152,219,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '🔗 Fusion Connection';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    title.textContent = focus.name + ' ↔ ' + other.name;
    box.appendChild(eyebrow); box.appendChild(title);

    if (link.link_insight) {
      var insight = document.createElement('div');
      insight.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);font-style:italic;margin-bottom:14px;';
      insight.textContent = link.link_insight;
      box.appendChild(insight);
    }

    var articleWrap = document.createElement('div');
    articleWrap.style.cssText = 'margin-bottom:16px;';
    box.appendChild(articleWrap);

    var renderArticleBox = function(label, cached) {
      articleWrap.innerHTML = '';
      if (cached) {
        var cbox = document.createElement('div');
        cbox.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;background:rgba(52,152,219,0.05);border:1px solid rgba(52,152,219,0.15);border-radius:8px;padding:14px;margin-bottom:8px;';
        cbox.textContent = cached;
        articleWrap.appendChild(cbox);
      }
      var genBtn = document.createElement('button');
      genBtn.textContent = label;
      genBtn.style.cssText = 'padding:6px 14px;background:rgba(52,152,219,0.08);border:1px solid rgba(52,152,219,0.25);border-radius:6px;color:#3498DB;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      genBtn.onclick = function() {
        genBtn.disabled = true; genBtn.textContent = '⏳ Generating...';
        self._generateLinkArticle(link, focus, other).then(function(text) {
          renderArticleBox('🔄 Refresh Interlink Article', text);
        }).catch(function(e) {
          RPGACE.utils.toast('Error generating interlink article: ' + e.message, '#E25454', 3500);
          genBtn.disabled = false; genBtn.textContent = label;
        });
      };
      articleWrap.appendChild(genBtn);
    };
    renderArticleBox(link.link_article && link.link_article.generated ? '🔄 Refresh Interlink Article' : '📄 Generate Interlink Article', link.link_article ? link.link_article.generated : null);

    var exitLbl = document.createElement('div');
    exitLbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:6px;';
    exitLbl.textContent = 'Exit into either side this is made from';
    box.appendChild(exitLbl);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var focusBtn = document.createElement('button');
    focusBtn.textContent = '↳ ' + focus.name;
    focusBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:8px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    focusBtn.onclick = function() { overlay.remove(); self._jumpToNode(focus); };
    var otherBtn = document.createElement('button');
    otherBtn.textContent = '↳ ' + other.name;
    otherBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:8px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    otherBtn.onclick = function() { overlay.remove(); self._jumpToNode(other); };
    btnRow.appendChild(focusBtn); btnRow.appendChild(otherBtn);
    box.appendChild(btnRow);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✗ Close';
    closeBtn.style.cssText = 'display:block;margin-top:10px;padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

});
/* ===END:phylumPath=== */

/* ===MODULE:bookworm=== */
// BOOKWORM — July 17. Whole-book ingestion, chapter by chapter, into
// Phylum Path. Spec locked after several rounds of real correction from
// the user (see bookworm_spec_backlog.txt at repo root - the durable
// record kept specifically because a first attempt at this substituted
// recommended defaults for the user's actual answers, which was wrong).
//
// Flow: paste a book's URL once -> api/bookworm-fetch.js does ONE
// uncapped Jina fetch + detects chapter boundaries + slices every
// chapter's text in that same pass (this is what makes the total
// chapter count, and therefore a real progress bar, known immediately -
// not discovered chapter by chapter). Chapters are then processed one
// at a time: read the chapter text -> extract every distinct insight ->
// find each insight's most-related phylum, cascading through the other
// enabled phyla for anything that doesn't fit, then a final broad
// 21-phylum search for genuine orphans -> Council-of-5 confidence score
// (1-10) on every placement before showing it, rewording+retrying
// insights that land in the mediocre 5-8 band, flagging (not forcing)
// anything under 4 -> user reviews each insight one at a time (read
// once per chapter, then per-insight: summary, path, justification,
// Approve/Reject/Edit) -> once every chapter is done, the book lands in
// the Bibliography section on the Research page.
//
// Reuses phylumPath's existing Oracle-calling helpers (_callExtractor,
// _callGroundWorkerJSON, _callGroundWorkerText) and its chained-insert
// pattern (_insertNewSteps) rather than duplicating that plumbing.
RPGACE.register('bookworm', {

  TRIGGER_PREFIXES: ['bookworm:', 'study this book:'],

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectDashboardWidget(); self._injectBibliographySection(); }, 1700);
      setTimeout(function() { self._patchChatTrigger(); }, 1700);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) self._injectDashboardWidget();
      if (name === RPGACE.CONFIG.pages.research) self._injectBibliographySection();
    });
  },

  // ── Entry point: the main Oracle chat, not just the Dashboard widget ──
  // July 17, added per direct request ("include oracle in ai advisor as
  // an input too") - same TRIGGER_PREFIXES/window.sendChat-wrap pattern
  // scheduleOracle already established (rpgace_core.js's scheduleOracle
  // module), so a prefixed message in ANY Oracle chat surface routes
  // straight into _startBook() instead of a normal chat turn. Falls
  // through to the original sendChat for anything that doesn't match,
  // same chainable-wrap convention scheduleOracle's wrap already uses -
  // safe to coexist with that wrap and any other already on window.sendChat.
  _patchChatTrigger: function() {
    var self = this;
    if (typeof window.sendChat !== 'function' || window._bookwormChatPatched) return;
    window._bookwormChatPatched = true;
    var origSend = window.sendChat;
    window.sendChat = function() {
      var input = document.getElementById('chat-input');
      var val = input ? input.value.trim() : '';
      var lower = val.toLowerCase();
      var matchedPrefix = self.TRIGGER_PREFIXES.find(function(p) { return lower.indexOf(p) === 0; });
      if (matchedPrefix) {
        var url = val.slice(matchedPrefix.length).trim();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        if (!url) { RPGACE.utils.toast('Add a book URL after "' + matchedPrefix + '"', '#E25454', 2500); return; }
        RPGACE.utils.toast('📖 Fetching + detecting chapters...', '#9B59B6', 3000);
        self._startBook(url).catch(function(e) {
          RPGACE.utils.toast('Error: ' + e.message, '#E25454', 4000);
        });
        return;
      }
      return origSend.apply(this, arguments);
    };
  },

  // ── Dashboard widget: in-progress books (progress bar each) + start-new-book input ──
  _injectDashboardWidget: function() {
    if (document.getElementById('bookworm-widget')) return;
    var self = this;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    var widget = document.createElement('div');
    widget.id = 'bookworm-widget';
    widget.style.cssText = 'background:rgba(155,89,182,0.03);border:1px solid rgba(155,89,182,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
    var titleEl = document.createElement('div');
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:3px;';
    eyebrow.textContent = 'Bookworm';
    var titleText = document.createElement('div');
    titleText.className = 'section-title';
    titleText.style.cssText = 'font-size:14px;';
    titleText.textContent = '📖 Work Through Books & Massive Texts';
    titleEl.appendChild(eyebrow); titleEl.appendChild(titleText);
    hdr.appendChild(titleEl);
    widget.appendChild(hdr);

    var urlRow = document.createElement('div');
    urlRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;';
    var urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.id = 'bookworm-url-input';
    urlInput.placeholder = 'Paste a book URL (PDF or web page)...';
    urlInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
    var startBtn = document.createElement('button');
    startBtn.textContent = '📖 Start';
    startBtn.style.cssText = 'padding:8px 16px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:6px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    startBtn.onclick = function() {
      var url = urlInput.value.trim();
      if (!url) { RPGACE.utils.toast('Paste a book URL first', '#E25454', 2000); return; }
      startBtn.disabled = true; startBtn.textContent = '⏳ Fetching + detecting chapters...';
      self._startBook(url).then(function() {
        startBtn.disabled = false; startBtn.textContent = '📖 Start';
        urlInput.value = '';
      }).catch(function(e) {
        startBtn.disabled = false; startBtn.textContent = '📖 Start';
        RPGACE.utils.toast('Error: ' + e.message, '#E25454', 4000);
      });
    };
    urlRow.appendChild(urlInput); urlRow.appendChild(startBtn);
    widget.appendChild(urlRow);

    // TOC-first manual entry - real gap found live: URL/Jina fetch is
    // the only way in, but a physical/owned book has no fetchable URL.
    // First version of this (type title + chapter 1's full text
    // together, unknown total) was rejected live - real report: pasting
    // a book's actual table of contents by mistake produced a chapter
    // with nothing but section headings and page numbers, no real
    // content, and there was no way to know the real total chapter
    // count upfront. Fixed by splitting into two steps: paste the TOC
    // ONCE (Oracle extracts the ordered chapter list from it, same as
    // detectChaptersByOracle does for a fetched book - see
    // _startBookFromTOC), giving a real known total/progress bar exactly
    // like a URL-fetched book; THEN, one at a time, paste just that
    // chapter's actual body text when prompted (title already known).
    var manualToggle = document.createElement('button');
    manualToggle.textContent = '✍️ Or paste a table of contents (own physical book)';
    manualToggle.style.cssText = 'width:100%;padding:6px;background:none;border:1px dashed rgba(155,89,182,0.25);border-radius:6px;color:rgba(155,89,182,0.7);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:14px;';
    var manualForm = document.createElement('div');
    manualForm.style.cssText = 'display:none;margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;';
    var manualTitleInput = document.createElement('input');
    manualTitleInput.type = 'text';
    manualTitleInput.placeholder = 'Book title...';
    manualTitleInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
    var manualTocInput = document.createElement('textarea');
    manualTocInput.placeholder = 'Paste the table of contents (chapter titles + numbers)...';
    manualTocInput.rows = 5;
    manualTocInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:8px;';
    var manualStartBtn = document.createElement('button');
    manualStartBtn.textContent = '✍️ Extract chapters from this contents page';
    manualStartBtn.style.cssText = 'width:100%;padding:8px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:6px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    manualStartBtn.onclick = function() {
      var title = manualTitleInput.value.trim();
      var toc = manualTocInput.value.trim();
      if (!title || !toc) { RPGACE.utils.toast('Add a title and the table of contents first', '#E25454', 2500); return; }
      manualStartBtn.disabled = true; manualStartBtn.textContent = '⏳ Extracting chapter list...';
      self._startBookFromTOC(title, toc).then(function() {
        manualStartBtn.disabled = false; manualStartBtn.textContent = '✍️ Extract chapters from this contents page';
        manualTitleInput.value = ''; manualTocInput.value = '';
        manualForm.style.display = 'none';
      }).catch(function(e) {
        manualStartBtn.disabled = false; manualStartBtn.textContent = '✍️ Extract chapters from this contents page';
        RPGACE.utils.toast('Error: ' + e.message, '#E25454', 4000);
      });
    };
    manualForm.appendChild(manualTitleInput); manualForm.appendChild(manualTocInput); manualForm.appendChild(manualStartBtn);
    manualToggle.onclick = function() { manualForm.style.display = manualForm.style.display === 'none' ? 'block' : 'none'; };
    widget.appendChild(manualToggle);
    widget.appendChild(manualForm);

    // Upload a purchased ebook PDF directly - real request from owning a
    // legitimate ebook file with no fetchable URL and no interest in
    // retyping the table of contents. Text extracted entirely client-side
    // via PDF.js, never uploaded anywhere as a raw file - only the
    // extracted text goes to the server, same as any other book source.
    var uploadRow = document.createElement('div');
    uploadRow.style.cssText = 'margin-bottom:14px;';
    var uploadLabel = document.createElement('label');
    uploadLabel.textContent = '📎 Or upload your own purchased ebook PDF';
    uploadLabel.style.cssText = 'display:block;width:100%;padding:6px;background:none;border:1px dashed rgba(155,89,182,0.25);border-radius:6px;color:rgba(155,89,182,0.7);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;text-align:center;';
    var uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = '.pdf,application/pdf';
    uploadInput.style.cssText = 'display:none;';
    uploadInput.onchange = function() {
      var file = uploadInput.files && uploadInput.files[0];
      if (!file) return;
      var title = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
      uploadLabel.textContent = '⏳ Extracting text + detecting chapters...';
      self._startBookFromPDF(title, file).then(function() {
        uploadLabel.textContent = '📎 Or upload your own purchased ebook PDF';
        uploadInput.value = '';
      }).catch(function(e) {
        uploadLabel.textContent = '📎 Or upload your own purchased ebook PDF';
        RPGACE.utils.toast('Error: ' + e.message, '#E25454', 4500);
      });
    };
    uploadLabel.appendChild(uploadInput);
    uploadRow.appendChild(uploadLabel);
    widget.appendChild(uploadRow);

    var list = document.createElement('div');
    list.id = 'bookworm-list';
    list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
    widget.appendChild(list);

    var kgPanel = document.getElementById('kg-panel');
    if (kgPanel && kgPanel.parentElement) kgPanel.parentElement.insertBefore(widget, kgPanel);
    else page.insertBefore(widget, page.firstChild);

    self._refreshWidget();
  },

  _refreshWidget: function() {
    var self = this;
    var list = document.getElementById('bookworm-list');
    if (!list) return;
    list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';

    RPGACE.sb.select('bookworm_books', 'status=eq.in_progress&order=created_at.desc')
      .then(function(books) {
        books = books || [];
        list.innerHTML = '';
        if (!books.length) {
          list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;">No books in progress - paste a URL above to start one.</div>';
          return;
        }
        return Promise.all(books.map(function(book) {
          return RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + book.id + '&select=id&order=chapter_index.asc').then(function(chapters) {
            return { book: book, total: (chapters || []).length };
          });
        })).then(function(rows) {
          rows.forEach(function(row) {
            var book = row.book, total = row.total;
            var pct = total ? Math.round((book.current_chapter_index / total) * 100) : 0;
            var card = document.createElement('div');
            card.style.cssText = 'padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;';

            var topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;';
            var nameEl = document.createElement('div');
            nameEl.textContent = book.title;
            nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;flex:1;';
            // Delete button - real request after duplicate/dud books piled
            // up in this list from earlier detection-bug retries (each
            // retry creates a genuinely new book row, nothing gets
            // cleaned up automatically). Two clicks required (arms, then
            // confirms) since deletion isn't reversible - no separate
            // popup needed for something this low-risk-but-permanent.
            var delBtn = document.createElement('button');
            delBtn.textContent = '🗑';
            delBtn.title = 'Delete this book';
            delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.4);cursor:pointer;font-size:13px;padding:2px 4px;flex-shrink:0;';
            var armed = false;
            delBtn.onclick = function(e) {
              e.stopPropagation();
              if (!armed) {
                armed = true;
                delBtn.textContent = '❌ Confirm';
                delBtn.style.color = '#E25454';
                setTimeout(function() { armed = false; delBtn.textContent = '🗑'; delBtn.style.color = 'rgba(226,84,84,0.4)'; }, 3000);
                return;
              }
              RPGACE.sb.del('bookworm_books', 'id=eq.' + book.id).then(function() {
                RPGACE.utils.toast('🗑 Deleted: ' + book.title, 'rgba(226,226,236,0.5)', 2500);
                self._refreshWidget();
              }).catch(function(err) { RPGACE.utils.toast('Error: ' + err.message, '#E25454', 3500); });
            };
            topRow.appendChild(nameEl); topRow.appendChild(delBtn);
            topRow.onclick = function() { self._openBook(book.id); };

            // Total is known upfront regardless of source now (URL fetch
            // or TOC extraction both create every chapter row up front),
            // so both cases get the same real progress bar.
            var barOuter = document.createElement('div');
            barOuter.style.cssText = 'height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin:4px 0;';
            var barInner = document.createElement('div');
            barInner.style.cssText = 'height:100%;width:' + pct + '%;background:#9B59B6;';
            barOuter.appendChild(barInner);
            var subEl = document.createElement('div');
            subEl.textContent = 'Chapter ' + Math.min(book.current_chapter_index + 1, total) + ' of ' + total;
            subEl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.4);';
            card.appendChild(topRow); card.appendChild(barOuter); card.appendChild(subEl);
            list.appendChild(card);
          });
        });
      }).catch(function(e) {
        list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  // ── Start a new book: fetch + detect + slice chapters, create rows ──
  // Fixed July 17: RPGACE.sb.insert() sends 'Prefer: return=minimal' and
  // never parses the response as JSON (see RPGACE.sb definition) - it
  // returns the raw, unparsed fetch Response, not the inserted row. Using
  // it here meant book.id was always undefined, so every chapter insert
  // was silently sent with book_id: undefined - failing the NOT NULL
  // constraint server-side while the client never checked the response
  // status, so nothing ever surfaced as an error. Confirmed live: 2 real
  // book rows existed with 0 chapters each, both silently flipped to
  // "complete" the moment _openBook() found no chapter at index 0 (see
  // the fixed logic below). Now uses raw fetch with the same
  // 'Prefer: return=representation' pattern already established by
  // phylumPath._insertNewSteps()/_acceptConceptFusion() for exactly this
  // reason, and checks response.ok at every write instead of assuming
  // success.
  _startBook: function(url) {
    var self = this;
    return fetch('/api/bookworm-fetch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, phylumList: self._phylumListForPrompt() })
    }).then(function(r) { return r.json(); })
      .then(function(result) { return self._createBookFromExtraction(result, url); });
  },

  // Uploaded-PDF entry point - for a legitimately purchased ebook sitting
  // on the user's own device with no fetchable URL. Extracts text
  // entirely client-side via PDF.js (dynamically loaded, never bundled
  // into index.html's own script tags - see _ensurePdfJs), then runs it
  // through the exact same /api/bookworm-fetch detection pipeline as a
  // URL fetch, just skipping the Jina step since the text is already in
  // hand. Real risk, not hidden: PDF text extraction quality depends on
  // how the PDF itself was produced (a scanned/image-only PDF won't
  // extract any real text this way, only a text-layer PDF will).
  _startBookFromPDF: function(title, file) {
    var self = this;
    return self._ensurePdfJs().then(function(pdfjsLib) {
      return file.arrayBuffer().then(function(buffer) {
        return pdfjsLib.getDocument({ data: buffer }).promise.then(function(pdf) {
          var pageTextPromises = [];
          for (var i = 1; i <= pdf.numPages; i++) {
            pageTextPromises.push(pdf.getPage(i).then(function(page) {
              return page.getTextContent().then(function(content) {
                return content.items.map(function(item) { return item.str; }).join(' ');
              });
            }));
          }
          return Promise.all(pageTextPromises);
        });
      }).then(function(pageTexts) {
        var fullText = pageTexts.join('\n\n');
        if (!fullText || fullText.length < 200) throw new Error('Could not extract readable text from this PDF - it may be a scanned/image-only file');
        return fetch('/api/bookworm-fetch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullText: fullText, title: title, phylumList: self._phylumListForPrompt() })
        }).then(function(r) { return r.json(); });
      });
    }).then(function(result) { return self._createBookFromExtraction(result, 'uploaded-pdf'); });
  },

  // Dynamically loads PDF.js at runtime (never as a static <script> tag
  // in index.html - that's reserved for exactly main.js + rpgace_core.js
  // per this project's own rule, adding a 3rd static tag risks the same
  // password-gate race condition). Cached on RPGACE._pdfjsLib so it only
  // loads once per session.
  _ensurePdfJs: function() {
    if (RPGACE._pdfjsLib) return Promise.resolve(RPGACE._pdfjsLib);
    return new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = function() {
        var lib = window.pdfjsLib;
        if (!lib) { reject(new Error('PDF.js failed to load')); return; }
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        RPGACE._pdfjsLib = lib;
        resolve(lib);
      };
      script.onerror = function() { reject(new Error('Could not load PDF.js from CDN')); };
      document.head.appendChild(script);
    });
  },

  _phylumListForPrompt: function() {
    var pp = RPGACE.modules.phylumPath;
    return pp.ENABLED_PHYLA.map(function(n) { return n + '. ' + RPGACE.utils.phylumContext(n); }).join('\n');
  },

  // Shared by _startBook (URL) and _startBookFromPDF (upload) - both hit
  // the same /api/bookworm-fetch detection pipeline and land here with
  // an identical result shape (chapters already have real text, plus
  // keywords/suggestedPhylum from Function 1's guidance). One insert
  // path, one confirmation screen, regardless of source.
  _createBookFromExtraction: function(result, sourceUrl) {
    var self = this;
    if (result.error) throw new Error(result.error);
    if (!result.chapters || !result.chapters.length) throw new Error('No chapters detected in this book');
    var pp = RPGACE.modules.phylumPath;
    // Surfaces api/bookworm-fetch.js's server-side gap-detection retry
    // (added July 17, same self-healing pattern as _startBookFromTOC's
    // client-side check) - the retry already ran server-side; this just
    // makes any still-unresolved gap visible instead of silently proceeding.
    if (result.warning) {
      RPGACE.utils.toast(result.warning, '#E2A83D', 8000);
    }

    return fetch(RPGACE.sb.url('bookworm_books'), {
      method: 'POST',
      headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
      body: JSON.stringify({ title: result.title, source_url: sourceUrl, current_chapter_index: 0, status: 'in_progress' })
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error('Book creation failed: ' + t.slice(0, 200)); });
      return r.json();
    }).then(function(bookRows) {
      var book = Array.isArray(bookRows) ? bookRows[0] : bookRows;
      if (!book || !book.id) throw new Error('Book creation did not return an id');

      var chapterRows = result.chapters.map(function(c) {
        return {
          book_id: book.id, chapter_index: c.index, chapter_title: c.title, raw_text: c.text, status: 'pending',
          keywords: c.keywords || [], suggested_phylum: pp.isEnabled(c.suggestedPhylum) ? c.suggestedPhylum : null
        };
      });
      return fetch(RPGACE.sb.url('bookworm_chapters'), {
        method: 'POST',
        headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
        body: JSON.stringify(chapterRows)
      }).then(function(r) {
        if (!r.ok) return r.text().then(function(t) { throw new Error('Chapter creation failed: ' + t.slice(0, 200)); });
        return r.json();
      }).then(function(insertedChapters) {
        if (!insertedChapters || !insertedChapters.length) throw new Error('Chapters did not save correctly');
        self._refreshWidget();
        self._renderStructureFound(book, insertedChapters);
      });
    });
  },

  // TOC-first manual entry - for a physical/owned book with no fetchable
  // URL. Same idea as detectChaptersByOracle() does for a fetched book's
  // front matter, just applied to text the user pastes directly instead
  // of a Jina fetch: Oracle extracts the ordered chapter list from the
  // table of contents, so the total count (and a real progress bar) is
  // known upfront exactly like a URL-fetched book - the only difference
  // is each chapter's raw_text starts empty and gets filled in one at a
  // time as the user provides it (see _renderAddChapterText).
  // Function 1 — Analyze Book Structure. Extended per direct request:
  // beyond just the chapter list, also extracts per-chapter keywords and
  // a best-guess phylum, giving _analyzeChapter() (Function 2) a real
  // head start instead of re-deriving "which phylum" from scratch once
  // per chapter - the two functions share this data on purpose rather
  // than working in isolation.
  _startBookFromTOC: function(title, tocText) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;
    var phylumList = pp.ENABLED_PHYLA.map(function(n) { return n + '. ' + RPGACE.utils.phylumContext(n); }).join('\n');
    var prompt = 'This is a table of contents pasted from a physical book, listing chapter titles/headings/sub-headings (and likely page numbers/dot leaders to ignore).\n\n' +
      'TEXT:\n' + tocText + '\n\n' +
      'Extract the ordered list of REAL chapters (not sub-sections within a chapter, unless the contents page only lists sub-sections - use your judgement on what the actual chapter-level breakdown is). CRITICAL: every top-level "Chapter N" entry you can find MUST get its own output entry, with no gaps in the chapter numbers - never drop or merge a numbered chapter just because you are unsure whether it is "substantial enough", and never silently skip one to save space. If you are running low on output room, shorten titles/keywords first - never shorten the LIST of chapters. For each chapter, also give: 3-6 keywords drawn from that chapter\'s heading/sub-heading text, and a best-guess phylum number from the list below based on those keywords (this is just a starting hint for later insight placement, not a final decision).\n\n' +
      'PHYLA:\n' + phylumList + '\n\n' +
      'Return ONLY JSON: {"chapters": [{"title": "...", "keywords": ["...", "..."], "suggestedPhylum": N}]}';
    // Defensive count check (real bug found July 17: 19 of 26 real chapters
    // came back as valid-looking JSON, 7 missing, scattered not a tail
    // cutoff - the model was silently judging some numbered chapters as
    // "not real chapters" rather than hitting a hard token limit). Scan the
    // raw pasted text for explicit "Chapter N" mentions as a floor - if the
    // model returned meaningfully fewer chapters than that, fail loud
    // instead of silently proceeding with a partial book (rule: never
    // silently swallow a failed/partial result).
    var mentionedNumbers = {};
    var chNumPattern = /chapter\s+(\d+)/gi;
    var cm;
    while ((cm = chNumPattern.exec(tocText)) !== null) { mentionedNumbers[cm[1]] = true; }
    var mentionedCount = Object.keys(mentionedNumbers).length;

    function numbersFoundIn(list) {
      var found = {};
      list.forEach(function(c) {
        var m = /chapter\s+(\d+)/i.exec(c.title || '');
        if (m) found[m[1]] = true;
      });
      return found;
    }
    function chapterNumOf(c) {
      var m = /chapter\s+(\d+)/i.exec(c.title || '');
      return m ? parseInt(m[1], 10) : NaN;
    }

    function commitChapters(finalChapters, stillMissing) {
      // Order by parsed chapter number where every chapter parsed cleanly
      // (a targeted retry can append entries out of original order) -
      // falls back to as-returned order if numbers can't be parsed
      // reliably, rather than risk a wrong sort on unnumbered titles.
      var allParsed = finalChapters.every(function(c) { return !isNaN(chapterNumOf(c)); });
      if (allParsed) {
        finalChapters = finalChapters.slice().sort(function(a, b) { return chapterNumOf(a) - chapterNumOf(b); });
      }
      if (stillMissing.length) {
        RPGACE.utils.toast('Heads up: chapter(s) ' + stillMissing.join(', ') + ' from this table of contents could not be extracted, even after a retry. Check the list below carefully before starting - you may need to add any missing chapter manually later.', '#E2A83D', 8000);
      }

      return fetch(RPGACE.sb.url('bookworm_books'), {
        method: 'POST',
        headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
        body: JSON.stringify({ title: title, source_url: 'manual', current_chapter_index: 0, status: 'in_progress' })
      }).then(function(r) {
        if (!r.ok) return r.text().then(function(t) { throw new Error('Book creation failed: ' + t.slice(0, 200)); });
        return r.json();
      }).then(function(bookRows) {
        var book = Array.isArray(bookRows) ? bookRows[0] : bookRows;
        if (!book || !book.id) throw new Error('Book creation did not return an id');

        var chapterRows = finalChapters.map(function(c, i) {
          return {
            book_id: book.id, chapter_index: i, chapter_title: c.title, raw_text: '', status: 'pending',
            keywords: c.keywords || [], suggested_phylum: pp.isEnabled(c.suggestedPhylum) ? c.suggestedPhylum : null
          };
        });
        return fetch(RPGACE.sb.url('bookworm_chapters'), {
          method: 'POST',
          headers: Object.assign({}, RPGACE.sb.headers(), { 'Prefer': 'return=representation' }),
          body: JSON.stringify(chapterRows)
        }).then(function(r) {
          if (!r.ok) return r.text().then(function(t) { throw new Error('Chapter creation failed: ' + t.slice(0, 200)); });
          return r.json();
        }).then(function(insertedChapters) {
          if (!insertedChapters || !insertedChapters.length) throw new Error('Chapters did not save correctly');
          self._refreshWidget();
          self._renderStructureFound(book, insertedChapters);
        });
      });
    }

    return pp._callGroundWorkerJSON(prompt, 3000).then(function(parsed) {
      var chapters = parsed.chapters || [];
      if (!chapters.length) throw new Error('Could not extract any chapters from that table of contents');

      var missing = Object.keys(mentionedNumbers).filter(function(n) { return !numbersFoundIn(chapters)[n]; });
      if (!mentionedCount || !missing.length) return commitChapters(chapters, []);

      // Self-healing retry (added July 17, alongside the count-check toast):
      // rather than just warning and leaving Alex to notice and manually
      // fix a shortfall, ask the model specifically for the chapter
      // numbers it missed on the first pass and merge the result in - one
      // targeted retry costs far less than a full re-paste, and per the
      // project's "fail loud, don't silently proceed with a partial
      // result" rule the toast still fires if the retry itself comes up
      // short.
      var retryPrompt = 'Same table of contents as before:\n\nTEXT:\n' + tocText + '\n\n' +
        'On a first extraction pass, chapter number(s) ' + missing.join(', ') + ' were missed entirely. Re-scan the text specifically for those chapter numbers and return an entry for each one you can genuinely find (only omit a number if it truly does not appear in this text at all - double check before omitting). Same fields as before: title, 3-6 keywords, suggestedPhylum.\n\n' +
        'PHYLA:\n' + phylumList + '\n\n' +
        'Return ONLY JSON: {"chapters": [{"title": "...", "keywords": ["...", "..."], "suggestedPhylum": N}]}';
      return pp._callGroundWorkerJSON(retryPrompt, 1200).then(function(retryParsed) {
        var merged = chapters.concat(retryParsed.chapters || []);
        var stillMissing = missing.filter(function(n) { return !numbersFoundIn(merged)[n]; });
        return commitChapters(merged, stillMissing);
      }).catch(function() {
        // Retry call itself failed (network/parse) - proceed with the
        // original list rather than blocking book creation entirely, but
        // still warn honestly that the gap is unresolved.
        return commitChapters(chapters, missing);
      });
    });
  },

  // ── Function 1's visible output: confirm what was actually found     ──
  // ── before diving into chapter 1. Real gap found live: extraction     ──
  // ── succeeding silently and jumping straight to "paste chapter 1's    ──
  // ── text" looked exactly like the app had mistaken the table of       ──
  // ── contents itself for chapter 1 - there was no confirmation step    ──
  // ── showing "here's the structure I actually found" in between.       ──
  _renderStructureFound: function(book, chapters) {
    var self = this;
    var tt = RPGACE.modules.taxonomyTree;
    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(600px,95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '📚 Contents Found — ' + book.title;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = chapters.length + ' chapters extracted from the table of contents:';
    box.appendChild(eyebrow); box.appendChild(title);

    var list = document.createElement('div');
    list.style.cssText = 'max-height:45vh;overflow-y:auto;margin-bottom:16px;';
    chapters.sort(function(a, b) { return a.chapter_index - b.chapter_index; }).forEach(function(c) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:8px 10px;margin-bottom:4px;background:rgba(255,255,255,0.02);border-radius:6px;';
      var nameEl = document.createElement('div');
      nameEl.textContent = (c.chapter_index + 1) + '. ' + c.chapter_title;
      nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;';
      row.appendChild(nameEl);
      if (c.keywords && c.keywords.length) {
        var kwEl = document.createElement('div');
        kwEl.textContent = c.keywords.join(', ') + (c.suggested_phylum && tt ? ' — ' + tt.PHYLUM_NAMES[c.suggested_phylum] : '');
        kwEl.style.cssText = 'font-size:10px;color:rgba(155,89,182,0.6);margin-top:2px;';
        row.appendChild(kwEl);
      }
      list.appendChild(row);
    });
    box.appendChild(list);

    var startBtn = document.createElement('button');
    startBtn.textContent = '▶ Start Chapter 1';
    startBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    startBtn.onclick = function() { overlay.remove(); self._openCurrentChapter(book.id); };
    box.appendChild(startBtn);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'display:block;width:100%;margin-top:8px;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // Navigates back to the Dashboard - shared by every Bookworm overlay's
  // Exit button (added July 19, per direct request) so leaving mid-flow
  // always lands somewhere useful instead of just removing the overlay
  // and leaving whatever page happened to be underneath. Background
  // analysis (_continueAnalyzingInBackground) isn't tied to the overlay's
  // lifetime anyway - it keeps running regardless of navigation.
  _goToDashboard: function() {
    if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.dashboard);
  },

  // ── Re-entry point: clicking a book card shows its full chapter list ──
  // (added July 19, per direct request) - every chapter, its real status
  // (reuses the existing bookworm_chapters.status field, already tracked
  // for every chapter regardless of source), clickable straight to any
  // chapter rather than being forced through them in strict order.
  // Internal "keep going" flows (finishing a chapter, saving a chapter's
  // pasted text, starting a fresh book) still want the OLD behavior -
  // jump straight into whatever the current checkpoint is - so that logic
  // is kept separately as _openCurrentChapter, called by those flows
  // instead of this one.
  _openBook: function(bookId) {
    var self = this;
    RPGACE.sb.select('bookworm_books', 'id=eq.' + bookId + '&limit=1').then(function(rows) {
      var book = rows && rows[0];
      if (!book) return;
      RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + bookId + '&order=chapter_index.asc')
        .then(function(allChapters) {
          allChapters = allChapters || [];
          if (!allChapters.length) {
            RPGACE.utils.toast('This book has no chapters stored - something went wrong when it was created. Delete it and try again.', '#E25454', 5500);
            return;
          }
          self._renderChapterList(book, allChapters);
        });
    });
  },

  // ── Chapter list: tick per chapter + click-to-jump to any of them ──
  _renderChapterList: function(book, chapters) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(600px,95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '📖 ' + book.title;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = 'Chapters — tap any to jump straight there';
    box.appendChild(eyebrow); box.appendChild(title);

    var list = document.createElement('div');
    list.style.cssText = 'max-height:60vh;overflow-y:auto;margin-bottom:16px;';
    chapters.slice().sort(function(a, b) { return a.chapter_index - b.chapter_index; }).forEach(function(c) {
      var row = document.createElement('div');
      var isCurrent = c.chapter_index === book.current_chapter_index && c.status !== 'complete';
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 10px;margin-bottom:4px;background:rgba(255,255,255,0.02);border:1px solid ' + (isCurrent ? 'rgba(61,170,110,0.35)' : 'rgba(255,255,255,0.06)') + ';border-radius:6px;cursor:pointer;';

      var tick, statusLabel;
      if (c.status === 'complete') { tick = '✅'; statusLabel = 'Complete'; }
      else if (!c.raw_text) { tick = '✍️'; statusLabel = 'Needs chapter text'; }
      else if (c.insights && c.insights.length) { tick = '🔄'; statusLabel = 'In progress — insights awaiting review'; }
      else if (c.status === 'in_progress') { tick = '🔄'; statusLabel = 'Analyzing...'; }
      else { tick = '⏳'; statusLabel = 'Not started'; }

      var tickEl = document.createElement('div');
      tickEl.textContent = tick;
      tickEl.style.cssText = 'font-size:14px;flex-shrink:0;';
      var textWrap = document.createElement('div');
      textWrap.style.cssText = 'flex:1;min-width:0;';
      var nameEl = document.createElement('div');
      nameEl.textContent = (c.chapter_index + 1) + '. ' + c.chapter_title + (isCurrent ? ' — → Continue here' : '');
      nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;';
      var subEl = document.createElement('div');
      subEl.textContent = statusLabel;
      subEl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.4);';
      textWrap.appendChild(nameEl); textWrap.appendChild(subEl);
      row.appendChild(tickEl); row.appendChild(textWrap);

      row.onclick = function() {
        overlay.remove();
        if (c.status === 'complete') {
          self._renderChapterSummary(book, c);
        } else if (!c.raw_text) {
          self._renderAddChapterText(book, c);
        } else if (c.insights) {
          self._renderInsightReview(book, c);
        } else {
          self._renderChapterRead(book, c);
        }
      };
      list.appendChild(row);
    });
    box.appendChild(list);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'display:block;width:100%;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Read-only view for an already-complete chapter: what was decided ──
  // on each of its insights. Nothing here can be re-run or re-approved -
  // per direct confirmation, a complete chapter is a historical record,
  // not something to reopen for editing.
  _renderChapterSummary: function(book, chapter) {
    var self = this;
    var tt = RPGACE.modules.taxonomyTree;
    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(600px,95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '✅ ' + book.title;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = chapter.chapter_title;
    box.appendChild(eyebrow); box.appendChild(title);

    var insights = chapter.insights || [];
    var list = document.createElement('div');
    list.style.cssText = 'max-height:55vh;overflow-y:auto;margin-bottom:16px;';
    if (!insights.length) {
      var noneEl = document.createElement('div');
      noneEl.textContent = 'No insights were extracted from this chapter.';
      noneEl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.4);';
      list.appendChild(noneEl);
    }
    insights.forEach(function(insight, i) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:9px 10px;margin-bottom:6px;background:rgba(255,255,255,0.02);border-radius:6px;';
      var decisionTag = { approved: '✓ Approved', rejected: '✗ Rejected', edited: '✎ Edited' }[insight.decision] || insight.decision || '—';
      var decisionColor = insight.decision === 'rejected' ? '#E25454' : '#3DAA6E';
      // leafStatus (added July 19, alongside the background leaf-creation
      // queue) - an approved insight's decision can be set well before its
      // actual taxonomy_tree write lands or fails in the background, so
      // this view (the one place a chapter's insights are reviewed after
      // the fact) surfaces that honestly rather than showing "Approved"
      // as if the leaf definitely exists.
      var leafTag = '';
      if (insight.decision === 'approved' || insight.decision === 'edited') {
        if (insight.leafStatus === 'pending') leafTag = ' <span style="color:#E2A83D;">(leaf still writing...)</span>';
        else if (insight.leafStatus === 'failed') leafTag = ' <span style="color:#E25454;">(⚠️ leaf write failed)</span>';
      }
      var head = document.createElement('div');
      head.innerHTML = '<span style="color:' + decisionColor + ';font-weight:700;">' + decisionTag + '</span>' + leafTag +
        (insight.phylumNumber && tt ? ' <span style="color:rgba(155,89,182,0.7);">— ' + (tt.PHYLUM_NAMES[insight.phylumNumber] || 'Phylum ' + insight.phylumNumber) + '</span>' : '');
      head.style.cssText = 'font-size:11px;margin-bottom:4px;';
      var textEl = document.createElement('div');
      textEl.textContent = insight.text;
      textEl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.7);line-height:1.5;';
      row.appendChild(head); row.appendChild(textEl);
      if (insight.leafStatus === 'failed') {
        var retryBtn = document.createElement('button');
        retryBtn.textContent = '🔁 Retry Leaf Creation';
        retryBtn.style.cssText = 'margin-top:6px;padding:5px 10px;background:rgba(226,84,84,0.1);border:1px solid rgba(226,84,84,0.3);border-radius:6px;color:#E25454;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        retryBtn.onclick = function() {
          retryBtn.disabled = true; retryBtn.textContent = '⏳ Retrying...';
          self._patchChapterInsightAt(chapter.id, i, function(current) { return Object.assign({}, current, { leafStatus: 'pending' }); })
            .then(function() { return self._queueLeafCreation(chapter.id, i, insight); })
            .then(function() {
              retryBtn.textContent = '✓ Retried - reopen to confirm';
            }).catch(function(e) {
              retryBtn.disabled = false; retryBtn.textContent = '🔁 Retry Leaf Creation';
              RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500);
            });
        };
        row.appendChild(retryBtn);
      }
      list.appendChild(row);
    });
    box.appendChild(list);

    var backBtn = document.createElement('button');
    backBtn.textContent = '← Back to chapter list';
    backBtn.style.cssText = 'width:100%;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
    backBtn.onclick = function() { overlay.remove(); self._openBook(book.id); };
    box.appendChild(backBtn);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'display:block;width:100%;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Open a book at its current checkpoint (internal "keep going" use ──
  // only - see _openBook above for the click-a-book-card entry point).
  // Fetches ALL of this book's chapters once (not just the current one)
  // so a genuine zero-chapters book (only possible via the bug above, now
  // fixed - kept as a defensive check) can be told apart from having
  // legitimately finished every chapter. Previously both cases looked
  // identical (no chapter row at the current index), so a broken book
  // silently got marked "complete" instead of surfacing an error.
  _openCurrentChapter: function(bookId) {
    var self = this;
    RPGACE.sb.select('bookworm_books', 'id=eq.' + bookId + '&limit=1').then(function(rows) {
      var book = rows && rows[0];
      if (!book) return;
      RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + bookId + '&order=chapter_index.asc')
        .then(function(allChapters) {
          allChapters = allChapters || [];
          if (!allChapters.length) {
            RPGACE.utils.toast('This book has no chapters stored - something went wrong when it was created. Delete it and try again.', '#E25454', 5500);
            return;
          }
          var chapter = allChapters.find(function(c) { return c.chapter_index === book.current_chapter_index; });
          if (!chapter) {
            // Every chapter row exists upfront now, whether from a URL
            // fetch or a pasted table of contents (_startBookFromTOC) -
            // no chapter at this index always genuinely means finished.
            self._markBookComplete(book);
            return;
          }
          if (!chapter.raw_text) {
            // TOC-extracted chapters start with empty raw_text until the
            // user provides that specific chapter's actual body text.
            self._renderAddChapterText(book, chapter);
          } else if (chapter.insights) {
            self._renderInsightReview(book, chapter);
          } else {
            self._renderChapterRead(book, chapter);
          }
        });
    });
  },

  // Splits text into chunks safe to round-trip through one Oracle call
  // without hitting the documented 504 bug (CLAUDE.md: response length
  // scales the failure - 700 tokens works, 1200 truncates, 1800 fails
  // outright). A whole chapter is far past that, so each chunk is capped
  // small enough that even a same-length reformatted output stays well
  // under the proven-safe zone. Only ever breaks on whitespace - never
  // mid-word, so no chunk boundary can itself introduce a word-splitting
  // artifact of the exact kind this feature is trying to fix.
  _chunkTextForFormatting: function(text, maxChunkChars) {
    var words = text.split(/(\s+)/); // keep whitespace tokens so rejoining is exact
    var chunks = [];
    var current = '';
    words.forEach(function(token) {
      if (current.length + token.length > maxChunkChars && current.length > 0) {
        chunks.push(current);
        current = token;
      } else {
        current += token;
      }
    });
    if (current) chunks.push(current);
    return chunks;
  },

  // ── Reader-friendly formatting: whitespace/paragraph cleanup ONLY  ──
  // (added July 19, per direct request) - fixes PDF-extraction artifacts
  // (words split apart by a stray space, e.g. "M usical" -> "Musical";
  // irregular whitespace; missing paragraph breaks) without changing,
  // adding, removing, or reordering a single word. Chunked (see
  // _chunkTextForFormatting above) to stay clear of the documented 504
  // bug rather than risk it on a full chapter in one call. Cached to
  // bookworm_chapters.formatted_text so it only ever runs once per
  // chapter - re-opening the chapter reuses the cached version.
  _formatChapterForReading: function(chapter) {
    var self = this;
    if (chapter.formatted_text) return Promise.resolve(chapter.formatted_text);
    var pp = RPGACE.modules.phylumPath;
    var chunks = self._chunkTextForFormatting(chapter.raw_text, 1800);
    var results = new Array(chunks.length);
    var chain = Promise.resolve();
    chunks.forEach(function(chunk, i) {
      chain = chain.then(function() {
        var prompt = 'This is raw text extracted from a PDF book page. It has whitespace artifacts from PDF extraction: some words got split apart by a stray inserted space (e.g. "M usical" should read "Musical", "T his" should read "This"), and there may be irregular multiple spaces or missing paragraph breaks.\n\n' +
          'TEXT:\n' + chunk + '\n\n' +
          'Reformat this text for reading comfort ONLY. STRICT RULES: (1) Do NOT add, remove, reorder, paraphrase, or reword ANY word - every single word from the original must appear, unchanged, in the exact same order. (2) ONLY fix: words split apart by a stray space (rejoin into the real word), irregular/multiple whitespace (normalize), and paragraph breaks (blank line) at natural boundaries. (3) Keep every figure caption, footnote, exercise number, and page artifact exactly as worded - just give normal spacing, never delete anything.\n\n' +
          'Before answering, verify: (1) same words, same order, nothing added or removed; (2) every split-word join forms a real recognizable word, not a guess; (3) paragraph breaks sit at genuine boundaries; (4) no whitespace artifact left unfixed; (5) nothing lost at the start/end of this excerpt. Fix any failed check before responding.\n\n' +
          'Return ONLY the reformatted text - no explanation, no markdown, no commentary.';
        // Mechanical whitespace job → Haiku tier (July 19, ~1/4 cost).
        return pp._callGroundWorkerText(prompt, 900, pp.MECHANICAL_MODEL).then(function(cleaned) {
          results[i] = cleaned.trim() || chunk;
        }).catch(function(e) {
          console.warn('[bookworm] formatting chunk ' + i + ' failed, keeping raw:', e.message);
          results[i] = chunk;
        });
      });
    });
    return chain.then(function() {
      var formatted = results.join('\n\n');
      return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, { formatted_text: formatted })
        .then(function() { return formatted; })
        .catch(function() { return formatted; }); // still usable even if the cache write fails
    });
  },

  // ── Chapter read view: full text, then a single "I've read this" button ──
  _renderChapterRead: function(book, chapter) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(640px,95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '📖 ' + book.title;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = chapter.chapter_title;
    box.appendChild(eyebrow); box.appendChild(title);

    var textBox = document.createElement('div');
    textBox.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.7);line-height:1.7;background:rgba(255,255,255,0.02);border-radius:8px;padding:14px;margin-bottom:16px;max-height:50vh;overflow-y:auto;';
    var showingFormatted = false;
    textBox.textContent = chapter.raw_text;
    box.appendChild(textBox);

    var formatBtn = document.createElement('button');
    formatBtn.textContent = chapter.formatted_text ? '✨ Show Reader-Friendly Version' : '✨ Clean Up Formatting for Reading';
    formatBtn.style.cssText = 'width:100%;padding:9px;margin-bottom:8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    formatBtn.onclick = function() {
      if (showingFormatted) {
        textBox.textContent = chapter.raw_text;
        showingFormatted = false;
        formatBtn.textContent = '✨ Show Reader-Friendly Version';
        return;
      }
      if (chapter.formatted_text) {
        textBox.textContent = chapter.formatted_text;
        showingFormatted = true;
        formatBtn.textContent = '📄 Show Original';
        return;
      }
      formatBtn.disabled = true; formatBtn.textContent = '⏳ Formatting for readability...';
      self._formatChapterForReading(chapter).then(function(formatted) {
        chapter.formatted_text = formatted;
        textBox.textContent = formatted;
        showingFormatted = true;
        formatBtn.disabled = false;
        formatBtn.textContent = '📄 Show Original';
      }).catch(function(e) {
        formatBtn.disabled = false; formatBtn.textContent = '✨ Clean Up Formatting for Reading';
        RPGACE.utils.toast('Error formatting: ' + e.message, '#E25454', 3500);
      });
    };
    box.appendChild(formatBtn);

    var readBtn = document.createElement('button');
    readBtn.textContent = "✓ I've Read This — Show Insights";
    readBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    readBtn.onclick = function() {
      // Extraction runs in the background from the moment this is clicked
      // (added July 19, per direct request) - doesn't wait for insight 1
      // like the review flow still does further down the pipeline. Errors
      // still surface as a toast even though the overlay's already gone;
      // RPGACE.utils.toast isn't tied to this overlay's lifetime.
      RPGACE.utils.toast('📖 Analyzing "' + chapter.chapter_title + '" in the background - check back via the book\'s chapter list when ready.', '#9B59B6', 4500);
      overlay.remove();
      self._goToDashboard();
      self._analyzeChapter(book, chapter).catch(function(e) {
        RPGACE.utils.toast('Error analyzing "' + chapter.chapter_title + '": ' + e.message, '#E25454', 4500);
      });
    };
    box.appendChild(readBtn);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'display:block;width:100%;margin-top:8px;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── TOC-extracted chapters only: this chapter's title/order is       ──
  // ── already known from _startBookFromTOC - just needs its actual body──
  // ── text, which the user provides one chapter at a time as they      ──
  // ── transcribe/copy it from their physical copy.                     ──
  _renderAddChapterText: function(book, chapter) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '📖 ' + book.title;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    title.textContent = chapter.chapter_title;
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:14px;';
    sub.textContent = 'Paste this chapter\'s actual body text (not the table of contents entry) to continue.';
    box.appendChild(eyebrow); box.appendChild(title); box.appendChild(sub);

    var chapterTextInput = document.createElement('textarea');
    chapterTextInput.placeholder = 'Paste or type this chapter\'s text...';
    chapterTextInput.rows = 8;
    chapterTextInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:12px;';
    box.appendChild(chapterTextInput);

    var warningBox = document.createElement('div');
    warningBox.style.cssText = 'display:none;font-size:11px;color:#E25454;background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.25);border-radius:6px;padding:8px 10px;margin-bottom:10px;';
    box.insertBefore(warningBox, chapterTextInput.nextSibling);

    var addBtn = document.createElement('button');
    addBtn.textContent = '✍️ Save this chapter\'s text';
    addBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
    var confirmedAnyway = false;
    addBtn.onclick = function() {
      var text = chapterTextInput.value.trim();
      if (!text) { RPGACE.utils.toast('Add the chapter\'s text first', '#E25454', 2000); return; }

      // Real, repeated live mistake: the table of contents (dot-leader
      // lines ending in a page number, e.g. "Title . . . . . 12") got
      // pasted here as the chapter's actual text, twice. Catch that
      // pattern before saving instead of relying on the user to notice.
      if (!confirmedAnyway && self._looksLikeTableOfContents(text)) {
        warningBox.textContent = '⚠️ This looks like a table of contents (section titles with page numbers), not the chapter\'s actual prose. Click Save again to save it anyway, or replace it with the real chapter text.';
        warningBox.style.display = 'block';
        confirmedAnyway = true;
        return;
      }
      confirmedAnyway = false;
      warningBox.style.display = 'none';

      addBtn.disabled = true; addBtn.textContent = '⏳ Saving...';
      RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, { raw_text: text }).then(function() {
        overlay.remove();
        self._openCurrentChapter(book.id);
      }).catch(function(e) {
        addBtn.disabled = false; addBtn.textContent = '✍️ Save this chapter\'s text';
        RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500);
      });
    };
    box.appendChild(addBtn);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'display:block;width:100%;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // Heuristic guard against the repeated live mistake of pasting a table
  // of contents instead of a chapter's actual body text: TOC entries
  // reliably look like "Section Title . . . . . 12" (dot-leaders ending
  // in a page number) or "Section Title    12" (title, whitespace, bare
  // number at end of line) - real prose essentially never has multiple
  // lines shaped like that. 3+ matching lines is treated as a strong
  // signal, not proof - the caller still lets the user save anyway on a
  // second click rather than hard-blocking it.
  _looksLikeTableOfContents: function(text) {
    var lines = text.split('\n');
    var tocLikeLines = lines.filter(function(line) {
      return /\.{3,}\s*\d{1,4}\s*$/.test(line) || /\S {2,}\d{1,4}\s*$/.test(line);
    });
    return tocLikeLines.length >= 3;
  },

  // ══════════════════════════════════════════════════════════════════
  // Chapter analysis: extract every distinct insight, find each one's
  // most-related phylum (cascading through the other enabled phyla for
  // anything that doesn't fit, then a final broad 21-phylum search for
  // genuine orphans), and a Council-of-5 confidence score on every
  // placement before it's ever shown to the user. Cached on
  // bookworm_chapters.insights once done - never re-run on resume.
  // ══════════════════════════════════════════════════════════════════
  _analyzeChapter: function(book, chapter) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;

    var extractPrompt = 'This is one chapter of a book being studied for a music-production knowledge base.\n\n' +
      'CHAPTER: "' + chapter.chapter_title + '"\n\n' +
      'TEXT:\n' + chapter.raw_text.slice(0, 12000) + '\n\n' +
      'List every genuinely distinct, teachable insight in this chapter - as many or as few as are actually present, do not pad or split one idea into several. Restate each in your own words as a standalone fact/technique, not a verbatim quote.\n\n' +
      'Return ONLY JSON: {"insights": ["...", "..."]}';

    // Fixed same session as a real report: a 13-insight chapter took
    // ~7 minutes before ANYTHING appeared, because the original version
    // chained every insight's full placement cascade (each with up to 3
    // reword-retry Oracle calls) before ever resolving. Now only the
    // FIRST insight is awaited here - the rest continue in the
    // background via _continueAnalyzingInBackground(), appending to
    // Supabase as each one finishes, so the review UI can show insight 1
    // immediately and poll for the next one instead of blocking on all
    // of them.
    return pp._callGroundWorkerJSON(extractPrompt, 1200).then(function(parsed) {
      var insightTexts = parsed.insights || [];
      if (!insightTexts.length) {
        return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, {
          insights: [], status: 'in_progress', current_insight_index: 0, analysis_complete: true
        }).then(function() {
          return Object.assign({}, chapter, { insights: [], current_insight_index: 0, analysis_complete: true });
        });
      }

      // Function 1 (_startBookFromTOC) already produced a keyword-based
      // suggested_phylum for this chapter from its heading/sub-heading
      // text - use it directly instead of re-running the same "which
      // phylum" judgement call from scratch. Real merge point between
      // the two functions, not just a UI convenience: Function 1's
      // structural analysis speeds up and grounds Function 2's
      // placement, one fewer Oracle round trip per chapter.
      var primaryPhylumPromise = chapter.suggested_phylum
        ? Promise.resolve(chapter.suggested_phylum)
        : pp._callGroundWorkerJSON(
            'CHAPTER: "' + chapter.chapter_title + '"\n\nSUMMARY OF ITS INSIGHTS:\n' + insightTexts.join('\n- ') + '\n\n' +
            'Which ONE of these phyla is this chapter MOST closely related to overall?\n' +
            pp.ENABLED_PHYLA.map(function(n) { return n + '. ' + RPGACE.utils.phylumContext(n); }).join('\n') + '\n\n' +
            'Return ONLY JSON: {"phylumNumber": N}',
            200
          ).then(function(phylumParsed) { return phylumParsed.phylumNumber; });

      return primaryPhylumPromise.then(function(primaryPhylum) {
        var remainingPhyla = pp.ENABLED_PHYLA.filter(function(n) { return n !== primaryPhylum; });

        // Persist the FULL remaining insight-text list and the resolved
        // primaryPhylum up front (added July 19, per direct request to
        // harden against a closed tab) - this is what _resumeChapterAnalysis
        // reads back if the browser tab that started this closes mid-batch.
        // Without this, the raw insight texts only ever lived in JS memory -
        // if the tab closed, anything not yet placed was gone for good,
        // with no way to resume without re-extracting from scratch and
        // losing whatever the user had already reviewed.
        return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, {
          pending_insight_texts: insightTexts.slice(1), suggested_phylum: primaryPhylum, analysis_heartbeat: new Date().toISOString()
        }).then(function() {
          return self._placeInsightCascade(insightTexts[0], primaryPhylum, remainingPhyla, []).then(function(firstPlacement) {
            var insights = [firstPlacement];
            var onlyOne = insightTexts.length === 1;
            return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, {
              insights: insights, status: 'in_progress', current_insight_index: 0, analysis_complete: onlyOne, analysis_heartbeat: new Date().toISOString()
            }).then(function() {
              if (!onlyOne) {
                self._continueAnalyzingInBackground(chapter.id, insightTexts.slice(1), primaryPhylum, remainingPhyla);
              }
              return Object.assign({}, chapter, { insights: insights, current_insight_index: 0, analysis_complete: onlyOne, pending_insight_texts: insightTexts.slice(1) });
            });
          });
        });
      });
    });
  },

  // Fire-and-forget: places insights 2..N one at a time, appending each
  // to bookworm_chapters.insights as it completes rather than holding
  // them all until the whole chapter is done. If anything in this chain
  // fails partway, analysis_complete still gets set on whatever
  // succeeded so far - without that, a mid-batch failure would leave the
  // review UI's polling (_renderWaitingForNextInsight) waiting forever.
  // Also used by _resumeChapterAnalysis - identical logic, just called
  // with remainingTexts freshly read from pending_insight_texts instead
  // of the original tab's in-memory list, which is exactly what makes a
  // resume from a DIFFERENT tab/session possible.
  _continueAnalyzingInBackground: function(chapterId, remainingTexts, primaryPhylum, remainingPhyla) {
    var self = this;
    // Batch-dedup awareness (July 19, Fable audit): seed the running list
    // of leaf names this chapter has already created (works on resume
    // too, where earlier placements aren't in this tab's memory), then
    // append locally as each new one lands. Passed into every placement
    // call so the model can attach to / extend a sibling it just made
    // instead of minting near-duplicate siblings - the audit found one
    // chapter had created 5+ overlapping inversion leaves this way, each
    // individually scored 9/10 because each was placed blind.
    var placedLeaves = [];
    var chain = RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
      var current = rows && rows[0];
      ((current && current.insights) || []).forEach(function(ins) {
        if (ins.newSteps && ins.newSteps.length) placedLeaves.push(ins.newSteps[ins.newSteps.length - 1]);
      });
    }).catch(function() {});
    remainingTexts.forEach(function(insightText, i) {
      chain = chain.then(function() {
        return self._placeInsightCascade(insightText, primaryPhylum, remainingPhyla, placedLeaves.slice()).then(function(placement) {
          if (placement.newSteps && placement.newSteps.length) placedLeaves.push(placement.newSteps[placement.newSteps.length - 1]);
          return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
            var current = rows && rows[0];
            if (!current) return;
            var insights = (current.insights || []).concat([placement]);
            var isLast = (i === remainingTexts.length - 1);
            // Drop the just-placed text from the persisted pending list -
            // this is the resumable checkpoint; slice(1) is safe because
            // this same insightText was always pending_insight_texts[0]
            // (both derived from, and kept in lockstep with, remainingTexts).
            var stillPending = (current.pending_insight_texts || []).slice(1);
            return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapterId, {
              insights: insights, analysis_complete: isLast, pending_insight_texts: stillPending, analysis_heartbeat: new Date().toISOString()
            });
          });
        });
      });
    });
    return chain.catch(function(e) {
      console.warn('[bookworm] background insight analysis failed partway, marking complete with what succeeded so far:', e.message);
      return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapterId, { analysis_complete: true }).catch(function() {});
    });
  },

  // ── Resume a stalled chapter's background analysis (added July 19) ──
  // Reads pending_insight_texts + suggested_phylum FRESH from Supabase
  // (never from JS memory - the whole point is this can run in a NEW tab
  // after the original one closed) and re-enters the exact same
  // _continueAnalyzingInBackground chain. Known residual limitation,
  // honestly flagged rather than solved: there's no server-side lock, so
  // if the ORIGINAL tab is actually still alive and just slow (not truly
  // stalled), clicking Resume could run two chains over the same
  // remaining insights at once. The heartbeat timestamp is meant to make
  // that rare (the UI only offers Resume once the heartbeat has gone
  // stale for a while) but this is a single-user personal tool, not a
  // distributed system - true mutual exclusion isn't built here.
  _resumeChapterAnalysis: function(book, chapter) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;
    return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapter.id + '&limit=1').then(function(rows) {
      var fresh = rows && rows[0];
      if (!fresh) return;
      var pending = fresh.pending_insight_texts || [];
      if (!pending.length) {
        return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, { analysis_complete: true });
      }
      var primaryPhylum = fresh.suggested_phylum;
      var remainingPhyla = pp.ENABLED_PHYLA.filter(function(n) { return n !== primaryPhylum; });
      RPGACE.utils.toast('📖 Resuming analysis of "' + chapter.chapter_title + '" (' + pending.length + ' insight(s) left)...', '#9B59B6', 3500);
      return self._continueAnalyzingInBackground(chapter.id, pending, primaryPhylum, remainingPhyla);
    });
  },

  // Tries the primary phylum first, then keyword-ranked candidates, then a
  // final broad 21-phylum search for genuine orphans.
  //
  // TOKEN-COST RETUNE July 19 (confirmed by Alex after £10 of API credit
  // burned in one testing session): two changes, both evidence-backed.
  // 1. Accept gate 9→7. Real approval history showed every 7-8-scored
  //    placement was approved as-is - the old ≥5 reword band re-sent the
  //    full phylum tree up to 2 extra times per insight (3x cost) without
  //    changing outcomes. Now: ≥7 accepted, 4-6 gets the reword loop,
  //    <4 gets the upgrade check. Council scoring itself is unchanged.
  // 2. Cascade breadth capped: instead of walking ALL other enabled phyla
  //    (each attempt = that phylum's full tree in the prompt), non-primary
  //    candidates are pre-ranked by the free keyword scan and only the top
  //    2 with actual keyword hits are tried before falling through to
  //    _finalPlacementSearch (which is a cheap phylum-NAMES-only call).
  //    A phylum with zero keyword overlap was never going to win a
  //    fits/confidence contest it charges full price to enter.
  _placeInsightCascade: function(insightText, primaryPhylum, remainingPhyla, priorLeaves) {
    var self = this;
    var tryPhylum = function(phylumNumber, text, attemptsLeft) {
      return self._decidePlacementScored(text, phylumNumber, priorLeaves).then(function(decision) {
        if (!decision.fits) return null;
        if (decision.confidenceScore >= 7) return decision;
        if (decision.confidenceScore >= 4 && attemptsLeft > 0) {
          return self._rewordInsight(text).then(function(reworded) {
            return tryPhylum(phylumNumber, reworded, attemptsLeft - 1);
          });
        }
        if (decision.confidenceScore < 4) {
          return self._checkUpgradeable(text, phylumNumber).then(function(upgraded) {
            return upgraded ? self._decidePlacementScored(upgraded, phylumNumber, priorLeaves) : null;
          });
        }
        return decision; // ran out of reword attempts, best effort
      }).catch(function(e) {
        console.warn('[bookworm] placement attempt failed:', e.message);
        return null;
      });
    };

    var ranked = [];
    if (RPGACE.utils._quickPhylaScan) {
      var hits = RPGACE.utils._quickPhylaScan(insightText); // sorted by hits desc, free
      ranked = hits.map(function(m) { return m.num; })
        .filter(function(n) { return n !== primaryPhylum && remainingPhyla.indexOf(n) !== -1; })
        .slice(0, 2);
    }
    var phylaToTry = [primaryPhylum].concat(ranked);
    var chain = Promise.resolve(null);
    phylaToTry.forEach(function(phylumNumber) {
      chain = chain.then(function(found) {
        if (found) return found;
        return tryPhylum(phylumNumber, insightText, 3);
      });
    });

    return chain.then(function(found) {
      if (found) return Object.assign({ text: insightText, decision: 'pending' }, found);
      return self._finalPlacementSearch(insightText).then(function(fallback) {
        if (fallback) return Object.assign({ text: insightText, decision: 'pending' }, fallback);
        return { text: insightText, decision: 'pending', fits: false, confidenceScore: 0 };
      });
    });
  },

  // Combined placement + fit-check + justification + confidence score in
  // one call - keeps this to one Oracle round trip per attempt instead of
  // separate placement/scoring calls, given how many of these can run per
  // chapter (real cost/latency concern, flagged in patch notes).
  // Fixed same session as a live bug: this prompt originally dropped a
  // load-bearing instruction the proven phylumPath.decidePlacement()
  // prompt has always had ("do NOT repeat ranks that already exist in
  // the attach point"). Without it, Oracle returned newSteps as
  // cumulative restatements of the existing path at each step instead of
  // just the new segment names - confirmed live: a real insight came back
  // with newSteps like ["Anatomia", "Anatomia/Pitch & Keyboard Geography",
  // "Anatomia/Pitch & Keyboard Geography/Note Identification & Keyboard
  // Layout", "...the real new leaf name"], which joined into a wall of
  // repeated segments in the review popup - and would have inserted that
  // garbage as literal taxonomy_tree node names if approved. Restored the
  // instruction AND added _sanitizeNewSteps() as a defensive backstop
  // (strips any step that's really a multi-segment path or repeats
  // something already in the attach path) so a future prompt regression
  // can't corrupt the tree even if it slips past the wording again.
  // UNIFIED July 19 (Fable audit): the scored placement engine that
  // lived here (5 checks + numeric confidence + justification) was the
  // best-logged of the three pipelines that existed, so it was promoted
  // to phylumPath.decidePlacementScored as THE single placement engine
  // for every source (book, Oracle chat, Content Intelligence,
  // Encyclopedia sync). This is now a thin delegate kept only so the
  // cascade code above reads unchanged. The old local _sanitizeNewSteps
  // was folded into phylumPath.sanitizePlacement (now also enforced at
  // the _insertNewSteps choke point, which the old one never covered -
  // that gap is exactly how the depth-14 Edit-box corruption got in).
  _decidePlacementScored: function(insightText, phylumNumber, priorLeaves) {
    return RPGACE.modules.phylumPath.decidePlacementScored(insightText, phylumNumber, priorLeaves);
  },

  // Both routed to the Haiku mechanical tier July 19 - one-line rewording
  // is not judgment work, and these fire inside the retry loop where
  // every token multiplies.
  _rewordInsight: function(insightText) {
    var pp = RPGACE.modules.phylumPath;
    var prompt = 'Reword this insight to be clearer and more specifically teachable, same meaning, more concrete:\n\n"' + insightText + '"\n\nReturn ONLY the reworded insight text, nothing else.';
    return pp._callGroundWorkerText(prompt, 150, pp.MECHANICAL_MODEL);
  },

  _checkUpgradeable: function(insightText, phylumNumber) {
    var pp = RPGACE.modules.phylumPath;
    var prompt = 'This insight scored very low for taxonomy placement in ' + RPGACE.utils.phylumContext(phylumNumber) + ':\n\n"' + insightText + '"\n\n' +
      'Is there a genuinely more specific/concrete version of this that WOULD be leaf-worthy, or is it too vague/generic to ever place well? If upgradeable, return the improved version. If not, return null.\n\n' +
      'Return ONLY JSON: {"upgraded": "text or null"}';
    return pp._callGroundWorkerJSON(prompt, 200, pp.MECHANICAL_MODEL).then(function(parsed) { return parsed.upgraded || null; }).catch(function() { return null; });
  },

  // Final fallback for insights that didn't fit any enabled phylum -
  // broad search across all 21, not just the 10 currently enabled.
  _finalPlacementSearch: function(insightText) {
    var tt = RPGACE.modules.taxonomyTree;
    var pp = RPGACE.modules.phylumPath;
    var allPhylaList = Object.keys(tt.PHYLUM_NAMES).map(function(n) { return n + '. ' + tt.PHYLUM_NAMES[n] + ' (' + tt.PHYLUM_ENGLISH[n] + ')'; }).join('\n');
    var prompt = 'This insight did not fit well in any of the currently-active phyla:\n\n"' + insightText + '"\n\n' +
      'Given ALL 21 phyla below, which one genuinely fits best?\n' + allPhylaList + '\n\n' +
      'Return ONLY JSON: {"phylumNumber": N, "justification": "..."}';
    return pp._callGroundWorkerJSON(prompt, 300).then(function(parsed) {
      if (!parsed.phylumNumber) return null;
      return this._decidePlacementScored(insightText, parsed.phylumNumber);
    }.bind(this)).catch(function() { return null; });
  },

  // Safe read-modify-write for a single insight inside
  // bookworm_chapters.insights (added July 19, alongside the background
  // leaf-creation queue below). Always enqueued onto a single shared
  // chain (_chapterWriteQueue) so two writes to the same chapter's
  // insights array can never race each other - critical once approving
  // an insight advances the UI immediately while the actual taxonomy
  // write finishes later in the background: without this, the later
  // write could read a stale array (missing the just-set decision) and
  // clobber it when it writes back.
  _patchChapterInsightAt: function(chapterId, idx, patchFn, extraFields) {
    var self = this;
    self._chapterWriteQueue = (self._chapterWriteQueue || Promise.resolve()).then(function() {
      return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
        var current = rows && rows[0];
        if (!current) return;
        var insights = (current.insights || []).slice();
        if (idx >= insights.length) return;
        insights[idx] = patchFn(insights[idx]);
        var body = Object.assign({ insights: insights }, extraFields || {});
        return RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapterId, body);
      });
    });
    return self._chapterWriteQueue;
  },

  // ── Background leaf-creation queue (added July 19, per direct request) ──
  // Approving an insight now advances the review UI immediately instead
  // of waiting on this - the actual taxonomy_tree write happens here,
  // queued. A single shared chain (_leafQueue, not per-chapter) so
  // _insertNewSteps's chained parent_id inserts never run concurrently
  // with themselves, regardless of how fast someone clicks through
  // several approvals in a row. The final status patch goes through
  // _patchChapterInsightAt above, which is itself globally serialized -
  // together these guarantee the eventual "created"/"failed" write can
  // never race or clobber the "approved" decision advance() already set.
  _queueLeafCreation: function(chapterId, idx, insight) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;
    self._leafQueue = (self._leafQueue || Promise.resolve()).then(function() {
      return pp._insertNewSteps(insight.phylumNumber, insight.attachNode || null, insight.newSteps, insight.explainers, insight.text)
        .then(function() {
          return self._patchChapterInsightAt(chapterId, idx, function(current) {
            return Object.assign({}, current, { leafStatus: 'created' });
          });
        })
        .catch(function(e) {
          // Fail loud (per this project's own rule) rather than silently
          // dropping an approved insight that never actually made it into
          // taxonomy_tree - the toast survives even though the review
          // popup for this specific insight is long gone by the time this
          // resolves.
          console.warn('[bookworm] queued leaf creation failed for insight ' + idx + ':', e.message);
          RPGACE.utils.toast('⚠️ Leaf creation failed for an approved insight ("' + (insight.text || '').slice(0, 60) + '...") - reopen this chapter to check it.', '#E25454', 6000);
          return self._patchChapterInsightAt(chapterId, idx, function(current) {
            return Object.assign({}, current, { leafStatus: 'failed' });
          }).catch(function() {});
        });
    });
    return self._leafQueue;
  },

  // ── Per-insight review: summary, path, justification, Approve/Reject/Edit ──
  _renderInsightReview: function(book, chapter) {
    var self = this;
    var insights = chapter.insights || [];
    var idx = chapter.current_insight_index || 0;

    if (idx >= insights.length) {
      if (chapter.analysis_complete) {
        self._completeChapter(book, chapter);
      } else {
        self._renderWaitingForNextInsight(book, chapter);
      }
      return;
    }
    var insight = insights[idx];
    if (insight.decision === 'approved' || insight.decision === 'rejected' || insight.decision === 'edited') {
      chapter = Object.assign({}, chapter, { current_insight_index: idx + 1 });
      self._renderInsightReview(book, chapter);
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = '📖 ' + book.title + ' — ' + chapter.chapter_title + ' — Insight ' + (idx + 1) + '/' + insights.length;
    box.appendChild(eyebrow);

    if (!insight.fits) {
      var unplaceableBox = document.createElement('div');
      unplaceableBox.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);margin-bottom:14px;';
      unplaceableBox.textContent = 'Could not find a confident home for this insight - skipped rather than forced into a leaf.';
      box.appendChild(unplaceableBox);
    }

    var summary = document.createElement('div');
    summary.style.cssText = 'font-size:13px;color:#E2E2EC;line-height:1.6;margin-bottom:14px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:8px;';
    summary.textContent = insight.text;
    box.appendChild(summary);

    var tt = RPGACE.modules.taxonomyTree;
    var pathLine = document.createElement('div');
    pathLine.style.cssText = 'font-size:11px;color:#3DAA6E;margin-bottom:8px;';
    pathLine.innerHTML = '<strong>Path:</strong> ' + (insight.phylumNumber ? (tt.PHYLUM_NAMES[insight.phylumNumber] || 'Phylum ' + insight.phylumNumber) : '?') +
      (insight.attachPath ? '/' + insight.attachPath.split('/').slice(1).join('/') : '') +
      (insight.newSteps && insight.newSteps.length ? '/' + insight.newSteps.join('/') : '');
    box.appendChild(pathLine);

    if (insight.justification) {
      var justLine = document.createElement('div');
      justLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);font-style:italic;margin-bottom:14px;';
      justLine.textContent = insight.justification + (insight.confidenceScore ? ' (confidence ' + insight.confidenceScore + '/10)' : '');
      box.appendChild(justLine);
    }

    var editWrap = document.createElement('div');
    editWrap.style.cssText = 'display:none;margin-bottom:12px;';
    var editInput = document.createElement('textarea');
    editInput.placeholder = 'Your own path, slash-separated (e.g. Order/Class/Family)...';
    editInput.style.cssText = 'width:100%;min-height:60px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px;outline:none;font-family:Rajdhani,sans-serif;';
    var editSubmit = document.createElement('button');
    editSubmit.textContent = 'Use this path';
    editSubmit.style.cssText = 'margin-top:6px;padding:6px 14px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    editWrap.appendChild(editInput); editWrap.appendChild(editSubmit);
    box.appendChild(editWrap);

    var advance = function(decision, updates) {
      var newInsight = Object.assign({}, insight, { decision: decision }, updates || {});
      var newInsights = insights.slice();
      newInsights[idx] = newInsight;
      var newChapter = Object.assign({}, chapter, { insights: newInsights, current_insight_index: idx + 1 });
      // Safe read-modify-write (added July 19, alongside the background
      // leaf-creation queue below) instead of blindly overwriting the
      // whole insights array from this closure - the queue writes to the
      // same array asynchronously, sometime after the UI has already
      // moved on to a later insight, so a blind write here could clobber
      // a leaf-creation result that landed first.
      self._patchChapterInsightAt(chapter.id, idx, function() { return newInsight; }, { current_insight_index: idx + 1 }).catch(function() {});
      overlay.remove();
      self._renderInsightReview(book, newChapter);
    };

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var approveBtn = document.createElement('button');
    approveBtn.textContent = '✓ Approve';
    approveBtn.disabled = !insight.fits;
    approveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;opacity:' + (insight.fits ? '1' : '0.4') + ';';
    approveBtn.onclick = function() {
      // Advances to the next insight IMMEDIATELY (added July 19, per
      // direct request) - the actual taxonomy_tree write no longer blocks
      // the review flow. Queued instead (_queueLeafCreation) so several
      // approvals in a row never run _insertNewSteps concurrently with
      // itself (it does a chained parent_id insert - unsafe to overlap).
      advance('approved', { leafStatus: 'pending' });
      self._queueLeafCreation(chapter.id, idx, insight);
    };
    var rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#E25454;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    rejectBtn.onclick = function() { advance('rejected'); };
    var editBtn = document.createElement('button');
    editBtn.textContent = '✎ Edit';
    editBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(155,89,182,0.25);border-radius:8px;color:#9B59B6;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    editBtn.onclick = function() { editWrap.style.display = 'block'; };
    editSubmit.onclick = function() {
      var steps = editInput.value.split('/').map(function(s) { return s.trim(); }).filter(Boolean);
      if (!steps.length) { RPGACE.utils.toast('Enter at least one path step', '#E25454', 2000); return; }
      editSubmit.disabled = true; editSubmit.textContent = 'Creating...';
      var pp = RPGACE.modules.phylumPath;
      pp._insertNewSteps(insight.phylumNumber, insight.attachNode || null, steps, steps.map(function() { return ''; }), insight.text)
        .then(function() { advance('edited', { newSteps: steps }); })
        .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500); editSubmit.disabled = false; editSubmit.textContent = 'Use this path'; });
    };

    btnRow.appendChild(approveBtn); btnRow.appendChild(rejectBtn); btnRow.appendChild(editBtn);
    box.appendChild(btnRow);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'display:block;width:100%;margin-top:10px;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    closeBtn.onclick = function() { overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // Shown when the next insight isn't ready yet - background analysis
  // (_continueAnalyzingInBackground above) is still working on it. Polls
  // Supabase every few seconds instead of blocking the whole chapter on
  // every insight finishing before showing anything - real report: a
  // 13-insight chapter took ~7 minutes before the FIRST insight appeared.
  _renderWaitingForNextInsight: function(book, chapter) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.id = 'bookworm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(480px,95vw);font-family:Rajdhani,sans-serif;text-align:center;';
    var msg = document.createElement('div');
    msg.textContent = '⏳ Still analyzing the next insight in the background...';
    msg.style.cssText = 'font-size:13px;color:rgba(226,226,236,0.6);margin-bottom:14px;';
    box.appendChild(msg);

    // Resume button (added July 19, per direct request to harden against
    // a closed tab): background analysis is a client-side promise chain,
    // not a server job - if the tab that started it closes, this screen
    // would otherwise poll forever with nothing actually running. Hidden
    // until the heartbeat (_continueAnalyzingInBackground/_analyzeChapter
    // update it after every insight) has gone stale for a while, so a
    // chapter that's just genuinely slow doesn't get falsely flagged.
    var resumeBtn = document.createElement('button');
    resumeBtn.textContent = '▶ Resume Analysis';
    resumeBtn.style.cssText = 'display:none;width:100%;margin-bottom:10px;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    box.appendChild(resumeBtn);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Exit to Dashboard';
    closeBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    var stopped = false;
    closeBtn.onclick = function() { stopped = true; overlay.remove(); self._goToDashboard(); };
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var idx = chapter.current_insight_index || 0;
    var STALL_MS = 45000;
    var poll = function() {
      if (stopped) return;
      RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapter.id + '&limit=1').then(function(rows) {
        if (stopped) return;
        var fresh = rows && rows[0];
        if (!fresh) return;
        if ((fresh.insights || []).length > idx || fresh.analysis_complete) {
          overlay.remove();
          self._renderInsightReview(book, fresh);
          return;
        }
        var heartbeatMs = fresh.analysis_heartbeat ? new Date(fresh.analysis_heartbeat).getTime() : 0;
        var staleFor = heartbeatMs ? (Date.now() - heartbeatMs) : 0;
        if (heartbeatMs && staleFor > STALL_MS) {
          msg.textContent = '⏳ No progress in over ' + Math.round(staleFor / 1000) + 's - looks stalled (likely the tab that started this was closed).';
          resumeBtn.style.display = 'block';
          resumeBtn.onclick = function() {
            resumeBtn.disabled = true; resumeBtn.textContent = '⏳ Resuming...';
            self._resumeChapterAnalysis(book, fresh).catch(function(e) {
              RPGACE.utils.toast('Error resuming: ' + e.message, '#E25454', 3500);
            }).then(function() {
              if (resumeBtn.isConnected) { resumeBtn.disabled = false; resumeBtn.textContent = '▶ Resume Analysis'; }
            });
          };
        }
        setTimeout(poll, 4000);
      }).catch(function() { if (!stopped) setTimeout(poll, 4000); });
    };
    setTimeout(poll, 4000);
  },

  _completeChapter: function(book, chapter) {
    var self = this;
    RPGACE.sb.update('bookworm_chapters', 'id=eq.' + chapter.id, { status: 'complete' })
      .then(function() {
        var nextIndex = book.current_chapter_index + 1;
        return RPGACE.sb.update('bookworm_books', 'id=eq.' + book.id, { current_chapter_index: nextIndex });
      }).then(function() {
        RPGACE.utils.toast('✓ Chapter complete: ' + chapter.chapter_title, '#3DAA6E', 3000);
        self._refreshWidget();
        self._openCurrentChapter(book.id);
      }).catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500); });
  },

  _markBookComplete: function(book) {
    var self = this;
    RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + book.id)
      .then(function(chapters) {
        chapters = chapters || [];
        var totalInsights = 0;
        var phyla = {};
        chapters.forEach(function(c) {
          (c.insights || []).forEach(function(i) {
            if (i.decision === 'approved' || i.decision === 'edited') { totalInsights++; if (i.phylumNumber) phyla[i.phylumNumber] = true; }
          });
        });
        return RPGACE.sb.insert('bibliography', {
          book_id: book.id, title: book.title, source_url: book.source_url,
          total_chapters: chapters.length, total_insights_placed: totalInsights,
          phyla_touched: Object.keys(phyla).map(Number)
        }).then(function() {
          return RPGACE.sb.update('bookworm_books', 'id=eq.' + book.id, { status: 'complete', completed_at: new Date().toISOString() });
        });
      }).then(function() {
        RPGACE.utils.toast('📚 ' + book.title + ' — complete! Added to Bibliography.', '#3DAA6E', 5000);
        self._refreshWidget();
        self._injectBibliographySection();
      }).catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3500); });
  },

  // ── Bibliography section on the Research page ─────────────────────
  _injectBibliographySection: function() {
    var self = this;
    var existing = document.getElementById('bookworm-bibliography');
    var page = document.getElementById('page-research') || document.getElementById('page-learning');
    if (!page) return;
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'bookworm-bibliography';
    wrap.style.cssText = 'background:rgba(155,89,182,0.03);border:1px solid rgba(155,89,182,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';
    var hdr = document.createElement('div');
    hdr.className = 'section-title';
    hdr.style.cssText = 'font-size:14px;margin-bottom:10px;';
    hdr.textContent = '📚 Bibliography';
    wrap.appendChild(hdr);

    var list = document.createElement('div');
    list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
    wrap.appendChild(list);
    page.insertBefore(wrap, page.firstChild);

    RPGACE.sb.select('bibliography', 'order=completed_at.desc').then(function(rows) {
      rows = rows || [];
      list.innerHTML = '';
      if (!rows.length) { list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;">No completed books yet.</div>'; return; }
      var tt = RPGACE.modules.taxonomyTree;
      rows.forEach(function(row) {
        var card = document.createElement('div');
        card.style.cssText = 'padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;';
        var nameEl = document.createElement('div');
        nameEl.textContent = row.title;
        nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;';
        var subEl = document.createElement('div');
        var phylaNames = (row.phyla_touched || []).map(function(n) { return tt ? tt.PHYLUM_NAMES[n] : n; }).join(', ');
        subEl.textContent = row.total_chapters + ' chapters, ' + row.total_insights_placed + ' insights placed' + (phylaNames ? ' — ' + phylaNames : '');
        subEl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.4);';
        card.appendChild(nameEl); card.appendChild(subEl);
        list.appendChild(card);
      });
    }).catch(function(e) { list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>'; });
  },

});
/* ===END:bookworm=== */
/* ===END_DOMAIN:LEARNING=== */

/* ===DOMAIN:CONFIG=== */

/* ===MODULE:config=== */
RPGACE.register('config', {

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
        research:     'learning',
        encyclopedia: 'encyclopedia',
        journal:      'journal',
        phylumPath:   'phylumpath',
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
      select: function(table, params) {
        return fetch(RPGACE.sb.url(table) + (params ? '?' + params : ''), {
          headers: RPGACE.sb.headers(),
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
      // Don't cache writes-heavy tables
      var noCache = ['content_productions','conid_pot','journal_entries','intel_jobs'];
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

    // Streaming Oracle client — replaces callOracle for new callers
    RPGACE.streamOracle = function(messages, system, onChunk, onDone) {
      fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, system: system || '', stream: true })
      }).then(function(res) {
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        function pump() {
          reader.read().then(function(result) {
            if (result.done) { if (onDone) onDone(buffer); return; }
            var chunk = decoder.decode(result.value);
            var lines = chunk.split('\n');
            lines.forEach(function(line) {
              if (line.startsWith('data: ')) {
                var data = line.slice(6);
                if (data === '[DONE]') return;
                try {
                  var parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
                    buffer += parsed.delta.text;
                    if (onChunk) onChunk(parsed.delta.text, buffer);
                  }
                } catch(e) {}
              }
            });
            pump();
          }).catch(function(e) { console.warn('[RPGACE] stream error:', e.message); });
        }
        pump();
      }).catch(function(e) { console.warn('[RPGACE] streamOracle error:', e.message); });
    };

    console.log('[RPGACE:config] Cache + streaming Oracle ready');

    // Attach global phyla-scan observer directly — rpgace:ready may have
    // already fired before this code runs, so we don't wait for it.
    // _initPhylaObserver has its own self-retry if #send-btn isn't in the DOM yet.
    setTimeout(function() {
      if (RPGACE.utils._initPhylaObserver) RPGACE.utils._initPhylaObserver();
    }, 500);

    // July 16: nav-scroll arrows — .nav-tabs is a horizontally-scrollable
    // flex row on mobile (drag-to-scroll only), found hard to press/use
    // reliably on a touchscreen, especially once Phylum Path became the
    // 9th tab. Dynamically wraps the existing .nav-tabs with tap targets
    // either side instead of touching main.js's nav markup - CSS in
    // style.css hides these on desktop widths (display:none by default,
    // shown only under the same 768px breakpoint the nav-tab sizing uses).
    setTimeout(function() {
      var tabs = document.querySelector('.nav-tabs');
      if (!tabs || tabs.dataset.scrollArrowsAdded) return;
      tabs.dataset.scrollArrowsAdded = '1';
      var nav = tabs.parentElement;
      if (!nav) return;
      var leftBtn = document.createElement('button');
      leftBtn.className = 'nav-scroll-arrow';
      leftBtn.textContent = '‹';
      leftBtn.onclick = function() { tabs.scrollBy({ left: -120, behavior: 'smooth' }); };
      var rightBtn = document.createElement('button');
      rightBtn.className = 'nav-scroll-arrow';
      rightBtn.textContent = '›';
      rightBtn.onclick = function() { tabs.scrollBy({ left: 120, behavior: 'smooth' }); };
      nav.insertBefore(leftBtn, tabs);
      nav.appendChild(rightBtn);
    }, 600);

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

    // Hook into page:show for the research/learning tab
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning' || name === 'research') {
        // Run at multiple intervals to catch main.js finishing its render
        [300, 800, 1500, 3000].forEach(function(d) {
          setTimeout(applyIntelUI, d);
        });
      }
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

    // Streaming sendChat intercept
    setTimeout(function() {
      if (typeof window.sendChat === 'function' && !window._sendChatPatched) {
        window._sendChatPatched = true;
        var _origSend = window.sendChat;
        window.sendChat = function() {
          var input = document.getElementById('chat-input') || document.querySelector('textarea[id*="chat"]');
          if (!input || !input.value.trim() || !RPGACE.streamOracle) {
            return _origSend.apply(this, arguments);
          }
          var userText = input.value.trim();
          var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box');
          if (!chatBox) return _origSend.apply(this, arguments);

          // Add user message to UI
          var userMsg = document.createElement('div');
          userMsg.className = 'msg user';
          userMsg.textContent = userText;
          chatBox.appendChild(userMsg);
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));

          // Add streaming AI placeholder
          var aiMsg = document.createElement('div');
          aiMsg.className = 'msg ai';
          aiMsg.innerHTML = '<span style="color:rgba(226,226,236,0.3);font-size:11px;">thinking...</span>';
          chatBox.appendChild(aiMsg);
          chatBox.scrollTop = chatBox.scrollHeight;

          // Build conversation history from DOM
          var history = [];
          Array.from(chatBox.children).forEach(function(el) {
            if (el === aiMsg) return;
            var cls = el.className || '';
            var txt = el.textContent.trim();
            if (!txt) return;
            if (cls.includes('user')) history.push({ role: 'user', content: txt });
            else if (cls.includes('ai')) history.push({ role: 'assistant', content: txt });
          });
          history.push({ role: 'user', content: userText });

          var started = false;
          RPGACE.streamOracle(
            history,
            window._rpgaceSystem || '',
            function(chunk, full) {
              if (!started) { aiMsg.innerHTML = ''; started = true; }
              aiMsg.textContent = full;
              chatBox.scrollTop = chatBox.scrollHeight;
            },
            function(full) {
              if (typeof window.renderMarkdown === 'function') {
                try { aiMsg.innerHTML = window.renderMarkdown(full); } catch(e) { aiMsg.textContent = full; }
              }
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          );
        };
        console.log('[RPGACE] sendChat streaming intercept active');
      }
    }, 2500);

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

    RPGACE.utils.sendToOracle = function(text) {
      var input = document.querySelector('#chat-input');
      if (!input) return;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof sendChat === 'function') {
        sendChat();
      } else {
        var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
        if (btn) btn.click();
      }
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
      { num: 11, name: 'Lingua Musicae',        keywords: [{t:'colour palette',w:2},{t:'mood board',w:2},{t:'aesthetic',w:2},{t:'visual identity',w:2},{t:'vibe',w:1},{t:'tone',w:1},{t:'brand colours',w:2}] },
      { num: 12, name: 'Fons Educationis',      keywords: [{t:'tutorial',w:2},{t:'learn',w:1},{t:'teach',w:1},{t:'breakdown',w:1},{t:'guide',w:1},{t:'lesson',w:1}] },
      { num: 13, name: 'Contentum',             keywords: [{t:'youtube',w:2},{t:'instagram',w:2},{t:'reels',w:2},{t:'hook',w:1},{t:'thumbnail',w:2},{t:'tiktok',w:2},{t:'caption',w:1}] },
      { num: 14, name: 'Visio Cinematica',      keywords: [{t:'cinematic',w:2},{t:'camera',w:2},{t:'filmmaker',w:2},{t:'neural frames',w:2},{t:'shot',w:1},{t:'b-roll',w:2},{t:'colour grade',w:2},{t:'footage',w:1}] },
      { num: 15, name: 'Collaboratio',          keywords: [{t:'collab',w:2},{t:'feature',w:1},{t:'outreach',w:2},{t:'guest verse',w:2},{t:'networking',w:1},{t:'cross-promotion',w:2}] },
      { num: 16, name: 'Venditionis Beatorum',  keywords: [{t:'beatstars',w:2},{t:'license',w:2},{t:'lease',w:2},{t:'exclusive rights',w:2},{t:'beat store',w:2},{t:'sell',w:1},{t:'price',w:1}] },
      { num: 17, name: 'Negotium',              keywords: [{t:'invoice',w:2},{t:'contract',w:2},{t:'accounting',w:2},{t:'tax',w:2},{t:'budget',w:1},{t:'business',w:1}] },
      { num: 18, name: 'Distributio',           keywords: [{t:'distrokid',w:2},{t:'tunecore',w:2},{t:'release date',w:2},{t:'rollout',w:1},{t:'playlist pitch',w:2},{t:'streaming platforms',w:2}] },
      { num: 19, name: 'Referentia Mercati',    keywords: [{t:'trending sound',w:2},{t:'competitor',w:2},{t:'benchmark',w:1},{t:'viral',w:1},{t:'industry standard',w:2},{t:'algorithm',w:1}] },
      { num: 20, name: 'Technologia',           keywords: [{t:'ai tool',w:2},{t:'automation',w:2},{t:'api',w:1},{t:'integration',w:1},{t:'software update',w:2},{t:'tech stack',w:2}] },
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
      if (text.length < 60) return; // too short to matter

      var matches = RPGACE.utils._quickPhylaScan(text);
      var gapConcepts = matches.length > 0 ? 1 : 0; // placeholder signal, refined on click

      // Fires once per completed Oracle response, before the generic badge's
      // own 2+-phyla confidence gate below - lets single-phylum-specific
      // subscribers (e.g. phylumPath's auto-detect) apply their own
      // threshold against `matches` without installing a second
      // MutationObserver on #send-btn or re-querying the chat DOM. Found
      // and fixed same-session: phylumPath's first version did exactly
      // that duplicate-observer thing this hook now prevents.
      RPGACE.hooks.fire('oracle:response-scanned', text, lastMsg, matches);

      // Confidence gate: only show if 2+ phyla matched
      if (matches.length < 2) return;

      var badge = document.createElement('button');
      badge.textContent = '🌿 ' + matches.length + ' topics';
      badge.style.cssText = 'margin-top:6px;padding:3px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:12px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
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
          countLabel.style.cssText = 'font-size:9px;color:rgba(226,226,236,0.25);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;';
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
            label.style.cssText = 'color:' + (isGap ? '#E25454' : '#3DAA6E') + ';font-weight:700;';
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
              proposeBtn.style.cssText = 'padding:2px 8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:10px;color:#9B59B6;font-size:9px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
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
          panel.innerHTML = '<div style="color:#E25454;">Could not load gap scores</div>';
        });
    };

    // Utility: detect [PLACEHOLDER] in prompt, show step-by-step fill overlay
    RPGACE.utils.fillGaps = function(prompt, onComplete) {
      var regex = /\[([^\]]+)\]/g;
      var gaps = [];
      var match;
      while ((match = regex.exec(prompt)) !== null) {
        gaps.push({ placeholder: match[0], label: match[1] });
      }
      if (gaps.length === 0) { onComplete(prompt); return; }

      var idx = 0;
      var filled = prompt;

      var overlay = document.createElement('div');
      overlay.id = 'rpgace-gap-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';

      var box = document.createElement('div');
      box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:28px 32px;width:min(480px,90vw);';

      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);margin-bottom:12px;text-transform:uppercase;';
      eyebrow.textContent = 'FILL IN THE DETAILS';

      var counter = document.createElement('div');
      counter.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:8px;';

      var label = document.createElement('div');
      label.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:14px;line-height:1.4;';

      var inp = document.createElement('textarea');
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:13px;font-family:Rajdhani,sans-serif;padding:10px 12px;resize:vertical;min-height:70px;outline:none;';
      inp.placeholder = 'Type your answer here...';

      var hint = document.createElement('div');
      hint.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.25);margin-top:6px;margin-bottom:16px;';
      hint.textContent = 'Ctrl+Enter to continue';

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

      var cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.4);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;';
      cancelBtn.onclick = function() { overlay.remove(); };

      var nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#C9A84C);border-radius:6px;padding:8px 20px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';

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

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(nextBtn);
      box.appendChild(eyebrow);
      box.appendChild(counter);
      box.appendChild(label);
      box.appendChild(inp);
      box.appendChild(hint);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      showGap(0);
    };
  },

});
/* ===END:config=== */

/* ===END_DOMAIN:CONFIG=== */

/* ===DOMAIN:CONTENT=== */

/* ===MODULE:beatLog=== */
RPGACE.register('beatLog', {

  // Colour palette by scale (Phylum 11 — Lingua Musicae, Colour/Mood/Visual Language)
  SCALE_COLOURS: {
    'Minor':         { hex: '#1a3a5c', name: 'Cold midnight blue',    rgb: '26,58,92' },
    'Dorian':        { hex: '#2d1b4e', name: 'Deep purple',           rgb: '45,27,78' },
    'Phrygian':      { hex: '#1a0a2e', name: 'Void black-purple',     rgb: '26,10,46' },
    'Lydian':        { hex: '#4a3000', name: 'Warm amber gold',       rgb: '74,48,0'  },
    'Mixolydian':    { hex: '#1a3320', name: 'Forest green',          rgb: '26,51,32' },
    'Major':         { hex: '#3d2a00', name: 'Sunrise gold',          rgb: '61,42,0'  },
    'Locrian':       { hex: '#2a0a0a', name: 'Dark crimson',          rgb: '42,10,10' },
    'Minor Pentatonic': { hex: '#0d2233', name: 'Steel blue',         rgb: '13,34,51' },
    'Major Pentatonic': { hex: '#2d3a00', name: 'Olive gold',         rgb: '45,58,0'  },
    'Blues':         { hex: '#1a1a33', name: 'Indigo night',          rgb: '26,26,51' },
  },

  // BPM-aware mood → genre tags for Last.fm
  // Tags are selected based on both mood AND bpm range
  _getMoodTags: function(mood, bpm) {
    var b = parseInt(bpm) || 130;
    var slow = b < 100;   // 60-99 BPM — uk rap, conscious, melodic, soul
    var mid  = b < 120;   // 100-119 BPM — trap soul, melodic trap, transitional
    // fast = 120+ BPM — drill, trap, grime, club

    var map = {
      'Dark': slow ? ['uk rap', 'conscious hip hop', 'dark hip hop', 'melodic rap', 'british hip hop']
                   : mid  ? ['dark trap', 'melodic trap', 'trap soul', 'dark hip hop']
                          : ['uk drill', 'dark trap', 'dark hip hop', 'drill'],

      'Aggressive': slow ? ['uk rap', 'grime', 'british hip hop', 'underground hip hop']
                         : mid  ? ['trap', 'aggressive hip hop', 'grime']
                                : ['uk drill', 'drill', 'grime', 'trap'],

      'Cinematic': slow ? ['cinematic hip hop', 'atmospheric', 'orchestral hip hop', 'neo soul', 'conscious hip hop']
                        : mid  ? ['cinematic hip hop', 'boom bap', 'atmospheric']
                               : ['cinematic hip hop', 'orchestral hip hop', 'atmospheric'],

      'Melancholic': slow ? ['uk rap', 'sad rap', 'melodic rap', 'conscious hip hop', 'neo soul']
                          : mid  ? ['sad rap', 'melodic trap', 'emo rap', 'trap soul']
                                 : ['emo rap', 'melodic trap', 'sad rap'],

      'Euphoric': slow ? ['neo soul', 'r&b', 'soul', 'afrobeats']
                       : mid  ? ['melodic trap', 'afrobeats', 'pop rap']
                              : ['afrobeats', 'pop rap', 'melodic trap', 'club'],

      'Calm': slow ? ['lo-fi hip hop', 'jazz rap', 'chillhop', 'neo soul', 'conscious hip hop']
                   : mid  ? ['chillhop', 'lo-fi hip hop', 'boom bap']
                          : ['boom bap', 'lo-fi hip hop', 'chillhop'],

      'Energetic': slow ? ['uk rap', 'grime', 'british hip hop']
                        : mid  ? ['trap', 'hype', 'club']
                               : ['drill', 'trap', 'club', 'hype', 'uk drill'],

      'Romantic': slow ? ['r&b', 'neo soul', 'soul', 'melodic r&b', 'contemporary r&b']
                       : mid  ? ['r&b', 'trap soul', 'melodic r&b']
                              : ['melodic trap', 'trap soul', 'r&b'],

      'Nostalgic': slow ? ['boom bap', 'old school hip hop', 'soul', 'jazz rap', 'conscious hip hop']
                        : mid  ? ['boom bap', 'old school hip hop', 'soul']
                               : ['boom bap', 'old school hip hop', 'jazz rap'],

      'Tense': slow ? ['dark hip hop', 'conscious hip hop', 'uk rap', 'underground hip hop']
                    : mid  ? ['dark trap', 'aggressive hip hop', 'trap']
                           : ['dark trap', 'drill', 'aggressive hip hop'],
    };
    return map[mood] || ['hip hop', 'uk hip hop', 'british hip hop'];
  },

  // Keep for backwards compat
  MOOD_TAGS: {
    'Dark': ['uk rap', 'dark hip hop'], 'Aggressive': ['drill', 'grime'],
    'Cinematic': ['cinematic hip hop'], 'Melancholic': ['uk rap', 'sad rap'],
    'Euphoric': ['afrobeats'], 'Calm': ['lo-fi hip hop', 'jazz rap'],
    'Energetic': ['trap', 'drill'], 'Romantic': ['r&b', 'neo soul'],
    'Nostalgic': ['boom bap'], 'Tense': ['dark trap', 'drill'],
  },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 900);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._inject(); }, 400);
      }
    });
  },

  _inject: function() {
    if (document.getElementById('beat-log-panel')) return;
    var self = this;

    // Find the research page container
    var page = document.getElementById('page-research') ||
               document.getElementById('page-learning') ||
               document.querySelector('[id*="research"]') ||
               document.querySelector('[id*="learning"]');
    if (!page) return;

    // Find Video Workshop section (section 3) to inject before it
    var sections = page.querySelectorAll('.section-title, h2, h3');
    var videoSection = Array.from(sections).find(function(s) {
      return s.textContent.includes('VIDEO WORKSHOP') || s.textContent.includes('Video Workshop');
    });

    var panel = document.createElement('div');
    panel.id = 'beat-log-panel';
    panel.style.cssText = 'background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;';

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    var title = document.createElement('div');
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Beat Log · ' + RPGACE.utils.phylumLabel(16);
    var titleText = document.createElement('div');
    titleText.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;';
    titleText.textContent = 'Log a Beat';
    title.appendChild(eyebrow); title.appendChild(titleText);
    hdr.appendChild(title);
    panel.appendChild(hdr);

    // Drag-and-drop zone for audio file
    var dropZone = document.createElement('div');
    dropZone.id = 'bl-dropzone';
    dropZone.style.cssText = 'border:2px dashed rgba(201,168,76,0.2);border-radius:8px;padding:16px;text-align:center;margin-bottom:16px;cursor:pointer;transition:border-color .2s;';
    var dropText = document.createElement('div');
    dropText.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.35);';
    dropText.innerHTML = '🎵 Drop your .mp3 / .wav / .flp here to pre-fill fields from filename<br><span style="font-size:10px;opacity:0.6;">e.g. "140bpm_Dminor_dark_fire.mp3" → auto-fills BPM, key, scale, mood, energy</span>';
    dropZone.appendChild(dropText);

    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(201,168,76,0.6)';
      dropZone.style.background = 'rgba(201,168,76,0.04)';
    });
    dropZone.addEventListener('dragleave', function() {
      dropZone.style.borderColor = 'rgba(201,168,76,0.2)';
      dropZone.style.background = 'none';
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(201,168,76,0.2)';
      dropZone.style.background = 'none';
      var file = e.dataTransfer.files[0];
      if (!file) return;
      self._parseFilename(file.name, file.path || '');
    });
    dropZone.addEventListener('click', function() {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.mp3,.wav,.flp,.aiff';
      inp.onchange = function() {
        if (inp.files[0]) self._parseFilename(inp.files[0].name, '');
      };
      inp.click();
    });
    panel.appendChild(dropZone);

    // Form grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';

    var fields = [
      { id: 'bl-title',    label: 'Beat Title',  type: 'text',   placeholder: 'e.g. Midnight Cipher' },
      { id: 'bl-key',      label: 'Key',          type: 'text',   placeholder: 'e.g. D' },
      { id: 'bl-bpm',      label: 'BPM',          type: 'number', placeholder: 'e.g. 140' },
      { id: 'bl-scale',    label: 'Scale',        type: 'select', options: Object.keys(self.SCALE_COLOURS) },
      { id: 'bl-energy',   label: 'Energy (1-5)', type: 'select', options: ['1 — Sketch','2 — Draft','3 — Solid','4 — Strong','5 — Fire'] },
      { id: 'bl-mood',     label: 'Mood',         type: 'select', options: Object.keys(self.MOOD_TAGS) },
    ];

    fields.forEach(function(f) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.textContent = f.label;
      lbl.style.cssText = 'display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var inp;
      if (f.type === 'select') {
        inp = document.createElement('select');
        var blank = document.createElement('option');
        blank.value = ''; blank.textContent = '— select —';
        inp.appendChild(blank);
        f.options.forEach(function(o) {
          var opt = document.createElement('option');
          opt.value = o; opt.textContent = o;
          inp.appendChild(opt);
        });
      } else {
        inp = document.createElement('input');
        inp.type = f.type;
        inp.placeholder = f.placeholder || '';
      }
      inp.id = f.id;
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(lbl); wrap.appendChild(inp);
      grid.appendChild(wrap);
    });
    panel.appendChild(grid);

    // Taxonomy nodes picker — REDESIGNED July 19 (Research redesign,
    // confirmed answer: "Searchable picker"). The old version rendered
    // EVERY node as a visible chip up-front - by 470 tree rows that was
    // a wall of buttons dominating the whole form. Now: a search box;
    // chips only show when they match the query or are already selected.
    // The selection mechanism (dataset.active on chips in #bl-tax-grid)
    // is UNCHANGED, so the Log Beat read path needs no edits.
    var taxWrap = document.createElement('div');
    taxWrap.style.cssText = 'margin-bottom:14px;';
    var taxLbl = document.createElement('div');
    taxLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:8px;';
    taxLbl.textContent = 'Taxonomy Nodes Applied';
    var taxSearch = document.createElement('input');
    taxSearch.type = 'text';
    taxSearch.id = 'bl-tax-search';
    taxSearch.placeholder = '🔍 Type to search nodes — selected ones stay visible...';
    taxSearch.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
    var taxGrid = document.createElement('div');
    taxGrid.id = 'bl-tax-grid';
    taxGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    taxWrap.appendChild(taxLbl); taxWrap.appendChild(taxSearch); taxWrap.appendChild(taxGrid);
    panel.appendChild(taxWrap);

    var applyTaxFilter = function() {
      var q = taxSearch.value.trim().toLowerCase();
      Array.prototype.forEach.call(taxGrid.children, function(chip) {
        var selected = chip.dataset.active === '1';
        var matches = q.length >= 2 && (chip.dataset.concept || '').toLowerCase().indexOf(q) !== -1;
        chip.style.display = (selected || matches) ? '' : 'none';
      });
    };
    taxSearch.oninput = applyTaxFilter;

    // Load taxonomy nodes
    RPGACE.sb.select('taxonomy_nodes', 'order=phylum_number.asc&limit=50')
      .then(function(nodes) {
        (nodes || []).forEach(function(node) {
          var chip = document.createElement('button');
          chip.dataset.nodeId = node.id;
          chip.dataset.concept = node.concept;
          chip.textContent = node.concept.slice(0, 30) + (node.concept.length > 30 ? '…' : '');
          chip.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.5);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;transition:all .15s;';
          chip.onclick = function() {
            var active = chip.dataset.active === '1';
            chip.dataset.active = active ? '0' : '1';
            chip.style.background = active ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.12)';
            chip.style.borderColor = active ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.4)';
            chip.style.color = active ? 'rgba(226,226,236,0.5)' : '#C9A84C';
            applyTaxFilter();
          };
          taxGrid.appendChild(chip);
        });
        applyTaxFilter(); // hide everything until searched/selected
      }).catch(function() {});

    // Extra fields row
    var extraGrid = document.createElement('div');
    extraGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;';

    var extraFields = [
      { id: 'bl-rating',    label: 'Beat Rating (★)',    type: 'select', options: ['★','★★','★★★','★★★★','★★★★★'] },
      { id: 'bl-licence',   label: 'Licence Type',       type: 'select', options: ['Lease only','Exclusive available','Sync ready','All types'] },
      { id: 'bl-collab',    label: 'Collab Ready',       type: 'select', options: ['No','Yes — DM me','Yes — email only'] },
    ];
    extraFields.forEach(function(f) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.textContent = f.label;
      lbl.style.cssText = 'display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var sel = document.createElement('select');
      sel.id = f.id;
      var blank = document.createElement('option'); blank.value=''; blank.textContent='— select —';
      sel.appendChild(blank);
      f.options.forEach(function(o) {
        var opt = document.createElement('option'); opt.value=o; opt.textContent=o; sel.appendChild(opt);
      });
      sel.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(lbl); wrap.appendChild(sel);
      extraGrid.appendChild(wrap);
    });

    // Reference track + sample flag
    var refWrap = document.createElement('div');
    refWrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;';
    ['bl-ref-track','bl-fl-path'].forEach(function(id, i) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.textContent = i === 0 ? 'Reference Track / Inspiration' : 'FL Studio Project Path (optional)';
      lbl.style.cssText = 'display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var inp = document.createElement('input');
      inp.id = id; inp.type = 'text';
      inp.placeholder = i === 0 ? 'e.g. Central Cee — Obsessed With You' : 'e.g. C:\\Beats\\midnight_cipher.flp';
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(lbl); wrap.appendChild(inp);
      refWrap.appendChild(wrap);
    });

    panel.appendChild(extraGrid);
    panel.appendChild(refWrap);

    // Sample clearance checkbox
    var sampleRow = document.createElement('div');
    sampleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    var sampleCb = document.createElement('input');
    sampleCb.type = 'checkbox'; sampleCb.id = 'bl-sample';
    var sampleLbl = document.createElement('label');
    sampleLbl.htmlFor = 'bl-sample';
    sampleLbl.textContent = 'Contains uncleared sample';
    sampleLbl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);cursor:pointer;';
    sampleRow.appendChild(sampleCb); sampleRow.appendChild(sampleLbl);
    panel.appendChild(sampleRow);

    // F18: optional auto Visual Treatment Doc — off by default since it's
    // a second, separate Oracle call on top of the main beat-log prompt
    var vtRow = document.createElement('div');
    vtRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    var vtCb = document.createElement('input');
    vtCb.type = 'checkbox'; vtCb.id = 'bl-visual-treatment';
    var vtLbl = document.createElement('label');
    vtLbl.htmlFor = 'bl-visual-treatment';
    vtLbl.textContent = '🎬 Also generate Visual Treatment Doc (' + RPGACE.utils.phylumLabel(14) + ', extra Oracle call)';
    vtLbl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);cursor:pointer;';
    vtRow.appendChild(vtCb); vtRow.appendChild(vtLbl);
    panel.appendChild(vtRow);

    // Action buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    var logBtn = document.createElement('button');
    logBtn.textContent = '⚡ Log Beat + Find Artists';
    logBtn.style.cssText = 'padding:10px 20px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    logBtn.onclick = function() { self._submit(); };

    var clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    clearBtn.onclick = function() { self._clearForm(); };

    btnRow.appendChild(logBtn); btnRow.appendChild(clearBtn);
    panel.appendChild(btnRow);

    // Output area
    var output = document.createElement('div');
    output.id = 'beat-log-output';
    output.style.cssText = 'margin-top:16px;display:none;';
    panel.appendChild(output);

    // Insert into page
    if (videoSection && videoSection.parentElement) {
      videoSection.parentElement.insertBefore(panel, videoSection);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    console.log('[RPGACE:beatLog] Panel injected');
  },

  _parseFilename: function(filename, filepath) {
    // Extract metadata from filename
    // Supports patterns like: 140bpm_Dminor_dark_fire.mp3
    //                         D_minor_140_dark.wav
    //                         midnight_cipher_140bpm_Fsharp_dorian.mp3
    var name = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').toLowerCase();

    // BPM — look for number between 60-200
    var bpmMatch = name.match(/(6[0-9]|[7-9][0-9]|1[0-9][0-9]|200)(?:\s*bpm)?/);
    if (bpmMatch) {
      var bpmEl = document.getElementById('bl-bpm');
      if (bpmEl) bpmEl.value = bpmMatch[1];
    }

    // Key — look for note names
    var keys = ['c#','d#','f#','g#','a#','c','d','e','f','g','a','b'];
    var foundKey = null;
    keys.forEach(function(k) {
      if (!foundKey && name.includes(k.replace('#','sharp').replace('#','#'))) foundKey = k.toUpperCase();
      if (!foundKey && name.includes(' ' + k + ' ')) foundKey = k.toUpperCase();
    });
    if (!foundKey) {
      // Try sharps written as 'sharp'
      var sharpMatch = name.match(/([a-g])sharp/i);
      if (sharpMatch) foundKey = sharpMatch[1].toUpperCase() + '#';
    }
    if (foundKey) {
      var keyEl = document.getElementById('bl-key');
      if (keyEl) keyEl.value = foundKey;
    }

    // Scale
    var scaleMap = {
      'minor': 'Minor', 'dorian': 'Dorian', 'phrygian': 'Phrygian',
      'lydian': 'Lydian', 'mixolydian': 'Mixolydian', 'major': 'Major',
      'locrian': 'Locrian', 'pentatonic': 'Minor Pentatonic', 'blues': 'Blues'
    };
    Object.keys(scaleMap).forEach(function(k) {
      if (name.includes(k)) {
        var scaleEl = document.getElementById('bl-scale');
        if (scaleEl) scaleEl.value = scaleMap[k];
      }
    });

    // Mood
    var moodMap = {
      'dark': 'Dark', 'aggressive': 'Aggressive', 'cinematic': 'Cinematic',
      'melancholic': 'Melancholic', 'euphoric': 'Euphoric', 'calm': 'Calm',
      'energetic': 'Energetic', 'romantic': 'Romantic', 'nostalgic': 'Nostalgic',
      'tense': 'Tense', 'sad': 'Melancholic', 'hype': 'Energetic', 'chill': 'Calm'
    };
    Object.keys(moodMap).forEach(function(k) {
      if (name.includes(k)) {
        var moodEl = document.getElementById('bl-mood');
        if (moodEl) moodEl.value = moodMap[k];
      }
    });

    // Energy from keywords
    var energyMap = { 'sketch': '1 — Sketch', 'draft': '2 — Draft', 'solid': '3 — Solid', 'strong': '4 — Strong', 'fire': '5 — Fire', 'heat': '5 — Fire', 'banger': '5 — Fire' };
    Object.keys(energyMap).forEach(function(k) {
      if (name.includes(k)) {
        var energyEl = document.getElementById('bl-energy');
        if (energyEl) energyEl.value = energyMap[k];
      }
    });

    // Beat title from filename (clean version)
    var titleEl = document.getElementById('bl-title');
    if (titleEl && !titleEl.value) {
      var cleanTitle = filename.replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\d+\s*bpm/gi, '')
        .replace(/(minor|major|dorian|phrygian|lydian|blues|pentatonic)/gi, '')
        .replace(/[a-g]#?/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (cleanTitle) titleEl.value = cleanTitle;
    }

    // FL path
    if (filepath) {
      var pathEl = document.getElementById('bl-fl-path');
      if (pathEl) pathEl.value = filepath;
    }

    // Update drop zone text
    var dz = document.getElementById('bl-dropzone');
    if (dz) {
      dz.querySelector('div').innerHTML = '✅ <strong style="color:#C9A84C;">' + filename + '</strong> — fields pre-filled. Review and adjust below.';
    }

    RPGACE.utils.toast('✅ Fields pre-filled from filename', '#C9A84C', 2000);
  },

  _getForm: function() {
    var get = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var activeTax = Array.from(document.querySelectorAll('#bl-tax-grid button[data-active="1"]'))
      .map(function(b) { return b.dataset.concept; });
    return {
      title:    get('bl-title'),
      key:      get('bl-key'),
      bpm:      get('bl-bpm'),
      scale:    get('bl-scale'),
      energy:   get('bl-energy'),
      mood:     get('bl-mood'),
      rating:   get('bl-rating'),
      licence:  get('bl-licence'),
      collab:   get('bl-collab'),
      refTrack: get('bl-ref-track'),
      flPath:   get('bl-fl-path'),
      sample:   document.getElementById('bl-sample') ? document.getElementById('bl-sample').checked : false,
      visualTreatment: document.getElementById('bl-visual-treatment') ? document.getElementById('bl-visual-treatment').checked : false,
      taxNodes: activeTax,
    };
  },

  _clearForm: function() {
    ['bl-title','bl-key','bl-bpm','bl-scale','bl-energy','bl-mood','bl-rating','bl-licence','bl-collab','bl-ref-track','bl-fl-path'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('#bl-tax-grid button[data-active="1"]').forEach(function(b) {
      b.dataset.active = '0';
      b.style.background = 'rgba(255,255,255,0.03)';
      b.style.borderColor = 'rgba(255,255,255,0.08)';
      b.style.color = 'rgba(226,226,236,0.5)';
    });
    var cb = document.getElementById('bl-sample'); if (cb) cb.checked = false;
    var vtCb = document.getElementById('bl-visual-treatment'); if (vtCb) vtCb.checked = false;
    var out = document.getElementById('beat-log-output'); if (out) { out.style.display='none'; out.innerHTML=''; }
  },

  _submit: function() {
    var self = this;
    var form = self._getForm();
    if (!form.title) { RPGACE.utils.toast('Add a beat title first', '#E25454', 2000); return; }
    if (!form.mood)  { RPGACE.utils.toast('Select a mood', '#E25454', 2000); return; }

    var output = document.getElementById('beat-log-output');
    output.style.display = 'block';
    output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:12px 0;">⚡ Logging beat and searching for artist matches...</div>';

    // 1. Save to Supabase video_jobs
    RPGACE.sb.insert('video_jobs', {
      title:        form.title,
      status:       'beat_logged',
      script:       JSON.stringify(form),
      edl:          null,
      raw_path:     form.flPath || null,
      style_profile_id: null,
    }).catch(function(e) { console.warn('[beatLog] Supabase save:', e.message); });

    // 2. Mark taxonomy nodes as applied
    form.taxNodes.forEach(function(concept) {
      if (RPGACE.modules.taxonomySync) {
        RPGACE.modules.taxonomySync.markApplied(concept);
      }
    });

    // 3. Save to Journal
    var journalContent = 'Beat logged: ' + form.title + '\n' +
      'Key: ' + form.key + ' ' + form.scale + ' | BPM: ' + form.bpm + ' | Energy: ' + form.energy + '\n' +
      'Mood: ' + form.mood + ' | Rating: ' + form.rating + '\n' +
      (form.refTrack ? 'Reference: ' + form.refTrack + '\n' : '') +
      (form.taxNodes.length ? 'Nodes applied: ' + form.taxNodes.join(', ') : '');
    if (typeof saveToJournal === 'function') {
      saveToJournal('Beat: ' + form.title, journalContent, 'beatLog');
    }

    // 4. Award XP
    var xp = [20, 40, 60, 80, 100][parseInt(form.energy) - 1] || 60;
    if (typeof addXP === 'function') addXP(xp);

    // 5. Get colour palette from scale
    var palette = self.SCALE_COLOURS[form.scale] || { hex: '#1a1a2e', name: 'Dark neutral' };

    // 6. Get BPM-aware Last.fm tags
    var tags = self._getMoodTags(form.mood, form.bpm);

    // Search Last.fm
    self._searchArtists(tags, form, palette, output);
  },

  _searchArtists: function(tags, form, palette, output) {
    var self = this;
    output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">🔍 Checking reference corpus for matches...</div>';

    // First: check reference corpus for BPM/mood/scale matches
    var corpusPromise = (RPGACE.modules.refCorpus && typeof RPGACE.modules.refCorpus.findMatches === 'function')
      ? RPGACE.modules.refCorpus.findMatches(form.bpm, form.mood, form.scale, form.energy)
      : Promise.resolve([]);

    corpusPromise.then(function(corpusMatches) {
      var hasCorpus = corpusMatches && corpusMatches.length > 0;

      if (hasCorpus) {
        output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">✅ Found ' + corpusMatches.length + ' corpus matches. Cross-referencing Last.fm...</div>';
      } else {
        output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">📚 No corpus matches yet. Searching Last.fm across ' + tags.length + ' style tags...</div>';
      }

      // Run Last.fm search in parallel
      return fetch('/api/lastfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_by_tags', tags: tags, limit: 50 })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lfmArtists = (data.success && data.artists) ? data.artists : [];

        // If we have corpus matches, use them to filter/rank Last.fm results
        var big = [], emerging = [], underground = [];

        if (hasCorpus) {
          // Extract unique artist names from corpus matches
          var corpusArtistNames = {};
          corpusMatches.forEach(function(track) {
            if (!corpusArtistNames[track.artist]) {
              corpusArtistNames[track.artist] = {
                name: track.artist,
                score: track._score,
                refTrack: track.title,
                bpm: track.bpm,
                mood: track.mood,
                listeners: 0
              };
            }
          });

          // Enrich corpus artists with Last.fm listener counts where available
          lfmArtists.forEach(function(lfm) {
            var key = lfm.name.toLowerCase();
            Object.keys(corpusArtistNames).forEach(function(name) {
              if (name.toLowerCase() === key) {
                corpusArtistNames[name].listeners = lfm.listeners || 0;
                corpusArtistNames[name].url = lfm.url;
              }
            });
          });

          var corpusArtists = Object.values(corpusArtistNames).sort(function(a,b) { return b.score - a.score; });

          // Also include relevant Last.fm artists not in corpus
          var corpusNames = Object.keys(corpusArtistNames).map(function(n) { return n.toLowerCase(); });
          var extraLfm = lfmArtists.filter(function(a) {
            return !corpusNames.includes(a.name.toLowerCase()) && a.listeners > 50000;
          }).slice(0, 5);

          big = corpusArtists.filter(function(a) { return a.listeners > 1000000; }).slice(0, 5);
          emerging = corpusArtists.filter(function(a) { return a.listeners <= 1000000; }).concat(extraLfm).slice(0, 10);
          underground = [];

          output.innerHTML = '<div style="color:rgba(74,144,226,0.8);font-size:12px;padding:8px 0;">🎯 ' + corpusMatches.length + ' corpus matches · ' + lfmArtists.length + ' Last.fm artists · Generating outputs...</div>';
        } else {
          // No corpus — use Last.fm only
          self._addNewArtistsToTaxonomy(lfmArtists, form.mood);
          big        = lfmArtists.filter(function(a) { return a.listeners > 1000000; }).slice(0, 5);
          emerging   = lfmArtists.filter(function(a) { return a.listeners > 10000 && a.listeners <= 1000000; }).slice(0, 10);
          underground = lfmArtists.filter(function(a) { return a.listeners <= 10000; }).slice(0, 5);
          output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">✅ ' + lfmArtists.length + ' Last.fm artists found. Add tracks to your corpus for better matches.</div>';
        }

        self._generateOutputs(form, palette, big, emerging, underground, output);
      });
    })
    .catch(function(err) {
      output.innerHTML = '<div style="color:#E25454;font-size:12px;padding:8px 0;">Search error: ' + err.message + '</div>';
    });
  },

  _addNewArtistsToTaxonomy: function(artists, mood) {
    // Add top emerging artists to taxonomy Phylum 12 (Fons Educationis) if not
    // already there. Bug fixed here: this used to write phylum_number: 17
    // while claiming phylum_name 'Fons Educationis' - 17 is actually Negotium,
    // Fons Educationis is 12. No rows had been written from this path yet
    // when caught, so nothing needed migrating.
    var emerging = artists.filter(function(a) { return a.listeners > 5000 && a.listeners <= 500000; }).slice(0, 10);
    emerging.forEach(function(a) {
      RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(a.name) + '&limit=1')
        .then(function(rows) {
          if (rows && rows.length > 0) return; // already exists
          RPGACE.sb.insert('taxonomy_nodes', {
            concept:       a.name,
            phylum_number: 12,
            phylum_name:   'Fons Educationis',
            definition:    'Artist discovered via Last.fm beat matching. Style: ' + mood + '. Listeners: ' + a.listeners,
            source:        'lastfm_beat_match',
            gap_score:     5.0,
          }).catch(function(){});
        }).catch(function(){});
    });
  },

  _generateOutputs: function(form, palette, big, emerging, underground, output) {
    var self = this;
    var bigNames   = big.map(function(a) { return a.name; }).join(', ') || 'N/A';
    var emergNames = emerging.map(function(a) { return a.name + ' (' + Math.round(a.listeners/1000) + 'k)'; }).join(', ') || 'N/A';
    var ugNames    = underground.map(function(a) { return a.name; }).join(', ') || 'N/A';

    var prompt = 'I just finished a beat. Here are the details:\n' +
      'Title: ' + form.title + '\n' +
      'Key: ' + form.key + ' | Scale: ' + form.scale + ' | BPM: ' + form.bpm + '\n' +
      'Mood: ' + form.mood + ' | Energy: ' + form.energy + '/5\n' +
      'Colour palette: ' + palette.name + ' (' + palette.hex + ')\n' +
      (form.refTrack ? 'Reference: ' + form.refTrack + '\n' : '') +
      '\nLast.fm matched artists:\n' +
      'MAJOR (1M+ listeners): ' + bigNames + '\n' +
      'EMERGING (10k-1M): ' + emergNames + '\n' +
      'UNDERGROUND (<10k): ' + ugNames + '\n\n' +
      'Generate ALL of the following:\n\n' +
      '1. TYPE BEAT TITLES (5 options) — use the major artist names, format: "[Artist] x [Artist] Type Beat" and "[Mood] [Key] Type Beat 2026"\n\n' +
      '2. BEATSTARS DESCRIPTION — 80 words max, include key, BPM, mood, style, and purchase CTA. Professional tone.\n\n' +
      '3. NEURAL FRAMES BRIEF — 80-word AI video prompt for this beat. Specify: visual style, colour palette (' + palette.name + '), camera movement, mood.\n\n' +
      '4. YOUTUBE CONTENT ANGLE — Title, hook (first 3 seconds on screen), and 1-line description for a tutorial about making this beat.\n\n' +
      '5. TOP 3 OUTREACH TARGETS — From the emerging artists list, pick the 3 most likely to buy this beat. For each: name, why they fit, personalised DM draft (under 100 words, casual, not salesy), and their Last.fm URL.\n\n' +
      '6. CONTENT BRIEF — One Instagram Reels concept for this beat (hook + visual direction + caption).\n\n' +
      'Be specific, direct, and pre-filled for @AceSanyaBeats / FL Studio / UK hip hop.';

    RPGACE.utils.sendToOracle(prompt);

    // F18: optional second Oracle call, chained after the main beat-log
    // prompt clears the in-flight guard (see scheduleOracle's sendChat
    // wrap) instead of firing immediately, which would just get blocked
    // by that same guard and silently dropped.
    if (form.visualTreatment) self._waitThenAutoVisualTreatment(form, palette);

    // Render artist match panel in output
    self._renderArtistPanel(form, palette, big, emerging, underground, output);
  },

  // F18: Beat Log entry → auto Visual Treatment Document, calling
  // visualOracle's own template automatically instead of requiring a
  // manual trip through the Visual Oracle panel with placeholder-filling.
  // Grounded in the real F14 filmmaker library the same way Director
  // Match is, so Oracle picks a real director rather than inventing one.
  _waitThenAutoVisualTreatment: function(form, palette) {
    var self = this;
    var waited = 0;
    var poll = function() {
      if (window._oracleRequestInFlight && waited < 30000) {
        waited += 500;
        setTimeout(poll, 500);
        return;
      }
      self._autoVisualTreatment(form, palette);
    };
    setTimeout(poll, 500);
  },

  _autoVisualTreatment: function(form, palette) {
    var buildPrompt = function(filmmakerBlock) {
      return 'Generate a full Visual Treatment Document for my beat.\n' +
        'Beat title: ' + form.title + '\n' +
        'Mood: ' + form.mood + ' | Key + scale: ' + form.key + ' ' + form.scale + ' | BPM: ' + form.bpm + '\n' +
        'Colour palette: ' + palette.name + ' (' + palette.hex + ')\n' +
        (form.refTrack ? 'Reference: ' + form.refTrack + '\n' : '') +
        (filmmakerBlock ? '\n' + filmmakerBlock + '\n' : '') +
        '\nThe document must include: Concept statement (2 sentences), Visual world description (colour palette, lighting, texture), ' +
        'Camera direction (movement vocabulary, shot types, rhythm), Talent/subject direction if any, Scene breakdown (4 scenes with duration), ' +
        'Neural Frames Autopilot prompt (120 words), and export format recommendations for YouTube, Reels, and Beatstars.' +
        (filmmakerBlock ? ' Choose one director from the list above to ground the visual direction — say which one and why.' : '');
    };
    if (RPGACE.modules.visualOracle && typeof RPGACE.modules.visualOracle._withFilmmakerLibrary === 'function') {
      RPGACE.modules.visualOracle._withFilmmakerLibrary(function(block) {
        RPGACE.utils.sendToOracle(buildPrompt(block));
      });
    } else {
      RPGACE.utils.sendToOracle(buildPrompt(''));
    }
  },

  _renderArtistPanel: function(form, palette, big, emerging, underground, output) {
    var self = this;
    output.innerHTML = '';
    output.style.cssText = 'margin-top:16px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;';

    // Colour palette display
    var palRow = document.createElement('div');
    palRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';
    var swatch = document.createElement('div');
    swatch.style.cssText = 'width:32px;height:32px;border-radius:6px;background:' + palette.hex + ';border:1px solid rgba(255,255,255,0.1);flex-shrink:0;';
    var palText = document.createElement('div');
    palText.innerHTML = '<div style="font-size:11px;font-weight:700;color:#E2E2EC;">' + palette.name + '</div><div style="font-size:10px;color:rgba(226,226,236,0.4);">' + RPGACE.utils.phylumLabel(11) + ' · ' + form.scale + ' · ' + palette.hex + '</div>';
    palRow.appendChild(swatch); palRow.appendChild(palText);
    output.appendChild(palRow);

    // Artist tiers
    var tiers = [
      { label: 'Major artists', color: '#C9A84C', artists: big },
      { label: 'Emerging targets', color: '#3DAA6E', artists: emerging.slice(0, 8) },
      { label: 'Underground', color: '#4A90E2', artists: underground },
    ];

    tiers.forEach(function(tier) {
      if (tier.artists.length === 0) return;
      var section = document.createElement('div');
      section.style.cssText = 'margin-bottom:12px;';
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + tier.color + ';margin-bottom:6px;';
      lbl.textContent = tier.label + ' (' + tier.artists.length + ')';
      section.appendChild(lbl);
      var chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      tier.artists.forEach(function(a) {
        var chip = document.createElement('a');
        chip.href = a.url || '#';
        chip.target = '_blank';
        chip.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.7);font-size:11px;text-decoration:none;cursor:pointer;';
        chip.textContent = a.name + (a.listeners ? ' · ' + (a.listeners > 1000000 ? Math.round(a.listeners/1000000)+'M' : Math.round(a.listeners/1000)+'k') : '');
        chips.appendChild(chip);
      });
      section.appendChild(chips);
      output.appendChild(section);
    });

    // Save to Notion button
    var notionBtn = document.createElement('button');
    notionBtn.textContent = '📓 Save Artist List to Notion';
    notionBtn.style.cssText = 'margin-top:10px;padding:8px 16px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:6px;color:#9B59B6;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    notionBtn.onclick = function() {
      var content = '## Beat: ' + form.title + '\n**Key:** ' + form.key + ' ' + form.scale + ' | **BPM:** ' + form.bpm + ' | **Mood:** ' + form.mood + '\n\n';
      content += '### Major Artists\n' + big.map(function(a){return '- [' + a.name + '](' + a.url + ')'}).join('\n') + '\n\n';
      content += '### Emerging Targets\n' + emerging.map(function(a){return '- [' + a.name + '](' + a.url + ') — ' + Math.round(a.listeners/1000) + 'k listeners'}).join('\n') + '\n\n';
      RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
        parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
        title: 'Beat Log: ' + form.title + ' — Artist Matches',
        markdown: content
      }).then(function() {
        RPGACE.utils.toast('📓 Saved to Notion', '#9B59B6', 3000);
      }).catch(function(e) {
        RPGACE.utils.toast('Notion error: ' + e.message, '#E25454', 3000);
      });
    };
    output.appendChild(notionBtn);

    RPGACE.utils.toast('✅ Beat logged · ' + (big.length + emerging.length + underground.length) + ' artists found · Check Oracle for outputs', '#C9A84C', 5000);
  },

});
/* ===END:beatLog=== */


/* ===MODULE:refCorpus=== */
RPGACE.register('refCorpus', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 1100);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._inject(); }, 500);
      }
    });
  },

  _inject: function() {
    if (document.getElementById('ref-corpus-panel')) return;
    var self = this;
    var page = document.getElementById('page-research') ||
               document.getElementById('page-learning') ||
               document.querySelector('[id*="research"]') ||
               document.querySelector('[id*="learning"]');
    if (!page) return;

    var panel = document.createElement('div');
    panel.id = 'ref-corpus-panel';
    panel.style.cssText = 'background:rgba(74,144,226,0.04);border:1px solid rgba(74,144,226,0.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;';

    // Header
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(74,144,226,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Reference Corpus · ' + RPGACE.utils.phylumLabel(8) + ' + ' + RPGACE.utils.phylumLabel(17);
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    titleEl.textContent = 'Track Reference Library';
    var subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:16px;';
    subEl.textContent = 'Add reference tracks. Beat Log matches your beat against this corpus to find artist targets. Phase 2: librosa auto-analyses each track.';
    panel.appendChild(eyebrow); panel.appendChild(titleEl); panel.appendChild(subEl);

    // Add track form
    var form = document.createElement('div');
    form.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 80px 80px 80px 1fr;gap:8px;margin-bottom:10px;align-items:end;';

    var formFields = [
      { id: 'rc-artist', placeholder: 'Artist', type: 'text' },
      { id: 'rc-title',  placeholder: 'Track title', type: 'text' },
      { id: 'rc-bpm',    placeholder: 'BPM', type: 'number' },
      { id: 'rc-key',    placeholder: 'Key', type: 'text' },
      { id: 'rc-energy', placeholder: 'Energy 1-5', type: 'number' },
      { id: 'rc-mood',   placeholder: 'Mood', type: 'text' },
    ];

    formFields.forEach(function(f) {
      var inp = document.createElement('input');
      inp.id = f.id; inp.type = f.type; inp.placeholder = f.placeholder;
      inp.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:7px 10px;outline:none;font-family:Rajdhani,sans-serif;width:100%;';
      form.appendChild(inp);
    });
    panel.appendChild(form);

    // Bulk add textarea
    var bulkLbl = document.createElement('div');
    bulkLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.3);margin-bottom:5px;margin-top:10px;';
    bulkLbl.textContent = 'Or bulk add — one per line: Artist, Track Title, BPM, Key, Energy, Mood';
    var bulkArea = document.createElement('textarea');
    bulkArea.id = 'rc-bulk';
    bulkArea.placeholder = 'Nines, Money & Muscle, 92, D, 3, Melancholic\nDave, Titanium, 88, F#, 4, Cinematic\nKnucks, Seasons, 95, G, 3, Dark';
    bulkArea.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:11px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;margin-bottom:10px;';
    panel.appendChild(bulkLbl);
    panel.appendChild(bulkArea);

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;';

    var addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Track';
    addBtn.style.cssText = 'padding:8px 16px;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    addBtn.onclick = function() { self._addSingle(); };

    var bulkBtn = document.createElement('button');
    bulkBtn.textContent = '⚡ Bulk Import';
    bulkBtn.style.cssText = 'padding:8px 16px;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    bulkBtn.onclick = function() { self._bulkImport(); };

    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = '↻ Refresh List';
    refreshBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    refreshBtn.onclick = function() { self._loadList(); };

    btnRow.appendChild(addBtn); btnRow.appendChild(bulkBtn); btnRow.appendChild(refreshBtn);
    panel.appendChild(btnRow);

    // Track list
    var listWrap = document.createElement('div');
    listWrap.id = 'rc-list';
    listWrap.style.cssText = 'max-height:240px;overflow-y:auto;';
    var listHeader = document.createElement('div');
    listHeader.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(226,226,236,0.25);margin-bottom:8px;';
    listHeader.textContent = 'Corpus · 0 tracks';
    listHeader.id = 'rc-list-header';
    listWrap.appendChild(listHeader);
    panel.appendChild(listWrap);

    // Insert before beat log panel
    var beatLogPanel = document.getElementById('beat-log-panel');
    if (beatLogPanel) {
      beatLogPanel.parentElement.insertBefore(panel, beatLogPanel);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    self._loadList();
    console.log('[RPGACE:refCorpus] Panel injected');
  },

  _addSingle: function() {
    var get = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var artist = get('rc-artist');
    var title  = get('rc-title');
    if (!artist || !title) { RPGACE.utils.toast('Artist and title required', '#E25454', 2000); return; }
    var row = {
      artist:  artist,
      title:   title,
      bpm:     parseInt(get('rc-bpm')) || null,
      key:     get('rc-key') || null,
      energy:  parseInt(get('rc-energy')) || null,
      mood:    get('rc-mood') || null,
      source:  'manual',
      analysed: false,
    };
    RPGACE.sb.insert('reference_tracks', row)
      .then(function() {
        RPGACE.utils.toast('✅ Added: ' + artist + ' — ' + title, '#4A90E2', 2500);
        ['rc-artist','rc-title','rc-bpm','rc-key','rc-energy','rc-mood'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
        this._loadList();
      }.bind(this))
      .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3000); });
  },

  _bulkImport: function() {
    var self = this;
    var raw = document.getElementById('rc-bulk');
    if (!raw || !raw.value.trim()) { RPGACE.utils.toast('Paste tracks first', '#E25454', 2000); return; }
    var lines = raw.value.trim().split('\n').filter(function(l) { return l.trim(); });
    var rows = lines.map(function(line) {
      var parts = line.split(',').map(function(p) { return p.trim(); });
      return {
        artist:   parts[0] || '',
        title:    parts[1] || '',
        bpm:      parseInt(parts[2]) || null,
        key:      parts[3] || null,
        energy:   parseInt(parts[4]) || null,
        mood:     parts[5] || null,
        source:   'bulk_import',
        analysed: false,
      };
    }).filter(function(r) { return r.artist && r.title; });

    if (rows.length === 0) { RPGACE.utils.toast('No valid rows found', '#E25454', 2000); return; }

    RPGACE.utils.toast('Importing ' + rows.length + ' tracks...', '#4A90E2', 2000);
    var done = 0;
    rows.forEach(function(row) {
      RPGACE.sb.insert('reference_tracks', row)
        .then(function() {
          done++;
          if (done === rows.length) {
            RPGACE.utils.toast('✅ Imported ' + done + ' tracks', '#4A90E2', 3000);
            raw.value = '';
            self._loadList();
          }
        }).catch(function(){});
    });
  },

  _loadList: function() {
    var self = this;
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
          name.style.cssText = 'font-size:12px;color:#E2E2EC;font-weight:600;';
          name.textContent = row.artist + ' — ' + row.title;
          var meta = document.createElement('div');
          meta.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);';
          var parts = [];
          if (row.bpm) parts.push(row.bpm + ' BPM');
          if (row.key) parts.push(row.key);
          if (row.energy) parts.push('Energy ' + row.energy);
          if (row.mood) parts.push(row.mood);
          meta.textContent = parts.join(' · ') || 'No metadata yet';
          left.appendChild(name); left.appendChild(meta);
          var del = document.createElement('button');
          del.textContent = '×';
          del.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.2);cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0;';
          del.onclick = function() {
            RPGACE.sb.del('reference_tracks', 'id=eq.' + row.id)
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

  // Called by beatLog to find matching artists from corpus
  findMatches: function(bpm, mood, scale, energy) {
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
        row._score = score;
        return row;
      });

      // Filter minimum score and sort
      return scored
        .filter(function(r) { return r._score > 0; })
        .sort(function(a, b) { return b._score - a._score });
    });
  },

});
/* ===END:refCorpus=== */

/* ===MODULE:contentProductionLive=== */
RPGACE.register('contentProductionLive', {

  _activeConID: null,
  _oracleSession: [],

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectDashboardWidget(); }, 1600);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        self._injectDashboardWidget();
      }
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._injectOracleBar(); }, 600);
      }
    });
  },

  // ── Create a new ConID entry ──────────────────────────────────
  createEntry: function(data) {
    var self = this;
    RPGACE.sb.insert('content_productions', {
      title:          data.title || 'Untitled Content Idea',
      idea:           data.idea || '',
      taxonomy_nodes: data.taxonomy_nodes || [],
      platform_outputs: data.platform_outputs || {},
      status:         data.status || 'Idea',
    }).then(function(result) {
      var entry = Array.isArray(result) ? result[0] : result;
      if (entry && entry.con_id) {
        self._activeConID = entry.con_id;
        self._activeId = entry.id;
        RPGACE.utils.toast('📋 ConID #' + entry.con_id + ' created: ' + data.title, '#3DAA6E', 4000);
        self._refreshWidget();
        self._injectOracleBar();
      }
    }).catch(function(e) {
      console.warn('[contentProductionLive] createEntry error:', e.message);
    });
  },

  // ── Update an existing entry ──────────────────────────────────
  updateEntry: function(id, updates) {
    return fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/content_productions?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'apikey': RPGACE.CONFIG.supabase.key,
        'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updates)
    });
  },

  // ── F16: Beatstars listing generator ──────────────────────────
  // BeatStars has no public API for creating listings (confirmed July 13
  // via web search — it's a repeatedly-requested, still-unimplemented
  // feature). So this generates ready-to-copy-paste listing content via
  // Oracle instead of attempting true auto-posting — same pattern as F10's
  // scoped-down Fourth automation.
  _generateBeatstarsListing: function(row) {
    var self = this;
    RPGACE.utils.toast('🎧 Pulling beat data + generating listing...', '#C9A84C', 3000);

    RPGACE.sb.select('video_jobs', 'status=eq.beat_logged&title=ilike.*' + encodeURIComponent(row.title.split(' ')[0]) + '*&order=id.desc&limit=1')
      .catch(function(e) {
        console.warn('[contentProductionLive] beatstars listing lookup error:', e.message);
        return [];
      })
      .then(function(jobs) {
        var beat = null;
        if (jobs && jobs[0] && jobs[0].script) {
          try { beat = JSON.parse(jobs[0].script); } catch (e) { beat = null; }
        }

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

        if (typeof showPage === 'function') showPage('advisor');
        setTimeout(function() {
          self._activeConID = row.con_id;
          self._activeId = row.id;
          self._injectOracleBar();
          RPGACE.utils.sendToOracle(prompt);
        }, 500);
      });
  },

  // ── Dashboard widget — ConID tracker ─────────────────────────
  _injectDashboardWidget: function() {
    if (document.getElementById('cpl-widget')) return;
    var self = this;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    var widget = document.createElement('div');
    widget.id = 'cpl-widget';
    widget.style.cssText = 'background:rgba(61,170,110,0.03);border:1px solid rgba(61,170,110,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
    var titleEl = document.createElement('div');
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(61,170,110,0.6);text-transform:uppercase;margin-bottom:3px;';
    eyebrow.textContent = 'Content Production Live';
    var titleText = document.createElement('div');
    titleText.className = 'section-title';
    titleText.style.cssText = 'font-size:14px;';
    titleText.textContent = 'Content Pipeline';
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

    // Insert after Knowledge Gap Tracker
    var kgPanel = document.getElementById('kg-panel');
    if (kgPanel && kgPanel.nextSibling) {
      page.insertBefore(widget, kgPanel.nextSibling);
    } else {
      page.insertBefore(widget, page.firstChild);
    }

    self._refreshWidget();
    console.log('[contentProductionLive] Dashboard widget injected');
  },

  _refreshWidget: function() {
    var self = this;
    var list = document.getElementById('cpl-list');
    if (!list) return;

    RPGACE.sb.select('content_productions', 'order=con_id.desc&limit=20')
      .then(function(rows) {
        rows = rows || [];
        list.innerHTML = '';

        if (rows.length === 0) {
          list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">No content ideas yet. Use 🔀 Repurpose in Oracle to create your first ConID.</div>';
          return;
        }

        rows.forEach(function(row) {
          var statusColors = {
            'Idea': '#4A90E2', 'Scripted': '#C9A84C', 'Filmed': '#9B59B6',
            'Edited': '#E25454', 'Posted': '#3DAA6E', 'Analysed': '#2ABFB0'
          };
          var color = statusColors[row.status] || '#4A90E2';

          var item = document.createElement('div');
          item.style.cssText = 'padding:10px 12px;border:1px solid rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,0.02);';

          var topRow = document.createElement('div');
          topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

          var idBadge = document.createElement('span');
          idBadge.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(61,170,110,0.7);background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:10px;padding:2px 7px;margin-right:8px;';
          idBadge.textContent = 'ConID #' + row.con_id;

          var titleSpan = document.createElement('span');
          titleSpan.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          titleSpan.textContent = row.title;

          var statusBadge = document.createElement('span');
          statusBadge.style.cssText = 'font-size:9px;font-weight:700;color:' + color + ';background:' + color.replace(')', ',0.1)').replace('rgb','rgba') + ';border:1px solid ' + color.replace(')', ',0.3)').replace('rgb','rgba') + ';border-radius:10px;padding:2px 8px;margin-left:8px;flex-shrink:0;';
          statusBadge.textContent = row.status;

          topRow.appendChild(idBadge); topRow.appendChild(titleSpan); topRow.appendChild(statusBadge);
          item.appendChild(topRow);

          // Status progress bar
          var statuses = ['Idea','Scripted','Filmed','Edited','Posted','Analysed'];
          var statusIdx = statuses.indexOf(row.status);
          var progressWrap = document.createElement('div');
          progressWrap.style.cssText = 'display:flex;gap:3px;margin-bottom:8px;';
          statuses.forEach(function(s, i) {
            var dot = document.createElement('div');
            dot.style.cssText = 'flex:1;height:3px;border-radius:2px;background:' + (i <= statusIdx ? color : 'rgba(255,255,255,0.08)') + ';';
            progressWrap.appendChild(dot);
          });
          item.appendChild(progressWrap);

          // Top action row — swap button bottom right
          var topActions = document.createElement('div');
          topActions.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

          // Inline title edit
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex:1;margin-right:8px;';
          var titleDisplay = document.createElement('div');
          titleDisplay.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);cursor:pointer;';
          titleDisplay.textContent = '✎ Edit title';
          titleDisplay.onclick = function() {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.value = row.title;
            inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(61,170,110,0.3);border-radius:4px;color:#E2E2EC;font-size:11px;padding:3px 6px;outline:none;font-family:Rajdhani,sans-serif;';
            titleWrap.replaceChild(inp, titleDisplay);
            inp.focus();
            inp.onblur = function() {
              var newTitle = inp.value.trim() || row.title;
              self.updateEntry(row.id, { title: newTitle }).then(function() {
                RPGACE.utils.toast('✅ Title updated', '#3DAA6E', 2000);
                self._refreshWidget();
              });
            };
            inp.onkeydown = function(e) { if (e.key === 'Enter') inp.blur(); };
          };
          titleWrap.appendChild(titleDisplay);

          // Swap button
          var swapBtn = document.createElement('button');
          swapBtn.textContent = '⇄ Swap ConID';
          swapBtn.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:5px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
          swapBtn.onclick = function() {
            // Load all ConIDs and show swap dropdown
            RPGACE.sb.select('content_productions', 'order=con_id.desc&limit=30')
              .then(function(all) {
                // Remove existing swap dropdown if open
                var existing = document.getElementById('cpl-swap-dropdown');
                if (existing) { existing.remove(); return; }

                var dd = document.createElement('div');
                dd.id = 'cpl-swap-dropdown';
                dd.style.cssText = 'position:absolute;right:0;top:100%;background:#0f0f1a;border:1px solid rgba(61,170,110,0.25);border-radius:8px;z-index:9999;min-width:260px;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.5);';

                (all || []).forEach(function(entry) {
                  var opt = document.createElement('div');
                  opt.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;color:rgba(226,226,236,0.7);';
                  opt.innerHTML = '<span style="color:rgba(61,170,110,0.7);font-weight:700;margin-right:6px;">ConID #' + entry.con_id + '</span>' + entry.title.slice(0, 45) + (entry.title.length > 45 ? '...' : '') + '<span style="float:right;font-size:9px;color:rgba(226,226,236,0.3);">' + entry.status + '</span>';
                  opt.onmouseover = function() { opt.style.background = 'rgba(61,170,110,0.08)'; };
                  opt.onmouseout = function() { opt.style.background = 'none'; };
                  opt.onclick = function() {
                    dd.remove();
                    self._activeConID = entry.con_id;
                    self._activeId = entry.id;
                    RPGACE.utils.toast('Switched to ConID #' + entry.con_id + ': ' + entry.title.slice(0,40), '#3DAA6E', 3000);
                    self._refreshWidget();
                  };
                  dd.appendChild(opt);
                });

                // Position relative to swap button
                swapBtn.style.position = 'relative';
                swapBtn.appendChild(dd);

                // Close on outside click
                setTimeout(function() {
                  document.addEventListener('click', function closeDd(e) {
                    if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', closeDd); }
                  });
                }, 100);
              });
          };

          topActions.appendChild(titleWrap);
          topActions.appendChild(swapBtn);
          item.appendChild(topActions);

          // Action buttons row
          var actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

          // Status advance button
          if (statusIdx < statuses.length - 1) {
            var nextStatus = statuses[statusIdx + 1];
            var advBtn = document.createElement('button');
            advBtn.textContent = '→ Mark ' + nextStatus;
            advBtn.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.6);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            advBtn.onclick = function() {
              var updates = { status: nextStatus };
              if (nextStatus === 'Posted') updates.posted_at = new Date().toISOString();
              if (nextStatus === 'Analysed') updates.analysed_at = new Date().toISOString();
              self.updateEntry(row.id, updates).then(function() {
                self._refreshWidget();
                RPGACE.utils.toast('ConID #' + row.con_id + ' → ' + nextStatus, color, 2000);
              });
            };
            actions.appendChild(advBtn);
          }

          // Posted — show URL input questionnaire
          if (row.status === 'Posted' || row.status === 'Analysed') {
            if (row.youtube_url) {
              var ytLink = document.createElement('a');
              ytLink.href = row.youtube_url; ytLink.target = '_blank';
              ytLink.textContent = '▶ YouTube';
              ytLink.style.cssText = 'padding:4px 10px;background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.2);border-radius:5px;color:#E25454;font-size:10px;text-decoration:none;';
              actions.appendChild(ytLink);
            }
            if (row.instagram_url) {
              var igLink = document.createElement('a');
              igLink.href = row.instagram_url; igLink.target = '_blank';
              igLink.textContent = '📸 Instagram';
              igLink.style.cssText = 'padding:4px 10px;background:rgba(193,53,132,0.08);border:1px solid rgba(193,53,132,0.2);border-radius:5px;color:#E1306C;font-size:10px;text-decoration:none;';
              actions.appendChild(igLink);
            }
          }

          // Post details button (when status hits Posted)
          if (row.status === 'Filmed' || row.status === 'Edited') {
            var postBtn = document.createElement('button');
            postBtn.textContent = '📋 Add post details';
            postBtn.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:5px;color:#3DAA6E;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            postBtn.onclick = function() { self._showPostDetails(row); };
            actions.appendChild(postBtn);
          }

          // Open in Oracle button
          var oracleBtn = document.createElement('button');
          oracleBtn.textContent = '💬 Oracle session';
          oracleBtn.style.cssText = 'padding:4px 10px;background:rgba(74,144,226,0.06);border:1px solid rgba(74,144,226,0.15);border-radius:5px;color:#4A90E2;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          oracleBtn.onclick = function() {
            self._activeConID = row.con_id;
            self._activeId = row.id;
            if (typeof showPage === 'function') showPage('advisor');
            setTimeout(function() {
              self._injectOracleBar();
              RPGACE.utils.sendToOracle('I am working on ConID #' + row.con_id + ': "' + row.title + '". Status: ' + row.status + '. Idea: ' + (row.idea || '').slice(0, 300) + '\n\nHelp me with the next step in the content production process.');
            }, 500);
          };
          actions.appendChild(oracleBtn);

          // F16: Beatstars listing generator — only shown once a licence
          // type is set (i.e. this ConID is a beat sale, not just content)
          if (row.licence_type) {
            var bsBtn = document.createElement('button');
            bsBtn.textContent = '🎧 Beatstars Listing';
            bsBtn.style.cssText = 'padding:4px 10px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:5px;color:#C9A84C;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            bsBtn.onclick = function() { self._generateBeatstarsListing(row); };
            actions.appendChild(bsBtn);
          }

          item.appendChild(actions);
          list.appendChild(item);
        });
      }).catch(function(e) {
        list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  // ── Post details questionnaire ────────────────────────────────
  _showPostDetails: function(row) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(61,170,110,0.25);border-radius:12px;padding:24px 28px;width:min(520px,95vw);max-height:90vh;overflow-y:auto;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = 'ConID #' + row.con_id + ' — Post Details';
    box.appendChild(title);

    var fields = [
      { id: 'pd-yt',    label: 'YouTube URL', placeholder: 'https://youtube.com/watch?v=...' },
      { id: 'pd-ig',    label: 'Instagram URL', placeholder: 'https://instagram.com/p/...' },
      { id: 'pd-tiktok',label: 'TikTok URL', placeholder: 'https://tiktok.com/@acesanyabeats/...' },
      { id: 'pd-raw',   label: 'Raw footage path (E: drive)', placeholder: 'E:\\Videos\\edison_tutorial_raw.mp4' },
      { id: 'pd-notes', label: 'Post notes / performance observations', placeholder: 'e.g. Posted Sunday 6pm, got 200 views in first hour...' },
    ];

    fields.forEach(function(f) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
      lbl.textContent = f.label + ':';
      var inp = document.createElement('input');
      inp.id = f.id; inp.type = 'text'; inp.placeholder = f.placeholder;
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      box.appendChild(lbl); box.appendChild(inp);
    });

    // F15: licence + price, if this ConID has a beat attached to it (not
    // every post is a beat sale, so both are optional and null if left
    // blank) - precondition for F16's Beatstars auto-listing, which reads
    // these two columns straight off content_productions.
    var licLbl = document.createElement('div');
    licLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
    licLbl.textContent = 'Licence type (if selling this beat):';
    var licSelect = document.createElement('select');
    licSelect.id = 'pd-licence';
    licSelect.style.cssText = 'width:100%;background:#1a1a24;border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
    [['', '— not a beat sale —'], ['lease', 'Lease'], ['non-exclusive', 'Non-Exclusive'], ['exclusive', 'Exclusive']].forEach(function(o) {
      var opt = document.createElement('option');
      opt.value = o[0]; opt.textContent = o[1];
      opt.style.color = '#E2E2EC'; opt.style.background = '#1a1a24';
      licSelect.appendChild(opt);
    });
    box.appendChild(licLbl); box.appendChild(licSelect);

    var priceLbl = document.createElement('div');
    priceLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
    priceLbl.textContent = 'Price (GBP):';
    var priceInp = document.createElement('input');
    priceInp.id = 'pd-price'; priceInp.type = 'number'; priceInp.min = '0'; priceInp.step = '0.01'; priceInp.placeholder = 'e.g. 29.99';
    priceInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
    box.appendChild(priceLbl); box.appendChild(priceInp);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save + Mark Posted';
    saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    saveBtn.onclick = function() {
      var g = function(id) { var el=document.getElementById(id); return el?el.value.trim():''; };
      var priceVal = g('pd-price');
      var updates = {
        status: 'Posted',
        posted_at: new Date().toISOString(),
        youtube_url: g('pd-yt') || null,
        instagram_url: g('pd-ig') || null,
        tiktok_url: g('pd-tiktok') || null,
        raw_footage_path: g('pd-raw') || null,
        notes: g('pd-notes') || null,
        licence_type: g('pd-licence') || null,
        price: priceVal ? parseFloat(priceVal) : null,
      };
      self.updateEntry(row.id, updates).then(function() {
        overlay.remove();
        self._refreshWidget();
        RPGACE.utils.toast('✅ ConID #' + row.con_id + ' marked Posted', '#3DAA6E', 3000);
        // Auto-post to Instagram if URL not provided
        if (!updates.instagram_url && updates.status === 'Posted') {
          RPGACE.utils.toast('💡 Tip: Instagram auto-post available via Composio', '#9B59B6', 4000);
        }
      });
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Oracle bar — shows active ConID in Oracle tab ─────────────
  _injectOracleBar: function() {
    if (!this._activeConID) return;
    if (document.getElementById('cpl-oracle-bar')) return;
    var self = this;
    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    if (!chatBox) return;

    var bar = document.createElement('div');
    bar.id = 'cpl-oracle-bar';
    bar.style.cssText = 'background:rgba(61,170,110,0.06);border:1px solid rgba(61,170,110,0.2);border-radius:8px;padding:8px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;';

    var left = document.createElement('div');
    left.style.cssText = 'font-size:11px;color:rgba(61,170,110,0.8);';
    left.textContent = '📋 Active: ConID #' + self._activeConID + ' — Oracle session being recorded';

    var optionBBtn = document.createElement('button');
    optionBBtn.textContent = '🎬 Switch to Production Panel';
    optionBBtn.style.cssText = 'padding:4px 12px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:5px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    optionBBtn.onclick = function() { self._openProductionPanel(); };

    var endBtn = document.createElement('button');
    endBtn.textContent = 'End session';
    endBtn.style.cssText = 'padding:4px 10px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.3);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:6px;';
    endBtn.onclick = function() { self._endSession(); };

    left.appendChild(document.createElement('br'));
    bar.appendChild(left);
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
    btnWrap.appendChild(optionBBtn); btnWrap.appendChild(endBtn);
    bar.appendChild(btnWrap);
    chatBox.parentElement.insertBefore(bar, chatBox);
  },

  // ── Option B: Production Panel ────────────────────────────────
  _openProductionPanel: function() {
    if (document.getElementById('cpl-prod-panel')) return;
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'cpl-prod-panel';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(61,170,110,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(61,170,110,0.06);border-bottom:1px solid rgba(61,170,110,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var htxt = document.createElement('div');
    var lb = document.createElement('div');
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.65);margin-bottom:3px;';
    lb.textContent = 'CONTENT PRODUCTION LIVE · ConID #' + self._activeConID;
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
    sub.textContent = 'Production Panel';
    htxt.appendChild(lb); htxt.appendChild(sub);
    var closeHdr = document.createElement('button');
    closeHdr.textContent = '×';
    closeHdr.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;';
    closeHdr.onclick = function() {
      panel.style.transform = 'translateX(100%)';
      setTimeout(function(){ panel.remove(); }, 280);
    };
    hdr.appendChild(htxt); hdr.appendChild(closeHdr);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';

    var phases = [
      { icon: '📝', title: 'Phase 1 — Pre-Production', desc: 'Your script outline, hook, and key teaching points are in the Oracle conversation. Review them, then click Ready to Film when prepared.' },
      { icon: '🎬', title: 'Phase 2 — Production', desc: 'Film your video section by section. Keep the Oracle bar open to reference your notes. Paste your raw footage path when done filming.' },
      { icon: '✂️', title: 'Phase 3 — Post-Production', desc: 'Your platform captions are in Oracle. Copy them for each platform. Paste URLs once posted. System will pull stats on next Morning Brief.' },
    ];

    phases.forEach(function(ph, i) {
      var phaseCard = document.createElement('div');
      phaseCard.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;margin-bottom:10px;';
      var phTitle = document.createElement('div');
      phTitle.style.cssText = 'font-size:13px;font-weight:700;color:#E2E2EC;margin-bottom:6px;';
      phTitle.textContent = ph.icon + ' ' + ph.title;
      var phDesc = document.createElement('div');
      phDesc.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.45);line-height:1.6;margin-bottom:10px;';
      phDesc.textContent = ph.desc;

      if (i === 1) {
        // Phase 2 — raw footage path input
        var pathInp = document.createElement('input');
        pathInp.type = 'text';
        pathInp.placeholder = 'E:\\Videos\\raw_footage.mp4';
        pathInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:#E2E2EC;font-size:11px;padding:6px 8px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:6px;';
        var savePathBtn = document.createElement('button');
        savePathBtn.textContent = 'Save footage path';
        savePathBtn.style.cssText = 'padding:5px 12px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.25);border-radius:5px;color:#3DAA6E;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        savePathBtn.onclick = function() {
          if (self._activeId && pathInp.value.trim()) {
            self.updateEntry(self._activeId, { raw_footage_path: pathInp.value.trim() })
              .then(function() { RPGACE.utils.toast('📁 Footage path saved', '#3DAA6E', 2000); });
          }
        };
        phaseCard.appendChild(phTitle); phaseCard.appendChild(phDesc);
        phaseCard.appendChild(pathInp); phaseCard.appendChild(savePathBtn);
      } else {
        phaseCard.appendChild(phTitle); phaseCard.appendChild(phDesc);
      }

      body.appendChild(phaseCard);
    });

    // Switch back to Oracle button
    var backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Oracle (Option A)';
    backBtn.style.cssText = 'width:100%;padding:10px;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-top:8px;';
    backBtn.onclick = function() {
      panel.style.transform = 'translateX(100%)';
      setTimeout(function(){ panel.remove(); }, 280);
    };
    body.appendChild(backBtn);
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ panel.style.transform = 'translateX(0)'; }); });
  },

  // ── End session — compile to journal ─────────────────────────
  _endSession: function() {
    var self = this;
    var bar = document.getElementById('cpl-oracle-bar');
    if (bar) bar.remove();

    // Compile Oracle conversation to journal and update entry
    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    var sessionText = chatBox ? chatBox.innerText.slice(-3000) : '';

    if (self._activeId && sessionText) {
      self.updateEntry(self._activeId, { oracle_session: sessionText });
    }

    if (typeof saveToJournal === 'function' && self._activeConID) {
      saveToJournal(
        'Content Production Session — ConID #' + self._activeConID,
        'Session ended. Oracle conversation captured.\n\n' + sessionText.slice(0, 2000),
        'contentProductionLive'
      );
    }

    RPGACE.utils.toast('✅ Session ended · Saved to Journal · ConID #' + self._activeConID, '#3DAA6E', 4000);
    self._activeConID = null;
    self._activeId = null;
    self._refreshWidget();
  },

});
/* ===END:contentProductionLive=== */

/* ===MODULE:videoPipeline=== */
// F17: Video Pipeline tracker. Original spec assumed "EDL review, approve &
// render, connects to local_server.py job queue" — confirmed July 13 that
// local_server.py has no render/EDL endpoints (only /reports,
// /push-to-supabase, /watchlist for Content Intelligence) and no render
// engine exists anywhere in this codebase. Rescoped per user direction to a
// status tracker only, no actual rendering — same widget/progress-dot
// pattern as contentProductionLive's ConID tracker, over the video_jobs
// table (which beatLog already wrote to, but which never actually existed
// in Supabase until this session — every beatLog save has been silently
// failing; table created alongside this module).
RPGACE.register('videoPipeline', {

  STAGES: ['beat_logged', 'raw_footage', 'edited', 'rendered', 'exported'],
  STAGE_LABELS: { beat_logged: 'Beat Logged', raw_footage: 'Raw Footage', edited: 'Edited', rendered: 'Rendered', exported: 'Exported' },
  EXPORT_TARGETS: ['youtube', 'instagram', 'tiktok', 'beatstars'],

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectWidget(); }, 1700);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) self._injectWidget();
    });
  },

  updateEntry: function(id, updates) {
    updates.updated_at = new Date().toISOString();
    return fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/video_jobs?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'apikey': RPGACE.CONFIG.supabase.key,
        'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updates)
    });
  },

  _injectWidget: function() {
    if (document.getElementById('vp-widget')) return;
    var self = this;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    var widget = document.createElement('div');
    widget.id = 'vp-widget';
    widget.style.cssText = 'background:rgba(74,144,226,0.03);border:1px solid rgba(74,144,226,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
    var titleEl = document.createElement('div');
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(74,144,226,0.6);text-transform:uppercase;margin-bottom:3px;';
    eyebrow.textContent = 'Video Pipeline';
    var titleText = document.createElement('div');
    titleText.className = 'section-title';
    titleText.style.cssText = 'font-size:14px;';
    titleText.textContent = '📹 Video Jobs';
    titleEl.appendChild(eyebrow); titleEl.appendChild(titleText);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;';
    var newBtn = document.createElement('button');
    newBtn.textContent = '+ New';
    newBtn.style.cssText = 'background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:6px;color:#4A90E2;cursor:pointer;font-size:11px;font-weight:700;padding:4px 10px;font-family:Rajdhani,sans-serif;';
    newBtn.onclick = function() { self._showNewJobForm(); };
    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = '↻';
    refreshBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);cursor:pointer;font-size:12px;padding:4px 10px;';
    refreshBtn.onclick = function() { self._refreshWidget(); };
    btnRow.appendChild(newBtn); btnRow.appendChild(refreshBtn);
    hdr.appendChild(titleEl); hdr.appendChild(btnRow);
    widget.appendChild(hdr);

    var list = document.createElement('div');
    list.id = 'vp-list';
    list.style.cssText = 'max-height:320px;overflow-y:auto;';
    list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
    widget.appendChild(list);

    var cplWidget = document.getElementById('cpl-widget');
    if (cplWidget && cplWidget.nextSibling) {
      page.insertBefore(widget, cplWidget.nextSibling);
    } else if (cplWidget) {
      page.insertBefore(widget, cplWidget);
    } else {
      page.insertBefore(widget, page.firstChild);
    }

    self._refreshWidget();
    console.log('[videoPipeline] Widget injected');
  },

  _showNewJobForm: function() {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(74,144,226,0.25);border-radius:12px;padding:24px 28px;width:min(420px,95vw);';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = 'New Video Job';
    box.appendChild(title);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;';
    lbl.textContent = 'Title';
    var titleInp = document.createElement('input');
    titleInp.type = 'text'; titleInp.placeholder = 'e.g. Edison Tutorial Video';
    titleInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:12px;';
    box.appendChild(lbl); box.appendChild(titleInp);

    var pathLbl = document.createElement('div');
    pathLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;';
    pathLbl.textContent = 'Raw footage path (optional)';
    var pathInp = document.createElement('input');
    pathInp.type = 'text'; pathInp.placeholder = 'E:\\Videos\\raw_footage.mp4';
    pathInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:16px;';
    box.appendChild(pathLbl); box.appendChild(pathInp);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';
    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Create';
    saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(74,144,226,0.12);border:1px solid rgba(74,144,226,0.35);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    saveBtn.onclick = function() {
      var t = titleInp.value.trim();
      if (!t) { RPGACE.utils.toast('Add a title first', '#E25454', 2000); return; }
      RPGACE.sb.insert('video_jobs', {
        title: t,
        status: 'raw_footage',
        raw_path: pathInp.value.trim() || null,
        export_paths: {},
      }).then(function() {
        overlay.remove();
        self._refreshWidget();
        RPGACE.utils.toast('📹 Video job created: ' + t, '#4A90E2', 3000);
      }).catch(function(e) {
        RPGACE.utils.toast('Save error: ' + e.message, '#E25454', 3000);
      });
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  _refreshWidget: function() {
    var self = this;
    var list = document.getElementById('vp-list');
    if (!list) return;

    RPGACE.sb.select('video_jobs', 'order=created_at.desc&limit=20')
      .then(function(rows) {
        rows = rows || [];
        list.innerHTML = '';

        if (rows.length === 0) {
          list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">No video jobs yet. Log a beat, or use + New for a standalone video.</div>';
          return;
        }

        rows.forEach(function(row) { list.appendChild(self._renderRow(row)); });
      }).catch(function(e) {
        list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  _renderRow: function(row) {
    var self = this;
    var statusColors = {
      beat_logged: '#C9A84C', raw_footage: '#4A90E2', edited: '#9B59B6',
      rendered: '#E25454', exported: '#3DAA6E',
    };
    var stageIdx = self.STAGES.indexOf(row.status);
    if (stageIdx === -1) stageIdx = 0;
    var color = statusColors[row.status] || '#4A90E2';

    var item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px;border:1px solid rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,0.02);';

    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
    var titleSpan = document.createElement('span');
    titleSpan.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    titleSpan.textContent = row.title;
    var statusBadge = document.createElement('span');
    statusBadge.style.cssText = 'font-size:9px;font-weight:700;color:' + color + ';background:' + color.replace(')', ',0.1)').replace('rgb', 'rgba') + ';border:1px solid ' + color.replace(')', ',0.3)').replace('rgb', 'rgba') + ';border-radius:10px;padding:2px 8px;margin-left:8px;flex-shrink:0;';
    statusBadge.textContent = self.STAGE_LABELS[row.status] || row.status;
    topRow.appendChild(titleSpan); topRow.appendChild(statusBadge);
    item.appendChild(topRow);

    // Stage progress bar — same visual language as contentProductionLive's ConID tracker
    var progressWrap = document.createElement('div');
    progressWrap.style.cssText = 'display:flex;gap:3px;margin-bottom:8px;';
    self.STAGES.forEach(function(s, i) {
      var dot = document.createElement('div');
      dot.style.cssText = 'flex:1;height:3px;border-radius:2px;background:' + (i <= stageIdx ? color : 'rgba(255,255,255,0.08)') + ';';
      progressWrap.appendChild(dot);
    });
    item.appendChild(progressWrap);

    // Actions
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

    if (stageIdx < self.STAGES.length - 1) {
      var nextStage = self.STAGES[stageIdx + 1];
      var advBtn = document.createElement('button');
      advBtn.textContent = '→ Mark ' + self.STAGE_LABELS[nextStage];
      advBtn.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.6);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      advBtn.onclick = function() {
        self.updateEntry(row.id, { status: nextStage }).then(function() {
          self._refreshWidget();
          RPGACE.utils.toast(row.title + ' → ' + self.STAGE_LABELS[nextStage], color, 2000);
        });
      };
      actions.appendChild(advBtn);
    }

    var detailsBtn = document.createElement('button');
    detailsBtn.textContent = '📋 Paths + exports';
    detailsBtn.style.cssText = 'padding:4px 10px;background:rgba(74,144,226,0.06);border:1px solid rgba(74,144,226,0.15);border-radius:5px;color:#4A90E2;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    detailsBtn.onclick = function() { self._showDetails(row); };
    actions.appendChild(detailsBtn);

    item.appendChild(actions);
    return item;
  },

  // Per-stage paths + the "4 exports" (YouTube/Instagram/TikTok/Beatstars) —
  // no rendering happens here, these are just where the human puts the
  // real file path or URL once that step is done outside RPGACE.
  _showDetails: function(row) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(74,144,226,0.25);border-radius:12px;padding:24px 28px;width:min(480px,95vw);max-height:90vh;overflow-y:auto;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = row.title;
    box.appendChild(title);

    var pathFields = [
      { id: 'vp-raw', label: 'Raw footage path', value: row.raw_path },
      { id: 'vp-edited', label: 'Edited file path', value: row.edited_path },
      { id: 'vp-rendered', label: 'Rendered file path', value: row.rendered_path },
      { id: 'vp-notes', label: 'Notes', value: row.notes },
    ];
    pathFields.forEach(function(f) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
      lbl.textContent = f.label;
      var inp = document.createElement('input');
      inp.id = f.id; inp.type = 'text'; inp.value = f.value || '';
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      box.appendChild(lbl); box.appendChild(inp);
    });

    var exportLbl = document.createElement('div');
    exportLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:8px;margin-top:16px;';
    exportLbl.textContent = 'Export URLs / paths (4)';
    box.appendChild(exportLbl);

    var exportPaths = row.export_paths || {};
    self.EXPORT_TARGETS.forEach(function(t) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.4);margin-bottom:4px;margin-top:8px;text-transform:capitalize;';
      lbl.textContent = t;
      var inp = document.createElement('input');
      inp.id = 'vp-export-' + t; inp.type = 'text'; inp.value = exportPaths[t] || '';
      inp.placeholder = 'URL or file path';
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      box.appendChild(lbl); box.appendChild(inp);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(74,144,226,0.12);border:1px solid rgba(74,144,226,0.35);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    saveBtn.onclick = function() {
      var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
      var newExportPaths = {};
      self.EXPORT_TARGETS.forEach(function(t) {
        var v = g('vp-export-' + t);
        if (v) newExportPaths[t] = v;
      });
      var updates = {
        raw_path: g('vp-raw') || null,
        edited_path: g('vp-edited') || null,
        rendered_path: g('vp-rendered') || null,
        notes: g('vp-notes') || null,
        export_paths: newExportPaths,
      };
      self.updateEntry(row.id, updates).then(function() {
        overlay.remove();
        self._refreshWidget();
        RPGACE.utils.toast('✅ Video job updated', '#3DAA6E', 2500);
      });
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

});
/* ===END:videoPipeline=== */

/* ===MODULE:conidPot=== */
RPGACE.register('conidPot', {

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
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() {
        self._injectSaveBtn();
        self._patchTextSelect();
        self._updateBriefRotationLabel();
      }, 1800);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._injectSaveBtn(); }, 500);
      }
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectIdeaBank(); }, 500);
      }
    });
  },

  // ── Save an idea to ConIDPot ──────────────────────────────────
  saveIdea: function(text, source, suggestedTitle) {
    var self = this;
    // Generate suggested title from text
    var title = suggestedTitle || self._extractTitle(text);

    // Show save popup
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px 28px;width:min(500px,95vw);';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Save to Idea Bank · ConIDPot';

    var titleLbl = document.createElement('div');
    titleLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
    titleLbl.textContent = 'Idea title (edit if needed):';

    var titleInp = document.createElement('input');
    titleInp.type = 'text';
    titleInp.value = title;
    titleInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:#E2E2EC;font-size:13px;font-weight:600;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:12px;';

    var previewLbl = document.createElement('div');
    previewLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
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

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💡 Save to Idea Bank';
    saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };

    saveBtn.onclick = function() {
      var finalTitle = titleInp.value.trim() || title;
      var starred = starCb.checked;

      // Check for duplicates first
      RPGACE.sb.select('conid_pot', 'order=created_at.desc&limit=50')
        .then(function(existing) {
          var similar = (existing || []).find(function(e) {
            return self._similarity(e.title, finalTitle) > 0.6;
          });

          if (similar) {
            // Show merge prompt
            overlay.remove();
            self._showMergePrompt(similar, finalTitle, text, source, starred);
          } else {
            // Save fresh
            self._saveToSupabase(finalTitle, text, source, starred);
            overlay.remove();
          }
        }).catch(function() {
          self._saveToSupabase(finalTitle, text, source, starred);
          overlay.remove();
        });
    };

    btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(eyebrow); box.appendChild(titleLbl);
    box.appendChild(titleInp); box.appendChild(previewLbl);
    box.appendChild(preview); box.appendChild(starRow);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    titleInp.focus();
    titleInp.select();
  },

  _saveToSupabase: function(title, text, source, starred) {
    var self = this;
    // Detect phyla from idea text
    var phylaNums = self._quickDetectPhyla(text);

    RPGACE.sb.insert('conid_pot', {
      title:          title,
      idea_text:      text.slice(0, 3000),
      source:         source || 'manual',
      status:         'potential',
      phyla_detected: phylaNums,
      gap_score_avg:  0,
      starred:        starred || false,
    }).then(function() {
      RPGACE.utils.toast('💡 Saved to Idea Bank: ' + title.slice(0, 40), '#C9A84C', 3000);
      // Refresh idea bank if visible
      self._refreshIdeaBank();
    }).catch(function(e) {
      RPGACE.utils.toast('Error saving: ' + e.message, '#E25454', 3000);
    });
  },

  _showMergePrompt: function(existing, newTitle, newText, source, starred) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.25);border-radius:12px;padding:24px 28px;width:min(480px,95vw);';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:8px;';
    title.textContent = '⚠️ Similar idea found';

    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);margin-bottom:16px;line-height:1.6;';
    msg.innerHTML = 'Existing: <strong style="color:#C9A84C;">' + existing.title + '</strong><br>New: <strong style="color:#4A90E2;">' + newTitle + '</strong><br><br>Merge into one combined idea (best of both), or keep separate?';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var mergeBtn = document.createElement('button');
    mergeBtn.textContent = '🔀 Merge (recommended)';
    mergeBtn.style.cssText = 'flex:1;padding:9px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    mergeBtn.onclick = function() {
      // Merge: combine text, keep better title, add to merged_from
      var combinedText = existing.idea_text + '\n\n--- MERGED ---\n\n' + newText.slice(0, 1500);
      fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/conid_pot?id=eq.' + existing.id, {
        method: 'PATCH',
        headers: { 'apikey': RPGACE.CONFIG.supabase.key, 'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ idea_text: combinedText, merged_from: [newTitle] })
      }).then(function() {
        RPGACE.utils.toast('🔀 Merged into: ' + existing.title, '#3DAA6E', 3000);
        self._refreshIdeaBank();
      });
      overlay.remove();
    };

    var keepBtn = document.createElement('button');
    keepBtn.textContent = 'Keep separate';
    keepBtn.style.cssText = 'padding:9px 14px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    keepBtn.onclick = function() {
      self._saveToSupabase(newTitle, newText, source, starred);
      overlay.remove();
    };

    btnRow.appendChild(mergeBtn); btnRow.appendChild(keepBtn);
    box.appendChild(title); box.appendChild(msg); box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Inject Save Ideas button after Oracle panel responses ─────
  _injectSaveBtn: function() {
    var self = this;
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
      saveAllBtn.style.cssText = 'padding:4px 12px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:5px;color:#C9A84C;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
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
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px 28px;width:min(600px,95vw);max-height:90vh;overflow-y:auto;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:6px;';
    hdr.textContent = '💡 Select ideas to save (' + ideas.length + ' found)';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:16px;';
    sub.textContent = 'Each selected idea becomes a ConIDPot entry in your Idea Bank.';
    box.appendChild(hdr); box.appendChild(sub);

    var selectAll = document.createElement('button');
    selectAll.textContent = 'Select all';
    selectAll.style.cssText = 'padding:4px 10px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:rgba(226,226,236,0.4);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
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
      titleEl.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#E2E2EC;font-size:12px;font-weight:600;padding:4px 8px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:3px;';
      var preview = document.createElement('div');
      preview.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);';
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
      var saved = 0;
      ideas.forEach(function(idea, i) {
        var cb = document.getElementById('cp-idea-' + i);
        var titleInp = box.querySelectorAll('input[type="text"]')[i];
        if (cb && cb.checked) {
          var t = titleInp ? titleInp.value.trim() : idea.title;
          self._saveToSupabase(t, idea.text, 'oracle_panel', false);
          saved++;
        }
      });
      overlay.remove();
      RPGACE.utils.toast('💡 Saved ' + saved + ' ideas to Idea Bank', '#C9A84C', 3000);
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(saveSelBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Patch text-select panel to add Save as Idea button ───────
  _patchTextSelect: function() {
    var self = this;
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
    var self = this;
    var page = document.getElementById('page-research') ||
               document.getElementById('page-learning') ||
               document.querySelector('[id*="research"]') || document.querySelector('[id*="learning"]');
    if (!page) return;

    var panel = document.createElement('div');
    panel.id = 'cp-idea-bank';
    panel.style.cssText = 'background:rgba(201,168,76,0.03);border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Idea Bank · ConIDPot';
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    titleEl.textContent = 'Content Idea Bank';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:14px;';
    sub.textContent = 'All saved ideas. Click any idea to send to Oracle, Repurpose, Agenda, or Video Finder.';

    // Filter tabs
    var filterRow = document.createElement('div');
    filterRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;';
    var filters = ['All', 'Potential', 'Starred ⭐', 'Gap Match 🔴'];
    var activeFilter = 'All';
    filters.forEach(function(f) {
      var btn = document.createElement('button');
      btn.textContent = f;
      btn.dataset.filter = f;
      btn.style.cssText = 'padding:4px 10px;background:' + (f === activeFilter ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)') + ';border:1px solid ' + (f === activeFilter ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)') + ';border-radius:12px;color:' + (f === activeFilter ? '#C9A84C' : 'rgba(226,226,236,0.4)') + ';font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
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
    addBtn.style.cssText = 'padding:4px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.35);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    addBtn.onclick = function() { self.saveIdea('', 'manual', ''); };
    filterRow.appendChild(addBtn);

    var list = document.createElement('div');
    list.id = 'cp-idea-bank-list';
    list.style.cssText = 'max-height:400px;overflow-y:auto;';

    panel.appendChild(eyebrow); panel.appendChild(titleEl); panel.appendChild(sub);
    panel.appendChild(filterRow); panel.appendChild(list);

    // Insert before Video Workshop or Beat Log
    var beatLog = document.getElementById('beat-log-panel');
    var refCorpus = document.getElementById('ref-corpus-panel');
    var anchor = refCorpus || beatLog;
    if (anchor) {
      anchor.parentElement.insertBefore(panel, anchor);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    self._refreshIdeaBank('All');
  },

  _refreshIdeaBank: function(filter) {
    var self = this;
    var list = document.getElementById('cp-idea-bank-list');
    if (!list) return;
    list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">Loading...</div>';

    RPGACE.sb.select('conid_pot', 'order=created_at.desc&limit=50')
      .then(function(rows) {
        rows = rows || [];

        // Apply filter
        if (filter === 'Starred ⭐') rows = rows.filter(function(r) { return r.starred; });
        if (filter === 'Potential') rows = rows.filter(function(r) { return r.status === 'potential'; });
        if (filter === 'Gap Match 🔴') rows = rows.filter(function(r) { return r.gap_score_avg >= 6; });

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
            fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/conid_pot?id=eq.' + row.id, {
              method: 'PATCH',
              headers: { 'apikey': RPGACE.CONFIG.supabase.key, 'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ starred: !row.starred })
            }).then(function() { self._refreshIdeaBank(filter || 'All'); });
          };

          var titleEl = document.createElement('div');
          titleEl.style.cssText = 'flex:1;font-size:12px;font-weight:600;color:#E2E2EC;';
          titleEl.textContent = row.title;

          var sourceBadge = document.createElement('span');
          sourceBadge.style.cssText = 'font-size:9px;color:rgba(226,226,236,0.25);flex-shrink:0;';
          sourceBadge.textContent = row.source || 'manual';

          topRow.appendChild(starEl); topRow.appendChild(titleEl); topRow.appendChild(sourceBadge);
          item.appendChild(topRow);

          // Action buttons — connectors
          var actRow = document.createElement('div');
          actRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

          var connectors = [
            { label: '🔀 Repurpose', color: '#3DAA6E', action: function() {
              if (RPGACE.modules.contentRepurpose) {
                RPGACE.modules.contentRepurpose.openPopup(row.idea_text, row.title);
              }
            }},
            { label: '💬 Oracle', color: '#4A90E2', action: function() {
              if (typeof showPage === 'function') showPage('advisor');
              setTimeout(function() { RPGACE.utils.sendToOracle('Help me develop this content idea for @AceSanyaBeats:\n\n"' + row.title + '"\n\n' + (row.idea_text || '').slice(0, 500)); }, 300);
            }},
            { label: '📅 Add to Agenda', color: '#C9A84C', action: function() {
              var agendas = JSON.parse(localStorage.getItem('rpgace_sched_agendas') || '[]');
              var today = new Date().toISOString().split('T')[0];
              agendas.push({ id: 'cp_' + Date.now(), date: today, hour: 14, title: 'Content: ' + row.title.slice(0,40), description: 'Film and post: ' + row.title, category: 'content', estimated_mins: 60, xp: 80 });
              localStorage.setItem('rpgace_sched_agendas', JSON.stringify(agendas));
              RPGACE.utils.toast('📅 Added to agenda: ' + row.title.slice(0,30), '#C9A84C', 2500);
            }},
            { label: '⚡ Activate ConID', color: '#9B59B6', action: function() {
              if (RPGACE.modules.contentProductionLive) {
                RPGACE.modules.contentProductionLive.createEntry({ title: row.title, idea: row.idea_text, taxonomy_nodes: row.phyla_detected || [], status: 'Idea' });
                // Update pot status to activated
                fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/conid_pot?id=eq.' + row.id, {
                  method: 'PATCH',
                  headers: { 'apikey': RPGACE.CONFIG.supabase.key, 'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                  body: JSON.stringify({ status: 'activated' })
                }).then(function() { self._refreshIdeaBank(filter || 'All'); });
              }
            }},
            { label: '🗑', color: 'rgba(226,84,84,0.6)', action: function() {
              if (confirm('Delete "' + row.title + '"?')) {
                RPGACE.sb.del('conid_pot', 'id=eq.' + row.id)
                  .then(function() { self._refreshIdeaBank(filter || 'All'); });
              }
            }},
          ];

          connectors.forEach(function(c) {
            var btn = document.createElement('button');
            btn.textContent = c.label;
            btn.style.cssText = 'padding:3px 9px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:5px;color:' + c.color + ';font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            btn.onclick = c.action;
            actRow.appendChild(btn);
          });

          item.appendChild(actRow);
          list.appendChild(item);
        });
      }).catch(function(e) {
        list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  // ── Update Morning Brief rotation label ───────────────────────
  _updateBriefRotationLabel: function() {
    var day = new Date().getDay();
    var rotation = this.BRIEF_ROTATION[day];
    if (!rotation) return;

    var briefWrap = document.getElementById('mb-wrap');
    if (!briefWrap) return;

    var existing = document.getElementById('mb-rotation-label');
    if (existing) existing.remove();

    var label = document.createElement('span');
    label.id = 'mb-rotation-label';
    label.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.5);margin-left:10px;';
    label.textContent = '· ' + rotation.label;

    var autoLabel = briefWrap.querySelector('[style*="font-size:10px"]');
    if (autoLabel) autoLabel.appendChild(label);
  },

  // ── Get ideas for Morning Brief by day rotation ───────────────
  getIdeasForBrief: function() {
    var day = new Date().getDay();
    var rotation = this.BRIEF_ROTATION[day] || { type: 'gap' };

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

});
/* ===END:conidPot=== */
/* ===END_DOMAIN:CONTENT=== */

/* ===DOMAIN:JOURNAL=== */

/* ===MODULE:morningBrief=== */
RPGACE.register('morningBrief', {

  LAST_RUN_KEY: 'rpgace_morning_brief_last',

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() {
        self._injectButton();
        self._autoRun();
      }, 1200);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        self._injectButton();
      }
    });
  },

  _injectButton: function() {
    if (document.getElementById('mb-btn')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    var self = this;

    var wrap = document.createElement('div');
    wrap.id = 'mb-wrap';
    wrap.style.cssText = 'margin-bottom:20px;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;';

    var btn = document.createElement('button');
    btn.id = 'mb-btn';
    btn.textContent = '☀️ Morning Brief';
    btn.style.cssText = 'padding:10px 20px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:8px;color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    btn.onclick = function() { self._generate(); };

    var lastRun = localStorage.getItem(self.LAST_RUN_KEY);
    var autoLabel = document.createElement('div');
    autoLabel.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.25);';
    autoLabel.textContent = lastRun ? 'Last run: ' + new Date(lastRun).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : 'Auto-runs once per morning';

    btnRow.appendChild(btn);
    btnRow.appendChild(autoLabel);
    wrap.appendChild(btnRow);

    var output = document.createElement('div');
    output.id = 'mb-output';
    output.style.cssText = 'display:none;';
    wrap.appendChild(output);

    // Insert at top of dashboard
    page.insertBefore(wrap, page.firstChild);
    console.log('[RPGACE:morningBrief] Button injected');
  },

  _autoRun: function() {
    var self = this;
    var lastRun = localStorage.getItem(self.LAST_RUN_KEY);
    if (lastRun) {
      var last = new Date(lastRun);
      var now = new Date();
      // Only auto-run if last run was not today
      if (last.toDateString() === now.toDateString()) return;
    }
    // Auto-run if it's before noon (morning session)
    var hour = new Date().getHours();
    if (hour < 13) {
      setTimeout(function() { self._generate(); }, 2000);
    }
  },

  _generate: function() {
    var self = this;
    var output = document.getElementById('mb-output');
    if (!output) return;
    output.style.display = 'block';
    output.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;padding:12px 0;">☀️ Gathering your morning data...</div>';

    // Gather all three sources in parallel
    var promises = [
      self._getGmail(),
      self._getShifts(),
      self._getYouTube(),
      self._getKnowledgeGaps(),
    ];

    Promise.all(promises).then(function(results) {
      var gmail    = results[0];
      var shifts   = results[1];
      var youtube  = results[2];
      var gaps     = results[3];

      output.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;padding:8px 0;">☀️ Writing your brief...</div>';

      var today = new Date();
      var dateStr = today.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long'});

      // Get idea bank ideas for today's rotation
      var ideaPromise = (RPGACE.modules.conidPot && typeof RPGACE.modules.conidPot.getIdeasForBrief === 'function')
        ? RPGACE.modules.conidPot.getIdeasForBrief()
        : Promise.resolve([]);

      ideaPromise.then(function(ideas) {
        var ideaSection = '';
        if (ideas && ideas.length > 0) {
          var day = new Date().getDay();
          var dayLabels = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',0:'Sunday'};
          var rotationType = day === 3 || day === 4 ? 'oldest relevant' : day === 5 || day === 6 ? 'starred' : 'gap match';
          ideaSection = '\n\n💡 IDEA BANK (' + rotationType + ' — ' + dayLabels[day] + ')\n' +
            ideas.map(function(i) { return '• ' + i.title; }).join('\n');
        }

        var prompt = 'Write a Morning Brief for Alex (@AceSanyaBeats), an independent UK music producer. Today is ' + dateStr + '.\n\n' +
          'RULES: Under 400 words total. Direct and useful. No fluff. No greetings. Start with the most urgent thing.\n\n' +
          'FORMAT — use these exact sections:\n' +
          '📧 INBOX (' + gmail.unread + ' unread)\n' +
          (gmail.subjects.length ? gmail.subjects.map(function(s){return '• ' + s}).join('\n') : '• Nothing urgent') + '\n\n' +
          '📅 TODAY\'S SHIFTS\n' +
          (shifts.today.length ? shifts.today.map(function(s){return '• ' + s}).join('\n') : '• No shifts today — full creative day') + '\n\n' +
          '🎬 YOUTUBE (@AceSanyaBeats)\n' +
          '• ' + youtube.summary + '\n\n' +
          '🧠 TOP KNOWLEDGE GAP\n' +
          '• ' + (gaps.top ? gaps.top + ' (gap score ' + gaps.score + '/10 — study this today)' : 'Sync your encyclopedia to track gaps') +
          ideaSection + '\n\n' +
          '⚡ CREATIVE WINDOW\n' +
          (shifts.freeTime ? '• ' + shifts.freeTime : '• Full day available') + '\n\n' +
          'End with ONE sharp action line for today. Maximum 15 words. No punctuation at end.';

        RPGACE.utils.sendToOracle(prompt);
        localStorage.setItem(self.LAST_RUN_KEY, new Date().toISOString());
        var autoLabel = document.querySelector('#mb-wrap div[style*="font-size:10px"]');
        if (autoLabel) autoLabel.textContent = 'Last run: ' + new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
        output.innerHTML = '<div style="color:rgba(201,168,76,0.6);font-size:11px;padding:8px 0;">☀️ Morning Brief sent to Oracle ↑</div>';
      });

      // handled inside ideaPromise above
    }).catch(function(err) {
      output.innerHTML = '<div style="color:#E25454;font-size:12px;padding:8px 0;">Error: ' + err.message + '</div>';
    });
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

  _getShifts: function() {
    try {
      var shifts = JSON.parse(localStorage.getItem('rpgace_shifts') || '[]');
      var today = new Date().toISOString().split('T')[0];
      var todayShifts = shifts.filter(function(s) {
        return s.date === today || (s.date && s.date.startsWith(today));
      });

      var todayList = todayShifts.map(function(s) {
        return (s.start || '') + ' – ' + (s.end || '') + ' at ' + (s.location || s.venue || 'The Joiners Arms');
      });

      // Calculate free creative time
      var freeTime = null;
      if (todayShifts.length > 0) {
        var lastShift = todayShifts[todayShifts.length - 1];
        if (lastShift.end) {
          freeTime = 'Creative window after ' + lastShift.end;
        }
      } else {
        freeTime = 'Full day — no shifts. Protect at least 2 hours for FL Studio.';
      }

      // Also check tomorrow
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      var tomorrowStr = tomorrow.toISOString().split('T')[0];
      var tomorrowShifts = shifts.filter(function(s) { return s.date && s.date.startsWith(tomorrowStr); });
      if (tomorrowShifts.length > 0) {
        freeTime = (freeTime || '') + ' · Tomorrow: shift at ' + (tomorrowShifts[0].start || '?');
      }

      return Promise.resolve({ today: todayList, freeTime: freeTime });
    } catch(e) {
      return Promise.resolve({ today: [], freeTime: 'Could not read shifts' });
    }
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

  _getKnowledgeGaps: function() {
    if (!RPGACE.modules.taxonomySync) return Promise.resolve({ top: null, score: null });
    return RPGACE.modules.taxonomySync.getTopGaps(1)
      .then(function(nodes) {
        if (!nodes || nodes.length === 0) return { top: null, score: null };
        return { top: nodes[0].concept, score: parseFloat(nodes[0].gap_score).toFixed(1) };
      })
      .catch(function() { return { top: null, score: null }; });
  },

});
/* ===END:morningBrief=== */

/* ===END_DOMAIN:JOURNAL=== */

/* ===DOMAIN:SYSTEM=== */

/* ===MODULE:suppressQuestPopup=== */
RPGACE.register('suppressQuestPopup', {
  init: function() {
    var self = this;
    self._suppress();
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._suppress(); }, 500);
    });
  },
  _suppress: function() {
    if (window._questSuppressed) return;
    window._questSuppressed = true;
    if (typeof window.checkForQuestSuggestions === 'function') {
      window.checkForQuestSuggestions = function() {};
    }
    if (typeof window.showSuggestionPopup === 'function') {
      window.showSuggestionPopup = function() {};
    }
    var el = document.getElementById('suggestion-popup');
    if (el) el.remove();
  }
});
/* ===END:suppressQuestPopup=== */


/* ===MODULE:restoreSendChat=== */
RPGACE.register('restoreSendChat', {
  init: function() {
    // Run immediately — must fire before any user interaction
    RPGACE.streamOracle = null;
    window._sendChatPatched = false;
    RPGACE.hooks.on('rpgace:ready', function() {
      // Re-apply in case config module re-sets streamOracle after ready
      RPGACE.streamOracle = null;
      window._sendChatPatched = false;
      console.log('[RPGACE] streamOracle neutralised');
    });
  }
});
/* ===END:restoreSendChat=== */

/* ===MODULE:docsLinks=== */
RPGACE.register('docsLinks', {

  init: function() {
    var self = this;
    setTimeout(function() { self._inject(); }, 1200);
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'dashboard') self._inject();
    });
  },

  _inject: function() {
    if (document.getElementById('docs-links-box')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    var box = document.createElement('div');
    box.id = 'docs-links-box';
    box.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:16px;';

    var label = document.createElement('div');
    label.style.cssText = 'font-family:Cinzel,serif;font-size:10px;color:rgba(226,226,236,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;';
    label.textContent = '📚 Oversight — 6 Docs, Always Latest';
    box.appendChild(label);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    // "Oversight" = these 6 documents, treated as one group. Patch Notes,
    // Interconnection Map, and Full Manual are hand-updated session logs;
    // Taxonomy Map queries Supabase live on every load and never goes stale
    // on its own. System Flow Map (Mermaid diagrams) and Minotaur Map (the
    // labyrinth mental-map visual) were added July 17/18 - this list is the
    // real, live source of what "Oversight" links to, so it must be updated
    // the same session any new doc is added, not left to drift (found stale
    // at 4 on July 18 despite 2 more docs already existing for a day).
    // All 6 get updated together at the end of every session (see
    // CLAUDE.md's Oversight section for the convention).
    var links = [
      { label: '📓 Patch Notes', href: '/patch_notes.html', color: '#C9A84C' },
      { label: '🔗 Interconnection Map', href: '/interconnection_map.md', color: '#4A90E2' },
      { label: '📘 Full Manual', href: '/manual.html', color: '#9B59B6' },
      { label: '🌳 Taxonomy Map', href: '/taxonomy_map.html', color: '#2ABFB0' },
      { label: '🗺️ System Flow Map', href: '/system_flow_map.md', color: '#E2A83D' },
      { label: '🐂 Minotaur Map', href: '/minotaur_map.html', color: '#E25454' }
    ];

    links.forEach(function(l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = l.label;
      a.style.cssText = 'flex:1;min-width:120px;text-align:center;padding:9px 12px;background:' + l.color + '14;border:1px solid ' + l.color + '40;border-radius:8px;color:' + l.color + ';font-size:12px;font-weight:700;text-decoration:none;font-family:Rajdhani,sans-serif;';
      row.appendChild(a);
    });

    box.appendChild(row);

    var firstChild = page.querySelector('.section-title') || page.firstChild;
    if (firstChild) page.insertBefore(box, firstChild);
    else page.appendChild(box);
  },

});
/* ===END:docsLinks=== */
/* ===END_DOMAIN:SYSTEM=== */

/* ===DOMAIN:SCHEDULE=== */

/* ===MODULE:shiftSync=== */
RPGACE.register('shiftSync', {

  init: function() {
    var self = this;
    // Do NOT rely solely on rpgace:ready — it may have already fired before
    // this module's init() runs (confirmed failure mode from the taxonomy
    // detection build). Call directly with a delay instead, plus keep the
    // hook as a secondary path in case timing differs on some page loads.
    setTimeout(function() { self._syncFromSupabase(); }, 1200);

    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._syncFromSupabase(); }, 900);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.schedule) {
        setTimeout(function() { self._syncFromSupabase(); }, 300);
      }
    });
  },

  _syncFromSupabase: function() {
    var self = this;
    RPGACE.sb.select('rpgace_shifts', 'order=date.asc&limit=200')
      .then(function(rows) {
        rows = rows || [];
        if (rows.length === 0) {
          console.log('[shiftSync] No shifts in Supabase yet');
        } else {
          var shifts = rows.map(function(r) {
            return { date: r.date, day: r.day, role: r.role, start: r.start, end: r.end, hours: r.hours };
          });
          var before = JSON.parse(localStorage.getItem('rpgace_shifts') || '[]').length;
          localStorage.setItem('rpgace_shifts', JSON.stringify(shifts));
          console.log('[shiftSync] Synced ' + shifts.length + ' shifts from Supabase (was ' + before + ' in localStorage)');
          if (typeof window.autoApplyStoredShifts === 'function') window.autoApplyStoredShifts();
        }
        self._syncAgendasFromSupabase();
      })
      .catch(function(e) {
        console.warn('[shiftSync] Supabase shifts fetch failed:', e.message);
        self._syncAgendasFromSupabase();
      });
  },

  // ── Pulls scheduled agendas/tasks from Supabase into localStorage, same
  // ── cross-device pattern as shifts. Fixes tasks scheduled on one device
  // ── (e.g. phone) not appearing on another (e.g. desktop).
  _syncAgendasFromSupabase: function() {
    RPGACE.sb.select('rpgace_agendas', 'order=date.asc&limit=300')
      .then(function(rows) {
        rows = rows || [];
        localStorage.setItem('rpgace_sched_agendas', JSON.stringify(rows));
        console.log('[shiftSync] Synced ' + rows.length + ' agendas from Supabase');
        if (typeof window.buildMonthSlots === 'function') { try { window.buildMonthSlots(); } catch(e){} }
        if (typeof window.buildWeekSlots === 'function') { try { window.buildWeekSlots(); } catch(e){} }
        if (typeof window.renderDailyGrid === 'function') { try { window.renderDailyGrid(); } catch(e){} }
      })
      .catch(function(e) {
        console.warn('[shiftSync] Supabase agendas fetch failed:', e.message);
      });
  },

});
/* ===END:shiftSync=== */

/* ===END_DOMAIN:SCHEDULE=== */
