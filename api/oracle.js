// ORACLE — direct Claude chat with image support
import { setCORS, requireAuth, callClaude, MODEL } from './_context.js';

// Raises the Vercel serverless function timeout ceiling - was using the
// account's default limit, which is too short for long, detailed responses
// (e.g. multi-layer teaching explanations), causing 504 Gateway Timeout.
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system, maxTokens, max_tokens, model } = body;
    const tokens = maxTokens || max_tokens || 1000;
    const useModel = model || MODEL;
    const hasImages = messages && messages.some(m =>
      Array.isArray(m.content) && m.content.some(c => c.type === 'image')
    );
    if (hasImages) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: useModel, max_tokens: tokens, system: system || '', messages })
      });
      if (!response.ok) { const err = await response.text(); throw new Error('Anthropic API error: ' + err); }
      return res.status(200).json(await response.json());
    }
    const reply = await callClaude(apiKey, messages, system || '', tokens, useModel);
    return res.status(200).json({ content: [{ type: 'text', text: reply }] });
  } catch (err) {
    console.error('Oracle error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}