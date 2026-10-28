
/* ===MODULE:careerStatCard=== */
// July 22 GODMODE finding: the profile card's HP/MP bars are 100% inert
// (hardcoded widths, never touched by any function anywhere in main.js or
// this file - confirmed by grep, not assumed) and "Streak" is a hardcoded
// literal "1", also never updated. XP/Level/"Done" DO have real code
// (STATE.xp/totalXP/tasksCompleted, addXP(), levelUp() in main.js) but
// STATE lives only in memory with zero persistence anywhere (no
// localStorage, no Supabase write) - it silently resets to zero on every
// single page load. Meanwhile real, persisted evidence of career-path
// progress already sits unused in Supabase: content_productions (the
// actual governing-rule metric - beats/videos actually shipped),
// journal, encyclopedia_insights, taxonomy_proposals, bookworm_chapters,
// reference_tracks. This module replaces the inert/ephemeral numbers with
// a real, honestly-computed career score derived from that real data,
// re-rendered on every load - nothing here is faked to look better than
// it is. Confirmed via direct Supabase query (not guessed) that
// content_productions currently has 0 rows actually posted to a real
// platform - the Output lane will genuinely read 0 until that changes.
// That is deliberate, not a bug: inflating it would just be a shinier
// version of the exact problem being fixed.
//
// Council of 5 "why not to build this" considered and addressed:
// - Goodhart's-law risk (gaming the tree for XP instead of shipping real
//   content) is why Output (real shipped content) and Growth (learning/
//   knowledge-tree activity) are kept as SEPARATE lanes, not one blended
//   number - Alex can see at a glance whether he's actually shipping or
//   just building/studying, matching CLAUDE.md's own governing-rule
//   structure (shipping is primary; RPGACE-building is a named exception)
//   instead of smoothing the two together into one misleading composite.
// - Considered and explicitly rejected: variable-ratio/randomised reward
//   schedules (the mobile-game "loot box" pattern) - genuinely effective
//   at driving compulsive engagement, but that's an anti-pattern for a
//   personal productivity tool whose own governing rule is about real
//   output, not engagement-farming. Not built, on purpose.
// - bookworm_chapters is counted toward the cumulative Growth total but
//   deliberately EXCLUDED from the streak calculation and the recent-wins
//   feed: confirmed via direct query that all of a book's chapter rows
//   share one bulk-insert created_at timestamp from TOC detection, not
//   the real per-chapter analysis time - using it for "recent activity"
//   would show a misleading date.
// - LEVEL_TITLES/xp bands are a deliberate LOCAL copy of main.js's real
//   ones, not a live cross-script reference - main.js is frozen and its
//   top-level consts aren't meant to be reached into from here; a small
//   duplicated array is more robust and easier for a future session to
//   follow than relying on classic-script global-scope leakage.
RPGACE.register('careerStatCard', {
  domain: 'chronicles',
  // WEIGHTS / LEVEL_TITLES / CUM_BANDS (the old row-count career score)
  // removed Oct 13 2026 (XP-1): XP now lives in the xp_events ledger,
  // painted by xpSeason.

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), batch 16, module 47 of 60 — real, ratified /CEO plan
  // item: split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 3 ui (_render, _detailFor, _showDetail) / 9 logic
  // (_fetchAll, _isShipped, _dateStr, _computeStreak, _relTime, _levelFor,
  // _buildItems, _proposalShortName, _esc).
  //
  // Classification rule used, identical to every prior batch: a function
  // lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM (document.*,
  // createElement, getElementById, querySelector, innerHTML); otherwise in
  // `logic`. Plus videoSummary's own named extension: a function that
  // returns a markup STRING destined for `.innerHTML` counts as
  // constructing DOM and lives in `ui`, even where it names no document.*
  // API.
  //
  // The genuinely non-obvious calls, each named with the real evidence
  // rather than silently classified:
  //   • logic._fetchAll is the clean fetch/render-seam case this series
  //     already established: the seam ALREADY exists as two separate named
  //     functions in the source, and _fetchAll is independently reachable
  //     (chroniclesLog.logic._render and the boot prefetch at the top of
  //     this file both call it directly and never render from it). It
  //     returns a plain data object and touches no DOM at all.
  //   • ui._detailFor is classified on the markup-string extension, not on
  //     the primary DOM rule: it names no document.* API, but several of
  //     its branches build real `'<a href="…"` markup (the proposal
  //     source line, both bibliography `whereStored`/`linkStored` lines)
  //     and its ENTIRE return value is fed straight into `.innerHTML` by
  //     ui._showDetail. Reading the primary rule literally would have put
  //     the whole detail-popup render layer into `logic`.
  //   • logic._esc is the deliberate counter-example that keeps that
  //     extension honest, and the exact same call videoSummary.logic._esc
  //     was already classified on: a bare RPGACE.utils.escapeHtml
  //     delegation (a pure string→string transform — verified by direct
  //     read, it is a 4-step regex replace, not a createElement trick)
  //     that builds no markup of its own.
  //   • logic._buildItems builds a plain JS array of `{t, icon, label,
  //     type, row}` objects — data, never markup, never handed to a DOM
  //     element here. Its consumers (chroniclesLog.ui._renderList, its own
  //     _openCard preview) do the real rendering.
  //
  // Real shared-state check, done directly rather than assumed: the ONE
  // runtime-written module field in this module is `_inflightFetch` — and
  // unlike chroniclesLog._allItems / journalQoL._activeSource, it IS a
  // real declared top-level key (`_inflightFetch: null`, kept at module
  // scope below, deliberately NOT nested inside `logic`). A whole-body
  // grep for `self\.X =` / `this\.X =` found no other runtime-assigned
  // field anywhere in the module. It is read and written only by
  // logic._fetchAll, whose module handle is `RPGACE.modules.careerStatCard`
  // — so the July 23 request-storm dedup guard still collapses concurrent
  // callers onto ONE shared promise. Getting this wrong (a stray `this.`
  // inside the moved _fetchAll) would have made each namespace hold its
  // own disconnected lock and silently reinstated the exact 8-calls-times-
  // 4-waves storm that guard was built to stop.
  //
  // One `this`-rebinding subtlety worth stating outright, because it is
  // the only cross-namespace data handoff here: ui._render sets
  // `data.self = self` so logic._computeStreak can reuse _dateStr without
  // rebinding (a pre-existing pattern, unchanged). `self` there is now the
  // MODULE, so `data.self._dateStr(...)` lands on the top-level
  // pass-through and is routed into `logic` correctly. Had ui._render kept
  // a bare `this`, `data.self` would have been the `ui` sub-object and
  // `_dateStr` would have been undefined — a real, silent streak-
  // computation crash.
  //
  // Real, load-bearing external touchpoints, all confirmed by grep and all
  // preserved by the pass-throughs below (three distinct reference forms,
  // checked separately per the standing two-greps discipline):
  //   • rpgace_core.js:5377-5378 — the boot-task prefetch, via this file's
  //     own `R` alias for RPGACE: `R.modules.careerStatCard._fetchAll()`.
  //   • rpgace_core.js:32497 / :32499 — chroniclesLog.ui._renderList calls
  //     `RPGACE.modules.careerStatCard._relTime(it.t)` and
  //     `._showDetail(it)` directly.
  //   • rpgace_core.js:32569 / :32608 — chroniclesLog.ui._openCard and
  //     chroniclesLog.logic._render each take a local alias
  //     (`var csc = RPGACE.modules.careerStatCard;`) and call
  //     `csc._fetchAll()`, `csc._isShipped(r)`, `csc._buildItems(...)`
  //     through it.
  // No reference exists in index.html or any other file (checked), and no
  // dynamic `RPGACE.modules['careerStatCard']` bracket lookup exists.
  // METHOD_MODULE_MAP (G109, near the foot of this file) names 10 of these
  // methods — it maps METHOD NAMES to a module and is unaffected by an
  // internal namespace move, since every name is preserved exactly.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    // Aug 22 (/Routine item 1, boot-lag diagnosis) — this used to call
    // self._render() directly AND register it as a boot task, running the
    // same real render pass twice on every login. Real network cost is
    // already shared (the July 23 _inflightFetch guard collapses the 2nd
    // call's _fetchAll() onto the first's still-pending promise), but the
    // 2nd render pass and its own bookkeeping were genuinely redundant -
    // removed. registerBootTask alone is the correct real gate per this
    // file's own BOOT TASK GATE design 3 modules up (July 24): it already
    // guarantees this runs before the boot overlay hides.
    RPGACE.registerBootTask(function() { return self._render(); });
    RPGACE.hooks.on('xp:awarded', function() { self._render(); });
    RPGACE.hooks.on('page:show', function() { self._render(); });
  },

  // July 23 — real bug found while investigating a reported 10-20s post-
  // login freeze (worse on mobile: couldn't scroll at all; on desktop,
  // nav/cards wouldn't click but the page could still scroll). Traced the
  // real call pattern: init() calls _fetchAll() immediately, again at
  // 1500ms, and again on every single page:show - plus the new July 23
  // boot-loader prefetch calls it once more before login even completes.
  // Multiple waves of 8 Supabase calls each, fired close enough together
  // that NONE of them can benefit from RPGACE.cache yet (a cache entry
  // only exists once a call actually resolves) - up to 32 near-simultaneous
  // requests to the same origin. Browsers cap concurrent connections per
  // origin (~6 in Chrome), so the later calls queue behind the earlier
  // ones - on a slower/higher-latency mobile connection this queueing
  // alone could plausibly stretch into many real seconds. Deduplicating
  // concurrent calls to share one real in-flight request fixes this
  // directly, regardless of whether it's the whole story.
  _inflightFetch: null,

  // ============================================================
  // logic — business logic/data: the shared Supabase fetch and its
  // in-flight dedup lock, the pure predicates/formatters, the level-band
  // lookup, and the timeline item-list builder. Constructs and discovers
  // no DOM, and builds no markup string (see the rule extension above).
  // ============================================================
  logic: {

  _fetchAll: function() {
    var self = RPGACE.modules.careerStatCard;
    if (self._inflightFetch) return self._inflightFetch;
    var sb = RPGACE.sb;
    var safe = function(p) { return p.catch(function() { return []; }); };
    self._inflightFetch = Promise.all([
      safe(sb.select('content_productions', 'select=con_id,status,youtube_url,instagram_url,tiktok_url,title,idea,notes,created_at&order=created_at.desc&limit=200')),
      safe(sb.select('journal', 'select=title,content,source,created_at&order=created_at.desc&limit=200')),
      safe(sb.select('encyclopedia_insights', 'select=source_entry_title,insight_text,macro_category,micro_categories,created_at&order=created_at.desc&limit=200')),
      safe(sb.select('taxonomy_proposals', 'select=proposed_path,proposed_steps,phylum_number,source_type,source_id,reviewed_at,created_at&status=eq.accepted&order=created_at.desc&limit=200')),
      safe(sb.select('bookworm_chapters', 'select=chapter_title,status,created_at&status=eq.complete&order=created_at.desc&limit=200')),
      safe(sb.select('reference_tracks', 'select=title,artist,bpm,key,scale,energy,mood,genre,notes,analysed,created_at&order=created_at.desc&limit=200')),
      // Chronicles finance ledger (July 22, chronicles_spec_backlog.txt) -
      // deliberately NOT folded into the totalXP/growthTotal weights below.
      // Confirmed via interrogation: this is a separate visibility lane,
      // not part of the career-score formula.
      safe(sb.select('chronicles_finance', 'select=*&order=entry_date.desc,created_at.desc&limit=500')),
      // Claude Code / RPGACE system updates (July 22) - every real dev-session
      // change to RPGACE now gets a row here too, so Chronicles is a single
      // real timeline of BOTH Alex's own actions AND what Claude Code shipped
      // on the app, per Alex's explicit "make these updates known in
      // chronicles from now on." See CLAUDE.md's "Chronicles system-update
      // logging" rule for the standing convention future sessions follow.
      safe(sb.select('system_updates', 'select=*&order=created_at.desc&limit=200')),
      // Bibliography — completed books (A15, Aug 23 2026). A row only ever
      // exists here because bookworm._markBookComplete() inserted it, and
      // completed_at is NOT NULL DEFAULT now() (verified against the live
      // schema) — so every row is genuinely a finished book and no
      // completed_at=not.is.null filter is needed. This is the real
      // "links between supatables" row type: the row already carries
      // total_insights_placed + phyla_touched, so the detail popup can
      // show which real taxonomy phyla a book's insights landed in
      // without a single new write or a second query.
      safe(sb.select('bibliography', 'select=id,book_id,title,source_url,total_chapters,total_insights_placed,phyla_touched,completed_at&order=completed_at.desc&limit=200')),
      // Oct 10 2026 (D1, one life timeline): completed quests and finished
      // cooks join the same feed. Display only - not in the XP weights.
      safe(sb.select('quest_log', 'select=name,description,category,xp,completed_at&status=eq.completed&completed_at=not.is.null&order=completed_at.desc&limit=200')),
      safe(sb.select('planned_cooks', 'select=id,recipe_ids,scheduled_at,created_at&status=eq.cooked&order=scheduled_at.desc&limit=200')),
      safe(sb.select('gym_sessions', 'select=id,performed_on,duration_min,notes,created_at,gym_sets(exercise,reps,weight_kg)&order=performed_on.desc&limit=200')),
      // Oct 13 2026 (LL-8): finished trips and plans. plans is a private
      // table (no anon policy), so this reads through tripPlans' signed-in
      // proxy and is simply empty before login. Dropped plans never show.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('plans', 'select=id,title,destination,country,start_date,end_date,summary,created_at,updated_at&status=eq.done&order=end_date.desc.nullslast&limit=200') : Promise.resolve([])),
      // Oct 13 2026 (XP-3): ranks, titles, badges and gates earned, each a
      // dated life event. Private table, read after sign-in like plans.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('xp_unlocks', 'select=key,kind,realm,name,season,status,proof,note,unlocked_at&order=unlocked_at.desc&limit=300') : Promise.resolve([])),
      // XP-4: season (UK weather) and year XP reports, as Alex chose
      // ("seasons + year"); weekly/monthly ones stay on the Year page.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('xp_reports', 'select=id,kind,period_start,period_end,label,data&kind=in.(season,year)&order=period_start.desc&limit=100') : Promise.resolve([])),
      // XP-5: completed challenges, kept resolutions and realm quest steps.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('xp_challenges', 'select=id,kind,title,realm,xp,target,progress,period_start,period_end,done_at,step_key&status=eq.done&order=done_at.desc&limit=300') : Promise.resolve([])),
      // XP-6: treats earned (the promise kept to yourself).
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('xp_treats', 'select=*&status=eq.earned&order=earned_at.desc&limit=200') : Promise.resolve([])),
      // XP-7: outreach sent and collabs done.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('outreach_log', 'select=*&order=done_on.desc&limit=300') : Promise.resolve([])),
      // DN-6: finished Doing Now activities (sectioned by realm in _buildItems).
      safe(sb.select('rpgace_agendas', 'select=id,title,started_at,ended_at,actual_mins,realms,details,place&source_type=eq.doing_now&completed=eq.true&order=started_at.desc&limit=300')),
      // PC-7 (Oct 17 2026): posted posts, one Chronicles entry each. Private table.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('posts', 'select=id,title,kind,idea_id,beat_id,plan,platforms,links,record_mins,edit_mins,files,created_at,planned_at,ready_at,posted_at&stage=eq.posted&posted_at=not.is.null&order=posted_at.desc&limit=200') : Promise.resolve([])),
      // SH-7 (Oct 17 2026): agreed sales (pitch_sends history), one entry each, not money.
      safe(RPGACE.modules.sellingHub ? RPGACE.modules.sellingHub.logic.loadAgreed() : Promise.resolve([])),
      // Study (Oct 20 2026): finished exam-practice rounds.
      safe(sb.select('study_sessions', 'select=id,mode,domain,total,correct,score,by_domain,finished_at&finished_at=not.is.null&order=finished_at.desc&limit=200')),
      // DR-6 (Oct 27 2026): one-off events saved as memories. Private table.
      safe(RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('memories', 'select=*&status=eq.kept&order=happened_on.desc&limit=300') : Promise.resolve([]))
    ]).then(function(results) {
      var cooks = Array.isArray(results[10]) ? results[10] : [];
      // LL-8: name the recipes on each finished cook (one small lookup).
      var ids = {};
      cooks.forEach(function(c) { (c.recipe_ids || []).forEach(function(id) { if (id) ids[id] = 1; }); });
      var idList = Object.keys(ids);
      var titles = idList.length
        ? safe(sb.select('recipes', 'select=id,title&id=in.(' + idList.join(',') + ')'))
        : Promise.resolve([]);
      // PC-7: the idea each posted post came from (its date opens the report).
      var ideaIds = (Array.isArray(results[19]) ? results[19] : []).map(function(p) { return p.idea_id; }).filter(Boolean);
      var ideaRows = ideaIds.length
        ? safe(sb.select('conid_pot', 'select=id,title,created_at&id=in.(' + ideaIds.join(',') + ')'))
        : Promise.resolve([]);
      return Promise.all([titles, ideaRows]).then(function(both) {
        var recipeTitles = {}, postIdeas = {};
        (Array.isArray(both[0]) ? both[0] : []).forEach(function(r) { recipeTitles[r.id] = r.title; });
        (Array.isArray(both[1]) ? both[1] : []).forEach(function(r) { postIdeas[r.id] = r; });
        return { results: results, recipeTitles: recipeTitles, postIdeas: postIdeas };
      });
    }).then(function(pack) {
      var results = pack.results;
      return {
        recipeTitles: pack.recipeTitles,
        postIdeas: pack.postIdeas || {},
        posts: Array.isArray(results[19]) ? results[19] : [],
        agreed: Array.isArray(results[20]) ? results[20] : [],
        trips: Array.isArray(results[12]) ? results[12] : [],
        unlocks: Array.isArray(results[13]) ? results[13] : [],
        xpReports: Array.isArray(results[14]) ? results[14] : [],
        challenges: Array.isArray(results[15]) ? results[15] : [],
        treats: Array.isArray(results[16]) ? results[16] : [],
        outreach: Array.isArray(results[17]) ? results[17] : [],
        doing: Array.isArray(results[18]) ? results[18] : [],
        content: Array.isArray(results[0]) ? results[0] : [],
        journal: Array.isArray(results[1]) ? results[1] : [],
        insights: Array.isArray(results[2]) ? results[2] : [],
        proposals: Array.isArray(results[3]) ? results[3] : [],
        chapters: Array.isArray(results[4]) ? results[4] : [],
        tracks: Array.isArray(results[5]) ? results[5] : [],
        finance: Array.isArray(results[6]) ? results[6] : [],
        systemUpdates: Array.isArray(results[7]) ? results[7] : [],
        bibliography: Array.isArray(results[8]) ? results[8] : [],
        quests: Array.isArray(results[9]) ? results[9] : [],
        cooks: Array.isArray(results[10]) ? results[10] : [],
        gym: Array.isArray(results[11]) ? results[11] : [],
        study: Array.isArray(results[21]) ? results[21] : [],
        memories: Array.isArray(results[22]) ? results[22] : []
      };
    });
    // Clear the in-flight lock once settled (success or failure) so a
    // later real refresh (cache expired, 60s+ later) can fetch again -
    // this dedup is only meant to collapse calls that land in the same
    // narrow window, not permanently share one stale result.
    self._inflightFetch.then(function() { self._inflightFetch = null; }, function() { self._inflightFetch = null; });
    return self._inflightFetch;
  },

  // LL-8: recipe titles for a finished cook, in recipe_ids order. A recipe
  // deleted since the cook has no title and is left out.
  _cookNames: function(r, titles) {
    titles = titles || {};
    return (r.recipe_ids || []).map(function(id) { return titles[id]; }).filter(Boolean);
  },

  _isShipped: function(row) {
    return !!(row.youtube_url || row.instagram_url || row.tiktok_url || (row.status && /posted/i.test(row.status)));
  },

  _dateStr: function(iso) { return iso ? iso.slice(0, 10) : null; },


  _relTime: function(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  },


  // July 22, round 3: renamed "Recent Wins" -> "The Chronicles" (Alex's own
  // name for the whole group), and added a real "View Full Log" nav button
  // - the group's real expand point, opening the new dedicated
  // #page-chronicles page (chroniclesLog module) rather than growing this
  // dashboard preview indefinitely. See chronicles_spec_backlog.txt.
  // July 22, round 2: Alex's real complaint was the taxonomy rows in this
  // feed all read as the same generic "Taxonomy insight placed" line with
  // nothing to click into. taxonomy_proposals actually stores rich real
  // content per row (proposed_path, proposed_steps.insightText/synthesis/
  // justification/confidenceScore, source_type/source_id) - it was just
  // never being read. Each feed row is now a real DOM node (not an innerHTML
  // string) carrying its full source row, clickable into a detail popup
  // built from RPGACE.modules.dashDeck._popup (the one shared overlay
  // helper that already exists in this file - reused rather than hand-
  // rolling a second one, per the standing "grep before new UI behaviour,
  // this project has a history of duplicate implementations" rule).
  // Shared by the Chronicles dashboard-card popup (chroniclesLog._openCard,
  // top 5) and the full Chronicles log page (chroniclesLog, all of them) -
  // one place builds the item list so both surfaces can never drift out of sync.
  _buildItems: function(data, shipped, ideas) {
    var self = RPGACE.modules.careerStatCard;
    var items = [];
    shipped.forEach(function(r) { items.push({ t: r.created_at, icon: '🚀', label: 'Shipped: ' + (r.title || 'content'), type: 'content_shipped', row: r }); });
    ideas.forEach(function(r) { items.push({ t: r.created_at, icon: '💡', label: 'Idea logged: ' + (r.title || 'content'), type: 'content_idea', row: r }); });
    data.journal.forEach(function(r) { items.push({ t: r.created_at, icon: '📓', label: 'Journal: ' + (r.title || 'entry'), type: 'journal', row: r }); });
    data.insights.forEach(function(r) { items.push({ t: r.created_at, icon: '🧠', label: 'Insight: ' + (r.source_entry_title || 'captured'), type: 'insight', row: r }); });
    data.proposals.forEach(function(r) { items.push({ t: r.created_at, icon: '🌳', label: 'Taxonomy: ' + self._proposalShortName(r), type: 'proposal', row: r }); });
    data.tracks.forEach(function(r) { items.push({ t: r.created_at, icon: '🎧', label: 'Reference logged: ' + (r.title || 'track'), type: 'track', row: r }); });
    (data.finance || []).forEach(function(r) {
      var isSale = r.type === 'sale', shl = RPGACE.modules.sellingHub;
      items.push({ t: r.created_at, icon: isSale ? '💰' : '🧾', label: isSale && shl ? shl.logic.saleLabel(r) : (isSale ? 'Sale: ' : 'Expense: ') + (r.item || r.category) + ' (£' + r.amount + ')', type: isSale ? 'finance_sale' : 'finance_expense', row: r });
    });
    // SH-7: an agreed sale is its own entry (the money comes later, when paid).
    (data.agreed || []).forEach(function(e) {
      items.push({ t: e.t, icon: '✅', label: e.label, type: 'agreed_sale', row: e });
    });
    (data.systemUpdates || []).forEach(function(r) {
      items.push({ t: r.created_at, icon: '🛠️', label: 'Claude Code: ' + (r.title || 'system update'), type: 'system_update', row: r });
    });
    (data.quests || []).forEach(function(r) {
      items.push({ t: r.completed_at, icon: '⚔️', label: 'Quest done: ' + (r.name || 'quest'), type: 'quest', row: r });
    });
    (data.gym || []).forEach(function(r) {
      var ex = {}; (r.gym_sets || []).forEach(function(x) { ex[x.exercise] = 1; });
      var names = Object.keys(ex);
      items.push({ t: r.performed_on ? r.performed_on + 'T12:00:00' : r.created_at, icon: '🏋️', label: 'Gym: ' + (names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) : '') : 'session'), type: 'gym', row: r });
    });
    (data.study || []).forEach(function(r) {
      var M = RPGACE.modules.studyHub ? RPGACE.modules.studyHub.logic.MODES : {};
      items.push({ t: r.finished_at, icon: '🎓', label: 'Exam practice: ' + r.correct + '/' + r.total + ' · ' + ((M[r.mode] || {}).label || r.mode).replace(/^\S+\s/, ''), type: 'study', row: r });
    });
    (data.cooks || []).forEach(function(r) {
      var names = self._cookNames(r, data.recipeTitles);
      var n = (r.recipe_ids || []).length;
      var label = names.length
        ? 'Cooked: ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) : '')
        : 'Cooked: ' + n + ' recipe' + (n === 1 ? '' : 's');
      items.push({ t: r.scheduled_at || r.created_at, icon: '🍳', label: label, type: 'cook', row: r, names: names });
    });
    // DR-6: a memory (a one-off event that happened), under its date.
    (data.memories || []).forEach(function(r) {
      items.push({ t: r.happened_on + 'T12:00:00', icon: '🎞', label: 'Memory: ' + r.title + (r.note ? ' — ' + String(r.note).slice(0, 60) : ''), type: 'memory', row: r });
    });
    // LL-8: a finished trip or plan (status 'done') is a real life event.
    (data.trips || []).forEach(function(r) {
      var place = r.destination || r.country || '';
      items.push({ t: r.end_date ? r.end_date + 'T12:00:00' : (r.updated_at || r.created_at), icon: '✈️',
        label: 'Trip done: ' + (r.title || place || 'plan') + (place && r.title && r.title.indexOf(place) === -1 ? ' (' + place + ')' : ''),
        type: 'trip', row: r });
    });
    // XP-5: every completed challenge, kept resolution and realm quest step.
    (data.challenges || []).forEach(function(r) {
      var pre = { weekly: 'Challenge done: ', resolution: 'Resolution kept: ', realm_quest: 'Quest step: ' }[r.kind] || 'Done: ';
      items.push({ t: r.done_at, icon: r.kind === 'resolution' ? '🏁' : r.kind === 'realm_quest' ? '🗺' : '🎯', label: pre + r.title + ' (+' + r.xp + ' XP)', type: 'challenge', row: r });
    });
    // XP-7: outreach and collabs.
    (data.outreach || []).forEach(function(r) {
      items.push({ t: r.done_on + 'T12:00:00', icon: r.kind === 'collab' ? '🤝' : '📤', label: (r.kind === 'collab' ? 'Collab: ' : 'Outreach: ') + r.who, type: 'outreach', row: r });
    });
    // DN-6: finished Doing Now activities; cook/gym-linked ones already show as a cook or gym entry.
    var dn = RPGACE.modules.doingNow;
    // PC-7: a posted post is one entry; its record/edit sessions live in its report.
    var ph = RPGACE.modules.postingHub, postedIds = {};
    (data.posts || []).forEach(function(r) {
      postedIds[r.id] = 1;
      items.push({ t: r.posted_at, icon: '📣', label: ph ? ph.logic.chronicleLabel(r) : 'Posted: ' + (r.title || 'post'), type: 'post', row: r,
        idea: r.idea_id ? (data.postIdeas || {})[r.idea_id] : null, doing: data.doing || [] });
    });
    (data.doing || []).forEach(function(r) {
      if (!dn || dn.logic.isLinked(r)) return;
      var lk = r.details && r.details.link;
      if (lk && lk.kind === 'posts' && postedIds[lk.id]) return;
      var m = Number(r.actual_mins) || 0, mood = Number(r.details && r.details.mood) || 0;
      items.push({ t: r.ended_at || r.started_at, icon: '▶️', label: 'Did: ' + (r.title || 'activity') + (m ? ' (' + dn.logic.fmt(m) + ')' : '') + (mood ? ' ' + dn.MOODS[mood - 1] : ''),
        type: dn.logic.chronicleType(r), row: r });
    });
    // XP-6: every treat earned.
    (data.treats || []).forEach(function(r) {
      items.push({ t: r.earned_at, icon: '🎁', label: 'Treat earned: ' + r.title, type: 'treat', row: r });
    });
    // XP-4: each finished season and year gets one Chronicles entry.
    (data.xpReports || []).forEach(function(r) {
      var xs = RPGACE.modules.xpSeason, d = r.data || {};
      items.push({ t: r.period_end + 'T23:59:00', icon: xs ? xs.logic.reportIcon(r) : '📅',
        label: (r.kind === 'year' ? 'Year report: ' : 'Season report: ') + r.label + ' (' + (d.xp || 0) + ' XP, ' + (d.realms_touched || 0) + ' realms)',
        type: 'report', row: r });
    });
    // XP-3: every rank, title, badge and gate earned is a dated record.
    (data.unlocks || []).forEach(function(r) {
      var xs = RPGACE.modules.xpSeason, meta = (xs && xs.REALMS[r.realm]) || { icon: '', name: r.realm || '' };
      var kindLabel = { rank: 'Rank up', career_rank: 'Career rank', badge: 'Badge', title: 'Title', gate: 'Unlocked', level: 'Level up' }[r.kind] || 'Unlocked';
      var icon = { rank: '🏅', career_rank: '🎖️', badge: '🏆', title: '👑', gate: '🔓', level: '⬆️' }[r.kind] || '🏆';
      var label = kindLabel + ': ' + (r.kind === 'rank' || r.kind === 'career_rank' ? meta.name + ' → ' + r.name : r.name);
      if ((r.kind === 'rank' || r.kind === 'level') && xs) label += ' (' + xs.logic.seasonName(Number(r.season)) + ')';
      items.push({ t: r.unlocked_at, icon: icon, label: label, type: 'unlock', row: r });
    });
    // Bibliography (A15) — a completed book is a real timeline event. Note
    // the timestamp column here is completed_at, not created_at like every
    // other row type, because that IS the moment the real event happened.
    // Aug 23 2026 — `bibliography` now holds two genuinely different kinds of
    // row, told apart by one discriminator: book_id IS NULL is a saved LINK
    // (a reference kept for later, from intelDelete's save-before-delete
    // flow); book_id IS NOT NULL is a COMPLETED BOOK (bookworm._markBookComplete).
    // They get different icons so the feed itself distinguishes them at a
    // glance, not only once the detail popup is open. For a link row,
    // completed_at is reused as "when it was saved".
    (data.bibliography || []).forEach(function(r) {
      var isLink = (r.book_id == null);
      items.push({
        t: r.completed_at,
        icon: isLink ? '🔗' : '📚',
        label: 'Bibliography: ' + (r.title || (isLink ? 'reference' : 'book')),
        type: 'bibliography',
        row: r
      });
    });
    items.sort(function(a, b) { return new Date(b.t) - new Date(a.t); });
    return items;
  },

  // proposed_steps' shape varies by engine (phylum_path / concept_fusion /
  // plain path-array) - this pulls a short human name out of whichever
  // shape is actually present, for the feed row label.
  _proposalShortName: function(r) {
    function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
    var ps = (r && r.proposed_steps) || {};
    if (ps.insightText) return truncate(ps.insightText, 60);
    if (ps.newName) return truncate(ps.newName, 60);
    if (r && r.proposed_path) { var segs = r.proposed_path.split(/→|\//); return truncate(segs[segs.length - 1].trim(), 60); }
    return 'new branch added';
  },

  _esc: function(s) { return RPGACE.utils.escapeHtml(s); },

  },

  // ============================================================
  // ui — rendering/DOM: the profile-card stat/bar repaint, the
  // detail-popup markup builder, and the popup itself.
  // ============================================================
  ui: {

  // Oct 13 2026 (XP-1, XP Season Pass): the row-count career score that
  // used to be computed here (WEIGHTS x row counts, 88% of it from
  // auto-made idea cards) is retired. The profile card is painted from the
  // xp_events ledger by xpSeason; this module keeps its Chronicles feed
  // (_fetchAll/_buildItems/_showDetail) unchanged.
  _render: function() {
    var xs = RPGACE.modules.xpSeason;
    return xs ? xs.ui.renderCard() : null;
  },

  // Builds the {what, outcome, whereStored, whySignificant} shape every
  // detail popup renders, from whichever real row type was clicked.
  _detailFor: function(it) {
    var self = RPGACE.modules.careerStatCard, r = it.row, esc = function(s) { return self._esc(s); };
    if (it.type === 'proposal') {
      var ps = r.proposed_steps || {};
      var what = ps.insightText || ps.newName || (ps.explainers && ps.explainers[0]) || 'New taxonomy branch added';
      var whySig = ps.justification || ps.synthesis || (ps.explainers && ps.explainers.join(' ')) || null;
      if (ps.confidenceScore) whySig = (whySig ? whySig + ' ' : '') + '(confidence ' + ps.confidenceScore + '/10)';
      var sourceLine = 'Auto-detected during real Phylum Path work';
      if (r.source_type === 'content_intelligence' && r.source_id && /^https?:\/\//.test(r.source_id)) {
        sourceLine = 'Sourced from: <a href="' + esc(r.source_id) + '" target="_blank" rel="noopener" style="color:var(--gold)">' + esc(r.source_id) + '</a>';
      } else if (r.source_type === 'phylum_path_concept_fusion') {
        sourceLine = 'Synthesised by merging two existing tree branches (Concept Fusion)';
      }
      return {
        eyebrow: '🌳 Phylum ' + (r.phylum_number != null ? r.phylum_number : '?') + ' • Taxonomy Tree',
        title: 'Taxonomy insight accepted',
        rows: [
          ['What was done', esc(what)],
          ['Outcome', 'Accepted into the tree' + (r.reviewed_at ? ' on ' + r.reviewed_at.slice(0, 10) : '')],
          ['Where stored', esc(r.proposed_path || '—')],
          ['Why significant', whySig ? esc(whySig) : 'Fills a real gap identified in your knowledge tree.'],
          ['Source', sourceLine]
        ]
      };
    }
    if (it.type === 'journal') {
      return {
        eyebrow: '📓 Journal', title: r.title || 'Journal entry',
        rows: [
          ['What was done', esc(r.content || '—')],
          ['Outcome', 'Logged to your Journal'],
          ['Where stored', 'journal table'],
          ['Why significant', 'Source: ' + esc(r.source || 'manual')]
        ]
      };
    }
    if (it.type === 'insight') {
      return {
        eyebrow: '🧠 Encyclopedia', title: 'Insight captured',
        rows: [
          ['What was done', esc(r.insight_text || '—')],
          ['Outcome', 'Captured under ' + esc(r.macro_category || 'general')],
          ['Where stored', 'Encyclopedia • source: ' + esc(r.source_entry_title || '—')],
          ['Why significant', (r.micro_categories && r.micro_categories.length) ? 'Tags: ' + esc(r.micro_categories.join(', ')) : 'A real, reviewed piece of learning added to your library.']
        ]
      };
    }
    if (it.type === 'content_shipped' || it.type === 'content_idea') {
      var shipped = it.type === 'content_shipped';
      return {
        eyebrow: shipped ? '🚀 Content — Shipped' : '💡 Content — Idea', title: r.title || 'Content production',
        rows: [
          ['What was done', esc(r.idea || r.title || '—')],
          ['Outcome', shipped ? 'Posted to a real platform' : 'Logged to the content pipeline, not yet posted'],
          ['Where stored', 'content_productions #' + (r.con_id != null ? r.con_id : '?')],
          ['Why significant', shipped ? 'This is the governing-rule metric — a real beat/video that reached an audience.' : (r.notes ? esc(r.notes) : 'A real step toward shipping — turn this into a posted piece to move the Output lane.')]
        ]
      };
    }
    if (it.type === 'track') {
      return {
        eyebrow: '🎧 Reference Library', title: (r.artist ? r.artist + ' — ' : '') + (r.title || 'track'),
        rows: [
          ['What was done', 'Logged as a reference track' + (r.analysed ? ' and analysed' : '')],
          ['Outcome', [r.bpm ? r.bpm + ' BPM' : null, r.key ? r.key + ' ' + (r.scale || '') : null].filter(Boolean).join(' • ') || '—'],
          ['Where stored', 'reference_tracks table'],
          ['Why significant', [r.mood, r.genre].filter(Boolean).join(' • ') || (r.notes ? esc(r.notes) : 'Builds your real reference library for future productions.')]
        ]
      };
    }
    if (it.type === 'finance_sale' || it.type === 'finance_expense') {
      var isSale = it.type === 'finance_sale';
      return {
        eyebrow: isSale ? '💰 Chronicles — Sale' : '🧾 Chronicles — Expense',
        title: esc(r.item || r.category || 'Entry'),
        rows: [
          ['What was done', esc(r.item || r.category) + ' — £' + r.amount],
          ['Outcome', (isSale ? 'Real income logged' : 'Real spend logged') + (r.category ? ' under "' + esc(r.category) + '"' : '')],
          ['Where stored', 'chronicles_finance table • ' + esc(r.entry_date || '')],
          ['Why significant', isSale
            ? 'Real revenue toward your music career. Kept as its own visibility lane, deliberately separate from the Output score above — a sale and a shipped video are different real wins.'
            : (r.notes ? esc(r.notes) : 'Tracked for your own visibility — keep the real receipt for actual tax filing; this is not a substitute for bookkeeping.')]
        ]
      };
    }
    if (it.type === 'system_update') {
      return {
        eyebrow: '🛠️ Claude Code — RPGACE System Update',
        title: esc(r.title || 'System update'),
        rows: [
          ['What was done', esc(r.summary || r.title || '—')],
          ['Outcome', 'Shipped to main by a Claude Code dev session'],
          ['Where stored', 'system_updates table • category: ' + esc(r.category || 'feature')],
          ['Why significant', 'Real infrastructure/behaviour change to RPGACE itself, logged here so app-side activity and dev-side activity share one real timeline.']
        ]
      };
    }
    // Bibliography (A15, Aug 23 2026) — the real cross-table row type.
    // Every value here already lives on the bibliography row itself
    // (written once by bookworm._markBookComplete), so this surfaces a
    // genuine bibliography → taxonomy_tree link with zero new writes and
    // zero extra queries: which real phyla this book's insights landed in.
    if (it.type === 'bibliography') {
      // Aug 23 2026 — a LINK row (book_id IS NULL) is a reference Alex chose
      // to keep when deleting a Videoworm card. It was never analysed, so
      // total_chapters / total_insights_placed / phyla_touched are all null
      // and the book-completion copy below would be actively misleading about
      // it ("chapters read end to end", "insights placed"). It gets its own
      // deliberately lighter framing instead — what it actually is, and the
      // link itself.
      if (r.book_id == null) {
        var linkStored = 'bibliography table • saved reference (no book attached)';
        if (r.source_url && /^https?:\/\//.test(r.source_url)) {
          linkStored = 'bibliography table • <a href="' + esc(r.source_url) + '" target="_blank" rel="noopener" style="color:var(--gold)">' + esc(r.source_url) + '</a>';
        } else if (r.source_url) {
          linkStored = 'bibliography table • source: ' + esc(r.source_url);
        }
        return {
          eyebrow: '🔗 Bibliography — Reference saved',
          title: esc(r.title || 'reference'),
          rows: [
            ['What was done', 'A source was kept for later when its Videoworm card was deleted. Nothing was read, analysed, or placed — this is a bookmark, not a finished book.'],
            ['Outcome', 'The link survives; the full report it came from does not.'],
            ['Where stored', linkStored],
            ['Why significant', 'Saved references and completed books now live in the same bibliography table, told apart by whether a book is attached — so one shelf holds everything you decided was worth keeping.']
          ]
        };
      }
      // phyla_touched is jsonb. Supabase normally hands it back already
      // parsed (an array), but a string can come through depending on the
      // client/column path - same defensive shape smoke_test.html uses for
      // ceo_plan_items.galaxy_dimensions, kept identical rather than
      // inventing a second convention.
      var phyla = r.phyla_touched;
      if (typeof phyla === 'string') { try { phyla = JSON.parse(phyla); } catch (e) { phyla = null; } }
      if (!Array.isArray(phyla)) phyla = [];
      var tt = RPGACE.modules.taxonomyTree;
      var phylaNames = phyla.map(function(n) {
        return (tt && tt.PHYLUM_NAMES && tt.PHYLUM_NAMES[n]) ? (tt.PHYLUM_NAMES[n] + ' (Phylum ' + n + ')') : ('Phylum ' + n);
      });
      var chapters = (r.total_chapters != null) ? r.total_chapters : '?';
      var placed = (r.total_insights_placed != null) ? r.total_insights_placed : 0;
      var whereStored = 'bibliography table';
      if (r.source_url && /^https?:\/\//.test(r.source_url)) {
        whereStored += ' • <a href="' + esc(r.source_url) + '" target="_blank" rel="noopener" style="color:var(--gold)">' + esc(r.source_url) + '</a>';
      } else if (r.source_url) {
        whereStored += ' • source: ' + esc(r.source_url);
      }
      return {
        eyebrow: '📚 Bibliography — Book completed',
        title: esc(r.title || 'book'),
        rows: [
          ['What was done', 'Fully analysed and processed — ' + esc(String(chapters)) + ' chapter' + (chapters === 1 ? '' : 's') + ' read end to end.'],
          ['Outcome', esc(String(placed)) + ' insight' + (placed === 1 ? '' : 's') + ' placed into the taxonomy tree.'],
          ['Where stored', whereStored],
          ['Why significant', phylaNames.length
            ? 'This book\'s insights reached ' + phylaNames.length + ' real ' + (phylaNames.length === 1 ? 'phylum' : 'phyla') + ' of your taxonomy tree: ' + esc(phylaNames.join(', ')) + '.'
            : 'A whole book finished and logged — no taxonomy phyla recorded against it yet.']
        ]
      };
    }
    if (it.type === 'quest') {
      return { eyebrow: '⚔️ Quest Board', title: esc(r.name || 'Quest'), rows: [
        ['What was done', esc(r.description || r.name || '—')],
        ['Outcome', 'Completed' + (r.completed_at ? ' on ' + r.completed_at.slice(0, 10) : '') + (r.xp ? ' · +' + r.xp + ' XP' : '')],
        ['Where stored', 'quest_log table' + (r.category ? ' • ' + esc(r.category) : '')],
        ['Why significant', 'A finished quest - real progress, not a plan.']] };
    }
    if (it.type === 'study') {
      var SM = RPGACE.modules.studyHub ? RPGACE.modules.studyHub.logic.MODES : {};
      var parts = Object.keys(r.by_domain || {}).sort().map(function(k) { var b = r.by_domain[k]; return 'topic ' + k + ': ' + b.correct + '/' + b.total; });
      return { eyebrow: '🎓 Study', title: esc((SM[r.mode] || {}).label || r.mode), rows: [
        ['What was done', esc(r.total + ' AWS AI Practitioner practice question' + (r.total === 1 ? '' : 's') + (r.domain ? ' on topic ' + r.domain : ''))],
        ['Outcome', esc(r.correct + ' right' + (r.mode === 'mock' ? ' · ' + r.score + '/1000 (pass is 700)' : '') + (parts.length ? ' · ' + parts.join(', ') : ''))],
        ['Where stored', 'study_sessions + study_attempts tables'],
        ['Why significant', 'Practice towards the AWS certificate in your exit plan. Wrong answers come back in Redo.']] };
    }
    if (it.type === 'gym') {
      var gs = r.gym_sets || [];
      var vol = gs.reduce(function(a, x) { return a + (Number(x.reps) || 0) * (Number(x.weight_kg) || 0); }, 0);
      return { eyebrow: '🏋️ Gym', title: 'Session ' + esc(r.performed_on || ''), rows: [
        ['What was done', gs.length + ' set' + (gs.length === 1 ? '' : 's') + (r.duration_min ? ' in ' + r.duration_min + ' min' : '') + (vol ? ' · ' + Math.round(vol) + ' kg total volume' : '')],
        ['Outcome', r.notes ? esc(r.notes) : 'Logged'],
        ['Where stored', 'gym_sessions + gym_sets tables'],
        ['Why significant', 'Training logged against the 5-a-week target.']] };
    }
    if (it.type === 'agreed_sale') {
      return { eyebrow: '✅ Agreed sale', title: esc(r.label.replace(/^Agreed: /, '')), rows: [
        ['What was done', esc((r.artist && r.artist.name || 'The artist') + ' agreed to ' + (r.pitch && r.pitch.title || 'the pitch')) + (r.amount != null ? ' for £' + r.amount : '')],
        ['Terms', esc(r.send && r.send.deal_terms || '—')],
        ['Money', r.paid ? 'Paid — logged as its own sale' : 'Not paid yet — this entry is not money; the sale is logged when it is paid'],
        ['Where stored', 'pitch_sends.history (private, read after sign-in)']] };
    }
    if (it.type === 'outreach') {
      return { eyebrow: r.kind === 'collab' ? '🤝 Collab' : '📤 Outreach', title: esc(r.who), rows: [
        ['What was done', (r.kind === 'collab' ? 'Collab done with ' : 'Outreach sent to ') + esc(r.who) + (r.note ? ' · ' + esc(r.note) : '')],
        ['When', esc(String(r.done_on || ''))],
        ['Where stored', 'outreach_log table (private, read after sign-in)']] };
    }
    if (/^doing_/.test(it.type)) {
      var dnm = RPGACE.modules.doingNow, dd = r.details || {}, xsd = RPGACE.modules.xpSeason;
      var rl = (r.realms || []).map(function(k) { var R = xsd && xsd.REALMS[k]; return R ? R.icon + ' ' + R.name : k; }).join(', ');
      var notes = (dd.notes || []).map(function(n) { return n.text; }).filter(Boolean);
      return { eyebrow: '▶️ Live now', title: esc(r.title || 'Activity'), rows: [
        ['When', esc(String(r.started_at || '').slice(0, 10)) + (r.actual_mins ? ' · ' + esc(dnm.logic.fmt(Number(r.actual_mins))) : '')],
        ['How it went', esc([dd.mood ? dnm.MOODS[Number(dd.mood) - 1] : '', dd.how || ''].join(' ').trim() || '—')],
        ['Realms', esc(rl || '—')],
        ['Notes', notes.length ? esc(notes.join(' · ')) : '—'],
        ['Where stored', 'rpgace_agendas (source doing_now)']] };
    }
    if (it.type === 'treat') {
      var xst = RPGACE.modules.xpSeason;
      return { eyebrow: '🎁 Treat', title: esc(r.title), rows: [
        ['What was done', 'Earned: ' + esc(xst ? xst.logic.treatTarget(r, null) : r.target_kind)],
        ['When', esc(String(r.earned_at || '').slice(0, 10))],
        ['From your Wishlist', r.wishlist_item_id ? 'Yes - buy it there when you\'re ready (the usual wait still applies)' : 'No, your own treat'],
        ['Where stored', 'xp_treats table (private, read after sign-in)']] };
    }
    if (it.type === 'challenge') {
      var xsc = RPGACE.modules.xpSeason, rmc = (xsc && xsc.REALMS[r.realm]) || { icon: '', name: r.realm || '' };
      return { eyebrow: '🎯 XP', title: esc(r.title), rows: [
        ['What was done', esc(r.title) + (r.target > 1 ? ' (' + (r.progress || r.target) + ' / ' + r.target + ')' : '')],
        ['Kind', { weekly: 'Weekly challenge', resolution: 'Season resolution', realm_quest: 'Realm quest step' }[r.kind] || r.kind],
        ['Realm', esc((rmc.icon ? rmc.icon + ' ' : '') + rmc.name)],
        ['XP', '+' + r.xp],
        ['When', esc(String(r.done_at || '').slice(0, 10))],
        ['Where stored', 'xp_challenges table (private, read after sign-in)']] };
    }
    if (it.type === 'report') {
      var xsr = RPGACE.modules.xpSeason;
      return { eyebrow: '📅 XP report', title: esc(r.label), rows: xsr ? xsr.logic.reportRows(r) : [['What was done', esc(it.label)]] };
    }
    if (it.type === 'unlock') {
      var xsm = RPGACE.modules.xpSeason, rm = (xsm && xsm.REALMS[r.realm]) || { icon: '🏆', name: r.realm || '' };
      return { eyebrow: '🏆 Trophy cabinet', title: esc(it.label), rows: [
        ['What was done', esc(r.name) + (r.note ? ' · ' + esc(r.note) : '')],
        ['Realm', esc((rm.icon ? rm.icon + ' ' : '') + rm.name)],
        ['When', esc(String(r.unlocked_at || '').slice(0, 10))],
        ['How', r.status === 'claimed' ? 'You claimed it' + (r.proof ? ': ' + esc(r.proof) : '') : 'Earned automatically from what you logged'],
        ['Where stored', 'xp_unlocks table (private, read after sign-in)']] };
    }
    if (it.type === 'trip') {
      var when = r.start_date ? (r.start_date + (r.end_date && r.end_date !== r.start_date ? ' to ' + r.end_date : '')) : (r.end_date || '');
      return { eyebrow: '✈️ Trips & plans', title: esc(r.title || r.destination || 'Plan'), rows: [
        ['What was done', esc(r.summary || 'Plan finished')],
        ['Where', esc([r.destination, r.country].filter(Boolean).join(', ') || '—')],
        ['When', esc(when || '—')],
        ['Where stored', 'plans table (private, read after sign-in)']] };
    }
    if (it.type === 'post') {
      var phr = RPGACE.modules.postingHub;
      var rows = phr ? phr.logic.report(r, it.doing, it.idea) : [['What was done', [it.label]]];
      return { eyebrow: '📣 Posting', title: esc(r.title || 'Post'), rows: rows.map(function(x) {
        return [esc(x[0]), x[1].map(function(l) {
          return (l && l.url) ? esc(l.text) + ': <a href="' + esc(l.url) + '" target="_blank" rel="noopener" style="color:var(--gold);word-break:break-all">' + esc(l.url) + '</a>' : esc(l);
        }).join('<br>')];
      }) };
    }
    if (it.type === 'cook') {
      var cn = (r.recipe_ids || []).length;
      var cnames = it.names || [];
      return { eyebrow: '🍳 Cooking', title: cnames.length ? esc(cnames.join(', ')) : 'Planned cook finished', rows: [
        ['What was done', (cnames.length ? esc(cnames.join(', ')) : cn + ' recipe' + (cn === 1 ? '' : 's')) + ' cooked' + (r.scheduled_at ? ' on ' + esc(r.scheduled_at.slice(0, 10)) : '')],
        ['Outcome', 'Marked cooked'],
        ['Where stored', 'planned_cooks table'],
        ['Why significant', 'Cooking is the first HABITS domain - this is it actually happening.']] };
    }
    return { eyebrow: it.icon + ' Activity', title: it.label, rows: [['What was done', esc(it.label)], ['Outcome', '—'], ['Where stored', '—'], ['Why significant', '—']] };
  },

  _showDetail: function(it) {
    var self = RPGACE.modules.careerStatCard;
    var dd = RPGACE.modules.dashDeck;
    if (!dd || !dd._popup) { console.warn('[RPGACE:careerStatCard] dashDeck._popup unavailable'); return; }
    var d = self._detailFor(it);
    var pop = dd._popup({ eyebrow: d.eyebrow, title: d.title, width: '560px', accent: 'var(--gold)' });
    pop.box.innerHTML = d.rows.map(function(row) {
      return '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">' + row[0] + '</div>'
        + '<div style="font-size:13px;color:var(--text);line-height:1.5">' + row[1] + '</div></div>';
    }).join('');
    // BT-7 (Oct 16 2026): a sale linked to a beat opens that beat.
    var r7 = it.row || {};
    if (it.type === 'finance_sale' && r7.content_production_id && RPGACE.modules.beatsHub) {
      var go7 = document.createElement('button'); go7.type = 'button'; go7.className = 'csc-open-beat';
      go7.textContent = '🥁 Open this beat';
      go7.style.cssText = 'min-height:44px;padding:8px 16px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-weight:700;cursor:pointer;font-family:inherit;';
      go7.onclick = function() { pop.close(); RPGACE.modules.beatsHub.ui.openBeat(r7.content_production_id); };
      pop.box.appendChild(go7);
    }
    // SH-7: an agreed sale opens its pitch.
    if (it.type === 'agreed_sale' && r7.pitch && r7.pitch.id && RPGACE.modules.sellingHub) {
      var go9 = document.createElement('button'); go9.type = 'button'; go9.className = 'csc-open-pitch';
      go9.textContent = '📋 Open this pitch';
      go9.style.cssText = 'min-height:44px;padding:8px 16px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-weight:700;cursor:pointer;font-family:inherit;';
      go9.onclick = function() { pop.close(); RPGACE.modules.sellingHub.ui.openPitch(r7.pitch.id); };
      pop.box.appendChild(go9);
    }
    // PC-7: a posted post opens its links screen, and its beat when it has one.
    if (it.type === 'post' && RPGACE.modules.postingHub) {
      var row8 = document.createElement('div'); row8.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      var mk8 = function(cls, txt, fn) {
        var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt;
        b.style.cssText = 'min-height:44px;padding:8px 16px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-weight:700;cursor:pointer;font-family:inherit;';
        b.onclick = function() { pop.close(); fn(); };
        row8.appendChild(b);
      };
      mk8('csc-open-post', '📣 Open this post', function() { RPGACE.modules.postingHub.ui.openPost(r7.id); });
      if (r7.beat_id && RPGACE.modules.beatsHub) mk8('csc-open-beat', '🥁 Open beat', function() { RPGACE.modules.beatsHub.ui.openBeat(r7.beat_id); });
      pop.box.appendChild(row8);
    }
  }

  },

  // Thin top-level pass-throughs — preserve the exact existing public API.
  // Real, load-bearing external touchpoints these carry (all confirmed by
  // grep, see the G53 block above): the boot prefetch's own
  // `R.modules.careerStatCard._fetchAll()`, chroniclesLog's direct
  // `RPGACE.modules.careerStatCard._relTime(...)`/`._showDetail(...)`
  // calls, and its two local-alias (`var csc = …`) call sites reaching
  // `_fetchAll`/`_isShipped`/`_buildItems`. Also carries this module's own
  // internal cross-namespace calls — every `self` inside a moved function
  // is the MODULE, so each call lands here first and is routed on to the
  // right namespace (including `data.self._dateStr(...)`, the one
  // cross-namespace data handoff, described in the G53 block above).
  _fetchAll: function() { return this.logic._fetchAll(); },
  _isShipped: function(row) { return this.logic._isShipped(row); },
  _cookNames: function(r, titles) { return this.logic._cookNames(r, titles); },
  _dateStr: function(iso) { return this.logic._dateStr(iso); },
  _relTime: function(iso) { return this.logic._relTime(iso); },
  _buildItems: function(data, shipped, ideas) { return this.logic._buildItems(data, shipped, ideas); },
  _proposalShortName: function(r) { return this.logic._proposalShortName(r); },
  _esc: function(s) { return this.logic._esc(s); },
  _render: function() { return this.ui._render(); },
  _detailFor: function(it) { return this.ui._detailFor(it); },
  _showDetail: function(it) { return this.ui._showDetail(it); },

});
/* ===END:careerStatCard=== */
