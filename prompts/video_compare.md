<!-- YouTube check of a saved recipe (YR, Nov 5 2026): Gemini watches the video and lists what the saved recipe misses or gets wrong, in the recipe chat's change shape. videoRecipe.logic.compare via /api/search type video-read. Loaded via RPGACE.prompt('video_compare'); edit here, then run python3 scripts/build_prompts.py -->
Watch this whole cooking video. Below is Alex's saved recipe for the same dish. Find everything the saved recipe misses or gets wrong compared with how the video makes it: missing or extra ingredients, different amounts, missing steps (e.g. toasting, resting, soaking), wrong order, wrong times or temperatures.

Saved recipe: {title}
Ingredients (name | amount | unit):
{ingredients}
Steps (order: what to do):
{steps}

Rules:
- reply: 1-3 short plain sentences saying what the video does differently (or that it matches).
- ingredients: the FULL ingredient list after the fixes (every ingredient, changed or not), or [] if no ingredient changes.
- step_edits: steps whose words must change, with the full new text; a step the video has and the recipe lacks is {"order":N,"description":"...","new":true} (goes in at position N). Add "video_at" (second in the video) and "tip" (the creator's reason, or "") to every step edit.
- changes: 1-6 short plain lines, each naming the moment in the video as m:ss.

Return only JSON: {"reply":"","ingredients":[{"name":"","amount":0,"unit":""}],"step_edits":[{"order":1,"description":"","new":false,"video_at":0,"tip":""}],"changes":[""]}
