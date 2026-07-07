/* ===MODULE:refCorpus=== */
RPGACE.register('refCorpus', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 1100);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._inject(); }, 500);
      }
    });
  },

  _inject: function() {
    if (document.getElementById('ref-corpus-panel')) return;
    var self = this;
    var page = document.getElementById('page-research') ||
               document.getElementById('page-learning') ||
               document.querySelector('[id*="research"]') ||
               document.querySelector('[id*="learning"]');
    if (!page) return;

    var panel = document.createElement('div');
    panel.id = 'ref-corpus-panel';
    panel.style.cssText = 'background:rgba(74,144,226,0.04);border:1px solid rgba(74,144,226,0.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;';

    // Header
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(74,144,226,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Reference Corpus · Phylum VIII + XVII';
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    titleEl.textContent = 'Track Reference Library';
    var subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:16px;';
    subEl.textContent = 'Add reference tracks. Beat Log matches your beat against this corpus to find artist targets. Phase 2: librosa auto-analyses each track.';
    panel.appendChild(eyebrow); panel.appendChild(titleEl); panel.appendChild(subEl);

    // Add track form
    var form = document.createElement('div');
    form.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 80px 80px 80px 1fr;gap:8px;margin-bottom:10px;align-items:end;';

    var formFields = [
      { id: 'rc-artist', placeholder: 'Artist', type: 'text' },
      { id: 'rc-title',  placeholder: 'Track title', type: 'text' },
      { id: 'rc-bpm',    placeholder: 'BPM', type: 'number' },
      { id: 'rc-key',    placeholder: 'Key', type: 'text' },
      { id: 'rc-energy', placeholder: 'Energy 1-5', type: 'number' },
      { id: 'rc-mood',   placeholder: 'Mood', type: 'text' },
    ];

    formFields.forEach(function(f) {
      var inp = document.createElement('input');
      inp.id = f.id; inp.type = f.type; inp.placeholder = f.placeholder;
      inp.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:7px 10px;outline:none;font-family:Rajdhani,sans-serif;width:100%;';
      form.appendChild(inp);
    });
    panel.appendChild(form);

    // Bulk add textarea
    var bulkLbl = document.createElement('div');
    bulkLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.3);margin-bottom:5px;margin-top:10px;';
    bulkLbl.textContent = 'Or bulk add — one per line: Artist, Track Title, BPM, Key, Energy, Mood';
    var bulkArea = document.createElement('textarea');
    bulkArea.id = 'rc-bulk';
    bulkArea.placeholder = 'Nines, Money & Muscle, 92, D, 3, Melancholic\nDave, Titanium, 88, F#, 4, Cinematic\nKnucks, Seasons, 95, G, 3, Dark';
    bulkArea.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:11px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;margin-bottom:10px;';
    panel.appendChild(bulkLbl);
    panel.appendChild(bulkArea);

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;';

    var addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Track';
    addBtn.style.cssText = 'padding:8px 16px;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    addBtn.onclick = function() { self._addSingle(); };

    var bulkBtn = document.createElement('button');
    bulkBtn.textContent = '⚡ Bulk Import';
    bulkBtn.style.cssText = 'padding:8px 16px;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    bulkBtn.onclick = function() { self._bulkImport(); };

    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = '↻ Refresh List';
    refreshBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    refreshBtn.onclick = function() { self._loadList(); };

    btnRow.appendChild(addBtn); btnRow.appendChild(bulkBtn); btnRow.appendChild(refreshBtn);
    panel.appendChild(btnRow);

    // Track list
    var listWrap = document.createElement('div');
    listWrap.id = 'rc-list';
    listWrap.style.cssText = 'max-height:240px;overflow-y:auto;';
    var listHeader = document.createElement('div');
    listHeader.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(226,226,236,0.25);margin-bottom:8px;';
    listHeader.textContent = 'Corpus · 0 tracks';
    listHeader.id = 'rc-list-header';
    listWrap.appendChild(listHeader);
    panel.appendChild(listWrap);

    // Insert before beat log panel
    var beatLogPanel = document.getElementById('beat-log-panel');
    if (beatLogPanel) {
      beatLogPanel.parentElement.insertBefore(panel, beatLogPanel);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    self._loadList();
    console.log('[RPGACE:refCorpus] Panel injected');
  },

  _addSingle: function() {
    var get = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var artist = get('rc-artist');
    var title  = get('rc-title');
    if (!artist || !title) { RPGACE.utils.toast('Artist and title required', '#E25454', 2000); return; }
    var row = {
      artist:  artist,
      title:   title,
      bpm:     parseInt(get('rc-bpm')) || null,
      key:     get('rc-key') || null,
      energy:  parseInt(get('rc-energy')) || null,
      mood:    get('rc-mood') || null,
      source:  'manual',
      analysed: false,
    };
    RPGACE.sb.insert('reference_tracks', row)
      .then(function() {
        RPGACE.utils.toast('✅ Added: ' + artist + ' — ' + title, '#4A90E2', 2500);
        ['rc-artist','rc-title','rc-bpm','rc-key','rc-energy','rc-mood'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
        this._loadList();
      }.bind(this))
      .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#E25454', 3000); });
  },

  _bulkImport: function() {
    var self = this;
    var raw = document.getElementById('rc-bulk');
    if (!raw || !raw.value.trim()) { RPGACE.utils.toast('Paste tracks first', '#E25454', 2000); return; }
    var lines = raw.value.trim().split('\n').filter(function(l) { return l.trim(); });
    var rows = lines.map(function(line) {
      var parts = line.split(',').map(function(p) { return p.trim(); });
      return {
        artist:   parts[0] || '',
        title:    parts[1] || '',
        bpm:      parseInt(parts[2]) || null,
        key:      parts[3] || null,
        energy:   parseInt(parts[4]) || null,
        mood:     parts[5] || null,
        source:   'bulk_import',
        analysed: false,
      };
    }).filter(function(r) { return r.artist && r.title; });

    if (rows.length === 0) { RPGACE.utils.toast('No valid rows found', '#E25454', 2000); return; }

    RPGACE.utils.toast('Importing ' + rows.length + ' tracks...', '#4A90E2', 2000);
    var done = 0;
    rows.forEach(function(row) {
      RPGACE.sb.insert('reference_tracks', row)
        .then(function() {
          done++;
          if (done === rows.length) {
            RPGACE.utils.toast('✅ Imported ' + done + ' tracks', '#4A90E2', 3000);
            raw.value = '';
            self._loadList();
          }
        }).catch(function(){});
    });
  },

  _loadList: function() {
    var self = this;
    var list = document.getElementById('rc-list');
    var header = document.getElementById('rc-list-header');
    if (!list) return;

    RPGACE.sb.select('reference_tracks', 'order=created_at.desc&limit=100')
      .then(function(rows) {
        rows = rows || [];
        if (header) header.textContent = 'Corpus · ' + rows.length + ' tracks · Phase 2: librosa auto-analysis pending';

        // Clear existing rows (keep header)
        while (list.children.length > 1) list.removeChild(list.lastChild);

        if (rows.length === 0) {
          var empty = document.createElement('div');
          empty.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.2);padding:8px 0;';
          empty.textContent = 'No tracks yet. Add some above.';
          list.appendChild(empty);
          return;
        }

        rows.forEach(function(row) {
          var item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
          var left = document.createElement('div');
          var name = document.createElement('div');
          name.style.cssText = 'font-size:12px;color:#E2E2EC;font-weight:600;';
          name.textContent = row.artist + ' — ' + row.title;
          var meta = document.createElement('div');
          meta.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);';
          var parts = [];
          if (row.bpm) parts.push(row.bpm + ' BPM');
          if (row.key) parts.push(row.key);
          if (row.energy) parts.push('Energy ' + row.energy);
          if (row.mood) parts.push(row.mood);
          meta.textContent = parts.join(' · ') || 'No metadata yet';
          left.appendChild(name); left.appendChild(meta);
          var del = document.createElement('button');
          del.textContent = '×';
          del.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.2);cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0;';
          del.onclick = function() {
            RPGACE.sb.del('reference_tracks', 'id=eq.' + row.id)
              .then(function() { self._loadList(); })
              .catch(function(){});
          };
          item.appendChild(left); item.appendChild(del);
          list.appendChild(item);
        });
      }).catch(function(e) {
        console.warn('[refCorpus] load error:', e.message);
      });
  },

  // Called by beatLog to find matching artists from corpus
  findMatches: function(bpm, mood, scale, energy) {
    var bpmNum = parseInt(bpm) || 130;
    var energyNum = parseInt(energy) || 3;
    var bpmRange = 15; // match within ±15 BPM

    return RPGACE.sb.select('reference_tracks',
      'order=created_at.desc&limit=200'
    ).then(function(rows) {
      if (!rows || rows.length === 0) return [];

      // Score each track by similarity
      var scored = rows.map(function(row) {
        var score = 0;
        if (row.bpm) {
          var bpmDiff = Math.abs(row.bpm - bpmNum);
          if (bpmDiff <= 5) score += 4;
          else if (bpmDiff <= 10) score += 3;
          else if (bpmDiff <= bpmRange) score += 1;
          else score -= 2; // penalise far BPM
        }
        if (row.mood && mood && row.mood.toLowerCase() === mood.toLowerCase()) score += 3;
        if (row.scale && scale && row.scale.toLowerCase() === scale.toLowerCase()) score += 2;
        if (row.energy && Math.abs(row.energy - energyNum) <= 1) score += 2;
        row._score = score;
        return row;
      });

      // Filter minimum score and sort
      return scored
        .filter(function(r) { return r._score > 0; })
        .sort(function(a, b) { return b._score - a._score });
    });
  },

});
/* ===END:refCorpus=== */
