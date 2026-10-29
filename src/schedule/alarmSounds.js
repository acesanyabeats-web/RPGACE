/* ===MODULE:alarmSounds=== */
// PA-1..PA-5 (Oct 28 2026, plan "Phone Alarms"; record records/2026-10/phone_alarm_paranoia_2026-10-28.txt).
// Alex: "i want it synced to my alarm on my phone, with sounds i want (i have some cool alarms i want to be used at
// random selection)" -> picks: MacroDroid on Android, wake alarm, sounds uploaded to RPGACE.
// Sounds live in alarm_sounds (+ public storage bucket alarm_sounds). A YouTube link is queued (status 'queued') and the
// laptop's local_server.py pulls the audio with yt-dlp (first 60 s, mp3). The phone checks the edge function
// alarm-feed every minute (q=status RING/WAIT, q=sound = the alarm's random sound, q=stop); it also stamps
// myday_settings.phone_last_seen, which this screen shows. Setup steps for MacroDroid: logic.SETUP (one copy).
RPGACE.register('alarmSounds', {
  domain: 'schedule',
  init: function() {},

  logic: {
    FEED: 'https://gripopghczmrbrhqtqbm.supabase.co/functions/v1/alarm-feed',
    SETUP: [
      ['Let it run', 'Android Settings → Apps → MacroDroid → Battery → Unrestricted. In MacroDroid allow everything it asks for (notifications, files).'],
      ['New macro "RPGACE alarm"', 'Trigger: Date/Time → Regular Interval → every 1 minute. (Optional constraint: Time of day 04:00–14:00 to save battery.)'],
      ['Ask RPGACE', 'Action: Connectivity → HTTP Request → GET → URL: FEED?q=status → save the response in a new global text variable called rpg_alarm.'],
      ['When it says RING', 'Action: If clause → rpg_alarm contains RING. Inside it: HTTP Request → GET → URL: FEED?q=sound → save the response to a file: Download/rpgace_alarm.mp3. Then Media → Play/Stop Sound → that file, on the Alarm stream (set its volume to taste). Then Applications → Launch Application → RPGACE (Force new and Exclude from recents off), so the ☀️ I\'m up cover is in front of you.'],
      ['A minute early', 'Before Else add Else If → rpg_alarm contains SOON → Launch Application → RPGACE. RPGACE says SOON a minute before the alarm, so the app is loaded and showing the cover when the sound starts.'],
      ['When it says WAIT', 'Add Else → Media → Play/Stop Sound → Stop. End If. Keep Launch Application inside the If (never after End If, or RPGACE opens every minute). Save the macro. The sound clip is about a minute long and plays again each minute until you stop it.'],
      ['Stop button', 'Second macro "RPGACE stop": Trigger: Shortcut Launched (add the shortcut to your home screen). Actions: Play/Stop Sound → Stop, then HTTP Request → GET → FEED?q=stop. ☀️ I\'m up in RPGACE also stops it at the next check.'],
      ['Test it', 'In RPGACE press 🔔 Test ring my phone. Within about a minute your phone should play one of your sounds and open RPGACE on a 🔔 Test ring cover. Tap ■ Stop test ring (or your RPGACE stop shortcut).']
    ],
    load: function() {
      return RPGACE.sb.select('alarm_sounds', 'select=id,title,source_url,url,status,error,created_at&status=neq.removed&order=created_at.asc')
        .then(function(r) { return Array.isArray(r) ? r : []; });
    },
    phoneSeen: function() {
      return RPGACE.sb.select('myday_settings', 'select=phone_last_seen&id=eq.1').then(function(r) { return r && r[0] && r[0].phone_last_seen || null; });
    },
    // 'connected' (checked in the last 10 min), 'quiet' (seen before, not lately), 'never'
    phoneState: function(seen, now) {
      if (!seen) return 'never';
      return ((now || Date.now()) - new Date(seen).getTime()) <= 10 * 60000 ? 'connected' : 'quiet';
    },
    addLink: function(url, title) {
      url = String(url || '').trim();
      if (!/^https?:\/\/\S+$/.test(url)) return Promise.reject(new Error('Paste a full link (https://…)'));
      var h = RPGACE.sb.headers(); h.Prefer = 'return=representation';
      return fetch(RPGACE.sb.url('alarm_sounds'), { method: 'POST', headers: h, body: JSON.stringify({ title: String(title || 'Alarm sound').slice(0, 120), source_url: url, status: 'queued' }) })
        .then(function(r) { if (!r.ok) throw new Error('Not saved (' + r.status + ')'); return r.json(); })
        .then(function(rows) { RPGACE.cache.clear('alarm_sounds'); return rows[0]; });
    },
    upload: function(file) {
      if (!file || !/^audio\//.test(file.type)) return Promise.reject(new Error('Pick an audio file (mp3, wav, ogg, m4a)'));
      if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('That file is over 8 MB'));
      var base = RPGACE.CONFIG.supabase.url, k = RPGACE.CONFIG.supabase.key;
      var ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
      var name = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return fetch(base + '/storage/v1/object/alarm_sounds/' + name, { method: 'POST', headers: { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': file.type, 'x-upsert': 'true' }, body: file })
        .then(function(r) { if (!r.ok) throw new Error('Upload failed (' + r.status + ')'); })
        .then(function() {
          var h = RPGACE.sb.headers(); h.Prefer = 'return=representation';
          return fetch(RPGACE.sb.url('alarm_sounds'), { method: 'POST', headers: h, body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, '').slice(0, 120), url: base + '/storage/v1/object/public/alarm_sounds/' + name, status: 'ready' }) });
        })
        .then(function(r) { if (!r.ok) throw new Error('Saved the file but not the list entry (' + r.status + ')'); RPGACE.cache.clear('alarm_sounds'); });
    },
    remove: function(id) {
      return RPGACE.sb.update('alarm_sounds', 'id=eq.' + id, { status: 'removed' }).then(function(r) {
        if (r && r.ok === false) throw new Error('Not removed (' + r.status + ')');
        RPGACE.cache.clear('alarm_sounds');
      });
    },
    retry: function(id) {
      return RPGACE.sb.update('alarm_sounds', 'id=eq.' + id, { status: 'queued', error: null }).then(function(r) {
        if (r && r.ok === false) throw new Error('Not queued (' + r.status + ')');
        RPGACE.cache.clear('alarm_sounds');
      });
    },
    // A one-off alarm due now: the phone rings at its next check (within a minute), then 'stop' or 60 min ends it.
    testRing: function() {
      var now = new Date(), day = RPGACE.kit.today();
      return RPGACE.sb.secureWrite('myday_alarms', 'insert', { day: day, kind: 'test:' + now.getTime(), at: now.toISOString(), status: 'set', stop_label: 'Test ring' })
        .then(function() { RPGACE.cache.clear('myday_alarms'); });
    }
  },

  ui: {
    open: function() {
      var self = RPGACE.modules.alarmSounds, L = self.logic, U = self.ui, K = RPGACE.kit;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '⏰ Wake alarm', title: '🔔 Alarm sounds & phone', width: '560px', closeLabel: 'Close' });
      pop.box.id = 'alarm-sounds';
      var status = document.createElement('div'); status.id = 'as-phone'; status.style.cssText = 'font-size:14px;line-height:1.5;margin-bottom:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);';
      status.textContent = 'Checking your phone…';
      pop.box.appendChild(status);
      var acts = document.createElement('div'); acts.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;';
      var test = K.btn('🔔 Test ring my phone', 'primary'); test.id = 'as-test';
      test.onclick = function() {
        test.disabled = true;
        L.testRing().then(function() { RPGACE.utils.toast('🔔 Test alarm set: your phone should ring within a minute', 'var(--gold)', 4000); },
          function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000); }).then(function() { test.disabled = false; });
      };
      var guide = K.btn('📱 MacroDroid setup', ''); guide.id = 'as-guide';
      guide.onclick = function() { U.openSetup(); };
      acts.appendChild(test); acts.appendChild(guide); pop.box.appendChild(acts);
      var list = document.createElement('div'); list.id = 'as-list'; pop.box.appendChild(list);
      var add = document.createElement('div'); add.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px;';
      var field = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;box-sizing:border-box;width:100%;font-family:inherit;';
      var link = document.createElement('input'); link.id = 'as-link'; link.type = 'url'; link.placeholder = 'Paste a YouTube link (your laptop pulls the audio)'; link.style.cssText = field;
      var name = document.createElement('input'); name.id = 'as-name'; name.placeholder = 'Name (optional)'; name.style.cssText = field;
      var addLink = K.btn('＋ Add from link', ''); addLink.id = 'as-add-link';
      addLink.onclick = function() {
        addLink.disabled = true;
        L.addLink(link.value, name.value || 'Alarm sound').then(function() { link.value = ''; name.value = ''; draw(); RPGACE.utils.toast('🔔 Queued: your laptop adds it when the local server is running', 'var(--gold)', 3500); },
          function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3500); }).then(function() { addLink.disabled = false; });
      };
      var file = document.createElement('input'); file.type = 'file'; file.accept = 'audio/*'; file.id = 'as-file'; file.style.display = 'none';
      var up = K.btn('⬆️ Upload a sound file', ''); up.id = 'as-upload';
      up.onclick = function() { file.click(); };
      file.onchange = function() {
        var f = file.files && file.files[0]; if (!f) return;
        up.disabled = true; up.textContent = 'Uploading…';
        L.upload(f).then(function() { draw(); RPGACE.utils.toast('🔔 Added ' + f.name, 'var(--gold)', 2500); },
          function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000); })
          .then(function() { up.disabled = false; up.textContent = '⬆️ Upload a sound file'; file.value = ''; });
      };
      add.appendChild(link); add.appendChild(name); add.appendChild(addLink); add.appendChild(up); add.appendChild(file);
      pop.box.appendChild(add);
      var draw = function() {
        L.phoneSeen().then(function(seen) {
          var s = L.phoneState(seen);
          status.dataset.state = s;
          status.style.borderColor = s === 'connected' ? '#4caf82' : '#CC4A4A';
          status.textContent = s === 'connected' ? '📱 Phone connected: it checked ' + Math.max(0, Math.round((Date.now() - new Date(seen).getTime()) / 60000)) + ' min ago. Your wake alarm will ring it.'
            : s === 'quiet' ? '📵 Your phone last checked ' + new Date(seen).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '. If MacroDroid is off, nothing will ring.'
            : '📵 No phone has checked in yet, so nothing will ring. Set up MacroDroid (button below), then press Test.';
        }).catch(function() { status.textContent = '⚠️ Could not read the phone status'; });
        L.load().then(function(rows) {
          list.innerHTML = '';
          var ready = rows.filter(function(r) { return r.status === 'ready'; }).length;
          var h = document.createElement('div'); h.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:6px;';
          h.textContent = ready ? ready + ' sound' + (ready === 1 ? '' : 's') + ' ready. Each wake alarm plays one at random.' : 'No sounds ready yet. The phone uses its default until one is.';
          list.appendChild(h);
          rows.forEach(function(r) {
            var row = document.createElement('div'); row.className = 'as-row'; row.dataset.id = r.id; row.dataset.status = r.status;
            row.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--border);';
            var t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:160px;font-size:14px;';
            t.textContent = r.title;
            var chip = document.createElement('div'); chip.style.cssText = 'font-size:12px;color:var(--muted);';
            chip.textContent = { queued: '⏳ waiting for your laptop', working: '⚙️ importing…', ready: '✅ ready', failed: '⚠️ failed: ' + String(r.error || '').slice(0, 80) }[r.status] || r.status;
            t.appendChild(chip); row.appendChild(t);
            if (r.status === 'ready' && r.url) {
              var play = K.btn('▶', ''); play.className = 'as-play'; play.title = 'Play';
              var audio = null;
              play.onclick = function() {
                if (audio && !audio.paused) { audio.pause(); play.textContent = '▶'; return; }
                audio = audio || new Audio(r.url); audio.currentTime = 0;
                audio.play().then(function() { play.textContent = '⏸'; }, function(e) { RPGACE.utils.toast('⚠️ Could not play: ' + (e.message || e), '#CC4A4A', 3000); });
                audio.onended = function() { play.textContent = '▶'; };
              };
              row.appendChild(play);
            }
            if (r.status === 'failed') {
              var again = K.btn('↻ Try again', ''); again.className = 'as-retry';
              again.onclick = function() { L.retry(r.id).then(draw, function(e) { RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3000); }); };
              row.appendChild(again);
            }
            var rm = K.btn('✕', ''); rm.className = 'as-remove'; rm.title = 'Remove';
            K.armConfirm(rm, function() { L.remove(r.id).then(draw, function(e) { rm.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 3000); }); }, 'Remove?');
            row.appendChild(rm);
            list.appendChild(row);
          });
        }).catch(function(e) { list.textContent = '⚠️ Could not load your sounds: ' + (e.message || e); });
      };
      draw();
      return pop;
    },
    openSetup: function() {
      var L = RPGACE.modules.alarmSounds.logic;
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🔔 Phone alarm', title: '📱 MacroDroid setup', width: '560px', closeLabel: 'Close' });
      pop.box.id = 'as-setup';
      var note = document.createElement('div'); note.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;line-height:1.5;';
      note.textContent = 'One-time setup on your Android. FEED below means this link (tap to copy): ';
      var feed = document.createElement('button'); feed.type = 'button'; feed.id = 'as-feed'; feed.textContent = L.FEED;
      feed.style.cssText = 'display:block;width:100%;text-align:left;word-break:break-all;min-height:44px;padding:8px 10px;margin:6px 0 10px;border-radius:8px;border:1px solid var(--gold);background:none;color:var(--gold);font-family:inherit;font-size:13px;cursor:pointer;';
      feed.onclick = function() { try { navigator.clipboard.writeText(L.FEED); RPGACE.utils.toast('📋 Copied', 'var(--gold)', 1500); } catch (e) {} };
      pop.box.appendChild(note); pop.box.appendChild(feed);
      L.SETUP.forEach(function(s, i) {
        var d = document.createElement('div'); d.className = 'as-step'; d.style.cssText = 'margin:8px 0;font-size:14px;line-height:1.55;';
        var b = document.createElement('b'); b.textContent = (i + 1) + '. ' + s[0] + ': ';
        d.appendChild(b); d.appendChild(document.createTextNode(s[1]));
        pop.box.appendChild(d);
      });
      return pop;
    }
  },

  open: function() { return this.ui.open(); }
});
/* ===END:alarmSounds=== */
