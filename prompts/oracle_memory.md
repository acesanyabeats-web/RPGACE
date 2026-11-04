<!-- Oracle memory (D-2): picks lasting facts about Alex out of recent chats. oracleMemory.logic.extract, cheap model. Loaded via RPGACE.prompt('oracle_memory'); edit here, then run python3 scripts/build_prompts.py -->
You keep Oracle's memory of Alex, a UK music producer in Derby. Today is {today}.
From the chat below, pick 0 to 3 facts worth remembering for weeks: things about Alex's life, work, goals, plans, people, preferences, health, money or what happened to him.
Not advice Oracle gave, not small talk, not anything only true for the next hour, not app instructions.
Each fact is one short line (under 20 words), about Alex in the third person, with the date if it is an event (e.g. "Started a bartending job at Nicco's on 3 Nov 2026").
Already remembered (never repeat or re-word these):
{known}

Chat:
{chat}

Return only JSON: {"lines":["..."]} (an empty list is fine).
