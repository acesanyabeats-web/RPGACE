/* ===MODULE:shopTrip=== */
// ST-1..5 (Nov 5 2026, plan "Realm Pages + Evening Questionnaire", record
// records/2026-11/shop_trip_receipts_labels_paranoia_2026-11-05.txt). Alex:
// "Should have current grocery list along with options to add wishlist so I do
// different shops in one trip"; "a field asking what shop I'm at right now ...
// quick switches, then receipt to back up, drive oracle costs down by
// accumulating them"; "At the end of shop when I'm home, ask me if I'm done,
// then ask for receipt, then as I put everything away, if a new item without 2
// pics is detected, ask me to take the 2 photos. Shopping is fully done once
// everything is logged"; "Criteria for known ... both photos, the shop bought,
// the brand and label at back. Doesn't matter if different size, if different
// shop, only log price per gram".
// One trip = one shop_trips row: shopping -> home (receipts) -> putaway ->
// reading -> done. Reuses (rule 8): the newest grocery list's in_basket ticks
// (cookingOracle), screenshotInbox.logic.upload (private photos: receipt /
// product), cookingOracle.logic._addStock / _defaultLocation / _finishShopping,
// shoppingWishlist.logic._markBought, ingredient_prices, myDay.logic.cutSaveItem
// (a goal = a cut-back tracker). ONE batched Oracle read per trip
// (RPGACE.utils.oracleVision with several pictures, prompts/shop_read.md);
// nothing is read live. Label questions in the shop go through Oracle chat's
// own 📸 (ST-5: a context line when a trip is open).
RPGACE.register('shopTrip', {
  domain: 'habits',
  SHOPS: ['Tesco', 'Aldi', 'Lidl', 'Asda', 'Sainsbury\'s', 'Morrisons', 'Co-op', 'Iceland', 'M&S'],
  PER_CALL: 4,
  // UK front-of-pack thresholds per 100g (FSA): [green at or below, red above].
  TRAFFIC: { fat: [3, 17.5], sat: [1.5, 5], sugar: [5, 22.5], salt: [0.3, 1.5] },
  HOME_AFTER_MIN: 30,
  STEPS: ['shopping', 'home', 'putaway', 'reading'], // open trip steps; 'done' ends it

  init: function() {
    var self = RPGACE.modules.shopTrip;
    setTimeout(function() { self.ui.checkHome(); }, 6000);
    document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') self.ui.checkHome(); });
    var oc = RPGACE.modules.oracleControl;
    if (oc && oc.registerContextProvider) oc.registerContextProvider('shopTrip', function() {
      var t = self._trip; if (!t || t.status !== 'shopping') return null;
      return 'Alex is out shopping at ' + (t.current_shop || 'a shop') + '. If he sends a food label, say plainly: additives, preservatives, sweeteners or trans fats it has, its UK traffic lights per 100g, and whether it fits his health goals. Short answer.';
    });
  },

  logic: {
    rd: function(t, p) { return RPGACE.kit.readPrivate(t, p); },
    now: function() { return new Date().toISOString(); },
    // The trip still open (not done), newest first.
    open: function() {
      var self = RPGACE.modules.shopTrip;
      return self.logic.rd('shop_trips', 'select=*&status=neq.done&order=created_at.desc&limit=1')
        .then(function(r) { self._trip = r[0] || null; return self._trip; });
    },
    patch: function(trip, p) {
      var self = RPGACE.modules.shopTrip;
      p.updated_at = self.logic.now();
      return RPGACE.sb.secureWrite('shop_trips', 'update', p, 'id=eq.' + trip.id).then(function() {
        Object.assign(trip, p); self._trip = trip.status === 'done' ? null : trip; return trip;
      });
    },
    // Same "newest list" as Steward's count (realmFrame COUNT.shopping_open): the list of the newest item.
    newestListId: function() {
      return RPGACE.sb.select('shopping_list_items', 'select=list_id&order=created_at.desc&limit=1')
        .then(function(r) { return (r && r[0] && r[0].list_id) || null; });
    },
    start: function(shop) {
      var self = RPGACE.modules.shopTrip;
      shop = String(shop || '').trim().slice(0, 40);
      if (!shop) return Promise.reject(new Error('Say which shop first'));
      // GR: the list the grocery check just built (all upcoming cooks), else the newest list.
      var gc = RPGACE.modules.groceryCheck, known = gc && gc._res && gc._res.list && gc._res.list.id;
      return (known ? Promise.resolve(known) : self.logic.newestListId()).then(function(listId) {
        return RPGACE.sb.secureWrite('shop_trips', 'insert', { status: 'shopping', current_shop: shop, shops: [shop], list_id: listId, wish_ids: [], wish_basket: [], receipts: [], putaway: {} });
      }).then(function(d) {
        var row = Array.isArray(d) ? d[0] : d;
        if (!row || !row.id) throw new Error('the trip was not saved');
        self._trip = row; return row;
      });
    },
    setShop: function(trip, shop) {
      var self = RPGACE.modules.shopTrip, shops = (trip.shops || []).slice();
      if (shops.indexOf(shop) === -1) shops.push(shop);
      return self.logic.patch(trip, { current_shop: shop, shops: shops });
    },
    // The grocery list's items + the wanted wishlist.
    load: function(trip) {
      var safe = function(p) { return Promise.resolve(p).catch(function() { return []; }); };
      return Promise.all([
        trip.list_id ? RPGACE.sb.select('shopping_list_items', 'select=id,ingredient_id,to_buy_amount,needed_unit,in_basket,bought,ingredients(name)&list_id=eq.' + trip.list_id + '&order=created_at.asc') : [],
        safe(RPGACE.sb.select('wishlist_items', 'select=id,name,estimated_price,priority,category,status&status=eq.wanted&order=created_at.desc'))
      ]).then(function(r) { return { list: r[0] || [], wish: r[1] || [] }; });
    },
    name: function(i) { return (i.ingredients && i.ingredients.name) || i.name || 'item'; },
    toFind: function(list) { return (list || []).filter(function(i) { return !i.bought && (i.to_buy_amount || 0) > 0; }); },
    // Tick a grocery item into (or out of) the basket, remembering the shop it came from.
    tick: function(trip, item, on) {
      var self = RPGACE.modules.shopTrip, pa = Object.assign({}, trip.putaway || {}), k = 'l:' + item.id;
      if (on) pa[k] = Object.assign({}, pa[k] || {}, { shop: trip.current_shop }); else delete pa[k];
      return RPGACE.sb.secureWrite('shopping_list_items', 'update', { in_basket: !!on }, 'id=eq.' + item.id).then(function() {
        item.in_basket = !!on; try { RPGACE.cache.clear('shopping_list_items'); } catch (e) {}
        return self.logic.patch(trip, { putaway: pa });
      });
    },
    tickWish: function(trip, w, on) {
      var self = RPGACE.modules.shopTrip, pa = Object.assign({}, trip.putaway || {}), k = 'w:' + w.id;
      var b = (trip.wish_basket || []).filter(function(x) { return x !== w.id; });
      if (on) { b.push(w.id); pa[k] = { shop: trip.current_shop }; } else delete pa[k];
      return self.logic.patch(trip, { wish_basket: b, putaway: pa });
    },
    pickWish: function(trip, ids) {
      var basket = (trip.wish_basket || []).filter(function(x) { return ids.indexOf(x) > -1; });
      return RPGACE.modules.shopTrip.logic.patch(trip, { wish_ids: ids, wish_basket: basket });
    },
    // Pure: £ left this week + the wishlist picks' cost.
    budgetLine: function(limit, spent, wishPicked) {
      var f = function(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); };
      var w = (wishPicked || []).reduce(function(a, x) { return a + (Number(x.estimated_price) || 0); }, 0), parts = [];
      if (limit != null && limit > 0) parts.push(f(Math.max(0, limit - (spent || 0))) + ' left this week (limit ' + f(limit) + ', spent ' + f(spent || 0) + ')');
      else if (spent != null) parts.push(f(spent) + ' spent this week (no weekly limit set)');
      if (w > 0) parts.push('wishlist picks about ' + f(w));
      return parts.join(' · ');
    },
    budget: function() {
      var RF = RPGACE.modules.realmFrame;
      if (!RF) return Promise.resolve({ limit: null, spent: null });
      return Promise.all([RF.logic.settings().catch(function() { return {}; }), RF.logic.count('spend_week', RF.logic.periodStart('week'))])
        .then(function(r) { var l = r[0] && r[0].weekly_spend_limit; return { limit: l == null || l === '' ? null : Number(l), spent: r[1] }; });
    },
    // Pure: what's in the basket, each with a short key for the read (L1.., W1..).
    basket: function(trip, data) {
      var pa = trip.putaway || {}, out = [], li = 0, wi = 0, self = RPGACE.modules.shopTrip;
      (data.list || []).forEach(function(i) { if (i.in_basket && !i.bought) out.push({ key: 'L' + (++li), ref: 'l:' + i.id, kind: 'list', name: self.logic.name(i), row: i, shop: (pa['l:' + i.id] || {}).shop || trip.current_shop }); });
      (data.wish || []).forEach(function(w) { if ((trip.wish_basket || []).indexOf(w.id) > -1) out.push({ key: 'W' + (++wi), ref: 'w:' + w.id, kind: 'wish', name: w.name, row: w, shop: (pa['w:' + w.id] || {}).shop || trip.current_shop }); });
      return out;
    },
    // Pure: known = both photos + shop + brand (any size, any shop).
    isKnown: function(p) { return !!(p && p.front_photo_id && p.back_photo_id && p.brand && p.shop); },
    knownFor: function(products, ingredientId) {
      var self = RPGACE.modules.shopTrip;
      return (products || []).filter(function(p) { return p.ingredient_id === ingredientId && self.logic.isKnown(p); })[0] || null;
    },
    products: function(ids) {
      ids = (ids || []).filter(Boolean);
      if (!ids.length) return Promise.resolve([]);
      return RPGACE.modules.shopTrip.logic.rd('products', 'select=*&ingredient_id=in.(' + ids.join(',') + ')&order=updated_at.desc');
    },
    photo: function(file, source) {
      var si = RPGACE.modules.screenshotInbox;
      if (!si) return Promise.reject(new Error('Photo store is not loaded'));
      return si.logic.upload(file, source, source === 'receipt' ? ['steward', 'chef'] : ['chef']).then(function(r) {
        if (!r.row || !r.row.id) throw new Error('the photo was not saved'); return r.row.id;
      });
    },
    addProduct: function(f) {
      var row = { name: f.name, brand: String(f.brand || '').trim().slice(0, 60), shop: f.shop, ingredient_id: f.ingredient_id || null, front_photo_id: f.front, back_photo_id: f.back };
      return RPGACE.sb.secureWrite('products', 'insert', row).then(function(d) {
        var r = Array.isArray(d) ? d[0] : d; if (!r || !r.id) throw new Error('the product was not saved'); return r;
      });
    },
    // Pure: the pictures for the read, in order, and the batches of PER_CALL.
    pictures: function(trip, newProducts) {
      var out = [];
      (trip.receipts || []).forEach(function(r) { out.push({ kind: 'receipt', id: r.id, label: 'receipt' + (r.shop ? ' from ' + r.shop : '') }); });
      (newProducts || []).forEach(function(p, i) {
        out.push({ kind: 'label', id: p.back_photo_id, p: 'P' + (i + 1), product: p, label: 'back label of P' + (i + 1) + ' ' + (p.brand ? p.brand + ' ' : '') + p.name });
      });
      return out;
    },
    chunk: function(list, n) { var out = []; for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; },
    image: function(pic) {
      var si = RPGACE.modules.screenshotInbox, q = { id: pic.id, limit: 1 };
      q[pic.kind === 'receipt' ? 'receipt' : 'product'] = true;
      return si.logic.api('list', q).then(function(rows) {
        var u = rows && rows[0] && rows[0].url; if (!u) throw new Error('a photo could not be found');
        return fetch(u);
      }).then(function(r) { if (!r.ok) throw new Error('a photo could not be loaded'); return r.blob(); })
        .then(function(b) { return RPGACE.utils.resizeImage(b, 1280, 0.8); });
    },
    num: function(v) { var n = Number(String(v == null ? '' : v).replace(/[£,\s]/g, '')); return v === null || v === '' || isNaN(n) ? null : n; },
    // Pure, fence-tolerant: the reply of one batch, image numbers mapped back to the batch's pictures.
    parse: function(raw, pics) {
      var L = RPGACE.modules.shopTrip.logic, t = String(raw || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      var o; try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
      var pic = function(n) { return pics[(parseInt(n, 10) || 0) - 1] || null; };
      var strs = function(x) { return (Array.isArray(x) ? x : []).map(function(s) { return String(s).slice(0, 60); }).filter(Boolean).slice(0, 12); };
      var unit = function(u) { u = String(u || '').toLowerCase(); return ['g', 'kg', 'ml', 'l', 'each'].indexOf(u) > -1 ? u : null; };
      var receipts = (Array.isArray(o.receipts) ? o.receipts : []).map(function(r) {
        var p = pic(r.img); if (!p || p.kind !== 'receipt') return null;
        return { id: p.id, shop: String(r.shop || '').slice(0, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')) ? r.date : null, total: L.num(r.total),
          lines: (Array.isArray(r.lines) ? r.lines : []).slice(0, 80).map(function(x) {
            return { k: String(x.k || '').slice(0, 5), name: String(x.name || '').slice(0, 60), price: L.num(x.price), size: L.num(x.size), unit: unit(x.unit) };
          }) };
      }).filter(Boolean);
      var labels = (Array.isArray(o.labels) ? o.labels : []).map(function(l) {
        var p = pic(l.img); if (!p || p.kind !== 'label') return null;
        var per = l.per100 || {}, per100 = {};
        ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fibre'].forEach(function(k) { per100[k] = L.num(per[k]); });
        return { product_id: p.product.id, size: L.num(l.size), unit: unit(l.unit), per100: per100, ingredients: String(l.ingredients || '').slice(0, 400),
          additives: strs(l.additives), preservatives: strs(l.preservatives), sweeteners: strs(l.sweeteners), trans_fat: l.trans_fat === true };
      }).filter(Boolean);
      return { receipts: receipts, labels: labels };
    },
    // Pure: UK traffic lights per 100g.
    traffic: function(per100) {
      var T = RPGACE.modules.shopTrip.TRAFFIC, out = {};
      Object.keys(T).forEach(function(k) { var v = per100 && per100[k]; out[k] = v == null ? null : v <= T[k][0] ? 'green' : v > T[k][1] ? 'red' : 'amber'; });
      return out;
    },
    // Pure: good / sometimes / avoid, with the reasons in plain words.
    verdict: function(label) {
      var L = RPGACE.modules.shopTrip.logic, tl = L.traffic(label.per100), reds = Object.keys(tl).filter(function(k) { return tl[k] === 'red'; });
      var names = { fat: 'fat', sat: 'saturated fat', sugar: 'sugar', salt: 'salt' }, why = [];
      if (label.trans_fat) why.push('trans fats (hydrogenated oil)');
      reds.forEach(function(k) { why.push('high ' + names[k]); });
      if (label.additives.length) why.push('additives: ' + label.additives.slice(0, 4).join(', '));
      if (label.preservatives.length) why.push('preservatives: ' + label.preservatives.slice(0, 3).join(', '));
      if (label.sweeteners.length) why.push('sweeteners: ' + label.sweeteners.slice(0, 3).join(', '));
      var v = label.trans_fat || reds.length >= 2 ? 'avoid' : (reds.length || label.additives.length || label.preservatives.length || label.sweeteners.length) ? 'sometimes' : 'good';
      return { verdict: v, why: why.length ? why.join('; ') : 'nothing harmful found on the label', traffic: tl, reds: reds };
    },
    // Pure: does a goal cover this? health = health_settings row; cuts = active cut-back trackers.
    goalNote: function(v, label, health, cuts) {
      if (v.verdict === 'good') return null;
      var have = (cuts || []).map(function(c) { return String(c.name || '').toLowerCase(); }).join(' | ');
      var topic = label.trans_fat ? 'trans fats' : v.reds.indexOf('sugar') > -1 ? 'sugary food' : v.reds.indexOf('salt') > -1 ? 'salty food'
        : v.reds.indexOf('sat') > -1 || v.reds.indexOf('fat') > -1 ? 'fatty food' : label.sweeteners.length ? 'sweeteners' : 'additives';
      var key = topic.split(' ')[0];
      if (have.indexOf(key.replace(/y$/, '')) > -1) return { text: 'Your cut-back goal covers ' + topic + '.', set: null };
      var w = health && health.weight_goal_kg ? ' It works against your ' + health.weight_goal_kg + 'kg weight goal.' : '';
      return { text: 'No goal covers ' + topic + ' yet.' + w + ' Set one?', set: 'Fewer ' + topic };
    },
    // Pure: pack size in g/ml and the price per g/ml.
    perGram: function(price, size, unit) {
      if (!(price > 0) || !(size > 0) || !unit || unit === 'each') return null;
      var g = unit === 'kg' ? size * 1000 : unit === 'l' ? size * 1000 : size, u = unit === 'kg' || unit === 'g' ? 'g' : 'ml';
      return { pack_size: g, pack_unit: u, unit_price: Math.round(price / g * 100000) / 100000 };
    },
    // ST-4: one read per batch of pictures, merged. Saved on the trip so a closed app never pays twice.
    read: function(trip, basket, newProducts, onStep) {
      var self = RPGACE.modules.shopTrip, L = self.logic, pics = L.pictures(trip, newProducts);
      if (!pics.length) return Promise.resolve({ receipts: [], labels: [] });
      var items = basket.map(function(b) { return b.key + ': ' + b.name; }).join('\n') || '(nothing ticked)';
      var out = { receipts: [], labels: [] }, batches = L.chunk(pics, self.PER_CALL), n = 0;
      return batches.reduce(function(pr, batch) {
        return pr.then(function() {
          if (onStep) onStep(++n, batches.length);
          return Promise.all(batch.map(L.image)).then(function(imgs) {
            var sys = RPGACE.prompt('shop_read', { items: items, pictures: batch.map(function(p, i) { return (i + 1) + '. ' + p.label; }).join('\n') });
            return RPGACE.utils.oracleVision(imgs, sys, 'Read these ' + imgs.length + ' pictures.', 1000);
          }).then(function(raw) {
            var p = L.parse(raw, batch);
            if (!p) throw new Error('Oracle\'s reply could not be understood');
            out.receipts = out.receipts.concat(p.receipts); out.labels = out.labels.concat(p.labels);
          });
        });
      }, Promise.resolve()).then(function() {
        return L.patch(trip, { status: 'reading', reading: out }).then(function() { return out; });
      });
    },
    // Pure: per basket item, the receipt line that matched it (price, size, receipt).
    matches: function(basket, reading) {
      var m = {};
      (reading.receipts || []).forEach(function(r) {
        (r.lines || []).forEach(function(x) { if (x.k && !m[x.k]) m[x.k] = Object.assign({ receipt_id: r.id, shop: r.shop }, x); });
      });
      return m;
    },
    // ST-4 save: money, pantry, prices, wishlist, labels. f = what Alex checked on the review screen.
    save: function(trip, basket, f) {
      var self = RPGACE.modules.shopTrip, L = self.logic, M = RPGACE.modules, co = M.cookingOracle, res = { money: 0, stocked: 0, prices: 0, wish: 0, labels: 0, problems: [] };
      var today = RPGACE.kit.iso();
      var wishOn = function(rid) { return basket.filter(function(b) { return b.kind === 'wish' && f.price[b.key] > 0 && (f.line[b.key] || {}).receipt_id === rid; })
        .reduce(function(a, b) { return a + f.price[b.key]; }, 0); };
      var seq = function(list, fn) { return list.reduce(function(p, x) { return p.then(function() { return fn(x); }); }, Promise.resolve()); };
      // 1. Money: one grocery row per receipt (its total less wishlist things on it - those log their own row).
      return seq(f.receipts || [], function(r) {
        var amt = Math.round(((Number(r.total) || 0) - wishOn(r.id)) * 100) / 100;
        if (!(amt > 0)) return null;
        return RPGACE.sb.secureWrite('chronicles_finance', 'insert', { type: 'expense', entry_date: r.date || today, item: 'Groceries' + (r.shop ? ' at ' + r.shop : ''), category: 'Groceries', amount: amt, business: false, receipt_id: r.id, notes: 'Shop trip' })
          .then(function() { res.money += amt; }, function(e) { res.problems.push('money for ' + (r.shop || 'a receipt') + ': ' + (e.message || e)); });
      }).then(function() {
        try { RPGACE.cache.clear('chronicles_finance'); } catch (e) {}
        // 2. Groceries: stock where Alex put it (+ the shop), a price per g/ml, then bought.
        return seq(basket.filter(function(b) { return b.kind === 'list'; }), function(b) {
          var i = b.row, put = (trip.putaway || {})[b.ref] || {}, loc = put.loc || 'pantry', ln = f.line[b.key] || {}, shop = put.shop || b.shop;
          return new Promise(function(resolve) {
            if (!(i.to_buy_amount > 0)) { resolve(false); return; }
            co.logic._addStock(i.ingredient_id, loc, Number(i.to_buy_amount), i.needed_unit || null, function(err) {
              if (err) { res.problems.push(b.name + ' not stocked: ' + err); resolve(false); return; }
              res.stocked++; resolve(true);
            });
          }).then(function(ok) {
            if (!ok) return null;
            var pg = L.perGram(f.price[b.key], ln.size, ln.unit), prod = put.product_id ? (f.products[put.product_id] || {}) : {};
            return RPGACE.sb.secureWrite('pantry_stock', 'update', { shop: shop }, 'ingredient_id=eq.' + i.ingredient_id + '&location=eq.' + loc).catch(function() {})
              .then(function() {
                if (!(f.price[b.key] > 0)) return null;
                return RPGACE.sb.secureWrite('ingredient_prices', 'insert', { ingredient_id: i.ingredient_id, supermarket: shop, brand: prod.brand || null,
                  pack_size: pg ? pg.pack_size : ln.size, pack_unit: pg ? pg.pack_unit : ln.unit, pack_price: f.price[b.key], unit_price: pg ? pg.unit_price : null, price_updated_at: L.now() })
                  .then(function(d) { res.prices++; var pr = Array.isArray(d) ? d[0] : d; return pr && pr.id; }, function(e) { res.problems.push(b.name + ' price: ' + (e.message || e)); return null; });
              }).then(function(priceId) {
                var p = { bought: true, in_basket: true }; if (priceId) p.ingredient_price_id = priceId;
                return RPGACE.sb.secureWrite('shopping_list_items', 'update', p, 'id=eq.' + i.id);
              });
          });
        });
      }).then(function() {
        // 3. Wishlist things: bought at the price on the receipt (their own money row, with the receipt).
        return seq(basket.filter(function(b) { return b.kind === 'wish'; }), function(b) {
          return new Promise(function(resolve) {
            M.shoppingWishlist.logic._markBought(b.row, f.price[b.key] || 0, function(err, warn) {
              if (err) res.problems.push(b.name + ': ' + err); else { res.wish++; if (warn) res.problems.push(warn); }
              resolve();
            }, { receiptId: (f.line[b.key] || {}).receipt_id || null });
          });
        });
      }).then(function() {
        // 4. Labels: verdict + traffic lights + the nearest CoFID food, on the product.
        return seq(f.labels || [], function(l) {
          var v = L.verdict(l), g = L.goalNote(v, l, f.health, f.cuts), p = f.products[l.product_id] || {};
          var word = String(p.name || '').split(/\s+/)[0] || '';
          return (word ? RPGACE.sb.select('cofid_foods', 'select=food_name,kcal_per_100g&food_name=ilike.*' + encodeURIComponent(word) + '*&limit=1').catch(function() { return []; }) : Promise.resolve([]))
            .then(function(cf) {
              var nut = { per100: l.per100, cofid: cf && cf[0] ? cf[0] : null };
              return RPGACE.sb.secureWrite('products', 'update', { size_amount: l.size, size_unit: l.unit, nutrition: nut, ingredients_text: l.ingredients || null,
                flags: { additives: l.additives, preservatives: l.preservatives, sweeteners: l.sweeteners, trans_fat: l.trans_fat }, traffic: v.traffic,
                verdict: v.verdict, verdict_why: v.why, goal_note: g ? g.text : null, read_at: L.now(), updated_at: L.now() }, 'id=eq.' + l.product_id);
            }).then(function() { res.labels++; }, function(e) { res.problems.push('label of ' + (p.name || 'a product') + ': ' + (e.message || e)); });
        });
      }).then(function() {
        // 5. The grocery list: leftovers to the top-up list, list closed - only when every stock write worked.
        var stockFail = res.problems.some(function(x) { return / not stocked: /.test(x); });
        if (stockFail || !trip.list_id || !co) return null;
        return new Promise(function(resolve) { co.logic._finishShopping(trip.list_id, false, function(err, r) { if (err) res.problems.push('grocery list: ' + err); else res.list = r; resolve(); }); });
      }).then(function() {
        try { ['shopping_list_items', 'shopping_lists', 'pantry_stock', 'ingredient_prices', 'wishlist_items'].forEach(function(t) { RPGACE.cache.clear(t); }); } catch (e) {}
        // Shopping is done only when everything is logged.
        if (res.problems.length) return res;
        return L.patch(trip, { status: 'done', done_at: L.now() }).then(function() { RPGACE.hooks.fire('shop:done', { trip: trip.id }); return res; });
      });
    }
  },

  ui: {
    _css: function() {
      if (document.getElementById('st-css')) return;
      var s = document.createElement('style'); s.id = 'st-css';
      s.textContent = '.st-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}' +
        '.st-chip{min-height:44px;padding:6px 12px;border-radius:22px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:14px;cursor:pointer}' +
        '.st-chip.on{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 18%,var(--bg));font-weight:700}' +
        '.st-h{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}' +
        '.st-row{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:8px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:15px;text-align:left;cursor:pointer}' +
        '.st-row.in{opacity:.6;text-decoration:line-through}.st-row .st-s{margin-left:auto;font-size:12px;color:var(--muted);text-decoration:none}' +
        '.st-note{font-size:13px;color:var(--muted);line-height:1.4}.st-card{border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;background:var(--panel)}' +
        '.st-in{width:100%;box-sizing:border-box;min-height:44px;font-size:16px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit}' +
        '.st-v-good{color:#3DAA6E}.st-v-sometimes{color:#E2A83D}.st-v-avoid{color:#CC4A4A}';
      document.head.appendChild(s);
    },
    _fail: function(what, e) { RPGACE.utils.toast('⚠️ ' + what + ': ' + ((e && e.message) || e), '#CC4A4A', 4500, 'shopTrip'); },
    _div: function(cls, text) { var d = document.createElement('div'); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; },
    _file: function(id, label, onFile, multiple) {
      var wrap = document.createElement('label'); wrap.style.cssText = 'display:inline-flex;';
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = id; inp.style.display = 'none';
      inp.setAttribute('capture', 'environment'); if (multiple) inp.multiple = true;
      var b = RPGACE.kit.btn(label, ''); b.style.minHeight = '44px'; b.onclick = function() { inp.click(); };
      inp.onchange = function() { var fs = [].slice.call(inp.files || []); inp.value = ''; if (fs.length) onFile(multiple ? fs : fs[0], b); };
      wrap.appendChild(inp); wrap.appendChild(b); return wrap;
    },

    // ST-1: Shopping mode inside Live now.
    draw: function(body) {
      var self = RPGACE.modules.shopTrip, U = self.ui;
      U._css(); body.innerHTML = ''; body.id = body.id || 'st-body';
      var box = U._div(''); box.id = 'st-box'; box.textContent = 'Loading your shop…'; body.appendChild(box);
      self.logic.open().then(function(trip) {
        if (!trip) { U._drawStart(box); return; }
        if (trip.status !== 'shopping') { U._drawResume(box, trip); return; }
        U._drawTrip(box, trip);
      }, function(e) { box.textContent = '⚠️ Could not load your shop: ' + (e.message || e); });
    },
    _shopChips: function(host, current, onPick) {
      var self = RPGACE.modules.shopTrip, row = self.ui._div('st-chips'); row.id = 'st-shops';
      self.SHOPS.concat(current && self.SHOPS.indexOf(current) === -1 ? [current] : []).forEach(function(s) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'st-chip' + (s === current ? ' on' : ''); c.textContent = s; c.dataset.shop = s;
        c.onclick = function() { onPick(s); }; row.appendChild(c);
      });
      var other = document.createElement('input'); other.className = 'st-in'; other.id = 'st-shop-other'; other.placeholder = 'Another shop…'; other.style.maxWidth = '180px';
      other.onkeydown = function(e) { if (e.key === 'Enter' && other.value.trim()) onPick(other.value.trim()); };
      row.appendChild(other); host.appendChild(row); return row;
    },
    _drawStart: function(box) {
      var self = RPGACE.modules.shopTrip, U = self.ui;
      box.innerHTML = '';
      box.appendChild(U._div('', 'What shop are you at?')).style.cssText = 'font-size:16px;font-weight:700;';
      box.appendChild(U._div('st-note', 'Your newest grocery list comes with you. Add wishlist things too, and switch shop any time.'));
      U._shopChips(box, null, function(s) {
        self.logic.start(s).then(function(t) { U._drawTrip(box, t); }, function(e) { U._fail('Shop not started', e); });
      });
    },
    _drawResume: function(box, trip) {
      var self = RPGACE.modules.shopTrip, U = self.ui, step = { home: 'Add your receipts', putaway: 'Put things away', reading: 'Check what Oracle read' }[trip.status] || 'Finish your shop';
      box.innerHTML = '';
      box.appendChild(U._div('st-note', '🏠 You\'re home from ' + (trip.shops || []).join(', ') + '. Shopping is done once everything is logged.'));
      var b = RPGACE.kit.btn('▶ ' + step, 'primary'); b.id = 'st-resume'; b.style.width = '100%'; b.style.marginTop = '8px';
      b.onclick = function() { U.resume(trip); }; box.appendChild(b);
    },
    _drawTrip: function(box, trip) {
      var self = RPGACE.modules.shopTrip, L = self.logic, U = self.ui;
      box.innerHTML = '';
      var head = U._div(''); head.id = 'st-at'; head.style.cssText = 'font-size:16px;font-weight:700;'; head.textContent = '🛒 At ' + trip.current_shop;
      box.appendChild(head);
      U._shopChips(box, trip.current_shop, function(s) {
        if (s === trip.current_shop) return;
        L.setShop(trip, s).then(function() { U._drawTrip(box, trip); }, function(e) { U._fail('Shop not switched', e); });
      });
      var bud = U._div('st-note'); bud.id = 'st-budget'; box.appendChild(bud);
      var list = U._div(''); list.id = 'st-list'; list.textContent = 'Loading your list…'; box.appendChild(list);
      L.load(trip).then(function(data) {
        var picked = data.wish.filter(function(w) { return (trip.wish_ids || []).indexOf(w.id) > -1; });
        L.budget().then(function(b) { bud.textContent = '💷 ' + (L.budgetLine(b.limit, b.spent, picked) || 'No spending data yet'); }, function() {});
        U._drawItems(list, trip, data, picked);
      }, function(e) { list.textContent = '⚠️ Could not load your list: ' + (e.message || e); });
      var fin = RPGACE.kit.btn('🏠 Finish shop', 'primary'); fin.id = 'st-finish'; fin.style.cssText += 'width:100%;margin-top:12px;';
      fin.onclick = function() { U.askDone(trip); };
      box.appendChild(fin);
    },
    _view: function(v) {
      try { if (v) localStorage.setItem('rpgace.shopView', v); return localStorage.getItem('rpgace.shopView') || 'lists'; } catch (e) { return v || 'lists'; }
    },
    _drawItems: function(host, trip, data, picked) {
      var self = RPGACE.modules.shopTrip, L = self.logic, U = self.ui, view = U._view(), pa = trip.putaway || {};
      host.innerHTML = '';
      var sw = U._div('st-chips'); sw.id = 'st-view';
      [['lists', 'Groceries · Wishlist'], ['shops', 'By shop']].forEach(function(x) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'st-chip' + (view === x[0] ? ' on' : ''); c.textContent = x[1]; c.dataset.view = x[0];
        c.onclick = function() { U._view(x[0]); U._drawItems(host, trip, data, picked); }; sw.appendChild(c);
      });
      host.appendChild(sw);
      var rows = L.toFind(data.list).map(function(i) { return { kind: 'list', item: i, name: L.name(i), on: !!i.in_basket, shop: (pa['l:' + i.id] || {}).shop }; })
        .concat(picked.map(function(w) { var on = (trip.wish_basket || []).indexOf(w.id) > -1; return { kind: 'wish', item: w, name: w.name, on: on, shop: (pa['w:' + w.id] || {}).shop, price: w.estimated_price }; }));
      var row = function(r) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'st-row' + (r.on ? ' in' : ''); b.dataset.kind = r.kind; b.dataset.id = r.item.id;
        b.textContent = (r.on ? '✅ ' : '⬜ ') + r.name + (r.kind === 'list' && r.item.to_buy_amount ? ' · ' + r.item.to_buy_amount + (r.item.needed_unit ? ' ' + r.item.needed_unit : '') : '');
        var s = document.createElement('span'); s.className = 'st-s'; s.textContent = r.on ? (r.shop || '') : r.price ? '~£' + r.price : ''; b.appendChild(s);
        b.onclick = function() {
          b.disabled = true;
          (r.kind === 'list' ? L.tick(trip, r.item, !r.on) : L.tickWish(trip, r.item, !r.on))
            .then(function() { U._drawItems(host, trip, data, picked); }, function(e) { b.disabled = false; U._fail('Not ticked', e); });
        };
        return b;
      };
      var sect = function(title, list) { if (!list.length) return; host.appendChild(U._div('st-h', title)); list.forEach(function(r) { host.appendChild(row(r)); }); };
      if (!rows.length) host.appendChild(U._div('st-note', trip.list_id ? 'Nothing left on your grocery list.' : 'No grocery list yet. Add wishlist things below, or make a list in Cooking.'));
      if (view === 'shops') {
        sect('Still to find', rows.filter(function(r) { return !r.on; }));
        (trip.shops || []).forEach(function(s) { sect('In the basket · ' + s, rows.filter(function(r) { return r.on && r.shop === s; })); });
      } else {
        sect('🥕 Groceries', rows.filter(function(r) { return r.kind === 'list'; }));
        sect('🛍️ Wishlist', rows.filter(function(r) { return r.kind === 'wish'; }));
      }
      var add = RPGACE.kit.btn('➕ Add from wishlist', ''); add.id = 'st-wish-add'; add.style.marginTop = '6px';
      add.onclick = function() { U._pickWish(trip, data, function() { U._drawTrip(document.getElementById('st-box') || host, trip); }); };
      host.appendChild(add);
    },
    _pickWish: function(trip, data, after) {
      var self = RPGACE.modules.shopTrip, U = self.ui, sel = (trip.wish_ids || []).slice();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🛍️ Wishlist', title: 'Get any of these on this trip?', width: '440px' });
      pop.box.id = 'st-wish-pop';
      if (!data.wish.length) pop.box.appendChild(U._div('st-note', 'Your wishlist is empty.'));
      data.wish.forEach(function(w) {
        var l = document.createElement('label'); l.className = 'st-row'; l.style.cursor = 'pointer';
        var c = document.createElement('input'); c.type = 'checkbox'; c.checked = sel.indexOf(w.id) > -1; c.dataset.id = w.id; c.style.cssText = 'width:22px;height:22px;';
        c.onchange = function() { sel = sel.filter(function(x) { return x !== w.id; }); if (c.checked) sel.push(w.id); };
        l.appendChild(c); l.appendChild(document.createTextNode(' ' + w.name + (w.estimated_price ? ' · ~£' + w.estimated_price : ''))); pop.box.appendChild(l);
      });
      var ok = RPGACE.kit.btn('Save', 'primary'); ok.id = 'st-wish-save'; ok.style.width = '100%';
      ok.onclick = function() { ok.disabled = true; self.logic.pickWish(trip, sel).then(function() { pop.close(); after(); }, function(e) { ok.disabled = false; U._fail('Not saved', e); }); };
      pop.box.appendChild(ok);
    },

    // ST-2: back home? Asked when the app opens on a trip left shopping for a while.
    checkHome: function() {
      var self = RPGACE.modules.shopTrip, ag = RPGACE.modules.authGate;
      if (!(ag && ag._apiSecret) || self._asking || document.getElementById('st-done-pop')) return;
      try { if (Number(sessionStorage.getItem('rpgace.shopAsked') || 0) > Date.now() - 30 * 60000) return; } catch (e) {}
      self.logic.open().then(function(t) {
        if (!t || !t.id || self.STEPS.indexOf(t.status) < 0) return;
        if (t.status === 'shopping') {
          var idle = (Date.now() - new Date(t.updated_at || t.created_at).getTime()) / 60000;
          if (idle < self.HOME_AFTER_MIN || document.getElementById('st-box')) return;
        }
        try { sessionStorage.setItem('rpgace.shopAsked', String(Date.now())); } catch (e) {}
        if (t.status === 'shopping') self.ui.askDone(t); else self.ui.resume(t);
      }, function() {});
    },
    askDone: function(trip) {
      var self = RPGACE.modules.shopTrip, U = self.ui;
      self._asking = true;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🛒 Shop trip', title: 'Done shopping?', width: '420px', onClose: function() { self._asking = false; } });
      pop.box.id = 'st-done-pop';
      pop.box.appendChild(U._div('st-note', 'Shops: ' + (trip.shops || []).join(', ') + '. Next: your receipts, then putting things away.'));
      var yes = RPGACE.kit.btn('✅ Yes, I\'m home', 'primary'); yes.id = 'st-done-yes'; yes.style.cssText += 'width:100%;margin-top:10px;';
      yes.onclick = function() {
        yes.disabled = true;
        self.logic.patch(trip, { status: 'home' }).then(function() { self._asking = false; pop.close(); U.receipts(trip); }, function(e) { yes.disabled = false; U._fail('Not saved', e); });
      };
      var no = RPGACE.kit.btn('Still shopping', ''); no.id = 'st-done-no'; no.style.cssText += 'width:100%;margin-top:6px;';
      no.onclick = function() { self._asking = false; pop.close(); self.logic.patch(trip, {}).catch(function() {}); };
      pop.box.appendChild(yes); pop.box.appendChild(no);
    },
    resume: function(trip) {
      var U = RPGACE.modules.shopTrip.ui;
      if (trip.status === 'home') U.receipts(trip); else if (trip.status === 'putaway') U.read(trip); else if (trip.status === 'reading') U.read(trip); else U.askDone(trip);
    },
    // ST-2: receipt photos - saved now, read later in the one batched read.
    receipts: function(trip) {
      var self = RPGACE.modules.shopTrip, L = self.logic, U = self.ui;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🧾 Receipts', title: 'Photo each receipt', width: '440px' });
      pop.box.id = 'st-receipts';
      pop.box.appendChild(U._div('st-note', 'Saved privately now. Oracle reads them all in one go at the end, with any new labels.'));
      var list = U._div(''); list.id = 'st-receipt-list'; pop.box.appendChild(list);
      var paint = function() {
        list.innerHTML = '';
        (trip.receipts || []).forEach(function(r, i) { list.appendChild(U._div('st-card', '🧾 Receipt ' + (i + 1) + (r.shop ? ' · ' + r.shop : ''))); });
        next.textContent = (trip.receipts || []).length ? 'Next: put things away' : 'No receipt - put things away';
      };
      var shop = document.createElement('select'); shop.className = 'st-in'; shop.id = 'st-receipt-shop'; shop.style.margin = '8px 0';
      (trip.shops || []).forEach(function(s) { var o = document.createElement('option'); o.value = s; o.textContent = s; shop.appendChild(o); });
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Another shop (Oracle reads it)'; shop.appendChild(o0);
      shop.value = trip.current_shop || '';
      pop.box.appendChild(shop);
      pop.box.appendChild(U._file('st-receipt-file', '📷 Add a receipt', function(files, b) {
        b.disabled = true; b.textContent = 'Saving…';
        files.reduce(function(p, f) { return p.then(function() { return L.photo(f, 'receipt').then(function(id) {
          var rs = (trip.receipts || []).concat([{ id: id, shop: shop.value || null }]);
          return L.patch(trip, { receipts: rs });
        }); }); }, Promise.resolve()).then(function() { b.disabled = false; b.textContent = '📷 Add a receipt'; paint(); },
          function(e) { b.disabled = false; b.textContent = '📷 Add a receipt'; paint(); U._fail('Receipt not saved', e); });
      }, true));
      var next = RPGACE.kit.btn('', 'primary'); next.id = 'st-receipts-next'; next.style.cssText += 'width:100%;margin-top:10px;';
      next.onclick = function() { pop.close(); U.putAway(trip); };
      pop.box.appendChild(next);
      paint();
    },
    // ST-3: put away. A product is known with both photos + shop + brand; a new one asks for what's missing.
    putAway: function(trip) {
      var self = RPGACE.modules.shopTrip, L = self.logic, U = self.ui, co = RPGACE.modules.cookingOracle;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🏠 Put away', title: 'Where is each thing going?', width: '480px', scroll: true });
      pop.box.id = 'st-putaway';
      var host = U._div(''); host.textContent = 'Loading your basket…'; pop.box.appendChild(host);
      L.load(trip).then(function(data) {
        var basket = L.basket(trip, data), food = basket.filter(function(b) { return b.kind === 'list'; });
        return L.products(food.map(function(b) { return b.row.ingredient_id; })).then(function(products) {
          host.innerHTML = '';
          if (!basket.length) host.appendChild(U._div('st-note', 'Nothing was ticked into the basket on this trip.'));
          var state = {};
          food.forEach(function(b) {
            var put = (trip.putaway || {})[b.ref] || {}, known = L.knownFor(products, b.row.ingredient_id);
            var s = state[b.ref] = { loc: put.loc || null, product_id: put.product_id || (known && known.id) || null, known: !!known && !put.redo, front: null, back: null, brand: '', skip: false };
            var card = U._div('st-card'); card.dataset.ref = b.ref; card.className = 'st-card st-put';
            card.appendChild(U._div('', b.name + ' · from ' + b.shop)).style.fontWeight = '700';
            var loc = document.createElement('select'); loc.className = 'st-in st-loc'; loc.style.margin = '6px 0';
            [['pantry', '🥫 Cupboard'], ['fridge', '🧊 Fridge'], ['freezer', '❄️ Freezer']].forEach(function(x) { var o = document.createElement('option'); o.value = x[0]; o.textContent = x[1]; loc.appendChild(o); });
            // BB-2: best before per pack (needed for the fridge).
            var BB = RPGACE.modules.bestBefore, df = BB ? BB.ui.dateField({ name: b.name, location: s.loc || 'fridge' }) : null;
            s.date = df;
            loc.onchange = function() { s.loc = loc.value; if (df) df.setLocation(s.loc); };
            if (s.loc) loc.value = s.loc; else if (co) co.logic._defaultLocation(b.row.ingredient_id, b.name, function(l) { if (!s.loc) { s.loc = l; loc.value = l; if (df) df.setLocation(l); } });
            card.appendChild(loc);
            if (df) card.appendChild(df.el);
            var ph = U._div(''); card.appendChild(ph);
            var drawPhotos = function() {
              ph.innerHTML = '';
              if (s.known) {
                ph.appendChild(U._div('st-note', '✓ Known: ' + known.brand + ' (photos saved). A different size or shop only logs its price per gram.'));
                var diff = document.createElement('button'); diff.type = 'button'; diff.className = 'st-chip st-diff'; diff.textContent = 'Different brand';
                diff.onclick = function() { s.known = false; s.product_id = null; drawPhotos(); }; ph.appendChild(diff); return;
              }
              if (s.skip) { ph.appendChild(U._div('st-note', 'Photos skipped - asked again next time.')); return; }
              ph.appendChild(U._div('st-note', 'New item: photo the front and the back label, and say the brand.'));
              var br = document.createElement('input'); br.className = 'st-in st-brand'; br.placeholder = 'Brand, e.g. Tesco, Heinz'; br.value = s.brand; br.style.margin = '6px 0';
              br.oninput = function() { s.brand = br.value; }; ph.appendChild(br);
              var row = U._div('st-chips');
              var shot = function(side) {
                return U._file('st-' + side + '-' + b.row.id, (s[side] ? '✅ ' : '📷 ') + (side === 'front' ? 'Front' : 'Back label'), function(f, btn) {
                  btn.disabled = true; btn.textContent = 'Saving…';
                  L.photo(f, 'product').then(function(id) { s[side] = id; drawPhotos(); }, function(e) { btn.disabled = false; drawPhotos(); U._fail('Photo not saved', e); });
                });
              };
              row.appendChild(shot('front')); row.appendChild(shot('back'));
              var sk = document.createElement('button'); sk.type = 'button'; sk.className = 'st-chip st-skip'; sk.textContent = 'Skip for now';
              sk.onclick = function() { s.skip = true; drawPhotos(); }; row.appendChild(sk);
              ph.appendChild(row);
            };
            drawPhotos(); host.appendChild(card);
          });
          basket.filter(function(b) { return b.kind === 'wish'; }).forEach(function(b) { host.appendChild(U._div('st-card', '🛍️ ' + b.name + ' · from ' + b.shop + ' (wishlist - marked bought at the end)')); });
          var done = RPGACE.kit.btn('All put away', 'primary'); done.id = 'st-putaway-done'; done.style.cssText += 'width:100%;margin-top:10px;';
          done.onclick = function() {
            var missing = food.filter(function(b) { var s = state[b.ref]; return !s.known && !s.skip && !(s.front && s.back && s.brand.trim()); });
            var undated = food.filter(function(b) { var s = state[b.ref]; return (s.loc || 'pantry') === 'fridge' && s.date && !s.date.value(); });
            if (undated.length) { RPGACE.utils.toast('📅 ' + undated[0].name + ' is going in the fridge - add its best before (or 🔮 No date on it)', '#E2A83D', 3500); return; }
            if (missing.length) { RPGACE.utils.toast('📷 ' + missing[0].name + ' still needs ' + (!state[missing[0].ref].front ? 'a front photo' : !state[missing[0].ref].back ? 'a back-label photo' : 'its brand') + ' (or Skip for now)', '#E2A83D', 3500); return; }
            done.disabled = true; done.textContent = 'Saving…';
            var pa = Object.assign({}, trip.putaway || {});
            food.reduce(function(p, b) {
              return p.then(function() {
                var s = state[b.ref];
                var mk = !s.known && !s.skip ? L.addProduct({ name: b.name, brand: s.brand, shop: b.shop, ingredient_id: b.row.ingredient_id, front: s.front, back: s.back }).then(function(r) { return r.id; }) : Promise.resolve(s.known ? s.product_id : null);
                return mk.then(function(pid) {
                  pa[b.ref] = Object.assign({}, pa[b.ref] || {}, { shop: b.shop, loc: s.loc || 'pantry', product_id: pid || null, new_product: !s.known && !s.skip });
                  var BB = RPGACE.modules.bestBefore;
                  if (!BB || !s.date || !s.date.value() || pa[b.ref].dated) return null;
                  return BB.logic.add({ ingredient_id: b.row.ingredient_id, location: s.loc || 'pantry', best_before: s.date.value(), source: s.date.source(), note: s.date.note(), shop: b.shop }).then(function() { pa[b.ref].dated = true; });
                });
              });
            }, Promise.resolve()).then(function() { return L.patch(trip, { status: 'putaway', putaway: pa }); })
              .then(function() { pop.close(); U.read(trip); }, function(e) { done.disabled = false; done.textContent = 'All put away'; U._fail('Not saved', e); });
          };
          pop.box.appendChild(done);
        });
      }).catch(function(e) { host.textContent = '⚠️ Could not load your basket: ' + (e.message || e); });
    },
    // ST-4: the one batched read, then the review screen. Nothing saves until Alex checks it.
    read: function(trip) {
      var self = RPGACE.modules.shopTrip, L = self.logic, U = self.ui;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🧾 Shop done', title: 'Check what Oracle read', width: '520px', scroll: true });
      pop.box.id = 'st-review';
      var host = U._div(''); host.textContent = 'Loading…'; pop.box.appendChild(host);
      var pa = trip.putaway || {}, newIds = Object.keys(pa).map(function(k) { return pa[k].new_product && pa[k].product_id; }).filter(Boolean);
      Promise.all([L.load(trip), newIds.length ? L.rd('products', 'select=*&id=in.(' + newIds.join(',') + ')') : [],
        L.rd('health_settings', 'select=*&limit=1').catch(function() { return []; }), L.rd('cutback_items', 'select=name&active=eq.true').catch(function() { return []; })])
        .then(function(r) {
          var data = r[0], basket = L.basket(trip, data), newProducts = (r[1] || []).filter(function(p) { return !p.read_at; });
          var ctx = { basket: basket, products: {}, health: (r[2] || [])[0] || null, cuts: r[3] || [] };
          (r[1] || []).forEach(function(p) { ctx.products[p.id] = p; });
          var pics = L.pictures(trip, newProducts);
          if (trip.status === 'reading' && trip.reading) { U._review(host, pop, trip, ctx, trip.reading); return; }
          host.innerHTML = '';
          host.appendChild(U._div('st-note', pics.length ? pics.length + ' picture' + (pics.length === 1 ? '' : 's') + ' to read (' + (trip.receipts || []).length + ' receipt' + ((trip.receipts || []).length === 1 ? '' : 's') + ', ' + newProducts.length + ' new label' + (newProducts.length === 1 ? '' : 's') + '): ' + Math.ceil(pics.length / self.PER_CALL) + ' Oracle read' + (pics.length > self.PER_CALL ? 's' : '') + '.' : 'No receipts or new labels to read - type the prices below.'));
          var go = RPGACE.kit.btn(pics.length ? '🔮 Read it all' : 'Next', 'primary'); go.id = 'st-read'; go.style.cssText += 'width:100%;margin-top:10px;';
          go.onclick = function() {
            go.disabled = true;
            L.read(trip, basket, newProducts, function(n, of) { go.textContent = 'Reading ' + n + ' of ' + of + '…'; })
              .then(function(reading) { U._review(host, pop, trip, ctx, reading); }, function(e) { go.disabled = false; go.textContent = '🔮 Try the read again'; U._fail('Read failed', e); });
          };
          host.appendChild(go);
        }).catch(function(e) { host.textContent = '⚠️ Could not load your shop: ' + (e.message || e); });
    },
    _review: function(host, pop, trip, ctx, reading) {
      var self = RPGACE.modules.shopTrip, L = self.logic, U = self.ui, basket = ctx.basket, m = L.matches(basket, reading);
      var num = function(v) { var n = Number(v); return v === '' || isNaN(n) ? null : n; };
      host.innerHTML = '';
      var ins = {};
      if (reading.receipts.length) host.appendChild(U._div('st-h', '🧾 Receipts'));
      var recIns = reading.receipts.map(function(r, i) {
        var c = U._div('st-card st-rec'); c.appendChild(U._div('', (r.shop || 'Receipt ' + (i + 1)) + (r.date ? ' · ' + r.date : ''))).style.fontWeight = '700';
        var t = document.createElement('input'); t.type = 'number'; t.step = '0.01'; t.inputMode = 'decimal'; t.className = 'st-in st-rec-total'; t.value = r.total == null ? '' : r.total;
        t.setAttribute('aria-label', 'Total paid'); c.appendChild(U._div('st-note', 'Total paid (£)')); c.appendChild(t); host.appendChild(c);
        return { r: r, input: t };
      });
      (trip.receipts || []).filter(function(x) { return !reading.receipts.some(function(r) { return r.id === x.id; }); }).forEach(function() { host.appendChild(U._div('st-note st-v-sometimes', '⚠️ One receipt could not be read - add its total in Money by hand.')); });
      if (basket.length) host.appendChild(U._div('st-h', '🛒 What you bought (price paid)'));
      basket.forEach(function(b) {
        var ln = m[b.key] || {}, c = U._div('st-card'); c.dataset.key = b.key;
        c.appendChild(U._div('', (b.kind === 'wish' ? '🛍️ ' : '') + b.name + ' · ' + b.shop + (ln.size ? ' · ' + ln.size + (ln.unit || '') : '')));
        var p = document.createElement('input'); p.type = 'number'; p.step = '0.01'; p.inputMode = 'decimal'; p.className = 'st-in st-price'; p.placeholder = 'Price (£)'; p.value = ln.price == null ? '' : ln.price;
        p.setAttribute('aria-label', b.name + ' price'); c.appendChild(p);
        if (!ln.k) c.appendChild(U._div('st-note', 'Not found on a receipt - type the price if you know it.'));
        ins[b.key] = p; host.appendChild(c);
      });
      var goals = {};
      if (reading.labels.length) host.appendChild(U._div('st-h', '🔬 Labels'));
      reading.labels.forEach(function(l) {
        var v = L.verdict(l), g = L.goalNote(v, l, ctx.health, ctx.cuts), p = ctx.products[l.product_id] || {}, c = U._div('st-card st-label');
        var h = U._div('st-v-' + v.verdict, ({ good: '🟢 Good', sometimes: '🟠 Sometimes', avoid: '🔴 Avoid' })[v.verdict] + ' · ' + (p.brand ? p.brand + ' ' : '') + (p.name || ''));
        h.style.fontWeight = '700'; c.appendChild(h);
        c.appendChild(U._div('st-note', v.why));
        var tl = Object.keys(v.traffic).filter(function(k) { return v.traffic[k]; }).map(function(k) { return ({ green: '🟢', amber: '🟠', red: '🔴' })[v.traffic[k]] + ' ' + k; }).join('  ');
        if (tl) c.appendChild(U._div('st-note', tl));
        if (g) {
          c.appendChild(U._div('st-note', '🎯 ' + g.text));
          if (g.set && !goals[g.set]) {
            goals[g.set] = 1;
            var sg = document.createElement('button'); sg.type = 'button'; sg.className = 'st-chip st-goal'; sg.textContent = '🎯 Set goal: ' + g.set;
            sg.onclick = function() {
              var md = RPGACE.modules.myDay; if (!md) return; sg.disabled = true;
              md.logic.cutSaveItem({ name: g.set, icon: '🧪', unit: 'a day', target: 0 }).then(function() { sg.textContent = '✅ Goal set: ' + g.set + ' (My Day cut-backs)'; ctx.cuts.push({ name: g.set }); },
                function(e) { sg.disabled = false; U._fail('Goal not set', e); });
            };
            c.appendChild(sg);
          }
        }
        host.appendChild(c);
      });
      var save = RPGACE.kit.btn('✅ Save it all', 'primary'); save.id = 'st-save'; save.style.cssText += 'width:100%;margin-top:12px;';
      save.onclick = function() {
        save.disabled = true; save.textContent = 'Saving…';
        var f = { price: {}, line: m, receipts: recIns.map(function(x) { return Object.assign({}, x.r, { total: num(x.input.value) }); }), labels: reading.labels, products: ctx.products, health: ctx.health, cuts: ctx.cuts };
        // Known products' brand for the price row.
        var pa = trip.putaway || {}, known = Object.keys(pa).map(function(k) { return pa[k].product_id; }).filter(function(id) { return id && !f.products[id]; });
        Object.keys(ins).forEach(function(k) { f.price[k] = num(ins[k].value); });
        (known.length ? L.rd('products', 'select=id,brand,name&id=in.(' + known.join(',') + ')').catch(function() { return []; }) : Promise.resolve([]))
          .then(function(rows) { rows.forEach(function(p) { f.products[p.id] = p; }); return L.save(trip, basket, f); })
          .then(function(res) {
            if (res.problems.length) {
              save.disabled = false; save.textContent = '✅ Try saving again';
              host.insertBefore(U._div('st-note st-v-avoid', '⚠️ Not all saved, so the shop stays open: ' + res.problems.join(' · ')), host.firstChild);
              return;
            }
            pop.close();
            RPGACE.utils.toast('🛒 Shop logged: £' + res.money.toFixed(2) + ' groceries, ' + res.stocked + ' stocked, ' + res.prices + ' prices' + (res.wish ? ', ' + res.wish + ' wishlist' : '') + (res.labels ? ', ' + res.labels + ' labels read' : ''), '#3DAA6E', 4500);
            var b = document.getElementById('st-box'); if (b && b.parentNode) self.ui.draw(b.parentNode);
          }, function(e) { save.disabled = false; save.textContent = '✅ Try saving again'; U._fail('Not saved', e); });
      };
      host.appendChild(save);
    }
  }
});
/* ===END:shopTrip=== */
