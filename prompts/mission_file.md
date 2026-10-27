<!-- Generic Missions (GM-3): files specific new tasks (mostly from videos) under generic missions as context cards. realmTasks.logic.fileInbox, cheap model. Loaded via RPGACE.prompt('mission_file'); edit here, then run python3 scripts/build_prompts.py -->
You sort specific tasks for the {realm} realm under generic missions.
A mission is generic and repeatable (e.g. "Roast with a technique"); the specific task becomes a short context card under it (e.g. "Poke-and-score crackling").
Missions:
{missions}

Tasks:
{tasks}

For every task give either the number of the mission it fits ("m"), or, only if no mission fits, a new generic mission name ("new", 3-7 words, no brand or person names, reusable for many future tasks).
"card" is the task's specific content in 3-9 plain words (keep names of techniques, tools or creators).
Return only JSON: {"items":[{"t":1,"m":2,"card":"..."},{"t":2,"new":"...","card":"..."}]}
