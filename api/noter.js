// AGENT 3 — NOTE TAKER
// Job: Format analysis into clean scannable notes + quality check
// Cannot: save data, fire Composio, fetch URLs
import { setCORS, callClaude, RPGACE_CONTEXT } from './_context.js';

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if(!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { analysis, detectedType, title } = body;

    if(!analysis) throw new Error('No analysis provided to noter');

    // Step 1 — Format notes
    const notesPrompt = `${RPGACE_CONTEXT}

You are the Note Taker. Take this analysis and reformat it into a clean, scannable knowledge note.

Rules:
- Every bullet point under 20 words
- Remove all waffle and filler
- Include a ⭐ HIGHLIGHT with the single most important insight
- Add RELATED TOPICS tags at the bottom
- Must be scannable in 30 seconds
- Must have ACTIONABLE STEPS section with 3-5 concrete next actions
- Minimum 150 words total

Format:
# [TITLE]
**Type:** [type] | **Date:** [today]

## SUMMARY
Two sentence overview.

## [SECTION HEADERS from analysis — reformatted as tight bullets]

⭐ **KEY INSIGHT:** [single most important thing]

## ACTIONABLE STEPS
1. [specific action]
2. [specific action]  
3. [specific action]

**Related:** [topic tags]

ANALYSIS TO REFORMAT:
Title: ${title}
Type: ${detectedType}
${analysis}`;

    const notes = await callClaude(apiKey, [{ role: 'user', content: notesPrompt }],
      'You are a precision note-taker. Clean, tight, actionable. No fluff.', 1200);

    const wordCount = notes.split(/\s+/).filter(Boolean).length;

    // Step 2 — Quality check
    let qualityScore = 0;
    let qualityFlags = [];

    if(wordCount < 100){ qualityFlags.push('Too short — under 100 words'); qualityScore -= 3; }
    if(!notes.includes('ACTIONABLE') && !notes.includes('ACTION')){ qualityFlags.push('Missing actionable steps'); qualityScore -= 2; }
    if(!notes.includes('⭐')){ qualityFlags.push('Missing key insight highlight'); qualityScore -= 1; }
    if(notes.includes('generic') || notes.includes('varies')){ qualityFlags.push('Contains generic language'); qualityScore -= 1; }

    qualityScore = Math.max(10 + qualityScore, 1);
    const passesQuality = qualityScore >= 6 && wordCount >= 100;

    console.log(`Noter done: words=${wordCount} quality=${qualityScore}/10 pass=${passesQuality}`);

    // Step 3 — Generate encyclopedia HTML entry
    const encPrompt = `Convert these notes into a clean HTML encyclopedia entry for RPGACE.

Use this exact structure:
<div class="enc-entry">
<h2>[Title]</h2>
<p class="enc-summary">[2 sentence summary]</p>
<div class="enc-meta">📁 [Type] | 📅 [Date]</div>
[Convert all sections using <h3>, <ul><li>, <strong> for key terms]
<div class="enc-highlight">⭐ [key insight]</div>
[Related: <a class="tag-link" href="#">topic</a> tags]
</div>

NOTES:
${notes.slice(0,3000)}`;

    const encHtml = await callClaude(apiKey, [{ role: 'user', content: encPrompt }],
      'Output clean HTML only. No markdown. No code fences.', 800);

    return res.status(200).json({
      success: true,
      notes,
      encHtml: encHtml.replace(/```html|```/g,'').trim(),
      wordCount,
      qualityScore,
      qualityFlags,
      passesQuality,
      title,
      detectedType
    });

  } catch(err){
    console.error('Noter error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
