export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // CONFIRMED WORKING — tested via curl June 2026
  const ACCOUNTS = {
    gmail:     { id: 'ca_hOmfJVI6y_5I', user_id: 'ACESANYAROTA' },
    github:    { id: 'ca_EeQ6y9x4Ip3e', user_id: 'ACESANYAROTA' },
    youtube:   { id: 'ca_7yEGuE1nVZMv', user_id: 'ACESANYAROTA' },
    instagram: { id: 'ca_TOH1G3bg4g63', user_id: 'ACESANYAROTA' },
    canva:     { id: 'ca_I51RdED0V1Eu', user_id: 'ACESANYAROTA' },
    notion:    { id: 'ca_HSv9sjhL7Fg-', user_id: 'ACESANYAROTA' }
  };

  const BASE = 'https://backend.composio.dev/api/v3.1';

  try {
    const composioKey = process.env.COMPOSIO_API_KEY;
    if (!composioKey) throw new Error('COMPOSIO_API_KEY not set in Vercel Environment Variables.');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, tool, input } = body;

    const headers = {
      'x-api-key': composioKey,
      'Content-Type': 'application/json'
    };

    if (action === 'verify') {
      const r = await fetch(`${BASE}/connected_accounts`, { headers });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || 'HTTP ' + r.status);
      return res.status(200).json({ success: true, count: (data.items || []).length });
    }

    if (action === 'execute') {
      if (!tool) throw new Error('No tool specified.');
      const appKey = tool.split('_')[0].toLowerCase();
      const account = ACCOUNTS[appKey];
      if (!account) throw new Error(`No account configured for "${appKey}".`);

      console.log(`Executing: ${tool} | account: ${account.id} | user: ${account.user_id}`);
      console.log('Input:', JSON.stringify(input));

      const execRes = await fetch(`${BASE}/tools/execute/${tool}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          connected_account_id: account.id,
          user_id: account.user_id,
          arguments: input || {}
        })
      });

      const execText = await execRes.text();
      console.log('Status:', execRes.status, '| Response:', execText.slice(0, 600));

      let execData;
      try { execData = JSON.parse(execText); }
      catch(e) { throw new Error('Non-JSON: ' + execText.slice(0, 300)); }

      if (execData.successful === false || execData.successfull === false) {
        throw new Error('Action failed: ' + (execData.error?.message || JSON.stringify(execData.error) || execData.message || 'Unknown'));
      }
      if (!execRes.ok) {
        throw new Error(`HTTP ${execRes.status}: ` + (execData.error?.message || execData.message || JSON.stringify(execData).slice(0, 200)));
      }

      return res.status(200).json({ success: true, data: execData.data || execData });
    }

    throw new Error('Unknown action: ' + action);

  } catch (err) {
    console.error('Composio error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
