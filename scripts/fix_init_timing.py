src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """console.log('[RPGACE:config] Cache + streaming Oracle ready');

    // Attach global phyla-scan observer once DOM is ready
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { RPGACE.utils._initPhylaObserver(); }, 1000);
    });"""

new = """console.log('[RPGACE:config] Cache + streaming Oracle ready');

    // Attach global phyla-scan observer directly — rpgace:ready may have
    // already fired before this code runs, so we don't wait for it.
    // _initPhylaObserver has its own self-retry if #send-btn isn't in the DOM yet.
    setTimeout(function() {
      if (RPGACE.utils._initPhylaObserver) RPGACE.utils._initPhylaObserver();
    }, 500);"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: direct call instead of rpgace:ready hook, self-retrying")
else:
    print("ERROR: anchor not found")
