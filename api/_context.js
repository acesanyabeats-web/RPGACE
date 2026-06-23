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
- GITHUB_CREATE_A_REPOSITORY — {name, description, private, auto_init}
- GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS — {repo, path, message, content}
- SUPADATA_GET_YOUTUBE_CHANNEL — {id} (use "@AceSanyaBeats")
- INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS — {}
- CANVA_LIST_DESIGNS — {}

MODEL: claude-sonnet-4-6
COMPOSIO API: https://backend.composio.dev/api/v3.1
`;

const PG = 'pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1';

export const ACCOUNTS = {
  gmail:     { id: 'ca_7oagofAi-tkv',  user_id: PG },
  youtube:   { id: 'ca_yfUI2ySIgkat',  user_id: PG },
  instagram: { id: 'ca_PZCS9R3VR5xG',  user_id: PG },
  github:    { id: 'ca_0dwb1yCGD-Dk',  user_id: PG },
  canva:     { id: 'ca_9U6ZLJW-DxFg',  user_id: PG },
  supadata:  { id: 'ca_rxEcC9_UzPkL',  user_id: PG },
  notion:    { id: 'ca_Qfjy_TRBQA7T',  user_id: 'notionACE' }
};

export const MODEL    = 'claude-sonnet-4-6';
export const BASE_URL = 'https://backend.composio.dev/api/v3.1';

export async function callClaude(apiKey, messages, system='', maxTokens=1000){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages })
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { throw new Error('Claude non-JSON: ' + text.slice(0,100)); }
  if(!res.ok) throw new Error(data?.error?.message || 'Claude HTTP ' + res.status);
  return data.content.map(c => c.text || '').join('');
}

export async function callComposio(composioKey, tool, input){
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
