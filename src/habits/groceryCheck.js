/* ===MODULE:groceryCheck=== */
// GR-1..3 (Nov 5 2026, record records/2026-11/grocery_list_check_interrogation_2026-11-05.txt).
// Alex: "that link is supposed to bring me to the grocery list generated straight
// away, if no new dishes added, same list, if new dishes, generate new one. The
// list should show what needs top up, what I should check is in stock, what is
// absent etc, with each one clickable and me giving the status on each
// ingredient"; answers: Shop now -> list first; one list for all upcoming cooks;
// a tap updates list + stock, "with ask oracle button if I want to find subs or
// amend recipe ... auto amend the recipe. Those changes then manifest in final
// recipe for a dish"; 3 groups by stock.
// GR-1 logic.sync: one open list for every planned cook not yet cooked
// (status draft/scheduled). Its fingerprint (dishes_sig) is the cooks' recipes
// AND their ingredient rows, so a new dish or an amended recipe makes a new
// list; your checks carry over by ingredient. Older open cook lists become
// 'replaced'. Uses cookingOracle.logic._computeIngredientUsage (rule 8).
// GR-2 ui.open: Absent / Needs top up / Check it's there; tap = Got enough /
// Low, top up / Out, buy it (list + stock). Start shop -> shopTrip on this list.
// GR-3 ui.askOracle: one call (prompts/recipe_amend.md) proposes a changed
// recipe; Alex confirms; cookingOracle.logic._updateSavedRecipe saves it, the
// list re-syncs.
RPGACE.register('groceryCheck', {
  domain: 'habits',
  MODEL: 'claude-sonnet-4-6',
  CHECKS: { enough: '✅ Got enough', low: '🔻 Low, top up', out: '❌ Out, buy it' },

  logic: {
    // Upcoming cooks: planned, not yet cooked.
    upcoming: function() {
      return RPGACE.sb.select('planned_cooks', 'select=id,recipe_ids,status,scheduled_at&status=in.(draft,scheduled)&order=created_at.asc&limit=50')
        .then(function(r) { return (r || []).filter(function(c) { return (c.recipe_ids || []).length; }); });
    },
    // Pure: the fingerprint - which recipes, with which ingredient rows.
    sig: function(cooks, riRows) {
      var ids = []; (cooks || []).forEach(function(c) { (c.recipe_ids || []).forEach(function(id) { ids.push(id); }); });
      ids.sort();
      var rows = (riRows || []).map(function(r) { return [r.recipe_id, r.ingredient_id, r.amount, r.unit || ''].join(':'); }).sort();
      var s = ids.join(',') + '|' + rows.join(','), h = 0;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
      return ids.length + 'r' + rows.length + 'i' + (h >>> 0).toString(36);
    },
    recipeIds: function(cooks) {
      var seen = {}, out = [];
      (cooks || []).forEach(function(c) { (c.recipe_ids || []).forEach(function(id) { if (!seen[id]) { seen[id] = 1; out.push(id); } }); });
      return out;
    },
    usage: function(ids) {
      var co = RPGACE.modules.cookingOracle;
      return new Promise(function(resolve, reject) {
        co.logic._computeIngredientUsage(ids, function(err, u) { if (err) reject(new Error(err)); else resolve(u || []); });
      });
    },
    // GR-1: the list for the upcoming cooks - the same one if nothing changed, else a new one.
    sync: function() {
      var self = RPGACE.modules.groceryCheck, L = self.logic;
      return L.upcoming().then(function(cooks) {
        var ids = L.recipeIds(cooks);
        if (!ids.length) return { list: null, cooks: [] };
        return Promise.all([
          RPGACE.sb.select('recipe_ingredients', 'select=recipe_id,ingredient_id,amount,unit&recipe_id=in.(' + ids.join(',') + ')'),
          RPGACE.sb.select('shopping_lists', 'select=id,dishes_sig,created_at&kind=eq.cook&status=eq.open&order=created_at.desc&limit=20')
        ]).then(function(r) {
          var sig = L.sig(cooks, r[0]), open = r[1] || [], same = open.filter(function(x) { return x.dishes_sig === sig; })[0];
          if (same) return { list: same, cooks: cooks, fresh: false };
          return L.build(cooks, ids, sig, open).then(function(list) { return { list: list, cooks: cooks, fresh: true }; });
        });
      });
    },
    build: function(cooks, ids, sig, open) {
      var self = RPGACE.modules.groceryCheck, L = self.logic;
      var prev = (open || []).filter(function(x) { return x.dishes_sig; })[0];
      return Promise.all([L.usage(ids), prev ? RPGACE.sb.select('shopping_list_items', 'select=ingredient_id,check_status,to_buy_amount,in_basket&list_id=eq.' + prev.id) : []]).then(function(r) {
        var usage = r[0].filter(function(u) { return u.status !== 'brown'; }), carry = {};
        (r[1] || []).forEach(function(i) { if (i.check_status || i.in_basket) carry[i.ingredient_id] = i; });
        return RPGACE.sb.secureWrite('shopping_lists', 'insert', { kind: 'cook', status: 'open', shop_mode: 'can_shop', dishes_sig: sig, planned_cook_ids: cooks.map(function(c) { return c.id; }), planned_cook_id: cooks.length === 1 ? cooks[0].id : null })
          .then(function(d) {
            var list = Array.isArray(d) ? d[0] : d;
            if (!list || !list.id) throw new Error('the list was not saved');
            var items = usage.map(function(u) {
              var c = carry[u.ingredient_id] || {};
              var toBuy = c.check_status === 'enough' ? 0 : c.check_status === 'out' ? u.amount : u.toBuy;
              return { list_id: list.id, ingredient_id: u.ingredient_id, needed_amount: u.amount, needed_unit: u.unit, have_amount: u.have, to_buy_amount: toBuy, bought: false, in_basket: !!c.in_basket, check_status: c.check_status || null };
            });
            return (items.length ? RPGACE.sb.secureWrite('shopping_list_items', 'insert', items) : Promise.resolve()).then(function() {
              var old = (open || []).map(function(x) { return x.id; });
              return old.length ? RPGACE.sb.secureWrite('shopping_lists', 'update', { status: 'replaced' }, 'id=in.(' + old.join(',') + ')') : null;
            }).then(function() {
              try { RPGACE.cache.clear('shopping_lists'); RPGACE.cache.clear('shopping_list_items'); } catch (e) {}
              return list;
            });
          });
      });
    },
    items: function(listId) {
      return RPGACE.sb.select('shopping_list_items', 'select=id,ingredient_id,needed_amount,needed_unit,have_amount,to_buy_amount,bought,in_basket,check_status,ingredients(name)&list_id=eq.' + listId + '&order=created_at.asc');
    },
    // Pure: which group an item sits in - Alex's own check first, else what stock says.
    group: function(i) {
      if (i.check_status === 'enough') return 'ok';
      if (i.check_status === 'out') return 'absent';
      if (i.check_status === 'low') return 'topup';
      var have = Number(i.have_amount) || 0, need = Number(i.needed_amount) || 0;
      return have <= 0 ? 'absent' : have < need ? 'topup' : 'check';
    },
    // Tap: list + stock. low = how much Alex says he has.
    setCheck: function(item, check, low) {
      var co = RPGACE.modules.cookingOracle, need = Number(item.needed_amount) || 0, unit = item.needed_unit || null, name = (item.ingredients && item.ingredients.name) || '';
      var patch = { check_status: check }, stock = null;
      if (check === 'enough') { patch.to_buy_amount = 0; if ((Number(item.have_amount) || 0) < need) { patch.have_amount = need; stock = need; } }
      if (check === 'out') { patch.to_buy_amount = need; patch.have_amount = 0; stock = 0; }
      if (check === 'low') { var h = Math.max(0, Number(low) || 0); patch.have_amount = h; patch.to_buy_amount = Math.max(0, Math.round((need - h) * 100) / 100); stock = h; }
      return RPGACE.sb.secureWrite('shopping_list_items', 'update', patch, 'id=eq.' + item.id).then(function() {
        Object.assign(item, patch);
        if (stock === null || !co) return null;
        // Stock: Alex's number becomes the stock, in the place it usually lives.
        return new Promise(function(resolve, reject) {
          co.logic._defaultLocation(item.ingredient_id, name, function(loc) {
            RPGACE.sb.secureWrite('pantry_stock', 'insert', { ingredient_id: item.ingredient_id, location: loc, quantity: stock, unit: unit, updated_at: new Date().toISOString() }, null, 'ingredient_id,location')
              .then(function() { try { RPGACE.cache.clear('pantry_stock'); } catch (e) {} resolve(); }, function(e) { reject(new Error('list saved, stock not: ' + (e.message || e))); });
          });
        });
      }).then(function() { try { RPGACE.cache.clear('shopping_list_items'); } catch (e) {} return item; });
    },
    // GR-3: the recipes on this list that use an ingredient.
    recipesWith: function(cooks, ingredientId) {
      var ids = RPGACE.modules.groceryCheck.logic.recipeIds(cooks);
      if (!ids.length) return Promise.resolve([]);
      return RPGACE.sb.select('recipe_ingredients', 'select=recipe_id&ingredient_id=eq.' + ingredientId + '&recipe_id=in.(' + ids.join(',') + ')').then(function(rows) {
        var rid = (rows || []).map(function(r) { return r.recipe_id; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
        return rid.length ? RPGACE.sb.select('recipes', 'select=id,title&id=in.(' + rid.join(',') + ')') : [];
      });
    },
    recipe: function(id) {
      return Promise.all([
        RPGACE.sb.select('recipes', 'select=id,title,steps,source&id=eq.' + id + '&limit=1'),
        RPGACE.sb.select('recipe_ingredients', 'select=amount,unit,grams_estimate,is_separable,ingredients(name)&recipe_id=eq.' + id)
      ]).then(function(r) {
        var rec = (r[0] || [])[0]; if (!rec) throw new Error('recipe not found');
        rec.ingredients = (r[1] || []).map(function(x) { return { name: (x.ingredients && x.ingredients.name) || '', amount: x.amount, unit: x.unit, grams_estimate: x.grams_estimate, is_separable: x.is_separable }; });
        return rec;
      });
    },
    stockNames: function() {
      return RPGACE.sb.select('pantry_stock', 'select=quantity,ingredients(name)&quantity=gt.0&limit=300').then(function(r) {
        var seen = {}; return (r || []).map(function(x) { return x.ingredients && x.ingredients.name; }).filter(function(n) { if (!n || seen[n]) return false; seen[n] = 1; return true; });
      }).catch(function() { return []; });
    },
    // Pure: a model reply -> the amended recipe (old step objects kept, only named descriptions replaced).
    applyAmend: function(rec, o) {
      if (!o) return null;
      var hasIngs = Array.isArray(o.ingredients) && o.ingredients.length, rawEdits = Array.isArray(o.step_edits) ? o.step_edits : [];
      if (!hasIngs && !rawEdits.length) return null;
      var old = {}; (rec.ingredients || []).forEach(function(i) { old[String(i.name).toLowerCase()] = i; });
      // Step-only change (Nov 5, Alex's horchata toast step): the ingredients stay as they are.
      var ings = !hasIngs ? (rec.ingredients || []).slice() : o.ingredients.slice(0, 60).map(function(i) {
        var name = String(i.name || '').trim().slice(0, 80); if (!name) return null;
        var was = old[name.toLowerCase()] || {}, amt = Number(i.amount);
        return { name: name, amount: isNaN(amt) ? (was.amount || 0) : amt, unit: String(i.unit || was.unit || '').slice(0, 12) || null,
          grams_estimate: was.amount === amt ? was.grams_estimate : null, is_separable: !!was.is_separable };
      }).filter(Boolean);
      if (!ings.length) return null;
      var edits = {}, adds = [];
      rawEdits.forEach(function(e) {
        var n = parseInt(e.order, 10), d = String(e.description || '').slice(0, 600); if (!n || !d) return;
        // YR: a video check also sends the moment in the video and the creator's tip for the step.
        var extra = {}, va = parseInt(e.video_at, 10); if (va >= 0) extra.video_at = va; if (typeof e.tip === 'string' && e.tip.trim()) extra.tip = e.tip.trim().slice(0, 200);
        if (e.new === true) adds.push({ at: n, description: d, extra: extra }); else edits[n] = { d: d, extra: extra };
      });
      var steps = (rec.steps || []).map(function(s, idx) {
        var n = (s && s.order) || idx + 1;
        if (!edits[n]) return s;
        return typeof s === 'string' ? edits[n].d : Object.assign({}, s, edits[n].extra, { description: edits[n].d });
      });
      // A new step goes in at its position (later ones move down), shaped like its neighbour.
      adds.sort(function(x, y) { return y.at - x.at; }).forEach(function(a) {
        var i = Math.max(0, Math.min(steps.length, a.at - 1)), near = steps[i] || steps[i - 1] || {};
        steps.splice(i, 0, typeof near === 'string' ? a.description : Object.assign({ type: near.type || 'prep_before_cooking', description: a.description }, a.extra));
      });
      if (adds.length) steps = steps.map(function(s, i) { return typeof s === 'string' ? s : Object.assign({}, s, { order: i + 1 }); });
      var changes = (Array.isArray(o.changes) ? o.changes : []).map(function(c) { return String(c).slice(0, 160); }).filter(Boolean).slice(0, 5);
      return { title: rec.title, ingredients: ings, steps: steps, changes: changes, added: adds.length };
    },
    // One message of the recipe chat. ctx.item = the grocery item it started from (optional);
    // chat = [{who:'Alex'|'Oracle', text}]. -> { reply, amended (null when nothing to change) }.
    amend: function(rec, ctx, chat) {
      var self = RPGACE.modules.groceryCheck, L = self.logic, item = ctx && ctx.item;
      return L.stockNames().then(function(stock) {
        var prompt = RPGACE.prompt('recipe_amend', {
          title: rec.title,
          ingredients: rec.ingredients.map(function(i) { return i.name + ' | ' + (i.amount == null ? '' : i.amount) + ' | ' + (i.unit || ''); }).join('\n'),
          steps: (rec.steps || []).map(function(s, i) { return ((s && s.order) || i + 1) + ': ' + String((s && s.description) || s || '').slice(0, 200); }).join('\n'),
          focus: item ? 'The ingredient he is looking at: ' + ((item.ingredients && item.ingredients.name) || 'an ingredient') + ' - ' + ({ absent: 'not in stock', topup: 'not enough in stock', check: 'stock says there is enough', ok: 'he has enough' })[L.group(item)] + '.' : 'He is planning this cook and has not started yet.',
          stock: stock.slice(0, 120).join(', ') || 'nothing recorded',
          chat: (chat || []).slice(-8).map(function(m) { return m.who + ': ' + String(m.text).slice(0, 500); }).join('\n')
        });
        return RPGACE.kit.ask(RPGACE.prompt('oracle_mind') + '\n\n' + prompt, { json: true, max: 1000, model: self.MODEL }); // OM
      }).then(function(o) {
        var reply = o && typeof o.reply === 'string' ? o.reply.slice(0, 800) : '';
        var amended = L.applyAmend(rec, o);
        if (!reply && !amended) throw new Error('Oracle\'s reply could not be used - try asking another way');
        return { reply: reply, amended: amended };
      });
    },
    saveRecipe: function(id, amended) {
      var co = RPGACE.modules.cookingOracle;
      return new Promise(function(resolve, reject) {
        co.logic._updateSavedRecipe(id, amended, function(err) { if (err) reject(new Error(err)); else { try { RPGACE.cache.clear('recipe_ingredients'); RPGACE.cache.clear('recipes'); } catch (e) {} resolve(); } });
      });
    }
  },

  ui: {
    _css: function() {
      if (document.getElementById('gr-css')) return;
      var s = document.createElement('style'); s.id = 'gr-css';
      s.textContent = '.gr-h{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}' +
        '.gr-row{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:8px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:15px;text-align:left;cursor:pointer}' +
        '.gr-row .gr-s{margin-left:auto;font-size:12px;color:var(--muted);white-space:nowrap}.gr-row.gr-done{opacity:.55}' +
        '.gr-note{font-size:13px;color:var(--muted);line-height:1.4}.gr-in{width:100%;box-sizing:border-box;min-height:44px;font-size:16px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit}' +
        '.gr-btns{display:flex;flex-direction:column;gap:6px;margin-top:8px}';
      document.head.appendChild(s);
    },
    _div: function(cls, text) { var d = document.createElement('div'); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; },
    _fail: function(what, e) { RPGACE.utils.toast('⚠️ ' + what + ': ' + ((e && e.message) || e), '#CC4A4A', 4500, 'groceryCheck'); },
    _amt: function(n, u) { if (n == null || n === '') return ''; var x = Math.round(Number(n) * 100) / 100; return x + (u ? ' ' + u : ''); },

    // GR-2: the list, straight away.
    open: function() {
      var self = RPGACE.modules.groceryCheck, U = self.ui;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🛒 Grocery list', title: 'Checking your upcoming cooks…', width: '520px', scroll: true });
      pop.box.id = 'gr-pop';
      var tEl = [].slice.call(pop.box.children).filter(function(c) { return c.textContent === 'Checking your upcoming cooks…'; })[0];
      if (tEl) tEl.className = 'gr-title';
      var host = U._div(''); host.id = 'gr-body'; host.textContent = 'Working out what you need…'; pop.box.appendChild(host);
      self.logic.sync().then(function(res) {
        self._res = res;
        if (!res.list) {
          var t = pop.box.querySelector('.gr-title'); if (t) t.textContent = 'No upcoming cooks';
          host.innerHTML = ''; host.appendChild(U._div('gr-note', 'Plan a cook first - the list is built from every cook you haven\'t made yet.'));
          var b = RPGACE.kit.btn('🍳 Plan a cook', 'primary'); b.style.marginTop = '8px'; b.onclick = function() { pop.close(); RPGACE.modules.cookingOracle.ui.openMain(); }; host.appendChild(b);
          return;
        }
        var title = pop.box.querySelector('.gr-title'); if (title) title.textContent = res.cooks.length + ' upcoming cook' + (res.cooks.length === 1 ? '' : 's');
        U.draw(host, pop, res);
      }, function(e) { host.textContent = '⚠️ Could not build your list: ' + (e.message || e); });
      return pop;
    },
    draw: function(host, pop, res) {
      var self = RPGACE.modules.groceryCheck, L = self.logic, U = self.ui;
      host.textContent = 'Loading…';
      L.items(res.list.id).then(function(items) {
        host.innerHTML = '';
        host.appendChild(U._div('gr-note', (res.fresh ? '🆕 New list - your cooks changed. ' : 'Same list as before - no new dishes. ') + 'Tap each ingredient to say how much you have.'));
        var groups = { absent: [], topup: [], check: [], ok: [] };
        (items || []).filter(function(i) { return !i.bought; }).forEach(function(i) { groups[L.group(i)].push(i); });
        [['absent', '❌ Absent - stock says none'], ['topup', '🔻 Needs top up - some, not enough'], ['check', '👀 Check it\'s there - stock says enough'], ['ok', '✅ Checked - got enough']].forEach(function(g) {
          if (!groups[g[0]].length) return;
          var h = U._div('gr-h', g[1] + ' (' + groups[g[0]].length + ')'); h.dataset.group = g[0]; host.appendChild(h);
          groups[g[0]].forEach(function(i) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'gr-row' + (g[0] === 'ok' ? ' gr-done' : ''); b.dataset.id = i.id; b.dataset.group = g[0];
            b.textContent = (i.ingredients && i.ingredients.name) || '?';
            var s = document.createElement('span'); s.className = 'gr-s';
            s.textContent = 'need ' + U._amt(i.needed_amount, i.needed_unit) + (Number(i.have_amount) > 0 ? ' · have ' + U._amt(i.have_amount, i.needed_unit) : '') + (Number(i.to_buy_amount) > 0 ? ' · buy ' + U._amt(i.to_buy_amount, i.needed_unit) : '');
            b.appendChild(s);
            b.onclick = function() { U.tap(i, res, function() { U.draw(host, pop, res); }); };
            host.appendChild(b);
          });
        });
        if (!(items || []).length) host.appendChild(U._div('gr-note', 'These cooks need nothing.'));
        var toBuy = (items || []).filter(function(i) { return !i.bought && Number(i.to_buy_amount) > 0; }).length;
        var go = RPGACE.kit.btn('🛒 Start shop (' + toBuy + ' to buy)', 'primary'); go.id = 'gr-start'; go.style.cssText += 'width:100%;margin-top:12px;';
        go.onclick = function() {
          pop.close();
          var rt = RPGACE.modules.realmTasks; if (rt) rt.ui.openLive({ mode: 'shop', realm: 'chef' });
        };
        host.appendChild(go);
      }, function(e) { host.textContent = '⚠️ Could not load the list: ' + (e.message || e); });
    },
    // Tap an ingredient: your status, or ask Oracle.
    tap: function(item, res, after) {
      var self = RPGACE.modules.groceryCheck, L = self.logic, U = self.ui, name = (item.ingredients && item.ingredients.name) || 'this';
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🛒 ' + name, title: 'How much do you have?', width: '420px' });
      pop.box.id = 'gr-tap';
      pop.box.appendChild(U._div('gr-note', 'Needed: ' + U._amt(item.needed_amount, item.needed_unit) + ' · stock says ' + U._amt(item.have_amount || 0, item.needed_unit)));
      var btns = U._div('gr-btns'); pop.box.appendChild(btns);
      var low = document.createElement('input'); low.type = 'number'; low.inputMode = 'decimal'; low.min = '0'; low.className = 'gr-in'; low.id = 'gr-low'; low.placeholder = 'How much you have (' + (item.needed_unit || 'amount') + ')'; low.hidden = true;
      var set = function(check, b) {
        if (check === 'low' && low.hidden) { low.hidden = false; low.focus(); b.textContent = '🔻 Save top up'; return; }
        if (check === 'low' && low.value === '') { RPGACE.utils.toast('Type how much you have', '#E2A83D', 2200); low.focus(); return; }
        b.disabled = true;
        L.setCheck(item, check, low.value).then(function() { pop.close(); after(); }, function(e) { b.disabled = false; U._fail('Not saved', e); after(); });
      };
      Object.keys(self.CHECKS).forEach(function(k) {
        var b = RPGACE.kit.btn(self.CHECKS[k], k === 'enough' ? 'primary' : ''); b.className = 'gr-check'; b.dataset.check = k; b.style.width = '100%';
        b.onclick = function() { set(k, b); }; btns.appendChild(b);
        if (k === 'low') btns.appendChild(low);
      });
      var ask = RPGACE.kit.btn('🔮 Ask Oracle: swap, add, remove or change the recipe', ''); ask.id = 'gr-ask'; ask.style.cssText += 'width:100%;margin-top:10px;';
      ask.onclick = function() { pop.close(); U.askOracle(item, res, after); };
      pop.box.appendChild(ask);
    },
    // The one "what changes" box + Save (recipe chat and the YouTube check share it, rule 8).
    _proposal: function(log, state, amended, opts, pop) {
      var self = RPGACE.modules.groceryCheck, L = self.logic, U = self.ui;
      log.querySelectorAll('.gr-proposal').forEach(function(x) { x.remove(); });
          var box = U._div('gr-proposal'); box.id = 'gr-proposal'; box.style.cssText = 'border:1px solid var(--gold);border-radius:10px;padding:10px;';
          box.appendChild(U._div('gr-h', 'What changes in ' + state.rec.title));
          amended.changes.forEach(function(c) { box.appendChild(U._div('', '• ' + c)); });
          var before = {}; state.rec.ingredients.forEach(function(i) { before[i.name.toLowerCase()] = i; });
          var diff = amended.ingredients.filter(function(i) { var b = before[i.name.toLowerCase()]; return !b || b.amount !== i.amount || (b.unit || '') !== (i.unit || ''); }).map(function(i) { return '+ ' + i.name + ' ' + U._amt(i.amount, i.unit); });
          var now = {}; amended.ingredients.forEach(function(i) { now[i.name.toLowerCase()] = 1; });
          state.rec.ingredients.forEach(function(i) { if (!now[i.name.toLowerCase()]) diff.push('− ' + i.name); });
          if (diff.length) box.appendChild(U._div('gr-note', diff.join(' · ')));
          box.appendChild(U._div('gr-note', 'Not right? Keep talking below. Nothing changes until you save.'));
          var save = RPGACE.kit.btn('✅ Save to the recipe', 'primary'); save.id = 'gr-amend-save'; save.style.cssText += 'width:100%;margin-top:8px;';
          save.onclick = function() {
            save.disabled = true; save.textContent = 'Saving…';
            L.saveRecipe(state.rid, amended).then(function() { return opts.after ? opts.after(state.rid) : null; }).then(function() {
              pop.close(); RPGACE.utils.toast('🍳 ' + state.rec.title + ' updated', '#3DAA6E', 3000);
            }, function(e) { save.disabled = false; save.textContent = '✅ Save to the recipe'; U._fail('Recipe not saved', e); });
          };
          box.appendChild(save); log.appendChild(box);
      return box;
    },
    // GR-3: from the grocery list - the chat on the recipes that use this ingredient.
    askOracle: function(item, res, after) {
      var self = RPGACE.modules.groceryCheck, L = self.logic, U = self.ui;
      L.recipesWith(res.cooks, item.ingredient_id).then(function(recipes) {
        U.recipeChat(recipes, { item: item, after: function() { return L.sync().then(function(r2) { Object.assign(res, r2); after(); }); } });
      }, function(e) { U._fail('Could not find the recipes', e); });
    },
    // The recipe chat (grocery list + cook planning, Alex Nov 5: "I don't have poblano chillis, I'll be using
    // sivri ... oracle tell me what will change in the recipe and me accepting or talking it through further").
    // recipes = [{id,title}]; opts.item (grocery item), opts.after (after a save), opts.title.
    recipeChat: function(recipes, opts) {
      var self = RPGACE.modules.groceryCheck, L = self.logic, U = self.ui; opts = opts || {};
      U._css();
      var name = opts.item && opts.item.ingredients && opts.item.ingredients.name;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🔮 ' + (name || 'Ask Oracle'), title: opts.title || 'Talk the recipe through', width: '500px', scroll: true });
      pop.box.id = 'gr-oracle';
      var host = U._div(''); pop.box.appendChild(host);
      if (!recipes || !recipes.length) { host.appendChild(U._div('gr-note', 'No recipe to talk about.')); return pop; }
      var pick = document.createElement('select'); pick.className = 'gr-in'; pick.id = 'gr-recipe';
      recipes.forEach(function(r) { var o = document.createElement('option'); o.value = r.id; o.textContent = r.title || 'Recipe'; pick.appendChild(o); });
      if (recipes.length > 1) { host.appendChild(U._div('gr-note', 'Which recipe?')); host.appendChild(pick); }
      var log = U._div(''); log.id = 'gr-chat'; log.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:10px 0;'; host.appendChild(log);
      var ta = document.createElement('textarea'); ta.className = 'gr-in'; ta.id = 'gr-ask-text'; ta.rows = 2;
      ta.placeholder = name ? 'e.g. swap it for something I have · leave it out · I only have half' : 'e.g. I don\'t have poblano chillies, I\'ll use sivri';
      host.appendChild(ta);
      var go = RPGACE.kit.btn('🔮 Ask', 'primary'); go.id = 'gr-ask-go'; go.style.cssText += 'width:100%;margin-top:8px;';
      RPGACE.kit.needs(go, ta, 'Say what you want to change or ask');
      host.appendChild(go);
      var state = { rid: pick.value, chat: [], rec: null };
      // YR (Nov 5 2026, Alex: "these things need to be backed with youtube"): check this recipe against its video.
      var vr = RPGACE.modules.videoRecipe;
      if (vr) {
        var vbtn = RPGACE.kit.btn('📺 Check against the YouTube video', ''); vbtn.id = 'gr-video-check'; vbtn.style.cssText += 'width:100%;margin-top:6px;';
        vbtn.onclick = function() {
          vbtn.disabled = true; vbtn.textContent = 'Finding the video…';
          (state.rec ? Promise.resolve(state.rec) : L.recipe(state.rid)).then(function(rec) {
            state.rec = rec;
            return vr.ui.videoFor(rec).then(function(video) {
              if (!video) return null;
              vbtn.textContent = '📺 Gemini is watching the video…';
              return vr.logic.compare(rec, video).then(function(x) {
                if (x.reply) { state.chat.push({ who: 'Oracle', text: x.reply }); bubble('Oracle', '📺 ' + x.reply + ' (' + video.title + ')'); }
                if (x.amended) U._proposal(log, state, x.amended, opts, pop);
              });
            });
          }).catch(function(e) { U._fail('Video check failed', e); }).then(function() { vbtn.disabled = false; vbtn.textContent = '📺 Check against the YouTube video'; });
        };
        host.appendChild(vbtn);
      }
      pick.onchange = function() { state.rid = pick.value; state.chat = []; state.rec = null; log.innerHTML = ''; };
      var bubble = function(who, text) {
        var d = U._div('', text); d.className = 'gr-msg gr-' + (who === 'Alex' ? 'me' : 'or');
        d.style.cssText = 'padding:8px 12px;border-radius:10px;font-size:14px;line-height:1.45;white-space:pre-wrap;' + (who === 'Alex' ? 'align-self:flex-end;background:color-mix(in srgb,var(--gold) 15%,var(--bg));' : 'background:var(--panel);border:1px solid var(--border);');
        log.appendChild(d); return d;
      };
      go.onclick = function() {
        var text = ta.value.trim(); if (!text) return;
        go.disabled = true; go.textContent = 'Oracle is thinking…';
        state.chat.push({ who: 'Alex', text: text }); bubble('Alex', text); ta.value = '';
        log.querySelectorAll('.gr-proposal').forEach(function(x) { x.remove(); });
        (state.rec ? Promise.resolve(state.rec) : L.recipe(state.rid)).then(function(rec) { state.rec = rec; return L.amend(rec, { item: opts.item }, state.chat); }).then(function(x) {
          go.disabled = false; go.textContent = '🔮 Ask';
          if (x.reply) { state.chat.push({ who: 'Oracle', text: x.reply }); bubble('Oracle', x.reply); }
          if (x.amended) U._proposal(log, state, x.amended, opts, pop);
        }, function(e) { go.disabled = false; go.textContent = '🔮 Ask'; state.chat.pop(); U._fail('Oracle could not help', e); });
      };
      setTimeout(function() { try { ta.focus(); } catch (e) {} }, 50);
      return pop;
    }
  }
});
/* ===END:groceryCheck=== */
