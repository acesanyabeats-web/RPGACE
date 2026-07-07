/* ===MODULE:config=== */
RPGACE.register('config', {

  init: function() {
    /* CONFIG module — no DOM work, just sets globals */
    RPGACE.CONFIG = {
      supabase: {
        url: 'https://gripopghczmrbrhqtqbm.supabase.co',
        key: 'sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf',
      },
      pages: {
        dashboard:    'dashboard',
        agenda:       'quests',
        schedule:     'schedule',
        oracle:       'advisor',
        agents:       'agents',
        research:     'learning',
        encyclopedia: 'encyclopedia',
        journal:      'journal',
      },
      mainFns: {
        prodOracle:  'toggleProdOraclePanel',
        instaOracle: 'toggleInstaPanel',
        sync:        'syncAndPush',
        clearEnc:    'clearEncyclopedia',
        refreshEnc:  'refreshEncyclopediaDisplay',
      },
    };
    RPGACE.sb = {
      url: function(table) {
        return RPGACE.CONFIG.supabase.url + '/rest/v1/' + table;
      },
      headers: function() {
        var k = RPGACE.CONFIG.supabase.key;
        return {
          'Authorization': 'Bearer ' + k,
          'apikey': k,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        };
      },
      del: function(table, filter) {
        return fetch(RPGACE.sb.url(table) + '?' + filter, {
          method: 'DELETE', headers: RPGACE.sb.headers(),
        });
      },
      insert: function(table, row) {
        return fetch(RPGACE.sb.url(table), {
          method: 'POST', headers: RPGACE.sb.headers(),
          body: JSON.stringify(row),
        });
      },
      select: function(table, params) {
        return fetch(RPGACE.sb.url(table) + (params ? '?' + params : ''), {
          headers: RPGACE.sb.headers(),
        }).then(function(r) { return r.json(); });
      },
    };
    console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');
  },

});
/* ===END:config=== */
