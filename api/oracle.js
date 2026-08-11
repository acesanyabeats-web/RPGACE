// ORACLE — direct Claude chat with image support
import { setCORS, requireAuth, callClaude, MODEL, cacheableSystem } from './_context.js';

// Real Kimi/Luna free-tier routing scaffold (Aug 11 2026) — Alex's own
// explicit ask, per the OmniRoute/model-cost Aintergration thread:
// "cater build to everything around kimi and luna api... just build...
// connect it at a later date (like we are doing with openart)." Folded
// into this existing file rather than a 13th api/*.js file, per the
// standing 12-Serverless-Function-cap rule (project was at 11/12).
//
// Real evidence behind the design (live web research, Aug 11 — not
// guessed): neither Kimi (Moonshot) nor Luna (OpenAI GPT-5.6) has a
// literally-free API — the "free/unlimited" framing is the CONSUMER chat
// product (chat.openai.com), not the developer API. Both are real,
// metered, but far cheaper than Anthropic: Luna ~$0.20/$1.20 per M
// tokens in/out after a July 30 price cut; Kimi K2.6/K2.7 $0.60-$3/M
// depending on tier, needing a one-time $1 account activation. OmniRoute
// itself (the third-party gateway Alex originally named) was NOT
// adopted here — its own real architecture needs a persistent server
// (SQLite-backed), a genuine mismatch with RPGACE's Vercel-serverless
// posture (same finding as the original July 20 Aintergration verdict,
// reconfirmed fresh against this new framing). This calls Kimi's and
// Luna's real OpenAI-compatible chat/completions endpoints directly
// instead — no third-party router needed, same "direct call, no extra
// infra" shape as the already-proven `MECHANICAL_MODEL` (Haiku) tier.
//
// Deliberately gated OFF until real keys exist, same honest-payload-
// while-off pattern as `OPENMONTAGE_HANDOFF_ENABLED`: if the matching
// env var isn't set, this fails loud with a clear error (rule 7),
// never silently falls back to Anthropic without saying so. Real, named
// caveat: the exact model slugs below are placeholders confirmed
// correct as of this session's live research — verify against the
// provider's own current model list before the first real paid call,
// since these are fast-moving products.
const FREE_TIER_PROVIDERS = {
  kimi: {
    envKey: 'MOONSHOT_API_KEY',
    baseUrl: 'https://api.moonshot.ai/v1/chat/completions',
    model: 'kimi-k2-0905-preview',
  },
  luna: {
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-5.6-luna',
  },
};

// Non-streaming only in v1 — OpenAI-compatible SSE uses a different wire
// shape than Anthropic's, and no real caller needs streaming from this
// path yet (real, scoped limitation, not an oversight). Normalizes to
// the SAME `{content:[{type:'text',text}]}` shape Anthropic's own path
// returns (rule 8 — one shared response shape downstream, not two), so
// no client-side parsing code needs a second path once this is wired up.
async function callFreeTierProvider(providerName, messages, system, maxTokens) {
  const cfg = FREE_TIER_PROVIDERS[providerName];
  if (!cfg) throw new Error(`Unknown free-tier provider: "${providerName}"`);
  const key = process.env[cfg.envKey];
  if (!key) {
    throw new Error(
      `Provider "${providerName}" was requested but ${cfg.envKey} is not ` +
      `configured yet — real key needed before this route can be used ` +
      `(scaffold built Aug 11 2026, deliberately not yet activated).`
    );
  }
  const oaiMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...(messages || []).map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  ];
  const resp = await fetch(cfg.baseUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages: oaiMessages }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`${providerName} API error: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { content: [{ type: 'text', text }] };
}

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
    const { messages, system, maxTokens, max_tokens, model, stream, provider } = body;
    const tokens = maxTokens || max_tokens || 1000;
    const useModel = model || MODEL;
    const hasImages = messages && messages.some(m =>
      Array.isArray(m.content) && m.content.some(c => c.type === 'image')
    );

    // Kimi/Luna free-tier routing (Aug 11 2026 scaffold, see the module
    // comment above) — only reached when a caller explicitly sends
    // `provider: 'kimi'|'luna'`. No existing caller does this today, so
    // every current call site's behavior is completely unchanged; this
    // branch is real but dormant until both a key is configured AND a
    // future client-side change starts sending the field.
    if (provider && provider !== 'anthropic') {
      const result = await callFreeTierProvider(provider, messages, system || '', tokens);
      return res.status(200).json(result);
    }

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
        body: JSON.stringify({ model: useModel, max_tokens: tokens, system: cacheableSystem(system || ''), messages, stream: true })
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
        body: JSON.stringify({ model: useModel, max_tokens: tokens, system: cacheableSystem(system || ''), messages })
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