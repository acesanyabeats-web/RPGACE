/* ===MODULE:contentRepurpose=== */
RPGACE.register('contentRepurpose', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() {
        self._restructureQuickBar();
        self._injectAgentButtons();
      }, 1500);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._restructureQuickBar(); }, 400);
      }
      if (name === 'agents') {
        setTimeout(function() { self._injectAgentButtons(); }, 400);
      }
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectVideoWorkshopBtn(); }, 400);
      }
    });
  },

  // ── Get last N Oracle messages for dropdown ──────────────────
  _getOracleMessages: function(limit) {
    var chatBox = document.getElementById('chat-box');
    if (!chatBox) return [];
    var children = Array.from(chatBox.children);
    var results = [];
    for (var i = children.length - 1; i >= 0 && results.length < (limit || 8); i--) {
      var el = children[i];
      var cls = el.className || '';
      var txt = el.textContent.trim();
      if (txt.length < 40) continue;
      if (cls.includes('assistant') || cls.includes('oracle') || cls.includes('response') ||
          el.querySelector('[class*="assistant"]') || el.querySelector('[class*="oracle"]')) {
        results.unshift({ text: txt, preview: txt.slice(0, 80) + '...' });
      }
    }
    return results;
  },

  // ── Detect relevant phyla from idea text ─────────────────────
  _detectPhyla: function(ideaText, callback) {
    var text = (ideaText || '').toLowerCase();
    var allPhyla = [
      { num: 1,  name: 'Compositio',           reason: 'Melody, harmony, chord progressions', keywords: ['melody','chord','scale','harmony','progression','notes','key'] },
      { num: 2,  name: 'Percussio',             reason: 'Drums, 808, groove patterns', keywords: ['drum','kick','snare','808','hi-hat','groove','pattern','percussion'] },
      { num: 3,  name: 'Sonus Designatio',      reason: 'Sound design, synthesis, sampling', keywords: ['sound design','synth','sample','patch','oscillator','wavetable','texture'] },
      { num: 4,  name: 'Mixtura',               reason: 'Mixing, EQ, compression, sidechain', keywords: ['mix','eq','compress','sidechain','reverb','delay','level','gain','frequency'] },
      { num: 5,  name: 'Magistra',              reason: 'Mastering, loudness, final chain', keywords: ['master','lufs','limiter','loud','stem','final'] },
      { num: 6,  name: 'Instrumentarium',       reason: 'FL Studio, VSTs, DAW workflow', keywords: ['fl studio','vst','plugin','daw','workflow','edison','mixer','channel','playlist','piano roll'] },
      { num: 7,  name: 'Sensus Auris',          reason: 'Critical listening, reference analysis', keywords: ['listen','reference','ear','compare','a/b','monitor','speaker'] },
      { num: 8,  name: 'Anatomia',              reason: 'Music theory fundamentals', keywords: ['theory','interval','mode','minor','major','scale','degree','chord','tension'] },
      { num: 9,  name: 'Historia',              reason: 'Producer history, era study, influences', keywords: ['producer','artist','era','influence','style','sound like','inspired'] },
      { num: 10, name: 'Psychologia',           reason: 'Creative psychology, flow state', keywords: ['creative','block','inspiration','flow','mindset','habit','routine'] },
      { num: 12, name: 'Fons Educationis',      reason: 'YouTube educators, learning resources', keywords: ['tutorial','learn','teach','explain','breakdown','guide','lesson'] },
      { num: 13, name: 'Contentum',             reason: 'YouTube, Instagram, content strategy', keywords: ['youtube','instagram','reels','hook','thumbnail','title','content','video','tiktok','caption'] },
      { num: 14, name: 'Visio Cinematica',      reason: 'Visual treatment, filmmaker style', keywords: ['visual','cinematic','camera','colour','grade','filmmaker','neural frames','mood board'] },
      { num: 16, name: 'Venditionis Beatorum',  reason: 'Beat selling, Beatstars, licensing', keywords: ['sell','beat store','beatstars','license','lease','exclusive','price'] },
    ];

    var confirmed = [];
    var suggested = [];

    allPhyla.forEach(function(p) {
      var hits = p.keywords.filter(function(k) { return text.includes(k); }).length;
      if (hits >= 2) confirmed.push(p);
      else if (hits === 1) suggested.push(p);
    });

    // Also pull high gap-score nodes to suggest
    if (RPGACE.modules.taxonomySync) {
      RPGACE.modules.taxonomySync.getTopGaps(5).then(function(gaps) {
        var gapPhyla = (gaps || []).map(function(g) {
          return { num: g.phylum_number, name: g.phylum_name, reason: 'Gap score ' + parseFloat(g.gap_score).toFixed(1) + '/10 — adding this makes the video push your knowledge boundary', isGap: true, concept: g.concept, gapScore: g.gap_score };
        });
        callback(confirmed, suggested, gapPhyla);
      }).catch(function() { callback(confirmed, suggested, []); });
    } else {
      callback(confirmed, suggested, []);
    }
  },

  // ── Pull encyclopedia entries for confirmed phyla ─────────────
  _getPhylaContext: function(phylaNums, callback) {
    if (!phylaNums || phylaNums.length === 0) { callback(''); return; }
    RPGACE.sb.select('encyclopedia', 'order=created_at.desc&limit=50')
      .then(function(entries) {
        // Also get taxonomy nodes for these phyla
        return RPGACE.sb.select('taxonomy_nodes', 'order=gap_score.desc&limit=100')
          .then(function(nodes) {
            var relevant = (nodes || []).filter(function(n) {
              return phylaNums.includes(n.phylum_number);
            }).slice(0, 8);
            var context = relevant.map(function(n) {
              return '• ' + n.concept + (n.fl_studio_implementation ? ': ' + n.fl_studio_implementation.slice(0, 100) : '');
            }).join('\n');
            callback(context);
          });
      }).catch(function() { callback(''); });
  },

  // ── Main repurpose popup ──────────────────────────────────────
  openPopup: function() {
    if (document.getElementById('cr-popup-overlay')) return;
    var self = this;
    var oracleMsgs = self._getOracleMessages(8);

    var overlay = document.createElement('div');
    overlay.id = 'cr-popup-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(61,170,110,0.25);border-radius:14px;padding:28px 32px;width:min(620px,95vw);max-height:90vh;overflow-y:auto;position:relative;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Content Repurpose · Step 14';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:18px;font-weight:700;color:#E2E2EC;margin-bottom:20px;';
    titleEl.textContent = 'Repurpose an idea';

    box.appendChild(eyebrow); box.appendChild(titleEl);

    // ── STEP 1: Oracle idea selection ──
    var step1 = document.createElement('div');
    step1.style.cssText = 'margin-bottom:20px;';
    var s1lbl = document.createElement('div');
    s1lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(61,170,110,0.6);margin-bottom:8px;';
    s1lbl.textContent = 'Step 1 — Oracle Contribution';

    var dropdown = document.createElement('select');
    dropdown.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
    var blankOpt = document.createElement('option');
    blankOpt.value = ''; blankOpt.textContent = oracleMsgs.length ? '— Select from recent Oracle responses —' : '— No Oracle conversation yet —';
    dropdown.appendChild(blankOpt);
    oracleMsgs.forEach(function(msg, i) {
      var opt = document.createElement('option');
      opt.value = msg.text;
      opt.textContent = (i+1) + '. ' + msg.preview;
      dropdown.appendChild(opt);
    });

    var oracleContribLbl = document.createElement('div');
    oracleContribLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    oracleContribLbl.textContent = 'Oracle contribution:';

    var oracleContrib = document.createElement('textarea');
    oracleContrib.id = 'cr-oracle-contrib';
    oracleContrib.placeholder = 'Select from dropdown above, or paste Oracle content here...';
    oracleContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:100px;margin-bottom:10px;';

    dropdown.onchange = function() {
      if (dropdown.value) oracleContrib.value = dropdown.value.slice(0, 1000);
    };

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept Oracle contribution';
    acceptBtn.style.cssText = 'padding:8px 16px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';

    step1.appendChild(s1lbl); step1.appendChild(dropdown);
    step1.appendChild(oracleContribLbl); step1.appendChild(oracleContrib);
    step1.appendChild(acceptBtn);
    box.appendChild(step1);

    // ── STEP 2: Your contribution (hidden until step 1 accepted) ──
    var step2 = document.createElement('div');
    step2.style.cssText = 'margin-bottom:20px;display:none;';
    var s2lbl = document.createElement('div');
    s2lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;';
    s2lbl.textContent = 'Step 2 — Your Contribution';
    var yourContribLbl = document.createElement('div');
    yourContribLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    yourContribLbl.textContent = 'Your contribution:';
    var yourContrib = document.createElement('textarea');
    yourContrib.id = 'cr-your-contrib';
    yourContrib.placeholder = 'Add your personal angle, specific details, or additional context here (optional)...';
    yourContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;margin-bottom:10px;';
    var step2NextBtn = document.createElement('button');
    step2NextBtn.textContent = '→ Detect taxonomy';
    step2NextBtn.style.cssText = 'padding:8px 16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    step2.appendChild(s2lbl); step2.appendChild(yourContribLbl);
    step2.appendChild(yourContrib); step2.appendChild(step2NextBtn);
    box.appendChild(step2);

    // ── STEP 3: Taxonomy selection (hidden until step 2) ──
    var step3 = document.createElement('div');
    step3.style.cssText = 'margin-bottom:20px;display:none;';
    var s3lbl = document.createElement('div');
    s3lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(74,144,226,0.6);margin-bottom:6px;';
    s3lbl.textContent = 'Step 3 — Taxonomy Selection';
    var s3sub = document.createElement('div');
    s3sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:12px;';
    s3sub.textContent = 'Confirmed phyla are auto-selected. Tick suggested ones that add value. Red = knowledge gap — include to make the video push your limits.';
    var phylaList = document.createElement('div');
    phylaList.id = 'cr-phyla-list';
    var generateBtn = document.createElement('button');
    generateBtn.textContent = '⚡ Generate all platform outputs';
    generateBtn.style.cssText = 'margin-top:14px;padding:10px 20px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    step3.appendChild(s3lbl); step3.appendChild(s3sub);
    step3.appendChild(phylaList); step3.appendChild(generateBtn);
    box.appendChild(step3);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;';
    closeBtn.onclick = function() { overlay.remove(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ── Step 1 accept ──
    acceptBtn.onclick = function() {
      if (!oracleContrib.value.trim()) {
        RPGACE.utils.toast('Add Oracle contribution first', '#E25454', 2000);
        return;
      }
      step1.style.opacity = '0.5';
      step1.style.pointerEvents = 'none';
      step2.style.display = 'block';
      step2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ── Step 2 next ──
    step2NextBtn.onclick = function() {
      var oracleTxt = oracleContrib.value.trim();
      var yourTxt = yourContrib.value.trim();
      var combined = oracleTxt + ' ' + yourTxt;
      step2.style.opacity = '0.5';
      step2.style.pointerEvents = 'none';
      step3.style.display = 'block';
      phylaList.innerHTML = '<div style="color:rgba(226,226,236,0.3);font-size:12px;">Detecting relevant phyla...</div>';
      step3.scrollIntoView({ behavior: 'smooth', block: 'center' });

      self._detectPhyla(combined, function(confirmed, suggested, gapPhyla) {
        phylaList.innerHTML = '';
        var allToShow = [];
        confirmed.forEach(function(p) { allToShow.push({ p: p, type: 'confirmed' }); });
        suggested.forEach(function(p) { allToShow.push({ p: p, type: 'suggested' }); });
        gapPhyla.forEach(function(p) { allToShow.push({ p: p, type: 'gap' }); });

        if (allToShow.length === 0) {
          phylaList.innerHTML = '<div style="color:rgba(226,226,236,0.3);font-size:12px;">No specific phyla detected — will use general production context.</div>';
          return;
        }

        allToShow.forEach(function(item) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:6px;' +
            (item.type === 'gap' ? 'background:rgba(226,84,84,0.06);border:1px solid rgba(226,84,84,0.2);' :
             item.type === 'confirmed' ? 'background:rgba(61,170,110,0.06);border:1px solid rgba(61,170,110,0.15);' :
             'background:rgba(74,144,226,0.04);border:1px solid rgba(74,144,226,0.1);');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.phylumNum = item.p.num;
          cb.dataset.phylumName = item.p.name;
          cb.checked = item.type === 'confirmed' || item.type === 'gap';
          cb.style.cssText = 'margin-top:3px;flex-shrink:0;cursor:pointer;';
          var info = document.createElement('div');
          var nameEl = document.createElement('div');
          nameEl.style.cssText = 'font-size:12px;font-weight:700;color:' +
            (item.type === 'gap' ? '#E25454' : item.type === 'confirmed' ? '#3DAA6E' : '#4A90E2') + ';';
          nameEl.textContent = (item.type === 'gap' ? '🔴 ' : item.type === 'confirmed' ? '✅ ' : '💡 ') +
            'Phylum ' + item.p.num + ' — ' + item.p.name +
            (item.p.gapScore ? ' (Gap ' + parseFloat(item.p.gapScore).toFixed(1) + '/10)' : '');
          var reasonEl = document.createElement('div');
          reasonEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-top:2px;';
          reasonEl.textContent = item.p.reason + (item.p.concept ? ' · Concept: ' + item.p.concept : '');
          info.appendChild(nameEl); info.appendChild(reasonEl);
          row.appendChild(cb); row.appendChild(info);
          phylaList.appendChild(row);
        });
      });

      // ── Generate ──
      generateBtn.onclick = function() {
        var oracleTxt = oracleContrib.value.trim();
        var yourTxt = yourContrib.value.trim();
        var checkedPhyla = Array.from(phylaList.querySelectorAll('input[type="checkbox"]:checked'))
          .map(function(cb) { return { num: parseInt(cb.dataset.phylumNum), name: cb.dataset.phylumName }; });

        generateBtn.textContent = '⏳ Fetching taxonomy context...';
        generateBtn.disabled = true;

        self._getPhylaContext(checkedPhyla.map(function(p){return p.num;}), function(taxonomyContext) {
          var titleGuess = oracleTxt.slice(0, 60).replace(/[^a-zA-Z0-9\s]/g,'').trim() || 'Content Idea';

          var prompt = 'Repurpose the following content idea into 4 platform formats for @AceSanyaBeats (FL Studio, UK hip hop, aspiring producers 18-35).\n\n' +
            'ORACLE CONTRIBUTION:\n' + oracleTxt.slice(0, 800) + '\n\n' +
            (yourTxt ? 'MY ADDITIONAL CONTEXT:\n' + yourTxt + '\n\n' : '') +
            (taxonomyContext ? 'TAXONOMY KNOWLEDGE CONTEXT (use this to add depth and teaching credibility):\n' + taxonomyContext + '\n\n' : '') +
            'CONFIRMED PHYLA: ' + checkedPhyla.map(function(p){return p.name;}).join(', ') + '\n\n' +
            'Generate ALL FOUR with different opening lines — no copy-paste between platforms:\n\n' +
            '1. 📸 INSTAGRAM REELS CAPTION\nHook (stops scroll in 2 seconds) + value + CTA. Under 150 words. Line breaks. 3-5 hashtags.\n\n' +
            '2. 🎬 YOUTUBE SHORTS HOOK\n8-word text overlay + spoken hook line + one-line video description. Question or bold claim.\n\n' +
            '3. 🎵 TIKTOK CAPTION\nDifferent angle to Instagram. Casual, direct. Under 100 words. 1-2 trending hooks. Hashtags.\n\n' +
            '4. 📧 EMAIL BLURB\nExactly 60 words. Subject line included. Producer newsletter tone. Personal but professional. CTA at end.\n\n' +
            'After the 4 formats, add:\n5. 🎬 YOUTUBE SCRIPT OUTLINE — intro hook, 3-5 teaching sections with key points, outro CTA\n6. 🎛 PRODUCTION TEACHING ANGLE — what to demonstrate in FL Studio, which concepts to explain, difficulty level\n\n' +
            'Be specific to FL Studio and UK hip hop throughout.';

          overlay.remove();
          RPGACE.utils.sendToOracle(prompt);

          // Hand off to Content Production Live
          if (RPGACE.modules.contentProductionLive) {
            RPGACE.modules.contentProductionLive.createEntry({
              title: titleGuess,
              idea: oracleTxt,
              your_context: yourTxt,
              taxonomy_nodes: checkedPhyla,
              status: 'Idea'
            });
          }

          RPGACE.utils.toast('⚡ Generating outputs + creating ConID entry', '#3DAA6E', 3000);
        });
      };
    };
  },

  _restructureQuickBar: function() {
    if (document.getElementById('cr-restructured')) return;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var self = this;

    // Remove 4 redundant buttons
    Array.from(row.querySelectorAll('button')).forEach(function(btn) {
      var txt = btn.textContent.trim();
      if (txt === '📋 New quests' || txt === '📧 Draft email' ||
          txt === '📓 Log to Notion' || txt === '🎬 YT stats') {
        btn.remove();
      }
    });

    // Add Repurpose button
    if (!document.getElementById('cr-btn')) {
      var crBtn = document.createElement('button');
      crBtn.id = 'cr-btn';
      crBtn.className = 'agent-btn';
      crBtn.textContent = '🔀 Repurpose';
      crBtn.style.cssText = 'border-color:rgba(61,170,110,0.4);color:#3DAA6E;background:rgba(61,170,110,0.08);margin-left:4px;';
      crBtn.onclick = function() { self.openPopup(); };
      row.appendChild(crBtn);
    }

    row.id = 'cr-restructured';
    console.log('[RPGACE:contentRepurpose] Quick bar restructured');
  },

  _injectAgentButtons: function() {
    if (document.getElementById('agent-quick-btns')) return;
    var self = this;
    var agentPage = document.getElementById('page-agents');
    if (!agentPage) return;

    var wrap = document.createElement('div');
    wrap.id = 'agent-quick-btns';
    wrap.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px 20px;margin-bottom:20px;';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(226,226,236,0.25);text-transform:uppercase;margin-bottom:12px;';
    lbl.textContent = 'Quick Actions';
    var btnGrid = document.createElement('div');
    btnGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    var actions = [
      { label: '📋 New Quests', onclick: function() {
        if (typeof showPage==='function') showPage('advisor');
        setTimeout(function(){ RPGACE.utils.sendToOracle('Give me 3 specific career quests for @AceSanyaBeats today. FL Studio beats, UK hip hop, aspiring producers 18-35. Each: QUEST: [name] | XP: [amount] | Category: [type]'); }, 300);
      }},
      { label: '📧 Draft Email', onclick: function() {
        if (typeof showPage==='function') showPage('advisor');
        setTimeout(function(){ RPGACE.utils.fillGaps('Draft a professional email for @AceSanyaBeats. PURPOSE: [DESCRIBE WHO YOU ARE EMAILING AND WHY]. Sign as: Alex | @AceSanyaBeats | acesanyabeats@gmail.com', function(f){ RPGACE.utils.sendToOracle(f); }); }, 300);
      }},
      { label: '📓 Log to Notion', onclick: function() {
        var today = new Date().toISOString().split('T')[0];
        RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
          parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
          title: 'RPGACE Session — ' + today,
          markdown: '## Session Log\n**Date:** ' + today + '\n\nLogged from RPGACE.'
        }).then(function(){ RPGACE.utils.toast('📓 Logged to Notion', '#9B59B6', 3000); })
          .catch(function(e){ RPGACE.utils.toast('Error: '+e.message, '#E25454', 3000); });
      }},
      { label: '🎬 YT Stats', onclick: function() {
        RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
          .then(function(r){ var d=r.data||r; RPGACE.utils.sendToOracle('📊 YouTube Stats:\nChannel: '+(d.name||'AceSanya')+'\nVideos: '+(d.videoCount||0)+'\nViews: '+(d.viewCount||0)+'\n\nWhat are my 3 most important growth actions this week?'); if(typeof showPage==='function') showPage('advisor'); })
          .catch(function(e){ RPGACE.utils.toast('Error: '+e.message,'#E25454',3000); });
      }},
    ];

    actions.forEach(function(a) {
      var btn = document.createElement('button');
      btn.className = 'agent-btn';
      btn.textContent = a.label;
      btn.onclick = a.onclick;
      btnGrid.appendChild(btn);
    });

    wrap.appendChild(lbl); wrap.appendChild(btnGrid);
    agentPage.insertBefore(wrap, agentPage.firstChild);
  },

  _injectVideoWorkshopBtn: function() {
    if (document.getElementById('vw-repurpose-btn')) return;
    var self = this;
    var sections = document.querySelectorAll('.section-title, h2, h3');
    var vwSection = Array.from(sections).find(function(s){ return s.textContent && s.textContent.includes('VIDEO WORKSHOP'); });
    if (!vwSection) return;
    var btn = document.createElement('button');
    btn.id = 'vw-repurpose-btn';
    btn.textContent = '🔀 Repurpose for All Platforms';
    btn.style.cssText = 'margin-top:10px;padding:9px 18px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;display:block;';
    btn.onclick = function() { self.openPopup(); };
    vwSection.parentElement.insertBefore(btn, vwSection.nextSibling);
  },

});
/* ===END:contentRepurpose=== */
