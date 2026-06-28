src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    // Form grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';"""

new = """    // Drag-and-drop zone for audio file
    var dropZone = document.createElement('div');
    dropZone.id = 'bl-dropzone';
    dropZone.style.cssText = 'border:2px dashed rgba(201,168,76,0.2);border-radius:8px;padding:16px;text-align:center;margin-bottom:16px;cursor:pointer;transition:border-color .2s;';
    var dropText = document.createElement('div');
    dropText.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.35);';
    dropText.innerHTML = '🎵 Drop your .mp3 / .wav / .flp here to pre-fill fields from filename<br><span style="font-size:10px;opacity:0.6;">e.g. "140bpm_Dminor_dark_fire.mp3" → auto-fills BPM, key, scale, mood, energy</span>';
    dropZone.appendChild(dropText);

    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(201,168,76,0.6)';
      dropZone.style.background = 'rgba(201,168,76,0.04)';
    });
    dropZone.addEventListener('dragleave', function() {
      dropZone.style.borderColor = 'rgba(201,168,76,0.2)';
      dropZone.style.background = 'none';
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(201,168,76,0.2)';
      dropZone.style.background = 'none';
      var file = e.dataTransfer.files[0];
      if (!file) return;
      self._parseFilename(file.name, file.path || '');
    });
    dropZone.addEventListener('click', function() {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.mp3,.wav,.flp,.aiff';
      inp.onchange = function() {
        if (inp.files[0]) self._parseFilename(inp.files[0].name, '');
      };
      inp.click();
    });
    panel.appendChild(dropZone);

    // Form grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';"""

if old in src:
    fixed = src.replace(old, new, 1)

    # Now add the _parseFilename method before _getForm
    old2 = """  _getForm: function() {"""
    new2 = """  _parseFilename: function(filename, filepath) {
    // Extract metadata from filename
    // Supports patterns like: 140bpm_Dminor_dark_fire.mp3
    //                         D_minor_140_dark.wav
    //                         midnight_cipher_140bpm_Fsharp_dorian.mp3
    var name = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').toLowerCase();

    // BPM — look for number between 60-200
    var bpmMatch = name.match(/\b(6[0-9]|[7-9][0-9]|1[0-9][0-9]|200)\b(?:\s*bpm)?/);
    if (bpmMatch) {
      var bpmEl = document.getElementById('bl-bpm');
      if (bpmEl) bpmEl.value = bpmMatch[1];
    }

    // Key — look for note names
    var keys = ['c#','d#','f#','g#','a#','c','d','e','f','g','a','b'];
    var foundKey = null;
    keys.forEach(function(k) {
      if (!foundKey && name.includes(k.replace('#','sharp').replace('#','#'))) foundKey = k.toUpperCase();
      if (!foundKey && name.includes(' ' + k + ' ')) foundKey = k.toUpperCase();
    });
    if (!foundKey) {
      // Try sharps written as 'sharp'
      var sharpMatch = name.match(/\b([a-g])sharp\b/i);
      if (sharpMatch) foundKey = sharpMatch[1].toUpperCase() + '#';
    }
    if (foundKey) {
      var keyEl = document.getElementById('bl-key');
      if (keyEl) keyEl.value = foundKey;
    }

    // Scale
    var scaleMap = {
      'minor': 'Minor', 'dorian': 'Dorian', 'phrygian': 'Phrygian',
      'lydian': 'Lydian', 'mixolydian': 'Mixolydian', 'major': 'Major',
      'locrian': 'Locrian', 'pentatonic': 'Minor Pentatonic', 'blues': 'Blues'
    };
    Object.keys(scaleMap).forEach(function(k) {
      if (name.includes(k)) {
        var scaleEl = document.getElementById('bl-scale');
        if (scaleEl) scaleEl.value = scaleMap[k];
      }
    });

    // Mood
    var moodMap = {
      'dark': 'Dark', 'aggressive': 'Aggressive', 'cinematic': 'Cinematic',
      'melancholic': 'Melancholic', 'euphoric': 'Euphoric', 'calm': 'Calm',
      'energetic': 'Energetic', 'romantic': 'Romantic', 'nostalgic': 'Nostalgic',
      'tense': 'Tense', 'sad': 'Melancholic', 'hype': 'Energetic', 'chill': 'Calm'
    };
    Object.keys(moodMap).forEach(function(k) {
      if (name.includes(k)) {
        var moodEl = document.getElementById('bl-mood');
        if (moodEl) moodEl.value = moodMap[k];
      }
    });

    // Energy from keywords
    var energyMap = { 'sketch': '1 — Sketch', 'draft': '2 — Draft', 'solid': '3 — Solid', 'strong': '4 — Strong', 'fire': '5 — Fire', 'heat': '5 — Fire', 'banger': '5 — Fire' };
    Object.keys(energyMap).forEach(function(k) {
      if (name.includes(k)) {
        var energyEl = document.getElementById('bl-energy');
        if (energyEl) energyEl.value = energyMap[k];
      }
    });

    // Beat title from filename (clean version)
    var titleEl = document.getElementById('bl-title');
    if (titleEl && !titleEl.value) {
      var cleanTitle = filename.replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\d+\s*bpm\b/gi, '')
        .replace(/\b(minor|major|dorian|phrygian|lydian|blues|pentatonic)\b/gi, '')
        .replace(/\b[a-g]#?\b/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (cleanTitle) titleEl.value = cleanTitle;
    }

    // FL path
    if (filepath) {
      var pathEl = document.getElementById('bl-fl-path');
      if (pathEl) pathEl.value = filepath;
    }

    // Update drop zone text
    var dz = document.getElementById('bl-dropzone');
    if (dz) {
      dz.querySelector('div').innerHTML = '✅ <strong style="color:#C9A84C;">' + filename + '</strong> — fields pre-filled. Review and adjust below.';
    }

    RPGACE.utils.toast('✅ Fields pre-filled from filename', '#C9A84C', 2000);
  },

  _getForm: function() {"""

    if old2 in fixed:
        fixed = fixed.replace(old2, new2, 1)
        open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
        print("PATCHED: drag-and-drop + filename parsing added to Beat Log")
    else:
        open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
        print("PATCHED: dropzone added but _parseFilename anchor not found — added dropzone only")
else:
    print("ERROR: form grid anchor not found")
