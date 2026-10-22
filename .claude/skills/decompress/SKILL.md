---
name: decompress
description: A standing performance checklist — 5 patterns (compress in transit, batch writes, circuit-break slow dependencies, optimistic UI, cache rendered fragments) plus RPGACE's own load-time audit method. Run it whenever building or restructuring anything that talks to the network or makes a user wait (a standing step inside /Engineer Stage 3, so also /paranoia and /CEO Loop 2), and whenever Alex says "/decompress" or asks to audit or improve load times.
---

# /decompress — performance discipline

Alex, Aug 10-11 2026, verbatim: "the load times are just atrocious: 25,000ms... package these as a new skill... wire `/decompress` into `/engineer` and every `/engineer`-family skill as a standing step when building anything new or restructuring anything old."

## The 5 patterns (Alex's own prompts)
1. **Compress API responses in transit** — gzip/brotli, Accept-Encoding negotiation, never double-compress. Vercel already compresses static and function responses.
2. **Batch inserts/updates** — bulk or batched writes in a transaction, chunked for large batches.
3. **Circuit-break slow external dependencies** — timeouts, fast-fail or fallback, concurrency limits.
4. **Optimistic UI** — update at once, reconcile with the server, roll back cleanly on failure.
5. **Cache rendered pages/fragments** — cache what's the same for every user, regenerate on change, keep personal regions dynamic.
Most changes trigger few of these. Say "n/a" plainly rather than forcing a fit; when one applies, apply it.

## What's already in place
- **One script**: `rpgace_core.min.js` (made by `node scripts/minify_client.js` with terser `compress:true, mangle:false`). Mangle stays off for good: `index.html`'s inline `onclick="fnName()"` handlers can't be seen by a per-file minifier. Re-minify and bump `?v=` in the same commit as any source change.
- `vercel.json` sends 1-year immutable `Cache-Control` on versioned assets (`rpgace_core.min.js`, `style.css?v=`, `icons/*`). `style.css` has a `?v=` for exactly this reason.
- Google Fonts preconnect.
- Boot: `RPGACE.registerBootTask` gates module start behind the boot loader.
- `perfWatch` records real freezes to `perf_freezes` (phone-speed profile: ~690ms script load + ~290ms module start; boot-phase blocks don't alert).

## Audit method
Whenever Alex asks, re-measure fresh — never quote old numbers:
- raw and gzip sizes of the shipped script and CSS;
- load order and blocking;
- cache headers;
- the boot-task count and delays;
- recent `perf_freezes` rows.
Live Lighthouse/PageSpeed can't run from this session (PageSpeed quota 0, the proxy blocks the site); Alex can run it in Chrome DevTools or pagespeed.web.dev, so hand him the step with what to look for.

## Guardrails
- Never re-enable mangle.
- A pattern that doesn't apply isn't a finding.
- The boot-task stagger is a real UX/architecture question; change it only on purpose.
