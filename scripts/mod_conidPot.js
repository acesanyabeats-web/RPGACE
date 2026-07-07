/* ===MODULE:conidPot=== */
RPGACE.register('conidPot', {

  // Day-based morning brief rotation
  BRIEF_ROTATION: {
    1: { type: 'gap',     label: 'Monday — Gap Score match' },
    2: { type: 'gap',     label: 'Tuesday — Gap Score match' },
    3: { type: 'oldest',  label: 'Wednesday — Oldest relevant 5' },
    4: { type: 'oldest',  label: 'Thursday — Oldest relevant 5' },
    5: { type: 'starred', label: 'Friday — Random from top starred' },
    6: { type: 'starred', label: 'Saturday — Random from top starred' },
    0: { type: 'gap',     label: 'Sunday — Gap Score match' },
  },

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() {
        self._injectSaveBtn();
        self._patchTextSelect();
        self._updateBriefRotationLabel();
      }, 1800);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._injectSaveBtn(); }, 500);
      }
      if (name === RPGACE.CONFIG.pages.research) {
        setTimeout(function() { self._injectIdeaBank(); }, 500);
      }
    });
  },

  // ── Save an idea to ConIDPot ──────────────────────────────────
  saveIdea: function(text, source, suggestedTitle) {
    var self = this;
    // Generate suggested title from text
    var title = suggestedTitle || self._extractTitle(text);

    // Show save popup
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px 28px;width:min(500px,95vw);';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:6px;';
    eyebrow.textContent = 'Save to Idea Bank · ConIDPot';

    var titleLbl = document.createElement('div');
    titleLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
    titleLbl.textContent = 'Idea title (edit if needed):';

    var titleInp = document.createElement('input');
    titleInp.type = 'text';
    titleInp.value = title;
    titleInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:#E2E2EC;font-size:13px;font-weight:600;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:12px;';

    var previewLbl = document.createElement('div');
    previewLbl.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:5px;';
    previewLbl.textContent = 'Idea content preview:';

    var preview = document.createElement('div');
    preview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:8px 10px;max-height:100px;overflow-y:auto;margin-bottom:14px;line-height:1.5;';
    preview.textContent = text.slice(0, 400) + (text.length > 400 ? '...' : '');

    var starRow = document.createElement('div');
    starRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;';
    var starCb = document.createElement('input');
    starCb.type = 'checkbox'; starCb.id = 'cp-star';
    var starLbl = document.createElement('label');
    starLbl.htmlFor = 'cp-star';
    starLbl.textContent = '⭐ Star this idea (adds to Friday random rotation)';
    starLbl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);cursor:pointer;';
    starRow.appendChild(starCb); starRow.appendChild(starLbl);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💡 Save to Idea Bank';
    saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };

    saveBtn.onclick = function() {
      var finalTitle = titleInp.value.trim() || title;
      var starred = starCb.checked;

      // Check for duplicates first
      RPGACE.sb.select('conid_pot', 'order=created_at.desc&limit=50')
        .then(function(existing) {
          var similar = (existing || []).find(function(e) {
            return self._similarity(e.title, finalTitle) > 0.6;
          });

          if (similar) {
            // Show merge prompt
            overlay.remove();
            self._showMergePrompt(similar, finalTitle, text, source, starred);
          } else {
            // Save fresh
            self._saveToSupabase(finalTitle, text, source, starred);
            overlay.remove();
          }
        }).catch(function() {
          self._saveToSupabase(finalTitle, text, source, starred);
          overlay.remove();
        });
    };

    btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(eyebrow); box.appendChild(titleLbl);
    box.appendChild(titleInp); box.appendChild(previewLbl);
    box.appendChild(preview); box.appendChild(starRow);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    titleInp.focus();
    titleInp.select();
  },

  _saveToSupabase: function(title, text, source, starred) {
    var self = this;
    // Detect phyla from idea text
    var phylaNums = self._quickDetectPhyla(text);

    RPGACE.sb.insert('conid_pot', {
      title:          title,
      idea_text:      text.slice(0, 3000),
      source:         source || 'manual',
      status:         'potential',
      phyla_detected: phylaNums,
      gap_score_avg:  0,
      starred:        starred || false,
    }).then(function() {
      RPGACE.utils.toast('💡 Saved to Idea Bank: ' + title.slice(0, 40), '#C9A84C', 3000);
      // Refresh idea bank if visible
      self._refreshIdeaBank();
    }).catch(function(e) {
      RPGACE.utils.toast('Error saving: ' + e.message, '#E25454', 3000);
    });
  },

  _showMergePrompt: function(existing, newTitle, newText, source, starred) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.25);border-radius:12px;padding:24px 28px;width:min(480px,95vw);';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#E2E2EC;margin-bottom:8px;';
    title.textContent = '⚠️ Similar idea found';

    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);margin-bottom:16px;line-height:1.6;';
    msg.innerHTML = 'Existing: <strong style="color:#C9A84C;">' + existing.title + '</strong><br>New: <strong style="color:#4A90E2;">' + newTitle + '</strong><br><br>Merge into one combined idea (best of both), or keep separate?';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var mergeBtn = document.createElement('button');
    mergeBtn.textContent = '🔀 Merge (recommended)';
    mergeBtn.style.cssText = 'flex:1;padding:9px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    mergeBtn.onclick = function() {
      // Merge: combine text, keep better title, add to merged_from
      var combinedText = existing.idea_text + '\n\n--- MERGED ---\n\n' + newText.slice(0, 1500);
      fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/conid_pot?id=eq.' + existing.id, {
        method: 'PATCH',
        headers: { 'apikey': RPGACE.CONFIG.supabase.key, 'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ idea_text: combinedText, merged_from: [newTitle] })
      }).then(function() {
        RPGACE.utils.toast('🔀 Merged into: ' + existing.title, '#3DAA6E', 3000);
        self._refreshIdeaBank();
      });
      overlay.remove();
    };

    var keepBtn = document.createElement('button');
    keepBtn.textContent = 'Keep separate';
    keepBtn.style.cssText = 'padding:9px 14px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    keepBtn.onclick = function() {
      self._saveToSupabase(newTitle, newText, source, starred);
      overlay.remove();
    };

    btnRow.appendChild(mergeBtn); btnRow.appendChild(keepBtn);
    box.appendChild(title); box.appendChild(msg); box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Inject Save Ideas button after Oracle panel responses ─────
  _injectSaveBtn: function() {
    var self = this;
    var chatMsgs = document.getElementById('chat-msgs');
    if (!chatMsgs) return;

    var aiMsgs = Array.from(chatMsgs.querySelectorAll('.msg.ai'));
    aiMsgs.forEach(function(msg) {
      if (msg.dataset.cpSave) return;
      msg.dataset.cpSave = '1';

      var txt = msg.textContent.trim();
      if (txt.length < 100) return;

      // Only show Save Ideas for Oracle panel responses (content/idea patterns)
      var isIdeasResponse = txt.includes('INSTA-ORACLE') || txt.includes('YouTube Oracle') ||
        txt.includes('PROD. ORACLE') || txt.includes('VISUAL ORACLE') ||
        txt.includes('content idea') || txt.includes('Content Idea') ||
        (txt.match(/\d+\./g) || []).length >= 3; // 3+ numbered items

      if (!isIdeasResponse) return;

      var saveRow = document.createElement('div');
      saveRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);flex-wrap:wrap;';

      var saveAllBtn = document.createElement('button');
      saveAllBtn.textContent = '💡 Save ideas to bank';
      saveAllBtn.style.cssText = 'padding:4px 12px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:5px;color:#C9A84C;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      saveAllBtn.onclick = function() {
        // Parse numbered ideas from this message
        var ideas = self._parseIdeas(txt);
        if (ideas.length === 0) {
          // Save whole message as one idea
          self.saveIdea(txt, 'oracle_panel', self._extractTitle(txt));
        } else {
          // Show multi-select for ideas
          self._showIdeaSelectPopup(ideas);
        }
      };

      saveRow.appendChild(saveAllBtn);
      msg.appendChild(saveRow);
    });
  },

  _showIdeaSelectPopup: function(ideas) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:85vh;overflow-y:auto;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:6px;';
    hdr.textContent = '💡 Select ideas to save (' + ideas.length + ' found)';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);margin-bottom:16px;';
    sub.textContent = 'Each selected idea becomes a ConIDPot entry in your Idea Bank.';
    box.appendChild(hdr); box.appendChild(sub);

    var selectAll = document.createElement('button');
    selectAll.textContent = 'Select all';
    selectAll.style.cssText = 'padding:4px 10px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:rgba(226,226,236,0.4);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:10px;';
    selectAll.onclick = function() {
      box.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = true; });
    };
    box.appendChild(selectAll);

    ideas.forEach(function(idea, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'cp-idea-' + i; cb.checked = true;
      cb.style.cssText = 'margin-top:3px;flex-shrink:0;';
      var info = document.createElement('div');
      info.style.cssText = 'flex:1;';
      var titleEl = document.createElement('input');
      titleEl.type = 'text';
      titleEl.value = idea.title;
      titleEl.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#E2E2EC;font-size:12px;font-weight:600;padding:4px 8px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:3px;';
      var preview = document.createElement('div');
      preview.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);';
      preview.textContent = idea.text.slice(0, 100) + '...';
      info.appendChild(titleEl); info.appendChild(preview);
      row.appendChild(cb); row.appendChild(info);
      box.appendChild(row);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var saveSelBtn = document.createElement('button');
    saveSelBtn.textContent = '💡 Save selected to Idea Bank';
    saveSelBtn.style.cssText = 'flex:1;padding:10px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    saveSelBtn.onclick = function() {
      var saved = 0;
      ideas.forEach(function(idea, i) {
        var cb = document.getElementById('cp-idea-' + i);
        var titleInp = box.querySelectorAll('input[type="text"]')[i];
        if (cb && cb.checked) {
          var t = titleInp ? titleInp.value.trim() : idea.title;
          self._saveToSupabase(t, idea.text, 'oracle_panel', false);
          saved++;
        }
      });
      overlay.remove();
      RPGACE.utils.toast('💡 Saved ' + saved + ' ideas to Idea Bank', '#C9A84C', 3000);
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(saveSelBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Patch text-select panel to add Save as Idea button ───────
  _patchTextSelect: function() {
    var self = this;
    // Watch for the text-select popup (🔍 Identify button)
    var obs = new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          // Find the identify popup
          var popup = node.id === 'text-select-popup' ? node :
                      node.querySelector && node.querySelector('#text-select-popup');
          if (!popup) return;
          if (popup.dataset.cpPatched) return;
          popup.dataset.cpPatched = '1';
          var saveIdeaBtn = document.createElement('button');
          saveIdeaBtn.textContent = '💡 Save as Idea';
          saveIdeaBtn.style.cssText = 'padding:4px 10px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:5px;color:#C9A84C;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:6px;';
          saveIdeaBtn.onclick = function() {
            var selectedText = window.getSelection ? window.getSelection().toString() : '';
            var text = selectedText || popup.dataset.selectedText || '';
            if (text) self.saveIdea(text, 'text_select', self._extractTitle(text));
          };
          // Append to popup button row
          var btnRow = popup.querySelector('div');
          if (btnRow) btnRow.appendChild(saveIdeaBtn);
          else popup.appendChild(saveIdeaBtn);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },

  // ── Idea Bank panel in Research tab ──────────────────────────
  _injectIdeaBank: function() {
    if (document.getElementById('cp-idea-bank')) return;
    var self = this;
    var page = document.getElementById('page-research') ||
               document.getElementById('page-learning') ||
               document.querySelector('[id*="research"]') || document.querySelector('[id*="learning"]');
    if (!page) return;

    var panel = document.createElement('div');
    panel.id = 'cp-idea-bank';
    panel.style.cssText = 'background:rgba(201,168,76,0.03);border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px;';
    eyebrow.textContent = 'Idea Bank · ConIDPot';
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:4px;';
    titleEl.textContent = 'Content Idea Bank';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:14px;';
    sub.textContent = 'All saved ideas. Click any idea to send to Oracle, Repurpose, Agenda, or Video Finder.';

    // Filter tabs
    var filterRow = document.createElement('div');
    filterRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;';
    var filters = ['All', 'Potential', 'Starred ⭐', 'Gap Match 🔴'];
    var activeFilter = 'All';
    filters.forEach(function(f) {
      var btn = document.createElement('button');
      btn.textContent = f;
      btn.dataset.filter = f;
      btn.style.cssText = 'padding:4px 10px;background:' + (f === activeFilter ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)') + ';border:1px solid ' + (f === activeFilter ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)') + ';border-radius:12px;color:' + (f === activeFilter ? '#C9A84C' : 'rgba(226,226,236,0.4)') + ';font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      btn.onclick = function() {
        activeFilter = f;
        filterRow.querySelectorAll('button').forEach(function(b) {
          var isActive = b.dataset.filter === f;
          b.style.background = isActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)';
          b.style.borderColor = isActive ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)';
          b.style.color = isActive ? '#C9A84C' : 'rgba(226,226,236,0.4)';
        });
        self._refreshIdeaBank(f);
      };
      filterRow.appendChild(btn);
    });

    // Add idea button
    var addBtn = document.createElement('button');
    addBtn.textContent = '+ Add idea manually';
    addBtn.style.cssText = 'padding:4px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:rgba(226,226,236,0.35);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    addBtn.onclick = function() { self.saveIdea('', 'manual', ''); };
    filterRow.appendChild(addBtn);

    var list = document.createElement('div');
    list.id = 'cp-idea-bank-list';
    list.style.cssText = 'max-height:320px;overflow-y:auto;';

    panel.appendChild(eyebrow); panel.appendChild(titleEl); panel.appendChild(sub);
    panel.appendChild(filterRow); panel.appendChild(list);

    // Insert before Video Workshop or Beat Log
    var beatLog = document.getElementById('beat-log-panel');
    var refCorpus = document.getElementById('ref-corpus-panel');
    var anchor = refCorpus || beatLog;
    if (anchor) {
      anchor.parentElement.insertBefore(panel, anchor);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    self._refreshIdeaBank('All');
  },

  _refreshIdeaBank: function(filter) {
    var self = this;
    var list = document.getElementById('cp-idea-bank-list');
    if (!list) return;
    list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">Loading...</div>';

    RPGACE.sb.select('conid_pot', 'order=created_at.desc&limit=50')
      .then(function(rows) {
        rows = rows || [];

        // Apply filter
        if (filter === 'Starred ⭐') rows = rows.filter(function(r) { return r.starred; });
        if (filter === 'Potential') rows = rows.filter(function(r) { return r.status === 'potential'; });
        if (filter === 'Gap Match 🔴') rows = rows.filter(function(r) { return r.gap_score_avg >= 6; });

        list.innerHTML = '';
        if (rows.length === 0) {
          list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">No ideas yet. Use 💡 Save ideas to bank after Oracle responses.</div>';
          return;
        }

        rows.forEach(function(row) {
          var item = document.createElement('div');
          item.style.cssText = 'padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);position:relative;';

          var topRow = document.createElement('div');
          topRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;';

          var starEl = document.createElement('span');
          starEl.textContent = row.starred ? '⭐' : '○';
          starEl.style.cssText = 'font-size:11px;flex-shrink:0;cursor:pointer;';
          starEl.onclick = function(e) {
            e.stopPropagation();
            fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/conid_pot?id=eq.' + row.id, {
              method: 'PATCH',
              headers: { 'apikey': RPGACE.CONFIG.supabase.key, 'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ starred: !row.starred })
            }).then(function() { self._refreshIdeaBank(filter || 'All'); });
          };

          var titleEl = document.createElement('div');
          titleEl.style.cssText = 'flex:1;font-size:12px;font-weight:600;color:#E2E2EC;';
          titleEl.textContent = row.title;

          var sourceBadge = document.createElement('span');
          sourceBadge.style.cssText = 'font-size:9px;color:rgba(226,226,236,0.25);flex-shrink:0;';
          sourceBadge.textContent = row.source || 'manual';

          topRow.appendChild(starEl); topRow.appendChild(titleEl); topRow.appendChild(sourceBadge);
          item.appendChild(topRow);

          // Action buttons — connectors
          var actRow = document.createElement('div');
          actRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

          var connectors = [
            { label: '🔀 Repurpose', color: '#3DAA6E', action: function() {
              if (RPGACE.modules.contentRepurpose) {
                RPGACE.modules.contentRepurpose.openPopup(row.idea_text, row.title);
              }
            }},
            { label: '💬 Oracle', color: '#4A90E2', action: function() {
              if (typeof showPage === 'function') showPage('advisor');
              setTimeout(function() { RPGACE.utils.sendToOracle('Help me develop this content idea for @AceSanyaBeats:\n\n"' + row.title + '"\n\n' + (row.idea_text || '').slice(0, 500)); }, 300);
            }},
            { label: '📅 Add to Agenda', color: '#C9A84C', action: function() {
              var agendas = JSON.parse(localStorage.getItem('rpgace_sched_agendas') || '[]');
              var today = new Date().toISOString().split('T')[0];
              agendas.push({ id: 'cp_' + Date.now(), date: today, hour: 14, title: 'Content: ' + row.title.slice(0,40), description: 'Film and post: ' + row.title, category: 'content', estimated_mins: 60, xp: 80 });
              localStorage.setItem('rpgace_sched_agendas', JSON.stringify(agendas));
              RPGACE.utils.toast('📅 Added to agenda: ' + row.title.slice(0,30), '#C9A84C', 2500);
            }},
            { label: '⚡ Activate ConID', color: '#9B59B6', action: function() {
              if (RPGACE.modules.contentProductionLive) {
                RPGACE.modules.contentProductionLive.createEntry({ title: row.title, idea: row.idea_text, taxonomy_nodes: row.phyla_detected || [], status: 'Idea' });
                // Update pot status to activated
                fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/conid_pot?id=eq.' + row.id, {
                  method: 'PATCH',
                  headers: { 'apikey': RPGACE.CONFIG.supabase.key, 'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                  body: JSON.stringify({ status: 'activated' })
                }).then(function() { self._refreshIdeaBank(filter || 'All'); });
              }
            }},
            { label: '🗑', color: 'rgba(226,84,84,0.6)', action: function() {
              if (confirm('Delete "' + row.title + '"?')) {
                RPGACE.sb.del('conid_pot', 'id=eq.' + row.id)
                  .then(function() { self._refreshIdeaBank(filter || 'All'); });
              }
            }},
          ];

          connectors.forEach(function(c) {
            var btn = document.createElement('button');
            btn.textContent = c.label;
            btn.style.cssText = 'padding:3px 9px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:5px;color:' + c.color + ';font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            btn.onclick = c.action;
            actRow.appendChild(btn);
          });

          item.appendChild(actRow);
          list.appendChild(item);
        });
      }).catch(function(e) {
        list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  // ── Update Morning Brief rotation label ───────────────────────
  _updateBriefRotationLabel: function() {
    var day = new Date().getDay();
    var rotation = this.BRIEF_ROTATION[day];
    if (!rotation) return;

    var briefWrap = document.getElementById('mb-wrap');
    if (!briefWrap) return;

    var existing = document.getElementById('mb-rotation-label');
    if (existing) existing.remove();

    var label = document.createElement('span');
    label.id = 'mb-rotation-label';
    label.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.5);margin-left:10px;';
    label.textContent = '· ' + rotation.label;

    var autoLabel = briefWrap.querySelector('[style*="font-size:10px"]');
    if (autoLabel) autoLabel.appendChild(label);
  },

  // ── Get ideas for Morning Brief by day rotation ───────────────
  getIdeasForBrief: function() {
    var day = new Date().getDay();
    var rotation = this.BRIEF_ROTATION[day] || { type: 'gap' };

    return RPGACE.sb.select('conid_pot', 'status=eq.potential&order=created_at.desc&limit=50')
      .then(function(rows) {
        rows = rows || [];
        if (rows.length === 0) return [];

        if (rotation.type === 'starred') {
          var starred = rows.filter(function(r) { return r.starred; });
          if (starred.length === 0) starred = rows;
          return [starred[Math.floor(Math.random() * starred.length)]];
        }
        if (rotation.type === 'oldest') {
          return rows.slice(-5).reverse(); // oldest 5
        }
        // gap: highest gap_score_avg
        return rows.sort(function(a,b) { return (b.gap_score_avg||0) - (a.gap_score_avg||0); }).slice(0, 3);
      });
  },

  // ── Helpers ───────────────────────────────────────────────────
  _extractTitle: function(text) {
    // Try quoted string first
    var q = text.match(/[\u201c\u201d"]([^\u201c\u201d"]{10,80})[\u201c\u201d"]/);
    if (q) return q[1].trim();
    // Try first meaningful line
    var lines = text.split('\n').map(function(l) { return l.replace(/[#*\[\]•\u2b50\d\.]/g,'').trim(); }).filter(function(l) { return l.length > 15 && l.length < 100; });
    return lines.length > 0 ? lines[0].slice(0,80) : text.slice(0,60);
  },

  _parseIdeas: function(text) {
    var ideas = [];
    // Match numbered items: "1." "T1." "⭐ 1." etc
    var lines = text.split('\n');
    var current = null;
    lines.forEach(function(line) {
      var trimmed = line.trim();
      var isNumbered = /^[A-Z]?\d+[\.\)]\s/.test(trimmed) || /^[\u2b50]\s*\d+/.test(trimmed);
      if (isNumbered && trimmed.length > 10) {
        if (current) ideas.push(current);
        var titleMatch = trimmed.match(/[\u201c\u201d"]([^\u201c\u201d"]{5,80})[\u201c\u201d"]/);
        var title = titleMatch ? titleMatch[1] : trimmed.replace(/^[A-Z]?\d+[\.\)]\s*[\u2b50]?\s*/, '').slice(0, 70);
        current = { title: title.trim(), text: trimmed };
      } else if (current && trimmed.length > 0) {
        current.text += '\n' + trimmed;
      }
    });
    if (current) ideas.push(current);
    return ideas.slice(0, 20); // max 20 per response
  },

  _quickDetectPhyla: function(text) {
    var t = text.toLowerCase();
    var nums = [];
    if (t.includes('drum') || t.includes('808') || t.includes('kick')) nums.push(2);
    if (t.includes('mix') || t.includes('eq') || t.includes('compress')) nums.push(4);
    if (t.includes('fl studio') || t.includes('plugin') || t.includes('vst')) nums.push(6);
    if (t.includes('tutorial') || t.includes('teach') || t.includes('learn')) nums.push(12);
    if (t.includes('youtube') || t.includes('instagram') || t.includes('content')) nums.push(13);
    return nums;
  },

  _similarity: function(a, b) {
    var wa = a.toLowerCase().split(/\s+/);
    var wb = b.toLowerCase().split(/\s+/);
    var common = wa.filter(function(w) { return w.length > 3 && wb.includes(w); });
    return common.length / Math.max(wa.length, wb.length);
  },

});
/* ===END:conidPot=== */
