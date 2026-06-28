src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old_map = """  PHYLUM_MAP: [
    [1,  'Compositio',          'Melody, harmony, chord progressions, scales, song structure'],
    [2,  'Percussio',           'Drum programming, groove, 808 design, hi-hat patterns, UK drill rhythms'],
    [3,  'Sonus Designatio',    'Sound design, synthesis, sampling, foley, textural layers'],
    [4,  'Mixtura',             'Mixing: EQ, compression, saturation, sidechain, spatial placement'],
    [5,  'Magistra',            'Mastering: LUFS targets, limiting, stem mastering, streaming loudness'],
    [6,  'Instrumentarium',     'FL Studio, VSTs, hardware controllers, DAW workflow efficiency'],
    [7,  'Negotium',            'Licensing, contracts, publishing splits, work-for-hire clauses'],
    [8,  'Historia',            'Producer history corpus — Golden Era through UK, French rap, Russian trap'],
    [9,  'Psychologia',         'Creative psychology, flow state, anti-procrastination, artist identity'],
    [10, 'Technologia',         'AI tools, automation, content intelligence, production tech stack'],
    [11, 'Lingua Musicae',      'Scale to colour palette map, visual language of music theory'],
    [12, 'Contentum',           'YouTube tutorials, Instagram Reels, hooks, thumbnails, titles, scripts'],
    [13, 'Collaboratio',        'A&R outreach, collab strategy, community building, cold email'],
    [14, 'Sensus Auris',        'Critical listening, reference track analysis, A/B comparison'],
    [15, 'Anatomia',            'Music theory fundamentals: intervals, modes, voice leading, tension'],
    [16, 'Venditionis Beatorum','Beat selling: Beatstars, pricing, lease vs exclusive, UK regional advantages'],
    [17, 'Fons Educationis',    'Source database: artists and YouTube educators per node'],
    [18, 'Referentia Mercati',  'Trend intelligence, competitive analysis, regional market gaps'],
    [25, 'Visio Cinematica',    'Filmmaker library, Neural Frames briefs, colour grading, camera grammar'],
  ],"""

new_map = """  // DOMAIN A — CRAFT (I–VIII): the making
  // DOMAIN B — KNOWLEDGE (IX–XII): what you learn
  // DOMAIN C — CONTENT (XIII–XV): what you make public
  // DOMAIN D — BUSINESS (XVI–XIX): how you earn
  // DOMAIN E — SYSTEMS (XX–XXI): infrastructure + overflow
  PHYLUM_MAP: [
    // DOMAIN A — CRAFT
    [1,  'Compositio',           'melody harmony chord progression scale mode song structure arrangement motif theme key signature time signature'],
    [2,  'Percussio',            'drum kick snare hi-hat 808 groove pattern percussion rhythm loop break clap trap drill percussion programming'],
    [3,  'Sonus Designatio',     'sound design synthesis synthesizer sampler sampling foley texture layer patch preset timbre oscillator wavetable fm am'],
    [4,  'Mixtura',              'mix mixing eq equaliser equalizer compression compressor sidechain saturation reverb delay stereo width pan balance level gain frequency spectrum masking'],
    [5,  'Magistra',             'master mastering lufs loudness limiter limiting stem streaming export final chain buss glue true peak'],
    [6,  'Instrumentarium',      'fl studio daw plugin vst instrument workflow midi controller keyboard pad launchpad template project channel rack mixer playlist'],
    [7,  'Sensus Auris',         'listening critical ear reference a/b compare analysis frequency spectrum monitor speaker headphone hearing training ear'],
    [8,  'Anatomia',             'theory interval mode scale degree triad seventh chord voice leading tension resolution counterpoint circle fifth cadence'],
    // DOMAIN B — KNOWLEDGE
    [9,  'Historia',             'producer history era golden boom bap trap drill afrobeats west coast south atlanta uk french russian influence inspiration legacy sample'],
    [10, 'Psychologia',          'psychology flow state creativity block procrastination identity mindset habit routine discipline motivation artist persona brand vision'],
    [11, 'Lingua Musicae',       'colour palette visual music language scale colour map mood emotion tone aesthetic feel cinematic dark light warm cold'],
    [12, 'Fons Educationis',     'educator teacher tutorial youtube resource course learning study guide lesson explanation breakdown source reference mentor'],
    // DOMAIN C — CONTENT
    [13, 'Contentum',            'youtube tutorial instagram reels shorts hook thumbnail title caption script content creator post video upload audience watch time retention algorithm'],
    [14, 'Visio Cinematica',     'filmmaker director visual treatment neural frames storyboard shot camera movement colour grade cinematography mood board brief video production'],
    [15, 'Collaboratio',         'collab collaboration outreach network community email cold pitch feature verse producer artist relationship contact connect'],
    // DOMAIN D — BUSINESS
    [16, 'Venditionis Beatorum', 'beat selling beatstars airbit price lease exclusive licence non-exclusive premium uk drill trap sell store catalogue listing'],
    [17, 'Negotium',             'contract publishing rights split work for hire copyright ownership royalty publishing deal sync licence agreement clause'],
    [18, 'Distributio',          'distribution distrokid routenote prs content id fingerprint streaming spotify apple tidal release upload distribute royalty collect'],
    [19, 'Referentia Mercati',   'trend market competitive analysis region gap opportunity niche demand search volume trend report intelligence competitor'],
    // DOMAIN E — SYSTEMS
    [20, 'Technologia',          'ai automation rpgace composio supabase vercel n8n pipeline workflow tool system api integration build deploy code script'],
    [21, 'Miscellaneous Ordinanda', 'misc unsorted uncategorised general note insight observation todo review'],
  ],"""

if old_map in src:
    fixed = src.replace(old_map, new_map, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: PHYLUM_MAP updated with 21-phylum restructure")
else:
    print("ERROR: PHYLUM_MAP anchor not found. Check rpgace_core.js.")
