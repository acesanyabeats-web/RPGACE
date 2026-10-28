
/* ===MODULE:taxonomyReviewQueue=== */
// F6: batch review popup for taxonomy_proposals/taxonomy_links rows queued
// silently by F4 (ciAutoPropose) and F5 (encSync._autoPropose). Reuses
// taxonomyTree's existing _acceptLineage/_showProposalPopup instead of
// rebuilding the accept/edit UI — same popup the manual + Oracle-badge
// flows already use, just fed from a stored proposal instead of a fresh one.
//
// July 24 — the standalone dashboard badge this module used to inject
// itself is REMOVED, not re-patched. Real root cause of Alex's "still not
// there" report: _inject() called page.insertBefore(badge, dd-needs), but
// #dd-needs is a child of #dd-deck, not a direct child of #page-dashboard
// — insertBefore requires the reference node to be a child of the node
// it's called on, so this threw NotFoundError every single run, silently
// swallowed by the trailing .catch(). That's on top of dashDeck's own
// dd-needs-list already independently tracking (an incomplete version of)
// the same pending-review count — two hand-rolled copies of one feature,
// one broken, one incomplete (rule 8). Fixed by deleting this one entirely
// and folding a corrected, complete count (proposals + links) into
// dashDeck._refreshGlance()'s existing dd-needs-list, which already had
// live data, a working click-through to _openQueue() below, and a real
// home labeled "Needs you now" — no second injection path to break again.
RPGACE.register('taxonomyReviewQueue', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the ELEVENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete and feynman): this module is split into two
  // internal namespaces, `ui` (rendering/DOM) and `logic` (business
  // logic/data), following the exact shape those ten already shipped and
  // verified. Pure internal-structure refactor — zero functional,
  // behavioural, UX, data or schema change. In particular the human-confirm
  // gating this module IS (every Accept/Reject button, and the deeper
  // phylumPath._showPlacementConfirm editor behind ✎ Edit) is byte-identical;
  // only the code's location inside the object literal moved. Every function
  // below was MOVED wholesale by a deterministic line-range extract plus an
  // explicit, asserted list of five `this`/`self` requalifications — never
  // retyped, never split down the middle — so no character of any body could
  // drift silently.
  //
  // 10 real members, ALL of them functions and ZERO plain data fields
  // (checked by direct read of every top-level key, not assumed — unlike
  // feynman/questEngine, there is no module-scope state bag here to worry
  // about leaving behind). `init` stays a literal top-level function
  // (RPGACE.register() calls `module.init()` directly and cannot see into a
  // sub-object); it is an empty body here and is byte-identical. Of the
  // other 9: 4 moved into `ui`, 5 into `logic`.
  //
  // That 4/5 split reflects what this module actually is: a REVIEW SURFACE
  // (two popup shells — the full queue and the compact top-5 dashboard card —
  // plus two row-renderers that build every proposal/fusion-link card) sitting
  // on top of a small set of ACCEPT HANDLERS (reconstruct the attach node,
  // insert via phylumPath, write the accepted/rejected status back, reshape a
  // stored row into the legacy proposal object taxonomyTree expects).
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Exact accounting for all 9 moved functions,
  // so a later reader can check this by grep rather than take it on trust:
  //   • 3 already had a `var self = this;` as their first statement and simply
  //     have that one line swapped for `var self = RPGACE.modules.
  //     taxonomyReviewQueue;` IN PLACE, so the handle lands in exactly the
  //     same position and statement order is literally unchanged:
  //     ui._openQueue, ui._renderProposalRow, ui._openCard. Every `self.X`
  //     inside them therefore keeps resolving to the module — i.e. to the
  //     top-level pass-throughs at the bottom of this file — exactly as before,
  //     which is why no call site inside the module had to change.
  //   • 2 had NO `var self` at all and used a bare `this.X` call:
  //     logic._acceptPhylumPathProposal and logic._editPhylumPathProposal each
  //     call `this._sourceMetaForProposal(p)` exactly once. Each is qualified
  //     directly to `RPGACE.modules.taxonomyReviewQueue._sourceMetaForProposal
  //     (p)` rather than gaining a one-use handle, matching feynman's
  //     ui.closePanel precedent for a single `this` touch.
  //     HONEST NOTE, because overstating this would be the easy thing to do:
  //     unlike feynman's logic.start/ui.submit — where a bare `this.` would
  //     genuinely have broken the module — these two would COINCIDENTALLY have
  //     kept working if left alone, because their callee
  //     (_sourceMetaForProposal) lands in the SAME `logic` namespace they do,
  //     so `this._sourceMetaForProposal` would still have resolved. They are
  //     qualified anyway for two real reasons: the standing G53 rule is zero
  //     unqualified `this.` inside a namespace body, and the accidental
  //     resolution is genuinely fragile — the day anyone reclassifies
  //     _sourceMetaForProposal into `ui`, a bare `this.` becomes a silent
  //     TypeError inside a taxonomy-write path with no backup to recover from.
  //   • 4 reference neither `this` nor `self` anywhere in their bodies and
  //     moved completely untouched apart from indentation: ui._renderLinkRow,
  //     logic._sourceMetaForProposal, logic._acceptConceptFusion,
  //     logic._toProposal. (The `this` substrings a naive grep finds inside
  //     _renderLinkRow and _openCard are English prose in comments — "as of
  //     this session", "this batch" — not code.)
  //
  // Classification rule used (identical to the rule every prior G53 module
  // recorded): a function lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM
  // (document.*, createElement, getElementById, querySelector, innerHTML);
  // otherwise in `logic`. Deliberately NOT counted as a ui signal, matching
  // the phylumPath pilot's own precedent: a bare window `confirm()`/`prompt()`
  // dialog, a `showPage()` page-nav call, or opening ANOTHER module's
  // picker/popup. videoSummary's markup-string RULE EXTENSION (a function
  // assigning built markup to `.innerHTML` counts as constructing DOM) was
  // checked and IS real here — ui._openQueue and ui._openCard both assign
  // markup strings to `.innerHTML` — but it changes NO classification,
  // because both already qualify on the primary rule via createElement/
  // querySelector. Recorded so a future reader knows the extension was applied
  // and found redundant here, not forgotten. This module renders via
  // createElement + .style.cssText almost throughout: a direct count finds
  // five `.innerHTML` sites, and only TWO of those assign built markup
  // (ui._openQueue's "Loading proposals…" placeholder and ui._openCard's popup
  // shell) — the other three are `= ''` container clears, which construct
  // nothing. So the extension has very little to bite on here.
  //
  // The genuinely mixed / judgment-call functions — FOUR of them, each named
  // here with the real evidence rather than silently classified. In all four
  // the tiebreak is DOMINANT RESPONSIBILITY, the same tiebreak videoSummary/
  // questEngine/intelDelete/feynman already used:
  //   • logic._editPhylumPathProposal is the one function classified where the
  //     primary rule is silent, and the most interesting call in the module.
  //     It touches ZERO DOM of its own — no document.* anywhere — but it does
  //     open a real editor popup, `phylumPath._showPlacementConfirm(...)`, and
  //     supplies the callback that performs the actual taxonomy insert on
  //     confirm. That is exactly the "opening ANOTHER module's picker/popup is
  //     not a ui signal / a function that merely TRIGGERS a UI action without
  //     constructing any DOM of its own is logic" clause, and the dominant-
  //     responsibility check agrees: its real body is a Supabase select to
  //     reconstruct the attach node, then the insert-and-mark-accepted
  //     sequence. All the DOM lives in phylumPath, a different module entirely.
  //   • ui._renderProposalRow and ui._renderLinkRow both sit on a real
  //     ui/logic seam that is deliberately NOT extracted, because this pass
  //     moves functions and does not rewrite them. Each is ~60–80 lines of
  //     createElement/.style.cssText/appendChild — unambiguously `ui` on
  //     dominant responsibility — but each also carries a genuine DATA WRITE
  //     inline inside a button's onclick closure: _renderProposalRow's Reject
  //     button, and BOTH of _renderLinkRow's buttons, call
  //     `RPGACE.sb.secureWrite('taxonomy_proposals'|'taxonomy_links',
  //     'update', {status:…})` directly. Hoisting those three one-line writes
  //     into `logic` would be a behaviour-neutral improvement and is a
  //     reasonable future item, but it is a REWRITE, not a move, so it is
  //     named here and left alone. (Their Accept buttons are already clean:
  //     they delegate to logic._acceptConceptFusion/_acceptPhylumPathProposal
  //     or to taxonomyTree._acceptLineage.)
  //   • ui._openCard is `ui` on both the primary rule and dominant
  //     responsibility (it builds the entire popup: innerHTML shell,
  //     querySelector on three sub-elements, then delegates every row to the
  //     two row-renderers) — but it is named here because it also holds real
  //     non-DOM logic: the four-way Promise.all, and the merge/sort/slice that
  //     produces a true combined top-5 across two tables. That is data
  //     preparation in service of one specific popup's rendering, not a
  //     reusable data operation, and it is ~10 lines against ~80 — so it stays
  //     with the popup it exists for, the same call videoSummary made.
  //   • logic -> ui cross-namespace calls do NOT occur in this module (the
  //     accept handlers are terminal — they write and stop, they never render).
  //     ui -> logic calls are normal and frequent (_openQueue/_openCard ->
  //     _renderProposalRow/_renderLinkRow; _renderProposalRow ->
  //     _acceptConceptFusion/_acceptPhylumPathProposal/_editPhylumPathProposal/
  //     _toProposal). Every one of those goes through the top-level
  //     pass-throughs via `self.X`, never `this.logic.X` directly.
  //
  // THREE pre-existing oddities were found while reading every function for
  // this split. The first two (below) were FIXED separately, same session,
  // after the split — real toasts added on 7 real write-failure sites plus
  // the malformed-fusion-proposal guard, per rule 7 (fail loud). Neither
  // fix changed any successful-path behaviour; only the failure path now
  // surfaces. The third (init) is correct as-is, not a bug:
  //   • Silent-swallow writes — SEVEN sites, counted by direct grep of the
  //     module's own line range, not estimated. Every `secureWrite` that marks
  //     a row accepted/rejected/confirmed used to end in `.catch(function() {})`:
  //     six status writes (logic._acceptPhylumPathProposal, logic._acceptConcept-
  //     Fusion, logic._editPhylumPathProposal, ui._renderProposalRow's Reject
  //     button, and BOTH of ui._renderLinkRow's buttons), plus one more on the
  //     two-row `taxonomy_links` insert inside logic._acceptConceptFusion. A
  //     failed write left the row visually gone but still `pending` in
  //     Supabase, with no toast and no console line. FIXED: every one of the
  //     7 sites now shows a real RPGACE.utils.toast on failure, naming what
  //     happened and what state the row is really in.
  //   • logic._acceptConceptFusion used to return early and silently when a
  //     stored proposal was missing attachToId/otherNodeId/newName, while its
  //     caller (ui._renderProposalRow's Accept button) had already faded and
  //     removed the row unconditionally — so a malformed fusion proposal
  //     vanished from view without being accepted OR rejected, with zero
  //     feedback. FIXED: the guard now shows a real toast before returning.
  //     Nothing was ever lost either way (the row stays `pending` and
  //     reappears on the next open) — this was a no-feedback dead click, not
  //     data loss, but rule 7 still applies to a dead click.
  //   • `init` is an empty function body (`init: function() {},`). That is
  //     correct and deliberate — the standalone dashboard badge this module
  //     used to inject was removed in July 2026 (see the module comment above)
  //     and both real entry points are now external calls to _openCard — but
  //     it is worth knowing it is intentionally empty, not an unfinished stub.
  // ══════════════════════════════════════════════════════════════════

  // FLAGGED, NOT FIXED (G53 split, Sep 2026) — INTENTIONALLY EMPTY, not a
  // stub. This module used to inject its own dashboard badge from here; that
  // was deleted in July 2026 (full root cause in the module comment above),
  // and both real entry points are now EXTERNAL calls to _openCard() from
  // dashDeck and morningBrief. Nothing needs wiring at init time. Left exactly
  // as-is: it stays a literal top-level function because RPGACE.register()
  // calls module.init() directly and cannot see into a sub-object.
  init: function() {},

  // ============================================================
  // logic — business logic/data. See the classification rule and the
  // named judgment calls in the header block above.
  // ============================================================
  logic: {
    // ── Phylum Path-engine rows: reconstruct the real attach node (if any)  ──
    // ── by id, then insert directly via phylumPath._insertNewSteps - the    ──
    // ── queued row itself already IS the confirmed decision (this batch     ──
    // ── review is the deferred confirm/deny/modify step for silent          ──
    // ── triggers), so there's no second popup on plain Accept.              ──
    // Aug 22 2026 — W5: map a queued proposal's own real source_type onto
    // the worm identity the new Encyclopedia companion entry is labelled
    // with. Confirmed live values: 'content_intelligence' (the real
    // Videoworm path) and 'encyclopedia'. An 'encyclopedia'-sourced
    // proposal deliberately gets NO companion entry — it originated FROM
    // an existing Encyclopedia row, and F7 already writes that row's own
    // taxonomy_node_id back-reference on accept, so minting a second entry
    // here would be a real duplicate (rule 8). Anything unrecognized also
    // returns null: fail safe, never guess a label onto a real row.
    _sourceMetaForProposal: function(p) {
      if (!p || p.source_type !== 'content_intelligence') return null;
      return { source: 'videoworm', title: p.source_id || 'Content Intelligence insight' };
    },

    _acceptPhylumPathProposal: function(p) {
      var ps = p.proposed_steps || {};
      var pp = RPGACE.modules.phylumPath;
      var meta = RPGACE.modules.taxonomyReviewQueue._sourceMetaForProposal(p);
      var finish = function(attachNode) {
        pp._insertNewSteps(p.phylum_number, attachNode, ps.newSteps || [], ps.explainers || [], ps.insightText || '', meta)
          .then(function() {
            // Fail-loud fix (rule 7): the leaf is already in taxonomy_tree at
            // this point via _insertNewSteps — if THIS status write fails, the
            // proposal stays 'pending' and a second Accept would insert the
            // same leaf twice, with no Supabase backup to recover from. A
            // failure must be visible, not silently swallowed.
            RPGACE.sb.secureWrite('taxonomy_proposals', 'update', { status: 'accepted', reviewed_at: new Date().toISOString() }, 'id=eq.' + p.id)
              .catch(function() {
                RPGACE.utils.toast('⚠ Leaf created, but marking the proposal accepted failed — it may reappear in the queue. Reject it manually if so, to avoid a duplicate insert.', '#CC4A4A', 6000);
              });
          });
      };
      if (ps.attachToId) {
        RPGACE.sb.select('taxonomy_tree', 'id=eq.' + ps.attachToId + '&limit=1')
          .then(function(rows) { finish(rows && rows[0] ? rows[0] : null); })
          .catch(function() { finish(null); });
      } else {
        finish(null);
      }
    },

    // ── Concept Fusion proposals: create the new merged node under         ──
    // ── whichever branch the ground worker picked as attach point, then    ──
    // ── write 2 confirmed taxonomy_links rows connecting it back to BOTH   ──
    // ── source branches - the merged node is discoverable from either      ──
    // ── side, not owned by just one. Same chained-insert convention as     ──
    // ── phylumPath._insertNewSteps (Prefer:return=representation, since    ──
    // ── RPGACE.sb.insert() defaults to return=minimal).                    ──
    _acceptConceptFusion: function(p) {
      var ps = p.proposed_steps || {};
      // Fail-loud fix (rule 7): the caller (ui._renderProposalRow's Accept
      // button) has already faded the row and removes it unconditionally right
      // after calling this — without a toast here, a malformed stored
      // concept-fusion proposal would vanish from view with zero feedback.
      // Nothing is lost (the row stays 'pending' and reappears on the next
      // open), but the dead click needs to be visible, not silent.
      if (!ps.attachToId || !ps.otherNodeId || !ps.newName) {
        RPGACE.utils.toast('⚠ This fusion proposal is missing required data and can\'t be accepted — it will reappear in the queue.', '#CC4A4A', 6000);
        return;
      }

      RPGACE.sb.select('taxonomy_tree', 'id=eq.' + ps.attachToId + '&limit=1')
        .then(function(rows) {
          var attachNode = rows && rows[0];
          if (!attachNode) return;

          return RPGACE.sb.secureWrite('taxonomy_tree', 'insert', {
              parent_id: attachNode.id,
              depth: attachNode.depth + 1,
              name: ps.newName,
              phylum_number: attachNode.phylum_number,
              path: attachNode.path + '/' + ps.newName,
              node_type: 'leaf',
              explainer: ps.synthesis || '',
              sources: [{ type: 'concept_fusion', id: null }]
            }).then(function(result) {
            var newNode = Array.isArray(result) ? result[0] : result;
            if (!newNode || !newNode.id) return;
            return RPGACE.sb.secureWrite('taxonomy_links', 'insert', [
              { node_a_id: newNode.id, node_b_id: attachNode.id, link_insight: ps.synthesis || '', status: 'confirmed' },
              { node_a_id: newNode.id, node_b_id: ps.otherNodeId, link_insight: ps.synthesis || '', status: 'confirmed' }
            ]).catch(function() {
              RPGACE.utils.toast('⚠ Merged leaf created, but linking it back to its two source branches failed — the fusion links are missing.', '#CC4A4A', 6000);
            });
          });
        })
        .then(function() {
          RPGACE.sb.secureWrite('taxonomy_proposals', 'update', { status: 'accepted', reviewed_at: new Date().toISOString() }, 'id=eq.' + p.id).catch(function() {
            RPGACE.utils.toast('⚠ Merged leaf created, but marking the proposal accepted failed — it may reappear in the queue.', '#CC4A4A', 6000);
          });
        })
        .catch(function(e) {
          console.warn('[taxonomyReviewQueue] concept-fusion accept failed:', e.message);
          RPGACE.utils.toast('⚠ Creating the merged leaf failed: ' + (e && e.message || 'unknown error'), '#CC4A4A', 6000);
        });
    },

    // ── Edit before accepting: reuses phylumPath's own confirm/edit popup ──
    // ── rather than the old full-path editor, since a Phylum Path proposal ──
    // ── is always "attach here, add these steps," never a whole fresh path. ──
    _editPhylumPathProposal: function(p) {
      var ps = p.proposed_steps || {};
      var pp = RPGACE.modules.phylumPath;
      // W5: same source_type -> worm-identity mapping as the plain Accept
      // path above (shared helper, not a second copy — rule 8).
      var meta = RPGACE.modules.taxonomyReviewQueue._sourceMetaForProposal(p);
      var openEditor = function(attachNode) {
        pp._showPlacementConfirm(p.phylum_number, attachNode, (ps.newSteps || []).slice(), (ps.explainers || []).slice(), ps.insightText || '',
          function(finalSteps, finalExplainers) {
            pp._insertNewSteps(p.phylum_number, attachNode, finalSteps, finalExplainers, ps.insightText || '', meta).then(function() {
              RPGACE.sb.secureWrite('taxonomy_proposals', 'update', { status: 'accepted', reviewed_at: new Date().toISOString() }, 'id=eq.' + p.id).catch(function() {
                RPGACE.utils.toast('⚠ Leaf created, but marking the proposal accepted failed — it may reappear in the queue.', '#CC4A4A', 6000);
              });
            });
          }
        );
      };
      if (ps.attachToId) {
        RPGACE.sb.select('taxonomy_tree', 'id=eq.' + ps.attachToId + '&limit=1')
          .then(function(rows) { openEditor(rows && rows[0] ? rows[0] : null); })
          .catch(function() { openEditor(null); });
      } else {
        openEditor(null);
      }
    },

    _toProposal: function(p) {
      var tt = RPGACE.modules.taxonomyTree;
      return {
        phylumNumber: p.phylum_number,
        phylumName: (tt && tt.PHYLUM_NAMES[p.phylum_number]) || 'Unknown',
        path: ((p.proposed_steps && p.proposed_steps.path) || []).slice(),
        explainers: ((p.proposed_steps && p.proposed_steps.explainers) || []).slice(),
        sourceType: p.source_type,
        sourceId: p.source_id,
        queuedProposalId: p.id,
      };
    },
  },

  // ============================================================
  // ui — rendering/DOM. See the classification rule and the named
  // judgment calls in the header block above.
  // ============================================================
  ui: {
    _openQueue: function() {
      var self = RPGACE.modules.taxonomyReviewQueue;
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', scroll: true, width: '640px', borderColor: 'rgba(155,89,182,0.3)', noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;
      box.innerHTML = '<div style="font-size:15px;font-weight:700;color:#D4DAF5;">Loading proposals...</div>';

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'position:sticky;float:right;top:0;background:none;border:none;color:rgba(226,226,236,0.4);font-size:16px;cursor:pointer;';
      // July 24 - self._inject() was a dead reference: this module's _inject
      // was deleted in 14c7ebe when the broken floating badge was removed, so
      // every popup close threw TypeError, invisibly (overlay.remove() had
      // already run first, so nothing looked wrong on screen). Refresh
      // dashDeck's glance instead, which is what the old _inject call was
      // actually trying to do. Clear cache first - secureWrite goes through
      // /api/data-write and never touches RPGACE.cache's busting wrappers, so
      // these two tables can otherwise serve a 60s-stale count right after a
      // review session (standing landmine).
      closeBtn.onclick = function() {
        overlay.remove();
        if (RPGACE.cache && RPGACE.cache.clear) {
          RPGACE.cache.clear('taxonomy_proposals');
          RPGACE.cache.clear('taxonomy_links');
        }
        var d = RPGACE.modules.dashDeck;
        if (d && d._refreshGlance) d._refreshGlance();
      };

      Promise.all([
        RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&order=created_at.asc&limit=200'),
        RPGACE.sb.select('taxonomy_links', 'status=eq.pending&order=created_at.asc&limit=200')
      ]).then(function(results) {
          var rows = results[0] || [];
          var linkRows = results[1] || [];
          box.innerHTML = '';
          box.appendChild(closeBtn);

          var title = document.createElement('div');
          title.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:6px;';
          title.textContent = 'Taxonomy Review Queue';
          var sub = document.createElement('div');
          sub.style.cssText = 'font-size:15px;font-weight:700;color:#D4DAF5;margin-bottom:16px;';
          var totalCount = rows.length + linkRows.length;
          sub.textContent = totalCount + ' item' + (totalCount !== 1 ? 's' : '') + ' waiting for review';
          box.appendChild(title); box.appendChild(sub);

          if (totalCount === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'color:rgba(226,226,236,0.35);font-size:12px;padding:20px 0;text-align:center;';
            empty.textContent = 'Nothing waiting — all caught up.';
            box.appendChild(empty);
            return;
          }

          rows.forEach(function(p) { self._renderProposalRow(p, box, overlay); });

          // ── Fusion-link candidates (taxonomy_links, status=pending) - a  ──
          // ── separate card type in the same queue. Accept/Reject only, no ──
          // ── Edit: a link is just two node ids + one insight sentence,    ──
          // ── nothing to restructure like a lineage proposal's step list.  ──
          if (!linkRows.length) return;

          var nodeIds = [];
          linkRows.forEach(function(l) { nodeIds.push(l.node_a_id, l.node_b_id); });
          var uniqueIds = nodeIds.filter(function(id, i) { return nodeIds.indexOf(id) === i; });

          return RPGACE.sb.select('taxonomy_tree', 'id=in.(' + uniqueIds.join(',') + ')&select=id,name,path,phylum_number').then(function(nodeRows) {
            var byId = {};
            (nodeRows || []).forEach(function(n) { byId[n.id] = n; });
            linkRows.forEach(function(l) { self._renderLinkRow(l, box, byId); });
          });
        }).catch(function() {
          box.innerHTML = '';
          box.appendChild(closeBtn);
          var err = document.createElement('div');
          err.style.cssText = 'color:#CC4A4A;font-size:12px;';
          err.textContent = 'Could not load proposals.';
          box.appendChild(err);
        });
    },

    // ── Shared row-renderers (Aug 11 2026, extracted from _openQueue's own  ──
    // ── inline forEach bodies, zero behaviour change) — so the new top-5    ──
    // ── _openCard() below reuses the exact same real accept/reject/edit     ──
    // ── logic instead of a second hand-rolled copy (rule 8). `overlay` is   ──
    // ── only used by the Edit button (closes the popup before opening a     ──
    // ── deeper editor) — _openCard doesn't pass one, so Edit isn't offered   ──
    // ── on the compact view (Accept/Reject only, matching how tight the      ──
    // ── card is) but the SAME rows are fully editable once you land on the   ──
    // ── full queue via _openQueue.                                          ──
    _renderProposalRow: function(p, box, overlay) {
      var self = RPGACE.modules.taxonomyReviewQueue;
      var sourceLabels = { content_intelligence: '📁 File Analyzer', encyclopedia: '📖 Encyclopedia', oracle: '💬 Oracle', manual: '✎ Manual' };
      var row = document.createElement('div');
      row.style.cssText = 'padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;';

      var head = document.createElement('div');
      head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;';
      var pathEl = document.createElement('div');
      pathEl.style.cssText = 'font-size:12px;color:#D4DAF5;font-weight:600;line-height:1.5;';
      pathEl.textContent = p.proposed_path;
      var isPhylumPath = !!(p.proposed_steps && p.proposed_steps.engine === 'phylum_path');
      var isConceptFusion = !!(p.proposed_steps && p.proposed_steps.engine === 'concept_fusion');
      var srcEl = document.createElement('div');
      srcEl.style.cssText = 'font-size:11px;color:' + (isConceptFusion ? 'rgba(52,152,219,0.7)' : isPhylumPath ? 'rgba(61,170,110,0.7)' : 'rgba(155,89,182,0.6)') + ';white-space:nowrap;flex-shrink:0;';
      srcEl.textContent = isConceptFusion ? '🌌 Concept Fusion' : (isPhylumPath ? '🧬 Phylum Path · ' : '') + (sourceLabels[p.source_type] || p.source_type);
      head.appendChild(pathEl); head.appendChild(srcEl);
      row.appendChild(head);

      if (p.matched_existing_node_id && !isPhylumPath && !isConceptFusion) {
        var warn = document.createElement('div');
        warn.style.cssText = 'font-size:11px;color:#CC4A4A;margin-bottom:8px;';
        warn.textContent = '⚠️ Possible overlap with an existing node — review before accepting.';
        row.appendChild(warn);
      }

      if (isConceptFusion && p.proposed_steps && p.proposed_steps.synthesis) {
        var synthEl = document.createElement('div');
        synthEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.6);margin-bottom:8px;font-style:italic;';
        synthEl.textContent = p.proposed_steps.synthesis;
        row.appendChild(synthEl);
      }

      if (isPhylumPath && p.proposed_steps && (p.proposed_steps.justification || p.proposed_steps.confidenceScore)) {
        var justEl = document.createElement('div');
        justEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.55);margin-bottom:8px;font-style:italic;';
        var score = p.proposed_steps.confidenceScore;
        justEl.textContent = (p.proposed_steps.justification || '') + (score ? ' (confidence ' + score + '/10)' : '');
        row.appendChild(justEl);
      }

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;';

      var acceptBtn = document.createElement('button');
      acceptBtn.textContent = isConceptFusion ? '✓ Create Merged Leaf' : '✓ Accept';
      acceptBtn.style.cssText = 'padding:6px 12px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      acceptBtn.onclick = function() {
        row.style.opacity = '0.4'; row.style.pointerEvents = 'none';
        if (isConceptFusion) { self._acceptConceptFusion(p); }
        else if (isPhylumPath) { self._acceptPhylumPathProposal(p); }
        else { RPGACE.modules.taxonomyTree._acceptLineage(self._toProposal(p)); }
        row.remove();
      };

      var rejectBtn = document.createElement('button');
      rejectBtn.textContent = '✗ Reject';
      rejectBtn.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:6px;color:#CC4A4A;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      rejectBtn.onclick = function() {
        RPGACE.sb.secureWrite('taxonomy_proposals', 'update', { status: 'rejected', reviewed_at: new Date().toISOString() }, 'id=eq.' + p.id).catch(function() {
          RPGACE.utils.toast('⚠ Rejecting this proposal failed — it may still show as pending. Try again.', '#CC4A4A', 6000);
        });
        row.remove();
      };

      btnRow.appendChild(acceptBtn);
      if (!isConceptFusion && overlay) {
        var editBtn = document.createElement('button');
        editBtn.textContent = '✎ Edit';
        editBtn.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        editBtn.onclick = function() {
          overlay.remove();
          if (isPhylumPath) { self._editPhylumPathProposal(p); }
          else { RPGACE.modules.taxonomyTree._showProposalPopup(self._toProposal(p)); }
        };
        btnRow.appendChild(editBtn);
      }
      btnRow.appendChild(rejectBtn);
      row.appendChild(btnRow);
      box.appendChild(row);
    },

    _renderLinkRow: function(l, box, byId) {
      var a = byId[l.node_a_id], b = byId[l.node_b_id];
      if (!a || !b) return;
      var tt = RPGACE.modules.taxonomyTree;
      var row = document.createElement('div');
      row.style.cssText = 'padding:12px 14px;margin-bottom:10px;background:rgba(52,152,219,0.04);border:1px solid rgba(52,152,219,0.2);border-radius:8px;';

      var head = document.createElement('div');
      head.style.cssText = 'font-size:11px;font-weight:700;color:rgba(52,152,219,0.7);margin-bottom:6px;';
      head.textContent = '🔗 Fusion Link';
      row.appendChild(head);

      var phA = tt ? (tt.PHYLUM_NAMES[a.phylum_number] || '') : '';
      var phB = tt ? (tt.PHYLUM_NAMES[b.phylum_number] || '') : '';
      var linkText = document.createElement('div');
      linkText.style.cssText = 'font-size:12px;color:#D4DAF5;font-weight:600;line-height:1.5;margin-bottom:4px;';
      linkText.textContent = '[' + phA + '] ' + a.path + '  ⇄  [' + phB + '] ' + b.path;
      row.appendChild(linkText);

      var insightEl = document.createElement('div');
      insightEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.6);margin-bottom:8px;font-style:italic;';
      insightEl.textContent = l.link_insight || '';
      row.appendChild(insightEl);

      var btnRow2 = document.createElement('div');
      btnRow2.style.cssText = 'display:flex;gap:6px;';

      var acceptBtn2 = document.createElement('button');
      acceptBtn2.textContent = '✓ Confirm Link';
      acceptBtn2.style.cssText = 'padding:6px 12px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      acceptBtn2.onclick = function() {
        row.style.opacity = '0.4'; row.style.pointerEvents = 'none';
        RPGACE.sb.secureWrite('taxonomy_links', 'update', { status: 'confirmed', reviewed_at: new Date().toISOString() }, 'id=eq.' + l.id).catch(function() {
          RPGACE.utils.toast('⚠ Confirming this fusion link failed — it may still show as pending. Try again.', '#CC4A4A', 6000);
        });
        row.remove();
      };

      var rejectBtn2 = document.createElement('button');
      rejectBtn2.textContent = '✗ Reject';
      rejectBtn2.style.cssText = 'padding:6px 12px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:6px;color:#CC4A4A;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      rejectBtn2.onclick = function() {
        RPGACE.sb.secureWrite('taxonomy_links', 'update', { status: 'rejected', reviewed_at: new Date().toISOString() }, 'id=eq.' + l.id).catch(function() {
          RPGACE.utils.toast('⚠ Rejecting this fusion link failed — it may still show as pending. Try again.', '#CC4A4A', 6000);
        });
        row.remove();
      };

      btnRow2.appendChild(acceptBtn2); btnRow2.appendChild(rejectBtn2);
      row.appendChild(btnRow2);
      box.appendChild(row);
    },

    // ── Real /paranoia+/Engineer build, Aug 11 2026 (Alex's own ask: "make  ──
    // ── a similar thing to chronicles when pressed through dashboard...     ──
    // ── top 5 show most recent ones, but will also have a skip button to    ──
    // ── just access the actual taxonomy"). Real evidence first: _openQueue  ──
    // ── above renders EVERY pending row (51 real ones as of this session) —
    // ── genuinely long, exactly the problem being named. Mirrors            ──
    // ── chroniclesLog._openCard() exactly (same popup shape, same "top 5 +  ──
    // ── one button to the full page" pattern) rather than inventing a new   ──
    // ── one. Real, honest tradeoff kept in a comment, not hidden: ordering  ──
    // ── by most-recent-first (Alex's own explicit ask) means an old pending ──
    // ── item can in principle sit unseen here indefinitely if newer ones    ──
    // ── keep queueing on top of it — "Review all N pending →" stays one     ──
    // ── click away specifically so that never becomes a real dead end.      ──
    _openCard: function() {
      var self = RPGACE.modules.taxonomyReviewQueue;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return;
      var pop = dd._popup({ eyebrow: '🌳 Taxonomy & Review', title: 'Recent proposals', accent: 'var(--green)', width: '520px' });
      pop.box.innerHTML = '<div id="tx-card-paused" style="display:none;margin-bottom:12px;padding:10px 12px;border:1px solid rgba(155,89,182,0.35);border-radius:8px;background:rgba(155,89,182,0.08);font-size:12px;line-height:1.5;color:var(--text,#D4DAF5)"></div>' +
        '<div id="tx-card-list" style="font-size:12px;color:var(--muted)">Loading…</div>' +
        '<div id="tx-card-more" style="display:none;margin-top:6px;font-size:11px;color:var(--muted);text-align:center;cursor:pointer;text-decoration:underline;"></div>' +
        '<button id="tx-card-skip" style="margin-top:14px;width:100%;padding:10px;background:var(--green);border:none;border-radius:8px;color:#000;font-weight:700;font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;">🌳 Skip to Taxonomy Tree →</button>';
      pop.box.querySelector('#tx-card-skip').onclick = function() {
        pop.close();
        if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.phylumPath);
      };
      // LL-3: say plainly when automatic tree growth is paused.
      var tt = RPGACE.modules.taxonomyTree;
      if (tt && tt.logic.checkPaused) tt.logic.checkPaused(true).then(function(paused) {
        var n = pop.box.querySelector('#tx-card-paused');
        if (!n) return;
        n.style.display = paused ? 'block' : 'none';
        n.textContent = '⏸ ' + tt.logic.PAUSE_NOTE;
      });

      // Real top-5-overall-most-recent, not top-5-per-table: fetching the
      // top 5 from EACH table first, then merging + sorting + slicing to 5,
      // is mathematically guaranteed to contain the true combined top 5
      // (any item outside a table's own top 5 can't be in the overall top 5
      // either) — cheap and correct, no need for a real cross-table SQL sort.
      Promise.all([
        RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&order=created_at.desc&limit=5'),
        RPGACE.sb.select('taxonomy_links', 'status=eq.pending&order=created_at.desc&limit=5'),
        RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&select=id'),
        RPGACE.sb.select('taxonomy_links', 'status=eq.pending&select=id')
      ]).then(function(results) {
        var props = results[0] || [], links = results[1] || [];
        var totalPending = (results[2] || []).length + (results[3] || []).length;
        var merged = props.map(function(p) { return { kind: 'proposal', row: p, t: p.created_at }; })
          .concat(links.map(function(l) { return { kind: 'link', row: l, t: l.created_at }; }))
          .sort(function(a, b) { return new Date(b.t) - new Date(a.t); })
          .slice(0, 5);

        var listEl = pop.box.querySelector('#tx-card-list');
        var moreEl = pop.box.querySelector('#tx-card-more');
        if (!listEl) return;

        if (moreEl) {
          if (totalPending > merged.length) {
            moreEl.style.display = 'block';
            moreEl.textContent = 'Review all ' + totalPending + ' pending →';
            moreEl.onclick = function() { pop.close(); self._openQueue(); };
          } else {
            moreEl.style.display = 'none';
          }
        }

        if (!merged.length) { listEl.textContent = 'Nothing waiting — all caught up.'; return; }
        listEl.innerHTML = '';

        var linkNodeIds = [];
        merged.forEach(function(m) { if (m.kind === 'link') linkNodeIds.push(m.row.node_a_id, m.row.node_b_id); });
        var uniqueLinkIds = linkNodeIds.filter(function(id, i) { return linkNodeIds.indexOf(id) === i; });

        var render = function(byId) {
          merged.forEach(function(m) {
            if (m.kind === 'proposal') self._renderProposalRow(m.row, listEl, null);
            else self._renderLinkRow(m.row, listEl, byId || {});
          });
        };

        if (uniqueLinkIds.length) {
          RPGACE.sb.select('taxonomy_tree', 'id=in.(' + uniqueLinkIds.join(',') + ')&select=id,name,path,phylum_number')
            .then(function(nodeRows) {
              var byId = {};
              (nodeRows || []).forEach(function(n) { byId[n.id] = n; });
              render(byId);
            }).catch(function() { render({}); });
        } else {
          render({});
        }
      }).catch(function(e) {
        var listEl = pop.box.querySelector('#tx-card-list');
        if (listEl) listEl.textContent = 'Load failed: ' + e.message;
      });
    },
  },

  // ── Top-level pass-throughs ───────────────────────────────────────
  // The module's public API, byte-identical to before this split: the same
  // 9 method names, the same parameter lists, the same call semantics.
  //
  // Real external surface, from an independent whole-repo grep run for this
  // pass (rpgace_core.js + index.html, direct form, local-alias form and
  // bracket form, INCLUDING the LEGACY:mainjs section — the former main.js,
  // where a prior G53 module's briefed "zero external callers" claim turned
  // out to be wrong): exactly TWO external call sites exist, and BOTH reach
  // the same single method, `_openCard` —
  //   • dashDeck.MODULES' 'taxonomy' card `go:` handler
  //     (`var rq = RPGACE.modules.taxonomyReviewQueue; … rq._openCard();`)
  //   • morningBrief's dashboard-bulletin "Review N pending taxonomy item(s)"
  //     list item (same local-alias shape)
  // Both guard with `rq && rq._openCard` before calling, so both keep working
  // unchanged through the pass-through below. There are no other callers, no
  // inline onclick="" handlers naming this module in index.html, and no
  // module-scope data fields for anything to read.
  //
  // All 9 moved functions keep a pass-through regardless of whether an
  // external caller exists today, for two real reasons: the module's own
  // internal `self.X` calls all route through them (so an inconsistent set
  // would be a live bug, not a tidiness question), and a future caller
  // reaching a method that quietly lost its top-level entry would fail with
  // "is not a function" rather than anything diagnosable.
  _openQueue: function() { return this.ui._openQueue(); },
  _renderProposalRow: function(p, box, overlay) { return this.ui._renderProposalRow(p, box, overlay); },
  _renderLinkRow: function(l, box, byId) { return this.ui._renderLinkRow(l, box, byId); },
  _openCard: function() { return this.ui._openCard(); },
  _sourceMetaForProposal: function(p) { return this.logic._sourceMetaForProposal(p); },
  _acceptPhylumPathProposal: function(p) { return this.logic._acceptPhylumPathProposal(p); },
  _acceptConceptFusion: function(p) { return this.logic._acceptConceptFusion(p); },
  _editPhylumPathProposal: function(p) { return this.logic._editPhylumPathProposal(p); },
  _toProposal: function(p) { return this.logic._toProposal(p); },

});
/* ===END:taxonomyReviewQueue=== */
