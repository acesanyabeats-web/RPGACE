// ORCHESTRATOR — Oracle + Agent bridge
import { setCORS, requireAuth, callClaude, callComposio, RPGACE_CONTEXT } from './_context.js';

const ORACLE_SYSTEM = `${RPGACE_CONTEXT}

You are the Oracle — Alex's AI life coach and agent commander in RPGACE.
You can talk AND act. Respond ALWAYS with valid JSON only:
{
  "reply": "Your response — motivating, RPG-toned, direct",
  "action": "TOOL_NAME or null",
  "arguments": { "key": "value" },
  "app": "gmail|github|youtube|supadata|notion|canva|instagram or null",
  "action_description": "What you are doing or null"
}

WHEN TO TRIGGER ACTIONS:
- draft/send email → GMAIL_CREATE_EMAIL_DRAFT — {subject, body, to:""}
- check email → GMAIL_FETCH_EMAILS — {max_results:10, label_ids:["UNREAD"]}
- save notes/log progress → NOTION_CREATE_NOTION_PAGE — {parent_id:"3830f922-7ad0-8064-ac35-f6ebaff22b99", title, markdown}
- youtube stats/channel → SUPADATA_GET_YOUTUBE_CHANNEL — {id:"@AceSanyaBeats"} — app: "supadata"
- instagram posts → INSTAGRAM_GET_IG_USER_MEDIA — {} — app: "instagram"
- create repo/save code → GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER — {name, description, private:false, auto_init:true}
- see designs → CANVA_LIST_USER_DESIGNS — {} — app: "canva"
- anything else → action: null

CRITICAL FORMAT RULES:
- Respond with a raw JSON object ONLY — no backtick json fences, no markdown around the JSON
- The "reply" field should contain plain text with markdown formatting (**, ##, -, etc.)
- Never wrap the entire response in code blocks
- The reply field is what the user sees — make it clean, readable and well-formatted
- ALWAYS set "to": "" — never invent email addresses
- Sign all emails as: Alex | acesanyabeats@gmail.com

For quests: QUEST: [name] | XP: [50-300] | Type: [daily/weekly/monthly] | Category: [career/health/lifestyle]
Be direct. Motivating. One sharp line at the end.`;

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const composioKey  = process.env.COMPOSIO_API_KEY;
    if(!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
    if(!composioKey)  throw new Error('COMPOSIO_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, lastReply } = body;

    const lastMsg = messages[messages.length-1]?.content || '';
    const isSaveRequest = /save.*notion|log.*notion|notion.*page/i.test(lastMsg);

    let messagesForClaude = messages;
    if(isSaveRequest && lastReply){
      messagesForClaude = [
        ...messages.slice(0,-1),
        { role: 'user', content: `Save the following content to Notion as a page. Title it based on the content. Here is the content to save:\n\n${lastReply.slice(0,3000)}\n\nUser request: ${lastMsg}` }
      ];
    }

    const rawReply = await callClaude(anthropicKey, messagesForClaude, ORACLE_SYSTEM, 800);
    console.log('Oracle raw:', rawReply.slice(0,300));

    let parsed;
    try {
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawReply);
    } catch(e) {
      return res.status(200).json({ reply: rawReply, action_taken: null, action_result: null });
    }

    const reply = parsed.reply || rawReply;
    const cleanReply = reply
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const { action, arguments: args, app, action_description } = parsed;

    let actionResult = null;
    let actionError  = null;

    if(action && action !== 'null' && action !== null){
      console.log(`Orchestrator firing: ${action} via ${app}`);
      try {
        actionResult = await callComposio(composioKey, action, args || {});
        console.log('Action result:', JSON.stringify(actionResult).slice(0,300));
      } catch(e) {
        actionError = e.message;
        console.error('Action failed:', e.message);
      }
    }

    return res.status(200).json({
      reply: cleanReply,
      action_taken: action || null,
      action_description: action_description || null,
      action_result: actionResult,
      action_error: actionError
    });

  } catch(err){
    console.error('Orchestrator error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
