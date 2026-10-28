# system_flow_map — Habits (domain `habits`)
Moved here from `system_flow_map.md` on Oct 28 2026 (CK-3/4, plan "Caps and Central Kit"); text unchanged. The root file keeps cross-domain sections and links here.

## 15k. Cooking reorganisation (CR-1..6, Oct 14 2026) — built, untested by Alex

```mermaid
flowchart LR
  HUB[Cooking home: Recipes → Plan → Shop → Cook → Stock + what's next] --> MR[My Recipes]
  MR -->|Cook now / + Planned cook / missing → top-up| PLAN[Planned cook] --> SHOP[Grocery list]
  SHOP -->|bought + price + pantry/fridge/freezer| ADD[_addStock → pantry_stock]
  PLAN --> COOK[Cook Mode / Live Cook] --> FIN[_finishCook]
  MD[My Day cooking block] --> FIN
  DS[Daily Schedule Done] --> OFF
  FIN --> OFF[_offerStockUpdate preview] -->|confirm| DED[_applyDeduction → pantry_stock + planned_cooks.stock_deducted]
  DED -->|undo| ADD
  DED -->|ran out| TOP[(shopping_lists kind=topup)]
```

Truth table: bought → stock with location, finish → preview → deduct/undo, top-up list, journey hub, My Recipes, ← back to the previous Cooking screen, cross-links — built, headless-verified (38 checks). Cooking in servings other than the recipe's base on a planned cook — deducts base amounts (editable in the preview).

## 15i. Health & body (HB-1..3, Oct 14 2026) — built, untested by Alex

```mermaid
flowchart LR
  PH[📷 Meal photo] -->|oracleVision| IT[Items + grams]
  LB[🏷 Label photo] -->|oracleVision| LBL[per 100g + portion] --> IT
  TY[✍️ Typed] -->|_callGroundWorkerJSON| IT
  IT -->|cookingOracle._lookupCofid| CF{CoFID match?}
  CF -- yes --> RV[Editable review]
  CF -- no, Oracle estimate --> RV
  PC[(planned_cooks cooked ≤3 days + recipe_ingredients)] -->|per serving| RV
  RV -->|secureWrite| FL[(food_log)]
  FL --> TOT[kcal + protein vs health_settings targets]
  BD[Water / weight / sleep] -->|secureWrite| BL[(body_log)] --> TR[7-day weight avg + 14-day trends]
  HS[(health_settings.programme)] --> WO[Today's workout]
  GS[(gym_sets via gymTracker.load)] --> SG[suggest: +2.5kg at top of range] --> WO
  WO -->|Start| GL[gymTracker.ui.openLog prefilled]
  TOT --> MD[My Day Health today card]
  WO --> MD
  STEPS[Google Health API steps] -.->|HB-4 not built, waits on Alex's check| BL
```

Truth table: photo/label/typed food logging with CoFID re-check, cooks per serving, targets, water/weight/sleep, trends, programme + overload + prefilled gym log, My Day card — built, headless-verified (42 checks), not hand-tested. Steps — not built (HB-4). `food_log`/`body_log`/`health_settings` are authenticated-only.

## 15ac. Day & Habits Rewire (Oct 27 2026, DR-1..12) — built, untested by Alex

```mermaid
flowchart LR
  qe[questEngine.refresh] -->|logic.toTasks / liveTask| rt[(realm_tasks — private)]
  rt -->|cadence = Action| md[myDay.logic.loadTaskActions → My Day]
  md -->|＋ Add from realms| pick[openRealmPicker → placeNext / addToBlock]
  rt -->|tick outside a block| ql[(quest_log ledger)] -->|xp_on_change| xp[(xp_events: task's realm)]
  ev[eventMemories.addEvent] --> mem[(memories — private)] -->|How was it? remember| ql
  cal[📅 Calendar: Week / Month / Shifts] -->|tap a day| od[scheduleFixes.ui.openDay → My Day on that date]
  gym[🏋️ Gym card] --> gp[#gym-plan: healthBody.ui.renderGym] & exl[exerciseLibrary: library, combos, video review]
  exl -->|extract: cheap model, Alex keeps| ex[(exercises)]
  exl -->|Add combo| rt
  ideas[💡 Ideas: ideasDoor] -->|reads| cp[(conid_pot)] & pl[(plans status idea)] & rt
```
Truth table: no open quests (quest_log = done-ledger), Actions = realm tasks with a cadence, Add from realms picker, one-off events → memories, Calendar without a Daily tab, one Gym page, one Ideas door, exercise library with review and combo coverage — BUILT, headless-tested (dr1 12/12, dr5 13/13, dr67 12/12, dr89 7/7, dr10 8/8, dr12 14/14). Real cheap-model read of Alex's 2 Athlete videos — NOT yet run. Gym log exercise picker suggesting from the library — NOT built. Hand-tested by Alex — none yet.

## 15d. Cook Mode (Oct 11 2026) — built, untested by Alex

```mermaid
flowchart LR
  G[Oracle reply RECIPE_JSON with STEP_RULES_TEXT] --> SAN[_sanitizeStepIngredientsUsed clamps done_cue/equipment] --> CARD[Recipe card spec line + coverage check]
  DB[(recipes.steps)] --> CARD
  PROP[(recipes.steps_proposed)] --> RV{Review: Use these steps?}
  RV -- yes --> W[secureWrite: steps=proposed, steps_previous=old, steps_proposed=null] --> DB
  RV -- no --> X[secureWrite: steps_proposed=null]
  CARD --> CMS[_cookModeSteps scale] --> CM[_openCookMode one step per screen]
  PC[(planned_cooks.schedule.blocks)] --> LIVE[Live Cook panel ▶ Cook Mode] --> CMS
  CM --> LS[(localStorage resume position)]
  CM --> Q{Last Done: real cook?}
  Q -- Actual, unplanned --> RU[_recordUnplannedCook: planned_cooks cooked + finished agenda + journal + out of drafts] --> INS[_applyStockInstant + Undo]
  Q -- Actual, planned --> FC[_finishCook instant] --> INS
  Q -- Preview --> NOP[nothing; clear resume]
  Q -- Not finished --> LS
  CM --> PS{Waiting step?}
  PS -- yes: Start timer & move on --> BAR[Timer bar: countdown → timer_end / Next step → ✓ Done] --> LS
  PS -- hands-on --> NT[no timer]
```

The 8 recipes saved before Oct 11 have `steps_proposed` rows written directly by a Claude Code session (source data: their own steps + `recipe_ingredients`; full set in `records/2026-10/cook_mode_step_splits_2026-10-11.json`). Nothing changes for a recipe until Alex accepts its proposal.
