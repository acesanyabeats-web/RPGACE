# Security

- The repo is public. No secrets in tracked files; no hardcoded fallback secrets. The old `CORRECT_PW` value is permanently in git history (`git log -p -- main.js`); the live value is different.
- Password check is server-side (`api/auth.js` vs `process.env.CORRECT_PW`); success returns `process.env.RPGACE_API_SECRET`. `authGate` attaches it to every `/api/*` call through one global `fetch()` wrap and keeps it in localStorage (re-checked on launch via `/api/auth`'s `token` branch, yes/no only). Rotating `RPGACE_API_SECRET` signs every device out.
- Every `/api/*.js` endpoint calls `requireAuth()` from `api/_context.js`; an unauthenticated `/api/oracle` returns 401 (verified live).
- Writes to locked tables go through `RPGACE.sb.secureWrite()` → `api/data-write.js` (service role, `process.env.SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_TABLES`, optional `onConflict`, `action: 'read'` for private tables). Invariant: a table goes in `ALLOWED_TABLES` only once its RLS is flipped.
- Standard RLS: `anon_read_only` (SELECT for anon) + `authenticated_all`. Private tables (e.g. `xp_events`, `food_log`, `plans`) have no anon read and are read via `/api/data-write` action `read`.
- Meta tables `achiever_archive`, `ceo_plans`, `ceo_reports`, `system_map_flags`, `session_memory` are `anon_read_only`; Claude Code writes them via MCP.
- Deliberately anon-writable tables and why: see `docs/claude/landmines.md` (Supabase section). Never sweep them into an RLS tightening.
- Open: Composio key rotation (Alex); `.env.local` is untracked and gitignored.
