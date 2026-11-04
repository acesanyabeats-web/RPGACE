// UA-1 UI audit crawler (Nov 4 2026). Alex: "an audit of all UI, starting from logging in, say what page, then what
// buttons are present, what info is shown and what linked pages are present through which buttons (without main left
// nav)" ... "The audit is not done till all buttons possible are clicked, all pages and links are documented".
// Runs the real app (repo served on :8765) in headless Chromium. Every database read gets two SAMPLE rows built from
// what the screen asked for (its select columns + filters, real allowed status/kind values), so item buttons appear;
// every write is accepted and echoed back. No real data is used. Breadth-first over every screen at every depth: each
// screen is reached by replaying its path from a fresh login, then EVERY button on it is tapped (two-tap confirms get
// their second tap) and where it leads is recorded. Resumable: state is saved after every screen; a run stops itself
// after UA_MINUTES (default 100) and the next run carries on. Exit code 3 = more to do, 0 = done.
// Usage: python3 -m http.server 8765 (repo root) & node scripts/audit/ui_crawl.cjs state.json
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'ui_audit.json';
const WAIT = 450, MAX_DEPTH = Number(process.env.UA_DEPTH || 8), BUDGET_MS = Number(process.env.UA_MINUTES || 100) * 60000, T0 = Date.now();

// ── sample data ────────────────────────────────────────────────────────────
const ENUM = { // table.column -> allowed values (from pg_constraint, Nov 4 2026)
  'chore_blocks.kind': ['realm', 'chores', 'cooking', 'shopping'], 'chore_blocks.status': ['planned'], 'chore_blocks.method': ['none'],
  'realm_tasks.kind': ['repeat', 'once'], 'realm_tasks.earns': ['tick', 'real'], 'realm_tasks.status': ['kept', 'inbox', 'proposed'],
  'realm_tasks.context_kind': ['recipe', 'card'], 'routines.cadence': ['daily', 'weekly'], 'routines.part_of_day': ['morning', 'evening'],
  'posts.stage': ['idea', 'editing'], 'posts.kind': ['beat_video', 'tutorial'], 'plans.status': ['planning', 'idea'],
  'planned_cooks.status': ['scheduled', 'draft'], 'library_items.kind': ['video', 'book'], 'library_items.status': ['to_check', 'done'],
  'library_items.shelf_by': ['keyword'], 'memories.status': ['kept', 'upcoming'], 'mission_contexts.status': ['kept'], 'mission_contexts.source': ['typed', 'email'],
  'myday_alarms.status': ['set'], 'pitch_sends.stage': ['to_send', 'potential_close'], 'pitches.kind': ['lease', 'beat_pack'],
  'screenshots.status': ['new', 'kept'], 'software_inventory.status': ['to_review', 'owned'], 'software_inventory.drive': ['C', 'E'],
  'subscriptions.cycle': ['monthly', 'yearly'], 'wishlist_items.status': ['wanted'], 'wishlist_items.priority': ['high', 'low'],
  'xp_challenges.status': ['active', 'suggested'], 'xp_challenges.kind': ['weekly', 'resolution'], 'xp_challenges.measure': ['count'],
  'xp_events.status': ['active', 'pending_confirm'], 'xp_quest_steps.status': ['approved', 'proposed'], 'xp_reports.kind': ['week', 'month'],
  'xp_treats.status': ['waiting'], 'xp_unlocks.status': ['earned'], 'conid_pot.kind': ['beat', 'post'], 'drink_specs.kind': ['cocktail', 'mocktail'],
  'exercises.status': ['kept'], 'exercises.discipline': ['weights', 'cardio'], 'exercises.muscle_group': ['chest', 'legs'],
  'food_log.meal': ['lunch', 'dinner'], 'body_log.kind': ['weight', 'water'], 'pantry_stock.location': ['fridge', 'pantry'],
  'shopping_lists.kind': ['cook', 'topup'], 'smoke_test_items.status': ['unverified', 'broken'], 'study_sessions.mode': ['quick'],
  'study_questions.kind': ['single'], 'oracle_memory.status': ['active'], 'chronicles_finance.type': ['sale', 'expense'],
  'outreach_log.kind': ['outreach'], 'plan_tasks.kind': ['ticket', 'packing'], 'day_misses.kind': ['block'], 'day_misses.action': ['later'],
  'alarm_sounds.status': ['ready'], 'work_links.kind': ['clock_in', 'clock_out'], 'content_productions.status': ['idea', 'making'],
  'journal.entry_type': ['note', 'evening_review'], 'taxonomy_proposals.status': ['pending'], 'jargon_encyclopedia.status': ['published'],
  'bookworm_books.status': ['reading'], 'intel_jobs.status': ['done', 'awaiting_realms'], 'error_log.status': ['active']
};
const REALMS = ['producer', 'chef', 'athlete', 'creator', 'builder', 'homekeeper', 'life', 'mind', 'scholar', 'hustler', 'connector', 'explorer', 'steward'];
const uuid = (t, i) => { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ('0000000' + h.toString(16)).slice(-8) + '-0000-4000-8000-' + ('00000000000' + (i + 1)).slice(-12); };
function value(t, c, i) {
  const e = ENUM[t + '.' + c]; if (e) return e[i % e.length];
  if (c === 'id' || /_id$/.test(c)) return uuid(c === 'id' ? t : c, i);
  if (/_at$|^at$/.test(c)) return '2026-11-0' + (3 + i) + 'T1' + (1 + i) + ':00:00Z';
  if (/(^|_)date$|_on$|^day$|^due|^period_|_until$/.test(c)) return '2026-11-0' + (4 + i);
  if (/_time$|^start$|^end$|^time$/.test(c)) return (14 + i * 3) + ':00';
  if (/^(realms|tags|topics|days|routine_ids|recipe_ids|beat_ids|platforms|types|keywords|ingredients|metric_actions|vst_tags|micro_categories|primary_regions|secondary_regions|trigger_phrases|data_touched|suggestions|people)$/.test(c))
    return c === 'realms' ? [REALMS[i]] : c === 'ingredients' ? ['lime', 'mint'] : [];
  if (/^(items|steps|insights|stems|history|messages|options|answer|attempts|merged_from|phyla_detected|revision_notes|repos|evidence|findings|by_domain|chosen|deliverable_files|files|release_links)$/.test(c)) return [];
  if (/^(details|data|plan|captions|links|measures|schedule|creative_docs|deep_content|sources|proof|context|platform_outputs|beat_meta|realm_scores|value|programme|tracker_days|realm_methods|wake_override|day_state|domains|licence_tiers|progress|licence_defaults|realm_targets|edl|script|export_paths|source|pink_allocations|stock_deducted|taxonomy_nodes|deliverable_bundles|preview_bullets|phyla_touched|keywords_json)$/.test(c)) return {};
  if (/^(is_|done$|completed$|active$|pinned$|starred$|bought$|flagged$|business$|in_basket$|analysed|correct$|confirm_required$|applied_in_beat$|suggest_off$|alarm_on$|big_day$|manual$|auto$|resurface_off$|added_to_watchlist$|use_api$|leftover_usable$|capped$|ok$)/.test(c)) return i === 1;
  if (/mins|minutes|^xp$|_xp$|amount|price|count|score|^qty$|quantity|target|^progress$|level|^bpm$|^sort$|^idx$|^step|number|^hours$|kcal|grams|weight|reps|^energy$|servings|rating|priority$|^season$|depth|^ms$|chapter_index|^ord$|days$|^budget|limit|_g$|_ml$|_h$|_kg$|^sends$|^tier$|^con_id$|total|^correct$|^value$|^ask$|^pct|_pct$|per_100g/.test(c)) return 30 + i * 15;
  if (c === 'realm' || c === 'category' || c === 'area') return REALMS[i];
  if (c === 'status') return i ? 'done' : 'kept';
  if (/^(title|name|label|term|item|line|item_name|concept|food_name|module_name|member_name|alias_name|ingredient_name|phylum_name|class_name|director_name|chapter_title|book_title|recipe_title|stop_label|who|substitute_name|key)$/.test(c)) return 'Sample ' + t.replace(/_/g, ' ') + ' ' + (i + 1);
  if (/url$|^link$|^endpoint$/.test(c)) return 'https://example.com/' + t + '/' + (i + 1);
  return 'Sample ' + c.replace(/_/g, ' ');
}
function rowsFor(t, params) {
  const q = new URLSearchParams(params || '');
  const sel = (q.get('select') || '*').split(',').map(c => c.trim().split(':').pop().split('(')[0].trim()).filter(c => c && c !== '*' && !c.includes('!'));
  const cols = sel.length ? sel : ['id', 'created_at', 'updated_at', 'title', 'name', 'label', 'status', 'kind', 'realm', 'date', 'notes', 'description', 'content', 'items', 'realms'];
  const limit = Number(q.get('limit') || 2);
  const n = Math.min(2, limit > 0 ? limit : 2);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const r = {}; cols.forEach(c => { r[c] = value(t, c, i); });
    for (const [k, v] of q.entries()) { // satisfy the screen's own filters
      if (/^(select|order|limit|offset|or|and|on_conflict)$/.test(k)) continue;
      let m;
      if ((m = /^eq\.(.*)$/.exec(v))) r[k] = m[1] === 'true' ? true : m[1] === 'false' ? false : /^-?\d+(\.\d+)?$/.test(m[1]) ? Number(m[1]) : decodeURIComponent(m[1]);
      else if ((m = /^in\.\((.*)\)$/.exec(v))) r[k] = decodeURIComponent(m[1].split(',')[i % m[1].split(',').length].replace(/"/g, ''));
      else if ((m = /^(gte|lte|gt|lt)\.(.*)$/.exec(v))) r[k] = decodeURIComponent(m[2]);
      else if (/^is\.null$/.test(v)) r[k] = null;
      else if ((m = /^like\.(.*)$/.exec(v))) r[k] = decodeURIComponent(m[1]).replace(/\*/g, '');
    }
    rows.push(r);
  }
  return rows;
}

(async () => {
  const st = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const AUTO = ['Work page (workMode.ui.autoOpen) - during a shift, once per shift', 'What happened? card (myDay.ui._maybeMissed) - after a block passes with nothing logged', 'Good morning screen - after the wake alarm / I\'m up', 'Evening review - from Going to bed'];
  const audit = st || { autoOpen: AUTO, generated: new Date().toISOString(), note: 'Every screen reachable by tapping, from login, at every depth. Sample data (2 rows per list, shaped from each screen\'s own query); phone width 390px; clock 2026-11-04 12:00.', login: null, screens: {}, edges: [], nav: [], queue: [], done: [], errors: [] };
  const B = await chromium.launch();
  const key = s => s.kind + '|' + (s.page || '') + '|' + (s.title || '').slice(0, 60);
  const save = () => fs.writeFileSync(OUT, JSON.stringify(audit, null, 1));
  const makeWorker = async () => {
  const ctx = await B.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
  const p = await ctx.newPage();
  ctx.on('page', pg => { if (pg !== p) pg.close().catch(() => {}); });
  await p.clock.install({ time: new Date('2026-11-04T12:00:00') });
  p.on('dialog', d => d.dismiss().catch(() => {}));
  const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  const J = body => ({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify(body) });
  await p.route('**/*', r => {
    const u = r.request().url(), m = r.request().method();
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
    if (/\/api\/data-write/.test(u)) {
      let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      if (body.action === 'read') return r.fulfill(J({ data: rowsFor(body.table, body.params) }));
      const row = Object.assign({ id: 'new' + Math.random().toString(36).slice(2, 7), created_at: '2026-11-04T12:00:00Z' }, Array.isArray(body.payload) ? body.payload[0] : body.payload);
      return r.fulfill(J({ data: [row] }));
    }
    const rest = /\/rest\/v1\/([a-z0-9_]+)(\?(.*))?$/.exec(u);
    if (rest && rest[1] !== 'rpc' && m === 'GET') return r.fulfill(J(rowsFor(rest[1], rest[3] || '')));
    if (rest && m !== 'GET') { let pl = {}; try { pl = JSON.parse(r.request().postData() || '{}'); } catch (e) {} return r.fulfill(J([Object.assign({ id: 'new' + Math.random().toString(36).slice(2, 7) }, Array.isArray(pl) ? pl[0] : pl)])); }
    if (!u.startsWith('http://127.0.0.1:8765') || /\/api\//.test(u)) return r.fulfill(J([]));
    return r.continue();
  });
  p.on('pageerror', e => { audit.pageErrors = audit.pageErrors || []; if (audit.pageErrors.indexOf(e.message) === -1 && audit.pageErrors.length < 80) audit.pageErrors.push(e.message); });

  const helpers = () => p.evaluate(() => {
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
        const isCtl = e => /^(BUTTON|A|SELECT|SUMMARY)$/.test(e.tagName) || (e.tagName === 'INPUT' && /checkbox|radio/.test(e.type)) || e.getAttribute('role') === 'button' || typeof e.onclick === 'function' || e.hasAttribute('onclick');
        const all = [...s.querySelectorAll('*')].filter(e => (isCtl(e) || getComputedStyle(e).cursor === 'pointer') && vis(e));
        const seen = new Set();
        return all.filter(e => !e.closest('#ln-drawer') && e.id !== 'ln-burger' && !e.classList.contains('side-list-btn') && !e.disabled
          && !(e.parentElement && e.parentElement.closest('button, a[href]')) && (txt(e) || e.tagName === 'INPUT'))
          .filter(e => { const k = (e.id || '') + '|' + txt(e); if (seen.has(k)) return false; seen.add(k); return true; });
      },
      snap: function() {
        const S = this.scope(), el = S.el;
        let title = '';
        if (S.top) {
          const eb = [...S.top.querySelectorAll('div')].find(d => getComputedStyle(d).letterSpacing === '3px' && d.children.length === 0), ti = eb && eb.nextElementSibling;
          title = [eb && txt(eb), ti && txt(ti)].filter(Boolean).join(' · ') || txt(S.top).slice(0, 50);
        } else if (S.pg) { const t = S.pg.querySelector('.section-title, h1, h2'); title = t ? txt(t) : S.pg.id; }
        const info = [...el.querySelectorAll('.section-title, h1, h2, h3, h4, .rt-big, .an-tile-name, .mdx-sub, b, strong, label')].filter(vis).map(txt).filter(t => t && t.length > 1);
        const inputs = [...el.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea')].filter(vis).map(i => i.placeholder || i.type).slice(0, 12);
        return { kind: S.top ? 'popup' : 'page', page: S.pg ? S.pg.id : null, title: title, info: [...new Set(info)].slice(0, 30), inputs: inputs,
          buttons: this.buttons().map(b => ({ t: txt(b) || (b.type || b.tagName), id: b.id || null })) };
      },
      reset: function() {
        document.querySelectorAll('.dd-overlay').forEach(o => o.remove());
        try { RPGACE.modules.leftNav.close(); } catch (e) {}
        document.querySelectorAll('#ln-backdrop').forEach(x => x.remove());
        try { showPage('dashboard'); } catch (e) {}
        window.scrollTo(0, 0);
      },
      navItems: function() { const d = document.getElementById('ln-drawer'); return d ? [...d.querySelectorAll('.ln-card')].map(txt) : []; },
      openNav: function() { try { RPGACE.modules.leftNav.open(); } catch (e) { const bb = document.getElementById('ln-burger'); if (bb) bb.click(); } },
      clickNav: function(i) { const d = document.getElementById('ln-drawer'); if (!d) return false; const l = [...d.querySelectorAll('.ln-card')]; if (!l[i]) return false; l[i].click(); return true; },
      click: function(label, id) { const l = this.buttons().filter(b => (id ? b.id === id : !b.id || true) && txt(b) === label); if (!l[0]) return false; l[0].scrollIntoView({ block: 'center' }); l[0].click(); return true; }
    };
    window.__toasts = [];
    const ot = RPGACE.utils.toast; RPGACE.utils.toast = function(m) { window.__toasts.push(String(m).slice(0, 90)); return ot.apply(this, arguments); };
  });
  const login = async () => {
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(2500);
    if (!audit.login) audit.login = await p.evaluate(() => {
      const g = document.getElementById('gate'); if (!g) return null;
      const t = el => (el.innerText || el.value || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      return { buttons: [...g.querySelectorAll('button')].map(t), inputs: [...g.querySelectorAll('input')].map(i => i.placeholder || i.type), text: t(g).slice(0, 300) };
    });
    // Pop-ups that open by themselves (Work mode during a shift, the missed-block card) would land on top of whatever
    // screen is being mapped; they're switched off here and listed in the report as "opens by itself".
    await p.evaluate(() => { try { RPGACE.modules.workMode.ui.autoOpen = function() { return null; }; } catch (e) {} try { RPGACE.modules.myDay.ui._maybeMissed = function() {}; } catch (e) {} });
    await p.evaluate(() => { document.getElementById('gate').style.display = 'none'; document.getElementById('app').style.display = 'block'; try { initApp(); } catch (e) {} RPGACE.hooks.fire('rpgace:login'); RPGACE.modules.authGate._apiSecret = 'test'; });
    await p.waitForTimeout(3500);
    await helpers();
    await p.evaluate(() => __ua.reset()); await p.waitForTimeout(400);
  };
  const snap = () => p.evaluate(() => __ua.snap());
  // Replay a path: [{nav:i|null}, {t,id}, {t,id}...]
  const replay = async (path) => {
    await p.evaluate(() => __ua.reset()); await p.waitForTimeout(250);
    if (path[0].nav != null) { await p.evaluate(() => __ua.openNav()); await p.waitForTimeout(250); await p.evaluate(i => __ua.clickNav(i), path[0].nav); await p.waitForTimeout(WAIT + 250); }
    for (let i = 1; i < path.length; i++) {
      const ok = await p.evaluate(a => __ua.click(a[0], a[1]), [path[i].t, path[i].id]).catch(() => false);
      if (!ok) return false;
      await p.waitForTimeout(WAIT);
    }
    return true;
  };

    return { p, login, snap, replay };
  };
  const W0 = await makeWorker();
  { const { p, login, snap } = W0;
  await login();
  if (!audit.queue.length && !audit.done.length) {
    await p.evaluate(() => __ua.openNav()); await p.waitForTimeout(400);
    const labels = await p.evaluate(() => __ua.navItems());
    const d0 = await snap(); const k0 = key(d0); audit.screens[k0] = d0;
    audit.queue.push({ key: k0, path: [{ nav: null }] });
    for (let i = 0; i < labels.length; i++) {
      await p.evaluate(() => __ua.reset()); await p.waitForTimeout(200);
      await p.evaluate(() => __ua.openNav()); await p.waitForTimeout(250);
      await p.evaluate(x => __ua.clickNav(x), i); await p.waitForTimeout(WAIT + 300);
      const s = await snap(), k = key(s);
      audit.nav.push({ label: labels[i], to: k });
      if (!audit.screens[k]) { audit.screens[k] = s; audit.queue.push({ key: k, path: [{ nav: i }] }); }
    }
    save();
  }
  // Deepen: screens recorded but never opened (past the depth cap) get a path rebuilt from the tap edges and are queued.
  const doneSet = new Set(audit.done), queued = new Set(audit.queue.map(q => q.key));
  const left = Object.keys(audit.screens).filter(k => !doneSet.has(k) && !queued.has(k));
  if (left.length) {
    const paths = {}; const k0 = Object.keys(audit.screens)[0]; paths[k0] = [{ nav: null }];
    audit.nav.forEach((n, i) => { if (!paths[n.to]) paths[n.to] = [{ nav: i }]; });
    let grew = true;
    while (grew) { grew = false; for (const e of audit.edges) if (e.to && paths[e.from] && !paths[e.to]) { paths[e.to] = paths[e.from].concat([{ t: e.button, id: e.id }]); grew = true; } }
    for (const k of left) if (paths[k]) audit.queue.push({ key: k, path: paths[k] }); else audit.errors.push('no path to ' + k);
    save();
  }

  }
  let finished = true;
  const busy = new Set();
  const work = async (Wk) => { const { p, login, snap, replay } = Wk;
  while (true) {
    if (!audit.queue.length) { if (!busy.size) break; await new Promise(r => setTimeout(r, 1000)); continue; }
    if (Date.now() - T0 > BUDGET_MS) { finished = false; break; }
    const job = audit.queue.shift();
    if (audit.done.indexOf(job.key) !== -1 || busy.has(job.key)) continue;
    busy.add(job.key);
    try {
      await login();
      if (!(await replay(job.path))) { audit.errors.push('could not reach ' + job.key); audit.done.push(job.key); busy.delete(job.key); save(); continue; }
      const s = await snap();
      if (key(s) !== job.key) { audit.errors.push('reached ' + key(s) + ' instead of ' + job.key); }
      audit.screens[job.key] = Object.assign(audit.screens[job.key] || {}, s);
      for (const bt of s.buttons) {
        if (!(await replay(job.path))) { await login(); if (!(await replay(job.path))) { audit.edges.push({ from: job.key, button: bt.t, id: bt.id, to: null, gone: true, toasts: [] }); continue; } }
        const before = await p.evaluate(() => { window.__toasts = []; return JSON.stringify(__ua.snap()); });
        let ok = await p.evaluate(a => __ua.click(a[0], a[1]), [bt.t, bt.id]).catch(() => false);
        if (!ok) { audit.edges.push({ from: job.key, button: bt.t, id: bt.id, to: null, gone: true, toasts: [] }); continue; }
        await p.waitForTimeout(WAIT);
        let after = await snap().catch(() => null);
        let twoTap = false;
        // Two-tap confirm: the button changed to an "again/confirm/sure" label on the same screen -> tap it again.
        if (after && key(after) === job.key) {
          const armed = after.buttons.find(x => /again|confirm|sure\?|tap to /i.test(x.t) && !s.buttons.some(y => y.t === x.t));
          if (armed) { await p.evaluate(a => __ua.click(a[0], a[1]), [armed.t, armed.id]).catch(() => false); await p.waitForTimeout(WAIT); after = await snap().catch(() => null); twoTap = true; }
        }
        if (!after) continue;
        const toasts = await p.evaluate(() => window.__toasts.slice()).catch(() => []);
        const changed = JSON.stringify(after) !== before;
        const k2 = key(after);
        const to = changed && k2 !== job.key ? k2 : null;
        audit.edges.push({ from: job.key, button: bt.t, id: bt.id, to: to, sameScreenChanged: changed && !to, toasts: toasts, twoTap: twoTap || undefined });
        if (to && !audit.screens[to] && job.path.length < MAX_DEPTH) { audit.screens[to] = after; audit.queue.push({ key: to, path: job.path.concat([{ t: bt.t, id: bt.id }]) }); }
        else if (to && !audit.screens[to]) audit.screens[to] = after;
      }
      audit.done.push(job.key); busy.delete(job.key);
      process.stdout.write('[' + audit.done.length + '/' + (audit.done.length + audit.queue.length) + ']');
      save();
    } catch (e) { audit.errors.push(job.key + ': ' + e.message); audit.done.push(job.key); busy.delete(job.key); save(); }
  }
  };
  const N = Number(process.env.UA_WORKERS || 4), workers = [W0];
  for (let i = 1; i < N; i++) workers.push(await makeWorker());
  await Promise.all(workers.map(work));
  audit.pageErrors = (audit.pageErrors || []).slice(0, 80);
  audit.finished = finished;
  save();
  console.log('\nscreens', Object.keys(audit.screens).length, 'edges', audit.edges.length, 'done', audit.done.length, 'queued', audit.queue.length, finished ? 'FINISHED' : 'PAUSED (run again to continue)');
  await B.close();
  process.exit(finished ? 0 : 3);
})();
