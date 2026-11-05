/* ===MODULE:cookTranscripts=== */
// CT-1..CT-3 (Nov 5 2026, plan "Realm Pages + Evening Questionnaire",
// records/2026-11/audit_remainders_paranoia_2026-11-05.txt). Alex: "Make sure it saves as transcript document
// and is linked to cook and recipe column, it can then be dissected by colours to do subs etc."; "6 colours";
// "Free word scan, Oracle on tap"; "1 and if I don't like the change, I either reject sub or talk to oracle to
// change it". One store: cook_chats (messages + transcript + line_tags + planned_cook_id + recipe_id), written by
// Live now's Ask box (realmTasks.ui._cookChatNote) and Cook Mode's Ask panel (cookingOracle) through build().
// Nothing changes a recipe without a tap: accepted changes become recipes.steps_proposed and go through the
// existing Cook Mode steps review (cookingOracle.ui._reviewProposedSteps, steps_previous kept for undo).
RPGACE.register('cookTranscripts', {
  domain: 'habits',

  // Order = priority when a line matches more than one (a problem outranks a swap mentioned in passing).
  TAGS: [
    { key: 'problem', icon: '🔴', name: 'Problem / fix', color: '#CC4A4A',
      re: /\b(burn\w*|burnt|split|curdl\w*|too (?:runny|thick|thin|dry|wet|salty|sweet|hot|cold|sticky)|stuck|soggy|lumpy|raw|undercooked|overcooked|sank|sunk|collapsed|didn'?t (?:rise|set|work|thicken)|went wrong|mistake|ruin\w*|rescue|save it|fix it|is it ok|gone wrong)\b/i },
    { key: 'sub', icon: '🟢', name: 'Substitution', color: '#4CAF82',
      re: /\b(instead|swap\w*|substitut\w*|replac\w*|don'?t have|didn'?t have|haven'?t got|ran out|run out|out of|alternative|use .{0,20} rather|can i use)\b/i },
    { key: 'timing', icon: '🟠', name: 'Timing / heat', color: '#E2A83D',
      re: /(\b\d+\s*(?:min|mins|minutes?|hours?|hrs?|secs?|seconds?)\b|°\s*[cf]\b|\b\d{2,3}\s*c\b|\b(?:oven|gas mark|preheat|simmer\w*|boil\w*|heat|temperature|temp|fan oven|low heat|medium heat|high heat|how long|done yet|is it done|when is it done|rest(?:ing)? time)\b)/i },
    { key: 'taste', icon: '🟣', name: 'Taste / seasoning', color: '#9B59B6',
      re: /\b(salt\w*|season\w*|tast\w*|bland|sweet\w*|sour|bitter|spic\w*|pepper\w*|sugar|flavou?r\w*|acid\w*|lemon juice|vinegar)\b/i },
    { key: 'technique', icon: '🔵', name: 'Technique', color: '#4A90E2',
      re: /\b(fold\w*|whisk\w*|knead\w*|sear\w*|saut[eé]\w*|chop\w*|dice\w*|slic\w*|minc\w*|blend\w*|beat\w*|stir\w*|cream(?:ing)? the|grease\w*|line the|prov(?:e|ing)|proof\w*|bast\w*|deglaz\w*|emulsif\w*|method|technique|how do i|how should i)\b/i },
    { key: 'other', icon: '⚪', name: 'Other', color: '#8A8FA3', re: null }
  ],

  logic: {
    // Pure: one line's colour key.
    tagLine: function(text) {
      var T = RPGACE.modules.cookTranscripts.TAGS, t = String(text || '');
      for (var i = 0; i < T.length; i++) if (T[i].re && T[i].re.test(t)) return T[i].key;
      return 'other';
    },
    tag: function(key) { return RPGACE.modules.cookTranscripts.TAGS.filter(function(t) { return t.key === key; })[0] || RPGACE.modules.cookTranscripts.TAGS[5]; },
    // Pure: messages [{role, content, at?, tag?}] -> { transcript, line_tags }. A reply takes its question's colour
    // unless it matches one itself (so "use butter instead" -> the answer about butter stays green). A tag already
    // set (an Oracle re-check) is kept.
    build: function(msgs) {
      var L = RPGACE.modules.cookTranscripts.logic, lines = [], tags = [], last = 'other';
      (msgs || []).forEach(function(m, i) {
        var text = String(m && m.content || '').replace(/\s+/g, ' ').trim();
        if (!text || text === '…') return;
        var who = m.role === 'user' ? 'You' : 'Oracle';
        var at = m.at ? new Date(m.at) : null, hh = at && !isNaN(at) ? String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0') + ' ' : '';
        var key = m.tag || L.tagLine(text);
        if (!m.tag && key === 'other' && m.role !== 'user') key = last;
        if (m.role === 'user') last = key;
        lines.push(hh + who + ': ' + text);
        tags.push({ i: i, role: m.role === 'user' ? 'user' : 'assistant', key: key });
      });
      return { transcript: lines.join('\n'), line_tags: tags };
    },
    // planned_cook_id from a Cook Mode key ('planned_<uuid>') or a Live now key ('live_<uuid>').
    cookIdOf: function(key) { var m = /^(?:planned|live)_([0-9a-f-]{36})$/i.exec(String(key || '')); return m ? m[1] : null; },
    list: function(recipeId) {
      return RPGACE.kit.readPrivate('cook_chats', 'select=id,created_at,updated_at,recipe_title,cook_key,planned_cook_id,source,messages,transcript,line_tags&recipe_id=eq.' + recipeId + '&order=created_at.desc&limit=30');
    },
    save: function(row, fields) {
      return RPGACE.sb.secureWrite('cook_chats', 'update', Object.assign({ updated_at: new Date().toISOString() }, fields), 'id=eq.' + row.id);
    },
    // ✨ Re-check colours: one cheap Oracle call. Never trusts the reply's shape: only known keys, only real lines.
    recheck: function(row) {
      var CT = RPGACE.modules.cookTranscripts, L = CT.logic, msgs = (row.messages || []).slice();
      var keys = CT.TAGS.map(function(t) { return t.key; });
      var numbered = msgs.map(function(m, i) { return i + '. ' + (m.role === 'user' ? 'Alex' : 'Oracle') + ': ' + String(m.content || '').slice(0, 300); }).join('\n');
      var prompt = 'Label each line of this cooking chat with exactly one of: ' + keys.join(', ') + '. sub = an ingredient swap or a missing ingredient; timing = minutes, heat, oven, done-ness; problem = something going wrong or a fix; technique = how to do a step; taste = seasoning or flavour; other = anything else. ' +
        'Return only JSON: {"tags":[{"i":0,"key":"sub"},...]}\n\n' + numbered;
      return RPGACE.kit.ask(prompt, { json: true, max: 600, model: RPGACE.modules.phylumPath && RPGACE.modules.phylumPath.MECHANICAL_MODEL, context: 'cook transcript colours' }).then(function(j) {
        var got = j && Array.isArray(j.tags) ? j.tags : [];
        got.forEach(function(t) { var i = Number(t && t.i); if (i >= 0 && i < msgs.length && keys.indexOf(t.key) > -1) msgs[i] = Object.assign({}, msgs[i], { tag: t.key }); });
        var b = L.build(msgs);
        return L.save(row, { messages: msgs, transcript: b.transcript, line_tags: b.line_tags }).then(function() { row.messages = msgs; row.transcript = b.transcript; row.line_tags = b.line_tags; return row; });
      });
    },
    // ✏️ Make recipe changes: the swap / timing / problem lines + the recipe -> a short list of proposed changes.
    propose: function(recipe, row) {
      var CT = RPGACE.modules.cookTranscripts, L = CT.logic, msgs = row.messages || [], tags = row.line_tags || L.build(msgs).line_tags;
      var keep = tags.filter(function(t) { return ['sub', 'timing', 'problem'].indexOf(t.key) > -1; });
      if (!keep.length) return Promise.resolve([]);
      var lines = keep.map(function(t) { var m = msgs[t.i] || {}; return '[' + t.key + '] ' + (m.role === 'user' ? 'Alex' : 'Oracle') + ': ' + String(m.content || '').slice(0, 300); }).join('\n');
      var steps = (recipe.steps || []).map(function(s, i) { return (i + 1) + '. ' + String(s.description || s.instruction || '').slice(0, 200); }).join('\n');
      var prompt = 'Alex cooked "' + (recipe.title || 'a recipe') + '" and talked to you while cooking. From the chat lines below, propose changes to the recipe so next time goes better: ingredient swaps he made or wanted, timing or heat that was wrong, and fixes for problems. ' +
        'Only propose what the chat supports. At most 6. Return only JSON: {"changes":[{"kind":"sub|timing|problem","step":<step number or null>,"change":"<the change, one sentence>","why":"<from the chat, one short sentence>"}]}\n\nRecipe steps:\n' + steps + '\n\nChat lines:\n' + lines;
      return RPGACE.kit.ask(prompt, { json: true, max: 900, model: 'claude-sonnet-4-6', context: 'cook transcript changes' }).then(function(j) {
        var out = (j && Array.isArray(j.changes) ? j.changes : []).slice(0, 6).map(function(c) {
          var st = parseInt(c && c.step, 10);
          return { kind: ['sub', 'timing', 'problem'].indexOf(c && c.kind) > -1 ? c.kind : 'problem', step: st > 0 && st <= (recipe.steps || []).length ? st : null,
            change: String(c && c.change || '').slice(0, 240), why: String(c && c.why || '').slice(0, 200) };
        }).filter(function(c) { return c.change; });
        return out;
      });
    },
    // Accepted changes -> a full rewritten step list, same shape, saved as steps_proposed (reviewed before it applies).
    apply: function(recipeId, recipe, changes) {
      var steps = recipe.steps || [];
      var prompt = 'Rewrite this recipe\'s steps applying ONLY these accepted changes. Keep every other step, field and amount exactly as it is. Return only JSON: {"steps":[...same objects, same fields...]}\n\nChanges:\n' +
        changes.map(function(c, i) { return (i + 1) + '. ' + (c.step ? 'Step ' + c.step + ': ' : '') + c.change; }).join('\n') + '\n\nSteps JSON:\n' + JSON.stringify(steps).slice(0, 12000);
      return RPGACE.kit.ask(prompt, { json: true, max: 3000, model: 'claude-sonnet-4-6', context: 'cook transcript apply' }).then(function(j) {
        var ns = j && Array.isArray(j.steps) ? j.steps : null;
        // Never trust model JSON (building guide 5): same count +/- 2, every step keeps a description.
        if (!ns || !ns.length || Math.abs(ns.length - steps.length) > 2 || ns.some(function(s) { return !s || typeof s !== 'object' || !String(s.description || s.instruction || '').trim(); }))
          throw new Error('Oracle sent back steps that don\'t match the recipe - nothing changed');
        return RPGACE.sb.secureWrite('recipes', 'update', { steps_proposed: ns }, 'id=eq.' + recipeId).then(function() { RPGACE.cache.clear('recipes'); recipe.steps_proposed = ns; return ns; });
      });
    }
  },

  ui: {
    _css: function() {
      if (document.getElementById('ct-css')) return;
      var s = document.createElement('style'); s.id = 'ct-css';
      s.textContent = '.ct-line{display:flex;gap:8px;padding:8px 10px;margin:4px 0;border-left:4px solid var(--border);border-radius:6px;background:var(--panel2,rgba(255,255,255,.03));font-size:15px;line-height:1.45}' +
        '.ct-who{font-weight:700;white-space:nowrap}.ct-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.ct-chip{min-height:40px;padding:4px 12px;border-radius:18px;border:1px solid var(--border);background:none;color:var(--text);font:inherit;font-size:13px;cursor:pointer}' +
        '.ct-chip[aria-pressed="true"]{background:var(--gold);color:#111;border-color:var(--gold);font-weight:700}.ct-change{border:1px solid var(--border);border-radius:10px;padding:10px;margin:8px 0}.ct-change.ct-ok{border-color:#4CAF82}.ct-change.ct-no{opacity:.5}';
      document.head.appendChild(s);
    },
    // The "🗒 Cook transcripts" button on a saved recipe's card.
    button: function(host, recipeId, recipe) {
      if (!host || !recipeId) return null;
      var CT = RPGACE.modules.cookTranscripts;
      var b = RPGACE.kit.btn('🗒 Cook transcripts', ''); b.id = 'ct-open';
      b.onclick = function() { CT.ui.openList(recipeId, recipe); };
      host.appendChild(b);
      CT.logic.list(recipeId).then(function(rows) { b.textContent = '🗒 Cook transcripts (' + rows.length + ')'; }, function() {});
      return b;
    },
    openList: function(recipeId, recipe) {
      var CT = RPGACE.modules.cookTranscripts, U = CT.ui, K = RPGACE.kit;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🗒 Cook transcripts', title: recipe.title || 'Recipe', width: '620px', scroll: true });
      pop.box.id = 'ct-list'; pop.box.textContent = 'Loading…';
      CT.logic.list(recipeId).then(function(rows) {
        pop.box.textContent = '';
        if (!rows.length) { pop.box.textContent = 'No cook chats saved for this recipe yet. Ask Oracle in Live now or Cook Mode while you cook and the chat is saved here.'; return; }
        rows.forEach(function(r) {
          var tags = r.line_tags || CT.logic.build(r.messages || []).line_tags, n = {};
          tags.forEach(function(t) { n[t.key] = (n[t.key] || 0) + 1; });
          var row = K.btn('', ''); row.className = 'ct-row'; row.style.cssText += 'display:block;width:100%;text-align:left;margin:6px 0;';
          row.innerHTML = '<b>' + K.esc(new Date(r.created_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</b> · ' + tags.length + ' lines · ' +
            CT.TAGS.filter(function(t) { return n[t.key]; }).map(function(t) { return t.icon + n[t.key]; }).join(' ') + (r.source === 'live_now' ? ' · Live now' : ' · Cook Mode');
          row.onclick = function() { pop.close(); U.openOne(r, recipeId, recipe); };
          pop.box.appendChild(row);
        });
      }, function(e) { pop.box.textContent = '⚠️ Could not load transcripts: ' + (e.message || e); });
    },
    openOne: function(r, recipeId, recipe) {
      var CT = RPGACE.modules.cookTranscripts, U = CT.ui, L = CT.logic, K = RPGACE.kit;
      U._css();
      var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🗒 ' + (recipe.title || 'Cook transcript'), title: new Date(r.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), width: '640px', scroll: true });
      pop.box.id = 'ct-one';
      var on = {};
      var chips = document.createElement('div'); chips.className = 'ct-chips'; chips.id = 'ct-filter';
      var body = document.createElement('div'); body.id = 'ct-lines';
      var acts = document.createElement('div'); acts.className = 'rp-btns'; acts.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;';
      var changes = document.createElement('div'); changes.id = 'ct-changes';
      pop.box.appendChild(chips); pop.box.appendChild(body); pop.box.appendChild(acts); pop.box.appendChild(changes);
      var draw = function() {
        var msgs = r.messages || [], tags = r.line_tags || L.build(msgs).line_tags, n = {};
        tags.forEach(function(t) { n[t.key] = (n[t.key] || 0) + 1; });
        chips.innerHTML = '';
        CT.TAGS.filter(function(t) { return n[t.key]; }).forEach(function(t) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'ct-chip'; c.dataset.key = t.key;
          c.setAttribute('aria-pressed', on[t.key] ? 'true' : 'false'); c.textContent = t.icon + ' ' + t.name + ' ' + n[t.key];
          c.onclick = function() { on[t.key] = !on[t.key]; draw(); };
          chips.appendChild(c);
        });
        var any = Object.keys(on).some(function(k) { return on[k]; });
        body.innerHTML = '';
        tags.forEach(function(t) {
          if (any && !on[t.key]) return;
          var m = msgs[t.i] || {}, tg = L.tag(t.key);
          var d = document.createElement('div'); d.className = 'ct-line'; d.dataset.key = t.key; d.style.borderLeftColor = tg.color;
          d.innerHTML = '<span title="' + K.esc(tg.name) + '">' + tg.icon + '</span><span class="ct-who">' + (t.role === 'user' ? 'You' : 'Oracle') + '</span><span>' + K.esc(String(m.content || '')) + '</span>';
          body.appendChild(d);
        });
      };
      draw();
      var re = K.btn('✨ Re-check colours', ''); re.id = 'ct-recheck';
      re.onclick = function() { re.disabled = true; re.textContent = 'Checking…'; L.recheck(r).then(function() { re.disabled = false; re.textContent = '✨ Re-check colours'; draw(); RPGACE.utils.toast('Colours re-checked', '#4CAF82', 1800); },
        function(e) { re.disabled = false; re.textContent = '✨ Re-check colours'; RPGACE.utils.toast('⚠️ Colours not re-checked: ' + (e.message || e), '#CC4A4A', 3500, 'cookTranscripts'); }); };
      var mk = K.btn('✏️ Make recipe changes', 'primary'); mk.id = 'ct-propose';
      mk.onclick = function() {
        mk.disabled = true; mk.textContent = 'Reading the chat…';
        L.propose(recipe, r).then(function(list) { mk.disabled = false; mk.textContent = '✏️ Make recipe changes'; U._drawChanges(changes, list, r, recipeId, recipe); },
          function(e) { mk.disabled = false; mk.textContent = '✏️ Make recipe changes'; RPGACE.utils.toast('⚠️ No changes proposed: ' + (e.message || e), '#CC4A4A', 3500, 'cookTranscripts'); });
      };
      acts.appendChild(re); acts.appendChild(mk);
    },
    // Each proposed change: ✓ Accept / ✕ Reject / 💬 Talk to Oracle; then ✅ Review the new steps (the existing review).
    _drawChanges: function(host, list, r, recipeId, recipe) {
      var CT = RPGACE.modules.cookTranscripts, L = CT.logic, K = RPGACE.kit;
      host.innerHTML = '';
      if (!list.length) { host.textContent = 'Nothing to change: no swaps, timing or problems in this chat.'; return; }
      var state = list.map(function() { return null; });
      var h = document.createElement('div'); h.className = 'rf-h'; h.textContent = 'Proposed changes'; host.appendChild(h);
      var applyB = K.btn('✅ Review the new steps', 'primary'); applyB.id = 'ct-apply';
      var paintApply = function() { var n = state.filter(function(s) { return s === 'ok'; }).length; applyB.disabled = !n; applyB.textContent = n ? '✅ Review the new steps (' + n + ' accepted)' : '✅ Review the new steps'; };
      list.forEach(function(c, i) {
        var tg = L.tag(c.kind), box = document.createElement('div'); box.className = 'ct-change'; box.dataset.i = i; box.style.borderLeft = '4px solid ' + tg.color;
        box.innerHTML = '<div>' + tg.icon + ' <b>' + (c.step ? 'Step ' + c.step + ': ' : '') + K.esc(c.change) + '</b></div><div style="font-size:13px;color:var(--muted);margin:2px 0 8px;">' + K.esc(c.why) + '</div>';
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
        var ok = K.btn('✓ Accept', ''), no = K.btn('✕ Reject', ''), talk = K.btn('💬 Talk to Oracle', '');
        ok.className = 'ct-accept'; no.className = 'ct-reject'; talk.className = 'ct-talk';
        var set = function(v) { state[i] = v; box.classList.toggle('ct-ok', v === 'ok'); box.classList.toggle('ct-no', v === 'no'); ok.setAttribute('aria-pressed', v === 'ok'); no.setAttribute('aria-pressed', v === 'no'); paintApply(); };
        ok.onclick = function() { set(state[i] === 'ok' ? null : 'ok'); };
        no.onclick = function() { set(state[i] === 'no' ? null : 'no'); };
        talk.onclick = function() {
          var q = 'About my ' + (recipe.title || 'recipe') + ' cook: you proposed "' + c.change + '" (' + c.why + '). I want it changed: ';
          var RF = RPGACE.modules.realmFrame; if (RF) RF.ui.ask(q);
        };
        row.appendChild(ok); row.appendChild(no); row.appendChild(talk); box.appendChild(row); host.appendChild(box);
      });
      applyB.onclick = function() {
        var acc = list.filter(function(c, i) { return state[i] === 'ok'; });
        applyB.disabled = true; applyB.textContent = 'Writing the new steps…';
        L.apply(recipeId, recipe, acc).then(function() {
          var co = RPGACE.modules.cookingOracle; if (co) co.ui._reviewProposedSteps(recipeId, recipe, function() {});
          paintApply();
        }, function(e) { paintApply(); RPGACE.utils.toast('⚠️ ' + (e.message || e), '#CC4A4A', 4000, 'cookTranscripts'); });
      };
      host.appendChild(applyB); paintApply();
    }
  }
});
/* ===END:cookTranscripts=== */
