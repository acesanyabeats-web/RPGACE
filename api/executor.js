// AGENT 4 — DATA EXECUTOR
// Job: Fire Composio actions only. Cannot generate content or talk to users.
import { setCORS, callComposio, ACCOUNTS, BASE_URL } from './_context.js';

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const composioKey = process.env.COMPOSIO_API_KEY;
    if(!composioKey) throw new Error('COMPOSIO_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { tool, input } = body;
    if(!tool) throw new Error('No tool specified');

    console.log(`Executor: ${tool} | input: ${JSON.stringify(input).slice(0,200)}`);

    const result = await callComposio(composioKey, tool, input);
    console.log('Executor result:', JSON.stringify(result).slice(0,300));
    return res.status(200).json({ success: true, data: result });

  } catch(err){
    console.error('Executor error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
