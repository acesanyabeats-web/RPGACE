/* ===MODULE:moneyHub=== */
// Oct 17 2026 — SH-5b of the ratified plan "Selling (Hustler)"
// (records/2026-10/selling_hustler_ceo_plan_2026-10-17.txt). One Money page
// shared by Hustler and Steward (Alex: "make them accessible from both
// hustler and steward since both have a stake to the same page"): money in
// this month (sellingHub.logic.money - one source), money out (active
// subscriptions as a monthly cost + this month's business purchases), the
// gap, renewals to confirm, business purchases with a private receipt photo
// Oracle reads, and the UK tax-year list of business costs.
// Data: private subscriptions; chronicles_finance (type expense, business,
// receipt_id -> screenshots row tagged receipt, subscription_id).
RPGACE.register('moneyHub', {
  domain: 'habits',

  init: function() {
    var self = RPGACE.modules.moneyHub;
    RPGACE.AREAS.money.hub = function() { self.open(); };
    RPGACE.hooks.on('page:show', function(name) {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || name !== P.money) return;
      self.ui.injectPage();
      self.ui.render();
    });
    [0, 1700].forEach(function(ms) { setTimeout(function() { self.ui.injectPage(); }, ms); });
  },

  // from: 'selling' (Hustler) or 'wishlist' / 'habits' (Steward) - shapes the Back row.
  open: function(from) {
    if (from) this._from = from;
    this.ui.injectPage();
    if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.money);
  },

  logic: {
    CATEGORIES: ['Samples', 'Plugins / VSTs', 'Software', 'Gear', 'Subscriptions', 'Other'],
    read: function(table, params) {
      var tp = RPGACE.modules.tripPlans;
      return tp ? tp.logic.read(table, params).then(function(r) { return Array.isArray(r) ? r : []; }) : Promise.resolve([]);
    },
    iso: function(d) { d = d ? new Date(d) : new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    r2: function(x) { return Math.round(Number(x) * 100) / 100; },
    // Pure: the UK tax year (6 Apr - 5 Apr) a day falls in.
    taxYear: function(iso) {
      var y = Number(String(iso).slice(0, 4)), md = String(iso).slice(5, 10);
      var start = md >= '04-06' ? y : y - 1;
      return { from: start + '-04-06', to: (start + 1) + '-04-05', label: start + '/' + String(start + 1).slice(2) };
    },
    // Pure: a subscription's cost per month.
    monthlyCost: function(sub) {
      var a = Number(sub && sub.amount) || 0;
      return RPGACE.modules.moneyHub.logic.r2(sub && sub.cycle === 'yearly' ? a / 12 : a);
    },
    // Pure: the next renewal after a date (month-end safe: 31 Jan -> 28/29 Feb).
    nextDate: function(iso, cycle) {
      var y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10));
      if (cycle === 'yearly') y += 1; else { m += 1; if (m > 12) { m = 1; y += 1; } }
      var last = new Date(y, m, 0).getDate();
      return y + '-' + String(m).padStart(2, '0') + '-' + String(Math.min(d, last)).padStart(2, '0');
    },
    cleanSub: function(f) {
      var L = RPGACE.modules.moneyHub.logic, name = String(f.name || '').trim().slice(0, 60), amt = L.r2(f.amount);
      if (!name) return { error: 'Give the subscription a name' };
      if (!(amt >= 0) || f.amount === '' || f.amount == null || !isFinite(amt)) return { error: 'Add what it costs' };
      var cycle = f.cycle === 'yearly' ? 'yearly' : 'monthly';
      var next = /^\d{4}-\d{2}-\d{2}$/.test(String(f.next_renewal || '')) ? f.next_renewal : null;
      if (!next) return { error: 'Add the next renewal date' };
      return { row: { name: name, amount: amt, cycle: cycle, next_renewal: next, category: String(f.category || 'Software').slice(0, 40),
        business: f.business !== false, notes: String(f.notes || '').trim().slice(0, 300) || null } };
    },
    saveSub: function(id, f) {
      var r = RPGACE.modules.moneyHub.logic.cleanSub(f);
      if (r.error) return Promise.reject(new Error(r.error));
      r.row.updated_at = new Date().toISOString();
      return (id ? RPGACE.sb.secureWrite('subscriptions', 'update', r.row, 'id=eq.' + id)
        : RPGACE.sb.secureWrite('subscriptions', 'insert', r.row)).then(function(d) { return Object.assign({ id: id }, r.row, Array.isArray(d) && d[0] ? d[0] : {}); });
    },
    endSub: function(sub) {
      var upd = { active: false, ended_on: RPGACE.modules.moneyHub.logic.iso(), updated_at: new Date().toISOString() };
      return RPGACE.sb.secureWrite('subscriptions', 'update', upd, 'id=eq.' + sub.id).then(function() { Object.assign(sub, upd); return sub; });
    },
    deleteSub: function(sub) { return RPGACE.sb.secureWrite('subscriptions', 'delete', null, 'id=eq.' + sub.id); },
    // Pure: the expense row a renewal logs.
    renewalRow: function(sub, amount) {
      var L = RPGACE.modules.moneyHub.logic, a = L.r2(amount == null || amount === '' ? sub.amount : amount);
      if (!(a > 0)) return { error: 'Add what was charged' };
      return { row: { type: 'expense', entry_date: sub.next_renewal, category: 'Subscriptions', item: (sub.name + ' renewal').slice(0, 120), amount: a,
        business: !!sub.business, subscription_id: sub.id, notes: sub.cycle === 'yearly' ? 'Yearly' : 'Monthly' } };
    },
    // Log this renewal once (never twice for the same date), then move the date on.
    confirmRenewal: function(sub, amount) {
      var L = RPGACE.modules.moneyHub.logic, r = L.renewalRow(sub, amount);
      if (r.error) return Promise.reject(new Error(r.error));
      return Promise.resolve(RPGACE.sb.select('chronicles_finance', 'select=id&subscription_id=eq.' + sub.id + '&entry_date=eq.' + sub.next_renewal + '&limit=1')).catch(function() { return []; })
        .then(function(have) {
          return (have && have[0]) ? null : RPGACE.sb.secureWrite('chronicles_finance', 'insert', r.row);
        }).then(function() {
          try { RPGACE.cache.clear('chronicles_finance'); } catch (e) {}
          var upd = { next_renewal: L.nextDate(sub.next_renewal, sub.cycle), updated_at: new Date().toISOString() };
          return RPGACE.sb.secureWrite('subscriptions', 'update', upd, 'id=eq.' + sub.id).then(function() { Object.assign(sub, upd); return sub; });
        });
    },
    // Pure: a business purchase as an expense row.
    expenseRow: function(f, today) {
      var L = RPGACE.modules.moneyHub.logic, a = L.r2(f.amount), item = String(f.item || '').trim();
      if (!item) return { error: 'Say what you bought' };
      if (!(a > 0)) return { error: 'Add what you paid' };
      var shop = String(f.shop || '').trim();
      return { row: { type: 'expense', entry_date: /^\d{4}-\d{2}-\d{2}$/.test(String(f.date || '')) ? f.date : today, category: L.CATEGORIES.indexOf(f.category) > -1 ? f.category : 'Other',
        item: item.slice(0, 120), amount: a, business: true, receipt_id: f.receipt_id || null, notes: shop ? ('Shop: ' + shop).slice(0, 200) : null } };
    },
    addExpense: function(f) {
      var L = RPGACE.modules.moneyHub.logic, r = L.expenseRow(f, L.iso());
      if (r.error) return Promise.reject(new Error(r.error));
      return RPGACE.sb.secureWrite('chronicles_finance', 'insert', r.row).then(function(d) {
        try { RPGACE.cache.clear('chronicles_finance'); } catch (e) {}
        return Object.assign({}, r.row, Array.isArray(d) && d[0] ? d[0] : {});
      });
    },
    // Upload a receipt photo privately (same store as milestone proofs).
    uploadReceipt: function(file) {
      var si = RPGACE.modules.screenshotInbox;
      if (!si) return Promise.reject(new Error('Screenshot store is not loaded'));
      return si.logic.upload(file, 'receipt', ['steward', 'hustler']);
    },
    RECEIPT_SYSTEM: RPGACE.prompt('receipt_read'), // RF-7: prompts/receipt_read.md
    // Pure: fence-tolerant parse of the receipt reply.
    parseReceipt: function(raw) {
      var L = RPGACE.modules.moneyHub.logic, t = String(raw || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      var o; try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
      var amt = Number(String(o.amount == null ? '' : o.amount).replace(/[£,\s]/g, ''));
      return { shop: String(o.shop || '').slice(0, 80), item: String(o.item || '').slice(0, 120), amount: amt > 0 ? L.r2(amt) : null,
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(o.date || '')) ? o.date : null, category: L.CATEGORIES.indexOf(o.category) > -1 ? o.category : 'Other' };
    },
    readReceipt: function(image) {
      var L = RPGACE.modules.moneyHub.logic;
      return RPGACE.utils.oracleVision(image, L.RECEIPT_SYSTEM, 'Read this receipt.', 300).then(L.parseReceipt);
    },
    receiptUrl: function(id) {
      var si = RPGACE.modules.screenshotInbox;
      if (!si || !id) return Promise.resolve(null);
      return si.logic.api('list', { receipt: true, id: id, limit: 1 }).then(function(rows) { return rows && rows[0] ? rows[0].url : null; });
    },
    load: function(now) {
      var L = RPGACE.modules.moneyHub.logic, sh = RPGACE.modules.sellingHub, today = L.iso(now), ty = L.taxYear(today);
      var from = [ty.from, today.slice(0, 8) + '01'].sort()[0];
      var safe = function(p) { return Promise.resolve(p).catch(function() { return []; }); };
      return Promise.all([
        safe(L.read('subscriptions', 'select=*&order=next_renewal.asc&limit=200')),
        safe(RPGACE.sb.select('chronicles_finance', 'select=id,type,amount,entry_date,item,category,notes,income_kind,business,receipt_id,subscription_id,content_production_id&entry_date=gte.' + from + '&order=entry_date.desc&limit=3000')),
        safe(L.read('xp_settings', 'select=monthly_income_target,revenue_target&id=eq.1'))
      ]).then(function(r) { return L.model(r[0], r[1], r[2][0] || null, now); });
    },
    // Pure: everything the page shows.
    model: function(subs, rows, settings, now) {
      var L = RPGACE.modules.moneyHub.logic, sh = RPGACE.modules.sellingHub, today = L.iso(now), ym = today.slice(0, 7), ty = L.taxYear(today);
      subs = subs || []; rows = rows || [];
      var active = subs.filter(function(s) { return s.active !== false; });
      var subsMonthly = L.r2(active.reduce(function(a, s) { return a + L.monthlyCost(s); }, 0));
      var exp = rows.filter(function(x) { return x.type === 'expense'; });
      var oneOffs = exp.filter(function(x) { return x.business && !x.subscription_id && String(x.entry_date).slice(0, 7) === ym; });
      var oneOffMonth = L.r2(oneOffs.reduce(function(a, x) { return a + (Number(x.amount) || 0); }, 0));
      var sales = rows.filter(function(x) { return x.type === 'sale'; });
      var moneyIn = sh ? sh.logic.money(sales, [], sh.logic.targetOf(settings), now) : { month: 0 };
      var out = L.r2(subsMonthly + oneOffMonth);
      var taxRows = exp.filter(function(x) { return x.business && x.entry_date >= ty.from && x.entry_date <= ty.to; });
      return {
        today: today, taxYear: ty, subs: subs, active: active, subsMonthly: subsMonthly, oneOffMonth: oneOffMonth, out: out,
        moneyIn: moneyIn, gap: L.r2((moneyIn.month || 0) - out),
        due: active.filter(function(s) { return s.next_renewal && s.next_renewal <= today; }),
        taxRows: taxRows, taxTotal: L.r2(taxRows.reduce(function(a, x) { return a + (Number(x.amount) || 0); }, 0)),
        noReceipt: taxRows.filter(function(x) { return !x.receipt_id && !x.subscription_id; }).length
      };
    },
    loadDue: function() {
      var L = RPGACE.modules.moneyHub.logic, tp = RPGACE.modules.tripPlans;
      if (!tp || !tp.logic.signedIn()) return Promise.resolve([]);
      return L.read('subscriptions', 'select=id,name,amount,next_renewal&active=eq.true&next_renewal=lte.' + L.iso() + '&order=next_renewal.asc&limit=20').then(function(due) {
        return due.map(function(s) {
          return { icon: '💳', text: s.name + ' £' + Number(s.amount).toFixed(2).replace(/\.00$/, '') + ' renewed — confirm', sub: 'Money · renewal ' + s.next_renewal,
            hot: false, go: function() { RPGACE.modules.moneyHub.open(); } };
        });
      });
    }
  },

  ui: {
    css: function() {
      var sh = RPGACE.modules.sellingHub;
      var base = sh ? sh.ui.css().replace(/sh-/g, 'mh-') : '';
      return base + '.mh-big{display:flex;flex-wrap:wrap;gap:8px 18px;font-variant-numeric:tabular-nums;font-size:15px;margin:4px 0}' +
        '.mh-big b{font-size:18px}.mh-neg{color:#CC4A4A}.mh-pos{color:var(--green)}' +
        '.mh-check{display:flex;align-items:center;gap:8px;min-height:44px;font-size:14px;color:var(--text)}';
    },
    _css: function() {
      if (document.getElementById('mh-css')) return;
      var st = document.createElement('style'); st.id = 'mh-css'; st.textContent = this.css(); document.head.appendChild(st);
    },
    injectPage: function() {
      var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!P || document.getElementById('page-' + P.money)) return;
      var app = document.getElementById('app');
      if (!app) return;
      this._css();
      var page = document.createElement('div'); page.className = 'page'; page.id = 'page-' + P.money;
      page.innerHTML = '<div class="section-title">💷 Money</div><div id="mh-bar"></div>' +
        '<div class="mh-track">📅 This month</div><div class="mh-track-sub">Money in − money out</div><div id="mh-month"></div>' +
        '<div class="mh-track">💳 Subscriptions</div><div class="mh-track-sub">What runs your music and this app, per month</div><div id="mh-subs"></div>' +
        '<div class="mh-track">🧾 Business purchases</div><div class="mh-track-sub">Samples, plugins, gear — with receipts</div><div id="mh-tax"></div>';
      app.appendChild(page);
    },
    // Back row: the side Alex came from (Selling = Hustler, Wishlist = Steward).
    bar: function() {
      var M = RPGACE.modules.moneyHub, el = document.createElement('div'); el.id = 'mh-bar'; el.className = 'area-bar';
      RPGACE.areaNav._css();
      var add = function(cls, label, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.onclick = fn; el.appendChild(b); };
      var sh = RPGACE.modules.sellingHub, wl = RPGACE.modules.shoppingWishlist;
      if (sh) add('mh-go-selling', '💼 Selling (Hustler)', function() { sh.open(); });
      if (wl) add('mh-go-wishlist', '🛒 Wishlist (Steward)', function() { if (wl.ui && wl.ui._showMain) wl.ui._showMain(); });
      if (M._from === 'wishlist' && el.children.length === 2) el.insertBefore(el.children[1], el.children[0]);
      if (el.firstChild) el.firstChild.textContent = '← ' + el.firstChild.textContent;
      // SL-0: Money draws its own Back row, so it gets the shared ☰ here.
      var P = RPGACE.CONFIG.pages, host = document.getElementById('page-' + P.money);
      if (RPGACE.sideList) RPGACE.sideList.wire(host, el, function() { return RPGACE.sideList.optsFor('money', host, { page: P.money }); });
      return el;
    },
    _f: function(x) { return '£' + Number(x || 0).toFixed(2).replace(/\.00$/, ''); },
    _btn: function(label, cls, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'mh-row-btn ' + (cls || ''); b.textContent = label; b.onclick = fn; return b; },
    _fail: function(what, e) { RPGACE.utils.toast('⚠️ ' + what + ': ' + (e && e.message || e), '#CC4A4A', 4000, 'moneyHub'); },
    _pop: function(title, closeLabel) {
      this._css();
      return RPGACE.modules.dashDeck._popup({ eyebrow: '💷 Money', title: title, accent: 'var(--gold)', width: '480px', closeLabel: closeLabel || 'Close' });
    },
    _refresh: function() {
      var P = RPGACE.CONFIG.pages, pg = document.getElementById('page-' + P.money);
      if (pg && pg.offsetParent !== null) RPGACE.modules.moneyHub.ui.render();
    },
    render: function() {
      var M = RPGACE.modules.moneyHub, U = M.ui, month = document.getElementById('mh-month');
      if (!month) return;
      var bar = document.getElementById('mh-bar'); if (bar) bar.replaceWith(U.bar());
      month.textContent = 'Loading…';
      M.logic.load(Date.now()).then(function(m) { M._model = m; U.renderMonth(m); U.renderSubs(m); U.renderTax(m); })
        .catch(function(e) { month.textContent = '⚠️ Could not load Money: ' + (e && e.message || e); });
    },
    renderMonth: function(m) {
      var U = RPGACE.modules.moneyHub.ui, sh = RPGACE.modules.sellingHub, el = document.getElementById('mh-month');
      el.textContent = '';
      var card = document.createElement('div'); card.className = 'mh-step'; card.id = 'mh-month-card';
      var big = document.createElement('div'); big.className = 'mh-big';
      [['In', m.moneyIn.month || 0, ''], ['Out', m.out, ''], ['Gap', m.gap, m.gap < 0 ? 'mh-neg' : 'mh-pos']].forEach(function(x) {
        var s = document.createElement('span'); s.id = 'mh-' + x[0].toLowerCase();
        s.appendChild(document.createTextNode(x[0] + ' ')); var b = document.createElement('b'); b.textContent = (x[0] === 'Gap' && x[1] > 0 ? '+' : '') + U._f(x[1]); if (x[2]) b.className = x[2]; s.appendChild(b); big.appendChild(s);
      });
      card.appendChild(big);
      var line = document.createElement('div'); line.className = 'mh-row-s'; line.id = 'mh-month-line';
      line.textContent = 'Out = subscriptions ' + U._f(m.subsMonthly) + '/month + business purchases this month ' + U._f(m.oneOffMonth) +
        (sh && m.moneyIn.target ? ' · income target: ' + sh.logic.moneyLine(m.moneyIn) : '');
      card.appendChild(line);
      el.appendChild(card);
    },
    renderSubs: function(m) {
      var M = RPGACE.modules.moneyHub, U = M.ui, el = document.getElementById('mh-subs');
      el.textContent = '';
      var list = document.createElement('div'); list.className = 'mh-list';
      m.due.forEach(function(s) {
        var row = document.createElement('div'); row.className = 'mh-row mh-due'; row.dataset.id = s.id;
        var tx = document.createElement('div'); tx.className = 'mh-row-tx';
        var t = document.createElement('div'); t.className = 'mh-row-t'; t.textContent = '💳 ' + s.name + ' renewed ' + s.next_renewal;
        var sub = document.createElement('div'); sub.className = 'mh-row-s'; sub.textContent = 'Confirm what was charged';
        tx.appendChild(t); tx.appendChild(sub);
        var acts = document.createElement('div'); acts.className = 'mh-links';
        acts.appendChild(U._btn('✅ Confirm ' + U._f(s.amount), 'mh-renew', function() { U.askRenewal(s); }));
        acts.appendChild(U._btn('✖ Cancelled', 'mh-ended', function() { M.logic.endSub(s).then(function() { RPGACE.utils.toast(s.name + ' ended', 'var(--muted)', 2000); U._refresh(); }, function(e) { U._fail('Not saved', e); }); }));
        row.appendChild(tx); row.appendChild(acts); list.appendChild(row);
      });
      m.active.forEach(function(s) {
        var row = document.createElement('div'); row.className = 'mh-row mh-sub'; row.dataset.id = s.id;
        var tx = document.createElement('div'); tx.className = 'mh-row-tx';
        var t = document.createElement('div'); t.className = 'mh-row-t'; t.textContent = s.name + ' · ' + U._f(s.amount) + (s.cycle === 'yearly' ? '/year (' + U._f(M.logic.monthlyCost(s)) + '/month)' : '/month');
        var sub = document.createElement('div'); sub.className = 'mh-row-s'; sub.textContent = [s.category, s.business ? 'business' : 'personal', 'next ' + s.next_renewal].filter(Boolean).join(' · ');
        tx.appendChild(t); tx.appendChild(sub);
        var acts = document.createElement('div'); acts.className = 'mh-links';
        acts.appendChild(U._btn('✏️ Edit', 'mh-sub-edit', function() { U.editSub(s); }));
        row.appendChild(tx); row.appendChild(acts); list.appendChild(row);
      });
      if (!m.active.length) { var none = document.createElement('div'); none.className = 'mh-row-s'; none.textContent = 'No subscriptions yet. Add Arcade, Claude, your DAW plan…'; list.appendChild(none); }
      var bs = document.createElement('div'); bs.className = 'mh-step-btns';
      bs.appendChild(Object.assign(U._btn('＋ Add subscription', 'mh-btn', function() { U.editSub(null); }), { id: 'mh-sub-add' }));
      el.appendChild(list); el.appendChild(bs);
    },
    renderTax: function(m) {
      var M = RPGACE.modules.moneyHub, U = M.ui, el = document.getElementById('mh-tax');
      el.textContent = '';
      var head = document.createElement('div'); head.className = 'mh-row-t'; head.id = 'mh-tax-line';
      head.textContent = 'Tax year ' + m.taxYear.label + ': ' + U._f(m.taxTotal) + ' business costs · ' + m.taxRows.length + ' item' + (m.taxRows.length === 1 ? '' : 's') + (m.noReceipt ? ' · ' + m.noReceipt + ' without a receipt' : '');
      el.appendChild(head);
      var bs = document.createElement('div'); bs.className = 'mh-step-btns';
      bs.appendChild(Object.assign(U._btn('📷 Add purchase (receipt)', 'mh-btn', function() { U.addPurchase(); }), { id: 'mh-buy-add' }));
      el.appendChild(bs);
      var list = document.createElement('div'); list.className = 'mh-list'; list.id = 'mh-tax-list';
      m.taxRows.forEach(function(x) {
        var row = document.createElement('div'); row.className = 'mh-row mh-tax-row'; row.dataset.id = x.id;
        var tx = document.createElement('div'); tx.className = 'mh-row-tx';
        var t = document.createElement('div'); t.className = 'mh-row-t'; t.textContent = x.item + ' · ' + U._f(x.amount);
        var s = document.createElement('div'); s.className = 'mh-row-s'; s.textContent = [x.entry_date, x.category, x.notes].filter(Boolean).join(' · ');
        tx.appendChild(t); tx.appendChild(s); row.appendChild(tx);
        if (x.receipt_id) { var acts = document.createElement('div'); acts.className = 'mh-links'; acts.appendChild(U._btn('🧾 Receipt', 'mh-receipt', function() { U.showReceipt(x.receipt_id); })); row.appendChild(acts); }
        list.appendChild(row);
      });
      el.appendChild(list);
    },
    showReceipt: function(id) {
      var M = RPGACE.modules.moneyHub, U = M.ui;
      M.logic.receiptUrl(id).then(function(url) {
        if (!url) { U._fail('Receipt not found', ''); return; }
        var pop = U._pop('🧾 Receipt');
        var img = document.createElement('img'); img.src = url; img.alt = 'Receipt photo'; img.style.cssText = 'max-width:100%;border-radius:8px;';
        pop.box.appendChild(img);
      }, function(e) { U._fail('Receipt not loaded', e); });
    },
    askRenewal: function(sub) {
      var M = RPGACE.modules.moneyHub, U = M.ui, pop = U._pop('✅ ' + sub.name + ' renewal', 'Cancel');
      var lab = document.createElement('label'); lab.className = 'mh-lbl'; lab.htmlFor = 'mh-renew-amt'; lab.textContent = 'Charged on ' + sub.next_renewal + ' (£)';
      var inp = document.createElement('input'); inp.id = 'mh-renew-amt'; inp.className = 'mh-in'; inp.type = 'number'; inp.min = '0'; inp.step = '0.01'; inp.inputMode = 'decimal'; inp.value = sub.amount;
      var save = Object.assign(document.createElement('button'), { type: 'button', id: 'mh-renew-save', className: 'mh-main', textContent: '✅ Log it' });
      save.onclick = function() {
        save.disabled = true;
        M.logic.confirmRenewal(sub, inp.value).then(function(s) {
          pop.close(); RPGACE.utils.toast('💳 Logged · next ' + s.next_renewal, 'var(--green)', 2200); U._refresh();
        }, function(e) { save.disabled = false; U._fail('Renewal not logged', e); });
      };
      pop.box.appendChild(lab); pop.box.appendChild(inp); pop.box.appendChild(save);
    },
    editSub: function(sub) {
      var M = RPGACE.modules.moneyHub, L = M.logic, U = M.ui, s = sub || {};
      var pop = U._pop(sub ? 'Edit ' + sub.name : '＋ Subscription', 'Cancel');
      var form = document.createElement('div'); form.id = 'mh-sub-form';
      var mk = function(id, label, el) { var l = document.createElement('label'); l.className = 'mh-lbl'; l.htmlFor = id; l.textContent = label; el.id = id; el.className = 'mh-in'; form.appendChild(l); form.appendChild(el); return el; };
      var name = mk('mh-s-name', 'Name *', document.createElement('input')); name.maxLength = 60; name.placeholder = 'e.g. Arcade'; name.value = s.name || '';
      var amt = mk('mh-s-amount', 'Price (£) *', document.createElement('input')); amt.type = 'number'; amt.min = '0'; amt.step = '0.01'; amt.inputMode = 'decimal'; amt.value = s.amount != null ? s.amount : '';
      var cyc = mk('mh-s-cycle', 'Billed', document.createElement('select'));
      [['monthly', 'Monthly'], ['yearly', 'Yearly']].forEach(function(c) { var o = document.createElement('option'); o.value = c[0]; o.textContent = c[1]; cyc.appendChild(o); }); cyc.value = s.cycle || 'monthly';
      var next = mk('mh-s-next', 'Next renewal *', document.createElement('input')); next.type = 'date'; next.value = s.next_renewal || '';
      var cat = mk('mh-s-cat', 'Category', document.createElement('select'));
      L.CATEGORIES.forEach(function(c) { var o = document.createElement('option'); o.value = c; o.textContent = c; cat.appendChild(o); }); cat.value = s.category || 'Software';
      var bl = document.createElement('label'); bl.className = 'mh-check'; var bx = document.createElement('input'); bx.type = 'checkbox'; bx.id = 'mh-s-business'; bx.checked = s.business !== false;
      bl.appendChild(bx); bl.appendChild(document.createTextNode('For the business (counts for tax)')); form.appendChild(bl);
      var save = Object.assign(document.createElement('button'), { type: 'button', id: 'mh-s-save', className: 'mh-main', textContent: sub ? '💾 Save' : '＋ Add subscription' });
      save.onclick = function() {
        save.disabled = true;
        L.saveSub(sub && sub.id, { name: name.value, amount: amt.value, cycle: cyc.value, next_renewal: next.value, category: cat.value, business: bx.checked }).then(function() {
          pop.close(); RPGACE.utils.toast('💳 ' + (sub ? 'Saved' : 'Added') + ' ' + name.value.trim(), 'var(--green)', 2000); U._refresh();
        }, function(e) { save.disabled = false; U._fail('Not saved', e); });
      };
      form.appendChild(save);
      if (sub) {
        var acts = document.createElement('div'); acts.className = 'mh-links'; acts.style.marginTop = '10px';
        acts.appendChild(U._btn('✖ Cancelled it', 'mh-s-end', function() { L.endSub(sub).then(function() { pop.close(); U._refresh(); }, function(e) { U._fail('Not saved', e); }); }));
        var armed = false, del = U._btn('🗑 Delete', 'mh-s-del', function() {
          if (!armed) { armed = true; del.textContent = 'Tap again to delete'; setTimeout(function() { armed = false; del.textContent = '🗑 Delete'; }, 3000); return; }
          L.deleteSub(sub).then(function() { pop.close(); U._refresh(); }, function(e) { U._fail('Not deleted', e); });
        });
        acts.appendChild(del); form.appendChild(acts);
      }
      pop.box.appendChild(form);
    },
    // Photo first (optional): stored privately, read by Oracle, then checked by Alex.
    addPurchase: function() {
      var M = RPGACE.modules.moneyHub, L = M.logic, U = M.ui, pop = U._pop('🧾 Business purchase', 'Cancel');
      var box = document.createElement('div'); box.id = 'mh-buy';
      var note = document.createElement('div'); note.className = 'mh-row-s'; note.textContent = 'Add the receipt photo and Oracle fills this in — or just type it.';
      var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.id = 'mh-buy-file'; file.setAttribute('aria-label', 'Receipt photo');
      var status = document.createElement('div'); status.className = 'mh-row-s'; status.id = 'mh-buy-status';
      var form = document.createElement('div');
      var mk = function(id, label, el) { var l = document.createElement('label'); l.className = 'mh-lbl'; l.htmlFor = id; l.textContent = label; el.id = id; el.className = 'mh-in'; form.appendChild(l); form.appendChild(el); return el; };
      var item = mk('mh-b-item', 'What *', document.createElement('input')); item.maxLength = 120; item.placeholder = 'e.g. Drum kit, Serum';
      var shop = mk('mh-b-shop', 'Shop', document.createElement('input')); shop.maxLength = 80;
      var amt = mk('mh-b-amount', 'Paid (£) *', document.createElement('input')); amt.type = 'number'; amt.min = '0'; amt.step = '0.01'; amt.inputMode = 'decimal';
      var date = mk('mh-b-date', 'Date', document.createElement('input')); date.type = 'date'; date.value = L.iso();
      var cat = mk('mh-b-cat', 'Category', document.createElement('select'));
      L.CATEGORIES.forEach(function(c) { var o = document.createElement('option'); o.value = c; o.textContent = c; cat.appendChild(o); }); cat.value = 'Samples';
      var receiptId = null;
      file.onchange = function() {
        var f = file.files && file.files[0]; if (!f) return;
        status.textContent = 'Saving the receipt…';
        L.uploadReceipt(f).then(function(r) {
          receiptId = r.row && r.row.id; status.textContent = '🧾 Saved privately. Oracle is reading it…';
          return L.readReceipt(r.image).then(function(p) {
            if (!p) { status.textContent = '🧾 Saved. Oracle could not read it — type the details.'; return; }
            if (p.item) item.value = p.item; if (p.shop) shop.value = p.shop; if (p.amount != null) amt.value = p.amount; if (p.date) date.value = p.date; if (p.category) cat.value = p.category;
            status.textContent = '🧾 Saved and read — check it, then save.';
          }, function() { status.textContent = '🧾 Saved. Oracle could not read it — type the details.'; });
        }, function(e) { status.textContent = ''; U._fail('Receipt not saved', e); });
      };
      var save = Object.assign(document.createElement('button'), { type: 'button', id: 'mh-b-save', className: 'mh-main', textContent: '💾 Save purchase' });
      save.onclick = function() {
        save.disabled = true;
        L.addExpense({ item: item.value, shop: shop.value, amount: amt.value, date: date.value, category: cat.value, receipt_id: receiptId }).then(function(r) {
          pop.close(); RPGACE.utils.toast('🧾 ' + r.item + ' ' + U._f(r.amount) + ' logged' + (receiptId ? ' with receipt' : ''), 'var(--green)', 2400); U._refresh();
        }, function(e) { save.disabled = false; U._fail('Not saved', e); });
      };
      form.appendChild(save);
      box.appendChild(note); box.appendChild(file); box.appendChild(status); box.appendChild(form);
      pop.box.appendChild(box);
    }
  }
});
/* ===END:moneyHub=== */
