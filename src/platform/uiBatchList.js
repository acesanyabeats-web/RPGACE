
/* ===MODULE:uiBatchList=== */
// Shared show-N-plus-"Show more" helper for long lists (July 19,
// Research redesign confirmed answer). Idempotent: safe to re-apply
// after any re-render; remembers how far the user expanded via a
// property on the container element itself, so a background re-render
// (e.g. Content Intelligence's 30s sync) doesn't collapse the list
// back down while they're reading it.
RPGACE.ui = RPGACE.ui || {};
RPGACE.ui.batchList = function(container, batchSize) {
  if (!container) return;
  var old = container.querySelector('.rpgace-show-more');
  if (old) old.remove();
  var kids = Array.prototype.slice.call(container.children);
  if (kids.length <= batchSize) {
    kids.forEach(function(k) { k.style.display = ''; });
    return;
  }
  var visible = container._rpgaceVisibleCount || batchSize;
  kids.forEach(function(k, i) { k.style.display = i < visible ? '' : 'none'; });
  if (visible < kids.length) {
    var btn = document.createElement('button');
    btn.className = 'rpgace-show-more';
    btn.textContent = '▼ Show more (' + (kids.length - visible) + ' hidden)';
    btn.style.cssText = 'display:block;width:100%;padding:9px;margin-top:4px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.15);border-radius:8px;color:rgba(226,226,236,0.5);font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    btn.onclick = function() {
      container._rpgaceVisibleCount = visible + batchSize;
      RPGACE.ui.batchList(container, batchSize);
    };
    container.appendChild(btn);
  }
};
/* ===END:uiBatchList=== */
