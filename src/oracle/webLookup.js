
/* ===MODULE:webLookup=== */
// Oct 13 2026 — LL-5 of the ratified plan "Life Library & Knowledge
// Untangle". Alex: "make it that oracle uses gemini to search web for links
// when I'm learning, or search for something relevant when I'm asking
// something off the internet ... stored by date and topic if I ever need
// revisiting". His choices: Oracle decides when to search (and always shows
// "🌐 Searched"), every lookup is saved, at most 1 search per message.
// How it works (same shape as askMyData, rule 8):
//   1. sendChat marks its one main-chat callOracle as a chat turn
//      (markChatTurn). oracleAppGrounding's existing callOracle wrap - a 6th
//      gate in that SAME wrap, never a new window.callOracle wrapper - adds
//      buildWebBlock() to that turn only, so recipe/extractor/system calls
//      never get it.
//   2. Oracle may end its reply with one single-line trailer:
//        WEB_QUERY: <short search question>
//      (single line: oracle:response-scanned reads rendered DOM text.)
//   3. The hook strips it, checks the Life Library first (a lookup of the
//      same question in the last 30 days is reused - no web call), else
//      sends ONLY the search question to /api/search type web (Gemini),
//      saves the result as a 'web_lookup' Library item, shows
//      "🌐 Searched the web" with the sources, and makes ONE follow-up
//      callOracle that never gets the block, so it cannot loop.
// findLinks() serves the "🔗 Find links" buttons (Jargon terms, Bookworm
// insights): same library-first + save path.
RPGACE.register('webLookup', {
  domain: 'oracle',

  REUSE_DAYS: 30,
  STOP: ['the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'is', 'are', 'what', 'whats', 'how', 'who', 'when', 'where', 'which', 'does', 'do', 'with', 'about', 'best', 'my', 'i', 'me', 'it', 'be', 'can'],

  _chatTurnAt: 0,
  _busy: false,

  init: function() {
    var self = this;
    RPGACE.hooks.on('oracle:response-scanned', function(text, lastMsg) { self.logic._onReply(text, lastMsg); });
  },

  logic: {
    // sendChat calls this right before its one callOracle; the grounding
    // wrap consumes it (one-shot, 5s window) so no other call sees the block.
    markChatTurn: function() { RPGACE.modules.webLookup._chatTurnAt = Date.now(); },
    takeChatTurn: function() {
      var m = RPGACE.modules.webLookup, ok = m._chatTurnAt && (Date.now() - m._chatTurnAt) < 5000;
      m._chatTurnAt = 0;
      return !!ok;
    },
    buildWebBlock: function() {
      return '\n\nWEB LOOKUP: if a good answer needs current or outside information you do not reliably know (recent releases, prices, news, a specific person/product/place, or links to learn something), reply with ONE short sentence saying you will look it up, then end your reply with exactly one line, nothing after it:\nWEB_QUERY: <a short web search question>\nNever emit it for things you already know well, for Alex\'s own saved data, or for small talk. Never put personal details in the question.';
    },
    parseTrailer: function(text) {
      var m = /WEB_QUERY:\s*([^\n]+)/i.exec(String(text || ''));
      if (!m) return null;
      var q = m[1].replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      return q.length >= 3 ? q : null;
    },
    // "What's the latest FL Studio version?" -> "fl latest studio version"
    queryKey: function(q) {
      var stop = RPGACE.modules.webLookup.STOP;
      var words = String(q || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter(function(w) { return w && stop.indexOf(w) === -1; });
      var seen = {};
      return words.filter(function(w) { if (seen[w]) return false; seen[w] = 1; return true; }).sort().join(' ').slice(0, 120);
    },
    // A saved lookup for the same question, taken in within REUSE_DAYS.
    findSaved: function(key) {
      var ll = RPGACE.modules.lifeLibrary;
      if (!ll || !key) return Promise.resolve(null);
      return ll.logic.read('library_items', 'select=*&source_table=eq.web_lookup&source_id=eq.' + encodeURIComponent(key) + '&limit=1')
        .then(function(r) {
          var it = r && r[0];
          if (!it) return null;
          var age = (Date.now() - new Date(String(it.taken_in_on || it.created_at || '').slice(0, 10) + 'T12:00:00').getTime()) / 864e5;
          return age <= RPGACE.modules.webLookup.REUSE_DAYS ? it : null;
        }).catch(function() { return null; });
    },
    cleanSources: function(list) {
      return (Array.isArray(list) ? list : []).filter(function(s) { return s && /^https?:\/\//i.test(s.url || ''); })
        .slice(0, 8).map(function(s) { return { title: String(s.title || s.url).slice(0, 120), url: String(s.url) }; });
    },
    // Saved body keeps the answer plus a sources list, so a reused lookup
    // can be shown again without the web.
    toBody: function(answer, sources) {
      return String(answer || '').trim() + (sources.length ? '\n\nSources:\n' + sources.map(function(s) { return '- ' + s.title + ' — ' + s.url; }).join('\n') : '');
    },
    fromBody: function(body) {
      var parts = String(body || '').split('\n\nSources:\n');
      var sources = (parts[1] || '').split('\n').map(function(l) {
        var m = /^- (.*) — (https?:\/\/\S+)$/.exec(l.trim());
        return m ? { title: m[1], url: m[2] } : null;
      }).filter(Boolean);
      return { answer: parts[0], sources: sources };
    },
    // Library first, then the web. Resolves { answer, sources, saved, reused, date }.
    lookup: function(q, opts) {
      var L = RPGACE.modules.webLookup.logic;
      opts = opts || {};
      var key = (opts.keyPrefix || '') + L.queryKey(q);
      return L.findSaved(key).then(function(it) {
        if (it) {
          var b = L.fromBody(it.body);
          return { answer: b.answer, sources: b.sources, saved: it, reused: true, date: it.taken_in_on };
        }
        var tp = RPGACE.modules.tripPlans;
        if (!tp || !tp.logic.webSearch) throw new Error('Web search is not available');
        return tp.logic.webSearch(q).then(function(d) {
          var sources = L.cleanSources(d.sources);
          var answer = String(d.answer || '').trim();
          var ll = RPGACE.modules.lifeLibrary;
          var save = ll ? ll.logic.feedQuiet({
            kind: 'web_lookup', title: (opts.title || q).slice(0, 200),
            summary: answer.slice(0, 600) || null, body: L.toBody(answer, sources),
            topics: opts.topics || [], source_table: 'web_lookup', source_id: key
          }, 'web lookup') : Promise.resolve(null);
          return save.then(function(res) {
            // RI-2: ask which realms the saved lookup is for. Not awaited, so
            // the answer shows in chat straight away; the picker sits on top.
            // opts.noPicker: background research saves (oracleProfessor)
            // never pop the picker over the chat.
            if (!opts.noPicker && res && !res.duplicate && res.item && res.item.id)
              RPGACE.realmPicker.tag('library_items', res.item.id, { what: 'web lookup', title: (opts.title || q).slice(0, 120) })
                .catch(function(e) { RPGACE.utils.toast('Realms not saved: ' + (e.message || e), '#E2A83D', 3500); });
            return { answer: answer, sources: sources, saved: res && res.item, reused: false, date: new Date().toISOString().slice(0, 10) };
          });
        });
      });
    },
    _stripTrailer: function(lastMsg) {
      try { if (lastMsg) lastMsg.innerHTML = lastMsg.innerHTML.replace(/WEB_QUERY:[^<]*/i, ''); } catch (e) {}
      try {
        var hist = (typeof STATE !== 'undefined' && STATE.chatHistory) || [];
        for (var i = hist.length - 1; i >= 0; i--) {
          if (hist[i].role === 'assistant') { hist[i].content = String(hist[i].content).replace(/\n?WEB_QUERY:[^\n]*/i, '').trim(); break; }
        }
      } catch (e) {}
    },
    _onReply: function(text, lastMsg) {
      var self = RPGACE.modules.webLookup, L = self.logic;
      var q = L.parseTrailer(text);
      if (!q) return;
      L._stripTrailer(lastMsg);
      if (/DATA_QUERY:/i.test(text)) return; // askMyData owns this turn
      if (self._busy) return;               // 1 web search per message
      self._busy = true;
      var amd = RPGACE.modules.askMyData;
      var note = amd ? amd.ui._note('🌐 Looking up "' + q + '"…') : null;
      L.lookup(q).then(function(res) {
        if (note) note.remove();
        self.ui.searched(q, res);
        return L.answerFromWeb(q, res);
      }).catch(function(e) {
        if (note) note.remove();
        RPGACE.utils.toast('🌐 Web lookup failed: ' + e.message, '#CC4A4A', 4500, 'webLookup');
      }).then(function() { self._busy = false; });
    },
    answerFromWeb: function(q, res) {
      if (typeof callOracle !== 'function') return Promise.resolve();
      var hist = ((typeof STATE !== 'undefined' && STATE.chatHistory) || []).slice(-6);
      var src = res.sources.map(function(s, i) { return (i + 1) + '. ' + s.title + ' — ' + s.url; }).join('\n');
      var prompt = 'WEB_RESULT for "' + q + '" (' + (res.reused ? 'from Alex\'s Life Library, looked up ' + res.date : 'searched today') + '):\n' + (res.answer || '(no answer)') +
        (src ? '\nSources:\n' + src : '') + '\n\nUsing this, answer my previous question directly and briefly. Name sources where useful. If it does not answer it, say so plainly. Do not output WEB_QUERY.';
      var sys = (typeof ORACLE_SYS !== 'undefined') ? ORACLE_SYS : '';
      var amd = RPGACE.modules.askMyData;
      var typing = amd ? amd.ui._typing() : null;
      return callOracle(hist.concat([{ role: 'user', content: prompt }]), sys, 1200).then(function(data) {
        if (typing) typing.remove();
        var reply = ((data && data.content) || []).map(function(c) { return c.text || ''; }).join('').replace(/\n?WEB_QUERY:[^\n]*/gi, '').trim();
        if (!reply) return;
        if (typeof addMsg === 'function') addMsg(reply, 'ai');
        try { STATE.chatHistory.push({ role: 'assistant', content: reply }); } catch (e) {}
      }, function(e) { if (typing) typing.remove(); throw e; });
    },
    // "🔗 Find links" for a term or an insight. Only the topic is sent.
    findLinks: function(topic, area) {
      var L = RPGACE.modules.webLookup.logic;
      var t = String(topic || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      if (!t) return Promise.reject(new Error('Nothing to look up'));
      var q = 'Best free articles, videos and guides to learn about "' + t + '"' + (area ? ' (' + area + ')' : ' in music production') + '. List 3 to 5 with a one-line reason each.';
      return L.lookup(q, { keyPrefix: 'links: ', title: 'Links: ' + t, topics: [t.toLowerCase().slice(0, 40)] });
    },
  },

  ui: {
    _safeUrl: function(u) { return /^https?:\/\//i.test(u || '') ? u : null; },
    _linkList: function(sources) {
      var ul = document.createElement('ul');
      ul.style.cssText = 'margin:6px 0 0;padding-left:18px;';
      sources.forEach(function(s) {
        var url = RPGACE.modules.webLookup.ui._safeUrl(s.url);
        if (!url) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = s.title || url;
        a.style.cssText = 'color:var(--blue,#4A8CCC);word-break:break-word;';
        li.appendChild(a); ul.appendChild(li);
      });
      return ul;
    },
    // "🌐 Searched the web for …" line under the reply, with the sources.
    searched: function(q, res) {
      var box = document.getElementById('chat-msgs');
      if (!box) return null;
      var d = document.createElement('div');
      d.className = 'msg system web-searched';
      d.style.cssText = 'font-size:13px;';
      var head = document.createElement('div');
      head.textContent = res.reused
        ? '🌐 From your Life Library: "' + q + '" (looked up ' + res.date + ')'
        : '🌐 Searched the web for "' + q + '"' + (res.saved ? ' · saved to your Life Library' : '');
      d.appendChild(head);
      if (res.sources.length) d.appendChild(RPGACE.modules.webLookup.ui._linkList(res.sources));
      box.appendChild(d);
      box.scrollTop = 99999;
      return d;
    },
    // Button + inline result area, used by Jargon terms and Bookworm insights.
    findLinksButton: function(topic, area) {
      var wrap = document.createElement('div');
      wrap.className = 'wl-find';
      wrap.style.cssText = 'margin-top:6px;';
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'wl-find-btn';
      b.textContent = '🔗 Find links';
      b.style.cssText = 'min-height:32px;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;background:none;border:1px solid rgba(74,140,204,0.4);color:var(--blue,#4A8CCC);';
      var out = document.createElement('div');
      out.style.cssText = 'font-size:12px;line-height:1.5;color:var(--muted);';
      b.onclick = function() {
        if (b.disabled) return;
        b.disabled = true; b.textContent = '🔗 Looking…';
        RPGACE.modules.webLookup.logic.findLinks(topic, area).then(function(res) {
          b.textContent = res.reused ? '🔗 From your Library' : '🔗 Saved to Library';
          out.innerHTML = '';
          if (res.answer) { var p = document.createElement('div'); p.style.cssText = 'margin-top:6px;white-space:pre-wrap;'; p.textContent = res.answer.slice(0, 900); out.appendChild(p); }
          if (res.sources.length) out.appendChild(RPGACE.modules.webLookup.ui._linkList(res.sources));
          else if (!res.answer) out.textContent = 'No links found.';
        }).catch(function(e) {
          b.disabled = false; b.textContent = '🔗 Find links';
          RPGACE.utils.toast('🔗 ' + e.message, '#CC4A4A', 4000, 'webLookup');
        });
      };
      wrap.appendChild(b); wrap.appendChild(out);
      return wrap;
    },
  },

  // Public pass-throughs (G53 convention).
  markChatTurn: function() { return this.logic.markChatTurn(); },
  takeChatTurn: function() { return this.logic.takeChatTurn(); },
  buildWebBlock: function() { return this.logic.buildWebBlock(); },
  findLinks: function(t, a) { return this.logic.findLinks(t, a); },
});
/* ===END:webLookup=== */
