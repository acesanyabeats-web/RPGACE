// /api/data-write — authenticated write proxy for tables where the anon key
// is being locked to read-only (Approach B, phased). Uses the Supabase
// service-role key server-side, bypassing RLS entirely, so it must sit
// behind requireAuth() same as every other endpoint.
//
// Oct 16 2026 (BT-8, plan "Beats (Producer)"): the Aug 5 `bundle-deliverables`
// zip action is retired (Alex: "Add a Sell step, no file zips"); its bucket
// was empty. The `action` branches below (screenshots, read) still share
// this file's requireAuth + service-role posture (12-function Vercel cap).
import { setCORS, requireAuth } from './_context.js';

export const config = {
  maxDuration: 60,
};

const SUPABASE_URL = 'https://gripopghczmrbrhqtqbm.supabase.co';
async function sbFetch(path, serviceKey, opts) {
  return fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      ...(opts && opts.headers ? opts.headers : {}),
    },
  });
}

// Phase 1 (Alex-confirmed July 24): bookworm_* + bibliography + taxonomy_*.
// Phase 2 batch 1: intel_reports/intel_bibliography/encyclopedia, migrated
// together with taxonomy_nodes via the intelDelete module's _sbDel/
// _sbInsert wrapper. Phase 2 batch 2: reference_tracks/conid_pot/
// content_productions/video_jobs - while migrating these, found a THIRD
// raw-fetch pattern (RPGACE.CONFIG.supabase.url + '/rest/v1/...' inline,
// distinct from both RPGACE.sb.* and _sbDel/_sbInsert) that phase 1's
// verification never searched for - it had real remaining writes to
// taxonomy_tree AND taxonomy_nodes despite both being claimed fully
// migrated. Fixed at the same time (see rpgace_core.js for the real
// call-site list); exhaustively re-checked via every known Supabase
// write idiom in the file before considering this batch complete.
// Add a table here only once its RLS policy has actually been flipped to
// anon read-only AND every existing call site has been migrated to this
// endpoint - never the other way around.
const ALLOWED_TABLES = new Set([
  'bookworm_books',
  'bookworm_chapters',
  'bibliography',
  'taxonomy_tree',
  'taxonomy_proposals',
  'taxonomy_links',
  'taxonomy_nodes',
  'intel_reports',
  'intel_bibliography',
  'intel_watchlist',
  'encyclopedia',
  'reference_tracks',
  'conid_pot',
  'content_productions',
  'video_jobs',
  'chronicles_finance',
  'oracle_dev_suggestions',
  'taxonomy_decision_log',
  'oracle_fallback_queue',
  // July 24 - main.js FROZEN-file migration (real /Routine audit): these
  // 4 were the "zero real client write call sites" claim's real gap -
  // the verifying grep never checked main.js, which is the sole writer
  // for all 4. journal and intel_jobs also have real EXTERNAL writers
  // (the Morning Brief Routine; a local Python server, port 7842) that
  // hold only the plain anon key - being in this allowlist lets the
  // app's OWN client route through here, but their RLS is deliberately
  // NOT being flipped in the same pass, for exactly that reason.
  'journal',
  'encyclopedia_insights',
  'rpgace_agendas',
  'intel_jobs',
  // 2026-07-28 - Content Pipeline overseer build (Alex-confirmed forks,
  // content_pipeline_overseer_spec_backlog_2026-07-28.txt): new table,
  // same anon_read_only/authenticated_all posture as every table above.
  'style_profiles',
  // 2026-08-23 - A9 Phase 1 (Massive Expansion plan). Both are brand-new
  // tables created anon_read_only/authenticated_all FROM THE START, so
  // this file's own "flip RLS first, then allowlist" rule above is
  // satisfied by construction: there has never been an unmigrated
  // direct-anon write call site to either of them, and there never will
  // be - questEngine routes every write through this endpoint.
  'quest_log',
  'routines', // Oct 12 2026 My Day routines (anon_read_only from creation)
  'chore_blocks', // Oct 14 2026 DT-4 chore blocks (anon_read_only from creation)
  'day_templates', // Oct 14 2026 DT-1 day templates + locked-day records (anon_read_only from creation)
  'rpgace_shifts', // Oct 12 2026 MD2-1: RLS flipped to anon_read_only/authenticated_all same day; shiftSync + the Fourth cloud runner write here
  'sync_status', // Oct 12 2026 MD2-2: created anon_read_only/authenticated_all; the Fourth cloud runner reports its last run here
  'activity_templates', // Oct 12 2026 MD2-4: schedule activity templates (place, journey, get-ready, category); anon_read_only from creation
  'myday_settings', // Oct 12 2026 MD2-4: single-row get-ready/margin/shift travel settings; anon_read_only from creation
  'travel_profile', 'people', 'plans', 'plan_tasks', // Oct 12 2026 Trips & Plans: locked tables (no anon policy), read via action 'read'
  'library_items', // Oct 13 2026 LL-1 Life Library: locked like people (authenticated_all only), read via action 'read'
  'xp_events', 'xp_rules', // Oct 13 2026 XP Season Pass (XP-1): private, written by DB triggers, read via action 'read'
  'cutback_items', 'cutback_log', // Oct 14 2026 MD2-11 cut-back trackers: locked (authenticated_all only), read via action 'read'
  'food_log', 'body_log', 'health_settings', // Oct 14 2026 Health & body (HB-1..3): locked (authenticated_all only), read via action 'read'
  'posts', // Oct 17 2026 PC-0 Posting (Creator): locked (authenticated_all only), read via action 'read'
  'artists', 'pitches', 'pitch_sends', // Oct 17 2026 SH-0 Selling (Hustler): locked (authenticated_all only), read via action 'read'
  'perf_freezes', // Oct 14 2026 freeze recorder (perfWatch): locked (authenticated_all only), write-only from the app
  'push_subscriptions', // Oct 14 2026 MD2-7 phone alerts: locked (authenticated_all only); the myday-push edge function reads it with the service role
  'xp_ladders', 'xp_unlock_defs', 'xp_unlocks', 'xp_settings', // XP-3: ranks, badges/titles, claims, revenue target
  'xp_reports', // XP-4: frozen week/month/season/year snapshots (written by pg_cron, read only)
  'xp_challenges', 'xp_quest_steps', // XP-5: weekly challenges, season resolutions, realm quest steps
  'xp_treats', // XP-6: treats pinned to a level, rank, resolution or full challenge week
  'outreach_log', // XP-7: outreach sent + collabs done (Hustler XP; private)
  'routine_plans', // Oct 12 2026 MD2-5: week planner - which days a routine is planned; anon_read_only from creation
  'day_blocks', // Oct 12 2026 MD2-5: multi-day blocks (holiday/trip/event) shown on planner headers; anon_read_only from creation
  'quest_duration_stats',
  // 2026-08-26 - G41 Phase 2 (self-aware vocabulary growth). Created
  // anon_read_only/authenticated_all FROM THE START (same as
  // oracle_module_anatomy's own precedent) - satisfies "flip RLS first,
  // then allowlist" by construction, same as quest_log/quest_duration_stats
  // above. oracleControl._approveSuggestedAction() is the one real write
  // path (a new row Alex explicitly approved from an Oracle-drafted
  // suggestion) - never a live, unapproved insert.
  'oracle_actions',
  // 2026-08-27 - /Routine item #1 "delete doesn't stick" fix. Created
  // anon_read_only/authenticated_all FROM THE START (same as oracle_actions/
  // quest_log above) - satisfies "flip RLS first, then allowlist" by
  // construction. intelDelete/deleteEncEntry/clearEncyclopedia are the
  // real write paths (a fire-and-forget insert on delete).
  'intel_reanalysis_pool',
  // 2026-09-10 - HABITS/Cooking domain, H1. Created anon_read_only/
  // authenticated_all FROM THE START (same "flip RLS first, then allowlist"
  // by construction as oracle_actions/quest_log above). cookingOracle is the
  // one real write path. ingredient_prices/ingredients/recipe_ingredients
  // are Alex's own manually-entered price/ingredient data, never Oracle-
  // generated - same human-source discipline as chronicles_finance.
  'recipes',
  'ingredients',
  'recipe_ingredients',
  'ingredient_prices',
  'habits_config',
  // 2026-09-12 - HABITS/Cooking H6 (multi-recipe kitchen-session scheduler).
  // Created anon_read_only/authenticated_all FROM THE START (same "flip RLS
  // first, then allowlist" by construction as recipes/ingredients above).
  // cookingOracle.logic._acceptSchedule is the one real write path.
  'planned_cooks',
  // 2026-09-13 - HABITS/Cooking H7/H8 (shopping list, pantry, price
  // logging). Created anon_read_only/authenticated_all FROM THE START (same
  // "flip RLS first, then allowlist" by construction as every other HABITS
  // table above). cookingOracle.logic._generateShoppingList/_recordPurchase/
  // ui._showPantry's add-stock handler are the real write paths.
  'pantry_stock',
  'shopping_lists',
  'shopping_list_items',
  // 2026-09-14 - general Wishlist/Shopping module (Alex's own ask: "future
  // purchases... plan out total budget"). Created anon_read_only/
  // authenticated_all FROM THE START (same "flip RLS first, then allowlist"
  // by construction as every HABITS table above) - a standalone module, NOT
  // part of HABITS/Cooking, since these are general future purchases
  // (batteries, a wok, FIFA 27), not ingredients. shoppingWishlist is the
  // one real write path.
  'wishlist_items',
  'wishlist_config',
  // Oct 10 2026 (HABITS gym tracker): anon_read_only + authenticated_all from creation.
  'gym_sessions',
  'gym_sets',
  // 2026-09-16 - HABITS/Cooking Current Stock (Pantry/Fridge/Freezer/
  // Equipment). Created anon_read_only/authenticated_all FROM THE START
  // (same "flip RLS first, then allowlist" by construction as every
  // HABITS table above). cookingOracle.ui._renderEquipmentTab is the one
  // real write path.
  'kitchen_equipment',
  // 2026-09-17 - H24 2nd pass (real Alex ask: "when orange substitution
  // or blue is presented, give me an option to confirm so it can turn
  // green"). Created anon_read_only/authenticated_all FROM THE START (same
  // "flip RLS first, then allowlist" by construction as every HABITS
  // table above). cookingOracle.logic._confirmSubstitution is the one
  // real write path - a real, explicit Alex click, never an automatic
  // insert.
  'ingredient_substitution_confirmations',
  // 2026-09-17 - H24 6th pass (real Alex ask: "rate the subsitutions so
  // the system prunes to different alternatives to make better decisions
  // with me"). Created anon_read_only/authenticated_all FROM THE START
  // (same precedent). cookingOracle.logic._rateSubstitution is the one
  // real write path - append-only, a real historical log, never updated
  // or deleted (same discipline ingredient_prices already established).
  'substitution_ratings',
  // 2026-09-17 - H24 7th pass (real Alex ask, "orange should have an
  // option where i declare we talk about same item just 2 derivations of
  // names... interpret into recipe so counts on stock and recipe go
  // through no matter how i word it"). Created anon_read_only/
  // authenticated_all FROM THE START. cookingOracle.logic._declareSameItem
  // is the one real write path - a real, explicit 2-click-confirmed Alex
  // action, never automatic; a real permanent ingredient merge (delete +
  // FK reassignment) happens alongside it, real Tier-3-adjacent stakes
  // given there is no Supabase backup, per the standing landmine.
  'ingredient_aliases',
  // 2026-09-25 - jargon_encyclopedia anchor-table restructure (records/
  // 2026-09/taxonomy_curriculum_jargon_encyclopedia_merge_spec_2026-09-
  // 25.txt, Section 17-19). Replaces the old jargon_encyclopedia VIEW
  // with a real table, created anon_read_only/authenticated_all FROM THE
  // START (same "flip RLS first, then allowlist" by construction as
  // oracle_actions/quest_log above). Same rule-4 human-checkpoint status
  // gate as taxonomy_tree - phylumPath's curriculum-commit path is the
  // intended real write source once Step C2/D land.
  'jargon_encyclopedia',
]);

// Oct 11 2026 — S1 Screenshot Inbox. Alex chose "keep the picture, locked":
// the `screenshots` table and the private `screenshots` bucket have RLS on
// with NO policies, so the public anon key can't read, write or list either.
// Every access is this action, behind requireAuth() with the service-role
// key - one more action on this file (rule 8: no 13th
// api file). Ops: upload | update | list | count | delete.
const PRIVATE_READ_TABLES = new Set(['travel_profile', 'people', 'plans', 'plan_tasks', 'library_items', 'xp_events', 'xp_rules', 'xp_ladders', 'xp_unlock_defs', 'xp_unlocks', 'xp_settings', 'xp_reports', 'xp_challenges', 'xp_quest_steps', 'xp_treats', 'outreach_log', 'cutback_items', 'cutback_log', 'food_log', 'body_log', 'health_settings', 'posts', 'artists', 'pitches', 'pitch_sends']);
const SHOTS_BUCKET = 'screenshots';
const SHOT_PATCH_FIELDS = ['extracted_text', 'description', 'tags', 'kind', 'suggestions', 'status', 'routed_to', 'read_at', 'realms'];
// Realm Inputs RI-2: the 13 xpSeason realm keys a screenshot may carry (max 4).
const REALM_KEYS = ['producer', 'creator', 'hustler', 'chef', 'athlete', 'scholar', 'life', 'homekeeper', 'mind', 'steward', 'explorer', 'connector', 'builder'];
function cleanRealms(list) {
  return Array.isArray(list) ? list.filter(function (k, i) { return REALM_KEYS.indexOf(k) !== -1 && list.indexOf(k) === i; }).slice(0, 4) : [];
}
const SHOT_COLS = 'id,storage_path,source,extracted_text,description,tags,kind,suggestions,status,routed_to,created_at,read_at,realms';

async function signShotPaths(paths, serviceKey) {
  if (!paths.length) return {};
  const r = await sbFetch('/storage/v1/object/sign/' + SHOTS_BUCKET, serviceKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600, paths }),
  });
  const data = await r.json().catch(() => []);
  const out = {};
  (Array.isArray(data) ? data : []).forEach(function (d) {
    if (d && d.path && d.signedURL) out[d.path] = SUPABASE_URL + '/storage/v1' + d.signedURL;
  });
  return out;
}

async function handleScreenshots(body, res, serviceKey) {
  const op = body.op;
  if (op === 'upload') {
    const mediaType = body.mediaType || 'image/jpeg';
    if (!/^image\/(jpeg|png|webp)$/.test(mediaType)) return res.status(400).json({ error: 'Only JPEG, PNG or WebP images' });
    if (!body.base64 || typeof body.base64 !== 'string') return res.status(400).json({ error: 'base64 image required' });
    const buf = Buffer.from(body.base64, 'base64');
    if (!buf.length || buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Image empty or over 8MB' });
    const d = new Date();
    const ext = mediaType === 'image/png' ? 'png' : mediaType === 'image/webp' ? 'webp' : 'jpg';
    const path = d.toISOString().slice(0, 7) + '/' + d.getTime() + '-' + Math.random().toString(16).slice(2, 10) + '.' + ext;
    const up = await sbFetch('/storage/v1/object/' + SHOTS_BUCKET + '/' + path, serviceKey, {
      method: 'POST', headers: { 'Content-Type': mediaType }, body: buf,
    });
    if (!up.ok) return res.status(502).json({ error: 'Image upload failed', detail: await up.text() });
    const ins = await sbFetch('/rest/v1/screenshots?select=' + SHOT_COLS, serviceKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      // RC-4: a milestone proof photo stays private and out of the inbox
      // (tag milestone_proof, status kept - never read, never fed to the Library).
      body: JSON.stringify(body.source === 'proof'
        ? { storage_path: path, mime: mediaType, source: 'upload', status: 'kept', tags: ['milestone_proof'], realms: cleanRealms(body.realms) }
        : { storage_path: path, mime: mediaType, source: body.source === 'share' ? 'share' : 'upload', realms: cleanRealms(body.realms) }),
    });
    const rows = await ins.json().catch(() => null);
    if (!ins.ok || !Array.isArray(rows) || !rows[0]) {
      await sbFetch('/storage/v1/object/' + SHOTS_BUCKET + '/' + path, serviceKey, { method: 'DELETE' });
      return res.status(502).json({ error: 'Saving the screenshot row failed', detail: rows });
    }
    return res.status(200).json({ data: rows[0] });
  }
  if (op === 'update') {
    if (!body.id || !body.patch) return res.status(400).json({ error: 'id and patch required' });
    const patch = {};
    SHOT_PATCH_FIELDS.forEach(function (k) { if (k in body.patch) patch[k] = body.patch[k]; });
    if ('realms' in patch) patch.realms = cleanRealms(patch.realms);
    const r = await sbFetch('/rest/v1/screenshots?id=eq.' + encodeURIComponent(body.id) + '&select=' + SHOT_COLS, serviceKey, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(patch),
    });
    const rows = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json({ error: 'Update failed', detail: rows });
    return res.status(200).json({ data: Array.isArray(rows) ? rows[0] : null });
  }
  if (op === 'list') {
    const limit = Math.min(Math.max(parseInt(body.limit, 10) || 40, 1), 100);
    let q = '/rest/v1/screenshots?select=' + SHOT_COLS + '&order=created_at.desc&limit=' + limit;
    if (body.q && String(body.q).trim()) q += '&search=wfts(english).' + encodeURIComponent(String(body.q).trim().slice(0, 120));
    if (body.status) q += '&status=in.(' + String(body.status).split(',').map(encodeURIComponent).join(',') + ')';
    if (body.id) q += '&id=eq.' + encodeURIComponent(body.id);
    // RC-4: proof photos only show when asked for (a milestone's own view).
    q += body.proof ? '&tags=cs.%7Bmilestone_proof%7D' : '&tags=not.cs.%7Bmilestone_proof%7D';
    const r = await sbFetch(q, serviceKey);
    const rows = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(rows)) return res.status(502).json({ error: 'List failed', detail: rows });
    if (body.withUrls !== false) {
      const urls = await signShotPaths(rows.map(function (x) { return x.storage_path; }), serviceKey);
      rows.forEach(function (x) { x.url = urls[x.storage_path] || null; });
    }
    return res.status(200).json({ data: rows });
  }
  // Realm Inputs RI-3: screenshots saved with "Not now" on the realm picker
  // (realms = {}), oldest first.
  if (op === 'held') {
    const r = await sbFetch('/rest/v1/screenshots?select=id,description,created_at&realms=eq.%7B%7D&tags=not.cs.%7Bmilestone_proof%7D&order=created_at.asc&limit=50', serviceKey);
    const rows = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(rows)) return res.status(502).json({ error: 'Held list failed', detail: rows });
    return res.status(200).json({ data: rows });
  }
  if (op === 'count') {
    const r = await sbFetch('/rest/v1/screenshots?select=id&status=in.(new,unread,read_failed)', serviceKey, { headers: { Prefer: 'count=exact', Range: '0-0' } });
    const range = r.headers.get('content-range') || '';
    const n = parseInt(range.split('/')[1], 10);
    return res.status(200).json({ data: { count: isNaN(n) ? 0 : n } });
  }
  if (op === 'delete') {
    if (!body.id) return res.status(400).json({ error: 'id required' });
    const g = await sbFetch('/rest/v1/screenshots?select=storage_path&id=eq.' + encodeURIComponent(body.id), serviceKey);
    const rows = await g.json().catch(() => []);
    const row = Array.isArray(rows) && rows[0];
    if (!row) return res.status(404).json({ error: 'Screenshot not found' });
    const rm = await sbFetch('/storage/v1/object/' + SHOTS_BUCKET + '/' + row.storage_path, serviceKey, { method: 'DELETE' });
    if (!rm.ok && rm.status !== 404) return res.status(502).json({ error: 'Deleting the image failed', detail: await rm.text() });
    const d = await sbFetch('/rest/v1/screenshots?id=eq.' + encodeURIComponent(body.id), serviceKey, { method: 'DELETE' });
    if (!d.ok) return res.status(502).json({ error: 'Deleting the row failed', detail: await d.text() });
    return res.status(200).json({ data: { deleted: body.id } });
  }
  return res.status(400).json({ error: 'Unknown screenshots op: ' + op });
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Server not configured — set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (body && body.action === 'screenshots') {
      return await handleScreenshots(body, res, serviceKey);
    }
    // Oct 12 2026 — Trips & Plans (TP-1/TP-3): people, travel profile and
    // plans are personal, so those tables have RLS with no anon policy and
    // are read only here, after login (same posture as screenshots).
    if (body && body.action === 'read') {
      if (!PRIVATE_READ_TABLES.has(body.table)) return res.status(403).json({ error: 'Table not readable here: ' + body.table });
      const params = String(body.params || 'select=*');
      if (/[\r\n#]/.test(params) || params.length > 600) return res.status(400).json({ error: 'Bad params' });
      const r = await sbFetch('/rest/v1/' + body.table + '?' + params, serviceKey);
      const rows = await r.json().catch(() => null);
      if (!r.ok || !Array.isArray(rows)) return res.status(502).json({ error: 'Read failed', detail: rows });
      return res.status(200).json({ data: rows });
    }

    const { table, operation, payload, match, onConflict } = body || {};

    if (!ALLOWED_TABLES.has(table)) {
      return res.status(403).json({ error: 'Table not allowed: ' + table });
    }
    if (operation !== 'insert' && operation !== 'update' && operation !== 'delete') {
      return res.status(400).json({ error: 'Invalid operation' });
    }
    if ((operation === 'update' || operation === 'delete') && !match) {
      return res.status(400).json({ error: operation + ' requires match' });
    }

    let url = SUPABASE_URL + '/rest/v1/' + table;
    let method;
    // July 24 - real audit found saveOracleToEncyclopedia's upsert
    // (?on_conflict=title, Prefer: resolution=merge-duplicates) has no
    // equivalent here - a mechanical migration without this would turn
    // every re-save of an existing title into a 409 that secureWrite
    // throws on, silently breaking VST-tag writes that only ever ran
    // after a successful save. Optional, only used by the one real
    // upsert call site - every other insert is unaffected.
    let prefer = 'return=representation';
    if (operation === 'insert' && onConflict) {
      url += '?on_conflict=' + onConflict;
      prefer += ',resolution=merge-duplicates';
    }
    if (operation === 'insert') method = 'POST';
    else if (operation === 'update') { method = 'PATCH'; url += '?' + match; }
    else { method = 'DELETE'; url += '?' + match; }

    const r = await fetch(url, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body: operation === 'delete' ? undefined : JSON.stringify(payload),
    });

    const text = await r.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Supabase write failed', detail: data });
    }
    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
