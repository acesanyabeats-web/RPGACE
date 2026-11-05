/* ===MODULE:videoRecipe=== */
// YR-1..4 (Nov 5 2026, records/2026-11/realm_pages_redesign_interrogation_2026-11-05.txt, YR section).
// Alex: "tried to do the horchata José el cook method, yet some steps and ingredients are missing, I'd like gemini
// to look up youtube video and in take so it is what I ask for, these things need to be backed with youtube";
// answers: a named creator or a link -> find the video and ask "is this the one?"; a plain request -> Video
// Finder shows 5 videos to pull from; a saved recipe -> show the differences to accept; keep the link +
// timestamps on the recipe, take it into the Life Library (Chef), and the creator's tips as step notes.
// Gemini watches the public video in the cloud (/api/search type 'video-read'; no cookies, no laptop).
// YouTube search = the existing /api/search (Video Finder). The accept screen is groceryCheck.ui._proposal.
RPGACE.register('videoRecipe', {
  domain: 'habits',
  // Channel words that say nothing about who the cook is.
  GENERIC: ['cooking', 'kitchen', 'recipes', 'recipe', 'food', 'foods', 'chef', 'official', 'channel', 'the', 'tv', 'with', 'and', 'eats', 'cook', 'cocina', 'cuisine'],

  logic: {
    linkIn: function(text) {
      var m = String(text || '').match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
      return m ? { id: m[1], url: 'https://www.youtube.com/watch?v=' + m[1], title: 'Your link', channel: '' } : null;
    },
    url: function(v) { return 'https://www.youtube.com/watch?v=' + v.id; },
    // Pure: does the request name this video's cook? (a channel word, not a generic one, appears in it)
    namesCreator: function(text, video) {
      var self = RPGACE.modules.videoRecipe, norm = function(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
      var words = norm(text).split(/[^a-z0-9]+/).filter(Boolean);
      var ch = norm(video && video.channel).split(/[^a-z0-9]+/).filter(function(w) { return w.length >= 3 && self.GENERIC.indexOf(w) < 0; });
      if (!ch.length) return false;
      var joined = norm(text).replace(/[^a-z0-9]/g, ''), chJoined = norm(video.channel).replace(/[^a-z0-9]/g, '');
      return ch.some(function(w) { return words.indexOf(w) > -1; }) || (chJoined.length >= 5 && joined.indexOf(chJoined) > -1);
    },
    search: function(q) {
      return fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })
        .then(function(r) { return r.json().catch(function() { return {}; }).then(function(d) { if (!r.ok) throw new Error(d.error || 'YouTube search failed'); return d.videos || []; }); });
    },
    read: function(video, prompt) {
      return fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'video-read', url: RPGACE.modules.videoRecipe.logic.url(video), prompt: prompt }) })
        .then(function(r) { return r.json().catch(function() { return {}; }).then(function(d) {
          if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
          var t = String(d.text || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
          if (a < 0 || b <= a) throw new Error('Gemini\'s answer could not be read');
          try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new Error('Gemini\'s answer could not be read'); }
        }); });
    },
    // YR-2: the recipe exactly as the video makes it, in the app's recipe shape (+ tips, timestamps, link).
    recipeFrom: function(video, request, servings) {
      var self = RPGACE.modules.videoRecipe, co = RPGACE.modules.cookingOracle, n = servings || 4;
      var rules = co.STEP_RULES_TEXT + 'Shape: ' + co.RECIPE_JSON_SHAPE(n) + '. ' + co.UNIT_PREFERENCE_TEXT + co.SEPARABLE_TAG_TEXT +
        'Ingredient names must be simple, generic, singular/lowercase (e.g. "garlic clove") so they can be tracked across recipes.';
      return self.logic.read(video, RPGACE.prompt('video_recipe', { request: request || video.title, servings: n, rules: rules })).then(function(r) {
        if (!r || !Array.isArray(r.ingredients) || !r.ingredients.length || !Array.isArray(r.steps) || !r.steps.length) throw new Error('Gemini did not find a recipe in that video');
        co.logic._sanitizeStepIngredientsUsed(r.steps);
        co.logic._sanitizeIngredientSeparable(r.ingredients);
        var url = self.logic.url(video);
        r.steps.forEach(function(s) { if (s && typeof s === 'object' && s.video_at != null) s.video_url = url; });
        r.source_url = url;
        r.video = { title: String(r.video_title || video.title || '').slice(0, 140), creator: String(r.creator || video.channel || '').slice(0, 80) };
        r.tips = (Array.isArray(r.tips) ? r.tips : []).map(String).filter(Boolean).slice(0, 5);
        r.not_shown = (Array.isArray(r.not_shown) ? r.not_shown : []).map(String).filter(Boolean).slice(0, 6);
        return r;
      });
    },
    // YR-3: what a saved recipe misses compared with the video -> the recipe chat's change shape.
    compare: function(rec, video) {
      var self = RPGACE.modules.videoRecipe, gc = RPGACE.modules.groceryCheck, url = self.logic.url(video);
      var p = RPGACE.prompt('video_compare', {
        title: rec.title,
        ingredients: (rec.ingredients || []).map(function(i) { return i.name + ' | ' + (i.amount == null ? '' : i.amount) + ' | ' + (i.unit || ''); }).join('\n'),
        steps: (rec.steps || []).map(function(s, i) { return ((s && s.order) || i + 1) + ': ' + String((s && s.description) || s || '').slice(0, 200); }).join('\n')
      });
      return self.logic.read(video, p).then(function(o) {
        var amended = gc.logic.applyAmend(rec, o);
        if (amended) amended.steps.forEach(function(s) { if (s && typeof s === 'object' && s.video_at != null && !s.video_url) s.video_url = url; });
        return { reply: String((o && o.reply) || '').slice(0, 600), amended: amended };
      });
    },
    // YR-4: the video as a Chef take-in (Life Library), with the creator's tips.
    keep: function(recipe, video) {
      var lib = RPGACE.modules.lifeLibrary; if (!lib) return Promise.resolve(null);
      return lib.logic.feedQuiet({ kind: 'video', title: (recipe.video && recipe.video.title) || video.title || recipe.title, url: RPGACE.modules.videoRecipe.logic.url(video),
        summary: 'Recipe: ' + recipe.title + (recipe.video && recipe.video.creator ? ' by ' + recipe.video.creator : ''),
        body: (recipe.tips || []).map(function(t) { return '• ' + t; }).join('\n'), realms: ['chef'], topics: ['recipe', 'cooking'] }, 'videoRecipe');
    }
  },

  ui: {
    _fail: function(what, e) { RPGACE.utils.toast('⚠️ ' + what + ': ' + ((e && e.message) || e), '#CC4A4A', 4500, 'videoRecipe'); },
    _row: function(v) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'yr-video'; b.dataset.id = v.id;
      b.style.cssText = 'display:flex;gap:10px;align-items:center;width:100%;min-height:64px;padding:6px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;';
      if (v.thumb) { var im = document.createElement('img'); im.src = v.thumb; im.alt = ''; im.style.cssText = 'width:96px;height:54px;object-fit:cover;border-radius:6px;flex:none;'; b.appendChild(im); }
      var tx = document.createElement('div'); tx.style.cssText = 'min-width:0;font-size:14px;line-height:1.3;';
      var t = document.createElement('div'); t.style.fontWeight = '700'; t.textContent = v.title;
      var s = document.createElement('div'); s.style.cssText = 'font-size:12px;color:var(--muted);'; s.textContent = [v.channel, v.duration, v.views].filter(Boolean).join(' · ');
      tx.appendChild(t); tx.appendChild(s); b.appendChild(tx);
      return b;
    },
    // YR-1: a named cook -> "Is this the one?"; otherwise (or "Show 5") -> pick from 5. Resolves to a video or null.
    choose: function(query, opts) {
      var self = RPGACE.modules.videoRecipe, L = self.logic, U = self.ui; opts = opts || {};
      var link = L.linkIn(query); if (link) return Promise.resolve(link);
      return new Promise(function(resolve) {
        var done = false, finish = function(v) { if (done) return; done = true; resolve(v); };
        var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📺 YouTube', title: 'Finding the video…', width: '480px', scroll: true, onClose: function() { finish(null); } });
        pop.box.id = 'yr-pick';
        var host = document.createElement('div'); host.textContent = 'Searching YouTube for "' + query + '"…'; pop.box.appendChild(host);
        L.search(query + (/recipe/i.test(query) ? '' : ' recipe')).then(function(videos) {
          host.innerHTML = '';
          if (!videos.length) { host.textContent = 'No videos found. Try other words.'; return; }
          var pick = function(v) { finish(v); pop.close(); };
          var showFive = function() {
            host.innerHTML = '';
            var h = document.createElement('div'); h.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:8px;'; h.textContent = 'Pick the video to pull the recipe from:'; host.appendChild(h);
            videos.slice(0, 5).forEach(function(v) { var r = U._row(v); r.onclick = function() { pick(v); }; host.appendChild(r); });
          };
          var top = videos[0];
          if (opts.one || L.namesCreator(query, top)) {
            var q = document.createElement('div'); q.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;'; q.textContent = 'Is this the one?'; host.appendChild(q);
            var r = U._row(top); r.onclick = function() { pick(top); }; host.appendChild(r);
            var yes = RPGACE.kit.btn('✅ Yes, use this video', 'primary'); yes.id = 'yr-yes'; yes.style.cssText += 'width:100%;margin-top:4px;'; yes.onclick = function() { pick(top); };
            var more = RPGACE.kit.btn('Show 5 videos', ''); more.id = 'yr-more'; more.style.cssText += 'width:100%;margin-top:6px;'; more.onclick = showFive;
            host.appendChild(yes); host.appendChild(more);
          } else showFive();
        }, function(e) { host.textContent = '⚠️ ' + (e.message || e); });
      });
    },
    // The video a saved recipe came from, else pick one for its title.
    videoFor: function(rec) {
      var L = RPGACE.modules.videoRecipe.logic, link = L.linkIn(rec && rec.source);
      if (link) return Promise.resolve(Object.assign(link, { title: rec.title + ' (its video)' }));
      return RPGACE.modules.videoRecipe.ui.choose(rec.title, { one: false });
    },
    // YR-2: build the recipe from a video, then show it on the normal recipe card (save, add to cook, ...).
    build: function(video, request, servings) {
      var self = RPGACE.modules.videoRecipe, co = RPGACE.modules.cookingOracle;
      var wait = RPGACE.modules.dashDeck._popup({ eyebrow: '📺 ' + (video.channel || 'YouTube'), title: 'Gemini is watching the video…', width: '420px' });
      wait.box.id = 'yr-wait';
      var p = document.createElement('div'); p.style.cssText = 'font-size:13px;color:var(--muted);'; p.textContent = video.title + ' - this can take a minute for a long video.'; wait.box.appendChild(p);
      return self.logic.recipeFrom(video, request, servings).then(function(recipe) {
        wait.close();
        co.ui._showRecipeCard(recipe, JSON.stringify(recipe));
        self.logic.keep(recipe, video);
        return recipe;
      }, function(e) { wait.close(); self.ui._fail('Could not read that video', e); return null; });
    },
    // The recipe card's "From the video" box (link, creator, tips, what the video didn't show).
    sourceBox: function(recipe) {
      if (recipe && !recipe.source_url && /^https:\/\/www\.youtube\.com\/watch\?v=/.test(String(recipe.source || ''))) recipe.source_url = recipe.source;
      if (!recipe || !recipe.source_url) return null;
      var box = document.createElement('div'); box.className = 'yr-source'; box.id = 'yr-source';
      box.style.cssText = 'border:1px solid rgba(204,74,74,0.4);border-radius:10px;padding:10px 12px;margin:0 0 12px;font-size:13px;line-height:1.45;';
      var a = document.createElement('a'); a.href = recipe.source_url; a.target = '_blank'; a.rel = 'noopener'; a.style.cssText = 'font-weight:700;color:var(--text);';
      a.textContent = '📺 From the video: ' + ((recipe.video && recipe.video.title) || 'YouTube') + (recipe.video && recipe.video.creator ? ' · ' + recipe.video.creator : '') + ' ▶';
      box.appendChild(a);
      (recipe.tips || []).forEach(function(t) { var d = document.createElement('div'); d.textContent = '💡 ' + t; box.appendChild(d); });
      if ((recipe.not_shown || []).length) { var n = document.createElement('div'); n.style.color = '#E2A83D'; n.textContent = '⚠️ Not shown in the video (estimated): ' + recipe.not_shown.join('; '); box.appendChild(n); }
      var st = document.createElement('div'); st.style.cssText = 'color:var(--muted);margin-top:4px;'; st.textContent = 'Each step has its moment in the video - tap ▶ in Cook Mode.'; box.appendChild(st);
      return box;
    }
  }
});
/* ===END:videoRecipe=== */
