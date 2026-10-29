# Shared kit — sub-file of the platform hub (`docs/claude/platform.md`)
Present tense, one fact per line. Plan "Caps and Central Kit" CK-6/CK-7 ([story](../../patch_notes.html#card-2026-10-28-ck6-kit)).

## RPGACE.kit (module `kit`, domain `platform`)
- One copy of each small helper; any module calls `RPGACE.kit.<name>()`. Old private copies switch over when their module is next touched.
- `esc(s)` — HTML-escape for innerHTML (& < > " '); the one implementation is `RPGACE.utils.escapeHtml`.
- `iso(d)`, `today()`, `addDays(isoDay, n)` — local YYYY-MM-DD, never UTC-shifted; `fmt(isoDay, {long})` — en-GB display.
- `readPrivate(table, params)` — RLS-private tables via `/api/data-write` action `read` after sign-in (`PRIVATE_READ_TABLES`); `[]` when signed out.
- `btn(label, kind)` — 44px thumb button, `'primary'` gold fill or outline.
- `armConfirm(btn, onConfirm, armedLabel)` — two-tap destructive confirm, 3s timeout (Building guide 8).
- `pickList(host, items, onPick, {id, itemClass, empty, max})` — searchable list (search box past 6 items); `opts.id` gives `<id>-q` / `<id>-list`.
- Switched over (Oct 28): `myDay`, `doingNow`, `tripPlans` `_btn`; `tripPlans.logic.read`; `healthBody._arm`; the GM-7 source picker in `myDay.ui.pickContext`.
- `scripts/check_kit_copies.py` counts private copies left (esc, btn, iso, addDays, arm, data-write reads) and fails when a count rises above its BASELINE; lower the baseline in the same commit that switches a module over.

## One Oracle call path (CK-7)
- `RPGACE.kit.ask(prompt, {max, model, json, context})` is the door for one-shot calls; it runs `phylumPath.logic._callGroundWorkerText/_callGroundWorkerJSON` (credit-out fallback queueing via `context`). First user: `morningBrief.logic.writeNow`.
- Chat replies use `callOracle()` (global; external-provider, streaming and plain branches). Images use `RPGACE.utils.oracleVision`. Professor answers use `oracleProfessor` (streaming, Opus with model fallback). Nutrition uses `/api/oracle` action `nutrition-lookup` (`cookingOracle._lookupNutrition`).
- Still a separate raw fetch (switch when touched): the chat image upload (global, near `isRotaUpload`, should use `utils.oracleVision`).
- Any new one-shot Oracle call uses `RPGACE.kit.ask`, never a new `fetch('/api/oracle')`.

## Mission source registry (CK-7)
- `realmTasks.logic.CONTEXT_SOURCES` is the realm-generic list of "pick from your own data" sources for a mission's context (GM-7): `combo` (exerciseLibrary), `reference` (reference_tracks + beat ideas), `post` (Idea Bank post ideas).
- A new source = one entry there (`label`, `empty`) + one branch in `realmTasks.logic.sourceItems(kind)` returning `[{title, sub, detail, ref}]`; the picker (`RPGACE.kit.pickList`) needs no change. A mission card picks it with `context_kind`.
- `RPGACE.kit.taskCard(o)` (TK-1, Oct 29 2026): THE task card for every task (Actions/routines, block steps, Live now, planning; Alex: "everything is task"). Big circle + gold ✓ Done + tools, faded when done/skipped; `o.onTick(nowDone)` returns a Promise and `o.after(el)` redraws in place; modes `do` / `plan` (no tick) / `view`. `myDay.ui.row` is built on it.
