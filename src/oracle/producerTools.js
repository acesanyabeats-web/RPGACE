
/* ===MODULE:producerTools=== */
// Oct 10 2026 — B1 ("Producer business tools") of the ratified /CEO plan
// "RPGACE Domains, Navigation & Deepstash Encyclopedia". Five ideas from
// Alex's 50-projects list re-aimed at a producer: 28 A&R critic, 26 cold
// outreach, 29 contract red flags, 48 negotiation rehearsal, 43 playlist
// psychologist. Prompts only - no tables, no new send path: captionsPanel
// showed them as its Business tab (fillGaps -> Oracle chat) until SH-6 (Oct 17 2026) moved each into its step; its
// About-a-beat picker prefixes them with a real beat. 49 (rate
// calculator) stays out: chronicles_finance has no rows to price from.
RPGACE.register('producerTools', {
  domain: 'oracle',

  CMDS: [
    ['A&R Critic', 'Act as a harsh but fair A&R at a UK label hearing this for the first time. WHAT IT IS: [DESCRIBE THE BEAT OR VIDEO, OR PICK A BEAT ABOVE]. WHO IT IS FOR: [TYPE THE ARTIST OR AUDIENCE]. Score 1-10 on: the first 10 seconds, drums, melody or sample, mix, arrangement, and how it stands out from what is out in UK hip hop and drill right now. For every score under 7 give one specific fix I can do in FL Studio. End with one verdict - post it now, fix first, or scrap it - and one sentence why. No praise padding.'],
    ['Artist Outreach', 'Write a cold outreach message from me (AceSanyaBeats, UK hip hop and drill producer) to [TYPE THE ARTIST AND WHERE YOU FOUND THEM]. WHAT I AM OFFERING: [TYPE IT - e.g. a beat pack, an exclusive, a placement]. ONE REAL DETAIL ABOUT THEIR MUSIC: [TYPE A SONG OR DETAIL OF THEIRS]. Rules: under 90 words, mention that detail, one clear ask, no begging, no "hope you are well". Give 3 versions: an Instagram DM, an email with a subject line, and a 2-line follow-up to send 5 days later if they do not reply.'],
    ['Contract Red Flags', 'I am a music producer. Explain this contract or licence in plain English. CONTRACT TEXT: [PASTE THE CONTRACT OR LICENCE TERMS]. Give me: what I am granting (rights, term, territory, exclusivity); what I get paid and when (fees, royalties, publishing split, master points); every red flag ranked high, medium or low with the exact clause quoted; the questions to ask before signing; and what is normal for UK producer deals. End by saying this is not legal advice and that a deal worth real money should be checked by a music lawyer.'],
    ['Negotiation Rehearsal', 'Role-play a negotiation so I can practise. YOU PLAY: [TYPE WHO - e.g. an artist\'s manager, a label A&R, a sync agent]. WE ARE NEGOTIATING: [TYPE WHAT - e.g. an exclusive price for a beat, producer points on a single]. MY TARGET: [TYPE YOUR TARGET PRICE OR TERMS]. MY WALK-AWAY POINT: [TYPE YOUR MINIMUM]. Play them realistically and push back hard. Send one message at a time and wait for my reply. When I type "debrief", score how I did out of 10, show where I gave away value, and give me the line I should have used.'],
    ['Playlist Psychologist', 'Turn my listening into beat ideas. WHAT I HAVE BEEN LISTENING TO: [PASTE YOUR RECENT TOP TRACKS OR ARTISTS - e.g. from Last.fm]. Tell me: the 3 moods or energies that dominate, what that says about what I am drawn to right now, and 3 concrete beat ideas that come from it. Each idea: BPM, key, drum style, one melody or sample idea, and one reference track - 4 lines max per idea.'],
  ],
  ICONS: ['🎧', '✉️', '📜', '🤝', '🎶'],

  init: function() {},

  logic: {
    // Name-based lookup, so reordering CMDS never breaks a caller.
    find: function(name) {
      var C = RPGACE.modules.producerTools.CMDS;
      for (var i = 0; i < C.length; i++) if (C[i][0] === name) return i;
      return -1;
    },
    // XP-7 (Oct 14 2026): outreach + collab log. Private outreach_log table,
    // read and written through /api/data-write after sign-in. The database
    // pays Hustler XP (outreach 10, capped per day; collab 150) and, when a
    // person is picked, moves their last_spoke so it counts as catching up.
    loadOutreach: function() {
      return RPGACE.modules.tripPlans.logic.read('outreach_log', 'select=*&order=done_on.desc,created_at.desc&limit=20');
    },
    loadPeople: function() {
      return RPGACE.modules.tripPlans.logic.read('people', 'select=id,name&order=name.asc&limit=300');
    },
    outreachKind: function(text) { return /collab|worked with|session with|made a (beat|track|song) with/i.test(String(text || '')) ? 'collab' : 'outreach'; },
    addOutreach: function(o) {
      var who = String(o.who || '').trim();
      if (!who) return Promise.reject(new Error('Who was it with?'));
      var row = { kind: o.kind === 'collab' ? 'collab' : 'outreach', who: who, note: String(o.note || '').trim() || null, person_id: o.personId || null };
      if (o.date) row.done_on = o.date;
      return RPGACE.sb.secureWrite('outreach_log', 'insert', row).then(function(d) {
        if (RPGACE.modules.xpSeason) RPGACE.modules.xpSeason.logic.clear();
        return d;
      });
    },
  },

  ui: {
    // SH-6 (Oct 17 2026): the outreach & collabs log lives on Selling home.
    open: function() { var sh = RPGACE.modules.sellingHub; if (sh) sh.open(); },
    _btnCss: 'min-height:44px;padding:8px 12px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;',
    // The log block (on Selling home since SH-6).
    renderOutreachInto: function(box, prefill) {
      var P = RPGACE.modules.producerTools, U = P.ui;
      var wrap = document.createElement('div');
      wrap.id = 'outreach-log';
      wrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid var(--border);';
      var h = document.createElement('div');
      h.style.cssText = 'font-size:13px;font-weight:700;color:var(--gold);margin-bottom:8px;';
      h.textContent = '📤 Outreach & collabs log (Hustler XP)';
      var btns = document.createElement('div');
      btns.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      [['outreach', '📤 Outreach sent'], ['collab', '🤝 Collab done']].forEach(function(k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ol-add-' + k[0]; b.textContent = k[1];
        b.style.cssText = U._btnCss + 'background:var(--panel2);color:var(--text);border:1px solid var(--border);';
        b.onclick = function() { U._outreachForm(wrap, { kind: k[0] }); };
        btns.appendChild(b);
      });
      var list = document.createElement('div'); list.className = 'ol-list';
      list.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:10px;font-size:13px;';
      wrap.appendChild(h); wrap.appendChild(btns); wrap.appendChild(list);
      box.appendChild(wrap);
      U._drawOutreachList(list);
      if (prefill) U._outreachForm(wrap, prefill);
      return wrap;
    },
    _drawOutreachList: function(list) {
      var tp = RPGACE.modules.tripPlans;
      if (!tp || !tp.logic.signedIn || !tp.logic.signedIn()) { list.textContent = 'Sign in to see your log.'; return; }
      RPGACE.modules.producerTools.logic.loadOutreach().then(function(rows) {
        list.innerHTML = '';
        if (!rows || !rows.length) { list.textContent = 'Nothing logged yet. Each message sent is +10 XP, each collab +150.'; list.style.color = 'var(--muted)'; return; }
        rows.slice(0, 10).forEach(function(r) {
          var d = document.createElement('div'); d.className = 'ol-row';
          d.style.cssText = 'display:flex;gap:8px;color:var(--text);';
          var a = document.createElement('span'); a.textContent = r.kind === 'collab' ? '🤝' : '📤';
          var b = document.createElement('span'); b.style.flex = '1'; b.textContent = r.who + (r.note ? ' · ' + r.note.slice(0, 60) : '');
          var c = document.createElement('span'); c.style.color = 'var(--muted)'; c.textContent = String(r.done_on || '').slice(5);
          d.appendChild(a); d.appendChild(b); d.appendChild(c); list.appendChild(d);
        });
      }).catch(function(e) { list.textContent = 'Log could not load: ' + (e.message || e); });
    },
    _outreachForm: function(wrap, pre) {
      var P = RPGACE.modules.producerTools, U = P.ui;
      var old = wrap.querySelector('.ol-form'); if (old) old.remove();
      pre = pre || {};
      var f = document.createElement('div'); f.className = 'ol-form';
      f.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px;padding:10px;border:1px solid var(--border);border-radius:8px;';
      var field = 'min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-size:14px;font-family:inherit;width:100%;box-sizing:border-box;';
      var today = new Date(); today = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      f.innerHTML = '<label style="font-size:12px;color:var(--muted);">What<select class="ol-kind" style="' + field + 'margin-top:2px;"><option value="outreach">📤 Outreach sent (+10 XP)</option><option value="collab">🤝 Collab done (+150 XP)</option></select></label>' +
        '<label style="font-size:12px;color:var(--muted);">Who<input class="ol-who" placeholder="Artist, manager, channel…" style="' + field + 'margin-top:2px;"></label>' +
        '<label style="font-size:12px;color:var(--muted);">From your People (optional, counts as catching up)<select class="ol-person" style="' + field + 'margin-top:2px;"><option value="">— not in People —</option></select></label>' +
        '<label style="font-size:12px;color:var(--muted);">Note (optional)<input class="ol-note" placeholder="e.g. sent the drill pack" style="' + field + 'margin-top:2px;"></label>' +
        '<label style="font-size:12px;color:var(--muted);">Date<input class="ol-date" type="date" style="' + field + 'margin-top:2px;"></label>';
      var q = function(s) { return f.querySelector(s); };
      q('.ol-kind').value = pre.kind === 'collab' ? 'collab' : 'outreach';
      q('.ol-who').value = pre.who || ''; q('.ol-note').value = pre.note || ''; q('.ol-date').value = today;
      P.logic.loadPeople().then(function(ps) {
        (ps || []).forEach(function(p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; q('.ol-person').appendChild(o); });
      }).catch(function() {});
      q('.ol-person').onchange = function() { var o = q('.ol-person').selectedOptions[0]; if (o && o.value && !q('.ol-who').value.trim()) q('.ol-who').value = o.textContent; };
      var err = document.createElement('div'); err.style.cssText = 'color:#CC4A4A;font-size:13px;display:none;';
      var save = document.createElement('button'); save.type = 'button'; save.className = 'ol-save'; save.textContent = 'Save';
      save.style.cssText = U._btnCss + 'background:var(--gold);color:#1a1405;border:none;';
      save.onclick = function() {
        save.disabled = true; err.style.display = 'none';
        P.logic.addOutreach({ kind: q('.ol-kind').value, who: q('.ol-who').value, personId: q('.ol-person').value || null, note: q('.ol-note').value, date: q('.ol-date').value })
          .then(function() {
            RPGACE.utils.toast(q('.ol-kind').value === 'collab' ? '🤝 Collab logged' : '📤 Outreach logged', '#4CAF82');
            f.remove(); U._drawOutreachList(wrap.querySelector('.ol-list'));
          })
          .catch(function(e) { save.disabled = false; err.textContent = e.message || String(e); err.style.display = 'block'; });
      };
      f.appendChild(err); f.appendChild(save);
      wrap.insertBefore(f, wrap.querySelector('.ol-list'));
      q('.ol-who').focus();
    },
    // From Oracle chat: open Selling home's log with the form filled in (nothing saved yet).
    openOutreach: function(pre) {
      var sh = RPGACE.modules.sellingHub;
      if (!sh) return null;
      sh.open();
      var tries = 0;
      var go = function() {
        var wrap = document.querySelector('#sh-log #outreach-log');
        if (!wrap) { if (++tries < 20) setTimeout(go, 150); return; }
        RPGACE.modules.producerTools.ui._outreachForm(wrap, pre || {});
        try { wrap.scrollIntoView({ block: 'start' }); } catch (e) {}
      };
      setTimeout(go, 100);
      return null;
    },
    // SH-6: one tool by name, straight to Oracle chat (same send path - rule 8).
    send: function(name, context) {
      var P = RPGACE.modules.producerTools, cp = RPGACE.modules.captionsPanel, i = P.logic.find(name);
      if (i < 0 || !cp) { RPGACE.utils.toast('Business tools are not loaded', '#CC4A4A', 3000, 'producerTools'); return; }
      cp.logic.sendPrompt((context ? context + '\n\n' : '') + P.CMDS[i][1], P.ICONS[i] + ' ' + name);
    },
  },

  open: function() { return this.ui.open(); },
  openOutreach: function(pre) { return this.ui.openOutreach(pre); },
  run: function(i) { var P = RPGACE.modules.producerTools; return P.ui.send(P.CMDS[i][0]); },
});
/* ===END:producerTools=== */
