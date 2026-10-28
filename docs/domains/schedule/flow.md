# system_flow_map — Schedule (domain `schedule`)
Moved here from `system_flow_map.md` on Oct 28 2026 (CK-3/4, plan "Caps and Central Kit"); text unchanged. The root file keeps cross-domain sections and links here.

## 15e. My Day (Oct 12 2026) — built, untested by Alex

```mermaid
flowchart LR
  I[IDEAS menu in myDay] -->|Alex picks + sets cadence/time/goal| R[(routines)]
  R --> T[Today list on Agenda page]
  T -->|tick / skip| Q[(quest_log, quest_kind=routine)]
  Q --> X[addXP + questEngine restore = level]
  T -->|timed tick| D[(quest_duration_stats)]
  R --> P[Plan my day: suggestSlots around shifts + sched]
  P -->|accepted| S[scheduleToCalendar -> rpgace_agendas]
  O[Oracle Accept / Insta + Add] -->|one-off due today| R
  R -->|next time shopping| C[Cooking shopping list]
  T --> G[Landing Today: N routines left]
  CH[Chore setup: 20 starters + own] -->|every_days, last_done_before| R
  R -->|every_days: due when N days since last tick| CS[Chores section on My Day]
  CS -->|tick| Q
  CS --> CB[Chore block: day + start + length]
  CB -->|fillBlock: most overdue first, fits by minutes| CBT[(chore_blocks)]
  CBT -->|scheduleToCalendar, 0 XP| S
  P -->|DT-1: day kind from shifts| DT[(day_templates: saved + locked)]
  DT -->|learnedSource: same kind + weekday| P
  P -->|Lock in| S
  P -->|Lock in| RP[(routine_plans)]
  P -->|Lock in| DT
  NB[Due list from 18:00 / after a close] -->|nightBeforeStatus: locked or on schedule?| DT
  NB -->|tap| P
  P -->|+ Cooking block: pick recipes| CKB[cooking block]
  P -->|+ Shopping block: cook missing, cook lists, newest list, Wishlist, routines, own| SHB[shopping block]
  CKB -->|Lock in: _generateShoppingList + _acceptSchedule| PC[(planned_cooks + shopping_lists)]
  SHB -->|Lock in: match cook items to that list| CBT
  CKB --> CBT
  CBT -->|Blocks today checklist ticks| TK[shopping_list_items bought / Wishlist bought / routine tick / _finishCook]
  P -->|+ Realm block: realm behind this week first| RB[realm block: starters + routines + books + own]
  RB --> CBT
  CBT -->|+10 tick: quest_log kind block| XPB[xp_on_change → block_tick → realm XP]
```

## 15h. Plans money, dates + people (TP-6/TP-7, Oct 14 2026) — built, untested by Alex

```mermaid
flowchart LR
  PT[(plan_tasks due_by)] -->|read, signed in| TD[tripPlans.logic.tripDue]
  PL[(plans: status, end_date, people, details)] --> TD
  PE[(people last_spoke)] --> TD
  TD -->|book-by within 7 days, hot on/after the day| DUE[Due list row] -->|tap| PV[Plan view]
  TD -->|ended ≤30 days, no trip_log| DUE
  TD -->|trip ≤14 days, person not spoken this week| DUE
  PV -->|tick money task: what did you pay?| MB{Amount?}
  MB -- amount --> CP[(plan_tasks.cost_paid + done)] --> FIN[(chronicles_finance expense, Travel)] --> XPE[expense_logged XP]
  MB -- Done, no cost --> CP
  PV -->|After-trip log| J[(journal source trip_log)] --> XPJ[journal_entry XP]
  PV -->|log saved| PD[(plans.details.trip_log, status done)]
  PD -->|Cook it at home| CO[cookingOracle._showGenerateForm prefilled]
  PV -->|Who's coming chips| PL
```

Truth table: book-by Due rows, highlight, pay prompt, single Travel expense, spent vs budget, after-trip log, Cook-at-home prefill, people chips, pre-trip people row, People tab upcoming plans — built, headless-verified (30 checks), not hand-tested. No messages are drafted; RPGACE still never books or pays.

## 15g. My Day Round 2 (Oct 14 2026) — built, untested by Alex

```mermaid
flowchart LR
  R[(routines: minimum, after_routine_id)] --> T[Today rows: zone dot, never-miss-twice, stacked waits]
  T -->|Did the minimum: half XP| QL[(quest_log)]
  QL --> RV[Sunday 18:00 review card + Due row] -->|Save| J[(journal weekly_review)] --> XP[xp_on_change journal_entry]
  SRC[(gym_sessions, planned_cooks, quest_log, content_productions, journal)] --> DS[Days since card]
  PE[(people via read)] --> DS -->|Talked today| PE
  CI[(cutback_items)] --> CUT[Cutting back + / − / None today] -->|upsert| CL[(cutback_log)]
  CL -->|pg_cron 00:10 xp_cutback_close| XPM[cutback_day → Mind XP]
  DS --> DT[doToday picks with reasons] --> MB[Morning Brief prompt]
  CRON[pg_cron hourly myday-push] --> EF[edge fn myday-push] -->|push_digest: 08:00 morning, Sun 18:00 review| PS[(push_subscriptions)] --> PH[phone] -->|tap| OPEN[/?open=myday]
  SH[Screenshot kind rota] -->|Import shifts: fromRotaJson| SS[shiftSync.replaceDates] --> RS[(rpgace_shifts)]
```

`cutback_*`, `push_subscriptions`, `push_log` are locked (authenticated only); `app_secrets` has no policies (service role only). Truth table: habit design, weekly review, days since, cut-back counters, ideas round 2, Morning Brief picks, push alerts and rota screenshot import are BUILT (headless-verified; push send verified live to a throwaway endpoint), not hand-tested.

`routines` is `anon_read_only`/`authenticated_all` and in `api/data-write.js`'s allowlist. Timers and sub-step ticks are per-device (localStorage). The old `QUESTS` template is empty; `questEngine`'s generated quests are unchanged.

## 15h. Doing Now (Oct 16 2026, DN-0/DN-1) — built, untested by Alex

```mermaid
flowchart LR
  BTN[My Day ▶ Doing now] --> RP[realmPicker activity] --> STC[scheduleToCalendar started_at, realms] --> AG[(rpgace_agendas source_type doing_now)]
  JD[✓ I just did… name + minutes] --> RP2[realmPicker] --> STC2[scheduleToCalendar completed, back-dated] --> AG
  AG --> CARD[My Day card + dashboard Today 'Doing:' row]
  CARD -->|+ note| AG
  CARD -->|■ Stop: how + mood, + more details| FIN[doingNow.logic.finish] --> AG
  FIN -->|who with| PE[(people.last_spoke)]
  FIN -->|money| CF[(chronicles_finance expense)]
  FIN -->|photo| SI[screenshotInbox upload proof]
  OTHER[other device] -->|logic.sync on boot / My Day| AG
  MK[logic.matchKind name] -->|cook| CRN[cookingOracle.ui.cookRecipeNow agendaId] --> ACT[Actual cook: planned_cooks.agenda_id = this entry] --> LF[logic.linkFinish] --> AG
  MK -->|gym| GL[gymTracker.ui.openLog today's workout, minutes] --> LF
  CHK[boot / My Day / back to app: ui.check] --> OV[logic.overdue] -->|3h+| ASK[Still doing it? Yes / I stopped at… / Discard] --> AG
  OV -->|4h past last answer| AS[auto-stop at the 4h mark] --> AG --> FIX[My Day: Fix time] --> FIN
  XE[(xp_events via xpSeason.load)] --> ID[logic.ideas: quietest realms] --> RA[myDay.REALM_ACTIVITIES] --> IB[✨ Try something new buttons] -->|one tap, realm preset| STC
```

Truth table: start, note, stop (short + more details), just-did, cross-device running card, quiet-realm ideas (DN-1b), forgot-to-stop catch + 4h cap (DN-2), cook/gym matching (DN-3), repeats → routine offer + template fill (DN-4), XP (DN-5, DB trigger), Chronicles entries by realm + Sunday review block (DN-6) are BUILT (headless/DB-verified), not hand-tested. The Doing Now plan is fully built.

## 15ae. Day Log & Live Now (Oct 28 2026, DL-1..7) — built, untested by Alex

```mermaid
flowchart LR
  LN[▶ Live now\nrealmTasks.ui._drawLive] -->|Start, no block| E[rpgace_agendas doing_now\ndetails.task_id]
  LN -->|Done| Q[quest_log tick\ntask XP once]
  LN -->|Done| E2[entry closed: ended_at, actual_mins]
  JD[✓ I just did\nsolveTimes] --> E
  E --> TL[My Day timeline\nmyDay.logic.didItems]
  CK[Cook Mode / Chef task / typed cook] -->|cook:finished| AD[afterDone]
  Q --> AD
  AD --> NX[next_due_at on chained tasks\n⏭ Next / ⏭ Due]
  NX -->|Skip + reason| SK[quest_log followup skipped]
  SK --> EV[Evening review]
  HB[🧹 Homekeeper block\nchore_blocks realm homekeeper] --> LN
```

| Claim | Truth |
|---|---|
| A task done in Live now with no block shows on the timeline | ✅ `freeStart`/`freeDone` write a timed doing_now entry |
| XP is paid once | ✅ `xp_on_doing_now` skips entries with `details.task_id`; the task tick pays |
| Doing Now has its own screen | ❌ its buttons open ▶ Live now (store kept) |
| "Did this replace your block?" is asked from the new I just did | ❌ only on the typed Doing Now path (`openTypedDid`) |

## 15ad. Generic Missions (Oct 27-28 2026, GM-1..9) — built, untested by Alex

```mermaid
flowchart LR
  V[Video quest\nrealm_tasks_from_report] --> IN[realm_tasks inbox]
  IN -->|open 📥 New tasks\nfileInbox, cheap model| CARD[mission_contexts card]
  IN -->|nothing fits| NM[new mission\nfor review]
  M[Mission\nrealm_tasks + context_kind] --> PB[📋 Plan block\nmyDay.ui.pickContext]
  CARD --> PB
  PB -->|recipe: ✨ Generate| CO[cookingOracle._generate → _save\nplanMissionCook]
  CO --> PC[planned_cooks + grocery list\nchore_blocks.planned_cook_id]
  PB -->|combo / reference / post| SRC[CONTEXT_SOURCES\nexerciseLibrary.pickCombo, sourceItems]
  PB --> BI[chore_blocks.items\ncontext, context_id, recipe_id, xp]
  BI --> LN[▶ Live now\n🎯 context + Open]
  LN -->|✅ Done| QL[quest_log block tick\nmission's own XP]
  LN --> TD[card times_done +1]
```

| Claim | Truth |
|---|---|
| The inbox for Chef/Athlete/Producer/Creator shows only missions | ✅ `realmTasks.logic.fileInbox` files specific video tasks as cards (status `filed`, `dup_of`) |
| Context is chosen when planning a block | ✅ `myDay.ui.pickContext` from Plan block; Decide later allowed |
| A Chef recipe becomes the block's cook without a second Schedule entry | ✅ `planMissionCook` links `planned_cooks.agenda_id` to the block's own agenda |
| A mission pays its own fixed XP | ✅ since GM-8, block items keep `earns`/`xp`; older blocks are corrected on Done |
| The other 9 realms have missions | ❌ plan "Missions Across Realms" (MR-1..6), drafted |

## 15ab. My Day timeline (Oct 21 2026, MDX-0..7) — built

```mermaid
flowchart LR
  S[segments: shifts, travel, Schedule tasks, blocks, bookends] --> V[dayView / weekView / Schedule timeline]
  V -->|hold + drag| D[clampDrag + dragLimits] --> C{block?}
  C -->|yes| CD[commitDrag -> guard push rule -> resizeBlock] --> U[Undo bar]
  C -->|Schedule task| CI[commitItemDrag -> moveItem] --> U
  V -->|tap| SH[blockSheet: Start / Did you do it? / Start now / reorder]
  T[＋ Add from realms picker — replaced the tray, DR-7] -->|tap| P[placeNext → placeFromTray / addToBlock]
  V -->|🌅 / 🌙 pins| MB[openMorning + Brief] & EV[openEvening + night tasks]
```

## 15u. Did blocks — planned vs did (Oct 20 2026, "My Day" MD-8) — built, untested by Alex

```mermaid
flowchart LR
  dn[rpgace_agendas source_type doing_now: started_at/ended_at, realms] --> items[myDay.logic.didItems]
  xp[xp_events earned_at + realm, via tripPlans.logic.read; DID_SKIP drops bonuses/ships/doing_now_done] --> items
  items --> merge[logic.mergeDid: same realm, gap ≤ 30 min]
  cb[chore_blocks planned that day] --> vs[logic.plannedVsDid]
  merge --> vs
  merge --> grid[renderDailyGrid → ui.didSection: ✅ What you did]
  vs --> grid
  vs --> eve[ui.openEvening ⚖ Planned vs did + journal line]
```
Truth table (Daily tab removed in DR-8; the Did rows now show only in My Day's day view): Did rows on the Daily Schedule (today + past), planned block alongside, planned vs did per realm on the Schedule, in the evening review and its Journal line — BUILT (md8 11/11). Stored Did blocks / editing them — NOT built (by design, worked out each time).

## 15t. My Day ↔ Daily Schedule (Oct 20 2026, "My Day" MD-7) — built, untested by Alex

Since DR-8 (Oct 27 2026) the Calendar has no Daily tab, so `renderDailyGrid` and this section's rows are no longer reachable from the menu; My Day is the day view (see §15ac).

```mermaid
flowchart LR
  grid[renderDailyGrid] --> bk[myDay.logic.calendarBookends: 🌅/🌙 rows from dayParts, drawn not stored]
  grid --> ag[agenda rows with source_type realm_block / chore_block / shopping_block]
  bk & ag --> btn[☀️ My Day button] --> ofs[myDay.ui.openFromSchedule]
  ofs -->|today| open[myDay.open + _flash → ui._applyFlash after render]
  ofs -->|other day| plan[ui.openPlan date]
  chores[Chores 🧹 Chore block] --> plan2[ui.openPlan today, add chores] --> pick[ui.pickChores ✎ Chores]
```
Shift clash check (Oct 20): `logic.clashWith` shared by Plan my day, the calendar's ⚠ flag and the + Add task form (warn → Use nearest free / Save anyway) — BUILT (clash test 8/8). Truth table: bookends on the calendar, ☀️ My Day links, chore block folded into Plan my day with a hand-pick, Day settings folded in Manage — BUILT (headless-verified, md7 9/9, dt4 24/24). The old separate Chore block screen (`ui.openChoreBlock`) — REMOVED (code only; no data). Did blocks (MD-8) — NOT built.

## 15s. Evening review (Oct 20 2026, "My Day" MD-6) — built, untested by Alex

```mermaid
flowchart LR
  t[login / back in view / every 5 min] --> me[ui._maybeEvening: logic.eveningDue — 30 min before bed, or home from a late shift if later; before 04:00 = the night before]
  step[My Day 🌙 step] --> oe
  me --> oe[ui.openEvening]
  oe --> mod[logic.eveningModel: done routines + block items · not done]
  mod --> act[logic.eveningAct: Skip → quest_log skipped · one-off Tomorrow/Drop → routines · realm leftovers → saveRealmBlock tomorrow + trim · shopping → moveBlockDay · cooking → Drop or Cooking]
  oe --> night[bookendCard night]
  oe --> save[logic.saveEvening → journal source evening_review, one per review_on]
  save --> xp[trigger xp_on_evening → xp_award evening_review 10 Mind, once per day]
  save --> wk[weekly review: logic.weekEvenings → 🌙 Your evenings]
```
Truth table: auto-open, done/not-done lists, Tomorrow/Drop/Skip/Move all, Night tasks, one Journal line, +10 Mind once a day, evenings in the weekly review — BUILT (headless-verified, md6 test 22/22).

## 15q. Good-morning screen (Oct 20 2026, "My Day" MD-5) — built, untested by Alex

```mermaid
flowchart LR
  login[rpgace:login / app back in view] --> mm[ui._maybeMorning: logic.morningDue after wake, before 13:00, not seen today]
  card[dashboard 🌅 Morning Brief card] --> om
  step[My Day 🌅 step] --> om
  mm --> om[ui.openMorning]
  om --> day[shift · alarm · bookendCard morning · frogOf · dayBlocks]
  om --> fb[dashDeck.ui._fillBrief: mb-wrap + recall + Library + XP + realm pick]
```
Truth table: one screen, auto-open once a day, both entry points — BUILT. Evening review — BUILT, see §15s.

## 15p. Focus timer (Oct 20 2026, "My Day" MD-4) — built, untested by Alex

```mermaid
flowchart LR
  st[▶ Start on Do realm block] --> sf[logic.startFocus] --> ph[focusPhases by method]
  sf --> dn[doingNow.logic.start → rpgace_agendas doing_now]
  sf --> run[(localStorage myday_focus)] --> tick[ui._focusTick every 1s: bar, beep/toast at round change]
  sf --> q[_queueFocusAlarms → myday_alarms focus:id:n] --> pa[push_alarm → myday-push every minute → phone]
  tick -->|end| stop[logic.stopFocus true → doingNow finish + quest_log block_done +15]
  tick -->|pause/resume| q
```
Truth table: phases, real-clock run, bar, pause/resume/stop, in-app + phone alerts, Doing Now log, +15 bonus — BUILT. Morning screen (MD-5) — NOT built.

## 15o. Plan my day fills planned blocks (Oct 20 2026, "My Day" MD-3) — built, untested by Alex

```mermaid
flowchart LR
  cb[(chore_blocks for the day)] --> pbk[ui.plannedBlocks in openPlan]
  pbk -->|📋| pb[ui.planBlock] --> ro[logic.blockOptions → realmOptions → rankOptions: due routines, real-earning, rest] --> sbi[logic.saveBlockItems → chore_blocks.items + rpgace_agendas.description]
  pbk -->|switch| ps[(myday_settings.plan_style)]
  ps -->|frog| sf[logic.setFrog → items.frog] --> doV[Do: 🐸 do this first]
  ps -->|1-3-5| c[logic.count135 / sizeOf]
```
Truth table: planned blocks in Plan my day, 📋 Plan block (top 3 + more + own), frog, 1-3-5 — BUILT. Timers (MD-4) — NOT built.

## 15n. Plan week day timeline (Oct 20 2026, "My Day" MD-2) — built, untested by Alex

```mermaid
flowchart LR
  dp[logic.dayParts] --> seg[logic.segments] --> tl[ui.weekTimeline]
  tl -->|drag| lim[logic.dragLimits + clampDrag] --> cd[logic.commitDrag] --> g[logic.guard] --> rs[resizeBlock: chore_blocks + rpgace_agendas] --> un[ui.dragUndo → undoMoves]
  tl -->|tap| ed[ui.editWeekBlock] --> cd
  ed --> sm[setBlockMethod: chore_blocks.method]
  tl -->|+ Realm block| pr[pickRealmBlock] --> srb[saveRealmBlock + method]
  tl -->|⚙️| rm[setRealmMethod: myday_settings.realm_methods]
  tl -->|💾| swt[saveWeekTemplate → week_templates]
  tl -->|📌| awt[applyWeekTemplate → saveRealmBlock / saveChoreBlock via guard]
```
Truth table: timeline, drag/resize with neighbour limits, tap edit, remove, + realm block, guard + Undo — BUILT. Method per block/realm and week templates — BUILT (schema applied Oct 20). Timers (MD-4), Plan block (MD-3) — NOT built.

## 15m. My Day timeline, Morning/Night blocks, wake alarm (Oct 20 2026, "My Day" MD-1) — built, untested by Alex

```mermaid
flowchart LR
  sh[(shifts)] --> seg[myDay.logic.segments]
  ag[(rpgace_agendas)] --> seg
  cb[(chore_blocks)] --> seg
  st[(myday_settings wake/bed/tasks)] --> be[logic.bookends] --> seg
  seg --> tl[timeline / suggestSlots / clashes]
  save[chore/cook/shop/realm block save] --> g[logic.guard]
  seg --> g
  g -->|on fixed| no[refuse + nearest free]
  g -->|push > 30 min| ask[ui.askShorten → resizeBlock] --> g
  g -->|ok| mv[applyMoves + Undo toast]
  st --> al[logic.syncAlarms] --> ma[(myday_alarms)]
  ma --> pa[push_alarm in push_digest] --> fn[myday-push every minute] --> sw[sw.js requireInteraction]
  ql[(quest_log first Morning task)] --> pa
```
Truth table: one segments() engine, bookends, guard + push + shorten + Undo, Morning/Night editors, wake alarm (push + in-app) — BUILT. Bookends on the Schedule calendar (MD-7), drag-to-place week (MD-2) — NOT built.

## 15l. My Day home (Oct 18 2026, "My Day" MD-0) — built, untested by Alex

```mermaid
flowchart LR
  rt[(routines + quest_log ticks)] --> hm[myDay.logic.homeModel]
  cb[(chore_blocks planned)] --> hm
  sh[(shifts)] --> hdr[header: date · done · XP · shift]
  hm --> strip[5 steps: Morning · Plan week · Plan day · Do · Review]
  hm --> nx[What's next]
  strip -->|Morning| mb[Morning Brief card]
  strip -->|Plan week| wp[ui.openWeekPlanner]
  strip -->|Plan day| pl[ui.openPlan today / tomorrow after 3pm]
  strip -->|Do| do[Do — today section]
  strip -->|Review| rv[weekly review / toast: MD-5]
```
Truth table: step strip + counts + What's next + ← Back / 🏠 (`RPGACE.AREAS.myday`, hub = `myDay.open`) — BUILT; the Sunday review card became a What's next row (same ids); Plan my day / Plan weeks buttons moved into the strip (same ids). Timeline engine, drag blocks, Plan block, focus timers, Morning screen, evening review — MD-1..6, NOT built.
