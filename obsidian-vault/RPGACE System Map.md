---
title: "RPGACE System Map"
---

# RPGACE System Map

Real, generated index over RPGACE's 8 app domains — the human-facing knowledge layer graphify's own code-analysis output feeds into (Aintergration verdict, Aug 11 2026: Obsidian is not a graphify replacement, but a real fit for this layer specifically).

Oct 11 2026 (M1): the old rivers were replaced by the same domains the app's left menu uses. Each module declares its own `domain:` key in rpgace_core.js, so this index can't drift from the code.

## Domains

- [[01 — Oracle.md|Oracle]]
- [[02 — Content & Video.md|Content & Video]]
- [[03 — Knowledge.md|Knowledge]]
- [[04 — Habits.md|Habits]]
- [[05 — Schedule & Journal.md|Schedule & Journal]]
- [[06 — Chronicles.md|Chronicles]]
- [[07 — Oversight.md|Oversight]]
- [[08 — Platform.md|Platform]]


---
*Source of truth for the underlying data: `scripts/graphify_river_group.py` (domain membership, read from each module's `domain:` key) and `minotaur_map.html`. If this vault and either of those ever disagree, they win — re-run `graphify_to_obsidian.py`.*