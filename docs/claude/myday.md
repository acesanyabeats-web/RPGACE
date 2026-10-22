# My Day, Doing Now, XP, Plans

Read before touching `myDay`, `doingNow`, `xpSeason`, `tripPlans`, realms or schedule code. Present tense; stories in the linked cards; older items in `CLAUDE_archive.md` ("My Day older items").

## My Day (`myDay`, replaced the Quest Board)
- Home (MD-0): 5-step strip, `AREAS.myday`. [story](../../patch_notes.html#card-2026-10-18-my-day-home) Overall: [My Day](../../patch_notes.html#card-2026-10-12-my-day)
- Timeline (MD-1): one `logic.segments` timeline; 🌅/🌙 bookends from `myday_settings` (wake/bed/tasks); `logic.guard` = no overlap + push + shorten + Undo; wake alarm in `myday_alarms`, sent by `push_alarm()`. [story](../../patch_notes.html#card-2026-10-20-my-day-timeline)
- Plan week (MD-2): day timeline `ui.weekTimeline`, drag via `logic.dragLimits`, methods per realm/block. [story](../../patch_notes.html#card-2026-10-20-plan-week-timeline)
- Plan my day (MD-3): lists planned blocks and what's due (no templates — AC-2 deleted `day_templates`/`week_templates`); 📋 `ui.planBlock` ranks via `logic.rankOptions`; frog / 1-3-5 from `myday_settings.plan_style`. [MD-3](../../patch_notes.html#card-2026-10-20-plan-block) [AC-2](../../patch_notes.html#card-2026-10-21-no-templates)
- Focus timer (MD-4): `logic.startFocus`/`focusPhases`, focus rows in `myday_alarms`, +15 bonus XP. [story](../../patch_notes.html#card-2026-10-20-focus-timer)
- Good morning (MD-5): `ui.openMorning` (+ `dashDeck.ui._fillBrief`), opens once after wake. [story](../../patch_notes.html#card-2026-10-20-good-morning)
- Evening review (MD-6): `ui.openEvening` 30 min before bed; Tomorrow/Drop/Skip; `journal` row `evening_review` → +10 Mind. [story](../../patch_notes.html#card-2026-10-20-evening-review)
- Schedule links (MD-7): 🌅/🌙 + ☀️ My Day links (`logic.calendarBookends`, `ui.openFromSchedule`); chore block via Plan my day + `ui.pickChores`. One shift-clash check `logic.clashWith` for Plan my day, calendar ⚠ and + Add task. [MD-7](../../patch_notes.html#card-2026-10-20-myday-schedule-links) [clash](../../patch_notes.html#card-2026-10-20-schedule-clash-check)
- Did vs planned (MD-8): ✅ What you did on Schedule from `logic.loadDid` (Doing Now + `xp_events`, not stored). Ticks → `quest_log`. [story](../../patch_notes.html#card-2026-10-20-did-blocks)
- Drag timeline home (MDX). [story](../../patch_notes.html#card-2026-10-21-my-day-drag)
- Actions (AC-1): routines are labelled Actions and top the ▾ list. [story](../../patch_notes.html#card-2026-10-21-actions)
- Blocks: `chore_blocks` (kind/items/realm/`planned_cook_id`; status planned/cancelled/replaced/missed; `replaced_by`). Live block = `!status || status==='planned'` (`blockLive`). Chores use cadence `routines.every_days`; realm block ticks → `quest_log` kind `block` → `block_tick` (+10).
- AC-4 "Did this replace your block?": overlap rule = min(half the block, 30 min); `logic.moveBlockAfter`, `logic.replaceBlock`, `_retireBlock`. [story](../../patch_notes.html#card-2026-10-22-replaced-blocks)
- AC-5 "What happened?": `day_misses` (kind block|morning, reason, action later|tomorrow|drop|none); `logic.missedItems`/`wokeLate`; today-only `myday_settings.wake_override` read only via `logic.stFor(isoDate)`; shows in evening and Sunday reviews. [story](../../patch_notes.html#card-2026-10-22-what-happened)
- Shifts: `rpgace_shifts`; `rota-sync.yml` imports Fourth every Monday (`sync_status`); rota → `shiftSync.logic.fromRotaJson`. Push via edge fn `myday-push` + `push_digest()` (keys in `app_secrets`). Habit features: `routines.minimum`/`after_routine_id`, never-miss-twice, Sunday review (`journal` source `weekly_review`), `cutback_items`/`cutback_log`.

## Doing Now (`doingNow`)
- Rows in `rpgace_agendas` with `source_type='doing_now'` + `realms`/`details`. 4h cap; repeats → offer a routine; XP via trigger `xp_on_doing_now` (30 XP split across realms, max 3 a day, skips planned_cook/gym links). Chronicles by realm + Sunday review. [DN](../../patch_notes.html#card-2026-10-16-doing-now) [cook/gym](../../patch_notes.html#card-2026-10-16-doing-now-cook-gym) [Chronicles](../../patch_notes.html#card-2026-10-16-doing-now-chronicles)
- AC-3: Doing now / I just did ask when + how long (`ui._askWhen`); live pages open for cook, gym, study (`studyHub`), reading (Bookworm in-progress book); Actions ticked with 0 XP so XP is never paid twice. [story](../../patch_notes.html#card-2026-10-22-when-and-live)

## XP Season Pass (`xpSeason`)
- Private `xp_events` ledger written only by DB triggers (`xp_on_change` → `xp_award` → `xp_rules`) on 15 tables + `gym_sets`; 13 realms. `xp_on_change` pays a `quest_log` routine tick only when `xp > 0`.
- The pass is a Year (Year 0: Construction; Year 2027 from 1 Jan); "season" = UK weather season; DB `season` columns hold the year.
- Unlocks: `xp_check_unlocks()` → `xp_unlocks` (`xp_ladders`, `xp_unlock_defs`, `xp_settings.progress`), Trophy cabinet. Level-ups are `xp_unlocks` kind `level`.
- Close: pg_cron `xp-close-periods` (00:05 UTC) → `xp_close_periods()` (keeps unanswered XP, balance bonus, frozen `xp_reports`); same-week deletes ask "was it done?".
- Challenges: `xp_challenges` (weekly 3 from rules + one Monday Oracle call; resolutions 1-5 per UK season; realm-quest steps `xp_quest_steps`), counted by `xp_update_challenges()`/`xp_quest_check()`.
- Treats: `xp_treats` + `xp_check_treats()` (+ `wishlist_items.treat_earned_at`); themes `xp_settings.theme`; Mind area + `routines.is_sleep` (Lake 21/28 days, `xp_check_lake()`); private `outreach_log`; `xp_settings.weekly_spend_limit`.
- UI: dashboard HUD `.char-header` via `xpSeason.ui.hudFor`/`ui.buildHud` (2-page swipe: overall, 13-realm wheel); per-domain `ui.strip` (`CARD_REALMS`/`PAGE_REALMS`). Year Wrapped from frozen year `xp_reports` (+ `wrapped_text`, `wrapped_seen_at`), Hall of Seasons, January nudges `xpSeason.logic.yearDue`.
- Cards: [1+2](../../patch_notes.html#card-2026-10-13-xp-season-pass) [3](../../patch_notes.html#card-2026-10-13-xp-ranks-trophies) [4](../../patch_notes.html#card-2026-10-13-xp-reports-year) [5](../../patch_notes.html#card-2026-10-13-xp-challenges) [6](../../patch_notes.html#card-2026-10-14-xp-treats-themes) [7](../../patch_notes.html#card-2026-10-14-xp-mind-outreach-budget) [8](../../patch_notes.html#card-2026-10-14-xp-year-wrapped) [swipe card](../../patch_notes.html#card-2026-10-14-xp-swipe-card) [realm cards](../../patch_notes.html#card-2026-10-14-realm-cards)

## Realms
- Every input/quest/plan carries chosen realms (`RPGACE.realmPicker`; "Not now" holds); else `RPGACE.realmOf`. Lenses + realm↔phylum map in `realm_lenses.json`; `realmBrief` = Brief realm pick + per-realm report periods. [Realm Inputs](../../patch_notes.html#card-2026-10-15-realm-reports) [RC-0](../../patch_notes.html#card-2026-10-15-realm-phyla) [RC-1](../../patch_notes.html#card-2026-10-15-phylum-path-realms) [RC-2](../../patch_notes.html#card-2026-10-15-knowledge-feeds-realms) [RC-3](../../patch_notes.html#card-2026-10-15-quests-by-realm) [RC-4](../../patch_notes.html#card-2026-10-15-realm-milestones) [RC-5](../../patch_notes.html#card-2026-10-15-realm-connectors-done)

## Plans (`tripPlans`, TP-1..7)
- Private `travel_profile`/`people`/`plans`/`plan_tasks`, read via `/api/data-write` action `read`. Starred ideas = `plans` status `idea`. Web search `/api/search` type `web` (Gemini only, key pending; Tavily built but off). [story](../../patch_notes.html#card-2026-10-12-trip-plans)
- Book-by Due rows 7 days out (`tripPlans.logic.tripDue`, `.dd-ld-hot`); ticking a money task → `plan_tasks.cost_paid` + one `chronicles_finance` Travel expense; after-trip log = `journal` source `trip_log` + `plans.details.trip_log`; who's-coming chips. [story](../../patch_notes.html#card-2026-10-14-plans-money-people)
