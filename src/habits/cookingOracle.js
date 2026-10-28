
/* ===MODULE:cookingOracle=== */
RPGACE.register('cookingOracle', {
  domain: 'habits',

  // 2026-09-10 - HABITS domain, first real module (Cooking: H2/H3/H4 of
  // the ratified /CEO Loop 1 spec). Full record, every real fork resolved
  // via AskUserQuestion: records/2026-09/habits_cooking_domain_interrogation_spec_2026-09-10.txt.
  // Built ui/logic split from the start, matching the G53 convention
  // every other module in this file now follows (rule 8 - no reason for a
  // brand-new module to start life in the pre-split shape).
  //
  // Real data flow: dashDeck's 'cooking' card -> ui.openMain() ->
  // ui._showGenerateForm() (Alex types what he wants + servings) ->
  // logic._generate() sends it to Oracle via the EXISTING sendChat/
  // callOracle pipeline (RPGACE.utils.sendToOracle), captures the reply
  // via visualOracle._captureNextResponse (rule 8 - reused, not
  // reinvented; the same dangling-capture-hardened one-shot mechanism
  // every other structured-generation flow in this app already uses) ->
  // logic._parseRecipeJSON extracts a RECIPE_JSON: trailer (same trailer-
  // marker convention as DIRECTOR_CHOSEN:/EDL_JSON:, see visualOracle) ->
  // ui._showRecipeCard renders it (ingredient list + real serving scaler +
  // a step timeline tagged prep-before-cooking/actual-cooking/prep-while-
  // cooking/baking, each with a real per-step countdown timer - this IS
  // H4's "render one recipe's own timeline from tagged steps," folded
  // into the same card rather than a separate view, since the tagged
  // step data has nowhere else to live yet) with a real Save button ->
  // logic._save resolves/creates each ingredient (case-insensitive lookup
  // by name, matching intelDedup's own normalized-key-exact-match
  // precedent - not fuzzy), inserts recipes + recipe_ingredients, and
  // writes ONE journal row (entry_type='recipe', status='saved',
  // recipe_id) - never regenerated per view, matching Alex's own confirmed
  // workflow. Later, from the Journal page itself (refreshJournalDisplay's
  // own real, small conditional addition - see markRecipeCooked, main.js
  // legacy block above), a saved recipe entry gets a real Mark Cooked
  // button that flips journal.status/cooked_at via logic._markCooked.
  //
  // _generatedRecipe holds the most recent NOT-YET-SAVED generation only
  // (module scope, a real runtime-written field, not nested in ui/logic -
  // read by both ui._showRecipeCard's Save handler and logic._save).
  _generatedRecipe: null,

  // _session — H6 (kitchen-session scheduler), added 2026-09-12. Real
  // interrogation record: records/2026-09/habits_cooking_domain_
  // interrogation_spec_2026-09-10.txt section 10. Holds the recipes being
  // batched into one cook session (module scope, mirrors _generatedRecipe's
  // own runtime-field convention) - {recipeIds:[...], recipes:[{id,title}],
  // plannedCookId:...} or null when no session is in progress. Reset only
  // after a schedule is actually accepted (the session's terminal action)
  // or the app reloads.
  //
  // H12 (Sep 16 2026, real Alex bug report): this used to be PURE in-memory
  // state until a schedule was accepted - a reload, a closed tab, or even
  // just navigating away mid-session silently lost real planning work with
  // zero trace (confirmed live: 2 real generated recipes safely saved, but
  // planned_cooks/shopping_lists both genuinely empty). Fixed: the moment a
  // recipe joins a session, logic._persistSessionDraft writes a real
  // planned_cooks row (status='draft'); logic._loadDraftSession resumes it
  // on the next real Cooking-hub open, this page load or a fresh one, so
  // "reset... or the app reloads" above is no longer the honest scope -
  // only Accept (status flips to 'scheduled') genuinely ends a session now.
  _session: null,

  // True once this page load has checked Supabase for a real resumable
  // draft planned_cooks row (logic._loadDraftSession) - regardless of
  // whether one was found. Avoids re-querying every time the Cooking hub
  // reopens when there's genuinely nothing to resume.
  _sessionChecked: false,

  // H20 (Sep 17 2026, real Alex bug report: "no way to revert planned
  // cook back from scheduled to planned cook in cooking module") - once
  // Accept flips a real planned_cooks row to status='scheduled', it
  // became completely invisible to this module (_loadDraftSession only
  // ever checks status='draft') - the ONLY real trace was the Agenda
  // calendar entry, with zero way back into Cooking's own UI. Holds the
  // most recent real scheduled row (logic._loadScheduledSession), same
  // module-scope convention as _session above, so ui._renderModuleHub
  // can offer a real "view / revert to draft" path instead of silently
  // hiding it.
  _scheduledSession: null,

  // Sep 14 2026 (real Alex ask, "close the loop" follow-up: "So if I
  // generate a recipe, and I don't like the method, I right in float
  // oracle button chat to change steps, and it will update the method
  // presented in the pop up, or the ingredients list etc?") - the real
  // "apply this update to the currently-open card" closure, set by
  // ui._showRecipeCard while it's open, cleared to null on close (same
  // module-scope convention as _generatedRecipe/_session above). A
  // module-level hook listener (logic._listenForRecipeUpdates) can't
  // reach _showRecipeCard's own local render closures (renderIngredients/
  // renderSteps/resetNutritionState) directly - this is the one bridge
  // between "an update arrived" (module scope, persistent) and "make the
  // currently-open card actually show it" (function-local, per-open).
  _applyRecipeUpdate: null,

  // H15 (Sep 16 2026, real Alex ask: "yes, general chat too — build it" —
  // following the H14 finding that recipe generation + narrow-down were
  // scoped to ONE button and never ran from free-form Oracle chat) —
  // module-scope guard so the NEW persistent chat-generation listener
  // (logic._listenForChatGeneratedRecipes) can tell "this RECIPE_JSON:
  // reply is the dedicated Generate-button flow's own, already being
  // handled by its one-shot capture" from "this one genuinely arrived
  // from free chat, nothing else is going to show a card for it." A
  // future timestamp, not a bare boolean, so a real, generous 60s window
  // covers however long Oracle actually takes — cleared via a deferred
  // (setTimeout 0) call from inside the one-shot capture's own callback
  // so it stays true for the WHOLE synchronous oracle:response-scanned
  // broadcast regardless of which listener happens to run first (rule 4
  // — don't rely on hook registration order for correctness).
  _generateFlowArmedUntil: 0,

  // H15 (Sep 16 2026) — the real RECIPE_JSON shape, now emitted from
  // THREE real places (generation, the RECIPE_UPDATE_JSON critique-
  // revision trailer, and the new general-chat generation trailer below)
  // — one real canonical copy (rule 8), referenced everywhere rather than
  // hand-copied a 3rd time, which would be exactly the kind of drift
  // rule 8's own composio.js/CORS precedent warns about.
  // Oct 11 2026 — Cook Mode (Ube Express-style one step per screen). Alex:
  // "One action per step" (records/2026-10/cook_mode_ube_style_2026-10-11.txt).
  // Saved recipes had paragraph steps bundling 3-4 actions and step
  // ingredient lists that missed ingredients, so a one-screen-per-step view
  // needs these rules at generation time, not just a new screen. Shared by
  // every prompt that asks for RECIPE_JSON (rule 8).
  STEP_RULES_TEXT: 'COOK MODE STEPS: every step is ONE action a cook does with their hands, at most 25 words - never chain "then ... then" actions into one step (chopping several items in a row with one knife counts as one action). '
    + 'For every step give done_cue: how the cook knows it is finished (e.g. "until golden, about 5 min", "stiff peaks - whites stand straight up"; "" if obvious), and equipment: what to have in hand plus heat level where it matters (e.g. "large frying pan, medium heat"; "" if none). '
    + 'A step that runs on its own (simmer, bake, rest, boil, marinate) puts that waiting time in passive_duration_min and gives timer_end: the one thing to do when its timer goes off, at most 10 words (e.g. "Drain the pasta", "Add the spinach to the pot"); "" for hands-on steps. '
    + 'Every ingredient in the ingredients list must appear in the ingredients_used of at least one step, including salt, oil and garnishes. Keep wording short so the reply stays under its length limit. ',

  RECIPE_JSON_SHAPE: function(servingsBase) {
    // H21 (Sep 17 2026) — real, superseding shape change: each ingredient
    // now also carries "is_separable" (see SEPARABLE_TAG_TEXT below for
    // the real instruction driving it, and logic._sanitizeRecipeIngredients
    // for the defensive boolean coercion on the way back — rule 5, never
    // trust model JSON blindly).
    // XP-3: "cuisine" feeds the Head Chef gate (3 cuisines).
    return '{"title":"...","cuisine":"<one word or two, e.g. Chinese, Korean, British>","servings_base":' + servingsBase + ',"ingredients":[{"name":"...","amount":<number>,"unit":"...","grams_estimate":<number>,"is_separable":<boolean>}],'
      + '"steps":[{"order":1,"type":"prep_before_cooking","description":"...","active_duration_min":<number>,"passive_duration_min":<number>,"done_cue":"...","equipment":"...","timer_end":"...","ingredients_used":[{"name":"...","amount":<number>,"unit":"..."}]}]}';
  },

  // H18 (Sep 16 2026) — real, shared rendering metadata for the 5-color
  // ingredient-status system (see logic._classifyIngredientStatus for the
  // real classification rules). Module-top-level, same convention as
  // RECIPE_JSON_SHAPE above, since both ui and logic need this one real
  // copy (rule 8) — never a per-render-site hand-rolled color/label pair.
  INGREDIENT_STATUS_META: {
    green:  { color: 'var(--green)', bg: 'rgba(76,175,130,0.07)',  icon: '🟢', label: 'Have plenty' },
    yellow: { color: 'var(--gold)',  bg: 'rgba(226,168,61,0.07)',  icon: '🟡', label: 'Not enough — need more' },
    red:    { color: '#CC4A4A',      bg: 'rgba(204,74,74,0.07)',   icon: '🔴', label: "Don't have" },
    blue:   { color: '#4A9FCC',      bg: 'rgba(74,159,204,0.07)',  icon: '🔵', label: 'Have an alternative — buy the real one' },
    purple: { color: '#9B59B6',      bg: 'rgba(155,89,182,0.07)',  icon: '🟣', label: 'Running low — replenish after this cook' },
    // H21 (Sep 17 2026, real Alex ask via a pasted Oracle-chat transcript
    // + AskUserQuestion-confirmed answers — see records/2026-09/
    // h21_orange_brown_shopnoshop_spec_2026-09-17.txt). Orange is a
    // NARROWER, more confident claim than blue: a genuine substitute is
    // actually in stock right now, real enough to skip buying the real
    // ingredient for this cook entirely — "think of blue with extra
    // steps," Alex's own words — never just "something else lives in
    // this aisle."
    orange: { color: '#D9822B',      bg: 'rgba(217,130,43,0.08)',  icon: '🟠', label: 'Have a real substitute — can skip buying this' },
    // Brown only ever appears when a real per-session "No Shop" mode is
    // active (see logic._classifyIngredientStatus) — a separable/optional
    // component (Oracle-tagged at generation time) that's missing but can
    // simply be left out without changing the dish, Alex's own words:
    // "won't change the recipe, just omit if I'm not going shop." No
    // serving-pairing suggestion is ever computed or shown here — Alex
    // explicitly asked for a bare "can be omitted" note, nothing more.
    brown:  { color: '#8B5E3C',      bg: 'rgba(139,94,60,0.08)',   icon: '🟤', label: 'Separable — can be omitted (skipping shop this time)' },
    // H24 (Sep 17 2026, 5th pass, real Alex ask: "i have whole eggs, so i
    // have both egg whites and egg yolks (make these maroon - an
    // ingredient that derives as by product from something in stock, with
    // instructions on how to get desired result of ingredient)... toasted
    // dessicated coconut would also be maroon since i need to toast to
    // get ingredient") — a genuinely different real claim from orange:
    // orange means a real, different ingredient stands in adequately;
    // maroon means the exact real ingredient itself can be produced,
    // right now, from something already in stock (a real curated
    // derivation, never invented — see logic._DERIVATION_GROUPS). No
    // standard maroon-square emoji exists in Unicode, so a real ⚗️ (a
    // genuine transformation/derivation symbol) carries the visual
    // identity instead, paired with a real maroon hex distinct from
    // brown's.
    maroon: { color: '#A6314B',      bg: 'rgba(166,49,75,0.08)',   icon: '⚗️', label: 'Can be made from what you have' },
    // H24 (Sep 17 2026, 6th pass, real Alex ask: "i have 400ml of coconut
    // milk, so it good for one recipe, not for another... this will help
    // identify which subsitution is least impactful in final product in
    // both recipes") — a real, genuinely different claim from every
    // other status: 2+ recipes in this session share the ingredient, and
    // real stock covers one of them but not the combined total. Never
    // auto-resolved (AskUserQuestion-confirmed) — pink is a real, open
    // decision Alex has to make, not a computed answer.
    pink:   { color: '#D46FA3',      bg: 'rgba(212,111,163,0.08)', icon: '🩷', label: 'Shared across recipes — not enough for both, pick which one gets it' },
  },

  // H19 (Sep 17 2026, real Alex ask: "also use cups as much as possible
  // (liquid and spices) and weight when makes sense, everywhere where a
  // recipe is present. in pantry ill be using mostly weight and ml and
  // count rather than cups" — restated a 2nd time, same session, "in
  // pantry and stock as a whole") — the ONE real shared instruction text
  // every real Oracle call that produces a fresh ingredient amount/unit
  // uses (rule 8): full generation, chat-triggered generation, the
  // critique/revision path, and Suggest Additions. Deliberately doesn't
  // hardcode "always cups" — Alex's own words are "as much as possible"
  // and "when makes sense," so this asks for real judgment per
  // ingredient, matching how a real recipe actually measures things,
  // never cups for their own sake.
  UNIT_PREFERENCE_TEXT: 'For each ingredient amount, prefer cup measurements for liquids and spices wherever that is genuinely how a real home cook would measure them, and prefer weight in grams for other ingredients (meat, vegetables, bulk dry goods) when that makes more practical sense — pick whichever real unit a genuine recipe would actually use, never cups just for the sake of it. ',

  // H21 (Sep 17 2026, real Alex ask, via a pasted Oracle-chat transcript:
  // "I don't mean put rice into the soup instead of noodles, just skip
  // the noodles... won't change the recipe, just omit if I'm not going
  // shop" — AskUserQuestion-confirmed answer: "Oracle tags it at
  // generation time (Recommended)") — the ONE real shared instruction
  // text (rule 8) every real full-recipe-generating Oracle call uses,
  // same convention as UNIT_PREFERENCE_TEXT above, spliced alongside it
  // at all 3 real call sites. Honest limitation, same shape as H14's own
  // per-step measurements: only NEW recipes generated from here on carry
  // a real is_separable flag — old recipes default to false (essential)
  // on read, never guessed true.
  SEPARABLE_TAG_TEXT: 'For each ingredient, also mark is_separable:true only if it is a genuinely optional/removable side component that could simply be left out without changing what the dish actually is (e.g. a starch/carb served alongside a soup, stew, or curry, or a garnish/topping) — mark is_separable:false for anything essential to the dish actually being the dish it claims to be (this should be the default for most ingredients). ',

  // H15 (Sep 16 2026) — real, compound-phrase keyword gate (the same
  // hyphen/word-boundary discipline as every other keyword list in this
  // project) for "Alex is asking Oracle, in FREE-FORM chat, to actually
  // finalize/generate a real recipe" — genuinely distinct from just
  // discussing food or recipes in passing. Deliberately broad on the verb
  // side (a missed trigger just means Oracle answers without the trailer
  // instruction, same safe-fallback shape as oracleAppGrounding's own
  // TRIGGER_KEYWORDS) but anchored on a real recipe/dish noun so an
  // unrelated "generate a quest"/"make a caption" elsewhere in the app
  // never fires this.
  RECIPE_GEN_KEYWORDS: [
    'generate that recipe', 'generate this recipe', 'generate the recipe', 'generate a recipe',
    'make that recipe', 'make this recipe', 'make the recipe', 'make a recipe', 'make me a recipe',
    'make me that recipe', 'make me this recipe', 'make me the recipe', 'generate me a recipe',
    'cook that recipe', 'cook this recipe', 'build that recipe', 'create that recipe',
    'generate that dish', 'generate this dish', 'generate the dish',
    'make that dish', 'make this dish', 'make the dish', 'make me a dish',
    'cook that dish', 'cook this dish',
    'turn that into a recipe', 'make it into a recipe', 'save that as a recipe',
  ],

  init: function() {
    RPGACE.modules.cookingOracle.ui._wrapScreens(); // CR-3: ← back to the previous Cooking screen
    setTimeout(function() { RPGACE.modules.cookingOracle.logic._loadKit(); }, 2500); // Oct 21: measures in his own kit
    // No boot-time DOM injection needed - ui.openMain() is reached only
    // via the dashboard card's own click (dashDeck.MODULES 'cooking'
    // entry), same lazy-build-on-demand pattern as fillGaps/oracleControl's
    // overlay popup (never pre-built at boot).

    // Sep 14 2026 (real Alex ask: "I want oracle float button to be able
    // to take criticisms while I'm on cooking module so I can discuss
    // what I want changed") - registers the real currently-open-recipe
    // context (see oracleControl.registerContextProvider's own comment).
    // oracleControl is registered/inited earlier in this file (rule 8 -
    // reuses the shared registry rather than a Cooking-specific overlay
    // hack), still guarded since module init order is a real thing to
    // respect, not assumed.
    var self = RPGACE.modules.cookingOracle;
    if (RPGACE.modules.oracleControl && RPGACE.modules.oracleControl.registerContextProvider) {
      RPGACE.modules.oracleControl.registerContextProvider('cooking', function() {
        if (!self._recipeCardOpen || !self._generatedRecipe) return null;
        var r = self._generatedRecipe;
        var ingList = (r.ingredients || []).map(function(i) {
          return (i.amount != null ? i.amount : '') + ' ' + (i.unit || '') + ' ' + i.name;
        }).join(', ');
        var stepList = (r.steps || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); })
          .map(function(s, idx) { return (idx + 1) + '. [' + (s.type || '') + '] ' + (s.description || ''); }).join(' ');
        // Sep 14 2026 (real, same-day follow-up - Alex: "Yes let me confirm
        // changes first, but make sure only changes are shown, not the
        // whole thing, so I can make a quick informed decision") - closes
        // the loop: Oracle can now propose a real edit to THIS specific
        // open recipe, not just discuss it. Reuses _generate's own exact
        // RECIPE_JSON trailer SHAPE (rule 8) under a distinct marker name
        // so logic._diffRecipe/logic._parseRecipeJSON-style parsing stays
        // one shape across generation and revision. The FULL updated
        // recipe is asked for (never just the changed fields) - a real,
        // deliberate design choice: a client-COMPUTED diff (logic.
        // _diffRecipe, against the real current recipe object) can't be
        // wrong about what actually changed, where trusting Oracle's own
        // self-reported "here's what I changed" risks it mischaracterizing
        // or silently omitting a real change (rule 5 - never trust model
        // JSON blindly).
        return 'I have a recipe card open right now: "' + (r.title || 'Recipe') + '". Ingredients: ' + ingList + '. Method: ' + stepList + '. '
          + 'If I ask you to change this recipe (add/remove/edit an ingredient, or change/add/remove/reorder a step), do not just describe the change in prose - end your reply with a trailer on its own final line: RECIPE_UPDATE_JSON: followed by a compact JSON object with the COMPLETE UPDATED recipe (every ingredient and every step, not just the changed ones) in this exact shape: '
          + self.STEP_RULES_TEXT + 'Shape: ' + self.RECIPE_JSON_SHAPE(r.servings_base || 4) + '. '
          + self.UNIT_PREFERENCE_TEXT
          + self.SEPARABLE_TAG_TEXT
          + 'Only include this trailer when you are actually proposing a concrete change to apply - never when just answering a question or giving an opinion with nothing specific to change.';
      });
    }
    self.logic._listenForRecipeUpdates();
    // H15 (Sep 16 2026, real Alex ask: "yes, general chat too — build it")
    // — a real, PERSISTENT second listener on the same shared hook
    // (rule 8, no new mechanism), catching a genuinely NEW recipe
    // generated mid-conversation rather than through the dedicated
    // Generate button. See the function's own comment for the full
    // real double-fire guard against that dedicated flow's one-shot
    // capture.
    self.logic._listenForChatGeneratedRecipes();
  },

  // ============================================================
  // ui — rendering/DOM
  // ============================================================
  ui: {

    // H23 (Sep 17 2026, real Alex ask — "the cooking DOM and all buttons
    // inside are not uniform and rather poorly structured, I want neat
    // and tidy display with intention" — run through /impeccable +
    // /GODMODE + /CEO + /interrogation + /paranoia's own compile-then-
    // interrogate-then-execute shape; full record: records/2026-09/
    // cooking_ui_uniformity_paranoia_compile_2026-09-17.txt) — the real
    // shared button-style token set every one of this module's 42 real
    // button call sites now draws from (rule 8), replacing 12 scattered
    // padding values, 5 font-sizes (one a stray 11.5px outlier), and 4
    // border-radius values with a small, named set of REAL variants
    // derived directly from the roles already present in the module —
    // never an invented abstract design system. Alex's own confirmed
    // scope: Cooking module only (not app-wide yet); the existing
    // green="commits data/stock"/gold="commits to journal/calendar"
    // split is now a real, formalized rule instead of an undocumented
    // habit — no button's actual color changes, the SPLIT itself is
    // just now a real named contract future buttons must follow.
    BTN_VARIANTS: {
      // Strong, full-width call-to-action — green = commits real DATA
      // or STOCK (Generate/Confirm/Bought/Save Settings/Set stock/Add
      // equipment).
      primary: 'width:100%;padding:11px;min-height:44px;background:rgba(76,175,130,0.12);border:1px solid rgba(76,175,130,0.35);border-radius:8px;color:var(--green);font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Same strength/shape as primary — gold = commits to the real
      // JOURNAL or CALENDAR (Save to Journal/Schedule cook time/Accept
      // schedule/Revert to draft).
      primaryGold: 'width:100%;padding:11px;min-height:44px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:var(--gold);font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Full-width, bordered, real-text-color — a genuine, notable
      // optional action (e.g. "+ Add another saved recipe").
      secondary: 'width:100%;padding:9px;min-height:44px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Same shape as secondary, muted text — a lower-emphasis optional
      // action (e.g. "⚙ Habits Settings", "📦 Pantry").
      ghost: 'width:100%;padding:9px;min-height:44px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // No border/background at all — a plain text-link action (e.g.
      // "Done for now", "← Back to edit", "Close").
      plainLink: 'width:100%;padding:8px;min-height:44px;background:none;border:none;border-radius:8px;color:var(--muted);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Row-context (inline, not full-width) bordered small action —
      // Bought/Add to basket/Redo/Confirm/timer-start/+Add ingredient.
      // opts.color/opts.bg on _mkBtn override the neutral default for a
      // colored inline action.
      inline: 'padding:6px 12px;min-height:36px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Row-context icon-only, muted — a real, deliberately LIGHTER
      // reversible action than delete (e.g. the basket "↩" undo, a
      // cheap non-destructive boolean flip — Alex's own confirmed call:
      // single-click, no arm/confirm, since nothing real is lost).
      iconGhost: 'padding:5px 8px;min-height:36px;min-width:36px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Row-context icon-only, real 2-click arm/confirm delete (see
      // _mkDeleteArmBtn below — this string alone doesn't wire the
      // interaction). font-family was silently missing on 2 of the 3
      // original hand-rolled copies this consolidates — a real bug,
      // now impossible to reintroduce since there's only one real copy.
      deleteArm: 'background:none;border:none;color:rgba(226,84,84,.55);font-size:15px;cursor:pointer;padding:4px 8px;min-width:36px;min-height:36px;flex-shrink:0;font-family:Rajdhani,sans-serif;',
      // Rounded selector chip — dish-type/narrow-down picks only.
      pillChip: 'padding:6px 12px;min-height:36px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:16px;color:var(--text);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Segmented tab-switcher (Current Stock's Pantry/Fridge/Freezer/
      // Equipment tabs) — font-size corrected from a real stray 11.5px
      // one-off to the module's real 11px scale.
      tab: 'flex:1;min-width:88px;padding:8px 6px;min-height:44px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.03);color:var(--muted);font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // The module-hub's own 3-option chooser card (label + sub-line) —
      // a real, deliberately distinct navigational-card role, not a
      // normal action button; kept as its own named variant rather than
      // a local hardcoded string so it's still one real, checkable
      // entry in this same token set (rule 8).
      hubCard: 'width:100%;text-align:left;padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // A real, full-width, left-aligned, selectable LIST item (a
      // Suggest-5-ideas result) — genuinely distinct from a normal
      // action button, kept as its own named role rather than forced
      // into secondary/ghost.
      listItem: 'display:block;width:100%;text-align:left;padding:9px 12px;margin-bottom:6px;background:rgba(76,175,130,0.08);border:1px solid rgba(76,175,130,0.25);border-radius:8px;color:var(--text);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // The stock-match-finder's own recipe-card row (makeable vs. not,
      // border color set dynamically via opts.borderColor). Uses the
      // border-left "side-tab" treatment — Alex's own confirmed answer
      // was to leave that visual pattern out of scope this pass, so
      // this variant only wraps the EXISTING look in the shared token
      // system for real code-structure consistency (rule 8), it does
      // not change how it looks.
      recipeCard: 'display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:0 8px 8px 0;color:var(--text);font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Oct 14 2026 (Polish & speed, Cooking uniformity) — one size scale:
      // 44px full-width actions, 36px row/inline actions, 52px kitchen
      // buttons; corners 8px (chips 16px); text 12/13/14/16px. These
      // replace per-call `extra` shrinks (3px padding, 12px text, ~26px
      // tall - below a thumb target) and Cook Mode's 3 hand-built buttons.
      // Small inline action in a dense row (substitute/pick-from-stock/
      // derive/reuse-label) - same shape as inline, smaller text.
      small: 'padding:6px 10px;min-height:36px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // The one big go button (Start Cooking).
      hero: 'width:100%;padding:12px;min-height:52px;background:rgba(76,175,130,0.12);border:1px solid rgba(76,175,130,0.35);border-radius:8px;color:var(--green);font-size:16px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Cook Mode's Back/Next - big for messy hands.
      cookNav: 'min-height:52px;padding:10px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:16px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      cookNavPrimary: 'min-height:52px;padding:10px;background:var(--green);border:none;border-radius:8px;color:#06140d;font-size:16px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Square close icon (Cook Mode header).
      closeIcon: 'min-width:44px;min-height:44px;padding:0;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:16px;cursor:pointer;font-family:Rajdhani,sans-serif;',
      // Underlined text action (Cook Mode "Start from step 1").
      textLink: 'min-height:44px;padding:8px 4px;background:none;border:none;color:var(--gold);font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;font-family:Rajdhani,sans-serif;',
    },

    // Real, shared button factory (rule 8) — every one of this module's
    // real buttons now goes through this ONE function instead of a
    // hand-rolled `document.createElement('button')` + its own
    // `style.cssText` literal. `opts.color`/`opts.bg`/`opts.borderColor`
    // append AFTER the base variant string, so they correctly override
    // it for a real per-row dynamic color (e.g. the 5-color ingredient-
    // status meta) without needing a whole new variant per color.
    _mkBtn: function(text, variant, opts) {
      var self = RPGACE.modules.cookingOracle;
      opts = opts || {};
      var btn = document.createElement('button');
      btn.textContent = text;
      var css = self.ui.BTN_VARIANTS[variant] || self.ui.BTN_VARIANTS.secondary;
      if (opts.color) css += 'color:' + opts.color + ';';
      if (opts.bg) css += 'background:' + opts.bg + ';';
      if (opts.borderColor) css += 'border-color:' + opts.borderColor + ';';
      if (opts.extra) css += opts.extra;
      btn.style.cssText = css;
      if (opts.title) btn.title = opts.title;
      return btn;
    },

    // Real, shared 2-click arm/confirm delete button (rule 8) —
    // consolidates 3 near-identical hand-rolled copies (session-recipe/
    // pantry-stock/equipment delete) into one real implementation. The
    // shared part is purely the interaction state machine (armed/busy/
    // 3s auto-disarm) and the consistent styling — each caller's own
    // real delete operation and its own real success/failure UI
    // (differing error-message shapes, a toast here, a bare row.remove
    // there) stays exactly as distinct as it always was, passed in as
    // `onConfirm(doneCb)`. The caller does its own real work and its
    // own real UI response, then calls `doneCb(err)` purely so this
    // shared button knows whether to reset itself (a failure) or leave
    // itself alone (a success — the caller's own code already removed
    // the row or closed the popup).
    // H24 (Sep 17 2026, 7th pass) — real, shared 2-click arm/confirm STATE
    // MACHINE (rule 8), one level more general than _mkDeleteArmBtn below
    // — the exact same real mechanical shape (armed/busy/3s auto-disarm),
    // just with a real caller-supplied idle/armed label+color instead of
    // delete's own hardcoded ones, so a 2nd real destructive action
    // (declaring an ingredient alias — a real permanent merge, no
    // Supabase backup) can reuse the identical interaction discipline
    // instead of a 2nd hand-rolled copy of the same state machine.
    // idleColor is captured from the constructed button's own variant CSS
    // (never hand-typed here), so _mkDeleteArmBtn's real byte-identical
    // reset color stays correct without restating it.
    _mkArmConfirmBtn: function(idleText, armedText, variant, armedColor, onConfirm, opts) {
      var self = RPGACE.modules.cookingOracle;
      var btn = self.ui._mkBtn(idleText, variant, opts);
      var idleColor = btn.style.color;
      var armed = false, busy = false;
      btn.onclick = function() {
        if (busy) return;
        if (!armed) {
          armed = true; btn.textContent = armedText; btn.style.color = armedColor;
          setTimeout(function() { if (busy) return; armed = false; btn.textContent = idleText; btn.style.color = idleColor; }, 3000);
          return;
        }
        busy = true; btn.textContent = '…';
        onConfirm(function(err) {
          if (err) {
            busy = false; armed = false; btn.textContent = idleText; btn.style.color = idleColor;
          }
          // A real success needs no reset here — the caller's own
          // onConfirm already removed the row or closed the popup.
        });
      };
      return btn;
    },

    _mkDeleteArmBtn: function(onConfirm) {
      var self = RPGACE.modules.cookingOracle;
      return self.ui._mkArmConfirmBtn('✕', '❌', 'deleteArm', '#CC4A4A', onConfirm);
    },

    openMain: function() {
      var self = RPGACE.modules.cookingOracle;
      // H6 - resume an in-progress cook session instead of dropping straight
      // back into the generate form, so leaving and reopening Cooking never
      // loses recipes already added to a session. H12 (Sep 16 2026): the
      // session is now REAL, persisted state (logic._persistSessionDraft),
      // not just in-memory - if nothing's in memory yet this page load,
      // check Supabase for a real resumable draft before falling through to
      // the generate form.
      if (self._session && self._session.recipeIds && self._session.recipeIds.length) {
        self.ui._showSessionBuilder();
        return;
      }
      self.logic._loadDraftSession(function(err, sess) {
        if (sess && sess.recipeIds && sess.recipeIds.length) {
          self.ui._showSessionBuilder();
          return;
        }
        self.logic._loadConfig(function(cfg) {
          self.ui._showGenerateForm(cfg || {});
        });
      });
    },

    // Sep 13 2026 (real Alex ask, same session: "clicking Dom module should
    // also give way to a pop up for buttons to access either planned cook,
    // grocery list planned or recipe generator") - this is now the real
    // entry point the dashDeck 'cooking' card opens (see MODULES entry
    // below), replacing the old resume-session-or-generate-form jump with
    // an explicit choice matching the module's 3 real distinct jobs.
    // openMain() itself is untouched and still callable directly.
    // H12 (Sep 16 2026) - a real resumable draft session may exist in
    // Supabase even though nothing's in memory yet this page load
    // (logic._loadDraftSession short-circuits via _sessionChecked once
    // already checked, so this stays cheap on every hub reopen after the
    // first). The actual popup-building work is _renderModuleHub below.
    // Oct 21 2026: the hub's Shop step, shared with the ☰ list. This cook's
    // own open list, else the newest open cook list, else the Top-up list.
    _openGrocery: function() {
      var self = RPGACE.modules.cookingOracle;
      var sessCount = (self._session && self._session.recipeIds && self._session.recipeIds.length) || 0;
      var scheduled = !sessCount ? self._scheduledSession : null;
      if (self._session && self._session.shoppingListId) { self.ui._showShoppingList(self._session.shoppingListId); return; }
      // _session is page-memory only; the real list row persists, so
      // find this cook's own list first, then the newest cook list.
      var pcId = (self._session && self._session.plannedCookId) || (scheduled && scheduled.plannedCookId);
      var q = pcId ? RPGACE.sb.select('shopping_lists', 'select=id&planned_cook_id=eq.' + pcId + '&status=neq.done&order=created_at.desc&limit=1') : Promise.resolve([]);
      q.then(function(rows) {
        if (rows && rows[0]) return rows;
        return RPGACE.sb.select('shopping_lists', 'select=id&kind=eq.cook&status=neq.done&order=created_at.desc&limit=1');
      }).then(function(rows) {
        var row = (rows || [])[0];
        if (row && row.id) { self.ui._showShoppingList(row.id); return; }
        // Oct 21 2026: every cook list is done - the Top-up list is what's left to buy.
        RPGACE.utils.toast('No open grocery list — opening your Top-up list', '#E2A83D', 2600);
        self.ui._showTopUpList();
      }).catch(function() { RPGACE.utils.toast('⚠️ Could not check for a grocery list right now', '#CC4A4A', 3000); });
    },

    _showModuleHub: function() {
      var self = RPGACE.modules.cookingOracle;
      self.logic._loadDraftSession(function() {
        if (self._session) { self.ui._renderModuleHub(); return; }
        // H20 (Sep 17 2026) — only checked when there's no active draft
        // (the common, cheap case) so this never adds a real query to the
        // normal in-progress-session path.
        self.logic._loadScheduledSession(function() { self.ui._renderModuleHub(); });
      });
    },

    // CR-5 (Oct 14 2026, Cooking Reorganisation) — the journey hub. Alex's
    // pick: "Recipes → Plan a cook → Shop → Cook → Stock", each step a card,
    // with a live "what's next" line on top. Every card opens the same
    // existing screen it always did (rule 8); the old 5 cards are all still
    // reachable, just in journey order, plus My Recipes and Settings.
    _renderModuleHub: function() {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '420px', eyebrow: '🍳 COOKING', title: 'Your cooking, step by step',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;
      box.classList.add('co-hub');

      var next = document.createElement('div');
      next.className = 'co-next';
      next.style.cssText = 'font-size:14px;color:var(--text);background:rgba(76,175,130,0.08);border:1px solid rgba(76,175,130,0.25);border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.45;';
      next.textContent = 'Checking what\'s next...';
      box.appendChild(next);

      // UI Debloat (Oct 27 2026): the 5 journey cards sit in the shared 2-column tile grid.
      RPGACE.areaNav._css();
      var grid = document.createElement('div'); grid.className = 'an-tiles co-hub-tiles';
      box.appendChild(grid);
      var mkBtn = function(label, sub, onClick, step) {
        var btn = self.ui._mkBtn('', 'hubCard');
        btn.classList.add('an-tile'); btn.style.margin = '0';
        if (step) btn.dataset.step = step;
        var top = document.createElement('div');
        top.textContent = label;
        btn.appendChild(top);
        var subEl = document.createElement('div');
        subEl.style.cssText = 'font-size:13px;color:var(--muted);font-weight:400;margin-top:2px;';
        subEl.textContent = sub || '';
        btn.appendChild(subEl);
        btn.onclick = function() { pop.close(); onClick(); };
        grid.appendChild(btn);
        return subEl;
      };

      var sessCount = (self._session && self._session.recipeIds && self._session.recipeIds.length) || 0;
      // H20 (Sep 17 2026): a scheduled session keeps its own entry point.
      var scheduled = !sessCount ? self._scheduledSession : null;

      var recipesSub = mkBtn('📖 Recipes', 'Your saved recipes — search, cook, plan', function() { self.ui._showMyRecipes(); }, 'recipes');

      var plannedSub = sessCount ? (sessCount + ' recipe' + (sessCount === 1 ? '' : 's') + ' in progress — resume')
        : (scheduled ? 'Scheduled for ' + (scheduled.scheduledAt || '?') + ' — view / revert' : 'Pick recipes to cook together');
      mkBtn('🍳 Plan a cook', plannedSub, function() {
        if (sessCount) { self.ui._showSessionBuilder(); return; }
        if (scheduled) { self.ui._showScheduledCookInfo(scheduled); return; }
        // A session only exists once a recipe joins it, so an empty plan
        // starts from the recipes (+ Planned cook on any of them).
        RPGACE.utils.toast('Tap "+ Planned cook" on the recipes you want to cook together', '#E2A83D', 3200);
        self.ui._showMyRecipes();
      }, 'plan');

      mkBtn('🛒 Shop', 'This cook\'s grocery list', function() { self.ui._openGrocery(); }, 'shop');

      mkBtn('🔥 Cook', scheduled ? 'Start the scheduled cook now' : 'Cook a saved recipe step by step', function() {
        if (scheduled) { self.logic._startCookNow(scheduled.plannedCookId, scheduled.agendaId); return; }
        self.ui._showMyRecipes();
      }, 'cook');

      mkBtn('📦 Stock', 'Pantry, fridge, freezer & equipment — live', function() { self.ui._showCurrentStock(); }, 'stock');
      if (grid.lastChild) grid.lastChild.style.gridColumn = '1 / -1';

      // Oct 21 2026: New recipe / What can I cook / Top-up / Settings moved into ☰ (ui._cookShortcuts).

      // Live "what's next" + counts — read after render so the hub opens
      // instantly; any failed read just leaves that bit out.
      Promise.all([
        RPGACE.sb.select('recipes', 'select=id').catch(function() { return []; }),
        scheduled ? RPGACE.sb.select('shopping_lists', 'select=id&planned_cook_id=eq.' + scheduled.plannedCookId + '&order=created_at.desc&limit=1').catch(function() { return []; }) : Promise.resolve([]),
        RPGACE.sb.select('shopping_lists', 'select=id&kind=eq.topup&status=eq.open&order=created_at.desc&limit=1').catch(function() { return []; }),
      ]).then(function(r) {
        var n = (r[0] || []).length;
        recipesSub.textContent = n + ' saved — search, cook, plan';
        var cookList = (r[1] || [])[0], topList = (r[2] || [])[0];
        return Promise.all([
          cookList ? RPGACE.sb.select('shopping_list_items', 'select=id&bought=eq.false&to_buy_amount=gt.0&list_id=eq.' + cookList.id).catch(function() { return null; }) : Promise.resolve(null),
          topList ? RPGACE.sb.select('shopping_list_items', 'select=id&bought=eq.false&list_id=eq.' + topList.id).catch(function() { return null; }) : Promise.resolve(null),
        ]).then(function(c) {
          var bits = [];
          if (sessCount) bits.push('🍳 A planned cook with ' + sessCount + ' recipe' + (sessCount === 1 ? '' : 's') + ' is in progress — schedule it when ready.');
          else if (scheduled) {
            var titles = (scheduled.recipes || []).map(function(x) { return x.title; }).join(', ');
            bits.push('🍳 Next cook ' + (scheduled.scheduledAt || '') + ': ' + titles + (c[0] ? ' — ' + c[0].length + ' thing' + (c[0].length === 1 ? '' : 's') + ' to buy' : '') + '.');
          } else bits.push(n ? '🍳 No cook planned — pick a recipe to cook or plan one.' : '⚡ No recipes yet — start with ⚡ New recipe.');
          if (c[1] && c[1].length) bits.push('🛒 ' + c[1].length + ' on your top-up list.');
          next.textContent = bits.join(' ');
        });
      }).catch(function() { next.textContent = '🍳 Pick a step below.'; });
    },

    // H20 (Sep 17 2026, real Alex bug report: "no way to revert planned
    // cook back from scheduled to planned cook in cooking module") — the
    // real new view for a scheduled-but-not-yet-cooked session. Shows
    // exactly what's scheduled and a real, explicit way back to a draft
    // (never a silent/automatic revert — Alex might genuinely want to
    // just leave it scheduled and this is only reachable via a deliberate
    // click on the hub's own "Planned Cook" button).
    _showScheduledCookInfo: function(scheduled) {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '460px', eyebrow: '🍳 COOKING', title: 'Scheduled Cook Session',
        borderColor: 'rgba(226,168,61,0.3)',
      });
      var box = pop.box;

      var info = document.createElement('div');
      info.style.cssText = 'font-size:13px;color:var(--text);margin-bottom:16px;line-height:1.7;';
      info.innerHTML = 'Scheduled for <b>' + (scheduled.scheduledAt || '?') + '</b>:<br>'
        + scheduled.recipes.map(function(r) { return '• ' + (r.title || '(recipe not found)'); }).join('<br>');
      box.appendChild(info);

      var errBox = document.createElement('div');
      errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:10px;display:none;';
      box.appendChild(errBox);

      // Oct 1 2026 (real Alex hand-test) - a scheduled cook can now be
      // started, finished, and grown from right here, never only via the
      // Daily Schedule's own Start/Done. Both go through the shared
      // logic._startCookNow/_finishCook paths (rule 8).
      var startNowBtn = self.ui._mkBtn('▶ Start cooking now', 'primary', { extra: 'margin-bottom:8px;' });
      startNowBtn.onclick = function() {
        pop.close();
        self.logic._startCookNow(scheduled.plannedCookId, scheduled.agendaId);
      };
      box.appendChild(startNowBtn);

      var finishBtn = self.ui._mkBtn('✅ Cook finished', 'primaryGold', { extra: 'margin-bottom:8px;' });
      finishBtn.onclick = function() {
        finishBtn.disabled = true;
        finishBtn.textContent = '⏳ Saving...';
        self.logic._finishCook(scheduled.plannedCookId, scheduled.agendaId, scheduled.recipeIds, function(err) {
          if (err) {
            finishBtn.disabled = false;
            finishBtn.textContent = '✅ Cook finished';
            errBox.textContent = '⚠️ ' + err;
            errBox.style.display = 'block';
            return;
          }
          RPGACE.utils.toast('✅ Cook marked finished — rate it in your Journal', '#4caf82', 3200);
          pop.close();
        });
      };
      box.appendChild(finishBtn);

      // Joining another recipe re-times the whole session (the interleaved
      // schedule is computed across every recipe), so this deliberately
      // reuses the real revert-to-draft path, then opens the same add
      // picker the draft builder uses - Alex re-schedules (or Cook now)
      // from the builder once the set is right.
      var addMoreBtn = self.ui._mkBtn('+ Add another recipe to this cook', 'secondary', { extra: 'margin-bottom:8px;' });
      addMoreBtn.onclick = function() {
        addMoreBtn.disabled = true;
        addMoreBtn.textContent = '⏳ Reopening session...';
        self.logic._revertScheduleToDraft(scheduled, function(err) {
          if (err) {
            addMoreBtn.disabled = false;
            addMoreBtn.textContent = '+ Add another recipe to this cook';
            errBox.textContent = '⚠️ ' + err;
            errBox.style.display = 'block';
            return;
          }
          self._scheduledSession = null;
          self._session = { recipeIds: scheduled.recipeIds.slice(), recipes: scheduled.recipes.slice(), plannedCookId: scheduled.plannedCookId, shopMode: 'can_shop' };
          self._sessionChecked = true;
          RPGACE.utils.toast('↩ Session reopened — add a recipe, then re-schedule or Cook now', '#E2A83D', 3400);
          pop.close();
          self.ui._showAddToSessionPicker();
        });
      };
      box.appendChild(addMoreBtn);

      var revertBtn = self.ui._mkBtn('↩ Revert to draft (unschedule)', 'ghost', { extra: 'margin-bottom:8px;' });
      revertBtn.onclick = function() {
        revertBtn.disabled = true;
        revertBtn.textContent = '⏳ Reverting...';
        self.logic._revertScheduleToDraft(scheduled, function(err) {
          if (err) {
            revertBtn.disabled = false;
            revertBtn.textContent = '↩ Revert to draft (unschedule)';
            errBox.textContent = '⚠️ ' + err;
            errBox.style.display = 'block';
            return;
          }
          RPGACE.utils.toast('↩ Reverted to draft — edit it under Planned Cook', '#E2A83D', 3200);
          self._scheduledSession = null;
          self._session = { recipeIds: scheduled.recipeIds.slice(), recipes: scheduled.recipes.slice(), plannedCookId: scheduled.plannedCookId };
          pop.close();
          self.ui._showSessionBuilder();
        });
      };
      box.appendChild(revertBtn);

      var closeBtn = self.ui._mkBtn('Close', 'ghost');
      closeBtn.onclick = function() { pop.close(); };
      box.appendChild(closeBtn);
    },

    // H18 (Sep 16 2026) — real, OPTIONAL 3rd param, `forceStockOnly`, so
    // the new stock-match finder's "generate a new one using only what I
    // have" can open this SAME form with the stock-only box already
    // ticked, rather than a second, parallel generate form.
    _showGenerateForm: function(cfg, initialDesc, forceStockOnly) {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '520px', eyebrow: '🍳 COOKING', title: 'Generate a recipe',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;

      if (cfg && cfg.habits_enabled === false) {
        var offMsg = document.createElement('div');
        offMsg.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:14px;padding:8px 10px;background:rgba(226,168,61,0.08);border:1px solid rgba(226,168,61,0.25);border-radius:6px;';
        offMsg.textContent = '⚠️ HABITS is currently turned off in Habits Settings — you can still generate, but the toggle exists for a reason, worth checking.';
        box.appendChild(offMsg);
      }

      var desc = document.createElement('textarea');
      desc.placeholder = 'What do you want to cook? e.g. "a spicy oxtail stew, batch-cookable, leftovers freeze well"';
      desc.style.cssText = 'width:100%;min-height:70px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:Rajdhani,sans-serif;padding:10px 12px;resize:vertical;outline:none;margin-bottom:10px;box-sizing:border-box;';
      if (initialDesc) desc.value = initialDesc;
      box.appendChild(desc);

      var servingsRow = document.createElement('div');
      servingsRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:12px;color:var(--muted);';
      var servingsLabel = document.createElement('span');
      servingsLabel.textContent = 'Servings:';
      var servingsInput = document.createElement('input');
      servingsInput.type = 'number';
      servingsInput.value = '4';
      servingsInput.min = '1';
      servingsInput.style.cssText = 'width:56px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:5px 8px;';
      servingsRow.appendChild(servingsLabel);
      servingsRow.appendChild(servingsInput);
      box.appendChild(servingsRow);

      // H18 (Sep 16 2026, real Alex ask: "now i can look for recipes that
      // will only give me purple or green ingredients... as filter to
      // generate new recipes") — real, honest "use what I have" toggle,
      // threaded through narrow-down too so a short description doesn't
      // silently lose the constraint on its way there.
      var stockOnlyRow = document.createElement('label');
      stockOnlyRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:12px;color:var(--muted);cursor:pointer;';
      var stockOnlyCheck = document.createElement('input');
      stockOnlyCheck.type = 'checkbox';
      if (forceStockOnly) stockOnlyCheck.checked = true;
      var stockOnlyText = document.createElement('span');
      stockOnlyText.textContent = '📦 Use only what I already have — no shopping trip needed';
      stockOnlyRow.appendChild(stockOnlyCheck);
      stockOnlyRow.appendChild(stockOnlyText);
      box.appendChild(stockOnlyRow);

      var errBox = document.createElement('div');
      errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:10px;display:none;';
      box.appendChild(errBox);

      var genBtn = self.ui._mkBtn('⚡ Generate', 'primary', { extra: 'margin-bottom:8px;' });
      genBtn.onclick = function() {
        var d = desc.value.trim();
        if (!d) { RPGACE.utils.toast('⚠️ Describe what you want to cook first', '#E2A83D', 2500); return; }
        // Sep 13 2026 - real Alex ask: a bare cuisine/category word ("Korean")
        // used to go straight to one generated recipe with zero
        // disambiguation. A short description (<=3 words) is now routed
        // through a real narrow-down step (dish-type chips, an optional
        // ingredients field, and an on-demand "5 ideas" Oracle call) instead
        // of guessing what he meant - never blocks an already-detailed
        // description, which skips straight to generation as before.
        var wordCount = d.split(/\s+/).filter(Boolean).length;
        if (wordCount <= 3) {
          pop.close();
          self.ui._showNarrowDown(d, servingsInput.value || 4, stockOnlyCheck.checked);
          return;
        }
        self.ui._runGenerateAndShow(pop, genBtn, errBox, d, servingsInput.value || 4, stockOnlyCheck.checked);
      };
      box.appendChild(genBtn);

      // Oct 21 2026: Settings and Stock now live in the ☰ list (ui._cookShortcuts).

      // H6 - if a cook session is already in progress, offer a real way
      // back to it instead of only forward into another fresh generation
      // (this form is reachable mid-session via the session builder's own
      // "+ Add another recipe... or generate a new one" path below).
      if (self._session && self._session.recipeIds && self._session.recipeIds.length) {
        var backBtn = self.ui._mkBtn('← Back to cook session (' + self._session.recipeIds.length + ' recipe' + (self._session.recipeIds.length === 1 ? '' : 's') + ')', 'plainLink', { extra: 'margin-top:6px;' });
        backBtn.onclick = function() { pop.close(); self.ui._showSessionBuilder(); };
        box.appendChild(backBtn);
      }
    },

    // Shared disable/spin/call/show sequence - both the main Generate button
    // and every narrow-down exit path (a picked idea, "Generate with this
    // info") funnel through this ONE function (rule 8) rather than each
    // re-implementing its own copy of "disable, spin, call logic._generate,
    // handle err, show the recipe card." btn/errBox are optional - a caller
    // with no inline button (a picked-idea popup) gets a toast on error
    // instead of an inline errBox message.
    _runGenerateAndShow: function(pop, btn, errBox, description, servings, stockOnly) {
      var self = RPGACE.modules.cookingOracle;
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Asking Oracle... (this can take a while)'; }
      if (errBox) errBox.style.display = 'none';
      self.logic._generate(description, servings, function(err, recipe, rawText) {
        if (err) {
          if (btn) { btn.disabled = false; btn.textContent = '⚡ Generate'; }
          if (errBox) { errBox.textContent = '⚠️ ' + err; errBox.style.display = 'block'; }
          else { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3200); if (pop) pop.close(); }
          return;
        }
        if (pop) pop.close();
        self.ui._showRecipeCard(recipe, rawText);
      }, stockOnly);
    },

    // Sep 13 2026 - real Alex ask: "Korean" used to go straight to one
    // generated recipe with no disambiguation, when he wanted either a list
    // of concrete dish ideas to pick from, or a way to narrow down by dish
    // type / specific ingredients. Reached from _showGenerateForm's genBtn
    // whenever the typed description is <=3 words - never a hard gate,
    // "Generate with this info" always proceeds with exactly what he typed.
    _showNarrowDown: function(description, servings, stockOnly) {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '520px', scroll: true, eyebrow: '🍳 COOKING', title: 'Narrow it down',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;

      var ctx = document.createElement('div');
      ctx.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:14px;';
      ctx.textContent = '"' + description + '" is pretty broad — pick a dish type, note any ingredients, or get 5 concrete ideas to choose from.';
      box.appendChild(ctx);

      var typeHeading = document.createElement('div');
      typeHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      typeHeading.textContent = 'What type of dish?';
      box.appendChild(typeHeading);

      var typeRow = document.createElement('div');
      typeRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;';
      box.appendChild(typeRow);

      var DISH_TYPES = ['Soup', 'Noodle', 'Rice', 'Main', 'Starter', 'Dessert', 'Side', 'Drink'];
      var selectedType = null;
      var typeButtons = [];
      var paintTypeButtons = function() {
        typeButtons.forEach(function(tb) {
          if (tb.name === selectedType) {
            tb.btn.style.background = 'rgba(76,175,130,0.15)';
            tb.btn.style.borderColor = 'rgba(76,175,130,0.4)';
            tb.btn.style.color = 'var(--green)';
          } else {
            tb.btn.style.background = 'rgba(255,255,255,0.04)';
            tb.btn.style.borderColor = 'var(--border)';
            tb.btn.style.color = 'var(--text)';
          }
        });
      };
      DISH_TYPES.forEach(function(t) {
        var b = self.ui._mkBtn(t, 'pillChip');
        b.onclick = function() { selectedType = (selectedType === t) ? null : t; paintTypeButtons(); };
        typeButtons.push({ name: t, btn: b });
        typeRow.appendChild(b);
      });

      var ingHeading = document.createElement('div');
      ingHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      ingHeading.textContent = 'Any particular ingredients? (optional)';
      box.appendChild(ingHeading);

      var ingInput = document.createElement('input');
      ingInput.type = 'text';
      ingInput.placeholder = 'e.g. chicken thighs, gochujang, spring onion';
      ingInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:Rajdhani,sans-serif;padding:8px 10px;margin-bottom:16px;box-sizing:border-box;outline:none;';
      box.appendChild(ingInput);

      var errBox = document.createElement('div');
      errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:10px;display:none;';
      box.appendChild(errBox);

      var ideasBox = document.createElement('div');
      ideasBox.style.cssText = 'margin-bottom:12px;';
      box.appendChild(ideasBox);

      var suggestBtn = self.ui._mkBtn('🎲 Suggest 5 ideas', 'secondary', { extra: 'margin-bottom:8px;' });
      suggestBtn.onclick = function() {
        suggestBtn.disabled = true;
        suggestBtn.textContent = '⏳ Asking Oracle...';
        errBox.style.display = 'none';
        ideasBox.innerHTML = '';
        self.logic._suggestDishes(description, selectedType, ingInput.value.trim(), function(err, ideas) {
          suggestBtn.disabled = false;
          suggestBtn.textContent = '🎲 Suggest 5 ideas';
          if (err) { errBox.textContent = '⚠️ ' + err; errBox.style.display = 'block'; return; }
          ideas.forEach(function(idea) {
            var ib = self.ui._mkBtn(idea, 'listItem');
            ib.onclick = function() {
              pop.close();
              var pop2 = RPGACE.modules.dashDeck._popup({
                width: '520px', eyebrow: '🍳 COOKING', title: 'Generate a recipe',
                borderColor: 'rgba(76,175,130,0.3)',
              });
              var loadingMsg = document.createElement('div');
              loadingMsg.style.cssText = 'font-size:13px;color:var(--muted);padding:10px 0;';
              loadingMsg.textContent = '⏳ Asking Oracle for "' + idea + '"...';
              pop2.box.appendChild(loadingMsg);
              self.ui._runGenerateAndShow(pop2, null, null, idea, servings, stockOnly);
            };
            ideasBox.appendChild(ib);
          });
        });
      };
      box.appendChild(suggestBtn);

      var genBtn = self.ui._mkBtn('✅ Generate with this info', 'primary', { extra: 'margin-bottom:8px;' });
      genBtn.onclick = function() {
        var parts = [description];
        if (selectedType) parts.push(selectedType.toLowerCase() + ' dish');
        if (ingInput.value.trim()) parts.push('using ' + ingInput.value.trim());
        var finalDesc = parts.join(', ');
        self.ui._runGenerateAndShow(pop, genBtn, errBox, finalDesc, servings, stockOnly);
      };
      box.appendChild(genBtn);

      var backBtn = self.ui._mkBtn('← Back to edit', 'plainLink');
      backBtn.onclick = function() {
        pop.close();
        self.logic._loadConfig(function(c) { self.ui._showGenerateForm(c || {}, description); });
      };
      box.appendChild(backBtn);
    },

    // STEP_META - the real, fixed 4-way step taxonomy confirmed 2026-09-10
    // (kitchen-scheduler interrogation). Shared here rather than repeated
    // per render site (rule 8) - both _showRecipeCard's step list and any
    // future H6 build should read step type metadata from this one place.
    STEP_META: {
      prep_before_cooking: { label: '🔪 Prep', color: '#4A8CCC' },
      actual_cooking:       { label: '🔥 Cooking', color: '#cc7a3a' },
      prep_while_cooking:   { label: '🍳 Prep (while cooking)', color: '#4caf82' },
      baking:                { label: '🍞 Baking', color: '#C9A84C' },
    },

    // H14 (Sep 16 2026, real Alex ask: "it needs to show me measurements of
    // each ingredient at each step so i dont have to go back and fourth to
    // agree plan") — one shared renderer (rule 8) for a step's own real
    // ingredients_used chips, used by BOTH the single-recipe card's Method
    // list below AND the multi-recipe schedule-preview block loop
    // (ui._showSchedulePreview), so the two real consumers of a step's data
    // never drift into two different chip layouts. Returns null (append
    // nothing) when a step genuinely has no ingredients_used — an OLD
    // recipe saved before this field existed, or a step that's real
    // "no ingredient" work (e.g. "preheat the oven") — never a fabricated
    // placeholder chip.
    _renderStepIngredients: function(step) {
      var self = RPGACE.modules.cookingOracle;
      var list = (step && Array.isArray(step.ingredients_used)) ? step.ingredients_used : [];
      if (!list.length) return null;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;';
      list.forEach(function(u) {
        var chip = document.createElement('span');
        chip.style.cssText = 'font-size:13px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);color:var(--gold);border-radius:10px;padding:2px 8px;';
        var at = self.logic._stepAmountText(u);
        chip.textContent = at === 'take out' ? (u.name || '') + ' (take out)' : (at ? at + ' ' : '') + (u.name || '');
        row.appendChild(chip);
      });
      return row;
    },

    // H24 (Sep 17 2026, 10th pass, real Alex ask: "can it take me to
    // oracle where i will have an on hand assisstant... this window in
    // oracle can also be used as timers when cooking") — real, extracted
    // shared builder (rule 8), pulled out of _showRecipeCard's own
    // renderSteps so BOTH the recipe card's Method list AND the new Live
    // Cook Mode panel (ui._openLiveCookMode) show and run the exact same
    // real countdown/reminder mechanics, never 2 independent copies.
    // Returns a real DOM fragment (0-2 rows) to append; `activeIntervals`
    // is the caller's own shared array (leak-prevention — every real
    // interval this builder starts gets pushed there so the caller can
    // clear it on its own re-render/teardown, same discipline
    // _showRecipeCard's own activeStepIntervals already established).
    _mkStepTimerControls: function(step, activeIntervals) {
      var self = RPGACE.modules.cookingOracle;
      var frag = document.createDocumentFragment();

      // CM-3 (Oct 15 2026, Alex: remove timers from hands-on steps): only
      // the waiting (passive) part of a step gets a countdown.
      var timerMin = step.passive_duration_min || 0;
      if (timerMin > 0) {
        var timerRow = document.createElement('div');
        timerRow.style.cssText = 'margin-top:6px;display:flex;align-items:center;gap:8px;';
        var timerBtn = self.ui._mkBtn('⏱ Start ' + timerMin + 'm timer', 'inline');
        var timerText = document.createElement('span');
        timerText.style.cssText = 'font-size:12px;color:var(--gold);font-weight:700;display:none;';
        timerBtn.onclick = function() {
          if (timerBtn._interval) return; // already running
          var remaining = timerMin * 60;
          timerBtn.style.display = 'none';
          timerText.style.display = 'inline';
          var tick = function() {
            var m = Math.floor(remaining / 60), s = remaining % 60;
            timerText.textContent = '⏱ ' + m + ':' + String(s).padStart(2, '0');
            if (remaining <= 0) {
              clearInterval(timerBtn._interval);
              timerText.textContent = '✅ Time\'s up';
              RPGACE.utils.toast('⏱ Timer done: ' + (step.description || 'step').slice(0, 60), '#C9A84C', 4000);
              return;
            }
            remaining--;
          };
          tick();
          timerBtn._interval = setInterval(tick, 1000);
          if (activeIntervals) activeIntervals.push(timerBtn._interval);
        };
        timerRow.appendChild(timerBtn);
        timerRow.appendChild(timerText);
        frag.appendChild(timerRow);
      }

      var intervalMatch = /every\s+(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(?:minutes?|mins?|min)\b/i.exec(step.description || '');
      if (intervalMatch) {
        var intervalMin = parseInt(intervalMatch[1], 10);
        var intervalLabel = intervalMatch[2] ? (intervalMatch[1] + '-' + intervalMatch[2] + 'm') : (intervalMatch[1] + 'm');
        var remindRow = document.createElement('div');
        remindRow.style.cssText = 'margin-top:6px;';
        var remindBtn = self.ui._mkBtn('🔁 Remind me every ' + intervalLabel, 'inline', { color: '#9B59B6', borderColor: 'rgba(155,89,182,0.4)' });
        remindBtn.onclick = function() {
          if (remindBtn._interval) {
            clearInterval(remindBtn._interval);
            remindBtn._interval = null;
            remindBtn.textContent = '🔁 Remind me every ' + intervalLabel;
            RPGACE.utils.toast('🔁 Reminder stopped', '#E2A83D', 1800);
            return;
          }
          remindBtn.textContent = '⏹ Stop reminder (every ' + intervalLabel + ')';
          RPGACE.utils.toast('🔁 Reminder started — every ' + intervalLabel + ', starting now', '#9B59B6', 2400);
          remindBtn._interval = setInterval(function() {
            RPGACE.utils.toast('🔁 ' + intervalLabel + ' reminder — ' + (step.description || 'this step').slice(0, 70), '#9B59B6', 4500);
          }, intervalMin * 60 * 1000);
          if (activeIntervals) activeIntervals.push(remindBtn._interval);
        };
        remindRow.appendChild(remindBtn);
        frag.appendChild(remindRow);
      }

      return frag;
    },

    // H24 (Sep 17 2026, 10th pass, real Alex ask: "i clicked start on cook
    // in schedule, nothing happened, can it take me to oracle where i will
    // have an on hand assisstant with the scaffolding for live events
    // happening, this window in oracle can also be used as timers when
    // cooking so its all happenning as i go") — real root cause found
    // first (rule 4): startScheduledTask's own write to rpgace_agendas.
    // started_at DOES succeed (confirmed via a direct live Supabase query,
    // a real row shows a real started_at timestamp) — the actual gap is
    // that a successful click produced no meaningful live-cooking
    // experience, only a small Daily Schedule grid flag. This is the real
    // fix: navigate to Oracle and show a persistent panel with the real
    // computed step schedule (reusing logic._computeSessionSchedule's own
    // already-correct output, rule 8 — never re-derived), each step
    // wired to the SAME real timer/reminder controls
    // (ui._mkStepTimerControls) the recipe card already uses.
    _liveCookIntervals: [],
    _clearLiveCookIntervals: function() {
      var self = RPGACE.modules.cookingOracle;
      (self._liveCookIntervals || []).forEach(function(id) { clearInterval(id); });
      self._liveCookIntervals = [];
    },
    // Oct 11 2026 — Cook Mode, Ube Express-style (Alex's own bar app:
    // overview -> Start Build -> one step per screen). Full screen, one
    // action per step: progress, "Step X of Y", what to have in hand, that
    // step's ingredients with amounts, the instruction, a "done when" cue
    // and the step's timer. Every step's screen is built once and only the
    // current one shown, so a timer started on step 3 keeps counting when
    // you move on; a strip at the top shows timers running on other steps
    // (toasts sit under popups and would be hidden). Phone Back steps back
    // (dashDeck nav stack, rule 8), position is remembered per key, and the
    // screen is kept awake while cooking where the browser allows it.
    // steps: logic._cookModeSteps() output. opts: { title, key, onDone }.
    // Oct 11 2026 — Cook Mode: review proposed one-action steps for a saved
    // recipe (recipes.steps_proposed). Accept moves the current steps to
    // steps_previous (undo safety, no DB backup) and the proposal into steps;
    // Keep current just clears the proposal. Nothing changes without a tap.
    _reviewProposedSteps: function(recipeId, recipe, onChanged) {
      var self = RPGACE.modules.cookingOracle;
      var prop = recipe.steps_proposed || [];
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🍳 Cook Mode steps', title: recipe.title || 'Recipe', width: '600px', scroll: true, noDefaultClose: true });
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      intro.textContent = 'Your ' + (recipe.steps || []).length + ' current steps split into ' + prop.length + ' one-action steps for Cook Mode. Same ingredients and amounts; your current steps are kept so this can be undone.';
      pop.box.appendChild(intro);
      var gaps = self.logic._stepCoverageGaps({ ingredients: recipe.ingredients, steps: prop });
      if (gaps.length) {
        var w = document.createElement('div');
        w.style.cssText = 'font-size:13px;color:#E2A83D;margin-bottom:10px;';
        w.textContent = '⚠️ Not used in any proposed step: ' + gaps.join(', ');
        pop.box.appendChild(w);
      }
      var ol = document.createElement('ol');
      ol.style.cssText = 'margin:0 0 12px;padding-left:22px;display:grid;gap:10px;';
      prop.forEach(function(st) {
        var li = document.createElement('li');
        li.style.cssText = 'font-size:14px;line-height:1.45;';
        var t = document.createElement('div'); t.textContent = st.description || '';
        li.appendChild(t);
        var extra = [st.equipment ? '🍳 ' + st.equipment : '', st.done_cue ? '✓ ' + st.done_cue : ''].filter(Boolean).join('   ');
        if (extra) { var e = document.createElement('div'); e.style.cssText = 'font-size:13px;color:var(--muted);margin-top:2px;'; e.textContent = extra; li.appendChild(e); }
        var chips = self.ui._renderStepIngredients(st);
        if (chips) li.appendChild(chips);
        ol.appendChild(li);
      });
      pop.box.appendChild(ol);
      var bar = document.createElement('div');
      bar.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';
      var keep = self.ui._mkBtn('Keep current steps', 'secondary', { extra: 'min-height:44px;' });
      var acc = self.ui._mkBtn('✅ Use these steps', 'primary', { extra: 'min-height:44px;' });
      bar.appendChild(keep); bar.appendChild(acc);
      pop.box.appendChild(bar);
      var busy = function(on) { keep.disabled = on; acc.disabled = on; };
      acc.onclick = function() {
        busy(true); acc.textContent = 'Saving…';
        RPGACE.sb.secureWrite('recipes', 'update', { steps: prop, steps_previous: recipe.steps || [], steps_proposed: null }, 'id=eq.' + recipeId)
          .then(function() {
            RPGACE.cache.clear('recipes');
            recipe.steps = prop; recipe.steps_proposed = null;
            pop.close();
            RPGACE.utils.toast('✅ Cook Mode steps saved', '#4caf82', 2500);
            if (onChanged) onChanged();
          })
          .catch(function(e) { busy(false); acc.textContent = '✅ Use these steps'; RPGACE.utils.toast('⚠️ Could not save: ' + (e.message || e), '#CC4A4A', 4000, 'cookingOracle'); });
      };
      keep.onclick = function() {
        busy(true);
        RPGACE.sb.secureWrite('recipes', 'update', { steps_proposed: null }, 'id=eq.' + recipeId)
          .then(function() { RPGACE.cache.clear('recipes'); recipe.steps_proposed = null; pop.close(); if (onChanged) onChanged(); })
          .catch(function(e) { busy(false); RPGACE.utils.toast('⚠️ Could not update: ' + (e.message || e), '#CC4A4A', 4000, 'cookingOracle'); });
      };
    },

    _cookModeIntervals: [],
    _openCookMode: function(steps, opts) {
      var self = RPGACE.modules.cookingOracle;
      var dd = RPGACE.modules.dashDeck;
      opts = opts || {};
      if (!steps || !steps.length) { RPGACE.utils.toast('⚠️ This recipe has no steps to cook from', '#E2A83D', 2500); return; }
      var old = document.getElementById('cook-mode');
      if (old && old._cmClose) old._cmClose(false);
      var storeKey = opts.key ? 'rpgace_cookmode_' + opts.key : null;
      var idx = 0;
      try { var saved = storeKey ? parseInt(localStorage.getItem(storeKey), 10) : NaN; if (saved > 0 && saved < steps.length) idx = saved; } catch (e) {}
      var resumed = idx > 0;
      // CM-2 (Oct 15 2026): when this cook started, so a real cook can be
      // back-filled into the Daily Schedule. A resumed cook keeps its start.
      var startKey = storeKey ? storeKey + '_start' : null;
      var startedAt = Date.now();
      try { var st0 = startKey ? parseInt(localStorage.getItem(startKey), 10) : NaN; if (resumed && st0 > 0) startedAt = st0; if (startKey) localStorage.setItem(startKey, String(startedAt)); } catch (e) {}
      var timerKey = storeKey ? storeKey + '_timers' : null;
      var clearProgress = function() { try { if (storeKey) localStorage.removeItem(storeKey); if (startKey) localStorage.removeItem(startKey); if (timerKey) localStorage.removeItem(timerKey); } catch (e) {} };
      // CM-3: running timers { i: step index, endAt: ms, rung } - kept per
      // cook so a reopened Cook Mode still shows them.
      var timers = [];
      try { var tk = timerKey ? JSON.parse(localStorage.getItem(timerKey) || '[]') : []; if (Array.isArray(tk)) timers = tk.filter(function(t) { return t && t.i >= 0 && t.i < steps.length && t.endAt > 0; }); } catch (e) {}
      var saveTimers = function() { try { if (timerKey) localStorage.setItem(timerKey, JSON.stringify(timers)); } catch (e) {} };
      var endsText = function(i) {
        var st = steps[i];
        if (st.timer_end) return st.timer_end;
        var nx = steps[i + 1];
        return nx ? 'Next: ' + nx.instruction : 'Time\'s up';
      };
      var renderBar, startTimer;
      self._cookModeIntervals = [];
      var multi = steps.some(function(st) { return st.recipeTitle && st.recipeTitle !== steps[0].recipeTitle; });

      var ov = document.createElement('div');
      ov.id = 'cook-mode';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-label', 'Cook Mode');
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--bg,#0d0f14);color:var(--text,#e2e2ec);display:flex;flex-direction:column;font-family:Rajdhani,sans-serif;padding:max(12px, env(safe-area-inset-top)) 16px max(12px, env(safe-area-inset-bottom));box-sizing:border-box;';

      var head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:center;gap:10px;';
      var x = self.ui._mkBtn('✕', 'closeIcon');
      x.type = 'button'; x.setAttribute('aria-label', 'Close Cook Mode');
      var ttl = document.createElement('div');
      ttl.style.cssText = 'flex:1;min-width:0;font-size:15px;font-weight:700;letter-spacing:1px;color:var(--green);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      ttl.textContent = '🍳 ' + (opts.title || 'Cook Mode');
      // CM-4 (Oct 15 2026, Alex: "oracle chat should have dedicated text
      // field and interface... during cook live"): a 💬 Ask panel inside
      // Cook Mode that knows the recipe, the step and running timers.
      var askBtn = self.ui._mkBtn('💬 Ask', 'small', { extra: 'min-height:44px;min-width:64px;' });
      askBtn.type = 'button'; askBtn.classList.add('cm-ask-btn');
      askBtn.setAttribute('aria-label', 'Ask Oracle about this cook');
      head.appendChild(x); head.appendChild(ttl); head.appendChild(askBtn);
      ov.appendChild(head);

      var dots = document.createElement('div');
      dots.style.cssText = 'display:flex;gap:3px;margin:12px 0 6px;';
      steps.forEach(function() { var d = document.createElement('div'); d.style.cssText = 'flex:1;height:5px;border-radius:3px;background:var(--border);'; dots.appendChild(d); });
      ov.appendChild(dots);
      var label = document.createElement('div');
      label.setAttribute('aria-live', 'polite');
      label.style.cssText = 'display:flex;justify-content:space-between;gap:8px;font-size:14px;color:var(--muted);font-weight:700;';
      ov.appendChild(label);

      var stack = document.createElement('div');
      stack.style.cssText = 'flex:1;min-height:0;overflow-y:auto;margin:10px 0;display:grid;';
      var panels = steps.map(function(st, i) {
        var meta = self.ui.STEP_META[st.type] || { label: st.type || 'Step', color: 'var(--muted)' };
        var pnl = document.createElement('div');
        pnl.className = 'cm-step';
        pnl.style.cssText = 'grid-area:1/1;display:flex;flex-direction:column;gap:14px;';
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid var(--border);border-left:4px solid ' + meta.color + ';border-radius:10px;padding:14px;background:rgba(255,255,255,0.03);';
        var tag = document.createElement('div');
        tag.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:' + meta.color + ';';
        tag.textContent = meta.label + (multi && st.recipeTitle ? ' · ' + st.recipeTitle : '');
        card.appendChild(tag);
        if (st.equipment) {
          var eq = document.createElement('div');
          eq.style.cssText = 'font-size:16px;margin-top:8px;color:var(--text);';
          eq.textContent = '🍳 ' + st.equipment;
          card.appendChild(eq);
        }
        var ings = st.ingredients_used || [];
        if (ings.length) {
          var ul = document.createElement('ul');
          ul.style.cssText = 'list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px;';
          ings.forEach(function(u) {
            var li = document.createElement('li');
            li.style.cssText = 'display:flex;justify-content:space-between;gap:12px;font-size:18px;padding:6px 0;border-bottom:1px solid var(--border);';
            var n = document.createElement('span'); n.textContent = u.name || '';
            var a = document.createElement('span');
            a.style.cssText = 'color:var(--gold);font-weight:700;white-space:nowrap;';
            a.textContent = self.logic._stepAmountText(u);
            li.appendChild(n); li.appendChild(a); ul.appendChild(li);
          });
          card.appendChild(ul);
        } else if (!st.equipment) {
          var none = document.createElement('div');
          none.style.cssText = 'font-size:15px;color:var(--muted);margin-top:8px;';
          none.textContent = 'Nothing new to add on this step.';
          card.appendChild(none);
        }
        pnl.appendChild(card);
        var ins = document.createElement('div');
        ins.style.cssText = 'font-size:21px;line-height:1.4;font-weight:600;';
        ins.textContent = st.instruction;
        pnl.appendChild(ins);
        if (st.done_cue) {
          var cue = document.createElement('div');
          cue.style.cssText = 'font-size:16px;color:var(--green);';
          cue.textContent = '✓ Done when: ' + st.done_cue;
          pnl.appendChild(cue);
        }
        var tm = document.createElement('div');
        tm.className = 'cm-timer';
        // CM-3: a waiting step starts its timer and moves on; the timer
        // carries on in the bar at the bottom. Hands-on steps get none
        // (only the every-N-minutes reminder, when the step asks for one).
        if (st.passive_duration_min > 0) {
          var go = self.ui._mkBtn('⏱ Start ' + st.passive_duration_min + '-min timer & move on', 'primaryGold', { extra: 'width:100%;' });
          go.classList.add('cm-start-timer');
          go.onclick = function() { startTimer(i); };
          tm.appendChild(go);
        }
        tm.appendChild(self.ui._mkStepTimerControls({ description: st.instruction, active_duration_min: 0, passive_duration_min: 0 }, self._cookModeIntervals));
        Array.prototype.forEach.call(tm.querySelectorAll('button'), function(b) { b.style.minHeight = '44px'; b.style.fontSize = '15px'; });
        pnl.appendChild(tm);
        stack.appendChild(pnl);
        return pnl;
      });
      ov.appendChild(stack);

      var nav = document.createElement('div');
      nav.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';
      var mk = function(primary) {
        var b = self.ui._mkBtn('', primary ? 'cookNavPrimary' : 'cookNav'); b.type = 'button';
        return b;
      };
      var back = mk(false), next = mk(true);
      nav.appendChild(back); nav.appendChild(next);
      // CM-3: running timers sit here until Alex taps Done on them.
      var bar = document.createElement('div');
      bar.className = 'cm-timer-bar';
      bar.setAttribute('aria-live', 'polite');
      bar.style.cssText = 'display:grid;gap:6px;max-height:34vh;overflow-y:auto;margin-bottom:10px;';
      ov.appendChild(bar);
      ov.appendChild(nav);

      var wake = null;
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function(w) { wake = w; }).catch(function() {}); } catch (e) {}

      var save = function() { try { if (storeKey) localStorage.setItem(storeKey, String(idx)); } catch (e) {} };
      var show = function() {
        panels.forEach(function(p, i) { p.style.visibility = i === idx ? 'visible' : 'hidden'; p.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); });
        Array.prototype.forEach.call(dots.children, function(d, i) { d.style.background = i <= idx ? 'var(--green)' : 'var(--border)'; });
        var st = steps[idx];
        var mins = Math.max(st.active_duration_min || 0, st.passive_duration_min || 0);
        label.innerHTML = '';
        var l1 = document.createElement('span'); l1.textContent = 'Step ' + (idx + 1) + ' of ' + steps.length;
        var l2 = document.createElement('span'); l2.textContent = mins ? ('~' + mins + ' min') : '';
        label.appendChild(l1); label.appendChild(l2);
        back.textContent = idx > 0 ? '← Back' : '✕ Close';
        next.textContent = idx < steps.length - 1 ? 'Next →' : '✅ Done';
        var sb = panels[idx].querySelector('.cm-start-timer');
        if (sb) { var on = timers.some(function(t) { return t.i === idx; }); sb.disabled = on; sb.textContent = on ? '⏱ Timer running — see the bar below' : '⏱ Start ' + st.passive_duration_min + '-min timer & move on'; }
        stack.scrollTop = 0;
        save();
      };
      // CM-3 (Oct 15 2026, Alex: "the step should carry forward to next
      // until timer goes off... a notification at the bottom says what
      // needed to be done to press done on timer").
      renderBar = function() {
        var now = Date.now();
        bar.innerHTML = '';
        timers.forEach(function(t) {
          var left = Math.max(0, Math.round((t.endAt - now) / 1000));
          var st = steps[t.i];
          var row = document.createElement('div');
          row.className = 'cm-bar-timer' + (left === 0 ? ' cm-bar-due' : '');
          row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid ' + (left === 0 ? 'var(--gold)' : 'var(--border)') + ';background:' + (left === 0 ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.04)') + ';';
          var txt = document.createElement('div');
          txt.style.cssText = 'flex:1;min-width:0;font-size:15px;line-height:1.3;';
          var head = document.createElement('div');
          head.style.cssText = 'font-weight:700;color:var(--gold);';
          head.textContent = left === 0 ? '⏰ Step ' + (t.i + 1) + ' timer is up' : '⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + ' · Step ' + (t.i + 1);
          var sub = document.createElement('div');
          sub.style.cssText = 'color:var(--text);';
          sub.textContent = left === 0 ? endsText(t.i) : (st.instruction || '').slice(0, 70);
          txt.appendChild(head); txt.appendChild(sub);
          row.appendChild(txt);
          if (left === 0) {
            if (!t.rung) {
              t.rung = true; saveTimers();
              try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {}
              RPGACE.utils.toast('⏰ ' + endsText(t.i), '#C9A84C', 5000);
            }
            var ok = self.ui._mkBtn('✓ Done', 'small');
            ok.classList.add('cm-timer-done');
            ok.onclick = function() { timers = timers.filter(function(x) { return x !== t; }); saveTimers(); renderBar(); show(); };
            row.appendChild(ok);
          }
          bar.appendChild(row);
        });
      };
      startTimer = function(i) {
        if (timers.some(function(t) { return t.i === i; })) return;
        timers.push({ i: i, endAt: Date.now() + steps[i].passive_duration_min * 60000, rung: false });
        saveTimers();
        renderBar();
        if (i === idx && idx < steps.length - 1) { idx++; show(); }
        else show();
      };
      var poll = setInterval(renderBar, 1000);
      self._cookModeIntervals.push(poll);

      // CM-4: the Ask panel. History lasts while Cook Mode is open.
      var askLog = [];
      var askPanel = null;
      var cookContext = function() {
        var st = steps[idx];
        var now = Date.now();
        var lines = ['Recipe: ' + (opts.title || 'this recipe') + '.',
          'Alex is on step ' + (idx + 1) + ' of ' + steps.length + ': ' + (st.instruction || '') + (st.done_cue ? ' (done when: ' + st.done_cue + ')' : '') + '.'];
        var ing = (st.ingredients_used || []).map(function(u) { var t = self.logic._stepAmountText(u); return (t ? t + ' ' : '') + u.name; });
        if (ing.length) lines.push('This step uses: ' + ing.join(', ') + '.');
        if (timers.length) lines.push('Running timers: ' + timers.map(function(t) { var left = Math.max(0, Math.round((t.endAt - now) / 1000)); return 'step ' + (t.i + 1) + ' (' + (steps[t.i].instruction || '').slice(0, 50) + ') ' + (left ? Math.ceil(left / 60) + ' min left' : 'done, waiting for Alex'); }).join('; ') + '.');
        lines.push('All steps: ' + steps.map(function(x, k) { return (k + 1) + '. ' + (x.instruction || '').slice(0, 80); }).join(' '));
        return 'You are Oracle, helping Alex while he cooks right now in Cook Mode. ' + lines.join(' ') + ' Answer in one to three short, practical sentences he can act on with his hands busy. No lists, no headings.';
      };
      var openAsk = function() {
        if (askPanel) { askPanel.remove(); askPanel = null; return; }
        askPanel = document.createElement('div');
        askPanel.className = 'cm-ask-panel';
        askPanel.setAttribute('role', 'dialog');
        askPanel.setAttribute('aria-label', 'Ask Oracle while cooking');
        askPanel.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:62%;background:var(--panel,#141722);border-top:2px solid var(--green);border-radius:14px 14px 0 0;display:flex;flex-direction:column;padding:12px 16px max(12px, env(safe-area-inset-bottom));box-sizing:border-box;z-index:2;box-shadow:0 -10px 30px rgba(0,0,0,0.5);';
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
        var h = document.createElement('div');
        h.style.cssText = 'font-size:15px;font-weight:700;color:var(--green);';
        h.textContent = '💬 Ask about step ' + (idx + 1);
        var cl = self.ui._mkBtn('✕', 'closeIcon'); cl.type = 'button'; cl.setAttribute('aria-label', 'Close Ask');
        cl.onclick = function() { askPanel.remove(); askPanel = null; };
        top.appendChild(h); top.appendChild(cl);
        var log = document.createElement('div');
        log.className = 'cm-ask-log';
        log.style.cssText = 'flex:1;min-height:0;overflow-y:auto;display:grid;gap:8px;align-content:start;margin:10px 0;font-size:16px;line-height:1.4;';
        var paint = function() {
          log.innerHTML = '';
          if (!askLog.length) {
            var hint = document.createElement('div');
            hint.style.cssText = 'color:var(--muted);font-size:14px;';
            hint.textContent = 'Ask anything about this cook - e.g. "can I use dried chilli instead?" or "is the sauce meant to be this thick?"';
            log.appendChild(hint);
          }
          askLog.forEach(function(m) {
            var b = document.createElement('div');
            b.className = m.role === 'user' ? 'cm-ask-me' : 'cm-ask-oracle';
            b.style.cssText = 'padding:8px 12px;border-radius:10px;' + (m.role === 'user' ? 'background:rgba(76,175,130,0.14);justify-self:end;max-width:85%;' : 'background:rgba(255,255,255,0.05);max-width:95%;') + (m.err ? 'color:#CC4A4A;' : '');
            b.textContent = m.content;
            log.appendChild(b);
          });
          log.scrollTop = log.scrollHeight;
        };
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;';
        var inp = document.createElement('textarea');
        inp.id = 'cm-ask-input'; inp.rows = 2; inp.placeholder = 'Ask Oracle…';
        inp.setAttribute('aria-label', 'Your question');
        inp.style.cssText = 'flex:1;min-width:0;resize:none;min-height:48px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--panel2,#1b1f2c);color:var(--text);font-size:16px;font-family:inherit;';
        var send = self.ui._mkBtn('Send', 'primary'); send.type = 'button'; send.classList.add('cm-ask-send');
        var go = function() {
          var q = inp.value.trim();
          if (!q || send.disabled) return;
          inp.value = '';
          askLog.push({ role: 'user', content: q });
          var wait = { role: 'assistant', content: '…' };
          askLog.push(wait); paint();
          send.disabled = true;
          var msgs = askLog.filter(function(m) { return m !== wait && !m.err; }).slice(-8).map(function(m) { return { role: m.role, content: m.content }; });
          Promise.resolve().then(function() { return window.callOracle(msgs, cookContext(), 400); })
            .then(function(r) {
              var t = r && r.content && r.content[0] ? r.content[0].text : (typeof r === 'string' ? r : '');
              wait.content = (t || '').trim() || 'Oracle sent an empty reply - try asking again.';
              if (!t) wait.err = true;
            })
            .catch(function(e) { wait.content = '⚠️ Oracle could not answer: ' + (e && e.message || 'unknown error'); wait.err = true; })
            .then(function() { send.disabled = false; paint(); });
        };
        send.onclick = go;
        inp.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } e.stopPropagation(); });
        row.appendChild(inp); row.appendChild(send);
        askPanel.appendChild(top); askPanel.appendChild(log); askPanel.appendChild(row);
        ov.appendChild(askPanel);
        paint();
        setTimeout(function() { try { inp.focus(); } catch (e) {} }, 50);
      };
      askBtn.onclick = openAsk;

      // CM-4: the floating 🔮 button sat on top of Next. Hidden while Cook
      // Mode is open (Ask replaces it here), put back when it closes.
      var orb = document.getElementById('oc-floating-btn');
      var orbWas = orb ? orb.style.display : null;
      if (orb) orb.style.display = 'none';
      var orbPanel = document.getElementById('oc-overlay-panel');
      if (orbPanel) { orbPanel.remove(); if (RPGACE.modules.oracleControl) RPGACE.modules.oracleControl._overlayOpen = false; }

      var entry = { overlay: ov, card: null };
      var teardown = function(fromPop) {
        (self._cookModeIntervals || []).forEach(function(id) { clearInterval(id); });
        self._cookModeIntervals = [];
        try { if (wake) wake.release(); } catch (e) {}
        document.removeEventListener('keydown', onKey);
        if (orb) orb.style.display = orbWas || '';
        ov.remove();
        if (dd && dd._navClosed) dd._navClosed(entry, fromPop === true);
      };
      entry.close = function(fromPop) {
        // Phone Back on a later step goes to the previous step, like Ube's Build Mode.
        if (fromPop === true && idx > 0) {
          if (dd && dd._navClosed) dd._navClosed(entry, true);
          idx--; show();
          if (dd && dd._navPush) dd._navPush(entry);
          return;
        }
        teardown(fromPop);
      };
      ov._cmClose = entry.close;
      // CM-1: the last Done hands over { startedAt, endedAt, clearProgress };
      // the caller asks Actual cook / Just a preview / Not finished yet, so
      // progress is only cleared once Alex has answered.
      var finish = function() {
        teardown(false);
        if (opts.onDone) { try { opts.onDone({ startedAt: startedAt, endedAt: Date.now(), clearProgress: clearProgress }); } catch (e) { console.warn('[cookingOracle] Cook Mode onDone failed:', e); } }
        else { clearProgress(); RPGACE.utils.toast('🍽 Done — enjoy it', '#4caf82', 2500); }
      };
      back.onclick = function() { if (idx > 0) { idx--; show(); } else teardown(false); };
      next.onclick = function() { if (idx < steps.length - 1) { idx++; show(); } else finish(); };
      x.onclick = function() { teardown(false); };
      var onKey = function(e) {
        if (e.key === 'ArrowRight') next.onclick();
        else if (e.key === 'ArrowLeft' && idx > 0) back.onclick();
        else if (e.key === 'Escape') teardown(false);
      };
      document.addEventListener('keydown', onKey);

      document.body.appendChild(ov);
      if (dd && dd._navPush) dd._navPush(entry);
      show();
      renderBar();
      if (resumed) {
        var note = document.createElement('div');
        note.style.cssText = 'font-size:13px;color:var(--muted);';
        note.textContent = 'Picked up where you left off. ';
        var restart = self.ui._mkBtn('Start from step 1', 'textLink');
        restart.type = 'button';
        restart.onclick = function() { idx = 0; show(); note.remove(); };
        note.appendChild(restart);
        label.parentNode.insertBefore(note, label.nextSibling);
      }
      return { close: function() { teardown(false); }, go: function(i) { idx = Math.max(0, Math.min(steps.length - 1, i)); show(); } };
    },

    _openLiveCookMode: function(plannedCookId) {
      var self = RPGACE.modules.cookingOracle;
      if (!plannedCookId) { RPGACE.utils.toast('⚠️ No cook session to open', '#E2A83D', 2200); return; }
      if (typeof showPage === 'function') showPage('advisor');

      var pageAdvisor = document.getElementById('page-advisor');
      var chatWrap = pageAdvisor ? pageAdvisor.querySelector('.chat-wrap') : null;
      if (!pageAdvisor || !chatWrap) { RPGACE.utils.toast('⚠️ Could not open Oracle', '#E2A83D', 2200); return; }

      var existing = document.getElementById('live-cook-panel');
      if (existing) existing.remove();
      self.ui._clearLiveCookIntervals();

      var panel = document.createElement('div');
      panel.id = 'live-cook-panel';
      panel.style.cssText = 'background:rgba(76,175,130,0.06);border:1px solid rgba(76,175,130,0.3);border-radius:10px;padding:12px 14px;margin-bottom:14px;';
      panel.innerHTML = '<div style="font-size:12px;color:var(--muted);">Loading live cook session...</div>';
      pageAdvisor.insertBefore(panel, chatWrap);

      RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids,schedule,agenda_id&id=eq.' + plannedCookId)
        .then(function(rows) {
          var pc = rows && rows[0];
          if (!pc || !pc.schedule || !pc.schedule.blocks) {
            panel.innerHTML = '';
            panel.appendChild(self.ui._errNode('Could not load this cook session\'s schedule'));
            return;
          }
          if (!pc.agenda_id) { self.ui._renderLiveCookPanel(panel, pc, null); return; }
          RPGACE.sb.select('rpgace_agendas', 'select=started_at&id=eq.' + pc.agenda_id)
            .then(function(aRows) {
              var startedAt = (aRows && aRows[0] && aRows[0].started_at) || null;
              self.ui._renderLiveCookPanel(panel, pc, startedAt);
            })
            .catch(function() { self.ui._renderLiveCookPanel(panel, pc, null); });
        })
        .catch(function(e) {
          panel.innerHTML = '';
          panel.appendChild(self.ui._errNode('Could not load cook session: ' + (e.message || 'unknown error')));
        });
    },

    _renderLiveCookPanel: function(panel, pc, startedAt) {
      var self = RPGACE.modules.cookingOracle;
      panel.innerHTML = '';

      var header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;';
      var titleBox = document.createElement('div');
      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-family:\'Cinzel\',serif;font-size:13px;color:var(--green);letter-spacing:1px;';
      eyebrow.textContent = '🍳 LIVE COOK SESSION';
      titleBox.appendChild(eyebrow);
      var elapsedLine = document.createElement('div');
      elapsedLine.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;';
      titleBox.appendChild(elapsedLine);
      header.appendChild(titleBox);
      var closeBtn = self.ui._mkBtn('✕ Close', 'plainLink', { extra: 'width:auto;padding:8px 12px;' });
      closeBtn.onclick = function() {
        self.ui._clearLiveCookIntervals();
        var p = document.getElementById('live-cook-panel');
        if (p) p.remove();
      };
      // Oct 1 2026 (real Alex hand-test: "no way of confirming cook
      // finished without agenda") - finish right where the cooking
      // happens, via the shared logic._finishCook (rule 8).
      var finishBtn = self.ui._mkBtn('✅ Finished', 'inline', { color: 'var(--green)' });
      finishBtn.onclick = function() {
        finishBtn.disabled = true;
        finishBtn.textContent = '⏳';
        self.logic._finishCook(pc.id, pc.agenda_id, pc.recipe_ids, function(err) {
          if (err) {
            finishBtn.disabled = false;
            finishBtn.textContent = '✅ Finished';
            RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 4000);
            return;
          }
          self.ui._clearLiveCookIntervals();
          var p = document.getElementById('live-cook-panel');
          if (p) p.remove();
          RPGACE.utils.toast('✅ Cook finished — rate it in your Journal', '#4caf82', 3200);
        });
      };
      // Oct 11 2026 — the same full-screen Cook Mode, stepping through the
      // session's merged schedule (both recipes interleaved).
      var cookModeBtn = self.ui._mkBtn('▶ Cook Mode', 'inline', { color: 'var(--green)' });
      cookModeBtn.onclick = function() {
        self.ui._openCookMode(self.logic._cookModeSteps(pc.schedule.blocks, 1), {
          title: 'Cook session', key: 'planned_' + pc.id,
          onDone: function(info) { self.ui._askCookOutcome({ pc: pc, title: 'Cook session' }, info); }, // CM-1
        });
      };
      var headerBtns = document.createElement('div');
      headerBtns.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;';
      headerBtns.appendChild(cookModeBtn);
      headerBtns.appendChild(finishBtn);
      headerBtns.appendChild(closeBtn);
      header.appendChild(headerBtns);
      panel.appendChild(header);

      if (startedAt) {
        var startMs = new Date(startedAt).getTime();
        var tick = function() {
          var mins = Math.max(0, Math.round((Date.now() - startMs) / 60000));
          elapsedLine.textContent = 'Started ' + self.logic._fmtMin(mins) + ' ago';
        };
        tick();
        var elapsedInterval = setInterval(tick, 30000);
        self._liveCookIntervals.push(elapsedInterval);
      } else {
        elapsedLine.textContent = 'Not marked as started yet';
      }

      var list = document.createElement('div');
      pc.schedule.blocks.slice().sort(function(a, b) { return a.start - b.start; }).forEach(function(b) {
        var meta = self.ui.STEP_META[b.type] || { color: 'var(--muted)', label: b.type || 'Step' };
        var row = document.createElement('div');
        row.style.cssText = 'border-left:3px solid ' + meta.color + ';background:rgba(255,255,255,0.03);border-radius:0 6px 6px 0;padding:7px 12px;margin-bottom:6px;font-size:12px;';
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:' + meta.color + ';font-weight:700;font-size:13px;text-transform:uppercase;';
        var left = document.createElement('span');
        left.textContent = self.logic._fmtMin(b.start) + '–' + self.logic._fmtMin(b.end) + ' · ' + meta.label;
        var right = document.createElement('span');
        right.textContent = b.recipeTitle;
        top.appendChild(left);
        top.appendChild(right);
        row.appendChild(top);
        var desc = document.createElement('div');
        desc.style.cssText = 'color:var(--text);margin-top:2px;';
        desc.textContent = b.description || '';
        row.appendChild(desc);
        var blockIng = self.ui._renderStepIngredients({ ingredients_used: b.ingredientsUsed });
        if (blockIng) row.appendChild(blockIng);
        // Real, shared timer/reminder controls (rule 8) — a schedule
        // block only carries a computed [start,end) window, not the
        // original step's separate active/passive split, so a single
        // honest countdown covering the block's real duration is passed
        // in as active_duration_min — never a guessed split.
        var bt = self.logic._blockTimes(b);
        row.appendChild(self.ui._mkStepTimerControls({
          description: b.description,
          active_duration_min: bt.active,
          passive_duration_min: bt.passive,
        }, self._liveCookIntervals));
        list.appendChild(row);
      });
      panel.appendChild(list);
    },

    // H18 (Sep 16 2026) — the ONE shared render for a single ingredient's
    // 5-color status row (rule 8), used by the recipe card, the schedule
    // preview, and the shopping list — never 3 hand-rolled copies of the
    // same colored-chip markup. `text` is the full line to show (already
    // formatted with amount/unit by the caller, since each of the 3 real
    // consumers phrases it slightly differently — "have 2 eggs" vs "need to
    // buy 200g flour" — the color/border/background treatment is what's
    // actually shared, not the wording).
    _renderIngredientStatusRow: function(text, status) {
      var self = RPGACE.modules.cookingOracle;
      var meta = self.INGREDIENT_STATUS_META[status] || self.INGREDIENT_STATUS_META.red;
      var row = document.createElement('div');
      row.style.cssText = 'font-size:12px;color:' + meta.color + ';border-left:3px solid ' + meta.color + ';background:' + meta.bg + ';border-radius:0 5px 5px 0;padding:4px 10px;margin-bottom:3px;';
      row.textContent = meta.icon + ' ' + text;
      row.title = meta.label;
      return row;
    },

    // H24 (Sep 17 2026, 2nd pass, real Alex ask: "when orange
    // substitution or blue is presented, give me an option to confirm so
    // it can turn green") — a real, separate function rather than
    // retrofitting _renderIngredientStatusRow's own widely-shared
    // contract (rule 4 — don't touch a working call site's contract to
    // serve a new, unrelated caller); every non-orange status still
    // renders identically to the plain function above. Only fires the
    // real confirm button when a real substitute name is actually known
    // — blue is deliberately excluded, it has no single named candidate
    // to confirm against.
    // H24 (Sep 17 2026, 3rd pass) — real, superseding correction, Alex's
    // own direct words: "maybe not turn subs into green, but rather a
    // tick on the left to show ingredient or alternative is agreed upon,
    // but keeping colours as is to highlight whats subbed, how subbed,
    // whats true green, so future sessions now what subs can be used,
    // and what in the recipe is authentic." The row's real color/status
    // NEVER changes on confirm now — a confirmed substitution stays
    // visibly orange, permanently, because it IS a substitution, not a
    // real in-stock match; only a genuine 5-color reclassification
    // (buying/restocking the real ingredient) can ever turn it green.
    // A real ✓ tick prefix is the one thing that changes, both on a
    // fresh confirm click AND on every future load of an already-
    // confirmed pairing (the new `alreadyConfirmed` param, sourced from
    // logic._computeIngredientUsage's own real ingredient_substitution_
    // confirmations lookup) — this is the real, persistent, cross-
    // session record Alex asked for: "future sessions now what subs can
    // be used."
    // H24 (Sep 17 2026, 5th pass) — real maroon branch, `derivableFrom`
    // (the real {deriv,srcHave} logic._computeIngredientUsage already
    // resolved) and `neededAmount` (the real derived-ingredient amount
    // this row needs) are the 2 new, optional trailing params — every
    // existing orange/other-status caller that omits them is completely
    // unaffected.
    // H24 (6th pass) — a real, optional trailing `pinkOthers` param: an
    // array of pre-formatted real strings describing what each OTHER
    // recipe sharing this ingredient gets instead, once Alex has already
    // resolved a real pink choice in this ingredient's favor — every
    // existing caller that omits it is completely unaffected.
    // H24 (Sep 17 2026, 7th pass) — 2 new, optional trailing params:
    // `blueName` (blue's own real captured aisle-alternative, resolved
    // by logic._computeIngredientUsage the same way orange's subName
    // already is) and `onMerged` (a real reopen callback — see below;
    // every existing caller that omits either is completely unaffected).
    // H24 (Sep 17 2026, 8th pass) — 4 more real, optional trailing params,
    // every existing caller that omits them completely unaffected:
    // `stockNames` (real Alex ask: "instead of asking for something as
    // same term, i have an option of agreeing or selecting from stock to
    // determine" — the full real distinct-stock-name list, so "same
    // item" isn't limited to the system's own single guess); `subRatio`/
    // `subRatioNote` (real Alex ask: "i need these conversion ratios to
    // always be looked up to make educated subsitutions" — a real,
    // curated potency ratio for the orange confirm button, never
    // invented, null when none is curated for this pair); `neededUnit`
    // (needed alongside subRatio to show a real adjusted quantity in the
    // recipe's own unit, not just a bare multiplier).
    _renderSubstitutableStatusRow: function(text, status, ingredientId, subName, ingredientName, alreadyConfirmed, derivableFrom, neededAmount, pinkOthers, blueName, onMerged, stockNames, subRatio, subRatioNote, neededUnit) {
      var self = RPGACE.modules.cookingOracle;
      var meta = self.INGREDIENT_STATUS_META[status] || self.INGREDIENT_STATUS_META.red;
      var row = document.createElement('div');
      row.style.cssText = 'font-size:12px;color:' + meta.color + ';border-left:3px solid ' + meta.color + ';background:' + meta.bg + ';border-radius:0 5px 5px 0;padding:4px 10px;margin-bottom:3px;';
      row.title = meta.label;
      var textEl = document.createElement('div');
      var renderText = function(confirmed) {
        textEl.textContent = (confirmed ? '✓ ' : '') + meta.icon + ' ' + text;
      };
      renderText(!!alreadyConfirmed);
      row.appendChild(textEl);
      if (pinkOthers && pinkOthers.length) {
        pinkOthers.forEach(function(line) {
          var otherNote = document.createElement('div');
          otherNote.style.cssText = 'font-size:12px;color:#D46FA3;margin-top:3px;';
          otherNote.textContent = '🩷 ' + line;
          row.appendChild(otherNote);
        });
      }
      var noteEl = document.createElement('div');
      noteEl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;';
      if (status === 'orange' && ingredientId && subName) {
        // H24 (8th pass) — a real, curated potency ratio (never a guess)
        // turns "use X instead" into "use ~N unit of X instead," plus the
        // real reason, so a genuinely stronger/weaker substitute doesn't
        // silently over/under-dose the dish at a flat 1:1 swap.
        var adjustedQtyText = '';
        if (typeof subRatio === 'number' && typeof neededAmount === 'number' && neededAmount > 0) {
          var adjustedAmt = Math.round(neededAmount * subRatio * 100) / 100;
          adjustedQtyText = '~' + adjustedAmt + ' ' + (neededUnit || '') + ' ';
        }
        var subLabel = adjustedQtyText ? (adjustedQtyText + subName) : subName;
        if (alreadyConfirmed) {
          noteEl.textContent = '✓ Agreed substitution — using ' + subLabel;
          row.appendChild(noteEl);
          if (subRatioNote) {
            var ratioNoteEl = document.createElement('div');
            ratioNoteEl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;font-style:italic;';
            ratioNoteEl.textContent = subRatioNote;
            row.appendChild(ratioNoteEl);
          }
        } else {
          var btn = self.ui._mkBtn('✓ Use ' + subLabel + ' instead', 'small', { extra: 'margin-top:5px;', color: 'var(--green)', borderColor: 'rgba(76,175,130,.35)' });
          btn.onclick = function() {
            btn.disabled = true;
            btn.textContent = '⏳ Saving...';
            self.logic._confirmSubstitution(ingredientId, subName, function(err) {
              if (err) {
                btn.disabled = false;
                btn.textContent = '✓ Use ' + subLabel + ' instead';
                RPGACE.utils.toast('⚠️ Could not save: ' + err, '#CC4A4A', 3200);
                return;
              }
              renderText(true);
              noteEl.textContent = '✓ Agreed substitution — using ' + subLabel;
              row.appendChild(noteEl);
              btn.remove();
              if (subRatioNote) {
                var ratioNoteEl2 = document.createElement('div');
                ratioNoteEl2.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;font-style:italic;';
                ratioNoteEl2.textContent = subRatioNote;
                row.appendChild(ratioNoteEl2);
              }
              RPGACE.utils.toast('✅ Agreed — ' + (ingredientName || 'this') + ' will show a tick for this substitution from now on', '#4caf82', 3200);
            });
          };
          if (subRatioNote) {
            var ratioHintEl = document.createElement('div');
            ratioHintEl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;font-style:italic;';
            ratioHintEl.textContent = subRatioNote;
            row.appendChild(ratioHintEl);
          }
          row.appendChild(btn);
        }
      }
      // H24 (Sep 17 2026, 7th pass, real Alex ask: "orange should have an
      // option where i declare we talk about same item just 2
      // derivations of names" — AskUserQuestion-confirmed: orange AND
      // blue rows both, 2-click arm/confirm) — a genuinely DIFFERENT real
      // claim from the orange confirm button above ("use this instead
      // this time" vs. "these are literally the same real ingredient"),
      // so it renders alongside it, never replacing it. A real, permanent
      // merge with no Supabase backup — logic._declareSameItem.
      var altName = (status === 'orange') ? subName : (status === 'blue') ? blueName : null;
      if (ingredientId && altName) {
        var sameBtn = self.ui._mkArmConfirmBtn(
          '🔗 Same item as "' + altName + '"?', '🔗 Confirm — merge for good', 'small', '#C9A84C',
          function(doneCb) {
            self.logic._declareSameItem(ingredientId, altName, function(err) {
              if (err) {
                RPGACE.utils.toast('⚠️ Could not merge: ' + err, '#CC4A4A', 3200);
                doneCb(err);
                return;
              }
              RPGACE.utils.toast('✅ Merged — "' + altName + '" now always means ' + (ingredientName || 'this ingredient'), '#4caf82', 3600);
              doneCb(null);
              if (onMerged) onMerged();
            });
          },
          { extra: 'margin-top:5px;', color: 'var(--gold)', borderColor: 'rgba(201,168,76,.35)' }
        );
        row.appendChild(sameBtn);
      }
      // H24 (Sep 17 2026, 8th pass, real Alex ask: "how about when all
      // subsitutions and merge terms happen, instead of asking for
      // something as same term, i have an option of agreeing or
      // selecting from stock to determine") — the single-guess button
      // above only ever offers the ONE candidate the system itself
      // found (sometimes wrong — his own real doubanjiang/white-pepper
      // example). This is a real, independent picker over every actual
      // distinct real stock name, so Alex can correct a wrong guess
      // himself instead of being stuck with it. Same real
      // logic._declareSameItem merge underneath — this is a different
      // way to SUPPLY the alt name, never a 2nd merge mechanism (rule 8).
      if ((status === 'orange' || status === 'blue') && ingredientId && stockNames && stockNames.length) {
        var pickWrap = document.createElement('div');
        pickWrap.style.cssText = 'margin-top:5px;';
        var pickToggle = self.ui._mkBtn('🔍 Pick from stock instead', 'small', { color: 'var(--muted)', borderColor: 'rgba(255,255,255,.15)' });
        var pickBody = document.createElement('div');
        pickBody.style.cssText = 'display:none;margin-top:5px;gap:5px;flex-wrap:wrap;align-items:center;';
        var dlId = 'stockpick-' + ingredientId + '-' + Math.random().toString(36).slice(2, 8);
        var pickInput = document.createElement('input');
        pickInput.type = 'text';
        pickInput.placeholder = 'Type or pick a real stock item...';
        pickInput.setAttribute('list', dlId);
        pickInput.style.cssText = 'font-size:13px;padding:3px 6px;border-radius:4px;border:1px solid rgba(255,255,255,.2);background:var(--panel2,#1a1a24);color:var(--text);width:170px;';
        var dl = document.createElement('datalist');
        dl.id = dlId;
        stockNames.forEach(function(n) {
          var opt = document.createElement('option');
          opt.value = n;
          dl.appendChild(opt);
        });
        var pickBtn = self.ui._mkArmConfirmBtn(
          '🔗 Declare same item', '🔗 Confirm — merge for good', 'small', '#C9A84C',
          function(doneCb) {
            var chosen = (pickInput.value || '').trim();
            if (!chosen || stockNames.indexOf(chosen) === -1) {
              RPGACE.utils.toast('⚠️ Pick a real stock item from the list first', '#CC4A4A', 3000);
              doneCb('no-selection');
              return;
            }
            self.logic._declareSameItem(ingredientId, chosen, function(err) {
              if (err) {
                RPGACE.utils.toast('⚠️ Could not merge: ' + err, '#CC4A4A', 3200);
                doneCb(err);
                return;
              }
              RPGACE.utils.toast('✅ Merged — "' + chosen + '" now always means ' + (ingredientName || 'this ingredient'), '#4caf82', 3600);
              doneCb(null);
              if (onMerged) onMerged();
            });
          },
          { color: 'var(--gold)', borderColor: 'rgba(201,168,76,.35)' }
        );
        pickToggle.onclick = function() {
          var showing = pickBody.style.display !== 'none';
          pickBody.style.display = showing ? 'none' : 'flex';
          pickToggle.textContent = showing ? '🔍 Pick from stock instead' : '🔍 Hide stock picker';
        };
        pickBody.appendChild(pickInput);
        pickBody.appendChild(dl);
        pickBody.appendChild(pickBtn);
        pickWrap.appendChild(pickToggle);
        pickWrap.appendChild(pickBody);
        row.appendChild(pickWrap);
      }
      // H24 (Sep 17 2026, 5th pass, real Alex ask + AskUserQuestion-
      // confirmed: derive-and-deduct is a real, committed stock write,
      // not just a preference like a confirmed substitution — this
      // never becomes a "future sessions remember it" tick the way
      // orange's does, it's a one-time real action each time it's
      // genuinely used).
      if (status === 'maroon' && derivableFrom) {
        var deriv = derivableFrom.deriv;
        var srcNeeded = (typeof neededAmount === 'number' && neededAmount > 0) ? (neededAmount / (deriv.yieldRatio || 1)) : null;
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;';
        infoEl.textContent = 'Have ' + derivableFrom.srcHave + ' ' + deriv.sourceName + ' in stock. ' + deriv.instructions;
        row.appendChild(infoEl);
        if (srcNeeded && srcNeeded <= derivableFrom.srcHave) {
          var deriveBtn = self.ui._mkBtn('⚗️ Derive & use ' + srcNeeded + ' ' + deriv.sourceName, 'small', { extra: 'margin-top:5px;', color: meta.color, borderColor: 'rgba(166,49,75,.35)' });
          deriveBtn.onclick = function() {
            deriveBtn.disabled = true;
            deriveBtn.textContent = '⏳ Deriving...';
            self.logic._deriveIngredient(deriv.sourceName, neededAmount, deriv.yieldRatio, function(err, result) {
              if (err) {
                deriveBtn.disabled = false;
                deriveBtn.textContent = '⚗️ Derive & use ' + srcNeeded + ' ' + deriv.sourceName;
                RPGACE.utils.toast('⚠️ Could not derive: ' + err, '#CC4A4A', 3200);
                return;
              }
              var derivedNote = document.createElement('div');
              derivedNote.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;';
              derivedNote.textContent = '✓ Derived — used ' + result.consumed + ' ' + deriv.sourceName + (result.shortfall > 0 ? ' (real shortfall: ' + result.shortfall + ' short of what was needed)' : '');
              row.appendChild(derivedNote);
              deriveBtn.remove();
              RPGACE.utils.toast('✅ Derived ' + (ingredientName || 'this') + ' — your ' + deriv.sourceName + ' stock has been reduced', '#4caf82', 3200);
            });
          };
          row.appendChild(deriveBtn);
        }
      }
      return row;
    },

    // H24 (Sep 17 2026, 6th pass, real Alex ask + AskUserQuestion-
    // confirmed: Alex picks which recipe gets the real shared stock each
    // time, never auto-picked) — a genuinely different real UI shape from
    // every other status row (2+ real choices, not one confirm/derive
    // action), so a dedicated function rather than cramming a 3rd branch
    // into _renderSubstitutableStatusRow (rule 4). `u` is the real pink
    // row from logic._computeIngredientUsage (status:'pink', unresolved —
    // this function is never called for a resolved one, see
    // ui._showSchedulePreview's own branch); `sess` supplies the real
    // recipe titles (u.pinkInfo.perRecipe only carries ids/amounts, never
    // a title, rule 7 — never invented here); `onResolved()` re-renders
    // the whole popup once a real choice is saved (matches this module's
    // own established "just reopen" pattern for a state change big
    // enough to affect the whole usage list, not just one row).
    _renderPinkRow: function(u, sess, onResolved) {
      var self = RPGACE.modules.cookingOracle;
      var meta = self.INGREDIENT_STATUS_META.pink;
      var row = document.createElement('div');
      row.style.cssText = 'font-size:12px;color:' + meta.color + ';border-left:3px solid ' + meta.color + ';background:' + meta.bg + ';border-radius:0 5px 5px 0;padding:4px 10px;margin-bottom:6px;';
      row.title = meta.label;
      var textEl = document.createElement('div');
      var totalNeeded = (u.pinkInfo.perRecipe || []).reduce(function(s, pr) { return s + pr.amount; }, 0);
      textEl.textContent = meta.icon + ' ' + u.name + ' — have ' + u.have + ' ' + (u.unit || '') + ', enough for one recipe but not both (' + totalNeeded + ' ' + (u.unit || '') + ' needed combined). Pick which one gets it:';
      row.appendChild(textEl);
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:6px;';
      (u.pinkInfo.perRecipe || []).forEach(function(pr) {
        var recipe = (sess.recipes || []).filter(function(r) { return r.id === pr.recipeId; })[0];
        var title = recipe ? recipe.title : 'this recipe';
        var btn = self.ui._mkBtn('Give real stock to "' + title + '" (needs ' + pr.amount + ' ' + (u.unit || '') + ')', 'inline', { extra: 'font-size:12px;padding:4px 8px;text-align:left;', color: meta.color, borderColor: 'rgba(212,111,163,.35)' });
        btn.onclick = function() {
          btn.disabled = true;
          btn.textContent = '⏳ Saving...';
          self.logic._setPinkAllocation(sess.plannedCookId, u.pinkInfo.allocKey, pr.recipeId, function(err) {
            if (err) {
              btn.disabled = false;
              btn.textContent = 'Give real stock to "' + title + '" (needs ' + pr.amount + ' ' + (u.unit || '') + ')';
              RPGACE.utils.toast('⚠️ Could not save: ' + err, '#CC4A4A', 3200);
              return;
            }
            RPGACE.utils.toast('✅ "' + title + '" gets the real ' + u.name + ' — the other recipe will show its own closest alternative', '#4caf82', 3200);
            if (onResolved) onResolved();
          });
        };
        btnRow.appendChild(btn);
      });
      row.appendChild(btnRow);
      return row;
    },

    // Sep 14 2026 (real "close the loop" build, Alex's own exact words:
    // "let me confirm changes first, but make sure only changes are
    // shown, not the whole thing, so I can make a quick informed
    // decision") - a real, DISTINCT confirm popup from every other
    // dashDeck._popup() confirm in this app: renders ONLY the real diff
    // logic._diffRecipe computed (added/removed/changed), never the full
    // recipe, matching the ask literally. Accept mutates the live open
    // card in place via self._applyRecipeUpdate; Deny closes with zero
    // change - same real two-button confirm/deny shape as oracleControl's
    // own _showActionConfirm/_showSuggestConfirm (rule 8).
    _showRecipeUpdateConfirm: function(diff, updated) {
      var self = RPGACE.modules.cookingOracle;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) { console.warn('[cookingOracle] dashDeck._popup unavailable, cannot show recipe update confirm'); return; }
      var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };
      var fmtAmt = function(x) { return (x && (x.amount != null || x.unit)) ? ((x.amount != null ? x.amount : '') + ' ' + (x.unit || '')).trim() : '—'; };
      var fmtDur = function(x) {
        var parts = [];
        if (x.active_duration_min) parts.push(x.active_duration_min + 'm active');
        if (x.passive_duration_min) parts.push(x.passive_duration_min + 'm passive');
        return parts.length ? parts.join(' + ') : '—';
      };

      var rows = [];
      if (diff.titleChanged) {
        rows.push('<div style="margin-bottom:10px;"><b style="color:var(--gold);">Title:</b> ' + esc(diff.titleChanged.from) + ' → ' + esc(diff.titleChanged.to) + '</div>');
      }
      if (diff.ingredients.added.length || diff.ingredients.removed.length || diff.ingredients.changed.length) {
        var ingLines = [];
        diff.ingredients.added.forEach(function(i) { ingLines.push('<div style="color:#4caf82;">+ ' + esc(i.name) + ' (' + esc(fmtAmt(i)) + ')</div>'); });
        diff.ingredients.removed.forEach(function(i) { ingLines.push('<div style="color:#CC4A4A;">− ' + esc(i.name) + '</div>'); });
        diff.ingredients.changed.forEach(function(c) { ingLines.push('<div style="color:var(--text);">' + esc(c.name) + ': ' + esc(fmtAmt(c.from)) + ' → ' + esc(fmtAmt(c.to)) + '</div>'); });
        rows.push('<div style="margin-bottom:10px;"><b style="color:var(--gold);">Ingredients:</b>' + ingLines.join('') + '</div>');
      }
      if (diff.steps.added.length || diff.steps.removed.length || diff.steps.changed.length) {
        var stepLines = [];
        diff.steps.added.forEach(function(s) { stepLines.push('<div style="color:#4caf82;">+ [' + esc(s.type || '') + '] ' + esc(s.description) + '</div>'); });
        diff.steps.removed.forEach(function(s) { stepLines.push('<div style="color:#CC4A4A;">− [' + esc(s.type || '') + '] ' + esc(s.description) + '</div>'); });
        diff.steps.changed.forEach(function(c) {
          stepLines.push('<div style="color:var(--text);">' + esc(c.description) + ': [' + esc(c.from.type || '') + '] ' + esc(fmtDur(c.from)) + ' → [' + esc(c.to.type || '') + '] ' + esc(fmtDur(c.to)) + '</div>');
        });
        rows.push('<div style="margin-bottom:10px;"><b style="color:var(--gold);">Method:</b>' + stepLines.join('') + '</div>');
      }

      var pop = dd._popup({
        eyebrow: '🍳 Oracle proposes a change',
        title: 'Apply this to the recipe?',
        accent: 'rgba(76,175,130,0.9)',
        borderColor: 'rgba(76,175,130,0.4)',
        width: '440px',
        noDefaultClose: true,
      });
      pop.box.innerHTML =
        '<div style="font-size:12.5px;">' + rows.join('') + '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">' +
          '<button id="cook-upd-deny" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(226,226,236,0.2);background:none;color:rgba(226,226,236,0.7);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Deny</button>' +
          '<button id="cook-upd-accept" style="padding:8px 16px;border-radius:8px;border:none;background:#4caf82;color:#fff;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Apply changes</button>' +
        '</div>';
      pop.box.querySelector('#cook-upd-deny').onclick = function() {
        pop.close();
        RPGACE.utils.toast('Changes not applied', '#E2A83D', 2200);
      };
      pop.box.querySelector('#cook-upd-accept').onclick = function() {
        pop.close();
        // The card may have been closed between the reply landing and
        // Alex clicking Accept - fail loud rather than silently no-op
        // (rule 7), since a click on a real button that visibly did
        // nothing is worse than an honest toast explaining why.
        if (!self._applyRecipeUpdate) { RPGACE.utils.toast('⚠️ The recipe card is no longer open — reopen it and ask again', '#E2A83D', 3500); return; }
        self._applyRecipeUpdate(updated);
        RPGACE.utils.toast('✅ Recipe updated', '#4caf82', 2200);
      };
    },

    // H18 (Sep 16 2026) — real, OPTIONAL 3rd param, `existingRecipeId`. The
    // new "What can I cook right now?" finder (ui._showPantryMatchFinder)
    // is the first real caller that reopens an ALREADY-SAVED recipe rather
    // than showing a fresh generation — without this, savedRecipeId would
    // start null and a Save click on a reopened recipe would silently
    // insert a genuine duplicate row. Every EXISTING caller passes only 2
    // args, so existingRecipeId is simply undefined there — unaffected.
    _showRecipeCard: function(recipe, rawText, existingRecipeId) {
      var self = RPGACE.modules.cookingOracle;
      self._generatedRecipe = recipe;
      // Sep 13 2026 (H10, real Alex ask - "no option to add or suggest
      // ingredients... also don't see the option to add it to current
      // planned cook") - tracks the real recipes.id once a save has
      // actually inserted a row, so a later click of either button never
      // inserts a 2nd duplicate row.
      var savedRecipeId = existingRecipeId || null;
      // Real, superseding fix, same day (Alex hand-tested and hit both
      // buttons ending up saved: "always do dedup") - a real concurrency
      // gap in the first version let clicking Save then immediately
      // clicking Add-to-Cook-Session (or vice versa) fire a 2ND concurrent
      // _save call before the first one's promise had resolved and set
      // savedRecipeId, since each button only checked the flag, never a
      // real in-flight guard. `ensureRecipeSaved` below is the ONE real
      // path both buttons now go through (rule 8) - already-saved short-
      // circuits immediately, an in-flight save queues the caller instead
      // of starting a 2nd one, and only the very first real call actually
      // touches Supabase.
      var _savePending = null; // array of queued callbacks while a real save is in flight, else null
      var ensureRecipeSaved = function(cb) {
        if (savedRecipeId) { cb(null, savedRecipeId); return; }
        if (_savePending) { _savePending.push(cb); return; }
        _savePending = [cb];
        // withJournal:false here - a bare "ensure the recipe row exists"
        // call (used by Add to Cook Session, and by Save to Journal when
        // Add to Cook Session got there first) never implies a journal
        // entry on its own; ui._saveBtnClick below adds the journal row
        // separately, only when Save to Journal is the one actually
        // clicked (Sep 13 2026, real Alex ask: "save to cook just saves to
        // cook, but not to journal, so I can rate dishes and save liked
        // ones").
        self.logic._save(recipe, rawText, false, function(err, recipeId) {
          var queued = _savePending;
          _savePending = null;
          if (!err) savedRecipeId = recipeId;
          queued.forEach(function(fn) { fn(err, recipeId); });
        });
      };
      // Sep 14 2026 - real, live "is this card still actually open" flag
      // for oracleControl's floating-overlay context provider (see
      // cookingOracle.init's own comment) - a plain _generatedRecipe
      // reference alone would silently stay "current" forever after the
      // card closes, wrongly grounding a later, unrelated overlay message
      // in a stale recipe. Set true here, cleared in onClose below -
      // covers every real close path (Save/Add-to-Session's own pop.close()
      // calls AND the popup's own default ✕ close button, since onClose
      // fires from dashDeck._popup()'s own close() either way).
      self._recipeCardOpen = true;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '640px', scroll: true, eyebrow: '🍳 COOKING', title: recipe.title || 'Recipe',
        borderColor: 'rgba(76,175,130,0.3)',
        onClose: function() { self._recipeCardOpen = false; self._applyRecipeUpdate = null; },
      });
      var box = pop.box;

      // Sep 16 2026 - real Alex ask: "recipes i choose should have a photo
      // of the internet presented so i can see what im making." Real
      // /interrogation confirmed a real image-search API first (server-
      // side, key never shipped to the client), Wikipedia's free REST
      // summary API as a fallback. Honest empty state when neither finds
      // a real match - no broken-image icon, no placeholder pretending to
      // be a real photo (rule 7).
      var photoBox = document.createElement('div');
      photoBox.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;margin-bottom:14px;background:rgba(255,255,255,0.03);display:none;';
      var photoImg = document.createElement('img');
      photoImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      photoImg.alt = recipe.title || 'Recipe photo';
      photoBox.appendChild(photoImg);
      box.appendChild(photoBox);
      if (recipe.title) {
        self.logic._fetchRecipePhoto(recipe.title, function(url) {
          if (!url) return;
          photoImg.onload = function() { photoBox.style.display = 'block'; };
          photoImg.onerror = function() { photoBox.style.display = 'none'; };
          photoImg.src = url;
        });
      }

      // Oct 11 2026 — Cook Mode overview header, Ube Express-style: a spec
      // line, one big Start Cooking button, a warning for any ingredient no
      // step uses, and (for a saved recipe) proposed one-action steps
      // waiting for Alex's Accept/Deny. renderSpec() re-runs whenever the
      // steps change (renderSteps calls it).
      // XP-3 (Oct 13 2026) — cuisine tag. Oracle tags new recipes (the
      // RECIPE_JSON shape asks for it); Alex can change it here. It feeds
      // the Head Chef gate (3 cuisines) via xp_check_unlocks in the DB.
      var cuisineRow = document.createElement('div');
      cuisineRow.className = 'co-cuisine-row';
      cuisineRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);margin-bottom:8px;';
      box.appendChild(cuisineRow);
      var renderCuisine = function() {
        cuisineRow.innerHTML = '';
        var lbl = document.createElement('span');
        lbl.className = 'co-cuisine';
        lbl.textContent = '🌍 Cuisine: ' + (recipe.cuisine || 'not tagged');
        var ed = self.ui._mkBtn('✏️ Change', 'inline');
        ed.className += ' co-cuisine-edit';
        ed.onclick = function() {
          var v = window.prompt('Cuisine for this recipe (e.g. Chinese, Korean, British):', recipe.cuisine || '');
          if (v == null) return;
          v = String(v).trim().slice(0, 40) || null;
          if (!savedRecipeId) { recipe.cuisine = v; renderCuisine(); return; }
          RPGACE.sb.secureWrite('recipes', 'update', { cuisine: v }, 'id=eq.' + savedRecipeId)
            .then(function() { RPGACE.cache.clear('recipes'); recipe.cuisine = v; renderCuisine(); RPGACE.utils.toast('🌍 Cuisine saved', '#4CAF82'); })
            .catch(function(e) { RPGACE.utils.toast('Cuisine not saved: ' + (e.message || e), '#CC4A4A', 4000, 'cookingOracle'); });
        };
        cuisineRow.appendChild(lbl); cuisineRow.appendChild(ed);
      };
      renderCuisine();
      if (savedRecipeId && recipe.cuisine === undefined) {
        RPGACE.sb.select('recipes', 'select=cuisine&id=eq.' + savedRecipeId + '&limit=1')
          .then(function(rows) { recipe.cuisine = (rows && rows[0] && rows[0].cuisine) || null; renderCuisine(); })
          .catch(function() {});
      }

      var specBox = document.createElement('div');
      specBox.style.cssText = 'margin-bottom:14px;';
      box.appendChild(specBox);
      var renderSpec = function() {
        specBox.innerHTML = '';
        var st = recipe.steps || [];
        var hands = st.reduce(function(m, x) { return m + (x.active_duration_min || 0); }, 0);
        var line = document.createElement('div');
        line.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:10px;';
        line.textContent = st.length + ' step' + (st.length === 1 ? '' : 's') + (hands ? ' · ~' + hands + ' min hands-on' : '') + ' · serves ' + (scaleInput ? (scaleInput.value || recipe.servings_base || 4) : (recipe.servings_base || 4));
        specBox.appendChild(line);
        var go = self.ui._mkBtn('▶ Start Cooking', 'hero');
        go.disabled = !st.length;
        go.onclick = function() {
          var base = recipe.servings_base || 4;
          var want = parseFloat(scaleInput && scaleInput.value) || base;
          self.logic._noteGrams(recipe.ingredients);
          self.ui._openCookMode(self.logic._cookModeSteps(st, want / base, recipe.title), {
            title: recipe.title, key: savedRecipeId ? 'recipe_' + savedRecipeId : null,
            // CR-6: a saved recipe's last step offers the stock update.
            onDone: savedRecipeId ? function(info) { self.ui._askCookOutcome({ recipeIds: [savedRecipeId], title: recipe.title, scale: want / base }, info); } : null,
          });
        };
        specBox.appendChild(go);
        var gaps = self.logic._stepCoverageGaps(recipe);
        if (gaps.length) {
          var warn = document.createElement('div');
          warn.style.cssText = 'font-size:13px;color:#E2A83D;margin-top:8px;';
          warn.textContent = '⚠️ Not used in any step, so Cook Mode never shows it: ' + gaps.join(', ');
          specBox.appendChild(warn);
        }
        if (savedRecipeId && Array.isArray(recipe.steps_proposed) && recipe.steps_proposed.length) {
          var ban = document.createElement('div');
          ban.style.cssText = 'margin-top:10px;padding:10px 12px;border:1px solid rgba(76,175,130,0.4);border-radius:8px;background:rgba(76,175,130,0.08);font-size:13px;';
          ban.textContent = '📋 New Cook Mode steps ready: ' + recipe.steps_proposed.length + ' one-action steps (now ' + st.length + '). ';
          var rv = self.ui._mkBtn('Review', 'inline', { color: 'var(--green)' });
          rv.onclick = function() { self.ui._reviewProposedSteps(savedRecipeId, recipe, function() { renderSteps(); }); };
          ban.appendChild(rv);
          specBox.appendChild(ban);
        }
      };

      // Real serving scaler - recomputes every displayed ingredient amount
      // live against recipe.servings_base, never mutates the stored recipe
      // object (Save always writes the ORIGINAL base-serving amounts;
      // scaling is a display-only convenience, matching the original
      // handover's own "scalable servings" ask literally).
      var scaleRow = document.createElement('div');
      scaleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:12px;color:var(--muted);';
      var scaleLabel = document.createElement('span');
      scaleLabel.textContent = 'Servings:';
      var scaleInput = document.createElement('input');
      scaleInput.type = 'number';
      scaleInput.min = '1';
      scaleInput.value = String(recipe.servings_base || 4);
      scaleInput.style.cssText = 'width:56px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:5px 8px;';
      scaleRow.appendChild(scaleLabel);
      scaleRow.appendChild(scaleInput);
      box.appendChild(scaleRow);

      var ingHeading = document.createElement('div');
      ingHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      ingHeading.textContent = 'Ingredients';
      box.appendChild(ingHeading);

      var ingList = document.createElement('div');
      ingList.style.cssText = 'margin-bottom:18px;';
      box.appendChild(ingList);

      // H18 (Sep 16 2026, real Alex ask — see logic._classifyIngredientStatus
      // for the full 5-color rules + /interrogation record) — a real,
      // NAME-keyed pantry snapshot (this recipe has no real ingredient_id
      // yet if it hasn't been saved — logic._save only resolves/creates
      // real ingredient rows on Save, see this function's own top comment).
      // Loaded once when the card opens; renderIngredients re-runs once it
      // lands, same "render once now, re-render richer once real data
      // arrives" pattern the photo fetch above already uses.
      var pantrySnapshot = null;
      // H24 (Sep 17 2026, 6th pass) — real ratings snapshot loaded
      // alongside the pantry (rule 8, same one-load-per-open shape) so a
      // substitute shown here is already ranked by Alex's own past
      // ratings, and the new rating buttons below have something real to
      // write against.
      var subRatings = {};
      self.logic._loadPantrySummed(function(snapshot) {
        pantrySnapshot = snapshot;
        self.logic._loadSubstitutionRatings(function(ratings) {
          subRatings = ratings;
          renderIngredients();
        });
      });

      var renderIngredients = function() {
        self.logic._noteGrams(recipe.ingredients);
        var base = recipe.servings_base || 1;
        var target = parseFloat(scaleInput.value) || base;
        var factor = target / base;
        ingList.innerHTML = '';
        (recipe.ingredients || []).forEach(function(ing) {
          var wrap = document.createElement('div');
          wrap.style.cssText = 'padding:4px 0 4px 8px;border-bottom:1px solid rgba(255,255,255,0.05);';
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;font-size:13px;color:var(--text);';
          var amt = (typeof ing.amount === 'number') ? (Math.round(ing.amount * factor * 100) / 100) : ing.amount;
          var left = document.createElement('span');
          left.textContent = ing.name || '';
          var right = document.createElement('span');
          right.style.color = 'var(--muted)';
          right.textContent = self.logic._fmtMeasurement(amt, ing.unit, { name: ing.name, grams: (typeof ing.grams_estimate === 'number' && ing.grams_estimate > 0) ? ing.grams_estimate * factor : null });
          row.appendChild(left);
          row.appendChild(right);
          wrap.appendChild(row);

          if (pantrySnapshot && ing.name) {
            var norm = String(ing.name).trim().toLowerCase();
            var slots = pantrySnapshot.byName[norm] || [];
            // H19 (Sep 17 2026, real Alex ask: "use cups as much as
            // possible (liquid and spices) and weight when makes sense...
            // in pantry ill be using mostly weight and ml and count
            // rather than cups") — real bridging via
            // logic._resolveHaveAmount (rule 8, same function every other
            // real 5-color match now uses) instead of an exact-unit-only
            // lookup. The gram-per-unit ratio must come from this
            // ingredient's own BASE amount/grams_estimate (scale-
            // independent), never the currently-displayed SCALED amt —
            // "have" itself doesn't change just because Alex asked for
            // more servings.
            var have = self.logic._resolveHaveAmount({ neededUnit: ing.unit, neededAmount: ing.amount, gramsEstimate: ing.grams_estimate, buckets: slots });
            var status = self.logic._classifyIngredientStatus({ name: ing.name, needed: (typeof amt === 'number') ? amt : 0, have: have, aisleIndex: pantrySnapshot.aisleIndex });
            var meta = self.INGREDIENT_STATUS_META[status];
            wrap.style.borderLeft = '3px solid ' + meta.color;
            wrap.style.background = meta.bg;
            wrap.style.borderRadius = '0 5px 5px 0';
            wrap.title = meta.label;
            left.textContent = meta.icon + ' ' + (ing.name || '');
            // H21 (Sep 17 2026) — real substitute name surfaced on an
            // orange row (never invented — logic._findSubstitute only
            // ever returns a real, currently in-stock match).
            if (status === 'orange') {
              var sub = self.logic._findSubstitute(ing.name, pantrySnapshot.aisleIndex, ing.ingredient_id, subRatings);
              if (sub) {
                left.textContent += ' (sub: ' + sub.name + ')';
                // H24 (Sep 17 2026, 6th pass, real Alex ask — Ask
                // UserQuestion-confirmed: "no prompt - you rate whenever
                // from the recipe card") — real rating buttons, only
                // when this ingredient carries a real, checkable
                // ingredient_id (a freshly-generated, not-yet-saved
                // recipe genuinely doesn't have one yet — an honest gap,
                // not fixed blind; reopening a SAVED recipe via
                // logic._loadSavedRecipe always has one, see that
                // function's own H24 6th-pass extension).
                if (ing.ingredient_id) {
                  var rateRow = document.createElement('div');
                  rateRow.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;display:flex;align-items:center;gap:6px;';
                  var rateLabel = document.createElement('span');
                  rateLabel.textContent = 'Rate this substitution:';
                  rateRow.appendChild(rateLabel);
                  var mkRateBtn = function(label, ratingValue) {
                    var rb = self.ui._mkBtn(label, 'small', {});
                    rb.onclick = function() {
                      rb.disabled = true;
                      self.logic._rateSubstitution(ing.ingredient_id, sub.name, ratingValue, function(err) {
                        if (err) { rb.disabled = false; RPGACE.utils.toast('⚠️ Could not save rating: ' + err, '#CC4A4A', 3200); return; }
                        rateRow.textContent = '✓ Rated — thanks, this helps future suggestions';
                        RPGACE.utils.toast('✅ Rating saved', '#4caf82', 1800);
                      });
                    };
                    return rb;
                  };
                  rateRow.appendChild(mkRateBtn('👍 Good sub', 1));
                  rateRow.appendChild(mkRateBtn('👎 Not great', -1));
                  wrap.appendChild(rateRow);
                }
              }
            }
          }

          ingList.appendChild(wrap);
        });
      };
      renderIngredients();
      scaleInput.oninput = function() { renderIngredients(); renderSpec(); };

      // H10 (Sep 13 2026, real Alex ask - "no option to add or suggest
      // ingredients (like meat, love meat, or fish)") - real /interrogation
      // confirmed BOTH a manual add row AND Oracle-suggested additions,
      // explicitly pantry-aware "so waste is reduced" (Alex's own words).
      // A plain manual add - no Oracle call, always available, free.
      var addIngRow = document.createElement('div');
      addIngRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;';
      var addIngName = document.createElement('input');
      addIngName.type = 'text';
      addIngName.placeholder = 'ingredient (e.g. chicken thigh)';
      addIngName.style.cssText = 'flex:2;min-width:140px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      var addIngAmt = document.createElement('input');
      addIngAmt.type = 'number';
      addIngAmt.placeholder = 'amount';
      addIngAmt.style.cssText = 'flex:1;min-width:64px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      var addIngUnit = document.createElement('input');
      addIngUnit.type = 'text';
      addIngUnit.placeholder = 'unit';
      addIngUnit.style.cssText = 'flex:1;min-width:56px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      var addIngBtn = self.ui._mkBtn('+ Add', 'inline');
      addIngRow.appendChild(addIngName);
      addIngRow.appendChild(addIngAmt);
      addIngRow.appendChild(addIngUnit);
      addIngRow.appendChild(addIngBtn);
      box.appendChild(addIngRow);

      // Referenced by both the manual-add button below and each
      // Suggest-additions "+ Add" button (rule 8) - `nutBox`/`nutBtn` are
      // declared further down in this same function; safe to reference
      // here via normal JS var-hoisting since this closure only ever runs
      // on a later user click, after the whole function body has finished
      // executing top to bottom.
      var resetNutritionState = function() {
        nutBox.textContent = 'Ingredients changed — not yet looked up.';
        nutBtn.textContent = '🔎 Estimate Nutrition';
      };

      // Sep 15 2026 (real Alex bug report: "When I added ingredients the
      // method didn't update where needed") — real gap found by direct
      // code read: neither the manual "+ Add" button nor Suggest
      // Additions' own "+ Add" ever touched recipe.steps at all - only
      // ingredients + the nutrition estimate got reset, so the Method
      // below silently went stale the moment a new ingredient landed,
      // with nothing telling Alex it needed a real update. The ONE
      // existing mechanism that actually knows how to update the Method
      // safely is the critique -> RECIPE_UPDATE_JSON -> code-computed
      // diff -> Accept/Deny pipeline already built for the floating 🔮
      // overlay (logic._listenForRecipeUpdates/ui._showRecipeUpdateConfirm)
      // - reused here (rule 8), never a second update mechanism. Deliberately
      // a human-gated BUTTON, not a silent auto-fire Oracle call on every
      // add - same "AI proposes, human confirms" precedent Suggest
      // Additions itself already follows (rule 11 - a real ingredient add
      // is free; an Oracle round-trip on every single one isn't).
      var pendingMethodIngredients = [];
      var methodUpdateBanner = document.createElement('div');
      methodUpdateBanner.id = 'cooking-method-update-banner';
      methodUpdateBanner.style.cssText = 'display:none;margin-bottom:14px;padding:10px 12px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;font-size:12px;color:var(--text);';
      var methodUpdateText = document.createElement('div');
      methodUpdateText.style.cssText = 'margin-bottom:8px;';
      var methodUpdateRow = document.createElement('div');
      methodUpdateRow.style.cssText = 'display:flex;gap:8px;';
      var methodUpdateBtn = self.ui._mkBtn('🔮 Update Method for this', 'inline', { color: '#9B59B6', bg: 'rgba(155,89,182,0.18)', borderColor: 'rgba(155,89,182,0.4)', extra: 'font-weight:700;' });
      var methodUpdateDismiss = self.ui._mkBtn('Not now', 'inline');
      methodUpdateRow.appendChild(methodUpdateBtn);
      methodUpdateRow.appendChild(methodUpdateDismiss);
      methodUpdateBanner.appendChild(methodUpdateText);
      methodUpdateBanner.appendChild(methodUpdateRow);

      var flagMethodNeedsUpdate = function(name) {
        if (name && pendingMethodIngredients.indexOf(name) === -1) pendingMethodIngredients.push(name);
        methodUpdateBanner.style.display = 'block';
        methodUpdateText.textContent = 'You added ' + pendingMethodIngredients.join(', ')
          + ' — the Method below hasn\'t been updated to actually use ' + (pendingMethodIngredients.length === 1 ? 'it' : 'them') + ' yet.';
      };
      methodUpdateDismiss.onclick = function() {
        pendingMethodIngredients = [];
        methodUpdateBanner.style.display = 'none';
      };
      methodUpdateBtn.onclick = function() {
        var names = pendingMethodIngredients.join(', ');
        var oc = RPGACE.modules.oracleControl;
        if (!oc || !oc._sendFromOverlay || !document.getElementById('chat-input')) {
          RPGACE.utils.toast('⚠️ Oracle chat isn\'t ready yet — open the Oracle page once first', '#E2A83D', 3200);
          return;
        }
        // Reuses oracleControl._sendFromOverlay (rule 8), NOT the bare
        // RPGACE.utils.sendToOracle - only _sendFromOverlay prepends the
        // registered "cooking" context (title/ingredients/method + the
        // RECIPE_UPDATE_JSON instructions), confirmed by direct read of
        // both functions; sendToOracle alone would send this request with
        // zero context on which recipe or method it refers to.
        oc._sendFromOverlay('I just added ' + names + ' to the ingredients of this recipe. Update the Method so it actually gets used, in the right place in the sequence, tagged with a real step type — keep everything else the same unless it genuinely must change.');
        RPGACE.utils.toast('🔮 Asking Oracle to update the Method for ' + names + '...', '#9B59B6', 2600);
        pendingMethodIngredients = [];
        methodUpdateBanner.style.display = 'none';
      };

      addIngBtn.onclick = function() {
        var name = addIngName.value.trim();
        if (!name) { RPGACE.utils.toast('⚠️ Enter an ingredient name', '#E2A83D', 2200); return; }
        var amt = parseFloat(addIngAmt.value);
        recipe.ingredients.push({
          name: name,
          amount: isNaN(amt) ? null : amt,
          unit: addIngUnit.value.trim() || null,
          grams_estimate: null, // unknown until a real estimate exists - _ensureNutrition already honestly excludes any ingredient with no grams_estimate from its total, it doesn't guess
        });
        addIngName.value = ''; addIngAmt.value = ''; addIngUnit.value = '';
        renderIngredients();
        resetNutritionState();
        flagMethodNeedsUpdate(name);
      };

      // Oracle-suggested additions, real pantry-aware (H10 2nd half) - a
      // SEPARATE trailer marker (INGREDIENT_SUGGESTIONS_JSON:) consumed via
      // the same shared oracle:response-scanned capture RECIPE_JSON:/
      // DIRECTOR_CHOSEN:/EDL_JSON: already use (rule 8 - multiple distinct
      // trailers on one shared hook is this project's own established
      // precedent, not a new mechanism).
      var suggestBtn = self.ui._mkBtn('💡 Suggest additions (uses your pantry)', 'ghost', { extra: 'margin-bottom:8px;' });
      box.appendChild(suggestBtn);

      var suggestBox = document.createElement('div');
      suggestBox.style.cssText = 'margin-bottom:14px;';
      box.appendChild(suggestBox);

      suggestBtn.onclick = function() {
        suggestBtn.disabled = true;
        suggestBtn.textContent = '⏳ Asking Oracle (checking your pantry)...';
        self.logic._suggestIngredientAdditions(recipe, function(err, suggestions) {
          suggestBtn.disabled = false;
          suggestBtn.textContent = '💡 Suggest additions (uses your pantry)';
          if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3200); return; }
          suggestBox.innerHTML = '';
          if (!suggestions.length) {
            var none = document.createElement('div');
            none.style.cssText = 'font-size:12px;color:var(--muted);';
            none.textContent = 'No real additions suggested this time.';
            suggestBox.appendChild(none);
            return;
          }
          suggestions.forEach(function(s) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;';

            var left = document.createElement('div');
            var nameLine = document.createElement('div');
            var nameSpan = document.createElement('span');
            nameSpan.style.color = 'var(--text)';
            nameSpan.textContent = s.name || '';
            var amtSpan = document.createElement('span');
            amtSpan.style.color = 'var(--muted)';
            amtSpan.textContent = ' — ' + (s.amount != null ? s.amount : '') + ' ' + (s.unit || '');
            nameLine.appendChild(nameSpan);
            nameLine.appendChild(amtSpan);
            if (s.inPantry) {
              var pantryTag = document.createElement('span');
              pantryTag.style.cssText = 'color:var(--green);margin-left:6px;';
              pantryTag.textContent = '📦 in your pantry';
              nameLine.appendChild(pantryTag);
            }
            left.appendChild(nameLine);
            if (s.reason) {
              var reasonLine = document.createElement('div');
              reasonLine.style.cssText = 'color:var(--muted);font-size:13px;margin-top:2px;';
              reasonLine.textContent = s.reason;
              left.appendChild(reasonLine);
            }

            var addOneBtn = self.ui._mkBtn('+ Add', 'inline', { color: 'var(--green)', bg: 'rgba(76,175,130,0.12)', borderColor: 'rgba(76,175,130,0.35)', extra: 'white-space:nowrap;' });
            addOneBtn.onclick = function() {
              recipe.ingredients.push({
                name: s.name, amount: (s.amount != null ? s.amount : null),
                unit: s.unit || null, grams_estimate: (s.grams_estimate != null ? s.grams_estimate : null),
              });
              renderIngredients();
              resetNutritionState();
              flagMethodNeedsUpdate(s.name);
              row.remove();
            };

            row.appendChild(left);
            row.appendChild(addOneBtn);
            suggestBox.appendChild(row);
          });
        });
      };

      // H9 (calories/macros, Sep 13 2026) — real /interrogation confirmed
      // recipe-level only for now (no daily log). Explicit button, not a
      // silent boot-time lookup — resolves/creates each ingredient row,
      // looks up + caches any real Open Food Facts nutrition still missing
      // (never re-queried once cached, Alex's own explicit ask), then
      // computes a best-effort total from whatever's actually known.
      var nutHeading = document.createElement('div');
      nutHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      nutHeading.textContent = 'Nutrition (estimate)';
      box.appendChild(nutHeading);

      var nutBox = document.createElement('div');
      nutBox.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.6;';
      nutBox.textContent = 'Not yet looked up.';
      box.appendChild(nutBox);

      var nutBtn = self.ui._mkBtn('🔎 Estimate Nutrition', 'ghost', { extra: 'margin-bottom:18px;' });
      nutBtn.onclick = function() {
        nutBtn.disabled = true;
        nutBtn.textContent = '⏳ Looking up (CoFID / Open Food Facts)...';
        self.logic._ensureNutrition(recipe.ingredients || [], function(err, totals) {
          nutBtn.disabled = false;
          nutBtn.textContent = '🔎 Re-check Nutrition';
          if (err) { nutBox.textContent = '⚠️ ' + err; return; }
          var perServing = function(v) { var s = parseFloat(scaleInput.value) || recipe.servings_base || 1; return Math.round(v / s); };
          nutBox.innerHTML = '';
          var line1 = document.createElement('div');
          line1.style.cssText = 'color:var(--text);font-weight:700;';
          line1.textContent = Math.round(totals.kcal) + ' kcal total · ' + perServing(totals.kcal) + ' kcal/serving';
          var line2 = document.createElement('div');
          line2.textContent = 'Protein ' + Math.round(totals.protein) + 'g · Carbs ' + Math.round(totals.carbs) + 'g · Fat ' + Math.round(totals.fat) + 'g (total)';
          var line3 = document.createElement('div');
          line3.style.cssText = 'margin-top:4px;font-size:13px;';
          line3.textContent = 'Based on ' + totals.resolvedCount + ' of ' + totals.totalCount + ' ingredients with known nutrition'
            + (totals.resolvedCount < totals.totalCount ? ' — the rest weren\'t matched in CoFID or Open Food Facts' + (totals.lookupFailed ? ' (a lookup also failed for at least one — try again)' : '') + '.' : '.');
          nutBox.appendChild(line1);
          nutBox.appendChild(line2);
          nutBox.appendChild(line3);
        });
      };
      box.appendChild(nutBtn);

      var stepHeading = document.createElement('div');
      stepHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      stepHeading.textContent = 'Method & Timeline';
      box.appendChild(stepHeading);
      box.appendChild(methodUpdateBanner);

      // H24 (Sep 17 2026, 9th pass, real Alex ask — reported 3 times:
      // "nothing is shown for measurements... just show measurement
      // needed for step from recipe displayed") — a real, checkable
      // Supabase read confirmed the exact cause for the recipes he kept
      // hitting this on (Rendang): they genuinely predate H14's per-step
      // ingredients_used tagging (created Sep 16, before that feature
      // shipped later the same day) — recipe.steps literally has no
      // ingredients_used key at all, not just an empty one. A real,
      // one-click fix rather than another honest-but-unhelpful flag:
      // reuses the exact same critique -> RECIPE_UPDATE_JSON -> diff ->
      // Accept/Deny pipeline every other recipe-revision action already
      // uses (rule 8), asking Oracle to tag the EXISTING steps against
      // the EXISTING ingredient list — never inventing new ingredients
      // or rewording the method. Only shown when the recipe genuinely has
      // zero real per-step measurements anywhere (a recipe with SOME
      // steps tagged and others not is a different, already-handled
      // case — H14's own honest "old recipes show no chips" scope, not
      // this backfill's job).
      var measurementsBackfillBtn = self.ui._mkBtn('📏 Add measurements to these steps', 'inline', { color: '#9B59B6', bg: 'rgba(155,89,182,0.18)', borderColor: 'rgba(155,89,182,0.4)', extra: 'margin-bottom:10px;font-weight:700;' });
      var refreshMeasurementsBackfillVisibility = function() {
        var hasAnyStepIngredients = (recipe.steps || []).some(function(s) { return Array.isArray(s.ingredients_used) && s.ingredients_used.length > 0; });
        var eligible = !hasAnyStepIngredients && (recipe.steps || []).length > 0 && (recipe.ingredients || []).length > 0;
        measurementsBackfillBtn.style.display = eligible ? '' : 'none';
      };
      measurementsBackfillBtn.onclick = function() {
        var oc = RPGACE.modules.oracleControl;
        if (!oc || !oc._sendFromOverlay || !document.getElementById('chat-input')) {
          RPGACE.utils.toast('⚠️ Oracle chat isn\'t ready yet — open the Oracle page once first', '#E2A83D', 3200);
          return;
        }
        oc._sendFromOverlay('This recipe\'s Method steps show no per-step ingredient measurements at all — an older recipe from before that feature existed. Using the EXACT existing ingredient list and EXACT existing step wording (do not change the description text, order, or add/remove any ingredient), tag each step with which of the EXISTING ingredients it actually uses and how much of each, splitting an ingredient\'s amount across steps if it is genuinely used more than once.');
        RPGACE.utils.toast('📏 Asking Oracle to add real measurements to these steps...', '#9B59B6', 2800);
      };
      refreshMeasurementsBackfillVisibility();
      box.appendChild(measurementsBackfillBtn);

      var stepList = document.createElement('div');
      // H24 (Sep 17 2026, 9th pass) — real, active JS intervals started by
      // either step timer (the countdown below, or the new repeating
      // reminder) are tracked here so a re-render (renderSteps is
      // re-callable — see its own comment below) can actually stop them.
      // Without this, a running interval keeps firing against DOM
      // elements `stepList.innerHTML=''` already discarded — harmless for
      // the existing bounded countdown (it stops itself), a real,
      // genuinely bad leak for the new UNBOUNDED repeating reminder if
      // left running.
      var activeStepIntervals = [];
      // Sep 14 2026 - wrapped into a real, re-callable renderSteps() (was a
      // bare inline forEach) so a confirmed recipe update (see
      // applyRecipeUpdate below) can refresh this section IN PLACE, the
      // same way renderIngredients()/scaleInput.oninput already does -
      // never a full popup close-and-reopen, which would lose scroll
      // position and any in-progress step timer for real.
      var renderSteps = function() {
        activeStepIntervals.forEach(function(id) { clearInterval(id); });
        activeStepIntervals = [];
        stepList.innerHTML = '';
        (recipe.steps || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); }).forEach(function(step) {
        var meta = self.ui.STEP_META[step.type] || { label: step.type || 'Step', color: 'var(--muted)' };
        var row = document.createElement('div');
        row.style.cssText = 'border-left:3px solid ' + meta.color + ';background:rgba(255,255,255,0.03);border-radius:0 6px 6px 0;padding:8px 12px;margin-bottom:8px;';

        var top = document.createElement('div');
        top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;';
        var badge = document.createElement('span');
        badge.style.cssText = 'font-size:12px;font-weight:700;color:' + meta.color + ';text-transform:uppercase;letter-spacing:0.5px;';
        badge.textContent = meta.label;
        var durText = [];
        if (step.active_duration_min) durText.push(step.active_duration_min + 'm active');
        if (step.passive_duration_min) durText.push(step.passive_duration_min + 'm passive — free to do other things');
        var dur = document.createElement('span');
        dur.style.cssText = 'font-size:13px;color:var(--muted);';
        dur.textContent = durText.join(' + ');
        top.appendChild(badge);
        top.appendChild(dur);
        row.appendChild(top);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:13px;color:var(--text);margin-top:4px;line-height:1.5;';
        desc.textContent = step.description || '';
        row.appendChild(desc);

        var stepIng = self.ui._renderStepIngredients(step);
        if (stepIng) row.appendChild(stepIng);

        // H24 (Sep 17 2026, 10th pass) — real, shared builder (rule 8),
        // extracted so the exact same countdown/reminder mechanics also
        // drive the new Live Cook Mode panel (ui._openLiveCookMode) —
        // see ui._mkStepTimerControls's own comment for the full reasoning.
        row.appendChild(self.ui._mkStepTimerControls(step, activeStepIntervals));

        stepList.appendChild(row);
        }); // end (recipe.steps || []).forEach
        renderSpec();
      }; // end renderSteps
      renderSteps();
      box.appendChild(stepList);

      // Sep 14 2026 - the real title text node, captured once here so a
      // confirmed update (applyRecipeUpdate below) can refresh the popup's
      // own header without rebuilding the whole card. dashDeck._popup()
      // always appends its title div immediately before the content div it
      // returns as `pop.box` (verified by direct read of _popup itself,
      // both opts.eyebrow and opts.title are always passed by this
      // function) - previousElementSibling is the title div reliably, no
      // fragile text-matching needed.
      var titleEl = pop.box.previousElementSibling;

      // Sep 14 2026 (real "close the loop" build) - the real bridge
      // module-scope logic._listenForRecipeUpdates calls into once Alex
      // accepts a proposed change (see that function's own comment).
      // Mutates the SAME `recipe` object _generatedRecipe already points
      // at (set once, at the top of this function) rather than replacing
      // it, so this card's own closures (renderIngredients/renderSteps/
      // resetNutritionState, all already defined above) keep working on
      // the live object with zero extra wiring.
      var applyRecipeUpdate = function(updated) {
        if (updated.title) recipe.title = updated.title;
        recipe.ingredients = updated.ingredients || recipe.ingredients;
        recipe.steps = updated.steps || recipe.steps;
        renderIngredients();
        renderSteps();
        refreshMeasurementsBackfillVisibility();
        resetNutritionState(); // ingredients/steps just changed - the old estimate is stale
        // Sep 15 2026 - a real Method update landed via ANY path (my own
        // "Update Method" banner, or Alex typing his own critique straight
        // into the overlay) - either way the "method hasn't caught up"
        // concern the banner exists for is now resolved, so clear it here
        // too rather than only where the banner's own button sent the
        // request (the banner and this apply step are two different real
        // trigger paths into the same underlying update).
        pendingMethodIngredients = [];
        methodUpdateBanner.style.display = 'none';
        if (titleEl) titleEl.textContent = recipe.title || 'Recipe';
        // H24 (Sep 17 2026, 9th pass) — real, structural fix: this used to
        // ONLY mutate the in-memory card (see logic._updateSavedRecipe's
        // own comment for the full real bug this closes). For an
        // ALREADY-SAVED recipe, the accepted change now also writes
        // through to Supabase for real, so it survives closing the popup
        // and shows up correctly the next time this recipe is opened or
        // read by the Schedule Preview/Shopping List. A fresh,
        // never-saved recipe (savedRecipeId still null) is unaffected —
        // there's nothing real to update yet, Save still handles that.
        if (savedRecipeId) {
          RPGACE.utils.toast('💾 Saving the update to this recipe...', '#9B59B6', 1800);
          self.logic._updateSavedRecipe(savedRecipeId, recipe, function(err) {
            if (err) {
              RPGACE.utils.toast('⚠️ Card updated, but saving it failed: ' + err + ' — try again or it will be lost on reload', '#CC4A4A', 4500);
              return;
            }
            RPGACE.utils.toast('✅ Recipe updated and saved for real', '#4caf82', 2400);
          });
        }
      };
      self._applyRecipeUpdate = applyRecipeUpdate;

      // Sep 13 2026 (real Alex ask, hand-test follow-up: "make so that
      // save to cook just saves to cook, but not to journal, so that I
      // can then rate the dishes and save liked ones") - the two buttons
      // now do genuinely different things: Save to Journal ensures the
      // recipe row exists (never a 2nd one, via ensureRecipeSaved) THEN
      // adds a real journal entry on top of it; Add to Cook Session only
      // ensures the recipe row exists, no journal entry at all, so a
      // recipe can ride in a cook session without committing it to the
      // journal until Alex actually decides to save/rate it later.
      var saveBtn = self.ui._mkBtn('💾 Save to Journal', 'primaryGold', { extra: 'margin-top:14px;' });
      saveBtn.onclick = function() {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
        ensureRecipeSaved(function(err, recipeId) {
          if (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save to Journal';
            RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 4000);
            return;
          }
          self.logic._insertJournalEntry(recipe, recipe.ingredients, recipeId)
            .then(function() {
              RPGACE.utils.toast('💾 Recipe saved to Journal — mark it cooked there once you actually make it', '#C9A84C', 3500);
              pop.close();
              // H6 - Save to Journal also joins (or starts) the in-progress
              // cook session; the builder screen is what actually offers
              // "schedule cook time" / "add another recipe", per Alex's
              // own literal ask ("add 'schedule cook time' + 'add another
              // recipe' under Save to Journal").
              self.logic._addRecipeToSession(recipeId, recipe.title);
              self.ui._showSessionBuilder();
            })
            .catch(function(e) {
              saveBtn.disabled = false;
              saveBtn.textContent = '💾 Save to Journal';
              RPGACE.utils.toast('⚠️ Recipe saved, but the journal entry failed: ' + (e.message || 'unknown error') + ' — try again', '#CC4A4A', 4500);
            });
        });
      };
      box.appendChild(saveBtn);

      // Sep 13 2026 (H10, real Alex ask - "don't see the option to add it
      // to current planned cook for grocery list") - a real, separate,
      // visibly-labeled control so getting into a cook session doesn't
      // depend on already knowing Save does it. Per the same-day follow-up
      // above, this ONLY ensures the recipe row exists and joins the
      // session - it deliberately never writes a journal entry.
      var addToSessionBtn = self.ui._mkBtn('📅 Add to Cook Session', 'ghost', { extra: 'margin-top:8px;' });
      addToSessionBtn.onclick = function() {
        addToSessionBtn.disabled = true;
        addToSessionBtn.textContent = '⏳ Adding...';
        ensureRecipeSaved(function(err, recipeId) {
          if (err) {
            addToSessionBtn.disabled = false;
            addToSessionBtn.textContent = '📅 Add to Cook Session';
            RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 4000);
            return;
          }
          self.logic._addRecipeToSession(recipeId, recipe.title);
          pop.close();
          self.ui._showSessionBuilder();
        });
      };
      box.appendChild(addToSessionBtn);

      // H24 (Sep 17 2026, 8th pass, real Alex ask: "the recipe needs an
      // update button, so it can take in all colour schematics of
      // present ingredients and subs to make the recipe as precise as
      // possible to current conditions") — reuses the exact same
      // critique -> RECIPE_UPDATE_JSON -> code-computed diff ->
      // Accept/Deny pipeline the "Update Method for this" banner already
      // proves (rule 8, never a 2nd update mechanism). Only ever bakes
      // in an already-RESOLVED real state (a confirmed orange
      // substitution, with its real curated ratio if one exists) — a
      // still-unconfirmed orange suggestion is just the system's own
      // guess, not something Alex has actually committed to (rule 7 —
      // never present a guess to Oracle as a real decision). Gated on a
      // real saved recipe id since it needs a real recipe_ingredients
      // set to classify against live stock.
      if (existingRecipeId) {
        var stockUpdateBtn = self.ui._mkBtn('🔄 Update recipe to match current stock', 'ghost', { extra: 'margin-top:8px;' });
        stockUpdateBtn.onclick = function() {
          stockUpdateBtn.disabled = true;
          stockUpdateBtn.textContent = '⏳ Checking current stock...';
          self.logic._computeIngredientUsage([existingRecipeId], function(err, usage) {
            stockUpdateBtn.disabled = false;
            stockUpdateBtn.textContent = '🔄 Update recipe to match current stock';
            if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3200); return; }
            var confirmedSubs = (usage || []).filter(function(u) { return u.status === 'orange' && u.subConfirmed && u.subName; });
            if (!confirmedSubs.length) {
              RPGACE.utils.toast('ℹ️ No confirmed substitutions yet for this recipe — agree one first (the ✓ button on an orange ingredient), then update.', '#E2A83D', 4200);
              return;
            }
            var lines = confirmedSubs.map(function(u) {
              var adjNote = '';
              if (typeof u.subRatio === 'number' && typeof u.amount === 'number') {
                var adjAmt = Math.round(u.amount * u.subRatio * 100) / 100;
                adjNote = ' (use ~' + adjAmt + ' ' + (u.unit || '') + ' of it' + (u.subRatioNote ? ' — ' + u.subRatioNote : '') + ')';
              }
              return u.name + ' -> ' + u.subName + adjNote;
            });
            var oc = RPGACE.modules.oracleControl;
            if (!oc || !oc._sendFromOverlay || !document.getElementById('chat-input')) {
              RPGACE.utils.toast('⚠️ Oracle chat isn\'t ready yet — open the Oracle page once first', '#E2A83D', 3200);
              return;
            }
            oc._sendFromOverlay('I have confirmed real substitutions from my current stock for this recipe — update the ingredients list AND the Method to actually reflect what I\'m really using, at the right real adjusted quantity for each (never the original ingredient/amount): '
              + lines.join('; ') + '. Keep everything else in the recipe exactly the same unless a swapped ingredient genuinely requires a different step.');
            RPGACE.utils.toast('🔄 Asking Oracle to update the recipe for ' + confirmedSubs.length + ' confirmed substitution' + (confirmedSubs.length === 1 ? '' : 's') + '...', '#9B59B6', 3000);
          });
        };
        box.appendChild(stockUpdateBtn);
      }
    },

    _showSettings: function(cfg) {
      var self = RPGACE.modules.cookingOracle;
      cfg = cfg || {};
      var pop = RPGACE.modules.dashDeck._popup({
        width: '420px', eyebrow: '⚙ HABITS SETTINGS', title: 'Cooking preferences',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;

      var mkRow = function(labelText) {
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:12px;';
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:4px;';
        lbl.textContent = labelText;
        row.appendChild(lbl);
        box.appendChild(row);
        return row;
      };
      var inputStyle = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:Rajdhani,sans-serif;padding:7px 10px;box-sizing:border-box;';

      var enabledRow = mkRow('HABITS enabled');
      var enabledInput = document.createElement('input');
      enabledInput.type = 'checkbox';
      enabledInput.checked = cfg.habits_enabled !== false;
      enabledRow.appendChild(enabledInput);

      var unitRow = mkRow('Unit system');
      var unitInput = document.createElement('select');
      unitInput.style.cssText = inputStyle;
      ['metric', 'imperial'].forEach(function(u) {
        var o = document.createElement('option');
        o.value = u; o.textContent = u;
        if (cfg.unit_system === u) o.selected = true;
        unitInput.appendChild(o);
      });
      unitRow.appendChild(unitInput);

      var shopRow = mkRow('Default shop');
      var shopInput = document.createElement('input');
      shopInput.type = 'text';
      shopInput.value = cfg.default_shop || '';
      shopInput.style.cssText = inputStyle;
      shopRow.appendChild(shopInput);

      var ovenRow = mkRow('Oven slots (how many trays/dishes fit at once)');
      var ovenInput = document.createElement('input');
      ovenInput.type = 'number'; ovenInput.min = '0';
      ovenInput.value = cfg.oven_slots != null ? cfg.oven_slots : 2;
      ovenInput.style.cssText = inputStyle;
      ovenRow.appendChild(ovenInput);

      var stoveRow = mkRow('Stovetop burner slots');
      var stoveInput = document.createElement('input');
      stoveInput.type = 'number'; stoveInput.min = '0';
      stoveInput.value = cfg.stovetop_slots != null ? cfg.stovetop_slots : 4;
      stoveInput.style.cssText = inputStyle;
      stoveRow.appendChild(stoveInput);

      var saveBtn = self.ui._mkBtn('💾 Save Settings', 'primary', { extra: 'margin-top:8px;' });
      saveBtn.onclick = function() {
        var patch = {
          habits_enabled: !!enabledInput.checked,
          unit_system: unitInput.value,
          default_shop: shopInput.value.trim() || null,
          oven_slots: parseInt(ovenInput.value, 10) || 0,
          stovetop_slots: parseInt(stoveInput.value, 10) || 0,
        };
        saveBtn.disabled = true;
        self.logic._saveConfig(patch, function(err) {
          if (err) { saveBtn.disabled = false; RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 4000); return; }
          RPGACE.utils.toast('⚙ Habits settings saved', '#4caf82', 2200);
          pop.close();
        });
      };
      box.appendChild(saveBtn);
    },

    _errNode: function(msg) {
      var n = document.createElement('div');
      n.style.cssText = 'font-size:12px;color:#CC4A4A;';
      n.textContent = '⚠️ ' + msg;
      return n;
    },

    // H6 (kitchen-session scheduler) — real, evidence-resolved forks:
    // records/2026-09/habits_cooking_domain_interrogation_spec_2026-09-10.txt
    // section 10. Shown right after a Save succeeds; also reachable by
    // reopening Cooking mid-session (ui.openMain). "Done for now" leaves the
    // session in place — only Accept in _showSchedulePreview ends it.
    _showSessionBuilder: function() {
      var self = RPGACE.modules.cookingOracle;
      var sess = self._session || { recipeIds: [], recipes: [] };
      var pop = RPGACE.modules.dashDeck._popup({
        // H12 (Sep 16 2026) - real title fix, directly implicated in the
        // original bug report: "Recipe saved" (true only of the individual
        // recipe row) read as "your whole plan is saved," which it wasn't -
        // the real session state was still pure in-memory at that point.
        // Now that it genuinely IS saved as of the first recipe add, the
        // title can honestly say so instead of naming the wrong thing.
        width: '480px', eyebrow: '🍳 COOKING SESSION', title: 'Planned Cook',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;

      var savedNote = document.createElement('div');
      savedNote.style.cssText = 'font-size:13px;color:var(--green);margin-bottom:12px;';
      savedNote.textContent = '✅ Saved — safe to close this and come back later.';
      box.appendChild(savedNote);

      // H21 (Sep 17 2026, real Alex ask, via a pasted Oracle-chat
      // transcript: "no shop or can go shop should be a toggle mode for
      // cooking planning") — AskUserQuestion-confirmed scope: "Per
      // planned-cook session (Recommended)," not a global Habits setting.
      // Defaults to 'can_shop' (the existing behavior — nothing changes
      // for a session that never touches this). Persisted immediately on
      // change via the same real _persistSessionDraft path every other
      // session edit already uses (rule 8), so reopening this popup or
      // resuming this draft later keeps the real choice Alex made.
      if (sess.recipeIds && sess.recipeIds.length) {
        var shopModeRow = document.createElement('div');
        shopModeRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px;';
        var shopModeLbl = document.createElement('span');
        shopModeLbl.style.cssText = 'font-size:12px;color:var(--muted);flex:1;';
        shopModeLbl.textContent = 'This cook session:';
        var shopModeSelect = document.createElement('select');
        shopModeSelect.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:5px 8px;font-family:Rajdhani,sans-serif;';
        var optCan = document.createElement('option'); optCan.value = 'can_shop'; optCan.textContent = '🛒 Can go shop';
        var optNo = document.createElement('option'); optNo.value = 'no_shop'; optNo.textContent = '🚫 No shop this time';
        shopModeSelect.appendChild(optCan);
        shopModeSelect.appendChild(optNo);
        shopModeSelect.value = sess.shopMode === 'no_shop' ? 'no_shop' : 'can_shop';
        shopModeSelect.onchange = function() {
          sess.shopMode = shopModeSelect.value;
          self.logic._persistSessionDraft();
        };
        shopModeRow.appendChild(shopModeLbl);
        shopModeRow.appendChild(shopModeSelect);
        box.appendChild(shopModeRow);
      }

      var listHeading = document.createElement('div');
      listHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      listHeading.textContent = 'Recipes in this session';
      box.appendChild(listHeading);

      var list = document.createElement('div');
      list.style.cssText = 'margin-bottom:14px;';
      // Real Alex ask (Sep 16 2026): "planned cook doesnt have a delete
      // button, i wanted to delete the lime orange desert and choose one
      // i have all ingredients for" - this list could only grow, never
      // shrink, so a bad pick had no way out short of abandoning the
      // whole session. Same real 2-click arm/confirm delete shape as the
      // Current Stock tab a few hundred lines above (rule 8).
      (sess.recipes || []).forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
        // Real Alex ask (Sep 17 2026): "when i click a recipe in this
        // session, open up the recipe of the specific dish." Same real
        // _loadSavedRecipe -> pop.close() -> _showRecipeCard(recipe, null,
        // existingRecipeId) pattern the Stock Match Finder already proved
        // (rule 8, H18) - reopens the exact saved recipe, never a fresh
        // generation, so a later Save click there can't mint a duplicate
        // row. Closes this popup first, matching that same established
        // sequence, rather than stacking a 2nd dashDeck._popup() overlay on
        // top of this one (a shape never used elsewhere in this module).
        var lbl = document.createElement('span');
        lbl.style.cssText = 'font-size:13px;color:var(--text);flex:1;cursor:pointer;';
        lbl.textContent = '🍽 ' + r.title;
        lbl.onclick = function() {
          self.logic._loadSavedRecipe(r.id, function(loadErr, recipe) {
            if (loadErr) { RPGACE.utils.toast('⚠️ ' + loadErr, '#CC4A4A', 3000); return; }
            pop.close();
            self.ui._showRecipeCard(recipe, null, r.id);
          });
        };
        row.appendChild(lbl);

        var delBtn = self.ui._mkDeleteArmBtn(function(doneCb) {
          self.logic._removeRecipeFromSession(r.id, function(err) {
            if (err) {
              RPGACE.utils.toast('⚠️ Could not remove: ' + err, '#CC4A4A', 3200);
              doneCb(err);
              return;
            }
            RPGACE.utils.toast('🗑 Removed ' + r.title, 'rgba(226,226,236,0.5)', 2200);
            // Removing the last recipe deletes the whole draft row (an
            // empty session is meaningless and would resurface as a
            // stale "0 recipes" resume) - close the popup rather than
            // show an empty list with a dead Schedule/Shopping-list flow.
            if (!self._session) { pop.close(); doneCb(null); return; }
            row.remove();
            doneCb(null);
          });
        });
        row.appendChild(delBtn);
        list.appendChild(row);
      });
      box.appendChild(list);

      var addBtn = self.ui._mkBtn('+ Add another saved recipe to this session', 'secondary', { extra: 'margin-bottom:8px;' });
      addBtn.onclick = function() { pop.close(); self.ui._showAddToSessionPicker(); };
      box.appendChild(addBtn);

      var genNewBtn = self.ui._mkBtn('⚡ ...or generate a new one to add', 'ghost', { extra: 'margin-bottom:14px;' });
      genNewBtn.onclick = function() {
        pop.close();
        self.logic._loadConfig(function(cfg) { self.ui._showGenerateForm(cfg || {}); });
      };
      box.appendChild(genNewBtn);

      // H7 (shopping list, Sep 13 2026) — generated straight from this
      // in-progress session (real evidence: "when I'm planning a cook, I
      // need to buy ingredients" — before scheduling, not after), so a
      // shopping_lists row can exist with planned_cook_id still null;
      // _acceptSchedule below best-effort back-links it once a real
      // planned_cooks row exists (same pattern as its own agenda_id link).
      var shopBtn = self.ui._mkBtn(sess.shoppingListId ? '🛒 View shopping list' : '🛒 Generate shopping list', 'secondary', { extra: 'margin-bottom:8px;' });
      shopBtn.onclick = function() {
        if (sess.shoppingListId) { pop.close(); self.ui._showShoppingList(sess.shoppingListId); return; }
        shopBtn.disabled = true;
        shopBtn.textContent = '⏳ Building list...';
        self.logic._generateShoppingList(sess, function(err, listId) {
          if (err) {
            shopBtn.disabled = false;
            shopBtn.textContent = '🛒 Generate shopping list';
            RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 4000);
            return;
          }
          sess.shoppingListId = listId;
          pop.close();
          self.ui._showShoppingList(listId);
        });
      };
      box.appendChild(shopBtn);

      var schedBtn = self.ui._mkBtn('📅 Schedule cook time', 'primaryGold', { extra: 'margin-bottom:8px;' });
      schedBtn.onclick = function() { pop.close(); self.ui._showSchedulePreview(); };
      box.appendChild(schedBtn);

      var doneBtn = self.ui._mkBtn('Done for now', 'plainLink');
      doneBtn.onclick = function() { pop.close(); };
      box.appendChild(doneBtn);
    },

    _showAddToSessionPicker: function() {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '480px', scroll: true, eyebrow: '🍳 COOKING SESSION', title: 'Add a saved recipe',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;
      var loadingMsg = document.createElement('div');
      loadingMsg.style.cssText = 'font-size:12px;color:var(--muted);';
      loadingMsg.textContent = 'Loading saved recipes...';
      box.appendChild(loadingMsg);

      RPGACE.sb.select('recipes', 'select=id,title,servings_base&order=created_at.desc&limit=50')
        .then(function(rows) {
          loadingMsg.remove();
          var existing = (self._session && self._session.recipeIds) || [];
          var avail = (rows || []).filter(function(r) { return existing.indexOf(r.id) === -1; });
          if (!avail.length) {
            box.appendChild(self.ui._errNode('No other saved recipes yet — generate one first.'));
            return;
          }
          avail.forEach(function(r) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:13px;color:var(--text);';
            lbl.textContent = '🍽 ' + r.title;
            var btn = self.ui._mkBtn('+ Add', 'inline', { color: 'var(--gold)' });
            btn.onclick = function() {
              self.logic._addRecipeToSession(r.id, r.title);
              pop.close();
              self.ui._showSessionBuilder();
            };
            row.appendChild(lbl);
            row.appendChild(btn);
            box.appendChild(row);
          });
        })
        .catch(function(e) {
          loadingMsg.textContent = '⚠️ Could not load saved recipes: ' + (e.message || 'unknown error');
        });
    },

    // Real, read-only proposed schedule + explicit Accept — v1 scope
    // confirmed via AskUserQuestion (section 10, fork 4): "1 but 2 looks
    // promising" - a fully editable/reorderable timeline is a real, later,
    // NOT-built want, not guessed into v1.
    _showSchedulePreview: function() {
      var self = RPGACE.modules.cookingOracle;
      var sess = self._session;
      if (!sess || !sess.recipeIds.length) {
        RPGACE.utils.toast('⚠️ No recipes in this session yet', '#E2A83D', 2500);
        return;
      }

      var pop = RPGACE.modules.dashDeck._popup({
        width: '600px', scroll: true, eyebrow: '🍳 COOKING SESSION', title: 'Proposed cook schedule',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;
      var loadingMsg = document.createElement('div');
      loadingMsg.style.cssText = 'font-size:12px;color:var(--muted);';
      loadingMsg.textContent = 'Computing schedule...';
      box.appendChild(loadingMsg);

      self.logic._loadConfig(function(cfg) {
        // Real, confirmed bug fixed Sep 13 2026 — this line's own quoted-
        // UUID technique ('"'+id+'"') is invalid inside a PostgREST `in.()`
        // filter embedded in a URL: raw double-quote characters are not
        // valid URL characters, and fetch() rejects the whole request
        // outright with "Failed to fetch" before any network attempt is
        // even made — found via a real headless-Chromium test of the new
        // H7 shopping-list code (which had copied this exact pattern), not
        // caught by this function's own earlier "headless-Chromium
        // verified, zero JS errors" claim (that test's mock never actually
        // exercised a real browser URL-parse of this string). Fixed to
        // match this project's own established, already-working `in.()`
        // precedent used everywhere else (taxonomy_tree/bibliography/etc,
        // rule 8) — plain comma-joined UUIDs, no quoting.
        var idList = sess.recipeIds.join(',');
        RPGACE.sb.select('recipes', 'select=id,title,steps&id=in.(' + idList + ')')
          .then(function(rows) {
            loadingMsg.remove();
            if (!rows || !rows.length) { box.appendChild(self.ui._errNode('Could not load this session\'s recipes')); return; }

            var schedule = self.logic._computeSessionSchedule(rows, cfg || {});

            var heading = document.createElement('div');
            heading.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;';
            var saved = Math.max(0, schedule.sequentialMinutes - schedule.totalMinutes);
            heading.textContent = 'Total elapsed kitchen time: ' + self.logic._fmtMin(schedule.totalMinutes)
              + ' (vs. ' + self.logic._fmtMin(schedule.sequentialMinutes) + ' cooking these one at a time — '
              + (saved > 0 ? self.logic._fmtMin(saved) + ' saved by interleaving)' : 'no gap-filling was possible for this combination)');
            box.appendChild(heading);

            schedule.blocks.slice().sort(function(a, b) { return a.start - b.start; }).forEach(function(b) {
              var meta = self.ui.STEP_META[b.type] || { color: 'var(--muted)', label: b.type || 'Step' };
              var row = document.createElement('div');
              row.style.cssText = 'border-left:3px solid ' + meta.color + ';background:rgba(255,255,255,0.03);border-radius:0 6px 6px 0;padding:7px 12px;margin-bottom:6px;font-size:12px;';
              var top = document.createElement('div');
              top.style.cssText = 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:' + meta.color + ';font-weight:700;font-size:13px;text-transform:uppercase;';
              var left = document.createElement('span');
              left.textContent = self.logic._fmtMin(b.start) + '–' + self.logic._fmtMin(b.end) + ' · ' + meta.label;
              var right = document.createElement('span');
              right.textContent = b.recipeTitle;
              top.appendChild(left);
              top.appendChild(right);
              row.appendChild(top);
              var desc = document.createElement('div');
              desc.style.cssText = 'color:var(--text);margin-top:2px;';
              desc.textContent = b.description || '';
              row.appendChild(desc);
              var blockIng = self.ui._renderStepIngredients({ ingredients_used: b.ingredientsUsed });
              if (blockIng) row.appendChild(blockIng);
              box.appendChild(row);
            });

            // H14 (Sep 16 2026, real Alex ask: "make a list of ingredients
            // i will use up and what will need to be added to future
            // grocery list") — a real, read-only preview using the SAME
            // shared usage computation _generateShoppingList itself now
            // calls (rule 8, no second copy of the have/need-to-buy math).
            // Deliberately a PREVIEW, never a second write mechanism — the
            // session builder's own "Generate shopping list" button is
            // still the one real place a shopping_lists row actually gets
            // created; this just answers "what will this session use up,
            // what will I need to buy" right here, without a popup round
            // trip, so Alex doesn't have to leave this screen to check.
            var usageBox = document.createElement('div');
            usageBox.style.cssText = 'margin-top:4px;';
            var usageLoading = document.createElement('div');
            usageLoading.style.cssText = 'font-size:13px;color:var(--muted);margin:10px 0;';
            usageLoading.textContent = 'Checking pantry stock...';
            usageBox.appendChild(usageLoading);
            box.appendChild(usageBox);

            // H24 (Sep 17 2026, 3rd pass) — the real, separate 2nd pantry
            // snapshot this comment used to justify (loaded purely so an
            // orange row could name its real in-stock substitute) is gone:
            // _computeIngredientUsage now resolves subName/subConfirmed
            // itself and returns them on each row (rule 8 — one real
            // computation, not two), so this real 2nd Supabase round trip
            // is removed outright rather than left dead.
            // H24 (6th pass) — a real, persisted pink-allocation snapshot
            // loaded first, so a pink row already reflects any choice
            // Alex made on a prior open of this same popup.
            self.logic._loadPinkAllocations(sess.plannedCookId, function(pinkAllocations) {
            self.logic._computeIngredientUsage(sess.recipeIds, function(usageErr, usage, stockNames) {
              usageBox.innerHTML = '';
              if (usageErr) {
                usageBox.appendChild(self.ui._errNode('Could not check pantry stock: ' + usageErr));
                return;
              }
              // H18 (Sep 16 2026, real Alex ask — see logic._classifyIngredientStatus
              // for the full 5-color rules and the /interrogation record).
              // Real Alex-stated grouping, direct from his own words: "green
              // is plenty and not needed for consideration for next shop,
              // purple is only in consideration after planned shop, red,
              // yellow and blue is what needs shopping BEFORE next planned
              // cook" — so this replaces H14b's old willUse/needToBuy
              // 2-color split with the 3 real buckets that actually match
              // that timing logic (buy-before / plenty / buy-after), each
              // ingredient individually color-coded within its bucket via
              // the shared ui._renderIngredientStatusRow (rule 8).
              // H21 (Sep 17 2026) — orange (a real substitute is actually
              // in stock, skip buying the real thing) joins the same real
              // "needs a decision before this cook" bucket blue already
              // sits in — genuinely distinct color, same real timing.
              // H24 (Sep 17 2026, 5th pass) — maroon (a real derivation is
              // genuinely available right now) joins the same bucket, same
              // real timing logic — a real decision (derive it) before
              // this cook, not a shopping trip. H24 (6th pass) — pink
              // joins it too, same real "a decision is needed before this
              // cook" timing.
              var buyBefore = usage.filter(function(u) { return u.status === 'red' || u.status === 'yellow' || u.status === 'blue' || u.status === 'orange' || u.status === 'maroon' || u.status === 'pink'; });
              var plenty = usage.filter(function(u) { return u.status === 'green'; }).sort(function(a, b) { return a.name.localeCompare(b.name); });
              var buyAfter = usage.filter(function(u) { return u.status === 'purple'; }).sort(function(a, b) { return a.name.localeCompare(b.name); });
              // Brown only ever appears when this session's own real
              // shopMode is 'no_shop' (see the _computeIngredientUsage
              // call below) — a separable, missing ingredient Alex has
              // already decided to just omit, never a shopping decision.
              var omittable = usage.filter(function(u) { return u.status === 'brown'; }).sort(function(a, b) { return a.name.localeCompare(b.name); });
              buyBefore.forEach(function(u) { u._aisle = self.logic._classifyAisle(u.name); });
              buyBefore.sort(function(a, b) {
                if (a._aisle.order !== b._aisle.order) return a._aisle.order - b._aisle.order;
                return a.name.localeCompare(b.name);
              });

              if (buyBefore.length) {
                var buyHeading = document.createElement('div');
                buyHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin:14px 0 6px;';
                buyHeading.textContent = '🛒 Need to buy before this cook';
                usageBox.appendChild(buyHeading);
                var currentAisle = null;
                buyBefore.forEach(function(u) {
                  if (u._aisle.name !== currentAisle) {
                    currentAisle = u._aisle.name;
                    var aisleHeading = document.createElement('div');
                    aisleHeading.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:var(--muted);margin:8px 0 3px;';
                    aisleHeading.textContent = '📍 ' + currentAisle;
                    usageBox.appendChild(aisleHeading);
                  }
                  // H24 (Sep 17 2026, 8th pass, real Alex ask) — the old
                  // wording ("need X, have Y already") read as if X were
                  // the TOTAL requirement, when X has always really been
                  // the real SHORTFALL (toBuy = amount - have) — a real,
                  // checkable example: shallot showed "need 2 medium
                  // (have 4 already)" when the recipe's own real total is
                  // 6, have is 4, so 2 more is genuinely correct as a
                  // number but ambiguous as written. Now says "X more"
                  // plus the real total, unambiguous either way.
                  var text = u.have > 0
                    ? (u.name + ' — need ' + u.toBuy + ' more ' + (u.unit || '') + ' (have ' + u.have + ', ' + u.amount + ' total needed)')
                    : (u.name + ' — need ' + u.toBuy + ' ' + (u.unit || ''));
                  // H21 (Sep 17 2026) — real substitute name surfaced on
                  // an orange row (never invented — _findSubstitute only
                  // ever returns a real, currently in-stock match). H24
                  // (Sep 17 2026, 3rd pass) — u.subName/u.subConfirmed are
                  // now resolved once by _computeIngredientUsage itself
                  // (rule 8), never re-derived here.
                  if (u.status === 'orange' && u.subName) text += ' — have a substitute in stock: ' + u.subName;
                  // H24 (Sep 17 2026, 7th pass) — u.blueName is now
                  // resolved the same real way (rule 8), so a blue row
                  // finally names its own real alternative instead of
                  // staying silent about what's actually in the aisle.
                  if (u.status === 'blue' && u.blueName) text += ' — have an alternative in stock: ' + u.blueName;
                  // H24 (6th pass) — a real, unresolved pink row gets its
                  // own dedicated real per-recipe choice UI (genuinely
                  // different shape — multiple recipe options, not one
                  // confirm/derive action), see ui._renderPinkRow.
                  if (u.status === 'pink') {
                    usageBox.appendChild(self.ui._renderPinkRow(u, sess, function() { pop.close(); self.ui._showSchedulePreview(); }));
                    return;
                  }
                  // H24 (Sep 17 2026, 3rd pass) — real confirm/tick
                  // button, rule 8 shared render (see
                  // ui._renderSubstitutableStatusRow's own comment) —
                  // no longer flips this row to green (Alex's own direct
                  // correction). H24 (5th pass) — u.derivableFrom/u.amount
                  // drive the real maroon derive-and-use action.
                  // H24 (6th pass) — a real RESOLVED pink pairing (Alex
                  // already picked which recipe gets the real stock) is
                  // rendered by the normal ladder above like any other
                  // status, but the real "what does the OTHER recipe get
                  // instead" fact still needs a real, named recipe title
                  // (sess.recipes, only available here, never inside the
                  // shared render function) — resolved here, passed
                  // through as pre-formatted real data.
                  var pinkOthers = null;
                  if (u.pinkInfo && u.pinkInfo.resolved) {
                    pinkOthers = u.pinkInfo.others.map(function(o) {
                      var recipe = (sess.recipes || []).filter(function(r) { return r.id === o.recipeId; })[0];
                      var oMeta = self.INGREDIENT_STATUS_META[o.status] || self.INGREDIENT_STATUS_META.red;
                      var oText = (recipe ? recipe.title : 'the other recipe') + ' needs ' + o.amount + ' ' + (u.unit || '') + ' — ' + oMeta.icon + ' ' + oMeta.label + (o.subName ? ' (' + o.subName + ')' : (o.derivableFrom ? ' (can derive from ' + o.derivableFrom.deriv.sourceName + ')' : ''));
                      return oText;
                    });
                  }
                  // H24 (Sep 17 2026, 7th pass) — u.blueName + a real
                  // reopen callback (same reopen shape pink's own row
                  // already uses above) so a real "declare same item"
                  // merge can refresh this whole popup once it lands —
                  // the merged ingredient's real status can genuinely
                  // change (e.g. a real duplicate stock row now counts).
                  usageBox.appendChild(self.ui._renderSubstitutableStatusRow(text, u.status, u.ingredient_id, u.subName, u.name, u.subConfirmed, u.derivableFrom, u.amount, pinkOthers, u.blueName, function() { pop.close(); self.ui._showSchedulePreview(); }, stockNames, u.subRatio, u.subRatioNote, u.unit));
                });
              }

              if (plenty.length) {
                var useHeading = document.createElement('div');
                useHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--green);margin:14px 0 6px;';
                useHeading.textContent = '📦 Have plenty — nothing to buy';
                usageBox.appendChild(useHeading);
                plenty.forEach(function(u) {
                  var usedAmt = Math.min(u.amount, u.have);
                  usageBox.appendChild(self.ui._renderIngredientStatusRow(u.name + ' — using ' + usedAmt + ' ' + (u.unit || ''), 'green'));
                });
              }

              if (buyAfter.length) {
                var afterHeading = document.createElement('div');
                afterHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9B59B6;margin:14px 0 6px;';
                afterHeading.textContent = '🟣 Will run low — restock on your NEXT shop, after this cook';
                usageBox.appendChild(afterHeading);
                buyAfter.forEach(function(u) {
                  var usedAmt = Math.min(u.amount, u.have);
                  usageBox.appendChild(self.ui._renderIngredientStatusRow(u.name + ' — using ' + usedAmt + ' ' + (u.unit || '') + ', little left after', 'purple'));
                });
              }

              // H21 (Sep 17 2026, real Alex ask: "just omit if I'm not
              // going shop") — a bare, honest "can be omitted" note, never
              // a computed serving-pairing suggestion — Alex explicitly
              // overrode that idea: "No, just say 'can be omitted'."
              if (omittable.length) {
                var omitHeading = document.createElement('div');
                omitHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8B5E3C;margin:14px 0 6px;';
                omitHeading.textContent = '🟤 Skipping shop this time — can be omitted';
                usageBox.appendChild(omitHeading);
                omittable.forEach(function(u) {
                  usageBox.appendChild(self.ui._renderIngredientStatusRow(u.name + ' — can be omitted', 'brown'));
                });
              }

              if (!buyBefore.length && !plenty.length && !buyAfter.length && !omittable.length) {
                var noneMsg = document.createElement('div');
                noneMsg.style.cssText = 'font-size:12px;color:var(--muted);margin:10px 0;';
                noneMsg.textContent = 'No pantry stock logged yet — everything here will need buying once you generate a shopping list.';
                usageBox.appendChild(noneMsg);
              }
            }, { noShop: sess.shopMode === 'no_shop', pinkAllocations: pinkAllocations });
            });

            var whenHeading = document.createElement('div');
            whenHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin:16px 0 8px;';
            whenHeading.textContent = 'Start this session';
            box.appendChild(whenHeading);

            var whenRow = document.createElement('div');
            whenRow.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';
            var dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.value = new Date().toISOString().slice(0, 10);
            dateInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;';
            var timeInput = document.createElement('input');
            timeInput.type = 'time';
            var d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
            timeInput.value = String(d.getHours()).padStart(2, '0') + ':00';
            timeInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;';
            whenRow.appendChild(dateInput);
            whenRow.appendChild(timeInput);
            box.appendChild(whenRow);

            var errBox = document.createElement('div');
            errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:10px;display:none;';
            box.appendChild(errBox);

            var acceptBtn = self.ui._mkBtn('✅ Accept & add to Agenda', 'primary');
            acceptBtn.onclick = function() {
              if (!dateInput.value || !timeInput.value) {
                errBox.textContent = '⚠️ Pick a start date and time';
                errBox.style.display = 'block';
                return;
              }
              acceptBtn.disabled = true;
              acceptBtn.textContent = '⏳ Saving...';
              var timeParts = timeInput.value.split(':');
              self.logic._acceptSchedule(sess, schedule, dateInput.value, parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), function(err) {
                if (err) {
                  acceptBtn.disabled = false;
                  acceptBtn.textContent = '✅ Accept & add to Agenda';
                  errBox.textContent = '⚠️ ' + err;
                  errBox.style.display = 'block';
                  return;
                }
                RPGACE.utils.toast('📅 Cook session scheduled and added to your Agenda', '#4caf82', 3200);
                self._session = null; // session complete — Accept is the real, deliberate terminal action
                pop.close();
              });
            };
            box.appendChild(acceptBtn);

            // Oct 1 2026 (real Alex hand-test: "scheduling clicking do now
            // didnt make cook active") - a real one-click "start this right
            // now": the same _acceptSchedule write (stamped with today's
            // date and the current time), then the shared _startCookNow,
            // so the session is genuinely live (started_at + Live Cook
            // Mode) instead of only sitting on the calendar.
            var cookNowBtn = self.ui._mkBtn('▶ Cook now (start immediately)', 'primaryGold', { extra: 'margin-top:8px;' });
            cookNowBtn.onclick = function() {
              cookNowBtn.disabled = true;
              acceptBtn.disabled = true;
              cookNowBtn.textContent = '⏳ Starting...';
              var now = new Date();
              var todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
              self.logic._acceptSchedule(sess, schedule, todayStr, now.getHours(), now.getMinutes(), function(err, plannedCookId, agendaId) {
                if (err) {
                  cookNowBtn.disabled = false;
                  acceptBtn.disabled = false;
                  cookNowBtn.textContent = '▶ Cook now (start immediately)';
                  errBox.textContent = '⚠️ ' + err;
                  errBox.style.display = 'block';
                  return;
                }
                self._session = null;
                pop.close();
                self.logic._startCookNow(plannedCookId, agendaId);
              });
            };
            box.appendChild(cookNowBtn);

            // H24 (Sep 17 2026, real Alex ask: "make a return button for
            // previous slide of pop up") — same real
            // pop.close()+reopen-the-prior-popup pattern already
            // established elsewhere in this module (rule 8, e.g. the
            // Generate form's own "← Back to cook session" button) —
            // this schedule preview is only ever reached from the Session
            // Builder's own "📅 Schedule this cook" button, so that's the
            // one real "previous slide" to return to. The session itself
            // (self._session) is untouched by going back — only Accept
            // clears it.
            var backBtn = self.ui._mkBtn('← Back to Planned Cook', 'plainLink', { extra: 'margin-top:6px;' });
            backBtn.onclick = function() { pop.close(); self.ui._showSessionBuilder(); };
            box.appendChild(backBtn);
          })
          .catch(function(e) {
            loadingMsg.textContent = '⚠️ Could not load session recipes: ' + (e.message || 'unknown error');
          });
      });
    },

    // ============================================================
    // H7/H8 — shopping list, pantry, price logging, Sep 13 2026.
    // Real record: records/2026-09/habits_shopping_pantry_calories_spec_
    // 2026-09-13.txt (4 forks resolved via AskUserQuestion).
    // ============================================================

    // Sep 16 2026 - real Alex ask: a 4th Cooking button, "Current Stock,"
    // divided into Pantry/Fridge/Freezer/Equipment - live reads to make
    // batch cooking less wasteful. Retires the old standalone _showPantry
    // popup (see the pantryBtn.onclick comment above) - one real stock UI,
    // not two (rule 8). The 3 food-storage tabs share ONE renderer
    // (_renderStockLocationTab, parameterized by location) since they're
    // genuinely the same real mechanism (pantry_stock, now location-
    // tagged) with 3 different filters; Equipment is a real, separate
    // table/domain and gets its own renderer.
    _showCurrentStock: function(initialTab) {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '480px', scroll: true, eyebrow: '📦 CURRENT STOCK', title: 'What you actually have, live',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;

      var tabBar = document.createElement('div');
      tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';
      var content = document.createElement('div');

      var TABS = [
        { key: 'pantry', label: '🥫 Pantry' },
        { key: 'fridge', label: '🧊 Fridge' },
        { key: 'freezer', label: '❄️ Freezer' },
        { key: 'equipment', label: '🍳 Equipment' },
      ];
      var tabBtns = {};

      var render = function(key) {
        Object.keys(tabBtns).forEach(function(k) {
          var active = k === key;
          tabBtns[k].style.background = active ? 'rgba(76,175,130,0.18)' : 'rgba(255,255,255,0.03)';
          tabBtns[k].style.borderColor = active ? 'rgba(76,175,130,0.5)' : 'var(--border)';
          tabBtns[k].style.color = active ? 'var(--green)' : 'var(--muted)';
        });
        content.innerHTML = '';
        if (key === 'equipment') self.ui._renderEquipmentTab(content);
        else self.ui._renderStockLocationTab(content, key);
      };

      TABS.forEach(function(t) {
        var btn = self.ui._mkBtn(t.label, 'tab');
        btn.onclick = function() { render(t.key); };
        tabBtns[t.key] = btn;
        tabBar.appendChild(btn);
      });

      box.appendChild(tabBar);
      box.appendChild(content);
      // Oct 21 2026: What can I cook / Top-up list moved into ☰; this
      // page's own extras open the add form of whichever tab is showing.
      pop.overlay._sideExtras = function() {
        var f = self._stockForm;
        if (!f) return [];
        var out = [['➕', f.label, f.reveal, 'add']];
        if (f.photo) out.push(['📷', 'Add from a photo', function() { f.reveal(); f.photo(); }, 'photo']);
        return out;
      };
      render((initialTab && tabBtns[initialTab]) ? initialTab : 'pantry');
    },

    // Oct 21 2026: change an item's cooking/baking tag and its type group;
    // saved on the ingredient, so it sticks everywhere.
    _editStockTags: function(r, onSaved) {
      var self = RPGACE.modules.cookingOracle, L = self.logic;
      var pop = RPGACE.modules.dashDeck._popup({ width: '420px', eyebrow: '🏷️ ' + (r.guessed ? 'GUESSED - CHECK IT' : 'TAGS'), title: r.name, borderColor: 'rgba(76,175,130,0.3)' });
      var use = r.use, type = r.food_type;
      var sec = function(t) { var d = document.createElement('div'); d.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin:6px 0;'; d.textContent = t; pop.box.appendChild(d); };
      var grid = function(cols) { var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:6px;margin-bottom:10px;'; pop.box.appendChild(g); return g; };
      var paint = function(g, val) { g.querySelectorAll('button').forEach(function(b) { var on = b.dataset.v === val; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.style.background = on ? 'rgba(76,175,130,0.18)' : 'transparent'; b.style.borderColor = on ? 'rgba(76,175,130,0.5)' : 'var(--border)'; }); };
      sec('Used for');
      var ug = grid(3);
      [['cooking', '🍳 Cooking'], ['baking', '🧁 Baking'], ['both', '🍳🧁 Both']].forEach(function(u) {
        var b = self.ui._mkBtn(u[1], 'small'); b.dataset.v = u[0]; b.className += ' stock-tag-use';
        b.onclick = function() { use = u[0]; paint(ug, use); }; ug.appendChild(b);
      });
      paint(ug, use);
      sec('Type');
      var tg = grid(2);
      L.STOCK_TYPES.forEach(function(t) {
        var b = self.ui._mkBtn(t.icon + ' ' + t.label, 'small'); b.dataset.v = t.key; b.className += ' stock-tag-type';
        b.style.textAlign = 'left';
        b.onclick = function() { type = t.key; paint(tg, type); }; tg.appendChild(b);
      });
      paint(tg, type);
      var save = self.ui._mkBtn('Save', 'primary', { extra: 'width:100%;' });
      save.id = 'stock-tag-save';
      save.onclick = function() {
        save.disabled = true; save.textContent = '⏳ Saving...';
        L.setStockTags(r.ingredient_id, { use: use, food_type: type }, function(err) {
          if (err) { save.disabled = false; save.textContent = 'Save'; RPGACE.utils.toast('⚠️ Could not save: ' + err, '#CC4A4A', 3200); return; }
          pop.close(); if (onSaved) onSaved();
        });
      };
      pop.box.appendChild(save);
    },

    // The 3 food-storage tabs' shared real renderer - `location` is one of
    // 'pantry'|'fridge'|'freezer' (pantry_stock_location_check). Real
    // waste-reduction touch matching Alex's own stated purpose ("make
    // batch cooking less wasteful"): every row shows how long it's sat
    // untouched, flagged amber past 14 days, using the column that was
    // already there (updated_at) - no new detector needed.
    LOCATION_META: {
      pantry: { icon: '🥫', label: 'pantry' },
      fridge: { icon: '🧊', label: 'fridge' },
      freezer: { icon: '❄️', label: 'freezer' },
    },
    _renderStockLocationTab: function(container, location) {
      var self = RPGACE.modules.cookingOracle;
      var loadingMsg = document.createElement('div');
      loadingMsg.style.cssText = 'font-size:12px;color:var(--muted);';
      loadingMsg.textContent = 'Loading ' + location + '...';
      var stockFilter = 'all';
      var fbar = document.createElement('div');
      fbar.className = 'stock-filter';
      fbar.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
      var paintFilter = function() {
        fbar.querySelectorAll('button').forEach(function(x) {
          var on = x.dataset.filter === stockFilter;
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
          x.style.borderColor = on ? 'rgba(76,175,130,0.5)' : 'var(--border)';
          x.style.background = on ? 'rgba(76,175,130,0.18)' : 'transparent';
        });
      };
      [['all', 'All'], ['cooking', '🍳 Cooking'], ['baking', '🧁 Baking']].forEach(function(f) {
        var b = self.ui._mkBtn(f[1], 'small', { extra: 'flex:1;' });
        b.dataset.filter = f[0];
        b.onclick = function() { stockFilter = f[0]; paintFilter(); renderList(); };
        fbar.appendChild(b);
      });
      paintFilter();
      container.appendChild(fbar);
      // Oct 21 2026 (Alex: "the list in pantry is too long"): type to find.
      var find = document.createElement('input');
      find.type = 'search'; find.className = 'stock-find'; find.id = 'stock-find-' + location;
      find.placeholder = '🔍 Find in ' + location; find.setAttribute('aria-label', 'Find in ' + location);
      find.style.cssText = 'width:100%;box-sizing:border-box;min-height:40px;margin:4px 0 2px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:15px;padding:7px 10px;';
      var applyFind = function() {
        var q = find.value.trim().toLowerCase(), shown = {};
        container.querySelectorAll('.stock-row[data-ingredient]').forEach(function(el) {
          var hit = !q || el.dataset.ingredient.toLowerCase().indexOf(q) !== -1;
          el.hidden = !hit;
          if (hit) shown[el.dataset.type] = true;
        });
        container.querySelectorAll('.stock-type-head').forEach(function(h) { h.hidden = !!q && !shown[h.dataset.type]; });
      };
      find.oninput = applyFind;
      container.appendChild(find);
      container.appendChild(loadingMsg);
      var listEnd = document.createElement('div');
      container.appendChild(listEnd);

      var addHeading = document.createElement('div');
      addHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin:16px 0 8px;';
      addHeading.textContent = 'Add / adjust ' + location + ' stock';

      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Ingredient name';
      nameInput.style.cssText = 'width:100%;margin-bottom:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;box-sizing:border-box;';

      var qtyRow = document.createElement('div');
      qtyRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
      var qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.placeholder = 'Quantity';
      // Oct 10 2026 (N2): min-width:0 - without it the two inputs' default
      // width pushed the unit box off the right edge at phone width.
      qtyInput.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;min-height:40px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:15px;padding:7px 10px;';
      var unitInput = document.createElement('input');
      unitInput.type = 'text';
      unitInput.placeholder = 'unit (g, ml…)';
      unitInput.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;min-height:40px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:15px;padding:7px 10px;';
      qtyRow.appendChild(qtyInput);
      qtyRow.appendChild(unitInput);

      var errBox = document.createElement('div');
      errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:8px;display:none;';

      var addBtn = self.ui._mkBtn('+ Set stock', 'primary');

      var renderList = function() {
        self.logic._loadStockByLocation(location, function(rows, err) {
          if (err) {
            loadingMsg.textContent = '⚠️ Could not load ' + location + ': ' + (err.message || 'unknown error');
            return;
          }
          if (loadingMsg.parentNode) loadingMsg.remove();
          Array.prototype.slice.call(container.querySelectorAll('.stock-row')).forEach(function(el) { el.remove(); });
          // Oct 21 2026: grouped by food type, each with a 🍳/🧁 tag (tap to change).
          var L = self.logic, order = L.STOCK_TYPES.map(function(t) { return t.key; });
          rows = (rows || []).filter(function(r) { return stockFilter === 'all' || r.use === stockFilter || r.use === 'both'; })
            .sort(function(a, b) { return (order.indexOf(a.food_type) - order.indexOf(b.food_type)) || a.name.localeCompare(b.name); });
          var curType = null;
          (rows || []).forEach(function(r) {
            if (r.food_type !== curType) {
              curType = r.food_type;
              var tm = L.stockTypeMeta(curType);
              var hd = document.createElement('div');
              hd.className = 'stock-row stock-type-head';
              hd.dataset.type = curType;
              hd.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--gold);margin:14px 0 4px;';
              hd.textContent = tm.icon + ' ' + tm.label + ' · ' + rows.filter(function(x) { return x.food_type === curType; }).length;
              container.insertBefore(hd, listEnd);
            }
            var row = document.createElement('div');
            row.className = 'stock-row';
            row.dataset.ingredient = r.name || '';
            row.dataset.type = r.food_type;
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;';
            var lbl = document.createElement('span');
            lbl.textContent = r.name || '(unknown)';
            lbl.style.flex = '1';
            var days = r.updated_at ? Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000) : null;
            var stale = days != null && days > 14;
            var right = document.createElement('span');
            right.style.cssText = 'color:' + (stale ? '#E2A83D' : 'var(--muted)') + ';white-space:nowrap;';
            right.textContent = (r.quantity != null ? r.quantity : 0) + ' ' + (r.unit || '')
              + (days != null ? (stale ? ' ⚠️ ' : ' · ') + days + 'd' : '');
            var useChip = document.createElement('button');
            useChip.type = 'button';
            useChip.className = 'stock-use-chip';
            useChip.textContent = r.use === 'baking' ? '🧁' : r.use === 'both' ? '🍳🧁' : '🍳';
            useChip.title = 'Cooking / baking / type - tap to change';
            useChip.setAttribute('aria-label', r.name + ': ' + r.use + (r.guessed ? ' (guessed)' : '') + ' - change');
            useChip.style.cssText = 'min-width:44px;min-height:36px;border-radius:8px;border:1px ' + (r.guessed ? 'dashed' : 'solid') + ' var(--border);background:none;color:var(--text);font-size:15px;cursor:pointer;padding:0 6px;flex:none;';
            useChip.onclick = function() { self.ui._editStockTags(r, renderList); };
            row.appendChild(useChip);
            row.appendChild(lbl);
            row.appendChild(right);

            var delBtn = self.ui._mkDeleteArmBtn(function(doneCb) {
              self.logic._deleteStockItem(r.ingredient_id, location, function(err) {
                if (err) {
                  RPGACE.utils.toast('⚠️ Delete failed: ' + (err.message || 'unknown error'), '#CC4A4A', 3200);
                  doneCb(err);
                  return;
                }
                row.remove();
                doneCb(null);
              });
            });
            row.appendChild(delBtn);
            container.insertBefore(row, listEnd);
          });
          if (!rows || !rows.length) {
            var empty = document.createElement('div');
            empty.className = 'stock-row';
            empty.style.cssText = 'font-size:12px;color:var(--muted);';
            empty.textContent = 'Nothing tracked in the ' + location + ' yet — add stock above.';
            container.insertBefore(empty, listEnd);
          }
          applyFind();
        });
      };

      // Oct 21 2026: the add form folds away behind one button (and ☰),
      // at the top of the tab so a long list never buries it.
      var addBox = document.createElement('div');
      addBox.className = 'co-add-box';
      addBox.style.marginBottom = '10px';
      var formWrap = document.createElement('div');
      addBox.appendChild(addHeading);
      formWrap.appendChild(nameInput);
      formWrap.appendChild(qtyRow);
      formWrap.appendChild(errBox);
      formWrap.appendChild(addBtn);
      addBox.appendChild(formWrap);
      container.insertBefore(addBox, container.firstChild);

      addBtn.onclick = function() {
        var name = nameInput.value.trim();
        var qty = parseFloat(qtyInput.value);
        var unit = unitInput.value.trim() || null;
        if (!name || isNaN(qty)) {
          errBox.textContent = '⚠️ Enter a name and a real quantity';
          errBox.style.display = 'block';
          return;
        }
        errBox.style.display = 'none';
        addBtn.disabled = true;
        self.logic._upsertStock(name, location, qty, unit, function(err) {
          addBtn.disabled = false;
          if (err) {
            errBox.textContent = '⚠️ ' + err;
            errBox.style.display = 'block';
            return;
          }
          nameInput.value = ''; qtyInput.value = ''; unitInput.value = '';
          RPGACE.utils.toast('📦 ' + location.charAt(0).toUpperCase() + location.slice(1) + ' updated', '#4caf82', 2000);
          renderList();
        });
      };
      // Oct 10 2026 (D1): add several items at once from a photo.
      if (RPGACE.modules.dailyLife) RPGACE.modules.dailyLife.photoButton(formWrap, location, function() { renderList(); });
      self.ui._foldForm(addBox, [addHeading, formWrap], nameInput, '➕ Add / adjust ' + location + ' stock', function() { var b = formWrap.querySelector('.dl-photo-btn'); if (b) b.click(); });

      renderList();
    },

    // Real, separate owned-equipment inventory (kitchen_equipment table) -
    // /interrogation-confirmed Sep 16 2026: genuinely distinct from
    // habits_config's oven_slots/stovetop_slots (a scheduling capacity
    // number, not an itemized inventory) and from shoppingWishlist (future
    // purchases, not owned stock). Same 2-click arm/confirm delete as the
    // stock tabs above (rule 8 - one shared UX convention).
    // Oct 21 2026: hides a page's add form behind one "➕ ..." button and
    // records it for the ☰ list (self._stockForm), so the list leads.
    _foldForm: function(container, els, focusEl, label, photo) {
      var self = RPGACE.modules.cookingOracle;
      // SL-0: the shared fold (RPGACE.sideList.foldForm), in Cooking's button style.
      var look = self.ui._mkBtn(label, 'secondary', { extra: 'width:100%;' });
      var reveal = RPGACE.sideList.foldForm(container, els, focusEl, label, { cls: 'co-add-toggle', style: look.style.cssText }).reveal;
      self._stockForm = { label: label.replace(/^➕\s*/, ''), reveal: reveal, photo: photo || null };
      return reveal;
    },

    _renderEquipmentTab: function(container) {
      var self = RPGACE.modules.cookingOracle;
      var loadingMsg = document.createElement('div');
      loadingMsg.style.cssText = 'font-size:12px;color:var(--muted);';
      loadingMsg.textContent = 'Loading equipment...';
      container.appendChild(loadingMsg);

      var addHeading = document.createElement('div');
      addHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin:16px 0 8px;';
      addHeading.textContent = 'Add equipment';

      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Equipment name (e.g. Baking trays)';
      nameInput.style.cssText = 'width:100%;margin-bottom:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;box-sizing:border-box;';

      var qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.placeholder = 'Quantity';
      qtyInput.value = '1';
      qtyInput.min = '1';
      qtyInput.style.cssText = 'width:100%;margin-bottom:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;box-sizing:border-box;';

      var errBox = document.createElement('div');
      errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:8px;display:none;';

      var addBtn = self.ui._mkBtn('+ Add equipment', 'primary');

      var renderList = function() {
        self.logic._loadEquipment(function(rows, err) {
          if (err) {
            loadingMsg.textContent = '⚠️ Could not load equipment: ' + (err.message || 'unknown error');
            return;
          }
          if (loadingMsg.parentNode) loadingMsg.remove();
          Array.prototype.slice.call(container.querySelectorAll('.equip-row')).forEach(function(el) { el.remove(); });
          (rows || []).forEach(function(r) {
            var row = document.createElement('div');
            row.className = 'equip-row';
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;';
            var lbl = document.createElement('span');
            lbl.textContent = r.name || '(unknown)';
            lbl.style.flex = '1';
            var right = document.createElement('span');
            right.style.cssText = 'color:var(--muted);white-space:nowrap;';
            right.textContent = '× ' + (r.quantity != null ? r.quantity : 1);
            row.appendChild(lbl);
            row.appendChild(right);

            var delBtn = self.ui._mkDeleteArmBtn(function(doneCb) {
              self.logic._deleteEquipment(r.id, function(err) {
                if (err) {
                  RPGACE.utils.toast('⚠️ Delete failed: ' + (err.message || 'unknown error'), '#CC4A4A', 3200);
                  doneCb(err);
                  return;
                }
                row.remove();
                doneCb(null);
              });
            });
            row.appendChild(delBtn);
            container.insertBefore(row, listEnd);
          });
          if (!rows || !rows.length) {
            var empty = document.createElement('div');
            empty.className = 'equip-row';
            empty.style.cssText = 'font-size:12px;color:var(--muted);';
            empty.textContent = 'Nothing tracked yet — add equipment above.';
            container.insertBefore(empty, listEnd);
          }
        });
      };

      var addBox = document.createElement('div');
      addBox.className = 'co-add-box';
      addBox.style.marginBottom = '10px';
      var formWrap = document.createElement('div');
      addBox.appendChild(addHeading);
      formWrap.appendChild(nameInput);
      formWrap.appendChild(qtyInput);
      formWrap.appendChild(errBox);
      formWrap.appendChild(addBtn);
      addBox.appendChild(formWrap);
      container.insertBefore(addBox, container.firstChild);
      var listEnd = document.createElement('div');
      container.appendChild(listEnd);
      self.ui._foldForm(addBox, [addHeading, formWrap], nameInput, '➕ Add equipment');

      addBtn.onclick = function() {
        var name = nameInput.value.trim();
        var qty = parseInt(qtyInput.value, 10);
        if (!name || isNaN(qty) || qty < 1) {
          errBox.textContent = '⚠️ Enter a name and a real quantity';
          errBox.style.display = 'block';
          return;
        }
        errBox.style.display = 'none';
        addBtn.disabled = true;
        self.logic._saveEquipment(name, qty, function(err) {
          addBtn.disabled = false;
          if (err) {
            errBox.textContent = '⚠️ ' + (err.message || 'save failed');
            errBox.style.display = 'block';
            return;
          }
          nameInput.value = ''; qtyInput.value = '1';
          RPGACE.utils.toast('🍳 Equipment updated', '#4caf82', 2000);
          renderList();
        });
      };

      renderList();
    },

    _showShoppingList: function(listId, opts) {
      var self = RPGACE.modules.cookingOracle;
      opts = opts || {};
      var pop = RPGACE.modules.dashDeck._popup({
        width: '560px', scroll: true, eyebrow: '🛒 SHOPPING LIST', title: opts.title || 'Ingredients for this cook',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      // Oct 10 2026 (P1): non-food items go to the Shopping Wishlist.
      if (RPGACE.modules.pathways) RPGACE.modules.pathways.wishlistLink(pop);
      // Oct 21 2026: 📦 Stock moved into ☰; the Wishlist add sits there too.
      var wish = pop.overlay.querySelector('.pw-wish-wrap');
      if (wish) wish.hidden = true;
      pop.overlay._sideExtras = function() {
        if (!wish) return [];
        return [['🛒', 'Add a non-food item to your Wishlist', function() {
          wish.hidden = false;
          var b = wish.querySelector('button'); if (b && b.style.display !== 'none') b.click();
          if (wish.scrollIntoView) wish.scrollIntoView({ block: 'center' });
        }, 'wish']];
      };
      var box = pop.box;
      var loadingMsg = document.createElement('div');
      loadingMsg.style.cssText = 'font-size:12px;color:var(--muted);';
      loadingMsg.textContent = 'Loading list...';
      box.appendChild(loadingMsg);

      var renderItems = function() {
        // H18 (Sep 16 2026) — real, superseding rewrite of this list's own
        // colour language (rule 8, see logic._classifyIngredientStatus for
        // the full 5-color rules + /interrogation record). Loads a live
        // pantry snapshot ALONGSIDE this list's own persisted needed/have
        // amounts (the snapshot only supplies the aisleIndex a blue-
        // alternative check needs — the have/needed numbers themselves stay
        // the real, frozen-at-generation-time values this list was always
        // built from, never silently re-computed from current pantry).
        Promise.all([
          RPGACE.sb.select('shopping_list_items', 'select=id,ingredient_id,needed_amount,needed_unit,have_amount,to_buy_amount,bought,in_basket,ingredients(name)&list_id=eq.' + listId + '&order=bought.asc'),
          new Promise(function(resolve) { self.logic._loadPantrySummed(function(snapshot) { resolve(snapshot); }); }),
          RPGACE.sb.select('shopping_lists', 'select=shop_mode&id=eq.' + listId + '&limit=1').catch(function() { return []; }),
          // H24 (Sep 17 2026, 2nd pass) — real confirmed-substitutions
          // snapshot, same shared loader every real consumer of this
          // classification now uses (rule 8).
          new Promise(function(resolve) { self.logic._loadConfirmedSubs(function(map) { resolve(map); }); }),
          // H24 (6th pass) — real substitution ratings, same shared
          // loader every real consumer now uses (rule 8).
          new Promise(function(resolve) { self.logic._loadSubstitutionRatings(function(map) { resolve(map); }); }),
        ])
          .then(function(results) {
            var rows = results[0];
            var pantry = results[1];
            var listRow = results[2] && results[2][0];
            var subRatings = results[4] || {};
            var confirmedSubs = results[3] || {};
            box.innerHTML = ''; // full re-render each time — keeps this simple and correct

            // H21 (Sep 17 2026) — a real, honest note when THIS list was
            // generated under No-Shop mode — explains why some genuinely
            // missing (but separable) ingredients never made it onto the
            // list at all (see logic._generateShoppingList's own filter).
            if (listRow && listRow.shop_mode === 'no_shop') {
              var noShopNote = document.createElement('div');
              noShopNote.style.cssText = 'font-size:13px;color:#8B5E3C;background:rgba(139,94,60,0.08);border:1px solid rgba(139,94,60,0.3);border-radius:6px;padding:6px 10px;margin-bottom:12px;';
              noShopNote.textContent = '🟤 No-shop mode — omittable ingredients were left off this list.';
              box.appendChild(noShopNote);
            }

            // Oct 12 2026 — "next time I'm shopping" routines from My Day.
            if (RPGACE.modules.myDay) RPGACE.modules.myDay.ui.appendShopping(box);

            var needHeading = document.createElement('div');
            needHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
            needHeading.textContent = '🛒 Need to buy before this cook';
            box.appendChild(needHeading);

            // H22 (Sep 17 2026, real Alex ask: "while shopping for current
            // list, make the buy buttons next to each ingredient say added
            // to basket, which will keep it in a found state table, then
            // after once receipt is made and produce is paid for, I click
            // bought and enter details") — a genuinely missing THIRD real
            // state between "still need to find it" and "bought" (needed
            // once + paid for), matching how a real shop trip actually
            // works: items get found and physically put in the trolley
            // well before there's a real receipt/price to log. Not yet
            // in_basket AND not yet bought is the only real "still to find"
            // state now — an in_basket item moves to its own bucket below.
            var needRows = (rows || []).filter(function(r) { return !r.bought && !r.in_basket && (r.to_buy_amount || 0) > 0; });
            if (!needRows.length) {
              var doneMsg = document.createElement('div');
              doneMsg.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:14px;';
              doneMsg.textContent = 'Nothing left to find on this list.';
              box.appendChild(doneMsg);
            }
            // H13 (Sep 16 2026) - auto-sorted by aisle (self.logic._classifyAisle,
            // a real Alex ask: "too much scrolling and calculating needed" while
            // shopping off a flat, unordered list) instead of the old plain
            // needRows.forEach. Real, checkable sort: aisle walk-order first
            // (groups renders in one real physical shop-walk sequence), then
            // ingredient name within an aisle, so re-renders after a "Mark
            // bought" never visibly reshuffle the remaining rows.
            needRows.forEach(function(r) {
              var name = (r.ingredients && r.ingredients.name) || '';
              r._aisle = self.logic._classifyAisle(name);
              r._status = self.logic._classifyIngredientStatus({ name: name, needed: r.needed_amount, have: r.have_amount, aisleIndex: pantry.aisleIndex });
            });
            needRows.sort(function(a, b) {
              if (a._aisle.order !== b._aisle.order) return a._aisle.order - b._aisle.order;
              var an = (a.ingredients && a.ingredients.name) || '';
              var bn = (b.ingredients && b.ingredients.name) || '';
              return an.localeCompare(bn);
            });
            var currentAisle = null;
            needRows.forEach(function(r) {
              if (r._aisle.name !== currentAisle) {
                currentAisle = r._aisle.name;
                var aisleHeading = document.createElement('div');
                aisleHeading.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:var(--muted);margin:10px 0 4px;';
                aisleHeading.textContent = '📍 ' + currentAisle;
                box.appendChild(aisleHeading);
              }
              // H18 (Sep 16 2026) — real 5-color status (red/yellow/blue all
              // land here, individually distinguished — see
              // logic._classifyIngredientStatus), replacing the old flat
              // single-gold treatment every row in this bucket used to get.
              var meta = self.INGREDIENT_STATUS_META[r._status] || self.INGREDIENT_STATUS_META.red;
              var wrap = document.createElement('div');
              wrap.style.cssText = 'margin-bottom:5px;';
              var row = document.createElement('div');
              row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-left:3px solid ' + meta.color + ';background:' + meta.bg + ';border-radius:0 5px 5px 0;font-size:13px;';
              var lbl = document.createElement('span');
              lbl.style.cssText = 'color:' + meta.color + ';';
              lbl.title = meta.label;
              var ingName = (r.ingredients && r.ingredients.name) || '?';
              // H24 (Sep 17 2026, 3rd pass) — real, deliberate correction,
              // Alex's own direct words: "keeping colours as is... a tick
              // on the left" — a confirmed substitution renders with a ✓
              // prefix, never a color change (see
              // logic._classifyIngredientStatus's own comment for the
              // full reasoning).
              var subName = null, subConfirmed = false;
              if (r._status === 'orange') {
                var sub = self.logic._findSubstitute(ingName, pantry.aisleIndex, r.ingredient_id, subRatings);
                if (sub) { subName = sub.name; subConfirmed = !!confirmedSubs[r.ingredient_id + '::' + subName]; }
              }
              // H24 (Sep 17 2026, 8th pass, real Alex ask) — same
              // unambiguous "X more" wording fix as the Schedule
              // Preview's own buyBefore text (rule 8, same real fix
              // applied everywhere this pattern renders).
              var lblText = (subConfirmed ? '✓ ' : '') + meta.icon + ' ' + ingName + (r.have_amount > 0
                ? (' — need ' + r.to_buy_amount + ' more ' + (r.needed_unit || '') + ' (have ' + r.have_amount + ', ' + r.needed_amount + ' total needed)')
                : (' — need ' + r.to_buy_amount + ' ' + (r.needed_unit || '')));
              if (subName) lblText += ' — have a substitute in stock: ' + subName;
              lbl.textContent = lblText;
              // H22 (Sep 17 2026) — real, honest 2-step shopping flow: this
              // button no longer opens the price popup directly (no real
              // receipt exists yet while still walking the aisles) — it
              // just marks the item physically found, moving it into the
              // real "In basket" bucket below. Logging the actual price
              // paid stays a SEPARATE, later action once there's a real
              // receipt to enter (rule 7 — never invent purchase data that
              // doesn't exist yet).
              var btn = self.ui._mkBtn('🧺 Add to basket', 'inline', { color: meta.color, bg: meta.bg, borderColor: meta.color });
              btn.onclick = function() {
                btn.disabled = true;
                // H23 (Sep 17 2026) — real fix, same session's own
                // GODMODE evidence pass caught its own bug: every OTHER
                // async button in this module uses the established
                // "⏳ <verb>..." loading-text convention; this one had
                // shipped with a bare "…" instead.
                btn.textContent = '⏳ Adding...';
                RPGACE.sb.secureWrite('shopping_list_items', 'update', { in_basket: true }, 'id=eq.' + r.id)
                  .then(function() {
                    RPGACE.utils.toast('🧺 Added to basket: ' + ingName, 'rgba(226,226,236,0.5)', 1800);
                    renderItems();
                  })
                  .catch(function(e) {
                    btn.disabled = false;
                    btn.textContent = '🧺 Add to basket';
                    RPGACE.utils.toast('⚠️ Could not add to basket: ' + (e.message || 'unknown error'), '#CC4A4A', 3200);
                  });
              };
              row.appendChild(lbl);
              row.appendChild(btn);
              wrap.appendChild(row);
              // H24 (Sep 17 2026, 2nd/3rd pass, real Alex ask: "when
              // orange substitution or blue is presented, give me an
              // option to confirm") — real, persisted confirm
              // (logic._confirmSubstitution, rule 8 — same one write path
              // the schedule preview's own confirm button uses). This
              // list already re-renders in full on any successful write
              // (this function's own established convention, see its
              // opening comment) — the real ✓ tick above (subConfirmed)
              // is what shows the agreed state after that re-render, the
              // status color itself never changes (Alex's own direct
              // 3rd-pass correction).
              if (r._status === 'orange' && subName && !subConfirmed) {
                var confirmBtn = self.ui._mkBtn('✓ Use ' + subName + ' instead', 'small', { extra: 'margin-top:4px;', color: 'var(--green)', borderColor: 'rgba(76,175,130,.35)' });
                confirmBtn.onclick = function() {
                  confirmBtn.disabled = true;
                  confirmBtn.textContent = '⏳ Saving...';
                  self.logic._confirmSubstitution(r.ingredient_id, subName, function(err) {
                    if (err) {
                      confirmBtn.disabled = false;
                      confirmBtn.textContent = '✓ Use ' + subName + ' instead';
                      RPGACE.utils.toast('⚠️ Could not save: ' + err, '#CC4A4A', 3200);
                      return;
                    }
                    RPGACE.utils.toast('✅ Agreed — ' + ingName + ' will show a tick for this substitution from now on', '#4caf82', 3200);
                    renderItems();
                  });
                };
                wrap.appendChild(confirmBtn);
              } else if (r._status === 'orange' && subName && subConfirmed) {
                var subNote = document.createElement('div');
                subNote.style.cssText = 'font-size:12px;color:var(--muted);margin-top:3px;';
                subNote.textContent = '✓ Agreed substitution — using ' + subName;
                wrap.appendChild(subNote);
              }
              box.appendChild(wrap);
            });

            // H22 (Sep 17 2026) — the real "found state table" Alex asked
            // for: items physically in the trolley, not yet checked out.
            // Sorted by name only (not aisle — the real shop-walk ordering
            // need is already done once an item lands here; what matters
            // now is finding it quickly in a growing basket list).
            var basketRows = (rows || []).filter(function(r) { return !r.bought && r.in_basket; })
              .sort(function(a, b) { return ((a.ingredients && a.ingredients.name) || '').localeCompare((b.ingredients && b.ingredients.name) || ''); });
            if (basketRows.length) {
              var basketHeading = document.createElement('div');
              basketHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4A9FCC;margin:16px 0 8px;';
              basketHeading.textContent = '🧺 In basket — ready to check out';
              box.appendChild(basketHeading);
              basketRows.forEach(function(r) {
                var name = (r.ingredients && r.ingredients.name) || '?';
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:6px;padding:7px 10px;border-left:3px solid #4A9FCC;background:rgba(74,159,204,0.07);border-radius:0 5px 5px 0;margin-bottom:5px;font-size:13px;';
                var lbl2 = document.createElement('span');
                lbl2.style.cssText = 'color:#4A9FCC;flex:1;';
                lbl2.textContent = '🧺 ' + name + ' — ' + r.to_buy_amount + ' ' + (r.needed_unit || '');
                row.appendChild(lbl2);

                // Real, deliberate undo — a genuine mis-tap (or a plan
                // change at the shop) shouldn't be permanent; matches this
                // project's own standing "reversible where it costs
                // nothing" discipline.
                var undoBtn = self.ui._mkBtn('↩', 'iconGhost', { title: 'Remove from basket' });
                undoBtn.onclick = function() {
                  undoBtn.disabled = true;
                  RPGACE.sb.secureWrite('shopping_list_items', 'update', { in_basket: false }, 'id=eq.' + r.id)
                    .then(function() { renderItems(); })
                    .catch(function(e) {
                      undoBtn.disabled = false;
                      RPGACE.utils.toast('⚠️ Could not remove from basket: ' + (e.message || 'unknown error'), '#CC4A4A', 3200);
                    });
                };

                // The real, ONE place a purchase actually gets logged (rule
                // 8) — unchanged from before, just moved here since this is
                // now the real point in the flow where a receipt exists.
                var boughtBtn = self.ui._mkBtn('✅ Bought', 'inline', { color: 'var(--green)', bg: 'rgba(76,175,130,0.12)', borderColor: 'rgba(76,175,130,0.35)' });
                boughtBtn.onclick = function() { self.ui._showPriceEntryPopup(r, renderItems); };

                row.appendChild(undoBtn);
                row.appendChild(boughtBtn);
                box.appendChild(row);
              });
            }

            // H18 (Sep 16 2026) — the old flat "Already have enough" bucket
            // now splits into real green (plenty) vs. real purple (will run
            // low — Alex's own explicit "consideration after planned shop,
            // not before" rule), instead of treating every already-covered
            // ingredient identically.
            var haveOnlyRows = (rows || []).filter(function(r) { return !r.bought && (r.to_buy_amount || 0) <= 0; });
            haveOnlyRows.forEach(function(r) {
              var name = (r.ingredients && r.ingredients.name) || '';
              r._status = self.logic._classifyIngredientStatus({ name: name, needed: r.needed_amount, have: r.have_amount, aisleIndex: pantry.aisleIndex });
            });
            var plentyRows = haveOnlyRows.filter(function(r) { return r._status !== 'purple'; });
            var lowRows = haveOnlyRows.filter(function(r) { return r._status === 'purple'; });

            if (plentyRows.length) {
              var haveHeading = document.createElement('div');
              haveHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--green);margin:16px 0 8px;';
              haveHeading.textContent = '📦 Already have enough';
              box.appendChild(haveHeading);
              plentyRows.forEach(function(r) {
                var name = (r.ingredients && r.ingredients.name) || '?';
                box.appendChild(self.ui._renderIngredientStatusRow(name + ' — have ' + r.have_amount + ' ' + (r.needed_unit || ''), 'green'));
              });
            }

            if (lowRows.length) {
              var lowHeading = document.createElement('div');
              lowHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9B59B6;margin:16px 0 8px;';
              lowHeading.textContent = '🟣 Will run low — restock on your NEXT shop, after this cook';
              box.appendChild(lowHeading);
              lowRows.forEach(function(r) {
                var name = (r.ingredients && r.ingredients.name) || '?';
                box.appendChild(self.ui._renderIngredientStatusRow(name + ' — have ' + r.have_amount + ' ' + (r.needed_unit || ''), 'purple'));
              });
            }

            var boughtRows = (rows || []).filter(function(r) { return r.bought; });
            if (boughtRows.length) {
              var boughtHeading = document.createElement('div');
              boughtHeading.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px;';
              boughtHeading.textContent = 'Already bought';
              box.appendChild(boughtHeading);
              boughtRows.forEach(function(r) {
                var row = document.createElement('div');
                row.style.cssText = 'font-size:12px;color:var(--muted);padding:4px 0;';
                row.textContent = '✅ ' + ((r.ingredients && r.ingredients.name) || '?');
                box.appendChild(row);
              });
            }
            // Oct 21 2026: one tap ends the trip (logic._finishShopping).
            var basketN = (rows || []).filter(function(r) { return r.in_basket && !r.bought; }).length;
            var leftN = (rows || []).filter(function(r) { return !r.in_basket && !r.bought && (r.to_buy_amount || 0) > 0; }).length;
            var doneBtn = self.ui._mkBtn('✅ Done shopping', 'primary', { extra: 'width:100%;margin-top:18px;' });
            doneBtn.classList.add('co-done-shopping');
            doneBtn.onclick = function() { self.ui._confirmDoneShopping(listId, basketN, leftN, function() { pop.close(); }); };
            box.appendChild(doneBtn);
          })
          .catch(function(e) {
            box.innerHTML = '';
            box.appendChild(self.ui._errNode('Could not load shopping list: ' + (e.message || 'unknown error')));
          });
      };
      renderItems();
    },

    _confirmDoneShopping: function(listId, basketN, leftN, onClosed) {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({ width: '420px', eyebrow: '🛒 DONE SHOPPING', title: 'Finish this list?', borderColor: 'rgba(76,175,130,0.3)' });
      var p = function(t) { var d = document.createElement('div'); d.style.cssText = 'font-size:14px;line-height:1.5;margin-bottom:8px;color:var(--text);'; d.textContent = t; pop.box.appendChild(d); return d; };
      var add = true;
      if (basketN) {
        var lab = document.createElement('label');
        lab.style.cssText = 'display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.4;margin-bottom:10px;min-height:44px;cursor:pointer;';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.id = 'co-done-addstock'; cb.style.cssText = 'width:22px;height:22px;flex:none;margin-top:1px;';
        cb.onchange = function() { add = cb.checked; };
        var t = document.createElement('span'); t.textContent = 'Add the ' + basketN + ' basket item' + (basketN === 1 ? '' : 's') + ' to stock (untick if you already updated stock by hand)';
        lab.appendChild(cb); lab.appendChild(t); pop.box.appendChild(lab);
      } else p('Nothing is in the basket.');
      p(leftN ? leftN + ' item' + (leftN === 1 ? '' : 's') + ' not found will move to your Top-up list for next time.' : 'Everything on the list is covered.');
      var go = self.ui._mkBtn('✅ Finish list', 'primary', { extra: 'width:100%;margin-top:6px;' });
      go.id = 'co-done-go';
      go.onclick = function() {
        go.disabled = true; go.textContent = '⏳ Finishing...';
        self.logic._finishShopping(listId, add, function(err, res) {
          if (err) { go.disabled = false; go.textContent = '✅ Finish list'; RPGACE.utils.toast('⚠️ Could not finish the list: ' + err, '#CC4A4A', 3600); return; }
          var bits = [];
          if (res.stocked) bits.push(res.stocked + ' added to stock');
          if (res.moved) bits.push(res.moved + ' moved to Top-up');
          if (res.skipped.length) bits.push('not stocked: ' + res.skipped.join(', '));
          RPGACE.utils.toast('🛒 ' + (res.closed ? 'List finished' : 'Basket checked out') + (bits.length ? ' — ' + bits.join(' · ') : ''), res.skipped.length ? '#E2A83D' : '#4caf82', 4200);
          pop.close(); if (onClosed) onClosed();
        });
      };
      pop.box.appendChild(go);
    },

    // H18 (Sep 16 2026, real Alex ask: "now i can look for recipes that
    // will only give me purple or green ingredients so i can have perfect
    // recipes with my context") — real "what's makeable right now" finder.
    // Every saved recipe gets classified live (logic._findMakeableRecipes,
    // reusing the SAME shared classifier + pantry snapshot every other
    // real 5-color surface uses, rule 8) — makeable (all green/purple)
    // recipes sort first, everything else stays visible underneath with
    // an honest per-recipe colour-count summary so a "close but for one
    // red ingredient" recipe is never hidden, just correctly ranked lower.
    _showStockMatchFinder: function() {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '560px', scroll: true, eyebrow: '🍳 COOKING', title: 'What can I cook right now?',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;
      var loadingMsg = document.createElement('div');
      loadingMsg.style.cssText = 'font-size:12px;color:var(--muted);';
      loadingMsg.textContent = 'Checking your saved recipes against current stock...';
      box.appendChild(loadingMsg);

      var genBtn = self.ui._mkBtn('✨ Or generate a new one using only what I have', 'primary', { extra: 'margin-bottom:14px;' });
      genBtn.onclick = function() {
        pop.close();
        self.logic._loadConfig(function(cfg) { self.ui._showGenerateForm(cfg || {}, null, true); });
      };
      box.appendChild(genBtn);

      var listBox = document.createElement('div');
      box.appendChild(listBox);

      self.logic._findMakeableRecipes(function(err, results) {
        loadingMsg.remove();
        if (err) { listBox.appendChild(self.ui._errNode('Could not check saved recipes: ' + err)); return; }
        if (!results.length) {
          var noneMsg = document.createElement('div');
          noneMsg.style.cssText = 'font-size:12px;color:var(--muted);';
          noneMsg.textContent = 'No saved recipes yet — generate and save one first.';
          listBox.appendChild(noneMsg);
          return;
        }
        results.sort(function(a, b) {
          if (a.makeable !== b.makeable) return a.makeable ? -1 : 1;
          var aBad = a.counts.red + a.counts.yellow + a.counts.blue;
          var bBad = b.counts.red + b.counts.yellow + b.counts.blue;
          if (aBad !== bBad) return aBad - bBad;
          return a.title.localeCompare(b.title);
        });
        results.forEach(function(rec) {
          var borderColor = rec.makeable ? 'var(--green)' : 'var(--border)';
          var row = self.ui._mkBtn('', 'recipeCard', { extra: 'border:1px solid ' + borderColor + ';border-left:3px solid ' + borderColor + ';' });
          var top = document.createElement('div');
          top.textContent = (rec.makeable ? '✅ ' : '') + rec.title;
          row.appendChild(top);
          var summary = document.createElement('div');
          summary.style.cssText = 'font-size:13px;font-weight:400;color:var(--muted);margin-top:3px;';
          var parts = [];
          ['green', 'purple', 'blue', 'yellow', 'red'].forEach(function(status) {
            if (rec.counts[status]) parts.push(self.INGREDIENT_STATUS_META[status].icon + ' ' + rec.counts[status]);
          });
          summary.textContent = rec.makeable ? 'Nothing to buy before cooking this' : (parts.join('  ') + ' ingredients');
          row.appendChild(summary);
          row.onclick = function() {
            self.logic._loadSavedRecipe(rec.id, function(loadErr, recipe) {
              if (loadErr) { RPGACE.utils.toast('⚠️ ' + loadErr, '#CC4A4A', 3000); return; }
              pop.close();
              self.ui._showRecipeCard(recipe, null, rec.id);
            });
          };
          listBox.appendChild(row);
        });
      });
    },

    // Real, evidence-resolved fork (section 2, Q2): "One but with pop up to
    // show selected, but with redo button if I find something better" — one
    // combined tick-bought -> price-entry flow, never a second screen.
    // Nothing writes until Confirm — Redo just clears the just-entered
    // fields so a better find at the shop can be re-entered cleanly.
    // ── CR-2 (Oct 14 2026) — "Cook finished → take it out of stock" ────
    // One preview for every finish path (logic._finishCook calls this).
    // plannedCookId may be null (a single recipe's Cook Mode): then there is
    // no cook row to record the change on, so no undo — the popup says so.
    _offerStockUpdate: function(plannedCookId, recipeIds, opts) {
      var self = RPGACE.modules.cookingOracle;
      opts = opts || {};
      self._stockOffer = self._stockOffer || {};
      var lockKey = plannedCookId || ('recipes:' + (recipeIds || []).join(','));
      if (self._stockOffer[lockKey]) return;
      self._stockOffer[lockKey] = true;
      var release = function() { delete self._stockOffer[lockKey]; };
      var getIds = plannedCookId
        ? RPGACE.sb.select('planned_cooks', 'select=recipe_ids,stock_deducted&id=eq.' + plannedCookId + '&limit=1').then(function(rows) {
            var pc = rows && rows[0];
            if (!pc) return null;
            if (pc.stock_deducted) return null; // already taken out once — never twice
            return (recipeIds && recipeIds.length) ? recipeIds : (pc.recipe_ids || []);
          })
        : Promise.resolve(recipeIds || []);
      getIds.then(function(ids) {
        if (!ids || !ids.length) { release(); return; }
        self.logic._planDeduction(ids, function(err, lines) {
          if (err) { release(); RPGACE.utils.toast('⚠️ Could not work out what to take out of stock: ' + err, '#CC4A4A', 4000); return; }
          if (opts.scale && opts.scale !== 1) {
            lines.forEach(function(l) { l.amount = Math.round(l.amount * opts.scale * 100) / 100; l.takes.forEach(function(t) { t.take = Math.round(Math.min(t.have, t.take * opts.scale) * 100) / 100; }); });
          }
          var usable = lines.filter(function(l) { return l.takes.length; });
          if (!usable.length) { release(); RPGACE.utils.toast('🍽 Cook finished — none of its ingredients are in your stock list', '#4caf82', 3200); return; }
          if (opts.instant) { self.ui._applyStockInstant(plannedCookId, lines, release); return; }
          self.ui._renderStockOffer(plannedCookId, lines, release);
        });
      }).catch(function(e) { release(); RPGACE.utils.toast('⚠️ ' + (e.message || 'could not load the cook'), '#CC4A4A', 3500); });
    },

    // CM-2 (Oct 15 2026, Alex: "Instant, with Undo"): an actual cook takes
    // everything out at once, then shows what changed with Put it all back,
    // and names anything that could not be taken out.
    _applyStockInstant: function(plannedCookId, lines, release) {
      var self = RPGACE.modules.cookingOracle;
      var takes = [];
      lines.forEach(function(l) {
        l.takes.forEach(function(t) {
          if (t.take > 0) takes.push({ ingredient_id: l.ingredient_id, name: l.name, location: t.location, unit: t.unit, take: t.take, amount: l.amount, recipeUnit: l.unit });
        });
      });
      var pop = RPGACE.modules.dashDeck._popup({
        width: '480px', scroll: true, eyebrow: '🍽 COOK FINISHED', title: 'Taken out of stock',
        borderColor: 'rgba(76,175,130,0.3)', onClose: release,
      });
      pop.box.classList.add('co-stock-instant');
      pop.box.textContent = '⏳ Updating stock...';
      self.logic._applyDeduction(plannedCookId, takes, function(e, done) {
        done = done || [];
        if (e && !done.length) { pop.box.textContent = '⚠️ Stock not changed: ' + e; return; }
        if (e) RPGACE.utils.toast('⚠️ ' + e, '#CC4A4A', 4500);
        self.ui._renderStockResult(pop, plannedCookId, done, takes);
        var skipped = lines.filter(function(l) { return !l.takes.length; });
        if (skipped.length) {
          var sk = document.createElement('div');
          sk.className = 'co-stock-skipped';
          sk.style.cssText = 'font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5;';
          sk.textContent = 'Not taken out: ' + skipped.map(function(l) {
            return l.name + (l.status === 'unconvertible' ? ' (stock is in a different unit)' : ' (not in stock)');
          }).join(', ') + '.';
          pop.box.insertBefore(sk, pop.box.children[1] || null);
        }
      });
    },

    _renderStockOffer: function(plannedCookId, lines, release) {
      var self = RPGACE.modules.cookingOracle;
      var LOC = { pantry: '🥫 pantry', fridge: '🧊 fridge', freezer: '❄️ freezer' };
      var pop = RPGACE.modules.dashDeck._popup({
        width: '480px', scroll: true, eyebrow: '🍽 COOK FINISHED', title: 'Take what you used out of stock?',
        borderColor: 'rgba(76,175,130,0.3)', onClose: release,
      });
      var box = pop.box;
      box.classList.add('co-stock-offer');
      var intro = document.createElement('div');
      intro.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      intro.textContent = plannedCookId
        ? 'Change any amount, untick anything you didn\'t use. You can put it all back afterwards.'
        : 'Change any amount, untick anything you didn\'t use. (This recipe wasn\'t a planned cook, so there\'s no undo afterwards.)';
      box.appendChild(intro);
      var rows = [];
      lines.filter(function(l) { return l.takes.length; }).forEach(function(l) {
        l.takes.forEach(function(t) {
          var row = document.createElement('label');
          row.className = 'co-take-row';
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;color:var(--text);';
          var cb = document.createElement('input');
          cb.type = 'checkbox'; cb.checked = true;
          cb.style.cssText = 'width:20px;height:20px;flex-shrink:0;';
          var name = document.createElement('span');
          name.style.cssText = 'flex:1;min-width:0;';
          name.textContent = l.name + (l.status === 'short' ? ' (you had less than the recipe uses)' : '');
          var amt = document.createElement('input');
          amt.type = 'number'; amt.min = '0'; amt.step = 'any'; amt.value = String(t.take);
          amt.setAttribute('aria-label', 'Amount of ' + l.name + ' to take out');
          amt.style.cssText = 'width:80px;min-height:40px;padding:6px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-size:14px;';
          var unit = document.createElement('span');
          unit.style.cssText = 'font-size:13px;color:var(--muted);white-space:nowrap;';
          unit.textContent = (t.unit || '') + ' from ' + (LOC[t.location] || t.location) + ' (have ' + t.have + ')';
          row.appendChild(cb); row.appendChild(name); row.appendChild(amt); row.appendChild(unit);
          box.appendChild(row);
          rows.push({ cb: cb, amt: amt, line: l, take: t });
        });
      });
      var skipped = lines.filter(function(l) { return !l.takes.length; });
      if (skipped.length) {
        var sk = document.createElement('div');
        sk.style.cssText = 'font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5;';
        sk.textContent = 'Not taken out: ' + skipped.map(function(l) {
          return l.name + (l.status === 'unconvertible' ? ' (stock is in a different unit with no weight to convert)' : ' (not in stock)');
        }).join(', ') + '.';
        box.appendChild(sk);
      }
      var err = document.createElement('div');
      err.style.cssText = 'font-size:13px;color:#CC4A4A;margin-top:8px;display:none;';
      box.appendChild(err);
      var btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;';
      var go = self.ui._mkBtn('✅ Take out of stock', 'primary', { extra: 'flex:2;' });
      go.classList.add('co-take-go');
      var leave = self.ui._mkBtn('Leave stock as it is', 'ghost', { extra: 'flex:1;' });
      leave.onclick = function() { pop.close(); };
      go.onclick = function() {
        var takes = rows.filter(function(r) { return r.cb.checked; }).map(function(r) {
          var v = parseFloat(r.amt.value);
          return { ingredient_id: r.line.ingredient_id, name: r.line.name, location: r.take.location, unit: r.take.unit, take: isNaN(v) ? 0 : Math.max(0, v), amount: r.line.amount, recipeUnit: r.line.unit };
        }).filter(function(t) { return t.take > 0; });
        if (!takes.length) { pop.close(); return; }
        go.disabled = true; leave.disabled = true; go.textContent = '⏳ Updating stock...';
        var after = function(e, done) {
          if (e && !(done && done.length)) { go.disabled = false; leave.disabled = false; go.textContent = '✅ Take out of stock'; err.textContent = '⚠️ ' + e; err.style.display = 'block'; return; }
          if (e) RPGACE.utils.toast('⚠️ ' + e, '#CC4A4A', 4500);
          self.ui._renderStockResult(pop, plannedCookId, done, takes);
        };
        if (plannedCookId) self.logic._applyDeduction(plannedCookId, takes, after);
        else self.logic._applyDeduction(null, takes, after);
      };
      btns.appendChild(go); btns.appendChild(leave);
      box.appendChild(btns);
    },

    // After the deduction: what changed, undo, and anything that ran out
    // offered onto the top-up grocery list.
    _renderStockResult: function(pop, plannedCookId, done, takes) {
      var self = RPGACE.modules.cookingOracle;
      var box = pop.box;
      box.innerHTML = '';
      var head = document.createElement('div');
      head.style.cssText = 'font-size:15px;font-weight:700;color:var(--green);margin-bottom:8px;';
      head.textContent = '📦 Stock updated — ' + done.length + ' item' + (done.length === 1 ? '' : 's') + ' taken out';
      box.appendChild(head);
      done.forEach(function(d) {
        var r = document.createElement('div');
        r.style.cssText = 'font-size:13px;color:var(--text);padding:3px 0;';
        r.textContent = d.name + ': −' + d.took + ' ' + (d.unit || '') + ' (' + d.left + ' left in ' + d.location + ')';
        box.appendChild(r);
      });
      var out = done.filter(function(d) { return !(d.left > 0); });
      var picks = [];
      if (out.length) {
        var oh = document.createElement('div');
        oh.style.cssText = 'font-size:14px;font-weight:700;color:#E2A83D;margin:14px 0 6px;';
        oh.textContent = '⚠️ Now run out';
        box.appendChild(oh);
        out.forEach(function(d) {
          var lab = document.createElement('label');
          lab.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text);min-height:40px;';
          var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.style.cssText = 'width:20px;height:20px;';
          lab.appendChild(cb); lab.appendChild(document.createTextNode(d.name));
          box.appendChild(lab);
          picks.push({ cb: cb, d: d });
        });
        var add = self.ui._mkBtn('🛒 Add to top-up grocery list', 'primary', { extra: 'margin-top:8px;width:100%;' });
        add.classList.add('co-topup-add');
        add.onclick = function() {
          var items = picks.filter(function(p) { return p.cb.checked; }).map(function(p) { return { ingredient_id: p.d.ingredient_id, amount: p.d.took, unit: p.d.unit }; });
          if (!items.length) return;
          add.disabled = true;
          self.logic._addToTopUpList(items, function(e, listId, n) {
            if (e) { add.disabled = false; RPGACE.utils.toast('⚠️ ' + e, '#CC4A4A', 4000); return; }
            add.textContent = n ? ('✓ ' + n + ' added to your top-up list') : '✓ Already on your top-up list';
            var open = self.ui._mkBtn('Open top-up list', 'secondary', { extra: 'margin-top:8px;width:100%;' });
            open.onclick = function() { pop.close(); self.ui._showShoppingList(listId, { title: 'Top-up list' }); };
            add.parentNode.insertBefore(open, add.nextSibling);
          });
        };
        box.appendChild(add);
      }
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;';
      if (plannedCookId) {
        var undo = self.ui._mkBtn('↩ Put it all back', 'ghost', { extra: 'flex:1;' });
        undo.classList.add('co-stock-undo');
        undo.onclick = function() {
          undo.disabled = true;
          self.logic._undoDeduction(plannedCookId, function(e, n) {
            if (e) { undo.disabled = false; RPGACE.utils.toast('⚠️ ' + e, '#CC4A4A', 4000); return; }
            RPGACE.utils.toast('↩ ' + n + ' item' + (n === 1 ? '' : 's') + ' put back in stock', '#4caf82', 3000);
            pop.close();
          });
        };
        row.appendChild(undo);
      }
      var stockBtn = self.ui._mkBtn('📦 See stock', 'secondary', { extra: 'flex:1;' });
      stockBtn.onclick = function() { pop.close(); self.ui._showCurrentStock(); };
      row.appendChild(stockBtn);
      box.appendChild(row);
    },

    // CM-1 (Oct 15 2026, Alex: "ask me if it was a preview or actual cook,
    // if actual cook... deduct it all, if not, leave as is"). Every Cook
    // Mode ending lands here. ctx: { pc (planned cook row) | recipeIds,
    // title, scale }; info from _openCookMode: { startedAt, endedAt,
    // clearProgress }. Actual cook = cooked + schedule + XP + journal +
    // out of draft sessions + stock out at once with Undo. Preview =
    // nothing changes. Not finished = keep the Cook Mode place.
    _askCookOutcome: function(ctx, info) {
      var self = RPGACE.modules.cookingOracle;
      info = info || { startedAt: Date.now(), endedAt: Date.now(), clearProgress: function() {} };
      // Oct 16 2026 DN-3: a cook started from Doing Now keeps that entry's start
      // time and that one Daily Schedule entry (ctx.agendaId), then tells it (onActual).
      if (ctx.startedAt) info = Object.assign({}, info, { startedAt: new Date(ctx.startedAt).getTime() });
      var pop = RPGACE.modules.dashDeck._popup({ width: '400px', eyebrow: '🍽 ALL STEPS DONE', title: 'Was that a real cook?', borderColor: 'rgba(76,175,130,0.3)' });
      pop.box.classList.add('co-cook-outcome');
      var note = document.createElement('div');
      note.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.45;';
      note.textContent = 'Actual cook takes the ingredients out of your stock straight away (you can put them back), marks it cooked and adds it to today. A preview changes nothing.';
      pop.box.appendChild(note);
      var actual = self.ui._mkBtn('✅ Actual cook — I made it', 'primary', { extra: 'width:100%;margin-bottom:8px;' });
      actual.classList.add('co-outcome-actual');
      var preview = self.ui._mkBtn('👀 Just a preview', 'secondary', { extra: 'width:100%;margin-bottom:8px;' });
      preview.classList.add('co-outcome-preview');
      var later = self.ui._mkBtn('⏸ Not finished yet', 'ghost', { extra: 'width:100%;' });
      later.classList.add('co-outcome-later');
      var err = document.createElement('div');
      err.style.cssText = 'font-size:13px;color:#CC4A4A;margin-top:8px;display:none;';
      var busy = function(on) { actual.disabled = on; preview.disabled = on; later.disabled = on; };
      var fail = function(e) { busy(false); actual.textContent = '✅ Actual cook — I made it'; err.textContent = '⚠️ ' + e; err.style.display = 'block'; };
      preview.onclick = function() { info.clearProgress(); pop.close(); RPGACE.utils.toast('👀 Preview — nothing changed', '#4a9eff', 2400); };
      later.onclick = function() { pop.close(); RPGACE.utils.toast('⏸ Your place is saved — reopen Cook Mode to carry on', '#E2A83D', 2800); };
      actual.onclick = function() {
        busy(true); actual.textContent = '⏳ Saving your cook...';
        var done = function() {
          info.clearProgress(); pop.close();
          self.ui._clearLiveCookIntervals && self.ui._clearLiveCookIntervals();
          var p = document.getElementById('live-cook-panel');
          if (p) p.remove();
        };
        if (ctx.pc && ctx.pc.id) {
          self.logic._finishCook(ctx.pc.id, ctx.pc.agenda_id, ctx.pc.recipe_ids, function(e) { if (e) { fail(e); return; } done(); }, { instant: true });
          return;
        }
        self.logic._recordUnplannedCook(ctx.recipeIds || [], ctx.title, info, function(e, pcId) {
          if (e) { fail(e); return; }
          done();
          RPGACE.utils.toast('✅ Cooked — added to today', '#4caf82', 2600);
          if (ctx.onActual) { try { ctx.onActual(pcId); } catch (x) { console.warn('[cookingOracle] onActual', x); } }
          self.ui._offerStockUpdate(pcId, ctx.recipeIds, { scale: ctx.scale, instant: true });
        }, { agendaId: ctx.agendaId || null });
      };
      pop.box.appendChild(actual); pop.box.appendChild(preview); pop.box.appendChild(later); pop.box.appendChild(err);
    },

    // Open a saved recipe straight in Cook Mode (My Recipes ▶ Cook now, Doing Now).
    // extra rides into _askCookOutcome's ctx (agendaId/startedAt/onActual for DN-3).
    cookRecipeNow: function(recipeId, extra, onOpened) {
      var self = RPGACE.modules.cookingOracle;
      self.logic._loadSavedRecipe(recipeId, function(err, recipe) {
        if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3000); return; }
        if (onOpened) onOpened(recipe);
        self.logic._noteGrams(recipe.ingredients);
        self.ui._openCookMode(self.logic._cookModeSteps(recipe.steps || [], 1, recipe.title), {
          title: recipe.title, key: 'recipe_' + recipeId,
          onDone: function(info) { self.ui._askCookOutcome(Object.assign({ recipeIds: [recipeId], title: recipe.title }, extra || {}), info); },
        });
      });
    },

    // Kept for any older caller: a planned cook's ending goes through the
    // same three-way question (CM-1).
    _askFinishCook: function(pc) {
      RPGACE.modules.cookingOracle.ui._askCookOutcome({ pc: pc, title: 'Cook session' });
    },

    // ── CR-4 (Oct 14 2026) — My Recipes: every saved recipe in one place ──
    _showMyRecipes: function() {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '560px', scroll: true, eyebrow: '📖 MY RECIPES', title: 'Your saved recipes',
        borderColor: 'rgba(76,175,130,0.3)',
      });
      var box = pop.box;
      box.classList.add('co-my-recipes');
      var top = document.createElement('div');
      top.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
      var search = document.createElement('input');
      search.id = 'co-recipe-search'; search.type = 'search'; search.placeholder = 'Search recipes';
      search.setAttribute('aria-label', 'Search recipes');
      search.style.cssText = 'flex:1;min-width:160px;min-height:44px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-size:14px;';
      var gen = self.ui._mkBtn('⚡ New recipe', 'secondary');
      gen.onclick = function() { pop.close(); self.logic._loadConfig(function(cfg) { self.ui._showGenerateForm(cfg || {}); }); };
      top.appendChild(search); top.appendChild(gen);
      box.appendChild(top);
      self.ui._acceptAllStepsBanner(box);
      var list = document.createElement('div');
      list.textContent = 'Loading...';
      list.style.cssText = 'font-size:13px;color:var(--muted);';
      box.appendChild(list);
      var all = [];
      var paint = function() {
        list.innerHTML = '';
        list.style.cssText = '';
        var q = search.value.trim().toLowerCase();
        var shown = all.filter(function(r) { return !q || r.title.toLowerCase().indexOf(q) !== -1 || (r.cuisine || '').toLowerCase().indexOf(q) !== -1; });
        if (!shown.length) {
          var e = document.createElement('div');
          e.style.cssText = 'font-size:13px;color:var(--muted);padding:10px 0;';
          e.textContent = all.length ? 'No recipe matches that.' : 'No saved recipes yet — make one with ⚡ New recipe.';
          list.appendChild(e);
          return;
        }
        shown.forEach(function(r) {
          var card = document.createElement('div');
          card.className = 'co-recipe-row';
          card.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border);';
          var t = document.createElement('div');
          t.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);';
          t.textContent = (r.makeable ? '🟢 ' : '') + r.title;
          var meta = document.createElement('div');
          meta.style.cssText = 'font-size:13px;color:var(--muted);margin:2px 0 8px;';
          var bits = [];
          if (r.cuisine) bits.push(r.cuisine);
          bits.push(r.makeable ? 'Everything in stock' : (r.missing + ' to buy'));
          bits.push(r.lastCooked ? 'Last cooked ' + r.lastCooked : 'Not cooked yet');
          meta.textContent = bits.join(' · ');
          var acts = document.createElement('div');
          acts.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
          var open = self.ui._mkBtn('Open', 'small');
          open.onclick = function() {
            self.logic._loadSavedRecipe(r.id, function(err, recipe) {
              if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3000); return; }
              pop.close(); self.ui._showRecipeCard(recipe, null, r.id);
            });
          };
          var cook = self.ui._mkBtn('▶ Cook now', 'small');
          cook.onclick = function() { self.ui.cookRecipeNow(r.id, null, function() { pop.close(); }); };
          var plan = self.ui._mkBtn('+ Planned cook', 'small');
          plan.onclick = function() {
            self.logic._addRecipeToSession(r.id, r.title);
            RPGACE.utils.toast('🍳 ' + r.title + ' added to your planned cook', '#4caf82', 2600);
            pop.close(); self.ui._showSessionBuilder();
          };
          var shop = self.ui._mkBtn('🛒 Missing → top-up list', 'small');
          shop.onclick = function() {
            shop.disabled = true;
            self.logic._computeIngredientUsage([r.id], function(err, usage) {
              if (err) { shop.disabled = false; RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3000); return; }
              var need = (usage || []).filter(function(u) { return u.toBuy > 0; }).map(function(u) { return { ingredient_id: u.ingredient_id, amount: u.toBuy, unit: u.unit }; });
              if (!need.length) { shop.disabled = false; RPGACE.utils.toast('✓ Nothing to buy for this one', '#4caf82', 2400); return; }
              self.logic._addToTopUpList(need, function(e, listId, n) {
                shop.disabled = false;
                if (e) { RPGACE.utils.toast('⚠️ ' + e, '#CC4A4A', 3500); return; }
                RPGACE.utils.toast('🛒 ' + n + ' added to your top-up list', '#4caf82', 2600);
              });
            });
          };
          [open, cook, plan, shop].forEach(function(b) { acts.appendChild(b); });
          card.appendChild(t); card.appendChild(meta); card.appendChild(acts);
          list.appendChild(card);
        });
      };
      search.oninput = paint;
      Promise.all([
        new Promise(function(res) { self.logic._findMakeableRecipes(function(err, rows) { res(err ? [] : (rows || [])); }); }),
        RPGACE.sb.select('recipes', 'select=id,cuisine').catch(function() { return []; }),
        RPGACE.sb.select('journal', 'select=recipe_id,cooked_at&status=eq.cooked&order=cooked_at.desc').catch(function() { return []; }),
      ]).then(function(res) {
        var cuisine = {}; (res[1] || []).forEach(function(r) { cuisine[r.id] = r.cuisine; });
        var cooked = {}; (res[2] || []).forEach(function(j) { if (j.recipe_id && !cooked[j.recipe_id] && j.cooked_at) cooked[j.recipe_id] = j.cooked_at.slice(0, 10); });
        all = res[0].map(function(r) {
          var c = r.counts || {};
          return { id: r.id, title: r.title || 'Untitled', makeable: r.makeable, missing: (c.red || 0) + (c.yellow || 0) + (c.blue || 0), cuisine: cuisine[r.id] || '', lastCooked: cooked[r.id] || null };
        });
        all.sort(function(a, b) { return (b.makeable - a.makeable) || a.title.localeCompare(b.title); });
        paint();
      });
    },

    // FL-6 (Oct 27 2026): one button to accept every pending one-action
    // step split (recipes.steps_proposed) at once — the same write as
    // _reviewProposedSteps' Accept, per recipe. Two-click arm/confirm.
    _acceptAllStepsBanner: function(box) {
      var ban = document.createElement('div');
      ban.id = 'co-accept-all-steps'; ban.hidden = true;
      ban.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 12px;margin-bottom:10px;border:1px solid rgba(76,175,130,0.35);border-radius:10px;font-size:13px;color:var(--text);';
      box.appendChild(ban);
      RPGACE.sb.select('recipes', 'select=id,title,steps,steps_proposed&steps_proposed=not.is.null').then(function(rows) {
        var todo = (rows || []).filter(function(r) { return Array.isArray(r.steps_proposed) && r.steps_proposed.length; });
        if (!todo.length) return;
        var txt = document.createElement('div'); txt.style.cssText = 'flex:1;min-width:180px;';
        txt.textContent = '📋 ' + todo.length + ' recipe' + (todo.length === 1 ? ' has' : 's have') + ' new Cook Mode steps (one action each) waiting.';
        var btn = RPGACE.modules.cookingOracle.ui._mkBtn('✅ Accept all', 'small'); btn.id = 'co-accept-all-btn';
        var armed = null;
        btn.onclick = function() {
          if (!armed) {
            btn.textContent = 'Tap again to accept ' + todo.length;
            armed = setTimeout(function() { armed = null; btn.textContent = '✅ Accept all'; }, 3000);
            return;
          }
          clearTimeout(armed); armed = null; btn.disabled = true; btn.textContent = 'Saving…';
          var ok = 0, failed = [];
          todo.reduce(function(p, r) {
            return p.then(function() {
              return RPGACE.sb.secureWrite('recipes', 'update', { steps: r.steps_proposed, steps_previous: r.steps || [], steps_proposed: null }, 'id=eq.' + r.id)
                .then(function() { ok++; }).catch(function() { failed.push(r.title || r.id); });
            });
          }, Promise.resolve()).then(function() {
            RPGACE.cache.clear('recipes');
            if (failed.length) {
              btn.disabled = false; btn.textContent = '✅ Accept all';
              RPGACE.utils.toast('⚠️ ' + ok + ' accepted, ' + failed.length + ' failed: ' + failed.join(', '), '#CC4A4A', 5000);
              todo = todo.filter(function(r) { return failed.indexOf(r.title || r.id) !== -1; });
              txt.textContent = '📋 ' + todo.length + ' still waiting.';
              return;
            }
            RPGACE.utils.toast('✅ New steps accepted for ' + ok + ' recipe' + (ok === 1 ? '' : 's') + ' (old steps kept as a backup)', '#4caf82', 3000);
            ban.remove();
          });
        };
        ban.appendChild(txt); ban.appendChild(btn); ban.hidden = false;
      }).catch(function() { /* banner is optional; the list still loads */ });
    },

    // The newest open top-up list (shopping_lists.kind='topup').
    _showTopUpList: function() {
      var self = RPGACE.modules.cookingOracle;
      RPGACE.sb.select('shopping_lists', 'select=id&kind=eq.topup&status=eq.open&order=created_at.desc&limit=1')
        .then(function(rows) {
          if (rows && rows[0]) { self.ui._showShoppingList(rows[0].id, { title: 'Top-up list' }); return; }
          RPGACE.utils.toast('Your top-up list is empty — things you run out of after a cook land here', '#E2A83D', 3500);
        })
        .catch(function() { RPGACE.utils.toast('⚠️ Could not open the top-up list', '#CC4A4A', 3000); });
    },

    // ── CR-3 (Oct 14 2026) — back to the previous Cooking screen ─────────
    // Every Cooking screen closes itself then opens the next, so the
    // popup's own ← Back (dashDeck N1) had nothing underneath to return to.
    // ui._wrapScreens (run once from init) records each screen opened into
    // self._trail, then re-points that popup's ← Back at the previous
    // Cooking screen and adds 🏠 Cooking. One popup at a time, as before.
    NAV_LABELS: {
      _showModuleHub: 'Cooking', _showMyRecipes: 'My Recipes', _showGenerateForm: 'Recipe Generator',
      _showNarrowDown: 'Narrow it down', _showRecipeCard: 'Recipe', _showSettings: 'Cooking settings',
      _showSessionBuilder: 'Planned Cook', _showAddToSessionPicker: 'Add to cook', _showScheduledCookInfo: 'Scheduled cook',
      _showSchedulePreview: 'Cook schedule', _showCurrentStock: 'Current Stock', _showShoppingList: 'Grocery list',
      _showStockMatchFinder: 'What can I cook', _showTopUpList: 'Top-up list',
    },
    _wrapScreens: function() {
      var self = RPGACE.modules.cookingOracle;
      if (self._screensWrapped) return;
      self._screensWrapped = true;
      self._trail = [];
      Object.keys(self.ui.NAV_LABELS).forEach(function(name) {
        var orig = self.ui[name];
        if (typeof orig !== 'function' || name === '_showTopUpList') return;
        self.ui[name] = function() {
          var args = Array.prototype.slice.call(arguments);
          var now = Date.now();
          if (self._navBack) self._navBack = false;
          else {
            if (name === '_showModuleHub' || now - (self._trailAt || 0) > 15 * 60000) self._trail = [];
            var top = self._trail[self._trail.length - 1];
            if (top && top.name === name) top.args = args;
            else self._trail.push({ name: name, args: args });
          }
          self._trailAt = now;
          var entry = self._trail[self._trail.length - 1];
          var before = Array.prototype.slice.call(document.body.children);
          var out = orig.apply(self.ui, args);
          self.ui._decorateWhenOpen(entry, before);
          return out;
        };
      });
    },
    // Oct 21 2026 (Alex: "redesign the pages in cooking with right screen
    // feature"): the ☰ list for every Cooking screen. Cooking = every
    // Cooking screen (closes this one first); This page = the screen's own
    // extras (overlay._sideExtras, a function or list), which stay on it.
    // SL-0: then the rest of Habits (Gym, Health, Wishlist, Money), which
    // replaced the popup's sibling chips.
    _cookShortcuts: function(entry, overlay, closeThis) {
      var self = RPGACE.modules.cookingOracle;
      var go = function(fn) { return function() { if (closeThis) closeThis(); else if (overlay.remove) overlay.remove(); fn(); }; };
      var withCfg = function(fn) { return function() { self.logic._loadConfig(function(cfg) { fn(cfg || {}); }); }; };
      var here = entry && entry.name;
      var cooking = [
        ['🏠', 'Cooking home', go(function() { self.ui._showModuleHub(); }), '_showModuleHub'],
        ['⚡', 'New recipe', go(withCfg(function(cfg) { self.ui._showGenerateForm(cfg); })), '_showGenerateForm'],
        ['📖', 'My Recipes', go(function() { self.ui._showMyRecipes(); }), '_showMyRecipes'],
        ['🍳', 'Plan a cook', go(function() { self.ui._showSessionBuilder(); }), '_showSessionBuilder'],
        ['🛒', 'Grocery list', go(function() { self.ui._openGrocery(); }), 'grocery'],
        ['🛒', 'Top-up list', go(function() { self.ui._showTopUpList(); }), 'topup'],
        ['📦', 'Stock', go(function() { self.ui._showCurrentStock(); }), '_showCurrentStock'],
        ['🔪', 'Equipment', go(function() { self.ui._showCurrentStock('equipment'); }), 'equipment'],
        ['🥫', 'What can I cook?', go(function() { self.ui._showStockMatchFinder(); }), '_showStockMatchFinder'],
        ['⚙️', 'Cooking settings', go(withCfg(function(cfg) { self.ui._showSettings(cfg); })), '_showSettings'],
      ].filter(function(it) { return it[3] !== here; });
      var extras = RPGACE.sideList.extrasOf(overlay);
      var habits = RPGACE.sideList.areaGroup('habits', { card: 'cooking' });
      return {
        id: 'co-side', cls: 'co-side', itemCls: 'co-side-item', label: 'Cooking shortcuts',
        title: '🍳 ' + ((entry && self.ui.NAV_LABELS[entry.name]) || 'Cooking'),
        groups: [['This page', extras], ['Cooking', cooking]].concat(habits ? [habits] : []),
      };
    },

    _decorateWhenOpen: function(entry, before, tries) {
      var self = RPGACE.modules.cookingOracle;
      tries = tries || 0;
      var kids = Array.prototype.slice.call(document.body.children);
      var fresh = null;
      for (var i = kids.length - 1; i >= 0; i--) {
        if (before.indexOf(kids[i]) === -1 && kids[i].querySelector && kids[i].querySelector('.dd-pop-nav')) { fresh = kids[i]; break; }
      }
      if (!fresh) { if (tries < 40) setTimeout(function() { self.ui._decorateWhenOpen(entry, before, tries + 1); }, 100); return; }
      entry.overlay = fresh;
      var nav = fresh.querySelector('.dd-pop-nav');
      var back = nav.querySelector('button[aria-label="Back"]');
      if (!back || back.dataset.coNav) return;
      back.dataset.coNav = '1';
      var origClose = back.onclick;
      // Oct 21 2026: ☰ (and a swipe right) opens the Cooking shortcut list.
      if (RPGACE.sideList) {
        var getOpts = function() { return self.ui._cookShortcuts(entry, fresh, origClose); };
        var menu = RPGACE.sideList.button(getOpts, 'Cooking shortcuts');
        menu.classList.add('co-side-btn');
        // SL-0: replaces the popup's shared area ☰ (one ☰ per screen).
        var shared = nav.querySelector('.side-area-btn');
        if (shared) shared.remove();
        fresh._sideOpts = getOpts;
        nav.insertBefore(menu, nav.firstChild);
        RPGACE.sideList.attach(fresh, getOpts);
      }
      var idx = self._trail.indexOf(entry);
      var prev = idx > 0 ? self._trail[idx - 1] : null;
      if (prev) {
        back.textContent = '← ' + (self.ui.NAV_LABELS[prev.name] || 'Back');
        back.onclick = function() {
          self._trail = self._trail.slice(0, idx);
          if (origClose) origClose();
          if (prev.overlay && prev.overlay.isConnected) return; // still open underneath
          self._navBack = true;
          self.ui[prev.name].apply(self.ui, prev.args || []);
        };
      }
      if (entry.name !== '_showModuleHub') {
        var home = document.createElement('button');
        home.type = 'button';
        home.className = 'co-nav-home';
        home.textContent = '🏠 Cooking';
        home.setAttribute('aria-label', 'Cooking home');
        home.style.cssText = back.style.cssText;
        home.onclick = function() { if (origClose) origClose(); self.ui._showModuleHub(); };
        back.parentNode.insertBefore(home, back.nextSibling);
      }
    },

    _showPriceEntryPopup: function(item, onDone) {
      var self = RPGACE.modules.cookingOracle;
      var pop = RPGACE.modules.dashDeck._popup({
        width: '420px', eyebrow: '💷 LOG PURCHASE', title: (item.ingredients && item.ingredients.name) || 'Ingredient',
        borderColor: 'rgba(201,168,76,0.3)',
      });
      var box = pop.box;

      var mkInput = function(placeholder, type) {
        var i = document.createElement('input');
        i.type = type || 'text';
        i.placeholder = placeholder;
        i.style.cssText = 'width:100%;margin-bottom:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;box-sizing:border-box;';
        box.appendChild(i);
        return i;
      };

      var brandInput = mkInput('Brand (optional)');
      var storeInput = mkInput('Store');
      self.logic._loadConfig(function(cfg) { if (cfg && cfg.default_shop && !storeInput.value) storeInput.value = cfg.default_shop; });

      var weightRow = document.createElement('div');
      weightRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
      var weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.placeholder = 'Pack size';
      weightInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;';
      var unitInput = document.createElement('input');
      unitInput.type = 'text';
      unitInput.placeholder = 'unit';
      unitInput.value = item.needed_unit || '';
      unitInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;';
      weightRow.appendChild(weightInput);
      weightRow.appendChild(unitInput);
      box.appendChild(weightRow);

      var priceInput = mkInput('Price paid (£)', 'number');

      // CR-1 — where it goes once bought (adds to that location's stock).
      var locLabel = document.createElement('div');
      locLabel.style.cssText = 'font-size:12px;color:var(--muted);margin:2px 0 6px;';
      locLabel.textContent = 'Put it in';
      box.appendChild(locLabel);
      var locRow = document.createElement('div');
      locRow.className = 'co-loc-row';
      locRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';
      var location = 'pantry';
      var locBtns = {};
      var paintLoc = function() {
        Object.keys(locBtns).forEach(function(k) {
          var on = k === location;
          locBtns[k].style.background = on ? 'rgba(76,175,130,0.18)' : 'transparent';
          locBtns[k].style.borderColor = on ? 'rgba(76,175,130,0.5)' : 'var(--border)';
          locBtns[k].setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      };
      [['pantry', '🥫 Pantry'], ['fridge', '🧊 Fridge'], ['freezer', '❄️ Freezer']].forEach(function(l) {
        var b = self.ui._mkBtn(l[1], 'small', { extra: 'flex:1;' });
        b.dataset.loc = l[0];
        b.onclick = function() { location = l[0]; paintLoc(); };
        locBtns[l[0]] = b;
        locRow.appendChild(b);
      });
      box.appendChild(locRow);
      paintLoc();
      self.logic._defaultLocation(item.ingredient_id, (item.ingredients && item.ingredients.name) || '', function(loc) { location = loc; paintLoc(); });

      var errBox = document.createElement('div');
      errBox.style.cssText = 'font-size:12px;color:#CC4A4A;margin-bottom:8px;display:none;';
      box.appendChild(errBox);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;';

      var redoBtn = self.ui._mkBtn('↺ Redo', 'inline', { title: 'Clear these fields to re-enter — found something better?', extra: 'flex:1;padding:9px;' });
      redoBtn.onclick = function() {
        brandInput.value = ''; weightInput.value = ''; priceInput.value = '';
        errBox.style.display = 'none';
        // store + unit deliberately kept — usually still correct on a redo
      };

      var confirmBtn = self.ui._mkBtn('✅ Confirm', 'inline', { color: 'var(--green)', bg: 'rgba(76,175,130,0.12)', borderColor: 'rgba(76,175,130,0.35)', extra: 'flex:2;padding:9px;font-size:13px;font-weight:700;' });
      confirmBtn.onclick = function() {
        var brand = brandInput.value.trim() || null;
        var store = storeInput.value.trim();
        var packSize = parseFloat(weightInput.value);
        var unit = unitInput.value.trim() || null;
        var price = parseFloat(priceInput.value);
        if (!store || isNaN(packSize) || packSize <= 0 || isNaN(price) || price < 0) {
          errBox.textContent = '⚠️ Enter a store, a real pack size, and a real price';
          errBox.style.display = 'block';
          return;
        }
        errBox.style.display = 'none';
        confirmBtn.disabled = true; redoBtn.disabled = true;
        self.logic._recordPurchase(item, { brand: brand, store: store, packSize: packSize, unit: unit, price: price, location: location }, function(err, res) {
          if (err) {
            confirmBtn.disabled = false; redoBtn.disabled = false;
            errBox.textContent = '⚠️ ' + err;
            errBox.style.display = 'block';
            return;
          }
          if (res && res.stocked) RPGACE.utils.toast('💷 Logged — ' + packSize + ' ' + (unit || '') + ' added to ' + location, '#4caf82', 2600);
          else RPGACE.utils.toast('💷 Logged — stock not updated (bought in ' + (unit || 'no unit') + ', list tracks ' + (item.needed_unit || 'no unit') + '). Add it in Current Stock.', '#E2A83D', 4200);
          pop.close();
          if (onDone) onDone();
        });
      };

      btnRow.appendChild(redoBtn);
      btnRow.appendChild(confirmBtn);
      box.appendChild(btnRow);
    },

  },

  // ============================================================
  // logic — business logic/data
  // ============================================================
  logic: {

    _loadConfig: function(cb) {
      RPGACE.sb.select('habits_config', 'id=eq.1&limit=1')
        .then(function(rows) { cb(rows && rows[0] ? rows[0] : {}); })
        .catch(function() { cb({}); });
    },

    // secureWrite resolves directly to the written row(s) (server unwraps
    // {data:...} - RPGACE.sb.secureWrite's own Sep 2 fix) or REJECTS with a
    // real Error on failure - never a raw fetch Response to check .ok/
    // .json() on. Every call site below relies on .catch(), not .then(r=>
    // r.ok), matching the real, current contract (verified by direct read,
    // not assumed - a first draft of this whole module got this wrong).
    _saveConfig: function(patch, cb) {
      RPGACE.sb.secureWrite('habits_config', 'update', patch, 'id=eq.1')
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'settings save failed'); });
    },

    // Builds the outbound prompt and asks Oracle for a recipe ending in a
    // real RECIPE_JSON: trailer (same trailer-marker convention as
    // DIRECTOR_CHOSEN:/EDL_JSON: - visualOracle._saveDocToProduction),
    // reusing the existing sendChat pipeline (RPGACE.utils.sendToOracle)
    // and the existing one-shot capture (visualOracle._captureNextResponse,
    // rule 8 - never a second hand-rolled capture mechanism).
    // H18 (Sep 16 2026, real Alex ask: "now i can look for recipes that
    // will only give me purple or green ingredients... like [browse saved]
    // and [filter] but as filter to generate new recipes or choose saved
    // ones") — real, OPTIONAL 4th param, `stockOnly`. When true, the
    // prompt is extended with a real, honest CHOICE constraint (use only
    // what's actually in stock right now) — never a QUANTITY guarantee,
    // since there's no "needed" amount to compare against before a recipe
    // exists. The resulting recipe still gets classified by the same real
    // shared 5-color system once shown (ui._showRecipeCard) — if Oracle
    // calls for more of something than is actually in stock, that shows up
    // honestly as yellow/red on the card rather than being hidden or
    // silently guaranteed away (rule 7 — fail loud, never fake compliance).
    // Every EXISTING caller (none pass a 4th arg) is unaffected — stockOnly
    // defaults to falsy, same prompt as before.
    _generate: function(description, servings, cb, stockOnly) {
      var self = RPGACE.modules.cookingOracle;
      if (stockOnly) {
        self.logic._loadPantryNamed(function(stockRows) {
          self.logic._generateWithStockConstraint(description, servings, cb, stockRows || []);
        });
        return;
      }
      self.logic._generateWithStockConstraint(description, servings, cb, null);
    },

    _generateWithStockConstraint: function(description, servings, cb, stockRows) {
      var self = RPGACE.modules.cookingOracle;
      var prompt = 'Generate a real, cookable recipe for: ' + description + '. Base servings: ' + (servings || 4) + '. '
        // Oct 1 2026 (error_log: "No RECIPE_JSON found", 6x since Sep 28) - the
        // prompt used to ask for the WHOLE recipe twice (prose + JSON). Since
        // H14-H24 grew the JSON (per-step ingredients_used, timings, grams,
        // is_separable) that regularly ran past sendChat's 3000-token cap and
        // cut the JSON off. The card is built from the JSON alone, so the
        // prose copy is dropped.
        + 'Before the JSON, write ONLY a one- or two-sentence intro - do NOT write the ingredient list or method out as prose (the app builds the full recipe card from the JSON; writing it twice gets the reply cut off). '
        + 'Every step in the method must be tagged with a real type: prep_before_cooking (active work before any heat - chopping, marinating), '
        + 'actual_cooking (active, hands-on, heat applied), prep_while_cooking (active work that fits inside a PASSIVE window - your own or a step that runs unattended), '
        + 'or baking (goes in the oven - a brief active load/unload moment plus a passive oven-time duration). '
        // Sep 14 2026 (real Alex ask - "the method is poor, why prep
        // seafood before anything when it is added at the end? Prep
        // should be for everything that is part of active cook without
        // beforehand dead time"): the original prompt let the model dump
        // every ingredient's prep into ONE opening prep_before_cooking
        // block regardless of when it's actually used - real, experienced-
        // cook sequencing instead requires deferring anything quick-to-prep
        // and used late (raw seafood/fish especially - a food-safety and
        // freshness issue sitting prepped and waiting) into its own later
        // step, not the opening block.
        + 'Sequence the prep like an experienced cook, never front-loading everything into one opening block regardless of when it is used. '
        + 'Only put an ingredient in an early prep_before_cooking step if it genuinely benefits from advance prep and holds up fine sitting prepped and waiting (vegetables, aromatics, dry goods, anything that actually needs to marinate). '
        + 'Anything quick to prep that is added near the END of cooking - raw seafood, raw fish, delicate herbs/garnishes, anything that degrades or is a food-safety risk sitting prepped early - must get its OWN separate step positioned shortly before it is actually used (as a prep_while_cooking step riding an earlier passive/simmer window, or as a short active step immediately before the cooking step that adds it), never bundled into the opening prep block. '
        + 'For each step give an active_duration_min (minutes you must actively attend to it) and, where the step then runs unattended, a passive_duration_min (minutes it keeps going with zero attention needed - a simmer, a bake, a chill). '
        + self.UNIT_PREFERENCE_TEXT
        + 'For each ingredient, also estimate its real total weight in grams at the stated amount/unit (e.g. "2 tbsp olive oil" is roughly 27g) — this is used to compute real nutrition later, so give your best honest estimate even for odd units like "1 clove" or "1 chicken thigh". '
        // H14 (Sep 16 2026, real Alex ask: "it needs to show me measurements
        // of each ingredient at each step so i dont have to go back and
        // fourth to agree plan") - each step now also names exactly which
        // ingredients (and how much of each) it calls for, in the SAME
        // amount/unit shape as the top-level ingredients list, so a step
        // can be rendered with its own real measurements next to it rather
        // than forcing a reader back to the ingredient list to check
        // quantities. If one ingredient is used across 2+ steps (e.g. half
        // now, half later), split the amount across those steps rather
        // than repeating the full amount in both.
        + 'For each step, also list exactly which ingredients it uses and how much of each, in the shape ingredients_used:[{"name":"...","amount":<number>,"unit":"..."}] - if an ingredient is used across more than one step, split its amount across those steps rather than repeating the full amount each time. '
        + self.SEPARABLE_TAG_TEXT
        + 'Then, on its own final line, output exactly: RECIPE_JSON: followed by a compact single-line JSON object (no code fences, no backticks) in the shape '
        + self.STEP_RULES_TEXT + 'Shape: ' + self.RECIPE_JSON_SHAPE(servings || 4) + '. '
        + 'Ingredient names must be simple, generic, singular/lowercase (e.g. "garlic clove" not "3 cloves of fresh garlic") so they can be tracked consistently across recipes.';

      // H18 (Sep 16 2026, real Alex correction: "not pantry only, stock
      // only, pantry is part of stock, like fridge and freezer") — real
      // "use what I have" constraint, genuinely covering all 3 real
      // pantry_stock locations (pantry/fridge/freezer, H11), never just
      // the pantry shelf. A genuine CHOICE constraint (which ingredients
      // to use), never a fabricated QUANTITY guarantee — see this
      // function's own top comment for why.
      if (stockRows && stockRows.length) {
        var stockList = stockRows.map(function(p) { return p.name + ' (' + p.quantity + ' ' + (p.unit || '') + ' in stock)'; }).join(', ');
        prompt += ' IMPORTANT real constraint: build this recipe using ONLY ingredients from this real current stock list (pantry, fridge, and freezer combined), so no shopping trip is needed before cooking it — '
          + stockList + '. Do not introduce any ingredient not on this list (basic salt, pepper, and water are always fine even if not listed). '
          + 'If a genuinely good recipe for "' + description + '" is not possible from this stock alone, say so plainly in your reply instead of silently adding an ingredient that is not actually in stock.';
      } else if (stockRows) {
        // A real, empty array — stock is genuinely tracked but has zero
        // rows logged. Fail loud rather than silently sending the
        // unconstrained prompt as if the constraint had been honored.
        cb('No stock is logged yet — nothing to constrain generation to. Log some stock under 📦 Current Stock first.');
        return;
      }

      var sent = RPGACE.utils.sendToOracle(prompt);
      if (!sent) { cb('Could not send to Oracle — chat may be busy, try again in a moment'); return; }

      var vo = RPGACE.modules.visualOracle;
      if (!vo || !vo._captureNextResponse) { cb('Oracle response capture is unavailable right now'); return; }
      // H15 (Sep 16 2026) — armed BEFORE the capture, real generous 60s
      // window (see the module-scope field's own comment) so the new
      // persistent chat-generation listener knows this exact reply is
      // already being handled by the dedicated flow below and skips it,
      // rather than both paths independently opening a real recipe card
      // for the same one generation.
      self._generateFlowArmedUntil = Date.now() + 60000;
      vo._captureNextResponse(function(text) {
        setTimeout(function() { self._generateFlowArmedUntil = 0; }, 0);
        var parsed = self.logic._parseRecipeJSONDetailed(text);
        if (!parsed.recipe) { cb(self.logic.RECIPE_PARSE_ERRORS[parsed.reason] || self.logic.RECIPE_PARSE_ERRORS.no_marker, null, text); return; }
        cb(null, parsed.recipe, text);
      }, function(reason) {
        // Real fail-loud fix (Alex report: generation appearing to
        // silently do nothing) - without this, a busy/timed-out capture
        // left the Generate button stuck disabled forever with zero
        // error, indistinguishable from a real hang. See
        // visualOracle._captureNextResponse's own comment for the shared
        // root cause and why only these 3 real cookingOracle call sites
        // opt into it.
        self._generateFlowArmedUntil = 0;
        cb(reason === 'busy'
          ? 'Oracle is already busy with another reply — wait a moment and try again'
          : 'Oracle took too long to reply (90s) — no recipe was generated. Try again.');
      });
    },

    // Oct 1 2026 — real fix for error_log "No RECIPE_JSON found" (6x since
    // Sep 28). Two reproduced failure modes, both through the real
    // renderMarkdown -> textContent path oracle:response-scanned hands us:
    // (1) Oracle fencing the JSON after the marker ("RECIPE_JSON:\n```json
    // {...}```") — renderMarkdown has no fence handling and turns newlines
    // into <br>, so the scanned text read "RECIPE_JSON:```json{...}" and the
    // old /RECIPE_JSON:\s*\{/ regex never matched; (2) the reply hitting
    // sendChat's 3000-token cap mid-JSON. Now: prefer the RAW reply
    // (STATE.chatHistory, never rendered), skip any backticks/"json" label
    // between marker and object, extract the object by a string-aware brace
    // scan (not a greedy regex), and report WHY it failed so error_log shows
    // the real cause next time instead of one generic message.
    _rawLastReply: function() {
      try {
        var h = (typeof STATE !== 'undefined' && STATE.chatHistory) || [];
        for (var i = h.length - 1; i >= 0; i--) if (h[i] && h[i].role === 'assistant') return String(h[i].content || '');
      } catch (e) {}
      return '';
    },
    _extractJSONAfterMarker: function(text, marker) {
      text = String(text || '');
      var at = text.lastIndexOf(marker);
      if (at === -1) return { reason: 'no_marker' };
      var i = at + marker.length;
      while (i < text.length && /[\s`*]/.test(text[i])) i++;
      if (text.substr(i, 4).toLowerCase() === 'json') { i += 4; while (i < text.length && /[\s`]/.test(text[i])) i++; }
      if (text[i] !== '{') return { reason: 'no_object' };
      var depth = 0, inStr = false, esc = false;
      for (var j = i; j < text.length; j++) {
        var c = text[j];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return { json: text.slice(i, j + 1) }; }
      }
      return { reason: 'truncated' };
    },
    _parseRecipeJSONDetailed: function(text, marker) {
      var self = RPGACE.modules.cookingOracle;
      marker = marker || 'RECIPE_JSON:';
      var raw = self.logic._rawLastReply();
      var src = raw.indexOf(marker) !== -1 ? raw : String(text || '');
      var ex = self.logic._extractJSONAfterMarker(src, marker);
      if (!ex.json) return { recipe: null, reason: ex.reason };
      var recipe;
      try { recipe = JSON.parse(ex.json); } catch (e) { return { recipe: null, reason: 'invalid' }; }
      if (!recipe || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps)) return { recipe: null, reason: 'bad_shape' };
      self.logic._sanitizeStepIngredientsUsed(recipe.steps);
      self.logic._sanitizeIngredientSeparable(recipe.ingredients);
      return { recipe: recipe, reason: null };
    },
    _parseRecipeJSON: function(text) {
      return RPGACE.modules.cookingOracle.logic._parseRecipeJSONDetailed(text).recipe;
    },
    RECIPE_PARSE_ERRORS: {
      no_marker: 'No RECIPE_JSON found in the reply — Oracle didn\'t finish with the recipe data. Try again.',
      no_object: 'Oracle wrote RECIPE_JSON but no recipe data after it — try again.',
      truncated: 'Oracle\'s reply was cut off before the recipe data finished (too long) — try again, or ask for a simpler recipe.',
      invalid: 'Oracle\'s recipe data was malformed — try again.',
      bad_shape: 'Oracle\'s recipe data was missing its ingredients or steps — try again.'
    },

    // H21 (Sep 17 2026) — real, defensive structural sanitize of the new
    // per-ingredient is_separable field (rule 5 — never trust model JSON
    // blindly), same discipline as _sanitizeStepIngredientsUsed above: a
    // missing/malformed value coerces to a plain false (essential) rather
    // than being carried through as whatever truthy/falsy junk a prompt
    // regression could otherwise send — never guessed true.
    _sanitizeIngredientSeparable: function(ingredients) {
      (ingredients || []).forEach(function(ing) {
        if (!ing || typeof ing !== 'object') return;
        ing.is_separable = !!ing.is_separable;
      });
    },

    // H14 (Sep 16 2026) — real, defensive structural sanitize of the new
    // per-step ingredients_used field (rule 5 — never trust model JSON
    // blindly): a missing/malformed field is stripped to an empty array
    // rather than left as whatever shape Oracle actually sent, so every
    // real renderer downstream can assume a clean array of {name,amount,
    // unit} objects and never has to defend against a stray string/number/
    // null entry a prompt regression could otherwise let through.
    _sanitizeStepIngredientsUsed: function(steps) {
      (steps || []).forEach(function(step) {
        if (!step || typeof step !== 'object') return;
        var list = Array.isArray(step.ingredients_used) ? step.ingredients_used : [];
        step.ingredients_used = list.filter(function(u) {
          return u && typeof u === 'object' && typeof u.name === 'string' && u.name.trim();
        }).map(function(u) {
          return { name: u.name.trim(), amount: (typeof u.amount === 'number') ? u.amount : null, unit: (typeof u.unit === 'string') ? u.unit : '' };
        });
        // Oct 11 2026 (Cook Mode) — optional short strings, never trusted raw.
        ['done_cue', 'equipment', 'timer_end'].forEach(function(k) {
          step[k] = (typeof step[k] === 'string') ? step[k].trim().slice(0, 90) : '';
        });
      });
    },

    // Oct 11 2026 (Cook Mode) — ingredients that no step ever uses. A
    // one-step-per-screen cook only ever sees each step's own list, so a
    // missing one would silently never be added; flag it on the card.
    _stepCoverageGaps: function(recipe) {
      var used = {};
      (recipe && recipe.steps || []).forEach(function(st) {
        (st.ingredients_used || []).forEach(function(u) { if (u && u.name) used[String(u.name).trim().toLowerCase()] = 1; });
      });
      return (recipe && recipe.ingredients || []).map(function(i) { return i && i.name; })
        .filter(function(n) { return n && !used[String(n).trim().toLowerCase()]; });
    },

    // Oct 11 2026 (Cook Mode) — one shape for both a single recipe's steps
    // and a planned cook's merged schedule blocks. scale multiplies amounts
    // (the card's serving scaler); blocks already carry their recipe title.
    // CM-3 (Oct 15 2026): a schedule block's hands-on vs waiting minutes.
    // Blocks saved before Oct 15 only have [start, end): cooking/baking
    // blocks count as waiting (they get the timer), prep as hands-on.
    _blockTimes: function(b) {
      var dur = Math.max(0, (b.end || 0) - (b.start || 0));
      if (typeof b.passiveMin === 'number') return { active: b.activeMin || 0, passive: b.passiveMin };
      return (b.type === 'actual_cooking' || b.type === 'baking') ? { active: 0, passive: dur } : { active: dur, passive: 0 };
    },

    _cookModeSteps: function(stepsOrBlocks, scale, recipeTitle) {
      scale = scale || 1;
      var isBlocks = (stepsOrBlocks || []).some(function(x) { return x && x.ingredientsUsed !== undefined; });
      var list = (stepsOrBlocks || []).slice().sort(function(a, b) {
        return isBlocks ? (a.start - b.start) : ((a.order || 0) - (b.order || 0));
      });
      return list.map(function(x) {
        var ings = (isBlocks ? x.ingredientsUsed : x.ingredients_used) || [];
        return {
          recipeTitle: isBlocks ? (x.recipeTitle || '') : (recipeTitle || ''),
          type: x.type || '',
          instruction: x.description || '',
          done_cue: isBlocks ? (x.doneCue || '') : (x.done_cue || ''),
          equipment: isBlocks ? (x.equipment || '') : (x.equipment || ''),
          active_duration_min: isBlocks ? RPGACE.modules.cookingOracle.logic._blockTimes(x).active : (x.active_duration_min || 0),
          passive_duration_min: isBlocks ? RPGACE.modules.cookingOracle.logic._blockTimes(x).passive : (x.passive_duration_min || 0),
          timer_end: isBlocks ? (x.timerEnd || '') : (x.timer_end || ''),
          ingredients_used: ings.map(function(u) {
            return { name: u.name, unit: u.unit || '', amount: (typeof u.amount === 'number') ? Math.round(u.amount * scale * 100) / 100 : u.amount };
          }),
        };
      });
    },

    // Sep 14 2026 (real "close the loop" build - see the registerContextProvider
    // block's own comment above for the full design rationale) - a real,
    // PERSISTENT listener on the shared oracle:response-scanned hook
    // (same shared hook DIRECTOR_CHOSEN:/EDL_JSON:/ORACLE_ACTION: already
    // use, rule 8 - multiple independent listeners on one hook, each
    // hunting its own distinct marker, is this project's own established
    // precedent). Registered once from init(), unlike _generate's own
    // ONE-SHOT visualOracle._captureNextResponse capture - a critique can
    // arrive from any later overlay message while a card is open, not just
    // as the direct reply to one specific outbound request, so this can't
    // be a one-shot capture the way generation itself is.
    //
    // Guarded on _recipeCardOpen AND _applyRecipeUpdate together (not
    // _recipeCardOpen alone) - the flag is set true at the very top of
    // ui._showRecipeCard, before _applyRecipeUpdate is assigned further
    // down in the same function body, so checking only the flag would
    // leave a narrow real window where a reply landing mid-render could
    // be silently dropped instead of safely ignored.
    _listenForRecipeUpdates: function() {
      var self = RPGACE.modules.cookingOracle;
      RPGACE.hooks.on('oracle:response-scanned', function(text) {
        if (!text || !self._recipeCardOpen || !self._applyRecipeUpdate) return;
        var raw = self.logic._rawLastReply();
        var ex = self.logic._extractJSONAfterMarker(raw.indexOf('RECIPE_UPDATE_JSON:') !== -1 ? raw : text, 'RECIPE_UPDATE_JSON:');
        if (!ex.json) {
          if (ex.reason !== 'no_marker') RPGACE.utils.toast('⚠️ Oracle\'s recipe update ' + (ex.reason === 'truncated' ? 'was cut off before it finished' : 'had no data after RECIPE_UPDATE_JSON') + ' — try again.', '#CC4A4A', 5000, 'cookingOracle');
          return;
        }
        var updated;
        try { updated = JSON.parse(ex.json); } catch (e) { console.warn('[cookingOracle] malformed RECIPE_UPDATE_JSON, ignored:', e.message); return; }
        if (!updated || !Array.isArray(updated.ingredients) || !Array.isArray(updated.steps)) return;
        self.logic._sanitizeStepIngredientsUsed(updated.steps);
        self.logic._sanitizeIngredientSeparable(updated.ingredients);
        var diff = self.logic._diffRecipe(self._generatedRecipe, updated);
        // A reply that carries the trailer but genuinely changes nothing
        // real (Oracle echoed the recipe back unchanged) has nothing to
        // confirm - stay silent rather than showing an empty confirm popup.
        if (!diff.hasChanges) return;
        self.ui._showRecipeUpdateConfirm(diff, updated);
      });
    },

    // H15 (Sep 16 2026, real Alex ask: "yes, general chat too — build it")
    // — real keyword gate feeding oracleAppGrounding's own window.callOracle
    // wrap (rule 8 — the SAME cross-module guarded-call pattern that wrap
    // already uses for oracleControl's matchesAnyTrigger/buildActionsBlock,
    // never a 4th window.callOracle wrapper, per the standing landmine).
    // Deliberately does NOT fire while a recipe card is already open — that
    // case is already fully covered by the existing 'cooking' context
    // provider's own RECIPE_UPDATE_JSON trailer, a genuinely different real
    // mechanism for editing the SAME open recipe, not generating a new one.
    matchesRecipeGenTrigger: function(lowerText) {
      var self = RPGACE.modules.cookingOracle;
      if (self._recipeCardOpen || !lowerText) return false;
      return self.RECIPE_GEN_KEYWORDS.some(function(k) { return lowerText.indexOf(k) !== -1; });
    },

    // H15 (Sep 16 2026) — the real grounding instruction riding inside
    // oracleAppGrounding's wrap once matchesRecipeGenTrigger fires. Reuses
    // the exact same RECIPE_JSON shape/rules _generate's own prompt already
    // uses (self.RECIPE_JSON_SHAPE, rule 8) so a chat-generated recipe
    // parses through the SAME logic._parseRecipeJSON path with no special
    // casing. Deliberately leaves "is this specific enough yet" to Oracle's
    // own judgment (never a client-side word-count/narrow-down gate here,
    // unlike the dedicated Generate form) — in a real multi-turn
    // conversation Oracle already has whatever context actually resolved
    // the ambiguity, which a bare word count can't see.
    buildRecipeGenBlock: function() {
      var self = RPGACE.modules.cookingOracle;
      return '\n\nIf Alex is asking you to actually FINALIZE and generate a real, saveable recipe right now (not just discuss or suggest ideas), and you have enough specific detail to write a complete real recipe for one specific dish, give a one- or two-sentence intro only - do NOT write the ingredient list or method out as prose, the app builds the full recipe card from the JSON (same tagging rules as any other real recipe: each step typed prep_before_cooking/actual_cooking/prep_while_cooking/baking, active_duration_min and passive_duration_min per step, real gram estimates per ingredient, real ingredients_used per step). '
        + self.UNIT_PREFERENCE_TEXT
        + self.SEPARABLE_TAG_TEXT
        + 'Then end your reply on its own final line with: RECIPE_JSON: followed by a compact single-line JSON object (no code fences, no backticks) in the shape '
        + self.STEP_RULES_TEXT + 'Shape: ' + self.RECIPE_JSON_SHAPE(4) + '. '
        + 'Only include this trailer when a specific dish is genuinely decided and you are finalizing it for real - if his request is still vague or you are only brainstorming/discussing options, answer normally with no trailer.';
    },

    // H15 (Sep 16 2026) — real, PERSISTENT second listener on the same
    // shared oracle:response-scanned hook _listenForRecipeUpdates already
    // uses (rule 8, multiple independent listeners each hunting their own
    // distinct marker is this project's own established precedent). Real
    // double-fire guard against the dedicated Generate-button flow's own
    // one-shot capture: skips entirely while _generateFlowArmedUntil is in
    // the future (see that field's own comment for why a deferred clear
    // makes this correct regardless of listener execution order), and
    // skips while a recipe card is already open (RECIPE_UPDATE_JSON territory,
    // not this). Opens the SAME real ui._showRecipeCard a Generate-button
    // reply would — one real recipe-review surface, never a second one.
    _listenForChatGeneratedRecipes: function() {
      var self = RPGACE.modules.cookingOracle;
      RPGACE.hooks.on('oracle:response-scanned', function(text) {
        if (!text || self._recipeCardOpen || Date.now() < self._generateFlowArmedUntil) return;
        var recipe = self.logic._parseRecipeJSON(text);
        if (!recipe) return; // no real RECIPE_JSON trailer in this reply - nothing to do
        RPGACE.utils.toast('🔮 Oracle drafted a recipe from your chat — review & save', '#C9A84C', 3500);
        self.ui._showRecipeCard(recipe, text);
      });
    },

    // Real, CODE-COMPUTED diff between the currently-open recipe and
    // Oracle's proposed full replacement - never Oracle's own self-reported
    // account of what changed (rule 5). Ingredients matched by normalized
    // name (same normalized-exact-match discipline intelDedup already
    // proves, not fuzzy); steps matched by normalized description text so
    // a pure reorder (same steps, new order) never reads as every step
    // being removed-and-re-added. Returns a real, structured diff the
    // confirm popup renders directly - "only changes are shown, not the
    // whole thing" (Alex's own exact words) is enforced HERE, in code, not
    // left to the popup's own rendering discipline alone.
    _diffRecipe: function(current, updated) {
      current = current || {};
      updated = updated || {};
      var diff = {
        hasChanges: false,
        titleChanged: null,
        ingredients: { added: [], removed: [], changed: [] },
        steps: { added: [], removed: [], changed: [] },
      };

      var curTitle = String(current.title || '').trim();
      var newTitle = String(updated.title || '').trim();
      if (newTitle && newTitle !== curTitle) {
        diff.titleChanged = { from: curTitle, to: newTitle };
        diff.hasChanges = true;
      }

      var normName = function(n) { return String(n || '').trim().toLowerCase(); };
      var curIngByName = {};
      (current.ingredients || []).forEach(function(i) { var k = normName(i.name); if (k) curIngByName[k] = i; });
      var newIngByName = {};
      (updated.ingredients || []).forEach(function(i) { var k = normName(i.name); if (k) newIngByName[k] = i; });

      Object.keys(newIngByName).forEach(function(key) {
        var ni = newIngByName[key];
        var ci = curIngByName[key];
        if (!ci) {
          diff.ingredients.added.push(ni);
          diff.hasChanges = true;
        } else if (ci.amount !== ni.amount || String(ci.unit || '') !== String(ni.unit || '')) {
          diff.ingredients.changed.push({
            name: ni.name,
            from: { amount: ci.amount, unit: ci.unit },
            to: { amount: ni.amount, unit: ni.unit },
          });
          diff.hasChanges = true;
        }
      });
      Object.keys(curIngByName).forEach(function(key) {
        if (newIngByName[key]) return;
        diff.ingredients.removed.push(curIngByName[key]);
        diff.hasChanges = true;
      });

      var normDesc = function(d) { return String(d || '').trim().toLowerCase(); };
      var curSteps = (current.steps || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
      var newSteps = (updated.steps || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
      var curStepByDesc = {};
      curSteps.forEach(function(s) { var k = normDesc(s.description); if (k) curStepByDesc[k] = s; });
      var newStepByDesc = {};
      newSteps.forEach(function(s) { var k = normDesc(s.description); if (k) newStepByDesc[k] = s; });

      newSteps.forEach(function(ns) {
        var key = normDesc(ns.description);
        if (!key) return;
        var cs = curStepByDesc[key];
        if (!cs) {
          diff.steps.added.push(ns);
          diff.hasChanges = true;
        } else if (String(cs.type || '') !== String(ns.type || '') || (cs.active_duration_min || 0) !== (ns.active_duration_min || 0) || (cs.passive_duration_min || 0) !== (ns.passive_duration_min || 0)) {
          diff.steps.changed.push({
            description: ns.description,
            from: { type: cs.type, active_duration_min: cs.active_duration_min, passive_duration_min: cs.passive_duration_min },
            to: { type: ns.type, active_duration_min: ns.active_duration_min, passive_duration_min: ns.passive_duration_min },
          });
          diff.hasChanges = true;
        }
      });
      curSteps.forEach(function(cs) {
        var key = normDesc(cs.description);
        if (!key || newStepByDesc[key]) return;
        diff.steps.removed.push(cs);
        diff.hasChanges = true;
      });

      return diff;
    },

    // Sep 13 2026 - the "narrow it down" step's real 5-ideas mechanism.
    // Deliberately a SEPARATE, lighter Oracle call from _generate (a plain
    // dish-name list, not a full RECIPE_JSON) - never a 2nd premium-model
    // triage call in front of the real ground-worker generation call
    // (rule 11); this replaces guessing at one recipe with a real, cheap
    // disambiguation round, and only fires when the user actually presses
    // "Suggest 5 ideas," never automatically.
    //
    // Real bug found live in production, same day (Alex's own screenshot,
    // "Could not parse dish ideas from the reply"): a numbered-list prompt
    // is UNRECOVERABLE by the time oracle:response-scanned's `text` reaches
    // any consumer. RPGACE.utils._runPhylaScan reads `lastMsg.textContent`
    // AFTER renderMarkdown() has already rendered the reply into the chat
    // DOM - renderMarkdown()'s own `^\d+\. ` replace strips a numbered
    // list's digit prefix outright (rpgace_core.js, renderMarkdown), and
    // DOM textContent never reinserts a newline for the <br>/block-display
    // markup that used to separate list items either - the whole reply
    // collapses into one unbroken blob with no numbers and no line breaks
    // at all. Every PRIOR oracle:response-scanned consumer (RECIPE_JSON:/
    // DIRECTOR_CHOSEN:/EDL_JSON:/ORACLE_ACTION:) only ever hunted a single
    // inline marker followed by one blob (a JSON object, a slug) - never
    // multiple distinct list items - so this never surfaced until now.
    // Real fix: ask for one PIPE-delimited line instead of a numbered
    // list. A single line survives the newline-collapse (there's only one
    // line), and a bare " | " separator has nothing for renderMarkdown's
    // regex chain to strip (no `^\d+\. `, no leading `- `, no `**`/`*`).
    _suggestDishes: function(description, dishType, ingredients, cb) {
      var self = RPGACE.modules.cookingOracle;
      var extra = '';
      if (dishType) extra += ' The dish type should be: ' + dishType + '.';
      if (ingredients) extra += ' Try to incorporate these ingredients where sensible: ' + ingredients + '.';
      var prompt = 'I want to cook something in this category: "' + description + '".' + extra
        + ' Suggest exactly 5 distinct, concrete, real dish ideas that fit. '
        + 'Reply with ONLY the 5 dish ideas on a single line, separated by " | " (space, pipe, space) - '
        + 'no numbering, no bullets, no line breaks, no intro, no explanation. '
        + 'Example format: Dish One | Dish Two | Dish Three | Dish Four | Dish Five';

      var sent = RPGACE.utils.sendToOracle(prompt);
      if (!sent) { cb('Could not send to Oracle — chat may be busy, try again in a moment'); return; }

      var vo = RPGACE.modules.visualOracle;
      if (!vo || !vo._captureNextResponse) { cb('Oracle response capture is unavailable right now'); return; }
      vo._captureNextResponse(function(text) {
        var ideas = self.logic._parseDishList(text);
        if (!ideas || !ideas.length) { cb('Could not parse dish ideas from the reply — try again'); return; }
        cb(null, ideas);
      }, function(reason) {
        // Real fail-loud fix (Alex report: "Suggest 5 ideas" appearing to
        // silently do nothing) - see visualOracle._captureNextResponse's
        // own comment for the shared root cause this closes.
        cb(reason === 'busy'
          ? 'Oracle is already busy with another reply — wait a moment and try again'
          : 'Oracle took too long to reply (90s) — try again');
      });
    },

    _parseDishList: function(text) {
      var raw = String(text || '').trim();
      if (!raw) return [];
      // Real, 2nd bug found in the same live-repro pass (Sep 13 2026):
      // addMsg()'s own AI-message markup is `<div class="ai-name">✦
      // Oracle</div>${renderMarkdown(text)}` with no separator - textContent
      // of that element is therefore "✦ Oracle" GLUED directly onto the
      // real reply, e.g. "✦ OracleKimchi Fried Rice | Cabbage Bibimbap...".
      // No prior oracle:response-scanned consumer ever noticed, since every
      // one of them searches mid-string for a marker (RECIPE_JSON:/
      // ORACLE_ACTION:/etc), never splits from the very start of the text
      // the way this pipe-list parser does. Strip the known literal label
      // before splitting - it's addMsg's own fixed, non-instaMode AI label,
      // the only path _suggestDishes' capture ever goes through.
      raw = raw.replace(/^✦\s*Oracle\s*/i, '');
      var parts = raw.split('|').map(function(s) {
        // Defensive strip: even though the prompt asks for a bare pipe
        // line, still tolerate a stray leading number/bullet/asterisk on
        // an individual piece (e.g. Oracle numbering each segment anyway).
        return s.trim().replace(/^[-*\d.\)\s]+/, '').replace(/[\s.]+$/, '');
      }).filter(Boolean);
      // Real safety check: if Oracle ignored the pipe-format instruction
      // and no real delimiter came through at all, the whole reply is one
      // long unbroken blob (the exact failure mode this fix exists for) -
      // don't silently present that as a single garbled "idea"; treat it
      // as a genuine parse failure so the real retry path fires instead.
      if (parts.length < 2 && (parts[0] || '').length > 80) return [];
      return parts.slice(0, 5);
    },

    // H24 (Sep 17 2026, real Alex bug report — a real "lime"/"limes"
    // duplicate ingredient row silently hid 2 real limes already in his
    // fridge stock, "the most insane" bug he flagged) — a real, narrow
    // singular/plural fallback, same trailing-s precedent _normalizeUnit
    // already established (len>3 guard, never strip a short word). Tried
    // ONLY on a cache-miss, so the common exact-match case costs nothing
    // extra — one existing ingredients row is reused across a trivial
    // pluralization difference instead of a new near-duplicate being
    // minted, which is exactly what let "lime" (what recipes ask for) and
    // "limes" (what Alex actually typed into Current Stock) become two
    // separate rows with zero shared stock.
    _pluralVariant: function(norm) {
      if (!norm) return null;
      if (norm.length > 3 && norm.charAt(norm.length - 1) === 's') return norm.slice(0, -1);
      return norm + 's';
    },

    // Real ingredient resolution: case-insensitive lookup by name (matching
    // intelDedup's own normalized-key-exact-match precedent, not fuzzy) -
    // reuses an existing ingredients row across recipes instead of minting
    // a near-duplicate every time, which is what the whole ingredient_
    // frequency view depends on being accurate.
    _resolveIngredient: function(name, cb) {
      var self = RPGACE.modules.cookingOracle;
      var norm = String(name || '').trim().toLowerCase();
      if (!norm) { cb('ingredient with no name'); return; }
      RPGACE.sb.select('ingredients', 'name=eq.' + encodeURIComponent(norm) + '&select=id&limit=1')
        .then(function(rows) {
          if (rows && rows[0] && rows[0].id) { cb(null, rows[0].id); return; }
          var create = function() {
            RPGACE.sb.secureWrite('ingredients', 'insert', { name: norm })
              .then(function(data) {
                var row = Array.isArray(data) ? data[0] : data;
                if (!row || !row.id) throw new Error('ingredient insert returned no row');
                cb(null, row.id);
              })
              .catch(function(e) { cb(e.message || 'ingredient resolve failed'); });
          };
          var tryPlural = function() {
            var alt = self.logic._pluralVariant(norm);
            if (!alt) { create(); return; }
            RPGACE.sb.select('ingredients', 'name=eq.' + encodeURIComponent(alt) + '&select=id&limit=1')
              .then(function(altRows) {
                if (altRows && altRows[0] && altRows[0].id) { cb(null, altRows[0].id); return; }
                create();
              })
              .catch(create);
          };
          // H24 (Sep 17 2026, 7th pass) — a real, Alex-declared alias
          // (logic._declareSameItem) is checked BEFORE the plural guess —
          // stronger, deliberate evidence than a trailing-s heuristic,
          // and the whole real point of "no matter how i word it": a
          // wording he's already told this app means a known ingredient
          // must resolve there, not mint yet another near-duplicate row.
          RPGACE.sb.select('ingredient_aliases', 'alias_name=eq.' + encodeURIComponent(norm) + '&select=canonical_ingredient_id&limit=1')
            .then(function(aliasRows) {
              if (aliasRows && aliasRows[0] && aliasRows[0].canonical_ingredient_id) { cb(null, aliasRows[0].canonical_ingredient_id); return; }
              tryPlural();
            })
            .catch(tryPlural);
        })
        .catch(function(e) { cb(e.message || 'ingredient lookup failed'); });
    },

    // Oct 10 2026 (D1): the one stock write, shared by Current Stock's add
    // form and the fridge-photo import (dailyLife) - resolve the ingredient,
    // then upsert on (ingredient_id, location), so it sets the amount held.
    _upsertStock: function(name, location, qty, unit, cb) {
      var self = RPGACE.modules.cookingOracle;
      self.logic._resolveIngredientFull(name, function(err, row) {
        if (err) { cb(err); return; }
        RPGACE.sb.secureWrite('pantry_stock', 'insert', {
          ingredient_id: row.id, location: location, quantity: qty, unit: unit, updated_at: new Date().toISOString(),
        }, null, 'ingredient_id,location')
          .then(function() { cb(null, row); })
          .catch(function(e) { cb(e.message || 'save failed'); });
      });
    },

    // CR-1 (Oct 14 2026) — the one "add an amount to stock" write: reads the
    // exact (ingredient_id, location) row and upserts quantity + amount on
    // that same key. _upsertStock above SETS a quantity (fridge photo, Current
    // Stock form); this ADDS one (bought items, undoing a deduction).
    _addStock: function(ingredientId, location, amount, unit, cb) {
      RPGACE.sb.select('pantry_stock', 'select=quantity,unit&ingredient_id=eq.' + ingredientId + '&location=eq.' + encodeURIComponent(location) + '&limit=1')
        .then(function(rows) {
          var row = (rows || [])[0];
          var current = (row && typeof row.quantity === 'number') ? row.quantity : 0;
          return RPGACE.sb.secureWrite('pantry_stock', 'insert', {
            ingredient_id: ingredientId, location: location, quantity: Math.round((current + amount) * 100) / 100,
            unit: (row && row.unit) || unit, updated_at: new Date().toISOString(),
          }, null, 'ingredient_id,location');
        })
        .then(function() { RPGACE.cache && RPGACE.cache.clear && RPGACE.cache.clear('pantry_stock'); cb(null); })
        .catch(function(e) { cb(e.message || 'stock update failed'); });
    },

    // CR-1 — where a bought item most likely goes: the location it was last
    // stocked in, else a guess from its aisle (chilled -> fridge, frozen ->
    // freezer, everything else -> pantry). Alex can always change it.
    _defaultLocation: function(ingredientId, name, cb) {
      var self = RPGACE.modules.cookingOracle;
      var guess = function() {
        var aisle = self.logic._classifyAisle(name || '').name;
        if (aisle === 'Frozen') return 'freezer';
        if (aisle === 'Dairy & Chilled' || aisle === 'Meat & Fish') return 'fridge';
        return 'pantry';
      };
      if (!ingredientId) { cb(guess()); return; }
      RPGACE.sb.select('pantry_stock', 'select=location&ingredient_id=eq.' + ingredientId + '&order=updated_at.desc&limit=1')
        .then(function(rows) { cb((rows && rows[0] && rows[0].location) || guess()); })
        .catch(function() { cb(guess()); });
    },

    // H9 (calories/macros, Sep 13 2026) — same case-insensitive resolve-or-
    // create as _resolveIngredient above, but returns the FULL cached-
    // nutrition row too (not just an id) — a separate function rather than
    // changing _resolveIngredient's own contract, since _save above already
    // relies on that one resolving to a bare id (rule 4 — don't touch a
    // working call site's contract to serve a new, unrelated caller).
    // H24 (Sep 17 2026) — same real singular/plural fallback as
    // _resolveIngredient above (rule 8's own sibling, not a copy-pasted
    // divergent one): Current Stock's add-stock form (this function's
    // other real caller) is exactly where Alex hand-types a name that can
    // trivially differ in pluralization from whatever a recipe asked for.
    _resolveIngredientFull: function(name, cb) {
      var self = RPGACE.modules.cookingOracle;
      var norm = String(name || '').trim().toLowerCase();
      if (!norm) { cb('ingredient with no name'); return; }
      var NUTRI_SELECT = 'id,kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g';
      RPGACE.sb.select('ingredients', 'name=eq.' + encodeURIComponent(norm) + '&select=' + NUTRI_SELECT + '&limit=1')
        .then(function(rows) {
          if (rows && rows[0] && rows[0].id) { cb(null, rows[0]); return; }
          var create = function() {
            RPGACE.sb.secureWrite('ingredients', 'insert', { name: norm })
              .then(function(data) {
                var row = Array.isArray(data) ? data[0] : data;
                if (!row || !row.id) throw new Error('ingredient insert returned no row');
                cb(null, { id: row.id, kcal_per_100g: null, protein_g_per_100g: null, carbs_g_per_100g: null, fat_g_per_100g: null });
              })
              .catch(function(e) { cb(e.message || 'ingredient resolve failed'); });
          };
          var tryPlural = function() {
            var alt = self.logic._pluralVariant(norm);
            if (!alt) { create(); return; }
            RPGACE.sb.select('ingredients', 'name=eq.' + encodeURIComponent(alt) + '&select=' + NUTRI_SELECT + '&limit=1')
              .then(function(altRows) {
                if (altRows && altRows[0] && altRows[0].id) { cb(null, altRows[0]); return; }
                create();
              })
              .catch(create);
          };
          // H24 (Sep 17 2026, 7th pass) — same real alias-check as
          // _resolveIngredient above (rule 8's own sibling), checked
          // before the plural guess — Current Stock's add-stock form
          // (this function's other real caller) is exactly where a
          // declared alias needs to resolve straight to the canonical
          // ingredient instead of minting a new row.
          RPGACE.sb.select('ingredient_aliases', 'alias_name=eq.' + encodeURIComponent(norm) + '&select=canonical_ingredient_id&limit=1')
            .then(function(aliasRows) {
              var canonId = aliasRows && aliasRows[0] && aliasRows[0].canonical_ingredient_id;
              if (!canonId) { tryPlural(); return; }
              RPGACE.sb.select('ingredients', 'id=eq.' + canonId + '&select=' + NUTRI_SELECT + '&limit=1')
                .then(function(canonRows) {
                  if (canonRows && canonRows[0] && canonRows[0].id) { cb(null, canonRows[0]); return; }
                  tryPlural();
                })
                .catch(tryPlural);
            })
            .catch(tryPlural);
        })
        .catch(function(e) { cb(e.message || 'ingredient lookup failed'); });
    },

    // H9 Stage 2 (Sep 13 2026, same session as the Open Food Facts swap) —
    // real UK CoFID (McCance & Widdowson) lookup, checked FIRST for every
    // ingredient, since a recipe lists generic/raw ingredients ("onion",
    // "chicken breast") and CoFID is the real UK official databank for
    // exactly that — Open Food Facts (below) is the correct fallback for
    // whatever CoFID doesn't have, not the other way round. `cofid_foods`
    // starts genuinely empty until Alex supplies the real government
    // dataset file (this session's own outbound proxy cannot reach
    // assets.publishing.service.gov.uk, confirmed by direct test, not
    // assumed) — this function fails open (no match) on an empty table,
    // it never blocks the existing Open Food Facts path.
    //
    // No AI call, no server round-trip — a plain client-side Supabase read
    // against the trigram-indexed food_name column, scored by real whole-
    // word overlap between the ingredient name and each candidate (never a
    // bare substring accept, which would happily match "onion" against
    // "Onion rings, battered, fried" and silently return fried-food
    // nutrition for a raw ingredient). Requires at least 1 real overlapping
    // word; ties broken toward the shorter food_name (a plainer, less
    // composite dish name is more likely the real generic match).
    _lookupCofid: function(name, cb) {
      var norm = String(name || '').trim().toLowerCase();
      if (!norm) { cb(null, { matched: false }); return; }
      var STOPWORDS = { a: 1, an: 1, the: 1, of: 1, in: 1, with: 1, and: 1, or: 1, for: 1 };
      var words = norm.split(/[^a-z]+/).filter(function(w) { return w.length > 1 && !STOPWORDS[w]; });
      if (!words.length) { cb(null, { matched: false }); return; }
      // Longest word first — the most specific term to search on (matches
      // the established RPGACE ilike.*term* convention, e.g. video_jobs
      // title search elsewhere in this file).
      var searchTerm = words.slice().sort(function(a, b) { return b.length - a.length; })[0];
      RPGACE.sb.select('cofid_foods', 'food_name=ilike.*' + encodeURIComponent(searchTerm) + '*&select=food_name,kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g&limit=30')
        .then(function(rows) {
          rows = rows || [];
          if (!rows.length) { cb(null, { matched: false }); return; }
          var best = null, bestScore = 0;
          rows.forEach(function(r) {
            // Real edge case, caught by a synthetic-fixture test before
            // shipping: a real CoFID row can carry every nutrient as null
            // (e.g. "Water, tap") — such a row must never win, since a
            // silent all-null "match" would block the Open Food Facts
            // fallback from ever running for that ingredient.
            if (typeof r.kcal_per_100g !== 'number') return;
            var candNorm = String(r.food_name || '').toLowerCase();
            var candWords = candNorm.split(/[^a-z]+/).filter(function(w) { return w.length > 1; });
            var score = words.filter(function(w) { return candWords.indexOf(w) !== -1; }).length;
            if (score > bestScore || (score === bestScore && best && candNorm.length < String(best.food_name || '').length)) {
              best = r; bestScore = score;
            }
          });
          if (!best || bestScore < 1) { cb(null, { matched: false }); return; }
          cb(null, {
            matched: true,
            fdcDescription: best.food_name,
            kcal_per_100g: (typeof best.kcal_per_100g === 'number') ? best.kcal_per_100g : null,
            protein_g_per_100g: (typeof best.protein_g_per_100g === 'number') ? best.protein_g_per_100g : null,
            carbs_g_per_100g: (typeof best.carbs_g_per_100g === 'number') ? best.carbs_g_per_100g : null,
            fat_g_per_100g: (typeof best.fat_g_per_100g === 'number') ? best.fat_g_per_100g : null,
          });
        })
        .catch(function(e) { cb(e.message || 'CoFID lookup failed'); });
    },

    // Real server-side Open Food Facts relay (api/oracle.js's own
    // 'nutrition-lookup' action — real and live, no key/activation needed
    // at all, swapped from the original USDA scaffold same day per Alex's
    // own direct correction: he's UK-based, USDA is a US database). Real
    // FALLBACK now (Stage 2 wiring, same session) — only reached when
    // _lookupCofid above found no real match. Uses the global fetch() wrap
    // authGate already installs (every /api/* call gets the real auth
    // header automatically — no manual header here, matching every other
    // direct /api/oracle caller in this file, e.g. oracleProviderMode's
    // own external-provider branch).
    _lookupNutrition: function(name, cb) {
      fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nutrition-lookup', name: name }),
      })
        .then(function(res) {
          return res.text().then(function(text) {
            var data;
            try { data = JSON.parse(text); } catch (e) { throw new Error('Nutrition lookup returned non-JSON: ' + text.slice(0, 100)); }
            if (!res.ok) throw new Error(data.error || ('Nutrition lookup error ' + res.status));
            cb(null, data);
          });
        })
        .catch(function(e) { cb(e.message || 'Nutrition lookup failed'); });
    },

    // Resolves every real ingredient in a not-yet-saved recipe (create-or-
    // find, same as _save's own path), looks up + caches real Open Food
    // Facts nutrition for any still missing (Alex's own explicit "save the
    // data in supabase once so can always access" — never re-queried once
    // cached), then sums a best-effort total from whatever's actually
    // known. Per-ingredient lookup failures (a transient Open Food Facts
    // error, or no real match found) never abort the whole computation —
    // each ingredient either contributes or is honestly excluded,
    // reflected in resolvedCount/totalCount rather than silently guessed.
    // No "not configured" state anymore — Open Food Facts needs no key.
    _ensureNutrition: function(ingredients, cb) {
      var list = ingredients || [];
      if (!list.length) { cb(null, { kcal: 0, protein: 0, carbs: 0, fat: 0, resolvedCount: 0, totalCount: 0, lookupFailed: false }); return; }
      var results = new Array(list.length);
      var pending = list.length;
      var lookupFailedEver = false;

      var finish = function() {
        var kcal = 0, protein = 0, carbs = 0, fat = 0, resolvedCount = 0;
        results.forEach(function(r, i) {
          var grams = (typeof list[i].grams_estimate === 'number') ? list[i].grams_estimate : null;
          if (!r || grams == null || r.kcal_per_100g == null) return;
          var factor = grams / 100;
          kcal += (r.kcal_per_100g || 0) * factor;
          protein += (r.protein_g_per_100g || 0) * factor;
          carbs += (r.carbs_g_per_100g || 0) * factor;
          fat += (r.fat_g_per_100g || 0) * factor;
          resolvedCount++;
        });
        cb(null, { kcal: kcal, protein: protein, carbs: carbs, fat: fat, resolvedCount: resolvedCount, totalCount: list.length, lookupFailed: lookupFailedEver });
      };

      var self = RPGACE.modules.cookingOracle;
      // Shared cache-and-finish step — both the CoFID match and the Open
      // Food Facts fallback land here identically (rule 8), so the two
      // real sources never need two copies of the same save/finish logic.
      var applyMatch = function(row, i, data, source) {
        var patch = {
          kcal_per_100g: data.kcal_per_100g, protein_g_per_100g: data.protein_g_per_100g,
          carbs_g_per_100g: data.carbs_g_per_100g, fat_g_per_100g: data.fat_g_per_100g,
          nutrition_source: source, nutrition_cached_at: new Date().toISOString(),
        };
        RPGACE.sb.secureWrite('ingredients', 'update', patch, 'id=eq.' + row.id)
          .then(function() {
            row.kcal_per_100g = data.kcal_per_100g; row.protein_g_per_100g = data.protein_g_per_100g;
            row.carbs_g_per_100g = data.carbs_g_per_100g; row.fat_g_per_100g = data.fat_g_per_100g;
          })
          .catch(function() { /* real save failure — this ingredient just stays uncached this pass, not fatal to the rest */ })
          .then(function() { results[i] = row; pending--; if (pending === 0) finish(); });
      };

      list.forEach(function(ing, i) {
        self.logic._resolveIngredientFull(ing.name, function(err, row) {
          if (err) { results[i] = null; pending--; if (pending === 0) finish(); return; }
          if (row.kcal_per_100g != null) { results[i] = row; pending--; if (pending === 0) finish(); return; }
          // Real Stage 2 priority: CoFID (UK generic-ingredient data) first,
          // Open Food Facts (branded-product data) only as the fallback —
          // see _lookupCofid's own comment for why that order matters.
          self.logic._lookupCofid(ing.name, function(cerr, cdata) {
            if (!cerr && cdata && cdata.matched) { applyMatch(row, i, cdata, 'cofid'); return; }
            self.logic._lookupNutrition(ing.name, function(lerr, data) {
              if (lerr) {
                lookupFailedEver = true;
                results[i] = row; pending--; if (pending === 0) finish(); return;
              }
              if (!data || !data.matched) { results[i] = row; pending--; if (pending === 0) finish(); return; }
              applyMatch(row, i, data, 'openfoodfacts');
            });
          });
        });
      });
    },

    // Sep 13 2026 (H10) - real, named pantry read (ingredient_id -> name,
    // quantity, unit), factored out (rule 8) from ui._showPantry's own
    // inline query so the new pantry-aware ingredient-suggestion feature
    // reuses the identical real embed shape instead of a 2nd hand-rolled
    // query against the same table.
    // Real optional 2nd arg (`err`) on failure - lets a real load failure be
    // told apart from a genuinely empty pantry (ui._showPantry uses this;
    // the pantry-aware suggestion feature below doesn't need to, and JS
    // callbacks simply ignore an extra arg they don't declare).
    // Sep 16 2026 - pantry_stock now carries a real `location` column
    // (pantry/fridge/freezer) instead of one row per ingredient. This
    // caller (the Oracle ingredient-suggestion feature below) doesn't
    // care WHERE stock physically sits, only whether it exists at all -
    // so rows are summed per ingredient+unit across all 3 locations here,
    // keeping this function's own return shape (and its existing caller)
    // unchanged.
    // CR-1 (Oct 14 2026, Cooking Reorganisation) — no longer its own
    // pantry_stock read: it flattens logic._loadPantrySummed's
    // byIngredient buckets (rule 8 — one read for "what's in stock").
    // Same return shape for its 2 callers: [{name, quantity, unit}],
    // summed per ingredient + unit across pantry/fridge/freezer.
    _loadPantryNamed: function(cb) {
      var self = RPGACE.modules.cookingOracle;
      self.logic._loadPantrySummed(function(snap) {
        var out = [];
        Object.keys((snap && snap.byIngredient) || {}).forEach(function(id) {
          snap.byIngredient[id].forEach(function(b) {
            if (b.name) out.push({ name: b.name, quantity: b.quantity, unit: b.unit });
          });
        });
        cb(out, null);
      });
    },

    // Real, location-filtered read for the Current Stock tabs (H11, Sep 16
    // 2026) - a genuinely different shape than _loadPantryNamed above
    // (per-location rows, plus ingredient_id + updated_at for the delete
    // button and the staleness badge), kept as its own function rather
    // than overloading one query shape for two different real consumers.
    // Oct 21 2026 (Alex: "I need it grouped by type of item (cooking/baking/
    // both; spice, fruit, veg etc)"). ingredients.food_type / ingredients.use
    // hold the answer once set (seeded by hand for his 62 items, then changed
    // with a tap); these guesses only fill a null. Food type is not the shop
    // aisle (_AISLE_GROUPS walks a supermarket; this groups a cupboard).
    STOCK_TYPES: [
      { key: 'spices', label: 'Spices & seasoning', icon: '🌶️', kw: ['spice', 'pepper', 'peppercorn', 'cumin', 'paprika', 'turmeric', 'cinnamon', 'clove', 'nutmeg', 'cardamom', 'star anise', 'fennel', 'coriander seed', 'chilli flake', 'chilli powder', 'cayenne', 'garam masala', 'curry powder', 'salt', 'msg', 'granules', 'dried chilli', 'chillis (dried)', 'bay leaf', 'allspice', 'mustard seed'] },
      { key: 'herbs', label: 'Herbs', icon: '🌿', kw: ['parsley', 'thyme', 'oregano', 'basil', 'rosemary', 'mint', 'dill', 'sage', 'coriander leaf', 'fresh coriander', 'chive', 'lime leaves', 'lime peaves', 'kaffir', 'lemongrass'] },
      { key: 'veg', label: 'Veg', icon: '🥕', kw: ['onion', 'garlic', 'shallot', 'ginger', 'carrot', 'potato', 'tomato', 'pepper (bell)', 'bell pepper', 'cabbage', 'spinach', 'broccoli', 'pea', 'bean sprout', 'mushroom', 'courgette', 'aubergine', 'leek', 'celery', 'cucumber', 'lettuce', 'kale', 'chilli', 'spring onion', 'pak choi', 'bok choy', 'sweetcorn', 'corn'] },
      { key: 'fruit', label: 'Fruit', icon: '🍋', kw: ['lime', 'lemon', 'orange', 'apple', 'banana', 'berry', 'berries', 'mango', 'pineapple', 'grape', 'pear', 'peach', 'cherry', 'raisin', 'sultana', 'date', 'coconut flesh'] },
      { key: 'meat_fish', label: 'Meat & fish', icon: '🍗', kw: ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'turkey', 'duck', 'fish', 'salmon', 'cod', 'prawn', 'shrimp', 'squid', 'tuna', 'anchovy', 'steak'] },
      { key: 'dairy_eggs', label: 'Dairy & eggs', icon: '🧈', kw: ['butter', 'milk', 'cheese', 'cream', 'yoghurt', 'yogurt', 'egg', 'paneer', 'ghee'] },
      { key: 'grains', label: 'Rice, pasta & grains', icon: '🍚', kw: ['rice', 'noodle', 'pasta', 'spaghetti', 'oat', 'couscous', 'quinoa', 'bread', 'tortilla', 'naan'] },
      { key: 'flour_baking', label: 'Flour & baking', icon: '🧁', kw: ['flour', 'baking powder', 'bicarbonate', 'baking soda', 'yeast', 'cocoa', 'vanilla', 'extract', 'cornflour', 'cornstarch', 'gelatine', 'chocolate chip', 'bread mix', 'sprinkles'] },
      { key: 'sugar_sweet', label: 'Sugar & sweet', icon: '🍯', kw: ['sugar', 'honey', 'syrup', 'treacle', 'molasses', 'jam', 'chocolate'] },
      { key: 'sauces', label: 'Sauces, pastes & stock', icon: '🥫', kw: ['sauce', 'paste', 'stock', 'bouillon', 'mustard', 'ketchup', 'mayo', 'mayonnaise', 'miso', 'gochujang', 'toban'] },
      { key: 'oils_vinegar', label: 'Oils & vinegar', icon: '🫒', kw: ['oil', 'vinegar'] },
      { key: 'tins_jars', label: 'Tins & jars', icon: '🥫', kw: ['tinned', 'canned', 'tin ', 'condensed milk', 'evaporated milk', 'coconut milk', 'chickpea', 'lentil', 'bean', 'puree', 'plum tomatoes', 'peanut butter'] },
      { key: 'nuts_seeds', label: 'Nuts & seeds', icon: '🥜', kw: ['nut', 'almond', 'cashew', 'peanut', 'sesame seed', 'seed', 'desiccated coconut', 'coconut'] },
      { key: 'frozen', label: 'Frozen', icon: '🧊', kw: ['frozen', 'ice cream'] },
      { key: 'drinks', label: 'Drinks', icon: '🥤', kw: ['juice', 'water', 'wine', 'beer', 'tea', 'coffee', 'soda', 'cola'] },
      { key: 'other', label: 'Other', icon: '📦', kw: [] },
    ],
    // Checked in this order so "frozen peas" is veg, "chicken stock cubes" is
    // a stock, "peanut butter" a jar, "garlic granules" a spice.
    STOCK_TYPE_ORDER: ['tins_jars', 'flour_baking', 'sauces', 'spices', 'oils_vinegar', 'sugar_sweet', 'herbs', 'meat_fish', 'dairy_eggs', 'grains', 'fruit', 'veg', 'nuts_seeds', 'drinks', 'frozen'],
    BAKING_ONLY: ['baking powder', 'bicarbonate', 'baking soda', 'yeast', 'cocoa', 'icing sugar', 'caster sugar', 'vanilla', 'extract', 'bread mix', 'bread flour', 'strong white', 'self-raising', 'self raising', 'chocolate chip', 'condensed milk', 'desiccated', 'sprinkles', 'gelatine'],
    BAKING_TOO: ['flour', 'cornflour', 'sugar', 'butter', 'egg', 'milk', 'cream', 'honey', 'syrup', 'cinnamon', 'nutmeg', 'cardamom', 'clove', 'salt', 'vegetable oil', 'lemon', 'lime', 'orange', 'peanut butter', 'oat', 'raisin', 'sultana', 'chocolate', 'ginger', 'coconut'],
    stockTypeMeta: function(key) {
      var L = RPGACE.modules.cookingOracle.logic;
      return L.STOCK_TYPES.filter(function(t) { return t.key === key; })[0] || L.STOCK_TYPES[L.STOCK_TYPES.length - 1];
    },
    stockType: function(name) {
      var L = RPGACE.modules.cookingOracle.logic, n = ' ' + String(name || '').toLowerCase() + ' ';
      for (var i = 0; i < L.STOCK_TYPE_ORDER.length; i++) {
        var t = L.stockTypeMeta(L.STOCK_TYPE_ORDER[i]);
        if (t.kw.some(function(k) { return n.indexOf(k) !== -1; })) return t.key;
      }
      return 'other';
    },
    stockUse: function(name) {
      var L = RPGACE.modules.cookingOracle.logic, n = String(name || '').toLowerCase();
      var has = function(list) { return list.some(function(k) { return n.indexOf(k) !== -1; }); };
      if (has(L.BAKING_ONLY)) return 'baking';
      if (has(L.BAKING_TOO)) return 'both';
      return 'cooking';
    },
    setStockTags: function(ingredientId, patch, cb) {
      RPGACE.sb.secureWrite('ingredients', 'update', patch, 'id=eq.' + ingredientId)
        .then(function() { RPGACE.cache && RPGACE.cache.clear && RPGACE.cache.clear('ingredients'); cb(null); })
        .catch(function(e) { cb((e && e.message) || 'save failed'); });
    },

    _loadStockByLocation: function(location, cb) {
      var L = RPGACE.modules.cookingOracle.logic;
      RPGACE.sb.select('pantry_stock', 'select=ingredient_id,quantity,unit,updated_at,ingredients(name,food_type,use)&location=eq.' + encodeURIComponent(location) + '&order=updated_at.desc')
        .then(function(rows) {
          cb((rows || []).map(function(r) {
            var ing = r.ingredients || {}, name = ing.name || '';
            return { ingredient_id: r.ingredient_id, name: name, quantity: r.quantity, unit: r.unit, updated_at: r.updated_at,
              food_type: ing.food_type || L.stockType(name), use: ing.use || L.stockUse(name), guessed: !ing.food_type || !ing.use };
          }).filter(function(r) { return r.name; }), null);
        })
        .catch(function(e) { cb([], e); });
    },

    _deleteStockItem: function(ingredientId, location, cb) {
      RPGACE.sb.secureWrite('pantry_stock', 'delete', null,
        'ingredient_id=eq.' + ingredientId + '&location=eq.' + encodeURIComponent(location))
        .then(function() { cb(null); })
        .catch(function(e) { cb(e); });
    },

    // Real owned-equipment inventory reads/writes (H11, Sep 16 2026,
    // kitchen_equipment table - /interrogation-confirmed genuinely
    // distinct domain from habits_config's oven_slots/stovetop_slots and
    // from shoppingWishlist's planned-purchase tracking).
    _loadEquipment: function(cb) {
      RPGACE.sb.select('kitchen_equipment', 'select=id,name,quantity,notes&order=name.asc')
        .then(function(rows) { var L = RPGACE.modules.cookingOracle.logic; L._kitLoaded = true; L._kit = L._parseKit(rows || []); cb(rows || [], null); })
        .catch(function(e) { cb([], e); });
    },

    _saveEquipment: function(name, quantity, cb) {
      RPGACE.sb.secureWrite('kitchen_equipment', 'insert', {
        name: name, quantity: quantity, updated_at: new Date().toISOString(),
      })
        .then(function() { cb(null); })
        .catch(function(e) { cb(e); });
    },

    _deleteEquipment: function(id, cb) {
      RPGACE.sb.secureWrite('kitchen_equipment', 'delete', null, 'id=eq.' + id)
        .then(function() { cb(null); })
        .catch(function(e) { cb(e); });
    },

    // Sep 16 2026 - real Alex ask: a real photo of the dish on the recipe
    // card. Routes through /api/search's new `type:'recipe-image'` branch
    // (server-side, so a real image-search API key never ships to the
    // client - same discipline as every other keyed external connector).
    // Fails open to no photo (never a broken-image icon or a fake
    // placeholder) on any error - a missing photo for an obscure
    // generated dish name is an honest empty state, not a bug (rule 7).
    _fetchRecipePhoto: function(title, cb) {
      fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'recipe-image', query: title }),
      })
        .then(function(r) { return r.json(); })
        .then(function(data) { cb((data && data.image) || null); })
        .catch(function() { cb(null); });
    },

    // Sep 13 2026 (H10, real Alex ask - "no option to add or suggest
    // ingredients (like meat, love meat, or fish)... could include
    // suggestions from pantry too so waste is reduced") - real
    // /interrogation confirmed both a manual add row (ui._showRecipeCard)
    // AND this Oracle-assisted, pantry-aware suggestion pass. Same compact-
    // single-line-JSON-trailer convention as _parseRecipeJSON (never a
    // numbered/bulleted list - see the standing landmine on renderMarkdown/
    // textContent right above _suggestDishes below).
    _suggestIngredientAdditions: function(recipe, cb) {
      var self = RPGACE.modules.cookingOracle;
      self.logic._loadPantryNamed(function(pantry) {
        var haveNames = (recipe.ingredients || []).map(function(i) { return i.name; }).join(', ') || '(none yet)';
        var pantryText = pantry.length
          ? pantry.map(function(p) { return p.name + ' (' + (p.quantity != null ? p.quantity : '?') + ' ' + (p.unit || '') + ')'; }).join(', ')
          : '(pantry is empty or not tracked)';
        var prompt = 'Recipe: "' + (recipe.title || 'this recipe') + '". Current ingredients: ' + haveNames + '. '
          + 'My real pantry stock right now: ' + pantryText + '. '
          + 'Suggest up to 4 optional ingredient ADDITIONS that would genuinely improve or round out this dish '
          + '(e.g. a protein like meat or fish, a vegetable, a garnish) — not replacements, not core ingredients already listed. '
          + 'Prefer suggesting something already in my pantry stock above, to reduce food waste, when it would genuinely fit the dish — '
          + 'but only suggest real, sensible additions, never force a pantry item that would not actually work. '
          + self.UNIT_PREFERENCE_TEXT
          + 'For each suggestion, estimate its real weight in grams at the amount you suggest (same convention as a normal ingredient). '
          + 'Reply with ONLY, on its own single line, exactly: INGREDIENT_SUGGESTIONS_JSON: followed by a compact JSON array in the shape '
          + '[{"name":"...","amount":<number>,"unit":"...","grams_estimate":<number>,"reason":"short real reason, under 12 words"}]. '
          + 'No other text, no markdown, no line breaks inside the JSON.';

        var sent = RPGACE.utils.sendToOracle(prompt);
        if (!sent) { cb('Could not send to Oracle — chat may be busy, try again in a moment'); return; }

        var vo = RPGACE.modules.visualOracle;
        if (!vo || !vo._captureNextResponse) { cb('Oracle response capture is unavailable right now'); return; }
        vo._captureNextResponse(function(text) {
          var suggestions = self.logic._parseIngredientSuggestions(text);
          if (!suggestions) { cb('Could not parse suggestions from the reply — try again'); return; }
          // Real, checkable pantry-match flag - computed here from the
          // actual pantry rows just loaded, never trusted from the model's
          // own claim (rule 7 - don't take a checkable fact on the model's
          // say-so when the real data is already in hand).
          var pantryNorm = pantry.map(function(p) { return p.name.trim().toLowerCase(); });
          suggestions.forEach(function(s) {
            s.inPantry = pantryNorm.indexOf(String(s.name || '').trim().toLowerCase()) !== -1;
          });
          cb(null, suggestions);
        }, function(reason) {
          // Real fail-loud fix - see visualOracle._captureNextResponse's
          // own comment for the shared root cause this closes.
          cb(reason === 'busy'
            ? 'Oracle is already busy with another reply — wait a moment and try again'
            : 'Oracle took too long to reply (90s) — try again');
        });
      });
    },

    _parseIngredientSuggestions: function(text) {
      var raw = String(text || '').replace(/^✦\s*Oracle\s*/i, '');
      var m = raw.match(/INGREDIENT_SUGGESTIONS_JSON:\s*(\[[\s\S]*\])/);
      if (!m) return null;
      var list;
      try { list = JSON.parse(m[1]); } catch (e) { return null; }
      if (!Array.isArray(list)) return null;
      return list.filter(function(s) { return s && s.name; }).slice(0, 4);
    },

    // Sep 13 2026 (real Alex ask, same-day follow-up after hand-testing:
    // "make so that save to cook just saves to cook, but not to journal,
    // so that I can then rate the dishes and save liked ones") - `_save`
    // now takes a real `withJournal` flag instead of always writing a
    // journal row. Both real callers (ui._showRecipeCard's Save/Add-to-
    // Cook-Session buttons) route through this same function (rule 8) -
    // the recipes/recipe_ingredients write is identical either way, only
    // the journal half is conditional.
    _save: function(recipe, rawText, withJournal, cb) {
      var self = RPGACE.modules.cookingOracle;
      var ingredients = recipe.ingredients || [];
      var resolved = new Array(ingredients.length);
      var pending = ingredients.length;
      var failed = null;

      if (pending === 0) { cb('recipe has no ingredients — nothing to save'); return; }

      ingredients.forEach(function(ing, i) {
        self.logic._resolveIngredient(ing.name, function(err, id) {
          if (failed) return; // already failed on a different ingredient
          if (err) { failed = err; cb(err); return; }
          resolved[i] = id;
          pending--;
          if (pending === 0) self.logic._saveRecipeRow(recipe, rawText, ingredients, resolved, withJournal, cb);
        });
      });
    },

    _saveRecipeRow: function(recipe, rawText, ingredients, resolvedIds, withJournal, cb) {
      // recipeId captured across the promise chain (not chained as a return
      // value through every .then) so the final callback can hand it back to
      // the UI — H6 (2026-09-12) needs it to add the saved recipe to an
      // in-progress cook session; nothing before this needed it, since cb(null)
      // used to be the whole contract.
      var recipeId;
      RPGACE.sb.secureWrite('recipes', 'insert', {
        title: recipe.title || 'Untitled recipe',
        servings_base: recipe.servings_base || 4,
        steps: recipe.steps || [],
        cuisine: (typeof recipe.cuisine === 'string' && recipe.cuisine.trim()) ? recipe.cuisine.trim().slice(0, 40) : null,
        source: 'oracle',
        raw_response: rawText || null,
      })
        .then(function(data) {
          var row = Array.isArray(data) ? data[0] : data;
          if (!row || !row.id) throw new Error('recipe insert returned no row');
          recipeId = row.id;
          var riPayload = ingredients.map(function(ing, i) {
            return { recipe_id: recipeId, ingredient_id: resolvedIds[i], amount: ing.amount, unit: ing.unit || null, grams_estimate: (typeof ing.grams_estimate === 'number') ? ing.grams_estimate : null, is_separable: !!ing.is_separable };
          });
          return RPGACE.sb.secureWrite('recipe_ingredients', 'insert', riPayload);
        })
        .then(function() {
          if (!withJournal) return null;
          return RPGACE.modules.cookingOracle.logic._insertJournalEntry(recipe, ingredients, recipeId);
        })
        .then(function() { cb(null, recipeId); })
        .catch(function(e) { cb(e.message || 'save failed'); });
    },

    // H24 (Sep 17 2026, 9th pass) — real, structural bug found and fixed,
    // not just a new feature: the RECIPE_UPDATE_JSON critique -> diff ->
    // Accept/Deny pipeline (ui._showRecipeCard's applyRecipeUpdate) has
    // ALWAYS only ever mutated the open card's own in-memory `recipe`
    // object — _save/_saveRecipeRow above only ever INSERTs (confirmed by
    // direct grep, exactly one real `secureWrite('recipes','insert',...)`
    // call in the whole file), so every accepted update on an
    // ALREADY-SAVED recipe (the "Update Method for this" banner, a raw
    // typed critique, and now the "Update recipe to match current stock"
    // button) silently never reached Supabase — closing the popup or
    // reloading the page discarded it. Real, direct cause of Alex's own
    // repeated report that a recipe's steps never actually end up
    // showing real measurements even after asking for an update. Fixed
    // with a real, dedicated UPDATE path (rule 8 — reuses the same real
    // ingredient-resolve step _save already does, never re-derives it):
    // UPDATEs the recipes row's title/steps in place, then replaces
    // recipe_ingredients wholesale (a real, safe delete+reinsert —
    // confirmed via direct schema query that nothing else has a foreign
    // key onto recipe_ingredients.id, so this can never orphan a
    // reference) rather than attempting a fragile per-row diff-merge.
    _updateSavedRecipe: function(recipeId, recipe, cb) {
      var self = RPGACE.modules.cookingOracle;
      var ingredients = recipe.ingredients || [];
      RPGACE.sb.secureWrite('recipes', 'update', {
        title: recipe.title || 'Untitled recipe',
        steps: recipe.steps || [],
      }, 'id=eq.' + recipeId)
        .then(function() {
          if (!ingredients.length) return [];
          return new Promise(function(resolve, reject) {
            var resolved = new Array(ingredients.length);
            var pending = ingredients.length;
            var failed = null;
            ingredients.forEach(function(ing, i) {
              self.logic._resolveIngredient(ing.name, function(err, id) {
                if (failed) return;
                if (err) { failed = err; reject(err); return; }
                resolved[i] = id;
                pending--;
                if (pending === 0) resolve(resolved);
              });
            });
          });
        })
        .then(function(resolvedIds) {
          return RPGACE.sb.secureWrite('recipe_ingredients', 'delete', null, 'recipe_id=eq.' + recipeId)
            .then(function() {
              if (!resolvedIds || !resolvedIds.length) return null;
              var riPayload = ingredients.map(function(ing, i) {
                return { recipe_id: recipeId, ingredient_id: resolvedIds[i], amount: ing.amount, unit: ing.unit || null, grams_estimate: (typeof ing.grams_estimate === 'number') ? ing.grams_estimate : null, is_separable: !!ing.is_separable };
              });
              return RPGACE.sb.secureWrite('recipe_ingredients', 'insert', riPayload);
            });
        })
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'update failed'); });
    },

    // Real, separate journal-row insert (rule 8) - shared by _saveRecipeRow
    // (Save to Journal, saving for the first time) AND ui._showRecipeCard's
    // Save button when the recipe already has a real recipeId (Add to Cook
    // Session was clicked first) - the underlying recipes row is only ever
    // created once either way, the journal row can be added on top of it
    // later without re-saving the recipe.
    _insertJournalEntry: function(recipe, ingredients, recipeId) {
      var summary = (recipe.title || 'Recipe') + '\n\nIngredients:\n'
        + (ingredients || []).map(function(i) { return '- ' + (i.amount != null ? i.amount : '') + ' ' + (i.unit || '') + ' ' + i.name; }).join('\n')
        + '\n\nMethod:\n'
        + (recipe.steps || []).map(function(s, idx) { return (idx + 1) + '. [' + s.type + '] ' + s.description; }).join('\n');
      return RPGACE.sb.secureWrite('journal', 'insert', {
        title: recipe.title || 'Recipe',
        date: new Date().toISOString().slice(0, 10),
        content: summary,
        source: 'cookingOracle',
        entry_type: 'recipe',
        status: 'saved',
        recipe_id: recipeId,
      });
    },

    _markCooked: function(journalId, cb) {
      if (!journalId) { cb('no journal id'); return; }
      RPGACE.sb.secureWrite('journal', 'update', {
        status: 'cooked',
        cooked_at: new Date().toISOString(),
      }, 'id=eq.' + journalId)
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'mark-cooked failed'); });
    },

    // ============================================================
    // H7/H8 — shopping list, pantry, price logging, Sep 13 2026.
    // Real record: records/2026-09/habits_shopping_pantry_calories_spec_
    // 2026-09-13.txt (4 forks resolved via AskUserQuestion).
    // ============================================================

    // H13 (Sep 16 2026, real Alex ask: "make grocery list auto sort by
    // aisle, too much scrolling and calculating needed"). Deliberately a
    // client-side, zero-AI-cost, zero-schema-change keyword classifier
    // (same mechanical-grouping discipline as cofid_foods' own
    // base_ingredient/prep_state columns, rule 12's "mechanical tier"
    // precedent) rather than a new ingredients.aisle column - a schema
    // migration+backfill would need a real Tier-3 confirmation and still
    // couldn't classify a brand-new ingredient the moment it's added,
    // where this classifies any ingredient name live, no backfill ever
    // needed. Honest, best-effort categorization, not a precise
    // planogram - anything unmatched falls into the catch-all
    // "Household & Other" bucket at the end rather than being silently
    // dropped or crashing.
    //
    // `walkOrder` (final render/sort order, a real UK-supermarket-shaped
    // walk) is deliberately kept SEPARATE from array position (which
    // controls match PRIORITY - checked top to bottom, first hit wins).
    // Real collision, found and fixed via a headless test
    // (h13_aisle_sort), not assumed correct on first write: a bare,
    // common word ("pepper", "cream", "vanilla") can be a real substring
    // of a DIFFERENT category's item - "peppercorn" is a spice, not
    // produce; "vanilla ice cream" is frozen, not a spice or dairy. Fix
    // is two-part: compound/specific phrases listed ahead of a shorter
    // bare word wherever the collision is real, AND Frozen's array
    // position moved early (checked right after Fruit & Veg) so
    // "ice cream" resolves before Spices' bare "vanilla" or Dairy's bare
    // "cream" can claim it - while its own walkOrder (6) keeps it
    // rendering late, matching a real shopping trip (frozen last, so
    // it doesn't thaw while the rest of the list gets worked through).
    _AISLE_GROUPS: [
      { name: 'Fruit & Veg', walkOrder: 0, keywords: ['onion', 'garlic', 'ginger', 'shallot', 'chilli', 'chili', 'bell pepper', 'red pepper', 'green pepper', 'yellow pepper', 'capsicum', 'tomato', 'potato', 'carrot', 'cabbage', 'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower', 'courgette', 'zucchini', 'cucumber', 'celery', 'leek', 'mushroom', 'lemongrass', 'galangal', 'kaffir lime', 'lime leaf', 'spring onion', 'scallion', 'apple', 'banana', 'lemon', 'lime', 'orange', 'avocado', 'coriander', 'cilantro', 'parsley', 'basil', 'mint', 'thyme', 'rosemary', 'sage', 'dill', 'chive', 'bean sprout', 'beansprout', 'pak choi', 'bok choy', 'sweetcorn', 'sweet corn', 'pumpkin', 'squash', 'aubergine', 'eggplant', 'radish', 'beetroot', 'turnip'] },
      { name: 'Frozen', walkOrder: 6, keywords: ['frozen', 'ice cream'] },
      { name: 'Meat & Fish', walkOrder: 1, keywords: ['beef', 'chicken', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'turkey', 'duck', 'fish', 'salmon', 'cod', 'prawn', 'shrimp', 'squid', 'tuna', 'anchovy', 'steak', 'thigh', 'breast', 'drumstick', 'rib'] },
      { name: 'Bakery', walkOrder: 2, keywords: ['bread', 'baguette', 'bread roll', 'bun', 'naan', 'tortilla', 'pitta', 'pita', 'bagel', 'croissant', 'pastry'] },
      { name: 'Pantry & Tins', walkOrder: 3, keywords: ['coconut milk', 'rice', 'noodle', 'pasta', 'spaghetti', 'flour', 'sugar', 'salt', 'stock cube', 'bouillon', 'stock', 'broth', 'tinned', 'canned', 'lentil', 'chickpea', 'oat', 'cereal', 'breadcrumb', 'cornflour', 'cornstarch', 'baking powder', 'baking soda', 'yeast', 'honey'] },
      { name: 'Spices, Sauces & Oils', walkOrder: 4, keywords: ['soy sauce', 'fish sauce', 'oyster sauce', 'sesame oil', 'sesame seed', 'sauce', 'oil', 'vinegar', 'spice', 'cumin', 'paprika', 'chilli powder', 'chili powder', 'star anise', 'cinnamon', 'clove', 'cardamom', 'turmeric', 'peppercorn', 'black pepper', 'white pepper', 'ground pepper', 'doubanjiang', 'bean paste', 'msg', 'curry paste', 'curry powder', 'tamarind', 'miso', 'mustard', 'ketchup', 'mayonnaise', 'vanilla'] },
      { name: 'Dairy & Chilled', walkOrder: 5, keywords: ['milk', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt', 'egg', 'paneer', 'ghee', 'margarine'] },
      { name: 'Drinks', walkOrder: 7, keywords: ['water', 'juice', 'wine', 'beer', 'tea', 'coffee', 'soda', 'cola'] },
      { name: 'Household & Other', walkOrder: 8, keywords: [] },
    ],

    _classifyAisle: function(ingredientName) {
      var self = RPGACE.modules.cookingOracle;
      var name = (ingredientName || '').toLowerCase();
      for (var i = 0; i < self.logic._AISLE_GROUPS.length; i++) {
        var group = self.logic._AISLE_GROUPS[i];
        for (var j = 0; j < group.keywords.length; j++) {
          if (name.indexOf(group.keywords[j]) !== -1) return { name: group.name, order: group.walkOrder };
        }
      }
      var fallback = self.logic._AISLE_GROUPS[self.logic._AISLE_GROUPS.length - 1];
      return { name: fallback.name, order: fallback.walkOrder };
    },

    // H21 (Sep 17 2026, real Alex ask — see records/2026-09/
    // h21_orange_brown_shopnoshop_spec_2026-09-17.txt) — real, curated
    // substitution groups for the Orange tier. AskUserQuestion-confirmed:
    // "1 and 2 I think have their place, do both" — a curated table
    // (authoritative, checked first) AND a broader aisle+name heuristic
    // (checked only as a fallback). Deliberately a small, real, well-
    // known set of genuine home-kitchen swaps (never an invented or
    // guessed pairing) — grouped, not paired, so any 2 members of the
    // same group substitute for each other symmetrically without
    // duplicating each real relationship twice. A starting set, meant to
    // grow the same organic way _AISLE_GROUPS itself has.
    // H24 (Sep 17 2026) — 6 real, evidence-backed additions, every one
    // pulled directly from Alex's own verbatim examples during a real
    // hand-test of his actual live pantry_stock rows (never guessed): "ive
    // got beef with bone, so can replace beef shin"; "ive got chicken
    // stock cubes, so can try use that instead of actual chicken stock";
    // "got cabbage instead of white cabbage"; "garlic clove comes from a
    // garlic bulb, so i have so many"; "fresh coriander is in my stock"
    // (his real row is named "whole coriander" — the same real bunch, a
    // naming difference only); his real stock row for ginger is named
    // "ginger fresh" (reversed word order of "fresh ginger"). None of
    // these claim the 2 forms are numerically interchangeable 1-for-1
    // (a garlic bulb is not literally one clove) — same as every existing
    // group, orange only ever means "a real usable alternative exists,"
    // never a computed quantity swap (unchanged scope, section 4).
    // H24 (Sep 17 2026, 4th pass) — 4 more real, evidence-backed
    // additions/extensions, every one pulled directly from Alex's own
    // verbatim examples during a 2nd real hand-test of his actual live
    // pantry against a real session-preview popup (same discipline as
    // the 1st-pass additions above, never guessed): "i have 2 soy sauces
    // in stock, why are you giving me worchestershire sauce" (his real
    // stock is under "dark soy sauce"/"light soy sauce", a bare "soy
    // sauce" ask had no curated answer and fell through to the generic
    // heuristic below, which matched purely on the shared word "sauce" —
    // see _QUALIFIER_STOPWORDS' new sibling stoplist a few lines down for
    // the general fix, this curated group is the specific, correct
    // answer); "i have tamarind concentrate - why vanilla bean paste as
    // subsitute" (his real stock name differs from the recipe's "tamarind
    // paste" only in product form — concentrate vs paste — a real, close
    // substitute, not the "paste"-token heuristic match that was actually
    // firing); "i have olive oil and butter instead of vegetable oil"
    // (his own explicit, named substitutes — added exactly as stated,
    // butter's own separate group above is untouched, dual membership is
    // already an established precedent, see the reference-track/Mixtura
    // Aug 11 note); "i have whole milk why give me evaporated milk as
    // sub" (his real stock is entered as bare "milk", which he considers
    // the same real thing as "whole milk" for cooking purposes).
    _SUBSTITUTION_GROUPS: [
      { members: ['caster sugar', 'golden caster sugar', 'granulated sugar', 'light brown sugar', 'dark brown sugar', 'soft brown sugar'] },
      { members: ['unsalted butter', 'salted butter', 'margarine'] },
      { members: ['whole milk', 'semi-skimmed milk', 'semi skimmed milk', 'skimmed milk', 'milk'] },
      { members: ['lemon juice', 'lime juice'] },
      { members: ['white wine vinegar', 'cider vinegar', 'apple cider vinegar', 'rice vinegar'] },
      { members: ['vegetable oil', 'sunflower oil', 'canola oil', 'rapeseed oil', 'olive oil', 'unsalted butter', 'salted butter'] },
      { members: ['plain flour', 'all purpose flour', 'all-purpose flour'] },
      { members: ['spring onion', 'scallion', 'shallot'] },
      { members: ['coriander', 'cilantro', 'fresh coriander', 'whole coriander'] },
      { members: ['chicken stock', 'vegetable stock', 'chicken broth', 'vegetable broth', 'chicken stock cubes', 'vegetable stock cube', 'beef stock pot'] },
      { members: ['beef shin', 'beef cuts with bone', 'beef stew meat', 'stewing beef'] },
      { members: ['white cabbage', 'cabbage'] },
      // H24 (Sep 17 2026, 8th pass) — this group (garlic clove/cloves/
      // bulb/bulbs) is REMOVED entirely: real evidence (Alex's own
      // correction) is that a bulb isn't a flat, same-strength swap for
      // a clove, it genuinely CONTAINS a real countable number of cloves
      // — moved to the new, structurally different _COUNT_EQUIVALENTS
      // table below instead (rule 7 — the real relationship, not the
      // nearest existing mechanism). "garlic clove"/"garlic cloves" are
      // already the same real ingredient via the ordinary plural
      // fallback in _resolveIngredient — no group needed for that alone.
      { members: ['ginger', 'fresh ginger', 'ginger fresh'] },
      { members: ['fresh red chilli', 'red chilli', 'large red chilli', 'bullet chilli', "bird's eye chilli"] },
      { members: ['soy sauce', 'dark soy sauce', 'light soy sauce'] },
      { members: ['tamarind paste', 'tamarind concentrate'] },
    ],

    // H24 (Sep 17 2026, 8th pass, real Alex ask: "i need these conversion
    // ratios to always be looked up to make educated subsitutions") — a
    // real, curated table of ORDERED PAIRS where 2 curated-group members
    // genuinely aren't equal-strength 1:1 swaps — a "use this instead"
    // suggestion with no quantity adjustment silently over/under-doses
    // the dish otherwise. `bPerA` = real units of b needed to replace 1
    // real unit of a (rule 7 — never invented; each entry is a real,
    // checkable culinary fact, seeded here only where Alex or a session
    // has actually confirmed one — genuinely NOT exhaustive across every
    // _SUBSTITUTION_GROUPS pair, most of which (sugar variants, soy sauce
    // variants, oil variants) really are close enough to 1:1 in home
    // cooking that inventing a precise ratio for them would violate rule
    // 7 just as much as skipping a real one would).
    _SUBSTITUTION_RATIOS: [
      { a: 'tamarind paste', b: 'tamarind concentrate', bPerA: 1 / 3, note: 'Tamarind concentrate is about 3x stronger than paste — use roughly 1/3 the amount.' },
    ],

    // Directional lookup — `fromName` is what the recipe actually asks
    // for, `toName` is the real candidate being offered in its place.
    // Returns null (never a guessed 1:1) when no real ratio is curated
    // for this exact pair, in either direction.
    _findSubstitutionRatio: function(fromName, toName) {
      var self = RPGACE.modules.cookingOracle;
      var f = String(fromName || '').trim().toLowerCase(), t = String(toName || '').trim().toLowerCase();
      if (!f || !t) return null;
      for (var i = 0; i < self.logic._SUBSTITUTION_RATIOS.length; i++) {
        var r = self.logic._SUBSTITUTION_RATIOS[i];
        if (r.a === f && r.b === t) return { ratio: r.bPerA, note: r.note };
        if (r.b === f && r.a === t) return { ratio: 1 / r.bPerA, note: r.note };
      }
      return null;
    },

    // H24 (Sep 17 2026, 8th pass, real Alex ask: "a bulb consists of
    // cloves - so make 8 cloves a bulb and vice versa") — a real, curated
    // COUNT-EQUIVALENCE table: 2 real ingredients that are genuinely the
    // SAME thing, just packaged/measured at a different countable scale
    // (a bulb literally contains cloves) — NOT an alias (they are not
    // interchangeable labels for one product, "garlic clove" and "garlic
    // bulb" stay 2 real, distinct ingredient rows on purpose) and NOT a
    // flat substitute either (you don't "use a bulb instead of a clove,"
    // the clove genuinely comes FROM the bulb). `perBig` = real countable
    // units of the small side inside 1 unit of the big side — Alex's own
    // stated real number (rule 7 — never a generic "10-20 cloves per
    // bulb" average; his own figure is the one actually used), applied
    // bidirectionally per his own explicit "and vice versa."
    _COUNT_EQUIVALENTS: [
      { small: ['garlic clove', 'garlic cloves'], big: ['garlic bulb', 'garlic bulbs'], perBig: 8 },
    ],

    _findCountEquivalent: function(name) {
      var self = RPGACE.modules.cookingOracle;
      var norm = String(name || '').trim().toLowerCase();
      if (!norm) return null;
      for (var i = 0; i < self.logic._COUNT_EQUIVALENTS.length; i++) {
        var eq = self.logic._COUNT_EQUIVALENTS[i];
        if (eq.small.indexOf(norm) !== -1) return { entry: eq, side: 'small' };
        if (eq.big.indexOf(norm) !== -1) return { entry: eq, side: 'big' };
      }
      return null;
    },

    // Real bridged "have" from the paired ingredient's own real stock —
    // only ever fires for a genuinely countable bucket. Real, honest
    // fix found by direct test (rule 4): _normalizeUnit already keeps
    // "clove" as its OWN canonical bucket, deliberately separate from
    // the generic "unit"/whole/Count bucket (both existed before this
    // pass) — a recipe asking for "clove" and a real Count-logged bulb
    // in stock are 2 genuinely different real buckets, so a single
    // 'unit'-only gate would silently never bridge the exact real
    // example ("12 clove" needed) this feature was built for. Both
    // sides of the bridge are checked against the same real, small,
    // curated COUNTABLE set — never weight/volume — so this stays the
    // same honest "no invented conversion outside a real countable
    // context" discipline as WEIGHT_TO_G/VOLUME_TO_ML. `pantryByName`
    // is the same real, already-loaded snapshot every other real bridge
    // in this file reuses (rule 8) — never a 2nd query.
    _COUNTABLE_UNITS: ['unit', 'clove', 'piece', 'slice'],
    _resolveCountEquivalentHave: function(name, neededUnit, pantryByName) {
      var self = RPGACE.modules.cookingOracle;
      var match = self.logic._findCountEquivalent(name);
      if (!match || self.logic._COUNTABLE_UNITS.indexOf(self.logic._normalizeUnit(neededUnit)) === -1) return 0;
      var partnerNames = (match.side === 'small') ? match.entry.big : match.entry.small;
      var partnerHave = 0;
      partnerNames.forEach(function(pn) {
        var buckets = (pantryByName && pantryByName[pn]) || [];
        buckets.forEach(function(b) {
          if (self.logic._COUNTABLE_UNITS.indexOf(self.logic._normalizeUnit(b.unit)) !== -1 && typeof b.quantity === 'number') partnerHave += b.quantity;
        });
      });
      if (partnerHave <= 0) return 0;
      return (match.side === 'small') ? (partnerHave * match.entry.perBig) : (partnerHave / match.entry.perBig);
    },

    // H24 (Sep 17 2026, 5th pass, real Alex ask — AskUserQuestion-
    // confirmed: derived ingredients deduct their real source ingredient
    // from stock once used) — a real, curated derivation table, same
    // "small, evidence-backed, grows organically" discipline as
    // _SUBSTITUTION_GROUPS above, genuinely different relationship
    // though: this is NOT "X substitutes for Y," it's "Y IS a real
    // byproduct/preparation of X," with a real, checkable yieldRatio
    // (rule 7 — never invented; both real entries below are exact,
    // standard culinary facts, not guessed) and real, concrete
    // instructions Alex can actually follow. `yieldRatio` = real derived
    // units produced per 1 real source unit (both his own real examples
    // are exactly 1:1 — one egg genuinely yields one real white and one
    // real yolk; toasting doesn't meaningfully change desiccated
    // coconut's real countable quantity).
    _DERIVATION_GROUPS: [
      { sourceName: 'egg', derivedName: 'egg white', yieldRatio: 1, instructions: 'Crack the egg and separate the white from the yolk (an egg separator, or passing the yolk between the 2 shell halves, both work).' },
      { sourceName: 'egg', derivedName: 'egg yolk', yieldRatio: 1, instructions: 'Crack the egg and separate the yolk from the white (an egg separator, or passing the yolk between the 2 shell halves, both work).' },
      { sourceName: 'desiccated coconut', derivedName: 'toasted desiccated coconut', yieldRatio: 1, instructions: 'Toast desiccated coconut in a dry pan over medium-low heat, stirring constantly until golden (2-4 min) — or spread on a tray and toast in the oven at 160°C for 5-8 min, checking often as it browns fast.' },
    ],

    _findDerivation: function(name) {
      var self = RPGACE.modules.cookingOracle;
      var norm = String(name || '').trim().toLowerCase();
      if (!norm) return null;
      for (var i = 0; i < self.logic._DERIVATION_GROUPS.length; i++) {
        var d = self.logic._DERIVATION_GROUPS[i];
        if (d.derivedName === norm) return d;
      }
      return null;
    },

    // Real, shared "is there a genuine substitute for this actually in
    // stock right now" finder (rule 8 — one function, both the classifier
    // and every real render site call this same one). Real, deliberate
    // precedence (safest/most certain first, same discipline
    // logic._resolveHaveAmount's own bridge chain already established in
    // H19): the curated group above first (authoritative), falling back
    // to a same-aisle + shared-significant-word heuristic only when no
    // curated pair exists (broader coverage, deliberately looser, real
    // false-positive risk Alex accepted by asking for both). Both checks
    // only ever match a real in-stock name — aisleIndex holds nothing
    // with quantity<=0, H18's own standing contract, never re-derived
    // here.
    // H24 (Sep 17 2026, real Alex bug: "fresh coriander" showed a
    // substitute of "ginger fresh" in stock, when his own real "whole
    // coriander" stock — the actual same ingredient, now also a curated
    // group member above — was sitting right there unmatched). Real root
    // cause, confirmed by tracing the heuristic by hand: "fresh"/"dried"/
    // "whole"/etc are common QUALIFIER words that describe a PREPARATION,
    // not the ingredient's own identity — the old heuristic treated a
    // shared qualifier word exactly like a shared identity word, so
    // "fresh coriander" vs "ginger fresh" (sharing only "fresh") scored
    // identically to "fresh coriander" vs "whole coriander" (sharing the
    // real identity word "coriander"), and whichever candidate the aisle
    // list happened to iterate first won. A real, small, curated stoplist
    // — never a guess, every one of these genuinely describes FORM, not
    // WHAT the ingredient is — excludes qualifier words from counting as
    // a real shared-identity token, so only a genuinely identifying word
    // (like "coriander" or "cabbage") can produce a heuristic match.
    _QUALIFIER_STOPWORDS: ['fresh', 'dried', 'whole', 'ground', 'chopped', 'sliced', 'diced', 'minced', 'large', 'small', 'medium', 'frozen', 'fine', 'coarse', 'crushed', 'grated'],

    // H24 (Sep 17 2026, 4th pass) — real, generalized fix for a bug
    // CLASS the inGroup tightening above (3rd pass) only closes for
    // ingredients that already HAVE a curated group. Real evidence, all
    // from the same session's live hand-test: "spring onion" -> "yellow
    // onion" (shared "onion"), "soy sauce" -> "worcestershire sauce"
    // (shared "sauce"), "whole milk" -> "evaporated milk" (shared
    // "milk"), "tamarind paste" -> "vanilla bean paste" (shared "paste")
    // — every single wrong heuristic match this session found shares the
    // exact same shape: the ONLY token 2 genuinely different ingredients
    // have in common is the generic PRODUCT-CATEGORY word at the end of
    // a compound name, never a real identifying word. `onion`/`sauce`/
    // `milk`/`paste` are the 4 real, observed culprits — same restrained,
    // evidence-seeded-not-exhaustive build discipline
    // _QUALIFIER_STOPWORDS itself already used (a sibling stoplist, a
    // different linguistic category: qualifiers describe FORM, this one
    // is generic CATEGORY nouns too common across an aisle to ever be a
    // safe SOLE match). Filtered out of the SOURCE ingredient's own
    // token list only — a candidate can still legitimately share this
    // word alongside a real identifying one (e.g. "coconut milk" still
    // correctly matches "full-fat coconut milk" via the shared, genuinely
    // identifying "coconut").
    // H24 (Sep 17 2026, 8th pass) — real, 5th observed culprit: "cumin
    // powder" was matching "turmeric powder" purely via the shared
    // generic word "powder" (the real fix for this instance was a
    // duplicate-ingredient merge, cumin powder <- ground cumin, but the
    // heuristic gap itself is real and would recur for any other
    // "X powder"/"Y powder" pair — same discipline as onion/sauce/milk/
    // paste above, added now that a 5th real instance has been observed).
    _GENERIC_HEAD_STOPWORDS: ['onion', 'sauce', 'milk', 'paste', 'powder'],

    // H24 (Sep 17 2026, 6th pass) — real, optional trailing `ingredientId`/
    // `ratings` params (both default to null/undefined — every existing
    // caller that omits them behaves byte-identical to before, since
    // with no real ratings loaded every candidate scores 0 and the
    // original array order wins, same as the old first-match-wins logic).
    // When 2+ real candidates are simultaneously available (a genuine,
    // not-hypothetical case — e.g. both "dark soy sauce" and "light soy
    // sauce" in stock at once), this used to always pick whichever one
    // happened to come first in the curated members array or the aisle
    // scan order — arbitrary, not a real preference. Real Alex ask: rate
    // a substitution so future picks prefer what actually worked well.
    _pickBestRated: function(ingredientId, candidates, ratings) {
      if (!candidates.length) return null;
      if (!ratings || !ingredientId) return candidates[0];
      var best = candidates[0], bestScore = ratings[ingredientId + '::' + candidates[0]] || 0;
      for (var i = 1; i < candidates.length; i++) {
        var score = ratings[ingredientId + '::' + candidates[i]] || 0;
        if (score > bestScore) { best = candidates[i]; bestScore = score; }
      }
      return best;
    },

    _findSubstitute: function(name, aisleIndex, ingredientId, ratings) {
      var self = RPGACE.modules.cookingOracle;
      var norm = String(name || '').trim().toLowerCase();
      if (!norm || !aisleIndex) return null;

      var inStock = {};
      Object.keys(aisleIndex).forEach(function(aisle) {
        (aisleIndex[aisle] || []).forEach(function(n) { inStock[n] = true; });
      });

      // H24 (Sep 17 2026, 3rd pass) — real bug, found from Alex's own
      // pasted popup: shallot's own curated group correctly offered
      // spring onion, but spring onion's own status (broken at the time
      // by the 2 real bugs above) fell through to the LOOSER heuristic
      // below and offered yellow onion — a bare shared "onion" token
      // match, even though spring onion has its own curated group
      // (spring onion/scallion/shallot) that deliberately does NOT
      // include yellow onion. A curated group is a deliberate, real,
      // hand-picked list of what actually substitutes for a given
      // ingredient (rule 7 — never invented) — once one exists for this
      // ingredient, it's the authoritative answer, even when no real
      // member happens to be in stock right now. Falling through to the
      // looser aisle+shared-word heuristic in that case can produce an
      // incoherent chain (A recommends B, but B — genuinely in stock —
      // itself recommends C, a name A's own curator never listed as
      // equivalent). `inGroup` tracks this without a 2nd loop over the
      // same table.
      var inGroup = false;
      var curatedCandidates = [];
      for (var g = 0; g < self.logic._SUBSTITUTION_GROUPS.length; g++) {
        var members = self.logic._SUBSTITUTION_GROUPS[g].members;
        if (members.indexOf(norm) === -1) continue;
        inGroup = true;
        for (var m = 0; m < members.length; m++) {
          if (members[m] !== norm && inStock[members[m]]) curatedCandidates.push(members[m]);
        }
      }
      if (curatedCandidates.length) {
        var pickedName = self.logic._pickBestRated(ingredientId, curatedCandidates, ratings);
        // H24 (8th pass) — real, curated potency ratio if one exists for
        // this exact pair (rule 8 — resolved once here, every real
        // consumer of _findSubstitute gets it for free instead of a 2nd
        // lookup); null when no real ratio is curated, same honest
        // "no invented conversion" discipline as the rest of this table.
        var ratioInfo = self.logic._findSubstitutionRatio(norm, pickedName);
        return { name: pickedName, method: 'curated', ratio: ratioInfo ? ratioInfo.ratio : null, ratioNote: ratioInfo ? ratioInfo.note : null };
      }
      if (inGroup) return null;

      var aisle = self.logic._classifyAisle(name).name;
      var namesInAisle = aisleIndex[aisle] || [];
      var stop = self.logic._QUALIFIER_STOPWORDS;
      var headStop = self.logic._GENERIC_HEAD_STOPWORDS;
      // H24 (Sep 17 2026, 4th pass) — headStop applied to the SOURCE
      // ingredient's own tokens only (see the stoplist's own comment) —
      // candTokens deliberately keeps every word, so a real, genuinely
      // identifying shared word elsewhere in the name still matches.
      var tokens = norm.split(/\s+/).filter(function(w) { return w.length >= 4 && stop.indexOf(w) === -1 && headStop.indexOf(w) === -1; });
      if (!tokens.length) return null;
      var heuristicCandidates = [];
      for (var i = 0; i < namesInAisle.length; i++) {
        var cand = namesInAisle[i];
        if (cand === norm) continue;
        var candTokens = cand.split(/\s+/).filter(function(w) { return stop.indexOf(w) === -1; });
        if (tokens.some(function(t) { return candTokens.indexOf(t) !== -1; })) heuristicCandidates.push(cand);
      }
      if (heuristicCandidates.length) return { name: self.logic._pickBestRated(ingredientId, heuristicCandidates, ratings), method: 'heuristic' };
      return null;
    },

    // H14 (Sep 16 2026) — real bug found and fixed while extracting this:
    // the old _loadPantry (removed) grouped rows by ingredient_id ALONE and
    // kept whichever row happened to arrive LAST for a given ingredient —
    // silently correct only by accident before H11 added pantry_stock's
    // real location column (pantry/fridge/freezer, one row per location
    // now normal). Since H11 shipped, this silently understated (or picked
    // an arbitrary one of) a real "have" amount for anything stocked in
    // more than one location. Fixed to genuinely SUM across locations, the
    // same real discipline _loadPantryNamed already proved correct for a
    // different caller — never force-summed across mismatched UNITS though
    // (section 4's own honest scope, unchanged): "2 cloves garlic" in the
    // pantry and "50g garlic" in the fridge stay 2 separate tracked lines,
    // no invented conversion.
    //
    // H18 (Sep 16 2026, real Alex correction on the schedule-cook colours:
    // "ingredients that are not equal to measurements in recipes show as
    // not in stock - i need this to be sensitive to colour to make it make
    // sense") — real root cause: every have-vs-needed match keys strictly
    // on (ingredient_id, exact unit STRING). A real stock row logged as
    // "clove" for a recipe asking "cloves" (or "g"/"gram"/"grams", "tbsp"/
    // "tablespoon") silently failed to match at all — have came back 0,
    // showing red/"don't have" for something genuinely in stock. Fixed
    // with ONE shared normalizer (rule 8), used everywhere a (id, unit)
    // key is built for this 5-color system, so a real unit SYNONYM (never
    // a cross-system numeric conversion — g does not become oz here, no
    // invented math) is recognized as the same real unit. A curated table
    // covers the common real cases; a generic trailing-"s" strip (skipped
    // for anything 3 chars or shorter, so "oz" never becomes "o") catches
    // the rest without needing every plural hand-listed.
    _normalizeUnit: function(u) {
      var s = String(u || '').trim().toLowerCase();
      if (!s) return '';
      var SYNONYMS = {
        gram: 'g', grams: 'g', gramme: 'g', grammes: 'g', g: 'g',
        kilogram: 'kg', kilograms: 'kg', kg: 'kg',
        millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml', ml: 'ml',
        litre: 'l', litres: 'l', liter: 'l', liters: 'l', l: 'l',
        tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbsps: 'tbsp',
        teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp', tsps: 'tsp',
        clove: 'clove', cloves: 'clove',
        piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
        can: 'can', cans: 'can', tin: 'can', tins: 'can',
        cup: 'cup', cups: 'cup',
        pinch: 'pinch', pinches: 'pinch',
        slice: 'slice', slices: 'slice',
        unit: 'unit', units: 'unit',
        // H24 (Sep 17 2026, 2nd pass) — real bug found from Alex's own
        // pasted popup: "lime — need 2 whole — have a substitute in
        // stock: lime leaves" even after the real lime/limes duplicate
        // ingredient row was merged the same session, because the
        // RECIPE'S OWN unit ("whole") and Current Stock's own unit
        // ("Count", the real dropdown option a shopper picks for a
        // whole/countable item) are two different real strings for the
        // same real count-based unit — the exact same class of gap H18
        // already fixed for "gram"/"g". Both now map to the same
        // canonical bucket 'unit'/'units' already uses.
        whole: 'unit', wholes: 'unit',
        count: 'unit', counts: 'unit',
        // H24 (Sep 17 2026, 3rd pass) — real bug, found from Alex's own
        // pasted popup: "spring onion — need 5 stalk — have a substitute
        // in stock: yellow onion" despite his real stock showing 6
        // spring onion (Count) — same exact bug class as whole/count
        // above, one recipe unit ("stalk") with no synonym mapping to
        // the canonical countable-unit bucket real stock is logged in.
        stalk: 'unit', stalks: 'unit',
        // H24 (Sep 17 2026, 7th pass) — real bug, found from Alex's own
        // live report: "egg... still blue not green" despite 11 real
        // Count in stock. Root cause: the recipe's own unit was "large"
        // (Oracle wrote the size descriptor into the unit slot, e.g. "3
        // large" meaning "3 large eggs") with no synonym mapping to the
        // same canonical countable-unit bucket whole/count/stalk already
        // use — the real quantity meant is a plain count regardless of
        // size, same as an onion/chilli's own size descriptor never
        // changing how many are needed. Sibling size words added
        // together, same real culinary convention, not invented new.
        large: 'unit', medium: 'unit', small: 'unit',
        'extra-large': 'unit', xl: 'unit',
      };
      if (SYNONYMS[s]) return SYNONYMS[s];
      if (s.length > 3 && s.charAt(s.length - 1) === 's') return s.slice(0, -1);
      return s;
    },

    // H19 (Sep 17 2026, real Alex ask: "also use cups as much as possible
    // (liquid and spices) and weight when makes sense, everywhere where a
    // recipe is present. in pantry ill be using mostly weight and ml and
    // count rather than cups" — restated a 2nd time, same session,
    // "in pantry and stock as a whole") — real, shared unit-bridging so
    // the 5-color system still works once recipes lean on cups while
    // stock stays logged in weight/ml/count. Two REAL, NEVER-INVENTED
    // bridges, ranked safest-first:
    //   1. VOLUME_TO_ML — a cup/tbsp/tsp/l/ml conversion is exact real
    //      physics, true regardless of what's actually in the cup. Never
    //      a density guess.
    //   2. a weight bridge using the RECIPE'S OWN already-generated
    //      grams_estimate (existing data, built for nutrition - reused
    //      here, rule 8 - never a new invented per-ingredient density
    //      table) when the recipe's unit isn't a weight unit but a real
    //      stock bucket is one (g/kg).
    // Genuinely NOT bridged, on purpose: "count" against weight/volume
    // (a real onion's weight varies - no honest conversion exists) —
    // stays an honest non-match (rule 7), same as before this ask.
    VOLUME_TO_ML: { ml: 1, l: 1000, cup: 240, tbsp: 15, tsp: 5 },
    WEIGHT_TO_G: { g: 1, kg: 1000 },

    _convertVolumeUnits: function(amount, fromUnit, toUnit) {
      var self = RPGACE.modules.cookingOracle;
      var f = self.logic.VOLUME_TO_ML[fromUnit], t = self.logic.VOLUME_TO_ML[toUnit];
      if (!f || !t) return null;
      return amount * f / t;
    },

    // H24 (Sep 17 2026, real Alex ask: "ive got ml in stock, so convert to
    // cups and tbsp (1/16th of cup) so i can cook easier") — a real,
    // shared measurement FORMATTER (rule 8 — one function, every real
    // display site), distinct from _resolveHaveAmount's own bridging
    // (which only ever answers "how much do I have," never changes what
    // a recipe SHOWS). Only ever converts a real ml/l amount — ml/tbsp/
    // tsp/cup/l are the same exact real physics VOLUME_TO_ML already uses
    // for matching, never a new invented ratio. Deliberately expresses
    // whole cups + whole tbsp + a real quarter-tsp-rounded remainder
    // (never a fraction of a tbsp — his own "1/16th of a cup" note is
    // exactly 1 tbsp, the real smallest unit this rounds to before
    // dropping to tsp) — any non-volume unit (g/kg/clove/count/etc) is
    // returned completely unchanged, since only volume has an honest,
    // exact conversion (rule 7, same discipline VOLUME_TO_ML's own
    // comment already states).
    // CM-5 (Oct 15 2026, "star anise 0 whole" on a removal step): a step
    // ingredient's amount text for Cook Mode and the recipe card. 0 means
    // the step takes it out (remove the star anise), so say that instead.
    _stepAmountText: function(u) {
      if (!u || u.amount == null || u.amount === '') return '';
      if (u.amount === 0 || u.amount === '0') return 'take out';
      return RPGACE.modules.cookingOracle.logic._fmtMeasurement(u.amount, u.unit, { name: u.name });
    },

    // Oct 21 2026 (Alex: "I need equipment to be taken into account (eg. I
    // have cup measurers, so give it in those, 2 tablespoons is half of 1/4
    // cup, I can weight things etc)"; answer "Grams for solids"). Amounts
    // come out in what's in kitchen_equipment: solids with a known weight in
    // grams for the scales, volumes in the cup measures he owns, and less
    // than the smallest cup as a share of it ("½ of the ¼ cup" = 2 tbsp).
    // No measuring spoons in the kit = no "tbsp" in the answer; a few ml
    // left over is a cutlery teaspoon. The recipe's own amount stays in
    // brackets so nothing is hidden.
    _kit: null,
    _kitLoading: false,
    _gramsPer: {},
    _loadKit: function(force) {
      var self = RPGACE.modules.cookingOracle, L = self.logic;
      if ((L._kitLoaded && !force) || L._kitLoading || !RPGACE.sb || !RPGACE.sb.select) return;
      L._kitLoading = true;
      L._loadEquipment(function(rows, err) {
        L._kitLoading = false;
        if (err) return;
        L._kitLoaded = true;
        L._kit = L._parseKit(rows);
      });
    },
    _parseKit: function(rows) {
      if (!rows || !rows.length) return null; // nothing listed: keep the standard cups + spoons
      var kit = { cups: [], jug: 0, spoons: false, scales: false };
      (rows || []).forEach(function(r) {
        var n = String(r.name || '').toLowerCase();
        if (/scale/.test(n)) kit.scales = true;
        if (/tablespoon|teaspoon|\btbsp\b|\btsp\b|measuring spoon/.test(n)) kit.spoons = true;
        var m = n.match(/(\d+)\s*\/\s*(\d+)\s*cup/);
        if (m) { kit.cups.push(240 * Number(m[1]) / Number(m[2])); return; }
        m = n.match(/(\d+(?:\.\d+)?)\s*cup/);
        if (m) { var v = 240 * Number(m[1]); if (/jug|glass/.test(n) || v > 240) kit.jug = Math.max(kit.jug, v); else kit.cups.push(v); }
      });
      kit.cups = kit.cups.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort(function(a, b) { return b - a; });
      return kit;
    },
    // Remember grams per unit for each ingredient of a recipe (from
    // recipe_ingredients.grams_estimate), so a Cook Mode step - whose
    // ingredients carry no weight - can still be given in grams.
    _noteGrams: function(ingredients) {
      var L = RPGACE.modules.cookingOracle.logic;
      (ingredients || []).forEach(function(i) {
        if (!i || !i.name || typeof i.grams_estimate !== 'number' || !(i.grams_estimate > 0) || typeof i.amount !== 'number' || !(i.amount > 0)) return;
        L._gramsPer[String(i.name).toLowerCase()] = { unit: L._normalizeUnit(i.unit || ''), per: i.grams_estimate / i.amount };
      });
    },
    _gramsFor: function(name, amount, unit) {
      var L = RPGACE.modules.cookingOracle.logic, g = L._gramsPer[String(name || '').toLowerCase()];
      if (!g || typeof amount !== 'number') return null;
      var u = L._normalizeUnit(unit || '');
      if (u === g.unit) return amount * g.per;
      if (L.VOLUME_TO_ML[u] && L.VOLUME_TO_ML[g.unit]) { var conv = L._convertVolumeUnits(amount, u, g.unit); return conv == null ? null : conv * g.per; }
      return null;
    },
    LIQUID_WORDS: ['water', 'milk', 'stock', 'broth', 'oil', 'vinegar', 'sauce', 'juice', 'cream', 'wine', 'beer', 'syrup', 'extract', 'liquid', 'rum', 'brandy', 'shaoxing', 'mirin', 'sake', 'soy'],
    _isLiquid: function(name) {
      var n = String(name || '').toLowerCase();
      return RPGACE.modules.cookingOracle.logic.LIQUID_WORDS.some(function(w) { return n.indexOf(w) !== -1; });
    },
    // ml -> the cup measures owned. Returns e.g. "1 cup + ½ cup",
    // "½ of the ¼ cup", "1 tsp"; null when it's too small to bother.
    _kitVolume: function(ml, kit) {
      var CUP = 240, FR = { 240: '1 cup', 120: '½ cup', 80: '⅓ cup', 60: '¼ cup', 160: '⅔ cup', 180: '¾ cup' };
      var cups = (kit.cups.length ? kit.cups : [240, 120, 80, 60]).slice();
      var whole = cups.indexOf(CUP) !== -1 ? CUP : cups[0];
      var parts = [];
      var nWhole = Math.floor((ml + 2) / whole);
      if (nWhole > 0 && whole === CUP) parts.push(nWhole === 1 ? '1 cup' : nWhole + ' cups');
      else if (nWhole > 0) parts.push(nWhole + ' × ' + (FR[whole] || Math.round(whole) + ' ml'));
      var r = ml - nWhole * whole;
      // Best fill of the remainder: the smaller cups (each up to 3 times),
      // then a share of the smallest cup - whichever lands closest, then
      // fewest measures.
      var small = cups.filter(function(v) { return v < whole; });
      var smallest = cups[cups.length - 1], qv = smallest / 4;
      var best = null;
      var consider = function(sum, pieces) {
        var left = r - sum, q = 0;
        if (!kit.spoons && left >= qv / 2) q = Math.min(3, Math.round(left / qv));
        var err = Math.abs(left - q * qv), n = pieces.length + (q ? 1 : 0);
        if (left < -2) return;
        if (!best || err < best.err - 0.5 || (Math.abs(err - best.err) <= 0.5 && n < best.n)) best = { err: err, n: n, pieces: pieces.slice(), q: q, left: left - q * qv };
      };
      var walk = function(i, sum, pieces) {
        if (sum > r + 2) return;
        consider(sum, pieces);
        if (i >= small.length || pieces.length >= 4) return;
        for (var k = 1; k <= 3; k++) {
          var add = pieces.slice(); for (var j = 0; j < k; j++) add.push(small[i]);
          walk(i + 1, sum + k * small[i], add);
        }
        walk(i + 1, sum, pieces);
      };
      walk(0, 0, []);
      best.pieces.forEach(function(v) { parts.push(FR[v] || Math.round(v) + ' ml'); });
      if (best.q) parts.push({ 1: '¼', 2: '½', 3: '¾' }[best.q] + ' of the ' + (FR[smallest] || Math.round(smallest) + ' ml'));
      var left = Math.max(0, best.left);
      if (kit.spoons && left >= 15) { var tb = Math.floor(left / 15); parts.push(tb + ' tbsp'); left -= tb * 15; }
      var tsp = Math.round((left / 5) * 4) / 4;
      if (tsp >= 0.25) parts.push(tsp + ' tsp');
      return parts.length ? parts.join(' + ') : null;
    },

    _fmtMeasurement: function(amount, unit, o) {
      var self = RPGACE.modules.cookingOracle, L = self.logic;
      o = o || {};
      var raw = ((amount != null ? amount : '') + ' ' + (unit || '')).trim();
      if (typeof amount !== 'number' || !unit) return raw;
      var normUnit = L._normalizeUnit(unit);
      if (!L._kitLoaded) L._loadKit();
      var kit = L._kit || { cups: [240, 120, 80, 60], jug: 0, spoons: true, scales: true };
      var isVol = !!L.VOLUME_TO_ML[normUnit];
      // Grams first for solids when a weight is known and there are scales.
      var grams = (typeof o.grams === 'number' && o.grams > 0) ? o.grams : (o.name ? L._gramsFor(o.name, amount, unit) : null);
      if (isVol && grams && kit.scales && o.name && !L._isLiquid(o.name)) {
        var g = grams >= 100 ? Math.round(grams / 5) * 5 : grams >= 10 ? Math.round(grams) : Math.round(grams * 10) / 10;
        return g + ' g (' + raw + ')';
      }
      if (!isVol) return raw;
      var ml = L._convertVolumeUnits(amount, normUnit, 'ml');
      if (ml == null || ml <= 0) return raw;
      var txt = L._kitVolume(ml, kit);
      if (!txt) return raw;
      if (txt === raw) return raw;
      var orig = (normUnit === 'ml') ? (Math.round(ml * 10) / 10) + ' ml' : raw;
      return txt + ' (' + orig + ')';
    },

    // Real, shared "how much do I actually have of this, expressed in the
    // recipe's own unit" resolver (rule 8) — every real 5-color consumer
    // (schedule preview/shopping list via _computeIngredientUsage, the
    // stock-match finder via _findMakeableRecipes, and the recipe card's
    // own name-keyed path) now goes through this ONE function instead of
    // each hand-rolling its own exact-unit lookup. `buckets` is the real
    // stock this ingredient has, one entry per distinct real unit
    // actually logged — `neededAmount`/`gramsEstimate` must be the
    // recipe's own BASE (unscaled) figures, since the gram-per-unit ratio
    // they imply is scale-independent even when a caller (the recipe
    // card's serving scaler) later compares this "have" against a scaled
    // "needed."
    _resolveHaveAmount: function(opts) {
      var self = RPGACE.modules.cookingOracle;
      opts = opts || {};
      var neededUnit = self.logic._normalizeUnit(opts.neededUnit);
      var buckets = opts.buckets || [];

      var exact = buckets.filter(function(b) { return self.logic._normalizeUnit(b.unit) === neededUnit; })[0];
      if (exact) return (typeof exact.quantity === 'number') ? exact.quantity : 0;

      if (self.logic.VOLUME_TO_ML[neededUnit]) {
        var volBucket = buckets.filter(function(b) { return self.logic.VOLUME_TO_ML[self.logic._normalizeUnit(b.unit)]; })[0];
        if (volBucket) {
          var converted = self.logic._convertVolumeUnits(volBucket.quantity, self.logic._normalizeUnit(volBucket.unit), neededUnit);
          if (converted != null) return converted;
        }
      }

      // H24 (Sep 17 2026, 7th pass) — real, structural gap found: WEIGHT_TO_G
      // existed but was ONLY ever consulted as a negative guard on the
      // gramsEstimate branch below, never as its own exact g<->kg bridge —
      // the same real, always-true SI conversion VOLUME_TO_ML's own branch
      // above already proves out for volume, just missing here. Real bug
      // this caused: "300g needed, 1.2kg in stock" resolved have=0. Mirrors
      // the volume branch exactly, never a density guess (rule 7).
      if (self.logic.WEIGHT_TO_G[neededUnit]) {
        var wtBucket = buckets.filter(function(b) { return self.logic.WEIGHT_TO_G[self.logic._normalizeUnit(b.unit)]; })[0];
        if (wtBucket) {
          var wtG = wtBucket.quantity * self.logic.WEIGHT_TO_G[self.logic._normalizeUnit(wtBucket.unit)];
          return wtG / self.logic.WEIGHT_TO_G[neededUnit];
        }
      }

      if (!self.logic.WEIGHT_TO_G[neededUnit] && typeof opts.gramsEstimate === 'number' && opts.neededAmount > 0) {
        var weightBucket = buckets.filter(function(b) { return self.logic.WEIGHT_TO_G[self.logic._normalizeUnit(b.unit)]; })[0];
        if (weightBucket) {
          var haveGrams = weightBucket.quantity * self.logic.WEIGHT_TO_G[self.logic._normalizeUnit(weightBucket.unit)];
          var gramsPerNeededUnit = opts.gramsEstimate / opts.neededAmount;
          if (gramsPerNeededUnit > 0) return haveGrams / gramsPerNeededUnit;
        }
      }

      return 0;
    },

    // H18 (Sep 16 2026) — real, superseding extension, not a second loader
    // (rule 8): now joins ingredients(name) and returns one full pantry
    // SNAPSHOT ({byIngredient, byName, aisleIndex}) instead of a bare
    // byKey map, so the shared 5-color classifier has everything it needs
    // from ONE real query, reused by every real consumer. byName groups
    // by normalized (trim+lowercase) name, same case-insensitive
    // precedent logic._save's own ingredient resolution already uses —
    // never fuzzy. aisleIndex only ever includes an ingredient actually
    // in stock (quantity > 0) — a real zero-stock pantry_stock row
    // (already bought, fully used) must never count as a real "blue
    // alternative available."
    //
    // H19 (Sep 17 2026) — real, superseding shape change: `byKey` (a flat
    // ingredient_id|unit -> one bucket map) replaced with `byIngredient`
    // (ingredient_id -> ARRAY of every real unit-bucket that ingredient
    // has). A flat exact-key map can only ever answer "do I have EXACTLY
    // this unit" — logic._resolveHaveAmount's real cup<->ml/g bridging
    // (Alex's own ask: recipes lean on cups, stock stays weight/ml/count)
    // needs to see every real unit an ingredient is stocked in to have
    // anything to bridge FROM. Both real callers (_computeIngredientUsage,
    // _findMakeableRecipes) updated to match — confirmed via grep, no
    // other real call site exists.
    _loadPantrySummed: function(cb) {
      RPGACE.sb.select('pantry_stock', 'select=ingredient_id,quantity,unit,ingredients(name)')
        .then(function(rows) {
          var self = RPGACE.modules.cookingOracle;
          var byIngredient = {};
          var byName = {};
          var aisleIndex = {};
          (rows || []).forEach(function(r) {
            var qty = (typeof r.quantity === 'number') ? r.quantity : 0;
            var name = (r.ingredients && r.ingredients.name) || '';
            var normUnit = self.logic._normalizeUnit(r.unit);

            if (!byIngredient[r.ingredient_id]) byIngredient[r.ingredient_id] = [];
            var idBucket = null;
            for (var b = 0; b < byIngredient[r.ingredient_id].length; b++) {
              if (byIngredient[r.ingredient_id][b].unit === normUnit) { idBucket = byIngredient[r.ingredient_id][b]; break; }
            }
            if (!idBucket) { idBucket = { unit: normUnit, quantity: 0, name: name }; byIngredient[r.ingredient_id].push(idBucket); }
            idBucket.quantity += qty;

            if (name) {
              var norm = name.trim().toLowerCase();
              if (!byName[norm]) byName[norm] = [];
              var slot = null;
              for (var i = 0; i < byName[norm].length; i++) { if (self.logic._normalizeUnit(byName[norm][i].unit) === normUnit) { slot = byName[norm][i]; break; } }
              if (!slot) { slot = { unit: r.unit || null, quantity: 0 }; byName[norm].push(slot); }
              slot.quantity += qty;

              if (qty > 0) {
                var aisle = self.logic._classifyAisle(name).name;
                if (!aisleIndex[aisle]) aisleIndex[aisle] = [];
                if (aisleIndex[aisle].indexOf(norm) === -1) aisleIndex[aisle].push(norm);
              }
            }
          });
          cb({ byIngredient: byIngredient, byName: byName, aisleIndex: aisleIndex });
        })
        .catch(function() { cb({ byIngredient: {}, byName: {}, aisleIndex: {} }); });
    },

    // H18 (Sep 16 2026) — the ONE shared ingredient-status classifier
    // (rule 8), real Alex ask: "green ingredients are what i have, yellow
    // are not what enough of, red is what i dont have, blue is what i have
    // as an alternative, but should buy in shop... purple is what will
    // almost run out and should be replenished next shop after planned
    // cooking session." Real /interrogation answers locked before building
    // (records/2026-09/h18_ingredient_color_system_spec_2026-09-16.txt):
    // blue = a same-aisle-group alternative present in pantry (H13's own
    // _classifyAisle/_AISLE_GROUPS, reused not reinvented); purple
    // threshold = a have-minus-needed margin below 20% of what's needed.
    // Applied EVERYWHERE ingredients are shown — this REPLACES H14b's
    // earlier 2-color green/gold scheme, not a parallel 3rd system.
    //
    // Pure function, no I/O — every real caller pre-loads a pantry
    // snapshot (_loadPantrySummed above) once and passes its aisleIndex in,
    // rather than this function re-querying Supabase per ingredient.
    // H21 (Sep 17 2026) — real, superseding extension (rule 8, same one
    // function, opts-based so every existing caller that doesn't pass
    // isSeparable/noShopMode is completely unaffected). Real precedence
    // when missing, checked in order: brown (only when a real per-session
    // No-Shop mode is active AND this ingredient is a genuine separable
    // component — Alex's own words: "just omit if I'm not going shop"),
    // then orange (a real substitute is actually in stock), then the
    // existing blue/red ladder, unchanged.
    // H24 (Sep 17 2026, 2nd pass, real Alex ask: "when orange
    // substitution or blue is presented, give me an option to confirm so
    // it can turn green") — the real, persisted write path for that
    // confirm click (rule 8 — one shared function, every real render
    // site that adds the confirm button calls this same one). Keyed on
    // (ingredient_id, substitute_name) rather than a global boolean, so
    // confirming "beef cuts with bone for beef shin" never silently
    // also confirms an unrelated pairing that happens to also classify
    // orange. Scope explicitly NOT extended to blue this pass — blue has
    // no single named candidate to confirm against (see the record for
    // the real reason), only ever a same-aisle "something exists" flag.
    // H24 (Sep 17 2026, 3rd pass) — real, superseding correction, same
    // session, direct Alex ask: "maybe not turn subs into green, but
    // rather a tick on the left to show ingredient or alternative is
    // agreed upon, but keeping colours as is to highlight whats subbed,
    // how subbed, whats true green, so future sessions now what subs can
    // be used, and what in the recipe is authentic." Flipping to green
    // erased the real distinction he actually wanted preserved — a
    // confirmed substitution and a genuinely-in-stock ingredient are NOT
    // the same fact, and collapsing them to the same color threw that
    // away. The write path/table below is unchanged (this was always a
    // real, persisted, cross-session record) — only what the classifier
    // and the UI DO with a confirmed pairing changes, see
    // logic._classifyIngredientStatus below.
    _confirmSubstitution: function(ingredientId, subName, cb) {
      var norm = String(subName || '').trim().toLowerCase();
      if (!ingredientId || !norm) { cb('missing ingredient or substitute name'); return; }
      RPGACE.sb.secureWrite('ingredient_substitution_confirmations', 'insert', {
        ingredient_id: ingredientId,
        substitute_name: norm,
      })
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'could not save confirmation'); });
    },

    // Real, shared loader for every real (ingredient_id, substitute_name)
    // pair Alex has already confirmed — returns a plain map,
    // `ingredientId::substituteName` -> true, so _classifyIngredientStatus
    // can do a real O(1) lookup rather than re-querying per ingredient.
    _loadConfirmedSubs: function(cb) {
      RPGACE.sb.select('ingredient_substitution_confirmations', 'select=ingredient_id,substitute_name')
        .then(function(rows) {
          var map = {};
          (rows || []).forEach(function(r) { map[r.ingredient_id + '::' + r.substitute_name] = true; });
          cb(map);
        })
        .catch(function() { cb({}); });
    },

    // H24 (Sep 17 2026, 7th pass, real Alex ask: "orange should have an
    // option where i declare we talk about same item just 2 derivations
    // of names" — AskUserQuestion-confirmed: the recipe's own wording
    // always wins and any future differently-worded stock entry should
    // "go through no matter how i word it," a real substitute/aisle-
    // alternative candidate can trigger it from BOTH orange and blue rows,
    // 2-click arm/confirm friction) — a real, PERMANENT merge, the same
    // evidence-shaped operation this session's own manual duplicate-
    // ingredient merges (lime/limes, egg/eggs, coconut milk/full-fat
    // coconut milk, etc) have been doing by hand all session, now a real
    // in-app action instead of needing a future Claude Code SQL pass every
    // time a new wording recurs. `canonicalIngredientId` is always the
    // RECIPE's own real ingredient_id (never the substitute's) — the
    // ANOTHER real half of "no matter how i word it": every reference the
    // substitute's own row carried (real stock, other recipes, price
    // history, shopping-list rows) is reassigned onto the SAME canonical
    // id, then the substitute's now-orphaned ingredients row is deleted.
    // The real, standing gap this closes going FORWARD (not just this one
    // instance): a real ingredient_aliases row is written too, so a
    // FUTURE stock-add typed under the exact same alternate wording
    // resolves straight to the same canonical ingredient instead of
    // minting yet another duplicate row needing yet another declare —
    // see logic._resolveIngredient/_resolveIngredientFull's own real
    // alias-check, checked before ever creating a new row.
    _declareSameItem: function(canonicalIngredientId, altName, cb) {
      var norm = String(altName || '').trim().toLowerCase();
      if (!canonicalIngredientId || !norm) { cb('missing ingredient or alternate name'); return; }
      RPGACE.sb.select('ingredients', 'name=eq.' + encodeURIComponent(norm) + '&select=id&limit=1')
        .then(function(rows) {
          var altId = rows && rows[0] && rows[0].id;
          if (!altId) { cb('could not find "' + altName + '" as a real ingredient'); return; }
          if (altId === canonicalIngredientId) { cb(null); return; } // already the same real row
          var reassign = function(table) {
            return RPGACE.sb.secureWrite(table, 'update', { ingredient_id: canonicalIngredientId }, 'ingredient_id=eq.' + altId);
          };
          Promise.all([reassign('pantry_stock'), reassign('recipe_ingredients'), reassign('ingredient_prices'), reassign('shopping_list_items')])
            .then(function() { return RPGACE.sb.secureWrite('ingredients', 'delete', null, 'id=eq.' + altId); })
            .then(function() {
              return RPGACE.sb.secureWrite('ingredient_aliases', 'insert', { alias_name: norm, canonical_ingredient_id: canonicalIngredientId }, null, 'alias_name');
            })
            .then(function() { cb(null); })
            .catch(function(e) { cb(e.message || 'merge failed'); });
        })
        .catch(function(e) { cb(e.message || 'ingredient lookup failed'); });
    },

    // H24 (Sep 17 2026, 6th pass, real Alex ask: "id also like a system
    // where at the end of a cook a rate the subsitutions so the system
    // prunes to different alternatives to make better decisions with
    // me" — AskUserQuestion-confirmed: no forced prompt, rated whenever
    // from the recipe card, and ratings DO auto-prefer highly-rated subs
    // / deprioritize poorly-rated ones) — a real, append-only historical
    // log (rule 7 — never overwritten, same discipline as
    // ingredient_prices), never a single mutable "current rating" row,
    // so a changed mind later just adds a real new data point rather
    // than erasing the old one.
    _rateSubstitution: function(ingredientId, subName, rating, cb) {
      var norm = String(subName || '').trim().toLowerCase();
      if (!ingredientId || !norm || (rating !== 1 && rating !== -1)) { cb('missing or invalid rating'); return; }
      RPGACE.sb.secureWrite('substitution_ratings', 'insert', {
        ingredient_id: ingredientId,
        substitute_name: norm,
        rating: rating,
      })
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'could not save rating'); });
    },

    // Real, shared aggregate: net score (sum of +1/-1) per real
    // (ingredient_id, substitute_name) pair, client-side (same
    // established precedent as _loadPantrySummed's own aggregation —
    // this table stays small enough that a server-side aggregate view
    // isn't warranted yet). Used by logic._findSubstitute to rank
    // multiple real, simultaneously-available candidates — never to
    // invent a candidate that isn't genuinely in stock.
    _loadSubstitutionRatings: function(cb) {
      RPGACE.sb.select('substitution_ratings', 'select=ingredient_id,substitute_name,rating')
        .then(function(rows) {
          var map = {};
          (rows || []).forEach(function(r) {
            var key = r.ingredient_id + '::' + r.substitute_name;
            map[key] = (map[key] || 0) + (typeof r.rating === 'number' ? r.rating : 0);
          });
          cb(map);
        })
        .catch(function() { cb({}); });
    },

    // H24 (Sep 17 2026, 5th pass) — the real, committed "derive & use"
    // action for a maroon row: a genuine stock deduction, not a
    // preference (unlike a confirmed substitution). Real, evidence-
    // checked math only (rule 7): sourceNeeded = derivedAmount /
    // yieldRatio, deducted across whatever real pantry_stock row(s)
    // actually exist for the source ingredient, oldest/first-found
    // first, never letting a row go negative. If real stock is genuinely
    // insufficient, deducts what's actually there and reports the real
    // shortfall honestly (rule 7/fail-loud) — never invents extra stock
    // to make the math come out even.
    // H24 (Sep 17 2026, 6th pass) — real, persisted pink allocation
    // choices, keyed on this session's own `planned_cooks.pink_
    // allocations` (a real, additive jsonb column, DEFAULT '{}' — a
    // pre-existing row with none set reads as an honest empty map, never
    // guessed). Deliberately NOT threaded through the broader session
    // load/save machinery (_persistSessionDraft/_loadDraftSession/
    // _acceptSchedule, rule 4 — don't touch a working call site's
    // contract more than needed) — a dedicated, narrow read/write,
    // scoped to the one real consumer (ui._showSchedulePreview).
    _loadPinkAllocations: function(plannedCookId, cb) {
      if (!plannedCookId) { cb({}); return; }
      RPGACE.sb.select('planned_cooks', 'select=pink_allocations&id=eq.' + plannedCookId + '&limit=1')
        .then(function(rows) { cb((rows && rows[0] && rows[0].pink_allocations) || {}); })
        .catch(function() { cb({}); });
    },

    _setPinkAllocation: function(plannedCookId, allocKey, recipeId, cb) {
      var self = RPGACE.modules.cookingOracle;
      if (!plannedCookId) { cb('no real planned cook to save this against yet'); return; }
      self.logic._loadPinkAllocations(plannedCookId, function(current) {
        var next = Object.create(null);
        for (var k in current) { if (current.hasOwnProperty(k)) next[k] = current[k]; }
        next[allocKey] = recipeId;
        RPGACE.sb.secureWrite('planned_cooks', 'update', { pink_allocations: next }, 'id=eq.' + plannedCookId)
          .then(function() { cb(null); })
          .catch(function(e) { cb(e.message || 'could not save this choice'); });
      });
    },

    _deriveIngredient: function(sourceName, derivedAmount, yieldRatio, cb) {
      var norm = String(sourceName || '').trim().toLowerCase();
      var ratio = (typeof yieldRatio === 'number' && yieldRatio > 0) ? yieldRatio : 1;
      var needed = (typeof derivedAmount === 'number' && derivedAmount > 0) ? (derivedAmount / ratio) : 0;
      if (!norm || needed <= 0) { cb('nothing real to derive'); return; }
      RPGACE.sb.select('pantry_stock', 'select=ingredient_id,location,quantity,ingredients!inner(name)&ingredients.name=eq.' + encodeURIComponent(norm))
        .then(function(rows) {
          rows = (rows || []).filter(function(r) { return typeof r.quantity === 'number' && r.quantity > 0; });
          if (!rows.length) { cb('no real ' + norm + ' stock found'); return; }
          var remaining = needed;
          var writes = [];
          rows.forEach(function(r) {
            if (remaining <= 0) return;
            var take = Math.min(r.quantity, remaining);
            remaining -= take;
            writes.push({ ingredient_id: r.ingredient_id, location: r.location, newQty: r.quantity - take });
          });
          var doWrite = function(i) {
            if (i >= writes.length) {
              cb(null, { consumed: needed - remaining, shortfall: Math.max(0, remaining) });
              return;
            }
            var w = writes[i];
            RPGACE.sb.secureWrite('pantry_stock', 'update', { quantity: w.newQty }, 'ingredient_id=eq.' + w.ingredient_id + '&location=eq.' + encodeURIComponent(w.location))
              .then(function() { doWrite(i + 1); })
              .catch(function(e) { cb(e.message || 'could not update stock'); });
          };
          doWrite(0);
        })
        .catch(function(e) { cb(e.message || 'could not load real ' + norm + ' stock'); });
    },

    // H24 (Sep 17 2026, 7th pass) — real, shared "is there ANY other real
    // ingredient stocked in the same aisle" resolver (rule 8), extracted
    // out of _classifyIngredientStatus's own prior inline boolean check —
    // now returns the real matched NAME (not just true/false) so a real
    // caller can actually show/declare it, same shape as orange's own
    // _findSubstitute. Deliberately the loosest, cheapest real tier (no
    // curated group, no shared-word heuristic) — genuinely just "same
    // real shopping aisle, a different name."
    // H24 (Sep 17 2026, 8th pass) — real, superseding fix: was a genuinely
    // arbitrary "first real name in the aisle" pick, no relevance check at
    // all (Alex's own live report: "doubanjiang" — a chilli/bean paste —
    // was offered "white pepper" as its blue alternative purely because it
    // happened to be first in the same broad Spices/Sauces/Oils bucket).
    // Now prefers a real shared-significant-word candidate within the
    // aisle (same tokenization _findSubstitute's own heuristic tier
    // already uses, rule 8) before ever falling back to the old arbitrary
    // first-match — never invented relevance, just a real word in common.
    // Genuinely unrelated-by-name pairs (like doubanjiang/chilli bean
    // sauce, sharing zero English tokens) still need a real declared
    // alias — no heuristic can discover that kind of synonym honestly.
    _findAisleAlternative: function(name, aisleIndex) {
      var self = RPGACE.modules.cookingOracle;
      if (!aisleIndex || !name) return null;
      var aisle = self.logic._classifyAisle(name).name;
      var namesInAisle = aisleIndex[aisle] || [];
      var norm = String(name).trim().toLowerCase();
      var stop = self.logic._QUALIFIER_STOPWORDS, headStop = self.logic._GENERIC_HEAD_STOPWORDS;
      var tokens = norm.split(/\s+/).filter(function(w) { return w.length >= 4 && stop.indexOf(w) === -1 && headStop.indexOf(w) === -1; });
      var firstOther = null;
      for (var i = 0; i < namesInAisle.length; i++) {
        var cand = namesInAisle[i];
        if (cand === norm) continue;
        if (!firstOther) firstOther = cand;
        var candTokens = cand.split(/\s+/).filter(function(w) { return stop.indexOf(w) === -1; });
        if (tokens.length && tokens.some(function(t) { return candTokens.indexOf(t) !== -1; })) return cand;
      }
      return firstOther;
    },

    _classifyIngredientStatus: function(opts) {
      var self = RPGACE.modules.cookingOracle;
      opts = opts || {};
      var needed = (typeof opts.needed === 'number') ? opts.needed : 0;
      var have = (typeof opts.have === 'number') ? opts.have : 0;
      if (have <= 0) {
        if (opts.noShopMode && opts.isSeparable) return 'brown';
        // H24 (Sep 17 2026, 5th pass) — a real, checked derivation takes
        // priority over a substitute: it IS the actual real ingredient,
        // not an approximation of it. opts.derivableFrom is real I/O the
        // CALLER already resolved (this function stays pure, no I/O) —
        // see logic._computeIngredientUsage's own derivation lookup.
        if (opts.derivableFrom) return 'maroon';
        if (opts.aisleIndex && opts.name) {
          // H24 (Sep 17 2026, 3rd pass) — real, deliberate correction:
          // a confirmed substitution NEVER classifies green here anymore
          // (Alex's own direct ask — see _confirmSubstitution's comment
          // above for the full reasoning). A confirmed pairing still
          // returns the real, true 'orange' status; opts.confirmedSubs/
          // opts.ingredientId are read by the real CALLERS below (see
          // _computeIngredientUsage's subConfirmed field) to drive a real
          // tick indicator instead, keeping color = truth (what's
          // actually in stock) separate from confirmation = agreement
          // (what Alex has already decided is an acceptable swap).
          var sub = self.logic._findSubstitute(opts.name, opts.aisleIndex);
          if (sub) return 'orange';
          // H24 (Sep 17 2026, 7th pass) — real, superseding extension:
          // was a bare boolean (hasAlt), now routes through the shared
          // _findAisleAlternative (rule 8) so a real CALLER (see
          // _computeIngredientUsage's own blueName resolution below) can
          // capture the actual name that matched, not just "some
          // alternative exists" — needed for the real "same item, 2
          // names" declare action Alex asked for on a blue row too.
          if (self.logic._findAisleAlternative(opts.name, opts.aisleIndex)) return 'blue';
        }
        return 'red';
      }
      if (have < needed) return 'yellow';
      if (needed > 0) {
        var margin = have - needed;
        if (margin < needed * 0.20) return 'purple';
      }
      return 'green';
    },

    // H14 (Sep 16 2026) — real, shared "how much of each ingredient does
    // this set of recipes need, how much do I already have, how much do I
    // need to buy" computation (rule 8), extracted out of
    // _generateShoppingList's own prior inline logic so it can also power
    // ui._showSchedulePreview's real read-only usage/grocery preview
    // without a second hand-rolled copy of the same math. Real, honest
    // scope (section 4, unchanged): grouped by (ingredient_id, unit) pair,
    // never force-summed across mismatched units.
    // H21 (Sep 17 2026) — real, superseding extension: an optional 3rd
    // `opts` param ({noShop:true}) so a real per-session No-Shop mode can
    // reach the shared classifier (rule 8 — every existing caller that
    // omits it is completely unaffected, brown never triggers without
    // it). `is_separable` is now also selected and folded per group: a
    // group stays separable only when EVERY real contributing row across
    // however many recipes in this session said so — if this ingredient
    // is essential to even ONE of them, the merged group must stay
    // essential too (never silently downgraded to omittable).
    _computeIngredientUsage: function(recipeIds, cb, opts) {
      var self = RPGACE.modules.cookingOracle;
      opts = opts || {};
      if (!recipeIds || !recipeIds.length) { cb('no recipes given'); return; }
      // Plain comma-joined UUIDs, no quoting — matches this project's own
      // established, working `in.()` precedent (taxonomy_tree/bibliography/
      // etc). See the real bug note on _showSchedulePreview's own idList
      // line above for why a quoted variant breaks fetch() outright.
      var idList = recipeIds.join(',');
      RPGACE.sb.select('recipe_ingredients', 'select=recipe_id,ingredient_id,amount,unit,grams_estimate,is_separable,ingredients(name)&recipe_id=in.(' + idList + ')')
        .then(function(rows) {
          if (!rows || !rows.length) { cb('no ingredients found for these recipes'); return; }
          var groups = {};
          rows.forEach(function(r) {
            // H18 (Sep 16 2026, real Alex correction: schedule-cook rows
            // were showing "not in stock" purely because a recipe's unit
            // string didn't exactly match the pantry's own unit string for
            // the same real ingredient) — keyed on the SAME normalized
            // unit logic._loadPantrySummed's own byIngredient buckets use
            // (rule 8, one shared normalizer, see logic._normalizeUnit).
            var key = r.ingredient_id + '|' + self.logic._normalizeUnit(r.unit);
            if (!groups[key]) groups[key] = { ingredient_id: r.ingredient_id, name: (r.ingredients && r.ingredients.name) || '?', unit: r.unit || null, amount: 0, gramsEstimate: null, isSeparable: true, perRecipe: [] };
            groups[key].amount += (typeof r.amount === 'number' ? r.amount : 0);
            // H24 (Sep 17 2026, 6th pass, real Alex ask: "i have 400ml of
            // coconut milk, so it good for one recipe... use one
            // subsitute for one recipe with closest alternative possible
            // available from stock) this will help identify which
            // subsitution is least impactful") — real, per-RECIPE
            // attribution, tracked alongside the merged total (never
            // replacing it — every existing consumer of amount/have/
            // status is completely unaffected). This is the one real
            // piece of data the "pink" shared-stock feature needs that
            // nothing before it ever kept.
            groups[key].perRecipe.push({ recipeId: r.recipe_id, amount: (typeof r.amount === 'number' ? r.amount : 0) });
            // H19 (Sep 17 2026) — accumulated alongside amount so the
            // real grams-per-unit ratio logic._resolveHaveAmount needs
            // for a cup<->weight bridge stays valid even when 2+ rows
            // (across different recipes in the same session) land in the
            // same group. A group with no real grams_estimate at all
            // stays null — honest, never a guessed weight.
            if (typeof r.grams_estimate === 'number') groups[key].gramsEstimate = (groups[key].gramsEstimate || 0) + r.grams_estimate;
            if (!r.is_separable) groups[key].isSeparable = false;
          });
          self.logic._loadPantrySummed(function(pantry) {
            // H24 (Sep 17 2026, 2nd pass) — a real confirmed-substitutions
            // snapshot loaded once here alongside the pantry, so every row
            // this function returns already reflects any pairing Alex has
            // previously confirmed (rule 8 — same one loader every real
            // caller of this shared usage computation now benefits from).
            self.logic._loadConfirmedSubs(function(confirmedSubs) {
            // H24 (6th pass) — a real ratings snapshot loaded once here
            // too (rule 8, same one-load-per-call shape confirmedSubs
            // already established), so every real substitute name this
            // function resolves already reflects Alex's own past ratings.
            self.logic._loadSubstitutionRatings(function(subRatings) {
            var list = Object.keys(groups).map(function(k) {
              var g = groups[k];
              // H19 (Sep 17 2026, real Alex ask: recipes lean on cups,
              // stock stays weight/ml/count) — real bridging via
              // logic._resolveHaveAmount instead of a flat exact-key
              // lookup, so "1 cup" here correctly finds real stock logged
              // in ml (volume<->volume, exact) or g/kg (via this
              // ingredient's own real grams_estimate) rather than always
              // reading as 0/not-in-stock.
              var buckets = pantry.byIngredient[g.ingredient_id] || [];
              var have = self.logic._resolveHaveAmount({ neededUnit: g.unit, neededAmount: g.amount, gramsEstimate: g.gramsEstimate, buckets: buckets });
              // H24 (Sep 17 2026, 8th pass, real Alex ask: "a bulb consists
              // of cloves - so make 8 cloves a bulb and vice versa") — a
              // genuinely 3rd real relationship type, distinct from both
              // an alias (same real product, different wording) and a
              // substitute (a different product standing in) — the SAME
              // real ingredient, just measured/packaged differently, with
              // a real, exact, Alex-confirmed ratio. Adds to `have`
              // (never replaces it) since real direct-unit stock and real
              // bridged stock from the paired ingredient both genuinely
              // count.
              have += self.logic._resolveCountEquivalentHave(g.name, g.unit, pantry.byName);
              var toBuy = Math.max(0, g.amount - have);
              // H24 (6th pass) — the real amount this row's own status/
              // toBuy/returned `amount` field are computed against —
              // stays g.amount (the real combined total) unless a real,
              // RESOLVED pink allocation narrows it to one chosen
              // recipe's own real share (see below).
              var effectiveAmount = g.amount;
              // H24 (Sep 17 2026, 6th pass, real Alex ask: "i have 400ml
              // of coconut milk, so it good for one recipe... use one
              // subsitute for one recipe with closest alternative
              // possible available from stock" — AskUserQuestion-
              // confirmed: Alex picks which recipe gets the real stock
              // each time, never auto-picked) — real "pink" detection.
              // Eligible only when 2+ DISTINCT recipes in this session
              // genuinely share the ingredient, real stock covers at
              // least the smallest single recipe's own need (otherwise
              // this is just an ordinary shortfall, the existing ladder
              // already handles it honestly), but not the combined total.
              var pinkInfo = null;
              var distinctRecipeIds = [];
              g.perRecipe.forEach(function(pr) { if (distinctRecipeIds.indexOf(pr.recipeId) === -1) distinctRecipeIds.push(pr.recipeId); });
              var allocKey = g.ingredient_id + '|' + self.logic._normalizeUnit(g.unit);
              if (distinctRecipeIds.length >= 2 && have > 0 && have < g.amount) {
                var minSingle = Math.min.apply(null, g.perRecipe.map(function(pr) { return pr.amount; }));
                if (have >= minSingle) {
                  var chosenRecipeId = (opts.pinkAllocations && opts.pinkAllocations[allocKey]) || null;
                  if (chosenRecipeId && distinctRecipeIds.indexOf(chosenRecipeId) !== -1) {
                    // H24 (6th pass) — real, per-OTHER-recipe fallback,
                    // each one independently classified with have:0 for
                    // its own share (the real stock went to the chosen
                    // recipe) — reuses the exact same classifier/
                    // substitute/derivation machinery every other row
                    // already uses (rule 8), never a parallel 2nd system.
                    var others = g.perRecipe.filter(function(pr) { return pr.recipeId !== chosenRecipeId; }).map(function(pr) {
                      var oDeriv = null;
                      var d2 = self.logic._findDerivation(g.name);
                      if (d2) {
                        var sb2 = pantry.byName[d2.sourceName] || [];
                        var sh2 = sb2.reduce(function(s, b) { return s + (typeof b.quantity === 'number' ? b.quantity : 0); }, 0);
                        if (sh2 > 0) oDeriv = { deriv: d2, srcHave: sh2 };
                      }
                      var oStatus = self.logic._classifyIngredientStatus({ name: g.name, needed: pr.amount, have: 0, aisleIndex: pantry.aisleIndex, derivableFrom: oDeriv });
                      var oSubName = null;
                      if (oStatus === 'orange') { var oSub = self.logic._findSubstitute(g.name, pantry.aisleIndex, g.ingredient_id, subRatings); if (oSub) oSubName = oSub.name; }
                      return { recipeId: pr.recipeId, amount: pr.amount, status: oStatus, subName: oSubName, derivableFrom: (oStatus === 'maroon') ? oDeriv : null };
                    });
                    pinkInfo = { eligible: true, resolved: true, chosenRecipeId: chosenRecipeId, perRecipe: g.perRecipe, others: others, allocKey: allocKey };
                    // The group's own status/have/toBuy now reflect ONLY
                    // the chosen recipe's real amount, not the combined
                    // total — the other recipes' own real need is fully
                    // accounted for separately in pinkInfo.others.
                    var chosenAmount = g.perRecipe.filter(function(pr) { return pr.recipeId === chosenRecipeId; }).reduce(function(s, pr) { return s + pr.amount; }, 0);
                    effectiveAmount = chosenAmount;
                    toBuy = Math.max(0, chosenAmount - have);
                  } else {
                    pinkInfo = { eligible: true, resolved: false, perRecipe: g.perRecipe, allocKey: allocKey };
                  }
                }
              }
              // H18 (Sep 16 2026) — real 5-color status, computed once here
              // (rule 8) so every real consumer of this shared usage list
              // (the schedule preview, the shopping-list generator) gets
              // the same classification for free instead of each
              // re-deriving it.
              // H24 (Sep 17 2026, 5th pass) — real, resolved-once
              // derivation check (rule 8, same real I/O-in-the-caller
              // shape subName/subConfirmed already use). A real source
              // has to genuinely be in stock (any positive quantity,
              // same "genuinely available" bar orange already uses) for
              // maroon to fire — never assumed.
              var derivableFrom = null;
              var deriv = self.logic._findDerivation(g.name);
              if (deriv) {
                var srcBuckets = pantry.byName[deriv.sourceName] || [];
                var srcHave = srcBuckets.reduce(function(sum, b) { return sum + (typeof b.quantity === 'number' ? b.quantity : 0); }, 0);
                if (srcHave > 0) derivableFrom = { deriv: deriv, srcHave: srcHave };
              }
              // H24 (6th pass) — a real, unresolved pink candidate takes
              // priority over every other status — it's a genuinely
              // different real fact ("you have to choose"), not a color
              // the normal ladder can express. A RESOLVED pink candidate
              // falls through to the normal ladder below, now correctly
              // computed against the chosen recipe's own real amount.
              var status = pinkInfo && !pinkInfo.resolved ? 'pink' : self.logic._classifyIngredientStatus({ name: g.name, needed: effectiveAmount, have: have, aisleIndex: pantry.aisleIndex, isSeparable: g.isSeparable, noShopMode: !!opts.noShop, derivableFrom: derivableFrom });
              // H24 (Sep 17 2026, 3rd pass) — real substitute name +
              // confirmed-state resolved ONCE here (rule 8 — this used
              // to be re-derived independently by every real UI consumer,
              // see ui._showSchedulePreview's own buyBefore loop, which
              // now just reads these 2 fields instead of calling
              // _findSubstitute a second time against a 2nd, separately-
              // loaded pantry snapshot). subConfirmed drives a real tick
              // indicator, never a color change (see the classifier's own
              // comment above for why).
              var subName = null, subConfirmed = false, subRatio = null, subRatioNote = null;
              if (status === 'orange') {
                var subInfo = self.logic._findSubstitute(g.name, pantry.aisleIndex, g.ingredient_id, subRatings);
                if (subInfo) {
                  subName = subInfo.name;
                  subConfirmed = !!(confirmedSubs[g.ingredient_id + '::' + subName]);
                  // H24 (8th pass, real Alex ask: "i need these conversion
                  // ratios to always be looked up to make educated
                  // subsitutions") — real, curated potency ratio (or null,
                  // never a guess) resolved once here, same rule-8 shape
                  // as subName/subConfirmed above.
                  subRatio = subInfo.ratio || null;
                  subRatioNote = subInfo.ratioNote || null;
                }
              }
              // H24 (Sep 17 2026, 7th pass, real Alex ask: "orange should
              // have an option where i declare we talk about same item
              // just 2 derivations of names") — resolved for blue too
              // (his own answer, both rows), reusing the shared
              // _findAisleAlternative (rule 8) rather than a 2nd lookup.
              var blueName = null;
              if (status === 'blue') blueName = self.logic._findAisleAlternative(g.name, pantry.aisleIndex);
              // H24 (6th pass) — `amount` returned here is effectiveAmount
              // (the real combined total, UNLESS a resolved pink
              // allocation narrows it to just the chosen recipe's own
              // share) so it always stays internally consistent with
              // this same row's own status/toBuy — the real, full
              // per-recipe breakdown (including any amount this row's
              // own `amount` field no longer directly shows) always lives
              // in pinkInfo.perRecipe, never lost.
              return { ingredient_id: g.ingredient_id, name: g.name, unit: g.unit, amount: effectiveAmount, have: have, toBuy: toBuy, status: status, isSeparable: g.isSeparable, subName: subName, subConfirmed: subConfirmed, subRatio: subRatio, subRatioNote: subRatioNote, blueName: blueName, derivableFrom: (status === 'maroon') ? derivableFrom : null, pinkInfo: pinkInfo };
            });
            // H24 (Sep 17 2026, 8th pass, real Alex ask: "instead of asking
            // for something as same term, i have an option of agreeing or
            // selecting from stock to determine") — a real 3rd callback
            // arg, every existing caller that ignores it unaffected: every
            // distinct real ingredient NAME genuinely in stock right now
            // (qty > 0 in at least one real unit bucket, same bar
            // aisleIndex itself already holds to), sorted, so the real
            // "declare same item" picker has real names to search instead
            // of only the system's own single guessed candidate.
            var stockNames = Object.keys(pantry.byName || {}).filter(function(n) {
              return (pantry.byName[n] || []).some(function(b) { return b.quantity > 0; });
            }).sort();
            cb(null, list, stockNames);
            });
            });
          });
        })
        .catch(function(e) { cb(e.message || 'could not load session ingredients'); });
    },

    // H18 (Sep 16 2026, real Alex ask: "now i can look for recipes that
    // will only give me purple or green ingredients so i can have perfect
    // recipes with my context") — real, evidence-checked "which of my
    // saved recipes are makeable right now with zero shopping trip"
    // computation. A recipe is fully makeable when every real ingredient
    // classifies green or purple (Alex's own stated rule: those two are
    // the ones NOT needed before a shop; red/yellow/blue all are). Reuses
    // the SAME shared classifier + pantry snapshot every other real
    // consumer uses (rule 8) — never a second have/need computation.
    _findMakeableRecipes: function(cb) {
      var self = RPGACE.modules.cookingOracle;
      RPGACE.sb.select('recipes', 'select=id,title&order=title.asc')
        .then(function(recipeRows) {
          if (!recipeRows || !recipeRows.length) { cb(null, []); return; }
          RPGACE.sb.select('recipe_ingredients', 'select=recipe_id,ingredient_id,amount,unit,grams_estimate,ingredients(name)')
            .then(function(riRows) {
              self.logic._loadPantrySummed(function(pantry) {
                var byRecipe = {};
                (riRows || []).forEach(function(r) {
                  if (!byRecipe[r.recipe_id]) byRecipe[r.recipe_id] = [];
                  byRecipe[r.recipe_id].push(r);
                });
                var results = recipeRows.map(function(rec) {
                  var ings = byRecipe[rec.id] || [];
                  // H21 (Sep 17 2026) — orange (a real substitute in
                  // stock, skip buying) added to the count so a genuine
                  // orange-only recipe isn't silently mis-tallied to NaN;
                  // deliberately NOT included in the blocking sum below —
                  // same real "no shopping trip needed" status as
                  // green/purple, per its own INGREDIENT_STATUS_META label.
                  var counts = { green: 0, yellow: 0, red: 0, blue: 0, purple: 0, orange: 0 };
                  var statuses = ings.map(function(ing) {
                    // H19 (Sep 17 2026, real Alex ask: recipes lean on
                    // cups, stock stays weight/ml/count) — real bridging
                    // via logic._resolveHaveAmount (rule 8), not a flat
                    // exact-unit lookup.
                    var buckets = pantry.byIngredient[ing.ingredient_id] || [];
                    var have = self.logic._resolveHaveAmount({ neededUnit: ing.unit, neededAmount: ing.amount, gramsEstimate: ing.grams_estimate, buckets: buckets });
                    var name = (ing.ingredients && ing.ingredients.name) || '?';
                    var status = self.logic._classifyIngredientStatus({ name: name, needed: ing.amount, have: have, aisleIndex: pantry.aisleIndex });
                    counts[status]++;
                    return { name: name, status: status };
                  });
                  var makeable = ings.length > 0 && (counts.red + counts.yellow + counts.blue) === 0;
                  return { id: rec.id, title: rec.title, makeable: makeable, counts: counts, statuses: statuses };
                });
                cb(null, results);
              });
            })
            .catch(function(e) { cb(e.message || 'could not load recipe ingredients'); });
        })
        .catch(function(e) { cb(e.message || 'could not load saved recipes'); });
    },

    // H18 (Sep 16 2026) — real reconstruction of a saved recipe into the
    // same shape ui._showRecipeCard already renders (recipes.steps is
    // jsonb, already the right shape; recipe_ingredients only holds a real
    // ingredient_id, so names come back via the join, same as everywhere
    // else this project reads that table). The recipe finder is the first
    // real caller that needs to REOPEN an already-saved recipe rather than
    // showing a fresh generation.
    _loadSavedRecipe: function(recipeId, cb) {
      RPGACE.sb.select('recipes', 'select=id,title,servings_base,steps,steps_proposed&id=eq.' + recipeId + '&limit=1')
        .then(function(rows) {
          var row = rows && rows[0];
          if (!row) { cb('recipe not found'); return; }
          // H24 (Sep 17 2026, 6th pass) — real ingredient_id added to the
          // select + returned shape (rule 8 — one real loader, extended,
          // never a 2nd copy) so a reopened saved recipe's own ingredient
          // rows carry a real, checkable database identity — the one
          // real thing the recipe card's rating UI needs and never had
          // before (a fresh, not-yet-saved generation still has none,
          // an honest, unavoidable gap — nothing to rate against until a
          // real recipe_ingredients row exists).
          RPGACE.sb.select('recipe_ingredients', 'select=ingredient_id,amount,unit,grams_estimate,is_separable,ingredients(name)&recipe_id=eq.' + recipeId)
            .then(function(riRows) {
              var recipe = {
                title: row.title, servings_base: row.servings_base, steps: row.steps || [], steps_proposed: Array.isArray(row.steps_proposed) ? row.steps_proposed : null,
                ingredients: (riRows || []).map(function(r) {
                  // H21 (Sep 17 2026) — a pre-existing recipe saved before
                  // this shipped has a real NULL here (column default is
                  // false anyway) — coerced honestly to essential, never
                  // guessed as a real separable tag it never actually got.
                  return { ingredient_id: r.ingredient_id, name: (r.ingredients && r.ingredients.name) || '?', amount: r.amount, unit: r.unit, grams_estimate: r.grams_estimate, is_separable: !!r.is_separable };
                }),
              };
              cb(null, recipe);
            })
            .catch(function(e) { cb(e.message || 'could not load recipe ingredients'); });
        })
        .catch(function(e) { cb(e.message || 'could not load recipe'); });
    },

    _generateShoppingList: function(sess, cb) {
      var self = RPGACE.modules.cookingOracle;
      if (!sess || !sess.recipeIds || !sess.recipeIds.length) { cb('no recipes in this session yet'); return; }
      var noShop = sess.shopMode === 'no_shop';
      self.logic._computeIngredientUsage(sess.recipeIds, function(err, usage) {
        if (err) { cb(err); return; }
        // H21 (Sep 17 2026) — real per-session No-Shop mode: a genuine
        // brown (separable, missing) ingredient never lands on the actual
        // physical shopping list at all — the whole real point of the
        // toggle is skipping the shop trip, so it would defeat that to
        // still nag Alex to buy something he's already decided to omit.
        // An essential missing ingredient (any other status) still goes
        // on the list unchanged, No-Shop mode or not.
        var toInsert = usage.filter(function(u) { return u.status !== 'brown'; });
        RPGACE.sb.secureWrite('shopping_lists', 'insert', { planned_cook_id: sess.plannedCookId || null, status: 'open', shop_mode: sess.shopMode || 'can_shop', kind: 'cook' })
          .then(function(data) {
            var listRow = Array.isArray(data) ? data[0] : data;
            if (!listRow || !listRow.id) throw new Error('shopping list insert returned no row');
            var itemsPayload = toInsert.map(function(u) {
              return {
                list_id: listRow.id, ingredient_id: u.ingredient_id,
                needed_amount: u.amount, needed_unit: u.unit,
                have_amount: u.have, to_buy_amount: u.toBuy, bought: false,
              };
            });
            if (!itemsPayload.length) return listRow.id;
            return RPGACE.sb.secureWrite('shopping_list_items', 'insert', itemsPayload).then(function() { return listRow.id; });
          })
          .then(function(listId) { cb(null, listId); })
          .catch(function(e) { cb(e.message || 'shopping list save failed'); });
      }, { noShop: noShop });
    },

    // The real, combined tick-bought -> price-log moment (section 2, Q2).
    // Writes ingredient_prices (real, permanent purchase history — the
    // table already has zero unique constraint beyond its PK, confirmed
    // real evidence, so insert-only already gives real price-over-time
    // tracking with no schema change needed), flips the shopping-list item
    // to bought, and best-effort tops up pantry_stock — ONLY when the
    // purchased unit matches this item's own tracked unit (same
    // conservative, never-silently-wrong discipline as the grouping above).
    _recordPurchase: function(item, entry, cb) {
      var unitPrice = entry.packSize > 0 ? (entry.price / entry.packSize) : null;
      RPGACE.sb.secureWrite('ingredient_prices', 'insert', {
        ingredient_id: item.ingredient_id,
        supermarket: entry.store,
        brand: entry.brand,
        pack_size: entry.packSize,
        pack_unit: entry.unit,
        pack_price: entry.price,
        unit_price: unitPrice,
        price_updated_at: new Date().toISOString(),
      })
        .then(function(data) {
          var priceRow = Array.isArray(data) ? data[0] : data;
          var priceId = priceRow && priceRow.id ? priceRow.id : null;
          // H22 (Sep 17 2026) — in_basket:true kept alongside bought:true
          // for data consistency (a real bought item was, under this
          // flow, necessarily found and basketed first) — harmless even
          // for the rare item marked bought while it was never actually
          // basketed (a stale draft resumed after H22 shipped, say).
          return RPGACE.sb.secureWrite('shopping_list_items', 'update', { bought: true, in_basket: true, ingredient_price_id: priceId }, 'id=eq.' + item.id);
        })
        .then(function() {
          // CR-1 (Oct 14 2026) — the old top-up upserted on ingredient_id
          // alone, but pantry_stock's key is (ingredient_id, location), so
          // Postgres rejected it every time (0 bought items had ever hit it).
          // Now adds the pack to the location Alex picked, via the one
          // shared logic._addStock. A unit that doesn't match the item's
          // tracked unit is reported back, never guessed (rule 7).
          var self = RPGACE.modules.cookingOracle;
          if (!entry.unit || !item.needed_unit || self.logic._normalizeUnit(entry.unit) !== self.logic._normalizeUnit(item.needed_unit)) {
            return { stocked: false };
          }
          return new Promise(function(resolve, reject) {
            self.logic._addStock(item.ingredient_id, entry.location || 'pantry', entry.packSize, entry.unit, function(err) {
              if (err) reject(new Error('bought and price saved, but stock not updated: ' + err)); else resolve({ stocked: true });
            });
          });
        })
        .then(function(res) { cb(null, res || { stocked: false }); })
        .catch(function(e) { cb(e.message || 'purchase log failed'); });
    },

    // ============================================================
    // H6 — multi-recipe kitchen-session scheduler, 2026-09-12.
    // Real record: records/2026-09/habits_cooking_domain_interrogation_
    // spec_2026-09-10.txt, section 10 (4 forks resolved via AskUserQuestion).
    // H12 (Sep 16 2026) real persistence fix: records/2026-09/
    // h12_planned_cook_draft_persistence_spec_2026-09-16.txt.
    // ============================================================

    // H12 (Sep 16 2026, real Alex bug report - "i just planned 2 meals for
    // a planned cook... but they didnt save in app, and the grocery list is
    // nowhere to be seen"). Real root cause, confirmed via direct Supabase
    // query: the 2 recipes themselves saved fine, but the SESSION (which
    // recipes are batched for this cook) lived only in self._session - pure
    // in-memory state - until a much later, separate action (Generate
    // shopping list / Accept schedule). Closing the tab, navigating away,
    // or just not reaching that later action lost real planning work with
    // zero trace and zero warning. Fixed: every add now fires a real
    // background persist (logic._persistSessionDraft) - the UI updates
    // immediately from memory (unchanged feel), the real write happens
    // alongside it, and a genuine write failure surfaces as a real toast
    // (rule 7 - fail loud) rather than silently vanishing a second time.
    _addRecipeToSession: function(id, title) {
      var self = RPGACE.modules.cookingOracle;
      if (!id) return;
      if (!self._session) self._session = { recipeIds: [], recipes: [], plannedCookId: null, shopMode: 'can_shop' };
      self._sessionChecked = true; // real session now exists in memory - no need to check Supabase for a draft to resume
      if (self._session.recipeIds.indexOf(id) === -1) {
        self._session.recipeIds.push(id);
        self._session.recipes.push({ id: id, title: title || 'Recipe' });
        self.logic._persistSessionDraft();
      }
    },

    // Real Alex ask (Sep 16 2026): "planned cook doesnt have a delete
    // button, i wanted to delete the lime orange desert and choose one i
    // have all ingredients for" - _addRecipeToSession above could only
    // grow a session; there was no way to drop a bad pick short of
    // abandoning the whole plan. Same real insert-or-update path
    // _persistSessionDraft already uses (rule 8), except a removal that
    // empties the session does a real DELETE instead - an empty draft row
    // serves no purpose and would just resurface as a stale "0 recipes"
    // resume on the next Cooking-hub open. In-memory state is only
    // updated AFTER a real persisted write confirms (fail loud, rule 7) -
    // never optimistically, so a failed write can't leave the UI showing
    // a session that doesn't actually match what's saved.
    _removeRecipeFromSession: function(id, cb) {
      var self = RPGACE.modules.cookingOracle;
      cb = cb || function() {};
      var sess = self._session;
      if (!sess || sess.recipeIds.indexOf(id) === -1) { cb(null); return; }
      var nextIds = sess.recipeIds.filter(function(rid) { return rid !== id; });
      var nextRecipes = sess.recipes.filter(function(r) { return r.id !== id; });

      if (!sess.plannedCookId) {
        // Real edge case: an add's own fire-and-forget insert (see
        // _persistSessionDraft) hasn't landed yet when this fires - never
        // actually persisted, so nothing to write, just update memory.
        sess.recipeIds = nextIds;
        sess.recipes = nextRecipes;
        if (!nextIds.length) self._session = null;
        cb(null);
        return;
      }

      if (!nextIds.length) {
        // Oct 5 2026 - real data-loss fix: this used to hard-DELETE the row,
        // and the in-memory session could be pointing at a scheduled/cooked
        // cook (Laksa Oct 1 and the Sep 16 three-recipe cook both vanished
        // from planned_cooks with no trace). Now a soft discard, and only
        // ever of a row that is still a draft - a scheduled or cooked row
        // is never touched from a session edit. Draft loaders already
        // filter status=eq.draft, so a discarded row simply stops showing.
        RPGACE.sb.secureWrite('planned_cooks', 'update', { status: 'discarded' }, 'id=eq.' + sess.plannedCookId + '&status=eq.draft')
          .then(function() { self._session = null; cb(null); })
          .catch(function(e) { cb(e.message || 'could not clear now-empty session'); });
        return;
      }

      RPGACE.sb.secureWrite('planned_cooks', 'update', { recipe_ids: nextIds }, 'id=eq.' + sess.plannedCookId)
        .then(function() {
          sess.recipeIds = nextIds;
          sess.recipes = nextRecipes;
          cb(null);
        })
        .catch(function(e) { cb(e.message || 'could not save session after removing recipe'); });
    },

    // The real write half of the fix above - one shared insert-or-update
    // path (rule 8), called after every real recipe add. Fire-and-forget
    // by design (no caller currently needs to await this - the UI already
    // rendered from the in-memory state that was updated synchronously
    // before this ran); a real failure still surfaces via toast so Alex
    // isn't left assuming a save that didn't happen.
    _persistSessionDraft: function() {
      var self = RPGACE.modules.cookingOracle;
      var sess = self._session;
      if (!sess || !sess.recipeIds.length) return;
      // H21 (Sep 17 2026) — real per-session shop/no-shop mode, persisted
      // alongside the recipe list itself so a resumed draft keeps
      // whichever real choice Alex made (rule 8, same insert-or-update
      // path every other session edit already goes through).
      if (sess.plannedCookId) {
        RPGACE.sb.secureWrite('planned_cooks', 'update', { recipe_ids: sess.recipeIds, shop_mode: sess.shopMode || 'can_shop' }, 'id=eq.' + sess.plannedCookId)
          .catch(function(e) {
            RPGACE.utils.toast('⚠️ Could not save your planned cook: ' + (e.message || 'unknown error'), '#CC4A4A', 4200);
          });
        return;
      }
      RPGACE.sb.secureWrite('planned_cooks', 'insert', { recipe_ids: sess.recipeIds, status: 'draft', shop_mode: sess.shopMode || 'can_shop' })
        .then(function(data) {
          var row = Array.isArray(data) ? data[0] : data;
          if (!row || !row.id) throw new Error('planned_cooks insert returned no row');
          sess.plannedCookId = row.id;
        })
        .catch(function(e) {
          RPGACE.utils.toast('⚠️ Could not save your planned cook: ' + (e.message || 'unknown error'), '#CC4A4A', 4200);
        });
    },

    // The real read/resume half - checks for an existing draft planned_cooks
    // row and rebuilds self._session from it (real recipe titles joined in,
    // never guessed) so a fresh page load can pick up exactly where Alex
    // left off. Short-circuits via _sessionChecked so this only ever hits
    // Supabase once per page load, matching the pattern _showModuleHub's own
    // shopping-list fallback below already uses. cb(err, sessionOrNull).
    _loadDraftSession: function(cb) {
      var self = RPGACE.modules.cookingOracle;
      cb = cb || function() {};
      if (self._sessionChecked) { cb(null, self._session); return; }
      RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids,shop_mode&status=eq.draft&order=created_at.desc&limit=1')
        .then(function(rows) {
          self._sessionChecked = true;
          var row = rows && rows[0];
          if (!row || !row.recipe_ids || !row.recipe_ids.length) { cb(null, null); return; }
          var idList = row.recipe_ids.join(',');
          RPGACE.sb.select('recipes', 'select=id,title&id=in.(' + idList + ')')
            .then(function(recipeRows) {
              var byId = {};
              (recipeRows || []).forEach(function(r) { byId[r.id] = r.title; });
              self._session = {
                recipeIds: row.recipe_ids.slice(),
                recipes: row.recipe_ids.map(function(id) { return { id: id, title: byId[id] || '(recipe not found)' }; }),
                plannedCookId: row.id,
                // H21 (Sep 17 2026) — real, resumed per-session shop mode.
                shopMode: row.shop_mode || 'can_shop',
              };
              cb(null, self._session);
            })
            .catch(function(e) { cb(e.message || 'could not load session recipes', null); });
        })
        .catch(function(e) { self._sessionChecked = true; cb(e.message || 'could not check for a planned cook', null); });
    },

    // H20 (Sep 17 2026, real Alex bug report: "no way to revert planned
    // cook back from scheduled to planned cook in cooking module") — the
    // real read half for a scheduled (status='scheduled') planned_cooks
    // row, same shape as _loadDraftSession above but for the OTHER real
    // status this table ever holds. Only ever called when there's no
    // active draft (see ui._showModuleHub), so this stays a cheap, rare
    // query rather than a 2nd check on every normal hub open.
    _loadScheduledSession: function(cb) {
      var self = RPGACE.modules.cookingOracle;
      cb = cb || function() {};
      RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids,scheduled_at,agenda_id&status=eq.scheduled&order=created_at.desc&limit=1')
        .then(function(rows) {
          var row = rows && rows[0];
          if (!row || !row.recipe_ids || !row.recipe_ids.length) { self._scheduledSession = null; cb(null, null); return; }
          var idList = row.recipe_ids.join(',');
          RPGACE.sb.select('recipes', 'select=id,title&id=in.(' + idList + ')')
            .then(function(recipeRows) {
              var byId = {};
              (recipeRows || []).forEach(function(r) { byId[r.id] = r.title; });
              self._scheduledSession = {
                recipeIds: row.recipe_ids.slice(),
                recipes: row.recipe_ids.map(function(id) { return { id: id, title: byId[id] || '(recipe not found)' }; }),
                plannedCookId: row.id,
                agendaId: row.agenda_id || null,
                scheduledAt: row.scheduled_at || null,
              };
              cb(null, self._scheduledSession);
            })
            .catch(function(e) { cb(e.message || 'could not load scheduled session recipes', null); });
        })
        .catch(function(e) { cb(e.message || 'could not check for a scheduled cook', null); });
    },

    // H20 (Sep 17 2026) — real, deliberate, one-click-away revert: flips
    // the same planned_cooks row back to status='draft' (so
    // _loadDraftSession picks it back up next open) and cleans up the
    // now-stale calendar entry it created — both the real Supabase
    // rpgace_agendas row AND the local RPGACE.DB('sched') cache
    // renderDailyGrid reads from (same real key scheduleToCalendar itself
    // writes into, rule 8 — never a 2nd, parallel local-cache mechanism).
    // The agenda cleanup is real but best-effort (console-warned, not
    // cb'd as a failure) — a stray leftover calendar entry is a real but
    // minor annoyance; failing the whole revert over it would be worse.
    _revertScheduleToDraft: function(scheduled, cb) {
      RPGACE.sb.secureWrite('planned_cooks', 'update', { status: 'draft', agenda_id: null }, 'id=eq.' + scheduled.plannedCookId)
        .then(function() {
          if (!scheduled.agendaId) { cb(null); return; }
          RPGACE.sb.secureWrite('rpgace_agendas', 'delete', null, 'id=eq.' + scheduled.agendaId)
            .catch(function(e) { console.warn('[cookingOracle] could not delete stale agenda row on revert:', e.message); });
          try {
            if (RPGACE.DB && RPGACE.DB.get) {
              var stored = RPGACE.DB.get('sched') || [];
              RPGACE.DB.set('sched', stored.filter(function(a) { return a.id !== scheduled.agendaId; }));
            }
          } catch (e) { console.warn('[cookingOracle] could not clean local schedule cache on revert:', e.message); }
          cb(null);
        })
        .catch(function(e) { cb(e.message || 'could not revert schedule'); });
    },

    _fmtMin: function(mins) {
      mins = Math.max(0, Math.round(mins || 0));
      var h = Math.floor(mins / 60), m = mins % 60;
      return (h > 0 ? h + 'h ' : '') + m + 'm';
    },

    // Whether a [t, t+duration) booking keeps this resource's concurrent
    // count strictly under `capacity` at every instant in that window. Only
    // needs to check breakpoints (concurrency can only change at an existing
    // interval's own start/end) — proportionate at this real scale (a
    // handful of recipes/steps per session), never a general solver (rule 11).
    _intervalCapacityOk: function(t, duration, capacity, intervals) {
      if (capacity <= 0) return true; // no real constraint modeled for a 0-slot resource
      var end = t + duration;
      var points = [t];
      intervals.forEach(function(iv) { if (iv[0] > t && iv[0] < end) points.push(iv[0]); });
      for (var p = 0; p < points.length; p++) {
        var count = 0;
        for (var j = 0; j < intervals.length; j++) {
          if (intervals[j][0] <= points[p] && intervals[j][1] > points[p]) count++;
        }
        if (count >= capacity) return false;
      }
      return true;
    },

    // Earliest t >= minStart where BOTH real resources a step can need are
    // simultaneously free: hands (capacity 1, for the active portion only)
    // AND, when the step occupies equipment, that equipment (for the full
    // active+passive span). A real bug caught before this ever shipped
    // (self-caught via a standalone Node test, not by Alex): an earlier
    // draft tracked oven/stovetop busy time but never actually checked it
    // before placing a step — CONFIG's oven(2)/stovetop(4) slot counts were
    // completely decorative. Fixed to a real joint feasibility search:
    // candidate start times are every breakpoint from EITHER resource,
    // never a single-resource sweep. equipIntervals/equipCapacity are
    // omitted (null/0) for step types that need no equipment.
    _earliestFeasibleStart: function(minStart, activeDuration, totalDuration, handsIntervals, equipIntervals, equipCapacity) {
      var self = RPGACE.modules.cookingOracle;
      var candidates = [minStart];
      var addFrom = function(intervals) {
        intervals.forEach(function(iv) {
          if (iv[1] > minStart) candidates.push(iv[1]);
          if (iv[0] > minStart) candidates.push(iv[0]);
        });
      };
      addFrom(handsIntervals);
      if (equipIntervals) addFrom(equipIntervals);
      candidates.sort(function(a, b) { return a - b; });
      for (var i = 0; i < candidates.length; i++) {
        var t = candidates[i];
        if (activeDuration > 0 && !self.logic._intervalCapacityOk(t, activeDuration, 1, handsIntervals)) continue;
        if (equipIntervals && equipCapacity > 0 && !self.logic._intervalCapacityOk(t, totalDuration, equipCapacity, equipIntervals)) continue;
        return t;
      }
      return minStart; // unreachable in practice — minStart is always the first candidate checked
    },

    // The real greedy interval-packing heuristic the interrogation spec
    // recommended (section 8): process recipes longest-total-duration first,
    // placing each one's own steps (in their own fixed order) as early as
    // real resource availability allows — this is what actually fills one
    // recipe's dead time with another's active work, and vice versa.
    //
    // Real, explicit build-time modeling choice (not pinned down by the
    // spec — flagged here rather than silently invented): 'baking' occupies
    // an oven slot for its full active+passive span, 'actual_cooking'
    // occupies a stovetop slot the same way, 'prep_before_cooking'/
    // 'prep_while_cooking' occupy neither (hands only, active portion only).
    // Hands are a single, non-configurable resource (capacity 1) — never
    // double-booked, matching Alex's own hard constraint verbatim.
    // H24 (Sep 17 2026, 9th pass, real Alex ask: "marination of beef
    // should be in beginning, as marinating for longer is a huge
    // benefit, more prep should pass in the beginning to make actual
    // cooking less stressful") — a real, structural scheduling fix, not
    // just a reorder hack. The OLD version fully assigned start times to
    // EVERY step of one recipe (the current longest, by total duration)
    // before ever considering the NEXT recipe's own first step — meaning
    // a shorter recipe's genuinely early, hands-only prep (which could
    // physically start the moment hands are free) still had to wait for
    // its turn in chain-processing order, not real resource availability.
    // Real, generalized fix: at every iteration, look at EVERY recipe's
    // own next unscheduled step (each is only ever gated by that SAME
    // recipe's own prior step, per this function's own established "steps
    // run in the order Oracle gave them" per-recipe contract — never by a
    // different recipe) and schedule whichever one can genuinely start
    // soonest — a real, textbook greedy interleave, not a fixed
    // per-recipe order. This naturally front-loads prep work (including
    // any marination folded into a prep step) as early as hands/oven/
    // stove capacity genuinely allows, since a short, hands-only prep
    // step usually clears the earliest-start check well before a longer
    // recipe's own later, equipment-heavy steps do. The underlying
    // resource-feasibility engine (_earliestFeasibleStart, hands/oven/
    // stove capacity) is completely untouched — only the ORDER steps are
    // proposed to it changes. A genuine tie still favors the original
    // longest-recipe-first order (chains' own array order), preserving
    // the same deterministic behaviour as before whenever there's no
    // real conflict to resolve.
    _computeSessionSchedule: function(recipes, cfg) {
      var self = RPGACE.modules.cookingOracle;
      var ovenCap = (cfg && cfg.oven_slots != null) ? cfg.oven_slots : 2;
      var stoveCap = (cfg && cfg.stovetop_slots != null) ? cfg.stovetop_slots : 4;

      var chains = (recipes || []).map(function(r) {
        var steps = (r.steps || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
        var total = steps.reduce(function(sum, s) { return sum + (s.active_duration_min || 0) + (s.passive_duration_min || 0); }, 0);
        return { id: r.id, title: r.title || 'Recipe', steps: steps, totalMinutes: total, nextIndex: 0, prevEnd: 0 };
      }).sort(function(a, b) { return b.totalMinutes - a.totalMinutes; }); // real tiebreak order, longest first

      var sequentialMinutes = chains.reduce(function(s, c) { return s + c.totalMinutes; }, 0);

      var handsBusy = [];  // capacity 1, hard constraint
      var ovenBusy = [];   // capacity ovenCap
      var stoveBusy = [];  // capacity stoveCap
      var blocks = [];

      // Real, explicit real-only priority (never a fabricated one): a
      // genuine "prep" step (prep_before_cooking/prep_while_cooking, the
      // 2 real non-equipment step types this project already defines,
      // rule 7 — never invented here) beats a "cooking" step ONLY when
      // both are feasible at the exact same earliest real time — this
      // directly answers "more prep should pass in the beginning" for
      // the real ties this greedy search actually finds, without ever
      // delaying a resource-optimal placement to do it (a step that
      // could start EARLIER always wins regardless of type).
      var isPrepType = function(t) { return t === 'prep_before_cooking' || t === 'prep_while_cooking'; };
      var remaining = chains.filter(function(c) { return c.steps.length > 0; }).length;
      while (remaining > 0) {
        var bestChain = null, bestStart = null, bestEquip = null, bestCap = 0, bestActive = 0, bestTotal = 0, bestIsPrep = false;
        chains.forEach(function(chain) {
          if (chain.nextIndex >= chain.steps.length) return;
          var step = chain.steps[chain.nextIndex];
          var active = step.active_duration_min || 0;
          var total = active + (step.passive_duration_min || 0);
          var equipIntervals = null, equipCap = 0;
          if (step.type === 'baking') { equipIntervals = ovenBusy; equipCap = ovenCap; }
          else if (step.type === 'actual_cooking') { equipIntervals = stoveBusy; equipCap = stoveCap; }
          var candidateStart = self.logic._earliestFeasibleStart(chain.prevEnd, active, total, handsBusy, equipIntervals, equipCap);
          var candidateIsPrep = isPrepType(step.type);
          var better = bestChain === null || candidateStart < bestStart
            || (candidateStart === bestStart && candidateIsPrep && !bestIsPrep);
          if (better) {
            bestChain = chain; bestStart = candidateStart; bestEquip = equipIntervals; bestCap = equipCap; bestActive = active; bestTotal = total; bestIsPrep = candidateIsPrep;
          }
        });

        var winStep = bestChain.steps[bestChain.nextIndex];
        var start = bestStart;
        if (bestActive > 0) handsBusy.push([start, start + bestActive]);
        var equipEnd = start + bestTotal;
        if (bestEquip && bestCap > 0) bestEquip.push([start, equipEnd]);

        blocks.push({
          recipeId: bestChain.id, recipeTitle: bestChain.title, type: winStep.type,
          description: winStep.description || '', start: start, end: equipEnd,
          ingredientsUsed: winStep.ingredients_used || [], // H14 - carried through for the schedule preview's own real measurement chips
          doneCue: winStep.done_cue || '', equipment: winStep.equipment || '', // Oct 11 2026 - Cook Mode
          // CM-3 (Oct 15 2026): the step's own hands-on / waiting split, so
          // Cook Mode only puts a timer on the waiting part.
          activeMin: bestActive, passiveMin: Math.max(0, bestTotal - bestActive), timerEnd: winStep.timer_end || '',
        });
        bestChain.prevEnd = equipEnd;
        bestChain.nextIndex++;
        if (bestChain.nextIndex >= bestChain.steps.length) remaining--;
      }

      var makespan = blocks.reduce(function(m, b) { return Math.max(m, b.end); }, 0);
      return { blocks: blocks, totalMinutes: makespan, sequentialMinutes: sequentialMinutes };
    },

    // v1 ships read-only proposed schedule + Accept (section 10, fork 4) —
    // writes planned_cooks (the additive linking/scheduling layer — each
    // component recipe keeps its OWN journal row, H3's cooked_at/FK contract
    // and H1's ingredient_frequency view are untouched) then pushes ONE
    // agenda entry via the existing shared scheduleToCalendar() (rule 8 —
    // never a second hand-rolled rpgace_agendas insert). Deliberate scope
    // line, section 10 fork 3: plain date/time only, no shift/calendar
    // collision-checking — that's H5, a separate, later, unstarted item.
    // H12 (Sep 16 2026) — real update-in-place when a draft row already
    // exists (the normal case now that every add persists one, per
    // logic._persistSessionDraft above), falling back to a fresh insert
    // only for the honest edge case of a session that somehow reached
    // Accept with no real draft row yet (e.g. its own first persist
    // attempt failed and Alex pushed on regardless) — never a silent
    // duplicate row, one real planned_cooks row per real session either way.
    _acceptSchedule: function(sess, schedule, dateStr, hour, minute, cb) {
      var self = RPGACE.modules.cookingOracle;
      var write = sess.plannedCookId
        ? RPGACE.sb.secureWrite('planned_cooks', 'update', {
            recipe_ids: sess.recipeIds, schedule: schedule, scheduled_at: dateStr, status: 'scheduled', shop_mode: sess.shopMode || 'can_shop',
          }, 'id=eq.' + sess.plannedCookId).then(function() { return [{ id: sess.plannedCookId }]; })
        : RPGACE.sb.secureWrite('planned_cooks', 'insert', {
            recipe_ids: sess.recipeIds, schedule: schedule, scheduled_at: dateStr, status: 'scheduled', shop_mode: sess.shopMode || 'can_shop',
          });
      write
        .then(function(data) {
          var row = Array.isArray(data) ? data[0] : data;
          if (!row || !row.id) throw new Error('planned_cooks save returned no row');
          var titles = sess.recipes.map(function(r) { return r.title; }).join(' + ');
          var agendaEntry = scheduleToCalendar({
            date: dateStr, hour: hour, minute: minute,
            title: '🍳 Cook: ' + titles,
            description: 'Batch cook session (' + sess.recipeIds.length + ' recipe' + (sess.recipeIds.length === 1 ? '' : 's') + ') planned via HABITS Cooking. Total elapsed kitchen time: ' + self.logic._fmtMin(schedule.totalMinutes) + '.',
            category: 'cooking',
            duration_mins: Math.round(schedule.totalMinutes),
            source_type: 'planned_cook',
            source_id: row.id,
          });
          // Best-effort back-link (planned_cooks.agenda_id) so a future H5
          // pass can read straight from planned_cooks to its own agenda row
          // without a reverse lookup — never blocks the real outcome (the
          // agenda entry itself, already written above) on this succeeding.
          if (agendaEntry && agendaEntry.id) {
            RPGACE.sb.secureWrite('planned_cooks', 'update', { agenda_id: agendaEntry.id }, 'id=eq.' + row.id)
              .catch(function(e) { console.warn('[cookingOracle] planned_cooks.agenda_id back-link failed:', e.message); });
          }
          // H7 — same best-effort back-link pattern, the other direction:
          // a shopping list generated earlier in this session (real
          // evidence: buying happens BEFORE scheduling) now gets linked to
          // the real planned_cooks row that just landed.
          if (sess.shoppingListId) {
            RPGACE.sb.secureWrite('shopping_lists', 'update', { planned_cook_id: row.id }, 'id=eq.' + sess.shoppingListId)
              .catch(function(e) { console.warn('[cookingOracle] shopping_lists.planned_cook_id back-link failed:', e.message); });
          }
          cb(null, row.id, (agendaEntry && agendaEntry.id) || null);
        })
        .catch(function(e) { cb(e.message || 'schedule save failed'); });
    },

    // Oct 1 2026 (real Alex hand-test: "have no way of confirming cook
    // finished without agenda... scheduling clicking do now didnt make
    // cook active"). The ONE shared start path for a planned cook from
    // inside Cooking itself (hub, schedule preview) - reuses the real
    // Daily-Schedule Start (startScheduledTask: started_at write-through +
    // Live Cook Mode) whenever this device holds the local agenda copy,
    // and otherwise writes started_at directly so a cook scheduled on a
    // different device still starts for real (rule 8 - never a 2nd live
    // cook mechanism, only a 2nd entry point into the same one).
    // GM-6 (Oct 28 2026, plan "Generic Missions"): a recipe generated for a
    // Chef mission in Plan block becomes that block's planned cook - one
    // scheduled planned_cooks row linked to the block's OWN Schedule entry
    // (no second "🍳 Cook" entry, same as DN-3), its missing ingredients on a
    // grocery list (_generateShoppingList, rule 8), and chore_blocks
    // .planned_cook_id so ▶ Start cooking finds it. A re-pick on the same
    // block replaces the recipe on the existing planned cook.
    planMissionCook: function(recipeId, block) {
      var self = RPGACE.modules.cookingOracle;
      if (!recipeId || !block || !block.id) return Promise.reject(new Error('No block to plan the cook on'));
      var fields = { recipe_ids: [recipeId], status: 'scheduled', scheduled_at: block.block_date, shop_mode: 'can_shop',
        schedule: { block_id: block.id, start_time: block.start_time || null, totalMinutes: block.mins || 60 }, agenda_id: block.agenda_id || null };
      var write = block.planned_cook_id
        ? RPGACE.sb.secureWrite('planned_cooks', 'update', fields, 'id=eq.' + block.planned_cook_id).then(function() { return [{ id: block.planned_cook_id }]; })
        : RPGACE.sb.secureWrite('planned_cooks', 'insert', fields);
      return write.then(function(data) {
        var row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.id) throw new Error('planned cook save returned no row');
        return new Promise(function(res) {
          self.logic._generateShoppingList({ recipeIds: [recipeId], plannedCookId: row.id, shopMode: 'can_shop' }, function(err, listId) {
            if (err) RPGACE.utils.toast('⚠️ No grocery list made for this cook: ' + err, '#E2A83D', 3500);
            res({ pcId: row.id, listId: err ? null : listId });
          });
        });
      }).then(function(made) {
        if (block.planned_cook_id === made.pcId) return made;
        return RPGACE.sb.secureWrite('chore_blocks', 'update', { planned_cook_id: made.pcId }, 'id=eq.' + block.id)
          .then(function() { block.planned_cook_id = made.pcId; RPGACE.cache.clear('chore_blocks'); return made; });
      }).then(function(made) { RPGACE.cache.clear('planned_cooks'); RPGACE.cache.clear('shopping_lists'); return made; });
    },

    _startCookNow: function(plannedCookId, agendaId) {
      var self = RPGACE.modules.cookingOracle;
      if (!plannedCookId) { RPGACE.utils.toast('⚠️ No cook session to start', '#E2A83D', 2200); return; }
      var local = [];
      try { local = JSON.parse(localStorage.getItem('rpgace_sched_agendas') || '[]'); } catch (e) {}
      var hasLocal = agendaId && local.some(function(a) { return a.id === agendaId; });
      if (hasLocal && typeof startScheduledTask === 'function') { startScheduledTask(agendaId); return; }
      if (!agendaId) { self.ui._openLiveCookMode(plannedCookId); return; }
      RPGACE.sb.secureWrite('rpgace_agendas', 'update', { started_at: new Date().toISOString() }, 'id=eq.' + agendaId)
        .catch(function(e) { console.warn('[cookingOracle] started_at write failed:', e.message); })
        .then(function() {
          RPGACE.utils.toast('▶️ Cook started', '#4A90E2', 2000);
          self.ui._openLiveCookMode(plannedCookId);
        });
    },

    // Same real ask as _startCookNow above - the ONE shared "cook
    // finished" path, so finishing no longer depends on finding the
    // calendar entry. Marks the planned_cooks row status='cooked' (the
    // status CHECK constraint only allowed draft/scheduled until Oct 10 2026,
    // so this write was silently rejected from Oct 1 to Oct 10 - it now
    // allows draft/scheduled/cooked/discarded; check pg_constraint before
    // writing any NEW status value here), completes
    // its agenda entry through the real completeScheduledTask when this
    // device has it (actual_mins, daily log, journal note - rule 8) or a
    // direct write-through otherwise, and flips every still-'saved'
    // journal row for these recipes to cooked via the existing
    // _markCooked. The planned_cooks write is the one that must succeed;
    // the agenda/journal follow-ups are best-effort and toast on failure
    // (rule 7) rather than undoing a real finished cook.
    // ── CR-2 (Oct 14 2026, Cooking Reorganisation) — the stock loop ──────
    // Alex: "Finished cook → deducts", "Low stock → grocery list". Nothing
    // is taken out until he confirms a preview, every deduction is stored on
    // the planned cook (planned_cooks.stock_deducted) so it can be put back
    // (no Supabase backup exists), and anything that can't be converted
    // between units is listed as "not taken out", never guessed (rule 7).

    // Amount `amount` in recipe unit `fromUnit` expressed in a stock row's
    // unit, or null. Same bridges as _resolveHaveAmount (exact unit,
    // volume<->volume, weight<->weight, recipe grams estimate -> weight).
    _toStockUnit: function(amount, fromUnit, gramsEstimate, rowUnit) {
      var self = RPGACE.modules.cookingOracle, L = self.logic;
      var f = L._normalizeUnit(fromUnit), r = L._normalizeUnit(rowUnit);
      if (f === r) return amount;
      if (L.VOLUME_TO_ML[f] && L.VOLUME_TO_ML[r]) return L._convertVolumeUnits(amount, f, r);
      if (L.WEIGHT_TO_G[f] && L.WEIGHT_TO_G[r]) return amount * L.WEIGHT_TO_G[f] / L.WEIGHT_TO_G[r];
      if (!L.WEIGHT_TO_G[f] && L.WEIGHT_TO_G[r] && typeof gramsEstimate === 'number' && gramsEstimate > 0) return gramsEstimate / L.WEIGHT_TO_G[r];
      return null;
    },

    // What finishing these recipes would take out of stock. cb(err, lines);
    // a line is {ingredient_id, name, amount, unit, status:'ok'|'short'|
    // 'none'|'unconvertible', takes:[{location, unit, have, take}]}.
    _planDeduction: function(recipeIds, cb) {
      var self = RPGACE.modules.cookingOracle;
      var ids = (recipeIds || []).filter(Boolean);
      if (!ids.length) { cb('no recipes on this cook'); return; }
      RPGACE.sb.select('recipe_ingredients', 'select=ingredient_id,amount,unit,grams_estimate,ingredients(name)&recipe_id=in.(' + ids.join(',') + ')')
        .then(function(rows) {
          var groups = {};
          (rows || []).forEach(function(r) {
            if (!r.ingredient_id) return;
            var key = r.ingredient_id + '|' + self.logic._normalizeUnit(r.unit);
            if (!groups[key]) groups[key] = { ingredient_id: r.ingredient_id, name: (r.ingredients && r.ingredients.name) || '?', unit: r.unit || '', amount: 0, grams: null };
            groups[key].amount += (typeof r.amount === 'number' ? r.amount : 0);
            if (typeof r.grams_estimate === 'number') groups[key].grams = (groups[key].grams || 0) + r.grams_estimate;
          });
          var ingIds = Object.keys(groups).map(function(k) { return groups[k].ingredient_id; });
          if (!ingIds.length) { cb(null, []); return; }
          return RPGACE.sb.select('pantry_stock', 'select=ingredient_id,location,quantity,unit&ingredient_id=in.(' + ingIds.filter(function(v, i, a) { return a.indexOf(v) === i; }).join(',') + ')')
            .then(function(stock) {
              var left = {}; // shared across groups so two groups never take the same stock twice
              (stock || []).forEach(function(s) { left[s.ingredient_id + '|' + s.location] = (typeof s.quantity === 'number' ? s.quantity : 0); });
              var lines = Object.keys(groups).map(function(k) {
                var g = groups[k];
                var line = { ingredient_id: g.ingredient_id, name: g.name, amount: Math.round(g.amount * 100) / 100, unit: g.unit, status: 'none', takes: [] };
                var mine = (stock || []).filter(function(s) { return s.ingredient_id === g.ingredient_id && left[s.ingredient_id + '|' + s.location] > 0; });
                if (!mine.length || !(g.amount > 0)) return line;
                mine.sort(function(a, b) { return (self.logic._normalizeUnit(b.unit) === self.logic._normalizeUnit(g.unit)) - (self.logic._normalizeUnit(a.unit) === self.logic._normalizeUnit(g.unit)); });
                var remainingFrac = 1; // share of the recipe amount still to take
                var anyConvertible = false;
                mine.forEach(function(s) {
                  if (remainingFrac <= 0) return;
                  var need = self.logic._toStockUnit(g.amount * remainingFrac, g.unit, g.grams == null ? null : g.grams * remainingFrac, s.unit);
                  if (need == null) return;
                  anyConvertible = true;
                  var keyL = s.ingredient_id + '|' + s.location;
                  var have = left[keyL];
                  var take = Math.min(have, need);
                  if (take <= 0) return;
                  left[keyL] = have - take;
                  remainingFrac = need > 0 ? remainingFrac * (1 - take / need) : 0;
                  line.takes.push({ location: s.location, unit: s.unit, have: have, take: Math.round(take * 100) / 100 });
                });
                line.status = !anyConvertible ? 'unconvertible' : (remainingFrac > 0.001 ? 'short' : 'ok');
                return line;
              });
              cb(null, lines);
            });
        })
        .catch(function(e) { cb(e.message || 'could not work out the stock change'); });
    },

    // Takes the confirmed amounts out and records them on the cook.
    // `takes` = [{ingredient_id, name, location, unit, take}]. Re-reads each
    // row first and never goes below zero. cb(err, items) — items carry
    // `took` and `left`.
    _applyDeduction: function(plannedCookId, takes, cb) {
      var done = [];
      var step = function(i) {
        if (i >= takes.length) {
          var rec = { at: new Date().toISOString(), items: done };
          if (!plannedCookId) { RPGACE.cache && RPGACE.cache.clear && RPGACE.cache.clear('pantry_stock'); cb(null, done); return; }
          RPGACE.sb.secureWrite('planned_cooks', 'update', { stock_deducted: rec }, 'id=eq.' + plannedCookId)
            .then(function() { RPGACE.cache && RPGACE.cache.clear && RPGACE.cache.clear('pantry_stock'); cb(null, done); })
            .catch(function(e) { cb('stock updated, but the record of it did not save: ' + (e.message || 'unknown'), done); });
          return;
        }
        var t = takes[i];
        if (!(t.take > 0)) { step(i + 1); return; }
        var where = 'ingredient_id=eq.' + t.ingredient_id + '&location=eq.' + encodeURIComponent(t.location);
        RPGACE.sb.select('pantry_stock', 'select=quantity&' + where + '&limit=1')
          .then(function(rows) {
            var cur = (rows && rows[0] && typeof rows[0].quantity === 'number') ? rows[0].quantity : 0;
            var took = Math.min(cur, t.take);
            var left = Math.round((cur - took) * 100) / 100;
            return RPGACE.sb.secureWrite('pantry_stock', 'update', { quantity: left, updated_at: new Date().toISOString() }, where)
              .then(function() { done.push({ ingredient_id: t.ingredient_id, name: t.name, location: t.location, unit: t.unit, took: Math.round(took * 100) / 100, left: left }); step(i + 1); });
          })
          .catch(function(e) { cb('stopped part-way: ' + (e.message || 'stock update failed'), done); });
      };
      step(0);
    },

    // Puts a cook's recorded deduction back. cb(err, count).
    _undoDeduction: function(plannedCookId, cb) {
      var self = RPGACE.modules.cookingOracle;
      RPGACE.sb.select('planned_cooks', 'select=stock_deducted&id=eq.' + plannedCookId + '&limit=1')
        .then(function(rows) {
          var rec = rows && rows[0] && rows[0].stock_deducted;
          if (!rec || !rec.items || !rec.items.length) { cb('nothing was taken out for this cook'); return; }
          if (rec.undone_at) { cb('already put back'); return; }
          var items = rec.items;
          var step = function(i) {
            if (i >= items.length) {
              rec.undone_at = new Date().toISOString();
              RPGACE.sb.secureWrite('planned_cooks', 'update', { stock_deducted: rec }, 'id=eq.' + plannedCookId)
                .then(function() { cb(null, items.length); })
                .catch(function(e) { cb('stock put back, but the record did not update: ' + (e.message || 'unknown')); });
              return;
            }
            var it = items[i];
            if (!(it.took > 0)) { step(i + 1); return; }
            self.logic._addStock(it.ingredient_id, it.location, it.took, it.unit, function(err) {
              if (err) { cb('stopped part-way: ' + err); return; }
              step(i + 1);
            });
          };
          step(0);
        })
        .catch(function(e) { cb(e.message || 'could not read the cook'); });
    },

    // The standing top-up grocery list (shopping_lists.kind='topup'): reuses
    // the newest open one or makes it. Skips ingredients already on it and
    // not yet bought (rule 8, data dedup). cb(err, listId, added).
    _addToTopUpList: function(items, cb) {
      var getList = RPGACE.sb.select('shopping_lists', 'select=id&kind=eq.topup&status=eq.open&order=created_at.desc&limit=1')
        .then(function(rows) {
          if (rows && rows[0]) return rows[0].id;
          return RPGACE.sb.secureWrite('shopping_lists', 'insert', { planned_cook_id: null, status: 'open', shop_mode: 'can_shop', kind: 'topup' })
            .then(function(data) {
              var row = Array.isArray(data) ? data[0] : data;
              if (!row || !row.id) throw new Error('top-up list insert returned no row');
              return row.id;
            });
        });
      getList
        .then(function(listId) {
          return RPGACE.sb.select('shopping_list_items', 'select=ingredient_id&bought=eq.false&list_id=eq.' + listId)
            .then(function(existing) {
              var have = (existing || []).map(function(e) { return e.ingredient_id; });
              var fresh = (items || []).filter(function(it, i, a) {
                return it.ingredient_id && have.indexOf(it.ingredient_id) === -1 && a.findIndex(function(x) { return x.ingredient_id === it.ingredient_id; }) === i;
              });
              if (!fresh.length) return [listId, 0];
              return RPGACE.sb.secureWrite('shopping_list_items', 'insert', fresh.map(function(it) {
                return { list_id: listId, ingredient_id: it.ingredient_id, needed_amount: it.amount || null, needed_unit: it.unit || null, have_amount: 0, to_buy_amount: it.amount || null, bought: false };
              })).then(function() { return [listId, fresh.length]; });
            });
        })
        .then(function(r) { RPGACE.cache && RPGACE.cache.clear && RPGACE.cache.clear('shopping_list_items'); cb(null, r[0], r[1]); })
        .catch(function(e) { cb(e.message || 'could not add to the top-up list'); });
    },

    // CM-2 (Oct 15 2026, Alex: "I don't need to schedule something I'm
    // doing now, it should just retroactively fill my schedule"). A real
    // cook started straight from a recipe becomes a planned_cooks row
    // already 'cooked' (Chef XP via the xp_on_change trigger), a finished
    // Daily Schedule entry from Cook Mode open to Done, journal rows
    // marked cooked, and the recipe leaves any draft cook session.
    // cb(err, plannedCookId).
    // Oct 21 2026 (Alex: "grocery list won't empty need a button"): no list
    // was ever closed. ✅ Done shopping: basket items go into stock (at the
    // place each usually lives) and are marked bought; anything not found
    // moves to the open Top-up list (his answer: "Move to next list"); the
    // list is closed (status 'done'). A Top-up list itself stays open while
    // it still has items to find.
    _finishShopping: function(listId, addBasket, cb) {
      var self = RPGACE.modules.cookingOracle, L = self.logic;
      var res = { stocked: 0, skipped: [], moved: 0, closed: false };
      Promise.all([
        RPGACE.sb.select('shopping_list_items', 'select=id,ingredient_id,to_buy_amount,needed_unit,in_basket,bought,ingredients(name)&list_id=eq.' + listId),
        RPGACE.sb.select('shopping_lists', 'select=id,kind&id=eq.' + listId + '&limit=1'),
      ]).then(function(r) {
        var items = r[0] || [], kind = ((r[1] || [])[0] || {}).kind || 'cook';
        var basket = items.filter(function(i) { return i.in_basket && !i.bought; });
        var left = items.filter(function(i) { return !i.in_basket && !i.bought && (i.to_buy_amount || 0) > 0; });
        var stockOne = function(i) {
          return new Promise(function(resolve) {
            var name = (i.ingredients && i.ingredients.name) || '';
            if (!addBasket || !(i.to_buy_amount > 0)) { resolve(); return; }
            L._defaultLocation(i.ingredient_id, name, function(loc) {
              L._addStock(i.ingredient_id, loc, Number(i.to_buy_amount), i.needed_unit || null, function(err) {
                if (err) res.skipped.push(name); else res.stocked++;
                resolve();
              });
            });
          });
        };
        var chain = basket.reduce(function(pr, i) { return pr.then(function() { return stockOne(i); }); }, Promise.resolve());
        return chain.then(function() {
          var ok = basket.filter(function(i) { return res.skipped.indexOf((i.ingredients && i.ingredients.name) || '') === -1; }).map(function(i) { return i.id; });
          return ok.length ? RPGACE.sb.secureWrite('shopping_list_items', 'update', { bought: true }, 'id=in.(' + ok.join(',') + ')') : null;
        }).then(function() {
          if (kind === 'topup' || !left.length) return null;
          return new Promise(function(resolve, reject) {
            L._addToTopUpList(left.map(function(i) { return { ingredient_id: i.ingredient_id, amount: i.to_buy_amount, unit: i.needed_unit }; }), function(err, topId, n) {
              if (err) reject(new Error(err)); else { res.moved = left.length; res.topUpId = topId; resolve(); }
            });
          });
        }).then(function() {
          if (kind === 'topup' && left.length) return null;
          res.closed = true;
          return RPGACE.sb.secureWrite('shopping_lists', 'update', { status: 'done' }, 'id=eq.' + listId);
        }).then(function() {
          RPGACE.cache && RPGACE.cache.clear && (RPGACE.cache.clear('shopping_list_items'), RPGACE.cache.clear('shopping_lists'));
          cb(null, res);
        });
      }).catch(function(e) { cb((e && e.message) || 'could not finish this list'); });
    },

    _recordUnplannedCook: function(recipeIds, title, info, cb, opts) {
      opts = opts || {};
      var self = RPGACE.modules.cookingOracle;
      var ids = (recipeIds || []).filter(Boolean);
      if (!ids.length) { cb('no recipe to record'); return; }
      var start = new Date(info.startedAt || Date.now()), end = new Date(info.endedAt || Date.now());
      var mins = Math.max(1, Math.round((end - start) / 60000));
      var dateStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
      RPGACE.sb.secureWrite('planned_cooks', 'insert', {
        recipe_ids: ids, status: 'cooked', scheduled_at: dateStr,
        schedule: { live: true, started_at: start.toISOString(), ended_at: end.toISOString(), totalMinutes: mins },
      })
        .then(function(data) {
          var row = Array.isArray(data) ? data[0] : data;
          if (!row || !row.id) throw new Error('cook save returned no row');
          // DN-3: a Doing Now cook already has its Daily Schedule entry — link that one, don't add a second.
          var entry = opts.agendaId ? { id: opts.agendaId } : (typeof scheduleToCalendar === 'function' ? scheduleToCalendar({
            date: dateStr, hour: start.getHours(), minute: start.getMinutes(),
            title: '🍳 Cook: ' + (title || 'recipe'), description: 'Cooked live in Cook Mode (' + mins + ' min).',
            category: 'cooking', xp: 0, duration_mins: mins, source_type: 'planned_cook', source_id: row.id,
            completed: true, started_at: start.toISOString(), ended_at: end.toISOString(), actual_mins: mins,
          }) : null);
          if (entry && entry.id) {
            RPGACE.sb.secureWrite('planned_cooks', 'update', { agenda_id: entry.id }, 'id=eq.' + row.id)
              .catch(function(e) { console.warn('[cookingOracle] cooked agenda back-link failed:', e.message); });
          }
          if (typeof renderDailyGrid === 'function') { try { renderDailyGrid(); } catch (e) {} }
          self.logic._markJournalCooked(ids);
          self.logic._dropFromDraftSessions(ids);
          try { RPGACE.hooks.fire('cook:finished', { at: Date.now() }); } catch (e) {} // DL-4: wash-up follow-ups
          cb(null, row.id);
        })
        .catch(function(e) { cb(e.message || 'could not save the cook'); });
    },

    // Journal rows saved for these recipes are marked cooked (shared by
    // _finishCook and _recordUnplannedCook, rule 8).
    _markJournalCooked: function(ids) {
      var self = RPGACE.modules.cookingOracle;
      ids = (ids || []).filter(Boolean);
      if (!ids.length) return;
      RPGACE.sb.select('journal', 'select=id&status=eq.saved&recipe_id=in.(' + ids.join(',') + ')')
        .then(function(rows) {
          (rows || []).forEach(function(r) {
            self.logic._markCooked(r.id, function(err) {
              if (err) RPGACE.utils.toast('⚠️ Could not mark a journal recipe cooked: ' + err, '#CC4A4A', 3500);
            });
          });
        })
        .catch(function(e) { console.warn('[cookingOracle] journal lookup on finish failed:', e.message); });
    },

    // A recipe that was really cooked leaves every draft cook session
    // (Alex: "just the recipe I cooked" - the other recipes stay planned).
    // Only drafts are touched; a scheduled or cooked session never is.
    _dropFromDraftSessions: function(ids) {
      var self = RPGACE.modules.cookingOracle;
      (ids || []).filter(Boolean).forEach(function(id) {
        RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids&status=eq.draft&recipe_ids=cs.%7B' + id + '%7D')
          .then(function(rows) {
            (rows || []).forEach(function(r) {
              var next = (r.recipe_ids || []).filter(function(x) { return x !== id; });
              var write = next.length
                ? RPGACE.sb.secureWrite('planned_cooks', 'update', { recipe_ids: next }, 'id=eq.' + r.id + '&status=eq.draft')
                : RPGACE.sb.secureWrite('planned_cooks', 'update', { status: 'discarded' }, 'id=eq.' + r.id + '&status=eq.draft');
              write.then(function() {
                var sess = self._session;
                if (sess && sess.plannedCookId === r.id) {
                  sess.recipeIds = sess.recipeIds.filter(function(x) { return x !== id; });
                  sess.recipes = sess.recipes.filter(function(x) { return x.id !== id; });
                  if (!sess.recipeIds.length) self._session = null;
                }
              }).catch(function(e) { RPGACE.utils.toast('⚠️ Cooked, but could not take it out of your planned cook: ' + (e.message || 'unknown'), '#CC4A4A', 4000); });
            });
          })
          .catch(function(e) { console.warn('[cookingOracle] draft session lookup failed:', e.message); });
        var sess = self._session;
        if (sess && !sess.plannedCookId && sess.recipeIds.indexOf(id) !== -1) {
          sess.recipeIds = sess.recipeIds.filter(function(x) { return x !== id; });
          sess.recipes = sess.recipes.filter(function(x) { return x.id !== id; });
          if (!sess.recipeIds.length) self._session = null;
        }
      });
    },

    _finishCook: function(plannedCookId, agendaId, recipeIds, cb, opts) {
      var self = RPGACE.modules.cookingOracle;
      cb = cb || function() {};
      opts = opts || {};
      if (!plannedCookId) { cb('no cook session id'); return; }
      RPGACE.sb.secureWrite('planned_cooks', 'update', { status: 'cooked' }, 'id=eq.' + plannedCookId)
        .then(function() {
          if (agendaId) {
            var local = [];
            try { local = JSON.parse(localStorage.getItem('rpgace_sched_agendas') || '[]'); } catch (e) {}
            if (local.some(function(a) { return a.id === agendaId; }) && typeof completeScheduledTask === 'function') {
              completeScheduledTask(agendaId);
            } else {
              RPGACE.sb.secureWrite('rpgace_agendas', 'update', { completed: true, ended_at: new Date().toISOString() }, 'id=eq.' + agendaId)
                .catch(function(e) { RPGACE.utils.toast('⚠️ Cook marked finished, but its calendar entry did not update: ' + (e.message || 'unknown error'), '#CC4A4A', 4000); });
            }
          }
          var ids = (recipeIds || []).filter(Boolean);
          self.logic._markJournalCooked(ids);
          if (self._scheduledSession && self._scheduledSession.plannedCookId === plannedCookId) self._scheduledSession = null;
          try { RPGACE.hooks.fire('cook:finished', { at: Date.now() }); } catch (e) {} // DL-4: wash-up follow-ups
          cb(null);
          // CR-2 — every finish path (hub, Live Cook, My Day cooking block,
          // Daily Schedule Done) lands here, so the stock preview is offered
          // from one place. After cb so the caller's own popup closes first.
          if (!opts.skipStock) setTimeout(function() { self.ui._offerStockUpdate(plannedCookId, ids, { instant: !!opts.instant }); }, 0);
        })
        .catch(function(e) { cb(e.message || 'could not mark cook finished'); });
    },

  },

  // Thin top-level pass-throughs — openMain is called directly as
  // m.ui.openMain from the dashDeck card and markRecipeCooked calls
  // m.logic._markCooked directly, so neither needs one. H15 (Sep 16 2026)
  // adds the first two real ones: oracleAppGrounding's window.callOracle
  // wrap reaches these as a bare `RPGACE.modules.cookingOracle.X(...)` —
  // the same cross-module guarded-call shape oracleControl's own
  // matchesAnyTrigger/buildActionsBlock/buildSuggestBlock/
  // buildRecentErrorsBlock already use there, so this module needs the
  // exact same real top-level surface, not `.logic.X`.
  matchesRecipeGenTrigger: function(lowerText) { return this.logic.matchesRecipeGenTrigger(lowerText); },
  buildRecipeGenBlock: function() { return this.logic.buildRecipeGenBlock(); },

});
/* ===END:cookingOracle=== */
