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

// Real Fish Audio dormant scaffold (Aug 26 2026, G41 Phase 1 — records/
// 2026-08/g41_oracle_control_ceo_spec_2026-08-26.txt §6d) — same honest,
// dormant-until-a-real-key-exists shape as the Kimi/Luna scaffold above,
// folded into this same file for the same real reason (the 12-Serverless-
// Function Vercel Hobby cap). Alex's own explicit, repeated instruction:
// build the mechanism now, activate it (add a real FISH_AUDIO_API_KEY to
// Vercel) only when he says so — this stays fully inert until that env var
// exists.
//
// Real, load-bearing architecture finding (not guessed): Fish Audio also
// offers a real-time WebSocket variant for both TTS and ASR
// (wss://api.fish.audio/v1/tts/live, similar for ASR) — but a Vercel
// serverless function is a single-invocation request/response handler, not
// a persistent process, so it CANNOT hold open or relay a live WebSocket
// connection the way a long-running server could. This scaffold
// deliberately uses Fish Audio's real synchronous REST endpoints instead
// (confirmed live via Fish Audio's own current API docs, Aug 26 2026):
//   POST https://api.fish.audio/v1/tts  — JSON body {text, reference_id,
//     format}, model passed as a header, Bearer auth, returns raw audio
//     bytes (base64-encoded here for this file's existing all-JSON
//     response convention — a real, deliberate simplification, easy to
//     revisit once activation is real).
//   POST https://api.fish.audio/v1/asr  — multipart/form-data {audio,
//     language, ignore_timestamps}, Bearer auth.
// This actually fits Phase 1's real usage shape fine — voiceInput's own
// mechanism is "speak, then a transcript lands," not a continuous live
// stream, so a single batch round-trip per utterance is a genuine match,
// not a downgrade. Voice identity (a real Fish Audio voice_id) is
// deliberately NOT set here — that's real Phase-1 BUILD work for whoever
// activates this, resolved at that time (never a named real person's
// voice, per the spec's own resolved Q3/6c).
const FISH_AUDIO_TTS_URL = 'https://api.fish.audio/v1/tts';
const FISH_AUDIO_ASR_URL = 'https://api.fish.audio/v1/asr';
const FISH_AUDIO_MODEL = 's2.1-pro-free'; // real model header value confirmed live, Aug 26 2026 — re-verify before the free tier's own Aug 31 2026 cutoff (see CLAUDE.md G41 Fish Audio section)

async function callFishAudioTTS({ text, voiceId, format }) {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) {
    throw new Error(
      'Fish Audio TTS was requested but FISH_AUDIO_API_KEY is not configured yet — ' +
      'real key needed before this route can be used (scaffold built Aug 26 2026, ' +
      'deliberately not yet activated; Alex activates this himself, on his own timing).'
    );
  }
  if (!text) throw new Error('Fish Audio TTS: no text provided');
  const resp = await fetch(FISH_AUDIO_TTS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'content-type': 'application/json',
      'model': FISH_AUDIO_MODEL,
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId || undefined, // undefined = provider's own default voice, until a real chosen voice_id exists
      format: format || 'mp3',
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Fish Audio TTS error: ${errText.slice(0, 300)}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  return { audioBase64: buf.toString('base64'), format: format || 'mp3' };
}

async function callFishAudioASR({ audioBase64, language }) {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) {
    throw new Error(
      'Fish Audio ASR was requested but FISH_AUDIO_API_KEY is not configured yet — ' +
      'real key needed before this route can be used (scaffold built Aug 26 2026, ' +
      'deliberately not yet activated). voiceInput\'s existing free browser ' +
      'SpeechRecognition stays the real fallback until this is activated.'
    );
  }
  if (!audioBase64) throw new Error('Fish Audio ASR: no audio provided');
  const buf = Buffer.from(audioBase64, 'base64');
  const form = new FormData();
  form.append('audio', new Blob([buf]), 'audio.webm');
  form.append('language', language || 'en');
  form.append('ignore_timestamps', 'true');
  const resp = await fetch(FISH_AUDIO_ASR_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: form,
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Fish Audio ASR error: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json();
  return { text: data?.text || '' };
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
    const { messages, system, maxTokens, max_tokens, model, stream, provider, action, text, voiceId, format, audioBase64, language } = body;
    const tokens = maxTokens || max_tokens || 1000;
    const useModel = model || MODEL;
    const hasImages = messages && messages.some(m =>
      Array.isArray(m.content) && m.content.some(c => c.type === 'image')
    );

    // Fish Audio dormant scaffold dispatch (Aug 26 2026, see the module
    // comment above) — only reached when a caller explicitly sends
    // `action: 'fish-tts'` or `action: 'fish-asr'`. No existing caller does
    // this today (voiceInput still uses the free browser SpeechRecognition
    // API directly, client-side, no server round-trip at all) — this branch
    // is real but fully dormant until FISH_AUDIO_API_KEY exists AND a future
    // client-side change starts sending these fields.
    if (action === 'fish-tts') {
      const result = await callFishAudioTTS({ text, voiceId, format });
      return res.status(200).json(result);
    }
    if (action === 'fish-asr') {
      const result = await callFishAudioASR({ audioBase64, language });
      return res.status(200).json(result);
    }

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