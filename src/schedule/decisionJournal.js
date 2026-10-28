
/* ===MODULE:decisionJournal=== */
// Oct 10 2026 — G1 (money guardrails, half 2) of the ratified /CEO plan
// "RPGACE Domains, Navigation & Deepstash Encyclopedia". A decision is
// logged with the reason at the time and a look-back date; when the date
// arrives the Journal page asks "how did it turn out?" and stores the
// answer next to the original reason. Rows live in the existing `journal`
// table (entry_type='decision', review_on, outcome) — no new table (rule 8),
// so they also show in the normal journal list and in Ask My Data.
RPGACE.register('decisionJournal', {
  domain: 'schedule',

  WEEKS: [2, 4, 8],

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (RPGACE.CONFIG && name === RPGACE.CONFIG.pages.journal) setTimeout(function() { self.ui.inject(); }, 300);
    });
  },

  logic: {
    today: function(now) {
      var d = now ? new Date(now) : new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    addWeeks: function(weeks, now) {
      var d = now ? new Date(now) : new Date();
      d.setDate(d.getDate() + weeks * 7);
      return RPGACE.modules.decisionJournal.logic.today(d.getTime());
    },
    split: function(rows, now) {
      var t = RPGACE.modules.decisionJournal.logic.today(now);
      var due = [], waiting = [], reviewed = [];
      (rows || []).forEach(function(r) {
        if (r.status === 'reviewed') reviewed.push(r);
        else if (r.review_on && r.review_on <= t) due.push(r);
        else waiting.push(r);
      });
      return { due: due, waiting: waiting, reviewed: reviewed };
    },
    load: function() {
      return RPGACE.sb.select('journal', 'select=id,title,content,review_on,outcome,status,created_at&entry_type=eq.decision&order=review_on.asc&limit=200')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    log: function(decision, why, weeks) {
      var L = RPGACE.modules.decisionJournal.logic;
      return RPGACE.sb.secureWrite('journal', 'insert', {
        title: '🧭 ' + decision,
        content: why || '',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        source: 'decision_journal',
        entry_type: 'decision',
        status: 'open',
        review_on: L.addWeeks(weeks),
        created_at: new Date().toISOString(),
      }).then(function() { RPGACE.cache.clear('journal'); });
    },
    review: function(id, outcome) {
      return RPGACE.sb.secureWrite('journal', 'update', { outcome: outcome, status: 'reviewed' }, 'id=eq.' + id)
        .then(function() { RPGACE.cache.clear('journal'); });
    },
  },

  ui: {
    inject: function() {
      var self = RPGACE.modules.decisionJournal;
      var out = document.getElementById('journal-output');
      if (!out) return;
      var strip = document.getElementById('dj-strip');
      if (!strip) {
        strip = document.createElement('div');
        strip.id = 'dj-strip';
        strip.style.cssText = 'background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px;';
        out.parentElement.insertBefore(strip, out);
      }
      strip.innerHTML = '<div style="font-size:12px;color:var(--muted);">Loading decisions…</div>';
      self.logic.load().then(function(rows) { self.ui.render(strip, rows); })
        .catch(function(e) { strip.innerHTML = ''; RPGACE.utils.toast('⚠️ Decisions failed to load: ' + (e.message || e), '#CC4A4A', 3500, 'decisionJournal'); });
    },

    render: function(strip, rows) {
      var self = RPGACE.modules.decisionJournal;
      var parts = self.logic.split(rows);
      strip.innerHTML = '';
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
      var h = document.createElement('div');
      h.style.cssText = 'font-weight:700;color:var(--text);font-size:14px;flex:1;min-width:140px;';
      h.textContent = '🧭 Decisions' + (parts.due.length ? ' — ' + parts.due.length + ' due for a look-back' : '');
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'learn-btn';
      add.style.cssText = 'border-color:var(--gold);color:var(--gold);min-height:40px;';
      add.textContent = '+ Log a decision';
      add.onclick = function() { self.ui.openLog(function() { self.ui.inject(); }); };
      head.appendChild(h); head.appendChild(add);
      strip.appendChild(head);
      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:12px;color:var(--muted);margin-top:4px;';
      sub.textContent = parts.waiting.length + ' waiting · ' + parts.reviewed.length + ' looked back on';
      strip.appendChild(sub);
      parts.due.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'margin-top:10px;padding:10px;border:1px solid rgba(226,168,61,0.35);border-radius:8px;';
        var t = document.createElement('div'); t.style.cssText = 'font-weight:700;color:var(--text);font-size:13px;'; t.textContent = r.title;
        var w = document.createElement('div'); w.style.cssText = 'font-size:12.5px;color:var(--muted);margin:4px 0 8px;'; w.textContent = 'Why at the time: ' + (r.content || '—');
        var b = document.createElement('button'); b.type = 'button'; b.className = 'learn-btn green'; b.style.minHeight = '40px';
        b.textContent = 'How did it turn out?';
        b.onclick = function() { self.ui.openReview(r, function() { self.ui.inject(); }); };
        row.appendChild(t); row.appendChild(w); row.appendChild(b);
        strip.appendChild(row);
      });
    },

    openLog: function(done) {
      var self = RPGACE.modules.decisionJournal;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🧭 Decision journal', title: 'Log a decision', width: '420px', noDefaultClose: true });
      var inp = 'width:100%;box-sizing:border-box;margin-top:4px;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:Rajdhani,sans-serif;';
      pop.box.innerHTML =
        '<label style="display:block;font-size:12px;color:var(--muted);margin-bottom:10px;">Decision<input id="dj-decision" type="text" placeholder="e.g. Buy a new wok instead of re-seasoning" style="' + inp + '"></label>' +
        '<label style="display:block;font-size:12px;color:var(--muted);margin-bottom:10px;">Why, right now<textarea id="dj-why" rows="3" placeholder="What you expect to happen and why" style="' + inp + 'resize:vertical;"></textarea></label>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Look back in</div>' +
        '<div id="dj-weeks" style="display:flex;gap:6px;margin-bottom:12px;"></div>' +
        '<div id="dj-err" style="color:#CC4A4A;font-size:12px;display:none;margin-bottom:8px;"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="dj-cancel" type="button" class="learn-btn" style="border-color:var(--muted);color:var(--muted);">Cancel</button>' +
          '<button id="dj-save" type="button" class="learn-btn green">Save</button>' +
        '</div>';
      var weeks = 4;
      var wb = pop.box.querySelector('#dj-weeks');
      var drawWeeks = function() {
        wb.innerHTML = '';
        self.WEEKS.forEach(function(n) {
          var c = document.createElement('button'); c.type = 'button'; c.textContent = n + ' weeks';
          c.style.cssText = 'flex:1;min-height:40px;border-radius:8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;' + (n === weeks ? 'background:var(--gold);color:#1a1405;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);');
          c.onclick = function() { weeks = n; drawWeeks(); };
          wb.appendChild(c);
        });
      };
      drawWeeks();
      pop.box.querySelector('#dj-cancel').onclick = function() { pop.close(); };
      pop.box.querySelector('#dj-save').onclick = function() {
        var d = pop.box.querySelector('#dj-decision').value.trim();
        var why = pop.box.querySelector('#dj-why').value.trim();
        var err = pop.box.querySelector('#dj-err');
        if (!d) { err.textContent = 'Write the decision first.'; err.style.display = 'block'; return; }
        this.disabled = true;
        var btn = this;
        self.logic.log(d, why, weeks).then(function() {
          pop.close();
          RPGACE.utils.toast('🧭 Logged — look-back in ' + weeks + ' weeks', '#4caf82', 2500);
          if (done) done();
        }).catch(function(e) { btn.disabled = false; err.textContent = 'Save failed: ' + (e.message || e); err.style.display = 'block'; });
      };
    },

    openReview: function(r, done) {
      var self = RPGACE.modules.decisionJournal;
      var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🧭 Look-back', title: r.title, width: '420px', noDefaultClose: true });
      pop.box.innerHTML =
        '<div style="font-size:13px;color:var(--text);margin-bottom:10px;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(255,255,255,0.03);">Why at the time: ' + esc(r.content || '—') + '</div>' +
        '<label style="display:block;font-size:12px;color:var(--muted);margin-bottom:10px;">How did it turn out? Would you decide the same again?<textarea id="dj-outcome" rows="4" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:Rajdhani,sans-serif;resize:vertical;"></textarea></label>' +
        '<div id="dj-rerr" style="color:#CC4A4A;font-size:12px;display:none;margin-bottom:8px;"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="dj-rcancel" type="button" class="learn-btn" style="border-color:var(--muted);color:var(--muted);">Later</button>' +
          '<button id="dj-rsave" type="button" class="learn-btn green">Save look-back</button>' +
        '</div>';
      pop.box.querySelector('#dj-rcancel').onclick = function() { pop.close(); };
      pop.box.querySelector('#dj-rsave').onclick = function() {
        var o = pop.box.querySelector('#dj-outcome').value.trim();
        var err = pop.box.querySelector('#dj-rerr');
        if (!o) { err.textContent = 'Write a line on how it went.'; err.style.display = 'block'; return; }
        var btn = this; btn.disabled = true;
        self.logic.review(r.id, o).then(function() {
          pop.close();
          RPGACE.utils.toast('✅ Look-back saved', '#4caf82', 2200);
          if (done) done();
        }).catch(function(e) { btn.disabled = false; err.textContent = 'Save failed: ' + (e.message || e); err.style.display = 'block'; });
      };
    },
  },

  inject: function() { return this.ui.inject(); },
  log: function(d, w, n) { return this.logic.log(d, w, n); },
});
/* ===END:decisionJournal=== */
