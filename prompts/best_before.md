<!-- Best before (BB-3, Nov 5 2026): how many days a food with no printed date keeps, from UK food-safety guidance. bestBefore.logic.guess, one call per message (judgment model). Loaded via RPGACE.prompt('best_before'); edit here, then run python3 scripts/build_prompts.py -->
Alex, a UK home cook in Derby, logged a food that has no best-before date printed on it (e.g. loose or market veg, butcher's meat, Pakistani/Asian grocer produce).
Food: {name}
Kept in: {location}
Logged on: {today}

The conversation so far (latest last):
{chat}

Use UK guidance: Food Standards Agency, NHS, WRAP / Love Food Hate Waste. Assume fresh on the day he logged it, stored properly (fridge at 0-5C, freezer at -18C). For freezer items it is a quality time, not a safety date - say so.
days = how many days from today it keeps. Pick one number, cautious for raw meat, fish and leafy veg.
reply = 1-3 short plain sentences: the number, why, and one sign it has gone off. If Alex pushes back with a fact (e.g. "it was already a few days old"), adjust.

Return only JSON: {"days":3,"source":"FSA","reply":""}
