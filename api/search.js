// /api/search — YouTube search without API key, plus (Sep 16 2026) a
// real recipe-photo lookup branch, dispatched by an optional `type`
// field (defaults to the original YouTube behavior for every existing
// caller, which never sends `type` at all — zero behavior change there).
// Uses YouTube's undocumented search endpoint + oEmbed for metadata
import { setCORS, requireAuth } from './_context.js';

export default async function handler(req, res){
  setCORS(res);
  if(req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if(req.method !== 'POST') return res.status(405).end();

  const { query, type } = req.body || {};
  if(!query) return res.status(400).json({ error: 'No query' });

  if (type === 'recipe-image') return handleRecipeImage(query, res);

  try {
    // Fetch YouTube search page via server-side (avoids CORS)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`; // filter: videos only
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
      if(id && title) videos.push({ id, title, channel, views, duration, thumb });
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
