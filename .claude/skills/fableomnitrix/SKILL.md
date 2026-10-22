---
name: fableomnitrix
description: A narrower Omnitrix where Fable has one job — read-only decisions and verdicts at real judgment points — and never builds, edits or commits. Normal Omnitrix (the session orchestrates inline, Opus builds) runs with zero Fable cost until a real Tier 2+ decision or a success/failure verdict is needed; then the session hands Fable an evidence dossier (current state, Alex's relevant past and present prompts, /interrogation answers on record). Fable reads it, runs /drift (and /paranoia where the decision earns it), may use any project or global skill for read-only evidence, and returns ONLY a written report — decision with reasoning, verdict, and what to build/rework/remove/rewire next. The session and Opus then execute it. Use when Alex says "/fableomnitrix" or "fable omnitrix", or wants Fable used purely as a thinking layer. Not for Tier 0/1 work or general research.
---

# /fableomnitrix — Fable as a read-only decision layer

Alex, Sep 24 2026, verbatim:
> "whenever i run /omnitrix with fable (lets call it /fableomnitrix) - the pro subscription plan does everything as normal, no fable or usage credits are used, until a decision by ai has to be made. once a decision is reached, the pro plan stops, hands evidence as report of all context to fable, for fable to read-only, make decisions with /drift to my /interrogation answers and ask in relevant past and present prompts to make my choices work, itll then only write a report (never build) on what should be built, thought through more, changed and removed, reworked or rewired to make this as efficient as possible. I essentially only want fable to read given reports for context and decisions that needs to be made... fable should also use to decide whether an ask is successful via /drift and /paranoia. all global custom skills i have in skills.md and claude.md are used at any stage if fable deems it necessary for evidence gathering. i want fable only to think, period, nothing else."

Spec record: `records/2026-09/fableomnitrix_protocol_spec_2026-09-24.txt`. The base workflow and Judgment Funnel are in the `omnitrix` skill; Fable runs the `drift`, `paranoia` and `interrogation` procedures as written there.

## Procedure
1. **Normal Omnitrix** — the session plans and reviews, Opus builds. No Fable.
2. **Trigger** — either (a) a real Tier 2+ fork (choices that change scope, schema or UX), or (b) finished work needs a success/failure verdict.
3. **Dossier** (written by the session, never by Fable), with fixed sections:
   1. Current state, with file:line / query citations.
   2. The fork or ask, stated plainly.
   3. Alex's relevant past and present prompts (this conversation + `session_memory`).
   4. `/interrogation` answers already on record — never re-litigated.
   5. What's already decided.
   6. What Fable must decide.
   **A MATERIAL finding needs a citation checked in this pass against live state; another doc's claim isn't enough.** A dossier once cited a stale "dead code" claim about `runVideoWorkshop` relayed for 7 weeks; Fable had to re-derive it. A relayed claim is fine for MINOR.
4. **Dispatch** — one Agent call: `subagent_type: "fable-readonly"` (`.claude/agents/fable-readonly.md`: no Edit/Write/NotebookEdit), `model: "fable"`. It resolves when the agent list at session start includes it; otherwise fall back to `subagent_type: "Plan"`. Either way, the prompt says every time: *"You are strictly read-only. Do not create, edit, move, delete or commit any file, and do not run any command that changes repository or Supabase state. Your only output is the text report you return."* (Bash is still available, so this is a convention, not a sandbox.)
5. **Fable**:
   - Reads the dossier and pulls more read-only evidence only if needed, using any skill it judges worth the cost.
   - Runs `/drift` against the pinned baseline.
   - Runs `/paranoia` only for a big decision; plain `/drift` + scrutiny for a small fork.
   - For trigger (b), says SUCCESS or NOT-SUCCESS with evidence.
   - Writes ONE report: decision + reasoning, verdict, and what to build, think through, change, remove, rework or rewire. Never a diff or a commit.
6. **Resume** — the session treats the report as evidence, not a rubber stamp. Anything only Alex can decide (Tier 3, remaining ambiguity) goes to him; the rest goes back into Omnitrix.

## With /CEO and /Engineer
Under an active `/CEO` plan, Fable's verdict is evidence for `/Engineer` Stage 5, never a substitute for it (rule 17). Outside a plan, Fable's verdict is the completion gate. `/CEOfable` (a mode in the `CEO` skill) routes plan decisions through this skill.

## Cost discipline
Fable is dispatched only at Step 2's trigger — never as a researcher, never "just in case". Audits and research stay with the session even under this skill. Alex wants his limited Fable allowance spent on judgment calls. If there's no real fork, there's no dispatch.

## Guardrails
- State the read-only rule in every dispatch.
- Code in a Fable report is illustrative; the builder re-derives it.
- Tier 3 still needs Alex's explicit go, however confident Fable is.
- If Fable runs out of credits, report it and ask before substituting another model.
