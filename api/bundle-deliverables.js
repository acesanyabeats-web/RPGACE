// /api/bundle-deliverables — Phase H (Aug 5, Content/Video Pipeline
// unification, Engineer pass 09). Server-side zip bundling for a ConID's
// uploaded beat deliverable files (mp3/wav/stems), gated by licence tier.
//
// Real design reasoning, not incidental: the client uploads files DIRECTLY
// to the private `beat-deliverables` Storage bucket with the anon key
// (same direct-to-Storage pattern beatLog._tryRealAudioAnalysis already
// uses for beat-audio) — this endpoint never receives raw file bytes in
// its OWN request/response body, only a tiny {conId, tier} JSON in and a
// signed URL string out. That sidesteps Vercel's serverless
// request/response payload ceiling entirely; the only real constraint left
// is this function's own memory + maxDuration while it holds file bytes
// server-to-server (Supabase Storage -> this function -> back to Storage).
// Anon has INSERT/DELETE only on this bucket (no SELECT) — reading raw
// deliverable bytes requires the service-role key used here, or a signed
// URL this endpoint hands out. A real, deliberate deviation from the
// beat-audio bucket's blanket anon_all precedent (rule 8 says reuse
// patterns, but a silent copy here would let anyone holding the public
// anon key pull Alex's paid stems directly — a materially different asset
// than beat-audio's ephemeral analysis samples, so the deviation is
// reasoned, not accidental).
import { setCORS, requireAuth } from './_context.js';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const config = {
  maxDuration: 60,
};

const SUPABASE_URL = 'https://gripopghczmrbrhqtqbm.supabase.co';
const BUCKET = 'beat-deliverables';

// Real BeatStars tier ordering (lease < non-exclusive < exclusive) — a
// file tagged with a given tier is included in that tier's bundle AND
// every higher tier's bundle (matches the real licence semantics: a
// pricier licence includes at least what a cheaper one does, plus its own
// additions like stems). A null/missing tier on a file means "every tier".
const TIER_ORDER = { 'lease': 0, 'non-exclusive': 1, 'exclusive': 2 };

function fileAppliesToTier(fileTier, requestedTier) {
  if (!fileTier) return true;
  if (!(fileTier in TIER_ORDER) || !(requestedTier in TIER_ORDER)) return false;
  return TIER_ORDER[fileTier] <= TIER_ORDER[requestedTier];
}

async function sbFetch(path, serviceKey, opts) {
  const res = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      ...(opts && opts.headers ? opts.headers : {}),
    },
  });
  return res;
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
      const objRes = await sbFetch('/storage/v1/object/' + BUCKET + '/' + encodeURIComponent(f.storage_path), serviceKey);
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
    const upRes = await sbFetch('/storage/v1/object/' + BUCKET + '/' + encodeURIComponent(zipPath), serviceKey, {
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
    const signRes = await sbFetch('/storage/v1/object/sign/' + BUCKET + '/' + encodeURIComponent(zipPath), serviceKey, {
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
      console.warn('[bundle-deliverables] bundle row write-back failed:', patchRes.status);
    }

    return res.status(200).json({
      url: fullSignedURL,
      file_count: applicable.length,
      size: zipBuffer.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
