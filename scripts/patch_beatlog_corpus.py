src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _searchArtists: function(tags, form, palette, output) {
    var self = this;
    output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">🔍 Searching Last.fm for artist matches across ' + tags.length + ' style tags...</div>';

    fetch('/api/lastfm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search_by_tags', tags: tags, limit: 50 })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) throw new Error(data.error || 'Last.fm search failed');
      var artists = data.artists || [];
      output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">✅ Found ' + artists.length + ' unique artists. Analysing with Oracle...</div>';

      // Add new artists to Phylum XVII (Fons Educationis) in taxonomy
      self._addNewArtistsToTaxonomy(artists, form.mood);

      // Split into tiers
      var big      = artists.filter(function(a) { return a.listeners > 1000000; }).slice(0, 5);
      var emerging = artists.filter(function(a) { return a.listeners > 10000 && a.listeners <= 1000000; }).slice(0, 10);
      var underground = artists.filter(function(a) { return a.listeners <= 10000; }).slice(0, 5);

      // Ask Oracle to analyse and generate outputs
      self._generateOutputs(form, palette, big, emerging, underground, output);
    })
    .catch(function(err) {
      output.innerHTML = '<div style="color:#E25454;font-size:12px;padding:8px 0;">Last.fm error: ' + err.message + '</div>';
    });
  },"""

new = """  _searchArtists: function(tags, form, palette, output) {
    var self = this;
    output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">🔍 Checking reference corpus for matches...</div>';

    // First: check reference corpus for BPM/mood/scale matches
    var corpusPromise = (RPGACE.modules.refCorpus && typeof RPGACE.modules.refCorpus.findMatches === 'function')
      ? RPGACE.modules.refCorpus.findMatches(form.bpm, form.mood, form.scale, form.energy)
      : Promise.resolve([]);

    corpusPromise.then(function(corpusMatches) {
      var hasCorpus = corpusMatches && corpusMatches.length > 0;

      if (hasCorpus) {
        output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">✅ Found ' + corpusMatches.length + ' corpus matches. Cross-referencing Last.fm...</div>';
      } else {
        output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">📚 No corpus matches yet. Searching Last.fm across ' + tags.length + ' style tags...</div>';
      }

      // Run Last.fm search in parallel
      return fetch('/api/lastfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_by_tags', tags: tags, limit: 50 })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lfmArtists = (data.success && data.artists) ? data.artists : [];

        // If we have corpus matches, use them to filter/rank Last.fm results
        var big = [], emerging = [], underground = [];

        if (hasCorpus) {
          // Extract unique artist names from corpus matches
          var corpusArtistNames = {};
          corpusMatches.forEach(function(track) {
            if (!corpusArtistNames[track.artist]) {
              corpusArtistNames[track.artist] = {
                name: track.artist,
                score: track._score,
                refTrack: track.title,
                bpm: track.bpm,
                mood: track.mood,
                listeners: 0
              };
            }
          });

          // Enrich corpus artists with Last.fm listener counts where available
          lfmArtists.forEach(function(lfm) {
            var key = lfm.name.toLowerCase();
            Object.keys(corpusArtistNames).forEach(function(name) {
              if (name.toLowerCase() === key) {
                corpusArtistNames[name].listeners = lfm.listeners || 0;
                corpusArtistNames[name].url = lfm.url;
              }
            });
          });

          var corpusArtists = Object.values(corpusArtistNames).sort(function(a,b) { return b.score - a.score; });

          // Also include relevant Last.fm artists not in corpus
          var corpusNames = Object.keys(corpusArtistNames).map(function(n) { return n.toLowerCase(); });
          var extraLfm = lfmArtists.filter(function(a) {
            return !corpusNames.includes(a.name.toLowerCase()) && a.listeners > 50000;
          }).slice(0, 5);

          big = corpusArtists.filter(function(a) { return a.listeners > 1000000; }).slice(0, 5);
          emerging = corpusArtists.filter(function(a) { return a.listeners <= 1000000; }).concat(extraLfm).slice(0, 10);
          underground = [];

          output.innerHTML = '<div style="color:rgba(74,144,226,0.8);font-size:12px;padding:8px 0;">🎯 ' + corpusMatches.length + ' corpus matches · ' + lfmArtists.length + ' Last.fm artists · Generating outputs...</div>';
        } else {
          // No corpus — use Last.fm only
          self._addNewArtistsToTaxonomy(lfmArtists, form.mood);
          big        = lfmArtists.filter(function(a) { return a.listeners > 1000000; }).slice(0, 5);
          emerging   = lfmArtists.filter(function(a) { return a.listeners > 10000 && a.listeners <= 1000000; }).slice(0, 10);
          underground = lfmArtists.filter(function(a) { return a.listeners <= 10000; }).slice(0, 5);
          output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">✅ ' + lfmArtists.length + ' Last.fm artists found. Add tracks to your corpus for better matches.</div>';
        }

        self._generateOutputs(form, palette, big, emerging, underground, output);
      });
    })
    .catch(function(err) {
      output.innerHTML = '<div style="color:#E25454;font-size:12px;padding:8px 0;">Search error: ' + err.message + '</div>';
    });
  },"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: beatLog now uses refCorpus first, Last.fm as fallback")
else:
    print("ERROR: anchor not found")
