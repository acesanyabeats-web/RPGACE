src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Fix 1: Add RPGACE.cache to config module
old1 = """console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');"""

new1 = """console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');

    // In-memory Supabase cache — 60 second TTL
    RPGACE.cache = {
      _store: {},
      get: function(key) {
        var entry = this._store[key];
        if (!entry) return null;
        if (Date.now() - entry.ts > 60000) { delete this._store[key]; return null; }
        return entry.data;
      },
      set: function(key, data) {
        this._store[key] = { data: data, ts: Date.now() };
        return data;
      },
      clear: function(key) {
        if (key) delete this._store[key];
        else this._store = {};
      }
    };

    // Patch RPGACE.sb.select to use cache
    var _origSelect = RPGACE.sb.select.bind(RPGACE.sb);
    RPGACE.sb.select = function(table, params) {
      var cacheKey = table + '|' + (params || '');
      // Don't cache writes-heavy tables
      var noCache = ['content_productions','conid_pot','journal_entries','intel_jobs'];
      if (noCache.indexOf(table) !== -1) return _origSelect(table, params);
      var cached = RPGACE.cache.get(cacheKey);
      if (cached) return Promise.resolve(cached);
      return _origSelect(table, params).then(function(data) {
        RPGACE.cache.set(cacheKey, data);
        return data;
      });
    };

    // Bust cache on any insert/delete
    var _origInsert = RPGACE.sb.insert.bind(RPGACE.sb);
    RPGACE.sb.insert = function(table, row) {
      RPGACE.cache.clear(table);
      return _origInsert(table, row);
    };
    var _origDel = RPGACE.sb.del.bind(RPGACE.sb);
    RPGACE.sb.del = function(table, filter) {
      RPGACE.cache.clear(table);
      return _origDel(table, filter);
    };

    // Streaming Oracle client — replaces callOracle for new callers
    RPGACE.streamOracle = function(messages, system, onChunk, onDone) {
      fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, system: system || '', stream: true })
      }).then(function(res) {
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        function pump() {
          reader.read().then(function(result) {
            if (result.done) { if (onDone) onDone(buffer); return; }
            var chunk = decoder.decode(result.value);
            var lines = chunk.split('\\n');
            lines.forEach(function(line) {
              if (line.startsWith('data: ')) {
                var data = line.slice(6);
                if (data === '[DONE]') return;
                try {
                  var parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
                    buffer += parsed.delta.text;
                    if (onChunk) onChunk(parsed.delta.text, buffer);
                  }
                } catch(e) {}
              }
            });
            pump();
          }).catch(function(e) { console.warn('[RPGACE] stream error:', e.message); });
        }
        pump();
      }).catch(function(e) { console.warn('[RPGACE] streamOracle error:', e.message); });
    };

    console.log('[RPGACE:config] Cache + streaming Oracle ready');"""

# Fix 2: Tighten MutationObserver in intelDelete — already debounced, but add subtree guard
old2 = """      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m) { return m.addedNodes.length > 0; })) {
          setTimeout(function() { self._injectAll(); }, 150);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });"""

new2 = """      var _obsTimer = null;
      var obs = new MutationObserver(function(muts) {
        // Only fire for actual new card nodes, not our own injections
        var relevant = muts.some(function(m) {
          return Array.from(m.addedNodes).some(function(n) {
            return n.nodeType === 1 && !n.dataset.di4 && !n.dataset.dw4 && !n.id;
          });
        });
        if (!relevant) return;
        if (_obsTimer) clearTimeout(_obsTimer);
        _obsTimer = setTimeout(function() { self._injectAll(); }, 300);
      });
      // Only watch the research page container, not entire body
      var researchPage = document.getElementById('page-research') ||
                         document.getElementById('page-learning') ||
                         document.body;
      obs.observe(researchPage, { childList: true, subtree: true });"""

count = 0
if old1 in src:
    src = src.replace(old1, new1, 1); count += 1; print("Fix 1: cache + streaming oracle client")
else:
    print("Fix 1 ERROR")
if old2 in src:
    src = src.replace(old2, new2, 1); count += 1; print("Fix 2: MutationObserver debounced + scoped")
else:
    print("Fix 2 ERROR")

open('rpgace_core.js', 'w', encoding='utf-8').write(src)
print("Total:", count, "fixes applied")
