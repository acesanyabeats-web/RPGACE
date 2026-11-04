// UA-1 UI audit crawler (Nov 4 2026). Alex: "an audit of all UI, starting from logging in, say what page, then what
// buttons are present, what info is shown and what linked pages are present through which buttons (without main left nav)".
// Runs the real app (index.html served on :8765) in headless Chromium with every API mocked empty, so it maps STRUCTURE:
// screens, their buttons and info, and which button leads where. Lists that need real data show as empty.
// Usage: python3 -m http.server 8765 (repo root) & node scripts/audit/ui_crawl.cjs out.json
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'ui_audit.json';
const MAX_BUTTONS = 40, WAIT = 450;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
  const p = await ctx.newPage();
  ctx.on('page', pg => { if (pg !== p) pg.close().catch(() => {}); });
  await p.clock.install({ time: new Date('2026-11-04T12:00:00') });
  p.on('dialog', d => d.dismiss().catch(() => {}));
  const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await p.route('**/*', r => {
    const u = r.request().url();
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
    if (/\/api\/data-write/.test(u)) {
      let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      if (body.action === 'read') return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: '{"data":[]}' });
      const row = Object.assign({ id: 'new' + Math.random().toString(36).slice(2, 7) }, Array.isArray(body.payload) ? body.payload[0] : body.payload);
      return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ data: [row] }) });
    }
    if (!u.startsWith('http://127.0.0.1:8765') || /\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: '[]' });
    return r.continue();
  });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(3000);

  // In-page helpers: what's on screen now, its buttons, reset, click by index.
  await p.addInitScript(() => {});
  const installHelpers = () => p.evaluate(() => {
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const txt = el => (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 70);
    window.__ua = {
      scope: function() {
        const ovs = [...document.querySelectorAll('.dd-overlay')].filter(vis);
        const top = ovs[ovs.length - 1];
        const pg = document.querySelector('#app .page.active') || document.querySelector('.page.active');
        return { top, pg, el: top || pg || document.body };
      },
      buttons: function() {
        const s = this.scope().el;
        // Real controls plus anything tappable (cards with onclick / pointer cursor); a tappable inside a button or link is the same control.
        const isCtl = e => /^(BUTTON|A|SELECT|SUMMARY)$/.test(e.tagName) || (e.tagName === 'INPUT' && e.type === 'checkbox') || e.getAttribute('role') === 'button' || typeof e.onclick === 'function' || e.hasAttribute('onclick');
        const all = [...s.querySelectorAll('*')].filter(e => (isCtl(e) || getComputedStyle(e).cursor === 'pointer') && vis(e));
        return all.filter(e => !e.closest('#ln-drawer') && e.id !== 'ln-burger' && !e.classList.contains('side-list-btn') && !e.disabled
          && !(e.parentElement && e.parentElement.closest('button, a[href]')) && txt(e));
      },
      snap: function() {
        const S = this.scope();
        const el = S.el;
        let title = '';
        if (S.top) {
          const eb = [...S.top.querySelectorAll('div')].find(d => getComputedStyle(d).letterSpacing === '3px' && d.children.length === 0), ti = eb && eb.nextElementSibling;
          title = [eb && txt(eb), ti && txt(ti)].filter(Boolean).join(' · ') || txt(S.top).slice(0, 50);
        }
        else if (S.pg) { const t = S.pg.querySelector('.section-title, h1, h2'); title = t ? txt(t) : S.pg.id; }
        const info = [...el.querySelectorAll('.section-title, h1, h2, h3, h4, .rt-big, .an-tile-name, .mdx-sub, .ln-ctitle, b, strong, label')]
          .filter(vis).map(txt).filter(t => t && t.length > 1);
        const uniq = [...new Set(info)].slice(0, 25);
        const inputs = [...el.querySelectorAll('input:not([type=checkbox]), textarea')].filter(vis).map(i => i.placeholder || i.type).slice(0, 10);
        return { kind: S.top ? 'popup' : 'page', page: S.pg ? S.pg.id : null, title: title, info: uniq, inputs: inputs,
          buttons: this.buttons().slice(0, 60).map(b => ({ t: txt(b) || (b.tagName === 'SELECT' ? 'select' : b.type || b.tagName), id: b.id || null })) };
      },
      reset: function() {
        document.querySelectorAll('.dd-overlay').forEach(o => o.remove());
        const d = document.getElementById('ln-drawer'); if (d) { try { RPGACE.modules.leftNav.close(); } catch (e) { d.remove(); } }
        document.querySelectorAll('#ln-backdrop').forEach(x => x.remove());
        try { showPage('dashboard'); } catch (e) {}
        window.scrollTo(0, 0);
      },
      navItems: function() {
        const d = document.getElementById('ln-drawer');
        return d ? [...d.querySelectorAll('.ln-card')].map(txt) : [];
      },
      openNav: function() { try { RPGACE.modules.leftNav.open(); } catch (e) { const bb = document.getElementById('ln-burger'); if (bb) bb.click(); } },
      clickNav: function(i) { const d = document.getElementById('ln-drawer'); if (!d) return false; const l = [...d.querySelectorAll('.ln-card')]; if (!l[i]) return false; l[i].click(); return true; },
      // By label (and id when it has one), never by position: an earlier tap can add or remove buttons.
      click: function(label, id) { const l = this.buttons().filter(b => (id ? b.id === id : true) && txt(b) === label); if (!l[0]) return false; l[0].scrollIntoView({ block: 'center' }); l[0].click(); return true; }
    };
    window.__toasts = [];
    const ot = RPGACE.utils.toast; RPGACE.utils.toast = function(m) { window.__toasts.push(String(m).slice(0, 90)); return ot.apply(this, arguments); };
  });

  const audit = { generated: new Date().toISOString(), note: 'Structure only: every API mocked empty, phone width 390px, clock 2026-11-04 12:00.', login: null, screens: {}, edges: [], nav: [], errors: [] };
  const key = s => s.kind + '|' + (s.page || '') + '|' + (s.title || '').slice(0, 50);
  const add = s => { const k = key(s); if (!audit.screens[k]) audit.screens[k] = s; return k; };

  // 1) Login screen as it first shows.
  audit.login = await p.evaluate(() => {
    const g = document.getElementById('gate'); if (!g) return null;
    const t = el => (el.innerText || el.value || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 70);
    return { buttons: [...g.querySelectorAll('button')].map(t), inputs: [...g.querySelectorAll('input')].map(i => i.placeholder || i.type), text: t(g).slice(0, 300) };
  });
  // 2) Log in (as the harness does) and settle. Repeated (after a reload) before every root, so one root's taps
  // (e.g. ☀️ I'm up) never change what the next root looks like.
  const login = async (reload) => {
    if (reload) { await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(2500); }
    await p.evaluate(() => { document.getElementById('gate').style.display = 'none'; document.getElementById('app').style.display = 'block'; try { initApp(); } catch (e) {} RPGACE.hooks.fire('rpgace:login'); RPGACE.modules.authGate._apiSecret = 'test'; });
    await p.waitForTimeout(3500);
    await installHelpers();
    await p.evaluate(() => __ua.reset()); await p.waitForTimeout(400);
  };
  await login(false);

  // Roots: the dashboard, then every left-nav destination (the nav itself is not counted as a link).
  await p.evaluate(() => __ua.openNav()); await p.waitForTimeout(400);
  const navLabels = await p.evaluate(() => __ua.navItems());
  const roots = [{ label: 'Dashboard (after login)', nav: null }].concat(navLabels.map((l, i) => ({ label: l, nav: i })));
  const reach = async (root) => {
    await p.evaluate(() => __ua.reset()); await p.waitForTimeout(250);
    if (root.nav != null) { await p.evaluate(() => __ua.openNav()); await p.waitForTimeout(250); await p.evaluate(i => __ua.clickNav(i), root.nav); await p.waitForTimeout(WAIT + 300); }
  };
  const LIMIT = Number(process.env.UA_LIMIT || 0);
  for (const root of (LIMIT ? roots.slice(0, LIMIT) : roots)) {
    try {
      await login(true);
      await reach(root);
      const s = await p.evaluate(() => __ua.snap());
      const rk = add(s);
      if (root.nav != null) audit.nav.push({ label: root.label, to: rk });
      const n = Math.min(s.buttons.length, MAX_BUTTONS);
      for (let j = 0; j < n; j++) {
        await reach(root);
        const before = await p.evaluate(() => { window.__toasts = []; return JSON.stringify(__ua.snap()); });
        const okc = await p.evaluate(a => __ua.click(a[0], a[1]), [s.buttons[j].t, s.buttons[j].id]).catch(() => false);
        if (!okc) { audit.edges.push({ from: rk, button: s.buttons[j].t, id: s.buttons[j].id, to: null, gone: true, toasts: [] }); continue; }
        await p.waitForTimeout(WAIT);
        const after = await p.evaluate(() => ({ s: __ua.snap(), toasts: window.__toasts.slice() })).catch(() => null);
        if (!after) continue;
        const changed = JSON.stringify(after.s) !== before;
        const tk = changed && key(after.s) !== rk ? add(after.s) : null;
        audit.edges.push({ from: rk, button: s.buttons[j].t, id: s.buttons[j].id, to: tk, sameScreenChanged: changed && !tk, toasts: after.toasts });
      }
      process.stdout.write('.');
      fs.writeFileSync(OUT, JSON.stringify(audit, null, 1));
    } catch (e) { audit.errors.push(root.label + ': ' + e.message); }
  }
  // Phase 2 (UA_DEPTH=2): every screen first reached one tap below a root gets its own buttons tapped too,
  // reached each time by root -> that first button (re-done after each tap, since a tap can change the screen).
  if (Number(process.env.UA_DEPTH || 1) >= 2) {
    const rootOf = {}; roots.forEach(r => { const k = audit.nav.find(n => n.label === r.label); if (k) rootOf[k.to] = r; });
    rootOf[Object.keys(audit.screens)[0]] = roots[0];
    const done = new Set(Object.keys(rootOf));
    const firstEdge = {};
    audit.edges.forEach(e => { if (e.to && !done.has(e.to) && !firstEdge[e.to] && rootOf[e.from]) firstEdge[e.to] = e; });
    for (const [sk, e1] of Object.entries(firstEdge)) {
      try {
        const root = rootOf[e1.from];
        await login(true);
        const go = async () => { await reach(root); await p.evaluate(a => __ua.click(a[0], a[1]), [e1.button, e1.id]); await p.waitForTimeout(WAIT); };
        await go();
        const s2 = await p.evaluate(() => __ua.snap());
        const k2 = key(s2); if (k2 !== sk) { audit.errors.push('depth2 could not re-open ' + sk); continue; }
        const n2 = Math.min(s2.buttons.length, MAX_BUTTONS);
        for (let j = 0; j < n2; j++) {
          const bt = s2.buttons[j]; if (/^(← Back|Close|✕|×)$/.test(bt.t)) continue;
          await go();
          const before = await p.evaluate(() => { window.__toasts = []; return JSON.stringify(__ua.snap()); });
          const okc = await p.evaluate(a => __ua.click(a[0], a[1]), [bt.t, bt.id]).catch(() => false);
          if (!okc) { audit.edges.push({ from: sk, button: bt.t, id: bt.id, to: null, gone: true, toasts: [], depth: 2 }); continue; }
          await p.waitForTimeout(WAIT);
          const after = await p.evaluate(() => ({ s: __ua.snap(), toasts: window.__toasts.slice() })).catch(() => null);
          if (!after) continue;
          const changed = JSON.stringify(after.s) !== before;
          const tk = changed && key(after.s) !== sk ? add(after.s) : null;
          audit.edges.push({ from: sk, button: bt.t, id: bt.id, to: tk, sameScreenChanged: changed && !tk, toasts: after.toasts, depth: 2 });
        }
        process.stdout.write(':');
        fs.writeFileSync(OUT, JSON.stringify(audit, null, 1));
      } catch (e) { audit.errors.push('depth2 ' + sk + ': ' + e.message); }
    }
  }
  audit.errors = audit.errors.concat([...new Set(errs)].slice(0, 40));
  fs.writeFileSync(OUT, JSON.stringify(audit, null, 1));
  console.log('\nscreens', Object.keys(audit.screens).length, 'edges', audit.edges.length, 'nav', audit.nav.length, 'errors', audit.errors.length);
  await b.close();
})();
