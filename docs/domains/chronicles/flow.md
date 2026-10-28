# system_flow_map — Chronicles (domain `chronicles`)
Moved here from `system_flow_map.md` on Oct 28 2026 (CK-3/4, plan "Caps and Central Kit"); text unchanged. The root file keeps cross-domain sections and links here.

## 9. The Chronicles (activity-log aggregation + finance ledger)

```mermaid
flowchart TD
    T1[(content_productions)] --> AGG[careerStatCard._fetchAll<br/>+ chroniclesLog._render]
    T2[(journal)] --> AGG
    T3[(encyclopedia_insights)] --> AGG
    T4[(taxonomy_proposals<br/>status: accepted)] --> AGG
    T5[(bookworm_chapters<br/>status: complete)] --> AGG
    T6[(reference_tracks)] --> AGG
    T7[(chronicles_finance<br/>NEW — sale/expense rows)] --> AGG
    T8[(system_updates<br/>NEW — Claude Code's own changes)] --> AGG
    AGG --> BUILD[_buildItems<br/>merge + sort by date]
    BUILD --> DASH[Dashboard preview<br/>top 5, always visible]
    BUILD --> LOG[#page-chronicles<br/>full history, search, type filters]
    DASH --> CLICK{Row clicked}
    LOG --> CLICK
    CLICK --> DETAIL[_showDetail → _detailFor<br/>What/Outcome/Where/Why per source type]
    FORM[+ Log Sale/Expense form] -->|manual entry only| T7
```

Real design choice, not an oversight: `chronicles_finance` feeds Chronicles' display but is deliberately **excluded** from the career-score XP/Level formula computed in the same `_fetchAll` pass — confirmed via interrogation this is a separate visibility lane. `bookworm_chapters` feeds the cumulative Growth *count* but is excluded from the streak/recent-activity date logic (its `created_at` is a bulk-insert timestamp from TOC detection, not real per-chapter completion time — would show a misleading date otherwise).

---

## 15f. XP Season Pass (Oct 13-14 2026, XP-1..8) — built, untested by Alex

```mermaid
flowchart LR
  W[Writes to 15 tables + gym_sets] -->|DB trigger xp_on_change| A[xp_award + xp_rules]
  A --> E[(xp_events — private ledger)]
  E --> U[xp_check_unlocks: lake, ranks, progress, challenges, quest steps, levels, treats]
  U --> UL[(xp_unlocks)]
  U --> CH[(xp_challenges)]
  U --> TR[(xp_treats -> wishlist_items.treat_earned_at)]
  C[pg_cron xp-close-periods 00:05 UTC] --> CP[xp_close_periods: unanswered XP, balance + budget-week bonus]
  CP --> RP[(xp_reports — frozen week/season/year)]
  RP --> WR[Year Wrapped cards + one Oracle paragraph, wrapped_text]
  E --> CARD[xpSeason card: realms, Trophy cabinet, Hall of Seasons, themes]
  M[Monday: one Oracle call] --> CH
```

Only DB triggers write `xp_events`; the client never awards XP. Private tables (`xp_*`, `outreach_log`) are read through `/api/data-write` action `read`. Year Wrapped reads the frozen year report, never live rows; "Year so far" is the live version. Migrations: `records/2026-10/xp5..xp8_migration_*.sql`.
