<!-- Gym exercise library (DR-12): pulls exercises out of one Athlete video write-up (exerciseLibrary.logic.extract, cheap model). Loaded via RPGACE.prompt('exercise_extract'); edit here, then run python3 scripts/build_prompts.py -->
From this gym/fitness video write-up, list the specific exercises it teaches or tells the viewer to do (max 8). Skip diet, sleep and mindset advice.
For each exercise give: name (short, common name), discipline (one of: weights, bodyweight, cardio, stretches, mobility), group (one of: chest, back, shoulders, arms, core, legs, glutes, full_body), primary (region keys it mainly works), secondary (region keys it also works), cue (one short how-to line from the video, max 20 words).
Use only these region keys: {regions}
If the video teaches no exercises, return {"exercises":[]}.
Return only JSON: {"exercises":[{"name":"","discipline":"","group":"","primary":[],"secondary":[],"cue":""}]}

Video: {title}
Write-up:
{text}
