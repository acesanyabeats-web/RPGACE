# Habits domain — Cooking, Health & body, Gym, Wishlist, Money, Daily life

Read before touching any `domain: 'habits'` module. Present tense, one fact per line. Stories: `patch_notes.html` cards linked here; old narrative in `CLAUDE_archive.md`. Untested by Alex's own hand across most of this domain.

Modules (`domain: 'habits'`, 8): `moneyHub`, `softwareList`, `cookingOracle`, `shoppingWishlist`, `gymTracker`, `healthBody`, `dailyLife`, `exerciseLibrary`.

## Cooking → [`cooking.md`](cooking.md)
- Recipes, generate, stock and shopping lists, Cook Mode, planned cooks, My Recipes (`cookingOracle`). All facts live in the sub-file.

## Health & body, Gym → [`health_gym.md`](health_gym.md)
- Food/body logs, gym programme and log, exercise library (`healthBody`, `gymTracker`, `exerciseLibrary`). All facts live in the sub-file.

## Shopping Wishlist (`shoppingWishlist`)
- General future purchases, separate from Cooking's `shopping_lists`. Tables `wishlist_items`, `wishlist_config` (`budget_target`, row id 1), in `ALLOWED_TABLES`.
- `logic._computeBudgetFit`: greedy priority-first fill, cheapest tiebreak; unaffordable skipped, unpriced shown but excluded.
- Marking bought asks the price paid and writes a `chronicles_finance` expense (category Personal). Cool-off: bought after 24h gives +30 XP. `decisionJournal` sits alongside (G1). [G1](../../patch_notes.html#card-2026-10-10-money-guardrails)

## Money and daily life
- `moneyHub`: the Money page (Hustler + Steward realms), built in Selling SH-5b; selling detail is in `content.md`. [story](../../patch_notes.html#card-2026-10-17-selling-home)
- `softwareList` (WR-11, Nov 3 2026): 🧰 My software, opened from the Money page and the side menu. Private table `software_inventory` (name, category, vendor, download link, install order, C/E drive, licence = Bitwarden entry name, price, date, status to_review/owned/not_needed, installed_at). 🔎 Scan searches Gmail by keywords through Composio (`RPGACE.api(tool, params, account)`; `gmail`, or `gmail2` once `COMPOSIO_GMAIL2_ID` is set in Vercel). New emails are read in batches of 10 with the mechanical model, and only software purchases are saved, as 'to_review'. Emails already read are remembered on the phone (`sw_checked_<account>`). Owned items form the install checklist (task cards, tick = installed) and the total spent. [story](../../patch_notes.html#card-2026-11-03-software-list)
- `dailyLife` (D1): fridge photo → stock via shared `cookingOracle.logic._upsertStock`, watchlist digest, own-words brief, quests+cooks in Chronicles. [D1](../../patch_notes.html#card-2026-10-10-daily-life)

## Side list declutter (SL-3, Oct 27)
- Health & body Today: one ⚡ Quick log row (`#hb-quick`): 💧 +1 glass (body_log), ⚖️ Weight and 😴 Sleep (each opens its own row), 🚬 / ☕ from My Day's cut-back items matched by name (`healthBody.ui.cutTiles` → `myDay.logic.cutSet`, cutback_log; no second store). Calorie + protein targets are set on the 🎯 Targets tab only. [story](../../patch_notes.html#card-2026-10-27-side-list-domains)
- Wishlist: add form folded behind ➕ Add an item (`RPGACE.sideList.foldForm`); budget setting (`#wl-budget-row`) and the Money link live in the › side list (`pop.overlay._sideExtras`); the "what fits" line stays.
- `RPGACE.sideList.foldForm` also parks an element's inline `display`, so flex/grid rows really hide.
