src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """          // Action buttons row
          var actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';"""

new = """          // Top action row — swap button bottom right
          var topActions = document.createElement('div');
          topActions.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

          // Inline title edit
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex:1;margin-right:8px;';
          var titleDisplay = document.createElement('div');
          titleDisplay.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);cursor:pointer;';
          titleDisplay.textContent = '✎ Edit title';
          titleDisplay.onclick = function() {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.value = row.title;
            inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(61,170,110,0.3);border-radius:4px;color:#E2E2EC;font-size:11px;padding:3px 6px;outline:none;font-family:Rajdhani,sans-serif;';
            titleWrap.replaceChild(inp, titleDisplay);
            inp.focus();
            inp.onblur = function() {
              var newTitle = inp.value.trim() || row.title;
              self.updateEntry(row.id, { title: newTitle }).then(function() {
                RPGACE.utils.toast('✅ Title updated', '#3DAA6E', 2000);
                self._refreshWidget();
              });
            };
            inp.onkeydown = function(e) { if (e.key === 'Enter') inp.blur(); };
          };
          titleWrap.appendChild(titleDisplay);

          // Swap button
          var swapBtn = document.createElement('button');
          swapBtn.textContent = '⇄ Swap ConID';
          swapBtn.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:5px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
          swapBtn.onclick = function() {
            // Load all ConIDs and show swap dropdown
            RPGACE.sb.select('content_productions', 'order=con_id.desc&limit=30')
              .then(function(all) {
                // Remove existing swap dropdown if open
                var existing = document.getElementById('cpl-swap-dropdown');
                if (existing) { existing.remove(); return; }

                var dd = document.createElement('div');
                dd.id = 'cpl-swap-dropdown';
                dd.style.cssText = 'position:absolute;right:0;top:100%;background:#0f0f1a;border:1px solid rgba(61,170,110,0.25);border-radius:8px;z-index:9999;min-width:260px;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.5);';

                (all || []).forEach(function(entry) {
                  var opt = document.createElement('div');
                  opt.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;color:rgba(226,226,236,0.7);';
                  opt.innerHTML = '<span style="color:rgba(61,170,110,0.7);font-weight:700;margin-right:6px;">ConID #' + entry.con_id + '</span>' + entry.title.slice(0, 45) + (entry.title.length > 45 ? '...' : '') + '<span style="float:right;font-size:9px;color:rgba(226,226,236,0.3);">' + entry.status + '</span>';
                  opt.onmouseover = function() { opt.style.background = 'rgba(61,170,110,0.08)'; };
                  opt.onmouseout = function() { opt.style.background = 'none'; };
                  opt.onclick = function() {
                    dd.remove();
                    self._activeConID = entry.con_id;
                    self._activeId = entry.id;
                    RPGACE.utils.toast('Switched to ConID #' + entry.con_id + ': ' + entry.title.slice(0,40), '#3DAA6E', 3000);
                    self._refreshWidget();
                  };
                  dd.appendChild(opt);
                });

                // Position relative to swap button
                swapBtn.style.position = 'relative';
                swapBtn.appendChild(dd);

                // Close on outside click
                setTimeout(function() {
                  document.addEventListener('click', function closeDd(e) {
                    if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', closeDd); }
                  });
                }, 100);
              });
          };

          topActions.appendChild(titleWrap);
          topActions.appendChild(swapBtn);
          item.appendChild(topActions);

          // Action buttons row
          var actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: swap button + inline title edit added to ConID cards")
else:
    print("ERROR: anchor not found")
