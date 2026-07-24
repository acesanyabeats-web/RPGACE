// July 23 — deduplication fix (Alex-confirmed standing rule: "same
// processes must go through one pipeline or function if steps are
// identical"). This file used to hand-roll its own CORS headers and its
// own ACCOUNTS/TOOL_ALIASES maps instead of importing the shared ones
// from _context.js - and the two copies had drifted apart (this file's
// gmail/instagram ids were newer and correct; _context.js's were stale,
// meaning executor.js/orchestrate.js were silently using the wrong
// connected-account ids for those two apps). _context.js is now the
// single source of truth for all of it; this file only keeps what's
// genuinely unique to it (the 'verify' action, a real second feature
// callComposio() doesn't cover).
import { setCORS, requireAuth, ACCOUNTS, TOOL_ALIASES, BASE_URL } from './_context.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BASE = BASE_URL;

  try {
    const composioKey = process.env.COMPOSIO_API_KEY;
    if (!composioKey) throw new Error('COMPOSIO_API_KEY not set.');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, tool: rawTool, input } = body;
    const tool = TOOL_ALIASES[rawTool] || rawTool;
    const headers = { 'x-api-key': composioKey, 'Content-Type': 'application/json' };

    if (action === 'verify') {
      const r = await fetch(`${BASE}/connected_accounts`, { headers });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || 'HTTP ' + r.status);
      const summary = (data.items||[]).map(a=>`${a.toolkit.slug}:${a.status}`).join(', ');
      return res.status(200).json({ success: true, count: (data.items||[]).length, summary });
    }

    if (action === 'execute') {
      if (!tool) throw new Error('No tool specified.');
      const appKey = tool.split('_')[0].toLowerCase();
      const account = ACCOUNTS[appKey];
      if (!account) throw new Error(`No account for "${appKey}". Have: ${Object.keys(ACCOUNTS).join(', ')}`);
      console.log(`[composio] ${rawTool} -> ${tool} | ${account.id} | ${account.user_id}`);
      const execRes = await fetch(`${BASE}/tools/execute/${tool}`, {
        method: 'POST', headers,
        body: JSON.stringify({ connected_account_id: account.id, user_id: account.user_id, arguments: input || {} })
      });
      const execText = await execRes.text();
      console.log('[composio] status:', execRes.status, execText.slice(0,300));
      let execData;
      try { execData = JSON.parse(execText); } catch(e) { throw new Error('Non-JSON: ' + execText.slice(0,200)); }
      if (execData.successful === false) throw new Error('Failed: ' + (execData.error?.message || JSON.stringify(execData.error)));
      if (!execRes.ok) throw new Error(`HTTP ${execRes.status}: ` + (execData.error?.message || execData.message || ''));
      return res.status(200).json({ success: true, data: execData.data || execData });
    }

    throw new Error('Unknown action: ' + action);
  } catch (err) {
    console.error('[composio] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
