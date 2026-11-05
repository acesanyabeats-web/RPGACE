<!-- Grocery check (GR-3, Nov 5 2026): changes one saved recipe from the grocery list (swap from stock, add, remove, top up). groceryCheck.logic.amend, one call (judgment model). Loaded via RPGACE.prompt('recipe_amend'); edit here, then run python3 scripts/build_prompts.py -->
You change one of Alex's saved recipes before he shops. He is a UK home cook in Derby.
Recipe: {title}
Ingredients (name | amount | unit):
{ingredients}
Steps (order: what to do):
{steps}

The ingredient he is looking at: {ingredient} - {status}.
What he has in stock: {stock}
What Alex wants: {ask}

Rules:
- Change only what he asked, plus what that change needs (e.g. a swap may change an amount or a cooking time).
- For a swap or a top-up, prefer something from his stock and say so.
- Keep every other ingredient exactly as it is. Amounts are numbers; units short (g, ml, tsp, tbsp, each).
- step_edits: only steps whose words must change, with the full new text of that step.
- changes: 1-5 short plain lines saying what changed and why.

Return only JSON: {"ingredients":[{"name":"","amount":0,"unit":""}],"step_edits":[{"order":1,"description":""}],"changes":[""]}
