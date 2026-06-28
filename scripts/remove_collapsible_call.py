src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """      scoreBox.insertBefore(btn, scoreBox.firstChild);
      // Now make collapsible — header row stays visible, everything else collapses
      self._makeCollapsible(card);
    });
  },

  _injectWatchlist:"""

new = """      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });
  },

  _injectWatchlist:"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: removed _makeCollapsible call from _injectInsights")
else:
    print("ERROR: anchor not found")
