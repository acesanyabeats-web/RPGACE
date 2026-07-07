/* ===MODULE:morningBrief=== */
RPGACE.register('morningBrief', {

  LAST_RUN_KEY: 'rpgace_morning_brief_last',

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() {
        self._injectButton();
        self._autoRun();
      }, 1200);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        setTimeout(function() { self._injectButton(); }, 400);
      }
    });
  },

  _injectButton: function() {
    if (document.getElementById('mb-btn')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    var self = this;

    var wrap = document.createElement('div');
    wrap.id = 'mb-wrap';
    wrap.style.cssText = 'margin-bottom:20px;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;';

    var btn = document.createElement('button');
    btn.id = 'mb-btn';
    btn.textContent = '☀️ Morning Brief';
    btn.style.cssText = 'padding:10px 20px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:8px;color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    btn.onclick = function() { self._generate(); };

    var lastRun = localStorage.getItem(self.LAST_RUN_KEY);
    var autoLabel = document.createElement('div');
    autoLabel.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.25);';
    autoLabel.textContent = lastRun ? 'Last run: ' + new Date(lastRun).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : 'Auto-runs once per morning';

    btnRow.appendChild(btn);
    btnRow.appendChild(autoLabel);
    wrap.appendChild(btnRow);

    var output = document.createElement('div');
    output.id = 'mb-output';
    output.style.cssText = 'display:none;';
    wrap.appendChild(output);

    // Insert at top of dashboard
    page.insertBefore(wrap, page.firstChild);
    console.log('[RPGACE:morningBrief] Button injected');
  },

  _autoRun: function() {
    var self = this;
    var lastRun = localStorage.getItem(self.LAST_RUN_KEY);
    if (lastRun) {
      var last = new Date(lastRun);
      var now = new Date();
      // Only auto-run if last run was not today
      if (last.toDateString() === now.toDateString()) return;
    }
    // Auto-run if it's before noon (morning session)
    var hour = new Date().getHours();
    if (hour < 13) {
      setTimeout(function() { self._generate(); }, 2000);
    }
  },

  _generate: function() {
    var self = this;
    var output = document.getElementById('mb-output');
    if (!output) return;
    output.style.display = 'block';
    output.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;padding:12px 0;">☀️ Gathering your morning data...</div>';

    // Gather all three sources in parallel
    var promises = [
      self._getGmail(),
      self._getShifts(),
      self._getYouTube(),
      self._getKnowledgeGaps(),
    ];

    Promise.all(promises).then(function(results) {
      var gmail    = results[0];
      var shifts   = results[1];
      var youtube  = results[2];
      var gaps     = results[3];

      output.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;padding:8px 0;">☀️ Writing your brief...</div>';

      var today = new Date();
      var dateStr = today.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long'});

      var prompt = 'Write a Morning Brief for Alex (@AceSanyaBeats), an independent UK music producer. Today is ' + dateStr + '.\n\n' +
        'RULES: Under 400 words total. Direct and useful. No fluff. No greetings. Start with the most urgent thing.\n\n' +
        'FORMAT — use these exact sections:\n' +
        '📧 INBOX (' + gmail.unread + ' unread)\n' +
        (gmail.subjects.length ? gmail.subjects.map(function(s){return '• ' + s}).join('\n') : '• Nothing urgent') + '\n\n' +
        '📅 TODAY\'S SHIFTS\n' +
        (shifts.today.length ? shifts.today.map(function(s){return '• ' + s}).join('\n') : '• No shifts today — full creative day') + '\n\n' +
        '🎬 YOUTUBE (@AceSanyaBeats)\n' +
        '• ' + youtube.summary + '\n\n' +
        '🧠 TOP KNOWLEDGE GAP\n' +
        '• ' + (gaps.top ? gaps.top + ' (gap score ' + gaps.score + '/10 — study this today)' : 'Sync your encyclopedia to track gaps') + '\n\n' +
        '⚡ CREATIVE WINDOW\n' +
        (shifts.freeTime ? '• ' + shifts.freeTime : '• Full day available') + '\n\n' +
        'End with ONE sharp action line for today. Maximum 15 words. No punctuation at end.';

      RPGACE.utils.sendToOracle(prompt);

      // Save last run timestamp
      localStorage.setItem(self.LAST_RUN_KEY, new Date().toISOString());

      // Update auto label
      var autoLabel = document.querySelector('#mb-wrap div[style*="font-size:10px"]');
      if (autoLabel) autoLabel.textContent = 'Last run: ' + new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});

      output.innerHTML = '<div style="color:rgba(201,168,76,0.6);font-size:11px;padding:8px 0;">☀️ Morning Brief sent to Oracle ↑</div>';

    }).catch(function(err) {
      output.innerHTML = '<div style="color:#E25454;font-size:12px;padding:8px 0;">Error: ' + err.message + '</div>';
    });
  },

  _getGmail: function() {
    return RPGACE.api('GMAIL_FETCH_EMAILS', { max_results: 10, label_ids: ['UNREAD'] })
      .then(function(result) {
        var messages = (result.data && result.data.messages) || result.messages || [];
        if (!Array.isArray(messages)) messages = [];
        var subjects = messages.slice(0, 5).map(function(m) {
          return m.subject || m.snippet || 'No subject';
        }).filter(function(s) { return s; });
        return { unread: messages.length, subjects: subjects };
      })
      .catch(function() {
        return { unread: 0, subjects: ['Could not fetch — check Gmail connection'] };
      });
  },

  _getShifts: function() {
    try {
      var shifts = JSON.parse(localStorage.getItem('rpgace_shifts') || '[]');
      var today = new Date().toISOString().split('T')[0];
      var todayShifts = shifts.filter(function(s) {
        return s.date === today || (s.date && s.date.startsWith(today));
      });

      var todayList = todayShifts.map(function(s) {
        return (s.start || '') + ' – ' + (s.end || '') + ' at ' + (s.location || s.venue || 'The Joiners Arms');
      });

      // Calculate free creative time
      var freeTime = null;
      if (todayShifts.length > 0) {
        var lastShift = todayShifts[todayShifts.length - 1];
        if (lastShift.end) {
          freeTime = 'Creative window after ' + lastShift.end;
        }
      } else {
        freeTime = 'Full day — no shifts. Protect at least 2 hours for FL Studio.';
      }

      // Also check tomorrow
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      var tomorrowStr = tomorrow.toISOString().split('T')[0];
      var tomorrowShifts = shifts.filter(function(s) { return s.date && s.date.startsWith(tomorrowStr); });
      if (tomorrowShifts.length > 0) {
        freeTime = (freeTime || '') + ' · Tomorrow: shift at ' + (tomorrowShifts[0].start || '?');
      }

      return Promise.resolve({ today: todayList, freeTime: freeTime });
    } catch(e) {
      return Promise.resolve({ today: [], freeTime: 'Could not read shifts' });
    }
  },

  _getYouTube: function() {
    return RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
      .then(function(result) {
        var d = result.data || result;
        var views = parseInt(d.viewCount) || 0;
        var videos = parseInt(d.videoCount) || 0;
        var summary = videos + ' videos · ' + views + ' total views';

        // Compare to stored previous stats
        var prev = JSON.parse(localStorage.getItem('rpgace_yt_prev') || '{}');
        if (prev.views) {
          var diff = views - (prev.views || 0);
          if (diff > 0) summary += ' · +' + diff + ' views since last check';
          else if (diff < 0) summary += ' · ' + diff + ' views since last check';
        }
        // Store current as previous
        localStorage.setItem('rpgace_yt_prev', JSON.stringify({ views: views, videos: videos, date: new Date().toISOString() }));
        return { summary: summary };
      })
      .catch(function() {
        return { summary: 'Could not fetch — check Composio connection' };
      });
  },

  _getKnowledgeGaps: function() {
    if (!RPGACE.modules.taxonomySync) return Promise.resolve({ top: null, score: null });
    return RPGACE.modules.taxonomySync.getTopGaps(1)
      .then(function(nodes) {
        if (!nodes || nodes.length === 0) return { top: null, score: null };
        return { top: nodes[0].concept, score: parseFloat(nodes[0].gap_score).toFixed(1) };
      })
      .catch(function() { return { top: null, score: null }; });
  },

});
/* ===END:morningBrief=== */
