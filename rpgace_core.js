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

  _scan: function(all) {
    if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) return;
    var guard = localStorage.getItem('rpgace_ci_proposed') || '';
    var queued = 0, checked = 0;
    all.forEach(function(r) {
      if (checked >= 5) return;
      var key = r.url || r.title;
      if (!key || guard.indexOf('|' + key + '|') !== -1) return;
      checked++;
      guard += '|' + key + '|';
      var enc = r.insights && r.insights.encyclopedia_entry;
      var blob = [r.title, r.creator, enc && enc.summary,
        ((r.insights && r.insights.key_learnings) || []).join(' '),
        ((r.insights && r.insights.production_techniques) || []).join(' ')]
        .filter(Boolean).join(' ');
      if (blob.length < 60) return;
      var matches = RPGACE.utils._quickPhylaScan(blob);
      if (matches.length === 0) return;
      RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'content_intelligence', r.url || null)
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

    RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&select=id&limit=200')
      .then(function(rows) {
        rows = rows || [];
        var existing = document.getElementById('taxproposal-badge');
        if (rows.length === 0) { if (existing) existing.remove(); return; }
        if (existing) { existing.querySelector('.count').textContent = rows.length; return; }

        var badge = document.createElement('div');
        badge.id = 'taxproposal-badge';
        badge.style.cssText = 'background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.25);border-radius:10px;padding:12px 16px;margin-bottom:16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;';
        badge.innerHTML = '<span style="color:#9B59B6;font-size:12px;font-weight:700;">🌳 <span class="count">' + rows.length + '</span> taxonomy proposal' + (rows.length > 1 ? 's' : '') + ' waiting</span><span style="color:rgba(155,89,182,0.5);font-size:11px;">Review →</span>';
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

    RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&order=created_at.asc&limit=200')
      .then(function(rows) {
        rows = rows || [];
        box.innerHTML = '';
        box.appendChild(closeBtn);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
        title.textContent = 'Taxonomy Review Queue';
        var sub = document.createElement('div');
        sub.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
        sub.textContent = rows.length + ' proposal' + (rows.length !== 1 ? 's' : '') + ' waiting for review';
        box.appendChild(title); box.appendChild(sub);

        if (rows.length === 0) {
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
          var srcEl = document.createElement('div');
          srcEl.style.cssText = 'font-size:9px;color:' + (isPhylumPath ? 'rgba(61,170,110,0.7)' : 'rgba(155,89,182,0.6)') + ';white-space:nowrap;flex-shrink:0;';
          srcEl.textContent = (isPhylumPath ? '🧬 Phylum Path · ' : '') + (sourceLabels[p.source_type] || p.source_type);
          head.appendChild(pathEl); head.appendChild(srcEl);
          row.appendChild(head);

          if (p.matched_existing_node_id && !isPhylumPath) {
            var warn = document.createElement('div');
            warn.style.cssText = 'font-size:10px;color:#E25454;margin-bottom:8px;';
            warn.textContent = '⚠️ Possible overlap with an existing node — review before accepting.';
            row.appendChild(warn);
          }

          var btnRow = document.createElement('div');
          btnRow.style.cssText = 'display:flex;gap:6px;';

          var acceptBtn = document.createElement('button');
          acceptBtn.textContent = '✓ Accept';
          acceptBtn.style.cssText = 'padding:6px 12px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#3DAA6E;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          acceptBtn.onclick = function() {
            row.style.opacity = '0.4'; row.style.pointerEvents = 'none';
            if (isPhylumPath) { self._acceptPhylumPathProposal(p); }
            else { RPGACE.modules.taxonomyTree._acceptLineage(self._toProposal(p)); }
            row.remove();
          };

          var editBtn = document.createElement('button');
          editBtn.textContent = '✎ Edit';
          editBtn.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          editBtn.onclick = function() {
            overlay.remove();
            if (isPhylumPath) { self._editPhylumPathProposal(p); }
            else { RPGACE.modules.taxonomyTree._showProposalPopup(self._toProposal(p)); }
          };

          var rejectBtn = document.createElement('button');
          rejectBtn.textContent = '✗ Reject';
          rejectBtn.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:6px;color:#E25454;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          rejectBtn.onclick = function() {
            RPGACE.sb.update('taxonomy_proposals', 'id=eq.' + p.id, { status: 'rejected', reviewed_at: new Date().toISOString() }).catch(function() {});
            row.remove();
          };

          btnRow.appendChild(acceptBtn); btnRow.appendChild(editBtn); btnRow.appendChild(rejectBtn);
          row.appendChild(btnRow);
          box.appendChild(row);
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
  proposeLineage: function(topicText, phylumNumber, sourceType, sourceId) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;
    if (pp && pp.isEnabled(phylumNumber)) {
      return self._proposeLineageViaPhylumPath(topicText, phylumNumber, sourceType, sourceId);
    }
    var phylumName = self.PHYLUM_NAMES[phylumNumber] || 'Unknown';

    RPGACE.utils.toast('🌳 Generating taxonomy lineage...', '#9B59B6', 2500);

    var prompt = 'You are building a hierarchical taxonomy tree for a music production knowledge base.\n\n' +
      'ROOT ' + RPGACE.utils.phylumContext(phylumNumber) + '\n' +
      'TOPIC TO PLACE: "' + topicText + '"\n\n' +
      'This phylum has already been confirmed as a plausible fit for this topic. ' +
      'Generate a drill-down path from the Phylum down to this specific topic as the final leaf. ' +
      'Use as many or as few steps as genuinely needed — could be 2 steps, could be 10. ' +
      'Each step should be a real conceptual grouping, not padding.\n\n' +
      'Only the Phylum name uses Latin. Every other step uses plain, clear English.\n\n' +
      'Return ONLY a JSON object, no other text, in this exact format:\n' +
      '{"path": ["Step1Name","Step2Name","Step3Name","FinalTopicName"], ' +
      '"explainers": ["what Step1 covers and how its children relate","...", "..."], ' +
      '"is_leaf_specific": true}\n\n' +
      'The path array should NOT include the phylum name itself (that is depth 0, already known). ' +
      'Start from depth 1. The last item in path should be the specific topic itself.';

    fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You return only valid JSON, no markdown formatting, no explanation text.',
        max_tokens: 800
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      var cleaned = raw.replace(/```json|```/g, '').trim();
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in response');
      var parsed = JSON.parse(match[0]);

      self._checkForMorph(phylumNumber, parsed.path, function(morphMatch, exactLeafMatch) {
        self._showProposalPopup({
          phylumNumber: phylumNumber,
          phylumName: phylumName,
          path: parsed.path,
          explainers: parsed.explainers || [],
          sourceType: sourceType,
          sourceId: sourceId,
          morphMatch: exactLeafMatch || morphMatch,
          suggestUpdate: !!exactLeafMatch
        });
      });
    })
    .catch(function(err) {
      RPGACE.utils.toast('Error generating lineage: ' + err.message, '#E25454', 3500);
    });
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
  silentPropose: function(topicText, phylumNumber, sourceType, sourceId) {
    var self = this;
    var pp = RPGACE.modules.phylumPath;
    if (pp && pp.isEnabled(phylumNumber)) {
      return self._silentProposeViaPhylumPath(topicText, phylumNumber, sourceType, sourceId);
    }
    var phylumName = self.PHYLUM_NAMES[phylumNumber] || 'Unknown';
    var prompt = 'You are building a hierarchical taxonomy tree for a music production knowledge base.\n\n' +
      'ROOT ' + RPGACE.utils.phylumContext(phylumNumber) + '\n' +
      'TOPIC TO PLACE: "' + topicText + '"\n\n' +
      'This phylum has already been confirmed as a plausible fit for this topic. ' +
      'Generate a drill-down path from the Phylum down to this specific topic as the final leaf. ' +
      'Use as many or as few steps as genuinely needed — could be 2 steps, could be 10. ' +
      'Each step should be a real conceptual grouping, not padding.\n\n' +
      'Only the Phylum name uses Latin. Every other step uses plain, clear English.\n\n' +
      'Return ONLY a JSON object, no other text, in this exact format:\n' +
      '{"path": ["Step1Name","Step2Name","Step3Name","FinalTopicName"], ' +
      '"explainers": ["what Step1 covers and how its children relate","...", "..."], ' +
      '"is_leaf_specific": true}\n\n' +
      'The path array should NOT include the phylum name itself (that is depth 0, already known). ' +
      'Start from depth 1. The last item in path should be the specific topic itself.';

    return fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You return only valid JSON, no markdown formatting, no explanation text.',
        max_tokens: 800
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      var cleaned = raw.replace(/```json|```/g, '').trim();
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in response');
      var parsed = JSON.parse(match[0]);

      return new Promise(function(resolve, reject) {
        self._checkForMorph(phylumNumber, parsed.path, function(morphMatch, exactLeafMatch) {
          var matched = exactLeafMatch || morphMatch;
          RPGACE.sb.insert('taxonomy_proposals', {
            source_type: sourceType,
            source_id: sourceId,
            proposed_path: phylumName + ' → ' + parsed.path.join(' → '),
            proposed_steps: { path: parsed.path, explainers: parsed.explainers || [] },
            phylum_number: phylumNumber,
            matched_existing_node_id: matched ? matched.id : null,
          }).then(resolve).catch(reject);
        });
      });
    });
    // Note: deliberately no .catch() here - errors propagate to the caller.
    // ciAutoPropose/encSync's batch scans swallow per-item failures on
    // purpose (one bad report shouldn't stop the loop); encTaxonomyLink's
    // per-entry button attaches its own .catch() to show real user feedback.
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
// Piloted on Phylum 1 (Compositio) only - PHYLUM_NUM is the single knob to
// turn to point this at another phylum once proven; every function below
// takes phylumNumber as a parameter rather than hardcoding it, so
// generalizing later is a UI change, not a rewrite.
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

  PHYLUM_NUM: 1,

  // July 15: "old feeds new" unification - taxonomyTree.proposeLineage()/
  // silentPropose() check this before running their own flat top-down
  // path-generation, and delegate to decidePlacement()/_insertNewSteps()
  // below instead when the target phylum is enabled here. Still Phylum 1
  // only for now (confirmed) - expanding rollout later is just adding a
  // number to this check, not a rewrite.
  isEnabled: function(phylumNumber) { return phylumNumber === this.PHYLUM_NUM; },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._injectButton(); }, 1500); });
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
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectNavTab(); self._injectPageShell(); }, 1500);
    });
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
    var m1 = matches.find(function(m) { return m.num === self.PHYLUM_NUM; });
    if (!m1) return;

    var badge = document.createElement('button');
    badge.textContent = '🧬 Add to Phylum Path?';
    badge.style.cssText = 'margin-top:6px;padding:3px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.25);border-radius:12px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    badge.onclick = function() {
      badge.remove();
      self.open(text.slice(0, 2000));
    };
    lastMsg.appendChild(badge);
  },

  // ── Panel ──────────────────────────────────────────────────────────
  _close: function() {
    var p = document.getElementById('phylum-path-panel');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function(prefillText) {
    if (document.getElementById('phylum-path-panel')) { this._close(); return; }
    var self = this;
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

    var purposeNote = document.createElement('div');
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
  decidePlacement: function(insightText, phylumNumber) {
    return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc')
      .then(function(existing) {
        existing = existing || [];
        var pathList = existing.length
          ? existing.map(function(n) { return '- ' + n.path; }).join('\n')
          : '(nothing mapped yet - this will be the first entry)';

        var prompt = 'You are a private tutor with a PhD in ' + RPGACE.utils.phylumContext(phylumNumber) + ' as a formal academic discipline.\n\n' +
          'A student/producer just learned this insight:\n"' + insightText + '"\n\n' +
          'EXISTING STRUCTURE already mapped in this phylum (paths shown root-first):\n' + pathList + '\n\n' +
          'Decide where this insight belongs using these 5 checks, in order:\n' +
          '1. Pedagogical clarity — is each rank one genuinely distinct, teachable idea, not padding?\n' +
          '2. Non-redundancy — would merging two adjacent ranks lose anything real?\n' +
          '3. Practical applicability — can this cash out into an actual FL Studio move tonight?\n' +
          '4. Structural fit — does this attach cleanly to an EXISTING path above, or does it need a new one?\n' +
          '5. Expansion headroom — will this path still make sense once 20 more insights land under it?\n\n' +
          'Then decide:\n' +
          '- ATTACH POINT: the exact existing path string this insight should extend (copy one from the list above EXACTLY, character for character), or null if this needs a brand new path.\n' +
          '- NEW STEPS: the additional rank names needed from the attach point down to a specific, concrete leaf representing this insight. Use as many or as few as genuinely needed - could be 1, could be several. Do NOT repeat ranks that already exist in the attach point.\n' +
          '- One-sentence explainer per new step.\n\n' +
          'Return ONLY JSON, no markdown, no other text:\n' +
          '{"attachTo": "existing path string or null", "newSteps": ["Step1", "Step2"], "explainers": ["...", "..."]}';

        return fetch('/api/oracle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            system: 'You return only valid JSON, no markdown formatting, no explanation text.',
            max_tokens: 700
          })
        }).then(function(r) { return r.json(); }).then(function(data) {
          var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
          var cleaned = raw.replace(/```json|```/g, '').trim();
          var match = cleaned.match(/\{[\s\S]*\}/);
          if (!match) throw new Error('No JSON found in Oracle response');
          var parsed = JSON.parse(match[0]);

          var attachNode = null;
          if (parsed.attachTo) {
            attachNode = existing.find(function(n) { return n.path === parsed.attachTo; });
          }
          return { attachNode: attachNode, newSteps: parsed.newSteps || [], explainers: parsed.explainers || [] };
        });
      });
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
      if (finalRow) return self._generateInsightContent(finalRow, phylumNumber, insightText);
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
    var prompt = 'You are a private tutor with a PhD in ' + RPGACE.utils.phylumContext(phylumNumber) + ', teaching a UK hip hop / drill producer who works in FL Studio.\n\n' +
      'TOPIC: "' + node.name + '" (part of: ' + node.path + ')\n' +
      'THE INSIGHT THAT PROMPTED THIS: "' + insightText + '"\n\n' +
      'Teach this using the 3-layer method: simple terms first, then technical mechanics, then the one expert nuance most tutorials miss. Be specific to FL Studio. Keep this concise — under 350 words total across all 3 layers, this is a reference note attached to one taxonomy leaf, not a full lesson.';

    return fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var text = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      return RPGACE.sb.update('taxonomy_tree', 'id=eq.' + node.id, {
        deep_content: { generated: text, generated_at: new Date().toISOString() }
      });
    }).catch(function(e) {
      console.warn('[phylumPath] content generation failed:', e.message);
    });
  },

  // ── Article generation, any rank (or the phylum root itself if node   ──
  // ── is null) - manual button trigger only, per the questionnaire.     ──
  // ── Reuses saveOracleToEncyclopedia() + the same taxonomy_node_id      ──
  // ── linking pattern F7's encTaxonomyLink already established, instead  ──
  // ── of inventing new article storage.                                 ──
  _generateArticle: function(node) {
    var self = this;
    var phylumNumber = node ? node.phylum_number : self.PHYLUM_NUM;
    RPGACE.utils.toast('📄 Gathering content...', '#9B59B6', 2500);

    RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc')
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
        var prompt = 'You are a private tutor with a PhD in ' + RPGACE.utils.phylumContext(phylumNumber) + '.\n\n' +
          'Write a reference article for "' + title + '" (' + rankLabel + (node ? ', part of: ' + node.path : ', the root discipline itself') + ').\n\n' +
          'Synthesize the following accumulated teaching content from this topic and everything beneath it in the tree:\n\n' + (contentBlock || '(nothing accumulated yet - write a short foundational overview instead)') + '\n\n' +
          'Produce a well-organized synthesis a producer can use as a standing reference, not just a restated list. Keep it under 500 words — concise and usable beats exhaustive.';

        return fetch('/api/oracle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
          })
        }).then(function(r) { return r.json(); }).then(function(data) {
          var text = (data.content || []).map(function(c) { return c.text || ''; }).join('');
          var articleTitle = title + ' — ' + rankLabel + ' Reference';
          if (typeof saveOracleToEncyclopedia !== 'function') {
            RPGACE.utils.toast('Article generated but saveOracleToEncyclopedia() not found', '#E25454', 3500);
            return;
          }
          return saveOracleToEncyclopedia(articleTitle, text).then(function() {
            if (node) {
              return RPGACE.sb.update('encyclopedia', 'title=eq.' + encodeURIComponent(articleTitle), { taxonomy_node_id: node.id }).catch(function() {});
            }
          }).then(function() {
            RPGACE.utils.toast('✅ Article saved to Encyclopedia: ' + articleTitle, '#3DAA6E', 4000);
          });
        });
      }).catch(function(e) {
        RPGACE.utils.toast('Error generating article: ' + e.message, '#E25454', 3500);
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
      '<div class="section-title">🧬 Phylum Path — ' + RPGACE.utils.phylumLabel(this.PHYLUM_NUM) + '</div>' +
      '<div id="pp-breadcrumb" style="margin-bottom:10px;"></div>' +
      '<div id="pp-siblings" style="margin-bottom:14px;"></div>' +
      '<div id="pp-body"></div>';
    app.appendChild(page);
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

});
/* ===END:phylumPath=== */
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
      { num: 2,  name: 'Percussio',             keywords: [{t:'drum',w:2},{t:'kick',w:2},{t:'snare',w:2},{t:'808',w:2},{t:'hi-hat',w:2},{t:'groove',w:1},{t:'drum pattern',w:2},{t:'percussion',w:1}] },
      { num: 3,  name: 'Sonus Designatio',      keywords: [{t:'sound design',w:2},{t:'synth',w:2},{t:'sample',w:1},{t:'patch',w:1},{t:'oscillator',w:2},{t:'wavetable',w:2},{t:'texture',w:1}] },
      { num: 4,  name: 'Mixtura',               keywords: [{t:'mixing',w:2},{t:'eq',w:2},{t:'compress',w:2},{t:'sidechain',w:2},{t:'reverb',w:1},{t:'delay',w:1},{t:'gain',w:1},{t:'frequency',w:1}] },
      { num: 5,  name: 'Magistra',              keywords: [{t:'master',w:2},{t:'lufs',w:2},{t:'limiter',w:2},{t:'loudness',w:2},{t:'stem',w:1},{t:'final mix',w:2}] },
      { num: 6,  name: 'Instrumentarium',       keywords: [{t:'fl studio',w:2},{t:'vst',w:2},{t:'plugin',w:2},{t:'daw',w:2},{t:'workflow',w:1},{t:'edison',w:2},{t:'mixer',w:1},{t:'piano roll',w:2}] },
      { num: 7,  name: 'Sensus Auris',          keywords: [{t:'critical listening',w:2},{t:'reference track',w:2},{t:'a/b',w:2},{t:'monitor',w:1},{t:'speaker',w:1}] },
      { num: 8,  name: 'Anatomia',              keywords: [{t:'music theory',w:2},{t:'interval',w:2},{t:'mode',w:1},{t:'minor',w:1},{t:'major',w:1},{t:'degree',w:1},{t:'tension',w:1}] },
      { num: 9,  name: 'Historia',              keywords: [{t:'producer history',w:2},{t:'influence',w:1},{t:'era',w:1},{t:'sound like',w:2},{t:'inspired by',w:2}] },
      { num: 10, name: 'Psychologia',           keywords: [{t:'creative block',w:2},{t:'inspiration',w:1},{t:'flow state',w:2},{t:'mindset',w:1},{t:'habit',w:1},{t:'routine',w:1}] },
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

    // Taxonomy nodes multi-select
    var taxWrap = document.createElement('div');
    taxWrap.style.cssText = 'margin-bottom:14px;';
    var taxLbl = document.createElement('div');
    taxLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:8px;';
    taxLbl.textContent = 'Taxonomy Nodes Applied';
    var taxGrid = document.createElement('div');
    taxGrid.id = 'bl-tax-grid';
    taxGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    taxWrap.appendChild(taxLbl); taxWrap.appendChild(taxGrid);
    panel.appendChild(taxWrap);

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
          };
          taxGrid.appendChild(chip);
        });
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
    label.textContent = '📚 Oversight — 4 Docs, Always Latest';
    box.appendChild(label);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    // "Oversight" = these 4 documents, treated as one group. Patch Notes,
    // Interconnection Map, and Full Manual are hand-updated session logs;
    // Taxonomy Map queries Supabase live on every load and never goes stale
    // on its own. All 4 get updated together at the end of every session
    // (see CLAUDE.md's Oversight section for the convention).
    var links = [
      { label: '📓 Patch Notes', href: '/patch_notes.html', color: '#C9A84C' },
      { label: '🔗 Interconnection Map', href: '/interconnection_map.md', color: '#4A90E2' },
      { label: '📘 Full Manual', href: '/manual.html', color: '#9B59B6' },
      { label: '🌳 Taxonomy Map', href: '/taxonomy_map.html', color: '#2ABFB0' }
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
