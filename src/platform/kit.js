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
    // TK-1 (Oct 29 2026, plan "Task Card Kit"; Alex: "make this part of central kit, i want my day different task cards
    // to work the same way" / "everything is task - action etc are just sysnonyms"): THE task card. One look for every
    // task anywhere (Actions, block steps, Live now, planning): big circle + gold ✓ Done + tools, faded once done.
    //   o = { title, icon, metaHtml (trusted, caller-escaped), done, skipped, mode: 'do' | 'plan' | 'view',
    //         onTick(nowDone) -> Promise   (circle / ✓ Done; a done card's circle undoes),
    //         after()                       (runs once onTick resolves - the caller redraws in place),
    //         tools: [{label, fn, cls, primary, data}], below: Element, cls, id, dataset }
    // In 'plan' mode there is no tick (planning a future block); 'view' shows state only.
    taskCard: function(o) {
      o = o || {};
      var K = RPGACE.kit, mode = o.mode || 'do', done = !!o.done, skip = !!o.skipped, settled = done || skip;
      var el = document.createElement('div');
      el.className = 'kit-task' + (o.cls ? ' ' + o.cls : '');
      if (o.id) el.dataset.id = o.id;
      Object.keys(o.dataset || {}).forEach(function(k) { el.dataset[k] = o.dataset[k]; });
      el.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--panel);' + (settled ? 'opacity:.6;' : '');
      var top = document.createElement('div'); top.style.cssText = 'display:flex;align-items:center;gap:10px;';
      var tick = document.createElement('button'); tick.type = 'button'; tick.className = 'myday-tick kit-task-tick';
      tick.setAttribute('aria-label', done ? 'Done' : 'Mark done');
      tick.textContent = done ? '✓' : skip ? '–' : '';
      tick.style.cssText = 'flex:0 0 auto;width:40px;height:40px;border-radius:50%;border:2px solid ' + (done ? 'var(--gold)' : 'var(--border)') + ';background:' + (done ? 'var(--gold)' : 'none') + ';color:#111;font-size:18px;font-weight:700;cursor:pointer;' + (mode === 'plan' ? 'border-style:dashed;cursor:default;' : '');
      var mid = document.createElement('div'); mid.className = 'kit-task-mid'; mid.style.cssText = 'flex:1;min-width:0;';
      mid.innerHTML = '<div class="kit-task-title" style="font-size:15px;font-weight:700;color:var(--text);' + (done ? 'text-decoration:line-through;' : '') + '">' + K.esc((o.icon ? o.icon + ' ' : '') + (o.title || '')) + '</div>' + (o.metaHtml || '');
      top.appendChild(tick); top.appendChild(mid); el.appendChild(top);
      var run = function(nowDone) {
        if (mode !== 'do' || !o.onTick) return;
        [].forEach.call(el.querySelectorAll('button'), function(b) { b.disabled = true; });
        Promise.resolve().then(function() { return o.onTick(nowDone); }).then(function() { if (o.after) o.after(el); })
          .catch(function(e) { [].forEach.call(el.querySelectorAll('button'), function(b) { b.disabled = false; }); RPGACE.utils.toast('⚠️ ' + (e && e.message || e), '#CC4A4A', 3500); if (o.after) o.after(el); });
      };
      if (mode === 'do') tick.onclick = function() { run(!settled); };
      else tick.disabled = mode === 'view';
      if (o.below) el.appendChild(o.below);
      var tools = document.createElement('div'); tools.className = 'kit-task-tools';
      tools.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-left:50px;';
      var small = 'min-height:36px;padding:6px 10px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      var add = function(sp) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = sp.label; if (sp.cls) b.className = sp.cls;
        b.style.cssText = small + (sp.primary ? 'background:var(--gold);color:#111;border:none;' : 'background:none;border:1px solid var(--border);color:var(--text);');
        Object.keys(sp.data || {}).forEach(function(k) { b.dataset[k] = sp.data[k]; });
        b.onclick = function(ev) { sp.fn(ev, el); };
        tools.appendChild(b); return b;
      };
      if (mode === 'do' && !settled && o.onTick) add({ label: '✓ Done', cls: 'myday-done-btn', primary: true, fn: function() { run(true); } });
      (o.tools || []).forEach(add);
      if (tools.childNodes.length) el.appendChild(tools);
      el._tick = tick;
      return el;
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
