
/* ===MODULE:askMyData=== */
// Oct 10 2026 — X1 of the ratified /CEO plan "RPGACE Domains, Navigation &
// Deepstash Encyclopedia" (records/2026-10/fifty_claude_projects_paranoia_2026-10-10.txt).
// Alex: "Yes, as the foundation" — Oracle answers from his real saved rows
// instead of only the hand-written SELF_KNOWLEDGE digest.
// How it works:
//   1. oracleAppGrounding's existing callOracle wrap (a 5th gate in that SAME
//      wrap, never a new window.callOracle wrapper — see the landmine there)
//      appends buildDataBlock() when a message sounds like a question about
//      Alex's own data. The block lists the allowed SOURCES and asks Oracle
//      to end its reply with one single-line trailer:
//        DATA_QUERY: <source> | search: <words>
//      (single line on purpose: oracle:response-scanned reads rendered DOM
//      text, where a multi-line/list format does not survive.)
//   2. The oracle:response-scanned hook spots the trailer, strips it from the
//      visible reply, runs a read-only RPGACE.sb.select on the allowlisted
//      table (fixed columns, row cap, text truncated — token rule 11), shows
//      "📊 Looked at N rows from X" with the rows, then makes ONE follow-up
//      callOracle with those rows and renders the answer. One lookup per
//      question: the follow-up never gets the data block, and any trailer in
//      the answer is stripped, so it cannot loop.
// Every source is anon-readable already (checked via pg_policies), so no new
// api/*.js endpoint is needed (11 of 12 used).
RPGACE.register('askMyData', {
  domain: 'oracle',

  MAX_ROWS: 30,
  MAX_FIELD: 160,

  // key -> { table, label, select, search: [cols], order }
  SOURCES: {
    pantry:       { table: 'pantry_stock', label: 'Current stock', select: 'quantity,unit,location,updated_at,ingredients!inner(name)', search: ['ingredients.name'], order: 'updated_at.desc' },
    shopping:     { table: 'shopping_list_items', label: 'Shopping list', select: 'needed_amount,needed_unit,to_buy_amount,bought,in_basket,created_at,ingredients!inner(name)', search: ['ingredients.name'], order: 'created_at.desc' },
    recipes:      { table: 'recipes', label: 'Saved recipes', select: 'title,servings_base,created_at', search: ['title'], order: 'created_at.desc' },
    cooks:        { table: 'planned_cooks', label: 'Planned cooks', select: 'scheduled_at,status,recipe_ids,created_at', search: [], order: 'created_at.desc' },
    gym:          { table: 'gym_sets', label: 'Gym sets', select: 'exercise,set_index,reps,weight_kg,created_at', search: ['exercise'], order: 'created_at.desc' },
    wishlist:     { table: 'wishlist_items', label: 'Shopping wishlist', select: 'name,category,priority,estimated_price,status,bought_price,want_reason,created_at', search: ['name', 'category'], order: 'created_at.desc' },
    journal:      { table: 'journal', label: 'Journal', select: 'title,date,entry_type,content,review_on,outcome,created_at', search: ['title', 'content'], order: 'created_at.desc' },
    quests:       { table: 'quest_log', label: 'Quests', select: 'name,category,status,xp,completed_at,created_at', search: ['name', 'description'], order: 'created_at.desc' },
    agenda:       { table: 'rpgace_agendas', label: 'Agenda', select: 'date,hour,minute,title,category,completed', search: ['title'], order: 'date.desc' },
    watchlist:    { table: 'intel_watchlist', label: 'Creator watchlist', select: 'title,creator,platform,score,reason,created_at', search: ['creator', 'title'], order: 'created_at.desc' },
    videos:       { table: 'intel_reports', label: 'Analysed videos', select: 'title,creator,platform,score,url,created_at', search: ['title', 'creator'], order: 'created_at.desc' },
    encyclopedia: { table: 'encyclopedia', label: 'Encyclopedia articles', select: 'title,source,created_at', search: ['title', 'content'], order: 'created_at.desc' },
    ideas:        { table: 'encyclopedia_insights', label: 'Idea cards', select: 'insight_text,idea_section,source_entry_title,saved_at', search: ['insight_text', 'source_entry_title'], order: 'created_at.desc' },
    jargon:       { table: 'jargon_encyclopedia', label: 'Jargon terms', select: 'term,phylum_number,explainer,status', search: ['term', 'explainer'], order: 'term.asc' },
    tracks:       { table: 'reference_tracks', label: 'Reference tracks', select: 'artist,title,bpm,key,mood,genre', search: ['artist', 'title'], order: 'created_at.desc' },
    finance:      { table: 'chronicles_finance', label: 'Finance log', select: 'entry_date,type,category,item,amount', search: ['item', 'category'], order: 'entry_date.desc' },
    books:        { table: 'bookworm_books', label: 'Books', select: 'title,status,current_chapter_index,created_at', search: ['title'], order: 'created_at.desc' },
    content:      { table: 'content_productions', label: 'Content productions', select: 'con_id,title,status,content_type,created_at', search: ['title', 'idea'], order: 'created_at.desc' },
    // Oct 11 2026 (S1): locked table, read through screenshotInbox's own
    // authenticated endpoint call instead of RPGACE.sb.select.
    screenshots:  { table: 'screenshots', label: 'Screenshots', secure: true },
    updates:      { table: 'system_updates', label: 'RPGACE changelog', select: 'title,summary,category,created_at', search: ['title', 'summary'], order: 'created_at.desc' },
    // OP-1 (Oct 21 2026): every domain. private = read through the signed-in
    // read (api/data-write.js PRIVATE_READ_TABLES), never the anon key.
    routines:     { table: 'routines', label: 'My Day routines', select: 'title,area,cadence,part_of_day,est_mins,goal,minimum,active', search: ['title', 'area'], order: 'sort.asc' },
    blocks:       { table: 'chore_blocks', label: 'Planned blocks', select: 'block_date,start_time,mins,kind,realm,status,items', search: ['kind', 'realm'], order: 'block_date.desc' },
    xp:           { table: 'xp_events', label: 'XP earned', select: 'realm,action,xp,earned_on,note', search: ['realm', 'action', 'note'], order: 'earned_at.desc', private: true },
    plans:        { table: 'plans', label: 'Trips & plans', select: 'title,status,destination,start_date,end_date,budget,summary', search: ['title', 'destination'], order: 'created_at.desc', private: true },
    food:         { table: 'food_log', label: 'Food log', select: 'eaten_on,meal,name,grams,kcal,protein_g', search: ['name', 'meal'], order: 'eaten_on.desc', private: true },
    body:         { table: 'body_log', label: 'Body log (water, weight, sleep)', select: 'logged_on,kind,value', search: ['kind'], order: 'logged_on.desc', private: true },
    posts:        { table: 'posts', label: 'Posts', select: 'title,kind,stage,platforms,planned_at,posted_at,record_mins,edit_mins', search: ['title', 'kind'], order: 'created_at.desc', private: true },
    people:       { table: 'people', label: 'People', select: 'name,relation,last_spoke,reach_every_days,birthday', search: ['name', 'relation'], order: 'name.asc', private: true },
    outreach:     { table: 'outreach_log', label: 'Outreach log', select: 'kind,who,note,done_on', search: ['who', 'note'], order: 'done_on.desc', private: true },
    subs:         { table: 'subscriptions', label: 'Subscriptions', select: 'name,amount,cycle,next_renewal,category,active', search: ['name', 'category'], order: 'next_renewal.asc', private: true },
    // FL-3 (Oct 27 2026): every Oracle chat (question + answer), so Oracle can look back.
    chats:        { table: 'oracle_chats', label: 'Past Oracle chats', select: 'created_at,question,answer', search: ['question', 'answer'], order: 'created_at.desc', private: true },
    modules:      { table: 'perspective_reports', label: 'How RPGACE works (module reports)', select: 'scope_level,scope_id,scope_label,self_report', search: ['scope_id', 'scope_label', 'self_report'], order: 'updated_at.desc' },
  },

  // Personal-data phrasing. Compound phrases only (word-boundary landmine).
  TRIGGERS: [
    /\bmy (pantry|stock|fridge|freezer|cupboard|shopping list|wishlist|wish list|journal|quests?|agenda|schedule|watchlist|recipes?|cooks?|ideas|saved ideas|insights|encyclopedia|jargon|reference tracks|tracks|finances?|spending|books?|content|productions?|screenshots?|data)\b/,
    /\b(i screenshotted|did i screenshot|i took a screenshot)\b/,
    // FL-3: past conversations with Oracle.
    /\b(what did we|we (talk|talked|spoke|chatted) about|we discussed|last time|do you remember|you remember|remember when|earlier chat|previous (chat|session|conversation)|last (chat|session|conversation)|i (told|asked|gave) you)\b/,
    /\b(do i have|have i got|how many|what did i|when did i|did i ever|what's in my|whats in my|show me my|list my|ask my data|look up my|check my)\b/,
  ],

  _busy: false,
  _turn: null,

  init: function() {
    var self = this;
    RPGACE.hooks.on('oracle:response-scanned', function(text, lastMsg) { self.logic._onReply(text, lastMsg); });
  },

  logic: {

    matchesDataTrigger: function(lower) {
      var self = RPGACE.modules.askMyData;
      if (!lower || lower.indexOf('data_result') !== -1) return false;
      return self.TRIGGERS.some(function(re) { return re.test(lower); });
    },

    buildDataBlock: function() {
      var self = RPGACE.modules.askMyData;
      var list = Object.keys(self.SOURCES).map(function(k) { return k + ' (' + self.SOURCES[k].label + ')'; }).join(', ');
      return '\n\nASK MY DATA: you can look up Alex\'s real saved RPGACE data instead of guessing. If answering his message needs his own data, reply with ONE short sentence saying what you will check, then end your reply with exactly one line, nothing after it:\nDATA_QUERY: <source> | search: <a word or short phrase>\n("| search: ..." is optional - leave it out to get the most recent rows.) Sources: ' + list + '. Use only these source names. Never invent his data, and never emit this line if the question does not need his data.';
    },

    // "pantry | search: rice" -> { key, search }
    parseTrailer: function(text) {
      var m = /DATA_QUERY:\s*([a-z_]+)\s*(?:\|\s*search:\s*([^|\n]*))?/i.exec(String(text || ''));
      if (!m) return null;
      var key = m[1].toLowerCase();
      var search = (m[2] || '').replace(/[^\w\s'&-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
      return { key: key, search: search };
    },

    buildQuery: function(src, search) {
      var self = RPGACE.modules.askMyData;
      var q = 'select=' + src.select + '&order=' + src.order + '&limit=' + self.MAX_ROWS;
      if (search && src.search.length) {
        var pat = '*' + search.replace(/\s+/g, '*') + '*';
        if (src.search.length === 1) q += '&' + src.search[0] + '=ilike.' + encodeURIComponent(pat);
        else q += '&or=(' + src.search.map(function(c) { return c + '.ilike.' + pat; }).map(encodeURIComponent).join(',') + ')';
      }
      return q;
    },

    // Flatten embeds, drop empties, truncate long text.
    compactRows: function(rows) {
      var self = RPGACE.modules.askMyData;
      return (rows || []).map(function(r) {
        var out = {};
        Object.keys(r).forEach(function(k) {
          var v = r[k];
          if (v && typeof v === 'object' && !Array.isArray(v) && 'name' in v) v = v.name;
          if (v === null || v === '' || v === undefined) return;
          if (Array.isArray(v)) v = v.join(', ');
          if (typeof v === 'string' && v.length > self.MAX_FIELD) v = v.slice(0, self.MAX_FIELD) + '…';
          out[k === 'ingredients' ? 'name' : k] = v;
        });
        return out;
      });
    },

    _onReply: function(text, lastMsg) {
      var self = RPGACE.modules.askMyData;
      var t = self.parseTrailer(text);
      if (!t) return;
      // Strip the trailer from what Alex sees and from chat history.
      try { if (lastMsg) lastMsg.innerHTML = lastMsg.innerHTML.replace(/DATA_QUERY:[^<]*/i, ''); } catch (e) {}
      try {
        var hist = (typeof STATE !== 'undefined' && STATE.chatHistory) || [];
        for (var i = hist.length - 1; i >= 0; i--) {
          if (hist[i].role === 'assistant') { hist[i].content = String(hist[i].content).replace(/\n?DATA_QUERY:[^\n]*/i, '').trim(); break; }
        }
      } catch (e) {}
      if (self._busy) return;
      var src = self.SOURCES[t.key];
      if (!src) { self.ui._note('📊 Oracle asked for an unknown data source ("' + t.key + '"), so nothing was looked up.'); return; }
      self._busy = true;
      self.ui._note('📊 Checking your ' + src.label + (t.search ? ' for "' + t.search + '"' : '') + '…');
      var fetchRows = self.fetchSource(src, t.search);
      fetchRows.then(function(rows) {
        rows = self.compactRows(Array.isArray(rows) ? rows : []);
        self.ui._showRows(src, t.search, rows);
        return self.answerFromRows(src, t.search, rows);
      }).catch(function(e) {
        RPGACE.utils.toast('Couldn\'t look up your data: ' + e.message, '#CC4A4A', 4000, 'askMyData');
      }).then(function() { self._busy = false; });
    },

    // One read path for every source (OP-1, Oct 21 2026): locked tables
    // (src.private, api/data-write.js PRIVATE_READ_TABLES) go through the
    // signed-in read; screenshots through their own inbox; the rest anon.
    // Shared by DATA_QUERY replies and oracleProfessor's gather step.
    fetchSource: function(src, search) {
      var self = RPGACE.modules.askMyData;
      if (src.secure && RPGACE.modules.screenshotInbox) return RPGACE.modules.screenshotInbox.logic.searchRows(search);
      if (src.private) {
        var tp = RPGACE.modules.tripPlans;
        if (!tp || !tp.logic.read) return Promise.reject(new Error('Sign in to read ' + src.label));
        return tp.logic.read(src.table, self.buildQuery(src, search));
      }
      return RPGACE.sb.select(src.table, self.buildQuery(src, search));
    },

    answerFromRows: function(src, search, rows) {
      var self = RPGACE.modules.askMyData;
      if (typeof callOracle !== 'function') return Promise.resolve();
      var hist = ((typeof STATE !== 'undefined' && STATE.chatHistory) || []).slice(-6);
      var lines = rows.map(function(r) { return JSON.stringify(r); }).join('\n');
      var prompt = 'DATA_RESULT from ' + src.label + (search ? ' (search "' + search + '")' : ' (most recent)') + ', ' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + ':\n' + (lines || '(no rows)') +
        '\n\nUsing only these rows, answer my previous question directly and briefly. If they do not answer it, say so plainly. Do not output DATA_QUERY.';
      var sys = (typeof ORACLE_SYS !== 'undefined') ? ORACLE_SYS : '';
      var typing = self.ui._typing();
      return callOracle(hist.concat([{ role: 'user', content: prompt }]), sys, 1200).then(function(data) {
        if (typing) typing.remove();
        var reply = ((data && data.content) || []).map(function(c) { return c.text || ''; }).join('').replace(/\n?DATA_QUERY:[^\n]*/gi, '').trim();
        if (!reply) return;
        if (typeof addMsg === 'function') addMsg(reply, 'ai');
        try { STATE.chatHistory.push({ role: 'assistant', content: reply }); } catch (e) {}
      }, function(e) {
        if (typing) typing.remove();
        throw e;
      });
    },
  },

  ui: {
    _msgs: function() { return document.getElementById('chat-msgs'); },

    _note: function(text) {
      var box = RPGACE.modules.askMyData.ui._msgs();
      if (!box) return null;
      var d = document.createElement('div');
      d.className = 'msg system';
      d.textContent = text;
      box.appendChild(d);
      box.scrollTop = 99999;
      return d;
    },

    _typing: function() {
      var box = RPGACE.modules.askMyData.ui._msgs();
      if (!box) return null;
      var d = document.createElement('div');
      d.className = 'msg ai';
      d.innerHTML = '<div class="ai-name">✦ Oracle</div><span style="color:var(--muted)">reading your data…</span>';
      box.appendChild(d);
      box.scrollTop = 99999;
      return d;
    },

    // "📊 Looked at N rows from X" with the rows Oracle was given, collapsed.
    _showRows: function(src, search, rows) {
      var box = RPGACE.modules.askMyData.ui._msgs();
      if (!box) return;
      var det = document.createElement('details');
      det.className = 'msg system';
      det.style.cssText = 'font-size:13px;';
      var sum = document.createElement('summary');
      sum.style.cssText = 'cursor:pointer;min-height:32px;';
      sum.textContent = '📊 Looked at ' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + ' from ' + src.label + (search ? ' matching "' + search + '"' : '') + ' — tap to see them';
      det.appendChild(sum);
      var list = document.createElement('div');
      list.style.cssText = 'margin-top:6px;max-height:220px;overflow:auto;font-size:12px;line-height:1.5;color:var(--muted);';
      rows.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:3px 0;border-bottom:1px solid var(--border);';
        row.textContent = Object.keys(r).map(function(k) { return k + ': ' + r[k]; }).join(' · ');
        list.appendChild(row);
      });
      if (!rows.length) list.textContent = 'No matching rows.';
      det.appendChild(list);
      box.appendChild(det);
      box.scrollTop = 99999;
    },
  },

  // Public pass-throughs (G53 convention).
  matchesDataTrigger: function(l) { return this.logic.matchesDataTrigger(l); },
  buildDataBlock: function() { return this.logic.buildDataBlock(); },
  parseTrailer: function(t) { return this.logic.parseTrailer(t); },
  buildQuery: function(s, q) { return this.logic.buildQuery(s, q); },
  compactRows: function(r) { return this.logic.compactRows(r); },
  answerFromRows: function(s, q, r) { return this.logic.answerFromRows(s, q, r); },
  fetchSource: function(s, q) { return this.logic.fetchSource(s, q); },
});
/* ===END:askMyData=== */
