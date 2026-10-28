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
