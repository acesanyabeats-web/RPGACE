/* ===MODULE:softwareList=== */
// WR-11 (Nov 3 2026, plan "Week Review Nov 3"; Alex: "Everything I install and buy in the future and I own right now
// will be on a list in supabase with downloaders so I can make this a quick process in the future when I switch
// laptops" + "in 2 we save it in bitwarden ... with 3 it builds out my total spend on my investment into my system,
// we can scan both my google accounts for emails to fish out all the purchase emails, and download links").
// One private table, software_inventory: emails found by a Gmail search land as 'to_review'; Alex keeps them
// ('owned') or drops them ('not_needed'). Owned items form the install checklist (install order, C or E drive,
// licence = the name of a Bitwarden entry, never the key) and add up to the total spent on the setup.
RPGACE.register('softwareList', {
  domain: 'habits',

  // Gmail search for purchases/licences/downloads of music + creator software (keyword search, no AI).
  QUERY: '(receipt OR invoice OR "order confirmation" OR "your order" OR "thank you for your purchase" OR licence OR license OR "serial number" OR "download") ' +
    '(plugin OR vst OR "fl studio" OR "image-line" OR splice OR "native instruments" OR "native access" OR waves OR "plugin alliance" OR xfer OR serum OR arturia OR focusrite OR izotope OR fabfilter OR kontakt OR "output" OR "audio technica" OR obs OR ilok OR sample OR software)',
  CATEGORIES: ['DAW', 'Plugin', 'Sample pack', 'Driver', 'Recording', 'Tool', 'Other'],
  ACCOUNTS: [{ key: 'gmail', label: 'Main Google account' }, { key: 'gmail2', label: 'Second Google account' }],

  logic: {
    load: function() {
      var self = RPGACE.modules.softwareList;
      return RPGACE.kit.readPrivate('software_inventory', 'select=*&order=install_order.asc.nullslast,created_at.asc').then(function(rows) {
        self._rows = Array.isArray(rows) ? rows : []; return self._rows;
      });
    },
    owned: function(rows) { return (rows || []).filter(function(r) { return r.status === 'owned'; }); },
    review: function(rows) { return (rows || []).filter(function(r) { return r.status === 'to_review'; }); },
    // Pure: total spent on owned items, per currency.
    spend: function(rows) {
      var out = {};
      RPGACE.modules.softwareList.logic.owned(rows).forEach(function(r) {
        var p = Number(r.price); if (!p) return; var c = r.currency || 'GBP'; out[c] = Math.round(((out[c] || 0) + p) * 100) / 100;
      });
      return out;
    },
    spendLine: function(rows) {
      var s = RPGACE.modules.softwareList.logic.spend(rows), sym = { GBP: '£', USD: '$', EUR: '€' };
      var parts = Object.keys(s).map(function(c) { return (sym[c] || c + ' ') + s[c].toFixed(2); });
      return parts.length ? parts.join(' + ') : '£0';
    },
    save: function(row) {
      var clean = {};
      ['name', 'category', 'vendor', 'download_url', 'licence_ref', 'notes', 'account_email', 'currency', 'purchased_on', 'source_email_id', 'status', 'drive'].forEach(function(k) { if (row[k] !== undefined) clean[k] = row[k] === '' ? null : row[k]; });
      if (row.price !== undefined) clean.price = row.price === '' || row.price == null ? null : Number(row.price);
      if (row.install_order !== undefined) clean.install_order = row.install_order === '' || row.install_order == null ? null : parseInt(row.install_order, 10);
      if (row.installed_at !== undefined) clean.installed_at = row.installed_at;
      var p = row.id ? RPGACE.sb.secureWrite('software_inventory', 'update', clean, 'id=eq.' + row.id)
        : RPGACE.sb.secureWrite('software_inventory', 'insert', Object.assign({ status: 'owned' }, clean));
      return p.then(function() { RPGACE.cache.clear('software_inventory'); return RPGACE.modules.softwareList.logic.load(); });
    },
    // Nov 3 2026 (Alex: "give me a clickable list of things i want to count in, so i get rid of not needed"):
    // ticked ids -> owned, the rest of the review list -> not_needed (or left for later).
    bulk: function(keepIds, dropIds) {
      var w = function(ids, status) { return ids.length ? RPGACE.sb.secureWrite('software_inventory', 'update', { status: status }, 'id=in.(' + ids.join(',') + ')') : Promise.resolve(); };
      return w(keepIds, 'owned').then(function() { return w(dropIds, 'not_needed'); }).then(function() {
        RPGACE.cache.clear('software_inventory'); return RPGACE.modules.softwareList.logic.load();
      });
    },
    // Pure: Composio GMAIL_FETCH_EMAILS result -> [{id, subject, from, at, text}].
    mails: function(result) {
      var d = (result && (result.data || result)) || {}, list = d.messages || d.emails || [];
      if (!Array.isArray(list)) list = [];
      return list.map(function(m) {
        return { id: String(m.messageId || m.id || ''), subject: m.subject || '', from: m.sender || m.from || '',
          at: m.messageTimestamp || m.date || '', text: String(m.messageText || m.preview || m.snippet || '').slice(0, 1500) };
      }).filter(function(m) { return m.id; });
    },
    // Pure: model JSON -> rows to save (only real software purchases), defensively.
    parse: function(j, mails, account) {
      var items = (j && Array.isArray(j.items)) ? j.items : [], out = [];
      items.forEach(function(it) {
        var m = mails[Number(it.i)]; if (!m || !it || it.is_software !== true) return;
        var name = String(it.name || '').trim().slice(0, 120); if (!name) return;
        var price = Number(it.price); var date = /^\d{4}-\d{2}-\d{2}$/.test(String(it.date || '')) ? it.date : null;
        var url = /^https?:\/\//.test(String(it.download_url || '')) ? String(it.download_url).slice(0, 500) : null;
        out.push({ name: name, vendor: it.vendor ? String(it.vendor).slice(0, 80) : null,
          category: RPGACE.modules.softwareList.CATEGORIES.indexOf(it.category) >= 0 ? it.category : 'Other',
          price: isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null, currency: /^[A-Z]{3}$/.test(String(it.currency || '')) ? it.currency : 'GBP',
          purchased_on: date, download_url: url, source_email_id: account + ':' + m.id, account_email: account, status: 'to_review' });
      });
      return out;
    },
    // ── WR-15 (Nov 3 2026, Alex: "id like both email to highlight freebies in the future as missions ... the mission for
    // freebies need to be one with different context on each email, with link to go to email read or link to website
    // to claim freebie"): one 'Claim a freebie' mission; every freebie email becomes its own card (mission_contexts,
    // source 'email', email_url + claim_url). Same Gmail path as the purchase scan (rule 8).
    FREEBIE_QUERY: '(free OR freebie OR freebies OR "free download" OR giveaway OR "on us" OR "100% off" OR claim) (plugin OR vst OR "sample pack" OR samples OR kit OR preset OR presets OR loops OR drum OR synth OR "one shots") newer_than:30d',
    freebieMission: function() {
      var rt = RPGACE.modules.realmTasks, hit = rt && (rt._tasks || []).filter(function(t) { return t.context_kind === 'freebie' && t.status === 'kept'; })[0];
      if (hit) return Promise.resolve(hit);
      return RPGACE.sb.select('realm_tasks', 'select=id,realm,title&context_kind=eq.freebie&status=eq.kept&limit=1').then(function(r) { return (r && r[0]) || null; });
    },
    emailUrl: function(id) { return 'https://mail.google.com/mail/#all/' + encodeURIComponent(id); },
    // Pure: model JSON -> freebie cards (only real, claimable freebies; links must be http(s)).
    parseFreebies: function(j, mails, account, missionId) {
      var L = RPGACE.modules.softwareList.logic, out = [];
      ((j && Array.isArray(j.items)) ? j.items : []).forEach(function(it) {
        var m = mails[Number(it && it.i)]; if (!m || it.is_freebie !== true) return;
        var what = String(it.what || '').replace(/\s+/g, ' ').trim().slice(0, 100); if (what.length < 3) return;
        var vendor = String(it.vendor || '').trim().slice(0, 60);
        var claim = /^https?:\/\//.test(String(it.claim_url || '')) ? String(it.claim_url).slice(0, 500) : null;
        var exp = /^\d{4}-\d{2}-\d{2}$/.test(String(it.expires || '')) ? it.expires : null;
        out.push({ mission_id: missionId, realm: 'producer', title: (vendor ? vendor + ': ' : '') + what, detail: String(it.why || m.subject || '').slice(0, 300) || null,
          source: 'email', source_ref: 'gmail:' + account + ':' + m.id, email_url: L.emailUrl(m.id), claim_url: claim, expires_on: exp, status: 'kept' });
      });
      return out;
    },
    freebieScan: function(account, onStatus) {
      var self = RPGACE.modules.softwareList, L = self.logic, say = onStatus || function() {}, key = 'fb_checked_' + account;
      var seen = {}; try { seen = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}
      say('Looking for freebies…');
      return Promise.all([L.freebieMission(), RPGACE.api('GMAIL_FETCH_EMAILS', { query: L.FREEBIE_QUERY, max_results: 40 }, account),
        RPGACE.kit.readPrivate('mission_contexts', 'select=source_ref&source=eq.email&limit=2000')]).then(function(r) {
        var mission = r[0]; if (!mission) throw new Error('The Claim a freebie mission is missing');
        (r[2] || []).forEach(function(c) { if (c.source_ref) seen[c.source_ref] = 1; });
        var mails = L.mails(r[1]).filter(function(m) { return !seen['gmail:' + account + ':' + m.id]; });
        if (!mails.length) return { found: 0, emails: 0 };
        var found = 0, batches = []; for (var i = 0; i < mails.length; i += 10) batches.push(mails.slice(i, i + 10));
        return batches.reduce(function(p, batch, bi) {
          return p.then(function() {
            say('Reading emails ' + (bi * 10 + 1) + '–' + (bi * 10 + batch.length) + ' of ' + mails.length + '…');
            var prompt = 'These are emails to a beatmaker. For each one that offers a FREE plugin, sample pack, drum kit, preset bank, loops or other free music-production download he can claim, give: i (its number), is_freebie true, what (the free thing, short), vendor, claim_url (the link in the email to claim or download it; empty if none), expires (YYYY-MM-DD if the email gives a deadline, else empty), why (one short line on what it is). Sales, discounts, newsletters and paid offers: is_freebie false. Never invent links.\n\n' +
              batch.map(function(m, k) { return '#' + k + ' From: ' + m.from + ' | Subject: ' + m.subject + ' | Date: ' + m.at + '\n' + m.text; }).join('\n\n') +
              '\n\nReturn only JSON: {"items":[{"i":0,"is_freebie":true,"what":"","vendor":"","claim_url":"","expires":"","why":""}]}';
            return RPGACE.kit.ask(prompt, { json: true, max: 1000, model: RPGACE.modules.phylumPath && RPGACE.modules.phylumPath.MECHANICAL_MODEL, context: 'freebie email scan' }).then(function(j) {
              var rows = L.parseFreebies(j, batch, account, mission.id);
              batch.forEach(function(m) { seen['gmail:' + account + ':' + m.id] = 1; });
              try { localStorage.setItem(key, JSON.stringify(seen)); } catch (e) {}
              found += rows.length;
              return rows.length ? RPGACE.sb.secureWrite('mission_contexts', 'insert', rows) : null;
            });
          });
        }, Promise.resolve()).then(function() { RPGACE.cache.clear('mission_contexts'); return { found: found, emails: mails.length }; });
      });
    },
    // Claimed in Live now: the freebie joins My software as owned, free, with its claim link as the download.
    freebieClaimed: function(c) {
      if (!c || !c.id) return Promise.resolve();
      return RPGACE.sb.secureWrite('software_inventory', 'insert', { name: String(c.title || 'Freebie').slice(0, 120), category: 'Plugin', price: 0, currency: 'GBP',
        purchased_on: new Date().toISOString().slice(0, 10), download_url: c.claim_url || null, source_email_id: 'freebie:' + c.id, status: 'owned',
        notes: 'Free, claimed via the Claim a freebie mission' + (c.detail ? ': ' + String(c.detail).slice(0, 200) : '') })
        .catch(function(e) { if (!/duplicate|unique/i.test(e.message || '')) throw e; })
        .then(function() { RPGACE.cache.clear('software_inventory'); });
    },
    // WR-15 part 3 (Alex: "download manual to unlock full potential of plug in, look up videos on tutorials with gemini to
    // watch and send to local server or both"): one Gemini web lookup, saved to the Life Library (Knowledge) like every lookup.
    learnLookup: function(name) {
      var wl = RPGACE.modules.webLookup;
      if (!wl) return Promise.reject(new Error('Web lookup is not loaded'));
      return wl.logic.lookup('Official user manual (PDF or online) and the 3 best YouTube tutorials for "' + name + '" (music production plugin or sample pack). Give the links.',
        { keyPrefix: 'learn: ', title: 'Learn: ' + name, topics: [String(name).toLowerCase().slice(0, 40)], noPicker: true });
    },
    isYoutube: function(u) { return /^https?:\/\/(www\.|m\.)?(youtube\.com\/watch|youtu\.be\/)/i.test(String(u || '')); },
    toVideoworm: function(url) {
      return RPGACE.sb.secureWrite('intel_jobs', 'insert', { url: url, status: 'awaiting_realms', realms: [] });
    },
    // Emails already read (software or not) are remembered on this phone, so a re-scan only reads new ones.
    checked: function(account) {
      try { return JSON.parse(localStorage.getItem('sw_checked_' + account) || '{}') || {}; } catch (e) { return {}; }
    },
    markChecked: function(account, mails) {
      var c = RPGACE.modules.softwareList.logic.checked(account);
      mails.forEach(function(m) { c[account + ':' + m.id] = 1; });
      try { localStorage.setItem('sw_checked_' + account, JSON.stringify(c)); } catch (e) {}
    },
    // Search one Google account, read the new emails in batches of 10 (mechanical model), save what is software.
    scan: function(account, onStatus) {
      var self = RPGACE.modules.softwareList, L = self.logic, say = onStatus || function() {};
      say('Searching your emails…');
      return Promise.all([RPGACE.api('GMAIL_FETCH_EMAILS', { query: self.QUERY, max_results: 50 }, account), L.load()]).then(function(r) {
        var seen = L.checked(account); (r[1] || []).forEach(function(x) { if (x.source_email_id) seen[x.source_email_id] = 1; });
        var mails = L.mails(r[0]).filter(function(m) { return !seen[account + ':' + m.id]; });
        if (!mails.length) return { found: 0, emails: 0 };
        var batches = []; for (var i = 0; i < mails.length; i += 10) batches.push(mails.slice(i, i + 10));
        var found = 0;
        return batches.reduce(function(p, batch, bi) {
          return p.then(function() {
            say('Reading emails ' + (bi * 10 + 1) + '–' + (bi * 10 + batch.length) + ' of ' + mails.length + '…');
            var prompt = 'These are purchase/licence emails. For each one that is a purchase or licence of SOFTWARE, a plugin, a sample pack, a driver or recording gear software, give: i (its number), is_software true, name (product), vendor, category (one of ' + self.CATEGORIES.join(', ') + '), price (number, total paid), currency (3 letters), date (YYYY-MM-DD), download_url (a link from the email to download or the account page, else empty). Anything else: is_software false. Never invent prices or links.\n\n' +
              batch.map(function(m, k) { return '#' + k + ' From: ' + m.from + ' | Subject: ' + m.subject + ' | Date: ' + m.at + '\n' + m.text; }).join('\n\n') +
              '\n\nReturn only JSON: {"items":[{"i":0,"is_software":true,"name":"","vendor":"","category":"","price":0,"currency":"GBP","date":"","download_url":""}]}';
            return RPGACE.kit.ask(prompt, { json: true, max: 1000, model: RPGACE.modules.phylumPath && RPGACE.modules.phylumPath.MECHANICAL_MODEL, context: 'software list email scan' }).then(function(j) {
              var rows = L.parse(j, batch, account);
              found += rows.length;
              L.markChecked(account, batch);
              return rows.reduce(function(q, row) { return q.then(function() { return RPGACE.sb.secureWrite('software_inventory', 'insert', row).catch(function(e) { if (!/duplicate|unique/i.test(e.message || '')) throw e; }); }); }, Promise.resolve());
            });
          });
        }, Promise.resolve()).then(function() { RPGACE.cache.clear('software_inventory'); return L.load(); }).then(function() { return { found: found, emails: mails.length }; });
      });
    }
  },

  ui: {
    open: function() {
      var self = RPGACE.modules.softwareList, L = self.logic, U = self.ui, K = RPGACE.kit, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '🧰 My software', title: 'Everything you own, ready for a new laptop', width: '560px', closeLabel: 'Close' });
      pop.box.id = 'sw-list';
      var body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
      pop.box.appendChild(body);
      var paint = function() {
        var rows = self._rows || [], own = L.owned(rows), rev = L.review(rows);
        body.innerHTML = '';
        var tot = document.createElement('div'); tot.id = 'sw-total'; tot.style.cssText = 'font-size:15px;font-weight:700;color:var(--gold);';
        tot.textContent = '💷 Spent on your setup: ' + L.spendLine(rows) + ' · ' + own.length + ' owned';
        body.appendChild(tot);
        var bar = document.createElement('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        var add = K.btn('+ Add by hand', 'primary'); add.id = 'sw-add'; add.onclick = function() { U.edit({}, paint); };
        bar.appendChild(add);
        var status = document.createElement('div'); status.id = 'sw-status'; status.style.cssText = 'font-size:13px;color:var(--muted);width:100%;';
        self.ACCOUNTS.forEach(function(a) {
          var b = K.btn('🔎 Scan ' + a.label, ''); b.className += ' sw-scan'; b.dataset.account = a.key;
          b.onclick = function() {
            b.disabled = true;
            L.scan(a.key, function(t) { status.textContent = t; }).then(function(res) {
              status.textContent = res.emails ? 'Read ' + res.emails + ' new emails · ' + res.found + ' found to review' : 'No new purchase emails found.';
              paint();
            }, function(e) {
              b.disabled = false;
              var m = e.message || String(e);
              status.textContent = /No account for "gmail2"/.test(m) ? 'Your second Google account isn\'t connected yet - see the steps from your build session.' : '⚠️ Scan failed: ' + m;
              RPGACE.utils.toast('⚠️ ' + status.textContent, '#CC4A4A', 4500, 'softwareList');
            });
          };
          bar.appendChild(b);
        });
        bar.appendChild(status);
        self.ACCOUNTS.forEach(function(a) {
          var fb = K.btn('🎁 Find freebies: ' + a.label, ''); fb.className += ' sw-freebies'; fb.dataset.account = a.key;
          fb.onclick = function() {
            fb.disabled = true;
            L.freebieScan(a.key, function(t) { status.textContent = t; }).then(function(res) {
              fb.disabled = false;
              status.textContent = res.found ? '🎁 ' + res.found + ' freebie' + (res.found === 1 ? '' : 's') + ' added to the Claim a freebie mission (Producer).' : 'No new freebies in the last 30 days.';
            }, function(e) { fb.disabled = false; status.textContent = '⚠️ ' + (e.message || e); });
          };
          bar.insertBefore(fb, status);
        });
        body.appendChild(bar);
        if (rev.length) { var pk = K.btn('✅ Tick what counts (' + rev.length + ')', 'primary'); pk.id = 'sw-pick'; pk.style.minHeight = '48px'; pk.onclick = function() { U.pickList(paint); }; body.appendChild(pk); }
        if (rev.length) body.appendChild(U.section('📥 To review (' + rev.length + ')', rev, true, paint));
        body.appendChild(U.section('🧰 Your setup: install in this order', own, false, paint));
      };
      L.load().then(paint, function(e) { body.textContent = '⚠️ Could not load your software list: ' + (e.message || e); });
      return pop;
    },
    section: function(title, rows, reviewing, repaint) {
      var self = RPGACE.modules.softwareList, L = self.logic, K = RPGACE.kit;
      var box = document.createElement('div'); box.className = reviewing ? 'sw-review' : 'sw-owned';
      var h = document.createElement('div'); h.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:6px 0;';
      h.textContent = title; box.appendChild(h);
      if (!rows.length) { var e = document.createElement('div'); e.style.cssText = 'color:var(--muted);font-size:14px;'; e.textContent = reviewing ? '' : 'Nothing yet - scan your emails or add by hand.'; box.appendChild(e); return box; }
      rows.forEach(function(r) {
        var meta = [r.category, r.vendor, r.price ? (r.currency === 'GBP' ? '£' : (r.currency || '') + ' ') + Number(r.price).toFixed(2) : null, r.purchased_on, r.drive ? r.drive + ':' : null, r.licence_ref ? '🔐 ' + r.licence_ref : null].filter(Boolean).join(' · ');
        var tools = [];
        if (reviewing) {
          tools.push({ label: '✓ Keep', primary: true, fn: function() { L.save({ id: r.id, status: 'owned' }).then(repaint); } });
          tools.push({ label: 'Not needed', fn: function() { L.save({ id: r.id, status: 'not_needed' }).then(repaint); } });
        } else if (r.download_url) {
          tools.push({ label: '⬇ Download', fn: function() { window.open(r.download_url, '_blank', 'noopener'); } });
        }
        if (!reviewing && /Plugin|Sample pack|DAW/.test(r.category || '')) tools.push({ label: '📘 Manual + tutorials', fn: function() { self.ui.learn(r.name); } });
        tools.push({ label: '✏️ Edit', fn: function() { self.ui.edit(r, repaint); } });
        var card = K.taskCard({ cls: 'sw-item', id: String(r.id), icon: reviewing ? '📧' : (r.install_order ? '#' + r.install_order : '🧰'), title: r.name,
          metaHtml: '<div style="font-size:12px;color:var(--muted);">' + K.esc(meta) + '</div>', done: !reviewing && !!r.installed_at, mode: reviewing ? 'view' : 'do', tools: tools,
          onTick: reviewing ? null : function(nowDone) { return L.save({ id: r.id, installed_at: nowDone ? new Date().toISOString() : null }); },
          after: repaint });
        box.appendChild(card);
      });
      return box;
    },
    // One tick list for the whole review pile, grouped by category; one button saves it.
    pickList: function(repaint) {
      var self = RPGACE.modules.softwareList, L = self.logic, K = RPGACE.kit, dd = RPGACE.modules.dashDeck;
      var rows = L.review(self._rows || []), picked = {};
      var pop = dd._popup({ eyebrow: '🧰 My software', title: 'Tick what counts', width: '600px', closeLabel: 'Close' });
      pop.box.id = 'sw-pick-list';
      var note = document.createElement('div'); note.style.cssText = 'font-size:14px;color:var(--muted);margin-bottom:8px;';
      note.textContent = 'Tick everything you own or want counted. Unticked ones can be dropped in one go.';
      pop.box.appendChild(note);
      var cats = {}; rows.forEach(function(r) { (cats[r.category || 'Other'] = cats[r.category || 'Other'] || []).push(r); });
      Object.keys(cats).sort(function(a, b) { return self.CATEGORIES.indexOf(a) - self.CATEGORIES.indexOf(b); }).forEach(function(c) {
        var h = document.createElement('div'); h.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:12px 0 4px;';
        h.textContent = c + ' (' + cats[c].length + ')'; pop.box.appendChild(h);
        cats[c].forEach(function(r) {
          var lab = document.createElement('label'); lab.className = 'sw-pick-row'; lab.dataset.id = r.id;
          lab.style.cssText = 'display:flex;gap:12px;align-items:flex-start;padding:10px 4px;border-bottom:1px solid var(--border);cursor:pointer;';
          var cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.cssText = 'width:24px;height:24px;flex:0 0 auto;margin-top:2px;';
          cb.onchange = function() { if (cb.checked) picked[r.id] = 1; else delete picked[r.id]; count(); };
          var price = r.price != null ? (r.currency === 'GBP' ? '£' : r.currency === 'EUR' ? '€' : '$') + Number(r.price).toFixed(2) : '';
          var t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:0;';
          t.innerHTML = '<div style="font-size:15px;font-weight:700;">' + K.esc(r.name) + (price ? ' <span style="color:var(--gold);">' + price + '</span>' : '') + '</div>' +
            '<div style="font-size:12px;color:var(--muted);">' + K.esc([r.vendor, r.purchased_on, r.notes].filter(Boolean).join(' · ')) + '</div>';
          lab.appendChild(cb); lab.appendChild(t); pop.box.appendChild(lab);
        });
      });
      var bar = document.createElement('div'); bar.style.cssText = 'position:sticky;bottom:-24px;background:var(--panel);padding:12px 0;margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--border);';
      var keep = K.btn('', 'primary'); keep.id = 'sw-pick-keep'; keep.style.minHeight = '48px';
      var drop = K.btn('', ''); drop.id = 'sw-pick-drop'; drop.style.minHeight = '48px';
      var count = function() { var n = Object.keys(picked).length; keep.textContent = 'Keep ' + n + ' ticked, decide the rest later'; drop.textContent = 'Keep ' + n + ', drop the other ' + (rows.length - n); };
      count();
      var run = function(dropRest) {
        var keepIds = Object.keys(picked), dropIds = dropRest ? rows.filter(function(r) { return !picked[r.id]; }).map(function(r) { return String(r.id); }) : [];
        keep.disabled = drop.disabled = true;
        L.bulk(keepIds, dropIds).then(function() {
          RPGACE.utils.toast('✓ ' + keepIds.length + ' counted' + (dropRest ? ', ' + dropIds.length + ' dropped' : ''), '#4CAF50', 3000, 'softwareList');
          pop.close(); if (repaint) repaint();
        }, function(e) { keep.disabled = drop.disabled = false; RPGACE.utils.toast('⚠️ Could not save: ' + (e.message || e), '#CC4A4A', 4500, 'softwareList'); });
      };
      keep.onclick = function() { run(false); };
      // Two-tap arm (building guide 8); own copy because the label changes as you tick.
      var armed = null;
      drop.onclick = function() {
        if (!armed) { drop.textContent = 'Tap again: drop the unticked ones'; drop.style.color = '#CC4A4A'; armed = setTimeout(function() { armed = null; drop.style.color = ''; count(); }, 3000); return; }
        clearTimeout(armed); armed = null; drop.style.color = ''; run(true);
      };
      bar.appendChild(keep); bar.appendChild(drop); pop.box.appendChild(bar);
      return pop;
    },
    // WR-15: manual + tutorial links for a plugin/pack; YouTube ones can go to Videoworm (the laptop analyses them).
    learn: function(name) {
      var self = RPGACE.modules.softwareList, L = self.logic, K = RPGACE.kit, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '📘 Learn it', title: name, width: '520px', closeLabel: 'Close' }); pop.box.id = 'sw-learn';
      var st = document.createElement('div'); st.style.cssText = 'font-size:14px;color:var(--muted);'; st.textContent = '⏳ Gemini is finding the manual and tutorials…'; pop.box.appendChild(st);
      L.learnLookup(name).then(function(res) {
        st.textContent = res.reused ? 'From your Life Library (looked up ' + res.date + ')' : 'Saved to your Life Library.';
        if (res.answer) { var a = document.createElement('div'); a.style.cssText = 'font-size:14px;white-space:pre-wrap;margin:8px 0;'; a.textContent = res.answer.slice(0, 1200); pop.box.appendChild(a); }
        (res.sources || []).forEach(function(s) {
          if (!/^https?:\/\//.test(s.url || '')) return;
          var row = document.createElement('div'); row.className = 'sw-learn-row'; row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);';
          var ln = document.createElement('a'); ln.href = s.url; ln.target = '_blank'; ln.rel = 'noopener noreferrer'; ln.textContent = s.title || s.url; ln.style.cssText = 'flex:1;min-width:160px;color:var(--blue,#4A8CCC);word-break:break-word;';
          row.appendChild(ln);
          if (L.isYoutube(s.url)) {
            var vw = K.btn('▶ Send to Videoworm', ''); vw.className += ' sw-to-vw';
            vw.onclick = function() { vw.disabled = true; L.toVideoworm(s.url).then(function() { vw.textContent = '✓ Queued (pick realms in Videoworm)'; }, function(e) { vw.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500); }); };
            row.appendChild(vw);
          }
          pop.box.appendChild(row);
        });
      }, function(e) { st.textContent = '⚠️ ' + (e.message || e); });
      return pop;
    },
    edit: function(r, done) {
      var self = RPGACE.modules.softwareList, K = RPGACE.kit, dd = RPGACE.modules.dashDeck;
      var pop = dd._popup({ eyebrow: '🧰 My software', title: r.id ? 'Edit ' + r.name : 'Add software', width: '460px' });
      var f = document.createElement('div'); f.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var field = function(key, label, type, opts) {
        var l = document.createElement('label'); l.style.cssText = 'font-size:13px;color:var(--muted);display:flex;flex-direction:column;gap:4px;'; l.textContent = label;
        var i;
        if (opts) { i = document.createElement('select'); opts.forEach(function(o) { var op = document.createElement('option'); op.value = o; op.textContent = o || '-'; i.appendChild(op); }); }
        else { i = document.createElement('input'); i.type = type || 'text'; }
        i.id = 'sw-f-' + key; i.value = r[key] == null ? '' : r[key];
        i.style.cssText = 'min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font:inherit;';
        l.appendChild(i); f.appendChild(l); return i;
      };
      var inp = {
        name: field('name', 'Name'), category: field('category', 'Category', null, [''].concat(self.CATEGORIES)), vendor: field('vendor', 'Made by'),
        download_url: field('download_url', 'Download / account link', 'url'), install_order: field('install_order', 'Install order (1 = first)', 'number'),
        drive: field('drive', 'Install on', null, ['', 'C', 'E']), licence_ref: field('licence_ref', 'Licence lives in (Bitwarden entry name, never the key)'),
        price: field('price', 'Price paid', 'number'), purchased_on: field('purchased_on', 'Bought on', 'date')
      };
      var save = K.btn('Save', 'primary'); save.id = 'sw-save';
      save.onclick = function() {
        var row = { id: r.id }; Object.keys(inp).forEach(function(k) { row[k] = inp[k].value.trim(); });
        if (!row.name) { RPGACE.utils.toast('Give it a name', '#CC4A4A', 2500); return; }
        if (!r.id) row.status = 'owned';
        save.disabled = true;
        self.logic.save(row).then(function() { pop.close(); RPGACE.utils.toast('🧰 Saved', '#4caf82', 1800); if (done) done(); },
          function(e) { save.disabled = false; RPGACE.utils.toast('⚠️ Not saved: ' + (e.message || e), '#CC4A4A', 4000, 'softwareList'); });
      };
      f.appendChild(save); pop.box.appendChild(f);
      return pop;
    }
  },

  open: function() { return this.ui.open(); },
  // WR-15: once a day after sign-in, quietly look for new freebies in the main account.
  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:login', function() {
      setTimeout(function() {
        var day = new Date().toISOString().slice(0, 10), k = 'fb_auto_day';
        try { if (localStorage.getItem(k) === day) return; localStorage.setItem(k, day); } catch (e) { return; }
        self.logic.freebieScan('gmail').then(function(r) { if (r.found) RPGACE.utils.toast('🎁 ' + r.found + ' new freebie' + (r.found === 1 ? '' : 's') + ' to claim (Producer → Claim a freebie)', '#C9A84C', 4000); }).catch(function() {});
      }, 20000);
    });
  }
});
/* ===END:softwareList=== */
