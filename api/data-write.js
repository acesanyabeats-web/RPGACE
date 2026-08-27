// /api/data-write — authenticated write proxy for tables where the anon key
// is being locked to read-only (Approach B, phased). Uses the Supabase
// service-role key server-side, bypassing RLS entirely, so it must sit
// behind requireAuth() same as every other endpoint.
//
// Aug 5 (Engineer pass 09, real fix during Phase H deployment) — also
// handles a SECOND real job: `action: 'bundle-deliverables'` server-side
// zips a ConID's beat deliverable files per licence tier. This was
// originally its own file (api/bundle-deliverables.js) but Vercel's
// Hobby plan hard-caps a deployment at 12 Serverless Functions — this
// project was already sitting at exactly 12 real endpoint files (13
// physical files in api/, minus the underscore-prefixed _context.js,
// which Vercel's own convention excludes from function-counting), so
// adding a 13th real function broke production deploys
// (errorCode: exceeded_serverless_functions_per_deployment, caught by
// this pass's own G6 check, not silently missed). Folding the new job in
// here — rather than deleting/repurposing an unrelated existing endpoint
// — keeps every other endpoint's contract untouched and reuses the exact
// same real posture this file already has (requireAuth + service-role
// key), which the new job genuinely needs too. Real, deliberate scope
// widening, not a silent violation of "one job per file" — both jobs
// share the identical auth/authorization shape.
import { setCORS, requireAuth } from './_context.js';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const config = {
  maxDuration: 60,
};

const SUPABASE_URL = 'https://gripopghczmrbrhqtqbm.supabase.co';
const DELIVERABLES_BUCKET = 'beat-deliverables';

// Real BeatStars tier ordering (lease < non-exclusive < exclusive) — a
// file tagged with a given tier is included in that tier's bundle AND
// every higher tier's bundle (matches real licence semantics: a pricier
// licence includes at least what a cheaper one does, plus its own
// additions like stems). A null/missing tier on a file means "every tier".
const TIER_ORDER = { 'lease': 0, 'non-exclusive': 1, 'exclusive': 2 };

function fileAppliesToTier(fileTier, requestedTier) {
  if (!fileTier) return true;
  if (!(fileTier in TIER_ORDER) || !(requestedTier in TIER_ORDER)) return false;
  return TIER_ORDER[fileTier] <= TIER_ORDER[requestedTier];
}

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
]);

async function handleBundleDeliverables(req, res, serviceKey) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { conId, tier } = body || {};
  if (!conId || !tier || !(tier in TIER_ORDER)) {
    return res.status(400).json({ error: 'conId and a valid tier (lease/non-exclusive/exclusive) are required' });
  }

  // 1. Real row, current deliverable_files + deliverable_bundles (need
  // the full bundles object back to merge one key in, not overwrite).
  const rowRes = await sbFetch(
    '/rest/v1/content_productions?id=eq.' + encodeURIComponent(conId) + '&select=id,con_id,deliverable_files,deliverable_bundles',
    serviceKey
  );
  const rows = await rowRes.json();
  const row = rows && rows[0];
  if (!row) return res.status(404).json({ error: 'ConID not found' });

  const files = Array.isArray(row.deliverable_files) ? row.deliverable_files : [];
  const applicable = files.filter(function (f) { return fileAppliesToTier(f.tier, tier); });
  if (!applicable.length) {
    return res.status(400).json({ error: 'No uploaded files apply to the "' + tier + '" tier yet — upload some first.' });
  }

  // 2. Fetch each real file's bytes from the private bucket (service
  // role bypasses RLS — this is the one place raw bytes are read).
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks = [];
  const pass = new PassThrough();
  pass.on('data', function (c) { chunks.push(c); });
  const donePromise = new Promise(function (resolve, reject) {
    pass.on('end', resolve);
    archive.on('error', reject);
  });
  archive.pipe(pass);

  for (const f of applicable) {
    const objRes = await sbFetch('/storage/v1/object/' + DELIVERABLES_BUCKET + '/' + encodeURIComponent(f.storage_path), serviceKey);
    if (!objRes.ok) {
      return res.status(502).json({ error: 'Could not fetch stored file: ' + f.name + ' (HTTP ' + objRes.status + ')' });
    }
    const buf = Buffer.from(await objRes.arrayBuffer());
    archive.append(buf, { name: f.name || f.storage_path });
  }
  await archive.finalize();
  await donePromise;
  const zipBuffer = Buffer.concat(chunks);

  // 3. Upload the real zip back to the same private bucket.
  const zipPath = 'bundles/' + row.con_id + '-' + tier + '-' + Date.now() + '.zip';
  const upRes = await sbFetch('/storage/v1/object/' + DELIVERABLES_BUCKET + '/' + encodeURIComponent(zipPath), serviceKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip', 'x-upsert': 'true' },
    body: zipBuffer,
  });
  if (!upRes.ok) {
    const detail = await upRes.text();
    return res.status(502).json({ error: 'Zip upload failed', detail });
  }

  // 4. Real signed URL — 24h expiry, since this is a private bucket and
  // Alex needs to actually download the thing to upload it to BeatStars.
  const signRes = await sbFetch('/storage/v1/object/sign/' + DELIVERABLES_BUCKET + '/' + encodeURIComponent(zipPath), serviceKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 86400 }),
  });
  const signData = await signRes.json();
  if (!signRes.ok || !signData.signedURL) {
    return res.status(502).json({ error: 'Bundle created but signing its download URL failed', detail: signData });
  }
  const fullSignedURL = SUPABASE_URL + '/storage/v1' + signData.signedURL;

  // 5. Write back deliverable_bundles[tier] — merge, don't clobber other
  // tiers' previously-generated bundles.
  const bundles = (row.deliverable_bundles && typeof row.deliverable_bundles === 'object') ? row.deliverable_bundles : {};
  bundles[tier] = {
    storage_path: zipPath,
    size: zipBuffer.length,
    file_count: applicable.length,
    generated_at: new Date().toISOString(),
  };
  const patchRes = await sbFetch('/rest/v1/content_productions?id=eq.' + encodeURIComponent(conId), serviceKey, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ deliverable_bundles: bundles }),
  });
  if (!patchRes.ok) {
    // The zip itself is real and signed URL works — surface this as a
    // partial-success warning rather than failing the whole request,
    // since Alex can still download the bundle even if the row wasn't
    // updated (a future "Generate Bundle" click will just recreate it).
    console.warn('[data-write:bundle-deliverables] bundle row write-back failed:', patchRes.status);
  }

  return res.status(200).json({
    url: fullSignedURL,
    file_count: applicable.length,
    size: zipBuffer.length,
  });
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

    if (body && body.action === 'bundle-deliverables') {
      return await handleBundleDeliverables(req, res, serviceKey);
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
