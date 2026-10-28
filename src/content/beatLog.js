
/* ===END_DOMAIN:CONFIG=== */

/* ===DOMAIN:CONTENT=== */

/* ===MODULE:beatLog=== */
RPGACE.register('beatLog', {
  domain: 'content',

  // G53 (Aug 2026) — real, ratified /CEO plan item: this module is split into
  // two internal namespaces, `ui` (rendering/DOM) and `logic` (business
  // logic/data), following the exact shape the videoPipeline pilot already
  // shipped and verified. Pure internal-structure refactor — zero functional,
  // behavioural, UX, data or schema change; every function below was MOVED
  // wholesale, never rewritten or split down the middle.
  //
  // Shared constants + transient state (SCALE_COLOURS / MOOD_COLOURS /
  // MOOD_TAGS / _retroTarget) stay at module scope, and `init` stays a literal
  // top-level function because RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that used to open with
  // `var self = this;` now opens with `var self = RPGACE.modules.beatLog;`,
  // and every cross-namespace call is explicitly qualified `self.ui.X` /
  // `self.logic.X` (module-scope properties stay bare: `self.MOOD_COLOURS`,
  // `self._retroTarget`). The 7 moved functions that never referenced
  // `this`/`self` at all are byte-identical moves.
  //
  // Classification rule used (stated so a later reader can check it rather
  // than guess): a function lives in `ui` if it constructs or discovers DOM
  // (document.*, createElement, getElementById, querySelector, innerHTML);
  // otherwise in `logic`. Two moved functions are genuinely mixed — real DOM
  // form-reading AND a real Supabase write in the same body — and landed in
  // `ui` on that basis rather than being split down the middle: `_submit`
  // (real content_productions/video_jobs writes) and `_submitUpdate` (same,
  // for the retro-edit path). Verified directly, not just asserted: Sonnet's
  // own independent re-check found both are the only 2 of the 13 real `ui`
  // functions that also contain a real `RPGACE.sb.secureWrite`/`.insert`
  // call — a real, honest correction to this comment's own earlier draft,
  // which claimed an inline flag existed on each without one actually being
  // there.

  // Colour palette by scale (Phylum 12 — Lingua Musicae, Colour/Mood/Visual Language)
  // Kept as a fallback only as of Aug 5 - see MOOD_COLOURS below for why.
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

  // Aug 5 (Engineer pass, real bug Alex caught: "log beat + artist still
  // ties down to same cold midnight blue") - root cause was that colour
  // selection only ever read SCALE_COLOURS, never mood. Most drill/trap
  // beats are Minor-key, so every beat landed on the same "Cold midnight
  // blue" regardless of whether the real described mood was Dark,
  // Aggressive, Euphoric, or anything else. Keys match MOOD_TAGS' real
  // options (the actual dropdown list) exactly - no gaps.
  MOOD_COLOURS: {
    'Dark':        { hex: '#14151f', name: 'Charcoal void',      rgb: '20,21,31'  },
    'Aggressive':  { hex: '#5c1a1a', name: 'Blood crimson',      rgb: '92,26,26'  },
    'Cinematic':   { hex: '#3d2817', name: 'Film amber',         rgb: '61,40,23'  },
    'Melancholic': { hex: '#2a3540', name: 'Muted slate blue',   rgb: '42,53,64'  },
    'Euphoric':    { hex: '#5c3a1a', name: 'Golden euphoria',    rgb: '92,58,26'  },
    'Calm':        { hex: '#1a3d3a', name: 'Calm teal',          rgb: '26,61,58'  },
    'Energetic':   { hex: '#5c2e0a', name: 'Energetic ember',    rgb: '92,46,10'  },
    'Romantic':    { hex: '#4a1a30', name: 'Romantic rose',      rgb: '74,26,48'  },
    'Nostalgic':   { hex: '#3a2a1a', name: 'Nostalgic sepia',    rgb: '58,42,26'  },
    'Tense':       { hex: '#33351a', name: 'Tense acid olive',   rgb: '51,53,26'  },
  },

  // Keep for backwards compat
  MOOD_TAGS: {
    'Dark': ['uk rap', 'dark hip hop'], 'Aggressive': ['drill', 'grime'],
    'Cinematic': ['cinematic hip hop'], 'Melancholic': ['uk rap', 'sad rap'],
    'Euphoric': ['afrobeats'], 'Calm': ['lo-fi hip hop', 'jazz rap'],
    'Energetic': ['trap', 'drill'], 'Romantic': ['r&b', 'neo soul'],
    'Nostalgic': ['boom bap'], 'Tense': ['dark trap', 'drill'],
  },

  // Aug 5 (Engineer pass, Phase E) — transient state, only ever set by
  // _openRetroactive (Phase D's "Return to Beat Log" retro button):
  // {cpId, videoJobId} of the existing ConID currently being edited in
  // place. null means _submit's normal fresh-INSERT path runs unchanged.
  _retroTarget: null,

  // `init` MUST stay a literal top-level function — RPGACE.register()
  // invokes `module.init()` directly. `this` is correctly the module here,
  // so its own `var self = this;` is left exactly as it was.
  // July 23 — same real freeze finding as refCorpus: this injected (and
  // fetched) 900ms after every boot regardless of page. Gated behind
  // researchTabs' 'research:tab-active' now — only the first real open of
  // the 'beatlog' tab triggers it.
  init: function() {
    var self = this;
    RPGACE.hooks.on('research:tab-active', function(key) {
      if (key === 'beatlog') setTimeout(function() { self._inject(); }, 100);
    });
  },

  // ============================================================
  // logic — business logic/data. No DOM construction or lookup.
  // ============================================================
  logic: {

    // BPM-aware mood → genre tags for Last.fm
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

    // BT-4 (Oct 16 2026): BPM + rough key worked out in the browser. The
    // file is decoded on this device and never uploaded (the old laptop
    // helper upload to the beat-audio bucket is retired). A 60-second slice
    // from the middle of the track is resampled to 22050 Hz mono, then
    // _analyseSamples (pure, testable) does the maths.
    SCAN_SR: 22050,
    SCAN_SECS: 60,
    analyseFile: function(file) {
      var L = RPGACE.modules.beatLog.logic;
      var AC = window.AudioContext || window.webkitAudioContext, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AC || !OAC) return Promise.reject(new Error('this browser cannot read audio'));
      return file.arrayBuffer().then(function(buf) {
        var ctx = new AC();
        // Callback form for old Safari; the returned promise (newer browsers)
        // is caught too, or a bad file shows up as an unhandled rejection.
        return new Promise(function(res, rej) { var pr = ctx.decodeAudioData(buf, res, rej); if (pr && pr.catch) pr.catch(rej); })
          .then(function(audio) { try { ctx.close(); } catch (e) {} return audio; },
                function(e) { try { ctx.close(); } catch (x) {} throw new Error('could not read this audio file'); });
      }).then(function(audio) {
        var secs = Math.min(L.SCAN_SECS, audio.duration);
        var offset = Math.max(0, (audio.duration - secs) / 2);
        var off = new OAC(1, Math.max(1, Math.floor(secs * L.SCAN_SR)), L.SCAN_SR);
        var src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination);
        src.start(0, offset, secs);
        return off.startRendering().then(function(r) { return L._analyseSamples(r.getChannelData(0), L.SCAN_SR); });
      });
    },
    // Pure: { bpm, key, scale, keyConfidence } from mono samples.
    _analyseSamples: function(x, sr) {
      var L = RPGACE.modules.beatLog.logic, N = 2048, hop = 512, nF = Math.floor((x.length - N) / hop);
      if (nF < 8) return { bpm: null, key: null, scale: null };
      var fft = L._fft, win = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N), prev = new Float32Array(N / 2);
      for (var i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
      var flux = new Float32Array(nF), chroma = new Float64Array(12);
      var kLo = Math.ceil(55 * N / sr), kHi = Math.floor(2000 * N / sr);
      for (var f = 0; f < nF; f++) {
        var o = f * hop;
        for (i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
        fft(re, im);
        var fl = 0;
        for (var k = 1; k < N / 2; k++) {
          var mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
          var d = mag - prev[k]; if (d > 0) fl += d; prev[k] = mag;
          if (k >= kLo && k <= kHi) {
            var midi = 69 + 12 * Math.log(k * sr / N / 440) / Math.LN2;
            chroma[((Math.round(midi) % 12) + 12) % 12] += mag;
          }
        }
        flux[f] = fl;
      }
      return Object.assign({ bpm: L._tempoFromFlux(flux, hop / sr) }, L._keyFromChroma(chroma));
    },
    // Autocorrelation of the onset curve over 60-200 BPM, folded into 70-180.
    _tempoFromFlux: function(flux, hopSec) {
      var n = flux.length, mean = 0, i;
      for (i = 0; i < n; i++) mean += flux[i];
      mean /= n;
      var e = new Float32Array(n);
      for (i = 0; i < n; i++) e[i] = Math.max(0, flux[i] - mean);
      var best = 0, bestLag = 0, lo = Math.floor(60 / 200 / hopSec), hi = Math.ceil(60 / 60 / hopSec);
      for (var lag = lo; lag <= hi && lag < n; lag++) {
        var s = 0;
        for (i = 0; i + lag < n; i++) s += e[i] * e[i + lag];
        s /= (n - lag);
        if (s > best) { best = s; bestLag = lag; }
      }
      if (!bestLag) return null;
      // refine with neighbours (parabolic) for a less coarse BPM
      var ac = function(l) { var t = 0; for (var j = 0; j + l < n; j++) t += e[j] * e[j + l]; return t / (n - l); };
      var a = ac(bestLag - 1), b = best, c = ac(bestLag + 1), den = a - 2 * b + c;
      var lagF = bestLag + (den ? 0.5 * (a - c) / den : 0);
      var bpm = 60 / (lagF * hopSec);
      while (bpm < 70) bpm *= 2;
      while (bpm > 180) bpm /= 2;
      return Math.round(bpm);
    },
    NOTES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    // Krumhansl-Kessler key profiles; best correlation over 24 keys.
    _keyFromChroma: function(ch) {
      var L = RPGACE.modules.beatLog.logic;
      var MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
      var MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
      var corr = function(a, b) {
        var ma = 0, mb = 0, i; for (i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; } ma /= 12; mb /= 12;
        var num = 0, da = 0, db = 0;
        for (i = 0; i < 12; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) * (a[i] - ma); db += (b[i] - mb) * (b[i] - mb); }
        return da && db ? num / Math.sqrt(da * db) : 0;
      };
      var all = [];
      for (var t = 0; t < 12; t++) {
        var rot = []; for (var i = 0; i < 12; i++) rot.push(ch[(i + t) % 12]);
        all.push({ key: L.NOTES[t], scale: 'Major', r: corr(rot, MAJ) });
        all.push({ key: L.NOTES[t], scale: 'Minor', r: corr(rot, MIN) });
      }
      all.sort(function(a, b) { return b.r - a.r; });
      if (!(all[0].r > 0)) return { key: null, scale: null, keyConfidence: 0 };
      return { key: all[0].key, scale: all[0].scale, keyConfidence: Math.round(all[0].r * 100) / 100, alt: all[1].key + ' ' + all[1].scale };
    },
    // In-place radix-2 FFT (length a power of two).
    _fft: function(re, im) {
      var n = re.length, i, j = 0, t;
      for (i = 1; i < n; i++) {
        var bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
      }
      for (var len = 2; len <= n; len <<= 1) {
        var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (i = 0; i < n; i += len) {
          var cr = 1, ci = 0;
          for (j = 0; j < len / 2; j++) {
            var ar = re[i + j], ai = im[i + j], k = i + j + len / 2;
            var br = re[k] * cr - im[k] * ci, bi = re[k] * ci + im[k] * cr;
            re[i + j] = ar + br; im[i + j] = ai + bi; re[k] = ar - br; im[k] = ai - bi;
            var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
          }
        }
      }
    },

    _addNewArtistsToTaxonomy: function(artists, mood) {
      // Add top emerging artists to taxonomy Phylum 11 (Fons Educationis) if not
      // already there. Bug fixed here: this used to write phylum_number: 17
      // while claiming phylum_name 'Fons Educationis' - 17 is actually Negotium,
      // Fons Educationis was 12, then renumbered to 11 (Aug 11 phylum renumber -
      // see the CLAUDE.md Current State entry for the full renumber record).
      var emerging = artists.filter(function(a) { return a.listeners > 5000 && a.listeners <= 500000; }).slice(0, 10);
      emerging.forEach(function(a) {
        RPGACE.sb.select('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(a.name) + '&limit=1')
          .then(function(rows) {
            if (rows && rows.length > 0) return; // already exists
            RPGACE.sb.secureWrite('taxonomy_nodes', 'insert', {
              concept:       a.name,
              phylum_number: 11,
              phylum_name:   'Fons Educationis',
              definition:    'Artist discovered via Last.fm beat matching. Style: ' + mood + '. Listeners: ' + a.listeners,
              source:        'lastfm_beat_match',
              gap_score:     5.0,
            }).catch(function(){});
          }).catch(function(){});
      });
    },


    _saveMatchesToCorpus: function(form, big, emerging, underground, btn) {
      var allArtists = big.concat(emerging).concat(underground);
      if (allArtists.length === 0) return;
      if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

      RPGACE.sb.select('reference_tracks', 'select=artist')
        .then(function(existing) {
          var existingNames = (existing || []).map(function(r) { return (r.artist || '').toLowerCase(); });
          var newOnes = [];
          var seen = {};
          allArtists.forEach(function(a) {
            var key = a.name.toLowerCase();
            if (existingNames.indexOf(key) !== -1 || seen[key]) return;
            seen[key] = true;
            newOnes.push(a);
          });

          if (newOnes.length === 0) {
            RPGACE.utils.toast('All these artists are already in your corpus', '#4A8CCC', 2500);
            if (btn) { btn.disabled = false; btn.textContent = '💾 Add These Artists to Reference Corpus'; }
            return;
          }

          var done = 0;
          newOnes.forEach(function(a) {
            RPGACE.sb.secureWrite('reference_tracks', 'insert', {
              artist:   a.name,
              title:    '(from beat match — ' + form.title + ')',
              bpm:      parseInt(form.bpm) || null,
              key:      form.key || null,
              scale:    form.scale || null,
              energy:   parseInt(form.energy) || null,
              mood:     form.mood || null,
              genre:    form.genre || null,
              url:      a.url || null,
              source:   'beat_match_growth',
              analysed: false,
            }).then(function() {
              done++;
              if (done === newOnes.length) {
                RPGACE.utils.toast('✅ Added ' + done + ' new artist' + (done === 1 ? '' : 's') + ' to your corpus', '#4A8CCC', 3000);
                if (btn) { btn.disabled = false; btn.textContent = '💾 Add These Artists to Reference Corpus'; }
              }
            }).catch(function() {
              done++;
              if (btn && done === newOnes.length) { btn.disabled = false; btn.textContent = '💾 Add These Artists to Reference Corpus'; }
            });
          });
        })
        .catch(function(e) {
          RPGACE.utils.toast('Corpus save error: ' + e.message, '#CC4A4A', 3000);
          if (btn) { btn.disabled = false; btn.textContent = '💾 Add These Artists to Reference Corpus'; }
        });
    },

  },

  // ============================================================
  // ui — rendering/DOM: builds the Beat Log panel, reads and writes
  // its fields, paints progress, and delegates data/computation work
  // to logic.* rather than doing it inline.
  // ============================================================
  ui: {

    _inject: function() {
      if (document.getElementById('beat-log-panel')) return;
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;

      // Aug 23 2026 (UI2/UI3) — was a 4-clause fallback chain resolving the
      // retired Research Lab page (its leading 'page-research' clause was
      // confirmed-dead). Now the ONE shared staging holder every relocatable
      // panel uses; dashDeck._openPanelPopup MOVES this node into a popup on
      // demand and back here on close.
      var page = RPGACE.utils.panelHome();
      if (!page) return;

      var panel = document.createElement('div');
      panel.id = 'beat-log-panel';
      panel.style.cssText = 'background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px 24px;margin-bottom:24px;';

      // Header
      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
      var title = document.createElement('div');
      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px;';
      eyebrow.textContent = 'Beat Log · ' + RPGACE.utils.phylumLabel(16);
      // Oct 10 2026 (N2): internal taxonomy label, and a 2nd title above "Log a Beat".
      eyebrow.style.display = 'none';
      var titleText = document.createElement('div');
      titleText.style.cssText = 'font-size:16px;font-weight:700;color:#D4DAF5;';
      titleText.textContent = 'Log a Beat';
      title.appendChild(eyebrow); title.appendChild(titleText);
      hdr.appendChild(title);
      panel.appendChild(hdr);

      // Drag-and-drop zone for audio file
      var dropZone = document.createElement('div');
      dropZone.id = 'bl-dropzone';
      dropZone.style.cssText = 'border:2px dashed rgba(201,168,76,0.2);border-radius:8px;padding:16px;text-align:center;margin-bottom:16px;cursor:pointer;transition:border-color .2s;';
      var dropText = document.createElement('div');
      dropText.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.35);';
      dropText.innerHTML = '🎧 <b>Scan audio</b> — pick or drop the WAV: BPM and key are worked out on this device (nothing is uploaded)<br><span style="font-size:11px;opacity:0.6;">The file name fills fields too, e.g. "140bpm_Dminor_dark_fire.wav"</span>';
      dropZone.appendChild(dropText);
      // BT-4: scan status + ½× / 2× for a tempo read at half or double.
      var scanOut = document.createElement('div'); scanOut.id = 'bl-scan';
      scanOut.style.cssText = 'display:none;margin-top:8px;font-size:13px;color:#D4DAF5;';
      dropZone.appendChild(scanOut);

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
        self.ui._parseFilename(file.name, file.path || '');
        self.ui._scan(file);
      });
      dropZone.addEventListener('click', function() {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.wav,.mp3,.aiff,.flac,.m4a,audio/*';
        inp.onchange = function() {
          if (inp.files[0]) { self.ui._parseFilename(inp.files[0].name, ''); self.ui._scan(inp.files[0]); }
        };
        inp.click();
      });
      panel.appendChild(dropZone);

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
        lbl.style.cssText = 'display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
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
        inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
        wrap.appendChild(lbl); wrap.appendChild(inp);
        grid.appendChild(wrap);
      });
      panel.appendChild(grid);

      // Taxonomy nodes picker — REDESIGNED July 19 (Research redesign,
      // confirmed answer: "Searchable picker"). The old version rendered
      // EVERY node as a visible chip up-front - by 470 tree rows that was
      // a wall of buttons dominating the whole form. Now: a search box;
      // chips only show when they match the query or are already selected.
      // The selection mechanism (dataset.active on chips in #bl-tax-grid)
      // is UNCHANGED, so the Log Beat read path needs no edits.
      var taxWrap = document.createElement('div');
      taxWrap.style.cssText = 'margin-bottom:14px;';
      var taxLbl = document.createElement('div');
      taxLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:8px;';
      taxLbl.textContent = 'Taxonomy Nodes Applied';
      var taxSearch = document.createElement('input');
      taxSearch.type = 'text';
      taxSearch.id = 'bl-tax-search';
      taxSearch.placeholder = '🔍 Type to search nodes — selected ones stay visible...';
      taxSearch.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
      var taxGrid = document.createElement('div');
      taxGrid.id = 'bl-tax-grid';
      taxGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      taxWrap.appendChild(taxLbl); taxWrap.appendChild(taxSearch); taxWrap.appendChild(taxGrid);
      panel.appendChild(taxWrap);

      var applyTaxFilter = function() {
        var q = taxSearch.value.trim().toLowerCase();
        Array.prototype.forEach.call(taxGrid.children, function(chip) {
          var selected = chip.dataset.active === '1';
          var matches = q.length >= 2 && (chip.dataset.concept || '').toLowerCase().indexOf(q) !== -1;
          chip.style.display = (selected || matches) ? '' : 'none';
        });
      };
      taxSearch.oninput = applyTaxFilter;

      // Load taxonomy nodes
      RPGACE.sb.select('taxonomy_nodes', 'order=phylum_number.asc&limit=50')
        .then(function(nodes) {
          (nodes || []).forEach(function(node) {
            var chip = document.createElement('button');
            chip.dataset.nodeId = node.id;
            chip.dataset.concept = node.concept;
            chip.textContent = node.concept.slice(0, 30) + (node.concept.length > 30 ? '…' : '');
            chip.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.5);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;transition:background .15s,border-color .15s,color .15s;';
            chip.onclick = function() {
              var active = chip.dataset.active === '1';
              chip.dataset.active = active ? '0' : '1';
              chip.style.background = active ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.12)';
              chip.style.borderColor = active ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.4)';
              chip.style.color = active ? 'rgba(226,226,236,0.5)' : '#C9A84C';
              applyTaxFilter();
            };
            taxGrid.appendChild(chip);
          });
          applyTaxFilter(); // hide everything until searched/selected
        }).catch(function() {});

      // Extra fields row
      var extraGrid = document.createElement('div');
      // Oct 10 2026 (N2): 4 fixed columns crushed these fields at phone width.
      extraGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;';

      // 2026-07-28 (real hand-test feedback) - Genre added. It already had a
      // real home (reference_tracks.genre existed but was never fed from
      // either end - see refCorpus below), it just never had an entry point
      // on the Beat Log form itself. Free text, not a select, matching the
      // corpus panel's own free-text fields - genre in this space is fuzzy
      // enough (UK Drill vs Drill vs UK Rap) that forcing a fixed list would
      // just cause mismatches against whatever the corpus rows say.
      var extraFields = [
        { id: 'bl-rating',    label: 'Beat Rating (★)',    type: 'select', options: ['★','★★','★★★','★★★★','★★★★★'] },
        { id: 'bl-genre',     label: 'Genre',              type: 'text', placeholder: 'e.g. UK Drill, Afrobeats, Boom Bap' },
        { id: 'bl-collab',    label: 'Collab Ready',       type: 'select', options: ['No','Yes — DM me','Yes — email only'] },
      ];
      extraFields.forEach(function(f) {
        var wrap = document.createElement('div');
        var lbl = document.createElement('label');
        lbl.textContent = f.label;
        lbl.style.cssText = 'display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
        var fieldEl;
        if (f.type === 'text') {
          fieldEl = document.createElement('input');
          fieldEl.type = 'text';
          fieldEl.id = f.id;
          fieldEl.placeholder = f.placeholder || '';
        } else {
          fieldEl = document.createElement('select');
          fieldEl.id = f.id;
          var blank = document.createElement('option'); blank.value=''; blank.textContent='— select —';
          fieldEl.appendChild(blank);
          f.options.forEach(function(o) {
            var opt = document.createElement('option'); opt.value=o; opt.textContent=o; fieldEl.appendChild(opt);
          });
        }
        fieldEl.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;box-sizing:border-box;';
        wrap.appendChild(lbl); wrap.appendChild(fieldEl);
        extraGrid.appendChild(wrap);
      });

      // Reference track + sample flag
      var refWrap = document.createElement('div');
      refWrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;';
      ['bl-ref-track','bl-fl-path'].forEach(function(id, i) {
        var wrap = document.createElement('div');
        var lbl = document.createElement('label');
        lbl.textContent = i === 0 ? 'Reference Track / Inspiration' : 'FL Studio Project Path (optional)';
        lbl.style.cssText = 'display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
        var inp = document.createElement('input');
        inp.id = id; inp.type = 'text';
        inp.placeholder = i === 0 ? 'e.g. Central Cee — Obsessed With You' : 'e.g. C:\\Beats\\midnight_cipher.flp';
        inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
        wrap.appendChild(lbl); wrap.appendChild(inp);
        refWrap.appendChild(wrap);
      });

      panel.appendChild(extraGrid);
      panel.appendChild(refWrap);
      // BT-3 (Oct 16 2026): logging = finished - which idea, where the files are, stems.
      self.ui._injectFinish(panel);

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

      // F18 checkbox REMOVED (Aug 6, 2nd real hand-test round, item 1) —
      // Beat Log is the one real always-music_video creation path (see the
      // content_type:'music_video' comment at _submit below), and Alex's
      // own words: "we will always use it no matter what in the music
      // video workflow." form.visualTreatment below is now a hardcoded
      // true rather than read from a removed checkbox — every other real
      // consumer of that flag (_generateOutputs' gated button) is
      // unchanged, it just always sees true now.

      // Action buttons
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

      var logBtn = document.createElement('button');
      logBtn.textContent = '⚡ Log Beat + Find Artists';
      logBtn.style.cssText = 'padding:10px 20px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      logBtn.onclick = function() { self.ui._submit(); };

      var clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear';
      clearBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      clearBtn.onclick = function() { self.ui._clearForm(); };

      btnRow.appendChild(logBtn); btnRow.appendChild(clearBtn);
      panel.appendChild(btnRow);

      // Output area
      var output = document.createElement('div');
      output.id = 'beat-log-output';
      output.style.cssText = 'margin-top:16px;display:none;';
      panel.appendChild(output);

      // Append as a direct child of the Research page - NOT before the Video
      // Workshop heading, which lives inside #video-workshop-panel and made
      // this panel a DESCENDANT of it, so hiding Workshop hid Beat Log too
      // (Bug A).
      page.appendChild(panel);
      RPGACE.hooks.fire('research:panel-injected');

      console.log('[RPGACE:beatLog] Panel injected');
    },

    // BT-3: the "finished" part of the form. Logging a beat means it is done:
    // the full WAV + stems are exported to a drive (stored as text, never
    // uploaded). The drive is filled from the last logged beat.
    STEMS: ['Full mix WAV', 'Drums', '808/Bass', 'Melody', 'Chords', 'FX', 'Vocals'],
    _injectFinish: function(panel) {
      var ui = RPGACE.modules.beatLog.ui;
      var lblCss = 'display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:5px;';
      var inCss = 'width:100%;box-sizing:border-box;min-height:40px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:13px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      var box = document.createElement('div'); box.id = 'bl-finish';
      box.style.cssText = 'border:1px solid rgba(155,110,200,0.35);border-radius:10px;padding:12px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;';
      var head = document.createElement('div'); head.style.cssText = 'font-size:13px;font-weight:700;color:#C9A8F0;';
      head.textContent = '✅ Finished beat — logging it marks it done';
      box.appendChild(head);
      var lab = function(t, f) { var w = document.createElement('div'); var l = document.createElement('label'); l.textContent = t; l.style.cssText = lblCss; if (f) l.htmlFor = f; w.appendChild(l); return w; };
      var w0 = lab('From a beat in progress (optional)', 'bl-idea');
      var sel = document.createElement('select'); sel.id = 'bl-idea'; sel.style.cssText = inCss;
      sel.innerHTML = '<option value="">— not from an idea —</option>';
      sel.onchange = function() {
        var t = document.getElementById('bl-title'), o = sel.options[sel.selectedIndex];
        if (sel.value && t && !t.value.trim() && o) t.value = o.dataset.title || '';
      };
      w0.appendChild(sel); box.appendChild(w0);
      var grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;';
      var w1 = lab('Drive', 'bl-drive'); var drive = document.createElement('input'); drive.id = 'bl-drive'; drive.type = 'text'; drive.maxLength = 80; drive.placeholder = 'e.g. Samsung T7'; drive.style.cssText = inCss; w1.appendChild(drive);
      var w2 = lab('Folder', 'bl-folder'); var folder = document.createElement('input'); folder.id = 'bl-folder'; folder.type = 'text'; folder.maxLength = 240; folder.placeholder = 'e.g. Beats/2026/Midnight Cipher'; folder.style.cssText = inCss; w2.appendChild(folder);
      // PC-3 (Oct 17 2026): the WAV's own file name (nothing is uploaded).
      var w2b = lab('WAV file name', 'bl-wav'); var wav = document.createElement('input'); wav.id = 'bl-wav'; wav.type = 'text'; wav.maxLength = 160; wav.placeholder = 'e.g. Midnight Cipher 140 F#m.wav'; wav.style.cssText = inCss; w2b.appendChild(wav);
      grid.appendChild(w1); grid.appendChild(w2); grid.appendChild(w2b); box.appendChild(grid);
      var w3 = lab('Exported (tick what is in the folder)');
      var chips = document.createElement('div'); chips.id = 'bl-stems'; chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      w3.appendChild(chips);
      RPGACE.modules.beatLog.ui.STEMS.forEach(function(n) { ui._stemChip(chips, n, false); });
      var addRow = document.createElement('div'); addRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
      var addIn = document.createElement('input'); addIn.id = 'bl-stem-add'; addIn.type = 'text'; addIn.maxLength = 40; addIn.placeholder = '+ add a stem'; addIn.style.cssText = inCss + 'flex:1;';
      var addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.id = 'bl-stem-add-btn'; addBtn.textContent = '+ add';
      addBtn.style.cssText = 'min-height:40px;padding:6px 14px;background:none;border:1px solid #9B6EC8;border-radius:6px;color:#C9A8F0;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      addBtn.onclick = function() { var v = addIn.value.trim(); if (!v) return; ui._stemChip(chips, v.slice(0, 40), true); addIn.value = ''; };
      addIn.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); } };
      addRow.appendChild(addIn); addRow.appendChild(addBtn); w3.appendChild(addRow);
      box.appendChild(w3);
      panel.appendChild(box);
      ui._refreshFinish();
    },
    _stemChip: function(box, name, on) {
      var have = Array.prototype.some.call(box.children, function(c) { return c.dataset.stem.toLowerCase() === name.toLowerCase(); });
      if (have) { Array.prototype.forEach.call(box.children, function(c) { if (c.dataset.stem.toLowerCase() === name.toLowerCase() && on) c._set(true); }); return; }
      var b = document.createElement('button'); b.type = 'button'; b.className = 'bl-stem'; b.dataset.stem = name;
      b._set = function(v) {
        b.dataset.on = v ? '1' : '0'; b.setAttribute('aria-pressed', v ? 'true' : 'false');
        b.textContent = (v ? '✓ ' : '') + name;
        b.style.cssText = 'min-height:36px;padding:6px 12px;border-radius:16px;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;' +
          (v ? 'background:rgba(155,110,200,0.18);border:1px solid #9B6EC8;color:#E0CCF7;font-weight:700;' : 'background:none;border:1px solid rgba(255,255,255,0.12);color:rgba(226,226,236,0.6);');
      };
      b._set(!!on);
      b.onclick = function() { b._set(b.dataset.on !== '1'); };
      box.appendChild(b);
    },
    // Ideas being made for the select, and the drive from the last logged beat.
    _refreshFinish: function() {
      var sel = document.getElementById('bl-idea'), drive = document.getElementById('bl-drive');
      if (sel) RPGACE.sb.select('conid_pot', 'select=id,title,idea_text&status=eq.making&order=created_at.desc&limit=30').then(function(rows) {
        var keep = sel.value;
        Array.prototype.slice.call(sel.options, 1).forEach(function(o) { o.remove(); });
        (Array.isArray(rows) ? rows : []).forEach(function(r) {
          var o = document.createElement('option'); o.value = r.id;
          o.dataset.title = String(r.title || r.idea_text || '').slice(0, 80);
          o.textContent = '🎛 ' + o.dataset.title; sel.appendChild(o);
        });
        if (keep) sel.value = keep;
      }).catch(function() {});
      if (drive && !drive.value) RPGACE.sb.select('content_productions', 'select=stems_drive&stems_drive=not.is.null&order=created_at.desc&limit=1').then(function(r) {
        if (r && r[0] && r[0].stems_drive && !drive.value) drive.value = r[0].stems_drive;
      }).catch(function() {});
    },
    // BT-3: open Beat Log for a beat in progress (from Idea Bank / Beats home).
    logFromIdea: function(idea) {
      var self = RPGACE.modules.beatLog, dd = RPGACE.modules.dashDeck;
      if (dd && dd._openPage) dd._openPage('beat-log-panel');
      self.ui._inject();
      var sel = document.getElementById('bl-idea');
      if (!sel) return;
      var title = String(idea.title || idea.idea_text || '').slice(0, 80);
      if (!Array.prototype.some.call(sel.options, function(o) { return o.value === idea.id; })) {
        var o = document.createElement('option'); o.value = idea.id; o.dataset.title = title; o.textContent = '🎛 ' + title; sel.appendChild(o);
      }
      sel.value = idea.id;
      var t = document.getElementById('bl-title'); if (t) t.value = title;
      self.ui._refreshFinish();
      var pnl = document.getElementById('beat-log-panel'); if (pnl && pnl.scrollIntoView) pnl.scrollIntoView({ block: 'start' });
    },

    // BT-4: scan the picked file and fill BPM / key / scale (all still editable).
    _scan: function(file) {
      var L = RPGACE.modules.beatLog.logic, out = document.getElementById('bl-scan');
      if (!file || !out) return;
      out.style.display = 'block';
      out.textContent = '🎧 Scanning the middle minute of ' + file.name + '…';
      L.analyseFile(file).then(function(r) {
        out.textContent = '';
        var set = function(id, v) { var el = document.getElementById(id); if (el && v != null) el.value = v; };
        if (r.bpm) set('bl-bpm', r.bpm);
        if (r.key) { set('bl-key', r.key); set('bl-scale', r.scale); }
        var line = document.createElement('span'); line.className = 'bl-scan-line';
        line.textContent = '🎧 ' + (r.bpm ? r.bpm + ' BPM' : 'no clear tempo') + (r.key ? ' · ' + r.key + ' ' + r.scale + (r.keyConfidence < 0.6 ? ' (rough — or ' + r.alt + ')' : '') : '') + ' — check by ear, edit if wrong';
        out.appendChild(line);
        if (r.bpm) [['½×', 0.5, 'bl-bpm-half'], ['2×', 2, 'bl-bpm-double']].forEach(function(x) {
          var b = document.createElement('button'); b.type = 'button'; b.id = x[2]; b.textContent = x[0];
          b.style.cssText = 'margin-left:6px;min-height:32px;min-width:40px;padding:4px 10px;border-radius:6px;border:1px solid rgba(201,168,76,0.4);background:none;color:#C9A84C;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          b.onclick = function(e) {
            e.stopPropagation();
            var el = document.getElementById('bl-bpm'), v = Math.round(Number(el.value || r.bpm) * x[1]);
            if (v >= 40 && v <= 300) el.value = v;
          };
          out.appendChild(b);
        });
      }, function(e) {
        out.textContent = '⚠️ Could not scan: ' + (e && e.message || e) + ' — type BPM and key in.';
        RPGACE.utils.toast('⚠️ Audio scan failed: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatLog');
      });
    },

    _parseFilename: function(filename, filepath) {
      // Extract metadata from filename
      // Supports patterns like: 140bpm_Dminor_dark_fire.mp3
      //                         D_minor_140_dark.wav
      //                         midnight_cipher_140bpm_Fsharp_dorian.mp3
      var name = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').toLowerCase();

      // BPM — look for number between 60-200
      var bpmMatch = name.match(/(6[0-9]|[7-9][0-9]|1[0-9][0-9]|200)(?:\s*bpm)?/);
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
        var sharpMatch = name.match(/([a-g])sharp/i);
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
          .replace(/\d+\s*bpm/gi, '')
          .replace(/(minor|major|dorian|phrygian|lydian|blues|pentatonic)/gi, '')
          .replace(/[a-g]#?/gi, '')
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
        genre:    get('bl-genre'),
        rating:   get('bl-rating'),
        collab:   get('bl-collab'),
        refTrack: get('bl-ref-track'),
        flPath:   get('bl-fl-path'),
        sample:   document.getElementById('bl-sample') ? document.getElementById('bl-sample').checked : false,
        visualTreatment: true, // always on now — checkbox removed Aug 6, item 1 (see note above)
        taxNodes: activeTax,
        // BT-3
        ideaId:   get('bl-idea'),
        drive:    get('bl-drive'),
        folder:   get('bl-folder'),
        wavFile:  get('bl-wav'),
        stems:    Array.from(document.querySelectorAll('#bl-stems .bl-stem[data-on="1"]')).map(function(b) { return b.dataset.stem; }),
      };
    },

    _clearForm: function() {
      ['bl-title','bl-key','bl-bpm','bl-scale','bl-energy','bl-mood','bl-genre','bl-rating','bl-collab','bl-ref-track','bl-fl-path','bl-idea','bl-folder','bl-wav'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });
      // BT-3: the drive stays (it is remembered); stems untick, added ones go.
      document.querySelectorAll('#bl-stems .bl-stem').forEach(function(b) {
        if (RPGACE.modules.beatLog.ui.STEMS.indexOf(b.dataset.stem) < 0) b.remove(); else b._set(false);
      });
      document.querySelectorAll('#bl-tax-grid button[data-active="1"]').forEach(function(b) {
        b.dataset.active = '0';
        b.style.background = 'rgba(255,255,255,0.03)';
        b.style.borderColor = 'rgba(255,255,255,0.08)';
        b.style.color = 'rgba(226,226,236,0.5)';
      });
      var cb = document.getElementById('bl-sample'); if (cb) cb.checked = false;
      var vtCb = document.getElementById('bl-visual-treatment'); if (vtCb) vtCb.checked = false;
      var out = document.getElementById('beat-log-output'); if (out) { out.style.display='none'; out.innerHTML=''; }
      // Real pre-existing bug, found during the G53 restructure (Sep 2 2026)
      // and fixed the same session, not smuggled silently into the refactor:
      // `_clearForm` never declared `var self`, and this module sits OUTSIDE
      // rpgace_core.js's strict-mode IIFE — so bare `self` resolved to the
      // browser global `self` (=== window), meaning this line had only ever
      // set `window._retroTarget`, never the module's own `_retroTarget`.
      // Real effect: clicking Clear during a "Return to Beat Log" retro edit
      // never actually cancelled it — the next Log Beat click would still
      // silently UPDATE the old ConID instead of creating a fresh one. Real,
      // minimal fix: qualify the target explicitly (same discipline every
      // other moved function in this module now uses).
      RPGACE.modules.beatLog._retroTarget = null;
    },

    // ── Phase 1 retroactive button (Aug 5, Engineer pass, Phase E) ───────
    // Real edit-in-place, per /interrogation's confirmed Q1 answer: reuse
    // a beat's existing creative record to regenerate for content
    // repurposing, without starting from zero. Called by
    // contentProductionLive's "Return to Beat Log" retro button with the
    // ConID's own content_productions row.
    _openRetroactive: function(row) {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;
      RPGACE.utils.toast('✏️ Loading saved beat data for ConID #' + (row.con_id || row.id) + '...', '#C9A84C', 2500);
      RPGACE.sb.select('video_jobs', 'content_production_id=eq.' + row.id + '&order=created_at.desc&limit=1&select=id,script')
        .catch(function(e) { console.warn('[beatLog] retro lookup:', e.message); return []; })
        .then(function(jobs) {
          var vj = jobs && jobs[0];
          if (!vj || !vj.script) {
            RPGACE.utils.toast('⚠️ No saved beat data found for this ConID — nothing to pre-fill', '#E2A83D', 3500);
            return;
          }
          var form;
          try { form = JSON.parse(vj.script); } catch (e) { form = null; }
          if (!form) {
            RPGACE.utils.toast('⚠️ Saved beat data could not be read — nothing to pre-fill', '#E2A83D', 3500);
            return;
          }
          // Aug 23 2026 (UI2) — was:
          //     if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.research);
          //     ... then scrollIntoView on #beat-log-panel.
          // A real, LIVE call site the UI-consistency audit had NOT catalogued
          // (found by a fresh grep during the same pass): this is the "Return to
          // Beat Log" retroactive-edit path off a ConID card (Phase E, Aug 5).
          // showPage() has no null guard on getElementById('page-'+name), so
          // once the Research Lab page was retired this would have thrown here.
          // Aug 31 2026 (UI11) — now navigates to the real #page-beat-log
          // (dashDeck._openPage, PAGE_PANELS already carries the ensure fn),
          // matching every other Beat Log entry point's new real-page
          // destination instead of the old transient popup. The explicit
          // self._inject() below is redundant (the ensure fn already runs it)
          // but kept as a harmless no-op guard in case _openPage is ever
          // unavailable.
          var dd = RPGACE.modules.dashDeck;
          if (dd && dd._openPage) {
            dd._openPage('beat-log-panel');
          }
          setTimeout(function() {
            self.ui._inject();
            self.ui._prefillForm(form);
            self._retroTarget = { cpId: row.id, videoJobId: vj.id };
            var panelEl = document.getElementById('beat-log-panel');
            if (panelEl) panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            RPGACE.utils.toast('✏️ Editing existing beat for ConID #' + (row.con_id || row.id) + ' — Log Beat below will UPDATE this record in place', '#C9A84C', 4500);
          }, 400);
        });
    },

    // Real pre-fill, keyed the same way _getForm() reads the form back out
    // (rule 8 - one real field set, read in both directions). Taxonomy
    // chips load asynchronously (a real Supabase fetch inside _inject), so
    // marking them active uses a bounded retry rather than a guessed fixed
    // delay.
    _prefillForm: function(form) {
      var ids = { title:'bl-title', key:'bl-key', bpm:'bl-bpm', scale:'bl-scale', energy:'bl-energy', mood:'bl-mood', genre:'bl-genre', rating:'bl-rating', collab:'bl-collab', refTrack:'bl-ref-track', flPath:'bl-fl-path', drive:'bl-drive', folder:'bl-folder', wavFile:'bl-wav' };
      var chipBox = document.getElementById('bl-stems');
      if (chipBox) (form.stems || []).forEach(function(n) { RPGACE.modules.beatLog.ui._stemChip(chipBox, n, true); });
      Object.keys(ids).forEach(function(key) {
        var el = document.getElementById(ids[key]);
        if (el && form[key] != null) el.value = form[key];
      });
      var sampleCb = document.getElementById('bl-sample'); if (sampleCb) sampleCb.checked = !!form.sample;
      // bl-visual-treatment checkbox removed Aug 6 (item 1) — form.visualTreatment stays hardcoded true
      var attempts = 0;
      var tryMarkTax = function() {
        var grid = document.getElementById('bl-tax-grid');
        if (grid && grid.children.length > 0) {
          Array.prototype.forEach.call(grid.children, function(chip) {
            if ((form.taxNodes || []).indexOf(chip.dataset.concept) !== -1) {
              chip.dataset.active = '1';
              chip.style.background = 'rgba(201,168,76,0.12)';
              chip.style.borderColor = 'rgba(201,168,76,0.4)';
              chip.style.color = '#C9A84C';
            }
          });
          return;
        }
        attempts++;
        if (attempts < 15) setTimeout(tryMarkTax, 300);
      };
      tryMarkTax();
    },

    _submit: function() {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;
      var form = self.ui._getForm();
      if (!form.title) { RPGACE.utils.toast('Add a beat title first', '#CC4A4A', 2000); return; }
      if (!form.mood)  { RPGACE.utils.toast('Select a mood', '#CC4A4A', 2000); return; }
      // BT-3: logging = finished, so where the files are is required.
      if (!form.drive || !form.folder) { RPGACE.utils.toast('Add the drive and folder where the WAV + stems are', '#CC4A4A', 2500); return; }

      var output = document.getElementById('beat-log-output');
      output.style.display = 'block';

      // Aug 5 (Engineer pass, Phase E) - real edit-in-place branch. Set
      // only by _openRetroactive (Phase D's "Return to Beat Log" retro
      // button); routes to an UPDATE of the exact same content_productions
      // + video_jobs rows instead of a fresh INSERT pair, per
      // /interrogation's confirmed "edit in place" answer.
      if (self._retroTarget) {
        self.ui._submitUpdate(form);
        return;
      }

      output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:12px 0;">⚡ Logging beat and searching for artist matches...</div>';

      // 1. Create the linked Content Pipeline (ConID) entry FIRST so
      //    video_jobs can reference its real id - Content Pipeline is the
      //    overseer, Beat Log is a real entry point into it (Alex-confirmed
      //    2026-07-28, content_pipeline_overseer_spec_backlog_2026-07-28.txt).
      //    Waited on (not fire-and-forget) so everything downstream - the
      //    video_jobs row, the Visual Treatment auto-save - has a real
      //    target row to link to; adds one INSERT round-trip before the
      //    rest of this flow continues, same fail-open behaviour as before.
      // Engineer pass 2026-07-30 (real "2 workflows" resolution, Alex's own
      // catch): content_type explicitly set here since beatLog is the one
      // real always-music_video creation path - every other real entry
      // point (Content Repurpose, Idea Bank activate) leaves it at its
      // default ('tutorial'), matching what those flows have always
      // actually produced.
      // BT-3: the beat is saved already finished (beat_logged + beat_finished
      // XP from the trigger), with where its files are and the session time
      // spent on its idea; the idea is then marked done.
      var bh = RPGACE.modules.beatsHub;
      var timesP = (form.ideaId && bh) ? bh.logic.loadTimes().catch(function() { return {}; }) : Promise.resolve({});
      timesP.then(function(times) {
        var t = (times || {})[form.ideaId] || {};
        return RPGACE.sb.secureWrite('content_productions', 'insert', {
          title: form.title,
          idea: 'Beat: ' + form.title + ' (' + form.key + ' ' + form.scale + ', ' + form.bpm + ' BPM, ' + form.mood + ')',
          taxonomy_nodes: form.taxNodes,
          platform_outputs: {},
          status: 'Idea',
          creative_docs: { beat_meta: form },
          content_type: 'music_video',
          finished_at: new Date().toISOString(),
          stems_drive: form.drive, stems_folder: form.folder, stems: form.stems,
          idea_id: form.ideaId || null,
          making_mins: form.ideaId ? (t.make || 0) : null,
          mixing_mins: form.ideaId ? (t.mix || 0) : null,
        });
      }).then(function(result) {
        var cpRow = Array.isArray(result) ? result[0] : result;
        var cpId = cpRow && cpRow.id ? cpRow.id : null;
        try { RPGACE.cache.clear('content_productions'); } catch (e) {}
        if (form.ideaId) {
          if (bh) bh.logic._times = null;
          RPGACE.sb.secureWrite('conid_pot', 'update', { status: 'done' }, 'id=eq.' + form.ideaId).then(function() {
            var sel = document.getElementById('bl-idea');
            if (sel) Array.prototype.forEach.call(sel.options, function(o) { if (o.value === form.ideaId) o.remove(); });
          }, function(e) { RPGACE.utils.toast('⚠️ Beat logged, but the idea could not be marked done: ' + (e && e.message || e), '#CC4A4A', 4000, 'beatLog'); });
        }

        // PC-6 (Oct 17 2026): no video_jobs row any more (the old video pipeline is retired).
        self.ui._continueAfterLink(form, cpId, null);
      }).catch(function(e) {
        console.warn('[beatLog] Content Pipeline entry:', e.message);
        RPGACE.utils.toast('⚠️ The beat could not be saved: ' + (e && e.message || e), '#CC4A4A', 5000, 'beatLog');
        self.ui._continueAfterLink(form, null, null);
      });
    },

    // ── Real edit-in-place UPDATE path (Aug 5, Engineer pass, Phase E) ───
    // Updates the SAME content_productions + video_jobs rows _openRetroactive
    // loaded from, instead of the fresh INSERT pair _submit's normal path
    // creates - per /interrogation's confirmed "edit in place" answer.
    // Reuses _continueAfterLink unchanged afterward (rule 8 dedup) -
    // re-running the artist search/journal/XP steps is a real, wanted side
    // effect of a repurposing edit (fresh matches for the tweaked mood/BPM/
    // genre), not a bug.
    _submitUpdate: function(form) {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;
      var target = self._retroTarget;
      var output = document.getElementById('beat-log-output');
      output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:12px 0;">✏️ Updating existing beat log entry...</div>';

      RPGACE.sb.secureWrite('content_productions', 'update', {
        title: form.title,
        idea: 'Beat: ' + form.title + ' (' + form.key + ' ' + form.scale + ', ' + form.bpm + ' BPM, ' + form.mood + ')',
        taxonomy_nodes: form.taxNodes,
        stems_drive: form.drive || null, stems_folder: form.folder || null, stems: form.stems || [],
      }, 'id=eq.' + target.cpId)
        .catch(function(e) { console.warn('[beatLog] retro content_productions update:', e.message); })
        .then(function() {
          // beat_meta lives inside creative_docs (jsonb) - reuses
          // visualOracle's existing read-merge-write rather than a second
          // hand-rolled merge (rule 8 dedup). Stored as a real object, same
          // shape _submit's own INSERT path already uses (creative_docs:
          // {beat_meta: form}), not a stringified copy.
          var vo = RPGACE.modules.visualOracle;
          if (vo && vo._saveDocToProduction) vo._saveDocToProduction('beat_meta', form, target.cpId);
        })
        .then(function() {
          if (!target.videoJobId) return;
          return RPGACE.sb.secureWrite('video_jobs', 'update', {
            title: form.title,
            script: JSON.stringify(form),
            raw_path: form.flPath || null,
          }, 'id=eq.' + target.videoJobId).catch(function(e) { console.warn('[beatLog] retro video_jobs update:', e.message); });
        })
        .then(function() {
          RPGACE.utils.toast('💾 Beat log updated in place — regenerating matches', '#4CAF82', 2500);
          var cpId = target.cpId, videoJobId = target.videoJobId;
          self._retroTarget = null;
          self.ui._continueAfterLink(form, cpId, videoJobId);
        });
    },

    // Continues the pre-existing beat-log flow (taxonomy marking, journal,
    // XP, artist search + outputs) once the real content_productions/
    // video_jobs ids are known (or null, if either write failed - fails
    // open, same as every write in this function already did before this
    // change).
    _continueAfterLink: function(form, cpId, videoJobId) {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;

      // Mark taxonomy nodes as applied
      form.taxNodes.forEach(function(concept) {
        if (RPGACE.modules.taxonomySync) {
          RPGACE.modules.taxonomySync.markApplied(concept);
        }
      });

      // Save to Journal
      var journalContent = 'Beat logged: ' + form.title + '\n' +
        'Key: ' + form.key + ' ' + form.scale + ' | BPM: ' + form.bpm + ' | Energy: ' + form.energy + '\n' +
        'Mood: ' + form.mood + ' | Rating: ' + form.rating + '\n' +
        (form.refTrack ? 'Reference: ' + form.refTrack + '\n' : '') +
        (form.taxNodes.length ? 'Nodes applied: ' + form.taxNodes.join(', ') : '');
      if (typeof saveToJournal === 'function') {
        saveToJournal('Beat: ' + form.title, journalContent, 'beatLog');
      }

      // Award XP
      var xp = [20, 40, 60, 80, 100][parseInt(form.energy) - 1] || 60;
      if (typeof addXP === 'function') addXP(xp);

      // Get colour palette - mood first (Aug 5 fix: this is what actually
      // varies per Alex's real creative intent), scale as a fallback only
      // if mood is somehow unset.
      var palette = self.MOOD_COLOURS[form.mood] || self.SCALE_COLOURS[form.scale] || { hex: '#1a1a2e', name: 'Dark neutral' };

      // Get BPM-aware Last.fm tags
      var tags = self.logic._getMoodTags(form.mood, form.bpm);

      // Search Last.fm
      var output = document.getElementById('beat-log-output');
      self.ui._searchArtists(tags, form, palette, output, cpId, videoJobId);
    },

    _searchArtists: function(tags, form, palette, output, cpId, videoJobId) {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;
      output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">🔍 Checking reference corpus for matches...</div>';

      // First: check reference corpus for BPM/mood/scale matches
      var corpusPromise = (RPGACE.modules.refCorpus && typeof RPGACE.modules.refCorpus.findMatches === 'function')
        ? RPGACE.modules.refCorpus.findMatches(form.bpm, form.mood, form.scale, form.energy, form.genre)
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
            self.logic._addNewArtistsToTaxonomy(lfmArtists, form.mood);
            big        = lfmArtists.filter(function(a) { return a.listeners > 1000000; }).slice(0, 5);
            emerging   = lfmArtists.filter(function(a) { return a.listeners > 10000 && a.listeners <= 1000000; }).slice(0, 10);
            underground = lfmArtists.filter(function(a) { return a.listeners <= 10000; }).slice(0, 5);
            output.innerHTML = '<div style="color:rgba(226,226,236,0.4);font-size:12px;padding:8px 0;">✅ ' + lfmArtists.length + ' Last.fm artists found. Add tracks to your corpus for better matches.</div>';
          }

          self.ui._generateOutputs(form, palette, big, emerging, underground, output, cpId, videoJobId);
        });
      })
      .catch(function(err) {
        output.innerHTML = '<div style="color:#CC4A4A;font-size:12px;padding:8px 0;">Search error: ' + err.message + '</div>';
      });
    },

    _generateOutputs: function(form, palette, big, emerging, underground, output, cpId, videoJobId) {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;
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

      // Aug 6 (Engineer pass, real Content Pipeline bugfix) — real human
      // gate before EITHER Oracle call, per Alex's own direct hand-test
      // report: "it did all of this without any human gating or auto
      // gating, this needs to be step by step." Both calls used to auto-
      // fire — the second one (F18's Visual Treatment) literally CHAINED
      // off the first one's response with no click in between, which was
      // also the real opening for the dangling-capture bug fixed above (a
      // manual click landing in that unsupervised gap could steal the
      // in-flight slot). Gating both behind explicit buttons closes both
      // problems with one change: nothing fires without a real click, so
      // there is no unsupervised window for two sends to collide in.
      self.ui._renderArtistPanel(form, palette, big, emerging, underground, output);

      var gateRow = document.createElement('div');
      gateRow.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:8px;';

      var sendBtn = document.createElement('button');
      sendBtn.textContent = '📤 Send to Oracle — type beat titles, description, outreach, content brief';
      sendBtn.style.cssText = 'width:100%;padding:10px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      sendBtn.onclick = function() {
        sendBtn.disabled = true;
        sendBtn.textContent = '⏳ Sending...';
        if (typeof showPage === 'function') showPage('advisor');
        setTimeout(function() {
          var sent = RPGACE.utils.sendToOracle(prompt);
          if (!sent) {
            sendBtn.disabled = false;
            sendBtn.textContent = '📤 Send to Oracle — type beat titles, description, outreach, content brief';
            RPGACE.utils.toast('⏳ Oracle was busy — try again in a moment', '#E2A83D', 3000);
            return;
          }
          sendBtn.textContent = '✅ Sent — the reply is saved on the beat';
          // Aug 6 (item 2) — Alex's real ask: "pressing log beat... should
          // all be jotted down and send me back to content pipeline, where
          // all the live production phases should be shown." Reuses the
          // shared _captureNextResponse one-shot listener (rule 8, same
          // dangling-capture-safe pattern fixed earlier today — armed only
          // AFTER sendToOracle confirmed it actually sent, never before).
          // Saves the real reply into creative_docs.beat_log_response (no
          // trailer to parse here, just a straight save) then opens the
          // Production Panel as an overlay — it renders fixed/z-9998, so
          // it slides in over the advisor page without navigating away
          // from the reply Alex is reading.
          if (cpId && RPGACE.modules.visualOracle) {
            RPGACE.modules.visualOracle._captureNextResponse(function(text) {
              RPGACE.modules.visualOracle._saveDocToProduction('beat_log_response', text, cpId);
            });
          }
        }, 300);
      };
      gateRow.appendChild(sendBtn);


      output.appendChild(gateRow);
    },

    _renderArtistPanel: function(form, palette, big, emerging, underground, output) {
      // G53: `this` inside a ui/logic function is that SUB-OBJECT, not the
      // module — so `self` is pinned to the module explicitly.
      var self = RPGACE.modules.beatLog;
      output.innerHTML = '';
      output.style.cssText = 'margin-top:16px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;';

      // Colour palette display
      var palRow = document.createElement('div');
      palRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';
      var swatch = document.createElement('div');
      swatch.style.cssText = 'width:32px;height:32px;border-radius:6px;background:' + palette.hex + ';border:1px solid rgba(255,255,255,0.1);flex-shrink:0;';
      var palText = document.createElement('div');
      palText.innerHTML = '<div style="font-size:11px;font-weight:700;color:#D4DAF5;">' + palette.name + '</div><div style="font-size:11px;color:rgba(226,226,236,0.4);">' + RPGACE.utils.phylumLabel(11) + ' · ' + form.scale + ' · ' + palette.hex + '</div>';
      palRow.appendChild(swatch); palRow.appendChild(palText);
      output.appendChild(palRow);

      // Artist tiers
      var tiers = [
        { label: 'Major artists', color: '#C9A84C', artists: big },
        { label: 'Emerging targets', color: '#4CAF82', artists: emerging.slice(0, 8) },
        { label: 'Underground', color: '#4A8CCC', artists: underground },
      ];

      tiers.forEach(function(tier) {
        if (tier.artists.length === 0) return;
        var section = document.createElement('div');
        section.style.cssText = 'margin-bottom:12px;';
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + tier.color + ';margin-bottom:6px;';
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

      // 2026-07-28 (real hand-test feedback): "Save to Notion" replaced.
      // Alex's own words: matches keep being the same handful of names, and
      // he didn't want a Notion dump - he wanted the reference corpus
      // actually built up in Supabase, which is the real fix for repeat
      // matches (a thin corpus with only ~8 well-known names at ~140BPM/
      // Aggressive is exactly why they kept recurring - see refCorpus
      // .findMatches). This button grows that corpus directly from real
      // matches instead, using the current beat's own real metadata as the
      // anchor point for each artist - skips names already in the corpus so
      // repeat beat-logs don't just pile up duplicates.
      var corpusBtn = document.createElement('button');
      corpusBtn.textContent = '💾 Add These Artists to Reference Corpus';
      corpusBtn.style.cssText = 'margin-top:10px;padding:8px 16px;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.25);border-radius:6px;color:#4A8CCC;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      corpusBtn.onclick = function() { self.logic._saveMatchesToCorpus(form, big, emerging, underground, corpusBtn); };
      output.appendChild(corpusBtn);

      RPGACE.utils.toast('✅ Beat logged · ' + (big.length + emerging.length + underground.length) + ' artists found · Check Oracle for outputs', '#C9A84C', 5000);
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public API.
  // The 3 real external call sites (dashDeck.PAGE_PANELS beat-log-panel
  // .ensure -> _inject; contentProductionLive Return to Beat Log ->
  // _openRetroactive; oracleControl._execute log_beat action -> _submit,
  // confirmed by grep as the only ones) keep working byte-identically with
  // zero change on their side. Every other moved function gets a
  // pass-through too, so the module object exposes exactly the same method
  // names it did before this split. `this` here is always the module
  // itself — every real call site invokes these as a property access on
  // RPGACE.modules.beatLog, never as a detached function reference.
  _getMoodTags: function(mood, bpm) { return this.logic._getMoodTags(mood, bpm); },
  _addNewArtistsToTaxonomy: function(artists, mood) { return this.logic._addNewArtistsToTaxonomy(artists, mood); },
  _saveMatchesToCorpus: function(form, big, emerging, underground, btn) { return this.logic._saveMatchesToCorpus(form, big, emerging, underground, btn); },
  _inject: function() { return this.ui._inject(); },
  _parseFilename: function(filename, filepath) { return this.ui._parseFilename(filename, filepath); },
  _getForm: function() { return this.ui._getForm(); },
  _clearForm: function() { return this.ui._clearForm(); },
  _openRetroactive: function(row) { return this.ui._openRetroactive(row); },
  _prefillForm: function(form) { return this.ui._prefillForm(form); },
  _submit: function() { return this.ui._submit(); },
  _submitUpdate: function(form) { return this.ui._submitUpdate(form); },
  _continueAfterLink: function(form, cpId, videoJobId) { return this.ui._continueAfterLink(form, cpId, videoJobId); },
  _searchArtists: function(tags, form, palette, output, cpId, videoJobId) { return this.ui._searchArtists(tags, form, palette, output, cpId, videoJobId); },
  _generateOutputs: function(form, palette, big, emerging, underground, output, cpId, videoJobId) { return this.ui._generateOutputs(form, palette, big, emerging, underground, output, cpId, videoJobId); },
  _renderArtistPanel: function(form, palette, big, emerging, underground, output) { return this.ui._renderArtistPanel(form, palette, big, emerging, underground, output); },

});
/* ===END:beatLog=== */
