<!-- YouTube-backed recipe (YR, Nov 5 2026): Gemini watches one cooking video and writes the recipe exactly as the video makes it. videoRecipe.logic.recipeFrom via /api/search type video-read. Loaded via RPGACE.prompt('video_recipe'); edit here, then run python3 scripts/build_prompts.py -->
Watch this whole cooking video and write the recipe exactly as the video makes it - every ingredient, amount and step the creator uses, in their order, including small steps like toasting, resting or soaking. Do not add or improve anything that is not in the video.
Alex asked for: {request}
Scale it to {servings} servings (say the video's own servings in "video_servings").

{rules}

Extra fields:
- every step: "video_at" = the second in the video where that step starts (a number), and "tip" = the creator's own tip or reason for that step if they give one (e.g. "toasting brings out the nutty flavour"), else "".
- top level: "creator" (channel or cook's name), "video_title", "video_servings", "tips" (up to 5 of the creator's best general tips, short), "not_shown" (amounts or steps the video does not show, so the app can ask Alex - [] if none).
If an amount is not said or shown, give your best estimate and name it in "not_shown".

Return only the JSON object.
