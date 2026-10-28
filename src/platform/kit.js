/* ===MODULE:kit=== */
// CK-6 (Oct 28 2026, plan "Caps and Central Kit"; Alex: "we should also see what structures should become a
// universal central construction rather than domain specific"). The small helpers every module was re-writing:
// 19 private _esc copies, 15+ _btn copies, iso/addDays date helpers in 6 modules, 2-click delete arming, the
// private-table read and GM-7's search list. One copy each here, reachable as RPGACE.kit.* from any module.
// Modules switch over when they are next touched; scripts/check_kit_copies.py flags NEW private copies.
// Doc: docs/claude/kit.md.
RPGACE.register('kit', {
  domain: 'platform',
  init: function() {},

  logic: {
    // HTML-escape for innerHTML (& < > " '). One implementation: RPGACE.utils.escapeHtml.
    esc: function(s) { return RPGACE.utils.escapeHtml(s); },
    // Local-date helpers (YYYY-MM-DD, never UTC-shifted).
    iso: function(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    today: function() { return RPGACE.kit.iso(new Date()); },
    addDays: function(isoDay, n) { var d = new Date(isoDay + 'T12:00:00'); d.setDate(d.getDate() + n); return RPGACE.kit.iso(d); },
    // en-GB display: 'Wed 28 Oct' (opts.long -> 'Wednesday 28 October').
    fmt: function(isoDay, opts) {
      var d = new Date(String(isoDay).slice(0, 10) + 'T12:00:00');
      return d.toLocaleDateString('en-GB', opts && opts.long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
    },
    // CK-7: the one door for one-shot Oracle calls (text, or parsed JSON with opts.json). It goes through
    // phylumPath's ground-worker path, so credit-exhaustion fallback queueing (opts.context) is shared.
    // Chat stays on callOracle, images on RPGACE.utils.oracleVision, Professor on oracleProfessor (streaming).
    ask: function(prompt, opts) {
      opts = opts || {};
      var pp = RPGACE.modules.phylumPath;
      if (!pp) return Promise.reject(new Error('Oracle call path not loaded'));
      return opts.json ? pp.logic._callGroundWorkerJSON(prompt, opts.max || 1000, opts.model, opts.context)
        : pp.logic._callGroundWorkerText(prompt, opts.max || 1000, opts.model, opts.context);
    },
    // Private tables (RLS, no anon read) through /api/data-write action 'read' after sign-in; [] when signed out.
    readPrivate: function(table, params) {
      var ag = RPGACE.modules.authGate;
      if (!(ag && ag._apiSecret)) return Promise.resolve([]);
      return fetch('/api/data-write', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', table: table, params: params || 'select=*' }) })
        .then(function(r) { return r.json().catch(function() { return {}; }).then(function(d) {
          if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
          return Array.isArray(d.data) ? d.data : [];
        }); });
    },
  },

  ui: {
    // Thumb-sized button: kind 'primary' (gold fill) or '' (outline).
    btn: function(label, kind) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
        (kind === 'primary' ? 'background:var(--gold);border:none;color:#111;' : 'background:none;border:1px solid var(--border);color:var(--text);');
      return b;
    },
    // Building guide 8: destructive buttons arm on the first tap, act on the second within 3s.
    armConfirm: function(btn, onConfirm, armedLabel) {
      var armed = false, t = null, label = btn.textContent;
      btn.onclick = function() {
        if (!armed) { armed = true; btn.textContent = armedLabel || 'Tap again to confirm'; btn.style.color = '#CC4A4A';
          t = setTimeout(function() { armed = false; btn.textContent = label; btn.style.color = ''; }, 3000); return; }
        clearTimeout(t); armed = false; btn.disabled = true; onConfirm();
      };
      return btn;
    },
    // Search list (GM-7 shape): items [{title, sub}], onPick(item). Search box shows past 6 items. Returns the box.
    pickList: function(host, items, onPick, opts) {
      opts = opts || {};
      var wrap = document.createElement('div'); wrap.className = 'kit-pick';
      var q = document.createElement('input'); q.type = 'search'; q.className = 'kit-pick-q'; q.placeholder = opts.placeholder || 'Search…';
      if (opts.id) q.id = opts.id + '-q';
      q.style.cssText = 'width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:40px;margin-bottom:6px;font-family:inherit;';
      var list = document.createElement('div'); list.className = 'kit-pick-list'; if (opts.id) list.id = opts.id + '-list';
      list.style.cssText = 'max-height:50vh;overflow-y:auto;';
      var paint = function() {
        list.innerHTML = '';
        var s = q.value.trim().toLowerCase(), shown = items.filter(function(x) { return !s || ((x.title || '') + ' ' + (x.sub || '')).toLowerCase().indexOf(s) >= 0; });
        if (!items.length) { var em = document.createElement('div'); em.style.cssText = 'font-size:13px;color:var(--muted);padding:6px 0;'; em.textContent = opts.empty || 'Nothing here yet.'; list.appendChild(em); }
        shown.slice(0, opts.max || 60).forEach(function(x) {
          var b = RPGACE.kit.btn('', ''); b.className = 'kit-pick-item' + (opts.itemClass ? ' ' + opts.itemClass : '');
          b.style.cssText += 'display:block;width:100%;text-align:left;margin:4px 0;';
          b.innerHTML = RPGACE.kit.esc(x.title) + (x.sub ? '<br><span style="font-size:12px;color:var(--muted);">' + RPGACE.kit.esc(x.sub) + '</span>' : '');
          b.onclick = function() { onPick(x); };
          list.appendChild(b);
        });
      };
      q.oninput = paint;
      if (items.length > 6) wrap.appendChild(q);
      wrap.appendChild(list); host.appendChild(wrap); paint();
      return wrap;
    },
  },
});
// The flat surface every module calls: RPGACE.kit.esc(), RPGACE.kit.btn(), ...
(function() {
  var k = RPGACE.modules.kit, out = {};
  ['logic', 'ui'].forEach(function(ns) { Object.keys(k[ns]).forEach(function(n) { out[n] = k[ns][n]; }); });
  RPGACE.kit = out;
})();
/* ===END:kit=== */
