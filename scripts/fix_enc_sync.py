from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

module = """

/* ================================================================
   ENCYCLOPEDIA SYNC FIX
   - Deduplicates entries by title after syncAndPush()
   - Clears rpgace_enc_saved URL backlog after sync
   - clearEncyclopedia() also wipes both backlogs
================================================================ */
RPGACE.register('encSync', {

  init: function() {
    var self = this;
    setTimeout(function() { self._patch(); }, 800);
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._patch(); }, 800);
    });
  },

  _dedup: function() {
    try {
      var raw = localStorage.getItem('rpgace_encyclopedia');
      if (!raw) return 0;
      var entries = JSON.parse(raw);
      var seen = {};
      var clean = entries.filter(function(e) {
        var key = (e.title || e.id || '').toLowerCase().trim();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      if (clean.length < entries.length) {
        localStorage.setItem('rpgace_encyclopedia', JSON.stringify(clean));
        return entries.length - clean.length;
      }
    } catch(e) {}
    return 0;
  },

  _clearBacklog: function() {
    /* Wipe URL queue so next sync doesn't reimport the same items */
    var hadUrls = !!localStorage.getItem('rpgace_enc_saved');
    localStorage.removeItem('rpgace_enc_saved');
    localStorage.removeItem('rpgace_intel_insights');
    return hadUrls;
  },

  _patch: function() {
    if (window._encSyncPatched) return;
    var fn = window.syncAndPush;
    var clr = window.clearEncyclopedia;
    if (!fn || !clr) return;

    window._encSyncPatched = true;
    var self = this;

    /* ── Patch syncAndPush ── */
    window.syncAndPush = function() {
      var before = 0;
      try {
        var prev = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
        before = prev.length;
      } catch(e) {}

      fn.apply(this, arguments);

      /* Give the original function time to finish (it likely does fetch/setState) */
      setTimeout(function() {
        var removed = self._dedup();
        self._clearBacklog();

        try {
          var after = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
          var net = after.length - before;
          var msg = net > 0
            ? '\u2705 ' + net + ' new entries added'
            : net === 0
              ? '\u2713 Already up to date'
              : '\u2713 Sync complete';
          if (removed > 0) msg += ' \u00B7 ' + removed + ' duplicates removed';
          RPGACE.utils.toast(msg, 'rgba(201,168,76,0.9)', 3500);
          if (typeof window.refreshEncyclopediaDisplay === 'function') {
            window.refreshEncyclopediaDisplay();
          }
        } catch(e) {}
      }, 2500);
    };

    /* ── Patch clearEncyclopedia ── */
    window.clearEncyclopedia = function() {
      self._clearBacklog();
      clr.apply(this, arguments);
      RPGACE.utils.toast('\uD83D\uDDD1 Encyclopedia + backlog cleared', 'rgba(226,84,84,0.9)', 2500);
    };

    console.log('[RPGACE:encSync] Patched syncAndPush + clearEncyclopedia');
  },

});
"""

src = src.rstrip() + module

tmp = Path("_enc.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"Fix: enc sync dedup + backlog clear\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
