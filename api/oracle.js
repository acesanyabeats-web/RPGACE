// ORACLE — direct Claude chat with image support
import { setCORS, requireAuth, callClaude, MODEL } from './_context.js';

// Raises the Vercel serverless function timeout ceiling - was using the
// account's default limit, which is too short for long, detailed responses
// (e.g. multi-layer teaching explanations), causing 504 Gateway Timeout.
// July 24 audit fix: vercel.json's own functions block ALSO set this
// file's maxDuration, to 30 - a divergent, silently-conflicting second
// copy of one setting (rule 8, config layer) sitting right next to the
// documented, still-unfixed Oracle 504 bug this comment describes.
// Removed from vercel.json; this export is the single source of truth,
// per Vercel's own docs ("the standard approach for functions in the
// /api directory"). Whether the drift was ever the ACTUAL cause of the
// 504 is unconfirmed - this closes the drift regardless.
// July 28: raised to 300 (Vercel's real per-function ceiling on the Pro
// plan; Hobby hard-caps at 60 regardless of this value) at Alex's request,
// as one half of the real 504 fix - if this account is on Hobby, Vercel
// will reject the deploy and this needs reverting to 60. See the real
// streaming fix below for the other, more load-bearing half: even
// requests that still exceed whichever ceiling applies now show their
// content as it's generated instead of nothing until either success or a
// blank timeout.
export const config = {
  maxDuration: 300,
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
    const { messages, system, maxTokens, max_tokens, model, stream } = body;
    const tokens = maxTokens || max_tokens || 1000;
    const useModel = model || MODEL;
    const hasImages = messages && messages.some(m =>
      Array.isArray(m.content) && m.content.some(c => c.type === 'image')
    );

    // July 28: real streaming, fixing the actual root cause of the 504 (a
    // single blocking non-streaming call - CLAUDE.md's own diagnosis).
    // A prior attempt (rpgace_core.js's now-neutralised RPGACE.streamOracle/
    // restoreSendChat) shipped a client-side SSE consumer against a server
    // that never implemented streaming at all - this handler never even
    // read a `stream` field, so every "streamed" request got the same
    // single JSON blob, which the client's `data: ` line parser silently
    // never matched, producing an empty buffer every time. That's why it
    // was reverted, not because the client parsing logic was wrong - it
    // already matches Anthropic's real SSE wire format correctly, it just
    // never received real stream data before. This proxies Anthropic's
    // actual event stream through byte-for-byte. Images are excluded
    // (real, deliberate scope limit, not an oversight) - that path already
    // has its own separate handling below and isn't the one producing the
    // long teaching-format responses that time out.
    if (stream && !hasImages) {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: useModel, max_tokens: tokens, system: system || '', messages, stream: true })
      });
      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => '');
        return res.status(upstream.status || 502).json({ error: 'Anthropic stream error: ' + errText.slice(0, 300) });
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      });
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } catch (streamErr) {
        // Headers are already sent at this point - can't return a JSON
        // error. Best effort: log server-side and close the connection;
        // the client sees a truncated stream, same as a dropped network
        // connection would look, never a crash.
        console.error('Oracle stream error:', streamErr.message);
      } finally {
        res.end();
      }
      return;
    }

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