src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Fix 1: Make Oracle contribution textarea scrollable with max-height
old1 = """    var oracleContrib = document.createElement('textarea');
    oracleContrib.id = 'cr-oracle-contrib';
    oracleContrib.placeholder = 'Select from dropdown above, or paste Oracle content here...';
    oracleContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:100px;margin-bottom:10px;';"""

new1 = """    var oracleContrib = document.createElement('textarea');
    oracleContrib.id = 'cr-oracle-contrib';
    oracleContrib.placeholder = 'Select from dropdown above, or paste Oracle content here...';
    oracleContrib.style.cssText = 'width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#E2E2EC;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;min-height:80px;max-height:200px;overflow-y:auto;margin-bottom:10px;';"""

# Fix 2: Patch Morning Brief to include idea bank
old2 = """      var prompt = 'Write a Morning Brief for Alex (@AceSanyaBeats), an independent UK music producer. Today is ' + dateStr + '.\\n\\n' +
        'RULES: Under 400 words total. Direct and useful. No fluff. No greetings. Start with the most urgent thing.\\n\\n' +
        'FORMAT — use these exact sections:\\n' +
        '📧 INBOX (' + gmail.unread + ' unread)\\n' +
        (gmail.subjects.length ? gmail.subjects.map(function(s){return '• ' + s}).join('\\n') : '• Nothing urgent') + '\\n\\n' +
        '📅 TODAY\\'S SHIFTS\\n' +
        (shifts.today.length ? shifts.today.map(function(s){return '• ' + s}).join('\\n') : '• No shifts today — full creative day') + '\\n\\n' +
        '🎬 YOUTUBE (@AceSanyaBeats)\\n' +
        '• ' + youtube.summary + '\\n\\n' +
        '🧠 TOP KNOWLEDGE GAP\\n' +
        '• ' + (gaps.top ? gaps.top + ' (gap score ' + gaps.score + '/10 — study this today)' : 'Sync your encyclopedia to track gaps') + '\\n\\n' +
        '⚡ CREATIVE WINDOW\\n' +
        (shifts.freeTime ? '• ' + shifts.freeTime : '• Full day available') + '\\n\\n' +
        'End with ONE sharp action line for today. Maximum 15 words. No punctuation at end.';"""

new2 = """      // Get idea bank ideas for today's rotation
      var ideaPromise = (RPGACE.modules.conidPot && typeof RPGACE.modules.conidPot.getIdeasForBrief === 'function')
        ? RPGACE.modules.conidPot.getIdeasForBrief()
        : Promise.resolve([]);

      ideaPromise.then(function(ideas) {
        var ideaSection = '';
        if (ideas && ideas.length > 0) {
          var day = new Date().getDay();
          var dayLabels = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',0:'Sunday'};
          var rotationType = day === 3 || day === 4 ? 'oldest relevant' : day === 5 || day === 6 ? 'starred' : 'gap match';
          ideaSection = '\\n\\n💡 IDEA BANK (' + rotationType + ' — ' + dayLabels[day] + ')\\n' +
            ideas.map(function(i) { return '• ' + i.title; }).join('\\n');
        }

        var prompt = 'Write a Morning Brief for Alex (@AceSanyaBeats), an independent UK music producer. Today is ' + dateStr + '.\\n\\n' +
          'RULES: Under 400 words total. Direct and useful. No fluff. No greetings. Start with the most urgent thing.\\n\\n' +
          'FORMAT — use these exact sections:\\n' +
          '📧 INBOX (' + gmail.unread + ' unread)\\n' +
          (gmail.subjects.length ? gmail.subjects.map(function(s){return '• ' + s}).join('\\n') : '• Nothing urgent') + '\\n\\n' +
          '📅 TODAY\\'S SHIFTS\\n' +
          (shifts.today.length ? shifts.today.map(function(s){return '• ' + s}).join('\\n') : '• No shifts today — full creative day') + '\\n\\n' +
          '🎬 YOUTUBE (@AceSanyaBeats)\\n' +
          '• ' + youtube.summary + '\\n\\n' +
          '🧠 TOP KNOWLEDGE GAP\\n' +
          '• ' + (gaps.top ? gaps.top + ' (gap score ' + gaps.score + '/10 — study this today)' : 'Sync your encyclopedia to track gaps') +
          ideaSection + '\\n\\n' +
          '⚡ CREATIVE WINDOW\\n' +
          (shifts.freeTime ? '• ' + shifts.freeTime : '• Full day available') + '\\n\\n' +
          'End with ONE sharp action line for today. Maximum 15 words. No punctuation at end.';

        RPGACE.utils.sendToOracle(prompt);
        localStorage.setItem(self.LAST_RUN_KEY, new Date().toISOString());
        var autoLabel = document.querySelector('#mb-wrap div[style*="font-size:10px"]');
        if (autoLabel) autoLabel.textContent = 'Last run: ' + new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
        output.innerHTML = '<div style="color:rgba(201,168,76,0.6);font-size:11px;padding:8px 0;">☀️ Morning Brief sent to Oracle ↑</div>';
      });"""

# Fix 3: Remove the old Oracle send + localstorage block that's now inside ideaPromise
old3 = """      RPGACE.utils.sendToOracle(prompt);

      // Save last run timestamp
      localStorage.setItem(self.LAST_RUN_KEY, new Date().toISOString());

      // Update auto label
      var autoLabel = document.querySelector('#mb-wrap div[style*="font-size:10px"]');
      if (autoLabel) autoLabel.textContent = 'Last run: ' + new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});

      output.innerHTML = '<div style="color:rgba(201,168,76,0.6);font-size:11px;padding:8px 0;">☀️ Morning Brief sent to Oracle ↑</div>';

    }).catch(function(err) {"""

new3 = """      // handled inside ideaPromise above
    }).catch(function(err) {"""

count = 0
if old1 in src:
    src = src.replace(old1, new1, 1); count += 1; print("Fix 1: scrollable textarea")
else:
    print("Fix 1 ERROR")
if old2 in src:
    src = src.replace(old2, new2, 1); count += 1; print("Fix 2: morning brief ideas")
else:
    print("Fix 2 ERROR")
if old3 in src:
    src = src.replace(old3, new3, 1); count += 1; print("Fix 3: remove duplicate oracle send")
else:
    print("Fix 3 ERROR")

open('rpgace_core.js', 'w', encoding='utf-8').write(src)
print("Total:", count, "fixes")
