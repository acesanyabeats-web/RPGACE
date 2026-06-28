src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  // Mood → genre tags for Last.fm
  MOOD_TAGS: {
    'Dark':          ['uk drill', 'dark trap', 'dark hip hop', 'uk rap'],
    'Aggressive':    ['drill', 'trap', 'grime', 'uk drill'],
    'Cinematic':     ['cinematic hip hop', 'boom bap', 'atmospheric', 'orchestral hip hop'],
    'Melancholic':   ['sad rap', 'emo rap', 'melodic rap', 'uk rap'],
    'Euphoric':      ['melodic trap', 'afrobeats', 'pop rap', 'uplifting'],
    'Calm':          ['lo-fi hip hop', 'chillhop', 'jazz rap', 'boom bap'],
    'Energetic':     ['trap', 'drill', 'club', 'hype'],
    'Romantic':      ['r&b', 'soul', 'neo soul', 'melodic r&b'],
    'Nostalgic':     ['boom bap', 'old school hip hop', 'soul', 'jazz rap'],
    'Tense':         ['dark trap', 'drill', 'horror rap', 'aggressive'],
  },"""

new = """  // BPM-aware mood → genre tags for Last.fm
  // Tags are selected based on both mood AND bpm range
  _getMoodTags: function(mood, bpm) {
    var b = parseInt(bpm) || 130;
    var slow = b < 100;   // 60-99 BPM — uk rap, conscious, melodic, soul
    var mid  = b < 120;   // 100-119 BPM — trap soul, melodic trap, transitional
    // fast = 120+ BPM — drill, trap, grime, club

    var map = {
      'Dark': slow ? ['uk rap', 'conscious hip hop', 'dark hip hop', 'melodic rap', 'british hip hop']
                   : mid  ? ['dark trap', 'melodic trap', 'trap soul', 'dark hip hop']
                          : ['uk drill', 'dark trap', 'dark hip hop', 'drill'],

      'Aggressive': slow ? ['uk rap', 'grime', 'british hip hop', 'underground hip hop']
                         : mid  ? ['trap', 'aggressive hip hop', 'grime']
                                : ['uk drill', 'drill', 'grime', 'trap'],

      'Cinematic': slow ? ['cinematic hip hop', 'atmospheric', 'orchestral hip hop', 'neo soul', 'conscious hip hop']
                        : mid  ? ['cinematic hip hop', 'boom bap', 'atmospheric']
                               : ['cinematic hip hop', 'orchestral hip hop', 'atmospheric'],

      'Melancholic': slow ? ['uk rap', 'sad rap', 'melodic rap', 'conscious hip hop', 'neo soul']
                          : mid  ? ['sad rap', 'melodic trap', 'emo rap', 'trap soul']
                                 : ['emo rap', 'melodic trap', 'sad rap'],

      'Euphoric': slow ? ['neo soul', 'r&b', 'soul', 'afrobeats']
                       : mid  ? ['melodic trap', 'afrobeats', 'pop rap']
                              : ['afrobeats', 'pop rap', 'melodic trap', 'club'],

      'Calm': slow ? ['lo-fi hip hop', 'jazz rap', 'chillhop', 'neo soul', 'conscious hip hop']
                   : mid  ? ['chillhop', 'lo-fi hip hop', 'boom bap']
                          : ['boom bap', 'lo-fi hip hop', 'chillhop'],

      'Energetic': slow ? ['uk rap', 'grime', 'british hip hop']
                        : mid  ? ['trap', 'hype', 'club']
                               : ['drill', 'trap', 'club', 'hype', 'uk drill'],

      'Romantic': slow ? ['r&b', 'neo soul', 'soul', 'melodic r&b', 'contemporary r&b']
                       : mid  ? ['r&b', 'trap soul', 'melodic r&b']
                              : ['melodic trap', 'trap soul', 'r&b'],

      'Nostalgic': slow ? ['boom bap', 'old school hip hop', 'soul', 'jazz rap', 'conscious hip hop']
                        : mid  ? ['boom bap', 'old school hip hop', 'soul']
                               : ['boom bap', 'old school hip hop', 'jazz rap'],

      'Tense': slow ? ['dark hip hop', 'conscious hip hop', 'uk rap', 'underground hip hop']
                    : mid  ? ['dark trap', 'aggressive hip hop', 'trap']
                           : ['dark trap', 'drill', 'aggressive hip hop'],
    };
    return map[mood] || ['hip hop', 'uk hip hop', 'british hip hop'];
  },

  // Keep for backwards compat
  MOOD_TAGS: {
    'Dark': ['uk rap', 'dark hip hop'], 'Aggressive': ['drill', 'grime'],
    'Cinematic': ['cinematic hip hop'], 'Melancholic': ['uk rap', 'sad rap'],
    'Euphoric': ['afrobeats'], 'Calm': ['lo-fi hip hop', 'jazz rap'],
    'Energetic': ['trap', 'drill'], 'Romantic': ['r&b', 'neo soul'],
    'Nostalgic': ['boom bap'], 'Tense': ['dark trap', 'drill'],
  },"""

if old in src:
    fixed = src.replace(old, new, 1)

    # Update _searchArtists to use _getMoodTags instead of MOOD_TAGS
    old2 = """    // 6. Get Last.fm artist tags from mood
    var tags = self.MOOD_TAGS[form.mood] || ['hip hop', 'uk hip hop'];

    // Search Last.fm
    self._searchArtists(tags, form, palette, output);"""

    new2 = """    // 6. Get BPM-aware Last.fm tags
    var tags = self._getMoodTags(form.mood, form.bpm);

    // Search Last.fm
    self._searchArtists(tags, form, palette, output);"""

    if old2 in fixed:
        fixed = fixed.replace(old2, new2, 1)
        open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
        print("PATCHED: BPM-aware tag selection + _getMoodTags function added")
    else:
        open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
        print("PATCHED: MOOD_TAGS replaced but _searchArtists anchor not found")
else:
    print("ERROR: MOOD_TAGS anchor not found")
