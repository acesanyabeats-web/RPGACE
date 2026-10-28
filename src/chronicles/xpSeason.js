/* ===MODULE:xpSeason=== */
// XP Season Pass, XP-1 + XP-2 (Oct 13 2026). Ratified plan "XP Season Pass",
// record: records/2026-10/xp_season_pass_ceo_loop1_2026-10-13.txt.
//
// ONE XP system. The database writes every XP row itself: xp_on_change()
// triggers on 15 source tables call xp_award(), which reads xp_rules
// (values, realm, daily cap) and inserts into the private xp_events ledger
// (migration: records/2026-10/xp1_migration_2026-10-13.sql). The client never
// awards XP; it only reads xp_events (through tripPlans.logic.read, the
// shared signed-in /api/data-write 'read' action) and paints:
//   - the dashboard profile card: Sky rank + stars, season level, level bar,
//     a 13-spoke balance wheel of this week's XP, Done/Streak/Level/XP chips;
//   - a realm strip under each domain popup's header and at the top of each
//     domain page (Alex: "profile cards show differently when in each domain,
//     so when I'm doing something I see how poorly I'm doing"): that domain's
//     realm(s), this week's XP against the usual week so far;
//   - the Season page (tap the card or a strip).
// Retired by this module: careerStatCard's row-count career score,
// questEngine painting the card from quest_log, and the legacy addXP() pop-ups.
// XP-3 (Oct 13 2026): realm ranks, gated titles, badges and the Trophy
// cabinet. The DB again does the deciding: xp_award() calls
// xp_check_unlocks(), which writes dated rows to the private xp_unlocks
// table (season ranks, career ranks, titles, gates, badges) and a progress
// snapshot to xp_settings.progress. Ladders live in xp_ladders (7 ranks per
// realm, min_xp = steady week x [0,2,6,14,26,40,56]; career = 4x, shown with
// stars), the badge/title/gate list in xp_unlock_defs. This module reads
// those and paints rank names on the strips, the Season page and the card,
// and opens the Trophy cabinet (earned + locked with progress, claims with a
// link or note, the season revenue target, past seasons). Migration:
// records/2026-10/xp3_migration_2026-10-13.sql.
// XP-4 (Oct 13 2026): the yearly pass is now called a YEAR (Year 0:
// Construction, then Year 2027 from 1 January); "season" now means a UK
// weather season (Spring Mar-May, Summer Jun-Aug, Autumn Sep-Nov, Winter
// Dec-Feb). Internal names (xpSeason, seasonOf, xp_events.season) keep the
// old word and hold the year number. A row deleted in the same week shows on
// the Year page as "was this done?" (Yes keeps the XP, No removes it); pg_cron
// runs xp_close_periods() nightly, which keeps any unanswered pending XP when
// its week ends, pays the weekly balance bonus (5+ realms 50, 8+ realms 150)
// and saves frozen xp_reports snapshots per week, month, season and year.
// Season and year reports are also Chronicles items. Migration:
// records/2026-10/xp4_migration_2026-10-13.sql.
// XP-5 (Oct 13 2026): weekly challenges (pick 3 on Monday from rule-based
// suggestions + 2 from one Oracle call that sees only realm totals), season
// resolutions (1-5 per UK season, 500/1000/1500) and realm quests (3 steps of
// 50 XP towards each rank gate, xp_quest_steps). All live in xp_challenges;
// the DB counts them from xp_events (xp_update_challenges) and pays on
// completion; a challenge with no metric is ticked by hand. Migration:
// records/2026-10/xp5_migration_2026-10-13.sql.
// Not here yet: treats/themes/flair (XP-6).
RPGACE.register('xpSeason', {
  domain: 'chronicles',

  REALMS: {
    producer:   { icon: '🎵', name: 'Producer' },
    creator:    { icon: '🎬', name: 'Creator' },
    hustler:    { icon: '💼', name: 'Hustler' },
    chef:       { icon: '🍳', name: 'Chef' },
    athlete:    { icon: '💪', name: 'Athlete' },
    scholar:    { icon: '📚', name: 'Scholar' },
    life:       { icon: '🏠', name: 'Life' },
    homekeeper: { icon: '🏡', name: 'Homekeeper' },
    mind:       { icon: '🧘', name: 'Mind' },
    steward:    { icon: '💷', name: 'Steward' },
    explorer:   { icon: '✈️', name: 'Explorer' },
    connector:  { icon: '🤝', name: 'Connector' },
    builder:    { icon: '🛠', name: 'Builder' },
  },
  ORDER: ['producer', 'creator', 'hustler', 'chef', 'athlete', 'scholar', 'life', 'homekeeper', 'mind', 'steward', 'explorer', 'connector', 'builder'],
  SKY: ['Spark', 'Ember', 'Flame', 'Comet', 'Star', 'Nova', 'Constellation', 'Galaxy'],
  // Ratified: 40 stars spaced evenly by XP; Galaxy 1 (star 36) at ~72,000 XP.
  STAR_XP: 72000 / 35,
  // Which realm(s) a domain card or page shows. Keys are dashDeck card keys
  // and RPGACE.CONFIG.pages slugs.
  CARD_REALMS: {
    cooking: ['chef'], gym: ['athlete'], health: ['athlete'], wishlist: ['steward'],
    pipeline: ['producer', 'creator', 'hustler'],
    library: ['scholar'], bookworm: ['scholar'], taxonomy: ['scholar'], gaps: ['scholar'], encyclopedia: ['scholar'], screenshots: ['scholar'],
    agenda: ['life', 'homekeeper', 'mind'], morningBrief: ['life'], journal: ['life'], plans: ['explorer', 'connector'],
    oversight: ['builder'],
  },
  PAGE_REALMS: {
    'content-pipeline': ['producer', 'creator', 'hustler'], 'selling': ['hustler'], 'money': ['hustler', 'steward'], 'idea-bank': ['producer', 'creator'], 'beat-log': ['producer'],
    'bookworm': ['scholar'], 'videoworm': ['scholar'], 'musicworm': ['scholar'], 'bibliography': ['scholar'], 'encyclopedia': ['scholar'],
    'phylumpath': ['scholar'], 'jargon-encyclopedia': ['scholar'], 'knowledge': ['scholar'], 'library': ['scholar'], 'screenshots': ['scholar'], 'review': ['scholar'], 'study': ['scholar'],
    'quests': ['life', 'homekeeper', 'mind'], 'schedule': ['life', 'homekeeper'], 'journal': ['life'],
  },

  // XP-5: what a challenge or resolution can count. Each entry counts one
  // xp_events action in the period (measure count), or a realm's XP
  // (measure xp) where the realm has no single action of its own.
  CHALLENGE_MENU: [
    { action: 'beat_logged', realm: 'producer', label: 'Log {n} beat{s}', n: 2 },
    { action: 'beat_finished', realm: 'producer', label: 'Finish {n} beat{s}', n: 1 },
    { action: 'beat_released', realm: 'producer', label: 'Release {n} beat{s}', n: 1 },
    { action: 'video_posted', realm: 'creator', label: 'Post {n} video{s}', n: 1 },
    { action: 'treatment_done', realm: 'creator', label: 'Write {n} visual treatment{s}', n: 1 },
    { action: 'sale', realm: 'hustler', label: 'Make {n} sale{s}', n: 1 },
    { action: 'cook_finished', realm: 'chef', label: 'Finish {n} cook{s}', n: 2 },
    { action: 'recipe_saved', realm: 'chef', label: 'Save {n} new recipe{s}', n: 1 },
    { action: 'gym_session', realm: 'athlete', label: 'Gym {n} time{s}', n: 3 },
    { action: 'chapter_done', realm: 'scholar', label: 'Analyse {n} book chapter{s}', n: 2 },
    { action: 'jargon_reviewed', realm: 'scholar', label: 'Review {n} jargon term{s}', n: 20 },
    { action: 'library_added', realm: 'scholar', label: 'Add {n} thing{s} to your Library', n: 3 },
    { action: 'journal_entry', realm: 'life', label: 'Write {n} journal entr{ies}', n: 3 },
    { action: 'routine_tick', realm: 'life', label: 'Tick {n} action{s}', n: 10 },
    { measure: 'xp', realm: 'homekeeper', label: 'Earn {n} Homekeeper XP', n: 50 },
    { measure: 'xp', realm: 'mind', label: 'Earn {n} Mind XP', n: 30 },
    { action: 'expense_logged', realm: 'steward', label: 'Log {n} expense{s}', n: 3 },
    { action: 'outreach_sent', realm: 'hustler', label: 'Send {n} outreach message{s}', n: 3 },
    { action: 'plan_made', realm: 'explorer', label: 'Make {n} plan{s}', n: 1 },
    { action: 'caught_up', realm: 'connector', label: 'Catch up with {n} {person}', n: 2 },
    { action: 'hand_test', realm: 'builder', label: 'Hand-test {n} feature{s}', n: 3 },
  ],
  CHALLENGE_XP: 75,
  RESOLUTION_XP: { small: 500, medium: 1000, big: 1500 },
  // XP-6: profile-card themes, unlocked at year levels 10/25/50/75.
  THEMES: [
    { key: 'default', name: 'Classic gold', level: 1, accent: '#C9A84C', frame: 'none' },
    { key: 'ember', name: 'Ember', level: 10, accent: '#E07A3F', frame: '2px solid #B87333' },
    { key: 'tide', name: 'Tide', level: 25, accent: '#3FB6B0', frame: '2px solid #C0C7CF' },
    { key: 'aurora', name: 'Aurora', level: 50, accent: '#9B7BE0', frame: '2px solid #C9A84C' },
    { key: 'crown', name: 'Crown', level: 75, accent: '#E8C35A', frame: '3px double #E8C35A' }
  ],
  _cache: null,
  _inflight: null,
  _tcache: null,
  _tinflight: null,

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { self.ui.renderCard(); });
    // CC-2 (Oct 21 2026): weekly challenge ideas + the Year Wrapped paragraph
    // can come from Orchestrator CC (the 🤖 switch) instead of the API.
    if (RPGACE.modules.orchestratorCC) {
      RPGACE.modules.orchestratorCC.logic.registerType('xp_week_challenges', { apply: function(json, row) { return self.logic.ccApplyChallenges(json, row); } });
      RPGACE.modules.orchestratorCC.logic.registerType('xp_wrapped', { apply: function(json, row) { return self.logic.saveWrappedText(json, (row.context || {}).reportId); } });
    }
    RPGACE.hooks.on('rpgace:login', function() { self.logic.clear(); setTimeout(function() { self.ui.renderCard(); }, 800); });
    RPGACE.hooks.on('page:show', function(name) {
      self.logic.clear();
      self.ui.hudFor(name);
      if (name === 'dashboard') setTimeout(function() { self.ui.renderCard(); }, 300);
      if (self.PAGE_REALMS[name]) setTimeout(function() { self.ui.pageStrip(name); }, 500);
    });
  },

  logic: {
    clear: function() { var S = RPGACE.modules.xpSeason; S._cache = null; S._tcache = null; },
    signedIn: function() { var tp = RPGACE.modules.tripPlans; return !!(tp && tp.logic.signedIn()); },
    seasonOf: function(isoDay) { return isoDay < '2027-01-01' ? 0 : Number(isoDay.slice(0, 4)); },
    seasonName: function(season) { return season === 0 ? 'Year 0: Construction' : 'Year ' + season; },
    today: function() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    addDays: function(isoDay, n) { var d = new Date(isoDay + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    weekStart: function(isoDay) { var d = new Date(isoDay + 'T12:00:00'), dow = (d.getDay() + 6) % 7; return RPGACE.modules.xpSeason.logic.addDays(isoDay, -dow); },
    // Ratified rising curve: level 1 needs 500 XP, each next level 25 more.
    levelFor: function(xp) {
      var lvl = 1, need = 500, rem = Math.max(0, xp || 0);
      while (rem >= need) { rem -= need; lvl++; need = 500 + 25 * (lvl - 1); }
      return { level: lvl, into: rem, need: need };
    },
    skyFor: function(xp) {
      var S = RPGACE.modules.xpSeason, idx = Math.min(39, Math.floor(Math.max(0, xp || 0) / S.STAR_XP));
      return { rank: S.SKY[Math.floor(idx / 5)], stars: (idx % 5) + 1, index: idx, nextAt: idx >= 39 ? null : Math.ceil((idx + 1) * S.STAR_XP) };
    },
    load: function(force) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      if (!L.signedIn()) return Promise.resolve(null);
      if (!force && S._cache && Date.now() - S._cache.at < 15000) return Promise.resolve(S._cache.events);
      if (S._inflight) return S._inflight;
      S._inflight = RPGACE.modules.tripPlans.logic.read('xp_events',
        'select=id,season,realm,action,xp,earned_on,earned_at,status,note&status=neq.removed&order=earned_at.desc&limit=10000')
        .then(function(rows) { S._cache = { at: Date.now(), events: rows || [] }; S._inflight = null; return S._cache.events; },
              function(e) { S._inflight = null; throw e; });
      return S._inflight;
    },
    // Everything the card, strips and Season page show, from the ledger.
    summary: function(events, todayIso) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      var today = todayIso || L.today(), season = L.seasonOf(today), wk = L.weekStart(today);
      var out = { season: season, seasonName: L.seasonName(season), total: 0, career: 0, careerRealms: {}, done: 0, realms: {}, week: {}, prevWeeks: {}, days: {}, recent: [] };
      S.ORDER.forEach(function(r) { out.realms[r] = 0; out.week[r] = 0; out.prevWeeks[r] = {}; });
      var firstDay = null;
      (events || []).forEach(function(e) {
        var xp = Number(e.xp) || 0;
        out.career += xp;
        out.careerRealms[e.realm] = (out.careerRealms[e.realm] || 0) + xp;
        if (Number(e.season) !== season) return;
        out.total += xp; out.done++;
        if (!(e.realm in out.realms)) { out.realms[e.realm] = 0; out.week[e.realm] = 0; out.prevWeeks[e.realm] = {}; }
        out.realms[e.realm] += xp;
        out.days[e.earned_on] = 1;
        if (!firstDay || e.earned_on < firstDay) firstDay = e.earned_on;
        var w = L.weekStart(e.earned_on);
        if (w === wk) out.week[e.realm] += xp;
        else out.prevWeeks[e.realm][w] = (out.prevWeeks[e.realm][w] || 0) + xp;
        if (out.recent.length < 25) out.recent.push(e);
      });
      // Usual week = average over the season's full weeks before this one.
      var seasonStart = season === 0 ? (firstDay && firstDay < wk ? L.weekStart(firstDay) : wk) : (season + '-01-01');
      var weeksBefore = Math.max(0, Math.round((new Date(wk + 'T12:00:00') - new Date(L.weekStart(seasonStart) + 'T12:00:00')) / (7 * 86400000)));
      out.weeksBefore = weeksBefore;
      out.usual = {};
      Object.keys(out.realms).forEach(function(r) {
        var sum = 0; Object.keys(out.prevWeeks[r]).forEach(function(k) { sum += out.prevWeeks[r][k]; });
        out.usual[r] = weeksBefore ? sum / weeksBefore : null;
      });
      out.dayOfWeek = ((new Date(today + 'T12:00:00').getDay() + 6) % 7) + 1;  // Mon=1..Sun=7
      out.level = L.levelFor(out.total);
      out.sky = L.skyFor(out.total);
      out.realmsThisWeek = S.ORDER.filter(function(r) { return out.week[r] > 0; }).length;
      var streak = 0, d = out.days[today] ? today : L.addDays(today, -1);
      while (out.days[d]) { streak++; d = L.addDays(d, -1); }
      out.streak = streak;
      return out;
    },
    // How this week compares with the usual week so far (pro-rated by day).
    pace: function(sum, realm) {
      var usual = sum.usual[realm], now = sum.week[realm] || 0;
      if (usual == null) return { key: 'first', text: now ? 'first week of the year' : 'nothing yet: first week of the year' };
      if (usual <= 0) return now > 0 ? { key: 'up', text: 'above your usual (usually 0)' } : { key: 'none', text: 'nothing yet, like most weeks' };
      var expect = usual * sum.dayOfWeek / 7, ratio = expect > 0 ? now / expect : 1;
      if (ratio < 0.5) return { key: 'behind', text: 'behind: ' + Math.round(now) + ' vs ~' + Math.round(expect) + ' usual by now' };
      if (ratio < 0.9) return { key: 'slow', text: 'a bit slow: ' + Math.round(now) + ' vs ~' + Math.round(expect) + ' usual by now' };
      return { key: 'up', text: 'on pace: ' + Math.round(now) + ' vs ~' + Math.round(expect) + ' usual by now' };
    },
    // ── XP-3: ladders, unlocks, progress ─────────────────────────────
    loadTrophies: function(force) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      if (!L.signedIn()) return Promise.resolve(null);
      if (!force && S._tcache && Date.now() - S._tcache.at < 15000) return Promise.resolve(S._tcache.data);
      if (S._tinflight) return S._tinflight;
      var rd = RPGACE.modules.tripPlans.logic.read;
      S._tinflight = Promise.all([
        rd('xp_ladders', 'select=realm,idx,name,min_xp,gate&order=realm.asc,idx.asc'),
        rd('xp_unlock_defs', 'select=key,kind,realm,name,how,auto,icon,sort&order=sort.asc'),
        rd('xp_unlocks', 'select=key,kind,realm,name,season,status,proof,note,unlocked_at&order=unlocked_at.asc&limit=2000'),
        rd('xp_settings', 'select=revenue_target,monthly_income_target,progress,progress_at,theme,weekly_spend_limit,weekly_limit_from&id=eq.1'),
        rd('xp_reports', 'select=id,kind,period_start,period_end,label,data,wrapped_text,wrapped_seen_at&order=period_start.desc&limit=400'),
        rd('xp_challenges', 'select=*&order=created_at.desc&limit=600'),
        rd('xp_quest_steps', 'select=key,gate,realm,label,progress_key,target,step,sort,status,source,manual,size,xp,proof_kind,why,tier,proof,created_at,approved_at,done_at,last_touched&status=in.(approved,done,proposed)&order=sort.asc'),
        rd('xp_treats', 'select=*&order=created_at.asc&limit=300'),
      ]).then(function(r) {
        var data = { ladders: {}, defs: r[1] || [], unlocks: r[2] || [], settings: (r[3] && r[3][0]) || {}, reports: r[4] || [],
          challenges: r[5] || [], questSteps: r[6] || [], treats: r[7] || [], have: {} };
        (r[0] || []).forEach(function(x) { (data.ladders[x.realm] = data.ladders[x.realm] || []).push(x); });
        data.unlocks.forEach(function(u) { if (!data.have[u.key]) data.have[u.key] = u; });
        S._tcache = { at: Date.now(), data: data }; S._tinflight = null;
        return data;
      }, function(e) { S._tinflight = null; throw e; });
      return S._tinflight;
    },
    // Same rule as xp_check_unlocks: a rank needs its XP, its gate, and
    // every rank below it. mult 4 = career ladder.
    rankFor: function(ladder, xp, have, mult) {
      if (!ladder || !ladder.length) return null;
      mult = mult || 1;
      var cur = ladder[0], next = null;
      for (var i = 1; i < ladder.length; i++) {
        var l = ladder[i], need = l.min_xp * mult, gateOk = !l.gate || !!(have && have[l.gate]);
        if (xp >= need && gateOk) { cur = l; continue; }
        next = { name: l.name, need: need, gate: gateOk ? null : l.gate, xpOk: xp >= need };
        break;
      }
      var curNeed = cur.min_xp * mult, stars = 5;
      if (next) stars = Math.max(1, Math.min(5, 1 + Math.floor(5 * (xp - curNeed) / Math.max(1, next.need - curNeed))));
      return { idx: cur.idx, name: cur.name, next: next, stars: stars, from: curNeed };
    },
    // KN-0: per-realm rank progress for the left nav bars, cached a minute.
    navBars: function() {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      if (!L.signedIn()) return Promise.resolve(null);
      if (S._navBars && Date.now() - S._navBars.at < 60000) return Promise.resolve(S._navBars.map);
      return Promise.all([L.load(), L.loadTrophies().catch(function() { return null; })]).then(function(res) {
        if (!res[0]) return null;
        var sum = L.summary(res[0]), T = res[1], map = {};
        S.ORDER.forEach(function(r) {
          var xp = sum.realms[r] || 0, rk = T ? L.realmRanks(sum, T, r) : null, se = rk && rk.season, pct = 0;
          if (se && se.next) pct = Math.max(0, Math.min(1, (xp - se.from) / Math.max(1, se.next.need - se.from)));
          else if (se) pct = 1;
          map[r] = { xp: xp, pct: pct, rank: se ? se.name : xp.toLocaleString('en-GB') + ' XP' };
        });
        S._navBars = { at: Date.now(), map: map };
        return map;
      });
    },
    realmRanks: function(sum, T, realm) {
      var L = RPGACE.modules.xpSeason.logic, lad = T && T.ladders[realm];
      if (!lad) return null;
      return { season: L.rankFor(lad, sum.realms[realm] || 0, T.have, 1), career: L.rankFor(lad, sum.careerRealms[realm] || 0, T.have, 4) };
    },
    defFor: function(T, key) { return (T.defs || []).filter(function(d) { return d.key === key; })[0] || null; },
    // Earned rows for a def: exact key, or key:suffix for repeatable claims
    // and per-country badges.
    earnedFor: function(T, key) {
      return (T.unlocks || []).filter(function(u) { return u.key === key || u.key.indexOf(key + ':') === 0; });
    },
    progressText: function(T, key) {
      var p = (T.settings && T.settings.progress) || {}, n = function(k) { return Number(p[k]) || 0; };
      var t = T.settings && Number(T.settings.revenue_target);
      switch (key) {
        case 'sous_chef': return n('cooks') + ' of 20 cooks';
        case 'head_chef': return n('cooks') + '/50 cooks · ' + n('cook_recipes') + '/10 recipes · ' + n('cuisines') + '/3 cuisines';
        case 'tycoon': return t ? '£' + n('season_revenue') + ' of £' + t + ' this year' : 'set this year\'s revenue target below';
        case 'gladiator': return 'best run ' + n('gym_run') + ' of 4 weeks';
        case 'polymath': return n('phyla') + ' of 8 phyla';
        case 'pathfinder': return n('path_run') + ' of 6 weeks kept';
        case 'lake': return n('sleep_days') + ' of 21 nights in the last 28 days' + (n('sleep_days') ? '' : ' · mark your sleep action in My Day (Mind area)');
        case 'globetrotter': return n('countries') + ' of 5 countries';
        case 'heart': return n('people_tracked') ? n('people_tracked') + ' people tracked · checked whenever XP lands' : 'add people with a "reach every" in Plans';
        case 'consistent_creator': return 'best run ' + n('video_run') + ' of 12 weeks';
        case 'catalogue_builder': return n('released_season') + ' of 25 released this year';
        case 'jargon_100': return n('jargon_reviewed') + ' of 100 reviewed';
        default: return '';
      }
    },
    claim: function(def, proof) {
      var row = { key: def.kind === 'gate' ? def.key : def.key + ':' + Date.now(), kind: def.kind, realm: def.realm, name: def.name, status: 'claimed', proof: proof || null };
      return RPGACE.sb.secureWrite('xp_unlocks', 'insert', row).then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    setRevenueTarget: function(v) {
      return RPGACE.sb.secureWrite('xp_settings', 'update', { revenue_target: v, updated_at: new Date().toISOString() }, 'id=eq.1')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    // SH-5 (Oct 17 2026): one monthly income target; the year's Tycoon target is 12x it.
    setMonthlyTarget: function(v) {
      v = v === '' || v == null ? null : Math.round(Number(v) * 100) / 100;
      if (v != null && !(v >= 0 && isFinite(v))) return Promise.reject(new Error('Pick a target of £0 or more'));
      return RPGACE.sb.secureWrite('xp_settings', 'update', { monthly_income_target: v, revenue_target: v == null ? null : Math.round(v * 12 * 100) / 100, updated_at: new Date().toISOString() }, 'id=eq.1')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return v; });
    },
    // Pure: the monthly figure (saved monthly, else an old yearly target / 12).
    monthlyOf: function(settings) {
      if (!settings) return null;
      if (settings.monthly_income_target != null) return Number(settings.monthly_income_target);
      return settings.revenue_target != null ? Math.round(Number(settings.revenue_target) / 12 * 100) / 100 : null;
    },
    // ── XP-5: challenges, resolutions, realm quests ─────────────────
    // UK weather season (Spring Mar-May, Summer Jun-Aug, Autumn Sep-Nov,
    // Winter Dec-Feb), same as xp_season_start/xp_season_label in the DB.
    ukSeason: function(isoDay) {
      var y = Number(isoDay.slice(0, 4)), mo = Number(isoDay.slice(5, 7));
      var sy = mo <= 2 ? y - 1 : y, sm = mo === 12 || mo <= 2 ? 12 : 3 + Math.floor((mo - 3) / 3) * 3;
      var start = sy + '-' + String(sm).padStart(2, '0') + '-01';
      var ey = sm + 2 > 12 ? sy + 1 : sy, em = ((sm + 1) % 12) + 1;
      var end = new Date(Date.UTC(ey, em, 0)).toISOString().slice(0, 10);
      var name = sm === 3 ? 'Spring' : sm === 6 ? 'Summer' : sm === 9 ? 'Autumn' : 'Winter';
      var label = sm === 12 ? 'Winter ' + sy + '/' + String((sy + 1) % 100).padStart(2, '0') : name + ' ' + sy;
      return { start: start, end: end, label: label, icon: { Spring: '🌱', Summer: '☀️', Autumn: '🍂', Winter: '❄️' }[name] };
    },
    challengeTitle: function(item, n) {
      var many = n !== 1;
      return item.label.replace('{n}', n).replace('{s}', many ? 's' : '').replace('{ies}', many ? 'ies' : 'y').replace('{person}', many ? 'people' : 'person');
    },
    menuItem: function(key) {
      return RPGACE.modules.xpSeason.CHALLENGE_MENU.filter(function(x) { return (x.action || ('xp:' + x.realm)) === key; })[0] || null;
    },
    menuKey: function(item) { return item.action || ('xp:' + item.realm); },
    weekChallenges: function(T, ws) {
      return (T.challenges || []).filter(function(c) { return c.kind === 'weekly' && c.period_start === ws; });
    },
    // Rule-based suggestions: the realms furthest behind their usual pace
    // first, one suggestion each, never one already picked this week.
    ruleSuggestions: function(sum, taken, count) {
      var S = RPGACE.modules.xpSeason, L = S.logic, out = [];
      var score = function(r) { var u = sum.usual[r]; var exp = u ? u * sum.dayOfWeek / 7 : 0; return exp > 0 ? (sum.week[r] || 0) / exp : ((sum.week[r] || 0) > 0 ? 1 : 0); };
      var realms = S.ORDER.slice().sort(function(a, b) { return score(a) - score(b) || S.ORDER.indexOf(a) - S.ORDER.indexOf(b); });
      realms.forEach(function(r) {
        if (out.length >= (count || 4)) return;
        var item = S.CHALLENGE_MENU.filter(function(x) { return x.realm === r && !taken[L.menuKey(x)]; })[0];
        if (!item) return;
        taken[L.menuKey(item)] = 1;
        out.push({ key: L.menuKey(item), realm: r, title: L.challengeTitle(item, item.n), target: item.n, source: 'rules',
          metric_actions: item.action ? [item.action] : null, measure: item.measure || 'count' });
      });
      return out;
    },
    oraclePrompt: function(sum) {
      var S = RPGACE.modules.xpSeason;
      var lines = S.ORDER.map(function(r) { return r + ': ' + (sum.week[r] || 0) + ' XP this week, usual week ' + (sum.usual[r] == null ? 'unknown' : Math.round(sum.usual[r])); });
      var menu = S.CHALLENGE_MENU.map(function(x) { return (x.action || ('xp:' + x.realm)) + ' (' + x.realm + ', e.g. ' + x.n + ')'; });
      return 'You suggest weekly challenges for a personal XP system. Today is day ' + sum.dayOfWeek + ' of 7.\n' +
        'Realm XP:\n' + lines.join('\n') + '\n' +
        'Allowed challenge types (key, realm, typical number):\n' + menu.join('\n') + '\n' +
        'Pick 2 challenges for the realms that most need attention this week, each realistic for one week. ' +
        'Return JSON only: {"challenges":[{"key":"<one allowed key>","target":<whole number>,"why":"<max 12 words>"}]}';
    },
    // Never trust model JSON: keep only allowed keys and sane numbers.
    parseOracleSuggestions: function(json, taken) {
      var L = RPGACE.modules.xpSeason.logic, out = [];
      ((json && json.challenges) || []).forEach(function(c) {
        var item = c && L.menuItem(String(c.key || ''));
        var n = Math.round(Number(c && c.target));
        if (!item || taken[L.menuKey(item)] || !(n >= 1) || n > (item.measure === 'xp' ? 500 : 50) || out.length >= 2) return;
        taken[L.menuKey(item)] = 1;
        out.push({ key: L.menuKey(item), realm: item.realm, title: L.challengeTitle(item, n), target: n, source: 'oracle',
          why: String(c.why || '').slice(0, 90), metric_actions: item.action ? [item.action] : null, measure: item.measure || 'count' });
      });
      return out;
    },
    // One Oracle call per week: saved as 'suggested' rows, reused after.
    oracleSuggestions: function(sum, T, ws, taken) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      var saved = L.weekChallenges(T, ws).filter(function(c) { return c.source === 'oracle'; });
      if (saved.length) return Promise.resolve(saved.filter(function(c) { return c.status === 'suggested'; }).map(function(c) {
        taken[c.measure === 'xp' ? 'xp:' + c.realm : (c.metric_actions || [])[0]] = 1;
        return { id: c.id, realm: c.realm, title: c.title, target: c.target, source: 'oracle', why: '', metric_actions: c.metric_actions, measure: c.measure };
      }));
      var pp = RPGACE.modules.phylumPath, oc = RPGACE.modules.orchestratorCC, prompt = L.oraclePrompt(sum);
      var viaApi = function() {
        if (!pp || !pp.logic || !pp.logic._callGroundWorkerJSON) return Promise.resolve([]);
        return pp.logic._callGroundWorkerJSON(prompt, 400).then(function(json) { return L.saveOracleSuggestions(json, ws, taken); });
      };
      if (!oc) return viaApi();
      // CC-2: on 🤖 the 2 ideas are written by Orchestrator CC and saved as
      // 'suggested' rows when they come back (shown next time this opens).
      return oc.logic.queue({ type: 'xp_week_challenges', key: ws, prompt: prompt, tier: 'ground_worker_json', maxTokens: 400, context: { ws: ws } })
        .then(function(q) { if (!q) return viaApi(); var none = []; none.ccQueued = true; return none; });
    },
    saveOracleSuggestions: function(json, ws, taken) {
      var L = RPGACE.modules.xpSeason.logic, picks = L.parseOracleSuggestions(json, taken);
      return Promise.all(picks.map(function(c) {
        return RPGACE.sb.secureWrite('xp_challenges', 'insert', L.challengeRow(c, ws, 'suggested')).then(function(d) {
          var row = Array.isArray(d) ? d[0] : d; c.id = row && row.id; return c;
        });
      }));
    },
    // CC-2: Orchestrator CC's ideas for a week - only while that week is
    // current and no Oracle ideas were saved for it yet.
    ccApplyChallenges: function(json, row) {
      var L = RPGACE.modules.xpSeason.logic, ws = (row.context || {}).ws;
      if (!ws || ws !== L.weekStart(L.today())) return Promise.resolve([]);
      return L.loadTrophies(true).then(function(T) {
        var existing = L.weekChallenges(T, ws), taken = {};
        if (existing.some(function(c) { return c.source === 'oracle'; })) return [];
        existing.forEach(function(c) { if (c.status === 'active' || c.status === 'done') taken[c.measure === 'xp' ? 'xp:' + c.realm : (c.metric_actions || [])[0]] = 1; });
        return L.saveOracleSuggestions(json, ws, taken);
      }).then(function(d) { L.clear(); return d; });
    },
    challengeRow: function(c, ws, status) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      // A null metric means "ticked by hand". Realm-XP challenges carry the
      // marker 'realm_xp' (the DB sums that realm's XP for measure 'xp').
      var metric = c.manual ? null : c.measure === 'xp' ? ['realm_xp'] : (c.metric_actions || null);
      return { kind: 'weekly', period_start: ws, period_end: L.addDays(ws, 6), title: c.title, realm: c.realm,
        metric_actions: metric, measure: c.measure || 'count', target: c.target || 1, xp: S.CHALLENGE_XP,
        source: c.source, status: status || 'active' };
    },
    startChallenges: function(picks, ws) {
      var L = RPGACE.modules.xpSeason.logic;
      return Promise.all(picks.map(function(c) {
        if (c.id) return RPGACE.sb.secureWrite('xp_challenges', 'update', { status: 'active' }, 'id=eq.' + c.id + '&status=eq.suggested');
        return RPGACE.sb.secureWrite('xp_challenges', 'insert', L.challengeRow(c, ws, 'active'));
      })).then(function(d) { L.clear(); return d; });
    },
    tickChallenge: function(id) {
      return RPGACE.sb.secureWrite('xp_challenges', 'update', { status: 'done' }, 'id=eq.' + id + '&status=eq.active&metric_actions=is.null')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    addResolution: function(r, todayIso) {
      var S = RPGACE.modules.xpSeason, L = S.logic, se = L.ukSeason(todayIso || L.today()), item = r.key ? L.menuItem(r.key) : null;
      var row = { kind: 'resolution', period_start: se.start, period_end: se.end, title: r.title, realm: r.realm || (item && item.realm) || 'life',
        metric_actions: item ? (item.action ? [item.action] : ['realm_xp']) : null, measure: item && item.measure === 'xp' ? 'xp' : 'count',
        target: item ? Math.max(1, Math.round(r.target || 1)) : 1, xp: S.RESOLUTION_XP[r.size] || 1000, size: r.size || 'medium', source: 'alex', status: 'active' };
      return RPGACE.sb.secureWrite('xp_challenges', 'insert', row).then(function(d) { L.clear(); return d; });
    },
    // Each gate's chain: steps done (from xp_challenges) and the next step.
    questChains: function(T) {
      var p = (T.settings && T.settings.progress) || {}, done = {}, chains = {}, order = [];
      (T.challenges || []).forEach(function(c) { if (c.kind === 'realm_quest' && c.step_key) done[c.step_key] = c; });
      (T.questSteps || []).forEach(function(s) {
        if (s.status === 'proposed') return; // RC-4: ideas waiting for Alex aren't on the ladder yet
        if (!chains[s.gate]) { chains[s.gate] = { gate: s.gate, realm: s.realm, steps: [] }; order.push(s.gate); }
        chains[s.gate].steps.push({ key: s.key, label: s.label, target: s.target, now: s.manual ? (s.status === 'done' ? 1 : 0) : Number(p[s.progress_key]) || 0, done: s.status === 'done' || !!done[s.key] || (!s.manual && (Number(p[s.progress_key]) || 0) >= s.target) });
      });
      return order.map(function(g) {
        var c = chains[g]; c.doneCount = c.steps.filter(function(x) { return x.done; }).length;
        c.next = c.steps.filter(function(x) { return !x.done; })[0] || null; return c;
      });
    },
    // ── RC-4 (Oct 15 2026): knowledge milestones ─────────────────────
    // Each realm has an open-ended knowledge path (gate '<realm>_path',
    // xp_quest_steps source 'knowledge'), tiers of 3 steps, one live step
    // at a time. Oracle proposes 3, Alex approves one. Counted steps finish
    // via xp_quest_check; hand-ticked ones need a line + proof by kind
    // (DB trigger xp_milestone_guard checks it, xp_milestone_after pays
    // xp_milestone_xp = 10/20/35% of the realm's rank gap, min 25, and
    // unlocks '<Realm> Practitioner/Adept/Expert/Master' per 3 done).
    MS_PROOF: {
      // BT-4 (Oct 16 2026): a finished beat logged in Beat Log (was the retired beat_audio_jobs uploads).
      // SH-5 (Oct 17 2026): Alex exports the stems + full beat zips himself - the Producer proof is a finished beat with its zip folder saved.
      beat: { icon: '🎵', label: 'a finished beat with its zip folder saved (Beat Log)', table: 'content_productions', select: 'select=id,con_id,title,finished_at&content_type=eq.music_video&finished_at=not.is.null&stems_folder=not.is.null&order=finished_at.desc&limit=20', name: function(r) { return (r.con_id ? '#' + r.con_id + ' ' : '') + (r.title || 'beat'); } },
      // SH-5 (Oct 17 2026): the Hustler proof is a logged sale (Alex: "the sale is hustler milestone"); zips are Producer's.
      sale: { icon: '💰', label: 'a logged sale', table: 'chronicles_finance', select: 'select=id,item,amount,entry_date&type=eq.sale&order=created_at.desc&limit=20', name: function(r) { return 'Sale: ' + (r.item || '') + (r.amount != null ? ' £' + r.amount : ''); } },
      cook_photo: { icon: '🍳', label: 'a finished cook + a photo of the dish', table: 'planned_cooks', select: 'select=id,scheduled_at,created_at&status=eq.cooked&order=created_at.desc&limit=20', name: function(r) { return 'Cook ' + String(r.scheduled_at || r.created_at || '').slice(0, 10); }, photo: 'required' },
      // PC-6 (Oct 17 2026): a posted post (Posting) is the Creator proof.
      video: { icon: '🎬', label: 'a posted post', table: 'posts', private: true, select: 'select=id,title,posted_at&stage=eq.posted&order=posted_at.desc&limit=20', name: function(r) { return r.title || ''; } },
      gym: { icon: '🏋️', label: 'a logged gym session', table: 'gym_sessions', select: 'select=id,performed_on,duration_min&order=performed_on.desc&limit=20', name: function(r) { return 'Gym ' + r.performed_on + (r.duration_min ? ' · ' + r.duration_min + ' min' : ''); } },
      reading: { icon: '📖', label: 'a book you read', table: 'bookworm_books', select: 'select=id,title,status&order=created_at.desc&limit=20', name: function(r) { return r.title; } },
      trip: { icon: '🧳', label: 'a trip or plan', table: 'plans', private: true, select: 'select=id,title,status&order=updated_at.desc&limit=20', name: function(r) { return r.title; } },
      outreach: { icon: '🤝', label: 'an outreach entry', table: 'outreach_log', private: true, select: 'select=id,who,kind,done_on&order=created_at.desc&limit=20', name: function(r) { return (r.who || '') + ' · ' + (r.kind || '') + ' · ' + (r.done_on || ''); } },
      money: { icon: '💷', label: 'a money entry', table: 'chronicles_finance', select: 'select=id,item,amount,type,entry_date&order=created_at.desc&limit=20', name: function(r) { return (r.type || '') + ': ' + (r.item || '') + (r.amount != null ? ' £' + r.amount : ''); } },
      photo_or_line: { icon: '📝', label: 'the line (a photo is optional)', photo: 'optional' },
    },
    // Alex's Oct 15 map: each realm's default proof.
    MS_REALM_PROOF: { producer: 'beat', hustler: 'sale', chef: 'cook_photo', creator: 'video', athlete: 'gym', scholar: 'reading', explorer: 'trip', connector: 'outreach', steward: 'money', homekeeper: 'photo_or_line', life: 'photo_or_line', mind: 'photo_or_line', builder: 'photo_or_line' },
    // Counters the app already keeps (xp_settings.progress) per realm.
    MS_COUNTERS: { chef: ['cooks', 'cook_recipes', 'cuisines'], athlete: ['gym_run'], mind: ['sleep_days'], scholar: ['phyla', 'jargon_reviewed'], producer: ['released_season'], creator: ['video_run'], hustler: ['sales', 'season_revenue'], explorer: ['countries'], connector: ['people_tracked'], life: ['path_run'] },
    MS_SIZE_PCT: { s: 0.10, m: 0.20, l: 0.35 },
    msSteps: function(T, realm) {
      return ((T && T.questSteps) || []).filter(function(s) { return s.source === 'knowledge' && s.realm === realm; });
    },
    msState: function(T, realm) {
      var steps = RPGACE.modules.xpSeason.logic.msSteps(T, realm);
      var done = steps.filter(function(s) { return s.status === 'done'; });
      done.sort(function(a, b) { return String(a.done_at || '').localeCompare(String(b.done_at || '')); });
      var n = done.length + 1;
      return {
        live: steps.filter(function(s) { return s.status === 'approved'; })[0] || null,
        proposed: steps.filter(function(s) { return s.status === 'proposed'; }),
        done: done, next: n, tier: Math.ceil(n / 3), inTier: ((n - 1) % 3) + 1,
        last: done[done.length - 1] || null,
      };
    },
    msTitle: function(realm, tier) {
      var S = RPGACE.modules.xpSeason, R = S.REALMS[realm];
      var t = ['Practitioner', 'Adept', 'Expert', 'Master'][tier - 1] || ('Master ' + (tier - 3));
      return (R ? R.name : realm) + ' ' + t;
    },
    // Same maths as DB xp_milestone_xp (an estimate here; the DB pays).
    msXp: function(T, realmXp, realm, size) {
      var lad = ((T && T.ladders) || {})[realm] || [], xp = Number(realmXp) || 0, cur = -1;
      lad.forEach(function(l, i) { if (Number(l.min_xp) <= xp) cur = i; });
      if (cur < 0) return 25;
      var gap = lad[cur + 1] ? lad[cur + 1].min_xp - lad[cur].min_xp : (lad[cur - 1] ? lad[cur].min_xp - lad[cur - 1].min_xp : 200);
      var pct = RPGACE.modules.xpSeason.logic.MS_SIZE_PCT[size] || 0.20;
      return Math.max(25, Math.round(gap * pct / 5) * 5);
    },
    msRankName: function(T, realmXp, realm) {
      var lad = ((T && T.ladders) || {})[realm] || [], name = '';
      lad.forEach(function(l) { if (Number(l.min_xp) <= (Number(realmXp) || 0)) name = l.name; });
      return name || 'starting out';
    },
    // Parse Oracle's one-line reply: label ~ why ~ size ~ count:key:target|hand ~ proof:kind, ' | ' between.
    msParse: function(txt, realm, progress) {
      var L = RPGACE.modules.xpSeason.logic, counters = L.MS_COUNTERS[realm] || [];
      txt = String(txt || '').replace(/^\s*✦\s*Oracle\s*/, '').trim();
      return txt.split(/\s*\|\s*|\n+/).map(function(part) {
        var b = part.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').split(/\s*~\s*/);
        var label = (b[0] || '').trim();
        if (label.length < 4 || !(b[1] || '').trim()) return null;
        var size = String(b[2] || '').trim().toLowerCase().charAt(0);
        if (!L.MS_SIZE_PCT[size]) size = 'm';
        var cm = /count\s*:\s*([a-z_]+)\s*:\s*(\d+)/i.exec(b[3] || ''), counter = null, target = 1;
        if (cm && counters.indexOf(cm[1]) !== -1 && Number(cm[2]) > (Number((progress || {})[cm[1]]) || 0)) { counter = cm[1]; target = Number(cm[2]); }
        var pk = /proof\s*:\s*([a-z_]+)/i.exec(b[4] || '');
        var proof = pk && L.MS_PROOF[pk[1]] ? pk[1] : (L.MS_REALM_PROOF[realm] || 'photo_or_line');
        return { label: label.slice(0, 140), why: b[1].trim().slice(0, 300), size: size, counter: counter, target: target, proof_kind: proof };
      }).filter(Boolean).slice(0, 3);
    },
    // One Oracle call -> up to 3 proposed rows. No call when the realm knows nothing.
    msPropose: function(realm, opts) {
      var S = RPGACE.modules.xpSeason, L = S.logic, R = S.REALMS[realm];
      opts = opts || {};
      if (!R) return Promise.reject(new Error('Unknown realm'));
      return Promise.all([L.loadTrophies(true), L.load(), RPGACE.realmKnowledgeFor(realm)]).then(function(res) {
        var T = res[0], sum = L.summary(res[1] || []), k = res[2];
        if (!k.terms.length && !k.items.length) {
          var e = new Error('Your ' + R.name + ' realm knows nothing yet - accept jargon or add Library items for it first');
          e.empty = true; throw e;
        }
        var st = L.msState(T, realm), prog = (T.settings && T.settings.progress) || {};
        var rejected = (L.msSteps(T, realm).filter(function(s) { return s.status === 'rejected' || s.status === 'dropped'; })).map(function(s) { return s.label; });
        var counters = (L.MS_COUNTERS[realm] || []).map(function(c) { return c + '=' + (Number(prog[c]) || 0); });
        var prompt = 'Propose 3 different next milestones for my ' + R.name + ' knowledge path. Step ' + st.inTier + ' of 3 towards "' + L.msTitle(realm, st.tier) + '". My ' + R.name + ' rank: ' + L.msRankName(T, sum.realms[realm], realm) + '.\n' +
          (opts.smaller ? 'Make each one a smaller, easier version of: "' + opts.smaller + '" (I did not get to it).\n' : '') +
          'Last milestone done: ' + (st.last ? st.last.label : 'none yet') + '.\n' +
          (k.terms.length ? 'Terms I know: ' + k.terms.join(', ') + '\n' : '') +
          (k.items.length ? 'Things I have read or watched: ' + k.items.join('; ') + '\n' : '') +
          (rejected.length ? 'Do not repeat these: ' + rejected.slice(-10).join('; ') + '\n' : '') +
          'Each milestone is a goal over several sittings that puts what I know into practice, just past where I am now - a stretch, never a leap.\n' +
          (counters.length ? 'If one of these app counters fits, you may use it (target must be higher than now): ' + counters.join(', ') + '\n' : '') +
          'Reply on ONE line only, the 3 milestones separated by " | ", each as: milestone ~ why (one sentence naming the term or item it builds on) ~ size s, m or l ~ count:<counter>:<target> or hand ~ proof:<kind>. Proof kinds: ' + Object.keys(L.MS_PROOF).join(', ') + ' (for ' + R.name + ' usually ' + (L.MS_REALM_PROOF[realm] || 'photo_or_line') + '). No numbering, no other text.';
        return RPGACE.modules.phylumPath._callGroundWorkerText(prompt, 600).then(function(txt) {
          var list = L.msParse(txt, realm, prog);
          if (!list.length) throw new Error('Oracle did not send usable milestones back - try again');
          var base = Date.now().toString(36), sort = 5000 + st.next * 10;
          var rows = list.map(function(m, i) {
            return { key: realm + '_path_' + base + '_' + i, gate: realm + '_path', realm: realm, label: m.label, why: m.why,
              progress_key: m.counter || 'manual', target: m.counter ? m.target : 1, step: st.next, sort: sort + i,
              status: 'proposed', source: 'knowledge', manual: !m.counter, size: m.size, proof_kind: m.counter ? null : m.proof_kind, tier: st.tier };
          });
          return RPGACE.sb.secureWrite('xp_quest_steps', 'insert', rows).then(function() {
            S._tcache = null; return rows;
          });
        });
      });
    },
    msApprove: function(row, edits) {
      var S = RPGACE.modules.xpSeason, patch = { status: 'approved' };
      ['label', 'size', 'proof_kind'].forEach(function(k) { if (edits && edits[k] != null && edits[k] !== '') patch[k] = edits[k]; });
      if (!row.manual) delete patch.proof_kind;
      return RPGACE.sb.secureWrite('xp_quest_steps', 'update', patch, 'key=eq.' + encodeURIComponent(row.key) + '&status=eq.proposed').then(function() {
        // One at a time: the other ideas for this realm are set aside (and not proposed again).
        return RPGACE.sb.secureWrite('xp_quest_steps', 'update', { status: 'rejected' }, 'gate=eq.' + encodeURIComponent(row.gate) + '&source=eq.knowledge&status=eq.proposed');
      }).then(function() { S._tcache = null; });
    },
    msSetStatus: function(row, status, from) {
      var S = RPGACE.modules.xpSeason;
      return RPGACE.sb.secureWrite('xp_quest_steps', 'update', { status: status }, 'key=eq.' + encodeURIComponent(row.key) + '&status=eq.' + (from || row.status))
        .then(function() { S._tcache = null; });
    },
    msTouch: function(row) {
      var S = RPGACE.modules.xpSeason;
      return RPGACE.sb.secureWrite('xp_quest_steps', 'update', { last_touched: new Date().toISOString() }, 'key=eq.' + encodeURIComponent(row.key))
        .then(function() { S._tcache = null; });
    },
    // Hand tick: the step first (the DB checks the proof), then the Journal line.
    msDone: function(row, proof) {
      var S = RPGACE.modules.xpSeason, R = S.REALMS[row.realm];
      return RPGACE.sb.secureWrite('xp_quest_steps', 'update', { status: 'done', proof: proof }, 'key=eq.' + encodeURIComponent(row.key) + '&status=eq.approved').then(function() {
        S._tcache = null;
        var d = new Date();
        return RPGACE.sb.secureWrite('journal', 'insert', {
          title: '🏔️ Milestone: ' + row.label, content: proof.line + (proof.link_label ? '\nProof: ' + proof.link_label : '') + (proof.photo ? '\nPhoto saved.' : ''),
          source: 'milestone', entry_type: 'milestone', date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        }).catch(function(e) { RPGACE.utils.toast('Milestone saved, but the Journal line failed: ' + e.message, '#CC4A4A', 5000, 'xpSeason'); });
      });
    },
    // Live hand-ticked milestones untouched for 28+ days (for the Sunday review).
    msStale: function(T, nowMs) {
      var cut = (nowMs || Date.now()) - 28 * 86400000;
      return ((T && T.questSteps) || []).filter(function(s) {
        if (s.source !== 'knowledge' || s.status !== 'approved' || !s.manual) return false;
        var t = Date.parse(s.last_touched || s.approved_at || s.created_at || '');
        return !isNaN(t) && t < cut;
      });
    },
    // Proof candidates for a kind -> [{table, id, name}].
    msProofOptions: function(kind) {
      var P = RPGACE.modules.xpSeason.logic.MS_PROOF[kind];
      if (!P || !P.table) return Promise.resolve([]);
      var rd = function(src) {
        var q = src.private ? RPGACE.modules.tripPlans.logic.read(src.table, src.select) : RPGACE.sb.select(src.table, src.select);
        return q.then(function(rows) { return (rows || []).map(function(r) { return { table: src.table, id: String(r.id), name: src.name(r) }; }); })
          .catch(function() { return []; });
      };
      return Promise.all([rd(P), P.also ? rd(P.also) : Promise.resolve([])]).then(function(r) { return r[0].concat(r[1]); });
    },
    // ── XP-4: the was-this-done question + saved reports ─────────────
    pending: function(events) { return (events || []).filter(function(e) { return e.status === 'pending_confirm'; }); },
    // Yes keeps the XP (active), No removes it. Only touches a row that is
    // still pending, so a late tap after the week closed changes nothing.
    answerPending: function(id, done) {
      return RPGACE.sb.secureWrite('xp_events', 'update', { status: done ? 'active' : 'removed' }, 'id=eq.' + id + '&status=eq.pending_confirm')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    // Monday after this week: when the first weekly report is saved.
    nextWeekClose: function(todayIso) {
      var L = RPGACE.modules.xpSeason.logic; return L.addDays(L.weekStart(todayIso || L.today()), 7);
    },
    REPORT_ICON: { week: '📅', month: '🗓️', year: '🎆' },
    reportIcon: function(r) {
      if (r.kind !== 'season') return RPGACE.modules.xpSeason.logic.REPORT_ICON[r.kind] || '📅';
      var m = Number(String(r.period_start).slice(5, 7));
      return m === 3 ? '🌱' : m === 6 ? '☀️' : m === 9 ? '🍂' : '❄️';
    },
    // [label, html] rows for one saved report; shared by the Year page's
    // report popup and the Chronicles detail popup (one renderer).
    reportRows: function(r) {
      var S = RPGACE.modules.xpSeason, L = S.logic, esc = S.ui._esc, d = r.data || {};
      var realms = Object.keys(d.realms || {}).sort(function(x, y) { return d.realms[y] - d.realms[x]; })
        .map(function(k) { var mt = S.REALMS[k] || { icon: '', name: k }; return mt.icon + ' ' + esc(mt.name) + ' ' + d.realms[k]; }).join(' · ');
      var lv = L.levelFor(d.year_xp_to_date || 0), sky = L.skyFor(d.year_xp_to_date || 0);
      var rows = [
        ['XP', '<b>' + (d.xp || 0) + '</b> from ' + (d.events || 0) + ' thing' + (d.events === 1 ? '' : 's') + ' · ' + (d.realms_touched || 0) + ' of 13 realms'],
        ['By realm', realms || '—'],
        ['Best day', d.best_day ? esc(String(d.best_day.day)) + ' (' + d.best_day.xp + ' XP)' : '—'],
        ['Top actions', (d.top_actions || []).map(function(t) { return esc(L.label(t.action)) + ' ' + t.xp + (t.n > 1 ? ' (×' + t.n + ')' : ''); }).join(' · ') || '—'],
      ];
      // RI-10: what was taken in and done per realm (reports frozen from Oct 15 2026 on).
      var perRealm = function(o) { return Object.keys(o || {}).sort(function(x, y) { return o[y] - o[x]; }).map(function(k) { var mt = S.REALMS[k] || { icon: '', name: k }; return mt.icon + ' ' + esc(mt.name) + ' ' + o[k]; }).join(' · '); };
      if (d.inputs && Object.keys(d.inputs).length) rows.push(['Taken in', perRealm(d.inputs)]);
      if (d.quests && Object.keys(d.quests).length) rows.push(['Quests done', perRealm(d.quests)]);
      if (d.balance_bonus) rows.push(['Balance bonus', '+' + d.balance_bonus]);
      if ((d.challenges || []).length) rows.push(['Challenges', d.challenges.map(function(c) { return (c.status === 'done' ? '✅ ' : '❌ ') + esc(c.title); }).join(' · ')]);
      if ((d.unlocks || []).length) rows.push(['Unlocked', d.unlocks.map(function(u) { return esc(u.name); }).join(' · ')]);
      rows.push(['Year so far', esc(L.seasonName(Number(d.year) || 0)) + ': ' + (d.year_xp_to_date || 0) + ' XP · level ' + lv.level + ' · ' + esc(sky.rank) + ' ' + S.ui.stars(sky.stars)]);
      rows.push(['Saved', 'Frozen snapshot of ' + esc(String(r.period_start)) + ' to ' + esc(String(r.period_end)) + '; later deletes never change it.']);
      return rows;
    },
    label: function(action) {
      var L = { beat_logged: 'Beat logged', beat_finished: 'Beat finished', beat_released: 'Beat released', treatment_done: 'Visual treatment', video_posted: 'Video posted',
        sale: 'Sale', cook_finished: 'Cook finished', recipe_saved: 'Recipe saved', gym_session: 'Gym session', chapter_done: 'Chapter analysed', book_finished: 'Book finished',
        jargon_reviewed: 'Jargon reviewed', library_added: 'Library item added', journal_entry: 'Journal entry', quest_done: 'Quest done', routine_tick: 'Routine done',
        expense_logged: 'Expense logged', plan_made: 'Plan made', trip_done: 'Trip done', caught_up: 'Caught up', hand_test: 'Hand-tested a feature', flag: 'Flag to Claude Code', gym_pb: 'Personal best', balance_bonus: 'Balance bonus',
        challenge_done: 'Weekly challenge', resolution_kept: 'Resolution kept', realm_quest_step: 'Realm quest step',
        outreach_sent: 'Outreach sent', collab_done: 'Collab done', cooloff_waited: 'Bought after the wait', budget_week: 'Budget kept this week' };
      return L[action] || action;
    },
    // ── XP-8: Year Wrapped + Hall of Seasons ─────────────────────────
    // One shape for both a closed year (from its frozen xp_reports row) and
    // the year so far (live from the ledger), so the cards render the same.
    yearRange: function(season) {
      return season === 0 ? { start: '2026-01-01', end: '2026-12-31' } : { start: season + '-01-01', end: season + '-12-31' };
    },
    wrappedFromReport: function(r) {
      var L = RPGACE.modules.xpSeason.logic, d = r.data || {}, xp = Number(d.xp) || 0;
      return { live: false, reportId: r.id, label: r.label, xp: xp, level: L.levelFor(xp), sky: L.skyFor(xp), realms: d.realms || {},
        bestDay: d.best_day || null, bestWeek: d.best_week || null, topActions: d.top_actions || [], unlocks: d.unlocks || [],
        challenges: d.challenges || [], treats: d.treats || [], outreach: d.outreach == null ? null : Number(d.outreach), text: r.wrapped_text || null,
        inputs: d.inputs || null, quests: d.quests || null };
    },
    wrappedLive: function(events, T, todayIso) {
      var S = RPGACE.modules.xpSeason, L = S.logic, today = todayIso || L.today(), season = L.seasonOf(today), rg = L.yearRange(season);
      var ev = (events || []).filter(function(e) { return Number(e.season) === season && e.status !== 'removed'; });
      var xp = 0, realms = {}, days = {}, weeks = {}, acts = {};
      ev.forEach(function(e) {
        var x = Number(e.xp) || 0; xp += x;
        if (x > 0) realms[e.realm] = (realms[e.realm] || 0) + x;
        days[e.earned_on] = (days[e.earned_on] || 0) + x;
        var w = L.weekStart(e.earned_on); weeks[w] = (weeks[w] || 0) + x;
        var a = (acts[e.action] = acts[e.action] || { action: e.action, xp: 0, n: 0 }); a.xp += x; a.n++;
      });
      var best = function(o) { var k = null; Object.keys(o).sort().forEach(function(x) { if (k === null || o[x] > o[k]) k = x; }); return k; };
      var bd = best(days), bw = best(weeks);
      var inYear = function(iso) { var s = String(iso || '').slice(0, 10); return s >= rg.start && s <= rg.end; };
      var ch = ((T && T.challenges) || []).filter(function(c) {
        if (c.status !== 'done' && c.status !== 'missed') return false;
        return c.kind === 'realm_quest' ? inYear(c.done_at) : inYear(c.period_end);
      }).map(function(c) { return { kind: c.kind, title: c.title, status: c.status, xp: c.xp }; });
      return { live: true, reportId: null, label: L.seasonName(season) + ' so far', xp: xp, level: L.levelFor(xp), sky: L.skyFor(xp), realms: realms,
        bestDay: bd ? { day: bd, xp: days[bd] } : null, bestWeek: bw ? { start: bw, xp: weeks[bw] } : null,
        topActions: Object.keys(acts).map(function(k) { return acts[k]; }).sort(function(a, b) { return b.xp - a.xp; }).slice(0, 5),
        unlocks: ((T && T.unlocks) || []).filter(function(u) { return inYear(u.unlocked_at); }).map(function(u) { return { kind: u.kind, name: u.name, realm: u.realm, at: u.unlocked_at }; }),
        challenges: ch, treats: ((T && T.treats) || []).filter(function(t) { return t.status === 'earned' && inYear(t.earned_at); }).map(function(t) { return { title: t.title, at: t.earned_at }; }),
        outreach: null, text: null };
    },
    // The swipe cards; any card with nothing real to show is left out.
    wrappedCards: function(w) {
      var S = RPGACE.modules.xpSeason, L = S.logic, cards = [], fmt = function(n) { return Number(n || 0).toLocaleString('en-GB'); };
      var day = function(iso) { return iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; };
      cards.push({ key: 'intro', icon: '🎆', title: w.label, big: fmt(w.xp) + ' XP', lines: ['Level ' + w.level.level, w.sky.rank + ' ' + '★★★★★'.slice(0, w.sky.stars)] });
      var top = Object.keys(w.realms || {}).sort(function(a, b) { return w.realms[b] - w.realms[a]; }).slice(0, 3);
      if (top.length) {
        var m0 = S.REALMS[top[0]] || { icon: '', name: top[0] };
        cards.push({ key: 'realms', icon: '🌌', title: 'Where it went', big: m0.icon + ' ' + m0.name, lines: top.map(function(r) { var m = S.REALMS[r] || { icon: '', name: r }; return m.icon + ' ' + m.name + ' — ' + fmt(w.realms[r]) + ' XP'; }) });
      }
      // RI-10: what you took in and did per realm, and the quietest realm.
      var tin = w.inputs || {}, tq = w.quests || {}, nIn = 0, nQ = 0;
      Object.keys(tin).forEach(function(k) { nIn += tin[k]; }); Object.keys(tq).forEach(function(k) { nQ += tq[k]; });
      if (nIn || nQ) {
        var both = {}; Object.keys(tin).concat(Object.keys(tq)).forEach(function(k) { both[k] = (tin[k] || 0) + (tq[k] || 0); });
        var quiet = S.ORDER.filter(function(r) { return !(w.realms || {})[r] && !both[r]; });
        cards.push({ key: 'taken', icon: '📚', title: 'What you took in', big: nIn + ' input' + (nIn === 1 ? '' : 's') + ' · ' + nQ + ' quest' + (nQ === 1 ? '' : 's'),
          lines: Object.keys(both).sort(function(a, b) { return both[b] - both[a]; }).slice(0, 3).map(function(r) { var m = S.REALMS[r] || { icon: '', name: r }; return m.icon + ' ' + m.name + ' — ' + (tin[r] || 0) + ' in, ' + (tq[r] || 0) + ' done'; })
            .concat(quiet.length ? ['Quietest: ' + quiet.slice(0, 3).map(function(r) { return (S.REALMS[r] || { name: r }).name; }).join(', ')] : []) });
      }
      if (w.bestDay && w.bestDay.xp > 0) cards.push({ key: 'best', icon: '📈', title: 'Your best', big: fmt(w.bestDay.xp) + ' XP on ' + day(w.bestDay.day),
        lines: w.bestWeek ? ['Best week: from ' + day(w.bestWeek.start) + ' (' + fmt(w.bestWeek.xp) + ' XP)'] : [] });
      var acts = (w.topActions || []).filter(function(a) { return a.action !== 'balance_bonus' && a.n > 0; });
      if (acts.length) cards.push({ key: 'done', icon: '🔁', title: 'Most done', big: L.label(acts[0].action) + ' ×' + acts[0].n,
        lines: acts.slice(1, 4).map(function(a) { return L.label(a.action) + ' ×' + a.n; }) });
      var un = w.unlocks || [], of = function(k) { return un.filter(function(u) { return u.kind === k; }); };
      var named = of('title').concat(of('badge'), of('gate'));
      if (un.length) cards.push({ key: 'unlocks', icon: '🏆', title: 'Unlocked', big: named.length ? named.length + ' title' + (named.length === 1 ? '' : 's') + ' & badges' : of('rank').length + ' rank-ups',
        lines: named.slice(0, 5).map(function(u) { return u.name; }).concat([of('rank').length + ' rank-ups · ' + of('level').length + ' level-ups']) });
      var ch = w.challenges || [], kept = ch.filter(function(c) { return c.kind === 'resolution' && c.status === 'done'; });
      if (ch.length) cards.push({ key: 'goals', icon: '🎯', title: 'Goals', big: kept.length + ' resolution' + (kept.length === 1 ? '' : 's') + ' kept',
        lines: kept.slice(0, 3).map(function(c) { return '✅ ' + c.title; }).concat([
          ch.filter(function(c) { return c.kind === 'weekly' && c.status === 'done'; }).length + ' weekly challenges done · ' + ch.filter(function(c) { return c.kind === 'realm_quest'; }).length + ' quest steps',
          ch.filter(function(c) { return c.status === 'missed'; }).length + ' missed — the next year starts fresh']) });
      if ((w.treats || []).length) cards.push({ key: 'treats', icon: '🎁', title: 'Treats earned', big: w.treats.length + ' treat' + (w.treats.length === 1 ? '' : 's'), lines: w.treats.slice(0, 5).map(function(t) { return t.title; }) });
      if (w.outreach > 0) cards.push({ key: 'outreach', icon: '📤', title: 'Reaching out', big: w.outreach + ' messages & collabs', lines: [] });
      cards.push({ key: 'summary', icon: '✨', title: 'The year in a paragraph', big: '', lines: [], text: w.text,
        note: w.live ? 'Your paragraph is written once, when the year closes on 31 December.' : null });
      return cards;
    },
    // Numbers only go to Oracle - the year's totals, never personal notes.
    wrappedPrompt: function(w) {
      var S = RPGACE.modules.xpSeason, L = S.logic, top = Object.keys(w.realms || {}).sort(function(a, b) { return w.realms[b] - w.realms[a]; }).slice(0, 4);
      var ch = w.challenges || [], un = w.unlocks || [];
      return 'Write a short, warm year-in-review paragraph (60-90 words, UK English, second person, no lists, no emojis) for a music producer\'s personal XP year. Use only these facts and invent nothing:\n' +
        'Year: ' + w.label + '. Total ' + w.xp + ' XP, level ' + w.level.level + ', sky rank ' + w.sky.rank + '.\n' +
        'Top realms: ' + top.map(function(r) { return (S.REALMS[r] ? S.REALMS[r].name : r) + ' ' + w.realms[r] + ' XP'; }).join(', ') + '.\n' +
        'Most done: ' + (w.topActions || []).slice(0, 3).map(function(a) { return L.label(a.action) + ' x' + a.n; }).join(', ') + '.\n' +
        'Resolutions kept: ' + ch.filter(function(c) { return c.kind === 'resolution' && c.status === 'done'; }).length + ', missed: ' + ch.filter(function(c) { return c.kind === 'resolution' && c.status === 'missed'; }).length + '. ' +
        'Titles and badges: ' + un.filter(function(u) { return u.kind === 'title' || u.kind === 'badge' || u.kind === 'gate'; }).map(function(u) { return u.name; }).join(', ') + '. ' +
        'Treats earned: ' + (w.treats || []).length + '.\n' +
        'Return JSON only: {"paragraph": "..."}';
    },
    parseWrappedText: function(j) {
      var t = j && typeof j.paragraph === 'string' ? j.paragraph.replace(/\s+/g, ' ').trim() : '';
      return t.length >= 20 ? t.slice(0, 700) : null;
    },
    // One Oracle call per closed year, saved so it is never paid for twice.
    ensureWrappedText: function(w) {
      var L = RPGACE.modules.xpSeason.logic;
      if (w.live || w.text || !w.reportId) return Promise.resolve(w.text || null);
      var pp = RPGACE.modules.phylumPath, oc = RPGACE.modules.orchestratorCC, prompt = L.wrappedPrompt(w);
      var viaApi = function() {
        if (!pp || !pp.logic || !pp.logic._callGroundWorkerJSON) return Promise.resolve(null);
        return pp.logic._callGroundWorkerJSON(prompt, 400).then(function(j) {
          return L.saveWrappedText(j, w.reportId).then(function(t) { if (t) w.text = t; return t; });
        });
      };
      // CC-2: on 🤖 Orchestrator CC writes the paragraph; it's saved when it
      // comes back and shows next time Wrapped opens.
      var go = oc ? oc.logic.queue({ type: 'xp_wrapped', key: w.reportId, prompt: prompt, tier: 'ground_worker_json', maxTokens: 400, context: { reportId: w.reportId } })
        .then(function(q) { if (q) { w.ccQueued = true; return null; } return viaApi(); }) : viaApi();
      return go.catch(function() { return null; });
    },
    saveWrappedText: function(j, reportId) {
      var L = RPGACE.modules.xpSeason.logic, t = L.parseWrappedText(j);
      if (!t || !reportId) return Promise.resolve(null);
      return RPGACE.sb.secureWrite('xp_reports', 'update', { wrapped_text: t }, 'id=eq.' + reportId + '&wrapped_text=is.null')
        .then(function() { L.clear(); return t; }, function() { return t; });
    },
    markWrappedSeen: function(id) {
      return RPGACE.sb.secureWrite('xp_reports', 'update', { wrapped_seen_at: new Date().toISOString() }, 'id=eq.' + id + '&wrapped_seen_at=is.null')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    // Due items around the 1 January switch-over.
    yearDue: function(todayIso) {
      var L = RPGACE.modules.xpSeason.logic, tp = RPGACE.modules.tripPlans, today = todayIso || L.today();
      if (!tp || !tp.logic.signedIn()) return Promise.resolve([]);
      var se = L.ukSeason(today), y = Number(today.slice(0, 4));
      return Promise.all([
        tp.logic.read('xp_reports', 'select=id,label,period_end,wrapped_seen_at&kind=eq.year&order=period_end.desc&limit=3'),
        tp.logic.read('xp_challenges', 'select=id&kind=eq.resolution&period_start=eq.' + se.start)
      ]).then(function(r) {
        var reps = r[0] || [], out = [];
        reps.filter(function(x) { return !x.wrapped_seen_at; }).forEach(function(x) { out.push({ kind: 'wrapped', id: x.id, icon: '🎆', text: 'Your ' + x.label + ' Wrapped is ready', sub: 'Swipe through your year' }); });
        var md = today.slice(5);
        if (md <= '01-14' && !(r[1] || []).length) out.push({ kind: 'resolutions', icon: '🎯', text: 'Set your ' + se.label + ' resolutions', sub: 'A new year has started — pick 1 to 5 long goals' });
        if (y >= 2027 && md >= '01-02' && !reps.some(function(x) { return x.period_end === (y - 1) + '-12-31'; }))
          out.push({ kind: 'missing', icon: '⚠️', text: 'Last year\'s report didn\'t save', sub: 'Ask Claude Code to check the year close (xp-close-periods)' });
        return out;
      }).catch(function() { return []; });
    },
    hallRows: function(T, sum) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      var topOf = function(realms) { var k = null; Object.keys(realms || {}).forEach(function(r) { if (!k || realms[r] > realms[k]) k = r; }); return k; };
      var rows = [{ live: true, label: L.seasonName(sum.season) + ' (so far)', xp: sum.total, level: sum.level.level, sky: sum.sky, top: topOf(sum.realms), titles: [] }];
      ((T && T.reports) || []).filter(function(r) { return r.kind === 'year'; }).sort(function(a, b) { return a.period_start < b.period_start ? 1 : -1; }).forEach(function(r) {
        var d = r.data || {}, xp = Number(d.xp) || 0;
        rows.push({ live: false, id: r.id, label: r.label, xp: xp, level: L.levelFor(xp).level, sky: L.skyFor(xp), top: topOf(d.realms),
          titles: (d.unlocks || []).filter(function(u) { return u.kind === 'title'; }).map(function(u) { return u.name; }) });
      });
      return rows;
    },
    // ── XP-6: treats, themes, quiet flair ────────────────────────────
    // A treat waits on one target; xp_check_treats() marks it earned.
    addTreat: function(t, todayIso) {
      var L = RPGACE.modules.xpSeason.logic;
      var row = { title: t.title, target_kind: t.kind, season: L.seasonOf(todayIso || L.today()) };
      if (t.wishlistId) row.wishlist_item_id = t.wishlistId;
      if (t.kind === 'year_level') row.target_value = Number(t.value);
      if (t.kind === 'realm_rank') { row.realm = t.realm; row.target_value = Number(t.value); }
      if (t.kind === 'resolution') row.challenge_id = t.challengeId;
      return RPGACE.sb.secureWrite('xp_treats', 'insert', row).then(function(d) { L.clear(); return d; });
    },
    dropTreat: function(id) {
      return RPGACE.sb.secureWrite('xp_treats', 'update', { status: 'dropped' }, 'id=eq.' + id + '&status=eq.waiting')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    treatTarget: function(t, T) {
      var S = RPGACE.modules.xpSeason;
      if (t.target_kind === 'year_level') return 'Year level ' + t.target_value;
      if (t.target_kind === 'realm_rank') {
        var lad = (T && T.ladders[t.realm]) || [], st = lad.filter(function(l) { return l.idx === t.target_value; })[0];
        var meta = S.REALMS[t.realm] || { icon: '', name: t.realm };
        return meta.icon + ' ' + meta.name + ' rank: ' + (st ? st.name : 'rank ' + t.target_value);
      }
      if (t.target_kind === 'resolution') {
        var c = ((T && T.challenges) || []).filter(function(x) { return x.id === t.challenge_id; })[0];
        return 'Resolution kept: ' + (c ? c.title : 'a season resolution');
      }
      return 'A week with all 3 challenges done';
    },
    // Targets still ahead of you: next levels, higher ranks, live resolutions.
    treatOptions: function(sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, cur = sum.level.level, seen = {};
      var levels = [cur + 1, cur + 2, cur + 5, 10, 25, 50, 75].filter(function(n) { if (n <= cur || seen[n]) return false; seen[n] = 1; return true; })
        .sort(function(a, b) { return a - b; });
      var ranks = [];
      S.ORDER.forEach(function(r) {
        var rk = L.realmRanks(sum, T, r); if (!rk) return;
        (T.ladders[r] || []).forEach(function(l) { if (l.idx > rk.season.idx) ranks.push({ realm: r, idx: l.idx, name: l.name }); });
      });
      var se = L.ukSeason(L.today());
      var res = (T.challenges || []).filter(function(c) { return c.kind === 'resolution' && c.status === 'active' && c.period_start === se.start; });
      return { levels: levels, ranks: ranks, resolutions: res };
    },
    // Themes unlock at year levels 10/25/50/75; reaching one in any year keeps it.
    themeUnlocked: function(theme, sum, T) {
      if (theme.level <= 1 || sum.level.level >= theme.level) return true;
      return ((T && T.unlocks) || []).some(function(u) { return u.kind === 'level' && Number(String(u.key).split(':')[1]) >= theme.level; });
    },
    themeFor: function(key) {
      var th = RPGACE.modules.xpSeason.THEMES;
      return th.filter(function(t) { return t.key === key; })[0] || th[0];
    },
    // XP-7: weekly spending limit. A week whose logged expenses stay at or
    // under it (with at least one expense logged) pays +50 Steward XP at close.
    setWeeklyLimit: function(v, todayIso) {
      var L = RPGACE.modules.xpSeason.logic, n = v === '' || v == null ? null : Number(v);
      if (n !== null && (!isFinite(n) || n < 0)) return Promise.reject(new Error('Enter an amount of 0 or more, or leave it empty to turn it off'));
      return RPGACE.sb.secureWrite('xp_settings', 'update', { weekly_spend_limit: n, weekly_limit_from: n === null ? null : (todayIso || L.today()), updated_at: new Date().toISOString() }, 'id=eq.1')
        .then(function(d) { L.clear(); return d; });
    },
    weekSpend: function(todayIso) {
      var L = RPGACE.modules.xpSeason.logic, ws = L.weekStart(todayIso || L.today());
      return RPGACE.sb.select('chronicles_finance', 'select=amount,entry_date&type=eq.expense&entry_date=gte.' + ws + '&entry_date=lte.' + L.addDays(ws, 6))
        .then(function(rows) { var s = 0; (rows || []).forEach(function(r) { s += Number(r.amount) || 0; }); return { spent: Math.round(s * 100) / 100, count: (rows || []).length }; });
    },
    setTheme: function(key) {
      return RPGACE.sb.secureWrite('xp_settings', 'update', { theme: key, updated_at: new Date().toISOString() }, 'id=eq.1')
        .then(function(d) { RPGACE.modules.xpSeason.logic.clear(); return d; });
    },
    // Your title for Oracle's greeting: latest title earned, else top rank.
    currentTitle: function(sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      var titles = ((T && T.unlocks) || []).filter(function(u) { return u.kind === 'title'; });
      if (titles.length) return titles[titles.length - 1].name;
      var top = null;
      if (T) S.ORDER.forEach(function(r) {
        var rk = L.realmRanks(sum, T, r); if (!rk || !(sum.realms[r] > 0)) return;
        if (!top || rk.season.idx > top.idx) top = { idx: rk.season.idx, name: rk.season.name };
      });
      return top && top.idx > 0 ? top.name : null;
    },
    // Level-ups and rank-ups since a moment (ISO), oldest first.
    levelRanksSince: function(T, sinceIso) {
      return ((T && T.unlocks) || []).filter(function(u) { return (u.kind === 'level' || u.kind === 'rank') && u.unlocked_at > sinceIso; });
    },
    flairText: function(u) {
      var S = RPGACE.modules.xpSeason, meta = S.REALMS[u.realm] || { icon: '', name: u.realm };
      return u.kind === 'level' ? '⬆️ ' + u.name : '🏅 ' + meta.name + ' → ' + u.name;
    },
  },

  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    PACE_COLOR: { behind: '#CC4A4A', slow: '#E2A83D', up: '#4CAF82', first: 'var(--muted)', none: 'var(--muted)' },
    stars: function(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); },
    // "next: Studio A at 5,040 XP" or "next: Sous Chef needs the Sous Chef unlock".
    nextText: function(rank, T) {
      if (!rank) return '';
      if (!rank.next) return 'top rank';
      var S = RPGACE.modules.xpSeason;
      if (rank.next.gate) {
        var d = S.logic.defFor(T, rank.next.gate);
        return '🔒 ' + rank.next.name + ' needs: ' + (d ? d.how : rank.next.gate);
      }
      return 'next: ' + rank.next.name + ' at ' + rank.next.need.toLocaleString('en-GB') + ' XP';
    },

    // 13-spoke balance wheel: spoke length = this week's realm XP vs the
    // biggest realm this week. An empty week draws only the guide circle.
    wheel: function(sum, size) {
      var S = RPGACE.modules.xpSeason, n = S.ORDER.length, c = size / 2, r = size / 2 - 14;
      var max = 0; S.ORDER.forEach(function(k) { if (sum.week[k] > max) max = sum.week[k]; });
      var parts = ['<svg class="xp-wheel" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="This week, XP by realm">',
        '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="1"/>'];
      S.ORDER.forEach(function(k, i) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n, v = max ? sum.week[k] / max : 0;
        var x2 = c + Math.cos(a) * r, y2 = c + Math.sin(a) * r;
        parts.push('<line x1="' + c + '" y1="' + c + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>');
        if (v > 0) {
          var xv = c + Math.cos(a) * r * Math.max(0.12, v), yv = c + Math.sin(a) * r * Math.max(0.12, v);
          parts.push('<line class="xp-spoke" data-realm="' + k + '" x1="' + c + '" y1="' + c + '" x2="' + xv.toFixed(1) + '" y2="' + yv.toFixed(1) + '" stroke="var(--xp-accent,var(--gold))" stroke-width="4" stroke-linecap="round"><title>' + S.REALMS[k].name + ': ' + sum.week[k] + ' XP this week</title></line>');
        }
        var lx = c + Math.cos(a) * (r + 8), ly = c + Math.sin(a) * (r + 8);
        parts.push('<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="middle" font-size="10">' + S.REALMS[k].icon + '</text>');
      });
      parts.push('</svg>');
      return parts.join('');
    },

    // Dashboard profile card (the existing .char-header, repainted).
    // Oct 14 2026 (Alex, from a screenshot: "make this a scrollable card left
    // to right, 1st page is the overall... swipe right and the 13 realms
    // wheel shows through"): two pages in one swipe card (CSS scroll-snap,
    // no gesture code — leftNav's swipe only listens within 28px of the screen
    // edge, so they don't clash). Page 1 keeps every legacy id (#char-title,
    // #lvl-display, #xp-bar, #xp-val, #stat-*) because older code still
    // writes to them.
    HUD_CSS: '.char-header.xp-hud{display:block;padding:0;overflow:hidden;position:relative}' +
      '.xp-hud-track{display:flex;align-items:flex-start;transition:height .2s var(--ease-out);overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}' +
      '.xp-hud-track::-webkit-scrollbar{display:none}' +
      '.xp-hud-slide{flex:0 0 100%;min-width:0;scroll-snap-align:start;box-sizing:border-box;padding:20px 20px 8px}' +
      '.xp-hud-p1{display:grid;grid-template-columns:auto 1fr;gap:14px 18px;align-items:center;align-content:start}' +
      '.xp-hud-p1 .stats-mini{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}' +
      '.xp-hud-p1 .stat-chip{padding:10px 4px;min-width:0}' +
      '.xp-hud-p1 .stat-chip .lbl{font-size:11px;letter-spacing:.5px;white-space:nowrap}' +
      '.xp-hud-p2{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px}' +
      '.xp-hud-p2 .xp-wheel text{font-size:15px}' +
      '.xp-hud-dots{display:flex;justify-content:center;gap:8px;padding:4px 0 12px}' +
      '.xp-hud-dot{width:24px;height:24px;border:0;background:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
      '.xp-hud-dot::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--border);transition:background .2s var(--ease-out),transform .2s var(--ease-out)}' +
      '.xp-hud-dot[aria-current="true"]::before{background:var(--gold);transform:scale(1.25)}' +
      '.xp-hud-hint{font-size:12px;color:var(--muted);letter-spacing:1px}',
    buildHud: function(head) {
      var U = RPGACE.modules.xpSeason.ui;
      if (head.dataset.xpHud) return;
      head.dataset.xpHud = '1';
      if (!document.getElementById('xp-hud-css')) {
        var st = document.createElement('style'); st.id = 'xp-hud-css'; st.textContent = U.HUD_CSS; document.head.appendChild(st);
      }
      head.classList.add('xp-hud');
      var name = (head.querySelector('.char-info h1') || {}).textContent || 'The Creator';
      var icon = (head.querySelector('.avatar-ring') || {}).textContent || '⚔';
      head.innerHTML =
        '<div class="xp-hud-track" tabindex="0" aria-label="Your XP — swipe for realms">' +
          '<section class="xp-hud-slide xp-hud-p1" aria-label="Overall">' +
            '<div class="avatar-ring">' + U._esc(icon) + '</div>' +
            '<div class="char-info"><h1>' + U._esc(name) + '</h1><div class="subtitle" id="char-title">Level <span id="lvl-display">1</span></div>' +
              '<div class="bars"><div class="bar-row"><span class="bar-label xp-hud-yl">XP</span><div class="bar-track"><div class="bar-fill xp" id="xp-bar" style="transform:scaleX(0)"></div></div><span class="bar-val" id="xp-val">0 / 500</span></div></div>' +
              '<div class="xp-hud-pend" style="font-size:12px;margin-top:6px;"></div></div>' +
            '<div class="stats-mini">' +
              '<div class="stat-chip"><span class="val" id="stat-tasks">0</span><span class="lbl">Done</span></div>' +
              '<div class="stat-chip"><span class="val" id="stat-streak">1</span><span class="lbl">Streak</span></div>' +
              '<div class="stat-chip"><span class="val" id="stat-lvl">1</span><span class="lbl">Level</span></div>' +
              '<div class="stat-chip"><span class="val" id="stat-xp">0</span><span class="lbl">Year XP</span></div>' +
            '</div>' +
            '<div class="xp-hud-hint" style="grid-column:1/-1;text-align:right;">Realms ›</div>' +
          '</section>' +
          '<section class="xp-hud-slide xp-hud-p2" aria-label="13 realms">' +
            '<div class="xp-hud-p2-title" style="font-family:\'Cinzel\',serif;font-size:16px;color:var(--gold);letter-spacing:1px;">This week across 13 realms</div>' +
            '<div class="xp-hud-wheel"></div>' +
            '<div class="xp-hud-p2-info" style="font-size:13px;color:var(--muted);line-height:1.6;"></div>' +
          '</section>' +
        '</div>' +
        '<div class="xp-hud-dots" role="tablist"><button type="button" class="xp-hud-dot" data-i="0" aria-label="Overall" aria-current="true"></button><button type="button" class="xp-hud-dot" data-i="1" aria-label="Realms wheel" aria-current="false"></button></div>';
      var track = head.querySelector('.xp-hud-track');
      var dots = head.querySelectorAll('.xp-hud-dot');
      var paint = function() {
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        [].forEach.call(dots, function(d) { d.setAttribute('aria-current', String(+d.dataset.i === i)); });
        // UI Debloat: the card is as tall as the page you're on, not the tallest page.
        var sl = track.children[i]; if (sl && sl.offsetHeight) track.style.height = sl.offsetHeight + 'px';
      };
      track.addEventListener('scroll', function() { window.requestAnimationFrame(paint); }, { passive: true });
      setTimeout(paint, 0);
      if (window.ResizeObserver) { var ro = new ResizeObserver(function() { window.requestAnimationFrame(paint); }); [].forEach.call(track.children, function(c) { ro.observe(c); }); }
      [].forEach.call(dots, function(d) {
        d.addEventListener('click', function(e) { e.stopPropagation(); track.scrollTo({ left: +d.dataset.i * track.clientWidth, behavior: 'smooth' }); });
      });
    },
    renderCard: function() {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var head = document.querySelector('.char-header:not(.xp-rc-card)');
      if (!head) return Promise.resolve();
      U.buildHud(head);
      if (!head.dataset.xpWired) {
        head.dataset.xpWired = '1';
        head.style.cursor = 'pointer';
        head.title = 'Open your Year';
        head.addEventListener('click', function(e) { if (e.target.closest('button,a')) return; U.openSeason(); });
      }
      return Promise.all([L.load(), L.loadTrophies().catch(function() { return null; })]).then(function(res) {
        var events = res[0], T = res[1];
        if (!events) return;
        var sum = L.summary(events);
        // XP-6: chosen theme (accent + frame) and quiet flair.
        if (T) { U.applyTheme(T.settings && T.settings.theme); U.flair(sum, T); U.autoWrapped(T); }
        // XP-3: the realm with the highest season rank (ties: more XP).
        var top = null;
        if (T) S.ORDER.forEach(function(r) {
          var rk = L.realmRanks(sum, T, r); if (!rk) return;
          if (!top || rk.season.idx > top.rk.season.idx || (rk.season.idx === top.rk.season.idx && (sum.realms[r] || 0) > (sum.realms[top.r] || 0))) top = { r: r, rk: rk };
        });
        var pend = L.pending(events).length;
        var pendLine = pend ? '<span class="xp-pending-dot" style="color:#E2A83D;font-weight:700;">⏳ ' + pend + ' deleted this week: was it done? Tap to answer</span>' : '';
        var topLine = top && (sum.realms[top.r] || 0) > 0 ? 'Top realm: <b style="color:var(--text)">' + S.REALMS[top.r].icon + ' ' + U._esc(S.REALMS[top.r].name) + ' · ' + U._esc(top.rk.season.name) + '</b>' : '';
        var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
        var title = document.getElementById('char-title');
        if (title) title.innerHTML = U._esc(sum.sky.rank) + ' <span style="color:var(--xp-accent,var(--gold));letter-spacing:1px">' + U.stars(sum.sky.stars) + '</span> • Level <span id="lvl-display">' + sum.level.level + '</span>';
        var pct = Math.round(sum.level.into / sum.level.need * 100);
        var bar = document.getElementById('xp-bar'); if (bar) bar.style.transform = 'scaleX(' + (pct / 100) + ')';
        set('xp-val', sum.level.into + ' / ' + sum.level.need);
        var yl = head.querySelector('.xp-hud-yl'); if (yl) yl.textContent = (sum.season === 0 ? 'Y0' : String(sum.season)) + ' XP';
        var pe = head.querySelector('.xp-hud-pend'); if (pe) pe.innerHTML = pendLine;
        var wheel = head.querySelector('.xp-hud-wheel');
        if (wheel) {
          var size = Math.max(190, Math.min(240, (head.clientWidth || 320) - 110));
          wheel.innerHTML = U.wheel(sum, size);
        }
        // RI-5: "Taken in this month" under the wheel - one chip per realm
        // with something in the Life Library, each opening it filtered.
        var p2 = head.querySelector('.xp-hud-p2');
        if (p2) RPGACE.realmTakenIn().then(function(t) {
          var box = p2.querySelector('.xp-hud-taken');
          if (!box) { box = document.createElement('div'); box.className = 'xp-hud-taken'; box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:13px;color:var(--muted);'; p2.appendChild(box); }
          box.innerHTML = '';
          var keys = S.ORDER.filter(function(k) { return t[k] && t[k].total; });
          if (!keys.length) { box.hidden = true; return; }
          box.hidden = false;
          var lbl = document.createElement('span'); lbl.textContent = '📥 Taken in this month:'; box.appendChild(lbl);
          keys.forEach(function(k) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'xp-hud-taken-chip'; b.dataset.realm = k;
            b.textContent = S.REALMS[k].icon + ' ' + t[k].total;
            b.title = S.REALMS[k].name + ': ' + RPGACE.realmTakenText(t[k]);
            b.style.cssText = 'min-height:40px;min-width:44px;padding:4px 10px;border-radius:18px;background:var(--panel2);border:1px solid var(--border);color:var(--text);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            b.onclick = function(e) { e.stopPropagation(); var lib = RPGACE.modules.lifeLibrary; if (lib) lib.open({ filter: { realm: k } }); };
            box.appendChild(b);
          });
        }).catch(function() {});
        var info = head.querySelector('.xp-hud-p2-info');
        if (info) info.innerHTML = U._esc(sum.seasonName) + '<br>This week: <b style="color:var(--text)">' + sum.realmsThisWeek + ' of 13</b> realms' + (topLine ? '<br>' + topLine : '') + (pendLine ? '<br>' + pendLine : '') +
          (sum.done ? '' : '<br>Log a cook, a gym session or an Action and XP appears here.');
        set('stat-tasks', sum.done); set('stat-streak', sum.streak); set('stat-lvl', sum.level.level); set('stat-xp', sum.total);
      }).catch(function(e) { console.warn('[RPGACE:xpSeason] card failed', e.message); });
    },

    // Oct 14 2026 (Alex: "the dashboard should have the combined only, but
    // each domain that uses a realm should have same style with xp with only
    // that realm"). The combined HUD (.char-header, global in index.html) now
    // shows on the dashboard only.
    hudFor: function(pageName) {
      var head = document.querySelector('.char-header:not(.xp-rc-card)');
      if (head) head.style.display = (!pageName || pageName === 'dashboard') ? '' : 'none';
    },

    // A domain's realm card in the dashboard HUD's style (avatar ring, name,
    // rank + stars, a bar to the next rank, chips), for that domain's
    // realm(s) only. Several realms → one card with realm tabs, starting on
    // the one furthest behind this week. Kept on the .xp-strip class so
    // pageStrip's replace-once logic and existing callers are unchanged.
    PACE_ORDER: { behind: 0, slow: 1, none: 2, first: 3, up: 4 },
    pickRealm: function(sum, realms) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var list = realms.filter(function(r) { return S.REALMS[r]; });
      list.sort(function(a, b) {
        var pa = U.PACE_ORDER[L.pace(sum, a).key], pb = U.PACE_ORDER[L.pace(sum, b).key];
        return (pa - pb) || ((sum.week[a] || 0) - (sum.week[b] || 0)) || (list.indexOf(a) - list.indexOf(b));
      });
      return list[0];
    },
    realmCardHtml: function(sum, T, r) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, meta = S.REALMS[r];
      var rk = T ? L.realmRanks(sum, T, r) : null, se = rk && rk.season;
      var xp = sum.realms[r] || 0, p = L.pace(sum, r);
      var pct = 0, val = xp.toLocaleString('en-GB') + ' XP';
      if (se && se.next) { pct = Math.max(0, Math.min(1, (xp - se.from) / Math.max(1, se.next.need - se.from))); val = xp.toLocaleString('en-GB') + ' / ' + se.next.need.toLocaleString('en-GB'); }
      else if (se) { pct = 1; val = xp.toLocaleString('en-GB') + ' · top'; }
      var chip = function(v, l) { return '<div class="stat-chip"><span class="val">' + v + '</span><span class="lbl">' + l + '</span></div>'; };
      return '<div class="avatar-ring xp-rc-ring" style="width:56px;height:56px;font-size:24px;">' + meta.icon + '</div>' +
        '<div class="char-info" style="min-width:0;">' +
          '<div class="xp-rc-name" style="font-family:\'Cinzel\',serif;font-size:18px;color:var(--gold);">' + U._esc(meta.name) + '</div>' +
          '<div class="subtitle xp-rc-rank" style="font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;">' +
            (se ? U._esc(se.name) + ' <span style="color:var(--xp-accent,var(--gold));letter-spacing:1px">' + U.stars(se.stars) + '</span>' : 'No ranks yet') + ' • ' + U._esc(sum.seasonName) + '</div>' +
          '<div class="bars" style="margin-top:8px;"><div class="bar-row"><span class="bar-label">RANK</span><div class="bar-track"><div class="bar-fill xp xp-rc-bar" style="transform:scaleX(' + pct.toFixed(3) + ')"></div></div><span class="bar-val xp-rc-val" style="width:auto;min-width:70px;">' + val + '</span></div></div>' +
          '<div class="xp-pace" style="font-size:13px;margin-top:6px;color:' + U.PACE_COLOR[p.key] + ';font-weight:700;">' + U._esc(p.text) + '</div>' +
          (se ? '<div class="xp-next" style="font-size:12px;color:var(--muted);margin-top:2px;">' + U._esc(U.nextText(se, T)) + '</div>' : '') +
        '</div>' +
        '<div class="stats-mini xp-rc-chips" style="grid-column:1/-1;gap:8px;">' +
          chip(sum.week[r] || 0, 'This week') + chip(xp.toLocaleString('en-GB'), 'Year XP') + (rk && rk.career ? chip(U._esc(rk.career.name), 'Career') : '') +
        '</div>';
    },
    // ── RC-4: milestones UI ─────────────────────────────────────────
    _msBtn: function(text, primary) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
      b.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:14px;background:none;border:1px solid ' + (primary ? 'var(--gold);color:var(--gold);' : 'var(--border);color:var(--text);');
      return b;
    },
    _msField: 'width:100%;box-sizing:border-box;min-height:44px;padding:8px 10px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:14px;',
    // The realm card's milestone line: live step (tap to tick), ideas to review, or ask for ideas.
    msLine: function(btn, realm, force) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, R = S.REALMS[realm];
      return Promise.all([L.loadTrophies(force), L.load()]).then(function(res) {
        var T = res[0]; if (!T || btn.dataset.realm !== realm) return;
        var st = L.msState(T, realm), sum = L.summary(res[1] || []);
        btn.hidden = false;
        if (st.live) {
          var est = st.live.manual ? ' · ~' + L.msXp(T, sum.realms[realm], realm, st.live.size) + ' XP' : '';
          btn.textContent = '🏔️ Milestone ' + st.inTier + '/3: ' + st.live.label + (st.live.manual ? est + ' · tap when done' : ' · counts itself (' + (Number(((T.settings || {}).progress || {})[st.live.progress_key]) || 0) + '/' + st.live.target + ')');
          btn.onclick = function(e) { e.stopPropagation(); if (st.live.manual) U.openMsTick(st.live); else U.openMsPropose(realm); };
        } else if (st.proposed.length) {
          btn.textContent = '🏔️ ' + st.proposed.length + ' milestone idea' + (st.proposed.length === 1 ? '' : 's') + ' to review for ' + R.name;
          btn.onclick = function(e) { e.stopPropagation(); U.openMsPropose(realm); };
        } else {
          btn.textContent = '🏔️ Propose the next ' + R.name + ' milestone (towards ' + L.msTitle(realm, st.tier) + ')';
          btn.onclick = function(e) { e.stopPropagation(); U.openMsPropose(realm); };
        }
      }).catch(function() { btn.hidden = true; });
    },
    msRefresh: function() {
      var U = RPGACE.modules.xpSeason.ui;
      [].forEach.call(document.querySelectorAll('.xp-rc-ms[data-realm]'), function(b) { U.msLine(b, b.dataset.realm, true); });
    },
    // Review proposed milestones (or ask Oracle for 3). Accept one -> it goes live; the others are set aside.
    openMsPropose: function(realm) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, R = S.REALMS[realm];
      var pop = RPGACE.modules.dashDeck._popup({ title: '🏔️ ' + R.icon + ' ' + R.name + ' knowledge path', width: '560px' });
      var box = pop.box; box.className = (box.className + ' xp-ms-box').trim();
      var msg = document.createElement('div'); msg.className = 'xp-ms-msg';
      msg.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
      box.appendChild(msg);
      var list = document.createElement('div'); box.appendChild(list);
      var draw = function(T, sum) {
        var st = L.msState(T, realm); list.textContent = '';
        msg.textContent = 'Step ' + st.inTier + ' of 3 towards ' + L.msTitle(realm, st.tier) + '. One milestone at a time; XP is sized to your ' + R.name + ' rank (S 10% / M 20% / L 35% of the gap to the next rank).';
        if (st.live) {
          var lv = document.createElement('div'); lv.className = 'xp-ms-live';
          lv.style.cssText = 'padding:10px;border:1px solid var(--gold);border-radius:8px;margin-bottom:10px;font-size:14px;';
          lv.textContent = 'Live now: ' + st.live.label + (st.live.manual ? '' : ' (the app counts this one)');
          list.appendChild(lv);
          return;
        }
        if (!st.proposed.length) {
          var ask = U._msBtn('✨ Ask Oracle for 3 ideas', true); ask.className = 'xp-ms-ask';
          ask.onclick = function() {
            ask.disabled = true; ask.textContent = 'Asking Oracle…';
            L.msPropose(realm).then(function() { return L.loadTrophies(true); }).then(function(T2) { draw(T2, sum); U.msRefresh(); })
              .catch(function(e) { ask.disabled = false; ask.textContent = '✨ Ask Oracle for 3 ideas'; msg.textContent = e.empty ? e.message + '.' : 'Could not get ideas: ' + e.message;
                if (!e.empty) RPGACE.utils.toast('Milestone ideas failed: ' + e.message, '#CC4A4A', 5000, 'xpSeason'); });
          };
          list.appendChild(ask);
          return;
        }
        st.proposed.forEach(function(m) {
          var card = document.createElement('div'); card.className = 'xp-ms-item';
          card.style.cssText = 'padding:10px 0;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px;';
          var lab = document.createElement('input'); lab.className = 'xp-ms-label'; lab.value = m.label; lab.style.cssText = U._msField; lab.setAttribute('aria-label', 'Milestone');
          var why = document.createElement('div'); why.style.cssText = 'font-size:13px;color:var(--muted);'; why.textContent = m.why || '';
          var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
          var size = document.createElement('select'); size.className = 'xp-ms-size'; size.style.cssText = U._msField + 'width:auto;flex:1;min-width:120px;';
          ['s', 'm', 'l'].forEach(function(k) { var o = document.createElement('option'); o.value = k; o.textContent = { s: 'Small', m: 'Medium', l: 'Large' }[k] + ' · ~' + L.msXp(T, sum.realms[realm], realm, k) + ' XP'; if (k === m.size) o.selected = true; size.appendChild(o); });
          row.appendChild(size);
          var proof = null;
          if (m.manual) {
            proof = document.createElement('select'); proof.className = 'xp-ms-proof'; proof.style.cssText = U._msField + 'width:auto;flex:2;min-width:160px;';
            Object.keys(L.MS_PROOF).forEach(function(k) { var o = document.createElement('option'); o.value = k; o.textContent = 'Proof: ' + L.MS_PROOF[k].icon + ' ' + L.MS_PROOF[k].label; if (k === m.proof_kind) o.selected = true; proof.appendChild(o); });
            row.appendChild(proof);
          } else {
            var cnt = document.createElement('div'); cnt.style.cssText = 'font-size:13px;color:var(--muted);align-self:center;';
            cnt.textContent = 'The app counts this (' + m.progress_key.replace(/_/g, ' ') + ' → ' + m.target + ')'; row.appendChild(cnt);
          }
          var acts = document.createElement('div'); acts.style.cssText = 'display:flex;gap:8px;';
          var ok = U._msBtn('✓ Make this the next milestone', true); ok.className = 'xp-ms-accept'; ok.style.flex = '1';
          var no = U._msBtn('✕ Not this'); no.className = 'xp-ms-reject';
          ok.onclick = function() {
            ok.disabled = true;
            L.msApprove(m, { label: lab.value.trim().slice(0, 140), size: size.value, proof_kind: proof ? proof.value : null })
              .then(function() { return L.loadTrophies(true); }).then(function(T2) { RPGACE.utils.toast('🏔️ Milestone set', '#4CAF82'); draw(T2, sum); U.msRefresh(); })
              .catch(function(e) { ok.disabled = false; RPGACE.utils.toast('Could not set milestone: ' + e.message, '#CC4A4A', 5000, 'xpSeason'); });
          };
          no.onclick = function() {
            no.disabled = true;
            L.msSetStatus(m, 'rejected', 'proposed').then(function() { return L.loadTrophies(true); }).then(function(T2) { draw(T2, sum); U.msRefresh(); })
              .catch(function(e) { no.disabled = false; RPGACE.utils.toast('Could not remove: ' + e.message, '#CC4A4A', 5000, 'xpSeason'); });
          };
          acts.appendChild(ok); acts.appendChild(no);
          card.appendChild(lab); card.appendChild(why); card.appendChild(row); card.appendChild(acts);
          list.appendChild(card);
        });
      };
      Promise.all([L.loadTrophies(true), L.load()]).then(function(res) { draw(res[0], L.summary(res[1] || [])); })
        .catch(function(e) { msg.textContent = 'Could not load your path: ' + e.message; });
      return pop;
    },
    // Tick a hand milestone: one line (always) + proof by kind (+ photo for cooks, optional for line-only).
    openMsTick: function(row) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, R = S.REALMS[row.realm], P = L.MS_PROOF[row.proof_kind] || L.MS_PROOF.photo_or_line;
      var pop = RPGACE.modules.dashDeck._popup({ title: '🏔️ Done: ' + row.label, width: '520px' });
      var box = pop.box; box.className = (box.className + ' xp-ms-tick').trim();
      var intro = document.createElement('div'); intro.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:10px;';
      intro.textContent = 'Proof for ' + R.name + ': ' + P.icon + ' ' + P.label + '. Your line goes into the Journal.';
      box.appendChild(intro);
      var line = document.createElement('textarea'); line.className = 'xp-ms-line'; line.rows = 2; line.placeholder = 'One line: what did you do?';
      line.style.cssText = U._msField; box.appendChild(line);
      var pick = null, photoIn = null, photoPath = null;
      if (P.table) {
        pick = document.createElement('select'); pick.className = 'xp-ms-pick'; pick.style.cssText = U._msField + 'margin-top:8px;';
        pick.innerHTML = '<option value="">Loading…</option>'; box.appendChild(pick);
        L.msProofOptions(row.proof_kind).then(function(opts) {
          pick.innerHTML = '';
          var o0 = document.createElement('option'); o0.value = ''; o0.textContent = opts.length ? 'Pick ' + P.label + '…' : 'Nothing found yet - make it first, then come back';
          pick.appendChild(o0);
          opts.forEach(function(x) { var o = document.createElement('option'); o.value = x.table + '|' + x.id; o.textContent = x.name; pick.appendChild(o); });
        });
      }
      if (P.photo) {
        var pl = document.createElement('label'); pl.style.cssText = 'display:block;font-size:13px;color:var(--muted);margin-top:8px;';
        pl.textContent = P.photo === 'required' ? '📷 Photo of the result (needed)' : '📷 Photo (optional)';
        photoIn = document.createElement('input'); photoIn.type = 'file'; photoIn.accept = 'image/*'; photoIn.className = 'xp-ms-photo';
        photoIn.style.cssText = 'display:block;margin-top:6px;min-height:44px;';
        pl.appendChild(photoIn); box.appendChild(pl);
      }
      var err = document.createElement('div'); err.className = 'xp-ms-err'; err.style.cssText = 'font-size:13px;color:#CC4A4A;min-height:18px;margin-top:6px;';
      box.appendChild(err);
      var done = U._msBtn('✓ Mark done', true); done.className = 'xp-ms-done'; done.style.width = '100%'; done.style.marginTop = '8px';
      box.appendChild(done);
      done.onclick = function() {
        var text = line.value.trim();
        if (!text) { err.textContent = 'Write one line about what you did.'; return; }
        var link = pick && pick.value ? pick.value.split('|') : null;
        if (P.table && !link) { err.textContent = 'Pick ' + P.label + '.'; return; }
        var file = photoIn && photoIn.files && photoIn.files[0];
        if (P.photo === 'required' && !file) { err.textContent = 'Add a photo of the result.'; return; }
        err.textContent = ''; done.disabled = true; done.textContent = 'Saving…';
        var up = file && RPGACE.modules.screenshotInbox ? RPGACE.modules.screenshotInbox.logic.upload(file, 'proof', [row.realm]).then(function(r) { return r.row && r.row.storage_path; }) : Promise.resolve(null);
        up.then(function(path) {
          photoPath = path;
          var proof = { line: text };
          if (link) { proof.link_table = link[0]; proof.link_id = link[1]; proof.link_label = pick.options[pick.selectedIndex].textContent; }
          if (photoPath) proof.photo = photoPath;
          return L.msDone(row, proof);
        }).then(function() {
          RPGACE.utils.toast('🏔️ Milestone done: ' + row.label, '#4CAF82');
          L.clear && L.clear(); U.msRefresh(); pop.close();
        }).catch(function(e) {
          done.disabled = false; done.textContent = '✓ Mark done';
          err.textContent = 'Not saved: ' + e.message;
          RPGACE.utils.toast('Milestone not saved: ' + e.message, '#CC4A4A', 5000, 'xpSeason');
        });
      };
      return pop;
    },
    // RC-3: a popup of up to 3 quest ideas for one realm; + Add makes one.
    openQuestSuggest: function(realm) {
      var S = RPGACE.modules.xpSeason, qe = RPGACE.modules.questEngine, R = S.REALMS[realm];
      if (!qe || !R) return;
      var pop = RPGACE.modules.dashDeck._popup({ title: '✨ Quest ideas — ' + R.icon + ' ' + R.name, width: '520px' });
      var box = pop.box;
      box.className = (box.className + ' xp-qs-box').trim();
      var msg = document.createElement('div');
      msg.className = 'xp-qs-msg';
      msg.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:10px;';
      msg.textContent = 'Asking Oracle for ideas from what your ' + R.name + ' realm knows…';
      box.appendChild(msg);
      qe.logic.suggestFor(realm).then(function(list) {
        if (!list.length) { msg.textContent = 'Oracle did not send any ideas back. Try again in a moment.'; return; }
        msg.textContent = 'Tap + Add on the ones you want. They join your Quest Board under ' + R.name + '.';
        list.forEach(function(q) {
          var row = document.createElement('div');
          row.className = 'xp-qs-item';
          row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border);';
          var txt = document.createElement('div');
          txt.style.cssText = 'flex:1;min-width:0;';
          var nm = document.createElement('div'); nm.style.cssText = 'font-weight:700;font-size:15px;color:var(--text);'; nm.textContent = q.name;
          var ac = document.createElement('div'); ac.style.cssText = 'font-size:13px;color:var(--muted);'; ac.textContent = (q.action ? q.action + ' · ' : '') + 'up to +' + Math.max(5, Math.min(100, Math.round((Number(q.xp) || 50) / 5) * 5)) + ' XP';
          txt.appendChild(nm); txt.appendChild(ac);
          var add = document.createElement('button');
          add.type = 'button'; add.className = 'xp-qs-add';
          add.textContent = '+ Add';
          add.style.cssText = 'min-height:44px;padding:8px 14px;background:none;border:1px solid var(--gold);border-radius:8px;color:var(--gold);font-weight:700;font-size:14px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          add.onclick = function() {
            add.disabled = true; add.textContent = 'Adding…';
            qe.logic.addSuggested(realm, q).then(function(row) {
              add.textContent = '✓ Kept as a task';
            }).catch(function(e) {
              add.disabled = false; add.textContent = '+ Add';
              RPGACE.utils.toast('Could not add quest: ' + e.message, '#CC4A4A', 5000, 'xpSeason');
            });
          };
          row.appendChild(txt); row.appendChild(add);
          box.appendChild(row);
        });
      }).catch(function(e) {
        msg.textContent = e.empty ? e.message + '.' : 'Could not get ideas: ' + e.message;
        if (!e.empty) RPGACE.utils.toast('Quest ideas failed: ' + e.message, '#CC4A4A', 5000, 'xpSeason');
      });
    },
    // UI Debloat (Oct 27 2026): work pages show one slim line per realm
    // (rank, XP to next); tapping it opens that realm's home (openRealmHome),
    // which holds the full card, target, next step and the realm's pages.
    // Alex: "money in is like a target - i think target should be in a home
    // dashboard for each realm".
    strip: function(realms) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var el = document.createElement('div');
      el.className = 'xp-strip xp-slim';
      el.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;';
      if (!L.signedIn()) { el.style.display = 'none'; return el; }
      var list = (realms || []).filter(function(r) { return S.REALMS[r]; });
      if (!list.length) { el.style.display = 'none'; return el; }
      Promise.all([L.load(), L.loadTrophies().catch(function() { return null; })]).then(function(res) {
        var events = res[0], T = res[1];
        if (!events) { el.style.display = 'none'; return; }
        var sum = L.summary(events);
        list.forEach(function(r) {
          var meta = S.REALMS[r], rk = T ? L.realmRanks(sum, T, r) : null, se = rk && rk.season, xp = sum.realms[r] || 0;
          var b = document.createElement('button'); b.type = 'button'; b.className = 'xp-slim-row'; b.dataset.realm = r;
          b.style.cssText = 'flex:1 1 160px;display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 12px;border:1px solid var(--border);border-radius:22px;background:var(--panel);color:var(--text);font:inherit;font-size:13px;cursor:pointer;text-align:left;';
          var pct = se && se.next ? Math.max(0, Math.min(1, (xp - se.from) / Math.max(1, se.next.need - se.from))) : (se ? 1 : 0);
          b.innerHTML = '<span style="font-size:18px">' + meta.icon + '</span><span style="flex:1;min-width:0"><b>' + U._esc(meta.name) + '</b> <span style="color:var(--muted)">· ' + (se ? U._esc(se.name) : 'no rank yet') + '</span>' +
            '<span style="display:block;height:4px;border-radius:2px;background:var(--border);margin-top:4px;overflow:hidden"><span style="display:block;height:100%;width:' + Math.round(pct * 100) + '%;background:var(--gold)"></span></span></span>' +
            '<span style="color:var(--muted);font-variant-numeric:tabular-nums">' + xp.toLocaleString('en-GB') + (se && se.next ? '/' + se.next.need.toLocaleString('en-GB') : '') + ' ›</span>';
          b.onclick = function(e) { e.stopPropagation(); U.openRealmHome(r); };
          // RF-3: the realm's one target under its name ("3/5 gym sessions this week").
          var rf = RPGACE.modules.realmFrame;
          if (rf) rf.logic.targetState(r).then(function(st) {
            var t = rf.logic.targetText(st); if (!t) return;
            var tg = document.createElement('span'); tg.className = 'xp-slim-tgt'; tg.style.cssText = 'display:block;font-size:12px;color:var(--muted);margin-top:2px'; tg.textContent = '🎯 ' + t;
            var host = b.children[1]; if (host) host.appendChild(tg);
          });
          el.appendChild(b);
        });
      }).catch(function() { el.style.display = 'none'; });
      return el;
    },
    // A realm's home: the full realm card (with taken in / knows / quests /
    // milestone), its target, and buttons to every page that feeds it.
    openRealmHome: function(r) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, meta = S.REALMS[r];
      if (!meta) return null;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: meta.icon + ' ' + meta.name, title: meta.name + ' home', width: '560px', scroll: true });
      pop.box.id = 'xp-realm-home'; pop.box.dataset.realm = r;
      pop.box.appendChild(U.stripFull([r]));
      // RF-2: the universal realm frame (target, what's next, ready from other
      // realms, Tasks/Live/Take in/Log/Prompts/Review) - realmFrame owns it.
      if (RPGACE.modules.realmFrame) RPGACE.modules.realmFrame.ui.render(pop.box, r, function() { pop.close(); });
      var hd = document.createElement('div'); hd.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:12px 0 6px;';
      hd.textContent = meta.name + ' pages';
      var grid = document.createElement('div'); grid.id = 'xp-rh-pages'; grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;';
      // The left menu is the one list of pages; a page belongs here when its menu row feeds this realm.
      var seen = {};
      [].forEach.call(document.querySelectorAll('.ln-card'), function(row) {
        var rs = String(row.dataset.realms || '').split(/[ ,]+/);
        var label = ((row.querySelector('.ln-ctitle') || row).firstChild || {}).textContent || '';
        label = String(label).trim().slice(0, 40);
        if (rs.indexOf(r) === -1 || seen[label]) return; seen[label] = 1;
        var t = document.createElement('button'); t.type = 'button'; t.className = 'xp-rh-page';
        t.style.cssText = 'min-height:56px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--panel);color:var(--text);font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer;';
        t.textContent = label;
        t.onclick = function() { pop.close(); row.click(); };
        grid.appendChild(t);
      });
      if (grid.children.length) { pop.box.appendChild(hd); pop.box.appendChild(grid); }
      return pop;
    },
    stripFull: function(realms) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var el = document.createElement('div');
      el.className = 'xp-strip xp-realm-card';
      el.style.cssText = 'margin:0 0 14px;';
      if (!L.signedIn()) { el.style.display = 'none'; return el; }
      el.textContent = 'Loading XP…';
      el.style.cssText += 'font-size:13px;color:var(--muted);';
      Promise.all([L.load(), L.loadTrophies().catch(function() { return null; })]).then(function(res) {
        var events = res[0], T = res[1];
        if (!events) { el.style.display = 'none'; return; }
        var sum = L.summary(events);
        var list = realms.filter(function(r) { return S.REALMS[r]; });
        if (!list.length) { el.style.display = 'none'; return; }
        el.textContent = '';
        el.style.cssText = 'margin:0 0 14px;';
        var tabs = null;
        if (list.length > 1) {
          tabs = document.createElement('div');
          tabs.className = 'xp-rc-tabs';
          tabs.setAttribute('role', 'tablist');
          tabs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;';
          el.appendChild(tabs);
        }
        var card = document.createElement('div');
        card.className = 'char-header xp-rc-card';
        card.style.cssText = 'margin-bottom:0;padding:14px;gap:12px 14px;grid-template-columns:auto 1fr;cursor:pointer;';
        card.title = 'Open your Year';
        card.onclick = function() { U.openSeason(); };
        el.appendChild(card);
        // RI-5: what was taken in for this realm this month; opens the
        // Life Library filtered to it.
        var taken = document.createElement('button');
        taken.type = 'button'; taken.className = 'xp-rc-taken';
        taken.style.cssText = 'display:block;width:100%;text-align:left;min-height:40px;margin-top:6px;padding:6px 12px;background:none;border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        taken.hidden = true;
        el.appendChild(taken);
        // RC-2: what this realm knows (accepted jargon + Library items).
        var knows = document.createElement('button');
        knows.type = 'button'; knows.className = 'xp-rc-knows';
        knows.style.cssText = taken.style.cssText;
        knows.hidden = true;
        el.appendChild(knows);
        // RC-3: suggest quests for this realm from what it knows.
        var suggest = document.createElement('button');
        suggest.type = 'button'; suggest.className = 'xp-rc-suggest';
        suggest.style.cssText = taken.style.cssText;
        suggest.hidden = true;
        el.appendChild(suggest);
        // RC-4: the realm's knowledge-path milestone line.
        var ms = document.createElement('button');
        ms.type = 'button'; ms.className = 'xp-rc-ms';
        ms.style.cssText = taken.style.cssText;
        ms.hidden = true;
        el.appendChild(ms);
        var paintMs = function(r) { ms.dataset.realm = r; U.msLine(ms, r, false); };
        var paintSuggest = function(r) {
          suggest.textContent = '✨ Suggest quests for ' + S.REALMS[r].name;
          suggest.hidden = !RPGACE.modules.questEngine;
          suggest.onclick = function(e) { e.stopPropagation(); U.openQuestSuggest(r); };
        };
        var paintKnows = function(r) {
          RPGACE.realmKnowledge().then(function(k) {
            if (card.dataset.realm !== r) return;
            var txt = RPGACE.realmKnowledgeText(k[r]);
            knows.textContent = '🧠 Knows: ' + (txt || 'nothing yet - accept jargon or shelve Library items for ' + S.REALMS[r].name);
            knows.hidden = false;
            knows.onclick = function(e) {
              e.stopPropagation();
              var je = RPGACE.modules.jargonEncyclopedia;
              if (je) je._realmFilter = r;
              if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.jargonEncyclopedia);
            };
          }).catch(function() { knows.hidden = true; });
        };
        var paintTaken = function(r) {
          RPGACE.realmTakenIn().then(function(t) {
            if (card.dataset.realm !== r) return;
            var txt = RPGACE.realmTakenText(t[r]);
            taken.textContent = '📥 Taken in this month: ' + (txt || 'nothing yet - add a video, book or note for ' + S.REALMS[r].name);
            taken.hidden = false;
            taken.onclick = function(e) { e.stopPropagation(); var lib = RPGACE.modules.lifeLibrary; if (lib) lib.open({ filter: { realm: r } }); };
          }).catch(function() { taken.hidden = true; });
        };
        var show = function(r) {
          paintTaken(r);
          paintKnows(r);
          paintSuggest(r);
          paintMs(r);
          card.dataset.realm = r;
          el.dataset.realm = r;
          el.dataset.pace = L.pace(sum, r).key;
          card.innerHTML = U.realmCardHtml(sum, T, r);
          if (tabs) [].forEach.call(tabs.children, function(b) {
            var on = b.dataset.realm === r;
            b.setAttribute('aria-selected', on ? 'true' : 'false');
            b.style.background = on ? 'rgba(201,168,76,0.16)' : 'var(--panel2)';
            b.style.borderColor = on ? 'var(--gold)' : 'var(--border)';
            b.style.color = on ? 'var(--gold)' : 'var(--text)';
          });
        };
        if (tabs) list.forEach(function(r) {
          var b = document.createElement('button');
          b.type = 'button';
          b.dataset.realm = r;
          b.setAttribute('role', 'tab');
          b.textContent = S.REALMS[r].icon + ' ' + S.REALMS[r].name;
          b.style.cssText = 'min-height:36px;padding:6px 12px;border:1px solid var(--border);border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          b.onclick = function(e) { e.stopPropagation(); show(r); };
          tabs.appendChild(b);
        });
        show(U.pickRealm(sum, list));
      }).catch(function() { el.style.display = 'none'; });
      return el;
    },
    // Popups: dashDeck._popup calls this for the first popup of a card.
    popupStrip: function(cardKey) {
      var S = RPGACE.modules.xpSeason, realms = S.CARD_REALMS[cardKey];
      return realms ? S.ui.strip(realms) : null;
    },
    // Pages: put the strip at the top of the page (once).
    pageStrip: function(name) {
      var S = RPGACE.modules.xpSeason, realms = S.PAGE_REALMS[name];
      var page = document.getElementById('page-' + name);
      if (!realms || !page) return;
      var old = page.querySelector(':scope > .xp-strip');
      if (old) old.remove();
      var st = S.ui.strip(realms);
      // After the Knowledge "what this is" header when the page has one (LL-7
      // keeps that header directly under the title), else after the title.
      // KN-4: after the area ← Back / 🏠 row when the page has one.
      var anchor = page.querySelector(':scope > .area-bar') || page.querySelector(':scope > .kn-head') || page.querySelector(':scope > .section-title');
      if (anchor && anchor.nextSibling) page.insertBefore(st, anchor.nextSibling); else page.insertBefore(st, page.firstChild);
    },

    openSeason: function() {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return;
      var pop = dd._popup({ eyebrow: '📜 Chronicles', title: '🌌 Your Year', width: '620px' });
      pop.box.id = 'xp-season';
      if (!L.signedIn()) { pop.box.textContent = 'Sign in to see your Year.'; return pop; }
      pop.box.textContent = 'Loading…';
      Promise.all([L.load(true), L.loadTrophies(true).catch(function() { return null; })]).then(function(res) {
        var events = res[0], T = res[1];
        var sum = L.summary(events || []);
        var b = pop.box; b.innerHTML = '';
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:12px;';
        var toNext = sum.sky.nextAt == null ? 'top star reached' : (sum.sky.nextAt - sum.total) + ' XP to the next star';
        top.innerHTML = U.wheel(sum, 150) + '<div style="flex:1;min-width:180px;">' +
          '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;">' + U._esc(sum.seasonName) + '</div>' +
          '<div style="font-size:22px;font-weight:700;color:var(--text);margin:2px 0;">' + U._esc(sum.sky.rank) + ' <span style="color:var(--gold)">' + U.stars(sum.sky.stars) + '</span></div>' +
          '<div style="font-size:14px;color:var(--text);">Level ' + sum.level.level + ' · ' + sum.level.into + ' / ' + sum.level.need + ' to level ' + (sum.level.level + 1) + '</div>' +
          '<div style="font-size:13px;color:var(--muted);margin-top:4px;">' + sum.total + ' year XP · ' + U._esc(toNext) + ' · streak ' + sum.streak + ' day' + (sum.streak === 1 ? '' : 's') + ' · ' + sum.career + ' career XP</div>' +
          '<div style="font-size:13px;color:var(--muted);margin-top:4px;">This week you touched <b style="color:var(--text)">' + sum.realmsThisWeek + ' of 13</b> realms.</div></div>';
        b.appendChild(top);
        var tb = document.createElement('button');
        tb.id = 'xp-open-trophies';
        tb.textContent = '🏆 Trophy cabinet' + (T ? ' · ' + T.unlocks.filter(function(u) { return u.kind !== 'rank' && u.kind !== 'career_rank' && u.kind !== 'level'; }).length + ' earned' : '');
        tb.style.cssText = 'padding:8px 14px;min-height:40px;border:1px solid rgba(201,168,76,0.4);background:rgba(201,168,76,0.1);color:var(--gold);border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;';
        tb.onclick = function() { U.openTrophies(); };
        b.appendChild(tb);
        var ws = document.createElement('button'); ws.id = 'xp-open-wrapped';
        ws.textContent = '🎆 Year so far';
        ws.style.cssText = tb.style.cssText + 'margin-left:8px;';
        ws.onclick = function() { U.openYearSoFar(); };
        b.appendChild(ws);
        U._pendingBox(b, L.pending(events));
        if (T) { U._challengesSection(b, sum, T); U._resolutionsSection(b, T); U._questsSection(b, T); U._treatsSection(b, sum, T); U._budgetSection(b, T); U._themesSection(b, sum, T); }
        var h = document.createElement('div');
        h.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:12px 0 6px;';
        h.textContent = 'Realms';
        b.appendChild(h);
        S.ORDER.forEach(function(r) {
          var meta = S.REALMS[r], p = L.pace(sum, r);
          var row = document.createElement('div'); row.className = 'xp-realm-row'; row.dataset.realm = r;
          row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;';
          var rk = T ? L.realmRanks(sum, T, r) : null;
          row.innerHTML = '<b style="min-width:120px;color:var(--text)">' + meta.icon + ' ' + U._esc(meta.name) + '</b>' +
            (rk ? '<span class="xp-rank" style="color:var(--gold);font-weight:700;min-width:110px;">' + U._esc(rk.season.name) + '</span>' : '') +
            '<span style="color:var(--muted);min-width:150px;">' + (sum.realms[r] || 0) + ' XP · ' + (sum.week[r] || 0) + ' this week</span>' +
            '<span style="color:' + U.PACE_COLOR[p.key] + ';">' + U._esc(p.text) + '</span>' +
            (rk ? '<span class="xp-next" style="flex-basis:100%;color:var(--muted);font-size:12px;">' + U._esc(U.nextText(rk.season, T)) + ' · career: ' + U._esc(rk.career.name) + ' <span style="color:var(--gold)">' + U.stars(rk.career.stars) + '</span></span>' : '');
          b.appendChild(row);
        });
        if (T) U._reportsSection(b, T.reports || []);
        var h2 = h.cloneNode(); h2.textContent = 'Recent XP'; b.appendChild(h2);
        if (!sum.recent.length) {
          var e0 = document.createElement('div'); e0.style.cssText = 'font-size:13px;color:var(--muted);';
          e0.textContent = 'Nothing yet this year. XP comes from real things you do: cooks, gym, actions, beats, books, trips, sales.';
          b.appendChild(e0);
        }
        sum.recent.forEach(function(e) {
          var meta = S.REALMS[e.realm] || { icon: '•', name: e.realm };
          var row = document.createElement('div'); row.className = 'xp-event';
          row.style.cssText = 'display:flex;gap:8px;font-size:13px;padding:3px 0;color:var(--text);';
          row.innerHTML = '<span>' + meta.icon + '</span><span style="flex:1;min-width:0;">' + U._esc(L.label(e.action)) + (e.note ? ' <span style="color:var(--muted)">· ' + U._esc(String(e.note).slice(0, 60)) + '</span>' : '') +
            (e.status === 'pending_confirm' ? ' <span style="color:#E2A83D">(deleted this week, still counted until you confirm)</span>' : '') + '</span>' +
            '<b style="color:' + (e.xp ? 'var(--gold)' : 'var(--muted)') + '">+' + e.xp + '</b><span style="color:var(--muted);min-width:52px;text-align:right;">' + U._esc(String(e.earned_on).slice(5)) + '</span>';
          b.appendChild(row);
        });
        var note = document.createElement('div');
        note.style.cssText = 'font-size:12px;color:var(--muted);margin-top:12px;line-height:1.5;';
        note.textContent = 'Repeats of the same action on one day pay 100%, then 50%, then nothing; shipping, sales and milestones are never reduced. Year ranks reset on 1 January; career ranks never reset and climb 4x slower (stars show progress to the next one). Titles and badges are yours for good.';
        b.appendChild(note);
      }).catch(function(e) { pop.box.textContent = 'Your Year could not load: ' + (e.message || e); });
      return pop;
    },

    // ── XP-5 UI ─────────────────────────────────────────────────────
    _head: function(b, text) {
      var h = document.createElement('div');
      h.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:14px 0 6px;';
      h.textContent = text; b.appendChild(h); return h;
    },
    _btn: function(text, cls) {
      var x = document.createElement('button');
      x.className = cls || ''; x.textContent = text;
      x.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid var(--border);background:none;color:var(--text);border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;';
      return x;
    },
    _bar: function(now, target) {
      var pct = Math.max(0, Math.min(100, Math.round((now || 0) / Math.max(1, target) * 100)));
      return '<span style="display:inline-block;width:80px;height:6px;border-radius:3px;background:var(--border);vertical-align:middle;overflow:hidden;"><span style="display:block;height:100%;width:' + pct + '%;background:var(--gold);"></span></span>';
    },
    // One row for a weekly challenge or a resolution.
    _challengeRow: function(c) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var meta = S.REALMS[c.realm] || { icon: '•', name: c.realm };
      var row = document.createElement('div');
      row.className = 'xp-ch-row'; row.dataset.id = c.id; row.dataset.status = c.status;
      row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);';
      var state = c.status === 'done' ? '✅' : c.status === 'missed' ? '❌' : meta.icon;
      var prog = c.status === 'done' ? '<b style="color:#4CAF82">done</b>' : !c.metric_actions ? '<span style="color:var(--muted)">tick when done</span>'
        : U._bar(c.progress, c.target) + ' <span style="color:var(--muted)">' + (c.progress || 0) + ' / ' + c.target + '</span>';
      row.innerHTML = '<span>' + state + '</span><span style="flex:1;min-width:150px;">' + U._esc(c.title) + '</span>' + prog + '<b style="color:var(--gold)">+' + c.xp + '</b>';
      if (c.status === 'active' && !c.metric_actions) {
        var t = U._btn('✅ Done', 'xp-ch-tick');
        t.onclick = function() {
          t.disabled = true;
          L.tickChallenge(c.id).then(function() { RPGACE.utils.toast('✅ ' + c.title + ': +' + c.xp + ' XP', '#4CAF82'); row.dataset.status = 'done'; t.remove(); U.renderCard(); })
            .catch(function(e) { t.disabled = false; RPGACE.utils.toast('Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
        };
        row.appendChild(t);
      }
      return row;
    },
    _challengesSection: function(b, sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, ws = L.weekStart(L.today());
      U._head(b, '🎯 This week\'s challenges');
      var box = document.createElement('div'); box.id = 'xp-challenges'; b.appendChild(box);
      var mine = L.weekChallenges(T, ws).filter(function(c) { return c.status === 'active' || c.status === 'done'; });
      mine.forEach(function(c) { box.appendChild(U._challengeRow(c)); });
      if (mine.length < 3) {
        var pk = U._btn(mine.length ? '🎯 Pick ' + (3 - mine.length) + ' more' : '🎯 Pick this week\'s 3 challenges', 'xp-open-picker');
        pk.style.marginTop = '6px';
        pk.onclick = function() { U.openChallengePicker(); };
        box.appendChild(pk);
      }
    },
    _resolutionsSection: function(b, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, se = L.ukSeason(L.today());
      U._head(b, se.icon + ' ' + se.label + ' resolutions (until ' + se.end + ')');
      var box = document.createElement('div'); box.id = 'xp-resolutions'; b.appendChild(box);
      var mine = (T.challenges || []).filter(function(c) { return c.kind === 'resolution' && c.period_start === se.start; });
      if (!mine.length) {
        var e0 = document.createElement('div'); e0.style.cssText = 'font-size:13px;color:var(--muted);';
        e0.textContent = 'No resolutions yet for this season. Set 1 to 5 longer goals; each pays 500, 1,000 or 1,500 XP when kept.';
        box.appendChild(e0);
      }
      mine.forEach(function(c) { box.appendChild(U._challengeRow(c)); });
      if (mine.length < 5) {
        var add = U._btn('+ Add resolution', 'xp-add-res'); add.style.marginTop = '6px';
        add.onclick = function() { U._resolutionForm(box, add); };
        box.appendChild(add);
      }
    },
    _resolutionForm: function(box, addBtn) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      if (box.querySelector('.xp-res-form')) return;
      var f = document.createElement('div');
      f.className = 'xp-res-form';
      f.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:8px;';
      var field = 'padding:6px 8px;min-height:36px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:14px;';
      var opts = S.CHALLENGE_MENU.map(function(x) { return '<option value="' + L.menuKey(x) + '">' + U._esc(S.REALMS[x.realm].icon + ' ' + L.challengeTitle(x, 'N')) + '</option>'; }).join('');
      f.innerHTML = '<input class="xp-res-title" placeholder="Resolution, e.g. Release 6 beats" style="' + field + '">' +
        '<label style="font-size:12px;color:var(--muted);">What counts<select class="xp-res-key" style="' + field + 'width:100%;margin-top:2px;"><option value="">✋ I\'ll tick it myself</option>' + opts + '</select></label>' +
        '<label style="font-size:12px;color:var(--muted);">How many (N)<input class="xp-res-target" type="number" min="1" value="6" style="' + field + 'width:100%;margin-top:2px;"></label>' +
        '<label style="font-size:12px;color:var(--muted);">Size<select class="xp-res-size" style="' + field + 'width:100%;margin-top:2px;"><option value="small">Small: 500 XP</option><option value="medium" selected>Medium: 1,000 XP</option><option value="big">Big: 1,500 XP</option></select></label>' +
        '<label style="font-size:12px;color:var(--muted);">Realm (when you tick it yourself)<select class="xp-res-realm" style="' + field + 'width:100%;margin-top:2px;">' + S.ORDER.map(function(r) { return '<option value="' + r + '">' + S.REALMS[r].icon + ' ' + S.REALMS[r].name + '</option>'; }).join('') + '</select></label>';
      var save = U._btn('Save resolution', 'xp-res-save');
      save.onclick = function() {
        var key = f.querySelector('.xp-res-key').value, item = key ? L.menuItem(key) : null;
        var target = Math.round(Number(f.querySelector('.xp-res-target').value) || 0);
        var title = f.querySelector('.xp-res-title').value.trim() || (item ? L.challengeTitle(item, target) : '');
        if (!title) { RPGACE.utils.toast('Give the resolution a name', '#E2A83D'); return; }
        if (item && target < 1) { RPGACE.utils.toast('How many needs to be 1 or more', '#E2A83D'); return; }
        save.disabled = true;
        L.addResolution({ title: title, key: key, target: target, size: f.querySelector('.xp-res-size').value, realm: item ? item.realm : f.querySelector('.xp-res-realm').value })
          .then(function() { RPGACE.utils.toast('🎯 Resolution set', '#4CAF82'); U.openSeason(); })
          .catch(function(e) { save.disabled = false; RPGACE.utils.toast('Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
      };
      f.appendChild(save);
      box.insertBefore(f, addBtn);
    },
    _questsSection: function(b, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var chains = L.questChains(T).filter(function(c) { return c.steps.length; });
      if (!chains.length) return;
      U._head(b, '🗺 Realm quests (+50 XP a step)');
      var box = document.createElement('div'); box.id = 'xp-quests'; b.appendChild(box);
      chains.forEach(function(c) {
        var meta = S.REALMS[c.realm] || { icon: '•', name: c.realm }, def = L.defFor(T, c.gate);
        var row = document.createElement('div');
        row.className = 'xp-quest-row'; row.dataset.gate = c.gate;
        row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);';
        row.innerHTML = '<span>' + meta.icon + '</span><b style="min-width:120px;">' + U._esc(def ? def.name : (/_path$/.test(c.gate) ? meta.name + ' knowledge path' : c.gate)) + '</b>' +
          '<span style="color:var(--muted)">step ' + Math.min(c.doneCount + 1, c.steps.length) + ' of ' + c.steps.length + '</span>' +
          (c.next ? '<span style="flex:1;min-width:150px;">' + U._esc(c.next.label) + '</span>' + U._bar(c.next.now, c.next.target) + ' <span style="color:var(--muted)">' + Math.min(c.next.now, c.next.target) + ' / ' + c.next.target + '</span>'
            : '<span style="flex:1;color:#4CAF82;font-weight:700;">all steps done</span>');
        box.appendChild(row);
      });
    },
    // ── XP-8 UI: Year Wrapped swipe cards ───────────────────────────
    openWrapped: function(w) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return null;
      var cards = L.wrappedCards(w), i = 0;
      var pop = dd._popup({ eyebrow: '🎆 Year Wrapped', title: w.label, width: '420px' });
      pop.box.id = 'xp-wrapped';
      var stage = document.createElement('div'); stage.className = 'xp-wrap-stage';
      stage.style.cssText = 'min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:18px 8px;border:1px solid var(--border);border-radius:14px;background:var(--panel2);touch-action:pan-y;';
      var dots = document.createElement('div'); dots.className = 'xp-wrap-dots';
      dots.style.cssText = 'display:flex;justify-content:center;gap:6px;margin:10px 0;';
      var nav = document.createElement('div'); nav.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      var prev = U._btn('◀ Back', 'xp-wrap-prev'), next = U._btn('Next ▶', 'xp-wrap-next');
      nav.appendChild(prev); nav.appendChild(next);
      pop.box.appendChild(stage); pop.box.appendChild(dots); pop.box.appendChild(nav);
      var draw = function() {
        var c = cards[i];
        stage.dataset.card = c.key;
        stage.innerHTML = '<div style="font-size:40px;line-height:1;">' + c.icon + '</div>' +
          '<div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;">' + U._esc(c.title) + '</div>' +
          (c.big ? '<div class="xp-wrap-big" style="font-size:28px;font-weight:700;color:var(--xp-accent,var(--gold));line-height:1.2;">' + U._esc(c.big) + '</div>' : '') +
          (c.lines || []).map(function(l) { return '<div style="font-size:15px;color:var(--text);">' + U._esc(l) + '</div>'; }).join('');
        if (c.key === 'summary') {
          var p = document.createElement('div'); p.className = 'xp-wrap-text';
          p.style.cssText = 'font-size:15px;line-height:1.6;color:var(--text);max-width:34em;';
          p.textContent = c.text || c.note || 'Writing your paragraph…';
          stage.appendChild(p);
          if (!c.text && !c.note) L.ensureWrappedText(w).then(function(t) {
            c.text = t; if (cards[i] === c) p.textContent = t || (w.ccQueued ? '🤖 Orchestrator CC is writing your paragraph — it\'ll be here after the next pick-up. The numbers above are your year.' : 'Oracle couldn\'t write the paragraph right now — the numbers above are your year. It will try again next time you open this.');
          });
        }
        dots.innerHTML = cards.map(function(_, k) { return '<span style="width:8px;height:8px;border-radius:50%;background:' + (k === i ? 'var(--xp-accent,var(--gold))' : 'var(--border)') + ';"></span>'; }).join('');
        prev.disabled = i === 0; next.textContent = i === cards.length - 1 ? 'Done' : 'Next ▶';
      };
      var go = function(d) { if (d > 0 && i === cards.length - 1) { pop.close(); return; } i = Math.max(0, Math.min(cards.length - 1, i + d)); draw(); };
      prev.onclick = function() { go(-1); }; next.onclick = function() { go(1); };
      var x0 = null;
      stage.addEventListener('touchstart', function(e) { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', function(e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }, { passive: true });
      pop.box.tabIndex = -1;
      pop.box.addEventListener('keydown', function(e) { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
      draw();
      return pop;
    },
    openYearSoFar: function() {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      return Promise.all([L.load(true), L.loadTrophies(true).catch(function() { return null; })]).then(function(res) {
        var w = L.wrappedLive(res[0] || [], res[1]), RB = RPGACE.modules.realmBrief;
        if (!RB) return S.ui.openWrapped(w);
        var rg = L.yearRange(L.seasonOf(L.today()));
        return RB.logic.period(rg.start, L.today()).then(function(p) { w.inputs = p.inputs; w.quests = p.quests; }, function() {}).then(function() { return S.ui.openWrapped(w); });
      }).catch(function(e) { RPGACE.utils.toast('Year so far could not load: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
    },
    openWrappedReport: function(id) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      return L.loadTrophies(true).then(function(T) {
        var r = ((T && T.reports) || []).filter(function(x) { return x.id === id; })[0];
        if (!r) { RPGACE.utils.toast('That year report isn\'t saved yet', '#E2A83D'); return null; }
        if (!r.wrapped_seen_at) L.markWrappedSeen(r.id).catch(function() {});
        return S.ui.openWrapped(L.wrappedFromReport(r));
      });
    },
    // Pops up once: the first time the app opens after a year report lands.
    autoWrapped: function(T) {
      var S = RPGACE.modules.xpSeason;
      if (S._wrappedAuto) return;
      var r = ((T && T.reports) || []).filter(function(x) { return x.kind === 'year' && !x.wrapped_seen_at; })[0];
      if (!r) return;
      S._wrappedAuto = true;
      S.logic.markWrappedSeen(r.id).then(function() { S.ui.openWrapped(S.logic.wrappedFromReport(r)); })
        .catch(function(e) { S._wrappedAuto = false; console.warn('[xpSeason] Wrapped pop-up skipped', e && e.message); });
    },
    _hallSection: function(b, sum, T, bySeason) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var box = document.createElement('div'); box.id = 'xp-hall';
      L.hallRows(T, sum).forEach(function(h) {
        var row = document.createElement('button'); row.type = 'button'; row.className = 'xp-hall-row'; if (h.id) row.dataset.id = h.id;
        row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;width:100%;text-align:left;min-height:48px;padding:8px 10px;margin-bottom:6px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:13px;cursor:pointer;';
        var top = h.top ? (S.REALMS[h.top] ? S.REALMS[h.top].icon + ' ' + S.REALMS[h.top].name : h.top) : '—';
        var season = h.live ? sum.season : null;
        if (!h.live) { var m = /Year (\d+)/.exec(h.label || ''); season = /Year 0/.test(h.label || '') ? 0 : (m ? Number(m[1]) : null); }
        var ranks = season != null && bySeason[season] ? S.ORDER.filter(function(r) { return bySeason[season][r]; }).map(function(r) { return S.REALMS[r].icon + ' ' + bySeason[season][r].name; }).join(' · ') : '';
        row.innerHTML = '<b style="min-width:150px;">' + (h.live ? '⏳ ' : '🎆 ') + U._esc(h.label) + '</b>' +
          '<span style="color:var(--muted);flex:1;min-width:160px;">' + Number(h.xp || 0).toLocaleString('en-GB') + ' XP · level ' + h.level + ' · ' + U._esc(h.sky.rank) + ' · top: ' + U._esc(top) + '</span>' +
          (h.titles.length ? '<span style="flex-basis:100%;color:var(--text);">👑 ' + U._esc(h.titles.join(', ')) + '</span>' : '') +
          (ranks ? '<span style="flex-basis:100%;color:var(--muted);font-size:12px;">' + U._esc(ranks) + '</span>' : '') +
          '<span style="flex-basis:100%;color:var(--xp-accent,var(--gold));font-size:12px;">' + (h.live ? 'Tap for your Year so far' : 'Tap to open Wrapped') + '</span>';
        row.onclick = function() { if (h.live) U.openYearSoFar(); else U.openWrappedReport(h.id); };
        box.appendChild(row);
      });
      b.appendChild(box);
    },
    // ── XP-6 UI ─────────────────────────────────────────────────────
    _treatsSection: function(b, sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      U._head(b, '🎁 Treats');
      var box = document.createElement('div'); box.id = 'xp-treats'; b.appendChild(box);
      var list = (T.treats || []).filter(function(t) { return t.status !== 'dropped'; });
      if (!list.length) {
        var e0 = document.createElement('div'); e0.style.cssText = 'font-size:13px;color:var(--muted);';
        e0.textContent = 'Promise yourself something real for a level, a rank, a kept resolution or a full week of challenges. Pick a Wishlist item or write your own.';
        box.appendChild(e0);
      }
      list.forEach(function(t) {
        var row = document.createElement('div'); row.className = 'xp-treat-row'; row.dataset.id = t.id; row.dataset.status = t.status;
        row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);';
        var earned = t.status === 'earned';
        row.innerHTML = '<span>' + (earned ? '🎁' : '⏳') + '</span><b style="min-width:120px;">' + U._esc(t.title) + '</b>' +
          '<span style="flex:1;min-width:150px;color:var(--muted);">' + U._esc(L.treatTarget(t, T)) + '</span>' +
          (earned ? '<span style="color:#4CAF82;font-weight:700;">Earned ' + U._esc(String(t.earned_at || '').slice(0, 10)) + (t.wishlist_item_id ? ' · buy it from your Wishlist when you\'re ready' : '') + '</span>' : '');
        if (!earned) {
          var rm = U._btn('Remove', 'xp-treat-drop'); rm.style.minHeight = '36px';
          rm.onclick = function() {
            if (!rm.dataset.armed) { rm.dataset.armed = '1'; rm.textContent = 'Tap again to remove'; setTimeout(function() { delete rm.dataset.armed; rm.textContent = 'Remove'; }, 3000); return; }
            rm.disabled = true;
            L.dropTreat(t.id).then(function() { RPGACE.utils.toast('Treat removed', '#4CAF82'); U.openSeason(); })
              .catch(function(e) { rm.disabled = false; RPGACE.utils.toast('Not removed: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
          };
          row.appendChild(rm);
        }
        box.appendChild(row);
      });
      var add = U._btn('+ Add treat', 'xp-add-treat'); add.style.marginTop = '6px';
      add.onclick = function() { U._treatForm(box, add, sum, T); };
      box.appendChild(add);
    },
    _treatForm: function(box, addBtn, sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      if (box.querySelector('.xp-treat-form')) return;
      var opt = L.treatOptions(sum, T);
      var f = document.createElement('div'); f.className = 'xp-treat-form';
      f.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:8px;';
      var field = 'padding:6px 8px;min-height:36px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:14px;width:100%;margin-top:2px;';
      var targets = [];
      opt.levels.forEach(function(n) { targets.push({ v: 'year_level|' + n, t: 'Year level ' + n }); });
      opt.ranks.forEach(function(r) { targets.push({ v: 'realm_rank|' + r.realm + '|' + r.idx, t: S.REALMS[r.realm].icon + ' ' + S.REALMS[r.realm].name + ': ' + r.name }); });
      opt.resolutions.forEach(function(c) { targets.push({ v: 'resolution|' + c.id, t: 'Resolution kept: ' + c.title }); });
      targets.push({ v: 'weekly_all3', t: 'A week with all 3 challenges done' });
      f.innerHTML = '<label style="font-size:12px;color:var(--muted);">From your Wishlist (optional)<select class="xp-treat-wish" style="' + field + '"><option value="">— write my own —</option></select></label>' +
        '<input class="xp-treat-title" placeholder="Treat, e.g. Meal out" style="' + field.replace('width:100%;margin-top:2px;', '') + '">' +
        '<label style="font-size:12px;color:var(--muted);">Earned when<select class="xp-treat-target" style="' + field + '">' +
        targets.map(function(x) { return '<option value="' + U._esc(x.v) + '">' + U._esc(x.t) + '</option>'; }).join('') + '</select></label>';
      var wish = f.querySelector('.xp-treat-wish'), title = f.querySelector('.xp-treat-title');
      RPGACE.sb.select('wishlist_items', 'select=id,name,estimated_price&status=eq.wanted&order=created_at.desc&limit=100').then(function(rows) {
        (rows || []).forEach(function(w) {
          var o = document.createElement('option'); o.value = w.id;
          o.textContent = w.name + (w.estimated_price ? ' (£' + w.estimated_price + ')' : ''); o.dataset.name = w.name;
          wish.appendChild(o);
        });
      }).catch(function() {});
      wish.onchange = function() { var o = wish.options[wish.selectedIndex]; if (o && o.dataset.name) title.value = o.dataset.name; };
      var save = U._btn('Save treat', 'xp-treat-save');
      save.onclick = function() {
        var name = title.value.trim();
        if (!name) { RPGACE.utils.toast('Name the treat or pick a Wishlist item', '#E2A83D'); return; }
        var p = f.querySelector('.xp-treat-target').value.split('|');
        var t = { title: name, kind: p[0], wishlistId: wish.value || null };
        if (p[0] === 'year_level') t.value = p[1];
        if (p[0] === 'realm_rank') { t.realm = p[1]; t.value = p[2]; }
        if (p[0] === 'resolution') t.challengeId = p[1];
        save.disabled = true;
        L.addTreat(t).then(function() { RPGACE.utils.toast('🎁 Treat set', '#4CAF82'); U.openSeason(); })
          .catch(function(e) { save.disabled = false; RPGACE.utils.toast('Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
      };
      f.appendChild(save);
      box.insertBefore(f, addBtn);
    },
    _budgetSection: function(b, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, lim = T.settings ? T.settings.weekly_spend_limit : null;
      U._head(b, '💷 Weekly spending limit (+50 Steward XP a week kept)');
      var box = document.createElement('div'); box.id = 'xp-budget';
      box.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;color:var(--text);';
      var now = document.createElement('div'); now.className = 'xp-budget-now'; now.style.cssText = 'flex-basis:100%;color:var(--muted);';
      now.textContent = lim != null ? 'Limit £' + lim + ' a week · checking this week…' : 'No limit set. Expenses you log in Chronicles are added up each week.';
      var inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.step = '1'; inp.id = 'xp-limit'; inp.placeholder = '£ a week';
      inp.value = lim != null ? lim : '';
      inp.style.cssText = 'width:120px;min-height:40px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-size:14px;';
      var save = U._btn(lim != null ? 'Update limit' : 'Set limit', 'xp-limit-save');
      save.onclick = function() {
        save.disabled = true;
        L.setWeeklyLimit(inp.value.trim()).then(function() { RPGACE.utils.toast(inp.value.trim() ? '💷 Weekly limit saved' : 'Weekly limit turned off', '#4CAF82'); U.openSeason(); })
          .catch(function(e) { save.disabled = false; RPGACE.utils.toast('Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
      };
      box.appendChild(now); box.appendChild(inp); box.appendChild(save);
      b.appendChild(box);
      if (lim != null) L.weekSpend().then(function(w) {
        var left = Math.round((Number(lim) - w.spent) * 100) / 100;
        now.textContent = 'This week: £' + w.spent + ' of £' + lim + (w.count ? (left >= 0 ? ' · £' + left + ' left' : ' · £' + (-left) + ' over') : ' · log at least one expense for the week to count');
      }).catch(function() { now.textContent = 'Limit £' + lim + ' a week'; });
    },
    _themesSection: function(b, sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, cur = (T.settings && T.settings.theme) || 'default';
      U._head(b, '🎨 Themes (profile card accent + frame)');
      var box = document.createElement('div'); box.id = 'xp-themes';
      box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      b.appendChild(box);
      S.THEMES.forEach(function(th) {
        var open = L.themeUnlocked(th, sum, T), on = th.key === cur;
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'xp-theme'; btn.dataset.theme = th.key;
        btn.disabled = !open || on;
        btn.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;cursor:' + (open && !on ? 'pointer' : 'default') + ';' +
          'background:var(--panel2);color:' + (open ? th.accent : 'var(--muted)') + ';border:' + (on ? th.frame.replace(/^\S+/, '2px') : '1px solid var(--border)') + ';opacity:' + (open ? '1' : '0.6') + ';';
        btn.textContent = (on ? '✓ ' : open ? '' : '🔒 ') + th.name + (open ? '' : ' · level ' + th.level);
        if (open && !on) btn.onclick = function() {
          btn.disabled = true;
          L.setTheme(th.key).then(function() { U.applyTheme(th.key); RPGACE.utils.toast('🎨 ' + th.name + ' on', '#4CAF82'); U.openSeason(); })
            .catch(function(e) { btn.disabled = false; RPGACE.utils.toast('Theme not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
        };
        box.appendChild(btn);
      });
    },
    // Accent colour + frame on the profile card only; the rest of the app is unchanged.
    applyTheme: function(key) {
      var th = RPGACE.modules.xpSeason.logic.themeFor(key);
      document.documentElement.style.setProperty('--xp-accent', th.accent);
      var head = document.querySelector('.char-header:not(.xp-rc-card)');
      if (head) { head.style.border = th.frame === 'none' ? '' : th.frame; head.style.borderRadius = th.frame === 'none' ? '' : '12px'; head.dataset.xpTheme = th.key; }
    },
    // Quiet flair: title in Oracle's greeting, one toast per batch of level/rank-ups.
    flair: function(sum, T) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var title = L.currentTitle(sum, T), first = document.querySelector('#chat-msgs .msg.ai');
      if (first) {
        var tag = first.querySelector('.xp-flair'), nm = first.querySelector('.ai-name');
        if (!tag) { tag = document.createElement('div'); tag.className = 'xp-flair'; tag.style.cssText = 'font-size:12px;color:var(--xp-accent,var(--gold));font-weight:700;margin-bottom:4px;'; first.insertBefore(tag, nm ? nm.nextSibling : first.firstChild); }
        tag.textContent = '✦ ' + (title ? title + ' · ' : '') + 'Level ' + sum.level.level;
      }
      var KEY = 'rpgace_xp_flair_seen', seen = null, now = new Date().toISOString();
      try { seen = localStorage.getItem(KEY); } catch (e) {}
      if (!seen) { try { localStorage.setItem(KEY, now); } catch (e) {} return; }
      var fresh = L.levelRanksSince(T, seen);
      if (!fresh.length) return;
      try { localStorage.setItem(KEY, fresh[fresh.length - 1].unlocked_at); } catch (e) {}
      RPGACE.utils.toast(L.flairText(fresh[fresh.length - 1]) + (fresh.length > 1 ? ' (+' + (fresh.length - 1) + ' more)' : ''), '#C9A84C', 4000);
    },
    // Morning Brief: one line for level/rank-ups in the last day.
    renderBriefInto: function(wrap) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      if (!wrap || !L.signedIn()) return Promise.resolve();
      return L.loadTrophies().then(function(T) {
        var since = new Date(Date.now() - 86400000).toISOString(), fresh = L.levelRanksSince(T, since);
        var old = document.getElementById('xp-brief-line'); if (old) old.remove();
        if (!fresh.length) return;
        var line = document.createElement('div'); line.id = 'xp-brief-line';
        line.style.cssText = 'margin-bottom:12px;padding:8px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--text);background:var(--panel2);';
        line.textContent = '🌌 Since yesterday: ' + fresh.map(L.flairText).join(', ');
        var anchor = document.getElementById('mb-output');
        if (anchor && anchor.parentNode === wrap) wrap.insertBefore(line, anchor); else wrap.appendChild(line);
      }).catch(function(e) { console.warn('[xpSeason] brief line failed', e && e.message); });
    },
    // Weekly picker: rule-based suggestions now, Oracle's 2 when they arrive.
    openChallengePicker: function() {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui, dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return null;
      var pop = dd._popup({ eyebrow: '🌌 Your Year', title: '🎯 This week\'s challenges', width: '560px', scroll: true });
      var b = pop.box; b.id = 'xp-picker';
      if (!L.signedIn()) { b.textContent = 'Sign in to pick challenges.'; return pop; }
      b.textContent = 'Loading…';
      Promise.all([L.load(true), L.loadTrophies(true)]).then(function(res) {
        var sum = L.summary(res[0] || []), T = res[1], ws = L.weekStart(L.today());
        var existing = L.weekChallenges(T, ws), taken = {};
        existing.forEach(function(c) { if (c.status === 'active' || c.status === 'done') taken[c.measure === 'xp' ? 'xp:' + c.realm : (c.metric_actions || [])[0]] = 1; });
        var slots = 3 - existing.filter(function(c) { return c.status === 'active' || c.status === 'done'; }).length;
        b.innerHTML = '';
        var intro = document.createElement('div'); intro.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
        intro.textContent = slots > 0 ? 'Pick ' + slots + '. Each pays +' + S.CHALLENGE_XP + ' XP the moment it\'s done; anything unfinished by Sunday night is just missed, no penalty.' : 'You already have 3 challenges this week.';
        b.appendChild(intro);
        if (slots <= 0) return;
        var list = document.createElement('div'); b.appendChild(list);
        var chosen = [];
        var go = U._btn('Start', 'xp-picker-go'); go.disabled = true;
        var refreshGo = function() { go.disabled = !chosen.length; go.textContent = chosen.length ? 'Start ' + chosen.length + ' challenge' + (chosen.length === 1 ? '' : 's') : 'Start'; };
        var addCard = function(c) {
          var meta = S.REALMS[c.realm] || { icon: '•', name: c.realm };
          var card = document.createElement('button');
          card.className = 'xp-sugg'; card.dataset.source = c.source;
          card.style.cssText = 'display:flex;width:100%;gap:8px;align-items:center;text-align:left;padding:9px 10px;min-height:44px;margin-bottom:6px;border:1px solid var(--border);border-radius:8px;background:none;color:var(--text);cursor:pointer;font-family:inherit;font-size:13px;';
          card.innerHTML = '<span>' + meta.icon + '</span><span style="flex:1;">' + U._esc(c.title) + (c.source === 'oracle' ? ' <span style="color:var(--gold);font-size:11px;">🔮 Oracle</span>' : '') +
            (c.why ? '<br><span style="color:var(--muted);font-size:12px;">' + U._esc(c.why) + '</span>' : '') + '</span><b style="color:var(--gold)">+' + S.CHALLENGE_XP + '</b>';
          card.onclick = function() {
            var i = chosen.indexOf(c);
            if (i >= 0) chosen.splice(i, 1); else if (chosen.length < slots) chosen.push(c); else { RPGACE.utils.toast('Pick ' + slots + ' at most', '#E2A83D'); return; }
            card.style.borderColor = chosen.indexOf(c) >= 0 ? 'var(--gold)' : 'var(--border)';
            card.dataset.picked = chosen.indexOf(c) >= 0 ? '1' : '0';
            refreshGo();
          };
          list.appendChild(card);
        };
        var oracleBox = document.createElement('div'); oracleBox.className = 'xp-oracle-note';
        oracleBox.style.cssText = 'font-size:12px;color:var(--muted);margin:2px 0 8px;';
        oracleBox.textContent = '🔮 Asking Oracle for 2 suggestions…';
        b.insertBefore(oracleBox, list);
        L.oracleSuggestions(sum, T, ws, taken).then(function(os) {
          oracleBox.textContent = os.length ? '' : os.ccQueued ? '🤖 Oracle\'s 2 ideas are being written by Orchestrator CC — they\'ll be here after the next pick-up.' : '🔮 Oracle had nothing to add this week.';
          os.forEach(addCard);
        }).catch(function() { oracleBox.textContent = '🔮 Oracle couldn\'t suggest right now; pick from these.'; })
          .then(function() { L.ruleSuggestions(sum, taken, 4).forEach(addCard); });
        // Your own one: always ticked by hand.
        var own = document.createElement('div'); own.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;';
        var ownIn = document.createElement('input'); ownIn.className = 'xp-own-title'; ownIn.placeholder = 'Or your own, e.g. Call Mum';
        ownIn.style.cssText = 'flex:1;min-width:160px;padding:6px 8px;min-height:36px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:14px;';
        var ownRealm = document.createElement('select'); ownRealm.className = 'xp-own-realm';
        ownRealm.style.cssText = 'padding:6px 8px;min-height:36px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:13px;';
        ownRealm.innerHTML = S.ORDER.map(function(r) { return '<option value="' + r + '">' + S.REALMS[r].icon + ' ' + S.REALMS[r].name + '</option>'; }).join('');
        var ownAdd = U._btn('+ Add', 'xp-own-add');
        ownAdd.onclick = function() {
          var t = ownIn.value.trim(); if (!t) return;
          var c = { realm: ownRealm.value, title: t.slice(0, 80), target: 1, source: 'alex', manual: true };
          addCard(c); ownIn.value = '';
          list.lastChild.click();
        };
        own.appendChild(ownIn); own.appendChild(ownRealm); own.appendChild(ownAdd);
        b.appendChild(own);
        go.onclick = function() {
          go.disabled = true;
          L.startChallenges(chosen, ws).then(function() {
            RPGACE.utils.toast('🎯 ' + chosen.length + ' challenge' + (chosen.length === 1 ? '' : 's') + ' started', '#4CAF82');
            pop.close(); U.renderCard();
          }).catch(function(e) { go.disabled = false; RPGACE.utils.toast('Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
        };
        b.appendChild(go);
      }).catch(function(e) { b.textContent = 'Challenges could not load: ' + (e.message || e); });
      return pop;
    },

    // XP-4: deleted-this-week items whose XP still counts. Yes keeps it,
    // No removes it; unanswered ones are kept when the week closes.
    _pendingBox: function(b, pend) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      if (!pend.length) return null;
      var box = document.createElement('div');
      box.id = 'xp-pending';
      box.style.cssText = 'border:1px solid rgba(226,168,61,0.45);background:rgba(226,168,61,0.08);border-radius:10px;padding:10px 12px;margin:12px 0 4px;';
      box.innerHTML = '<div style="font-weight:700;color:#E2A83D;margin-bottom:4px;">⏳ Deleted this week, still counted. Was it actually done?</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Not answered by Sunday night = the XP stays.</div>';
      pend.forEach(function(e) {
        var meta = S.REALMS[e.realm] || { icon: '•', name: e.realm };
        var row = document.createElement('div');
        row.className = 'xp-pending-row'; row.dataset.id = e.id;
        row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:5px 0;font-size:13px;color:var(--text);border-top:1px solid var(--border);';
        row.innerHTML = '<span style="flex:1;min-width:160px;">' + meta.icon + ' ' + U._esc(L.label(e.action)) + (e.note ? ' <span style="color:var(--muted)">· ' + U._esc(String(e.note).slice(0, 50)) + '</span>' : '') +
          ' <b style="color:var(--gold)">+' + e.xp + '</b> <span style="color:var(--muted)">' + U._esc(String(e.earned_on).slice(5)) + '</span></span>';
        [[true, '✅ Yes, it was done', 'xp-pending-yes'], [false, '❌ No', 'xp-pending-no']].forEach(function(opt) {
          var btn = document.createElement('button');
          btn.className = opt[2]; btn.textContent = opt[1];
          btn.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid var(--border);background:none;color:var(--text);border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;';
          btn.onclick = function() {
            row.querySelectorAll('button').forEach(function(x) { x.disabled = true; });
            L.answerPending(e.id, opt[0]).then(function() {
              row.remove();
              RPGACE.utils.toast(opt[0] ? '✅ Kept: +' + e.xp + ' XP' : '❌ Removed: ' + e.xp + ' XP', opt[0] ? '#4CAF82' : '#E2A83D');
              if (!box.querySelector('.xp-pending-row')) box.remove();
              U.renderCard();
            }).catch(function(err) {
              row.querySelectorAll('button').forEach(function(x) { x.disabled = false; });
              RPGACE.utils.toast('Answer not saved: ' + (err.message || err), '#CC4A4A', 4000, 'xpSeason');
            });
          };
          row.appendChild(btn);
        });
        box.appendChild(row);
      });
      b.appendChild(box);
      return box;
    },
    // XP-4: saved reports, newest first, filtered by Week/Month/Season/Year.
    _reportsSection: function(b, reports) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var h = document.createElement('div');
      h.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:14px 0 6px;';
      h.textContent = '📅 Reports';
      b.appendChild(h);
      var chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;';
      var list = document.createElement('div');
      list.id = 'xp-report-list';
      var kinds = [['week', 'Weeks'], ['month', 'Months'], ['season', 'Seasons'], ['year', 'Years']];
      var draw = function(kind) {
        chips.querySelectorAll('button').forEach(function(c) { var on = c.dataset.kind === kind; c.style.borderColor = on ? 'var(--gold)' : 'var(--border)'; c.style.color = on ? 'var(--gold)' : 'var(--muted)'; });
        list.innerHTML = '';
        var rows = reports.filter(function(r) { return r.kind === kind; });
        if (!rows.length) {
          var e0 = document.createElement('div');
          e0.style.cssText = 'font-size:13px;color:var(--muted);';
          e0.textContent = kind === 'week' ? 'Your first weekly report is saved early on Monday ' + L.nextWeekClose() + ', right after the week ends on Sunday night. Reports are frozen once saved.'
            : 'None yet. A ' + kind + ' report is saved the night that ' + kind + ' ends.';
          list.appendChild(e0);
          return;
        }
        rows.forEach(function(r) {
          var d = r.data || {};
          var row = document.createElement('button');
          row.className = 'xp-report-row'; row.dataset.kind = r.kind;
          row.style.cssText = 'display:flex;width:100%;gap:8px;align-items:baseline;text-align:left;padding:8px 4px;min-height:40px;background:none;border:none;border-bottom:1px solid var(--border);color:var(--text);cursor:pointer;font-family:inherit;font-size:13px;';
          row.innerHTML = '<span>' + L.reportIcon(r) + '</span><b style="flex:1;">' + U._esc(r.label) + '</b><span style="color:var(--gold)">' + (d.xp || 0) + ' XP</span><span style="color:var(--muted);min-width:70px;text-align:right;">' + (d.realms_touched || 0) + ' realms</span>';
          row.onclick = function() { U.openReport(r); };
          list.appendChild(row);
        });
      };
      kinds.forEach(function(k) {
        var c = document.createElement('button');
        c.dataset.kind = k[0]; c.textContent = k[1];
        c.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid var(--border);background:none;border-radius:16px;cursor:pointer;font-family:inherit;font-size:12px;';
        c.onclick = function() { draw(k[0]); };
        chips.appendChild(c);
      });
      b.appendChild(chips); b.appendChild(list);
      draw('week');
    },
    openReport: function(r) {
      var S = RPGACE.modules.xpSeason, L = S.logic, dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return null;
      var pop = dd._popup({ eyebrow: '📅 XP report', title: L.reportIcon(r) + ' ' + r.label, width: '560px' });
      pop.box.id = 'xp-report';
      L.reportRows(r).forEach(function(row) {
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);';
        el.innerHTML = '<b style="min-width:110px;color:var(--muted);">' + row[0] + '</b><span style="flex:1;min-width:180px;">' + row[1] + '</span>';
        pop.box.appendChild(el);
      });
      return pop;
    },

    // XP-3 Trophy cabinet: titles + gates, badges, revenue target, ranks by
    // season. Earned items show their date; locked ones show how + progress.
    openTrophies: function() {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return null;
      var pop = dd._popup({ eyebrow: '📜 Chronicles', title: '🏆 Trophy cabinet', width: '640px', scroll: true });
      pop.box.id = 'xp-trophies';
      if (!L.signedIn()) { pop.box.textContent = 'Sign in to see your trophies.'; return pop; }
      var render = function(force) {
        pop.box.textContent = 'Loading…';
        Promise.all([L.load(force), L.loadTrophies(force)]).then(function(res) {
          U._renderTrophies(pop.box, L.summary(res[0] || []), res[1], function() { render(true); });
        }).catch(function(e) { pop.box.textContent = 'Trophies could not load: ' + (e.message || e); });
      };
      render(true);
      return pop;
    },
    _renderTrophies: function(b, sum, T, refresh) {
      var S = RPGACE.modules.xpSeason, L = S.logic, U = S.ui;
      b.innerHTML = '';
      var head = function(t) {
        var h = document.createElement('div');
        h.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:14px 0 6px;';
        h.textContent = t; b.appendChild(h); return h;
      };
      var date = function(iso) { return String(iso || '').slice(0, 10); };
      var row = function(def, earned) {
        var r = document.createElement('div');
        r.className = 'xp-trophy'; r.dataset.key = def.key; r.dataset.earned = earned.length ? '1' : '0';
        r.style.cssText = 'display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);' + (earned.length ? '' : 'opacity:.75;');
        var meta = S.REALMS[def.realm] || { icon: '', name: def.realm };
        var prog = earned.length ? '' : L.progressText(T, def.key);
        r.innerHTML = '<span style="font-size:16px;">' + (earned.length ? (def.icon || '🏆') : '🔒') + '</span>' +
          '<b style="min-width:130px;">' + U._esc(def.name) + (earned.length > 1 ? ' ×' + earned.length : '') + '</b>' +
          '<span style="color:var(--muted);flex:1;min-width:160px;">' + U._esc(meta.icon + ' ' + meta.name) + ' · ' +
          (earned.length ? 'earned ' + U._esc(date(earned[0].unlocked_at)) + (earned[0].proof ? ' · ' + U._esc(earned[0].proof) : '') + (earned[0].note ? ' · ' + U._esc(earned[0].note) : '')
                         : U._esc(def.how) + (prog ? ' · <span class="xp-progress" style="color:var(--text)">' + U._esc(prog) + '</span>' : '')) + '</span>';
        if (!def.auto && (!earned.length || def.kind !== 'gate')) {
          var c = document.createElement('button');
          c.className = 'xp-claim'; c.textContent = earned.length ? '+ Claim again' : 'Claim';
          c.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid var(--border);background:none;color:var(--text);border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;';
          c.onclick = function() { U._claimForm(r, def, refresh); };
          r.appendChild(c);
        }
        b.appendChild(r);
      };
      var nonRank = T.unlocks.filter(function(u) { return u.kind !== 'rank' && u.kind !== 'career_rank' && u.kind !== 'level'; });
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.5;';
      intro.textContent = nonRank.length + ' earned so far. Titles and badges are permanent. Locked rank gates (🔒) stop a realm rank until the real thing happens; claims need a link or a note.';
      b.appendChild(intro);

      head('Titles & rank gates');
      T.defs.filter(function(d) { return d.kind !== 'badge'; }).forEach(function(d) { row(d, L.earnedFor(T, d.key)); });

      var tgt = document.createElement('div');
      tgt.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:var(--muted);';
      tgt.innerHTML = '<label for="xp-rev-target">Monthly income target (£) — Tycoon\'s year target is 12×</label>';
      var inp = document.createElement('input');
      inp.id = 'xp-rev-target'; inp.type = 'number'; inp.min = '0'; inp.step = '1';
      var mo = L.monthlyOf(T.settings); inp.value = mo != null ? mo : '';
      inp.style.cssText = 'width:110px;padding:6px 8px;min-height:36px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:14px;';
      var sv = document.createElement('button');
      sv.id = 'xp-rev-save'; sv.textContent = 'Save target';
      sv.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid var(--border);background:none;color:var(--text);border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;';
      sv.onclick = function() {
        var v = inp.value === '' ? null : Math.max(0, Number(inp.value) || 0);
        sv.disabled = true;
        L.setMonthlyTarget(v).then(function() { RPGACE.utils.toast('💰 Target saved', '#4CAF82'); refresh(); })
          .catch(function(e) { sv.disabled = false; RPGACE.utils.toast('Target not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
      };
      tgt.appendChild(inp); tgt.appendChild(sv);
      b.appendChild(tgt);

      head('Badges');
      T.defs.filter(function(d) { return d.kind === 'badge'; }).forEach(function(d) {
        if (d.key === 'new_country') {
          var got = L.earnedFor(T, 'new_country');
          if (!got.length) { row(d, []); return; }
          got.forEach(function(u) { row({ key: u.key, kind: 'badge', realm: 'explorer', name: u.name, how: d.how, auto: true, icon: d.icon }, [u]); });
          return;
        }
        row(d, L.earnedFor(T, d.key));
      });

      head('Realm ranks');
      var rr = document.createElement('div');
      rr.style.cssText = 'font-size:13px;color:var(--text);line-height:1.7;';
      rr.innerHTML = S.ORDER.map(function(r) {
        var rk = L.realmRanks(sum, T, r); if (!rk) return '';
        return '<div class="xp-rank-row" data-realm="' + r + '">' + S.REALMS[r].icon + ' <b>' + U._esc(S.REALMS[r].name) + '</b>: ' + U._esc(rk.season.name) +
          ' <span style="color:var(--muted)">(this year) · career ' + U._esc(rk.career.name) + '</span> <span style="color:var(--gold)">' + U.stars(rk.career.stars) + '</span></div>';
      }).join('');
      b.appendChild(rr);

      head('🏛 Hall of Seasons');
      var bySeason = {};
      T.unlocks.filter(function(u) { return u.kind === 'rank'; }).forEach(function(u) {
        var k = Number(u.season), cur = (bySeason[k] = bySeason[k] || {});
        var lad = T.ladders[u.realm] || [], idx = 0;
        lad.forEach(function(l) { if (l.name === u.name) idx = l.idx; });
        if (!cur[u.realm] || idx > cur[u.realm].idx) cur[u.realm] = { idx: idx, name: u.name, at: u.unlocked_at };
      });
      // XP-8: one row per year (this year so far first), each opening its Wrapped.
      U._hallSection(b, sum, T, bySeason);
      if (!(T.reports || []).some(function(r) { return r.kind === 'year'; })) {
        var ps = document.createElement('div');
        ps.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.6;';
        ps.textContent = 'When a year ends on 31 December, its Wrapped and the highest rank you reached in each realm are kept here.';
        b.appendChild(ps);
      }
    },
    _claimForm: function(rowEl, def, refresh) {
      var S = RPGACE.modules.xpSeason, L = S.logic;
      if (rowEl.querySelector('.xp-claim-form')) return;
      var f = document.createElement('div');
      f.className = 'xp-claim-form';
      f.style.cssText = 'flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;';
      var inp = document.createElement('input');
      inp.className = 'xp-claim-proof';
      inp.placeholder = 'Link or a short note (what happened)';
      inp.style.cssText = 'flex:1;min-width:180px;padding:6px 8px;min-height:36px;border:1px solid var(--border);border-radius:6px;background:var(--panel2);color:var(--text);font-family:inherit;font-size:14px;';
      var ok = document.createElement('button');
      ok.className = 'xp-claim-save'; ok.textContent = 'Save claim';
      ok.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid rgba(76,175,130,0.4);background:rgba(76,175,130,0.1);color:var(--green, #4CAF82);border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;';
      ok.onclick = function() {
        var proof = inp.value.trim();
        if (!proof) { RPGACE.utils.toast('Add a link or a note first', '#E2A83D'); return; }
        ok.disabled = true;
        L.claim(def, proof.slice(0, 500)).then(function() { RPGACE.utils.toast('🏆 ' + def.name + ' claimed', '#4CAF82'); refresh(); })
          .catch(function(e) { ok.disabled = false; RPGACE.utils.toast('Claim not saved: ' + (e.message || e), '#CC4A4A', 4000, 'xpSeason'); });
      };
      f.appendChild(inp); f.appendChild(ok);
      rowEl.appendChild(f);
      inp.focus();
    },
  },

  openSeason: function() { return this.ui.openSeason(); },
  openTrophies: function() { return this.ui.openTrophies(); },
  openReport: function(r) { return this.ui.openReport(r); },
  openChallengePicker: function() { return this.ui.openChallengePicker(); },
  openYearSoFar: function() { return this.ui.openYearSoFar(); },
});
/* ===END:xpSeason=== */
