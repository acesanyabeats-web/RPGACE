
/* ===MODULE:tripPlans=== */
// Oct 12 2026 — "Trips & Plans with Oracle" (ratified /CEO plan, record
// records/2026-10/trips_plans_oracle_paranoia_ceo_2026-10-12.txt), TP-1..TP-4.
// Alex: "i want oracle to handle my requests for adding such things, eg im
// planning a trip, i need tickets and hotel, i plan it out with arrangement
// with oracle with him helping me finding nuances and things that are
// needed". Plans card (Schedule & Journal menu): Plans / People / Profile.
// - Profile (travel_profile, one row): home, nationalities (French +
//   Russian), EU Settled Status, default passport, interests, insurance.
// - People (people): reach-out reminders + birthdays on the Due list; no
//   drafted messages (his answer: "Reminders only").
// - Plan builder: up to 3 web searches (/api/search type 'web' - Gemini with
//   Google Search, Tavily fallback; only the question is sent), then one
//   Oracle JSON call drafts the plan: itinerary, travel legs, tickets/stays
//   with links + book-by dates, documents for the passport he travels on
//   (+ UK re-entry with settled status), worst-case packing, emergency card,
//   producer angle, food spots, rain/backup, daily money limit. Review card
//   -> Save / Ask Oracle to change / Discard. Official links (FCDO, France
//   Diplomatie, passportindex.org) are added in code, never left to the model.
// - Saved plans (plans + plan_tasks): tick tasks, change status, Add to
//   calendar (a 'trip' day_blocks row + timed Daily Schedule items with
//   place/journey). RPGACE never books or pays for anything.
// people/travel_profile/plans/plan_tasks have no anon read policy: every
// read goes through /api/data-write action 'read' after login.
RPGACE.register('tripPlans', {
  domain: 'schedule',

  STATUSES: ['idea', 'planning', 'booked', 'done', 'dropped'],
  STATUS_LABELS: { idea: '💭 Idea', planning: '🗺 Planning', booked: '✅ Booked', done: '🏁 Done', dropped: '✖ Dropped' },
  TASK_KINDS: { ticket: '🎟', stay: '🛏', document: '🛂', packing: '🎒', leg: '🚆', food: '🍜', backup: '☔', other: '•' },
  // TP-6/TP-7 (Oct 14 2026). Ticking one of these asks what was paid.
  MONEY_KINDS: ['ticket', 'stay', 'leg', 'food', 'other'],
  BOOK_BY_WINDOW: 7, LOG_WINDOW: 30, PEOPLE_WINDOW: 14,
  TRIGGER: /^\s*(plan (a |my |me a |out a )?(trip|holiday|weekend|day out|getaway|visit|night out)|help me plan|trip to )/i,
  // TP-5 Ideas board (Oct 13 2026). Alex: all four kinds mixed, no people in ideas.
  IDEA_TRIGGER: /^\s*(what (could|can|should) i do (on\b|this\b|next\b|over\b|from\b|between\b|in\b|during\b|for\b|\d)|(trip|day out|weekend|holiday) ideas\b|ideas for (my |the |this |next )?(weekend|time off|days off|holiday|week off)\b)/i,
  IDEA_KINDS: { daytrip: '🚆 UK day trip', abroad: '✈️ Abroad', event: '🎟 Event', home: '🏠 At home' },
  IDEA_REACH: { home: ['home'], uk: ['daytrip', 'event', 'home'], abroad: ['daytrip', 'abroad', 'event', 'home'] },
  _profile: null,
  _people: [],
  _plans: [],
  _tasks: [],

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { self.logic.patchChat(); });
  },

  logic: {
    iso: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    addDays: function(isoDate, n) { var d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() + n); return RPGACE.modules.tripPlans.logic.iso(d); },
    signedIn: function() { var ag = RPGACE.modules.authGate; return !!(ag && ag._apiSecret); },
    read: function(table, params) { return RPGACE.kit.readPrivate(table, params); },   // CK-6: one copy in RPGACE.kit
    loadAll: function() {
      var self = RPGACE.modules.tripPlans, L = self.logic;
      return Promise.all([
        L.read('travel_profile', 'select=*&id=eq.1'),
        L.read('people', 'select=*&order=name.asc'),
        L.read('plans', 'select=*&order=start_date.asc.nullslast,created_at.desc&limit=100'),
        L.read('plan_tasks', 'select=*&order=sort.asc,created_at.asc&limit=1000'),
      ]).then(function(r) {
        self._profile = r[0][0] || null;
        self._people = r[1]; self._plans = r[2]; self._tasks = r[3];
        return self;
      });
    },

    // ── TP-1 profile + people ─────────────────────────────────────────
    saveProfile: function(f) {
      var self = RPGACE.modules.tripPlans, row = { id: 1, updated_at: new Date().toISOString() };
      ['home_city', 'nationalities', 'default_passport', 'residency', 'interests', 'travel_limits', 'insurance'].forEach(function(k) {
        if (f[k] !== undefined) row[k] = String(f[k] || '').trim().slice(0, 600) || null;
      });
      return RPGACE.sb.secureWrite('travel_profile', 'insert', row, null, 'id').then(function() {
        self._profile = Object.assign({}, self._profile || {}, row); return self._profile;
      });
    },
    passports: function() {
      var p = RPGACE.modules.tripPlans._profile || {};
      var list = String(p.nationalities || 'French, Russian').split(/[,/&]| and /i).map(function(x) { return x.trim(); }).filter(Boolean);
      var def = p.default_passport || list[0];
      return [def].concat(list.filter(function(x) { return x.toLowerCase() !== String(def).toLowerCase(); }));
    },
    cleanPerson: function(f) {
      var name = String(f.name || '').trim();
      if (!name) throw new Error('Add a name');
      var date = function(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null; };
      var every = f.reach_every_days === '' || f.reach_every_days == null ? null : Math.round(Number(f.reach_every_days));
      if (every != null && (isNaN(every) || every < 1 || every > 730)) throw new Error('Reach-out days must be 1-730');
      return { name: name.slice(0, 80), relation: String(f.relation || '').trim().slice(0, 60) || null, contact_how: String(f.contact_how || '').trim().slice(0, 80) || null,
        birthday: date(f.birthday), last_spoke: date(f.last_spoke), reach_every_days: every, notes: String(f.notes || '').trim().slice(0, 300) || null };
    },
    addPerson: function(f) {
      var self = RPGACE.modules.tripPlans, row = self.logic.cleanPerson(f);
      return RPGACE.sb.secureWrite('people', 'insert', row).then(function(d) {
        var saved = (Array.isArray(d) && d[0]) || row;
        self._people = self._people.concat([saved]).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
        return saved;
      });
    },
    updatePerson: function(id, patch) {
      var self = RPGACE.modules.tripPlans;
      return RPGACE.sb.secureWrite('people', 'update', patch, 'id=eq.' + id).then(function() {
        self._people = self._people.map(function(p) { return p.id === id ? Object.assign({}, p, patch) : p; });
      });
    },
    removePerson: function(id) {
      var self = RPGACE.modules.tripPlans;
      return RPGACE.sb.secureWrite('people', 'delete', null, 'id=eq.' + id).then(function() {
        self._people = self._people.filter(function(p) { return p.id !== id; });
      });
    },
    // Reach-out overdue + birthdays in the next 7 days (Due list + People tab).
    peopleDue: function(people, today) {
      var L = RPGACE.modules.tripPlans.logic, out = [];
      (people || []).forEach(function(p) {
        if (p.reach_every_days) {
          var due = p.last_spoke ? L.addDays(p.last_spoke, p.reach_every_days) : today;
          if (due <= today) {
            var days = p.last_spoke ? Math.round((new Date(today + 'T12:00:00') - new Date(p.last_spoke + 'T12:00:00')) / 864e5) : null;
            out.push({ kind: 'reach', person: p, text: days == null ? 'Reach out to ' + p.name : 'Haven\'t spoken to ' + p.name + ' in ' + days + ' days' });
          }
        }
        if (p.birthday) {
          for (var i = 0; i <= 7; i++) {
            var d = L.addDays(today, i);
            if (d.slice(5) === p.birthday.slice(5)) { out.push({ kind: 'birthday', person: p, text: p.name + '\'s birthday ' + (i === 0 ? 'today' : i === 1 ? 'tomorrow' : 'in ' + i + ' days') }); break; }
          }
        }
      });
      return out;
    },

    // ── TP-2 web search ──────────────────────────────────────────────
    webSearch: function(q) {
      return fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'web', query: q }) })
        .then(function(r) { return r.json().catch(function() { return {}; }).then(function(d) {
          if (!r.ok) { var e = new Error(d.error || ('HTTP ' + r.status)); e.setup = !!d.setup; throw e; }
          return d;
        }); });
    },

    // ── TP-4 Oracle plan builder ─────────────────────────────────────
    officialLinks: function(country, passport) {
      var slug = String(country || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var out = [];
      if (slug) out.push({ title: 'UK government travel advice (FCDO): ' + country, url: 'https://www.gov.uk/foreign-travel-advice/' + slug });
      if (/fren/i.test(passport || '')) out.push({ title: 'France Diplomatie: Conseils aux voyageurs', url: 'https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/' });
      out.push({ title: 'Passport Index: visa requirements for your passport', url: 'https://www.passportindex.org/' });
      out.push({ title: 'UK re-entry: prove your EU Settled Status (view and prove)', url: 'https://www.gov.uk/view-prove-immigration-status' });
      return out;
    },
    researchQueries: function(f) {
      var when = (f.start_date || '') + (f.end_date && f.end_date !== f.start_date ? ' to ' + f.end_date : '');
      var q = [
        'What is on in ' + f.destination + ' ' + when + ': events, gigs, music scene, record shops, things to do, food',
        'Weather in ' + f.destination + ' ' + when + ': typical and worst case, and practical travel from the UK (trains, flights, coaches, rough prices)',
      ];
      if (f.passport) q.push('Entry requirements for ' + f.passport + ' passport holders travelling from the UK to ' + (f.country || f.destination) + ' ' + when + ', and current safety advice');
      return q;
    },
    // TP-5: `queries` lets the Ideas board reuse this same search loop.
    research: function(f, onStep, queries) {
      var L = RPGACE.modules.tripPlans.logic, qs = queries || L.researchQueries(f), out = { notes: [], sources: [], setup: false, failed: 0 };
      var i = 0;
      var next = function() {
        if (i >= qs.length) return Promise.resolve(out);
        var q = qs[i++];
        if (onStep) onStep('Searching the web (' + i + '/' + qs.length + ')…');
        return L.webSearch(q).then(function(d) {
          out.notes.push('Q: ' + q + '\nA (' + d.provider + '): ' + String(d.answer || '').slice(0, 1800));
          (d.sources || []).forEach(function(s) { if (s && s.url && !out.sources.some(function(x) { return x.url === s.url; })) out.sources.push({ title: s.title || s.url, url: s.url }); });
          return next();
        }).catch(function(e) {
          out.failed++;
          if (e.setup) { out.setup = true; return out; } // no keys: stop searching
          return next();
        });
      };
      return next();
    },
    buildPrompt: function(f, research, prev, change) {
      var p = RPGACE.modules.tripPlans._profile || {};
      var lines = [
        'You are planning a trip/outing for Alex, a UK music producer (beats, videos) living in ' + (p.home_city || 'Derby') + ', UK.',
        'Nationalities: ' + (p.nationalities || 'French, Russian') + '. Residency: ' + (p.residency || 'UK - EU Settled Status') + '. Passport for this trip: ' + (f.passport || p.default_passport || 'French') + '.',
        p.interests ? 'Interests: ' + p.interests + '.' : '', p.travel_limits ? 'Limits: ' + p.travel_limits + '.' : '', p.insurance ? 'Insurance: ' + p.insurance + '.' : '',
        'Request: destination ' + (f.destination || '?') + (f.country ? ', ' + f.country : '') + '; dates ' + (f.start_date || '?') + ' to ' + (f.end_date || f.start_date || '?') +
          (f.budget ? '; budget about £' + f.budget : '') + (f.people && f.people.length ? '; going with ' + f.people.join(', ') : '; going alone unless stated') + '.',
        f.notes ? 'What Alex wants: ' + f.notes : '',
      ];
      if (research && research.notes.length) lines.push('LIVE WEB RESEARCH (use these facts; do not invent events, prices or dates beyond them):\n' + research.notes.join('\n\n'));
      else lines.push('No live web results are available. Use general knowledge only, say so in "summary", and never invent specific event dates or exact prices - give ranges and tell him to check.');
      if (prev) lines.push('CURRENT PLAN (JSON):\n' + JSON.stringify(prev).slice(0, 6000) + '\nCHANGE REQUESTED BY ALEX: ' + change + '\nReturn the whole updated plan.');
      lines.push('Return ONLY one JSON object, no markdown, compact, short strings:',
        '{"title":"","destination":"","country":"","summary":"2-3 sentences","budget_estimate":0,"daily_limit":0,' +
        '"itinerary":[{"date":"YYYY-MM-DD","time":"HH:MM or empty","title":"","place":"","journey_mins":0,"note":""}],' +
        '"tasks":[{"kind":"ticket|stay|document|packing|leg|other","title":"","due_by":"YYYY-MM-DD or empty","link":"url or empty","cost_est":0}],' +
        '"documents":{"entry":"entry rules for this passport","uk_reentry":"what to carry to re-enter the UK with EU Settled Status","check":"what to double-check before booking"},' +
        '"emergency":{"number":"local emergency number","consulate":"nearest consulate/embassy for his passport","notes":""},' +
        '"producer":[{"name":"","what":"record shop/studio/open mic/gig/B-roll spot","link":""}],' +
        '"food":[{"name":"","dish":"","note":""}],"backup":[{"date":"YYYY-MM-DD","plan":"rain/backup option"}]}',
        'Rules: at most 3 itinerary items per day; 6-14 tasks, each ticket/stay/leg with a book-by date before travel; packing tasks for the WORST-CASE weather plus backups ' +
        '(spare charger, meds, copies of documents, extra card/cash); document tasks for his passport and UK re-entry; links only if they came from the research; ' +
        'money in GBP; leave a field empty rather than guess.');
      return lines.filter(Boolean).join('\n');
    },
    parsePlan: function(o, f, research) {
      var self = RPGACE.modules.tripPlans, L = self.logic;
      if (!o || typeof o !== 'object') throw new Error('Oracle\'s plan could not be read');
      var str = function(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); };
      var date = function(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null; };
      var num = function(v) { var n = Number(v); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };
      var kinds = Object.keys(self.TASK_KINDS);
      var plan = {
        title: str(o.title || ('Trip to ' + (f.destination || '')), 80), destination: str(o.destination || f.destination, 80), country: str(o.country || f.country, 60),
        start_date: f.start_date || null, end_date: f.end_date || f.start_date || null, passport: f.passport || null,
        budget: num(f.budget) || num(o.budget_estimate), daily_limit: num(o.daily_limit), people: f.people || [], summary: str(o.summary, 600),
        details: {
          itinerary: (Array.isArray(o.itinerary) ? o.itinerary : []).slice(0, 40).map(function(x) {
            return { date: date(x.date), time: /^\d{1,2}:\d{2}$/.test(x.time || '') ? x.time : '', title: str(x.title, 100), place: str(x.place, 80), journey_mins: Math.max(0, Math.round(Number(x.journey_mins) || 0)), note: str(x.note, 200) };
          }).filter(function(x) { return x.title; }),
          documents: { entry: str(o.documents && o.documents.entry, 600), uk_reentry: str(o.documents && o.documents.uk_reentry, 400), check: str(o.documents && o.documents.check, 300) },
          emergency: { number: str(o.emergency && o.emergency.number, 40), consulate: str(o.emergency && o.emergency.consulate, 200), notes: str(o.emergency && o.emergency.notes, 200) },
          producer: (Array.isArray(o.producer) ? o.producer : []).slice(0, 10).map(function(x) { return { name: str(x.name, 80), what: str(x.what, 120), link: str(x.link, 300) }; }).filter(function(x) { return x.name; }),
          food: (Array.isArray(o.food) ? o.food : []).slice(0, 10).map(function(x) { return { name: str(x.name, 80), dish: str(x.dish, 80), note: str(x.note, 160) }; }).filter(function(x) { return x.name || x.dish; }),
          backup: (Array.isArray(o.backup) ? o.backup : []).slice(0, 14).map(function(x) { return { date: date(x.date), plan: str(x.plan, 200) }; }).filter(function(x) { return x.plan; }),
          official: L.officialLinks(str(o.country || f.country, 60), f.passport),
          sources: (research && research.sources || []).slice(0, 16),
          researched: !!(research && research.notes.length),
          notes: f.notes || '',
        },
      };
      plan.tasks = (Array.isArray(o.tasks) ? o.tasks : []).slice(0, 30).map(function(t, i) {
        var k = String(t.kind || '').toLowerCase();
        return { kind: kinds.indexOf(k) !== -1 ? k : 'other', title: str(t.title, 140), due_by: date(t.due_by), link: /^https?:\/\//.test(t.link || '') ? str(t.link, 400) : null, cost_est: num(t.cost_est), sort: i };
      }).filter(function(t) { return t.title; });
      return plan;
    },
    draftPlan: function(f, onStep, prev, change) {
      var self = RPGACE.modules.tripPlans, L = self.logic, pp = RPGACE.modules.phylumPath;
      if (!pp || !pp.logic || !pp.logic._callGroundWorkerJSON) return Promise.reject(new Error('Oracle is not available'));
      var researchP = prev ? Promise.resolve(prev._research || null) : L.research(f, onStep);
      return researchP.then(function(research) {
        if (onStep) onStep('Oracle is drafting the plan…');
        return pp.logic._callGroundWorkerJSON(L.buildPrompt(f, research, prev ? L.stripForPrompt(prev) : null, change), 3000).then(function(o) {
          var plan = L.parsePlan(o, f, research);
          plan._research = research; plan._form = f;
          return plan;
        });
      });
    },
    stripForPrompt: function(plan) {
      var d = plan.details || {};
      return { title: plan.title, summary: plan.summary, daily_limit: plan.daily_limit, itinerary: d.itinerary, tasks: plan.tasks, documents: d.documents, emergency: d.emergency, producer: d.producer, food: d.food, backup: d.backup };
    },
    savePlan: function(draft, status) {
      var self = RPGACE.modules.tripPlans;
      var row = { title: draft.title, status: status || 'planning', destination: draft.destination || null, country: draft.country || null,
        start_date: draft.start_date, end_date: draft.end_date, passport: draft.passport, budget: draft.budget, daily_limit: draft.daily_limit,
        people: draft.people || [], summary: draft.summary || null, details: draft.details || {}, updated_at: new Date().toISOString() };
      return RPGACE.sb.secureWrite('plans', 'insert', row).then(function(d) {
        var saved = Array.isArray(d) && d[0];
        if (!saved || !saved.id) throw new Error('The plan was not saved (no id came back)');
        var tasks = (draft.tasks || []).map(function(t) { return Object.assign({ plan_id: saved.id }, t); });
        var p = tasks.length ? RPGACE.sb.secureWrite('plan_tasks', 'insert', tasks) : Promise.resolve([]);
        return p.then(function(td) {
          self._plans = self._plans.concat([saved]);
          self._tasks = self._tasks.concat(Array.isArray(td) && td.length ? td : tasks);
          return saved;
        });
      });
    },
    tasksFor: function(planId) { return (RPGACE.modules.tripPlans._tasks || []).filter(function(t) { return t.plan_id === planId; }).sort(function(a, b) { return (a.sort || 0) - (b.sort || 0); }); },
    setStatus: function(plan, status) {
      return RPGACE.sb.secureWrite('plans', 'update', { status: status, updated_at: new Date().toISOString() }, 'id=eq.' + plan.id).then(function() { plan.status = status; });
    },
    toggleTask: function(t) {
      var done = !t.done;
      return RPGACE.sb.secureWrite('plan_tasks', 'update', { done: done }, 'id=eq.' + t.id).then(function() { t.done = done; });
    },
    // ── TP-6 money + dates, TP-7 people (Oct 14 2026) ────────────────
    // Alex: book-by reminders show 7 days before and highlight on the day.
    // Pure: plans/tasks/people rows in, Due rows out (Due list + plan view).
    tripDue: function(plans, tasks, people, today) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui, out = [];
      var byId = {}, live = {};
      (plans || []).forEach(function(p) { byId[p.id] = p; if (p.status === 'planning' || p.status === 'booked') live[p.id] = 1; });
      var dayDiff = function(a, b) { return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5); };
      var soon = L.addDays(today, self.BOOK_BY_WINDOW);
      (tasks || []).filter(function(t) { return live[t.plan_id] && !t.done && t.due_by && t.due_by <= soon; })
        .sort(function(a, b) { return a.due_by < b.due_by ? -1 : a.due_by > b.due_by ? 1 : 0; })
        .slice(0, 4).forEach(function(t) {
          var p = byId[t.plan_id], n = dayDiff(t.due_by, today);
          out.push({ kind: 'bookby', plan: p, task: t, hot: n <= 0, icon: self.TASK_KINDS[t.kind] || '🎟',
            text: (n < 0 ? 'Overdue: ' : n === 0 ? 'Book today: ' : 'Book: ') + t.title,
            sub: p.title + ' · ' + (n < 0 ? 'was due ' + U._dayLabel(t.due_by) : n === 0 ? 'book by today' : 'book by ' + U._dayLabel(t.due_by) + ' (' + n + ' day' + (n === 1 ? '' : 's') + ')') });
        });
      (plans || []).forEach(function(p) {
        var end = p.end_date || p.start_date, d = p.details || {};
        if (!end || p.status === 'idea' || p.status === 'dropped' || d.trip_log) return;
        var ago = dayDiff(today, end);
        if (ago >= 1 && ago <= self.LOG_WINDOW) out.push({ kind: 'triplog', plan: p, icon: '📓', text: 'How was ' + p.title + '?', sub: 'After-trip log: best bits, real cost, a recipe to bring home' });
      });
      // TP-7: who still needs a word before the trip (not spoken to in a week).
      (plans || []).forEach(function(p) {
        if (!live[p.id] || !p.start_date || !(p.people || []).length) return;
        var until = dayDiff(p.start_date, today);
        if (until < 0 || until > self.PEOPLE_WINDOW) return;
        var weekAgo = L.addDays(today, -7);
        var names = p.people.filter(function(n) {
          var pr = (people || []).filter(function(x) { return String(x.name).toLowerCase() === String(n).toLowerCase(); })[0];
          return !pr || !pr.last_spoke || pr.last_spoke < weekAgo;
        });
        if (names.length) out.push({ kind: 'tripPeople', plan: p, names: names, icon: '👥', text: 'Sort ' + p.title + ' with ' + names.join(', '),
          sub: until === 0 ? 'Trip starts today' : 'Trip in ' + until + ' day' + (until === 1 ? '' : 's') + ' · not spoken this week' });
      });
      return out;
    },
    spent: function(planId) {
      var n = RPGACE.modules.tripPlans.logic.tasksFor(planId).reduce(function(a, t) { return a + (Number(t.cost_paid) || 0); }, 0);
      return Math.round(n * 100) / 100;
    },
    // Ticking a money task: what was paid goes on the task + a Travel expense
    // in Chronicles Finance (same write shape as the Wishlist's bought step).
    markBooked: function(t, plan, paid) {
      var amt = paid === '' || paid == null ? null : Math.round(Number(paid) * 100) / 100;
      if (amt != null && (!isFinite(amt) || amt < 0)) return Promise.reject(new Error('Enter what you paid, e.g. 42.50'));
      var already = Number(t.cost_paid) > 0;
      var patch = { done: true };
      if (amt != null) patch.cost_paid = amt;
      return RPGACE.sb.secureWrite('plan_tasks', 'update', patch, 'id=eq.' + t.id).then(function() {
        Object.assign(t, patch);
        if (!amt || already) return { logged: false };
        return RPGACE.sb.secureWrite('chronicles_finance', 'insert', { type: 'expense', category: 'Travel', entry_date: RPGACE.modules.tripPlans.logic.iso(),
          item: (t.title + ' (' + plan.title + ')').slice(0, 200), amount: amt, notes: 'From Plans' }).then(function() {
          RPGACE.cache.clear('chronicles_finance'); return { logged: true };
        }).catch(function(e) { return { logged: false, error: e }; });
      });
    },
    setPeople: function(plan, names) {
      var clean = (names || []).map(function(n) { return String(n).trim().slice(0, 80); }).filter(Boolean);
      return RPGACE.sb.secureWrite('plans', 'update', { people: clean, updated_at: new Date().toISOString() }, 'id=eq.' + plan.id).then(function() { plan.people = clean; return clean; });
    },
    // After-trip log: a journal entry (source trip_log) + details.trip_log on
    // the plan so it stops asking; optionally marks the plan done.
    logText: function(plan, f, spent) {
      var lines = ['Trip: ' + plan.title + (plan.start_date ? ' (' + plan.start_date + (plan.end_date && plan.end_date !== plan.start_date ? ' to ' + plan.end_date : '') + ')' : '')];
      if (f.best) lines.push('Best bits: ' + f.best);
      if (f.again) lines.push('Next time: ' + f.again);
      var cost = f.cost === '' || f.cost == null ? spent : Number(f.cost);
      if (cost) lines.push('Real cost: £' + cost + (plan.budget ? ' (budget £' + plan.budget + ', ' + (cost > plan.budget ? '£' + Math.round((cost - plan.budget) * 100) / 100 + ' over' : '£' + Math.round((plan.budget - cost) * 100) / 100 + ' under') + ')' : ''));
      if (f.recipe) lines.push('Recipe to bring home: ' + f.recipe);
      return lines.join('\n');
    },
    saveTripLog: function(plan, f) {
      var self = RPGACE.modules.tripPlans, L = self.logic;
      if (!String(f.best || '').trim() && !String(f.again || '').trim()) return Promise.reject(new Error('Write at least the best bits'));
      var spent = L.spent(plan.id), cost = f.cost === '' || f.cost == null ? (spent || null) : Math.round(Number(f.cost) * 100) / 100;
      if (cost != null && (!isFinite(cost) || cost < 0)) return Promise.reject(new Error('Real cost must be a number'));
      return RPGACE.sb.secureWrite('journal', 'insert', { title: '🧳 Trip log — ' + plan.title, content: L.logText(plan, f, spent),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), source: 'trip_log', entry_type: 'trip_log', created_at: new Date().toISOString() })
        .then(function() {
          RPGACE.cache.clear('journal');
          var details = Object.assign({}, plan.details || {}, { trip_log: { at: new Date().toISOString(), cost: cost, recipe: String(f.recipe || '').trim().slice(0, 120) || null } });
          var patch = { details: details, updated_at: new Date().toISOString() };
          if (f.markDone && plan.status !== 'done') patch.status = 'done';
          return RPGACE.sb.secureWrite('plans', 'update', patch, 'id=eq.' + plan.id).then(function() { Object.assign(plan, patch); return plan; });
        });
    },
    // "Bring a recipe home": opens Cooking's own generate form, prefilled.
    cookAtHome: function(plan, dish) {
      var co = RPGACE.modules.cookingOracle;
      if (!co || !co.logic || !co.logic._loadConfig || !co.ui._showGenerateForm) return false;
      var desc = String(dish || '').trim() + (plan.destination ? ', the way I had it in ' + plan.destination : '');
      co.logic._loadConfig(function(cfg) { co.ui._showGenerateForm(cfg || {}, desc); });
      return true;
    },
    // Trip day_blocks row (so My Day's planner and suggestions see it) +
    // timed itinerary items on the Daily Schedule with place/journey.
    addToCalendar: function(plan) {
      var self = RPGACE.modules.tripPlans, md = RPGACE.modules.myDay;
      if (!plan.start_date) return Promise.reject(new Error('Give the plan dates first'));
      if (plan.block_id) return Promise.reject(new Error('Already on the calendar'));
      var blockP = md && md.logic.addBlock ? md.logic.addBlock({ title: plan.title, kind: 'trip', start_date: plan.start_date, end_date: plan.end_date || plan.start_date, note: 'Plan: ' + plan.title })
        : Promise.reject(new Error('My Day is not loaded'));
      return blockP.then(function(b) {
        var n = 0;
        ((plan.details && plan.details.itinerary) || []).forEach(function(x) {
          var m = /^(\d{1,2}):(\d{2})$/.exec(x.time || '');
          if (!x.date || !m || typeof scheduleToCalendar !== 'function') return;
          scheduleToCalendar({ title: x.title, description: (x.note || '') + (x.place ? ' @ ' + x.place : ''), category: 'travel', xp: 0, duration_mins: 60,
            hour: +m[1], minute: +m[2], date: x.date, source_type: 'plan', source_id: plan.id, place: x.place || null, journey_mins: x.journey_mins || null });
          n++;
        });
        return RPGACE.sb.secureWrite('plans', 'update', { block_id: b.id || null, updated_at: new Date().toISOString() }, 'id=eq.' + plan.id)
          .then(function() { plan.block_id = b.id || 'set'; return n; });
      });
    },
    removePlan: function(plan) {
      var self = RPGACE.modules.tripPlans, md = RPGACE.modules.myDay;
      var p = plan.block_id && md && md.logic.removeBlock ? md.logic.removeBlock(plan.block_id).catch(function() {}) : Promise.resolve();
      return p.then(function() { return RPGACE.sb.secureWrite('plans', 'delete', null, 'id=eq.' + plan.id); }).then(function() {
        self._plans = self._plans.filter(function(x) { return x.id !== plan.id; });
        self._tasks = self._tasks.filter(function(t) { return t.plan_id !== plan.id; });
      });
    },

    // "plan a trip to Lisbon 3-6 Nov" typed in Oracle chat opens the builder.
    // ── TP-5 Ideas board ─────────────────────────────────────────────
    // Dates from a chat line like "what could I do 1-8 Nov?", "3 Nov to 9 Nov",
    // "this weekend" or "next weekend". Returns {} when nothing is found.
    parseDates: function(text, today) {
      var L = RPGACE.modules.tripPlans.logic, t = String(text || '').toLowerCase(), now = today ? new Date(today + 'T12:00:00') : new Date();
      var MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      var mk = function(d, m) {
        var y = now.getFullYear(), dt = new Date(y, m, d, 12);
        if (dt < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12)) dt = new Date(y + 1, m, d, 12);
        return L.iso(dt);
      };
      var mi = function(w) { return MON.indexOf(String(w).slice(0, 3)); };
      var re = /(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]{3,9})?\s*(?:-|–|to|until|till)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})/;
      var m = t.match(re);
      if (m && mi(m[4]) >= 0) {
        var m2 = mi(m[4]), m1 = m[2] && mi(m[2]) >= 0 ? mi(m[2]) : m2;
        var a = mk(+m[1], m1), b = mk(+m[3], m2);
        if (b < a) b = L.iso(new Date(new Date(b + 'T12:00:00').setFullYear(new Date(b + 'T12:00:00').getFullYear() + 1)));
        return { start_date: a, end_date: b };
      }
      var one = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})/);
      if (one && mi(one[2]) >= 0) { var d1 = mk(+one[1], mi(one[2])); return { start_date: d1, end_date: d1 }; }
      if (/\b(this|next) weekend\b/.test(t)) {
        var dow = now.getDay(), toSat = (6 - dow + 7) % 7;
        var sat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toSat + (/next weekend/.test(t) ? 7 : 0), 12);
        return { start_date: L.iso(sat), end_date: L.addDays(L.iso(sat), 1) };
      }
      return {};
    },
    // Only the profile's home city, interests and limits go into the search;
    // never anything about people.
    ideaQueries: function(f) {
      var p = RPGACE.modules.tripPlans._profile || {}, home = p.home_city || 'Derby';
      var when = f.start_date ? (f.start_date + (f.end_date && f.end_date !== f.start_date ? ' to ' + f.end_date : '')) : 'soon';
      var mood = f.mood ? ' (' + f.mood + ')' : '';
      var kinds = f.kinds || [], q = [];
      if (kinds.indexOf('event') >= 0 || kinds.indexOf('daytrip') >= 0)
        q.push('Events, gigs, music nights and things on in and near ' + home + ', UK, ' + when + mood);
      if (kinds.indexOf('daytrip') >= 0)
        q.push('Good day trips from ' + home + ' UK by train or coach' + mood + ', with rough costs' + (p.interests ? ', for someone into ' + String(p.interests).slice(0, 120) : ''));
      if (kinds.indexOf('abroad') >= 0)
        q.push('Cheap short trips abroad from UK airports near ' + home + ' ' + when + mood + (f.budget ? ' under £' + f.budget : '') + ', with rough flight and stay prices');
      if (!q.length) q.push('Rewarding at-home project ideas for a music producer and content creator' + mood);
      return q.slice(0, 3);
    },
    ideasPrompt: function(f, research) {
      var self = RPGACE.modules.tripPlans, p = self._profile || {};
      var kinds = (f.kinds && f.kinds.length ? f.kinds : Object.keys(self.IDEA_KINDS));
      var lines = [
        'Suggest things Alex could do. Alex is a UK music producer (beats, videos) living in ' + (p.home_city || 'Derby') + ', UK.',
        p.interests ? 'Interests: ' + p.interests + '.' : '', p.travel_limits ? 'Limits: ' + p.travel_limits + '.' : '',
        'Dates: ' + (f.start_date ? f.start_date + (f.end_date && f.end_date !== f.start_date ? ' to ' + f.end_date : '') : 'not fixed') + '.',
        f.budget ? 'Budget: about £' + f.budget + ' total.' : '', f.mood ? 'Mood / theme: ' + f.mood + '.' : '',
        f.notes ? 'He said: ' + f.notes : '',
        'Allowed kinds (mix them, at least one of each where it makes sense): ' + kinds.join(', ') + ' (daytrip = UK day trip, abroad = short trip abroad, event = a specific thing on, home = an at-home project).',
      ];
      if (research && research.notes.length) {
        lines.push('LIVE WEB RESEARCH (use these facts; never invent events, dates or prices beyond them):\n' + research.notes.join('\n\n'));
        lines.push('LINKS YOU MAY USE (only these, copy exactly):\n' + research.sources.slice(0, 30).map(function(x) { return x.url; }).join('\n'));
      } else lines.push('No live web results are available. Use general knowledge only; never name specific event dates or exact prices - give ranges; leave link empty.');
      lines.push('Return ONLY one JSON object, no markdown: {"ideas":[{"kind":"daytrip|abroad|event|home","title":"","where":"","when":"","cost_min":0,"cost_max":0,"travel":"how + how long, or empty","why":"one sentence why it suits him","link":"","plan_destination":"","plan_country":""}]}',
        'Rules: 5-8 ideas; only the allowed kinds; costs in GBP per person, total for the idea; no people or companions; short strings.');
      return lines.filter(Boolean).join('\n');
    },
    parseIdeas: function(o, f, research) {
      var self = RPGACE.modules.tripPlans;
      var allowed = (f.kinds && f.kinds.length ? f.kinds : Object.keys(self.IDEA_KINDS));
      var okLinks = {};
      ((research && research.sources) || []).forEach(function(x) { okLinks[x.url] = 1; });
      var str = function(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 160); };
      var num = function(v) { var n = Number(v); return isFinite(n) && n >= 0 ? Math.round(n) : null; };
      var list = (o && Array.isArray(o.ideas)) ? o.ideas : [];
      var out = [], seen = {};
      list.forEach(function(x) {
        if (!x || typeof x !== 'object') return;
        var kind = allowed.indexOf(x.kind) >= 0 ? x.kind : null;
        var title = str(x.title, 90);
        if (!kind || !title || seen[title.toLowerCase()]) return;
        seen[title.toLowerCase()] = 1;
        var lo = num(x.cost_min), hi = num(x.cost_max);
        if (lo != null && hi != null && hi < lo) { var t = lo; lo = hi; hi = t; }
        out.push({ kind: kind, title: title, where: str(x.where, 80), when: str(x.when, 60), cost_min: lo, cost_max: hi,
          travel: str(x.travel, 80), why: str(x.why, 200), link: okLinks[x.link] ? x.link : '',
          plan_destination: str(x.plan_destination || x.where, 80), plan_country: str(x.plan_country, 60) });
      });
      if (!out.length) throw new Error('Oracle returned no usable ideas - try again or widen the options');
      return out.slice(0, 8);
    },
    draftIdeas: function(f, onStep) {
      var L = RPGACE.modules.tripPlans.logic, pp = RPGACE.modules.phylumPath;
      if (!pp || !pp.logic || !pp.logic._callGroundWorkerJSON) return Promise.reject(new Error('Oracle is not available'));
      return L.research(f, onStep, L.ideaQueries(f)).then(function(research) {
        if (onStep) onStep('Oracle is picking ideas…');
        return pp.logic._callGroundWorkerJSON(L.ideasPrompt(f, research), 1500).then(function(o) {
          return { ideas: L.parseIdeas(o, f, research), research: research };
        });
      });
    },
    costText: function(i) {
      if (i.cost_min == null && i.cost_max == null) return '';
      if (i.cost_max === 0 && !i.cost_min) return 'Free';
      if (i.cost_min != null && i.cost_max != null && i.cost_min !== i.cost_max) return '£' + i.cost_min + '–£' + i.cost_max;
      return '£' + (i.cost_max != null ? i.cost_max : i.cost_min);
    },
    // A starred idea is a plans row with status 'idea' (no new table).
    savedIdeaFor: function(idea, f) {
      return (RPGACE.modules.tripPlans._plans || []).filter(function(p) {
        return p.status === 'idea' && p.title === idea.title && (p.start_date || null) === (f.start_date || null);
      })[0] || null;
    },
    starIdea: function(idea, f) {
      var self = RPGACE.modules.tripPlans, L = self.logic;
      var have = L.savedIdeaFor(idea, f);
      if (have) return Promise.resolve(have);
      var cost = L.costText(idea);
      return L.savePlan({ title: idea.title, destination: idea.kind === 'home' ? 'Home' : (idea.plan_destination || idea.where || null),
        country: idea.plan_country || null, start_date: f.start_date || null, end_date: f.end_date || f.start_date || null,
        budget: idea.cost_max || null, summary: [idea.why, cost ? 'Cost: ' + cost : '', idea.travel ? 'Travel: ' + idea.travel : ''].filter(Boolean).join(' '),
        details: { from_ideas: true, idea: idea }, tasks: [] }, 'idea');
    },
    // Prefill for the TP-4 builder from an idea (fresh or saved).
    ideaToBuilder: function(idea, f) {
      return { destination: idea.kind === 'home' ? 'Home' : (idea.plan_destination || idea.where || ''), country: idea.plan_country || '',
        start_date: (f && f.start_date) || '', end_date: (f && (f.end_date || f.start_date)) || '', budget: idea.cost_max || '',
        notes: idea.title + (idea.why ? ' - ' + idea.why : '') };
    },
    patchChat: function() {
      var self = RPGACE.modules.tripPlans;
      if (window._tripPlansPatched || typeof window.sendChat !== 'function') return;
      window._tripPlansPatched = true;
      var orig = window.sendChat;
      window.sendChat = function() {
        var input = document.getElementById('chat-input');
        var val = input ? input.value.trim() : '';
        if (val && self.IDEA_TRIGGER.test(val)) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          self.ui.open('ideas', Object.assign({ notes: val }, self.logic.parseDates(val)));
          return false;
        }
        if (val && self.TRIGGER.test(val)) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          self.ui.open('builder', { notes: val });
          return false;
        }
        return orig.apply(this, arguments);
      };
    },
  },

  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, kind) { return RPGACE.kit.btn(label, kind); },   // CK-6: one copy in RPGACE.kit
    _input: function(type, id, val, ph) {
      var i = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      if (type !== 'textarea') i.type = type;
      i.id = id; if (val != null) i.value = val; if (ph) i.placeholder = ph;
      i.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;width:100%;box-sizing:border-box;font-family:Rajdhani,sans-serif;';
      if (type === 'textarea') i.rows = 3;
      return i;
    },
    _field: function(label, el) {
      var w = document.createElement('label');
      w.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);';
      w.appendChild(document.createTextNode(label)); w.appendChild(el);
      return w;
    },
    _grid: function() { var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:10px;'; return g; },
    _h: function(parent, text) { var g = document.createElement('div'); g.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:14px 0 6px;'; g.textContent = text; parent.appendChild(g); },
    _toastErr: function(e) { RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 3800, 'tripPlans'); },
    _armDelete: function(btn, onConfirm) {
      var armed = false, timer = null, label = btn.textContent;
      btn.onclick = function() {
        if (!armed) { armed = true; btn.textContent = 'Delete?'; btn.style.color = '#CC4A4A'; timer = setTimeout(function() { armed = false; btn.textContent = label; btn.style.color = ''; }, 3000); return; }
        clearTimeout(timer); armed = false; btn.textContent = label; btn.style.color = ''; onConfirm();
      };
    },
    _dayLabel: function(isoDate) { return isoDate ? new Date(isoDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; },
    _link: function(url, text) {
      if (!/^https?:\/\//.test(url || '')) return RPGACE.modules.tripPlans.ui._esc(text || '');
      return '<a href="' + RPGACE.modules.tripPlans.ui._esc(url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--gold);">' + RPGACE.modules.tripPlans.ui._esc(text || url) + '</a>';
    },

    open: function(tab, prefill) {
      var self = RPGACE.modules.tripPlans;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📅 Schedule & Journal', title: '🧳 Plans', width: '640px' });
      pop.box.id = 'trip-plans';
      self._pop = pop;
      var tabs = document.createElement('div');
      tabs.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
      var body = document.createElement('div');
      body.id = 'trip-body';
      pop.box.appendChild(tabs); pop.box.appendChild(body);
      var show = function(t, pre) {
        tabs.innerHTML = '';
        [['plans', '🧳 Plans'], ['ideas', '💡 Ideas'], ['people', '👥 People'], ['profile', '🛂 Profile']].forEach(function(x) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'trip-tab'; b.dataset.tab = x[0]; b.textContent = x[1];
          var on = x[0] === t || (t === 'builder' && x[0] === 'plans');
          b.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
            (on ? 'background:var(--gold);border:none;color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
          b.onclick = function() { show(x[0]); };
          tabs.appendChild(b);
        });
        body.innerHTML = '';
        if (t === 'people') self.ui.renderPeople(body);
        else if (t === 'profile') self.ui.renderProfile(body);
        else if (t === 'builder') self.ui.renderBuilder(body, pre || {});
        else if (t === 'ideas') self.ui.renderIdeas(body, pre || {});
        else self.ui.renderPlans(body, show, pre);
      };
      self._show = show;
      body.textContent = 'Loading…';
      if (!self.logic.signedIn()) { body.textContent = 'Sign in to see your plans.'; return pop; }
      self.logic.loadAll().then(function() { show(tab || 'plans', prefill); }).catch(function(e) { body.textContent = 'Plans could not load: ' + (e.message || e); });
      return pop;
    },

    // ── Plans tab ─────────────────────────────────────────────────────
    renderPlans: function(body, show, pre) {
      var self = RPGACE.modules.tripPlans, esc = self.ui._esc;
      // TP-6: a Due-list row opens its plan straight away.
      var direct = pre && pre.planId && self._plans.filter(function(p) { return p.id === pre.planId; })[0];
      if (direct) { self.ui.renderPlan(body, direct, null, function() { show('plans'); }); return; }
      var add = self.ui._btn('+ Plan something', 'primary'); add.id = 'trip-new';
      add.onclick = function() { show('builder'); };
      body.appendChild(add);
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:13px;color:var(--muted);margin:8px 0 6px;line-height:1.5;';
      intro.textContent = 'Oracle researches and drafts the plan; you book through the links. You can also type "plan a trip to …" or "what could I do 1-8 Nov?" in Oracle chat.';
      body.appendChild(intro);
      if (!self._plans.length) { var e = document.createElement('div'); e.style.cssText = 'font-size:14px;color:var(--muted);'; e.textContent = 'No plans yet.'; body.appendChild(e); return; }
      self.STATUSES.forEach(function(st) {
        var list = self._plans.filter(function(p) { return p.status === st; });
        if (!list.length) return;
        self.ui._h(body, self.STATUS_LABELS[st]);
        list.forEach(function(p) {
          var tasks = self.logic.tasksFor(p.id), done = tasks.filter(function(t) { return t.done; }).length;
          var row = document.createElement('button');
          row.type = 'button'; row.className = 'trip-planrow'; row.dataset.id = p.id;
          row.style.cssText = 'display:block;width:100%;text-align:left;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--panel);color:var(--text);cursor:pointer;font-family:Rajdhani,sans-serif;';
          row.innerHTML = '<b style="font-size:15px;">' + esc(p.title) + '</b><br><span style="font-size:12px;color:var(--muted);">' +
            esc([p.start_date ? self.ui._dayLabel(p.start_date) + (p.end_date && p.end_date !== p.start_date ? ' – ' + self.ui._dayLabel(p.end_date) : '') : 'No dates', p.destination, tasks.length ? done + '/' + tasks.length + ' tasks done' : '', p.budget ? '£' + p.budget : ''].filter(Boolean).join(' · ')) + '</span>';
          row.onclick = function() { body.innerHTML = ''; self.ui.renderPlan(body, p, null, function() { show('plans'); }); };
          body.appendChild(row);
        });
      });
    },

    // ── Ideas board (TP-5) ────────────────────────────────────────────
    renderIdeas: function(body, pre) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui, esc = U._esc;
      U._h(body, '💡 What could I do?');
      var g = U._grid();
      var from = U._input('date', 'idea-from', pre.start_date || ''); var to = U._input('date', 'idea-to', pre.end_date || pre.start_date || '');
      var budget = U._input('number', 'idea-budget', pre.budget || '', '£ total (optional)');
      var reach = document.createElement('select'); reach.id = 'idea-reach';
      reach.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;';
      reach.innerHTML = '<option value="abroad">Abroad is fine</option><option value="uk">UK only</option><option value="home">Stay home</option>';
      reach.value = pre.reach || 'abroad';
      g.appendChild(U._field('From', from)); g.appendChild(U._field('To', to));
      g.appendChild(U._field('Budget (£)', budget)); g.appendChild(U._field('How far', reach));
      body.appendChild(g);
      var mood = U._input('text', 'idea-mood', pre.mood || '', 'Mood / theme, e.g. chill, music-heavy, outdoors, make content');
      body.appendChild(U._field('Mood / theme (optional)', mood));
      // Kind chips: default all allowed by "How far"; tap to switch one off.
      var kinds = {}, chips = document.createElement('div');
      chips.id = 'idea-kinds'; chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;';
      var paintChips = function() {
        chips.innerHTML = '';
        var allowed = self.IDEA_REACH[reach.value] || Object.keys(self.IDEA_KINDS);
        Object.keys(self.IDEA_KINDS).forEach(function(k) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'idea-kind'; c.dataset.kind = k; c.textContent = self.IDEA_KINDS[k];
          var can = allowed.indexOf(k) >= 0, on = can && kinds[k] !== false;
          c.disabled = !can;
          c.style.cssText = 'min-height:36px;padding:4px 10px;border-radius:16px;font-family:Rajdhani,sans-serif;font-size:13px;cursor:' + (can ? 'pointer' : 'default') + ';' +
            (on ? 'background:var(--gold);color:#111;border:none;' : 'background:none;color:var(--muted);border:1px solid var(--border);') + (can ? '' : 'opacity:.4;');
          c.onclick = function() { kinds[k] = kinds[k] === false; paintChips(); };
          chips.appendChild(c);
        });
      };
      reach.onchange = paintChips; paintChips();
      body.appendChild(chips);
      var status = document.createElement('div'); status.id = 'idea-status';
      status.style.cssText = 'font-size:13px;color:var(--muted);margin:6px 0 10px;min-height:18px;';
      body.appendChild(status);
      var go = U._btn('💡 Find ideas', 'primary'); go.id = 'idea-go'; go.style.cssText += 'width:100%;';
      body.appendChild(go);
      var results = document.createElement('div'); results.id = 'idea-results';
      body.appendChild(results);
      var saved = document.createElement('div'); saved.id = 'idea-saved';
      body.appendChild(saved);
      var form = function() {
        var allowed = self.IDEA_REACH[reach.value] || Object.keys(self.IDEA_KINDS);
        return { start_date: from.value || null, end_date: to.value || from.value || null, budget: budget.value || '', mood: mood.value.trim(),
          reach: reach.value, kinds: allowed.filter(function(k) { return kinds[k] !== false; }), notes: pre.notes || '' };
      };
      var renderSaved = function() {
        saved.innerHTML = '';
        var list = (self._plans || []).filter(function(p) { return p.status === 'idea'; });
        if (!list.length) return;
        U._h(saved, '⭐ Saved ideas (' + list.length + ')');
        list.forEach(function(p) {
          var row = document.createElement('div'); row.className = 'idea-saved-row';
          row.style.cssText = 'display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px;';
          var t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:0;font-size:14px;color:var(--text);';
          t.innerHTML = '<b>' + esc(p.title) + '</b><br><span style="font-size:12px;color:var(--muted);">' + esc([p.start_date ? U._dayLabel(p.start_date) : '', p.destination].filter(Boolean).join(' · ')) + '</span>';
          var mk = U._btn('🔮 Make it a plan', ''); mk.className = 'idea-saved-make';
          mk.onclick = function() {
            var idea = (p.details && p.details.idea) || { title: p.title, plan_destination: p.destination, plan_country: p.country, cost_max: p.budget };
            self._show('builder', L.ideaToBuilder(idea, { start_date: p.start_date, end_date: p.end_date }));
          };
          row.appendChild(t); row.appendChild(mk);
          saved.appendChild(row);
        });
      };
      var card = function(idea, f, research) {
        var c = document.createElement('div'); c.className = 'idea-card'; c.dataset.kind = idea.kind;
        c.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--panel);';
        var cost = L.costText(idea);
        c.innerHTML = '<div style="font-size:12px;color:var(--gold);font-weight:700;">' + esc(self.IDEA_KINDS[idea.kind]) + '</div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--text);margin:2px 0;">' + esc(idea.title) + '</div>' +
          '<div style="font-size:12px;color:var(--muted);">' + esc([idea.where, idea.when, cost, idea.travel].filter(Boolean).join(' · ')) + '</div>' +
          (idea.why ? '<div style="font-size:13px;color:var(--text);margin-top:4px;line-height:1.4;">' + esc(idea.why) + '</div>' : '') +
          (idea.link ? '<div style="font-size:12px;margin-top:4px;">' + U._link(idea.link, 'Source') + '</div>' : '');
        var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';
        var star = U._btn(L.savedIdeaFor(idea, f) ? '⭐ Saved' : '☆ Save', ''); star.className = 'idea-star';
        star.onclick = function() {
          if (L.savedIdeaFor(idea, f)) return;
          star.disabled = true;
          L.starIdea(idea, f).then(function() { star.textContent = '⭐ Saved'; renderSaved(); RPGACE.utils.toast('Idea saved to Plans', '#4CAF50', 1800); })
            .catch(function(e) { star.disabled = false; U._toastErr(e); });
        };
        var mk = U._btn('🔮 Make it a plan', 'primary'); mk.className = 'idea-make';
        mk.onclick = function() { self._show('builder', L.ideaToBuilder(idea, f)); };
        row.appendChild(star); row.appendChild(mk);
        c.appendChild(row);
        return c;
      };
      go.onclick = function() {
        var f = form();
        if (f.start_date && f.end_date && f.end_date < f.start_date) { RPGACE.utils.toast('The end date is before the start', '#E2A83D', 2500); return; }
        if (!f.kinds.length) { RPGACE.utils.toast('Switch on at least one kind of idea', '#E2A83D', 2500); return; }
        go.disabled = true; results.innerHTML = '';
        L.draftIdeas(f, function(msg) { status.textContent = msg; }).then(function(r) {
          go.disabled = false; status.textContent = '';
          if (!r.research.notes.length) {
            var warn = document.createElement('div'); warn.className = 'idea-noresearch';
            warn.style.cssText = 'font-size:13px;color:#e0a84c;border:1px solid #e0a84c;border-radius:8px;padding:8px 10px;margin:8px 0;';
            warn.textContent = 'Web search didn\'t answer this time, so these come from Oracle\'s own knowledge: check dates and prices before you commit.';
            results.appendChild(warn);
          }
          U._h(results, r.ideas.length + ' ideas');
          r.ideas.forEach(function(idea) { results.appendChild(card(idea, f, r.research)); });
        }).catch(function(e) { go.disabled = false; status.textContent = ''; U._toastErr(e); });
      };
      renderSaved();
    },

    // ── Builder (TP-4) ────────────────────────────────────────────────
    renderBuilder: function(body, pre) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui;
      U._h(body, 'Plan something');
      var g = U._grid();
      var dest = U._input('text', 'trip-dest', pre.destination || '', 'e.g. Lisbon, or "anywhere warm"');
      var country = U._input('text', 'trip-country', pre.country || '', 'e.g. Portugal');
      var from = U._input('date', 'trip-from', pre.start_date || ''); var to = U._input('date', 'trip-to', pre.end_date || '');
      var pass = document.createElement('select'); pass.id = 'trip-passport';
      pass.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;';
      pass.innerHTML = L.passports().map(function(x) { return '<option value="' + U._esc(x) + '">' + U._esc(x) + ' passport</option>'; }).join('');
      var budget = U._input('number', 'trip-budget', pre.budget || '', '£ total (optional)');
      g.appendChild(U._field('Where', dest)); g.appendChild(U._field('Country', country));
      g.appendChild(U._field('From', from)); g.appendChild(U._field('To', to));
      g.appendChild(U._field('Passport', pass)); g.appendChild(U._field('Budget (£)', budget));
      body.appendChild(g);
      var who = {};
      if (self._people.length) {
        var wl = document.createElement('div'); wl.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
        wl.innerHTML = '<span style="font-size:12px;color:var(--muted);width:100%;">Who\'s coming (optional)</span>';
        self._people.forEach(function(p) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'trip-who'; c.textContent = p.name;
          var paint = function() { c.style.cssText = 'min-height:36px;padding:4px 10px;border-radius:16px;cursor:pointer;font-family:Rajdhani,sans-serif;' + (who[p.name] ? 'background:var(--gold);color:#111;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);'); };
          c.onclick = function() { if (who[p.name]) delete who[p.name]; else who[p.name] = 1; paint(); };
          paint(); wl.appendChild(c);
        });
        body.appendChild(wl);
      }
      var notes = U._input('textarea', 'trip-notes', pre.notes || '', 'What do you want from it? e.g. record shops and a gig, chill, good food, film B-roll');
      body.appendChild(U._field('What you want', notes));
      var status = document.createElement('div'); status.id = 'trip-status';
      status.style.cssText = 'font-size:13px;color:var(--muted);margin:10px 0;min-height:18px;';
      body.appendChild(status);
      var go = U._btn('🔮 Research + draft plan', 'primary'); go.id = 'trip-build';
      go.style.cssText += 'width:100%;';
      body.appendChild(go);
      go.onclick = function() {
        var f = { destination: dest.value.trim(), country: country.value.trim(), start_date: from.value || null, end_date: to.value || from.value || null,
          passport: pass.value, budget: budget.value, notes: notes.value.trim(), people: Object.keys(who) };
        if (!f.destination && !f.notes) { RPGACE.utils.toast('Say where, or what you want', '#E2A83D', 2500); return; }
        if (f.start_date && f.end_date && f.end_date < f.start_date) { RPGACE.utils.toast('The end date is before the start', '#E2A83D', 2500); return; }
        go.disabled = true;
        L.draftPlan(f, function(msg) { status.textContent = msg; }).then(function(draft) {
          body.innerHTML = '';
          U.renderPlan(body, draft, f, function() { self._show('plans'); });
        }).catch(function(e) { go.disabled = false; status.textContent = ''; U._toastErr(e); });
      };
    },

    // Draft (unsaved, has .tasks) or saved plan view.
    renderPlan: function(body, plan, form, back) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui, esc = U._esc;
      var draft = !plan.id, d = plan.details || {};
      var tasks = draft ? (plan.tasks || []) : L.tasksFor(plan.id);
      var refreshSpent = function() {};
      var wrap = document.createElement('div'); wrap.id = draft ? 'trip-draft' : 'trip-plan';
      var backB = U._btn('← Plans', ''); backB.onclick = back; wrap.appendChild(backB);
      var h = document.createElement('div');
      h.style.cssText = 'margin:10px 0 4px;';
      h.innerHTML = '<div style="font-size:18px;font-weight:700;color:var(--text);">' + esc(plan.title) + '</div><div style="font-size:13px;color:var(--muted);">' +
        esc([plan.start_date ? U._dayLabel(plan.start_date) + (plan.end_date && plan.end_date !== plan.start_date ? ' – ' + U._dayLabel(plan.end_date) : '') : '', plan.passport ? plan.passport + ' passport' : '',
          plan.budget ? 'budget £' + plan.budget : '', plan.daily_limit ? '£' + plan.daily_limit + '/day spending' : '', (plan.people || []).length ? 'with ' + plan.people.join(', ') : ''].filter(Boolean).join(' · ')) + '</div>';
      wrap.appendChild(h);
      if (!draft && plan.status === 'idea') {
        var mkp = U._btn('🔮 Make it a plan', 'primary'); mkp.id = 'trip-idea-make';
        mkp.style.cssText += 'margin:6px 0;';
        mkp.onclick = function() {
          var idea = d.idea || { title: plan.title, plan_destination: plan.destination, plan_country: plan.country, cost_max: plan.budget };
          self._show('builder', L.ideaToBuilder(idea, { start_date: plan.start_date, end_date: plan.end_date }));
        };
        wrap.appendChild(mkp);
      }
      if (draft && !d.researched) {
        var warn = document.createElement('div');
        warn.className = 'trip-noresearch';
        warn.style.cssText = 'font-size:13px;color:#e0a84c;border:1px solid #e0a84c;border-radius:8px;padding:8px 10px;margin:8px 0;';
        warn.textContent = 'No live web search yet (add the Gemini key). This draft is from Oracle\'s own knowledge: check dates, prices and entry rules before booking.';
        wrap.appendChild(warn);
      }
      if (plan.summary) { var s = document.createElement('div'); s.style.cssText = 'font-size:14px;color:var(--text);line-height:1.5;margin:6px 0;'; s.textContent = plan.summary; wrap.appendChild(s); }

      U._h(wrap, '🛂 Documents & safety (check before booking)');
      var docs = document.createElement('div'); docs.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;';
      docs.innerHTML = [d.documents && d.documents.entry ? '<b>Entry:</b> ' + esc(d.documents.entry) : '', d.documents && d.documents.uk_reentry ? '<b>Back into the UK:</b> ' + esc(d.documents.uk_reentry) : '',
        d.documents && d.documents.check ? '<b>Double-check:</b> ' + esc(d.documents.check) : ''].filter(Boolean).join('<br>') +
        '<div style="margin-top:4px;">' + (d.official || []).map(function(x) { return '• ' + U._link(x.url, x.title); }).join('<br>') + '</div>';
      wrap.appendChild(docs);
      if (d.emergency && (d.emergency.number || d.emergency.consulate)) {
        U._h(wrap, '🆘 Emergency card');
        var em = document.createElement('div'); em.className = 'trip-emergency';
        em.style.cssText = 'font-size:13px;color:var(--text);border:1px solid #CC4A4A;border-radius:8px;padding:8px 10px;line-height:1.6;';
        em.innerHTML = [d.emergency.number ? '<b>Emergency:</b> ' + esc(d.emergency.number) : '', d.emergency.consulate ? '<b>Consulate:</b> ' + esc(d.emergency.consulate) : '',
          (self._profile && self._profile.insurance) ? '<b>Insurance:</b> ' + esc(self._profile.insurance) : '', d.emergency.notes ? esc(d.emergency.notes) : ''].filter(Boolean).join('<br>');
        wrap.appendChild(em);
      }
      if ((d.itinerary || []).length) {
        U._h(wrap, '🗓 Itinerary');
        var days = {};
        d.itinerary.forEach(function(x) { var k = x.date || 'Any day'; (days[k] = days[k] || []).push(x); });
        Object.keys(days).sort().forEach(function(k) {
          var dv = document.createElement('div'); dv.style.cssText = 'font-size:13px;margin-bottom:6px;';
          dv.innerHTML = '<b style="color:var(--text);">' + esc(k === 'Any day' ? k : U._dayLabel(k)) + '</b>' + days[k].map(function(x) {
            return '<div style="color:var(--text);padding-left:10px;">' + esc((x.time ? x.time + ' ' : '') + x.title) + (x.place ? ' <span style="color:var(--muted);">@ ' + esc(x.place) + '</span>' : '') +
              (x.journey_mins ? ' <span style="color:var(--muted);">(' + x.journey_mins + ' min journey)</span>' : '') + (x.note ? '<br><span style="color:var(--muted);">' + esc(x.note) + '</span>' : '') + '</div>';
          }).join('');
          wrap.appendChild(dv);
        });
      }
      if (tasks.length) {
        U._h(wrap, '✅ To do (you book through the links)');
        tasks.forEach(function(t) {
          var r = document.createElement('label'); r.className = 'trip-task';
          r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--text);padding:5px 0;border-bottom:1px solid var(--border);';
          var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.style.cssText = 'width:20px;height:20px;accent-color:var(--gold);flex:none;';
          var tx = document.createElement('span'); tx.style.cssText = 'flex:1;min-width:0;';
          var paint = function() {
            // TP-6: deadlines within 7 days are amber, today/overdue are highlighted.
            var n = t.due_by ? Math.round((new Date(t.due_by + 'T12:00:00') - new Date(L.iso() + 'T12:00:00')) / 864e5) : null;
            var dueTxt = '';
            if (t.due_by && !t.done) dueTxt = n < 0 ? ' <b class="trip-due-hot" style="color:#CC4A4A;">overdue, was ' + esc(U._dayLabel(t.due_by)) + '</b>' :
              n === 0 ? ' <b class="trip-due-hot" style="color:#e0a84c;background:rgba(224,168,76,0.15);padding:0 4px;border-radius:4px;">book today</b>' :
              ' <span style="color:' + (n <= self.BOOK_BY_WINDOW ? '#e0a84c' : 'var(--muted)') + ';">book by ' + esc(U._dayLabel(t.due_by)) + '</span>';
            tx.innerHTML = (self.TASK_KINDS[t.kind] || '•') + ' ' + esc(t.title) + dueTxt +
              (Number(t.cost_paid) > 0 ? ' <span class="trip-paid" style="color:#4caf82;">paid £' + esc(t.cost_paid) + '</span>' : t.cost_est ? ' <span style="color:var(--muted);">~£' + esc(t.cost_est) + '</span>' : '') +
              (t.link ? ' · ' + U._link(t.link, 'link') : '');
            refreshSpent();
          };
          paint();
          if (draft) cb.disabled = true;
          else cb.onchange = function() {
            if (cb.checked && self.MONEY_KINDS.indexOf(t.kind) !== -1 && !(Number(t.cost_paid) > 0)) { cb.checked = false; U._askPaid(r, t, plan, function() { cb.checked = true; paint(); }); return; }
            L.toggleTask(t).then(paint).catch(function(e) { cb.checked = !cb.checked; U._toastErr(e); });
          };
          r.appendChild(cb); r.appendChild(tx); wrap.appendChild(r);
        });
      }
      if (!draft && plan.status !== 'idea') {
        var sp = document.createElement('div'); sp.className = 'trip-spent';
        refreshSpent = function() {
          var spent = L.spent(plan.id);
          sp.style.cssText = 'font-size:13px;margin:8px 0;color:' + (plan.budget && spent > plan.budget ? '#CC4A4A' : 'var(--text)') + ';' + (spent || plan.budget ? '' : 'display:none;');
          sp.textContent = '💷 Paid so far £' + spent + (plan.budget ? ' of £' + plan.budget + ' budget' : '') + ' (logged in Finance as Travel)';
        };
        refreshSpent();
        wrap.appendChild(sp);
        U._renderPeoplePick(wrap, plan);
        U._renderTripLog(wrap, plan);
      }
      var listSection = function(title, items, fmt) { if (!items || !items.length) return; U._h(wrap, title); var el = document.createElement('div'); el.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;'; el.innerHTML = items.map(fmt).join('<br>'); wrap.appendChild(el); };
      listSection('🎛 Producer angle', d.producer, function(x) { return '• ' + (x.link ? U._link(x.link, x.name) : esc(x.name)) + (x.what ? ' <span style="color:var(--muted);">– ' + esc(x.what) + '</span>' : ''); });
      listSection('🍜 Food', d.food, function(x) { return '• ' + esc(x.name) + (x.dish ? ': ' + esc(x.dish) : '') + (x.note ? ' <span style="color:var(--muted);">– ' + esc(x.note) + '</span>' : ''); });
      listSection('☔ Backup plans', d.backup, function(x) { return '• ' + (x.date ? esc(U._dayLabel(x.date)) + ': ' : '') + esc(x.plan); });
      listSection('🔗 Sources', d.sources, function(x) { return '• ' + U._link(x.url, x.title); });

      var acts = document.createElement('div'); acts.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;';
      if (draft) {
        var change = U._input('textarea', 'trip-change', '', 'Ask Oracle to change something, e.g. "cheaper hotel", "add a day trip", "fewer early starts"');
        wrap.appendChild(U._field('Change it', change));
        var redo = U._btn('🔮 Update plan', ''); redo.id = 'trip-redo';
        var save = U._btn('Save plan', 'primary'); save.id = 'trip-save';
        var discard = U._btn('Discard', '');
        var st = document.createElement('div'); st.style.cssText = 'font-size:13px;color:var(--muted);width:100%;';
        redo.onclick = function() {
          if (!change.value.trim()) { RPGACE.utils.toast('Type what to change first', '#E2A83D', 2200); return; }
          redo.disabled = save.disabled = true; st.textContent = 'Oracle is updating the plan…';
          L.draftPlan(plan._form || form || {}, null, plan, change.value.trim()).then(function(np) { body.innerHTML = ''; U.renderPlan(body, np, form, back); })
            .catch(function(e) { redo.disabled = save.disabled = false; st.textContent = ''; U._toastErr(e); });
        };
        save.onclick = function() {
          save.disabled = true;
          L.savePlan(plan, 'planning').then(function(saved) { RPGACE.utils.toast('🧳 Plan saved', '#4caf82', 2200); body.innerHTML = ''; U.renderPlan(body, saved, null, back); })
            .catch(function(e) { save.disabled = false; U._toastErr(e); });
        };
        discard.onclick = back;
        acts.appendChild(save); acts.appendChild(redo); acts.appendChild(discard); acts.appendChild(st);
      } else {
        var sel = document.createElement('select'); sel.id = 'trip-statussel';
        sel.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:6px;min-height:44px;';
        sel.innerHTML = self.STATUSES.map(function(s) { return '<option value="' + s + '"' + (s === plan.status ? ' selected' : '') + '>' + self.STATUS_LABELS[s] + '</option>'; }).join('');
        sel.onchange = function() { L.setStatus(plan, sel.value).then(function() { RPGACE.utils.toast('Status: ' + self.STATUS_LABELS[sel.value], '#4caf82', 1800); }).catch(U._toastErr); };
        acts.appendChild(sel);
        if (plan.start_date && !plan.block_id) {
          var cal = U._btn('📅 Add to calendar', 'primary'); cal.id = 'trip-addcal';
          cal.onclick = function() {
            cal.disabled = true;
            L.addToCalendar(plan).then(function(n) { RPGACE.utils.toast('📅 On your planner' + (n ? ' + ' + n + ' timed item' + (n === 1 ? '' : 's') + ' on the schedule' : ''), '#4caf82', 2600); cal.remove(); })
              .catch(function(e) { cal.disabled = false; U._toastErr(e); });
          };
          acts.appendChild(cal);
        }
        var del = U._btn('Delete plan', ''); del.className = 'trip-del';
        U._armDelete(del, function() { del.disabled = true; L.removePlan(plan).then(back).catch(function(e) { del.disabled = false; U._toastErr(e); }); });
        acts.appendChild(del);
      }
      wrap.appendChild(acts);
      body.appendChild(wrap);
    },

    // ── TP-6: "what did you pay?" inline on a money task ──────────────
    _askPaid: function(row, t, plan, onDone) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui;
      if (row.nextSibling && row.nextSibling.className === 'trip-paybox') return;
      var box = document.createElement('div'); box.className = 'trip-paybox';
      box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0 8px 28px;font-size:13px;color:var(--text);';
      var lab = document.createElement('span'); lab.textContent = 'What did you pay? £';
      var inp = U._input('number', 'trip-paid-' + t.id, t.cost_est || '', 'e.g. 42.50'); inp.className = 'trip-paid-in'; inp.step = '0.01'; inp.min = '0'; inp.style.width = '110px';
      var ok = U._btn('Booked', 'primary'); ok.className = 'trip-paid-ok';
      var skip = U._btn('Done, no cost', ''); skip.className = 'trip-paid-skip';
      var cancel = U._btn('Cancel', '');
      var go = function(val) {
        ok.disabled = skip.disabled = true;
        L.markBooked(t, plan, val).then(function(res) {
          box.remove(); onDone();
          if (res.error) RPGACE.utils.toast('⚠️ Booked, but the Finance entry failed: ' + (res.error.message || res.error), '#CC4A4A', 4000, 'tripPlans');
          else RPGACE.utils.toast(res.logged ? '✅ Booked · £' + t.cost_paid + ' logged in Finance (Travel)' : '✅ Marked done', '#4caf82', 2400);
        }).catch(function(e) { ok.disabled = skip.disabled = false; U._toastErr(e); });
      };
      ok.onclick = function() { if (inp.value === '') { RPGACE.utils.toast('Enter what you paid, or tap Done, no cost', '#E2A83D', 2400); return; } go(inp.value); };
      skip.onclick = function() { go(null); };
      cancel.onclick = function() { box.remove(); };
      box.appendChild(lab); box.appendChild(inp); box.appendChild(ok); box.appendChild(skip); box.appendChild(cancel);
      row.parentNode.insertBefore(box, row.nextSibling);
      try { inp.focus(); } catch (e) {}
    },
    // ── TP-7: who's coming, on a saved plan ───────────────────────────
    _renderPeoplePick: function(wrap, plan) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui;
      var names = (self._people || []).map(function(p) { return p.name; });
      (plan.people || []).forEach(function(n) { if (names.indexOf(n) === -1) names.push(n); });
      if (!names.length) return;
      U._h(wrap, '👥 Who\'s coming');
      var hint = document.createElement('div'); hint.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:6px;';
      hint.textContent = 'Anyone ticked here shows on your Due list in the 2 weeks before the trip if you haven\'t spoken this week.';
      wrap.appendChild(hint);
      var row = document.createElement('div'); row.className = 'trip-peoplepick'; row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      names.forEach(function(n) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'trip-plan-who'; c.dataset.name = n; c.textContent = n;
        var paint = function() { var on = (plan.people || []).indexOf(n) !== -1; c.style.cssText = 'min-height:36px;padding:4px 10px;border-radius:16px;cursor:pointer;font-family:Rajdhani,sans-serif;' + (on ? 'background:var(--gold);color:#111;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);'); };
        c.onclick = function() {
          var cur = (plan.people || []).slice(), i = cur.indexOf(n);
          if (i === -1) cur.push(n); else cur.splice(i, 1);
          c.disabled = true;
          L.setPeople(plan, cur).then(function() { c.disabled = false; paint(); }).catch(function(e) { c.disabled = false; U._toastErr(e); });
        };
        paint(); row.appendChild(c);
      });
      wrap.appendChild(row);
    },
    // ── TP-6: after-trip log ──────────────────────────────────────────
    _renderTripLog: function(wrap, plan) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui, d = plan.details || {};
      var end = plan.end_date || plan.start_date;
      var log = d.trip_log;
      if (log) {
        U._h(wrap, '📓 After-trip log');
        var done = document.createElement('div'); done.className = 'trip-log-done'; done.style.cssText = 'font-size:13px;color:var(--text);';
        done.textContent = 'Logged in your journal' + (log.cost ? ' · real cost £' + log.cost : '') + '.';
        wrap.appendChild(done);
        if (log.recipe) {
          var ck = U._btn('🍳 Cook ' + log.recipe + ' at home', ''); ck.className = 'trip-cook';
          ck.onclick = function() { if (!L.cookAtHome(plan, log.recipe)) U._toastErr('Cooking is not loaded'); };
          wrap.appendChild(ck);
        }
        return;
      }
      if (!end || end >= L.iso()) return;
      U._h(wrap, '📓 How was it?');
      var form = document.createElement('div'); form.className = 'trip-logform';
      var best = U._input('textarea', 'trip-log-best', '', 'Best moments, people, places, a track or shot you got');
      var again = U._input('textarea', 'trip-log-again', '', 'What you\'d do differently next time');
      var cost = U._input('number', 'trip-log-cost', L.spent(plan.id) || '', '£ total spent'); cost.step = '0.01';
      var recipe = U._input('text', 'trip-log-recipe', '', 'A dish you want to make at home (optional)');
      form.appendChild(U._field('Best bits', best)); form.appendChild(U._field('Next time', again));
      var g = U._grid(); g.appendChild(U._field('Real cost (£)' + (plan.budget ? ' · budget £' + plan.budget : ''), cost)); g.appendChild(U._field('Bring a recipe home', recipe)); form.appendChild(g);
      var dl = document.createElement('label'); dl.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:13px;color:var(--text);margin-bottom:8px;';
      var mark = document.createElement('input'); mark.type = 'checkbox'; mark.id = 'trip-log-done'; mark.checked = plan.status !== 'done'; mark.style.cssText = 'width:20px;height:20px;accent-color:var(--gold);';
      if (plan.status === 'done') dl.style.display = 'none';
      dl.appendChild(mark); dl.appendChild(document.createTextNode('Mark the trip done'));
      form.appendChild(dl);
      var save = U._btn('Save to journal', 'primary'); save.id = 'trip-log-save';
      save.onclick = function() {
        save.disabled = true;
        L.saveTripLog(plan, { best: best.value.trim(), again: again.value.trim(), cost: cost.value, recipe: recipe.value.trim(), markDone: mark.checked }).then(function() {
          RPGACE.utils.toast('📓 Trip logged in your journal', '#4caf82', 2400);
          var p = wrap.parentNode; if (p && self._show) { p.innerHTML = ''; self.ui.renderPlan(p, plan, null, function() { self._show('plans'); }); }
        }).catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      form.appendChild(save);
      wrap.appendChild(form);
    },

    // ── People tab (TP-1) ─────────────────────────────────────────────
    renderPeople: function(body) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui, esc = U._esc, today = L.iso();
      var artistOf = {}, shm = RPGACE.modules.sellingHub;
      var draw = function() {
        body.innerHTML = '';
        var due = L.peopleDue(self._people, today);
        if (due.length) {
          U._h(body, '🔔 Reach out');
          due.forEach(function(x) { var e = document.createElement('div'); e.className = 'trip-due'; e.style.cssText = 'font-size:14px;color:var(--text);padding:3px 0;'; e.textContent = (x.kind === 'birthday' ? '🎂 ' : '📞 ') + x.text; body.appendChild(e); });
        }
        U._h(body, 'People');
        if (!self._people.length) { var n = document.createElement('div'); n.style.cssText = 'font-size:14px;color:var(--muted);'; n.textContent = 'Nobody added yet.'; body.appendChild(n); }
        self._people.forEach(function(p) {
          var r = document.createElement('div'); r.className = 'trip-person';
          r.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);';
          r.innerHTML = '<div style="flex:1;min-width:0;"><b style="font-size:14px;color:var(--text);">' + esc(p.name) + '</b>' + (p.relation ? ' <span style="color:var(--muted);font-size:12px;">' + esc(p.relation) + '</span>' : '') +
            '<br><span style="font-size:12px;color:var(--muted);">' + esc([p.contact_how, p.last_spoke ? 'last spoke ' + U._dayLabel(p.last_spoke) : 'not logged yet', p.reach_every_days ? 'every ' + p.reach_every_days + ' days' : '', p.birthday ? '🎂 ' + new Date(p.birthday + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · ')) + '</span>' +
            // TP-7: upcoming plans this person is on.
            (function() { var on = self._plans.filter(function(pl) { return (pl.status === 'planning' || pl.status === 'booked') && (pl.people || []).indexOf(p.name) !== -1 && (!pl.end_date || pl.end_date >= today); });
              return on.length ? '<br><span class="trip-person-plans" style="font-size:12px;color:var(--gold);">🧳 ' + esc(on.map(function(pl) { return pl.title + (pl.start_date ? ' ' + U._dayLabel(pl.start_date) : ''); }).join(', ')) + '</span>' : ''; })() + '</div>';
          var spoke = document.createElement('button'); spoke.type = 'button'; spoke.className = 'trip-spoke'; spoke.textContent = 'Spoke today';
          spoke.style.cssText = 'min-height:40px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;';
          spoke.onclick = function() { spoke.disabled = true; L.updatePerson(p.id, { last_spoke: today }).then(draw).catch(function(e) { spoke.disabled = false; U._toastErr(e); }); };
          var del = document.createElement('button'); del.type = 'button'; del.textContent = 'Delete';
          del.style.cssText = 'min-height:40px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
          U._armDelete(del, function() { del.disabled = true; L.removePerson(p.id).then(draw).catch(function(e) { del.disabled = false; U._toastErr(e); }); });
          // SH-7: a person linked to an artist (Selling) opens the artist profile.
          var art = artistOf[p.id];
          if (art) {
            var ab = document.createElement('button'); ab.type = 'button'; ab.className = 'trip-artist'; ab.textContent = '🎤 also an artist';
            ab.style.cssText = 'min-height:40px;padding:6px 10px;background:none;border:1px solid var(--gold);border-radius:6px;color:var(--gold);cursor:pointer;';
            ab.onclick = function() { RPGACE.modules.sellingHub.ui.openArtist(art.id); };
            r.appendChild(ab);
          }
          r.appendChild(spoke); r.appendChild(del); body.appendChild(r);
        });
        U._h(body, '+ Add someone');
        var g = U._grid();
        var f = { name: U._input('text', 'trip-p-name', '', 'Name'), relation: U._input('text', 'trip-p-rel', '', 'e.g. mum, friend, collab'), contact_how: U._input('text', 'trip-p-how', '', 'e.g. WhatsApp, call'),
          birthday: U._input('date', 'trip-p-bday'), last_spoke: U._input('date', 'trip-p-last'), reach_every_days: U._input('number', 'trip-p-every', '', 'e.g. 14') };
        g.appendChild(U._field('Name', f.name)); g.appendChild(U._field('Who', f.relation)); g.appendChild(U._field('How you talk', f.contact_how));
        g.appendChild(U._field('Birthday', f.birthday)); g.appendChild(U._field('Last spoke', f.last_spoke)); g.appendChild(U._field('Remind me every (days)', f.reach_every_days));
        body.appendChild(g);
        var add = U._btn('Add', 'primary'); add.id = 'trip-p-add';
        add.onclick = function() {
          var v = {}; Object.keys(f).forEach(function(k) { v[k] = f[k].value; });
          var p; try { p = L.addPerson(v); } catch (e) { U._toastErr(e); return; }
          add.disabled = true; p.then(draw).catch(function(e) { add.disabled = false; U._toastErr(e); });
        };
        body.appendChild(add);
      };
      draw();
      if (shm) shm.logic.read('artists', 'select=id,name,person_id&person_id=not.is.null&limit=500').then(function(rows) {
        (rows || []).forEach(function(a) { artistOf[a.person_id] = a; });
        if ((rows || []).length && body.isConnected) draw();
      }, function() {});
    },

    // ── Profile tab (TP-1) ────────────────────────────────────────────
    renderProfile: function(body) {
      var self = RPGACE.modules.tripPlans, L = self.logic, U = self.ui, p = self._profile || {};
      U._h(body, 'Travel profile');
      var hint = document.createElement('div'); hint.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
      hint.textContent = 'Used by every plan: which passport you travel on decides the entry rules, and your settled status decides what you need to get back into the UK. Kept private (only readable after you sign in).';
      body.appendChild(hint);
      var g = U._grid();
      var f = { home_city: U._input('text', 'trip-pr-home', p.home_city || 'Derby'), nationalities: U._input('text', 'trip-pr-nat', p.nationalities || 'French, Russian'),
        default_passport: U._input('text', 'trip-pr-pass', p.default_passport || 'French'), residency: U._input('text', 'trip-pr-res', p.residency || 'UK - EU Settled Status'),
        insurance: U._input('text', 'trip-pr-ins', p.insurance || '', 'Provider + policy/phone') };
      g.appendChild(U._field('Home', f.home_city)); g.appendChild(U._field('Nationalities', f.nationalities)); g.appendChild(U._field('Usual passport', f.default_passport));
      g.appendChild(U._field('UK status', f.residency)); g.appendChild(U._field('Travel insurance', f.insurance));
      body.appendChild(g);
      f.interests = U._input('textarea', 'trip-pr-int', p.interests || '', 'e.g. record shops, grime/drill nights, street food, museums, B-roll spots');
      f.travel_limits = U._input('textarea', 'trip-pr-lim', p.travel_limits || '', 'e.g. no flights before 7am, max 4h travel for a weekend');
      body.appendChild(U._field('Interests', f.interests)); body.appendChild(U._field('Travel limits', f.travel_limits));
      var save = U._btn('Save profile', 'primary'); save.id = 'trip-pr-save'; save.style.cssText += 'margin-top:10px;';
      save.onclick = function() {
        var v = {}; Object.keys(f).forEach(function(k) { v[k] = f[k].value; });
        save.disabled = true;
        L.saveProfile(v).then(function() { save.disabled = false; RPGACE.utils.toast('🛂 Profile saved', '#4caf82', 2000); }).catch(function(e) { save.disabled = false; U._toastErr(e); });
      };
      body.appendChild(save);
    },
  },

  open: function(tab, prefill) { return this.ui.open(tab, prefill); },
});
/* ===END:tripPlans=== */
