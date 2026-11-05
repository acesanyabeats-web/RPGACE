// /api/search — YouTube search without API key, plus (Sep 16 2026) a
// real recipe-photo lookup branch, dispatched by an optional `type`
// field (defaults to the original YouTube behavior for every existing
// caller, which never sends `type` at all — zero behavior change there).
// Uses YouTube's undocumented search endpoint + oEmbed for metadata
import { setCORS, requireAuth } from './_context.js';

// Nov 5 2026 (YR): Gemini watching a whole YouTube video can take a minute or two.
export const config = { maxDuration: 300 };

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if(req.method !== 'POST') return res.status(405).end();

  const { query, type, sort } = req.body || {};
  // YR (Nov 5 2026): Gemini watches one public YouTube video and answers the app's prompt (recipe / compare).
  if (type === 'video-read') return handleVideoRead(req.body || {}, res);
  if(!query) return res.status(400).json({ error: 'No query' });

  if (type === 'recipe-image') return handleRecipeImage(query, res);
  if (type === 'web') return handleWeb(query, res);

  try {
    // Fetch YouTube search page via server-side (avoids CORS)
    // Oct 10 2026 (D1 watchlist digest): optional sort:'date' = videos only,
    // newest first. Every existing caller sends no sort, so its URL is unchanged.
    const sp = sort === 'date' ? 'CAISAhAB' : 'EgIQAQ%3D%3D';
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${sp}`; // filter: videos only
    const r = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const html = await r.text();

    // Extract initial data JSON from YouTube page
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s);
    if(!match) throw new Error('Could not parse YouTube response');

    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer
      ?.primaryContents?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents || [];

    const videos = [];
    for(const item of contents){
      const vr = item.videoRenderer;
      if(!vr) continue;
      const id      = vr.videoId;
      const title   = vr.title?.runs?.[0]?.text || '';
      const channel = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
      const views   = vr.viewCountText?.simpleText || vr.viewCountText?.runs?.[0]?.text || '';
      const duration= vr.lengthText?.simpleText || '';
      const thumb   = vr.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
      const published = vr.publishedTimeText?.simpleText || '';
      if(id && title) videos.push({ id, title, channel, views, duration, thumb, published });
      if(videos.length >= 8) break;
    }

    if(!videos.length) return res.status(200).json({ videos: [], message: 'No results' });
    return res.status(200).json({ videos });

  } catch(e){
    console.error('Search error:', e.message);
    return res.status(500).json({ error: e.message, videos: [] });
  }
}

// Sep 16 2026 — real Alex ask ("recipes i choose should have a photo of
// the internet presented"), real /interrogation-confirmed shape: try a
// real keyed image-search API first (Unsplash — a free-tier service,
// key held server-side only, never shipped to the client, same secret
// discipline as LASTFM_API_KEY/RPGACE_API_SECRET), fall back to
// Wikipedia's free, keyless REST summary API when no key is configured
// or the keyed search finds nothing. Fails open to `{image:null}` on any
// real failure — a missing photo for an obscure generated dish name is
// an honest empty state, never a fake placeholder or a thrown 500.
async function handleRecipeImage(query, res) {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const r = await fetch(
        'https://api.unsplash.com/search/photos?per_page=1&query=' + encodeURIComponent(query + ' food dish'),
        { headers: { Authorization: 'Client-ID ' + unsplashKey } }
      );
      if (r.ok) {
        const data = await r.json();
        const hit = data.results && data.results[0];
        if (hit && hit.urls && hit.urls.small) {
          return res.status(200).json({ image: hit.urls.small, source: 'unsplash' });
        }
      }
    } catch (e) { /* real failure — fall through to the free fallback below */ }
  }
  try {
    const wr = await fetch(
      'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query),
      { headers: { 'User-Agent': 'RPGACE/1.0 (recipe photo lookup; acesanyabeats@gmail.com)' } }
    );
    if (wr.ok) {
      const wdata = await wr.json();
      if (wdata.thumbnail && wdata.thumbnail.source) {
        return res.status(200).json({ image: wdata.thumbnail.source, source: 'wikipedia' });
      }
    }
  } catch (e) { /* honest no-image response below */ }
  return res.status(200).json({ image: null });
}

// Oct 12 2026 — TP-2 of the ratified "Trips & Plans with Oracle" plan
// (records/2026-10/trips_plans_oracle_paranoia_ceo_2026-10-12.txt). Alex:
// "connect a free ai model that can search internet", "Both, Gemini first".
// Gemini 2.5 Flash with Google Search grounding (free AI Studio key), then
// Tavily (1,000 free searches/month) if Gemini has no key, errors or hits
// its free limit. Oct 12 2026, Alex: "skip tavily for now" - Tavily stays
// built but off (no TAVILY_API_KEY set); Gemini is the only live provider. Only the search question is sent - callers never put
// personal data in it (Gemini's free tier may use inputs to improve
// Google products). Never invents results: with no key or both providers
// failing it returns an error the app shows as-is.
async function handleWeb(query, res) {
  const q = String(query).slice(0, 500);
  const tried = [];
  // Vercel env names are case-sensitive; Alex saved it as "Gemini_API_Key" (Oct 12 2026), so accept both.
  const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
  // Nov 3 2026 (Alex: "Find links said web search not found"): Google retires model names, so try the
  // rolling alias first and older names after; a "not found" model moves on to the next one.
  const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of (geminiKey ? GEMINI_MODELS : [])) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: q + '\n\nAnswer from current web results. Be specific: names, dates, prices, addresses where known. Keep it under 250 words.' }] }],
          tools: [{ google_search: {} }],
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && d.error.message) || ('HTTP ' + r.status));
      const cand = (d.candidates || [])[0] || {};
      const answer = ((cand.content && cand.content.parts) || []).map(p => p.text || '').join('').trim();
      const chunks = (cand.groundingMetadata && cand.groundingMetadata.groundingChunks) || [];
      const sources = [];
      const seen = {};
      chunks.forEach(c => { const w = c.web || {}; if (w.uri && !seen[w.uri]) { seen[w.uri] = 1; sources.push({ title: w.title || w.uri, url: w.uri }); } });
      if (!answer) throw new Error('empty answer');
      return res.status(200).json({ provider: 'gemini', model, answer, sources: sources.slice(0, 8) });
    } catch (e) {
      tried.push('Gemini ' + model + ': ' + e.message);
      if (!/not found|not supported|404/i.test(e.message)) break;   // a key/quota problem won't be fixed by another model
    }
  }
  if (!geminiKey) tried.push('Gemini: no GEMINI_API_KEY');
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tavilyKey },
        body: JSON.stringify({ api_key: tavilyKey, query: q, max_results: 6, include_answer: true, search_depth: 'basic' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.detail && (d.detail.error || d.detail)) || d.error || ('HTTP ' + r.status));
      const sources = (d.results || []).map(x => ({ title: x.title || x.url, url: x.url, snippet: String(x.content || '').slice(0, 300) }));
      const answer = String(d.answer || '').trim() || sources.map(x => '- ' + x.title + ': ' + (x.snippet || '')).join('\n');
      if (!answer) throw new Error('no results');
      return res.status(200).json({ provider: 'tavily', answer, sources: sources.slice(0, 8) });
    } catch (e) {
      tried.push('Tavily: ' + e.message);
    }
  } else tried.push('Tavily: no TAVILY_API_KEY');
  const setup = !geminiKey && !tavilyKey;
  console.warn('[search web] failed:', tried.join(' | '));   // so Vercel runtime logs show why
  // The real reason goes in the message so the app's toast shows it (it used to say only 'Web search failed').
  return res.status(setup ? 503 : 502).json({ error: setup ? 'Web search is not set up yet (add GEMINI_API_KEY in Vercel)' : 'Web search failed: ' + tried.join(' | ').slice(0, 300), setup, tried });
}

// YR (Nov 5 2026, Alex: "I'd like gemini to look up youtube video and in take so it is what I ask for, these
// things need to be backed with youtube"): Gemini reads a public YouTube video directly (no cookies, no laptop)
// and answers the prompt the app sends. Only youtube.com / youtu.be links are accepted.
async function handleVideoRead(body, res) {
  const url = String(body.url || '').trim();
  const m = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if (!m) return res.status(400).json({ error: 'Not a YouTube video link' });
  const prompt = String(body.prompt || '').slice(0, 12000);
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
  if (!geminiKey) return res.status(503).json({ error: 'Gemini is not set up (add GEMINI_API_KEY in Vercel)' });
  const videoUrl = 'https://www.youtube.com/watch?v=' + m[1];
  const tried = [];
  for (const model of ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash']) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ file_data: { file_uri: videoUrl, mime_type: 'video/*' } }, { text: prompt }] }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.2, responseMimeType: 'application/json' }
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d && d.error && d.error.message) || ('HTTP ' + r.status));
      const text = ((d.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) throw new Error('empty reply' + (d.candidates?.[0]?.finishReason ? ' (' + d.candidates[0].finishReason + ')' : ''));
      return res.status(200).json({ provider: 'gemini', model, url: videoUrl, text });
    } catch (e) {
      tried.push(model + ': ' + e.message);
      if (!/not found|not supported|404/i.test(e.message)) break;
    }
  }
  console.warn('[search video-read] failed:', tried.join(' | '));
  return res.status(502).json({ error: 'Gemini could not read the video: ' + tried.join(' | ').slice(0, 300) });
}
