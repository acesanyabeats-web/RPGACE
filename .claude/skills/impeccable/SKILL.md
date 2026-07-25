---
name: impeccable
description: Runs Impeccable's free design-pattern detector (npx impeccable detect) against RPGACE's index.html/style.css and reports the findings — the same scan already wired into CI as an advisory step. Use whenever Alex says "/impeccable" or asks for a quick design-quality/anti-pattern check. Also invoked as a sub-step by Bedtime and Summary, which additionally log a result row to Supabase's system_updates table (category "design-scan") so RPGACE's own Oracle can surface it via oracleAppGrounding's live facts.
---

# /impeccable — design-pattern scan, standalone or as a Bedtime/Summary sub-step

Wraps `pbakaus/impeccable`'s free CLI scanner, adopted July 25 (see CLAUDE.md's Aintergration entry). **Scope is deliberately narrower than Impeccable's own full offering**: its own installer (`npx impeccable install`) downloads a persistent hook + a 23-command apparatus from Impeccable's own server — that install was checked July 25 and failed with a real HTTP 403 from Impeccable's own download endpoint in this environment (confirmed not a proxy issue). Until that resolves, this skill wraps only the free `detect` command that already works and is already in CI — do not attempt the full `install`/`link`/`update` flow as part of this skill; if a future session finds the installer working, that's a real, separate decision to revisit scope, not something to silently expand into.

## Standalone use ("/impeccable")

1. Run `npx --yes impeccable detect index.html style.css` from the repo root (the same invocation `.github/workflows/deploy.yml`'s advisory CI step uses — don't invent a different one).
2. Report the finding count and the top few by severity directly in chat, in enough detail that Alex can paste the summary into a future prompt if he wants to reference current design state ("inject the ai system into my prompts easier," his own framing for why this exists as a skill rather than a raw CLI command he has to remember).
3. This is read-only — it never edits code itself. If a finding is worth fixing, that's a separate `/improve-animations` or direct-edit task.

## As a Bedtime/Summary sub-step

Both `.claude/skills/Bedtime/SKILL.md` and `.claude/skills/Summary/SKILL.md` call this skill during their evidence-gathering step. When invoked that way:

1. Run the same scan as above.
2. If the finding count or top findings have changed since the last logged scan (check `system_updates` for the most recent `category='design-scan'` row before writing a new one — don't log a duplicate row for an unchanged result), insert a new `system_updates` row: `title` = a short "Design scan: N findings" line, `summary` = the real top 3-5 findings by severity, `category` = `'design-scan'`.
3. This is the ONLY path that writes to `system_updates` from this skill — a bare standalone `/impeccable` invocation never writes anything, it only reports to chat.

## Why this feeds Oracle, not just Claude Code

`oracleAppGrounding` (rpgace_core.js) already grounds RPGACE's in-app Oracle in live Supabase facts (module count, pending taxonomy reviews). It now also pulls the most recent `system_updates` rows — including any `design-scan` row this skill writes — into its LIVE FACTS block, so Oracle can mention real, current design-quality state and recent Claude Code activity when a user's message is grounding-relevant. See `oracleAppGrounding._refreshLiveFacts`/`_liveFactsLine` in `rpgace_core.js` for the exact mechanism; this skill's only job is producing the row for it to read, never writing to Oracle's code or prompt directly.
