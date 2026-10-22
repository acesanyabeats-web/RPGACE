# Chronicles domain — XP Season Pass, Chronicles, career stats

Read before touching any `domain: 'chronicles'` module, the `xp_*` tables or `system_updates`.

Modules (`domain: 'chronicles'`, 3): `careerStatCard`, `chroniclesLog`, `xpSeason`.

## XP Season Pass (`xpSeason`)
- Private `xp_events` ledger written only by DB triggers (`xp_on_change` → `xp_award` → `xp_rules`) on 15 tables + `gym_sets`; 13 realms. `xp_on_change` pays a `quest_log` routine tick only when `xp > 0`.
- The pass is a Year (Year 0: Construction; Year 2027 from 1 Jan); "season" = UK weather season; DB `season` columns hold the year.
- Unlocks: `xp_check_unlocks()` → `xp_unlocks` (`xp_ladders`, `xp_unlock_defs`, `xp_settings.progress`), Trophy cabinet. Level-ups are `xp_unlocks` kind `level`.
- Close: pg_cron `xp-close-periods` (00:05 UTC) → `xp_close_periods()` (keeps unanswered XP, balance bonus, frozen `xp_reports`); same-week deletes ask "was it done?".
- Challenges: `xp_challenges` (weekly 3 from rules + one Monday Oracle call; resolutions 1-5 per UK season; realm-quest steps `xp_quest_steps`), counted by `xp_update_challenges()`/`xp_quest_check()`.
- Treats: `xp_treats` + `xp_check_treats()` (+ `wishlist_items.treat_earned_at`); themes `xp_settings.theme`; Mind area + `routines.is_sleep` (Lake 21/28 days, `xp_check_lake()`); private `outreach_log`; `xp_settings.weekly_spend_limit`.
- UI: dashboard HUD `.char-header` via `xpSeason.ui.hudFor`/`ui.buildHud` (2-page swipe: overall, 13-realm wheel); per-domain `ui.strip` (`CARD_REALMS`/`PAGE_REALMS`). Year Wrapped from frozen year `xp_reports` (+ `wrapped_text`, `wrapped_seen_at`), Hall of Seasons, January nudges `xpSeason.logic.yearDue`.
- Cards: [1+2](../../patch_notes.html#card-2026-10-13-xp-season-pass) [3](../../patch_notes.html#card-2026-10-13-xp-ranks-trophies) [4](../../patch_notes.html#card-2026-10-13-xp-reports-year) [5](../../patch_notes.html#card-2026-10-13-xp-challenges) [6](../../patch_notes.html#card-2026-10-14-xp-treats-themes) [7](../../patch_notes.html#card-2026-10-14-xp-mind-outreach-budget) [8](../../patch_notes.html#card-2026-10-14-xp-year-wrapped) [swipe card](../../patch_notes.html#card-2026-10-14-xp-swipe-card) [realm cards](../../patch_notes.html#card-2026-10-14-realm-cards)

## Chronicles
- `chroniclesLog` shows the app-side timeline: `system_updates` (one row per shipped Claude Code change), `chronicles_finance` (income/expenses — Wishlist bought, Plans money tasks and Selling write here) and journal/quest/cook rows; filters by 8 life sections and by realm (LL-8, DN-6). Bibliography is consolidated into Chronicles (A6/A15).
- `careerStatCard` renders the career stat card on the dashboard.
