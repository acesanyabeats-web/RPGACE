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

     Usage:
       RPGACE.register('feynman', {
         init() { RPGACE.hooks.on('page:show', name => { ... }); },
         startSession(concept) { ... },
       });
     ══════════════════════════════════════════════════════════ */
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

/* ================================================================
   GAP-FILL UTILITY
   When a prompt contains [PLACEHOLDER], show a step-by-step
   overlay asking the user to fill each one before sending.
================================================================ */
RPGACE.utils.fillGaps = function(prompt, onComplete) {
  var gaps = [];
  var re = /\[([^\]]+)\]/g;
  var m;
  while ((m = re.exec(prompt)) !== null) {
    gaps.push({ label: m[1], index: m.index, raw: m[0] });
  }
  if (!gaps.length) { onComplete(prompt); return; }

  var filled = {};
  var step = 0;

  var overlay = document.createElement('div');
  overlay.id = 'gap-fill-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:10000;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:28px 32px;width:min(420px,90vw);max-width:100%;';

  var render = function() {
    box.innerHTML = '';
    var g = gaps[step];
    var stepLabel = document.createElement('div');
    stepLabel.textContent = 'Fill in · ' + (step+1) + ' of ' + gaps.length;
    stepLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.65);margin-bottom:10px;';
    box.appendChild(stepLabel);

    var question = document.createElement('div');
    question.textContent = g.label;
    question.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:16px;line-height:1.4;';
    box.appendChild(question);

    var input = document.createElement('textarea');
    input.placeholder = 'Type your answer here...';
    input.value = filled[step] || '';
    input.style.cssText = 'width:100%;min-height:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:7px;color:#E2E2EC;font-family:Rajdhani,sans-serif;font-size:13px;padding:10px 12px;resize:vertical;outline:none;box-sizing:border-box;';
    box.appendChild(input);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:16px;justify-content:flex-end;';

    if (step > 0) {
      var backBtn = document.createElement('button');
      backBtn.textContent = '← Back';
      backBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.15);color:rgba(226,226,236,0.5);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';
      backBtn.onclick = function() { filled[step] = input.value; step--; render(); };
      btnRow.appendChild(backBtn);
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    var isLast = step === gaps.length - 1;
    var nextBtn = document.createElement('button');
    nextBtn.textContent = isLast ? '✓ Submit' : 'Next →';
    nextBtn.style.cssText = 'background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.4);color:#C9A84C;border-radius:6px;padding:8px 20px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;';
    nextBtn.onclick = function() {
      var val = input.value.trim();
      if (!val) { input.style.borderColor = 'rgba(226,84,84,0.6)'; return; }
      filled[step] = val;
      if (isLast) {
        overlay.remove();
        var result = prompt;
        gaps.forEach(function(g2, i) {
          result = result.replace(g2.raw, filled[i] || g2.raw);
        });
        onComplete(result);
      } else {
        step++;
        render();
      }
    };
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) nextBtn.click();
    });
    btnRow.appendChild(nextBtn);
    box.appendChild(btnRow);

    var hint = document.createElement('div');
    hint.textContent = 'Ctrl+Enter to continue';
    hint.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.25);margin-top:8px;text-align:right;';
    box.appendChild(hint);

    setTimeout(function() { input.focus(); }, 50);
  };

  render();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
};

/* ================================================================
   SEND TO ORACLE HELPER (shared by all panels)
================================================================ */
RPGACE.utils.sendToOracle = function(prompt) {
  var input = document.getElementById('chat-input') || document.querySelector('textarea');
  if (!input) { RPGACE.utils.toast('Oracle input not found', 'rgba(226,84,84,0.9)', 2500); return; }
  input.value = prompt;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  var sb = document.getElementById('send-btn') || document.querySelector('[onclick*="sendChat"]');
  if (sb) { setTimeout(function() { sb.click(); }, 80); }
  else if (typeof sendChat === 'function') { setTimeout(sendChat, 80); }
};

/* ================================================================
   UPDATE YOUTUBE ORACLE run() TO USE fillGaps
================================================================ */
(function() {
  var orig = RPGACE.modules.youtubeOracle && RPGACE.modules.youtubeOracle.run;
  if (!orig) return;
  RPGACE.modules.youtubeOracle.run = function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    var self = this;
    RPGACE.utils.fillGaps(cmd[1], function(filled) {
      RPGACE.utils.sendToOracle(filled);
      RPGACE.utils.toast('?? ' + cmd[0], 'rgba(255,120,120,0.9)', 2000);
    });
  };
})();

/* ================================================================
   PROD. BY ORACLE PANEL — Step 9 style
================================================================ */
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

/* ================================================================
   INSTA-ORACLE PANEL — Step 9 style
================================================================ */
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

/* ================================================================
   ENCYCLOPEDIA SYNC FIX
   - Deduplicates entries by title after syncAndPush()
   - Clears rpgace_enc_saved URL backlog after sync
   - clearEncyclopedia() also wipes both backlogs
================================================================ */
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
