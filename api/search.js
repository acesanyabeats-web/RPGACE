// /api/search — YouTube search without API key
// Uses YouTube's undocumented search endpoint + oEmbed for metadata

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).end();

  const { query } = req.body || {};
  if(!query) return res.status(400).json({ error: 'No query' });

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
