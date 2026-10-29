# Schedule domain — My Day, Live now (was Doing Now), Realms, Plans, briefs, shifts

Read before touching any `domain: 'schedule'` module. Present tense; stories in the linked cards; older items in `CLAUDE_archive.md` ("My Day older items"). XP lives in `chronicles.md`.

Modules (`domain: 'schedule'`): generated list in `docs/domains/schedule/README.md`.

## My Day + Live now store → [`my_day.md`](my_day.md)
- Day view and timeline, bookends, Plan my day / Plan week, blocks, focus timer, evening/weekly review (`myDay`); timed entries under ▶ Live now (`doingNow`). All facts live in the sub-file; Live now behaviour in [`realm_tasks.md`](realm_tasks.md).

## Realms
- Every input/quest/plan carries chosen realms (`RPGACE.realmPicker`; "Not now" holds); else `RPGACE.realmOf`. Lenses + realm↔phylum map in `realm_lenses.json`; `realmBrief` = Brief realm pick + per-realm report periods. [Realm Inputs](../../patch_notes.html#card-2026-10-15-realm-reports) [RC-0](../../patch_notes.html#card-2026-10-15-realm-phyla) [RC-1](../../patch_notes.html#card-2026-10-15-phylum-path-realms) [RC-2](../../patch_notes.html#card-2026-10-15-knowledge-feeds-realms) [RC-3](../../patch_notes.html#card-2026-10-15-quests-by-realm) [RC-4](../../patch_notes.html#card-2026-10-15-realm-milestones) [RC-5](../../patch_notes.html#card-2026-10-15-realm-connectors-done)

## Plans (`tripPlans`, TP-1..7)
- Private `travel_profile`/`people`/`plans`/`plan_tasks`, read via `/api/data-write` action `read`. Starred ideas = `plans` status `idea`. Web search `/api/search` type `web` (Gemini only, key pending; Tavily built but off). [story](../../patch_notes.html#card-2026-10-12-trip-plans)
- Book-by Due rows 7 days out (`tripPlans.logic.tripDue`, `.dd-ld-hot`); ticking a money task → `plan_tasks.cost_paid` + one `chronicles_finance` Travel expense; after-trip log = `journal` source `trip_log` + `plans.details.trip_log`; who's-coming chips. [story](../../patch_notes.html#card-2026-10-14-plans-money-people)

## Briefs, journal, decisions
- `morningBrief` builds the Morning Brief from Supabase (`_autoRun()` waits for the login hook); `realmBrief` adds the realm pick and per-realm report periods; the daily Morning Brief Routine writes `journal` with the plain anon key. Brief time 07:00 UK (`trig_015uRjGVrdmiwc5zxq47mMA6` + API backup); pressing ☀️ Morning Brief with none yet writes it now (`logic.writeNow` → `gatherNow` + `prompts/morning_brief.md` → journal once); just opening never writes. The brief reads `chore_blocks` (Top 3 starts from your planned blocks); do-after follow-ups stay out (the evening review handles them, Oct 29).
- `oracleEntry` = Oracle "Save as entry" into the journal. [story](../../patch_notes.html#card-2026-10-16-oracle-save-entry)
- Realm Tasks, Live now and Generic Missions: see `docs/claude/realm_tasks.md`.

## Side list declutter (SL-4, Oct 27)
- Calendar: ⬆ Import shifts and 🏪 Update rota in the › side list (`scheduleFixes.ui.sideExtras`); rota-sync.yml imports Fourth on Mondays. [story](../../patch_notes.html#card-2026-10-27-side-list-domains)
- Journal: Clear All deleted; Refresh in the › side list; plain-name chips in one "Show ▾" row (`journalQoL.LABELS`, `sideList.filterRow`).

## Day & Habits Rewire (DR-1..12, record `records/2026-10/schedule_habits_rewire_paranoia_2026-10-27.txt`)
- No open quests; `quest_log` is the done-ledger only. `questEngine.refresh` → `logic.toTasks`/`liveTask`: one stable-titled Builder task per alert source, re-opened by title (never re-inserted), `done` at 0; gap/taxonomy scans → Scholar inbox only while the taxonomy has rows. No `#qe-panel`. [DR-1..3](../../patch_notes.html#card-2026-10-27-quests-to-tasks)
- A task ticked outside a block: `realmTasks.logic.ledgerRow` (quest_kind `task`, or the routine shape when it has a cadence) → `xp_on_change` pays its realm.
- Actions = realm tasks with a cadence (Action columns copied onto `realm_tasks` + `legacy_routine_id`); `routines` keeps the bookends. `myDay.logic.loadTaskActions`/`fromTask` feed My Day; old `routine:<legacy>` tick keys remapped in memory; writes via `actionUpdate`/`actionInsert`/`save`/`remove`. `realm_tasks_dedup` rejects a title matching an active routine or any task (deactivate first). [DR-4/5](../../patch_notes.html#card-2026-10-27-actions-to-tasks)
- DR-7: `myDay.ui.tray` is one "＋ Add from realms" button → `openRealmPicker` (`logic.pickerModel`) → `logic.placeNext` (`nextFreeAfter` + `placeFromTray`) or `addToBlock` (running block). DR-6: `eventMemories` + private `memories` (status upcoming/kept/dropped, `at_time`, `agenda_id`; data-write allowlist + PRIVATE_READ); `addEvent` also writes an `rpgace_agendas` row (source_type `event`, xp 0); "How was it?" re-added on `myday:rendered`; `remember` → kept + quest_log ledger (`memory`, +25 realm). Photos use the private `proof` upload. [story](../../patch_notes.html#card-2026-10-27-picker-memories)
- DR-8: Schedule = 📅 Calendar (Week/Month/Shifts; no Daily tab). Cells show `eventMemories` rows; tapping a day → `scheduleFixes.ui.openDay(ds)` (My Day on that date). Week/Month boxes are `display:block` (phone fix). [story](../../patch_notes.html#card-2026-10-27-calendar-gym) [phone](../../patch_notes.html#card-2026-10-27-calendar-phone)
- DR-10: one 💡 Ideas door (`ideasDoor`, card `ideas`): `conid_pot` (beat → Producer, post → Creator), `plans` status idea (→ Explorer), `realm_tasks` inbox (→ its realm); tap opens the idea's home. Stores unchanged. [story](../../patch_notes.html#card-2026-10-27-ideas-door)
