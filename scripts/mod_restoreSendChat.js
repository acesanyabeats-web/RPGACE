/* ===MODULE:restoreSendChat=== */
RPGACE.register('restoreSendChat', {
  init: function() {
    // Run immediately — must fire before any user interaction
    RPGACE.streamOracle = null;
    window._sendChatPatched = false;
    RPGACE.hooks.on('rpgace:ready', function() {
      // Re-apply in case config module re-sets streamOracle after ready
      RPGACE.streamOracle = null;
      window._sendChatPatched = false;
      console.log('[RPGACE] streamOracle neutralised');
    });
  }
});
/* ===END:restoreSendChat=== */