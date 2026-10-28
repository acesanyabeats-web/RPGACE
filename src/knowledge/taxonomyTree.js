
/* ===MODULE:taxonomyTree=== */
RPGACE.register('taxonomyTree', {
  domain: 'knowledge',

  // Renumbered Aug 11 to match the chronological/thematic display order
  // (Craft & Production / Knowledge & Mind / Visual & Creative Identity /
  // Business & Distribution / Technology & Misc) - real Alex ask, "renumber
  // the phylums so they match the chronological order above." Swap was
  // 11<->12 (Lingua Musicae <-> Fons Educationis) and 13<->14 (Contentum <->
  // Visio Cinematica); the underlying group membership was already correct,
  // only which NUMBER represents each phylum changed. Supabase's
  // taxonomy_tree/taxonomy_nodes/taxonomy_proposals were swapped first via a
  // safe temp-value UPDATE, verified by count, then this code was updated to
  // match - never the other way around.
  PHYLUM_NAMES: {
    1:'Compositio',2:'Percussio',3:'Sonus Designatio',4:'Mixtura',5:'Magistra',
    6:'Instrumentarium',7:'Sensus Auris',8:'Anatomia',9:'Historia',10:'Psychologia',
    11:'Fons Educationis',12:'Lingua Musicae',13:'Visio Cinematica',14:'Contentum',
    15:'Collaboratio',16:'Venditionis Beatorum',17:'Negotium',18:'Distributio',
    19:'Referentia Mercati',20:'Technologia',21:'Miscellaneous Ordinanda',
    // RC-0 (Oct 15 2026, names approved by Alex): phyla for the realms that had none.
    22:'Ars Culinaria',23:'Corpus Athleticum',24:'Ars Vivendi',25:'Cura Domus',
    26:'Res Pecuniaria',27:'Peregrinatio',28:'Mens Sana',29:'Societas'
  },

  PHYLUM_ENGLISH: {
    1:'Melody, Harmony, Chords',2:'Drums, 808s, Rhythm',3:'Sound Design, Synths, Sampling',
    4:'Mixing, EQ, Compression',5:'Mastering, Loudness',6:'FL Studio, VSTs, DAW Workflow',
    7:'Critical Listening, Reference',8:'Music Theory Fundamentals',9:'Producer History, Influences',
    10:'Creative Psychology, Flow',11:'Learning Methods, Study Skills',12:'Colour, Mood, Visual Language',
    13:'Visual Treatment, Filmmaking',14:'YouTube, Instagram, Content',15:'Collaboration, Outreach',
    16:'Beat Selling, Licensing',17:'Business, Operations',18:'Distribution, Release',
    19:'Market Reference, Trends',20:'Technology, Tools',21:'Miscellaneous',
    22:'Cooking, Recipes, Nutrition',23:'Training, Strength, Recovery',24:'Daily Life, Habits, Wellbeing',
    25:'Home, Cleaning, Upkeep',26:'Money, Budgeting, Saving',27:'Travel, Places, Culture',
    28:'Mindset, Focus, Rest',29:'Friends, Family, Networking'
  },

  // One-line role reminder per phylum — restated wherever a phylum shows up
  // with real context (Oracle prompts, review popups, taxonomy_map.html),
  // not just the terse number+name shown everywhere else.
  PHYLUM_PURPOSE: {
    1:'The core melodic/harmonic decisions that make a beat memorable — chord choices, melody writing, key/scale selection.',
    2:'The rhythmic foundation of a beat — drum programming, 808 patterns, groove and swing.',
    3:'Shaping and sourcing the actual sounds used — synth patches, sampling, layering, texture.',
    4:'Balancing and polishing individual elements so they sit together correctly before mastering.',
    5:'Final loudness/tonal polish and platform-ready export standards.',
    6:'The tools and technical workflow used to actually build a track — FL Studio techniques, plugin usage, efficiency.',
    7:'Training the ear — critical listening skills, reference-track comparison, spotting what\'s wrong.',
    8:'The underlying theory knowledge (scales, intervals, structure) the other Craft phyla draw on.',
    9:'Knowing the lineage of producers and records that shaped the genres being worked in.',
    10:'The mental/creative-process side of producing — flow state, motivation, creative blocks.',
    // RC-0 (Oct 15 2026, Alex): 11 is how to learn (Scholar); a tutorial is filed by its subject.
    11:'How to learn well — study methods, memory, practice and understanding, for any subject.',
    12:'Translating musical feel (key, scale, mood) into a visual/colour language for content and branding.',
    13:'The visual/cinematic direction for beat videos — directors, camera language, treatment docs.',
    14:'Content creation and posting strategy across platforms.',
    15:'Finding and reaching out to artists/collaborators.',
    16:'Monetising beats — licensing terms, pricing, marketplace listings.',
    17:'The operational/business admin side of running this as a project.',
    18:'Getting finished work out onto platforms — release logistics and requirements.',
    19:'Tracking what\'s trending/working in the market right now.',
    20:'The broader tech/tooling stack outside the DAW itself.',
    21:'Deliberate catch-all for anything that doesn\'t fit elsewhere yet.',
    22:'Cooking well — recipes, techniques, ingredients and nutrition.',
    23:'Training the body — strength, fitness, recovery and sport.',
    24:'Running daily life well — habits, routines, health and wellbeing.',
    25:'Keeping the home — cleaning, laundry, repairs and organising.',
    26:'Handling money — budgeting, saving, spending and planning.',
    27:'Going places — travel, trips, culture and new experiences.',
    28:'Looking after the mind — mindset, focus, calm and rest.',
    29:'People — friends, family, relationships and networking.',
  },

  // Larger-scope groupings of the 21 phyla, derived directly from the
  // PHYLUM_PURPOSE lines above (Craft phyla vs the Knowledge phyla they
  // draw on vs Visual identity vs Business/Distribution vs Tech/Misc).
  // Built July 17 so the phylum switcher can render as a grouped list
  // instead of one flat undifferentiated row - real UX gap found hand-
  // testing the nav tab with 10 phyla already live. Numbers updated Aug 11
  // for the 11<->12/13<->14 renumber above; group membership unchanged.
  PHYLUM_SCOPE_GROUPS: [
    { label: 'Craft & Production', phyla: [1, 2, 3, 4, 5, 6, 7] },
    { label: 'Knowledge & Mind', phyla: [8, 9, 10, 11] },
    { label: 'Visual & Creative Identity', phyla: [12, 13] },
    { label: 'Business & Distribution', phyla: [14, 15, 16, 17, 18, 19] },
    { label: 'Technology & Misc', phyla: [20, 21] },
    { label: 'Life', phyla: [22, 23, 24, 25, 26, 27, 28, 29] },
  ],

  // Rank naming, by depth. This convention previously only existed as a
  // display-only array in taxonomy_map.html - Phylum Path is the first live
  // app feature that reasons about rank names, not just raw depth integers.
  RANK_NAMES: ['Phylum', 'Order', 'Class', 'Family', 'Genus', 'Species', 'Variant'],


  // G53 (Sep 2026) split note: ui holds real DOM construction (the
  // manual-entry button + popup, the named-topic picker, and the full
  // accept/edit/reject/morph proposal popup). logic holds the actual
  // placement/proposal pipeline - decision delegation to phylumPath,
  // the taxonomy_proposals writes, the accept/write chain, and the
  // Oracle content-generation call - with zero DOM refs. Every moved
  // function was MOVED wholesale, never rewritten. Any function that
  // reads a module-scope field (PHYLUM_NAMES/PHYLUM_ENGLISH/
  // PHYLUM_PURPOSE/PHYLUM_SCOPE_GROUPS/RANK_NAMES) or calls a sibling
  // method resolves through `var self = RPGACE.modules.taxonomyTree;`
  // (or a direct inline reference for a one-liner), never bare `this.`
  // - a function invoked as ui.X()/logic.X() has `this` bound to that
  // sub-object, not the module. ONE deliberate exception, documented
  // in place, not silently fixed: extractNamedTopics's own bare,
  // undeclared `self` (a real pre-existing bug predating this split)
  // is left completely untouched, per rule 4.

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._injectManualButton(); });
    setTimeout(function() { self.logic.checkPaused(true); }, 4000); // LL-3: learn whether the tree is paused (sb is ready by then)
    // Aug 23 2026 (UI2) - was a page:show listener on the retired Research Lab
    // page. This button anchors itself as a DOM sibling before #cp-idea-bank /
    // #beat-log-panel, so its real re-injection moment is now those two panels
    // being opened (the boot task above still covers the first build).
    RPGACE.hooks.on('worm-panel:open', function(panelId) {
      if (panelId !== 'cp-idea-bank' && panelId !== 'beat-log-panel') return;
      setTimeout(function() { self._injectManualButton(); }, 500);
    });
  },

  // ui - rendering/DOM.
  ui: {

  // ── Manual trigger button ─────────────────────────────────────
  _injectManualButton: function() {
    if (document.getElementById('taxtree-manual-btn')) return;
    var self = RPGACE.modules.taxonomyTree;
    // Aug 23 2026 (UI2/UI3) — was 'page-research' (confirmed dead) ||
    // 'page-learning' (the retired Research Lab page). This button is NOT one
    // of the relocated panels; it inserts itself as a DOM SIBLING immediately
    // before whichever of #cp-idea-bank / #beat-log-panel exists first, so it
    // simply needs to be built into the same container those two now live in
    // — the shared staging holder. dashDeck._openPanelPopup carries this
    // button along with its anchor panel when it relocates it into a popup,
    // so the sibling relationship survives the move (that stranding risk is
    // exactly why those two panels were never relocated before this pass).
    var page = RPGACE.utils.panelHome();
    if (!page) return;

    var btn = document.createElement('button');
    btn.id = 'taxtree-manual-btn';
    btn.textContent = '🌳 Add to Taxonomy Tree';
    btn.style.cssText = 'padding:9px 18px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:16px;';
    btn.onclick = function() { self._openManualEntry(); };

    var anchor = document.getElementById('cp-idea-bank') || document.getElementById('beat-log-panel');
    if (anchor) anchor.parentElement.insertBefore(btn, anchor);
    else page.insertBefore(btn, page.firstChild);
  },

  _openManualEntry: function() {
    var self = RPGACE.modules.taxonomyTree;
    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.9', width: '520px', borderColor: 'rgba(155,89,182,0.25)',
      eyebrow: 'Taxonomy Tree · Manual Entry', title: 'What topic do you want to add?',
      noDefaultClose: true,
    });
    var overlay = pop.overlay, box = pop.box;

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'e.g. 1-1-3-4 chord progression in natural minor';
    input.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:13px;padding:10px 12px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:14px;';

    var phylumSelect = document.createElement('select');
    phylumSelect.style.cssText = 'width:100%;background:#1a1a24;border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
    var blank = document.createElement('option'); blank.value=''; blank.textContent='— which phylum does this belong to? —';
    blank.style.color = '#D4DAF5'; blank.style.background = '#1a1a24';
    phylumSelect.appendChild(blank);
    Object.keys(self.PHYLUM_ENGLISH).forEach(function(num) {
      var opt = document.createElement('option');
      opt.value = num;
      opt.textContent = RPGACE.utils.phylumLabel(num);
      opt.style.color = '#D4DAF5'; opt.style.background = '#1a1a24';
      phylumSelect.appendChild(opt);
    });

    // Native content preview — shows what's already in the selected phylum
    var previewBox = document.createElement('div');
    previewBox.id = 'taxtree-phylum-preview';
    previewBox.style.cssText = 'display:none;background:rgba(155,89,182,0.05);border:1px solid rgba(155,89,182,0.15);border-radius:6px;padding:10px 12px;margin-bottom:16px;font-size:11px;color:rgba(226,226,236,0.55);';

    phylumSelect.onchange = function() {
      var num = parseInt(phylumSelect.value);
      if (!num) { previewBox.style.display = 'none'; return; }
      previewBox.style.display = 'block';
      previewBox.innerHTML = '<div style="color:rgba(155,89,182,0.7);font-weight:700;margin-bottom:4px;">Loading what already lives here...</div>';
      RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + num + '&order=created_at.desc&limit=5')
        .then(function(nodes) {
          nodes = nodes || [];
          if (nodes.length === 0) {
            previewBox.innerHTML = '<div style="color:rgba(226,226,236,0.35);">Nothing in this phylum yet — you would be first to add here. Examples of what belongs: <strong style="color:#9B6EC8;">' + self.PHYLUM_ENGLISH[num] + '</strong></div>';
            return;
          }
          previewBox.innerHTML = '<div style="color:rgba(155,89,182,0.7);font-weight:700;margin-bottom:4px;">Already in ' + self.PHYLUM_ENGLISH[num] + ':</div>' +
            nodes.map(function(n) { return '• ' + n.name; }).join('<br>');
        }).catch(function() {
          previewBox.innerHTML = '<div style="color:rgba(226,226,236,0.3);">Could not load preview</div>';
        });
    };

    var genBtn = document.createElement('button');
    genBtn.textContent = '🌳 Propose Lineage';
    genBtn.style.cssText = 'padding:10px 20px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:8px;color:#9B6EC8;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    genBtn.onclick = function() {
      var topic = input.value.trim();
      var phylum = parseInt(phylumSelect.value);
      if (!topic) { RPGACE.utils.toast('Add a topic first', '#CC4A4A', 2000); return; }
      if (!phylum) { RPGACE.utils.toast('Select a phylum', '#CC4A4A', 2000); return; }
      overlay.remove();
      self.proposeLineage(topic, phylum, 'manual', null);
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:8px;';
    cancelBtn.onclick = function() { overlay.remove(); };

    box.appendChild(input); box.appendChild(phylumSelect);
    box.appendChild(previewBox);
    box.appendChild(genBtn); box.appendChild(cancelBtn);
    input.focus();
  },

  // ── Picker shown when Oracle's response contains multiple named nodes ──
  // ── for one phylum — lets user pick which specific ones to propose,   ──
  // ── instead of collapsing them all into one vague blob topic.          ──
  _showNamedTopicPicker: function(candidates, phylumNumber) {
    var self = RPGACE.modules.taxonomyTree;
    var phylumName = self.PHYLUM_NAMES[phylumNumber] || '';
    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.9', width: '520px', borderColor: 'rgba(155,89,182,0.3)',
      eyebrow: 'Oracle already named these — pick which to propose',
      title: phylumName + ' — ' + candidates.length + ' named nodes found',
      noDefaultClose: true,
    });
    var overlay = pop.overlay, box = pop.box;

    candidates.forEach(function(c, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'named-topic-' + i; cb.checked = true;
      cb.style.cssText = 'margin-top:3px;flex-shrink:0;';
      var label = document.createElement('div');
      label.innerHTML = '<div style="font-size:12px;font-weight:600;color:#D4DAF5;">' + c.name + '</div>' +
        '<div style="font-size:11px;color:rgba(226,226,236,0.35);margin-top:2px;">' + c.fullText.slice(0, 100) + '</div>';
      row.appendChild(cb); row.appendChild(label);
      box.appendChild(row);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var proceedBtn = document.createElement('button');
    proceedBtn.textContent = '🌳 Propose selected';
    proceedBtn.style.cssText = 'flex:1;padding:10px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    proceedBtn.onclick = function() {
      var selected = candidates.filter(function(c, i) {
        var cb = document.getElementById('named-topic-' + i);
        return cb && cb.checked;
      });
      overlay.remove();
      // Propose each selected item as its own separate lineage, sequentially
      selected.forEach(function(c) {
        self.proposeLineage(c.fullText, phylumNumber, 'oracle', null);
      });
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(proceedBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
  },

  // ── The accept/edit/reject/morph popup ────────────────────────────
  _showProposalPopup: function(proposal) {
    var self = RPGACE.modules.taxonomyTree;
    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.92', scroll: true, width: '560px', borderColor: 'rgba(155,89,182,0.3)',
      eyebrow: 'Proposed Taxonomy Lineage · ' + proposal.sourceType,
      title: RPGACE.utils.phylumLabel(proposal.phylumNumber), noDefaultClose: true,
    });
    var overlay = pop.overlay, box = pop.box;
    var purposeLine = document.createElement('div');
    purposeLine.style.cssText = 'font-size:10.5px;color:rgba(226,226,236,0.4);margin-bottom:14px;line-height:1.5;';
    purposeLine.textContent = (self.PHYLUM_PURPOSE && self.PHYLUM_PURPOSE[proposal.phylumNumber]) || '';
    box.appendChild(purposeLine);

    // Insight summary — what the underlying content actually IS, so the lineage
    // isn't a guessing game. Reuses the leaf's own Oracle-generated explainer,
    // no new API call, keeps the "AI cost confined to 2 touchpoints" rule intact.
    if (proposal.explainers && proposal.explainers.length) {
      var insightSummary = document.createElement('div');
      insightSummary.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);line-height:1.6;margin-bottom:14px;padding:10px 12px;background:rgba(155,89,182,0.04);border-left:2px solid rgba(155,89,182,0.3);border-radius:0 6px 6px 0;';
      var leafSummary = proposal.explainers[proposal.explainers.length - 1] || '';
      insightSummary.innerHTML = '<strong style="color:rgba(226,226,236,0.7);">What this insight is:</strong> ' + leafSummary;
      box.appendChild(insightSummary);
    }

    var stepsContainer = document.createElement('div');
    stepsContainer.id = 'taxtree-steps-editor';
    stepsContainer.style.cssText = 'margin-bottom:16px;';

    function renderSteps() {
      stepsContainer.innerHTML = '';
      proposal.path.forEach(function(step, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;';
        var depthLabel = document.createElement('span');
        depthLabel.style.cssText = 'font-size:11px;color:rgba(155,89,182,0.5);flex-shrink:0;min-width:16px;';
        depthLabel.textContent = (i + 1) + '.';
        var stepInput = document.createElement('input');
        stepInput.type = 'text';
        stepInput.value = step;
        stepInput.style.cssText = 'flex:1;background:none;border:none;color:#D4DAF5;font-size:12px;font-family:Rajdhani,sans-serif;outline:none;';
        stepInput.oninput = function() { proposal.path[i] = stepInput.value; if (typeof renderSummary === 'function') renderSummary(); updatePreview(); };
        var delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.5);cursor:pointer;font-size:14px;flex-shrink:0;';
        delBtn.onclick = function() {
          proposal.path.splice(i, 1);
          proposal.explainers.splice(i, 1);
          renderSteps();
          if (typeof renderSummary === 'function') renderSummary();
          updatePreview();
        };
        row.appendChild(depthLabel); row.appendChild(stepInput); row.appendChild(delBtn);
        stepsContainer.appendChild(row);
      });

      var addStepBtn = document.createElement('button');
      addStepBtn.textContent = '+ Insert step';
      addStepBtn.style.cssText = 'padding:5px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.35);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      addStepBtn.onclick = function() {
        proposal.path.push('New step');
        proposal.explainers.push('');
        renderSteps();
        if (typeof renderSummary === 'function') renderSummary();
        updatePreview();
      };
      stepsContainer.appendChild(addStepBtn);
    }
    renderSteps();
    box.appendChild(stepsContainer);

    // Restored: this was referenced (renderSteps calls it on every edit) but
    // had no definition anywhere in this function - dead calls found July 8.
    var summaryLabel = document.createElement('div');
    summaryLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(155,89,182,0.5);margin-bottom:6px;';
    summaryLabel.textContent = 'What each step means';
    box.appendChild(summaryLabel);

    var summaryBox = document.createElement('div');
    summaryBox.style.cssText = 'max-height:180px;overflow-y:auto;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;margin-bottom:16px;';

    function renderSummary() {
      summaryBox.innerHTML = '';
      proposal.path.forEach(function(stepName, i) {
        var isLeaf = (i === proposal.path.length - 1);
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:10px;padding-bottom:10px;' + (i < proposal.path.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.05);' : '');
        var nameLine = document.createElement('div');
        nameLine.style.cssText = 'font-size:11px;font-weight:700;color:' + (isLeaf ? '#4CAF82' : '#D4DAF5') + ';';
        nameLine.textContent = (isLeaf ? '🎯 ' : '📁 ') + stepName;
        row.appendChild(nameLine);
        var explainerText = proposal.explainers[i];
        if (explainerText) {
          var explLine = document.createElement('div');
          explLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);margin-top:3px;line-height:1.5;padding-left:' + (i * 10) + 'px;';
          explLine.textContent = explainerText;
          row.appendChild(explLine);
        }
        summaryBox.appendChild(row);
      });
    }
    renderSummary();
    box.appendChild(summaryBox);

    var pathPreview = document.createElement('div');
    pathPreview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:16px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;';
    function updatePreview() {
      pathPreview.textContent = proposal.phylumName + ' → ' + proposal.path.join(' → ');
    }
    updatePreview();
    box.appendChild(pathPreview);

    // No mismatch-notice path — implausible phyla are filtered out BEFORE
    // this popup can ever open (isPlausiblePhylum pre-check gates the propose
    // button itself in rpgace_core.js's badge panel, zero API cost).
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept & Generate Content';
    acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    acceptBtn.onclick = function() {
      updatePreview();
      overlay.remove();
      self._acceptLineage(proposal);
    };

    var rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    rejectBtn.onclick = function() { overlay.remove(); };

    btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
    box.appendChild(btnRow);
  },


  },

  // logic - business logic/data.
  logic: {

  // LL-3 (Oct 13 2026, "Life Library & Knowledge Untangle") - the ONE
  // pause switch for automatic tree growth. The phyla were emptied Sep 25
  // 2026 to be rebuilt by hand from reviewed jargon; until that starts,
  // video analysis, encyclopedia sync and Bookworm must not keep queueing
  // placements into a tree that has nothing to attach to. Automatic resume
  // (Alex's choice): paused exactly while taxonomy_tree has zero
  // non-archived rows - the first rebuilt branch turns it back on, no code
  // change needed. Defaults to paused until the first check answers, and a
  // failed check keeps the last known answer (fails closed: no surprise
  // proposals).
  _pause: { paused: true, checkedAt: 0 },
  isPaused: function() { return RPGACE.modules.taxonomyTree.logic._pause.paused; },
  markDormant: function(on) {
    if (!document.getElementById('tax-dormant-css')) {
      var st = document.createElement('style'); st.id = 'tax-dormant-css';
      st.textContent = 'body.tax-dormant .tax-dormant-hide{display:none!important}';
      document.head.appendChild(st);
    }
    document.body.classList.toggle('tax-dormant', !!on);
  },
  checkPaused: function(force) {
    var st = RPGACE.modules.taxonomyTree.logic._pause;
    if (!force && st.checkedAt && (Date.now() - st.checkedAt) < 5 * 60 * 1000) return Promise.resolve(st.paused);
    if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(st.paused);
    // A forced check must see the live tree, not RPGACE.cache's 60s copy.
    if (force && RPGACE.cache && RPGACE.cache.clear) RPGACE.cache.clear('taxonomy_tree');
    return RPGACE.sb.select('taxonomy_tree', 'select=id&status=neq.archived&limit=1').then(function(rows) {
      st.paused = !(Array.isArray(rows) && rows.length > 0);
      // KR-4 (Oct 27 2026): tree tools hide while the tree is empty, and come back with it.
      RPGACE.modules.taxonomyTree.logic.markDormant(st.paused);
      st.checkedAt = Date.now();
      return st.paused;
    }).catch(function() { return st.paused; });
  },
  PAUSE_NOTE: 'Paused until the phyla are rebuilt. Video analysis and Bookworm stop adding to the tree; their insights still land as idea cards in the Encyclopedia. This turns back on by itself once a phylum gets its first rebuilt branch.',

  rankNameForDepth: function(depth) { return RPGACE.modules.taxonomyTree.RANK_NAMES[depth] || ('Rank ' + depth); },
  // ── Cheap pre-check: does this phylum's keyword set actually overlap  ──
  // ── the text at all? Uses the FREE Layer 1 scan already computed —    ──
  // ── prevents wasting an Oracle API call generating a mismatch notice. ──
  isPlausiblePhylum: function(text, phylumNumber) {
    // F2: reads from the shared RPGACE.utils.phylaKeywordScore(), same
    // scoring function the badge scan uses - one source of truth, can't drift.
    // F8: threshold now lives on RPGACE.utils.PHYLA_MATCH_THRESHOLD (weighted
    // score, not raw hit count) so this can't drift out of sync with
    // _quickPhylaScan's bar the way the old two-hardcoded-"2"s did.
    if (!RPGACE.utils.phylaKeywordScore) return true; // fail open if scorer unavailable
    return RPGACE.utils.phylaKeywordScore(text, phylumNumber) >= (RPGACE.utils.PHYLA_MATCH_THRESHOLD || 3);
  },

  // ── Extract named node candidates from an Oracle response ──────────
  // ── Looks for bullet-point items with a bold/named lead-in — Oracle    ──
  // ── frequently writes exactly this pattern when suggesting topics      ──
  // ── ("• The Major Scale & Interval Structure (tones/semitones...)").   ──
  // ── If found, these become the ACTUAL proposal topics instead of a     ──
  // ── vague blob slice of the whole response.                           ──
  // FLAGGED, NOT FIXED (G53 split, Sep 2026) - `self` below is a REAL,
  // PRE-EXISTING BUG, not introduced by this split: it was never
  // declared anywhere in this function, in the original source either -
  // it silently resolves to the browser global `window.self` (which
  // === window), so `self.PHYLUM_NAMES` has always been `undefined`
  // (`window.PHYLUM_NAMES` doesn't exist) regardless of which namespace
  // this function lives in. Net effect: `phylumName` is always `null`,
  // so `inRelevantSection` starts `true` and the phylum-name section
  // filter this function's own comment describes never actually runs -
  // every bullet line in the text is scanned, not just the ones under
  // this phylum's own heading. Left completely untouched per rule 4 -
  // fixing it would be real behavior-changing feature work outside a
  // pure refactor's remit (same precedent as contentRepurpose.openPopup's
  // unread 2 args, G53 batch 14). Moving this function to a namespace
  // changes nothing here either way, since it never read `this`/`self`
  // correctly to begin with.
  extractNamedTopics: function(text, phylumNumber) {
    var phylumName = self.PHYLUM_NAMES ? self.PHYLUM_NAMES[phylumNumber] : null;
    var lines = text.split('\n');
    var candidates = [];
    var inRelevantSection = !phylumName; // if we don't know the name, scan everything

    lines.forEach(function(line) {
      var trimmed = line.trim();
      // Detect a section header naming this phylum's English or Latin name
      if (phylumName && trimmed.length < 80) {
        var lower = trimmed.toLowerCase();
        if (lower.includes(phylumName.toLowerCase())) { inRelevantSection = true; return; }
        // A new bolded header that ISN'T this phylum likely ends the section
        if (/^[•\-\*]/.test(trimmed) === false && trimmed.length > 10 && /^[A-Z]/.test(trimmed) && inRelevantSection) {
          // heuristic: heading-like line with no bullet, treat as new section boundary
        }
      }
      // Bullet items: "• Name Here (parenthetical description)"
      var bulletMatch = trimmed.match(/^[•\-\*]\s*(.+)/);
      if (bulletMatch && inRelevantSection) {
        var itemText = bulletMatch[1];
        // Strip trailing parenthetical for the "name" but keep full text as context
        var nameOnly = itemText.split('(')[0].trim();
        if (nameOnly.length > 3 && nameOnly.length < 90) {
          candidates.push({ name: nameOnly, fullText: itemText });
        }
      }
    });

    return candidates;
  },

  // ── Core: propose a lineage for any topic, from any source ────────
  // sourceType: 'manual' | 'oracle' | 'content_intelligence' | 'encyclopedia'
  // July 15, "old feeds new": this function used to be the only decision-
  // maker for every trigger source, and its flat top-down generation has
  // no real structural awareness (_checkForMorph only catches exact name
  // matches) - confirmed live to create duplicate/overlapping branches
  // (a whole new "Harmony & Chord Theory" Order sitting beside the
  // existing "Harmony" Order for near-identical content). For any phylum
  // phylumPath has taken over, delegate the actual placement DECISION to
  // its structure-aware 5-check reasoning instead - this function's job
  // becomes "how did the insight get here," not "where does it go."
  // UNIFIED July 19 (Fable audit): the old flat-prompt body that lived
  // here is deleted, not just bypassed. Real evidence from the tree audit:
  // it produced literal VIDEO TITLES as leaf names ("How to Make a Jazz
  // Sampled Type Beat for Nemzzz, Knucks & Hurricane Wisdom | FL Studio
  // Tutorial", two beat-selling chains with "(2022)"/"(2025)" in the
  // node names), invented parallel one-off branch chains per video with
  // zero fit-challenge (the phylum was pre-assumed), no confidence score,
  // and no stored justification - measurably the worst of the three
  // placement pipelines that existed. ALL placement decisions now go
  // through phylumPath.decidePlacementScored (one engine, one prompt,
  // one call - also cheaper than this path's 800-token flat call plus
  // decidePlacement's old extractor+worker two-call chain). The enabled-
  // phyla gate is gone too: the scored engine is structure-aware for any
  // phylum, including a completely empty one.
  proposeLineage: function(topicText, phylumNumber, sourceType, sourceId) {
    return RPGACE.modules.taxonomyTree._proposeLineageViaPhylumPath(topicText, phylumNumber, sourceType, sourceId);
  },

  // ── Interactive placement via Phylum Path's structure-aware engine ──
  // Same external behavior as the old proposeLineage() from the caller's
  // point of view (fires, shows a confirm UI, writes on accept) - just a
  // smarter decision underneath, and a lighter confirm popup than the
  // old full-path editor since Phylum Path only ever appends below an
  // attach point.
  _proposeLineageViaPhylumPath: function(topicText, phylumNumber, sourceType, sourceId) {
    var pp = RPGACE.modules.phylumPath;
    RPGACE.utils.toast('🧬 Deciding placement (Phylum Path)...', '#4CAF82', 2500);
    return pp.decidePlacement(topicText, phylumNumber).then(function(decision) {
      pp._showPlacementConfirm(phylumNumber, decision.attachNode, decision.newSteps, decision.explainers, topicText,
        function(finalSteps, finalExplainers) {
          // W5: this entry point already receives its own real sourceType/
          // sourceId as parameters ('manual'|'oracle'|'content_intelligence'
          // |'encyclopedia', per this function's own doc comment above), so
          // label the companion entry with the real value rather than a
          // guess; 'oracle' only as the fallback when a caller passed none.
          pp._insertNewSteps(phylumNumber, decision.attachNode, finalSteps, finalExplainers, topicText,
            { source: sourceType || 'oracle', title: sourceId || (topicText || '').slice(0, 80) });
        }
      );
    }).catch(function(err) {
      RPGACE.utils.toast('Error generating placement: ' + err.message, '#CC4A4A', 3500);
    });
  },

  // ── F4/F5: silent sibling of proposeLineage() — same Oracle-generated  ──
  // ── lineage, but queues it into taxonomy_proposals for later batch      ──
  // ── review (F6's Dashboard queue) instead of opening the accept popup   ──
  // ── immediately. Used by unattended triggers (Content Intelligence      ──
  // ── pipeline completion, Encyclopedia sync) that must not block on a    ──
  // ── human decision mid-pipeline.                                       ──
  // UNIFIED July 19 (Fable audit): same deletion + reasoning as
  // proposeLineage above - the old flat body here was the SILENT variant
  // of the same worst-of-three pipeline (video-title leaves, pre-assumed
  // phylum fit, no score, no justification), and being silent made it
  // more dangerous, not less: its garbage only surfaced at review time,
  // titled exactly like a plausible proposal. All decisions now flow
  // through phylumPath.decidePlacementScored via the ViaPhylumPath
  // variant below, for every phylum.
  // Note on error handling, carried over: deliberately no .catch() here -
  // errors propagate to the caller. ciAutoPropose/encSync's batch scans
  // swallow per-item failures on purpose; encTaxonomyLink's per-entry
  // button attaches its own .catch() for real user feedback.
  silentPropose: function(topicText, phylumNumber, sourceType, sourceId) {
    // LL-3: backstop for every silent caller - no Oracle call, no row,
    // while the tree is paused. Rejects (fail loud) so a button caller
    // shows the real reason instead of a fake "queued" toast.
    return RPGACE.modules.taxonomyTree.logic.checkPaused().then(function(paused) {
      if (paused) { var e = new Error('Taxonomy tree is paused until the phyla are rebuilt'); e.treePaused = true; throw e; }
      return RPGACE.modules.taxonomyTree._silentProposeViaPhylumPath(topicText, phylumNumber, sourceType, sourceId);
    });
  },

  // ── Silent placement via Phylum Path's structure-aware engine ──────
  // Same queue-not-block contract as silentPropose() - writes into the
  // SAME taxonomy_proposals table so F6's existing Dashboard review queue
  // is still the one place all of this surfaces for review, just tagged
  // so taxonomyReviewQueue knows to render the lighter Phylum Path confirm
  // view (attach point + appended steps) instead of the old full-path
  // editor when the row's engine is 'phylum_path'.
  _silentProposeViaPhylumPath: function(topicText, phylumNumber, sourceType, sourceId) {
    var self = RPGACE.modules.taxonomyTree;
    var pp = RPGACE.modules.phylumPath;
    // July 24 - Claude fallback build: this is a genuinely SILENT/
    // background caller (ciAutoPropose's batch scan, encSync's auto-
    // propose) with no live user watching for a toast - exactly the
    // shape of call worth tracking through the fallback queue, unlike
    // Phylum Path's own foreground confirm-popup flow where a user just
    // got a visible error and can retry by hand. Passing this context is
    // what lets _resolvePlacementDecision's shared insert logic below be
    // reused automatically once an external Routine answers it.
    var fallbackContext = { type: 'silent_propose', topicText: topicText, phylumNumber: phylumNumber, sourceType: sourceType, sourceId: sourceId };
    return pp.decidePlacement(topicText, phylumNumber, fallbackContext).then(function(decision) {
      return self._insertProposalFromDecision(decision, phylumNumber, sourceType, sourceId, topicText);
    });
    // Same no-.catch() contract as silentPropose() above - errors
    // propagate to the caller's own error handling.
  },

  // Split out of _silentProposeViaPhylumPath above (July 24, Claude-
  // fallback build) so the exact same insert can run either right after
  // a live decidePlacement call (above) or later, once
  // taxonomyTree._resumeSilentProposeFromFallback resolves a decision
  // from an externally-answered fallback row - one shared function per
  // rule 8, not two copies that could drift.
  _insertProposalFromDecision: function(decision, phylumNumber, sourceType, sourceId, topicText) {
    var phylumName = RPGACE.modules.taxonomyTree.PHYLUM_NAMES[phylumNumber] || 'Unknown';
    var base = decision.attachNode ? decision.attachNode.path : phylumName;
    var previewPath = base + (decision.newSteps.length ? '/' + decision.newSteps.join('/') : '');
    return RPGACE.sb.secureWrite('taxonomy_proposals', 'insert', {
      source_type: sourceType,
      source_id: sourceId,
      proposed_path: previewPath.replace(/\//g, ' → '),
      proposed_steps: {
        engine: 'phylum_path',
        attachToId: decision.attachNode ? decision.attachNode.id : null,
        newSteps: decision.newSteps,
        explainers: decision.explainers,
        insightText: topicText,
        // July 19: the scored engine's reasoning now rides along so the
        // review queue can SHOW it - previously the decision used the
        // score internally but threw the evidence away before review.
        justification: decision.justification || '',
        confidenceScore: decision.confidenceScore || 0,
      },
      phylum_number: phylumNumber,
      matched_existing_node_id: decision.attachNode ? decision.attachNode.id : null,
    });
  },

  // Resume the silent side of the Claude-fallback lane (July 24): given
  // an answered oracle_fallback_queue row whose context.type is
  // 'silent_propose', resolve the real decision from the fallback
  // Routine's answer and insert it into taxonomy_proposals exactly like
  // the live path would - unlike Bookworm's cascade, a silent propose is
  // a single atomic call, so "resuming" it just means finishing the one
  // insert that never happened, not continuing a multi-step chain.
  _resumeSilentProposeFromFallback: function(row) {
    var self = RPGACE.modules.taxonomyTree;
    var ctx = row.context || {};
    RPGACE.modules.phylumPath.resumeFallbackPlacement(row.answer, ctx.phylumNumber).then(function(decision) {
      return self._insertProposalFromDecision(decision, ctx.phylumNumber, ctx.sourceType, ctx.sourceId, ctx.topicText);
    }).then(function() {
      return RPGACE.sb.secureWrite('oracle_fallback_queue', 'update', { resumed_at: new Date().toISOString() }, 'id=eq.' + row.id);
    }).then(function() {
      RPGACE.utils.toast('🌉 A queued taxonomy proposal came back from the fallback lane and is now in the review queue', 'rgba(42,191,176,0.85)', 4500);
    }).catch(function(e) {
      console.warn('[taxonomyTree] fallback resume failed:', e.message);
    });
  },

  // ── Write accepted lineage into taxonomy_tree, generate content ──
  // Sep 25 2026 — real dedup pass (Alex-confirmed): this used to be a full,
  // independently-maintained second copy of phylumPath.logic._insertNewSteps'
  // chained-insert-with-real-id-threading logic, minus everything that
  // function gained since (the sanitizePlacement guard, a taxonomy_decision_log
  // audit row, the Encyclopedia companion entry, the bibliography back-link,
  // _findFusionLinks) — a real, checked gap: this path silently skipped all
  // five. It also called the older, thinner _generateNodeContent instead of
  // _generateInsightContent's 3-layer-with-outline method (Alex's own Aug 11
  // "I want more of this thinking" ask). Confirmed unreachable for any row
  // written by live code today — every real taxonomy_proposals write sets
  // engine:'phylum_path' or engine:'concept_fusion' (grepped, zero other
  // literal), and _acceptLineage/_showProposalPopup are only ever called for
  // neither — so this is now a thin pass-through kept as a safety net for a
  // pre-unification row that might still be sitting pending, same one real
  // write pipeline everything else already routes through (rule 8).
  //
  // Also folded in here (deleted as dead code, not moved): _checkForMorph
  // and _updateExistingNode. Both were unreachable — the only place that
  // builds a `proposal` for this popup (taxonomyReviewQueue._toProposal)
  // hardcoded morphMatch:null/suggestUpdate:false, and nothing anywhere
  // ever called _checkForMorph to set a real value. decidePlacementScored's
  // own Hard Rule 2 + sanitizePlacement's dedup-extend branch already own
  // duplicate-detection for the real, live path.
  _acceptLineage: function(proposal) {
    var self = RPGACE.modules.taxonomyTree;
    var pp = RPGACE.modules.phylumPath;
    RPGACE.utils.toast('🌳 Writing lineage + generating content...', '#4CAF82', 3000);

    // Skip _insertNewSteps' own Encyclopedia-companion-entry write for the
    // encyclopedia-sourced case — this path's real job there is updating
    // the EXISTING entry's back-reference (below), not creating a new one.
    var sourceMeta = (proposal.sourceType === 'encyclopedia')
      ? null
      : { source: proposal.sourceType, title: proposal.sourceId || (proposal.path || []).join(' / ') };
    var insightText = (proposal.explainers && proposal.explainers.length)
      ? proposal.explainers[proposal.explainers.length - 1]
      : (proposal.path || []).join(' / ');

    pp.logic._insertNewSteps(proposal.phylumNumber, null, proposal.path, proposal.explainers, insightText, sourceMeta)
      .then(function(finalRow) {
        RPGACE.utils.toast('✅ Taxonomy lineage saved: ' + proposal.phylumName + '/' + (proposal.path || []).join('/'), '#4CAF82', 4000);
        // F7: preserve the real back-reference this path always had — mark
        // the originating Encyclopedia entry as "already linked" so its
        // card stops re-offering the propose button indefinitely.
        if (proposal.sourceType === 'encyclopedia' && proposal.sourceId && finalRow && finalRow.id) {
          RPGACE.sb.secureWrite('encyclopedia', 'update', { taxonomy_node_id: finalRow.id }, 'id=eq.' + proposal.sourceId).catch(function() {});
        }
        // F6: if this lineage came from the review queue, close the loop on
        // the taxonomy_proposals row it originated from.
        if (proposal.queuedProposalId) {
          RPGACE.sb.secureWrite('taxonomy_proposals', 'update',
            { status: 'accepted', reviewed_at: new Date().toISOString() },
            'id=eq.' + proposal.queuedProposalId).catch(function() {});
        }
      }).catch(function(e) {
        RPGACE.utils.toast('Error saving lineage: ' + e.message, '#CC4A4A', 3500);
      });
  },

  },

  // Thin top-level pass-throughs - preserve the exact existing public
  // API. See ui/logic above for the real implementations.
  _injectManualButton: function() { return this.ui._injectManualButton(); },
  _openManualEntry: function() { return this.ui._openManualEntry(); },
  _showNamedTopicPicker: function(candidates, phylumNumber) { return this.ui._showNamedTopicPicker(candidates, phylumNumber); },
  _showProposalPopup: function(proposal) { return this.ui._showProposalPopup(proposal); },
  rankNameForDepth: function(depth) { return this.logic.rankNameForDepth(depth); },
  isPlausiblePhylum: function(text, phylumNumber) { return this.logic.isPlausiblePhylum(text, phylumNumber); },
  extractNamedTopics: function(text, phylumNumber) { return this.logic.extractNamedTopics(text, phylumNumber); },
  proposeLineage: function(topicText, phylumNumber, sourceType, sourceId) { return this.logic.proposeLineage(topicText, phylumNumber, sourceType, sourceId); },
  _proposeLineageViaPhylumPath: function(topicText, phylumNumber, sourceType, sourceId) { return this.logic._proposeLineageViaPhylumPath(topicText, phylumNumber, sourceType, sourceId); },
  silentPropose: function(topicText, phylumNumber, sourceType, sourceId) { return this.logic.silentPropose(topicText, phylumNumber, sourceType, sourceId); },
  isPaused: function() { return this.logic.isPaused(); },
  checkPaused: function(force) { return this.logic.checkPaused(force); },
  _silentProposeViaPhylumPath: function(topicText, phylumNumber, sourceType, sourceId) { return this.logic._silentProposeViaPhylumPath(topicText, phylumNumber, sourceType, sourceId); },
  _insertProposalFromDecision: function(decision, phylumNumber, sourceType, sourceId, topicText) { return this.logic._insertProposalFromDecision(decision, phylumNumber, sourceType, sourceId, topicText); },
  _resumeSilentProposeFromFallback: function(row) { return this.logic._resumeSilentProposeFromFallback(row); },
  _acceptLineage: function(proposal) { return this.logic._acceptLineage(proposal); },

});
/* ===END:taxonomyTree=== */
