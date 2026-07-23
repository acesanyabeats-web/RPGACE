// /api/auth — July 23 (Alex-authorized Tier 3 fix). The real password
// check used to run entirely in client JS (main.js's checkPassword()),
// with CORRECT_PW as a plain string shipped to every browser — trivially
// readable via view-source, confirmed by the /5thDimension Phase 1 audit.
// The check now happens here, server-side, against a Vercel env var that
// is never sent to the client. On success, this hands back the shared
// secret (also an env var) that main.js's wrapped checkPassword() then
// attaches to every subsequent /api/* call via rpgace_core.js's authGate
// fetch wrap — the same secret both proves the password was checked here
// and unlocks every other endpoint's requireAuth() check in one step.
//
// Deployment note: this endpoint (and requireAuth() in _context.js)
// require two Vercel environment variables to be set — CORRECT_PW and
// RPGACE_API_SECRET — before this can go live. Without them this returns
// a clear 500 rather than silently failing or falling back to a
// hardcoded value (this repo is public — a hardcoded fallback secret
// here would be exactly as exposed as the old client-side CORRECT_PW).
import { setCORS } from './_context.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const password = body && body.password;
    const correctPw = process.env.CORRECT_PW;
    const secret = process.env.RPGACE_API_SECRET;

    if (!correctPw || !secret) {
      return res.status(500).json({ error: 'Server not configured — set CORRECT_PW and RPGACE_API_SECRET in Vercel env vars.' });
    }
    if (password !== correctPw) {
      return res.status(401).json({ ok: false });
    }
    return res.status(200).json({ ok: true, secret: secret });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
