/* ===MODULE:taxonomyTree=== */
RPGACE.register('taxonomyTree', {

  PHYLUM_NAMES: {
    1:'Compositio',2:'Percussio',3:'Sonus Designatio',4:'Mixtura',5:'Magistra',
    6:'Instrumentarium',7:'Sensus Auris',8:'Anatomia',9:'Historia',10:'Psychologia',
    11:'Lingua Musicae',12:'Fons Educationis',13:'Contentum',14:'Visio Cinematica',
    15:'Collaboratio',16:'Venditionis Beatorum',17:'Negotium',18:'Distributio',
    19:'Referentia Mercati',20:'Technologia',21:'Miscellaneous Ordinanda'
  },

  PHYLUM_ENGLISH: {
    1:'Melody, Harmony, Chords',2:'Drums, 808s, Rhythm',3:'Sound Design, Synths, Sampling',
    4:'Mixing, EQ, Compression',5:'Mastering, Loudness',6:'FL Studio, VSTs, DAW Workflow',
    7:'Critical Listening, Reference',8:'Music Theory Fundamentals',9:'Producer History, Influences',
    10:'Creative Psychology, Flow',11:'Colour, Mood, Visual Language',12:'Tutorials, Learning Resources',
    13:'YouTube, Instagram, Content',14:'Visual Treatment, Filmmaking',15:'Collaboration, Outreach',
    16:'Beat Selling, Licensing',17:'Business, Operations',18:'Distribution, Release',
    19:'Market Reference, Trends',20:'Technology, Tools',21:'Miscellaneous'
  },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectManualButton(); }, 1300);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectManualButton(); }, 500);
      }
    });
  },

  // ── Manual trigger button ─────────────────────────────────────
  _injectManualButton: function() {
    if (document.getElementById('taxtree-manual-btn')) return;
    var self = this;
    var page = document.getElementById('page-research') || document.getElementById('page-learning');
    if (!page) return;

    var btn = document.createElement('button');
    btn.id = 'taxtree-manual-btn';
    btn.textContent = '🌳 Add to Taxonomy Tree';
    btn.style.cssText = 'padding:9px 18px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:16px;';
    btn.onclick = function() { self._openManualEntry(); };

    var anchor = document.getElementById('cp-idea-bank') || document.getElementById('beat-log-panel');
    if (anchor) anchor.parentElement.insertBefore(btn, anchor);
    else page.insertBefore(btn, page.firstChild);
  },

  _openManualEntry: function() {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.25);border-radius:12px;padding:24px 28px;width:min(520px,95vw);';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Taxonomy Tree · Manual Entry';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = 'What topic do you want to add?';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'e.g. 1-1-3-4 chord progression in natural minor';
    input.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:13px;padding:10px 12px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:14px;';

    var phylumSelect = document.createElement('select');
    phylumSelect.style.cssText = 'width:100%;background:#1a1a24;border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
    var blank = document.createElement('option'); blank.value=''; blank.textContent='— which phylum does this belong to? —';
    blank.style.color = '#E2E2EC'; blank.style.background = '#1a1a24';
    phylumSelect.appendChild(blank);
    Object.keys(self.PHYLUM_ENGLISH).forEach(function(num) {
      var opt = document.createElement('option');
      opt.value = num;
      opt.textContent = 'Phylum ' + num + ' — ' + self.PHYLUM_NAMES[num] + ' (' + self.PHYLUM_ENGLISH[num] + ')';
      opt.style.color = '#E2E2EC'; opt.style.background = '#1a1a24';
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
            previewBox.innerHTML = '<div style="color:rgba(226,226,236,0.35);">Nothing in this phylum yet — you would be first to add here. Examples of what belongs: <strong style="color:#9B59B6;">' + self.PHYLUM_ENGLISH[num] + '</strong></div>';
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
    genBtn.style.cssText = 'padding:10px 20px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:8px;color:#9B59B6;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    genBtn.onclick = function() {
      var topic = input.value.trim();
      var phylum = parseInt(phylumSelect.value);
      if (!topic) { RPGACE.utils.toast('Add a topic first', '#E25454', 2000); return; }
      if (!phylum) { RPGACE.utils.toast('Select a phylum', '#E25454', 2000); return; }
      overlay.remove();
      self.proposeLineage(topic, phylum, 'manual', null);
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:8px;';
    cancelBtn.onclick = function() { overlay.remove(); };

    box.appendChild(eyebrow); box.appendChild(title);
    box.appendChild(input); box.appendChild(phylumSelect);
    box.appendChild(previewBox);
    box.appendChild(genBtn); box.appendChild(cancelBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();
  },

  // ── Cheap pre-check: does this phylum's keyword set actually overlap  ──
  // ── the text at all? Uses the FREE Layer 1 scan already computed —    ──
  // ── prevents wasting an Oracle API call generating a mismatch notice. ──
  isPlausiblePhylum: function(text, phylumNumber) {
    if (!RPGACE.utils._PHYLA_KEYWORDS) return true; // fail open if scan unavailable
    var entry = RPGACE.utils._PHYLA_KEYWORDS.find(function(p) { return p.num === phylumNumber; });
    if (!entry) return true;
    var t = (text || '').toLowerCase();
    var hits = entry.keywords.filter(function(k) { return t.includes(k); }).length;
    return hits >= 2; // raised from 1 - single incidental word match is too permissive
  },

  // ── Extract named node candidates from an Oracle response ──────────
  // ── Looks for bullet-point items with a bold/named lead-in — Oracle    ──
  // ── frequently writes exactly this pattern when suggesting topics      ──
  // ── ("• The Major Scale & Interval Structure (tones/semitones...)").   ──
  // ── If found, these become the ACTUAL proposal topics instead of a     ──
  // ── vague blob slice of the whole response.                           ──
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

  // ── Picker shown when Oracle's response contains multiple named nodes ──
  // ── for one phylum — lets user pick which specific ones to propose,   ──
  // ── instead of collapsing them all into one vague blob topic.          ──
  _showNamedTopicPicker: function(candidates, phylumNumber) {
    var self = this;
    var phylumName = self.PHYLUM_NAMES[phylumNumber] || '';
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(520px,95vw);max-height:80vh;overflow-y:auto;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Oracle already named these — pick which to propose';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:14px;';
    title.textContent = phylumName + ' — ' + candidates.length + ' named nodes found';
    box.appendChild(eyebrow); box.appendChild(title);

    candidates.forEach(function(c, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'named-topic-' + i; cb.checked = true;
      cb.style.cssText = 'margin-top:3px;flex-shrink:0;';
      var label = document.createElement('div');
      label.innerHTML = '<div style="font-size:12px;font-weight:600;color:#E2E2EC;">' + c.name + '</div>' +
        '<div style="font-size:10px;color:rgba(226,226,236,0.35);margin-top:2px;">' + c.fullText.slice(0, 100) + '</div>';
      row.appendChild(cb); row.appendChild(label);
      box.appendChild(row);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var proceedBtn = document.createElement('button');
    proceedBtn.textContent = '🌳 Propose selected';
    proceedBtn.style.cssText = 'flex:1;padding:10px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:8px;color:#9B59B6;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
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
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Core: propose a lineage for any topic, from any source ────────
  // sourceType: 'manual' | 'oracle' | 'content_intelligence' | 'encyclopedia'
  proposeLineage: function(topicText, phylumNumber, sourceType, sourceId) {
    var self = this;
    var phylumName = self.PHYLUM_NAMES[phylumNumber] || 'Unknown';

    RPGACE.utils.toast('🌳 Generating taxonomy lineage...', '#9B59B6', 2500);

    var phylumDesc = self.PHYLUM_ENGLISH[phylumNumber] || '';
    var prompt = 'You are building a hierarchical taxonomy tree for a music production knowledge base.\n\n' +
      'ROOT PHYLUM: ' + phylumName + ' (Phylum ' + phylumNumber + ') — this phylum covers: ' + phylumDesc + '\n' +
      'TOPIC TO PLACE: "' + topicText + '"\n\n' +
      'This phylum has already been confirmed as a plausible fit for this topic. ' +
      'Generate a drill-down path from the Phylum down to this specific topic as the final leaf. ' +
      'Use as many or as few steps as genuinely needed — could be 2 steps, could be 10. ' +
      'Each step should be a real conceptual grouping, not padding.\n\n' +
      'Only the Phylum name uses Latin. Every other step uses plain, clear English.\n\n' +
      'Return ONLY a JSON object, no other text, in this exact format:\n' +
      '{"path": ["Step1Name","Step2Name","Step3Name","FinalTopicName"], ' +
      '"explainers": ["what Step1 covers and how its children relate","...", "..."], ' +
      '"is_leaf_specific": true}\n\n' +
      'The path array should NOT include the phylum name itself (that is depth 0, already known). ' +
      'Start from depth 1. The last item in path should be the specific topic itself.';

    fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You return only valid JSON, no markdown formatting, no explanation text.',
        max_tokens: 800
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      var cleaned = raw.replace(/```json|```/g, '').trim();
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in response');
      var parsed = JSON.parse(match[0]);

      self._checkForMorph(phylumNumber, parsed.path, function(morphMatch, exactLeafMatch) {
        self._showProposalPopup({
          phylumNumber: phylumNumber,
          phylumName: phylumName,
          path: parsed.path,
          explainers: parsed.explainers || [],
          sourceType: sourceType,
          sourceId: sourceId,
          morphMatch: exactLeafMatch || morphMatch,
          suggestUpdate: !!exactLeafMatch
        });
      });
    })
    .catch(function(err) {
      RPGACE.utils.toast('Error generating lineage: ' + err.message, '#E25454', 3500);
    });
  },

  // ── Check if any step in the proposed path already exists ────────
  // ── Now also detects if the NEW leaf's explainer is meaningfully      ──
  // ── different/better-written than an existing matching leaf, and      ──
  // ── offers to UPDATE the existing node's content instead of just      ──
  // ── warning about duplication.                                        ──
  _checkForMorph: function(phylumNumber, path, callback) {
    RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=depth.asc')
      .then(function(existing) {
        existing = existing || [];
        var matched = null;
        var exactLeafMatch = null;
        var lastStepName = path[path.length - 1];

        path.forEach(function(stepName) {
          var found = existing.find(function(n) {
            return n.name.toLowerCase().trim() === stepName.toLowerCase().trim();
          });
          if (found && !matched) matched = found;
        });

        // Check specifically if the LEAF matches an existing leaf — this is the
        // "duplicate insight" case, distinct from "shares a parent grouping" case
        exactLeafMatch = existing.find(function(n) {
          return n.node_type === 'leaf' && n.name.toLowerCase().trim() === lastStepName.toLowerCase().trim();
        });

        callback(matched, exactLeafMatch);
      }).catch(function() { callback(null, null); });
  },

  // ── Update an existing node's content with a better-written version ──
  _updateExistingNode: function(existingNode, proposal) {
    var self = this;
    RPGACE.utils.toast('🔄 Updating existing node with improved content...', '#3DAA6E', 2500);
    var newExplainer = proposal.explainers[proposal.explainers.length - 1] || existingNode.explainer;

    fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_tree?id=eq.' + existingNode.id, {
      method: 'PATCH',
      headers: {
        'apikey': RPGACE.CONFIG.supabase.key,
        'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ explainer: newExplainer, updated_at: new Date().toISOString() })
    }).then(function() {
      RPGACE.utils.toast('✅ Node updated: ' + existingNode.name, '#3DAA6E', 3000);
      self._generateNodeContent(existingNode);
    }).catch(function(e) {
      RPGACE.utils.toast('Error updating node: ' + e.message, '#E25454', 3000);
    });
  },

  // ── The accept/edit/reject/morph popup ────────────────────────────
  _showProposalPopup: function(proposal) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(155,89,182,0.3);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:85vh;overflow-y:auto;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Proposed Taxonomy Lineage · ' + proposal.sourceType;
    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = proposal.phylumName + ' (Phylum ' + proposal.phylumNumber + ')';
    box.appendChild(eyebrow); box.appendChild(title);

    if (proposal.morphMatch) {
      var morphNote = document.createElement('div');
      if (proposal.suggestUpdate) {
        morphNote.style.cssText = 'background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#3DAA6E;';
        morphNote.innerHTML = '🔄 This exact leaf already exists: "<strong>' + proposal.morphMatch.name + '</strong>". This proposal looks like a refinement — accepting will <strong>update the existing node\'s content</strong> instead of creating a duplicate.';
      } else {
        morphNote.style.cssText = 'background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#E25454;';
        morphNote.innerHTML = '⚠️ A node named "<strong>' + proposal.morphMatch.name + '</strong>" already exists in this phylum. Consider attaching under it instead of creating a duplicate branch.';
      }
      box.appendChild(morphNote);
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
        depthLabel.style.cssText = 'font-size:9px;color:rgba(155,89,182,0.5);flex-shrink:0;min-width:16px;';
        depthLabel.textContent = (i + 1) + '.';
        var stepInput = document.createElement('input');
        stepInput.type = 'text';
        stepInput.value = step;
        stepInput.style.cssText = 'flex:1;background:none;border:none;color:#E2E2EC;font-size:12px;font-family:Rajdhani,sans-serif;outline:none;';
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
    acceptBtn.textContent = proposal.suggestUpdate ? '✓ Update Existing Node' : '✓ Accept & Generate Content';
    acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    acceptBtn.onclick = function() {
      updatePreview();
      overlay.remove();
      if (proposal.suggestUpdate && proposal.morphMatch) {
        self._updateExistingNode(proposal.morphMatch, proposal);
      } else {
        self._acceptLineage(proposal);
      }
    };

    var rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#E25454;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    rejectBtn.onclick = function() { overlay.remove(); };

    btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Write accepted lineage into taxonomy_tree, generate content ──
  _acceptLineage: function(proposal) {
    var self = this;
    RPGACE.utils.toast('🌳 Writing lineage + generating content...', '#3DAA6E', 3000);

    var parentId = null;
    var pathSoFar = proposal.phylumName;
    var chain = Promise.resolve();

    proposal.path.forEach(function(stepName, i) {
      chain = chain.then(function() {
        pathSoFar += '/' + stepName;
        var isLeaf = (i === proposal.path.length - 1);
        var currentPath = pathSoFar;
        var currentParent = parentId;

        return RPGACE.sb.insert('taxonomy_tree', {
          parent_id: currentParent,
          depth: i + 1,
          name: stepName,
          latin_name: null,
          phylum_number: proposal.phylumNumber,
          path: currentPath,
          node_type: isLeaf ? 'leaf' : 'branch',
          explainer: proposal.explainers[i] || '',
          sources: [{ type: proposal.sourceType, id: proposal.sourceId }],
        }).then(function(result) {
          var row = Array.isArray(result) ? result[0] : result;
          if (row && row.id) parentId = row.id;
          if (isLeaf && row) {
            self._generateNodeContent(row);
          }
        });
      });
    });

    chain.then(function() {
      RPGACE.utils.toast('✅ Taxonomy lineage saved: ' + pathSoFar, '#3DAA6E', 4000);
    }).catch(function(e) {
      RPGACE.utils.toast('Error saving lineage: ' + e.message, '#E25454', 3500);
    });
  },

  // ── Generation template — merged tutor + expert prompt ────────────
  _generateNodeContent: function(node) {
    var prompt = 'You are a neuro-optimized tutor AND a world-class expert in "' + node.name + '".\n\n' +
      'Context: this is a node in a music production taxonomy tree, path: ' + node.path + '. ' +
      'This is for FL Studio / UK hip hop production, aspiring producers 18-35.\n\n' +
      'Train me as if I am your apprentice, from beginner to mastery, on "' + node.name + '" specifically. Include:\n\n' +
      '1. WHAT THIS IS — clear explainer of ' + node.name + ' as a concept\n' +
      '2. THE ACTUAL TECHNICAL CONTENT — since this is a specific leaf topic, give me the real, specific information (exact notes/settings/techniques/chord identities as relevant), not general theory\n' +
      '3. A weekly learning blueprint using spaced repetition, interleaving, Feynman technique, and active recall\n' +
      '4. Stages, tasks, uncommon resources, and shortcuts specific to this exact topic\n' +
      '5. A real FL Studio practice assignment to internalize it today\n\n' +
      'Be specific and technical. I want to be functionally in the top 1% on this specific topic within 90 days.';

    fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: '',
        max_tokens: 1500
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var text = (data.content || []).map(function(c) { return c.text || ''; }).join('');
      return fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/taxonomy_tree?id=eq.' + node.id, {
        method: 'PATCH',
        headers: {
          'apikey': RPGACE.CONFIG.supabase.key,
          'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ deep_content: { generated: text, generated_at: new Date().toISOString() } })
      });
    })
    .then(function() {
      console.log('[taxonomyTree] Content generated for node:', node.name);
    })
    .catch(function(e) {
      console.warn('[taxonomyTree] Content generation failed:', e.message);
    });
  },

});
/* ===END:taxonomyTree=== */
