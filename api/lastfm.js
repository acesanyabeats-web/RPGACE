// LASTFM — Artist discovery via tag and style matching
import { setCORS, requireAuth } from './_context.js';

const BASE = 'https://ws.audioscrobbler.com/2.0/';

async function lfm(params) {
  const url = new URL(BASE);
  const key = process.env.LASTFM_API_KEY;
  Object.assign(params, { api_key: key, format: 'json' });
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error('Last.fm HTTP ' + r.status);
  return r.json();
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const key = process.env.LASTFM_API_KEY;
    if (!key) throw new Error('LASTFM_API_KEY not configured');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, tags, artist, limit } = body;

    // Search artists by tags
    if (action === 'search_by_tags') {
      if (!tags || tags.length === 0) throw new Error('No tags provided');
      var allArtists = {};

      // Run parallel searches for each tag
      var searches = tags.map(function(tag) {
        return lfm({ method: 'tag.gettopartists', tag: tag, limit: limit || 50 })
          .then(function(data) {
            var artists = (data.topartists && data.topartists.artist) || [];
            if (!Array.isArray(artists)) artists = [artists];
            artists.forEach(function(a) {
              var name = a.name;
              if (!allArtists[name]) {
                allArtists[name] = {
                  name: name,
                  url: a.url,
                  listeners: parseInt(a.listeners) || 0,
                  tags: [],
                  mbid: a.mbid || ''
                };
              }
              allArtists[name].tags.push(tag);
            });
          })
          .catch(function() {}); // silently skip failed tag searches
      });

      await Promise.all(searches);

      // Sort by listener count descending
      var sorted = Object.values(allArtists).sort(function(a, b) {
        return b.listeners - a.listeners;
      });

      // Deduplicate by name (case-insensitive)
      var seen = {};
      var unique = sorted.filter(function(a) {
        var key = a.name.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      return res.status(200).json({
        success: true,
        artists: unique,
        total: unique.length
      });
    }

    // Get similar artists
    if (action === 'get_similar') {
      if (!artist) throw new Error('No artist provided');
      var data = await lfm({ method: 'artist.getsimilar', artist: artist, limit: limit || 30 });
      var similar = (data.similarartists && data.similarartists.artist) || [];
      if (!Array.isArray(similar)) similar = [similar];
      return res.status(200).json({
        success: true,
        artists: similar.map(function(a) {
          return {
            name: a.name,
            url: a.url,
            match: parseFloat(a.match) || 0,
            mbid: a.mbid || ''
          };
        })
      });
    }

    // Get artist info (listeners, bio, top tracks)
    if (action === 'get_artist_info') {
      if (!artist) throw new Error('No artist provided');
      var [info, tracks] = await Promise.all([
        lfm({ method: 'artist.getinfo', artist: artist }),
        lfm({ method: 'artist.gettoptracks', artist: artist, limit: 3 })
      ]);
      var a = info.artist || {};
      var topTracks = (tracks.toptracks && tracks.toptracks.track) || [];
      if (!Array.isArray(topTracks)) topTracks = [topTracks];
      return res.status(200).json({
        success: true,
        artist: {
          name: a.name,
          listeners: parseInt((a.stats && a.stats.listeners) || 0),
          playcount: parseInt((a.stats && a.stats.playcount) || 0),
          bio: a.bio && a.bio.summary ? a.bio.summary.replace(/<[^>]+>/g, '').slice(0, 300) : '',
          tags: ((a.tags && a.tags.tag) || []).map(function(t) { return t.name; }),
          url: a.url,
          topTracks: topTracks.slice(0, 3).map(function(t) {
            return { name: t.name, playcount: parseInt(t.playcount) || 0, url: t.url };
          })
        }
      });
    }

    // Get tag info for validation
    if (action === 'get_tag_artists') {
      if (!tags) throw new Error('No tag provided');
      var data = await lfm({ method: 'tag.gettopartists', tag: tags, limit: limit || 50 });
      var artists = (data.topartists && data.topartists.artist) || [];
      if (!Array.isArray(artists)) artists = [artists];
      return res.status(200).json({ success: true, artists: artists, tag: tags });
    }

    throw new Error('Unknown action: ' + action);

  } catch (err) {
    console.error('[lastfm] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
