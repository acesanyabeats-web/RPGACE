# Platform domain — navigation, areas, boot, speed, auth

Read before touching any `domain: 'platform'` module, navigation/areas, boot tasks, performance or auth.

Modules (`domain: 'platform'`, 8): `orchestratorCC`, `leftNav`, `dashDeck`, `config`, `pwaInstall`, `authGate`, `pathRouter`, `perfWatch`.

## Navigation, areas, domains
- Every module declares `domain:` from `RPGACE.DOMAINS` (8 domains); `scripts/check_module_domains.py` checks it. Galaxy Map Level 1 is `galaxy_map_domain.html`.
- Areas: `RPGACE.AREAS`, foldable nav bands, `RPGACE.areaNav` Back/🏠, ☰ side list `RPGACE.sideList` on every area bar (SL-0). Popup history/Back via `dashDeck._nav*`. Dashboard landing + one grouped menu. [N1](../../patch_notes.html#card-2026-10-10-back-navigation)
- Popups: all overlays route through `dashDeck._popup()` (exception `_showEncPopup`). Boot: `RPGACE.registerBootTask` is the one gate; widgets inject into `#dd-stash-holder`.
- Plans of record: domains/navigation `records/2026-10/rpgace_domains_navigation_ceo_plan_2026-10-10.txt`; side list `records/2026-10/side_list_everywhere_ceo_2026-10-21.txt` (SL-1..5 queued); 50-project extensions `records/2026-10/fifty_claude_projects_paranoia_2026-10-10.txt`.

## Speed and UI tokens
- The Content Intelligence poll (`startIntelPolling`, every 30s) syncs only while `#intel-insights-content` is on screen and the tab is visible; it caused ~300 freezes a week before Oct 27. Freeze positions in `perf_freezes.scripts[].pos` are UTF-16 offsets into that build's `rpgace_core.min.js` (`git log -S<build> -- index.html`). [story](../../patch_notes.html#card-2026-10-27-freeze-intel-poll)
- `perfWatch` writes private `perf_freezes` (LoAF scripts+invoker, last 12 crumbs, slow resources, boot phase); boot-phase blocks (`!RPGACE._bootDoneAt`) don't toast. The old ~669ms "App froze" alert was the boot script load. Pending connector-cancelled SQL: `records/2026-10/pending_sql_2026-10-14.sql`. [story](../../patch_notes.html#card-2026-10-14-polish-speed)
- Animation tokens `--ease-out`/`--ease-drawer`; `RPGACE.ui.slideInPanel`/`slideOutPanel`; hover transforms gated behind `@media (hover:hover) and (pointer:fine)`; `#focus-concept-panel` keeps `transition:all` on purpose. ~72 hardcoded hex colours (21 values) have no token yet — open decision.
- `/impeccable` wraps only the free `npx impeccable detect`; the paid install returns 403.

## Auth
- `api/auth.js` checks `process.env.CORRECT_PW` server-side and returns `RPGACE_API_SECRET`; `authGate` attaches it to every `/api/*` call and keeps it in localStorage, re-checked via `/api/auth` `token` branch; "🔒 Sign out on this device" in the left nav. Every endpoint calls `requireAuth()` (`api/_context.js`). Details: `docs/claude/security.md`. [stay signed in](../../patch_notes.html#card-2026-10-10-stay-signed-in)

## Other platform modules
- `orchestratorCC` + `app_settings` (`background_analysis`) = the analysis on/off switch. [CC](../../patch_notes.html#card-2026-10-21-analysis-switch)
- `pwaInstall` handles the install prompt; `pathRouter` maps URL paths (e.g. `/knowledge`, `/study`) to pages.
