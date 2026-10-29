# Chronicles domain — XP Season Pass, Chronicles, career stats

Read before touching any `domain: 'chronicles'` module, the `xp_*` tables or `system_updates`.

Modules (`domain: 'chronicles'`, 3): `careerStatCard`, `chroniclesLog`, `xpSeason`.

## XP Season Pass (`xpSeason`)
- Private `xp_events` ledger written only by DB triggers (`xp_on_change` → `xp_award` → `xp_rules`) on 15 tables + `gym_sets`; 13 realms. `xp_on_change` pays a `quest_log` routine tick only when `xp > 0`.
- `xp_award` dates a `quest_log` award by the row's `completed_at` (London day) when that is 1–7 days back; everything else earns on today.
- The pass is a Year (Year 0: Construction; Year 2027 from 1 Jan); "season" = UK weather season; DB `season` columns hold the year.
- Unlocks: `xp_check_unlocks()` → `xp_unlocks` (`xp_ladders`, `xp_unlock_defs`, `xp_settings.progress`), Trophy cabinet. Level-ups are `xp_unlocks` kind `level`.
- Close: pg_cron `xp-close-periods` (00:05 UTC) → `xp_close_periods()` (keeps unanswered XP, balance bonus, frozen `xp_reports`); same-week deletes ask "was it done?".
- Challenges: `xp_challenges` (weekly 3 from rules + one Monday Oracle call; resolutions 1-5 per UK season; realm-quest steps `xp_quest_steps`), counted by `xp_update_challenges()`/`xp_quest_check()`.
- Treats: `xp_treats` + `xp_check_treats()` (+ `wishlist_items.treat_earned_at`); themes `xp_settings.theme`; Mind area + `routines.is_sleep` (Lake 21/28 days, `xp_check_lake()`); private `outreach_log`; `xp_settings.weekly_spend_limit`.
- UI: dashboard HUD `.char-header` via `xpSeason.ui.hudFor`/`ui.buildHud` (2-page swipe: overall, 13-realm wheel); per-domain `ui.strip` is one slim realm line (`.xp-slim-row`); tap opens `ui.openRealmHome(r)` (full card `ui.stripFull`, `_realmTarget` — Hustler only: month money in vs `monthlyOf(settings)` — and buttons to every `.ln-card` whose `data-realms` include the realm) [UD-1](../../patch_notes.html#card-2026-10-27-ui-debloat-1) (`CARD_REALMS`/`PAGE_REALMS`). Realm frame (RF-1..9): `realmFrame` module renders the same 7 pieces on every realm home (target + What's next via `areaNav.next`, Ready from other realms, Tasks/Live/Take in/Log/Prompts/Weekly review tiles); one target per realm via `realmFrame.logic.targetOf` (Creator `posts_per_week`, Hustler `monthly_income_target`, Steward `weekly_spend_limit`, others `xp_settings.realm_targets`; counters in `logic.COUNT` by registry `source`); slim realm line shows it; `gymTracker.WEEKLY_TARGET` follows Athlete's. [RF](../../patch_notes.html#card-2026-10-27-realm-frame) Year Wrapped from frozen year `xp_reports` (+ `wrapped_text`, `wrapped_seen_at`), Hall of Seasons, January nudges `xpSeason.logic.yearDue`.
- Cards: [1+2](../../patch_notes.html#card-2026-10-13-xp-season-pass) [3](../../patch_notes.html#card-2026-10-13-xp-ranks-trophies) [4](../../patch_notes.html#card-2026-10-13-xp-reports-year) [5](../../patch_notes.html#card-2026-10-13-xp-challenges) [6](../../patch_notes.html#card-2026-10-14-xp-treats-themes) [7](../../patch_notes.html#card-2026-10-14-xp-mind-outreach-budget) [8](../../patch_notes.html#card-2026-10-14-xp-year-wrapped) [swipe card](../../patch_notes.html#card-2026-10-14-xp-swipe-card) [realm cards](../../patch_notes.html#card-2026-10-14-realm-cards)

## Chronicles
- `chroniclesLog` shows the app-side timeline: `system_updates` (one row per shipped Claude Code change), `chronicles_finance` (income/expenses — Wishlist bought, Plans money tasks and Selling write here) and journal/quest/cook rows; filters by 8 life sections and by realm (LL-8, DN-6). Bibliography is consolidated into Chronicles (A6/A15).
- `careerStatCard` renders the career stat card on the dashboard.

## Side list declutter (SL-5, Oct 27)
- Chronicles: the 9 section chips fold into one "Show: … ▾" row (`chroniclesLog._renderFilterChips` + `RPGACE.sideList.filterRow`); + Log Sale / Expense stays. [story](../../patch_notes.html#card-2026-10-27-side-list-domains)
- Chronicles reads kept `memories` (DR-6) as type `memory` in the "✈️ Trips, plans & memories" section; its › side list opens 🎞 Memories (`eventMemories.ui.openMemories`). [story](../../patch_notes.html#card-2026-10-27-picker-memories)
