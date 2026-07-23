// AGENT 1 — CONTENT SCOUT
// Job: Detect if input is URL, fetch it via Jina, identify content type
// Cannot: analyse content, save anything, fire Composio
import { setCORS, requireAuth, fetchURL, isURL, callClaude, RPGACE_CONTEXT } from './_context.js';

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if(!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    let { content, type = 'auto' } = body;

    let fetchedContent = content;
    let sourceURL = null;
    let jinavFetched = false;

    // Step 1 — If URL detected, fetch via Jina
    const lines = content.trim().split('\n');
    const firstLine = lines[0].trim();
    if(isURL(firstLine)){
      sourceURL = firstLine;
      console.log('Scout: URL detected, fetching via Jina:', sourceURL);
      try {
        const jinaContent = await fetchURL(sourceURL);
        // Combine jina content with any extra text the user added
        const extraText = lines.slice(1).join('\n').trim();
        fetchedContent = jinaContent + (extraText ? '\n\nUser context: ' + extraText : '');
        jinavFetched = true;
        console.log('Scout: Jina fetch success, content length:', fetchedContent.length);
      } catch(e) {
        console.log('Scout: Jina fetch failed:', e.message, '— using original input');
        fetchedContent = content;
      }
    }

    // Step 2 — Identify content type if auto
    let detectedType = type;
    let title = 'Untitled Content';
    let confidence = 'high';

    if(type === 'auto'){
      const identPrompt = `${RPGACE_CONTEXT}

You are the Content Scout. Identify the type and title of this content.
Respond with ONLY valid JSON, no other text, no markdown fences:
{"type":"music|food|tech|fitness|social|article|general","title":"descriptive title max 60 chars","confidence":"high|medium|low","reason":"one sentence"}

CONTENT TO IDENTIFY (first 1000 chars):
${fetchedContent.slice(0, 1000)}`;

      const reply = await callClaude(apiKey, [{ role: 'user', content: identPrompt }], '', 300);
      const jsonMatch = reply.match(/\{[\s\S]*?\}/);
      if(jsonMatch){
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          detectedType = parsed.type || 'general';
          title = parsed.title || firstLine.slice(0,60);
          confidence = parsed.confidence || 'medium';
        } catch(e) { detectedType = 'general'; }
      }
    } else {
      title = firstLine.slice(0,60) || 'User content';
    }

    console.log(`Scout result: type=${detectedType} title="${title}" confidence=${confidence} jinaFetched=${jinavFetched}`);

    return res.status(200).json({
      success: true,
      detectedType,
      title,
      confidence,
      sourceURL,
      jinaFetched: jinavFetched,
      contentLength: fetchedContent.length,
      content: fetchedContent  // pass cleaned content to next agent
    });

  } catch(err) {
    console.error('Scout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
