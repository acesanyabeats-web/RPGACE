<!-- Use soon ideas (BB-6, Nov 5 2026): what to cook to use up food close to its best-before. bestBefore.logic.ideas, one call (judgment model). Loaded via RPGACE.prompt('use_soon'); edit here, then run python3 scripts/build_prompts.py -->
Alex, a UK home cook in Derby, wants to waste less food. These need using soon (name - days left):
{soon}

His saved recipes (title: main ingredients):
{recipes}

Other things in stock: {stock}

Give 2-4 ideas that use as many of the use-soon foods as possible, soonest first. Prefer his saved recipes (say which); otherwise a simple dish from what he has. Also say anything that can be frozen today to save it.
Return only JSON: {"ideas":[{"title":"","uses":["..."],"recipe_id":"","why":""}],"freeze":["..."]}
