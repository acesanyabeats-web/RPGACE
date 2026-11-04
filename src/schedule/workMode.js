/* ===MODULE:workMode=== */
// WR-8 (Nov 3 2026, plan "Week Review Nov 3"; Alex: Work mode "Auto-open during shift,Cocktails + mocktails",
// spec source "Yes, separate sheet", the Nicco menu is the list). One 💼 Work page: clock in / break / clock out
// (myDay.ui.workRow, links stay in the private work_links table), then every drink on the menu as a big tile ->
// spec card. Drinks live in the private drink_specs table (seeded from the Nicco menu, spec_source 'menu');
// measures, glass, ice, method and garnish fill in from Alex's spec sheet later (spec_source 'sheet').
// Opens by itself once per shift when the app comes up within 30 min of a shift (closing it sticks for that shift).
RPGACE.register('workMode', {
  domain: 'schedule',

  logic: {
    load: function() {
      var self = RPGACE.modules.workMode;
      if (self._rowsP) return self._rowsP;
      self._rowsP = RPGACE.kit.readPrivate('drink_specs', 'select=*&order=section.asc,name.asc').then(function(rows) {
        self._rows = Array.isArray(rows) ? rows : []; return self._rows;
      });
      self._rowsP.catch(function() { self._rowsP = null; });
      return self._rowsP;
    },
    // Pure: menu sections in menu order (signature first, mocktails and celebrations last).
    ORDER: ['Signature', 'Vodka', 'Whiskey', 'Rum', 'Gin', 'Tequila', 'Bartender favourites', 'Sparkling', 'Mocktails', 'Celebrations'],
    sections: function(rows) {
      var L = RPGACE.modules.workMode.logic, seen = {};
      (rows || []).forEach(function(r) { seen[r.section || 'Other'] = 1; });
      return Object.keys(seen).sort(function(a, b) {
        var ia = L.ORDER.indexOf(a), ib = L.ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
      });
    },
    // Pure: filter by section chip / kind / search text (matches name or any ingredient).
    filter: function(rows, o) {
      o = o || {}; var q = String(o.q || '').trim().toLowerCase();
      return (rows || []).filter(function(r) {
        if (o.section && (r.section || 'Other') !== o.section) return false;
        if (o.kind && r.kind !== o.kind) return false;
        if (!q) return true;
        return (r.name || '').toLowerCase().indexOf(q) >= 0 || (r.ingredients || []).some(function(i) { return String(i).toLowerCase().indexOf(q) >= 0; });
      });
    },
    // Pure: the shift happening now (30 min either side), today's or last night's running past midnight.
    // shifts(iso) -> [{start:'HH:MM', end:'HH:MM'}]. Returns {date, start, end} or null.
    shiftNow: function(now, shifts, iso, toMin) {
      var m = now.getHours() * 60 + now.getMinutes(), y = new Date(now.getTime() - 86400000);
      var check = function(date, offset) {
        return (shifts(date) || []).map(function(s) {
          var a = toMin(s.start), b = toMin(s.end); if (a == null || b == null) return null;
          if (b <= a) b += 1440;
          return (m + offset >= a - 30 && m + offset <= b + 30) ? { date: date, start: s.start, end: s.end } : null;
        }).filter(Boolean)[0] || null;
      };
      return check(iso(now), 0) || check(iso(y), 1440);
    },
    current: function() {
      var md = RPGACE.modules.myDay; if (!md) return null;
      var L = md.logic;
      return RPGACE.modules.workMode.logic.shiftNow(new Date(), L.shiftsOn, L.iso, L.toMin);
    },
    _ls: function(k, v) {
      try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
    }
  },

  ui: {
    open: function(opts) {
      opts = opts || {};
      var self = RPGACE.modules.workMode, L = self.logic, U = self.ui, K = RPGACE.kit, dd = RPGACE.modules.dashDeck;
      var shift = L.current();
      // OA-6: opts.host draws the same Work screen inside Live now's work mode instead of a pop-up.
      var pop;
      if (opts.host) { pop = { box: opts.host, close: function() {} }; }
      else {
        var old = document.getElementById('work-mode'); if (old && old.closest('.dd-overlay')) old.closest('.dd-overlay').remove();
        pop = dd._popup({ eyebrow: '💼 Work', title: shift ? 'On shift ' + shift.start + '–' + shift.end : 'Nicco drinks', width: '640px', closeLabel: 'Close' });
        pop.box.id = 'work-mode';
      }
      var md = RPGACE.modules.myDay;
      if (shift && md && md.ui.workRow) { var clock = document.createElement('div'); clock.id = 'work-clock'; md.ui.workRow(clock, shift, shift.date); pop.box.appendChild(clock); }
      var state = { q: '', section: null, kind: null };
      var search = document.createElement('input'); search.id = 'work-search'; search.type = 'search'; search.placeholder = '🔎 Drink or ingredient';
      search.style.cssText = 'width:100%;box-sizing:border-box;font-size:17px;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);margin:8px 0;';
      var chips = document.createElement('div'); chips.id = 'work-chips'; chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      var grid = document.createElement('div'); grid.id = 'work-grid'; grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;';
      pop.box.appendChild(search); pop.box.appendChild(chips); pop.box.appendChild(grid);
      var paintChips = function(rows) {
        chips.innerHTML = '';
        var mk = function(label, on, fn) {
          var b = K.btn(label, on ? 'primary' : ''); b.className += ' work-chip'; b.style.minHeight = '40px'; b.onclick = function() { fn(); paint(); }; chips.appendChild(b);
        };
        mk('All', !state.section && !state.kind, function() { state.section = null; state.kind = null; });
        mk('🍹 Mocktails', state.kind === 'mocktail', function() { state.kind = state.kind === 'mocktail' ? null : 'mocktail'; state.section = null; });
        L.sections(rows).filter(function(s) { return s !== 'Mocktails'; }).forEach(function(s) {
          mk(s, state.section === s, function() { state.section = state.section === s ? null : s; state.kind = null; });
        });
      };
      var paint = function() {
        var rows = self._rows || [];
        paintChips(rows);
        grid.innerHTML = '';
        var list = L.filter(rows, state);
        if (!list.length) { grid.textContent = rows.length ? 'No drink matches.' : 'No drinks saved yet.'; return; }
        list.forEach(function(r) {
          var t = document.createElement('button'); t.type = 'button'; t.className = 'work-tile'; t.dataset.name = r.name;
          t.style.cssText = 'text-align:left;min-height:72px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);cursor:pointer;font-family:inherit;';
          t.innerHTML = '<div style="font-size:16px;font-weight:700;">' + (r.kind === 'mocktail' ? '🍹 ' : '🍸 ') + K.esc(r.name) + '</div>' +
            '<div style="font-size:12px;color:var(--muted);">' + K.esc(r.section || '') + (r.price != null ? ' · £' + Number(r.price).toFixed(2) : '') + '</div>';
          t.onclick = function() { U.spec(r); };
          grid.appendChild(t);
        });
      };
      search.oninput = function() { state.q = search.value; paint(); };
      grid.textContent = 'Loading drinks…';
      L.load().then(paint, function(e) { grid.textContent = '⚠️ Could not load drinks: ' + (e.message || e); });
      return pop;
    },
    // One spec card: big text, readable behind the bar.
    spec: function(r) {
      var K = RPGACE.kit, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: (r.kind === 'mocktail' ? '🍹 ' : '🍸 ') + (r.section || 'Drink'), title: r.name, width: '520px', closeLabel: 'Back' });
      pop.box.id = 'work-spec';
      var m = r.measures && typeof r.measures === 'object' ? r.measures : {};
      var rows = [];
      if (r.price != null) rows.push(['Price', '£' + Number(r.price).toFixed(2)]);
      ['glass', 'ice'].forEach(function(k) { if (r[k]) rows.push([k === 'glass' ? 'Glass' : 'Ice', r[k]]); });
      var html = '<div style="font-size:18px;line-height:1.5;">';
      html += rows.map(function(x) { return '<div><b>' + x[0] + ':</b> ' + K.esc(x[1]) + '</div>'; }).join('');
      html += '<div style="margin-top:10px;font-weight:700;">Ingredients</div><ul id="work-spec-ings" style="margin:4px 0 0 18px;padding:0;">' +
        (r.ingredients || []).map(function(i) { return '<li>' + (m[i] ? '<b>' + K.esc(m[i]) + '</b> ' : '') + K.esc(i) + '</li>'; }).join('') + '</ul>';
      if (r.method) html += '<div style="margin-top:10px;"><b>Method:</b> ' + K.esc(r.method) + '</div>';
      if (r.garnish) html += '<div><b>Garnish:</b> ' + K.esc(r.garnish) + '</div>';
      if (r.notes) html += '<div style="margin-top:8px;color:var(--gold);">' + K.esc(r.notes) + '</div>';
      html += '</div>';
      if (r.spec_source === 'menu') html += '<div id="work-spec-flag" style="margin-top:12px;font-size:13px;color:var(--muted);">From the menu only. Measures, glass and method come from your spec sheet once it\'s added.</div>';
      var body = document.createElement('div'); body.innerHTML = html; pop.box.appendChild(body);
      return pop;
    },
    // Once per shift: open by itself when the app comes up during a shift.
    autoOpen: function() {
      var self = RPGACE.modules.workMode, L = self.logic, sh = L.current();
      if (!sh || document.getElementById('work-mode') || document.querySelector('.dd-overlay')) return null;
      var key = 'work_auto_' + sh.date + '_' + sh.start;
      if (L._ls(key)) return null;
      L._ls(key, String(Date.now()));
      return self.ui.open();
    }
  },

  open: function() { return this.ui.open(); },
  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(function() { try { self.ui.autoOpen(); } catch (e) {} }, 5000); });
    document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') setTimeout(function() { try { self.ui.autoOpen(); } catch (e) {} }, 2000); });
  }
});
/* ===END:workMode=== */
