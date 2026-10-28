
/* ===MODULE:shoppingWishlist=== */
// 2026-09-14 - real Alex ask: "I want a general shopping list module where
// I keep my future purchases... plan out total budget I need to make
// informed decisions on what I can do and not have my ideas forgotten."
// Real /interrogation (3 AskUserQuestion forks, all confirmed):
//   1. Budget logic = a target + priority ranking (not a flat budget alone,
//      not priority alone) - see logic._computeBudgetFit.
//   2. Marking bought logs a real chronicles_finance expense row under
//      category "Personal" ("2 but under personal expenses" - Alex's own
//      words) - reuses the EXISTING finance ledger table/write shape
//      chroniclesLog._showAddForm already proves in production (rule 8),
//      never a 2nd hand-rolled expense mechanism.
//   3. Items get an optional free-text category tag (kitchen/household/
//      gaming/etc), same datalist-suggestion pattern as chroniclesLog's own
//      CATEGORY_SUGGESTIONS - never a hard enum, so a genuinely new
//      category never gets rejected.
// Deliberately standalone from HABITS/Cooking, its own dashboard card - real
// evidence this is the right call: the items Alex actually named (batteries,
// a silicone baking mould, laundry detergent, a wok, a mixing stand, FIFA
// 27) are general future purchases, not ingredients - cookingOracle's own
// shopping_lists/shopping_list_items pair is ingredient-specific, generated
// from a planned cook session, a genuinely different real mechanism this
// module does not touch or duplicate.
// Built ui/logic split from the start (rule 8 - matches every module this
// series has shipped since G53; no reason for a brand-new module to start
// life in the pre-split shape).
RPGACE.register('shoppingWishlist', {
  domain: 'habits',

  CATEGORY_SUGGESTIONS: ['Kitchen', 'Household', 'Electronics', 'Gaming', 'Clothing', 'Other'],
  PRIORITY_META: {
    high:   { label: '🔴 High', rank: 0 },
    medium: { label: '🟡 Medium', rank: 1 },
    low:    { label: '⚪ Low', rank: 2 },
  },

  init: function() {
    // No boot-time DOM injection needed - ui._showMain() is reached only
    // via the dashboard card's own click (dashDeck.MODULES 'wishlist'
    // entry), same lazy-build-on-demand pattern cookingOracle/oracleControl
    // already use.
  },

  // ============================================================
  // logic — business logic/data
  // ============================================================
  logic: {

    _loadItems: function(cb) {
      RPGACE.sb.select('wishlist_items', 'select=*&order=created_at.desc')
        .then(function(rows) { cb(rows || []); })
        .catch(function() { cb([]); });
    },

    _loadConfig: function(cb) {
      RPGACE.sb.select('wishlist_config', 'id=eq.1&limit=1')
        .then(function(rows) { cb(rows && rows[0] ? rows[0] : {}); })
        .catch(function() { cb({}); });
    },

    _saveConfig: function(patch, cb) {
      RPGACE.sb.secureWrite('wishlist_config', 'update', patch, 'id=eq.1')
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'budget save failed'); });
    },

    _addItem: function(item, cb) {
      RPGACE.sb.secureWrite('wishlist_items', 'insert', item)
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'add failed'); });
    },

    _updateItem: function(id, patch, cb) {
      RPGACE.sb.secureWrite('wishlist_items', 'update', patch, 'id=eq.' + id)
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'update failed'); });
    },

    _deleteItem: function(id, cb) {
      RPGACE.sb.secureWrite('wishlist_items', 'delete', null, 'id=eq.' + id)
        .then(function() { cb(null); })
        .catch(function(e) { cb(e.message || 'delete failed'); });
    },

    // Real /interrogation-confirmed budget logic: "budget target + priority
    // ranking... which top-priority items fit within it right now." A real
    // greedy fill, priority-first (then cheapest-first within the same
    // priority as a tiebreak, so two equally-urgent items favour the one
    // that leaves more budget for a 3rd). An item that doesn't fit is
    // SKIPPED, not a hard stop - so a cheap low-priority item sitting after
    // an unaffordable expensive one can still show as affordable right now,
    // which is genuinely more useful than a strict cutoff. Items with no
    // estimated_price are excluded from the fit calc (there's nothing to
    // compare) but stay fully visible in the list, so "FIFA 27" with no
    // price yet is never silently dropped.
    _computeBudgetFit: function(items, budgetTarget) {
      var self = RPGACE.modules.shoppingWishlist;
      var wanted = (items || []).filter(function(i) { return i.status === 'wanted'; });
      var priced = wanted.filter(function(i) { return i.estimated_price != null; });
      var sorted = priced.slice().sort(function(a, b) {
        var ra = (self.PRIORITY_META[a.priority] || self.PRIORITY_META.medium).rank;
        var rb = (self.PRIORITY_META[b.priority] || self.PRIORITY_META.medium).rank;
        if (ra !== rb) return ra - rb;
        return (a.estimated_price || 0) - (b.estimated_price || 0);
      });
      var totalCost = priced.reduce(function(s, i) { return s + Number(i.estimated_price); }, 0);
      var hasBudget = budgetTarget != null && budgetTarget !== '' && !isNaN(budgetTarget);
      var fitIds = {};
      if (hasBudget) {
        var remaining = parseFloat(budgetTarget);
        sorted.forEach(function(i) {
          if (Number(i.estimated_price) <= remaining) {
            fitIds[i.id] = true;
            remaining -= Number(i.estimated_price);
          }
        });
      }
      return { hasBudget: hasBudget, totalCost: totalCost, budgetTarget: hasBudget ? parseFloat(budgetTarget) : null, fitIds: fitIds };
    },

    // Real /interrogation-confirmed link ("2 but under personal expenses" -
    // Alex's own words): marking an item bought writes a REAL expense row
    // to chronicles_finance (type:'expense', category:'Personal'), the
    // exact same table/shape chroniclesLog._showAddForm's own submit
    // handler already writes to in production (rule 8) - never a 2nd,
    // parallel expense-tracking mechanism. The item's own bought_price is
    // what actually gets logged (what Alex really paid), not the earlier
    // estimated_price, since those can genuinely differ.
    // G1: 24h cool-off window measured from when the item was added.
    COOL_OFF_HOURS: 24,
    _coolOff: function(item, now) {
      var t = item && item.created_at ? Date.parse(item.created_at) : NaN;
      if (isNaN(t)) return { active: false, hoursLeft: 0 };
      var left = RPGACE.modules.shoppingWishlist.logic.COOL_OFF_HOURS - ((now || Date.now()) - t) / 3600000;
      return { active: left > 0, hoursLeft: Math.max(0, left) };
    },

    // SH-5b (Oct 17 2026): opts.business logs it as a business cost (tax
    // year list on the Money page) with an optional private receipt photo.
    _markBought: function(itemRow, boughtPrice, cb, opts) {
      var self = RPGACE.modules.shoppingWishlist;
      opts = opts || {};
      var today = new Date().toISOString().slice(0, 10);
      self.logic._updateItem(itemRow.id, { status: 'bought', bought_at: new Date().toISOString(), bought_price: boughtPrice }, function(err) {
        if (err) { cb(err); return; }
        RPGACE.sb.secureWrite('chronicles_finance', 'insert', {
          type: 'expense',
          entry_date: today,
          item: itemRow.name,
          category: opts.business ? 'Business' : 'Personal',
          amount: boughtPrice,
          business: !!opts.business,
          receipt_id: opts.receiptId || null,
          notes: 'From Shopping Wishlist' + (itemRow.category ? ' (' + itemRow.category + ')' : ''),
        }).then(function() {
          RPGACE.cache.clear('chronicles_finance');
          cb(null);
        }).catch(function(e) {
          // Real fail-loud choice (rule 7): the item's own bought/paid
          // status DID save (the real primary outcome asked for) - a
          // failed secondary finance-log write is surfaced honestly as a
          // warning rather than silently swallowed OR rolled back over.
          cb(null, 'Marked bought, but logging the expense to Chronicles failed: ' + (e.message || 'unknown error'));
        });
      });
    },

  },

  // ============================================================
  // ui — rendering/DOM
  // ============================================================
  ui: {

    _showMain: function() {
      var self = RPGACE.modules.shoppingWishlist;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) { console.warn('[shoppingWishlist] dashDeck._popup unavailable'); return; }
      var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };

      var pop = dd._popup({
        width: '600px', scroll: true, eyebrow: '🛒 SHOPPING WISHLIST', title: 'Future purchases',
        borderColor: 'rgba(74,140,204,0.35)',
      });
      var box = pop.box;

      var items = [];
      var cfg = {};
      var showBought = false;

      var budgetBox = document.createElement('div');
      budgetBox.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px;';
      box.appendChild(budgetBox);
      // SL-3 (Oct 27 2026): the budget setting and the Money link (SH-5b) live in the › side list;
      // the "what fits" line stays on the page.
      var budgetOpen = false;
      pop.overlay._sideExtras = function() {
        var ex = [['🎯', 'Set budget target', function() { budgetOpen = true; renderBudget(); var i = box.querySelector('#wl-budget'); if (i) i.focus(); }, 'wl-budget']];
        if (RPGACE.modules.moneyHub) ex.push(['💷', 'Money — in, out, subscriptions, receipts', function() { pop.close(); RPGACE.modules.moneyHub.open('wishlist'); }, 'wl-money']);
        return ex;
      };

      var addHeading = document.createElement('div');
      addHeading.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;';
      addHeading.textContent = 'Add something';
      box.appendChild(addHeading);

      var addRow = document.createElement('div');
      addRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;';
      var nameInput = document.createElement('input');
      nameInput.type = 'text'; nameInput.placeholder = 'e.g. FIFA 27';
      nameInput.style.cssText = 'flex:2;min-width:140px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      var catInput = document.createElement('input');
      catInput.type = 'text'; catInput.placeholder = 'category (optional)'; catInput.setAttribute('list', 'wl-cat-list');
      catInput.style.cssText = 'flex:1;min-width:110px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      var catList = document.createElement('datalist');
      catList.id = 'wl-cat-list';
      self.CATEGORY_SUGGESTIONS.forEach(function(c) { var o = document.createElement('option'); o.value = c; catList.appendChild(o); });
      var priSelect = document.createElement('select');
      priSelect.style.cssText = 'flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      ['high', 'medium', 'low'].forEach(function(p) {
        var o = document.createElement('option'); o.value = p; o.textContent = self.PRIORITY_META[p].label;
        if (p === 'medium') o.selected = true;
        priSelect.appendChild(o);
      });
      var priceInput = document.createElement('input');
      priceInput.type = 'number'; priceInput.min = '0'; priceInput.step = '0.01'; priceInput.placeholder = '£ (optional)';
      priceInput.style.cssText = 'flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      var addBtn = document.createElement('button');
      addBtn.textContent = '+ Add';
      addBtn.style.cssText = 'padding:6px 14px;background:var(--green);border:none;border-radius:6px;color:#08160f;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      addRow.appendChild(nameInput); addRow.appendChild(catInput); addRow.appendChild(priSelect); addRow.appendChild(priceInput); addRow.appendChild(addBtn);
      box.appendChild(addRow);
      // G1 money guardrails (Oct 10 2026): the reason is recorded at the
      // moment of wanting, then quoted back at the cool-off before buying.
      var reasonInput = document.createElement('input');
      reasonInput.type = 'text'; reasonInput.id = 'wl-reason'; reasonInput.placeholder = 'Why do you want it? (optional, shown back to you before you buy)';
      reasonInput.style.cssText = 'width:100%;box-sizing:border-box;margin-bottom:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;';
      box.appendChild(reasonInput);
      box.appendChild(catList);

      var addErr = document.createElement('div');
      addErr.style.cssText = 'color:#CC4A4A;font-size:11px;margin-bottom:12px;display:none;';
      box.appendChild(addErr);
      // SL-3: the add form folds behind one button (shared RPGACE.sideList.foldForm).
      if (RPGACE.sideList) RPGACE.sideList.foldForm(box, [addHeading, addRow, reasonInput], nameInput, '➕ Add an item', { before: addHeading });

      var listHeading = document.createElement('div');
      listHeading.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin:14px 0 8px;';
      listHeading.textContent = 'On your list';
      box.appendChild(listHeading);

      var listBox = document.createElement('div');
      box.appendChild(listBox);

      var boughtToggleBtn = document.createElement('button');
      boughtToggleBtn.style.cssText = 'width:100%;padding:8px;margin-top:14px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      box.appendChild(boughtToggleBtn);

      var boughtBox = document.createElement('div');
      boughtBox.style.cssText = 'display:none;margin-top:10px;';
      box.appendChild(boughtBox);

      var loadAndRender; // defined below, referenced by row handlers that only ever run later (on click), same hoisting-safe pattern cookingOracle._showRecipeCard already uses

      var renderBudget = function() {
        var fit = self.logic._computeBudgetFit(items, cfg.budget_target);
        var remaining = fit.hasBudget ? (fit.budgetTarget - fit.totalCost) : null;
        budgetBox.innerHTML =
          '<div id="wl-budget-row" style="display:' + (budgetOpen ? 'flex' : 'none') + ';align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">' +
            '<label style="font-size:11px;color:var(--muted);">Budget target £</label>' +
            '<input id="wl-budget" type="number" min="0" step="0.01" value="' + (cfg.budget_target != null ? esc(cfg.budget_target) : '') + '" placeholder="not set" style="width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:5px 8px;">' +
            '<button id="wl-budget-save" style="padding:5px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;">Save</button>' +
          '</div>' +
          '<div style="font-size:12.5px;color:var(--text);">Total wanted: <b>£' + fit.totalCost.toFixed(2) + '</b>' +
          (fit.hasBudget
            ? (' &nbsp;·&nbsp; ' + (remaining >= 0
                ? 'Under budget by <b style="color:var(--green);">£' + remaining.toFixed(2) + '</b>'
                : 'Over budget by <b style="color:#CC4A4A;">£' + Math.abs(remaining).toFixed(2) + '</b>'))
            : ' &nbsp;·&nbsp; <span style="color:var(--muted);">set a budget target to see what fits right now</span>') +
          '</div>';
        box.querySelector('#wl-budget-save').onclick = function() {
          var v = box.querySelector('#wl-budget').value.trim();
          var patch = { budget_target: v === '' ? null : parseFloat(v) };
          if (v !== '' && isNaN(patch.budget_target)) { RPGACE.utils.toast('⚠️ Enter a valid number', '#E2A83D', 2500); return; }
          self.logic._saveConfig(patch, function(err) {
            if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3500); return; }
            cfg.budget_target = patch.budget_target;
            RPGACE.utils.toast('💾 Budget saved', '#4caf82', 1800);
            budgetOpen = false;
            renderBudget();
            renderList();
          });
        };
      };

      var renderList = function() {
        var fit = self.logic._computeBudgetFit(items, cfg.budget_target);
        listBox.innerHTML = '';
        var wanted = items.filter(function(i) { return i.status === 'wanted'; });
        if (!wanted.length) {
          var empty = document.createElement('div');
          empty.style.cssText = 'font-size:12px;color:var(--muted);padding:10px 0;';
          empty.textContent = 'Nothing on your list yet.';
          listBox.appendChild(empty);
          return;
        }
        ['high', 'medium', 'low'].forEach(function(p) {
          var group = wanted.filter(function(i) { return (i.priority || 'medium') === p; });
          if (!group.length) return;
          var groupHeading = document.createElement('div');
          groupHeading.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);margin:10px 0 4px;';
          groupHeading.textContent = self.PRIORITY_META[p].label;
          listBox.appendChild(groupHeading);
          group.forEach(function(item) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12.5px;flex-wrap:wrap;';

            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'flex:1;min-width:100px;color:var(--text);';
            nameSpan.textContent = item.name;
            // XP-6: a treat you earned on the Year page (the cool-off still applies).
            if (item.treat_earned_at) {
              var treatTag = document.createElement('span');
              treatTag.className = 'wl-treat-earned';
              treatTag.style.cssText = 'color:#4CAF82;font-size:11px;font-weight:700;';
              treatTag.textContent = ' · 🎁 earned';
              nameSpan.appendChild(treatTag);
            }
            if (item.category) {
              var catTag = document.createElement('span');
              catTag.style.cssText = 'color:var(--muted);font-size:11px;';
              catTag.textContent = ' · ' + item.category;
              nameSpan.appendChild(catTag);
            }
            row.appendChild(nameSpan);

            var priceSpan = document.createElement('span');
            priceSpan.style.cssText = 'color:var(--muted);font-size:12px;min-width:60px;text-align:right;';
            priceSpan.textContent = item.estimated_price != null ? ('£' + Number(item.estimated_price).toFixed(2)) : 'no price yet';
            row.appendChild(priceSpan);

            if (fit.hasBudget && item.estimated_price != null) {
              var fitTag = document.createElement('span');
              fitTag.style.cssText = 'font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap;' + (fit.fitIds[item.id] ? 'color:var(--green);background:rgba(76,175,130,0.12);' : 'color:var(--muted);background:rgba(255,255,255,0.04);');
              fitTag.textContent = fit.fitIds[item.id] ? '✓ fits now' : 'not yet';
              row.appendChild(fitTag);
            }

            var cool = self.logic._coolOff(item);
            if (cool.active) {
              var coolTag = document.createElement('span');
              coolTag.style.cssText = 'font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap;color:var(--gold);background:rgba(226,168,61,0.12);';
              coolTag.textContent = '⏳ cooling ' + Math.ceil(cool.hoursLeft) + 'h';
              coolTag.title = 'Added less than 24h ago';
              row.appendChild(coolTag);
            }

            var buyBtn = document.createElement('button');
            buyBtn.textContent = '🛒 Bought';
            buyBtn.style.cssText = 'padding:4px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--green);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            buyBtn.onclick = function() { self.ui._showMarkBoughtConfirm(item, function() { loadAndRender(); }); };
            row.appendChild(buyBtn);

            var delBtn = document.createElement('button');
            delBtn.textContent = '🗑';
            delBtn.style.cssText = 'padding:4px 8px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            var armed = false, armTimer = null;
            delBtn.onclick = function() {
              if (!armed) {
                armed = true;
                delBtn.textContent = 'Confirm?';
                delBtn.style.color = '#CC4A4A';
                armTimer = setTimeout(function() { armed = false; delBtn.textContent = '🗑'; delBtn.style.color = 'var(--muted)'; }, 3000);
                return;
              }
              clearTimeout(armTimer);
              self.logic._deleteItem(item.id, function(err) {
                if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3000); return; }
                loadAndRender();
              });
            };
            row.appendChild(delBtn);

            listBox.appendChild(row);
          });
        });
      };

      var renderBought = function() {
        var bought = items.filter(function(i) { return i.status === 'bought'; });
        boughtToggleBtn.textContent = (showBought ? '▲ Hide' : '▼ Show') + ' bought (' + bought.length + ')';
        boughtBox.style.display = showBought ? 'block' : 'none';
        if (!showBought) return;
        boughtBox.innerHTML = '';
        if (!bought.length) {
          var e = document.createElement('div');
          e.style.cssText = 'font-size:12px;color:var(--muted);';
          e.textContent = 'Nothing bought yet.';
          boughtBox.appendChild(e);
          return;
        }
        bought.slice().sort(function(a, b) { return new Date(b.bought_at || 0) - new Date(a.bought_at || 0); }).forEach(function(item) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted);padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
          var left = document.createElement('span');
          left.textContent = '✓ ' + item.name + (item.category ? ' (' + item.category + ')' : '');
          var right = document.createElement('span');
          right.textContent = (item.bought_price != null ? '£' + Number(item.bought_price).toFixed(2) : '') + (item.bought_at ? ' · ' + new Date(item.bought_at).toLocaleDateString() : '');
          row.appendChild(left); row.appendChild(right);
          boughtBox.appendChild(row);
        });
      };
      boughtToggleBtn.onclick = function() { showBought = !showBought; renderBought(); };

      loadAndRender = function() {
        self.logic._loadConfig(function(c) {
          cfg = c || {};
          self.logic._loadItems(function(rows) {
            items = rows || [];
            renderBudget();
            renderList();
            renderBought();
          });
        });
      };

      addBtn.onclick = function() {
        var name = nameInput.value.trim();
        if (!name) { addErr.textContent = 'Enter a name for the item.'; addErr.style.display = 'block'; return; }
        var priceRaw = priceInput.value.trim();
        var price = priceRaw === '' ? null : parseFloat(priceRaw);
        if (priceRaw !== '' && (isNaN(price) || price < 0)) { addErr.textContent = 'Price must be a positive number, or leave it blank.'; addErr.style.display = 'block'; return; }
        addErr.style.display = 'none';
        var newItem = {
          name: name,
          category: catInput.value.trim() || null,
          priority: priSelect.value || 'medium',
          estimated_price: price,
          want_reason: reasonInput.value.trim() || null,
        };
        addBtn.disabled = true;
        self.logic._addItem(newItem, function(err) {
          addBtn.disabled = false;
          if (err) { addErr.textContent = err; addErr.style.display = 'block'; return; }
          nameInput.value = ''; catInput.value = ''; priceInput.value = ''; priSelect.value = 'medium'; reasonInput.value = '';
          loadAndRender();
        });
      };

      loadAndRender();
    },

    // Real, DISTINCT confirm — asks for the price actually paid (pre-filled
    // with the item's own estimated_price, editable, since the two can
    // genuinely differ) before writing the real chronicles_finance expense
    // row (rule 4: a real button, never assumed from a bare click).
    _showMarkBoughtConfirm: function(item, cb, skipCoolOff) {
      var self = RPGACE.modules.shoppingWishlist;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) { console.warn('[shoppingWishlist] dashDeck._popup unavailable'); return; }
      // G1 money guardrails (Oct 10 2026): an item added under 24h ago gets
      // a cool-off step first. It never blocks - "Buy anyway" goes straight
      // on to the normal price confirm.
      var cool = self.logic._coolOff(item);
      if (!skipCoolOff && cool.active) { self.ui._showCoolOff(item, cool, cb); return; }
      var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };
      var pop = dd._popup({
        eyebrow: '🛒 Mark as bought', title: item.name, accent: 'var(--green)', borderColor: 'rgba(76,175,130,0.4)',
        width: '360px', noDefaultClose: true,
      });
      pop.box.innerHTML =
        (item.want_reason ? '<div style="font-size:12.5px;color:var(--text);margin-bottom:10px;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(255,255,255,0.03);">You wanted this because: ' + esc(item.want_reason) + '</div>' : '') +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">What did you actually pay? This logs a real expense to Chronicles Finance (Personal, or Business if ticked).</div>' +
        '<label style="font-size:11px;color:var(--muted);">Price paid £<input id="wl-bought-price" type="number" min="0" step="0.01" value="' + (item.estimated_price != null ? esc(item.estimated_price) : '') + '" style="width:100%;margin-top:4px;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:Rajdhani,sans-serif;box-sizing:border-box;"></label>' +
        '<label style="display:flex;align-items:center;gap:8px;min-height:44px;font-size:13px;color:var(--text);margin-top:8px;"><input id="wl-bought-business" type="checkbox"> For the business (beats / content) — counts for tax</label>' +
        '<div id="wl-bought-receipt-row" style="display:none;font-size:12px;color:var(--muted);">Receipt photo (optional, kept private): <input id="wl-bought-receipt" type="file" accept="image/*" aria-label="Receipt photo"></div>' +
        '<div id="wl-bought-err" style="color:#CC4A4A;font-size:11px;margin-top:8px;display:none;"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">' +
          '<button id="wl-bought-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(226,226,236,0.2);background:none;color:rgba(226,226,236,0.7);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Cancel</button>' +
          '<button id="wl-bought-confirm" style="padding:8px 16px;border-radius:8px;border:none;background:var(--green);color:#08160f;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Confirm</button>' +
        '</div>';
      pop.box.querySelector('#wl-bought-cancel').onclick = function() { pop.close(); };
      var bizBox = pop.box.querySelector('#wl-bought-business');
      bizBox.onchange = function() { pop.box.querySelector('#wl-bought-receipt-row').style.display = bizBox.checked ? 'block' : 'none'; };
      pop.box.querySelector('#wl-bought-confirm').onclick = function() {
        var raw = pop.box.querySelector('#wl-bought-price').value.trim();
        var price = parseFloat(raw);
        var errEl = pop.box.querySelector('#wl-bought-err');
        if (raw === '' || isNaN(price) || price < 0) { errEl.textContent = 'Enter a valid price.'; errEl.style.display = 'block'; return; }
        var business = bizBox.checked, fileIn = pop.box.querySelector('#wl-bought-receipt'), f = business && fileIn.files && fileIn.files[0];
        var mh = RPGACE.modules.moneyHub, btn = pop.box.querySelector('#wl-bought-confirm');
        btn.disabled = true;
        var receiptP = f && mh ? mh.logic.uploadReceipt(f).then(function(r) { return r.row && r.row.id; }) : Promise.resolve(null);
        receiptP.then(function(receiptId) {
          self.logic._markBought(item, price, function(err, warning) {
            btn.disabled = false;
            if (err) { errEl.textContent = err; errEl.style.display = 'block'; return; }
            pop.close();
            if (warning) RPGACE.utils.toast('⚠️ ' + warning, '#E2A83D', 4000);
            else RPGACE.utils.toast(business ? '✅ Marked bought — logged as a business cost' + (receiptId ? ' with receipt' : '') : '✅ Marked bought — logged to Chronicles', '#4caf82', 2500);
            cb();
          }, { business: business, receiptId: receiptId });
        }, function(e) { btn.disabled = false; errEl.textContent = 'Receipt not saved: ' + (e && e.message || e) + ' — untick or try again.'; errEl.style.display = 'block'; });
      };
    },

    _showCoolOff: function(item, cool, cb) {
      var self = RPGACE.modules.shoppingWishlist;
      var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };
      var h = Math.floor(cool.hoursLeft), m = Math.round((cool.hoursLeft - h) * 60);
      var pop = RPGACE.modules.dashDeck._popup({
        eyebrow: '⏳ Cool-off', title: item.name, accent: 'var(--gold)', width: '380px', noDefaultClose: true,
      });
      pop.box.innerHTML =
        '<div style="font-size:13px;color:var(--text);margin-bottom:10px;">You added this less than a day ago. Cool-off ends in <b>' + h + 'h ' + m + 'm</b>.</div>' +
        (item.want_reason
          ? '<div style="font-size:13px;color:var(--text);margin-bottom:12px;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(255,255,255,0.03);">You said: ' + esc(item.want_reason) + '<br><span style="color:var(--muted);font-size:12px;">Still true?</span></div>'
          : '<div style="font-size:12.5px;color:var(--muted);margin-bottom:12px;">Why do you want it? If the answer is the same tomorrow, it\'ll still be here.</div>') +
        '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">' +
          '<button id="wl-cool-wait" style="min-height:40px;padding:8px 16px;border-radius:8px;border:none;background:var(--gold);color:#1a1405;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Wait</button>' +
          '<button id="wl-cool-buy" style="min-height:40px;padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Buy anyway</button>' +
        '</div>';
      pop.box.querySelector('#wl-cool-wait').onclick = function() { pop.close(); RPGACE.utils.toast('⏳ Parked — check back after the cool-off', 'var(--gold)', 2200); };
      pop.box.querySelector('#wl-cool-buy').onclick = function() { pop.close(); self.ui._showMarkBoughtConfirm(item, cb, true); };
    },

  },

  // Thin top-level pass-throughs — none required: dashDeck's 'wishlist'
  // card calls m.ui._showMain() directly, same accepted direct-module-call
  // pattern the 'cooking' card already uses (rule 8), and this module has
  // no other external caller reaching a bare `RPGACE.modules.
  // shoppingWishlist.X` form.

});
/* ===END:shoppingWishlist=== */
