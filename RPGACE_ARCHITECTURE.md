# RPGACE — Software Architecture Analysis & Foundation Plan
**Date:** June 26 2026  
**Status:** Pre-Step-8 Hardening  
**Author:** Architecture Review

---

## The Diagnosis

Before writing a line of new code, you need to know exactly why the last session produced 15 patch scripts, a wiped file, a syntax error on login, and four button-swap attempts. The answer is one structural failure compounding into everything else.

**Root cause: there is no extension system. Every new feature requires editing the source file.**

When you have no extension system, adding a feature means:
1. Find an exact string in a 263k character file
2. Replace it with something longer
3. Hope no other patch already changed that string
4. Deploy and discover the failure in production

This is why you got `Unexpected token ')'` on login. The IIFE we injected into an onclick template literal had a closing `"` that the HTML parser ate before the JS syntax was complete. A tiny formatting issue in one string replacement brought down the entire app.

---

## Current State — Full Audit

### The File
- `main.js` — 263,533 bytes, 4700+ lines, one file, no modules
- Zero separation of concerns — Oracle, calendar, Composio, encyclopedia, schedule all in the same scope
- 15+ patches applied this session via Python string replacement
- Encoding corruption: surrogate characters throughout from patch operations

### Duplicate Functions (3 versions each)
```
buildWeekSlots     — line 215 (original) + line 1838 (injected v2) + v3 from calendar patches
buildMonthSlots    — line 216 (original) + line 1727 (injected v2) + v3 from calendar patches  
renderDailyGrid    — defined and overridden multiple times
scheduleAgenda     — defined in calendar_v1, redefined in master_patch
patchAgendaCardsWithSchedule — defined, gutted, redefined
```

The original versions at lines 215-216 still exist and still run briefly on page load before the injected versions take over. This creates timing races.

### Global State Chaos
```javascript
window._dailyDate        // current day in daily view
window._calWeekStart     // Monday of current weekly view
window._calMonthDate     // current month in monthly view  
window._pendingSchedAgenda  // agenda waiting to be scheduled
window.CURRENT_EDL       // video edit decision list
window.CURRENT_JOB_ID    // active video job
window.STATE             // existing RPGACE state object
window.sb                // supabase client
```
8 window globals with no validation, no typing, no change notifications. Any function anywhere can corrupt any of these at any time.

### localStorage — Raw and Unprotected
```javascript
'rpgace_shifts'          // shifts from Fourth rota
'rpgace_sched_agendas'   // user-scheduled agenda blocks
'rpgace_daily_log'       // past day action log
```
Every read is `JSON.parse(localStorage.getItem(key)||'[]')`. No schema validation. No migration path. If the data format changes, old data silently returns wrong shapes.

### API Pattern — 3 Different Styles
```javascript
// Style 1: direct fetch in main.js
const res = await fetch('/api/oracle', {...});

// Style 2: callOracle() helper
const resp = await callOracle(messages, system);

// Style 3: callComposio() helper
const data = await callComposio(action, opts);
```
No unified error handling. No retry logic. No loading state management. When the oracle returns a 500 you get a red error in the UI, but nothing else knows about it.

### The Injection Pattern — Why It Keeps Breaking
Every new feature follows this pattern:
```python
src = src.replace("function initApp(){", NEW_CODE + "\nfunction initApp(){", 1)
```
Problems:
- Requires exact string match. One previous patch that changed that string = silent failure
- All code piled before initApp in insertion order = no logical grouping  
- Surrogate characters accumulate with each encode/decode cycle
- No way to test a patch before it hits production
- No rollback except git checkout (which wipes all patches)

---

## The Fix — A Foundation Layer

The solution is not a rewrite. A rewrite would take weeks and break everything. The solution is a **second file** that wraps, extends, and stabilises what exists — without touching main.js ever again.

```
main.js          ← FROZEN. Never edit again. Stable known entity.
rpgace_core.js   ← ALL new code goes here. Step 8+ lives here.
```

`rpgace_core.js` loads after `main.js` and does four things:

**1. Creates a namespace** (`RPGACE`) so new code never pollutes `window`

**2. Wraps existing functions** with hooks instead of replacing strings:
```javascript
// Instead of: src.replace("function showSched", patchedVersion)
// We do:
const _orig = showSched;
window.showSched = function(type, btn) {
  _orig.call(this, type, btn);           // original still runs
  RPGACE.hooks.fire('sched:show', type); // new features hook in here
};
```

**3. Provides a safe data layer** so localStorage is never accessed raw:
```javascript
RPGACE.DB.get('shifts')        // validated, fallback-safe
RPGACE.DB.set('shifts', data)  // type-checked, fires change events
RPGACE.DB.push('sched', item)  // auto-ID, validates schema
```

**4. Provides a module registry** so Step 8 features are self-contained:
```javascript
// Feynman Loop (Step 8) registers itself — no main.js edit needed
RPGACE.register('feynman', {
  init() {
    RPGACE.hooks.on('page:show', name => {
      if (name === 'oracle') this.renderWidget();
    });
  }
});
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  VERCEL FRONTEND                     │
│                                                     │
│  index.html                                         │
│    ├── main.js  (FROZEN — never edit again)         │
│    │     ├── checkPassword / initApp                │
│    │     ├── showPage / showSched                   │
│    │     ├── Oracle / Composio / Supabase calls     │
│    │     ├── Encyclopedia / Journal / Agenda        │
│    │     ├── Calendar (weekly/monthly/daily)        │
│    │     └── Schedule modal / time tracking         │
│    │                                                │
│    └── rpgace_core.js  (ALL NEW CODE GOES HERE)     │
│          ├── RPGACE.DB        (data layer)          │
│          ├── RPGACE.STATE     (state machine)       │
│          ├── RPGACE.hooks     (event system)        │
│          ├── RPGACE.api()     (unified API caller)  │
│          ├── RPGACE.utils     (shared utilities)    │
│          └── RPGACE.modules.* (Step 8+ features)   │
│                ├── feynman    (Step 8)              │
│                ├── visualGen  (Step 9)              │
│                ├── beatLog    (Step 10)             │
│                └── videoTab   (Step 30)             │
│                                                     │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  /api/*.js              Supabase
  (Vercel functions)     Postgres
  oracle.js              Tables:
  composio.js            - journal_entries
  analyst.js             - encyclopedia
  search.js              - taxonomy_nodes
  ...                    - video_jobs
                         - intel_reports
```

---

## The Hook System — How Step 8+ Features Get Added

Every place a new feature might need to inject behaviour has a hook:

| Hook | Fires when | Used by |
|------|------------|---------|
| `rpgace:ready` | Foundation layer is live | All modules, on init |
| `sched:show` | Any schedule tab opens | Daily nav, weekly builder |
| `page:show` | Any nav page opens | Any page-specific module |
| `agendas:rendered` | Agenda cards redrawn | Schedule button patcher |
| `xp:awarded` | XP is given | Streak tracker, level-up |
| `db:change` | Any DB key written | Sync triggers, UI updates |
| `shift:loaded` | Shifts loaded from Fourth | Agenda generator context |

To add a new feature in Step 8, you no longer edit main.js. You write a module in rpgace_core.js:

```javascript
RPGACE.register('feynmanLoop', {
  init() {
    // Hook into Oracle page opening
    RPGACE.hooks.on('page:show', (name) => {
      if (name === 'oracle') this.injectWidget();
    });
  },
  
  injectWidget() {
    const panel = document.getElementById('prod-oracle-panel');
    if (!panel || document.getElementById('feynman-widget')) return;
    // inject Feynman UI here
  },
  
  async startSession(concept) {
    const response = await RPGACE.oracle([
      { role: 'user', content: `Teach me ${concept} using only questions.` }
    ], FEYNMAN_SYSTEM_PROMPT);
    
    RPGACE.DB.push('feynman_sessions', {
      concept, response,
      date: RPGACE.utils.dateStr(),
    });
    
    RPGACE.utils.toast('Feynman session started — answer in Oracle chat');
  }
});
```

No string replacement. No file corruption. No encoding issues. The module is self-contained and testable.

---

## What main.js Issues Remain (and why we leave them)

The following issues exist in main.js but are NOT worth fixing:

| Issue | Why we leave it |
|-------|----------------|
| Duplicate buildWeekSlots/buildMonthSlots | Injected versions override originals. No visible effect. |
| Encoding corruption (surrogate chars) | File renders fine in browser. Fixing risks new corruption. |
| openSchedulePicker orphaned button | The button was removed from UI. Dead code but harmless. |
| window globals (_dailyDate etc.) | Foundation layer bridges these to RPGACE.STATE via defineProperty. |
| Raw localStorage calls in old code | Old code still works. New code uses RPGACE.DB. |

The risk of touching main.js again outweighs the benefit of cleaning it. The file works. Leave it.

---

## Implementation Plan

**Step A (now):** Install rpgace_core.js
- Write the foundation layer file
- Add `<script src="rpgace_core.js"></script>` to index.html
- Deploy. RPGACE.DB, RPGACE.hooks, RPGACE.api are now live.

**Step B (Step 8):** Feynman Loop module
- Written entirely in rpgace_core.js
- Registers on `page:show` hook  
- Zero main.js changes

**Step C (Step 9+):** Each subsequent feature
- One module per feature in rpgace_core.js
- Register, hook, done
- main.js untouched

**Git workflow going forward:**
```
git add main.js rpgace_core.js  ← both tracked
git commit -m "Step 8: Feynman Loop module"
```

When rpgace_core.js gets large (>500 lines), split into:
- `rpgace_core.js` (foundation only)
- `rpgace_modules.js` (Step 8+ features)

---

## The Governing Rule Applied to Architecture

> "Does this feature directly result in a beat being made or a video posted within 48 hours of using it?"

This rule applies to architecture too. The foundation layer is justified because every future feature would otherwise take 3-5 hours of debugging per syntax error. The foundation pays back immediately on Step 8.

Don't add to rpgace_core.js what doesn't serve the governing rule. No feature experiments, no infrastructure for infrastructure's sake.

---

## Quick Reference — What Goes Where

| What | Where |
|------|-------|
| Bug fix in existing calendar/agenda | main.js via Python patch (last resort) |
| New UI feature (Feynman, Beat Log, etc.) | rpgace_core.js — RPGACE.register() |
| New API call | rpgace_core.js — RPGACE.api('TOOL_NAME', params) |
| New data storage | rpgace_core.js — RPGACE.DB.get/set/push |
| New global state | rpgace_core.js — RPGACE.STATE.set/get |
| New Vercel function | api/newfile.js |
| New Supabase table | Supabase SQL editor |
| Oracle system prompt change | api/oracle.js or api/_context.js |

