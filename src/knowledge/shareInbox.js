
/* ===MODULE:shareInbox=== */
// Oct 10 2026 — Alex: "when i see a short or instagram reel, i want to share
// it to rpgace as a sender, so it can send the link over to the app for
// analysis". manifest.json declares a Web Share Target, so the installed
// RPGACE app appears in the phone's share sheet (Android/Chrome). Sharing
// opens /?share_url=...&share_text=...; the query is read at script load
// (before login and before pathRouter rewrites the URL), held until
// rpgace:login, then the link is queued into intel_jobs - the exact same
// queue submitIntelURL() uses (rule 8), so the existing Content
// Intelligence pipeline analyses it and C1 turns the report into an
// Encyclopedia post. iPhone: Safari has no Web Share Target; an iOS
// Shortcut that opens the same URL works instead.
var _rpgaceShareAtLoad = (function() {
  try {
    var q = new URLSearchParams(location.search);
    if (!q.has('share_url') && !q.has('share_text') && !q.has('share_title')) return null;
    return { url: q.get('share_url') || '', text: q.get('share_text') || '', title: q.get('share_title') || '' };
  } catch (e) { return null; }
})();

RPGACE.register('shareInbox', {
  domain: 'knowledge',

  init: function() {
    var self = this;
    if (!_rpgaceShareAtLoad) return;
    try { history.replaceState(history.state, '', location.pathname); } catch (e) {}
    var fired = false;
    RPGACE.hooks.on('rpgace:login', function() {
      if (fired) return; fired = true;
      _rpgaceShareAtLoad.fromShare = true;
      setTimeout(function() { self.ui.handle(_rpgaceShareAtLoad); }, 800);
    });
  },

  logic: {
    // Instagram/TikTok put the link inside `text` ("Check out this reel
    // https://..."), YouTube usually in `url` - take the first real link
    // from any of the three.
    extractUrl: function(share) {
      if (!share) return null;
      var hay = [share.url, share.text, share.title].join(' ');
      var m = hay.match(/https?:\/\/[^\s<>"']+/i);
      if (!m) return null;
      return m[0].replace(/[).,;!?]+$/, '');
    },
    platform: function(url) {
      if (/^text:/.test(url)) return 'Text';
      if (/instagram\.com/i.test(url)) return 'Instagram';
      if (/tiktok\.com/i.test(url)) return 'TikTok';
      if (/youtu\.?be/i.test(url)) return /shorts\//i.test(url) ? 'YouTube Short' : 'YouTube';
      return RPGACE.modules.shareInbox.logic.isVideo(url) ? 'Video' : 'Web page';
    },
    // SA-1 (Oct 27 2026, Share anything): same list as rpgace_intel.VIDEO_HOSTS -
    // anything else is read as a web page; a share with no link is a text.
    isVideo: function(url) {
      return !/^text:/.test(url || '') && /(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|vimeo\.com|fb\.watch|facebook\.com\/(watch|reel|.+\/videos\/)|twitch\.tv|dailymotion\.com|soundcloud\.com|(twitter|x)\.com\/.+\/status)/i.test(url || '');
    },
    TEXT_MIN: 40,
    // { url, text }: a link when there is one, else the text itself under a
    // stable 'text:<hash>' key (so the same text is never queued twice).
    source: function(share) {
      var L = RPGACE.modules.shareInbox.logic, url = L.extractUrl(share);
      if (url) return { url: url };
      var t = [share && share.title, share && share.text].filter(Boolean).join('\n\n').trim();
      if (t.length < L.TEXT_MIN) return null;
      return { url: L.textKey(t), text: t.slice(0, 60000) };
    },
    // PA-1b (Oct 28 2026): a shared video whose title says alarm/ringtone/wake up may be a ringtone, not a lesson.
    looksLikeAlarm: function(share, url) {
      var hay = [share && share.title, share && share.text].filter(Boolean).join(' ');
      return RPGACE.modules.shareInbox.logic.isVideo(url) && /\b(alarm|ringtones?|wake[\s-]?up)\b/i.test(hay);
    },
    textKey: function(t) { return 'text:' + RPGACE.modules.lifeLibrary.logic.hashText(String(t || '').trim()); },
    whatOf: function(url) { var L = RPGACE.modules.shareInbox.logic; return /^text:/.test(url) ? 'text' : (L.isVideo(url) ? 'video' : 'page'); },
    // RI-2: an already-queued link is never asked about again; a new one
    // asks which realms it is for, then queues with them.
    queue: function(url, opts, text) {
      var enc = encodeURIComponent(url);
      return RPGACE.sb.select('intel_jobs', 'select=id,status&url=eq.' + enc + '&status=in.(queued,processing,awaiting_realms,awaiting_cc)')
        .then(function(rows) {
          var held = Array.isArray(rows) && rows.filter(function(r) { return r.status === 'awaiting_realms'; })[0];
          if (Array.isArray(rows) && rows.length && !held) return { already: rows[0].status };
          var L = RPGACE.modules.shareInbox.logic;
          return RPGACE.realmPicker.pick(Object.assign({ what: L.whatOf(url), title: text ? text.slice(0, 80) : url }, opts || {})).then(function(realms) {
            // RI-3: the same link again while it waits = answer it now.
            if (held) {
              if (!realms) return { already: 'waiting for realms', held: true };
              return RPGACE.realmPicker.release({ table: 'intel_jobs', id: held.id }, realms).then(function() { return { queued: true, realms: realms }; });
            }
            var row = { url: url, status: realms ? 'queued' : 'awaiting_realms', realms: realms || [] };
            if (text) row.text = text;
            return RPGACE.sb.secureWrite('intel_jobs', 'insert', row)
              .then(function() { return { queued: !!realms, held: !realms, realms: realms || [] }; });
          });
        });
    },
  },

  ui: {
    handle: function(share) {
      var self = RPGACE.modules.shareInbox;
      var src = self.logic.source(share);
      if (!src) { RPGACE.utils.toast('⚠️ Nothing to analyse - share a link, or a few sentences of text', '#CC4A4A', 4000, 'shareInbox'); return; }
      var url = src.url, kind = self.logic.platform(url);
      if (!(share && share.asLesson) && RPGACE.modules.alarmSounds && self.logic.looksLikeAlarm(share, url)) { self.ui.askAlarm(share, url, kind); return; }
      self.logic.queue(url, null, src.text).then(function(r) {
        // RI-3: "Not now" on the picker = saved, waits for realms.
        if (r.held && share && share.fromShare) { self.ui.sentScreen(kind, false, { title: 'Saved for later', sub: kind + ' waits until you pick its realms.' }); return; }
        if (r.held && !r.already) r.already = 'waiting for you to pick realms';
        if (share && share.fromShare) { self.ui.sentScreen(kind, r.already); return; }
        var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📥 Shared to RPGACE', title: kind + (r.held ? ' saved - pick realms to analyse it' : r.already ? ' already in the queue' : ' queued for analysis'), width: '420px' });
        var p = document.createElement('div');
        p.style.cssText = 'font-size:13px;color:var(--text);line-height:1.5;';
        var a = document.createElement('div');
        a.style.cssText = 'font-size:12px;color:var(--muted);word-break:break-all;margin-bottom:10px;';
        a.textContent = src.text ? src.text.slice(0, 160) + (src.text.length > 160 ? '…' : '') : url;
        p.appendChild(a);
        var t = document.createElement('div');
        t.textContent = r.already
          ? 'This link is already ' + r.already + '. Its Encyclopedia post appears once the analysis finishes.'
          : (kind === 'Text' || kind === 'Web page' ? 'It is read and analysed in the cloud (about 10 minutes), then it becomes an Encyclopedia write-up.' : 'Content Intelligence will transcribe and analyse it, then it becomes an Encyclopedia write-up.');
        p.appendChild(t);
        pop.box.appendChild(p);
      }).catch(function(e) {
        RPGACE.utils.toast('⚠️ Could not queue the shared link: ' + (e.message || e), '#CC4A4A', 4500, 'shareInbox');
      });
    },

    // PA-1b: "Use as alarm sound" (the laptop pulls the audio; no analysis spend) or analyse it as usual.
    askAlarm: function(share, url, kind) {
      var self = RPGACE.modules.shareInbox, K = RPGACE.kit;
      var title = String((share && (share.title || share.text)) || 'Alarm sound').replace(/https?:\/\/\S+/g, '').trim().slice(0, 120) || 'Alarm sound';
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📥 Shared to RPGACE', title: 'Alarm sound or lesson?', width: '420px' });
      pop.box.id = 'share-alarm-ask';
      var p = document.createElement('div'); p.style.cssText = 'font-size:14px;line-height:1.5;margin-bottom:10px;';
      p.textContent = '"' + title + '" looks like an alarm. Add it to your alarm sounds, or analyse it as a ' + kind + '?';
      pop.box.appendChild(p);
      var a = K.btn('🔔 Use as alarm sound', 'primary'); a.id = 'share-as-alarm'; a.style.width = '100%';
      a.onclick = function() {
        a.disabled = true;
        RPGACE.modules.alarmSounds.logic.addLink(url, title).then(function() {
          pop.close();
          if (share && share.fromShare) self.ui.sentScreen(kind, false, { title: 'Added to alarm sounds', sub: 'Your laptop pulls the audio when the local server runs.' });
          else RPGACE.utils.toast('🔔 Added to alarm sounds: your laptop pulls the audio', 'var(--gold)', 3500);
        }, function(e) { a.disabled = false; RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'shareInbox'); });
      };
      var l = K.btn('🎓 Analyse it', ''); l.id = 'share-as-lesson'; l.style.cssText += 'width:100%;margin-top:8px;';
      l.onclick = function() { pop.close(); self.ui.handle(Object.assign({}, share, { asLesson: true })); };
      pop.box.appendChild(a); pop.box.appendChild(l);
      return pop;
    },

    // Oct 10 2026 — Alex: "id also want to stay in the app im viewing when
    // im sending". A web app can't take a share in the background, so the
    // shortest path: confirm, then close this window, which on Android drops
    // back into the app the share came from. If the browser won't allow a
    // close, say so and offer to stay.
    // custom ({title, sub}, Oct 11 2026) lets screenshotInbox reuse this screen.
    sentScreen: function(kind, already, custom) {
      var o = document.createElement('div');
      o.id = 'share-sent';
      o.setAttribute('role', 'status');
      o.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--bg,#0d0f14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;font-family:Rajdhani,sans-serif;';
      o.innerHTML = '<div style="font-size:44px;">✓</div>' +
        '<div style="font-size:20px;font-weight:700;color:var(--text,#e2e2ec);">' + (already ? kind + ' already queued' : 'Sent to RPGACE') + '</div>' +
        '<div id="share-sent-sub" style="font-size:14px;color:var(--muted,#8a8fa3);">' + (already ? 'It\'s already waiting for analysis.' : kind + ' queued for analysis.') + ' Going back…</div>';
      if (custom) {
        o.children[1].textContent = custom.title || 'Saved';
        o.children[2].textContent = (custom.sub ? custom.sub + ' ' : '') + 'Going back…';
      }
      document.body.appendChild(o);
      setTimeout(function() {
        try { window.close(); } catch (e) {}
        setTimeout(function() {
          if (!document.getElementById('share-sent')) return;
          var sub = document.getElementById('share-sent-sub');
          if (sub) sub.textContent = (custom && custom.sub ? custom.sub + ' ' : '') + 'Press Back to return to the app you shared from.';
          var stay = document.createElement('button');
          stay.type = 'button'; stay.textContent = 'Stay in RPGACE';
          stay.style.cssText = 'margin-top:8px;min-height:44px;padding:8px 18px;border-radius:8px;background:none;border:1px solid var(--border,#2a2f3d);color:var(--text,#e2e2ec);font-size:15px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          stay.onclick = function() { o.remove(); };
          o.appendChild(stay);
        }, 500);
      }, 1200);
    },
  },

  handle: function(share) { return this.ui.handle(share); },
  extractUrl: function(share) { return this.logic.extractUrl(share); },
  sentScreen: function(k, a) { return this.ui.sentScreen(k, a); },
});
/* ===END:shareInbox=== */
