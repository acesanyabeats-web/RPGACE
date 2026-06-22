// ORACLE — direct Claude chat (fallback, used by learning pipeline)
import { setCORS, callClaude } from './_context.js';

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if(!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system, maxTokens } = body;

    const reply = await callClaude(apiKey, messages, system || '', maxTokens || 1000);
    // Return in same format as Anthropic API for compatibility
    return res.status(200).json({ content: [{ type: 'text', text: reply }] });

  } catch(err){
    console.error('Oracle error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
