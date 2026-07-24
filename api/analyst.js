// AGENT 2 — CONTENT ANALYST
// Job: Deep analysis of content based on its type
// Cannot: save data, fire Composio, format final notes
import { setCORS, callClaude, RPGACE_CONTEXT } from './_context.js';

const TYPE_PROMPTS = {
  music: `You are an expert music production analyst.
Analyse this content and extract:
## GENRE & STYLE — genre, subgenre, mood, era, influences
## PRODUCTION TECHNIQUES — specific methods, sound design, mixing, DAW workflows, plugins
## SONG STRUCTURE — intro, verse, chorus, bridge, drops, transitions
## SONIC ELEMENTS — drums, bass, melody, harmony, fx, vocals, sampling
## TOOLS MENTIONED — software, hardware, plugins, samples
## SKILL LEVEL — Beginner/Intermediate/Advanced and why
## KEY LEARNINGS — what to study and replicate`,

  food: `You are a professional chef and nutrition educator.
Analyse this content and extract:
## DISH OVERVIEW — name, cuisine, occasion, difficulty
## INGREDIENTS — full list with quantities and substitutions
## METHOD — step-by-step technique
## COOKING SCIENCE — why each technique works
## NUTRITION — macros, key nutrients, dietary notes
## FLAVOUR PRINCIPLES — seasoning logic, balance
## CHEF TIPS — pro shortcuts, common mistakes to avoid
## VARIATIONS — how to adapt the recipe`,

  tech: `You are a senior AI and tech educator.
Analyse this content and extract:
## CORE CONCEPT — what technology or tool is this about
## HOW IT WORKS — clear technical explanation
## USE CASES — real applications for creators and developers
## TOOLS & PLATFORMS — specific software, APIs, services
## WORKFLOW INTEGRATION — how to add this to a creator workflow
## SKILL REQUIREMENTS — what you need to know first
## COST & ACCESS — free tiers, pricing, limitations
## KEY TAKEAWAYS — most important insights`,

  fitness: `You are an elite personal trainer and sports nutritionist.
Analyse this content and extract:
## EXERCISE OVERVIEW — what is being trained and why
## MOVEMENT BREAKDOWN — form cues, muscle activation, common mistakes
## PROGRAMMING — sets, reps, rest, frequency, progression
## SCIENCE — why this works physiologically
## NUTRITION LINKS — diet considerations
## RECOVERY — sleep, stretching, mobility advice
## EQUIPMENT — what is needed vs optional
## BEGINNER MODIFICATIONS — how to scale safely`,

  social: `You are a top social media strategist.
Analyse this content and extract:
## PLATFORM — where this content lives and why it works there
## HOOK ANALYSIS — opening strategy, why it stops the scroll
## CONTENT STRUCTURE — how it is built start to finish
## ENGAGEMENT TACTICS — CTAs, questions, community triggers
## VISUAL STRATEGY — colours, format, thumbnails, aesthetic
## CAPTION FORMULA — tone, length, hashtags
## ALGORITHM SIGNALS — what boosts reach
## AUDIENCE PSYCHOLOGY — why this resonates`,

  article: `You are an expert knowledge curator.
Analyse this content and extract:
## CORE ARGUMENT — main thesis or point
## KEY EVIDENCE — data, examples, case studies
## METHODS & FRAMEWORKS — models or systems described
## EXPERT INSIGHTS — notable positions paraphrased
## COUNTERARGUMENTS — what pushes back on this view
## PRACTICAL APPLICATIONS — how to apply this knowledge
## CONNECTED TOPICS — what else to study alongside this
## CREDIBILITY — how reliable and current is this source`,

  general: `You are a comprehensive knowledge analyst.
Analyse this content and extract:
## WHAT IS THIS — type, main subject, purpose
## KEY CONCEPTS — main ideas and frameworks
## METHODS & TECHNIQUES — any how-to or skill described
## INSIGHTS & LESSONS — what can be learned and applied
## CONNECTIONS — links to music production, content creation, fitness or cooking
## TOOLS & RESOURCES — platforms or resources mentioned
## DIFFICULTY & AUDIENCE — who this is for and what level`
};

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if(!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { content, detectedType, title, imageData, imageType } = body;

    if(!content && !imageData) throw new Error('No content provided to analyst');

    const typePrompt = TYPE_PROMPTS[detectedType] || TYPE_PROMPTS.general;
    const analysisPrompt = `${RPGACE_CONTEXT}

${typePrompt}

Be thorough, specific and practical. This feeds into a personal knowledge base for Alex — 
an aspiring music producer and content creator. Every insight should be actionable.

CONTENT TITLE: ${title}
CONTENT TO ANALYSE:
${content ? content.slice(0, 6000) : '[Image provided]'}`;

    let messages;
    if(imageData){
      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageType, data: imageData } },
          { type: 'text', text: analysisPrompt }
        ]
      }];
    } else {
      messages = [{ role: 'user', content: analysisPrompt }];
    }

    const system = `You are a specialist ${detectedType} content analyst. 
Be deeply specific — generic advice has zero value here. 
Every section must contain concrete, actionable information.`;

    const analysis = await callClaude(apiKey, messages, system, 1500);
    const wordCount = analysis.split(/\s+/).filter(Boolean).length;

    console.log(`Analyst done: type=${detectedType} words=${wordCount}`);

    return res.status(200).json({
      success: true,
      analysis,
      wordCount,
      detectedType,
      title
    });

  } catch(err) {
    console.error('Analyst error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
