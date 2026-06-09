export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const composioKey = process.env.COMPOSIO_API_KEY;
    const entityId = '2d5cbaae-b75e-4e58-a573-5c07bc633ad9';

    if (!composioKey) {
      throw new Error('COMPOSIO_API_KEY not set in Vercel Environment Variables.');
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, tool, input } = body;

    // ── VERIFY CONNECTION ──
    if (action === 'verify') {
      const r = await fetch('https://backend.composio.dev/api/v2/connectedAccounts', {
        method: 'GET',
        headers: {
          'X-API-KEY': composioKey,
          'Content-Type': 'application/json'
        }
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Composio returned invalid response: ' + text.slice(0,100)); }
      if (!r.ok) throw new Error(data?.message || data?.error || 'Invalid Composio API key');
      return res.status(200).json({ success: true, count: (data.items || []).length });
    }

    // ── EXECUTE ACTION ──
    if (action === 'execute') {
      if (!tool) throw new Error('No tool specified');

      const execBody = JSON.stringify({ entityId, input: input || {} });
      const r = await fetch(`https://backend.composio.dev/api/v2/actions/${tool}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': composioKey
        },
        body: execBody
      });

      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Composio returned invalid JSON: ' + text.slice(0,200)); }
      if (!r.ok) throw new Error(data?.message || data?.error || `Composio error ${r.status}`);
      return res.status(200).json(data);
    }

    throw new Error('Unknown action: ' + action);

  } catch (err) {
    console.error('Composio function error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
