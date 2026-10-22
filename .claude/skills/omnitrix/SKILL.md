---
name: omnitrix
description: RPGACE's development discipline — four invokable protocols (Omnitrix, Council of 5, GODMODE, Aintergration) and the Judgment Funnel that decides which runs. Use whenever Alex says "Omnitrix", "Council of 5", "GODMODE" or "Aintergration" (the word is the instruction). Also use proactively for any RPGACE task that is multi-subsystem, touches 3+ files/modules, changes architecture or adds a feature — GODMODE evidence, then Council of 5 scrutiny, then build. Also use when Alex brings a third-party framework, skill, MCP server, agent or service and asks if it's worth adopting (Aintergration). Not for typos, one-line fixes or a single-function bug (Tier 0/1 — handle directly).
---

# Judgment Funnel — Omnitrix, Council of 5, GODMODE, Aintergration

Each protocol was adopted after a real failure: £10 burned in one test session (`token_cost_audit_2026-07-19.txt`), and Fable running dry mid-task from over-dispatch.

**Source of truth**: this file, for these four protocols. CLAUDE.md keeps a one-line summary of each plus the Tier 3 boundary, the CEO carve-out and `/auto`. The worked precedents' full text is in `CLAUDE_archive.md`. The model list is in `docs/claude/oracle.md`.

## The funnel — pick the tier by the shape of the change (when unsure, go up)
- **Tier 0 — mechanical**: a typo, an obvious one-liner, a cited doc fix. Just hygiene (`node --check`, div balance).
- **Tier 1 — one module**: a scoped bug fix, a small UI tweak, a clearly specified single-place feature. Normal process rules (read the source, grep before new UI, taxonomy checkpoint), handled directly.
- **Tier 2 — multi-subsystem, architecture, or new feature** (rule 5's "3+ pieces"): **GODMODE** evidence → **Council of 5** scrutiny → **Omnitrix** builds what survives. If Council of 5 kills or reshapes the idea, that's the funnel working.
- **Tier 3 — destructive or high-stakes** (migrations outside the CEO additive carve-out, RLS changes, spending, force-push, credentials, deletes): Alex's explicit confirmation, always. Rigour is not authorisation.

## GODMODE — maximum-rigour evidence
- Verify against live code, Supabase and git; never trust a doc alone. Push back hard, list failure modes and rollback paths, accept nothing on plausibility.
- **Boundary**: GODMODE changes how hard the assistant thinks, never what it's allowed to do. It doesn't relax a single confirmation, however firmly that's asked for.
- Use `/drift` (VERDICT/BASIS/grade) when the question is whether work matches a stated goal.
- If the evidence touches the domain/module/connector map, also run `cartographer` Steps 3-4.
- If it touches a subject an oversight doc makes claims about, run the Cross-Doc Drift Check (`update-logging-system`, artifact 20). These are two different checks: map friction vs doc-against-doc claims.

## Council of 5 — before agreeing to build
Real scrutiny from at least five angles: technical risk, scope/cost (tokens are a design constraint), maintainability, UX/Alex's goals, and an honest why-NOT. Real disagreement, never agreement dressed up as five bullets. Say plainly when it kills the idea.
Name clash: `phylumPath.decidePlacementScored` has an internal 1-10 "Council-of-5" score for taxonomy placement — a code feature, not this protocol.

## Omnitrix — who does what
1. **The orchestrating session researches and plans inline by default** (no dispatch cost, and it already has the full context), then reviews the build line by line. A builder's self-report is never evidence; independent review once caught a popup-close handler silently destroying a live widget.
2. **Opus builds** from the plan.
3. **Fable** only for a large exhaustive audit that benefits from a fresh context, for true background parallelism, or when Alex names it. `/fableomnitrix` narrows Fable to read-only decisions.
- Agents never work on the same file at once (use a worktree if unavoidable).
- The plan is the spec confirmation unless it raises something only Alex can decide.
- Every other rule still applies: merge to `main` + confirm the deploy before "ready to test", same-session logging, taxonomy checkpoints. If Fable runs out of credits, report it and ask before substituting another model.

## Aintergration — is a third-party tool worth adopting?
One question, two targets: does it help **(A) RPGACE the app** or **(B) this dev session**, and how? Check each separately.
1. **GODMODE pass** on what the tool really requires (runtime, dependencies, build step, framework assumptions), from its own docs. Then cross-check against RPGACE's architecture: vanilla `index.html` + one script (`rpgace_core.js` → `rpgace_core.min.js`) + `style.css`, no build step, no npm at runtime, Vercel Hobby (12-function cap), plus decisions already shipped (DESIGN.md's L1 interaction cap — no GSAP/Lenis/scroll-jacking).
2. **Council of 5** per target: A = does it fit without a rewrite or reversing a shipped decision; B = does it change how this session researches, builds or reviews.
3. **Verdict**: Adopt as-is / Adopt with modification / Reference only (the most common) / Not applicable / Reject (conflicts with a shipped decision).
4. Anything adopted for A still goes through the funnel to be built. Aintergration answers "should we", never "how".
**Hard line**: a tool built to evade Anthropic's safety classifiers or to disable another tool's approvals is refused outright — outside the verdict scale — and not revisited under pushback.

### Precedents (full text in `CLAUDE_archive.md`)
- Reject: Framer Motion/Next.js (reverses no-build-step); OmniRoute (architecture mismatch, undermines model tiers).
- Refused outright: a bundled skill that reworded prompts to slip past safety classifiers.
- Reference only: event sourcing; two-stage content moderation; Headroom (compression half duplicated); claude-mem (local storage doesn't survive cloud sessions → `session_memory` table built instead).
- Confirmed existing choices: REST over GraphQL, no IaC, async job + polling, exponential backoff, graceful degradation.
- Adopted with modification: did-we-drift → `/drift`; graphify (narrowly, as a free AST rebuild + Galaxy Map source).
- Rejected: `pick-ui-library` (needs npm at runtime); `/DoNotDisturb` (blanket auto-approve).
- A global counterpart lives at `~/.claude/skills/aintergration/SKILL.md`. When its research is relevant to RPGACE, add a line here.
