/* ===MODULE:beatLog=== */
RPGACE.register('beatLog', {

  // Colour palette by scale (Phylum XI — Lingua Musicae)
  SCALE_COLOURS: {
    'Minor':         { hex: '#1a3a5c', name: 'Cold midnight blue',    rgb: '26,58,92' },
    'Dorian':        { hex: '#2d1b4e', name: 'Deep purple',           rgb: '45,27,78' },
    'Phrygian':      { hex: '#1a0a2e', name: 'Void black-purple',     rgb: '26,10,46' },
    'Lydian':        { hex: '#4a3000', name: 'Warm amber gold',       rgb: '74,48,0'  },
    'Mixolydian':    { hex: '#1a3320', name: 'Forest green',          rgb: '26,51,32' },
    'Major':         { hex: '#3d2a00', name: 'Sunrise gold',          rgb: '61,42,0'  },
    'Locrian':       { hex: '#2a0a0a', name: 'Dark crimson',          rgb: '42,10,10' },
    'Minor Pentatonic': { hex: '#0d2233', name: 'Steel blue',         rgb: '13,34,51' },
    'Major Pentatonic': { hex: '#2d3a00', name: 'Olive gold',         rgb: '45,58,0'  },
    'Blues':         { hex: '#1a1a33', name: 'Indigo night',          rgb: '26,26,51' },
  },

  // Mood → genre tags for Last.fm
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
  },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 900);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._inject(); }, 400);
      }
    });
  },

  _inject: function() {
    if (document.getElementById('beat-log-panel')) return;
    var self = this;

    // Find the research page container
    var page = document.getElementById('page-research') ||
               document.getElementById('page-learning') ||
               document.querySelector('[id*="research"]') ||
               document.querySelector('[id*="learning"]');
    if (!page) return;

    // Find Video Workshop section (section 3) to inject before it
    var sections = page.querySelectorAll('.section-title, h2, h3');
    var videoSection = Array.from(sections).find(function(s) {
      return s.textContent.includes('VIDEO WORKSHOP') || s.textContent.includes('Video Workshop');
    });

    var panel = document.createElement('div');
    panel.id = 'beat-log-panel';
    panel.style.cssText = 'background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;';

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    var title = document.createElement('div');
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Beat Log · Phylum XVI';
    var titleText = document.createElement('div');
    titleText.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;';
    titleText.textContent = 'Log a Beat';
    title.appendChild(eyebrow); title.appendChild(titleText);
    hdr.appendChild(title);
    panel.appendChild(hdr);

    // Form grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';

    var fields = [
      { id: 'bl-title',    label: 'Beat Title',  type: 'text',   placeholder: 'e.g. Midnight Cipher' },
      { id: 'bl-key',      label: 'Key',          type: 'text',   placeholder: 'e.g. D' },
      { id: 'bl-bpm',      label: 'BPM',          type: 'number', placeholder: 'e.g. 140' },
      { id: 'bl-scale',    label: 'Scale',        type: 'select', options: Object.keys(self.SCALE_COLOURS) },
      { id: 'bl-energy',   label: 'Energy (1-5)', type: 'select', options: ['1 — Sketch','2 — Draft','3 — Solid','4 — Strong','5 — Fire'] },
      { id: 'bl-mood',     label: 'Mood',         type: 'select', options: Object.keys(self.MOOD_TAGS) },
    ];

    fields.forEach(function(f) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.textContent = f.label;
      lbl.style.cssText = 'display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var inp;
      if (f.type === 'select') {
        inp = document.createElement('select');
        var blank = document.createElement('option');
        blank.value = ''; blank.textContent = '— select —';
        inp.appendChild(blank);
        f.options.forEach(function(o) {
          var opt = document.createElement('option');
          opt.value = o; opt.textContent = o;
          inp.appendChild(opt);
        });
      } else {
        inp = document.createElement('input');
        inp.type = f.type;
        inp.placeholder = f.placeholder || '';
      }
      inp.id = f.id;
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(lbl); wrap.appendChild(inp);
      grid.appendChild(wrap);
    });
    panel.appendChild(grid);

    // Taxonomy nodes multi-select
    var taxWrap = document.createElement('div');
    taxWrap.style.cssText = 'margin-bottom:14px;';
    var taxLbl = document.createElement('div');
    taxLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:8px;';
    taxLbl.textContent = 'Taxonomy Nodes Applied';
    var taxGrid = document.createElement('div');
    taxGrid.id = 'bl-tax-grid';
    taxGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    taxWrap.appendChild(taxLbl); taxWrap.appendChild(taxGrid);
    panel.appendChild(taxWrap);

    // Load taxonomy nodes
    RPGACE.sb.select('taxonomy_nodes', 'order=phylum_number.asc&limit=50')
      .then(function(nodes) {
        (nodes || []).forEach(function(node) {
          var chip = document.createElement('button');
          chip.dataset.nodeId = node.id;
          chip.dataset.concept = node.concept;
          chip.textContent = node.concept.slice(0, 30) + (node.concept.length > 30 ? '…' : '');
          chip.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.5);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;transition:all .15s;';
          chip.onclick = function() {
            var active = chip.dataset.active === '1';
            chip.dataset.active = active ? '0' : '1';
            chip.style.background = active ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.12)';
            chip.style.borderColor = active ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.4)';
            chip.style.color = active ? 'rgba(226,226,236,0.5)' : '#C9A84C';
          };
          taxGrid.appendChild(chip);
        });
      }).catch(function() {});

    // Extra fields row
    var extraGrid = document.createElement('div');
    extraGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;';

    var extraFields = [
      { id: 'bl-rating',    label: 'Beat Rating (★)',    type: 'select', options: ['★','★★','★★★','★★★★','★★★★★'] },
      { id: 'bl-licence',   label: 'Licence Type',       type: 'select', options: ['Lease only','Exclusive available','Sync ready','All types'] },
      { id: 'bl-collab',    label: 'Collab Ready',       type: 'select', options: ['No','Yes — DM me','Yes — email only'] },
    ];
    extraFields.forEach(function(f) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.textContent = f.label;
      lbl.style.cssText = 'display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var sel = document.createElement('select');
      sel.id = f.id;
      var blank = document.createElement('option'); blank.value=''; blank.textContent='— select —';
      sel.appendChild(blank);
      f.options.forEach(function(o) {
        var opt = document.createElement('option'); opt.value=o; opt.textContent=o; sel.appendChild(opt);
      });
      sel.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(lbl); wrap.appendChild(sel);
      extraGrid.appendChild(wrap);
    });

    // Reference track + sample flag
    var refWrap = document.createElement('div');
    refWrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;';
    ['bl-ref-track','bl-fl-path'].forEach(function(id, i) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.textContent = i === 0 ? 'Reference Track / Inspiration' : 'FL Studio Project Path (optional)';
      lbl.style.cssText = 'display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var inp = document.createElement('input');
      inp.id = id; inp.type = 'text';
      inp.placeholder = i === 0 ? 'e.g. Central Cee — Obsessed With You' : 'e.g. C:\\Beats\\midnight_cipher.flp';
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      wrap.appendChild(lbl); wrap.appendChild(inp);
      refWrap.appendChild(wrap);
    });

    panel.appendChild(extraGrid);
    panel.appendChild(refWrap);

    // Sample clearance checkbox
    var sampleRow = document.createElement('div');
    sampleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    var sampleCb = document.createElement('input');
    sampleCb.type = 'checkbox'; sampleCb.id = 'bl-sample';
    var sampleLbl = document.createElement('label');
    sampleLbl.htmlFor = 'bl-sample';
    sampleLbl.textContent = 'Contains uncleared sample';
    sampleLbl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);cursor:pointer;';
    sampleRow.appendChild(sampleCb); sampleRow.appendChild(sampleLbl);
    panel.appendChild(sampleRow);

    // Action buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    var logBtn = document.createElement('button');
    logBtn.textContent = '⚡ Log Beat + Find Artists';
    logBtn.style.cssText = 'padding:10px 20px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    logBtn.onclick = function() { self._submit(); };

    var clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    clearBtn.onclick = function() { self._clearForm(); };

    btnRow.appendChild(logBtn); btnRow.appendChild(clearBtn);
    panel.appendChild(btnRow);

    // Output area
    var output = document.createElement('div');
    output.id = 'beat-log-output';
    output.style.cssText = 'margin-top:16px;display:none;';
    panel.appendChild(output);

    // Insert into page
    if (videoSection && videoSection.parentElement) {
      videoSection.parentElement.insertBefore(panel, videoSection);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    console.log('[RPGACE:beatLog] Panel injected');
  },

  _getForm: function() {
    var get = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var activeTax = Array.from(document.querySelectorAll('#bl-tax-grid button[data-active="1"]'))
      .map(function(b) { return b.dataset.concept; });
    return {
      title:    get('bl-title'),
      key:      get('bl-key'),
      bpm:      get('bl-bpm'),
      scale:    get('bl-scale'),
      energy:   get('bl-energy'),
      mood:     get('bl-mood'),
      rating:   get('bl-rating'),
      licence:  get('bl-licence'),
      collab:   get('bl-collab'),
      refTrack: get('bl-ref-track'),
      flPath:   get('bl-fl-path'),
      sample:   document.getElementById('bl-sample') ? document.getElementById('bl-sample').checked : false,
      taxNodes: activeTax,
    };
  },

  _clearForm: function() {
    ['bl-title','bl-key','bl-bpm','bl-scale','bl-energy','bl-mood','bl-rating','bl-licence','bl-collab','bl-ref-track','bl-fl-path'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('#bl-tax-grid button[data-active="1"]').forEach(function(b) {
      b.dataset.active = '0';
      b.style.background = 'rgba(255,255,255,0.03)';
      b.style.borderColor = 'rgba(255,255,255,0.08)';
      b.style.color = 'rgba(226,226,236,0.5)';
    });
    var cb = document.getElementById('bl-sample'); if (cb) cb.checked = false;
    var out = document.getElementById('beat-log-output'); if (out) { out.style.display='none'; out.innerHTML=''; }
  },

  _submit: function() {
    var self = this;
    var form = self._getForm();
    if (!form.title) { RPGACE.utils.toast('Add a beat title first', '#E25454', 2000); return; }
    if (!form.mood)  { RPGACE.utils.toast('Select a mood', '#E25454', 2000); return; }

    var output = document.getElementById('beat-log-output');
    output.style.display = 'block';
    output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:12px 0;">⚡ Logging beat and searching for artist matches...</div>';

    // 1. Save to Supabase video_jobs
    RPGACE.sb.insert('video_jobs', {
      title:        form.title,
      status:       'beat_logged',
      script:       JSON.stringify(form),
      edl:          null,
      raw_path:     form.flPath || null,
      style_profile_id: null,
    }).catch(function(e) { console.warn('[beatLog] Supabase save:', e.message); });

    // 2. Mark taxonomy nodes as applied
    form.taxNodes.forEach(function(concept) {
      if (RPGACE.modules.taxonomySync) {
        RPGACE.modules.taxonomySync.markApplied(concept);
      }
    });

    // 3. Save to Journal
    var journalContent = 'Beat logged: ' + form.title + '\n' +
      'Key: ' + form.key + ' ' + form.scale + ' | BPM: ' + form.bpm + ' | Energy: ' + form.energy + '\n' +
      'Mood: ' + form.mood + ' | Rating: ' + form.rating + '\n' +
      (form.refTrack ? 'Reference: ' + form.refTrack + '\n' : '') +
      (form.taxNodes.length ? 'Nodes applied: ' + form.taxNodes.join(', ') : '');
    if (typeof saveToJournal === 'function') {
      saveToJournal('Beat: ' + form.title, journalContent, 'beatLog');
    }

    // 4. Award XP
    var xp = [20, 40, 60, 80, 100][parseInt(form.energy) - 1] || 60;
    if (typeof addXP === 'function') addXP(xp);

    // 5. Get colour palette from scale
    var palette = self.SCALE_COLOURS[form.scale] || { hex: '#1a1a2e', name: 'Dark neutral' };

    // 6. Get Last.fm artist tags from mood
    var tags = self.MOOD_TAGS[form.mood] || ['hip hop', 'uk hip hop'];

    // Search Last.fm
    self._searchArtists(tags, form, palette, output);
  },

  _searchArtists: function(tags, form, palette, output) {
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
  },

  _addNewArtistsToTaxonomy: function(artists, mood) {
    // Add top emerging artists to taxonomy Phylum 17 (Fons Educationis) if not already there
    var emerging = artists.filter(function(a) { return a.listeners > 5000 && a.listeners <= 500000; }).slice(0, 10);
    emerging.forEach(function(a) {
      RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(a.name) + '&limit=1')
        .then(function(rows) {
          if (rows && rows.length > 0) return; // already exists
          RPGACE.sb.insert('taxonomy_nodes', {
            concept:       a.name,
            phylum_number: 17,
            phylum_name:   'Fons Educationis',
            definition:    'Artist discovered via Last.fm beat matching. Style: ' + mood + '. Listeners: ' + a.listeners,
            source:        'lastfm_beat_match',
            gap_score:     5.0,
          }).catch(function(){});
        }).catch(function(){});
    });
  },

  _generateOutputs: function(form, palette, big, emerging, underground, output) {
    var self = this;
    var bigNames   = big.map(function(a) { return a.name; }).join(', ') || 'N/A';
    var emergNames = emerging.map(function(a) { return a.name + ' (' + Math.round(a.listeners/1000) + 'k)'; }).join(', ') || 'N/A';
    var ugNames    = underground.map(function(a) { return a.name; }).join(', ') || 'N/A';

    var prompt = 'I just finished a beat. Here are the details:\n' +
      'Title: ' + form.title + '\n' +
      'Key: ' + form.key + ' | Scale: ' + form.scale + ' | BPM: ' + form.bpm + '\n' +
      'Mood: ' + form.mood + ' | Energy: ' + form.energy + '/5\n' +
      'Colour palette: ' + palette.name + ' (' + palette.hex + ')\n' +
      (form.refTrack ? 'Reference: ' + form.refTrack + '\n' : '') +
      '\nLast.fm matched artists:\n' +
      'MAJOR (1M+ listeners): ' + bigNames + '\n' +
      'EMERGING (10k-1M): ' + emergNames + '\n' +
      'UNDERGROUND (<10k): ' + ugNames + '\n\n' +
      'Generate ALL of the following:\n\n' +
      '1. TYPE BEAT TITLES (5 options) — use the major artist names, format: "[Artist] x [Artist] Type Beat" and "[Mood] [Key] Type Beat 2026"\n\n' +
      '2. BEATSTARS DESCRIPTION — 80 words max, include key, BPM, mood, style, and purchase CTA. Professional tone.\n\n' +
      '3. NEURAL FRAMES BRIEF — 80-word AI video prompt for this beat. Specify: visual style, colour palette (' + palette.name + '), camera movement, mood.\n\n' +
      '4. YOUTUBE CONTENT ANGLE — Title, hook (first 3 seconds on screen), and 1-line description for a tutorial about making this beat.\n\n' +
      '5. TOP 3 OUTREACH TARGETS — From the emerging artists list, pick the 3 most likely to buy this beat. For each: name, why they fit, personalised DM draft (under 100 words, casual, not salesy), and their Last.fm URL.\n\n' +
      '6. CONTENT BRIEF — One Instagram Reels concept for this beat (hook + visual direction + caption).\n\n' +
      'Be specific, direct, and pre-filled for @AceSanyaBeats / FL Studio / UK hip hop.';

    RPGACE.utils.sendToOracle(prompt);

    // Render artist match panel in output
    self._renderArtistPanel(form, palette, big, emerging, underground, output);
  },

  _renderArtistPanel: function(form, palette, big, emerging, underground, output) {
    var self = this;
    output.innerHTML = '';
    output.style.cssText = 'margin-top:16px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;';

    // Colour palette display
    var palRow = document.createElement('div');
    palRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';
    var swatch = document.createElement('div');
    swatch.style.cssText = 'width:32px;height:32px;border-radius:6px;background:' + palette.hex + ';border:1px solid rgba(255,255,255,0.1);flex-shrink:0;';
    var palText = document.createElement('div');
    palText.innerHTML = '<div style="font-size:11px;font-weight:700;color:#E2E2EC;">' + palette.name + '</div><div style="font-size:10px;color:rgba(226,226,236,0.4);">Phylum XI · ' + form.scale + ' · ' + palette.hex + '</div>';
    palRow.appendChild(swatch); palRow.appendChild(palText);
    output.appendChild(palRow);

    // Artist tiers
    var tiers = [
      { label: 'Major artists', color: '#C9A84C', artists: big },
      { label: 'Emerging targets', color: '#3DAA6E', artists: emerging.slice(0, 8) },
      { label: 'Underground', color: '#4A90E2', artists: underground },
    ];

    tiers.forEach(function(tier) {
      if (tier.artists.length === 0) return;
      var section = document.createElement('div');
      section.style.cssText = 'margin-bottom:12px;';
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + tier.color + ';margin-bottom:6px;';
      lbl.textContent = tier.label + ' (' + tier.artists.length + ')';
      section.appendChild(lbl);
      var chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      tier.artists.forEach(function(a) {
        var chip = document.createElement('a');
        chip.href = a.url || '#';
        chip.target = '_blank';
        chip.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.7);font-size:11px;text-decoration:none;cursor:pointer;';
        chip.textContent = a.name + (a.listeners ? ' · ' + (a.listeners > 1000000 ? Math.round(a.listeners/1000000)+'M' : Math.round(a.listeners/1000)+'k') : '');
        chips.appendChild(chip);
      });
      section.appendChild(chips);
      output.appendChild(section);
    });

    // Save to Notion button
    var notionBtn = document.createElement('button');
    notionBtn.textContent = '📓 Save Artist List to Notion';
    notionBtn.style.cssText = 'margin-top:10px;padding:8px 16px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:6px;color:#9B59B6;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    notionBtn.onclick = function() {
      var content = '## Beat: ' + form.title + '\n**Key:** ' + form.key + ' ' + form.scale + ' | **BPM:** ' + form.bpm + ' | **Mood:** ' + form.mood + '\n\n';
      content += '### Major Artists\n' + big.map(function(a){return '- [' + a.name + '](' + a.url + ')'}).join('\n') + '\n\n';
      content += '### Emerging Targets\n' + emerging.map(function(a){return '- [' + a.name + '](' + a.url + ') — ' + Math.round(a.listeners/1000) + 'k listeners'}).join('\n') + '\n\n';
      RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
        parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
        title: 'Beat Log: ' + form.title + ' — Artist Matches',
        markdown: content
      }).then(function() {
        RPGACE.utils.toast('📓 Saved to Notion', '#9B59B6', 3000);
      }).catch(function(e) {
        RPGACE.utils.toast('Notion error: ' + e.message, '#E25454', 3000);
      });
    };
    output.appendChild(notionBtn);

    RPGACE.utils.toast('✅ Beat logged · ' + (big.length + emerging.length + underground.length) + ' artists found · Check Oracle for outputs', '#C9A84C', 5000);
  },

});
/* ===END:beatLog=== */
