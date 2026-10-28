
/* ===MODULE:oracleProfessor=== */
// Oct 21 2026 — OP-1 of "Oracle Professor Mode"
// (records/2026-10/oracle_professor_mode_paranoia_2026-10-21.txt).
// Step 1 of 5: the map and the planner. Chat does not change yet (OP-2..5).
//   map     = askMyData.SOURCES (every domain) + SELF_KNOWLEDGE cut into
//             ~2500-char sections, so a later answer reads only the parts
//             it needs instead of the whole digest.
//   plan()  = one Haiku call (phylumPath.MECHANICAL_MODEL — Alex approved
//             Haiku for planning in this plan) returning
//             {deep, sources:[{key, search}], sections:[n], topic, why}.
//             Falls back to a free keyword plan if the call fails.
//   sanitizeTopic() = strict code check on the web topic (Alex: "strict
//             too"): no names, places, numbers, dates, money, emails, links
//             or I/my words. Gemini only ever sees what survives this.
RPGACE.register('oracleProfessor', {
  domain: 'oracle',

  SECTION_CHARS: 2500,
  MAX_SOURCES: 4,
  MAX_SECTIONS: 4,
  TOPIC_MAX: 80,
  GATHER_MS: 20000,
  WEB_CHARS: 3000,
  CONDENSE_MIN: 3000,
  CONDENSE_IN_MAX: 24000,
  BRIEF_MAX: 1500,
  RAW_MAX: 6000,
  // OP-4: Alex chose Opus for deep answers; Sonnet (the ground worker) if
  // his key can't use it — said in the answer, never silent.
  PROF_MODEL: 'claude-opus-5-5',
  PROF_FALLBACK: 'claude-sonnet-4-6',
  PROF_TOKENS: 8000,   // Opus 5.5 always thinks first; thinking counts here
  PROF_EFFORT: 'medium',
  PROF_PREFIX: 'prof:',
  QUICK_PREFIX: 'quick:',
  AUTO: true,          // OP-5: route every chat message (deep -> professor)
  SHORT_CHARS: 40,     // shorter messages use the free keyword plan, never deep
  // USD per million tokens (claude-api skill price table, cached 2026-10-06).
  PRICES: { 'claude-opus-5-5': [4, 20, 0.2], 'claude-sonnet-4-6': [3, 15, 0.3], 'claude-haiku-4-5-20251001': [1, 5, 0.1] },
  GBP_PER_USD: 0.79,   // approximate; the cost line says ≈
  PROF_SYSTEM: RPGACE.prompt('professor'), // RF-7: prompts/professor.md
  // Always removed from the web topic, plus every name in the people table.
  PRIVATE_WORDS: ['alex', 'ace', 'acesanyabeats', 'sanya', 'derby', 'derbyshire', 'uk', 'england', 'britain', 'british', 'rpgace'],
  FIRST_PERSON: ['i', 'me', 'my', 'mine', 'myself', 'im', 'ive', 'id', 'ill', 'we', 'our', 'ours', 'us'],
  TIME_WORDS: ['today', 'tomorrow', 'yesterday', 'tonight', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'],
  SMALL_TALK: /^(hi|hey|hiya|hello|yo|thanks|thank you|cheers|ok|okay|cool|nice|great|lol|good (morning|night|evening|afternoon)|bye|night)[\s!.?]*$/i,
  DEEP_WORDS: /\b(why|should i|compare|versus|vs|plan|strategy|best way|pros and cons|explain|analy[sz]e|improve|what if|trade-?off)\b/i,

  _sections: null,
  _people: null,
  _busy: false,

  logic: {
    // ED-1 (Oct 22 2026, plan "Domain Spine & Externals"): SELF_KNOWLEDGE is
    // [[CORE]] + one [[DOMAIN]] block per RPGACE.DOMAINS key. Each domain
    // block is cut into <= SECTION_CHARS pieces at a sentence end; titles are
    // "DOMAIN — first words". The core is not a section: sectionsText always
    // sends it. Text with no markers falls back to one plain block.
    skParts: function() {
      var g = RPGACE.modules.oracleAppGrounding;
      var sk = (g && g.SELF_KNOWLEDGE) || '';
      var re = /\[\[([A-Z]+(?:\/[A-Z]+)?)\]\]\s*/g, m, marks = []; // CK-1: [[PARENT/SUB]] sub-blocks
      while ((m = re.exec(sk))) marks.push({ key: m[1], at: m.index, body: re.lastIndex });
      if (!marks.length) return { core: '', blocks: [{ key: 'NOTES', text: sk.trim() }] };
      var core = '', blocks = [];
      marks.forEach(function(mk, i) {
        var text = sk.slice(mk.body, i + 1 < marks.length ? marks[i + 1].at : sk.length).trim();
        if (mk.key === 'CORE') core = text; else if (text) blocks.push({ key: mk.key, text: text });
      });
      return { core: core, blocks: blocks };
    },

    coreText: function() {
      return RPGACE.modules.oracleProfessor.logic.skParts().core;
    },

    skSections: function() {
      var self = RPGACE.modules.oracleProfessor;
      if (self._sections) return self._sections;
      var out = [], max = self.SECTION_CHARS;
      self.logic.skParts().blocks.forEach(function(b) {
        var sk = b.text, start = 0;
        while (start < sk.length) {
          var end = Math.min(sk.length, start + max);
          if (end < sk.length) {
            var cut = sk.lastIndexOf('. ', end);
            if (cut > start + max / 2) end = cut + 1;
          }
          var text = sk.slice(start, end).trim();
          if (text) {
            var words = text.split(/\s+/).slice(0, 9).join(' ').replace(/[^\w\s&\/().,'-]/g, '');
            out.push({ id: out.length + 1, domain: b.key.split('/')[0], title: b.key + ' — ' + words, text: text });
          }
          start = end;
        }
      });
      self._sections = out;
      return out;
    },

    // The compact index the planner reads: source keys + section titles.
    buildMap: function() {
      var self = RPGACE.modules.oracleProfessor;
      var src = (RPGACE.modules.askMyData && RPGACE.modules.askMyData.SOURCES) || {};
      var lines = ['DATA SOURCES (key = what it holds):'];
      Object.keys(src).forEach(function(k) { lines.push(k + ' = ' + src[k].label); });
      lines.push('', 'APP NOTES SECTIONS (number = where it starts):');
      self.logic.skSections().forEach(function(s) { lines.push(s.id + ' = ' + s.title); });
      return lines.join('\n');
    },

    // Free pre-check: greetings and one-word replies never cost a call.
    needsPlan: function(text) {
      var self = RPGACE.modules.oracleProfessor;
      var t = String(text || '').trim();
      return t.length >= 4 && !self.SMALL_TALK.test(t);
    },

    emptyPlan: function(why) {
      return { deep: false, sources: [], sections: [], topic: '', why: why || '' };
    },

    // Names from the people table, cached; strict topic cleaning uses them.
    loadPeople: function() {
      var self = RPGACE.modules.oracleProfessor;
      if (self._people) return Promise.resolve(self._people);
      var tp = RPGACE.modules.tripPlans;
      if (!tp || !tp.logic.read) return Promise.resolve([]);
      return tp.logic.read('people', 'select=name&limit=300').then(function(rows) {
        var names = [];
        (Array.isArray(rows) ? rows : []).forEach(function(r) {
          String(r.name || '').toLowerCase().split(/[^a-z'-]+/).forEach(function(w) { if (w.length >= 3) names.push(w); });
        });
        self._people = names;
        return names;
      }).catch(function() { return []; });
    },

    // Strict: whatever goes to Gemini is a general subject only.
    sanitizeTopic: function(topic) {
      var self = RPGACE.modules.oracleProfessor;
      var t = String(topic || '');
      t = t.replace(/\S+@\S+/g, ' ').replace(/https?:\/\/\S+|www\.\S+/gi, ' ');
      t = t.replace(/[£$€¥]\s*[\d.,]+/g, ' ').replace(/\d[\d.,:\/-]*\s*(%|kg|g|ml|l|k|mins?|hours?|hrs?|years?|yrs?|days?|weeks?|months?|st|nd|rd|th)?\b/gi, ' ');
      var drop = {};
      self.PRIVATE_WORDS.concat(self.FIRST_PERSON, self.TIME_WORDS, self._people || []).forEach(function(w) { drop[w] = true; });
      var words = t.split(/[^A-Za-z&+#'-]+/).filter(function(w) {
        var k = w.toLowerCase().replace(/'s$/, '').replace(/'/g, '');
        return k && !drop[k];
      });
      // A removed word can leave a dangling "in"/"for" at either end.
      var EDGE = /^(in|on|at|for|of|the|a|an|to|with|and|or|from|by|about)$/i;
      while (words.length && EDGE.test(words[words.length - 1])) words.pop();
      while (words.length && EDGE.test(words[0])) words.shift();
      var out = '';
      for (var i = 0; i < words.length; i++) {
        var next = out ? out + ' ' + words[i] : words[i];
        if (next.length > self.TOPIC_MAX) break;
        out = next;
      }
      return words.length >= 2 ? out : '';
    },

    // Keep only real source keys and section numbers, cap the lists, and
    // run the topic through sanitizeTopic — never trust model JSON (rule 5).
    cleanPlan: function(j) {
      var self = RPGACE.modules.oracleProfessor;
      var src = (RPGACE.modules.askMyData && RPGACE.modules.askMyData.SOURCES) || {};
      var count = self.logic.skSections().length;
      var seen = {}, sources = [];
      (Array.isArray(j && j.sources) ? j.sources : []).forEach(function(s) {
        var key = String((s && s.key) || s || '').toLowerCase().trim();
        if (!src[key] || seen[key] || sources.length >= self.MAX_SOURCES) return;
        seen[key] = true;
        sources.push({ key: key, search: String((s && s.search) || '').replace(/[^\w\s'-]/g, '').trim().slice(0, 40) });
      });
      var sections = [];
      (Array.isArray(j && j.sections) ? j.sections : []).forEach(function(n) {
        n = parseInt(n, 10);
        if (n >= 1 && n <= count && sections.indexOf(n) < 0 && sections.length < self.MAX_SECTIONS) sections.push(n);
      });
      return {
        deep: !!(j && j.deep === true),
        sources: sources,
        sections: sections,
        topic: self.logic.sanitizeTopic(j && j.topic),
        why: String((j && j.why) || '').slice(0, 160),
      };
    },

    // No-cost plan when the Haiku call fails: sources whose key or label
    // words appear in the question, sections with the most shared words.
    fallbackPlan: function(question) {
      var self = RPGACE.modules.oracleProfessor;
      var q = String(question || '').toLowerCase();
      var qWords = {};
      q.split(/[^a-z]+/).forEach(function(w) { if (w.length >= 4) qWords[w] = true; });
      var src = (RPGACE.modules.askMyData && RPGACE.modules.askMyData.SOURCES) || {};
      var sources = [];
      Object.keys(src).forEach(function(k) {
        var hit = qWords[k] || String(src[k].label).toLowerCase().split(/[^a-z]+/).some(function(w) { return w.length >= 4 && qWords[w]; });
        if (hit && sources.length < self.MAX_SOURCES) sources.push({ key: k, search: '' });
      });
      var scored = self.logic.skSections().map(function(s) {
        var score = 0, seen = {};
        s.text.toLowerCase().split(/[^a-z]+/).forEach(function(w) { if (qWords[w] && !seen[w]) { seen[w] = true; score++; } });
        return { id: s.id, score: score };
      }).filter(function(s) { return s.score >= 2; }).sort(function(a, b) { return b.score - a.score; });
      var plan = self.logic.emptyPlan('keyword plan');
      plan.deep = q.length > 160 || self.DEEP_WORDS.test(q);
      plan.sources = sources;
      plan.sections = scored.slice(0, 3).map(function(s) { return s.id; });
      return plan;
    },

    // OP-2: fetch what the plan asked for, all at once. Each piece fails
    // on its own (listed in errors, never hidden); nothing waits forever.
    //   data  = askMyData.fetchSource per source (same read path as
    //           DATA_QUERY), rows compacted by askMyData.compactRows
    //   notes = the chosen SELF_KNOWLEDGE sections, no call needed
    //   web   = webLookup.logic.lookup on the censored topic only — Library
    //           first (free repeat), else Gemini via /api/search; the answer
    //           is saved to the Library like any 🌐 lookup.
    gather: function(plan) {
      var self = RPGACE.modules.oracleProfessor;
      var A = RPGACE.modules.askMyData;
      var started = Date.now(), errors = [];
      plan = plan || self.logic.emptyPlan();
      var data = (plan.sources || []).map(function(s) {
        var src = A && A.SOURCES[s.key];
        if (!src) return Promise.resolve(null);
        return self.logic.withTimeout(A.fetchSource(src, s.search), self.GATHER_MS, src.label).then(function(rows) {
          return { key: s.key, label: src.label, search: s.search || '', rows: A.compactRows(Array.isArray(rows) ? rows : []) };
        }).catch(function(e) { errors.push(src.label + ': ' + ((e && e.message) || 'failed')); return null; });
      });
      var secs = self.logic.skSections();
      var notes = (plan.sections || []).map(function(n) { return secs[n - 1]; }).filter(Boolean)
        .map(function(s) { return { id: s.id, title: s.title, text: s.text }; });
      // Checked again here: whatever reaches Gemini has passed the strict filter.
      var topic = self.logic.sanitizeTopic(plan.topic);
      var wl = RPGACE.modules.webLookup;
      var web = (topic && wl) ? self.logic.withTimeout(wl.logic.lookup(topic, { noPicker: true, title: 'Oracle research: ' + topic }), self.GATHER_MS, 'web').then(function(r) {
        return { topic: topic, answer: String(r.answer || '').slice(0, self.WEB_CHARS), sources: r.sources || [], reused: !!r.reused };
      }).catch(function(e) { errors.push('web: ' + ((e && e.message) || 'failed')); return null; }) : Promise.resolve(null);
      return Promise.all([Promise.all(data), web]).then(function(out) {
        return { data: out[0].filter(Boolean), notes: notes, web: out[1], errors: errors, ms: Date.now() - started };
      });
    },

    // OP-3: evidence as one tagged text. Rows become "k: v · k: v" lines
    // (cheaper than JSON); every block carries the tag the answer will cite.
    evidenceText: function(ev) {
      ev = ev || {};
      var parts = [];
      (ev.data || []).forEach(function(d) {
        var tag = '[' + d.label + ']';
        var lines = d.rows.map(function(r) { return Object.keys(r).map(function(k) { return k + ': ' + r[k]; }).join(' · '); });
        parts.push(tag + (d.search ? ' (search "' + d.search + '")' : '') + ' ' + d.rows.length + ' rows\n' + (lines.join('\n') || '(no rows)'));
      });
      (ev.notes || []).forEach(function(n) { parts.push('[app notes ' + n.id + ']\n' + n.text); });
      if (ev.web) {
        var src = (ev.web.sources || []).map(function(x, i) { return '[web ' + (i + 1) + '] ' + x.title + ' — ' + x.url; }).join('\n');
        parts.push('[web] topic "' + ev.web.topic + '"\n' + ev.web.answer + (src ? '\n' + src : ''));
      }
      (ev.errors || []).forEach(function(e) { parts.push('[missing] ' + e); });
      return parts.join('\n\n');
    },

    // Small evidence goes straight on (a Haiku call would cost more than
    // it saves); bigger evidence becomes a tagged bullet brief. Any failure
    // falls back to the raw evidence, trimmed, and says so.
    // Not phylumPath._condenseIfLarge: that strips filler from one text with
    // no question in mind; this picks facts for a question and keeps tags.
    condense: function(question, ev) {
      var self = RPGACE.modules.oracleProfessor;
      var raw = self.logic.evidenceText(ev);
      var base = { raw_chars: raw.length };
      if (raw.length <= self.CONDENSE_MIN) return Promise.resolve(Object.assign(base, { brief: raw, condensed: false, note: raw ? '' : 'no evidence' }));
      var fallback = function(why) {
        var cut = raw.length > self.RAW_MAX;
        return Object.assign(base, { brief: cut ? raw.slice(0, self.RAW_MAX) + '\n[trimmed: ' + (raw.length - self.RAW_MAX) + ' more characters not shown]' : raw, condensed: false, note: 'condense skipped (' + why + ')' });
      };
      var pp = RPGACE.modules.phylumPath;
      if (!pp || !pp.logic._callGroundWorkerText) return Promise.resolve(fallback('no helper'));
      var prompt = 'QUESTION: ' + String(question || '').slice(0, 1000) + '\n\nEVIDENCE:\n' + (raw.length > self.CONDENSE_IN_MAX ? raw.slice(0, self.CONDENSE_IN_MAX) + '\n[missing] evidence trimmed: ' + (raw.length - self.CONDENSE_IN_MAX) + ' more characters not shown' : raw) +
        '\n\nTurn the evidence into a dense brief for answering the question. One fact per line, each line starting with "- " and ending with its source tag exactly as written above, e.g. [Food log] or [app notes 4] or [web 2]. ' +
        'Keep every number, date, amount, unit, item name, quote and link exactly. Keep [missing] lines. Drop anything that does not help answer the question. No intro, no conclusion, at most ' + self.BRIEF_MAX + ' characters.';
      return pp.logic._callGroundWorkerText(prompt, 700, pp.MECHANICAL_MODEL).then(function(txt) {
        var lines = String(txt || '').split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return /^- /.test(l); });
        if (!lines.length) return fallback('empty reply');
        var brief = lines.join('\n');
        if (brief.length > self.BRIEF_MAX + 500) brief = brief.slice(0, self.BRIEF_MAX + 500);
        return Object.assign(base, { brief: brief, condensed: true, note: '' });
      }).catch(function(e) { return fallback((e && e.message) || 'error'); });
    },

    // OP-4: the professor answer. Its own call to /api/oracle (not
    // window.callOracle: that can't pick a model, and the grounding wraps
    // would paste the whole SELF_KNOWLEDGE back in). Respects Dummy mode;
    // Fallback Scout has no live answer, so it says so.
    answer: function(question, brief, opts, onChunk) {
      var self = RPGACE.modules.oracleProfessor;
      opts = opts || {};
      var hist = (opts.history || []).slice(-4).map(function(m) { return { role: m.role, content: String(m.content || '').slice(0, 2000) }; });
      var user = 'QUESTION: ' + String(question || '') + '\n\nEVIDENCE BRIEF (each line ends with its source tag):\n' + (brief || '(no evidence gathered)') +
        (opts.note ? '\n\nNOTE: ' + opts.note : '');
      var messages = hist.concat([{ role: 'user', content: user }]);
      var mo = RPGACE.modules.mockOracle;
      if (mo && mo.isEnabled && mo.isEnabled()) {
        return Promise.resolve(mo._fakeReply(messages, self.PROF_SYSTEM, onChunk)).then(function(d) {
          var t = ((d && d.content) || []).map(function(c) { return c.text || ''; }).join('');
          return { text: t, usage: null, model: 'dummy', fellBack: false };
        });
      }
      if (mo && mo.isFallbackMode && mo.isFallbackMode()) return Promise.reject(new Error('Oracle is in Fallback Scout mode - professor answers need the live API'));
      var run = function(model) {
        return fetch('/api/oracle', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messages, system: self.PROF_SYSTEM, maxTokens: self.PROF_TOKENS, model: model, stream: true, effort: self.PROF_EFFORT })
        }).then(function(res) {
          if (!res.ok) return res.json().catch(function() { return {}; }).then(function(d) { var e = new Error(d.error || ('Oracle error ' + res.status)); e.status = res.status; throw e; });
          return readOracleStream(res, onChunk);
        });
      };
      return run(self.PROF_MODEL).then(function(r) {
        return { text: r.text, usage: r.usage, model: r.model || self.PROF_MODEL, stop: r.stop, fellBack: false };
      }, function(e) {
        // Only a model-access problem switches to Sonnet; other errors surface.
        if (!/model|not_found|not found|permission|access/i.test(e.message || '')) throw e;
        return run(self.PROF_FALLBACK).then(function(r) {
          return { text: r.text, usage: r.usage, model: r.model || self.PROF_FALLBACK, stop: r.stop, fellBack: true, fallbackWhy: (e.message || '').slice(0, 160) };
        });
      });
    },

    // Splits off the single "HOW I KNOW:" line (one line on purpose — the
    // response-scanned landmine: lists don't survive rendered DOM text).
    splitHowIKnow: function(text) {
      var m = /\n?\s*HOW I KNOW:\s*([^\n]*)\s*$/i.exec(String(text || ''));
      if (!m) return { body: String(text || '').trim(), sources: [] };
      return {
        body: String(text).slice(0, m.index).trim(),
        sources: m[1].split('|').map(function(x) { return x.trim(); }).filter(Boolean),
      };
    },

    // The whole chain for one question: plan -> gather -> condense -> answer.
    // forceDeep: the "prof:" test prefix always gets the full answer.
    ask: function(question, opts, steps) {
      var self = RPGACE.modules.oracleProfessor;
      opts = opts || {};
      steps = steps || {};
      var say = function(k, v) { if (steps[k]) try { steps[k](v); } catch (e) {} };
      var out = { question: question };
      say('status', 'Planning…');
      return (opts.plan ? Promise.resolve(opts.plan) : self.logic.plan(question)).then(function(plan) {
        out.plan = plan;
        say('status', 'Gathering' + (plan.sources.length ? ' ' + plan.sources.length + ' source' + (plan.sources.length === 1 ? '' : 's') : '') + (plan.topic ? ' + web' : '') + '…');
        return self.logic.gather(plan);
      }).then(function(ev) {
        out.evidence = ev;
        say('status', 'Condensing…');
        return self.logic.condense(question, ev);
      }).then(function(c) {
        out.condensed = c;
        say('status', 'Thinking…');
        return self.logic.answer(question, c.brief, { history: opts.history, note: c.note }, steps.chunk);
      }).then(function(a) {
        out.answer = a;
        var split = self.logic.splitHowIKnow(a.text);
        out.body = split.body;
        out.sources = split.sources;
        return out;
      });
    },

    // OP-5: one-shot hand-off of the sections picked for a quick chat turn
    // to oracleAppGrounding (read by its callOracle wrap; 15s life).
    giveSections: function(list) {
      RPGACE.modules.oracleProfessor._turn = { sections: (list || []).slice(), at: Date.now() };
    },
    takeSections: function() {
      var self = RPGACE.modules.oracleProfessor;
      var t = self._turn;
      self._turn = null;
      return (t && Date.now() - t.at < 15000) ? t.sections : null;
    },
    sectionsText: function(list) {
      var L = RPGACE.modules.oracleProfessor.logic;
      var secs = L.skSections();
      var core = L.coreText();
      var picked = (list || []).map(function(n) { return secs[n - 1]; }).filter(Boolean);
      var head = core ? core + '\n\n' : 'RPGACE STATUS: ';
      if (!picked.length) {
        var keys = [];
        secs.forEach(function(s) { if (keys.indexOf(s.domain) === -1) keys.push(s.domain); });
        return head + 'No domain section was needed for this message (sections exist for ' + keys.join(', ') + '). If Alex asks how something in the app works, say you can look it up if he asks again with more detail.';
      }
      return head + 'Relevant app notes (' + picked.length + ' part' + (picked.length === 1 ? '' : 's') + '; never invent a feature - if something is not covered here, say so):\n' +
        picked.map(function(s) { return '[app notes ' + s.id + ', ' + s.domain + '] ' + s.text; }).join('\n\n');
    },

    // Messages another feature already owns are never routed: prefixes
    // ("schedule oracle:", "bookworm:"...), links (video/post handlers),
    // trip/idea triggers, recipe generation and Oracle actions — those
    // need the normal reply and its trailers.
    ownedElsewhere: function(val) {
      var t = String(val || ''), lower = t.toLowerCase(), m = RPGACE.modules;
      if (/^[a-z][a-z ]{1,24}:/i.test(t) || /https?:\/\/|www\./i.test(t)) return true;
      try {
        if (m.tripPlans && ((m.tripPlans.TRIGGER && m.tripPlans.TRIGGER.test(t)) || (m.tripPlans.IDEA_TRIGGER && m.tripPlans.IDEA_TRIGGER.test(t)))) return true;
        if (m.cookingOracle && m.cookingOracle.matchesRecipeGenTrigger && m.cookingOracle.matchesRecipeGenTrigger(lower)) return true;
        if (m.oracleControl && m.oracleControl.matchesAnyTrigger && m.oracleControl.matchesAnyTrigger(lower)) return true;
      } catch (e) {}
      return false;
    },

    // Route one chat message. Short -> free keyword plan (never deep);
    // longer -> the Haiku planner.
    route: function(text) {
      var self = RPGACE.modules.oracleProfessor;
      var t = String(text || '').trim();
      if (!self.logic.needsPlan(t)) return Promise.resolve(self.logic.emptyPlan('small talk'));
      if (t.length < self.SHORT_CHARS) { var fp = self.logic.fallbackPlan(t); fp.deep = false; fp.why = 'short message, keyword plan'; return Promise.resolve(fp); }
      return self.logic.plan(t);
    },

    // Real cost of one professor answer: Opus from its own token counts;
    // the Haiku plan/condense calls estimated at 4 characters per token.
    cost: function(r) {
      var self = RPGACE.modules.oracleProfessor;
      var a = (r && r.answer) || {}, u = a.usage;
      var price = function(model) { return self.PRICES[model] || self.PRICES[self.PROF_MODEL]; };
      var main = 0, estimated = 0;
      if (u) {
        var pm = price(a.model);
        main = (u.input * pm[0] + u.output * pm[1] + u.cache_read * pm[2] + u.cache_write * pm[0] * 1.25) / 1e6;
      }
      var hk = self.PRICES['claude-haiku-4-5-20251001'];
      var plan = r && r.plan;
      if (plan && plan.prompt_chars) estimated += (plan.prompt_chars / 4 * hk[0] + 200 * hk[1]) / 1e6;
      var c = r && r.condensed;
      if (c && c.condensed) estimated += (Math.min(c.raw_chars, self.CONDENSE_IN_MAX) / 4 * hk[0] + c.brief.length / 4 * hk[1]) / 1e6;
      var usd = main + estimated;
      return { usd: usd, gbp: usd * self.GBP_PER_USD, pence: Math.round(usd * self.GBP_PER_USD * 1000) / 10,
        input: u ? u.input + u.cache_read : 0, output: u ? u.output : 0, estimated_usd: estimated };
    },

    withTimeout: function(p, ms, label) {
      return new Promise(function(resolve, reject) {
        var t = setTimeout(function() { reject(new Error('took too long (' + Math.round(ms / 1000) + 's)')); }, ms);
        Promise.resolve(p).then(function(v) { clearTimeout(t); resolve(v); }, function(e) { clearTimeout(t); reject(e); });
      });
    },

    // One Haiku call reads the question + map and says what to fetch.
    plan: function(question) {
      var self = RPGACE.modules.oracleProfessor;
      if (!self.logic.needsPlan(question)) return Promise.resolve(self.logic.emptyPlan('small talk'));
      var pp = RPGACE.modules.phylumPath;
      if (!pp || !pp.logic._callGroundWorkerJSON) return Promise.resolve(self.logic.fallbackPlan(question));
      var prompt = 'You plan research for an assistant inside a personal app. Read the map and the question, and pick only what the answer needs.\n\n' +
        self.logic.buildMap() + '\n\nQUESTION: ' + String(question).slice(0, 1500) + '\n\n' +
        'Return JSON only: {"deep":true|false,"sources":[{"key":"<source key>","search":"<1-3 words or empty>"}],"sections":[<numbers>],"topic":"<web topic or empty>","why":"<one short line>"}\n' +
        'Rules: deep=true only when the question needs reasoning, comparison, a plan or expert judgement; false for a greeting, a quick fact or a simple lookup. ' +
        'sources: at most 4, keys from the map only, only when the answer depends on his saved data. ' +
        'sections: at most 4 numbers, only when the question is about how the app works. ' +
        'topic: only when outside public knowledge would help; the general subject in plain words, never a name, place, number, date, amount or anything about the person. Use empty lists and an empty string when not needed.';
      return self.logic.loadPeople().then(function() {
        return pp.logic._callGroundWorkerJSON(prompt, 400, pp.MECHANICAL_MODEL);
      }).then(function(j) {
        var p = self.logic.cleanPlan(j);
        p.prompt_chars = prompt.length;
        return p;
      }).catch(function(e) {
        var p = self.logic.fallbackPlan(question);
        p.why = 'planner failed (' + ((e && e.message) || 'error') + '), keyword plan used';
        return p;
      });
    },
  },

  // OP-4 test door: "prof: <question>" in Oracle chat runs the full chain.
  // OP-5 replaces this with automatic routing.
  init: function() {
    var self = this;
    setTimeout(function() { self.ui.patchChat(); }, 1600);
  },

  ui: {
    patchChat: function() {
      var self = RPGACE.modules.oracleProfessor;
      if (typeof window.sendChat !== 'function' || window._profPatched) return;
      window._profPatched = true;
      // If scheduleOracle's wrap is already in, ours sits outside it and
      // owns the busy check; if not, its wrap will sit outside ours, set
      // the busy flag before calling in, and we must not block on it.
      var outerOfGuard = !!window._scheduleOracleChatPatched;
      var orig = window.sendChat;
      window.sendChat = function() {
        var ctx = this, args = arguments;
        var input = document.getElementById('chat-input');
        var val = input ? input.value.trim() : '';
        var lower = val.toLowerCase();
        var busy = function() {
          if (self._busy || (outerOfGuard && window._oracleRequestInFlight)) { RPGACE.utils.toast('⏳ Oracle is still answering — wait for it to finish first', '#E2A83D', 2800); return true; }
          return false;
        };
        var clear = function() { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); };
        if (lower.indexOf(self.QUICK_PREFIX) === 0) {
          // Forced normal answer: free keyword plan picks the sections.
          var qq = val.slice(self.QUICK_PREFIX.length).trim();
          if (!qq) return false;
          input.value = qq;
          self.logic.giveSections(self.logic.fallbackPlan(qq).sections);
          return orig.apply(ctx, args);
        }
        if (lower.indexOf(self.PROF_PREFIX) === 0) {
          var q = val.slice(self.PROF_PREFIX.length).trim();
          if (!q) { RPGACE.utils.toast('Type a question after "prof:"', '#E2A83D', 2500); return false; }
          if (busy()) return false;
          clear();
          // Returned promise: an outer guard wrap clears its flag when we finish.
          return self.ui.run(q);
        }
        // Other features own prefixed messages ("schedule oracle:",
        // "bookworm:", "learn later:"...) and pasted links (video/link
        // analysis): those pass straight through, never routed.
        if (!self.AUTO || !val || !input || self.logic.ownedElsewhere(val)) return orig.apply(ctx, args);
        if (busy()) return false;
        // OP-5: route. The message stays in the box (read-only) while the
        // planner runs, so the normal send path reads it unchanged.
        input.readOnly = true;
        self._busy = true;
        return self.logic.route(val).catch(function() { return self.logic.fallbackPlan(val); }).then(function(plan) {
          input.readOnly = false;
          self._busy = false;
          if (plan.deep) { clear(); return self.ui.run(val, plan); }
          self.logic.giveSections(plan.sections);
          return orig.apply(ctx, args);
        });
      };
    },

    run: function(q, plan) {
      var self = RPGACE.modules.oracleProfessor;
      var history = ((typeof STATE !== 'undefined' && STATE.chatHistory) || []).slice();
      if (typeof addMsg === 'function') addMsg(q, 'user');
      var box = document.getElementById('chat-msgs');
      var bubble = document.createElement('div');
      bubble.className = 'msg ai';
      bubble.dataset.phylaScanned = '1';   // keep trailer scanners off this reply
      bubble.innerHTML = '<div class="ai-name">🎓 Oracle · professor</div><div class="prof-body"><span class="prof-status" style="color:var(--muted)">Planning…</span></div>';
      if (box) { box.appendChild(bubble); box.scrollTop = box.scrollHeight; }
      var body = bubble.querySelector('.prof-body');
      var render = function(t) { body.innerHTML = (typeof renderMarkdown === 'function') ? renderMarkdown(t) : ''; if (typeof renderMarkdown !== 'function') body.textContent = t; if (box) box.scrollTop = box.scrollHeight; };
      window._oracleRequestInFlight = true;
      self._busy = true;
      return self.logic.ask(q, { history: history, plan: plan }, {
        status: function(t) { var st = bubble.querySelector('.prof-status'); if (st) st.textContent = t; },
        chunk: function(full) { render(self.logic.splitHowIKnow(full).body); },
      }).then(function(r) {
        render(r.body || '(empty answer)');
        bubble.appendChild(self.ui.costLine(r));
        bubble.appendChild(self.ui.howIKnow(r));
        try {
          STATE.chatHistory.push({ role: 'user', content: q });
          STATE.chatHistory.push({ role: 'assistant', content: r.body });
        } catch (e) {}
        // Oct 27 2026: the same 📓 / 📖 / ⭐ row as a normal reply (was missing here).
        try { if (typeof addReplySaveRow === 'function') addReplySaveRow(q, r.body || ''); } catch (e) {}
        return r;
      }).catch(function(e) {
        body.textContent = '⚠️ Professor answer failed: ' + ((e && e.message) || e);
        RPGACE.utils.toast('Professor answer failed: ' + ((e && e.message) || e), '#CC4A4A', 4500, 'oracleProfessor');
      }).then(function(r) { window._oracleRequestInFlight = false; self._busy = false; return r; });
    },

    // "≈ 6.1p · Opus 1,240 in / 2,900 out · condensed 9,400 → 1,200"
    costLine: function(r) {
      var self = RPGACE.modules.oracleProfessor;
      var c = self.logic.cost(r), a = r.answer || {}, k = r.condensed || {};
      var d = document.createElement('div');
      d.className = 'prof-cost';
      d.style.cssText = 'margin-top:6px;font-size:12px;color:var(--muted);';
      var name = /opus/.test(a.model || '') ? 'Opus' : /sonnet/.test(a.model || '') ? 'Sonnet' : (a.model || 'model');
      var parts = [a.usage ? '≈ ' + (c.pence < 0.1 ? '<0.1' : c.pence.toFixed(1)) + 'p' : 'cost not reported'];
      if (a.usage) parts.push(name + ' ' + c.input.toLocaleString() + ' in / ' + c.output.toLocaleString() + ' out');
      if (k.condensed) parts.push('condensed ' + k.raw_chars.toLocaleString() + ' → ' + k.brief.length.toLocaleString());
      d.textContent = parts.join(' · ');
      return d;
    },

    // Fold-out: sources it cited, what it read, which model answered.
    howIKnow: function(r) {
      var det = document.createElement('details');
      det.style.cssText = 'margin-top:8px;font-size:13px;';
      var sum = document.createElement('summary');
      sum.style.cssText = 'cursor:pointer;min-height:32px;color:var(--muted);';
      sum.textContent = '🔎 How I know';
      det.appendChild(sum);
      var list = document.createElement('div');
      list.style.cssText = 'margin-top:6px;line-height:1.6;color:var(--muted);';
      var line = function(t) { var d = document.createElement('div'); d.textContent = t; list.appendChild(d); };
      var ev = r.evidence || {}, c = r.condensed || {}, a = r.answer || {};
      if (r.sources && r.sources.length) line('Cited: ' + r.sources.join(' · '));
      (ev.data || []).forEach(function(d) { line('📊 ' + d.label + ': ' + d.rows.length + ' row' + (d.rows.length === 1 ? '' : 's') + (d.search ? ' matching "' + d.search + '"' : '')); });
      (ev.notes || []).forEach(function(n) { line('📘 App notes ' + n.id + ': ' + n.title); });
      if (ev.web) {
        line('🌐 Web topic sent: "' + ev.web.topic + '"' + (ev.web.reused ? ' (from your Library)' : ''));
        (ev.web.sources || []).forEach(function(s2, i) {
          var safe = /^https?:\/\//i.test(s2.url || '');
          var d = document.createElement('div');
          d.appendChild(document.createTextNode('[web ' + (i + 1) + '] '));
          if (safe) { var aEl = document.createElement('a'); aEl.href = s2.url; aEl.target = '_blank'; aEl.rel = 'noopener'; aEl.textContent = s2.title; d.appendChild(aEl); }
          else d.appendChild(document.createTextNode(s2.title));
          list.appendChild(d);
        });
      }
      (ev.errors || []).forEach(function(e) { line('⚠️ Missing: ' + e); });
      line((c.condensed ? '✂️ Condensed ' + c.raw_chars + ' → ' + c.brief.length + ' characters' : '✂️ Not condensed') + (c.note ? ' — ' + c.note : ''));
      line('🧠 Answered by ' + (a.model || '?') + (a.fellBack ? ' (Opus unavailable: ' + a.fallbackWhy + ')' : '') + (a.stop === 'max_tokens' ? ' — cut off at the length cap' : ''));
      det.appendChild(list);
      return det;
    },
  },

  // Public pass-throughs (G53 convention).
  skSections: function() { return this.logic.skSections(); },
  buildMap: function() { return this.logic.buildMap(); },
  needsPlan: function(t) { return this.logic.needsPlan(t); },
  sanitizeTopic: function(t) { return this.logic.sanitizeTopic(t); },
  plan: function(q) { return this.logic.plan(q); },
  gather: function(p) { return this.logic.gather(p); },
  condense: function(q, e) { return this.logic.condense(q, e); },
  answer: function(q, b, o, c) { return this.logic.answer(q, b, o, c); },
  ask: function(q, o, s) { return this.logic.ask(q, o, s); },
});
/* ===END:oracleProfessor=== */
