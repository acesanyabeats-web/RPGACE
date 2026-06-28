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
    ['Director Match', 'I am making a beat with the following characteristics: GENRE: [UK DRILL / UK HIP HOP / TRAP / AFROBEATS — choose one] MOOD: [DARK / EUPHORIC / MELANCHOLIC / AGGRESSIVE / CINEMATIC — choose one] KEY: [TYPE THE KEY AND SCALE, e.g. D Minor, F# Dorian] BPM: [TYPE THE BPM] REFERENCE ARTISTS: [NAME 1-3 ARTISTS THIS BEAT SOUNDS LIKE]. From the Phylum XXV filmmaker library, match me 3 directors whose visual signature fits this beat. For each director: their signature visual style in 3 words, the camera movement that defines them, their colour palette, why this beat fits their aesthetic, and an 80-word Neural Frames prompt I can use immediately.'],
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
    sub.textContent = 'Phylum XXV · Filmmaker Library · 6 Commands';
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
    phNote.textContent = 'Phylum XXV — Visio Cinematica';
    phNote.style.cssText = 'font-size:10px;color:rgba(155,89,182,0.6);margin-bottom:14px;letter-spacing:1px;border-left:2px solid rgba(155,89,182,0.3);padding-left:8px;';
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
        RPGACE.utils.fillGaps(cmd[1], function(filled) {
          var input = document.querySelector('#chat-input');
          if (!input) return;
          input.value = filled;
          input.dispatchEvent(new Event('input', {bubbles:true}));
          if (typeof sendChat === 'function') sendChat();
        });
      };
      body.appendChild(btn);
    });

    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });
  },

});
/* ===END:visualOracle=== */
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
    if (!window.sb) return;
    window.sb
      .from('taxonomy_nodes')
      .select('id,study_count,genus')
      .ilike('genus', '%' + concept + '%')
      .limit(1)
      .then(function(res) {
        if (!res.data || !res.data.length) return;
        var node = res.data[0];
        var updates = {
          study_count:     (node.study_count || 0) + 1,
          last_studied_at: new Date().toISOString(),
        };
        if (score >= 8) updates.applied_in_beat = true;
        window.sb.from('taxonomy_nodes').update(updates).eq('id', node.id).then(function() {
          console.log('[feynman] Taxonomy node updated:', concept, 'score:', score);
        });
      })
      .catch(function(e) { console.warn('[feynman] Taxonomy update failed:', e.message); });
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

  _dedup: function() {
    try {
      var raw = localStorage.getItem('rpgace_encyclopedia');
      if (!raw) return 0;
      var entries = JSON.parse(raw);
      var seen = {};
      var clean = entries.filter(function(e) {
        var key = (e.title || e.id || '').toLowerCase().trim();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      if (clean.length < entries.length) {
        localStorage.setItem('rpgace_encyclopedia', JSON.stringify(clean));
        return entries.length - clean.length;
      }
    } catch(e) {}
    return 0;
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
        var removed = self._dedup();
        self._clearBacklog();

        try {
          var after = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
          var net = after.length - before;
          var msg = net > 0
            ? '✅ ' + net + ' new entries added'
            : net === 0
              ? '✓ Already up to date'
              : '✓ Sync complete';
          if (removed > 0) msg += ' · ' + removed + ' duplicates removed';
          RPGACE.utils.toast(msg, 'rgba(201,168,76,0.9)', 3500);
          if (typeof window.refreshEncyclopediaDisplay === 'function') {
            window.refreshEncyclopediaDisplay();
          }
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

});
/* ===END:encSync=== */

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
      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m) { return m.addedNodes.length > 0; })) {
          setTimeout(function() { self._injectAll(); }, 150);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
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

  _injectInsights: function() {
    var self = this;
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('☁️','').trim() : '';
      /* Get entry id and url from localStorage */
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      var btn = self._mkBtn(function() {
        self._confirm(title, entry ? entry.url : '', card, function(saveBib) {
          self._deleteInsight(entry, title, card, saveBib);
        });
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
    return scores[0].score > 0 ? scores[0] : { num: 10, name: 'Technologia' };
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

    // Utility: send text to Oracle chat input and fire sendChat
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
