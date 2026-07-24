// /api/data-write — authenticated write proxy for tables where the anon key
// is being locked to read-only (Approach B, phased). Uses the Supabase
// service-role key server-side, bypassing RLS entirely, so it must sit
// behind requireAuth() same as every other endpoint.
import { setCORS, requireAuth } from './_context.js';

const SUPABASE_URL = 'https://gripopghczmrbrhqtqbm.supabase.co';

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
]);

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
    const { table, operation, payload, match } = body || {};

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
    if (operation === 'insert') method = 'POST';
    else if (operation === 'update') { method = 'PATCH'; url += '?' + match; }
    else { method = 'DELETE'; url += '?' + match; }

    const r = await fetch(url, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
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
