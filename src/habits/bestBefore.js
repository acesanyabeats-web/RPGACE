/* ===MODULE:bestBefore=== */
// BB-1..7 (Nov 5 2026, record records/2026-11/best_before_interrogation_2026-11-05.txt).
// Alex: "when I log ingredients, ask for best before, with those timers telling me
// what's going out in 5 days with countdown each day. This way I have a throw out
// list and a use soon. Oracle can give suggestions on things to use from use soon
// to minimise wastage"; answers: ask on put-away, the add-stock form and the
// fridge photo; fridge items a must, cupboard/freezer mostly keep; "Pak foods veg
// and meat do not show best before ... I tap no best before, oracle in pop up says
// what it should be, I either accept or continue convo"; morning push + lists;
// "Keep both, but in using ingredient nudge me to use older, then when I used up
// old, I tick that and new date replaces it"; throw out = ask, then log waste.
// One row per pack in stock_dates (status active -> used | thrown; thrown rows ARE
// the waste log). pantry_stock keeps the amounts. The 8am push line is SQL
// (push_food_line, called by push_digest).
RPGACE.register('bestBefore', {
  domain: 'habits',
  MODEL: 'claude-sonnet-4-6',
  SOON_DAYS: 5,
  LOC: { fridge: '🧊 Fridge', pantry: '🥫 Cupboard', freezer: '❄️ Freezer' },

  logic: {
    today: function() { return RPGACE.kit.iso(); },
    // Pure: whole days from today to a YYYY-MM-DD date.
    daysLeft: function(d, today) {
      var a = Date.parse(String(d).slice(0, 10) + 'T00:00:00Z'), b = Date.parse(String(today).slice(0, 10) + 'T00:00:00Z');
      return isNaN(a) || isNaN(b) ? null : Math.round((a - b) / 86400000);
    },
    plusDays: function(today, n) { var t = new Date(String(today).slice(0, 10) + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + (Number(n) || 0)); return t.toISOString().slice(0, 10); },
    // Pure: "today", "1 day", "3 days", "2 days ago".
    countdown: function(n) { return n == null ? '' : n === 0 ? 'today' : n === 1 ? '1 day' : n > 1 ? n + ' days' : n === -1 ? '1 day ago' : (-n) + ' days ago'; },
    active: function() {
      return RPGACE.sb.select('stock_dates', 'select=id,ingredient_id,location,best_before,source,shop,ingredients(name)&status=eq.active&order=best_before.asc&limit=500')
        .then(function(r) { return r || []; });
    },
    // Pure: soon = 0..SOON_DAYS days left, out = past its date.
    split: function(rows, today) {
      var self = RPGACE.modules.bestBefore, L = self.logic, out = { soon: [], out: [], later: [] };
      (rows || []).forEach(function(r) { var n = L.daysLeft(r.best_before, today); r.left = n; (n < 0 ? out.out : n <= self.SOON_DAYS ? out.soon : out.later).push(r); });
      return out;
    },
    // Pure: ingredient_id -> its active packs, oldest date first.
    byIngredient: function(rows) {
      var m = {}; (rows || []).forEach(function(r) { (m[r.ingredient_id] = m[r.ingredient_id] || []).push(r); });
      Object.keys(m).forEach(function(k) { m[k].sort(function(a, b) { return String(a.best_before).localeCompare(String(b.best_before)); }); });
      return m;
    },
    add: function(f) {
      if (!f.ingredient_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(f.best_before || ''))) return Promise.reject(new Error('Pick a date first'));
      return RPGACE.sb.secureWrite('stock_dates', 'insert', { ingredient_id: f.ingredient_id, location: f.location || null, best_before: f.best_before, source: f.source || 'label', note: f.note || null, shop: f.shop || null })
        .then(function(d) { try { RPGACE.cache.clear('stock_dates'); } catch (e) {} return Array.isArray(d) ? d[0] : d; });
    },
    close: function(id, status) {
      return RPGACE.sb.secureWrite('stock_dates', 'update', { status: status, closed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, 'id=eq.' + id)
        .then(function() { try { RPGACE.cache.clear('stock_dates'); } catch (e) {} });
    },
    stillGood: function(id, date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return Promise.reject(new Error('Pick the new date'));
      return RPGACE.sb.secureWrite('stock_dates', 'update', { best_before: date, updated_at: new Date().toISOString() }, 'id=eq.' + id)
        .then(function() { try { RPGACE.cache.clear('stock_dates'); } catch (e) {} });
    },
    // Thrown out: the pack is logged as waste; when it was the only dated pack in that place, the stock goes to 0.
    thrownOut: function(row, all) {
      var others = (all || []).filter(function(r) { return r.id !== row.id && r.ingredient_id === row.ingredient_id && r.location === row.location; });
      return RPGACE.modules.bestBefore.logic.close(row.id, 'thrown').then(function() {
        if (others.length || !row.location) return { zeroed: false };
        return RPGACE.sb.secureWrite('pantry_stock', 'update', { quantity: 0, updated_at: new Date().toISOString() }, 'ingredient_id=eq.' + row.ingredient_id + '&location=eq.' + row.location)
          .then(function() { try { RPGACE.cache.clear('pantry_stock'); } catch (e) {} return { zeroed: true }; });
      });
    },
    // In stock with no active date (the one-off "date your stock" screen).
    undated: function() {
      return Promise.all([
        RPGACE.sb.select('pantry_stock', 'select=ingredient_id,location,quantity,unit,ingredients(name)&quantity=gt.0&limit=500'),
        RPGACE.modules.bestBefore.logic.active()
      ]).then(function(r) {
        var dated = {}; (r[1] || []).forEach(function(d) { dated[d.ingredient_id + '|' + d.location] = 1; });
        return (r[0] || []).filter(function(s) { return !dated[s.ingredient_id + '|' + s.location]; });
      });
    },
    // BB-3: Oracle's number of days for food with no printed date (UK guidance).
    guess: function(name, location, chat) {
      var self = RPGACE.modules.bestBefore;
      var p = RPGACE.prompt('best_before', { name: name, location: location || 'fridge', today: self.logic.today(),
        chat: (chat || []).slice(-8).map(function(m) { return m.who + ': ' + String(m.text).slice(0, 300); }).join('\n') || '(nothing yet - give your first answer)' });
      return RPGACE.kit.ask(p, { json: true, max: 400, model: self.MODEL }).then(function(o) {
        var d = parseInt(o && o.days, 10);
        if (!(d >= 0 && d <= 730)) throw new Error('Oracle did not give a number of days');
        return { days: d, reply: String((o && o.reply) || '').slice(0, 500), source: String((o && o.source) || '').slice(0, 40) };
      });
    },
    // BB-6: ideas to use up what's going soon.
    ideas: function(soon) {
      var self = RPGACE.modules.bestBefore;
      return Promise.all([
        RPGACE.sb.select('recipes', 'select=id,title&order=created_at.desc&limit=40').catch(function() { return []; }),
        RPGACE.sb.select('pantry_stock', 'select=ingredients(name)&quantity=gt.0&limit=200').catch(function() { return []; })
      ]).then(function(r) {
        var p = RPGACE.prompt('use_soon', {
          soon: soon.map(function(x) { return '- ' + ((x.ingredients && x.ingredients.name) || '?') + ' - ' + x.left + ' days'; }).join('\n'),
          recipes: (r[0] || []).map(function(x) { return x.id + ' ' + x.title; }).join('\n') || 'none saved',
          stock: (r[1] || []).map(function(x) { return x.ingredients && x.ingredients.name; }).filter(Boolean).slice(0, 80).join(', ') || 'unknown'
        });
        return RPGACE.kit.ask(p, { json: true, max: 900, model: self.MODEL });
      }).then(function(o) {
        var ideas = (Array.isArray(o && o.ideas) ? o.ideas : []).slice(0, 4).map(function(i) {
          return { title: String(i.title || '').slice(0, 80), uses: (Array.isArray(i.uses) ? i.uses : []).map(String).slice(0, 6), why: String(i.why || '').slice(0, 200), recipe_id: /^[0-9a-f-]{36}$/.test(String(i.recipe_id || '')) ? i.recipe_id : null };
        }).filter(function(i) { return i.title; });
        if (!ideas.length) throw new Error('Oracle had no ideas - try again');
        return { ideas: ideas, freeze: (Array.isArray(o && o.freeze) ? o.freeze : []).map(String).slice(0, 6) };
      });
    }
  },

  ui: {
    _css: function() {
      if (document.getElementById('bb-css')) return;
      var s = document.createElement('style'); s.id = 'bb-css';
      s.textContent = '.bb-field{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}' +
        '.bb-date{min-height:44px;font-size:16px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit}' +
        '.bb-btn{min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer}' +
        '.bb-h{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}' +
        '.bb-row{border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-bottom:6px;background:var(--bg)}' +
        '.bb-name{font-weight:700;font-size:15px}.bb-left{font-variant-numeric:tabular-nums;font-weight:700}.bb-note{font-size:13px;color:var(--muted);line-height:1.4}' +
        '.bb-red{color:#CC4A4A}.bb-amber{color:#E2A83D}.bb-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}';
      document.head.appendChild(s);
    },
    _div: function(cls, text) { var d = document.createElement('div'); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; },
    _fail: function(what, e) { RPGACE.utils.toast('⚠️ ' + what + ': ' + ((e && e.message) || e), '#CC4A4A', 4500, 'bestBefore'); },
    _fmt: function(d) { try { return new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return d; } },

    // BB-2/3: a date box + "No date on it" (Oracle) + an optional "usually keeps" note. f.value()/f.source().
    dateField: function(opts) {
      var self = RPGACE.modules.bestBefore, U = self.ui; opts = opts || {};
      U._css();
      var wrap = U._div('bb-field'), src = 'label', note = null;
      var lab = document.createElement('label'); lab.className = 'bb-note'; lab.textContent = 'Best before';
      var inp = document.createElement('input'); inp.type = 'date'; inp.className = 'bb-date'; if (opts.id) inp.id = opts.id; inp.min = self.logic.plusDays(self.logic.today(), -30);
      if (opts.value) inp.value = opts.value;
      inp.oninput = function() { src = 'label'; note = null; };
      var no = document.createElement('button'); no.type = 'button'; no.className = 'bb-btn bb-nodate'; no.textContent = '🔮 No date on it';
      no.onclick = function() {
        U.guess(opts.name || 'this food', opts.location || 'fridge', function(days, reply) {
          inp.value = self.logic.plusDays(self.logic.today(), days); src = 'oracle'; note = reply || null;
        });
      };
      lab.appendChild(inp); wrap.appendChild(lab); wrap.appendChild(no);
      var keeps = U._div('bb-note bb-keeps'); wrap.appendChild(keeps);
      var setLoc = function(loc) { keeps.textContent = loc && loc !== 'fridge' ? 'Optional - ' + (loc === 'freezer' ? 'freezer food keeps for months' : 'cupboard food usually keeps') : 'Needed for the fridge'; };
      setLoc(opts.location);
      return { el: wrap, input: inp, value: function() { return inp.value || ''; }, source: function() { return src; }, note: function() { return note; }, setLocation: function(l) { opts.location = l; setLoc(l); } };
    },
    // BB-3: Oracle's number of days, talked through until Alex accepts.
    guess: function(name, location, done) {
      var self = RPGACE.modules.bestBefore, L = self.logic, U = self.ui, chat = [], last = null;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🔮 No date on it', title: name + ' - how long does it keep?', width: '440px' });
      pop.box.id = 'bb-guess';
      var log = U._div(''); log.id = 'bb-guess-log'; log.style.cssText = 'display:flex;flex-direction:column;gap:6px;'; pop.box.appendChild(log);
      var acts = U._div('bb-acts'); pop.box.appendChild(acts);
      var ta = document.createElement('textarea'); ta.className = 'bb-date'; ta.id = 'bb-guess-text'; ta.rows = 2; ta.style.width = '100%'; ta.style.marginTop = '8px';
      ta.placeholder = 'Not right? e.g. "it was already a few days old", "it\'s vacuum packed"';
      var send = RPGACE.kit.btn('Ask again', ''); send.id = 'bb-guess-send'; send.style.marginTop = '6px';
      pop.box.appendChild(ta); pop.box.appendChild(send);
      var ask = function() {
        acts.innerHTML = ''; send.disabled = true;
        var wait = U._div('bb-note', 'Checking UK food-safety guidance…'); log.appendChild(wait);
        L.guess(name, location, chat).then(function(g) {
          wait.remove(); last = g; chat.push({ who: 'Oracle', text: g.reply || (g.days + ' days') });
          log.appendChild(U._div('bb-row', '🔮 ' + (g.reply || g.days + ' days') + (g.source ? ' (' + g.source + ')' : '')));
          var ok = RPGACE.kit.btn('✅ Use ' + g.days + ' day' + (g.days === 1 ? '' : 's') + ' (' + U._fmt(L.plusDays(L.today(), g.days)) + ')', 'primary'); ok.id = 'bb-guess-ok';
          ok.onclick = function() { pop.close(); done(g.days, g.reply); };
          acts.appendChild(ok); send.disabled = false;
        }, function(e) { wait.remove(); send.disabled = false; U._fail('Oracle could not answer', e); });
      };
      send.onclick = function() { var t = ta.value.trim(); if (!t) return; chat.push({ who: 'Alex', text: t }); log.appendChild(U._div('bb-row', '🧑 ' + t)); ta.value = ''; ask(); };
      ask();
      return pop;
    },
    // After adding one thing by hand: its date.
    askOne: function(opts) {
      var self = RPGACE.modules.bestBefore, U = self.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📅 Best before', title: opts.name + ' · ' + (self.LOC[opts.location] || opts.location), width: '420px' });
      pop.box.id = 'bb-one';
      var f = U.dateField({ name: opts.name, location: opts.location, id: 'bb-one-date' }); pop.box.appendChild(f.el);
      var save = RPGACE.kit.btn('Save date', 'primary'); save.id = 'bb-one-save'; save.style.width = '100%';
      save.onclick = function() {
        if (!f.value()) { RPGACE.utils.toast('Pick the date, or tap 🔮 No date on it', '#E2A83D', 2500); return; }
        save.disabled = true;
        self.logic.add({ ingredient_id: opts.ingredient_id, location: opts.location, best_before: f.value(), source: f.source(), note: f.note() })
          .then(function() { pop.close(); RPGACE.utils.toast('📅 Dated: ' + opts.name, '#3DAA6E', 2000); }, function(e) { save.disabled = false; U._fail('Date not saved', e); });
      };
      pop.box.appendChild(save);
      if (opts.location !== 'fridge') { var skip = RPGACE.kit.btn('Skip - it keeps', ''); skip.id = 'bb-one-skip'; skip.style.cssText += 'width:100%;margin-top:6px;'; skip.onclick = function() { pop.close(); }; pop.box.appendChild(skip); }
      return pop;
    },
    // BB-4: date what's already in stock - fridge first (needed), cupboard + freezer optional.
    bulk: function(onlyIds) {
      var self = RPGACE.modules.bestBefore, L = self.logic, U = self.ui;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📅 Best before', title: 'Date what\'s in stock', width: '500px', scroll: true });
      pop.box.id = 'bb-bulk';
      var host = U._div('', 'Loading your stock…'); pop.box.appendChild(host);
      L.undated().then(function(rows) {
        if (onlyIds) rows = rows.filter(function(r) { return onlyIds.indexOf(r.ingredient_id) > -1; });
        host.innerHTML = '';
        if (!rows.length) { host.appendChild(U._div('bb-note', 'Everything in stock already has a date.')); return; }
        host.appendChild(U._div('bb-note', 'Fridge food needs a date. Cupboard and freezer food mostly keeps - date it only if it matters.'));
        var fields = [];
        ['fridge', 'pantry', 'freezer'].forEach(function(loc) {
          var list = rows.filter(function(r) { return (r.location || 'pantry') === loc; }); if (!list.length) return;
          host.appendChild(U._div('bb-h', self.LOC[loc] + ' (' + list.length + ')'));
          list.forEach(function(r) {
            var name = (r.ingredients && r.ingredients.name) || '?', row = U._div('bb-row'); row.dataset.ing = r.ingredient_id; row.dataset.loc = loc;
            row.appendChild(U._div('bb-name', name));
            var f = U.dateField({ name: name, location: loc }); row.appendChild(f.el); host.appendChild(row);
            fields.push({ r: r, f: f, loc: loc, name: name });
          });
        });
        var save = RPGACE.kit.btn('Save dates', 'primary'); save.id = 'bb-bulk-save'; save.style.cssText += 'width:100%;margin-top:10px;';
        save.onclick = function() {
          var todo = fields.filter(function(x) { return x.f.value(); });
          var missing = fields.filter(function(x) { return x.loc === 'fridge' && !x.f.value(); });
          if (!todo.length) { RPGACE.utils.toast('Add at least one date', '#E2A83D', 2500); return; }
          save.disabled = true; save.textContent = 'Saving…';
          todo.reduce(function(p, x) { return p.then(function() { return L.add({ ingredient_id: x.r.ingredient_id, location: x.loc, best_before: x.f.value(), source: x.f.source(), note: x.f.note() }); }); }, Promise.resolve())
            .then(function() { pop.close(); RPGACE.utils.toast('📅 ' + todo.length + ' dated' + (missing.length ? ' · ' + missing.length + ' fridge item' + (missing.length === 1 ? '' : 's') + ' still undated' : ''), '#3DAA6E', 3000); },
              function(e) { save.disabled = false; save.textContent = 'Save dates'; U._fail('Not all saved', e); });
        };
        host.appendChild(save);
      }, function(e) { host.textContent = '⚠️ Could not load stock: ' + (e.message || e); });
      return pop;
    },
    // BB-5: Use soon + Throw out, with each day's countdown.
    lists: function(host) {
      var self = RPGACE.modules.bestBefore, L = self.logic, U = self.ui;
      U._css(); host.innerHTML = '';
      var box = U._div(''); box.id = 'bb-lists'; box.textContent = 'Loading dates…'; host.appendChild(box);
      var draw = function() { U.lists(host); };
      Promise.all([L.active(), L.undated().catch(function() { return []; })]).then(function(r) {
        var all = r[0], s = L.split(all, L.today()), und = r[1];
        box.innerHTML = '';
        var fridgeUndated = und.filter(function(x) { return x.location === 'fridge'; }).length;
        if (!s.soon.length && !s.out.length) box.appendChild(U._div('bb-note', all.length ? 'Nothing goes off in the next ' + self.SOON_DAYS + ' days.' : 'No dates yet - date your stock so the countdown can start.'));
        if (s.out.length) {
          box.appendChild(U._div('bb-h bb-red', '🗑 Throw out (' + s.out.length + ')'));
          s.out.forEach(function(x) {
            var row = U._div('bb-row bb-out'); row.dataset.id = x.id;
            row.appendChild(U._div('bb-name', ((x.ingredients && x.ingredients.name) || '?') + ' · ' + (self.LOC[x.location] || '')));
            row.appendChild(U._div('bb-left bb-red', 'Best before ' + U._fmt(x.best_before) + ' - ' + L.countdown(x.left)));
            var acts = U._div('bb-acts');
            var th = RPGACE.kit.btn('🗑 Thrown out', 'primary'); th.className = 'bb-thrown';
            th.onclick = function() { th.disabled = true; L.thrownOut(x, all).then(function(res) { RPGACE.utils.toast('🗑 Logged as waste' + (res.zeroed ? ' · stock set to 0' : ' · update the amount in Stock'), 'var(--muted)', 3000); draw(); }, function(e) { th.disabled = false; U._fail('Not saved', e); }); };
            var good = RPGACE.kit.btn('Still good', ''); good.className = 'bb-good';
            good.onclick = function() {
              var d = document.createElement('input'); d.type = 'date'; d.className = 'bb-date bb-newdate'; d.value = L.plusDays(L.today(), 2);
              var ok = RPGACE.kit.btn('Save new date', 'primary'); ok.className = 'bb-newdate-save';
              ok.onclick = function() { ok.disabled = true; L.stillGood(x.id, d.value).then(draw, function(e) { ok.disabled = false; U._fail('Not saved', e); }); };
              acts.innerHTML = ''; acts.appendChild(d); acts.appendChild(ok);
            };
            acts.appendChild(th); acts.appendChild(good); row.appendChild(acts); box.appendChild(row);
          });
        }
        if (s.soon.length) {
          box.appendChild(U._div('bb-h bb-amber', '⏳ Use soon (' + s.soon.length + ')'));
          s.soon.forEach(function(x) {
            var row = U._div('bb-row bb-soon'); row.dataset.id = x.id;
            var top = U._div(''); top.style.cssText = 'display:flex;justify-content:space-between;gap:8px;';
            top.appendChild(U._div('bb-name', ((x.ingredients && x.ingredients.name) || '?') + ' · ' + (self.LOC[x.location] || '')));
            top.appendChild(U._div('bb-left ' + (x.left <= 1 ? 'bb-red' : 'bb-amber'), L.countdown(x.left)));
            row.appendChild(top);
            var acts = U._div('bb-acts'), used = document.createElement('button'); used.type = 'button'; used.className = 'bb-btn bb-used'; used.textContent = '✓ Used it up';
            used.onclick = function() { used.disabled = true; L.close(x.id, 'used').then(draw, function(e) { used.disabled = false; U._fail('Not saved', e); }); };
            acts.appendChild(used); row.appendChild(acts); box.appendChild(row);
          });
          var idea = RPGACE.kit.btn('🔮 What can I make with these?', 'primary'); idea.id = 'bb-ideas'; idea.style.cssText += 'width:100%;margin-top:6px;';
          var out = U._div(''); out.id = 'bb-ideas-out';
          idea.onclick = function() {
            idea.disabled = true; idea.textContent = 'Oracle is thinking…'; out.innerHTML = '';
            L.ideas(s.soon).then(function(res) {
              idea.disabled = false; idea.textContent = '🔮 Ask again';
              res.ideas.forEach(function(i) {
                var c = U._div('bb-row'); c.appendChild(U._div('bb-name', i.title)); if (i.uses.length) c.appendChild(U._div('bb-note', 'Uses: ' + i.uses.join(', '))); if (i.why) c.appendChild(U._div('bb-note', i.why));
                if (i.recipe_id && RPGACE.modules.cookingOracle) { var o = document.createElement('button'); o.type = 'button'; o.className = 'bb-btn'; o.textContent = '📖 Open recipe'; o.onclick = function() { try { RPGACE.modules.cookingOracle.ui._showMyRecipes(); } catch (e) {} }; c.appendChild(o); }
                out.appendChild(c);
              });
              if (res.freeze.length) out.appendChild(U._div('bb-note', '❄️ Freeze today to save it: ' + res.freeze.join(', ')));
            }, function(e) { idea.disabled = false; idea.textContent = '🔮 What can I make with these?'; U._fail('No ideas', e); });
          };
          box.appendChild(idea); box.appendChild(out);
        }
        if (und.length) {
          var dt = RPGACE.kit.btn('📅 Date your stock (' + und.length + ' without a date' + (fridgeUndated ? ', ' + fridgeUndated + ' in the fridge' : '') + ')', ''); dt.id = 'bb-date-stock'; dt.style.cssText += 'width:100%;margin-top:10px;';
          dt.onclick = function() { U.bulk(); }; box.appendChild(dt);
        }
      }, function(e) { box.textContent = '⚠️ Could not load dates: ' + (e.message || e); });
    },
    open: function() {
      var U = RPGACE.modules.bestBefore.ui;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '⏳ Best before', title: 'Use soon · Throw out', width: '480px', scroll: true });
      pop.box.id = 'bb-pop'; var host = U._div(''); pop.box.appendChild(host); U.lists(host);
      return pop;
    },
    // BB-7: after a cook takes stock out - two packs of something? Use the older one first.
    olderNudge: function(host, ingredientIds) {
      var self = RPGACE.modules.bestBefore, L = self.logic, U = self.ui;
      if (!host || !ingredientIds || !ingredientIds.length) return;
      U._css();
      L.active().then(function(rows) {
        var m = L.byIngredient(rows.filter(function(r) { return ingredientIds.indexOf(r.ingredient_id) > -1; }));
        var two = Object.keys(m).filter(function(k) { return m[k].length >= 2; });
        if (!two.length || !host.isConnected) return;
        var box = U._div(''); box.id = 'bb-older'; box.appendChild(U._div('bb-h', '📅 Use the older pack first'));
        two.forEach(function(k) {
          var old = m[k][0], next = m[k][1], row = U._div('bb-row'); row.dataset.ing = k;
          row.appendChild(U._div('', ((old.ingredients && old.ingredients.name) || '?') + ': older pack best before ' + U._fmt(old.best_before) + ' (' + L.countdown(L.daysLeft(old.best_before, L.today())) + '), newer ' + U._fmt(next.best_before)));
          var b = document.createElement('button'); b.type = 'button'; b.className = 'bb-btn bb-used-old'; b.textContent = '✓ Used up the older one';
          b.onclick = function() { b.disabled = true; L.close(old.id, 'used').then(function() { row.textContent = '✓ Done - ' + U._fmt(next.best_before) + ' is the date now.'; }, function(e) { b.disabled = false; U._fail('Not saved', e); }); };
          row.appendChild(b); box.appendChild(row);
        });
        host.appendChild(box);
      }, function() {});
    }
  }
});
/* ===END:bestBefore=== */
