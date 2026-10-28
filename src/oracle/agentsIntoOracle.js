
/* ===MODULE:agentsIntoOracle=== */
// July 22 QoL request: "fold [Agents] into Oracle AI." GODMODE evidence
// pass first - the Agents page (main.js AGENT_ACTIONS + buildAgentActions())
// is real, not empty: 8 genuine one-click Composio actions with per-action
// XP, a connected-apps status bar, and an activity log. The actual
// complaint was 3 of those 8 actions overlapping with Oracle's own
// .quick-row buttons (draft email, YT stats, log to Notion) making a
// whole separate nav page feel redundant - not that the content itself
// was worthless. Council of 5 verdict: fold it in physically rather than
// rebuild it - buildAgentActions() (main.js, frozen) just does
// document.getElementById('agent-actions') and fills it, so it works
// regardless of where that element physically lives in the DOM. Reuses
// the exact "move live DOM nodes" pattern dashDeck already established
// for Bookworm/Knowledge Gaps/Content Pipeline (_stashWidget/_ensureStash) -
// just a one-way permanent move here, not a toggle in/out of a popup.
RPGACE.register('agentsIntoOracle', {
  domain: 'oracle',

  // G53 (Sep 2026), module 24 of 60. init stays literal top-level.
  // _relocate is heavy real DOM (getElementById x2, createElement,
  // real child-node relocation via appendChild) - unambiguous ui,
  // logic empty. Zero external touchpoints confirmed via repo-wide
  // grep. Handled directly given the trivial single-function scope.
  init: function() {
    var self = this;
    self._relocate();
    RPGACE.registerBootTask(function() { return self._relocate(); });
    RPGACE.registerBootTask(function() { return self.ui.toolsToSide(); });
  },

  logic: {},

  ui: {
    // SL-5 (Oct 27 2026): Oracle's tool buttons (.quick-row, which other modules
    // fill) and the 8 ⚡ agent actions move into the › side list; one 🧰 Tools
    // chip beside the input opens the same list. The chat is the page.
    toolsToSide: function() {
      var pg = document.getElementById('page-advisor');
      if (!pg || pg._toolsSide) return;
      pg._toolsSide = true;
      // The stylesheet gives .quick-row display:flex, which beats the hidden attribute.
      var hide = function(el) { if (el) { el.hidden = true; el.style.display = 'none'; } };
      hide(pg.querySelector('.oracle-tools-label')); hide(pg.querySelector('.quick-row'));
      var wrap = document.getElementById('agents-in-oracle'); hide(wrap);
      pg._sideExtras = function() {
        var row = pg.querySelector('.quick-row'), out = [];
        Array.prototype.forEach.call(row ? row.querySelectorAll('button') : [], function(b, i) {
          var t = (b.textContent || '').trim(); if (!t) return;
          out.push(['🧰', t, function() { b.click(); }, 'tool:' + i]);
        });
        (typeof AGENT_ACTIONS !== 'undefined' ? AGENT_ACTIONS : []).forEach(function(a) {
          out.push(['⚡', a.icon + ' ' + a.name, function() { if (typeof triggerAgent === 'function') triggerAgent(a.id); }, 'agent:' + a.id]);
        });
        if (wrap) out.push(['🔌', 'Connected apps & activity log', function() { wrap.hidden = false; wrap.style.display = ''; var d = document.getElementById('agents-in-oracle-details'); if (d) d.open = true; wrap.scrollIntoView({ behavior: 'smooth' }); }, 'agent:apps']);
        return out;
      };
      var inRow = pg.querySelector('.chat-input-row');
      if (inRow && !document.getElementById('oracle-tools-chip')) {
        var c = document.createElement('button'); c.type = 'button'; c.id = 'oracle-tools-chip'; c.className = 'oracle-attach-btn';
        c.textContent = '🧰'; c.title = 'Tools'; c.setAttribute('aria-label', 'Tools');
        c.onclick = function() {
          var bar = pg.querySelector('.area-bar'), op = bar && bar._sideOpts ? bar._sideOpts() : null;
          if (op && RPGACE.sideList) RPGACE.sideList.open(op);
        };
        inRow.insertBefore(c, document.getElementById('send-btn'));
      }
    },

    _relocate: function() {
      if (document.getElementById('agents-in-oracle')) return; // already moved
      var agentsPage = document.getElementById('page-agents');
      var oraclePage = document.getElementById('page-advisor');
      if (!agentsPage || !oraclePage) return;

      var wrapper = document.createElement('div');
      wrapper.id = 'agents-in-oracle';
      wrapper.style.cssText = 'margin-top:24px;padding-top:20px;border-top:1px solid var(--border)';

      // Oct 10 2026 (N2, Oracle slice): the moved Agents content (connected
      // apps, 8 one-click cards, activity log) was ~1,500px of page below
      // the chat. It now sits in one collapsed section, so the chat is the page.
      var det = document.createElement('details');
      det.id = 'agents-in-oracle-details';
      var heading = document.createElement('summary');
      heading.textContent = '⚡ Agent actions & connected apps';
      det.appendChild(heading);
      wrapper.appendChild(det);

      // Move everything except the old page's own top title - Oracle's page
      // already has its own, no need for a second one.
      Array.prototype.slice.call(agentsPage.children).forEach(function(k) {
        if (k.classList && k.classList.contains('section-title') && k.textContent.indexOf('Composio Agent Control Centre') !== -1) return;
        det.appendChild(k);
      });

      oraclePage.appendChild(wrapper);
    },
  },

  _relocate: function() { return this.ui._relocate(); },

});
/* ===END:agentsIntoOracle=== */
