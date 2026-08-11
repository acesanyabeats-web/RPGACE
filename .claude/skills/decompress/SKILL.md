---
name: decompress
description: A standing performance-discipline skill — 5 real optimization patterns (compress-in-transit, batch writes, circuit-break slow dependencies, optimistic UI, cache rendered fragments) plus RPGACE's own quantified load-time audit. Run this whenever building/restructuring anything network-facing or user-waiting, as a standing step inside /Engineer and every /Engineer-family skill (/paranoia, /CEO Loop 2), and whenever Alex asks to "run /decompress" or audit/improve load times.
---

# /decompress — performance discipline, not a one-time fix

Named and defined by Alex Aug 10-11 2026 (A1 of the massive-expansion spec),
verbatim: "the load times are just atrocious: 25,000ms... package these as a
new skill... wire `/decompress` into `/engineer` and every `/engineer`-family
skill as a standing step when building anything new or restructuring
anything old." This is a standing DISCIPLINE — a checklist to run every time
something new touches the network or makes a user wait — not a single PR
that gets marked "done" once.

## The 5 patterns (Alex's own verbatim prompts, kept exactly as given)

1. **Compress API responses in transit** — gzip/brotli, Accept-Encoding
   negotiation, avoid double-compressing already-compressed payloads.
2. **Batch inserts/updates** — replace per-row loops with bulk/batched
   writes in a transaction, chunked for large batches.
3. **Circuit breaker for slow external dependencies** — trip on
   failure/slowness, fast-fail or fallback, timeouts + concurrency limits.
4. **Optimistic UI updates** — update immediately, reconcile with server
   result, roll back cleanly on failure.
5. **Cache rendered pages/fragments** — cache identical-across-users
   output, regenerate on schedule/change, keep personalized regions
   dynamic.

## RPGACE's own real, quantified baseline (Aug 11 2026 audit — re-run this
section's own evidence-gathering whenever the numbers might have moved,
never trust these figures as still-current without re-checking)

Real static-code audit (no live Lighthouse/PageSpeed — that path is a
confirmed-blocked landmine from inside this session, see CLAUDE.md's Known
landmines; this audit is what's actually achievable without it):

- `rpgace_core.js`: **1,124,028 bytes raw / 308,862 bytes gzipped**, 19,749
  lines, ~4,145 of them (21%) pure comment lines. `main.js`: 257,090 bytes
  raw / 75,485 bytes gzipped, 4,397 lines. Together ~1.38MB of blocking JS
  parsed+executed serially (via plain `<script src>`, no `defer`/`async`)
  before `rpgace:ready` fires and the app becomes interactive. **This is
  the real core of the complaint**, not compression (Vercel already
  gzips/brotli-compresses every response automatically, platform-level,
  nothing to configure) and not asset caching (fixed same pass, see below).
- Fixed this pass (safe, zero-behavior-risk): `vercel.json` gained a
  `headers` block — 1-year immutable `Cache-Control` on
  `rpgace_core.js`/`main.js`/`style.css`/`icons/*`, safe because all four
  are query-string versioned (a cached URL's content genuinely never
  changes — a real content change always gets a new `?v=` value, hence a
  cache miss). Real gap caught and fixed in the same pass: `style.css` had
  **no** version query string at all before this — applying the aggressive
  header to it as-is would have created a NEW stale-CSS bug that didn't
  exist before; fixed by adding `?v=` to its `<link>` tag first, matching
  the discipline the two script tags already used. Also added
  `preconnect` hints for `fonts.googleapis.com`/`fonts.gstatic.com` — the
  Google Fonts stylesheet request was render-blocking with no DNS/TLS
  warm-up.
- Real, genuinely open fork — NOT executed this pass, needs Alex's steer
  before building: **should RPGACE ship a minified production copy of
  `rpgace_core.js`/`main.js` alongside the fully-commented source?** The
  21%-comment figure is real headroom, but this codebase has 2 separate,
  real reasons to be cautious rather than just building a stripper script
  and moving on: (a) the zero-build-step architecture rule is explicit and
  load-bearing — any minification step must be a committed, re-run-by-hand
  repo-generation script (same precedent as `scripts/graphify_recolor.py`),
  never a live Vercel build step; (b) this exact codebase has a standing,
  named landmine about a naive string-literal-blind transform corrupting
  shipped code (`exportEncyclopedia`'s fake `</body></html>` inside a JS
  string literal, "never use Python string-replace on index.html") — a
  regex-based comment/whitespace stripper risks the same class of bug on
  `rpgace_core.js` unless it's a real JS-aware minifier (e.g. terser),
  which would be RPGACE's first-ever dev-time (not runtime) npm tool.
  Flagged plainly rather than built blind.
- Real, genuinely open fork, also NOT executed: **31 `registerBootTask`
  calls, 20 of them deliberately delayed 1300-1700ms** (per the project's
  own documented convention, protecting against the `hooks.fire()`
  late-registration landmine). This is real, intentional, load-bearing
  design — but it also means many UI modules visibly appear more than a
  second after the page is otherwise ready, which is real PERCEIVED
  latency distinct from raw transfer bytes. Reducing/restructuring this
  stagger is a genuine UX/architecture question, not a blind global
  speed-up — flagged for a future dedicated pass, not touched here.

## When this runs

- **Every time `/Engineer` (or a skill that calls it — `/paranoia`, `/CEO`
  Loop 2 execution) builds or restructures anything that talks to the
  network, writes to Supabase, or makes a user wait on a response**: run
  through the 5 patterns above as a checklist during Stage 2 (build).
  Most won't apply to most changes — that's fine, say so plainly rather
  than forcing a fit. When one genuinely applies, apply it; don't just
  note it and move on.
- **Whenever Alex says "/decompress" directly**, or asks to audit/improve
  load times: re-run this file's own evidence-gathering (file sizes,
  gzip'd sizes, script-loading order, cache headers, boot-delay count)
  fresh — never quote last time's numbers as still-current without
  re-checking, same discipline as everywhere else in this project.

## Guardrails

- **Never attempt a live Lighthouse/PageSpeed run from inside this
  session** — confirmed-blocked, both methods, not transient (CLAUDE.md
  Known landmines). Static code audit (file sizes, gzip sizes, load order,
  header inspection) is the real, available substitute — say so honestly
  rather than silently trying and failing again.
- **Never strip comments/minify `rpgace_core.js` or `main.js` without
  Alex's explicit confirmation first** — real corruption risk given this
  codebase's own standing string-literal landmines, and a real
  architecture-precedent question (first dev-time npm tool) that isn't
  this skill's call to make alone.
- **A pattern that doesn't apply to a given change is not a finding** —
  don't force all 5 patterns onto every build; report "n/a, no external
  dependency/no repeated write/no page-cache opportunity here" plainly
  when true, matching every other RPGACE skill's anti-ceremony discipline.
