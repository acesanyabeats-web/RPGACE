/* ===MODULE:suppressQuestPopup=== */
RPGACE.register('suppressQuestPopup', {
  init: function() {
    var self = this;
    self._suppress();
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._suppress(); }, 500);
    });
  },
  _suppress: function() {
    if (window._questSuppressed) return;
    window._questSuppressed = true;
    if (typeof window.checkForQuestSuggestions === 'function') {
      window.checkForQuestSuggestions = function() {};
    }
    if (typeof window.showSuggestionPopup === 'function') {
      window.showSuggestionPopup = function() {};
    }
    var el = document.getElementById('suggestion-popup');
    if (el) el.remove();
  }
});
/* ===END:suppressQuestPopup=== */