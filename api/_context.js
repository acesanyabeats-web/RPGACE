// RPGACE shared context — imported by all agents
// DEFINITIVE CONFIRMED IDs — from full connected_accounts query 2026-06-18

export const RPGACE_CONTEXT = `
You are an AI agent in RPGACE — a gamified life management system for Alex (AceSanya),
an aspiring UK music producer and content creator targeting YouTube, TikTok and Instagram.

CONNECTED APPS (Composio v3.1) — all under user_id: pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1:
- Gmail:     ca_7oagofAi-tkv
- YouTube:   ca_yfUI2ySIgkat
- Instagram: ca_PZCS9R3VR5xG
- GitHub:    ca_0dwb1yCGD-Dk
- Canva:     ca_9U6ZLJW-DxFg
- Supadata:  ca_2wlvzvhd5tFz  (YouTube stats — no-auth public data)
- Notion:    ca_Qfjy_TRBQA7T  (user_id: notionACE — different!)

CONFIRMED TOOLS:
- GMAIL_CREATE_EMAIL_DRAFT — {subject, body, to}
- GMAIL_FETCH_EMAILS — {max_results, label_ids}
- NOTION_CREATE_NOTION_PAGE — {title, markdown}
- GITHUB_RUN_GRAPH_QL_QUERY — use for repo creation via GraphQL
- GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS — {repo, path, message, content}
- SUPADATA_GET_YOUTUBE_CHANNEL — {id} (use "@AceSanyaBeats")
- INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS — {}
- CANVA_LIST_DESIGNS — {}

MODEL: claude-sonnet-4-6
COMPOSIO API: https://backend.composio.dev/api/v3.1
`;

const PG = 'pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1';

// July 23 — deduplication fix (Alex-confirmed standing rule: "same
// processes must go through one pipeline or function if steps are
// identical"). This map used to have a SECOND, drifted copy hand-rolled
// inside composio.js with its own "UPDATED June 28 2026 — verified tool
// names from app.composio.dev" comment — that copy had CORRECTED gmail
// and instagram ids/user_ids that this file had never received, meaning
// executor.js/orchestrate.js (which both call callComposio() below) had
// silently been using stale, likely-wrong connected-account ids for
// gmail/instagram since June 28 while composio.js's own direct calls
// used the right ones. This file is now the single source of truth —
// composio.js imports from here instead of keeping its own copy.
export const ACCOUNTS = {
  gmail:     { id: 'ca_p2wfPZctumH_', user_id: 'AceSanyaBeats.com' },
  youtube:   { id: 'ca_yfUI2ySIgkat',  user_id: PG },
  instagram: { id: 'ca_BuczS_wYvxRd', user_id: PG },
  github:    { id: 'ca_0dwb1yCGD-Dk',  user_id: PG },
  canva:     { id: 'ca_9U6ZLJW-DxFg',  user_id: PG },
  supadata:  { id: 'ca_rxEcC9_UzPkL',  user_id: PG },
  notion:    { id: 'ca_Qfjy_TRBQA7T',  user_id: 'notionACE' }
};

// Moved from composio.js (same deduplication fix) so callComposio() below
// applies it for EVERY caller (executor.js, orchestrate.js, composio.js),
// not just the one file that happened to remember tool names change.
export const TOOL_ALIASES = {
  'GITHUB_CREATE_A_REPOSITORY':            'GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER',
  'GITHUB_CREATE_REPOSITORY':              'GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER',
  'CANVA_LIST_DESIGNS':                    'CANVA_LIST_USER_DESIGNS',
  'CANVA_GET_DESIGNS':                     'CANVA_LIST_USER_DESIGNS',
  'INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS': 'INSTAGRAM_GET_IG_USER_MEDIA',
  'INSTAGRAM_GET_MEDIA':                   'INSTAGRAM_GET_IG_USER_MEDIA',
  'INSTAGRAM_GET_USER_MEDIA':              'INSTAGRAM_GET_IG_USER_MEDIA',
};

export const MODEL    = 'claude-sonnet-4-6';
export const BASE_URL = 'https://backend.composio.dev/api/v3.1';

// July 16: extractor/ground-worker two-tier pipeline (Phylum Path taxonomy
// restructuring only, so far). MODEL_EXTRACTOR is a fast/cheap first pass
// that produces a structured plan; MODEL_GROUND_WORKER executes it. Kept
// as the already-verified-working model by default rather than switching
// wholesale to an unverified string here - CLAUDE.md's own standing rule
// is never guess a model identifier, confirm it works first.
export const MODEL_EXTRACTOR      = 'claude-fable-5';
export const MODEL_GROUND_WORKER  = MODEL;

export async function callClaude(apiKey, messages, system='', maxTokens=1000, model=MODEL){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: model, max_tokens: maxTokens, system, messages })
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { throw new Error('Claude non-JSON: ' + text.slice(0,100)); }
  if(!res.ok) throw new Error(data?.error?.message || 'Claude HTTP ' + res.status);
  return data.content.map(c => c.text || '').join('');
}

export async function callComposio(composioKey, rawTool, input){
  const tool = TOOL_ALIASES[rawTool] || rawTool;
  const appKey = tool.split('_')[0].toLowerCase();
  const account = ACCOUNTS[appKey];
  if(!account) throw new Error(`No account configured for app "${appKey}"`);

  const res = await fetch(`${BASE_URL}/tools/execute/${tool}`, {
    method: 'POST',
    headers: { 'x-api-key': composioKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connected_account_id: account.id,
      user_id: account.user_id,
      arguments: input || {}
    })
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { throw new Error('Composio non-JSON: ' + text.slice(0,200)); }
  if(data.successful === false) throw new Error(data.error?.message || JSON.stringify(data.error) || 'Action failed');
  if(!res.ok) throw new Error(`HTTP ${res.status}: ` + (data.error?.message || data.message || JSON.stringify(data).slice(0,200)));
  return data.data || data;
}

export function setCORS(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // X-RPGACE-Auth added July 23 for requireAuth() below - without it the
  // browser's CORS preflight rejects the custom header before it ever
  // reaches this handler.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RPGACE-Auth');
}

// July 23 — real server-side auth (Alex-authorized Tier 3 fix). Every
// /api/*.js endpoint except api/auth.js itself calls this right after
// setCORS()/the OPTIONS short-circuit. Previously there was NO check at
// all here — anyone who found an endpoint's URL could invoke Oracle/
// Composio actions directly, bypassing the password screen entirely
// (confirmed by the /5thDimension Phase 1 audit, reading these exact
// files). One shared function so every endpoint enforces the identical
// rule, rather than 10 separate hand-rolled checks that could drift.
export function requireAuth(req, res){
  const configured = process.env.RPGACE_API_SECRET;
  const given = req.headers['x-rpgace-auth'];
  if (!configured || !given || given !== configured) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export async function fetchURL(url){
  const jinaURL = 'https://r.jina.ai/' + url;
  const res = await fetch(jinaURL, {
    headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' }
  });
  if(!res.ok) throw new Error('Jina fetch failed: HTTP ' + res.status);
  const text = await res.text();
  if(!text || text.length < 50) throw new Error('Jina returned empty content for this URL');
  return text.slice(0, 8000);
}

export function isURL(str){
  return /^https?:\/\//i.test(str.trim());
}
