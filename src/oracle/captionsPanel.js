/* ===MODULE:captionsPanel=== */
// Oct 10 2026 — O1 of the ratified /CEO plan "RPGACE Domains, Navigation &
// Deepstash Encyclopedia". Alex: the platform panels belong to Oracle, "but i
// think the panels are poorly designed". There were 3 near-copies of one
// side panel (instaOraclePanel 13 commands, youtubeOracle 8, tiktokOracle 8),
// each with its own button, its own colours, its own send path (YouTube
// skipped fillGaps), two with broken "??" icons, and no Back.
// This is the ONE panel now (rule 8): a single "📣 Platform Oracle" button on
// the Oracle page opens a shared dashDeck._popup (so it gets N1's Back
// header and phone-Back for free) with an Instagram / YouTube / TikTok
// switch. The command text itself still lives in each platform module's own
// CMDS (unchanged, nothing re-typed); those modules' open()/run() now just
// delegate here, so every old entry point (index.html's toggleInstaPanel
// button included) lands in the same panel.
RPGACE.register('captionsPanel', {
  domain: 'oracle',

  PLATFORMS: [
    { key: 'instagram', label: 'Instagram', emoji: '📸', mod: 'instaOraclePanel', accent: 'var(--purple)' },
    { key: 'youtube',   label: 'YouTube',   emoji: '🎬', mod: 'youtubeOracle',    accent: '#E06666' },
    { key: 'tiktok',    label: 'TikTok',    emoji: '🎵', mod: 'tiktokOracle',     accent: '#50DCB4' },
    // SH-6 (Oct 17 2026): the Business tab is gone - producerTools now sit in
    // the steps they belong to (Selling's Pitch/Deal/Promote, Beats' Idea).
  ],

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self.ui._btn(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (RPGACE.CONFIG && name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self.ui._btn(); }, 600);
    });
  },

  logic: {
    platform: function(key) {
      var P = RPGACE.modules.captionsPanel.PLATFORMS;
      for (var i = 0; i < P.length; i++) if (P[i].key === key) return P[i];
      return P[0];
    },

    commands: function(key) {
      var p = RPGACE.modules.captionsPanel.logic.platform(key);
      var m = RPGACE.modules[p.mod];
      var cmds = (m && m.CMDS) || [];
      var icons = (m && m.ICONS) || [];
      return cmds.map(function(c, i) { return { name: c[0], prompt: c[1], icon: icons[i] || p.emoji }; });
    },

    lastPlatform: function() {
      try { return localStorage.getItem('rpgace_captions_platform') || 'instagram'; } catch (e) { return 'instagram'; }
    },

    rememberPlatform: function(key) {
      try { localStorage.setItem('rpgace_captions_platform', key); } catch (e) {}
    },

    // One send path for all three platforms: fill any [TYPE ...] gaps, then
    // send to Oracle chat (switching to the Oracle page first if needed).
    run: function(key, i) {
      var self = RPGACE.modules.captionsPanel;
      var cmd = self.logic.commands(key)[i];
      if (!cmd) return;
      var p = self.logic.platform(key);
      // Oct 10 2026 (P1): optional "About a beat" context from the picker.
      var prompt = (RPGACE.modules.pathways && self._beat) ? RPGACE.modules.pathways.beatContext(cmd.prompt, self._beat) : cmd.prompt;
      self.logic.sendPrompt(prompt, p.emoji + ' ' + cmd.name);
    },
    // Fill the [GAPS], open Oracle chat and send. Shared by the Business
    // tools here and Selling's Deal step (SH-3, rule 8).
    sendPrompt: function(prompt, label) {
      var send = function(filled) {
        var go = function() {
          var ok = RPGACE.utils.sendToOracle(filled);
          if (ok === false) RPGACE.utils.toast('Couldn\'t send to Oracle chat — open Oracle and try again', '#CC4A4A', 3500, 'captionsPanel');
          else RPGACE.utils.toast(label, 'var(--gold)', 2000);
        };
        var pages = RPGACE.CONFIG && RPGACE.CONFIG.pages;
        if (!document.getElementById('chat-input') || (pages && !document.getElementById('page-' + pages.oracle).classList.contains('active'))) {
          if (typeof showPage === 'function' && pages) showPage(pages.oracle);
          setTimeout(go, 300);
        } else go();
      };
      if (RPGACE.utils.fillGaps) RPGACE.utils.fillGaps(prompt, send);
      else send(prompt);
    },
  },

  ui: {
    _btn: function() {
      if (document.getElementById('captions-ob')) return;
      var self = RPGACE.modules.captionsPanel;
      var tries = 0;
      var go = function() {
        tries++;
        if (document.getElementById('captions-ob')) return;
        var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]');
        if (!anchor) { if (tries < 20) setTimeout(go, 500); return; }
        var b = document.createElement('button');
        b.id = 'captions-ob';
        b.type = 'button';
        b.className = anchor.className;
        b.textContent = '📣 Platform Oracle';
        b.onclick = function() { self.open(); };
        anchor.parentElement.insertBefore(b, anchor.nextSibling);
      };
      setTimeout(go, 600);
      setTimeout(go, 1500);
      setTimeout(go, 3000);
    },

    open: function(key) {
      var self = RPGACE.modules.captionsPanel;
      key = key || self.logic.lastPlatform();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: 'Oracle', title: 'Platform Oracle — @AceSanyaBeats', width: '560px' });
      var tabs = document.createElement('div');
      tabs.setAttribute('role', 'tablist');
      tabs.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin-bottom:12px;';
      var list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var note = document.createElement('div');
      note.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;';
      var draw = function() {
        var p = self.logic.platform(key);
        self.logic.rememberPlatform(key);
        tabs.innerHTML = '';
        self.PLATFORMS.forEach(function(q) {
          var t = document.createElement('button');
          t.type = 'button';
          t.setAttribute('role', 'tab');
          t.setAttribute('aria-selected', q.key === key ? 'true' : 'false');
          t.textContent = q.emoji + ' ' + q.label;
          var on = q.key === key;
          t.style.cssText = 'min-height:44px;padding:8px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;' +
            (on ? 'background:var(--panel2);color:var(--text);border:2px solid ' + q.accent + ';' : 'background:none;color:var(--muted);border:1px solid var(--border);');
          t.onclick = function() { key = q.key; draw(); };
          tabs.appendChild(t);
        });
        var cmds = self.logic.commands(key);
        note.textContent = cmds.length + ' ' + p.label + ' commands, pre-filled for your channel. Tap one to send it to Oracle chat.';
        list.innerHTML = '';
        cmds.forEach(function(c, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:10px 14px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;color:var(--text);font-size:15px;font-family:Rajdhani,sans-serif;';
          var ic = document.createElement('span'); ic.textContent = c.icon; ic.style.fontSize = '18px';
          var tx = document.createElement('span'); tx.textContent = c.name;
          b.appendChild(ic); b.appendChild(tx);
          b.onclick = function() { pop.close(); self.logic.run(key, i); };
          list.appendChild(b);
        });
      };
      // Oct 10 2026 (P1): "About a beat" picker (logged beats + productions, BT-4).
      self._beat = null;
      var beatRow = document.createElement('label');
      beatRow.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);margin-bottom:12px;';
      beatRow.textContent = 'About a beat (optional)';
      var beatSel = document.createElement('select');
      beatSel.id = 'captions-beat';
      beatSel.style.cssText = 'min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font-size:14px;';
      beatSel.innerHTML = '<option value="">No specific beat</option>';
      beatRow.appendChild(beatSel);
      var beats = [];
      if (RPGACE.modules.pathways) RPGACE.modules.pathways.loadBeats().then(function(bs) {
        beats = bs;
        bs.forEach(function(b) { var o = document.createElement('option'); o.value = b.id; o.textContent = b.label; beatSel.appendChild(o); });
      });
      beatSel.onchange = function() { self._beat = beats.filter(function(b) { return b.id === beatSel.value; })[0] || null; };
      pop.box.appendChild(tabs);
      pop.box.appendChild(beatRow);
      pop.box.appendChild(note);
      pop.box.appendChild(list);
      draw();
      return pop;
    },
  },

  // Public pass-throughs (G53 convention).
  open: function(key) { return this.ui.open(key); },
  run: function(key, i) { return this.logic.run(key, i); },
  commands: function(key) { return this.logic.commands(key); },
});
/* ===END:captionsPanel=== */
