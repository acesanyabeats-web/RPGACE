/* ===MODULE:quickActions=== */
RPGACE.register('quickActions', {
  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._setup(); }, 600);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._setup(); }, 300);
      }
    });
  },

  _send: function(text) {
    var input = document.querySelector('#chat-input');
    if (!input) return;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof sendChat === 'function') {
      sendChat();
    } else {
      var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
      if (btn) btn.click();
    }
  },

  _setup: function() {
    var self = this;
    var row = document.querySelector('.quick-row');
    if (!row || row.dataset.qa === '1') return;
    row.dataset.qa = '1';

    // Fix the 4 broken quickPrompt buttons
    var broken = row.querySelectorAll('button[onclick*="quickPrompt"]');
    broken.forEach(function(btn) {
      var match = btn.getAttribute('onclick').match(/quickPrompt\('(.+)'\)/);
      if (!match) return;
      var text = match[1];
      var newBtn = btn.cloneNode(true);
      newBtn.removeAttribute('onclick');
      newBtn.addEventListener('click', function() {
        self._send(text);
      });
      btn.parentNode.replaceChild(newBtn, btn);
    });

    var allBtns = Array.from(row.querySelectorAll('button'));

    // YT Stats — Composio direct, correct Supadata field names
    var ytStatsBtn = allBtns.find(function(b) {
      return b.textContent.trim() === '🎬 YT stats';
    });
    if (ytStatsBtn && !ytStatsBtn.dataset.qa) {
      ytStatsBtn.dataset.qa = '1';
      ytStatsBtn.removeAttribute('onclick');
      ytStatsBtn.addEventListener('click', function() {
        RPGACE.utils.toast('Fetching YouTube stats...', '#C9A84C', 2000);
        RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
          .then(function(result) {
            var d = result.data || result;
            var msg = '📊 YouTube Stats for @AceSanyaBeats:\n'
              + 'Channel: ' + (d.name || 'AceSanya') + '\n'
              + 'Handle: ' + (d.handle || '@AceSanyaBeats') + '\n'
              + 'Total Views: ' + (d.viewCount || 0) + '\n'
              + 'Videos Published: ' + (d.videoCount || 0) + '\n'
              + (d.description ? 'Bio: ' + d.description + '\n' : '')
              + '\nGiven this is an early-stage channel (FL Studio / UK hip hop, targeting aspiring producers 18-35), what are the 3 most important things I should do THIS WEEK to grow @AceSanyaBeats? Be specific and actionable.';
            self._send(msg);
          })
          .catch(function(err) {
            self._send('YouTube stats fetch failed: ' + err.message);
          });
      });
    }

    // Log to Notion — Composio direct call, no Oracle relay
    var notionBtn = allBtns.find(function(b) {
      return b.textContent.includes('Log to Notion');
    });
    if (notionBtn && !notionBtn.dataset.qa) {
      notionBtn.dataset.qa = '1';
      notionBtn.removeAttribute('onclick');
      notionBtn.addEventListener('click', function() {
        var today = new Date().toISOString().split('T')[0];
        var title = 'RPGACE Session Log — ' + today;
        RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
          parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
          title: title,
          markdown: '## Session Log\n**Date:** ' + today + '\n\n**Source:** RPGACE Oracle\n\nSession logged from RPGACE.'
        }).then(function() {
          RPGACE.utils.toast('📓 Logged to Notion: ' + title, '#9B59B6', 3000);
        }).catch(function(err) {
          RPGACE.utils.toast('Notion failed: ' + err.message, '#E25454', 3000);
        });
      });
    }

    console.log('[RPGACE:quickActions] Quick-action bar patched');
  },
});
/* ===END:quickActions=== */
