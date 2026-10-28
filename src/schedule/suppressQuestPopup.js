
/* ===END_DOMAIN:JOURNAL=== */

/* ===DOMAIN:SYSTEM=== */

/* ===MODULE:suppressQuestPopup=== */
RPGACE.register('suppressQuestPopup', {
  domain: 'schedule',

  // G53 (Sep 2026), module 22 of 60. init stays literal top-level.
  // _suppress discovers/mutates real DOM (getElementById + .remove())
  // alongside disabling two global functions - the DOM touch is real
  // and qualifies it for ui on the primary rule; logic is empty.
  // Zero external touchpoints confirmed via repo-wide grep. Handled
  // directly given the trivial single-function scope.
  init: function() {
    var self = this;
    self._suppress();
  },

  logic: {},

  ui: {
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
  },

  _suppress: function() { return this.ui._suppress(); },

});
/* ===END:suppressQuestPopup=== */
