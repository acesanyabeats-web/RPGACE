
/* ===MODULE:myDay=== */
// Oct 12 2026 — My Day replaces the generic Quest Board. Alex, verbatim:
// "this is useless tbh, i need real goals i need to tick off, like weekly
// cleaning broken up per day, morning routines etc, small steps that are
// needed to be done a day or a week, or next time im shopping etc. reading,
// coding, music production, education, i need all in one system where i can
// very effectively plan my day, and have all tools for it in rpgace, this is
// in pure essence what rpgace is for me". His answers (record:
// records/2026-10/my_day_routines_spec_2026-10-12.txt): "you draft an idea,
// but i choose slots and goals needed based on what is there" -> IDEAS below
// is only a menu; nothing is live until he adds it and sets its days/time/
// goal. "Keep XP, smaller" -> 5-25 XP per routine. "Remove them" -> the old
// QUESTS template is emptied. "Suggest slots, I accept" -> Plan my day.
//
// Data: `routines` (one row per routine Alex picked) + the existing
// `quest_log` (quest_kind='routine', quest_key='routine:<id>') for every
// tick/skip, so questEngine._restoreBoardState counts routine XP into the
// level with no second XP store (rule 8). Timed ticks feed
// questEngine.recordDuration('routine', id, ...) so the minutes estimate
// learns from real runs. Writes go through RPGACE.sb.secureWrite.
// MD2-7 (Oct 14 2026): a tapped phone alert opens /?open=myday (or
// myday-review). Read once at load, before anything rewrites the URL.
var _rpgaceMyDayOpenAtLoad = (function() {
  try { return new URLSearchParams(location.search).get('open') || null; } catch (e) { return null; }
})();

RPGACE.register('myDay', {
  domain: 'schedule',

  AREAS: ['Home', 'Chores', 'Health', 'Mind', 'Social', 'Money', 'Music', 'Content', 'Learning', 'Coding', 'Admin', 'Other'],  // MD2-10 (Oct 14 2026): Social -> Connector, Money -> Steward  // Mind (XP-7): sleep, screen limit, meditation -> Mind realm
  DAYS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  PARTS: [
    { key: 'morning', label: '🌅 Morning', from: 360, to: 720 },
    { key: 'afternoon', label: '☀️ Afternoon', from: 720, to: 1020 },
    { key: 'evening', label: '🌙 Evening', from: 1020, to: 1380 },
    { key: 'any', label: '🕘 Any time', from: 420, to: 1380 },
  ],
  CONTEXTS: { shopping: "Next time I'm shopping", town: "Next time I'm in town", pc: "Next time I'm at the PC" },
  // MD2-4 (Oct 12 2026): travel + get-ready time. Alex: "always 30 minutes to
  // get ready, then journey i enter myself in approximate minutes + 10% time
  // buffer that i judge myself"; before a shift "90 minutes - 60 journey and
  // 20 min for coffee and cigarette"; after "60 min journey". The margin goes
  // on journeys only. Stored in myday_settings (one row); these are fallbacks.
  TIMING_DEFAULTS: { ready_mins: 30, margin_pct: 10, shift_journey_mins: 60, shift_extra_before_mins: 20, shift_journey_home_mins: 60 },
  CATEGORY_SUGGESTIONS: ['work', 'gym', 'health', 'food', 'music', 'content', 'learning', 'social', 'family', 'home', 'admin', 'money', 'leisure', 'personal'],
  _settings: null,
  _templates: [],
  // MD2-5 (Oct 12 2026): week planner. routine_plans = which days a weekly /
  // N-a-week routine is planned (a week with any row for that routine uses
  // its plan instead of its usual days); day_blocks = multi-day blocks
  // (holiday, trip, event) shown on the planner's day list so plans don't clash.
  _plans: [],
  _blocks: [],
  // 'off' = time off work (free days, preferred for routines); trip/event/
  // other all-day = away or busy (suggestions skip the day). Alex, Oct 12:
  // "my 1-8 november ive got nothing planned" - time off is free time.
  BLOCK_KINDS: { off: '🌴', trip: '🧳', event: '🎟', other: '⛔' },
  BLOCK_LABELS: { off: 'Time off work', trip: 'Trip / away', event: 'Event', other: 'Busy' },
  // The RPGACE tools a routine can open (dashDeck card keys).
  TOOLS: [
    { key: 'cooking', label: '🍳 Cooking' }, { key: 'gym', label: '🏋️ Gym' },
    { key: 'bookworm', label: '📖 Bookworm' }, { key: 'pipeline', label: '🎬 Content Pipeline' },
    { key: 'oracle', label: '🔮 Oracle' }, { key: 'taxonomy', label: '🌳 Jargon & Taxonomy' },
    { key: 'gaps', label: '🕳️ Knowledge Gaps' }, { key: 'encyclopedia', label: '📚 Encyclopedia' },
    { key: 'study', label: '🎓 Exam practice' },
    { key: 'morningBrief', label: '🌅 Morning Brief' }, { key: 'journal', label: '📓 Journal' },
    { key: 'chronicles', label: '📜 Chronicles' }, { key: 'wishlist', label: '🛒 Wishlist' },
    { key: 'screenshots', label: '📸 Screenshots' },
    { key: 'plans', label: '🧳 Plans & People' },
  ],
  // A drafted menu, built from what RPGACE can already do. Alex picks.
  IDEAS: [
    { area: 'Home', icon: '🌅', title: 'Morning routine', cadence: 'daily', part_of_day: 'morning', est_mins: 30, xp: 10, steps: ['Glass of water', 'Make the bed', '10 min stretch', 'Shower', 'Breakfast', 'Look over today'] },
    { area: 'Home', icon: '🌙', title: 'Evening wind-down', cadence: 'daily', part_of_day: 'evening', est_mins: 20, xp: 5, steps: ['Tidy the kitchen', 'Lay out tomorrow', 'Phone on charge away from bed'] },
    { area: 'Home', icon: '🧽', title: 'Kitchen deep clean', cadence: 'weekly', days: [1], part_of_day: 'any', est_mins: 30, xp: 15, steps: ['Hob and oven top', 'Worktops', 'Sink', 'Mop floor'] },
    { area: 'Home', icon: '🛁', title: 'Bathroom clean', cadence: 'weekly', days: [2], part_of_day: 'any', est_mins: 25, xp: 15, steps: ['Toilet', 'Sink and mirror', 'Shower/bath', 'Floor'] },
    { area: 'Home', icon: '🧹', title: 'Hoover and dust', cadence: 'weekly', days: [3], part_of_day: 'any', est_mins: 25, xp: 10 },
    { area: 'Home', icon: '🧺', title: 'Laundry', cadence: 'weekly', days: [4], part_of_day: 'any', est_mins: 20, xp: 10, steps: ['Wash', 'Dry', 'Fold and put away'] },
    { area: 'Home', icon: '🗑️', title: 'Bins out', cadence: 'weekly', days: [5], part_of_day: 'evening', est_mins: 5, xp: 5 },
    { area: 'Home', icon: '🛏️', title: 'Change bedsheets', cadence: 'weekly', days: [6], part_of_day: 'any', est_mins: 15, xp: 10 },
    { area: 'Home', icon: '🥶', title: 'Fridge clear-out', cadence: 'weekly', days: [7], part_of_day: 'any', est_mins: 15, xp: 10, opens: 'cooking', goal: 'Bin what has turned, update stock' },
    { area: 'Home', icon: '🧴', title: 'Laundry detergent', cadence: 'next_time', context: 'shopping', est_mins: 2, xp: 5 },
    { area: 'Health', icon: '🏋️', title: 'Gym session', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 60, xp: 20, opens: 'gym' },
    { area: 'Health', icon: '🍳', title: 'Cook from scratch', cadence: 'times_per_week', times_per_week: 4, part_of_day: 'evening', est_mins: 45, xp: 15, opens: 'cooking' },
    { area: 'Health', icon: '🥡', title: 'Meal prep', cadence: 'weekly', days: [7], part_of_day: 'afternoon', est_mins: 90, xp: 20, opens: 'cooking' },
    { area: 'Health', icon: '📦', title: 'Update kitchen stock', cadence: 'weekly', days: [7], part_of_day: 'any', est_mins: 10, xp: 5, opens: 'cooking' },
    { area: 'Health', icon: '😴', title: 'In bed by 11', cadence: 'daily', part_of_day: 'evening', preferred_time: '22:45', est_mins: 15, xp: 5 },
    { area: 'Music', icon: '🎹', title: 'Make a beat', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 90, xp: 25, opens: 'pipeline', goal: 'Log it in Beat Log when done' },
    { area: 'Music', icon: '🎧', title: 'Study production', cadence: 'times_per_week', times_per_week: 2, part_of_day: 'any', est_mins: 30, xp: 15, opens: 'bookworm' },
    { area: 'Content', icon: '📱', title: 'Post a short', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 30, xp: 20, opens: 'pipeline' },
    { area: 'Content', icon: '✍️', title: 'Write captions', cadence: 'weekly', days: [1], part_of_day: 'any', est_mins: 20, xp: 10, opens: 'oracle' },
    { area: 'Learning', icon: '📖', title: 'Read 20 pages', cadence: 'daily', part_of_day: 'evening', est_mins: 30, xp: 10, opens: 'bookworm' },
    { area: 'Learning', icon: '🌳', title: 'Review 10 jargon terms', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 15, xp: 10, opens: 'taxonomy' },
    { area: 'Learning', icon: '🃏', title: 'Recall yesterday\'s ideas', cadence: 'daily', part_of_day: 'morning', est_mins: 5, xp: 5, opens: 'morningBrief' },
    { area: 'Learning', icon: '🎓', title: 'Study session', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 45, xp: 15, opens: 'gaps' },
    { area: 'Learning', icon: '🎓', title: 'Exam practice — Quick 10', cadence: 'daily', part_of_day: 'any', est_mins: 15, xp: 5, opens: 'study' },
    { area: 'Coding', icon: '💻', title: 'Coding session', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 60, xp: 20 },
    { area: 'Coding', icon: '🖥️', title: 'Back up beats folder', cadence: 'next_time', context: 'pc', est_mins: 10, xp: 5 },
    { area: 'Money', icon: '💷', title: 'Budget check', cadence: 'weekly', days: [7], part_of_day: 'evening', est_mins: 15, xp: 10, opens: 'chronicles', minimum: 'Look at this week\'s spending', goal: 'Every expense logged, next week planned' },
    { area: 'Admin', icon: '🛒', title: 'Wishlist review', cadence: 'weekly', days: [7], part_of_day: 'any', est_mins: 10, xp: 5, opens: 'wishlist' },
    { area: 'Admin', icon: '📸', title: 'Clear screenshot inbox', cadence: 'weekly', days: [5], part_of_day: 'any', est_mins: 10, xp: 5, opens: 'screenshots' },
    { area: 'Admin', icon: '📓', title: 'Journal — 3 lines', cadence: 'daily', part_of_day: 'evening', est_mins: 5, xp: 5, opens: 'journal' },
    // MD2-10 (Oct 14 2026): ideas menu round 2, from Alex's Oct 12 answers
    // (Mind: "Journaling, Gratitude, Psych exercises"; Psychology: "chapters not
    // pages, ill just log what book and chapter"; Movement: "stretching in the
    // morning, hitting all muscle groups"; Food: water, meal prep, protein;
    // Social: "Call family, Birthdays/dates, Networking/collabs"; Creative:
    // "come up with more ... digging for books or articles or skills ... new
    // industries"; Life admin: "Budget check, Cleaning by day, Personal care,
    // Digital limits"). Interval items use the every-N-days countdown.
    { area: 'Mind', icon: '🧠', title: 'Psychology reading', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'evening', est_mins: 30, xp: 15, opens: 'journal', minimum: 'A few pages', goal: 'One chapter, then log book + chapter', steps: ['Read', 'Log the book and chapter', 'Note one idea to try'] },
    { area: 'Mind', icon: '🧪', title: 'Psych exercise: try one idea from the reading', cadence: 'weekly', days: [3], part_of_day: 'any', est_mins: 15, xp: 15, opens: 'journal', goal: 'Write what happened' },
    { area: 'Mind', icon: '🙏', title: 'Gratitude — 3 things', cadence: 'daily', part_of_day: 'evening', est_mins: 3, xp: 5, opens: 'journal', minimum: '1 thing' },
    { area: 'Mind', icon: '📵', title: 'Phone away / screen-time check', cadence: 'daily', part_of_day: 'evening', est_mins: 2, xp: 5, goal: 'Under your daily screen-time limit' },
    { area: 'Health', icon: '🤸', title: 'Morning stretch — all muscle groups', cadence: 'daily', part_of_day: 'morning', est_mins: 12, xp: 10, minimum: '3 minutes', steps: ['Neck and shoulders', 'Chest and upper back', 'Arms and wrists', 'Core and lower back', 'Hips and glutes', 'Hamstrings and quads', 'Calves and ankles'] },
    { area: 'Health', icon: '💧', title: 'Water — 2 litres', cadence: 'daily', part_of_day: 'any', est_mins: 1, xp: 5, minimum: '1 litre', goal: '2 litres' },
    { area: 'Health', icon: '🥚', title: 'Hit your protein target', cadence: 'daily', part_of_day: 'evening', est_mins: 2, xp: 5, opens: 'cooking', goal: 'Protein in every meal' },
    { area: 'Health', icon: '💈', title: 'Haircut', cadence: 'every_days', every_days: 21, est_mins: 45, xp: 10 },
    { area: 'Health', icon: '🪥', title: 'New toothbrush head', cadence: 'every_days', every_days: 90, est_mins: 2, xp: 5 },
    { area: 'Health', icon: '🦷', title: 'Dentist check-up', cadence: 'every_days', every_days: 180, est_mins: 60, xp: 15 },
    { area: 'Social', icon: '📞', title: 'Call family', cadence: 'weekly', days: [7], part_of_day: 'afternoon', est_mins: 20, xp: 15, opens: 'plans', minimum: 'A quick message' },
    { area: 'Social', icon: '🎂', title: 'Birthdays and gifts check', cadence: 'weekly', days: [1], part_of_day: 'any', est_mins: 10, xp: 5, opens: 'plans', goal: 'Gifts sorted a week ahead' },
    { area: 'Social', icon: '🤝', title: 'Networking / collab outreach', cadence: 'times_per_week', times_per_week: 2, part_of_day: 'any', est_mins: 20, xp: 15, minimum: 'One message', goal: 'Two real conversations' },
    { area: 'Music', icon: '🔎', title: 'Sample digging', cadence: 'times_per_week', times_per_week: 2, part_of_day: 'any', est_mins: 45, xp: 15, minimum: '15 minutes', goal: '3 usable samples saved' },
    { area: 'Music', icon: '🎛️', title: 'Skills drill: ear training or sound design', cadence: 'times_per_week', times_per_week: 3, part_of_day: 'any', est_mins: 30, xp: 15, minimum: '10 minutes', opens: 'gaps' },
    { area: 'Learning', icon: '🧭', title: 'Weekly dig: books, skills, new income streams', cadence: 'weekly', days: [6], part_of_day: 'any', est_mins: 45, xp: 20, opens: 'gaps', steps: ['One book or article for Bookworm', 'One skill gap to close', 'One income stream to look into (sync briefs, sample kits, leasing, mixing services, teaching, game/app audio)', 'One opportunity (BBC Introducing, beat battles, competitions)'] },
    { area: 'Content', icon: '🗓', title: 'Plan this week\'s posts', cadence: 'weekly', days: [1], part_of_day: 'any', est_mins: 20, xp: 10, opens: 'pipeline', goal: 'Posting schedule set for the week' },
    { area: 'Money', icon: '🔁', title: 'Subscriptions review', cadence: 'every_days', every_days: 90, est_mins: 20, xp: 15, opens: 'chronicles' },
    { area: 'Money', icon: '📊', title: 'Budget deep review', cadence: 'every_days', every_days: 30, est_mins: 30, xp: 20, opens: 'chronicles' },
    { area: 'Home', icon: '☕', title: 'Descale the kettle', cadence: 'every_days', every_days: 30, est_mins: 10, xp: 5 },
    { area: 'Home', icon: '🫧', title: 'Washing-machine maintenance wash', cadence: 'every_days', every_days: 30, est_mins: 5, xp: 5 },
    { area: 'Coding', icon: '💾', title: 'Back up beats and projects', cadence: 'every_days', every_days: 14, est_mins: 15, xp: 10 },
    { area: 'Coding', icon: '🖥️', title: 'Phone/laptop storage + updates', cadence: 'every_days', every_days: 30, est_mins: 20, xp: 5 },
    // DT-3 (Oct 14 2026): room-only chores, each on its own "every N days"
    // countdown from the last time it was done. Alex: "we will allocate
    // number of days, and when chores is done start of count down by number
    // of days chosen" — and he kept all 20 of this starter list.
    { area: 'Chores', icon: '🪟', title: 'Air the room (window open 10 min)', cadence: 'every_days', every_days: 1, est_mins: 10, xp: 5 },
    { area: 'Chores', icon: '👕', title: 'Tidy: clothes away, clear desk and surfaces', cadence: 'every_days', every_days: 2, est_mins: 10, xp: 5 },
    { area: 'Chores', icon: '🗑️', title: 'Empty the bin', cadence: 'every_days', every_days: 3, est_mins: 5, xp: 5 },
    { area: 'Chores', icon: '🧻', title: 'Wash towels', cadence: 'every_days', every_days: 4, est_mins: 10, xp: 5 },
    { area: 'Chores', icon: '🛏️', title: 'Change bed sheets and pillowcases', cadence: 'every_days', every_days: 7, est_mins: 15, xp: 10 },
    { area: 'Chores', icon: '🧺', title: 'Laundry: clothes', cadence: 'every_days', every_days: 7, est_mins: 20, xp: 10, steps: ['Wash', 'Dry', 'Fold and put away'] },
    { area: 'Chores', icon: '🧹', title: 'Hoover the floor', cadence: 'every_days', every_days: 7, est_mins: 15, xp: 10 },
    { area: 'Chores', icon: '🪶', title: 'Dust desk, shelves and windowsill', cadence: 'every_days', every_days: 7, est_mins: 10, xp: 5 },
    { area: 'Chores', icon: '⌨️', title: 'Wipe keyboard, mouse, controller and phone', cadence: 'every_days', every_days: 7, est_mins: 10, xp: 5 },
    { area: 'Chores', icon: '🪞', title: 'Clean mirror and screens', cadence: 'every_days', every_days: 14, est_mins: 10, xp: 5 },
    { area: 'Chores', icon: '🚪', title: 'Wipe door handles and light switches', cadence: 'every_days', every_days: 14, est_mins: 5, xp: 5 },
    { area: 'Chores', icon: '🎧', title: 'Dust studio monitors and gear; clean headphones', cadence: 'every_days', every_days: 14, est_mins: 15, xp: 10 },
    { area: 'Chores', icon: '🛡️', title: 'Wash mattress protector', cadence: 'every_days', every_days: 30, est_mins: 15, xp: 10 },
    { area: 'Chores', icon: '🛋️', title: 'Hoover under the bed and behind furniture', cadence: 'every_days', every_days: 30, est_mins: 20, xp: 10 },
    { area: 'Chores', icon: '🧽', title: 'Wipe skirting boards and the window frame', cadence: 'every_days', every_days: 30, est_mins: 20, xp: 10 },
    { area: 'Chores', icon: '💤', title: 'Wash pillows', cadence: 'every_days', every_days: 90, est_mins: 15, xp: 10 },
    { area: 'Chores', icon: '🔄', title: 'Rotate or flip the mattress', cadence: 'every_days', every_days: 90, est_mins: 10, xp: 10 },
    { area: 'Chores', icon: '🗄️', title: 'Declutter wardrobe and drawers', cadence: 'every_days', every_days: 90, est_mins: 45, xp: 20 },
    { area: 'Chores', icon: '🪟', title: 'Wash curtains or clean blinds', cadence: 'every_days', every_days: 90, est_mins: 30, xp: 15 },
    { area: 'Chores', icon: '🛌', title: 'Wash duvet', cadence: 'every_days', every_days: 180, est_mins: 20, xp: 15 },
  ],

  _routines: [],
  _logs: [],
  _lastReview: null, // MD2-9: Monday (review_on) of the newest weekly review
  // DT-3: latest completed tick per every-N-days routine, all time (the
  // 70-day _logs window is too short for 90/180-day chores).
  _choreDone: {},
  // DT-4: planned chore blocks (chore_blocks), from yesterday on.
  _choreBlocks: [],
  DAY_KINDS: { off: '🌴 Day off', early: '☀️ Early shift', late: '🌙 Late shift' },
  // DT-7 realm blocks: the activities Alex picked Oct 13 now live in the
  // realm_tasks table (Realm Tasks, Oct 27 2026) - see realmTasks.
  // MD-2: how a block is worked. Default per realm (Alex: "Default per realm,
  // change any time"); myday_settings.realm_methods overrides; a block's own
  // chore_blocks.method overrides that.
  METHODS: {
    pomodoro: { label: '🍅 Pomodoro 25/5' },
    deep50: { label: '🧠 Deep work 50/10' },
    deep90: { label: '🧠 Deep work 90' },
    timebox: { label: '⏱ Time-box' },
    none: { label: '✔ Just tick it' },
  },
  REALM_METHOD_DEFAULTS: { producer: 'deep90', creator: 'pomodoro', hustler: 'pomodoro', scholar: 'deep50', builder: 'deep90' },
  // A routine's area -> its realm (same mapping xp_on_change uses).
  AREA_REALM: { music: 'producer', content: 'creator', health: 'athlete', learning: 'scholar', home: 'homekeeper', chores: 'homekeeper', coding: 'builder', mind: 'mind', social: 'connector', money: 'steward' },
  TICK_XP: 10,
  BLOCK_BONUS_XP: 15, // MD-4: a block whose timer ran to the end ("keep it simple")
  // MD2-8 (Oct 14 2026): days-since trackers, ordered by Alex's "never slip"
  // picks (gym + food, reading + learning, then the rest). days = the usual
  // gap before it turns red; editable per tracker (myday_settings.tracker_days).
  TRACKERS: [
    { key: 'gym', icon: '🏋️', label: 'Last gym session', days: 3, opens: 'gym' },
    { key: 'cook', icon: '🍳', label: 'Last cook', days: 3, opens: 'cooking' },
    { key: 'read', icon: '📖', label: 'Last reading / study', days: 2, opens: 'bookworm', area: 'Learning' },
    { key: 'beat', icon: '🎹', label: 'Last beat made', days: 3, opens: 'pipeline' },
    { key: 'post', icon: '📱', label: 'Last post', days: 4, opens: 'pipeline' },
    { key: 'journal', icon: '📓', label: 'Last journal entry', days: 3, opens: 'journal' },
  ],
  _trk: null,
  _tick: null,

  init: function() {
    var self = this;
    // MD-0: 🏠 on any My Day screen opens the My Day home.
    RPGACE.AREAS.myday.hub = function() { self.open(); };
    RPGACE.registerBootTask(function() { return self.ui.inject(); });
    // MDX-6: the Daily Schedule shows the same draggable timeline.
    RPGACE.registerBootTask(function() { self.ui.schedHook(); });
    // MD-1: the wake alarm rings in the app on any page (every 20s check).
    // WF-1 (Oct 29 2026): the alarm rows load here too, so a cold open (MacroDroid opens the app
    // when the phone rings) shows the cover without visiting My Day first.
    setInterval(function() { try { self.logic.syncAlarms().then(function() { self.ui._alarmCheck(); }); } catch (e) {} }, 20000);
    // WF-5: when the phone opens RPGACE for an alarm, show the cover straight after sign-in, not 20 s later.
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(function() { try { self.logic.syncAlarms(true).then(function() { self.ui._alarmCheck(); }); } catch (e) {} }, 1500); });
    // MD-4: focus timer bar (runs from the real clock, so it never drifts).
    setInterval(function() { try { self.ui._focusTick(); } catch (e) {} }, 1000);
    // Day Bookends (Oct 27 2026): Good morning / the evening review open only
    // from ☀️ I'm up / 🌙 Going to bed (ui.imUp / ui.goingToBed), never by the clock.
    RPGACE.hooks.on('page:show', function(name) {
      if (name !== RPGACE.CONFIG.pages.agenda) return;
      // AC-5: a missed block asks "What happened?" when My Day opens.
      setTimeout(function() { try { self.ui._maybeMissed(); } catch (e) {} }, 1500);
      RPGACE.areaNav.visit('myday', { key: 'home', label: 'My Day', open: function() { self.open(); } });
      self.ui.inject();
    });
    var open = _rpgaceMyDayOpenAtLoad;
    // Oct 29 2026: the 23:00 "🌙 Going to bed now?" alert opens ?open=bed (evening review, then alarm);
    // the 07:00 "☀️ Are you up?" alert (no-alarm nights) opens ?open=up (starts the day). push_digest sends both.
    if (open === 'bed' || open === 'up') {
      try { history.replaceState(history.state, '', location.pathname); } catch (e) {}
      var once = false;
      RPGACE.hooks.on('rpgace:login', function() {
        if (once) return; once = true;
        setTimeout(function() { (open === 'bed' ? self.ui.goingToBed() : self.ui.imUp()).catch(function() {}); }, 1200);
      });
    }
    if (open === 'myday' || open === 'myday-review') {
      try { history.replaceState(history.state, '', location.pathname); } catch (e) {}
      var fired = false;
      RPGACE.hooks.on('rpgace:login', function() {
        if (fired) return; fired = true;
        setTimeout(function() {
          if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.agenda);
          if (open === 'myday-review') self.logic.load().then(function() { self.ui.openReview(self.logic.reviewTarget(new Date()) || undefined); }).catch(function() {});
        }, 900);
      });
    }
  },
  open: function() {
    if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.agenda);
    else this.ui.inject();
  },
  // MD-0 (Oct 18 2026, plan "My Day" MD-0..7): the five steps of a day.
  STEPS: [
    { key: 'morning', icon: '🌅', name: 'Morning' },
    { key: 'week', icon: '🗓', name: 'Plan week' },
    { key: 'day', icon: '📋', name: 'Plan day' },
    { key: 'do', icon: '▶️', name: 'Do' },
    { key: 'review', icon: '🌙', name: 'Review' }
  ],
  // MD-7: Daily Schedule entries that are My Day blocks get a ☀️ My Day button
  // (a planned cook opens Cooking from its own Start, so it is not listed).
  SCHEDULE_LINK_SOURCES: ['chore_block', 'realm_block', 'shopping_block'],
  // MD2-7: phone alerts. Sent by the Supabase edge function myday-push
  // (pg_cron hourly; push_digest() decides: 08:00 morning picks, Sunday
  // 18:00 weekly review). The VAPID public key is fetched from the function.
  PUSH_FN: 'https://gripopghczmrbrhqtqbm.supabase.co/functions/v1/myday-push',
  _push: null, // 'on' | 'off' | 'blocked' | 'unsupported'

  logic: {
    _M: function() { return RPGACE.modules.myDay; },
    iso: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    addDays: function(isoDate, n) { var d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() + n); return RPGACE.modules.myDay.logic.iso(d); },
    dow: function(isoDate) { var d = new Date(isoDate + 'T12:00:00'); return ((d.getDay() + 6) % 7) + 1; }, // Mon=1..Sun=7
    weekStart: function(isoDate) { var L = RPGACE.modules.myDay.logic; return L.addDays(isoDate, 1 - L.dow(isoDate)); },
    toMin: function(hhmm) { var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; },
    fmtMin: function(min) { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); },
    logDate: function(l) { return RPGACE.modules.myDay.logic.iso(new Date(l.completed_at || l.created_at)); },

    load: function() {
      var self = RPGACE.modules.myDay, L = self.logic;
      var since = L.addDays(L.iso(), -70);
      return Promise.all([
        RPGACE.sb.select('routines', 'select=*&active=eq.true&order=sort.asc,created_at.asc'),
        RPGACE.sb.select('quest_log', 'select=id,quest_key,status,xp,description,actual_minutes,completed_at,created_at&quest_kind=eq.routine&created_at=gte.' + since + 'T00:00:00&order=created_at.desc&limit=1000'),
        RPGACE.sb.select('routine_plans', 'select=*&plan_date=gte.' + L.addDays(L.iso(), -21) + '&order=plan_date.asc&limit=2000').catch(function() { return []; }),
        RPGACE.sb.select('day_blocks', 'select=*&end_date=gte.' + L.addDays(L.iso(), -21) + '&order=start_date.asc').catch(function() { return []; }),
        RPGACE.sb.select('quest_log', 'select=quest_key,completed_at,created_at&quest_kind=eq.routine&quest_type=eq.every_days&status=eq.completed&order=completed_at.desc&limit=2000').catch(function() { return []; }),
        RPGACE.sb.select('chore_blocks', 'select=*&status=eq.planned&block_date=gte.' + L.addDays(L.iso(), -1) + '&order=block_date.asc,start_time.asc').catch(function() { return []; }),
        RPGACE.sb.select('journal', 'select=review_on&source=eq.weekly_review&order=review_on.desc&limit=1').catch(function() { return []; }),
        L.loadTaskActions(),
      ]).then(function(r) {
        self._lastReview = Array.isArray(r[6]) && r[6][0] ? r[6][0].review_on : null;
        // DR-5: Actions now live in realm_tasks (cadence set); routines keeps
        // the bookends. Old ticks keep their routine:<old id> key and are
        // matched to the task in memory, never rewritten.
        var acts = Array.isArray(r[7]) ? r[7] : [], remap = {};
        acts.forEach(function(a) { if (a._legacy) remap['routine:' + a._legacy] = 'routine:' + a.id; });
        var fix = function(rows) { (rows || []).forEach(function(l) { if (remap[l.quest_key]) l.quest_key = remap[l.quest_key]; }); return rows; };
        fix(r[1]); fix(r[4]);
        self._choreBlocks = Array.isArray(r[5]) ? r[5] : [];
        self._choreDone = {};
        (Array.isArray(r[4]) ? r[4] : []).forEach(function(l) { var d = L.logDate(l); if (!self._choreDone[l.quest_key] || d > self._choreDone[l.quest_key]) self._choreDone[l.quest_key] = d; });
        self._routines = (Array.isArray(r[0]) ? r[0] : []).concat(acts);
        self._logs = Array.isArray(r[1]) ? r[1] : [];
        self._plans = Array.isArray(r[2]) ? r[2] : [];
        self._blocks = Array.isArray(r[3]) ? r[3] : [];
        return { routines: self._routines, logs: self._logs };
      });
    },

    // ── DR-4/DR-5 (Oct 27 2026, plan "Day & Habits Rewire"; Alex: "Fully
    // merge into Realm Tasks", "Tasks gain all of it") ─────────────────────
    // A realm task with a cadence IS an Action. It is shaped like a routines
    // row here so every My Day flow (due, chains, never-miss-twice, missed
    // why, Sunday review, ▾ lists) keeps one due engine (rule 8).
    TASK_FIELDS: ['title', 'area', 'icon', 'cadence', 'days', 'times_per_week', 'part_of_day', 'preferred_time', 'est_mins', 'xp', 'goal', 'steps', 'opens', 'context', 'due_date', 'every_days', 'last_done_before', 'minimum', 'sort'],
    loadTaskActions: function() {
      var tp = RPGACE.modules.tripPlans, L = RPGACE.modules.myDay.logic;
      if (!tp || !tp.logic.signedIn()) return Promise.resolve([]);
      return tp.logic.read('realm_tasks', 'select=*&status=eq.kept&cadence=not.is.null&order=sort.asc,created_at.asc')
        .then(function(rows) { return (Array.isArray(rows) ? rows : []).filter(function(t) { return t.cadence && t.status === 'kept'; }).map(L.fromTask); })
        .catch(function() { return []; });
    },
    fromTask: function(t) {
      var r = { id: t.id, _task: t, _legacy: t.legacy_routine_id || null, realm: t.realm, active: true, is_sleep: false, after_routine_id: t.after_task_id || null, created_at: t.created_at };
      RPGACE.modules.myDay.logic.TASK_FIELDS.forEach(function(k) { r[k] = t[k]; });
      r.area = t.area || t.realm;
      r.est_mins = t.est_mins || t.mins || 15;
      r.xp = t.xp == null ? 10 : t.xp;
      r.days = Array.isArray(t.days) ? t.days : [];
      r.steps = Array.isArray(t.steps) ? t.steps : [];
      return r;
    },
    // routines-shaped fields -> realm_tasks columns. Pure.
    taskPatch: function(row) {
      var o = {};
      RPGACE.modules.myDay.logic.TASK_FIELDS.forEach(function(k) { if (row[k] !== undefined) o[k] = row[k]; });
      if (row.after_routine_id !== undefined) o.after_task_id = row.after_routine_id || null;
      if (row.est_mins) o.mins = Math.max(5, Math.min(480, Number(row.est_mins) || 15));
      return o;
    },
    isTask: function(r) { return !!(r && r._task); },
    byId: function(id) { return (RPGACE.modules.myDay._routines || []).filter(function(r) { return String(r.id) === String(id); })[0] || null; },
    // One write for an Action, wherever it lives.
    actionUpdate: function(r, patch) {
      var L = RPGACE.modules.myDay.logic;
      if (L.isTask(r)) return RPGACE.sb.secureWrite('realm_tasks', 'update', L.taskPatch(patch), 'id=eq.' + r.id).then(function() { RPGACE.cache.clear('realm_tasks'); Object.assign(r, patch); });
      return RPGACE.sb.secureWrite('routines', 'update', patch, 'id=eq.' + r.id).then(function() { RPGACE.cache.clear('routines'); Object.assign(r, patch); });
    },
    // A new Action is a kept realm task (realm from the form, else its area).
    actionInsert: function(row) {
      var self = RPGACE.modules.myDay, L = self.logic, xs = RPGACE.modules.xpSeason;
      var realm = row.realm && xs && xs.REALMS[row.realm] ? row.realm : (self.AREA_REALM[String(row.area || '').toLowerCase()] || 'life');
      var t = Object.assign(L.taskPatch(row), { realm: realm, kind: row.cadence === 'once' ? 'once' : 'repeat', earns: 'xp', xp: row.xp == null ? 10 : row.xp,
        status: 'kept', sources: [{ table: 'myday', ref: 'action', label: 'Action' }], sort: (self._routines || []).length });
      if (!t.mins) t.mins = 15;
      return RPGACE.sb.secureWrite('realm_tasks', 'insert', t).then(function(data) { RPGACE.cache.clear('realm_tasks'); return Array.isArray(data) ? data[0] : null; });
    },

    logsFor: function(r, logs) { var k = 'routine:' + r.id; return (logs || []).filter(function(l) { return l.quest_key === k; }); },
    // A tick/skip made today for today (a catch-up for an earlier missed day doesn't count).
    todayLog: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic;
      return L.logsFor(r, logs).filter(function(l) { return L.logDate(l) === today && l.description !== 'catch-up'; })[0] || null;
    },
    dueOn: function(r, isoDate) {
      var L = RPGACE.modules.myDay.logic;
      if (r.cadence === 'daily') return true;
      if (r.cadence === 'weekly') {
        if (L.weekHasPlan(r, L.weekStart(isoDate))) return L.plannedOn(r, isoDate);
        return (r.days || []).indexOf(L.dow(isoDate)) !== -1;
      }
      return false;
    },
    // ── DT-3 chores: every N days, counted from the last time done ─────
    // Last done = the later of the newest completed tick and the "last done
    // before" date set when the chore was added. Never done = due now.
    lastDone: function(r) {
      var self = RPGACE.modules.myDay, L = self.logic, k = 'routine:' + r.id;
      var best = r.last_done_before || null;
      var t = self._choreDone[k];
      if (t && (!best || t > best)) best = t;
      (self._logs || []).forEach(function(l) { if (l.quest_key === k && l.status === 'completed') { var d = L.logDate(l); if (!best || d > best) best = d; } });
      return best;
    },
    nextDue: function(r, today) {
      var L = RPGACE.modules.myDay.logic, last = L.lastDone(r);
      return last ? L.addDays(last, Math.max(1, r.every_days || 1)) : (today || L.iso());
    },
    daysBetween: function(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); },
    // { due, overdue (days late, 0 = due today), left (days until due) }
    choreState: function(r, today) {
      var L = RPGACE.modules.myDay.logic, nd = L.nextDue(r, today), diff = L.daysBetween(today, nd);
      return { next: nd, due: diff <= 0, overdue: diff < 0 ? -diff : 0, left: diff > 0 ? diff : 0 };
    },
    chores: function(routines) { return (routines || []).filter(function(r) { return r.cadence === 'every_days'; }); },
    // Bulk add: a chore with no "last done" date gets a staggered first due
    // date (about two a day, never later than one full period) so the whole
    // list doesn't land on day one.
    spreadSeeds: function(items, today) {
      var L = RPGACE.modules.myDay.logic, i = 0;
      return items.slice().sort(function(a, b) { return (a.every_days || 1) - (b.every_days || 1); }).map(function(it) {
        var out = Object.assign({}, it);
        if (!out.last_done_before) {
          var n = Math.max(1, out.every_days || 1), first = L.addDays(today, Math.min(n - 1, Math.floor(i / 2)));
          out.last_done_before = L.addDays(first, -n);
          i++;
        }
        return out;
      });
    },
    addChores: function(items) {
      var self = RPGACE.modules.myDay, L = self.logic, today = L.iso();
      var rows = L.spreadSeeds(items, today).map(function(it, i) {
        var row = L.clean(Object.assign({ area: 'Chores', cadence: 'every_days' }, it));
        var bad = L.validate(row);
        if (bad) throw new Error(it.title + ': ' + bad);
        row.sort = self._routines.length + i;
        return row;
      });
      if (!rows.length) return Promise.resolve();
      // DR-5: chores are Homekeeper tasks now.
      return Promise.all(rows.map(function(row) { return L.actionInsert(Object.assign({ realm: 'homekeeper' }, row)); }));
    },
    // ── DT-4 chore blocks ───────────────────────────────────────────────
    // Alex: a block of time for room chores that fills itself with the most
    // overdue chores until the time is used. Chores due by the block's date
    // come first (most overdue first); spare time takes the next ones due
    // (doing a chore early just restarts its countdown). A chore that
    // doesn't fit is skipped so a shorter one after it can still fit.
    fillBlock: function(mins, dateIso, excludeIds) {
      var self = RPGACE.modules.myDay, L = self.logic, skip = {};
      (excludeIds || []).forEach(function(id) { skip[String(id)] = 1; });
      var list = L.chores(self._routines).filter(function(r) { return !skip[String(r.id)]; })
        .map(function(r) { return { r: r, next: L.nextDue(r, dateIso) }; })
        .sort(function(a, b) { return a.next < b.next ? -1 : a.next > b.next ? 1 : (a.r.every_days || 1) - (b.r.every_days || 1); });
      var used = 0, out = [];
      list.forEach(function(x) {
        var m = Math.max(1, x.r.est_mins || 15);
        if (used + m > mins) return;
        used += m;
        out.push({ r: x.r, next: x.next, early: x.next > dateIso });
      });
      return { items: out, used: used };
    },
    choreBlocksOn: function(isoDate) {
      return (RPGACE.modules.myDay._choreBlocks || []).filter(function(b) { return b.block_date === isoDate && (b.kind || 'chores') === 'chores'; });
    },
    // Chores already in another planned block on that date.
    blockedIds: function(isoDate, exceptId) {
      var ids = [];
      RPGACE.modules.myDay.logic.choreBlocksOn(isoDate).forEach(function(b) { if (b.id !== exceptId) ids = ids.concat(b.routine_ids || []); });
      return ids;
    },
    blockChores: function(b) {
      var byId = {};
      (RPGACE.modules.myDay._routines || []).forEach(function(r) { byId[String(r.id)] = r; });
      return (b.routine_ids || []).map(function(id) { return byId[String(id)]; }).filter(Boolean);
    },
    saveChoreBlock: function(f) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var start = L.toMin(f.start), mins = parseInt(f.mins, 10) || 0;
      if (!f.date) return Promise.reject(new Error('Pick the day.'));
      if (start == null) return Promise.reject(new Error('Pick a start time.'));
      if (mins < 10 || mins > 480) return Promise.reject(new Error('Length must be 10 minutes to 8 hours.'));
      if (!(f.ids || []).length) return Promise.reject(new Error('Pick at least one chore.'));
      var row = { block_date: f.date, start_time: L.fmtMin(start), mins: mins, routine_ids: f.ids.map(String), status: 'planned', realm: 'homekeeper' }; // DL-6: Housekeeping = the Homekeeper realm
      // MD-1: no overlaps - make room first (push rule).
      return L.guard(f.date, start, mins).then(function(g) { L._noteMoved(g); return RPGACE.sb.secureWrite('chore_blocks', 'insert', row); }).then(function(data) {
        var saved = (Array.isArray(data) && data[0]) || null;
        if (!saved || !saved.id) throw new Error('The block saved but came back without an id — reload My Day.');
        var titles = L.blockChores(saved).map(function(r) { return r.title; });
        var entry = scheduleToCalendar({ title: '🧹 Homekeeper block', description: titles.join(' · '), category: 'chores', xp: 0,
          duration_mins: mins, hour: Math.floor(start / 60), minute: start % 60, date: f.date, source_type: 'chore_block', source_id: saved.id });
        saved.agenda_id = entry.id;
        self._choreBlocks = self._choreBlocks.concat([saved]);
        RPGACE.cache.clear('chore_blocks');
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { agenda_id: entry.id }, 'id=eq.' + saved.id).then(function() { return saved; });
      });
    },
    // Cancel: the block and its Daily Schedule entry go; the chores stay due.
    // A cooking block also discards its planned cook (only while still
    // scheduled - a cooked one is history and stays).
    cancelChoreBlock: function(b) { return RPGACE.modules.myDay.logic._retireBlock(b, { status: 'cancelled' }); },
    // AC-4 (Oct 22 2026, Alex: "make doing now and I just did have effect over
    // schedule"): what you actually did took the block's place. Same clean-up
    // as cancel; the row is kept as 'replaced' with the Doing Now entry's id.
    replaceBlock: function(b, entryId) {
      return RPGACE.modules.myDay.logic._retireBlock(b, { status: 'replaced', replaced_by: entryId ? String(entryId) : null });
    },
    _retireBlock: function(b, patch) {
      var self = RPGACE.modules.myDay;
      return RPGACE.sb.secureWrite('chore_blocks', 'update', patch, 'id=eq.' + b.id).then(function() {
        if (b.kind === 'cooking' && b.planned_cook_id) {
          RPGACE.sb.secureWrite('planned_cooks', 'update', { status: 'discarded' }, 'id=eq.' + b.planned_cook_id + '&status=eq.scheduled')
            .catch(function(e) { RPGACE.utils.toast('⚠️ Block cancelled, but the planned cook in Cooking was not: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
        }
        RPGACE.cache.clear('chore_blocks');
        self._choreBlocks = self._choreBlocks.filter(function(x) { return x.id !== b.id; });
        if (b.agenda_id) {
          RPGACE.sb.secureWrite('rpgace_agendas', 'delete', null, 'id=eq.' + b.agenda_id)
            .catch(function(e) { console.warn('[myDay] could not delete the chore block schedule entry:', e.message); });
          try { RPGACE.DB.set('sched', (RPGACE.DB.get('sched') || []).filter(function(a) { return a.id !== b.agenda_id; })); } catch (e) {}
        }
      });
    },
    // ── DT-5/6 cooking + shopping blocks ────────────────────────────────
    // Alex: "make cooking blocks and shopping blocks too, and in those
    // blocks I choose what I'm getting" - a checklist on the day. Both live
    // in chore_blocks (kind cooking/shopping, items = the checklist). A
    // cooking block is a real Cooking planned cook: locking it in runs
    // cookingOracle's own grocery-list generator and scheduler
    // (_generateShoppingList, _computeSessionSchedule, _acceptSchedule) and
    // finishing it uses _finishCook - never a second cook mechanism.
    lifeBlocksOn: function(isoDate) {
      return (RPGACE.modules.myDay._choreBlocks || []).filter(function(b) { return b.block_date === isoDate && (b.kind === 'cooking' || b.kind === 'shopping' || b.kind === 'realm'); });
    },
    loadRecipes: function() {
      var self = RPGACE.modules.myDay;
      if (self._recipes) return Promise.resolve(self._recipes);
      return RPGACE.sb.select('recipes', 'select=id,title,steps,servings_base&order=created_at.desc&limit=200').then(function(rows) {
        self._recipes = Array.isArray(rows) ? rows : [];
        return self._recipes;
      });
    },
    // Minutes the Cooking scheduler says these recipes take together.
    cookMinutes: function(recipes) {
      var co = RPGACE.modules.cookingOracle;
      try {
        var sch = co && co.logic._computeSessionSchedule(recipes, null);
        if (sch && sch.totalMinutes > 0) return Math.max(15, Math.round(sch.totalMinutes));
      } catch (e) { console.warn('[myDay] cook schedule:', e.message); }
      return 60;
    },
    _usage: function(recipeIds) {
      var co = RPGACE.modules.cookingOracle;
      return new Promise(function(res) {
        if (!co || !recipeIds || !recipeIds.length) { res([]); return; }
        co.logic._computeIngredientUsage(recipeIds, function(err, usage) { res(err ? [] : (usage || [])); });
      });
    },
    _listItemLabel: function(it) {
      var n = (it.ingredients && it.ingredients.name) || it.name || 'Item';
      return n + (it.to_buy_amount ? ' (' + (+Number(it.to_buy_amount).toFixed(2)) + (it.needed_unit ? ' ' + it.needed_unit : '') + ')' : '');
    },
    // What a shopping block can offer, in groups: what this day's cooking
    // blocks are missing, lists already made for planned cooks, the newest
    // Cooking list, Wishlist items, and next-time-shopping routines.
    shopSources: function(isoDate, dayItems) {
      var self = RPGACE.modules.myDay, L = self.logic, today = L.iso();
      var cookIds = [];
      (dayItems || []).forEach(function(x) { if (x.type === 'cooking_block' && x.keep !== false) cookIds = cookIds.concat(x.recipe_ids || []); });
      var itemSel = 'select=id,list_id,bought,to_buy_amount,needed_unit,ingredient_id,ingredients(name)&bought=eq.false';
      return Promise.all([
        L._usage(cookIds),
        RPGACE.sb.select('planned_cooks', 'select=id,scheduled_at&status=eq.scheduled&scheduled_at=gte.' + today).catch(function() { return []; }),
        RPGACE.sb.select('shopping_lists', 'select=id,planned_cook_id,created_at&order=created_at.desc&limit=1').catch(function() { return []; }),
        RPGACE.sb.select('wishlist_items', 'select=id,name,estimated_price&status=neq.bought&order=created_at.desc').catch(function() { return []; }),
      ]).then(function(r) {
        var groups = [];
        var forCook = (r[0] || []).filter(function(u) { return (u.toBuy || 0) > 0 && u.status !== 'brown'; }).map(function(u) {
          return { src: 'cook', ingredient_id: u.ingredient_id, label: u.name + ' (' + (+Number(u.toBuy).toFixed(2)) + (u.unit ? ' ' + u.unit : '') + ')' };
        });
        if (forCook.length) groups.push({ key: 'cook', title: '🍳 Missing for this day\'s cooking', items: forCook });
        var cooks = (r[1] || []).filter(function(c) { return c.id; }), cookIdsSet = cooks.map(function(c) { return c.id; });
        var newest = (r[2] || [])[0];
        var listsQ = cooks.length ? RPGACE.sb.select('shopping_lists', 'select=id,planned_cook_id&planned_cook_id=in.(' + cookIdsSet.join(',') + ')').catch(function() { return []; }) : Promise.resolve([]);
        return listsQ.then(function(cookLists) {
          var listIds = (cookLists || []).map(function(l) { return l.id; });
          if (newest && listIds.indexOf(newest.id) === -1) listIds.push(newest.id);
          var itemsQ = listIds.length ? RPGACE.sb.select('shopping_list_items', itemSel + '&list_id=in.(' + listIds.join(',') + ')').catch(function() { return []; }) : Promise.resolve([]);
          return itemsQ.then(function(items) {
            var byList = {};
            (items || []).forEach(function(it) { (byList[it.list_id] = byList[it.list_id] || []).push(it); });
            (cookLists || []).forEach(function(l) {
              var c = cooks.filter(function(x) { return x.id === l.planned_cook_id; })[0];
              var its = byList[l.id] || [];
              if (its.length) groups.push({ key: 'cooklist_' + l.id, title: '🧾 For your planned cook' + (c && c.scheduled_at ? ' on ' + self.ui._dayLabel(String(c.scheduled_at).slice(0, 10)) : ''), items: its.map(function(it) { return { src: 'list', ref_id: it.id, ingredient_id: it.ingredient_id, label: L._listItemLabel(it) }; }) });
            });
            if (newest && !(cookLists || []).some(function(l) { return l.id === newest.id; })) {
              var its = byList[newest.id] || [];
              if (its.length) groups.push({ key: 'newest', title: '🧾 Newest Cooking list', items: its.map(function(it) { return { src: 'list', ref_id: it.id, ingredient_id: it.ingredient_id, label: L._listItemLabel(it) }; }) });
            }
            var wl = (r[3] || []).map(function(w) { return { src: 'wishlist', ref_id: w.id, label: w.name + (w.estimated_price != null ? ' (~£' + w.estimated_price + ')' : '') }; });
            if (wl.length) groups.push({ key: 'wishlist', title: '🛒 Wishlist', items: wl });
            var rt = (self._routines || []).filter(function(x) { return x.cadence === 'next_time' && (x.context || 'shopping') === 'shopping'; })
              .map(function(x) { return { src: 'routine', ref_id: String(x.id), label: x.title }; });
            if (rt.length) groups.push({ key: 'routine', title: '☀️ Next time I\'m shopping', items: rt });
            // Same ingredient offered twice (this day's cook + an existing list): keep the list row.
            var onLists = {};
            groups.forEach(function(g) { if (g.key !== 'cook') g.items.forEach(function(i) { if (i.ingredient_id) onLists[i.ingredient_id] = 1; }); });
            groups.forEach(function(g) { if (g.key === 'cook') g.items = g.items.filter(function(i) { return !onLists[i.ingredient_id]; }); });
            return groups.filter(function(g) { return g.items.length; });
          });
        });
      });
    },
    // Lock in a cooking block: a Cooking grocery list + a scheduled planned
    // cook (with its Daily Schedule entry) through Cooking's own functions,
    // then the block row that links them. Resolves { block, listId }.
    saveCookingBlock: function(isoDate, x) {
      var self = RPGACE.modules.myDay, L = self.logic, co = RPGACE.modules.cookingOracle;
      if (!co) return Promise.reject(new Error('Cooking is not loaded'));
      var m = L.toMin(x.start);
      return L.guard(isoDate, m, Math.max(10, Math.min(480, parseInt(x.mins, 10) || 60))).then(function(g) { L._noteMoved(g); return L.loadRecipes(); }).then(function(all) {
        var recipes = all.filter(function(r) { return (x.recipe_ids || []).indexOf(String(r.id)) !== -1 || (x.recipe_ids || []).indexOf(r.id) !== -1; });
        if (!recipes.length) throw new Error('Pick at least one recipe for the cooking block.');
        var ids = recipes.map(function(r) { return r.id; });
        var schedule = co.logic._computeSessionSchedule(recipes, null);
        return new Promise(function(res) {
          co.logic._generateShoppingList({ recipeIds: ids, shopMode: 'can_shop' }, function(err, listId) {
            if (err) RPGACE.utils.toast('⚠️ No grocery list made for this cook: ' + err, '#E2A83D', 3500);
            res(err ? null : listId);
          });
        }).then(function(listId) {
          return new Promise(function(res, rej) {
            co.logic._acceptSchedule({ plannedCookId: null, recipeIds: ids, recipes: recipes, shopMode: 'can_shop', shoppingListId: listId }, schedule, isoDate, Math.floor(m / 60), m % 60, function(err, pcId, agendaId) {
              if (err) rej(new Error(err)); else res({ pcId: pcId, agendaId: agendaId, listId: listId });
            });
          });
        }).then(function(made) {
          var row = { kind: 'cooking', block_date: isoDate, start_time: L.fmtMin(m), mins: Math.max(10, Math.min(480, parseInt(x.mins, 10) || 60)), routine_ids: [],
            items: recipes.map(function(r) { return { src: 'recipe', ref_id: String(r.id), label: r.title, done: false }; }), planned_cook_id: made.pcId, agenda_id: made.agendaId, status: 'planned' };
          return RPGACE.sb.secureWrite('chore_blocks', 'insert', row).then(function(data) {
            var saved = (Array.isArray(data) && data[0]) || row;
            self._choreBlocks = self._choreBlocks.concat([saved]);
            RPGACE.cache.clear('chore_blocks');
            return { block: saved, listId: made.listId };
          });
        });
      });
    },
    // Lock in a shopping block. Items from this day's cooking ('cook') are
    // matched to the grocery list the cooking block just made, by ingredient.
    saveShoppingBlock: function(isoDate, x, listIds) {
      var self = RPGACE.modules.myDay, L = self.logic, m = L.toMin(x.start);
      var want = (x.shop_items || []).filter(function(i) { return i && i.label; });
      if (!want.length) return Promise.reject(new Error('Pick at least one thing for the shopping block.'));
      var resolve = L.guard(isoDate, m, Math.max(10, Math.min(480, parseInt(x.mins, 10) || 45))).then(function(g) { L._noteMoved(g); }).then(function() { return (listIds || []).length && want.some(function(i) { return i.src === 'cook'; })
        ? RPGACE.sb.select('shopping_list_items', 'select=id,ingredient_id&bought=eq.false&list_id=in.(' + listIds.join(',') + ')').catch(function() { return []; })
        : []; });
      return resolve.then(function(rows) {
        var byIng = {};
        (rows || []).forEach(function(r) { byIng[r.ingredient_id] = r.id; });
        var items = want.map(function(i) {
          var o = { src: i.src, ref_id: i.ref_id || null, label: i.label, done: false };
          if (i.src === 'cook') { if (byIng[i.ingredient_id]) { o.src = 'list'; o.ref_id = byIng[i.ingredient_id]; } else { o.src = 'own'; o.ref_id = null; } }
          return o;
        });
        var row = { kind: 'shopping', block_date: isoDate, start_time: L.fmtMin(m), mins: Math.max(10, Math.min(480, parseInt(x.mins, 10) || 45)), routine_ids: [], items: items, status: 'planned' };
        return RPGACE.sb.secureWrite('chore_blocks', 'insert', row).then(function(data) {
          var saved = (Array.isArray(data) && data[0]) || null;
          if (!saved || !saved.id) throw new Error('The shopping block saved but came back without an id — reload My Day.');
          var entry = scheduleToCalendar({ title: '🛒 Shopping', description: items.map(function(i) { return i.label; }).join(' · '), category: 'shopping', xp: 0,
            duration_mins: saved.mins, hour: Math.floor(m / 60), minute: m % 60, date: isoDate, source_type: 'shopping_block', source_id: saved.id });
          saved.agenda_id = entry.id;
          self._choreBlocks = self._choreBlocks.concat([saved]);
          RPGACE.cache.clear('chore_blocks');
          return RPGACE.sb.secureWrite('chore_blocks', 'update', { agenda_id: entry.id }, 'id=eq.' + saved.id).then(function() { return saved; });
        });
      });
    },
    // Tick one checklist item. List items are marked bought in Cooking; a
    // next-time routine is ticked (and leaves the list, as on My Day);
    // Wishlist items are handled by the caller (they ask what was paid).
    // When every dish in a cooking block is ticked, the cook is finished
    // through Cooking's own _finishCook.
    setBlockItem: function(b, idx, done) {
      var self = RPGACE.modules.myDay, L = self.logic, it = (b.items || [])[idx];
      if (!it) return Promise.reject(new Error('That item is gone — reload My Day.'));
      var side = Promise.resolve();
      if (it.src === 'list' && it.ref_id) side = RPGACE.sb.secureWrite('shopping_list_items', 'update', done ? { bought: true, in_basket: true } : { bought: false }, 'id=eq.' + it.ref_id);
      var patch = {};
      if (it.src === 'routine') {
        var r = (self._routines || []).filter(function(x) { return String(x.id) === String(it.ref_id); })[0];
        if (r && done) side = L.tick(r).then(function() { return r.cadence === 'next_time' ? L.remove(r.id) : null; });
        // Undo in a realm block: remove today's tick for that routine (same as My Day's own Undo).
        if (r && !done && b.kind === 'realm') { var lg = L.todayLog(r, self._logs, L.iso()); if (lg) side = L.undo(lg); }
      }
      // DT-7: a realm-block activity with no XP of its own (+10, books, own
      // items) pays into that realm through a quest_log row (quest_kind
      // 'block' -> xp_on_change -> xp_award('block_tick')). 'real' ones only
      // check off - the real action pays ("No double counting").
      if (b.kind === 'realm' && it.src !== 'routine' && it.earns !== 'real') {
        if (done && !it.log_id) {
          side = RPGACE.sb.secureWrite('quest_log', 'insert', {
            quest_key: 'block:' + b.id + ':' + idx, quest_kind: 'block', name: it.label, category: b.realm, quest_type: 'block',
            // Realm Tasks: a task from a video pays its own size (5-100); others +10.
            xp: it.earns === 'xp' && it.xp ? Math.min(100, Math.max(5, Number(it.xp) || 0)) : self.TICK_XP, estimated_minutes: it.mins || null, completed_at: new Date().toISOString(), status: 'completed',
            source_table: 'chore_blocks', source_ref: String(b.id),
          }).then(function(data) { var row = Array.isArray(data) && data[0]; patch.log_id = row && row.id ? row.id : null; RPGACE.cache.clear('quest_log'); });
        } else if (!done && it.log_id) {
          side = RPGACE.sb.secureWrite('quest_log', 'delete', null, 'id=eq.' + it.log_id).then(function() { patch.log_id = null; RPGACE.cache.clear('quest_log'); });
        }
      }
      return side.then(function() {
        var items = (b.items || []).map(function(x, i) { return i === idx ? Object.assign({}, x, patch, { done: !!done }) : x; });
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { items: items }, 'id=eq.' + b.id).then(function() {
          b.items = items;
          RPGACE.cache.clear('chore_blocks');
          var finished = b.kind === 'cooking' && items.length && items.every(function(x) { return x.done; });
          if (!finished || !b.planned_cook_id) return { finished: false };
          var co = RPGACE.modules.cookingOracle;
          return new Promise(function(res) {
            co.logic._finishCook(b.planned_cook_id, b.agenda_id, items.map(function(x) { return x.ref_id; }), function(err) {
              if (err) RPGACE.utils.toast('⚠️ All dishes ticked, but Cooking could not mark the cook finished: ' + err, '#CC4A4A', 4000, 'myDay');
              res({ finished: !err });
            });
          });
        });
      });
    },
    // ── DT-7 realm blocks ───────────────────────────────────────────────
    realmOf: function(r) { return (r && r._task && r.realm) || RPGACE.modules.myDay.AREA_REALM[String(r.area || '').toLowerCase()] || 'life'; },
    // AC-1 (Oct 21 2026, plan "Side List Everywhere + Real-Day Timeline";
    // Alex: "routines is not a feature I want anymore right now, change it
    // to action"): the Actions for the ▶ Doing now / ✓ I just did lists -
    // due today first (most overdue first), then what he did lately, then
    // the rest. recent = Doing Now rows. Pure apart from module state.
    actionList: function(today, recent) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var norm = function(t) { return String(t || '').trim().toLowerCase(); };
      var item = function(r, sub) { return { label: r.title, mins: Number(r.est_mins) || null, realm: L.realmOf(r), icon: r.icon || '', sub: sub || '', routine: r }; };
      var active = (self._routines || []).filter(function(r) { return r.active !== false && !(r.cadence === 'once' && r.due_date && r.due_date < today); });
      var due = [], rest = [], seen = {};
      active.forEach(function(r) {
        if (L.dueOnDate(r, today) && !L.todayLog(r, self._logs, today)) {
          var st = r.cadence === 'every_days' ? L.choreState(r, today) : null;
          var o = item(r, st && st.overdue ? st.overdue + ' day' + (st.overdue === 1 ? '' : 's') + ' overdue' : 'due today');
          o.late = st ? st.overdue : 0;
          due.push(o);
        } else {
          var st2 = r.cadence === 'every_days' ? L.choreState(r, today) : null;
          rest.push(item(r, st2 && st2.left ? 'due in ' + st2.left + ' day' + (st2.left === 1 ? '' : 's') : ''));
        }
      });
      due.sort(function(a, b) { return b.late - a.late || a.label.localeCompare(b.label); });
      rest.sort(function(a, b) { return a.label.localeCompare(b.label); });
      due.forEach(function(o) { seen[norm(o.label)] = 1; });
      var lately = [];
      (recent || []).slice().sort(function(a, b) { return String(b.started_at || '').localeCompare(String(a.started_at || '')); }).forEach(function(e) {
        var k = norm(e.title);
        if (!k || seen[k] || lately.length >= 5) return;
        seen[k] = 1;
        lately.push({ label: e.title, mins: Number(e.actual_mins) || null, realm: (e.realms && e.realms[0]) || null, icon: '', sub: 'you did this lately' });
      });
      rest = rest.filter(function(o) { return !seen[norm(o.label)]; });
      return { due: due, recent: lately, rest: rest };
    },
    // The 13 realms, the one furthest behind this week first ("Yes, gently").
    realmChoices: function() {
      var xs = RPGACE.modules.xpSeason;
      var base = xs ? xs.ORDER.map(function(k) { return { realm: k, icon: xs.REALMS[k].icon, name: xs.REALMS[k].name, week: null }; }) : [];
      if (!xs) return Promise.resolve(base);
      return xs.logic.load().then(function(events) {
        if (!events) return base;
        var sum = xs.logic.summary(events);
        base.forEach(function(c) { c.week = sum.week[c.realm] || 0; });
        var low = base.slice().sort(function(a, b) { return a.week - b.week; })[0];
        if (low) { low.behind = true; base = [low].concat(base.filter(function(c) { return c !== low; })); }
        return base;
      }).catch(function() { return base; });
    },
    // What a realm block can hold: the starter activities, routines in that
    // realm, and (Scholar) books being read outside RPGACE.
    realmOptions: function(realm) {
      var self = RPGACE.modules.myDay, L = self.logic;
      // Realm Tasks (Oct 27 2026): the realm's kept tasks (realmTasks) replace the old hard-coded list.
      var rt = RPGACE.modules.realmTasks;
      var starterP = rt ? rt.logic.load().then(function() { return rt.logic.activities(realm); }, function() { return rt.logic.activities(realm); }) : Promise.resolve([]);
      var routines = (self._routines || []).filter(function(r) { return r.cadence !== 'every_days' && r.cadence !== 'next_time' && L.realmOf(r) === realm; })
        .map(function(r) { return { src: 'routine', ref_id: String(r.id), label: r.title, mins: r.est_mins || 15, earns: 'real', how: 'its routine XP', opens: r.opens || null }; });
      var tp = RPGACE.modules.tripPlans;
      var books = realm === 'scholar' && tp && tp.logic.signedIn()
        ? tp.logic.read('library_items', 'select=id,title,status,source_table&kind=eq.book').then(function(rows) {
            return (rows || []).filter(function(b) { return b.status !== 'done' && b.source_table !== 'bookworm_books'; })
              .map(function(b) { return { src: 'book', ref_id: String(b.id), label: 'Read ' + b.title, mins: 30, earns: 'tick' }; });
          }).catch(function() { return []; })
        : Promise.resolve([]);
      return Promise.all([books, starterP]).then(function(r) {
        var starters = (r[1] || []).map(function(a) { return { src: 'activity', ref_id: a.key, label: a.title, mins: a.mins, earns: a.earns, xp: a.xp || null, how: a.how || null, opens: a.opens || null, type: a.type || null, context_kind: a.context_kind || null }; });
        return { starters: starters, routines: routines, books: r[0] };
      });
    },
    saveRealmBlock: function(isoDate, x) {
      var self = RPGACE.modules.myDay, L = self.logic, m = L.toMin(x.start), xs = RPGACE.modules.xpSeason;
      var want = (x.realm_items || []).filter(function(i) { return i && i.label; });
      if (!x.realm) return Promise.reject(new Error('Pick a realm for the block.'));
      if (!want.length) return Promise.reject(new Error('Pick at least one activity for the ' + x.realm + ' block.'));
      var rl = xs && xs.REALMS[x.realm] ? xs.REALMS[x.realm] : { icon: '✨', name: x.realm };
      var items = want.map(function(i) { return { src: i.src, ref_id: i.ref_id || null, label: i.label, mins: i.mins || null, earns: i.earns || 'tick', xp: i.xp || null, how: i.how || null, opens: i.opens || null, done: false, context_kind: i.context_kind || null, context_id: i.context_id || null, context: i.context || null }; });
      var row = { kind: 'realm', realm: x.realm, block_date: isoDate, start_time: L.fmtMin(m), mins: Math.max(10, Math.min(480, parseInt(x.mins, 10) || 60)), routine_ids: [], items: items, status: 'planned' };
      if (x.method && self.METHODS[x.method] && !self._noMethodCol) row.method = x.method;
      // MD-2: until chore_blocks.method exists, save without it (the realm default applies).
      var insert = function() {
        return RPGACE.sb.secureWrite('chore_blocks', 'insert', row).catch(function(e) {
          if (row.method && /method/i.test(e.message || '')) { self._noMethodCol = true; delete row.method; return RPGACE.sb.secureWrite('chore_blocks', 'insert', row); }
          throw e;
        });
      };
      return L.guard(isoDate, m, row.mins).then(function(g) { L._noteMoved(g); return insert(); }).then(function(data) {
        var saved = (Array.isArray(data) && data[0]) || null;
        if (!saved || !saved.id) throw new Error('The block saved but came back without an id — reload My Day.');
        var entry = scheduleToCalendar({ title: rl.icon + ' ' + rl.name + ' block', description: items.map(function(i) { return i.label; }).join(' · '), category: x.realm, xp: 0,
          duration_mins: saved.mins, hour: Math.floor(m / 60), minute: m % 60, date: isoDate, source_type: 'realm_block', source_id: saved.id });
        saved.agenda_id = entry.id;
        self._choreBlocks = self._choreBlocks.concat([saved]);
        RPGACE.cache.clear('chore_blocks');
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { agenda_id: entry.id }, 'id=eq.' + saved.id).then(function() { return saved; });
      });
    },
    // ── DT-1 day templates ──────────────────────────────────────────────
    // Alex: "routines should remember the day and give 1st suggestion of
    // template for day that can be shaped similar, with me being able to
    // change chosen activities within template before locking in as planned
    // day". Day kind: no shift = off; a closing shift (ends at/after 23:30 or
    // past midnight - his closes end 00:00) = late; any other shift = early.
    dayKind: function(isoDate) {
      var L = RPGACE.modules.myDay.logic, sh = L.shiftsOn(isoDate);
      if (!sh.length) return 'off';
      return sh.some(function(x) {
        var a = L.toMin(x.start), b = L.toMin(x.end);
        return a != null && b != null && (b <= a || b >= 23 * 60 + 30);
      }) ? 'late' : 'early';
    },
    // Is routine r due on a (possibly future) date? Used to keep a template's
    // routines honest for the day it's applied to.
    dueOnDate: function(r, isoDate) {
      var L = RPGACE.modules.myDay.logic;
      if (r.cadence === 'daily' || r.cadence === 'weekly') return L.dueOn(r, isoDate);
      if (r.cadence === 'times_per_week') return true;
      if (r.cadence === 'once') return r.due_date === isoDate;
      if (r.cadence === 'every_days') return L.nextDue(r, isoDate) <= isoDate;
      return false;
    },
    // Build the editable day for a date from a source's items: routines that
    // were removed or aren't due that day drop out; a chore block refills
    // with that day's most overdue chores; routines due that day but missing
    // from the template are fitted into free gaps (marked added). Chores due
    // that day are left to the chore block.
    sortDay: function(items) {
      var L = RPGACE.modules.myDay.logic;
      return items.sort(function(a, b) { var x = L.toMin(a.start), y = L.toMin(b.start); return (x == null ? 9999 : x) - (y == null ? 9999 : y); });
    },
    // Items that overlap the shift (with its get-ready/travel and journey home).
    clashes: function(isoDate, items) {
      var L = RPGACE.modules.myDay.logic;
      return items.map(function(x) {
        var m = L.toMin(x.start);
        return m == null ? false : !!L.clashWith(isoDate, m, Number(x.mins) || 0);
      });
    },
    // Oct 20 2026 (Alex: "How can I be at the dentist when I'm on the bar?"):
    // the shift (or its get-ready/travel time) a slot lands on, or null. The
    // one check used by Plan my day, the Daily Schedule's ⚠ flag and the
    // Schedule's add form.
    clashWith: function(isoDate, startMin, mins) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var hit = L.segments({ shifts: L.shiftsOn(isoDate), st: self._settings })
        .filter(function(g) { return startMin < g.to && startMin + mins > g.from; })
        .sort(function(a, b) { return (a.kind === 'shift' ? 0 : 1) - (b.kind === 'shift' ? 0 : 1); })[0];
      return hit || null;
    },
    // Nearest start (5-min steps) with the day's shift, travel, Schedule
    // items, blocks and Morning/Night all clear; null if none.
    freeFor: function(isoDate, startMin, mins) {
      var L = RPGACE.modules.myDay.logic, dp = L.dayParts(isoDate);
      return L.nearestFree(L.segments({ shifts: dp.shifts, sched: dp.sched, blocks: dp.blocks, bookends: dp.bookends, st: dp.st }), startMin, mins);
    },
    // Only what a template needs, never the editor's flags.
    cleanItems: function(items) {
      return (items || []).filter(function(x) { return x.keep !== false && x.start; }).map(function(x) {
        var o = { type: x.type, title: x.title, start: x.start, mins: Math.max(5, parseInt(x.mins, 10) || 15) };
        if (x.type === 'routine') o.routine_id = String(x.routine_id);
        if (x.type === 'cooking_block') o.recipe_ids = (x.recipe_ids || []).map(String);
        if (x.type === 'realm_block') { o.realm = x.realm; o.realm_items = (x.realm_items || []).map(function(i) { var c = { src: i.src, label: i.label, earns: i.earns || 'tick' }; if (i.ref_id) c.ref_id = String(i.ref_id); if (i.mins) c.mins = i.mins; if (i.how) c.how = i.how; if (i.opens) c.opens = i.opens; return c; }); }
        if (x.type === 'shopping_block') o.shop_items = (x.shop_items || []).map(function(i) { var c = { src: i.src, label: i.label }; if (i.ref_id) c.ref_id = String(i.ref_id); if (i.ingredient_id) c.ingredient_id = String(i.ingredient_id); return c; });
        if (x.category) o.category = x.category;
        if (x.place) o.place = x.place;
        if (x.journey_mins != null && x.journey_mins !== '') o.journey_mins = Number(x.journey_mins) || 0;
        return o;
      });
    },
    // Lock in: every kept item goes on the Daily Schedule (places keep their
    // journey so the get-ready + travel time shows), routines are planned for
    // that day (routine_plans, for weekly / N-a-week ones), and a chore block
    // becomes a real chore block. AC-2 (Oct 21 2026): no day record is kept
    // any more - Alex: "making templates would not work for me".
    // Anything already on that day's schedule (same routine, or same title at
    // the same time) is skipped, so locking twice doesn't double up.
    lockDay: function(isoDate, items) {
      var self = RPGACE.modules.myDay, L = self.logic, byId = {};
      (self._routines || []).forEach(function(r) { byId[String(r.id)] = r; });
      var clean = L.cleanItems(items);
      if (!clean.length) return Promise.reject(new Error('Nothing kept to lock in.'));
      var existing = L.schedOn(isoDate), ops = [], added = 0, skipped = 0, plans = [];
      var dup = function(x) {
        var m = L.toMin(x.start);
        return existing.some(function(e) {
          if (x.type === 'routine' && e.source_type === 'routine' && String(e.source_id) === String(x.routine_id)) return true;
          if (x.type === 'chore_block' && e.source_type === 'chore_block') return true;
          if (x.type === 'cooking_block' && e.source_type === 'planned_cook') return true;
          if (x.type === 'shopping_block' && e.source_type === 'shopping_block') return true;
          if (x.type === 'realm_block' && e.source_type === 'realm_block' && (Number(e.hour) || 0) * 60 + (Number(e.minute) || 0) === m) return true;
          return e.title === x.title && (Number(e.hour) || 0) * 60 + (Number(e.minute) || 0) === m;
        });
      };
      var srcItems = items || [];
      // DT-5/6: cooking blocks first (each makes a grocery list), then
      // shopping blocks, which pick up those lists' items.
      var later = [];
      clean.forEach(function(x, i) {
        if (dup(x)) { skipped++; return; }
        var m = L.toMin(x.start);
        if (x.type === 'cooking_block' || x.type === 'shopping_block' || x.type === 'realm_block') { later.push(x); added++; return; }
        if (x.type === 'chore_block') {
          var orig = srcItems.filter(function(s) { return s.type === 'chore_block' && s.keep !== false && s.start === x.start; })[0] || {};
          var ids = orig.chore_ids || L.fillBlock(x.mins, isoDate, L.blockedIds(isoDate)).items.map(function(c) { return String(c.r.id); });
          if (!ids.length) { skipped++; return; }
          ops.push(L.saveChoreBlock({ date: isoDate, start: x.start, mins: x.mins, ids: ids }));
          added++;
          return;
        }
        var r = x.type === 'routine' ? byId[String(x.routine_id)] : null;
        scheduleToCalendar({ title: x.title, description: r ? (r.goal || '') : '', category: x.category || (r ? (r.area || 'personal').toLowerCase() : 'personal'), xp: r ? (r.xp || 0) : 0,
          duration_mins: x.mins, hour: Math.floor(m / 60), minute: m % 60, date: isoDate, source_type: r ? 'routine' : 'agenda', source_id: r ? r.id : null,
          place: x.place || null, journey_mins: x.journey_mins != null ? x.journey_mins : null });
        added++;
        if (r && L.plannable(r) && !L.plannedOn(r, isoDate)) plans.push({ routine_id: r.id, plan_date: isoDate, status: 'planned', moved_to: null });
      });
      if (plans.length) ops.push(RPGACE.sb.secureWrite('routine_plans', 'insert', plans, null, 'routine_id,plan_date').then(function(data) {
        self._plans = self._plans.concat(Array.isArray(data) && data.length ? data : plans);
        RPGACE.cache.clear('routine_plans');
      }));
      var listIds = [];
      var chain = later.filter(function(x) { return x.type === 'cooking_block'; }).reduce(function(p, x) {
        return p.then(function() { return L.saveCookingBlock(isoDate, x).then(function(r) { if (r.listId) listIds.push(r.listId); }); });
      }, Promise.resolve());
      chain = later.filter(function(x) { return x.type === 'shopping_block'; }).reduce(function(p, x) {
        return p.then(function() { return L.saveShoppingBlock(isoDate, x, listIds); });
      }, chain);
      chain = later.filter(function(x) { return x.type === 'realm_block'; }).reduce(function(p, x) {
        return p.then(function() { return L.saveRealmBlock(isoDate, x); });
      }, chain);
      ops.push(chain);
      return Promise.all(ops).then(function() { return { added: added, skipped: skipped, planned: plans.length }; });
    },
    // ── DT-2 night-before reminder ──────────────────────────────────────
    // Alex: "go DT-2, 1" = from 18:00; on a closing shift, once it ends (so
    // just after midnight, about the day that has just started). Returns the
    // date to remind about, or null when it's not reminder time.
    nightBeforeTarget: function(now) {
      var L = RPGACE.modules.myDay.logic;
      now = now || new Date();
      var today = L.iso(now), nowMin = now.getHours() * 60 + now.getMinutes();
      var spans = function(d) {
        return L.shiftsOn(d).map(function(x) { var a = L.toMin(x.start), b = L.toMin(x.end); if (a == null || b == null) return null; if (b <= a) b += 1440; return [a, b]; }).filter(Boolean);
      };
      if (nowMin >= 18 * 60) {
        // Still at work (or a shift that runs past midnight): wait.
        if (spans(today).some(function(sp) { return sp[1] > nowMin; })) return null;
        return L.addDays(today, 1);
      }
      if (nowMin < 5 * 60) {
        var y = L.addDays(today, -1);
        var late = spans(y).filter(function(sp) { return sp[1] >= 23 * 60 + 30; });
        if (late.length && late.every(function(sp) { return sp[1] - 1440 <= nowMin; })) return today;
      }
      return null;
    },
    // Planned = the day was locked in, or already has things on the Daily Schedule.
    nightBeforeStatus: function(target) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var sched = L.schedOn(target).filter(function(x) { return x && x.source_type !== 'shift'; })
        .sort(function(a, b) { return ((a.hour || 0) * 60 + (a.minute || 0)) - ((b.hour || 0) * 60 + (b.minute || 0)); });
      // AC-2: planned = something on the Daily Schedule or a block placed.
      var isLocked = L.dayBlocks(target).length > 0;
      return Promise.resolve().then(function() {
        return {
          target: target, kind: L.dayKind(target), shifts: L.shiftsOn(target),
          planned: isLocked || sched.length > 0,
          first: sched.slice(0, 3).map(function(x) { return String(x.hour || 0).padStart(2, '0') + ':' + String(x.minute || 0).padStart(2, '0') + ' ' + (x.title || 'Task'); }),
          more: Math.max(0, sched.length - 3),
        };
      });
    },
    // The Due-list row (used by dashDeck._refreshGlance).
    nightBeforeRow: function(st, today) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var name = st.target === today ? 'Today' : 'Tomorrow';
      var kind = self.DAY_KINDS[st.kind] + (st.shifts.length ? ' ' + st.shifts.map(function(x) { return x.start + '–' + x.end; }).join(', ') : '');
      var open = function() {
        var P = RPGACE.CONFIG.pages;
        if (typeof showPage === 'function') showPage(P.agenda);
        Promise.all([L.load(), L.loadTimings()]).then(function() { self.ui.openPlan(st.target); })
          .catch(function(e) { RPGACE.utils.toast('⚠️ My Day could not load: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      if (st.planned) return { icon: '🗓', text: name + ' is planned', sub: (st.first.join(' · ') || 'Locked in') + (st.more ? ' · +' + st.more + ' more' : ''), on: open };
      return { icon: '🗓', text: name + ' isn\'t planned yet', sub: kind + ' · tap to plan it', on: open };
    },
    // ── MD2-5 week planner ─────────────────────────────────────────────
    plansFor: function(r, fromIso, toIso) {
      var id = String(r.id);
      return (RPGACE.modules.myDay._plans || []).filter(function(p) {
        return String(p.routine_id) === id && (!fromIso || p.plan_date >= fromIso) && (!toIso || p.plan_date <= toIso);
      });
    },
    weekHasPlan: function(r, ws) {
      var L = RPGACE.modules.myDay.logic;
      return L.plansFor(r, ws, L.addDays(ws, 6)).length > 0;
    },
    plannedOn: function(r, isoDate) {
      return RPGACE.modules.myDay.logic.plansFor(r, isoDate, isoDate).some(function(p) { return p.status === 'planned'; });
    },
    plannable: function(r) { return r.cadence === 'weekly' || r.cadence === 'times_per_week'; },
    // The days a routine is planned for in a week: its saved plan, or its
    // usual days (weekly) / suggested days (N a week) if that week has none.
    weekDays: function(r, ws, today) {
      var L = RPGACE.modules.myDay.logic, out = [];
      if (L.weekHasPlan(r, ws)) {
        L.plansFor(r, ws, L.addDays(ws, 6)).forEach(function(p) { if (p.status === 'planned') out.push(p.plan_date); });
        return out;
      }
      if (r.cadence === 'weekly') {
        for (var i = 0; i < 7; i++) { var d = L.addDays(ws, i); if ((r.days || []).indexOf(L.dow(d)) !== -1) out.push(d); }
        return out;
      }
      return L.suggestDays(r, ws, today);
    },
    shiftsOn: function(isoDate) {
      try { return typeof getShiftsForDate === 'function' ? getShiftsForDate(isoDate) : []; } catch (e) { return []; }
    },
    blocksOn: function(isoDate) {
      return (RPGACE.modules.myDay._blocks || []).filter(function(b) { return b.start_date <= isoDate && b.end_date >= isoDate; });
    },
    schedOn: function(isoDate) {
      try { return (RPGACE.DB.get('sched') || []).filter(function(x) { return x && x.date === isoDate; }); } catch (e) { return []; }
    },
    // Busy score for picking days: lower = freer. A full-day block rules
    // the day out (null).
    dayLoad: function(isoDate) {
      var L = RPGACE.modules.myDay.logic, score = 0;
      var blocks = L.blocksOn(isoDate);
      if (blocks.some(function(b) { return b.kind !== 'off' && !b.start_time; })) return null;
      blocks.forEach(function(b) { score += b.kind === 'off' ? -2 : 4; });
      L.shiftsOn(isoDate).forEach(function(s) { score += Number(s.hours) || 6; });
      score += L.schedOn(isoDate).length;
      return score;
    },
    // N-a-week: prefer days off, then shorter shift days, spread out.
    suggestDays: function(r, ws, today) {
      var L = RPGACE.modules.myDay.logic, n = Math.max(1, Math.min(7, Number(r.times_per_week) || 1));
      var days = [];
      for (var i = 0; i < 7; i++) {
        var d = L.addDays(ws, i);
        if (today && d < today) continue;
        var load = L.dayLoad(d);
        if (load != null) days.push({ d: d, i: i, load: load });
      }
      var picked = [];
      while (picked.length < n && days.length) {
        days.forEach(function(x) {
          x.score = x.load + picked.reduce(function(a, p) { return a + (Math.abs(p.i - x.i) <= 1 ? 3 : 0); }, 0);
        });
        days.sort(function(a, b) { return a.score - b.score || a.i - b.i; });
        picked.push(days.shift());
      }
      return picked.map(function(x) { return x.d; }).sort();
    },
    // Weeks shown: this week up to the last week the rota covers (at least 2),
    // plus any extra weeks Alex adds.
    weeksToPlan: function(today, extra) {
      var L = RPGACE.modules.myDay.logic, ws = L.weekStart(today), last = today;
      try { (typeof getShifts === 'function' ? getShifts() : []).forEach(function(s) { if (s && s.date > last) last = s.date; }); } catch (e) {}
      var n = Math.max(2, Math.round((new Date(L.weekStart(last) + 'T12:00:00') - new Date(ws + 'T12:00:00')) / 6048e5) + 1) + (extra || 0);
      var out = [];
      for (var i = 0; i < Math.min(n, 12); i++) out.push(L.addDays(ws, i * 7));
      return out;
    },
    // Save one routine's days for one week. Past days are left as they are.
    savePlanWeek: function(r, ws, dates, today) {
      var self = RPGACE.modules.myDay, L = self.logic, rid = String(r.id), we = L.addDays(ws, 6);
      var want = {}; (dates || []).forEach(function(d) { if (d >= today && d >= ws && d <= we) want[d] = 1; });
      var existing = L.plansFor(r, ws, we).filter(function(p) { return p.plan_date >= today; });
      var ops = [];
      existing.forEach(function(p) {
        if (!want[p.plan_date]) ops.push(RPGACE.sb.secureWrite('routine_plans', 'delete', null, 'id=eq.' + p.id));
      });
      var keepPlanned = existing.filter(function(p) { return want[p.plan_date] && p.status === 'planned'; }).map(function(p) { return p.plan_date; });
      var rows = Object.keys(want).filter(function(d) { return keepPlanned.indexOf(d) === -1; })
        .map(function(d) { return { routine_id: rid, plan_date: d, status: 'planned', moved_to: null }; });
      // Nothing chosen this week: a 'skipped' marker keeps the week planned
      // (otherwise it would fall back to the usual days).
      var pastPlanned = L.plansFor(r, ws, we).some(function(p) { return p.plan_date < today; });
      if (!Object.keys(want).length && !pastPlanned) {
        var mark = ws < today ? today : ws;
        if (mark <= we) rows.push({ routine_id: rid, plan_date: mark, status: 'skipped', moved_to: null });
      }
      if (rows.length) ops.push(RPGACE.sb.secureWrite('routine_plans', 'insert', rows, null, 'routine_id,plan_date'));
      return Promise.all(ops).then(function() { RPGACE.cache.clear('routine_plans'); });
    },
    // Planned days that passed without the routine being done or skipped.
    missedPlans: function(today) {
      var self = RPGACE.modules.myDay, L = self.logic, out = [];
      var byId = {}; (self._routines || []).forEach(function(r) { byId[String(r.id)] = r; });
      (self._plans || []).forEach(function(p) {
        var r = byId[String(p.routine_id)];
        if (!r || p.status !== 'planned' || p.plan_date >= today || p.plan_date < L.addDays(today, -14)) return;
        var handled = L.logsFor(r, self._logs).some(function(l) { return L.logDate(l) === p.plan_date; });
        if (!handled) out.push({ plan: p, routine: r });
      });
      return out;
    },
    // Next free days to move a missed plan to (not already planned, not
    // fully blocked), from today.
    moveOptions: function(r, today, n) {
      var L = RPGACE.modules.myDay.logic, out = [];
      for (var i = 0; i < 14 && out.length < (n || 5); i++) {
        var d = L.addDays(today, i);
        if (L.plannedOn(r, d) || L.dayLoad(d) == null) continue;
        out.push(d);
      }
      return out;
    },
    movePlan: function(p, toIso) {
      return Promise.all([
        RPGACE.sb.secureWrite('routine_plans', 'update', { status: 'moved', moved_to: toIso }, 'id=eq.' + p.id),
        RPGACE.sb.secureWrite('routine_plans', 'insert', [{ routine_id: String(p.routine_id), plan_date: toIso, status: 'planned', moved_to: null }], null, 'routine_id,plan_date'),
      ]).then(function() { RPGACE.cache.clear('routine_plans'); });
    },
    skipPlan: function(p) {
      return RPGACE.sb.secureWrite('routine_plans', 'update', { status: 'skipped' }, 'id=eq.' + p.id).then(function() { RPGACE.cache.clear('routine_plans'); });
    },
    cleanBlock: function(f) {
      var title = String(f.title || '').trim();
      if (!title) throw new Error('Give it a name, e.g. Time off');
      var re = /^\d{4}-\d{2}-\d{2}$/;
      if (!re.test(f.start_date || '')) throw new Error('Pick a start date');
      var end = f.end_date || f.start_date;
      if (!re.test(end)) throw new Error('Pick an end date');
      if (end < f.start_date) throw new Error('The end date is before the start date');
      var t = /^\d{1,2}:\d{2}$/;
      return { title: title.slice(0, 80), kind: RPGACE.modules.myDay.BLOCK_KINDS[f.kind] ? f.kind : 'other', start_date: f.start_date, end_date: end,
        start_time: t.test(f.start_time || '') ? f.start_time : null, end_time: t.test(f.end_time || '') ? f.end_time : null, note: String(f.note || '').trim().slice(0, 300) || null };
    },
    addBlock: function(f) {
      var self = RPGACE.modules.myDay, row = self.logic.cleanBlock(f);
      return RPGACE.sb.secureWrite('day_blocks', 'insert', row).then(function(data) {
        RPGACE.cache.clear('day_blocks');
        var saved = (Array.isArray(data) && data[0]) || row;
        self._blocks = self._blocks.concat([saved]).sort(function(a, b) { return a.start_date < b.start_date ? -1 : 1; });
        return saved;
      });
    },
    removeBlock: function(id) {
      var self = RPGACE.modules.myDay;
      return RPGACE.sb.secureWrite('day_blocks', 'delete', null, 'id=eq.' + id).then(function() {
        RPGACE.cache.clear('day_blocks');
        self._blocks = self._blocks.filter(function(b) { return b.id !== id; });
      });
    },
    doneThisWeek: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic, ws = L.weekStart(today);
      return L.logsFor(r, logs).filter(function(l) { return l.status === 'completed' && L.logDate(l) >= ws && L.logDate(l) <= today; }).length;
    },
    isDueToday: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic;
      if (r.cadence === 'daily' || r.cadence === 'weekly') return L.dueOn(r, today);
      if (r.cadence === 'times_per_week') {
        if (L.weekHasPlan(r, L.weekStart(today))) return L.plannedOn(r, today) || !!L.todayLog(r, logs, today);
        return L.doneThisWeek(r, logs, today) < (r.times_per_week || 1) || !!L.todayLog(r, logs, today);
      }
      if (r.cadence === 'every_days') return L.choreState(r, today).due || !!L.todayLog(r, logs, today);
      if (r.cadence === 'once') {
        if (!r.due_date || r.due_date > today) return false;
        var done = L.logsFor(r, logs).filter(function(l) { return l.status === 'completed'; });
        return !done.length || done.some(function(l) { return L.logDate(l) === today; });
      }
      return false;
    },
    // Weekly-day routines whose day already passed this week with nothing logged.
    missedThisWeek: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic;
      if (r.cadence !== 'weekly') return [];
      if (L.weekHasPlan(r, L.weekStart(today))) return []; // planned weeks use missedPlans
      var ws = L.weekStart(today), handled = L.logsFor(r, logs).filter(function(l) { var d = L.logDate(l); return d >= ws && d <= today; });
      var missed = [];
      for (var d = ws; d < today; d = L.addDays(d, 1)) if (L.dueOn(r, d)) missed.push(d);
      var todayHandled = !!L.todayLog(r, logs, today);
      var spare = handled.length - (todayHandled ? 1 : 0);
      return missed.slice(Math.max(0, spare));
    },
    streak: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic, mine = L.logsFor(r, logs), byDay = {};
      mine.forEach(function(l) { var d = L.logDate(l); byDay[d] = byDay[d] || l.status; if (l.status === 'completed') byDay[d] = 'completed'; });
      var n = 0;
      if (r.cadence === 'daily' || r.cadence === 'weekly') {
        for (var i = 0, d = today; i < 70; i++, d = L.addDays(d, -1)) {
          if (!L.dueOn(r, d)) continue;
          if (byDay[d] === 'completed') n++;
          else if (byDay[d] === 'skipped') continue;
          else if (d === today) continue;
          else break;
        }
        return n;
      }
      if (r.cadence === 'times_per_week') {
        var target = r.times_per_week || 1;
        for (var w = 0, ws = L.weekStart(today); w < 10; w++, ws = L.addDays(ws, -7)) {
          var we = L.addDays(ws, 6), c = mine.filter(function(l) { var x = L.logDate(l); return l.status === 'completed' && x >= ws && x <= we; }).length;
          if (c >= target) n++; else if (w === 0) continue; else break;
        }
      }
      return n;
    },
    weekSummary: function(routines, logs, today) {
      var L = RPGACE.modules.myDay.logic, ws = L.weekStart(today), planned = 0, done = 0;
      (routines || []).forEach(function(r) {
        if (r.cadence === 'times_per_week') { planned += r.times_per_week || 1; done += Math.min(r.times_per_week || 1, L.doneThisWeek(r, logs, today)); }
        else if (r.cadence === 'daily' || r.cadence === 'weekly') {
          for (var d = ws; d <= today; d = L.addDays(d, 1)) {
            if (!L.dueOn(r, d)) continue;
            planned++;
            if (L.logsFor(r, logs).some(function(l) { return l.status === 'completed' && L.logDate(l) === d; })) done++;
          }
        }
      });
      return { planned: planned, done: done };
    },
    today: function(routines, logs, today) {
      var L = RPGACE.modules.myDay.logic;
      return (routines || []).filter(function(r) { return L.isDueToday(r, logs, today); });
    },
    dueCount: function(routines, logs, today) {
      var L = RPGACE.modules.myDay.logic;
      return L.today(routines, logs, today).filter(function(r) { return !L.todayLog(r, logs, today); }).length;
    },

    // Free slots around shifts and what's already on today's schedule.
    // Shifts and schedule items with a place keep their get-ready + travel
    // time clear (MD2-4, see TIMING_DEFAULTS).
    suggestSlots: function(items, opts) {
      var self = RPGACE.modules.myDay, L = self.logic;
      opts = opts || {};
      // MD-1: busy time comes from the one shared timeline (segments).
      var busy = L.segments({ shifts: opts.shifts, sched: opts.sched, st: opts.timing }).map(function(g) { return [g.from, g.to]; });
      var floor = opts.nowMin != null ? Math.ceil(opts.nowMin / 5) * 5 : 0;
      var free = function(a, len) { return busy.every(function(b) { return a + len <= b[0] || a >= b[1]; }); };
      var order = { morning: 0, afternoon: 1, evening: 2, any: 3 };
      var list = items.slice().sort(function(a, b) {
        var pa = L.toMin(a.preferred_time), pb = L.toMin(b.preferred_time);
        if ((pa != null) !== (pb != null)) return pa != null ? -1 : 1;
        if (pa != null) return pa - pb;
        return (order[a.part_of_day] || 3) - (order[b.part_of_day] || 3);
      });
      return list.map(function(r) {
        var len = Math.max(5, Math.round(Number(r.est_mins) || 15));
        var part = self.PARTS.filter(function(p) { return p.key === (r.part_of_day || 'any'); })[0] || self.PARTS[3];
        var tries = [];
        var pref = L.toMin(r.preferred_time);
        if (pref != null) tries.push([pref, Math.max(pref + 1, part.to)]);
        tries.push([part.from, part.to], [420, 1380]);
        var at = null;
        for (var t = 0; t < tries.length && at == null; t++) {
          for (var m = Math.max(tries[t][0], floor); m + len <= tries[t][1]; m += 5) {
            if (free(m, len)) { at = m; break; }
          }
        }
        if (at != null) busy.push([at, at + len]);
        return { routine: r, start: at, mins: len };
      });
    },

    // ── MD2-4 timings + activity templates ──────────────────────────
    timing: function(st) {
      var d = RPGACE.modules.myDay.TIMING_DEFAULTS, out = {};
      st = st || RPGACE.modules.myDay._settings || {};
      Object.keys(d).forEach(function(k) { var v = Number(st[k]); out[k] = st[k] == null || isNaN(v) ? d[k] : v; });
      return out;
    },
    withMargin: function(journey, st) {
      var t = RPGACE.modules.myDay.logic.timing(st), j = Number(journey) || 0;
      return j > 0 ? Math.round(j * (1 + t.margin_pct / 100)) : 0;
    },
    // Get-ready + journey (margin on the journey only) before an item that
    // has a place/journey; 0 for items with no travel.
    travelBefore: function(x, st) {
      var L = RPGACE.modules.myDay.logic, t = L.timing(st);
      var j = Number(x && x.journey_mins) || 0;
      var hasReady = x && x.ready_mins != null && x.ready_mins !== '';
      if (!j && !hasReady) return 0;
      return (hasReady ? Number(x.ready_mins) || 0 : t.ready_mins) + L.withMargin(j, st);
    },
    shiftBefore: function(st) {
      var L = RPGACE.modules.myDay.logic, t = L.timing(st);
      return t.ready_mins + t.shift_extra_before_mins + L.withMargin(t.shift_journey_mins, st);
    },
    shiftAfter: function(st) {
      var L = RPGACE.modules.myDay.logic, t = L.timing(st);
      return L.withMargin(t.shift_journey_home_mins, st);
    },
    loadTimings: function() {
      var self = RPGACE.modules.myDay;
      return Promise.all([
        RPGACE.sb.select('myday_settings', 'select=*&id=eq.1').catch(function() { return []; }),
        RPGACE.sb.select('activity_templates', 'select=*&order=name.asc').catch(function() { return []; }),
      ]).then(function(r) {
        self._settings = (Array.isArray(r[0]) && r[0][0]) || null;
        self._templates = Array.isArray(r[1]) ? r[1] : [];
        return { settings: self._settings, templates: self._templates };
      });
    },
    saveSettings: function(patch) {
      var self = RPGACE.modules.myDay, clean = {};
      Object.keys(self.TIMING_DEFAULTS).forEach(function(k) {
        if (patch[k] == null || patch[k] === '') return;
        var v = Math.round(Number(patch[k]));
        if (isNaN(v) || v < 0 || v > (k === 'margin_pct' ? 200 : 600)) throw new Error('Check the ' + k.replace(/_/g, ' ') + ' value');
        clean[k] = v;
      });
      clean.id = 1; clean.updated_at = new Date().toISOString();
      return RPGACE.sb.secureWrite('myday_settings', 'insert', clean, null, 'id').then(function() {
        RPGACE.cache.clear('myday_settings');
        self._settings = Object.assign({}, self._settings || {}, clean);
        return self._settings;
      });
    },
    cleanTemplate: function(f) {
      var num = function(v, dflt, max) {
        if (v == null || v === '') return dflt;
        var n = Math.round(Number(v));
        if (isNaN(n) || n < 0 || n > max) throw new Error('Minutes must be between 0 and ' + max);
        return n;
      };
      var name = String(f.name || '').trim();
      if (!name) throw new Error('Give the template a name');
      return {
        name: name.slice(0, 80),
        category: String(f.category || '').trim().toLowerCase().slice(0, 40) || null,
        place: String(f.place || '').trim().slice(0, 80) || null,
        journey_mins: num(f.journey_mins, 0, 600),
        ready_mins: num(f.ready_mins, null, 240),
        est_mins: Math.max(5, num(f.est_mins, 60, 1440)),
      };
    },
    addTemplate: function(f) {
      var self = RPGACE.modules.myDay, row = self.logic.cleanTemplate(f);
      return RPGACE.sb.secureWrite('activity_templates', 'insert', row).then(function(data) {
        RPGACE.cache.clear('activity_templates');
        var saved = (Array.isArray(data) && data[0]) || row;
        self._templates = self._templates.concat([saved]).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
        return saved;
      });
    },
    removeTemplate: function(id) {
      var self = RPGACE.modules.myDay;
      return RPGACE.sb.secureWrite('activity_templates', 'delete', null, 'id=eq.' + id).then(function() {
        RPGACE.cache.clear('activity_templates');
        self._templates = self._templates.filter(function(t) { return t.id !== id; });
      });
    },
    // ── MD-1 (Oct 18 2026): one timeline for the day ─────────────────
    // Every planner reads busy time from segments() - shifts with their
    // get-ready/travel, schedule items with theirs, planned blocks and the
    // Morning/Night bookends. Minutes from midnight; past midnight = +1440.
    BLOCK_SOURCES: ['chore_block', 'realm_block', 'shopping_block', 'planned_cook'],
    segments: function(o) {
      var L = RPGACE.modules.myDay.logic, st = o.st, out = [], blockIds = {}, cookIds = {};
      (o.blocks || []).forEach(function(b) { blockIds[String(b.id)] = 1; if (b.planned_cook_id) cookIds[String(b.planned_cook_id)] = 1; });
      (o.shifts || []).forEach(function(s) {
        var a = L.toMin(s.start), b = L.toMin(s.end);
        if (a == null || b == null) return;
        if (b <= a) b += 1440;
        var pre = L.shiftBefore(st), post = L.shiftAfter(st);
        if (pre) out.push({ kind: 'travel', from: a - pre, to: a, label: 'Get ready + travel to work' });
        out.push({ kind: 'shift', from: a, to: b, label: 'Shift' + (s.role ? ' (' + s.role + ')' : '') });
        if (post) out.push({ kind: 'travel', from: b, to: b + post, label: 'Journey home' });
      });
      (o.sched || []).forEach(function(x) {
        // A block's own Schedule entry is the block (counted once, below).
        if (x.source_type && L.BLOCK_SOURCES.indexOf(x.source_type) !== -1 && (blockIds[String(x.source_id)] || cookIds[String(x.source_id)])) return;
        var a = (Number(x.hour) || 0) * 60 + (Number(x.minute) || 0), pre = L.travelBefore(x, st);
        if (pre) out.push({ kind: 'travel', from: a - pre, to: a, label: 'Get ready + travel' + (x.place ? ' to ' + x.place : '') });
        out.push({ kind: 'item', id: 'a:' + x.id, item: x, from: a, to: a + (Number(x.estimated_mins) || 30), label: x.title || 'Task' });
      });
      (o.blocks || []).forEach(function(b) {
        var a = L.toMin(b.start_time);
        if (a == null) return;
        out.push({ kind: 'block', id: b.id, from: a, to: a + (Number(b.mins) || 30), label: L.blockLabel(b), block: b });
      });
      (o.bookends || []).forEach(function(e) { if (e && e.to > e.from) out.push({ kind: 'bookend', which: e.which, from: e.from, to: e.to, label: e.label }); });
      return out.sort(function(p, q) { return p.from - q.from || p.to - q.to; });
    },
    // What the day planner treats as taken: the Schedule plus the
    // Morning/Night blocks (as plain timed entries).
    busySched: function(isoDate) {
      var L = RPGACE.modules.myDay.logic, be = L.dayParts(isoDate).be;
      return L.schedOn(isoDate).concat([be.morning, be.night].filter(function(e) { return e.to > e.from; }).map(function(e) {
        return { hour: Math.floor(e.from / 60), minute: e.from % 60, estimated_mins: e.to - e.from, title: e.label };
      }));
    },
    blockLabel: function(b) {
      var xs = RPGACE.modules.xpSeason, R = b.realm && xs && xs.REALMS[b.realm];
      if (b.kind === 'realm') return (R ? R.icon + ' ' + R.name : '✨ ' + (b.realm || 'Realm')) + ' block';
      return { cooking: '🍳 Cooking', shopping: '🛒 Shopping' }[b.kind] || '🧹 Homekeeper block';
    },
    // 🌅 Morning / 🌙 Night: the routines Alex put in each (myday_settings
    // morning_tasks / night_tasks, in order). Until he edits them the
    // Morning list is his daily morning routines, Night his daily evening ones.
    bookendTasks: function(which) {
      var self = RPGACE.modules.myDay, st = self._settings || {}, all = self._routines || [];
      var ids = which === 'morning' ? st.morning_tasks : st.night_tasks, byId = {};
      all.forEach(function(r) { byId[String(r.id)] = r; });
      if (Array.isArray(ids) && ids.length) return ids.map(function(id) { return byId[String(id)]; }).filter(Boolean);
      var part = which === 'morning' ? 'morning' : 'evening';
      return all.filter(function(r) { return r.cadence === 'daily' && r.part_of_day === part; });
    },
    // Where the bookends sit on a day: Morning starts at wake time (earlier
    // on a morning shift, so it ends before get-ready); Night ends at
    // bedtime (later after a late shift, starting once home). Pure.
    bookends: function(shifts, st, mTasks, nTasks) {
      var L = RPGACE.modules.myDay.logic, t = L.timing(st);
      st = st || {};
      var sum = function(rs) { return rs.reduce(function(a, r) { return a + Math.max(1, Number(r.est_mins) || 15); }, 0); };
      var wake = L.toMin(st.wake_time || '08:00'), bed = L.toMin(st.bed_time || '23:00');
      if (bed < 12 * 60) bed += 1440;
      var mLen = sum(mTasks || []), nLen = sum(nTasks || []);
      var m = { which: 'morning', label: '🌅 Morning', from: wake, to: wake + mLen, tasks: mTasks || [] };
      var n = { which: 'night', label: '🌙 Night', from: bed - nLen, to: bed, tasks: nTasks || [] };
      (shifts || []).forEach(function(s) {
        var a = L.toMin(s.start), b = L.toMin(s.end);
        if (a == null || b == null) return;
        if (b <= a) b += 1440;
        var ready = a - L.shiftBefore(st), home = b + L.shiftAfter(st);
        if (m.to > ready && a < 15 * 60) { m.to = ready; m.from = ready - mLen; }
        if (n.from < home && b > 15 * 60) { n.from = home; n.to = home + nLen; }
      });
      return { morning: m, night: n, wake: m.from };
    },
    // Everything busy on a date, from what My Day has loaded.
    // AC-5: "Woke up late" moves the wake time for that one day only.
    stFor: function(isoDate) {
      var st = RPGACE.modules.myDay._settings || {}, o = st.wake_override;
      return o && o.date === isoDate && o.time ? Object.assign({}, st, { wake_time: o.time }) : st;
    },
    dayParts: function(isoDate) {
      var self = RPGACE.modules.myDay, L = self.logic, st = L.stFor(isoDate), shifts = L.shiftsOn(isoDate);
      var be = L.bookends(shifts, st, L.bookendTasks('morning'), L.bookendTasks('night'));
      var blocks = (self._choreBlocks || []).filter(function(b) { return b.block_date === isoDate && L.blockLive(b); });
      return { shifts: shifts, sched: L.schedOn(isoDate), blocks: blocks, bookends: [be.morning, be.night], st: st, be: be };
    },
    // Where a block can go. Pure: segs = segments() without the block being
    // placed; nb = {from, to, id}. Fixed things (shift, travel, schedule
    // items, bookends) never move; other blocks are pushed along (later ones
    // later, earlier ones earlier), keeping a gap of `gap` minutes between
    // blocks. Returns {fixed} (lands on something fixed), {tooFar} (a block
    // would move more than `limit` minutes), {stuck} (a pushed block would
    // hit something fixed) or {moves}.
    makeRoom: function(segs, nb, gap, limit) {
      gap = gap == null ? 10 : gap; limit = limit == null ? 30 : limit;
      var fixed = segs.filter(function(g) { return g.kind !== 'block' && g.kind !== 'gap'; });
      var blocks = segs.filter(function(g) { return g.kind === 'block' && g.id !== nb.id; }).map(function(g) { return { id: g.id, from: g.from, to: g.to, label: g.label, block: g.block }; });
      var hit = function(a, b) { return fixed.filter(function(f) { return a < f.to && b > f.from; })[0]; };
      var f0 = hit(nb.from, nb.to);
      if (f0) return { fixed: f0 };
      var moves = [], cur = nb;
      var later = blocks.filter(function(b) { return b.from >= nb.from; }).sort(function(p, q) { return p.from - q.from; });
      for (var i = 0; i < later.length; i++) {
        var b = later[i], want = cur.to + gap;
        if (b.from >= want) break;
        var d = want - b.from;
        if (d > limit) return { tooFar: b, by: d, dir: 'later' };
        var nb2 = { id: b.id, from: b.from + d, to: b.to + d, label: b.label, block: b.block };
        var f1 = hit(nb2.from, nb2.to);
        if (f1) return { stuck: b, on: f1 };
        moves.push({ id: b.id, from: nb2.from, to: nb2.to, delta: d, label: b.label, block: b.block });
        cur = nb2;
      }
      cur = nb;
      var earlier = blocks.filter(function(b) { return b.from < nb.from; }).sort(function(p, q) { return q.from - p.from; });
      for (var j = 0; j < earlier.length; j++) {
        var e = earlier[j], must = cur.from - gap;
        if (e.to <= must) break;
        var d2 = e.to - must;
        if (d2 > limit) return { tooFar: e, by: d2, dir: 'earlier' };
        var ne = { id: e.id, from: e.from - d2, to: e.to - d2, label: e.label, block: e.block };
        var f2 = hit(ne.from, ne.to);
        if (f2) return { stuck: e, on: f2 };
        moves.push({ id: e.id, from: ne.from, to: ne.to, delta: -d2, label: e.label, block: e.block });
        cur = ne;
      }
      return { moves: moves };
    },
    // Nearest start (5-minute steps, 06:00-24:00) where `mins` fits clear of
    // everything. Pure.
    nearestFree: function(segs, start, mins, exceptId) {
      var busy = segs.filter(function(g) { return g.kind !== 'gap' && !(exceptId && g.id === exceptId); });
      var ok = function(a) { return busy.every(function(g) { return a + mins <= g.from || a >= g.to; }); };
      for (var k = 0; k <= 216; k++) {
        var cands = [start + k * 5, start - k * 5];
        for (var c = 0; c < 2; c++) { var a = cands[c]; if (a >= 360 && a + mins <= 1440 && ok(a)) return a; }
      }
      return null;
    },
    // Move blocks (and their Schedule entries). Remembers what it did so
    // ↩ Undo can put them back.
    applyMoves: function(moves) {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (!moves || !moves.length) return Promise.resolve([]);
      var undo = [];
      return Promise.all(moves.map(function(mv) {
        var b = (self._choreBlocks || []).filter(function(x) { return x.id === mv.id; })[0];
        if (!b) return null;
        undo.push({ id: b.id, from: L.toMin(b.start_time), to: L.toMin(b.start_time) + (Number(b.mins) || 30) });
        return L.moveBlock(b, mv.from);
      })).then(function() { self._lastUndo = undo; RPGACE.cache.clear('chore_blocks'); return moves; });
    },
    moveBlock: function(b, from) {
      var L = RPGACE.modules.myDay.logic, hhmm = L.fmtMin(from);
      b.start_time = hhmm;
      var ops = [RPGACE.sb.secureWrite('chore_blocks', 'update', { start_time: hhmm }, 'id=eq.' + b.id)];
      if (b.agenda_id) {
        var h = Math.floor((((from % 1440) + 1440) % 1440) / 60), mi = from % 60;
        ops.push(RPGACE.sb.secureWrite('rpgace_agendas', 'update', { hour: h, minute: mi }, 'id=eq.' + b.agenda_id));
        try { RPGACE.DB.set('sched', (RPGACE.DB.get('sched') || []).map(function(a) { return a.id === b.agenda_id ? Object.assign({}, a, { hour: h, minute: mi }) : a; })); } catch (e) {}
      }
      return Promise.all(ops);
    },
    undoMoves: function() {
      var self = RPGACE.modules.myDay, L = self.logic, u = self._lastUndo || [];
      self._lastUndo = null;
      return Promise.all(u.map(function(x) {
        if (x.agenda) return L.moveItem(x.agenda, x.from, x.mins);
        var b = (self._choreBlocks || []).filter(function(y) { return y.id === x.id; })[0];
        if (!b) return null;
        // MDX-7: a block dragged to another day goes back to its day first.
        if (x.day && x.day !== b.block_date) return L.moveBlockDay(b, x.day).then(function() { return L.resizeBlock(b, x.from, x.mins); });
        return x.mins != null ? L.resizeBlock(b, x.from, x.mins) : L.moveBlock(b, x.from);
      })).then(function() { RPGACE.cache.clear('chore_blocks'); return u.length; });
    },
    // Change a block's start/length (the "shorten it" step of the push rule).
    resizeBlock: function(b, from, mins) {
      var L = RPGACE.modules.myDay.logic;
      mins = Math.max(10, Math.min(480, Math.round(Number(mins) || 0)));
      b.mins = mins;
      return L.moveBlock(b, from).then(function() {
        var ops = [RPGACE.sb.secureWrite('chore_blocks', 'update', { mins: mins }, 'id=eq.' + b.id)];
        if (b.agenda_id) ops.push(RPGACE.sb.secureWrite('rpgace_agendas', 'update', { estimated_mins: mins }, 'id=eq.' + b.agenda_id));
        return Promise.all(ops);
      });
    },
    // ── MD-2 Plan week ──────────────────────────────────────────────────
    // How far a block can be dragged on its day. Alex: "make it so end point
    // are adjacent blocks, if none, morning routine, on right night routine".
    // Pure: segs = segments() for the day; b = { id, from, to }. Edges stop
    // at the nearest thing either side (with `gap` after/before other
    // blocks), else at the end of 🌅 Morning / start of 🌙 Night.
    dragLimits: function(segs, b, gap) {
      gap = gap == null ? 10 : gap;
      var others = segs.filter(function(g) { return g.kind !== 'gap' && !(b.id && g.id === b.id); });
      var be = function(w) { return others.filter(function(g) { return g.kind === 'bookend' && g.which === w; })[0]; };
      var m = be('morning'), n = be('night');
      var lo = m ? m.to : 360, hi = n ? n.from : 1440;
      others.forEach(function(g) {
        if (g.kind === 'bookend') return;
        var pad = g.kind === 'block' ? gap : 0;
        if (g.to <= b.from) lo = Math.max(lo, g.to + pad);
        else if (g.from >= b.to) hi = Math.min(hi, g.from - pad);
      });
      if (m && m.to > b.from) lo = Math.min(lo, b.from);
      if (n && n.from < b.to) hi = Math.max(hi, b.to);
      return { lo: lo, hi: hi };
    },
    // Where a drag ends up: 5-minute snap, kept inside the limits, at least
    // 10 minutes long. mode: 'move' | 'start' (top edge) | 'end' (bottom edge).
    clampDrag: function(lim, from, mins, mode) {
      var snap = function(v) { return Math.round(v / 5) * 5; }, to = from + mins;
      if (mode === 'move') { from = Math.max(lim.lo, Math.min(lim.hi - mins, snap(from))); return { from: from, mins: mins }; }
      if (mode === 'start') { from = Math.max(lim.lo, Math.min(to - 10, snap(from))); return { from: from, mins: to - from }; }
      to = Math.max(from + 10, Math.min(lim.hi, snap(to)));
      return { from: from, mins: to - from };
    },
    methodFor: function(realm) {
      var self = RPGACE.modules.myDay, rm = (self._settings || {}).realm_methods || {};
      return rm[realm] || self.REALM_METHOD_DEFAULTS[realm] || 'timebox';
    },
    blockMethod: function(b) {
      return (b && b.method) || (b && b.kind === 'realm' ? RPGACE.modules.myDay.logic.methodFor(b.realm) : 'none');
    },
    setRealmMethod: function(realm, method) {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (!self.METHODS[method]) return Promise.reject(new Error('Unknown method'));
      var rm = Object.assign({}, (self._settings || {}).realm_methods || {}); rm[realm] = method;
      return L.saveDaySettings({ realm_methods: rm });
    },
    // A block's own method. Until the chore_blocks.method column exists the
    // write fails; say so rather than pretend.
    setBlockMethod: function(b, method) {
      var self = RPGACE.modules.myDay;
      if (!self.METHODS[method]) return Promise.reject(new Error('Unknown method'));
      return RPGACE.sb.secureWrite('chore_blocks', 'update', { method: method }, 'id=eq.' + b.id).then(function() { b.method = method; RPGACE.cache.clear('chore_blocks'); });
    },
    // Drag result -> saved. Goes through the same overlap guard as every
    // other block save; ↩ Undo puts start and length back.
    commitDrag: function(b, from, mins) {
      var self = RPGACE.modules.myDay, L = self.logic, oldFrom = L.toMin(b.start_time), oldMins = Number(b.mins) || 30;
      if (from === oldFrom && mins === oldMins) return Promise.resolve(null);
      return L.guard(b.block_date, from, mins, b.id).then(function(g) {
        var pushed = (g && g.moved) || [];
        var undo = (self._lastUndo || []).slice();
        return L.resizeBlock(b, from, mins).then(function() {
          self._lastUndo = [{ id: b.id, from: oldFrom, mins: oldMins }].concat(pushed.length ? undo : []);
          RPGACE.cache.clear('chore_blocks');
          return { id: b.id, from: from, mins: mins, pushed: pushed };
        });
      });
    },
    // ── MDX (Oct 21 2026, plan "My Day Declutter & Drag") ────────────────
    // records/2026-10/my_day_declutter_drag_paranoia_2026-10-21.txt. The
    // one day view reads segments() (rule 8: same engine as the guard and
    // Plan week); this is only the glue for drag / tap / tray.
    daySegs: function(isoDate) {
      var L = RPGACE.modules.myDay.logic, dp = L.dayParts(isoDate), st = dp.st || {};
      var gap = st.buffer_mins == null ? 10 : (Number(st.buffer_mins) || 0);
      return { dp: dp, gap: gap, segs: L.segments({ shifts: dp.shifts, sched: dp.sched, blocks: dp.blocks, bookends: dp.bookends, st: st }) };
    },
    // Planned blocks and plain Schedule tasks move; shifts, travel,
    // bookends, Doing Now records, planned cooks and anything done don't.
    canDrag: function(g, isoDate, today) {
      if (!g || isoDate < today) return false;
      if (g.kind === 'block') return !!g.block;
      if (g.kind === 'item' && g.item) { var x = g.item; return !x.completed && x.source_type !== 'doing_now' && x.source_type !== 'planned_cook'; }
      return false;
    },
    // Free stretches of at least `min` minutes between from and to. Pure.
    freeGaps: function(segs, from, to, min) {
      var busy = (segs || []).filter(function(g) { return g.kind !== 'gap' && g.to > from && g.from < to; })
        .map(function(g) { return [Math.max(from, g.from), Math.min(to, g.to)]; }).sort(function(a, b) { return a[0] - b[0]; });
      var out = [], cur = from;
      busy.forEach(function(b) { if (b[0] - cur >= min) out.push({ from: cur, to: b[0] }); cur = Math.max(cur, b[1]); });
      if (to - cur >= min) out.push({ from: cur, to: to });
      return out;
    },
    snap5: function(m) { return Math.round(m / 5) * 5; },
    fmtIn: function(m) { m = Math.max(1, Math.round(m)); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : ''); },
    nowMin: function(d) { d = d || new Date(); return d.getHours() * 60 + d.getMinutes(); },
    // What is on now and what comes next today (blocks, tasks, shifts, bookends).
    // FL-7: the shift segment whose window (30 min before start to 30 min after end) holds now.
    workShift: function(segs, nowMin) {
      return (segs || []).filter(function(g) { return g.kind === 'shift' && nowMin >= g.from - 30 && nowMin <= g.to + 30; })[0] || null;
    },
    // {clock_in, clock_out, break} links from the private work_links table (cached per load).
    workLinks: function() {
      var self = RPGACE.modules.myDay;
      if (self._workLinksP) return self._workLinksP;
      var tp = RPGACE.modules.tripPlans;
      if (!tp) return Promise.reject(new Error('not signed in'));
      self._workLinksP = tp.logic.read('work_links', 'select=kind,url').then(function(rows) {
        var out = {}; (rows || []).forEach(function(x) { if (x.kind && x.url) out[x.kind] = x.url; }); return out;
      });
      self._workLinksP.catch(function() { self._workLinksP = null; });
      return self._workLinksP;
    },
    // Today's taps on this device: {clock_in: 'HH:MM', clock_out: 'HH:MM', break: ['HH:MM', ...]}.
    workTaps: function(isoDate) {
      try { var all = JSON.parse(localStorage.getItem('mdx_work_taps') || '{}'); return all[isoDate] || {}; } catch (e) { return {}; }
    },
    workTap: function(isoDate, kind) {
      var d = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      try {
        var all = JSON.parse(localStorage.getItem('mdx_work_taps') || '{}'), day = {};
        day = all[isoDate] || {};
        if (kind === 'break') (day.break = day.break || []).push(hm); else day[kind] = hm;
        all = {}; all[isoDate] = day;   // keep today only
        localStorage.setItem('mdx_work_taps', JSON.stringify(all));
      } catch (e) {}
    },
    workNote: function(taps) {
      var parts = [];
      if (taps.clock_in) parts.push('in ' + taps.clock_in);
      if (taps.break && taps.break.length) parts.push(taps.break.length === 1 ? 'break ' + taps.break[0] : 'breaks ' + taps.break.join(', '));
      if (taps.clock_out) parts.push('out ' + taps.clock_out);
      return parts.length ? 'Tapped: ' + parts.join(' · ') : 'Opens your clock-in page';
    },

    nowNext: function(segs, nowMin) {
      var real = (segs || []).filter(function(g) { return g.kind !== 'gap' && g.kind !== 'travel'; });
      var now = real.filter(function(g) { return g.from <= nowMin && g.to > nowMin; })[0] || null;
      var next = real.filter(function(g) { return g.from > nowMin && (g.kind === 'block' || g.kind === 'item' || g.kind === 'shift' || g.kind === 'bookend'); })
        .sort(function(a, b) { return a.from - b.from; })[0] || null;
      return { now: now, next: next };
    },
    // A Schedule task's time / length (same write-through as moveBlock).
    moveItem: function(x, from, mins) {
      var h = Math.floor((((from % 1440) + 1440) % 1440) / 60), mi = ((from % 60) + 60) % 60, patch = { hour: h, minute: mi };
      if (mins != null) patch.estimated_mins = Math.max(5, Math.round(mins));
      try { RPGACE.DB.set('sched', (RPGACE.DB.get('sched') || []).map(function(a) { return a.id === x.id ? Object.assign({}, a, patch) : a; })); } catch (e) {}
      Object.assign(x, patch);
      return RPGACE.sb.secureWrite('rpgace_agendas', 'update', patch, 'id=eq.' + x.id);
    },
    commitItemDrag: function(x, from, mins) {
      var self = RPGACE.modules.myDay, L = self.logic, old = (Number(x.hour) || 0) * 60 + (Number(x.minute) || 0), oldMins = Number(x.estimated_mins) || 30;
      if (from === old && mins === oldMins) return Promise.resolve(null);
      return L.moveItem(x, from, mins).then(function() {
        self._lastUndo = [{ agenda: x, from: old, mins: oldMins }];
        return { id: x.id, from: from, mins: mins, pushed: [] };
      });
    },
    // "Did you do it?" Yes: the block's open items are ticked and the block
    // is cut off at now so the rest of its time is free. Returns an undo().
    didBlock: function(b, nowMin, today) {
      var self = RPGACE.modules.myDay, L = self.logic, start = L.toMin(b.start_time), oldMins = Number(b.mins) || 30, ticked = [], logs = [];
      var p = Promise.resolve();
      if (b.kind === 'chores' || !b.kind) {
        L.blockChores(b).forEach(function(r) {
          if (L.todayLog(r, self._logs, today)) return;
          p = p.then(function() { return L.tick(r).then(function(row) { var lg = (row && row.id) ? row : L.todayLog(r, self._logs, today); if (lg) logs.push(lg); }); });
        });
      } else {
        (b.items || []).forEach(function(it, i) {
          if (it.done || it.src === 'wishlist') return;
          p = p.then(function() { return L.setBlockItem(b, i, true).then(function() { ticked.push(i); }); });
        });
      }
      var cut = b.block_date === today && nowMin > start && nowMin < start + oldMins ? Math.max(10, L.startNowAt(nowMin) - start) : null;
      return p.then(function() { return cut != null && cut < oldMins ? L.resizeBlock(b, start, cut) : null; }).then(function() {
        RPGACE.cache.clear('chore_blocks');
        return {
          cut: cut != null && cut < oldMins ? oldMins - cut : 0, ticked: ticked.length + logs.length,
          undo: function() {
            var q = Promise.resolve();
            ticked.forEach(function(i) { q = q.then(function() { return L.setBlockItem(b, i, false); }); });
            logs.forEach(function(lg) { q = q.then(function() { return L.undo(lg); }); });
            return q.then(function() { return cut != null ? L.resizeBlock(b, start, oldMins) : null; });
          }
        };
      });
    },
    // Same for a Schedule task: Done (the Schedule's own completeScheduledTask)
    // and its time cut off at now.
    didItem: function(x, nowMin) {
      var L = RPGACE.modules.myDay.logic, start = (Number(x.hour) || 0) * 60 + (Number(x.minute) || 0), mins = Number(x.estimated_mins) || 30;
      if (typeof completeScheduledTask === 'function') completeScheduledTask(x.id);
      else RPGACE.sb.secureWrite('rpgace_agendas', 'update', { completed: true, ended_at: new Date().toISOString() }, 'id=eq.' + x.id);
      x.completed = true;
      if (nowMin > start && nowMin < start + mins) return L.moveItem(x, start, Math.max(5, L.startNowAt(nowMin) - start)).then(function() { return { cut: mins - Math.max(5, L.startNowAt(nowMin) - start) }; });
      return Promise.resolve({ cut: 0 });
    },
    // "Start now?": the next block moves to start now (5-min step up), same
    // length; later blocks are pushed by the guard's push rule.
    startNowAt: function(nowMin) { return Math.ceil(nowMin / 5) * 5; },
    startBlockNow: function(b, nowMin) {
      var L = RPGACE.modules.myDay.logic;
      return L.commitDrag(b, L.startNowAt(nowMin), Number(b.mins) || 30);
    },
    startItemNow: function(x, nowMin) {
      var L = RPGACE.modules.myDay.logic;
      return L.commitItemDrag(x, L.startNowAt(nowMin), Number(x.estimated_mins) || 30).then(function(r) {
        if (typeof startScheduledTask === 'function') startScheduledTask(x.id);
        return r;
      });
    },
    // Tasks inside a block: reorder, or move one into another block.
    reorderItems: function(b, from, to) {
      var items = (b.items || []).slice();
      if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return Promise.resolve(b);
      var it = items.splice(from, 1)[0]; items.splice(to, 0, it);
      return RPGACE.sb.secureWrite('chore_blocks', 'update', { items: items }, 'id=eq.' + b.id).then(function() { b.items = items; RPGACE.cache.clear('chore_blocks'); return b; });
    },
    reorderChores: function(b, from, to) {
      var ids = (b.routine_ids || []).slice();
      if (from < 0 || from >= ids.length || to < 0 || to >= ids.length || from === to) return Promise.resolve(b);
      var it = ids.splice(from, 1)[0]; ids.splice(to, 0, it);
      return RPGACE.sb.secureWrite('chore_blocks', 'update', { routine_ids: ids }, 'id=eq.' + b.id).then(function() { b.routine_ids = ids; RPGACE.cache.clear('chore_blocks'); return b; });
    },
    moveItemToBlock: function(b, idx, target) {
      var it = (b.items || [])[idx];
      if (!it || !target || target.id === b.id) return Promise.reject(new Error('Pick another block.'));
      var left = (b.items || []).filter(function(x, i) { return i !== idx; }), into = (target.items || []).concat([Object.assign({}, it)]);
      return RPGACE.sb.secureWrite('chore_blocks', 'update', { items: into }, 'id=eq.' + target.id).then(function() {
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { items: left }, 'id=eq.' + b.id);
      }).then(function() { b.items = left; target.items = into; RPGACE.cache.clear('chore_blocks'); });
    },
    // The tray: things that can be dragged onto the day. Pure apart from
    // the loaded routines/logs.
    trayModel: function(isoDate) {
      var self = RPGACE.modules.myDay, L = self.logic, routines = self._routines || [], logs = self._logs || [];
      var be = self._beIds || {}, inBlock = {};
      (self._choreBlocks || []).forEach(function(b) {
        if (b.block_date !== isoDate || !L.blockLive(b)) return;
        (b.routine_ids || []).forEach(function(id) { inBlock[String(id)] = 1; });
        (b.items || []).forEach(function(i) { if (i.src === 'routine' && i.ref_id) inBlock[String(i.ref_id)] = 1; });
      });
      var due = L.today(routines, logs, isoDate).filter(function(r) {
        return r.cadence !== 'every_days' && r.cadence !== 'next_time' && !be[String(r.id)] && !inBlock[String(r.id)] && !L.todayLog(r, logs, isoDate);
      }).map(function(r) { return { type: 'routine', key: 'r:' + r.id, r: r, label: (r.icon ? r.icon + ' ' : '') + r.title, mins: Math.max(5, Number(r.est_mins) || 15), realm: L.realmOf(r) }; });
      var chores = L.chores(routines).filter(function(r) { return L.nextDue(r, isoDate) <= isoDate && !inBlock[String(r.id)]; })
        .map(function(r) { return { type: 'chore', key: 'c:' + r.id, r: r, label: '🧹 ' + r.title, mins: Math.max(5, Number(r.est_mins) || 15), realm: 'homekeeper' }; });
      return { due: due, chores: chores };
    },
    // DR-7: due Actions first, then each realm's kept tasks, best first. Pure
    // apart from module state.
    pickerModel: function(isoDate) {
      var L = RPGACE.modules.myDay.logic, rt = RPGACE.modules.realmTasks, xs = RPGACE.modules.xpSeason;
      var tm = L.trayModel(isoDate), realms = {};
      (xs ? xs.ORDER : []).forEach(function(k) {
        realms[k] = (rt ? rt.logic.rank(rt._tasks, k) : []).filter(function(t) { return !t.cadence && !t._resting; }).slice(0, 8).map(function(t) {
          return { type: 'task', key: 't:' + t.id, src: 'task', ref_id: String(t.id), label: t.title, mins: t.mins || 30, realm: k, earns: t.earns || 'tick', xp: t.xp || null, how: t.how || null, opens: t.opens || null };
        });
      });
      return { due: tm.due.concat(tm.chores), realms: realms };
    },
    // The next free gap from now (today) or 09:00, then the planners' save.
    placeNext: function(isoDate, today, t) {
      var L = RPGACE.modules.myDay.logic, ds = L.daySegs(isoDate), now = new Date();
      var from = isoDate === today ? now.getHours() * 60 + now.getMinutes() : 9 * 60;
      var at = L.nextFreeAfter(ds.segs, from + ds.gap, Math.max(10, t.mins || 30));
      if (at == null) return Promise.reject(new Error('No free ' + (t.mins || 30) + ' min left that day.'));
      return L.placeFromTray(isoDate, t, at).then(function() { return at; });
    },
    // Add a picked task to a block as a not-yet-done item.
    addToBlock: function(b, t) {
      var items = (b.items || []).slice();
      items.push({ src: t.src || (t.type === 'routine' || t.type === 'chore' ? 'routine' : 'task'), ref_id: t.ref_id || (t.r ? String(t.r.id) : null), label: t.label.replace(/^🧹 /, ''), mins: t.mins, earns: t.earns || 'tick', xp: t.xp || null, how: t.how || null, opens: t.opens || null });
      return RPGACE.sb.secureWrite('chore_blocks', 'update', { items: items }, 'id=eq.' + b.id).then(function() { b.items = items; RPGACE.cache.clear('chore_blocks'); return null; });
    },
    // Put a tray item on the day at `start` (minutes). Same saves as the
    // planners (guard + push rule + Schedule entry).
    placeFromTray: function(isoDate, t, start) {
      var self = RPGACE.modules.myDay, L = self.logic, at = L.fmtMin(L.snap5(start));
      if (t.type === 'chore') return L.saveChoreBlock({ date: isoDate, start: at, mins: Math.max(10, t.mins), ids: [String(t.r.id)] });
      if (t.type === 'recipe') return L.saveCookingBlock(isoDate, { start: at, mins: t.mins || 60, recipe_ids: [String(t.ref_id)] });
      var item = t.type === 'routine'
        ? { src: 'routine', ref_id: String(t.r.id), label: t.r.title, mins: t.mins, earns: 'real', how: 'its routine XP', opens: t.r.opens || null }
        : { src: t.src || 'activity', ref_id: t.ref_id || null, label: t.label.replace(/^\S+\s/, ''), mins: t.mins, earns: t.earns || 'tick', how: t.how || null, opens: t.opens || null };
      return L.saveRealmBlock(isoDate, { realm: t.realm || 'life', start: at, mins: Math.max(10, t.mins || 30), realm_items: [item], method: L.methodFor(t.realm || 'life') });
    },
    // Move a block to another day (and time) - the week view's drag.
    moveBlockTo: function(b, toIso, from) {
      var L = RPGACE.modules.myDay.logic, oldIso = b.block_date, oldFrom = L.toMin(b.start_time), mins = Number(b.mins) || 30;
      var p = toIso === oldIso ? Promise.resolve() : L.moveBlockDay(b, toIso);
      return p.then(function() { return L.commitDrag(b, from, mins); }).then(function(r) {
        RPGACE.modules.myDay._lastUndo = [{ id: b.id, day: oldIso, from: oldFrom, mins: mins }];
        return r || { id: b.id, from: from, mins: mins, pushed: [] };
      });
    },
    // ── MD-3 Plan my day: fill the day's planned blocks ──────────────────
    dayBlocks: function(isoDate) {
      var L = RPGACE.modules.myDay.logic;
      return (RPGACE.modules.myDay._choreBlocks || []).filter(function(b) { return b.block_date === isoDate && L.blockLive(b); })
        .sort(function(a, b) { return (L.toMin(a.start_time) || 0) - (L.toMin(b.start_time) || 0); });
    },
    blockLive: function(b) { return !!b && (!b.status || b.status === 'planned'); },
    // ── AC-5 "What happened?" (Oct 22 2026) ─────────────────────────────
    // Alex: "any blocks missed get a question why (like morning routine not
    // even done, I woke up at 12pm...)". Answers live in day_misses.
    REASONS: [
      { key: 'woke_late', label: '😴 Woke up late' },
      { key: 'came_up', label: '⚡ Something came up' },
      { key: 'rest', label: '🛋 Chose to rest / skip' },
      { key: 'forgot', label: '🤷 Forgot / ran out of time' },
      { key: 'other', label: '✏️ Something else' },
    ],
    loadMisses: function(fromIso) {
      var self = RPGACE.modules.myDay, L = self.logic;
      fromIso = fromIso || L.addDays(L.iso(), -7);
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(self._misses || []);
      return RPGACE.sb.select('day_misses', 'select=*&day=gte.' + fromIso + '&order=created_at.asc&limit=500')
        .then(function(r) { self._misses = Array.isArray(r) ? r : []; return self._misses; })
        .catch(function() { self._misses = self._misses || []; return self._misses; });
    },
    // Blocks (and the 🌅 Morning block) whose time has passed with nothing
    // logged in them and no answer yet. did = loadDid(day).did. Pure-ish.
    missedItems: function(isoDate, did, nowMin) {
      var self = RPGACE.modules.myDay, L = self.logic, out = [];
      var answered = (self._misses || []).filter(function(m) { return m.day === isoDate; });
      var covered = function(a, b) { return (did || []).some(function(d) { return d.to >= a && d.from <= b; }); };
      var dp = L.dayParts(isoDate), m = dp.be.morning, ds = L.dayState();
      // Day Bookends: no I'm up that day = no Morning to miss; blocks that
      // ended before the press were slept through, not missed.
      var upMin = ds && ds.day === isoDate && ds.up_at ? L.nowMin(new Date(ds.up_at)) : null;
      if (upMin != null && m.tasks.length && m.to <= nowMin && !answered.some(function(x) { return x.kind === 'morning'; })
          && !m.tasks.some(function(r) { return L.todayLog(r, self._logs || [], isoDate); }) && !covered(m.from, m.to)) {
        out.push({ kind: 'morning', day: isoDate, label: m.label, from: m.from, to: m.to });
      }
      dp.blocks.forEach(function(b) {
        var a = L.toMin(b.start_time), e = a + (Number(b.mins) || 30);
        if (a == null || e > nowMin || (upMin != null && e <= upMin)) return;
        if (answered.some(function(x) { return String(x.block_id) === String(b.id); })) return;
        if ((b.items || []).some(function(i) { return i.done; }) || covered(a, e)) return;
        out.push({ kind: 'block', day: isoDate, block: b, label: L.blockLabel(b), from: a, to: e });
      });
      return out.sort(function(x, y) { return x.from - y.from; });
    },
    saveMiss: function(item, reason, note, action) {
      var self = RPGACE.modules.myDay;
      var row = { day: item.day, kind: item.kind, block_id: item.block ? item.block.id : null, label: item.label, reason: reason, note: note ? String(note).slice(0, 300) : null, action: action || 'none' };
      return RPGACE.sb.secureWrite('day_misses', 'insert', row).then(function(data) {
        self._misses = (self._misses || []).concat([(Array.isArray(data) && data[0]) || row]);
        RPGACE.cache.clear('day_misses');
        return row;
      });
    },
    // Later today = next free gap from now; Tomorrow = same time (or the next
    // free gap that day); Drop = the block is kept as 'missed'.
    missAction: function(item, action) {
      var self = RPGACE.modules.myDay, L = self.logic, today = L.iso();
      // The card may outlive a reload of the day: act on the live copy of the block.
      var b = item.block && ((self._choreBlocks || []).filter(function(x) { return String(x.id) === String(item.block.id); })[0] || item.block);
      if (!b || action === 'none') return Promise.resolve(null);
      var n = new Date(), nowMin = n.getHours() * 60 + n.getMinutes();
      if (action === 'drop') return L._retireBlock(b, { status: 'missed' });
      if (action === 'later') {
        var there = b.block_date === today ? Promise.resolve() : RPGACE.sb.secureWrite('chore_blocks', 'update', { block_date: today }, 'id=eq.' + b.id).then(function() { b.block_date = today; });
        return there.then(function() { return L.moveBlockAfter(b, nowMin); });
      }
      var tmr = L.addDays(today, 1), start = L.toMin(b.start_time);
      return L.moveBlockDay(b, tmr).catch(function() {
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { block_date: tmr }, 'id=eq.' + b.id).then(function() {
          b.block_date = tmr;
          var gap = Number((self._settings || {}).buffer_mins); if (isNaN(gap)) gap = 10;
          return L.moveBlockAfter(b, Math.max(0, start - gap));
        });
      });
    },
    // Woke up late: today's wake time only, then every planned block that now
    // sits inside the Morning block moves after it (Undo puts them back).
    wokeLate: function(isoDate, hhmm) {
      var self = RPGACE.modules.myDay, L = self.logic, o = { date: isoDate, time: L.fmtMin(L.toMin(hhmm)) };
      return RPGACE.sb.secureWrite('myday_settings', 'update', { wake_override: o }, 'id=eq.1').then(function() {
        self._settings = Object.assign({}, self._settings || {}, { wake_override: o });
        var mEnd = L.dayParts(isoDate).be.morning.to, moved = [];
        self._lastUndo = [];
        var hit = L.dayBlocks(isoDate).filter(function(b) { return L.toMin(b.start_time) < mEnd; });
        return hit.reduce(function(p, b) {
          return p.then(function() { return L.moveBlockAfter(b, mEnd).then(function(r) { moved = moved.concat(r.moved); }, function() {}); });
        }, Promise.resolve()).then(function() { return { wake: o.time, moved: moved }; });
      });
    },
    // ── Day Bookends (Oct 27 2026) ──────────────────────────────────────
    // Alex: "i want evening rewiew to only pop-up when i press im going to
    // bed in dashboard. same as morning brief - i press woke up, and from
    // there the day starts ends". myday_settings.day_state = {day, up_at,
    // bed_at}. Record: records/2026-10/day_bookends_paranoia_2026-10-27.txt
    dayState: function() { return (RPGACE.modules.myDay._settings || {}).day_state || null; },
    // Awake = pressed I'm up and not Going to bed, within 20 hours. Pure.
    awake: function(ds, nowMs) {
      if (!ds || !ds.up_at || ds.bed_at) return false;
      return (nowMs || Date.now()) - new Date(ds.up_at).getTime() < 20 * 3600000;
    },
    // The day Going to bed reviews: the day I'm up started, else the clock's. Pure.
    bedDay: function(ds, now) {
      var L = RPGACE.modules.myDay.logic;
      return ds && ds.day && !ds.bed_at ? ds.day : L.reviewDate(now);
    },
    // Today's blocks that slide after a late I'm up: the ones starting at or
    // after the planned wake, latest first (so each moves into free time). Pure.
    slideOrder: function(blocks, plannedWake) {
      var L = RPGACE.modules.myDay.logic;
      return (blocks || []).filter(function(b) { var a = L.toMin(b.start_time); return a != null && a >= plannedWake; })
        .sort(function(x, y) { return L.toMin(y.start_time) - L.toMin(x.start_time); });
    },
    // ☀️ I'm up: today starts now. Wake = press time (wake_override), any
    // ringing alarm stops, and the whole day slides later by however late
    // this is against the planned wake (never earlier). Undo-able.
    startDay: function(now) {
      var self = RPGACE.modules.myDay, L = self.logic;
      now = now || new Date();
      var today = L.iso(now), nowMin = L.nowMin(now), prev = L.dayState();
      var st0 = Object.assign({}, self._settings || {}); delete st0.wake_override;
      var planned = L.bookends(L.shiftsOn(today), st0, L.bookendTasks('morning'), L.bookendTasks('night')).wake;
      var ds = { day: today, up_at: now.toISOString(), bed_at: null }, o = { date: today, time: L.fmtMin(nowMin) };
      return RPGACE.sb.secureWrite('myday_settings', 'update', { day_state: ds, wake_override: o }, 'id=eq.1').then(function() {
        self._settings = Object.assign({}, self._settings || {}, { day_state: ds, wake_override: o });
        RPGACE.cache.clear('myday_settings');
        (self._alarms || []).forEach(function(a) { if (a.day <= today && a.status === 'set') a.status = 'done'; });
        var off = RPGACE.sb.secureWrite('myday_alarms', 'update', { status: 'done' }, 'kind=eq.wake&status=eq.set&day=lte.' + today)
          .then(function() { RPGACE.cache.clear('myday_alarms'); }, function() {});
        var by = Math.max(0, nowMin - planned), moved = [], failed = [];
        var gap = Number((self._settings || {}).buffer_mins); if (isNaN(gap) || (self._settings || {}).buffer_mins == null) gap = 10;
        self._lastUndo = [];
        var list = by > 0 ? L.slideOrder(L.dayBlocks(today), planned) : [];
        return off.then(function() {
          return list.reduce(function(p, b) {
            return p.then(function() {
              return L.moveBlockAfter(b, L.toMin(b.start_time) + by - gap).then(function(r) { moved = moved.concat(r.moved); }, function() { failed.push(L.blockLabel(b)); });
            });
          }, Promise.resolve());
        }).then(function() { return { prev: prev, by: by, moved: moved, failed: failed, day: today }; });
      });
    },
    // The bedtime alarm suggestion: now + sleep target, but early enough for
    // tomorrow's shift (start minus get-ready + travel), rounded to 5 min.
    // shiftsFor(isoDate) -> shifts. Returns a Date. Pure.
    suggestAlarm: function(now, sleepH, shiftsFor, st) {
      var L = RPGACE.modules.myDay.logic, h = Number(sleepH) > 0 ? Number(sleepH) : 8;
      var at = new Date(now.getTime() + h * 3600000), why = h + 'h sleep';
      var d = L.iso(at), sh = (shiftsFor(d) || []).map(function(x) { return L.toMin(x.start); }).filter(function(m) { return m != null; }).sort(function(a, b) { return a - b; })[0];
      if (sh != null) {
        var cap = new Date(d + 'T00:00:00'); cap.setMinutes(sh - L.shiftBefore(st || {}));
        if (cap < at && cap > now) { at = cap; why = 'ready for your ' + L.fmtMin(sh) + ' shift'; }
      }
      at = new Date(Math.round(at.getTime() / 300000) * 300000);
      return { at: at, why: why };
    },
    // WF-2 (Oct 29 2026, Alex: "The alarm should be set always as beginning of morning block"):
    // the Going to bed alarm = the start of the next Morning block (earlier on a morning shift).
    // null when that time has already gone (suggestAlarm is used then). Pure apart from dayParts.
    morningAlarm: function(isoDate, now) {
      var L = RPGACE.modules.myDay.logic, dp = L.dayParts(isoDate), w = dp.be.wake;
      if (w == null) return null;
      var at = new Date(isoDate + 'T00:00:00'); at.setMinutes(w);
      if (at <= (now || new Date())) return null;
      var plain = L.toMin((dp.st || {}).wake_time || '08:00');
      return { at: at, why: 'start of your Morning block' + (w < plain && dp.shifts.length ? ' (early for your ' + dp.shifts[0].start + ' shift)' : '') };
    },
    // 🌙 Going to bed: the day closes; one wake alarm for the morning (or none).
    endDay: function(alarmAt, now) {
      var self = RPGACE.modules.myDay, L = self.logic;
      now = now || new Date();
      var prev = L.dayState(), ds = { day: L.bedDay(prev, now), up_at: prev && !prev.bed_at ? prev.up_at : null, bed_at: now.toISOString() };
      return RPGACE.sb.secureWrite('myday_settings', 'update', { day_state: ds }, 'id=eq.1').then(function() {
        self._settings = Object.assign({}, self._settings || {}, { day_state: ds });
        RPGACE.cache.clear('myday_settings');
        if (!alarmAt) return { day: ds.day, alarm: null };
        var row = { day: L.iso(alarmAt), kind: 'wake', at: alarmAt.toISOString(), stop_routine_id: null, stop_label: null, status: 'set', last_sent_at: null, sends: 0 };
        return RPGACE.sb.secureWrite('myday_alarms', 'insert', row, null, 'day,kind').then(function() {
          RPGACE.cache.clear('myday_alarms');
          self._alarms = (self._alarms || []).filter(function(a) { return a.day !== row.day; }).concat([row]);
          return { day: ds.day, alarm: row };
        });
      });
    },
    // Forgot Going to bed: the day before has no evening review yet?
    reviewPending: function(prev, today) {
      if (!prev || !prev.day || prev.bed_at || prev.day === today) return Promise.resolve(null);
      return RPGACE.sb.select('journal', 'select=id&source=eq.evening_review&review_on=eq.' + prev.day + '&limit=1')
        .then(function(r) { return Array.isArray(r) && r.length ? null : prev.day; }, function() { return null; });
    },
    // Sunday review line: 'Woke up late ×2, Something came up ×1'.
    missLine: function(ws, end) {
      var self = RPGACE.modules.myDay, L = self.logic, n = {};
      (self._misses || []).filter(function(m) { return m.day >= ws && m.day <= end; }).forEach(function(m) { n[m.reason] = (n[m.reason] || 0) + 1; });
      return L.REASONS.filter(function(r) { return n[r.key]; }).map(function(r) { return r.label.replace(/^\S+ /, '') + ' ×' + n[r.key]; }).join(', ');
    },
    // AC-4: planned blocks a span of the day (minutes) really covers - at
    // least half the block or 30 min, whichever is smaller (Oct 22 2026).
    overlapsFor: function(isoDate, fromMin, toMin, skipId) {
      var L = RPGACE.modules.myDay.logic;
      return L.dayBlocks(isoDate).filter(function(b) {
        if (skipId && String(b.id) === String(skipId)) return false;
        var s = L.toMin(b.start_time), m = Number(b.mins) || 30;
        if (s == null) return false;
        var ov = Math.min(toMin, s + m) - Math.max(fromMin, s);
        return ov > 0 && ov >= Math.min(m / 2, 30);
      });
    },
    // First start at/after `from` (5-minute steps, before midnight) where
    // `mins` fits clear of everything. Pure.
    nextFreeAfter: function(segs, from, mins, exceptId) {
      var busy = segs.filter(function(g) { return g.kind !== 'gap' && !(exceptId && g.id === exceptId); });
      for (var a = Math.ceil(from / 5) * 5; a + mins <= 1440; a += 5) {
        if (busy.every(function(g) { return a + mins <= g.from || a >= g.to; })) return a;
      }
      return null;
    },
    // AC-4 "Move it later": the block goes to the next free gap after `afterMin`
    // (plus the usual gap), through the same guard; Undo puts it back.
    moveBlockAfter: function(b, afterMin) {
      var self = RPGACE.modules.myDay, L = self.logic, dp = L.dayParts(b.block_date), mins = Number(b.mins) || 30;
      var gap = Number((dp.st || {}).buffer_mins); if (isNaN(gap) || (dp.st || {}).buffer_mins == null) gap = 10;
      var segs = L.segments({ shifts: dp.shifts, sched: dp.sched, blocks: dp.blocks, bookends: dp.bookends, st: dp.st });
      var at = L.nextFreeAfter(segs, afterMin + gap, mins, b.id), old = L.toMin(b.start_time);
      if (at == null) return Promise.reject(new Error('No free ' + mins + ' min left today for ' + L.blockLabel(b) + '.'));
      return L.guard(b.block_date, at, mins, b.id).then(function(g) {
        var undo = (self._lastUndo || []).slice();
        return L.moveBlock(b, at).then(function() {
          self._lastUndo = undo.concat([{ id: b.id, from: old, to: old + mins }]);
          RPGACE.cache.clear('chore_blocks');
          return { at: at, moved: ((g && g.moved) || []).concat([{ label: L.blockLabel(b), delta: at - old }]) };
        });
      });
    },
    itemKey: function(i) { return (i.src || 'own') + ':' + (i.ref_id || i.label); },
    // What can go in a realm block, best first (Alex: top 3 first, "show
    // more" for the rest): that realm's routines due that day and not done
    // yet, then books / activities that earn from the real action, then
    // the rest. Pure: opt = realmOptions() result.
    rankOptions: function(opt, isoDate, current) {
      var self = RPGACE.modules.myDay, L = self.logic, byId = {}, seen = {}, out = [];
      (self._routines || []).forEach(function(r) { byId[String(r.id)] = r; });
      // One entry per thing: a routine and a starter activity with the same
      // name are the same thing (the routine wins - it's added first).
      var add = function(i, score) {
        var k = L.itemKey(i), nk = 'name:' + String(i.label || '').trim().toLowerCase();
        if (seen[k] || seen[nk]) return; seen[k] = 1; seen[nk] = 1;
        out.push(Object.assign({}, i, { key: k, score: score, n: out.length }));
      };
      (opt.routines || []).forEach(function(i) {
        var r = byId[String(i.ref_id)], due = r && L.dueOnDate(r, isoDate), done = r && isoDate === L.iso() && L.todayLog(r, self._logs, isoDate);
        add(i, due && !done ? 3 : 0.5);
      });
      (opt.books || []).forEach(function(i) { add(i, 2); });
      (opt.starters || []).forEach(function(i) { add(i, i.earns === 'real' ? 2 : 1); });
      (current || []).forEach(function(i) { add(i, 1); });
      return out.sort(function(a, b) { return b.score - a.score || a.n - b.n; });
    },
    blockOptions: function(b, isoDate) {
      var L = RPGACE.modules.myDay.logic;
      return L.realmOptions(b.realm).then(function(opt) { return L.rankOptions(opt, isoDate, b.items); });
    },
    saveBlockItems: function(b, items) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var clean = (items || []).filter(function(i) { return i && i.label; }).map(function(i) {
        return { src: i.src || 'own', ref_id: i.ref_id || null, label: i.label, mins: i.mins || null, earns: i.earns || 'tick', xp: i.xp || null, how: i.how || null, opens: i.opens || null, done: !!i.done, frog: !!i.frog, log_id: i.log_id || null,
          context_kind: i.context_kind || null, context_id: i.context_id || null, context: i.context || null, recipe_id: i.recipe_id || null }; // GM-5/6
      });
      if (!clean.length) return Promise.reject(new Error('Pick at least one thing for the block.'));
      var ops = [RPGACE.sb.secureWrite('chore_blocks', 'update', { items: clean }, 'id=eq.' + b.id)];
      if (b.agenda_id) ops.push(RPGACE.sb.secureWrite('rpgace_agendas', 'update', { description: clean.map(function(i) { return (i.frog ? '🐸 ' : '') + i.label + (i.context ? ' (' + i.context + ')' : ''); }).join(' · ') }, 'id=eq.' + b.agenda_id));
      return Promise.all(ops).then(function() { b.items = clean; RPGACE.cache.clear('chore_blocks'); return clean; });
    },
    // 1-3-5: one big, three medium, five small things a day. Size by length.
    sizeOf: function(i) { var m = Number(i && i.mins) || 15; return m >= 60 ? 'big' : m >= 20 ? 'medium' : 'small'; },
    count135: function(blocks) {
      var L = RPGACE.modules.myDay.logic, c = { big: 0, medium: 0, small: 0 };
      (blocks || []).forEach(function(b) { if (b.kind === 'realm') (b.items || []).forEach(function(i) { c[L.sizeOf(i)]++; }); });
      return c;
    },
    // 🐸 Eat the frog: one thing in the day's blocks, done first.
    setFrog: function(isoDate, blockId, key) {
      var L = RPGACE.modules.myDay.logic;
      return Promise.all(L.dayBlocks(isoDate).filter(function(b) { return b.kind === 'realm'; }).map(function(b) {
        var was = (b.items || []).map(function(i) { return !!i.frog; }).join();
        var items = (b.items || []).map(function(i) { return Object.assign({}, i, { frog: b.id === blockId && L.itemKey(i) === key }); });
        return items.map(function(i) { return i.frog; }).join() === was ? null : L.saveBlockItems(b, items);
      }));
    },
    frogOf: function(isoDate) {
      var L = RPGACE.modules.myDay.logic, f = null;
      L.dayBlocks(isoDate).forEach(function(b) { (b.items || []).forEach(function(i) { if (i.frog && !f) f = { block: b, item: i }; }); });
      return f;
    },
    // ── MD-8 Did blocks ─────────────────────────────────────────────────
    // Alex (Oct 18): "chronicles could fill out a block, since ill be doing
    // missions similar until i switch to the next so communicating into
    // schedule as back track would be awesome". What actually happened is
    // worked out each time (never stored): Doing Now sessions give real
    // start-end spans; every other real action is its xp_events row (realm +
    // earned_at), counted as the 15 minutes up to that moment. Runs in the
    // same realm merge until the realm changes or there is a gap of more than
    // DID_GAP minutes.
    DID_GAP: 30,
    DID_POINT_MINS: 15,
    // Not something done at that moment: day-end tallies, bonuses, the
    // Doing Now finish (the session itself is used) and Claude Code's own
    // ships.
    DID_SKIP: ['balance_bonus', 'cutback_day', 'big_day', 'doing_now_done', 'build_shipped', 'level_up', 'treat_earned'],
    // Minutes from the day's midnight (past midnight -> over 1440). Pure.
    minOf: function(iso, day) { return Math.round((new Date(iso) - new Date(day + 'T00:00:00')) / 60000); },
    // sessions = Doing Now rows, events = xp_events rows, nowMin when the
    // day is today (a running session ends now). Pure.
    didItems: function(sessions, events, day, nowMin) {
      var L = RPGACE.modules.myDay.logic, out = [];
      (sessions || []).forEach(function(s) {
        if (!s.started_at) return;
        var from = L.minOf(s.started_at, day), to;
        if (s.ended_at) to = L.minOf(s.ended_at, day);
        else if (!s.completed && nowMin != null) to = nowMin;
        else to = from + (Number(s.actual_mins) || 30);
        if (to <= from) to = from + 1;
        out.push({ from: from, to: to, realm: (s.realms && s.realms[0]) || 'life', label: s.title || 'Live now', src: 'doing_now' });
      });
      var spans = out.slice();
      (events || []).forEach(function(e) {
        if (!e.earned_at || L.DID_SKIP.indexOf(e.action) !== -1) return;
        var to = L.minOf(e.earned_at, day), realm = e.realm || 'life';
        // Already inside a Doing Now session in the same realm.
        if (spans.some(function(s) { return s.realm === realm && to >= s.from && to <= s.to + 5; })) return;
        out.push({ from: Math.max(0, to - L.DID_POINT_MINS), to: to, realm: realm, label: e.note || String(e.action || '').replace(/_/g, ' '), src: e.action });
      });
      return out.sort(function(a, b) { return a.from - b.from || a.to - b.to; });
    },
    mergeDid: function(items, gap) {
      var L = RPGACE.modules.myDay.logic, out = [];
      gap = gap == null ? L.DID_GAP : gap;
      (items || []).forEach(function(it) {
        var last = out[out.length - 1];
        if (last && last.realm === it.realm && it.from - last.to <= gap) {
          last.to = Math.max(last.to, it.to); last.n++;
          if (last.labels.indexOf(it.label) === -1) last.labels.push(it.label);
          return;
        }
        out.push({ realm: it.realm, from: it.from, to: it.to, labels: [it.label], n: 1 });
      });
      return out;
    },
    didText: function(b) {
      var ls = b.labels;
      return ls.slice(0, 3).join(' · ') + (ls.length > 3 ? ' +' + (ls.length - 3) + ' more' : '') + (b.n > ls.length ? ' (' + b.n + ' things)' : '');
    },
    // Per realm: planned block minutes vs did minutes (merged). Pure.
    plannedVsDid: function(planned, did) {
      var rb = RPGACE.modules.realmBrief, map = (rb && rb.BLOCK_REALM) || { chore: 'homekeeper', cooking: 'chef', shopping: 'life' };
      var rows = {};
      var get = function(r) { return rows[r] || (rows[r] = { realm: r, planned: 0, did: 0 }); };
      (planned || []).forEach(function(b) { if (b.status === 'cancelled') return; var k = b.kind === 'chores' ? 'chore' : b.kind; get(b.realm || map[k] || 'homekeeper').planned += Number(b.mins) || 0; });
      (did || []).forEach(function(b) { get(b.realm).did += Math.max(0, b.to - b.from); });
      return Object.keys(rows).map(function(k) { return rows[k]; }).sort(function(a, b) { return (b.planned + b.did) - (a.planned + a.did); });
    },
    loadDid: function(day) {
      var self = RPGACE.modules.myDay, L = self.logic, tp = RPGACE.modules.tripPlans;
      var n = new Date(), nowMin = day === L.iso(n) ? n.getHours() * 60 + n.getMinutes() : null;
      return Promise.all([
        RPGACE.sb.select('rpgace_agendas', 'select=id,title,started_at,ended_at,actual_mins,completed,realms&source_type=eq.doing_now&date=eq.' + day).catch(function() { return []; }),
        tp ? tp.logic.read('xp_events', 'select=realm,action,source_table,source_id,earned_at,note&earned_on=eq.' + day + '&status=neq.removed&order=earned_at.asc&limit=1000').catch(function() { return []; }) : [],
        RPGACE.sb.select('chore_blocks', 'select=id,kind,realm,start_time,mins,status&block_date=eq.' + day + '&status=eq.planned').catch(function() { return []; })
      ]).then(function(r) {
        var did = L.mergeDid(L.didItems(Array.isArray(r[0]) ? r[0] : [], Array.isArray(r[1]) ? r[1] : [], day, nowMin));
        var planned = Array.isArray(r[2]) ? r[2] : [];
        return { day: day, did: did, planned: planned, vs: L.plannedVsDid(planned, did) };
      });
    },
    // 'Producer 60/155 min, Chef 0/45 min' (planned / did). Pure.
    vsLine: function(vs) {
      var xs = RPGACE.modules.xpSeason;
      return vs.map(function(v) { var R = (xs && xs.REALMS[v.realm]) || { name: v.realm }; return R.name + ' ' + v.planned + '/' + v.did + ' min'; }).join(', ');
    },
    // ── MD-7 Schedule links ─────────────────────────────────────────────
    // The 🌅/🌙 blocks as Daily Schedule rows for a date (drawn, not stored,
    // so they can never drift from My Day). Empty bookends are left out. If
    // My Day hasn't loaded yet, load once and redraw the calendar.
    calendarBookends: function(isoDate) {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (!self._calLoaded) {
        if (!self._calLoading && RPGACE.sb && RPGACE.sb.select) {
          self._calLoading = Promise.all([L.load(), L.loadTimings()]).then(function() {
            self._calLoaded = true;
            if (typeof renderDailyGrid === 'function') renderDailyGrid();
          }).catch(function() { self._calLoading = null; });
        }
        if (!self._settings) return [];
      }
      var be = L.dayParts(isoDate).be, out = [];
      [['morning', '#e0a84c', 'rgba(224,168,76,0.12)'], ['night', '#8a7fd4', 'rgba(138,127,212,0.12)']].forEach(function(c) {
        var e = be[c[0]];
        if (!e.tasks.length || e.to <= e.from || e.from >= 1440) return;
        out.push({ startFrac: e.from / 60, endFrac: e.to / 60, type: 'bookend', which: c[0], label: e.label + ' · ' + e.tasks.length + ' task' + (e.tasks.length === 1 ? '' : 's'), color: c[1], bg: c[2] });
      });
      return out;
    },
    // ── MD-6 evening review ─────────────────────────────────────────────
    // Opens from 🌙 Going to bed (Day Bookends, Oct 27 2026; it used to open
    // by itself before bed); +10 Mind XP once a day (DB trigger xp_on_evening).
    // The day a review is about: before 04:00 it is still yesterday. Pure.
    reviewDate: function(now) {
      var L = RPGACE.modules.myDay.logic;
      now = now || new Date();
      return now.getHours() < 4 ? L.addDays(L.iso(now), -1) : L.iso(now);
    },
    // What got done and what didn't on a day, from what My Day has loaded.
    // Chores (every_days) roll on by themselves, so they only count as done.
    eveningModel: function(day) {
      var self = RPGACE.modules.myDay, L = self.logic, logs = self._logs || [];
      var done = [], open = [];
      (self._routines || []).forEach(function(r) {
        var lg = L.todayLog(r, logs, day);
        if (lg && lg.status === 'completed') { done.push({ label: (r.icon ? r.icon + ' ' : '') + r.title, how: lg.description === 'minimum' ? 'minimum' : '' }); return; }
        if (lg || r.cadence === 'every_days' || r.cadence === 'next_time' || !L.isDueToday(r, logs, day)) return;
        // A few-times-a-week routine only counts as missed on a day it was planned for.
        if (r.cadence === 'times_per_week' && !L.plannedOn(r, day)) return;
        open.push({ kind: r.cadence === 'once' ? 'once' : 'routine', r: r, label: (r.icon ? r.icon + ' ' : '') + r.title });
      });
      L.dayBlocks(day).forEach(function(b) {
        if ((b.kind || 'chores') === 'chores') return; // its chores are routines above
        var its = b.items || [], ok = its.filter(function(i) { return i.done; }), left = its.filter(function(i) { return !i.done; });
        ok.forEach(function(i) { done.push({ label: i.label, how: L.blockLabel(b) }); });
        if (left.length) open.push({ kind: b.kind, b: b, items: left, kept: ok, label: L.blockLabel(b) + ': ' + left.map(function(i) { return i.label; }).join(' · ') });
      });
      return { day: day, done: done, open: open };
    },
    // A chore/shopping block moves to another day as it is (block + its
    // Daily Schedule entry), through the same no-overlap guard as any save.
    moveBlockDay: function(b, toIso) {
      var self = RPGACE.modules.myDay, L = self.logic, start = L.toMin(b.start_time);
      return L.guard(toIso, start, Number(b.mins) || 30, b.id).then(function(g) {
        L._noteMoved(g);
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { block_date: toIso }, 'id=eq.' + b.id);
      }).then(function() {
        b.block_date = toIso;
        RPGACE.cache.clear('chore_blocks');
        if (!b.agenda_id) return;
        try { RPGACE.DB.set('sched', (RPGACE.DB.get('sched') || []).map(function(a) { return a.id === b.agenda_id ? Object.assign({}, a, { date: toIso }) : a; })); } catch (e) {}
        return RPGACE.sb.secureWrite('rpgace_agendas', 'update', { date: toIso }, 'id=eq.' + b.agenda_id);
      });
    },
    // One open item: 'tomorrow' carries it over, 'drop' lets it go, 'skip'
    // logs a recurring routine as skipped (never-miss-twice sees it).
    eveningAct: function(x, act, reviewDay) {
      var self = RPGACE.modules.myDay, L = self.logic, tmr = L.addDays(x.b ? x.b.block_date : L.reviewDate(), 1);
      // Oct 27 2026 fix: the review could only Skip an Action, never log it done
      // (Alex: "when I click log as done in evening review, fuck all is done").
      if (x.kind === 'routine') {
        var day = reviewDay || L.reviewDate(), at = day === L.iso() ? null : new Date(day + 'T12:00:00').toISOString();
        if (act === 'done') return L.tick(x.r, at ? { at: at } : {});
        return act === 'skip' ? L.skip(x.r) : Promise.resolve();
      }
      if (x.kind === 'once') {
        if (act === 'drop') return L.remove(x.r.id).then(function() { self._routines = self._routines.filter(function(r) { return r.id !== x.r.id; }); });
        return L.actionUpdate(x.r, { due_date: tmr, updated_at: new Date().toISOString() });
      }
      var b = x.b, keep = x.kept || [];
      var trim = function() { return keep.length ? L.saveBlockItems(b, keep) : L.cancelChoreBlock(b); };
      if (act === 'drop') return x.kind === 'realm' ? trim() : L.cancelChoreBlock(b);
      if (x.kind === 'realm') {
        return L.saveRealmBlock(tmr, { realm: b.realm, start: b.start_time, mins: b.mins, method: b.method,
          realm_items: x.items.map(function(i) { return Object.assign({}, i, { done: false, log_id: null, frog: false }); }) }).then(trim);
      }
      if (x.kind === 'shopping') return L.moveBlockDay(b, tmr);
      return Promise.reject(new Error('Open Cooking to move this cook.'));
    },
    eveningText: function(m, xp, moved, note, vs) {
      var out = ['🌙 ' + m.day];
      out.push(m.done.length ? 'Done (' + m.done.length + '): ' + m.done.map(function(d) { return d.label + (d.how === 'minimum' ? ' (minimum)' : ''); }).join(', ') : 'Nothing ticked today.');
      if (xp) out.push('XP today: +' + xp);
      if (vs) out.push('Planned vs did: ' + vs);
      (moved || []).forEach(function(x) { out.push(x); });
      if (String(note || '').trim()) out.push('', String(note).trim());
      return out.join('\n');
    },
    // One journal line per evening (updated if saved twice).
    saveEvening: function(day, text) {
      var row = { title: '🌙 Evening — ' + new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        content: text, date: new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        source: 'evening_review', entry_type: 'evening_review', review_on: day };
      return RPGACE.sb.select('journal', 'select=id&source=eq.evening_review&review_on=eq.' + day + '&limit=1').catch(function() { return []; }).then(function(r) {
        var id = Array.isArray(r) && r[0] ? r[0].id : null;
        return id ? RPGACE.sb.secureWrite('journal', 'update', row, 'id=eq.' + id)
          : RPGACE.sb.secureWrite('journal', 'insert', Object.assign({ created_at: new Date().toISOString() }, row));
      }).then(function() { RPGACE.cache.clear('journal'); });
    },
    // Pure: 'Mon 13 Oct: Done (4): ... ' + the one line, if any.
    eveningLines: function(rows) {
      return (rows || []).map(function(r) {
        var ls = String(r.content || '').split('\n'), done = (ls[1] || '').replace(/:.*$/, ''), note = ls.slice(ls.indexOf('') + 1).filter(Boolean)[0];
        var d = new Date(r.review_on + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        return d + ' — ' + (done || 'reviewed') + (ls.indexOf('') !== -1 && note ? ' · ' + note : '');
      });
    },
    // Weekly review: the week's evening lines.
    weekEvenings: function(ws, end) {
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve([]);
      return RPGACE.sb.select('journal', 'select=review_on,content&source=eq.evening_review&review_on=gte.' + ws + '&review_on=lte.' + end + '&order=review_on.asc')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    // ── MD-4 focus timer ────────────────────────────────────────────────
    // The rounds a block's method makes of its minutes. Pure.
    // Pomodoro 25 on / 5 off, 15 off after every 4th; Deep work 50/10 or
    // 90/15; Time-box = one run (a 5-minute warning is an alert, not a phase).
    focusPhases: function(method, mins) {
      mins = Math.max(5, Math.round(Number(mins) || 0));
      var spec = { pomodoro: [25, 5], deep50: [50, 10], deep90: [90, 15] }[method];
      if (!spec) return [{ kind: 'focus', mins: mins, n: 1 }];
      var out = [], left = mins, n = 0;
      while (left > 0) {
        var f = Math.min(spec[0], left); n++;
        var br = method === 'pomodoro' && n % 4 === 0 ? 15 : spec[1];
        // Never end on a break: time left that a break would eat goes on this round.
        if (left - f <= br) f = left;
        out.push({ kind: 'focus', mins: f, n: n }); left -= f;
        if (left <= 0) break;
        out.push({ kind: 'break', mins: br, n: n }); left -= br;
      }
      return out;
    },
    // Where a run is now. Pure: run = { startedAt, phases, pausedMs, pausedAt }.
    focusAt: function(run, now) {
      var el = Math.max(0, now - run.startedAt - (run.pausedMs || 0) - (run.pausedAt ? now - run.pausedAt : 0)), t = 0;
      for (var i = 0; i < run.phases.length; i++) {
        var len = run.phases[i].mins * 60000;
        if (el < t + len) return { i: i, phase: run.phases[i], left: Math.ceil((t + len - el) / 1000), done: false, elapsed: el };
        t += len;
      }
      return { i: run.phases.length, phase: null, left: 0, done: true, elapsed: el };
    },
    // When each alert is due (ms), for the phone. Pure.
    focusAlerts: function(run, label, now) {
      var out = [], t = run.startedAt + (run.pausedMs || 0), k = 0, last = run.phases.length - 1;
      run.phases.forEach(function(p, i) {
        t += p.mins * 60000;
        var msg = i === last ? '✅ ' + label + ' done — tick what you finished' : p.kind === 'focus' ? '☕ Break: ' + run.phases[i + 1].mins + ' min' : '🎯 Back to it: round ' + (p.n + 1);
        out.push({ k: k++, at: t, text: msg });
        if (run.method === 'timebox' && p.kind === 'focus' && p.mins > 10) out.push({ k: k++, at: t - 5 * 60000, text: '⏳ 5 minutes left on ' + label });
      });
      return out.filter(function(a) { return a.at > now; });
    },
    focusRun: function() { try { var r = JSON.parse(localStorage.getItem('myday_focus') || 'null'); return r && r.blockId && Array.isArray(r.phases) ? r : null; } catch (e) { return null; } },
    _saveRun: function(r) { try { if (r) localStorage.setItem('myday_focus', JSON.stringify(r)); else localStorage.removeItem('myday_focus'); } catch (e) {} },
    // Phone alerts go through myday_alarms (sent by push_alarm via the
    // every-minute myday-push job, so up to ~1 min late).
    _clearFocusAlarms: function(blockId) {
      return RPGACE.sb.secureWrite('myday_alarms', 'update', { status: 'off' }, 'kind=like.focus:' + blockId + '*&status=eq.set').catch(function() {});
    },
    _queueFocusAlarms: function(run) {
      var L = RPGACE.modules.myDay.logic, rows = L.focusAlerts(run, run.label, Date.now()).map(function(a) {
        return { day: L.iso(new Date(a.at)), kind: 'focus:' + run.blockId + ':' + a.k, at: new Date(a.at).toISOString(), status: 'set', stop_label: a.text, last_sent_at: null, sends: 0 };
      });
      if (!rows.length) return Promise.resolve();
      return RPGACE.sb.secureWrite('myday_alarms', 'insert', rows, null, 'day,kind').catch(function(e) {
        RPGACE.utils.toast('⚠️ Timer runs, but phone alerts are off: ' + (e.message || e), '#CC4A4A', 4000, 'myDay');
      });
    },
    startFocus: function(b) {
      var self = RPGACE.modules.myDay, L = self.logic, dn = RPGACE.modules.doingNow;
      if (L.focusRun()) return Promise.reject(new Error('A block timer is already running — stop it first.'));
      var method = L.blockMethod(b);
      if (method === 'none') return Promise.reject(new Error('This block is set to "Just tick it" — no timer.'));
      var label = L.blockLabel(b), now = Date.now();
      var run = { blockId: b.id, method: method, label: label, realm: b.realm || null, mins: Number(b.mins) || 30, startedAt: now, pausedMs: 0, pausedAt: null, phases: L.focusPhases(method, b.mins), rung: -1 };
      var entry = null;
      try { if (dn) entry = dn.logic.start(label, b.realm ? [b.realm] : []); } catch (e) {}
      run.entryId = entry && entry.id ? entry.id : null;
      L._saveRun(run);
      // Realm Tasks: a realm block's start opens ▶ Live now.
      try { RPGACE.hooks.fire('myday:block-start', b); } catch (e) {}
      return L._queueFocusAlarms(run).then(function() { return run; });
    },
    pauseFocus: function() {
      var L = RPGACE.modules.myDay.logic, run = L.focusRun();
      if (!run || run.pausedAt) return Promise.resolve(run);
      run.pausedAt = Date.now(); L._saveRun(run);
      return L._clearFocusAlarms(run.blockId).then(function() { return run; });
    },
    resumeFocus: function() {
      var L = RPGACE.modules.myDay.logic, run = L.focusRun();
      if (!run || !run.pausedAt) return Promise.resolve(run);
      run.pausedMs = (run.pausedMs || 0) + (Date.now() - run.pausedAt); run.pausedAt = null; L._saveRun(run);
      return L._queueFocusAlarms(run).then(function() { return run; });
    },
    // Stop (early) or finish (all rounds run): the Doing Now entry closes with
    // the real minutes; a fully-run block adds a small bonus (+15 to its realm).
    stopFocus: function(full) {
      var self = RPGACE.modules.myDay, L = self.logic, dn = RPGACE.modules.doingNow, run = L.focusRun();
      if (!run) return Promise.resolve(null);
      L._saveRun(null);
      var ops = [L._clearFocusAlarms(run.blockId)];
      var entry = dn && run.entryId ? dn.logic.all().filter(function(x) { return x.id === run.entryId; })[0] : null;
      if (entry && !entry.completed) ops.push(dn.logic.finish(entry, {}).catch(function(e) { RPGACE.utils.toast('⚠️ Live now entry not closed: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); }));
      if (full) ops.push(RPGACE.sb.secureWrite('quest_log', 'insert', {
        quest_key: 'block_done:' + run.blockId, quest_kind: 'block', name: run.label + ' finished', category: run.realm || 'life', quest_type: 'block',
        xp: self.BLOCK_BONUS_XP, estimated_minutes: run.mins, actual_minutes: run.mins, completed_at: new Date().toISOString(), status: 'completed', source_table: 'chore_blocks', source_ref: String(run.blockId),
      }).then(function() { RPGACE.cache.clear('quest_log'); }));
      return Promise.all(ops).then(function() { return run; });
    },
    // Before a block is saved: make room for it (push rule), or say why not.
    // Resolves with { moved } once there is room; rejects with a clear
    // message otherwise. tooFar asks (via ui.askShorten) to shorten the
    // other block, then tries again.
    guard: function(isoDate, start, mins, exceptId) {
      var self = RPGACE.modules.myDay, L = self.logic, dp = L.dayParts(isoDate);
      var gap = Number((dp.st || {}).buffer_mins); if (isNaN(gap) || (dp.st || {}).buffer_mins == null) gap = 10;
      var segs = L.segments({ shifts: dp.shifts, sched: dp.sched, blocks: dp.blocks, bookends: dp.bookends, st: dp.st });
      var nb = { id: exceptId || '__new', from: start, to: start + mins };
      var r = L.makeRoom(segs, nb, gap, 30);
      if (r.fixed || r.stuck) {
        var f = r.fixed || r.on, alt = L.nearestFree(segs, start, mins, exceptId);
        var msg = (r.stuck ? 'Moving ' + r.stuck.label + ' would hit ' : 'That clashes with ') + f.label + ' (' + L.fmtMin(f.from) + '–' + L.fmtMin(f.to) + ').' +
          (alt != null ? ' Nearest free: ' + L.fmtMin(alt) + '.' : ' No free time that long that day.');
        var err = new Error(msg); err.freeAt = alt; return Promise.reject(err);
      }
      if (r.tooFar) {
        return self.ui.askShorten(isoDate, r.tooFar, r.by, r.dir, mins).then(function() { return L.guard(isoDate, start, mins, exceptId); });
      }
      return L.applyMoves(r.moves).then(function(m) { return { moved: m }; });
    },
    // MD-1: wake/bed time, gap after blocks, the bookend task lists and the
    // alarm switch (myday_settings row 1).
    saveDaySettings: function(patch) {
      var self = RPGACE.modules.myDay, L = self.logic, clean = {};
      ['wake_time', 'bed_time'].forEach(function(k) {
        if (patch[k] == null) return;
        if (L.toMin(patch[k]) == null) throw new Error('Pick a time for ' + (k === 'wake_time' ? 'waking up' : 'bed'));
        clean[k] = L.fmtMin(L.toMin(patch[k]));
      });
      if (patch.buffer_mins != null) {
        var g = Math.round(Number(patch.buffer_mins));
        if (isNaN(g) || g < 0 || g > 60) throw new Error('The gap between blocks must be 0-60 minutes');
        clean.buffer_mins = g;
      }
      ['morning_tasks', 'night_tasks'].forEach(function(k) { if (Array.isArray(patch[k])) clean[k] = patch[k].map(String); });
      if (patch.alarm_on != null) clean.alarm_on = !!patch.alarm_on;
      if (patch.realm_methods && typeof patch.realm_methods === 'object') clean.realm_methods = patch.realm_methods;
      if (patch.plan_style != null) { if (['none', 'frog', '135'].indexOf(patch.plan_style) === -1) throw new Error('Unknown plan style'); clean.plan_style = patch.plan_style; }
      clean.id = 1; clean.updated_at = new Date().toISOString();
      return RPGACE.sb.secureWrite('myday_settings', 'insert', clean, null, 'id').then(function() {
        RPGACE.cache.clear('myday_settings');
        self._settings = Object.assign({}, self._settings || {}, clean);
        self._alarmSyncedAt = 0;
        return self._settings;
      });
    },
    // A new task for a bookend = a daily routine in that part of the day.
    addBookendTask: function(which, title, mins) {
      var L = RPGACE.modules.myDay.logic;
      var row = L.clean({ title: title, cadence: 'daily', part_of_day: which === 'morning' ? 'morning' : 'evening', est_mins: mins, xp: 5, area: which === 'morning' ? 'Home' : 'Mind' });
      var bad = L.validate(row);
      if (bad) return Promise.reject(new Error(bad));
      row.sort = (RPGACE.modules.myDay._routines || []).length;
      return RPGACE.sb.secureWrite('routines', 'insert', row).then(function(data) {
        var saved = Array.isArray(data) && data[0];
        if (!saved || !saved.id) throw new Error('The task saved but came back without an id — reload My Day.');
        RPGACE.cache.clear('routines');
        RPGACE.modules.myDay._routines.push(saved);
        return saved;
      });
    },
    // Day Bookends: the wake alarm is set at bedtime (logic.endDay), one row
    // per night in myday_alarms; push_alarm() rings it until ☀️ I'm up
    // marks it done. This only loads the rows for the in-app alarm bar.
    syncAlarms: function(force) {
      var self = RPGACE.modules.myDay, L = self.logic, ag = RPGACE.modules.authGate;
      if (!ag || !ag._apiSecret) return Promise.resolve(0);
      if (!force && Date.now() - (self._alarmSyncedAt || 0) < 600000) return Promise.resolve(0);
      self._alarmSyncedAt = Date.now();
      // WF-5: test rings load too (kind test:<ms>), so a test shows the same cover as a real alarm.
      return Promise.resolve(RPGACE.sb.select('myday_alarms', 'select=id,day,kind,at,status&or=(kind.eq.wake,kind.like.test*)&day=gte.' + L.addDays(L.iso(), -1))).then(function(rows) {
        self._alarms = Array.isArray(rows) ? rows : [];
        return 0;
      }).catch(function(e) { console.warn('[myDay] alarm load:', e && e.message); return 0; });
    },
    // Is the wake alarm ringing now? Pure.
    alarmDue: function(now, alarm, firstDone, st) {
      if (!alarm || alarm.status !== 'set' || firstDone) return false;
      if (st && st.alarm_on === false) return false;
      var at = new Date(alarm.at).getTime(), max = ((st && st.alarm_max_mins) || 120) * 60000;
      return now >= at && now < at + max;
    },
    _noteMoved: function(g) {
      var n = g && g.moved ? g.moved.length : 0;
      if (n) RPGACE.modules.myDay.ui.undoToast(g.moved);
    },
    // Today's blocks: shifts and schedule items, each with its get-ready +
    // travel block, plus labelled free gaps ("Prep" when the gap leads
    // straight into a travel block within the hour, otherwise "Leisure").
    timeline: function(shifts, sched, st, fromMin) {
      var L = RPGACE.modules.myDay.logic, blocks = L.segments({ shifts: shifts, sched: sched, st: st });
      var out = [], cursor = fromMin == null ? 7 * 60 : fromMin;
      blocks.forEach(function(bk) {
        if (bk.from - cursor >= 30) {
          out.push({ kind: 'gap', from: cursor, to: bk.from, label: bk.kind === 'travel' && bk.from - cursor <= 60 ? 'Prep' : 'Leisure' });
        }
        out.push(bk);
        cursor = Math.max(cursor, bk.to);
      });
      return out;
    },

    _write: function(r, status, extra) {
      var L = RPGACE.modules.myDay.logic, now = new Date().toISOString();
      extra = extra || {};
      var row = {
        quest_key: 'routine:' + r.id, quest_kind: 'routine', name: r.title, category: L.isTask(r) ? r.realm : r.area,
        quest_type: r.cadence, xp: status === 'completed' ? (extra.xp != null ? extra.xp : (r.xp || 0)) : 0,
        estimated_minutes: r.est_mins || null, actual_minutes: extra.actual == null ? null : extra.actual,
        started_at: extra.startedAt || null, completed_at: extra.at || now, status: status,
        source_table: L.isTask(r) ? 'realm_tasks' : 'routines', source_ref: String(r.id), description: extra.note || null,
      };
      return RPGACE.sb.secureWrite('quest_log', 'insert', row).then(function(data) {
        RPGACE.cache.clear('quest_log');
        // DR-5: the task's own done count / rest follow the tick.
        var rt = RPGACE.modules.realmTasks;
        if (status === 'completed' && L.isTask(r) && rt) rt.logic.markDone(r._task).catch(function() {});
        var saved = (Array.isArray(data) && data[0]) || row;
        RPGACE.modules.myDay._logs.unshift(saved);
        if (status === 'completed' && r.cadence === 'every_days') RPGACE.modules.myDay._choreDone[row.quest_key] = L.logDate(saved);
        return saved;
      });
    },
    tick: function(r, opts) {
      var self = RPGACE.modules.myDay;
      opts = opts || {};
      // MD2-9: "did the minimum" still counts for streaks, at half XP.
      if (opts.minimum) { opts.xp = Math.max(1, Math.ceil((r.xp || 0) / 2)); opts.note = 'minimum'; }
      return self.logic._write(r, 'completed', opts).then(function(row) {
        var gained = opts.xp != null ? opts.xp : r.xp;
        if (typeof addXP === 'function' && gained) { try { addXP(gained); } catch (e) {} }
        var qe = RPGACE.modules.questEngine;
        if (qe && qe.recordDuration && opts.actual != null) {
          qe.recordDuration('routine', String(r.id), r.title, r.est_mins, opts.actual).catch(function(e) { console.warn('[myDay] duration:', e.message); });
        }
        self.logic.followUp(r).catch(function(e) { console.warn('[myDay] follow-up:', e && e.message); });
        return row;
      });
    },
    // Oct 15 2026 (Alex: "then i hang clothes and the job is done, then on next
    // morning it is in with the morning routine"): ticking a matching chore adds
    // a one-off follow-up for tomorrow morning (once, never doubled).
    FOLLOW_UPS: [{ match: /laundry|washing/i, title: function(t) { return 'Put away ' + t; }, inDays: 1, part: 'morning', mins: 10 }],
    followUp: function(r) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var rule = L.FOLLOW_UPS.filter(function(f) { return f.match.test(r.title || ''); })[0];
      if (!rule || r.cadence === 'once') return Promise.resolve(null);
      var title = rule.title(r.title), due = L.addDays(L.iso(), rule.inDays);
      if ((self._routines || []).some(function(x) { return x.cadence === 'once' && x.title === title && x.due_date === due; })) return Promise.resolve(null);
      return L.save({ title: title, area: r.area || 'Chores', icon: '🧺', cadence: 'once', due_date: due, part_of_day: rule.part, est_mins: rule.mins, xp: 5 }).then(function() {
        RPGACE.utils.toast('🧺 "' + title + '" added to tomorrow morning', '#4caf82', 3000);
        return L.load();
      });
    },
    skip: function(r) { return RPGACE.modules.myDay.logic._write(r, 'skipped'); },
    undo: function(log) {
      var self = RPGACE.modules.myDay;
      return RPGACE.sb.secureWrite('quest_log', 'delete', null, 'id=eq.' + log.id).then(function() {
        RPGACE.cache.clear('quest_log');
        self._logs = self._logs.filter(function(l) { return l.id !== log.id; });
        // Recompute level/XP from the log itself rather than subtracting.
        var qe = RPGACE.modules.questEngine;
        if (log.xp && qe && qe._restoreBoardState) qe._restoreBoardState();
        // An undone chore tick may have been its newest one: re-read last-done.
        if (log.quest_type === 'every_days') return self.logic.load();
      });
    },
    clean: function(f) {
      var steps = Array.isArray(f.steps) ? f.steps : String(f.steps || '').split('\n');
      return {
        title: String(f.title || '').trim(), area: f.area || 'Other', icon: f.icon || null,
        cadence: f.cadence || 'daily', days: (f.days || []).map(Number).filter(function(n) { return n >= 1 && n <= 7; }),
        times_per_week: f.cadence === 'times_per_week' ? Math.max(1, Math.min(14, parseInt(f.times_per_week, 10) || 1)) : null,
        part_of_day: f.part_of_day || 'any', preferred_time: f.preferred_time || null,
        est_mins: Math.max(1, parseInt(f.est_mins, 10) || 15), xp: Math.max(0, Math.min(50, parseInt(f.xp, 10) || 0)),
        goal: String(f.goal || '').trim() || null,
        steps: steps.map(function(s) { return String(s).trim(); }).filter(Boolean),
        opens: f.opens || null, context: f.cadence === 'next_time' ? (f.context || 'shopping') : null,
        due_date: f.cadence === 'once' ? (f.due_date || null) : null,
        every_days: f.cadence === 'every_days' ? (parseInt(f.every_days, 10) || null) : null,
        last_done_before: f.cadence === 'every_days' ? (f.last_done_before || null) : null,
        // XP-7: one Mind routine can be the sleep routine (Lake rank: kept 21 of 28 days).
        is_sleep: f.area === 'Mind' && !!f.is_sleep,
        // MD2-9: the small version that still counts, and "after X" chaining.
        minimum: String(f.minimum || '').trim() || null,
        after_routine_id: f.after_routine_id || null,
      };
    },
    validate: function(row, id) {
      if (!row.title) return 'Give it a name.';
      if (row.after_routine_id) {
        // No loops: walking up from the chosen "after" routine must never reach this one.
        var all = RPGACE.modules.myDay._routines || [], cur = row.after_routine_id, guard = 0;
        while (cur && guard++ < 50) {
          if (id && cur === id) return 'That chain would loop back to this action.';
          var p = all.filter(function(x) { return x.id === cur; })[0];
          cur = p ? p.after_routine_id : null;
        }
      }
      if (row.cadence === 'weekly' && !row.days.length) return 'Pick at least one day.';
      if (row.cadence === 'once' && !row.due_date) return 'Pick the date.';
      if (row.cadence === 'every_days' && !(row.every_days >= 1 && row.every_days <= 365)) return 'Set the number of days (1–365).';
      return null;
    },
    save: function(form, id) {
      var self = RPGACE.modules.myDay, row = self.logic.clean(form), bad = self.logic.validate(row, id);
      if (bad) return Promise.reject(new Error(bad));
      row.updated_at = new Date().toISOString();
      // Only one sleep routine: clear the flag elsewhere first (a DB index enforces it too).
      var clear = row.is_sleep ? RPGACE.sb.secureWrite('routines', 'update', { is_sleep: false }, 'is_sleep=eq.true' + (id ? '&id=neq.' + id : '')) : Promise.resolve();
      // DR-5: an existing task-backed Action updates its realm task; a new
      // Action becomes a realm task, except the sleep routine (a bookend).
      var cur = id ? self.logic.byId(id) : null;
      var p = clear.then(function() {
        if (cur && self.logic.isTask(cur)) return self.logic.actionUpdate(cur, row);
        if (id) return RPGACE.sb.secureWrite('routines', 'update', row, 'id=eq.' + id);
        if (row.is_sleep) return RPGACE.sb.secureWrite('routines', 'insert', Object.assign({ sort: self._routines.length }, row));
        return self.logic.actionInsert(Object.assign({ realm: form.realm }, row));
      });
      return p.then(function() { RPGACE.cache.clear('routines'); });
    },
    remove: function(id) {
      var self = RPGACE.modules.myDay, cur = self.logic.byId(id);
      if (cur && self.logic.isTask(cur)) return RPGACE.sb.secureWrite('realm_tasks', 'update', { status: 'dropped' }, 'id=eq.' + id).then(function() { RPGACE.cache.clear('realm_tasks'); });
      return RPGACE.sb.secureWrite('routines', 'update', { active: false, updated_at: new Date().toISOString() }, 'id=eq.' + id)
        .then(function() { RPGACE.cache.clear('routines'); });
    },
    // Oracle "accept suggestions" lands as one-off routines due today.
    addOneOffs: function(items) {
      var self = RPGACE.modules.myDay, today = self.logic.iso();
      return Promise.all(items.map(function(it) {
        return self.logic.save({ title: it.name, area: 'Other', cadence: 'once', due_date: today, est_mins: 30, xp: Math.min(25, Math.max(5, Math.round((it.xp || 50) / 5))) });
      }));
    },
    // Timers and sub-step ticks are per-device conveniences.
    _ls: function(k, v) {
      try {
        if (v === undefined) return JSON.parse(localStorage.getItem('myday_' + k) || 'null');
        if (v === null) localStorage.removeItem('myday_' + k); else localStorage.setItem('myday_' + k, JSON.stringify(v));
      } catch (e) { return null; }
    },
    // ── MD2-9 habit design (Oct 14 2026) ────────────────────────────────
    // Alex picked: "Minimum + goal, Habit stacking, Never miss twice, Weekly
    // review" (records/2026-10/my_day_round2_paranoia_ffa_2026-10-12.txt).
    // The usual gap between doings, in days (null = no rhythm: once / next time).
    intervalDays: function(r) {
      if (r.cadence === 'daily') return 1;
      if (r.cadence === 'weekly') return 7 / Math.max(1, (r.days || []).length);
      if (r.cadence === 'times_per_week') return 7 / Math.max(1, r.times_per_week || 1);
      if (r.cadence === 'every_days') return Math.max(1, r.every_days || 1);
      return null;
    },
    lastDoneAny: function(r) {
      var L = RPGACE.modules.myDay.logic;
      if (r.cadence === 'every_days') return L.lastDone(r);
      var best = null;
      L.logsFor(r, RPGACE.modules.myDay._logs).forEach(function(l) { if (l.status === 'completed') { var d = L.logDate(l); if (!best || d > best) best = d; } });
      return best;
    },
    // Days since last done, coloured against the routine's own rhythm:
    // green well inside it (< 70%), yellow coming due, red past it.
    zone: function(r, today) {
      var L = RPGACE.modules.myDay.logic, iv = L.intervalDays(r);
      if (iv == null) return null;
      var last = L.lastDoneAny(r);
      if (!last) return { days: null, zone: null };
      var since = L.daysBetween(last, today);
      return { days: since, zone: L.zoneFor(since, iv) };
    },
    ZONE_DOT: { green: '🟢', yellow: '🟡', red: '🔴' },
    // Never miss twice: how many of the last due days (before today) went by
    // with nothing logged. A skip is a choice, not a miss. Capped at 2.
    missRun: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic, born = String(r.created_at || '').slice(0, 10);
      if (r.cadence === 'daily' || r.cadence === 'weekly') {
        var byDay = {};
        L.logsFor(r, logs).forEach(function(l) { byDay[L.logDate(l)] = 1; });
        var n = 0;
        for (var i = 0, d = L.addDays(today, -1); i < 21; i++, d = L.addDays(d, -1)) {
          if (born && d < born) break;
          if (!L.dueOn(r, d)) continue;
          if (byDay[d]) break;
          if (++n >= 2) break;
        }
        return n;
      }
      if (r.cadence === 'times_per_week') {
        var n2 = 0;
        for (var w = 1; w <= 2; w++) {
          var ws = L.addDays(L.weekStart(today), -7 * w), we = L.addDays(ws, 6);
          if (born && born > ws) break;
          var c = L.logsFor(r, logs).filter(function(l) { var x = L.logDate(l); return x >= ws && x <= we; }).length;
          if (c >= (r.times_per_week || 1)) break;
          n2++;
        }
        return n2;
      }
      return 0;
    },
    // Habit stacking: "after X, do Y". Y waits until X is ticked or skipped
    // today — but only when X is actually due today.
    chainParent: function(r) {
      if (!r || !r.after_routine_id) return null;
      return (RPGACE.modules.myDay._routines || []).filter(function(x) { return x.id === r.after_routine_id; })[0] || null;
    },
    chainChildren: function(r) {
      return (RPGACE.modules.myDay._routines || []).filter(function(x) { return x.after_routine_id === r.id; });
    },
    waitingOnChain: function(r, logs, today) {
      var L = RPGACE.modules.myDay.logic, p = L.chainParent(r);
      if (!p || !L.isDueToday(p, logs, today)) return false;
      return !L.todayLog(p, logs, today);
    },
    // Weekly review: Sunday from 17:00 (Alex: "Sunday evening"), with Monday
    // as a catch-up day for the week just gone. Returns that week's Monday.
    // MD-0: counts for the step strip + the what's-next list. Pure:
    // d = { today, hour, due, doneIds, blocks (planned chore_blocks), chores,
    //       reviewDue, nextRoutine }.
    homeModel: function(d) {
      var L = RPGACE.modules.myDay.logic;
      // Plan day plans today until 3pm, then tomorrow (planned the day before).
      var tomorrow = L.addDays(d.today, 1), ws = L.weekStart(d.today), we = L.addDays(ws, 6);
      var planDate = d.hour >= 15 ? tomorrow : d.today;
      var morning = d.due.filter(function(r) { return (r.part_of_day || 'any') === 'morning'; });
      var mDone = morning.filter(function(r) { return d.doneIds[String(r.id)]; }).length;
      var week = d.blocks.filter(function(b) { return b.block_date >= d.today && b.block_date <= we; });
      var tmr = d.blocks.filter(function(b) { return b.block_date === planDate; });
      var filled = tmr.filter(function(b) { return (b.items || []).length || (b.routine_ids || []).length; }).length;
      var todayB = d.blocks.filter(function(b) { return b.block_date === d.today; });
      var left = d.due.filter(function(r) { return r.cadence !== 'every_days' && !d.doneIds[String(r.id)]; }).length;
      var overdue = d.chores.filter(function(r) { return L.choreState(r, d.today).due; }).length;
      var plural = function(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
      var steps = {
        morning: morning.length ? mDone + ' / ' + morning.length + ' done' : 'Brief',
        week: week.length ? plural(week.length, 'block') : 'Not planned',
        day: (planDate === tomorrow ? 'Tmrw: ' : 'Today: ') + (tmr.length ? filled + '/' + tmr.length + ' filled' : 'none'),
        'do': left || todayB.length ? (left ? left + ' left' : '') + (left && todayB.length ? ' · ' : '') + (todayB.length ? plural(todayB.length, 'block') : '') : 'All done',
        review: d.reviewDue ? 'Week due' : (d.hour >= 19 ? 'Tonight' : 'Later')
      };
      var next = [];
      if (d.reviewDue) next.push({ go: 'weekly', icon: '📓', title: 'Weekly review', sub: '2 minutes: what went well, what slipped, one thing for next week', verb: 'Start' });
      if (d.hour >= 19 && !tmr.length) next.push({ go: 'day', icon: '📋', title: 'Plan tomorrow', sub: 'Nothing planned for tomorrow yet', verb: 'Plan' });
      if (!week.length) next.push({ go: 'week', icon: '🗓', title: 'Plan your week', sub: 'No blocks placed for the rest of this week', verb: 'Plan' });
      if (overdue) next.push({ go: 'chores', icon: '🧹', title: plural(overdue, 'chore') + ' due', sub: 'Tick them or fit them in a housekeeping block', verb: 'See' });
      if (left) next.push({ go: 'do', icon: '▶️', title: left + ' left today', sub: d.nextRoutine ? 'Next: ' + d.nextRoutine : 'Your actions for today', verb: 'Go' });
      return { steps: steps, next: next.slice(0, 4), tomorrow: tomorrow, planDate: planDate };
    },
    reviewTarget: function(now) {
      var L = RPGACE.modules.myDay.logic;
      now = now || new Date();
      var today = L.iso(now), d = L.dow(today);
      if (d === 7 && now.getHours() >= 17) return L.weekStart(today);
      if (d === 1) return L.addDays(today, -7);
      return null;
    },
    reviewDone: function(ws) {
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(false);
      return RPGACE.sb.select('journal', 'select=id&source=eq.weekly_review&review_on=eq.' + ws + '&limit=1')
        .then(function(r) { return Array.isArray(r) && r.length > 0; });
    },
    reviewSummary: function(ws) {
      var self = RPGACE.modules.myDay, L = self.logic, today = L.iso();
      var we = L.addDays(ws, 6), end = we < today ? we : today, logs = self._logs || [];
      var inWeek = function(l) { var d = L.logDate(l); return d >= ws && d <= end; };
      var done = logs.filter(function(l) { return l.status === 'completed' && inWeek(l); });
      var rows = (self._routines || []).filter(function(r) { return ['daily', 'weekly', 'times_per_week'].indexOf(r.cadence) !== -1; }).map(function(r) {
        var target = 0;
        if (r.cadence === 'times_per_week') target = r.times_per_week || 1;
        else for (var d = ws; d <= end; d = L.addDays(d, 1)) if (L.dueOn(r, d)) target++;
        var got = L.logsFor(r, logs).filter(function(l) { return l.status === 'completed' && inWeek(l); }).length;
        return { r: r, target: target, got: Math.min(got, target) };
      }).filter(function(x) { return x.target > 0; });
      return {
        ws: ws, end: end, ticks: done.length,
        minimum: done.filter(function(l) { return l.description === 'minimum'; }).length,
        chores: done.filter(function(l) { return l.quest_type === 'every_days'; }).length,
        xp: done.reduce(function(a, l) { return a + (Number(l.xp) || 0); }, 0),
        kept: rows.filter(function(x) { return x.got >= x.target; }),
        slipped: rows.filter(function(x) { return x.got < x.target; }),
        best: (self._routines || []).map(function(r) { return { r: r, s: L.streak(r, logs, end) }; })
          .filter(function(x) { return x.s > 1; }).sort(function(a, b) { return b.s - a.s; }).slice(0, 3),
      };
    },
    reviewText: function(s, answers) {
      var line = function(x) { return '- ' + x.r.title + ' (' + x.got + '/' + x.target + ')'; };
      var out = ['Week of ' + s.ws + ' to ' + s.end, '',
        s.ticks + ' ticks (' + s.minimum + ' at minimum), ' + s.chores + ' chores, +' + s.xp + ' XP.'];
      if (s.kept.length) out.push('', 'Kept:', s.kept.map(line).join('\n'));
      if (s.slipped.length) out.push('', 'Slipped:', s.slipped.map(line).join('\n'));
      if (s.best.length) out.push('', 'Best streaks: ' + s.best.map(function(x) { return x.r.title + ' ' + x.s; }).join(', '));
      if (s.evenings && s.evenings.length) out.push('', 'Evenings:', s.evenings.map(function(l) { return '- ' + l; }).join('\n'));
      if (s.misses) out.push('', 'Why blocks got missed: ' + s.misses);
      if (s.doing && s.doing.n) out.push('', 'Doing Now:', RPGACE.modules.doingNow.logic.weekLines(s.doing).map(function(l) { return '- ' + l; }).join('\n'));
      if (s.realms) {
        var pl = RPGACE.modules.realmBrief.logic.periodLines(s.realms);
        if (pl.lines.length) out.push('', 'By realm:', pl.lines.map(function(l) { return '- ' + l; }).join('\n'));
        if (pl.quiet.length) out.push('Quiet this week: ' + pl.quiet.join(', '));
      }
      [['What went well', answers.well], ['What slipped and why', answers.slip], ['One thing for next week', answers.next]].forEach(function(q) {
        if (String(q[1] || '').trim()) out.push('', q[0] + ':', String(q[1]).trim());
      });
      return out.join('\n');
    },
    saveReview: function(ws, text) {
      var L = RPGACE.modules.myDay.logic;
      return RPGACE.sb.secureWrite('journal', 'insert', {
        title: '📓 Weekly review — w/c ' + new Date(ws + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        content: text, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        source: 'weekly_review', entry_type: 'weekly_review', review_on: ws, created_at: new Date().toISOString(),
      }).then(function() { RPGACE.cache.clear('journal'); RPGACE.modules.myDay._lastReview = ws; return L; });
    },
    // ── MD2-8 days-since trackers + MD2-11 cut-back trackers (Oct 14 2026) ──
    // Alex: "Last beat made, Last gym session, Last post, Last call to family"
    // + "i need more too". Read from the real source tables, never typed in.
    zoneFor: function(since, iv) {
      if (since == null || !iv) return null;
      return since > Math.ceil(iv) ? 'red' : since >= iv * 0.7 ? 'yellow' : 'green';
    },
    trackerDays: function(key) {
      var self = RPGACE.modules.myDay, t = self.TRACKERS.filter(function(x) { return x.key === key; })[0];
      var o = self._settings && self._settings.tracker_days;
      return (o && o[key]) || (t ? t.days : 7);
    },
    loadTrackers: function() {
      var self = RPGACE.modules.myDay, L = self.logic, sb = RPGACE.sb, tp = RPGACE.modules.tripPlans;
      var one = function(t, q, col) {
        return sb.select(t, q).then(function(r) { var x = Array.isArray(r) && r[0]; return x && x[col] ? L.iso(new Date(String(x[col]).length === 10 ? x[col] + 'T12:00:00' : x[col])) : null; }).catch(function() { return null; });
      };
      var priv = tp && tp.logic.signedIn && tp.logic.signedIn();
      var since14 = L.addDays(L.iso(), -13);
      return Promise.all([
        one('gym_sessions', 'select=performed_on&order=performed_on.desc&limit=1', 'performed_on'),
        one('planned_cooks', 'select=scheduled_at&status=eq.cooked&order=scheduled_at.desc.nullslast&limit=1', 'scheduled_at'),
        one('quest_log', 'select=completed_at&status=eq.completed&category=in.(Learning,scholar)&order=completed_at.desc&limit=1', 'completed_at'),
        one('content_productions', 'select=created_at&content_type=eq.music_video&order=created_at.desc&limit=1', 'created_at'),
        one('content_productions', 'select=posted_at&posted_at=not.is.null&order=posted_at.desc&limit=1', 'posted_at'),
        one('journal', 'select=created_at&source=in.(manual,decision_journal,weekly_review)&order=created_at.desc&limit=1', 'created_at'),
        priv ? tp.logic.read('people', 'select=id,name,relation,last_spoke,reach_every_days&order=name.asc').catch(function() { return []; }) : Promise.resolve([]),
        priv ? tp.logic.read('cutback_items', 'select=*&active=eq.true&order=sort.asc,created_at.asc').catch(function() { return []; }) : Promise.resolve([]),
        priv ? tp.logic.read('cutback_log', 'select=*&day=gte.' + since14).catch(function() { return []; }) : Promise.resolve([]),
      ]).then(function(r) {
        self._trk = {
          dates: { gym: r[0], cook: r[1], read: r[2], beat: r[3], post: r[4], journal: r[5] },
          people: Array.isArray(r[6]) ? r[6] : [], cut: Array.isArray(r[7]) ? r[7] : [], cutLog: Array.isArray(r[8]) ? r[8] : [],
          priv: !!priv,
        };
        return self._trk;
      });
    },
    trackerRows: function(today) {
      var self = RPGACE.modules.myDay, L = self.logic, t = self._trk;
      if (!t) return [];
      return self.TRACKERS.map(function(x) {
        var last = t.dates[x.key], iv = L.trackerDays(x.key), since = last ? L.daysBetween(last, today) : null;
        return { key: x.key, icon: x.icon, label: x.label, opens: x.opens, last: last, since: since, every: iv, zone: L.zoneFor(since, iv) };
      });
    },
    // People: their own "remind me every N days" (14 when not set).
    peopleRows: function(today) {
      var self = RPGACE.modules.myDay, L = self.logic, t = self._trk;
      if (!t) return [];
      return t.people.map(function(p) {
        var iv = p.reach_every_days || 14, since = p.last_spoke ? L.daysBetween(p.last_spoke, today) : null;
        return { p: p, since: since, every: iv, zone: since == null ? 'red' : L.zoneFor(since, iv) };
      }).sort(function(a, b) { var o = { red: 0, yellow: 1, green: 2 }; return (o[a.zone] - o[b.zone]) || ((b.since || 999) - (a.since || 999)); });
    },
    saveTrackerDays: function(key, days) {
      var self = RPGACE.modules.myDay, n = Math.round(Number(days));
      if (!(n >= 1 && n <= 365)) return Promise.reject(new Error('Pick 1–365 days.'));
      var map = Object.assign({}, (self._settings && self._settings.tracker_days) || {});
      map[key] = n;
      return RPGACE.sb.secureWrite('myday_settings', 'insert', { id: 1, tracker_days: map, updated_at: new Date().toISOString() }, null, 'id').then(function() {
        RPGACE.cache.clear('myday_settings');
        self._settings = Object.assign({}, self._settings || {}, { tracker_days: map });
      });
    },
    spokeToday: function(personId) {
      var self = RPGACE.modules.myDay, today = self.logic.iso();
      return RPGACE.modules.tripPlans.logic.updatePerson(personId, { last_spoke: today }).then(function() {
        (self._trk ? self._trk.people : []).forEach(function(p) { if (p.id === personId) p.last_spoke = today; });
      });
    },
    // MD2-7 (Oct 14 2026): "morning brief as suggestions and reason for it".
    // Up to 5 picks from data already loaded, most pressing first, each with
    // the reason in plain words. No AI here; Morning Brief passes them on.
    doToday: function(today) {
      var self = RPGACE.modules.myDay, L = self.logic, picks = [], logs = self._logs || [], hit = [];
      (self._routines || []).forEach(function(r) {
        if (!L.isDueToday(r, logs, today) || L.todayLog(r, logs, today)) return;
        var m = L.missRun(r, logs, today);
        if (m >= 2) { hit.push(r); picks.push({ score: 4, text: r.title, reason: 'missed twice' + (r.minimum ? ' — the minimum (' + r.minimum + ') is enough today' : ' — a small version still counts') }); }
        else if (m === 1) { hit.push(r); picks.push({ score: 2.5, text: r.title, reason: 'missed last time — don\'t miss twice' }); }
      });
      // A red tracker already covered by a picked routine (same tool or area) isn't repeated.
      L.trackerRows(today).filter(function(x) { return x.zone === 'red'; }).forEach(function(x) {
        var t = self.TRACKERS.filter(function(k) { return k.key === x.key; })[0] || {};
        if (hit.some(function(r) { return (r.opens && r.opens === t.opens) || (t.area && r.area === t.area); })) return;
        picks.push({ score: 3 + (x.since == null ? 0 : x.since / x.every), text: x.label.replace(/^Last /, '').replace(/^./, function(c) { return c.toUpperCase(); }),
          reason: x.since == null ? 'nothing logged yet' : x.since + ' days since, you aim for every ' + x.every });
      });
      L.chores(self._routines).map(function(r) { return { r: r, st: L.choreState(r, today) }; })
        .filter(function(x) { return x.st.overdue > 0; }).sort(function(a, b) { return b.st.overdue - a.st.overdue; }).slice(0, 2)
        .forEach(function(x) { picks.push({ score: 2 + x.st.overdue / Math.max(1, x.r.every_days || 1), text: x.r.title, reason: x.st.overdue + ' day' + (x.st.overdue === 1 ? '' : 's') + ' overdue' }); });
      L.peopleRows(today).filter(function(x) { return x.zone === 'red'; }).slice(0, 2).forEach(function(x) {
        picks.push({ score: 2, text: 'Catch up with ' + x.p.name, reason: x.since == null ? 'not logged yet' : x.since + ' days since you talked' });
      });
      var seen = {};
      return picks.sort(function(a, b) { return b.score - a.score; })
        .filter(function(x) { if (seen[x.text]) return false; seen[x.text] = 1; return true; }).slice(0, 5);
    },
    pushSupported: function() {
      return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window.PushManager !== 'undefined' && typeof window.Notification !== 'undefined';
    },
    pushState: function() {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (!L.pushSupported()) return Promise.resolve(self._push = 'unsupported');
      if (Notification.permission === 'denied') return Promise.resolve(self._push = 'blocked');
      return navigator.serviceWorker.getRegistration().then(function(reg) {
        return reg ? reg.pushManager.getSubscription() : null;
      }).then(function(sub) { return (self._push = sub ? 'on' : 'off'); }).catch(function() { return (self._push = 'off'); });
    },
    _b64ToBytes: function(b64) {
      var pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
      var out = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out;
    },
    enablePush: function() {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (!L.pushSupported()) return Promise.reject(new Error('This browser can\'t do phone alerts. On iPhone, add RPGACE to the Home Screen first.'));
      return Notification.requestPermission().then(function(perm) {
        if (perm !== 'granted') { self._push = perm === 'denied' ? 'blocked' : 'off'; throw new Error('Alerts not allowed — allow notifications for RPGACE in your phone settings.'); }
        return Promise.all([fetch(self.PUSH_FN + '?op=key').then(function(r) { return r.json(); }), navigator.serviceWorker.ready]);
      }).then(function(x) {
        if (!x[0] || !x[0].publicKey) throw new Error('Could not get the alert key');
        var reg = x[1];
        return reg.pushManager.getSubscription().then(function(old) {
          return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: L._b64ToBytes(x[0].publicKey) });
        }).then(function(sub) {
          var j = sub.toJSON();
          return RPGACE.sb.secureWrite('push_subscriptions', 'insert', { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) }, null, 'endpoint')
            .then(function() {
              self._push = 'on';
              return reg.showNotification('🔔 Alerts are on', { body: 'Morning picks at 8:00 and your weekly review on Sunday at 18:00.', icon: '/icons/icon-192.png', tag: 'rpgace-alerts-on' });
            });
        });
      });
    },
    disablePush: function() {
      var self = RPGACE.modules.myDay;
      return navigator.serviceWorker.getRegistration().then(function(reg) { return reg ? reg.pushManager.getSubscription() : null; }).then(function(sub) {
        if (!sub) { self._push = 'off'; return; }
        var ep = sub.endpoint;
        return sub.unsubscribe().then(function() {
          self._push = 'off';
          return RPGACE.sb.secureWrite('push_subscriptions', 'delete', null, 'endpoint=eq.' + encodeURIComponent(ep)).catch(function() {});
        });
      });
    },
    // Cut-back counters: one cutback_log row per item per day (upsert).
    cutCount: function(item, day) {
      var t = RPGACE.modules.myDay._trk, row = (t ? t.cutLog : []).filter(function(l) { return l.item_id === item.id && l.day === day; })[0];
      return row ? row.count : null;
    },
    cutStats: function(item, today) {
      var L = RPGACE.modules.myDay.logic, days = [];
      for (var i = 6; i >= 0; i--) { var d = L.addDays(today, -i); days.push({ day: d, count: L.cutCount(item, d) }); }
      var logged = days.filter(function(x) { return x.count != null; });
      return {
        today: L.cutCount(item, today), days: days,
        under: logged.filter(function(x) { return x.count <= item.target; }).length, logged: logged.length,
        avg: logged.length ? Math.round(logged.reduce(function(a, x) { return a + x.count; }, 0) / logged.length * 10) / 10 : null,
      };
    },
    cutSet: function(item, day, count) {
      var self = RPGACE.modules.myDay, n = Math.max(0, Math.round(count));
      var row = { item_id: item.id, day: day, count: n, updated_at: new Date().toISOString() };
      return RPGACE.sb.secureWrite('cutback_log', 'insert', row, null, 'item_id,day').then(function() {
        var t = self._trk;
        if (!t) return;
        t.cutLog = t.cutLog.filter(function(l) { return !(l.item_id === item.id && l.day === day); });
        t.cutLog.push(row);
      });
    },
    cutSaveItem: function(f, id) {
      var self = RPGACE.modules.myDay, int = function(v) { var n = parseInt(v, 10); return isNaN(n) || n < 0 ? null : n; };
      var row = { name: String(f.name || '').trim(), icon: f.icon || null, unit: String(f.unit || '').trim() || null, baseline: int(f.baseline), target: int(f.target) };
      if (!row.name) return Promise.reject(new Error('Give it a name.'));
      if (row.target == null) return Promise.reject(new Error('Set a daily target (0 or more).'));
      var p = id ? RPGACE.sb.secureWrite('cutback_items', 'update', row, 'id=eq.' + id)
        : RPGACE.sb.secureWrite('cutback_items', 'insert', Object.assign({ sort: self._trk ? self._trk.cut.length : 0 }, row));
      return p.then(function() { return self.logic.loadTrackers(); });
    },
    cutRemove: function(id) {
      return RPGACE.sb.secureWrite('cutback_items', 'update', { active: false }, 'id=eq.' + id).then(function() { return RPGACE.modules.myDay.logic.loadTrackers(); });
    },
    cadenceText: function(r) {
      var self = RPGACE.modules.myDay;
      if (r.cadence === 'daily') return 'Every day';
      if (r.cadence === 'weekly') return (r.days || []).map(function(d) { return self.DAYS[d - 1]; }).join(', ');
      if (r.cadence === 'times_per_week') return (r.times_per_week || 1) + '× a week';
      if (r.cadence === 'once') return 'On ' + (r.due_date || '?');
      if (r.cadence === 'every_days') return (r.every_days || 1) === 1 ? 'Every day, from last done' : 'Every ' + r.every_days + ' days, from last done';
      return self.CONTEXTS[r.context] || 'Next time';
    },
  },

  ui: {
    _esc: function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
    _btn: function(label, kind) { return RPGACE.kit.btn(label, kind); },   // CK-6: one copy in RPGACE.kit
    _openTool: function(key) {
      var dd = RPGACE.modules.dashDeck;
      // Study is a page, not a dashboard card.
      if (key === 'study') { var sh = RPGACE.modules.studyHub; if (sh) sh.open(); return; }
      if (key && dd && dd._navOpenCard) dd._navOpenCard(key);
    },

    _homeCss: function() {
      if (document.getElementById('md-home-css')) return;
      var st = document.createElement('style'); st.id = 'md-home-css';
      st.textContent = '.md-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:4px 0 12px}' +
        '.md-step{display:flex;flex-direction:column;align-items:center;gap:2px;min-height:64px;padding:8px 4px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--text);font-family:Rajdhani,sans-serif;cursor:pointer;text-align:center}' +
        '.md-step:hover{border-color:var(--orange)}.md-step.md-now{border-color:var(--orange);background:color-mix(in srgb,var(--orange) 12%,var(--panel))}' +
        '.md-step-ic{font-size:18px;line-height:1}.md-step-nm{font-size:13px;font-weight:700;line-height:1.1}' +
        '.md-step-ct{font-size:11px;color:var(--muted);line-height:1.15;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}' +
        '.md-next{display:flex;flex-direction:column;gap:6px;margin:0 0 14px}' +
        '.md-next-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--panel)}' +
        '.md-next-tx{flex:1;min-width:0}.md-next-t{font-weight:700;font-size:14px}.md-next-s{font-size:12px;color:var(--muted)}' +
        '.md-next-go{min-height:40px;padding:6px 12px;border-radius:8px;border:1px solid var(--orange);background:none;color:var(--text);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}' +
        '.md-lbl{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:2px 0 6px}';
      document.head.appendChild(st);
    },
    // Which step is "now" by the clock (evening = review, late = plan day).
    _nowStep: function(hour) { return hour < 11 ? 'morning' : hour >= 21 ? 'day' : hour >= 19 ? 'review' : 'do'; },
    // MD-0: one place every step / next row goes to. Steps not rebuilt yet
    // open today's screen for it (MD-1..6 replace them one by one).
    goStep: function(key, m) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      if (key === 'morning') { U.openMorning(); return; }
      if (key === 'week') { U.openWeekPlanner(); return; }
      if (key === 'day') { U.openPlan(m && m.planDate ? m.planDate : L.iso()); return; }
      if (key === 'weekly') { U.openReview(L.reviewTarget(new Date()) || undefined); return; }
      if (key === 'review') {
        // MD-6: the evening review (it links on to the weekly one when that is due).
        U.openEvening();
        return;
      }
      var el = document.getElementById(key === 'chores' ? 'myday-chores' : 'myday-do');
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    renderHome: function(panel, m, hour) {
      var self = RPGACE.modules.myDay, U = self.ui;
      U._homeCss();
      var now = U._nowStep(hour);
      var strip = document.createElement('div'); strip.className = 'md-steps'; strip.id = 'myday-steps';
      self.STEPS.forEach(function(st) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'md-step' + (st.key === now ? ' md-now' : '');
        b.dataset.step = st.key;
        b.id = st.key === 'week' ? 'myday-weeks' : st.key === 'day' ? 'myday-plan' : 'myday-step-' + st.key;
        b.innerHTML = '<span class="md-step-ic" aria-hidden="true">' + st.icon + '</span><span class="md-step-nm">' + U._esc(st.name) + '</span><span class="md-step-ct">' + U._esc(m.steps[st.key]) + '</span>';
        b.onclick = function() { U.goStep(st.key, m); };
        strip.appendChild(b);
      });
      panel.appendChild(strip);
      if (!m.next.length) return;
      var lbl = document.createElement('div'); lbl.className = 'md-lbl'; lbl.textContent = 'What\'s next';
      panel.appendChild(lbl);
      var list = document.createElement('div'); list.className = 'md-next'; list.id = 'myday-next';
      m.next.forEach(function(n) {
        var row = document.createElement('div'); row.className = 'md-next-row'; row.dataset.go = n.go;
        if (n.go === 'weekly') row.id = 'myday-review-card';
        row.innerHTML = '<div class="md-next-tx"><div class="md-next-t">' + U._esc(n.icon + ' ' + n.title) + '</div><div class="md-next-s">' + U._esc(n.sub) + '</div></div>';
        var g = document.createElement('button'); g.type = 'button'; g.className = 'md-next-go'; g.textContent = n.verb;
        if (n.go === 'weekly') g.id = 'myday-review-open';
        g.onclick = function() { U.goStep(n.go, m); };
        row.appendChild(g); list.appendChild(row);
      });
      panel.appendChild(list);
    },

    inject: function() {
      var self = RPGACE.modules.myDay;
      var page = document.getElementById('page-quests');
      // Boot can run before config.init() sets RPGACE.sb (same guard as
      // dashDeck._refreshGlance); page:show re-runs this once it exists.
      if (!page || !RPGACE.sb || !RPGACE.sb.select) return Promise.resolve();
      var panel = document.getElementById('myday-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'myday-panel';
        panel.style.cssText = 'margin-bottom:28px;';
        page.insertBefore(panel, page.firstChild);
      }
      return Promise.all([self.logic.load(), self.logic.loadTimings(), self.logic.loadTrackers().catch(function() { return null; })]).then(function() { self.ui.render(); })
        .catch(function(e) {
          panel.innerHTML = '';
          var m = document.createElement('div');
          m.style.cssText = 'color:#CC4A4A;font-size:13px;';
          m.textContent = 'My Day could not load: ' + (e.message || e);
          panel.appendChild(m);
        });
    },

    render: function() {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var panel = document.getElementById('myday-panel');
      if (!panel) return;
      // MDX-1: the decluttered home (☰ → Classic My Day brings this one back).
      if (self.ui._mdxOn()) { self.ui.renderMdx(panel); try { RPGACE.hooks.fire('myday:rendered', panel); } catch (e) {} return; }
      var pgq = document.getElementById('page-quests'); if (pgq) pgq.classList.remove('mdx-on', 'mdx-more');
      var today = L.iso(), routines = self._routines, logs = self._logs;
      var due = L.today(routines, logs, today);
      var doneN = due.filter(function(r) { var l = L.todayLog(r, logs, today); return l && l.status === 'completed'; }).length;
      var xpToday = logs.filter(function(l) { return L.logDate(l) === today && l.status === 'completed'; }).reduce(function(a, l) { return a + (Number(l.xp) || 0); }, 0);
      panel.innerHTML = '';

      // MD-0: ← Back / 🏠 row, then the header (date, done, XP, shift).
      panel.appendChild(Object.assign(RPGACE.areaNav.bar('myday', { isHub: true }), { id: 'myday-bar' }));
      var back = self.ui._btn('✨ New My Day', 'primary'); back.id = 'mdx-back-new'; back.style.marginBottom = '8px';
      back.onclick = function() { try { localStorage.removeItem('md_classic'); } catch (e) {} self.ui.render(); };
      panel.appendChild(back);
      var shifts = [];
      try { shifts = typeof getShiftsForDate === 'function' ? getShiftsForDate(today) : []; } catch (e) {}
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;';
      head.innerHTML = '<div class="section-title" style="margin:0;">☀️ My Day</div><div style="font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;">' +
        esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) +
        (due.length ? ' · ' + doneN + ' / ' + due.length + ' done · +' + xpToday + ' XP' : '') + '</div>';
      panel.appendChild(head);
      var sh = document.createElement('div'); sh.id = 'myday-shift';
      sh.style.cssText = 'font-size:13px;color:var(--text);margin-bottom:8px;';
      sh.textContent = shifts.length ? '🧑‍🍳 Shift today: ' + shifts.map(function(s) { return s.start + '–' + s.end + (s.role ? ' (' + s.role + ')' : ''); }).join(', ') : '🌴 No shift today';
      panel.appendChild(sh);

      // MD-0: the five steps + what's next.
      var doneIds = {};
      due.forEach(function(r) { var l = L.todayLog(r, logs, today); if (l && l.status === 'completed') doneIds[String(r.id)] = 1; });
      var nextR = due.filter(function(r) { return r.cadence !== 'every_days' && !doneIds[String(r.id)]; })
        .sort(function(a, b) { return (L.toMin(a.preferred_time) || 9999) - (L.toMin(b.preferred_time) || 9999); })[0];
      var hour = new Date().getHours();
      var model = L.homeModel({ today: today, hour: hour, due: due, doneIds: doneIds, blocks: self._choreBlocks || [],
        chores: L.chores(routines), reviewDue: !!(L.reviewTarget(new Date()) && routines.length && self._lastReview !== L.reviewTarget(new Date())),
        nextRoutine: nextR ? nextR.title : null });
      self._home = model;
      self.ui.renderHome(panel, model, hour);

      // ▶️ Do - today, straight under the steps.
      var doH = document.createElement('div'); doH.id = 'myday-do'; doH.className = 'md-lbl'; doH.textContent = '▶️ Do — today';
      panel.appendChild(doH);
      // Oct 16 2026 DN-1: Doing Now card sits at the top of Do.
      if (RPGACE.modules.doingNow) { try { RPGACE.modules.doingNow.ui.mount(panel); } catch (e) { console.warn('[myDay] doingNow card', e); } }
      self.ui.renderTimeline(panel, today, shifts);
      // MD-1: the 🌅 Morning block (its tasks tick here, not again below).
      var beDay = L.dayParts(today).be, beIds = {};
      beDay.morning.tasks.concat(beDay.night.tasks).forEach(function(r) { beIds[String(r.id)] = 1; });
      self._beIds = beIds;
      panel.appendChild(self.ui.bookendCard('morning', beDay, today));
      if (due.length) {
        var bar = document.createElement('div');
        bar.style.cssText = 'height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden;margin-bottom:12px;';
        bar.innerHTML = '<div style="height:100%;width:' + Math.round(doneN / due.length * 100) + '%;background:var(--gold);"></div>';
        panel.appendChild(bar);
      }

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';
      // MD-0: Plan my day / Plan weeks now live in the step strip (same ids).
      var addB = self.ui._btn('+ Add actions', '');
      addB.id = 'myday-add';
      addB.onclick = function() { self.ui.openPicker(); };
      var manB = self.ui._btn('⚙ Manage', '');
      manB.onclick = function() { self.ui.openManage(); };
      actions.appendChild(addB); actions.appendChild(manB);
      panel.appendChild(actions);

      // MD2-9: the Sunday-evening weekly review is a what's-next row (MD-0),
      // same ids (myday-review-card / myday-review-open).

      if (!routines.length) {
        var empty = document.createElement('div');
        empty.style.cssText = 'padding:18px;border:1px dashed var(--border);border-radius:10px;color:var(--muted);font-size:14px;line-height:1.5;';
        empty.textContent = 'Nothing picked yet. Tap + Add actions to choose from ideas built on RPGACE\'s own tools (cooking, gym, Bookworm, the pipeline…), then set the days, time and goal for each.';
        panel.appendChild(empty);
        if (RPGACE.modules.healthBody) RPGACE.modules.healthBody.ui.myDayCard(panel);
        if (RPGACE.modules.postingHub) RPGACE.modules.postingHub.ui.myDayLine(panel);
        if (RPGACE.modules.sellingHub) RPGACE.modules.sellingHub.ui.myDayLine(panel);
        self.ui.renderTrackers(panel, today);
        self.ui.alertsRow(panel);
        return;
      }

      var lifeBlocks = L.lifeBlocksOn(today).sort(function(a, b) { return a.start_time < b.start_time ? -1 : 1; });
      if (lifeBlocks.length) {
        self.ui._group(panel, '🧱 Blocks today');
        lifeBlocks.forEach(function(b) { panel.appendChild(self.ui.lifeBlockCard(b, today)); });
      }

      var missedPlans = L.missedPlans(today);
      if (missedPlans.length) {
        self.ui._group(panel, '📅 Planned but not done');
        missedPlans.forEach(function(m) { panel.appendChild(self.ui.missedPlanRow(m, today)); });
      }

      var missed = [];
      routines.forEach(function(r) { L.missedThisWeek(r, logs, today).forEach(function(d) { missed.push({ r: r, day: d }); }); });
      if (missed.length) {
        self.ui._group(panel, '↩ Missed earlier this week');
        missed.forEach(function(m) { panel.appendChild(self.ui.row(m.r, today, m.day)); });
      }

      self.PARTS.forEach(function(p) {
        var items = due.filter(function(r) { return r.cadence !== 'every_days' && (r.part_of_day || 'any') === p.key && !L.waitingOnChain(r, logs, today) && !(self._beIds || {})[String(r.id)]; })
          .sort(function(a, b) { return (L.toMin(a.preferred_time) || 9999) - (L.toMin(b.preferred_time) || 9999); });
        if (!items.length) return;
        self.ui._group(panel, p.label);
        items.forEach(function(r) { panel.appendChild(self.ui.row(r, today)); });
      });
      // MD-1: the 🌙 Night block closes the day's list.
      panel.appendChild(self.ui.bookendCard('night', beDay, today));
      if (!due.length) {
        var free = document.createElement('div');
        free.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:10px;';
        free.textContent = 'Nothing due today.';
        panel.appendChild(free);
      }

      self.ui.renderChores(panel, today);
      if (RPGACE.modules.healthBody) RPGACE.modules.healthBody.ui.myDayCard(panel);
      // PC-5: this week's posts against the target.
      if (RPGACE.modules.postingHub) RPGACE.modules.postingHub.ui.myDayLine(panel);
      if (RPGACE.modules.sellingHub) RPGACE.modules.sellingHub.ui.myDayLine(panel);
      self.ui.renderTrackers(panel, today);

      var next = routines.filter(function(r) { return r.cadence === 'next_time'; });
      Object.keys(self.CONTEXTS).forEach(function(ctx) {
        var items = next.filter(function(r) { return (r.context || 'shopping') === ctx; });
        if (!items.length) return;
        self.ui._group(panel, '🧾 ' + self.CONTEXTS[ctx]);
        items.forEach(function(r) { panel.appendChild(self.ui.row(r, today)); });
      });

      var sum = L.weekSummary(routines, logs, today);
      if (sum.planned) {
        var s = document.createElement('div');
        s.style.cssText = 'font-size:13px;color:var(--muted);margin-top:12px;font-variant-numeric:tabular-nums;';
        s.textContent = 'This week so far: ' + sum.done + ' of ' + sum.planned + ' planned done.';
        panel.appendChild(s);
      }
      self.ui.alertsRow(panel);
      self.ui._startTicker();
      // MD-1: keep the next 7 days' wake alarms in step with the plan.
      L.syncAlarms().then(function() { self.ui._alarmCheck(); });
      // MD-7: a block opened from the Daily Schedule gets highlighted.
      if (self._flash) self.ui._applyFlash();
    },

    // MD2-4: today's shifts + schedule with get-ready/travel blocks and
    // labelled gaps, from now onwards.
    renderTimeline: function(panel, today, shifts) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var sched = [];
      try { sched = (RPGACE.DB.get('sched') || []).filter(function(x) { return x && x.date === today; }); } catch (e) {}
      if (!(shifts || []).length && !sched.length) return;
      var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
      var rows = L.timeline(shifts, sched, self._settings, Math.max(7 * 60, Math.floor(nowMin / 5) * 5))
        .filter(function(b) { return b.to > nowMin; });
      if (!rows.length) return;
      var box = document.createElement('div');
      box.id = 'myday-timeline';
      box.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:8px 12px;margin-bottom:12px;';
      var icons = { travel: '🚶', shift: '🧑‍🍳', item: '📌', gap: '' };
      box.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">Rest of today</div>' +
        rows.map(function(b) {
          var gap = b.kind === 'gap', col = gap ? (b.label === 'Prep' ? '#e0a84c' : 'var(--muted)') : b.kind === 'travel' ? 'var(--muted)' : 'var(--text)';
          return '<div class="myday-tl myday-tl-' + b.kind + '" style="display:flex;gap:10px;font-size:13px;padding:3px 0;color:' + col + ';' + (gap ? 'font-style:italic;' : '') + '">' +
            '<span style="font-variant-numeric:tabular-nums;min-width:92px;">' + L.fmtMin(b.from) + '–' + L.fmtMin(b.to) + '</span>' +
            '<span>' + (icons[b.kind] ? icons[b.kind] + ' ' : '') + esc(gap ? b.label + ' (' + (b.to - b.from) + ' min free)' : b.label) + '</span></div>';
        }).join('');
      panel.appendChild(box);
    },

    // ── MDX (Oct 21 2026, plan "My Day Declutter & Drag", MDX-0..7) ──────
    // Alex: "i dont like how clunky it is. the system doesnt have the drag
    // feature i wanted" -> one timeline, drawn one way, used by the My Day
    // home, Plan a day, the week view and the Daily Schedule. Logic is the
    // existing engine (segments / dragLimits / clampDrag / commitDrag /
    // guard / push rule / undo) - this is only what you see and touch.
    _mdxOn: function() { try { return localStorage.getItem('md_classic') !== '1'; } catch (e) { return true; } },
    _mdxCss: function() {
      if (document.getElementById('mdx-css')) return;
      var st = document.createElement('style'); st.id = 'mdx-css';
      st.textContent =
        '#page-quests.mdx-on:not(.mdx-more)>*:not(#myday-panel){display:none!important}' +
        '.mdx-head{display:flex;align-items:center;gap:10px;margin:2px 0 8px}.mdx-head h2{margin:0;font-size:20px;font-family:Rajdhani,sans-serif;color:var(--text)}' +
        '.mdx-sub{font-size:14px;color:var(--muted);font-variant-numeric:tabular-nums}.mdx-grow{flex:1;min-width:0}' +
        '.mdx-ib{min-width:44px;min-height:44px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:18px;cursor:pointer;font-family:inherit}' +
        '.mdx-card{border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:12px;margin-bottom:12px}' +
        '.mdx-nn{display:grid;gap:8px}.mdx-nn-row{display:flex;align-items:center;gap:10px}.mdx-nn-k{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);min-width:42px}' +
        '.mdx-nn-t{flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--text)}.mdx-nn-s{display:block;font-size:13px;font-weight:400;color:var(--muted)}' +
        '.mdx-btn{min-height:44px;padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:none;color:var(--text);font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;white-space:nowrap}' +
        '.mdx-btn.pri{background:var(--gold);border-color:var(--gold);color:#111}.mdx-btn:disabled{opacity:.5;cursor:default}' +
        '.mdx-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px}.mdx-seg{display:inline-flex;border:1px solid var(--border);border-radius:10px;overflow:hidden}' +
        '.mdx-seg button{min-height:40px;padding:6px 12px;background:none;border:0;color:var(--muted);font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}.mdx-seg button[aria-pressed=true]{background:var(--gold);color:#111}' +
        '.mdx-scroll{max-height:62vh;overflow-y:auto;border-radius:10px;background:rgba(255,255,255,0.02);overscroll-behavior:contain}' +
        '.mdx-lane{position:relative;margin-left:46px;touch-action:pan-y}.mdx-hr{position:absolute;left:-46px;right:0;border-top:1px solid rgba(255,255,255,0.06)}' +
        '.mdx-hr span{position:absolute;left:0;top:-8px;width:40px;text-align:right;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}' +
        '.mdx-fx{position:absolute;left:0;right:0;border-radius:8px;padding:3px 8px;font-size:13px;color:var(--muted);overflow:hidden;box-sizing:border-box;background:rgba(255,255,255,0.06)}' +
        '.mdx-fx[data-kind=shift]{background:rgba(204,74,74,0.16)}.mdx-fx[data-kind=bookend]{background:rgba(224,168,76,0.12);cursor:pointer}.mdx-fx[data-kind=travel]{background:rgba(255,255,255,0.035)}' +
        '.mdx-b{position:absolute;left:6px;right:6px;border-radius:10px;box-sizing:border-box;padding:8px 10px;font-size:14px;color:var(--text);overflow:hidden;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:pan-y;' +
        'background:rgba(224,168,76,0.22);border:1px solid rgba(224,168,76,0.7);box-shadow:0 1px 3px rgba(0,0,0,.25)}' +
        '.mdx-b[data-kind=chores]{background:rgba(80,190,170,0.18);border-color:rgba(80,190,170,0.7)}.mdx-b[data-kind=cooking]{background:rgba(230,140,60,0.2);border-color:rgba(230,140,60,0.7)}' +
        '.mdx-b[data-kind=item]{background:rgba(90,140,220,0.18);border-color:rgba(90,140,220,0.65)}.mdx-b.done{opacity:.55}.mdx-b.drag{box-shadow:0 8px 24px rgba(0,0,0,.45);z-index:5}' +
        '.mdx-b b{display:block;font-size:14px;line-height:1.25}.mdx-b small{display:block;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}.mdx-b small.sched-clash-flag{color:#e0a84c;font-weight:700}.mdx-b.mdx-clash{outline:2px solid #e0a84c}' +
        '.mdx-h{position:absolute;left:0;right:0;height:16px;display:flex;justify-content:center;align-items:center;touch-action:none;cursor:ns-resize}.mdx-h span{width:36px;height:4px;border-radius:2px;background:var(--gold);opacity:.8}' +
        '.mdx-gap{position:absolute;left:6px;right:6px;border:1px dashed rgba(255,255,255,0.14);border-radius:10px;background:none;color:var(--muted);font-size:13px;cursor:pointer;font-family:inherit;text-align:left;padding:2px 10px}' +
        '.mdx-now{position:absolute;left:-8px;right:0;height:2px;background:#e5484d;pointer-events:none;z-index:4}.mdx-now:before{content:"";position:absolute;left:-2px;top:-4px;width:10px;height:10px;border-radius:50%;background:#e5484d}' +
        '.mdx-ghost{position:absolute;left:6px;right:6px;border:2px dashed var(--gold);border-radius:10px;background:rgba(224,168,76,0.12);pointer-events:none;font-size:13px;color:var(--text);padding:4px 8px;box-sizing:border-box}' +
        '.mdx-dock{position:fixed;left:0;right:0;bottom:0;z-index:100002;display:flex;gap:10px;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:var(--panel);border-top:1px solid var(--border)}' +
        '.mdx-dock div{flex:1;min-height:52px;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--text)}.mdx-dock div.hot{border-color:var(--gold);background:rgba(224,168,76,0.15)}' +
        '.mdx-tray{display:flex;flex-direction:column;gap:8px}.mdx-tray summary{min-height:40px;display:flex;align-items:center;cursor:pointer;font-size:14px;font-weight:700;color:var(--text)}' +
        '.mdx-chips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0}.mdx-chip{display:flex;align-items:center;gap:6px;min-height:44px;padding:6px 10px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:14px;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none;font-family:inherit}' +
        '.mdx-chip small{color:var(--muted);font-size:12px}.mdx-chip .ok{min-width:36px;min-height:36px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);cursor:pointer}' +
        '.mdx-fly{position:fixed;z-index:100003;pointer-events:none;padding:8px 12px;border-radius:10px;background:var(--panel);border:1px solid var(--gold);color:var(--text);font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.45)}' +
        '.mdx-week{display:grid;grid-template-columns:repeat(7,minmax(88px,1fr));gap:4px;overflow-x:auto}.mdx-week .mdx-lane{margin-left:0}.mdx-wk-h{font-size:13px;font-weight:700;text-align:center;color:var(--text);padding:4px 0;min-height:36px;border-radius:8px;background:none;border:1px solid var(--border);cursor:pointer;font-family:inherit}' +
        '.mdx-wk-h.today{border-color:var(--gold)}.mdx-week .mdx-b{left:2px;right:2px;padding:4px 5px;font-size:12px}.mdx-week .mdx-b b{font-size:12px}.mdx-col.hot{background:rgba(224,168,76,0.06)}' +
        '.mdx-list{display:flex;flex-direction:column;gap:6px}.mdx-li{display:flex;align-items:center;gap:8px;min-height:44px;padding:4px 8px;border:1px solid var(--border);border-radius:10px;font-size:14px;color:var(--text)}' +
        '.mdx-pin{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;margin:6px 0;padding:8px 12px;border-radius:12px;border:1px solid rgba(224,168,76,0.5);background:rgba(224,168,76,0.1);color:var(--text);font-size:15px;text-align:left;cursor:pointer;font-family:inherit}' +
        '.mdx-li .grip{cursor:grab;touch-action:none;font-size:18px;color:var(--muted);padding:0 4px}.mdx-li .mdx-grow{overflow-wrap:anywhere}';
      document.head.appendChild(st);
    },
    _mdxBtn: function(label, pri, cls) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mdx-btn' + (pri ? ' pri' : '') + (cls ? ' ' + cls : ''); b.textContent = label; return b;
    },
    _mdxFail: function(e) { RPGACE.utils.toast('⚠️ ' + ((e && e.message) || e), '#CC4A4A', 4000, 'myDay'); },
    // One undo bar for every MDX action (drag, done, start now, tomorrow).
    _mdxUndo: function(text, undoFn, redraw) {
      var self = RPGACE.modules.myDay, old = document.getElementById('myday-undo');
      if (old) old.remove();
      var bar = document.createElement('div'); bar.id = 'myday-undo'; bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:100001;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:8px 10px 8px 14px;border-radius:12px;border:1px solid var(--orange);background:var(--panel);color:var(--text);font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.4)';
      var t = document.createElement('span'); t.textContent = text;
      var b = self.ui._mdxBtn('↩ Undo'); b.id = 'myday-undo-btn';
      b.onclick = function() {
        b.disabled = true;
        Promise.resolve(undoFn ? undoFn() : self.logic.undoMoves()).then(function() { bar.remove(); RPGACE.utils.toast('↩ Put back', 'var(--gold)', 1800); if (redraw) redraw(); self.ui.render(); },
          function(e) { b.disabled = false; self.ui._mdxFail(e); });
      };
      bar.appendChild(t); bar.appendChild(b); document.body.appendChild(bar);
      setTimeout(function() { if (bar.parentNode) bar.remove(); }, 10000);
    },

    // ── MDX-1: the decluttered home ──────────────────────────────────────
    renderMdx: function(panel) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      U._mdxCss();
      var page = document.getElementById('page-quests');
      if (page) page.classList.add('mdx-on');
      var today = L.iso(), routines = self._routines || [], logs = self._logs || [];
      var due = L.today(routines, logs, today);
      var doneIds = {};
      due.forEach(function(r) { var l = L.todayLog(r, logs, today); if (l && l.status === 'completed') doneIds[String(r.id)] = 1; });
      var doneN = Object.keys(doneIds).length;
      var xpToday = logs.filter(function(l) { return L.logDate(l) === today && l.status === 'completed'; }).reduce(function(a, l) { return a + (Number(l.xp) || 0); }, 0);
      var beDay = L.dayParts(today).be, beIds = {};
      beDay.morning.tasks.concat(beDay.night.tasks).forEach(function(r) { beIds[String(r.id)] = 1; });
      self._beIds = beIds;
      // Kept for the screens that read it (goStep, Good morning).
      var nextR = due.filter(function(r) { return r.cadence !== 'every_days' && !doneIds[String(r.id)]; })
        .sort(function(a, b) { return (L.toMin(a.preferred_time) || 9999) - (L.toMin(b.preferred_time) || 9999); })[0];
      try {
        self._home = L.homeModel({ today: today, hour: new Date().getHours(), due: due, doneIds: doneIds, blocks: self._choreBlocks || [], chores: L.chores(routines),
          reviewDue: !!(L.reviewTarget(new Date()) && routines.length && self._lastReview !== L.reviewTarget(new Date())), nextRoutine: nextR ? nextR.title : null });
      } catch (e) { self._home = null; }
      panel.innerHTML = '';
      panel.appendChild(Object.assign(RPGACE.areaNav.bar('myday', { isHub: true }), { id: 'myday-bar' }));
      var head = document.createElement('div'); head.className = 'mdx-head';
      // UI Debloat: the shortcuts open by swipe-right; this is the same slim left-edge tab every page has.
      var menu = document.createElement('button'); menu.type = 'button'; menu.className = 'side-list-btn'; menu.id = 'mdx-menu'; menu.textContent = '›';
      if (RPGACE.sideList && RPGACE.sideList._css) RPGACE.sideList._css();
      menu.setAttribute('aria-label', 'My Day shortcuts'); menu.onclick = function() { U.openDrawer(); };
      var tw = document.createElement('div'); tw.className = 'mdx-grow';
      var shifts = L.shiftsOn(today);
      tw.innerHTML = '<h2>☀️ My Day</h2><div class="mdx-sub">' + esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) +
        (due.length ? ' · ' + doneN + '/' + due.length + ' done · +' + xpToday + ' XP' : '') + '</div><div class="mdx-sub" id="myday-shift">' +
        esc(shifts.length ? '🧑‍🍳 Shift ' + shifts.map(function(s) { return s.start + '–' + s.end; }).join(', ') : '🌴 No shift today') + '</div>';
      head.appendChild(menu); head.appendChild(tw);
      panel.appendChild(head);
      var nn = document.createElement('div'); nn.id = 'mdx-nownext'; panel.appendChild(nn);
      var dnHost = document.createElement('div'); dnHost.id = 'mdx-dn'; panel.appendChild(dnHost);
      if (RPGACE.modules.doingNow) { try { RPGACE.modules.doingNow.ui.mount(dnHost); } catch (e) { console.warn('[myDay] doingNow card', e); } }
      var dv = document.createElement('div'); dv.id = 'mdx-day'; panel.appendChild(dv);
      var tray = document.createElement('div'); tray.id = 'mdx-tray-host'; panel.appendChild(tray);
      var v = self._mdxView || (self._mdxView = { date: today, mode: 'day' });
      if (v.date < today) v.date = today;
      var redraw = function() { U.nowNextCard(nn, today); U.dayView(dv, v.date, { home: true, redraw: redraw }); U.tray(tray, v.date, today, redraw); };
      redraw();
      U._initSwipe();
      U._startTicker();
      L.syncAlarms().then(function() { U._alarmCheck(); }).catch(function() {});
      if (self._flash) U._applyFlash();
    },
    // 🌅 / 🌙 pinned rows: routine tasks + (today) the Morning Brief / the
    // evening review.
    _pin: function(which, e, isoDate, today) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      var tasks = e.tasks || [], done = tasks.filter(function(r) { return L.todayLog(r, self._logs || [], isoDate); }).length;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mdx-pin'; b.id = 'mdx-pin-' + which; b.dataset.which = which;
      var extra = isoDate === today ? (which === 'morning' ? ' · ☀️ Brief' : ' · 🌙 Review') : '';
      b.innerHTML = '<span style="font-size:20px" aria-hidden="true">' + (which === 'morning' ? '🌅' : '🌙') + '</span><span class="mdx-grow"><b>' + (which === 'morning' ? 'Morning routine' : 'Night routine') + '</b>' +
        '<span class="mdx-nn-s">' + L.fmtMin(e.from) + '–' + L.fmtMin(e.to) + ' · ' + (tasks.length ? done + '/' + tasks.length + ' done' : 'no tasks yet') + esc(extra) + '</span></span><span aria-hidden="true">›</span>';
      b.onclick = function() { U._openPin(which, isoDate); };
      return b;
    },
    _openPin: function(which, isoDate) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, today = L.iso();
      if (isoDate && isoDate !== today) { U.openBookend(which); return; }
      if (which === 'morning') { U.openMorning(); return; }
      U.openEvening();
      // The night tasks to tick, above the review.
      var pop = document.getElementById('myday-evening');
      if (pop) {
        var card = U.bookendCard('night', L.dayParts(today).be, today);
        card.id = 'mdx-night-tasks';
        pop.insertBefore(card, pop.firstChild);
      }
    },
    nowNextCard: function(host, today) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      var s = L.daySegs(today), nowM = L.nowMin(), nx = L.nowNext(s.segs, nowM);
      host.innerHTML = '';
      var card = document.createElement('div'); card.className = 'mdx-card mdx-nn'; card.id = 'mdx-nn';
      var dbh = document.createElement('div'); dbh.id = 'mdx-daybtn'; dbh.style.cssText = 'margin-bottom:8px;'; card.appendChild(dbh); U.dayButton(dbh);
      var row = function(k, g, verb, act, sub) {
        var r = document.createElement('div'); r.className = 'mdx-nn-row';
        r.innerHTML = '<span class="mdx-nn-k">' + k + '</span><span class="mdx-nn-t">' + esc(g ? g.label : sub) + (g ? '<span class="mdx-nn-s">' + esc(sub) + '</span>' : '') + '</span>';
        if (verb) { var b = U._mdxBtn(verb, k === 'Next', 'mdx-nn-go'); b.onclick = act; r.appendChild(b); }
        card.appendChild(r);
      };
      var redraw = function() { self.ui.render(); };
      if (nx.now) row('Now', nx.now, nx.now.kind === 'block' || nx.now.kind === 'item' ? 'Open' : nx.now.kind === 'bookend' ? (nx.now.which === 'morning' ? '☀️ Brief' : '🌙 Review') : null,
        function() { U._tapSeg(nx.now, today, today, redraw); }, 'until ' + L.fmtMin(nx.now.to));
      else {
        var free = nx.next ? 'Free until ' + L.fmtMin(nx.next.from) : 'Nothing else planned today';
        row('Now', null, null, null, free);
      }
      if (nx.next) row('Next', nx.next, nx.next.kind === 'block' || (nx.next.kind === 'item' && L.canDrag(nx.next, today, today)) ? '▶ Start now' : null, function() {
        U._startNow(nx.next, today, redraw);
      }, L.fmtMin(nx.next.from) + ' · in ' + L.fmtIn(nx.next.from - nowM));
      var work = L.workShift(s.segs, nowM);
      if (work) U.workRow(card, work, today);
      host.appendChild(card);
    },

    // FL-7 (Oct 27 2026): Clock in / Break / Clock out on the shift, from 30 min
    // before it starts to 30 min after it ends. Each opens Alex's phone2fork page
    // (links in the private work_links table, never in code); he still presses
    // the button there. Today's taps are remembered on this device only.
    workRow: function(card, shift, today) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var r = document.createElement('div'); r.className = 'mdx-nn-row mdx-work'; r.id = 'mdx-work';
      var k = document.createElement('span'); k.className = 'mdx-nn-k'; k.textContent = 'Work';
      var wrap = document.createElement('span'); wrap.className = 'mdx-nn-t'; wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;';
      var note = document.createElement('span'); note.className = 'mdx-nn-s'; note.id = 'mdx-work-note';
      var taps = L.workTaps(today);
      note.textContent = L.workNote(taps);
      [['clock_in', '⏱ Clock in'], ['break', '☕ Break'], ['clock_out', '🏁 Clock out']].forEach(function(b) {
        var btn = U._mdxBtn(b[1], b[0] === 'clock_in' && !taps.clock_in, 'mdx-work-' + b[0]);
        btn.style.minHeight = '44px';
        btn.onclick = function() {
          // Open the tab first (inside the tap) so phone browsers don't block it.
          var win = window.open('about:blank', '_blank');
          L.workLinks().then(function(links) {
            var url = links[b[0]];
            if (!url) { if (win) win.close(); RPGACE.utils.toast('No ' + b[1] + ' link saved yet', '#E2A83D', 3000); return; }
            if (win) { try { win.opener = null; } catch (e) {} win.location.href = url; } else window.location.href = url;
            L.workTap(today, b[0]);
            note.textContent = L.workNote(L.workTaps(today));
          }, function(e) {
            if (win) win.close();
            RPGACE.utils.toast('⚠️ Could not load your work links: ' + ((e && e.message) || e), '#CC4A4A', 4000, 'myDay');
          });
        };
        wrap.appendChild(btn);
      });
      wrap.appendChild(note);
      r.appendChild(k); r.appendChild(wrap);
      card.appendChild(r);
    },

    // ── MDX-0 / MDX-2 / MDX-7: the one day view ─────────────────────────
    _mdxPx: function() { var self = RPGACE.modules.myDay; try { return self._mdxPxV || (self._mdxPxV = Math.max(0.6, Math.min(2.4, Number(localStorage.getItem('mdx_px')) || 1.1))); } catch (e) { return 1.1; } },
    _mdxSetPx: function(px) { var self = RPGACE.modules.myDay; self._mdxPxV = Math.max(0.6, Math.min(2.4, px)); try { localStorage.setItem('mdx_px', String(self._mdxPxV)); } catch (e) {} },
    dayView: function(host, isoDate, opts) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      opts = opts || {};
      U._mdxCss();
      var today = L.iso(), v = self._mdxView || (self._mdxView = { date: isoDate, mode: 'day' });
      var redraw = opts.redraw || function() { U.dayView(host, isoDate, opts); };
      host.innerHTML = '';
      host.classList.add('mdx-card'); host.dataset.mdx = '1';
      var bar = document.createElement('div'); bar.className = 'mdx-bar';
      if (opts.home) {
        var prev = U._mdxBtn('‹'), next = U._mdxBtn('›'), lab = document.createElement('div');
        prev.id = 'mdx-prev'; next.id = 'mdx-next'; prev.setAttribute('aria-label', 'Day before'); next.setAttribute('aria-label', 'Day after');
        prev.disabled = isoDate <= today && v.mode === 'day';
        lab.className = 'mdx-grow'; lab.id = 'mdx-date';
        lab.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);';
        lab.textContent = v.mode === 'week' ? 'Week of ' + U._dayLabel(L.weekStart(isoDate)) : isoDate === today ? 'Today' : U._dayLabel(isoDate);
        prev.onclick = function() { v.date = L.addDays(isoDate, v.mode === 'week' ? -7 : -1); if (v.date < today && v.mode === 'day') v.date = today; redraw(); };
        next.onclick = function() { v.date = L.addDays(isoDate, v.mode === 'week' ? 7 : 1); redraw(); };
        var seg = document.createElement('div'); seg.className = 'mdx-seg'; seg.id = 'mdx-mode';
        ['day', 'week'].forEach(function(m) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = m === 'day' ? 'Day' : 'Week'; b.dataset.mode = m;
          b.setAttribute('aria-pressed', v.mode === m ? 'true' : 'false');
          b.onclick = function() { v.mode = m; redraw(); };
          seg.appendChild(b);
        });
        bar.appendChild(prev); bar.appendChild(lab); bar.appendChild(next); bar.appendChild(seg);
      }
      var zo = U._mdxBtn('−'), zi = U._mdxBtn('+');
      zo.setAttribute('aria-label', 'Zoom out'); zi.setAttribute('aria-label', 'Zoom in'); zo.className += ' mdx-zoom-out'; zi.className += ' mdx-zoom-in';
      zo.onclick = function() { U._mdxSetPx(U._mdxPx() / 1.25); redraw(); };
      zi.onclick = function() { U._mdxSetPx(U._mdxPx() * 1.25); redraw(); };
      bar.appendChild(zo); bar.appendChild(zi);
      host.appendChild(bar);
      if (opts.home && v.mode === 'week') { U.weekView(host, L.weekStart(isoDate), today, redraw); return; }
      if (opts.home && isoDate > today) {
        var plan = U._mdxBtn('📋 Plan this day', false, 'mdx-plan-day'); plan.style.marginBottom = '8px';
        plan.onclick = function() { U.openPlan(isoDate); };
        host.appendChild(plan);
      }
      // Alex: "make morning routine and evening routine always at top and
      // bottom ... when i click on both i get morning brief and evening
      // review too".
      var be = L.dayParts(isoDate).be;
      host.appendChild(U._pin('morning', be.morning, isoDate, today));
      var scroll = document.createElement('div'); scroll.className = 'mdx-scroll';
      var lane = U._lane(isoDate, today, { redraw: redraw, scroller: scroll });
      scroll.appendChild(lane);
      host.appendChild(scroll);
      host.appendChild(U._pin('night', be.night, isoDate, today));
      var hint = document.createElement('div'); hint.className = 'mdx-sub'; hint.style.marginTop = '6px';
      hint.textContent = isoDate < today ? 'Past day — view only.' : 'Hold a block to move it · pull its edges to resize · swipe right = done, left = tomorrow · tap a free gap to add.';
      host.appendChild(hint);
      setTimeout(function() {
        var PX = U._mdxPx(), start = Number(lane.dataset.start) || 0;
        var focus = isoDate === today ? L.nowMin() - 60 : (L.dayParts(isoDate).be.morning.from || 480) - 20;
        scroll.scrollTop = Math.max(0, (focus - start) * PX);
      }, 0);
    },
    // One lane (a day column): fixed time, blocks, Schedule tasks, free
    // gaps, the Now line. Shared by the day view, week view and Schedule.
    _lane: function(isoDate, today, o) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, xs = RPGACE.modules.xpSeason;
      var s = L.daySegs(isoDate), segs = s.segs, PX = o.px || U._mdxPx(), compact = !!o.compact;
      var startM = Math.min(360, segs.reduce(function(a, g) { return Math.min(a, g.from); }, 1440));
      var endM = Math.max(1440, segs.reduce(function(a, g) { return Math.max(a, g.to); }, 0));
      startM = Math.floor(startM / 60) * 60;
      var y = function(m) { return Math.round((m - startM) * PX); };
      var lane = document.createElement('div'); lane.className = 'mdx-lane';
      lane.dataset.date = isoDate; lane.dataset.start = startM; lane.dataset.px = PX;
      lane.style.height = y(endM) + 'px';
      if (compact) lane.style.marginLeft = '0';
      for (var h = startM; h <= endM; h += 60) {
        var hr = document.createElement('div'); hr.className = 'mdx-hr'; hr.style.top = y(h) + 'px';
        if (compact) hr.style.left = '0';
        if (!compact) hr.innerHTML = '<span>' + L.fmtMin(h) + '</span>';
        lane.appendChild(hr);
      }
      var nowM = L.nowMin();
      segs.forEach(function(g) {
        if (g.kind === 'gap' || g.kind === 'block' || (g.kind === 'item' && g.item)) return;
        var el = document.createElement('div'); el.className = 'mdx-fx'; el.dataset.kind = g.kind;
        el.style.top = y(g.from) + 'px'; el.style.height = Math.max(14, y(g.to) - y(g.from)) + 'px';
        el.textContent = g.kind === 'bookend' ? '' : compact ? g.label : g.label + ' · ' + L.fmtMin(g.from) + '–' + L.fmtMin(g.to);
        if (g.kind === 'bookend') el.onclick = function() { U._openPin(g.which, isoDate); };
        lane.appendChild(el);
      });
      // Free gaps (from now on, today) you can tap to fill.
      if (isoDate >= today && !compact) {
        var gFrom = isoDate === today ? Math.max(startM, L.snap5(nowM)) : startM;
        L.freeGaps(segs, gFrom, endM, 20).forEach(function(gp) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'mdx-gap';
          b.style.top = (y(gp.from) + 2) + 'px'; b.style.height = Math.max(18, y(gp.to) - y(gp.from) - 4) + 'px';
          b.textContent = (gp.to - gp.from) + ' min free  +';
          b.dataset.from = gp.from; b.dataset.to = gp.to;
          b.onclick = function(ev) { if (lane._noTap) return; U.addInGap(isoDate, gp.from, gp.to, o.redraw); };
          lane.appendChild(b);
        });
      }
      segs.filter(function(g) { return g.kind === 'block' || (g.kind === 'item' && g.item); }).forEach(function(g) {
        lane.appendChild(U._segEl(g, isoDate, today, lane, segs, s.gap, y, PX, startM, o));
      });
      if (isoDate === today) {
        var nl = document.createElement('div'); nl.className = 'mdx-now'; nl.style.top = y(nowM) + 'px'; nl.id = compact ? '' : 'mdx-now';
        lane.appendChild(nl);
      }
      U._laneGestures(lane, isoDate, today, segs, y, PX, startM, o);
      return lane;
    },
    _segLabel: function(g) {
      var L = RPGACE.modules.myDay.logic, b = g.block;
      if (b && b.items && b.items.length) { var d = b.items.filter(function(i) { return i.done; }).length; return d + '/' + b.items.length + ' done'; }
      if (b && (b.kind === 'chores' || !b.kind)) return (b.routine_ids || []).length + ' chores';
      return '';
    },
    _segEl: function(g, isoDate, today, lane, segs, gap, y, PX, startM, o) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      var b = g.block, x = g.item, el = document.createElement('div');
      el.className = 'mdx-b'; el.dataset.kind = b ? (b.kind || 'chores') : 'item'; el.dataset.id = b ? b.id : 'a:' + x.id;
      if (x && x.completed) el.classList.add('done');
      el.style.top = y(g.from) + 'px'; el.style.height = Math.max(30, y(g.to) - y(g.from)) + 'px';
      // Same ⚠ the Schedule grid shows when an entry lands on the shift or its travel.
      var flagged = (x && !x.completed && x.source_type !== 'doing_now') || (b && b.status !== 'done');
      var paint = function(f, m) {
        var c = flagged ? L.clashWith(isoDate, f, m) : null;
        el.classList.toggle('mdx-clash', !!c);
        el.innerHTML = '<b>' + esc(g.label) + '</b><small>' + L.fmtMin(f) + '–' + L.fmtMin(f + m) + (U._segLabel(g) ? ' · ' + esc(U._segLabel(g)) : '') + '</small>'
          + (c ? '<small class="sched-clash-flag">⚠ Clashes with ' + (c.kind === 'shift' ? 'your shift' : 'your ' + esc(String(c.label || '').toLowerCase())) + ' (' + L.fmtMin(c.from) + '–' + L.fmtMin(c.to) + ')</small>' : '');
      };
      paint(g.from, g.to - g.from);
      var can = L.canDrag(g, isoDate, today) && !o.compactLocked;
      var addHandles = function() {
        if (!can || o.compact) return;
        ['s', 'e'].forEach(function(edge) {
          var hd = document.createElement('div'); hd.className = 'mdx-h mdx-h' + edge; hd.style[edge === 's' ? 'top' : 'bottom'] = '0';
          hd.setAttribute('aria-label', edge === 's' ? 'Drag to change start' : 'Drag to change end');
          hd.innerHTML = '<span></span>';
          el.appendChild(hd);
        });
      };
      var repaint = function(f, m) { paint(f, m); addHandles(); };
      addHandles();
      U._dragify(el, {
        can: can, compact: !!o.compact,
        start: function() { return { from: g.from, mins: g.to - g.from }; },
        lim: function() { return L.dragLimits(segs, { id: g.id, from: g.from, to: g.to }, b ? gap : 0); },
        px: PX, scroller: o.scroller,
        move: function(r) { el.style.top = y(r.from) + 'px'; el.style.height = Math.max(30, y(r.from + r.mins) - y(r.from)) + 'px'; repaint(r.from, r.mins); },
        drop: function(r, ev) {
          if (o.week && b && ev && !r.dock) {
            // MDX-7: the column under the finger is the new day.
            var col = U._colAt(ev.clientX, ev.clientY), to = col ? col.dataset.date : isoDate;
            document.querySelectorAll('.mdx-col.hot').forEach(function(c) { c.classList.remove('hot'); });
            el.style.transform = '';
            if (to && to !== isoDate) {
              if (to < today) { U._mdxFail(new Error('That day has passed.')); o.redraw(); return; }
              return L.moveBlockTo(b, to, r.from).then(function(res) {
                U._mdxUndo(g.label + ' → ' + U._dayLabel(to) + ' ' + L.fmtMin(res.from), null, o.redraw);
                o.redraw(); self.ui.render();
              }).catch(function(e) { U._mdxFail(e); o.redraw(); });
            }
          }
          return U._dropSeg(g, isoDate, today, r, ev, o);
        },
        onMoveXY: o.week ? function(ev) {
          if (el._x0 == null) el._x0 = ev.clientX;
          el.style.transform = 'translateX(' + (ev.clientX - el._x0) + 'px)';
          var col = U._colAt(ev.clientX, ev.clientY);
          document.querySelectorAll('.mdx-col').forEach(function(c) { c.classList.toggle('hot', c === col); });
        } : null,
        tap: function() { U._tapSeg(g, isoDate, today, o.redraw); },
        swipe: function(dir) { U._swipeSeg(g, isoDate, today, dir, o.redraw); },
        cancel: function() { o.redraw(); },
        dock: !!b,
      });
      return el;
    },
    // Pointer engine for blocks: mouse drags at once; touch needs a ~0.3s
    // hold (so scrolling still scrolls), with a buzz when it picks up and
    // on every 5-min step. Edges resize. A quick sideways flick = swipe.
    _dragify: function(el, h) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var st = null;
      var begin = function(ev) {
        st.drag = true; el.classList.add('drag'); self._mdxDragging = true;
        try { el.setPointerCapture(ev.pointerId); } catch (e) {}
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
        if (h.dock && !h.compact) U._dockShow();
      };
      el.addEventListener('pointerdown', function(ev) {
        if (ev.button > 0) return;
        var edge = ev.target.closest && ev.target.closest('.mdx-h');
        var s0 = h.start();
        st = { x0: ev.clientX, y0: ev.clientY, t0: Date.now(), touch: ev.pointerType !== 'mouse', mode: edge ? (edge.classList.contains('mdx-hs') ? 'start' : 'end') : 'move',
          from: s0.from, mins: s0.mins, cur: s0, drag: false, lim: h.can ? h.lim() : null, step: s0.from, id: ev.pointerId };
        if (edge && h.can) { ev.preventDefault(); begin(ev); return; }
        if (st.touch && h.can) st.timer = setTimeout(function() { if (st && !st.moved) begin(ev); }, 300);
      });
      el.addEventListener('pointermove', function(ev) {
        if (!st || ev.pointerId !== st.id) return;
        var dx = ev.clientX - st.x0, dy = ev.clientY - st.y0;
        if (!st.drag) {
          if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { st.moved = true; clearTimeout(st.timer); }
          if (!st.touch && h.can && (h.compact ? Math.abs(dx) + Math.abs(dy) > 4 : Math.abs(dy) > 4 && Math.abs(dy) >= Math.abs(dx))) begin(ev);
          if (!st.drag) return;
        }
        ev.preventDefault();
        var dm = dy / h.px, r;
        if (st.mode === 'end') r = L.clampDrag(st.lim, st.from, st.mins + dm, 'end');
        else if (st.mode === 'start') r = L.clampDrag(st.lim, st.from + dm, st.mins - dm, 'start');
        else r = L.clampDrag(h.compact ? { lo: 0, hi: 1440 * 2 } : st.lim, st.from + dm, st.mins, 'move');
        if (r.from !== st.cur.from || r.mins !== st.cur.mins) { try { if (navigator.vibrate) navigator.vibrate(4); } catch (e) {} }
        st.cur = r; h.move(r);
        U._dockHot(ev.clientX, ev.clientY);
        if (h.onMoveXY) h.onMoveXY(ev);
        var sc = h.scroller;
        if (sc) { var rc = sc.getBoundingClientRect(); if (ev.clientY < rc.top + 40) sc.scrollTop -= 10; else if (ev.clientY > rc.bottom - 40) sc.scrollTop += 10; }
      });
      var end = function(ev) {
        if (!st || ev.pointerId !== st.id) return;
        var s = st; st = null; clearTimeout(s.timer);
        el.classList.remove('drag'); self._mdxDragging = false;
        var dock = U._dockHide(ev.clientX, ev.clientY);
        if (s.drag) {
          if (dock) { h.drop({ dock: dock }, ev); return; }
          if (s.cur.from === s.from && s.cur.mins === s.mins && !h.compact) return;
          h.drop(s.cur, ev); return;
        }
        var dx = ev.clientX - s.x0, dy = ev.clientY - s.y0, dt = Date.now() - s.t0;
        if (h.can && Math.abs(dx) > 70 && Math.abs(dy) < 40 && dt < 700) { h.swipe(dx > 0 ? 'right' : 'left'); return; }
        if (!s.moved) h.tap();
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', function(ev) { if (st && st.drag) { st = null; el.classList.remove('drag'); self._mdxDragging = false; U._dockHide(); h.cancel(); } else st = null; });
      if (!self._mdxTouchGuard) {
        self._mdxTouchGuard = true;
        document.addEventListener('touchmove', function(e) { if (self._mdxDragging && e.cancelable) e.preventDefault(); }, { passive: false });
      }
    },
    _dockShow: function() {
      if (document.getElementById('mdx-dock')) return;
      var d = document.createElement('div'); d.className = 'mdx-dock'; d.id = 'mdx-dock';
      d.innerHTML = '<div data-dock="tomorrow">📅 Tomorrow</div><div data-dock="unplan">📥 Unplan</div>';
      document.body.appendChild(d);
    },
    _dockAt: function(x, yy) {
      var d = document.getElementById('mdx-dock'); if (!d) return null;
      var hit = null;
      d.querySelectorAll('[data-dock]').forEach(function(z) { var r = z.getBoundingClientRect(); var on = x >= r.left && x <= r.right && yy >= r.top && yy <= r.bottom; z.classList.toggle('hot', on); if (on) hit = z.dataset.dock; });
      return hit;
    },
    _dockHot: function(x, yy) { RPGACE.modules.myDay.ui._dockAt(x, yy); },
    _dockHide: function(x, yy) {
      var U = RPGACE.modules.myDay.ui, hit = x != null ? U._dockAt(x, yy) : null, d = document.getElementById('mdx-dock');
      if (d) d.remove();
      return hit;
    },
    // A drag ended: save it (guard + push rule), or a dock action.
    _dropSeg: function(g, isoDate, today, r, ev, o) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, b = g.block, x = g.item;
      if (r.dock) {
        if (!b) { o.redraw(); return; }
        if (r.dock === 'tomorrow') return U._toTomorrow(b, o.redraw);
        return U._unplan(b, o.redraw);
      }
      var p = b ? L.commitDrag(b, r.from, r.mins) : L.commitItemDrag(x, r.from, r.mins);
      return p.then(function(res) {
        if (!res) { o.redraw(); return; }
        U._mdxUndo(g.label + ' → ' + L.fmtMin(res.from) + '–' + L.fmtMin(res.from + res.mins) + (res.pushed && res.pushed.length ? ' (moved ' + res.pushed.length + ' other)' : ''), null, o.redraw);
        o.redraw(); if (!o.home) self.ui.render();
      }).catch(function(e) { U._mdxFail(e); o.redraw(); });
    },
    _toTomorrow: function(b, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, from = b.block_date, to = L.addDays(b.block_date, 1);
      return L.moveBlockDay(b, to).then(function() {
        U._mdxUndo(L.blockLabel(b) + ' → ' + U._dayLabel(to), function() { return L.moveBlockDay(b, from); }, redraw);
        if (redraw) redraw(); self.ui.render();
      }).catch(function(e) { U._mdxFail(e); if (redraw) redraw(); });
    },
    _unplan: function(b, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var pop = RPGACE.modules.dashDeck._popup({ title: 'Unplan ' + L.blockLabel(b) + '?', width: '420px' });
      pop.box.id = 'mdx-unplan';
      var t = document.createElement('div'); t.className = 'mdx-sub'; t.style.marginBottom = '10px';
      t.textContent = b.kind === 'cooking' ? 'The block and its planned cook are removed. XP already earned stays.' : 'The block comes off the day. Its actions and chores stay due; XP already earned stays.';
      var row = document.createElement('div'); row.className = 'mdx-bar';
      var yes = U._mdxBtn('📥 Unplan', true); yes.id = 'mdx-unplan-yes';
      var no = U._mdxBtn('Keep it');
      yes.onclick = function() { yes.disabled = true; L.cancelChoreBlock(b).then(function() { pop.close(); RPGACE.utils.toast('Block taken off the day', 'var(--gold)', 2000); if (redraw) redraw(); self.ui.render(); }, function(e) { yes.disabled = false; U._mdxFail(e); }); };
      no.onclick = function() { pop.close(); if (redraw) redraw(); };
      row.appendChild(yes); row.appendChild(no);
      pop.box.appendChild(t); pop.box.appendChild(row);
    },
    // Swipe right = done (did-it flow), left = tomorrow.
    _swipeSeg: function(g, isoDate, today, dir, redraw) {
      var U = RPGACE.modules.myDay.ui;
      if (dir === 'left') { if (g.block) U._toTomorrow(g.block, redraw); else U._itemTomorrow(g.item, redraw); return; }
      U._didIt(g, isoDate, today, redraw);
    },
    // ── MDX-3: tap a block ──────────────────────────────────────────────
    _live: function(g, isoDate, today) {
      var self = RPGACE.modules.myDay, L = self.logic, b = g.block, x = g.item;
      if (b && b.kind === 'realm' && isoDate === today && L.blockMethod(b) !== 'none') {
        return { label: '▶ Start · ' + self.METHODS[L.blockMethod(b)].label, running: !!L.focusRun(), run: function() { return L.startFocus(b).then(function() { self.ui._focusTick(); }); } };
      }
      if (b && b.kind === 'cooking' && b.planned_cook_id) return { label: '▶ Start cooking', run: function() { var co = RPGACE.modules.cookingOracle; if (co) co.logic._startCookNow(b.planned_cook_id, b.agenda_id); return Promise.resolve(); } };
      if (x && x.source_type === 'planned_cook') return { label: '▶ Start cooking', run: function() { if (typeof startScheduledTask === 'function') startScheduledTask(x.id); return Promise.resolve(); } };
      return null;
    },
    _tapSeg: function(g, isoDate, today, redraw) {
      var U = RPGACE.modules.myDay.ui;
      if (g.kind === 'bookend') { U._openPin(g.which, isoDate); return; }
      if (g.kind !== 'block' && g.kind !== 'item') return;
      U.blockSheet(g, isoDate, today, redraw);
    },
    _startNow: function(g, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, live = U._live(g, today, today), nowM = L.nowMin();
      var p = g.block ? L.startBlockNow(g.block, nowM) : L.startItemNow(g.item, nowM);
      return p.then(function(res) {
        U._mdxUndo('▶ ' + g.label + ' now · ' + L.fmtMin(L.startNowAt(nowM)) + (res && res.pushed && res.pushed.length ? ' (moved ' + res.pushed.length + ' later)' : ''), null, redraw);
        return live && !live.running ? live.run() : null;
      }).then(function() { if (redraw) redraw(); self.ui.render(); }).catch(function(e) { U._mdxFail(e); });
    },
    _didIt: function(g, isoDate, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, nowM = isoDate === today ? L.nowMin() : 24 * 60;
      if (g.item) {
        return L.didItem(g.item, nowM).then(function(r) {
          RPGACE.utils.toast('✅ ' + g.label + (r.cut ? ' — ' + r.cut + ' min freed' : ''), '#4caf82', 2600);
          if (redraw) redraw(); self.ui.render();
        }).catch(function(e) { U._mdxFail(e); });
      }
      return L.didBlock(g.block, nowM, today).then(function(r) {
        U._mdxUndo('✅ ' + g.label + ' done' + (r.cut ? ' · ' + r.cut + ' min freed' : '') + (r.ticked ? ' · ' + r.ticked + ' ticked' : ''), r.undo, redraw);
        return L.load();
      }).then(function() { if (redraw) redraw(); self.ui.render(); }).catch(function(e) { U._mdxFail(e); });
    },
    _itemTomorrow: function(x, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, from = x.date, to = L.addDays(x.date, 1);
      var setDate = function(d) {
        try { RPGACE.DB.set('sched', (RPGACE.DB.get('sched') || []).map(function(a) { return a.id === x.id ? Object.assign({}, a, { date: d }) : a; })); } catch (e) {}
        x.date = d;
        return RPGACE.sb.secureWrite('rpgace_agendas', 'update', { date: d }, 'id=eq.' + x.id);
      };
      return setDate(to).then(function() { U._mdxUndo((x.title || 'Task') + ' → ' + U._dayLabel(to), function() { return setDate(from); }, redraw); if (redraw) redraw(); self.ui.render(); })
        .catch(function(e) { U._mdxFail(e); });
    },
    blockSheet: function(g, isoDate, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc, b = g.block, x = g.item;
      var nowM = L.nowMin(), isToday = isoDate === today, future = isToday ? g.from > nowM : isoDate > today, past = isoDate < today;
      var live = U._live(g, isoDate, today);
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: U._dayLabel(isoDate) + ' · ' + L.fmtMin(g.from) + '–' + L.fmtMin(g.to), title: g.label, width: '500px' });
      pop.box.id = 'mdx-sheet';
      var close = function() { pop.close(); };
      var after = function() { close(); if (redraw) redraw(); };
      var top = document.createElement('div'); top.className = 'mdx-bar';
      if (isToday && future && L.canDrag(g, isoDate, today)) {
        var sn = U._mdxBtn('▶ Start now', true, 'mdx-start-now'); sn.onclick = function() { sn.disabled = true; close(); U._startNow(g, today, redraw); };
        top.appendChild(sn);
      } else if (live && isToday && !live.running && !(x && x.completed)) {
        var lv = U._mdxBtn(live.label, true, 'mdx-live'); lv.onclick = function() { lv.disabled = true; live.run().then(after, function(e) { lv.disabled = false; U._mdxFail(e); }); };
        top.appendChild(lv);
      }
      if (top.children.length) pop.box.appendChild(top);
      // No live feature (or already past): ask.
      if (!past && !(x && x.completed) && (!live || !future)) {
        var q = document.createElement('div'); q.className = 'mdx-card'; q.id = 'mdx-did';
        q.innerHTML = '<div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;">' + (live ? 'Already done it?' : 'Did you do it?') + '</div>';
        var qb = document.createElement('div'); qb.className = 'mdx-bar';
        var yes = U._mdxBtn('✅ Yes, done', !live, 'mdx-did-yes'), notYet = U._mdxBtn('Not yet', false, 'mdx-did-no'), tmr = U._mdxBtn('📅 Tomorrow', false, 'mdx-did-tmr');
        yes.onclick = function() { yes.disabled = true; close(); U._didIt(g, isoDate, today, redraw); };
        notYet.onclick = close;
        tmr.onclick = function() { close(); if (b) U._toTomorrow(b, redraw); else U._itemTomorrow(x, redraw); };
        qb.appendChild(yes); qb.appendChild(notYet); if (isoDate >= today) qb.appendChild(tmr);
        q.appendChild(qb);
        if (isToday && g.from < nowM && g.to > nowM) { var hint = document.createElement('div'); hint.className = 'mdx-sub'; hint.style.marginTop = '6px'; hint.textContent = 'Yes ends it now and frees the rest (' + (g.to - L.startNowAt(nowM)) + ' min).'; q.appendChild(hint); }
        pop.box.appendChild(q);
      }
      if (b) {
        var card = (b.kind === 'chores' || !b.kind) ? U.choreBlockCard(b, today) : U.lifeBlockCard(b, today);
        pop.box.appendChild(card);
        U._reorderBox(pop.box, b, isoDate, redraw);
      } else if (x && x.description) {
        var d = document.createElement('div'); d.className = 'mdx-sub'; d.style.margin = '6px 0'; d.textContent = x.description; pop.box.appendChild(d);
      }
      var foot = document.createElement('div'); foot.className = 'mdx-bar'; foot.style.marginTop = '10px';
      if (b && !past) {
        var ex = U._mdxBtn('🕒 Exact time', false, 'mdx-exact');
        ex.onclick = function() { close(); var s = L.daySegs(isoDate); U.editWeekBlock(b, s.segs, s.gap, redraw || function() {}); };
        foot.appendChild(ex);
        if (b.kind === 'realm') { var fl = U._mdxBtn('📋 Fill this block', false, 'mdx-fill'); fl.onclick = function() { close(); U.planBlock(b, isoDate, function() { if (redraw) redraw(); self.ui.render(); }); }; foot.appendChild(fl); }
      }
      if (x && L.canDrag(g, isoDate, today)) {
        var tIn = document.createElement('input'); tIn.type = 'time'; tIn.step = '300'; tIn.id = 'mdx-item-start'; tIn.value = L.fmtMin(g.from);
        var mIn = document.createElement('input'); mIn.type = 'number'; mIn.min = '5'; mIn.max = '720'; mIn.step = '5'; mIn.id = 'mdx-item-mins'; mIn.value = g.to - g.from;
        [tIn, mIn].forEach(function(i) { i.style.cssText = 'min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;max-width:130px;'; });
        var sv = U._mdxBtn('Save time', false, 'mdx-item-save');
        sv.onclick = function() {
          var f = L.toMin(tIn.value), m = Math.round(Number(mIn.value) || 0);
          if (f == null || m < 5) { U._mdxFail(new Error('Pick a start time and at least 5 minutes.')); return; }
          sv.disabled = true;
          L.commitItemDrag(x, f, m).then(function(res) { after(); if (res) U._mdxUndo((x.title || 'Task') + ' → ' + L.fmtMin(f), null, redraw); }, function(e) { sv.disabled = false; U._mdxFail(e); });
        };
        foot.appendChild(tIn); foot.appendChild(mIn); foot.appendChild(sv);
      }
      if (foot.children.length) pop.box.appendChild(foot);
      return pop;
    },
    // Reorder a block's tasks (drag the ⠿ grip or ▲▼), or move one to
    // another block that day.
    _reorderBox: function(host, b, isoDate, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      var chores = b.kind === 'chores' || !b.kind;
      var list = chores ? L.blockChores(b).map(function(r) { return { label: r.title }; }) : (b.items || []);
      if (list.length < 2 && chores) return;
      var det = document.createElement('details'); det.id = 'mdx-reorder'; det.style.marginTop = '8px';
      det.innerHTML = '<summary class="mdx-sub" style="min-height:40px;display:flex;align-items:center;cursor:pointer;">↕ Reorder or move tasks</summary>';
      var ul = document.createElement('div'); ul.className = 'mdx-list'; det.appendChild(ul);
      var others = L.dayBlocks(isoDate).filter(function(o) { return o.id !== b.id && o.kind === b.kind && !chores; });
      var save = function(from, to) {
        (chores ? L.reorderChores(b, from, to) : L.reorderItems(b, from, to)).then(function() { paint(); if (redraw) redraw(); }, U._mdxFail);
      };
      var paint = function() {
        ul.innerHTML = '';
        var cur = chores ? L.blockChores(b).map(function(r) { return { label: r.title }; }) : (b.items || []);
        cur.forEach(function(it, i) {
          var li = document.createElement('div'); li.className = 'mdx-li'; li.dataset.idx = i;
          li.innerHTML = '<span class="grip" aria-hidden="true">⠿</span><span class="mdx-grow">' + esc(it.label) + '</span>';
          var up = U._mdxBtn('▲'), dn = U._mdxBtn('▼'); up.className += ' mdx-up'; dn.className += ' mdx-dn';
          up.disabled = i === 0; dn.disabled = i === cur.length - 1;
          up.onclick = function() { save(i, i - 1); }; dn.onclick = function() { save(i, i + 1); };
          li.appendChild(up); li.appendChild(dn);
          if (others.length) {
            var sel = document.createElement('select'); sel.className = 'mdx-move-to';
            sel.style.cssText = 'min-height:40px;max-width:120px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:inherit;';
            sel.innerHTML = '<option value="">Move to…</option>' + others.map(function(o, k) { return '<option value="' + k + '">' + esc(L.blockLabel(o) + ' ' + o.start_time) + '</option>'; }).join('');
            sel.onchange = function() { var t = others[+sel.value]; if (!t) return; L.moveItemToBlock(b, i, t).then(function() { paint(); if (redraw) redraw(); self.ui.render(); }, U._mdxFail); };
            li.appendChild(sel);
          }
          // Drag the grip up/down to reorder.
          var grip = li.querySelector('.grip');
          grip.addEventListener('pointerdown', function(ev) {
            ev.preventDefault(); var y0 = ev.clientY, hgt = li.getBoundingClientRect().height + 6;
            try { grip.setPointerCapture(ev.pointerId); } catch (e) {}
            var mv = function(e2) { li.style.transform = 'translateY(' + (e2.clientY - y0) + 'px)'; };
            var upF = function(e3) {
              grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', upF);
              li.style.transform = '';
              var to = Math.max(0, Math.min(cur.length - 1, i + Math.round((e3.clientY - y0) / hgt)));
              if (to !== i) save(i, to);
            };
            grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', upF);
          });
          ul.appendChild(li);
        });
      };
      paint();
      host.appendChild(det);
    },
    // Tap a free gap: what goes here?
    addInGap: function(isoDate, from, to, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var mins = to - from;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: U._dayLabel(isoDate), title: L.fmtMin(from) + '–' + L.fmtMin(to) + ' · ' + mins + ' min free', width: '480px' });
      pop.box.id = 'mdx-gap-sheet';
      var row = document.createElement('div'); row.className = 'mdx-bar';
      var rb = U._mdxBtn('✨ Realm block', true, 'mdx-gap-realm');
      rb.onclick = function() {
        pop.close();
        U.pickRealmBlock(null, function(nx) {
          if (!nx.realm_items.length) return;
          var m = Math.max(10, Math.min(mins, nx.mins || mins));
          L.saveRealmBlock(isoDate, { realm: nx.realm, start: L.fmtMin(from), mins: m, realm_items: nx.realm_items, method: L.methodFor(nx.realm) })
            .then(function() { RPGACE.utils.toast('✨ ' + nx.title + ' at ' + L.fmtMin(from), '#4caf82', 2200); if (redraw) redraw(); self.ui.render(); }, U._mdxFail);
        });
      };
      var cb = U._mdxBtn('🧹 Homekeeper block', false, 'mdx-gap-chores');
      cb.onclick = function() {
        var fill = L.fillBlock(mins, isoDate, L.blockedIds(isoDate));
        if (!fill.items.length) { U._mdxFail(new Error('No chores fit in ' + mins + ' min.')); return; }
        cb.disabled = true;
        L.saveChoreBlock({ date: isoDate, start: L.fmtMin(from), mins: Math.max(10, fill.used), ids: fill.items.map(function(c) { return String(c.r.id); }) })
          .then(function() { pop.close(); RPGACE.utils.toast('🧹 ' + fill.items.length + ' chores at ' + L.fmtMin(from), '#4caf82', 2200); if (redraw) redraw(); self.ui.render(); }, function(e) { cb.disabled = false; U._mdxFail(e); });
      };
      row.appendChild(rb); row.appendChild(cb);
      pop.box.appendChild(row);
      var tm = L.trayModel(isoDate), fits = tm.due.concat(tm.chores).filter(function(t) { return t.mins <= mins; }).slice(0, 8);
      if (fits.length) {
        var h = document.createElement('div'); h.className = 'mdx-sub'; h.style.margin = '10px 0 6px'; h.textContent = 'Or one of these (fits the gap):';
        pop.box.appendChild(h);
        var chips = document.createElement('div'); chips.className = 'mdx-chips';
        fits.forEach(function(t) {
          var c = U._mdxBtn(t.label + ' · ' + t.mins + 'm', false, 'mdx-gap-item');
          c.onclick = function() { c.disabled = true; L.placeFromTray(isoDate, t, from).then(function() { pop.close(); if (redraw) redraw(); self.ui.render(); }, function(e) { c.disabled = false; U._mdxFail(e); }); };
          chips.appendChild(c);
        });
        pop.box.appendChild(chips);
      }
      return pop;
    },
    // Lane background: hold + drag on empty time draws a new block; two
    // fingers pinch to zoom.
    _laneGestures: function(lane, isoDate, today, segs, y, PX, startM, o) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      if (o.compact) return;
      var pts = {}, pinch = null, draw = null;
      var minAt = function(cy) { var r = lane.getBoundingClientRect(); return startM + (cy - r.top) / PX; };
      lane.addEventListener('pointerdown', function(ev) {
        if (ev.target !== lane && !ev.target.classList.contains('mdx-hr')) return;
        pts[ev.pointerId] = ev;
        var ids = Object.keys(pts);
        if (ids.length === 2) {
          clearTimeout(draw && draw.timer); draw = null;
          var a = pts[ids[0]], c = pts[ids[1]]; pinch = { d0: Math.abs(a.clientY - c.clientY) || 1, px0: PX };
          return;
        }
        if (isoDate < today) return;
        var m0 = L.snap5(minAt(ev.clientY));
        draw = { m0: m0, cur: m0, id: ev.pointerId, active: false, x0: ev.clientX, y0: ev.clientY };
        draw.timer = setTimeout(function() {
          if (!draw) return; draw.active = true; self._mdxDragging = true; lane._noTap = true;
          try { lane.setPointerCapture(ev.pointerId); } catch (e) {}
          try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
          draw.ghost = document.createElement('div'); draw.ghost.className = 'mdx-ghost'; lane.appendChild(draw.ghost);
        }, ev.pointerType === 'mouse' ? 150 : 350);
      });
      lane.addEventListener('pointermove', function(ev) {
        if (pts[ev.pointerId]) pts[ev.pointerId] = ev;
        if (pinch) {
          var ids = Object.keys(pts); if (ids.length < 2) return;
          var d = Math.abs(pts[ids[0]].clientY - pts[ids[1]].clientY) || 1;
          lane.style.transform = 'scaleY(' + Math.max(0.5, Math.min(2.5, d / pinch.d0)) + ')'; lane.style.transformOrigin = 'top';
          pinch.scale = d / pinch.d0; return;
        }
        if (!draw) return;
        if (!draw.active) { if (Math.abs(ev.clientY - draw.y0) > 10 || Math.abs(ev.clientX - draw.x0) > 10) { clearTimeout(draw.timer); draw = null; } return; }
        ev.preventDefault();
        draw.cur = L.snap5(minAt(ev.clientY));
        var a2 = Math.min(draw.m0, draw.cur), b2 = Math.max(draw.m0, draw.cur);
        draw.ghost.style.top = y(a2) + 'px'; draw.ghost.style.height = Math.max(8, y(b2) - y(a2)) + 'px';
        draw.ghost.textContent = L.fmtMin(a2) + '–' + L.fmtMin(b2) + ' · ' + (b2 - a2) + ' min';
      });
      var up = function(ev) {
        delete pts[ev.pointerId];
        if (pinch && Object.keys(pts).length < 2) { var sc = pinch.scale || 1; pinch = null; lane.style.transform = ''; if (Math.abs(sc - 1) > 0.08) { U._mdxSetPx(PX * sc); o.redraw(); } return; }
        if (!draw) return;
        var d = draw; draw = null; clearTimeout(d.timer); self._mdxDragging = false;
        setTimeout(function() { lane._noTap = false; }, 50);
        if (!d.active) return;
        if (d.ghost) d.ghost.remove();
        var a3 = Math.min(d.m0, d.cur), b3 = Math.max(d.m0, d.cur);
        if (b3 - a3 < 10) return;
        U.pickRealmBlock(null, function(nx) {
          if (!nx.realm_items.length) return;
          L.saveRealmBlock(isoDate, { realm: nx.realm, start: L.fmtMin(a3), mins: b3 - a3, realm_items: nx.realm_items, method: L.methodFor(nx.realm) })
            .then(function() { RPGACE.utils.toast('✨ ' + nx.title + ' ' + L.fmtMin(a3) + '–' + L.fmtMin(b3), '#4caf82', 2200); o.redraw(); self.ui.render(); }, U._mdxFail);
        });
      };
      lane.addEventListener('pointerup', up);
      lane.addEventListener('pointercancel', function(ev) { delete pts[ev.pointerId]; if (draw && draw.ghost) draw.ghost.remove(); draw = null; pinch = null; lane.style.transform = ''; self._mdxDragging = false; });
    },
    // ── MDX-7: week view (drag across days) ────────────────────────────
    weekView: function(host, ws, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var PX = Math.max(0.5, U._mdxPx() * 0.6);
      var grid = document.createElement('div'); grid.className = 'mdx-week'; grid.id = 'mdx-week';
      var scroll = document.createElement('div'); scroll.className = 'mdx-scroll';
      var heads = document.createElement('div'); heads.className = 'mdx-week'; heads.style.marginBottom = '4px';
      for (var i = 0; i < 7; i++) (function(d) {
        var hb = document.createElement('button'); hb.type = 'button'; hb.className = 'mdx-wk-h' + (d === today ? ' today' : ''); hb.dataset.date = d;
        hb.textContent = 'MTWTFSS'[i] + ' ' + new Date(d + 'T12:00:00').getDate();
        hb.onclick = function() { var v = self._mdxView; v.mode = 'day'; v.date = d < today ? today : d; redraw(); };
        heads.appendChild(hb);
        var col = document.createElement('div'); col.className = 'mdx-col'; col.dataset.date = d;
        col.appendChild(U._lane(d, today, { compact: true, px: PX, redraw: redraw, scroller: scroll, week: true }));
        grid.appendChild(col);
      })(L.addDays(ws, i));
      scroll.appendChild(grid);
      host.appendChild(heads); host.appendChild(scroll);
      var hint = document.createElement('div'); hint.className = 'mdx-sub'; hint.style.marginTop = '6px';
      hint.textContent = 'Hold a block and drag it to another day or time. Tap a day to open it.';
      host.appendChild(hint);
      setTimeout(function() { scroll.scrollTop = Math.max(0, (420 - 360) * PX); }, 0);
    },

    // ── DR-7 (Oct 27 2026, plan "Day & Habits Rewire"): the 🧺 Tray and the
    // quest list under the timeline are gone (Alex: "I don't like the list
    // beneath the timeline ... useless"). One "＋ Add from realms" button opens
    // a picker of every realm's tasks, due first; a pick lands in the next
    // free gap (same saves as the planners) or into the running block.
    tray: function(host, isoDate, today, redraw) {
      var self = RPGACE.modules.myDay, U = self.ui;
      host.innerHTML = '';
      if (isoDate < today) return;
      var b = U._mdxBtn('＋ Add from realms', true, 'mdx-add-realms'); b.id = 'mdx-add-realms';
      b.style.width = '100%';
      b.onclick = function() {
        var rt = RPGACE.modules.realmTasks;
        (rt ? rt.logic.load().catch(function() {}) : Promise.resolve()).then(function() { U.openRealmPicker(isoDate, today, redraw); });
      };
      host.appendChild(b);
    },
    openRealmPicker: function(isoDate, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, rt = RPGACE.modules.realmTasks, xs = RPGACE.modules.xpSeason;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '＋ ADD FROM REALMS', title: isoDate === today ? 'What next?' : isoDate, width: '480px', scroll: true });
      pop.box.id = 'mdx-realm-picker';
      var live = rt && rt.logic.liveBlock ? rt.logic.liveBlock() : null, intoBlock = !!(live && live.block && live.block.block_date === isoDate);
      if (intoBlock) {
        var lb = document.createElement('label'); lb.className = 'mdx-sub'; lb.style.cssText = 'display:flex;gap:8px;align-items:center;margin:0 0 8px;';
        lb.innerHTML = '<input type="checkbox" id="mdx-pick-into" checked> Put it into the block you\'re in';
        pop.box.appendChild(lb);
      }
      var pick = function(t, btn) {
        btn.disabled = true;
        var into = intoBlock && document.getElementById('mdx-pick-into') && document.getElementById('mdx-pick-into').checked;
        var done = into ? L.addToBlock(live.block, t) : L.placeNext(isoDate, today, t);
        done.then(function(at) {
          pop.close();
          RPGACE.utils.toast('📌 ' + t.label + (into ? ' added to your block' : ' at ' + L.fmtMin(at)), '#4caf82', 2000);
          if (redraw) redraw(); self.ui.render();
        }, function(e) { btn.disabled = false; U._mdxFail(e); });
      };
      var row = function(host, t) {
        var c = U._mdxBtn(t.label + ' · ' + t.mins + 'm', false, 'mdx-pick-item');
        c.dataset.key = t.key; c.onclick = function() { pick(t, c); };
        host.appendChild(c);
      };
      var section = function(title, items, id, open) {
        if (!items.length) return;
        var det = document.createElement('details'); det.id = id; if (open) det.open = true;
        det.innerHTML = '<summary style="min-height:40px;cursor:pointer;font-weight:700;">' + U._esc(title) + ' · ' + items.length + '</summary>';
        var chips = document.createElement('div'); chips.className = 'mdx-chips'; items.forEach(function(t) { row(chips, t); });
        det.appendChild(chips); pop.box.appendChild(det);
      };
      var m = L.pickerModel(isoDate);
      section('✅ Due today', m.due, 'mdx-pick-due', true);
      (xs ? xs.ORDER : []).forEach(function(k) {
        var R = xs.REALMS[k] || {};
        section((R.icon || '') + ' ' + (R.name || k), m.realms[k] || [], 'mdx-pick-' + k, false);
      });
      if (!m.due.length && !Object.keys(m.realms).some(function(k) { return (m.realms[k] || []).length; })) {
        var e = document.createElement('div'); e.className = 'mdx-sub'; e.textContent = 'No tasks yet — keep some on your realm pages.'; pop.box.appendChild(e);
      }
      return pop;
    },
    _trayChip: function(t, isoDate, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      var c = document.createElement('div'); c.className = 'mdx-chip'; c.dataset.key = t.key; c.setAttribute('role', 'button'); c.tabIndex = 0;
      c.innerHTML = '<span>' + esc(t.label) + '</span><small>' + t.mins + 'm</small>';
      if (t.type === 'routine') {
        var ok = document.createElement('button'); ok.type = 'button'; ok.className = 'ok'; ok.textContent = '✓'; ok.setAttribute('aria-label', 'Mark done');
        ok.onclick = function(ev) { ev.stopPropagation(); ok.disabled = true; L.tick(t.r).then(function() { RPGACE.utils.toast('✅ ' + t.r.title, '#4caf82', 1800); return L.load(); }).then(function() { self.ui.render(); }, U._mdxFail); };
        ok.addEventListener('pointerdown', function(ev) { ev.stopPropagation(); });
        c.appendChild(ok);
      }
      var place = function(start) {
        return L.placeFromTray(isoDate, t, start).then(function() { RPGACE.utils.toast('📌 ' + t.label + ' at ' + L.fmtMin(L.snap5(start)), '#4caf82', 2000); if (redraw) redraw(); self.ui.render(); }, U._mdxFail);
      };
      var st = null;
      c.addEventListener('pointerdown', function(ev) {
        if (ev.button > 0) return;
        st = { x0: ev.clientX, y0: ev.clientY, id: ev.pointerId, touch: ev.pointerType !== 'mouse', drag: false };
        var go = function() {
          st.drag = true; self._mdxDragging = true;
          try { c.setPointerCapture(ev.pointerId); } catch (e) {}
          try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
          st.fly = document.createElement('div'); st.fly.className = 'mdx-fly'; st.fly.textContent = t.label; document.body.appendChild(st.fly);
          st.fly.style.left = (ev.clientX + 10) + 'px'; st.fly.style.top = (ev.clientY - 20) + 'px';
        };
        if (st.touch) st.timer = setTimeout(function() { if (st && !st.moved) go(); }, 300); else st.go = go;
      });
      c.addEventListener('pointermove', function(ev) {
        if (!st || ev.pointerId !== st.id) return;
        if (!st.drag) {
          if (Math.abs(ev.clientX - st.x0) > 8 || Math.abs(ev.clientY - st.y0) > 8) { st.moved = true; clearTimeout(st.timer); if (st.go) st.go(); }
          if (!st.drag) return;
        }
        ev.preventDefault();
        st.fly.style.left = (ev.clientX + 10) + 'px'; st.fly.style.top = (ev.clientY - 20) + 'px';
        if (ev.clientY < 70) window.scrollBy(0, -14); else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
        var lane = U._laneAt(ev.clientX, ev.clientY);
        if (lane && lane.parentNode && lane.parentNode.classList.contains('mdx-scroll')) { var sr = lane.parentNode.getBoundingClientRect(); if (ev.clientY < sr.top + 40) lane.parentNode.scrollTop -= 10; else if (ev.clientY > sr.bottom - 40) lane.parentNode.scrollTop += 10; }
        st.fly.textContent = t.label + (lane ? ' → ' + L.fmtMin(L.snap5(U._laneMin(lane, ev.clientY))) : '');
      });
      c.addEventListener('pointerup', function(ev) {
        if (!st || ev.pointerId !== st.id) return;
        var s = st; st = null; clearTimeout(s.timer); self._mdxDragging = false;
        if (s.fly) s.fly.remove();
        if (s.drag) {
          var lane = U._laneAt(ev.clientX, ev.clientY);
          if (lane && lane.dataset.date >= today) { var d = lane.dataset.date; L.placeFromTray(d, t, U._laneMin(lane, ev.clientY)).then(function() { RPGACE.utils.toast('📌 ' + t.label + ' placed', '#4caf82', 2000); if (redraw) redraw(); self.ui.render(); }, U._mdxFail); }
          return;
        }
        if (!s.moved) {
          // Tap: first free time that fits.
          var sg = L.daySegs(isoDate), from = isoDate === today ? L.startNowAt(L.nowMin()) : (sg.dp.be.morning.to || 480);
          var at = L.nearestFree(sg.segs, from, t.mins);
          if (at == null) { U._mdxFail(new Error('No free ' + t.mins + ' min left on ' + U._dayLabel(isoDate))); return; }
          place(at);
        }
      });
      c.addEventListener('pointercancel', function() { if (st && st.fly) st.fly.remove(); st = null; self._mdxDragging = false; });
      return c;
    },
    _laneAt: function(x, yy) {
      var els = document.elementsFromPoint ? document.elementsFromPoint(x, yy) : [document.elementFromPoint(x, yy)];
      for (var i = 0; i < els.length; i++) { var l = els[i] && els[i].closest && els[i].closest('.mdx-lane'); if (l) return l; }
      return null;
    },
    _colAt: function(x, yy) {
      var els = document.elementsFromPoint ? document.elementsFromPoint(x, yy) : [document.elementFromPoint(x, yy)];
      for (var i = 0; i < els.length; i++) { var c = els[i] && els[i].closest && els[i].closest('.mdx-col'); if (c) return c; }
      return null;
    },
    _laneMin: function(lane, yy) { var r = lane.getBoundingClientRect(); return Number(lane.dataset.start) + (yy - r.top) / Number(lane.dataset.px); },

    // ── MDX-1: the shortcut drawer (☰ or swipe right inside the page) ────
    openDrawer: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      U._mdxCss();
      if (RPGACE.sideList.isOpen()) return;
      // Oct 21 2026: drawn by the shared RPGACE.sideList (also used by Cooking).
      var h = null, close = function() { if (h) h.close(); };
      var today = L.iso();
      var tool = function(title, fill) {
        return function() {
          close();
          var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: title, width: '560px' });
          pop.box.id = 'mdx-tool';
          try { fill(pop.box); } catch (e) { U._mdxFail(e); }
        };
      };
      var groups = [
        ['Your day', [
          ['🌅', 'Morning', function() { close(); U.openMorning(); }],
          ['📋', 'Plan a day', function() { close(); U.openPlan(L.addDays(today, 1)); }],
          ['🗓', 'Plan the week (templates & methods)', function() { close(); U.openWeekPlanner(); }],
          ['🌙', 'Evening review', function() { close(); U.openEvening(); }],
          ['📆', 'Weekly review', function() { close(); U.openReview(L.reviewTarget(new Date()) || undefined); }],
        ]],
        ['Actions & chores', [
          ['✅', 'Today\'s full checklist', tool('Today\'s checklist', function(box) { U._checklistInto(box, today); })],
          ['🧹', 'Chores', tool('Chores', function(box) { U.renderChores(box, today); })],
          ['➕', 'Add actions', function() { close(); U.openPicker(); }],
          ['⚙', 'Manage actions', function() { close(); U.openManage(); }],
          ['🏖', 'Time off, trips & events', function() { close(); U.openBlocks(function() { self.ui.render(); }); }],
        ]],
        ['Tracking', [
          ['📊', 'Trackers & cut-backs', tool('Trackers & cut-backs', function(box) { U.renderTrackers(box, today); })],
          ['💪', 'Health, posting & selling', tool('Health, posting & selling', function(box) {
            if (RPGACE.modules.healthBody) RPGACE.modules.healthBody.ui.myDayCard(box);
            if (RPGACE.modules.postingHub) RPGACE.modules.postingHub.ui.myDayLine(box);
            if (RPGACE.modules.sellingHub) RPGACE.modules.sellingHub.ui.myDayLine(box);
          })],
          ['🔔', 'Alerts', tool('Alerts', function(box) { U.alertsRow(box); })],
        ]],
        ['More', [
          ['🏔️', 'Realms, quests & milestones', function() { close(); var pg = document.getElementById('page-quests'); if (!pg) return; pg.classList.toggle('mdx-more'); var first = pg.querySelector(':scope > :not(#myday-panel)'); if (first && pg.classList.contains('mdx-more')) first.scrollIntoView({ behavior: 'smooth', block: 'start' }); }],
          ['↩', 'Classic My Day', function() { close(); try { localStorage.setItem('md_classic', '1'); } catch (e) {} var pg = document.getElementById('page-quests'); if (pg) pg.classList.remove('mdx-on', 'mdx-more'); self.ui.render(); }],
        ]],
      ];
      h = RPGACE.sideList.open({ id: 'mdx-drw', bgId: 'mdx-drw-bg', cls: 'mdx-drw', bgCls: 'mdx-drw-bg', itemCls: 'mdx-drw-item', label: 'My Day shortcuts', groups: groups });
    },
    // Swipe right from inside the page (never the screen edge: iPhone Back
    // and the side menu own the edge) opens the drawer.
    _initSwipe: function() {
      var self = RPGACE.modules.myDay, U = self.ui, pg = document.getElementById('page-quests');
      if (!pg) return;
      // Shared swipe (RPGACE.sideList.attach); My Day's drawer builds its own list.
      RPGACE.sideList.attach(pg, function() { U.openDrawer(); return null; }, {
        when: function() { return U._mdxOn(); },
        ignore: '.mdx-lane,.mdx-chip,.mdx-scroll,.mdx-week',
        busy: function() { return !!self._mdxDragging; },
      });
    },
    // The old "Do — today" routine list, for the drawer.
    _checklistInto: function(box, today) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var due = L.today(self._routines || [], self._logs || [], today);
      var any = false;
      self.PARTS.forEach(function(p) {
        var items = due.filter(function(r) { return r.cadence !== 'every_days' && (r.part_of_day || 'any') === p.key && !L.waitingOnChain(r, self._logs, today); });
        if (!items.length) return;
        any = true;
        U._group(box, p.label);
        items.forEach(function(r) { box.appendChild(U.row(r, today)); });
      });
      if (!any) { var e = document.createElement('div'); e.className = 'mdx-sub'; e.textContent = 'Nothing due today.'; box.appendChild(e); }
    },
    // ── MDX-6: the Daily Schedule on the same timeline ───────────────────
    // renderDailyGrid (legacy Schedule) is wrapped once; its date nav keeps
    // working (window._dailyDate) and a Timeline | Grid switch is kept.
    schedHook: function() {
      var U = RPGACE.modules.myDay.ui;
      if (window._mdxSchedHooked || typeof window.renderDailyGrid !== 'function') return;
      window._mdxSchedHooked = true;
      var orig = window.renderDailyGrid;
      window.renderDailyGrid = function() {
        var r = orig.apply(this, arguments);
        try { U._schedTimeline(); } catch (e) { console.warn('[myDay] schedule timeline:', e && e.message); }
        return r;
      };
    },
    _schedTimeline: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var slots = document.getElementById('time-slots');
      if (!slots || !slots.parentNode) return;
      U._mdxCss();
      var pref = 'timeline';
      try { pref = localStorage.getItem('md_sched_view') || 'timeline'; } catch (e) {}
      var tg = document.getElementById('mdx-sched-toggle');
      if (!tg) {
        tg = document.createElement('div'); tg.className = 'mdx-seg'; tg.id = 'mdx-sched-toggle'; tg.style.margin = '0 0 8px';
        ['timeline', 'grid'].forEach(function(k) {
          var b = document.createElement('button'); b.type = 'button'; b.dataset.view = k; b.textContent = k === 'timeline' ? '🧭 Timeline (drag)' : '▦ Grid';
          b.onclick = function() { try { localStorage.setItem('md_sched_view', k); } catch (e) {} U._schedTimeline(); };
          tg.appendChild(b);
        });
        slots.parentNode.insertBefore(tg, slots);
      }
      tg.querySelectorAll('button').forEach(function(b) { b.setAttribute('aria-pressed', b.dataset.view === pref ? 'true' : 'false'); });
      var host = document.getElementById('mdx-sched-tl');
      if (!host) { host = document.createElement('div'); host.id = 'mdx-sched-tl'; slots.parentNode.insertBefore(host, slots.nextSibling); }
      if (pref === 'grid') { slots.style.display = ''; host.style.display = 'none'; return; }
      slots.style.display = 'none'; host.style.display = '';
      var d = window._dailyDate || new Date();
      U.dayView(host, L.iso(d), { redraw: function() { U._schedTimeline(); } });
    },
    // DT-3: the Chores section empties as chores are done — due/overdue
    // chores (most overdue first), then one line of what's coming up.
    renderChores: function(panel, today) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var chores = L.chores(self._routines);
      if (!chores.length) return;
      var inBlock = {};
      L.choreBlocksOn(today).forEach(function(b) { (b.routine_ids || []).forEach(function(id) { inBlock[String(id)] = 1; }); });
      var withState = chores.map(function(r) { return { r: r, st: L.choreState(r, today), log: L.todayLog(r, self._logs, today) }; });
      var due = withState.filter(function(x) { return (x.st.due || x.log) && !inBlock[String(x.r.id)]; })
        .sort(function(a, b) { return (a.log ? 1 : 0) - (b.log ? 1 : 0) || b.st.overdue - a.st.overdue || (a.r.every_days || 1) - (b.r.every_days || 1); });
      var box = document.createElement('div');
      box.id = 'myday-chores';
      panel.appendChild(box);
      var open = due.filter(function(x) { return !x.log; }).length;
      self.ui._group(box, '🧹 Chores' + (open ? ' · ' + open + ' to do' : ' · all done'));
      var bb = self.ui._btn('🧹 Homekeeper block', '');
      bb.id = 'myday-chore-block';
      bb.style.marginBottom = '8px';
      // MD-7: one place to plan a chore block - Plan my day, with one added.
      bb.onclick = function() { self.ui.openPlan(today, { add: 'chores' }); };
      box.appendChild(bb);
      L.choreBlocksOn(today).forEach(function(b) { box.appendChild(self.ui.choreBlockCard(b, today)); });
      due.forEach(function(x) { box.appendChild(self.ui.row(x.r, today)); });
      var soon = withState.filter(function(x) { return !x.st.due && !x.log && !inBlock[String(x.r.id)]; }).sort(function(a, b) { return a.st.left - b.st.left; });
      if (soon.length) {
        var line = document.createElement('div');
        line.className = 'myday-chores-soon';
        line.style.cssText = 'font-size:13px;color:var(--muted);margin:2px 0 8px;line-height:1.5;';
        line.textContent = 'Coming up: ' + soon.slice(0, 4).map(function(x) {
          return x.r.title + (x.st.left === 1 ? ' tomorrow' : ' in ' + x.st.left + ' days');
        }).join(' · ') + (soon.length > 4 ? ' · +' + (soon.length - 4) + ' more' : '');
        box.appendChild(line);
      }
      var later = (self._choreBlocks || []).filter(function(b) { return b.block_date > today && (b.kind || 'chores') === 'chores'; });
      if (later.length) {
        var nb = document.createElement('div');
        nb.className = 'myday-chores-nextblock';
        nb.style.cssText = 'font-size:13px;color:var(--muted);margin:0 0 8px;';
        nb.textContent = 'Next housekeeping block: ' + later.map(function(b) { return self.ui._dayLabel(b.block_date) + ' ' + b.start_time + ' (' + (b.routine_ids || []).length + ((b.routine_ids || []).length === 1 ? ' chore)' : ' chores)'); }).join(' · ');
        box.appendChild(nb);
      }
    },

    // DT-5/6: today's cooking or shopping block — a checklist of what was
    // picked when planning. Cooking: ▶ Start cooking opens Cooking's Live
    // Cook Mode for the planned cook; ticking every dish finishes the cook.
    // Shopping: ticking marks the item bought where it came from.
    lifeBlockCard: function(b, today) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var items = b.items || [], start = L.toMin(b.start_time);
      var done = items.filter(function(x) { return x.done; }).length;
      var cooking = b.kind === 'cooking';
      var el = document.createElement('div');
      el.className = 'myday-lifeblock';
      el.dataset.id = b.id; el.dataset.kind = b.kind;
      el.style.cssText = 'border:1px solid var(--gold);border-radius:10px;padding:10px 12px;margin-bottom:10px;';
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;';
      var xsR = RPGACE.modules.xpSeason, rl = b.kind === 'realm' && xsR && xsR.REALMS[b.realm] ? xsR.REALMS[b.realm] : null;
      var label = b.kind === 'realm' ? (rl ? rl.icon + ' ' + rl.name + ' block ' : '✨ Realm block ') : cooking ? '🍳 Cooking ' : '🛒 Shopping ';
      head.innerHTML = '<b style="font-size:14px;color:var(--text);">' + esc(label) + esc(L.fmtMin(start) + '–' + L.fmtMin(start + b.mins)) + '</b>' +
        '<span class="myday-lifeblock-count" style="font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;">' + done + ' of ' + items.length + ' done</span>';
      el.appendChild(head);
      var tools = document.createElement('div');
      tools.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;';
      var fail = function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); self.ui.render(); };
      // MD-4: ▶ Start runs the block's method (Pomodoro / Deep work / Time-box).
      if (b.kind === 'realm' && b.block_date === today && L.blockMethod(b) !== 'none') {
        var run = L.focusRun(), mine = run && run.blockId === b.id;
        var sb = self.ui._btn(mine ? '⏱ Running' : '▶ Start · ' + self.METHODS[L.blockMethod(b)].label, mine ? '' : 'primary');
        sb.className += ' myday-focus-start'; sb.disabled = !!run;
        sb.onclick = function() {
          sb.disabled = true;
          L.startFocus(b).then(function() { self.ui._focusTick(); self.ui.render(); }).catch(function(e) { sb.disabled = false; fail(e); });
        };
        tools.appendChild(sb);
      }
      if (cooking && b.planned_cook_id && done < items.length) {
        var go = self.ui._btn('▶ Start cooking', 'primary'); go.className = 'myday-lifeblock-start';
        go.onclick = function() { var co = RPGACE.modules.cookingOracle; if (co) co.logic._startCookNow(b.planned_cook_id, b.agenda_id); };
        tools.appendChild(go);
      }
      var cancel = self.ui._btn('Cancel block', ''); cancel.className = 'myday-lifeblock-cancel';
      var armed = false, timer = null;
      cancel.onclick = function() {
        if (!armed) { armed = true; cancel.textContent = 'Cancel it?'; cancel.style.color = '#CC4A4A'; timer = setTimeout(function() { armed = false; cancel.textContent = 'Cancel block'; cancel.style.color = ''; }, 3000); return; }
        clearTimeout(timer); cancel.disabled = true;
        L.cancelChoreBlock(b).then(function() { RPGACE.utils.toast(cooking ? 'Cooking block cancelled — the planned cook is discarded' : b.kind === 'realm' ? 'Block cancelled — XP already earned stays' : 'Shopping block cancelled — your lists are unchanged', '#4caf82', 2600); self.ui.render(); }).catch(fail);
      };
      tools.appendChild(cancel);
      el.appendChild(tools);
      var TAG = { recipe: '', list: '🧾', cook: '🧾', wishlist: '🛒', routine: '☀️', own: '✏️' };
      items.forEach(function(it, i) {
        var lab = document.createElement('label');
        lab.className = 'myday-lifeblock-item';
        lab.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--border);min-height:44px;cursor:pointer;font-size:14px;color:var(--text);' + (it.done ? 'opacity:.55;' : '');
        var oneWay = it.done && (it.src === 'wishlist' || (it.src === 'routine' && b.kind !== 'realm'));
        var note = '';
        if (b.kind === 'realm') note = it.earns === 'real' ? '⚡ earns when you ' + (it.how || 'do it for real') : '+' + self.TICK_XP + ' XP on tick';
        lab.innerHTML = '<input type="checkbox" style="width:22px;height:22px;accent-color:var(--gold);"' + (it.done ? ' checked' : '') + (oneWay ? ' disabled' : '') + '>' +
          '<span style="flex:1;min-width:0;' + (it.done ? 'text-decoration:line-through;' : '') + '">' + (it.frog ? '🐸 <b>' : '') + (b.kind !== 'realm' && TAG[it.src] ? TAG[it.src] + ' ' : '') + esc(it.label) + (it.frog ? '</b> — do this first' : '') +
          (note ? '<br><span style="font-size:12px;color:var(--muted);text-decoration:none;">' + esc(note) + '</span>' : '') + '</span>';
        if (b.kind === 'realm' && it.opens && !it.done) {
          var ob = document.createElement('button');
          ob.type = 'button'; ob.className = 'myday-lifeblock-open'; ob.textContent = 'Open';
          ob.style.cssText = 'min-height:36px;padding:4px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:13px;';
          ob.onclick = function(ev) { ev.preventDefault(); ev.stopPropagation(); self.ui.openActivity(it.opens); };
          lab.appendChild(ob);
        }
        var cb = lab.querySelector('input');
        cb.onchange = function() {
          var want = cb.checked;
          cb.disabled = true;
          var apply = function() {
            return L.setBlockItem(b, i, want).then(function(r) {
              if (r && r.finished) RPGACE.utils.toast('🍳 Cook finished — marked cooked in Cooking', '#4caf82', 2800);
              return L.load();
            }).then(function() { self.ui.render(); }).catch(fail);
          };
          if (it.src === 'wishlist' && want) {
            var wl = RPGACE.modules.shoppingWishlist;
            RPGACE.sb.select('wishlist_items', 'select=*&id=eq.' + it.ref_id + '&limit=1').then(function(rows) {
              var row = rows && rows[0];
              if (!row || !wl) { apply(); return; }
              if (row.status === 'bought') { apply(); return; }
              wl.ui._showMarkBoughtConfirm(row, function() { apply(); });
              setTimeout(function() { cb.disabled = false; cb.checked = false; }, 0);
            }).catch(fail);
            return;
          }
          apply();
        };
        el.appendChild(lab);
      });
      return el;
    },

    // DT-4: today's chore block — its time, progress and its chores to tick.
    choreBlockCard: function(b, today) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var list = L.blockChores(b), start = L.toMin(b.start_time);
      var done = list.filter(function(r) { var l = L.todayLog(r, self._logs, today); return l && l.status === 'completed'; }).length;
      var el = document.createElement('div');
      el.className = 'myday-choreblock';
      el.dataset.id = b.id;
      el.style.cssText = 'border:1px solid var(--gold);border-radius:10px;padding:10px 12px;margin-bottom:10px;';
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;';
      head.innerHTML = '<b style="font-size:14px;color:var(--text);">🧹 Homekeeper block ' + esc(L.fmtMin(start) + '–' + L.fmtMin(start + b.mins)) + '</b>' +
        '<span class="myday-choreblock-count" style="font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;">' + done + ' of ' + list.length + ' done</span>';
      var cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'myday-choreblock-cancel'; cancel.textContent = 'Cancel block';
      cancel.style.cssText = 'min-height:36px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
      var armed = false, timer = null;
      cancel.onclick = function() {
        if (!armed) { armed = true; cancel.textContent = 'Cancel it?'; cancel.style.color = '#CC4A4A'; timer = setTimeout(function() { armed = false; cancel.textContent = 'Cancel block'; cancel.style.color = 'var(--muted)'; }, 3000); return; }
        clearTimeout(timer); cancel.disabled = true;
        L.cancelChoreBlock(b).then(function() { RPGACE.utils.toast('Homekeeper block cancelled — the chores stay due', '#4caf82', 2400); self.ui.render(); })
          .catch(function(e) { cancel.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      head.appendChild(cancel);
      el.appendChild(head);
      list.forEach(function(r) { el.appendChild(self.ui.row(r, today)); });
      if (!list.length) { var e = document.createElement('div'); e.style.cssText = 'font-size:13px;color:var(--muted);'; e.textContent = 'Its chores were removed.'; el.appendChild(e); }
      return el;
    },
    // MD-7: pick a chore block's chores by hand (folded in from the old
    // separate Chore block screen). Due/overdue first, "X of Y min" total.
    // cb(ids) with routine ids as strings.
    pickChores: function(date, mins, selected, cb) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      if (!L.chores(self._routines).length) { RPGACE.utils.toast('Set up your chore list first (+ Add actions → Chores)', '#e0a84c', 3000); return null; }
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🧹 Homekeeper block', title: 'Which chores?', width: '520px', noDefaultClose: true });
      pop.box.id = 'myday-choreblock-pop';
      var picked = {}; (selected || []).forEach(function(id) { picked[String(id)] = 1; });
      var info = document.createElement('div'); info.id = 'mcb-total';
      info.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;font-variant-numeric:tabular-nums;';
      var list = document.createElement('div'); list.id = 'mcb-list';
      pop.box.appendChild(info); pop.box.appendChild(list);
      var paint = function() {
        var t = 0;
        L.chores(self._routines).forEach(function(r) { if (picked[String(r.id)]) t += Math.max(1, r.est_mins || 15); });
        info.textContent = t + ' of ' + mins + ' min filled' + (t > mins ? ' — over by ' + (t - mins) + ' min' : '');
        info.style.color = t > mins ? '#e0a84c' : 'var(--muted)';
      };
      var takenSet = {}; L.blockedIds(date).forEach(function(id) { takenSet[String(id)] = 1; });
      var all = L.chores(self._routines).filter(function(r) { return !takenSet[String(r.id)]; })
        .map(function(r) { return { r: r, next: L.nextDue(r, date) }; })
        .sort(function(a, b) { var pa = picked[String(a.r.id)] ? 0 : 1, pb = picked[String(b.r.id)] ? 0 : 1; return pa - pb || (a.next < b.next ? -1 : a.next > b.next ? 1 : 0); });
      all.forEach(function(x) {
        var id = String(x.r.id), late = L.daysBetween(x.next, date);
        var when = late > 0 ? 'overdue ' + late + ' day' + (late === 1 ? '' : 's') : late === 0 ? 'due' : 'early (due ' + self.ui._dayLabel(x.next) + ')';
        var row = document.createElement('label');
        row.className = 'mcb-chore'; row.dataset.id = id;
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;min-height:44px;';
        row.innerHTML = '<input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (picked[id] ? ' checked' : '') + '>' +
          '<span style="flex:1;min-width:0;font-size:14px;color:var(--text);">' + esc((x.r.icon ? x.r.icon + ' ' : '') + x.r.title) +
          '<br><span style="font-size:12px;color:' + (late > 0 ? '#e0a84c' : 'var(--muted)') + ';">' + esc(when + ' · ~' + (x.r.est_mins || 15) + ' min') + '</span></span>';
        row.querySelector('input').onchange = function(ev) { if (ev.target.checked) picked[id] = 1; else delete picked[id]; paint(); };
        list.appendChild(row);
      });
      if (!all.length) list.innerHTML = '<div style="font-size:13px;color:var(--muted);">Every chore is already in another block that day.</div>';
      paint();
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:10px;';
      var cancel = self.ui._btn('Cancel', ''); cancel.onclick = function() { pop.close(); };
      var ok = self.ui._btn('Use these', 'primary'); ok.id = 'mcb-save';
      ok.onclick = function() { pop.close(); cb(all.filter(function(x) { return picked[String(x.r.id)]; }).map(function(x) { return String(x.r.id); })); };
      bar.appendChild(cancel); bar.appendChild(ok); pop.box.appendChild(bar);
      return pop;
    },
    _dayLabel: function(isoDate) {
      return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    },
    // MD2-5: "You planned X on Tue and it didn't happen" - Move to / Skip.
    missedPlanRow: function(m, today) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var el = document.createElement('div');
      el.className = 'myday-missedplan';
      el.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--panel);';
      el.innerHTML = '<div style="font-size:14px;color:var(--text);"><b>' + esc((m.routine.icon ? m.routine.icon + ' ' : '') + m.routine.title) + '</b> — planned ' + esc(self.ui._dayLabel(m.plan.plan_date)) + ', not done</div>';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;';
      var sel = document.createElement('select');
      sel.className = 'myday-move-to';
      sel.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:6px;min-height:40px;';
      var opts = L.moveOptions(m.routine, today, 6);
      sel.innerHTML = opts.map(function(d) {
        var sh = L.shiftsOn(d);
        return '<option value="' + d + '">' + esc((d === today ? 'Today' : self.ui._dayLabel(d)) + (sh.length ? ' (shift ' + sh[0].start + ')' : ' (off)')) + '</option>';
      }).join('');
      var mv = self.ui._btn('Move', 'primary'); mv.className = 'myday-move';
      var sk = self.ui._btn('Skip this one', ''); sk.className = 'myday-skipplan';
      var done = function(p, msg) {
        mv.disabled = sk.disabled = true;
        p.then(function() { return self.logic.load(); }).then(function() { RPGACE.utils.toast(msg, '#4caf82', 2200); self.ui.render(); })
          .catch(function(e) { mv.disabled = sk.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      mv.onclick = function() { if (!sel.value) return; done(L.movePlan(m.plan, sel.value), 'Moved to ' + self.ui._dayLabel(sel.value)); };
      sk.onclick = function() { done(L.skipPlan(m.plan), 'Skipped'); };
      if (opts.length) { row.appendChild(sel); row.appendChild(mv); }
      row.appendChild(sk);
      el.appendChild(row);
      return el;
    },
    // MD2-5: the week planner.
    openWeekPlanner: function(startIndex) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var today = L.iso(), extra = 0, idx = startIndex || 0, selDay = null;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: 'Plan weeks', width: '640px' });
      pop.box.id = 'myday-weekplanner';
      var draw = function() {
        var weeks = L.weeksToPlan(today, extra);
        if (idx >= weeks.length) idx = weeks.length - 1;
        var ws = weeks[idx];
        pop.box.innerHTML = '';
        // week tabs
        var tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
        weeks.forEach(function(w, i) {
          var t = document.createElement('button');
          t.type = 'button'; t.className = 'myday-weektab';
          t.textContent = i === 0 ? 'This week' : i === 1 ? 'Next week' : i === 2 ? 'Week after' : 'w/c ' + self.ui._dayLabel(w);
          t.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
            (i === idx ? 'background:var(--gold);border:none;color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
          t.onclick = function() { idx = i; draw(); };
          tabs.appendChild(t);
        });
        var more = document.createElement('button');
        more.type = 'button'; more.id = 'myday-addweek'; more.textContent = '+ Add a week';
        more.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;background:none;border:1px dashed var(--border);color:var(--muted);';
        more.onclick = function() { extra++; idx = L.weeksToPlan(today, extra).length - 1; draw(); };
        tabs.appendChild(more);
        pop.box.appendChild(tabs);
        // MD-2: drag-to-place day timeline for the picked day of this week.
        var tl = document.createElement('div');
        pop.box.appendChild(tl);
        if (!selDay || selDay < ws || selDay > L.addDays(ws, 6)) selDay = today >= ws && today <= L.addDays(ws, 6) ? today : ws;
        self.ui.weekTimeline(tl, ws, selDay, today, function(d) { if (d) selDay = d; draw(); });

        // day list: everything already booked
        var days = [];
        for (var i = 0; i < 7; i++) days.push(L.addDays(ws, i));
        var dl = document.createElement('div');
        dl.className = 'myday-daylist';
        dl.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:6px 10px;margin-bottom:12px;';
        days.forEach(function(d) {
          var bits = [];
          L.blocksOn(d).forEach(function(b) { bits.push('<span style="color:#e0a84c;">' + (self.BLOCK_KINDS[b.kind] || '⛔') + ' ' + esc(b.title) + (b.start_time ? ' ' + esc(b.start_time) + (b.end_time ? '–' + esc(b.end_time) : '') : '') + '</span>'); });
          var sh = L.shiftsOn(d);
          if (sh.length) sh.forEach(function(x) { bits.push('🧑‍🍳 ' + esc(x.start + '–' + x.end)); });
          else bits.push('<span style="color:#4caf82;">off</span>');
          var sched = L.schedOn(d).filter(function(x) { return x.source_type !== 'routine'; })
            .sort(function(a, b) { return (a.hour * 60 + (a.minute || 0)) - (b.hour * 60 + (b.minute || 0)); });
          sched.slice(0, 3).forEach(function(x) { bits.push('📌 ' + esc(String(x.hour).padStart(2, '0') + ':' + String(x.minute || 0).padStart(2, '0') + ' ' + (x.title || ''))); });
          if (sched.length > 3) bits.push('+' + (sched.length - 3) + ' more');
          var row = document.createElement('div');
          row.className = 'myday-day';
          row.dataset.date = d;
          row.style.cssText = 'display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;' + (d < today ? 'opacity:.45;' : '') + (d === today ? 'font-weight:700;' : '');
          row.innerHTML = '<span style="min-width:86px;color:var(--text);">' + esc(self.ui._dayLabel(d)) + '</span><span style="color:var(--muted);flex:1;min-width:0;">' + bits.join(' · ') + '</span>';
          dl.appendChild(row);
        });
        pop.box.appendChild(dl);

        var blockB = self.ui._btn('🌴 Time off, trips & events', '');
        blockB.id = 'myday-blockdays';
        blockB.style.cssText += 'margin-bottom:12px;';
        blockB.onclick = function() { self.ui.openBlocks(function() { draw(); }); };
        pop.box.appendChild(blockB);

        // routines with day chips
        var list = self._routines.filter(L.plannable);
        if (!list.length) {
          var e = document.createElement('div');
          e.style.cssText = 'font-size:14px;color:var(--muted);line-height:1.5;';
          e.textContent = 'No weekly or "N times a week" actions yet. Add some with + Add actions, then plan their days here.';
          pop.box.appendChild(e);
          return;
        }
        var state = {};
        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
        hint.textContent = 'Tap the days for each action this week. Faded days have passed; red-edged days are blocked by a trip or event.';
        pop.box.appendChild(hint);
        list.forEach(function(r) {
          var chosen = {}; L.weekDays(r, ws, today).forEach(function(d) { chosen[d] = 1; });
          state[r.id] = chosen;
          var row = document.createElement('div');
          row.className = 'myday-planrow';
          row.dataset.id = r.id;
          row.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);';
          var head = document.createElement('div');
          head.style.cssText = 'font-size:14px;color:var(--text);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;';
          var count = document.createElement('span');
          count.className = 'myday-plancount';
          count.style.cssText = 'font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;';
          var upd = function() {
            var n = Object.keys(chosen).length;
            count.textContent = r.cadence === 'times_per_week' ? n + '/' + (r.times_per_week || 1) : n + ' day' + (n === 1 ? '' : 's');
            count.style.color = r.cadence === 'times_per_week' && n < (r.times_per_week || 1) ? '#e0a84c' : 'var(--muted)';
          };
          head.innerHTML = '<b>' + esc((r.icon ? r.icon + ' ' : '') + r.title) + '</b>';
          head.appendChild(count);
          row.appendChild(head);
          var chips = document.createElement('div');
          chips.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;';
          days.forEach(function(d) {
            var c = document.createElement('button');
            c.type = 'button'; c.className = 'myday-chip'; c.dataset.date = d;
            var past = d < today, blocked = L.dayLoad(d) == null, sh = L.shiftsOn(d).length;
            c.innerHTML = '<span style="display:block;font-size:11px;">' + 'MTWTFSS'[L.dow(d) - 1] + '</span><span style="display:block;font-size:13px;">' + new Date(d + 'T12:00:00').getDate() + (sh ? '•' : '') + '</span>';
            var paint = function() {
              var on = !!chosen[d];
              c.style.cssText = 'min-height:44px;border-radius:8px;cursor:' + (past ? 'default' : 'pointer') + ';font-family:Rajdhani,sans-serif;font-weight:700;padding:2px 0;' +
                (on ? 'background:var(--gold);color:#111;border:1px solid var(--gold);' : 'background:none;color:var(--text);border:1px solid ' + (blocked ? '#CC4A4A' : 'var(--border)') + ';') +
                (past ? 'opacity:.4;' : '');
              c.setAttribute('aria-pressed', on ? 'true' : 'false');
            };
            if (!past) c.onclick = function() {
              if (chosen[d]) delete chosen[d]; else chosen[d] = 1;
              paint(); upd();
            };
            else c.disabled = true;
            paint();
            chips.appendChild(c);
          });
          row.appendChild(chips);
          upd();
          pop.box.appendChild(row);
        });
        var save = self.ui._btn('Save this week', 'primary');
        save.id = 'myday-saveweek';
        save.style.cssText += 'width:100%;margin-top:12px;';
        save.onclick = function() {
          save.disabled = true;
          Promise.all(list.map(function(r) { return L.savePlanWeek(r, ws, Object.keys(state[r.id]), today); }))
            .then(function() { return L.load(); })
            .then(function() { save.disabled = false; RPGACE.utils.toast('📅 Week planned', '#4caf82', 2200); self.ui.render(); draw(); })
            .catch(function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Week not saved: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
        };
        pop.box.appendChild(save);
      };
      draw();
      return pop;
    },
    // ── MD-5 one Good-morning screen ────────────────────────────────────
    // Alarm, 🌅 Morning tasks, today's blocks + frog, then the brief.
    // MB-3: the Good morning story's one style sheet - chapter order + one card look for every piece.
    storyCss: function() {
      if (document.getElementById('mb-story-css')) return;
      var o = {
        '#mb-ch-1': 10, '#myday-morning-loading': 11, '#myday-morning-shift': 11, '#myday-morning-alarm': 12,
        '#mb-ch-2': 20, '#myday-morning-bookend': 21,
        '#mb-ch-3': 30, '#realm-pick-strip': 31, '.mb-sec-top3': 32, '.mb-wait': 32, '.mb-writing': 32, '.mb-write-now': 33, '.mb-err': 32,
        '#myday-morning-frog': 34, '#myday-morning-blocks': 35, '.mb-sec-window': 36, '.mb-sec-action': 37, '#myday-morning-row': 38,
        '#mb-ch-4': 40, '.mb-sec-beat': 41, '.mb-sec-content': 42, '#ll-daily-strip': 43,
        '#mb-ch-5': 50, '#kr-brief': 51, '.mb-sec-waiting': 52, '#xp-brief-line': 53, '.mb-cc-live': 54, '#dl-watch': 55, '#recall-strip': 56,
        '#mb-btnrow': 58, '.mb-cc-head': 59
      };
      var css = '#mb-story{display:flex;flex-direction:column;gap:10px}' +
        '#mb-story>*,#mb-story #myday-morning-day>*,#mb-story #mb-wrap>*,#mb-story #mb-output>*{order:57;margin:0!important}' +
        '#mb-story #myday-morning-day,#mb-story #mb-wrap,#mb-story #mb-output{display:contents!important}' +
        Object.keys(o).map(function(k) { return '#mb-story ' + k + '{order:' + o[k] + '!important}'; }).join('') +
        '.mb-chapter{display:flex;align-items:baseline;gap:10px;margin-top:14px!important;padding-bottom:6px;border-bottom:1px solid var(--border)}' +
        '#mb-ch-1{margin-top:0!important}' +
        '.mb-ch-n{font-size:12px;font-weight:700;color:var(--dark);background:var(--gold);border-radius:999px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}' +
        '.mb-ch-t{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}' +
        '.mb-sec,#mb-story #kr-brief,#mb-story #xp-brief-line,#mb-story .mb-cc-live,#mb-story #myday-morning-blocks,#mb-story #myday-morning-frog{background:var(--panel2);border:1px solid var(--border)!important;border-radius:12px!important;padding:12px 14px!important;box-sizing:border-box;width:100%;text-align:left}' +
        '.mb-sec-h{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}' +
        '.mb-sec-b{white-space:pre-wrap;font-size:15px;line-height:1.55;color:var(--text)}' +
        '.mb-sec-action{border-color:var(--gold)!important;background:rgba(201,168,76,.08)}.mb-sec-action .mb-sec-b{font-weight:700;color:var(--gold2)}' +
        '.mb-cc-head{font-size:11px!important;color:var(--muted)!important}' +
        '@keyframes mbIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
        '#mb-story>*,#mb-story #myday-morning-day>*,#mb-story #mb-wrap>*,#mb-story #mb-output>*{animation:mbIn .5s cubic-bezier(.2,.7,.2,1) both}' +
        '@supports (animation-timeline: view()){#mb-story>*,#mb-story #myday-morning-day>*,#mb-story #mb-wrap>*,#mb-story #mb-output>*{animation-timeline:view();animation-range:entry 0% entry 40%}}' +
        '@media (prefers-reduced-motion: reduce){#mb-story *{animation:none!important}}';
      var s = document.createElement('style'); s.id = 'mb-story-css'; s.textContent = css;
      document.head.appendChild(s);
    },
    openMorning: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, dd = RPGACE.modules.dashDeck, esc = U._esc;
      var today = L.iso();
      try { localStorage.setItem('myday_morning_seen', today); } catch (e) {}
      var pop = dd._popup({ eyebrow: '🌅 Good morning', title: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), accent: 'var(--gold)', width: '640px', closeLabel: 'Close',
        onClose: function() { dd._stashWidget('mb-wrap', true); delete dd._widgetPopups['mb-wrap']; } });
      dd._widgetPopups['mb-wrap'] = pop.close;
      pop.box.id = 'myday-morning';
      // MB-3 (Oct 28 2026, Alex: "like a stroke rather than an engaging story" -> "one scroll with chapters"):
      // one story container; every piece (ours, the brief's sections, and the strips other modules add to
      // #mb-wrap, some late) is placed into its chapter by CSS order (U.storyCss), so arrival order no longer matters.
      U.storyCss();
      var story = document.createElement('div'); story.id = 'mb-story';
      [['1', 'Wake'], ['2', 'Start here'], ['3', 'Today\'s quest'], ['4', 'Make'], ['5', 'Catch up']].forEach(function(c) {
        var h = document.createElement('div'); h.className = 'mb-chapter'; h.id = 'mb-ch-' + c[0];
        h.innerHTML = '<span class="mb-ch-n">' + c[0] + '</span><span class="mb-ch-t">' + c[1] + '</span>';
        story.appendChild(h);
      });
      pop.box.appendChild(story);
      var day = document.createElement('div'); day.id = 'myday-morning-day';
      day.innerHTML = '<div id="myday-morning-loading" style="font-size:13px;color:var(--muted);">Loading your day…</div>';
      story.appendChild(day);
      dd.ui._fillBrief(story);
      var draw = function() {
        day.innerHTML = '';
        var dp = L.dayParts(today), sh = dp.shifts;
        var top = document.createElement('div'); top.id = 'myday-morning-shift';
        top.style.cssText = 'font-size:14px;color:var(--text);';
        top.textContent = sh.length ? '🧑‍🍳 Shift today ' + sh.map(function(x) { return x.start + '–' + x.end; }).join(', ') : '🌴 No shift today';
        day.appendChild(top);
        // Day Bookends: when the day started (☀️ I'm up stops the alarm).
        var ds = L.dayState();
        if (ds && ds.day === today && ds.up_at) {
          var a = document.createElement('div'); a.id = 'myday-morning-alarm';
          a.style.cssText = 'font-size:13px;margin-bottom:8px;color:var(--muted);';
          a.textContent = '☀️ Up at ' + L.fmtMin(L.nowMin(new Date(ds.up_at))) + ' · alarm off';
          day.appendChild(a);
        }
        // Same card as My Day's Do section, own id (both can be on screen).
        var mc = U.bookendCard('morning', dp.be, today); mc.id = 'myday-morning-bookend';
        day.appendChild(mc);
        // frog
        var fr = L.frogOf(today);
        if (fr) {
          var f = document.createElement('div'); f.id = 'myday-morning-frog';
          f.style.cssText = 'border:1px solid var(--gold);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:14px;';
          f.innerHTML = '🐸 <b>First: ' + esc(fr.item.label) + '</b> <span style="color:var(--muted);font-size:12px;">' + esc(L.blockLabel(fr.block) + ' · ' + fr.block.start_time) + '</span>';
          day.appendChild(f);
        }
        // today's blocks
        var bl = L.dayBlocks(today);
        var bw = document.createElement('div'); bw.id = 'myday-morning-blocks';
        bw.style.cssText = 'margin-bottom:6px;';
        bw.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;">📅 Today' + (bl.length ? '' : ' — nothing planned yet') + '</div>';
        bl.forEach(function(b) {
          var from = L.toMin(b.start_time), its = b.items || [];
          var r = document.createElement('div'); r.className = 'myday-morning-block';
          r.style.cssText = 'font-size:13px;color:var(--text);padding:4px 0;border-bottom:1px solid var(--border);';
          r.innerHTML = '<b style="font-variant-numeric:tabular-nums;">' + L.fmtMin(from) + '–' + L.fmtMin(from + (Number(b.mins) || 30)) + '</b> ' + esc(L.blockLabel(b)) +
            (its.length ? ' <span style="color:var(--muted);">· ' + esc(its.map(function(i) { return i.label; }).slice(0, 3).join(' · ')) + (its.length > 3 ? ' …' : '') + '</span>' : (b.kind === 'realm' ? ((RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.typeLine(b) : '') ? ' <span style="color:var(--gold);">· ' + esc((RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.typeLine(b) : '')) + '</span>' : ' <span style="color:#e0a84c;">· pick a type on ▶ Live now</span>') : ''));
          bw.appendChild(r);
        });
        day.appendChild(bw);
        var row = document.createElement('div'); row.id = 'myday-morning-row'; row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        var go = U._btn('▶ Open My Day', 'primary'); go.id = 'myday-morning-go';
        go.onclick = function() { pop.close(); self.open(); };
        row.appendChild(go);
        if (bl.some(function(b) { return b.kind === 'realm' && !(b.items || []).length; }) || !bl.length) {
          var pl = U._btn('📋 Plan today', ''); pl.id = 'myday-morning-plan';
          pl.onclick = function() { pop.close(); U.openPlan(today); };
          row.appendChild(pl);
        }
        day.appendChild(row);
      };
      Promise.all([L.load(), L.loadTimings()]).then(function() {
        return Promise.resolve(L.syncAlarms ? L.syncAlarms().catch(function() {}) : null);
      }).then(draw).catch(function(e) { day.innerHTML = ''; var m = document.createElement('div'); m.style.color = '#CC4A4A'; m.textContent = 'My Day could not load: ' + (e.message || e); day.appendChild(m); });
      return pop;
    },
    // ── AC-5 "What happened?" card ──────────────────────────────────────
    // One missed item at a time: a reason, then Later today / Tomorrow / Drop
    // (blocks only). "I did do it" logs it as I just did instead.
    openMissed: function(items, onDone) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, dd = RPGACE.modules.dashDeck, dn = RPGACE.modules.doingNow;
      if (!items || !items.length) { if (onDone) onDone(); return null; }
      var pop = dd._popup({ eyebrow: '❓ What happened?', title: items.length + ' missed', width: '460px', onClose: function() { if (onDone) onDone(); } });
      pop.box.id = 'myday-missed';
      var i = 0;
      var field = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;box-sizing:border-box;width:100%;';
      var fail = function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4500, 'myDay'); };
      var next = function() { i++; if (i >= items.length) { pop.close(); RPGACE.utils.toast('✓ Day updated', '#4caf82', 2000); try { U.render(); } catch (x) {} return; } show(); };
      var show = function() {
        var it = items[i];
        pop.box.innerHTML = '';
        var h = document.createElement('div'); h.id = 'myday-missed-item'; h.dataset.kind = it.kind;
        h.style.cssText = 'font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;';
        h.textContent = it.label + ' · ' + L.fmtMin(it.from) + '–' + L.fmtMin(it.to) + (it.day !== L.iso() ? ' (' + U._dayLabel(it.day) + ')' : '');
        var sub = document.createElement('div'); sub.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
        sub.textContent = (items.length > 1 ? (i + 1) + ' of ' + items.length + ' · ' : '') + 'Nothing was logged for it. What happened?';
        pop.box.appendChild(h); pop.box.appendChild(sub);
        var list = document.createElement('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
        pop.box.appendChild(list);
        var thenWhat = function(reason, note) {
          if (it.kind !== 'block') { L.saveMiss(it, reason, note, 'none').then(next, fail); return; }
          list.innerHTML = '';
          var q = document.createElement('div'); q.style.cssText = 'font-size:14px;color:var(--text);'; q.textContent = 'What now with ' + it.label + '?';
          list.appendChild(q);
          [['later', '⏭ Later today'], ['tomorrow', '📅 Tomorrow'], ['drop', '✕ Drop it']].forEach(function(o) {
            var b = U._btn(o[1], o[0] === 'later' ? 'primary' : ''); b.className += ' myday-miss-act'; b.dataset.act = o[0];
            b.onclick = function() {
              [].forEach.call(list.querySelectorAll('button'), function(y) { y.disabled = true; });
              L.missAction(it, o[0]).then(function(r) {
                if (r && r.moved && r.moved.length) { try { U.undoToast(r.moved); } catch (x) {} }
                return L.saveMiss(it, reason, note, o[0]);
              }).then(next, function(e) { [].forEach.call(list.querySelectorAll('button'), function(y) { y.disabled = false; }); fail(e); });
            };
            list.appendChild(b);
          });
        };
        var ask = function(label, ph, type, cb) {
          list.innerHTML = '';
          var q = document.createElement('div'); q.style.cssText = 'font-size:14px;color:var(--text);'; q.textContent = label;
          var inp = document.createElement('input'); inp.id = 'myday-miss-input'; inp.type = type || 'text'; inp.placeholder = ph || ''; inp.style.cssText = field;
          if (type === 'time') { var n = new Date(); inp.value = String(n.getHours()).padStart(2, '0') + ':' + String(Math.floor(n.getMinutes() / 5) * 5).padStart(2, '0'); }
          var ok = U._btn('Next', 'primary'); ok.id = 'myday-miss-ok';
          ok.onclick = function() { var v = inp.value.trim(); if (!v) return; ok.disabled = true; cb(v, ok); };
          list.appendChild(q); list.appendChild(inp); list.appendChild(ok);
          setTimeout(function() { try { inp.focus(); } catch (x) {} }, 50);
        };
        L.REASONS.forEach(function(r) {
          var b = U._btn(r.label, ''); b.className += ' myday-miss-reason'; b.dataset.reason = r.key;
          b.style.justifyContent = 'flex-start';
          b.onclick = function() {
            if (r.key === 'woke_late') {
              ask('When did you actually get up?', '', 'time', function(v, ok) {
                L.wokeLate(it.day, v).then(function(res) {
                  if (res.moved.length) { try { U.undoToast(res.moved); } catch (x) {} }
                  RPGACE.utils.toast('🌅 Morning starts at ' + res.wake + ' today', 'var(--gold)', 2400);
                  var b2 = it.block && (self._choreBlocks || []).filter(function(x) { return x.id === it.block.id; })[0];
                  var nm = new Date(), nowMin = nm.getHours() * 60 + nm.getMinutes();
                  // A block the new morning pushed later is sorted; otherwise ask what now.
                  if (it.kind === 'block' && b2 && L.toMin(b2.start_time) + (Number(b2.mins) || 30) <= nowMin) thenWhat('woke_late', 'up at ' + res.wake);
                  else L.saveMiss(it, 'woke_late', 'up at ' + res.wake, it.kind === 'block' ? 'later' : 'none').then(next, fail);
                }, function(e) { ok.disabled = false; fail(e); });
              });
              return;
            }
            if (r.key === 'came_up') {
              ask('What came up instead?', 'e.g. Removing my stitches', 'text', function(v) {
                try { if (dn) { dn.logic.justDid(v, Math.max(1, it.to - it.from), [], new Date(it.day + 'T00:00:00').getTime() + it.to * 60000); dn.ui._refresh(); } } catch (x) {}
                thenWhat('came_up', v);
              });
              return;
            }
            if (r.key === 'other') { ask('What happened?', '', 'text', function(v) { thenWhat('other', v); }); return; }
            thenWhat(r.key, null);
          };
          list.appendChild(b);
        });
        var did = document.createElement('button'); did.type = 'button'; did.id = 'myday-miss-did';
        did.style.cssText = 'background:none;border:none;color:var(--gold);font-size:14px;cursor:pointer;min-height:40px;text-align:left;padding:4px 0;';
        did.textContent = '✓ I did do it — log it';
        // Oct 27 2026 fix: for 🌅 Morning this used to log only a time entry,
        // so the Morning routine itself stayed "not done" every day. Now it
        // ticks the Morning tasks for that day; a block still logs I just did.
        // One tap only, and a failed save says so.
        did.onclick = function() {
          did.disabled = true; did.textContent = 'Saving…';
          var at = new Date(new Date(it.day + 'T00:00:00').getTime() + it.to * 60000).toISOString();
          var p;
          if (it.kind === 'morning') {
            var tasks = (L.dayParts(it.day).be.morning.tasks || []).filter(function(r) { var lg = L.todayLog(r, self._logs || [], it.day); return !lg || lg.status !== 'completed'; });
            p = tasks.reduce(function(q, r) { return q.then(function() { return L.tick(r, { at: at }); }); }, Promise.resolve());
          } else if (dn) {
            var realms = it.block && it.block.realm ? [it.block.realm] : [];
            p = Promise.resolve(dn.logic.justDid(it.label, Math.max(1, it.to - it.from), realms, new Date(at).getTime())).then(function() { try { dn.ui._refresh(); } catch (x) {} });
          } else p = Promise.resolve();
          p.then(function() { RPGACE.utils.toast('✅ Logged: ' + it.label, '#4caf82', 2000); next(); })
            .catch(function(e) { did.disabled = false; did.textContent = '✓ I did do it — log it'; fail(e); });
        };
        list.appendChild(did);
      };
      show();
      return pop;
    },
    // Opens by itself when My Day is shown and something was missed (once
    // per set of items per visit, so it never nags in a loop).
    _maybeMissed: function() {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (document.getElementById('myday-missed') || document.getElementById('myday-morning') || !RPGACE.sb || !RPGACE.sb.select) return;
      var today = L.iso(), n = new Date(), nowMin = n.getHours() * 60 + n.getMinutes();
      Promise.all([L.load(), L.loadTimings(), L.loadMisses(), L.loadDid(today)]).then(function(r) {
        var items = L.missedItems(today, (r[3] && r[3].did) || [], nowMin);
        var key = items.map(function(x) { return x.kind + ':' + (x.block ? x.block.id : x.day); }).join(',');
        if (!items.length || self._missedAsked === key || document.getElementById('myday-missed')) return;
        self._missedAsked = key;
        self.ui.openMissed(items);
      }).catch(function() {});
    },
    // ── MD-8 Did blocks on the Daily Schedule ───────────────────────────
    // Under the 24-hour list (today and past days): ✅ What you did, one row
    // per merged realm run, with the planned block it lines up with.
    didSection: function(grid, day) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc, xs = RPGACE.modules.xpSeason;
      var old = document.getElementById('sched-did'); if (old) old.remove();
      if (!grid || !grid.parentNode || day > L.iso() || !RPGACE.sb || !RPGACE.sb.select) return;
      var box = document.createElement('div'); box.id = 'sched-did'; box.dataset.day = day;
      box.style.cssText = 'margin:16px 0 0;border:1px solid rgba(61,170,110,0.3);border-radius:8px;padding:10px 12px;background:rgba(61,170,110,0.06);';
      box.innerHTML = '<div style="font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#3DAA6E;">✅ What you did</div><div class="sched-did-body" style="font-size:12px;color:var(--muted);margin-top:4px;">Loading…</div>';
      grid.parentNode.insertBefore(box, grid.nextSibling);
      L.loadDid(day).then(function(m) {
        if (!box.isConnected || box.dataset.day !== day) return;
        var body = box.querySelector('.sched-did-body'); body.innerHTML = '';
        // UI Debloat: an empty day shows no box at all.
        if (!m.did.length) { box.remove(); return; }
        m.did.forEach(function(b) {
          var R = (xs && xs.REALMS[b.realm]) || { icon: '✨', name: b.realm };
          var plan = m.planned.filter(function(p) { var a = L.toMin(p.start_time); return a != null && a < b.to && a + (Number(p.mins) || 30) > b.from; })[0];
          var r = document.createElement('div'); r.className = 'sched-did-row'; r.dataset.realm = b.realm;
          r.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 0;border-bottom:1px solid rgba(61,170,110,0.15);font-family:Rajdhani,sans-serif;';
          r.innerHTML = '<span style="font-size:12px;color:rgba(226,226,236,0.55);min-width:92px;font-variant-numeric:tabular-nums;">' + L.fmtMin(b.from) + '–' + L.fmtMin(b.to) + '</span>' +
            '<span style="flex:1;min-width:180px;font-size:13px;color:#E2E2EC;"><b>' + esc(R.icon + ' ' + R.name) + '</b> · ' + esc(L.didText(b)) +
            (plan ? '<br><span style="font-size:11px;color:rgba(226,226,236,0.5);">planned ' + esc(L.blockLabel(plan)) + ' ' + esc(String(plan.start_time).slice(0, 5)) + '</span>' : '') + '</span>';
          body.appendChild(r);
        });
        if (m.vs.length) {
          var vs = document.createElement('div'); vs.className = 'sched-did-vs';
          vs.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.6);margin-top:6px;line-height:1.5;font-variant-numeric:tabular-nums;';
          vs.textContent = 'Planned vs did: ' + L.vsLine(m.vs);
          body.appendChild(vs);
        }
      }).catch(function(e) { var body = box.querySelector('.sched-did-body'); if (body) body.textContent = 'Could not load: ' + (e.message || e); });
    },
    // Schedule add form: warn before saving on top of a shift / travel.
    // Use HH:MM moves it to the nearest free time; Save anyway keeps it.
    schedClashWarn: function(clash, freeAt, onUse, onAnyway) {
      var L = RPGACE.modules.myDay.logic, old = document.getElementById('sched-clash');
      if (old) old.remove();
      var tpl = document.getElementById('sched-tpl-box');
      if (!tpl) return false;
      var w = document.createElement('div'); w.id = 'sched-clash';
      w.style.cssText = 'border:1px solid #e0a84c;background:rgba(224,168,76,0.1);border-radius:8px;padding:10px 12px;font-family:Rajdhani,sans-serif;font-size:13px;color:#E2E2EC;';
      var t = document.createElement('div'); t.style.cssText = 'font-weight:700;color:#e0a84c;margin-bottom:6px;';
      t.textContent = '⚠ That clashes with ' + (clash.kind === 'shift' ? 'your shift' : 'your ' + clash.label.toLowerCase()) + ' (' + L.fmtMin(clash.from) + '–' + L.fmtMin(clash.to) + ').';
      w.appendChild(t);
      var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      var bs = 'min-height:40px;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;';
      if (freeAt != null) {
        var u = document.createElement('button'); u.type = 'button'; u.id = 'sched-clash-use';
        u.style.cssText = bs + 'background:#e0a84c;border:none;color:#111;';
        u.textContent = 'Use ' + L.fmtMin(freeAt) + ' instead';
        u.onclick = function() { w.remove(); onUse(freeAt); };
        row.appendChild(u);
      }
      var a = document.createElement('button'); a.type = 'button'; a.id = 'sched-clash-anyway';
      a.style.cssText = bs + 'background:none;border:1px solid rgba(255,255,255,0.2);color:#E2E2EC;';
      a.textContent = 'Save anyway';
      a.onclick = function() { w.remove(); onAnyway(); };
      row.appendChild(a); w.appendChild(row);
      tpl.parentNode.insertBefore(w, tpl);
      if (w.scrollIntoView) w.scrollIntoView({ block: 'nearest' });
      return true;
    },
    // ── MD-7 Schedule → My Day ──────────────────────────────────────────
    // Today: open My Day and bring that block (or the Morning/Night card)
    // into view with a short highlight. Another day: open Plan my day for it.
    openFromSchedule: function(row, isoDate) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      if (isoDate && isoDate !== L.iso()) { Promise.all([L.load(), L.loadTimings()]).then(function() { U.openPlan(isoDate); }).catch(function() { U.openPlan(isoDate); }); return; }
      // My Day redraws as it opens, so the highlight is applied after each
      // draw (ui._applyFlash, called at the end of render) for a few seconds.
      self._flash = { sel: row.type === 'bookend' ? '#myday-bookend-' + row.which : '[data-id="' + String(row.source_id || '').replace(/"/g, '') + '"]', until: Date.now() + 4000, scrolled: false };
      self.open();
      setTimeout(function() { U._applyFlash(); }, 600);
    },
    _applyFlash: function() {
      var self = RPGACE.modules.myDay, f = self._flash;
      if (!f || Date.now() > f.until) { self._flash = null; return; }
      var el = document.querySelector('#myday-panel ' + f.sel);
      if (!el) return;
      if (!f.scrolled && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.scrolled = true; }
      el.style.outline = '2px solid var(--gold)';
      setTimeout(function() { el.style.outline = ''; }, 2500);
    },
    // ── MD-6 evening review ─────────────────────────────────────────────
    // One screen: what got done, what didn't (Tomorrow / Drop / Skip, or
    // Move all), the 🌙 Night tasks, one line about today -> Journal.
    // ── Day Bookends (Oct 27 2026): one button, ☀️ I'm up / 🌙 Going to bed,
    // on the dashboard (#dd-ld-daybtn) and My Day's Now/Next card.
    dayButton: function(host) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      if (!host) return;
      host.classList.add('myday-daybtn-host');
      var paint = function() {
        host.innerHTML = '';
        var up = L.awake(L.dayState());
        var b = U._btn(up ? '🌙 Going to bed' : '☀️ I\'m up', up ? '' : 'primary');
        b.className += ' myday-daybtn'; b.dataset.state = up ? 'awake' : 'asleep';
        b.style.minHeight = '44px';
        b.onclick = function() { b.disabled = true; (up ? U.goingToBed() : U.imUp()).then(function() { b.disabled = false; }, function() { b.disabled = false; }); };
        host.appendChild(b);
      };
      if (self._settings === undefined) L.loadTimings().then(paint, paint); else paint();
    },
    _refreshDayButtons: function() {
      var U = RPGACE.modules.myDay.ui;
      [].forEach.call(document.querySelectorAll('.myday-daybtn-host'), function(h) { U.dayButton(h); });
    },
    imUp: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      var bar = document.getElementById('myday-alarm'); if (bar) bar.remove();
      return Promise.all([L.load(), L.loadTimings()]).then(function() { return L.startDay(); }).then(function(res) {
        RPGACE.utils.toast('☀️ Day started at ' + L.fmtMin(L.nowMin()) + (res.by > 0 ? ' — your day moved ' + res.by + ' min later' : ''), 'var(--gold)', 3200);
        if (res.moved.length) U.undoToast(res.moved);
        if (res.failed.length) RPGACE.utils.toast('⚠️ No room left today for: ' + res.failed.join(', ') + ' — move it by hand', '#e0a84c', 5000, 'myDay');
        U._refreshDayButtons();
        try { if (document.getElementById('myday-panel')) U.render(); } catch (e) {}
        return L.reviewPending(res.prev, res.day).then(function(pend) {
          if (pend) U.openEvening({ day: pend, catchUp: true, onDone: function() { U.openMorning(); } });
          else U.openMorning();
        });
      }).catch(function(e) { RPGACE.utils.toast('⚠️ Day not started: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); throw e; });
    },
    goingToBed: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui;
      return Promise.all([L.load(), L.loadTimings()]).then(function() {
        var day = L.bedDay(L.dayState(), new Date());
        U.openEvening({ day: day, bed: true, onDone: function() { U.openGoodnight(day); } });
      }).catch(function(e) { RPGACE.utils.toast('⚠️ My Day could not load: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); throw e; });
    },
    // WF-3 (Oct 29 2026, Alex: "making those buttons in left nav would be awesome as action buttons bar ...
    // I tap it then actions above come as pop up to choose"): the ⚡ Actions pop-up, opened from the left menu.
    openActions: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, dd = RPGACE.modules.dashDeck, dn = RPGACE.modules.doingNow;
      var pop = dd._popup({ eyebrow: '⚡ Actions', title: 'What now?', accent: 'var(--gold)', width: '420px', closeLabel: 'Close' });
      pop.box.id = 'myday-actions';
      var list = document.createElement('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      var add = function(id, label, kind, fn) {
        var b = U._btn(label, kind); b.id = id; b.style.minHeight = '52px'; b.style.fontSize = '16px'; b.style.textAlign = 'left';
        b.onclick = function() { pop.close(); setTimeout(fn, 0); };
        list.appendChild(b);
      };
      var paint = function() {
        list.innerHTML = '';
        var up = L.awake(L.dayState());
        add('myday-act-day', up ? '🌙 Going to bed' : '☀️ I\'m up', up ? '' : 'primary', function() { (up ? U.goingToBed() : U.imUp()).catch(function() {}); });
        add('myday-act-brief', '☀️ Morning Brief', '', function() { dd._openMorningBrief(); });
        if (dn) {
          add('myday-act-live', '▶ Doing now', '', function() { dn.ui.openStart(); });
          add('myday-act-did', '✓ I just did', '', function() { dn.ui.openJustDid(); });
        }
        add('myday-act-evening', '🌙 Evening review', '', function() { U.openEvening(); });
      };
      pop.box.appendChild(list);
      if (self._settings === undefined) L.loadTimings().then(paint, paint); else paint();
      return pop;
    },
    // Oct 29 2026 (Alex: "when either selected, force stop rpgace saving all needed info before force stop"):
    // everything is already saved by now (review in journal, day_state + alarm by logic.endDay). A web app cannot
    // force-stop itself, so it asks the phone to close the window, and if the phone refuses it reloads to a fresh
    // copy - either way the morning starts on the newest code (the stale-copy problem from the alarm tests).
    _closeForNight: function() {
      if (RPGACE._noNightClose) return;
      setTimeout(function() {
        try { window.close(); } catch (e) {}
        setTimeout(function() { if (!window.closed) location.replace(location.pathname + '?slept=1'); }, 400);
      }, 2200);
    },
    // Going to bed, after the review: tomorrow's blocks, then the alarm.
    openGoodnight: function(day) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, esc = U._esc;
      var tmr = L.addDays(day, 1), now = new Date();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🌙 Good night', title: 'Tomorrow + alarm', accent: 'var(--gold)', width: '520px', closeLabel: 'Close' });
      pop.box.id = 'myday-goodnight';
      var tw = document.createElement('div'); tw.id = 'myday-gn-tomorrow';
      var drawTomorrow = function() {
        var bl = L.dayBlocks(tmr), sh = L.shiftsOn(tmr);
        tw.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;">📅 ' + esc(U._dayLabel(tmr)) + (sh.length ? ' · 🧑‍🍳 shift ' + esc(sh.map(function(x) { return x.start + '–' + x.end; }).join(', ')) : '') + '</div>' +
          (bl.length ? bl.map(function(b) { var f = L.toMin(b.start_time); return '<div class="myday-gn-block" style="font-size:13px;color:var(--text);padding:3px 0;"><b style="font-variant-numeric:tabular-nums;">' + L.fmtMin(f) + '</b> ' + esc(L.blockLabel(b)) + ((RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.typeLine(b) : '') ? ' <span style="color:var(--gold);">· ' + esc((RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.typeLine(b) : '')) + '</span>' : '') + ((b.items || []).length ? ' <span style="color:var(--muted);">· ' + esc(b.items.map(function(i) { return i.label; }).slice(0, 3).join(' · ')) + '</span>' : '') + '</div>'; }).join('')
            : '<div style="font-size:13px;color:var(--muted);">No blocks planned yet.</div>');
        var pl = U._btn('📋 Plan tomorrow', ''); pl.id = 'myday-gn-plan'; pl.style.marginTop = '6px';
        pl.onclick = function() { U.openPlan(tmr, { after: function() { L.load().then(drawTomorrow, drawTomorrow); } }); };
        tw.appendChild(pl);
      };
      pop.box.appendChild(tw);
      drawTomorrow();
      var aw = document.createElement('div'); aw.id = 'myday-gn-alarm-box';
      aw.style.cssText = 'margin-top:14px;padding-top:10px;border-top:1px solid var(--border);';
      aw.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;">⏰ Alarm</div><div id="myday-gn-why" style="font-size:12px;color:var(--muted);margin-bottom:6px;">Working it out…</div>';
      var tin = document.createElement('input'); tin.type = 'time'; tin.id = 'myday-gn-alarm';
      tin.setAttribute('aria-label', 'Alarm time');
      tin.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:18px;padding:6px 10px;min-height:44px;font-family:Rajdhani,sans-serif;';
      aw.appendChild(tin);
      var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:12px;';
      var none = U._btn('No alarm', ''); none.id = 'myday-gn-noalarm';
      var set = U._btn('⏰ Set alarm & sleep', 'primary'); set.id = 'myday-gn-set';
      var finish = function(at) {
        none.disabled = set.disabled = true;
        L.endDay(at).then(function() {
          pop.close();
          RPGACE.utils.toast('🌙 Good night' + (at ? ' — alarm ' + L.fmtMin(L.nowMin(at)) : '') + '. Saved — closing RPGACE', 'var(--gold)', 3000);
          U._refreshDayButtons();
          U._closeForNight();
        }).catch(function(e) { none.disabled = set.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
      };
      none.onclick = function() { finish(null); };
      set.onclick = function() {
        var m = L.toMin(tin.value); if (m == null) { RPGACE.utils.toast('Pick a time, or tap No alarm', '#e0a84c', 2500); return; }
        var n = new Date(), at = new Date(L.iso(n) + 'T00:00:00'); at.setMinutes(m);
        if (at <= n) at = new Date(at.getTime() + 86400000);
        finish(at);
      };
      row.appendChild(none); row.appendChild(set); aw.appendChild(row);
      pop.box.appendChild(aw);
      var hb = RPGACE.modules.healthBody;
      Promise.resolve(hb && hb.logic.signedIn() ? hb.logic.loadSettings().catch(function() { return {}; }) : {}).then(function(hs) {
        var sg = L.morningAlarm(tmr, now) || L.suggestAlarm(now, (hs || {}).sleep_target_h, L.shiftsOn, self._settings || {});
        tin.value = L.fmtMin(L.nowMin(sg.at));
        aw.querySelector('#myday-gn-why').textContent = 'Suggested: ' + sg.why + '. Change it if you need to.';
      });
      return pop;
    },
    // opts (Day Bookends): day = the day to review; bed = part of 🌙 Going
    // to bed (Skip review, then onDone -> Good night); catchUp = yesterday's
    // forgotten review offered on ☀️ I'm up (closing it also goes on).
    openEvening: function(opts) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, dd = RPGACE.modules.dashDeck, esc = U._esc;
      opts = opts || {};
      var day = opts.day || L.reviewDate(), flow = !!(opts.bed || opts.catchUp), went = false;
      var next = function() { if (went) return; went = true; if (opts.onDone) opts.onDone(); };
      var pop = dd._popup({ eyebrow: opts.catchUp ? '🌙 Yesterday\'s review' : '🌙 Evening review', title: new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), accent: 'var(--gold)', width: '600px', closeLabel: 'Close',
        onClose: opts.catchUp ? function() { setTimeout(next, 0); } : null });
      pop.box.id = 'myday-evening';
      var body = document.createElement('div'); body.id = 'myday-evening-body';
      body.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading your day…</div>';
      pop.box.appendChild(body);
      var moved = [], xpToday = 0, didM = null;
      var head = function(t) { var h = document.createElement('div'); h.style.cssText = 'font-size:13px;font-weight:700;color:var(--text);margin:12px 0 4px;'; h.textContent = t; return h; };
      var draw = function() {
        body.innerHTML = '';
        var m = L.eveningModel(day);
        var top = document.createElement('div'); top.id = 'myday-evening-score';
        top.style.cssText = 'font-size:14px;color:var(--text);font-variant-numeric:tabular-nums;';
        top.textContent = '✅ ' + m.done.length + ' done · ' + (m.open.length ? m.open.length + ' left' : 'nothing left') + (xpToday ? ' · +' + xpToday + ' XP today' : '');
        body.appendChild(top);
        if (m.done.length) {
          body.appendChild(head('✅ Done'));
          var ul = document.createElement('div'); ul.id = 'myday-evening-done';
          ul.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;';
          ul.innerHTML = m.done.map(function(d) { return '<div>' + esc(d.label) + (d.how ? ' <span style="color:var(--muted);">· ' + esc(d.how) + '</span>' : '') + '</div>'; }).join('');
          body.appendChild(ul);
        }
        // MD-8: planned vs did, per realm (blocks planned vs what you actually did).
        if (didM && didM.vs.length) {
          body.appendChild(head('⚖ Planned vs did'));
          var vs = document.createElement('div'); vs.id = 'myday-evening-vs';
          vs.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;font-variant-numeric:tabular-nums;';
          var xs = RPGACE.modules.xpSeason;
          vs.innerHTML = didM.vs.map(function(v) { var R = (xs && xs.REALMS[v.realm]) || { icon: '✨', name: v.realm };
            return '<div>' + esc(R.icon + ' ' + R.name) + ' <span style="color:var(--muted);">planned ' + v.planned + ' min · did ' + v.did + ' min</span></div>'; }).join('');
          body.appendChild(vs);
        }
        // AC-5: blocks that went by with nothing logged.
        var nmE = new Date(), missed = L.missedItems(day, didM ? didM.did : [], day === L.iso() ? nmE.getHours() * 60 + nmE.getMinutes() : 1440);
        if (missed.length) {
          body.appendChild(head('❓ What happened?'));
          var mb = document.createElement('div'); mb.id = 'myday-evening-missed';
          mb.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px;color:var(--text);';
          var ml = document.createElement('span'); ml.style.cssText = 'flex:1 1 160px;';
          ml.textContent = missed.map(function(x) { return x.label + ' ' + L.fmtMin(x.from); }).join(' · ');
          var mbtn = U._btn('Tell me (' + missed.length + ')', ''); mbtn.id = 'myday-evening-missed-btn';
          mbtn.onclick = function() { U.openMissed(missed, function() { L.loadMisses().then(draw); }); };
          mb.appendChild(ml); mb.appendChild(mbtn); body.appendChild(mb);
        }
        // DL-5: follow-ups still waiting ask why; ones skipped today show their reason.
        var rtm = RPGACE.modules.realmTasks;
        if (rtm && rtm._tasks) {
          var waitF = rtm.logic.pendingNext().filter(function(x) { return String(x.next_due_at).slice(0, 10) <= day; });
          var fw = document.createElement('div'); fw.id = 'myday-evening-followups';
          var paintF = function(skipped) {
            fw.innerHTML = '';
            if (!waitF.length && !skipped.length) return;
            fw.appendChild(head('⏭ Follow-ups'));
            waitF.forEach(function(x) {
              var r = document.createElement('div'); r.className = 'myday-evening-fu'; r.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0;font-size:13px;';
              var t = document.createElement('span'); t.style.cssText = 'flex:1 1 140px;'; t.textContent = x.title + (x.next_after ? ' — ' + x.next_after : '') + ' · still waiting';
              var w = U._btn('Why not?', ''); w.className += ' myday-evening-fu-why';
              w.onclick = function() { rtm.ui.openSkip(x, function() { waitF = waitF.filter(function(y) { return y !== x; }); load(); }); };
              r.appendChild(t); r.appendChild(w); fw.appendChild(r);
            });
            skipped.forEach(function(q) {
              var r = document.createElement('div'); r.className = 'myday-evening-fu-skipped'; r.style.cssText = 'font-size:13px;color:var(--muted);padding:4px 0;';
              r.textContent = 'Skipped: ' + q.name + ' — ' + (q.description || 'no reason');
              fw.appendChild(r);
            });
          };
          var load = function() {
            RPGACE.sb.select('quest_log', 'select=name,description,completed_at&quest_kind=eq.followup&status=eq.skipped&completed_at=gte.' + day + 'T00:00:00&completed_at=lte.' + day + 'T23:59:59')
              .then(function(r) { paintF(Array.isArray(r) ? r : []); }).catch(function() { paintF([]); });
          };
          body.appendChild(fw); load();
        }
        if (m.open.length) {
          body.appendChild(head('↘ Not done'));
          var box = document.createElement('div'); box.id = 'myday-evening-open';
          m.open.forEach(function(x) {
            var row = document.createElement('div'); row.className = 'myday-evening-item'; row.dataset.kind = x.kind;
            row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);';
            var t = document.createElement('span'); t.style.cssText = 'flex:1 1 130px;min-width:0;font-size:13px;'; t.textContent = x.label;
            row.appendChild(t);
            // Buttons stay together on one line, even on a phone.
            var btns = document.createElement('span'); btns.style.cssText = 'display:flex;gap:6px;flex:0 0 auto;';
            row.appendChild(btns);
            var act = function(label, a, note) {
              var b = U._btn(label, ''); b.style.minHeight = '40px'; b.dataset.act = a;
              b.onclick = function() {
                [].forEach.call(row.querySelectorAll('button'), function(y) { y.disabled = true; });
                L.eveningAct(x, a, day).then(function() { moved.push(note + ': ' + x.label); return L.load(); }).then(draw)
                  .catch(function(e) { [].forEach.call(row.querySelectorAll('button'), function(y) { y.disabled = false; }); RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 5000, 'myDay'); });
              };
              btns.appendChild(b);
            };
            if (x.kind === 'routine') { act('✓ Done', 'done', 'Done'); act('Skip', 'skip', 'Skipped'); }
            else if (x.kind === 'cooking') {
              var c = U._btn('🍳 Cooking', ''); c.style.minHeight = '40px';
              c.onclick = function() { pop.close(); U._openTool('cooking'); };
              btns.appendChild(c); act('Drop', 'drop', 'Dropped');
            } else { act('Tomorrow', 'tomorrow', 'Moved to tomorrow'); act('Drop', 'drop', 'Dropped'); }
            box.appendChild(row);
          });
          body.appendChild(box);
          var movable = m.open.filter(function(x) { return x.kind === 'once' || x.kind === 'realm' || x.kind === 'shopping'; });
          if (movable.length > 1) {
            var all = U._btn('➡ Move all ' + movable.length + ' to tomorrow', ''); all.id = 'myday-evening-moveall'; all.style.marginTop = '8px';
            all.onclick = function() {
              all.disabled = true;
              movable.reduce(function(p, x) { return p.then(function() { return L.eveningAct(x, 'tomorrow').then(function() { moved.push('Moved to tomorrow: ' + x.label); }); }); }, Promise.resolve())
                .catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 5000, 'myDay'); })
                .then(function() { return L.load(); }).then(draw);
            };
            body.appendChild(all);
          }
        }
        var dp = L.dayParts(day);
        if (dp.be.night.tasks.length) { body.appendChild(head('🌙 Night')); var nc = U.bookendCard('night', dp.be, L.iso()); nc.id = 'myday-evening-night'; body.appendChild(nc); }
        var lab = document.createElement('label'); lab.style.cssText = 'display:block;font-size:13px;color:var(--muted);margin-top:12px;';
        lab.textContent = opts.catchUp ? 'One line about that day (optional)' : 'One line about today (optional)';
        var ta = document.createElement('textarea'); ta.id = 'myday-evening-note'; ta.rows = 2;
        ta.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;font-family:Rajdhani,sans-serif;width:100%;box-sizing:border-box;resize:vertical;margin-top:4px;';
        lab.appendChild(ta); body.appendChild(lab);
        var bar = document.createElement('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:10px;';
        var rv = L.reviewTarget(new Date());
        if (rv && self._lastReview !== rv) {
          var wk = U._btn('📓 Weekly review', ''); wk.id = 'myday-evening-week';
          wk.onclick = function() { pop.close(); U.openReview(rv); };
          bar.appendChild(wk);
        }
        if (flow) {
          var sk = U._btn(opts.catchUp ? 'Skip' : 'Skip review', ''); sk.id = 'myday-evening-skip';
          sk.onclick = function() { pop.close(); next(); };
          bar.appendChild(sk);
        } else {
          var pl = U._btn('📋 Plan tomorrow', ''); pl.id = 'myday-evening-plan';
          pl.onclick = function() { pop.close(); U.openPlan(L.addDays(day, 1)); };
          bar.appendChild(pl);
        }
        var svLabel = opts.bed ? 'Save & next (+10 Mind)' : 'Save & finish (+10 Mind)';
        var sv = U._btn(svLabel, 'primary'); sv.id = 'myday-evening-save';
        sv.onclick = function() {
          sv.disabled = true; sv.textContent = 'Saving…';
          L.saveEvening(day, L.eveningText(L.eveningModel(day), xpToday, moved, ta.value, didM && didM.vs.length ? L.vsLine(didM.vs) : '')).then(function() {
            pop.close();
            RPGACE.utils.toast('🌙 Evening saved to your Journal · +10 Mind', '#4caf82', 2800);
            try { self.ui.render(); } catch (e) {}
            next();
          }).catch(function(e) { sv.disabled = false; sv.textContent = svLabel; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
        };
        bar.appendChild(sv); body.appendChild(bar);
      };
      var tp = RPGACE.modules.tripPlans;
      Promise.all([L.load(), L.loadTimings(),
        tp ? tp.logic.read('xp_events', 'select=xp&earned_on=eq.' + day + '&status=neq.removed').then(function(r) { xpToday = (Array.isArray(r) ? r : []).reduce(function(a, x) { return a + (Number(x.xp) || 0); }, 0); }).catch(function() {}) : null,
        L.loadDid(day).then(function(m) { didM = m; }).catch(function() {}),
        L.loadMisses()
      ]).then(draw).catch(function(e) { body.innerHTML = ''; var m = document.createElement('div'); m.style.color = '#CC4A4A'; m.textContent = 'My Day could not load: ' + (e.message || e); body.appendChild(m); });
      return pop;
    },
    // ── MD-4 focus timer bar ────────────────────────────────────────────
    // A bar along the bottom of every screen while a block timer runs.
    // Round changes beep/vibrate/toast once (in-app); the phone gets pushes.
    _focusTick: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, run = L.focusRun();
      var bar = document.getElementById('myday-focus');
      if (!run) { if (bar) bar.remove(); return; }
      var now = Date.now(), at = L.focusAt(run, now);
      if (at.done) {
        if (bar) bar.remove();
        L.stopFocus(true).then(function() { RPGACE.utils.toast('✅ ' + run.label + ' done · +' + self.BLOCK_BONUS_XP + ' XP — tick what you finished', '#4caf82', 5000); U._beep(); if (document.getElementById('myday-panel')) U.render(); })
          .catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
        return;
      }
      if (run.rung !== at.i) {
        var first = run.rung === -1;
        run.rung = at.i; L._saveRun(run);
        if (!first) { U._beep(); RPGACE.utils.toast(at.phase.kind === 'break' ? '☕ Break — ' + at.phase.mins + ' min' : '🎯 Round ' + at.phase.n + ' — focus ' + at.phase.mins + ' min', 'var(--gold)', 4000); }
      }
      if (run.method === 'timebox' && !run.warned && !run.pausedAt && at.left <= 300 && at.phase.mins > 10) { run.warned = true; L._saveRun(run); U._beep(); RPGACE.utils.toast('⏳ 5 minutes left', 'var(--gold)', 4000); }
      if (!bar) {
        bar = document.createElement('div'); bar.id = 'myday-focus'; bar.setAttribute('role', 'timer');
        bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:100000;display:flex;align-items:center;gap:8px;width:min(520px,calc(100vw - 32px));box-sizing:border-box;padding:8px 10px 8px 14px;border-radius:12px;border:1px solid var(--gold);background:var(--panel);color:var(--text);box-shadow:0 6px 24px rgba(0,0,0,.45);';
        var txt = document.createElement('div'); txt.className = 'myday-focus-txt'; txt.style.cssText = 'flex:1;min-width:0;font-size:13px;line-height:1.3;';
        var pb = U._btn('⏸', ''); pb.id = 'myday-focus-pause'; pb.setAttribute('aria-label', 'Pause or resume'); pb.style.minWidth = '44px';
        pb.onclick = function() { var r = L.focusRun(); (r && r.pausedAt ? L.resumeFocus() : L.pauseFocus()).then(function() { U._focusTick(); }); };
        var sb = U._btn('■ Stop', ''); sb.id = 'myday-focus-stop';
        var armed = false;
        sb.onclick = function() {
          if (!armed) { armed = true; sb.textContent = 'Stop?'; setTimeout(function() { armed = false; sb.textContent = '■ Stop'; }, 3000); return; }
          L.stopFocus(false).then(function(r) { var b = document.getElementById('myday-focus'); if (b) b.remove(); RPGACE.utils.toast('Stopped ' + (r ? r.label : '') + ' — time saved to Doing Now', 'var(--gold)', 2600); if (document.getElementById('myday-panel')) U.render(); });
        };
        bar.appendChild(txt); bar.appendChild(pb); bar.appendChild(sb);
        document.body.appendChild(bar);
      }
      var mm = Math.floor(at.left / 60), ss = at.left % 60;
      var focusN = run.phases.filter(function(p) { return p.kind === 'focus'; }).length;
      bar.querySelector('.myday-focus-txt').innerHTML = '<b style="color:var(--gold);font-variant-numeric:tabular-nums;">' + (run.pausedAt ? '⏸ ' : at.phase.kind === 'break' ? '☕ ' : '🎯 ') + mm + ':' + String(ss).padStart(2, '0') + '</b> ' +
        (at.phase.kind === 'break' ? 'break' : 'round ' + at.phase.n + '/' + focusN) + '<br><span style="color:var(--muted);">' + U._esc(run.label + ' · ' + self.METHODS[run.method].label) + '</span>';
      bar.querySelector('#myday-focus-pause').textContent = run.pausedAt ? '▶' : '⏸';
    },
    // ── MD-3 Plan my day: the day's planned blocks ──────────────────────
    plannedBlocks: function(box, isoDate, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var blocks = L.dayBlocks(isoDate);
      if (!blocks.length) return;
      var st = self._settings || {}, style = st.plan_style || 'none';
      var wrap = document.createElement('div');
      wrap.id = 'mdp-blocks';
      wrap.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-bottom:10px;';
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;margin-bottom:6px;';
      head.innerHTML = '<b style="font-size:14px;color:var(--text);">📅 Blocks planned for this day</b>';
      var sw = document.createElement('div'); sw.style.cssText = 'display:flex;gap:4px;'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Planning style');
      [['none', 'Off'], ['frog', '🐸 Frog'], ['135', '1-3-5']].forEach(function(o) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'mdp-style'; c.dataset.style = o[0]; c.textContent = o[1];
        c.setAttribute('aria-pressed', style === o[0] ? 'true' : 'false');
        c.style.cssText = 'min-height:36px;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' + (style === o[0] ? 'background:var(--gold);color:#111;border:none;' : 'background:none;border:1px solid var(--border);color:var(--text);');
        c.onclick = function() {
          if (style === o[0]) return;
          L.saveDaySettings({ plan_style: o[0] }).then(redraw).catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
        };
        sw.appendChild(c);
      });
      head.appendChild(sw);
      wrap.appendChild(head);
      var tip = document.createElement('div');
      tip.id = 'mdp-style-tip';
      tip.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:6px;line-height:1.5;';
      if (style === 'frog') {
        var fr = L.frogOf(isoDate);
        tip.textContent = fr ? '🐸 Frog: ' + fr.item.label + ' (' + L.blockLabel(fr.block) + ') — do it first.' : '🐸 Tap the hardest thing below to make it today\'s frog — you do it first.';
      } else if (style === '135') {
        var c = L.count135(blocks), lim = { big: 1, medium: 3, small: 5 };
        tip.innerHTML = '1-3-5: ' + ['big', 'medium', 'small'].map(function(k) { var over = c[k] > lim[k]; return '<span style="color:' + (over ? '#e0a84c' : 'var(--text)') + ';">' + k[0].toUpperCase() + k.slice(1) + ' ' + c[k] + '/' + lim[k] + '</span>'; }).join(' · ') +
          ' <span style="color:var(--muted);">(big = an hour+, medium = 20 min+)</span>';
      } else tip.textContent = 'Fill each block with what you\'ll actually do. Due Actions show up inside 📋 Plan block for their realm.';
      wrap.appendChild(tip);
      blocks.forEach(function(b) {
        var row = document.createElement('div');
        row.className = 'mdp-block'; row.dataset.id = b.id;
        row.style.cssText = 'padding:6px 0;border-top:1px solid var(--border);';
        var from = L.toMin(b.start_time), meth = b.kind === 'realm' ? self.METHODS[L.blockMethod(b)] : null;
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;';
        top.innerHTML = '<span style="font-size:14px;color:var(--text);"><b style="font-variant-numeric:tabular-nums;">' + L.fmtMin(from) + '–' + L.fmtMin(from + (Number(b.mins) || 30)) + '</b> ' + esc(L.blockLabel(b)) + (meth ? ' <span style="font-size:12px;color:var(--muted);">' + esc(meth.label) + '</span>' : '') + '</span>';
        if (b.kind === 'realm') {
          var pb = self.ui._btn('📋 Plan block', ''); pb.className = 'mdp-planblock'; pb.style.minHeight = '40px';
          pb.onclick = function() { self.ui.planBlock(b, isoDate, redraw); };
          top.appendChild(pb);
        }
        row.appendChild(top);
        var items = b.kind === 'realm' ? (b.items || []) : (b.kind === 'chores' || !b.kind) ? (b.routine_ids || []).map(function(id) { var r = (self._routines || []).filter(function(x) { return String(x.id) === String(id); })[0]; return r ? { label: r.title, mins: r.est_mins } : null; }).filter(Boolean) : (b.items || []);
        var list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;';
        var tln = (RPGACE.modules.realmTasks ? RPGACE.modules.realmTasks.logic.typeLine(b) : '');
        if (tln) list.innerHTML = '<span class="mdp-btypes" style="font-size:12px;color:var(--gold);">' + esc(tln) + '</span>';
        if (!items.length && !tln) list.innerHTML = '<span style="font-size:12px;color:#e0a84c;">No type yet — tap 📋 Plan block, or pick on ▶ Live now</span>';
        items.forEach(function(i) {
          var chip = document.createElement(style === 'frog' && b.kind === 'realm' ? 'button' : 'span');
          chip.className = 'mdp-bitem'; chip.dataset.key = L.itemKey(i);
          var sz = style === '135' ? ' · ' + L.sizeOf(i)[0].toUpperCase() : '';
          chip.textContent = (i.frog ? '🐸 ' : '') + i.label + (i.mins ? ' ' + i.mins + 'm' : '') + sz;
          chip.style.cssText = 'font-size:12px;padding:4px 8px;border-radius:12px;border:1px solid ' + (i.frog ? 'var(--gold)' : 'var(--border)') + ';background:none;color:var(--text);font-family:inherit;' + (chip.tagName === 'BUTTON' ? 'min-height:36px;cursor:pointer;' : '');
          if (chip.tagName === 'BUTTON') {
            chip.type = 'button';
            chip.onclick = function() { L.setFrog(isoDate, b.id, i.frog ? null : L.itemKey(i)).then(redraw).catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); }); };
          }
          list.appendChild(chip);
        });
        row.appendChild(list);
        wrap.appendChild(row);
      });
      box.appendChild(wrap);
    },
    // 📋 Plan block: the realm's best 3 first, "show more" for the rest.
    // GM-5 (Oct 28 2026, plan "Generic Missions"): pick a mission's context for
    // this block - its cards (untried first, "done N times"), or type your own
    // (saved as a card for next time), or decide later. Sets o.context /
    // o.context_id; cb() redraws the caller. GM-6: a recipe mission also gets
    // ✨ Generate (the Chef recipe engine, seeded with the mission + a card or
    // what's typed); Use saves it to My Recipes, makes it the block's planned
    // cook and puts missing items on a grocery list.
    pickContext: function(o, realm, cb, block) {
      var self = RPGACE.modules.myDay, rt = RPGACE.modules.realmTasks, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎯 ' + o.label, title: 'What is it about this time?', width: '440px' });
      pop.box.id = 'mdp-ctx';
      var done = function() { pop.close(); if (cb) cb(); };
      if (!rt) { pop.box.textContent = 'Realm tasks are not loaded.'; return pop; }
      var mission = { id: o.ref_id, realm: realm };
      var co = RPGACE.modules.cookingOracle, gen = o.context_kind === 'recipe' && co && co.logic && co.logic._generate;
      // GM-6: generate -> preview -> Use (save recipe, card, planned cook, groceries).
      var runGen = function(seed) {
        var desc = o.label + (seed ? ': ' + seed : '');
        pop.box.innerHTML = '<div id="mdp-ctx-wait" style="font-size:13px;color:var(--muted);">⏳ Asking Oracle for a recipe: ' + esc(desc) + '… (this can take a while)</div>';
        co.logic._generate(desc, 2, function(err, recipe, rawText) {
          if (err || !recipe) { pop.box.innerHTML = ''; var em = document.createElement('div'); em.id = 'mdp-ctx-err'; em.style.cssText = 'color:#CC4A4A;font-size:13px;margin-bottom:8px;'; em.textContent = '⚠️ ' + (err || 'No recipe came back'); pop.box.appendChild(em); var bk = self.ui._btn('Back', ''); bk.onclick = drawList; pop.box.appendChild(bk); return; }
          pop.box.innerHTML = '';
          var pv = document.createElement('div'); pv.id = 'mdp-ctx-preview'; pv.style.cssText = 'margin-bottom:10px;';
          var mins = (recipe.steps || []).reduce(function(m, x) { return m + (x.active_duration_min || 0) + (x.passive_duration_min || 0); }, 0);
          pv.innerHTML = '<div style="font-weight:700;font-size:15px;">' + esc(recipe.title || desc) + '</div><div style="font-size:12px;color:var(--muted);">' + esc((recipe.ingredients || []).length + ' ingredients' + (mins ? ' · about ' + mins + ' min' : '')) + '</div>'
            + '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' + esc((recipe.ingredients || []).slice(0, 8).map(function(i) { return i.name; }).join(', ')) + '</div>';
          pop.box.appendChild(pv);
          var use = self.ui._btn('Use this recipe', 'primary'); use.id = 'mdp-ctx-use'; use.style.width = '100%';
          use.onclick = function() {
            use.disabled = true; use.textContent = '⏳ Saving…';
            new Promise(function(res, rej) { co.logic._save(recipe, rawText, false, function(e, id) { if (e) rej(new Error(e)); else res(id); }); })
              .then(function(recipeId) {
                RPGACE.cache.clear('recipes');
                return rt.logic.addContext(mission, { title: recipe.title || desc, detail: seed || null, source: 'generated', recipe_id: recipeId })
                  .then(function(c) { o.context = (c && c.title) || recipe.title; o.context_id = (c && c.id) || null; o.recipe_id = String(recipeId); })
                  .then(function() { return block && block.id ? co.logic.planMissionCook(recipeId, block) : null; });
              })
              .then(function(made) {
                RPGACE.utils.toast('🍳 ' + o.context + (made ? ' saved, planned for this block' + (made.listId ? ', missing items on your grocery list' : '') : ' saved to My Recipes'), '#4caf82', 3200);
                done();
              })
              .catch(function(e) { use.disabled = false; use.textContent = 'Use this recipe'; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
          };
          pop.box.appendChild(use);
          var again = self.ui._btn('Try again', ''); again.id = 'mdp-ctx-again'; again.style.cssText += 'width:100%;margin-top:6px;'; again.onclick = function() { runGen(seed); };
          pop.box.appendChild(again);
          var bk2 = self.ui._btn('Back', ''); bk2.style.cssText += 'width:100%;margin-top:6px;'; bk2.onclick = drawList; pop.box.appendChild(bk2);
        });
      };
      var drawList;
      // GM-7: pick from Alex's own data; an existing card with the same name is reused, not duplicated.
      var usePicked = function(row, cards) {
        var k = String(row.title).toLowerCase().trim(), ex = (cards || []).filter(function(c) { return String(c.title).toLowerCase().trim() === k; })[0];
        var p = ex ? Promise.resolve(ex) : rt.logic.addContext(mission, { title: row.title, detail: row.detail || null, source: 'picked', source_ref: row.ref || null });
        return p.then(function(c) { o.context = (c && c.title) || row.title; o.context_id = (c && c.id) || null; o.recipe_id = null; done(); })
          .catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      var openSource = function(def, cards) {
        if (o.context_kind === 'combo') {
          var ex = RPGACE.modules.exerciseLibrary;
          if (!ex) { RPGACE.utils.toast('⚠️ Exercise library is not loaded', '#CC4A4A', 3000); return; }
          ex.ui.pickCombo(pop.box, function(row) { usePicked(row, cards); }, drawList);
          return;
        }
        pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading…</div>';
        rt.logic.sourceItems(o.context_kind).then(function(items) {
          pop.box.innerHTML = '';
          RPGACE.kit.pickList(pop.box, items, function(x) { usePicked(x, cards); }, { id: 'mdp-src', itemClass: 'mdp-src-item', empty: def.empty });   // CK-6
          var bk = self.ui._btn('Back', ''); bk.style.cssText += 'width:100%;margin-top:6px;'; bk.onclick = drawList; pop.box.appendChild(bk);
        });
      };
      pop.box.textContent = 'Loading…';
      drawList = function() { rt.logic.loadContexts(o.ref_id).then(function(rows) {
        var cards = rt.logic.rankContexts(rows);
        pop.box.innerHTML = '';
        var hint = document.createElement('div'); hint.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;';
        hint.textContent = cards.length ? 'Untried ones first.' : 'No cards yet for this mission. Type one below; it is saved for next time.';
        pop.box.appendChild(hint);
        cards.forEach(function(c) {
          var bt = self.ui._btn('', ''); bt.className += ' mdp-ctx-card'; bt.dataset.id = c.id;
          bt.style.cssText += 'display:block;width:100%;text-align:left;margin:4px 0;';
          bt.innerHTML = esc(c.title) + '<br><span style="font-size:12px;color:var(--muted);">' + esc((c.times_done ? 'done ' + c.times_done + ' time' + (c.times_done === 1 ? '' : 's') : 'not tried yet') + (c.source === 'video' ? ' · from a video' : '')) + '</span>';
          bt.onclick = function() { o.context = c.title; o.context_id = c.id; o.recipe_id = c.recipe_id || null; done(); };
          if (!gen) { pop.box.appendChild(bt); return; }
          var cr = document.createElement('div'); cr.style.cssText = 'display:flex;gap:6px;align-items:stretch;';
          bt.style.flex = '1'; bt.style.minWidth = '0';
          var g1 = self.ui._btn('✨', ''); g1.className += ' mdp-ctx-gen1'; g1.title = 'Generate a recipe for this'; g1.style.margin = '4px 0';
          g1.onclick = function() { runGen(c.title); };
          cr.appendChild(bt); cr.appendChild(g1); pop.box.appendChild(cr);
        });
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin:10px 0 6px;';
        var inp = document.createElement('input'); inp.type = 'text'; inp.id = 'mdp-ctx-own'; inp.placeholder = 'Type your own, e.g. pork belly';
        inp.style.cssText = 'flex:1;min-width:0;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;font-family:inherit;';
        var add = self.ui._btn('Use', 'primary'); add.id = 'mdp-ctx-add';
        add.onclick = function() {
          var v = inp.value.trim(); if (!v) return;
          add.disabled = true;
          rt.logic.addContext(mission, { title: v, source: 'typed' }).then(function(c) { o.context = c.title || v; o.context_id = c.id || null; o.recipe_id = null; done(); })
            .catch(function(e) { add.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
        };
        row.appendChild(inp); row.appendChild(add); pop.box.appendChild(row);
        var srcDef = rt.logic.CONTEXT_SOURCES && rt.logic.CONTEXT_SOURCES[o.context_kind];
        if (srcDef) {
          var sb = self.ui._btn(srcDef.label, ''); sb.id = 'mdp-ctx-src'; sb.style.cssText += 'width:100%;margin-bottom:6px;';
          sb.onclick = function() { openSource(srcDef, cards); };
          pop.box.appendChild(sb);
        }
        if (gen) {
          var gb = self.ui._btn('✨ Generate a recipe', ''); gb.id = 'mdp-ctx-gen'; gb.style.cssText += 'width:100%;margin-bottom:6px;';
          gb.title = 'Uses what you typed above, or just the mission';
          gb.onclick = function() { runGen(inp.value.trim()); };
          pop.box.appendChild(gb);
        }
        var later = self.ui._btn('Decide later', ''); later.id = 'mdp-ctx-later'; later.style.width = '100%';
        later.onclick = done;
        pop.box.appendChild(later);
      }).catch(function(e) { pop.box.textContent = '⚠️ ' + (e.message || e); }); };
      drawList();
      return pop;
    },
    planBlock: function(b, isoDate, onDone) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📋 Plan block', title: L.blockLabel(b) + ' · ' + b.start_time, width: '480px' });
      pop.box.id = 'mdp-planblock';
      pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading…</div>';
      L.blockOptions(b, isoDate).then(function(opts) {
        var pick = {}, showAll = false, own = [], rt = RPGACE.modules.realmTasks;
        var agenda = Array.isArray(b.types) ? b.types.slice() : [];
        (b.items || []).forEach(function(i) { pick[L.itemKey(i)] = i; });
        // GM-5: a re-opened block keeps each mission's chosen context.
        opts.forEach(function(o) { var i = pick[o.key]; if (i && i.context && !o.context) { o.context = i.context; o.context_id = i.context_id || null; o.recipe_id = i.recipe_id || null; } });
        var draw = function() {
          pop.box.innerHTML = '';
          // Realm Tasks (Oct 27 2026): the block's main type(s) - Alex: "i pick
          // a main agenda - if done can always pick more to add" (on Live now).
          if (b.kind === 'realm' && rt && rt.logic.types(b.realm).length) {
            var ah = document.createElement('div'); ah.style.cssText = 'font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;';
            ah.textContent = '⭐ Main type for this block (optional, up to 2)';
            var ac = document.createElement('div'); ac.id = 'mdp-pb-types'; ac.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
            rt.logic.types(b.realm).forEach(function(ty) {
              var on = agenda.indexOf(ty.key) !== -1, c = document.createElement('button'); c.type = 'button'; c.className = 'mdp-pb-type'; c.dataset.type = ty.key;
              c.textContent = (ty.icon ? ty.icon + ' ' : '') + ty.label; c.setAttribute('aria-pressed', on ? 'true' : 'false');
              c.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:18px;font-size:13px;cursor:pointer;font-family:inherit;' + (on ? 'background:var(--gold);color:#111;border:1px solid var(--gold);font-weight:700;' : 'background:none;color:var(--text);border:1px solid var(--border);');
              c.onclick = function() { var j = agenda.indexOf(ty.key); if (j !== -1) agenda.splice(j, 1); else { agenda.push(ty.key); if (agenda.length > 2) agenda.shift(); } draw(); };
              ac.appendChild(c);
            });
            pop.box.appendChild(ah); pop.box.appendChild(ac);
            var tl = document.createElement('div'); tl.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;';
            tl.textContent = 'Or pick specific tasks below (optional) — inside the block, ▶ Live now shows your main type first.';
            pop.box.appendChild(tl);
          }
          var info = document.createElement('div'); info.id = 'mdp-pb-mins';
          var chosen = Object.keys(pick).map(function(k) { return pick[k]; });
          var mins = chosen.reduce(function(a, i) { return a + (Number(i.mins) || 15); }, 0), len = Number(b.mins) || 30;
          info.style.cssText = 'font-size:13px;margin-bottom:8px;color:' + (mins > len ? '#e0a84c' : 'var(--muted)') + ';';
          info.textContent = chosen.length + ' picked · about ' + mins + ' of ' + len + ' min' + (mins > len ? ' — more than the block holds' : '');
          pop.box.appendChild(info);
          var shown = showAll ? opts : opts.slice(0, 3);
          opts.filter(function(o) { return pick[o.key]; }).forEach(function(o) { if (shown.indexOf(o) === -1) shown = shown.concat([o]); });
          shown.forEach(function(o, n) {
            var lab = document.createElement('label');
            lab.className = 'mdp-pb-item'; lab.dataset.key = o.key;
            lab.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);min-height:44px;cursor:pointer;font-size:14px;color:var(--text);';
            var why = o.score >= 3 ? 'due today' : o.src === 'book' ? 'a book you\'re reading' : o.earns === 'real' ? '⚡ ' + (o.how || 'earns from the real thing') : '+' + (o.earns === 'xp' && o.xp ? o.xp : self.TICK_XP) + ' XP on tick';
            lab.innerHTML = '<input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (pick[o.key] ? ' checked' : '') + '><span style="flex:1;min-width:0;">' + (n < 3 && !showAll ? '<b>' : '') + esc(o.label) + (n < 3 && !showAll ? '</b>' : '') +
              '<br><span style="font-size:12px;color:var(--muted);">' + esc((o.mins ? o.mins + ' min · ' : '') + why) + '</span></span>';
            lab.querySelector('input').onchange = function(ev) {
              if (!ev.target.checked) { delete pick[o.key]; draw(); return; }
              pick[o.key] = o;
              // GM-5: a mission asks what it is about this time.
              if (o.context_kind && !o.context) self.ui.pickContext(o, b.realm, function() { draw(); }, b); else draw();
            };
            pop.box.appendChild(lab);
            if (o.context_kind && pick[o.key]) {
              var cx = document.createElement('button'); cx.type = 'button'; cx.className = 'mdp-pb-ctx'; cx.dataset.key = o.key;
              cx.textContent = o.context ? '🎯 ' + o.context + ' · change' : '🎯 Pick what it is about';
              cx.style.cssText = 'display:block;width:100%;text-align:left;min-height:40px;margin:2px 0 6px 30px;padding:6px 10px;background:none;border:1px dashed var(--gold);border-radius:8px;color:var(--gold);font-size:13px;cursor:pointer;font-family:inherit;max-width:calc(100% - 30px);';
              cx.onclick = function() { self.ui.pickContext(o, b.realm, function() { draw(); }, b); };
              pop.box.appendChild(cx);
            }
          });
          if (!showAll && opts.length > 3) {
            var more = document.createElement('button'); more.type = 'button'; more.id = 'mdp-pb-more';
            more.textContent = 'Show ' + (opts.length - 3) + ' more';
            more.style.cssText = 'min-height:40px;margin:6px 0;background:none;border:1px dashed var(--border);border-radius:8px;color:var(--muted);cursor:pointer;width:100%;font-family:inherit;';
            more.onclick = function() { showAll = true; draw(); };
            pop.box.appendChild(more);
          }
          var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin:8px 0;';
          var inp = document.createElement('input'); inp.type = 'text'; inp.id = 'mdp-pb-own'; inp.placeholder = 'Something else…';
          inp.style.cssText = 'flex:1;min-width:0;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;font-family:inherit;';
          var addB = self.ui._btn('+ Add', ''); addB.id = 'mdp-pb-add';
          addB.onclick = function() { var v = inp.value.trim(); if (!v) return; var o = { src: 'own', label: v, mins: 15, earns: 'tick' }; o.key = L.itemKey(o); pick[o.key] = o; opts.push(Object.assign({ score: 0 }, o)); showAll = true; draw(); };
          row.appendChild(inp); row.appendChild(addB);
          pop.box.appendChild(row);
          var ok = self.ui._btn('Save block', 'primary'); ok.id = 'mdp-pb-save'; ok.style.width = '100%';
          ok.onclick = function() {
            ok.disabled = true;
            var keepFrog = {}; (b.items || []).forEach(function(i) { if (i.frog) keepFrog[L.itemKey(i)] = 1; });
            var items = opts.filter(function(o) { return pick[o.key]; }).map(function(o) { return Object.assign({}, o, { frog: !!keepFrog[o.key] }); });
            var same = JSON.stringify(agenda) === JSON.stringify(Array.isArray(b.types) ? b.types : []);
            var saveTypes = b.kind !== 'realm' || same ? Promise.resolve() : RPGACE.sb.secureWrite('chore_blocks', 'update', { types: agenda }, 'id=eq.' + b.id).then(function() { b.types = agenda.slice(); RPGACE.cache.clear('chore_blocks'); });
            saveTypes.then(function() { return L.saveBlockItems(b, items); }).then(function() { pop.close(); RPGACE.utils.toast('📋 ' + L.blockLabel(b) + ' planned', '#4caf82', 2000); if (onDone) onDone(); self.ui.render(); })
              .catch(function(e) { ok.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
          };
          pop.box.appendChild(ok);
        };
        draw();
      }).catch(function(e) { pop.box.innerHTML = ''; var m = document.createElement('div'); m.style.color = '#CC4A4A'; m.textContent = 'Could not load options: ' + (e.message || e); pop.box.appendChild(m); });
      return pop;
    },
    // ── MD-2 Plan week: one day's timeline ───────────────────────────────
    // Fixed things (shift, travel, Schedule items, 🌅/🌙) are grey; blocks are
    // dragged (whole block = move, top/bottom bar = change length). Edges stop
    // at the neighbour, else at Morning / Night (logic.dragLimits). Tap a
    // block for exact times, its method or to remove it.
    weekTimeline: function(box, ws, day, today, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc, xs = RPGACE.modules.xpSeason;
      box.id = 'myday-wtl';
      box.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:12px;';
      // day chips
      var chips = document.createElement('div');
      chips.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;';
      for (var i = 0; i < 7; i++) (function(d) {
        var c = document.createElement('button');
        c.type = 'button'; c.className = 'myday-wtl-day'; c.dataset.date = d;
        var n = (self._choreBlocks || []).filter(function(b) { return b.block_date === d && self.logic.blockLive(b); }).length;
        c.innerHTML = '<span style="display:block;font-size:11px;">' + 'MTWTFSS'[i] + '</span><span style="display:block;font-size:14px;">' + new Date(d + 'T12:00:00').getDate() + '</span><span style="display:block;font-size:10px;color:' + (d === day ? '#111' : 'var(--muted)') + ';">' + (n ? n + ' blk' : '·') + '</span>';
        c.style.cssText = 'min-height:52px;border-radius:8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;padding:2px 0;' +
          (d === day ? 'background:var(--gold);color:#111;border:1px solid var(--gold);' : 'background:none;color:var(--text);border:1px solid var(--border);') + (d < today ? 'opacity:.45;' : '');
        c.setAttribute('aria-pressed', d === day ? 'true' : 'false');
        c.onclick = function() { redraw(d); };
        chips.appendChild(c);
      })(L.addDays(ws, i));
      box.appendChild(chips);

      var dp = L.dayParts(day), st = dp.st || {};
      var gap = st.buffer_mins == null ? 10 : Number(st.buffer_mins) || 0;
      var segs = L.segments({ shifts: dp.shifts, sched: dp.sched, blocks: dp.blocks, bookends: dp.bookends, st: st });
      var past = day < today;
      // toolbar
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;';
      var add = self.ui._btn('+ Realm block', 'primary'); add.id = 'myday-wtl-add';
      add.disabled = past;
      add.onclick = function() {
        self.ui.pickRealmBlock(null, function(nx) {
          if (!nx.realm_items.length) return;
          var mins = Math.max(10, Math.min(480, nx.mins || 60));
          var at = L.nearestFree(segs, dp.be.morning.to || 480, mins);
          if (at == null) { RPGACE.utils.toast('⚠️ No free ' + mins + ' min on ' + self.ui._dayLabel(day), '#CC4A4A', 3500, 'myDay'); return; }
          L.saveRealmBlock(day, { realm: nx.realm, start: L.fmtMin(at), mins: mins, realm_items: nx.realm_items, method: L.methodFor(nx.realm) })
            .then(function() { RPGACE.utils.toast('✨ ' + nx.title + ' at ' + L.fmtMin(at) + ' — drag it to move', '#4caf82', 2600); redraw(); self.ui.render(); })
            .catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
        });
      };
      bar.appendChild(add);
      box.appendChild(bar);

      // the timeline
      var PX = 0.9;
      var startM = Math.min(360, segs.reduce(function(a, g) { return Math.min(a, g.from); }, 1440));
      var endM = Math.max(1440, segs.reduce(function(a, g) { return Math.max(a, g.to); }, 0));
      startM = Math.floor(startM / 60) * 60;
      var scroll = document.createElement('div');
      scroll.style.cssText = 'max-height:56vh;overflow-y:auto;border-radius:8px;background:rgba(255,255,255,0.02);';
      var lane = document.createElement('div');
      lane.id = 'myday-wtl-lane';
      lane.dataset.date = day;
      lane.style.cssText = 'position:relative;height:' + Math.round((endM - startM) * PX) + 'px;margin-left:44px;touch-action:pan-y;';
      for (var h = startM; h <= endM; h += 60) {
        var tick = document.createElement('div');
        tick.style.cssText = 'position:absolute;left:-44px;right:0;top:' + Math.round((h - startM) * PX) + 'px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:var(--muted);';
        tick.innerHTML = '<span style="position:absolute;left:0;top:-7px;width:38px;text-align:right;font-variant-numeric:tabular-nums;">' + L.fmtMin(h) + '</span>';
        lane.appendChild(tick);
      }
      var y = function(m) { return Math.round((m - startM) * PX); };
      segs.forEach(function(g) {
        if (g.kind === 'block' || g.kind === 'gap') return;
        var el = document.createElement('div');
        el.className = 'myday-wtl-fixed';
        el.dataset.kind = g.kind;
        var col = g.kind === 'bookend' ? 'rgba(224,168,76,0.12)' : g.kind === 'shift' ? 'rgba(204,74,74,0.16)' : 'rgba(255,255,255,0.07)';
        el.style.cssText = 'position:absolute;left:0;right:0;top:' + y(g.from) + 'px;height:' + Math.max(14, y(g.to) - y(g.from)) + 'px;background:' + col + ';border-radius:6px;padding:2px 8px;font-size:12px;color:var(--muted);overflow:hidden;box-sizing:border-box;';
        el.textContent = g.label + ' · ' + L.fmtMin(g.from) + '–' + L.fmtMin(g.to);
        lane.appendChild(el);
      });
      segs.filter(function(g) { return g.kind === 'block'; }).forEach(function(g) {
        var b = g.block, el = document.createElement('div');
        el.className = 'myday-wtl-block';
        el.dataset.id = b.id;
        var R = b.realm && xs && xs.REALMS[b.realm];
        var meth = self.METHODS[L.blockMethod(b)];
        el.style.cssText = 'position:absolute;left:6px;right:6px;top:' + y(g.from) + 'px;height:' + Math.max(28, y(g.to) - y(g.from)) + 'px;background:rgba(224,168,76,0.28);border:1px solid var(--gold);border-radius:8px;box-sizing:border-box;color:var(--text);font-size:13px;font-weight:700;padding:10px 10px;overflow:hidden;cursor:' + (past ? 'default' : 'grab') + ';touch-action:none;user-select:none;';
        var label = document.createElement('div');
        label.className = 'myday-wtl-label';
        var paintLabel = function(f, m) { label.textContent = g.label + ' · ' + L.fmtMin(f) + '–' + L.fmtMin(f + m) + (meth && b.kind === 'realm' ? ' · ' + meth.label : ''); };
        paintLabel(g.from, g.to - g.from);
        el.appendChild(label);
        var handle = function(edge) {
          var hd = document.createElement('div');
          hd.className = 'myday-wtl-h' + edge;
          hd.setAttribute('aria-label', edge === 's' ? 'Drag to change start' : 'Drag to change end');
          hd.style.cssText = 'position:absolute;left:0;right:0;height:14px;' + (edge === 's' ? 'top:0;' : 'bottom:0;') + 'cursor:ns-resize;display:flex;justify-content:center;align-items:center;';
          hd.innerHTML = '<span style="width:36px;height:4px;border-radius:2px;background:var(--gold);opacity:.8;"></span>';
          el.appendChild(hd);
          return hd;
        };
        var hs = handle('s'), he = handle('e');
        if (!past) {
          var drag = null;
          var down = function(mode) {
            return function(ev) {
              ev.preventDefault(); ev.stopPropagation();
              var from = L.toMin(b.start_time), mins = Number(b.mins) || 30;
              drag = { mode: mode, y0: ev.clientY, from: from, mins: mins, cur: { from: from, mins: mins }, moved: false,
                lim: L.dragLimits(segs, { id: b.id, from: from, to: from + mins }, gap) };
              try { el.setPointerCapture(ev.pointerId); } catch (e) {}
              el.style.cursor = 'grabbing';
            };
          };
          el.addEventListener('pointerdown', down('move'));
          hs.addEventListener('pointerdown', down('start'));
          he.addEventListener('pointerdown', down('end'));
          el.addEventListener('pointermove', function(ev) {
            if (!drag) return;
            var dm = (ev.clientY - drag.y0) / PX;
            if (Math.abs(ev.clientY - drag.y0) > 4) drag.moved = true;
            var r = drag.mode === 'end' ? L.clampDrag(drag.lim, drag.from, drag.mins + dm, 'end')
              : L.clampDrag(drag.lim, drag.from + dm, drag.mode === 'move' ? drag.mins : drag.mins - dm, drag.mode);
            drag.cur = r;
            el.style.top = y(r.from) + 'px'; el.style.height = Math.max(28, y(r.from + r.mins) - y(r.from)) + 'px';
            paintLabel(r.from, r.mins);
          });
          var up = function() {
            if (!drag) return;
            var d = drag; drag = null; el.style.cursor = 'grab';
            if (!d.moved) { self.ui.editWeekBlock(b, segs, gap, redraw); return; }
            L.commitDrag(b, d.cur.from, d.cur.mins).then(function(res) {
              if (!res) return;
              self.ui.dragUndo(g.label + ' → ' + L.fmtMin(res.from) + '–' + L.fmtMin(res.from + res.mins) + (res.pushed.length ? ' (moved ' + res.pushed.length + ' other)' : ''), redraw);
              redraw(); self.ui.render();
            }).catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); redraw(); });
          };
          el.addEventListener('pointerup', up);
          el.addEventListener('pointercancel', function() { drag = null; redraw(); });
        } else el.onclick = function() { self.ui.editWeekBlock(b, segs, gap, redraw); };
        lane.appendChild(el);
      });
      scroll.appendChild(lane);
      box.appendChild(scroll);
      setTimeout(function() { var mb = dp.be.morning; scroll.scrollTop = Math.max(0, y(mb.from || 420) - 20); }, 0);

      // realm methods
      var det = document.createElement('details');
      det.id = 'myday-wtl-methods';
      det.style.cssText = 'margin-top:10px;font-size:13px;color:var(--text);';
      det.innerHTML = '<summary style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--muted);">⚙️ How each realm is worked (default method)</summary>';
      (xs ? xs.ORDER : []).forEach(function(rk) {
        var R = xs.REALMS[rk], row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);';
        var sel = document.createElement('select');
        sel.className = 'myday-wtl-rm'; sel.dataset.realm = rk;
        sel.style.cssText = 'min-height:40px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:4px;font-family:Rajdhani,sans-serif;';
        sel.innerHTML = Object.keys(self.METHODS).map(function(k) { return '<option value="' + k + '"' + (L.methodFor(rk) === k ? ' selected' : '') + '>' + esc(self.METHODS[k].label) + '</option>'; }).join('');
        sel.onchange = function() {
          L.setRealmMethod(rk, sel.value).then(function() { RPGACE.utils.toast(R.icon + ' ' + R.name + ': ' + self.METHODS[sel.value].label, '#4caf82', 2000); })
            .catch(function(e) { RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); sel.value = L.methodFor(rk); });
        };
        row.innerHTML = '<span>' + R.icon + ' ' + esc(R.name) + '</span>';
        row.appendChild(sel);
        det.appendChild(row);
      });
      box.appendChild(det);
    },
    dragUndo: function(text, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, old = document.getElementById('myday-undo');
      if (old) old.remove();
      var bar = document.createElement('div'); bar.id = 'myday-undo'; bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:100001;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:8px 10px 8px 14px;border-radius:12px;border:1px solid var(--orange);background:var(--panel);color:var(--text);font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.4)';
      var t = document.createElement('span'); t.textContent = text;
      var b = self.ui._btn('↩ Undo', ''); b.id = 'myday-undo-btn'; b.style.minHeight = '40px';
      b.onclick = function() { b.disabled = true; L.undoMoves().then(function() { bar.remove(); RPGACE.utils.toast('↩ Put back', 'var(--gold)', 1800); if (redraw) redraw(); self.ui.render(); }, function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ Undo failed: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); }); };
      bar.appendChild(t); bar.appendChild(b); document.body.appendChild(bar);
      setTimeout(function() { if (bar.parentNode) bar.remove(); }, 10000);
    },
    // Tap a block: exact start / minutes, its method, or remove it.
    editWeekBlock: function(b, segs, gap, redraw) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: self.ui._dayLabel(b.block_date), title: L.blockLabel(b), width: '440px' });
      pop.box.id = 'myday-wtl-edit';
      var lim = L.dragLimits(segs, { id: b.id, from: L.toMin(b.start_time), to: L.toMin(b.start_time) + (Number(b.mins) || 30) }, gap);
      var info = document.createElement('div');
      info.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
      info.textContent = 'Free from ' + L.fmtMin(lim.lo) + ' to ' + L.fmtMin(lim.hi) + ' without moving anything.' + (b.items && b.items.length ? ' · ' + b.items.map(function(i) { return i.label; }).join(' · ') : '');
      pop.box.appendChild(info);
      var inCss = 'min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit;';
      var stIn = document.createElement('input'); stIn.type = 'time'; stIn.id = 'myday-wtl-start'; stIn.step = '300'; stIn.value = b.start_time; stIn.style.cssText = inCss;
      var mnIn = document.createElement('input'); mnIn.type = 'number'; mnIn.id = 'myday-wtl-mins'; mnIn.min = '10'; mnIn.max = '480'; mnIn.step = '5'; mnIn.value = b.mins; mnIn.style.cssText = inCss + 'width:100px;';
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;';
      row.appendChild(self.ui._field('Start', stIn)); row.appendChild(self.ui._field('Minutes', mnIn));
      var mSel = null;
      if (b.kind === 'realm') {
        mSel = document.createElement('select'); mSel.id = 'myday-wtl-method'; mSel.style.cssText = inCss;
        mSel.innerHTML = Object.keys(self.METHODS).map(function(k) { return '<option value="' + k + '"' + (L.blockMethod(b) === k ? ' selected' : '') + '>' + esc(self.METHODS[k].label) + '</option>'; }).join('');
        row.appendChild(self.ui._field('Method', mSel));
      }
      pop.box.appendChild(row);
      var err = document.createElement('div'); err.id = 'myday-wtl-err'; err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;margin-bottom:8px;';
      pop.box.appendChild(err);
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;';
      var rm = self.ui._btn('🗑 Remove block', ''); rm.id = 'myday-wtl-remove';
      var armed = false;
      rm.onclick = function() {
        if (!armed) { armed = true; rm.textContent = 'Tap again to remove'; setTimeout(function() { armed = false; rm.textContent = '🗑 Remove block'; }, 3000); return; }
        rm.disabled = true;
        L.cancelChoreBlock(b).then(function() { pop.close(); RPGACE.utils.toast('Block removed', 'var(--gold)', 1800); redraw(); self.ui.render(); })
          .catch(function(e) { rm.disabled = false; err.textContent = e.message || String(e); err.style.display = 'block'; });
      };
      var ok = self.ui._btn('Save', 'primary'); ok.id = 'myday-wtl-ok';
      ok.onclick = function() {
        var f = L.toMin(stIn.value), m = Math.round(Number(mnIn.value) || 0);
        if (f == null || m < 10 || m > 480) { err.textContent = 'Pick a start time and 10–480 minutes.'; err.style.display = 'block'; return; }
        ok.disabled = true;
        var oldFrom = L.toMin(b.start_time), oldMins = Number(b.mins) || 30;
        L.commitDrag(b, f, m).then(function(res) {
          if (mSel && mSel.value !== L.blockMethod(b)) return L.setBlockMethod(b, mSel.value).then(function() { return res; }, function(e) {
            throw new Error('Time saved, method not saved yet (needs a database update): ' + (e.message || e));
          });
          return res;
        }).then(function(res) {
          pop.close();
          if (res) self.ui.dragUndo(L.blockLabel(b) + ' → ' + L.fmtMin(res.from) + '–' + L.fmtMin(res.from + res.mins), redraw);
          redraw(); self.ui.render();
        }).catch(function(e) { ok.disabled = false; err.textContent = e.message || String(e); err.style.display = 'block'; if (L.toMin(b.start_time) !== oldFrom || Number(b.mins) !== oldMins) redraw(); });
      };
      bar.appendChild(rm); bar.appendChild(ok);
      pop.box.appendChild(bar);
      return pop;
    },
    // MD2-5: holiday / trip / event blocks.
    openBlocks: function(onChange) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: 'Time off, trips & events', width: '520px' });
      pop.box.id = 'myday-blocks';
      var draw = function() {
        pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.5;">Time off, trips and events. They show on the week planner. Time off counts as free (good days for actions); a trip or an all-day event blocks the day.</div>';
        var f = document.createElement('div');
        f.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px;';
        var title = document.createElement('input'); title.type = 'text'; title.id = 'myday-b-title'; title.placeholder = 'e.g. Time off';
        var kind = document.createElement('select'); kind.id = 'myday-b-kind';
        kind.innerHTML = Object.keys(self.BLOCK_KINDS).map(function(k) { return '<option value="' + k + '">' + self.BLOCK_KINDS[k] + ' ' + self.BLOCK_LABELS[k] + '</option>'; }).join('');
        var from = document.createElement('input'); from.type = 'date'; from.id = 'myday-b-from';
        var to = document.createElement('input'); to.type = 'date'; to.id = 'myday-b-to';
        var st = document.createElement('input'); st.type = 'time'; st.id = 'myday-b-st';
        var et = document.createElement('input'); et.type = 'time'; et.id = 'myday-b-et';
        f.appendChild(self.ui._field('What', title));
        f.appendChild(self.ui._field('Kind', kind));
        f.appendChild(self.ui._field('From', from));
        f.appendChild(self.ui._field('To', to));
        f.appendChild(self.ui._field('Start time (optional)', st));
        f.appendChild(self.ui._field('End time (optional)', et));
        pop.box.appendChild(f);
        var add = self.ui._btn('Add block', 'primary'); add.id = 'myday-b-add';
        add.onclick = function() {
          var p;
          try { p = L.addBlock({ title: title.value, kind: kind.value, start_date: from.value, end_date: to.value, start_time: st.value, end_time: et.value }); }
          catch (e) { RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'myDay'); return; }
          add.disabled = true;
          p.then(function() { RPGACE.utils.toast('Blocked: ' + title.value, '#4caf82', 2200); draw(); if (onChange) onChange(); })
            .catch(function(e) { add.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
        };
        pop.box.appendChild(add);
        var upcoming = self._blocks.filter(function(b) { return b.end_date >= L.iso(); });
        if (upcoming.length) self.ui._group(pop.box, 'Upcoming');
        upcoming.forEach(function(b) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);';
          row.innerHTML = '<div style="flex:1;min-width:0;font-size:14px;color:var(--text);">' + (self.BLOCK_KINDS[b.kind] || '⛔') + ' <b>' + esc(b.title) + '</b><br><span style="font-size:12px;color:var(--muted);">' +
            esc(self.ui._dayLabel(b.start_date) + (b.end_date !== b.start_date ? ' – ' + self.ui._dayLabel(b.end_date) : '') + (b.start_time ? ' · ' + b.start_time + (b.end_time ? '–' + b.end_time : '') : ' · all day')) + '</span></div>';
          var del = document.createElement('button');
          del.type = 'button'; del.textContent = 'Delete'; del.className = 'myday-b-del';
          del.style.cssText = 'min-height:36px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
          self.ui._armDelete(del, function() {
            del.disabled = true;
            L.removeBlock(b.id).then(function() { draw(); if (onChange) onChange(); }).catch(function(e) { del.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
          });
          row.appendChild(del);
          pop.box.appendChild(row);
        });
      };
      draw();
      return pop;
    },

    _group: function(parent, label) {
      var g = document.createElement('div');
      g.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin:12px 0 6px;';
      g.textContent = label;
      parent.appendChild(g);
    },

    // One routine row. missedDay set = a catch-up row for that earlier day.
    row: function(r, today, missedDay) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var log = missedDay ? null : L.todayLog(r, self._logs, today);
      if (r.cadence === 'next_time') log = null; // stays on the list until removed
      var isDone = log && log.status === 'completed', isSkip = log && log.status === 'skipped';
      var el = document.createElement('div');
      el.className = 'myday-row';
      el.dataset.id = r.id;
      el.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--panel);' + (log ? 'opacity:.6;' : '');
      var top = document.createElement('div');
      top.style.cssText = 'display:flex;align-items:center;gap:10px;';
      var tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'myday-tick';
      tick.setAttribute('aria-label', isDone ? 'Done' : 'Mark done');
      tick.textContent = isDone ? '✓' : isSkip ? '–' : '';
      tick.style.cssText = 'flex:0 0 auto;width:40px;height:40px;border-radius:50%;border:2px solid ' + (isDone ? 'var(--gold)' : 'var(--border)') + ';background:' + (isDone ? 'var(--gold)' : 'none') + ';color:#111;font-size:18px;font-weight:700;cursor:pointer;';
      var mid = document.createElement('div');
      mid.style.cssText = 'flex:1;min-width:0;';
      var streak = L.streak(r, self._logs, today);
      var meta = [];
      if (missedDay) meta.push('was due ' + new Date(missedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }));
      if (r.preferred_time) meta.push(r.preferred_time);
      var qe = RPGACE.modules.questEngine;
      var mins = qe && qe.estimateFor ? Math.round(qe.estimateFor('routine', String(r.id), r.est_mins)) : r.est_mins;
      meta.push('~' + mins + ' min');
      if (r.cadence === 'times_per_week') meta.push(L.doneThisWeek(r, self._logs, today) + '/' + (r.times_per_week || 1) + ' this week');
      if (r.cadence === 'once' && r.due_date && r.due_date < today) meta.push('overdue');
      if (r.cadence === 'every_days') {
        var cs = L.choreState(r, today), ld = L.lastDone(r);
        if (cs.overdue) meta.push('overdue ' + cs.overdue + ' day' + (cs.overdue === 1 ? '' : 's'));
        meta.push('every ' + (r.every_days || 1) + ' day' + ((r.every_days || 1) === 1 ? '' : 's'));
        meta.push(ld ? 'last done ' + (ld === today ? 'today' : self.ui._dayLabel(ld)) : 'not done yet');
      }
      // MD2-9: days since last done, coloured against this routine's rhythm.
      var zn = L.zone(r, today);
      if (zn && zn.zone && r.cadence !== 'every_days') meta.unshift(L.ZONE_DOT[zn.zone] + ' ' + (zn.days === 0 ? 'done today' : zn.days + 'd since'));
      else if (zn && zn.zone) meta.unshift(L.ZONE_DOT[zn.zone]);
      if (streak > 1) meta.push('🔥 ' + streak);
      if (isDone && log.description === 'minimum') meta.push('minimum');
      meta.push('+' + (r.xp || 0) + ' XP');
      var miss = missedDay || log ? 0 : L.missRun(r, self._logs, today);
      var kids = L.chainChildren(r).filter(function(c) { return c.active !== false; });
      mid.innerHTML = '<div style="font-size:15px;font-weight:700;color:var(--text);' + (isDone ? 'text-decoration:line-through;' : '') + '">' + esc((r.icon ? r.icon + ' ' : '') + r.title) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;">' + esc(meta.join(' · ')) + '</div>' +
        (miss ? '<div class="myday-miss" style="font-size:12px;color:#e0a84c;margin-top:2px;">' + (miss >= 2 ? '⚠ Missed twice — do the minimum today to restart' : '⚠ Missed last time — don\'t miss twice') + '</div>' : '') +
        (r.goal || r.minimum ? '<div style="font-size:12px;color:var(--text);opacity:.8;margin-top:2px;">' + (r.minimum ? '▫ Minimum: ' + esc(r.minimum) + (r.goal ? ' · ' : '') : '') + (r.goal ? '🎯 Goal: ' + esc(r.goal) : '') + '</div>' : '') +
        (kids.length ? '<div style="font-size:12px;color:var(--muted);margin-top:2px;">→ then ' + esc(kids.map(function(c) { return c.title; }).join(', ')) + '</div>' : '');
      top.appendChild(tick); top.appendChild(mid);
      el.appendChild(top);

      var tools = document.createElement('div');
      tools.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-left:50px;';
      var small = 'min-height:36px;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;background:none;border:1px solid var(--border);color:var(--text);';
      var mk = function(label, fn, cls) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = small; if (cls) b.className = cls; b.onclick = fn; tools.appendChild(b); return b; };
      var timerKey = 'timer_' + r.id;

      var redraw = function() { self.ui.render(); };
      var fail = function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); redraw(); };

      if (log) {
        mk('↶ Undo', function() { self.logic.undo(log).then(redraw).catch(fail); });
      } else {
        var started = L._ls(timerKey);
        var timerB = mk(started ? '⏱ ' + Math.max(0, Math.round((Date.now() - started) / 60000)) + ' min' : '▶ Start', function() {
          if (L._ls(timerKey)) { L._ls(timerKey, null); } else { L._ls(timerKey, Date.now()); }
          redraw();
        }, 'myday-timer');
        timerB.dataset.started = started || '';
        if (r.opens) {
          var t = self.TOOLS.filter(function(x) { return x.key === r.opens; })[0];
          mk('Open ' + (t ? t.label : r.opens), function() { self.ui._openTool(r.opens); });
        }
        if (r.minimum && !missedDay && r.cadence !== 'next_time') mk('▫ Did the minimum', function(ev) {
          ev.target.disabled = true;
          self.logic.tick(r, { minimum: true }).then(function() { L._ls(timerKey, null); }).then(redraw).catch(fail);
        }, 'myday-min');
        if (r.cadence !== 'next_time') mk('Skip', function() { self.logic.skip(r).then(redraw).catch(fail); });
      }
      // Oct 15 2026: edit a chosen routine straight from its row.
      if (!missedDay) mk('✏️ Edit', function() { self.ui.openEditor(r, r.id); }, 'myday-edit');

      var steps = Array.isArray(r.steps) ? r.steps : [];
      if (steps.length && !log) {
        var stepKey = 'steps_' + r.id + '_' + today;
        var ticked = L._ls(stepKey) || [];
        var sb = document.createElement('div');
        sb.style.cssText = 'padding-left:50px;margin-top:6px;display:flex;flex-direction:column;gap:2px;';
        steps.forEach(function(s, i) {
          var lab = document.createElement('label');
          lab.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);min-height:32px;cursor:pointer;';
          var cb = document.createElement('input');
          cb.type = 'checkbox'; cb.checked = ticked.indexOf(i) !== -1;
          cb.style.cssText = 'width:18px;height:18px;accent-color:var(--gold);';
          cb.onchange = function() {
            var cur = L._ls(stepKey) || [];
            if (cb.checked) { if (cur.indexOf(i) === -1) cur.push(i); } else cur = cur.filter(function(x) { return x !== i; });
            L._ls(stepKey, cur);
            if (cur.length === steps.length) RPGACE.utils.toast('All steps done — tick it off ✓', '#4caf82', 2200);
          };
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(s));
          sb.appendChild(lab);
        });
        el.appendChild(sb);
      }
      el.appendChild(tools);

      tick.onclick = function() {
        if (log) { self.logic.undo(log).then(redraw).catch(fail); return; }
        var st = L._ls(timerKey);
        var actual = st ? Math.max(1, Math.round((Date.now() - st) / 60000)) : null;
        tick.disabled = true;
        self.logic.tick(r, { actual: actual, startedAt: st ? new Date(st).toISOString() : null, note: missedDay ? 'catch-up' : null }).then(function() {
          L._ls(timerKey, null);
          if (r.cadence === 'next_time') return self.logic.remove(r.id).then(function() { return self.logic.load(); });
        }).then(redraw).catch(fail);
      };
      return el;
    },

    // Keeps running timers' minute labels fresh while the page is open.
    // MD-1: "Moved N blocks · ↩ Undo" for 10 seconds after a push.
    undoToast: function(moved) {
      var self = RPGACE.modules.myDay, L = self.logic, old = document.getElementById('myday-undo');
      if (old) old.remove();
      var bar = document.createElement('div'); bar.id = 'myday-undo'; bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:100001;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:8px 10px 8px 14px;border-radius:12px;border:1px solid var(--orange);background:var(--panel);color:var(--text);font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.4)';
      var t = document.createElement('span');
      t.textContent = 'Moved ' + moved.map(function(m) { return m.label + ' ' + (m.delta > 0 ? '+' : '') + m.delta + ' min'; }).join(', ');
      var b = self.ui._btn('↩ Undo', ''); b.id = 'myday-undo-btn'; b.style.minHeight = '40px';
      b.onclick = function() { b.disabled = true; L.undoMoves().then(function() { bar.remove(); RPGACE.utils.toast('↩ Put back', 'var(--gold)', 1800); self.ui.render(); }, function(e) { b.disabled = false; RPGACE.utils.toast('⚠️ Undo failed: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); }); };
      bar.appendChild(t); bar.appendChild(b); document.body.appendChild(bar);
      setTimeout(function() { if (bar.parentNode) bar.remove(); }, 10000);
    },
    // MD-1 push rule: a block would have to move more than 30 minutes.
    // "Shorten it?" -> edit that block's time here -> confirm -> back to the
    // block being placed (the caller tries again). Rejects on Cancel.
    askShorten: function(isoDate, other, by, dir, newMins) {
      var self = RPGACE.modules.myDay, L = self.logic, b = other.block;
      return new Promise(function(resolve, reject) {
        var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: '✂️ Shorten ' + other.label + '?', width: '460px' });
        var done = false, fin = function(ok, err) { if (done) return; done = true; pop.close(); if (ok) resolve(); else reject(err || new Error('Not saved — nothing was moved.')); };
        var p = document.createElement('div'); p.id = 'myday-shorten'; p.style.cssText = 'display:flex;flex-direction:column;gap:10px;font-size:14px';
        var why = document.createElement('div'); why.style.color = 'var(--muted)';
        why.textContent = 'To fit the new block, ' + other.label + ' (' + L.fmtMin(other.from) + '–' + L.fmtMin(other.to) + ') would move ' + by + ' min ' + dir + ' — more than 30. Shorten it instead?';
        p.appendChild(why);
        if (!b) { p.appendChild(document.createTextNode('That block can\'t be changed from here.')); }
        var len = other.to - other.from;
        var sugFrom = dir === 'later' ? other.from + by : other.from, sugMins = Math.max(10, len - by);
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:end';
        var inCss = 'min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit';
        var st = document.createElement('input'); st.type = 'time'; st.id = 'myday-sh-start'; st.value = L.fmtMin(sugFrom); st.style.cssText = inCss;
        var mn = document.createElement('input'); mn.type = 'number'; mn.id = 'myday-sh-mins'; mn.min = '10'; mn.max = '480'; mn.step = '5'; mn.value = sugMins; mn.style.cssText = inCss + ';width:90px';
        var l1 = document.createElement('label'); l1.textContent = 'Start '; l1.appendChild(st);
        var l2 = document.createElement('label'); l2.textContent = 'Minutes '; l2.appendChild(mn);
        row.appendChild(l1); row.appendChild(l2); p.appendChild(row);
        var err = document.createElement('div'); err.style.cssText = 'color:#CC4A4A;font-size:13px'; err.hidden = true; p.appendChild(err);
        var acts = document.createElement('div'); acts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
        var ok = self.ui._btn('✅ Shorten and go back', 'primary'); ok.id = 'myday-sh-ok';
        var no = self.ui._btn('Cancel', '');
        ok.disabled = !b;
        ok.onclick = function() {
          var f = L.toMin(st.value), m2 = parseInt(mn.value, 10);
          if (f == null || !(m2 >= 10)) { err.textContent = 'Set a start time and at least 10 minutes.'; err.hidden = false; return; }
          ok.disabled = true;
          L.resizeBlock(b, f, m2).then(function() { RPGACE.cache.clear('chore_blocks'); fin(true); }, function(e) { ok.disabled = false; err.textContent = e.message || String(e); err.hidden = false; });
        };
        no.onclick = function() { fin(false); };
        acts.appendChild(ok); acts.appendChild(no); p.appendChild(acts);
        pop.box.appendChild(p);
      });
    },
    // MD-1: the 🌅 Morning / 🌙 Night block on today's list.
    bookendCard: function(which, be, today) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, e = be[which];
      var card = document.createElement('div'); card.id = 'myday-bookend-' + which; card.className = 'myday-bookend';
      card.style.cssText = 'border:1px solid var(--border);border-left:4px solid var(--orange);border-radius:10px;padding:8px 10px;margin:0 0 10px;background:var(--panel)';
      var head = document.createElement('div'); head.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap';
      var t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:0;font-weight:700;font-size:14px';
      t.textContent = e.label + ' · ' + L.fmtMin(e.from) + '–' + L.fmtMin(e.to) + (which === 'morning' && (self._settings || {}).alarm_on !== false && e.tasks.length ? ' · ⏰' : '');
      var ed = U._btn('✏️ Tasks', ''); ed.className = 'myday-bookend-edit'; ed.style.minHeight = '40px';
      ed.onclick = function() { U.openBookend(which); };
      head.appendChild(t); head.appendChild(ed); card.appendChild(head);
      if (!e.tasks.length) {
        var none = document.createElement('div'); none.style.cssText = 'font-size:13px;color:var(--muted);margin-top:6px';
        none.textContent = 'No tasks yet — tap ✏️ Tasks to add your ' + (which === 'morning' ? 'morning' : 'night') + ' routine.';
        card.appendChild(none);
      }
      // A task chained after another one waits until that one is ticked (MD2-9).
      e.tasks.filter(function(r) { return !L.waitingOnChain(r, self._logs || [], today); }).forEach(function(r) { card.appendChild(U.row(r, today)); });
      return card;
    },
    openBookend: function(which) {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, st = self._settings || {};
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: which === 'morning' ? '🌅 Morning block' : '🌙 Night block', width: '520px' });
      var box = document.createElement('div'); box.id = 'myday-bookend-editor'; box.style.cssText = 'display:flex;flex-direction:column;gap:10px;font-size:14px';
      var inCss = 'min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:inherit';
      var tasks = L.bookendTasks(which).map(function(r) { return { id: String(r.id), title: r.title, mins: Math.max(1, Number(r.est_mins) || 15), was: Number(r.est_mins) || 15 }; });
      var tRow = document.createElement('label'); tRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap';
      tRow.appendChild(document.createTextNode(which === 'morning' ? 'Wake up at ' : 'Bed at '));
      var tm = document.createElement('input'); tm.type = 'time'; tm.id = 'myday-be-time'; tm.style.cssText = inCss;
      tm.value = which === 'morning' ? (st.wake_time || '08:00') : (st.bed_time || '23:00');
      tRow.appendChild(tm); box.appendChild(tRow);
      var al = null;
      if (which === 'morning') {
        var aRow = document.createElement('label'); aRow.style.cssText = 'display:flex;align-items:center;gap:8px;line-height:1.4';
        al = document.createElement('input'); al.type = 'checkbox'; al.id = 'myday-be-alarm'; al.checked = st.alarm_on !== false; al.style.cssText = 'width:22px;height:22px';
        aRow.appendChild(al); aRow.appendChild(document.createTextNode('⏰ Alarm at the start of this block, again every ' + (st.alarm_repeat_mins || 5) + ' min until the first task is ticked'));
        box.appendChild(aRow);
        // PA-1/PA-4: the phone side of this alarm (your sounds, MacroDroid, whether a phone is listening).
        if (RPGACE.modules.alarmSounds) {
          var snd = U._btn('🔔 Alarm sounds & phone', ''); snd.id = 'myday-be-sounds';
          snd.onclick = function() { RPGACE.modules.alarmSounds.open(); };
          box.appendChild(snd);
        }
      }
      var note = document.createElement('div'); note.style.cssText = 'font-size:12px;color:var(--muted)';
      note.textContent = which === 'morning' ? 'On a morning shift the block moves earlier so it ends before you get ready. The first task stops the alarm.' : 'After a late shift the block starts once you\'re home.';
      box.appendChild(note);
      var list = document.createElement('div'); list.id = 'myday-be-list'; list.style.cssText = 'display:flex;flex-direction:column;gap:6px';
      var total = document.createElement('div'); total.style.cssText = 'font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums';
      var draw = function() {
        list.textContent = '';
        tasks.forEach(function(x, i) {
          var r = document.createElement('div'); r.className = 'myday-be-task'; r.dataset.id = x.id; r.style.cssText = 'display:flex;align-items:center;gap:6px';
          var n = document.createElement('div'); n.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere'; n.textContent = (i + 1) + '. ' + x.title;
          var m = document.createElement('input'); m.type = 'number'; m.min = '1'; m.max = '240'; m.value = x.mins; m.className = 'myday-be-mins'; m.setAttribute('aria-label', 'Minutes for ' + x.title); m.style.cssText = inCss + ';width:64px';
          m.onchange = function() { x.mins = Math.max(1, Math.min(240, parseInt(m.value, 10) || 1)); total.textContent = 'Block length: ' + tasks.reduce(function(a, y) { return a + y.mins; }, 0) + ' min'; };
          var mk = function(lbl, fn, aria) { var b = document.createElement('button'); b.type = 'button'; b.textContent = lbl; b.setAttribute('aria-label', aria); b.style.cssText = 'min-height:40px;min-width:40px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);cursor:pointer'; b.onclick = fn; return b; };
          r.appendChild(n); r.appendChild(m);
          r.appendChild(mk('↑', function() { if (i) { tasks.splice(i - 1, 0, tasks.splice(i, 1)[0]); draw(); } }, 'Move up'));
          r.appendChild(mk('↓', function() { if (i < tasks.length - 1) { tasks.splice(i + 1, 0, tasks.splice(i, 1)[0]); draw(); } }, 'Move down'));
          r.appendChild(mk('✕', function() { tasks.splice(i, 1); draw(); }, 'Remove ' + x.title));
          list.appendChild(r);
        });
        if (!tasks.length) { var e0 = document.createElement('div'); e0.style.color = 'var(--muted)'; e0.textContent = 'No tasks yet.'; list.appendChild(e0); }
        total.textContent = 'Block length: ' + tasks.reduce(function(a, y) { return a + y.mins; }, 0) + ' min';
      };
      box.appendChild(list); box.appendChild(total);
      // + Add task: one of your routines, or a new one.
      var add = document.createElement('div'); add.style.cssText = 'display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--border);padding-top:10px';
      var al2 = document.createElement('div'); al2.style.cssText = 'font-weight:700'; al2.textContent = '＋ Add task'; add.appendChild(al2);
      var pick = document.createElement('select'); pick.id = 'myday-be-pick'; pick.style.cssText = inCss;
      var fillPick = function() {
        pick.innerHTML = '<option value="">Pick one of your actions…</option>';
        (self._routines || []).filter(function(r) { return r.cadence !== 'every_days' && r.cadence !== 'next_time' && !tasks.some(function(x) { return x.id === String(r.id); }); })
          .forEach(function(r) { var o = document.createElement('option'); o.value = String(r.id); o.textContent = r.title; pick.appendChild(o); });
      };
      fillPick();
      pick.onchange = function() {
        var r = (self._routines || []).filter(function(y) { return String(y.id) === pick.value; })[0];
        if (r) { tasks.push({ id: String(r.id), title: r.title, mins: Math.max(1, Number(r.est_mins) || 15), was: Number(r.est_mins) || 15 }); draw(); fillPick(); }
      };
      add.appendChild(pick);
      var nr = document.createElement('div'); nr.style.cssText = 'display:flex;gap:6px';
      var nt = document.createElement('input'); nt.type = 'text'; nt.id = 'myday-be-new'; nt.maxLength = 80; nt.placeholder = which === 'morning' ? 'or a new task, e.g. Glass of water' : 'or a new task, e.g. Phone on charge'; nt.style.cssText = inCss + ';flex:1;min-width:0';
      var nm = document.createElement('input'); nm.type = 'number'; nm.id = 'myday-be-newmins'; nm.min = '1'; nm.max = '240'; nm.value = '5'; nm.setAttribute('aria-label', 'Minutes'); nm.style.cssText = inCss + ';width:64px';
      var nb = U._btn('Add', ''); nb.id = 'myday-be-add';
      nb.onclick = function() {
        var title = nt.value.trim();
        if (!title) { nt.focus(); return; }
        nb.disabled = true;
        L.addBookendTask(which, title, parseInt(nm.value, 10) || 5).then(function(r) {
          nb.disabled = false; nt.value = '';
          tasks.push({ id: String(r.id), title: r.title, mins: Number(r.est_mins) || 5, was: Number(r.est_mins) || 5 }); draw(); fillPick();
        }, function(e) { nb.disabled = false; RPGACE.utils.toast('⚠️ Not added: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      nr.appendChild(nt); nr.appendChild(nm); nr.appendChild(nb); add.appendChild(nr);
      box.appendChild(add);
      var save = U._btn('💾 Save', 'primary'); save.id = 'myday-be-save';
      save.onclick = function() {
        var patch = {};
        patch[which === 'morning' ? 'wake_time' : 'bed_time'] = tm.value;
        patch[which === 'morning' ? 'morning_tasks' : 'night_tasks'] = tasks.map(function(x) { return x.id; });
        if (al) patch.alarm_on = al.checked;
        var p;
        try { p = L.saveDaySettings(patch); } catch (e) { RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'myDay'); return; }
        save.disabled = true;
        var mins = tasks.filter(function(x) { return x.mins !== x.was; }).map(function(x) {
          var r = L.byId(x.id);
          if (r) return L.actionUpdate(r, { est_mins: x.mins, updated_at: new Date().toISOString() });
          return RPGACE.sb.secureWrite('routines', 'update', { est_mins: x.mins, updated_at: new Date().toISOString() }, 'id=eq.' + x.id);
        });
        Promise.all([p].concat(mins)).then(function() {
          RPGACE.cache.clear('routines');
          pop.close();
          RPGACE.utils.toast(which === 'morning' ? '🌅 Morning block saved' : '🌙 Night block saved', 'var(--gold)', 2000);
          L.syncAlarms(true);
          U.render();
        }, function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      box.appendChild(save);
      pop.box.appendChild(box);
      draw();
    },
    // MD-1 wake alarm inside the app: a banner + sound + vibration at the
    // Morning block start, again every N minutes until the first task is
    // ticked. Phone alerts come from push_alarm() when the app is closed.
    _alarmCheck: function() {
      var self = RPGACE.modules.myDay, L = self.logic, U = self.ui, st = self._settings || {};
      if (!self._alarms) return;
      // WF-5 (Oct 29 2026, Alex: "id like the overlay to display ... a minute before alarm sets off so i can auto
      // have it load on wakening"): the cover shows from 150 s before the alarm (the phone lights the screen and
      // opens RPGACE on SOON, which alarm-feed sends 150 s early), silent until the alarm time.
      var today = L.iso(), nowMs = Date.now(), LEAD = 150000;
      var ds = L.dayState(), done = !!(ds && ds.day === today && ds.up_at && !ds.bed_at);
      var a = self._alarms.filter(function(x) {
        var test = /^test:/.test(x.kind || '');
        return (test || (x.kind || 'wake') === 'wake' && x.day === today) && L.alarmDue(nowMs + LEAD, x, test ? false : done, st);
      })[0];
      var ring = !!a, isTest = a && /^test:/.test(a.kind || '');
      var bar = document.getElementById('myday-alarm');
      if (!ring) { if (bar) bar.remove(); return; }
      if (bar && bar.dataset.kind !== a.kind) { bar.remove(); bar = null; }
      var rep = (st.alarm_repeat_mins || 5) * 60000;
      if (!bar) {
        // WF-1 (Oct 29 2026, Alex: "Alarm should auto overlay the I'm up button, it stops the alarm"):
        // the whole screen is one cover with one big ☀️ I'm up (stops app + phone alarm, opens Good morning).
        bar = document.createElement('div'); bar.id = 'myday-alarm'; bar.dataset.kind = a.kind || 'wake'; bar.setAttribute('role', 'alertdialog'); bar.setAttribute('aria-label', 'Wake alarm');
        bar.style.cssText = 'position:fixed;inset:0;z-index:100002;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:calc(24px + env(safe-area-inset-top,0px)) 16px calc(24px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,#2a1606 0%,#0d0e14 100%);color:var(--text);text-align:center;';
        var t = document.createElement('div'); t.style.cssText = 'font-size:22px;font-weight:700;letter-spacing:0.5px;color:var(--orange);';
        t.textContent = '⏰ Time to get up';
        var clock = document.createElement('div'); clock.id = 'myday-alarm-clock';
        clock.style.cssText = 'font-size:64px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1;';
        clock.textContent = L.fmtMin(L.nowMin());
        var ok = document.createElement('button'); ok.type = 'button'; ok.id = 'myday-alarm-done'; ok.textContent = '☀️ I\'m up';
        ok.style.cssText = 'width:min(320px,100%);min-height:96px;border-radius:20px;border:none;background:var(--gold);color:#111;font-size:30px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;box-shadow:0 0 0 6px rgba(201,168,76,0.18);';
        ok.onclick = function() { ok.disabled = true; ok.textContent = 'Starting your day…'; U.imUp().catch(function() { ok.disabled = false; ok.textContent = '☀️ I\'m up'; }); };
        var sub = document.createElement('div'); sub.style.cssText = 'font-size:13px;color:var(--muted);max-width:300px;';
        sub.textContent = 'Stops the alarm here and on your phone, then opens your Good morning screen.';
        if (isTest) {
          // A test ring never starts the day: this button only stops the test (the phone goes quiet at its next check).
          t.textContent = '🔔 Test ring'; ok.textContent = '■ Stop test ring';
          sub.textContent = 'Your real alarm shows ☀️ I\'m up here. This only stops the test.';
          ok.onclick = function() {
            ok.disabled = true;
            RPGACE.sb.secureWrite('myday_alarms', 'update', { status: 'done' }, 'id=eq.' + a.id).then(function() {
              a.status = 'done'; RPGACE.cache.clear('myday_alarms'); bar.remove();
              RPGACE.utils.toast('🔔 Test stopped — your phone goes quiet within a minute', 'var(--gold)', 3000);
            }, function(e) { ok.disabled = false; RPGACE.utils.toast('⚠️ Not stopped: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
          };
        }
        bar.appendChild(t); bar.appendChild(clock); bar.appendChild(ok); bar.appendChild(sub); document.body.appendChild(bar);
        self._alarmBeepAt = 0;
      }
      var ck = document.getElementById('myday-alarm-clock'); if (ck) ck.textContent = L.fmtMin(L.nowMin());
      // Silent until the alarm time itself (the phone plays your sound); the app beeps only once it is due.
      if (nowMs >= new Date(a.at).getTime() && nowMs - (self._alarmBeepAt || 0) >= rep - 1000) { self._alarmBeepAt = nowMs; U._beep(); }
    },
    _beep: function() {
      try { if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 800]); } catch (e) {}
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        var ctx = RPGACE.modules.myDay._actx = RPGACE.modules.myDay._actx || new C();
        [0, 0.5, 1].forEach(function(d) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = 880; g.gain.value = 0.25; o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.3);
        });
      } catch (e) {}
    },
    _startTicker: function() {
      var self = RPGACE.modules.myDay;
      if (self._tick) return;
      self._tick = setInterval(function() {
        var btns = document.querySelectorAll('#myday-panel .myday-timer');
        if (!document.getElementById('myday-panel')) { clearInterval(self._tick); self._tick = null; return; }
        btns.forEach(function(b) { var s = Number(b.dataset.started); if (s) b.textContent = '⏱ ' + Math.max(0, Math.round((Date.now() - s) / 60000)) + ' min'; });
      }, 30000);
    },

    openPicker: function() {
      var self = RPGACE.modules.myDay, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: 'Add actions', width: '620px' });
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.5;';
      intro.textContent = 'Ideas drafted from what RPGACE can already do. Pick one to set your own days, time, goal and steps — nothing goes on My Day until you save it.';
      pop.box.appendChild(intro);
      var own = self.ui._btn('✏️ Write your own', 'primary');
      own.style.marginBottom = '10px';
      own.onclick = function() { self.ui.openEditor({}, null, function() { pop.close(); }); };
      pop.box.appendChild(own);
      // Oct 15 2026 (Alex: "unable to edit the chosen ones"): an idea you
      // already added opens YOUR saved routine for editing, not a fresh copy.
      var have = {};
      self._routines.forEach(function(r) { have[r.title.toLowerCase()] = r; });
      self.AREAS.forEach(function(area) {
        var ideas = self.IDEAS.filter(function(i) { return i.area === area; });
        if (!ideas.length) return;
        self.ui._group(pop.box, area);
        if (area === 'Chores') {
          var bulk = self.ui._btn('🧹 Set up the chore list', 'primary');
          bulk.id = 'myday-chores-bulk';
          bulk.style.marginBottom = '8px';
          bulk.onclick = function() { self.ui.openChoreSetup(function() { pop.close(); }); };
          pop.box.appendChild(bulk);
        }
        ideas.forEach(function(idea) {
          var card = document.createElement('button');
          card.type = 'button';
          card.className = 'myday-idea';
          var added = !!have[idea.title.toLowerCase()];
          card.style.cssText = 'display:flex;width:100%;text-align:left;gap:10px;align-items:center;padding:10px 12px;margin-bottom:6px;border:1px solid var(--border);border-radius:8px;background:none;color:var(--text);cursor:pointer;font-family:Rajdhani,sans-serif;min-height:44px;';
          var t = self.TOOLS.filter(function(x) { return x.key === idea.opens; })[0];
          card.innerHTML = '<span style="font-size:20px;">' + idea.icon + '</span><span style="flex:1;min-width:0;"><b style="font-size:14px;">' + esc(idea.title) + '</b><br><span style="font-size:12px;color:var(--muted);">' +
            esc(self.logic.cadenceText(Object.assign({ days: [] }, idea)) + (t ? ' · opens ' + t.label : '') + ' · ~' + idea.est_mins + ' min') + '</span></span><span style="font-size:13px;color:' + (added ? 'var(--muted)' : 'var(--gold)') + ';font-weight:700;">' + (added ? '✓ Added · Edit' : '+ Add') + '</span>';
          var mine = have[idea.title.toLowerCase()];
          card.onclick = function() { if (mine) self.ui.openEditor(mine, mine.id, function() { pop.close(); }); else self.ui.openEditor(idea, null, function() { pop.close(); }); };
          pop.box.appendChild(card);
        });
      });
    },

    // DT-3: add the starter chores in one go — tick which to keep, change
    // any day count, optionally say when each was last done, add your own.
    openChoreSetup: function(onSaved) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: 'Chore list', width: '640px', noDefaultClose: true });
      pop.box.id = 'myday-chore-setup';
      var have = {};
      self._routines.forEach(function(r) { have[r.title.toLowerCase()] = r; });
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:6px;font-family:Rajdhani,sans-serif;min-height:40px;box-sizing:border-box;';
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.5;';
      intro.textContent = 'Each chore counts down from the last time you tick it. Leave "last done" empty and the first due dates are spread out (about two a day) so the list doesn\'t all land today.';
      pop.box.appendChild(intro);
      var list = document.createElement('div');
      pop.box.appendChild(list);
      var addRow = function(it, isNew) {
        var already = !!have[String(it.title || '').toLowerCase()];
        var row = document.createElement('div');
        row.className = 'myday-chore-row';
        row.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);' + (already ? 'opacity:.5;' : '');
        row._idea = it;
        row.innerHTML = '<input class="mcr-on" type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (already ? ' disabled' : ' checked') + ' aria-label="Keep this chore">' +
          (isNew ? '<input class="mcr-title" type="text" placeholder="Your chore" style="' + inp + 'width:100%;">' : '<span style="font-size:14px;color:var(--text);">' + esc((it.icon ? it.icon + ' ' : '') + it.title) + (already ? ' <span style="color:var(--muted);font-size:12px;">· already added</span>' : '') + '</span>') +
          '<span></span><span style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px;color:var(--muted);">Every <input class="mcr-days" type="number" min="1" max="365" inputmode="numeric" style="' + inp + 'width:72px;"> days · last done <input class="mcr-last" type="date" style="' + inp + '"></span>';
        row.querySelector('.mcr-days').value = it.every_days || 7;
        if (already) {
          // An added chore: show its real rhythm and let it be edited.
          var mine = have[String(it.title || '').toLowerCase()];
          row.style.opacity = '';
          row.querySelector('.mcr-days').value = mine.every_days || it.every_days || 7;
          row.querySelector('.mcr-days').disabled = true;
          row.querySelector('.mcr-last').disabled = true;
          var ed = self.ui._btn('✏️ Edit', '');
          ed.className = (ed.className ? ed.className + ' ' : '') + 'mcr-edit';
          ed.style.gridColumn = '2';
          ed.style.justifySelf = 'start';
          ed.onclick = function() { self.ui.openEditor(mine, mine.id, function() { pop.close(); }); };
          row.appendChild(ed);
        }
        list.appendChild(row);
        return row;
      };
      self.IDEAS.filter(function(i) { return i.area === 'Chores'; }).forEach(function(i) { addRow(i, false); });
      var own = self.ui._btn('+ Add my own chore', '');
      own.id = 'myday-chore-own';
      own.style.margin = '10px 0';
      own.onclick = function() { var r = addRow({ icon: '🧹', every_days: 7, est_mins: 15, xp: 5 }, true); r.querySelector('.mcr-title').focus(); };
      pop.box.appendChild(own);
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;margin-bottom:8px;';
      pop.box.appendChild(err);
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
      var cancel = self.ui._btn('Cancel', ''); cancel.onclick = function() { pop.close(); };
      var save = self.ui._btn('Add chores', 'primary'); save.id = 'myday-chores-save';
      bar.appendChild(cancel); bar.appendChild(save);
      pop.box.appendChild(bar);
      save.onclick = function() {
        var items = [];
        list.querySelectorAll('.myday-chore-row').forEach(function(row) {
          var on = row.querySelector('.mcr-on');
          if (!on.checked || on.disabled) return;
          var it = Object.assign({}, row._idea);
          var t = row.querySelector('.mcr-title');
          if (t) { it.title = t.value.trim(); if (!it.title) return; }
          it.every_days = row.querySelector('.mcr-days').value;
          it.last_done_before = row.querySelector('.mcr-last').value || null;
          items.push(it);
        });
        if (!items.length) { err.textContent = 'Nothing ticked to add.'; err.style.display = 'block'; return; }
        save.disabled = true; save.textContent = 'Adding…';
        var p; try { p = L.addChores(items); } catch (e) { p = Promise.reject(e); }
        p.then(function() {
          pop.close();
          if (onSaved) onSaved();
          RPGACE.utils.toast('🧹 ' + items.length + ' chore' + (items.length === 1 ? '' : 's') + ' added', '#4caf82', 2400);
          return self.ui.inject();
        }).catch(function(e) { save.disabled = false; save.textContent = 'Add chores'; err.textContent = e.message || String(e); err.style.display = 'block'; });
      };
    },

    openEditor: function(src, id, onSaved) {
      var self = RPGACE.modules.myDay;
      src = src || {};
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: id ? 'Edit action' : 'Set up action', width: '520px', noDefaultClose: true });
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;font-family:Rajdhani,sans-serif;min-width:0;width:100%;box-sizing:border-box;min-height:40px;';
      var lab = 'display:block;font-size:12px;color:var(--muted);margin-bottom:10px;';
      var opt = function(list, cur) { return list.map(function(o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
      var f = document.createElement('div');
      f.innerHTML =
        '<label style="' + lab + '">Name<input id="md-title" type="text" style="' + inp + 'margin-top:4px;"></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<label style="' + lab + '">Area<select id="md-area" style="' + inp + 'margin-top:4px;">' + opt(self.AREAS.map(function(a) { return [a, a]; }), src.area || 'Other') + '</select></label>' +
          '<label style="' + lab + '">How often<select id="md-cadence" style="' + inp + 'margin-top:4px;">' + opt([['daily', 'Every day'], ['weekly', 'Certain days'], ['times_per_week', 'A few times a week'], ['once', 'One date'], ['every_days', 'Every N days (from last done)'], ['next_time', 'Next time I\'m…']], src.cadence || 'daily') + '</select></label>' +
        '</div>' +
        '<label id="md-sleep-wrap" style="' + lab + 'display:flex;align-items:center;gap:8px;min-height:40px;"><input id="md-sleep" type="checkbox" style="width:20px;height:20px;"> This is my sleep action (keep it 21 of 28 days for the Lake rank)</label>' +
        '<div id="md-days-wrap" style="margin-bottom:10px;"><div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Which days</div><div id="md-days" style="display:flex;flex-wrap:wrap;gap:6px;"></div></div>' +
        '<label id="md-tpw-wrap" style="' + lab + '">Times a week<input id="md-tpw" type="number" min="1" max="14" inputmode="numeric" style="' + inp + 'margin-top:4px;"></label>' +
        '<label id="md-date-wrap" style="' + lab + '">Date<input id="md-date" type="date" style="' + inp + 'margin-top:4px;"></label>' +
        '<div id="md-every-wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<label style="' + lab + '">Every how many days<input id="md-every" type="number" min="1" max="365" inputmode="numeric" style="' + inp + 'margin-top:4px;"></label>' +
          '<label style="' + lab + '">Last done (optional)<input id="md-lastdone" type="date" style="' + inp + 'margin-top:4px;"></label>' +
        '</div>' +
        '<label id="md-ctx-wrap" style="' + lab + '">When<select id="md-ctx" style="' + inp + 'margin-top:4px;">' + opt(Object.keys(self.CONTEXTS).map(function(k) { return [k, self.CONTEXTS[k]]; }), src.context || 'shopping') + '</select></label>' +
        '<div id="md-time-wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<label style="' + lab + '">Part of day<select id="md-part" style="' + inp + 'margin-top:4px;">' + opt(self.PARTS.map(function(p) { return [p.key, p.label]; }), src.part_of_day || 'any') + '</select></label>' +
          '<label style="' + lab + '">Set time (optional)<input id="md-time" type="time" style="' + inp + 'margin-top:4px;"></label>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<label style="' + lab + '">Minutes<input id="md-mins" type="number" min="1" inputmode="numeric" style="' + inp + 'margin-top:4px;"></label>' +
          '<label style="' + lab + '">XP<input id="md-xp" type="number" min="0" max="50" inputmode="numeric" style="' + inp + 'margin-top:4px;"></label>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<label style="' + lab + '">Minimum (still counts)<input id="md-min" type="text" placeholder="e.g. 1 chapter, 10 min" style="' + inp + 'margin-top:4px;"></label>' +
          '<label style="' + lab + '">Goal (optional)<input id="md-goal" type="text" placeholder="e.g. 20 pages, 3 beats" style="' + inp + 'margin-top:4px;"></label>' +
        '</div>' +
        '<label id="md-after-wrap" style="' + lab + '">Do it after (habit stack, optional)<select id="md-after" style="' + inp + 'margin-top:4px;"><option value="">— on its own —</option>' +
          opt((self._routines || []).filter(function(x) { return x.id !== id && x.cadence !== 'next_time' && x.cadence !== 'once'; }).map(function(x) { return [x.id, (x.icon ? x.icon + ' ' : '') + x.title]; }), src.after_routine_id || '') + '</select></label>' +
        '<label style="' + lab + '">Steps (optional, one per line)<textarea id="md-steps" rows="4" style="' + inp + 'margin-top:4px;resize:vertical;"></textarea></label>' +
        '<label style="' + lab + '">Opens (optional)<select id="md-opens" style="' + inp + 'margin-top:4px;"><option value="">— nothing —</option>' + opt(self.TOOLS.map(function(t) { return [t.key, t.label]; }), src.opens || '') + '</select></label>';
      pop.box.appendChild(f);
      var $ = function(s) { return pop.box.querySelector(s); };
      $('#md-title').value = src.title || '';
      $('#md-tpw').value = src.times_per_week || 3;
      $('#md-date').value = src.due_date || self.logic.iso();
      $('#md-every').value = src.every_days || 7;
      // Editing: show the real last-done (tick or set date); a newer tick still wins later.
      // Oct 15 2026 (Alex: "i reverted the washing colours but it didnt come
      // back"): this box used to be pre-filled with the newest TICK date, so
      // saving the form froze a tick into the chore's own last_done_before and
      // undoing the tick could never bring the chore back. Now the box only
      // holds the stored date; the newest tick is shown as a hint.
      $('#md-lastdone').value = src.last_done_before || '';
      var lastTick = id && src.cadence === 'every_days' ? self.logic.lastDone(Object.assign({}, src, { last_done_before: null })) : null;
      if (lastTick) {
        var hint = document.createElement('div');
        hint.className = 'md-lastdone-hint';
        hint.style.cssText = 'font-size:12px;color:var(--muted);margin-top:4px;';
        hint.textContent = 'Last ticked: ' + lastTick + ' (ticks count on their own; leave the box empty unless it was done before you used RPGACE)';
        $('#md-lastdone').parentNode.appendChild(hint);
      }
      $('#md-time').value = src.preferred_time || '';
      $('#md-mins').value = src.est_mins || 15;
      $('#md-xp').value = src.xp != null ? src.xp : 10;
      $('#md-goal').value = src.goal || '';
      $('#md-min').value = src.minimum || '';
      $('#md-steps').value = (src.steps || []).join('\n');
      $('#md-sleep').checked = !!src.is_sleep;
      var days = (src.days || []).slice();
      self.DAYS.forEach(function(d, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = d; b.className = 'md-day';
        var paint = function() { var on = days.indexOf(i + 1) !== -1; b.style.cssText = 'min-height:40px;min-width:48px;border-radius:8px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid ' + (on ? 'var(--gold)' : 'var(--border)') + ';background:' + (on ? 'var(--gold)' : 'none') + ';color:' + (on ? '#111' : 'var(--text)') + ';'; };
        b.onclick = function() { var k = days.indexOf(i + 1); if (k === -1) days.push(i + 1); else days.splice(k, 1); paint(); };
        paint();
        $('#md-days').appendChild(b);
      });
      var sync = function() {
        var c = $('#md-cadence').value;
        $('#md-days-wrap').hidden = c !== 'weekly';
        $('#md-tpw-wrap').hidden = c !== 'times_per_week';
        $('#md-date-wrap').hidden = c !== 'once';
        $('#md-every-wrap').hidden = c !== 'every_days';
        $('#md-ctx-wrap').hidden = c !== 'next_time';
        $('#md-time-wrap').hidden = c === 'next_time';
        $('#md-sleep-wrap').hidden = $('#md-area').value !== 'Mind';
      };
      $('#md-cadence').onchange = sync; $('#md-area').onchange = sync; sync();
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;margin-bottom:8px;';
      pop.box.appendChild(err);
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
      var cancel = self.ui._btn('Cancel', ''); cancel.onclick = function() { pop.close(); };
      var save = self.ui._btn(id ? 'Save' : 'Add to My Day', 'primary'); save.id = 'md-save';
      bar.appendChild(cancel); bar.appendChild(save);
      pop.box.appendChild(bar);
      save.onclick = function() {
        var form = {
          title: $('#md-title').value, area: $('#md-area').value, icon: src.icon || null, cadence: $('#md-cadence').value,
          days: days, times_per_week: $('#md-tpw').value, due_date: $('#md-date').value, context: $('#md-ctx').value,
          part_of_day: $('#md-part').value, preferred_time: $('#md-time').value, est_mins: $('#md-mins').value,
          xp: $('#md-xp').value, goal: $('#md-goal').value, steps: $('#md-steps').value, opens: $('#md-opens').value,
          is_sleep: $('#md-sleep').checked,
          every_days: $('#md-every').value, last_done_before: $('#md-lastdone').value,
          minimum: $('#md-min').value, after_routine_id: $('#md-after').value,
        };
        save.disabled = true; save.textContent = 'Saving…';
        self.logic.save(form, id).then(function() {
          pop.close();
          if (onSaved) onSaved();
          RPGACE.utils.toast(id ? 'Action updated' : '☀️ Added to My Day', '#4caf82', 2400);
          return self.ui.inject();
        }).catch(function(e) { save.disabled = false; save.textContent = id ? 'Save' : 'Add to My Day'; err.textContent = e.message || String(e); err.style.display = 'block'; });
      };
    },

    // MD2-7: phone alerts on/off.
    alertsRow: function(panel) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var row = document.createElement('div');
      row.id = 'myday-alerts';
      row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:14px;padding-top:10px;border-top:1px solid var(--border);font-size:13px;color:var(--muted);';
      var label = document.createElement('span');
      var btn = document.createElement('button');
      btn.type = 'button'; btn.id = 'myday-alerts-btn';
      btn.style.cssText = 'min-height:40px;padding:6px 12px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      var paint = function(st) {
        label.textContent = st === 'on' ? '🔔 Phone alerts on: 8:00 picks, Sunday 18:00 review' : st === 'blocked' ? '🔕 Alerts blocked in your phone settings' : st === 'unsupported' ? '🔕 Phone alerts need the Home Screen app (iPhone) or Chrome' : '🔕 Phone alerts off';
        btn.textContent = st === 'on' ? 'Turn off' : 'Turn on';
        btn.hidden = st === 'unsupported' || st === 'blocked';
      };
      paint(self._push || 'off');
      btn.onclick = function() {
        btn.disabled = true;
        (self._push === 'on' ? L.disablePush() : L.enablePush()).then(function() { paint(self._push); })
          .catch(function(e) { paint(self._push || 'off'); RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4500, 'myDay'); })
          .then(function() { btn.disabled = false; });
      };
      row.appendChild(label); row.appendChild(btn);
      panel.appendChild(row);
      L.pushState().then(paint);
    },

    // MD2-8 + MD2-11: "Days since" and "Cutting back" cards.
    renderTrackers: function(panel, today) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc, t = self._trk;
      if (!t) return;
      var cardCss = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px;background:var(--panel);';
      // DR-11: from the ☰ drawer this draws into a popup (#mdx-tool), which
      // self.ui.render() never touches, so a tap redrew the home but left the
      // popup stale. State is updated in place, so redraw the popup too.
      var redraw = function() {
        if (panel.id !== 'myday-panel' && panel.isConnected) { panel.innerHTML = ''; self.ui.renderTrackers(panel, today); }
        self.ui.render();
      };
      var fail = function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); redraw(); };

      self.ui._group(panel, '📍 Days since');
      var box = document.createElement('div');
      box.id = 'myday-trackers';
      box.style.cssText = cardCss;
      L.trackerRows(today).forEach(function(x) {
        var row = document.createElement('div');
        row.className = 'myday-tracker';
        row.dataset.key = x.key;
        row.style.cssText = 'display:flex;align-items:center;gap:8px;min-height:40px;border-bottom:1px solid rgba(255,255,255,0.05);';
        var txt = x.since == null ? 'no record yet' : x.since === 0 ? 'today' : x.since === 1 ? 'yesterday' : x.since + ' days ago';
        row.innerHTML = '<span style="flex:0 0 22px;">' + (x.zone ? L.ZONE_DOT[x.zone] : '⚪') + '</span>' +
          '<span style="flex:1;min-width:0;font-size:14px;color:var(--text);">' + esc(x.icon + ' ' + x.label) + '<br><span style="font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;">' + esc(txt) + ' · aim every ' + x.every + ' day' + (x.every === 1 ? '' : 's') + '</span></span>';
        var gap = document.createElement('button');
        gap.type = 'button'; gap.className = 'myday-tracker-gap'; gap.textContent = '⚙';
        gap.setAttribute('aria-label', 'Change how often for ' + x.label);
        gap.style.cssText = 'min-width:40px;min-height:40px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
        gap.onclick = function() {
          var v = window.prompt('Aim to do "' + x.label.replace(/^Last /, '') + '" at least every how many days?', String(x.every));
          if (v == null) return;
          L.saveTrackerDays(x.key, v).then(redraw).catch(fail);
        };
        var go = document.createElement('button');
        go.type = 'button'; go.textContent = 'Open';
        go.style.cssText = 'min-height:40px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        go.onclick = function() { self.ui._openTool(x.opens); };
        row.appendChild(gap); row.appendChild(go);
        box.appendChild(row);
      });
      var ppl = L.peopleRows(today);
      if (ppl.length) {
        var ph = document.createElement('div');
        ph.style.cssText = 'font-size:12px;color:var(--muted);margin:10px 0 2px;';
        ph.textContent = '📞 People';
        box.appendChild(ph);
        ppl.slice(0, 8).forEach(function(x) {
          var row = document.createElement('div');
          row.className = 'myday-person';
          row.style.cssText = 'display:flex;align-items:center;gap:8px;min-height:40px;';
          var txt = x.since == null ? 'not logged yet' : x.since === 0 ? 'talked today' : x.since + ' days since you talked';
          row.innerHTML = '<span style="flex:0 0 22px;">' + L.ZONE_DOT[x.zone] + '</span><span style="flex:1;min-width:0;font-size:14px;color:var(--text);">' + esc(x.p.name) +
            (x.p.relation ? ' <span style="color:var(--muted);font-size:12px;">(' + esc(x.p.relation) + ')</span>' : '') + '<br><span style="font-size:12px;color:var(--muted);">' + esc(txt) + ' · every ' + x.every + ' days</span></span>';
          if (x.since !== 0) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'myday-spoke'; b.textContent = '✓ Talked today';
            b.style.cssText = 'min-height:40px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
            b.onclick = function() { b.disabled = true; L.spokeToday(x.p.id).then(redraw).catch(fail); };
            row.appendChild(b);
          }
          box.appendChild(row);
        });
      }
      panel.appendChild(box);

      self.ui._group(panel, '🎯 Cutting back');
      var cb = document.createElement('div');
      cb.id = 'myday-cutback';
      cb.style.cssText = cardCss;
      if (!t.priv) {
        cb.innerHTML = '<div style="font-size:13px;color:var(--muted);">Sign in to see your cut-back counters (they\'re private).</div>';
        panel.appendChild(cb);
        return;
      }
      if (!t.cut.length) {
        cb.innerHTML = '<div style="font-size:14px;color:var(--text);margin-bottom:8px;">Count cigarettes and caffeine / energy drinks per day against your own target. No judging — just the trend.</div>';
        var setup = self.ui._btn('+ Set up cut-back counters', 'primary');
        setup.id = 'myday-cut-setup';
        setup.onclick = function() { self.ui.openCutSetup(); };
        cb.appendChild(setup);
        panel.appendChild(cb);
        return;
      }
      t.cut.forEach(function(it) {
        var st = L.cutStats(it, today), n = st.today || 0, under = n <= it.target;
        var row = document.createElement('div');
        row.className = 'myday-cut';
        row.dataset.id = it.id;
        row.style.cssText = 'padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
        var max = Math.max(it.target, it.baseline || 0, 1);
        st.days.forEach(function(d) { if (d.count != null && d.count > max) max = d.count; });
        var bars = st.days.map(function(d) {
          var h = d.count == null ? 2 : Math.max(3, Math.round(d.count / max * 28));
          var col = d.count == null ? 'rgba(255,255,255,0.08)' : d.count <= it.target ? 'var(--gold)' : 'rgba(255,255,255,0.35)';
          return '<span title="' + d.day + ': ' + (d.count == null ? 'not logged' : d.count) + '" style="display:inline-block;width:10px;height:' + h + 'px;background:' + col + ';border-radius:2px;margin-right:3px;vertical-align:bottom;"></span>';
        }).join('');
        row.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
          '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:700;color:var(--text);">' + esc((it.icon ? it.icon + ' ' : '') + it.name) + '</div>' +
          '<div class="myday-cut-line" style="font-size:12px;color:' + (under ? 'var(--gold)' : 'var(--muted)') + ';font-variant-numeric:tabular-nums;">' + n + ' today · target ' + it.target + (it.unit ? ' ' + esc(it.unit) : '') + (under ? '' : ' · tomorrow is a fresh count') + '</div></div>' +
          '<div style="height:30px;display:flex;align-items:flex-end;">' + bars + '</div></div>' +
          '<div class="myday-cut-week" style="font-size:12px;color:var(--muted);margin-top:4px;">' + (st.logged ? st.under + ' of ' + st.logged + ' logged days at or under target this week' + (st.avg != null ? ' · avg ' + st.avg + '/day' : '') + (it.baseline != null ? ' · started around ' + it.baseline : '') : 'Tap + each time — +15 Mind XP for every day at or under target') + '</div>';
        var ctr = document.createElement('div');
        ctr.style.cssText = 'display:flex;gap:8px;margin-top:6px;';
        var big = 'min-width:48px;min-height:44px;border-radius:8px;font-size:20px;font-weight:700;cursor:pointer;background:none;border:1px solid var(--border);color:var(--text);';
        var minus = document.createElement('button'); minus.type = 'button'; minus.className = 'myday-cut-minus'; minus.textContent = '−'; minus.style.cssText = big; minus.setAttribute('aria-label', 'One less');
        var plus = document.createElement('button'); plus.type = 'button'; plus.className = 'myday-cut-plus'; plus.textContent = '+'; plus.style.cssText = big; plus.setAttribute('aria-label', 'One more');
        var zero = document.createElement('button'); zero.type = 'button'; zero.className = 'myday-cut-none'; zero.textContent = st.today == null ? 'None today ✓' : 'Edit';
        zero.style.cssText = 'min-height:44px;padding:6px 10px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;background:none;border:1px solid var(--border);color:var(--text);font-family:Rajdhani,sans-serif;';
        var set = function(v) { [minus, plus, zero].forEach(function(b) { b.disabled = true; }); L.cutSet(it, today, v).then(redraw).catch(fail); };
        minus.onclick = function() { if (n > 0) set(n - 1); };
        plus.onclick = function() { set(n + 1); };
        zero.onclick = function() { if (st.today == null) { set(0); return; } self.ui.openCutSetup(it); };
        ctr.appendChild(minus); ctr.appendChild(plus); ctr.appendChild(zero);
        row.appendChild(ctr);
        cb.appendChild(row);
      });
      var add = document.createElement('button');
      add.type = 'button'; add.textContent = '+ Add a counter';
      add.style.cssText = 'margin-top:8px;min-height:40px;padding:6px 10px;background:none;border:1px dashed var(--border);border-radius:6px;color:var(--muted);cursor:pointer;font-family:Rajdhani,sans-serif;';
      add.onclick = function() { self.ui.openCutSetup(null, true); };
      cb.appendChild(add);
      panel.appendChild(cb);
    },

    // First run (no item): the two Alex picked, prefilled. With an item: edit it.
    openCutSetup: function(item, blank) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🎯 Cutting back', title: item ? 'Edit ' + item.name : 'Set your targets', width: '480px' });
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;font-family:Rajdhani,sans-serif;width:100%;box-sizing:border-box;min-height:40px;margin-top:4px;';
      var rows = item ? [item] : blank ? [{ name: '', icon: '', unit: '' }] : [{ name: 'Cigarettes', icon: '🚬', unit: '' }, { name: 'Caffeine / energy drinks', icon: '☕', unit: 'drinks' }];
      var forms = rows.map(function(r, i) {
        var d = document.createElement('div');
        d.className = 'myday-cut-form';
        d.style.cssText = 'margin-bottom:14px;';
        d.innerHTML = '<label style="display:block;font-size:12px;color:var(--muted);margin-bottom:8px;">Name<input class="cf-name" type="text" style="' + inp + '"></label>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<label style="display:block;font-size:12px;color:var(--muted);">About how many a day now<input class="cf-base" type="number" min="0" inputmode="numeric" style="' + inp + '"></label>' +
          '<label style="display:block;font-size:12px;color:var(--muted);">Daily target<input class="cf-target" type="number" min="0" inputmode="numeric" style="' + inp + '"></label></div>';
        d.querySelector('.cf-name').value = r.name || '';
        if (r.baseline != null) d.querySelector('.cf-base').value = r.baseline;
        if (r.target != null) d.querySelector('.cf-target').value = r.target;
        pop.box.appendChild(d);
        return { el: d, src: r };
      });
      var hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;';
      hint.textContent = item ? 'Today\'s count: change it with − and + on My Day.' : 'Leave a row empty to skip it. Targets can change any time.';
      pop.box.appendChild(hint);
      var err = document.createElement('div');
      err.style.cssText = 'color:#CC4A4A;font-size:13px;margin-bottom:8px;display:none;';
      pop.box.appendChild(err);
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;';
      if (item) {
        var del = self.ui._btn('Stop tracking', '');
        self.ui._armDelete(del, function() { L.cutRemove(item.id).then(function() { pop.close(); self.ui.render(); }).catch(function(e) { err.textContent = e.message || String(e); err.style.display = 'block'; }); });
        bar.appendChild(del);
      }
      var save = self.ui._btn('Save', 'primary');
      save.id = 'myday-cut-save';
      bar.appendChild(save);
      pop.box.appendChild(bar);
      save.onclick = function() {
        var jobs = forms.map(function(f) {
          var q = function(c) { return f.el.querySelector(c).value; };
          if (!item && !String(q('.cf-name')).trim()) return null;
          if (!item && q('.cf-target') === '' && q('.cf-base') === '') return null;
          return { form: { name: q('.cf-name'), icon: f.src.icon, unit: f.src.unit, baseline: q('.cf-base'), target: q('.cf-target') }, id: item ? item.id : null };
        }).filter(Boolean);
        if (!jobs.length) { err.textContent = 'Fill in at least one target.'; err.style.display = 'block'; return; }
        save.disabled = true; save.textContent = 'Saving…';
        jobs.reduce(function(p, j) { return p.then(function() { return L.cutSaveItem(j.form, j.id); }); }, Promise.resolve()).then(function() {
          pop.close();
          RPGACE.utils.toast('🎯 Saved', '#4caf82', 2000);
          self.ui.render();
        }).catch(function(e) { save.disabled = false; save.textContent = 'Save'; err.textContent = e.message || String(e); err.style.display = 'block'; });
      };
    },

    // MD2-9: the weekly review — a pre-filled look back, three short prompts,
    // saved as one Journal entry (source weekly_review, review_on = Monday).
    openReview: function(ws) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      ws = ws || L.reviewTarget(new Date()) || L.weekStart(L.iso());
      var s = L.reviewSummary(ws);
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📓 Weekly review', title: 'Week of ' + new Date(ws + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }), width: '520px' });
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;font-family:Rajdhani,sans-serif;width:100%;box-sizing:border-box;resize:vertical;margin-top:4px;';
      var list = function(xs) { return xs.map(function(x) { return '<li>' + esc(x.r.title) + ' <span style="color:var(--muted);">' + x.got + '/' + x.target + '</span></li>'; }).join(''); };
      var sum = document.createElement('div');
      sum.id = 'myday-review-summary';
      sum.style.cssText = 'font-size:14px;color:var(--text);line-height:1.5;margin-bottom:12px;';
      sum.innerHTML = '<div style="font-variant-numeric:tabular-nums;">' + s.ticks + ' ticks' + (s.minimum ? ' (' + s.minimum + ' at minimum)' : '') + ' · ' + s.chores + ' chores · +' + s.xp + ' XP</div>' +
        (s.kept.length ? '<div style="margin-top:8px;font-weight:700;">✅ Kept</div><ul style="margin:2px 0 0 18px;padding:0;">' + list(s.kept) + '</ul>' : '') +
        (s.slipped.length ? '<div style="margin-top:8px;font-weight:700;">↘ Slipped</div><ul style="margin:2px 0 0 18px;padding:0;">' + list(s.slipped) + '</ul>' : '') +
        (s.best.length ? '<div style="margin-top:8px;">🔥 Best streaks: ' + esc(s.best.map(function(x) { return x.r.title + ' ' + x.s; }).join(', ')) + '</div>' : '') +
        (!s.kept.length && !s.slipped.length ? '<div style="margin-top:8px;color:var(--muted);">No regular actions ran this week yet.</div>' : '');
      pop.box.appendChild(sum);
      // DN-6: what was done with Doing Now this week.
      var dnr = RPGACE.modules.doingNow;
      if (dnr) {
        var dnb = document.createElement('div');
        dnb.id = 'myday-review-doing';
        dnb.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;margin:-4px 0 12px;';
        pop.box.appendChild(dnb);
        dnr.logic.loadRecent().then(function(list) {
          s.doing = dnr.logic.weekSummary(list, ws, s.end);
          var ln = dnr.logic.weekLines(s.doing);
          if (!ln.length) { dnb.remove(); return; }
          dnb.innerHTML = '<div style="font-weight:700;">▶ Live now this week</div><ul style="margin:2px 0 0 18px;padding:0;">' + ln.map(function(l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
        }).catch(function() { dnb.remove(); });
      }
      // MD-6: the week's evening reviews, one line each.
      var evb = document.createElement('div');
      evb.id = 'myday-review-evenings';
      evb.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;margin:-4px 0 12px;';
      pop.box.appendChild(evb);
      L.weekEvenings(ws, s.end).then(function(list) {
        s.evenings = L.eveningLines(list);
        if (!s.evenings.length) { evb.remove(); return; }
        evb.innerHTML = '<div style="font-weight:700;">🌙 Your evenings</div><ul style="margin:2px 0 0 18px;padding:0;">' + s.evenings.map(function(l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
      }).catch(function() { evb.remove(); });
      // AC-5: why blocks got missed this week.
      var msb = document.createElement('div');
      msb.id = 'myday-review-misses';
      msb.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;margin:-4px 0 12px;';
      pop.box.appendChild(msb);
      L.loadMisses(ws).then(function() {
        s.misses = L.missLine(ws, s.end);
        if (!s.misses) { msb.remove(); return; }
        msb.innerHTML = '<div style="font-weight:700;">❓ Why blocks got missed</div><div>' + esc(s.misses) + '</div>';
      }).catch(function() { msb.remove(); });
      // RI-10: per-realm block (XP, taken in, quests) + the quiet realms.
      if (RPGACE.modules.realmBrief) {
        var rb = document.createElement('div');
        rb.id = 'myday-review-realms';
        rb.style.cssText = 'font-size:13px;color:var(--text);line-height:1.6;margin:-4px 0 12px;';
        pop.box.appendChild(rb);
        RPGACE.modules.realmBrief.logic.period(ws, s.end).then(function(p) {
          s.realms = p;
          var pl = RPGACE.modules.realmBrief.logic.periodLines(p);
          rb.innerHTML = '<div style="font-weight:700;">🧭 By realm</div>' + (pl.lines.length ? '<ul style="margin:2px 0 0 18px;padding:0;">' + pl.lines.map(function(l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '<div style="color:var(--muted);">Nothing logged in any realm yet.</div>') +
            (pl.quiet.length ? '<div style="color:var(--muted);margin-top:4px;">Quiet: ' + esc(pl.quiet.join(', ')) + '</div>' : '');
        }).catch(function() { rb.remove(); });
      }
      // RC-4: knowledge milestones untouched for 4+ weeks -> keep / drop / make smaller.
      var X = RPGACE.modules.xpSeason;
      if (X) {
        var stale = document.createElement('div');
        stale.id = 'myday-review-milestones';
        stale.style.cssText = 'font-size:13px;color:var(--text);line-height:1.5;margin:-4px 0 12px;';
        pop.box.appendChild(stale);
        X.logic.loadTrophies(true).then(function(T) {
          var list = X.logic.msStale(T);
          if (!list.length) { stale.remove(); return; }
          var h = document.createElement('div'); h.style.fontWeight = '700'; h.textContent = '🏔️ Milestones untouched for 4 weeks';
          stale.appendChild(h);
          list.forEach(function(m) {
            var R = X.REALMS[m.realm] || { icon: '', name: m.realm };
            var row = document.createElement('div'); row.className = 'myday-ms-stale';
            row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);';
            var t = document.createElement('span'); t.style.cssText = 'flex:1;min-width:160px;'; t.textContent = R.icon + ' ' + m.label;
            row.appendChild(t);
            var mk = function(label, fn) {
              var b = X.ui._msBtn(label); b.onclick = function() {
                [].forEach.call(row.querySelectorAll('button'), function(x) { x.disabled = true; });
                fn().then(function(msg) { t.textContent = R.icon + ' ' + m.label + ' - ' + msg; [].forEach.call(row.querySelectorAll('button'), function(x) { x.remove(); }); X.ui.msRefresh(); })
                  .catch(function(e) { [].forEach.call(row.querySelectorAll('button'), function(x) { x.disabled = false; }); RPGACE.utils.toast('Not saved: ' + e.message, '#CC4A4A', 5000, 'myDay'); });
              };
              row.appendChild(b);
            };
            mk('Keep', function() { return X.logic.msTouch(m).then(function() { return 'kept'; }); });
            mk('Drop', function() { return X.logic.msSetStatus(m, 'dropped', 'approved').then(function() { return 'dropped'; }); });
            mk('Make smaller', function() {
              return X.logic.msSetStatus(m, 'dropped', 'approved').then(function() { return X.logic.msPropose(m.realm, { smaller: m.label }); })
                .then(function() { return '3 smaller ideas waiting on the ' + R.name + ' card'; });
            });
            stale.appendChild(row);
          });
        }).catch(function() { stale.remove(); });
      }
      var qs = [['well', 'What went well?'], ['slip', 'What slipped, and why?'], ['next', 'One thing for next week']];
      qs.forEach(function(q) {
        var l = document.createElement('label');
        l.style.cssText = 'display:block;font-size:13px;color:var(--muted);margin-bottom:10px;';
        l.innerHTML = esc(q[1]) + '<textarea id="myday-review-' + q[0] + '" rows="2" style="' + inp + '"></textarea>';
        pop.box.appendChild(l);
      });
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
      var save = self.ui._btn('Save to Journal', 'primary');
      save.id = 'myday-review-save';
      bar.appendChild(save);
      pop.box.appendChild(bar);
      save.onclick = function() {
        var a = {};
        qs.forEach(function(q) { a[q[0]] = pop.box.querySelector('#myday-review-' + q[0]).value; });
        save.disabled = true; save.textContent = 'Saving…';
        L.saveReview(ws, L.reviewText(s, a)).then(function() {
          pop.close();
          RPGACE.utils.toast('📓 Weekly review saved to your Journal', '#4caf82', 2600);
          self.ui.render();
        }).catch(function(e) { save.disabled = false; save.textContent = 'Save to Journal'; RPGACE.utils.toast('⚠️ Review not saved: ' + (e.message || e), '#CC4A4A', 4000, 'myDay'); });
      };
    },

    openManage: function() {
      var self = RPGACE.modules.myDay, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: 'Your actions', width: '560px' });
      var draw = function() {
        pop.box.innerHTML = '';
        // MD-7: travel/get-ready timings and Schedule activity templates sit in
        // one folded section, so this screen opens on your routines.
        var set = document.createElement('details'); set.id = 'myday-settings-fold';
        set.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-bottom:12px;';
        var sm = document.createElement('summary'); sm.style.cssText = 'cursor:pointer;font-weight:700;font-size:14px;min-height:32px;';
        sm.textContent = '⚙ Day settings — travel, get-ready, activity templates';
        set.open = !!self._settingsOpen; // stays open while you edit (each save redraws)
        set.ontoggle = function() { self._settingsOpen = set.open; };
        set.appendChild(sm);
        self.ui.timingsBox(set);
        self.ui.templatesBox(set);
        pop.box.appendChild(set);
        if (!self._routines.length) { var none = document.createElement('div'); none.textContent = 'No actions yet.'; pop.box.appendChild(none); return; }
        self.AREAS.forEach(function(area) {
          var list = self._routines.filter(function(r) { return r.area === area; });
          if (!list.length) return;
          self.ui._group(pop.box, area);
          list.forEach(function(r) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);';
            var t = document.createElement('div');
            t.style.cssText = 'flex:1;min-width:0;';
            t.innerHTML = '<b style="font-size:14px;color:var(--text);">' + esc((r.icon ? r.icon + ' ' : '') + r.title) + '</b><br><span style="font-size:12px;color:var(--muted);">' +
              esc(self.logic.cadenceText(r) + (r.preferred_time ? ' · ' + r.preferred_time : '') + ' · ~' + r.est_mins + ' min · +' + r.xp + ' XP') + '</span>';
            var ed = document.createElement('button');
            ed.type = 'button'; ed.textContent = 'Edit';
            ed.style.cssText = 'min-height:36px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;';
            ed.onclick = function() { self.ui.openEditor(r, r.id, function() { pop.close(); }); };
            var del = document.createElement('button');
            del.type = 'button'; del.textContent = 'Remove';
            del.style.cssText = 'min-height:36px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
            var armed = false, timer = null;
            del.onclick = function() {
              if (!armed) { armed = true; del.textContent = 'Remove?'; del.style.color = '#CC4A4A'; timer = setTimeout(function() { armed = false; del.textContent = 'Remove'; del.style.color = 'var(--muted)'; }, 3000); return; }
              clearTimeout(timer); del.disabled = true;
              self.logic.remove(r.id).then(function() { return self.logic.load(); }).then(function() { draw(); self.ui.render(); })
                .catch(function(e) { del.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
            };
            row.appendChild(t); row.appendChild(ed); row.appendChild(del);
            pop.box.appendChild(row);
          });
        });
      };
      draw();
    },

    _field: function(label, input) {
      var w = document.createElement('label');
      w.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);';
      w.appendChild(document.createTextNode(label));
      input.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;width:100%;box-sizing:border-box;font-family:Rajdhani,sans-serif;';
      w.appendChild(input);
      return w;
    },
    _num: function(id, val, placeholder) {
      var i = document.createElement('input');
      i.type = 'number'; i.min = '0'; i.inputMode = 'numeric'; i.id = id;
      if (val != null) i.value = val;
      if (placeholder != null) i.placeholder = placeholder;
      return i;
    },
    // MD2-4: the Daily Schedule's "Schedule Task" form gets a template
    // picker (+ New / Delete in place), a category, and place + journey +
    // get-ready. Called from openSchedModal; values read back by
    // schedExtrasValues() in confirmScheduleModal.
    schedExtras: function(agenda) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var tplBox = document.getElementById('sched-tpl-box'), exBox = document.getElementById('sched-extra-box');
      if (!tplBox || !exBox) return;
      var lab = function(t) { return '<div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px">' + t + '</div>'; };
      var inCss = 'width:100%;box-sizing:border-box;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:14px;min-height:40px;';
      var smBtn = 'min-height:40px;padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#E2E2EC;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;';
      tplBox.innerHTML = lab('Template (optional)') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;"><select id="sched-tpl" style="' + inCss + 'flex:1;min-width:160px;width:auto;"></select>' +
        '<button type="button" id="sched-tpl-new" style="' + smBtn + '">+ New</button><button type="button" id="sched-tpl-del" style="' + smBtn + '">Delete</button></div>' +
        '<div id="sched-tpl-info" style="font-size:12px;color:rgba(226,226,236,0.5);margin-top:6px;"></div><div id="sched-tpl-formholder"></div>';
      exBox.innerHTML = '<div style="display:grid;gap:14px;">' +
        '<div>' + lab('Category') + '<input type="text" id="sched-category" list="myday-cat-list" placeholder="e.g. gym, social, work" style="' + inCss + '"></div>' +
        '<div>' + lab('Place + travel (optional)') + '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;">' +
        '<input type="text" id="sched-place" placeholder="Place" style="' + inCss + '">' +
        '<input type="number" min="0" id="sched-journey" placeholder="Journey min" style="' + inCss + '">' +
        '<input type="number" min="0" id="sched-ready" placeholder="Ready ' + L.timing().ready_mins + '" style="' + inCss + '"></div>' +
        '<div id="sched-travel-note" style="font-size:12px;color:rgba(226,226,236,0.5);margin-top:6px;"></div></div></div>';
      if (!document.getElementById('myday-cat-list')) {
        var dl = document.createElement('datalist'); dl.id = 'myday-cat-list';
        dl.innerHTML = self.CATEGORY_SUGGESTIONS.map(function(c) { return '<option value="' + c + '">'; }).join('');
        document.body.appendChild(dl);
      }
      var sel = document.getElementById('sched-tpl'), info = document.getElementById('sched-tpl-info');
      var cat = document.getElementById('sched-category'), place = document.getElementById('sched-place');
      var journey = document.getElementById('sched-journey'), ready = document.getElementById('sched-ready');
      var note = document.getElementById('sched-travel-note');
      cat.value = agenda && agenda.category && agenda.category !== 'personal' ? agenda.category : '';
      var titleEl = document.getElementById('sched-title-input');
      if (titleEl) titleEl.dataset.fromTpl = '';
      var noteUpd = function() {
        var pre = L.travelBefore({ journey_mins: journey.value, ready_mins: ready.value === '' ? null : ready.value });
        note.textContent = pre ? 'Keeps ' + pre + ' min clear before it for getting ready + travel.' : '';
      };
      journey.oninput = noteUpd; ready.oninput = noteUpd;
      var fill = function() {
        sel.innerHTML = '<option value="">— none —</option>' + self._templates.map(function(t) {
          return '<option value="' + self.ui._esc(t.id) + '">' + self.ui._esc(t.name) + '</option>';
        }).join('');
      };
      var apply = function() {
        var t = self._templates.filter(function(x) { return String(x.id) === sel.value; })[0];
        info.textContent = t ? self.ui._tplLine(t) : '';
        if (!t) return;
        var title = document.getElementById('sched-title-input');
        if (title && (!title.value.trim() || title.dataset.fromTpl === '1')) { title.value = t.name; title.dataset.fromTpl = '1'; }
        if (t.category) cat.value = t.category;
        place.value = t.place || '';
        journey.value = Number(t.journey_mins) ? t.journey_mins : '';
        ready.value = t.ready_mins != null ? t.ready_mins : '';
        if (typeof selectDuration === 'function' && t.est_mins) selectDuration(Number(t.est_mins));
        noteUpd();
      };
      sel.onchange = apply;
      document.getElementById('sched-tpl-new').onclick = function() {
        var holder = document.getElementById('sched-tpl-formholder');
        if (holder.querySelector('.myday-tpl-form')) return;
        self.ui.templateForm(holder, function(t) { if (!t) return; fill(); sel.value = String(t.id); apply(); });
      };
      self.ui._armDelete(document.getElementById('sched-tpl-del'), function() {
        if (!sel.value) { RPGACE.utils.toast('Pick a template to delete first', '#888', 2200); return; }
        var id = sel.value;
        self.logic.removeTemplate(id).then(function() { fill(); sel.value = ''; info.textContent = ''; RPGACE.utils.toast('Template deleted', '#888', 2000); })
          .catch(function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      });
      fill();
      noteUpd();
      // Templates may not be loaded yet if My Day hasn't rendered this session.
      if (!self._templates.length && RPGACE.sb && RPGACE.sb.select) self.logic.loadTimings().then(function() { var v = sel.value; fill(); sel.value = v; }).catch(function() {});
    },
    schedExtrasValues: function() {
      var g = function(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
      var out = { template_id: g('sched-tpl') || null, category: g('sched-category').toLowerCase() || null, place: g('sched-place') || null,
        journey_mins: g('sched-journey') === '' ? null : Number(g('sched-journey')), ready_mins: g('sched-ready') === '' ? null : Number(g('sched-ready')) };
      if ((out.journey_mins != null && (isNaN(out.journey_mins) || out.journey_mins < 0)) || (out.ready_mins != null && (isNaN(out.ready_mins) || out.ready_mins < 0))) out.error = 'Journey and get-ready must be minutes (0 or more).';
      return out;
    },

    // MD2-4: get-ready / margin / shift travel settings.
    timingsBox: function(parent) {
      var self = RPGACE.modules.myDay, L = self.logic, t = L.timing();
      var box = document.createElement('div');
      box.id = 'myday-timings';
      box.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:14px;';
      box.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;">⏱ Timings</div>';
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;';
      var f = {
        ready_mins: self.ui._num('myday-t-ready', t.ready_mins),
        margin_pct: self.ui._num('myday-t-margin', t.margin_pct),
        shift_journey_mins: self.ui._num('myday-t-shiftjourney', t.shift_journey_mins),
        shift_extra_before_mins: self.ui._num('myday-t-shiftextra', t.shift_extra_before_mins),
        shift_journey_home_mins: self.ui._num('myday-t-shifthome', t.shift_journey_home_mins),
      };
      grid.appendChild(self.ui._field('Get ready (min)', f.ready_mins));
      grid.appendChild(self.ui._field('Journey margin (%)', f.margin_pct));
      grid.appendChild(self.ui._field('Journey to work (min)', f.shift_journey_mins));
      grid.appendChild(self.ui._field('Before shift extra, coffee etc (min)', f.shift_extra_before_mins));
      grid.appendChild(self.ui._field('Journey home (min)', f.shift_journey_home_mins));
      box.appendChild(grid);
      var sum = document.createElement('div');
      sum.style.cssText = 'font-size:13px;color:var(--muted);margin:8px 0;';
      var upd = function() {
        var cur = {}; Object.keys(f).forEach(function(k) { cur[k] = f[k].value; });
        try { sum.textContent = 'Kept clear around a shift: ' + L.shiftBefore(cur) + ' min before, ' + L.shiftAfter(cur) + ' min after.'; } catch (e) {}
      };
      Object.keys(f).forEach(function(k) { f[k].oninput = upd; });
      upd();
      box.appendChild(sum);
      var save = self.ui._btn('Save timings', 'primary');
      save.id = 'myday-t-save';
      save.onclick = function() {
        var patch = {}; Object.keys(f).forEach(function(k) { patch[k] = f[k].value; });
        var p;
        try { p = L.saveSettings(patch); } catch (e) { RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'myDay'); return; }
        save.disabled = true;
        p.then(function() { save.disabled = false; RPGACE.utils.toast('⏱ Timings saved', '#4caf82', 2200); self.ui.render(); })
          .catch(function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Timings not saved: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      box.appendChild(save);
      parent.appendChild(box);
    },
    _tplLine: function(t) {
      var L = RPGACE.modules.myDay.logic, bits = [];
      if (t.category) bits.push(t.category);
      if (t.place) bits.push('📍 ' + t.place);
      if (Number(t.journey_mins)) bits.push(t.journey_mins + ' min journey (+margin = ' + L.withMargin(t.journey_mins) + ')');
      bits.push((t.ready_mins != null ? t.ready_mins : L.timing().ready_mins) + ' min get-ready');
      bits.push(t.est_mins + ' min long');
      return bits.join(' · ');
    },
    // Two-click delete, same arm/confirm pattern as everywhere else.
    _armDelete: function(btn, onConfirm) {
      var armed = false, timer = null, label = btn.textContent;
      btn.onclick = function(e) {
        if (e) e.preventDefault();
        if (!armed) { armed = true; btn.textContent = 'Delete?'; btn.style.color = '#CC4A4A'; timer = setTimeout(function() { armed = false; btn.textContent = label; btn.style.color = ''; }, 3000); return; }
        clearTimeout(timer); armed = false; btn.textContent = label; btn.style.color = '';
        onConfirm();
      };
    },
    // MD2-4: activity templates list (name, place, journey, category).
    templatesBox: function(parent) {
      var self = RPGACE.modules.myDay, esc = self.ui._esc;
      var box = document.createElement('div');
      box.id = 'myday-templates';
      box.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:14px;';
      var draw = function() {
        box.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;">📋 Activity templates</div>' +
          '<div style="font-size:13px;color:var(--muted);margin-bottom:6px;">Pick one when adding something to the Daily Schedule; its place and journey keep the travel time clear.</div>';
        if (!self._templates.length) {
          var e = document.createElement('div'); e.style.cssText = 'font-size:13px;color:var(--muted);';
          e.textContent = 'None yet.'; box.appendChild(e);
        }
        self._templates.forEach(function(t) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);';
          row.innerHTML = '<div style="flex:1;min-width:0;"><b style="font-size:14px;color:var(--text);">' + esc(t.name) + '</b><br><span style="font-size:12px;color:var(--muted);">' + esc(self.ui._tplLine(t)) + '</span></div>';
          var del = document.createElement('button');
          del.type = 'button'; del.textContent = 'Delete';
          del.style.cssText = 'min-height:36px;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
          self.ui._armDelete(del, function() {
            del.disabled = true;
            self.logic.removeTemplate(t.id).then(draw).catch(function(err) { del.disabled = false; RPGACE.utils.toast('⚠️ ' + (err.message || err), '#CC4A4A', 3500, 'myDay'); });
          });
          row.appendChild(del);
          box.appendChild(row);
        });
        var add = self.ui._btn('+ New template', '');
        add.style.cssText += 'margin-top:8px;';
        add.onclick = function() { self.ui.templateForm(box, function() { draw(); }); add.remove(); };
        box.appendChild(add);
      };
      draw();
      parent.appendChild(box);
    },
    // Inline "new template" form; onSaved(template) after it is stored.
    templateForm: function(parent, onSaved) {
      var self = RPGACE.modules.myDay, L = self.logic;
      var f = document.createElement('div');
      f.className = 'myday-tpl-form';
      f.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:8px;padding:10px;border:1px dashed var(--border);border-radius:8px;';
      var name = document.createElement('input'); name.type = 'text'; name.className = 'tpl-name'; name.placeholder = 'e.g. Gym session';
      var cat = document.createElement('input'); cat.type = 'text'; cat.className = 'tpl-cat'; cat.placeholder = 'e.g. gym';
      var listId = 'myday-cat-list';
      if (!document.getElementById(listId)) {
        var dl = document.createElement('datalist'); dl.id = listId;
        dl.innerHTML = self.CATEGORY_SUGGESTIONS.map(function(c) { return '<option value="' + c + '">'; }).join('');
        document.body.appendChild(dl);
      }
      cat.setAttribute('list', listId);
      var place = document.createElement('input'); place.type = 'text'; place.className = 'tpl-place'; place.placeholder = 'e.g. PureGym Derby';
      var journey = self.ui._num('', '', '0'); journey.className = 'tpl-journey';
      var ready = self.ui._num('', '', String(L.timing().ready_mins)); ready.className = 'tpl-ready';
      var len = self.ui._num('', '', '60'); len.className = 'tpl-len';
      f.appendChild(self.ui._field('Name', name));
      f.appendChild(self.ui._field('Category', cat));
      f.appendChild(self.ui._field('Place', place));
      f.appendChild(self.ui._field('Journey there (min)', journey));
      f.appendChild(self.ui._field('Get ready (min)', ready));
      f.appendChild(self.ui._field('How long (min)', len));
      var save = self.ui._btn('Save template', 'primary');
      save.className = 'tpl-save';
      var cancel = self.ui._btn('Cancel', '');
      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:8px;grid-column:1/-1;';
      btns.appendChild(save); btns.appendChild(cancel);
      f.appendChild(btns);
      cancel.onclick = function() { f.remove(); if (onSaved) onSaved(null); };
      save.onclick = function() {
        var p;
        try { p = L.addTemplate({ name: name.value, category: cat.value, place: place.value, journey_mins: journey.value, ready_mins: ready.value, est_mins: len.value }); }
        catch (e) { RPGACE.utils.toast('⚠️ ' + e.message, '#CC4A4A', 3500, 'myDay'); return; }
        save.disabled = true;
        p.then(function(t) { f.remove(); RPGACE.utils.toast('📋 Template saved: ' + t.name, '#4caf82', 2200); if (onSaved) onSaved(t); })
          .catch(function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Template not saved: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      };
      parent.appendChild(f);
      setTimeout(function() { name.focus(); }, 30);
      return f;
    },

    // Plan my day: pick a date; it shows that day's blocks (from Plan week
    // or added here) and you fill each with 📋 Plan block. Day Bookends (Oct
    // 27 2026, Alex: "when i plan my day, i only plan steps that are needed
    // to be done in blocks that i planned out in plan my week"): no loose
    // list of due Actions; they are offered inside a matching realm block.
    // New blocks added here are saved with Lock in. opts.after runs on close.
    openPlan: function(isoDate, opts) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var today = L.iso();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '☀️ My Day', title: 'Plan my day', width: '600px', noDefaultClose: true, onClose: opts && opts.after ? opts.after : null });
      pop.box.id = 'myday-dayplan';
      var inp = 'background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:6px;font-family:Rajdhani,sans-serif;min-height:40px;box-sizing:border-box;';
      var state = { date: isoDate || today, items: [] };
      var nowMinFor = function(d) { var n = new Date(); return d === today ? n.getHours() * 60 + n.getMinutes() : undefined; };
      var load = function() {
        state.items = [];
        draw();
      };
      var draw = function() {
        var d = state.date, kind = L.dayKind(d), sh = L.shiftsOn(d);
        pop.box.innerHTML = '';
        // date + kind
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;';
        var dateIn = document.createElement('input');
        dateIn.type = 'date'; dateIn.id = 'mdp-date'; dateIn.value = d; dateIn.min = today; dateIn.style.cssText = inp;
        dateIn.onchange = function() { if (dateIn.value) { state.date = dateIn.value; load(); } };
        var kd = document.createElement('div');
        kd.id = 'mdp-kind';
        kd.style.cssText = 'font-size:14px;color:var(--text);font-weight:700;';
        kd.textContent = self.DAY_KINDS[kind] + (sh.length ? ' · ' + sh.map(function(x) { return x.start + '–' + x.end; }).join(', ') : '');
        top.appendChild(dateIn); top.appendChild(kd);
        pop.box.appendChild(top);
        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
        hint.textContent = 'Plan inside your blocks: fill each with 📋 Plan block (due Actions are offered in the block for their realm), or add a block below. ⚠ = overlaps your shift or its travel.';
        pop.box.appendChild(hint);
        // MD-3: blocks already placed for this day (Plan week), each filled with 📋 Plan block.
        self.ui.plannedBlocks(pop.box, d, function() { draw(); });
        // fixed shift row(s)
        sh.forEach(function(x) {
          var f = document.createElement('div');
          f.className = 'mdp-shift';
          f.style.cssText = 'font-size:13px;color:var(--muted);padding:6px 0;border-bottom:1px solid var(--border);';
          f.textContent = '🧑‍🍳 ' + x.start + '–' + x.end + ' shift (leave ' + L.shiftBefore(self._settings) + ' min before for getting ready + travel)';
          pop.box.appendChild(f);
        });
        var clash = L.clashes(d, state.items);
        var list = document.createElement('div');
        list.id = 'mdp-list';
        state.items.forEach(function(x, i) {
          var row = document.createElement('div');
          row.className = 'mdp-item';
          row.dataset.i = i;
          row.style.cssText = 'display:grid;grid-template-columns:auto auto 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);' + (x.keep === false ? 'opacity:.5;' : '');
          var cb = document.createElement('input');
          cb.type = 'checkbox'; cb.className = 'mdp-keep'; cb.checked = x.keep !== false;
          cb.style.cssText = 'width:20px;height:20px;accent-color:var(--gold);';
          cb.onchange = function() { x.keep = cb.checked; draw(); };
          var t = document.createElement('input');
          t.type = 'time'; t.className = 'mdp-start'; t.value = x.start || ''; t.style.cssText = inp;
          t.onchange = function() { x.start = t.value; L.sortDay(state.items); draw(); };
          var name = document.createElement('div');
          name.style.cssText = 'min-width:0;font-size:14px;color:var(--text);';
          var sub = [];
          if (x.type === 'chore_block') {
            var byId = {}; (self._routines || []).forEach(function(r) { byId[String(r.id)] = r; });
            sub.push((x.chore_ids || []).map(function(id) { return byId[id] ? byId[id].title : null; }).filter(Boolean).join(' · ') || 'no chores due');
          }
          if (x.type === 'cooking_block') {
            var rById = {}; (self._recipes || []).forEach(function(r) { rById[String(r.id)] = r.title; });
            sub.push((x.recipe_ids || []).map(function(id) { return rById[String(id)]; }).filter(Boolean).join(' · ') || 'pick recipes');
          }
          if (x.type === 'realm_block') {
            var ri = x.realm_items || [];
            sub.push(ri.length ? ri.map(function(i) { return i.label; }).join(' · ') : 'pick activities');
          }
          if (x.type === 'shopping_block') {
            var si = x.shop_items || [];
            sub.push(si.length ? si.length + ' item' + (si.length === 1 ? '' : 's') + ': ' + si.slice(0, 3).map(function(i) { return i.label; }).join(' · ') + (si.length > 3 ? ' …' : '') : 'pick what you\'re getting');
          }
          if (x.place) sub.push('📍 ' + x.place + (x.journey_mins ? ' · ' + x.journey_mins + ' min journey' : ''));
          if (x.added) sub.push('also due');
          if (!x.start) sub.push('no free gap, pick a time');
          name.innerHTML = (clash[i] && x.keep !== false ? '<span title="Overlaps your shift">⚠ </span>' : '') + esc(x.title) +
            '<div style="font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:2px;"><input class="mdp-mins" type="number" min="5" max="480" inputmode="numeric" style="' + inp + 'width:64px;min-height:32px;padding:2px 6px;" aria-label="Minutes"> min' +
            (sub.length ? '<span>' + esc(sub.join(' · ')) + '</span>' : '') + '</div>';
          var mins = name.querySelector('.mdp-mins');
          mins.value = x.mins;
          mins.onchange = function() {
            x.mins = Math.max(5, parseInt(mins.value, 10) || x.mins);
            if (x.type === 'chore_block') x.chore_ids = L.fillBlock(x.mins, d, L.blockedIds(d)).items.map(function(c) { return String(c.r.id); });
            draw();
          };
          if (x.type === 'cooking_block' || x.type === 'shopping_block' || x.type === 'realm_block' || x.type === 'chore_block') {
            var ch = document.createElement('button');
            ch.type = 'button'; ch.className = 'mdp-change'; ch.textContent = x.type === 'cooking_block' ? '✎ Recipes' : x.type === 'realm_block' ? '✎ Activities' : x.type === 'chore_block' ? '✎ Chores' : '✎ Items';
            ch.style.cssText = 'min-height:32px;padding:2px 8px;margin-top:4px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:12px;';
            ch.onclick = function() {
              if (x.type === 'chore_block') self.ui.pickChores(d, x.mins, x.chore_ids || [], function(ids) { x.chore_ids = ids; draw(); });
              else if (x.type === 'realm_block') self.ui.pickRealmBlock(x, function(nx) { x.realm = nx.realm; x.realm_items = nx.realm_items; x.mins = nx.mins; x.title = nx.title; draw(); });
              else if (x.type === 'cooking_block') self.ui.pickRecipes(x.recipe_ids || [], function(ids, mins) { x.recipe_ids = ids; if (mins) x.mins = mins; draw(); });
              else self.ui.pickShopItems(d, state.items, x.shop_items || [], function(items) { x.shop_items = items; draw(); });
            };
            name.appendChild(ch);
          }
          var rm = document.createElement('button');
          rm.type = 'button'; rm.className = 'mdp-remove'; rm.textContent = '✕'; rm.setAttribute('aria-label', 'Remove');
          rm.style.cssText = 'min-height:40px;min-width:40px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
          rm.onclick = function() { state.items.splice(i, 1); draw(); };
          row.appendChild(cb); row.appendChild(t); row.appendChild(name); row.appendChild(rm);
          list.appendChild(row);
        });
        if (!state.items.length && !L.dayBlocks(d).length) list.innerHTML = '<div id="mdp-noblocks" style="font-size:13px;color:#e0a84c;padding:8px 0;">No blocks for this day yet — add a Realm or Homekeeper block below.</div>';
        else if (state.items.length) list.insertAdjacentHTML('afterbegin', '<div style="font-size:12px;font-weight:700;color:var(--text);margin:4px 0;">➕ New blocks (saved when you Lock in)</div>');
        pop.box.appendChild(list);
        // add row
        var add = document.createElement('div');
        add.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;';
        var cbB = self.ui._btn('+ Homekeeper block', ''); cbB.id = 'mdp-add-chores';
        cbB.onclick = function() {
          if (state.items.some(function(x) { return x.type === 'chore_block'; })) { RPGACE.utils.toast('This day already has a housekeeping block — change its length instead', '#e0a84c', 2600); return; }
          // The longest block that fits a free gap: 2 h, then shorter.
          var busy = state.items.filter(function(x) { return x.keep !== false && x.start; }).map(function(x) { var m = L.toMin(x.start); return { hour: Math.floor(m / 60), minute: m % 60, estimated_mins: x.mins }; });
          var mins = 120, sl = null;
          [120, 90, 60, 45, 30].some(function(len) {
            var got = L.suggestSlots([{ id: 'chores', title: 'Chores', est_mins: len, part_of_day: 'any' }], { shifts: L.shiftsOn(d), sched: L.busySched(d).concat(busy), nowMin: nowMinFor(d), timing: self._settings })[0];
            if (got && got.start != null) { sl = got; mins = len; return true; }
            return false;
          });
          state.items.push({ type: 'chore_block', title: '🧹 Homekeeper block', start: sl && sl.start != null ? L.fmtMin(sl.start) : '', mins: mins, keep: true, chore_ids: L.fillBlock(mins, d, L.blockedIds(d)).items.map(function(c) { return String(c.r.id); }) });
          L.sortDay(state.items); draw();
        };
        var dayBusy = function() { return state.items.filter(function(x) { return x.keep !== false && x.start; }).map(function(x) { var mm = L.toMin(x.start); return { hour: Math.floor(mm / 60), minute: mm % 60, estimated_mins: x.mins }; }); };
        // First free start at or after `from` (default: now), skipping the
        // shift, the 🌅/🌙 blocks, the Schedule and this plan's own items
        // (except `skip`).
        var slotFor = function(mins, from, skip) {
          var busy = state.items.filter(function(x) { return x !== skip && x.keep !== false && x.start; }).map(function(x) { var mm = L.toMin(x.start); return { hour: Math.floor(mm / 60), minute: mm % 60, estimated_mins: x.mins }; });
          var now = nowMinFor(d), sl = L.suggestSlots([{ id: 'blk', title: 'Block', est_mins: mins, part_of_day: 'any' }], { shifts: L.shiftsOn(d), sched: L.busySched(d).concat(busy), nowMin: from != null && (now == null || from > now) ? from : now, timing: self._settings })[0];
          return sl && sl.start != null ? L.fmtMin(sl.start) : '';
        };
        var ckB = self.ui._btn('+ Cooking block', ''); ckB.id = 'mdp-add-cooking';
        ckB.onclick = function() {
          self.ui.pickRecipes([], function(ids, mins) {
            if (!ids.length) return;
            state.items.push({ type: 'cooking_block', title: '🍳 Cooking', recipe_ids: ids, mins: mins || 60, start: slotFor(mins || 60), keep: true });
            L.sortDay(state.items); draw();
          });
        };
        var shB = self.ui._btn('+ Shopping block', ''); shB.id = 'mdp-add-shopping';
        shB.onclick = function() {
          self.ui.pickShopItems(d, state.items, [], function(items) {
            if (!items.length) return;
            var mins = 45, start = slotFor(mins);
            // Shop before you cook: on a day with a cooking block, go before it.
            // MD-1: only where that time is actually free; otherwise shop at the
            // first free time and move the cook to after it.
            var cook = state.items.filter(function(x) { return x.type === 'cooking_block' && x.keep !== false && x.start; })[0];
            if (cook) {
              var want = L.toMin(cook.start) - mins - 15;
              if (want >= 0 && slotFor(mins, want, cook) === L.fmtMin(want)) start = L.fmtMin(want);
              else if ((start = slotFor(mins, null, cook)) && L.toMin(start) + mins + 15 > L.toMin(cook.start)) {
                var shopAt = start;
                state.items.push({ type: 'shopping_block', title: '🛒 Shopping', shop_items: items, mins: mins, start: shopAt, keep: true });
                cook.start = slotFor(cook.mins, L.toMin(shopAt) + mins + 15, cook) || cook.start;
                L.sortDay(state.items); draw();
                return;
              }
            }
            state.items.push({ type: 'shopping_block', title: '🛒 Shopping', shop_items: items, mins: mins, start: start, keep: true });
            L.sortDay(state.items); draw();
          });
        };
        var rbB = self.ui._btn('+ Realm block', ''); rbB.id = 'mdp-add-realm';
        rbB.onclick = function() {
          self.ui.pickRealmBlock(null, function(nx) {
            if (!nx.realm_items.length) return;
            state.items.push({ type: 'realm_block', title: nx.title, realm: nx.realm, realm_items: nx.realm_items, mins: nx.mins, start: slotFor(nx.mins), keep: true });
            L.sortDay(state.items); draw();
          });
        };
        add.appendChild(rbB); add.appendChild(cbB); add.appendChild(ckB); add.appendChild(shB);
        pop.box.appendChild(add);
        var err = document.createElement('div');
        err.id = 'mdp-err';
        err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;margin-bottom:8px;';
        pop.box.appendChild(err);
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;';
        var close = self.ui._btn('Close', ''); close.onclick = function() { pop.close(); };
        var lock = self.ui._btn('🔒 Lock in', 'primary'); lock.id = 'mdp-lock';
        lock.onclick = function() {
          lock.disabled = true; lock.textContent = 'Locking in…';
          L.lockDay(d, state.items).then(function(res) {
            pop.close();
            RPGACE.utils.toast('🔒 ' + (d === today ? 'Today' : self.ui._dayLabel(d)) + ' planned: ' + res.added + ' on your Daily Schedule' + (res.skipped ? ' (' + res.skipped + ' already there)' : ''), '#4caf82', 3200);
            self.ui.render();
          }).catch(function(e) { lock.disabled = false; lock.textContent = '🔒 Lock in'; err.textContent = e.message || String(e); err.style.display = 'block'; });
        };
        bar.appendChild(close); if (state.items.length) bar.appendChild(lock);
        pop.box.appendChild(bar);
      };
      L.loadRecipes().catch(function() { return []; }).then(function() {
        load();
        // MD-7: opened from the Chores section - add the chore block straight away.
        if (opts && opts.add === 'chores') { var cb = pop.box.querySelector('#mdp-add-chores'); if (cb) cb.click(); }
      });
      return pop;
    },
    // DT-7: pick a realm (the one behind this week listed first), then its
    // activities. cb({ realm, title, realm_items, mins }).
    pickRealmBlock: function(current, cb) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc, xs = RPGACE.modules.xpSeason;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '✨ Realm block', title: current ? 'Change activities' : 'Which realm?', width: '520px', noDefaultClose: true });
      pop.box.id = 'mdp-realm-pick';
      var showActivities = function(realm) {
        var rl = xs && xs.REALMS[realm] ? xs.REALMS[realm] : { icon: '✨', name: realm };
        pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading…</div>';
        var pick = {};
        if (current && current.realm === realm) (current.realm_items || []).forEach(function(i) { pick[i.src + ':' + (i.ref_id || i.label)] = i; });
        L.realmOptions(realm).then(function(opt) {
          pop.box.innerHTML = '';
          var head = document.createElement('div');
          head.style.cssText = 'font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;';
          head.textContent = rl.icon + ' ' + rl.name + ' block';
          pop.box.appendChild(head);
          var info = document.createElement('div');
          info.id = 'mdp-realm-mins';
          info.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;';
          pop.box.appendChild(info);
          var lookup = {};
          var paint = function() {
            var list = Object.keys(pick).map(function(k) { return pick[k]; });
            var mins = list.reduce(function(a, i) { return a + (Number(i.mins) || 15); }, 0);
            info.textContent = list.length ? list.length + ' picked · about ' + mins + ' min' : 'Tick what you\'ll do. ⚡ = earns when you do the real thing; +10 = earns when you tick it.';
          };
          var addGroup = function(title, items) {
            if (!items.length) return;
            self.ui._group(pop.box, title);
            items.forEach(function(i) {
              var k = i.src + ':' + (i.ref_id || i.label); lookup[k] = i;
              var lab = document.createElement('label');
              lab.className = 'mdp-realm-item';
              lab.dataset.key = k;
              lab.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);min-height:44px;cursor:pointer;font-size:14px;color:var(--text);';
              var tag = i.earns === 'real' ? '⚡ ' + (i.how || 'earns from the real action') : '+' + self.TICK_XP + ' ' + rl.name + ' XP on tick';
              lab.innerHTML = '<input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (pick[k] ? ' checked' : '') + '><span style="flex:1;min-width:0;">' + esc(i.label) +
                '<br><span style="font-size:12px;color:var(--muted);">' + esc((i.mins ? i.mins + ' min · ' : '') + tag) + '</span></span>';
              lab.querySelector('input').onchange = function(ev) { if (ev.target.checked) pick[k] = i; else delete pick[k]; paint(); };
              pop.box.appendChild(lab);
            });
          };
          addGroup('Activities', opt.starters);
          addGroup('Your actions', opt.routines);
          addGroup('Books you\'re reading', opt.books);
          self.ui._group(pop.box, '✏️ My own');
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:8px;margin:6px 0 10px;';
          var inp = document.createElement('input');
          inp.type = 'text'; inp.id = 'mdp-realm-own'; inp.placeholder = 'e.g. 20 push-ups, call Gran';
          inp.style.cssText = 'flex:1;min-width:0;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;font-family:Rajdhani,sans-serif;';
          var ownBox = document.createElement('div');
          ownBox.id = 'mdp-realm-ownlist';
          var drawOwn = function() {
            ownBox.innerHTML = '';
            Object.keys(pick).filter(function(k) { return pick[k].src === 'own'; }).forEach(function(k) {
              var d = document.createElement('div');
              d.style.cssText = 'font-size:14px;color:var(--text);padding:3px 0;';
              d.textContent = '✏️ ' + pick[k].label + ' (+' + self.TICK_XP + ')';
              ownBox.appendChild(d);
            });
          };
          var addB = self.ui._btn('Add', ''); addB.id = 'mdp-realm-own-add';
          var addOwn = function() { var v = inp.value.trim(); if (!v) return; pick['own:' + v] = { src: 'own', label: v, mins: 15, earns: 'tick' }; inp.value = ''; drawOwn(); paint(); };
          addB.onclick = addOwn;
          inp.onkeydown = function(ev) { if (ev.key === 'Enter') { ev.preventDefault(); addOwn(); } };
          row.appendChild(inp); row.appendChild(addB);
          pop.box.appendChild(ownBox);
          pop.box.appendChild(row);
          drawOwn(); paint();
          var bar = document.createElement('div');
          bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
          var back = self.ui._btn(current ? 'Cancel' : '← Realms', '');
          back.onclick = function() { if (current) pop.close(); else showRealms(); };
          var ok = self.ui._btn('Use these', 'primary'); ok.id = 'mdp-realm-ok';
          ok.onclick = function() {
            if (inp.value.trim()) addOwn();
            var list = Object.keys(pick).map(function(k) { return lookup[k] || pick[k]; });
            var mins = Math.max(10, Math.min(480, list.reduce(function(a, i) { return a + (Number(i.mins) || 15); }, 0)));
            pop.close();
            cb({ realm: realm, title: rl.icon + ' ' + rl.name + ' block', realm_items: list, mins: mins });
          };
          bar.appendChild(back); bar.appendChild(ok);
          pop.box.appendChild(bar);
        }).catch(function(e) { pop.box.innerHTML = ''; var m = document.createElement('div'); m.style.cssText = 'color:#CC4A4A;font-size:13px;'; m.textContent = 'Could not load activities: ' + (e.message || e); pop.box.appendChild(m); });
      };
      var showRealms = function() {
        pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading…</div>';
        L.realmChoices().then(function(list) {
          pop.box.innerHTML = '';
          var grid = document.createElement('div');
          grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;';
          list.forEach(function(c) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'mdp-realm'; b.dataset.realm = c.realm;
            b.style.cssText = 'min-height:56px;padding:8px;border-radius:10px;cursor:pointer;text-align:left;font-family:Rajdhani,sans-serif;background:none;color:var(--text);border:1px solid ' + (c.behind ? 'var(--gold)' : 'var(--border)') + ';';
            b.innerHTML = '<div style="font-size:15px;font-weight:700;">' + esc(c.icon + ' ' + c.name) + '</div><div style="font-size:12px;color:' + (c.behind ? 'var(--gold)' : 'var(--muted)') + ';">' +
              esc(c.behind ? 'behind this week' + (c.week != null ? ' · ' + c.week + ' XP' : '') : (c.week != null ? c.week + ' XP this week' : '')) + '</div>';
            b.onclick = function() { showActivities(c.realm); };
            grid.appendChild(b);
          });
          pop.box.appendChild(grid);
          var cancel = self.ui._btn('Cancel', ''); cancel.style.marginTop = '12px';
          cancel.onclick = function() { pop.close(); };
          pop.box.appendChild(cancel);
        });
      };
      if (current && current.realm) showActivities(current.realm); else showRealms();
    },
    // Where a realm-block activity's Open button goes.
    openActivity: function(opens) {
      var self = RPGACE.modules.myDay, L = self.logic;
      if (!opens) return;
      if (opens === 'outreach') { var pt = RPGACE.modules.producerTools; if (pt && pt.ui.openOutreach) pt.ui.openOutreach(); return; }
      if (opens === 'smoke') { window.open('smoke_test.html', '_blank'); return; }
      if (opens === 'plan_tomorrow') { self.ui.openPlan(L.addDays(L.iso(), 1)); return; }
      self.ui._openTool(opens);
    },
    // DT-5: pick the recipes for a cooking block. cb(ids, minutes) - the
    // minutes come from Cooking's own scheduler for those recipes together.
    pickRecipes: function(selected, cb) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🍳 Cooking block', title: 'What are you cooking?', width: '480px', noDefaultClose: true });
      pop.box.id = 'mdp-recipe-pick';
      pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading recipes…</div>';
      var pick = {}; (selected || []).forEach(function(id) { pick[String(id)] = 1; });
      L.loadRecipes().then(function(all) {
        pop.box.innerHTML = '';
        if (!all.length) { pop.box.innerHTML = '<div style="font-size:14px;color:var(--muted);">No saved recipes yet — make one in Cooking first.</div>'; }
        var info = document.createElement('div');
        info.id = 'mdp-recipe-mins';
        info.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;';
        pop.box.appendChild(info);
        var chosen = function() { return all.filter(function(r) { return pick[String(r.id)]; }); };
        var paint = function() { var c = chosen(); info.textContent = c.length ? c.length + ' picked · about ' + L.cookMinutes(c) + ' min together (Cooking\'s own timing)' : 'Tick what you\'re cooking.'; };
        all.forEach(function(r) {
          var lab = document.createElement('label');
          lab.className = 'mdp-recipe';
          lab.dataset.id = r.id;
          lab.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);min-height:44px;cursor:pointer;font-size:14px;color:var(--text);';
          lab.innerHTML = '<input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (pick[String(r.id)] ? ' checked' : '') + '><span>' + esc(r.title) + '</span>';
          lab.querySelector('input').onchange = function(ev) { if (ev.target.checked) pick[String(r.id)] = 1; else delete pick[String(r.id)]; paint(); };
          pop.box.appendChild(lab);
        });
        paint();
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:12px;';
        var cancel = self.ui._btn('Cancel', ''); cancel.onclick = function() { pop.close(); };
        var ok = self.ui._btn('Use these', 'primary'); ok.id = 'mdp-recipe-ok';
        ok.onclick = function() { var c = chosen(); pop.close(); cb(c.map(function(r) { return String(r.id); }), c.length ? L.cookMinutes(c) : 0); };
        bar.appendChild(cancel); bar.appendChild(ok);
        pop.box.appendChild(bar);
      }).catch(function(e) { pop.box.innerHTML = ''; var m = document.createElement('div'); m.style.cssText = 'color:#CC4A4A;font-size:13px;'; m.textContent = 'Could not load recipes: ' + (e.message || e); pop.box.appendChild(m); });
    },
    // DT-6: pick what a shopping block is for, grouped by where it comes from,
    // plus anything typed by hand. cb(items).
    pickShopItems: function(isoDate, dayItems, selected, cb) {
      var self = RPGACE.modules.myDay, L = self.logic, esc = self.ui._esc;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🛒 Shopping block', title: 'What are you getting?', width: '520px', noDefaultClose: true });
      pop.box.id = 'mdp-shop-pick';
      pop.box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Loading your lists…</div>';
      var keyOf = function(i) { return i.src + ':' + (i.ref_id || i.ingredient_id || i.label); };
      var pick = {}, own = [];
      (selected || []).forEach(function(i) { if (i.src === 'own') own.push(i.label); else pick[keyOf(i)] = i; });
      L.shopSources(isoDate, dayItems).then(function(groups) {
        pop.box.innerHTML = '';
        var lookup = {};
        groups.forEach(function(g) {
          self.ui._group(pop.box, g.title);
          g.items.forEach(function(i) {
            var k = keyOf(i); lookup[k] = i;
            var lab = document.createElement('label');
            lab.className = 'mdp-shop-item';
            lab.dataset.key = k;
            lab.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);min-height:40px;cursor:pointer;font-size:14px;color:var(--text);';
            lab.innerHTML = '<input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);"' + (pick[k] ? ' checked' : '') + '><span>' + esc(i.label) + '</span>';
            lab.querySelector('input').onchange = function(ev) { if (ev.target.checked) pick[k] = i; else delete pick[k]; };
            pop.box.appendChild(lab);
          });
        });
        if (!groups.length) { var none = document.createElement('div'); none.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;'; none.textContent = 'Nothing on your lists right now — add your own below.'; pop.box.appendChild(none); }
        self.ui._group(pop.box, '✏️ My own');
        var ownBox = document.createElement('div');
        ownBox.id = 'mdp-own-list';
        pop.box.appendChild(ownBox);
        var drawOwn = function() {
          ownBox.innerHTML = '';
          own.forEach(function(label, n) {
            var row = document.createElement('div');
            row.className = 'mdp-own';
            row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text);padding:4px 0;';
            row.innerHTML = '<span style="flex:1;">' + esc(label) + '</span>';
            var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Remove');
            x.style.cssText = 'min-height:36px;min-width:36px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;';
            x.onclick = function() { own.splice(n, 1); drawOwn(); };
            row.appendChild(x); ownBox.appendChild(row);
          });
        };
        drawOwn();
        var addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex;gap:8px;margin:6px 0 10px;';
        var inp = document.createElement('input');
        inp.type = 'text'; inp.id = 'mdp-own-input'; inp.placeholder = 'e.g. batteries, bin bags';
        inp.style.cssText = 'flex:1;min-width:0;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;font-family:Rajdhani,sans-serif;';
        var addB = self.ui._btn('Add', ''); addB.id = 'mdp-own-add';
        var addOwn = function() { var v = inp.value.trim(); if (!v) return; own.push(v); inp.value = ''; drawOwn(); };
        addB.onclick = addOwn;
        inp.onkeydown = function(ev) { if (ev.key === 'Enter') { ev.preventDefault(); addOwn(); } };
        addRow.appendChild(inp); addRow.appendChild(addB);
        pop.box.appendChild(addRow);
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
        var cancel = self.ui._btn('Cancel', ''); cancel.onclick = function() { pop.close(); };
        var ok = self.ui._btn('Use these', 'primary'); ok.id = 'mdp-shop-ok';
        ok.onclick = function() {
          if (inp.value.trim()) addOwn();
          var items = Object.keys(pick).map(function(k) { return lookup[k] || pick[k]; }).filter(Boolean)
            .concat(own.map(function(l) { return { src: 'own', label: l }; }));
          pop.close(); cb(items);
        };
        bar.appendChild(cancel); bar.appendChild(ok);
        pop.box.appendChild(bar);
      }).catch(function(e) { pop.box.innerHTML = ''; var m = document.createElement('div'); m.style.cssText = 'color:#CC4A4A;font-size:13px;'; m.textContent = 'Could not load your lists: ' + (e.message || e); pop.box.appendChild(m); });
    },

    // Cooking's shopping list shows "next time I'm shopping" routines too.
    appendShopping: function(box) {
      var self = RPGACE.modules.myDay;
      var holder = document.createElement('div');
      box.appendChild(holder);
      RPGACE.sb.select('routines', 'select=id,title&active=eq.true&cadence=eq.next_time&context=eq.shopping').then(function(rows) {
        if (!Array.isArray(rows) || !rows.length) return;
        holder.style.cssText = 'margin-bottom:12px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;';
        holder.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">☀️ Also on this shop (My Day)</div>' +
          rows.map(function(r) { return '<div style="font-size:14px;color:var(--text);">• ' + self.ui._esc(r.title) + '</div>'; }).join('');
      }).catch(function() {});
    },
  },

  open: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.agenda); },
});
/* ===END:myDay=== */
