/* ===MODULE:contentProductionLive=== */
RPGACE.register('contentProductionLive', {

  _activeConID: null,
  _oracleSession: [],

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._injectDashboardWidget(); }, 1600);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        setTimeout(function() { self._injectDashboardWidget(); }, 400);
      }
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._injectOracleBar(); }, 600);
      }
    });
  },

  // ── Create a new ConID entry ──────────────────────────────────
  createEntry: function(data) {
    var self = this;
    RPGACE.sb.insert('content_productions', {
      title:          data.title || 'Untitled Content Idea',
      idea:           data.idea || '',
      taxonomy_nodes: data.taxonomy_nodes || [],
      platform_outputs: data.platform_outputs || {},
      status:         data.status || 'Idea',
    }).then(function(result) {
      var entry = Array.isArray(result) ? result[0] : result;
      if (entry && entry.con_id) {
        self._activeConID = entry.con_id;
        self._activeId = entry.id;
        RPGACE.utils.toast('📋 ConID #' + entry.con_id + ' created: ' + data.title, '#3DAA6E', 4000);
        self._refreshWidget();
        self._injectOracleBar();
      }
    }).catch(function(e) {
      console.warn('[contentProductionLive] createEntry error:', e.message);
    });
  },

  // ── Update an existing entry ──────────────────────────────────
  updateEntry: function(id, updates) {
    return fetch(RPGACE.CONFIG.supabase.url + '/rest/v1/content_productions?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'apikey': RPGACE.CONFIG.supabase.key,
        'Authorization': 'Bearer ' + RPGACE.CONFIG.supabase.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updates)
    });
  },

  // ── Dashboard widget — ConID tracker ─────────────────────────
  _injectDashboardWidget: function() {
    if (document.getElementById('cpl-widget')) return;
    var self = this;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    var widget = document.createElement('div');
    widget.id = 'cpl-widget';
    widget.style.cssText = 'background:rgba(61,170,110,0.03);border:1px solid rgba(61,170,110,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
    var titleEl = document.createElement('div');
    var eyebrow = document.createElement('div');
    eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(61,170,110,0.6);text-transform:uppercase;margin-bottom:3px;';
    eyebrow.textContent = 'Content Production Live';
    var titleText = document.createElement('div');
    titleText.className = 'section-title';
    titleText.style.cssText = 'font-size:14px;';
    titleText.textContent = 'Content Pipeline';
    titleEl.appendChild(eyebrow); titleEl.appendChild(titleText);

    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = '↻';
    refreshBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);cursor:pointer;font-size:12px;padding:4px 10px;';
    refreshBtn.onclick = function() { self._refreshWidget(); };
    hdr.appendChild(titleEl); hdr.appendChild(refreshBtn);
    widget.appendChild(hdr);

    var list = document.createElement('div');
    list.id = 'cpl-list';
    list.style.cssText = 'max-height:300px;overflow-y:auto;';
    list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
    widget.appendChild(list);

    // Insert after Knowledge Gap Tracker
    var kgPanel = document.getElementById('kg-panel');
    if (kgPanel && kgPanel.nextSibling) {
      page.insertBefore(widget, kgPanel.nextSibling);
    } else {
      page.insertBefore(widget, page.firstChild);
    }

    self._refreshWidget();
    console.log('[contentProductionLive] Dashboard widget injected');
  },

  _refreshWidget: function() {
    var self = this;
    var list = document.getElementById('cpl-list');
    if (!list) return;

    RPGACE.sb.select('content_productions', 'order=con_id.desc&limit=20')
      .then(function(rows) {
        rows = rows || [];
        list.innerHTML = '';

        if (rows.length === 0) {
          list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;padding:8px 0;">No content ideas yet. Use 🔀 Repurpose in Oracle to create your first ConID.</div>';
          return;
        }

        rows.forEach(function(row) {
          var statusColors = {
            'Idea': '#4A90E2', 'Scripted': '#C9A84C', 'Filmed': '#9B59B6',
            'Edited': '#E25454', 'Posted': '#3DAA6E', 'Analysed': '#2ABFB0'
          };
          var color = statusColors[row.status] || '#4A90E2';

          var item = document.createElement('div');
          item.style.cssText = 'padding:10px 12px;border:1px solid rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px;background:rgba(255,255,255,0.02);';

          var topRow = document.createElement('div');
          topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

          var idBadge = document.createElement('span');
          idBadge.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(61,170,110,0.7);background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:10px;padding:2px 7px;margin-right:8px;';
          idBadge.textContent = 'ConID #' + row.con_id;

          var titleSpan = document.createElement('span');
          titleSpan.style.cssText = 'font-size:12px;font-weight:600;color:#E2E2EC;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          titleSpan.textContent = row.title;

          var statusBadge = document.createElement('span');
          statusBadge.style.cssText = 'font-size:9px;font-weight:700;color:' + color + ';background:' + color.replace(')', ',0.1)').replace('rgb','rgba') + ';border:1px solid ' + color.replace(')', ',0.3)').replace('rgb','rgba') + ';border-radius:10px;padding:2px 8px;margin-left:8px;flex-shrink:0;';
          statusBadge.textContent = row.status;

          topRow.appendChild(idBadge); topRow.appendChild(titleSpan); topRow.appendChild(statusBadge);
          item.appendChild(topRow);

          // Status progress bar
          var statuses = ['Idea','Scripted','Filmed','Edited','Posted','Analysed'];
          var statusIdx = statuses.indexOf(row.status);
          var progressWrap = document.createElement('div');
          progressWrap.style.cssText = 'display:flex;gap:3px;margin-bottom:8px;';
          statuses.forEach(function(s, i) {
            var dot = document.createElement('div');
            dot.style.cssText = 'flex:1;height:3px;border-radius:2px;background:' + (i <= statusIdx ? color : 'rgba(255,255,255,0.08)') + ';';
            progressWrap.appendChild(dot);
          });
          item.appendChild(progressWrap);

          // Action buttons row
          var actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

          // Status advance button
          if (statusIdx < statuses.length - 1) {
            var nextStatus = statuses[statusIdx + 1];
            var advBtn = document.createElement('button');
            advBtn.textContent = '→ Mark ' + nextStatus;
            advBtn.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.6);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            advBtn.onclick = function() {
              var updates = { status: nextStatus };
              if (nextStatus === 'Posted') updates.posted_at = new Date().toISOString();
              if (nextStatus === 'Analysed') updates.analysed_at = new Date().toISOString();
              self.updateEntry(row.id, updates).then(function() {
                self._refreshWidget();
                RPGACE.utils.toast('ConID #' + row.con_id + ' → ' + nextStatus, color, 2000);
              });
            };
            actions.appendChild(advBtn);
          }

          // Posted — show URL input questionnaire
          if (row.status === 'Posted' || row.status === 'Analysed') {
            if (row.youtube_url) {
              var ytLink = document.createElement('a');
              ytLink.href = row.youtube_url; ytLink.target = '_blank';
              ytLink.textContent = '▶ YouTube';
              ytLink.style.cssText = 'padding:4px 10px;background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.2);border-radius:5px;color:#E25454;font-size:10px;text-decoration:none;';
              actions.appendChild(ytLink);
            }
            if (row.instagram_url) {
              var igLink = document.createElement('a');
              igLink.href = row.instagram_url; igLink.target = '_blank';
              igLink.textContent = '📸 Instagram';
              igLink.style.cssText = 'padding:4px 10px;background:rgba(193,53,132,0.08);border:1px solid rgba(193,53,132,0.2);border-radius:5px;color:#E1306C;font-size:10px;text-decoration:none;';
              actions.appendChild(igLink);
            }
          }

          // Post details button (when status hits Posted)
          if (row.status === 'Filmed' || row.status === 'Edited') {
            var postBtn = document.createElement('button');
            postBtn.textContent = '📋 Add post details';
            postBtn.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:5px;color:#3DAA6E;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            postBtn.onclick = function() { self._showPostDetails(row); };
            actions.appendChild(postBtn);
          }

          // Open in Oracle button
          var oracleBtn = document.createElement('button');
          oracleBtn.textContent = '💬 Oracle session';
          oracleBtn.style.cssText = 'padding:4px 10px;background:rgba(74,144,226,0.06);border:1px solid rgba(74,144,226,0.15);border-radius:5px;color:#4A90E2;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          oracleBtn.onclick = function() {
            self._activeConID = row.con_id;
            self._activeId = row.id;
            if (typeof showPage === 'function') showPage('advisor');
            setTimeout(function() {
              self._injectOracleBar();
              RPGACE.utils.sendToOracle('I am working on ConID #' + row.con_id + ': "' + row.title + '". Status: ' + row.status + '. Idea: ' + (row.idea || '').slice(0, 300) + '\n\nHelp me with the next step in the content production process.');
            }, 500);
          };
          actions.appendChild(oracleBtn);

          item.appendChild(actions);
          list.appendChild(item);
        });
      }).catch(function(e) {
        list.innerHTML = '<div style="color:#E25454;font-size:11px;">Load error: ' + e.message + '</div>';
      });
  },

  // ── Post details questionnaire ────────────────────────────────
  _showPostDetails: function(row) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(61,170,110,0.25);border-radius:12px;padding:24px 28px;width:min(520px,95vw);max-height:90vh;overflow-y:auto;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:16px;';
    title.textContent = 'ConID #' + row.con_id + ' — Post Details';
    box.appendChild(title);

    var fields = [
      { id: 'pd-yt',    label: 'YouTube URL', placeholder: 'https://youtube.com/watch?v=...' },
      { id: 'pd-ig',    label: 'Instagram URL', placeholder: 'https://instagram.com/p/...' },
      { id: 'pd-tiktok',label: 'TikTok URL', placeholder: 'https://tiktok.com/@acesanyabeats/...' },
      { id: 'pd-raw',   label: 'Raw footage path (E: drive)', placeholder: 'E:\\Videos\\edison_tutorial_raw.mp4' },
      { id: 'pd-notes', label: 'Post notes / performance observations', placeholder: 'e.g. Posted Sunday 6pm, got 200 views in first hour...' },
    ];

    fields.forEach(function(f) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:5px;margin-top:12px;';
      lbl.textContent = f.label + ':';
      var inp = document.createElement('input');
      inp.id = f.id; inp.type = 'text'; inp.placeholder = f.placeholder;
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      box.appendChild(lbl); box.appendChild(inp);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save + Mark Posted';
    saveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#3DAA6E;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    saveBtn.onclick = function() {
      var g = function(id) { var el=document.getElementById(id); return el?el.value.trim():''; };
      var updates = {
        status: 'Posted',
        posted_at: new Date().toISOString(),
        youtube_url: g('pd-yt') || null,
        instagram_url: g('pd-ig') || null,
        tiktok_url: g('pd-tiktok') || null,
        raw_footage_path: g('pd-raw') || null,
        notes: g('pd-notes') || null,
      };
      self.updateEntry(row.id, updates).then(function() {
        overlay.remove();
        self._refreshWidget();
        RPGACE.utils.toast('✅ ConID #' + row.con_id + ' marked Posted', '#3DAA6E', 3000);
        // Auto-post to Instagram if URL not provided
        if (!updates.instagram_url && updates.status === 'Posted') {
          RPGACE.utils.toast('💡 Tip: Instagram auto-post available via Composio', '#9B59B6', 4000);
        }
      });
    };
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  // ── Oracle bar — shows active ConID in Oracle tab ─────────────
  _injectOracleBar: function() {
    if (!this._activeConID) return;
    if (document.getElementById('cpl-oracle-bar')) return;
    var self = this;
    var chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    var bar = document.createElement('div');
    bar.id = 'cpl-oracle-bar';
    bar.style.cssText = 'background:rgba(61,170,110,0.06);border:1px solid rgba(61,170,110,0.2);border-radius:8px;padding:8px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;';

    var left = document.createElement('div');
    left.style.cssText = 'font-size:11px;color:rgba(61,170,110,0.8);';
    left.textContent = '📋 Active: ConID #' + self._activeConID + ' — Oracle session being recorded';

    var optionBBtn = document.createElement('button');
    optionBBtn.textContent = '🎬 Switch to Production Panel';
    optionBBtn.style.cssText = 'padding:4px 12px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:5px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    optionBBtn.onclick = function() { self._openProductionPanel(); };

    var endBtn = document.createElement('button');
    endBtn.textContent = 'End session';
    endBtn.style.cssText = 'padding:4px 10px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.3);font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:6px;';
    endBtn.onclick = function() { self._endSession(); };

    left.appendChild(document.createElement('br'));
    bar.appendChild(left);
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
    btnWrap.appendChild(optionBBtn); btnWrap.appendChild(endBtn);
    bar.appendChild(btnWrap);
    chatBox.parentElement.insertBefore(bar, chatBox);
  },

  // ── Option B: Production Panel ────────────────────────────────
  _openProductionPanel: function() {
    if (document.getElementById('cpl-prod-panel')) return;
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'cpl-prod-panel';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(61,170,110,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(61,170,110,0.06);border-bottom:1px solid rgba(61,170,110,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var htxt = document.createElement('div');
    var lb = document.createElement('div');
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.65);margin-bottom:3px;';
    lb.textContent = 'CONTENT PRODUCTION LIVE · ConID #' + self._activeConID;
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
    sub.textContent = 'Production Panel';
    htxt.appendChild(lb); htxt.appendChild(sub);
    var closeHdr = document.createElement('button');
    closeHdr.textContent = '×';
    closeHdr.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;';
    closeHdr.onclick = function() {
      panel.style.transform = 'translateX(100%)';
      setTimeout(function(){ panel.remove(); }, 280);
    };
    hdr.appendChild(htxt); hdr.appendChild(closeHdr);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';

    var phases = [
      { icon: '📝', title: 'Phase 1 — Pre-Production', desc: 'Your script outline, hook, and key teaching points are in the Oracle conversation. Review them, then click Ready to Film when prepared.' },
      { icon: '🎬', title: 'Phase 2 — Production', desc: 'Film your video section by section. Keep the Oracle bar open to reference your notes. Paste your raw footage path when done filming.' },
      { icon: '✂️', title: 'Phase 3 — Post-Production', desc: 'Your platform captions are in Oracle. Copy them for each platform. Paste URLs once posted. System will pull stats on next Morning Brief.' },
    ];

    phases.forEach(function(ph, i) {
      var phaseCard = document.createElement('div');
      phaseCard.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;margin-bottom:10px;';
      var phTitle = document.createElement('div');
      phTitle.style.cssText = 'font-size:13px;font-weight:700;color:#E2E2EC;margin-bottom:6px;';
      phTitle.textContent = ph.icon + ' ' + ph.title;
      var phDesc = document.createElement('div');
      phDesc.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.45);line-height:1.6;margin-bottom:10px;';
      phDesc.textContent = ph.desc;

      if (i === 1) {
        // Phase 2 — raw footage path input
        var pathInp = document.createElement('input');
        pathInp.type = 'text';
        pathInp.placeholder = 'E:\\Videos\\raw_footage.mp4';
        pathInp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:#E2E2EC;font-size:11px;padding:6px 8px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:6px;';
        var savePathBtn = document.createElement('button');
        savePathBtn.textContent = 'Save footage path';
        savePathBtn.style.cssText = 'padding:5px 12px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.25);border-radius:5px;color:#3DAA6E;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        savePathBtn.onclick = function() {
          if (self._activeId && pathInp.value.trim()) {
            self.updateEntry(self._activeId, { raw_footage_path: pathInp.value.trim() })
              .then(function() { RPGACE.utils.toast('📁 Footage path saved', '#3DAA6E', 2000); });
          }
        };
        phaseCard.appendChild(phTitle); phaseCard.appendChild(phDesc);
        phaseCard.appendChild(pathInp); phaseCard.appendChild(savePathBtn);
      } else {
        phaseCard.appendChild(phTitle); phaseCard.appendChild(phDesc);
      }

      body.appendChild(phaseCard);
    });

    // Switch back to Oracle button
    var backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Oracle (Option A)';
    backBtn.style.cssText = 'width:100%;padding:10px;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:6px;color:#4A90E2;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-top:8px;';
    backBtn.onclick = function() {
      panel.style.transform = 'translateX(100%)';
      setTimeout(function(){ panel.remove(); }, 280);
    };
    body.appendChild(backBtn);
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ panel.style.transform = 'translateX(0)'; }); });
  },

  // ── End session — compile to journal ─────────────────────────
  _endSession: function() {
    var self = this;
    var bar = document.getElementById('cpl-oracle-bar');
    if (bar) bar.remove();

    // Compile Oracle conversation to journal and update entry
    var chatBox = document.getElementById('chat-box');
    var sessionText = chatBox ? chatBox.innerText.slice(-3000) : '';

    if (self._activeId && sessionText) {
      self.updateEntry(self._activeId, { oracle_session: sessionText });
    }

    if (typeof saveToJournal === 'function' && self._activeConID) {
      saveToJournal(
        'Content Production Session — ConID #' + self._activeConID,
        'Session ended. Oracle conversation captured.\n\n' + sessionText.slice(0, 2000),
        'contentProductionLive'
      );
    }

    RPGACE.utils.toast('✅ Session ended · Saved to Journal · ConID #' + self._activeConID, '#3DAA6E', 4000);
    self._activeConID = null;
    self._activeId = null;
    self._refreshWidget();
  },

});
/* ===END:contentProductionLive=== */
