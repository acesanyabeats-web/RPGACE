export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // UPDATED June 28 2026 — verified tool names from app.composio.dev
  const SHARED = 'pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1';
  const ACCOUNTS = {
    gmail:     { id: 'ca_p2wfPZctumH_', user_id: 'ACESANYAROTA' },
    github:    { id: 'ca_0dwb1yCGD-Dk', user_id: SHARED },
    youtube:   { id: 'ca_yfUI2ySIgkat', user_id: SHARED },
    instagram: { id: 'ca_BuczS_wYvxRd', user_id: SHARED },
    canva:     { id: 'ca_9U6ZLJW-DxFg', user_id: SHARED },
    notion:    { id: 'ca_Qfjy_TRBQA7T', user_id: 'notionACE' },
    supadata:  { id: 'ca_rxEcC9_UzPkL', user_id: SHARED },
  };

  // Verified v3.1 tool names from app.composio.dev June 28 2026
  const TOOL_ALIASES = {
    // GitHub — old name broke in v3.1
    'GITHUB_CREATE_A_REPOSITORY':            'GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER',
    'GITHUB_CREATE_REPOSITORY':              'GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER',
    // Canva — old name broke in v3.1
    'CANVA_LIST_DESIGNS':                    'CANVA_LIST_USER_DESIGNS',
    'CANVA_GET_DESIGNS':                     'CANVA_LIST_USER_DESIGNS',
    // Instagram — Basic Display API deprecated by Meta Dec 2024
    // Now uses Graph API via Composio
    'INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS': 'INSTAGRAM_GET_IG_USER_MEDIA',
    'INSTAGRAM_GET_MEDIA':                   'INSTAGRAM_GET_IG_USER_MEDIA',
    'INSTAGRAM_GET_USER_MEDIA':              'INSTAGRAM_GET_IG_USER_MEDIA',
  };

  const BASE = 'https://backend.composio.dev/api/v3.1';

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
